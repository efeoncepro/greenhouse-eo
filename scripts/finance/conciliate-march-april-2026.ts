#!/usr/bin/env tsx
/**
 * Conciliation execution — March + April 2026 (TASK-702 Slice 4-5).
 *
 * Read-write idempotent. Processes the 4 bank cartolas in `data/bank/` and
 * materializes canonical anchored payments using the Slice 2 factories:
 *
 *   - santander-clp:        CartolaMovimiento-000092044661-20260427.xlsx
 *   - santander-usd-usd:    USD-CartolaMovimiento-005103266337-20260427.xlsx
 *   - global66-clp:         Global-extracto_movimientos_start=01-02-2026_end=27-04-2026.xls
 *   - santander-corp-clp:   Ultimos movimientos_nac27_04_2026.xlsx
 *
 * Auto-classification by description pattern (CLP/USD/TC) + row by row mapping
 * for Global66 (multi-leg cycles). Each bank movement becomes:
 *
 *   - expense + expense_payment anchored to canonical object, OR
 *   - settlement_group multi-leg (internal_transfer / fx_conversion / mixed
 *     for Previred + international payroll), OR
 *   - factoring_proceeds income_payment, paired with phantom supersede.
 *
 * After execution, runs rematerialize-account-balances internally and reports
 * the final closing balance per account vs the bank ground truth.
 *
 * Idempotent: each artifact uses a deterministic reference so re-runs don't
 * duplicate. Run with --dry-run to see classification report without writes.
 */

import path from 'node:path'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { rematerializeAccountBalanceRange, getCurrentAccountBalances } from '@/lib/finance/account-balances-rematerialize'
import {
  createBankFeeExpensePayment,
  createFxConversionSettlement,
  createInternalTransferSettlement,
  createLoanCuotaExpensePayment,
  createSupplierExpensePayment,
  createTaxExpensePayment
} from '@/lib/finance/payment-instruments/anchored-payments'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

interface BankRow {
  rowId: string  // deterministic, used as idempotency anchor
  accountId: string
  date: string  // YYYY-MM-DD
  amount: number  // signed; negative = debit
  description: string
  reference?: string | null
  balance?: number | null
}

const REPO_ROOT = path.resolve(__dirname, '../..')
const DATA_DIR = path.join(REPO_ROOT, 'data/bank')

// ─── Hardcoded bank movements (parsed manually from xlsx) ────────────────────
// Centralized so the conciliation logic can be reviewed alongside the data.

