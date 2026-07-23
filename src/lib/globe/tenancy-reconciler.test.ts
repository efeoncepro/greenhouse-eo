import { describe, expect, it, vi } from 'vitest'
import type { GlobeCapability } from '@efeonce-globe/contracts'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  buildSnapshot,
  claimCanonicalGlobeWorkspace,
  planSemanticCursor,
  runGlobeTenancyReconciliation,
  type GlobeDesiredWorkspace,
  type GlobeReconciliationClaim
} from './tenancy-reconciler'

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn()
}))

const workspace = (
  capabilities: readonly GlobeCapability[] = ['globe.studio.access']
): GlobeDesiredWorkspace => ({
  workspaceId: 'greenhouse-org:acme',
  brokerBindingId: 'greenhouse-org:acme',
  bindingState: 'active',
  members: [
    {
      identitySubject: 'greenhouse:user:user-2',
      state: 'active',
      desiredCapabilities: capabilities
    },
    {
      identitySubject: 'greenhouse:user:user-1',
      state: 'active',
      desiredCapabilities: capabilities
    }
  ]
})

describe('Globe tenancy semantic cursor V2', () => {
  it('keeps semantic revisions stable across freshness-only renewals', () => {
    const first = planSemanticCursor(workspace(), {
      workspaceRevision: 0,
      workspaceFingerprint: null,
      memberCursors: {}
    })

    const renewed = planSemanticCursor(workspace(), {
      workspaceRevision: first.workspaceRevision,
      workspaceFingerprint: first.workspaceFingerprint,
      memberCursors: first.memberCursors
    })

    expect(first.workspaceRevision).toBe(1)
    expect(renewed).toEqual(first)
  })

  it('increments only the changed member revision and the workspace revision', () => {
    const first = planSemanticCursor(workspace(), {
      workspaceRevision: 0,
      workspaceFingerprint: null,
      memberCursors: {}
    })

    const changed = planSemanticCursor(workspace(['globe.studio.access', 'globe.credits.read']), {
      workspaceRevision: first.workspaceRevision,
      workspaceFingerprint: first.workspaceFingerprint,
      memberCursors: first.memberCursors
    })

    expect(changed.workspaceRevision).toBe(2)
    expect(changed.memberCursors['greenhouse:user:user-1']?.revision).toBe(2)
    expect(changed.memberCursors['greenhouse:user:user-2']?.revision).toBe(2)
  })

  it('records a durable absence revision and advances again on re-add', () => {
    const first = planSemanticCursor(workspace(), {
      workspaceRevision: 0,
      workspaceFingerprint: null,
      memberCursors: {}
    })

    const removedWorkspace = { ...workspace(), members: workspace().members.slice(0, 1) }

    const removed = planSemanticCursor(removedWorkspace, {
      workspaceRevision: first.workspaceRevision,
      workspaceFingerprint: first.workspaceFingerprint,
      memberCursors: first.memberCursors
    })

    const renewedWhileAbsent = planSemanticCursor(removedWorkspace, {
      workspaceRevision: removed.workspaceRevision,
      workspaceFingerprint: removed.workspaceFingerprint,
      memberCursors: removed.memberCursors
    })

    const readded = planSemanticCursor(workspace(), {
      workspaceRevision: renewedWhileAbsent.workspaceRevision,
      workspaceFingerprint: renewedWhileAbsent.workspaceFingerprint,
      memberCursors: renewedWhileAbsent.memberCursors
    })

    expect(removed.memberCursors['greenhouse:user:user-1']?.revision).toBe(2)
    expect(renewedWhileAbsent).toEqual(removed)
    expect(readded.memberCursors['greenhouse:user:user-1']?.revision).toBe(3)
    expect(readded.workspaceRevision).toBeGreaterThan(removed.workspaceRevision)
  })

  it('builds a complete snapshot with one shared renewable expiry and no PII fields', () => {
    const semantic = planSemanticCursor(workspace(), {
      workspaceRevision: 0,
      workspaceFingerprint: null,
      memberCursors: {}
    })

    const snapshot = buildSnapshot(
      workspace(),
      { ...semantic, leaseToken: '68f2a75a-d4f0-4dfd-8997-e08a3bf0deeb' },
      '5b360976-8891-43d6-8726-9bf2bd259874',
      new Date('2026-07-23T10:00:00.000Z')
    )

    expect(snapshot.schemaVersion).toBe('2')
    expect(snapshot.workspaceRevision).toBe(1)
    expect(snapshot.members).toHaveLength(2)
    expect(snapshot.expiresAt).toBe('2026-07-23T10:12:00.000Z')
    expect(snapshot.members.every(member => member.expiresAt === snapshot.expiresAt)).toBe(true)
    expect(JSON.stringify(snapshot)).not.toMatch(/email|name|token/i)
  })

  it('fails closed when a persisted member cursor has revision zero', async () => {
    vi.mocked(runGreenhousePostgresQuery).mockResolvedValueOnce([
      {
        workspace_revision: '1',
        workspace_fingerprint: null,
        member_revisions: {
          'greenhouse:user:user-1': { fingerprint: 'stored', revision: 0 }
        }
      }
    ])

    await expect(claimCanonicalGlobeWorkspace(workspace())).rejects.toThrow(
      'globe_tenancy_member_cursor_invalid'
    )
  })

  it('fails closed instead of overflowing semantic revisions', () => {
    expect(() =>
      planSemanticCursor(workspace(), {
        workspaceRevision: Number.MAX_SAFE_INTEGER,
        workspaceFingerprint: 'different',
        memberCursors: {}
      })
    ).toThrow('globe_tenancy_workspace_revision_exhausted')
  })
})

