/**
 * TASK-1212 — re-export delgado.
 *
 * La lógica pura de construcción de líneas del cotizador se reubicó a
 * `@/lib/finance/pricing/quote-builder-line-items` (server-safe) para que el command
 * canónico `submitQuoteFromBuilder` la reuse sin un import lib→view invertido. Este
 * archivo se mantiene como punto de entrada estable para el shell + editor + tests del
 * workspace (que pasan `QuoteLineItem[]`, asignable a `QuoteBuilderLineDraft[]`).
 */

export {
  buildQuotePricingLineInput,
  buildQuotePricingInput,
  buildPersistedQuoteLineItems,
  lineRequiresSuggestedPrice
} from '@/lib/finance/pricing/quote-builder-line-items'

export type {
  QuoteLineSource,
  QuoteBuilderLineDraft,
  QuoteBuilderPricingContext,
  PersistedQuoteLineItem
} from '@/lib/finance/pricing/quote-builder-line-items'
