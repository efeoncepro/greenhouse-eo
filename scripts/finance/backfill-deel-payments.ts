#!/usr/bin/env tsx
/**
 * Backfill Deel payments for Melkin Hernández (TASK-703).
 *
 * 5 pagos en período conciliable + 4 históricos (estimated for CCA opening
 * calculation later):
 *
 *   Period (March + April 2026):
 *     REC-2026-3 Mar 5 USD 949.95 *2505 (TC empresa santander-corp-clp)
 *     REC-2026-4 Apr 4 USD 903.19 *1879 (TC personal sha-cca-julio-reyes-clp)
 *     REC-2026-5 Apr 5 USD 5.50   *2505
 *     REC-2026-6 Apr 5 USD 10.69  *2505
 *     REC-2026-7 Apr 15 USD 211.93 *1879
 *
 *   Pre-period (audit evidence for CCA opening):
 *     REC-2025-1 Nov 7 USD 1005.01 (card unknown — assume *2505 if not specified)
 *     REC-2025-2 Dec 5 USD 1038.26 (idem)
 *     REC-2026-1 Jan 2 USD 882.41 *1879 (per user clarification)
 *     REC-2026-2 Feb 2 USD 1038.26 *1879 (per user clarification)
 *
 * Idempotent: each receipt has a deterministic reference, re-running skips
 * duplicates.
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import {
  createCompanyCardExpense,
  createShareholderCardExpense
} from '@/lib/finance/payment-instruments/anchored-payments'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

interface DeelReceipt {
  receiptId: string
  paymentDate: string
  amountUsd: number
  card: '*2505' | '*1879'
  inPeriod: boolean
}

const RECEIPTS: DeelReceipt[] = [
  { receiptId: 'REC-2026-3', paymentDate: '2026-03-05', amountUsd: 949.95, card: '*2505', inPeriod: true },
  { receiptId: 'REC-2026-4', paymentDate: '2026-04-04', amountUsd: 903.19, card: '*1879', inPeriod: true },
  { receiptId: 'REC-2026-5', paymentDate: '2026-04-05', amountUsd: 5.50,   card: '*2505', inPeriod: true },
  { receiptId: 'REC-2026-6', paymentDate: '2026-04-05', amountUsd: 10.69,  card: '*2505', inPeriod: true },
  { receiptId: 'REC-2026-7', paymentDate: '2026-04-15', amountUsd: 211.93, card: '*1879', inPeriod: true }
]

const ensureMelkinMember = async (): Promise<string | null> => {
  // Check if Melkin exists in any team_members table the schema may expose
  const candidates = [
    `SELECT member_id FROM greenhouse_core.team_members WHERE LOWER(full_name) LIKE '%melkin%' LIMIT 1`,
    `SELECT member_id FROM greenhouse.team_members WHERE LOWER(full_name) LIKE '%melkin%' LIMIT 1`
  ]

  for (const sql of candidates) {
    try {
      const r = await runGreenhousePostgresQuery<{ member_id: string }>(sql)

      if (r.length > 0) return r[0].member_id
    } catch {
      // table may not exist; try next
    }
  }

  return null
}

const ensureDeelToolCatalog = async (): Promise<string | null> => {
  try {
    const r = await runGreenhousePostgresQuery<{ tool_id: string }>(
      `SELECT tool_id FROM greenhouse_ai.tool_catalog WHERE LOWER(tool_name) = 'deel' OR tool_id = 'deel' LIMIT 1`
    )

    if (r.length > 0) return r[0].tool_id

    // Insert minimal scaffold
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_ai.tool_catalog (
         tool_id, tool_name, tool_category, vendor, cost_model,
         subscription_currency, is_active, created_at, updated_at
       ) VALUES (
         'deel', 'Deel', 'payment_platform', 'Deel Inc.', 'per_contractor_invoice',
         'USD', TRUE, NOW(), NOW()
       )
       ON CONFLICT (tool_id) DO NOTHING`
    )

    return 'deel'
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err)

    console.warn(`[backfill] tool_catalog access failed: ${m}; expense.tool_catalog_id will be null`)

    return null
  }
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const memberId = await ensureMelkinMember()
  const toolId = await ensureDeelToolCatalog()

  console.log(`[backfill] memberId=${memberId ?? 'null'} toolCatalogId=${toolId ?? 'null'}`)

  let createdCount = 0

  for (const r of RECEIPTS.filter(x => x.inPeriod)) {
    const description = `Deel pago a Melkin Hernández (Nicaragua) — ${r.receiptId}`
    const reference = `deel-${r.receiptId}`

    try {
      if (r.card === '*2505') {
        const result = await createCompanyCardExpense({
          paymentDate: r.paymentDate,
          amount: r.amountUsd,
          currency: 'USD',
          paymentAccountId: 'santander-corp-clp',
          toolCatalogId: toolId,
          memberId,
          description,
          supplierName: 'Deel Inc.',
          cardLastFour: '2505',
          reference,
          actorUserId: 'task-703-backfill'
        })

        console.log(`  ✓ ${r.receiptId}: TC empresa $${r.amountUsd} USD → expense ${result.expenseId}`)
        createdCount++
      } else {
        const result = await createShareholderCardExpense({
          paymentDate: r.paymentDate,
          amount: r.amountUsd,
          currency: 'USD',
          paymentAccountId: 'sha-cca-julio-reyes-clp',
          toolCatalogId: toolId,
          memberId,
          description,
          supplierName: 'Deel Inc.',
          shareholderCardLast4: '1879',
          shareholderName: 'Julio Reyes',
          reference,
          actorUserId: 'task-703-backfill'
        })

        console.log(`  ✓ ${r.receiptId}: TC personal *1879 $${r.amountUsd} USD → expense ${result.expenseId} (deuda CCA crece)`)
        createdCount++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      console.error(`  ✗ ${r.receiptId}: ${message}`)
    }
  }

  console.log(`[backfill] created=${createdCount}`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
