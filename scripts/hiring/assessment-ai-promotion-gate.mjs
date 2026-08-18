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
// El gate además NOMBRA la ruta de rating que detecta en el dataset (ruta A doble rating /
// ruta B test-retest / ruta C routing-only / instrumento sin calificar) y qué habilita cada una.
// "BLOQUEADO" a secas no le dice al operador si le faltan dos raters o le falta todo; y una ruta
// degradada no es "casi" el doble rating: habilita cosas distintas, y eso se dice.
// La detección se re-deriva del dataset JSON de forma INDEPENDIENTE del reporte (mismo patrón que
// los thresholds): si el reporte y el dataset no coinciden, es un blocker.
//
// Uso:
//   pnpm hiring:ai:promotion-gate                       # reporte más reciente del dir default
//   pnpm hiring:ai:promotion-gate -- --report <path>    # reporte explícito
//   pnpm hiring:ai:promotion-gate -- --dataset <path>   # override del dataset (default: report.datasetPath)
//   pnpm hiring:ai:promotion-gate -- --dataset <path> --dataset-only   # ruta + checks de dataset, sin reporte

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'

const DEFAULT_REPORT_DIR = '.eval-reports/hiring-assessment-ai-promotion'

const BLOCK_HEADER =
  'promoción BLOQUEADA: dataset de promoción humano pendiente (trabajo Talent — gold set + doble rating independiente + adjudicación)'

// Espejo de `PROMOTION_ROUTE_CAPABILITIES` (src/lib/hiring/assessment/ai/eval/promotion-eval.ts).
// La duplicación es deliberada y del mismo tipo que la de los checks de dataset: el gate no confía
// ciegamente en el reporte. El test `promotion-gate.test.ts` ejercita las 4 formas contra el .mjs
// real, y el blocker `rating_design_report_mismatch` detecta cualquier drift entre ambas capas.
const ROUTE_CAPABILITIES = {
  double_rating_independent: {
    label: 'Ruta A — doble rating humano independiente + adjudicación',
    enables: [
      'Evaluar los gates métricos completos (acuerdo IA-humano relativo al humano-humano, tolerancia, bandas, abstención, estabilidad).',
      'Con gate VERDE + canary owner nombrado: considerar HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED (siempre shadow → canary primero).',
    ],
    doesNotEnable: ['Saltarse el shadow y el canary: el gate verde autoriza evaluar la promoción, no encender el flag de una.'],
  },
  test_retest_intra_rater: {
    label: 'Ruta B — test-retest intra-rater (un solo rater, dos pasadas ≥7 días)',
    enables: [
      'Medir estabilidad INTRA-rater y detectar deriva del modelo entre corridas.',
      'Sostener un canary observado con revisión humana TOTAL, sin reducir revisión.',
    ],
    doesNotEnable: [
      'HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED / batch_eligible: no mide la varianza ENTRE personas, que es la mayor de las dos.',
      'Leer el MAE "humano-humano" como piso de referencia: acá es la estabilidad de una persona consigo misma.',
    ],
  },
  routing_decision_only: {
    label: 'Ruta C — sólo la decisión binaria de ruteo (¿necesita revisión humana?)',
    enables: [
      'Medir y mejorar el ROUTER de riesgo (precisión/recall de mandatory_review) con un solo rater competente.',
      'Ajustar señales y thresholds de la risk policy con evidencia humana real.',
    ],
    doesNotEnable: [
      'HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED / batch_eligible: sin score continuo no hay acuerdo IA-humano que medir.',
      'Cualquier afirmación sobre la exactitud del score de la IA.',
    ],
  },
  unrated_instrument: {
    label: 'Instrumento SIN calificar — la muestra existe, la evidencia no',
    enables: ['Repartir el instrumento a los raters entrenados con la BARS y empezar a calificar.'],
    doesNotEnable: ['Nada del rollout: sin ratings humanos no hay evidencia de promoción de ningún grado.'],
  },
}

