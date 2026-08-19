import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { GET } from './route'

describe('/public/assessment/access bootstrap', () => {
  it('borra el fragmento antes de cualquier fetch, render dinámico o telemetría', async () => {
    const response = await GET(new Request('https://greenhouse.local/public/assessment/access', {
      headers: { 'x-assessment-csp-nonce': 'nonce-1' },
    }))

    const html = await response.text()
    const replaceIndex = html.indexOf('history.replaceState')
    const fetchIndex = html.indexOf("fetch('/api/public/assessment/access/exchange'")

    expect(replaceIndex).toBeGreaterThan(0)
    expect(fetchIndex).toBeGreaterThan(replaceIndex)
    expect(html).not.toContain('localStorage')
    expect(html).not.toContain('sessionStorage')
    expect(html).not.toContain('data-access')
    expect(html).not.toContain('dangerouslySetInnerHTML')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('pragma')).toBe('no-cache')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  })

  it('solo acepta un fragmento compuesto por la clave access', async () => {
    const response = await GET(new Request('https://greenhouse.local/public/assessment/access'))
    const html = await response.text()

    expect(html).toContain("raw.startsWith('#access=')")
    expect(html).toContain('Array.from(params.keys()).length===1')
    expect(html).toContain("'/public/assessment/session?unavailable=1'")
    expect(html).not.toContain('location.href')
  })
})
