/**
 * TASK-1136 Slice 2 — Shadow hybrid retrieval prototype (offline, NO runtime).
 *
 * Compara tres arms sobre el mismo corpus y golden set:
 *   1. fts          — `searchKnowledge` FTS puro (rerank OFF)
 *   2. fts+rerank   — `searchKnowledge` con rerank (TASK-1124)
 *   3. hybrid       — RRF(FTS, vector) usando embeddings Vertex (text-multilingual-embedding-002)
 *
 * Embeddings: Vertex AI (mismo stack/IAM/region/project que Nexa hoy → mismo privacy
 * posture; el corpus es `internal`, no sale a un proveedor nuevo). Se cachean en un
 * artifact EFÍMERO gitignored (`scripts/knowledge/.cache/`), NO en runtime ni en PG.
 *
 * Además de los golden, corre dos probes que el golden set NO cubre y que son donde un
 * substrato vector EARNS its keep — o falla:
 *   - PARAPHRASE: preguntas SIN el vocabulario léxico del corpus (mismatch) → mide si
 *     el vector recupera lo que el FTS pierde por léxico (lexical-miss recovery).
 *   - NO-ANSWER RISK: preguntas off-corpus → mide si el vector ROMPE el no-answer honesto
 *     (cosine siempre devuelve vecinos) y a qué piso de cosine se mantiene honesto.
 *
 * NO cambia el SSOT ni el contrato. Resultado → `decision packet` (Slice 3).
 *
 * Uso:
 *   set -a && source .env.local && set +a   # PG + ADC (Vertex)
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/hybrid-shadow-eval.ts [--refresh-cache]
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { getGoogleGenAIClient } from '@/lib/ai/google-genai'
import { KNOWLEDGE_GOLDEN_QUESTIONS } from '@/lib/knowledge/search/golden-questions'
import { listKnowledgeChunksForEmbedding, type KnowledgeCorpusChunk } from '@/lib/knowledge/search/list-chunks-for-embedding'
import {
  aggregateArmMetrics,
  cosineSimilarity,
  evaluateGoldenQuestion,
  rrfFuse
} from '@/lib/knowledge/search/retrieval-eval'
import { searchKnowledge } from '@/lib/knowledge/search/search-knowledge'
import type { KnowledgeSearchMode, KnowledgeSearchSubject } from '@/lib/knowledge/search/types'

const EMBED_MODEL = 'text-multilingual-embedding-002'
const EMBED_DIMS = 768
const BATCH = 50
const FTS_CANDIDATES = 20
const VECTOR_CANDIDATES = 20
const FUSED_LIMIT = 8 // producción usa 8
const COSINE_FLOOR = 0.55 // piso del brazo vector — sin esto el vector rompe el no-answer honesto

const CACHE_DIR = resolve(process.cwd(), 'scripts/knowledge/.cache')
const CACHE_FILE = resolve(CACHE_DIR, `embeddings-${EMBED_MODEL}.json`)
const OUT_DIR = resolve(process.cwd(), '.captures/knowledge-eval')

const SUBJECT: KnowledgeSearchSubject = {
  userId: 'user-agent-e2e-001',
  tenantType: 'efeonce_internal',
  tenantId: null,
  roleCodes: ['efeonce_admin', 'collaborator'],
  routeGroups: ['internal'],
  capabilities: ['knowledge.document.read', 'knowledge.agentic.retrieve']
}

// ── Probes que el golden set no cubre ────────────────────────────────────────
interface ParaphraseProbe {
  id: string
  query: string
  mode: KnowledgeSearchMode
  expectAnyTitleIncludes: string
}

// Preguntas reformuladas SIN el término léxico del título/cuerpo del doc correcto.
const PARAPHRASE_PROBES: ParaphraseProbe[] = [
  { id: 'p-rpa-synonym', query: '¿qué quiere decir cuando un entregable vuelve con cambios del cliente varias veces?', mode: 'agentic', expectAnyTitleIncludes: 'ICO' },
  { id: 'p-finiquito-layman', query: '¿cómo le pago lo que le corresponde a alguien que deja de trabajar con nosotros?', mode: 'agentic', expectAnyTitleIncludes: 'Finiquitos' },
  { id: 'p-conciliacion-layman', query: '¿cómo cuadro lo que dice el banco con lo que tengo registrado?', mode: 'agentic', expectAnyTitleIncludes: 'onciliación' },
  { id: 'p-scim-layman', query: '¿cómo se crean solos los usuarios cuando alguien entra a la empresa?', mode: 'agentic', expectAnyTitleIncludes: 'SCIM' },
  { id: 'p-portal-layman', query: '¿qué alcanza a mirar la gente de la marca cuando entra a su panel?', mode: 'agentic', expectAnyTitleIncludes: 'Portal Cliente' },
  { id: 'p-honorarios-layman', query: '¿por qué a un freelance no le descuentan jubilación ni salud?', mode: 'agentic', expectAnyTitleIncludes: 'Payroll' },
  { id: 'p-account360-layman', query: '¿dónde veo todo junto de una cuenta de cliente?', mode: 'agentic', expectAnyTitleIncludes: 'Account 360' },
  { id: 'p-integration-layman', query: '¿cómo me doy cuenta si una conexión externa dejó de andar?', mode: 'agentic', expectAnyTitleIncludes: 'Integraciones' }
]

const OFF_CORPUS_PROBES: { id: string; query: string }[] = [
  { id: 'o-saturno', query: 'cuántos anillos tiene el planeta Saturno' },
  { id: 'o-receta', query: 'receta para preparar un ceviche peruano tradicional' },
  { id: 'o-futbol', query: 'quién ganó el mundial de fútbol en 1986' },
  { id: 'o-clima', query: 'cuál es la temperatura promedio en la Antártida en invierno' }
]

// ── Embeddings (Vertex) ──────────────────────────────────────────────────────
const chunkEmbedText = (c: KnowledgeCorpusChunk): string =>
  (c.headingPath.length > 0 ? `${c.title} > ${c.headingPath.join(' > ')}\n` : `${c.title}\n`) + c.bodyText

const contentHash = (text: string): string => createHash('sha256').update(text).digest('hex').slice(0, 16)

interface EmbeddingCache {
  model: string
  dims: number
  byChunk: Record<string, { hash: string; values: number[] }>
}

const loadCache = (): EmbeddingCache => {
  if (existsSync(CACHE_FILE)) {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as EmbeddingCache
  }

  return { model: EMBED_MODEL, dims: EMBED_DIMS, byChunk: {} }
}

const saveCache = (cache: EmbeddingCache) => {
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(CACHE_FILE, JSON.stringify(cache))
}

type GenAIClient = Awaited<ReturnType<typeof getGoogleGenAIClient>>

const embedBatch = async (
  client: GenAIClient,
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'
): Promise<number[][]> => {
  const response = await client.models.embedContent({
    model: EMBED_MODEL,
    contents: texts,
    config: { taskType, outputDimensionality: EMBED_DIMS }
  })

  const embeddings = response.embeddings ?? []

  return embeddings.map(e => e.values ?? [])
}

const embedQuery = async (client: GenAIClient, query: string): Promise<number[]> => {
  const [vec] = await embedBatch(client, [query], 'RETRIEVAL_QUERY')

  return vec ?? []
}

// ── Índice de corpus por modo ────────────────────────────────────────────────
interface CorpusIndex {
  chunks: KnowledgeCorpusChunk[]
  vectors: Map<string, number[]>
}

const buildIndexes = async (
  client: GenAIClient,
  cache: EmbeddingCache,
  refresh: boolean
): Promise<{ human: CorpusIndex; agentic: CorpusIndex; embeddedNow: number; tokensEstimated: number }> => {
  const human = await listKnowledgeChunksForEmbedding({ mode: 'human', tenantType: 'efeonce_internal' })
  const agentic = await listKnowledgeChunksForEmbedding({ mode: 'agentic', tenantType: 'efeonce_internal' })

  // Unión por chunkId — el embedding del chunk no depende del envelope.
  const union = new Map<string, KnowledgeCorpusChunk>()

  for (const c of [...human, ...agentic]) union.set(c.chunkId, c)

  const toEmbed: KnowledgeCorpusChunk[] = []

  for (const c of union.values()) {
    const text = chunkEmbedText(c)
    const hash = contentHash(text)
    const cached = cache.byChunk[c.chunkId]

    if (refresh || !cached || cached.hash !== hash) {
      toEmbed.push(c)
    }
  }

  let tokensEstimated = 0

  for (let i = 0; i < toEmbed.length; i += BATCH) {
    const slice = toEmbed.slice(i, i + BATCH)
    const texts = slice.map(chunkEmbedText)

    tokensEstimated += texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0)
    const vectors = await embedBatch(client, texts, 'RETRIEVAL_DOCUMENT')

    slice.forEach((c, idx) => {
      cache.byChunk[c.chunkId] = { hash: contentHash(chunkEmbedText(c)), values: vectors[idx] }
    })
    process.stderr.write(`  embedded ${Math.min(i + BATCH, toEmbed.length)}/${toEmbed.length}\r`)
  }

  if (toEmbed.length > 0) {
    saveCache(cache)
    process.stderr.write('\n')
  }

  const toIndex = (chunks: KnowledgeCorpusChunk[]): CorpusIndex => {
    const vectors = new Map<string, number[]>()

    for (const c of chunks) {
      const v = cache.byChunk[c.chunkId]?.values

      if (v && v.length > 0) vectors.set(c.chunkId, v)
    }

    return { chunks, vectors }
  }

  return { human: toIndex(human), agentic: toIndex(agentic), embeddedNow: toEmbed.length, tokensEstimated }
}

// ── Vector ranking sobre un índice ───────────────────────────────────────────
interface VectorHit {
  chunkId: string
  cosine: number
}

const vectorRank = (index: CorpusIndex, queryVec: number[], floor: number, limit: number): VectorHit[] => {
  const hits: VectorHit[] = []

  for (const [chunkId, vec] of index.vectors) {
    const cosine = cosineSimilarity(queryVec, vec)

    if (cosine >= floor) hits.push({ chunkId, cosine })
  }

  hits.sort((a, b) => b.cosine - a.cosine)

  return hits.slice(0, limit)
}

const main = async () => {
  const refresh = process.argv.includes('--refresh-cache')
  const client = await getGoogleGenAIClient()
  const cache = loadCache()

  process.stderr.write('Construyendo índices de embeddings…\n')
  const { human, agentic, embeddedNow, tokensEstimated } = await buildIndexes(client, cache, refresh)
  const indexFor = (mode: KnowledgeSearchMode) => (mode === 'agentic' ? agentic : human)
  const metaFor = (mode: KnowledgeSearchMode) => new Map(indexFor(mode).chunks.map(c => [c.chunkId, c]))

  // ── Golden: fts / fts+rerank / hybrid ──────────────────────────────────────
  const ftsEvals = []
  const rerankEvals = []
  const hybridEvals = []

  for (const question of KNOWLEDGE_GOLDEN_QUESTIONS) {
    const meta = metaFor(question.mode)

    // FTS (rerank off) — pool amplio para fusión
    process.env.KNOWLEDGE_SEARCH_RERANK_ENABLED = 'false'
    const ftsPacket = await searchKnowledge({ query: question.query, subject: SUBJECT, mode: question.mode, limit: FTS_CANDIDATES })

    // FTS+rerank (top-8 producción)
    process.env.KNOWLEDGE_SEARCH_RERANK_ENABLED = 'true'
    const rerankPacket = await searchKnowledge({ query: question.query, subject: SUBJECT, mode: question.mode, limit: FUSED_LIMIT })

    // Vector
    const qVec = await embedQuery(client, question.query)
    const vHits = vectorRank(indexFor(question.mode), qVec, COSINE_FLOOR, VECTOR_CANDIDATES)

    // Hybrid = RRF(FTS ids, vector ids) → top-8
    const ftsIds = ftsPacket.chunks.map(c => c.chunkId)
    const vecIds = vHits.map(h => h.chunkId)
    const fusedIds = rrfFuse([ftsIds, vecIds]).slice(0, FUSED_LIMIT)
    const fusedChunks = fusedIds.map(id => meta.get(id)).filter((c): c is KnowledgeCorpusChunk => Boolean(c))

    ftsEvals.push(
      evaluateGoldenQuestion(question, {
        orderedTitles: ftsPacket.chunks.slice(0, FUSED_LIMIT).map(c => c.title),
        orderedDocIds: ftsPacket.chunks.slice(0, FUSED_LIMIT).map(c => c.documentId),
        confidence: ftsPacket.confidence,
        deniedOrFilteredCount: ftsPacket.deniedOrFilteredCount
      })
    )
    rerankEvals.push(
      evaluateGoldenQuestion(question, {
        orderedTitles: rerankPacket.chunks.map(c => c.title),
        orderedDocIds: rerankPacket.chunks.map(c => c.documentId),
        confidence: rerankPacket.confidence,
        deniedOrFilteredCount: rerankPacket.deniedOrFilteredCount
      })
    )
    // Hybrid: el orden/títulos vienen de la fusión; confidence/denied del FTS packet
    // (el piso de cosine gobierna el no-answer por separado — ver probe).
    hybridEvals.push(
      evaluateGoldenQuestion(question, {
        orderedTitles: fusedChunks.map(c => c.title),
        orderedDocIds: fusedChunks.map(c => c.documentId),
        confidence: fusedChunks.length === 0 ? 'none' : ftsPacket.confidence,
        deniedOrFilteredCount: ftsPacket.deniedOrFilteredCount
      })
    )
  }

  const ftsM = aggregateArmMetrics(ftsEvals, KNOWLEDGE_GOLDEN_QUESTIONS)
  const rerankM = aggregateArmMetrics(rerankEvals, KNOWLEDGE_GOLDEN_QUESTIONS)
  const hybridM = aggregateArmMetrics(hybridEvals, KNOWLEDGE_GOLDEN_QUESTIONS)

  // ── Probe 1: paraphrase (lexical-miss recovery) ─────────────────────────────
  let ftsParaHit = 0
  let hybridParaHit = 0
  const paraDetail: string[] = []

  for (const probe of PARAPHRASE_PROBES) {
    const meta = metaFor(probe.mode)

    process.env.KNOWLEDGE_SEARCH_RERANK_ENABLED = 'true'
    const ftsPacket = await searchKnowledge({ query: probe.query, subject: SUBJECT, mode: probe.mode, limit: FUSED_LIMIT })
    const ftsHit = ftsPacket.chunks.some(c => c.title.toLowerCase().includes(probe.expectAnyTitleIncludes.toLowerCase()))

    const qVec = await embedQuery(client, probe.query)
    const vHits = vectorRank(indexFor(probe.mode), qVec, COSINE_FLOOR, VECTOR_CANDIDATES)
    const ftsIds = (await searchKnowledge({ query: probe.query, subject: SUBJECT, mode: probe.mode, limit: FTS_CANDIDATES })).chunks.map(c => c.chunkId)
    const fusedIds = rrfFuse([ftsIds, vHits.map(h => h.chunkId)]).slice(0, FUSED_LIMIT)
    const hybridHit = fusedIds.map(id => meta.get(id)).some(c => c?.title.toLowerCase().includes(probe.expectAnyTitleIncludes.toLowerCase()))

    if (ftsHit) ftsParaHit += 1
    if (hybridHit) hybridParaHit += 1
    paraDetail.push(`  ${probe.id}: fts=${ftsHit ? '✓' : '✗'} hybrid=${hybridHit ? '✓' : '✗'} (esperaba ~"${probe.expectAnyTitleIncludes}")`)
  }

  // ── Probe 2: no-answer risk (vector floor) ──────────────────────────────────
  const noAnswerDetail: string[] = []
  let breachAtZero = 0
  let breachAtFloor = 0

  for (const probe of OFF_CORPUS_PROBES) {
    const qVec = await embedQuery(client, probe.query)
    const all = vectorRank(agentic, qVec, 0, 1) // sin piso → vecino más cercano
    const maxCos = all[0]?.cosine ?? 0

    if (maxCos > 0) breachAtZero += 1
    if (maxCos >= COSINE_FLOOR) breachAtFloor += 1
    noAnswerDetail.push(`  ${probe.id}: maxCosine=${maxCos.toFixed(3)} → ${maxCos >= COSINE_FLOOR ? 'BRECHA@floor' : 'honesto@floor'}`)
  }

  // ── Reporte ─────────────────────────────────────────────────────────────────
  mkdirSync(OUT_DIR, { recursive: true })

  const report = {
    task: 'TASK-1136',
    kind: 'hybrid-shadow',
    embeddingModel: EMBED_MODEL,
    dims: EMBED_DIMS,
    cosineFloor: COSINE_FLOOR,
    rrfK: 60,
    corpusChunks: { human: human.chunks.length, agentic: agentic.chunks.length },
    embeddedNow,
    embeddingTokensEstimated: tokensEstimated,
    golden: { fts: ftsM, ftsRerank: rerankM, hybrid: hybridM },
    paraphrase: { total: PARAPHRASE_PROBES.length, ftsHit: ftsParaHit, hybridHit: hybridParaHit },
    noAnswerRisk: { total: OFF_CORPUS_PROBES.length, breachAtZeroFloor: breachAtZero, breachAtFloor, floor: COSINE_FLOOR }
  }

  writeFileSync(resolve(OUT_DIR, 'hybrid-shadow-report.json'), JSON.stringify(report, null, 2))

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`

  console.log(`# TASK-1136 — Hybrid shadow eval (${EMBED_MODEL}, ${EMBED_DIMS}d, RRF k=60, cosine floor ${COSINE_FLOOR})\n`)
  console.log(`Corpus indexado: agentic=${agentic.chunks.length} chunks, human=${human.chunks.length}. Embebidos esta corrida: ${embeddedNow} (~${tokensEstimated} tokens).\n`)
  console.log('## Golden questions (45) — pass / recall / precision@1 / MRR / cross-doc / no-answer')

  for (const [name, m] of [['fts', ftsM], ['fts+rerank', rerankM], ['hybrid', hybridM]] as const) {
    console.log(`  ${name.padEnd(12)} pass ${m.passed}/${m.total} (${pct(m.passRate)}) · recall ${pct(m.recallRate)} · p@1 ${pct(m.firstHitRate)} · MRR ${m.mrr.toFixed(3)} · cross-doc ${pct(m.crossDocRate)} · no-answer ${m.noAnswerCorrect}/${m.noAnswerTotal} · wrong-src ${m.wrongSourceViolations}`)
  }

  console.log('\n## Probe paraphrase (vocab-mismatch, lexical-miss recovery)')
  console.log(`  fts+rerank: ${ftsParaHit}/${PARAPHRASE_PROBES.length} · hybrid: ${hybridParaHit}/${PARAPHRASE_PROBES.length}`)
  paraDetail.forEach(d => console.log(d))
  console.log('\n## Probe no-answer risk (off-corpus, brazo vector)')
  console.log(`  vecinos sin piso: ${breachAtZero}/${OFF_CORPUS_PROBES.length} devuelven algo · brechas con piso ${COSINE_FLOOR}: ${breachAtFloor}/${OFF_CORPUS_PROBES.length}`)
  noAnswerDetail.forEach(d => console.log(d))
  console.log(`\nReporte JSON: ${resolve(OUT_DIR, 'hybrid-shadow-report.json')}`)

  process.exit(0)
}

main().catch(err => {
  console.error('\nhybrid-shadow-eval FAIL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
