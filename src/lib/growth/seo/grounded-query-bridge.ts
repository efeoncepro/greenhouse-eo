/**
 * TASK-1666 — Puente gobernado: candidatos de keyword discovery SEO → draft de grounded
 * queries AEO.
 *
 * El bridge es un ADAPTER, no una autoridad: lee candidatos SOLO por `readKeywordDiscovery`
 * (jamás SQL a tablas `seo_*` ni `grader_*`), resuelve el brand context AUTORIZADO server-side
 * (`grader_profiles` + brand intelligence — nunca acepta identidad de marca del caller) y crea
 * el draft vía el command AEO existente. El resultado SIEMPRE es `draft`: la aprobación es
 * `approveGraderPromptSet` (AEO) y este módulo no la llama ni dispara runs.
 *
 * Honestidad del grounding: `grounded_llm` sólo cuando la autoría LLM realmente usó el
 * contexto; con flags/proveedor caídos el draft es `baseline_fallback` y lo dice — jamás una
 * causalidad falsa. La keyword es dato NO confiable: viaja delimitada al authoring y NUNCA a
 * logs/refs (las refs son opacas: run/candidate/context hash).
 */

import 'server-only'

import { createHash } from 'node:crypto'

import { can } from '@/lib/entitlements/runtime'
import { type TenantEntitlementSubject } from '@/lib/entitlements/types'
import { getActiveBrandIntelligence } from '@/lib/growth/ai-visibility/brand-intelligence/store'
import { isGraderEnabled, isPromptAuthoringEnabled } from '@/lib/growth/ai-visibility/flags'
import {
  authorGraderPromptSetDraft,
  readGraderPromptSets
} from '@/lib/growth/ai-visibility/prompt-packs/prompt-set-command'
import {
  AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION,
  computeSeoSeedCoverage,
  type SeoGroundedKeywordContext,
  type SeoSeedCoverage
} from '@/lib/growth/ai-visibility/prompt-packs/authoring/author-system-prompt'
import { type GraderPromptSetRow } from '@/lib/growth/ai-visibility/prompt-packs/prompt-set-store'
import { type AuthorPromptSetStatus } from '@/lib/growth/ai-visibility/prompt-packs/authoring/author-prompt-set'
import { getGraderProfile } from '@/lib/growth/ai-visibility/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { isSeoModuleEnabled } from './flags'
import { readKeywordDiscovery, type SeoDiscoveryCandidateView } from './keyword-discovery/reader'

// ─── Contratos ──────────────────────────────────────────────────────────────────────

/** Códigos cerrados (spec TASK-1666 §Security and access). Sin prosa del proveedor ni SQL. */
export type GroundedQueryErrorCode =
  | 'grounded_query_disabled'
  | 'seo_forbidden'
  | 'aeo_forbidden'
  | 'profile_not_found'
  | 'candidate_not_found'
  | 'cross_tenant'
  | 'candidate_limit_exceeded'
  | 'duplicate_candidate'
  | 'invalid_context'
  | 'authoring_disabled'
  | 'provider_unavailable'
  | 'schema_invalid'
  | 'draft_conflict'
  | 'draft_not_found'

export const MAX_GROUNDED_QUERY_CANDIDATES = 20

/** Estados de candidato que pueden entrar a un draft (spec Slice 1). `dismissed` exige re-selección. */
const ALLOWED_LATEST_ACTIONS: ReadonlyArray<string | null> = [null, 'selected_for_grounded_query']

export interface CreateGroundedQueryDraftInput {
  subject: TenantEntitlementSubject
  organizationId: string
  profileId: string
  seoTargetId: string
  discoveryRunId: string
  candidateIds: string[]
  createdBy: string
  env?: NodeJS.ProcessEnv
}

