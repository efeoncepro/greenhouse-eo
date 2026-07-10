/**
 * TASK-770 — Smoke E2E del bridge de activación contra PG REAL (gate TASK-893).
 *
 * Flujo: seed cadena sintética → decide selected(internal_hire) → materializa handoff →
 * approve handoff → cola de activación → review (claim) → create-member (core source-neutral:
 * member active=TRUE + pending_intake + membership) → open-onboarding (checklist TASK-030 o
 * blocked:onboarding_template_missing si no hay template — ambos outcomes válidos y
 * auditables) → [simula el cierre de intake por el path canónico] → complete → request
 * active + handoff completed con downstreamRef=member:<id>. Replays idempotentes. Cleanup total.
 *
 * Uso (proxy 127.0.0.1:15432, perfil ops):
 *   set -a && source .env.local && set +a
 *   GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= GREENHOUSE_POSTGRES_HOST=127.0.0.1 \
 *   GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false \
 *   GREENHOUSE_POSTGRES_USER=$GREENHOUSE_POSTGRES_OPS_USER \
 *   GREENHOUSE_POSTGRES_PASSWORD=$GREENHOUSE_POSTGRES_OPS_PASSWORD \
 *   HIRING_ACTIVATION_ENABLED=true HIRING_HANDOFF_BRIDGES_ENABLED=true \
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/_sanity-hiring-activation.ts
 */
import { randomUUID } from 'node:crypto'

import { decideHiringApplication } from '@/lib/hiring/decide'
import { getHiringHandoffByApplicationId, materializeHandoffFromApplication, transitionHiringHandoff } from '@/lib/hiring/handoff'
import { createHiringApplication, createHiringOpening, createTalentDemand, reconcileCandidateFacet } from '@/lib/hiring/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  completeHiringActivation,
  createMemberForHiringActivation,
  listHiringActivationQueue,
  openOnboardingForHiringActivation,
  reviewHiringActivation,
} from '@/lib/workforce/hiring-activation'

// Persona agente E2E provisionada por migración (onboarding_instances.created_by_user_id
// tiene FK a client_users — el actor debe ser un usuario real).
const ACTOR = 'user-agent-e2e-001'

const assert = (condition: unknown, label: string) => {
  if (!condition) throw new Error(`ASSERT FAILED: ${label}`)

  console.log(`  ✓ ${label}`)
}

