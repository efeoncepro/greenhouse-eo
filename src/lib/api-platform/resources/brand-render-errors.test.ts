import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { BrandRenderDisabledError, BrandRenderMissingSourceError, BrandRenderRejectedError } from '@/lib/brand-surfaces/production/errors'
import { captureWithDomain } from '@/lib/observability/capture'

import { toBrandRenderApiPlatformError } from './brand-render-errors'

describe('toBrandRenderApiPlatformError', () => {
  it('traduce cada causa del dominio a su status y conserva el código en details', () => {
    const disabled = toBrandRenderApiPlatformError(new BrandRenderDisabledError())
    const rejected = toBrandRenderApiPlatformError(new BrandRenderRejectedError('receta no aprobada', { reason: 'recipe-not-approved' }))
    const missing = toBrandRenderApiPlatformError(new BrandRenderMissingSourceError('falta', { missing: ['a.png'] }))

    expect([disabled.statusCode, disabled.errorCode]).toEqual([503, 'service_unavailable'])
    expect([rejected.statusCode, rejected.details]).toEqual([422, { code: 'render_rejected', reason: 'recipe-not-approved' }])
    expect(missing.statusCode).toBe(422)
  })

  it('un error desconocido sale como 500 genérico, sin su mensaje, y se reporta con el dominio brand_render', () => {
    const out = toBrandRenderApiPlatformError(new Error('SELECT * FROM secreto'))

    expect(out).toBeInstanceOf(ApiPlatformError)
    expect(out.statusCode).toBe(500)
    expect(out.message).not.toContain('SELECT')
    expect(captureWithDomain).toHaveBeenCalledWith(expect.any(Error), 'brand_render', expect.anything())
  })
})
