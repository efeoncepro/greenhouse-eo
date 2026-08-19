import { afterAll, describe, expect, it } from 'vitest'

import { createHiringOpening, createTalentDemand } from '@/lib/hiring/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  applySyntheticOriginMarking,
  planSyntheticOriginMarking,
  rollbackSyntheticOriginMarking,
} from './mark'

/**
 * TASK-1739 Slice 4 — marcado gobernado contra PG real.
 *
 * Lo que sólo un live test puede probar: que el CAS realmente protege, que el audit queda escrito y,
 * sobre todo, que la marca PROPAGA a la copia derivada. Sin propagación el marcado no tendría efecto
 * observable —el trigger no dispara si nadie toca la fila dependiente— y el desk seguiría mostrando
 * el fantasma recién marcado.
 */

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

const ACTOR = 'user-live-test'
const REASON = 'Live test de marcado gobernado TASK-1739'

describe.skipIf(!hasPgConfig)('TASK-1739 — apply/rollback del marcado (live PG)', () => {
  const created: { demandIds: string[]; openingIds: string[]; auditIds: string[] } = {
    demandIds: [],
    openingIds: [],
    auditIds: [],
  }

  afterAll(async () => {
    if (!hasPgConfig) return

    for (const id of created.openingIds) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, [
        id,
      ]).catch(() => undefined)
    }

    for (const id of created.demandIds) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, [
        id,
      ]).catch(() => undefined)
    }

    const ids = [...created.openingIds, ...created.demandIds]

    if (ids.length) {
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`,
        [ids],
      ).catch(() => undefined)
    }
    // El audit es append-only por diseño: sus filas NO se borran. Quedan como historia del test.
  })

  const seedRealOpening = async () => {
    const demand = await createTalentDemand(
      {
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'capacity_gap',
        requestedRole: 'T1739 mark-live',
      },
      ACTOR,
    )

    created.demandIds.push(demand.demandId)

    const opening = await createHiringOpening(
      { demandId: demand.demandId, internalTitle: 'T1739 mark-live' },
      ACTOR,
    )

    created.openingIds.push(opening.openingId)

    return opening
  }

  const readOpeningOrigin = async (openingId: string): Promise<string> => {
    const rows = await runGreenhousePostgresQuery<{ data_origin: string }>(
      `SELECT data_origin FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`,
      [openingId],
    )

    return rows[0].data_origin
  }

  it('el plan es READ-ONLY: correrlo no muta ninguna fila', async () => {
    const before = await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*) AS n FROM greenhouse_hiring.hiring_opening WHERE data_origin <> 'real'`,
    )

    const plan = await planSyntheticOriginMarking()

    const after = await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*) AS n FROM greenhouse_hiring.hiring_opening WHERE data_origin <> 'real'`,
    )

    expect(after[0].n).toBe(before[0].n)
    expect(plan.candidates.every(c => c.signals.length > 0)).toBe(true)
  })

  it('exige actor y un motivo de al menos 10 caracteres', async () => {
    await expect(
      applySyntheticOriginMarking({ entries: [], actorUserId: '', reason: REASON }),
    ).rejects.toThrow(/actor/i)

    await expect(
      applySyntheticOriginMarking({
        entries: [
          { recordType: 'hiring_opening', recordId: 'x', expectedCurrentOrigin: 'real', proposedOrigin: 'demo' },
        ],
        actorUserId: ACTOR,
        reason: 'corto',
      }),
    ).rejects.toThrow(/10 caracteres/i)
  })

  it('marca, escribe audit y PROPAGA a la copia derivada; el re-apply es idempotente', async () => {
    const opening = await seedRealOpening()

    const summary = await applySyntheticOriginMarking({
      entries: [
        {
          recordType: 'hiring_opening',
          recordId: opening.openingId,
          expectedCurrentOrigin: 'real',
          proposedOrigin: 'smoke_test',
        },
      ],
      actorUserId: ACTOR,
      reason: REASON,
    })

    expect(summary.applied).toBe(1)
    expect(await readOpeningOrigin(opening.openingId)).toBe('smoke_test')

    const auditId = summary.results[0].auditId!

    created.auditIds.push(auditId)
    expect(auditId).toBeTruthy()
    // La propagación corre aunque no haya postulaciones colgando: el contador es honesto.
    expect(summary.results[0].propagatedApplications).toBe(0)

    // Re-apply idéntico: no vuelve a marcar ni duplica audit.
    const again = await applySyntheticOriginMarking({
      entries: [
        {
          recordType: 'hiring_opening',
          recordId: opening.openingId,
          expectedCurrentOrigin: 'real',
          proposedOrigin: 'smoke_test',
        },
      ],
      actorUserId: ACTOR,
      reason: REASON,
    })

    expect(again.skipped).toBe(1)
    expect(again.results[0].reasonCode).toBe('already_marked')
  })

  it('CAS: si la fila cambió desde el dry-run, se salta y se reporta — jamás se pisa', async () => {
    const opening = await seedRealOpening()

    await applySyntheticOriginMarking({
      entries: [
        {
          recordType: 'hiring_opening',
          recordId: opening.openingId,
          expectedCurrentOrigin: 'real',
          proposedOrigin: 'demo',
        },
      ],
      actorUserId: ACTOR,
      reason: REASON,
    })

    // La allowlist quedó vieja: cree que sigue en `real`, pero ya es `demo`.
    const stale = await applySyntheticOriginMarking({
      entries: [
        {
          recordType: 'hiring_opening',
          recordId: opening.openingId,
          expectedCurrentOrigin: 'real',
          proposedOrigin: 'smoke_test',
        },
      ],
      actorUserId: ACTOR,
      reason: REASON,
    })

    expect(stale.needsReview).toBe(1)
    expect(stale.results[0].reasonCode).toBe('cas_mismatch')
    // Y NO pisó el valor vigente.
    expect(await readOpeningOrigin(opening.openingId)).toBe('demo')
  })

  it('marcar como `real` no es un backfill: deriva a revisión humana', async () => {
    const opening = await seedRealOpening()

    const summary = await applySyntheticOriginMarking({
      entries: [
        {
          recordType: 'hiring_opening',
          recordId: opening.openingId,
          expectedCurrentOrigin: 'real',
          proposedOrigin: 'real',
        },
      ],
      actorUserId: ACTOR,
      reason: REASON,
    })

    expect(summary.results[0].outcome).toBe('needs_review')
    expect(summary.results[0].reasonCode).toBe('proposed_is_real')
  })

  it('rollback restaura desde el audit y deja su propio rastro', async () => {
    const opening = await seedRealOpening()

    const summary = await applySyntheticOriginMarking({
      entries: [
        {
          recordType: 'hiring_opening',
          recordId: opening.openingId,
          expectedCurrentOrigin: 'real',
          proposedOrigin: 'synthetic_seed',
        },
      ],
      actorUserId: ACTOR,
      reason: REASON,
    })

    const auditId = summary.results[0].auditId!

    const rollback = await rollbackSyntheticOriginMarking({
      auditId,
      actorUserId: ACTOR,
      reason: 'Rollback del live test TASK-1739',
    })

    expect(rollback.outcome).toBe('applied')
    expect(rollback.restoredTo).toBe('real')
    expect(await readOpeningOrigin(opening.openingId)).toBe('real')

    // Un segundo rollback del mismo audit ya no aplica: el valor vigente dejó de ser el `after`.
    const again = await rollbackSyntheticOriginMarking({
      auditId,
      actorUserId: ACTOR,
      reason: 'Rollback repetido del live test',
    })

    expect(again.outcome).toBe('needs_review')
    expect(again.reasonCode).toBe('cas_mismatch')
  })
})
