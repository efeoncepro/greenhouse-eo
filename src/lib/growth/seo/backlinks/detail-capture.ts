/**
 * TASK-1777 — Drill-down nominal del perfil de enlaces: qué dominio enlazó, cuál se cayó,
 * con qué anchor. Corre como PASE post-batch del snapshot semanal (TASK-1304), detrás de
 * `GROWTH_SEO_BACKLINK_DETAIL_ENABLED`, y SOLO donde `shouldDrillDownBacklinks` lo autoriza.
 *
 * El veredicto de cada evaluación se persiste en `seo_backlink_drilldowns` (una fila por
 * snapshot, sea cual sea el outcome): es lo que permite distinguir "no hubo movimiento" de
 * "se intentó y falló" (los tres estados del reader) y ancla el "a lo sumo una vez por
 * snapshot" de la idempotencia.
 *
 * Contratos duros:
 *   - `rank_scale: one_hundred` en TODA llamada (mezclar con la escala 0-1000 default produce
 *     cifras absurdas sin error);
 *   - `limit` acotado por knob (cada fila cuesta USD 0.000036; filtrar es gratis);
 *   - el movimiento nominal (`backlinks/live` en `one_per_domain`) se pide SOLO en la
 *     dirección que el delta indica;
 *   - degradación honesta: un drill-down que falla deja veredicto `failed` + señal, JAMÁS
 *     fabrica filas; los child-inserts van en una transacción para que un fallo a medias no
 *     deje un detalle mentiroso;
 *   - `toxic_share` del padre NO se toca.
 */

import 'server-only'

import { createHash } from 'node:crypto'

import { postDataForSeoTask, type DataForSeoTaskPayload } from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { SEO_BACKLINK_DETAIL_CAPTURED_EVENT, SEO_RANK_SNAPSHOT_AGGREGATE_TYPE } from '../contracts'
import { enforceSeoRunEntitlement, SEO_MODULE_KEYS_READ } from '../entitlement'
import { isSeoBacklinkDetailEnabled, isSeoModuleEnabled } from '../flags'
import { resolveSantiagoCaptureDate } from '../rank-capture'
import {
  resolveDrillDownConfig,
  shouldDrillDownBacklinks,
  type DrillDownDecision
} from './should-drill-down'

export const BACKLINKS_REFERRING_DOMAINS_ENDPOINT = '/v3/backlinks/referring_domains/live'
export const BACKLINKS_ANCHORS_ENDPOINT = '/v3/backlinks/anchors/live'
export const BACKLINKS_BACKLINKS_ENDPOINT = '/v3/backlinks/backlinks/live'

/**
 * 🔴 `limit` es la palanca de costo: USD 0.024/request + USD 0.000036/fila. Default 100
 * (~USD 0.028/request lleno); knob explícito para subirlo con decisión, nunca "por si acaso".
 */
export const BACKLINK_DETAIL_ROW_LIMIT_KNOB = 'GROWTH_SEO_BACKLINK_DETAIL_ROW_LIMIT'
export const BACKLINK_DETAIL_DEFAULT_ROW_LIMIT = 100
const PROVIDER_MAX_ROW_LIMIT = 1000

const BACKLINKS_REQUEST_USD = 0.024
const BACKLINKS_ROW_USD = 0.000036

export const resolveDetailRowLimit = (env: NodeJS.ProcessEnv = process.env): number => {
  const raw = Number(env[BACKLINK_DETAIL_ROW_LIMIT_KNOB])

  if (!Number.isFinite(raw) || raw <= 0) return BACKLINK_DETAIL_DEFAULT_ROW_LIMIT

  return Math.min(Math.floor(raw), PROVIDER_MAX_ROW_LIMIT)
}

/** Peor caso: 2 requests base (referring_domains + anchors) + 2 de movimiento condicionales. */
export const estimateDetailCost = (rowLimit: number, movementRequests: number): number => {
  const requests = 2 + movementRequests

  return Number((requests * BACKLINKS_REQUEST_USD + requests * rowLimit * BACKLINKS_ROW_USD).toFixed(6))
}

const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex')

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const toTimestamp = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null

