import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { listPendingIntakeMembers } from '@/lib/workforce/intake-queue/list-pending-members'

import type { ReliabilityModuleKey, ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-872 Slice 6 — SCIM + Workforce reliability signals (6 readers).
 *
 * Cada reader degrada honestamente a `severity: 'unknown'` si su query falla
 * (e.g. proxy PG caído, migration no aplicada). NO bloquea el dashboard.
 * Roll up bajo moduleKey 'identity' (capabilities SCIM + workforce intake) o
 * 'workforce' (workforce intake transition) via incidentDomainTag canonical.
 *
 * Spec: docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md
 * Validated by arch-architect 2026-05-13 (Slice 1 Fix 4 deny/allow conflict signal + Slice 2 drift + Slice 4 intake gate).
 */

// ── Helpers ────────────────────────────────────────────────────────────────

const observedAtNow = () => new Date().toISOString()

const buildUnknownSignal = (
  signalId: string,
  moduleKey: ReliabilityModuleKey,
  kind: ReliabilitySignal['kind'],
  label: string,
  source: string,
  error: unknown
): ReliabilitySignal => ({
  signalId,
  moduleKey,
  kind,
  source,
  label,
  severity: 'unknown',
  summary: 'No fue posible leer el signal. Revisa los logs.',
  observedAt: observedAtNow(),
  evidence: [
    { kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }
  ]
})

// ── 1. identity.scim.users_without_identity_profile ─────────────────────────

export const IDENTITY_SCIM_USERS_WITHOUT_IDENTITY_PROFILE_SIGNAL_ID =
  'identity.scim.users_without_identity_profile'

export const getScimUsersWithoutIdentityProfileSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = observedAtNow()
  const source = 'getScimUsersWithoutIdentityProfileSignal'
  const label = 'SCIM users sin identity_profile'

  try {
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.client_users
       WHERE tenant_type = 'efeonce_internal'
         AND scim_id IS NOT NULL
         AND identity_profile_id IS NULL
         AND active = TRUE`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_SCIM_USERS_WITHOUT_IDENTITY_PROFILE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source,
      label,
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todos los SCIM users internos tienen identity_profile linkeado.'
          : `${count} SCIM user${count === 1 ? '' : 's'} interno${count === 1 ? '' : 's'} sin identity_profile. Primitive failed mid-tx o backfill pendiente.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_scim_users_without_identity_profile' } })

    return buildUnknownSignal(IDENTITY_SCIM_USERS_WITHOUT_IDENTITY_PROFILE_SIGNAL_ID, 'identity', 'data_quality', label, source, error)
  }
}

// ── 2. identity.scim.users_without_member ───────────────────────────────────

export const IDENTITY_SCIM_USERS_WITHOUT_MEMBER_SIGNAL_ID = 'identity.scim.users_without_member'

export const getScimUsersWithoutMemberSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = observedAtNow()
  const source = 'getScimUsersWithoutMemberSignal'
  const label = 'SCIM users internos sin member'

  try {
    // Excluye los que se sabe son `client_user_only` (functional_account / name_shape)
    // via JOIN con scim_sync_log error_message LIKE.
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.client_users cu
       WHERE cu.tenant_type = 'efeonce_internal'
         AND cu.scim_id IS NOT NULL
         AND cu.member_id IS NULL
         AND cu.active = TRUE
         AND NOT EXISTS (
           SELECT 1 FROM greenhouse_core.scim_sync_log l
           WHERE l.scim_id = cu.scim_id
             AND l.error_message ~ 'functional_account|name_shape_insufficient|client_user_only'
         )`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_SCIM_USERS_WITHOUT_MEMBER_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source,
      label,
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todos los SCIM users internos elegibles tienen member operativo.'
          : `${count} SCIM user${count === 1 ? '' : 's'} interno${count === 1 ? '' : 's'} elegible${count === 1 ? '' : 's'} sin member operativo. Backfill o primitive failure mid-tx.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Recovery',
          value: 'docs/operations/runbooks/scim-internal-collaborator-recovery.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_scim_users_without_member' } })

    return buildUnknownSignal(IDENTITY_SCIM_USERS_WITHOUT_MEMBER_SIGNAL_ID, 'identity', 'drift', label, source, error)
  }
}

// ── 3. identity.scim.ineligible_accounts_in_scope ───────────────────────────

export const IDENTITY_SCIM_INELIGIBLE_ACCOUNTS_IN_SCOPE_SIGNAL_ID =
  'identity.scim.ineligible_accounts_in_scope'

export const getScimIneligibleAccountsInScopeSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = observedAtNow()
  const source = 'getScimIneligibleAccountsInScopeSignal'
  const label = 'SCIM accounts ineligibles en scope Entra'

  try {
    // Cuenta scim_sync_log con error_message LIKE 'functional_account_excluded' OR 'name_shape_insufficient'
    // últimos 7 días. Steady state <5; warning si >5.
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.scim_sync_log
       WHERE operation = 'CREATE'
         AND (error_message LIKE 'functional_account%' OR error_message LIKE 'name_shape%' OR error_message LIKE '%client_user_only%')
         AND created_at > NOW() - INTERVAL '7 days'`
    )

    const count = Number(rows[0]?.n ?? 0)
    const severity = count === 0 ? 'ok' : count <= 5 ? 'warning' : 'error'

    return {
      signalId: IDENTITY_SCIM_INELIGIBLE_ACCOUNTS_IN_SCOPE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source,
      label,
      severity,
      summary:
        count === 0
          ? 'Sin accounts ineligibles detectadas en el scope SCIM últimos 7 días.'
          : `${count} account${count === 1 ? '' : 's'} ineligible${count === 1 ? '' : 's'} en scope SCIM últimos 7 días. Revisar scope Entra "Efeonce Group" o agregar admin override allowlist.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'metric', label: 'severity_threshold', value: '0 ok / 1-5 warning / >5 error' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_scim_ineligible_accounts_in_scope' } })

    return buildUnknownSignal(IDENTITY_SCIM_INELIGIBLE_ACCOUNTS_IN_SCOPE_SIGNAL_ID, 'identity', 'drift', label, source, error)
  }
}

// ── 4. identity.scim.member_identity_drift ──────────────────────────────────

export const IDENTITY_SCIM_MEMBER_IDENTITY_DRIFT_SIGNAL_ID = 'identity.scim.member_identity_drift'

export const getScimMemberIdentityDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = observedAtNow()
  const source = 'getScimMemberIdentityDriftSignal'
  const label = 'SCIM member identity drift'

  try {
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.scim_sync_log
       WHERE operation = 'CREATE'
         AND error_message LIKE 'member_identity_drift%'
         AND created_at > NOW() - INTERVAL '30 days'`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_SCIM_MEMBER_IDENTITY_DRIFT_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source,
      label,
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin drift D-2 detectado en cascade lookup (identity_profile_id ⇄ azure_oid ⇄ email).'
          : `${count} drift event${count === 1 ? '' : 's'} D-2 detectado${count === 1 ? '' : 's'} últimos 30 días. Humano debe resolver via admin endpoint reassign.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Recovery',
          value: 'docs/operations/runbooks/scim-internal-collaborator-recovery.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_scim_member_identity_drift' } })

    return buildUnknownSignal(IDENTITY_SCIM_MEMBER_IDENTITY_DRIFT_SIGNAL_ID, 'identity', 'data_quality', label, source, error)
  }
}

// ── 5. workforce.scim_members_pending_profile_completion ────────────────────

export const WORKFORCE_SCIM_MEMBERS_PENDING_PROFILE_COMPLETION_SIGNAL_ID =
  'workforce.scim_members_pending_profile_completion'

