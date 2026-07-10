/**
 * TASK-356 — Backfill idempotente de HiringHandoffs.
 *
 * Materializa handoffs para toda `hiring_application` con `decision='selected'` que aún no
 * tenga fila en `hiring_handoff` (eventos `hiring.application.decided` emitidos antes de que
 * el consumer reactivo existiera). Lee el snapshot ACTUAL — no re-emite eventos.
 *
 * Dry-run por defecto; aplicar con `--apply`. Batched (--limit, default 200).
 *
 * Uso (requiere el proxy Cloud SQL en 127.0.0.1:15432 o el Connector):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/backfill-handoffs.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/backfill-handoffs.ts --apply
 */
import { materializeHandoffFromApplication } from '@/lib/hiring/handoff'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const APPLY = process.argv.includes('--apply')
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const LIMIT = Math.min(Math.max(Number(limitArg?.split('=')[1] ?? 200) || 200, 1), 1000)

const main = async () => {
  const pending = await runGreenhousePostgresQuery<{ application_id: string; selected_destination: string | null }>(
    `SELECT a.application_id, a.selected_destination
       FROM greenhouse_hiring.hiring_application a
      WHERE a.decision = 'selected'
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_hiring.hiring_handoff h
           WHERE h.hiring_application_id = a.application_id
        )
      ORDER BY a.decision_at ASC NULLS LAST
      LIMIT $1`,
    [LIMIT],
  )

  console.log(`[backfill-handoffs] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} candidates=${pending.length} (limit=${LIMIT})`)

  for (const row of pending) {
    console.log(`  - ${row.application_id} → ${row.selected_destination ?? '(sin destino)'}`)
  }

  if (!APPLY) {
    console.log('[backfill-handoffs] dry-run: nada aplicado. Re-ejecutar con --apply.')

    return
  }

  let ok = 0
  let failed = 0

  for (const row of pending) {
    try {
      const outcome = await materializeHandoffFromApplication(row.application_id)

      ok += 1
      console.log(`  ✓ ${row.application_id}: ${outcome.kind}`)
    } catch (error) {
      failed += 1
      console.error(`  ✗ ${row.application_id}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log(`[backfill-handoffs] applied ok=${ok} failed=${failed}`)

  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error('[backfill-handoffs] fatal:', error)
  process.exit(1)
})
