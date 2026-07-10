/**
 * TASK-356 — Smoke E2E del handoff reactivo contra PG REAL (gate TASK-893: SQL embebida
 * ejercitada contra Postgres, no mocks).
 *
 * Flujo: seed cadena sintética (profile→demand→opening→facet→application) → decide
 * `selected` → publica el evento → `processReactiveEvents` SCOPED al handler
 * `hiring_handoff_materialize:hiring.application.decided` → asserts:
 *   1. un solo hiring_handoff `pending`
 *   2. replay del consumer → sin duplicado (Phase A no re-lee)
 *   3. re-decisión con destino distinto → supersede (destino actualizado, audit)
 *   4. decisión `rejected` → revocación (cancelled)
 *   5. cleanup completo (triggers de audit deshabilitados SOLO durante el cleanup, como ops)
 *
 * Uso (proxy en 127.0.0.1:15432, perfil ops):
 *   set -a && source .env.local && set +a
 *   GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= GREENHOUSE_POSTGRES_HOST=127.0.0.1 \
 *   GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false \
 *   GREENHOUSE_POSTGRES_USER=$GREENHOUSE_POSTGRES_OPS_USER \
 *   GREENHOUSE_POSTGRES_PASSWORD=$GREENHOUSE_POSTGRES_OPS_PASSWORD \
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/_sanity-handoff-reactive.ts
 */
import { randomUUID } from 'node:crypto'

import { decideHiringApplication } from '@/lib/hiring/decide'
import { getHiringHandoffByApplicationId } from '@/lib/hiring/handoff'
import { createHiringApplication, createHiringOpening, createTalentDemand, reconcileCandidateFacet } from '@/lib/hiring/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { buildReactiveHandlerKey, processReactiveEvents } from '@/lib/sync/reactive-consumer'

const HANDLER_KEY = buildReactiveHandlerKey('hiring_handoff_materialize', 'hiring.application.decided')
const ACTOR = 'user-task-356-smoke'

const assert = (condition: unknown, label: string) => {
  if (!condition) throw new Error(`ASSERT FAILED: ${label}`)

  console.log(`  ✓ ${label}`)
}

