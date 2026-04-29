// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import FinanceMovementFeed from './FinanceMovementFeed'
import { FINANCE_MOVEMENT_PROVIDER_CATALOG } from './finance-movement-provider-catalog'
import type { FinanceMovementFeedItem } from './finance-movement-feed.types'

const items: FinanceMovementFeedItem[] = [
  {
    id: 'exp-pay-1',
    date: '2026-04-29',
    title: 'HubSpot — Marketing Hub Starter + Sales Hub Pro + Service Hub Pro',
    amount: -187350,
    currency: 'CLP',
    direction: 'out',
    status: 'pending',
    sourceType: 'cash_out',
    sourceId: 'exp-pay-1',
    instrumentName: 'Santander Corp.',
    instrumentCategory: 'bank_account',
    paymentProviderSlug: 'santander',
    details: [{ label: 'Origen', value: 'Cash-out' }]
  },
  {
    id: 'inc-pay-1',
    date: '2026-04-29',
    title: 'Transferencia recibida de Efeonce',
    amount: 1106321,
    currency: 'CLP',
    direction: 'in',
    status: 'matched',
    sourceType: 'cash_in',
    sourceId: 'inc-pay-1',
    runningBalance: 4537844
  }
]

describe('FinanceMovementFeed', () => {
  it('renders movement titles, statuses and amounts', () => {
    const { getByLabelText, getByText } = renderWithTheme(
      <FinanceMovementFeed
        title='Movimientos financieros'
        items={[{ ...items[0], providerId: 'hubspot' }, items[1] as FinanceMovementFeedItem]}
        providerCatalog={FINANCE_MOVEMENT_PROVIDER_CATALOG}
        summaryItems={[
          {
            id: 'pending',
            label: 'Cola visible',
            value: '2 movimientos',
            helper: 'Cobros y pagos sin match',
            icon: 'tabler-list-search',
            tone: 'warning'
          }
        ]}
        lastUpdatedLabel='Actualizado 10:32'
        showRunningBalance
      />
    )

    expect(getByText('Cola visible')).toBeInTheDocument()
    expect(getByText('Actualizado 10:32')).toBeInTheDocument()
    expect(getByText('HubSpot — Marketing Hub Starter + Sales Hub Pro + Service Hub Pro')).toBeInTheDocument()
    expect(getByLabelText('HubSpot')).toBeInTheDocument()
    expect(getByLabelText('Instrumento: Santander Corp.')).toBeInTheDocument()
    expect(getByLabelText('Instrumento: Santander Corp.').querySelector('img[alt="Santander"]')).toBeInTheDocument()
    expect(getByText('Pago pendiente')).toBeInTheDocument()
    expect(getByText('Conciliado')).toBeInTheDocument()
    expect(getByText('-$187.350')).toBeInTheDocument()
    expect(getByText((_, element) => element?.textContent === 'Saldo: $4.537.844')).toBeInTheDocument()
  })

  it('renders the empty state when there are no items', () => {
    const { getByText } = renderWithTheme(
      <FinanceMovementFeed
        items={[]}
        emptyTitle='Sin movimientos de caja pendientes'
        emptyDescription='No hay cobros ni pagos esperando match bancario.'
      />
    )

    expect(getByText('Sin movimientos de caja pendientes')).toBeInTheDocument()
    expect(getByText('No hay cobros ni pagos esperando match bancario.')).toBeInTheDocument()
  })
})
