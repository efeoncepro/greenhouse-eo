/**
 * TASK-1303 — Command gobernado de captura de rank (`captureRankSnapshot`).
 *
 * El backend de la pantalla ancla de EPIC-022: por cada keyword vigente del target ×
 * engine × device pega DataForSEO SERP (familia `serp` del registry TASK-1300) y persiste
 * la medición del día en `greenhouse_growth.seo_rank_snapshots` (append-only, inmutable).
 *
 * Contratos duros:
 * - **Gate de costo ANTES de gastar** (riesgo #1 del programa): `enforceSeoRunEntitlement`
 *   con `estimatedCostUsd` del batch completo + spend fence (re-consulta cada K llamadas).
 *   El rank capture no consume audit runs → `consumesAuditAllowance: false`.
 * - **Idempotencia sin gasto**: los combos ya capturados en el `capture_date` se filtran
 *   ANTES de pegar el provider (el trigger de TASK-1299 bloquea UPDATE incondicionalmente,
 *   así que el INSERT lleva `ON CONFLICT DO NOTHING` solo como guardia de carrera).
 * - **El ledger de gasto lo escribe el TRANSPORTE** (`postDataForSeoTask`, TASK-1300):
 *   acá solo se pasa `organizationId` y se persiste `provider_cost` como procedencia por
 *   fila. Sumarlo al presupuesto sería doble conteo. El runtime que ejecute este command
 *   debe importar `@/lib/growth/seo/register-provider-spend` en su entrypoint.
 * - **Honest degradation**: elegibles > 0 con 0 capturados NUNCA es `succeeded`.
 * - **Mirror BQ vía outbox**: el command emite `growth.seo.rank_snapshot.captured`; el
 *   consumer reactivo re-lee PG y espeja — nunca un INSERT/MERGE inline a BigQuery acá.
 */

import 'server-only'

import { randomUUID } from 'node:crypto'

import {
  DATAFORSEO_DEFAULT_ORGANIC_ENDPOINT,
  postDataForSeoTask,
  type DataForSeoSerpTask
} from '@/lib/ai/dataforseo'
import { getSantiagoDateParts } from '@/lib/calendar/business-time'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
  SEO_RANK_SNAPSHOT_CAPTURED_EVENT,
  type SeoRankCaptureComboOutcome,
  type SeoRankCaptureResult,
  type SeoRankCaptureStatus,
  type SeoRankDevice
} from './contracts'
import { enforceSeoRunEntitlement } from './entitlement'
import { isSeoModuleEnabled } from './flags'

/**
 * Estimación conservadora por llamada SERP live/advanced con los parámetros de captura.
 *
 * Fórmula del proveedor (skill `dataforseo-operator`, as-of 2026-08-06):
 * `cost = base × C × K × (depth/10)` — base live advanced ~0.002; C=×2 por
 * `load_async_ai_overview`; depth 20 = ×2 → ~USD 0.008/call. Se redondea a 0.01 para que
 * el gate/fence sobreestime. El costo REAL lo reporta el provider y lo contabiliza el
 * transporte en el ledger — esta constante solo alimenta el gate.
 *
 * Follow-up de escala declarado: SERP task-based standard es ~3.3× más barato, pero exige
 * ampliar el transporte canónico (`task_get` es GET-por-path y `postDataForSeoTask` es
 * POST-only) — trabajo gobernado, no un fetch suelto.
 */
export const SERP_RANK_CAPTURE_ESTIMATED_COST_USD = 0.01

/**
 * Top-20: la pantalla ancla cuenta la historia "subió de 8 a 3" y el striking distance
 * vive en 8–20 — el default del proveedor (10) la dejaría ciega. Cada +10 de depth
 * multiplica el costo (D/10 en la fórmula), así que 20 es el balance V1.
 */
export const SERP_RANK_CAPTURE_DEPTH = 20

/**
 * Cada cuántas llamadas cobradas se re-consulta el gate (spend fence, deuda declarada por
 * TASK-1300: el gate una-vez sobregiró 3× un budget trial en un batch de 120 keywords).
 */
