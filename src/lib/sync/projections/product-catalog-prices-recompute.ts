import 'server-only'

import {
  recomputeDerivedForCurrencyPair,
  CURRENCY_CODES,
  type CurrencyCode
} from '@/lib/commercial/product-catalog-prices'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

// ─────────────────────────────────────────────────────────────
// TASK-602 Fase B — Reactive projection.
//
// Se dispara cada vez que la FX platform publica
// `finance.exchange_rate.upserted` tras un update de rates (cron diario o
// backfill manual). Toma el par (from_currency, to_currency) del payload y
// regenera todas las filas derivadas de `product_catalog_prices` que
// dependen de cualquiera de los dos lados.
//
// Anti-ping-pong: la función helper
// `recomputeDerivedForCurrencyPair` respeta una ventana de 60s mirando
// `derived_from_fx_at` — multiples rate updates en ráfaga no causan
// re-cómputo repetido.
//
// Domain = cost_intelligence alineado con commercial-cost-attribution
// (también consume finance.exchange_rate.upserted).
// ─────────────────────────────────────────────────────────────

const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  typeof value === 'string' && (CURRENCY_CODES as readonly string[]).includes(value)

const extractCurrency = (payload: Record<string, unknown>, key: string): CurrencyCode | null => {
  const raw = payload[key]

  if (typeof raw !== 'string') return null
  const upper = raw.trim().toUpperCase()

  return isCurrencyCode(upper) ? upper : null
}

export const productCatalogPricesRecomputeProjection: ProjectionDefinition = {
  name: 'product_catalog_prices_recompute',
  description: 'Recompute derived rows of product_catalog_prices when a relevant FX rate updates',
  domain: 'cost_intelligence',
  triggerEvents: [EVENT_TYPES.financeExchangeRateUpserted],
  extractScope: payload => {
    const fromCurrency = extractCurrency(payload, 'from_currency')
    const toCurrency = extractCurrency(payload, 'to_currency')

    // Solo nos interesan rates que involucren monedas del catálogo de productos.
    // Rate exótico fuera de la matriz (ej. EUR) se ignora.
    if (!fromCurrency || !toCurrency) return null
    if (fromCurrency === toCurrency) return null

    // entityId estable + ordenado: "CLP_USD" y "USD_CLP" se normalizan a la
    // misma clave canónica para que coalescing del outbox las dedupe.
    const [first, second] = [fromCurrency, toCurrency].sort()
    const entityId = `${first}_${second}`

    return { entityType: 'currency_pair', entityId }
  },
  refresh: async (scope, payload) => {
    const [first, second] = scope.entityId.split('_')

    if (!isCurrencyCode(first) || !isCurrencyCode(second)) {
      return `skipped ${scope.entityId} (invalid currency pair)`
    }

    const rateDate = typeof payload.rate_date === 'string' ? payload.rate_date : null

    // Llamamos dos veces para cubrir ambas direcciones del pair en una sola
    // invocación del projection. La función interna hace anti-ping-pong, así
    // que la segunda invocación es barata si no hay nada por actualizar.
    const forward = await recomputeDerivedForCurrencyPair({
      fromCurrency: first,
      toCurrency: second,
      rateDate
    })

    const reverse = await recomputeDerivedForCurrencyPair({
      fromCurrency: second,
      toCurrency: first,
      rateDate
    })

    const totalScanned = forward.scanned + reverse.scanned
    const totalUpdated = forward.updated + reverse.updated
    const totalSkipped = forward.skipped + reverse.skipped

    return `recomputed product_catalog_prices for ${scope.entityId}: scanned=${totalScanned} updated=${totalUpdated} skipped=${totalSkipped}`
  },
  maxRetries: 2
}
