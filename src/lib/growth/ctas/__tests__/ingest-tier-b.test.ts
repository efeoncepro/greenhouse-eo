import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ExposureModule from '../exposure'
import type * as StoreModule from '../store'
import type * as VisitorStateModule from '../visitor-state'

/**
 * TASK-1428 — ingest público: routing Tier B (`viewed` → rollup, JAMÁS ledger),
 * rechazos Tier B sin escritura al ledger (CHECK Tier A-only), y hooks de visitor
 * state (dismiss persiste al aceptar; conversión SOLO con submission verificada
 * server-side contra Growth Forms).
 */

const storeMock = vi.hoisted(() => ({
  getSurfaceBindingById: vi.fn(),
  getCtaDefinitionBySlug: vi.fn(),
  getCtaVersionById: vi.fn(),
  insertConversionEvent: vi.fn(),
  countAcceptedEventsByHash: vi.fn(),
  countRejectedEventsByIp: vi.fn(),
  findRecentDuplicateEvent: vi.fn(),
}))

const exposureMock = vi.hoisted(() => ({ recordCtaExposure: vi.fn() }))

const visitorStateMock = vi.hoisted(() => ({
  recordCtaDismissal: vi.fn(),
  recordCtaConversion: vi.fn(),
}))

const formsReadersMock = vi.hoisted(() => ({ isSubmissionServerAccepted: vi.fn() }))

vi.mock('../store', async importOriginal => ({
  ...(await importOriginal<typeof StoreModule>()),
  ...storeMock,
}))

vi.mock('../exposure', async importOriginal => ({
  ...(await importOriginal<typeof ExposureModule>()),
  recordCtaExposure: exposureMock.recordCtaExposure,
}))

vi.mock('../visitor-state', async importOriginal => ({
  ...(await importOriginal<typeof VisitorStateModule>()),
  recordCtaDismissal: visitorStateMock.recordCtaDismissal,
  recordCtaConversion: visitorStateMock.recordCtaConversion,
}))

vi.mock('@/lib/growth/forms/embed-key', () => ({ verifyEmbedKeySecret: () => true }))

vi.mock('@/lib/growth/forms/readers', () => ({
  isSubmissionServerAccepted: formsReadersMock.isSubmissionServerAccepted,
}))

vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: vi.fn() }))

import { ingestCtaEvent } from '../ingest'

const SURFACE = {
  surface_id: 'csur-1',
  surface_kind: 'think',
  surface_name: 'Test',
  origin_allowlist_json: ['https://think.efeoncepro.com'],
  allowed_cta_slugs_json: [],
  embed_key_id: 'ek-1',
  embed_key_hash: 'hash',
  renderer_channel: 'stable',
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
}

const DEFINITION = { cta_id: 'cdef-1', slug: 'cta-uno', status: 'active' }
const VERSION = { cta_version_id: 'cver-1', cta_id: 'cdef-1', status: 'published', placement: 'embedded' }

const CONTEXT = { origin: 'https://think.efeoncepro.com', ip: '200.1.2.3' }

const eventInput = (overrides: Record<string, unknown> = {}) => ({
  surfaceId: 'csur-1',
  embedKey: 'secret',
  ctaSlug: 'cta-uno',
  ctaVersionId: 'cver-1',
  eventKind: 'clicked',
  visitorKey: 'vk-1',
  sessionKey: 'sk-1',
  consentState: 'granted',
  consentSource: 'host_cmp',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GROWTH_CTA_ENGINE_ENABLED = 'true'
  storeMock.getSurfaceBindingById.mockResolvedValue(SURFACE)
  storeMock.getCtaDefinitionBySlug.mockResolvedValue(DEFINITION)
  storeMock.getCtaVersionById.mockResolvedValue(VERSION)
  storeMock.insertConversionEvent.mockResolvedValue({ eventId: 'cevt-1' })
  storeMock.countAcceptedEventsByHash.mockResolvedValue(0)
  storeMock.countRejectedEventsByIp.mockResolvedValue(0)
  storeMock.findRecentDuplicateEvent.mockResolvedValue(null)
  exposureMock.recordCtaExposure.mockResolvedValue({ sampled: true })
  formsReadersMock.isSubmissionServerAccepted.mockResolvedValue(true)
})

