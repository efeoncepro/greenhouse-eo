/**
 * TASK-1664 — Reader único del keyword discovery (app, Nexa, lane ecosystem y MCP).
 *
 * Compone en memoria las TRES lentes de un candidato, sin mezclarlas jamás:
 * - **procedencia** (esta tabla): run, seed, endpoint, rank, `captured_at`;
 * - **mercado estimado ◑** (store de TASK-1661, por `(keyword, país, idioma)`): volumen,
 *   dificultad, intención, `core_keyword`, barrera de enlaces — vía `readKeywordMarketData`,
 *   nunca SQL directo a esa tabla;
 * - **demanda medida ●** (GSC del propio Space): impresiones + posición ponderada, como campo
 *   SEPARADO (`measuredGsc`). Nunca se rellena `searchVolume` desde GSC ni `position` desde Labs.
 *
 * La ausencia de mercado no elimina la fila ni la convierte en cero: viaja como `null` +
 * `marketAvailability`.
 *
 * 🔴 **Cardinalidad (TASK-1694): un candidato es UNA KEYWORD NORMALIZADA, no una fila de
 * procedencia.** La keyword es la unidad que se puntúa, la que recibe una `evidence_ref` y la
 * que un humano decide; que dos métodos la hayan encontrado viaja como `provenance[]` +
 * `candidateIds[]`, no como dos renglones. `totalCandidates` cuenta keywords distintas. Ningún
 * consumer aguas abajo —la cola priorizada de TASK-1700, Nexa, MCP, el lane ecosystem— puede
 * tratar una procedencia como candidato propio: en un aggregate append-only eso persistiría la
 * misma decisión hasta cuatro veces, con cuatro scores y cuatro compromisos de gasto sobre una
 * sola intención.
 */

import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  MAX_GSC_SEED_WINDOW_DAYS,
  SEO_DISCOVERY_HISTORICAL_VOLUME_POLICY,
  SEO_DISCOVERY_MAX_DIFFICULTY_IGNORED,
  isDiscoveryVolumePolicy,
  type SeoDiscoveryActionKind,
  type SeoDiscoveryErrorCode,
  type SeoDiscoveryIgnoredFilter,
  type SeoDiscoveryLinkBarrierFilterLevel,
  type SeoDiscoveryMethod,
  type SeoDiscoveryRunStatus,
  type SeoDiscoverySourceKind,
  type SeoDiscoveryVolumePolicy
} from './contracts'
import type { ResolvedDiscoverySeed } from './queue'
import type { SeoLinkBarrierLevel } from '../contracts'
import { normalizeMarketKeyword, readKeywordMarketData, type SeoSearchIntent } from '../keyword-market-data'

// ─── DTOs ───────────────────────────────────────────────────────────────────────────

export interface SeoDiscoveryRunView {
  runId: string
  seoTargetId: string
  sourceKind: SeoDiscoverySourceKind
  status: SeoDiscoveryRunStatus
  locationCode: string
  languageCode: string
  seeds: ResolvedDiscoverySeed[]
  /**
   * Métodos con los que se compró, con la política de inclusión de ESA corrida (TASK-1694).
   * Una corrida anterior sin el campo se lee con el default HISTÓRICO por método: el reader
   * reproduce lo que pasó, no lo que pasaría hoy.
   */
  methods: Array<{ method: SeoDiscoveryMethod; resultsPerCall: number; volumePolicy: SeoDiscoveryVolumePolicy }>
  estimatedCostUsd: number
  actualCostUsd: number | null
  providerCalls: number
  candidateCount: number
  errorCode: string | null
  createdBy: string
  requestedAt: string
  startedAt: string | null
  completedAt: string | null
}

/**
 * UNA fila de procedencia: el hecho de que ESTE endpoint encontró la keyword en ESTA posición
 * desde ESTAS seeds. Se conserva íntegra — el colapso es de presentación, no de datos.
 */
export interface SeoDiscoveryCandidateProvenance {
  candidateId: string
  sourceEndpoint: SeoDiscoveryMethod
  sourceRank: number | null
  seedKeywords: string[]
  capturedAt: string
}

/**
 * Conflicto de cluster: `conflict` cuando otra keyword VIGENTE del target comparte el
 * `coreKeyword` del candidato; `clear` cuando se pudo descartar; `unknown` cuando no se pudo
 * saber. Los tres estados son distinguibles a propósito — no saber si hay conflicto y saber que
 * no lo hay son hechos distintos, y colapsarlos convertiría un hueco en una vía libre.
 */
