import 'server-only'

/**
 * TASK-1709 — Store del diagnóstico de prospecto.
 *
 * El claim de idempotencia ES la fila: el índice único parcial
 * `seo_prospect_diagnostics_daily_idem_idx` (dominio × location × idioma × día,
 * WHERE status IN ('running','completed')) hace que un segundo disparo el mismo día
 * choque en el INSERT, lea la existente y gaste USD 0 — sin advisory lock sostenido
 * a través de llamadas externas. Un run `failed` libera el slot (se puede reintentar).
 *
 * Los hechos son append-only estricto (trigger en DB); acá además se valida que cada
 * hecho llegue con `lens` y `capturedAt` — insertar un hecho sin lente es el defecto
 * ISSUE-154 y se rechaza ANTES de tocar la base.
 */

import { withTransaction } from '@/lib/db'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { buildEtvMethodologyProvenance, isEtvMethodologyVersion, ETV_LEGACY_METHODOLOGY } from '../etv-methodology'
import type { PersistedEtvMethodology } from '../etv-methodology/persisted'

import type { ProspectDiagnostic, ProspectFact, ProspectSource, ProspectSubject } from './contracts'
import {
  SEO_PROSPECT_DIAGNOSTIC_AGGREGATE_TYPE,
  SEO_PROSPECT_DIAGNOSTIC_COMPLETED_EVENT,
  isProspectFactKind
} from './contracts'

interface DiagnosticRow extends Record<string, unknown> {
  diagnostic_id: string
  root_domain: string
  market: string
  location_code: number
  language_code: string
  status: string
  cost_ceiling_usd: string | number
  forecast_cost_usd: string | number
  provider_cost_usd: string | number | null
  created_by: string
  created_at: string
  completed_at: string | null
  etv_methodology_version: string
  etv_methodology_evidence: string
  etv_requested_at: string | null
  etv_policy_version: string | null
}

interface FactRow extends Record<string, unknown> {
  kind: string
  magnitude: string | number | null
  lens: string
  captured_at: string
  source: string
  detail_json: Record<string, unknown>
}

