/**
 * AXIS package drift guard (TASK-1589 V1.1).
 *
 * Pattern: the canonical "SSOT + derivation + drift signal" of this repo, the same
 * shape as `axis-semantic-drift.test.ts` — here the signal is this test.
 *
 * The problem it closes: `@efeoncepro/axis-tokens` (the portable semantic layer
 * published to every Efeonce product) and this repo's `axisRamp`/`axisSemanticHex`
 * (the full palette SSOT) carry the same brand values under the same name, and
 * nothing connected them. They matched only because someone typed them twice.
 *
 * Direction of the SSOT, declared here so it stops being ambiguous:
 *
 *   Greenhouse `axisRamp` / `axisSemanticHex`  =  SSOT of the brand value
 *   `@efeoncepro/axis-tokens`                  =  a PORTABLE SUBSET, derived
 *
 * AXIS never redefines a brand value; it re-publishes a role that points at one.
 * The package cannot import from this repo (it must stay runtime-agnostic and
 * consumable by Globe, which has no MUI), so the derivation is not mechanical —
 * which is exactly why it needs a gate instead of a convention.
 *
 * A role in `EXPECTED` with no counterpart here means the mapping drifted from
 * the package; the discovery assertion below catches that, so adding a colour to
 * AXIS cannot silently escape this gate.
 */
import { describe, expect, it } from 'vitest'

import { efeonceTokens } from '@efeoncepro/axis-tokens'

import { axisRamp } from './axis-tokens'
import { axisSemanticHex } from './axis-semantic'

/**
 * Roles AXIS publishes that carry a Greenhouse brand value. Each maps to the one
 * place that owns it. Roles absent from this map are surface/neutral values that
 * Greenhouse resolves through its own light/dark neutrals — see NEUTRAL_ROLES.
 */
const DERIVED_ROLES: Record<string, string> = {
  action: axisRamp.primary[500],
  actionStrong: axisRamp.primary[800],
  accent: axisRamp.secondary[500],
  focus: axisRamp.primary[500],
  success: axisSemanticHex.success,
  warning: axisSemanticHex.warning,
  danger: axisSemanticHex.error
}

/**
 * Deliberately NOT asserted against the ramp: these are the portable layer's own
 * light-mode surface defaults. Greenhouse resolves surface/text/border per mode
 * through `axisNeutral` + the MUI palette, so a single hex here would be wrong
 * for dark mode. Consumers map them; AXIS only names the role.
 */
const NEUTRAL_ROLES = ['surface', 'canvas', 'text', 'textMuted', 'border'] as const

describe('AXIS package tokens derive from the Greenhouse brand SSOT', () => {
  it('covers every colour the package publishes', () => {
    const published = Object.keys(efeonceTokens.color).sort()
    const accounted = [...Object.keys(DERIVED_ROLES), ...NEUTRAL_ROLES].sort()

    expect(published).toEqual(accounted)
  })

  it.each(Object.entries(DERIVED_ROLES))(
    'role "%s" matches the Greenhouse SSOT value',
    (role, expected) => {
      expect(efeonceTokens.color[role as keyof typeof efeonceTokens.color]).toBe(expected)
    }
  )

  it('keeps the motion scale consistent with the shared duration contract', () => {
    expect(Object.keys(efeonceTokens.motion).sort()).toEqual(['fast', 'slow', 'standard'])
  })
})
