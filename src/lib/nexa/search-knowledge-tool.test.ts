import { afterEach, describe, expect, it, vi } from 'vitest'

import { executeNexaTool, getNexaToolDeclarations } from './nexa-tools'
import type { NexaRuntimeContext } from './nexa-contract'

const internalTenant: NexaRuntimeContext = {
  userId: 'user-agent-e2e-001',
  clientId: '',
  clientName: '',
  tenantType: 'efeonce_internal',
  role: 'efeonce_admin',
  roleCodes: ['efeonce_admin', 'collaborator'],
  routeGroups: ['internal', 'admin'],
  timezone: 'America/Santiago'
}

const clientTenant: NexaRuntimeContext = {
  userId: 'user-agent-client-001',
  clientId: 'client-x',
  clientName: 'Client X',
  tenantType: 'client',
  role: 'client_executive',
  roleCodes: ['client_executive'],
  routeGroups: ['client'],
  timezone: 'America/Santiago'
}

const hasSearchKnowledge = (tenant: NexaRuntimeContext) =>
  getNexaToolDeclarations(tenant).some(declaration => declaration.name === 'search_knowledge')

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('search_knowledge tool — availability gate (TASK-1085)', () => {
  it('is hidden when the flag is OFF', () => {
    vi.stubEnv('NEXA_KNOWLEDGE_RETRIEVAL_ENABLED', '')
    vi.stubEnv('NEXT_PUBLIC_NEXA_KNOWLEDGE_RETRIEVAL_ENABLED', '')

    expect(hasSearchKnowledge(internalTenant)).toBe(false)
  })

  it('appears for internal/admin when the flag is ON', () => {
    vi.stubEnv('NEXA_KNOWLEDGE_RETRIEVAL_ENABLED', 'true')

    expect(hasSearchKnowledge(internalTenant)).toBe(true)
  })

  it('stays hidden for a client tenant even with the flag ON (no agentic grant)', () => {
    vi.stubEnv('NEXA_KNOWLEDGE_RETRIEVAL_ENABLED', 'true')

    expect(hasSearchKnowledge(clientTenant)).toBe(false)
  })
})

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// Live: el tool mapea el packet real a NexaToolResult (raw.packet) contra el corpus
// TASK-1082. Skipped en CI (no PG) — local-only smoke.
describe.skipIf(!hasPgConfig)('search_knowledge tool — execute (live PG, TASK-1085)', () => {
  it('returns the packet in raw + grounding summary with citations', async () => {
    vi.stubEnv('NEXA_KNOWLEDGE_RETRIEVAL_ENABLED', 'true')

    const invocation = await executeNexaTool({
      toolCallId: 't1',
      toolName: 'search_knowledge',
      args: { query: 'roles y acceso en Greenhouse' },
      context: internalTenant
    })

    expect(invocation.result.available).toBe(true)
    const packet = (invocation.result.raw as { packet?: { contractVersion?: string; chunks?: unknown[] } }).packet

    expect(packet?.contractVersion).toBe('knowledge-search.v1')
    expect((packet?.chunks ?? []).length).toBeGreaterThan(0)
    expect(invocation.result.summary.toLowerCase()).toContain('cita')
    expect(invocation.result.metrics.some(m => m.label === 'Confianza retrieval')).toBe(true)
  })

  it('agentic mode: Nexa receives the agent_allowed payroll doc; the agent_excluded manual is filtered', async () => {
    // TASK-1140 (operador, opción A): el doc FUNCIONAL de nómina (agent_allowed) SÍ
    // llega a Nexa en agentic y se cita; el MANUAL legacy (agent_excluded) NUNCA
    // llega y se cuenta como denegado.
    vi.stubEnv('NEXA_KNOWLEDGE_RETRIEVAL_ENABLED', 'true')

    const invocation = await executeNexaTool({
      toolCallId: 't2',
      toolName: 'search_knowledge',
      args: { query: 'cómo creo un período de nómina' },
      context: internalTenant
    })

    const packet = (
      invocation.result.raw as {
        packet?: { chunks?: { title: string }[]; deniedOrFilteredCount?: number }
      }
    ).packet

    const titles = (packet?.chunks ?? []).map(c => c.title.toLowerCase())

    expect(titles.some(t => t.includes('nómina') || t.includes('nomina'))).toBe(true)
    expect(packet?.deniedOrFilteredCount ?? 0).toBeGreaterThanOrEqual(1)
  })

  it('empty query degrades honestly (available=false)', async () => {
    vi.stubEnv('NEXA_KNOWLEDGE_RETRIEVAL_ENABLED', 'true')

    const invocation = await executeNexaTool({
      toolCallId: 't3',
      toolName: 'search_knowledge',
      args: { query: '   ' },
      context: internalTenant
    })

    expect(invocation.result.available).toBe(false)
  })
})
