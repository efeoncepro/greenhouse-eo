/**
 * TASK-1082 — Knowledge ingestion CLI (corpus piloto repo_docs).
 *
 * Dry-run (default) reporta qué se publicaría/cuarentenaría sin escribir (sí lee
 * para idempotencia honesta). `--apply` registra el source, abre un sync run y
 * publica versiones idempotentes por checksum a `greenhouse_knowledge`.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/ingest.ts [--apply]
 */

import { runKnowledgeIngestion } from '@/lib/knowledge/ingestion/pipeline'
import { RepoDocsKnowledgeConnector } from '@/lib/knowledge/ingestion/repo-docs-connector'

const main = async (): Promise<void> => {
  const apply = process.argv.includes('--apply')

  const report = await runKnowledgeIngestion({
    connector: new RepoDocsKnowledgeConnector(),
    apply
  })

  const { counts } = report

  console.log('Knowledge ingestion — source: repo_docs (pilot corpus)')
  console.log(`mode: ${apply ? 'APPLY' : 'DRY-RUN'} · sourceId: ${report.sourceId ?? '(none — would register)'}`)
  console.log(
    `candidates: ${counts.candidates} | published: ${counts.published} | unchanged: ${counts.skippedUnchanged} | ` +
      `quarantined: ${counts.quarantined} | skipped: ${counts.skippedUnavailable} | failed: ${counts.failed} | chunks: ${counts.chunks}`
  )
  console.log('')

  for (const doc of report.documents) {
    const detail =
      doc.status === 'quarantined'
        ? `findings: ${(doc.findings ?? []).map(f => f.code).join(', ')}`
        : doc.status === 'skipped_unavailable' || doc.status === 'failed'
          ? doc.reason ?? ''
          : `${doc.chunkCount} chunks${doc.versionNumber ? ` · v${doc.versionNumber}` : ''}`

    console.log(`  ${doc.status.toUpperCase().padEnd(20)} ${doc.slug.padEnd(34)} ${detail}`)
  }

  // Explicit exit: the shared PG pool keeps the event loop alive otherwise.
  process.exit(counts.failed > 0 ? 1 : 0)
}

main().catch((err: unknown) => {
  console.error('knowledge ingestion failed:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