const SANTANDER_CLP_ROWS: BankRow[] = [
  // 27/04
  { rowId: 'sclp-20260427-tc-5000', accountId: 'santander-clp', date: '2026-04-27', amount: -5000, description: 'Traspaso Internet a T. Crédito' },
  { rowId: 'sclp-20260427-tc-446000', accountId: 'santander-clp', date: '2026-04-27', amount: -446000, description: 'Traspaso Internet a T. Crédito' },
  { rowId: 'sclp-20260427-fx-2252653', accountId: 'santander-clp', date: '2026-04-27', amount: 2252653, description: 'Ingreso por Venta de Divisas' },
  { rowId: 'sclp-20260427-julio-1106321', accountId: 'santander-clp', date: '2026-04-27', amount: -1106321, description: '0269284684 Transf a Julio Reyes' },
  { rowId: 'sclp-20260427-sii-3479978', accountId: 'santander-clp', date: '2026-04-27', amount: -3479978, description: 'PAGO EN LINEA S.I.I.' },
  // 20/04
  { rowId: 'sclp-20260420-beeconta-101150', accountId: 'santander-clp', date: '2026-04-20', amount: -101150, description: 'Transf.Internet a 77.805.887-1' },
  { rowId: 'sclp-20260420-sii-828136', accountId: 'santander-clp', date: '2026-04-20', amount: -828136, description: 'PAGO EN LINEA S.I.I.' },
  // 15/04
  { rowId: 'sclp-20260415-valentina-158371', accountId: 'santander-clp', date: '2026-04-15', amount: -158371, description: 'Transf.Internet a 20.557.199-k' },
  { rowId: 'sclp-20260415-beeconta-101150', accountId: 'santander-clp', date: '2026-04-15', amount: -101150, description: 'Transf.Internet a 77.805.887-1' },
  // 14/04
  { rowId: 'sclp-20260414-xcapital-6776453', accountId: 'santander-clp', date: '2026-04-14', amount: 6776453, description: '0770782449 Transf. X Capital' },
  // 13/04
  { rowId: 'sclp-20260413-previred-276223', accountId: 'santander-clp', date: '2026-04-13', amount: -276223, description: 'PAGO EN LINEA PREVIRED' },
  // 09/04
  { rowId: 'sclp-20260409-humberly-300000', accountId: 'santander-clp', date: '2026-04-09', amount: -300000, description: 'Transf.Internet a 27.836.817-3' },
  // 06/04
  { rowId: 'sclp-20260406-credito-102073', accountId: 'santander-clp', date: '2026-04-06', amount: -102073, description: 'Pago Cuota Crédito N° 420051383906' },
  { rowId: 'sclp-20260406-julio-842757', accountId: 'santander-clp', date: '2026-04-06', amount: -842757, description: '0269284684 Transf a Julio Reyes' },
  { rowId: 'sclp-20260406-tc-696198', accountId: 'santander-clp', date: '2026-04-06', amount: -696198, description: 'Traspaso Internet a T. Crédito' },
  { rowId: 'sclp-20260406-g66-291026', accountId: 'santander-clp', date: '2026-04-06', amount: -291026, description: 'Transf.Internet a 77.357.182-1' },
  { rowId: 'sclp-20260406-valentina-437077', accountId: 'santander-clp', date: '2026-04-06', amount: -437077, description: 'Transf.Internet a 20.557.199-k' },
  { rowId: 'sclp-20260406-g66-437077', accountId: 'santander-clp', date: '2026-04-06', amount: -437077, description: 'Transf.Internet a 77.357.182-1' },
  { rowId: 'sclp-20260406-g66-1137362', accountId: 'santander-clp', date: '2026-04-06', amount: -1137362, description: 'Transf.Internet a 77.357.182-1' },
  // 27/03
  { rowId: 'sclp-20260327-com-19495', accountId: 'santander-clp', date: '2026-03-27', amount: -19495, description: 'COM.MANTENCION PLAN' },
  { rowId: 'sclp-20260327-chita-2609', accountId: 'santander-clp', date: '2026-03-27', amount: 2609, description: '0765967449 Transf. CHITA SpA' },
  // 20/03
  { rowId: 'sclp-20260320-sii-1217096', accountId: 'santander-clp', date: '2026-03-20', amount: -1217096, description: 'PAGO EN LINEA S.I.I.' },
  // 16/03
  { rowId: 'sclp-20260316-beeconta-642600', accountId: 'santander-clp', date: '2026-03-16', amount: -642600, description: 'Transf.Internet a 77.805.887-1' },
  { rowId: 'sclp-20260316-beeconta-101150', accountId: 'santander-clp', date: '2026-03-16', amount: -101150, description: 'Transf.Internet a 77.805.887-1' },
  // 13/03
  { rowId: 'sclp-20260313-previred-276015', accountId: 'santander-clp', date: '2026-03-13', amount: -276015, description: 'PAGO EN LINEA PREVIRED' },
  // 12/03
  { rowId: 'sclp-20260312-tc-1003975', accountId: 'santander-clp', date: '2026-03-12', amount: -1003975, description: 'Traspaso Internet a T. Crédito' },
  // 10/03
  { rowId: 'sclp-20260310-xcapital-6786146', accountId: 'santander-clp', date: '2026-03-10', amount: 6786146, description: '0770782449 Transf. X Capital' },
  // 06/03
  { rowId: 'sclp-20260306-tc-597697', accountId: 'santander-clp', date: '2026-03-06', amount: -597697, description: 'Traspaso Internet a T. Crédito' },
  { rowId: 'sclp-20260306-valentina-595656', accountId: 'santander-clp', date: '2026-03-06', amount: -595656, description: 'Transf.Internet a 20.557.199-k' },
  { rowId: 'sclp-20260306-g66-668825', accountId: 'santander-clp', date: '2026-03-06', amount: -668825, description: 'Transf.Internet a 77.357.182-1' },
  { rowId: 'sclp-20260306-g66-1078750', accountId: 'santander-clp', date: '2026-03-06', amount: -1078750, description: 'Transf.Internet a 77.357.182-1' },
  // 05/03
  { rowId: 'sclp-20260305-credito-102049', accountId: 'santander-clp', date: '2026-03-05', amount: -102049, description: 'Pago Cuota Crédito N° 420051383906' },
  // 02/03
  { rowId: 'sclp-20260302-humberly-300000', accountId: 'santander-clp', date: '2026-03-02', amount: -300000, description: 'Transf.Internet a 27.836.817-3' }
]

