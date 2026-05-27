#!/usr/bin/env tsx
/**
 * TASK-936 — Dedup retroactivo del doble conteo en P&L (gastos de banco mar/abr 2026).
 *
 * Contexto: el seed one-time `conciliate-march-april-2026.ts` (TASK-702) modeló
 * varios pagos de nómina como gastos `supplier_payment` standalone (EXP-RECON-*)
 * porque los payroll_entries no estaban linkeados al correr el backfill. Resultado:
 * el costo de cada colaborador quedó contado DOS veces en P&L (la nómina devengada
 * EXP-202xxx en su mes + el gasto del giro EXP-RECON en el mes del pago).
 *
 * Fix (mínimo, seguro, reversible): ANULAR el gasto-banco duplicado
 * (`is_annulled = TRUE`) — el P&L deja de contarlo (todos los consumers filtran
 * `COALESCE(is_annulled, FALSE) = FALSE`). La nómina canónica (payroll_entry_id)
 * queda como el único costo. Además se supersedea el expense_payment del duplicado
 * (`dismissExpensePhantom`) por higiene.
 *
 * Por qué NO mueve el saldo bancario: los 3 giros global66 son PRE-ANCHOR (todos
 * < 2026-04-05, genesis del OTB de global66) → su egreso ya está absorbido en el
 * opening balance. Anular el gasto solo afecta el P&L, no el saldo. (Verificado:
 * 0 settlement_legs vivos para estos pagos.)
 *
 * Excluye Valentina/marzo: su giro es POST-anchor en santander-clp (OTB Feb 28) Y
 * el período santander-clp 2026-03 está `reconciled` (cerrado) → requiere manejo
 * aparte (re-home del pago + autorización de restatement). Usar --include-closed
 * solo con esa decisión tomada.
 *
 * NO toca los 2 casos ambiguos (Humberly mar 300k, Andrés "feb" 632k): no tienen
 * nómina que dupliquen (su 1ª nómina es posterior) → no son duplicados.
 *
 * Idempotente: si el gasto ya está anulado o el pago ya superseded, el caso se skipea.
 *
 * Seguridad: dry-run por default (NO escribe). `--apply` para ejecutar.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/finance/fix-reconciliation-double-count-mar-apr-2026.ts [--apply] [--include-closed]
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { dismissExpensePhantom } from '@/lib/finance/payment-instruments/dismiss-phantom'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

interface DedupMapping {
  label: string
  bankExpenseId: string
  bankPaymentId: string
  bankAccount: string
  bankClp: number
  payrollExpenseId: string
  closed: boolean
}

// Mapeos confirmados (TASK-936 FASE 4, verificados contra payroll + bank rows + OTB 2026-05-25).
const MAPPINGS: DedupMapping[] = [
  {
    label: 'Daniela España — duplicado de nómina Feb (giro Mar 6)',
    bankExpenseId: 'EXP-RECON-20260306-fscy',
    bankPaymentId: 'exp-pay-155c2b06-933d-4f94-b028-dd8fa6159c08',
    bankAccount: 'global66-clp',
    bankClp: 1034522,
    payrollExpenseId: 'EXP-202602-001',
    closed: false
  },
  {
    label: 'Daniela España — duplicado de nómina Mar (giro Abr 4)',
    bankExpenseId: 'EXP-RECON-20260404-dit1',
    bankPaymentId: 'exp-pay-3b6bc360-13bf-497a-8575-b0f4822434a0',
    bankAccount: 'global66-clp',
    bankClp: 1090731,
    payrollExpenseId: 'EXP-202603-003',
    closed: false
  },
  {
    label: 'Andrés Colombia — duplicado de nómina Mar (giro Abr 4)',
    bankExpenseId: 'EXP-RECON-20260404-4wx6',
    bankPaymentId: 'exp-pay-e16050ef-cf70-4087-a326-74c1bc99363a',
    bankAccount: 'global66-clp',
    bankClp: 688058,
    payrollExpenseId: 'EXP-202603-002',
    closed: false
  },
  {
    label: 'Valentina — duplicado de nómina Mar (giro Mar 6, POST-ANCHOR + PERÍODO CERRADO)',
    bankExpenseId: 'EXP-RECON-20260306-baj9',
    bankPaymentId: 'exp-pay-67ee0da0-ecc7-482f-99b8-113584a941e4',
    bankAccount: 'santander-clp',
    bankClp: 595656,
    payrollExpenseId: 'EXP-202603-005',
    closed: true
  }
]

const ACTOR = 'script:TASK-936-dedup'

const isAnnulled = async (expenseId: string): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery(
    `SELECT COALESCE(is_annulled, FALSE) AS annulled FROM greenhouse_finance.expenses WHERE expense_id = $1`,
    [expenseId]
  )

  const r = (rows as Array<{ annulled: unknown }>)[0]

  return Boolean(r?.annulled)
}

const isDismissed = async (bankPaymentId: string): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery(
    `SELECT superseded_at FROM greenhouse_finance.expense_payments WHERE payment_id = $1`,
    [bankPaymentId]
  )

  const r = (rows as Array<{ superseded_at: unknown }>)[0]

  return Boolean(r?.superseded_at)
}

const main = async () => {
  await loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const apply = process.argv.includes('--apply')
  const includeClosed = process.argv.includes('--include-closed')

  const selected = MAPPINGS.filter(m => includeClosed || !m.closed)
  const skippedClosed = MAPPINGS.filter(m => m.closed && !includeClosed)

  console.log(`\n=== TASK-936 dedup doble conteo (P&L) — ${apply ? 'APPLY' : 'DRY-RUN'} ===`)

  if (skippedClosed.length > 0) {
    console.log(`Excluidos (post-anchor + período cerrado, usar --include-closed solo con decisión tomada):`)
    skippedClosed.forEach(m => console.log(`    · ${m.label}`))
    console.log('')
  }

  let annulledCount = 0

  for (const m of selected) {
    console.log(`— ${m.label}`)
    console.log(`    anular gasto-banco ${m.bankExpenseId} (${m.bankClp.toLocaleString('es-CL')} CLP, ${m.bankAccount})`)
    console.log(`    nómina canónica que queda: ${m.payrollExpenseId}`)

    if (!apply) {
      continue
    }

    if (await isAnnulled(m.bankExpenseId)) {
      console.log('    [skip] gasto ya anulado (idempotente)')
    } else {
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_finance.expenses
            SET is_annulled = TRUE,
                updated_at = now(),
                notes = TRIM(BOTH ' ' FROM COALESCE(notes, '') || ' [TASK-936 anulado ${new Date().toISOString().slice(0, 10)}: duplicado de nómina ${m.payrollExpenseId} — el costo ya está devengado en la nómina]')
          WHERE expense_id = $1 AND COALESCE(is_annulled, FALSE) = FALSE`,
        [m.bankExpenseId]
      )
      annulledCount += 1
      console.log('    [ok] gasto-banco anulado (fuera de P&L)')
    }

    if (await isDismissed(m.bankPaymentId)) {
      console.log('    [skip] pago ya superseded (idempotente)')
    } else {
      await dismissExpensePhantom({
        phantomPaymentId: m.bankPaymentId,
        reason: `TASK-936 duplicado de nómina ${m.payrollExpenseId} — gasto anulado`,
        actorUserId: ACTOR
      })
      console.log('    [ok] pago superseded')
    }
  }

  if (apply) {
    console.log(`\n=== APPLY completado · ${annulledCount} gasto(s) anulado(s) ===`)
    console.log('Nota: las nóminas canónicas quedan como único costo. El saldo bancario no cambia')
    console.log('(giros pre-anchor, absorbidos en el OTB). Verificar P&L del mes: costo por persona × 1.')
  } else {
    console.log('\n=== DRY-RUN (sin escrituras). Usar --apply para ejecutar ===')
  }

  console.log('')
}

main().catch(err => {
  console.error('FAIL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