const taskItems = (tasks: unknown[]): Record<string, unknown>[] | null => {
  const task = asRecord(tasks[0])

  if ((typeof task?.status_code === 'number' ? task.status_code : null) !== 20000) return null

  const result = asRecord(Array.isArray(task?.result) ? task.result[0] : null)
  const items = Array.isArray(result?.items) ? result.items : []

  return items.map(asRecord).filter((item): item is Record<string, unknown> => item !== null)
}

export type BacklinkMovement = 'present' | 'new' | 'lost'

export interface ReferringDomainRow {
  normalizedReferringDomain: string
  referringDomain: string
  movement: BacklinkMovement
  rank: number | null
  backlinksToTarget: number | null
  backlinkSpamScore: number | null
  firstSeen: string | null
  lostDate: string | null
  sampleUrlFrom: string | null
  sampleUrlTo: string | null
  sampleAnchor: string | null
  sampleDofollow: boolean | null
}

export interface AnchorRow {
  anchorTextHash: string
  anchor: string
  backlinks: number | null
  referringDomains: number | null
  rank: number | null
  backlinkSpamScore: number | null
  firstSeen: string | null
}

const clampRank = (value: number | null): number | null =>
  value === null ? null : Math.min(100, Math.max(0, value))

/** Parser puro de `referring_domains/live` → filas `present`. */
export const parseReferringDomainItems = (tasks: unknown[]): ReferringDomainRow[] | null => {
  const items = taskItems(tasks)

  if (items === null) return null

  const rows: ReferringDomainRow[] = []

  for (const item of items) {
    const domain = typeof item.domain === 'string' ? item.domain.trim().toLowerCase() : ''

    if (!domain) continue

    rows.push({
      normalizedReferringDomain: domain,
      referringDomain: domain,
      movement: 'present',
      rank: clampRank(toFiniteNumber(item.rank)),
      backlinksToTarget: toFiniteNumber(item.backlinks),
      backlinkSpamScore: toFiniteNumber(item.backlinks_spam_score),
      firstSeen: toTimestamp(item.first_seen),
      lostDate: toTimestamp(item.lost_date),
      sampleUrlFrom: null,
      sampleUrlTo: null,
      sampleAnchor: null,
      sampleDofollow: null
    })
  }

  return rows
}

/** Parser puro de `anchors/live`. */
export const parseAnchorItems = (tasks: unknown[]): AnchorRow[] | null => {
  const items = taskItems(tasks)

  if (items === null) return null

  const rows: AnchorRow[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const anchor = typeof item.anchor === 'string' ? item.anchor : ''

    // Anchor vacío es un hecho real del proveedor (links de imagen); se conserva como ''.
    const hash = sha256(anchor)

    if (seen.has(hash)) continue

    seen.add(hash)
    rows.push({
      anchorTextHash: hash,
      anchor,
      backlinks: toFiniteNumber(item.backlinks),
      referringDomains: toFiniteNumber(item.referring_domains),
      rank: clampRank(toFiniteNumber(item.rank)),
      backlinkSpamScore: toFiniteNumber(item.backlinks_spam_score),
      firstSeen: toTimestamp(item.first_seen)
    })
  }

  return rows
}

export interface MovementSample {
  domain: string
  urlFrom: string | null
  urlTo: string | null
  anchor: string | null
  dofollow: boolean | null
  rank: number | null
  spamScore: number | null
  firstSeen: string | null
  lastSeen: string | null
}

/** Parser puro de `backlinks/live` (mode one_per_domain) → una muestra por dominio. */
export const parseMovementItems = (tasks: unknown[]): MovementSample[] | null => {
  const items = taskItems(tasks)

  if (items === null) return null

  const rows: MovementSample[] = []

  for (const item of items) {
    const domain = typeof item.domain_from === 'string' ? item.domain_from.trim().toLowerCase() : ''

    if (!domain) continue

    rows.push({
      domain,
      urlFrom: toTimestampSafeString(item.url_from),
      urlTo: toTimestampSafeString(item.url_to),
      anchor: typeof item.anchor === 'string' ? item.anchor : null,
      dofollow: typeof item.dofollow === 'boolean' ? item.dofollow : null,
      rank: clampRank(toFiniteNumber(item.domain_from_rank)),
      spamScore: toFiniteNumber(item.backlink_spam_score),
      firstSeen: toTimestamp(item.first_seen),
      lastSeen: toTimestamp(item.last_seen)
    })
  }

  return rows
}

