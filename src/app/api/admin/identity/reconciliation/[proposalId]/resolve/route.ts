import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { applyIdentityLink, updateProposalStatus } from '@/lib/identity/reconciliation/apply-link'
import type { ProposalStatus, ReconciliationProposal } from '@/lib/identity/reconciliation/types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ proposalId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { proposalId } = await params
  const session = await getServerSession(authOptions)
  const resolvedBy = session?.user?.email || 'admin'

  try {
    const body = await request.json()
    const action = body.action as string

    if (!['approve', 'reject', 'dismiss', 'reassign'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use: approve, reject, dismiss, reassign' }, { status: 400 })
    }

    // Load proposal
    const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
      `SELECT * FROM greenhouse_sync.identity_reconciliation_proposals WHERE proposal_id = $1`,
      [proposalId]
    )

    if (rows.length === 0) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

    const row = rows[0]

    const proposal: ReconciliationProposal = {
      proposalId: row.proposal_id as string,
      sourceSystem: row.source_system as ReconciliationProposal['sourceSystem'],
      sourceObjectType: row.source_object_type as string,
      sourceObjectId: row.source_object_id as string,
      sourceDisplayName: row.source_display_name as string | null,
      sourceEmail: row.source_email as string | null,
      discoveredIn: row.discovered_in as string,
      occurrenceCount: row.occurrence_count as number,
      candidateMemberId: row.candidate_member_id as string | null,
      candidateProfileId: row.candidate_profile_id as string | null,
      candidateDisplayName: row.candidate_display_name as string | null,
      matchConfidence: Number(row.match_confidence),
      matchSignals: (row.match_signals || []) as ReconciliationProposal['matchSignals'],
      status: row.status as ProposalStatus,
      resolvedBy: row.resolved_by as string | null,
      resolvedAt: row.resolved_at as string | null,
      resolutionNote: row.resolution_note as string | null,
      syncRunId: row.sync_run_id as string | null,
      createdAt: row.created_at as string
    }

    if (proposal.status !== 'pending') {
      return NextResponse.json({ error: `Proposal already resolved as '${proposal.status}'` }, { status: 409 })
    }

    const note = body.note || null

    switch (action) {
      case 'approve': {
        if (!proposal.candidateMemberId) {
          return NextResponse.json({ error: 'Cannot approve: no candidate member' }, { status: 400 })
        }

        await applyIdentityLink(proposal)
        await updateProposalStatus(proposalId, 'admin_approved', resolvedBy, note)
        break
      }

      case 'reassign': {
        const memberId = body.memberId as string

        if (!memberId) return NextResponse.json({ error: 'memberId required for reassign' }, { status: 400 })

        const reassigned = { ...proposal, candidateMemberId: memberId }

        await applyIdentityLink(reassigned)
        await updateProposalStatus(proposalId, 'admin_approved', resolvedBy, note || `Reassigned to ${memberId}`)
        break
      }

      case 'reject':
        await updateProposalStatus(proposalId, 'admin_rejected', resolvedBy, note)
        break

      case 'dismiss':
        await updateProposalStatus(proposalId, 'dismissed', resolvedBy, note)
        break
    }

    return NextResponse.json({ ok: true, proposalId, action })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
