/**
 * TASK-1082 — Knowledge ingestion CLI.
 *
 * Dry-run (default) reporta candidatos del corpus piloto, disponibilidad y
 * (Slice 2-3) conteos de versiones/chunks/quarantine. `--apply` escribe a
 * `greenhouse_knowledge` (Slice 3).
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/ingest.ts [--apply]
 */

import { RepoDocsKnowledgeConnector } from '@/lib/knowledge/ingestion/repo-docs-connector'

const main = async (): Promise<void> => {
  const apply = process.argv.includes('--apply')
  const connector = new RepoDocsKnowledgeConnector()

  const items = await connector.list()
  const available = items.filter(item => item.kind === 'available')
  const unavailable = items.filter(item => item.kind === 'unavailable')

  console.log('Knowledge ingestion — source: repo_docs (pilot corpus)')
  console.log(`mode: ${apply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(
    `candidates: ${items.length} | available: ${available.length} | skipped (to-author/missing): ${unavailable.length}`
  )
  console.log('')

  for (const item of unavailable) {
    console.log(`  SKIP  ${item.candidate.slug.padEnd(34)} — ${item.reason}`)
  }

  for (const item of available) {
    console.log(
      `  OK    ${item.candidate.slug.padEnd(34)} — ${item.candidate.documentType} · ${item.candidate.agenticPolicy}`
    )
  }

  if (apply) {
    console.error('\napply: no implementado hasta TASK-1082 Slice 3.')
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error('knowledge ingestion failed:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
