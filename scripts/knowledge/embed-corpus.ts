/**
 * TASK-1151 Slice 2 — CLI del paso de ingesta de embeddings (idempotente por checksum).
 *
 * Embebe los chunks de la versión vigente del corpus y persiste el vector en
 * `knowledge_chunks.embedding` (Vertex `text-multilingual-embedding-002`). Dry-run por
 * defecto; `--apply` escribe. Re-correr solo re-embebe lo que cambió.
 *
 * Uso:
 *   set -a && source .env.local && set +a   # PG + ADC (Vertex)
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/embed-corpus.ts          # dry-run
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/embed-corpus.ts --apply  # escribe
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/embed-corpus.ts --apply --refresh
 */

import { embedKnowledgeCorpus } from '@/lib/knowledge/search/embed-corpus'

const main = async () => {
  const apply = process.argv.includes('--apply')
  const refresh = process.argv.includes('--refresh')

  const result = await embedKnowledgeCorpus({ apply, refresh })

  console.log(`# TASK-1151 — embed-corpus (${result.apply ? 'APPLY' : 'dry-run'}) · model ${result.model}`)
  console.log(`  chunks vigentes escaneados: ${result.scanned}`)
  console.log(`  ${result.apply ? 'embebidos' : 'a embeber'}: ${result.embedded}`)
  console.log(`  ya al día (skip): ${result.skippedUpToDate}`)
  console.log(`  batches: ${result.batches} · tokens estimados: ~${result.tokensEstimated}`)

  if (!result.apply) {
    console.log('\n  (dry-run — nada escrito; usá --apply para persistir)')
  }

  process.exit(0)
}

main().catch(err => {
  console.error('embed-corpus FAIL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
