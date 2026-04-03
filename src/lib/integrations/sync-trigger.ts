import 'server-only'

import { getIntegrationByKey } from '@/lib/integrations/registry'
import type { SyncTriggerResult } from '@/types/integrations'

/**
 * Trigger a sync for a registered integration by calling its sync_endpoint internally.
 * The sync endpoint is an internal API route (e.g. /api/cron/nubox-sync) that gets
 * called with the cron secret to bypass auth — same as if Vercel Cron triggered it.
 */
export const triggerSync = async (integrationKey: string): Promise<SyncTriggerResult> => {
  const entry = await getIntegrationByKey(integrationKey)

  if (!entry) {
    return { integrationKey, triggered: false, message: 'Integration not found', syncEndpoint: null }
  }

  if (entry.pausedAt) {
    return { integrationKey, triggered: false, message: `Integration paused: ${entry.pausedReason ?? 'no reason'}`, syncEndpoint: entry.syncEndpoint }
  }

  if (!entry.syncEndpoint) {
    return { integrationKey, triggered: false, message: 'No sync endpoint configured (passive integration)', syncEndpoint: null }
  }

  const cronSecret = process.env.CRON_SECRET?.trim()

  if (!cronSecret) {
    return { integrationKey, triggered: false, message: 'CRON_SECRET not configured', syncEndpoint: entry.syncEndpoint }
  }

  const baseUrl = getInternalBaseUrl()

  try {
    const response = await fetch(`${baseUrl}${entry.syncEndpoint}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(120_000)
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')

      return {
        integrationKey,
        triggered: false,
        message: `Sync endpoint returned ${response.status}: ${body.slice(0, 200)}`,
        syncEndpoint: entry.syncEndpoint
      }
    }

    return {
      integrationKey,
      triggered: true,
      message: 'Sync triggered successfully',
      syncEndpoint: entry.syncEndpoint
    }
  } catch (error) {
    return {
      integrationKey,
      triggered: false,
      message: `Sync failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      syncEndpoint: entry.syncEndpoint
    }
  }
}

const getInternalBaseUrl = (): string => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  return 'http://localhost:3000'
}
