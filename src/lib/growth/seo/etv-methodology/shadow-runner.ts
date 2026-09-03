/**
 * TASK-1806 Slice 1 — Ejecutor BOUNDED del shadow legacy/improved de ETV (`exact_ab`).
 *
 * Compra, para una cohorte PREREGISTRADA y aprobada, las dos fórmulas de cada celda en la misma
 * ventana (inputs byte-idénticos salvo `use_improved_etv`), persiste ambas con los writers
 * productivos y deja un artefacto reproducible (respuestas crudas + `summary.json`). Es la
 * única pieza del dominio autorizada a pedir `improved_layout_clickstream_v2` antes del cutover.
 *
 * ═══ Por qué NO reutiliza `captureDomainOverview` / `captureUrlVisibility` / `captureRelevantPages` ═══
 *
 * Esos comandos filtran por FRESCURA (30 días) contra el selector del ENV: con producción en
 * `legacy_static_v1` explícito, la celda cuyo legacy ya está "fresco" se saltaría (costo cero) y
 * el A/B quedaría sin su mitad legacy simultánea — o sea, un canary temporal disfrazado de
 * paridad, que es justo lo que el ADR prohíbe describir como A/B. El shadow es una EXCEPCIÓN
 * AUTORIZADA (gate `GROWTH_SEO_ETV_EVALUATOR_ENABLED` + allowlist + caps + preregistro) que
 * compra las dos fórmulas el mismo día. Lo que SÍ reutiliza, sin copiar: los parsers/proyecciones
 * (`parseDomainRankOverviewItem`, `projectRankedKeywordsResult`, `projectConcentrationItems`,
 * `projectHistoryItems`, `parseBulkTrafficItem`, `deriveProspectMarketFacts`) y los writers
 * canónicos (`persistDomainOverviewSnapshots`, `persistUrlVisibilitySnapshots`).
 *
 * ═══ Contrato de gasto (fail-closed en cada capa) ═══
 *
 *   1. `planEtvEvaluation` + `dryRunEtvEvaluation`: gate OFF, allowlist, caps o policy → NO se
 *      llama al proveedor (`executed: false`, con razones).
 *   2. Contract de schema: si la UNIQUE legacy (sin metodología) sigue en la base, la segunda
 *      fórmula del día reventaría con 23505 DESPUÉS de pagar → se aborta ANTES de la primera
 *      llamada (preregistro §6).
 *   3. Idempotencia por (sujeto, mercado, endpoint, capture_date=hoy, metodología): una
 *      re-corrida el mismo día marca `already_captured` y no re-compra.
 *   4. `enforceSeoRunEntitlement` por organización con el costo estimado restante.
 *   5. Parada dura ANTES de cada llamada: requests < maxRequests y costo real acumulado +
 *      estimado de la próxima ≤ budgetUsd. Aborta la corrida COMPLETA (no sólo la celda) ante
 *      `EtvMethodologyPolicyError`, drift `requested ≠ providerEffective`, `status_code != 20000`
 *      en AMBAS fórmulas de una celda, breaker abierto o error de transporte.
 *
 * ═══ Orden dentro de la celda: improved PRIMERO, legacy DESPUÉS ═══
 *
 * La señal `seo.etv_methodology.drift` compara el selector configurado del runtime (legacy)
 * con la ÚLTIMA request explícita persistida del día. Si la última fuera improved, la señal
 * reportaría un drift que no existe (el shadow es una excepción autorizada, no un cambio de
 * configuración). Dejando legacy al final de cada celda, la última fila explícita del día es
 * legacy y la señal sigue en steady 0.
 *
 * Sin `node:fs` en este módulo (regla del dominio: la lectura/escritura de archivos vive en
 * scripts/tests): el escritor de artefactos se INYECTA vía `deps.writeArtifact`.
 */

import 'server-only'

import { createHash } from 'node:crypto'

import { postDataForSeoTask as postDataForSeoTaskCanonical, type DataForSeoSerpResult } from '@/lib/ai/dataforseo'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  DOMAIN_RANK_OVERVIEW_ENDPOINT,
  parseDomainRankOverviewItem,
  type DomainRankOverviewItemRaw
} from '../domain-overview/capture'
import {
  HISTORICAL_RANK_OVERVIEW_ENDPOINT,
  monthsBetween,
  projectHistoryItems,
  type HistoricalRankOverviewItemRaw
} from '../domain-overview/history-backfill'
import {
  buildNullSnapshot,
  normalizeOverviewDomain,
  persistDomainOverviewSnapshots as persistDomainOverviewSnapshotsCanonical,
  type SeoDomainOverviewSnapshotInput
} from '../domain-overview/persist'
import {
  BULK_TRAFFIC_ESTIMATION_ENDPOINT,
  parseBulkTrafficItem,
  type BulkTrafficItemRaw
} from '../domain-overview/traffic-estimation'
import { enforceSeoRunEntitlement as enforceSeoRunEntitlementCanonical, type SeoRunGate } from '../entitlement'
import { PROSPECT_RANKED_KEYWORDS_LIMIT } from '../prospect/contracts'
import { deriveProspectMarketFacts } from '../prospect/derive'
import { projectRankedKeywordsResult, RANKED_KEYWORDS_ENDPOINT } from '../url-visibility/capture'
import {
  buildNullVisibilitySnapshot,
  persistUrlVisibilitySnapshots as persistUrlVisibilitySnapshotsCanonical,
  type SeoUrlVisibilitySnapshotInput
} from '../url-visibility/persist'
import {
  projectConcentrationItems,
  type RelevantPageItemRaw,
  type SubdomainItemRaw
} from '../url-visibility/relevant-pages'
import { resolveVisibilitySubject } from '../url-visibility/resolve-subject'

import {
  ETV_IMPROVED_METHODOLOGY,
  ETV_LEGACY_METHODOLOGY,
  ETV_METHODOLOGY_POLICY_VERSION,
  ETV_PROVIDER_REQUEST_PARAM,
  EtvMethodologyPolicyError,
  type EtvHistoricalCalculationBasis,
  type EtvMethodologyVersion
} from './contracts'
import {
  dryRunEtvEvaluation,
  planEtvEvaluation,
  type EtvEvaluationCell,
  type EtvEvaluationPlan,
  type EtvEvaluatorConfig,
  type EtvPlannedRequest
} from './evaluator'
import { resolveEtvLabsFamilyBySlug } from './families'
import { toPersistedEtvMethodology, type PersistedEtvMethodology } from './persisted'
import { buildEtvMethodologyRequest, type EtvMethodologyRequest } from './policy'

