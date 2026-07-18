import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ExposureModule from '../exposure'
import type * as FlagsModule from '../flags'
import type * as StoreModule from '../store'
import type * as VisitorStateModule from '../visitor-state'

/**
 * TASK-1428 — integración del read público con suppression/kill switch: shadow no
 * altera el render (solo evidencia Tier B), enforcement excluye y hace claim atómico,
 * kill switch gana sobre TODO y produce `killed` (nunca un falso vacío), y la colisión
 * de prioridad queda registrada (fuente del signal `growth.cta.priority_collision`).
 */

const storeMock = vi.hoisted(() => ({
  getSurfaceBindingById: vi.fn(),
  listPublishedCandidates: vi.fn(),
  recordServerErrorEventOncePerDay: vi.fn(),
}))

const killSwitchMock = vi.hoisted(() => ({ getKillSwitchState: vi.fn() }))

const visitorStateMock = vi.hoisted(() => ({
  getVisitorStateRows: vi.fn(),
  claimInterruptiveImpression: vi.fn(),
}))

const exposureMock = vi.hoisted(() => ({ recordCtaExposureBatch: vi.fn() }))

const flagsMock = vi.hoisted(() => ({
  engineEnabled: true,
  enforcementEnabled: false,
}))

vi.mock('../store', async importOriginal => ({
  ...(await importOriginal<typeof StoreModule>()),
  getSurfaceBindingById: storeMock.getSurfaceBindingById,
  listPublishedCandidates: storeMock.listPublishedCandidates,
  recordServerErrorEventOncePerDay: storeMock.recordServerErrorEventOncePerDay,
}))

vi.mock('../kill-switch', () => ({ getKillSwitchState: killSwitchMock.getKillSwitchState }))

vi.mock('../visitor-state', async importOriginal => ({
  ...(await importOriginal<typeof VisitorStateModule>()),
  getVisitorStateRows: visitorStateMock.getVisitorStateRows,
  claimInterruptiveImpression: visitorStateMock.claimInterruptiveImpression,
}))

vi.mock('../exposure', async importOriginal => ({
  ...(await importOriginal<typeof ExposureModule>()),
  recordCtaExposureBatch: exposureMock.recordCtaExposureBatch,
}))

vi.mock('../flags', async importOriginal => ({
  ...(await importOriginal<typeof FlagsModule>()),
  isCtaEngineEnabled: () => flagsMock.engineEnabled,
  isCtaSuppressionEnforcementEnabled: () => flagsMock.enforcementEnabled,
}))

vi.mock('../action-router', () => ({
  resolveCtaAction: vi.fn(async () => ({
    ok: true,
    action: { kind: 'open_growth_form', formSlug: 'demo-form', formKey: 'gform-demo' },
  })),
}))

vi.mock('@/lib/growth/forms/embed-key', () => ({ verifyEmbedKeySecret: () => true }))

vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: vi.fn() }))

import { getArbitratedRenderContracts } from '../readers'

const SURFACE = {
  surface_id: 'csur-1',
  surface_kind: 'think',
  surface_name: 'Test surface',
  origin_allowlist_json: ['https://think.efeoncepro.com'],
  allowed_cta_slugs_json: [],
  embed_key_id: 'ek-1',
  embed_key_hash: 'hash',
  renderer_channel: 'stable',
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
}

const candidate = (overrides: Record<string, unknown> = {}) => ({
  cta_version_id: 'cver-1',
  cta_id: 'cdef-1',
  version: 1,
  status: 'published',
  locale: 'es-CL',
  placement: 'embedded',
  style_variant: null,
  copy_refs_json: {},
  content_json: { headline: 'Hola', ctaLabel: 'Ir' },
  visual_asset_ref: null,
  action_policy_json: { kind: 'open_growth_form', formRef: 'demo-form' },
  targeting_policy_json: { routes: ['/**'], excludeRoutes: [] },
  suppression_policy_json: {},
  priority_policy_json: { score: 100 },
  analytics_policy_json: {},
  experiment_policy_json: {},
  published_at: new Date(),
  created_at: new Date(),
  slug: 'cta-uno',
  campaign_slug: null,
  default_locale: 'es-CL',
  ...overrides,
})

