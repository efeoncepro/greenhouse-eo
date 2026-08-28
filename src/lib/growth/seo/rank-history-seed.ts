/**
 * TASK-1655 Slice 4 — Semilla histórica de posiciones vía DataForSEO Labs
 * `historical_serps` (familia `labs`, YA en el allowlist).
 *
 * El rank capture diario (TASK-1303) mide hacia adelante; este command trae el PASADO:
 * los SERPs históricos que el proveedor archivó para cada keyword trackeada, de los que
 * se extrae la posición del dominio del target.
 *
 * ⚠️ GRANULARIDAD VERIFICADA EN SANDBOX (2026-08-07): `historical_serps` devuelve
 * snapshots DISPERSOS (aprox. mensuales/bimestrales, con fecha exacta por snapshot) — NO
 * una serie diaria. La semilla se persiste con la fecha real de cada snapshot y los
 * huecos entre puntos son huecos: el chart los dibuja como tales (contrato §10.5). Jamás
 * se interpola a diaria.
 *
 * Procedencia: `source_run_id = 'labs-hist-<runId>'` — distingue la semilla de las
 * mediciones del cron sin migración (la columna existía). La tabla es append-only
 * (`ON CONFLICT DO NOTHING`; los triggers de TASK-1299 prohíben DO UPDATE/DELETE).
 *
 * Contrato de gasto (patrón TASK-1303): `enforceSeoRunEntitlement` con el estimado del
 * batch completo + spend fence cada K llamadas + pre-check de idempotencia ANTES del
 * provider (keyword ya sembrada = cero llamadas) + el ledger lo escribe el TRANSPORTE.
 */

import 'server-only'

import { postDataForSeoTask } from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { enforceSeoRunEntitlement } from './entitlement'
import { isSeoModuleEnabled } from './flags'
import { mirrorRankSnapshotsToBq } from './rank-history-bq-mirror'

/**
 * Estimado conservador por keyword: task setup Labs (~$0.012) + ~16 SERPs × $0.00012.
 * El costo REAL lo reporta el provider y lo contabiliza el transporte.
 */
const ESTIMATED_COST_PER_KEYWORD_USD = 0.02

/** Espejo del patrón TASK-1303: re-consulta del gate cada K llamadas cobradas. */
const SPEND_FENCE_RECHECK_EVERY = 10

export type RankHistorySeedKeywordStatus = 'seeded' | 'already_seeded' | 'no_history' | 'budget_blocked' | 'provider_error'

export interface RankHistorySeedKeywordOutcome {
  keyword: string
  status: RankHistorySeedKeywordStatus
  /** Snapshots históricos persistidos (uno por fecha de archivo del proveedor). */
  snapshots: number
  providerCostUsd: number
  errorCode: string | null
}

export type RankHistorySeedResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      seedRunId: string
      keywords: number
      seeded: number
      alreadySeeded: number
      noHistory: number
      budgetBlocked: number
      providerErrors: number
      snapshotsWritten: number
      costUsd: number
      outcomes: RankHistorySeedKeywordOutcome[]
    }
  | {
      ok: false
      errorCode:
        | 'disabled'
        | 'target_not_found'
        | 'no_keywords'
        | 'no_entitlement'
        | 'expired'
        | 'budget_exhausted'
        | 'quota_exhausted'
      status: null
    }

interface HistoricalSerpItem {
  datetime?: string
  items?: Array<{
    type?: string
    rank_group?: number
    rank_absolute?: number
    domain?: string
    url?: string
  }>
}

/** Posición orgánica del dominio del target dentro de un SERP histórico. Puro, testeable. */
export const extractDomainPosition = (
  serp: HistoricalSerpItem,
  rootDomain: string
): { position: number | null; url: string | null } => {
  const normalizedRoot = rootDomain.toLowerCase().replace(/^www\./, '')

  for (const item of serp.items ?? []) {
    if (item.type !== 'organic') continue

    const domain = (item.domain ?? '').toLowerCase().replace(/^www\./, '')

    // El dominio del SERP matchea el root o un subdominio suyo — nunca un dominio que
    // solo CONTIENE el root como substring (berel.com ≠ noberel.com).
    if (domain === normalizedRoot || domain.endsWith(`.${normalizedRoot}`)) {
      const position = item.rank_group ?? item.rank_absolute ?? null

      return { position: position !== null && position > 0 ? position : null, url: item.url ?? null }
    }
  }

  // El dominio no aparece en ese snapshot: medición válida "no rankeó" (position null).
  return { position: null, url: null }
}

