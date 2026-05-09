import { describe, expect, it } from 'vitest'

import { getGreenhouseNavigationCopy } from './greenhouse-navigation-copy'

describe('greenhouse navigation copy', () => {
  it('keeps es-CL as the default navigation copy', () => {
    const copy = getGreenhouseNavigationCopy()

    expect(copy.client.projects.label).toBe('Proyectos')
    expect(copy.commercial.root.label).toBe('Comercial')
    expect(copy.finance.paymentOrders.label).toBe('Órdenes de pago')
    expect(copy.finance.documents.subtitle).toBe('OC, HES y conciliación')
  })

  it('provides en-US labels for the portal shell proof of runtime', () => {
    const copy = getGreenhouseNavigationCopy('en-US')

    expect(copy.client.projects.label).toBe('Projects')
    expect(copy.commercial.root.label).toBe('Commercial')
    expect(copy.finance.paymentOrders.label).toBe('Payment orders')
    expect(copy.finance.documents.subtitle).toBe('POs, HES and reconciliation')
    expect(copy.my.payroll.label).toBe('My Payroll')
  })
})
