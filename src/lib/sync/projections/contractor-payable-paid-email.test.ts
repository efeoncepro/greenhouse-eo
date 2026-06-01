import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockResolveRemittance = vi.fn()
const mockGeneratePdf = vi.fn()
const mockGetRecipient = vi.fn()
const mockSendEmail = vi.fn()
const mockCapture = vi.fn()

vi.mock('@/lib/contractor-engagements/remittance/remittance-resolver', () => ({
  resolveRemittanceAdvice: (...args: unknown[]) => mockResolveRemittance(...args)
}))
vi.mock('@/lib/contractor-engagements/remittance/generate-contractor-remittance-pdf', () => ({
  generateContractorRemittancePdf: (...args: unknown[]) => mockGeneratePdf(...args)
}))
vi.mock('@/lib/notifications/person-recipient-resolver', () => ({
  getProfileNotificationRecipient: (...args: unknown[]) => mockGetRecipient(...args)
}))
vi.mock('@/lib/email/delivery', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}))
vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCapture(...args)
}))

import { contractorPayablePaidEmailProjection as projection } from './contractor-payable-paid-email'

const presentation = {
  number: 'EO-RA-000123',
  locale: 'es-CL',
  beneficiary: { name: 'María González Rojas' },
  payment: { dateLabel: 'Fecha de pago', dateValue: '01-06-2026' },
  breakdown: [
    { id: 'gross', label: 'Honorarios brutos', amount: 1000000, currency: 'CLP', kind: 'gross' },
    { id: 'wh', label: 'Retención SII', amount: 152500, currency: 'CLP', kind: 'withholding', negative: true },
    { id: 'net', label: 'Pago neto', amount: 847500, currency: 'CLP', kind: 'net', emphasis: true }
  ]
}

const okResolution = {
  ok: true,
  presentation,
  engagementProfileId: 'prof-1',
  payable: { contractorPayableId: 'cpay-1' },
  remittanceNumber: 'EO-RA-000123',
  locale: 'es-CL'
}

describe('contractorPayablePaidEmailProjection (TASK-981)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('declares the canonical trigger + finance domain + retries', () => {
    expect(projection.name).toBe('contractor_payable_paid_email')
    expect(projection.domain).toBe('finance')
    expect(projection.triggerEvents).toContain('workforce.contractor_payable.paid')
    expect(projection.maxRetries).toBe(3)
  })

  it('extractScope reads contractorPayableId from the payload', () => {
    expect(projection.extractScope({ contractorPayableId: 'cpay-9' })).toEqual({
      entityType: 'contractor_payable',
      entityId: 'cpay-9'
    })
    expect(projection.extractScope({})).toBeNull()
    expect(projection.extractScope({ contractorPayableId: 7 })).toBeNull()
  })

  it('skips silently when the remittance is not_paid (no capture)', async () => {
    mockResolveRemittance.mockResolvedValueOnce({ ok: false, reason: 'not_paid' })

    const res = await projection.refresh(
      { entityType: 'contractor_payable', entityId: 'cpay-1' },
      { contractorPayableId: 'cpay-1' }
    )

    expect(res).toContain('not_paid')
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('captures + skips when the remittance is unresolved for a data reason', async () => {
    mockResolveRemittance.mockResolvedValueOnce({ ok: false, reason: 'issuer_unresolved' })

    const res = await projection.refresh(
      { entityType: 'contractor_payable', entityId: 'cpay-1' },
      { contractorPayableId: 'cpay-1' }
    )

    expect(res).toContain('issuer_unresolved')
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockCapture).toHaveBeenCalledTimes(1)
  })

  it('skips + captures when the contractor has no email', async () => {
    mockResolveRemittance.mockResolvedValueOnce(okResolution)
    mockGetRecipient.mockResolvedValueOnce({ fullName: 'María', email: undefined })

    const res = await projection.refresh(
      { entityType: 'contractor_payable', entityId: 'cpay-1' },
      { contractorPayableId: 'cpay-1' }
    )

    expect(res).toContain('no recipient email')
    expect(mockGeneratePdf).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockCapture).toHaveBeenCalledTimes(1)
  })

  it('sends the email with the PDF attached + net row + idempotency keys', async () => {
    mockResolveRemittance.mockResolvedValueOnce(okResolution)
    mockGetRecipient.mockResolvedValueOnce({
      email: 'maria@example.com',
      fullName: 'María González Rojas',
      userId: 'u-1'
    })
    mockGeneratePdf.mockResolvedValueOnce(Buffer.from('PDF'))
    mockSendEmail.mockResolvedValueOnce({ status: 'sent', deliveryId: 'd-1' })

    const res = await projection.refresh(
      { entityType: 'contractor_payable', entityId: 'cpay-1' },
      { contractorPayableId: 'cpay-1', _eventId: 'evt-77' }
    )

    expect(mockGeneratePdf).toHaveBeenCalledWith(presentation)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    const arg = mockSendEmail.mock.calls[0][0]

    expect(arg.emailType).toBe('contractor_remittance_paid')
    expect(arg.domain).toBe('finance')
    expect(arg.recipients[0].email).toBe('maria@example.com')
    expect(arg.sourceEventId).toBe('evt-77')
    expect(arg.sourceEntity).toBe('cpay-1')
    expect(arg.context.remittanceNumber).toBe('EO-RA-000123')
    expect(arg.context.netLabel).toBe('Pago neto')
    expect(arg.context.netAmount).toBe(847500)
    expect(arg.context.netCurrency).toBe('CLP')
    expect(arg.context.locale).toBe('es')
    expect(arg.context.attachmentFilename).toBe('comprobante-pago-EO-RA-000123.pdf')
    expect(Buffer.isBuffer(arg.context.pdfBuffer)).toBe(true)
    expect(res).toContain('email sent')
  })

  it('falls back to a stable sourceEventId when _eventId is absent', async () => {
    mockResolveRemittance.mockResolvedValueOnce(okResolution)
    mockGetRecipient.mockResolvedValueOnce({ email: 'maria@example.com' })
    mockGeneratePdf.mockResolvedValueOnce(Buffer.from('PDF'))
    mockSendEmail.mockResolvedValueOnce({ status: 'sent' })

    await projection.refresh(
      { entityType: 'contractor_payable', entityId: 'cpay-1' },
      { contractorPayableId: 'cpay-1' }
    )

    expect(mockSendEmail.mock.calls[0][0].sourceEventId).toBe('contractor-payable-paid:cpay-1')
  })

  it('maps en-US locale to en', async () => {
    mockResolveRemittance.mockResolvedValueOnce({
      ...okResolution,
      presentation: { ...presentation, locale: 'en-US' }
    })
    mockGetRecipient.mockResolvedValueOnce({ email: 'john@example.com' })
    mockGeneratePdf.mockResolvedValueOnce(Buffer.from('PDF'))
    mockSendEmail.mockResolvedValueOnce({ status: 'sent' })

    await projection.refresh(
      { entityType: 'contractor_payable', entityId: 'cpay-1' },
      { contractorPayableId: 'cpay-1' }
    )

    expect(mockSendEmail.mock.calls[0][0].context.locale).toBe('en')
  })
})
