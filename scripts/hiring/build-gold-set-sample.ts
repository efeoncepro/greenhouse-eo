/**
 * TASK-1734 Slice 3 — Construye el INSTRUMENTO del gold set de promoción desde datos REALES.
 *
 * Lee de PostgreSQL las respuestas `open_text` / `situational` ya calificadas por humanos (con su
 * rúbrica y competencia), arma una muestra estratificada por **competencia × banda de score**
 * (baja <60 · media 60–79 · alta ≥80) con cuotas explícitas y semilla determinística, y emite:
 *
 *   1. `<slug>.instrument.json`         — lo que el rater abre. Ratings VACÍOS (`null`).
 *   2. `<slug>.stratification-key.json` — llave SELLADA (mapeo caseId→responseId, banda previa,
 *                                          cuotas objetivo vs reales, semilla, dimensionamiento).
 *
 * ⚠️ LÍMITE ÉTICO: este script NUNCA genera `humanRatingA`, `humanRatingB` ni `adjudicatedScore`.
 * Calificar es el acto que da validez al instrumento y lo hace una persona. El gate
 * (`pnpm hiring:ai:promotion-gate`) sigue bloqueando hasta que exista esa calificación.
 *
 * ⚠️ ANONIMIZACIÓN: el instrumento no lleva nombre, email, `responseId`, score previo ni banda.
 * El texto de la respuesta pasa por `redactCandidateContactText` porque puede contener PII
 * autodeclarada por el candidato.
 *
 * Uso (con el proxy en 127.0.0.1:15432):
 *   pnpm hiring:ai:gold-set-sample
 *   pnpm hiring:ai:gold-set-sample -- --template atpl-account-manager-l2 --seed gold-set-2026-08
 *   pnpm hiring:ai:gold-set-sample -- --out .gold-set/hiring-assessment-promotion --dry-run
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  buildGoldSetSample,
  computeGoldSetSizing,
  type GoldSetSourceResponse,
} from '@/lib/hiring/assessment/ai/eval/gold-set-sampling'
import { getAiRunPromotionThresholds } from '@/lib/hiring/assessment/ai/scoring-run/config'

const DEFAULT_OUT_DIR = '.gold-set/hiring-assessment-promotion'
const DEFAULT_SEED = 'gold-set-promotion-v1'

const argValue = (flag: string): string | null => {
  const idx = process.argv.indexOf(flag)

  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null
}

const hasFlag = (flag: string): boolean => process.argv.includes(flag)

interface SourceRow extends Record<string, unknown> {
  response_id: string
  question_id: string
  template_id: string | null
  template_version: number | null
  competency_key: string
  competency_name: string
  competency_weight: string | null
  level: string
  prompt: string
  rubric_json: unknown
  answer_text: string | null
  human_score: string | null
  router_reasons: string[] | null
}

const main = async () => {
  const templateFilter = argValue('--template')
  const seed = argValue('--seed') ?? DEFAULT_SEED
  const outDir = resolve(argValue('--out') ?? DEFAULT_OUT_DIR)
  const dryRun = hasFlag('--dry-run')
  const datasetVersion = argValue('--version') ?? `promotion-dataset.instrument.${seed}.v1`

  const thresholds = getAiRunPromotionThresholds()
  const sizing = computeGoldSetSizing(thresholds)

  // Las razones del router se agregan por respuesta: una misma respuesta puede tener varios run
  // items (reintentos), y basta que UNO la haya marcado para que sea un caso difícil.
  const rows = await runGreenhousePostgresQuery<SourceRow>(
    `SELECT r.response_id,
            r.question_id,
            a.template_id,
            t.version AS template_version,
            c.key  AS competency_key,
            c.name AS competency_name,
            m.weight AS competency_weight,
            q.level,
            q.prompt,
            q.rubric_json,
            r.answer_json->>'text' AS answer_text,
            r.human_score,
            COALESCE(
              (SELECT ARRAY_AGG(DISTINCT reason)
                 FROM greenhouse_hiring.hiring_assessment_ai_scoring_run_item ri,
                      LATERAL JSONB_ARRAY_ELEMENTS_TEXT(ri.routing_reasons) AS reason
                WHERE ri.response_id = r.response_id),
              ARRAY[]::text[]
            ) AS router_reasons
       FROM greenhouse_hiring.hiring_assessment_response r
       JOIN greenhouse_hiring.hiring_question q ON q.question_id = r.question_id
       JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = r.competency_id
       JOIN greenhouse_hiring.hiring_assessment a ON a.assessment_id = r.assessment_id
       JOIN greenhouse_hiring.hiring_application ha ON ha.application_id = a.application_id
       LEFT JOIN greenhouse_hiring.hiring_assessment_template t ON t.template_id = a.template_id
       LEFT JOIN greenhouse_hiring.hiring_assessment_template_module m
              ON m.template_id = a.template_id AND m.competency_id = r.competency_id
      WHERE q.type IN ('open_text', 'situational')
        AND r.answer_json->>'text' IS NOT NULL
        -- TASK-1739 — Exclusión de datos sintéticos SIN opt-in y SIN flag.
        --
        -- Esto es evidencia de un gate de PROMOCIÓN: no existe razón legítima para calibrar el
        -- scoring de candidatos reales contra una respuesta inventada. Hasta ahora la única
        -- protección era accidental —los seeds no se califican a mano y buildGoldSetSample sólo
        -- estratifica lo que tiene priorHumanScore—, así que la muestra del 2026-08-16 salió
        -- limpia por SUERTE, no por construcción. El día que alguien calificara un seed para probar
        -- el flujo de corrección humana, entraría al gold set. La procedencia se hereda por JOIN:
        -- hiring_assessment_response no lleva columna propia (una sola verdad por entidad).
        AND ha.data_origin = 'real'
        AND ($1::text IS NULL OR a.template_id = $1::text)
      ORDER BY r.response_id`,
    [templateFilter],
  )

  // Se leen TODAS las respuestas (con y sin score) porque el P75 de longitud —que define el caso
  // "largo sin sustancia"— sale del pool completo. Sólo las calificadas se pueden estratificar,
  // así que sólo esas entran a la selección; las demás se reportan como techo alcanzable.
  const sources: GoldSetSourceResponse[] = rows.map((row) => ({
      responseId: row.response_id,
      questionId: row.question_id,
      templateKey: row.template_id ?? 'sin-template',
      templateVersion: `v${row.template_version ?? 1}`,
      competencyKey: row.competency_key,
      competencyName: row.competency_name,
      competencyWeight: row.competency_weight != null ? Number(row.competency_weight) : null,
      level: row.level,
      questionPrompt: row.prompt,
      rubric: (row.rubric_json ?? {}) as Record<string, unknown>,
      answerText: row.answer_text ?? '',
      priorHumanScore: row.human_score != null ? Number(row.human_score) : null,
    routerReasons: row.router_reasons ?? [],
  }))

  const scored = sources.filter((s) => s.priorHumanScore != null)

  const generatedAt = new Date().toISOString()

  const { instrument, stratificationKey } = buildGoldSetSample(sources, {
    seed,
    datasetVersion,
    thresholds,
    generatedAt,
    raterTrainingReference: 'docs/documentation/hr/gold-set-rubrica-de-anclaje.md',
    notes:
      'Muestra estratificada de respuestas REALES de candidatos (competencia × banda de score previo). ' +
      'Procedencia: se excluyen postulaciones no reales (data_origin <> real, TASK-1739) SIN opt-in — ' +
      'no existe razón legítima para calibrar contra una respuesta inventada. ' +
      'anonimizada: sin nombre, email, responseId ni score previo; texto pasado por redactCandidateContactText. ' +
      'Ratings VACÍOS a propósito — los emite una persona con la BARS ' +
      '(protocolo: docs/manual-de-uso/hr/calificar-gold-set-de-referencia.md). ' +
      'Retención: el instrumento vive fuera del repo y se elimina al cerrar la evidencia de promoción.',
  })

  // ── Reporte de composición REAL (honesto: los estratos incompletos se declaran) ──

  console.log('\n══ Instrumento del gold set de promoción — TASK-1734 Slice 3 ══\n')
  console.log(`Semilla:            ${seed} (determinística; sin Math.random)`)
  console.log(`Versión dataset:    ${datasetVersion}`)
  console.log(`Template filtrado:  ${templateFilter ?? '(todos)'}`)
  console.log(`Pool leído:         ${sources.length} respuestas open_text/situational`)
  console.log(`  con score humano: ${scored.length} (estratificables ⇒ elegibles para la muestra)`)
  console.log(
    `  sin score humano: ${sources.length - scored.length} (NO estratificables: sin score previo no hay banda de origen; ` +
      'calificarlas primero sube el techo del instrumento)',
  )
  console.log(`Seleccionadas:      ${instrument.cases.length}\n`)

  console.log('── Dimensionamiento con fundamento ──\n')

  for (const line of sizing.rationale) console.log(`  · ${line}`)

  console.log('\n── Composición por competencia × banda (cuota objetivo vs real) ──\n')
  console.log('  competencia × banda'.padEnd(44), 'objetivo', 'disponible', 'seleccionado', 'faltante')

  for (const q of stratificationKey.quotas) {
    console.log(
      `  ${q.competencyKey} × ${q.band}`.padEnd(44),
      String(q.quotaTarget).padEnd(9),
      String(q.available).padEnd(11),
      String(q.selected).padEnd(13),
      q.shortfall > 0 ? `${q.shortfall} ⚠️` : '—',
    )
  }

  console.log('\n── Totales por banda ──\n')

  for (const b of stratificationKey.bandTotals) {
    console.log(
      `  ${b.band}`.padEnd(12),
      `seleccionados ${String(b.selected).padEnd(4)}`,
      `objetivo ${String(b.quotaTarget).padEnd(4)}`,
      b.shortfall > 0 ? `faltan ${b.shortfall} ⚠️` : '✔',
    )
  }

  const { totals } = stratificationKey

  console.log('\n── Veredicto de suficiencia ──\n')
  console.log(`  Casos estándar seleccionados: ${totals.selected}`)
  console.log(`  Piso fundamentado:            ${totals.standardTotalFloor} (faltan ${totals.shortfallVsFloor})`)
  console.log(`  Objetivo fundamentado:        ${totals.standardTotalTarget} (faltan ${totals.shortfallVsTarget})`)
  console.log(
    `  Casos adversariales:          ${totals.adversarialPresent} / ${totals.adversarialRequired} — se AUTORAN aparte, ` +
      'no se muestrean de data real de candidatos.',
  )

  if (stratificationKey.incompleteStrata.length > 0) {
    console.log(
      `\n  ⚠️ ESTRATOS INCOMPLETOS (${stratificationKey.incompleteStrata.length}): la DB no tiene suficientes ` +
        'respuestas reales calificadas para llenarlos. NO se rellenaron con casos de otro estrato.',
    )
    console.log(`     ${stratificationKey.incompleteStrata.join(', ')}`)
  }

  if (totals.shortfallVsFloor > 0) {
    console.log(
      '\n  ⚠️ La muestra NO alcanza el piso fundamentado. Sirve para calibrar raters y para las rutas B/C ' +
        '(ver el protocolo), pero no sostiene un IC 95% útil para la ruta A.',
    )
  }

  if (dryRun) {
    console.log('\n(--dry-run: no se escribió ningún archivo)\n')

    return
  }

  mkdirSync(outDir, { recursive: true })

  const slug = datasetVersion.replace(/[^a-zA-Z0-9._-]/g, '-')
  const instrumentPath = join(outDir, `${slug}.instrument.json`)
  const keyPath = join(outDir, `${slug}.stratification-key.json`)

  writeFileSync(instrumentPath, `${JSON.stringify(instrument, null, 2)}\n`)
  writeFileSync(keyPath, `${JSON.stringify(stratificationKey, null, 2)}\n`)

  console.log(`\n  Instrumento (se entrega al rater):  ${instrumentPath}`)
  console.log(`  Llave sellada (NO abrir antes):     ${keyPath}\n`)
  console.log('  Siguiente paso: leer docs/manual-de-uso/hr/calificar-gold-set-de-referencia.md y calificar.\n')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[gold-set-sample] falló:', error)
    process.exit(1)
  })