// ─── Cohorte ────────────────────────────────────────────────────────────────────────────────

/** Celda del shadow: la celda del evaluador + quién paga + (opcional) propósito y targets bulk. */
export type EtvShadowCell = EtvEvaluationCell & {
  /** Organización a la que se atribuye el gasto (entitlement + ledger). */
  organizationId: string
  /**
   * `prospect`: la celda replica el `ranked_keywords` del diagnóstico de prospecto (limit 1000).
   * NO persiste en `seo_prospect_diagnostics`: sólo deriva la suma orgánica y la reporta.
   */
  purpose?: 'prospect'
  /** Sólo `bulk_traffic_estimation`: los `targets` del request (el `subject` es el primero). */
  targets?: string[]
}

export type EtvShadowCohort = {
  id: string
  approvedBy: string
  approvedAt: string
  /** Sujeto normalizado → organizationId que lo paga. */
  organizations: Record<string, string>
  cells: EtvShadowCell[]
}

export type EtvShadowMode = 'exact_ab'

const SHADOW_FAMILIES: ReadonlySet<string> = new Set<EtvEvaluationCell['familySlug']>([
  'domain_rank_overview',
  'historical_rank_overview',
  'bulk_traffic_estimation',
  'ranked_keywords',
  'relevant_pages',
  'subdomains'
])

export class EtvShadowCohortError extends Error {
  readonly details: Readonly<Record<string, string | number | null>>

  constructor(message: string, details: Record<string, string | number | null> = {}) {
    super(message)
    this.name = 'EtvShadowCohortError'
    this.details = details
  }
}

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const isMonthKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)

/**
 * Valida la cohorte fail-closed. Un sujeto sin organización, una familia fuera del shadow, un
 * `purpose: 'prospect'` fuera de `ranked_keywords`/limit 1000 o un bulk sin targets → error
 * antes de planificar (y por tanto antes de gastar).
 */
export const assertEtvShadowCohort = (raw: unknown): EtvShadowCohort => {
  if (typeof raw !== 'object' || raw === null) throw new EtvShadowCohortError('La cohorte no es un objeto.')

  const cohort = raw as Record<string, unknown>

  if (!isNonEmptyString(cohort.id)) throw new EtvShadowCohortError('La cohorte no declara `id`.')
  if (!isNonEmptyString(cohort.approvedBy)) throw new EtvShadowCohortError('La cohorte no declara `approvedBy`.', { id: cohort.id })

  if (!isNonEmptyString(cohort.approvedAt) || Number.isNaN(Date.parse(cohort.approvedAt))) {
    throw new EtvShadowCohortError('La cohorte no declara `approvedAt` ISO.', { id: cohort.id })
  }

  if (typeof cohort.organizations !== 'object' || cohort.organizations === null) {
    throw new EtvShadowCohortError('La cohorte no declara `organizations`.', { id: cohort.id })
  }

  const organizations: Record<string, string> = {}

  for (const [subject, organizationId] of Object.entries(cohort.organizations as Record<string, unknown>)) {
    if (!isNonEmptyString(organizationId)) {
      throw new EtvShadowCohortError('Un sujeto de `organizations` no tiene organizationId.', { subject })
    }

    organizations[normalizeOverviewDomain(subject)] = organizationId
  }

  if (!Array.isArray(cohort.cells) || cohort.cells.length === 0) {
    throw new EtvShadowCohortError('La cohorte no tiene celdas.', { id: cohort.id })
  }

  const cells: EtvShadowCell[] = cohort.cells.map((rawCell, index) => {
    if (typeof rawCell !== 'object' || rawCell === null) throw new EtvShadowCohortError('Celda inválida.', { index })

    const cell = rawCell as Record<string, unknown>

    if (!isNonEmptyString(cell.subject)) throw new EtvShadowCohortError('Celda sin `subject`.', { index })

    if (!isNonEmptyString(cell.locationCode) || !isNonEmptyString(cell.languageCode)) {
      throw new EtvShadowCohortError('Celda sin mercado (`locationCode`/`languageCode`).', { index, subject: cell.subject })
    }

    if (!isNonEmptyString(cell.familySlug) || !SHADOW_FAMILIES.has(cell.familySlug)) {
      throw new EtvShadowCohortError('Celda con familia fuera del shadow.', { index, familySlug: String(cell.familySlug ?? null) })
    }

    const familySlug = cell.familySlug as EtvEvaluationCell['familySlug']
    const normalizedSubject = normalizeOverviewDomain(cell.subject)
    const organizationId = isNonEmptyString(cell.organizationId) ? cell.organizationId : null

    if (!organizationId) {
      throw new EtvShadowCohortError('Celda sin `organizationId`: el sujeto no tiene quién pague.', { index, subject: cell.subject })
    }

    // El mapa de organizaciones es la declaración de "quién paga por este sujeto"; la celda no
    // puede contradecirlo en silencio.
    const declared = organizations[normalizedSubject]

    if (!declared) {
      throw new EtvShadowCohortError('Sujeto de la celda sin organización declarada en `organizations`.', { index, subject: normalizedSubject })
    }

    if (declared !== organizationId) {
      throw new EtvShadowCohortError('La celda contradice la organización declarada para el sujeto.', {
        index,
        subject: normalizedSubject,
        declared,
        organizationId
      })
    }

    const rowLimit = cell.rowLimit === undefined ? undefined : Number(cell.rowLimit)

    if (rowLimit !== undefined && (!Number.isInteger(rowLimit) || rowLimit <= 0)) {
      throw new EtvShadowCohortError('`rowLimit` inválido.', { index, subject: normalizedSubject })
    }

    let purpose: 'prospect' | undefined

    if (cell.purpose !== undefined) {
      if (cell.purpose !== 'prospect') throw new EtvShadowCohortError('`purpose` fuera del vocabulario.', { index })

      if (familySlug !== 'ranked_keywords' || rowLimit !== PROSPECT_RANKED_KEYWORDS_LIMIT) {
        throw new EtvShadowCohortError('La celda prospecto exige `ranked_keywords` con el limit del diagnóstico.', {
          index,
          familySlug,
          rowLimit: rowLimit ?? null,
          expected: PROSPECT_RANKED_KEYWORDS_LIMIT
        })
      }

      purpose = 'prospect'
    }

    let period: EtvEvaluationCell['period']

    if (familySlug === 'historical_rank_overview') {
      const rawPeriod = cell.period as Record<string, unknown> | undefined

      if (!rawPeriod || !isMonthKey(rawPeriod.fromMonth) || !isMonthKey(rawPeriod.toMonth) || rawPeriod.fromMonth > rawPeriod.toMonth) {
        throw new EtvShadowCohortError('Celda histórica sin `period` válido (YYYY-MM..YYYY-MM).', { index, subject: normalizedSubject })
      }

      period = { fromMonth: rawPeriod.fromMonth, toMonth: rawPeriod.toMonth }
    }

    let targets: string[] | undefined

    if (familySlug === 'bulk_traffic_estimation') {
      if (!Array.isArray(cell.targets) || cell.targets.length === 0 || !cell.targets.every(isNonEmptyString)) {
        throw new EtvShadowCohortError('Celda bulk sin `targets`.', { index })
      }

      targets = Array.from(new Set(cell.targets.map(normalizeOverviewDomain)))

      for (const target of targets) {
        if (!organizations[target]) {
          throw new EtvShadowCohortError('Target bulk sin organización declarada en `organizations`.', { index, target })
        }
      }

      if (targets[0] !== normalizedSubject) {
        throw new EtvShadowCohortError('El `subject` de la celda bulk debe ser su primer target.', { index, subject: normalizedSubject })
      }
    } else if (cell.targets !== undefined) {
      throw new EtvShadowCohortError('`targets` sólo aplica a `bulk_traffic_estimation`.', { index, familySlug })
    }

    return {
      subject: normalizedSubject,
      locationCode: cell.locationCode,
      languageCode: cell.languageCode,
      familySlug,
      organizationId,
      ...(rowLimit === undefined ? {} : { rowLimit }),
      ...(period ? { period } : {}),
      ...(purpose ? { purpose } : {}),
      ...(targets ? { targets } : {})
    }
  })

  return { id: cohort.id, approvedBy: cohort.approvedBy, approvedAt: cohort.approvedAt, organizations, cells }
}