const toTimestampSafeString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null

/**
 * Fusiona presentes + movimiento en el conjunto final (UNIQUE por dominio). Regla de
 * precedencia, pura y testeada:
 *   - dominio en `new` → movement `new` (esté o no en presentes) + muestra del enlace;
 *   - dominio en `lost` y AUSENTE de presentes → movement `lost` (se fue de verdad);
 *   - dominio en `lost` pero PRESENTE → sigue `present` (perdió UN enlace, no el dominio):
 *     se conserva la muestra del enlace perdido como contexto accionable.
 */
export const mergeMovementIntoDomains = (
  present: readonly ReferringDomainRow[],
  newSamples: readonly MovementSample[],
  lostSamples: readonly MovementSample[]
): ReferringDomainRow[] => {
  const byDomain = new Map<string, ReferringDomainRow>()

  for (const row of present) {
    byDomain.set(row.normalizedReferringDomain, { ...row })
  }

  for (const sample of newSamples) {
    const existing = byDomain.get(sample.domain)

    if (existing) {
      existing.movement = 'new'
      existing.sampleUrlFrom = sample.urlFrom
      existing.sampleUrlTo = sample.urlTo
      existing.sampleAnchor = sample.anchor
      existing.sampleDofollow = sample.dofollow
    } else {
      byDomain.set(sample.domain, {
        normalizedReferringDomain: sample.domain,
        referringDomain: sample.domain,
        movement: 'new',
        rank: sample.rank,
        backlinksToTarget: null,
        backlinkSpamScore: sample.spamScore,
        firstSeen: sample.firstSeen,
        lostDate: null,
        sampleUrlFrom: sample.urlFrom,
        sampleUrlTo: sample.urlTo,
        sampleAnchor: sample.anchor,
        sampleDofollow: sample.dofollow
      })
    }
  }

  for (const sample of lostSamples) {
    const existing = byDomain.get(sample.domain)

    if (existing) {
      // El dominio sigue presente: perdió un enlace, no la relación. Se adjunta la muestra
      // del enlace caído si no hay una mejor (la de `new` manda).
      if (existing.movement === 'present' && existing.sampleUrlFrom === null) {
        existing.sampleUrlFrom = sample.urlFrom
        existing.sampleUrlTo = sample.urlTo
        existing.sampleAnchor = sample.anchor
        existing.sampleDofollow = sample.dofollow
      }
    } else {
      byDomain.set(sample.domain, {
        normalizedReferringDomain: sample.domain,
        referringDomain: sample.domain,
        movement: 'lost',
        rank: sample.rank,
        backlinksToTarget: null,
        backlinkSpamScore: sample.spamScore,
        firstSeen: sample.firstSeen,
        lostDate: sample.lastSeen,
        sampleUrlFrom: sample.urlFrom,
        sampleUrlTo: sample.urlTo,
        sampleAnchor: sample.anchor,
        sampleDofollow: sample.dofollow
      })
    }
  }

  return [...byDomain.values()]
}

// ─── Persistencia ───────────────────────────────────────────────────────────────────────────

type DrilldownOutcome = 'drilled' | 'skipped_no_movement' | 'skipped_partial' | 'failed'
type DrilldownReason = DrillDownDecision['reason']

const insertVerdict = async (input: {
  backlinkSnapshotId: string
  outcome: DrilldownOutcome
  triggerReason: DrilldownReason
  referringDomainRows: number
  anchorRows: number
  providerCostUsd: number
  errorCode: string | null
}): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ backlink_drilldown_id: string }>(
    `INSERT INTO greenhouse_growth.seo_backlink_drilldowns
       (backlink_snapshot_id, outcome, trigger_reason, referring_domain_rows, anchor_rows,
        provider_cost, error_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT ON CONSTRAINT seo_backlink_drilldowns_snapshot_unique DO NOTHING
     RETURNING backlink_drilldown_id`,
    [
      input.backlinkSnapshotId,
      input.outcome,
      input.triggerReason,
      input.referringDomainRows,
      input.anchorRows,
      input.providerCostUsd,
      input.errorCode
    ]
  )

  return rows.length > 0
}

