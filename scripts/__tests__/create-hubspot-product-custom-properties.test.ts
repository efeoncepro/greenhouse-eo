import { describe, expect, it } from 'vitest'

import {
  PRODUCT_HUBSPOT_CUSTOM_PROPERTIES,
  diffHubSpotProductCustomProperties,
  planCustomPropertyCreation,
  type HubSpotPropertySnapshot
} from '../create-hubspot-product-custom-properties'

describe('create-hubspot-product-custom-properties', () => {
  it('keeps technical names and human-readable labels separate', () => {
    for (const definition of PRODUCT_HUBSPOT_CUSTOM_PROPERTIES) {
      expect(definition.name.startsWith('gh_')).toBe(true)
      expect(definition.label.startsWith('gh_')).toBe(false)
    }

    expect(PRODUCT_HUBSPOT_CUSTOM_PROPERTIES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'gh_product_code',
          label: 'Codigo de Producto Greenhouse'
        }),
        expect.objectContaining({
          name: 'gh_archived_by_greenhouse',
          label: 'Archivado por Greenhouse'
        })
      ])
    )
  })

  it('plans only missing properties for creation', () => {
    const plan = planCustomPropertyCreation([
      { name: 'gh_product_code' },
      { name: 'gh_source_kind' }
    ])

    expect(plan.map(item => item.name)).toEqual([
      'gh_last_write_at',
      'gh_archived_by_greenhouse',
      'gh_business_line'
    ])
  })

  it('marks drifted labels as updates instead of creates', () => {
    const existing: HubSpotPropertySnapshot[] = [
      {
        name: 'gh_product_code',
        label: 'gh_product_code',
        description: 'legacy',
        groupName: 'greenhouse_sync',
        type: 'string',
        fieldType: 'text',
        formField: false,
        displayOrder: 1,
        readOnlyValue: true
      }
    ]

    const diff = diffHubSpotProductCustomProperties(existing)
    const productCode = diff.find(item => item.definition.name === 'gh_product_code')
    const sourceKind = diff.find(item => item.definition.name === 'gh_source_kind')

    expect(productCode?.action).toBe('update')
    expect(sourceKind?.action).toBe('create')
  })
})
