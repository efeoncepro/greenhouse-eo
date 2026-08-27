import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1709 Slice 1 — tier `prospect`: tope duro POR DIAGNÓSTICO.
 *
 * Cubre: resolución de la org canónica de Efeonce (server-side, por public_id),
 * min(ceiling, presupuesto restante del mes), cost_blocked cuando el forecast no cabe,
 * y que un assignment JAMÁS puede declarar tier `prospect` (no está en VALID_TIERS).
 * PG mockeado (routing por SQL, patrón del test de entitlement TASK-1301).
 */

vi.mock('server-only', () => ({}))

const state = {
  canonicalOrgId: 'org-efeonce' as string | null,
  assignment: null as {
    assignment_id: string
    status: string
    metadata_json: Record<string, unknown> | null
    expires_at: string | null
  } | null,
  spendUsedUsd: 0
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string) => {
    if (sql.includes('greenhouse_core.organizations')) {
      return state.canonicalOrgId ? [{ organization_id: state.canonicalOrgId }] : []
    }

    if (sql.includes('audit_runs_used')) {
      return [
        {
          audit_runs_used: 0,
          spend_used_usd: state.spendUsedUsd,
          period_reset_at: '2026-09-01T00:00:00.000Z'
        }
      ]
    }

    if (sql.includes('module_assignments')) {
      return state.assignment ? [state.assignment] : []
    }

    return []
  }
}))

import {
  EFEONCE_CANONICAL_ORG_PUBLIC_ID,
  enforceProspectDiagnosticBudget,
  resolveProspectDiagnosticCeilingUsd,
  resolveProspectDiagnosticDailyActorCap,
  resolveProspectDiagnosticEntitlement
} from '../entitlement'

const ENV = {} as NodeJS.ProcessEnv

const contractedAssignment = () => ({
  assignment_id: 'cpma-efeonce',
  status: 'active',
  metadata_json: { seo_tier: 'contracted' },
  expires_at: null
})

beforeEach(() => {
  state.canonicalOrgId = 'org-efeonce'
  state.assignment = contractedAssignment()
  state.spendUsedUsd = 0
})

describe('knobs de configuración', () => {
  it('ceiling default USD 1.00, overridable por env', () => {
    expect(resolveProspectDiagnosticCeilingUsd(ENV)).toBe(1)
    expect(
      resolveProspectDiagnosticCeilingUsd({ GROWTH_SEO_PROSPECT_DIAGNOSTIC_CEILING_USD: '0.5' } as unknown as NodeJS.ProcessEnv)
    ).toBe(0.5)
  })

  it('tope diario por actor default 10', () => {
    expect(resolveProspectDiagnosticDailyActorCap(ENV)).toBe(10)
    expect(
      resolveProspectDiagnosticDailyActorCap({
        GROWTH_SEO_PROSPECT_DIAGNOSTIC_DAILY_ACTOR_CAP: '3'
      } as unknown as NodeJS.ProcessEnv)
    ).toBe(3)
  })
})

describe('resolveProspectDiagnosticEntitlement', () => {
  it('resuelve la org canónica por public_id (nunca un UUID literal)', async () => {
    expect(EFEONCE_CANONICAL_ORG_PUBLIC_ID).toBe('EO-ORG-0007')

    const e = await resolveProspectDiagnosticEntitlement(ENV)

    expect(e.tier).toBe('prospect')
    expect(e.acquisitionOrganizationId).toBe('org-efeonce')
  })

  it('NO exige module_assignments para el sujeto: el budget sale del entitlement de Efeonce', async () => {
    // Efeonce contracted (USD 50/mes), 10 gastados → restante 40; ceiling 1 → efectivo 1.
    state.spendUsedUsd = 10

    const e = await resolveProspectDiagnosticEntitlement(ENV)

    expect(e.efeonceBudgetRemainingUsd).toBe(40)
    expect(e.effectiveBudgetUsd).toBe(1)
    expect(e.blockedReason).toBeNull()
  })

  it('el presupuesto efectivo es min(ceiling, restante del mes)', async () => {
    state.spendUsedUsd = 49.7 // restante 0.30 < ceiling 1

    const e = await resolveProspectDiagnosticEntitlement(ENV)

    expect(e.effectiveBudgetUsd).toBeCloseTo(0.3, 6)
  })

  it('sin org canónica → no_entitlement (jamás un fallback silencioso)', async () => {
    state.canonicalOrgId = null

    const e = await resolveProspectDiagnosticEntitlement(ENV)

    expect(e.blockedReason).toBe('no_entitlement')
    expect(e.effectiveBudgetUsd).toBe(0)
  })

  it('Efeonce sin módulo SEO vigente → no_entitlement', async () => {
    state.assignment = null

    const e = await resolveProspectDiagnosticEntitlement(ENV)

    expect(e.blockedReason).toBe('no_entitlement')
  })

  it('presupuesto mensual de Efeonce agotado → budget_exhausted', async () => {
    state.spendUsedUsd = 50

    const e = await resolveProspectDiagnosticEntitlement(ENV)

    expect(e.blockedReason).toBe('budget_exhausted')
  })
})

describe('enforceProspectDiagnosticBudget', () => {
  it('forecast que cabe en el tope → allowed', async () => {
    const gate = await enforceProspectDiagnosticBudget(0.25, ENV)

    expect(gate.allowed).toBe(true)
    expect(gate.acquisitionOrganizationId).toBe('org-efeonce')
    expect(gate.blockedReason).toBeNull()
  })

  it('forecast sobre el tope → cost_blocked (estado declarado, no un throw)', async () => {
    const gate = await enforceProspectDiagnosticBudget(1.5, ENV)

    expect(gate.allowed).toBe(false)
    expect(gate.blockedReason).toBe('cost_blocked')
  })

  it('el tope se valida contra el CONJUNTO: restante del mes < ceiling manda', async () => {
    state.spendUsedUsd = 49.9 // restante 0.10

    const gate = await enforceProspectDiagnosticBudget(0.25, ENV)

    expect(gate.allowed).toBe(false)
    expect(gate.blockedReason).toBe('cost_blocked')
  })

  it('forecast no-finito o negativo → cost_blocked defensivo', async () => {
    expect((await enforceProspectDiagnosticBudget(Number.NaN, ENV)).blockedReason).toBe('cost_blocked')
    expect((await enforceProspectDiagnosticBudget(-1, ENV)).blockedReason).toBe('cost_blocked')
  })
})

describe('prospect NUNCA sale de un assignment', () => {
  it('un assignment que declare seo_tier=prospect cae al fallback conservador', async () => {
    state.assignment = {
      assignment_id: 'cpma-raro',
      status: 'active',
      metadata_json: { seo_tier: 'prospect' },
      expires_at: null
    }

    const { resolveSeoEntitlement } = await import('../entitlement')
    const e = await resolveSeoEntitlement('org-raro', ENV)

    // `prospect` no está en VALID_TIERS: el resolver per-org lo trata como desconocido.
    expect(e.tier).toBe('trial')
  })
})