/** Espejo de `detectPromotionRatingDesign`: la evidencia manda sobre la declaración de `_meta`. */
const detectRatingDesign = (dataset) => {
  const cases = Array.isArray(dataset.cases) ? dataset.cases : []
  const meta = dataset._meta ?? {}
  const declared = meta.ratingDesign ?? null
  const isNum = (v) => Number.isFinite(v)

  const withA = cases.filter((c) => isNum(c.humanRatingA)).length
  const withB = cases.filter((c) => isNum(c.humanRatingB)).length
  const withRoutingLabel = cases.filter((c) => typeof c.humanNeedsReview === 'boolean').length

  if (cases.length === 0 || (withA === 0 && withB === 0 && withRoutingLabel === 0)) {
    return { design: 'unrated_instrument', declared }
  }

  if (withA === 0 && withB === 0 && withRoutingLabel > 0) return { design: 'routing_decision_only', declared }

  if (declared === 'test_retest_intra_rater' || meta.retestIntervalDays != null) {
    return { design: 'test_retest_intra_rater', declared }
  }

  if (withA > 0 && withB > 0 && meta.doubleRating?.independent === true) {
    return { design: 'double_rating_independent', declared }
  }

  return { design: 'test_retest_intra_rater', declared }
}

const printRoute = (design, stream) => {
  const capability = ROUTE_CAPABILITIES[design]

  stream(`  Ruta detectada: ${capability.label}  [${design}]`)
  stream('')
  stream('  Habilita:')

  for (const e of capability.enables) stream(`    ✓ ${e}`)

  stream('')
  stream('  NO habilita:')

  for (const e of capability.doesNotEnable) stream(`    ✗ ${e}`)

  stream('')
}

const argValue = (flag) => {
  const idx = process.argv.indexOf(flag)

  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null
}

const NEXT_STEP_BY_DESIGN = {
  unrated_instrument:
    'Siguiente paso: entregar el instrumento a los raters entrenados con la BARS ' +
      '(docs/manual-de-uso/hr/calificar-gold-set-de-referencia.md) y calificar. Ningún agente puede rellenar los ratings.',
  test_retest_intra_rater:
    'Siguiente paso: para habilitar batch_eligible hace falta un SEGUNDO rater independiente (ruta A). ' +
      'Con la ruta B se puede sostener un canary con revisión humana total, nada más.',
  routing_decision_only:
    'Siguiente paso: la ruta C mejora el router; para batch_eligible hace falta rating continuo con dos raters (ruta A).',
  double_rating_independent:
    'Siguiente paso: corregir los blockers métricos y re-correr `pnpm hiring:ai:promotion-eval -- --dataset <path>`.',
}

