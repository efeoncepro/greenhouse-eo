import 'server-only'

import {
  COMMERCIAL_MODELS,
  QUOTATION_PRICING_MODELS,
  STAFFING_MODELS,
  type CommercialModel,
  type QuotationPricingModel,
  type StaffingModel
} from '@/lib/commercial/governance/contracts'

export type { CommercialModel, QuotationPricingModel, StaffingModel }

const COMMERCIAL_MODEL_SET = new Set<string>(COMMERCIAL_MODELS)
const STAFFING_MODEL_SET = new Set<string>(STAFFING_MODELS)
const QUOTATION_PRICING_MODEL_SET = new Set<string>(QUOTATION_PRICING_MODELS)

export interface QuoteDeliveryModel {
  pricingModel: QuotationPricingModel
  commercialModel: CommercialModel
  staffingModel: StaffingModel
}

const DEFAULT_QUOTE_DELIVERY_MODEL: QuoteDeliveryModel = {
  pricingModel: 'project',
  commercialModel: 'project',
  staffingModel: 'outcome_based'
}

export const isCommercialModel = (value: unknown): value is CommercialModel =>
  typeof value === 'string' && COMMERCIAL_MODEL_SET.has(value)

export const isStaffingModel = (value: unknown): value is StaffingModel =>
  typeof value === 'string' && STAFFING_MODEL_SET.has(value)

export const isQuotationPricingModel = (value: unknown): value is QuotationPricingModel =>
  typeof value === 'string' && QUOTATION_PRICING_MODEL_SET.has(value)

export const deriveDeliveryModelFromPricingModel = (
  pricingModel: unknown
): QuoteDeliveryModel => {
  switch (pricingModel) {
    case 'staff_aug':
      return {
        pricingModel: 'staff_aug',
        commercialModel: 'retainer',
        staffingModel: 'named_resources'
      }
    case 'retainer':
      return {
        pricingModel: 'retainer',
        commercialModel: 'retainer',
        staffingModel: 'outcome_based'
      }
    case 'project':
      return {
        pricingModel: 'project',
        commercialModel: 'project',
        staffingModel: 'outcome_based'
      }
    default:
      return DEFAULT_QUOTE_DELIVERY_MODEL
  }
}

export const derivePricingModelFromDeliveryModel = ({
  commercialModel,
  staffingModel
}: {
  commercialModel: CommercialModel
  staffingModel: StaffingModel
}): QuotationPricingModel => {
  if (commercialModel === 'retainer' && staffingModel === 'named_resources') {
    return 'staff_aug'
  }

  if (commercialModel === 'retainer') {
    return 'retainer'
  }

  // Legacy `pricing_model` has no dedicated value for `one_off`, so we keep
  // `project` as the backward-compatible alias for non-retainer deals.
  return 'project'
}

export const resolveQuoteDeliveryModel = ({
  pricingModel,
  commercialModel,
  staffingModel,
  fallback
}: {
  pricingModel?: unknown
  commercialModel?: unknown
  staffingModel?: unknown
  fallback?: QuoteDeliveryModel
}): QuoteDeliveryModel => {
  if (isCommercialModel(commercialModel) && isStaffingModel(staffingModel)) {
    return {
      pricingModel: derivePricingModelFromDeliveryModel({
        commercialModel,
        staffingModel
      }),
      commercialModel,
      staffingModel
    }
  }

  if (pricingModel !== undefined && pricingModel !== null) {
    return deriveDeliveryModelFromPricingModel(pricingModel)
  }

  return fallback ?? DEFAULT_QUOTE_DELIVERY_MODEL
}
