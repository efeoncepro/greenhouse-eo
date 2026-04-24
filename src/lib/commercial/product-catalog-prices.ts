import 'server-only'

import type { Selectable } from 'kysely'

import { getDb, query, withTransaction } from '@/lib/db'
import { getExchangeRateOnOrBefore } from '@/lib/finance/pricing/currency-converter'

import type { DB } from '@/types/db'

// ─────────────────────────────────────────────────────────────
// TASK-602 Fase B — Multi-currency prices store.
//
// Shape canónico: producto × moneda. `is_authoritative=true` significa que
// el valor fue fijado por un operador (gh_admin), importado desde HubSpot
// (hs_seed), o migrado desde el legacy `product_catalog.default_unit_price`
// (backfill_legacy). `is_authoritative=false` son filas derivadas por la
// FX platform (source='fx_derived').
//
// Reglas:
// - Greenhouse es SoT permanente. HubSpot edits se sobrescriben en el
//   próximo outbound (TASK-603).
// - `setAuthoritativePrice` hace upsert + recompute de las 5 derivadas en
//   la misma transacción (atomic). No publica evento porque el outbound
//   de TASK-603 lee la tabla on-demand.
// - El projection reactivo en `product-catalog-prices-recompute.ts` se
//   suscribe a `finance.exchange_rate.upserted` para regenerar todas las
//   derivadas que dependan de la currency pair afectada.
// ─────────────────────────────────────────────────────────────

export const CURRENCY_CODES = ['CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN'] as const
export type CurrencyCode = (typeof CURRENCY_CODES)[number]

/**
 * Orden de precedencia para desempate cuando un producto tiene múltiples
 * filas autoritativas (ej. operador fijó CLP y USD). El primero que aparezca
 * en esta lista es el "primary authoritative".
 *
 * Alineado con la VIEW `product_catalog_authoritative_price` creada en la
 * migración 20260424174148937.
 */
export const CURRENCY_PRECEDENCE: readonly CurrencyCode[] = [
  'CLP',
  'USD',
  'CLF',
  'COP',
  'MXN',
  'PEN'
]

export const PRICE_SOURCES = ['gh_admin', 'hs_seed', 'fx_derived', 'backfill_legacy'] as const
export type PriceSource = (typeof PRICE_SOURCES)[number]

type ProductCatalogPricesRow = Selectable<DB['greenhouse_commercial.product_catalog_prices']>

export interface ProductPrice {
  productId: string
  currencyCode: CurrencyCode
  unitPrice: number
  isAuthoritative: boolean
  derivedFromCurrency: CurrencyCode | null
  derivedFromFxAt: string | null
  derivedFxRate: number | null
  source: PriceSource
  createdAt: string
  updatedAt: string
}

export interface SetAuthoritativePriceInput {
  productId: string
  currencyCode: CurrencyCode
  unitPrice: number
  source?: Extract<PriceSource, 'gh_admin' | 'hs_seed' | 'backfill_legacy'>
}

export interface SetAuthoritativePriceResult {
  authoritative: ProductPrice
  derived: ProductPrice[]

  /** Monedas para las que no se pudo obtener rate (quedaron sin fila). */
  missingRates: CurrencyCode[]
}

// ── Helpers internos ──────────────────────────────────────────

const ANTI_PING_PONG_WINDOW_MS = 60_000

