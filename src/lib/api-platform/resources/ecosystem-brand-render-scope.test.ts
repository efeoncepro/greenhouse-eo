import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { can } from '@/lib/entitlements/runtime'

import { resolveBrandRenderEcosystemSubject } from './ecosystem-brand-render-scope'

const context = (binding: Record<string, unknown>) => ({ consumer: { publicId: 'cons-1' }, binding }) as never

describe('resolveBrandRenderEcosystemSubject', () => {
  it('binding interno → sujeto máquina DESIGNER que tiene las dos capabilities de marca', () => {
    const subject = resolveBrandRenderEcosystemSubject(context({ organizationId: null, greenhouseScopeType: 'internal' }))

    expect(subject).toMatchObject({ userId: 'consumer:cons-1', tenantType: 'efeonce_internal', roleCodes: ['designer'] })
    expect(can(subject, 'brand_render.request.create', 'create', 'tenant')).toBe(true)
    expect(can(subject, 'brand_render.request.read', 'read', 'tenant')).toBe(true)
  })

  it('binding de organización (cliente) → 403 scope_not_allowed', () => {
    expect(() => resolveBrandRenderEcosystemSubject(context({ organizationId: 'org-1', greenhouseScopeType: 'organization' }))).toThrow(
      expect.objectContaining({ statusCode: 403, errorCode: 'scope_not_allowed' })
    )
  })
})
