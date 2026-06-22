import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1222 Slice A — Backfill idempotente del status drift en
 * greenhouse_commercial.quotations para quotes source=hubspot.
 *
 * Causa: el CASE de syncCanonicalFinanceQuote colapsaba los status canónicos
 * que escribe el inbound HubSpot (issued/pending_approval/...) a 'draft'.
 * Fix aplicado en el CASE; este backfill re-sincroniza las filas afectadas
 * (ON CONFLICT ... status = EXCLUDED.status) para alinear el status almacenado.
 *
 * Idempotente: re-correr es safe. Default DRY-RUN; requiere --apply para escribir.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/finance/backfill-quotation-status-from-finance.ts [--apply]
 */

const APPLY = process.argv.includes('--apply')

const main = async () => {
  // Filas con drift: status='draft' en commercial pero el finance.quotes.status real es avanzado.
  const drifted = await runGreenhousePostgresQuery<{ quote_id: string; finance_status: string; commercial_status: string }>(
    `SELECT q.finance_quote_id AS quote_id,
            fq.status AS finance_status,
            q.status  AS commercial_status
     FROM greenhouse_commercial.quotations q
     JOIN greenhouse_finance.quotes fq ON fq.quote_id = q.finance_quote_id
     WHERE q.source_system = 'hubspot'
       AND q.status = 'draft'
       AND fq.status IN ('issued', 'pending_approval', 'approval_rejected', 'expired', 'converted')`
  )

  console.log(`[backfill] filas con drift (commercial draft vs finance avanzado): ${drifted.length}`)
  drifted.forEach(r => console.log(`  ${r.quote_id}: finance=${r.finance_status} commercial=${r.commercial_status}`))

  if (!APPLY) {
    console.log('\n[backfill] DRY-RUN (sin escribir). Re-correr con --apply para alinear.')

    return
  }

  // Backfill minimal-blast: UPDATE directo status = legacy_status. `legacy_status` ya
  // contiene el valor canónico real (= finance.quotes.status = output del CASE arreglado),
  // así que esto es exactamente lo que produciría un re-sync — pero SIN re-sincronizar
  // productos/line-items (evita acoplarse a issues de data-quality ajenos como el CHECK
  // product_catalog_hubspot_trace_consistent). Idempotente.
  const updated = await runGreenhousePostgresQuery<{ finance_quote_id: string }>(
    `UPDATE greenhouse_commercial.quotations q
     SET status = q.legacy_status,
         updated_at = CURRENT_TIMESTAMP
     FROM greenhouse_finance.quotes fq
     WHERE fq.quote_id = q.finance_quote_id
       AND q.source_system = 'hubspot'
       AND q.status = 'draft'
       AND fq.status IN ('issued', 'pending_approval', 'approval_rejected', 'expired', 'converted')
       AND q.legacy_status IN ('issued', 'pending_approval', 'approval_rejected', 'expired', 'converted')
     RETURNING q.finance_quote_id`
  )

  console.log(`\n[backfill] filas alineadas (status = legacy_status): ${updated.length}`)

  // Verificación post-apply
  const residual = await runGreenhousePostgresQuery<{ c: string }>(
    `SELECT COUNT(*)::text c
     FROM greenhouse_commercial.quotations q
     JOIN greenhouse_finance.quotes fq ON fq.quote_id = q.finance_quote_id
     WHERE q.source_system = 'hubspot'
       AND q.status = 'draft'
       AND fq.status IN ('issued', 'pending_approval', 'approval_rejected', 'expired', 'converted')`
  )

  console.log(`[backfill] drift residual post-apply: ${residual[0].c} (esperado 0)`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[backfill] FATAL:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
