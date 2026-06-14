import { describe, expect, it } from 'vitest'

import {
  COMPOSITION_SHELL_COMPOSITION_CONFIG,
  COMPOSITION_SHELL_REGION_META,
  initialCompositionShellState,
  reduceCompositionShellState,
  resolveComposition,
  resolveCompositionConfig,
  resolveCompositionLayout,
  resolveSizeClass
} from './composition-shell-controller'
import type { CompositionShellKind, CompositionShellRegion } from './composition-shell-types'

describe('resolveComposition', () => {
  it('precedencia: composition explícita gana sobre kind', () => {
    expect(resolveComposition({ composition: 'focused', kind: 'nexaMoment' })).toBe('focused')
  })

  it('resuelve cada kind de dominio a una composición EXISTENTE (nunca una nueva)', () => {
    const expectations: Record<CompositionShellKind, string> = {
      dashboard: 'single',
      nexaMoment: 'leadPlusContext',
      queueInspector: 'split',
      workspaceDetail: 'split',
      reader: 'focused',
      custom: 'single'
    }

    for (const [kind, composition] of Object.entries(expectations)) {
      const resolved = resolveComposition({ kind: kind as CompositionShellKind })

      expect(resolved).toBe(composition)
      expect(COMPOSITION_SHELL_COMPOSITION_CONFIG[resolved]).toBeDefined()
    }
  })

  it('default single sin composition ni kind', () => {
    expect(resolveComposition()).toBe('single')
    expect(resolveComposition({})).toBe('single')
  })
})

describe('config + region metadata', () => {
  it('cada composición es auto-consistente (key == config.composition)', () => {
    for (const [key, config] of Object.entries(COMPOSITION_SHELL_COMPOSITION_CONFIG)) {
      expect(config.composition).toBe(key)
    }
  })

  it('leadPlusContext lidera con lead + condensa primary; split monta primary + aside', () => {
    expect(resolveCompositionConfig({ composition: 'leadPlusContext' })).toMatchObject({
      layout: 'stack',
      condensesPrimary: true
    })
    expect(resolveCompositionConfig({ composition: 'leadPlusContext' }).contentRegions).toEqual(['lead', 'primary'])
    expect(resolveCompositionConfig({ composition: 'split' }).contentRegions).toEqual(['primary', 'aside'])
  })

  it('cada región tiene un view-transition-name único (singleton — constraint VT)', () => {
    const names = Object.values(COMPOSITION_SHELL_REGION_META).map(m => m.viewTransitionName)

    expect(new Set(names).size).toBe(names.length)
  })

  it('cada región es auto-consistente (key == meta.region)', () => {
    for (const [key, meta] of Object.entries(COMPOSITION_SHELL_REGION_META)) {
      expect(meta.region).toBe(key as CompositionShellRegion)
    }
  })
})

describe('resolveSizeClass (M3 breakpoints)', () => {
  it('mapea ancho → size class; sin ancho default expanded (SSR-safe)', () => {
    expect(resolveSizeClass()).toBe('expanded')
    expect(resolveSizeClass(700)).toBe('compact')
    expect(resolveSizeClass(1000)).toBe('medium')
    expect(resolveSizeClass(1400)).toBe('expanded')
  })
})

describe('resolveCompositionLayout', () => {
  it('split se sostiene en expanded/medium; colapsa a stack + drawer en compact', () => {
    expect(resolveCompositionLayout('split', 'expanded')).toEqual({ layout: 'split', asideAsDrawer: false })
    expect(resolveCompositionLayout('split', 'medium')).toEqual({ layout: 'split', asideAsDrawer: false })
    expect(resolveCompositionLayout('split', 'compact')).toEqual({ layout: 'stack', asideAsDrawer: true })
  })

  it('leadPlusContext / single / focused siempre stack', () => {
    for (const sc of ['compact', 'medium', 'expanded'] as const) {
      expect(resolveCompositionLayout('leadPlusContext', sc).layout).toBe('stack')
      expect(resolveCompositionLayout('single', sc).layout).toBe('stack')
      expect(resolveCompositionLayout('focused', sc).layout).toBe('stack')
    }
  })
})

describe('reduceCompositionShellState (morph lifecycle + dirty guard)', () => {
  it('compose → composing → settle → composed', () => {
    const composing = reduceCompositionShellState(initialCompositionShellState, {
      type: 'compose',
      composition: 'leadPlusContext'
    })

    expect(composing).toMatchObject({ composition: 'leadPlusContext', phase: 'composing', lastAction: 'composing' })

    const composed = reduceCompositionShellState(composing, { type: 'settle' })

    expect(composed).toMatchObject({ phase: 'composed', lastAction: 'composed' })
  })

  it('settle es no-op si no se está componiendo', () => {
    expect(reduceCompositionShellState(initialCompositionShellState, { type: 'settle' })).toBe(initialCompositionShellState)
  })

  it('dirty bloquea cambiar de composición salvo force', () => {
    const dirty = reduceCompositionShellState(
      { composition: 'split', phase: 'composed', dirty: true },
      { type: 'compose', composition: 'focused' }
    )

    expect(dirty.lastAction).toBe('blocked_dirty_compose')
    expect(dirty.composition).toBe('split') // no cambió

    const forced = reduceCompositionShellState(
      { composition: 'split', phase: 'composed', dirty: true },
      { type: 'compose', composition: 'focused', force: true }
    )

    expect(forced).toMatchObject({ composition: 'focused', phase: 'composing', dirty: false })
  })

  it('reset vuelve a single/dormant; bloquea si dirty salvo force', () => {
    expect(reduceCompositionShellState({ composition: 'split', phase: 'composed' }, { type: 'reset' })).toMatchObject({
      composition: 'single',
      phase: 'dormant',
      lastAction: 'reset'
    })

    expect(
      reduceCompositionShellState({ composition: 'split', phase: 'composed', dirty: true }, { type: 'reset' }).lastAction
    ).toBe('blocked_dirty_compose')
  })

  it('markDirty idempotente', () => {
    const s = reduceCompositionShellState(initialCompositionShellState, { type: 'markDirty', dirty: true })

    expect(s.dirty).toBe(true)
    expect(reduceCompositionShellState(s, { type: 'markDirty', dirty: true })).toBe(s)
  })

  it('compose al mismo target activo es no-op', () => {
    const composed = { composition: 'split' as const, phase: 'composed' as const }

    expect(reduceCompositionShellState(composed, { type: 'compose', composition: 'split' })).toBe(composed)
  })
})
