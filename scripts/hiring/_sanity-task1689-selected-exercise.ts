import 'server-only'

/**
 * TASK-1689 — ejercicio live del email `hiring_decision_selected` sobre la postulación de
 * PRUEBA EO-APP-0090 (supersede rejected→selected; tras verificar el email, re-decidir
 * rejected con `--revert` para dejarla descartada). Idempotencia: keys distintas por paso.
 */

import { decideHiringApplication } from '@/lib/hiring/decide'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

if (process.env.GREENHOUSE_POSTGRES_HOST?.trim()) {
  delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
}

const APPLICATION_ID = 'happ-b0175b48-05bd-4bf9-8e3c-0019dcf8028d'
const REVERT = process.argv.includes('--revert')

const main = async () => {
  const result = REVERT
    ? await decideHiringApplication(
        APPLICATION_ID,
        {
          decision: 'rejected',
          reason: { summary: 'Cierre del ejercicio selected (TASK-1689): la postulación de PRUEBA vuelve a rejected/descartada.' },
          idempotencyKey: 'task-1689-selected-exercise-revert',
        },
        null,
      )
    : await decideHiringApplication(
        APPLICATION_ID,
        {
          decision: 'selected',
          reason: { summary: 'PRUEBA controlada del email hiring_decision_selected (rollout TASK-1689); se re-decide rejected al verificar.' },
          idempotencyKey: 'task-1689-selected-exercise',
          selectedDestination: 'internal_hire',
        },
        null,
      )

  console.log(`decision=${result.application.decision} supersedes=${result.decisionEntry.supersedesDecisionId} replay=${result.idempotentReplay}`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('FAIL:', err?.message ?? err)
    process.exit(1)
  })