/**
 * Writer del detalle: veredicto + dominios + anchors DENTRO de una transacción — un fallo a
 * medias no puede dejar un detalle parcial que el pre-check lea como completo.
 */
export const persistBacklinkDetail = async (input: {
  backlinkSnapshotId: string
  triggerReason: DrilldownReason
  domains: readonly ReferringDomainRow[]
  anchors: readonly AnchorRow[]
  providerCostUsd: number
}): Promise<{ inserted: boolean }> => {
  return withGreenhousePostgresTransaction(async client => {
    const verdict = await client.query(
      `INSERT INTO greenhouse_growth.seo_backlink_drilldowns
         (backlink_snapshot_id, outcome, trigger_reason, referring_domain_rows, anchor_rows,
          provider_cost, error_code)
       VALUES ($1, 'drilled', $2, $3, $4, $5, NULL)
       ON CONFLICT ON CONSTRAINT seo_backlink_drilldowns_snapshot_unique DO NOTHING
       RETURNING backlink_drilldown_id`,
      [input.backlinkSnapshotId, input.triggerReason, input.domains.length, input.anchors.length, input.providerCostUsd]
    )

    if (verdict.rows.length === 0) {
      // Carrera: otro proceso ya evaluó este snapshot. No se escribe nada más.
      return { inserted: false }
    }

    for (const row of input.domains) {
      await client.query(
        `INSERT INTO greenhouse_growth.seo_backlink_referring_domains
           (backlink_snapshot_id, normalized_referring_domain, referring_domain, movement,
            rank, backlinks_to_target, backlink_spam_score, first_seen, lost_date,
            sample_url_from, sample_url_to, sample_anchor, sample_dofollow)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT ON CONSTRAINT seo_backlink_ref_domains_unique DO NOTHING`,
        [
          input.backlinkSnapshotId,
          row.normalizedReferringDomain,
          row.referringDomain,
          row.movement,
          row.rank,
          row.backlinksToTarget,
          row.backlinkSpamScore,
          row.firstSeen,
          row.lostDate,
          row.sampleUrlFrom,
          row.sampleUrlTo,
          row.sampleAnchor,
          row.sampleDofollow
        ]
      )
    }

    for (const row of input.anchors) {
      await client.query(
        `INSERT INTO greenhouse_growth.seo_backlink_anchors
           (backlink_snapshot_id, anchor_text_hash, anchor, backlinks, referring_domains,
            rank, backlink_spam_score, first_seen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT ON CONSTRAINT seo_backlink_anchors_unique DO NOTHING`,
        [
          input.backlinkSnapshotId,
          row.anchorTextHash,
          row.anchor,
          row.backlinks,
          row.referringDomains,
          row.rank,
          row.backlinkSpamScore,
          row.firstSeen
        ]
      )
    }

    return { inserted: true }
  })
}

// ─── Captura ────────────────────────────────────────────────────────────────────────────────

export type BacklinkDetailOutcome =
  | 'drilled'
  | 'skipped_no_movement'
  | 'skipped_partial'
  | 'already_evaluated'
  | 'budget_blocked'
  | 'failed'

export interface BacklinkDetailSnapshotResult {
  backlinkSnapshotId: string
  seoTargetId: string
  outcome: BacklinkDetailOutcome
  triggerReason: DrilldownReason | null
  referringDomainRows: number
  anchorRows: number
  costUsd: number
  errorCode: string | null
}

type SnapshotRow = {
  backlink_snapshot_id: string
  seo_target_id: string
  organization_id: string
  root_domain: string
  capture_date: string
  referring_domains: number | null
  new_lost_delta: Record<string, unknown> | null
}

/**
 * Ejecuta el drill-down de UN snapshot ya autorizado por el predicado. GASTA.
 * El caller (el pase) ya evaluó la condición; acá sólo se ejecuta y persiste.
 */
