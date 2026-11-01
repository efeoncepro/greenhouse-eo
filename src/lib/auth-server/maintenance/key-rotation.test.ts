import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runKeyRotationTick, type RotationStorePort } from './key-rotation'
import type { RotationOperation, RotationSnapshot } from './key-rotation-store'

vi.mock('@/lib/auth-server/keys/signing-keys-store', () => ({
  prepareSigningKeyVersion: vi.fn(async (_signer, versionName: string) => ({
    versionName, kid: 'new-kid', publicJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' }
  }))
}))

const keyName = 'projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256'
const now = new Date('2027-01-31T12:00:00.000Z')

const operation = (phase: RotationOperation['phase'] = 'planned'): RotationOperation => ({
  id: 'operation-1', keyName, predecessorKid: 'old-kid', phase, kmsVersion: null,
  candidateKid: null, leaseOwner: 'owner-1', leaseUntil: new Date('2027-01-31T12:08:00.000Z'),
  fencingVersion: 1, verifiedAt: null
})

const snapshot: RotationSnapshot = {
  active: {
    kid: 'old-kid', kmsKeyVersion: `${keyName}/cryptoKeyVersions/2`, algorithm: 'ES256',
    publicJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' }, state: 'active',
    activatedAt: new Date('2026-09-04T12:00:00.000Z'), retiringAt: null,
    retiredAt: null, createdBy: 'test'
  },
  retiring: [], lastVerifiedAt: new Date('2026-10-01T12:00:00.000Z'),
  lastVerifiedKid: 'old-kid', open: null
}

const createHarness = () => {
  let current = operation()

  const store: RotationStorePort = {
    read: vi.fn(async () => snapshot),
    claim: vi.fn(async () => ({ kind: 'claimed' as const, operation: current })),
    transition: vi.fn(async input => {
      if (input.from !== current.phase) throw new Error('stale phase')
      current = {
        ...current, phase: input.to, kmsVersion: input.kmsVersion ?? current.kmsVersion,
        candidateKid: input.candidateKid ?? current.candidateKid,
        verifiedAt: input.verifiedAt ?? current.verifiedAt
      }

      return current
    }),
    activate: vi.fn(async input => {
      current = { ...current, phase: 'activated', candidateKid: input.prepared.kid }

      return current
    })
  }

  const kms = {
    createVersion: vi.fn(async () => `${keyName}/cryptoKeyVersions/3`),
    getVersionState: vi.fn(async (): Promise<'ENABLED' | 'PENDING' | 'DISABLED' | 'OTHER'> => 'ENABLED'),
    signer: { getPublicKeyPem: vi.fn(), signDigest: vi.fn(), listEnabledVersions: vi.fn() }
  }

  const publication = { verify: vi.fn(async () => undefined) }

  const run = (enabled = true, dryRun = false) => runKeyRotationTick({
    enabled, dryRun, keyName, actor: 'test', executionId: 'execution-1', now,
    store, kms, publication
  })

  return { store, kms, publication, run, getCurrent: () => current }
}

describe('isolated signing key rotation command', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does no PostgreSQL or KMS IO while disabled', async () => {
    const h = createHarness()

    expect(await h.run(false)).toEqual({ status: 'disabled' })
    expect(h.store.read).not.toHaveBeenCalled()
    expect(h.store.claim).not.toHaveBeenCalled()
    expect(h.kms.createVersion).not.toHaveBeenCalled()
  })

  it('dry run reads eligibility without claiming or creating', async () => {
    const h = createHarness()

    expect(await h.run(true, true)).toEqual({ status: 'dry_run', reason: 'eligible_after_review' })
    expect(h.store.claim).not.toHaveBeenCalled()
    expect(h.kms.createVersion).not.toHaveBeenCalled()
  })

  it('records an uncertain KMS create and stops before activation', async () => {
    const h = createHarness()

    h.kms.createVersion.mockRejectedValueOnce(new Error('deadline exceeded'))
    expect(await h.run()).toEqual({ status: 'create_uncertain', operationId: 'operation-1' })
    expect(h.getCurrent().phase).toBe('create_uncertain')
    expect(h.store.activate).not.toHaveBeenCalled()
    expect(h.kms.createVersion).toHaveBeenCalledTimes(1)
  })

  it('keeps the exact pending version for a future execution', async () => {
    const h = createHarness()

    h.kms.getVersionState.mockResolvedValueOnce('PENDING')
    expect(await h.run()).toEqual({ status: 'pending', operationId: 'operation-1' })
    expect(h.getCurrent().kmsVersion).toBe(`${keyName}/cryptoKeyVersions/3`)
    expect(h.store.activate).not.toHaveBeenCalled()
  })

  it('does not retire or mark verified when issuer publication fails', async () => {
    const h = createHarness()

    h.publication.verify.mockRejectedValueOnce(new Error('JWKS missing candidate'))
    expect(await h.run()).toEqual({ status: 'blocked', reason: 'publication_check_failed', operationId: 'operation-1' })
    expect(h.getCurrent().phase).toBe('blocked')
    expect(h.store.transition).not.toHaveBeenCalledWith(expect.objectContaining({ to: 'verified' }))
  })

  it('verifies publication after atomic activation', async () => {
    const h = createHarness()

    expect(await h.run()).toEqual({ status: 'verified', operationId: 'operation-1' })
    expect(h.store.activate).toHaveBeenCalledOnce()
    expect(h.publication.verify).toHaveBeenCalledWith('new-kid', 'old-kid')
    expect(h.getCurrent().phase).toBe('verified')
  })
})
