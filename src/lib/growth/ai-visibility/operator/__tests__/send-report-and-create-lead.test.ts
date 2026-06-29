import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const state = vi.hoisted(() => ({
  canResult: true,
  flagEnabled: true,
  org: null as Record<string, unknown> | null,
  run: { runId: 'run-1' } as Record<string, unknown> | null,
  claim: { claimed: true, sendId: 'send-1' } as { claimed: boolean; sendId: string | null }
}))

const spies = vi.hoisted(() => ({
  claimReportSend: vi.fn(),
  publishOutboxEvent: vi.fn()
}))

vi.mock('@/lib/entitlements/runtime', () => ({ can: () => state.canResult }))
vi.mock('../../flags', () => ({ isOperatorSendEnabled: () => state.flagEnabled }))
vi.mock('../../store', () => ({ getClientGraderRunById: async () => state.run }))
vi.mock('../organization-commercial-facts', () => ({
  getOrganizationCommercialFacts: async () => state.org
}))
vi.mock('../send-log-store', () => ({
  claimReportSend: async (input: unknown) => {
    spies.claimReportSend(input)

    return state.claim
  }
}))
vi.mock('@/lib/db', () => ({
  withTransaction: async (cb: (client: unknown) => Promise<unknown>) => cb({ query: vi.fn() })
}))
vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: async (event: unknown) => {
    spies.publishOutboxEvent(event)

    return 'outbox-1'
  }
}))

import { sendAeoReportAndCreateLead } from '../send-report-and-create-lead'

const SUBJECT = { userId: 'user-op-1' } as never

const CLIENT_ORG = { organizationId: 'org-1', organizationName: 'Acme', websiteUrl: 'https://acme.cl', hubspotCompanyId: null, isClient: true }
const PROSPECT_ORG = { organizationId: 'org-2', organizationName: 'Globe Co', websiteUrl: 'https://globe.com', hubspotCompanyId: null, isClient: false }

const baseInput = {
  subject: SUBJECT,
  organizationId: 'org-1',
  runId: 'run-1',
  recipient: { email: 'maria@acme.cl', firstName: 'María', lastName: 'Pérez' }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.canResult = true
  state.flagEnabled = true
  state.org = CLIENT_ORG
  state.run = { runId: 'run-1' }
  state.claim = { claimed: true, sendId: 'send-1' }
})

describe('sendAeoReportAndCreateLead', () => {
  it('rechaza sin capability (forbidden)', async () => {
    state.canResult = false
    const result = await sendAeoReportAndCreateLead(baseInput)

    expect(result).toEqual({ status: 'blocked', reason: 'forbidden' })
    expect(spies.publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('rechaza con flag OFF (disabled)', async () => {
    state.flagEnabled = false
    const result = await sendAeoReportAndCreateLead(baseInput)

    expect(result).toEqual({ status: 'blocked', reason: 'disabled' })
  })

  it('rechaza email inválido (invalid_recipient)', async () => {
    const result = await sendAeoReportAndCreateLead({ ...baseInput, recipient: { email: 'no-arroba' } })

    expect(result).toEqual({ status: 'blocked', reason: 'invalid_recipient' })
  })

  it('rechaza org inexistente (organization_not_found)', async () => {
    state.org = null
    const result = await sendAeoReportAndCreateLead(baseInput)

    expect(result).toEqual({ status: 'blocked', reason: 'organization_not_found' })
  })

  it('rechaza run inexistente/no reportable (report_unavailable)', async () => {
    state.run = null
    const result = await sendAeoReportAndCreateLead(baseInput)

    expect(result).toEqual({ status: 'blocked', reason: 'report_unavailable' })
  })

  it('rechaza prospecto sin consentimiento (consent_required) — NUNCA cold send', async () => {
    state.org = PROSPECT_ORG
    const result = await sendAeoReportAndCreateLead({ ...baseInput, organizationId: 'org-2', consentRef: null })

    expect(result).toEqual({ status: 'blocked', reason: 'consent_required' })
    expect(spies.publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('cliente con relación → Lead expansion (servicio, sin consent) + encola', async () => {
    const result = await sendAeoReportAndCreateLead(baseInput)

    expect(result).toEqual({ status: 'queued', sendId: 'send-1', leadType: 'expansion', idempotentHit: false })
    expect(spies.claimReportSend).toHaveBeenCalledWith(
      expect.objectContaining({ leadType: 'expansion', legalBasis: 'service_relationship', recipientEmail: 'maria@acme.cl' })
    )
    expect(spies.publishOutboxEvent).toHaveBeenCalledTimes(1)
  })

  it('prospecto con consentimiento → Lead new_business (interés legítimo) + encola', async () => {
    state.org = PROSPECT_ORG

    const result = await sendAeoReportAndCreateLead({
      ...baseInput,
      organizationId: 'org-2',
      consentRef: 'conv-2026-06-29-maria'
    })

    expect(result.status).toBe('queued')
    expect(spies.claimReportSend).toHaveBeenCalledWith(
      expect.objectContaining({
        leadType: 'new_business',
        legalBasis: 'legitimate_interest',
        consentRef: 'conv-2026-06-29-maria'
      })
    )
  })

  it('idempotente: si el envío ya existía no re-publica y marca idempotentHit', async () => {
    state.claim = { claimed: false, sendId: 'send-existing' }
    const result = await sendAeoReportAndCreateLead(baseInput)

    expect(result).toEqual({ status: 'queued', sendId: 'send-existing', leadType: 'expansion', idempotentHit: true })
    expect(spies.publishOutboxEvent).not.toHaveBeenCalled()
  })
})
