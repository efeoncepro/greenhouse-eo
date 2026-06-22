import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NexaRuntimeContext } from './nexa-contract'

// El tool es un wrapper fino: delega en el primitive canónico readMemberIcoProfileForSubject
// (un primitive, muchos consumers). Acá validamos el mapeo subject + presentación + gaps honestos.
const readMemberIcoProfileForSubject = vi.fn()

vi.mock('@/lib/people/person-activity-access', () => ({
  readMemberIcoProfileForSubject: (...args: unknown[]) => readMemberIcoProfileForSubject(...args)
}))

import { executeNexaTool, getNexaToolDeclarations } from './nexa-tools'

const internalTenant = (overrides: Partial<NexaRuntimeContext> = {}): NexaRuntimeContext => ({
  userId: 'user-1',
  clientId: '',
  clientName: '',
  tenantType: 'efeonce_internal',
  role: 'efeonce_admin',
  roleCodes: ['efeonce_admin'],
  routeGroups: ['internal'],
  timezone: 'America/Santiago',
  memberId: 'member-1',
  ...overrides
})

const clientTenant = (): NexaRuntimeContext => ({
  userId: 'user-c',
  clientId: 'client-1',
  clientName: 'Cliente',
  tenantType: 'client',
  role: 'client_executive',
  roleCodes: ['client_executive'],
  routeGroups: ['client'],
  timezone: 'America/Santiago'
})

const profile = (overrides: Record<string, unknown> = {}) => ({
  memberId: 'member-9',
  hasData: true,
  current: { periodYear: 2026, periodMonth: 6, otdPct: 88, rpaAvg: 72, ftrPct: 80 },
  trend: [{}, {}],
  health: 'green',
  ...overrides
})

const exec = (args: Record<string, unknown>, tenant: NexaRuntimeContext) =>
  executeNexaTool({ toolCallId: 'call-1', toolName: 'get_member_performance', args, context: tenant })

beforeEach(() => {
  readMemberIcoProfileForSubject.mockReset()
})

describe('get_member_performance tool', () => {
  it('no se ofrece a tenants cliente (isAvailable internal-only)', () => {
    const names = getNexaToolDeclarations(clientTenant()).map(declaration => declaration.name)

    expect(names).not.toContain('get_member_performance')
  })

  it('se ofrece a tenants internos', () => {
    const names = getNexaToolDeclarations(internalTenant()).map(declaration => declaration.name)

    expect(names).toContain('get_member_performance')
  })

  it('cliente que igual lo invoca → no disponible (no delega)', async () => {
    const invocation = await exec({ person: 'Daniela' }, clientTenant())

    expect(invocation.result.available).toBe(false)
    expect(readMemberIcoProfileForSubject).not.toHaveBeenCalled()
  })

  it('falta el argumento person → no disponible', async () => {
    const invocation = await exec({ person: '  ' }, internalTenant())

    expect(invocation.result.available).toBe(false)
    expect(readMemberIcoProfileForSubject).not.toHaveBeenCalled()
  })

  it('mapea el NexaRuntimeContext al subject neutral y delega', async () => {
    readMemberIcoProfileForSubject.mockResolvedValue({
      status: 'ok',
      memberId: 'member-9',
      displayName: 'Daniela Ferreira',
      profile: profile()
    })

    const invocation = await exec({ person: 'Daniela Ferreira' }, internalTenant({ organizationId: undefined }))

    expect(readMemberIcoProfileForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        tenantType: 'efeonce_internal',
        memberId: 'member-1',
        roleCodes: ['efeonce_admin'],
        routeGroups: ['internal'],
        organizationId: null
      }),
      'Daniela Ferreira'
    )
    expect(invocation.result.available).toBe(true)
    expect(invocation.result.summary).toContain('Daniela Ferreira')
    expect(invocation.result.summary).toContain('OTD 88%')
    expect(invocation.result.metrics.map(metric => metric.label)).toEqual(['OTD', 'RpA', 'FTR', 'Salud'])
  })

  it('forbidden → mensaje de sin acceso', async () => {
    readMemberIcoProfileForSubject.mockResolvedValue({ status: 'forbidden' })

    const invocation = await exec({ person: 'Daniela' }, internalTenant({ roleCodes: ['collaborator'], routeGroups: ['my'] }))

    expect(invocation.result.available).toBe(false)
    expect(invocation.result.summary).toContain('No tienes acceso')
  })

  it('not_found → mensaje uniforme anti-oracle (no filtra existencia)', async () => {
    readMemberIcoProfileForSubject.mockResolvedValue({ status: 'not_found' })

    const invocation = await exec({ person: 'Fulano' }, internalTenant())

    expect(invocation.result.available).toBe(false)
    expect(invocation.result.summary).toContain('no tienes acceso a su desempeño')
  })

  it('ambiguous → pide desambiguación listando candidatos en scope', async () => {
    readMemberIcoProfileForSubject.mockResolvedValue({
      status: 'ambiguous',
      candidates: [
        { memberId: 'm-1', displayName: 'Daniela Ferreira' },
        { memberId: 'm-2', displayName: 'Daniela Soto' }
      ]
    })

    const invocation = await exec({ person: 'Daniela' }, internalTenant())

    expect(invocation.result.available).toBe(false)
    expect(invocation.result.summary).toContain('Daniela Ferreira')
    expect(invocation.result.summary).toContain('Daniela Soto')
  })

  it('ok sin métricas materializadas → gap honesto', async () => {
    readMemberIcoProfileForSubject.mockResolvedValue({
      status: 'ok',
      memberId: 'member-9',
      displayName: 'Daniela Ferreira',
      profile: profile({ hasData: false, current: null, health: null })
    })

    const invocation = await exec({ person: 'Daniela' }, internalTenant())

    expect(invocation.result.available).toBe(true)
    expect(invocation.result.summary).toContain('Aún no hay métricas ICO')
    expect(invocation.result.metrics).toHaveLength(0)
  })
})
