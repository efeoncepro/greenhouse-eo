import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * # Repair payments con drift CLP (TASK-766 Slice 5)
 *
 * Repara registros de `expense_payments` / `income_payments` con
 * `requires_fx_repair = TRUE` resolviendo el rate histórico al
 * `payment_date` desde `greenhouse_finance.exchange_rates` y poblando
 * `amount_clp` + `exchange_rate_at_payment`.
 *
 * **Resolución de rate canónica:**
 *
 *   SELECT rate FROM greenhouse_finance.exchange_rates
 *    WHERE from_currency = $currency AND to_currency = 'CLP'
 *      AND rate_date <= $payment_date
 *    ORDER BY rate_date DESC LIMIT 1
 *
 * Mismo patrón que `getLatestStoredExchangeRatePair` (TASK-484/699) pero
 * con date-bounded — usa el rate vigente al momento del pago, NO el actual.
 * Si no hay rate stored ≤ payment_date (caso histórico extremo), skipea
 * la fila con reason claro y la deja en drift para review manual.
 *
 * Idempotente: una fila ya con `amount_clp != NULL` no se toca aunque tenga
 * `requires_fx_repair = TRUE` por error (defensa contra estado inconsistente).
 *
 * Atomic per-row: cada UPDATE corre dentro de su propia tx. Si la batch
 * tiene errors, los anteriores quedan commiteados; el caller decide si
 * reintenta (idempotente, los repaired no se procesan dos veces).
 */

export type RepairPaymentsKind = 'expense_payments' | 'income_payments'

export interface RepairPaymentsInput {
  kind: RepairPaymentsKind
  paymentIds?: string[]
  fromDate?: string
  toDate?: string
  batchSize?: number
  dryRun?: boolean
}

export interface RepairPaymentsResult {
  kind: RepairPaymentsKind
  candidatesScanned: number
  repaired: number
  skipped: Array<{ paymentId: string; reason: string }>
  errors: Array<{ paymentId: string; message: string }>
  dryRun: boolean
}

type CandidateRow = {
  payment_id: string
  payment_date: string
  amount: string | number
  currency: string
  amount_clp: string | number | null
  requires_fx_repair: boolean
} & Record<string, unknown>

type RateRow = {
  rate: string | number
  rate_date: string
} & Record<string, unknown>

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0

  const n = typeof value === 'string' ? Number(value) : value

  return Number.isFinite(n) ? n : 0
}

const round = (value: number) => Math.round(value * 100) / 100

const validateKind = (kind: unknown): RepairPaymentsKind => {
  if (kind !== 'expense_payments' && kind !== 'income_payments') {
    throw new Error(
      `kind debe ser 'expense_payments' | 'income_payments', recibido: ${String(kind)}`
    )
  }

  return kind
}

