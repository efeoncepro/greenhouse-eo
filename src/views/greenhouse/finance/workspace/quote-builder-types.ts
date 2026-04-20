// Tipos compartidos por las surfaces del Quote Builder (drawer legacy + shell full-page).
// TASK-473: extraídos para que QuoteTemplatePickerDrawer y QuoteBuilderShell compartan
// el mismo contrato sin tocar QuoteCreateDrawer.tsx.

export type QuoteBuilderPricingModel = 'staff_aug' | 'retainer' | 'project'

export type QuoteBuilderBillingFrequency = 'monthly' | 'milestone' | 'one_time'

export type QuoteBuilderUnit = 'hour' | 'month' | 'unit' | 'project'

export interface QuoteCreateTemplate {
  templateId: string
  templateName: string
  templateCode: string
  pricingModel: QuoteBuilderPricingModel
  businessLineCode: string | null
  usageCount: number
  defaults: {
    currency: string
    billingFrequency: string
    paymentTermsDays: number
    contractDurationMonths: number | null
  }
}

export interface QuoteCreateOrganization {
  organizationId: string
  organizationName: string
}