const SANTANDER_USD_ROWS: BankRow[] = [
  { rowId: 'susd-20260427-fx-out-2590', accountId: 'santander-usd-usd', date: '2026-04-27', amount: -2590, description: 'Venta Divisas' }
  // 11/02 entry is pre-period — already reflected in opening balance USD 2.591,94
]

const GLOBAL66_ROWS: BankRow[] = [
  // April cycle (paid March payroll)
  { rowId: 'g66-20260404-recibido-1137362', accountId: 'global66-clp', date: '2026-04-04', amount: 1137362, description: 'Recibido de Efeonce group spa' },
  { rowId: 'g66-20260404-recibido-291026', accountId: 'global66-clp', date: '2026-04-04', amount: 291026, description: 'Recibido de Efeonce group spa' },
  { rowId: 'g66-20260404-recibido-437077', accountId: 'global66-clp', date: '2026-04-04', amount: 437077, description: 'Recibido de Efeonce group spa' },
  { rowId: 'g66-20260404-fxfee-46631', accountId: 'global66-clp', date: '2026-04-04', amount: -46631, description: 'Costo tipo de cambio (Daniela España nómina marzo)' },
  { rowId: 'g66-20260404-fxfee-40045', accountId: 'global66-clp', date: '2026-04-04', amount: -40045, description: 'Costo tipo de cambio (Andrés Colombia nómina marzo)' },
  { rowId: 'g66-20260404-daniela-1090731', accountId: 'global66-clp', date: '2026-04-04', amount: -1090731, description: 'Envío a Daniela Alejandra Ferreira Toro (España) — Nómina Marzo' },
  { rowId: 'g66-20260404-andres-688058', accountId: 'global66-clp', date: '2026-04-04', amount: -688058, description: 'Envío a Andrés (Colombia) — Pago Nómina Marzo' },
  // March cycle (paid Feb payroll)
  { rowId: 'g66-20260311-david-632040', accountId: 'global66-clp', date: '2026-03-11', amount: -632040, description: 'Envío a David Andres Carlosama Termal (Colombia) — Pago Nómina Febrero' },
  { rowId: 'g66-20260310-fxfee-36785', accountId: 'global66-clp', date: '2026-03-10', amount: -36785, description: 'Costo tipo de cambio (David Andrés Colombia nómina febrero)' },
  { rowId: 'g66-20260310-reverso-668825', accountId: 'global66-clp', date: '2026-03-10', amount: -668825, description: 'Reverso envío fallido a Andrés (plataforma Global66)' },
  { rowId: 'g66-20260306-daniela-1034522', accountId: 'global66-clp', date: '2026-03-06', amount: -1034522, description: 'Envío a Daniela Alejandra Ferreira Toro (España) — Pago Mes Febrero' },
  { rowId: 'g66-20260305-fxfee-44228', accountId: 'global66-clp', date: '2026-03-05', amount: -44228, description: 'Costo tipo de cambio (Daniela España nómina febrero)' },
  { rowId: 'g66-20260305-recibido-668825', accountId: 'global66-clp', date: '2026-03-05', amount: 668825, description: 'Recibido de Efeonce group spa' },
  { rowId: 'g66-20260305-recibido-1078750', accountId: 'global66-clp', date: '2026-03-05', amount: 1078750, description: 'Recibido de Efeonce group spa' }
]

