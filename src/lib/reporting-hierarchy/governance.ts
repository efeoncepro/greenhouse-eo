import 'server-only'

import { randomUUID } from 'node:crypto'

import { sql } from 'kysely'

import { getDb, query } from '@/lib/db'
import {
  type EntraUserWithManager,
  fetchEntraUsersWithManagers
} from '@/lib/entra/graph-client'
import { buildEfeonceEmailAliasCandidates } from '@/lib/tenant/internal-email-aliases'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { normalizeNullableString } from '@/lib/hr-core/shared'
import { upsertReportingLine } from '@/lib/reporting-hierarchy/store'

import type {
  HrHierarchyGovernancePolicyAction,
  HrHierarchyGovernanceProposal,
  HrHierarchyGovernanceProposalStatus,
  HrHierarchyGovernanceResponse,
  HrHierarchyGovernanceRunSummary,
  HrHierarchyGovernanceSeverity
} from '@/types/hr-core'

type GovernanceMemberRow = {
  user_id: string
  member_id: string
  display_name: string | null
  email: string | null
  microsoft_email: string | null
  microsoft_oid: string | null
  reporting_line_id: string | null
  current_source_system: string | null
  supervisor_member_id: string | null
  supervisor_name: string | null
}

type GovernanceProposalRow = {
  proposal_id: string
  member_id: string
  member_name: string | null
  source_system: string
  source_sync_run_id: string | null
  source_member_id: string | null
  source_member_email: string | null
  source_member_name: string | null
  source_supervisor_id: string | null
  source_supervisor_email: string | null
  source_supervisor_name: string | null
  current_supervisor_member_id: string | null
  current_supervisor_name: string | null
  proposed_supervisor_member_id: string | null
  proposed_supervisor_name: string | null
  current_reporting_line_id: string | null
  status: HrHierarchyGovernanceProposalStatus
  drift_kind: string
  policy_action: HrHierarchyGovernancePolicyAction
  severity: HrHierarchyGovernanceSeverity
  occurrence_count: number | string
  first_detected_at: string
  last_detected_at: string
  resolved_at: string | null
  resolved_by_user_id: string | null
  resolution_note: string | null
  evidence_json: Record<string, unknown> | null
  source_snapshot_json: Record<string, unknown> | null
}

type GovernancePendingCountRow = {
  status: HrHierarchyGovernanceProposalStatus
  count: number | string
}

type GovernanceRunRow = {
  sync_run_id: string
  status: string
  sync_mode: string
  records_read: number | string | null
  records_written_raw: number | string | null
  notes: string | null
  started_at: string
  finished_at: string | null
}

type SourceMatch = {
  memberRow: GovernanceMemberRow
  entraUser: EntraUserWithManager | null
}

type DetectedDrift = {
  memberRow: GovernanceMemberRow
  driftKind: string
  policyAction: HrHierarchyGovernancePolicyAction
  severity: HrHierarchyGovernanceSeverity
  proposedSupervisorMemberId: string | null
  sourceSnapshot: Record<string, unknown>
  evidence: Record<string, unknown>
}

type ResolveHierarchyGovernanceProposalInput = {
  proposalId: string
  resolution: 'approve' | 'reject' | 'dismiss'
  actorUserId: string
  note?: string | null
}

type RunHierarchyGovernanceScanInput = {
  triggeredBy: string
  syncMode: 'manual' | 'poll' | 'webhook'
  entraUsers?: EntraUserWithManager[]
}

const GOVERNANCE_SOURCE_SYSTEM = 'azure-ad'
const GOVERNANCE_SOURCE_OBJECT_TYPE = 'reporting_hierarchy'

const buildRunId = () => `rh-sync-${randomUUID()}`
const buildProposalId = () => `rh-prop-${randomUUID()}`

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return value

  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

const isExternalHierarchySource = (value: string | null) =>
  Boolean(value && ['azure-ad', 'entra_graph', 'entra_manual_review'].includes(value))

