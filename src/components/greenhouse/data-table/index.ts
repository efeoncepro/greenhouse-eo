// TASK-743 — Operational Data Table Density Contract barrel.

export { default as DataTableShell } from './DataTableShell'
export type { DataTableShellProps } from './DataTableShell'

export {
  TableDensityProvider,
  useTableDensity,
  useTableDensityResolution
} from './useTableDensity'
export type {
  TableDensityContextValue,
  UseTableDensityResolutionInput,
  UseTableDensityResolutionResult
} from './useTableDensity'

export {
  DENSITY_TOKENS,
  DEFAULT_TABLE_DENSITY,
  DENSITY_DEGRADE_BREAKPOINTS,
  TABLE_DENSITY_COOKIE,
  TABLE_DENSITY_COOKIE_MAX_AGE_DAYS,
  isTableDensity,
  degradeDensityForWidth,
  compareDensity
} from './density'
export type { DensityTokens, TableDensity } from './density'