const fail = (blockers, design = null) => {
  console.error(`✖ ${BLOCK_HEADER}`)
  console.error('')

  if (design) {
    printRoute(design, (line) => console.error(line))
  }

  for (const b of blockers) console.error(`  - ${b}`)

  console.error('')
  console.error(
    design
      ? NEXT_STEP_BY_DESIGN[design]
      : 'Siguiente paso: Talent produce el gold set humano (doble rating independiente + adjudicación), ' +
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

const datasetOnly = process.argv.includes('--dataset-only')
const reportPath = argValue('--report') ? resolve(argValue('--report')) : datasetOnly ? null : latestReportPath()

if (!datasetOnly && (!reportPath || !existsSync(reportPath))) {
  fail([
    'no existe ningún reporte de eval de promoción (corre `pnpm hiring:ai:promotion-eval` primero); ' +
      'sin evidencia versionada no hay promoción',
  ])
}

let report = null

if (reportPath) {
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'))
  } catch (error) {
    fail([`reporte ilegible (${reportPath}): ${error?.message ?? error}`])
  }
}

const datasetPath = argValue('--dataset')
  ? resolve(argValue('--dataset'))
  : report?.datasetPath
    ? resolve(report.datasetPath)
    : null

if (!datasetPath || !existsSync(datasetPath)) {
  fail([
    datasetOnly
      ? '`--dataset-only` requiere `--dataset <path>` a un archivo existente'
      : `el dataset del reporte no existe o no fue declarado (datasetPath=${report?.datasetPath ?? 'null'})`,
  ])
}

let dataset

try {
  dataset = JSON.parse(readFileSync(datasetPath, 'utf8'))
} catch (error) {
  fail([`dataset ilegible (${datasetPath}): ${error?.message ?? error}`])
}

// ── Ruta de rating: se deriva del DATASET, no de lo que diga el reporte ──

const { design, declared } = detectRatingDesign(dataset)

// Sin reporte, el modo `--dataset-only` responde la pregunta operativa ("¿en qué ruta estoy?")
// y bloquea igual: nombrar la ruta nunca es autorizar nada.
if (datasetOnly) {
  console.error(`✖ ${BLOCK_HEADER}`)
  console.error('')
  printRoute(design, (line) => console.error(line))
  console.error(`  Dataset: ${datasetPath} (${dataset._meta?.version ?? 'sin versión'})`)
  console.error('  Modo --dataset-only: no se evaluaron métricas (no hay reporte de eval).')
  console.error('')
  console.error(NEXT_STEP_BY_DESIGN[design])
  process.exit(1)
}

const thresholds = report.thresholds

if (!thresholds || typeof thresholds.minCasesPerStratum !== 'number') {
  fail(['el reporte no embebe thresholds válidos (regenerar con `pnpm hiring:ai:promotion-eval`)'], design)
}

// ── Checks de dataset re-verificados a nivel JSON (no se confía solo en el reporte) ──

const blockers = []
const meta = dataset._meta ?? {}

if (design !== 'double_rating_independent') {
  blockers.push(
    design === 'unrated_instrument'
      ? 'dataset_unrated_instrument: el instrumento existe pero ningún humano lo ha calificado — ' +
          'los ratings son trabajo de personas y ningún agente puede fabricarlos'
      : `dataset_rating_design_insufficient: ruta detectada \`${design}\` — no habilita batch_eligible ` +
          '(sólo la ruta A, doble rating humano independiente + adjudicación, lo hace)',
  )
}

if (declared != null && declared !== design) {
  blockers.push(
    `rating_design_declaration_mismatch: \`_meta.ratingDesign\` declara \`${declared}\` pero la evidencia de los casos es \`${design}\``,
  )
}

// Drift entre la detección del harness (TS) y la de este gate (.mjs): si divergen, una de las dos
// capas cambió sin la otra y el veredicto deja de ser confiable.
if (report.ratingDesign?.detected && report.ratingDesign.detected !== design) {
  blockers.push(
    `rating_design_report_mismatch: el reporte detectó \`${report.ratingDesign.detected}\` y el gate \`${design}\` sobre el mismo dataset`,
  )
}

if (meta.synthetic === true) {
  blockers.push('dataset_synthetic: el dataset está marcado `synthetic: true` — solo prueba el harness, jamás promueve')
}

if (meta.doubleRating?.independent !== true || meta.doubleRating?.adjudicated !== true) {
  blockers.push(
    'dataset_double_rating_incomplete: falta doble rating humano independiente + adjudicación declarados en `_meta.doubleRating`',
  )
}

const cases = Array.isArray(dataset.cases) ? dataset.cases : []

// En un instrumento sin calificar los ratings vacíos son el estado esperado: reportar un
// `ratings_invalid` por caso enterraría el único blocker que importa bajo N líneas de ruido.
if (design !== 'unrated_instrument') {
  for (const c of cases) {
    const ratingsOk = [c.humanRatingA, c.humanRatingB, c.adjudicatedScore].every(
      (v) => Number.isFinite(v) && v >= 0 && v <= 100,
    )

    if (!ratingsOk) blockers.push(`dataset_case_ratings_invalid: ${c.id ?? '(sin id)'}`)
  }
}

const standard = cases.filter((c) => c.caseKind === 'standard')
const adversarial = cases.filter((c) => c.caseKind === 'adversarial')
const strata = new Map()

for (const c of standard) {
  // Sin adjudicación no hay banda: un estrato `…:null` lleno daría un falso verde.
  if (c.band == null) continue

  const key = `${c.templateKey}@${c.templateVersion}:${c.band}`

  strata.set(key, (strata.get(key) ?? 0) + 1)
}

if (strata.size === 0 && standard.length > 0) {
  blockers.push(
    'stratum_bands_undetermined: ningún caso estándar tiene banda adjudicada — los estratos template×banda ' +
      'sólo existen después de la adjudicación humana',
  )
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

if (blockers.length > 0) fail(blockers, design)

console.log('✔ Gate mecánico de promoción VERDE.')
console.log('')
printRoute(design, (line) => console.log(line))
console.log(`  Reporte: ${reportPath}`)
console.log(`  Dataset: ${datasetPath} (${meta.version})`)
console.log(
  '  Recordatorio: la promoción real además exige las actividades humanas ya autorizadas ' +
    '(canary owner nombrado, shadow → canary con flags default-OFF).',
)
