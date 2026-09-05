import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { EFEONCE_ISOTIPO_SVG } from './efeonce-isotipo.generated'
import { AUTH_SERVER_STYLES } from './styles.generated'
import { createAuthServerStyles } from '../../../../../scripts/auth-server/styles'
import { buildAuthFontAssets } from '../../../../../scripts/auth-server/generate-font-assets'
import { AUTH_FONT_ASSETS, AUTH_FONT_LICENSES } from './fonts.generated'
import { generateStepUpController } from '../../../../../scripts/auth-server/step-up-controller-build'
import { escapeHtml, renderConsentPage, renderErrorPage, renderLoginRequiredPage } from './render'

/**
 * Drift guard: la constante bundleada del isotipo debe ser byte-idéntica al SSOT del repo. Si este
 * test falla, el mecanismo es `pnpm auth-server:brand-assets:generate` (nunca editar el generado).
 */
describe('auth-server brand assets', () => {
  it('browser controller artifact matches its build-time sources', async () => {
    await generateStepUpController(true)
  })
  it('bundled fonts and notices match the canonical local assets', () => {
    const generated = buildAuthFontAssets(process.cwd())

    expect(AUTH_FONT_ASSETS).toEqual(generated.fonts)
    expect(AUTH_FONT_LICENSES).toEqual(generated.licenses)
  })
  it('generated CSS matches the canonical token builder used by the preview', () => {
    // Artifact drift only. Visual/layout behavior is verified by TASK-1835 GVC, not string matching.
    expect(AUTH_SERVER_STYLES).toBe(createAuthServerStyles())
  })
  it('the bundled isotype matches public/branding/SVG/isotipo-full-efeonce.svg', () => {
    const source = readFileSync(join(process.cwd(), 'public/branding/SVG/isotipo-full-efeonce.svg'), 'utf8')
      .replace(/^<\?xml[^>]*>\s*/u, '')
      .trim()

    expect(EFEONCE_ISOTIPO_SVG).toBe(source)
  })

  it('pages embed the brand and escape untrusted strings', () => {
    const consent = renderConsentPage({
      organizations: [{ organizationName: '<Org>', capabilities: ['<cap>'] }],
      clientName: '<script>alert(1)</script>',
      clientId: 'https://client.example/cimd.json',
      scopes: ['efeonce.mcp.read', 'efeonce.mcp.seo.write'],
      returnTo: '/oauth/authorize?client_id=x&state="y"',
      actionPath: '/oauth/consent'
    })

    expect(consent).toContain('&lt;Org&gt;')
    expect(consent).toContain('&lt;cap&gt;')
    expect(consent).not.toContain('<Org>')
    expect(consent).toContain('<svg')
    expect(consent).not.toContain('<script>alert(1)</script>')
    expect(consent).toContain('&lt;script&gt;')
    expect(consent).toContain('name="return_to" value="/oauth/authorize?client_id=x&amp;state=&quot;y&quot;"')
    expect(consent).toContain('efeonce.mcp.seo.write')
    expect(renderLoginRequiredPage()).toContain('lang="es-CL"')
    expect(renderErrorPage('invalid_client')).toContain('invalid_client')
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})
