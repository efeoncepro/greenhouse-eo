import { describe, expect, it } from 'vitest'

import { parseFirstPartyRegistration } from './admin-input'

const registration = { clientId: 'efeonce-rp-rooms-test', product: 'rooms', redirectUris: ['https://rooms.example/callback'] }

describe('first-party administrative input', () => {
  it('uses the authenticated actor and typed policy', () => {
    expect(parseFirstPartyRegistration(registration, 'operator')).toEqual({ ...registration, actor: 'operator' })
  })
  it.each([
    { ...registration, actor: 'forged' },
    { ...registration, allowedScopes: ['efeonce.mcp.read'] },
    { ...registration, displayName: 'Other product' },
    { ...registration, allowLocalDevelopment: 'false' },
    { ...registration, tokenEndpointAuthMethod: 'none' },
    { ...registration, product: '__proto__' },
    { ...registration, sessionMaxAgeSeconds: 0 },
    { ...registration, redirectUris: [] }
  ])('rejects untrusted authority or malformed policy: %j', body => {
    expect(() => parseFirstPartyRegistration(body, 'operator')).toThrow()
  })
})
