import 'server-only'

import { getIntegrationHealthSnapshots } from '@/lib/integrations/health'
import { getNotionRawFreshnessGate } from '@/lib/integrations/notion-readiness'
import { getIntegrationByKey } from '@/lib/integrations/registry'
import type { ReadinessCheckResult } from '@/types/integrations'

/**
 * Check if an integration is ready for downstream consumption.
 * Consumers (ICO materialization, Finance sync, etc.) should call this
 * before running to ensure their upstream data source is operational.
 *
 * Returns ready=false when:
 * - Integration is paused
 * - Integration is blocked
 * - Integration health is down
 * - Integration doesn't exist
 */
export const checkIntegrationReadiness = async (
  integrationKey: string,
  options?: {
    requireRawFreshness?: boolean
  }
): Promise<ReadinessCheckResult> => {
  const entry = await getIntegrationByKey(integrationKey)

  if (!entry) {
    return {
      integrationKey,
      ready: false,
      reason: 'Integration not registered',
      health: 'not_configured',
      readinessStatus: 'unknown',
      paused: false,
      details: null
    }
  }

  if (entry.pausedAt) {
    return {
      integrationKey,
      ready: false,
      reason: `Integration paused: ${entry.pausedReason ?? 'no reason given'}`,
      health: 'idle',
      readinessStatus: entry.readinessStatus,
      paused: true,
      details: null
    }
  }

  if (entry.readinessStatus === 'blocked') {
    return {
      integrationKey,
      ready: false,
      reason: 'Integration readiness is blocked',
      health: 'down',
      readinessStatus: 'blocked',
      paused: false,
      details: null
    }
  }

  const healthMap = await getIntegrationHealthSnapshots([integrationKey])
  const snapshot = healthMap.get(integrationKey)

  if (snapshot?.health === 'down') {
    return {
      integrationKey,
      ready: false,
      reason: `Integration health is down (${snapshot.syncFailuresLast24h} failures, last sync: ${snapshot.freshnessLabel})`,
      health: 'down',
      readinessStatus: entry.readinessStatus,
      paused: false,
      details: null
    }
  }

  if (integrationKey === 'notion' && options?.requireRawFreshness) {
    const freshnessGate = await getNotionRawFreshnessGate()

    if (!freshnessGate.ready) {
      return {
        integrationKey,
        ready: false,
        reason: freshnessGate.reason,
        health: 'degraded',
        readinessStatus: entry.readinessStatus,
        paused: false,
        details: {
          boundaryStartAt: freshnessGate.boundaryStartAt,
          freshestRawSyncedAt: freshnessGate.freshestRawSyncedAt,
          activeSpaceCount: freshnessGate.activeSpaceCount,
          staleSpaces: freshnessGate.staleSpaces.map(space => ({
            spaceId: space.spaceId,
            maxTaskSyncedAt: space.maxTaskSyncedAt,
            maxProjectSyncedAt: space.maxProjectSyncedAt,
            reasons: space.reasons
          }))
        }
      }
    }
  }

  return {
    integrationKey,
    ready: true,
    reason: 'Integration is ready',
    health: snapshot?.health ?? 'idle',
    readinessStatus: entry.readinessStatus,
    paused: false,
    details: null
  }
}

/**
 * Check readiness for multiple integrations at once.
 * Returns a map of integrationKey -> ReadinessCheckResult.
 */
export const checkMultipleReadiness = async (
  integrationKeys: string[]
): Promise<Map<string, ReadinessCheckResult>> => {
  const results = new Map<string, ReadinessCheckResult>()

  const checks = await Promise.all(
    integrationKeys.map(key => checkIntegrationReadiness(key))
  )

  for (const check of checks) {
    results.set(check.integrationKey, check)
  }

  return results
}
