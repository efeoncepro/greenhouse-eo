import { describe, expect, it } from 'vitest'

import { getGreenhouseNavigationCopy } from './greenhouse-navigation-copy'

describe('greenhouse navigation copy', () => {
  it('keeps es-CL as the default navigation copy', () => {
    const copy = getGreenhouseNavigationCopy()

    expect(copy.client.projects.label).toBe('Proyectos')
    expect(copy.finance.paymentOrders.label).toBe('Órdenes de pago')
  })

  it('provides en-US labels for the portal shell proof of runtime', () => {
    const copy = getGreenhouseNavigationCopy('en-US')

    expect(copy.client.projects.label).toBe('Projects')
    expect(copy.finance.paymentOrders.label).toBe('Payment orders')
    expect(copy.my.payroll.label).toBe('My Payroll')
  })
})