const renderInput = (visitorContext?: {
  visitorKey: string | null
  sessionKey: string | null
  consentState: 'granted' | 'denied' | 'unknown'
  consentSource: string
}) => ({
  surfaceId: 'csur-1',
  embedKey: 'secret',
  origin: 'https://think.efeoncepro.com',
  route: '/blog/post',
  visitorContext,
})

const grantedContext = {
  visitorKey: 'vk-1',
  sessionKey: 'sk-1',
  consentState: 'granted' as const,
  consentSource: 'host_cmp',
}

const dismissedStateRow = (subjectKind: 'visitor' | 'session', ctaId: string | null) => ({
  state_id: `cvst-${subjectKind}`,
  subject_kind: subjectKind,
  subject_hash: 'h',
  cta_id: ctaId,
  last_dismissed_at: new Date(),
  dismiss_count: 1,
  converted_at: null,
  conversion_ref: null,
  window_started_at: null,
  impressions_in_window: 0,
  last_impression_at: null,
  consent_state: 'granted',
  created_at: new Date(),
  updated_at: new Date(),
})

beforeEach(() => {
  vi.clearAllMocks()
  flagsMock.engineEnabled = true
  flagsMock.enforcementEnabled = false
  storeMock.getSurfaceBindingById.mockResolvedValue(SURFACE)
  killSwitchMock.getKillSwitchState.mockResolvedValue({ globalKilled: false, killedSurfaceIds: [] })
  visitorStateMock.getVisitorStateRows.mockResolvedValue([])
  visitorStateMock.claimInterruptiveImpression.mockResolvedValue({ granted: true })
})

describe('getArbitratedRenderContracts — kill switch (§16.3)', () => {
  it('global kill → resultado vacío con engineState=killed (nunca un falso vacío) + evidencia Tier B', async () => {
    killSwitchMock.getKillSwitchState.mockResolvedValue({ globalKilled: true, killedSurfaceIds: [] })
    storeMock.listPublishedCandidates.mockResolvedValue([candidate()])

    const outcome = await getArbitratedRenderContracts(renderInput())

    expect(outcome).toEqual({
      outcome: 'ok',
      result: { interruptive: null, nonInterruptive: [], engineState: 'killed' },
    })

    expect(storeMock.listPublishedCandidates).not.toHaveBeenCalled()

    expect(exposureMock.recordCtaExposureBatch).toHaveBeenCalledWith([
      expect.objectContaining({ exposureKind: 'suppressed', reasonClass: 'global_killed', enforced: true }),
    ])
  })

  it('surface kill → killed solo para esa surface', async () => {
    killSwitchMock.getKillSwitchState.mockResolvedValue({ globalKilled: false, killedSurfaceIds: ['csur-1'] })

    const outcome = await getArbitratedRenderContracts(renderInput())

    expect(outcome.outcome === 'ok' && outcome.result.engineState).toBe('killed')

    expect(exposureMock.recordCtaExposureBatch).toHaveBeenCalledWith([
      expect.objectContaining({ reasonClass: 'surface_killed' }),
    ])
  })
})

describe('getArbitratedRenderContracts — shadow (enforcement OFF, default)', () => {
  it('un CTA dismissed se SIGUE renderizando, pero la decisión queda en Tier B (enforced=false)', async () => {
    storeMock.listPublishedCandidates.mockResolvedValue([candidate()])

    visitorStateMock.getVisitorStateRows.mockResolvedValue([
      dismissedStateRow('visitor', 'cdef-1'),
    ])

    const outcome = await getArbitratedRenderContracts(renderInput(grantedContext))

    expect(outcome.outcome).toBe('ok')

    if (outcome.outcome === 'ok') {
      expect(outcome.result.nonInterruptive).toHaveLength(1)
      expect(outcome.result.engineState).toBe('ok')
    }

    expect(exposureMock.recordCtaExposureBatch).toHaveBeenCalledWith([
      expect.objectContaining({ exposureKind: 'suppressed', reasonClass: 'dismissed', enforced: false }),
    ])

    expect(visitorStateMock.claimInterruptiveImpression).not.toHaveBeenCalled()
  })
})

