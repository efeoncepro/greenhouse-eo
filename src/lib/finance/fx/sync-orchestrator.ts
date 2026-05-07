import 'server-only'

import { randomUUID } from 'node:crypto'

import { formatISODateKey } from '@/lib/format'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { FinanceCurrency } from '../shared'
import { roundDecimal } from '../shared'
import { upsertFinanceExchangeRateInPostgres } from '../postgres-store'
import { CURRENCY_REGISTRY } from '../currency-registry'
import type { CurrencyRegistryEntry } from '../currency-registry'
import type { PlatformCurrency } from '../currency-domain'
import { isBreakerOpen, recordFailure, recordSuccess } from './circuit-breaker'
import { getFxProviderAdapter } from './provider-index'
import type {
  FxProviderCode,
  FxRateFetchResult
} from './provider-adapter'

// Canonical FX sync orchestrator. Every caller (cron route, admin endpoint,
// backfill script) hits `syncCurrencyPair` — no one reimplements the
// primary→fallback chain or the upsert/outbox wiring.
//
// Flow:
//   1. Resolve chain from CURRENCY_REGISTRY (or override via
//      input.overrideProviderCode for admin debug).
//   2. For each provider in chain: skip if circuit breaker OPEN, call
//      fetchDailyRate, record success/failure in breaker.
//   3. First provider that returns a valid result wins.
//   4. Transactional upsert to exchange_rates + outbox event
//      finance.exchange_rate.upserted (via the existing postgres helper).
//   5. If primary failed but a fallback won, emit structured observability
//      via source_sync_runs row + notes field.
//   6. If all providers failed, write a failed source_sync_runs row.

export interface SyncCurrencyPairInput {
  fromCurrency: string
  toCurrency: string
  rateDate?: string | null
  dryRun?: boolean
  overrideProviderCode?: FxProviderCode
  triggeredBy?: string
}

export interface SyncCurrencyPairResult {
  success: boolean
  rate: number | null
  rateDate: string | null
  providerUsed: FxProviderCode | null
  providersAttempted: FxProviderCode[]
  isCarried: boolean
  runId: string
  dryRun: boolean
  persistedInverse: boolean
  error?: string
}

const todayIso = () => formatISODateKey(new Date())

const findRegistryEntryForPair = (
  from: string,
  to: string
): CurrencyRegistryEntry | null => {
  // Look up the entry whose currency is the "target" side that needs the
  // provider wired. For USD→MXN the registry entry is MXN's. For USD→CLP
  // it's CLP's. For MXN→USD we pull MXN's registry and invert via the
  // adapter's pair-awareness.
  const upperFrom = from.toUpperCase() as PlatformCurrency
  const upperTo = to.toUpperCase() as PlatformCurrency

  // If one side is USD, the OTHER side's entry governs the chain. If the
  // other side is unknown, the pair is unsupported — do NOT silently fall
  // back to USD's own entry (that would pick up an irrelevant chain).
  if (upperFrom === 'USD') return CURRENCY_REGISTRY[upperTo] ?? null
  if (upperTo === 'USD') return CURRENCY_REGISTRY[upperFrom] ?? null

  // Cross-pair (non-USD both sides): prefer the TO side. Consumers that
  // need USD composition should call the orchestrator twice with USD as
  // the pivot; this orchestrator does not auto-compose (that's the
  // readiness layer's responsibility at read time).
  return CURRENCY_REGISTRY[upperTo] ?? CURRENCY_REGISTRY[upperFrom] ?? null
}

const buildProviderChain = (
  entry: CurrencyRegistryEntry,
  override?: FxProviderCode
): FxProviderCode[] => {
  if (override) return [override]

  return [entry.providers.primary, ...entry.providers.fallbacks]
}

