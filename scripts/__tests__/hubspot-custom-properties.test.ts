import { describe, expect, it } from 'vitest'

import {
  diffHubSpotCustomProperties,
  getHubSpotCustomPropertyDefinitions,
  planHubSpotCustomPropertyCreation
} from '@/lib/hubspot/custom-properties'

describe('hubspot custom properties manifest', () => {
  it('keeps technical names and human-readable labels separate across supported objects', () => {
    const objects = ['companies', 'deals', 'line_items', 'products', 'services'] as const

    for (const objectType of objects) {
      for (const definition of getHubSpotCustomPropertyDefinitions(objectType)) {
        expect(definition.label).not.toBe(definition.name)
      }
    }
  })

  it('includes the canonical deal origin property', () => {
    expect(getHubSpotCustomPropertyDefinitions('deals')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'gh_deal_origin',
          label: 'Origen del Deal en Greenhouse'
        }),
        expect.objectContaining({
          name: 'gh_idempotency_key',
          label: 'Llave de Idempotencia Greenhouse'
        })
      ])
    )
  })

  it('includes the service sync property suite', () => {
    const definitions = getHubSpotCustomPropertyDefinitions('services')

    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'ef_space_id' }),
        expect.objectContaining({ name: 'ef_linea_de_servicio' }),
        expect.objectContaining({ name: 'ef_servicio_especifico' }),
        expect.objectContaining({ name: 'ef_notion_project_id' })
      ])
    )
  })

  it('includes the line item publish-ready property suite', () => {
    const definitions = getHubSpotCustomPropertyDefinitions('line_items')

    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'gh_product_code',
          label: 'Codigo de Producto Greenhouse'
        }),
        expect.objectContaining({
          name: 'gh_tax_rate',
          label: 'Tasa IVA Greenhouse'
        })
      ])
    )
  })

  it('supports contacts without inventing unsupported properties', () => {
    expect(getHubSpotCustomPropertyDefinitions('contacts')).toEqual([])
    expect(planHubSpotCustomPropertyCreation('contacts', [])).toEqual([])
    expect(diffHubSpotCustomProperties('contacts', [])).toEqual([])
  })

  it('marks drifted deal properties as updates instead of creates', () => {
    const diff = diffHubSpotCustomProperties('deals', [
      {
        name: 'gh_deal_origin',
        label: 'gh_deal_origin',
        description: 'legacy',
        groupName: 'dealinformation',
        type: 'string',
        fieldType: 'text',
        formField: false,
        displayOrder: 1,
        readOnlyValue: false
      }
    ])

    expect(diff).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'update',
          definition: expect.objectContaining({ name: 'gh_deal_origin' })
        }),
        expect.objectContaining({
          action: 'create',
          definition: expect.objectContaining({ name: 'gh_idempotency_key' })
        })
      ])
    )
  })
})
