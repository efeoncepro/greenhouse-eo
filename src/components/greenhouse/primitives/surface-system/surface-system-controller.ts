import type {
  ContextCommandBarKind,
  ContextCommandBarVariant,
  DetailHeroKind,
  DetailHeroVariant,
  OperationalSectionKind,
  OperationalSectionVariant,
  PreviewStageKind,
  PreviewStageVariant,
  SelectionRowKind,
  SelectionRowVariant,
  SignalStripKind,
  SignalStripVariant,
  SurfaceRecipeKind,
  WorkbenchHeaderKind,
  WorkbenchHeaderVariant
} from './surface-system-types'

export const SURFACE_RECIPE_COMPOSITIONS = {
  operationalWorkbench: 'masterDetail',
  listDetail: 'masterDetail',
  commandCenter: 'leadPlusContext',
  reviewStudio: 'split',
  analyticsReport: 'single',
  settingsFlow: 'focused'
} as const satisfies Record<SurfaceRecipeKind, 'masterDetail' | 'leadPlusContext' | 'split' | 'single' | 'focused'>

const resolveVariant = <Kind extends string, Variant extends string>(
  kind: Kind,
  explicit: Variant | undefined,
  mapping: Record<Kind, Variant>
): Variant => explicit ?? mapping[kind]

export const resolveWorkbenchHeaderVariant = (kind: WorkbenchHeaderKind, variant?: WorkbenchHeaderVariant) =>
  resolveVariant(kind, variant, {
    workbench: 'operational',
    commandCenter: 'operational',
    report: 'report',
    settings: 'settings',
    custom: 'operational'
  })

export const resolveSignalStripVariant = (kind: SignalStripKind, variant?: SignalStripVariant) =>
  resolveVariant(kind, variant, { health: 'operational', insight: 'narrative', risk: 'exception', custom: 'operational' })

export const resolveSelectionRowVariant = (kind: SelectionRowKind, variant?: SelectionRowVariant) =>
  resolveVariant(kind, variant, {
    inventory: 'comfortable',
    entity: 'compact',
    evidence: 'review',
    settings: 'compact',
    custom: 'comfortable'
  })

export const resolveDetailHeroVariant = (kind: DetailHeroKind, variant?: DetailHeroVariant) =>
  resolveVariant(kind, variant, { entity: 'entity', evidence: 'evidence', report: 'report', custom: 'entity' })

export const resolveContextCommandBarVariant = (kind: ContextCommandBarKind, variant?: ContextCommandBarVariant) =>
  resolveVariant(kind, variant, {
    workbench: 'contextual',
    review: 'review',
    settings: 'settings',
    custom: 'contextual'
  })

export const resolveOperationalSectionVariant = (kind: OperationalSectionKind, variant?: OperationalSectionVariant) =>
  resolveVariant(kind, variant, {
    content: 'standard',
    evidence: 'quiet',
    decision: 'emphasized',
    custom: 'standard'
  })

export const resolvePreviewStageVariant = (kind: PreviewStageKind, variant?: PreviewStageVariant) =>
  resolveVariant(kind, variant, { artifact: 'artifact', evidence: 'evidence', live: 'live', custom: 'artifact' })
