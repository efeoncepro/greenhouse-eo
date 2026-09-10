#!/usr/bin/env tsx
/**
 * CLI — Registrar un instrumento de pago por el camino canónico
 * (`createPaymentInstrumentAdmin`, el mismo command que usa
 * `POST /api/admin/payment-instruments`). Lane CLI/runbook de Full API Parity.
 *
 * Uso:
 *
 *   pnpm finance:instrument:create \
 *     --account-id banco-chile-clp \
 *     --name "Banco de Chile" --bank "Banco de Chile" \
 *     --category bank_account --provider banco-chile \
 *     --currency CLP --account-type vista --account-number 308526005 \
 *     --opening-balance 0 --opening-balance-date 2026-08-01 \
 *     --notes "Cuenta Vista abierta agosto 2026" [--dry-run]
 *
 * El saldo de apertura de `accounts` es solo caché: el ancla canónica es la
 * OTB (`pnpm finance:declare-otbs --file ...`).
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { ACCOUNT_TYPES, VALID_CURRENCIES, type AccountType, type FinanceCurrency } from '@/lib/finance/contracts'
import { INSTRUMENT_CATEGORIES, type InstrumentCategory } from '@/config/payment-instruments'
import { createPaymentInstrumentAdmin } from '@/lib/finance/payment-instruments/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const DEFAULT_ACTOR = 'user-efeonce-admin-julio-reyes'

const parseArgs = () => {
  const argv = process.argv.slice(2)
  const args: Record<string, string | boolean> = {}

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]

    if (!token.startsWith('--')) continue

    const key = token.slice(2)
    const next = argv[i + 1]

    if (next === undefined || next.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = next
      i++
    }
  }

  return args
}

const requireString = (args: Record<string, string | boolean>, key: string): string => {
  const value = args[key]

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`--${key} es obligatorio`)
  }

  return value.trim()
}

const optionalString = (args: Record<string, string | boolean>, key: string): string | null => {
  const value = args[key]

  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = parseArgs()
  const dryRun = args['dry-run'] === true

  const accountId = requireString(args, 'account-id')
  const accountName = requireString(args, 'name')
  const bankName = optionalString(args, 'bank') ?? accountName
  const category = requireString(args, 'category')
  const currency = requireString(args, 'currency').toUpperCase()
  const accountType = optionalString(args, 'account-type') ?? 'checking'

  if (!INSTRUMENT_CATEGORIES.includes(category as InstrumentCategory)) {
    throw new Error(`--category debe ser uno de: ${INSTRUMENT_CATEGORIES.join(', ')}`)
  }

  if (!VALID_CURRENCIES.includes(currency as FinanceCurrency)) {
    throw new Error(`--currency debe ser uno de: ${VALID_CURRENCIES.join(', ')}`)
  }

  if (!ACCOUNT_TYPES.includes(accountType as AccountType)) {
    throw new Error(`--account-type debe ser uno de: ${ACCOUNT_TYPES.join(', ')}`)
  }

  const spaceId = optionalString(args, 'space-id')
    ?? (await runGreenhousePostgresQuery<{ space_id: string }>(
      `SELECT space_id FROM greenhouse_finance.accounts WHERE space_id IS NOT NULL GROUP BY space_id ORDER BY COUNT(*) DESC LIMIT 1`
    ))[0]?.space_id

  if (!spaceId) {
    throw new Error('No se pudo resolver el space canónico; pásalo con --space-id')
  }

  const input = {
    accountName,
    bankName,
    accountNumber: optionalString(args, 'account-number'),
    accountNumberFull: optionalString(args, 'account-number-full'),
    currency: currency as FinanceCurrency,
    accountType: accountType as AccountType,
    country: optionalString(args, 'country') ?? 'CL',
    openingBalance: Number(optionalString(args, 'opening-balance') ?? 0),
    openingBalanceDate: optionalString(args, 'opening-balance-date'),
    notes: optionalString(args, 'notes'),
    instrumentCategory: category,
    providerSlug: optionalString(args, 'provider'),
    providerIdentifier: optionalString(args, 'provider-identifier'),
    cardLastFour: optionalString(args, 'card-last-four'),
    cardNetwork: optionalString(args, 'card-network'),
    creditLimit: optionalString(args, 'credit-limit') ? Number(optionalString(args, 'credit-limit')) : null,
    responsibleUserId: optionalString(args, 'responsible-user-id'),
    defaultFor: [] as string[],
    displayOrder: Number(optionalString(args, 'display-order') ?? 0)
  }

  console.log(`[instrument] ${dryRun ? 'DRY-RUN ' : ''}${accountId} @ ${spaceId}`)
  console.log(JSON.stringify(input, null, 2))

  if (dryRun) return

  const created = await createPaymentInstrumentAdmin({
    accountId,
    spaceId,
    actorUserId: optionalString(args, 'actor') ?? DEFAULT_ACTOR,
    input,
    reason: optionalString(args, 'reason') ?? 'Registro por CLI canónico (finance:instrument:create)'
  })

  console.log(`  ✓ creado ${created.accountId} (${created.instrumentCategory}/${created.accountType} ${created.currency})`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  })
