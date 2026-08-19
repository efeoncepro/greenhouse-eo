import { afterAll, afterEach, describe, expect, it } from 'vitest'

import { getHiringDeskSnapshot } from '@/lib/hiring/desk'
import { createHiringOpening, createTalentDemand } from '@/lib/hiring/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1739 Slice 3 — el desk deja de contar fantasmas, contra PG real.
 *
 * Un unit test con mocks probaría que el parámetro viaja; sólo un live test prueba que la vacante
 * sintética DESAPARECE de la lista y, sobre todo, que los KPIs bajan con ella. Ese segundo punto es
 * el que importa: los totales del desk corren sobre SQL propio, así que si el filtro no viajara
 * también ahí, el desk mostraría una lista filtrada con totales sin filtrar — números que no cuadran,
 * que es peor que no filtrar.
 */

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

describe.skipIf(!hasPgConfig)('TASK-1739 — read path del desk (live PG)', () => {
  const created: { demandIds: string[]; openingIds: string[] } = { demandIds: [], openingIds: [] }
  const originalFlag = process.env.HIRING_SYNTHETIC_DATA_FILTER_ENABLED

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.HIRING_SYNTHETIC_DATA_FILTER_ENABLED
    else process.env.HIRING_SYNTHETIC_DATA_FILTER_ENABLED = originalFlag
  })

  afterAll(async () => {
    if (!hasPgConfig) return

    for (const id of created.openingIds) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, [
        id
      ]).catch(() => undefined)
    }

    for (const id of created.demandIds) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, [
        id
      ]).catch(() => undefined)
    }

    const ids = [...created.openingIds, ...created.demandIds]

    if (ids.length) {
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`,
        [ids]
      ).catch(() => undefined)
    }
  })

  it('la vacante sintética desaparece del desk —lista Y totales— sólo con el flag ON', async () => {
    const demand = await createTalentDemand(
      {
        dataOrigin: 'smoke_test',
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'capacity_gap',
        requestedRole: 'T1739 read-path'
      },
      'user-live-test'
    )

    created.demandIds.push(demand.demandId)

    const opening = await createHiringOpening(
      { dataOrigin: 'smoke_test', demandId: demand.demandId, internalTitle: 'T1739 read-path fantasma' },
      'user-live-test'
    )

    created.openingIds.push(opening.openingId)

    // Los dos snapshots se toman consecutivos y se comparan ENTRE SÍ, nunca contra un total global
    // capturado antes: otros live tests corren en paralelo sobre las mismas tablas y un baseline
    // absoluto haría este test flaky por una razón ajena a lo que prueba.

    // Flag OFF: el fantasma SE VE (nada cambió para el operador todavía).
    process.env.HIRING_SYNTHETIC_DATA_FILTER_ENABLED = 'false'

    const withFlagOff = await getHiringDeskSnapshot({})

    expect(withFlagOff.openings.some(o => o.opening.openingId === opening.openingId)).toBe(true)

    // Flag ON: desaparece de la lista Y arrastra el total con ella, que es el punto —los KPIs corren
    // sobre SQL propio, así que un filtro que no viajara ahí daría lista filtrada con totales sin
    // filtrar: números que no cuadran, peor que no filtrar.
    process.env.HIRING_SYNTHETIC_DATA_FILTER_ENABLED = 'true'

    const withFlagOn = await getHiringDeskSnapshot({})

    expect(withFlagOn.openings.some(o => o.opening.openingId === opening.openingId)).toBe(false)
    expect(withFlagOn.totals.openings).toBeLessThan(withFlagOff.totals.openings)

    // Y el opt-in explícito del caller gana sobre el flag: se puede volver a ver a propósito.
    const withOptIn = await getHiringDeskSnapshot({ includeSynthetic: true })

    expect(withOptIn.openings.some(o => o.opening.openingId === opening.openingId)).toBe(true)
  })
})
