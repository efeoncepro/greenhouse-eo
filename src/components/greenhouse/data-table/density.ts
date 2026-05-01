// TASK-743 — Operational Data Table Density Contract.
// Spec: docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md

export type TableDensity = 'compact' | 'comfortable' | 'expanded'

export interface DensityTokens {
  rowHeight: number
  cellPaddingX: number
  cellPaddingY: number
  inlineEditorMinWidth: number
  showSliderInline: boolean
  showMinMaxCaption: boolean
  fontSize: string
}

export const DENSITY_TOKENS: Record<TableDensity, DensityTokens> = {
  compact: {
    rowHeight: 32,
    cellPaddingX: 4,
    cellPaddingY: 4,
    inlineEditorMinWidth: 84,
    showSliderInline: false,
    showMinMaxCaption: false,
    fontSize: '0.75rem'
  },
  comfortable: {
    rowHeight: 40,
    cellPaddingX: 8,
    cellPaddingY: 8,
    inlineEditorMinWidth: 110,
    showSliderInline: false,
    showMinMaxCaption: false,
    fontSize: '0.8125rem'
  },
  expanded: {
    rowHeight: 56,
    cellPaddingX: 12,
    cellPaddingY: 12,
    inlineEditorMinWidth: 150,
    showSliderInline: true,
    showMinMaxCaption: true,
    fontSize: '0.875rem'
  }
}

export const DEFAULT_TABLE_DENSITY: TableDensity = 'comfortable'

export const DENSITY_DEGRADE_BREAKPOINTS = {
  expandedToComfortable: 1400,
  comfortableToCompact: 1200
} as const

export const TABLE_DENSITY_COOKIE = 'gh-table-density'
export const TABLE_DENSITY_COOKIE_MAX_AGE_DAYS = 365

const DENSITY_ORDER: readonly TableDensity[] = ['expanded', 'comfortable', 'compact']

export const isTableDensity = (value: unknown): value is TableDensity =>
  value === 'compact' || value === 'comfortable' || value === 'expanded'

export const degradeDensityForWidth = (
  desired: TableDensity,
  containerWidth: number | null
): { density: TableDensity; degraded: boolean } => {
  if (containerWidth == null || containerWidth <= 0) {
    return { density: desired, degraded: false }
  }

  let current = desired

  if (current === 'expanded' && containerWidth < DENSITY_DEGRADE_BREAKPOINTS.expandedToComfortable) {
    current = 'comfortable'
  }

  if (current === 'comfortable' && containerWidth < DENSITY_DEGRADE_BREAKPOINTS.comfortableToCompact) {
    current = 'compact'
  }

  return { density: current, degraded: current !== desired }
}

export const compareDensity = (a: TableDensity, b: TableDensity): number =>
  DENSITY_ORDER.indexOf(a) - DENSITY_ORDER.indexOf(b)
