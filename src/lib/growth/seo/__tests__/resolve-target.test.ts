import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * ISSUE-153 — Resolución canónica de target por organización con mercado explícito.
 *
 * El caso que motiva TODO el módulo es el de dos mercados activos: antes de esto, cuatro
 * callsites resolvían con `ORDER BY created_at DESC LIMIT 1` y servían un país al azar
 * (el más nuevo) sin declararlo. Ningún test lo cubría — por eso nada falló.
 */

vi.mock('server-only', () => ({}))

const state = {
  targets: [] as Array<Record<string, unknown>>
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async () => state.targets
}))

import { resolveSeoTargetForMarket, resolveUnambiguousSeoTarget } from '../resolve-target'

const mx = {
  seo_target_id: 'seot-berel-mx',
  root_domain: 'berel.com',
  location_code: '2484',
  language_code: 'es',
  market: 'MX'
}

const cl = {
  seo_target_id: 'seot-berel-cl',
  root_domain: 'berel.com',
  location_code: '2152',
  language_code: 'es',
  market: 'CL'
}

beforeEach(() => {
  state.targets = []
})

describe('resolveSeoTargetForMarket', () => {
  it('sin targets activos → none', async () => {
    expect(await resolveSeoTargetForMarket('org-1')).toEqual({ status: 'none' })
  })

  it('un solo activo resuelve solo, y declara el mercado servido', async () => {
    state.targets = [mx]

    const result = await resolveSeoTargetForMarket('org-1')

    expect(result.status).toBe('resolved')

    if (result.status === 'resolved') {
      expect(result.target.seoTargetId).toBe('seot-berel-mx')
      expect(result.target.market).toBe('MX')
      expect(result.target.locationCode).toBe('2484')
    }
  })

  it('DOS mercados activos sin selector → multiple_markets con la lista, JAMÁS una elección silenciosa', async () => {
    state.targets = [cl, mx]

    const result = await resolveSeoTargetForMarket('org-1')

    expect(result.status).toBe('multiple_markets')

    if (result.status === 'multiple_markets') {
      expect(result.markets.map(m => m.market)).toEqual(['CL', 'MX'])
    }
  })

  it('con selector ISO-2 (case-insensitive) elige el mercado pedido', async () => {
    state.targets = [cl, mx]

    const result = await resolveSeoTargetForMarket('org-1', { market: 'mx' })

    expect(result.status).toBe('resolved')
    if (result.status === 'resolved') expect(result.target.seoTargetId).toBe('seot-berel-mx')
  })

  it('con selector por location_code del proveedor también resuelve', async () => {
    state.targets = [cl, mx]

    const result = await resolveSeoTargetForMarket('org-1', { market: '2152' })

    expect(result.status).toBe('resolved')
    if (result.status === 'resolved') expect(result.target.seoTargetId).toBe('seot-berel-cl')
  })

  it('selector que no matchea → market_not_found con los mercados disponibles', async () => {
    state.targets = [mx]

    const result = await resolveSeoTargetForMarket('org-1', { market: 'PE' })

    expect(result.status).toBe('market_not_found')

    if (result.status === 'market_not_found') {
      expect(result.requestedMarket).toBe('PE')
      expect(result.markets.map(m => m.market)).toEqual(['MX'])
    }
  })

  it('selector vacío o whitespace se trata como sin selector', async () => {
    state.targets = [mx]

    expect((await resolveSeoTargetForMarket('org-1', { market: '  ' })).status).toBe('resolved')
  })
})

describe('resolveUnambiguousSeoTarget (superficies sin selector)', () => {
  it('inequívoco → target', async () => {
    state.targets = [mx]

    const result = await resolveUnambiguousSeoTarget('org-1')

    expect(result.target?.seoTargetId).toBe('seot-berel-mx')
    expect(result.conflict).toBeNull()
  })

  it('varios mercados → null CON el conflicto visible, para que el caller lo observe', async () => {
    state.targets = [cl, mx]

    const result = await resolveUnambiguousSeoTarget('org-1')

    expect(result.target).toBeNull()
    expect(result.conflict?.length).toBe(2)
  })

  it('cero targets → null sin conflicto (estado inicial legítimo, no error)', async () => {
    const result = await resolveUnambiguousSeoTarget('org-1')

    expect(result.target).toBeNull()
    expect(result.conflict).toBeNull()
  })
})
