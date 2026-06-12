/**
 * TASK-1082 / TASK-1088 — Knowledge ingestion CLI.
 *
 * Dry-run (default) reporta qué se publicaría/cuarentenaría sin escribir (sí lee
 * para idempotencia honesta). `--apply` registra el source, abre un sync run y
 * publica versiones idempotentes por checksum a `greenhouse_knowledge`.
 *
 * Source (default `repo_docs`):
 *   --source=repo_docs   corpus piloto markdown del repo
 *   --source=notion      teamspace Notion de knowledge (gated en secret)
 *
 * Scope (solo `--source=notion`): `--only=<slugPrefix|slug>` ingiere una sola
 * entrada del corpus (rollout incremental por Wiki/página).
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/ingest.ts [--apply] [--source=notion] [--only=<slug>]
 */

import type { KnowledgeSourceConnector } from '@/lib/knowledge/ingestion/connector'
import { runKnowledgeIngestion } from '@/lib/knowledge/ingestion/pipeline'
import { RepoDocsKnowledgeConnector } from '@/lib/knowledge/ingestion/repo-docs-connector'
import { NotionKnowledgeConnector } from '@/lib/knowledge/notion/notion-connector'
import { NOTION_KNOWLEDGE_CORPUS } from '@/lib/knowledge/notion/notion-corpus'

const resolveSource = (): 'repo_docs' | 'notion' => {
  const flag = process.argv.find(arg => arg.startsWith('--source='))?.split('=')[1]

  if (flag === 'notion') return 'notion'

  if (flag && flag !== 'repo_docs') {
    throw new Error(`--source desconocido: ${flag} (usa repo_docs | notion)`)
  }

  return 'repo_docs'
}

const buildNotionConnector = (): NotionKnowledgeConnector => {
  const only = process.argv.find(arg => arg.startsWith('--only='))?.split('=')[1]

  if (!only) return new NotionKnowledgeConnector()

  const entries = NOTION_KNOWLEDGE_CORPUS.filter(
    entry => (entry.kind === 'data_source' ? entry.slugPrefix : entry.slug) === only
  )

  if (entries.length === 0) {
    throw new Error(`--only=${only} no coincide con ninguna entrada del corpus Notion`)
  }

  return new NotionKnowledgeConnector({ entries })
}

const main = async (): Promise<void> => {
  const apply = process.argv.includes('--apply')
  const source = resolveSource()

  const connector: KnowledgeSourceConnector =
    source === 'notion' ? buildNotionConnector() : new RepoDocsKnowledgeConnector()

  const report = await runKnowledgeIngestion({ connector, apply })

  const { counts } = report

  console.log(`Knowledge ingestion — source: ${source}`)
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
