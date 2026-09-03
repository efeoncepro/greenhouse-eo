/**
 * TASK-1806 Slice 2 — Evaluador/decisor del shadow legacy/improved ETV. CERO llamadas al proveedor.
 *
 * Lee la evidencia persistida del shadow (tablas formula-aware de TASK-1805) + el `summary.json` del ejecutor
 * bounded + el benchmark GSC first-party, aplica los umbrales congelados del preregistro y escribe el artefacto
 * de decisión (Markdown + JSON). Corre con el proxy Cloud SQL arriba y GSC habilitado en el env local:
 *
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/dataforseo-etv-shadow-evaluate.ts \
 *     --cohort=scripts/growth/etv-shadow-cohorts/2026-09-03-preregistered.json \
 *     --capture-date=2026-10-15 \
 *     --summary=<artifactDir>/summary.json \
 *     [--evaluation-date=YYYY-MM-DD] [--out=<md>] [--json=<json>]
 *
 * Defaults: `--capture-date` = hoy UTC; `--out` = docs/audits/seo/etv-shadow/<capture-date>-<cohortId>-results.md;
 * `--json` = <dir del summary>/evaluation.json (o junto al Markdown si no hay summary).
 *
 * Exit 0 siempre que la evaluación se haya producido: `no_go` y `hold` son RESULTADOS, no fallos del script.
 * Exit 1 sólo si no se pudo evaluar (cohorte ilegible, PG caído, etc.).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import type { EtvShadowCohort, EtvShadowRunSummary } from '../../src/lib/growth/seo/etv-methodology/shadow-decision'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const flag = (name: string): string | null => {
  const raw = process.argv.find(argument => argument.startsWith(`--${name}=`))

  return raw ? raw.slice(name.length + 3) : null
}

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value)

const readJson = <T>(filePath: string, label: string): T => {
  const absolute = path.resolve(process.cwd(), filePath)

  if (!existsSync(absolute)) {
    throw new Error(`${label} no existe: ${absolute}`)
  }

  return JSON.parse(readFileSync(absolute, 'utf8')) as T
}

const main = async () => {
  const cohortPath = flag('cohort')

  if (!cohortPath) {
    throw new Error('Falta --cohort=<path a la cohorte preregistrada (.json)>')
  }

  const captureDate = flag('capture-date') ?? new Date().toISOString().slice(0, 10)
  const evaluationDate = flag('evaluation-date') ?? new Date().toISOString().slice(0, 10)

  if (!isIsoDate(captureDate) || !isIsoDate(evaluationDate)) {
    throw new Error('--capture-date y --evaluation-date deben ser YYYY-MM-DD')
  }

  const { closeGreenhousePostgres } = await import('../../src/lib/postgres/client')
  const { evaluateEtvShadow, renderEtvShadowReportMarkdown } = await import('../../src/lib/growth/seo/etv-methodology/shadow-report')

  const cohort = readJson<EtvShadowCohort>(cohortPath, 'La cohorte')

  if (!cohort || typeof cohort.id !== 'string' || !Array.isArray(cohort.cells) || cohort.cells.length === 0) {
    throw new Error('La cohorte no tiene la forma esperada { id, approvedBy, approvedAt, organizations, cells[] }')
  }

  const summaryPath = flag('summary')
  const summary = summaryPath ? readJson<EtvShadowRunSummary>(summaryPath, 'El summary.json del ejecutor') : null

  if (summary && summary.cohortId && summary.cohortId !== cohort.id) {
    console.warn(`[aviso] summary.cohortId=${summary.cohortId} ≠ cohort.id=${cohort.id}: se evalúa igual, pero se declara.`)
  }

  const outPath = path.resolve(process.cwd(), flag('out') ?? path.join('docs/audits/seo/etv-shadow', `${captureDate}-${cohort.id}-results.md`))
  const jsonPath = path.resolve(process.cwd(), flag('json') ?? (summaryPath ? path.join(path.dirname(summaryPath), 'evaluation.json') : path.join(path.dirname(outPath), `${captureDate}-${cohort.id}-evaluation.json`)))

  try {
    const result = await evaluateEtvShadow({ cohort, captureDate, summary, evaluationDate })

    mkdirSync(path.dirname(outPath), { recursive: true })
    mkdirSync(path.dirname(jsonPath), { recursive: true })
    writeFileSync(outPath, renderEtvShadowReportMarkdown(result), 'utf8')
    writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')

    console.log(`[etv-shadow] cohorte=${cohort.id} captureDate=${captureDate} evaluationDate=${evaluationDate} modo=${result.mode} providerCalls=0`)
    console.log(`[etv-shadow] celdas=${result.cells.length} válidas=${result.cells.filter(cell => cell.validity.valid).length} inputsEquivalent=${result.inputsEquivalent}`)
    console.log(`[etv-shadow] costo forecast=${result.cost.forecastUsd.toFixed(4)} real=${result.cost.realUsd.toFixed(4)} latencia media=${result.latency.meanMs ?? 'n/d'} ms`)
    console.log(`[etv-shadow] DECISIÓN: ${result.decision.decision} · tratamiento histórico: ${result.decision.historicalTreatment ?? 'ninguno'}`)

    for (const line of result.decision.rationale) console.log(`  · ${line}`)

    console.log('[etv-shadow] hallazgos:')

    for (const finding of result.decision.findings) {
      console.log(`  [${finding.severity}] ${finding.code}${finding.cell !== undefined ? ` (celda ${finding.cell})` : ''} — ${finding.detail}`)
    }

    console.log(`[etv-shadow] artefacto: ${outPath}`)
    console.log(`[etv-shadow] json: ${jsonPath}`)
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error('[etv-shadow] no se pudo evaluar:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