export type GroundedQueryDraftResult =
  | {
      ok: true
      draft: GraderPromptSetRow
      groundingMode: 'grounded_llm' | 'baseline_fallback'
      /** Refs opacas `seo.discovery.*` persistidas en el draft. */
      sourceRefs: string[]
      candidateCount: number
      authoringStatus: AuthorPromptSetStatus
      /** `true` = el mismo intent ya tenía un draft vigente; no hubo segunda llamada LLM. */
      deduped: boolean
      /** Presente sólo en fallback: el copy honesto que el consumer DEBE mostrar. */
      fallbackNotice: string | null
      /**
       * v2 (auditoría AEO B1) — cobertura temática POR seed en el set autorado (sólo camino
       * grounded no-deduped; `null` en fallback/dedupe). Si `uncoveredCandidateIds` no está
       * vacío, `coverageNotice` viaja OBLIGATORIO: el draft existe pero la brecha se declara
       * para el review — `grounded_llm` con huecos jamás se presenta como cobertura total.
       */
      seedCoverage: SeoSeedCoverage | null
      coverageNotice: string | null
    }
  | { ok: false; errorCode: GroundedQueryErrorCode; status: number }

/** Copy honesto del fallback (spec §Deterministic fallback). El consumer no puede omitirlo. */
export const GROUNDED_QUERY_FALLBACK_NOTICE =
  'Se creó un draft base para revisión. La autoría grounded no estaba disponible; las preguntas no se ' +
  'consideran específicas de estas keywords hasta que se vuelva a generar el draft con el authoring activo.'

/** Copy de brecha de cobertura (v2): el review decide si regenerar o aprobar con el hueco a la vista. */
export const GROUNDED_QUERY_COVERAGE_NOTICE =
  'La autoría no dejó huella temática de todos los candidatos seleccionados. Revisa la brecha antes de ' +
  'aprobar: puedes regenerar el draft o aceptar que esos candidatos no quedaron representados.'

// ─── Context hash (forma EXACTA de la spec) ─────────────────────────────────────────

export interface SeoGroundingContextShape {
  runId: string
  seoTargetId: string
  market: string
  locale: string
  candidates: Array<{
    candidateId: string
    normalizedKeyword: string
    sourceEndpoint: string
    coreKeyword: string | null
    intent: string | null
    searchVolume: number | null
    keywordDifficulty: number | null
    capturedAt: string
  }>
}

/**
 * SHA-256 hex minúsculas del JSON UTF-8 canónico: claves EN ESTE ORDEN, sin espacios,
 * `candidates` ordenado por `candidateId` ascendente. La forma es contrato (spec §invariantes):
 * cambiarla rompe la verificabilidad de todo `contextRef` histórico.
 */
export const computeSeoGroundingContextRef = (shape: SeoGroundingContextShape): string => {
  const canonical = JSON.stringify({
    runId: shape.runId,
    seoTargetId: shape.seoTargetId,
    market: shape.market,
    locale: shape.locale,
    candidates: [...shape.candidates]
      .sort((a, b) => (a.candidateId < b.candidateId ? -1 : 1))
      .map(candidate => ({
        candidateId: candidate.candidateId,
        normalizedKeyword: candidate.normalizedKeyword,
        sourceEndpoint: candidate.sourceEndpoint,
        coreKeyword: candidate.coreKeyword,
        intent: candidate.intent,
        searchVolume: candidate.searchVolume,
        keywordDifficulty: candidate.keywordDifficulty,
        capturedAt: candidate.capturedAt
      }))
  })

  return `seo.discovery.context:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`
}

// ─── Command ────────────────────────────────────────────────────────────────────────

const fail = (errorCode: GroundedQueryErrorCode, status: number): GroundedQueryDraftResult => ({
  ok: false,
  errorCode,
  status
})

