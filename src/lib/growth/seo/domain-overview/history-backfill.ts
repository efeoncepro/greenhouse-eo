/**
 * TASK-1775 — Backfill histórico de la trayectoria de un dominio vía DataForSEO Labs
 * `historical_rank_overview`.
 *
 * Resuelve la limitación estructural del módulo: nació forward-only y a un cliente nuevo no
 * se le puede mostrar su propio pasado. Este endpoint devuelve la serie mensual (rankings +
 * tráfico estimado) de CUALQUIER dominio desde 2020-10.
 *
 * 🔴 **Cuesta 10× el resto de Labs** (USD 0.12/request + USD 0.0012/fila-mes) y su dato es
 * pasado INMUTABLE: se compra UNA vez por sujeto, jamás en un cron. Por eso:
 *   - vive detrás de un runner con `--dry-run` por defecto y `--apply` explícito;
 *   - lleva TOPE DURO en USD por corrida (`maxUsd`), además del gate de entitlement;
 *   - el pre-check es de EXISTENCIA por (sujeto, mes): meses ya presentes no se re-compran,
 *     y una corrida interrumpida se reanuda pidiendo sólo el rango faltante;
 *   - un mes del rango pedido sin dato del proveedor deja fila con NULLs — sin ella el mes
 *     nunca queda "presente" y se re-compraría para siempre (invariante TASK-1661). Esto
 *     además hace la cobertura CONTIGUA por construcción: el rango faltante es un intervalo.
 */

import 'server-only'

import { postDataForSeoTask } from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  SEO_DOMAIN_OVERVIEW_AGGREGATE_TYPE,
  SEO_DOMAIN_OVERVIEW_SNAPSHOT_CAPTURED_EVENT
} from '../contracts'
import { enforceSeoRunEntitlement } from '../entitlement'
import { isSeoModuleEnabled } from '../flags'
import { LABS_HISTORICAL_RESULT_ROW_USD, LABS_HISTORICAL_TASK_SETUP_USD } from '../provider-pricing'
import { parseDomainOverviewSide, type DomainRankOverviewItemRaw } from './capture'
import {
  buildNullSnapshot,
  normalizeOverviewDomain,
  persistDomainOverviewSnapshots,
  type SeoDomainOverviewSnapshotInput
} from './persist'

/** Mínimo documentado del proveedor para `date_from` (doc as-of 2026-08-27). */
export const HISTORY_MIN_MONTH = '2020-10'

/**
 * Tope duro DEFAULT en USD por corrida. Conservador a propósito: ~40 sujetos con ~70 meses
 * cada uno. Se sobre-escribe con `--max-usd`, pero nunca desaparece — el backfill es la
 * única corrida del módulo capaz de quemar el presupuesto de varias orgs en una tarde.
 */
export const HISTORY_DEFAULT_MAX_USD = 5

/** `YYYY-MM` del primer día del mes de una fecha ISO. */
const toMonthKey = (iso: string): string => iso.slice(0, 7)

