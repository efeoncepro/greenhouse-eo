import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1169 Slice 3 — `delivery.attributable_lateness.member_month_paridad`.
 *
 * Detector UPSTREAM del bug class de cohorte 2026-06-19: leer la corrección de
 * freeze (M2 shadow, por-tarea PG) como si fuera el OTD mensual del bono produce
 * cohortes incomparables (shadow 0-50% vs bono 66-100%). Ese error se encontró a
 * mano; este signal lo detecta antes de que lo encuentre una UI/decisión rota.
 *
 * Lee la tabla `greenhouse_delivery.otd_attributable_member_month_shadow` del
 * período más reciente materializado y mide:
 *   (a) **comparabilidad de cohorte** — % de member-months `cohort_mismatch`
 *       (la enumeración de candidatos NO reproduce el legacy del bono). Steady=0.
 *   (b) **divergencia legacy↔corregido** (informativa, no alerta): cuántos
 *       member-months `valid` donde el freeze mueve el OTD. La divergencia es
 *       ESPERADA (el freeze corrige); lo que se vigila es la incomparabilidad.
 *
 * Cero EXTRACT(EPOCH) / date-math (gate SQL Signal Reader, CLAUDE.md TASK-893):
 * solo agregaciones de conteo sobre el período más reciente.
 *
 * Subsystem rollup: `delivery`. Steady state: 0% cohort_mismatch.
 *
 * Severity matrix:
 *   - 0 member-months materializados → `unknown` (materializer no corrió)
 *   - cohort_mismatch == 0%          → `ok` (cohorte comparable; corregido confiable)
 *   - 0% < mismatch ≤ 10%            → `warning` (revisar antes del cutover TASK-1170)
 *   - mismatch > 10%                 → `error` (cohorte incomparable — NO cutover)
 *
 * Cross-ref: ADR GREENHOUSE_ATTRIBUTABLE_LATENESS_V1 §16.10 + TASK-1169.
 */

export const OTD_ATTRIBUTABLE_MEMBER_MONTH_PARITY_SIGNAL_ID =
  'delivery.attributable_lateness.member_month_paridad'

const WARNING_THRESHOLD_PCT = 0
const ERROR_THRESHOLD_PCT = 10

const QUERY_SQL = `
  WITH latest AS (
    SELECT period_year, period_month
    FROM greenhouse_delivery.otd_attributable_member_month_shadow
    ORDER BY period_year DESC, period_month DESC
    LIMIT 1
  )
  SELECT
    l.period_year,
    l.period_month,
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE s.data_status = 'cohort_mismatch')::int AS mismatch,
    COUNT(*) FILTER (WHERE s.cohort_reproduced)::int AS reproduced,
    COUNT(*) FILTER (
      WHERE s.data_status IN ('valid', 'no_freeze_data')
        AND s.otd_pct_corrected IS NOT NULL
        AND s.otd_pct_legacy IS NOT NULL
        AND s.otd_pct_corrected > s.otd_pct_legacy
    )::int AS diverged,
    COALESCE(SUM(s.improvable_candidate_count), 0)::int AS candidates,
    COALESCE(SUM(s.freeze_covered_count), 0)::int AS covered,
    MAX(s.computed_at) AS computed_at
  FROM greenhouse_delivery.otd_attributable_member_month_shadow s
  JOIN latest l
    ON s.period_year = l.period_year AND s.period_month = l.period_month
  GROUP BY l.period_year, l.period_month
`

type SignalRow = {
  period_year: number
  period_month: number
  total: number
  mismatch: number
  reproduced: number
  diverged: number
  candidates: number
  covered: number
  computed_at: string | Date | null
  [key: string]: unknown
}

export const getOtdAttributableMemberMonthParitySignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<SignalRow>(QUERY_SQL)
      const row = rows[0]

      const total = Number(row?.total ?? 0)
      const mismatch = Number(row?.mismatch ?? 0)
      const reproduced = Number(row?.reproduced ?? 0)
      const diverged = Number(row?.diverged ?? 0)
      const candidates = Number(row?.candidates ?? 0)
      const covered = Number(row?.covered ?? 0)

      const periodLabel = row
        ? `${row.period_year}-${String(row.period_month).padStart(2, '0')}`
        : '—'

      const coveragePct = candidates > 0 ? Math.round((covered / candidates) * 1000) / 10 : 0
      const mismatchPct = total > 0 ? Math.round((mismatch / total) * 1000) / 10 : 0

      const severity: 'ok' | 'warning' | 'error' | 'unknown' =
        total === 0
          ? 'unknown'
          : mismatchPct <= WARNING_THRESHOLD_PCT
            ? 'ok'
            : mismatchPct <= ERROR_THRESHOLD_PCT
              ? 'warning'
              : 'error'

      const summary =
        total === 0
          ? 'OTD imputable member×month sin materializar — corré el materializador para iniciar el reloj de shadow.'
          : severity === 'ok'
            ? `Cohorte comparable en ${periodLabel}: ${reproduced}/${total} member-months reproducen el legacy del bono (0% mismatch). ${diverged} con divergencia de freeze; cobertura M2 ${coveragePct}%.`
            : severity === 'warning'
              ? `Comparabilidad de cohorte parcial en ${periodLabel}: ${mismatch}/${total} member-months no reproducen el legacy (${mismatchPct}%). Revisar antes del cutover TASK-1170.`
              : `Cohorte incomparable en ${periodLabel}: ${mismatch}/${total} member-months no reproducen el legacy (${mismatchPct}%). NO avanzar cutover TASK-1170 — el corregido no es confiable.`

      return {
        signalId: OTD_ATTRIBUTABLE_MEMBER_MONTH_PARITY_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'drift',
        source: 'getOtdAttributableMemberMonthParitySignal',
        label: 'OTD imputable member×month — comparabilidad de cohorte',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              'greenhouse_delivery.otd_attributable_member_month_shadow (período más reciente) — cohort_mismatch rate + divergencia + cobertura'
          },
          { kind: 'metric', label: 'period', value: periodLabel },
          { kind: 'metric', label: 'member_months', value: String(total) },
          { kind: 'metric', label: 'cohort_mismatch_pct', value: String(mismatchPct) },
          { kind: 'metric', label: 'cohort_reproduced', value: String(reproduced) },
          { kind: 'metric', label: 'freeze_divergence', value: String(diverged) },
          { kind: 'metric', label: 'm2_coverage_pct', value: String(coveragePct) },
          { kind: 'metric', label: 'warning_threshold_pct', value: String(WARNING_THRESHOLD_PCT) },
          { kind: 'metric', label: 'error_threshold_pct', value: String(ERROR_THRESHOLD_PCT) },
          {
            kind: 'doc',
            label: 'Helper canonical (source of truth)',
            value: 'src/lib/notion-metrics/otd-attributable-member-month.ts'
          },
          {
            kind: 'doc',
            label: 'ADR',
            value: 'docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md §16.10'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'delivery', {
        tags: { source: 'reliability_signal_otd_attributable_member_month_parity' }
      })

      return {
        signalId: OTD_ATTRIBUTABLE_MEMBER_MONTH_PARITY_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'drift',
        source: 'getOtdAttributableMemberMonthParitySignal',
        label: 'OTD imputable member×month — comparabilidad de cohorte',
        severity: 'unknown',
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [
          {
            kind: 'metric',
            label: 'error',
            value: error instanceof Error ? error.message : String(error)
          }
        ]
      }
    }
  }
