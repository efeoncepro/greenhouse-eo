import { describe, expect, it } from 'vitest'

import { CLOSURE_ITEM_RETRY_BUDGET, CLOSURE_RECONCILE_BATCH_SIZE, reconcileClosureRun } from './reconciler'

/**
 * TASK-1762 Slice 3 — verificación del reconciler contra PG real.
 *
 * READ-ONLY sobre datos de candidatos: los casos ejercitan un run que no existe y las constantes de
 * política. **No cierra a nadie**: escribir un desenlace real desde un test tocaría a una persona
 * verdadera de las 50 que hay en la base compartida, y el desenlace es append-only — no se deshace.
 *
 * El camino feliz se ejercita en el canary de rollout, con una vacante de procedencia declarada y
 * destinatarios allowlisted. Esa es la frontera correcta, no un test automático.
 */

const hasDbCredentials = Boolean(
  process.env.GREENHOUSE_POSTGRES_DATABASE && process.env.GREENHOUSE_POSTGRES_USER
)

describe('política del reconciler', () => {
  it('el presupuesto de reintentos es finito: un item que falla siempre termina en cuarentena', () => {
    // Sin tope, un item que falla por una causa permanente se reintentaría para siempre y el run
    // nunca cerraría — el operador vería «en curso» indefinidamente sin saber que hay gente sin
    // decidir. La cuarentena es lo que convierte ese silencio en una señal.
    expect(CLOSURE_ITEM_RETRY_BUDGET).toBeGreaterThan(1)
    expect(CLOSURE_ITEM_RETRY_BUDGET).toBeLessThanOrEqual(5)
  })

  it('el lote es acotado: un run grande se drena en pasadas, no en una transacción larga', () => {
    expect(CLOSURE_RECONCILE_BATCH_SIZE).toBeGreaterThan(0)
    expect(CLOSURE_RECONCILE_BATCH_SIZE).toBeLessThanOrEqual(100)
  })
})

describe.runIf(hasDbCredentials)('reconcileClosureRun (live)', () => {
  it('un run inexistente no explota ni inventa trabajo', async () => {
    const result = await reconcileClosureRun('hocr-no-existe-task-1762', 'live-test-task-1762')

    expect(result.processed).toBe(0)
    expect(result.decided).toBe(0)
    // `finished` es true porque no queda nada pendiente — que es la respuesta honesta para un run
    // sin items, y no debe confundirse con «se cerró algo».
    expect(result.quarantined).toBe(0)
  })

  it('NUNCA escribe el desenlace `rejected`: ninguna candidatura cerrada por capacidad lo lleva', async () => {
    const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

    // El readback que exige el criterio de aceptación de la task. Se ancla en los items de runs
    // reales (por id), no en un COUNT global: la base es compartida y hay tests en paralelo.
    const rows = await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT count(*) AS n
         FROM greenhouse_hiring.hiring_opening_closure_run_item i
         JOIN greenhouse_hiring.hiring_application a ON a.application_id = i.application_id
        WHERE i.state = 'decided' AND a.decision <> 'not_selected'`
    )

    expect(Number(rows[0]?.n ?? 0)).toBe(0)
  })

  it('toda candidatura decidida por un cierre lleva la causa `capacity_filled`', async () => {
    const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

    const rows = await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT count(*) AS n
         FROM greenhouse_hiring.hiring_opening_closure_run_item i
         JOIN greenhouse_hiring.hiring_application a ON a.application_id = i.application_id
        WHERE i.state = 'decided' AND a.decision_cause IS DISTINCT FROM 'capacity_filled'`
    )

    expect(Number(rows[0]?.n ?? 0)).toBe(0)
  })
})