const main = async () => {
  const profileId = `idp-smoke770-${randomUUID()}`

  const ids = {
    demandId: '', openingId: '', facetId: '', applicationId: '',
    handoffId: '', requestId: '', memberId: '', instanceId: '',
  }

  const cleanup = async () => {
    console.log('\n[cleanup]')
    await runGreenhousePostgresQuery(`ALTER TABLE greenhouse_hr.hiring_activation_request_events DISABLE TRIGGER hiring_activation_events_no_delete_trigger`)
    await runGreenhousePostgresQuery(`ALTER TABLE greenhouse_hiring.hiring_handoff_audit DISABLE TRIGGER hiring_handoff_audit_no_delete_trigger`)

    try {
      if (ids.requestId) {
        await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hr.hiring_activation_request_events WHERE activation_request_id = $1`, [ids.requestId])
        await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hr.hiring_activation_request WHERE activation_request_id = $1`, [ids.requestId])
      }

      if (ids.handoffId) {
        await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_handoff_audit WHERE hiring_handoff_id = $1`, [ids.handoffId])
        await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_handoff WHERE hiring_handoff_id = $1`, [ids.handoffId])
      }
    } finally {
      await runGreenhousePostgresQuery(`ALTER TABLE greenhouse_hr.hiring_activation_request_events ENABLE TRIGGER hiring_activation_events_no_delete_trigger`)
      await runGreenhousePostgresQuery(`ALTER TABLE greenhouse_hiring.hiring_handoff_audit ENABLE TRIGGER hiring_handoff_audit_no_delete_trigger`)
    }

    if (ids.instanceId) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hr.onboarding_instance_items WHERE instance_id = $1`, [ids.instanceId])
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hr.onboarding_instances WHERE instance_id = $1`, [ids.instanceId])
    }

    // La membership referencia por profile_id (no solo member_id) — cubrir ambas.
    await runGreenhousePostgresQuery(`DELETE FROM greenhouse_core.person_memberships WHERE profile_id = $1`, [profileId]).catch(() => undefined)

    if (ids.memberId) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_core.members WHERE member_id = $1`, [ids.memberId])
    }

    const aggregateIds = [ids.applicationId, ids.handoffId, ids.requestId, ids.memberId, ids.demandId, ids.openingId, ids.facetId].filter(Boolean)

    if (aggregateIds.length) {
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_sync.outbox_reactive_log WHERE event_id IN (
           SELECT event_id FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[]))`,
        [aggregateIds],
      )
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`, [aggregateIds])
    }

    if (ids.applicationId) await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = $1`, [ids.applicationId])
    if (ids.facetId) await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = $1`, [ids.facetId])
    if (ids.openingId) await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, [ids.openingId])
    if (ids.demandId) await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, [ids.demandId])
    await runGreenhousePostgresQuery(`DELETE FROM greenhouse_core.identity_profiles WHERE profile_id = $1`, [profileId])
    console.log('  ✓ datos sintéticos retirados')
  }

  try {
    console.log('[seed] cadena sintética + decisión selected(internal_hire) + handoff aprobado')
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_core.identity_profiles (profile_id, profile_type, full_name, status, active, canonical_email)
       VALUES ($1, 'person', 'SMOKE TASK-770 (sintético)', 'active', true, $2)`,
      [profileId, `smoke770+${randomUUID().slice(0, 8)}@example.invalid`],
    )

    const demand = await createTalentDemand(
      { stakeholderType: 'internal', engagementType: 'on_going', fulfillmentMode: 'internal_hire', demandOrigin: 'capacity_gap', requestedRole: 'SMOKE-770 role' },
      ACTOR,
    )

    ids.demandId = demand.demandId

    const opening = await createHiringOpening({ demandId: demand.demandId, internalTitle: 'SMOKE-770 opening' }, ACTOR)

    ids.openingId = opening.openingId

    const facet = await reconcileCandidateFacet({ identityProfileId: profileId, source: 'manual' }, ACTOR)

    ids.facetId = facet.candidateFacetId

    const app = await createHiringApplication(
      { openingId: opening.openingId, identityProfileId: profileId, candidateFacetId: facet.candidateFacetId, source: 'manual' },
      ACTOR,
    )

    ids.applicationId = app.applicationId

    await decideHiringApplication(
      ids.applicationId,
      {
        decision: 'selected',
        selectedDestination: 'internal_hire',
        tentativeStartDate: '2026-08-01',
        idempotencyKey: 'smoke-770-1',
        reason: { summary: 'Smoke TASK-770: selección sintética para validar el bridge de activación.' },
      },
      ACTOR,
    )

    await materializeHandoffFromApplication(ids.applicationId)

    const handoff = await getHiringHandoffByApplicationId(ids.applicationId)

    ids.handoffId = handoff!.handoffId
    await transitionHiringHandoff({ handoffId: ids.handoffId, action: 'approve', actorUserId: ACTOR })
    console.log(`  ✓ handoff aprobado ${ids.handoffId}`)

    // ── 1. Cola de activación (contrato 356 + estado del request) ──
    console.log('\n[1] cola de activación')

    const queue = await listHiringActivationQueue({ limit: 100 })

    assert(queue.enabled, 'cola habilitada (doble flag)')

    const queueItem = queue.items.find((item) => item.handoffId === ids.handoffId)

    assert(queueItem, 'handoff aprobado visible en la cola')
    assert(queueItem!.request === null, 'sin request antes del claim')

    // ── 2. review (claim idempotente) ──
    console.log('\n[2] review (claim)')

    const request = await reviewHiringActivation({ hiringHandoffId: ids.handoffId, actorUserId: ACTOR })

    ids.requestId = request.activationRequestId
    assert(request.state === 'pending_hr_review', 'request pending_hr_review')

    const replay = await reviewHiringActivation({ hiringHandoffId: ids.handoffId, actorUserId: ACTOR })

    assert(replay.activationRequestId === ids.requestId, 'review replay idempotente')

    // ── 3. create-member (core source-neutral) ──
    console.log('\n[3] create-member')

    const withMember = await createMemberForHiringActivation({ hiringHandoffId: ids.handoffId, actorUserId: ACTOR })

    ids.memberId = withMember.memberId!
    assert(withMember.state === 'member_created', 'request member_created')
    assert(withMember.memberOutcome === 'created_new', 'member creado nuevo')

    const memberRows = await runGreenhousePostgresQuery<{ active: boolean; workforce_intake_status: string; identity_profile_id: string }>(
      `SELECT active, workforce_intake_status, identity_profile_id FROM greenhouse_core.members WHERE member_id = $1`,
      [ids.memberId],
    )

    assert(memberRows[0]?.active === true, 'member active=TRUE (patrón SCIM)')
    assert(memberRows[0]?.workforce_intake_status === 'pending_intake', 'member pending_intake (gate payroll)')
    assert(memberRows[0]?.identity_profile_id === profileId, 'member sobre el MISMO identity_profile_id')

    const replayMember = await createMemberForHiringActivation({ hiringHandoffId: ids.handoffId, actorUserId: ACTOR })

    assert(replayMember.memberId === ids.memberId, 'create-member replay no duplica')

    const memberCount = await runGreenhousePostgresQuery<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM greenhouse_core.members WHERE identity_profile_id = $1`,
      [profileId],
    )

    assert(memberCount[0]?.n === 1, 'exactamente 1 member por persona')

    // ── 4. open-onboarding (checklist o blocked por template — ambos válidos) ──
    console.log('\n[4] open-onboarding')

    const withOnboarding = await openOnboardingForHiringActivation({ hiringHandoffId: ids.handoffId, actorUserId: ACTOR })

    if (withOnboarding.state === 'onboarding_open') {
      ids.instanceId = withOnboarding.onboardingInstanceId ?? ''
      assert(ids.instanceId, 'checklist de onboarding enlazado al request')
    } else {
      assert(
        withOnboarding.state === 'blocked' && withOnboarding.blockedReason === 'onboarding_template_missing',
        `sin template aplicable → blocked auditado (got ${withOnboarding.state}/${withOnboarding.blockedReason})`,
      )
      console.log('  (sin template activo para contract_type del member — outcome blocked validado)')
    }

    // ── 5. complete: exige intake completed por el path canónico ──
    console.log('\n[5] complete (evidencia del intake)')

    let premature = false

    try {
      await completeHiringActivation({ hiringHandoffId: ids.handoffId, actorUserId: ACTOR })
      premature = true
    } catch (error) {
      assert(
        (error as { code?: string }).code === 'hiring_activation_member_intake_pending',
        'complete bloqueado mientras la ficha no está completa',
      )
    }

    assert(!premature, 'complete NO cierra sin intake completed')

    // Simula el cierre del intake por el path canónico (completeWorkforceMemberIntake es la
    // maquinaria TASK-872/874, fuera del scope del smoke; el bridge solo verifica la evidencia).
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.members SET workforce_intake_status = 'completed' WHERE member_id = $1`,
      [ids.memberId],
    )

    const completed = await completeHiringActivation({ hiringHandoffId: ids.handoffId, actorUserId: ACTOR })

    assert(completed.state === 'active', 'request active')

    const finalHandoff = await getHiringHandoffByApplicationId(ids.applicationId)

    assert(finalHandoff!.state === 'completed', 'handoff completed')
    assert(finalHandoff!.downstreamRef === `member:${ids.memberId}`, 'downstreamRef = member:<id> (evidencia real)')

    const eventsCount = await runGreenhousePostgresQuery<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM greenhouse_hr.hiring_activation_request_events WHERE activation_request_id = $1`,
      [ids.requestId],
    )

    assert((eventsCount[0]?.n ?? 0) >= 3, `trail append-only completo (${eventsCount[0]?.n} eventos)`)

    console.log('\n✅ SMOKE TASK-770 OK (cola → claim → member pending_intake → onboarding → complete con evidencia, contra PG real)')
  } finally {
    try {
      await cleanup()
    } catch (cleanupError) {
      // NUNCA enmascarar el error original del smoke con uno de cleanup.
      console.error('[cleanup] FAILED (residuos sintéticos pueden quedar):', cleanupError)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ SMOKE FAILED:', error)
    process.exit(1)
  })
