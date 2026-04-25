import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { __buildOverheadAddonSnapshot } from '../overhead-addon-to-product'
import { __buildSellableRoleSnapshot } from '../sellable-role-to-product'
import { __buildServiceSnapshot } from '../service-to-product'
import { __buildToolSnapshot } from '../tool-to-product'

describe('sellable-role-to-product mapper', () => {
  it('maps a role with pricing to a service/staff_aug/hour/USD snapshot', () => {
    const snapshot = __buildSellableRoleSnapshot({
      roleId: 'role-1',
      roleSku: 'ECG-001',
      roleLabelEs: 'Senior Designer',
      notes: 'Diseñador senior',
      category: 'creativo',
      tier: '2',
      active: true,
      hourlyPriceUsd: 120,
      effectivePriceDate: '2026-01-01'
    })

    expect(snapshot).toEqual({
      product_code: 'ECG-001',
      product_name: 'Senior Designer',
      description: 'Diseñador senior',
      default_unit_price: 120,
      default_currency: 'USD',
      default_unit: 'hour',
      product_type: 'service',
      pricing_model: 'staff_aug',
      business_line_code: null,
      is_archived: false
    })
  })

  it('marks inactive roles as archived', () => {
    const snapshot = __buildSellableRoleSnapshot({
      roleId: 'role-1',
      roleSku: 'ECG-001',
      roleLabelEs: 'Senior Designer',
      notes: null,
      category: 'creativo',
      tier: '2',
      active: false,
      hourlyPriceUsd: null,
      effectivePriceDate: null
    })

    expect(snapshot.is_archived).toBe(true)
    expect(snapshot.default_unit_price).toBeNull()
  })
})

describe('tool-to-product mapper', () => {
  it('maps an active sellable tool to license/fixed/month/USD with the first business line', () => {
    const snapshot = __buildToolSnapshot({
      toolId: 'tool-1',
      toolSku: 'ETG-001',
      toolName: 'Figma Pro',
      description: 'Design collaboration',
      providerId: 'figma-inc',
      applicableBusinessLines: ['globe', 'efeonce_digital'],
      proratedPriceUsd: 45,
      isActive: true
    })

    expect(snapshot).toEqual({
      product_code: 'ETG-001',
      product_name: 'Figma Pro',
      description: 'Design collaboration',
      default_unit_price: 45,
      default_currency: 'USD',
      default_unit: 'month',
      product_type: 'license',
      pricing_model: 'fixed',
      business_line_code: 'globe',
      is_archived: false
    })
  })

  it('archives inactive tools', () => {
    const snapshot = __buildToolSnapshot({
      toolId: 'tool-1',
      toolSku: 'ETG-001',
      toolName: 'Figma Pro',
      description: null,
      providerId: 'figma-inc',
      applicableBusinessLines: [],
      proratedPriceUsd: 45,
      isActive: false
    })

    expect(snapshot.is_archived).toBe(true)
    expect(snapshot.business_line_code).toBeNull()
  })
})

describe('overhead-addon-to-product mapper', () => {
  it('maps a visible active addon to service/fixed/unit/USD', () => {
    const snapshot = __buildOverheadAddonSnapshot({
      addonId: 'addon-1',
      addonSku: 'EFO-001',
      addonName: '24-Hour Support',
      description: 'Premium support coverage',
      addonType: 'fee_fixed',
      unit: 'month',
      finalPriceUsd: 500,
      active: true,
      visibleToClient: true
    })

    expect(snapshot).toEqual({
      product_code: 'EFO-001',
      product_name: '24-Hour Support',
      description: 'Premium support coverage',
      default_unit_price: 500,
      default_currency: 'USD',
      default_unit: 'month',
      product_type: 'service',
      pricing_model: 'fixed',
      business_line_code: null,
      is_archived: false
    })
  })

  it('archives when visibleToClient is false, even if active', () => {
    const snapshot = __buildOverheadAddonSnapshot({
      addonId: 'addon-1',
      addonSku: 'EFO-001',
      addonName: '24-Hour Support',
      description: null,
      addonType: 'fee_fixed',
      unit: null,
      finalPriceUsd: null,
      active: true,
      visibleToClient: false
    })

    expect(snapshot.is_archived).toBe(true)
    expect(snapshot.default_unit).toBe('unit')
  })

  it('archives when active is false', () => {
    const snapshot = __buildOverheadAddonSnapshot({
      addonId: 'addon-1',
      addonSku: 'EFO-001',
      addonName: 'Deprecated Addon',
      description: null,
      addonType: 'fee_fixed',
      unit: null,
      finalPriceUsd: null,
      active: false,
      visibleToClient: true
    })

    expect(snapshot.is_archived).toBe(true)
  })
})

describe('service-to-product mapper', () => {
  it('maps on_going commercial_model to retainer pricing_model', () => {
    const snapshot = __buildServiceSnapshot({
      moduleId: 'module-1',
      serviceSku: 'EFG-001',
      serviceName: 'Creative Retainer',
      description: 'Monthly creative capacity',
      serviceUnit: 'monthly',
      commercialModel: 'on_going',
      businessLineCode: 'globe',
      active: true
    })

    expect(snapshot.pricing_model).toBe('retainer')
    expect(snapshot.default_unit).toBe('month')
    expect(snapshot.default_unit_price).toBeNull()
    expect(snapshot.product_type).toBe('service')
    expect(snapshot.business_line_code).toBe('globe')
  })

  it('maps hybrid to project', () => {
    const snapshot = __buildServiceSnapshot({
      moduleId: 'module-2',
      serviceSku: 'EFG-002',
      serviceName: 'Hybrid Engagement',
      description: null,
      serviceUnit: 'project',
      commercialModel: 'hybrid',
      businessLineCode: null,
      active: true
    })

    expect(snapshot.pricing_model).toBe('project')
    expect(snapshot.default_unit).toBe('project')
  })

  it('maps license_consulting to fixed', () => {
    const snapshot = __buildServiceSnapshot({
      moduleId: 'module-3',
      serviceSku: 'EFG-003',
      serviceName: 'License Consulting',
      description: null,
      serviceUnit: 'monthly',
      commercialModel: 'license_consulting',
      businessLineCode: null,
      active: true
    })

    expect(snapshot.pricing_model).toBe('fixed')
  })

  it('falls back to project for unknown commercial_model values', () => {
    const snapshot = __buildServiceSnapshot({
      moduleId: 'module-4',
      serviceSku: 'EFG-004',
      serviceName: 'Unknown Service',
      description: null,
      serviceUnit: 'unknown-unit',
      commercialModel: 'newfangled_model',
      businessLineCode: null,
      active: true
    })

    expect(snapshot.pricing_model).toBe('project')
    expect(snapshot.default_unit).toBe('project')
  })

  it('archives inactive services', () => {
    const snapshot = __buildServiceSnapshot({
      moduleId: 'module-5',
      serviceSku: 'EFG-005',
      serviceName: 'Retired Service',
      description: null,
      serviceUnit: 'monthly',
      commercialModel: 'on_going',
      businessLineCode: null,
      active: false
    })

    expect(snapshot.is_archived).toBe(true)
  })
})
