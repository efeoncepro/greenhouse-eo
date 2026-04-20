import { describe, expect, it } from 'vitest'

import {
  validateServiceCatalog,
  validateServiceRoleRecipeLine,
  validateServiceToolRecipeLine
} from '@/lib/commercial/service-catalog-constraints'

describe('validateServiceCatalog', () => {
  it('rejects empty moduleName', () => {
    const issues = validateServiceCatalog({
      moduleName: '',
      serviceUnit: 'project',
      commercialModel: 'on_demand',
      tier: '2',
      defaultDurationMonths: 3
    })

    expect(issues.some(i => i.field === 'moduleName' && i.rule === 'required')).toBe(true)
  })

  it('rejects whitespace-only moduleName', () => {
    const issues = validateServiceCatalog({
      moduleName: '   ',
      serviceUnit: 'project',
      commercialModel: 'on_demand',
      tier: '2'
    })

    expect(issues.some(i => i.field === 'moduleName' && i.rule === 'required')).toBe(true)
  })

  it('rejects invalid serviceUnit', () => {
    const issues = validateServiceCatalog({
      moduleName: 'X',
      serviceUnit: 'annual',
      commercialModel: 'on_demand',
      tier: '2'
    })

    expect(issues.some(i => i.field === 'serviceUnit' && i.rule === 'enum')).toBe(true)
  })

  it('rejects invalid commercialModel', () => {
    const issues = validateServiceCatalog({
      moduleName: 'X',
      serviceUnit: 'project',
      commercialModel: 'subscription',
      tier: '2'
    })

    expect(issues.some(i => i.field === 'commercialModel' && i.rule === 'enum')).toBe(true)
  })

  it('rejects invalid tier', () => {
    const issues = validateServiceCatalog({
      moduleName: 'X',
      serviceUnit: 'project',
      commercialModel: 'on_demand',
      tier: '5'
    })

    expect(issues.some(i => i.field === 'tier' && i.rule === 'enum')).toBe(true)
  })

  it('rejects negative defaultDurationMonths', () => {
    const issues = validateServiceCatalog({
      moduleName: 'X',
      serviceUnit: 'project',
      commercialModel: 'on_demand',
      tier: '2',
      defaultDurationMonths: -1
    })

    expect(
      issues.some(i => i.field === 'defaultDurationMonths' && i.rule === 'non_negative')
    ).toBe(true)
  })

  it('accepts a valid canonical input', () => {
    const issues = validateServiceCatalog({
      moduleName: 'X',
      serviceUnit: 'project',
      commercialModel: 'on_demand',
      tier: '2',
      defaultDurationMonths: 3
    })

    expect(issues).toHaveLength(0)
  })
})

describe('validateServiceRoleRecipeLine', () => {
  it('rejects missing roleId', () => {
    const issues = validateServiceRoleRecipeLine(
      { roleId: '', hoursPerPeriod: 4, quantity: 1 },
      0
    )

    expect(issues.some(i => i.rule === 'required' && i.field.endsWith('.roleId'))).toBe(true)
  })

  it('rejects non-string roleId', () => {
    const issues = validateServiceRoleRecipeLine(
      { roleId: 123, hoursPerPeriod: 4, quantity: 1 },
      0
    )

    expect(issues.some(i => i.rule === 'required' && i.field.endsWith('.roleId'))).toBe(true)
  })

  it('rejects non-positive hoursPerPeriod (zero)', () => {
    const issues = validateServiceRoleRecipeLine(
      { roleId: 'sr-123', hoursPerPeriod: 0, quantity: 1 },
      0
    )

    expect(issues.some(i => i.rule === 'positive' && i.field.endsWith('.hoursPerPeriod'))).toBe(true)
  })

  it('rejects negative hoursPerPeriod', () => {
    const issues = validateServiceRoleRecipeLine(
      { roleId: 'sr-123', hoursPerPeriod: -2, quantity: 1 },
      0
    )

    expect(issues.some(i => i.rule === 'positive' && i.field.endsWith('.hoursPerPeriod'))).toBe(true)
  })

  it('rejects non-positive quantity (zero)', () => {
    const issues = validateServiceRoleRecipeLine(
      { roleId: 'sr-123', hoursPerPeriod: 4, quantity: 0 },
      0
    )

    expect(
      issues.some(i => i.rule === 'positive_integer' && i.field.endsWith('.quantity'))
    ).toBe(true)
  })

  it('rejects non-integer quantity', () => {
    const issues = validateServiceRoleRecipeLine(
      { roleId: 'sr-123', hoursPerPeriod: 4, quantity: 1.5 },
      0
    )

    expect(
      issues.some(i => i.rule === 'positive_integer' && i.field.endsWith('.quantity'))
    ).toBe(true)
  })

  it('accepts a valid line', () => {
    const issues = validateServiceRoleRecipeLine(
      { roleId: 'sr-123', hoursPerPeriod: 4, quantity: 1 },
      0
    )

    expect(issues).toHaveLength(0)
  })

  it('uses the provided index in the field path', () => {
    const issues = validateServiceRoleRecipeLine(
      { roleId: '', hoursPerPeriod: 4, quantity: 1 },
      7
    )

    expect(issues.some(i => i.field === 'roleRecipe[7].roleId')).toBe(true)
  })
})

describe('validateServiceToolRecipeLine', () => {
  it('rejects missing toolId', () => {
    const issues = validateServiceToolRecipeLine(
      { toolId: '', toolSku: 'tool-sku', quantity: 1 },
      0
    )

    expect(issues.some(i => i.rule === 'required' && i.field.endsWith('.toolId'))).toBe(true)
  })

  it('rejects missing toolSku', () => {
    const issues = validateServiceToolRecipeLine(
      { toolId: 'tl-123', toolSku: '', quantity: 1 },
      0
    )

    expect(issues.some(i => i.rule === 'required' && i.field.endsWith('.toolSku'))).toBe(true)
  })

  it('rejects non-positive quantity', () => {
    const issues = validateServiceToolRecipeLine(
      { toolId: 'tl-123', toolSku: 'tool-sku', quantity: 0 },
      0
    )

    expect(
      issues.some(i => i.rule === 'positive_integer' && i.field.endsWith('.quantity'))
    ).toBe(true)
  })

  it('rejects non-integer quantity', () => {
    const issues = validateServiceToolRecipeLine(
      { toolId: 'tl-123', toolSku: 'tool-sku', quantity: 2.3 },
      0
    )

    expect(
      issues.some(i => i.rule === 'positive_integer' && i.field.endsWith('.quantity'))
    ).toBe(true)
  })

  it('accepts a valid line', () => {
    const issues = validateServiceToolRecipeLine(
      { toolId: 'tl-123', toolSku: 'tool-sku', quantity: 1 },
      0
    )

    expect(issues).toHaveLength(0)
  })

  it('uses the provided index in the field path', () => {
    const issues = validateServiceToolRecipeLine(
      { toolId: '', toolSku: 'tool-sku', quantity: 1 },
      3
    )

    expect(issues.some(i => i.field === 'toolRecipe[3].toolId')).toBe(true)
  })
})