describe('getArbitratedRenderContracts — enforcement ON', () => {
  beforeEach(() => {
    flagsMock.enforcementEnabled = true
  })

  it('un CTA dismissed queda EXCLUIDO del render (refresh/remount no lo reabre)', async () => {
    storeMock.listPublishedCandidates.mockResolvedValue([candidate()])
    visitorStateMock.getVisitorStateRows.mockResolvedValue([dismissedStateRow('session', 'cdef-1')])

    const outcome = await getArbitratedRenderContracts(renderInput(grantedContext))

    expect(outcome.outcome === 'ok' && outcome.result.nonInterruptive).toHaveLength(0)

    expect(exposureMock.recordCtaExposureBatch).toHaveBeenCalledWith([
      expect.objectContaining({ exposureKind: 'suppressed', reasonClass: 'dismissed', enforced: true }),
    ])
  })

  it('interruptivo SIN visitor context → suppressed consent_or_identity_limited (fallback conservador)', async () => {
    storeMock.listPublishedCandidates.mockResolvedValue([candidate({ placement: 'slide_in' })])

    const outcome = await getArbitratedRenderContracts(renderInput())

    expect(outcome.outcome === 'ok' && outcome.result.interruptive).toBeNull()

    expect(exposureMock.recordCtaExposureBatch).toHaveBeenCalledWith([
      expect.objectContaining({ reasonClass: 'consent_or_identity_limited', enforced: true }),
    ])
  })

  it('interruptivo elegible gana el claim atómico y se sirve', async () => {
    storeMock.listPublishedCandidates.mockResolvedValue([candidate({ placement: 'slide_in' })])

    const outcome = await getArbitratedRenderContracts(renderInput(grantedContext))

    expect(outcome.outcome === 'ok' && outcome.result.interruptive?.cta.slug).toBe('cta-uno')

    expect(visitorStateMock.claimInterruptiveImpression).toHaveBeenCalledWith(
      expect.objectContaining({ ctaId: 'cdef-1', maxImpressionsPerWindow: 2, windowHours: 24 }),
    )
  })

  it('claim perdido (multi-tab race) → el interruptivo NO se sirve (capped)', async () => {
    storeMock.listPublishedCandidates.mockResolvedValue([candidate({ placement: 'slide_in' })])
    visitorStateMock.claimInterruptiveImpression.mockResolvedValue({ granted: false })

    const outcome = await getArbitratedRenderContracts(renderInput(grantedContext))

    expect(outcome.outcome === 'ok' && outcome.result.interruptive).toBeNull()

    expect(exposureMock.recordCtaExposureBatch).toHaveBeenCalledWith([
      expect.objectContaining({ exposureKind: 'suppressed', reasonClass: 'frequency_capped', enforced: true }),
    ])
  })

  it('colisión: el interruptivo perdedor queda registrado como higher_priority_selected', async () => {
    storeMock.listPublishedCandidates.mockResolvedValue([
      candidate({ placement: 'slide_in', priority_policy_json: { score: 200 } }),
      candidate({
        cta_id: 'cdef-2',
        cta_version_id: 'cver-2',
        slug: 'cta-dos',
        placement: 'popup_modal',
        priority_policy_json: { score: 100 },
      }),
    ])

    const outcome = await getArbitratedRenderContracts(renderInput(grantedContext))

    expect(outcome.outcome === 'ok' && outcome.result.interruptive?.cta.slug).toBe('cta-uno')

    const batch = exposureMock.recordCtaExposureBatch.mock.calls[0][0] as Array<Record<string, unknown>>

    expect(batch).toContainEqual(
      expect.objectContaining({ ctaId: 'cdef-2', reasonClass: 'higher_priority_selected' }),
    )
  })
})

describe('getArbitratedRenderContracts — flag OFF', () => {
  it('motor apagado → disabled (sin tocar kill switch ni candidatos)', async () => {
    flagsMock.engineEnabled = false

    const outcome = await getArbitratedRenderContracts(renderInput())

    expect(outcome).toEqual({ outcome: 'disabled' })
    expect(killSwitchMock.getKillSwitchState).not.toHaveBeenCalled()
  })
})
