import { z } from 'zod'

import { PRICING_OUTPUT_CURRENCIES, type PricingEngineInputV2 } from './contracts'

/**
 * Contrato Zod introspectable del input de simulación (TASK-1211).
 *
 * El dominio del cotizador no tenía schema declarativo (se sostenía con type-guards
 * ad-hoc + casts `as`). Este schema es el contrato que consumers programáticos
 * (Nexa, MCP, API Platform) pueden descubrir y validar. Se usa como GATE de
 * validación: las rutas hacen `safeParse` y, si pasa, ejercen el body original
 * contra el engine (no la versión transformada), para no alterar el contrato
 * runtime existente del UI.
 */

const nullableNumber = z.number().nullish()

const roleLine = z.object({
  lineType: z.literal('role'),
  roleSku: z.string().min(1),
  employmentTypeCode: z.string().nullish(),
  hours: nullableNumber,
  fteFraction: nullableNumber,
  periods: nullableNumber,
  quantity: nullableNumber,
  overrideMarginPct: nullableNumber
})

const personLine = z.object({
  lineType: z.literal('person'),
  memberId: z.string().min(1),
  hours: nullableNumber,
  fteFraction: nullableNumber,
  periods: nullableNumber,
  quantity: nullableNumber,
  overrideMarginPct: nullableNumber
})

const toolLine = z.object({
  lineType: z.literal('tool'),
  toolSku: z.string().min(1),
  quantity: z.number(),
  periods: nullableNumber
})

const overheadAddonLine = z.object({
  lineType: z.literal('overhead_addon'),
  addonSku: z.string().min(1),
  basisSubtotal: nullableNumber,
  quantity: nullableNumber
})

const directCostLine = z.object({
  lineType: z.literal('direct_cost'),
  label: z.string().min(1),
  amount: z.number(),
  currency: z.string().min(1),
  quantity: nullableNumber
})

export const simulateQuoteLineSchema = z.discriminatedUnion('lineType', [
  roleLine,
  personLine,
  toolLine,
  overheadAddonLine,
  directCostLine
])

export const simulateQuoteInputSchema = z.object({
  businessLineCode: z.string().nullable(),
  commercialModel: z.enum(['on_going', 'on_demand', 'hybrid', 'license_consulting']),
  countryFactorCode: z.string().min(1),
  outputCurrency: z.enum(PRICING_OUTPUT_CURRENCIES),
  quoteDate: z.string().min(1),
  lines: z.array(simulateQuoteLineSchema),
  autoResolveAddons: z.union([z.boolean(), z.literal('internal_only')]).optional()
})

export type SimulateQuoteInput = z.infer<typeof simulateQuoteInputSchema>

// Compile-time guard: el schema debe permanecer asignable al contrato del engine.
// Si PricingEngineInputV2 cambia y el schema queda desalineado, esto rompe tsc.
const _assignableToEngineInput: (input: SimulateQuoteInput) => PricingEngineInputV2 = input => input

void _assignableToEngineInput