const toNumber = (value: string | number | null): number | null => {
  if (value === null) return null
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toDiagnostic = (row: DiagnosticRow, facts: ProspectFact[]): ProspectDiagnostic => ({
  diagnosticId: row.diagnostic_id,
  subject: {
    rootDomain: row.root_domain,
    market: row.market,
    locationCode: row.location_code,
    languageCode: row.language_code
  },
  status: row.status as ProspectDiagnostic['status'],
  facts,
  cost: {
    ceilingUsd: toNumber(row.cost_ceiling_usd) ?? 0,
    forecastUsd: toNumber(row.forecast_cost_usd) ?? 0,
    actualUsd: toNumber(row.provider_cost_usd)
  },
  provenance: {
    runAt: new Date(row.created_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    createdBy: row.created_by,
    sources: [...new Set(facts.map(fact => fact.source))]
  },
  // TASK-1805 — un diagnóstico = una request = una fórmula; el reader la sirve tal cual.
  etvMethodology: buildEtvMethodologyProvenance({
    served: isEtvMethodologyVersion(row.etv_methodology_version) ? row.etv_methodology_version : ETV_LEGACY_METHODOLOGY,
    rowVersion: row.etv_methodology_version,
    rowEvidence: row.etv_methodology_evidence,
    rowPolicyVersion: row.etv_policy_version,
    available: [row.etv_methodology_version]
  })
})

const toFact = (row: FactRow): ProspectFact => ({
  kind: isProspectFactKind(row.kind) ? row.kind : 'ranked_keywords_total',
  magnitude: toNumber(row.magnitude),
  lens: 'estimated',
  capturedAt: new Date(row.captured_at).toISOString(),
  source: row.source as ProspectSource,
  detail: row.detail_json ?? {}
})

export interface ClaimProspectDiagnosticInput {
  subject: ProspectSubject
  actor: string
  ceilingUsd: number
  forecastUsd: number
  competitorDomains: string[]
  /** TASK-1805 — método fijado ANTES de gastar; la cabecera es la identidad de la request. */
  etvMethodology: PersistedEtvMethodology
}

export type ClaimProspectDiagnosticResult =
  | { outcome: 'claimed'; diagnosticId: string }
  | { outcome: 'already_exists'; existing: ProspectDiagnostic }

/**
 * Intenta reclamar el slot del día para el sujeto. Si ya existe un run vigente
 * (running/completed) devuelve el diagnóstico existente — el caller NO debe gastar.
 */
export const claimProspectDiagnostic = async (
  input: ClaimProspectDiagnosticInput
): Promise<ClaimProspectDiagnosticResult> => {
  const inserted = await runGreenhousePostgresQuery<{ diagnostic_id: string }>(
    `INSERT INTO greenhouse_growth.seo_prospect_diagnostics
       (root_domain, market, location_code, language_code, status, cost_ceiling_usd,
        forecast_cost_usd, competitor_domains, created_by,
        etv_methodology_version, etv_methodology_evidence, etv_requested_at, etv_policy_version)
     VALUES ($1, $2, $3, $4, 'running', $5, $6, $7, $8, $9, $10, $11::timestamptz, $12)
     ON CONFLICT (root_domain, location_code, language_code, run_date)
       WHERE status IN ('running', 'completed')
       DO NOTHING
     RETURNING diagnostic_id`,
    [
      input.subject.rootDomain,
      input.subject.market,
      input.subject.locationCode,
      input.subject.languageCode,
      input.ceilingUsd,
      input.forecastUsd,
      input.competitorDomains,
      input.actor,
      input.etvMethodology.version,
      input.etvMethodology.evidence,
      input.etvMethodology.requestedAt,
      input.etvMethodology.policyVersion
    ]
  )

  if (inserted[0]?.diagnostic_id) {
    return { outcome: 'claimed', diagnosticId: inserted[0].diagnostic_id }
  }

  const existingRows = await runGreenhousePostgresQuery<DiagnosticRow>(
    `SELECT *
       FROM greenhouse_growth.seo_prospect_diagnostics
      WHERE root_domain = $1 AND location_code = $2 AND language_code = $3
        AND run_date = CURRENT_DATE AND status IN ('running', 'completed')
      ORDER BY created_at DESC
      LIMIT 1`,
    [input.subject.rootDomain, input.subject.locationCode, input.subject.languageCode]
  )

  const existing = existingRows[0]

  if (!existing) {
    // Carrera extrema (el run vigente pasó a failed entre el INSERT y este SELECT):
    // se trata como claim fallido honesto; el caller reporta conflicto sin gastar.
    throw new Error('prospect_diagnostic_claim_race')
  }

  const facts = await readProspectFacts(existing.diagnostic_id)

  return { outcome: 'already_exists', existing: toDiagnostic(existing, facts) }
}

const readProspectFacts = async (diagnosticId: string): Promise<ProspectFact[]> => {
  const rows = await runGreenhousePostgresQuery<FactRow>(
    `SELECT kind, magnitude, lens, captured_at, source, detail_json
       FROM greenhouse_growth.seo_prospect_diagnostic_facts
      WHERE diagnostic_id = $1
      ORDER BY kind`,
    [diagnosticId]
  )

  return rows.map(toFact)
}

/**
 * Cierra la corrida: inserta los hechos, marca la fila `completed` con el costo real y
 * emite el evento outbox — TODO en la misma transacción (un diagnóstico jamás queda
 * `completed` sin sus hechos ni con el evento perdido).
 */
export const finalizeProspectDiagnostic = async (input: {
  diagnosticId: string
  subject: ProspectSubject
  actor: string
  facts: ProspectFact[]
  actualCostUsd: number
  /** TASK-1805 — instante UTC de la request ETV real (la cabecera nació con el del claim). */
  etvRequestedAt: string
}): Promise<void> => {
  for (const fact of input.facts) {
    // ISSUE-154: un hecho sin lente o sin fecha de captura no entra a la base — punto.
    if (fact.lens !== 'estimated' || !fact.capturedAt || !isProspectFactKind(fact.kind)) {
      throw new Error(`prospect_fact_invalid: kind=${String(fact.kind)} lens=${String(fact.lens)}`)
    }
  }

  await withTransaction(async client => {
    for (const fact of input.facts) {
      await client.query(
        `INSERT INTO greenhouse_growth.seo_prospect_diagnostic_facts
           (diagnostic_id, kind, magnitude, lens, captured_at, source, detail_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          input.diagnosticId,
          fact.kind,
          fact.magnitude,
          fact.lens,
          fact.capturedAt,
          fact.source,
          JSON.stringify(fact.detail)
        ]
      )
    }

    await client.query(
      `UPDATE greenhouse_growth.seo_prospect_diagnostics
          SET status = 'completed', provider_cost_usd = $2, completed_at = clock_timestamp(),
              etv_requested_at = $3::timestamptz
        WHERE diagnostic_id = $1 AND status = 'running'`,
      [input.diagnosticId, input.actualCostUsd, input.etvRequestedAt]
    )

    await publishOutboxEvent(
      {
        aggregateType: SEO_PROSPECT_DIAGNOSTIC_AGGREGATE_TYPE,
        aggregateId: input.diagnosticId,
        eventType: SEO_PROSPECT_DIAGNOSTIC_COMPLETED_EVENT,
        // Coordenadas, nunca los datos: cualquier consumer re-lee PG por diagnosticId.
        payload: {
          diagnosticId: input.diagnosticId,
          rootDomain: input.subject.rootDomain,
          market: input.subject.market,
          factCount: input.facts.length,
          actualCostUsd: input.actualCostUsd,
          actor: input.actor
        }
      },
      client as never
    )
  })
}

/** Marca la corrida `failed` (libera el slot de idempotencia del día). */
export const failProspectDiagnostic = async (diagnosticId: string, reason: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.seo_prospect_diagnostics
        SET status = 'failed', failure_reason = $2, completed_at = clock_timestamp()
      WHERE diagnostic_id = $1 AND status = 'running'`,
    [diagnosticId, reason.slice(0, 500)]
  )
}

/** Diagnósticos creados HOY por el actor (freno diario de abuso). */
export const countActorDiagnosticsToday = async (actor: string): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM greenhouse_growth.seo_prospect_diagnostics
      WHERE created_by = $1 AND run_date = CURRENT_DATE`,
    [actor]
  )

  return rows[0]?.count ?? 0
}

export const getProspectDiagnostic = async (diagnosticId: string): Promise<ProspectDiagnostic | null> => {
  const rows = await runGreenhousePostgresQuery<DiagnosticRow>(
    `SELECT * FROM greenhouse_growth.seo_prospect_diagnostics WHERE diagnostic_id = $1`,
    [diagnosticId]
  )

  const row = rows[0]

  if (!row) return null

  return toDiagnostic(row, await readProspectFacts(row.diagnostic_id))
}

export interface ListProspectDiagnosticsInput {
  limit?: number
  rootDomain?: string
}

export const listProspectDiagnostics = async (
  input: ListProspectDiagnosticsInput = {}
): Promise<ProspectDiagnostic[]> => {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)

  const rows = input.rootDomain
    ? await runGreenhousePostgresQuery<DiagnosticRow>(
        `SELECT * FROM greenhouse_growth.seo_prospect_diagnostics
          WHERE root_domain = $1 ORDER BY created_at DESC LIMIT $2`,
        [input.rootDomain.toLowerCase(), limit]
      )
    : await runGreenhousePostgresQuery<DiagnosticRow>(
        `SELECT * FROM greenhouse_growth.seo_prospect_diagnostics ORDER BY created_at DESC LIMIT $1`,
        [limit]
      )

  // La lista viaja sin hechos (shape liviano); el detalle los trae `getProspectDiagnostic`.
  return rows.map(row => toDiagnostic(row, []))
}
