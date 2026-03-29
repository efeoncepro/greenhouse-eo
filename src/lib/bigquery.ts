import { BigQuery } from '@google-cloud/bigquery'

import { getBigQueryMaximumBytesBilled, getBigQueryQueryOptions } from '@/lib/cloud/bigquery'
import { getGoogleAuthOptions, getGoogleProjectId } from '@/lib/google-credentials'

let bigQueryClient: BigQuery | undefined

/**
 * Returns a BigQuery client with automatic cost guard.
 *
 * Every `.query()` call is wrapped to inject `maximumBytesBilled` (default 1 GB)
 * unless the caller provides an explicit override. This protects all 50+ query
 * sites without requiring per-file changes.
 *
 * If a query is blocked for exceeding the byte limit, the error is logged with
 * context and re-thrown so callers see a clear message.
 */
export const getBigQueryClient = () => {
  if (bigQueryClient) {
    return bigQueryClient
  }

  const client = new BigQuery(getGoogleAuthOptions())

  const originalQueryFn = client.query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).query = async (optionsOrQuery: any, ...rest: any[]) => {
    if (typeof optionsOrQuery === 'object' && !('maximumBytesBilled' in optionsOrQuery)) {
      optionsOrQuery = {
        ...optionsOrQuery,
        maximumBytesBilled: String(getBigQueryMaximumBytesBilled())
      }
    }

    try {
      return await originalQueryFn.call(client, optionsOrQuery, ...rest)
    } catch (error) {
      if (error instanceof Error && error.message.includes('bytes billed')) {
        const querySnippet = typeof optionsOrQuery === 'object'
          ? String(optionsOrQuery.query ?? '').slice(0, 200)
          : String(optionsOrQuery).slice(0, 200)
        const limit = optionsOrQuery?.maximumBytesBilled ?? String(getBigQueryMaximumBytesBilled())

        console.error(`[bigquery-guard] Query blocked by maximumBytesBilled (${limit}): ${querySnippet}`)

        logBlockedQuery(querySnippet, limit)

        // Fire-and-forget Slack alert
        notifyBlockedQuery(querySnippet, limit).catch(() => {})
      }

      throw error
    }
  }

  bigQueryClient = client

  return bigQueryClient
}

export const getBigQueryProjectId = () => getGoogleProjectId()
export { getBigQueryQueryOptions }

// ── Blocked query tracking ──

interface BlockedQueryEntry {
  query: string
  limit: string
  timestamp: string
}

const blockedQueries: BlockedQueryEntry[] = []
const MAX_BLOCKED_LOG = 50

const logBlockedQuery = (querySnippet: string, limit?: string) => {
  blockedQueries.push({
    query: querySnippet,
    limit: limit ?? String(getBigQueryMaximumBytesBilled()),
    timestamp: new Date().toISOString()
  })

  if (blockedQueries.length > MAX_BLOCKED_LOG) {
    blockedQueries.splice(0, blockedQueries.length - MAX_BLOCKED_LOG)
  }
}

/** Returns recent queries blocked by the cost guard (in-memory, resets on cold start) */
export const getBlockedQueries = (): readonly BlockedQueryEntry[] => blockedQueries

const notifyBlockedQuery = async (querySnippet: string, limit: string) => {
  try {
    const { sendSlackAlert } = await import('@/lib/alerts/slack-notify')
    const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown'

    await sendSlackAlert(
      `:no_entry: BigQuery query blocked by cost guard\nEnv: \`${env}\`\nLimit: \`${limit}\` bytes\nQuery:\n\`\`\`${querySnippet}\`\`\``
    )
  } catch {
    // Best-effort — don't let notification failure mask the original error
  }
}
