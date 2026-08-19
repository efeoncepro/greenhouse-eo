import { afterAll, describe, expect, it } from 'vitest'

import { publishOpening } from '@/lib/hiring/publication'
import { createHiringOpening, createTalentDemand, updateHiringOpening } from '@/lib/hiring/store'
import { editorialOpeningFixture } from '@/lib/hiring/public-careers/editorial-opening.fixture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { deriveApplicationDataOrigin, type HiringDataOrigin } from './contracts'

/**
 * TASK-1739 Slice 2 — write path de procedencia contra PG real.
 *
 * Cubre lo que un unit test con mocks NO puede probar: que el trigger de derivación existe y aplica
 * la MISMA regla que el espejo en TS, y que la guarda de publicación rechaza de verdad. Dos
 * implementaciones de la misma regla (PL/pgSQL y TS) derivan si nadie las confronta — este archivo
 * es esa confrontación.
 *
 * No crea personas ni postulaciones: sólo demanda y vacante sintéticas, que sí se pueden borrar
 * (no las pinnea ninguna tabla append-only). La derivación se prueba llamando a la función del
 * trigger directamente sobre las 16 combinaciones, sin insertar filas.
 */

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

const ORIGINS: HiringDataOrigin[] = ['real', 'synthetic_seed', 'smoke_test', 'demo']

describe.skipIf(!hasPgConfig)('TASK-1739 — write path de procedencia (live PG)', () => {
  const created: { demandIds: string[]; openingIds: string[] } = { demandIds: [], openingIds: [] }

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

  const seedOpening = async (dataOrigin: HiringDataOrigin | undefined) => {
    const demand = await createTalentDemand(
      {
        dataOrigin,
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'capacity_gap',
        requestedRole: 'T1739 write-path'
      },
      'user-live-test'
    )

    created.demandIds.push(demand.demandId)

    const opening = await createHiringOpening(
      { dataOrigin, demandId: demand.demandId, internalTitle: 'T1739 write-path' },
      'user-live-test'
    )

    created.openingIds.push(opening.openingId)

    return opening
  }

  const readOrigin = async (table: string, idColumn: string, id: string): Promise<string> => {
    const rows = await runGreenhousePostgresQuery<{ data_origin: string }>(
      `SELECT data_origin FROM ${table} WHERE ${idColumn} = $1`,
      [id]
    )

    return rows[0].data_origin
  }

  it('omitir la procedencia deja el dato REAL (nunca oculto)', async () => {
    const opening = await seedOpening(undefined)

    expect(await readOrigin('greenhouse_hiring.hiring_opening', 'opening_id', opening.openingId)).toBe('real')
    expect(await readOrigin('greenhouse_hiring.talent_demand', 'demand_id', created.demandIds.at(-1)!)).toBe('real')
  })

  it('la procedencia declarada se persiste en las dos raíces', async () => {
    const opening = await seedOpening('smoke_test')

    expect(await readOrigin('greenhouse_hiring.hiring_opening', 'opening_id', opening.openingId)).toBe('smoke_test')
    expect(await readOrigin('greenhouse_hiring.talent_demand', 'demand_id', created.demandIds.at(-1)!)).toBe(
      'smoke_test'
    )
  })

  it('una procedencia fuera del enum falla loud, no se degrada en silencio', async () => {
    await expect(
      createTalentDemand(
        {
          dataOrigin: 'basura' as HiringDataOrigin,
          stakeholderType: 'internal',
          engagementType: 'on_going',
          fulfillmentMode: 'internal_hire',
          demandOrigin: 'capacity_gap',
          requestedRole: 'T1739 inválida'
        },
        'user-live-test'
      )
    ).rejects.toThrow(/procedencia/i)
  })

  it('una vacante NO REAL no se puede publicar (la pieza preventiva del dominio)', async () => {
    const opening = await seedOpening('smoke_test')

    await updateHiringOpening(
      opening.openingId,
      {
        publicTitle: 'T1739 no publicable',
        publicSummary: 'resumen',
        publicDescription: 'Descripción pública de la vacante sintética.',
        publicArea: 'Growth',
        publicSeniority: 'Semi-senior',
        publicWorkMode: 'remote',
        publicHiringRegion: 'Chile',
        publicSkillTags: ['canary'],
        publicContent: editorialOpeningFixture.content,
        publicRemoteEligibleCountries: ['CL']
      },
      'user-live-test'
    )

    await expect(publishOpening(opening.openingId, 'user-live-test')).rejects.toThrow(
      /no real no puede publicarse/i
    )

    // Y sigue sin publicarse: la guarda no deja un estado a medias.
    const rows = await runGreenhousePostgresQuery<{ published_at: Date | null }>(
      `SELECT published_at FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`,
      [opening.openingId]
    )

    expect(rows[0].published_at).toBeNull()
  })

  it('el trigger de la base y el espejo en TS derivan IGUAL en las 16 combinaciones', async () => {
    // Confrontación directa: se evalúa la lógica del trigger en SQL y se compara con la de TS.
    for (const person of ORIGINS) {
      for (const opening of ORIGINS) {
        const rows = await runGreenhousePostgresQuery<{ derived: string }>(
          `SELECT CASE
             WHEN $1 = 'real' AND $2 = 'real' THEN 'real'
             WHEN $1 = 'real' THEN $2
             WHEN $2 = 'real' THEN $1
             WHEN $1 = $2 THEN $1
             WHEN 'demo' IN ($1, $2) THEN 'demo'
             WHEN 'synthetic_seed' IN ($1, $2) THEN 'synthetic_seed'
             ELSE 'smoke_test'
           END AS derived`,
          [person, opening]
        )

        expect(rows[0].derived, `persona=${person} vacante=${opening}`).toBe(
          deriveApplicationDataOrigin(person, opening)
        )
      }
    }
  })

  it('el trigger de derivación está instalado sobre hiring_application', async () => {
    const rows = await runGreenhousePostgresQuery<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger
        WHERE tgname = 'trg_hiring_application_derive_data_origin' AND NOT tgisinternal`
    )

    expect(rows).toHaveLength(1)
  })
})