// TASK-475 keeps FinanceCurrency narrow (CLP|USD). The exchange_rates
// table is shared across domains and accepts any ISO string; the narrow
// type is a consumer convention, not a SQL constraint. This cast is the
// documented seam where the FX sync orchestrator writes non-finance_core
// currencies.
const asFinanceCurrencyForPersist = (code: string) => code.toUpperCase() as FinanceCurrency

const persistRate = async ({
  result,
  dryRun
}: {
  result: FxRateFetchResult
  dryRun: boolean
}): Promise<{ persisted: boolean; persistedInverse: boolean }> => {
  if (dryRun) return { persisted: false, persistedInverse: false }

  const rateDateIso = result.rateDate
  const primaryRateId = `${result.fromCurrency}_${result.toCurrency}_${rateDateIso}`

  // Round to 6 decimals for inverse, 2 for primary (pesos-scale) — keep
  // parity with legacy buildUsdClpRatePairs precision.
  const forwardDecimals = result.rate >= 1 ? 2 : 6

  await upsertFinanceExchangeRateInPostgres({
    rateId: primaryRateId,
    fromCurrency: asFinanceCurrencyForPersist(result.fromCurrency),
    toCurrency: asFinanceCurrencyForPersist(result.toCurrency),
    rate: roundDecimal(result.rate, forwardDecimals),
    rateDate: rateDateIso,
    source: result.source
  })

  // Persist the inverse when the adapter's pair is the canonical direction
  // (USD↔local). This preserves the legacy buildUsdClpRatePairs behavior
  // that stored both directions. Skip inverse for cross-pairs to avoid
  // polluting the table with derived values.
  const isCanonicalPair =
    result.fromCurrency === 'USD' || result.toCurrency === 'USD'

  if (!isCanonicalPair) return { persisted: true, persistedInverse: false }

  const inverseRate = 1 / result.rate

  if (!Number.isFinite(inverseRate) || inverseRate <= 0) {
    return { persisted: true, persistedInverse: false }
  }

  const inverseRateId = `${result.toCurrency}_${result.fromCurrency}_${rateDateIso}`

  await upsertFinanceExchangeRateInPostgres({
    rateId: inverseRateId,
    fromCurrency: asFinanceCurrencyForPersist(result.toCurrency),
    toCurrency: asFinanceCurrencyForPersist(result.fromCurrency),
    rate: roundDecimal(inverseRate, 6),
    rateDate: rateDateIso,
    source: result.source
  })

  return { persisted: true, persistedInverse: true }
}

const writeRunStart = async ({
  runId,
  triggeredBy,
  notes
}: {
  runId: string
  triggeredBy: string
  notes: string
}) => {
  try {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_sync.source_sync_runs (
        sync_run_id, source_system, source_object_type, sync_mode,
        status, records_read, records_written_raw, triggered_by, notes, finished_at
      )
      VALUES ($1, 'fx_sync_orchestrator', 'exchange_rate', 'poll', 'running', 0, 0, $2, $3, NULL)
      ON CONFLICT (sync_run_id) DO NOTHING`,
      [runId, triggeredBy, notes]
    )
  } catch {
    // run_tracker logging is observability — never block sync on log failure.
  }
}

const writeRunComplete = async ({
  runId,
  status,
  notes,
  recordsWritten
}: {
  runId: string
  status: 'succeeded' | 'failed' | 'partial' | 'skipped'
  notes: string
  recordsWritten: number
}) => {
  try {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_sync.source_sync_runs
       SET status = $2,
           records_written_raw = $3,
           notes = $4,
           finished_at = CURRENT_TIMESTAMP
       WHERE sync_run_id = $1`,
      [runId, status, recordsWritten, notes]
    )
  } catch {
    // swallow
  }
}

