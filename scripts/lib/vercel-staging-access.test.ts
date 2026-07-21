import { describe, expect, it } from 'vitest'

import { pickLatestReadyStagingDeployment } from './vercel-staging-access.mjs'

/**
 * ISSUE-123 — el tooling de agentes resuelve el deployment staging VIGENTE vía la
 * Vercel API en vez de confiar en el alias env-staging (que puede quedar fijado a
 * un deploy viejo tras un `vercel alias set` manual). Shape real de la API v6
 * verificado 2026-07-18: staging llega con `target: null` +
 * `customEnvironment.slug === 'staging'`; production con `target: 'production'`.
 */

const deployment = (overrides: Record<string, unknown>) => ({
  uid: 'dpl_x',
  url: 'greenhouse-x-efeonce.vercel.app',
  state: 'READY',
  readyState: 'READY',
  target: null,
  createdAt: 1000,
  customEnvironment: { slug: 'staging' },
  ...overrides,
})

describe('pickLatestReadyStagingDeployment', () => {
  it('elige el staging READY más reciente por createdAt', () => {
    const picked = pickLatestReadyStagingDeployment([
      deployment({ uid: 'dpl_old', createdAt: 1000 }),
      deployment({ uid: 'dpl_new', createdAt: 3000 }),
      deployment({ uid: 'dpl_mid', createdAt: 2000 }),
    ])

    expect(picked?.uid).toBe('dpl_new')
  })

  it('excluye production (target=production, sin customEnvironment) y otros environments', () => {
    const picked = pickLatestReadyStagingDeployment([
      deployment({ uid: 'dpl_prod', target: 'production', customEnvironment: undefined, createdAt: 9000 }),
      deployment({ uid: 'dpl_preview', customEnvironment: { slug: 'qa' }, createdAt: 8000 }),
      deployment({ uid: 'dpl_staging', createdAt: 1000 }),
    ])

    expect(picked?.uid).toBe('dpl_staging')
  })

  it('excluye deployments no-READY (BUILDING/CANCELED/ERROR)', () => {
    const picked = pickLatestReadyStagingDeployment([
      deployment({ uid: 'dpl_building', state: 'BUILDING', readyState: 'BUILDING', createdAt: 9000 }),
      deployment({ uid: 'dpl_canceled', state: 'CANCELED', readyState: 'CANCELED', createdAt: 8000 }),
      deployment({ uid: 'dpl_ready', createdAt: 1000 }),
    ])

    expect(picked?.uid).toBe('dpl_ready')
  })

  it('tolera el campo legacy `created` cuando falta `createdAt`', () => {
    const picked = pickLatestReadyStagingDeployment([
      deployment({ uid: 'dpl_a', createdAt: undefined, created: 5000 }),
      deployment({ uid: 'dpl_b', createdAt: undefined, created: 1000 }),
    ])

    expect(picked?.uid).toBe('dpl_a')
  })

  it('devuelve null sin candidatos (lista vacía, sin url, shape inesperado)', () => {
    expect(pickLatestReadyStagingDeployment([])).toBeNull()
    expect(pickLatestReadyStagingDeployment([deployment({ url: '' })])).toBeNull()
    expect(pickLatestReadyStagingDeployment([{ foo: 'bar' }])).toBeNull()
    expect(pickLatestReadyStagingDeployment(undefined as never)).toBeNull()
  })
})
