/**
 * TASK-811 — domain microcopy extracted from src/config/greenhouse-nomenclature.ts.
 *
 * This module keeps domain-specific visible copy out of the product
 * nomenclature/navigation contract while preserving type-safe GH_* ergonomics.
 * Do not rewrite strings in this file as part of trim-only work.
 */

export const GH_PAYROLL_PROJECTED_ARIA = {
  promoteToOfficial: ({ hasOfficial, monthLabel, year }: { hasOfficial: boolean; monthLabel: string; year: number }) =>
    hasOfficial
      ? `Recalcular nómina oficial para ${monthLabel} ${year}`
      : `Crear borrador oficial para ${monthLabel} ${year}`
} as const

/**
 * TASK-893 V1.1 follow-up — microcopy canonical para AttendanceRing cuando
 * `participationWindowWorkingDays != null` (miembro mid-month entry/exit).
 *
 * Regla canonical: cualquier surface que muestre attendance para un miembro
 * con `prorationFactor < 1` debe mostrar AMBOS período total (calendar
 * context) + participation effective days (member context). Single-number
 * renders son operator-confusing.
 *
 * UX rationale (arch-architect verdict): "13 / 21 hábiles" + tooltip con
 * fechas cumple el principio "no mentir + no confundir". "Sin ausencias en
 * ventana de participación" reemplaza "Asistencia completa" cuando factor < 1
 * porque el miembro no estaba contratado en los días previos al ingreso
 * (no es ausencia, es no-participación).
 */
export const GH_PAYROLL_PARTICIPATION_WINDOW = {
  attendanceRingCompactLabel: (effective: number, periodTotal: number) =>
    `${effective} / ${periodTotal} hábiles`,
  attendanceRingTooltip: (entryDateLabel: string, exitDateLabel: string | null) =>
    exitDateLabel
      ? `Ventana de participación: ${entryDateLabel} al ${exitDateLabel}`
      : `Ingreso: ${entryDateLabel}`,
  noAbsencesInWindow: 'Sin ausencias en ventana de participación',
  absencesInWindow: (count: number) =>
    `${count} ausencia${count > 1 ? 's' : ''} en ventana de participación`
} as const

/**
 * Date formatter canonical es-CL para etiquetas de fecha en participation
 * window tooltips. Acepta ISO YYYY-MM-DD y retorna "DD/MM/YYYY".
 *
 * NUNCA hacer parsing inline con `new Date()` — riesgo de timezone shift
 * que muestra "12/05" cuando el dato es "2026-05-13" (off-by-one).
 */
export const formatParticipationDateForLabel = (iso: string | null | undefined): string => {
  if (!iso || iso.length < 10) return ''

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)

  if (!match) return iso

  return `${match[3]}/${match[2]}/${match[1]}`
}

export const GH_PAYROLL_COMPLIANCE_EXPORTS = {
  previredLabel: 'Previred',
  lreLabel: 'LRE',
  previredDownloadError: 'No pudimos generar Previred. Revisa que el periodo este cerrado y que todos tengan RUT verificado.',
  lreDownloadError: 'No pudimos generar LRE. Revisa que el periodo este cerrado y que todos tengan RUT verificado.',
  previredAria: (periodLabel: string) => `Descargar Previred del periodo ${periodLabel}`,
  lreAria: (periodLabel: string) => `Descargar LRE del periodo ${periodLabel}`
} as const

// ─── Nexa Insights Namespace ──────────────────────────────────────────────
