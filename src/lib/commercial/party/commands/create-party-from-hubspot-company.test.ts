/**
 * TASK-991 Slice 1 — comportamiento del flag en la puerta HubSpot.
 *
 * OFF (default): INSERT legacy bit-for-bit (omite organization_type/public_id/origin).
 * ON: INSERT canónico (deriva organization_type del lifecycle + public_id + origin),
 *     cerrando el root-cause de Grupo Berel.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  withTransaction: (fn: (c: unknown) => unknown) => fn(undefined)
}))

vi.mock('@/lib/account-360/id-generation', () => ({
  nextPublicId: async () => 'EO-ORG-9999'
}))

const findOrgMock = vi.fn()

vi.mock('../party-store', () => ({
  findOrganizationByHubSpotCompany: (...args: unknown[]) => findOrgMock(...args)
}))

vi.mock('../party-events', () => ({
  publishPartyCreated: vi.fn(async () => {})
}))

import { createPartyFromHubSpotCompany } from './create-party-from-hubspot-company'

type TxClientArg = Parameters<typeof createPartyFromHubSpotCompany>[1]

const buildTxClient = () => {
  const calls: Array<{ text: string; values: unknown[] }> = []

  const client = {
    query: vi.fn(async (text: string, values?: unknown[]) => {
      calls.push({ text, values: values ?? [] })

      if (text.includes('INSERT INTO greenhouse_core.organizations')) {
        return { rows: [{ organization_id: 'org-x', commercial_party_id: 'cp-1' }] }
      }

      return { rows: [] }
    })
  } as unknown as TxClientArg

  return { client, calls }
}

const orgInsert = (calls: Array<{ text: string; values: unknown[] }>) =>
  calls.find(c => c.text.includes('INSERT INTO greenhouse_core.organizations'))!

beforeEach(() => {
  findOrgMock.mockReset()
  findOrgMock.mockResolvedValue(null)
})

afterEach(() => {
  delete process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED
  vi.clearAllMocks()
})

describe('createPartyFromHubSpotCompany — TASK-991 flag', () => {
  it("kill-switch 'false': INSERT legacy SIN organization_type/public_id/origin", async () => {
    process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED = 'false'
    const { client, calls } = buildTxClient()

    await createPartyFromHubSpotCompany(
      { hubspotCompanyId: '55405407542', hubspotLifecycleStage: 'customer', actor: { system: true } },
      client
    )

    const insert = orgInsert(calls)

    expect(insert.text).not.toContain('organization_type')
    expect(insert.text).not.toContain('public_id')
    expect(insert.text).not.toContain('origin')
  })

  it('default (kill-switch ON): INSERT canónico con organization_type derivado (customer ⇒ client) + public_id + origin', async () => {
    delete process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED
    const { client, calls } = buildTxClient()

    await createPartyFromHubSpotCompany(
      { hubspotCompanyId: '55405407542', hubspotLifecycleStage: 'customer', actor: { system: true } },
      client
    )

    const insert = orgInsert(calls)

    expect(insert.text).toContain('organization_type')
    expect(insert.text).toContain('public_id')
    expect(insert.text).toContain("'hubspot_sync'")
    // customer → active_client → deriveOrganizationType ⇒ 'client'
    expect(insert.values).toContain('client')
    expect(insert.values).toContain('EO-ORG-9999')
  })

  it('flag ON: prospect ⇒ organization_type other (no infla a client)', async () => {
    process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED = 'true'
    const { client, calls } = buildTxClient()

    await createPartyFromHubSpotCompany(
      { hubspotCompanyId: 'hs-2', hubspotLifecycleStage: 'lead', actor: { system: true } },
      client
    )

    const insert = orgInsert(calls)

    expect(insert.values).toContain('other')
  })

  it('flag ON: propaga el country real de HubSpot (MX, no el default ciego CL) — Slice 2', async () => {
    process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED = 'true'
    const { client, calls } = buildTxClient()

    await createPartyFromHubSpotCompany(
      {
        hubspotCompanyId: '55405407542',
        hubspotLifecycleStage: 'customer',
        country: 'MX',
        actor: { system: true }
      },
      client
    )

    const insert = orgInsert(calls)

    expect(insert.text).toContain('country')
    expect(insert.values).toContain('MX')
    expect(insert.values).not.toContain('CL')
  })

  it('flag ON: country NULL cuando HubSpot no lo trae (honesto, no CL ciego) — Slice 2', async () => {
    process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED = 'true'
    const { client, calls } = buildTxClient()

    await createPartyFromHubSpotCompany(
      { hubspotCompanyId: 'hs-3', hubspotLifecycleStage: 'lead', country: null, actor: { system: true } },
      client
    )

    const insert = orgInsert(calls)

    // country incluido en el INSERT con valor NULL — la DB NO aplica el default 'CL'.
    expect(insert.text).toContain('country')
    expect(insert.values).not.toContain('CL')
  })
})