export const getWorkforceScimMembersPendingProfileCompletionSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = observedAtNow()
  const source = 'getWorkforceScimMembersPendingProfileCompletionSignal'
  const label = 'Members SCIM con ficha laboral pendiente'

  try {
    const rows = await query<{ n: number; max_age_days: number | null }>(
      `SELECT COUNT(*)::int AS n,
              EXTRACT(DAY FROM (NOW() - MIN(created_at)))::int AS max_age_days
       FROM greenhouse_core.members
       WHERE workforce_intake_status = 'pending_intake'
         AND created_at < NOW() - INTERVAL '7 days'`
    )

    const count = Number(rows[0]?.n ?? 0)
    const maxAgeDays = Number(rows[0]?.max_age_days ?? 0)
    const severity = count === 0 ? 'ok' : maxAgeDays >= 30 ? 'error' : 'warning'

    return {
      signalId: WORKFORCE_SCIM_MEMBERS_PENDING_PROFILE_COMPLETION_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source,
      label,
      severity,
      summary:
        count === 0
          ? 'Sin members con ficha laboral pendiente > 7 días.'
          : `${count} member${count === 1 ? '' : 's'} con ficha pendiente > 7 días${maxAgeDays >= 30 ? ` (máx ${maxAgeDays} días — escalar)` : ''}. HR debe completar intake via admin endpoint.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'metric', label: 'max_age_days', value: String(maxAgeDays) },
        { kind: 'metric', label: 'thresholds', value: '0 ok / >7d warning / >30d error' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_workforce_scim_members_pending_profile_completion' }
    })

    return buildUnknownSignal(
      WORKFORCE_SCIM_MEMBERS_PENDING_PROFILE_COMPLETION_SIGNAL_ID,
      'identity',
      'drift',
      label,
      source,
      error
    )
  }
}

export const WORKFORCE_ACTIVATION_BLOCKER_BACKLOG_SIGNAL_ID =
  'workforce.activation.blocker_backlog'

export const getWorkforceActivationBlockerBacklogSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = observedAtNow()
  const source = 'getWorkforceActivationBlockerBacklogSignal'
  const label = 'Workforce Activation blockers'

  try {
    const page = await listPendingIntakeMembers({ pageSize: 100, includeReadiness: true })
    const blockerCount = page.items.reduce((sum, item) => sum + (item.activationReadiness?.blockerCount ?? 0), 0)
    const blockedPeople = page.items.filter(item => (item.activationReadiness?.blockerCount ?? 0) > 0).length
    const severity = blockedPeople === 0 ? 'ok' : blockedPeople >= 25 ? 'error' : 'warning'

    return {
      signalId: WORKFORCE_ACTIVATION_BLOCKER_BACKLOG_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source,
      label,
      severity,
      summary:
        blockedPeople === 0
          ? 'Sin personas pendientes con blockers críticos de activación.'
          : `${blockedPeople} persona${blockedPeople === 1 ? '' : 's'} con ${blockerCount} blocker${blockerCount === 1 ? '' : 's'} crítico${blockerCount === 1 ? '' : 's'} en Workforce Activation.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'blocked_people_sample_100', value: String(blockedPeople) },
        { kind: 'metric', label: 'critical_blockers_sample_100', value: String(blockerCount) },
        { kind: 'doc', label: 'Workspace', value: '/hr/workforce/activation' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_workforce_activation_blocker_backlog' }
    })

    return buildUnknownSignal(WORKFORCE_ACTIVATION_BLOCKER_BACKLOG_SIGNAL_ID, 'identity', 'data_quality', label, source, error)
  }
}

export const WORKFORCE_ACTIVATION_READY_NOT_COMPLETED_SIGNAL_ID =
  'workforce.activation.ready_not_completed'

export const getWorkforceActivationReadyNotCompletedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = observedAtNow()
  const source = 'getWorkforceActivationReadyNotCompletedSignal'
  const label = 'Workforce listo sin completar'

  try {
    const page = await listPendingIntakeMembers({ pageSize: 100, includeReadiness: true })
    const readyCount = page.items.filter(item => item.activationReadiness?.ready).length
    const severity = readyCount === 0 ? 'ok' : readyCount >= 10 ? 'warning' : 'ok'

    return {
      signalId: WORKFORCE_ACTIVATION_READY_NOT_COMPLETED_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source,
      label,
      severity,
      summary:
        readyCount === 0
          ? 'No hay fichas listas esperando cierre.'
          : `${readyCount} ficha${readyCount === 1 ? '' : 's'} lista${readyCount === 1 ? '' : 's'} para completar intake.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'ready_not_completed_sample_100', value: String(readyCount) },
        { kind: 'doc', label: 'Workspace', value: '/hr/workforce/activation' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_workforce_activation_ready_not_completed' }
    })

    return buildUnknownSignal(WORKFORCE_ACTIVATION_READY_NOT_COMPLETED_SIGNAL_ID, 'identity', 'drift', label, source, error)
  }
}

// ── 6. identity.scim.allowlist_blocklist_conflict (arch-architect Fix 4) ────

export const IDENTITY_SCIM_ALLOWLIST_BLOCKLIST_CONFLICT_SIGNAL_ID =
  'identity.scim.allowlist_blocklist_conflict'

export const getScimAllowlistBlocklistConflictSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = observedAtNow()
  const source = 'getScimAllowlistBlocklistConflictSignal'
  const label = 'SCIM eligibility override conflict (allow ⊕ deny)'

  try {
    // Cuenta pares (allow, deny) ACTIVOS para mismo (mapping, match_type, match_value).
    // Hard rule canonical: deny gana, pero el conflict ES anomaly que debe verse.
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.scim_eligibility_overrides a
       INNER JOIN greenhouse_core.scim_eligibility_overrides d
         ON a.scim_tenant_mapping_id = d.scim_tenant_mapping_id
        AND a.match_type = d.match_type
        AND a.match_value = d.match_value
       WHERE a.effect = 'allow' AND a.effective_to IS NULL
         AND d.effect = 'deny' AND d.effective_to IS NULL`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_SCIM_ALLOWLIST_BLOCKLIST_CONFLICT_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source,
      label,
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin conflictos allow ⊕ deny en eligibility overrides activos.'
          : `${count} conflict${count === 1 ? '' : 's'} (allow ⊕ deny) activos para mismo target. Deny gana per hard rule, pero conflict requiere resolución humana via supersede.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Recovery',
          value: 'docs/operations/runbooks/scim-internal-collaborator-recovery.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_scim_allowlist_blocklist_conflict' } })

    return buildUnknownSignal(IDENTITY_SCIM_ALLOWLIST_BLOCKLIST_CONFLICT_SIGNAL_ID, 'identity', 'data_quality', label, source, error)
  }
}

// ── 9. identity.external_identity.notion_required_missing ───────────────────

export const IDENTITY_EXTERNAL_NOTION_REQUIRED_MISSING_SIGNAL_ID =
  'identity.external_identity.notion_required_missing'

export const getIdentityExternalNotionRequiredMissingSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = observedAtNow()
  const source = 'getIdentityExternalNotionRequiredMissingSignal'
  const label = 'Members asignables sin Notion'

  try {
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.members m
       WHERE m.active = TRUE
         AND m.assignable = TRUE
         AND m.workforce_intake_status IN ('pending_intake', 'in_review')
         AND m.notion_user_id IS NULL
         AND NOT EXISTS (
           SELECT 1
           FROM greenhouse_core.identity_profile_source_links sl
           WHERE sl.profile_id = m.identity_profile_id
             AND sl.source_system = 'notion'
             AND sl.source_object_type = 'user'
             AND sl.active = TRUE
       )`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_EXTERNAL_NOTION_REQUIRED_MISSING_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source,
      label,
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Todos los members asignables en activación tienen identidad Notion resuelta o no la requieren.'
          : `${count} member${count === 1 ? '' : 's'} asignable${count === 1 ? '' : 's'} en activación sin link Notion activo.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-877-workforce-external-identity-reconciliation.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_external_notion_required_missing' } })

    return buildUnknownSignal(IDENTITY_EXTERNAL_NOTION_REQUIRED_MISSING_SIGNAL_ID, 'identity', 'data_quality', label, source, error)
  }
}

// ── 10. identity.external_identity.notion_link_conflicts ────────────────────

export const IDENTITY_EXTERNAL_NOTION_LINK_CONFLICTS_SIGNAL_ID =
  'identity.external_identity.notion_link_conflicts'

export const getIdentityExternalNotionLinkConflictsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = observedAtNow()
  const source = 'getIdentityExternalNotionLinkConflictsSignal'
  const label = 'Conflictos de link Notion'

  try {
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM (
         SELECT source_object_id
         FROM greenhouse_core.identity_profile_source_links
         WHERE source_system = 'notion'
           AND source_object_type = 'user'
           AND active = TRUE
         GROUP BY source_object_id
         HAVING COUNT(DISTINCT profile_id) > 1
       ) conflicts`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_EXTERNAL_NOTION_LINK_CONFLICTS_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source,
      label,
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin usuarios Notion activos asignados a múltiples perfiles People.'
          : `${count} usuario${count === 1 ? '' : 's'} Notion con links activos contra múltiples perfiles People.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'sql', label: 'table', value: 'greenhouse_core.identity_profile_source_links' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_external_notion_link_conflicts' } })

    return buildUnknownSignal(IDENTITY_EXTERNAL_NOTION_LINK_CONFLICTS_SIGNAL_ID, 'identity', 'drift', label, source, error)
  }
}

// ── Aggregator: readers in parallel, filter out null catches ────────────────

export const getScimWorkforceSignals = async (): Promise<ReliabilitySignal[]> => {
  const results = await Promise.all([
    getScimUsersWithoutIdentityProfileSignal().catch(() => null),
    getScimUsersWithoutMemberSignal().catch(() => null),
    getScimIneligibleAccountsInScopeSignal().catch(() => null),
    getScimMemberIdentityDriftSignal().catch(() => null),
    getWorkforceScimMembersPendingProfileCompletionSignal().catch(() => null),
    getWorkforceActivationBlockerBacklogSignal().catch(() => null),
    getWorkforceActivationReadyNotCompletedSignal().catch(() => null),
    getScimAllowlistBlocklistConflictSignal().catch(() => null),
    getIdentityExternalNotionRequiredMissingSignal().catch(() => null),
    getIdentityExternalNotionLinkConflictsSignal().catch(() => null)
  ])

  return results.filter((s): s is ReliabilitySignal => s !== null)
}