export interface SeoDiscoveryClusterConflict {
  status: 'conflict' | 'clear' | 'unknown'
  coreKeyword: string | null
  /** Hasta 5 nombres contra los que choca, para que el humano vea el choque sin adivinarlo. */
  trackedMembers: string[]
  /** Total real de miembros en conflicto (puede exceder los 5 nombrados). */
  trackedMemberCount: number
}

export interface SeoDiscoveryCandidateView {
  /** Procedencia REPRESENTATIVA (menor `sourceRank`, desempate `candidateId` asc). */
  candidateId: string
  /**
   * TODAS las filas de procedencia fusionadas, en orden determinista. Es lo que hace seguro el
   * colapso: las acciones se siguen registrando por fila y el bridge AEO sigue seleccionando
   * por id, así que un consumer debe poder alcanzar cada procedencia de la keyword que el
   * operador decidió.
   */
  candidateIds: string[]
  provenance: SeoDiscoveryCandidateProvenance[]
  runId: string
  keyword: string
  normalizedKeyword: string
  /** Escalares de la procedencia REPRESENTATIVA; el conjunto completo vive en `provenance`. */
  sourceEndpoint: SeoDiscoveryMethod
  sourceRank: number | null
  seedKeywords: string[]
  capturedAt: string
  /** Lente estimada de mercado (◑). Fijo por procedencia del candidato. */
  source: 'dataforseo_labs'
  measurementKind: 'estimated_market'
  displayMarker: '◑'
  providerLastUpdatedAt: string | null
  searchVolume: number | null
  difficulty: number | null
  /** ⚠️ Competencia PAGA (Google Ads) 0–1. NUNCA renombrarla a dificultad. */
  competition: number | null
  /** Nivel de competencia paga del proveedor (low/medium/high) — misma advertencia. */
  competitionLevel: 'low' | 'medium' | 'high' | null
  /** CPC estimado (USD) — señal comercial de la lente ◑, ya pagada en la misma respuesta. */
  cpcUsd: number | null
  intent: SeoSearchIntent | null
  coreKeyword: string | null
  linkBarrier: SeoLinkBarrierLevel | null
  /** Demanda MEDIDA del propio Space (●), como lente separada. */
  measuredGsc: { impressions: number; position: number | null; displayMarker: '●' } | null
  alreadyTracked: boolean
  /**
   * TASK-1694 — ¿el `coreKeyword` de este candidato ya lo cubre una keyword vigente del target?
   *
   * Señal SEPARADA de `alreadyTracked` y nunca derivada de él: responden preguntas distintas.
   * `alreadyTracked` es identidad exacta ("esta misma keyword ya se sigue"); `clusterConflict`
   * es intención ("otra keyword ya apunta a lo mismo"). Declarar objetivo sobre dos miembros del
   * mismo cluster los diluye — la acción correcta es consolidar, no sumar una segunda apuesta
   * con gasto recurrente propio. Es ADVERTENCIA, jamás bloqueo: nombra contra qué choca y deja
   * juzgar al humano.
   */
  clusterConflict: SeoDiscoveryClusterConflict
  latestAction: { kind: SeoDiscoveryActionKind; actor: string; at: string } | null
  /** `true` si la keyword coincide exactamente con una seed de la corrida. */
  matchesSeed: boolean
}