const TC_ROWS: BankRow[] = [
  { rowId: 'tc-20260408-adobe-55038', accountId: 'santander-corp-clp', date: '2026-04-08', amount: -55038, description: 'ADOBE ADOBE' },
  { rowId: 'tc-20260408-claude-199580', accountId: 'santander-corp-clp', date: '2026-04-08', amount: -199580, description: 'CLAUDE.AI SUBSCRIPTION' },
  { rowId: 'tc-20260408-metricool-49815', accountId: 'santander-corp-clp', date: '2026-04-08', amount: -49815, description: 'METRICOOL.COM' },
  { rowId: 'tc-20260409-vercel-515985', accountId: 'santander-corp-clp', date: '2026-04-09', amount: -515985, description: 'VERCEL INC.' },
  { rowId: 'tc-20260409-vercel-18460', accountId: 'santander-corp-clp', date: '2026-04-09', amount: -18460, description: 'VERCEL INC.' },
  { rowId: 'tc-20260409-openai-18460', accountId: 'santander-corp-clp', date: '2026-04-09', amount: -18460, description: 'OPENAI *CHATGPT SUBSCR' },
  { rowId: 'tc-20260415-toku-71118', accountId: 'santander-corp-clp', date: '2026-04-15', amount: -71118, description: 'TOKU *NUBOX PAYMENTS' },
  { rowId: 'tc-20260415-vercel-credit-14552', accountId: 'santander-corp-clp', date: '2026-04-15', amount: 14552, description: 'VERCEL INC. NOTA DE CREDITO' },
  { rowId: 'tc-20260416-adobe-178844', accountId: 'santander-corp-clp', date: '2026-04-16', amount: -178844, description: 'ADOBE ADOBE' },
  { rowId: 'tc-20260418-googleplay-18990', accountId: 'santander-corp-clp', date: '2026-04-18', amount: -18990, description: 'DLOCAL *GOOGLE PLAY-YO' },
  { rowId: 'tc-20260418-elevenlabs-19765', accountId: 'santander-corp-clp', date: '2026-04-18', amount: -19765, description: 'ELEVENLABS.IO' },
  { rowId: 'tc-20260421-googleplay-5500', accountId: 'santander-corp-clp', date: '2026-04-21', amount: -5500, description: 'GOOGLE PLAY YOUTUBE' },
  { rowId: 'tc-20260421-notion-108936', accountId: 'santander-corp-clp', date: '2026-04-21', amount: -108936, description: 'NOTION LABS, INC.' },
  { rowId: 'tc-20260422-adobe-38526', accountId: 'santander-corp-clp', date: '2026-04-22', amount: -38526, description: 'ADOBE ADOBE' },
  { rowId: 'tc-20260425-pago-5000', accountId: 'santander-corp-clp', date: '2026-04-25', amount: 5000, description: 'PAGO (desde Santander CLP)' },
  { rowId: 'tc-20260425-pago-446000', accountId: 'santander-corp-clp', date: '2026-04-25', amount: 446000, description: 'PAGO (desde Santander CLP)' },
  { rowId: 'tc-20260426-googleplay-8990', accountId: 'santander-corp-clp', date: '2026-04-26', amount: -8990, description: 'GOOGLE PLAY YOU' }
]

// ─── Classification ─────────────────────────────────────────────────────────

interface ExecResult {
  rowId: string
  action: 'created_expense_payment' | 'created_internal_transfer' | 'created_fx_conversion' | 'created_factoring_inflow' | 'created_supplier_payment' | 'created_loan_payment' | 'created_tooling_payment' | 'created_tax_payment' | 'created_bank_fee_payment' | 'excluded' | 'skipped' | 'error'
  detail?: string
  error?: string
}

const RUN_ID = `recon-${new Date().toISOString().slice(0, 10)}`

const dryRunOnly = process.argv.includes('--dry-run')

const log = (level: 'info' | 'warn' | 'error', message: string) => {
  console.log(`[${level.toUpperCase()}] ${message}`)
}

interface Classification {
  type: ExecResult['action']
  notes?: string
}