const mapProposalRow = (row: GovernanceProposalRow): HrHierarchyGovernanceProposal => ({
  proposalId: row.proposal_id,
  memberId: row.member_id,
  memberName: row.member_name || row.member_id,
  sourceSystem: row.source_system,
  sourceSyncRunId: normalizeNullableString(row.source_sync_run_id),
  sourceMemberId: normalizeNullableString(row.source_member_id),
  sourceMemberEmail: normalizeNullableString(row.source_member_email),
  sourceMemberName: normalizeNullableString(row.source_member_name),
  sourceSupervisorId: normalizeNullableString(row.source_supervisor_id),
  sourceSupervisorEmail: normalizeNullableString(row.source_supervisor_email),
  sourceSupervisorName: normalizeNullableString(row.source_supervisor_name),
  currentSupervisorMemberId: normalizeNullableString(row.current_supervisor_member_id),
  currentSupervisorName: normalizeNullableString(row.current_supervisor_name),
  proposedSupervisorMemberId: normalizeNullableString(row.proposed_supervisor_member_id),
  proposedSupervisorName: normalizeNullableString(row.proposed_supervisor_name),
  currentReportingLineId: normalizeNullableString(row.current_reporting_line_id),
  status: row.status,
  driftKind: row.drift_kind,
  policyAction: row.policy_action,
  severity: row.severity,
  occurrenceCount: toNumber(row.occurrence_count),
  firstDetectedAt: row.first_detected_at,
  lastDetectedAt: row.last_detected_at,
  resolvedAt: normalizeNullableString(row.resolved_at),
  resolvedByUserId: normalizeNullableString(row.resolved_by_user_id),
  resolutionNote: normalizeNullableString(row.resolution_note),
  evidence: row.evidence_json ?? {},
  sourceSnapshot: row.source_snapshot_json ?? {}
})

const buildPolicySummary = () => ({
  canonicalSource: 'greenhouse_manual',
  externalSource: 'azure-ad',
  precedence: [
    'Greenhouse manual siempre gana por defecto sobre propuestas externas.',
    'Un cambio detectado desde Entra entra como propuesta auditable; no sobrescribe reporting_lines de forma silenciosa.',
    'Los approvals ya snapshot-eados en workflow_approval_snapshots no se recalculan por drift detection.'
  ]
})

const writeRunStart = async ({ runId, triggeredBy, syncMode }: { runId: string; triggeredBy: string; syncMode: string }) => {
  await query(
    `
      INSERT INTO greenhouse_sync.source_sync_runs (
        sync_run_id,
        source_system,
        source_object_type,
        sync_mode,
        status,
        records_read,
        records_written_raw,
        records_written_conformed,
        records_projected_postgres,
        triggered_by,
        notes,
        finished_at
      )
      VALUES ($1, $2, $3, $4, 'running', 0, 0, 0, 0, $5, NULL, NULL)
      ON CONFLICT (sync_run_id) DO NOTHING
    `,
    [runId, GOVERNANCE_SOURCE_SYSTEM, GOVERNANCE_SOURCE_OBJECT_TYPE, syncMode, triggeredBy]
  )
}

const writeRunComplete = async ({
  runId,
  status,
  recordsRead,
  recordsWritten,
  notes
}: {
  runId: string
  status: 'succeeded' | 'failed' | 'partial'
  recordsRead: number
  recordsWritten: number
  notes: string
}) => {
  await query(
    `
      UPDATE greenhouse_sync.source_sync_runs
      SET
        status = $2,
        records_read = $3,
        records_written_raw = $4,
        records_written_conformed = $4,
        records_projected_postgres = $4,
        notes = $5,
        finished_at = CURRENT_TIMESTAMP
      WHERE sync_run_id = $1
    `,
    [runId, status, recordsRead, recordsWritten, notes]
  )
}

