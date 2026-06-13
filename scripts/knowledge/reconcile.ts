/**
 * TASK-1094 — Knowledge reconcile CLI (red de seguridad del at-most-once, NO cron).
 *
 * Re-ingiere el corpus Notion declarado (idempotente, recupera webhooks perdidos) +
 * deprecia huérfanos (docs cuya página ya no existe en Notion). dry-run por default.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/reconcile.ts [--apply]
 */

import { reconcileNotionKnowledge } from '@/lib/knowledge/notion/reconcile'

const main = async (): Promise<void> => {
  const apply = process.argv.includes('--apply')

  const report = await reconcileNotionKnowledge({ apply })
  const { counts } = report.ingest

  console.log(`Knowledge reconcile — mode: ${apply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(
    `re-ingest: candidates ${counts.candidates} | published ${counts.published} | unchanged ${counts.skippedUnchanged} | ` +
      `quarantined ${counts.quarantined} | failed ${counts.failed} | chunks ${counts.chunks}`
  )
  console.log(`live pages en Notion: ${report.livePageCount}`)
  console.log(`huérfanos (página ya no existe): ${report.orphans.length}${apply ? ` → deprecados: ${report.deprecated}` : ' (dry-run, no deprecados)'}`)

  for (const orphan of report.orphans) {
    console.log(`  ORPHAN  ${orphan.slug.padEnd(48)} page=${orphan.sourcePageId}`)
  }

  process.exit(counts.failed > 0 ? 1 : 0)
}

main().catch((err: unknown) => {
  console.error('knowledge reconcile failed:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