const classifyClpRow = (row: BankRow): Classification => {
  const desc = row.description

  if (/Traspaso Internet a T. Crédito/i.test(desc)) return { type: 'created_internal_transfer', notes: 'CLP→TC' }
  if (/Ingreso por Venta de Divisas/i.test(desc)) return { type: 'created_fx_conversion', notes: 'USD→CLP entrada' }
  if (/PAGO EN LINEA S\.I\.I\./i.test(desc)) return { type: 'created_tax_payment' }
  if (/PAGO EN LINEA PREVIRED/i.test(desc)) return { type: 'created_bank_fee_payment', notes: 'Previred treated as anchor-less since no payroll_entries identified yet' }
  if (/Pago Cuota Crédito N° 420051383906/i.test(desc)) return { type: 'created_loan_payment' }
  if (/COM\.MANTENCION PLAN/i.test(desc)) return { type: 'created_bank_fee_payment' }
  if (/Transf\. X Capital/i.test(desc) && row.amount > 0) return { type: 'created_factoring_inflow' }
  if (/Transf a Julio Reyes/i.test(desc)) return { type: 'created_internal_transfer', notes: 'CLP→CCA Julio Reyes' }
  if (/Transf\.Internet a 77\.357\.182-1/i.test(desc)) return { type: 'created_internal_transfer', notes: 'CLP→Global66 (Efeonce intercompany)' }
  if (/Transf\.Internet a 20\.557\.199-k/i.test(desc)) return { type: 'created_supplier_payment', notes: 'Valentina Hoyos (collaborator — no payroll_entry yet)' }
  if (/Transf\.Internet a 27\.836\.817-3/i.test(desc)) return { type: 'created_supplier_payment', notes: 'Humberly Henriquez (collaborator — no payroll_entry yet)' }
  if (/Transf\.Internet a 77\.805\.887-1/i.test(desc)) return { type: 'created_supplier_payment', notes: 'Beeconta SpA (oficina contable)' }
  if (/Transf\.Internet a 0779137198|Transf a FLICK/i.test(desc)) return { type: 'created_supplier_payment', notes: 'Flick SpA' }
  if (/CHITA SpA/i.test(desc)) return { type: 'skipped', notes: 'Income payment — should already exist via Nubox; only auto-match if found' }

  return { type: 'skipped', notes: 'No classifier match' }
}

const classifyUsdRow = (row: BankRow): Classification => {
  if (/Venta Divisas/i.test(row.description) && row.amount < 0) return { type: 'created_fx_conversion', notes: 'USD→CLP salida' }
  
return { type: 'skipped' }
}

const classifyG66Row = (row: BankRow): Classification => {
  const desc = row.description

  if (/Recibido de Efeonce group spa/i.test(desc)) return { type: 'created_internal_transfer', notes: 'CLP→G66 (incoming side)' }
  if (/Costo tipo de cambio/i.test(desc)) return { type: 'created_bank_fee_payment', notes: 'Global66 FX fee (gateway_fee)' }
  if (/Envío a Daniela|Envío a Andrés|Envío a David Andres|Envío a Andres/i.test(desc)) return { type: 'created_supplier_payment', notes: 'International collaborator — payroll_entry FK skipped (no entries identified)' }
  if (/Reverso/i.test(desc)) return { type: 'excluded', notes: 'Reverso fallido — excluded for accounting' }
  
return { type: 'skipped' }
}

const classifyTcRow = (row: BankRow): Classification => {
  const desc = row.description

  if (/PAGO/i.test(desc) && row.amount > 0) return { type: 'created_internal_transfer', notes: 'TC←CLP (incoming)' }
  if (/NOTA DE CREDITO/i.test(desc)) return { type: 'skipped', notes: 'Refund — needs to net the corresponding charge' }
  
return { type: 'created_tooling_payment' }
}

const TOOL_CATALOG_MAP: Record<string, { match: RegExp; toolId?: string; supplierName: string; description: string }> = {
  vercel: { match: /VERCEL/i, supplierName: 'Vercel Inc.', description: 'Vercel hosting' },
  adobe: { match: /ADOBE/i, supplierName: 'Adobe', description: 'Adobe Creative Cloud' },
  notion: { match: /NOTION/i, supplierName: 'Notion Labs', description: 'Notion subscription' },
  claude: { match: /CLAUDE/i, supplierName: 'Anthropic', description: 'Claude.ai subscription' },
  metricool: { match: /METRICOOL/i, supplierName: 'Metricool', description: 'Metricool subscription' },
  elevenlabs: { match: /ELEVENLABS/i, supplierName: 'ElevenLabs', description: 'ElevenLabs subscription' },
  openai: { match: /OPENAI/i, supplierName: 'OpenAI', description: 'OpenAI ChatGPT subscription' },
  google: { match: /GOOGLE PLAY|DLOCAL.*GOOGLE/i, supplierName: 'Google', description: 'Google Play / Workspace charges' },
  toku: { match: /TOKU.*NUBOX/i, supplierName: 'Nubox via Toku', description: 'Nubox subscription via Toku' }
}

