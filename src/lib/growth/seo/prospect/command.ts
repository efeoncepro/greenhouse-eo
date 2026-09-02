import 'server-only'

/**
 * TASK-1709 Slice 4 — `runProspectDiagnostic`: el PRIMITIVE único del carril.
 *
 * Todas las lanes (app, ecosystem/MCP, Nexa) consumen ESTE command — cero lógica
 * duplicada por consumer. El write es apto para `propose → confirm → execute`: cada
 * diagnóstico compromete dinero real, así que Nexa propone y un humano confirma en el
 * endpoint de confirmación; el LLM nunca dispara gasto directo.
 *
 * Orden del gate (cada paso corta ANTES de gastar):
 *   flag → sujeto válido → tope diario por actor → forecast del CONJUNTO → tope duro
 *   por diagnóstico → claim de idempotencia (día/dominio) → recién ahí, el proveedor.
 *
 * Una corrida por diagnóstico y se acabó: no hay scheduler, no hay re-corrida
 * automática. Repetir el mismo día devuelve lo existente con USD 0; re-correr otro
 * día es una fila nueva con actor humano que vuelve a pasar por todos los topes.
 */

import { captureWithDomain } from '@/lib/observability/capture'

import {
  enforceProspectDiagnosticBudget,
  resolveProspectDiagnosticCeilingUsd,
  resolveProspectDiagnosticDailyActorCap
} from '../entitlement'
import { isSeoProspectDiagnosticEnabled } from '../flags'
import { collectProspectMarketEvidence } from './collect'
import type { ProspectDiagnostic } from './contracts'
import { EtvMethodologyPolicyError, buildEtvMethodologyRequest } from '../etv-methodology'
import { toPersistedEtvMethodology } from '../etv-methodology/persisted'
import { PROSPECT_RANKED_KEYWORDS_ENDPOINT } from './contracts'
import { forecastProspectDiagnosticCostUsd, resolveProspectSubject } from './contracts'
import { deriveProspectMarketFacts } from './derive'
import { collectProspectOnPageEvidence, collectProspectSiteEvidence } from './site-evidence'
import {
  claimProspectDiagnostic,
  countActorDiagnosticsToday,
  failProspectDiagnostic,
  finalizeProspectDiagnostic,
  getProspectDiagnostic
} from './store'

export type ProspectDiagnosticErrorCode =
  | 'disabled'
  | 'invalid_domain'
  | 'unsupported_market'
  | 'daily_cap_exceeded'
  | 'no_entitlement'
  | 'budget_exhausted'
  | 'cost_blocked'
  | 'claim_conflict'
  | 'collect_failed'
  /** TASK-1805 — la policy ETV rechazó la corrida antes de gastar (legacy desde el corte / config inválida). */
  | 'etv_methodology_rejected'

export interface RunProspectDiagnosticInput {
  rootDomain: string
  market: string
  competitorDomains?: string[]
  /** Quién dispara (persona u `mcp:<consumer>`); siempre hay un humano detrás del confirm. */
  actor: string
  env?: NodeJS.ProcessEnv
}

export type RunProspectDiagnosticResult =
  | { ok: true; diagnostic: ProspectDiagnostic; reused: boolean }
  | { ok: false; errorCode: ProspectDiagnosticErrorCode; effectiveBudgetUsd?: number; forecastUsd?: number }