export interface ReadKeywordDiscoveryInput {
  organizationId: string
  seoTargetId?: string
  runId?: string
  status?: SeoDiscoveryRunStatus
  sourceEndpoint?: SeoDiscoveryMethod
  /** Filtro de texto sobre la keyword del candidato (contains, case-insensitive). */
  query?: string
  intent?: SeoSearchIntent
  minSearchVolume?: number
  /**
   * ⚠️ DEPRECADO Y NO DECISIONAL (TASK-1694). Se acepta para no romper a los consumers que ya
   * lo aprendieron, pero NO filtra: `keyword_difficulty` colapsa a 0 en SERPs es-LATAM
   * (ISSUE-152), así que filtrar por él devuelve keywords de barrera Alta a quien creyó pedir
   * lo fácil. Mandarlo aparece declarado en `ignoredFilters`. El filtro canónico de dificultad
   * es {@link ReadKeywordDiscoveryInput.maxLinkBarrier}.
   */
  maxDifficulty?: number
  /**
   * Barrera de enlaces MÁXIMA aceptada (`low < medium < high`), derivada por
   * `deriveLinkBarrier` sobre el perfil real de enlaces del top-10 — la contrapartida canónica
   * de `maxDifficulty`. Un valor fuera del vocabulario cerrado se ignora y se declara.
   */
  maxLinkBarrier?: SeoDiscoveryLinkBarrierFilterLevel
  /**
   * Incluye en el resultado de un filtro de barrera los candidatos SIN dato medido
   * (`unknown`, o sin fila de mercado). Default `false`: "Sin dato" no es "Baja", y dejarlo
   * pasar por omisión afirmaría una oportunidad que nadie midió.
   */
  includeUnknownBarrier?: boolean
  /**
   * TASK-1666 — selección explícita de candidatos (requiere `runId`). SQL-side y tenant-safe:
   * un ID ajeno simplemente no aparece — el caller decide si la ausencia es error.
   */
  candidateIds?: readonly string[]
  /** Excluye candidatos ya seguidos por el target (para revisar sólo lo accionable). */
  excludeTracked?: boolean
  limit?: number
  cursor?: string | null
}

export type ReadKeywordDiscoveryResult =
  | {
      ok: true
      runs: SeoDiscoveryRunView[]
      /** Presente sólo cuando se pidió `runId`. */
      run: SeoDiscoveryRunView | null
      candidates: SeoDiscoveryCandidateView[]
      /** Keywords normalizadas DISTINTAS (TASK-1694), no filas de procedencia. */
      totalCandidates: number
      nextCursor: string | null
      marketAvailability: 'available' | 'unavailable'
      /** Fecha máxima de captura de mercado disponible para las keywords servidas. */
      marketFreshness: string | null
      /** Disclosure fijo: seguir una keyword compromete gasto recurrente (rank capture diario). */
      trackingCostDisclosure: string
      /**
       * Filtros que el caller mandó y el contrato NO aplicó, con su razón y su reemplazo.
       * Siempre presente (`[]` cuando no aplica): un filtro ignorado en silencio es peor que
       * uno rechazado, porque el caller cree que decidió con menos ruido del que recibió.
       */
      ignoredFilters: SeoDiscoveryIgnoredFilter[]
    }
  | { ok: false; errorCode: SeoDiscoveryErrorCode }

/** Techo server-side de candidatos por página (la spec fija 200). */
export const MAX_DISCOVERY_READ_LIMIT = 200

/**
 * Tamaño de página por defecto del reader y **SSOT del tamaño que la UI pagina**.
 *
 * TASK-1693 lo exporta a propósito: la page lo pasa explícito y el cliente pide las páginas
 * siguientes con el MISMO número, así que el conteo que anuncia el botón coincide con lo que
 * llega. Con un literal repetido en la vista, subir este default aquí dejaría el botón
 * prometiendo una cifra vieja, en silencio.
 */
export const DEFAULT_DISCOVERY_READ_LIMIT = 50

const RUNS_LIST_LIMIT = 20

export const TRACKING_COST_DISCLOSURE =
  'Seguir una keyword compromete gasto recurrente: el rank capture diario le paga al proveedor por cada keyword vigente hasta dejar de seguirla.'

/** Orden de la barrera de enlaces para el desempate: low < medium < high < unknown (Sin dato al final). */
const LINK_BARRIER_SORT: Record<SeoLinkBarrierLevel, number> = { low: 0, medium: 1, high: 2, unknown: 3 }

// ─── Row shapes ─────────────────────────────────────────────────────────────────────

type RunRow = {
  run_id: string
  seo_target_id: string
  source_kind: string
  status: string
  location_code: string
  language_code: string
  seed_inputs_json: unknown
  methods_json: unknown
  estimated_cost_usd: string
  actual_cost_usd: string | null
  provider_calls: number
  candidate_count: number
  error_code: string | null
  created_by: string
  requested_at: Date
  started_at: Date | null
  completed_at: Date | null
}

