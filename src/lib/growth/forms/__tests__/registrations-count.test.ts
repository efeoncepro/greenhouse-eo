/**
 * TASK-2053 Slice 3 — Conteo público de reservas: redondeo, umbral, caché y rate limit.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  getFormDefinitionByKey: vi.fn(),
  getPublishedVersionBySlug: vi.fn(),
  getFormDefinitionById: vi.fn(),
  countConfirmedRegistrations: vi.fn()
}))

vi.mock('../store', async importOriginal => ({ ...(await importOriginal<Record<string, unknown>>()), ...store }))

import {
  countAcceptedRegistrations,
  presentRegistrationsCount,
  REGISTRATIONS_COUNT_CACHE_MAX_ENTRIES,
  REGISTRATIONS_COUNT_HIDDEN,
  resetRegistrationsCountCache
} from '../readers'
import { createPublicReadRateLimiter } from '../public-read-rate-limit'

const definition = (overrides: Record<string, unknown> = {}) => ({
  form_id: 'fdef-webinar',
  form_key: '00000000-0000-4000-8000-000000000210',
  slug: 'webinar-aeo',
  form_kind: 'event_registration',
  status: 'active',
  ...overrides
})

const publishedVersion = (eventRegistration: Record<string, unknown> | undefined) => ({
  form_version_id: 'fver-webinar-1',
  form_id: 'fdef-webinar',
  ui_policy_json: { composition: 'static', ...(eventRegistration ? { eventRegistration } : {}) }
})

beforeEach(() => {
  resetRegistrationsCountCache()
  Object.values(store).forEach(fn => fn.mockReset())
  store.getFormDefinitionById.mockResolvedValue(definition())
})

describe('TASK-2053 · presentación del conteo', () => {
  it.each([
    [312, 25, { count: 310, display: '310', shown: true }],
    [30, 25, { count: 30, display: '30', shown: true }],
    [1249, 25, { count: 1240, display: '1.240', shown: true }]
  ])('%i reservas con umbral %i se muestran redondeadas a la decena', (confirmed, threshold, expected) => {
    expect(presentRegistrationsCount(confirmed, threshold)).toEqual(expected)
  })

  it.each([
    [0, 25],
    [24, 25],
    [29, 25] // 29 → 20 < 25: el umbral aplica al valor redondeado, nunca se muestra menos del umbral
  ])('%i reservas con umbral %i quedan ocultas y sin número', (confirmed, threshold) => {
    expect(presentRegistrationsCount(confirmed, threshold)).toEqual(REGISTRATIONS_COUNT_HIDDEN)
  })
})

describe('TASK-2053 · reader countAcceptedRegistrations', () => {
  it('devuelve el conteo redondeado de un evento que lo muestra', async () => {
    store.getPublishedVersionBySlug.mockResolvedValue(publishedVersion({ showRegistrationsCount: true }))
    store.countConfirmedRegistrations.mockResolvedValue(312)

    await expect(countAcceptedRegistrations('webinar-aeo')).resolves.toEqual({ count: 310, display: '310', shown: true })
    expect(store.countConfirmedRegistrations).toHaveBeenCalledWith('fdef-webinar', 'registration_status')
  })

  it('un evento sin showRegistrationsCount no consulta el conteo', async () => {
    store.getPublishedVersionBySlug.mockResolvedValue(publishedVersion({ capacity: 100 }))

    await expect(countAcceptedRegistrations('webinar-aeo')).resolves.toEqual(REGISTRATIONS_COUNT_HIDDEN)
    expect(store.countConfirmedRegistrations).not.toHaveBeenCalled()
  })

  it('un formulario que no es de evento queda oculto', async () => {
    store.getFormDefinitionById.mockResolvedValue(definition({ form_kind: 'subscribe' }))
    store.getPublishedVersionBySlug.mockResolvedValue(publishedVersion({ showRegistrationsCount: true }))

    await expect(countAcceptedRegistrations('webinar-aeo')).resolves.toEqual(REGISTRATIONS_COUNT_HIDDEN)
  })

  it('formulario inexistente o inactivo → null (404)', async () => {
    store.getPublishedVersionBySlug.mockResolvedValue(null)
    await expect(countAcceptedRegistrations('no-existe')).resolves.toBeNull()

    store.getPublishedVersionBySlug.mockResolvedValue(publishedVersion({ showRegistrationsCount: true }))
    store.getFormDefinitionById.mockResolvedValue(definition({ status: 'archived' }))
    await expect(countAcceptedRegistrations('archivado')).resolves.toBeNull()
  })

  it('resuelve por form_key', async () => {
    store.getFormDefinitionByKey.mockResolvedValue(definition())
    store.getPublishedVersionBySlug.mockResolvedValue(publishedVersion({ showRegistrationsCount: true }))
    store.countConfirmedRegistrations.mockResolvedValue(40)

    await expect(countAcceptedRegistrations('00000000-0000-4000-8000-000000000210')).resolves.toMatchObject({ count: 40 })
    expect(store.getPublishedVersionBySlug).toHaveBeenCalledWith('webinar-aeo')
  })

  it('cachea 10 minutos por formRef: una ráfaga no vuelve a la base', async () => {
    let at = 1_000_000
    const now = () => at

    store.getPublishedVersionBySlug.mockResolvedValue(publishedVersion({ showRegistrationsCount: true }))
    store.countConfirmedRegistrations.mockResolvedValueOnce(312).mockResolvedValueOnce(455)

    for (let i = 0; i < 20; i += 1) await countAcceptedRegistrations('webinar-aeo', { now })
    expect(store.getPublishedVersionBySlug).toHaveBeenCalledTimes(1)
    expect(store.countConfirmedRegistrations).toHaveBeenCalledTimes(1)

    at += 10 * 60 * 1000 - 1
    await expect(countAcceptedRegistrations('webinar-aeo', { now })).resolves.toMatchObject({ count: 310 })

    at += 2
    await expect(countAcceptedRegistrations('webinar-aeo', { now })).resolves.toMatchObject({ count: 450 })
    expect(store.countConfirmedRegistrations).toHaveBeenCalledTimes(2)
  })

  it('la caché tiene tope: refs aleatorias no la hacen crecer sin límite', async () => {
    store.getPublishedVersionBySlug.mockResolvedValue(null)

    for (let i = 0; i < REGISTRATIONS_COUNT_CACHE_MAX_ENTRIES + 20; i += 1) await countAcceptedRegistrations(`ref-${i}`)

    // La primera ya fue desalojada: se vuelve a resolver.
    store.getPublishedVersionBySlug.mockClear()
    await countAcceptedRegistrations('ref-0')
    expect(store.getPublishedVersionBySlug).toHaveBeenCalledTimes(1)

    // Una reciente sigue en caché.
    store.getPublishedVersionBySlug.mockClear()
    await countAcceptedRegistrations(`ref-${REGISTRATIONS_COUNT_CACHE_MAX_ENTRIES + 19}`)
    expect(store.getPublishedVersionBySlug).not.toHaveBeenCalled()
  })
})

describe('TASK-2053 · rate limit por IP de lecturas públicas', () => {
  it('ventana fija por IP con Retry-After', () => {
    let at = 0
    const limiter = createPublicReadRateLimiter({ windowMs: 60_000, maxRequests: 3, now: () => at })

    expect([1, 2, 3].map(() => limiter.check('203.0.113.7').allowed)).toEqual([true, true, true])
    expect(limiter.check('203.0.113.7')).toEqual({ allowed: false, retryAfterSeconds: 60 })
    expect(limiter.check('198.51.100.2').allowed).toBe(true)

    at = 45_000
    expect(limiter.check('203.0.113.7')).toEqual({ allowed: false, retryAfterSeconds: 15 })

    at = 60_000
    expect(limiter.check('203.0.113.7').allowed).toBe(true)
  })

  it('el tope de claves desaloja la ventana más antigua', () => {
    const limiter = createPublicReadRateLimiter({ windowMs: 60_000, maxRequests: 1, maxKeys: 2, now: () => 0 })

    limiter.check('a')
    expect(limiter.check('a').allowed).toBe(false)
    limiter.check('b')
    limiter.check('c') // desaloja «a»
    expect(limiter.check('a').allowed).toBe(true)
  })
})