/** Meses `YYYY-MM` inclusivos entre dos claves. Puro y exportado para el preview y los tests. */
export const monthsBetween = (fromMonth: string, toMonth: string): string[] => {
  const [fromYear, fromM] = fromMonth.split('-').map(Number)
  const [toYear, toM] = toMonth.split('-').map(Number)

  if (!fromYear || !fromM || !toYear || !toM) return []

  const months: string[] = []
  let year = fromYear
  let month = fromM

  while (year < toYear || (year === toYear && month <= toM)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1

    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return months
}

/** Costo determinista del backfill de UN sujeto. Puro: preview y runner comparten la fuente. */
export const estimateHistoryCost = (pendingMonths: number): { estimatedCostUsd: number; formula: string } => {
  const total = pendingMonths === 0 ? 0 : LABS_HISTORICAL_TASK_SETUP_USD + pendingMonths * LABS_HISTORICAL_RESULT_ROW_USD

  return {
    estimatedCostUsd: Number(total.toFixed(6)),
    formula:
      pendingMonths === 0
        ? 'sin meses pendientes — costo 0'
        : `USD ${LABS_HISTORICAL_TASK_SETUP_USD} (task setup histórico, 10× el Labs normal) + ` +
          `${pendingMonths} mes(es) × USD ${LABS_HISTORICAL_RESULT_ROW_USD}`
  }
}

export interface HistoricalRankOverviewItemRaw extends DomainRankOverviewItemRaw {
  year?: number | null
  month?: number | null
}

/**
 * Proyecta los items históricos a snapshots persistibles (capture_date = primer día del mes)
 * y completa con filas NULL los meses del rango pedido que el proveedor no devolvió.
 * Pura y exportada: se prueba sin base ni red.
 */
export const projectHistoryItems = (
  items: readonly HistoricalRankOverviewItemRaw[],
  context: { domain: string; locationCode: string; languageCode: string; requestedMonths: readonly string[] }
): { snapshots: SeoDomainOverviewSnapshotInput[]; monthsWithData: number; monthsWithoutData: number } => {
  const byMonth = new Map<string, HistoricalRankOverviewItemRaw>()

  for (const item of items) {
    if (typeof item.year !== 'number' || typeof item.month !== 'number') continue

    byMonth.set(`${item.year}-${String(item.month).padStart(2, '0')}`, item)
  }

  const snapshots: SeoDomainOverviewSnapshotInput[] = []
  let monthsWithData = 0
  let monthsWithoutData = 0

  for (const monthKey of context.requestedMonths) {
    const item = byMonth.get(monthKey)
    const captureDate = `${monthKey}-01`

    if (!item) {
      monthsWithoutData += 1
      snapshots.push(
        buildNullSnapshot({
          domain: context.domain,
          locationCode: context.locationCode,
          languageCode: context.languageCode,
          captureDate,
          sourceEndpoint: 'historical_rank_overview'
        })
      )
      continue
    }

    const organic = parseDomainOverviewSide(item.metrics?.organic)
    const paid = parseDomainOverviewSide(item.metrics?.paid)

    monthsWithData += 1
    snapshots.push({
      normalizedDomain: normalizeOverviewDomain(context.domain),
      domain: context.domain,
      locationCode: context.locationCode,
      languageCode: context.languageCode,
      captureDate,
      sourceEndpoint: 'historical_rank_overview',
      organic,
      paid: { count: paid.count, etv: paid.etv, estimatedPaidTrafficCostUsd: paid.estimatedPaidTrafficCostUsd }
    })
  }

  return { snapshots, monthsWithData, monthsWithoutData }
}

export type HistoryBackfillSubjectStatus =
  | 'seeded'
  /** Todos los meses del rango ya presentes: cero llamadas, costo cero. */
  | 'already_seeded'
  /** El proveedor respondió OK sin un solo mes con dato: quedan filas NULL (hecho con fecha). */
  | 'no_history'
  /** El tope duro en USD de la corrida no alcanza para este sujeto. */
  | 'cap_blocked'
  | 'budget_blocked'
  | 'provider_error'

export interface HistoryBackfillSubjectOutcome {
  domain: string
  status: HistoryBackfillSubjectStatus
  pendingMonths: number
  monthsWithData: number
  providerCostUsd: number
  errorCode: string | null
}

export interface HistoryBackfillPlanSubject {
  domain: string
  pendingMonths: string[]
  estimatedCostUsd: number
  formula: string
}

export type HistoryBackfillPlan =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      locationCode: string
      languageCode: string
      fromMonth: string
      toMonth: string
      maxUsd: number
      subjects: HistoryBackfillPlanSubject[]
      totalEstimatedCostUsd: number
      /** true si el estimado total supera el tope duro: la corrida se recortaría. */
      exceedsCap: boolean
    }
  | { ok: false; errorCode: 'disabled' | 'target_not_found' | 'invalid_range' | 'no_subjects'; status: null }

export type HistoryBackfillResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      subjects: number
      seeded: number
      alreadySeeded: number
      noHistory: number
      capBlocked: number
      budgetBlocked: number
      providerErrors: number
      snapshotsWritten: number
      costUsd: number
      maxUsd: number
      outcomes: HistoryBackfillSubjectOutcome[]
    }
  | {
      ok: false
      errorCode:
        | 'disabled'
        | 'target_not_found'
        | 'invalid_range'
        | 'no_subjects'
        | 'no_entitlement'
        | 'expired'
        | 'budget_exhausted'
        | 'quota_exhausted'
      status: null
    }

type ResolvedTarget = {
  seo_target_id: string
  organization_id: string
  root_domain: string
  location_code: string
  language_code: string
}

const loadTarget = async (seoTargetId: string): Promise<ResolvedTarget | null> => {
  const rows = await runGreenhousePostgresQuery<ResolvedTarget>(
    `SELECT seo_target_id, organization_id, root_domain, location_code, language_code
       FROM greenhouse_growth.seo_targets
      WHERE seo_target_id = $1
        AND status = 'active'`,
    [seoTargetId]
  )

  return rows[0] ?? null
}

