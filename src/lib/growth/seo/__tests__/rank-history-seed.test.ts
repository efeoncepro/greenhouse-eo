import { describe, expect, it } from 'vitest'

import { extractDomainPosition } from '../rank-history-seed'

/**
 * TASK-1655 Slice 4 — extracción de la posición del dominio desde un SERP histórico.
 * El resto del command se ejercita contra el sandbox/PG real (gate TASK-893); esta parte
 * es pura y es donde vive el riesgo de matching (dominio vs substring, www, subdominios).
 */

const serp = (items: Array<{ type?: string; domain?: string; rank_group?: number; url?: string }>) => ({
  datetime: '2026-05-14 18:21:50',
  items
})

describe('extractDomainPosition', () => {
  it('encuentra la primera posición orgánica del dominio', () => {
    const result = extractDomainPosition(
      serp([
        { type: 'paid', domain: 'berel.com', rank_group: 1 },
        { type: 'organic', domain: 'comex.com.mx', rank_group: 1 },
        { type: 'organic', domain: 'www.berel.com', rank_group: 3, url: 'https://berel.com/latex' }
      ]),
      'berel.com'
    )

    expect(result).toEqual({ position: 3, url: 'https://berel.com/latex' })
  })

  it('acepta subdominios pero NUNCA un dominio que solo contiene el root como substring', () => {
    expect(
      extractDomainPosition(serp([{ type: 'organic', domain: 'tienda.berel.com', rank_group: 5 }]), 'berel.com').position
    ).toBe(5)

    expect(
      extractDomainPosition(serp([{ type: 'organic', domain: 'noberel.com', rank_group: 2 }]), 'berel.com').position
    ).toBeNull()
  })

  it('dominio ausente del SERP = position null (medición válida, no error)', () => {
    expect(extractDomainPosition(serp([{ type: 'organic', domain: 'comex.com.mx', rank_group: 1 }]), 'berel.com')).toEqual({
      position: null,
      url: null
    })
  })

  it('ignora items pagados aunque el dominio matchee', () => {
    expect(
      extractDomainPosition(serp([{ type: 'paid', domain: 'berel.com', rank_group: 1 }]), 'berel.com').position
    ).toBeNull()
  })
})
