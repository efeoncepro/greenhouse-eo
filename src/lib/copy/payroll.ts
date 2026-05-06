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

// ─── Nexa Insights Namespace ──────────────────────────────────────────────
