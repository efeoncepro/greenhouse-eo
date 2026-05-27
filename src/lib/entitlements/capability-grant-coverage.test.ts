/**
 * TASK-935 — Capability grant coverage guard.
 * ============================================
 *
 * Regression guard for the bug class TASK-873: a capability declared in the TS
 * catalog AND checked via `can(...)` in an endpoint, but NEVER granted to any
 * role in runtime.ts → the endpoint returns 403 for EVERYONE (shipped but dead).
 * TASK-934 found 3; the comprehensive audit found 13 (finance, commercial,
 * platform, client_portal). Root cause: specs documented intended roles
 * (`DEVOPS_OPERATOR`, `commercial_admin`) that never existed as ROLE_CODES, so
 * the grants were never written.
 *
 * This test parses every `can(subject, '<cap>', '<action>'[, '<scope>'])` call
 * in src/app + src/lib, and for each capability that exists in the catalog,
 * asserts that the maximally-privileged subject (every role + every route group)
 * is granted it. If even that subject can't, NO real user can → latent 403.
 *
 * Pure (no DB): catalog + runtime are static logic. Runs in CI.
 */
import { execSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { ENTITLEMENT_CAPABILITY_CATALOG } from '@/config/entitlements-catalog'
import { ROLE_CODES } from '@/config/role-codes'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

const ALL_ROUTE_GROUPS = [
  'internal',
  'admin',
  'client',
  'commercial',
  'finance',
  'hr',
  'people',
  'my',
  'ai_tooling'
]

// Maximally-privileged subject: every role + every route group. If this subject
// is NOT granted a capability, no real user can be → it's a latent 403.
const supersetSubject: TenantEntitlementSubject = {
  userId: 'grant-coverage-probe',
  tenantType: 'efeonce_internal',
  roleCodes: Object.values(ROLE_CODES),
  primaryRoleCode: ROLE_CODES.EFEONCE_ADMIN,
  routeGroups: ALL_ROUTE_GROUPS,
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/home'
}

type CanUsage = { capability: string; action: string; scope?: string }

const collectCanUsages = (): CanUsage[] => {
  const raw = execSync(
    `grep -rhoE "can\\([a-zA-Z]+, '[^']+', '[^']+'(, '[^']+')?\\)" src/app src/lib 2>/dev/null || true`,
    { encoding: 'utf8' }
  )

  const seen = new Map<string, CanUsage>()

  for (const line of raw.split('\n')) {
    const m = line.match(/can\([a-zA-Z]+, '([^']+)', '([^']+)'(?:, '([^']+)')?\)/)

    if (!m) continue

    const usage: CanUsage = { capability: m[1], action: m[2], scope: m[3] }

    seen.set(`${m[1]}|${m[2]}|${m[3] ?? ''}`, usage)
  }

  return [...seen.values()]
}

describe('TASK-935 — capability grant coverage', () => {
  const catalogKeys = new Set(ENTITLEMENT_CAPABILITY_CATALOG.map(c => c.key))
  const usages = collectCanUsages()

  it('finds at least one can() usage (sanity: grep works)', () => {
    expect(usages.length).toBeGreaterThan(10)
  })

  it('every catalog capability checked via can() is granted to at least one role', () => {
    const latent403: string[] = []

    for (const u of usages) {
      // Only catalog capabilities are subject to the entitlement grant system.
      // can() calls on non-catalog strings are a separate (type) concern.
      if (!catalogKeys.has(u.capability as never)) continue

      const granted = can(
        supersetSubject,
        u.capability as never,
        u.action as never,
        (u.scope ?? undefined) as never
      )

      if (!granted) {
        latent403.push(`${u.capability} (${u.action}${u.scope ? '/' + u.scope : ''})`)
      }
    }

    expect(
      latent403,
      `Latent 403: estas capabilities se chequean vía can() en un endpoint pero NINGÚN rol las tiene granteadas en runtime.ts → 403 para todos. Agrega el grant (bug class TASK-873/935):\n${latent403.join('\n')}`
    ).toEqual([])
  })
})