const writeRunFailure = async (runId: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  await query(
    `
      UPDATE greenhouse_sync.source_sync_runs
      SET
        status = 'failed',
        notes = $2,
        finished_at = CURRENT_TIMESTAMP
      WHERE sync_run_id = $1
    `,
    [runId, message.slice(0, 500)]
  )
}

const listGovernanceMembers = async (): Promise<GovernanceMemberRow[]> => {
  const result = await query<GovernanceMemberRow>(
    `
      SELECT
        cu.user_id,
        cu.member_id,
        m.display_name,
        cu.email,
        cu.microsoft_email,
        cu.microsoft_oid,
        rl.reporting_line_id,
        rl.source_system AS current_source_system,
        rl.supervisor_member_id,
        supervisor.display_name AS supervisor_name
      FROM greenhouse_core.client_users AS cu
      INNER JOIN greenhouse_core.members AS m
        ON m.member_id = cu.member_id
      LEFT JOIN greenhouse_core.reporting_lines AS rl
        ON rl.member_id = cu.member_id
       AND rl.effective_to IS NULL
      LEFT JOIN greenhouse_core.members AS supervisor
        ON supervisor.member_id = rl.supervisor_member_id
      WHERE cu.active = TRUE
        AND cu.tenant_type = 'efeonce_internal'
        AND cu.member_id IS NOT NULL
        AND m.active = TRUE
      ORDER BY m.display_name ASC
    `
  )

  return result
}

const buildEntraMaps = (entraUsers: EntraUserWithManager[]) => {
  const byOid = new Map<string, EntraUserWithManager>()
  const byEmail = new Map<string, EntraUserWithManager>()

  for (const user of entraUsers) {
    if (user.id) {
      byOid.set(user.id, user)
    }

    const candidates = [user.mail, user.userPrincipalName].filter(Boolean) as string[]

    for (const candidate of candidates) {
      byEmail.set(candidate.toLowerCase(), user)

      for (const alias of buildEfeonceEmailAliasCandidates({
        email: candidate,
        fullName: user.displayName
      })) {
        byEmail.set(alias.toLowerCase(), user)
      }
    }
  }

  return { byOid, byEmail }
}

const matchMemberToEntraUser = (
  member: GovernanceMemberRow,
  sourceMaps: ReturnType<typeof buildEntraMaps>
): EntraUserWithManager | null => {
  if (member.microsoft_oid && sourceMaps.byOid.has(member.microsoft_oid)) {
    return sourceMaps.byOid.get(member.microsoft_oid) || null
  }

  const emails = [member.microsoft_email, member.email].filter(Boolean) as string[]

  for (const email of emails) {
    const direct = sourceMaps.byEmail.get(email.toLowerCase())

    if (direct) return direct

    for (const alias of buildEfeonceEmailAliasCandidates({
      email,
      fullName: member.display_name
    })) {
      const match = sourceMaps.byEmail.get(alias.toLowerCase())

      if (match) return match
    }
  }

  return null
}

const resolveManagerMember = (
  manager: EntraUserWithManager['manager'],
  sourceMatches: SourceMatch[]
): GovernanceMemberRow | null => {
  if (!manager) return null

  const byOid = new Map<string, GovernanceMemberRow>()
  const byEmail = new Map<string, GovernanceMemberRow>()

  for (const match of sourceMatches) {
    if (match.entraUser?.id) {
      byOid.set(match.entraUser.id, match.memberRow)
    }

    const emails = [
      match.entraUser?.mail,
      match.entraUser?.userPrincipalName,
      match.memberRow.microsoft_email,
      match.memberRow.email
    ].filter(Boolean) as string[]

    for (const email of emails) {
      byEmail.set(email.toLowerCase(), match.memberRow)

      for (const alias of buildEfeonceEmailAliasCandidates({
        email,
        fullName: match.memberRow.display_name
      })) {
        byEmail.set(alias.toLowerCase(), match.memberRow)
      }
    }
  }

  if (manager.id && byOid.has(manager.id)) {
    return byOid.get(manager.id) || null
  }

  const emails = [manager.mail, manager.userPrincipalName].filter(Boolean) as string[]

  for (const email of emails) {
    const direct = byEmail.get(email.toLowerCase())

    if (direct) return direct
  }

  return null
}