const loadCompetitorDomains = async (seoTargetId: string): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<{ competitor_domain: string }>(
    `SELECT competitor_domain
       FROM greenhouse_growth.seo_competitors
      WHERE seo_target_id = $1
        AND effective_to IS NULL
      ORDER BY competitor_domain`,
    [seoTargetId]
  )

  return rows.map(row => row.competitor_domain)
}

/** Meses YA presentes para un sujeto (source histórico), dentro del rango pedido. */
const loadExistingMonths = async (input: {
  normalizedDomain: string
  locationCode: string
  languageCode: string
  fromDate: string
  toDate: string
}): Promise<Set<string>> => {
  const rows = await runGreenhousePostgresQuery<{ capture_date: Date | string }>(
    `SELECT capture_date
       FROM greenhouse_growth.seo_domain_overview_snapshots
      WHERE normalized_domain = $1
        AND location_code = $2
        AND language_code = $3
        AND source_endpoint = 'historical_rank_overview'
        AND capture_date BETWEEN $4::date AND $5::date`,
    [input.normalizedDomain, input.locationCode, input.languageCode, input.fromDate, input.toDate]
  )

  return new Set(
    rows.map(row =>
      row.capture_date instanceof Date ? toMonthKey(row.capture_date.toISOString()) : toMonthKey(String(row.capture_date))
    )
  )
}

const resolveSubjects = (target: ResolvedTarget, competitors: string[], allowlist?: readonly string[]): string[] => {
  const byNormalized = new Map<string, string>()

  for (const raw of [target.root_domain, ...competitors]) {
    const normalized = normalizeOverviewDomain(raw)

    if (normalized && !byNormalized.has(normalized)) byNormalized.set(normalized, raw)
  }

  if (!allowlist || allowlist.length === 0) return [...byNormalized.values()]

  // La allowlist FILTRA sujetos declarados del target; un dominio arbitrario fuera del
  // universo del target se compra desde su propio target, no colado en esta corrida.
  const allowed = new Set(allowlist.map(normalizeOverviewDomain))

  return [...byNormalized.entries()].filter(([normalized]) => allowed.has(normalized)).map(([, raw]) => raw)
}