export const SPEND_FENCE_RECHECK_EVERY = 10

/** V1 captura Google (el endpoint del registry es SERP Google organic live/advanced). */
const SUPPORTED_ENGINES: ReadonlySet<string> = new Set(['google'])

/**
 * El schema (TASK-1299) admite `tablet`, pero la SERP API de DataForSEO solo acepta
 * desktop|mobile — pedir tablet en V1 es un caller roto, no una degradación.
 */
const SUPPORTED_DEVICES: ReadonlySet<SeoRankDevice> = new Set(['desktop', 'mobile'])

const DEFAULT_ENGINES = ['google']
const DEFAULT_DEVICES: SeoRankDevice[] = ['desktop']

export interface CaptureRankSnapshotOptions {
  /** Engines a capturar. V1 solo soporta `google`; otros valores lanzan (error de programación). */
  engines?: string[]
  /** Devices a capturar (default `['desktop']` — cada device duplica el costo del batch). */
  devices?: SeoRankDevice[]
  /** YYYY-MM-DD explícito; default = hoy en America/Santiago. */
  captureDate?: string
}

// Type alias (no interface): el generic de `runGreenhousePostgresQuery` exige la index
// signature implícita que las interfaces no tienen.
type TargetRow = {
  seo_target_id: string
  organization_id: string
  root_domain: string
  location_code: string
  language_code: string
  status: string
}

interface ComboKey {
  keyword: string
  engine: string
  device: SeoRankDevice
}

export interface SerpRankObservation {
  position: number | null
  url: string | null
  serpFeatures: string[]
}

/** Hoy en America/Santiago (la serie es diaria y el cron corre ~05:00 CLT). */
export const resolveSantiagoCaptureDate = (at?: Date): string => {
  const parts = getSantiagoDateParts(at ?? new Date())

  if (!parts) {
    throw new Error('resolveSantiagoCaptureDate: no se pudo resolver la fecha en America/Santiago')
  }

  const month = String(parts.month).padStart(2, '0')
  const day = String(parts.day).padStart(2, '0')

  return `${parts.year}-${month}-${day}`
}

const normalizeDomain = (raw: string): string => {
  let value = raw.trim().toLowerCase()

  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
  value = value.split('/')[0] ?? value
  value = value.replace(/^www\./, '')

  return value
}

const extractHost = (url: string): string | null => {
  try {
    return normalizeDomain(new URL(url.startsWith('http') ? url : `https://${url}`).hostname)
  } catch {
    return null
  }
}

const isOwnDomain = (candidate: string, rootDomain: string): boolean =>
  candidate === rootDomain || candidate.endsWith(`.${rootDomain}`)

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

/**
 * Parser puro de la respuesta SERP: recorre `tasks[] → result[] → items[]`, junta los
 * tipos de elemento presentes (SERP features) y busca el primer item `organic` cuyo
 * dominio pertenezca al target (`position` = `rank_group`, fallback `rank_absolute`).
 *
 * `position: null` con parse exitoso significa "la keyword se midió y el dominio no
 * rankea en la profundidad consultada" — es una medición válida, no un error.
 */