const validateDate = (label: string, value: string | undefined): void => {
  if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} debe matchear YYYY-MM-DD, recibido: ${value}`)
  }
}

/**
 * Resolver de rate histórico para un payment_date dado.
 *
 * NOTA importante: NO usa el anti-patrón `ep.amount * exchange_rate_to_clp`
 * (esa columna es del DOCUMENTO original, no del payment). Aquí busca un
 * rate FROM/TO_CURRENCY pair en la tabla canónica `exchange_rates`.
 */
const resolveHistoricalRateToClp = async (
  currency: string,
  paymentDate: string
): Promise<{ rate: number; rateDate: string } | null> => {
  if (currency === 'CLP') return { rate: 1, rateDate: paymentDate }

  const rows = await query<RateRow>(
    `SELECT rate::text AS rate, rate_date::text AS rate_date
       FROM greenhouse_finance.exchange_rates
      WHERE from_currency = $1 AND to_currency = 'CLP'
        AND rate_date <= $2::date
      ORDER BY rate_date DESC
      LIMIT 1`,
    [currency, paymentDate]
  )

  const row = rows[0]

  if (!row) return null

  const rate = toNumber(row.rate)

  if (rate <= 0) return null

  return { rate, rateDate: row.rate_date }
}

/**
 * Repair entry point. Devuelve resumen del trabajo + filas a procesar.
 */
export const repairPaymentsClpAmount = async (
  input: RepairPaymentsInput
): Promise<RepairPaymentsResult> => {
  const kind = validateKind(input.kind)

  validateDate('fromDate', input.fromDate)
  validateDate('toDate', input.toDate)

  const batchSize = Math.min(500, Math.max(1, Math.trunc(input.batchSize ?? 100)))
  const dryRun = input.dryRun === true

  // ── Build candidate query (table-specific) ────────────────────────
  const filters: string[] = ['requires_fx_repair = TRUE']
  const params: unknown[] = []

  if (input.paymentIds && input.paymentIds.length > 0) {
    params.push(input.paymentIds)
    filters.push(`payment_id = ANY($${params.length}::text[])`)
  }

  if (input.fromDate) {
    params.push(input.fromDate)
    filters.push(`payment_date >= $${params.length}::date`)
  }

  if (input.toDate) {
    params.push(input.toDate)
    filters.push(`payment_date <= $${params.length}::date`)
  }

  // 3-axis supersede: solo procesar payments activos. Filas superseded
  // ya no son canónicas; no merece la pena resolver FX en ellas.
  filters.push('superseded_by_payment_id IS NULL')
  filters.push('superseded_by_otb_id IS NULL')
  filters.push('superseded_at IS NULL')

  params.push(batchSize)
  const limitParam = `$${params.length}`

  const sql = `
    SELECT payment_id,
           payment_date::text AS payment_date,
           amount::text AS amount,
           currency,
           amount_clp::text AS amount_clp,
           requires_fx_repair
      FROM greenhouse_finance.${kind}
     WHERE ${filters.join(' AND ')}
     ORDER BY payment_date ASC, payment_id ASC
     LIMIT ${limitParam}
  `

  const candidates = await query<CandidateRow>(sql, params)

  const result: RepairPaymentsResult = {
    kind,
    candidatesScanned: candidates.length,
    repaired: 0,
    skipped: [],
    errors: [],
    dryRun
  }

  if (candidates.length === 0 || dryRun) {
    return result
  }

  // ── Process each candidate atomically ─────────────────────────────
  for (const row of candidates) {
    // Idempotency: defensa contra estado inconsistente (amount_clp
    // poblado pero requires_fx_repair=TRUE). Solo limpiamos el flag.
    if (row.amount_clp !== null && row.amount_clp !== undefined) {
      try {
        await query(
          `UPDATE greenhouse_finance.${kind}
              SET requires_fx_repair = FALSE
            WHERE payment_id = $1`,
          [row.payment_id]
        )
        result.repaired += 1
      } catch (err) {
        result.errors.push({
          paymentId: row.payment_id,
          message: err instanceof Error ? err.message : String(err)
        })
      }

      continue
    }

    let resolved: { rate: number; rateDate: string } | null = null

    try {
      resolved = await resolveHistoricalRateToClp(row.currency, row.payment_date)
    } catch (err) {
      result.errors.push({
        paymentId: row.payment_id,
        message:
          err instanceof Error
            ? `rate lookup failed: ${err.message}`
            : `rate lookup failed: ${String(err)}`
      })
      continue
    }

    if (!resolved) {
      result.skipped.push({
        paymentId: row.payment_id,
        reason: `no exchange_rates row for ${row.currency}/CLP at or before ${row.payment_date}`
      })
      continue
    }

    const amountNative = toNumber(row.amount)
    const amountClp = round(amountNative * resolved.rate)

    try {
      await withTransaction(async client => {
        await client.query(
          `UPDATE greenhouse_finance.${kind}
              SET amount_clp = $1,
                  exchange_rate_at_payment = $2,
                  requires_fx_repair = FALSE
            WHERE payment_id = $3
              AND amount_clp IS NULL`,
          [amountClp, resolved!.rate, row.payment_id]
        )
      })
      result.repaired += 1
    } catch (err) {
      captureWithDomain(err, 'finance', {
        tags: {
          source: 'repair_payments_clp_amount',
          kind,
          paymentId: row.payment_id
        }
      })
      result.errors.push({
        paymentId: row.payment_id,
        message: err instanceof Error ? err.message : String(err)
      })
    }
  }

  return result
}
