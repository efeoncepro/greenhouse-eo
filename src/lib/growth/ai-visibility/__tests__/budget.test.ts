import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1696 — `resolveAeoBudget`: las dos monedas por separado y el shadow que no bloquea.
 *
 * El aserto que más importa es el del DOBLE CONTEO: el estimador del grader devuelve, para
 * `google_ai_overview`, el costo real que DataForSEO cobró, así que `estimated_cost_usd` ya
 * contiene los dólares que el ledger ahora también guarda. Si alguien "simplifica" la query
 * sumando los dos lados crudos, el presupuesto se agota a la mitad y en silencio.
 */

const queries: Array<{ sql: string; params: unknown[] }> = []
let usageRow: Record<string, unknown> = {}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[]) => {
    queries.push({ sql, params })

    return [usageRow]
  }
}))

let entitlement: Record<string, unknown> = {}

vi.mock('../entitlement', () => ({
  resolveAeoEntitlement: async () => entitlement
}))

const { resolveAeoBudget } = await import('../budget')

beforeEach(() => {
  queries.length = 0
  usageRow = {
    invoiced_usd: 0,
    estimated_llm_usd: 0,
    period_reset_at: '2026-09-01T00:00:00.000Z'
  }
  entitlement = { tier: 'contracted', periodResetAt: '2026-09-01T00:00:00.000Z' }
})

describe('resolveAeoBudget (TASK-1696)', () => {
  it('reporta facturado y estimado por separado, además del total', async () => {
    usageRow = { ...usageRow, invoiced_usd: 1.25, estimated_llm_usd: 3.5 }

    const state = await resolveAeoBudget('org-1')

    expect(state.invoicedUsedUsd).toBe(1.25)
    expect(state.estimatedUsedUsd).toBe(3.5)
    expect(state.budgetUsedUsd).toBe(4.75)
    // Nunca una cifra opaca: el total existe, pero sus componentes viajan siempre con él.
    expect(state).toMatchObject({ invoicedUsedUsd: 1.25, estimatedUsedUsd: 3.5 })
  })

  it('la query resta la porción DataForSEO del estimado (anti doble conteo)', async () => {
    await resolveAeoBudget('org-1')

    const sql = queries[0]?.sql ?? ''

    // Si esto falla: revisá si alguien quitó la resta. `estimated_cost_usd` INCLUYE el costo real
    // de DataForSEO para las observaciones de AI Mode, y esos mismos dólares están en el ledger.
    expect(sql).toContain("o.provider = 'google_ai_overview'")
    expect(sql).toContain('dataforseo_cost_usd')
    expect(sql).toMatch(/SUM\(estimated_cost_usd\) FROM month_runs\), 0\) - \(SELECT usd FROM purchased\)/)
  })

  it('el lado facturado sólo mira consumer=aeo y cost_basis=invoiced', async () => {
    await resolveAeoBudget('org-1')

    const sql = queries[0]?.sql ?? ''

    expect(sql).toContain("sp.consumer = 'aeo'")
    expect(sql).toContain("sp.cost_basis = 'invoiced'")
  })

  it('excluye los runs smoke: son ruido de plataforma, no consumo del cliente', async () => {
    await resolveAeoBudget('org-1')

    expect(queries[0]?.sql ?? '').toContain("r.run_kind <> 'smoke'")
  })

  it('wouldBlock queda en true cuando el consumo agota el tope, con enforce APAGADO', async () => {
    usageRow = { ...usageRow, invoiced_usd: 40, estimated_llm_usd: 30 }

    const state = await resolveAeoBudget('org-1', {} as NodeJS.ProcessEnv)

    expect(state.wouldBlock).toBe(true)
    // Éste es el contrato del shadow: se sabe que habría bloqueado, y no bloquea.
    expect(state.enforced).toBe(false)
    expect(state.budgetRemainingUsd).toBe(0)
  })

  it('enforce sólo se enciende con LAS DOS banderas', async () => {
    const soloEnforced = await resolveAeoBudget('org-1', {
      GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED: 'true'
    } as unknown as NodeJS.ProcessEnv)

    // Prender el enforce sin el shadow no hace nada: sin cómputo no hay qué exigir.
    expect(soloEnforced.enforced).toBe(false)

    const ambas = await resolveAeoBudget('org-1', {
      GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED: 'true',
      GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED: 'true'
    } as unknown as NodeJS.ProcessEnv)

    expect(ambas.enforced).toBe(true)
  })

  it('una organización sin módulo no reporta sobregiro: eso lo decide el entitlement', async () => {
    entitlement = { tier: null, periodResetAt: '2026-09-01T00:00:00.000Z' }

    const state = await resolveAeoBudget('org-sin-modulo')

    expect(state.budgetCapUsd).toBe(0)
    // Cap 0 con consumo 0 daría `remaining <= 0` y acusaría sobregiro donde sólo hay una
    // organización sin contratar — la señal se llenaría de falsos positivos.
    expect(state.wouldBlock).toBe(false)
  })
})