const toNumber = (value: string | number | null): number => {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const toNullableNumber = (value: string | number | null): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toTimestampString = (value: Date | string | null): string | null => {
  if (!value) return null

  return value instanceof Date ? value.toISOString() : value
}

const round2 = (value: number) => Math.round(value * 100) / 100

const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  typeof value === 'string' && (CURRENCY_CODES as readonly string[]).includes(value)

const mapPriceRow = (row: ProductCatalogPricesRow): ProductPrice => ({
  productId: row.product_id,
  currencyCode: row.currency_code as CurrencyCode,
  unitPrice: toNumber(row.unit_price as string | null),
  isAuthoritative: row.is_authoritative,
  derivedFromCurrency: row.derived_from_currency as CurrencyCode | null,
  derivedFromFxAt: toTimestampString(row.derived_from_fx_at as Date | string | null),
  derivedFxRate: toNullableNumber(row.derived_fx_rate as string | null),
  source: row.source as PriceSource,
  createdAt: toTimestampString(row.created_at as Date | string) ?? '',
  updatedAt: toTimestampString(row.updated_at as Date | string) ?? ''
})

// ── Readers ───────────────────────────────────────────────────

/**
 * Retorna las 6 monedas canónicas como un mapa. Monedas sin fila devuelven
 * NULL (útil para outbound que necesita explicitamente mandar null para
 * borrar el campo en HubSpot).
 */
export const getPricesByCurrency = async (
  productId: string
): Promise<Record<CurrencyCode, number | null>> => {
  const trimmed = productId.trim()

  const result = Object.fromEntries(
    CURRENCY_CODES.map(code => [code, null as number | null])
  ) as Record<CurrencyCode, number | null>

  if (!trimmed) return result

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_commercial.product_catalog_prices')
    .select(['currency_code', 'unit_price'])
    .where('product_id', '=', trimmed)
    .execute()

  for (const row of rows) {
    if (isCurrencyCode(row.currency_code)) {
      result[row.currency_code] = toNumber(row.unit_price as string | null)
    }
  }

  return result
}

/**
 * Devuelve todas las filas (autoritativas + derivadas) de un producto, útil
 * para el admin UI y para debugging del outbound.
 */
export const getAllPrices = async (productId: string): Promise<ProductPrice[]> => {
  const trimmed = productId.trim()

  if (!trimmed) return []

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_commercial.product_catalog_prices')
    .selectAll()
    .where('product_id', '=', trimmed)
    .execute()

  return rows.map(mapPriceRow)
}

/**
 * Lee la fila autoritativa primary desde la VIEW canónica
 * `product_catalog_authoritative_price` (resuelve desempate por precedencia
 * canónica CLP > USD > CLF > COP > MXN > PEN).
 */
export const getAuthoritativePrice = async (
  productId: string
): Promise<Pick<ProductPrice, 'productId' | 'currencyCode' | 'unitPrice' | 'source'> | null> => {
  const trimmed = productId.trim()

  if (!trimmed) return null

  const rows = await query<{
    product_id: string
    currency_code: string
    unit_price: string
    source: string
  }>(
    `SELECT product_id, currency_code, unit_price, source
       FROM greenhouse_commercial.product_catalog_authoritative_price
      WHERE product_id = $1
      LIMIT 1`,
    [trimmed]
  )

  const row = rows[0]

  if (!row || !isCurrencyCode(row.currency_code)) return null

  return {
    productId: row.product_id,
    currencyCode: row.currency_code,
    unitPrice: toNumber(row.unit_price),
    source: row.source as PriceSource
  }
}

// ── Derivación FX ─────────────────────────────────────────────

interface DerivedRowInput {
  productId: string
  targetCurrency: CurrencyCode
  fromCurrency: CurrencyCode
  sourceUnitPrice: number
  rateDate?: string | null
}

interface DerivedRow {
  productId: string
  currencyCode: CurrencyCode
  unitPrice: number
  derivedFromCurrency: CurrencyCode
  derivedFromFxAt: Date
  derivedFxRate: number
}

/**
 * Calcula una fila derivada para una moneda objetivo. Devuelve `null` si el
 * rate FX no está disponible (caller decide si saltar esa moneda o fallar).
 */
const buildDerivedRow = async (
  input: DerivedRowInput
): Promise<DerivedRow | null> => {
  if (input.fromCurrency === input.targetCurrency) return null

  const rate = await getExchangeRateOnOrBefore({
    fromCurrency: input.fromCurrency,
    toCurrency: input.targetCurrency,
    rateDate: input.rateDate ?? null
  })

  if (rate === null || rate <= 0) return null

  return {
    productId: input.productId,
    currencyCode: input.targetCurrency,
    unitPrice: round2(input.sourceUnitPrice * rate),
    derivedFromCurrency: input.fromCurrency,
    derivedFromFxAt: new Date(),
    derivedFxRate: rate
  }
}

// ── Writers ───────────────────────────────────────────────────

/**
 * Upsert de precio autoritativo + recompute inline de las 5 monedas
 * restantes (si FX rate disponible). Todo en una sola transacción.
 *
 * Si el producto ya tenía una fila derivada para la moneda objetivo, la
 * fila se reemplaza con la autoritativa. Si ya tenía una fila autoritativa
 * para la misma moneda, se actualiza unit_price y source.
 *
 * Si para alguna moneda objetivo el FX rate no está disponible, esa fila
 * derivada NO se crea/actualiza (la caller lo ve en `missingRates`).
 */
export const setAuthoritativePrice = async (
  input: SetAuthoritativePriceInput
): Promise<SetAuthoritativePriceResult> => {
  const productId = input.productId.trim()
  const currencyCode = input.currencyCode
  const unitPrice = round2(input.unitPrice)
  const source = input.source ?? 'gh_admin'

  if (!productId) {
    throw new Error('setAuthoritativePrice: productId is required')
  }

  if (unitPrice < 0) {
    throw new Error('setAuthoritativePrice: unitPrice must be non-negative')
  }

  if (!isCurrencyCode(currencyCode)) {
    throw new Error(`setAuthoritativePrice: invalid currency_code ${currencyCode}`)
  }

  return withTransaction(async client => {
    // 1. Upsert la fila autoritativa.
    const authRows = await client.query<ProductCatalogPricesRow>(
      `INSERT INTO greenhouse_commercial.product_catalog_prices (
         product_id, currency_code, unit_price, is_authoritative,
         derived_from_currency, derived_from_fx_at, derived_fx_rate,
         source, created_at, updated_at
       ) VALUES (
         $1, $2, $3, TRUE,
         NULL, NULL, NULL,
         $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )
       ON CONFLICT (product_id, currency_code) DO UPDATE SET
         unit_price            = EXCLUDED.unit_price,
         is_authoritative      = TRUE,
         derived_from_currency = NULL,
         derived_from_fx_at    = NULL,
         derived_fx_rate       = NULL,
         source                = EXCLUDED.source,
         updated_at            = CURRENT_TIMESTAMP
       RETURNING *`,
      [productId, currencyCode, unitPrice, source]
    )

    const authoritative = mapPriceRow(authRows.rows[0])

    // 2. Recompute las 5 monedas restantes.
    const missingRates: CurrencyCode[] = []
    const derivedRows: ProductPrice[] = []

    for (const target of CURRENCY_CODES) {
      if (target === currencyCode) continue

      // Si ya existe una fila autoritativa para `target`, NO la pisamos
      // (respeta decisiones explícitas del operador en otras monedas).
      const existing = await client.query<{ is_authoritative: boolean }>(
        `SELECT is_authoritative
           FROM greenhouse_commercial.product_catalog_prices
          WHERE product_id = $1 AND currency_code = $2
          LIMIT 1`,
        [productId, target]
      )

      if (existing.rows[0]?.is_authoritative) continue

      const derived = await buildDerivedRow({
        productId,
        targetCurrency: target,
        fromCurrency: currencyCode,
        sourceUnitPrice: unitPrice
      })

      if (!derived) {
        missingRates.push(target)

        // Si existía una fila derivada previa pero ya no hay rate, la
        // dejamos como estaba (decisión conservadora — prefer stale sobre
        // ausencia).
        continue
      }

      const upsertResult = await client.query<ProductCatalogPricesRow>(
        `INSERT INTO greenhouse_commercial.product_catalog_prices (
           product_id, currency_code, unit_price, is_authoritative,
           derived_from_currency, derived_from_fx_at, derived_fx_rate,
           source, created_at, updated_at
         ) VALUES (
           $1, $2, $3, FALSE,
           $4, $5, $6,
           'fx_derived', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         )
         ON CONFLICT (product_id, currency_code) DO UPDATE SET
           unit_price            = EXCLUDED.unit_price,
           is_authoritative      = FALSE,
           derived_from_currency = EXCLUDED.derived_from_currency,
           derived_from_fx_at    = EXCLUDED.derived_from_fx_at,
           derived_fx_rate       = EXCLUDED.derived_fx_rate,
           source                = 'fx_derived',
           updated_at            = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          derived.productId,
          derived.currencyCode,
          derived.unitPrice,
          derived.derivedFromCurrency,
          derived.derivedFromFxAt,
          derived.derivedFxRate
        ]
      )

      derivedRows.push(mapPriceRow(upsertResult.rows[0]))
    }

    return { authoritative, derived: derivedRows, missingRates }
  })
}

// ── Recompute masivo (usado por el projection reactivo) ──────

export interface RecomputeScope {

  /** Moneda del rate que cambió (lado "from" del pair). */
  fromCurrency: CurrencyCode

  /** Moneda del rate que cambió (lado "to" del pair). */
  toCurrency: CurrencyCode

  /** Rate date opcional para reproducir conversions en una fecha específica. */
  rateDate?: string | null
}

export interface RecomputeResult {
  scanned: number
  updated: number
  skipped: number
}

/**
 * Cuando cambia un rate FX (ej. USD→CLP sube), regenera TODAS las filas
 * derivadas que dependen de esa currency pair. Usado por la projection
 * reactiva `product-catalog-prices-recompute`.
 *
 * Anti-ping-pong: solo regenera filas donde `derived_from_fx_at` está FUERA
 * de la ventana de 60s (evita tight loop si el publisher del evento y el
 * consumer están desincronizados). Rate que subas 2x en <60s solo gatilla
 * 1 recompute.
 */
export const recomputeDerivedForCurrencyPair = async (
  scope: RecomputeScope
): Promise<RecomputeResult> => {
  const fromCurrency = scope.fromCurrency
  const toCurrency = scope.toCurrency

  if (!isCurrencyCode(fromCurrency) || !isCurrencyCode(toCurrency)) {
    return { scanned: 0, updated: 0, skipped: 0 }
  }

  if (fromCurrency === toCurrency) {
    return { scanned: 0, updated: 0, skipped: 0 }
  }

  const cutoff = new Date(Date.now() - ANTI_PING_PONG_WINDOW_MS)

  // Busca derived rows afectadas — ya sea porque `from` coincide con la
  // moneda que cambió, O porque `to` coincide (cualquiera de los dos lados
  // del pair invalida la fila).
  const candidates = await query<{
    product_id: string
    currency_code: string
    derived_from_currency: string
    derived_from_fx_at: string
  }>(
    `SELECT product_id, currency_code, derived_from_currency, derived_from_fx_at
       FROM greenhouse_commercial.product_catalog_prices
      WHERE is_authoritative = FALSE
        AND (
          (derived_from_currency = $1 AND currency_code = $2)
          OR (derived_from_currency = $2 AND currency_code = $1)
        )
        AND (derived_from_fx_at IS NULL OR derived_from_fx_at < $3)`,
    [fromCurrency, toCurrency, cutoff]
  )

  let updated = 0
  let skipped = 0

  for (const candidate of candidates) {
    if (!isCurrencyCode(candidate.currency_code) || !isCurrencyCode(candidate.derived_from_currency)) {
      skipped++
      continue
    }

    // Lee el precio autoritativo source para recalcular.
    const sourceRows = await query<{ unit_price: string }>(
      `SELECT unit_price
         FROM greenhouse_commercial.product_catalog_prices
        WHERE product_id = $1
          AND currency_code = $2
          AND is_authoritative = TRUE
        LIMIT 1`,
      [candidate.product_id, candidate.derived_from_currency]
    )

    const sourcePrice = sourceRows[0] ? toNumber(sourceRows[0].unit_price) : null

    if (sourcePrice === null) {
      skipped++
      continue
    }

    const derived = await buildDerivedRow({
      productId: candidate.product_id,
      targetCurrency: candidate.currency_code,
      fromCurrency: candidate.derived_from_currency,
      sourceUnitPrice: sourcePrice,
      rateDate: scope.rateDate
    })

    if (!derived) {
      skipped++
      continue
    }

    await query(
      `UPDATE greenhouse_commercial.product_catalog_prices
          SET unit_price         = $1,
              derived_fx_rate    = $2,
              derived_from_fx_at = $3,
              updated_at         = CURRENT_TIMESTAMP
        WHERE product_id = $4
          AND currency_code = $5
          AND is_authoritative = FALSE`,
      [
        derived.unitPrice,
        derived.derivedFxRate,
        derived.derivedFromFxAt,
        candidate.product_id,
        candidate.currency_code
      ]
    )
    updated++
  }

  return {
    scanned: candidates.length,
    updated,
    skipped
  }
}
