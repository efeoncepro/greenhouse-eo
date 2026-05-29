import 'server-only'

// ─── Canonical period helper (timezone Santiago) ────────────────────────────
//
// Single source of truth para "current period (year, month)" en timezone
// canonical `America/Santiago`. Reusable cross-module: Home loaders, Nexa
// Insights surfaces (TASK-947 detail / TASK-950 list), futuras superficies.
//
// Antes existían 2 callsites duplicando este cálculo inline
// (`get-home-snapshot.ts` y `loaders/load-ai-insights-bento.ts`). TASK-950
// extrae a este helper para eliminar drift potencial entre callsites.

const HOME_PERIOD_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit'
})

export interface CurrentPeriod {
  year: number
  month: number
}

/**
 * Resuelve el período actual `{year, month}` en timezone canonical `America/
 * Santiago`. Source of truth para todos los consumers que necesiten "el mes
 * vigente para el operador" sin acoplarse a la timezone del runtime Vercel.
 */
export const getCurrentPeriodSantiago = (): CurrentPeriod => {
  const parts = HOME_PERIOD_FORMATTER.formatToParts(new Date())
  const year = Number(parts.find(part => part.type === 'year')?.value ?? new Date().getFullYear())
  const month = Number(parts.find(part => part.type === 'month')?.value ?? new Date().getMonth() + 1)

  return { year, month }
}

/**
 * Label es-CL canonical del período `MM/YYYY` (e.g. `05/2026`). Útil para
 * subtítulos UI que quieran mostrar período abreviado consistente cross-surface.
 */
export const formatPeriodLabel = ({ year, month }: CurrentPeriod): string =>
  `${String(month).padStart(2, '0')}/${year}`
