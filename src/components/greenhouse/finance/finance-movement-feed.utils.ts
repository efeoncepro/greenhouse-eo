import type {
  FinanceMovementFeedItem,
  FinanceMovementProviderIdentity,
  FinanceMovementStatus,
  FinanceMovementVisual
} from './finance-movement-feed.types'

export const FINANCE_MOVEMENT_STATUS_LABELS: Record<FinanceMovementStatus, string> = {
  pending: 'Pendiente',
  suggested: 'Sugerido',
  matched: 'Conciliado',
  excluded: 'Excluido',
  review: 'Revisar'
}

export const getFinanceMovementStatusLabel = (item: FinanceMovementFeedItem): string | null => {
  if (!item.status) return null

  if (item.status === 'pending') {
    if (item.direction === 'in' || item.sourceType === 'cash_in') return 'Cobro pendiente'
    if (item.direction === 'out' || item.sourceType === 'cash_out') return 'Pago pendiente'
  }

  if (item.status === 'suggested') return 'Sugerido AI'

  return FINANCE_MOVEMENT_STATUS_LABELS[item.status]
}

export const FINANCE_MOVEMENT_STATUS_COLORS: Record<FinanceMovementStatus, 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  pending: 'warning',
  suggested: 'info',
  matched: 'success',
  excluded: 'secondary',
  review: 'error'
}

const DAY_FORMATTER = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  weekday: 'long',
  day: '2-digit',
  month: 'long'
})

const DAY_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export const formatFinanceMovementAmount = (amount: number, currency: string) => {
  const formatted = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2
  }).format(Math.abs(amount))

  return amount < 0 ? `-${formatted}` : formatted
}

export const getFinanceMovementDayKey = (date: string | null): string => {
  if (!date) return 'undated'

  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) return date

  return DAY_KEY_FORMATTER.format(parsed)
}

export const getFinanceMovementDayLabel = (date: string | null): string => {
  if (!date) return 'Sin fecha'

  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'

  const label = DAY_FORMATTER.format(parsed)

  return label.charAt(0).toUpperCase() + label.slice(1)
}

export const getInitials = (value: string | null | undefined): string => {
  const words = String(value ?? '')
    .replace(/[^a-zA-ZÀ-ÿ0-9\s.-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return '•'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

const resolveCatalogVisual = (
  identity: FinanceMovementProviderIdentity | null | undefined
): FinanceMovementVisual | null => {
  if (!identity) return null

  const label = identity.providerName || identity.providerId || 'Proveedor'
  const logoStatus = identity.logoStatus ?? 'fallback'

  if (identity.iconUrl && logoStatus === 'verified') {
    return {
      kind: 'provider_logo',
      label,
      logoUrl: identity.iconUrl,
      logoStatus,
      initials: identity.initials ?? getInitials(label),
      color: 'primary',
      tone: identity.tone
    }
  }

  return {
    kind: 'initials',
    label,
    initials: identity.initials ?? getInitials(label),
    logoStatus,
    color: 'primary',
    tone: identity.tone
  }
}

export const resolveFinanceMovementVisual = (
  item: FinanceMovementFeedItem,
  catalogs?: {
    providerCatalog?: Record<string, FinanceMovementProviderIdentity>
    paymentProviderCatalog?: Record<string, FinanceMovementProviderIdentity>
  }
): FinanceMovementVisual => {
  if (item.visual) return item.visual

  const paymentProvider = item.paymentProviderSlug
    ? resolveCatalogVisual(catalogs?.paymentProviderCatalog?.[item.paymentProviderSlug])
    : null

  if (paymentProvider) return paymentProvider

  const provider = item.providerId
    ? resolveCatalogVisual(catalogs?.providerCatalog?.[item.providerId])
    : null

  if (provider) return provider

  if (item.direction === 'in') {
    return {
      kind: 'semantic_icon',
      label: 'Ingreso',
      icon: 'tabler-arrow-down-left',
      color: 'success'
    }
  }

  if (item.sourceType === 'cash_out' || item.direction === 'out') {
    return {
      kind: 'semantic_icon',
      label: 'Egreso',
      icon: item.sourceType === 'tooling_provider' ? 'tabler-tools' : 'tabler-arrow-up-right',
      color: 'warning'
    }
  }

  return {
    kind: 'semantic_icon',
    label: 'Movimiento financiero',
    icon: 'tabler-arrows-exchange',
    color: 'secondary'
  }
}

export const groupFinanceMovementItems = (items: FinanceMovementFeedItem[]) => {
  const groups = new Map<string, { label: string; items: FinanceMovementFeedItem[] }>()

  items.forEach(item => {
    const key = getFinanceMovementDayKey(item.date)
    const current = groups.get(key) ?? { label: getFinanceMovementDayLabel(item.date), items: [] }

    current.items.push(item)
    groups.set(key, current)
  })

  return [...groups.entries()].map(([key, group]) => ({ key, ...group }))
}