const mapBlockedReason = (
  reason: string | null
): 'no_entitlement' | 'expired' | 'budget_exhausted' | 'quota_exhausted' => {
  switch (reason) {
    case 'expired':
      return 'expired'
    case 'budget_exhausted':
      return 'budget_exhausted'
    case 'quota_exhausted':
      return 'quota_exhausted'
    default:
      return 'no_entitlement'
  }
}

export const seedRankHistory = async (
  seoTargetId: string,
  options: { engine?: string; device?: 'desktop' | 'mobile' | 'tablet' } = {}
): Promise<RankHistorySeedResult> => {
  if (!isSeoModuleEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const engine = options.engine ?? 'google'
  const device = options.device ?? 'desktop'

  const targets = await runGreenhousePostgresQuery<{
    seo_target_id: string
    organization_id: string
    root_domain: string
    location_code: string
    language_code: string
  }>(
    `SELECT seo_target_id, organization_id, root_domain, location_code, language_code
       FROM greenhouse_growth.seo_targets
      WHERE seo_target_id = $1
        AND status = 'active'`,
    [seoTargetId]
  )

  const target = targets[0]

  if (!target) {
    return { ok: false, errorCode: 'target_not_found', status: null }
  }

  const keywordRows = await runGreenhousePostgresQuery<{ keyword: string }>(
    `SELECT DISTINCT m.keyword
       FROM greenhouse_growth.seo_keyword_set_members m
       JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
      WHERE s.seo_target_id = $1
        AND m.effective_to IS NULL
      ORDER BY m.keyword`,
    [seoTargetId]
  )

  if (keywordRows.length === 0) {
    return { ok: false, errorCode: 'no_keywords', status: null }
  }

  // Pre-check de idempotencia ANTES del provider: una keyword con semilla previa no
  // vuelve a pagarse (patrón TASK-1303 — la idempotencia protege el presupuesto, no
  // solo la unicidad de filas).
  const seededRows = await runGreenhousePostgresQuery<{ keyword: string }>(
    `SELECT DISTINCT keyword
       FROM greenhouse_growth.seo_rank_snapshots
      WHERE seo_target_id = $1
        AND source_run_id LIKE 'labs-hist-%'`,
    [seoTargetId]
  )

  const alreadySeededSet = new Set(seededRows.map(row => row.keyword))
  const pending = keywordRows.map(row => row.keyword).filter(keyword => !alreadySeededSet.has(keyword))

  const outcomes: RankHistorySeedKeywordOutcome[] = keywordRows
    .filter(row => alreadySeededSet.has(row.keyword))
    .map(row => ({ keyword: row.keyword, status: 'already_seeded' as const, snapshots: 0, providerCostUsd: 0, errorCode: null }))

  const seedRunId = `labs-hist-${new Date().toISOString().slice(0, 10)}`
  const touchedDates = new Set<string>()
  let costUsd = 0
  let chargedCalls = 0
  let fenceTripped = false

  if (pending.length > 0) {
    const gate = await enforceSeoRunEntitlement(target.organization_id, {
      estimatedCostUsd: pending.length * ESTIMATED_COST_PER_KEYWORD_USD,
      consumesAuditAllowance: false
    })

    if (!gate.allowed) {
      return { ok: false, errorCode: mapBlockedReason(gate.blockedReason), status: null }
    }
  }

  for (let index = 0; index < pending.length; index += 1) {
    const keyword = pending[index]

    if (chargedCalls > 0 && chargedCalls % SPEND_FENCE_RECHECK_EVERY === 0 && !fenceTripped) {
      const fence = await enforceSeoRunEntitlement(target.organization_id, {
        estimatedCostUsd: (pending.length - index) * ESTIMATED_COST_PER_KEYWORD_USD,
        consumesAuditAllowance: false
      })

      if (!fence.allowed) {
        fenceTripped = true
      }
    }

    if (fenceTripped) {
      outcomes.push({ keyword, status: 'budget_blocked', snapshots: 0, providerCostUsd: 0, errorCode: 'budget_exhausted' })
      continue
    }

    try {
      const response = await postDataForSeoTask({
        family: 'labs',
        consumer: 'seo',
        endpoint: '/v3/dataforseo_labs/google/historical_serps/live',
        organizationId: target.organization_id,
        tasks: [
          {
            keyword,
            location_code: Number(target.location_code),
            language_code: target.language_code
          }
        ]
      })

      const providerCostUsd = response.cost ?? 0

      costUsd += providerCostUsd
      chargedCalls += 1

      const task = (response.tasks?.[0] ?? {}) as {
        status_code?: number
        result?: Array<{ items?: HistoricalSerpItem[] }>
      }

      if (!response.ok || task.status_code !== 20000) {
        outcomes.push({
          keyword,
          status: 'provider_error',
          snapshots: 0,
          providerCostUsd,
          errorCode: `task_status_${String(task.status_code ?? response.httpStatus)}`
        })
        continue
      }

      const serps = task.result?.[0]?.items ?? []

      if (serps.length === 0) {
        // El proveedor no archivó SERPs para esta keyword: hecho, no error.
        outcomes.push({ keyword, status: 'no_history', snapshots: 0, providerCostUsd, errorCode: null })
        continue
      }

      let written = 0

      for (const serp of serps) {
        const captureDate = (serp.datetime ?? '').slice(0, 10)

        if (!captureDate) continue

        const { position, url } = extractDomainPosition(serp, target.root_domain)

        // `ON CONFLICT DO NOTHING`: la clave (target, keyword, engine, device, fecha) es
        // la misma del cron — si el cron ya midió ese día, SU medición manda (la semilla
        // nunca pisa una fila; los triggers además prohíben DO UPDATE).
        const inserted = await runGreenhousePostgresQuery<{ rank_snapshot_id: string }>(
          `INSERT INTO greenhouse_growth.seo_rank_snapshots
             (seo_target_id, keyword, engine, device, capture_date, position, url,
              serp_features, estimated_traffic, provider_cost, source_run_id)
           VALUES ($1, $2, $3, $4, $5::date, $6, $7, '[]'::jsonb, NULL, $8, $9)
           ON CONFLICT (seo_target_id, keyword, engine, device, capture_date) DO NOTHING
           RETURNING rank_snapshot_id`,
          [
            seoTargetId,
            keyword,
            engine,
            device,
            captureDate,
            position,
            url,
            written === 0 ? providerCostUsd : 0,
            seedRunId
          ]
        )

        if (inserted.length > 0) {
          written += 1
          touchedDates.add(captureDate)
        }
      }

      outcomes.push({ keyword, status: 'seeded', snapshots: written, providerCostUsd, errorCode: null })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_rank_history_seed' },
        extra: { seoTargetId, keyword }
      })

      outcomes.push({ keyword, status: 'provider_error', snapshots: 0, providerCostUsd: 0, errorCode: 'unexpected_error' })
    }
  }

  // Espejo a BQ de cada fecha tocada (historia larga). Reusa el mirror canónico del cron
  // — MERGE por rank_snapshot_id, idempotente.
  for (const captureDate of touchedDates) {
    try {
      await mirrorRankSnapshotsToBq(seoTargetId, captureDate)
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_rank_history_seed_bq_mirror' },
        extra: { seoTargetId, captureDate }
      })
    }
  }

  const count = (status: RankHistorySeedKeywordStatus) => outcomes.filter(outcome => outcome.status === status).length

  return {
    ok: true,
    seoTargetId,
    organizationId: target.organization_id,
    seedRunId,
    keywords: keywordRows.length,
    seeded: count('seeded'),
    alreadySeeded: count('already_seeded'),
    noHistory: count('no_history'),
    budgetBlocked: count('budget_blocked'),
    providerErrors: count('provider_error'),
    snapshotsWritten: outcomes.reduce((total, outcome) => total + outcome.snapshots, 0),
    costUsd,
    outcomes
  }
}
