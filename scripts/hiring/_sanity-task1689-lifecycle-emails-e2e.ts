import 'server-only'

/**
 * TASK-1689/1688 rollout — ejercicio E2E del ciclo de emails con los COMMANDS CANÓNICOS
 * (mismo path que las APIs; cada paso emite su evento real al outbox → consumer del
 * ops-worker → email). Crea una postulación de PRUEBA claramente marcada (HR la descarta
 * en el Desk, precedente TASK-1378) y la lleva por: created → stage(shortlisted) →
 * assessment(candidate_test) → decided(rejected).
 *
 * Verificación posterior: greenhouse_notifications.email_deliveries por sourceEntity.
 * Uso: npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/_sanity-task1689-lifecycle-emails-e2e.ts --apply
 */

import { assignCandidateTest } from '@/lib/hiring/assessment/instances'
import { decideHiringApplication } from '@/lib/hiring/decide'
import { parsePublicHiringApplication } from '@/lib/hiring/public-careers/schema'
import { submitPublicHiringApplication } from '@/lib/hiring/public-careers/submit-application'
import { updateHiringApplicationStage } from '@/lib/hiring/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

if (process.env.GREENHOUSE_POSTGRES_HOST?.trim()) {
  delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
}

const APPLY = process.argv.includes('--apply')
const OPENING_PUBLIC_ID = 'EO-OPN-0061'
const EMAIL = 'task-1689-rollout@efeonce.org'

const main = async () => {
  console.log(`E2E lifecycle emails — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  const parsed = parsePublicHiringApplication({
    openingPublicId: OPENING_PUBLIC_ID,
    firstName: 'Prueba',
    lastName: 'TASK-1689 NO CONTACTAR',
    email: EMAIL,
    phone: '+56 9 4444 5555',
    residenceCountryCode: 've',
    message: 'POSTULACIÓN DE PRUEBA del rollout TASK-1688/1689 — NO CONTACTAR. Verifica contacto completo + emails.',
    consent: true,
    consentPolicyVersion: 'efeonce-careers-2026-07',
  })

  if (!parsed) throw new Error('parser rechazó el payload de prueba')

  console.log(`parser OK: phone=${parsed.phone} country=${parsed.residenceCountryCode}`)

  if (!APPLY) {
    console.log('DRY-RUN: sin cambios. Re-correr con --apply.')

    return
  }

  // 1. created → email interno + acuse
  const result = await submitPublicHiringApplication(parsed)

  console.log(`submit: outcome=${result.outcome} application=${result.applicationId} public=${result.applicationPublicId}`)

  if (result.outcome !== 'accepted' || !result.applicationId) throw new Error('submit no aceptado')

  const applicationId = result.applicationId

  // 2. stage → shortlisted (allowlisted candidate-facing → email de avance)
  const staged = await updateHiringApplicationStage(applicationId, 'shortlisted', null)

  console.log(`stage: ${staged.stage}`)

  // 3. assessment candidate_test → email con link (el consumer rota el token)
  const template = await runGreenhousePostgresQuery<{ template_id: string; name: string } & Record<string, unknown>>(
    `SELECT template_id, name FROM greenhouse_hiring.hiring_assessment_template
     WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`,
  )

  if (template[0]) {
    const assigned = await assignCandidateTest(
      { applicationId, templateId: template[0].template_id, timeLimitMinutes: 45 },
      null,
    )

    console.log(`assessment: ${assigned.assessment.assessmentId} (template ${template[0].name})`)
  } else {
    console.log('assessment: sin template activo — paso omitido')
  }

  // 4. decided → rejected (email de agradecimiento; pausable aparte)
  const decided = await decideHiringApplication(
    applicationId,
    {
      decision: 'rejected',
      reason: { summary: 'Postulación de PRUEBA del rollout TASK-1688/1689 — descarte controlado.' },
      idempotencyKey: `task-1689-rollout-${applicationId}`,
    },
    null,
  )

  console.log(`decision: ${decided.application.decision} (replay=${decided.idempotentReplay})`)
  console.log('')
  console.log(`Listo. applicationId=${applicationId} — los 4 eventos quedaron en el outbox;`)
  console.log('el lane ops-reactive-notifications (cada 2 min) enviará los emails.')
  console.log(`Verificar: SELECT ... FROM greenhouse_notifications.email_deliveries WHERE source_entity IN ('${applicationId}', <assessmentId>)`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('FAIL:', err?.message ?? err)
    process.exit(1)
  })
