import { describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  ASSESSMENT_ASSIGNMENT_TRIGGERS,
  OPENING_ASSESSMENT_TRIGGER_STAGES,
} from '@/types/hiring-assessment-policy'
import { HIRING_APPLICATION_STAGES } from '@/types/hiring'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

/**
 * TASK-1754 — el enum de TypeScript y el `CHECK` de PostgreSQL son el MISMO contrato escrito
 * dos veces, y hasta hoy nadie los comparaba.
 *
 * Dos reglas de construcción, y las dos son load-bearing:
 *
 * 1. **Los dos lados se DERIVAN; ninguno se escribe a mano.** Un test que enumerara las etapas
 *    esperadas no probaría la paridad: probaría que el snapshot con que se escribió sigue igual,
 *    y pasaría verde con el enum y la base desincronizados entre sí mientras ambos coincidieran
 *    con la lista del test. Acá el lado TS sale del enum y el lado SQL se parsea del
 *    `pg_get_constraintdef` vigente.
 * 2. **Corre contra PostgreSQL real, no contra un mock.** El `CHECK` es la única autoridad sobre
 *    lo que la base acepta; un mock repetiría la creencia del autor. Sin PG configurado se salta,
 *    porque un test que finge haber verificado es peor que uno ausente.
 *
 * Es read-only: no crea filas, no deja residuo, no necesita teardown.
 *
 * Cuando el Slice F retire literales, este test es lo que obliga a que el enum y el `CHECK` se
 * muevan en el MISMO release — que es exactamente el orden que se pagó caro el 2026-08-22, cuando
 * un contract del enum de desenlaces se aplicó contra una producción que todavía escribía el
 * literal retirado.
 */
const literalsOfCheck = async (constraintName: string): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<{ def: string }>(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`,
    [constraintName],
  )

  expect(rows, `la constraint "${constraintName}" no existe en la base`).toHaveLength(1)

  // `CHECK ((stage = ANY (ARRAY['sourced'::text, ...])))` → los literales entre comillas simples.
  return [...rows[0].def.matchAll(/'([^']+)'::text/g)].map(match => match[1]).sort()
}

describe.skipIf(!hasPgConfig)('paridad enum TS ↔ CHECK PostgreSQL (TASK-1754)', () => {
  it('hiring_application.stage acepta exactamente las etapas del enum del dominio', async () => {
    expect(await literalsOfCheck('hiring_application_stage_check')).toEqual([...HIRING_APPLICATION_STAGES].sort())
  })

  it('hiring_opening_assessment_policy.trigger_stage acepta exactamente los disparadores del enum', async () => {
    expect(await literalsOfCheck('hiring_opening_assessment_policy_trigger_stage_check')).toEqual(
      [...OPENING_ASSESSMENT_TRIGGER_STAGES].sort(),
    )
  })

  it('hiring_assessment_assignment.trigger_stage acepta exactamente los triggers del ledger', async () => {
    expect(await literalsOfCheck('hiring_assessment_assignment_trigger_stage_check')).toEqual(
      [...ASSESSMENT_ASSIGNMENT_TRIGGERS].sort(),
    )
  })

  it('ninguna fila vive en una etapa que el enum del dominio ya no declara', async () => {
    // La paridad de arriba compara CONTRATOS. Ésta compara DATOS: un `CHECK` sigue admitiendo
    // los literales viejos durante todo el expand, así que las filas pueden quedarse atrás sin
    // que ninguna constraint se queje. Es el readback del Slice B, fijado como test.
    const rows = await runGreenhousePostgresQuery<{ stage: string; n: string }>(
      `SELECT stage, COUNT(*)::text AS n
       FROM greenhouse_hiring.hiring_application
       WHERE stage <> ALL($1::text[])
       GROUP BY stage
       ORDER BY stage`,
      [[...HIRING_APPLICATION_STAGES]],
    )

    expect(rows, `hay filas en etapas fuera del enum: ${rows.map(r => `${r.stage}=${r.n}`).join(', ')}`).toEqual([])
  })
})
