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

export const GH_PAYROLL_COMPLIANCE_EXPORTS = {
  previredLabel: 'Previred',
  lreLabel: 'LRE',
  previredDownloadError: 'No pudimos generar Previred. Revisa que el periodo este cerrado y que todos tengan RUT verificado.',
  lreDownloadError: 'No pudimos generar LRE. Revisa que el periodo este cerrado y que todos tengan RUT verificado.',
  previredAria: (periodLabel: string) => `Descargar Previred del periodo ${periodLabel}`,
  lreAria: (periodLabel: string) => `Descargar LRE del periodo ${periodLabel}`
} as const

// ─── Nexa Insights Namespace ──────────────────────────────────────────────