const detectDrift = (sourceMatches: SourceMatch[]): DetectedDrift[] => {
  const drifts: DetectedDrift[] = []

  for (const match of sourceMatches) {
    const { memberRow, entraUser } = match

    if (!entraUser) {
      continue
    }

    const managerMember = resolveManagerMember(entraUser.manager, sourceMatches)
    const proposedSupervisorMemberId = managerMember?.member_id ?? null
    const currentSupervisorMemberId = memberRow.supervisor_member_id ?? null

    const sourceSnapshot = {
      sourceMemberId: entraUser.id,
      sourceMemberEmail: entraUser.mail,
      sourceMemberName: entraUser.displayName,
      sourceSupervisorId: entraUser.manager?.id ?? null,
      sourceSupervisorEmail: entraUser.manager?.mail ?? entraUser.manager?.userPrincipalName ?? null,
      sourceSupervisorName: entraUser.manager?.displayName ?? null
    }

    if (entraUser.manager && !managerMember) {
      drifts.push({
        memberRow,
        driftKind: 'source_supervisor_unresolved',
        policyAction: 'review_required',
        severity: 'warning',
        proposedSupervisorMemberId: null,
        sourceSnapshot,
        evidence: {
          currentSupervisorMemberId,
          currentSourceSystem: memberRow.current_source_system,
          reason: 'Entra expone un manager, pero no se pudo mapear a un miembro interno activo.'
        }
      })

      continue
    }

    if (!entraUser.manager) {
      if (currentSupervisorMemberId && isExternalHierarchySource(memberRow.current_source_system)) {
        drifts.push({
          memberRow,
          driftKind: 'missing_source_supervisor',
          policyAction: 'review_required',
          severity: 'warning',
          proposedSupervisorMemberId: null,
          sourceSnapshot,
          evidence: {
            currentSupervisorMemberId,
            currentSourceSystem: memberRow.current_source_system,
            reason: 'La fuente externa dejó de exponer supervisor para una relación que ya estaba marcada como externa.'
          }
        })
      }

      continue
    }

    if (currentSupervisorMemberId === proposedSupervisorMemberId) {
      continue
    }

    drifts.push({
      memberRow,
      driftKind: currentSupervisorMemberId ? 'supervisor_mismatch' : 'missing_greenhouse_supervisor',
      policyAction: isExternalHierarchySource(memberRow.current_source_system)
        ? 'review_required'
        : 'blocked_manual_precedence',
      severity: 'warning',
      proposedSupervisorMemberId,
      sourceSnapshot,
      evidence: {
        currentSupervisorMemberId,
        currentSourceSystem: memberRow.current_source_system,
        proposedSupervisorMemberId,
        reason: currentSupervisorMemberId
          ? 'El supervisor actual en Greenhouse no coincide con el manager resuelto desde Entra.'
          : 'Greenhouse no tiene supervisor activo, pero Entra sí expone manager.'
      }
    })
  }

  return drifts
}