const toRunView = (row: RunRow): SeoDiscoveryRunView => {
  const seedInputs =
    typeof row.seed_inputs_json === 'object' && row.seed_inputs_json !== null
      ? (row.seed_inputs_json as { seeds?: ResolvedDiscoverySeed[] })
      : {}

  const rawMethods = Array.isArray(row.methods_json)
    ? (row.methods_json as Array<{ method: SeoDiscoveryMethod; resultsPerCall: number; volumePolicy?: unknown }>)
    : []

  const methods = rawMethods.map(spec => ({
    method: spec.method,
    resultsPerCall: spec.resultsPerCall,
    volumePolicy: isDiscoveryVolumePolicy(spec.volumePolicy)
      ? spec.volumePolicy
      : (SEO_DISCOVERY_HISTORICAL_VOLUME_POLICY[spec.method] ?? 'all')
  }))

  return {
    runId: row.run_id,
    seoTargetId: row.seo_target_id,
    sourceKind: row.source_kind as SeoDiscoverySourceKind,
    status: row.status as SeoDiscoveryRunStatus,
    locationCode: row.location_code,
    languageCode: row.language_code,
    seeds: Array.isArray(seedInputs.seeds) ? seedInputs.seeds : [],
    methods,
    estimatedCostUsd: Number(row.estimated_cost_usd),
    actualCostUsd: row.actual_cost_usd === null ? null : Number(row.actual_cost_usd),
    providerCalls: row.provider_calls,
    candidateCount: row.candidate_count,
    errorCode: row.error_code,
    createdBy: row.created_by,
    requestedAt: row.requested_at.toISOString(),
    startedAt: row.started_at ? row.started_at.toISOString() : null,
    completedAt: row.completed_at ? row.completed_at.toISOString() : null
  }
}

// ─── Reader ─────────────────────────────────────────────────────────────────────────

