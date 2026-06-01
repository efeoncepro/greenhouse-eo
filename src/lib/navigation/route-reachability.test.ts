import { execSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { DECLARED_CHILD_ROUTES, DECLARED_CHILD_ROUTE_PATHS } from './route-reachability-manifest'

/**
 * TASK-982 — anti-regression for the navigation reachability gate.
 * Ensures the contractor onboarding wizard stays declared + reachable, and that
 * the gate runs (warn mode, exit 0).
 */
describe('route reachability governance (TASK-982)', () => {
  it('declares the contractor onboarding wizard as a child route of the workbench', () => {
    expect(DECLARED_CHILD_ROUTE_PATHS).toContain('/hr/contractors/new')
    const decl = DECLARED_CHILD_ROUTES.find(d => d.route === '/hr/contractors/new')

    expect(decl?.parent).toBe('/hr/contractors')
    expect(decl?.via).toBe('header-cta')
  })

  it('every declared child route has a parent + reason', () => {
    for (const d of DECLARED_CHILD_ROUTES) {
      expect(d.route.startsWith('/')).toBe(true)
      expect(d.parent.startsWith('/')).toBe(true)
      expect(d.reason.length).toBeGreaterThan(10)
    }
  })

  it('gate runs (warn mode, exit 0) and does NOT flag /hr/contractors/new as orphan', () => {
    const output = execSync('node scripts/ci/route-reachability-gate.mjs 2>&1', { encoding: 'utf8' })

    expect(output).toContain('route-reachability-gate')
    // The onboarding wizard must be reachable (header CTA + manifest) — never orphan.
    expect(output).not.toContain('/hr/contractors/new')
  })
})
