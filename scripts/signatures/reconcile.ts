import { query } from '@/lib/db'
import { reconcileZapSignSignatureRequest } from '@/lib/integrations/zapsign/apply-state'

/**
 * TASK-491 Slice 3 — ZapSign signature reconciliation CLI (manual recovery / cron safety-net).
 *
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/signatures/reconcile.ts --id=<signatureRequestId>
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/signatures/reconcile.ts --sweep [--older-than-days=2]
 *
 * `--id`   reconcile a single request.
 * `--sweep` reconcile every ZapSign request still out for signature (sent / partially_signed)
 *           whose `sent_at` is older than the threshold (default 2 days) — recovers webhooks that
 *           failed or never arrived.
 */

const args = process.argv.slice(2)

const getArg = (name: string): string | null => {
  const hit = args.find(a => a.startsWith(`--${name}=`))

  return hit ? hit.slice(name.length + 3) : null
}

const hasFlag = (name: string): boolean => args.includes(`--${name}`)

const reconcileOne = async (id: string): Promise<void> => {
  try {
    const request = await reconcileZapSignSignatureRequest(id)

    console.log(`✓ ${id} → status=${request.status} signedAsset=${request.signedDocumentAssetId ?? '—'}`)
  } catch (error) {
    console.error(`✗ ${id} → ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}

const main = async (): Promise<void> => {
  const id = getArg('id')

  if (id) {
    await reconcileOne(id.trim())

    return
  }

  if (hasFlag('sweep')) {
    const olderThanDays = Number(getArg('older-than-days') ?? '2')

    const rows = await query<{ signature_request_id: string }>(
      `SELECT signature_request_id
       FROM greenhouse_core.signature_requests
       WHERE provider = 'zapsign'
         AND status IN ('sent', 'partially_signed')
         AND sent_at IS NOT NULL
         AND sent_at < NOW() - ($1::int * INTERVAL '1 day')
       ORDER BY sent_at ASC`,
      [Math.max(0, Math.trunc(olderThanDays))]
    )

    console.log(`Reconciling ${rows.length} ZapSign request(s) out for signature > ${olderThanDays}d…`)

    for (const row of rows) {
      await reconcileOne(row.signature_request_id)
    }

    return
  }

  console.error('Usage: reconcile.ts --id=<signatureRequestId> | --sweep [--older-than-days=2]')
  process.exitCode = 1
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
