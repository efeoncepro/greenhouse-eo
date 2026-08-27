import { describe, expect, it } from 'vitest'

import { readOpeningCapacityStatus } from './readers'

/**
 * TASK-1762 Slice 1 — verificación del reader contra PG real.
 *
 * Es un live test porque lo que se prueba es SQL: el predicado derivado de `activeProcessPredicate`,
 * el `FILTER` de cupos ocupados y el `LEFT JOIN` que sólo une la política vigente. Un mock ejercita
 * el TypeScript y deja el SQL sin tocar — que es exactamente donde viven los errores de esta capa.
 *
 * READ-ONLY a propósito: no crea fixtures, así que no necesita declarar `dataOrigin` ni deja
 * residuo. Y se ancla por `openingId` en vez de comparar conteos globales: la base es compartida y
 * corren tests en paralelo, así que un `COUNT(*)` entre dos instantes falla por trabajo ajeno
 * haciendo lo correcto.
 */

const hasDbCredentials = Boolean(
  process.env.GREENHOUSE_POSTGRES_DATABASE && process.env.GREENHOUSE_POSTGRES_USER
)

describe.runIf(hasDbCredentials)('readOpeningCapacityStatus (live)', () => {
  it('devuelve null para una vacante inexistente en vez de inventar un estado', async () => {
    expect(await readOpeningCapacityStatus('opng-no-existe-task-1762')).toBeNull()
  })

  it('una vacante sin política vigente sale `unmanaged` y NUNCA reporta capacidad llena', async () => {
    const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

    const anyOpening = await runGreenhousePostgresQuery<{ opening_id: string }>(
      `SELECT o.opening_id
         FROM greenhouse_hiring.hiring_opening o
         LEFT JOIN greenhouse_hiring.hiring_opening_capacity c
                ON c.opening_id = o.opening_id AND c.retired_at IS NULL
        WHERE c.opening_id IS NULL
        LIMIT 1`
    )

    const openingId = anyOpening[0]?.opening_id

    if (!openingId) return

    const status = await readOpeningCapacityStatus(openingId)

    expect(status).not.toBeNull()
    expect(status?.state).toBe('unmanaged')
    expect(status?.policy).toBeNull()

    // El invariante que más importa: sin opt-in no hay automatización que ofrecer. Reportar
    // `capacityFilled` en una vacante `unmanaged` invitaría a un consumidor a ofrecer el cierre
    // de una cohorte que nadie declaró gobernada.
    expect(status?.capacityFilled).toBe(false)
  })

  it('deriva los cupos sin contador paralelo y nunca reporta un remanente negativo', async () => {
    const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

    const opening = await runGreenhousePostgresQuery<{ opening_id: string }>(
      `SELECT opening_id FROM greenhouse_hiring.hiring_opening ORDER BY created_at LIMIT 1`
    )

    const openingId = opening[0]?.opening_id

    if (!openingId) return

    const status = await readOpeningCapacityStatus(openingId)

    expect(status).not.toBeNull()
    expect(status?.targetSeats).toBeGreaterThan(0)
    expect(status?.occupiedSeats).toBeGreaterThanOrEqual(0)
    expect(status?.remainingSeats).toBeGreaterThanOrEqual(0)
    expect(status?.activeApplications).toBeGreaterThanOrEqual(0)
  })
})
