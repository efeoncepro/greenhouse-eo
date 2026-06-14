import { describe, expect, it } from 'vitest'

import {
  COMPOSITION_SHELL_COMPOSITION_CONFIG,
  COMPOSITION_SHELL_REGION_META,
  compositionShellActionToTelemetryName,
  createCompositionShellEvent,
  initialCompositionShellState,
  reduceCompositionShellState,
  regionViewTransitionName,
  resolveComposition,
  resolveCompositionConfig,
  resolveCompositionLayout,
  resolveSizeClass
} from './composition-shell-controller'
import type {
  CompositionShellControllerAction,
  CompositionShellControllerState
} from './composition-shell-controller'
import type { CompositionShellComposition, CompositionShellKind, CompositionShellRegion } from './composition-shell-types'

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

  it('regionViewTransitionName es per-instancia: estable por región dentro de una instancia, distinto entre instancias', () => {
    // Estable dentro de una instancia (morph entre composiciones de ESE shell funciona).
    expect(regionViewTransitionName('primary', 'a')).toBe(regionViewTransitionName('primary', 'a'))
    // Distinto entre instancias (2 shells en una página NO colisionan — constraint VT singleton).
    expect(regionViewTransitionName('primary', 'a')).not.toBe(regionViewTransitionName('primary', 'b'))
    // Distinto entre regiones de la misma instancia.
    expect(regionViewTransitionName('primary', 'a')).not.toBe(regionViewTransitionName('aside', 'a'))
    // Conserva el nombre base.
    expect(regionViewTransitionName('lead', 'x')).toContain(COMPOSITION_SHELL_REGION_META.lead.viewTransitionName)
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

describe('reduceCompositionShellState — hardening (property + concurrency, TASK-1119 Slice 5)', () => {
  const COMPOSITIONS: CompositionShellComposition[] = ['single', 'leadPlusContext', 'split', 'focused']
  const PHASES = ['dormant', 'composing', 'composed']

  // PRNG determinístico (mulberry32) — reproducible, sin Math.random.
  const makeRng = (seed: number) => () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const pick = <T,>(arr: readonly T[], r: number): T => arr[Math.floor(r * arr.length)]

  const randomAction = (rng: () => number): CompositionShellControllerAction => {
    const r = rng()

    if (r < 0.4) return { type: 'compose', composition: pick(COMPOSITIONS, rng()), force: rng() < 0.3 }
    if (r < 0.6) return { type: 'settle' }
    if (r < 0.8) return { type: 'reset', force: rng() < 0.3 }

    return { type: 'markDirty', dirty: rng() < 0.5 }
  }

  const assertInvariant = (s: CompositionShellControllerState) => {
    // El estado NUNCA sale del espacio cerrado de composiciones/fases/dirty, sin importar la secuencia.
    // (markDirty es ortogonal a phase → dirty puede ser true en cualquier fase; eso es válido por diseño.)
    expect(COMPOSITIONS).toContain(s.composition)
    expect(PHASES).toContain(s.phase)
    expect([true, false, undefined]).toContain(s.dirty)
  }

  it('cualquier secuencia aleatoria preserva los invariantes del estado (1k pasos × 20 seeds)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = makeRng(seed)
      let state: CompositionShellControllerState = initialCompositionShellState

      for (let step = 0; step < 1000; step++) {
        state = reduceCompositionShellState(state, randomAction(rng))
        assertInvariant(state)
      }
    }
  })

  it('toda transición es pura: misma (state, action) → resultado idéntico (sin efectos ocultos)', () => {
    const rng = makeRng(99)
    let state: CompositionShellControllerState = initialCompositionShellState

    for (let step = 0; step < 200; step++) {
      const action = randomAction(rng)
      const a = reduceCompositionShellState(state, action)
      const b = reduceCompositionShellState(state, action)

      expect(a).toEqual(b)
      state = a
    }
  })

  it('concurrencia: compose rápido a un target distinto mid-composing redirige (último gana, sin dirty)', () => {
    let s: CompositionShellControllerState = reduceCompositionShellState(initialCompositionShellState, {
      type: 'compose',
      composition: 'split'
    })

    expect(s).toMatchObject({ composition: 'split', phase: 'composing' })

    // Cambio de idea antes de asentar (no dirty) → redirige limpio.
    s = reduceCompositionShellState(s, { type: 'compose', composition: 'focused' })

    expect(s).toMatchObject({ composition: 'focused', phase: 'composing', dirty: false })
  })

  it('concurrencia: dirty mid-composing bloquea redirección salvo force, sin corromper estado', () => {
    let s: CompositionShellControllerState = reduceCompositionShellState(initialCompositionShellState, {
      type: 'compose',
      composition: 'split'
    })

    s = reduceCompositionShellState(s, { type: 'markDirty', dirty: true })

    const blocked = reduceCompositionShellState(s, { type: 'compose', composition: 'single' })

    expect(blocked.lastAction).toBe('blocked_dirty_compose')
    expect(blocked.composition).toBe('split')
    expect(blocked.dirty).toBe(true)

    const forced = reduceCompositionShellState(s, { type: 'compose', composition: 'single', force: true })

    expect(forced).toMatchObject({ composition: 'single', phase: 'composing', dirty: false })
  })

  it('settle repetido es estable (idempotente tras asentar)', () => {
    const composing = reduceCompositionShellState(initialCompositionShellState, {
      type: 'compose',
      composition: 'leadPlusContext'
    })

    const composed = reduceCompositionShellState(composing, { type: 'settle' })

    expect(reduceCompositionShellState(composed, { type: 'settle' })).toBe(composed)
  })
})

describe('composition telemetry (TASK-1119 Slice 4)', () => {
  it('createCompositionShellEvent arma el evento con timestamp por default', () => {
    const e = createCompositionShellEvent({ name: 'composition.compose', composition: 'split', previousComposition: 'single', sizeClass: 'expanded', source: 'lab' })

    expect(e).toMatchObject({
      name: 'composition.compose',
      composition: 'split',
      previousComposition: 'single',
      sizeClass: 'expanded',
      source: 'lab'
    })
    expect(typeof e.timestamp).toBe('string')
    expect(e.timestamp.length).toBeGreaterThan(0)
  })

  it('createCompositionShellEvent respeta timestamp explícito', () => {
    const e = createCompositionShellEvent({ name: 'composition.settle', composition: 'focused', timestamp: '2026-06-14T00:00:00.000Z' })

    expect(e.timestamp).toBe('2026-06-14T00:00:00.000Z')
  })

  it('mapper: lastAction → telemetry name (no emite en no-ops)', () => {
    expect(compositionShellActionToTelemetryName('composing')).toBe('composition.compose')
    expect(compositionShellActionToTelemetryName('composed')).toBe('composition.settle')
    expect(compositionShellActionToTelemetryName('reset')).toBe('composition.reset')
    expect(compositionShellActionToTelemetryName('blocked_dirty_compose')).toBe('composition.blocked_dirty')
    // no-ops / bookkeeping no emiten
    expect(compositionShellActionToTelemetryName('idle')).toBeNull()
    expect(compositionShellActionToTelemetryName('dirty_changed')).toBeNull()
    expect(compositionShellActionToTelemetryName(undefined)).toBeNull()
  })
})
