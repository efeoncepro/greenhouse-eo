import 'server-only'

/**
 * TASK-1242 — Reader gobernado del estado del HubSpot lead handoff (Full API Parity).
 *
 * Superficie de LECTURA reusable por UI/Nexa/MCP/CLI ("¿se sincronizó este lead a HubSpot?").
 * Compone el lead (`grader_leads`) + el gate del reporte (score releasable). No toca HubSpot.
 */

import { GraderReportError, readGraderReport } from '../report/command'
import { getGraderLeadForHandoff } from '../public-intake/store'

export type LeadHandoffStatus = 'no_lead' | 'pending' | 'not_releasable' | 'synced'

export interface LeadHandoffStatusView {
  runId: string
  hasLead: boolean
  consent: boolean
  /** El score está en estado releasable (`ready`/completed). */
  scoreReleasable: boolean
  /** ISO o null. */
  syncedAt: string | null
  status: LeadHandoffStatus
}

export const readLeadHandoffStatus = async (runId: string): Promise<LeadHandoffStatusView> => {
  const lead = await getGraderLeadForHandoff(runId)

  if (!lead) {
    return { runId, hasLead: false, consent: false, scoreReleasable: false, syncedAt: null, status: 'no_lead' }
  }

  let scoreReleasable = false

  try {
    const { report } = await readGraderReport({ runId })

    scoreReleasable = report.gate.status === 'ready'
  } catch (error) {
    if (!(error instanceof GraderReportError)) throw error
    // Sin score aún → no releasable (queda pending).
  }

  const status: LeadHandoffStatus = lead.hubspotSyncedAt
    ? 'synced'
    : scoreReleasable
      ? 'pending'
      : 'not_releasable'

  return {
    runId,
    hasLead: true,
    consent: lead.consent,
    scoreReleasable,
    syncedAt: lead.hubspotSyncedAt,
    status,
  }
}