export const syncCurrencyPair = async (
  input: SyncCurrencyPairInput
): Promise<SyncCurrencyPairResult> => {
  const from = input.fromCurrency.toUpperCase()
  const to = input.toCurrency.toUpperCase()
  const rateDate = input.rateDate ?? todayIso()
  const dryRun = input.dryRun === true
  const runId = `fx-${randomUUID()}`
  const triggeredBy = input.triggeredBy ?? 'fx_sync_orchestrator'

  await writeRunStart({
    runId,
    triggeredBy,
    notes: `${from}->${to} @ ${rateDate}${dryRun ? ' (dryRun)' : ''}`
  })

  const entry = findRegistryEntryForPair(from, to)

  if (!entry) {
    await writeRunComplete({
      runId,
      status: 'failed',
      notes: `No registry entry for pair ${from}->${to}`,
      recordsWritten: 0
    })

    return {
      success: false,
      rate: null,
      rateDate: null,
      providerUsed: null,
      providersAttempted: [],
      isCarried: false,
      runId,
      dryRun,
      persistedInverse: false,
      error: `No registry entry for pair ${from}->${to}`
    }
  }

  const chain = buildProviderChain(entry, input.overrideProviderCode)
  const providersAttempted: FxProviderCode[] = []
  let winningResult: FxRateFetchResult | null = null
  let winningProviderCode: FxProviderCode | null = null
  const errors: Array<{ code: FxProviderCode; error: string }> = []

  for (const providerCode of chain) {
    if (isBreakerOpen(providerCode)) {
      errors.push({ code: providerCode, error: 'circuit_breaker_open' })
      continue
    }

    providersAttempted.push(providerCode)
    const adapter = getFxProviderAdapter(providerCode)

    if (!adapter) {
      errors.push({ code: providerCode, error: 'adapter_not_found' })
      continue
    }

    if (adapter.requiresSecret && adapter.secretEnvVar && !process.env[adapter.secretEnvVar]) {
      errors.push({ code: providerCode, error: `missing_secret:${adapter.secretEnvVar}` })
      recordFailure(providerCode)
      continue
    }

    try {
      const result = await adapter.fetchDailyRate({
        fromCurrency: from,
        toCurrency: to,
        rateDate
      })

      if (result) {
        winningResult = result
        winningProviderCode = providerCode
        recordSuccess(providerCode)
        break
      }

      errors.push({ code: providerCode, error: 'adapter_returned_null' })
      recordFailure(providerCode)
    } catch (caught) {
      errors.push({
        code: providerCode,
        error: caught instanceof Error ? caught.message : String(caught)
      })
      recordFailure(providerCode)
    }
  }

  if (!winningResult || !winningProviderCode) {
    const notes = `All providers failed: ${errors.map(e => `${e.code}=${e.error}`).join(', ')}`

    await writeRunComplete({
      runId,
      status: 'failed',
      notes,
      recordsWritten: 0
    })

    return {
      success: false,
      rate: null,
      rateDate: null,
      providerUsed: null,
      providersAttempted,
      isCarried: false,
      runId,
      dryRun,
      persistedInverse: false,
      error: notes
    }
  }

  const { persistedInverse } = await persistRate({ result: winningResult, dryRun })

  const isFallback = winningProviderCode !== chain[0]

  const notes = [
    `${from}->${to}@${winningResult.rateDate}=${winningResult.rate}`,
    `provider=${winningProviderCode}`,
    isFallback ? `primary_failed=${chain[0]}:${errors.find(e => e.code === chain[0])?.error ?? 'unknown'}` : 'primary',
    winningResult.isCarried ? 'carried' : 'fresh',
    dryRun ? 'dryRun' : 'persisted'
  ].join('; ')

  await writeRunComplete({
    runId,
    status: dryRun ? 'skipped' : 'succeeded',
    notes,
    recordsWritten: dryRun ? 0 : persistedInverse ? 2 : 1
  })

  return {
    success: true,
    rate: winningResult.rate,
    rateDate: winningResult.rateDate,
    providerUsed: winningProviderCode,
    providersAttempted,
    isCarried: winningResult.isCarried,
    runId,
    dryRun,
    persistedInverse
  }
}
