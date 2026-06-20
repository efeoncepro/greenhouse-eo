import { describe, expect, it } from 'vitest'

import {
  DesignHandoffError,
  assertFreshDesignHandoffNodeSnapshot,
  assertValidHandoffTransition,
  normalizeDesignHandoffAllowedFileInput,
  normalizeDesignHandoffEvidenceInput,
  normalizeDesignHandoffLinkInput,
  normalizeDesignHandoffPrimitiveDecisionFields,
  normalizeDesignHandoffPlanningFields,
  normalizeImplementedSurfaceKey
} from './state-machine'

describe('design handoff state machine', () => {
  it('allows the canonical implementation lifecycle', () => {
    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'proposed',
        toStatus: 'in_implementation'
      })
    ).not.toThrow()

    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'in_implementation',
        toStatus: 'in_review'
      })
    ).not.toThrow()

    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'in_review',
        toStatus: 'implemented',
        implementedSurfaceKey: '/design-system/handoff',
        evidenceSummary: { evidenceTypes: ['gvc_capture'] },
        primitiveDecision: {
          implementationStrategy: 'reuse_primitive',
          primitiveKey: 'CompositionShell',
          primitiveVariant: null,
          primitiveKind: null,
          primitiveLabRoute: null,
          primitiveRuntimeRoute: '/design-system/handoff',
          primitiveGvcRef: '.captures/2026-06-20_design-system-handoff-cockpit',
          primitiveDocsRef: null,
          primitiveRationale: null,
          primitiveDecisionOwner: null,
          primitiveDecisionDueAt: null,
          primitiveDecisionUpdatedAt: '2026-06-20T14:00:00.000Z'
        }
      })
    ).not.toThrow()
  })

  it('allows archive from any active status and keeps archived terminal', () => {
    expect(() => assertValidHandoffTransition({ fromStatus: 'proposed', toStatus: 'archived' })).not.toThrow()
    expect(() => assertValidHandoffTransition({ fromStatus: 'in_implementation', toStatus: 'archived' })).not.toThrow()
    expect(() => assertValidHandoffTransition({ fromStatus: 'in_review', toStatus: 'archived' })).not.toThrow()
    expect(() => assertValidHandoffTransition({ fromStatus: 'implemented', toStatus: 'archived' })).not.toThrow()

    expect(() => assertValidHandoffTransition({ fromStatus: 'archived', toStatus: 'implemented' })).toThrow(
      DesignHandoffError
    )
  })

  it('rejects jumps to implemented without an app route', () => {
    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'proposed',
        toStatus: 'implemented',
        implementedSurfaceKey: '/design-system/handoff',
        evidenceSummary: { evidenceTypes: ['gvc_capture'] },
        primitiveDecision: {
          implementationStrategy: 'route_only',
          primitiveKey: null,
          primitiveVariant: null,
          primitiveKind: null,
          primitiveLabRoute: null,
          primitiveRuntimeRoute: '/design-system/handoff',
          primitiveGvcRef: null,
          primitiveDocsRef: null,
          primitiveRationale: 'One-off route.',
          primitiveDecisionOwner: null,
          primitiveDecisionDueAt: null,
          primitiveDecisionUpdatedAt: '2026-06-20T14:00:00.000Z'
        }
      })
    ).toThrow(DesignHandoffError)

    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'in_review',
        toStatus: 'implemented'
      })
    ).toThrow(DesignHandoffError)
  })

  it('rejects implemented without runtime/GVC evidence unless there is a manual exception', () => {
    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'in_review',
        toStatus: 'implemented',
        implementedSurfaceKey: '/design-system/handoff',
        evidenceSummary: { evidenceTypes: ['visual_review'] },
        primitiveDecision: {
          implementationStrategy: 'route_only',
          primitiveKey: null,
          primitiveVariant: null,
          primitiveKind: null,
          primitiveLabRoute: null,
          primitiveRuntimeRoute: '/design-system/handoff',
          primitiveGvcRef: null,
          primitiveDocsRef: null,
          primitiveRationale: 'One-off route.',
          primitiveDecisionOwner: null,
          primitiveDecisionDueAt: null,
          primitiveDecisionUpdatedAt: '2026-06-20T14:00:00.000Z'
        }
      })
    ).toThrow(DesignHandoffError)

    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'in_review',
        toStatus: 'implemented',
        implementedSurfaceKey: '/design-system/handoff',
        evidenceSummary: { evidenceTypes: ['manual_exception'] },
        primitiveDecision: {
          implementationStrategy: 'route_only',
          primitiveKey: null,
          primitiveVariant: null,
          primitiveKind: null,
          primitiveLabRoute: null,
          primitiveRuntimeRoute: '/design-system/handoff',
          primitiveGvcRef: null,
          primitiveDocsRef: null,
          primitiveRationale: 'One-off route.',
          primitiveDecisionOwner: null,
          primitiveDecisionDueAt: null,
          primitiveDecisionUpdatedAt: '2026-06-20T14:00:00.000Z'
        }
      })
    ).not.toThrow()
  })

  it('normalizes primitive governance decisions and blocks unresolved implementation closure', () => {
    expect(
      normalizeDesignHandoffPrimitiveDecisionFields({
        implementationStrategy: 'variant_kind',
        primitiveKey: 'ContextualSidecar',
        primitiveVariant: 'inspector',
        primitiveKind: 'designHandoff',
        primitiveRuntimeRoute: '/design-system/handoff/',
        primitiveGvcRef: '.captures/2026-06-20_design-system-handoff-cockpit'
      })
    ).toEqual({
      implementationStrategy: 'variant_kind',
      primitiveKey: 'ContextualSidecar',
      primitiveVariant: 'inspector',
      primitiveKind: 'designHandoff',
      primitiveLabRoute: null,
      primitiveRuntimeRoute: '/design-system/handoff',
      primitiveGvcRef: '.captures/2026-06-20_design-system-handoff-cockpit',
      primitiveDocsRef: null,
      primitiveRationale: null,
      primitiveDecisionOwner: null,
      primitiveDecisionDueAt: null
    })

    expect(() =>
      normalizeDesignHandoffPrimitiveDecisionFields({
        implementationStrategy: 'variant_kind',
        primitiveKey: 'ContextualSidecar',
        primitiveVariant: 'inspector'
      })
    ).toThrow(DesignHandoffError)

    expect(() =>
      assertValidHandoffTransition({
        fromStatus: 'in_review',
        toStatus: 'implemented',
        implementedSurfaceKey: '/design-system/handoff',
        evidenceSummary: { evidenceTypes: ['gvc_capture'] },
        primitiveDecision: {
          implementationStrategy: 'research_required',
          primitiveKey: null,
          primitiveVariant: null,
          primitiveKind: null,
          primitiveLabRoute: null,
          primitiveRuntimeRoute: null,
          primitiveGvcRef: null,
          primitiveDocsRef: null,
          primitiveRationale: null,
          primitiveDecisionOwner: 'designer-1',
          primitiveDecisionDueAt: '2026-06-20T14:00:00.000Z',
          primitiveDecisionUpdatedAt: '2026-06-20T14:00:00.000Z'
        }
      })
    ).toThrow(DesignHandoffError)
  })

  it('normalizes implemented surface keys as internal app routes only', () => {
    expect(normalizeImplementedSurfaceKey('/design-system/handoff/')).toBe('/design-system/handoff')
    expect(normalizeImplementedSurfaceKey('   ')).toBeNull()
    expect(() => normalizeImplementedSurfaceKey('https://example.com/design-system/handoff')).toThrow(
      DesignHandoffError
    )
    expect(() => normalizeImplementedSurfaceKey('design-system/handoff')).toThrow(DesignHandoffError)
  })

  it('normalizes planning fields', () => {
    expect(
      normalizeDesignHandoffPlanningFields({
        priority: 'high',
        targetSurfaceKey: '/design-system/handoff/',
        dueAt: '2026-06-20T10:00:00-04:00',
        blockedReason: '  Waiting for Figma access  '
      })
    ).toEqual({
      priority: 'high',
      targetSurfaceKey: '/design-system/handoff',
      dueAt: '2026-06-20T14:00:00.000Z',
      blockedReason: 'Waiting for Figma access'
    })

    expect(() => normalizeDesignHandoffPlanningFields({ priority: 'critical' })).toThrow(DesignHandoffError)
  })

  it('normalizes and validates typed links', () => {
    expect(normalizeDesignHandoffLinkInput({ linkType: 'task', ref: ' TASK-1175 ' })).toEqual({
      linkType: 'task',
      ref: 'TASK-1175',
      label: 'TASK-1175',
      metadata: {}
    })

    expect(
      normalizeDesignHandoffLinkInput({
        linkType: 'route',
        ref: '/design-system/handoff/',
        label: 'Handoff route'
      })
    ).toEqual({
      linkType: 'route',
      ref: '/design-system/handoff',
      label: 'Handoff route',
      metadata: {}
    })

    expect(() => normalizeDesignHandoffLinkInput({ linkType: 'task', ref: '1175' })).toThrow(DesignHandoffError)
    expect(() => normalizeDesignHandoffLinkInput({ linkType: 'commit', ref: 'not-a-sha' })).toThrow(
      DesignHandoffError
    )
  })

  it('normalizes and validates implementation evidence', () => {
    expect(
      normalizeDesignHandoffEvidenceInput({
        evidenceType: 'runtime_route',
        ref: '/design-system/handoff/',
        label: 'Runtime route'
      })
    ).toEqual({
      evidenceType: 'runtime_route',
      ref: '/design-system/handoff',
      label: 'Runtime route',
      metadata: {}
    })

    expect(
      normalizeDesignHandoffEvidenceInput({
        evidenceType: 'gvc_capture',
        ref: '.captures/2026-06-20_design-handoff/index.html'
      })
    ).toEqual({
      evidenceType: 'gvc_capture',
      ref: '.captures/2026-06-20_design-handoff/index.html',
      label: '.captures/2026-06-20_design-handoff/index.html',
      metadata: {}
    })

    expect(() => normalizeDesignHandoffEvidenceInput({ evidenceType: 'gvc_capture', ref: '/tmp/capture' })).toThrow(
      DesignHandoffError
    )
  })

  it('validates allowlisted Figma files and stale node snapshots', () => {
    expect(
      normalizeDesignHandoffAllowedFileInput({
        fileKey: 'Product123',
        fileLabel: 'Product design',
        actorUserId: 'agent:codex'
      })
    ).toEqual({
      fileKey: 'Product123',
      fileLabel: 'Product design',
      actorUserId: 'agent:codex'
    })

    expect(() =>
      normalizeDesignHandoffAllowedFileInput({ fileKey: 'bad key', fileLabel: 'Product', actorUserId: 'agent:codex' })
    ).toThrow(DesignHandoffError)

    expect(() =>
      assertFreshDesignHandoffNodeSnapshot({
        snapshotId: 'snap_1',
        entryId: 'entry_1',
        fileKey: 'Product123',
        nodeId: '1:2',
        expectedName: 'Handoff',
        observedName: 'Handoff stale',
        nodeStatus: 'stale',
        renderUrl: null,
        renderHash: null,
        providerCheckedAt: '2026-06-20T14:00:00.000Z',
        metadata: {},
        createdBy: 'agent:codex',
        createdAt: '2026-06-20T14:00:00.000Z'
      })
    ).toThrow(DesignHandoffError)
  })
})