// ─── Dependencias inyectables ───────────────────────────────────────────────────────────────

type QueryFn = <T extends Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>

export type EtvShadowRunnerDeps = {
  postDataForSeoTask: typeof postDataForSeoTaskCanonical
  query: QueryFn
  enforceSeoRunEntitlement: (organizationId: string, options: { estimatedCostUsd: number; consumesAuditAllowance: false }) => Promise<SeoRunGate>
  persistDomainOverviewSnapshots: typeof persistDomainOverviewSnapshotsCanonical
  persistUrlVisibilitySnapshots: typeof persistUrlVisibilitySnapshotsCanonical
  /** Escribe un artefacto relativo a `artifactDir`. Lo provee el CLI (fs vive fuera del runtime). */
  writeArtifact: (relativePath: string, content: string) => Promise<void>
  /** Sólo para la celda prospecto (sin persistencia): ¿ya existe el crudo del día en el artefacto? */
  artifactExists?: (relativePath: string) => Promise<boolean>
}

const resolveDeps = (overrides: Partial<EtvShadowRunnerDeps> | undefined): EtvShadowRunnerDeps => {
  if (!overrides?.writeArtifact) {
    throw new EtvShadowCohortError('runEtvShadow exige `deps.writeArtifact`: la escritura de artefactos vive fuera del runtime.')
  }

  return {
    postDataForSeoTask: overrides.postDataForSeoTask ?? postDataForSeoTaskCanonical,
    query: overrides.query ?? (runGreenhousePostgresQuery as QueryFn),
    enforceSeoRunEntitlement: overrides.enforceSeoRunEntitlement ?? enforceSeoRunEntitlementCanonical,
    persistDomainOverviewSnapshots: overrides.persistDomainOverviewSnapshots ?? persistDomainOverviewSnapshotsCanonical,
    persistUrlVisibilitySnapshots: overrides.persistUrlVisibilitySnapshots ?? persistUrlVisibilitySnapshotsCanonical,
    writeArtifact: overrides.writeArtifact,
    artifactExists: overrides.artifactExists
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────────────────────

export type EtvShadowRequestStatus =
  /** Se llamó al proveedor (con o sin 20000). */
  | 'executed'
  /** Ya existía la fila del día para (sujeto, mercado, endpoint, metodología): costo cero. */
  | 'already_captured'
  /** La corrida abortó antes de llegar a esta request. */
  | 'skipped_after_abort'

export type EtvShadowAbortReason =
  | 'max_requests_cap'
  | 'budget_cap'
  | 'policy_error'
  | 'provider_effective_drift'
  | 'provider_status_both_formulas'
  | 'breaker_open'
  | 'transport_error'
  | 'persist_conflict'
  | 'persist_error'

export type EtvShadowRequestRecord = {
  cellIndex: number
  familySlug: EtvEvaluationCell['familySlug']
  subject: string
  locationCode: string
  languageCode: string
  purpose: 'prospect' | null
  methodology: EtvMethodologyVersion
  requested: EtvMethodologyVersion | null
  providerEffective: EtvMethodologyVersion | null
  requestedAt: string | null
  taskHashWithoutFlag: string | null
  statusCode: number | null
  ok: boolean
  status: EtvShadowRequestStatus
  errorCode: string | null
  costUsd: number
  latencyMs: number | null
  persisted: { table: string | null; rows: number; conflict: boolean }
  prospectTraffic?: { sum: number | null; sampleRows: number; rowLimit: number; truncated: boolean }
  historicalBasis?: EtvHistoricalCalculationBasis | null
  rawFile: string | null
}

export type EtvShadowSummary = {
  runId: string
  cohortId: string
  mode: EtvShadowMode
  startedAt: string
  finishedAt: string
  executed: boolean
  reasons: string[]
  policyVersion: string
  caps: { maxRequests: number; budgetUsd: number }
  totals: { requests: number; costUsd: number; forecastUsd: number; aborted: boolean; abortReason: EtvShadowAbortReason | null }
  requests: EtvShadowRequestRecord[]
}

export type EtvShadowResult = EtvShadowSummary & { plan: EtvEvaluationPlan }

// ─── Preflight (sin gasto) ──────────────────────────────────────────────────────────────────

/** UNIQUEs legacy (sin metodología) que el contract de TASK-1805 retira. Si viven, no hay coexistencia. */
export const ETV_SHADOW_LEGACY_UNIQUE_CONSTRAINTS = ['seo_domain_overview_capture_unique', 'seo_url_visibility_capture_unique'] as const

const findLegacyUniqueConstraints = async (query: QueryFn): Promise<string[]> => {
  const rows = await query<{ conname: string }>(`SELECT conname FROM pg_constraint WHERE conname = ANY($1::text[]) ORDER BY conname`, [
    [...ETV_SHADOW_LEGACY_UNIQUE_CONSTRAINTS]
  ])

  return rows.map(row => row.conname)
}

const rawArtifactPath = (cellIndex: number, methodology: EtvMethodologyVersion): string => `raw/${cellIndex}-${methodology}.json`

/**
 * ¿Ya hay evidencia persistida HOY para esta (celda, metodología)? Unidad de idempotencia del
 * preregistro §6: sujeto × mercado × endpoint × metodología × capture_date. El histórico usa el
 * mes como fecha (todos los meses del período presentes ⇒ capturado).
 */
const isAlreadyCaptured = async (
  deps: Pick<EtvShadowRunnerDeps, 'query' | 'artifactExists'>,
  cell: EtvShadowCell,
  cellIndex: number,
  methodology: EtvMethodologyVersion
): Promise<boolean> => {
  const market = [cell.locationCode, cell.languageCode]

  switch (cell.familySlug) {
    case 'domain_rank_overview':

    case 'bulk_traffic_estimation': {
      const targets = cell.familySlug === 'bulk_traffic_estimation' ? (cell.targets ?? [cell.subject]) : [cell.subject]

      const rows = await deps.query<{ normalized_domain: string }>(
        `SELECT DISTINCT normalized_domain
           FROM greenhouse_growth.seo_domain_overview_snapshots
          WHERE normalized_domain = ANY($1::text[])
            AND location_code = $2
            AND language_code = $3
            AND source_endpoint = $4
            AND capture_date = CURRENT_DATE
            AND etv_methodology_version = $5`,
        [targets, ...market, cell.familySlug, methodology]
      )

      const found = new Set(rows.map(row => row.normalized_domain))

      return targets.every(target => found.has(target))
    }

    case 'historical_rank_overview': {
      if (!cell.period) return false

      const months = monthsBetween(cell.period.fromMonth, cell.period.toMonth)

      const rows = await deps.query<{ month_key: string }>(
        `SELECT DISTINCT to_char(capture_date, 'YYYY-MM') AS month_key
           FROM greenhouse_growth.seo_domain_overview_snapshots
          WHERE normalized_domain = $1
            AND location_code = $2
            AND language_code = $3
            AND source_endpoint = 'historical_rank_overview'
            AND capture_date BETWEEN $4::date AND $5::date
            AND etv_methodology_version = $6`,
        [cell.subject, ...market, `${cell.period.fromMonth}-01`, `${cell.period.toMonth}-01`, methodology]
      )

      const found = new Set(rows.map(row => row.month_key))

      return months.every(month => found.has(month))
    }

    case 'ranked_keywords': {
      if (cell.purpose === 'prospect') {
        // Sin persistencia: la única evidencia del día es el crudo del artefacto.
        return deps.artifactExists ? deps.artifactExists(rawArtifactPath(cellIndex, methodology)) : false
      }

      const rows = await deps.query<{ found: number }>(
        `SELECT 1 AS found
           FROM greenhouse_growth.seo_url_visibility_snapshots
          WHERE subject_kind = 'domain'
            AND normalized_subject = $1
            AND location_code = $2
            AND language_code = $3
            AND source_endpoint = 'ranked_keywords'
            AND capture_date = CURRENT_DATE
            AND etv_methodology_version = $4
          LIMIT 1`,
        [cell.subject, ...market, methodology]
      )

      return rows.length > 0
    }

    case 'relevant_pages':

    case 'subdomains': {
      // Espejo de `hasFreshRunForDomain` con ventana = HOY: la corrida deja filas hijas
      // (`host/path`, `sub.host`) o la fila-marcador del dominio.
      const rows = await deps.query<{ found: number }>(
        `SELECT 1 AS found
           FROM greenhouse_growth.seo_url_visibility_snapshots
          WHERE source_endpoint = $1
            AND location_code = $2
            AND language_code = $3
            AND (
                  normalized_subject = $4
               OR normalized_subject LIKE $4 || '/%'
               OR normalized_subject LIKE '%.' || $4
                )
            AND capture_date = CURRENT_DATE
            AND etv_methodology_version = $5
          LIMIT 1`,
        [cell.familySlug, ...market, cell.subject, methodology]
      )

      return rows.length > 0
    }
  }
}

export type EtvShadowPreflight = {
  plan: EtvEvaluationPlan
  wouldExecute: boolean
  reasons: string[]
  /** Constraints legacy todavía presentes (contract de schema no aplicado). */
  legacyUniqueConstraints: string[]
  /** (cellIndex, methodology) con evidencia del día: no se compran. */
  alreadyCaptured: Array<{ cellIndex: number; methodology: EtvMethodologyVersion }>
  /** Requests que sí se comprarían, en el orden de ejecución. */
  remaining: Array<{ cellIndex: number; methodology: EtvMethodologyVersion; estimatedCostUsd: number; organizationId: string }>
  remainingForecastUsd: number
  /** Gate de entitlement por organización con el costo restante (sólo si `wouldExecute`). */
  entitlement: Array<{ organizationId: string; estimatedCostUsd: number; allowed: boolean; blockedReason: string | null }>
}

/** Orden de ejecución dentro de la celda: improved primero, legacy después (ver docblock). */
const EXECUTION_ORDER: readonly EtvMethodologyVersion[] = [ETV_IMPROVED_METHODOLOGY, ETV_LEGACY_METHODOLOGY]

const orderedPlannedRequests = (
  plan: EtvEvaluationPlan,
  cells: readonly EtvShadowCell[]
): Array<{ cellIndex: number; planned: EtvPlannedRequest }> => {
  const ordered: Array<{ cellIndex: number; planned: EtvPlannedRequest }> = []

  // `planEtvEvaluation` conserva la REFERENCIA de cada celda en sus requests planificadas.
  for (const [cellIndex, cell] of cells.entries()) {
    for (const methodology of EXECUTION_ORDER) {
      const planned = plan.plannedRequests.find(candidate => candidate.cell === cell && candidate.methodology === methodology)

      if (planned) ordered.push({ cellIndex, planned })
    }
  }

  return ordered
}

/**
 * Preflight completo SIN gasto: plan + dry-run + contract de schema + idempotencia + entitlement.
 * Es lo que el CLI imprime en `--dry-run` y lo que `runEtvShadow` ejecuta antes de la primera llamada.
 */
export const preflightEtvShadow = async (input: {
  cohort: EtvShadowCohort
  config: EtvEvaluatorConfig
  mode: EtvShadowMode
  now?: Date
  deps: Pick<EtvShadowRunnerDeps, 'query' | 'enforceSeoRunEntitlement' | 'artifactExists'>
}): Promise<EtvShadowPreflight> => {
  const now = input.now ?? new Date()
  const plan = planEtvEvaluation({ cells: input.cohort.cells, mode: input.mode, config: input.config, now })
  const dry = dryRunEtvEvaluation(plan, input.config)
  const reasons = [...dry.reasons]

  // Los targets del bulk también deben estar en la allowlist: el plan sólo mira el `subject`.
  for (const [cellIndex, cell] of input.cohort.cells.entries()) {
    for (const target of cell.targets ?? []) {
      if (!input.config.subjectAllowlist.includes(target)) reasons.push(`celda ${cellIndex}: target ${target} fuera de la allowlist`)
    }
  }

  const legacyUniqueConstraints = await findLegacyUniqueConstraints(input.deps.query)

  for (const constraint of legacyUniqueConstraints) {
    reasons.push(`contract de schema no aplicado: la UNIQUE legacy ${constraint} sigue en la base (la segunda fórmula del día colisionaría)`)
  }

  const alreadyCaptured: EtvShadowPreflight['alreadyCaptured'] = []
  const remaining: EtvShadowPreflight['remaining'] = []

  for (const { cellIndex, planned } of orderedPlannedRequests(plan, input.cohort.cells)) {
    if (planned.blockedReason !== null) continue

    const cell = input.cohort.cells[cellIndex]

    if (await isAlreadyCaptured(input.deps, cell, cellIndex, planned.methodology)) {
      alreadyCaptured.push({ cellIndex, methodology: planned.methodology })
      continue
    }

    remaining.push({ cellIndex, methodology: planned.methodology, estimatedCostUsd: planned.estimatedCostUsd, organizationId: cell.organizationId })
  }

  const remainingForecastUsd = Number(remaining.reduce((sum, request) => sum + request.estimatedCostUsd, 0).toFixed(6))
  const entitlement: EtvShadowPreflight['entitlement'] = []

  // El gate se consulta aunque ya haya razones de bloqueo: es read-only y el dry-run del operador
  // necesita ver el presupuesto por organización en el mismo readback.
  if (remaining.length > 0) {
    const byOrganization = new Map<string, number>()

    for (const request of remaining) {
      byOrganization.set(request.organizationId, (byOrganization.get(request.organizationId) ?? 0) + request.estimatedCostUsd)
    }

    for (const [organizationId, estimatedCostUsd] of byOrganization) {
      const gate = await input.deps.enforceSeoRunEntitlement(organizationId, {
        estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
        consumesAuditAllowance: false
      })

      entitlement.push({ organizationId, estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)), allowed: gate.allowed, blockedReason: gate.blockedReason })

      if (!gate.allowed) reasons.push(`entitlement bloqueado para ${organizationId}: ${gate.blockedReason ?? 'no_entitlement'}`)
    }
  }

  if (reasons.length === 0 && remaining.length === 0) reasons.push('todas las requests del día ya están capturadas (nada que comprar)')

  return { plan, wouldExecute: reasons.length === 0, reasons, legacyUniqueConstraints, alreadyCaptured, remaining, remainingForecastUsd, entitlement }
}