const publishPendingSyntheticEvents = async (aggregateId: string) => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.outbox_events
     SET status = 'published'
     WHERE aggregate_id = $1 AND status = 'pending'`,
    [aggregateId],
  )
}

const main = async () => {
  const profileId = `idp-smoke356-${randomUUID()}`
  const ids = { demandId: '', openingId: '', facetId: '', applicationId: '', handoffId: '' }

  const cleanup = async () => {
    console.log('\n[cleanup]')

    // El audit es append-only (triggers anti-UPDATE/DELETE). Para retirar los datos
    // sintéticos del smoke se deshabilitan SOLO durante el cleanup, como ops (owner).
    await runGreenhousePostgresQuery(`ALTER TABLE greenhouse_hiring.hiring_handoff_audit DISABLE TRIGGER hiring_handoff_audit_no_delete_trigger`)

    try {
      if (ids.handoffId) {
        await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_handoff_audit WHERE hiring_handoff_id = $1`, [ids.handoffId])
        await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_handoff WHERE hiring_handoff_id = $1`, [ids.handoffId])
      }
    } finally {
      await runGreenhousePostgresQuery(`ALTER TABLE greenhouse_hiring.hiring_handoff_audit ENABLE TRIGGER hiring_handoff_audit_no_delete_trigger`)
    }

    const aggregateIds = [ids.applicationId, ids.handoffId, ids.demandId, ids.openingId, ids.facetId].filter(Boolean)

    if (aggregateIds.length) {
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_sync.outbox_reactive_log WHERE event_id IN (
           SELECT event_id FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])
         )`,
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
    console.log('[seed] cadena sintética')
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_core.identity_profiles (profile_id, profile_type, full_name, status, active, canonical_email)
       VALUES ($1, 'person', 'SMOKE TASK-356 (sintético)', 'active', true, $2)`,
      [profileId, `smoke356+${randomUUID().slice(0, 8)}@example.invalid`],
    )

    const demand = await createTalentDemand(
      {
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'capacity_gap',
        requestedRole: 'SMOKE-356 role',
      },
      ACTOR,
    )

    ids.demandId = demand.demandId

    const opening = await createHiringOpening({ demandId: demand.demandId, internalTitle: 'SMOKE-356 opening' }, ACTOR)

    ids.openingId = opening.openingId

    const facet = await reconcileCandidateFacet({ identityProfileId: profileId, source: 'manual' }, ACTOR)

    ids.facetId = facet.candidateFacetId

    const app = await createHiringApplication(
      { openingId: opening.openingId, identityProfileId: profileId, candidateFacetId: facet.candidateFacetId, source: 'manual' },
      ACTOR,
    )

    ids.applicationId = app.applicationId
    console.log(`  ✓ application ${app.applicationId}`)

    // ── 1. decide selected → evento → consumer scoped → 1 handoff pending ──
    console.log('\n[1] decided selected → consumer → handoff pending')
    await decideHiringApplication(
      ids.applicationId,
      {
        decision: 'selected',
        selectedDestination: 'internal_hire',
        tentativeStartDate: '2026-08-01',
        idempotencyKey: 'smoke-356-1',
        reason: { summary: 'Smoke TASK-356: selección sintética para validar el handoff reactivo.' },
      },
      ACTOR,
    )
    await publishPendingSyntheticEvents(ids.applicationId)

    const run1 = await processReactiveEvents({ handlerKeys: [HANDLER_KEY] })

    console.log(`  consumer: fetched=${run1.eventsFetched} acked=${run1.eventsAcknowledged} actions=${JSON.stringify(run1.actions)}`)

    const handoff1 = await getHiringHandoffByApplicationId(ids.applicationId)

    assert(handoff1, 'handoff materializado')
    ids.handoffId = handoff1!.handoffId
    assert(handoff1!.state === 'pending', `handoff pending (got ${handoff1!.state})`)
    assert(handoff1!.selectedDestination === 'internal_hire', 'destino internal_hire')

    const countRows = await runGreenhousePostgresQuery<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM greenhouse_hiring.hiring_handoff WHERE hiring_application_id = $1`,
      [ids.applicationId],
    )

    assert(countRows[0]?.n === 1, 'exactamente 1 handoff')

    // ── 2. replay → sin duplicado ──
    console.log('\n[2] replay del consumer → sin duplicado')

    const run2 = await processReactiveEvents({ handlerKeys: [HANDLER_KEY] })

    assert(run2.eventsFetched === 0, `Phase A no re-lee el evento acusado (fetched=${run2.eventsFetched})`)

    // ── 3. re-decisión con destino distinto → supersede ──
    console.log('\n[3] re-decisión staff_augmentation → supersede en pending')
    await decideHiringApplication(
      ids.applicationId,
      {
        decision: 'selected',
        selectedDestination: 'staff_augmentation',
        idempotencyKey: 'smoke-356-2',
        reason: { summary: 'Smoke TASK-356: supersede de destino para validar upsert guardado.' },
      },
      ACTOR,
    )
    await publishPendingSyntheticEvents(ids.applicationId)
    await processReactiveEvents({ handlerKeys: [HANDLER_KEY] })

    const handoff2 = await getHiringHandoffByApplicationId(ids.applicationId)

    assert(handoff2!.handoffId === ids.handoffId, 'misma fila (UNIQUE por application)')
    assert(handoff2!.selectedDestination === 'staff_augmentation', 'destino actualizado por supersede')
    assert(handoff2!.state === 'pending', 'sigue pending (destino soportado)')

    // ── 4. decisión rejected → revocación → cancelled ──
    console.log('\n[4] re-decisión rejected → revocación → cancelled')
    await decideHiringApplication(
      ids.applicationId,
      {
        decision: 'rejected',
        idempotencyKey: 'smoke-356-3',
        reason: { summary: 'Smoke TASK-356: revocación sintética de la selección.' },
      },
      ACTOR,
    )
    await publishPendingSyntheticEvents(ids.applicationId)
    await processReactiveEvents({ handlerKeys: [HANDLER_KEY] })

    const handoff3 = await getHiringHandoffByApplicationId(ids.applicationId)

    assert(handoff3!.state === 'cancelled', `handoff cancelled tras revocación (got ${handoff3!.state})`)

    const auditRows = await runGreenhousePostgresQuery<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM greenhouse_hiring.hiring_handoff_audit WHERE hiring_handoff_id = $1`,
      [ids.handoffId],
    )

    assert((auditRows[0]?.n ?? 0) >= 3, `audit trail completo (${auditRows[0]?.n} filas)`)

    console.log('\n✅ SMOKE TASK-356 OK (materialize + replay + supersede + revocación contra PG real)')
  } finally {
    await cleanup()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ SMOKE FAILED:', error)
    process.exit(1)
  })
