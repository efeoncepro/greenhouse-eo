import { describe, expect, it, vi } from 'vitest'

import { createCachedLoginAnnouncementsLoader, loadPublicLoginAnnouncements } from './login-announcements'

const approved = {
  id: 'published-1', kind: 'text', serviceLine: 'engine', tabLabel: 'Engine',
  kicker: 'Novedad', title: 'Una novedad real', body: 'Contenido publicado',
  cta: { label: 'Conocer', url: 'https://efeoncepro.com/' },
  image: { path: '/images/login/announcement-ai-visibility-report.webp', alt: 'Fotografía aprobada' },
  lens: { x: 52, y: 32, radiusRatio: 0.24 }
}

describe('public login announcements for the issuer', () => {
  it('reads only the portal public presentation endpoint and approved bundled assets', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ announcements: [
      approved,
      { ...approved, id: 'remote', image: { path: 'https://example.test/photo.webp', alt: 'Untrusted' } },
      { ...approved, id: 'unsafe', cta: { label: 'Abrir', url: 'javascript:alert(1)' } }
    ] }), { status: 200 })) as unknown as typeof fetch

    expect(await loadPublicLoginAnnouncements(fetcher)).toEqual([approved])
    expect(fetcher).toHaveBeenCalledWith('https://greenhouse.efeoncepro.com/api/public/login-announcements',
      expect.objectContaining({ headers: { Accept: 'application/json' }, signal: expect.any(AbortSignal), redirect: 'error' }))
  })

  it('keeps sign-in available when the editorial reader fails or returns malformed data', async () => {
    expect(await loadPublicLoginAnnouncements(vi.fn(async () => { throw new Error('offline') }) as unknown as typeof fetch)).toEqual([])
    expect(await loadPublicLoginAnnouncements(vi.fn(async () => new Response('{', { status: 200 })) as unknown as typeof fetch)).toEqual([])
    expect(await loadPublicLoginAnnouncements(vi.fn(async () => new Response('unavailable', { status: 503 })) as unknown as typeof fetch)).toEqual([])
  })

  it('keeps portal-relative CTAs and rejects protocol-relative destinations', async () => {
    const relative = { ...approved, cta: { label: 'Ver servicio', url: '/servicios/aeo' } }
    const unsafe = { ...approved, id: 'unsafe', cta: { label: 'Salir', url: '//evil.example' } }
    const backslash = { ...approved, id: 'backslash', cta: { label: 'Salir', url: '/\\evil.example' } }
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ announcements: [relative, unsafe, backslash] }))) as unknown as typeof fetch

    expect(await loadPublicLoginAnnouncements(fetcher)).toEqual([relative])
  })

  it('falls back when the public feed exceeds its response budget', async () => {
    const oversized = JSON.stringify({ announcements: [approved], padding: 'x'.repeat(16_384) })
    const fetcher = vi.fn(async () => new Response(oversized)) as unknown as typeof fetch

    expect(await loadPublicLoginAnnouncements(fetcher)).toEqual([])
  })

  it('coalesces concurrent login reads and bounds upstream refreshes', async () => {
    let clock = 0
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ announcements: [approved] }))) as unknown as typeof fetch
    const load = createCachedLoginAnnouncementsLoader(fetcher, () => clock)

    const reads = await Promise.all(Array.from({ length: 20 }, () => load()))

    expect(reads).toEqual(Array.from({ length: 20 }, () => [approved]))
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(await load()).toEqual([approved])
    expect(fetcher).toHaveBeenCalledTimes(1)

    clock = 30_001
    expect(await load()).toEqual([approved])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
