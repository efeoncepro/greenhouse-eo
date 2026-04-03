import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/db'
import { getNotionRawFreshnessGate } from '@/lib/integrations/notion-readiness'
import type { IntegrationHealth, IntegrationHealthSnapshot } from '@/types/integrations'

interface SyncRunRow extends Record<string, unknown> {
  source_system: string
  runs_24h: string | number
  failures_24h: string | number
  last_success: string | null
}

interface NotionFreshnessRow extends Record<string, unknown> {
  last_sync: string | null
}

interface ServicesFreshnessRow extends Record<string, unknown> {
  last_sync: string | null
}

const computeFreshness = (lastRun: string | null): { percent: number; label: string } => {
  if (!lastRun) return { percent: 0, label: 'Sin señal' }

  const hoursAgo = (Date.now() - new Date(lastRun).getTime()) / 3_600_000
  const percent = Math.max(0, Math.min(100, Math.round(100 - (hoursAgo / 48) * 100)))

  let label: string

  if (hoursAgo < 1) label = `hace ${Math.round(hoursAgo * 60)}min`
  else if (hoursAgo < 24) label = `hace ${Math.round(hoursAgo)}h`
  else label = `hace ${Math.round(hoursAgo / 24)}d`

  return { percent, label }
}

const deriveHealth = (runs: number, failures: number, lastRun: string | null): IntegrationHealth => {
  if (runs === 0 && failures === 0 && !lastRun) return 'idle'

  if (lastRun) {
    const hoursAgo = (Date.now() - new Date(lastRun).getTime()) / 3_600_000

    if (hoursAgo > 72) return failures > 0 ? 'down' : 'degraded'
    if (hoursAgo > 36) return 'degraded'

    return 'healthy'
  } else if (failures > 0) {
    return 'down'
  }

  return 'idle'
}

/** Build health snapshots for all registered integrations */
export const getIntegrationHealthSnapshots = async (
  integrationKeys: string[]
): Promise<Map<string, IntegrationHealthSnapshot>> => {
  const result = new Map<string, IntegrationHealthSnapshot>()

  // Initialize all keys with idle defaults
  for (const key of integrationKeys) {
    result.set(key, {
      integrationKey: key,
      health: 'idle',
      lastSyncAt: null,
      syncRunsLast24h: 0,
      syncFailuresLast24h: 0,
      freshnessPercent: 0,
      freshnessLabel: 'Sin señal'
    })
  }

  // Query source_sync_runs for all known source systems
  try {
    const syncRows = await runGreenhousePostgresQuery<SyncRunRow>(
      `SELECT
         source_system,
         COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours') AS runs_24h,
         COUNT(*) FILTER (WHERE status = 'failed' AND started_at > NOW() - INTERVAL '24 hours') AS failures_24h,
         MAX(finished_at) FILTER (WHERE status = 'succeeded') AS last_success
       FROM greenhouse_sync.source_sync_runs
       GROUP BY source_system`
    )

    for (const row of syncRows) {
      const key = mapSourceSystemToKey(row.source_system)

      if (key && result.has(key)) {
        const runs = Number(row.runs_24h)
        const failures = Number(row.failures_24h)
        const lastSync = row.last_success
        const freshness = computeFreshness(lastSync)

        result.set(key, {
          integrationKey: key,
          health: deriveHealth(runs, failures, lastSync),
          lastSyncAt: lastSync,
          syncRunsLast24h: runs,
          syncFailuresLast24h: failures,
          freshnessPercent: freshness.percent,
          freshnessLabel: freshness.label
        })
      }
    }
  } catch {
    // source_sync_runs may not exist — keep idle defaults
  }

  // Enrich Notion with space_notion_sources freshness
  try {
    const [notionRow] = await runGreenhousePostgresQuery<NotionFreshnessRow>(
      `SELECT MAX(last_synced_at)::text AS last_sync
       FROM greenhouse_core.space_notion_sources
       WHERE sync_enabled = TRUE`
    )

    if (notionRow?.last_sync && result.has('notion')) {
      const existing = result.get('notion')!
      const bestSync = laterOf(existing.lastSyncAt, notionRow.last_sync)
      const freshness = computeFreshness(bestSync)

      result.set('notion', {
        ...existing,
        lastSyncAt: bestSync,
        freshnessPercent: freshness.percent,
        freshnessLabel: freshness.label,
        health: existing.health === 'idle' ? deriveHealth(1, 0, bestSync) : existing.health
      })
    }
  } catch {
    // table may not exist
  }

  try {
    const rawFreshness = await getNotionRawFreshnessGate()

    if (result.has('notion') && rawFreshness.freshestRawSyncedAt) {
      const existing = result.get('notion')!
      const bestSync = laterOf(existing.lastSyncAt, rawFreshness.freshestRawSyncedAt)
      const freshness = computeFreshness(bestSync)

      result.set('notion', {
        ...existing,
        lastSyncAt: bestSync,
        freshnessPercent: freshness.percent,
        freshnessLabel: freshness.label,
        health: rawFreshness.ready
          ? existing.health === 'idle'
            ? deriveHealth(1, 0, bestSync)
            : existing.health
          : existing.health === 'down'
            ? 'down'
            : 'degraded'
      })
    }
  } catch {
    // BigQuery signal may be unavailable; keep existing health
  }

  // Enrich HubSpot with services freshness
  try {
    const [servicesRow] = await runGreenhousePostgresQuery<ServicesFreshnessRow>(
      `SELECT MAX(hubspot_last_synced_at)::text AS last_sync
       FROM greenhouse_core.services`
    )

    if (servicesRow?.last_sync && result.has('hubspot')) {
      const existing = result.get('hubspot')!
      const bestSync = laterOf(existing.lastSyncAt, servicesRow.last_sync)
      const freshness = computeFreshness(bestSync)

      result.set('hubspot', {
        ...existing,
        lastSyncAt: bestSync,
        freshnessPercent: freshness.percent,
        freshnessLabel: freshness.label,
        health: existing.health === 'idle' ? deriveHealth(1, 0, bestSync) : existing.health
      })
    }
  } catch {
    // table may not exist
  }

  return result
}

/** Map source_sync_runs.source_system values to integration_registry keys */
const mapSourceSystemToKey = (sourceSystem: string): string | null => {
  const map: Record<string, string> = {
    notion: 'notion',
    hubspot: 'hubspot',
    nubox: 'nubox',
    frame_io: 'frame_io',
    'frame.io': 'frame_io'
  }

  return map[sourceSystem.toLowerCase()] ?? null
}

/** Return the later of two ISO timestamps */
const laterOf = (a: string | null, b: string | null): string | null => {
  if (!a) return b
  if (!b) return a

  return new Date(a) > new Date(b) ? a : b
}
