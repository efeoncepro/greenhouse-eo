import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as StoreModule from '../store'

vi.mock('../store', async importOriginal => ({
  ...(await importOriginal<typeof StoreModule>()),
  getSubmissionById: vi.fn(),
  getActiveFormAsset: vi.fn(),
  getFormDefinitionById: vi.fn(),
  getPublishedVersionBySlug: vi.fn(),
  getHostSurfaceById: vi.fn(),
}))
const sendEmailMock = vi.fn()

vi.mock('@/lib/email/delivery', () => ({ sendEmail: (...a: unknown[]) => sendEmailMock(...a) }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('../flags', () => ({ isEbookEmailDeliveryEnabled: () => flagOn }))

let flagOn = true

import { sendEbookDeliveryEmail } from '../ebook-delivery'
import * as store from '../store'

const m = <T,>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>
const getSubmissionById = m(store.getSubmissionById)
const getActiveFormAsset = m(store.getActiveFormAsset)
const getFormDefinitionById = m(store.getFormDefinitionById)
const getPublishedVersionBySlug = m(store.getPublishedVersionBySlug)
const getHostSurfaceById = m(store.getHostSurfaceById)

const submission = (over: Record<string, unknown> = {}) =>
  ({
    submission_id: 'fsub-1',
    form_id: 'fdef-ebook',
    surface_id: 'fhsf-ebook',
    status: 'accepted',
    normalized_fields_json: { email: 'ana@empresa.com', firstName: 'Ana', lastName: 'Pérez', locale: 'es' },
    created_at: new Date(),
    ...over,
  }) as unknown as StoreModule.FormSubmissionRow

beforeEach(() => {
  vi.clearAllMocks()
  flagOn = true
  sendEmailMock.mockResolvedValue({ status: 'sent', deliveryId: 'del-1' })
  getActiveFormAsset.mockResolvedValue({ form_id: 'fdef-ebook', object_name: 'x.pdf', active: true })
  getFormDefinitionById.mockResolvedValue({ form_id: 'fdef-ebook', slug: 'efeonce-web-agentica-ebook', name: 'Ebook', form_key: 'k' })
  getPublishedVersionBySlug.mockResolvedValue({
    form_id: 'fdef-ebook',
    success_behavior_json: {
      reward: { title: 'El fin de la web', body: 'Marketing + IA.' },
      actions: [{ label: 'Medir mi visibilidad', href: '/brand-visibility' }],
    },
  })
  getHostSurfaceById.mockResolvedValue({ surface_id: 'fhsf-ebook', origin_allowlist_json: ['https://think.efeoncepro.com'] })
})

describe('sendEbookDeliveryEmail — gates + contenido genérico', () => {
  it('flag OFF → skip sin enviar', async () => {
    flagOn = false
    const r = await sendEbookDeliveryEmail('fsub-1')

    expect(r).toContain('flag OFF')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('form sin asset (no es ebook) → no-op', async () => {
    getSubmissionById.mockResolvedValue(submission())
    getActiveFormAsset.mockResolvedValue(null)
    const r = await sendEbookDeliveryEmail('fsub-1')

    expect(r).toContain('no es ebook')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('submission sin email → skip (no envía)', async () => {
    getSubmissionById.mockResolvedValue(submission({ normalized_fields_json: { firstName: 'Ana' } }))
    const r = await sendEbookDeliveryEmail('fsub-1')

    expect(r).toContain('sin email')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('happy path → envía con título/tagline/downloadUrl gated + puente absolutizado', async () => {
    getSubmissionById.mockResolvedValue(submission())
    await sendEbookDeliveryEmail('fsub-1')
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const arg = sendEmailMock.mock.calls[0][0]

    expect(arg.emailType).toBe('growth_ebook_delivery')
    expect(arg.recipients[0].email).toBe('ana@empresa.com')
    expect(arg.context.ebookTitle).toBe('El fin de la web')
    expect(arg.context.ebookTagline).toBe('Marketing + IA.')
    expect(arg.context.downloadUrl).toContain('/api/public/growth/forms/efeonce-web-agentica-ebook/asset/fsub-1')
    expect(arg.context.bridgeUrl).toBe('https://think.efeoncepro.com/brand-visibility')
    expect(arg.sourceEventId).toBe('ebook_fsub-1')
  })
})