const isValidMonthKey = (value: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(value)

interface HistoryRangeInput {
  seoTargetId: string
  /** Allowlist de dominios (subconjunto del universo target+competidores). Vacío = todos. */
  domains?: readonly string[]
  /** `YYYY-MM`; default el mínimo del proveedor (2020-10). */
  fromMonth?: string
  /** `YYYY-MM`; default el mes pasado (el mes en curso aún no es histórico). */
  toMonth?: string
  maxUsd?: number
}

const resolveRange = (input: HistoryRangeInput): { fromMonth: string; toMonth: string } | null => {
  const now = new Date()
  const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const defaultTo = `${previousMonth.getUTCFullYear()}-${String(previousMonth.getUTCMonth() + 1).padStart(2, '0')}`

  const fromMonth = input.fromMonth ?? HISTORY_MIN_MONTH
  const toMonth = input.toMonth ?? defaultTo

  if (!isValidMonthKey(fromMonth) || !isValidMonthKey(toMonth)) return null
  if (fromMonth < HISTORY_MIN_MONTH || fromMonth > toMonth) return null

  return { fromMonth, toMonth }
}

const buildPlanSubjects = async (
  target: ResolvedTarget,
  subjects: string[],
  range: { fromMonth: string; toMonth: string }
): Promise<HistoryBackfillPlanSubject[]> => {
  const plan: HistoryBackfillPlanSubject[] = []

  for (const domain of subjects) {
    const existing = await loadExistingMonths({
      normalizedDomain: normalizeOverviewDomain(domain),
      locationCode: target.location_code,
      languageCode: target.language_code,
      fromDate: `${range.fromMonth}-01`,
      toDate: `${range.toMonth}-01`
    })

    const pendingMonths = monthsBetween(range.fromMonth, range.toMonth).filter(month => !existing.has(month))
    const { estimatedCostUsd, formula } = estimateHistoryCost(pendingMonths.length)

    plan.push({ domain, pendingMonths, estimatedCostUsd, formula })
  }

  return plan
}

/**
 * DRY RUN del backfill: qué meses faltan por sujeto y cuánto costaría, sin gastar. Es el
 * modo por defecto del runner; la corrida con gasto exige `--apply` sobre este número.
 */
export const previewDomainRankHistoryBackfill = async (input: HistoryRangeInput): Promise<HistoryBackfillPlan> => {
  if (!isSeoModuleEnabled()) return { ok: false, errorCode: 'disabled', status: null }

  const target = await loadTarget(input.seoTargetId)

  if (!target) return { ok: false, errorCode: 'target_not_found', status: null }

  const range = resolveRange(input)

  if (!range) return { ok: false, errorCode: 'invalid_range', status: null }

  const competitors = await loadCompetitorDomains(target.seo_target_id)
  const subjects = resolveSubjects(target, competitors, input.domains)

  if (subjects.length === 0) return { ok: false, errorCode: 'no_subjects', status: null }

  const planSubjects = await buildPlanSubjects(target, subjects, range)

  const totalEstimatedCostUsd = Number(
    planSubjects.reduce((sum, subject) => sum + subject.estimatedCostUsd, 0).toFixed(6)
  )

  const maxUsd = input.maxUsd ?? HISTORY_DEFAULT_MAX_USD

  return {
    ok: true,
    seoTargetId: target.seo_target_id,
    organizationId: target.organization_id,
    locationCode: target.location_code,
    languageCode: target.language_code,
    fromMonth: range.fromMonth,
    toMonth: range.toMonth,
    maxUsd,
    subjects: planSubjects,
    totalEstimatedCostUsd,
    exceedsCap: totalEstimatedCostUsd > maxUsd
  }
}

/**
 * Backfill real. GASTA (10× el Labs normal). Corre UNA vez por sujeto: los meses presentes
 * no se re-piden, y el tope duro `maxUsd` corta la corrida aunque el entitlement permita más.
 */
export const backfillDomainRankHistory = async (input: HistoryRangeInput): Promise<HistoryBackfillResult> => {
  const plan = await previewDomainRankHistoryBackfill(input)

  if (!plan.ok) return { ok: false, errorCode: plan.errorCode, status: null }

  const pendingSubjects = plan.subjects.filter(subject => subject.pendingMonths.length > 0)

  const outcomes: HistoryBackfillSubjectOutcome[] = plan.subjects
    .filter(subject => subject.pendingMonths.length === 0)
    .map(subject => ({
      domain: subject.domain,
      status: 'already_seeded' as const,
      pendingMonths: 0,
      monthsWithData: 0,
      providerCostUsd: 0,
      errorCode: null
    }))

  let seeded = 0
  let noHistory = 0
  let capBlocked = 0
  let budgetBlocked = 0
  let providerErrors = 0
  let snapshotsWritten = 0
  let costUsd = 0

  const finalize = (): HistoryBackfillResult => ({
    ok: true,
    seoTargetId: plan.seoTargetId,
    organizationId: plan.organizationId,
    subjects: plan.subjects.length,
    seeded,
    alreadySeeded: outcomes.filter(outcome => outcome.status === 'already_seeded').length,
    noHistory,
    capBlocked,
    budgetBlocked,
    providerErrors,
    snapshotsWritten,
    costUsd: Number(costUsd.toFixed(6)),
    maxUsd: plan.maxUsd,
    outcomes
  })

  if (pendingSubjects.length === 0) return finalize()

  const gate = await enforceSeoRunEntitlement(plan.organizationId, {
    estimatedCostUsd: plan.totalEstimatedCostUsd,
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    const reason = gate.blockedReason

    return {
      ok: false,
      errorCode:
        reason === 'expired' || reason === 'budget_exhausted' || reason === 'quota_exhausted' ? reason : 'no_entitlement',
      status: null
    }
  }

  for (const subject of pendingSubjects) {
    // 🔴 Tope DURO de la corrida: independiente del entitlement. Se evalúa con el estimado
    // ANTES de llamar — pasarse un poco después de pagar es aceptable; empezar una llamada
    // que ya se sabe fuera del tope, no.
    if (costUsd + subject.estimatedCostUsd > plan.maxUsd) {
      capBlocked += 1
      outcomes.push({
        domain: subject.domain,
        status: 'cap_blocked',
        pendingMonths: subject.pendingMonths.length,
        monthsWithData: 0,
        providerCostUsd: 0,
        errorCode: 'max_usd_cap'
      })
      continue
    }

    const fence = await enforceSeoRunEntitlement(plan.organizationId, {
      estimatedCostUsd: subject.estimatedCostUsd,
      consumesAuditAllowance: false
    })

    if (!fence.allowed) {
      budgetBlocked += 1
      outcomes.push({
        domain: subject.domain,
        status: 'budget_blocked',
        pendingMonths: subject.pendingMonths.length,
        monthsWithData: 0,
        providerCostUsd: 0,
        errorCode: fence.blockedReason ?? 'budget_exhausted'
      })
      continue
    }

    // La cobertura es contigua por construcción (meses sin dato dejan fila NULL), así que el
    // rango faltante es [primer pendiente, último pendiente] y no se re-pagan meses presentes.
    const fromMonth = subject.pendingMonths[0]
    const toMonth = subject.pendingMonths[subject.pendingMonths.length - 1]
    const requestedMonths = monthsBetween(fromMonth, toMonth)

    try {
      const response = await postDataForSeoTask({
        family: 'labs',
        endpoint: '/v3/dataforseo_labs/google/historical_rank_overview/live',
        organizationId: plan.organizationId,
        tasks: [
          {
            target: normalizeOverviewDomain(subject.domain),
            location_code: Number(plan.locationCode),
            language_code: plan.languageCode,
            date_from: `${fromMonth}-01`,
            date_to: `${toMonth}-01`,
            // `correlate` correlaciona con datasets previos del proveedor; el default true
            // está bien para una serie continua. Clickstream DUPLICA el costo y no aporta.
            include_clickstream_data: false
          }
        ]
      })

      const providerCostUsd = response.cost ?? 0

      costUsd += providerCostUsd

      const task = (response.tasks?.[0] ?? {}) as {
        status_code?: number
        result?: Array<{ items?: HistoricalRankOverviewItemRaw[] }>
      }

      if (!response.ok || task.status_code !== 20000) {
        providerErrors += 1
        outcomes.push({
          domain: subject.domain,
          status: 'provider_error',
          pendingMonths: subject.pendingMonths.length,
          monthsWithData: 0,
          providerCostUsd,
          errorCode: `task_status_${String(task.status_code ?? response.httpStatus)}`
        })
        continue
      }

      const items = task.result?.[0]?.items ?? []

      const { snapshots, monthsWithData } = projectHistoryItems(items, {
        domain: subject.domain,
        locationCode: plan.locationCode,
        languageCode: plan.languageCode,
        requestedMonths
      })

      const { rowsWritten } = await persistDomainOverviewSnapshots({
        snapshots,
        capturedByOrganizationId: plan.organizationId,
        providerCostUsd
      })

      snapshotsWritten += rowsWritten

      if (monthsWithData > 0) {
        seeded += 1
        outcomes.push({
          domain: subject.domain,
          status: 'seeded',
          pendingMonths: subject.pendingMonths.length,
          monthsWithData,
          providerCostUsd,
          errorCode: null
        })
      } else {
        // El proveedor respondió bien y no tiene historia del sujeto: hecho, no error. Las
        // filas NULL quedan con fecha para no volver a comprar el rango.
        noHistory += 1
        outcomes.push({
          domain: subject.domain,
          status: 'no_history',
          pendingMonths: subject.pendingMonths.length,
          monthsWithData: 0,
          providerCostUsd,
          errorCode: null
        })
      }
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_domain_rank_history_backfill' },
        extra: { seoTargetId: plan.seoTargetId, domain: subject.domain }
      })

      providerErrors += 1
      outcomes.push({
        domain: subject.domain,
        status: 'provider_error',
        pendingMonths: subject.pendingMonths.length,
        monthsWithData: 0,
        providerCostUsd: 0,
        errorCode: 'provider_unreachable'
      })
    }
  }

  if (snapshotsWritten > 0) {
    await publishOutboxEvent({
      aggregateType: SEO_DOMAIN_OVERVIEW_AGGREGATE_TYPE,
      aggregateId: plan.seoTargetId,
      eventType: SEO_DOMAIN_OVERVIEW_SNAPSHOT_CAPTURED_EVENT,
      payload: {
        seoTargetId: plan.seoTargetId,
        organizationId: plan.organizationId,
        captureDate: null,
        subjects: plan.subjects.length,
        captured: seeded,
        noMarketData: noHistory,
        snapshotsWritten,
        costUsd: Number(costUsd.toFixed(6)),
        actor: 'history_backfill_runner'
      }
    })
  }

  return finalize()
}