export const runProspectDiagnostic = async (
  input: RunProspectDiagnosticInput
): Promise<RunProspectDiagnosticResult> => {
  const env = input.env ?? process.env

  if (!isSeoProspectDiagnosticEnabled(env)) {
    return { ok: false, errorCode: 'disabled' }
  }

  const resolved = resolveProspectSubject(input.rootDomain, input.market)

  if (!resolved.ok) {
    return { ok: false, errorCode: resolved.reason }
  }

  const subject = resolved.subject

  const usedToday = await countActorDiagnosticsToday(input.actor)

  if (usedToday >= resolveProspectDiagnosticDailyActorCap(env)) {
    return { ok: false, errorCode: 'daily_cap_exceeded' }
  }

  const forecast = forecastProspectDiagnosticCostUsd()
  const gate = await enforceProspectDiagnosticBudget(forecast.totalUsd, env)

  if (!gate.allowed || !gate.acquisitionOrganizationId) {
    return {
      ok: false,
      errorCode: gate.blockedReason ?? 'no_entitlement',
      effectiveBudgetUsd: gate.effectiveBudgetUsd,
      forecastUsd: forecast.totalUsd
    }
  }

  // TASK-1805 — la fórmula se fija ANTES del claim: si la policy falla cerrado, no se ocupa el
  // slot del día ni se toca al proveedor.
  let etvRequest

  try {
    etvRequest = buildEtvMethodologyRequest({ endpoint: PROSPECT_RANKED_KEYWORDS_ENDPOINT, env })
  } catch (error) {
    if (error instanceof EtvMethodologyPolicyError) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'growth_seo_prospect_command', etvPolicyCode: error.code },
        extra: { rootDomain: subject.rootDomain, market: subject.market }
      })

      return { ok: false, errorCode: 'etv_methodology_rejected' }
    }

    throw error
  }

  const claim = await claimProspectDiagnostic({
    subject,
    actor: input.actor,
    ceilingUsd: resolveProspectDiagnosticCeilingUsd(env),
    forecastUsd: forecast.totalUsd,
    competitorDomains: input.competitorDomains ?? [],
    etvMethodology: toPersistedEtvMethodology(etvRequest)
  }).catch(() => null)

  if (!claim) {
    return { ok: false, errorCode: 'claim_conflict' }
  }

  if (claim.outcome === 'already_exists') {
    // Idempotencia: mismo dominio/mercado/día → lo existente, USD 0, cero llamadas.
    return { ok: true, diagnostic: claim.existing, reused: true }
  }

  try {
    const capturedAt = new Date().toISOString()

    const market = await collectProspectMarketEvidence({
      subject,
      acquisitionOrganizationId: gate.acquisitionOrganizationId,
      competitorDomains: input.competitorDomains,
      etvMethodologyVersion: etvRequest.requested,
      env
    })

    const siteFacts = await collectProspectSiteEvidence(subject)
    const onPageFacts = await collectProspectOnPageEvidence(subject, gate.acquisitionOrganizationId)
    const marketFacts = deriveProspectMarketFacts(market, capturedAt)

    const facts = [...marketFacts, ...siteFacts, ...onPageFacts]

    const marketSourcesOk = [market.rankedKeywords, market.competitorsDomain, market.backlinksCompetitors].some(
      outcome => outcome.ok
    )

    if (!marketSourcesOk && facts.length === 0) {
      await failProspectDiagnostic(claim.diagnosticId, 'all_sources_failed')

      return { ok: false, errorCode: 'collect_failed' }
    }

    await finalizeProspectDiagnostic({
      diagnosticId: claim.diagnosticId,
      subject,
      actor: input.actor,
      facts,
      actualCostUsd: market.actualCostUsd,
      etvRequestedAt: market.etvMethodology.requestedAt
    })

    if (market.actualCostUsd > forecast.totalUsd) {
      // El costo real superó lo previsto: la señal cost_overrun lo levanta desde la
      // fila (provider_cost_usd vs ceiling); esto deja además la traza inmediata.
      captureWithDomain(new Error('prospect_diagnostic_cost_over_forecast'), 'growth', {
        tags: { source: 'growth_seo_prospect_command' },
        extra: {
          diagnosticId: claim.diagnosticId,
          forecastUsd: forecast.totalUsd,
          actualUsd: market.actualCostUsd
        }
      })
    }

    const diagnostic = await getProspectDiagnostic(claim.diagnosticId)

    if (!diagnostic) {
      return { ok: false, errorCode: 'collect_failed' }
    }

    return { ok: true, diagnostic, reused: false }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_prospect_command' },
      extra: { diagnosticId: claim.diagnosticId, rootDomain: subject.rootDomain }
    })

    await failProspectDiagnostic(claim.diagnosticId, error instanceof Error ? error.message : 'unknown').catch(
      () => undefined
    )

    return { ok: false, errorCode: 'collect_failed' }
  }
}