export const readKeywordDiscovery = async (
  input: ReadKeywordDiscoveryInput
): Promise<ReadKeywordDiscoveryResult> => {
  const limit = Math.min(MAX_DISCOVERY_READ_LIMIT, Math.max(1, Math.floor(input.limit ?? DEFAULT_DISCOVERY_READ_LIMIT)))
  const offset = input.cursor ? Math.max(0, Number.parseInt(input.cursor, 10) || 0) : 0

  // Se declara sólo si el caller LO MANDÓ: anunciar un filtro ignorado que nadie pidió sería
  // ruido, y la lista existe para que quien se equivocó pueda corregir.
  const ignoredFilters: SeoDiscoveryIgnoredFilter[] =
    typeof input.maxDifficulty === 'number' ? [SEO_DISCOVERY_MAX_DIFFICULTY_IGNORED] : []

  // Historial de corridas (tenant-safe SIEMPRE por org; target opcional).
  const runRows = await runGreenhousePostgresQuery<RunRow>(
    `SELECT run_id, seo_target_id, source_kind, status, location_code, language_code,
            seed_inputs_json, methods_json, estimated_cost_usd::text, actual_cost_usd::text,
            provider_calls, candidate_count, error_code, created_by,
            requested_at, started_at, completed_at
       FROM greenhouse_growth.seo_keyword_discovery_runs
      WHERE organization_id = $1
        AND ($2::text IS NULL OR seo_target_id = $2)
        AND ($3::text IS NULL OR run_id = $3)
        AND ($4::text IS NULL OR status = $4)
      ORDER BY requested_at DESC
      LIMIT $5`,
    [input.organizationId, input.seoTargetId ?? null, input.runId ?? null, input.status ?? null, RUNS_LIST_LIMIT]
  )

  if (input.runId && runRows.length === 0) {
    // Anti-oracle: un run de otra org "no existe" para este caller.
    return { ok: false, errorCode: 'run_not_found' }
  }

  const runs = runRows.map(toRunView)
  const run = input.runId ? (runs[0] ?? null) : null

  if (!input.runId) {
    return {
      ok: true,
      runs,
      run: null,
      candidates: [],
      totalCandidates: 0,
      nextCursor: null,
      marketAvailability: 'unavailable',
      marketFreshness: null,
      trackingCostDisclosure: TRACKING_COST_DISCLOSURE,
      ignoredFilters
    }
  }

  // Candidatos de la corrida (≤500 por contrato): se leen completos, se componen en memoria
  // y la paginación es sobre el orden compuesto — con este techo es correcto y honesto.
  const candidateRows = await runGreenhousePostgresQuery<{
    candidate_id: string
    run_id: string
    keyword: string
    normalized_keyword: string
    seed_keywords_json: unknown
    source_endpoint: string
    source_rank: number | null
    captured_at: Date
  }>(
    `SELECT candidate_id, run_id, keyword, normalized_keyword, seed_keywords_json,
            source_endpoint, source_rank, captured_at
       FROM greenhouse_growth.seo_keyword_discovery_candidates
      WHERE run_id = $1
        AND organization_id = $2
        AND ($3::text IS NULL OR source_endpoint = $3)
        AND ($4::text IS NULL OR keyword ILIKE '%' || $4 || '%')
        AND ($5::text[] IS NULL OR candidate_id = ANY($5::text[]))
      ORDER BY captured_at DESC, candidate_id ASC`,
    [
      input.runId,
      input.organizationId,
      input.sourceEndpoint ?? null,
      input.query?.trim() || null,
      input.candidateIds && input.candidateIds.length > 0 ? [...input.candidateIds] : null
    ]
  )

  const normalizedKeywords = [...new Set(candidateRows.map(row => row.normalized_keyword))]

  const runView = run as SeoDiscoveryRunView

  // Lente de mercado (◑) por el reader canónico del store 1661 — jamás SQL directo.
  const market = await readKeywordMarketData({
    keywords: normalizedKeywords,
    locationCode: runView.locationCode,
    languageCode: runView.languageCode
  })

  // Lente medida (●): demanda GSC del propio Space, ventana de 28 días.
  const gscRows =
    normalizedKeywords.length === 0
      ? []
      : await runGreenhousePostgresQuery<{ query: string; impressions: string; weighted_position: string | null }>(
          `SELECT query,
                  SUM(impressions)::text AS impressions,
                  (SUM(position * impressions) / NULLIF(SUM(impressions), 0))::text AS weighted_position
             FROM greenhouse_growth.seo_gsc_daily
            WHERE organization_id = $1
              AND capture_date >= (CURRENT_DATE - $2::int)
              AND lower(query) = ANY($3::text[])
            GROUP BY query`,
          [input.organizationId, MAX_GSC_SEED_WINDOW_DAYS, normalizedKeywords]
        )

  const gscByKeyword = new Map<string, { impressions: number; position: number | null }>()

  for (const row of gscRows) {
    gscByKeyword.set(normalizeMarketKeyword(row.query), {
      impressions: Number(row.impressions),
      position: row.weighted_position === null ? null : Number(row.weighted_position)
    })
  }

  // Estado de tracking vigente del target (para `alreadyTracked`; NUNCA muta nada).
  const trackedRows = await runGreenhousePostgresQuery<{ keyword: string }>(
    `SELECT DISTINCT m.keyword
       FROM greenhouse_growth.seo_keyword_set_members m
       JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
      WHERE s.seo_target_id = $1
        AND m.effective_to IS NULL`,
    [runView.seoTargetId]
  )

  const trackedSet = new Set(trackedRows.map(row => normalizeMarketKeyword(row.keyword)))

  // ── Conflicto de cluster (TASK-1694) ─────────────────────────────────────────────
  //
  // Se resuelve con UNA lectura más del store de mercado de TASK-1661 sobre el set seguido —
  // acotado por el techo gobernado de keywords por target— y CERO llamadas al proveedor. Es una
  // llamada separada de la de candidatos a propósito: fusionarlas contaminaría
  // `marketAvailability`/`marketFreshness`, que declaran la frescura de lo que se está SIRVIENDO.
  const trackedMarket =
    trackedSet.size === 0
      ? null
      : await readKeywordMarketData({
          keywords: [...trackedSet],
          locationCode: runView.locationCode,
          languageCode: runView.languageCode
        })

  /**
   * Core EFECTIVO de una keyword: el `core_keyword` del proveedor, o la keyword misma cuando
   * viene `NULL`.
   *
   * 🔴 `core_keyword` identifica la CANÓNICA del clúster de sinónimos, así que el proveedor no
   * lo emite cuando la keyword YA ES la canónica: medido contra el store real (2026-08-28), de
   * 923 filas hay 527 con `core` nulo, 396 apuntando a OTRA keyword y **cero** apuntando a sí
   * mismas. Tratar el `NULL` como "no se sabe" perdería justo la colisión más probable —la de un
   * candidato variante contra la canónica que el target ya sigue— y la reportaría como `unknown`.
   */
  const effectiveCore = (normalizedKeyword: string, coreKeyword: string | null) => coreKeyword ?? normalizedKeyword

  /** Core efectivo → keywords vigentes del target que lo comparten. */
  const trackedByCore = new Map<string, string[]>()
  let unresolvedTrackedKeywords = 0

  for (const tracked of trackedSet) {
    const datum = trackedMarket?.byKeyword.get(tracked) ?? null

    if (!datum) {
      // SIN FILA de mercado es el único estado ciego: nunca preguntamos por esta keyword, así
      // que podría ser la canónica del clúster del candidato y no hay cómo saberlo. Una fila CON
      // `core` nulo no es ciega — es la afirmación de que la keyword es su propia canónica.
      unresolvedTrackedKeywords += 1

      continue
    }

    const core = effectiveCore(tracked, datum.coreKeyword)
    const members = trackedByCore.get(core)

    if (members) members.push(tracked)
    else trackedByCore.set(core, [tracked])
  }

  const MAX_NAMED_CLUSTER_MEMBERS = 5

  const resolveClusterConflict = (
    normalizedKeyword: string,
    coreKeyword: string | null,
    hasMarketRow: boolean
  ): SeoDiscoveryClusterConflict => {
    // Sin nada seguido no hay contra qué canibalizar. Es un hecho POSITIVO —el set está vacío—,
    // no una ausencia de dato, así que se afirma en vez de degradarse a `unknown`.
    if (trackedSet.size === 0) {
      return { status: 'clear', coreKeyword, trackedMembers: [], trackedMemberCount: 0 }
    }

    const core = effectiveCore(normalizedKeyword, coreKeyword)

    const members = (hasMarketRow ? (trackedByCore.get(core) ?? []) : []).filter(
      tracked => tracked !== normalizedKeyword
    )

    // Encontrar un choque es un hecho positivo: vale aunque la cobertura del set sea parcial.
    if (members.length > 0) {
      return {
        status: 'conflict',
        coreKeyword,
        trackedMembers: members.slice(0, MAX_NAMED_CLUSTER_MEMBERS),
        trackedMemberCount: members.length
      }
    }

    // No haberlo encontrado sólo vale si se pudo mirar TODO. Sin fila de mercado del candidato,
    // o con alguna keyword seguida sin fila, el conflicto no está descartado — está sin medir, y
    // `clear` ahí sería afirmar vía libre sobre un hueco.
    if (!hasMarketRow || unresolvedTrackedKeywords > 0) {
      return { status: 'unknown', coreKeyword, trackedMembers: [], trackedMemberCount: 0 }
    }

    return { status: 'clear', coreKeyword, trackedMembers: [], trackedMemberCount: 0 }
  }

  // Última acción por candidato (la decisión pendiente ordena primero).
  const candidateIds = candidateRows.map(row => row.candidate_id)

  const actionRows =
    candidateIds.length === 0
      ? []
      : await runGreenhousePostgresQuery<{
          candidate_id: string
          action_kind: string
          actor: string
          created_at: Date
        }>(
          `SELECT DISTINCT ON (candidate_id) candidate_id, action_kind, actor, created_at
             FROM greenhouse_growth.seo_keyword_discovery_actions
            WHERE candidate_id = ANY($1::text[])
            ORDER BY candidate_id, created_at DESC`,
          [candidateIds]
        )

  const actionByCandidate = new Map(actionRows.map(row => [row.candidate_id, row]))

  const seedSet = new Set(runView.seeds.map(seed => seed.normalizedKeyword))

  // ── Colapso por keyword normalizada (TASK-1694) ──────────────────────────────────
  //
  // 🔴 La unidad de DECISIÓN es la keyword, no la fila de procedencia. Que dos métodos la hayan
  // encontrado es un hecho de cómo la conocimos, no dos oportunidades: servirla como dos
  // renglones da dos estados, dos `latestAction` y dos CTA de gasto recurrente sobre una sola
  // intención — y aguas abajo, en un aggregate append-only (TASK-1700), congela esa duplicación
  // con dos scores y dos compromisos. La cardinalidad es contrato del reader, no convención de
  // la UI. La procedencia se conserva íntegra en `provenance` y la fila en base no se toca.
  const byNormalizedKeyword = new Map<string, typeof candidateRows>()

  for (const row of candidateRows) {
    const group = byNormalizedKeyword.get(row.normalized_keyword)

    if (group) group.push(row)
    else byNormalizedKeyword.set(row.normalized_keyword, [row])
  }

  // Orden total explícito: sin él la paginación por offset se vuelve inestable entre páginas
  // (una keyword podría aparecer en dos, o en ninguna). `sourceRank` nulo va al final.
  const provenanceOrder = (a: (typeof candidateRows)[number], b: (typeof candidateRows)[number]) => {
    const rankA = a.source_rank ?? Number.POSITIVE_INFINITY
    const rankB = b.source_rank ?? Number.POSITIVE_INFINITY

    if (rankA !== rankB) return rankA - rankB

    return a.candidate_id < b.candidate_id ? -1 : 1
  }

  let candidates: SeoDiscoveryCandidateView[] = [...byNormalizedKeyword.values()].map(group => {
    const provenanceRows = [...group].sort(provenanceOrder)
    const row = provenanceRows[0]

    const datum = market.byKeyword.get(row.normalized_keyword) ?? null
    const gsc = gscByKeyword.get(row.normalized_keyword) ?? null

    // `latestAction` = la más reciente entre TODAS las filas fusionadas: el reader sigue siendo
    // la autoridad de "esta keyword ya se decidió" aunque la acción se haya registrado sobre
    // una sola de sus procedencias.
    const action = provenanceRows
      .map(candidate => actionByCandidate.get(candidate.candidate_id) ?? null)
      .reduce<(typeof actionRows)[number] | null>((latest, current) => {
        if (!current) return latest
        if (!latest) return current

        if (current.created_at.getTime() !== latest.created_at.getTime()) {
          return current.created_at > latest.created_at ? current : latest
        }

        // Empate exacto de timestamp: desempate estable por id, jamás por orden de llegada.
        return current.candidate_id < latest.candidate_id ? current : latest
      }, null)

    return {
      candidateId: row.candidate_id,
      candidateIds: provenanceRows.map(candidate => candidate.candidate_id),
      provenance: provenanceRows.map(candidate => ({
        candidateId: candidate.candidate_id,
        sourceEndpoint: candidate.source_endpoint as SeoDiscoveryMethod,
        sourceRank: candidate.source_rank,
        seedKeywords: Array.isArray(candidate.seed_keywords_json) ? (candidate.seed_keywords_json as string[]) : [],
        capturedAt: candidate.captured_at.toISOString()
      })),
      runId: row.run_id,
      keyword: row.keyword,
      normalizedKeyword: row.normalized_keyword,
      sourceEndpoint: row.source_endpoint as SeoDiscoveryMethod,
      sourceRank: row.source_rank,
      seedKeywords: Array.isArray(row.seed_keywords_json) ? (row.seed_keywords_json as string[]) : [],
      capturedAt: row.captured_at.toISOString(),
      source: 'dataforseo_labs',
      measurementKind: 'estimated_market',
      displayMarker: '◑',
      providerLastUpdatedAt: datum?.providerLastUpdatedAt ?? null,
      searchVolume: datum?.searchVolume ?? null,
      difficulty: datum?.keywordDifficulty ?? null,
      competition: datum?.competition ?? null,
      competitionLevel: datum?.competitionLevel ?? null,
      cpcUsd: datum?.cpcUsd ?? null,
      intent: datum?.searchIntent ?? null,
      coreKeyword: datum?.coreKeyword ?? null,
      linkBarrier: market.linkBarrierByKeyword.get(row.normalized_keyword) ?? null,
      measuredGsc: gsc ? { impressions: gsc.impressions, position: gsc.position, displayMarker: '●' } : null,
      alreadyTracked: trackedSet.has(row.normalized_keyword),
      clusterConflict: resolveClusterConflict(row.normalized_keyword, datum?.coreKeyword ?? null, datum !== null),
      latestAction: action
        ? { kind: action.action_kind as SeoDiscoveryActionKind, actor: action.actor, at: action.created_at.toISOString() }
        : null,
      matchesSeed: seedSet.has(row.normalized_keyword)
    }
  })

  // Filtros sobre la lente de mercado: la AUSENCIA del dato no excluye la fila cuando el
  // filtro no aplica a esa dimensión, pero un filtro explícito sí exige el dato presente.
  if (input.intent) candidates = candidates.filter(candidate => candidate.intent === input.intent)

  if (typeof input.minSearchVolume === 'number') {
    candidates = candidates.filter(
      candidate => candidate.searchVolume !== null && candidate.searchVolume >= (input.minSearchVolume as number)
    )
  }

  // ⚠️ `maxDifficulty` NO se aplica (TASK-1694): se acepta, se ignora y se declara en
  // `ignoredFilters`. Filtrar por `keyword_difficulty` en es-LATAM entrega barrera Alta a quien
  // pidió lo fácil (ISSUE-152). El filtro canónico es la barrera de enlaces.
  if (input.maxLinkBarrier) {
    const ceiling = LINK_BARRIER_SORT[input.maxLinkBarrier]

    candidates = candidates.filter(candidate => {
      // Sin fila de mercado (`null`) y con fila sin perfil de enlaces (`unknown`) son dos formas
      // del MISMO hecho para esta decisión: nadie midió la barrera. Ninguna pasa por omisión.
      if (candidate.linkBarrier === null || candidate.linkBarrier === 'unknown') {
        return input.includeUnknownBarrier === true
      }

      return LINK_BARRIER_SORT[candidate.linkBarrier] <= ceiling
    })
  }

  if (input.excludeTracked) {
    candidates = candidates.filter(candidate => !candidate.alreadyTracked)
  }

  // Orden por defecto de la spec (8 llaves, desempate estable). No inventa un score único.
  candidates.sort((a, b) => {
    // 🔴 "Pendiente primero" significa SIN DECISIÓN TOMADA, y desde TASK-1692 eso coincide con
    // "sin fila": los tres kinds que faltaban ya tienen writer, así que un candidato promovido
    // a tracking o enviado a un draft AEO deja rastro y baja. Antes ninguno lo dejaba y lo ya
    // resuelto encabezaba el inbox como si fuera lo más pendiente que había.
    const pendingA = a.latestAction === null ? 0 : 1
    const pendingB = b.latestAction === null ? 0 : 1

    if (pendingA !== pendingB) return pendingA - pendingB

    const seedA = a.matchesSeed ? 0 : 1
    const seedB = b.matchesSeed ? 0 : 1

    if (seedA !== seedB) return seedA - seedB

    // Auditoría SEO 2026-08-14: oportunidad MEDIDA primero — el Space YA recibe impresiones
    // por la keyword (●) y todavía no la sigue: es la decisión de mayor valor del inbox.
    const measuredA = a.measuredGsc !== null && !a.alreadyTracked ? 0 : 1
    const measuredB = b.measuredGsc !== null && !b.alreadyTracked ? 0 : 1

    if (measuredA !== measuredB) return measuredA - measuredB

    const coreA = a.coreKeyword !== null ? 0 : 1
    const coreB = b.coreKeyword !== null ? 0 : 1

    if (coreA !== coreB) return coreA - coreB

    const volumeA = a.searchVolume ?? -1
    const volumeB = b.searchVolume ?? -1

    if (volumeA !== volumeB) return volumeB - volumeA

    // Auditoría SEO 2026-08-14: el desempate de dificultad usa la BARRERA DE ENLACES canónica
    // (deriveLinkBarrier), no keyword_difficulty — KD colapsa a 0 en SERPs es-LATAM. `null`
    // ("Sin dato") ordena al final, jamás como "baja".
    const barrierA = LINK_BARRIER_SORT[a.linkBarrier ?? 'unknown']
    const barrierB = LINK_BARRIER_SORT[b.linkBarrier ?? 'unknown']

    if (barrierA !== barrierB) return barrierA - barrierB

    if (a.capturedAt !== b.capturedAt) return a.capturedAt < b.capturedAt ? 1 : -1

    return a.candidateId < b.candidateId ? -1 : 1
  })

  const totalCandidates = candidates.length
  const page = candidates.slice(offset, offset + limit)
  const nextCursor = offset + limit < totalCandidates ? String(offset + limit) : null

  return {
    ok: true,
    runs,
    run: runView,
    candidates: page,
    totalCandidates,
    nextCursor,
    marketAvailability: market.market,
    marketFreshness: market.freshness.latestCaptureDate,
    trackingCostDisclosure: TRACKING_COST_DISCLOSURE,
    ignoredFilters
  }
}
