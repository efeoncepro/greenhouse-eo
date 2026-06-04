/**
 * TASK-991 Slice 1 — promoteParty reconcilia organization_type al promover a
 * active_client/provider_only (gated). Es el segundo writer de lifecycle_stage
 * que el CHECK de consistencia depende.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  withTransaction: (fn: (c: unknown) => unknown) => fn(undefined)
}))

const selectOrgMock = vi.fn()

vi.mock('../party-store', () => ({
  selectOrganizationForLifecycleUpdate: (...a: unknown[]) => selectOrgMock(...a)
}))

vi.mock('../party-events', () => ({
  publishPartyPromoted: vi.fn(async () => {}),
  publishPartyDemoted: vi.fn(async () => {})
}))

const instantiateMock = vi.fn(async () => ({}))

vi.mock('./instantiate-client-for-party', () => ({
  instantiateClientForParty: () => instantiateMock()
}))

import { promoteParty } from './promote-party'

type Call = { text: string; values: unknown[] }

const buildClient = () => {
  const calls: Call[] = []

  const client = {
    query: vi.fn(async (text: string, values?: unknown[]) => {
      calls.push({ text, values: values ?? [] })

      if (text.includes('organization_lifecycle_history')) {
        return { rows: [{ history_id: 'h1', transitioned_at: '2026-06-02T00:00:00Z' }] }
      }

      return { rows: [] }
    })
  } as unknown as Parameters<typeof promoteParty>[1]

  return { client, calls }
}

const orgUpdate = (calls: Call[]) =>
  calls.find(c => c.text.includes('UPDATE greenhouse_core.organizations'))!

beforeEach(() => {
  selectOrgMock.mockReset()
  selectOrgMock.mockResolvedValue({
    organization_id: 'org-1',
    commercial_party_id: 'cp-1',
    lifecycle_stage: 'prospect',
    organization_type: 'other'
  })
  instantiateMock.mockReset()
  instantiateMock.mockResolvedValue({})
})

afterEach(() => {
  delete process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED
  vi.clearAllMocks()
})

describe('promoteParty — TASK-991 type reconciliation', () => {
  it('flag ON: promover prospect→active_client setea organization_type=client en el MISMO UPDATE', async () => {
    process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED = 'true'
    const { client, calls } = buildClient()

    await promoteParty(
      { organizationId: 'org-1', toStage: 'active_client', source: 'hubspot_sync', actor: { system: true } },
      client
    )

    const upd = orgUpdate(calls)

    expect(upd.text).toContain('organization_type = $5')
    expect(upd.values[4]).toBe('client')
  })

  it("kill-switch 'false': UPDATE legacy SIN organization_type (bit-for-bit)", async () => {
    process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED = 'false'
    const { client, calls } = buildClient()

    await promoteParty(
      { organizationId: 'org-1', toStage: 'active_client', source: 'hubspot_sync', actor: { system: true } },
      client
    )

    const upd = orgUpdate(calls)

    expect(upd.text).not.toContain('organization_type')
  })

  it('flag ON: promover a inactive (no active_client/provider_only) NO toca organization_type (no degrada)', async () => {
    process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED = 'true'
    selectOrgMock.mockResolvedValue({
      organization_id: 'org-2',
      commercial_party_id: 'cp-2',
      lifecycle_stage: 'active_client',
      organization_type: 'client'
    })
    const { client, calls } = buildClient()

    await promoteParty(
      { organizationId: 'org-2', toStage: 'inactive', source: 'manual', actor: { system: true } },
      client
    )

    const upd = orgUpdate(calls)

    expect(upd.text).not.toContain('organization_type')
  })

  it('flag ON: supplier existente promovido a active_client ⇒ both', async () => {
    process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED = 'true'
    selectOrgMock.mockResolvedValue({
      organization_id: 'org-3',
      commercial_party_id: 'cp-3',
      lifecycle_stage: 'prospect',
      organization_type: 'supplier'
    })
    const { client, calls } = buildClient()

    await promoteParty(
      { organizationId: 'org-3', toStage: 'active_client', source: 'manual', actor: { system: true } },
      client
    )

    const upd = orgUpdate(calls)

    expect(upd.values[4]).toBe('both')
  })
})
