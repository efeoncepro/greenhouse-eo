import 'server-only'

import type { LifecycleStage } from './types'

// ────────────────────────────────────────────────────────────────────────────
// HubSpot → Greenhouse lifecycle stage mapping.
//
// HubSpot lifecyclestage is a free-text property: portals can rename the
// built-in stages, add new ones, or ship internal labels. This module makes
// that fan-in resilient and operator-configurable.
//
// Resolution order (first match wins):
//   1. Runtime override (env var `HUBSPOT_LIFECYCLE_STAGE_MAP_OVERRIDE`,
//      JSON of `{ "<lowercased-hubspot-stage>": "<greenhouse-stage>" }`).
//   2. Hardcoded DEFAULT_HUBSPOT_STAGE_MAP below.
//   3. `unknownFallback` (callers can pass their own default — useful to
//      route to `prospect` for inbound sync but, say, `disqualified` for a
//      cleanup pipeline).
//
// If no match is found, `onUnknown` is invoked (defaults to console.warn) so
// operators can detect drift without failing the caller.
//
// **To add a new HubSpot stage without shipping code**, set the env var:
//   HUBSPOT_LIFECYCLE_STAGE_MAP_OVERRIDE='{"partner":"active_client"}'
//
// **To add a new Greenhouse lifecycle stage**, update:
//   - `LIFECYCLE_STAGES` in types.ts
//   - The CHECK constraints in the lifecycle DDL migration
//   - (Optional) the DEFAULT_HUBSPOT_STAGE_MAP if HubSpot has a matching stage
// ────────────────────────────────────────────────────────────────────────────

/** Canonical default map per GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1 §4.5. */
export const DEFAULT_HUBSPOT_STAGE_MAP: Readonly<Record<string, LifecycleStage>> = Object.freeze({
  subscriber: 'prospect',
  lead: 'prospect',
  marketingqualifiedlead: 'prospect',
  salesqualifiedlead: 'prospect',
  opportunity: 'opportunity',
  customer: 'active_client',
  evangelist: 'active_client',
  other: 'churned'
})

const ENV_OVERRIDE_VAR = 'HUBSPOT_LIFECYCLE_STAGE_MAP_OVERRIDE'

const isLifecycleStage = (value: unknown): value is LifecycleStage =>
  typeof value === 'string' && [
    'prospect', 'opportunity', 'active_client',
    'inactive', 'churned', 'provider_only', 'disqualified'
  ].includes(value)

/** Normalize a raw HubSpot lifecyclestage for lookup — trim + lowercase. */
export const normalizeHubSpotStage = (value: string | null | undefined): string | null => {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()

  return trimmed.length === 0 ? null : trimmed
}

let _cachedOverride: Record<string, LifecycleStage> | null = null
let _cachedOverrideSource: string | undefined

const loadEnvOverride = (): Record<string, LifecycleStage> => {
  const raw = process.env[ENV_OVERRIDE_VAR]

  // Invalidate cache if env changes (tests, Vercel redeploy with new vars).
  if (raw !== _cachedOverrideSource) {
    _cachedOverride = null
    _cachedOverrideSource = raw
  }

  if (_cachedOverride) return _cachedOverride

  if (!raw) {
    _cachedOverride = {}

    return _cachedOverride
  }

  try {
    const parsed = JSON.parse(raw) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn(`[hubspot-lifecycle-mapping] ${ENV_OVERRIDE_VAR} must be a JSON object of {hubspot_stage: greenhouse_stage}; ignoring.`)
      _cachedOverride = {}

      return _cachedOverride
    }

    const normalized: Record<string, LifecycleStage> = {}

    for (const [rawKey, rawValue] of Object.entries(parsed as Record<string, unknown>)) {
      const key = normalizeHubSpotStage(rawKey)

      if (!key) continue

      if (!isLifecycleStage(rawValue)) {
        console.warn(`[hubspot-lifecycle-mapping] override entry "${rawKey}" → "${String(rawValue)}" is not a valid Greenhouse lifecycle stage; skipping.`)
        continue
      }

      normalized[key] = rawValue
    }

    _cachedOverride = normalized
  } catch (error) {
    console.warn(`[hubspot-lifecycle-mapping] failed to parse ${ENV_OVERRIDE_VAR}: ${String(error)}; using defaults.`)
    _cachedOverride = {}
  }

  return _cachedOverride
}

export interface ResolveHubSpotStageOptions {

  /** Returned when the stage is unknown. Defaults to `'prospect'`. */
  unknownFallback?: LifecycleStage

  /** Called when the stage is unknown (for observability). Defaults to console.warn. */
  onUnknown?: (hubspotStage: string | null) => void

  /**
   * Additional ad-hoc overrides merged on top of env + defaults. Useful for
   * tests or one-off pipelines; not a replacement for the env var.
   */
  overrides?: Record<string, LifecycleStage>
}

/**
 * Resolve a raw HubSpot lifecyclestage to a Greenhouse LifecycleStage.
 *
 * Robust by design:
 *   - Case-insensitive + trimmed.
 *   - Env override takes precedence over defaults.
 *   - Unknown stages never throw — they fall back to `unknownFallback`
 *     (default `prospect`) and fire `onUnknown` for observability.
 */
export const resolveHubSpotStage = (
  rawStage: string | null | undefined,
  options: ResolveHubSpotStageOptions = {}
): LifecycleStage => {
  const { unknownFallback = 'prospect', onUnknown, overrides } = options
  const normalized = normalizeHubSpotStage(rawStage)

  if (normalized === null) {
    // Empty / null stage is a common HubSpot case (company created without
    // lifecyclestage set). Treat as known-unknown: prospect by default,
    // don't warn.
    return unknownFallback
  }

  if (overrides && normalized in overrides) {
    return overrides[normalized] as LifecycleStage
  }

  const envOverride = loadEnvOverride()

  if (normalized in envOverride) {
    return envOverride[normalized] as LifecycleStage
  }

  if (normalized in DEFAULT_HUBSPOT_STAGE_MAP) {
    return DEFAULT_HUBSPOT_STAGE_MAP[normalized] as LifecycleStage
  }

  if (onUnknown) {
    onUnknown(normalized)
  } else {
    console.warn(
      `[hubspot-lifecycle-mapping] unknown HubSpot lifecyclestage "${normalized}" — falling back to "${unknownFallback}". ` +
      `Set ${ENV_OVERRIDE_VAR} to map it explicitly.`
    )
  }

  return unknownFallback
}

/** True when the given HubSpot stage is covered by defaults or env override. */
export const isKnownHubSpotStage = (rawStage: string | null | undefined): boolean => {
  const normalized = normalizeHubSpotStage(rawStage)

  if (normalized === null) return false

  return normalized in DEFAULT_HUBSPOT_STAGE_MAP || normalized in loadEnvOverride()
}

/** Inspection helper — snapshot of the effective map (defaults + env override). */
export const getEffectiveHubSpotStageMap = (): Record<string, LifecycleStage> => ({
  ...DEFAULT_HUBSPOT_STAGE_MAP,
  ...loadEnvOverride()
})

/** Internal — reset the env override cache. Exposed for tests only. */
export const __resetHubSpotStageMappingCache = () => {
  _cachedOverride = null
  _cachedOverrideSource = undefined
}
