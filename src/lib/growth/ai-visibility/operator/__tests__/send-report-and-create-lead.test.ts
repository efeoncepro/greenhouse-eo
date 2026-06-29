import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const state = vi.hoisted(() => ({
  canResult: true,
  flagEnabled: true,
  org: null as Record<string, unknown> | null,
  // TASK-1291 — perfil resoluble por defecto (categoría real + modelo confirmado) para no chocar el gate.
  profile: null as Record<string, unknown> | null,
  run: { runId: 'run-1' } as Record<string, unknown> | null,
  reportToken: 'grt-1' as string | null,
  claim: { claimed: true, sendId: 'send-1' } as { claimed: boolean; sendId: string | null }
}))

const spies = vi.hoisted(() => ({
  claimReportSend: vi.fn(),
  publishOutboxEvent: vi.fn()
}))

vi.mock('@/lib/entitlements/runtime', () => ({ can: () => state.canResult }))
vi.mock('../../flags', () => ({ isOperatorSendEnabled: () => state.flagEnabled }))
vi.mock('../../store', () => ({
  getClientGraderRunById: async () => state.run,
  getGraderProfileForOrganization: async () => state.profile
}))
vi.mock('../../hubspot/report-link', () => ({ getLatestReportTokenForRun: async () => state.reportToken }))
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

// Perfil graduable por defecto: categoría real (nodo + confianza) + modelo confirmado.
const GRADEABLE_PROFILE = {
  categoryNodeId: 'sector:passenger_airlines',
  categoryLabel: 'Aerolíneas de pasajeros',
  categoryConfidence: 0.9,
  category: 'Aerolíneas de pasajeros',
  businessModel: 'consumer_b2c'
}

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
  state.profile = { ...GRADEABLE_PROFILE }
  state.run = { runId: 'run-1' }
  state.reportToken = 'grt-1'
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

  it('rechaza informe sin snapshot público publicado (report_unavailable)', async () => {
    state.reportToken = null
    const result = await sendAeoReportAndCreateLead(baseInput)

    expect(result).toEqual({ status: 'blocked', reason: 'report_unavailable' })
    expect(spies.publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('TASK-1291: rechaza marca con categoría no resuelta (category_unresolved) — antes de claimar', async () => {
    state.profile = { ...GRADEABLE_PROFILE, categoryNodeId: 'unknown', category: null }
    const result = await sendAeoReportAndCreateLead(baseInput)

    expect(result).toEqual({ status: 'blocked', reason: 'category_unresolved' })
    expect(spies.publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('TASK-1291: rechaza prospecto con modelo de negocio sin confirmar (business_model_unconfirmed)', async () => {
    state.org = PROSPECT_ORG
    state.profile = { ...GRADEABLE_PROFILE, businessModel: 'unknown' }

    const result = await sendAeoReportAndCreateLead({
      ...baseInput,
      organizationId: 'org-2',
      consentRef: 'conv-2026-06-29-maria'
    })

    expect(result).toEqual({ status: 'blocked', reason: 'business_model_unconfirmed' })
    expect(spies.publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('TASK-1291: cliente con modelo unknown pero categoría resuelta → pasa el gate (queued)', async () => {
    state.profile = { ...GRADEABLE_PROFILE, businessModel: 'unknown' }
    const result = await sendAeoReportAndCreateLead(baseInput)

    expect(result.status).toBe('queued')
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
