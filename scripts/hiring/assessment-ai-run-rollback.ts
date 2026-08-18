// TASK-1734 Slice 6 — CLI del rollback drain del scoring IA de assessments.
//
// Ejecuta la secuencia del ADR `GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1`
// (revert: confirm OFF → enqueue OFF → ESTE drain → cola manual). Los FLAGS los apaga
// el operador ANTES (por runtime — ver runbook); este CLI solo drena y prueba:
//   1. lista runs no terminales,
//   2. cancel ordenado vía `cancelAssessmentAiScoringRun` (append-only, terminal-once),
//   3. `reconcileAssessmentAiScoringRuns` (huérfanas → superseded_by_manual),
//   4. reporte de residual CERO + cola manual preservada (ningún item se pierde).
//
// Uso (entry canónico: pnpm hiring:ai:run-rollback → scripts/hiring/assessment-ai-run-rollback.mjs):
//   pnpm hiring:ai:run-rollback                          # DRY-RUN (default): solo reporte
//   pnpm hiring:ai:run-rollback -- --apply               # ejecuta cancel + reconcile
//   pnpm hiring:ai:run-rollback -- --apply --reason canary_abort
//   pnpm hiring:ai:run-rollback -- --actor user-abc123   # default: ops:assessment-ai-rollback
//
// Requiere acceso PG (proxy local `pnpm pg:connect` o Cloud SQL Connector env).
// Runbook: docs/operations/runbooks/assessment-ai-scoring-rollout.md

import { rollbackAssessmentAiScoringRuns } from '@/lib/hiring/assessment/ai/scoring-run/rollback'
import { closeGreenhousePostgres } from '@/lib/postgres/client'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

const argValue = (flag: string): string | null => {
  const idx = process.argv.indexOf(flag)

  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null
}

const apply = process.argv.includes('--apply')
const actorUserId = argValue('--actor') ?? 'ops:assessment-ai-rollback'
const reasonCode = argValue('--reason') ?? 'rollback_drain'

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  console.log(
    apply
      ? `⚠️  APPLY — cancel + reconcile con actor=${actorUserId} reason=${reasonCode}`
      : 'DRY-RUN (default) — solo enumeración y reporte; nada muta. Usa --apply para ejecutar.',
  )

  try {
    const report = await rollbackAssessmentAiScoringRuns({ actorUserId, apply, reasonCode })

    console.log(JSON.stringify(report, null, 2))

    if (report.dryRun) {
      console.log(
        report.runsFound.length === 0 && report.clean
          ? '✅ Nada que drenar: cero runs no terminales y cero huérfanas.'
          : `ℹ️  ${report.runsFound.length} run(s) no terminales + residual ${JSON.stringify(report.residual)}. Re-ejecuta con --apply para drenar.`,
      )

      return
    }

    if (report.clean) {
      console.log(
        `✅ Rollback limpio: ${report.runsCancelled.length} run(s) cancelados, ` +
          `reconcile=${JSON.stringify(report.reconcile)}, residual en CERO. ` +
          `${report.manualQueuePending} respuesta(s) siguen en la cola manual (ningún item perdido).`,
      )

      return
    }

    console.error(
      `❌ Rollback INCOMPLETO: residual ${JSON.stringify(report.residual)} tras el drain. ` +
        'Revisar señales hiring.assessment_ai.* en /admin/operations y re-ejecutar; nunca cerrar por DELETE.',
    )
    process.exitCode = 1
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Assessment AI run rollback failed.')
  process.exitCode = 1
})
