import 'server-only'

import {
  CURRENCY_CODES,
  setAuthoritativePrice,
  type CurrencyCode
} from '@/lib/commercial/product-catalog-prices'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

// ─────────────────────────────────────────────────────────────
// TASK-602 follow-up — Reactive bridge legacy → normalized.
//
// Los 5 sync handlers existentes (service-to-product, tool-to-product,
// overhead-addon-to-product, sellable-role-to-product, source-to-product-catalog)
// escriben `product_catalog.default_unit_price` + `default_currency` y
// publican `commercial.product_catalog.{created,updated}`. Esta projection
// los escucha y propaga el valor a `product_catalog_prices` vía
// `setAuthoritativePrice` (source='backfill_legacy'), que además computa las
// 5 derivadas FX en la misma transacción.
//
// Sin esta proyección, la tabla `product_catalog_prices` creada por TASK-602
// sólo tenía el snapshot one-shot del backfill migration — todas las
// escrituras subsiguientes a `default_unit_price` quedaban sin espejo en la
// tabla normalizada, haciendo TASK-603 (Outbound v2) y TASK-605 (Admin UI)
// consumidores de data stale.
//
// Anti-ping-pong heredado: `setAuthoritativePrice` NO pisa filas que ya son
// autoritativas en otras monedas (decisiones del operador persistidas via
// admin UI o gh_admin explicit). Esta proyección sólo enriquece, nunca
// sobrescribe decisiones locales.
//
// Domain = cost_intelligence alineado con commercial-cost-attribution y
// product-hubspot-outbound.
// ─────────────────────────────────────────────────────────────

export const PRODUCT_CATALOG_PRICES_SYNC_TRIGGER_EVENTS = [
  EVENT_TYPES.productCatalogCreated,
  EVENT_TYPES.productCatalogUpdated
] as const

const extractString = (payload: Record<string, unknown>, key: string): string | null => {
  const raw = payload[key]

  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()

  return trimmed || null
}

const extractNumber = (payload: Record<string, unknown>, key: string): number | null => {
  const raw = payload[key]

  if (raw === null || raw === undefined) return null
  const parsed = typeof raw === 'number' ? raw : Number(raw)

  return Number.isFinite(parsed) ? parsed : null
}

const isCurrencyCode = (value: string): value is CurrencyCode =>
  (CURRENCY_CODES as readonly string[]).includes(value)

export const productCatalogPricesSyncProjection: ProjectionDefinition = {
  name: 'product_catalog_prices_sync',
  description:
    'TASK-602 bridge: mirror product_catalog.default_unit_price/default_currency into product_catalog_prices as authoritative row (source=backfill_legacy) on each lifecycle event. Complements the normalized prices store by keeping it live with the legacy scalar writers in the sync handlers.',
  domain: 'cost_intelligence',
  triggerEvents: [...PRODUCT_CATALOG_PRICES_SYNC_TRIGGER_EVENTS],

  extractScope: payload => {
    const productId = extractString(payload, 'productId')

    if (!productId) return null

    return { entityType: 'product_catalog', entityId: productId }
  },

  refresh: async (scope, payload) => {
    const defaultUnitPrice = extractNumber(payload, 'defaultUnitPrice')
    const defaultCurrencyRaw = extractString(payload, 'defaultCurrency')

    // No price en el payload — upserts de catálogo sin default_unit_price
    // son válidos (ej. productos nuevos sin pricing operativo aún).
    if (defaultUnitPrice === null || defaultCurrencyRaw === null) {
      return `skipped ${scope.entityId} (no default_unit_price/default_currency in payload)`
    }

    // Negative prices no se propagan (el store los rechaza, y preferimos
    // loguear skip explícito en vez de propagar un throw a la projection).
    if (defaultUnitPrice < 0) {
      return `skipped ${scope.entityId} (negative default_unit_price=${defaultUnitPrice})`
    }

    const currency = defaultCurrencyRaw.toUpperCase()

    // Productos con moneda fuera de la matriz canónica (ej. EUR, BRL) no
    // aplican al modelo multi-currency de TASK-602. Se loguea skip sin fallar.
    if (!isCurrencyCode(currency)) {
      return `skipped ${scope.entityId} (currency ${currency} outside canonical matrix CLP/USD/CLF/COP/MXN/PEN)`
    }

    const result = await setAuthoritativePrice({
      productId: scope.entityId,
      currencyCode: currency,
      unitPrice: defaultUnitPrice,
      source: 'backfill_legacy'
    })

    return `synced ${scope.entityId} ${currency}=${defaultUnitPrice}: ${result.derived.length} derived, ${result.missingRates.length} missing_rates`
  },

  maxRetries: 2
}
