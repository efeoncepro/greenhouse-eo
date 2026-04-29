import { describe, expect, it } from 'vitest'

import type { FinanceMovementFeedItem } from './finance-movement-feed.types'
import {
  FINANCE_MOVEMENT_PROVIDER_CATALOG,
  inferFinanceMovementProviderId
} from './finance-movement-provider-catalog'
import {
  formatFinanceMovementAmount,
  getFinanceMovementStatusLabel,
  groupFinanceMovementItems,
  resolveFinanceMovementVisual
} from './finance-movement-feed.utils'

const baseItem: FinanceMovementFeedItem = {
  id: 'mov-1',
  date: '2026-04-29',
  title: 'HubSpot subscription',
  amount: -187350,
  currency: 'CLP',
  direction: 'out',
  status: 'pending',
  sourceType: 'cash_out',
  sourceId: 'exp-pay-1'
}

describe('finance-movement-feed utils', () => {
  it('formats CLP without decimals', () => {
    expect(formatFinanceMovementAmount(-187350, 'CLP')).toBe('-$187.350')
  })

  it('groups movements by Chile calendar day', () => {
    const groups = groupFinanceMovementItems([
      baseItem,
      { ...baseItem, id: 'mov-2', date: '2026-04-29', sourceId: 'exp-pay-2' },
      { ...baseItem, id: 'mov-3', date: '2026-04-28', sourceId: 'exp-pay-3' }
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0]?.items).toHaveLength(2)
    expect(groups[1]?.items).toHaveLength(1)
  })

  it('uses verified provider logos but falls back when logo status is not verified', () => {
    const verified = resolveFinanceMovementVisual(
      { ...baseItem, providerId: 'hubspot' },
      {
        providerCatalog: {
          hubspot: {
            providerId: 'hubspot',
            providerName: 'HubSpot',
            iconUrl: '/hubspot.svg',
            logoStatus: 'verified'
          }
        }
      }
    )

    expect(verified.kind).toBe('provider_logo')
    expect(verified.logoUrl).toBe('/hubspot.svg')

    const fallback = resolveFinanceMovementVisual(
      { ...baseItem, providerId: 'envato' },
      {
        providerCatalog: {
          envato: {
            providerId: 'envato',
            providerName: 'Envato',
            iconUrl: '/envato.svg',
            logoStatus: 'fallback'
          }
        }
      }
    )

    expect(fallback.kind).toBe('initials')
    expect(fallback.initials).toBe('EN')
  })

  it('infers known SaaS providers from operational movement text', () => {
    expect(inferFinanceMovementProviderId({ title: 'HubSpot — Marketing Hub Starter + Sales Hub Pro' })).toBe('hubspot')
    expect(inferFinanceMovementProviderId({ title: 'Envato Elements (compra TC corp)' })).toBe('envato')
    expect(inferFinanceMovementProviderId({ title: 'Google Play / Workspace charges' })).toBe('google')
  })

  it('keeps cash-out visuals in the warning family instead of primary blue', () => {
    const visual = resolveFinanceMovementVisual(baseItem)

    expect(visual.kind).toBe('semantic_icon')
    expect(visual.color).toBe('warning')
  })

  it('uses branded local provider tones when a known provider is resolved', () => {
    const visual = resolveFinanceMovementVisual(
      { ...baseItem, providerId: 'hubspot' },
      { providerCatalog: FINANCE_MOVEMENT_PROVIDER_CATALOG }
    )

    expect(visual.kind).toBe('provider_logo')
    expect(visual.tone?.text).toBeTruthy()
  })

  it('uses direction-specific pending labels', () => {
    expect(getFinanceMovementStatusLabel(baseItem)).toBe('Pago pendiente')
    expect(getFinanceMovementStatusLabel({ ...baseItem, direction: 'in', sourceType: 'cash_in' })).toBe('Cobro pendiente')
  })
})