describe('ingest Tier B (`viewed`)', () => {
  it('viewed autorizado → rollup agregado, JAMÁS el ledger OLTP (arch §9.4)', async () => {
    const result = await ingestCtaEvent(eventInput({ eventKind: 'viewed' }), CONTEXT)

    expect(result).toEqual({ outcome: 'accepted' })

    expect(exposureMock.recordCtaExposure).toHaveBeenCalledWith(
      expect.objectContaining({ exposureKind: 'viewed', decisionSource: 'browser', ctaId: 'cdef-1' }),
    )

    expect(storeMock.insertConversionEvent).not.toHaveBeenCalled()
  })

  it('viewed forjado (surface desconocida) → 403 SIN escribir el ledger de rechazos', async () => {
    storeMock.getSurfaceBindingById.mockResolvedValue(null)

    const result = await ingestCtaEvent(eventInput({ eventKind: 'viewed' }), CONTEXT)

    expect(result).toEqual({ outcome: 'surface_unauthorized' })
    expect(storeMock.insertConversionEvent).not.toHaveBeenCalled()
    expect(exposureMock.recordCtaExposure).not.toHaveBeenCalled()
  })
})

describe('hooks de visitor state (Tier A aceptado)', () => {
  it('dismissed aceptado → persiste el dismiss (antes de la salida visual)', async () => {
    const result = await ingestCtaEvent(eventInput({ eventKind: 'dismissed' }), CONTEXT)

    expect(result.outcome).toBe('accepted')

    expect(visitorStateMock.recordCtaDismissal).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ kind: 'visitor' }), expect.objectContaining({ kind: 'session' })]),
      'cdef-1',
      'granted',
    )
  })

  it('sin consent → el dismiss se persiste SOLO bajo session (sin fingerprint durable)', async () => {
    await ingestCtaEvent(eventInput({ eventKind: 'dismissed', consentState: 'unknown' }), CONTEXT)

    const subjects = visitorStateMock.recordCtaDismissal.mock.calls[0][0] as Array<{ kind: string }>

    expect(subjects.map(subject => subject.kind)).toEqual(['session'])
  })

  it('form_submitted con submission VERIFICADA → marca conversión', async () => {
    await ingestCtaEvent(eventInput({ eventKind: 'form_submitted', formSubmissionId: 'fsub-1' }), CONTEXT)

    expect(formsReadersMock.isSubmissionServerAccepted).toHaveBeenCalledWith('fsub-1')

    expect(visitorStateMock.recordCtaConversion).toHaveBeenCalledWith(
      expect.anything(),
      'cdef-1',
      'fsub-1',
      'granted',
    )
  })

  it('form_submitted NO verificable → NO suprime (un claim browser jamás suprime permanente)', async () => {
    formsReadersMock.isSubmissionServerAccepted.mockResolvedValue(false)

    const result = await ingestCtaEvent(
      eventInput({ eventKind: 'form_submitted', formSubmissionId: 'fsub-falso' }),
      CONTEXT,
    )

    expect(result.outcome).toBe('accepted')
    expect(visitorStateMock.recordCtaConversion).not.toHaveBeenCalled()
  })

  it('clicked NO toca visitor state', async () => {
    await ingestCtaEvent(eventInput({ eventKind: 'clicked' }), CONTEXT)

    expect(visitorStateMock.recordCtaDismissal).not.toHaveBeenCalled()
    expect(visitorStateMock.recordCtaConversion).not.toHaveBeenCalled()
  })

  it('un fallo del hook de estado NO rompe el ingest aceptado (best-effort)', async () => {
    visitorStateMock.recordCtaDismissal.mockRejectedValue(new Error('pg down'))

    const result = await ingestCtaEvent(eventInput({ eventKind: 'dismissed' }), CONTEXT)

    expect(result).toEqual({ outcome: 'accepted', eventId: 'cevt-1' })
  })
})