export const parseSerpRankObservation = (tasks: unknown[], rootDomain: string): SerpRankObservation => {
  const root = normalizeDomain(rootDomain)
  const featureTypes = new Set<string>()

  let position: number | null = null
  let url: string | null = null

  for (const task of tasks) {
    const taskRecord = asRecord(task)
    const results = Array.isArray(taskRecord?.result) ? taskRecord.result : []

    for (const result of results) {
      const resultRecord = asRecord(result)
      const items = Array.isArray(resultRecord?.items) ? resultRecord.items : []

      for (const item of items) {
        const itemRecord = asRecord(item)

        if (!itemRecord) continue

        const type = typeof itemRecord.type === 'string' ? itemRecord.type : null

        if (type && type !== 'organic') {
          featureTypes.add(type)
        }

        if (position !== null || type !== 'organic') continue

        const itemUrl = typeof itemRecord.url === 'string' ? itemRecord.url : null

        const itemDomain =
          typeof itemRecord.domain === 'string' && itemRecord.domain.trim() !== ''
            ? normalizeDomain(itemRecord.domain)
            : itemUrl
              ? extractHost(itemUrl)
              : null

        if (!itemDomain || !isOwnDomain(itemDomain, root)) continue

        const rankGroup = typeof itemRecord.rank_group === 'number' ? itemRecord.rank_group : null
        const rankAbsolute = typeof itemRecord.rank_absolute === 'number' ? itemRecord.rank_absolute : null
        const resolved = rankGroup ?? rankAbsolute

        if (resolved !== null && Number.isFinite(resolved) && resolved > 0) {
          position = Math.trunc(resolved)
          url = itemUrl
        }
      }
    }
  }

  return { position, url, serpFeatures: [...featureTypes].sort() }
}

const buildSerpTask = (
  keyword: string,
  target: TargetRow,
  device: Exclude<SeoRankDevice, 'tablet'>
): DataForSeoSerpTask => {
  const task: DataForSeoSerpTask = {
    keyword,
    language_code: target.language_code,
    device,
    depth: SERP_RANK_CAPTURE_DEPTH,

    // Sin este flag, los AI Overviews asíncronos NO aparecen y "AI Overview presente/no"
    // (promesa §5 del arch doc) tendría falso negativo silencioso. Duplica el costo del
    // request — ya incluido en la estimación del gate.
    load_async_ai_overview: true
  }

  // TASK-1299 guarda `location_code` como TEXT: numérico = location_code de DataForSEO;
  // cualquier otra cosa se pasa como location_name (p. ej. "Chile").
  if (/^\d+$/.test(target.location_code.trim())) {
    task.location_code = Number(target.location_code.trim())
  } else {
    task.location_name = target.location_code
  }

  return task
}

const mapBlockedReason = (
  reason: 'no_entitlement' | 'expired' | 'quota_exhausted' | 'budget_exhausted' | null
): 'no_entitlement' | 'expired' | 'budget_exhausted' => {
  if (reason === 'expired') return 'expired'
  if (reason === 'budget_exhausted' || reason === 'quota_exhausted') return 'budget_exhausted'

  return 'no_entitlement'
}

