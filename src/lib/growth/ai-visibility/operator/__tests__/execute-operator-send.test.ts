import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SAMPLE_PUBLIC_REPORT } from '@/components/growth/ai-visibility/report-artifact/fixtures'

vi.mock('@/lib/email/delivery', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('../../flags', () => ({ isOperatorSendEnabled: vi.fn() }))
vi.mock('../../hubspot/crm-client', () => ({ createOperatorCrossSellLead: vi.fn() }))
vi.mock('../../hubspot/report-link', () => ({
  getLatestReportTokenForRun: vi.fn(),
  buildPublicReportUrl: (token: string) => `https://think.efeoncepro.com/brand-visibility/r/${token}`
}))
vi.mock('../../public-delivery/email/build-report-attachment', () => ({ buildAiVisibilityReportAttachment: vi.fn() }))
vi.mock('../../report/pdf-presentation-context', () => ({ readAiVisibilityReportPdfPresentationContext: vi.fn() }))
vi.mock('../../report/snapshot', () => ({ readPublicGraderReport: vi.fn() }))
vi.mock('../organization-commercial-facts', () => ({ getOrganizationCommercialFacts: vi.fn() }))
vi.mock('../send-log-store', () => ({
  getReportSendForExecution: vi.fn(),
  markReportSendEmail: vi.fn(),
  markReportSendLead: vi.fn()
}))

import { sendEmail } from '@/lib/email/delivery'

import { isOperatorSendEnabled } from '../../flags'
import { createOperatorCrossSellLead } from '../../hubspot/crm-client'
import { getLatestReportTokenForRun } from '../../hubspot/report-link'
import { buildAiVisibilityReportAttachment } from '../../public-delivery/email/build-report-attachment'
import { readAiVisibilityReportPdfPresentationContext } from '../../report/pdf-presentation-context'
import { readPublicGraderReport } from '../../report/snapshot'
import { executeOperatorReportSend } from '../execute-operator-send'
import { getOrganizationCommercialFacts } from '../organization-commercial-facts'
import { getReportSendForExecution, markReportSendEmail, markReportSendLead } from '../send-log-store'

const organization = {
  organizationId: 'org-client', organizationName: 'Client Brand', websiteUrl: 'https://example.com',
  hubspotCompanyId: null, isClient: true
}

const row = {
  sendId: 'send-1', runId: 'run-1', organizationId: 'org-client', recipientEmail: 'client@example.com',
  recipientName: 'Client User', leadType: 'expansion', emailStatus: 'pending', leadStatus: 'created'
}

const snapshot = {
  reportId: 'report-1', runId: 'run-1', reportToken: 'grt-1', asOf: '2026-05-20T12:00:00.000Z',
  expiresAt: null, brandName: 'Client Brand', runPublicId: 'EO-GRUN-00001', publicReport: SAMPLE_PUBLIC_REPORT
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(isOperatorSendEnabled).mockReturnValue(true)
  vi.mocked(getReportSendForExecution).mockResolvedValue(row as never)
  vi.mocked(getLatestReportTokenForRun).mockResolvedValue('grt-1')
  vi.mocked(readPublicGraderReport).mockResolvedValue(snapshot)
  vi.mocked(getOrganizationCommercialFacts).mockResolvedValue(organization)
  vi.mocked(readAiVisibilityReportPdfPresentationContext).mockResolvedValue({
    audience: 'client', audienceSource: 'organization_commercial_facts'
  })
  vi.mocked(buildAiVisibilityReportAttachment).mockResolvedValue({
    filename: 'informe-visibilidad-ia-client-brand.pdf', content: Buffer.from('%PDF-fake'),
    contentType: 'application/pdf', sizeLabel: '~1 KB', byteLength: 9
  })
  vi.mocked(sendEmail).mockResolvedValue({ status: 'sent', resendId: 'message-1' } as never)
})

describe('operator PDF presentation metadata', () => {
  it('passes the bound snapshot and existing commercial facts while retaining the email contract', async () => {
    expect(await executeOperatorReportSend('send-1')).toMatchObject({ status: 'succeeded', retryable: false })
    expect(getOrganizationCommercialFacts).toHaveBeenCalledTimes(1)
    expect(readAiVisibilityReportPdfPresentationContext).toHaveBeenCalledWith({
      runId: 'run-1', locale: SAMPLE_PUBLIC_REPORT.provenance.market?.locale,
      asOf: snapshot.asOf, knownOrganization: organization
    })
    expect(buildAiVisibilityReportAttachment).toHaveBeenCalledWith(expect.objectContaining({
      publicReport: SAMPLE_PUBLIC_REPORT,
      context: { audience: 'client', audienceSource: 'organization_commercial_facts' }
    }))
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      recipients: [{ email: row.recipientEmail, name: row.recipientName }],
      sourceEventId: row.sendId,
      context: expect.objectContaining({ organizationName: organization.organizationName, locale: 'es' })
    }))
    expect(markReportSendEmail).toHaveBeenCalledWith('send-1', 'sent', { resendMessageId: 'message-1' })
    expect(createOperatorCrossSellLead).not.toHaveBeenCalled()
    expect(markReportSendLead).not.toHaveBeenCalled()
  })

  it('does not read visual metadata or rebuild an already sent email', async () => {
    vi.mocked(getReportSendForExecution).mockResolvedValue({ ...row, emailStatus: 'sent' } as never)

    expect(await executeOperatorReportSend('send-1')).toMatchObject({ status: 'succeeded' })
    expect(readAiVisibilityReportPdfPresentationContext).not.toHaveBeenCalled()
    expect(buildAiVisibilityReportAttachment).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('retains the report-state gate before metadata, rendering and email', async () => {
    vi.mocked(readPublicGraderReport).mockResolvedValue({
      ...snapshot,
      publicReport: { ...SAMPLE_PUBLIC_REPORT, gate: { ...SAMPLE_PUBLIC_REPORT.gate, status: 'review_required' } }
    })

    expect(await executeOperatorReportSend('send-1')).toMatchObject({ status: 'succeeded' })
    expect(markReportSendEmail).toHaveBeenCalledWith('send-1', 'skipped', { reason: 'gated:review_required' })
    expect(readAiVisibilityReportPdfPresentationContext).not.toHaveBeenCalled()
    expect(buildAiVisibilityReportAttachment).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('keeps the existing exception path when organization binding is contradictory', async () => {
    vi.mocked(readAiVisibilityReportPdfPresentationContext).mockRejectedValue(new Error('ai_visibility_pdf_presentation_organization_mismatch'))

    expect(await executeOperatorReportSend('send-1')).toMatchObject({ status: 'failed', reason: 'exception', retryable: true })
    expect(buildAiVisibilityReportAttachment).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(createOperatorCrossSellLead).not.toHaveBeenCalled()
    expect(markReportSendEmail).not.toHaveBeenCalled()
  })

  it('retains the disabled gate without additional reads', async () => {
    vi.mocked(isOperatorSendEnabled).mockReturnValue(false)

    expect(await executeOperatorReportSend('send-1')).toMatchObject({ status: 'skipped', reason: 'disabled' })
    expect(getReportSendForExecution).not.toHaveBeenCalled()
    expect(readAiVisibilityReportPdfPresentationContext).not.toHaveBeenCalled()
  })
})
