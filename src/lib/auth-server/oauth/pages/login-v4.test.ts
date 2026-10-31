import { describe, expect, it } from 'vitest'

import { renderLoginPageResponse } from '../../persons/pages'
import { AUTH_LOGIN_STAGE_ASSETS } from './login-stage.generated'
import { buildLoginStageAssets } from '../../../../../scripts/auth-server/generate-login-stage-assets'
import type { LoginAnnouncementDto } from '@/lib/login-announcements/types'

const render = (input = {}) => renderLoginPageResponse(200, { returnTo: null, ...input }).body
const announcement: LoginAnnouncementDto = { id: 'fixture', kind: 'text', serviceLine: 'brand', tabLabel: 'Novedad', kicker: null, title: '<script>untrusted</script>', body: null, cta: { label: 'Abrir', url: 'javascript:alert(1)' }, image: { path: '/images/login/announcement-brand.webp', alt: 'Foto aprobada' }, lens: { x: 50, y: 30, radiusRatio: 0.24 } }

describe('issuer V4 presentation boundary', () => {
  it('uses neutral identity and only implemented authentication methods', () => {
    const html = render()

    expect(html).toContain('Entra a Efeonce')
    expect(html).toContain('data-login-passkey')
    expect(html).toContain('/auth/magic-link/request')
    expect(html).not.toContain('type="password"')
    expect(html).not.toContain('Continuar con Google')
    expect(html).not.toContain('Volver a Rooms')
  })
  it('escapes server-resolved product copy and never interpolates an unsafe return', () => {
    const html = render({ productContext: { product: 'rooms', displayName: '<Rooms>', returnUrl: 'javascript:alert(1)' } })

    expect(html).toContain('Entra a &lt;Rooms&gt;')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('<Rooms>')
    expect(render({ productContext: { product: 'rooms', displayName: 'Rooms', returnUrl: 'https://user:pass@rooms.efeonce.org' } })).not.toContain('user:pass@')
    expect(render({ productContext: { product: 'rooms', displayName: 'Rooms', returnUrl: 'https://rooms.efeonce.org' } })).toContain('href="https://rooms.efeonce.org/"')
  })
  it('bundles only reviewed photos and retains fallback for unreviewed image URLs', () => {
    expect(AUTH_LOGIN_STAGE_ASSETS).toEqual(buildLoginStageAssets(process.cwd()))
    const html = render({ announcements: [{ ...announcement, image: { path: 'https://remote.invalid/image.webp', alt: 'Remote' } }] })

    expect(html).toContain('/images/login/stage-default.webp')
    expect(html).not.toContain('https://remote.invalid')
    expect(html).not.toContain('data-login-carousel aria-label')
  })
  it('escapes editorial content and rejects unsafe editorial schemes', () => {
    const html = render({ announcements: [announcement] })

    expect(html).toContain('&lt;script&gt;untrusted&lt;/script&gt;')
    expect(html).not.toContain('javascript:alert')
    expect(html).toContain('data-login-lens')
    expect(html).not.toContain('style=')
  })
})