export const createGroundedQueryDraft = async (
  input: CreateGroundedQueryDraftInput
): Promise<GroundedQueryDraftResult> => {
  const env = input.env ?? process.env

  // Flags: módulo SEO (candidatos) + grader AEO (contexto/lifecycle). El flag de prompt
  // authoring NO bloquea: sólo decide `grounded_llm` vs `baseline_fallback`.
  if (!isSeoModuleEnabled(env) || !isGraderEnabled(env)) {
    return fail('grounded_query_disabled', 409)
  }

  // Dos planos de capability, los dos obligatorios: leer candidatos SEO y gestionar prompts AEO.
  if (!can(input.subject, 'growth.seo.observation.read', 'read', 'tenant')) {
    return fail('seo_forbidden', 403)
  }

  if (!can(input.subject, 'growth.ai_visibility.prompt_set.manage', 'execute', 'tenant')) {
    return fail('aeo_forbidden', 403)
  }

  // Validación de la selección ANTES de tocar nada.
  const candidateIds = input.candidateIds.map(id => id.trim()).filter(Boolean)

  if (candidateIds.length === 0) return fail('invalid_context', 400)

  if (candidateIds.length > MAX_GROUNDED_QUERY_CANDIDATES) return fail('candidate_limit_exceeded', 400)

  if (new Set(candidateIds).size !== candidateIds.length) return fail('duplicate_candidate', 400)

  // Profile del MISMO tenant (anti-oracle: ajeno o inexistente responden lo mismo).
  const profile = await getGraderProfile(input.profileId)

  if (!profile || profile.organizationId !== input.organizationId) {
    return fail('profile_not_found', 404)
  }

  // Brand context AUTORIZADO: si falta un campo requerido se declara, jamás se inventa.
  if (!profile.brandName || !profile.categoryLabel || !profile.businessModel || profile.businessModel === 'unknown') {
    return fail('invalid_context', 409)
  }

  // Candidatos vía el reader canónico de 1664 (tenant-safe + anti-oracle). Cero SQL cross-motor.
  const discovery = await readKeywordDiscovery({
    organizationId: input.organizationId,
    runId: input.discoveryRunId,
    candidateIds,
    limit: MAX_GROUNDED_QUERY_CANDIDATES
  })

  if (!discovery.ok) return fail('candidate_not_found', 404)

  // El run debe pertenecer al target declarado (consistencia intra-tenant, no anti-oracle).
  if (discovery.run && discovery.run.seoTargetId !== input.seoTargetId) {
    return fail('cross_tenant', 404)
  }

  const byId = new Map(discovery.candidates.map(candidate => [candidate.candidateId, candidate]))

  // Todos los IDs pedidos deben existir en ESA corrida de ESA org; sin revelar cuál falló.
  const selected: SeoDiscoveryCandidateView[] = []

  for (const candidateId of candidateIds) {
    const candidate = byId.get(candidateId)

    if (!candidate) return fail('candidate_not_found', 404)

    selected.push(candidate)
  }

  // Estado del candidato: la última decisión manda. `dismissed`/otros exigen re-selección
  // explícita (`selected_for_grounded_query`) antes de entrar a un draft.
  for (const candidate of selected) {
    const latest = candidate.latestAction?.kind ?? null

    if (!ALLOWED_LATEST_ACTIONS.includes(latest)) return fail('invalid_context', 409)
  }

  const brandIntelligence = await getActiveBrandIntelligence(input.profileId)

  // Contexto delimitado + hash verificable (forma exacta de la spec; candidates orden estable).
  const orderedCandidates = [...selected].sort((a, b) => (a.candidateId < b.candidateId ? -1 : 1))

  const contextRef = computeSeoGroundingContextRef({
    runId: input.discoveryRunId,
    seoTargetId: input.seoTargetId,
    market: profile.market,
    locale: profile.locale,
    candidates: orderedCandidates.map(candidate => ({
      candidateId: candidate.candidateId,
      normalizedKeyword: candidate.normalizedKeyword,
      sourceEndpoint: candidate.sourceEndpoint,
      coreKeyword: candidate.coreKeyword,
      intent: candidate.intent,
      searchVolume: candidate.searchVolume,
      keywordDifficulty: candidate.difficulty,
      capturedAt: candidate.capturedAt
    }))
  })

  const seoContext: SeoGroundedKeywordContext = {
    runId: input.discoveryRunId,
    contextRef,
    candidates: orderedCandidates.map(candidate => ({
      candidateId: candidate.candidateId,
      keyword: candidate.keyword,
      coreKeyword: candidate.coreKeyword,
      sourceEndpoint: candidate.sourceEndpoint,
      intent: candidate.intent,
      searchVolume: candidate.searchVolume,
      keywordDifficulty: candidate.difficulty,
      capturedAt: candidate.capturedAt
    }))
  }

  try {
    // Idempotencia + serialización: advisory lock TRANSACCIONAL por intent (org+profile+run+
    // candidates+versión del cerebro grounded), sobre una conexión FIJADA — un lock de sesión
    // vía pool se soltaría en otra conexión y quedaría filtrado (trampa cross-pool). El lock se
    // sostiene durante el dedupe-check y la autoría: dos solicitudes concurrentes del MISMO
    // intent no producen dos drafts ni dos llamadas LLM. El draft interno usa su propia
    // transacción (otra conexión): el lock lo cubre porque se libera DESPUÉS, al cerrar esta.
    const lockKey = [
      input.organizationId,
      input.profileId,
      input.discoveryRunId,
      candidateIds.slice().sort().join(','),
      AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION
    ].join('|')

    return await withGreenhousePostgresTransaction(async client => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [lockKey])

      // Dedupe contra el MODO ESPERADO: con el authoring disponible sólo dedupea un draft
      // grounded del mismo contexto (un baseline previo NO bloquea re-generar grounded — el
      // copy del fallback promete exactamente eso); con el authoring apagado, cualquier draft
      // del contexto dedupea (repetir no apila baselines idénticos ni promete lo imposible).
      const authoringAvailable = isPromptAuthoringEnabled(env)
      const existingSets = await readGraderPromptSets({ subject: input.subject, profileId: input.profileId })

      const existingDraft = existingSets.versions.find(
        version =>
          version.status === 'draft' &&
          version.groundingSources.includes(contextRef) &&
          (!authoringAvailable || version.systemPromptVersion === AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION)
      )

      if (existingDraft) {
        const wasGrounded =
          existingDraft.generationStrategy === 'llm' &&
          existingDraft.systemPromptVersion === AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION

        return {
          ok: true as const,
          draft: existingDraft,
          groundingMode: wasGrounded ? ('grounded_llm' as const) : ('baseline_fallback' as const),
          sourceRefs: existingDraft.groundingSources.filter(source => source.startsWith('seo.discovery.')),
          candidateCount: selected.length,
          authoringStatus: wasGrounded ? ('ok' as const) : ('disabled' as const),
          deduped: true,
          fallbackNotice: wasGrounded ? null : GROUNDED_QUERY_FALLBACK_NOTICE,
          seedCoverage: null,
          coverageNotice: null
        }
      }

      const { draft, authoringStatus } = await authorGraderPromptSetDraft({
        subject: input.subject,
        profileId: input.profileId,
        brandName: profile.brandName,
        categoryNodeId: profile.categoryNodeId,
        categoryLabel: profile.categoryLabel!,
        businessModel: profile.businessModel!,
        market: profile.market,
        locale: profile.locale,
        competitors: profile.competitorsDeclared,
        whatTheBrandDoes: brandIntelligence?.whatTheBrandDoes ?? null,
        fineCategory: brandIntelligence?.fineCategory ?? null,
        createdBy: input.createdBy,
        seoContext
      })

      const grounded = authoringStatus === 'ok'

      // v2 (auditoría AEO B1): la etiqueta grounded no basta — se VERIFICA que cada seed dejó
      // huella temática; una brecha se declara para el review, jamás se esconde.
      const seedCoverage = grounded ? computeSeoSeedCoverage(draft.prompts, seoContext) : null

      return {
        ok: true as const,
        draft,
        groundingMode: grounded ? ('grounded_llm' as const) : ('baseline_fallback' as const),
        sourceRefs: draft.groundingSources.filter(source => source.startsWith('seo.discovery.')),
        candidateCount: selected.length,
        authoringStatus,
        deduped: false,
        fallbackNotice: grounded ? null : GROUNDED_QUERY_FALLBACK_NOTICE,
        seedCoverage,
        coverageNotice:
          seedCoverage && seedCoverage.uncoveredCandidateIds.length > 0 ? GROUNDED_QUERY_COVERAGE_NOTICE : null
      }
    })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_grounded_query_bridge' },
      extra: { profileId: input.profileId, discoveryRunId: input.discoveryRunId }
    })

    return fail('draft_conflict', 502)
  }
}
