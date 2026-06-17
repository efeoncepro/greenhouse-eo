import { afterEach, describe, expect, it } from 'vitest'

import {
  __getActiveViewTransitionNames,
  __resetCompositionViewTransitionRegistry,
  detectViewTransitionNameCollisions,
  registerCompositionViewTransitionName
} from './composition-shell-vt-guard'

afterEach(() => {
  __resetCompositionViewTransitionRegistry()
})

describe('detectViewTransitionNameCollisions (pure)', () => {
  it('sin nombres / nombres únicos → sin colisión', () => {
    expect(detectViewTransitionNameCollisions([])).toEqual([])
    expect(detectViewTransitionNameCollisions(['a', 'b', 'c'])).toEqual([])
  })

  it('detecta nombres duplicados (constraint VT singleton)', () => {
    expect(detectViewTransitionNameCollisions(['a', 'b', 'a'])).toEqual(['a'])
    expect(detectViewTransitionNameCollisions(['x', 'x', 'y', 'y', 'y']).sort()).toEqual(['x', 'y'])
  })
})

describe('registerCompositionViewTransitionName (refcount registry)', () => {
  it('refcount sube al registrar y baja al limpiar', () => {
    const cleanupA = registerCompositionViewTransitionName('gh-region-lead-1')

    expect(__getActiveViewTransitionNames().get('gh-region-lead-1')).toBe(1)

    cleanupA()

    expect(__getActiveViewTransitionNames().has('gh-region-lead-1')).toBe(false)
  })

  it('dos elementos con el mismo nombre → refcount 2 (colisión detectable)', () => {
    const c1 = registerCompositionViewTransitionName('dup')
    const c2 = registerCompositionViewTransitionName('dup')

    expect(__getActiveViewTransitionNames().get('dup')).toBe(2)

    c1()

    expect(__getActiveViewTransitionNames().get('dup')).toBe(1)

    c2()

    expect(__getActiveViewTransitionNames().has('dup')).toBe(false)
  })

  it('nombres distintos coexisten sin colisión (per-instance scoping)', () => {
    registerCompositionViewTransitionName('gh-region-primary-a')
    registerCompositionViewTransitionName('gh-region-primary-b')

    const snapshot = __getActiveViewTransitionNames()

    expect(snapshot.get('gh-region-primary-a')).toBe(1)
    expect(snapshot.get('gh-region-primary-b')).toBe(1)
    expect([...snapshot.values()].every(c => c === 1)).toBe(true)
  })
})
