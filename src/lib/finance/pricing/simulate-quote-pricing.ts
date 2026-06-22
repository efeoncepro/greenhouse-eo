import 'server-only'

import { expandServiceIntoQuoteLines, type ExpandServiceInput } from '@/lib/commercial/service-catalog-expand'

import { PRICING_OUTPUT_CURRENCIES, type PricingEngineInputV2, type PricingOutputCurrency } from './contracts'
import { buildPricingEngineOutputV2 } from './pricing-engine-v2'
import {
  redactPricingOutputForProfile,
  type PricingAudience,
  type RedactedPricingEngineOutput
} from './pricing-output-redaction'
import { simulateQuoteInputSchema } from './simulate-input-schema'

/**
 * Envelope canónico de simulación de precio (TASK-1211) — el primitive read/compute
 * (capability A) consumido por UI, Nexa, MCP y API Platform.
 *
 * Envuelve `buildPricingEngineOutputV2` con (1) la redacción por audiencia (SSOT
 * `redactPricingOutputForProfile`) y (2) el framing de **estimado**: toda
 * simulación es referencial, no una oferta vinculante, con moneda explícita y
 * fecha de validez. Esto cumple el AC de la task: un agente/cliente/público nunca
 * recibe un número presentado como precio comprometido.
 */

export interface QuotePricingEstimateMeta {
  /** Una simulación es SIEMPRE un estimado referencial, nunca una oferta vinculante. */
  binding: false
  currency: PricingOutputCurrency
  /** Fecha de cálculo (= quoteDate). El estimado es válido a esta fecha. */
  calculatedAt: string
  /** Texto es-CL listo para mostrar al consumidor. */
  disclaimer: string
}

export interface QuotePricingSimulation {
  pricing: RedactedPricingEngineOutput
  estimate: QuotePricingEstimateMeta
}

export interface SimulatedServiceSummary {
  serviceSku: string
  name: string
}

export interface QuotePricingSimulationFromService extends QuotePricingSimulation {
  service: SimulatedServiceSummary
}

export interface SimulateQuotePricingContext {
  audience: PricingAudience
  costStackVisible: boolean
}

const DEFAULT_OUTPUT_CURRENCY: PricingOutputCurrency = 'USD'

const buildEstimateMeta = (currency: PricingOutputCurrency, calculatedAt: string): QuotePricingEstimateMeta => ({
  binding: false,
  currency,
  calculatedAt,
  disclaimer: `Estimado referencial calculado al ${calculatedAt}, en ${currency}. Sujeto a alcance final; no constituye una oferta vinculante.`
})

export const simulateQuotePricing = async (
  input: PricingEngineInputV2,
  context: SimulateQuotePricingContext
): Promise<QuotePricingSimulation> => {
  const output = await buildPricingEngineOutputV2(input)

  return {
    pricing: redactPricingOutputForProfile(output, context),
    estimate: buildEstimateMeta(input.outputCurrency, input.quoteDate)
  }
}

/**
 * Simula el precio de un servicio nombrado desde su receta (from-service / recipe),
 * redactado por audiencia y con framing de estimado. Es lo que Nexa/MCP usan tras
 * resolver el `serviceSku` con `searchServiceCatalog`.
 */
export const simulateQuotePricingFromService = async (
  input: ExpandServiceInput,
  context: SimulateQuotePricingContext
): Promise<QuotePricingSimulationFromService> => {
  const result = await expandServiceIntoQuoteLines(input)

  const currency = input.outputCurrency ?? DEFAULT_OUTPUT_CURRENCY
  const calculatedAt = input.quoteDate ?? new Date().toISOString().slice(0, 10)

  return {
    service: {
      serviceSku: result.service.serviceSku,
      name: result.service.displayName ?? result.service.moduleName
    },
    pricing: redactPricingOutputForProfile(result.pricing, context),
    estimate: buildEstimateMeta(currency, calculatedAt)
  }
}

export const normalizeQuoteCurrency = (value: unknown): PricingOutputCurrency => {
  const candidate = typeof value === 'string' ? value.trim().toUpperCase() : ''

  return (PRICING_OUTPUT_CURRENCIES as readonly string[]).includes(candidate)
    ? (candidate as PricingOutputCurrency)
    : DEFAULT_OUTPUT_CURRENCY
}

export type QuoteSimulationFromBody =
  | { ok: true; simulation: QuotePricingSimulation | QuotePricingSimulationFromService }
  | { ok: false; error: string }

/**
 * Branch compartido por los lanes API Platform (app + ecosystem): un body acepta
 * `{ serviceSku, currency }` (cotizar un servicio por SKU) o `{ input }` (un
 * `PricingEngineInputV2` completo validado por Zod). Devuelve un resultado
 * discriminado para que cada lane mapee el error a su contrato (route 400 /
 * ApiPlatformError). No decide la audiencia: la recibe en `context`.
 */
export const runQuoteSimulationFromBody = async (
  body: unknown,
  context: SimulateQuotePricingContext
): Promise<QuoteSimulationFromBody> => {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const serviceSku = typeof record.serviceSku === 'string' ? record.serviceSku.trim() : ''

  if (serviceSku) {
    return {
      ok: true,
      simulation: await simulateQuotePricingFromService(
        { serviceSku, outputCurrency: normalizeQuoteCurrency(record.currency) },
        context
      )
    }
  }

  const parsed = simulateQuoteInputSchema.safeParse(record.input ?? record)

  if (!parsed.success) {
    return { ok: false, error: 'Provide serviceSku (+ optional currency) or a valid pricing input.' }
  }

  return { ok: true, simulation: await simulateQuotePricing(parsed.data, context) }
}
