import { describe, expect, it } from 'vitest'

import { confirmOpeningCapacityClosure } from './confirm'
import { previewOpeningCapacityClosure } from './preview'

/**
 * TASK-1762 Slice 2 — verificación del preview/confirm contra PG real.
 *
 * Read-only en el camino feliz: los casos que ejercita son los que RECHAZAN, así que no crean runs
 * ni tocan candidaturas. Se ancla por id, nunca por conteos globales: la base es compartida y hay
 * tests en paralelo, así que un COUNT entre dos instantes falla por trabajo ajeno.
 */

const hasDbCredentials = Boolean(
  process.env.GREENHOUSE_POSTGRES_DATABASE && process.env.GREENHOUSE_POSTGRES_USER
)

describe.runIf(hasDbCredentials)('preview/confirm de cierre por capacidad (live)', () => {
  it('el preview agrupa la cohorte y produce un digest de 64 hex', async () => {
    const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

    const openings = await runGreenhousePostgresQuery<{ opening_id: string }>(
      `SELECT opening_id FROM greenhouse_hiring.hiring_opening ORDER BY created_at LIMIT 1`
    )

    const openingId = openings[0]?.opening_id

    if (!openingId) return

    const preview = await previewOpeningCapacityClosure(openingId)

    expect(preview).not.toBeNull()
    expect(preview?.effectDigest).toMatch(/^[0-9a-f]{64}$/)

    // Las tres categorías son disjuntas: nadie puede entrar dos veces al mismo cierre.
    const ids = [...preview!.eligible, ...preview!.paused, ...preview!.backup].map(m => m.applicationId)

    expect(new Set(ids).size).toBe(ids.length)

    // Nadie con desenlace terminal entra a la cohorte. Es el invariante que impide re-cerrar a
    // quien ya fue decidido —y volver a escribirle.
    for (const m of preview!.eligible) expect(m.stage).not.toBe('closed')
  })

  it('rechaza confirmar con un digest vencido, sin crear run', async () => {
    const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

    const openings = await runGreenhousePostgresQuery<{ opening_id: string }>(
      `SELECT opening_id FROM greenhouse_hiring.hiring_opening ORDER BY created_at LIMIT 1`
    )

    const openingId = openings[0]?.opening_id

    if (!openingId) return

    await expect(
      confirmOpeningCapacityClosure({
        openingId,
        effectDigest: 'f'.repeat(64),
        idempotencyKey: 'live-test-digest-vencido',
        confirmedByUserId: 'live-test-task-1762'
      })
    ).rejects.toMatchObject({
      // Puede fallar por cupos disponibles ANTES de llegar al digest: ambos son rechazos correctos
      // y ninguno crea run. Lo que se verifica es que NO pasa.
      code: expect.stringMatching(/hiring_opening_capacity_not_filled|hiring_opening_closure_preview_stale/)
    })

    const runs = await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT count(*) AS n FROM greenhouse_hiring.hiring_opening_closure_run
        WHERE opening_id = $1 AND idempotency_key = 'live-test-digest-vencido'`,
      [openingId]
    )

    expect(Number(runs[0]?.n ?? 0)).toBe(0)
  })

  it('exige clave de idempotencia utilizable', async () => {
    await expect(
      confirmOpeningCapacityClosure({
        openingId: 'opng-cualquiera',
        effectDigest: 'a'.repeat(64),
        idempotencyKey: 'corta',
        confirmedByUserId: 'live-test-task-1762'
      })
    ).rejects.toMatchObject({ code: 'hiring_opening_closure_idempotency_required' })
  })
})
