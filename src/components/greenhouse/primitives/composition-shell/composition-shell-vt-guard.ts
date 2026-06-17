/**
 * Composition Shell — singleton `view-transition-name` guard (TASK-1119 Slice 1).
 *
 * The View Transitions API requires **≤ 1 element per `view-transition-name`** before AND after the
 * DOM swap — if two elements share a name, the browser skips the transition silently (the "morph
 * silencioso" bug class: no error, no transition, just a hard cut). The substrate already scopes every
 * region name per instance (`regionViewTransitionName` + `useId`), so collisions should never happen.
 * This guard is the **dev-time runtime net** that catches the cases the per-instance scoping can't:
 * a host that hardcodes a colliding name, or a future regression that drops the `useId` scoping.
 *
 * Two parts:
 *  - `detectViewTransitionNameCollisions` — PURE, testable without DOM. The collision predicate.
 *  - a dev-only refcount registry (`registerCompositionViewTransitionName`) wired by the component.
 *    Non-blocking in production (the registry is a no-op there — zero cost, never throws).
 *
 * Mirror of the "honest degradation, never-hidden" contract: this NEVER blocks render or hides content;
 * it only `console.warn`s once per colliding name in development.
 */

/** PURE: returns the set of names that appear more than once. Empty array = no collision. */
export const detectViewTransitionNameCollisions = (names: readonly string[]): string[] => {
  const counts = new Map<string, number>()

  for (const name of names) {
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name)
}

const isDevEnvironment = (): boolean =>
  typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production' && process.env?.NODE_ENV !== 'test'

// Global refcount of every Composition Shell region `view-transition-name` currently mounted. A name with
// refcount > 1 means two live regions claim it → the morph will silently no-op. Module-level by design:
// the collision is cross-instance (two shells on the same page), so the registry must span instances.
const activeViewTransitionNames = new Map<string, number>()
const alreadyWarnedNames = new Set<string>()

const warnOnCollision = (name: string, refcount: number): void => {
  if (!isDevEnvironment() || refcount <= 1 || alreadyWarnedNames.has(name)) return

  alreadyWarnedNames.add(name)

  console.warn(
    `[CompositionShell] view-transition-name collision: "${name}" is claimed by ${refcount} live elements. ` +
      'The View Transitions API requires ≤ 1 element per name — the morph will silently no-op (hard cut). ' +
      'Region names are scoped per instance via regionViewTransitionName + useId; do NOT hand-assign a ' +
      'reserved "gh-region-*" name (lint: greenhouse/no-ad-hoc-layout-morph).'
  )
}

/**
 * Registers a region `view-transition-name` for the lifetime of a mounted region. Returns a cleanup that
 * decrements the refcount. Dev-only side effect (warn on collision); in production it still tracks refcounts
 * cheaply but never warns. Safe to call during render/effect — idempotent per (name, mount) via the cleanup.
 */
export const registerCompositionViewTransitionName = (name: string): (() => void) => {
  const next = (activeViewTransitionNames.get(name) ?? 0) + 1

  activeViewTransitionNames.set(name, next)
  warnOnCollision(name, next)

  return () => {
    const remaining = (activeViewTransitionNames.get(name) ?? 1) - 1

    if (remaining <= 0) {
      activeViewTransitionNames.delete(name)
      alreadyWarnedNames.delete(name)
    } else {
      activeViewTransitionNames.set(name, remaining)
    }
  }
}

/** Test-only: snapshot the live registry (refcounts). */
export const __getActiveViewTransitionNames = (): ReadonlyMap<string, number> => new Map(activeViewTransitionNames)

/** Test-only: reset the registry between tests. */
export const __resetCompositionViewTransitionRegistry = (): void => {
  activeViewTransitionNames.clear()
  alreadyWarnedNames.clear()
}
