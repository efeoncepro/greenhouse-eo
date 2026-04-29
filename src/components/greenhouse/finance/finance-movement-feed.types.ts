import type { ReactNode } from 'react'

export type FinanceMovementDirection = 'in' | 'out' | 'neutral'

export type FinanceMovementStatus = 'pending' | 'suggested' | 'matched' | 'excluded' | 'review'

export type FinanceMovementSourceType =
  | 'bank_statement'
  | 'cash_in'
  | 'cash_out'
  | 'settlement_leg'
  | 'suggestion'
  | 'payment_provider'
  | 'tooling_provider'
  | 'unknown'

export type FinanceMovementVisualKind = 'provider_logo' | 'initials' | 'semantic_icon'

export type FinanceMovementLogoStatus = 'verified' | 'fallback' | 'missing'

export type FinanceMovementVisual = {
  kind: FinanceMovementVisualKind
  label: string
  icon?: string
  initials?: string
  logoUrl?: string | null
  logoStatus?: FinanceMovementLogoStatus
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary'
  tone?: {
    source: string
    bg: string
    text: string
    border?: string
  }
}

export type FinanceMovementProviderIdentity = {
  providerId?: string | null
  providerName?: string | null
  iconUrl?: string | null
  logoStatus?: FinanceMovementLogoStatus
  initials?: string | null
  tone?: FinanceMovementVisual['tone']
}

export type FinanceMovementDetail = {
  label: string
  value: ReactNode
}

export type FinanceMovementFeedSummaryTone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary'

export type FinanceMovementFeedSummaryItem = {
  id: string
  label: string
  value: ReactNode
  helper?: ReactNode
  icon?: string
  tone?: FinanceMovementFeedSummaryTone
}

export type FinanceMovementFeedItem = {
  id: string
  date: string | null
  title: string
  description?: string | null
  counterparty?: string | null
  instrumentName?: string | null
  instrumentCategory?: string | null
  amount: number
  currency: string
  direction: FinanceMovementDirection
  status?: FinanceMovementStatus
  sourceType: FinanceMovementSourceType
  sourceId: string
  runningBalance?: number | null
  providerId?: string | null
  toolCatalogId?: string | null
  paymentProviderSlug?: string | null
  confidence?: number | null
  visual?: FinanceMovementVisual
  details?: FinanceMovementDetail[]
  href?: string
  disabled?: boolean
}

export type FinanceMovementFeedDensity = 'comfortable' | 'compact'

export type FinanceMovementFeedProps = {
  items: FinanceMovementFeedItem[]
  title?: string
  subtitle?: string
  density?: FinanceMovementFeedDensity
  loading?: boolean
  error?: string | null
  emptyTitle?: string
  emptyDescription?: string
  showRunningBalance?: boolean
  summaryItems?: FinanceMovementFeedSummaryItem[]
  lastUpdatedLabel?: string | null
  showDayTotals?: boolean
  virtualized?: boolean
  virtualizeThreshold?: number
  estimateItemSize?: number
  overscan?: number
  maxHeight?: number
  providerCatalog?: Record<string, FinanceMovementProviderIdentity>
  paymentProviderCatalog?: Record<string, FinanceMovementProviderIdentity>
  embedded?: boolean
  onItemSelect?: (item: FinanceMovementFeedItem) => void
}