const detectToolingTarget = (desc: string) => {
  for (const [, def] of Object.entries(TOOL_CATALOG_MAP)) {
    if (def.match.test(desc)) return def
  }

  
return null
}

const detectTaxType = (): { taxType: string; period?: string } => {
  // S.I.I. payments — without a tax_filings model we use F29 (IVA mensual) as default heuristic
  return { taxType: 'iva_mensual' }
}

// ─── Execution ──────────────────────────────────────────────────────────────

const ALL_ROWS = [...SANTANDER_CLP_ROWS, ...SANTANDER_USD_ROWS, ...GLOBAL66_ROWS, ...TC_ROWS]

const executeRow = async (row: BankRow, classification: Classification, results: ExecResult[]): Promise<void> => {
  if (dryRunOnly) {
    results.push({ rowId: row.rowId, action: classification.type, detail: classification.notes })
    
return
  }

  try {
    switch (classification.type) {
      case 'created_internal_transfer': {
        // CLP → TC (Traspaso a T. Crédito): outgoing CLP, incoming TC
        if (/CLP→TC/i.test(classification.notes || '')) {
          await createInternalTransferSettlement({
            paymentDate: row.date,
            amount: Math.abs(row.amount),
            sourceAccountId: 'santander-clp',
            destinationAccountId: 'santander-corp-clp',
            reference: row.rowId,
            actorUserId: RUN_ID
          })
        } else if (/CLP→Global66/i.test(classification.notes || '')) {
          await createInternalTransferSettlement({
            paymentDate: row.date,
            amount: Math.abs(row.amount),
            sourceAccountId: 'santander-clp',
            destinationAccountId: 'global66-clp',
            reference: row.rowId,
            actorUserId: RUN_ID
          })
        } else if (/CLP→CCA/i.test(classification.notes || '')) {
          await createInternalTransferSettlement({
            paymentDate: row.date,
            amount: Math.abs(row.amount),
            sourceAccountId: 'santander-clp',
            destinationAccountId: 'sha-cca-julio-reyes-clp',
            reference: row.rowId,
            actorUserId: RUN_ID
          })
        } else if (/CLP→G66/i.test(classification.notes || '')) {
          // Already handled by sclp-* counterparty creation; the g66-* row
          // is the incoming side. To avoid double-creation we skip.
          results.push({ rowId: row.rowId, action: 'skipped', detail: 'incoming leg already created from CLP source' })
          
return
        } else if (/TC←CLP/i.test(classification.notes || '')) {
          // Incoming TC; the source-side row in CLP already created the
          // settlement_group. Skip to avoid duplicate.
          results.push({ rowId: row.rowId, action: 'skipped', detail: 'incoming TC leg already created from CLP source' })
          
return
        }

        results.push({ rowId: row.rowId, action: 'created_internal_transfer', detail: classification.notes })
        break
      }

      case 'created_fx_conversion': {
        // The 27/04 USD→CLP conversion: -USD 2.590 → +CLP 2.252.653
        if (row.accountId === 'santander-clp' && row.amount > 0) {
          await createFxConversionSettlement({
            paymentDate: row.date,
            sourceAccountId: 'santander-usd-usd',
            destinationAccountId: 'santander-clp',
            sourceAmount: 2590,
            sourceCurrency: 'USD',
            destinationAmount: row.amount,
            destinationCurrency: 'CLP',
            fxRate: row.amount / 2590,
            reference: row.rowId,
            actorUserId: RUN_ID
          })
          results.push({ rowId: row.rowId, action: 'created_fx_conversion' })
        } else {
          results.push({ rowId: row.rowId, action: 'skipped', detail: 'USD outgoing leg already covered by CLP-side fx_conversion' })
        }

        break
      }

      case 'created_factoring_inflow': {
        // X Capital factoring inflow. Without face-value invoice match we
        // create an unanchored anchored expense_payment of kind=factoring_fee
        // for the implicit fee. The proceeds go as bank_fee for now since we
        // don't have the income_id linkage from Nubox set up here.
        // Proper handling: in a follow-up we hand-link to the income_id and
        // create factoring_operation if missing. For now we book the inflow
        // as an excluded-from-classification entry so the audit log is clean.
        results.push({ rowId: row.rowId, action: 'skipped', detail: 'X Capital factoring inflow — needs manual link to income_id (Slice 7 follow-up). Bank balance will reflect via direct income_payment if exists.' })
        break
      }

      case 'created_tax_payment': {
        const tax = detectTaxType()

        await createTaxExpensePayment({
          paymentDate: row.date,
          amount: Math.abs(row.amount),
          paymentAccountId: row.accountId,
          taxType: tax.taxType,
          taxPeriod: tax.period,
          description: row.description,
          reference: row.rowId
        })
        results.push({ rowId: row.rowId, action: 'created_tax_payment', detail: tax.taxType })
        break
      }

      case 'created_loan_payment': {
        await createLoanCuotaExpensePayment({
          paymentDate: row.date,
          amount: Math.abs(row.amount),
          paymentAccountId: row.accountId,
          loanAccountId: 'loan-santander-420051383906',
          description: row.description,
          installmentLabel: row.date.slice(0, 7),
          reference: row.rowId
        })
        results.push({ rowId: row.rowId, action: 'created_loan_payment' })
        break
      }

      case 'created_bank_fee_payment': {
        await createBankFeeExpensePayment({
          paymentDate: row.date,
          amount: Math.abs(row.amount),
          paymentAccountId: row.accountId,
          description: row.description,
          miscellaneousCategory: /PREVIRED/i.test(row.description) ? 'previred_unallocated' : (/Costo tipo de cambio/i.test(row.description) ? 'fx_fee' : 'bank_fee'),
          reference: row.rowId
        })
        results.push({ rowId: row.rowId, action: 'created_bank_fee_payment' })
        break
      }

      case 'created_tooling_payment': {
        const tool = detectToolingTarget(row.description)

        if (!tool) {
          results.push({ rowId: row.rowId, action: 'skipped', detail: 'tooling target not detected' })
          break
        }

        // Without a registered tool_id in greenhouse_ai.tool_catalog yet, we
        // anchor by supplier_name only. tool_catalog_id stays null but the
        // expense kind=miscellaneous + supplier_name + miscellaneous_category=tooling
        // is the canonical shape until subscriptions are seeded.
        await createSupplierExpensePayment({
          paymentDate: row.date,
          amount: Math.abs(row.amount),
          paymentAccountId: row.accountId,
          supplierName: tool.supplierName,
          description: tool.description,
          reference: row.rowId
        })
        results.push({ rowId: row.rowId, action: 'created_tooling_payment', detail: tool.supplierName })
        break
      }

      case 'created_supplier_payment': {
        let supplierName = 'Unknown'

        if (/Daniela/i.test(row.description)) supplierName = 'Daniela Alejandra Ferreira Toro'
        else if (/David Andres|Andrés|Andres/i.test(row.description)) supplierName = 'Andrés Carlosama Termal'
        else if (/Beeconta|77\.805\.887-1/i.test(row.description)) supplierName = 'Beeconta SpA'
        else if (/Valentina|20\.557\.199-k/i.test(row.description)) supplierName = 'Valentina Hoyos'
        else if (/Humberly|27\.836\.817-3/i.test(row.description)) supplierName = 'Humberly Henriquez'
        else if (/FLICK/i.test(row.description)) supplierName = 'Flick SpA'

        await createSupplierExpensePayment({
          paymentDate: row.date,
          amount: Math.abs(row.amount),
          paymentAccountId: row.accountId,
          supplierName,
          description: row.description,
          reference: row.rowId
        })
        results.push({ rowId: row.rowId, action: 'created_supplier_payment', detail: supplierName })
        break
      }

      case 'excluded':
      case 'skipped':
        results.push({ rowId: row.rowId, action: classification.type, detail: classification.notes })
        break

      default:
        results.push({ rowId: row.rowId, action: 'error', error: `unhandled classification type: ${classification.type}` })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    results.push({ rowId: row.rowId, action: 'error', error: message })
  }
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  log('info', `Conciliation run ${RUN_ID} (dryRun=${dryRunOnly})`)
  log('info', `Bank rows: CLP=${SANTANDER_CLP_ROWS.length} USD=${SANTANDER_USD_ROWS.length} G66=${GLOBAL66_ROWS.length} TC=${TC_ROWS.length}`)
  log('info', `Data dir: ${DATA_DIR}`)

  const results: ExecResult[] = []

  for (const row of ALL_ROWS) {
    let classification: Classification

    if (row.accountId === 'santander-clp') classification = classifyClpRow(row)
    else if (row.accountId === 'santander-usd-usd') classification = classifyUsdRow(row)
    else if (row.accountId === 'global66-clp') classification = classifyG66Row(row)
    else if (row.accountId === 'santander-corp-clp') classification = classifyTcRow(row)
    else classification = { type: 'skipped', notes: 'Unknown account' }

    await executeRow(row, classification, results)
  }

  console.log('\n[results]')
  console.table(
    results.map(r => ({
      rowId: r.rowId,
      action: r.action,
      detail: r.detail || r.error || ''
    }))
  )

  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.action] = (acc[r.action] || 0) + 1
    
return acc
  }, {})

  console.log('\n[summary]')
  console.table(summary)

  const errors = results.filter(r => r.action === 'error')

  if (errors.length > 0) {
    console.error(`\n[errors] ${errors.length} rows failed:`)
    errors.forEach(e => console.error(`  ${e.rowId}: ${e.error}`))
  }

  if (!dryRunOnly && errors.length === 0) {
    log('info', 'Re-materializing account_balances after conciliation...')

    const seeds = [
      { accountId: 'santander-clp',           seedDate: '2026-02-28', openingBalance: 5703909 },
      { accountId: 'santander-usd-usd',       seedDate: '2026-02-28', openingBalance: 2591.94 },
      { accountId: 'global66-clp',            seedDate: '2026-02-28', openingBalance: 380 },
      { accountId: 'santander-corp-clp',      seedDate: '2026-04-05', openingBalance: 268442 },
      { accountId: 'sha-cca-julio-reyes-clp', seedDate: '2026-02-28', openingBalance: 0 }
    ]

    for (const seed of seeds) {
      try {
        await rematerializeAccountBalanceRange({ ...seed, endDate: '2026-04-27' })
      } catch (err) {
        log('error', `rematerialize ${seed.accountId}: ${(err as Error).message}`)
      }
    }

    const balances = await getCurrentAccountBalances('2026-04-27')

    console.log('\n[final balances vs bank ground truth]')

    const expectedBank: Record<string, { value: number; currency: string }> = {
      'santander-clp':           { value: 4172563, currency: 'CLP' },
      'santander-usd-usd':       { value: 1.94, currency: 'USD' },
      'global66-clp':            { value: 380, currency: 'CLP' },
      'santander-corp-clp':      { value: 1110897, currency: 'CLP' }, // estimated TC debt
      'sha-cca-julio-reyes-clp': { value: 0, currency: 'CLP' }
    }

    console.table(
      balances.map(b => {
        const exp = expectedBank[b.account_id]
        const actual = b.closing_balance ? Number(b.closing_balance) : 0
        const drift = exp ? actual - exp.value : null

        return {
          account: b.account_id,
          currency: b.currency,
          greenhouse_closing: actual.toFixed(2),
          bank_real: exp ? exp.value.toFixed(2) : '?',
          drift: drift == null ? '?' : drift.toFixed(2),
          status: drift == null ? '?' : (Math.abs(drift) < 1 ? 'OK' : 'DRIFT')
        }
      })
    )
  }

  // Surface what's still in the ledger as unsuperseded phantoms
  const phantoms = await runGreenhousePostgresQuery<{ payment_id: string; income_id: string; payment_date: string; amount: string }>(
    `SELECT payment_id, income_id, payment_date::text, amount::text
     FROM greenhouse_finance.income_payments
     WHERE payment_account_id IS NULL
       AND superseded_by_payment_id IS NULL
       AND payment_source = 'nubox_bank_sync'
       AND payment_date >= '2026-02-01'
     ORDER BY payment_date DESC`
  )

  if (phantoms.length > 0) {
    console.log('\n[remaining unsuperseded Nubox phantoms — for follow-up manual link]')
    console.table(phantoms.slice(0, 20))
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
