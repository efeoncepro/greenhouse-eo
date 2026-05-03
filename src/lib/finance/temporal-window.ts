import 'server-only'

import type { TemporalMode } from './instrument-presentation'

/**
 * TASK-776 — Helper canónico para resolver la ventana temporal de un drawer
 * o dashboard de cuenta finance.
 *
 * Tres modos canónicos (declarados en `instrument-presentation.ts`):
 *
 *   - `snapshot`: rolling window desde hoy hacia atrás N días (default 30).
 *     Caso de uso: "qué pasa con esta cuenta hoy". KPIs + chart 12m + lista
 *     últimos N días. NO consume year+month aunque vengan en input.
 *
 *   - `period`: un mes calendario específico (year + month required).
 *     Caso de uso: "estoy cerrando Mayo 2026". Filtra movimientos al mes
 *     exacto. KPIs muestran cierre del período.
 *
 *   - `audit`: histórico completo desde anchor OTB.
 *     Caso de uso: "auditoría completa". Movimientos desde `anchorDate`
 *     (genesis_date del active OTB) hasta hoy. Sin filtro mes/window.
 *
 * Output: `{fromDate, toDate, modeResolved, label}` listo para inyectar
 * en SQL embebido y para renderizar el chip header del drawer.
 *
 * Reglas duras:
 *   - NUNCA calcular `fromDate`/`toDate` inline en consumers. Toda
 *     resolución pasa por este helper.
 *   - NUNCA mezclar modos en un mismo render (e.g. KPIs `period` + lista
 *     `snapshot`). Los 3 modos son atómicos por surface.
 *   - Para nuevos modos (e.g. `quarter`, `ytd`), agregar al enum
 *     `TemporalMode` y extender este helper. NO hardcodear en consumers.
 */

export interface ResolveTemporalWindowInput {
  mode: TemporalMode
  /** Required only when mode='period'. */
  year?: number
  /** Required only when mode='period'. */
  month?: number
  /** Required only when mode='audit'. ISO date YYYY-MM-DD. */
  anchorDate?: string | null
  /** Only applies when mode='snapshot'. Default 30. */
  windowDays?: number
  /** Override "today" — only for tests. Default = new Date(). */
  today?: Date
}

export interface ResolvedTemporalWindow {
  /** ISO YYYY-MM-DD inclusive. */
  fromDate: string
  /** ISO YYYY-MM-DD inclusive. */
  toDate: string
  /** Echo back the mode used (after fallback resolution if input was incomplete). */
  modeResolved: TemporalMode
  /** Human-readable label for chip header, e.g. "Últimos 30 días" / "Mayo 2026" / "Desde 07/04/2026". */
  label: string
  /** Number of days in the window (informational, used by UI hints). */
  spanDays: number
}

const MONTH_LABELS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

const ymd = (date: Date): string => {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

const formatDateLabel = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number)

  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

const daysBetween = (fromIso: string, toIso: string): number => {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime()
  const to = new Date(`${toIso}T00:00:00Z`).getTime()

  return Math.max(0, Math.round((to - from) / 86_400_000)) + 1
}

export const resolveTemporalWindow = (input: ResolveTemporalWindowInput): ResolvedTemporalWindow => {
  const today = input.today ?? new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  if (input.mode === 'snapshot') {
    const windowDays = input.windowDays && input.windowDays > 0 ? input.windowDays : 30
    const toDate = ymd(todayUtc)
    const fromDateObj = new Date(todayUtc)

    fromDateObj.setUTCDate(fromDateObj.getUTCDate() - (windowDays - 1))

    const fromDate = ymd(fromDateObj)

    return {
      fromDate,
      toDate,
      modeResolved: 'snapshot',
      label: `Últimos ${windowDays} días`,
      spanDays: windowDays
    }
  }

  if (input.mode === 'period') {
    if (!input.year || !input.month) {
      // Defensive fallback: degrade to snapshot (most informative default)
      // instead of throwing. Keeps drawer functional even if caller forgot
      // year+month.
      return resolveTemporalWindow({
        mode: 'snapshot',
        windowDays: input.windowDays ?? 30,
        today
      })
    }

    const fromDateObj = new Date(Date.UTC(input.year, input.month - 1, 1))
    const toDateObj = new Date(Date.UTC(input.year, input.month, 0)) // last day of month
    const fromDate = ymd(fromDateObj)
    const toDate = ymd(toDateObj)
    const monthLabel = MONTH_LABELS_ES[input.month - 1]
    const labelMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

    return {
      fromDate,
      toDate,
      modeResolved: 'period',
      label: `${labelMonth} ${input.year}`,
      spanDays: daysBetween(fromDate, toDate)
    }
  }

  // mode === 'audit'
  if (!input.anchorDate) {
    // No anchor declared yet — degrade to snapshot, NOT silently break.
    return resolveTemporalWindow({
      mode: 'snapshot',
      windowDays: input.windowDays ?? 30,
      today
    })
  }

  const fromDate = input.anchorDate
  const toDate = ymd(todayUtc)

  return {
    fromDate,
    toDate,
    modeResolved: 'audit',
    label: `Desde ${formatDateLabel(fromDate)}`,
    spanDays: daysBetween(fromDate, toDate)
  }
}