const upsertPendingProposal = async ({
  runId,
  drift
}: {
  runId: string
  drift: DetectedDrift
}) => {
  const existing = await query<{ proposal_id: string; occurrence_count: number | string }>(
    `
      SELECT proposal_id, occurrence_count
      FROM greenhouse_sync.reporting_hierarchy_drift_proposals
      WHERE member_id = $1
        AND source_system = $2
        AND drift_kind = $3
        AND status = 'pending'
      LIMIT 1
    `,
    [drift.memberRow.member_id, GOVERNANCE_SOURCE_SYSTEM, drift.driftKind]
  )

  if (existing[0]) {
    await query(
      `
        UPDATE greenhouse_sync.reporting_hierarchy_drift_proposals
        SET
          source_sync_run_id = $2,
          source_member_id = $3,
          source_member_email = $4,
          source_member_name = $5,
          source_supervisor_id = $6,
          source_supervisor_email = $7,
          source_supervisor_name = $8,
          current_supervisor_member_id = $9,
          proposed_supervisor_member_id = $10,
          current_reporting_line_id = $11,
          policy_action = $12,
          severity = $13,
          occurrence_count = occurrence_count + 1,
          last_detected_at = CURRENT_TIMESTAMP,
          evidence_json = $14::jsonb,
          source_snapshot_json = $15::jsonb,
          updated_at = CURRENT_TIMESTAMP
        WHERE proposal_id = $1
      `,
      [
        existing[0].proposal_id,
        runId,
        drift.sourceSnapshot.sourceMemberId ?? null,
        drift.sourceSnapshot.sourceMemberEmail ?? null,
        drift.sourceSnapshot.sourceMemberName ?? null,
        drift.sourceSnapshot.sourceSupervisorId ?? null,
        drift.sourceSnapshot.sourceSupervisorEmail ?? null,
        drift.sourceSnapshot.sourceSupervisorName ?? null,
        drift.memberRow.supervisor_member_id,
        drift.proposedSupervisorMemberId,
        drift.memberRow.reporting_line_id,
        drift.policyAction,
        drift.severity,
        JSON.stringify(drift.evidence),
        JSON.stringify(drift.sourceSnapshot)
      ]
    )

    return existing[0].proposal_id
  }

  const proposalId = buildProposalId()

  await query(
    `
      INSERT INTO greenhouse_sync.reporting_hierarchy_drift_proposals (
        proposal_id,
        member_id,
        source_system,
        source_sync_run_id,
        source_member_id,
        source_member_email,
        source_member_name,
        source_supervisor_id,
        source_supervisor_email,
        source_supervisor_name,
        current_supervisor_member_id,
        proposed_supervisor_member_id,
        current_reporting_line_id,
        status,
        drift_kind,
        policy_action,
        severity,
        occurrence_count,
        evidence_json,
        source_snapshot_json
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,'pending',$14,$15,$16,1,$17::jsonb,$18::jsonb
      )
    `,
    [
      proposalId,
      drift.memberRow.member_id,
      GOVERNANCE_SOURCE_SYSTEM,
      runId,
      drift.sourceSnapshot.sourceMemberId ?? null,
      drift.sourceSnapshot.sourceMemberEmail ?? null,
      drift.sourceSnapshot.sourceMemberName ?? null,
      drift.sourceSnapshot.sourceSupervisorId ?? null,
      drift.sourceSnapshot.sourceSupervisorEmail ?? null,
      drift.sourceSnapshot.sourceSupervisorName ?? null,
      drift.memberRow.supervisor_member_id,
      drift.proposedSupervisorMemberId,
      drift.memberRow.reporting_line_id,
      drift.driftKind,
      drift.policyAction,
      drift.severity,
      JSON.stringify(drift.evidence),
      JSON.stringify(drift.sourceSnapshot)
    ]
  )

  return proposalId
}

const dismissStalePendingProposals = async ({
  runId,
  activeMemberIds
}: {
  runId: string
  activeMemberIds: string[]
}) => {
  if (activeMemberIds.length === 0) {
    await query(
      `
        UPDATE greenhouse_sync.reporting_hierarchy_drift_proposals
        SET
          status = 'dismissed',
          resolved_at = CURRENT_TIMESTAMP,
          resolution_note = COALESCE(resolution_note, 'El drift ya no está presente en la última corrida.'),
          updated_at = CURRENT_TIMESTAMP
        WHERE source_system = $1
          AND status = 'pending'
          AND (
            source_sync_run_id IS NULL
            OR source_sync_run_id <> $2
          )
      `,
      [GOVERNANCE_SOURCE_SYSTEM, runId]
    )

    return
  }

  await query(
    `
      UPDATE greenhouse_sync.reporting_hierarchy_drift_proposals
      SET
        status = 'dismissed',
        resolved_at = CURRENT_TIMESTAMP,
        resolution_note = COALESCE(resolution_note, 'El drift ya no está presente en la última corrida.'),
        updated_at = CURRENT_TIMESTAMP
      WHERE source_system = $1
        AND status = 'pending'
        AND member_id <> ALL($2::text[])
        AND (
          source_sync_run_id IS NULL
          OR source_sync_run_id <> $3
        )
    `,
    [GOVERNANCE_SOURCE_SYSTEM, activeMemberIds, runId]
  )
}