// ─── Construcción del task por familia (byte-idéntico entre fórmulas salvo el flag) ─────────

type ProviderTask = Record<string, unknown>

const buildProviderTask = (cell: EtvShadowCell, etv: EtvMethodologyRequest): { endpoint: string; task: ProviderTask } => {
  const locationCode = Number(cell.locationCode)
  const languageCode = cell.languageCode

  switch (cell.familySlug) {
    case 'domain_rank_overview':
      // Espejo exacto de `captureDomainOverview`.
      return {
        endpoint: DOMAIN_RANK_OVERVIEW_ENDPOINT,
        task: { target: cell.subject, location_code: locationCode, language_code: languageCode, limit: 1, ...etv.requestParams }
      }

    case 'ranked_keywords': {
      if (cell.purpose === 'prospect') {
        // Espejo de `collectProspectMarketEvidence` (sin el `tag` de eco, que no altera la respuesta).
        return {
          endpoint: RANKED_KEYWORDS_ENDPOINT,
          task: {
            target: cell.subject,
            location_code: locationCode,
            language_code: languageCode,
            limit: PROSPECT_RANKED_KEYWORDS_LIMIT,
            item_types: ['organic', 'ai_overview_reference'],
            load_rank_absolute: true,
            ...etv.requestParams
          }
        }
      }

      // Espejo de `captureUrlVisibility` para `kind=domain` (sin filtros de subcarpeta).
      return {
        endpoint: RANKED_KEYWORDS_ENDPOINT,
        task: {
          target: cell.subject,
          location_code: locationCode,
          language_code: languageCode,
          item_types: ['organic', 'paid'],
          limit: cell.rowLimit ?? 100,
          order_by: ['keyword_data.keyword_info.search_volume,desc'],
          ...etv.requestParams
        }
      }
    }

    case 'relevant_pages':
    case 'subdomains':
      // Espejo de `runConcentrationCapture`.
      return {
        endpoint: resolveEtvLabsFamilyBySlug(cell.familySlug).googleEndpoint,
        task: {
          target: cell.subject,
          location_code: locationCode,
          language_code: languageCode,
          item_types: ['organic', 'paid'],
          limit: cell.rowLimit ?? 100,
          order_by: ['metrics.organic.etv,desc'],
          ...etv.requestParams
        }
      }

    case 'historical_rank_overview':
      // Espejo de `backfillDomainRankHistory` (clickstream OFF explícito, como el writer).
      return {
        endpoint: HISTORICAL_RANK_OVERVIEW_ENDPOINT,
        task: {
          target: cell.subject,
          location_code: locationCode,
          language_code: languageCode,
          date_from: `${cell.period?.fromMonth}-01`,
          date_to: `${cell.period?.toMonth}-01`,
          include_clickstream_data: false,
          ...etv.requestParams
        }
      }

    case 'bulk_traffic_estimation':
      // Espejo de `estimateDomainTraffic`.
      return {
        endpoint: BULK_TRAFFIC_ESTIMATION_ENDPOINT,
        task: {
          targets: cell.targets ?? [cell.subject],
          location_code: locationCode,
          language_code: languageCode,
          item_types: ['organic', 'paid'],
          ...etv.requestParams
        }
      }
  }
}

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`

  if (typeof value === 'object' && value !== null) {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

/** sha256 del task SIN `use_improved_etv`: prueba de que las dos fórmulas pidieron lo mismo. */
export const hashProviderTaskWithoutFlag = (task: ProviderTask): string => {
  const withoutFlag: ProviderTask = { ...task }

  delete withoutFlag[ETV_PROVIDER_REQUEST_PARAM]

  return createHash('sha256').update(stableStringify(withoutFlag)).digest('hex')
}

// ─── Persistencia por familia (mismos parsers/writers que producción) ───────────────────────

type ProviderTaskResult = { status_code?: number; result?: unknown[] }

const readTask = (response: DataForSeoSerpResult): ProviderTaskResult => (response.tasks?.[0] ?? {}) as ProviderTaskResult

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505'

const persistCell = async (
  deps: EtvShadowRunnerDeps,
  cell: EtvShadowCell,
  task: ProviderTaskResult,
  etv: EtvMethodologyRequest,
  providerCostUsd: number,
  requestedAt: string
): Promise<Pick<EtvShadowRequestRecord, 'persisted' | 'prospectTraffic'>> => {
  const etvMethodology: PersistedEtvMethodology = toPersistedEtvMethodology(etv)
  const context = { locationCode: cell.locationCode, languageCode: cell.languageCode }

  switch (cell.familySlug) {
    case 'domain_rank_overview': {
      const item = ((task.result?.[0] as { items?: DomainRankOverviewItemRaw[] } | undefined)?.items?.[0] ?? null) as DomainRankOverviewItemRaw | null

      const snapshot = item
        ? parseDomainRankOverviewItem(item, { domain: cell.subject, ...context, etvMethodology })
        : buildNullSnapshot({ domain: cell.subject, ...context, captureDate: null, sourceEndpoint: 'domain_rank_overview', etvMethodology })

      const { rowsWritten } = await deps.persistDomainOverviewSnapshots({ snapshots: [snapshot], capturedByOrganizationId: cell.organizationId, providerCostUsd })

      return { persisted: { table: 'seo_domain_overview_snapshots', rows: rowsWritten, conflict: false } }
    }

    case 'historical_rank_overview': {
      const requestedMonths = cell.period ? monthsBetween(cell.period.fromMonth, cell.period.toMonth) : []
      const items = ((task.result?.[0] as { items?: HistoricalRankOverviewItemRaw[] } | undefined)?.items ?? []) as HistoricalRankOverviewItemRaw[]

      const { snapshots } = projectHistoryItems(items, { domain: cell.subject, ...context, requestedMonths, etvMethodology })
      const { rowsWritten } = await deps.persistDomainOverviewSnapshots({ snapshots, capturedByOrganizationId: cell.organizationId, providerCostUsd })

      return { persisted: { table: 'seo_domain_overview_snapshots', rows: rowsWritten, conflict: false } }
    }

    case 'bulk_traffic_estimation': {
      const items = ((task.result?.[0] as { items?: BulkTrafficItemRaw[] } | undefined)?.items ?? []) as BulkTrafficItemRaw[]
      const parsedByNormalized = new Map<string, SeoDomainOverviewSnapshotInput>()

      for (const item of items) {
        const parsed = parseBulkTrafficItem(item, { ...context, etvMethodology })

        if (parsed) parsedByNormalized.set(parsed.normalizedDomain, parsed)
      }

      // Tres estados (TASK-1661): target sin item ⇒ fila con NULLs, nunca fila ausente.
      const snapshots = (cell.targets ?? [cell.subject]).map(
        target =>
          parsedByNormalized.get(target) ??
          buildNullSnapshot({ domain: target, ...context, captureDate: null, sourceEndpoint: 'bulk_traffic_estimation', etvMethodology })
      )

      const { rowsWritten } = await deps.persistDomainOverviewSnapshots({ snapshots, capturedByOrganizationId: cell.organizationId, providerCostUsd })

      return { persisted: { table: 'seo_domain_overview_snapshots', rows: rowsWritten, conflict: false } }
    }

    case 'ranked_keywords': {
      const items = ((task.result?.[0] as { items?: unknown[] } | undefined)?.items ?? []) as unknown[]

      if (cell.purpose === 'prospect') {
        // NO persiste diagnóstico: sólo deriva la suma orgánica con el derivador productivo.
        const facts = deriveProspectMarketFacts(
          {
            etvMethodology,
            rankedKeywords: { source: 'labs_ranked_keywords', ok: true, costUsd: providerCostUsd, items, errorCode: null },
            competitorsDomain: { source: 'labs_competitors_domain', ok: false, costUsd: 0, items: [], errorCode: 'not_in_shadow' },
            backlinksCompetitors: { source: 'backlinks_competitors', ok: false, costUsd: 0, items: [], errorCode: 'not_in_shadow' },
            domainIntersection: { source: 'backlinks_domain_intersection', ok: false, costUsd: 0, items: [], errorCode: 'not_in_shadow' },
            actualCostUsd: providerCostUsd
          },
          requestedAt
        )

        const traffic = facts.find(fact => fact.kind === 'estimated_monthly_traffic')
        const detail = (traffic?.detail ?? {}) as { sampleRows?: number; rowLimit?: number; truncated?: boolean }

        return {
          persisted: { table: null, rows: 0, conflict: false },
          prospectTraffic: {
            sum: traffic?.magnitude ?? null,
            sampleRows: detail.sampleRows ?? 0,
            rowLimit: detail.rowLimit ?? PROSPECT_RANKED_KEYWORDS_LIMIT,
            truncated: detail.truncated ?? false
          }
        }
      }

      const resolution = resolveVisibilitySubject({ subject: cell.subject, kind: 'domain' })

      if (!resolution.ok) throw new EtvShadowCohortError('Sujeto de visibilidad irresoluble.', { subject: cell.subject, errorCode: resolution.errorCode })

      const result = (task.result?.[0] ?? null) as Parameters<typeof projectRankedKeywordsResult>[0] | null
      const hasData = Boolean(result && (result.metrics?.organic || (result.items?.length ?? 0) > 0))

      const snapshot: SeoUrlVisibilitySnapshotInput =
        result && hasData
          ? projectRankedKeywordsResult(result, { subject: resolution.subject, ...context, etvMethodology }).snapshot
          : buildNullVisibilitySnapshot({
              subjectKind: 'domain',
              normalizedSubject: resolution.subject.normalized,
              rawSubject: cell.subject,
              ...context,
              sourceEndpoint: 'ranked_keywords',
              etvMethodology
            })

      // El enriquecimiento de mercado (`persistKeywordMarketData`) NO se replica: es agnóstico a
      // la fórmula y el shadow sólo escribe el hecho que la lleva.
      const { rowsWritten } = await deps.persistUrlVisibilitySnapshots({ snapshots: [snapshot], capturedByOrganizationId: cell.organizationId, providerCostUsd })

      return { persisted: { table: 'seo_url_visibility_snapshots', rows: rowsWritten, conflict: false } }
    }

    case 'relevant_pages':

    case 'subdomains': {
      const items = ((task.result?.[0] as { items?: Array<RelevantPageItemRaw & SubdomainItemRaw> | null } | undefined)?.items ?? []) as Array<
        RelevantPageItemRaw & SubdomainItemRaw
      >

      const { snapshots } = projectConcentrationItems(items, { sourceEndpoint: cell.familySlug, ...context, etvMethodology })

      const toPersist =
        snapshots.length > 0
          ? snapshots
          : [
              buildNullVisibilitySnapshot({
                subjectKind: 'domain',
                normalizedSubject: cell.subject,
                rawSubject: cell.subject,
                ...context,
                sourceEndpoint: cell.familySlug,
                etvMethodology
              })
            ]

      const { rowsWritten } = await deps.persistUrlVisibilitySnapshots({ snapshots: toPersist, capturedByOrganizationId: cell.organizationId, providerCostUsd })

      return { persisted: { table: 'seo_url_visibility_snapshots', rows: rowsWritten, conflict: false } }
    }
  }
}

// ─── Ejecutor ───────────────────────────────────────────────────────────────────────────────

const newRunId = (): string => `etvshadow-${createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 12)}`

const sanitizeResponse = (response: DataForSeoSerpResult) => ({
  ok: response.ok,
  httpStatus: response.httpStatus,
  endpoint: response.endpoint,
  cost: response.cost,
  latencyMs: response.latencyMs,
  breakerOpen: response.breakerOpen ?? false,
  // `secretSource` no es una credencial, pero tampoco es evidencia del experimento: fuera.
  tasks: response.tasks
})

const pendingRecord = (cellIndex: number, cell: EtvShadowCell, planned: EtvPlannedRequest, status: EtvShadowRequestStatus): EtvShadowRequestRecord => ({
  cellIndex,
  familySlug: cell.familySlug,
  subject: cell.subject,
  locationCode: cell.locationCode,
  languageCode: cell.languageCode,
  purpose: cell.purpose ?? null,
  methodology: planned.methodology,
  requested: null,
  providerEffective: null,
  requestedAt: null,
  taskHashWithoutFlag: null,
  statusCode: null,
  ok: status === 'already_captured',
  status,
  errorCode: null,
  costUsd: 0,
  latencyMs: null,
  persisted: { table: null, rows: 0, conflict: false },
  ...(cell.familySlug === 'historical_rank_overview' ? { historicalBasis: planned.historicalBasis } : {}),
  rawFile: null
})

/**
 * Corre el shadow. Devuelve el summary (y lo escribe en `<artifactDir>/summary.json`). Si el
 * preflight no permite ejecutar, devuelve `executed: false` con razones y NO toca al proveedor.
 */
export const runEtvShadow = async (input: {
  cohort: EtvShadowCohort
  config: EtvEvaluatorConfig
  mode: EtvShadowMode
  now?: Date
  artifactDir: string
  deps?: Partial<EtvShadowRunnerDeps>
}): Promise<EtvShadowResult> => {
  const deps = resolveDeps(input.deps)
  const startedAt = (input.now ?? new Date()).toISOString()
  const runId = newRunId()

  const preflight = await preflightEtvShadow({ cohort: input.cohort, config: input.config, mode: input.mode, now: input.now, deps })

  const finish = async (outcome: Pick<EtvShadowSummary, 'executed' | 'reasons' | 'totals' | 'requests'>): Promise<EtvShadowResult> => {
    const summary: EtvShadowSummary = {
      runId,
      cohortId: input.cohort.id,
      mode: input.mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      policyVersion: ETV_METHODOLOGY_POLICY_VERSION,
      caps: { maxRequests: input.config.maxRequests, budgetUsd: input.config.budgetUsd },
      ...outcome
    }

    // El plan viaja en el resultado en memoria (para el CLI); el summary.json sólo lleva evidencia.
    await deps.writeArtifact('summary.json', JSON.stringify(summary, null, 2))

    return { ...summary, plan: preflight.plan }
  }

  if (!preflight.wouldExecute) {
    return finish({
      executed: false,
      reasons: preflight.reasons,
      totals: { requests: 0, costUsd: 0, forecastUsd: preflight.remainingForecastUsd, aborted: false, abortReason: null },
      requests: []
    })
  }

  const records: EtvShadowRequestRecord[] = []
  const alreadyCaptured = new Set(preflight.alreadyCaptured.map(entry => `${entry.cellIndex}:${entry.methodology}`))
  const ordered = orderedPlannedRequests(preflight.plan, input.cohort.cells)

  let requests = 0
  let costUsd = 0
  let abortReason: EtvShadowAbortReason | null = null
  let abortDetail: string | null = null

  // Fallos por celda (status_code != 20000) para decidir el aborto "ambas fórmulas".
  const failedByCell = new Map<number, number>()

  for (let position = 0; position < ordered.length; position += 1) {
    const { cellIndex, planned } = ordered[position]
    const cell = input.cohort.cells[cellIndex]

    if (abortReason) {
      records.push(pendingRecord(cellIndex, cell, planned, 'skipped_after_abort'))
      continue
    }

    if (planned.blockedReason !== null) continue

    if (alreadyCaptured.has(`${cellIndex}:${planned.methodology}`)) {
      records.push(pendingRecord(cellIndex, cell, planned, 'already_captured'))
      continue
    }

    // Parada dura ANTES de la llamada: cap de requests y tope USD (real acumulado + estimado).
    if (requests >= input.config.maxRequests) {
      abortReason = 'max_requests_cap'
      abortDetail = `requests ${requests} ≥ máximo ${input.config.maxRequests}`
      records.push({ ...pendingRecord(cellIndex, cell, planned, 'skipped_after_abort'), errorCode: abortReason })
      continue
    }

    if (Number((costUsd + planned.estimatedCostUsd).toFixed(6)) > input.config.budgetUsd) {
      abortReason = 'budget_cap'
      abortDetail = `USD ${costUsd.toFixed(6)} + estimado ${planned.estimatedCostUsd} > tope ${input.config.budgetUsd}`
      records.push({ ...pendingRecord(cellIndex, cell, planned, 'skipped_after_abort'), errorCode: abortReason })
      continue
    }

    const record = pendingRecord(cellIndex, cell, planned, 'executed')

    let etv: EtvMethodologyRequest

    try {
      const family = resolveEtvLabsFamilyBySlug(cell.familySlug)

      // La fórmula se fija POR REQUEST con el instante real de la llamada (fail-closed).
      etv = buildEtvMethodologyRequest({ endpoint: family.googleEndpoint, methodologyOverride: planned.methodology, now: input.now ?? new Date() })
    } catch (error) {
      if (error instanceof EtvMethodologyPolicyError) {
        abortReason = 'policy_error'
        abortDetail = `${error.code}: ${error.message}`
        records.push({ ...record, status: 'skipped_after_abort', ok: false, errorCode: error.code })
        continue
      }

      throw error
    }

    record.requested = etv.requested
    record.providerEffective = etv.providerEffective
    record.requestedAt = etv.requestedAt

    // Antes del corte, lo solicitado ES lo efectivo; cualquier divergencia es drift contractual.
    if (etv.requested !== planned.methodology || etv.providerEffective !== etv.requested) {
      abortReason = 'provider_effective_drift'
      abortDetail = `requested=${etv.requested} providerEffective=${etv.providerEffective} planned=${planned.methodology}`
      records.push({ ...record, status: 'skipped_after_abort', ok: false, errorCode: abortReason })
      continue
    }

    const { endpoint, task } = buildProviderTask(cell, etv)

    record.taskHashWithoutFlag = hashProviderTaskWithoutFlag(task)

    let response: DataForSeoSerpResult

    try {
      response = await deps.postDataForSeoTask({ family: 'labs', consumer: 'seo', endpoint, organizationId: cell.organizationId, tasks: [task] })
    } catch (error) {
      abortReason = 'transport_error'
      abortDetail = error instanceof Error ? error.name : 'unknown'
      records.push({ ...record, ok: false, errorCode: 'transport_error' })
      continue
    }

    if (response.breakerOpen) {
      // No se llamó al proveedor: no cuenta como request ni como gasto.
      abortReason = 'breaker_open'
      abortDetail = 'breaker de la familia labs abierto'
      records.push({ ...record, ok: false, errorCode: 'breaker_open' })
      continue
    }

    requests += 1

    const providerCostUsd = response.cost ?? 0

    costUsd = Number((costUsd + providerCostUsd).toFixed(6))
    record.costUsd = providerCostUsd
    record.latencyMs = response.latencyMs
    record.rawFile = rawArtifactPath(cellIndex, planned.methodology)

    await deps.writeArtifact(
      record.rawFile,
      JSON.stringify({ runId, cellIndex, cell, methodology: planned.methodology, requestedAt: etv.requestedAt, endpoint, task, response: sanitizeResponse(response) }, null, 2)
    )

    const providerTask = readTask(response)

    record.statusCode = providerTask.status_code ?? null

    if (!response.ok || providerTask.status_code !== 20000) {
      record.ok = false
      record.errorCode = `task_status_${String(providerTask.status_code ?? response.httpStatus)}`
      records.push(record)

      const failures = (failedByCell.get(cellIndex) ?? 0) + 1

      failedByCell.set(cellIndex, failures)

      // Una fórmula caída invalida la celda para calibración (queda como evidencia); las DOS
      // caídas dicen que el proveedor no está: se aborta la corrida completa.
      if (failures >= EXECUTION_ORDER.length) {
        abortReason = 'provider_status_both_formulas'
        abortDetail = `celda ${cellIndex} sin 20000 en ambas fórmulas`
      }

      continue
    }

    try {
      const persisted = await persistCell(deps, cell, providerTask, etv, providerCostUsd, etv.requestedAt)

      record.ok = true
      record.persisted = persisted.persisted
      if (persisted.prospectTraffic) record.prospectTraffic = persisted.prospectTraffic
      records.push(record)
    } catch (error) {
      // El crudo ya quedó en el artefacto: la evidencia pagada no se pierde. Una colisión de
      // UNIQUE (23505) delata el contract no aplicado; cualquier otro error también aborta.
      const conflict = isUniqueViolation(error)

      abortReason = conflict ? 'persist_conflict' : 'persist_error'
      abortDetail = error instanceof Error ? error.name : 'unknown'
      records.push({ ...record, ok: false, errorCode: abortReason, persisted: { table: null, rows: 0, conflict } })
    }
  }

  return finish({
    executed: true,
    reasons: abortReason ? [`abortada: ${abortReason}${abortDetail ? ` (${abortDetail})` : ''}`] : [],
    totals: { requests, costUsd, forecastUsd: preflight.remainingForecastUsd, aborted: abortReason !== null, abortReason },
    requests: records
  })
}
