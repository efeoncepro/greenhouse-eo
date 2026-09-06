import { describe, expect, it } from 'vitest'

import { renderConsentPage } from './render'

const baseInput = {
  organizations: [{ organizationName: 'Cliente Uno', capabilities: ['efeonce.mcp.read'] }],
  clientName: 'Claude Desktop',
  clientId: 'https://client.example/cimd.json',
  scopes: ['efeonce.mcp.read'],
  returnTo: '/oauth/authorize?client_id=x',
  actionPath: '/oauth/consent'
}

/**
 * TASK-1837 — El consentimiento muestra el HOST del `redirect_uri` (MUST del protocolo: la persona
 * ve a dónde se envía el código). Renderizar sin host es un error, no un render incompleto.
 */
describe('TASK-1837 — consent page discloses the redirect host', () => {
  it('renders the redirect host, escaped, with its label', () => {
    const html = renderConsentPage({ ...baseInput, redirectHost: 'localhost:3000<x>' })

    expect(html).toContain('data-capture="id-redirect-host"')
    expect(html).toContain('Destino de la autorización')
    expect(html).toContain('localhost:3000&lt;x&gt;')
    expect(html).not.toContain('localhost:3000<x>')
  })

  it('fails when rendered without a redirect host', () => {
    expect(() => renderConsentPage({ ...baseInput, redirectHost: '' })).toThrow(/redirectHost/)
    expect(() => renderConsentPage({ ...baseInput, redirectHost: undefined as unknown as string })).toThrow(/redirectHost/)
  })
})