const getPendingCountByStatus = async () => {
  const rows = await query<GovernancePendingCountRow>(
    `
      SELECT status, COUNT(*)::int AS count
      FROM greenhouse_sync.reporting_hierarchy_drift_proposals
      GROUP BY status
    `
  )

  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = toNumber(row.count)

    return acc
  }, {})
}

const getLastGovernanceRun = async (): Promise<HrHierarchyGovernanceRunSummary | null> => {
  const rows = await query<GovernanceRunRow>(
    `
      SELECT
        sync_run_id,
        status,
        sync_mode,
        records_read,
        records_written_raw,
        notes,
        started_at,
        finished_at
      FROM greenhouse_sync.source_sync_runs
      WHERE source_system = $1
        AND source_object_type = $2
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [GOVERNANCE_SOURCE_SYSTEM, GOVERNANCE_SOURCE_OBJECT_TYPE]
  )

  const row = rows[0]

  if (!row) return null

  return {
    syncRunId: row.sync_run_id,
    status: row.status,
    syncMode: row.sync_mode,
    recordsRead: toNumber(row.records_read),
    proposalsDetected: toNumber(row.records_written_raw),
    notes: normalizeNullableString(row.notes),
    startedAt: row.started_at,
    finishedAt: normalizeNullableString(row.finished_at)
  }
}

export const getHierarchyGovernanceOverview = async (limit = 20): Promise<HrHierarchyGovernanceResponse> => {
  const db = await getDb()

  const proposalsResult = await sql<GovernanceProposalRow>`
    SELECT
      p.proposal_id,
      p.member_id,
      member_ref.display_name AS member_name,
      p.source_system,
      p.source_sync_run_id,
      p.source_member_id,
      p.source_member_email,
      p.source_member_name,
      p.source_supervisor_id,
      p.source_supervisor_email,
      p.source_supervisor_name,
      p.current_supervisor_member_id,
      current_supervisor.display_name AS current_supervisor_name,
      p.proposed_supervisor_member_id,
      proposed_supervisor.display_name AS proposed_supervisor_name,
      p.current_reporting_line_id,
      p.status,
      p.drift_kind,
      p.policy_action,
      p.severity,
      p.occurrence_count,
      p.first_detected_at,
      p.last_detected_at,
      p.resolved_at,
      p.resolved_by_user_id,
      p.resolution_note,
      p.evidence_json,
      p.source_snapshot_json
    FROM greenhouse_sync.reporting_hierarchy_drift_proposals AS p
    INNER JOIN greenhouse_core.members AS member_ref
      ON member_ref.member_id = p.member_id
    LEFT JOIN greenhouse_core.members AS current_supervisor
      ON current_supervisor.member_id = p.current_supervisor_member_id
    LEFT JOIN greenhouse_core.members AS proposed_supervisor
      ON proposed_supervisor.member_id = p.proposed_supervisor_member_id
    ORDER BY
      CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END,
      p.last_detected_at DESC
    LIMIT ${limit}
  `.execute(db)

  const [summaryCounts, lastRun] = await Promise.all([
    getPendingCountByStatus(),
    getLastGovernanceRun()
  ])

  return {
    policy: buildPolicySummary(),
    lastRun,
    summary: {
      pending: summaryCounts.pending ?? 0,
      approved: summaryCounts.approved ?? 0,
      rejected: summaryCounts.rejected ?? 0,
      dismissed: summaryCounts.dismissed ?? 0,
      autoApplied: summaryCounts.auto_applied ?? 0
    },
    proposals: proposalsResult.rows.map(mapProposalRow)
  }
}

export const runEntraHierarchyGovernanceScan = async ({
  triggeredBy,
  syncMode,
  entraUsers: providedEntraUsers
}: RunHierarchyGovernanceScanInput): Promise<HrHierarchyGovernanceRunSummary> => {
  const runId = buildRunId()
  const startedAt = new Date().toISOString()

  await writeRunStart({ runId, triggeredBy, syncMode })

  try {
    const [entraUsers, governanceMembers] = await Promise.all([
      providedEntraUsers ? Promise.resolve(providedEntraUsers) : fetchEntraUsersWithManagers(),
      listGovernanceMembers()
    ])

    const sourceMaps = buildEntraMaps(entraUsers)

    const sourceMatches = governanceMembers.map(memberRow => ({
      memberRow,
      entraUser: matchMemberToEntraUser(memberRow, sourceMaps)
    }))

    const drifts = detectDrift(sourceMatches)
    const proposalIds: string[] = []

    for (const drift of drifts) {
      const proposalId = await upsertPendingProposal({ runId, drift })

      proposalIds.push(proposalId)

      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.reportingHierarchy,
        aggregateId: drift.memberRow.member_id,
        eventType: EVENT_TYPES.reportingHierarchyDriftDetected,
        payload: {
          proposalId,
          memberId: drift.memberRow.member_id,
          driftKind: drift.driftKind,
          policyAction: drift.policyAction,
          sourceSystem: GOVERNANCE_SOURCE_SYSTEM,
          proposedSupervisorMemberId: drift.proposedSupervisorMemberId,
          currentSupervisorMemberId: drift.memberRow.supervisor_member_id
        }
      })
    }

    await dismissStalePendingProposals({
      runId,
      activeMemberIds: drifts.map(drift => drift.memberRow.member_id)
    })

    const notes = `${entraUsers.length} usuarios Entra analizados; ${drifts.length} drift proposals activas en esta corrida.`

    await writeRunComplete({
      runId,
      status: 'succeeded',
      recordsRead: entraUsers.length,
      recordsWritten: drifts.length,
      notes
    })

    return {
      syncRunId: runId,
      status: 'succeeded',
      syncMode,
      recordsRead: entraUsers.length,
      proposalsDetected: drifts.length,
      notes,
      startedAt,
      finishedAt: new Date().toISOString()
    }
  } catch (error) {
    await writeRunFailure(runId, error)
    throw error
  }
}

export const resolveHierarchyGovernanceProposal = async ({
  proposalId,
  resolution,
  actorUserId,
  note
}: ResolveHierarchyGovernanceProposalInput): Promise<HrHierarchyGovernanceProposal> => {
  const proposalRows = await query<GovernanceProposalRow>(
    `
      SELECT
        p.proposal_id,
        p.member_id,
        member_ref.display_name AS member_name,
        p.source_system,
        p.source_sync_run_id,
        p.source_member_id,
        p.source_member_email,
        p.source_member_name,
        p.source_supervisor_id,
        p.source_supervisor_email,
        p.source_supervisor_name,
        p.current_supervisor_member_id,
        current_supervisor.display_name AS current_supervisor_name,
        p.proposed_supervisor_member_id,
        proposed_supervisor.display_name AS proposed_supervisor_name,
        p.current_reporting_line_id,
        p.status,
        p.drift_kind,
        p.policy_action,
        p.severity,
        p.occurrence_count,
        p.first_detected_at,
        p.last_detected_at,
        p.resolved_at,
        p.resolved_by_user_id,
        p.resolution_note,
        p.evidence_json,
        p.source_snapshot_json
      FROM greenhouse_sync.reporting_hierarchy_drift_proposals AS p
      INNER JOIN greenhouse_core.members AS member_ref
        ON member_ref.member_id = p.member_id
      LEFT JOIN greenhouse_core.members AS current_supervisor
        ON current_supervisor.member_id = p.current_supervisor_member_id
      LEFT JOIN greenhouse_core.members AS proposed_supervisor
        ON proposed_supervisor.member_id = p.proposed_supervisor_member_id
      WHERE p.proposal_id = $1
      LIMIT 1
    `,
    [proposalId]
  )

  const proposal = proposalRows[0]

  if (!proposal) {
    throw new Error('No encontramos la propuesta de drift solicitada.')
  }

  if (proposal.status !== 'pending') {
    return mapProposalRow(proposal)
  }

  let nextStatus: HrHierarchyGovernanceProposalStatus

  if (resolution === 'approve') {
    await upsertReportingLine({
      memberId: proposal.member_id,
      supervisorMemberId: proposal.proposed_supervisor_member_id,
      actorUserId,
      reason: note || 'approved_from_hierarchy_governance',
      sourceSystem: 'entra_manual_review',
      sourceMetadata: {
        proposalId,
        sourceSyncRunId: proposal.source_sync_run_id,
        sourceMemberId: proposal.source_member_id,
        sourceSupervisorId: proposal.source_supervisor_id
      }
    })

    nextStatus = 'approved'
  } else if (resolution === 'reject') {
    nextStatus = 'rejected'
  } else {
    nextStatus = 'dismissed'
  }

  await query(
    `
      UPDATE greenhouse_sync.reporting_hierarchy_drift_proposals
      SET
        status = $2,
        resolved_at = CURRENT_TIMESTAMP,
        resolved_by_user_id = $3,
        resolution_note = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE proposal_id = $1
    `,
    [proposalId, nextStatus, actorUserId, note || null]
  )

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.reportingHierarchy,
    aggregateId: proposal.member_id,
    eventType: EVENT_TYPES.reportingHierarchyProposalResolved,
    payload: {
      proposalId,
      memberId: proposal.member_id,
      resolution: nextStatus,
      resolvedByUserId: actorUserId,
      proposedSupervisorMemberId: proposal.proposed_supervisor_member_id
    }
  })

  const refreshed = await query<GovernanceProposalRow>(
    `
      SELECT
        p.proposal_id,
        p.member_id,
        member_ref.display_name AS member_name,
        p.source_system,
        p.source_sync_run_id,
        p.source_member_id,
        p.source_member_email,
        p.source_member_name,
        p.source_supervisor_id,
        p.source_supervisor_email,
        p.source_supervisor_name,
        p.current_supervisor_member_id,
        current_supervisor.display_name AS current_supervisor_name,
        p.proposed_supervisor_member_id,
        proposed_supervisor.display_name AS proposed_supervisor_name,
        p.current_reporting_line_id,
        p.status,
        p.drift_kind,
        p.policy_action,
        p.severity,
        p.occurrence_count,
        p.first_detected_at,
        p.last_detected_at,
        p.resolved_at,
        p.resolved_by_user_id,
        p.resolution_note,
        p.evidence_json,
        p.source_snapshot_json
      FROM greenhouse_sync.reporting_hierarchy_drift_proposals AS p
      INNER JOIN greenhouse_core.members AS member_ref
        ON member_ref.member_id = p.member_id
      LEFT JOIN greenhouse_core.members AS current_supervisor
        ON current_supervisor.member_id = p.current_supervisor_member_id
      LEFT JOIN greenhouse_core.members AS proposed_supervisor
        ON proposed_supervisor.member_id = p.proposed_supervisor_member_id
      WHERE p.proposal_id = $1
      LIMIT 1
    `,
    [proposalId]
  )

  return mapProposalRow(refreshed[0])
}
