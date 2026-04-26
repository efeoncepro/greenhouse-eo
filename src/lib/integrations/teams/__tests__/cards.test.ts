import { describe, expect, it } from 'vitest'

import {
  buildDeliveryPulseCard,
  buildFinanceAlertCard,
  buildOpsAlertCard
} from '@/lib/integrations/teams/cards'

describe('buildOpsAlertCard', () => {
  it('produces an Adaptive Card 1.5 with severity styling', () => {
    const card = buildOpsAlertCard({
      title: 'Outbox publisher fallo',
      message: 'No se pudo publicar el lote a BigQuery',
      severity: 'critical',
      source: 'outbox-consumer',
      occurredAt: new Date('2026-04-26T13:30:00Z'),
      environment: 'production'
    })

    expect(card.type).toBe('AdaptiveCard')
    expect(card.version).toBe('1.5')
    expect(card.body[0]).toMatchObject({ type: 'Container', style: 'attention' })
    const factSet = card.body.find(item => item.type === 'FactSet')

    expect(factSet).toBeDefined()
  })

  it('renders Action.OpenUrl when an actionUrl is provided', () => {
    const card = buildOpsAlertCard({
      title: 't',
      message: 'm',
      severity: 'warning',
      source: 's',
      occurredAt: '2026-04-26T13:30:00Z',
      actionUrl: 'https://greenhouse.efeoncepro.com/admin/ops-health',
      actionLabel: 'Ver Ops Health'
    })

    expect(card.actions).toEqual([
      {
        type: 'Action.OpenUrl',
        title: 'Ver Ops Health',
        url: 'https://greenhouse.efeoncepro.com/admin/ops-health'
      }
    ])
  })

  it('omits actions when no url is provided', () => {
    const card = buildOpsAlertCard({
      title: 't',
      message: 'm',
      severity: 'info',
      source: 's',
      occurredAt: new Date()
    })

    expect(card.actions).toBeUndefined()
  })
})

describe('buildFinanceAlertCard', () => {
  it('formats CLP and USD amounts in the FactSet', () => {
    const card = buildFinanceAlertCard({
      kind: 'vat_period_materialized',
      title: 'Cierre IVA marzo 2026',
      summary: 'IVA del periodo materializado',
      period: '2026-03',
      amountCLP: 12_345_678,
      amountUSD: 12345.67,
      occurredAt: new Date('2026-04-26T13:30:00Z')
    })

    const factSet = card.body.find(item => item.type === 'FactSet')

    if (!factSet || factSet.type !== 'FactSet') {
      throw new Error('expected FactSet')
    }

    const labels = factSet.facts.map(fact => fact.title)

    expect(labels).toEqual(expect.arrayContaining(['Tipo', 'Periodo', 'Monto CLP', 'Monto USD']))
    const clp = factSet.facts.find(fact => fact.title === 'Monto CLP')

    expect(clp?.value).toMatch(/12\.345\.678/)
  })
})

describe('buildDeliveryPulseCard', () => {
  it('includes alerts container when alerts are provided', () => {
    const card = buildDeliveryPulseCard({
      date: '2026-04-26',
      headline: 'Pulse diario',
      summary: 'Resumen del dia',
      kpis: [
        { label: 'On-time delivery', value: '92%', trend: 'up', comparison: 'vs 88% ayer' }
      ],
      alerts: ['Margen bajo el umbral en Espacio Acme']
    })

    const containers = card.body.filter(item => item.type === 'Container')

    expect(containers.length).toBeGreaterThanOrEqual(2)
    const warningContainer = containers.find(item => item.type === 'Container' && item.style === 'warning')

    expect(warningContainer).toBeDefined()
  })

  it('omits alerts container when no alerts are provided', () => {
    const card = buildDeliveryPulseCard({
      date: '2026-04-26',
      headline: 'Pulse diario',
      summary: 'Resumen del dia',
      kpis: [{ label: 'On-time delivery', value: '92%' }]
    })

    const warningContainer = card.body.find(item => item.type === 'Container' && item.style === 'warning')

    expect(warningContainer).toBeUndefined()
  })
})
