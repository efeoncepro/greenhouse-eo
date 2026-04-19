import { describe, expect, it } from 'vitest'

import {
  deriveDeliveryModelFromPricingModel,
  derivePricingModelFromDeliveryModel,
  resolveQuoteDeliveryModel
} from '@/lib/commercial/delivery-model'

describe('delivery-model helpers', () => {
  it('maps legacy staff_aug to retainer + named resources', () => {
    expect(deriveDeliveryModelFromPricingModel('staff_aug')).toEqual({
      pricingModel: 'staff_aug',
      commercialModel: 'retainer',
      staffingModel: 'named_resources'
    })
  })

  it('derives the legacy alias from explicit delivery axes', () => {
    expect(
      derivePricingModelFromDeliveryModel({
        commercialModel: 'retainer',
        staffingModel: 'named_resources'
      })
    ).toBe('staff_aug')

    expect(
      derivePricingModelFromDeliveryModel({
        commercialModel: 'one_off',
        staffingModel: 'hybrid'
      })
    ).toBe('project')
  })

  it('prefers explicit delivery axes when both are provided', () => {
    expect(
      resolveQuoteDeliveryModel({
        pricingModel: 'retainer',
        commercialModel: 'project',
        staffingModel: 'hybrid'
      })
    ).toEqual({
      pricingModel: 'project',
      commercialModel: 'project',
      staffingModel: 'hybrid'
    })
  })
})
