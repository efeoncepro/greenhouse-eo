import { describe, expect, it } from 'vitest'

import {
  buildSidecarSearchParams,
  canReplaceAdaptiveSidecar,
  createAdaptiveSidecarEvent,
  removeSidecarSearchParams,
  reduceAdaptiveSidecarState,
  resolveAdaptiveSidecarVariant,
  resolveAdaptiveSidecarMode
} from '../adaptive-sidecar-controller'

describe('adaptive-sidecar-controller', () => {
  it('resolves closed when the sidecar is not open', () => {
    expect(resolveAdaptiveSidecarMode({ open: false, preferredMode: 'push', viewportWidth: 1440 })).toBe('closed')
  })

  it('uses push on wide layouts when the main content can keep its minimum width', () => {
    expect(
      resolveAdaptiveSidecarMode({
        open: true,
        preferredMode: 'push',
        viewportWidth: 1440,
        mainMinWidth: 760,
        sidecarWidth: 420
      })
    ).toBe('push')
  })

  it('falls back to temporary below the configured breakpoint', () => {
    expect(
      resolveAdaptiveSidecarMode({
        open: true,
        preferredMode: 'push',
        viewportWidth: 900,
        breakpointWidth: 1200
      })
    ).toBe('temporary')
  })

  it('falls back to overlay when desktop width cannot preserve main content', () => {
    expect(
      resolveAdaptiveSidecarMode({
        open: true,
        preferredMode: 'push',
        viewportWidth: 1440,
        availableWidth: 1170,
        breakpointWidth: 1024,
        mainMinWidth: 760,
        sidecarWidth: 420
      })
    ).toBe('overlay')
  })

  it('blocks replacing a dirty sidecar with a different kind', () => {
    expect(canReplaceAdaptiveSidecar({ currentKind: 'form', nextKind: 'review', dirty: true })).toBe(false)
    expect(canReplaceAdaptiveSidecar({ currentKind: 'form', nextKind: 'form', dirty: true })).toBe(true)
  })

  it('maps domain kinds into official sidecar variants', () => {
    expect(resolveAdaptiveSidecarVariant('inspector')).toBe('inspector')
    expect(resolveAdaptiveSidecarVariant('review')).toBe('inspector')
    expect(resolveAdaptiveSidecarVariant('preview')).toBe('inspector')
    expect(resolveAdaptiveSidecarVariant('form')).toBe('composer')
    expect(resolveAdaptiveSidecarVariant('composer')).toBe('composer')
    expect(resolveAdaptiveSidecarVariant('assistant')).toBe('assistant')
    expect(resolveAdaptiveSidecarVariant('review', 'assistant')).toBe('assistant')
  })

  it('builds and removes stable URL search params for URL-addressable sidecars', () => {
    const params = buildSidecarSearchParams(new URLSearchParams('q=test'), {
      kind: 'inspector',
      sidecarId: 'case-42',
      mode: 'push'
    })

    expect(params.toString()).toBe('q=test&sidecar=inspector&sidecarId=case-42&sidecarMode=push')
    expect(removeSidecarSearchParams(params).toString()).toBe('q=test')
  })

  it('creates telemetry events with stable shape', () => {
    expect(
      createAdaptiveSidecarEvent({
        name: 'sidecar.mode_change',
        kind: 'assistant',
        mode: 'push',
        previousMode: 'closed',
        source: 'unit-test',
        timestamp: '2026-06-06T00:00:00.000Z'
      })
    ).toEqual({
      name: 'sidecar.mode_change',
      kind: 'assistant',
      mode: 'push',
      previousMode: 'closed',
      source: 'unit-test',
      timestamp: '2026-06-06T00:00:00.000Z'
    })
  })

  it('keeps repeated open actions idempotent for the same sidecar target', () => {
    const state = {
      open: true,
      kind: 'inspector' as const,
      sidecarId: 'case-42',
      mode: 'push' as const,
      dirty: false,
      lastAction: 'opened' as const
    }

    expect(
      reduceAdaptiveSidecarState(state, {
        type: 'open',
        kind: 'inspector',
        sidecarId: 'case-42',
        mode: 'push'
      })
    ).toBe(state)
  })

  it('blocks close and replacement when the current sidecar is dirty', () => {
    const dirtyState = {
      open: true,
      kind: 'form' as const,
      sidecarId: 'case-42',
      mode: 'push' as const,
      dirty: true
    }

    expect(reduceAdaptiveSidecarState(dirtyState, { type: 'close' })).toEqual({
      ...dirtyState,
      lastAction: 'blocked_dirty_close'
    })

    expect(
      reduceAdaptiveSidecarState(dirtyState, {
        type: 'open',
        kind: 'review',
        sidecarId: 'case-84',
        mode: 'push'
      })
    ).toEqual({
      ...dirtyState,
      lastAction: 'blocked_dirty_replace'
    })
  })

  it('allows explicit forced close or replacement from a dirty sidecar', () => {
    const dirtyState = {
      open: true,
      kind: 'form' as const,
      sidecarId: 'case-42',
      mode: 'push' as const,
      dirty: true
    }

    expect(reduceAdaptiveSidecarState(dirtyState, { type: 'close', force: true })).toEqual({
      open: false,
      kind: 'form',
      sidecarId: 'case-42',
      mode: 'push',
      dirty: false,
      lastAction: 'closed'
    })

    expect(
      reduceAdaptiveSidecarState(dirtyState, {
        type: 'open',
        kind: 'review',
        sidecarId: 'case-84',
        mode: 'inline',
        force: true
      })
    ).toEqual({
      open: true,
      kind: 'review',
      sidecarId: 'case-84',
      mode: 'inline',
      dirty: false,
      lastAction: 'opened'
    })
  })

  it('keeps repeated dirty-state writes idempotent', () => {
    const state = {
      open: true,
      kind: 'preview' as const,
      sidecarId: 'asset-9',
      mode: 'inline' as const,
      dirty: true
    }

    expect(reduceAdaptiveSidecarState(state, { type: 'markDirty', dirty: true })).toBe(state)
    expect(reduceAdaptiveSidecarState(state, { type: 'markDirty', dirty: false })).toEqual({
      ...state,
      dirty: false,
      lastAction: 'dirty_changed'
    })
  })
})