describe('Globe tenancy reconciliation orchestration', () => {
  it('reconciles each claimed workspace with a receipt-bound idempotency key', async () => {
    const desired = workspace()

    const semantic = planSemanticCursor(desired, {
      workspaceRevision: 0,
      workspaceFingerprint: null,
      memberCursors: {}
    })

    const claim: GlobeReconciliationClaim = {
      ...semantic,
      leaseToken: '68f2a75a-d4f0-4dfd-8997-e08a3bf0deeb'
    }

    const reconcile = vi.fn(async () => undefined)
    const completeWorkspace = vi.fn(async () => undefined)

    const result = await runGlobeTenancyReconciliation({
      loadDesiredWorkspaces: async () => [desired],
      claimWorkspace: async () => claim,
      completeWorkspace,
      failWorkspace: async () => undefined,
      reconcile,
      now: () => new Date('2026-07-23T10:00:00.000Z'),
      randomId: () => '5b360976-8891-43d6-8726-9bf2bd259874'
    })

    expect(result).toEqual({ discovered: 1, reconciled: 1, contended: 0, failed: 0 })
    expect(reconcile).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'greenhouse-org:acme',
        idempotencyKey: expect.stringMatching(/^gh-globe-tenancy-v2:[a-f0-9]{64}$/),
        correlationId: 'globe-tenancy-5b360976-8891-43d6-8726-9bf2bd259874'
      })
    )
    expect(completeWorkspace).toHaveBeenCalledWith(
      desired.workspaceId,
      claim,
      '5b360976-8891-43d6-8726-9bf2bd259874'
    )
  })

  it('releases the durable claim with a sanitized error code and continues other workspaces', async () => {
    const desired = workspace()

    const semantic = planSemanticCursor(desired, {
      workspaceRevision: 0,
      workspaceFingerprint: null,
      memberCursors: {}
    })

    const failWorkspace = vi.fn(async () => undefined)

    const result = await runGlobeTenancyReconciliation({
      loadDesiredWorkspaces: async () => [desired],
      claimWorkspace: async () => ({
        ...semantic,
        leaseToken: '68f2a75a-d4f0-4dfd-8997-e08a3bf0deeb'
      }),
      completeWorkspace: async () => undefined,
      failWorkspace,
      reconcile: async () => {
        throw new Error('Remote failure: user@example.com')
      },
      randomId: () => '5b360976-8891-43d6-8726-9bf2bd259874'
    })

    expect(result.failed).toBe(1)
    expect(failWorkspace).toHaveBeenCalledWith(
      desired.workspaceId,
      '68f2a75a-d4f0-4dfd-8997-e08a3bf0deeb',
      'unexpected_error'
    )
  })

  it('does not dispatch when another worker owns the workspace lease', async () => {
    const reconcile = vi.fn(async () => undefined)

    const result = await runGlobeTenancyReconciliation({
      loadDesiredWorkspaces: async () => [workspace()],
      claimWorkspace: async () => null,
      completeWorkspace: async () => undefined,
      failWorkspace: async () => undefined,
      reconcile
    })

    expect(result.contended).toBe(1)
    expect(reconcile).not.toHaveBeenCalled()
  })

  it('rejects duplicate identity subjects before claiming or dispatching', async () => {
    const claimWorkspace = vi.fn(async () => null)
    const reconcile = vi.fn(async () => undefined)

    const duplicate = {
      ...workspace(),
      members: [workspace().members[0], workspace().members[0]]
    }

    await expect(
      runGlobeTenancyReconciliation({
        loadDesiredWorkspaces: async () => [duplicate],
        claimWorkspace,
        completeWorkspace: async () => undefined,
        failWorkspace: async () => undefined,
        reconcile
      })
    ).rejects.toThrow('globe_tenancy_duplicate_member')

    expect(claimWorkspace).not.toHaveBeenCalled()
    expect(reconcile).not.toHaveBeenCalled()
  })
})
