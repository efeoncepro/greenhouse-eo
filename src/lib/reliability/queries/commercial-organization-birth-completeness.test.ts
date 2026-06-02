/**
 * TASK-991 Slice 0 — tests para los 4 signals de completitud del nacimiento de la organización.
 *
 * Por cada reader: count=0 → 'ok'; count>0 → severity correcta (error|warning);
 * SQL anti-regresión (tabla/filtro canónico, date-arithmetic seguro); query throws → 'unknown'.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getCommercialClientActiveWithoutProfileSignal } from './commercial-client-active-without-profile'
import { getCommercialClientActiveWithoutSpaceSignal } from './commercial-client-active-without-space'
import { getCommercialOrganizationIncompleteIdentitySignal } from './commercial-organization-incomplete-identity'
import { getCommercialOrganizationTypeLifecycleDriftSignal } from './commercial-organization-type-lifecycle-drift'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getCommercialOrganizationTypeLifecycleDriftSignal — TASK-991 Slice 0', () => {
  it('ok cuando count=0 (steady state)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    const s = await getCommercialOrganizationTypeLifecycleDriftSignal()

    expect(s.severity).toBe('ok')
    expect(s.kind).toBe('drift')
    expect(s.moduleKey).toBe('commercial')
    expect(s.signalId).toBe('commercial.organization.type_lifecycle_drift')
  })

  it('ERROR cuando count>0 (drift es breakage de visibilidad, no warning)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])
    const s = await getCommercialOrganizationTypeLifecycleDriftSignal()

    expect(s.severity).toBe('error')
    expect(s.summary).toContain('3 organizations active_client')
    expect(s.evidence.find(e => e.label === 'count')?.value).toBe('3')
  })

  it('SQL exige active_client AND organization_type NOT IN (client,both)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    await getCommercialOrganizationTypeLifecycleDriftSignal()
    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain("lifecycle_stage = 'active_client'")
    expect(sql).toContain("NOT IN ('client', 'both')")
  })

  it('unknown cuando la query throws (degradación honesta)', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'))
    const s = await getCommercialOrganizationTypeLifecycleDriftSignal()

    expect(s.severity).toBe('unknown')
    expect(s.evidence.find(e => e.label === 'error')?.value).toContain('connection refused')
  })

  it('singular cuando count=1', async () => {
    queryMock.mockResolvedValueOnce([{ n: 1 }])
    const s = await getCommercialOrganizationTypeLifecycleDriftSignal()

    expect(s.summary).toContain('1 organization active_client')
  })
})

describe('getCommercialOrganizationIncompleteIdentitySignal — TASK-991 Slice 0', () => {
  it('ok cuando count=0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    const s = await getCommercialOrganizationIncompleteIdentitySignal()

    expect(s.severity).toBe('ok')
    expect(s.kind).toBe('data_quality')
    expect(s.moduleKey).toBe('commercial')
    expect(s.signalId).toBe('commercial.organization.incomplete_identity')
  })

  it('warning cuando count>0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 5 }])
    const s = await getCommercialOrganizationIncompleteIdentitySignal()

    expect(s.severity).toBe('warning')
    expect(s.summary).toContain('5 organizations client-grade')
  })

  it('SQL acota a client-grade (anti-ruido prospects): active_client OR type IN (client,both) AND tax/legal NULL', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    await getCommercialOrganizationIncompleteIdentitySignal()
    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain("lifecycle_stage = 'active_client'")
    expect(sql).toContain("IN ('client', 'both')")
    expect(sql).toContain('tax_id IS NULL')
    expect(sql).toContain('legal_name')
  })

  it('unknown cuando throws', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))
    const s = await getCommercialOrganizationIncompleteIdentitySignal()

    expect(s.severity).toBe('unknown')
  })
})

describe('getCommercialClientActiveWithoutProfileSignal — TASK-991 Slice 0', () => {
  it('ok cuando count=0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    const s = await getCommercialClientActiveWithoutProfileSignal()

    expect(s.severity).toBe('ok')
    expect(s.kind).toBe('data_quality')
    expect(s.signalId).toBe('commercial.client.active_without_profile')
  })

  it('warning cuando count>0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 2 }])
    const s = await getCommercialClientActiveWithoutProfileSignal()

    expect(s.severity).toBe('warning')
    expect(s.summary).toContain('2 organizations active_client')
  })

  it('SQL LEFT JOIN client_profiles por organization_id + active_client', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    await getCommercialClientActiveWithoutProfileSignal()
    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('greenhouse_finance.client_profiles')
    expect(sql).toContain('cp.organization_id IS NULL')
    expect(sql).toContain("lifecycle_stage = 'active_client'")
  })

  it('unknown cuando throws', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))
    const s = await getCommercialClientActiveWithoutProfileSignal()

    expect(s.severity).toBe('unknown')
  })
})

describe('getCommercialClientActiveWithoutSpaceSignal — TASK-991 Slice 0', () => {
  it('ok cuando count=0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    const s = await getCommercialClientActiveWithoutSpaceSignal()

    expect(s.severity).toBe('ok')
    expect(s.kind).toBe('data_quality')
    expect(s.signalId).toBe('commercial.client.active_without_space')
  })

  it('warning cuando count>0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 4 }])
    const s = await getCommercialClientActiveWithoutSpaceSignal()

    expect(s.severity).toBe('warning')
    expect(s.summary).toContain('4 organizations active_client')
  })

  it('SQL LEFT JOIN spaces por organization_id + active_client', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    await getCommercialClientActiveWithoutSpaceSignal()
    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('greenhouse_core.spaces')
    expect(sql).toContain('s.organization_id IS NULL')
    expect(sql).toContain("lifecycle_stage = 'active_client'")
  })

  it('unknown cuando throws', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))
    const s = await getCommercialClientActiveWithoutSpaceSignal()

    expect(s.severity).toBe('unknown')
  })
})
