import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const state = vi.hoisted(() => ({
  currentAssignment: null as Record<string, unknown> | null,
  profile: {
    profileId: 'gp-1',
    publicId: 'EO-GP-1',
    idempotent: false,
    websiteUrl: 'https://acme.cl',
    market: 'CL',
    locale: 'es-CL'
  },
  provisionError: null as Error | null,
  enableResult: { assignmentId: 'cpma-new', status: 'active', idempotent: false },
  expireResult: {
    assignmentId: 'cpma-old',
    fromStatus: 'active',
    toStatus: 'expired',
    effectiveTo: '2026-06-29',
    idempotent: false
  }
}))

const spies = vi.hoisted(() => ({
  enable: vi.fn(),
  expire: vi.fn(),
  provision: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async () => (state.currentAssignment ? [state.currentAssignment] : [])
}))

vi.mock('@/lib/client-portal/commands/enable-module', () => ({
  enableClientPortalModule: async (input: unknown) => {
    spies.enable(input)

    return state.enableResult
  }
}))

vi.mock('@/lib/client-portal/commands/expire-churn', () => ({
  expireClientPortalModule: async (input: unknown) => {
    spies.expire(input)

    return state.expireResult
  }
}))

vi.mock('../provision-profile', () => ({
  ProvisionGraderProfileError: class ProvisionGraderProfileError extends Error {
    readonly code: string
    readonly statusCode: number

    constructor(code: string, message: string, statusCode: number) {
      super(message)
      this.name = 'ProvisionGraderProfileError'
      this.code = code
      this.statusCode = statusCode
    }
  },
  provisionGraderProfileForOrganization: async (organizationId: string) => {
    spies.provision(organizationId)

    if (state.provisionError) {
      throw state.provisionError
    }

    return state.profile
  }
}))

import { AssignAeoTierValidationError, assignAeoTier } from '../assign-tier'
import { ProvisionGraderProfileError } from '../provision-profile'

beforeEach(() => {
  vi.clearAllMocks()
  state.currentAssignment = null
  state.provisionError = null
  state.profile = {
    profileId: 'gp-1',
    publicId: 'EO-GP-1',
    idempotent: false,
    websiteUrl: 'https://acme.cl',
    market: 'CL',
    locale: 'es-CL'
  }
  state.enableResult = { assignmentId: 'cpma-new', status: 'active', idempotent: false }
  state.expireResult = {
    assignmentId: 'cpma-old',
    fromStatus: 'active',
    toStatus: 'expired',
    effectiveTo: '2026-06-29',
    idempotent: false
  }
})

const BASE_INPUT = {
  organizationId: 'org-1',
  reason: 'Activación comercial AEO',
  requestedBy: 'user-am-1'
}

describe('assignAeoTier', () => {
  it.each([
    ['trial', 'active', undefined],
    ['contracted', 'active', undefined],
    ['pilot', 'pilot', '2026-08-01T00:00:00Z']
  ] as const)('assigns %s by composing enableClientPortalModule with metadata', async (tier, status, expiresAt) => {
    state.enableResult = { assignmentId: `cpma-${tier}`, status, idempotent: false }

    const result = await assignAeoTier({ ...BASE_INPUT, tier, expiresAt })

    expect(result).toMatchObject({
      organizationId: 'org-1',
      tier,
      assignmentId: `cpma-${tier}`,
      status,
      idempotent: false,
      supersededAssignmentId: null
    })
    expect(spies.provision).toHaveBeenCalledWith('org-1')
    expect(spies.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        moduleKey: 'ai_visibility_v1',
        status,
        source: 'manual_admin',
        metadataJson: { aeo_tier: tier },
        expiresAt
      })
    )
  })

  it('rejects pilot without expiresAt before provisioning or enabling', async () => {
    await expect(assignAeoTier({ ...BASE_INPUT, tier: 'pilot' })).rejects.toMatchObject({
      name: 'AssignAeoTierValidationError',
      code: 'pilot_expires_at_required'
    })

    expect(spies.provision).not.toHaveBeenCalled()
    expect(spies.enable).not.toHaveBeenCalled()
  })

  it('is idempotent for same open tier but still ensures the profile exists', async () => {
    state.currentAssignment = {
      assignment_id: 'cpma-existing',
      status: 'active',
      expires_at: null,
      metadata_json: { aeo_tier: 'trial' }
    }
    state.profile = { ...state.profile, idempotent: true }

    const result = await assignAeoTier({ ...BASE_INPUT, tier: 'trial' })

    expect(result).toMatchObject({
      assignmentId: 'cpma-existing',
      tier: 'trial',
      idempotent: true,
      profile: expect.objectContaining({ idempotent: true })
    })
    expect(spies.provision).toHaveBeenCalledWith('org-1')
    expect(spies.expire).not.toHaveBeenCalled()
    expect(spies.enable).not.toHaveBeenCalled()
  })

  it('supersedes an existing tier before enabling the new one', async () => {
    state.currentAssignment = {
      assignment_id: 'cpma-old',
      status: 'active',
      expires_at: null,
      metadata_json: { aeo_tier: 'trial' }
    }
    state.enableResult = { assignmentId: 'cpma-contracted', status: 'active', idempotent: false }

    const result = await assignAeoTier({ ...BASE_INPUT, tier: 'contracted' })

    expect(result.supersededAssignmentId).toBe('cpma-old')
    expect(spies.expire).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: 'cpma-old',
        actorUserId: 'user-am-1'
      })
    )
    expect(spies.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        metadataJson: { aeo_tier: 'contracted' },
        sourceRefJson: expect.objectContaining({ supersededAssignmentId: 'cpma-old' })
      })
    )
  })

  it("tier='none' expires the open assignment and does not provision a profile", async () => {
    state.currentAssignment = {
      assignment_id: 'cpma-old',
      status: 'pilot',
      expires_at: '2026-08-01T00:00:00Z',
      metadata_json: { aeo_tier: 'pilot' }
    }

    const result = await assignAeoTier({ ...BASE_INPUT, tier: 'none' })

    expect(result).toMatchObject({
      tier: 'none',
      assignmentId: 'cpma-old',
      status: 'expired',
      supersededAssignmentId: 'cpma-old'
    })
    expect(spies.provision).not.toHaveBeenCalled()
    expect(spies.enable).not.toHaveBeenCalled()
    expect(spies.expire).toHaveBeenCalled()
  })

  it("tier='none' is idempotent when no open assignment exists", async () => {
    const result = await assignAeoTier({ ...BASE_INPUT, tier: 'none' })

    expect(result).toMatchObject({
      tier: 'none',
      assignmentId: null,
      idempotent: true
    })
    expect(spies.expire).not.toHaveBeenCalled()
  })

  it('does not enable when profile provisioning fails with website_required', async () => {
    state.provisionError = new ProvisionGraderProfileError('website_required', 'missing website', 422)

    await expect(assignAeoTier({ ...BASE_INPUT, tier: 'trial' })).rejects.toMatchObject({
      name: 'ProvisionGraderProfileError',
      code: 'website_required'
    })
    expect(spies.enable).not.toHaveBeenCalled()
    expect(spies.expire).not.toHaveBeenCalled()
  })

  it('rejects invalid tiers with a closed enum', async () => {
    await expect(assignAeoTier({ ...BASE_INPUT, tier: 'free' as never })).rejects.toBeInstanceOf(
      AssignAeoTierValidationError
    )
  })
})
