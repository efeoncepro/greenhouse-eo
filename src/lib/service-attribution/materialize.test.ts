import { describe, expect, it } from 'vitest'

import {
  buildServiceIndexes,
  distributeAmountByWeights,
  resolveServiceCandidates,
  type HESBridgeRow,
  type PurchaseOrderBridgeRow,
  type QuoteBridgeRow,
  type ServiceContext
} from '@/lib/service-attribution/materialize'

const SERVICES: ServiceContext[] = [
  {
    serviceId: 'svc-1',
    serviceName: 'SEO Retainer',
    spaceId: 'space-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    hubspotDealId: 'deal-1',
    lineaDeServicio: 'reach'
  },
  {
    serviceId: 'svc-2',
    serviceName: 'Performance Media',
    spaceId: 'space-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    hubspotDealId: 'deal-2',
    lineaDeServicio: 'wave'
  }
]

const QUOTES = new Map<string, QuoteBridgeRow>([
  ['qt-1', { quotation_id: 'qt-1', hubspot_deal_id: 'deal-1', organization_id: 'org-1', space_id: 'space-1' }]
])

const POS = new Map<string, PurchaseOrderBridgeRow>([
  ['po-1', { purchase_order_id: 'po-1', contract_id: null, quotation_id: 'qt-1', organization_id: 'org-1', space_id: 'space-1' }]
])

const HES = new Map<string, HESBridgeRow>([
  ['hes-1', { source_hes_id: 'hes-1', purchase_order_id: 'po-1', contract_id: null, quotation_id: null, organization_id: 'org-1', space_id: 'space-1' }]
])

describe('service attribution helpers', () => {
  it('distributes by weight and keeps the total amount stable', () => {
    expect(distributeAmountByWeights(100, [
      { serviceId: 'svc-1', weight: 3 },
      { serviceId: 'svc-2', weight: 1 }
    ])).toEqual([
      { serviceId: 'svc-1', amountClp: 75 },
      { serviceId: 'svc-2', amountClp: 25 }
    ])
  })

  it('resolves a quotation bridge to a single service through hubspot_deal_id', () => {
    const resolution = resolveServiceCandidates(
      {
        quotationId: 'qt-1',
        organizationId: 'org-1'
      },
      buildServiceIndexes(SERVICES),
      QUOTES,
      new Map(),
      POS,
      HES
    )

    expect(resolution.candidateServiceIds).toEqual(['svc-1'])
    expect(resolution.attemptedMethod).toBe('document_hubspot_deal_bridge')
    expect(resolution.confidenceLabel).toBe('high')
  })

  it('resolves a HES bridge transitively through purchase order and quotation', () => {
    const resolution = resolveServiceCandidates(
      {
        sourceHesId: 'hes-1',
        organizationId: 'org-1'
      },
      buildServiceIndexes(SERVICES),
      QUOTES,
      new Map(),
      POS,
      HES
    )

    expect(resolution.candidateServiceIds).toEqual(['svc-1'])
    expect(resolution.evidence).toMatchObject({
      sourceHesId: 'hes-1',
      hesPurchaseOrderId: 'po-1'
    })
  })

  it('keeps multiple candidates when service_line is not enough to disambiguate', () => {
    const duplicatedServices: ServiceContext[] = [
      ...SERVICES,
      {
        serviceId: 'svc-3',
        serviceName: 'Reach Expansion',
        spaceId: 'space-1',
        organizationId: 'org-1',
        clientId: 'client-1',
        hubspotDealId: null,
        lineaDeServicio: 'reach'
      }
    ]

    const resolution = resolveServiceCandidates(
      {
        spaceId: 'space-1',
        organizationId: 'org-1',
        serviceLine: 'reach'
      },
      buildServiceIndexes(duplicatedServices),
      new Map(),
      new Map(),
      new Map(),
      new Map()
    )

    expect(resolution.candidateServiceIds).toEqual(['svc-1', 'svc-3'])
    expect(resolution.attemptedMethod).toBe('service_line_unique_within_space')
  })
})
