/**
 * TASK-1136 Slice 1 — Baseline retrieval eval harness (offline, read-only).
 *
 * Corre las golden questions (TASK-1083/1127) contra el SSOT `searchKnowledge` en dos
 * arms — FTS puro y FTS+rerank (TASK-1124) — sobre el corpus real, y reporta:
 * pass-rate, recall, precision@1 (first-hit), cross-doc, MRR, no-answer honesto,
 * preservación de denegados, latencia p50/p95 y la taxonomía de fallas (Slice 1).
 *
 * NO cambia runtime: solo MIDE la salida del SSOT. NO toca el contrato. Es la
 * regresión/baseline contra la cual el shadow híbrido (Slice 2) se compara.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/retrieval-eval.ts [--json]
 *   (requiere PG: cargar .env.local primero, p.ej. `set -a && source .env.local && set +a`)
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { KNOWLEDGE_GOLDEN_QUESTIONS } from '@/lib/knowledge/search/golden-questions'
import {
  aggregateArmMetrics,
  evaluateGoldenQuestion,
  type RetrievalArmMetrics,
  type RetrievalQuestionEval
} from '@/lib/knowledge/search/retrieval-eval'
import { searchKnowledge } from '@/lib/knowledge/search/search-knowledge'
import type { KnowledgeSearchSubject } from '@/lib/knowledge/search/types'

const SUBJECT: KnowledgeSearchSubject = {
  userId: 'user-agent-e2e-001',
  tenantType: 'efeonce_internal',
  tenantId: null,
  roleCodes: ['efeonce_admin', 'collaborator'],
  routeGroups: ['internal'],
  capabilities: ['knowledge.document.read', 'knowledge.agentic.retrieve']
}

const OUT_DIR = resolve(process.cwd(), '.captures/knowledge-eval')

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))

  return sorted[idx]
}

interface ArmRun {
  arm: string
  metrics: RetrievalArmMetrics
  evals: RetrievalQuestionEval[]
  latencyP50: number
  latencyP95: number
}

const runArm = async (arm: string, rerank: boolean): Promise<ArmRun> => {
  process.env.KNOWLEDGE_SEARCH_RERANK_ENABLED = rerank ? 'true' : 'false'

  const evals: RetrievalQuestionEval[] = []
  const latencies: number[] = []

  for (const question of KNOWLEDGE_GOLDEN_QUESTIONS) {
    const t0 = performance.now()
    const packet = await searchKnowledge({ query: question.query, subject: SUBJECT, mode: question.mode })

    latencies.push(performance.now() - t0)

    evals.push(
      evaluateGoldenQuestion(question, {
        orderedTitles: packet.chunks.map(c => c.title),
        orderedDocIds: packet.chunks.map(c => c.documentId),
        confidence: packet.confidence,
        deniedOrFilteredCount: packet.deniedOrFilteredCount
      })
    )
  }

  return {
    arm,
    metrics: aggregateArmMetrics(evals, KNOWLEDGE_GOLDEN_QUESTIONS),
    evals,
    latencyP50: percentile(latencies, 50),
    latencyP95: percentile(latencies, 95)
  }
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

const renderArm = (run: ArmRun): string => {
  const m = run.metrics
  const failures = run.evals.filter(e => !e.passed)
  const fc = m.failureClassCounts

  const lines = [
    `### Arm: ${run.arm}`,
    '',
    `- Pass: ${m.passed}/${m.total} (${pct(m.passRate)})`,
    `- Recall: ${pct(m.recallRate)} · Precision@1 (first-hit): ${pct(m.firstHitRate)} · MRR: ${m.mrr.toFixed(3)}`,
    `- Cross-doc: ${pct(m.crossDocRate)} · Wrong-source violations: ${m.wrongSourceViolations} · No-answer: ${m.noAnswerCorrect}/${m.noAnswerTotal}`,
    `- Latencia: p50 ${run.latencyP50.toFixed(0)}ms · p95 ${run.latencyP95.toFixed(0)}ms`,
    `- Failure taxonomy: lexical_miss=${fc.lexical_miss} wrong_source=${fc.wrong_source} cross_doc_miss=${fc.cross_doc_miss} corpus_gap=${fc.corpus_gap} no_answer_violation=${fc.no_answer_violation} low_confidence=${fc.low_confidence} denied_preservation=${fc.denied_preservation}`,
    ''
  ]

  if (failures.length > 0) {
    lines.push('Fallas:')

    for (const f of failures) {
      lines.push(`  - ${f.id} [${f.failureClass}] (${f.mode})`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

const main = async () => {
  const jsonOnly = process.argv.includes('--json')

  const fts = await runArm('fts', false)
  const ftsRerank = await runArm('fts+rerank', true)

  mkdirSync(OUT_DIR, { recursive: true })

  const report = {
    task: 'TASK-1136',
    kind: 'baseline',
    corpusQuestionCount: KNOWLEDGE_GOLDEN_QUESTIONS.length,
    arms: [fts, ftsRerank].map(r => ({ arm: r.arm, metrics: r.metrics, latencyP50: r.latencyP50, latencyP95: r.latencyP95 }))
  }

  writeFileSync(resolve(OUT_DIR, 'baseline-report.json'), JSON.stringify(report, null, 2))

  if (jsonOnly) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`# TASK-1136 — Baseline retrieval eval (${KNOWLEDGE_GOLDEN_QUESTIONS.length} golden questions)\n`)
    console.log(renderArm(fts))
    console.log(renderArm(ftsRerank))
    console.log(`Reporte JSON: ${resolve(OUT_DIR, 'baseline-report.json')}`)
  }

  process.exit(0)
}

main().catch(err => {
  console.error('retrieval-eval FAIL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