const executeDrillDown = async (
  snapshot: SnapshotRow,
  triggerReason: DrilldownReason,
  rowLimit: number
): Promise<BacklinkDetailSnapshotResult> => {
  const base: Omit<BacklinkDetailSnapshotResult, 'outcome' | 'errorCode'> = {
    backlinkSnapshotId: snapshot.backlink_snapshot_id,
    seoTargetId: snapshot.seo_target_id,
    triggerReason,
    referringDomainRows: 0,
    anchorRows: 0,
    costUsd: 0
  }

  const delta = snapshot.new_lost_delta ?? {}
  const newBacklinks = toFiniteNumber(delta.newBacklinks) ?? 0
  const lostBacklinks = toFiniteNumber(delta.lostBacklinks) ?? 0
  const movementRequests = (newBacklinks > 0 ? 1 : 0) + (lostBacklinks > 0 ? 1 : 0)

  const gate = await enforceSeoRunEntitlement(snapshot.organization_id, {
    estimatedCostUsd: estimateDetailCost(rowLimit, movementRequests),
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    // Bloqueo de presupuesto: NO se escribe veredicto — el snapshot puede evaluarse la
    // próxima corrida cuando el presupuesto del mes se renueve.
    return { ...base, outcome: 'budget_blocked', errorCode: gate.blockedReason ?? 'budget_exhausted' }
  }

  let costUsd = 0

  try {
    const commonParams: DataForSeoTaskPayload = {
      target: snapshot.root_domain,
      rank_scale: 'one_hundred',
      internal_list_limit: 10,
      limit: rowLimit
    }

    const domainsResult = await postDataForSeoTask({
      family: 'backlinks',
      consumer: 'seo',
      endpoint: BACKLINKS_REFERRING_DOMAINS_ENDPOINT,
      organizationId: snapshot.organization_id,
      tasks: [{ ...commonParams, order_by: ['rank,desc'] }]
    })

    costUsd += toFiniteNumber(domainsResult.cost) ?? 0

    const present = domainsResult.ok ? parseReferringDomainItems(domainsResult.tasks) : null

    if (present === null) {
      await insertVerdict({
        backlinkSnapshotId: snapshot.backlink_snapshot_id,
        outcome: 'failed',
        triggerReason,
        referringDomainRows: 0,
        anchorRows: 0,
        providerCostUsd: costUsd,
        errorCode: domainsResult.ok ? 'provider_task_failed' : 'provider_error'
      })

      return { ...base, costUsd, outcome: 'failed', errorCode: 'provider_error' }
    }

    const anchorsResult = await postDataForSeoTask({
      family: 'backlinks',
      consumer: 'seo',
      endpoint: BACKLINKS_ANCHORS_ENDPOINT,
      organizationId: snapshot.organization_id,
      tasks: [{ ...commonParams, order_by: ['backlinks,desc'] }]
    })

    costUsd += toFiniteNumber(anchorsResult.cost) ?? 0

    const anchors = anchorsResult.ok ? parseAnchorItems(anchorsResult.tasks) : null

    if (anchors === null) {
      await insertVerdict({
        backlinkSnapshotId: snapshot.backlink_snapshot_id,
        outcome: 'failed',
        triggerReason,
        referringDomainRows: 0,
        anchorRows: 0,
        providerCostUsd: costUsd,
        errorCode: anchorsResult.ok ? 'provider_task_failed' : 'provider_error'
      })

      return { ...base, costUsd, outcome: 'failed', errorCode: 'provider_error' }
    }

    // Movimiento nominal: SOLO en la dirección que el delta indica (filtrar es gratis;
    // pedir lo que no se movió no lo es).
    let newSamples: MovementSample[] = []
    let lostSamples: MovementSample[] = []

    if (newBacklinks > 0) {
      const newResult = await postDataForSeoTask({
        family: 'backlinks',
        consumer: 'seo',
        endpoint: BACKLINKS_BACKLINKS_ENDPOINT,
        organizationId: snapshot.organization_id,
        tasks: [
          {
            ...commonParams,
            mode: 'one_per_domain',
            filters: ['is_new', '=', true],
            order_by: ['domain_from_rank,desc']
          }
        ]
      })

      costUsd += toFiniteNumber(newResult.cost) ?? 0
      newSamples = (newResult.ok ? parseMovementItems(newResult.tasks) : null) ?? []
    }

    if (lostBacklinks > 0) {
      const lostResult = await postDataForSeoTask({
        family: 'backlinks',
        consumer: 'seo',
        endpoint: BACKLINKS_BACKLINKS_ENDPOINT,
        organizationId: snapshot.organization_id,
        tasks: [
          {
            ...commonParams,
            mode: 'one_per_domain',
            backlinks_status_type: 'all',
            filters: ['is_lost', '=', true],
            order_by: ['domain_from_rank,desc']
          }
        ]
      })

      costUsd += toFiniteNumber(lostResult.cost) ?? 0
      lostSamples = (lostResult.ok ? parseMovementItems(lostResult.tasks) : null) ?? []
    }

    const domains = mergeMovementIntoDomains(present, newSamples, lostSamples)

    const { inserted } = await persistBacklinkDetail({
      backlinkSnapshotId: snapshot.backlink_snapshot_id,
      triggerReason,
      domains,
      anchors,
      providerCostUsd: costUsd
    })

    if (!inserted) {
      return { ...base, costUsd, outcome: 'already_evaluated', errorCode: null }
    }

    await publishOutboxEvent({
      aggregateType: SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
      aggregateId: snapshot.seo_target_id,
      eventType: SEO_BACKLINK_DETAIL_CAPTURED_EVENT,
      payload: {
        seoTargetId: snapshot.seo_target_id,
        organizationId: snapshot.organization_id,
        backlinkSnapshotId: snapshot.backlink_snapshot_id,
        captureDate: snapshot.capture_date,
        triggerReason,
        referringDomainRows: domains.length,
        anchorRows: anchors.length,
        costUsd: Number(costUsd.toFixed(6)),
        actor: 'system:seo-backlink-detail-pass'
      }
    })

    return {
      ...base,
      outcome: 'drilled',
      referringDomainRows: domains.length,
      anchorRows: anchors.length,
      costUsd: Number(costUsd.toFixed(6)),
      errorCode: null
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_backlink_detail_capture', family: 'backlinks' },
      extra: { backlinkSnapshotId: snapshot.backlink_snapshot_id }
    })

    await insertVerdict({
      backlinkSnapshotId: snapshot.backlink_snapshot_id,
      outcome: 'failed',
      triggerReason,
      referringDomainRows: 0,
      anchorRows: 0,
      providerCostUsd: costUsd,
      errorCode: 'provider_unreachable'
    }).catch(() => undefined)

    return { ...base, costUsd, outcome: 'failed', errorCode: 'provider_unreachable' }
  }
}

