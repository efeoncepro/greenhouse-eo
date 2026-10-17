/** Operator-only adapter over the canonical runtime connection and domain store. */
import type { LeadTraceInput } from './lead-trace-model'

export type PrivateHubspotTarget = {
  destinationId: string; portalId: string; formGuid: string; privateEmail?: string
  fromMs: number; toMs: number; nativeSubmissionId?: string
  occurrenceMarker?: { name: string; value: string }
}
export type LeadTraceSnapshot = { metadata: LeadTraceInput; privateHubspotTargets: PrivateHubspotTarget[] }
export type LeadTraceRuntime = {
  read(query: LeadTraceInput['query']): Promise<LeadTraceSnapshot | null>
  find(query: { privateEmail: string; from: Date; to: Date; limit: number }): Promise<{ candidates: unknown[]; hasMore: boolean }>
  tokenProvider(): Promise<string>
  close(): Promise<void>
}

/** Only the local operator process uses this adapter. Never import it into a route or worker. */
export async function createLeadTraceRuntime(): Promise<LeadTraceRuntime> {
  const { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } = await import('../lib/load-greenhouse-tool-env')

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')
  const { getDb, closeGreenhousePostgres } = await import('../../src/lib/db')
  const { sql } = await import('kysely')
  const { readGrowthLeadTrace, findGrowthLeadTraceCandidates } = await import('../../src/lib/growth/forms/lead-trace-store')

  const snapshot = async <T>(read: (transaction: Awaited<ReturnType<typeof getDb>>) => Promise<T>): Promise<T> => {
    const db = await getDb()

    return db.transaction().setAccessMode('read only').setIsolationLevel('repeatable read').execute(async transaction => {
      await sql`SET LOCAL statement_timeout = '8000ms'`.execute(transaction)
      const check = await sql<{ role: string; read_only: string }>`SELECT current_user AS role, current_setting('transaction_read_only') AS read_only`.execute(transaction)

      if (check.rows[0]?.role !== 'greenhouse_app' || check.rows[0]?.read_only !== 'on') throw new Error('runtime_readonly_profile_required')

      return read(transaction)
    })
  }

  return {
    read: query => snapshot(async db => await readGrowthLeadTrace(db, query) as LeadTraceSnapshot | null),
    find: query => snapshot(db => findGrowthLeadTraceCandidates(db, query)),
    tokenProvider: async () => {
      const { getHubSpotAccessToken } = await import('../../src/lib/hubspot/access-token')

      return getHubSpotAccessToken()
    },
    close: () => closeGreenhousePostgres(),
  }
}
