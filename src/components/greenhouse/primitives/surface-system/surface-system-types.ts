import type { ReactNode } from 'react'

export type SurfaceRecipeKind =
  | 'operationalWorkbench'
  | 'listDetail'
  | 'commandCenter'
  | 'reviewStudio'
  | 'analyticsReport'
  | 'settingsFlow'

export type WorkbenchHeaderVariant = 'operational' | 'report' | 'settings'
export type WorkbenchHeaderKind = 'workbench' | 'commandCenter' | 'report' | 'settings' | 'custom'
export type SignalStripVariant = 'operational' | 'narrative' | 'exception' | 'integrated'
export type SignalStripKind = 'health' | 'insight' | 'risk' | 'custom'
export type SelectionRowVariant = 'comfortable' | 'compact' | 'review'
export type SelectionRowKind = 'inventory' | 'entity' | 'evidence' | 'settings' | 'custom'
export type DetailHeroVariant = 'entity' | 'evidence' | 'report'
export type DetailHeroKind = DetailHeroVariant | 'custom'
export type ContextCommandBarVariant = 'contextual' | 'review' | 'settings'
export type ContextCommandBarKind = 'workbench' | 'review' | 'settings' | 'custom'
export type OperationalSectionVariant = 'standard' | 'quiet' | 'emphasized' | 'open' | 'band'
export type OperationalSectionKind = 'content' | 'evidence' | 'decision' | 'custom'
export type PreviewStageVariant = 'artifact' | 'evidence' | 'live'
export type PreviewStageKind = PreviewStageVariant | 'custom'
export type SurfaceSignalTone = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'

export interface SurfaceSignal {
  id: string
  label: ReactNode
  value: ReactNode
  detail?: ReactNode
  iconClassName?: string
  tone?: SurfaceSignalTone
}
