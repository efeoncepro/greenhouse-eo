export type GreenhouseBreadcrumbsVariant = 'default' | 'compact'

export type GreenhouseBreadcrumbsKind =
  | 'pageHierarchy'
  | 'workbenchHierarchy'
  | 'designSystemSpecimen'
  | 'legacy'
  | 'custom'

export type GreenhouseBreadcrumbsSeparator = 'slash' | 'chevron'

export const GREENHOUSE_BREADCRUMBS_VARIANTS = ['default', 'compact'] as const

export const GREENHOUSE_BREADCRUMBS_KIND_DEFAULT_VARIANT = {
  pageHierarchy: 'default',
  workbenchHierarchy: 'compact',
  designSystemSpecimen: 'default',
  legacy: 'compact',
  custom: 'default'
} as const satisfies Record<GreenhouseBreadcrumbsKind, GreenhouseBreadcrumbsVariant>

export const GREENHOUSE_BREADCRUMBS_KIND_DEFAULT_SEPARATOR = {
  pageHierarchy: 'slash',
  workbenchHierarchy: 'slash',
  designSystemSpecimen: 'slash',
  legacy: 'chevron',
  custom: 'slash'
} as const satisfies Record<GreenhouseBreadcrumbsKind, GreenhouseBreadcrumbsSeparator>

export const GREENHOUSE_BREADCRUMBS_VARIANT_CONFIG = {
  default: {
    labelVariant: 'body1',
    iconSize: 20,
    gap: 0.5,
    maxItems: undefined,
    description: 'Full page hierarchy navigation based on the AXIS Breadcrumbs default component.'
  },
  compact: {
    labelVariant: 'body2',
    iconSize: 16,
    gap: 0.5,
    maxItems: 4,
    description: 'Dense hierarchy for workbenches, inspectors and legacy detail headers.'
  }
} as const

export const resolveGreenhouseBreadcrumbsVariant = ({
  kind,
  variant
}: {
  kind?: GreenhouseBreadcrumbsKind
  variant?: GreenhouseBreadcrumbsVariant
}): GreenhouseBreadcrumbsVariant => variant ?? GREENHOUSE_BREADCRUMBS_KIND_DEFAULT_VARIANT[kind ?? 'custom']

export const resolveGreenhouseBreadcrumbsSeparator = ({
  kind,
  separator
}: {
  kind?: GreenhouseBreadcrumbsKind
  separator?: GreenhouseBreadcrumbsSeparator
}): GreenhouseBreadcrumbsSeparator => separator ?? GREENHOUSE_BREADCRUMBS_KIND_DEFAULT_SEPARATOR[kind ?? 'custom']
