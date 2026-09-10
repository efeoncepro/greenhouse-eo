#!/usr/bin/env tsx
/**
 * CLI — Importar una cartola/extracto real a un período de conciliación
 * (lane CLI/runbook de Full API Parity; mismos commands que la ruta
 * `POST /api/finance/reconciliation/[id]/statements` y `.../auto-match`).
 *
 * Uso:
 *
 *   pnpm finance:import-statement \
 *     --account santander-clp --year 2026 --month 8 \
 *     --file data/bank/Santander-CLP-Agosto-CartolaHistCtaCte-000092044661-0030-20260910.xlsx \
 *     [--format santander_cartola_xlsx] [--from 2026-08-01 --to 2026-08-31] \
 *     [--create-period] [--auto-match] [--dry-run]
 *
 * PDF: si `--file` termina en .pdf se extrae el texto con `pdftotext -layout`
 * (Poppler) y se parsea como `santander_tc_estado_cuenta_text`; con
 * `--pdf-password` se pasa la clave del PDF (los bancos usan el RUT).
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { parseBankStatementFile, type ParsedStatementRow } from '@/lib/finance/bank-statements'
import {
  createReconciliationPeriodInPostgres,
  getReconciliationPeriodDetailFromPostgres,
  importBankStatementsToPostgres,
  listUnmatchedStatementRowsFromPostgres
} from '@/lib/finance/postgres-reconciliation'
import { runPeriodAutoMatch } from '@/lib/finance/reconciliation/auto-match-period'

const DEFAULT_ACTOR = 'user-efeonce-admin-julio-reyes'

const parseArgs = () => {
  const argv = process.argv.slice(2)
  const args: Record<string, string | boolean> = {}

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]

    if (!token.startsWith('--')) continue

    const key = token.slice(2)
    const next = argv[i + 1]

    if (next === undefined || next.startsWith('--')) args[key] = true
    else {
      args[key] = next
      i++
    }
  }

  return args
}

const str = (args: Record<string, string | boolean>, key: string): string | null =>
  typeof args[key] === 'string' && (args[key] as string).trim() !== '' ? (args[key] as string).trim() : null

const required = (args: Record<string, string | boolean>, key: string): string => {
  const value = str(args, key)

  if (!value) throw new Error(`--${key} es obligatorio`)

  return value
}

const extractPdfText = (file: string, password: string | null): string => {
  const cliArgs = ['-layout']

  if (password) cliArgs.push('-upw', password)

  cliArgs.push(file, '-')

  return execFileSync('pdftotext', cliArgs, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
}

const formatAmount = (value: number) => value.toLocaleString('es-CL', { maximumFractionDigits: 2 })

const formatDate = (value: string | Date) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10))

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = parseArgs()
  const dryRun = args['dry-run'] === true
  const accountId = required(args, 'account')
  const year = Number(required(args, 'year'))
  const month = Number(required(args, 'month'))
  const file = path.resolve(required(args, 'file'))
  const from = str(args, 'from')
  const to = str(args, 'to')
  const actor = str(args, 'actor') ?? DEFAULT_ACTOR

  if (!existsSync(file)) throw new Error(`No existe ${file}`)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('--year/--month inválidos')

  const isPdf = /\.pdf$/i.test(file)

  const parsed = parseBankStatementFile(
    isPdf
      ? { content: extractPdfText(file, str(args, 'pdf-password')), format: str(args, 'format') ?? 'santander_tc_estado_cuenta_text' }
      : { content: readFileSync(file), fileName: path.basename(file), format: str(args, 'format') }
  )

  const inRange = (row: ParsedStatementRow) => (!from || row.transactionDate >= from) && (!to || row.transactionDate <= to)
  const rows = parsed.rows.filter(inRange)

  console.log(`[import] ${path.basename(file)} → formato ${parsed.format}`)
  console.log(`[import] meta: ${JSON.stringify(parsed.meta)}`)
  console.log(`[import] filas parseadas ${parsed.rows.length}, en rango ${rows.length}${from || to ? ` (${from ?? '…'}..${to ?? '…'})` : ''}`)

  const inflows = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0)
  const outflows = rows.filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0)

  console.log(`[import] abonos ${formatAmount(inflows)} · cargos ${formatAmount(outflows)} · neto ${formatAmount(inflows + outflows)}`)

  for (const row of rows) {
    console.log(`  ${row.transactionDate}  ${formatAmount(row.amount).padStart(14)}  ${row.description}${row.reference ? `  [${row.reference}]` : ''}`)
  }

  if (rows.length === 0) throw new Error('No hay filas en el rango indicado.')
  if (dryRun) return

  const periodId = `${accountId}_${year}_${String(month).padStart(2, '0')}`
  let period = await getReconciliationPeriodDetailFromPostgres(periodId).catch(() => null)

  if (!period) {
    if (args['create-period'] !== true) {
      throw new Error(`El período ${periodId} no existe; pásale --create-period para crearlo (opening = OTB/cierre anterior).`)
    }

    await createReconciliationPeriodInPostgres({
      periodId,
      accountId,
      year,
      month,
      openingBalance: null,
      notes: `Período creado por CLI finance:import-statement desde ${path.basename(file)} (${parsed.format}).`
    })

    period = await getReconciliationPeriodDetailFromPostgres(periodId)
    console.log(`[import] período ${periodId} creado (opening ${period ? formatAmount(Number((period as { opening_balance?: unknown }).opening_balance ?? 0)) : '?'})`)
  }

  const result = await importBankStatementsToPostgres(periodId, rows.map(r => ({
    transactionDate: r.transactionDate,
    valueDate: r.valueDate ?? null,
    description: r.description,
    reference: r.reference,
    amount: r.amount,
    balance: r.balance
  })))

  console.log(`[import] importadas ${result.imported} · omitidas (duplicadas) ${result.skipped} · total período ${result.totalRowCount} · batch ${result.importBatchId}`)

  if (args['auto-match'] === true) {
    const match = await runPeriodAutoMatch({ periodId, actorUserId: actor })

    console.log(`[auto-match] matched ${match.matched} · suggested ${match.suggested} · unmatched ${match.unmatched} / ${match.total}`)

    const unmatched = await listUnmatchedStatementRowsFromPostgres(periodId)

    for (const row of unmatched) {
      console.log(`  sin calce  ${formatDate(row.transaction_date)}  ${formatAmount(Number(row.amount)).padStart(14)}  ${row.description}`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  })
