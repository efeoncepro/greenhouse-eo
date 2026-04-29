import { describe, expect, it } from 'vitest'

import type { FinanceMovementFeedItem } from './finance-movement-feed.types'
import {
  formatFinanceMovementAmount,
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
})
