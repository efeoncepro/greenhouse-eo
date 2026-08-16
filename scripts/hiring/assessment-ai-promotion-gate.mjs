#!/usr/bin/env node
// TASK-1734 Slice 3 — GATE MECÁNICO de promoción del scoring IA de assessments.
//
// Lee el reporte de eval más reciente (`pnpm hiring:ai:promotion-eval`) + el dataset que lo
// produjo y BLOQUEA (exit 1) mientras la evidencia de promoción no exista:
//   - dataset `synthetic: true` (el fixture sintético SOLO prueba el harness);
//   - sin doble rating humano independiente + adjudicación (`_meta.doubleRating`);
//   - estratos template×banda bajo el mínimo o casos adversariales insuficientes;
//   - cualquier blocker métrico del reporte (acuerdo IA-humano vs humano-humano, tolerancia,
//     confusión de bandas no adyacentes = 0, abstención, repeat stability).
//
// Los thresholds los computa UNA sola vez `getAiRunPromotionThresholds()`
// (src/lib/hiring/assessment/ai/scoring-run/config.ts) dentro del CLI del eval y viajan
// embebidos en el reporte (`report.thresholds`); este .mjs NO re-parsea env (cero drift).
// Los checks de dataset se re-verifican acá a nivel JSON: el gate no confía ciegamente en
// que el reporte los haya corrido.
//
// ⚠️ El dataset de promoción humano es TRABAJO DE TALENT (gold set + rater training +
// adjudicación) con lead time propio. Este gate existe precisamente para que ningún agente ni
// operador declare la promoción antes de que ese trabajo exista. NUNCA marcar este gate como
// pasado a mano.
//
// Uso:
//   pnpm hiring:ai:promotion-gate                       # reporte más reciente del dir default
//   pnpm hiring:ai:promotion-gate -- --report <path>    # reporte explícito
//   pnpm hiring:ai:promotion-gate -- --dataset <path>   # override del dataset (default: report.datasetPath)

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'

const DEFAULT_REPORT_DIR = '.eval-reports/hiring-assessment-ai-promotion'

const BLOCK_HEADER =
  'promoción BLOQUEADA: dataset de promoción humano pendiente (trabajo Talent — gold set + doble rating independiente + adjudicación)'

const argValue = (flag) => {
  const idx = process.argv.indexOf(flag)

  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null
}

const fail = (blockers) => {
  console.error(`✖ ${BLOCK_HEADER}`)
  console.error('')

  for (const b of blockers) console.error(`  - ${b}`)

  console.error('')
  console.error(
    'Siguiente paso: Talent produce el gold set humano (doble rating independiente + adjudicación), ' +
      'se corre `pnpm hiring:ai:promotion-eval -- --dataset <path>` y se re-ejecuta este gate.',
  )
  process.exit(1)
}

const latestReportPath = () => {
  const dir = resolve(DEFAULT_REPORT_DIR)

  if (!existsSync(dir)) return null

  const candidates = readdirSync(dir)
    .filter((f) => f.startsWith('promotion-eval-') && f.endsWith('.json'))
    .sort()

  return candidates.length > 0 ? join(dir, candidates[candidates.length - 1]) : null
}

const reportPath = argValue('--report') ? resolve(argValue('--report')) : latestReportPath()

if (!reportPath || !existsSync(reportPath)) {
  fail([
    'no existe ningún reporte de eval de promoción (corre `pnpm hiring:ai:promotion-eval` primero); ' +
      'sin evidencia versionada no hay promoción',
  ])
}

let report

try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'))
} catch (error) {
  fail([`reporte ilegible (${reportPath}): ${error?.message ?? error}`])
}

const datasetPath = argValue('--dataset')
  ? resolve(argValue('--dataset'))
  : report.datasetPath
    ? resolve(report.datasetPath)
    : null

if (!datasetPath || !existsSync(datasetPath)) {
  fail([`el dataset del reporte no existe o no fue declarado (datasetPath=${report.datasetPath ?? 'null'})`])
}

let dataset

try {
  dataset = JSON.parse(readFileSync(datasetPath, 'utf8'))
} catch (error) {
  fail([`dataset ilegible (${datasetPath}): ${error?.message ?? error}`])
}

const thresholds = report.thresholds

if (!thresholds || typeof thresholds.minCasesPerStratum !== 'number') {
  fail(['el reporte no embebe thresholds válidos (regenerar con `pnpm hiring:ai:promotion-eval`)'])
}

// ── Checks de dataset re-verificados a nivel JSON (no se confía solo en el reporte) ──

const blockers = []
const meta = dataset._meta ?? {}

if (meta.synthetic === true) {
  blockers.push('dataset_synthetic: el dataset está marcado `synthetic: true` — solo prueba el harness, jamás promueve')
}

if (meta.doubleRating?.independent !== true || meta.doubleRating?.adjudicated !== true) {
  blockers.push(
    'dataset_double_rating_incomplete: falta doble rating humano independiente + adjudicación declarados en `_meta.doubleRating`',
  )
}

const cases = Array.isArray(dataset.cases) ? dataset.cases : []

for (const c of cases) {
  const ratingsOk = [c.humanRatingA, c.humanRatingB, c.adjudicatedScore].every(
    (v) => Number.isFinite(v) && v >= 0 && v <= 100,
  )

  if (!ratingsOk) blockers.push(`dataset_case_ratings_invalid: ${c.id ?? '(sin id)'}`)
}

const standard = cases.filter((c) => c.caseKind === 'standard')
const adversarial = cases.filter((c) => c.caseKind === 'adversarial')
const strata = new Map()

for (const c of standard) {
  const key = `${c.templateKey}@${c.templateVersion}:${c.band}`

  strata.set(key, (strata.get(key) ?? 0) + 1)
}

for (const [key, count] of strata) {
  if (count < thresholds.minCasesPerStratum) {
    blockers.push(`stratum_minimum_unmet: ${key} tiene ${count} < ${thresholds.minCasesPerStratum}`)
  }
}

if (adversarial.length < thresholds.minAdversarialCases) {
  blockers.push(`adversarial_minimum_unmet: ${adversarial.length} < ${thresholds.minAdversarialCases} casos adversariales`)
}

// Coherencia reporte ↔ dataset (un reporte de otro dataset/versión no sirve de evidencia)
if (report.datasetVersion !== meta.version) {
  blockers.push(`report_dataset_mismatch: el reporte corrió ${report.datasetVersion} pero el dataset es ${meta.version}`)
}

// ── Blockers métricos computados por el harness (promotion-eval.ts) ──
// Dedupe por código estable (prefijo antes de ':'): los checks de dataset re-verificados acá
// y los del reporte cubren lo mismo con prosa distinta.

const codeOf = (b) => String(b).split(':')[0].trim()
const seenCodes = new Set(blockers.map(codeOf))

for (const b of report.evaluation?.blockers ?? []) {
  if (!seenCodes.has(codeOf(b))) {
    blockers.push(b)
    seenCodes.add(codeOf(b))
  }
}

if (!report.evaluation) {
  blockers.push('report_missing_evaluation: el reporte no trae veredicto mecánico (regenerar)')
}

if (blockers.length > 0) fail(blockers)

console.log('✔ Gate mecánico de promoción VERDE.')
console.log(`  Reporte: ${reportPath}`)
console.log(`  Dataset: ${datasetPath} (${meta.version})`)
console.log(
  '  Recordatorio: la promoción real además exige las actividades humanas ya autorizadas ' +
    '(canary owner nombrado, shadow → canary con flags default-OFF).',
)