const insertSnapshot = async (input: {
  seoTargetId: string
  keyword: string
  engine: string
  device: SeoRankDevice
  captureDate: string
  position: number | null
  url: string | null
  serpFeatures: string[]
  providerCostUsd: number
  sourceRunId: string
}): Promise<void> => {
  // El trigger anti-mutation de TASK-1299 bloquea UPDATE siempre: DO NOTHING es la única
  // resolución de conflicto posible y actúa solo como guardia de carrera (el pre-check ya
  // filtró los combos existentes).
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_growth.seo_rank_snapshots (
       seo_target_id, keyword, engine, device, capture_date,
       position, url, serp_features, provider_cost, source_run_id
     )
     VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8::jsonb, $9, $10)
     ON CONFLICT (seo_target_id, keyword, engine, device, capture_date) DO NOTHING`,
    [
      input.seoTargetId,
      input.keyword,
      input.engine,
      input.device,
      input.captureDate,
      input.position,
      input.url,
      JSON.stringify(input.serpFeatures),
      input.providerCostUsd,
      input.sourceRunId
    ]
  )
}

/**
 * Captura la medición diaria de rankings de un target.
 *
 * Command gobernado (Full API Parity): el cron del ops-worker es un caller de sistema;
 * un trigger manual (UI/Nexa) debe llegar vía propose → confirm → execute — el LLM nunca
 * lo dispara directo. `actor` queda en el payload del outbox event como rastro.
 */
export const captureRankSnapshot = async (
  seoTargetId: string,
  actor: string,
  options: CaptureRankSnapshotOptions = {}
): Promise<SeoRankCaptureResult> => {
  if (!isSeoModuleEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const engines = options.engines ?? DEFAULT_ENGINES
  const devices = options.devices ?? DEFAULT_DEVICES

  const unsupported = engines.filter(engine => !SUPPORTED_ENGINES.has(engine))

  if (unsupported.length > 0) {
    // Error de programación, no degradación: un engine no soportado en V1 es un caller roto.
    throw new Error(`captureRankSnapshot: engines no soportados en V1: ${unsupported.join(', ')}`)
  }

  const unsupportedDevices = devices.filter(device => !SUPPORTED_DEVICES.has(device))

  if (unsupportedDevices.length > 0) {
    throw new Error(`captureRankSnapshot: devices no soportados en V1: ${unsupportedDevices.join(', ')}`)
  }

  const targetRows = await runGreenhousePostgresQuery<TargetRow>(
    `SELECT seo_target_id, organization_id, root_domain, location_code, language_code, status
       FROM greenhouse_growth.seo_targets
      WHERE seo_target_id = $1`,
    [seoTargetId]
  )

  const target = targetRows[0]

  if (!target) {
    return { ok: false, errorCode: 'target_not_found', status: null }
  }

  if (target.status !== 'active') {
    return { ok: false, errorCode: 'target_not_active', status: null }
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

  const captureDate = options.captureDate ?? resolveSantiagoCaptureDate()

  // Idempotencia SIN gasto: lo ya capturado hoy se filtra antes de pegar el provider.
  const existingRows = await runGreenhousePostgresQuery<{ keyword: string; engine: string; device: string }>(
    `SELECT keyword, engine, device
       FROM greenhouse_growth.seo_rank_snapshots
      WHERE seo_target_id = $1
        AND capture_date = $2::date`,
    [seoTargetId, captureDate]
  )

  const existing = new Set(existingRows.map(row => `${row.keyword} ${row.engine} ${row.device}`))

  const combos: ComboKey[] = []
  const outcomes: SeoRankCaptureComboOutcome[] = []
  let alreadyCaptured = 0

  for (const { keyword } of keywordRows) {
    for (const engine of engines) {
      for (const device of devices) {
        if (existing.has(`${keyword} ${engine} ${device}`)) {
          alreadyCaptured += 1
          outcomes.push({
            keyword,
            engine,
            device,
            status: 'already_captured',
            position: null,
            url: null,
            providerCostUsd: 0,
            errorCode: null
          })
          continue
        }

        combos.push({ keyword, engine, device })
      }
    }
  }

  const sourceRunId = `seorun-${randomUUID()}`

  const buildSummary = (status: SeoRankCaptureStatus): SeoRankCaptureResult => ({
    ok: true,
    seoTargetId,
    organizationId: target.organization_id,
    captureDate,
    status,
    eligible: combos.length,
    captured: outcomes.filter(outcome => outcome.status === 'captured').length,
    alreadyCaptured,
    budgetBlocked: outcomes.filter(outcome => outcome.status === 'budget_blocked').length,
    providerErrors: outcomes.filter(outcome => outcome.status === 'provider_error').length,
    breakerOpen: outcomes.filter(outcome => outcome.status === 'breaker_open').length,
    costUsd: outcomes.reduce((total, outcome) => total + outcome.providerCostUsd, 0),
    sourceRunId,
    outcomes
  })

  if (combos.length === 0) {
    // Re-run del mismo día: todo estaba capturado. Cero llamadas, cero gasto.
    return buildSummary('skipped')
  }

  // Gate de costo con el estimado del BATCH COMPLETO (mitigación #1 del límite declarado
  // por TASK-1300). El rank capture no crea audit runs → no consume allowance.
  const gate = await enforceSeoRunEntitlement(target.organization_id, {
    estimatedCostUsd: combos.length * SERP_RANK_CAPTURE_ESTIMATED_COST_USD,
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    return { ok: false, errorCode: mapBlockedReason(gate.blockedReason), status: null }
  }

  let chargedCalls = 0
  let fenceTripped = false

  for (let index = 0; index < combos.length; index += 1) {
    const combo = combos[index]

    // Spend fence (mitigación #2): re-consulta el gate cada K llamadas cobradas con el
    // estimado de lo que RESTA. Si el presupuesto se agotó a mitad del batch, se frena
    // acá — no al día siguiente en la factura.
    if (chargedCalls > 0 && chargedCalls % SPEND_FENCE_RECHECK_EVERY === 0 && !fenceTripped) {
      const fence = await enforceSeoRunEntitlement(target.organization_id, {
        estimatedCostUsd: (combos.length - index) * SERP_RANK_CAPTURE_ESTIMATED_COST_USD,
        consumesAuditAllowance: false
      })

      if (!fence.allowed) {
        fenceTripped = true
      }
    }

    if (fenceTripped) {
      outcomes.push({
        ...combo,
        status: 'budget_blocked',
        position: null,
        url: null,
        providerCostUsd: 0,
        errorCode: 'budget_exhausted'
      })
      continue
    }

    try {
      // Una tarea por llamada, a propósito: `cost` viene a nivel batch en DataForSEO, así
      // que 1 task/call es la única forma de atribuir `provider_cost` exacto por fila
      // (límite documentado en dataforseo-families).
      const result = await postDataForSeoTask({
        family: 'serp',
        endpoint: DATAFORSEO_DEFAULT_ORGANIC_ENDPOINT,
        tasks: [buildSerpTask(combo.keyword, target, combo.device as Exclude<SeoRankDevice, 'tablet'>)],
        organizationId: target.organization_id
      })

      if (!result.ok) {
        if (result.breakerOpen) {
          // Familia caída: iterar el resto solo acumularía no-ops — se declara y se corta.
          for (let rest = index; rest < combos.length; rest += 1) {
            outcomes.push({
              ...combos[rest],
              status: 'breaker_open',
              position: null,
              url: null,
              providerCostUsd: 0,
              errorCode: 'breaker_open'
            })
          }

          break
        }

        outcomes.push({
          ...combo,
          status: 'provider_error',
          position: null,
          url: null,
          providerCostUsd: 0,
          errorCode: `http_${result.httpStatus}`
        })
        continue
      }

      chargedCalls += 1

      const cost = typeof result.cost === 'number' && Number.isFinite(result.cost) ? result.cost : 0
      const observation = parseSerpRankObservation(result.tasks, target.root_domain)

      await insertSnapshot({
        seoTargetId,
        keyword: combo.keyword,
        engine: combo.engine,
        device: combo.device,
        captureDate,
        position: observation.position,
        url: observation.url,
        serpFeatures: observation.serpFeatures,
        providerCostUsd: cost,
        sourceRunId
      })

      outcomes.push({
        ...combo,
        status: 'captured',
        position: observation.position,
        url: observation.url,
        providerCostUsd: cost,
        errorCode: null
      })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_rank_capture', family: 'serp' },
        extra: { seoTargetId, keyword: combo.keyword, device: combo.device, captureDate }
      })

      outcomes.push({
        ...combo,
        status: 'provider_error',
        position: null,
        url: null,
        providerCostUsd: 0,
        errorCode: 'unexpected_error'
      })
    }
  }

  const captured = outcomes.filter(outcome => outcome.status === 'captured').length

  // El mirror BQ es reactivo vía outbox: NUNCA un write inline a BigQuery desde acá.
  if (captured > 0) {
    await publishOutboxEvent({
      aggregateType: SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
      aggregateId: seoTargetId,
      eventType: SEO_RANK_SNAPSHOT_CAPTURED_EVENT,
      payload: {
        seoTargetId,
        organizationId: target.organization_id,
        captureDate,
        snapshotCount: captured,
        sourceRunId,
        actor
      }
    })
  }

  // Honest degradation: elegibles > 0 y 0 capturados jamás se reporta como éxito.
  const status: SeoRankCaptureStatus =
    captured === combos.length ? 'succeeded' : captured > 0 ? 'partial' : 'degraded'

  return buildSummary(status)
}