export interface BacklinkDetailPassResult {
  snapshots: number
  drilled: number
  skipped: number
  alreadyEvaluated: number
  budgetBlocked: number
  failed: number
  costUsd: number
  outcomes: BacklinkDetailSnapshotResult[]
}

/**
 * Pase post-batch: evalúa los snapshots del día (targets de orgs con entitlement) con el
 * predicado y ejecuta el drill-down SOLO donde corresponde. Los skip también dejan veredicto
 * — "el perfil estuvo estable" es información, no un hueco.
 */
export const runBacklinkDetailPass = async (
  options: { captureDate?: string; maxSnapshots?: number } = {}
): Promise<BacklinkDetailPassResult | { skipped: 'disabled' }> => {
  if (!isSeoModuleEnabled() || !isSeoBacklinkDetailEnabled()) {
    return { skipped: 'disabled' }
  }

  const captureDate = options.captureDate ?? resolveSantiagoCaptureDate()
  const config = resolveDrillDownConfig()
  const rowLimit = resolveDetailRowLimit()

  // Snapshots del día SIN veredicto todavía, de targets elegibles, con su snapshot anterior.
  const rows = await runGreenhousePostgresQuery<
    SnapshotRow & { previous_referring_domains: number | null; has_prior_detail: boolean }
  >(
    `SELECT s.backlink_snapshot_id,
            s.seo_target_id,
            t.organization_id,
            t.root_domain,
            s.capture_date::text AS capture_date,
            s.referring_domains,
            s.new_lost_delta,
            prev.referring_domains AS previous_referring_domains,
            EXISTS (
              SELECT 1
                FROM greenhouse_growth.seo_backlink_drilldowns d
                JOIN greenhouse_growth.seo_backlink_snapshots s2
                  ON s2.backlink_snapshot_id = d.backlink_snapshot_id
               WHERE s2.seo_target_id = s.seo_target_id
                 AND d.outcome = 'drilled'
            ) AS has_prior_detail
       FROM greenhouse_growth.seo_backlink_snapshots s
       JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = s.seo_target_id
       LEFT JOIN LATERAL (
         SELECT p.referring_domains
           FROM greenhouse_growth.seo_backlink_snapshots p
          WHERE p.seo_target_id = s.seo_target_id
            AND p.capture_date < s.capture_date
          ORDER BY p.capture_date DESC
          LIMIT 1
       ) prev ON TRUE
      WHERE s.capture_date = $1::date
        AND t.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_growth.seo_backlink_drilldowns d
           WHERE d.backlink_snapshot_id = s.backlink_snapshot_id
        )
        AND EXISTS (
          SELECT 1
            FROM greenhouse_client_portal.module_assignments ma
           WHERE ma.organization_id = t.organization_id
             AND ma.module_key = ANY($2::text[])
             AND ma.effective_to IS NULL
             AND ma.status IN ('active', 'pilot')
        )
      ORDER BY s.backlink_snapshot_id`,
    [captureDate, [...SEO_MODULE_KEYS_READ]]
  )

  const snapshots =
    typeof options.maxSnapshots === 'number' && options.maxSnapshots > 0 ? rows.slice(0, options.maxSnapshots) : rows

  const outcomes: BacklinkDetailSnapshotResult[] = []
  let drilled = 0
  let skipped = 0
  let alreadyEvaluated = 0
  let budgetBlocked = 0
  let failed = 0
  let costUsd = 0

  for (const snapshot of snapshots) {
    try {
      const decision = shouldDrillDownBacklinks(
        {
          snapshot: {
            referringDomains: snapshot.referring_domains,
            newLostDelta: snapshot.new_lost_delta ?? {}
          },
          previous:
            snapshot.previous_referring_domains !== null
              ? { referringDomains: snapshot.previous_referring_domains }
              : null,
          hasPriorDetail: snapshot.has_prior_detail
        },
        config
      )

      if (!decision.drill) {
        const outcome = decision.reason === 'partial_snapshot' ? 'skipped_partial' : 'skipped_no_movement'

        const wrote = await insertVerdict({
          backlinkSnapshotId: snapshot.backlink_snapshot_id,
          outcome,
          triggerReason: decision.reason,
          referringDomainRows: 0,
          anchorRows: 0,
          providerCostUsd: 0,
          errorCode: null
        })

        if (wrote) skipped += 1
        else alreadyEvaluated += 1

        outcomes.push({
          backlinkSnapshotId: snapshot.backlink_snapshot_id,
          seoTargetId: snapshot.seo_target_id,
          outcome: wrote ? outcome : 'already_evaluated',
          triggerReason: decision.reason,
          referringDomainRows: 0,
          anchorRows: 0,
          costUsd: 0,
          errorCode: null
        })
        continue
      }

      const result = await executeDrillDown(snapshot, decision.reason, rowLimit)

      costUsd += result.costUsd

      if (result.outcome === 'drilled') drilled += 1
      else if (result.outcome === 'already_evaluated') alreadyEvaluated += 1
      else if (result.outcome === 'budget_blocked') budgetBlocked += 1
      else failed += 1

      outcomes.push(result)
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_backlink_detail_pass' },
        extra: { backlinkSnapshotId: snapshot.backlink_snapshot_id }
      })

      failed += 1
      outcomes.push({
        backlinkSnapshotId: snapshot.backlink_snapshot_id,
        seoTargetId: snapshot.seo_target_id,
        outcome: 'failed',
        triggerReason: null,
        referringDomainRows: 0,
        anchorRows: 0,
        costUsd: 0,
        errorCode: 'unexpected_error'
      })
    }
  }

  return {
    snapshots: snapshots.length,
    drilled,
    skipped,
    alreadyEvaluated,
    budgetBlocked,
    failed,
    costUsd: Number(costUsd.toFixed(6)),
    outcomes
  }
}
