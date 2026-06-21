import { z } from 'zod'

import { PRICING_OUTPUT_CURRENCIES, QUOTATION_BILLING_FREQUENCIES } from '@/lib/finance/pricing/contracts'

import type {
  SubmitQuoteFromBuilderHeader,
  SubmitQuoteFromBuilderInput
} from './submit-quote-from-builder'

/**
 * Contrato Zod introspectable del payload de AUTORÍA del cotizador (TASK-1212).
 *
 * Es el gate de validación del write path: las rutas Product-API y el confirm de la
 * Nexa governed action hacen `safeParse` del body y, si pasa, construyen el
 * `SubmitQuoteFromBuilderInput` agregando `subject`/`actor` desde la sesión (la
 * identidad NUNCA viene del payload). Espeja el contrato read de TASK-1211
 * (`simulate-input-schema.ts`) en el lado write.
 */

const nullableNumber = z.number().nullish()

const lineMetadataSchema = z
  .object({
    pricingV2LineType: z.enum(['role', 'person', 'tool', 'overhead_addon', 'direct_cost']).optional(),
    sku: z.string().optional(),
    fteFraction: nullableNumber,
    periods: nullableNumber,
    employmentTypeCode: z.string().nullish(),
    moduleId: z.string().nullish(),
    serviceSku: z.string().nullish(),
    serviceLineOrder: nullableNumber,
    templateItemId: z.string().nullish()
  })
  .nullish()

export const quoteBuilderLineDraftSchema = z.object({
  label: z.string(),
  lineType: z.enum(['person', 'role', 'deliverable', 'direct_cost']),
  unit: z.enum(['hour', 'month', 'unit', 'project']),
  quantity: z.number(),
  unitPrice: z.number().nullable(),
  roleCode: z.string().nullish(),
  memberId: z.string().nullish(),
  source: z.enum(['catalog', 'service', 'template', 'manual']).optional(),
  serviceSku: z.string().nullish(),
  description: z.string().nullish(),
  subtotalPrice: nullableNumber,
  subtotalAfterDiscount: nullableNumber,
  productId: z.string().nullish(),
  discountType: z.enum(['percentage', 'fixed_amount']).nullish(),
  discountValue: nullableNumber,
  serviceLineOrder: nullableNumber,
  metadata: lineMetadataSchema
})

export const submitQuoteHeaderSchema = z.object({
  organizationId: z.string().nullish(),
  clientId: z.string().nullish(),
  contactIdentityProfileId: z.string().nullish(),
  hubspotDealId: z.string().nullish(),
  templateId: z.string().nullish(),
  businessLineCode: z.string().nullish(),
  currency: z.enum(PRICING_OUTPUT_CURRENCIES),
  quoteDate: z.string().nullish(),
  dueDate: z.string().nullish(),
  validUntil: z.string().nullish(),
  billingFrequency: z.enum(QUOTATION_BILLING_FREQUENCIES).optional(),
  contractDurationMonths: z.number().nullish(),
  description: z.string().nullish(),
  internalNotes: z.string().nullish(),
  pricingModel: z.enum(['staff_aug', 'retainer', 'project']).optional(),
  commercialModel: z.string().nullish(),
  staffingModel: z.string().nullish(),
  pricingEngineCommercialModel: z.string().nullish(),
  countryFactorCode: z.string().nullish(),
  globalDiscountType: z.enum(['percentage', 'fixed_amount']).nullish(),
  globalDiscountValue: z.number().nullish(),
  targetMarginPct: z.number().nullish(),
  marginFloorPct: z.number().nullish(),
  exchangeRates: z.record(z.string(), z.number()).optional(),
  exchangeSnapshotDate: z.string().nullish()
})

export const submitQuoteFromBuilderPayloadSchema = z
  .object({
    mode: z.enum(['create', 'edit']),
    quotationId: z.string().nullish(),
    header: submitQuoteHeaderSchema,
    lines: z.array(quoteBuilderLineDraftSchema),
    issueAfterSave: z.boolean().default(false),
    idempotencyKey: z.string().nullish(),
    correlationId: z.string().nullish(),
    reason: z.string().nullish()
  })
  .refine(value => value.mode !== 'edit' || (typeof value.quotationId === 'string' && value.quotationId.trim().length > 0), {
    message: 'quotationId es obligatorio en modo edit.',
    path: ['quotationId']
  })

export type SubmitQuoteFromBuilderPayload = z.infer<typeof submitQuoteFromBuilderPayloadSchema>

// Compile-time guards: el schema debe permanecer asignable al contrato del command.
// Si SubmitQuoteFromBuilderHeader/Input cambian y el schema queda desalineado, rompe tsc.
const _headerAssignable: (h: z.infer<typeof submitQuoteHeaderSchema>) => SubmitQuoteFromBuilderHeader = h => h

const _payloadAssignable: (
  p: SubmitQuoteFromBuilderPayload
) => Omit<SubmitQuoteFromBuilderInput, 'subject' | 'actor'> = p => p

void _headerAssignable
void _payloadAssignable
