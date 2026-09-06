import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { maskEmail, resolveInvitationAcceptanceUrl } from './delivery'

/**
 * TASK-1837 — La URL de aceptación sale del ORIGEN CONFIGURADO del emisor (registry de environments),
 * nunca de `NEXT_PUBLIC_APP_URL`: es el bug cross-env de TASK-1012/ISSUE-084 y no se replica acá.
 */
describe('TASK-1837 — invitation acceptance URL', () => {
  it('derives the landing from the environment issuer, ignoring NEXT_PUBLIC_APP_URL', () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL

    process.env.NEXT_PUBLIC_APP_URL = 'https://greenhouse.efeoncepro.com'

    try {
      const resolved = resolveInvitationAcceptanceUrl(
        { provider: 'efeonce_auth', issuerUrl: 'https://auth-staging.efeonce.org/' },
        'tok+en/with=chars'
      )

      expect(resolved).toEqual({
        ok: true,
        origin: 'https://auth-staging.efeonce.org',
        url: 'https://auth-staging.efeonce.org/i/tok%2Ben%2Fwith%3Dchars'
      })
      expect(JSON.stringify(resolved)).not.toContain('greenhouse.efeoncepro.com')
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL
      else process.env.NEXT_PUBLIC_APP_URL = previous
    }
  })

  it('refuses providers without an invitation landing and non-https issuers', () => {
    expect(resolveInvitationAcceptanceUrl({ provider: 'entra', issuerUrl: 'https://login.microsoftonline.com/x' }, 't')).toEqual({
      ok: false,
      errorCode: 'landing_unavailable'
    })
    expect(resolveInvitationAcceptanceUrl({ provider: 'efeonce_auth', issuerUrl: 'http://auth.efeonce.org' }, 't')).toEqual({
      ok: false,
      errorCode: 'issuer_invalid'
    })
  })

  it('the delivery module never references NEXT_PUBLIC_APP_URL nor any *_URL env var', () => {
    const source = readFileSync(resolve(__dirname, 'delivery.ts'), 'utf8')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

    expect(code).not.toMatch(/process\.env\.\w*URL/)
    expect(code).not.toContain('NEXT_PUBLIC_APP_URL')
  })

  it('masks recipient emails for responses and logs', () => {
    expect(maskEmail('ana.perez@cliente.cl')).toBe('a***@cliente.cl')
    expect(maskEmail('not-an-email')).toBe('***')
  })
})
