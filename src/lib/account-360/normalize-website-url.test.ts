import { describe, expect, it } from 'vitest'

import { normalizeWebsiteUrl } from './normalize-website-url'

describe('normalizeWebsiteUrl', () => {
  it('asume https:// cuando no hay esquema (caso Berel: "berel.com")', () => {
    expect(normalizeWebsiteUrl('berel.com')).toBe('https://berel.com')
  })

  it('preserva https existente y baja el host a minúsculas', () => {
    expect(normalizeWebsiteUrl('HTTPS://Berel.COM')).toBe('https://berel.com')
  })

  it('preserva http explícito (no fuerza https)', () => {
    expect(normalizeWebsiteUrl('http://example.org')).toBe('http://example.org')
  })

  it('quita el trailing slash y el path "/" vacío', () => {
    expect(normalizeWebsiteUrl('https://berel.com/')).toBe('https://berel.com')
    expect(normalizeWebsiteUrl('https://berel.com/mx/')).toBe('https://berel.com/mx')
  })

  it('descarta query string y fragment (tracking/junk no es identidad)', () => {
    expect(normalizeWebsiteUrl('https://berel.com/?utm_source=x#top')).toBe('https://berel.com')
  })

  it('preserva www. (identidad declarada, no la inventamos ni la quitamos)', () => {
    expect(normalizeWebsiteUrl('www.bancochile.cl')).toBe('https://www.bancochile.cl')
  })

  it('conserva puerto no-default y descarta 80/443', () => {
    expect(normalizeWebsiteUrl('http://example.com:8080/app')).toBe('http://example.com:8080/app')
    expect(normalizeWebsiteUrl('https://example.com:443/')).toBe('https://example.com')
  })

  it('SAFETY: rechaza esquemas peligrosos (javascript/data/mailto/ftp)', () => {
    expect(normalizeWebsiteUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeWebsiteUrl('data:text/html,<script>')).toBeNull()
    expect(normalizeWebsiteUrl('mailto:hola@efeonce.com')).toBeNull()
    expect(normalizeWebsiteUrl('ftp://files.example.com')).toBeNull()
  })

  it('rechaza hosts sin punto (localhost/intranet/basura)', () => {
    expect(normalizeWebsiteUrl('localhost')).toBeNull()
    expect(normalizeWebsiteUrl('intranet')).toBeNull()
    expect(normalizeWebsiteUrl('https://localhost:3000')).toBeNull()
  })

  it('honest: vacío / whitespace / no-string / no parseable → null', () => {
    expect(normalizeWebsiteUrl('')).toBeNull()
    expect(normalizeWebsiteUrl('   ')).toBeNull()
    expect(normalizeWebsiteUrl(null)).toBeNull()
    expect(normalizeWebsiteUrl(undefined)).toBeNull()
    expect(normalizeWebsiteUrl('http://')).toBeNull()
  })

  it('es idempotente (normalizar dos veces = una vez)', () => {
    const once = normalizeWebsiteUrl('Berel.com/')

    expect(once).toBe('https://berel.com')
    expect(normalizeWebsiteUrl(once)).toBe(once)
  })
})
