import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SAMPLE_PUBLIC_REPORT } from '@/components/growth/ai-visibility/report-artifact/fixtures'

// ── Mocks of the IO boundaries (the model derivation uses the REAL pure model) ──
vi.mock('@/lib/growth/ai-visibility/flags', () => ({ isReportEmailDeliveryEnabled: vi.fn() }))
vi.mock('@/lib/growth/ai-visibility/public-intake/store', () => ({ getGraderLeadForHandoff: vi.fn() }))
vi.mock('@/lib/growth/ai-visibility/hubspot/report-link', () => ({
  getLatestReportTokenForRun: vi.fn(),
  buildPublicReportUrl: (token: string) => `https://think.efeoncepro.com/brand-visibility/r/${token}`
}))
vi.mock('@/lib/growth/ai-visibility/report/snapshot', () => ({ readPublicGraderReport: vi.fn() }))
vi.mock('@/lib/email/delivery', () => ({ sendEmail: vi.fn() }))
vi.mock('../build-report-attachment', () => ({
  buildAiVisibilityReportAttachment: vi.fn(async () => ({
    filename: 'informe-visibilidad-ia-globe.pdf',
    content: Buffer.from('%PDF-1.7 fake'),
    contentType: 'application/pdf',
    sizeLabel: '~2 MB',
    byteLength: 13
  }))
}))
vi.mock('../dispatch-ledger', () => ({
  claimReportEmailDispatch: vi.fn(),
  markReportEmailDispatchSent: vi.fn(async () => {}),
  markReportEmailDispatchFailed: vi.fn(async () => {})
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { sendEmail } from '@/lib/email/delivery'
import { isReportEmailDeliveryEnabled } from '@/lib/growth/ai-visibility/flags'
import { getLatestReportTokenForRun } from '@/lib/growth/ai-visibility/hubspot/report-link'
import { getGraderLeadForHandoff } from '@/lib/growth/ai-visibility/public-intake/store'
import { readPublicGraderReport } from '@/lib/growth/ai-visibility/report/snapshot'

import { buildAiVisibilityReportAttachment } from '../build-report-attachment'
import { claimReportEmailDispatch, markReportEmailDispatchSent, markReportEmailDispatchFailed } from '../dispatch-ledger'
import { dispatchAiVisibilityReportEmail } from '../dispatch-report-email'

const RUN_ID = 'grun-test-001'

const lead = {
  leadId: 'glead-1',
  email: 'prospect@acme.com',
  consent: true,
  firstName: 'Ana',
  lastName: 'Díaz',
  brandName: 'Acme',
  websiteUrl: 'https://acme.com',
  consentAt: '2026-06-27T00:00:00.000Z',
  hubspotSyncedAt: null
}

const snapshot = (gateStatus: string = 'ready') => ({
  reportId: 'grpt-1',
  reportToken: 'grt-xyz',
  asOf: '2026-06-27T12:00:00.000Z',
  expiresAt: null,
  publicReport: { ...SAMPLE_PUBLIC_REPORT, gate: { ...SAMPLE_PUBLIC_REPORT.gate, status: gateStatus } }
})

const mocks = {
  flag: vi.mocked(isReportEmailDeliveryEnabled),
  lead: vi.mocked(getGraderLeadForHandoff),
  token: vi.mocked(getLatestReportTokenForRun),
  snapshot: vi.mocked(readPublicGraderReport),
  send: vi.mocked(sendEmail),
  claim: vi.mocked(claimReportEmailDispatch),
  markSent: vi.mocked(markReportEmailDispatchSent),
  markFailed: vi.mocked(markReportEmailDispatchFailed),
  attachment: vi.mocked(buildAiVisibilityReportAttachment)
}

const happyPath = () => {
  mocks.flag.mockReturnValue(true)
  mocks.lead.mockResolvedValue(lead as never)
  mocks.token.mockResolvedValue('grt-xyz')
  mocks.snapshot.mockResolvedValue(snapshot('ready') as never)
  mocks.claim.mockResolvedValue({ claimed: true, dispatchId: 'disp-1' })
  mocks.send.mockResolvedValue({ deliveryId: 'd-1', resendId: 're-1', status: 'sent' } as never)
}

describe('dispatchAiVisibilityReportEmail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips when the feature flag is OFF, without claiming or sending', async () => {
    mocks.flag.mockReturnValue(false)

    const res = await dispatchAiVisibilityReportEmail(RUN_ID)

    expect(res).toMatchObject({ status: 'skipped', reason: 'disabled', retryable: false })
    expect(mocks.claim).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('skips when there is no lead', async () => {
    mocks.flag.mockReturnValue(true)
    mocks.lead.mockResolvedValue(null)

    expect(await dispatchAiVisibilityReportEmail(RUN_ID)).toMatchObject({ status: 'skipped', reason: 'no_lead' })
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('skips when consent is absent (consent-gate)', async () => {
    mocks.flag.mockReturnValue(true)
    mocks.lead.mockResolvedValue({ ...lead, consent: false } as never)

    expect(await dispatchAiVisibilityReportEmail(RUN_ID)).toMatchObject({ status: 'skipped', reason: 'no_consent' })
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('skips a gated report (review_required) without claiming or sending', async () => {
    mocks.flag.mockReturnValue(true)
    mocks.lead.mockResolvedValue(lead as never)
    mocks.token.mockResolvedValue('grt-xyz')
    mocks.snapshot.mockResolvedValue(snapshot('review_required') as never)

    const res = await dispatchAiVisibilityReportEmail(RUN_ID)

    expect(res).toMatchObject({ status: 'skipped', reason: 'gated:review_required' })
    expect(mocks.claim).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('is idempotent: when the claim is not won, it skips as already_sent without sending', async () => {
    happyPath()
    mocks.claim.mockResolvedValue({ claimed: false, dispatchId: null })

    const res = await dispatchAiVisibilityReportEmail(RUN_ID)

    expect(res).toMatchObject({ status: 'skipped', reason: 'already_sent' })
    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.attachment).not.toHaveBeenCalled()
  })

  it('sends the email with the PDF attachment under the growth domain and marks the dispatch sent', async () => {
    happyPath()

    const res = await dispatchAiVisibilityReportEmail(RUN_ID)

    expect(res).toMatchObject({ status: 'succeeded', retryable: false })
    expect(mocks.send).toHaveBeenCalledTimes(1)
    const sendArg = mocks.send.mock.calls[0][0] as unknown as Record<string, unknown>

    expect(sendArg.emailType).toBe('ai_visibility_grader_report')
    expect(sendArg.domain).toBe('growth')
    expect(sendArg.sourceEventId).toBe('grpt-1')
    const ctx = sendArg.context as Record<string, unknown>

    expect(ctx.organizationName).toBe('Acme')
    expect(ctx.pdfBuffer).toBeInstanceOf(Buffer)
    expect(ctx.attachmentFilename).toBe('informe-visibilidad-ia-globe.pdf')
    expect(mocks.markSent).toHaveBeenCalledWith('disp-1', 're-1')
  })

  it('marks the dispatch failed and stays retryable when delivery does not reach sent', async () => {
    happyPath()
    mocks.send.mockResolvedValue({ deliveryId: 'd-1', resendId: null, status: 'failed', error: 'boom' } as never)

    const res = await dispatchAiVisibilityReportEmail(RUN_ID)

    expect(res).toMatchObject({ status: 'failed', retryable: true })
    expect(mocks.markFailed).toHaveBeenCalled()
    expect(mocks.markSent).not.toHaveBeenCalled()
  })

  it('flags partial delivery to the template when the snapshot gate is partial', async () => {
    happyPath()
    mocks.snapshot.mockResolvedValue(snapshot('partial') as never)

    await dispatchAiVisibilityReportEmail(RUN_ID)

    const ctx = (mocks.send.mock.calls[0][0] as unknown as Record<string, unknown>).context as Record<string, unknown>

    expect(ctx.isPartial).toBe(true)
  })
})
