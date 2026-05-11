import 'server-only'

import { query } from '@/lib/db'

import { RELEASE_DEPLOY_WORKFLOW_NAMES } from './workflow-allowlist'
import { transitionReleaseState, type ReleaseManifest } from './manifest-store'
import {
  isReleaseState,
  isValidReleaseStateTransition,
  type ReleaseState
} from './state-machine'

export type GithubReleaseWebhookProcessingStatus =
  | 'ignored'
  | 'matched'
  | 'reconciled'
  | 'matched_no_transition'
  | 'unmatched'
  | 'failed'

export interface NormalizedGithubReleaseWebhookEvent {
  id: string
  inboxEventId: string
  deliveryId: string
  eventName: 'workflow_run' | 'workflow_job' | 'deployment_status' | 'check_suite' | 'check_run'
  action: string | null
  repositoryFullName: string | null
  workflowName: string | null
  workflowRunEvent: string | null
  workflowRunId: number | null
  workflowJobId: number | null
  checkSuiteId: number | null
  checkRunId: number | null
  deploymentId: number | null
  targetSha: string | null
  githubStatus: string | null
  githubConclusion: string | null
  redactedPayload: Record<string, unknown>
  evidence: Record<string, unknown>
}

export interface GithubReleaseWebhookReconcileResult {
  processingStatus: GithubReleaseWebhookProcessingStatus
  releaseId: string | null
  matchedBy: string | null
  transitionApplied: boolean
  transitionFromState: ReleaseState | null
  transitionToState: ReleaseState | null
  errorCode: string | null
  errorMessage: string | null
  evidence: Record<string, unknown>
}

const ACTIVE_RELEASE_STATES: readonly ReleaseState[] = [
  'preflight',
  'ready',
  'deploying',
  'verifying'
]

const FAILURE_CONCLUSIONS = new Set([
  'failure',
  'cancelled',
  'timed_out',
  'action_required',
  'startup_failure'
])

const FAILURE_STATUSES = new Set([
  'failure',
  'error',
  'inactive'
])

export const reconcileGithubReleaseWebhookEvent = async (
  event: NormalizedGithubReleaseWebhookEvent
): Promise<GithubReleaseWebhookReconcileResult> => {
  if (shouldIgnoreEvent(event)) {
    return {
      processingStatus: 'ignored',
      releaseId: null,
      matchedBy: null,
      transitionApplied: false,
      transitionFromState: null,
      transitionToState: null,
      errorCode: 'not_release_workflow',
      errorMessage: null,
      evidence: {
        ...event.evidence,
        ignoredReason: 'workflow_not_in_release_allowlist'
      }
    }
  }

  const match = await findReleaseMatch(event)

  if (!match.release) {
    return {
      processingStatus: 'unmatched',
      releaseId: null,
      matchedBy: null,
      transitionApplied: false,
      transitionFromState: null,
      transitionToState: null,
      errorCode: event.targetSha ? 'release_manifest_not_found' : 'missing_target_sha',
      errorMessage: null,
      evidence: {
        ...event.evidence,
        matchReason: event.targetSha ? 'no_recent_release_for_target_sha' : 'missing_target_sha'
      }
    }
  }

  const desiredTransition = deriveFailureTransition(match.release.state, event)

  if (!desiredTransition) {
    return {
      processingStatus: 'matched',
      releaseId: match.release.releaseId,
      matchedBy: match.matchedBy,
      transitionApplied: false,
      transitionFromState: match.release.state,
      transitionToState: null,
      errorCode: null,
      errorMessage: null,
      evidence: {
        ...event.evidence,
        releaseState: match.release.state,
        transitionReason: 'no_release_state_change_for_non_failure_event'
      }
    }
  }

  if (!isCanonicalReleaseFailureSource(event)) {
    return {
      processingStatus: 'matched_no_transition',
      releaseId: match.release.releaseId,
      matchedBy: match.matchedBy,
      transitionApplied: false,
      transitionFromState: match.release.state,
      transitionToState: desiredTransition,
      errorCode: 'non_canonical_release_failure_event',
      errorMessage: null,
      evidence: {
        ...event.evidence,
        releaseState: match.release.state,
        desiredTransition,
        transitionReason: 'failure_event_not_owned_by_production_orchestrator',
        workflowRunEvent: event.workflowRunEvent
      }
    }
  }

  if (!isValidReleaseStateTransition(match.release.state, desiredTransition)) {
    return {
      processingStatus: 'matched_no_transition',
      releaseId: match.release.releaseId,
      matchedBy: match.matchedBy,
      transitionApplied: false,
      transitionFromState: match.release.state,
      transitionToState: desiredTransition,
      errorCode: 'transition_not_allowed',
      errorMessage: null,
      evidence: {
        ...event.evidence,
        releaseState: match.release.state,
        desiredTransition
      }
    }
  }

  await transitionReleaseState({
    releaseId: match.release.releaseId,
    fromState: match.release.state,
    toState: desiredTransition,
    actorKind: 'system',
    actorLabel: 'system:github-release-webhook',
    reason: buildTransitionReason(event),
    metadata: {
      source: 'github_release_webhook',
      deliveryId: event.deliveryId,
      eventName: event.eventName,
      repositoryFullName: event.repositoryFullName,
      workflowName: event.workflowName,
      workflowRunEvent: event.workflowRunEvent,
      workflowRunId: event.workflowRunId,
      workflowJobId: event.workflowJobId,
      deploymentId: event.deploymentId,
      targetSha: event.targetSha,
      githubStatus: event.githubStatus,
      githubConclusion: event.githubConclusion,
      matchedBy: match.matchedBy
    },
    payloadExtras: {
      source: 'github_release_webhook',
      deliveryId: event.deliveryId,
      workflowName: event.workflowName,
      targetSha: event.targetSha
    }
  })

  return {
    processingStatus: 'reconciled',
    releaseId: match.release.releaseId,
    matchedBy: match.matchedBy,
    transitionApplied: true,
    transitionFromState: match.release.state,
    transitionToState: desiredTransition,
    errorCode: null,
    errorMessage: null,
    evidence: {
      ...event.evidence,
      releaseState: match.release.state,
      transitionedTo: desiredTransition
    }
  }
}

const shouldIgnoreEvent = (event: NormalizedGithubReleaseWebhookEvent): boolean => {
  if (event.eventName === 'deployment_status') return false
  if (!event.workflowName) return event.eventName !== 'check_suite'

  return !RELEASE_DEPLOY_WORKFLOW_NAMES.has(event.workflowName)
}

const findReleaseMatch = async (
  event: NormalizedGithubReleaseWebhookEvent
): Promise<{ release: ReleaseManifest | null; matchedBy: string | null }> => {
  if (event.targetSha) {
    const bySha = await findReleaseByTargetSha(event.targetSha)

    if (bySha) {
      return { release: bySha, matchedBy: 'target_sha' }
    }
  }

  if (event.workflowRunId) {
    const byWorkflowRun = await findReleaseByWorkflowRunId(event.workflowRunId)

    if (byWorkflowRun) {
      return { release: byWorkflowRun, matchedBy: 'workflow_run_id' }
    }
  }

  return { release: null, matchedBy: null }
}

const findReleaseByTargetSha = async (targetSha: string): Promise<ReleaseManifest | null> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT release_id, target_sha, source_branch, target_branch,
            state, attempt_n, triggered_by, operator_member_id,
            started_at, completed_at, vercel_deployment_url,
            previous_vercel_deployment_url, worker_revisions,
            previous_worker_revisions, workflow_runs,
            preflight_result, post_release_health, rollback_plan
       FROM greenhouse_sync.release_manifests
       WHERE target_branch = 'main'
         AND target_sha = $1
         AND started_at >= NOW() - INTERVAL '30 days'
       ORDER BY
         CASE WHEN state = ANY($2::text[]) THEN 0 ELSE 1 END,
         started_at DESC
       LIMIT 1`,
    [targetSha, ACTIVE_RELEASE_STATES]
  )

  return rows[0] ? rowToReleaseManifest(rows[0]) : null
}

const findReleaseByWorkflowRunId = async (workflowRunId: number): Promise<ReleaseManifest | null> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT release_id, target_sha, source_branch, target_branch,
            state, attempt_n, triggered_by, operator_member_id,
            started_at, completed_at, vercel_deployment_url,
            previous_vercel_deployment_url, worker_revisions,
            previous_worker_revisions, workflow_runs,
            preflight_result, post_release_health, rollback_plan
       FROM greenhouse_sync.release_manifests
       WHERE target_branch = 'main'
         AND started_at >= NOW() - INTERVAL '30 days'
       ORDER BY started_at DESC
       LIMIT 50`
  )

  return rows.map(rowToReleaseManifest).find(release => {
    return release.workflowRuns.some(run => workflowRunMatches(run, workflowRunId))
  }) ?? null
}

const workflowRunMatches = (value: unknown, workflowRunId: number): boolean => {
  if (!value || typeof value !== 'object') return false

  const record = value as Record<string, unknown>

  const candidates = [
    record.id,
    record.run_id,
    record.runId,
    record.workflow_run_id,
    record.workflowRunId
  ]

  return candidates.some(candidate => Number(candidate) === workflowRunId)
}

const deriveFailureTransition = (
  releaseState: ReleaseState,
  event: NormalizedGithubReleaseWebhookEvent
): ReleaseState | null => {
  if (!isFailureEvent(event)) return null
  if (releaseState === 'verifying') return 'degraded'
  if (releaseState === 'preflight' || releaseState === 'ready' || releaseState === 'deploying') return 'aborted'

  return null
}

const isFailureEvent = (event: NormalizedGithubReleaseWebhookEvent): boolean => {
  const conclusion = event.githubConclusion?.toLowerCase()
  const status = event.githubStatus?.toLowerCase()

  return Boolean(
    (conclusion && FAILURE_CONCLUSIONS.has(conclusion)) ||
    (event.eventName === 'deployment_status' && status && FAILURE_STATUSES.has(status))
  )
}

const isCanonicalReleaseFailureSource = (
  event: NormalizedGithubReleaseWebhookEvent
): boolean => {
  if (event.workflowName === 'Production Release Orchestrator') return true
  if (event.workflowRunEvent === 'workflow_call') return true

  return false
}

const buildTransitionReason = (event: NormalizedGithubReleaseWebhookEvent): string => {
  const workflow = event.workflowName ? ` ${event.workflowName}` : ''
  const outcome = event.githubConclusion || event.githubStatus || 'failure'

  return `GitHub webhook${workflow} reported ${outcome}`
}

const rowToReleaseManifest = (row: Record<string, unknown>): ReleaseManifest => ({
  releaseId: String(row.release_id),
  targetSha: String(row.target_sha),
  sourceBranch: String(row.source_branch),
  targetBranch: String(row.target_branch),
  state: isReleaseState(row.state) ? row.state : 'aborted',
  attemptN: Number(row.attempt_n),
  triggeredBy: String(row.triggered_by),
  operatorMemberId: row.operator_member_id != null ? String(row.operator_member_id) : null,
  startedAt: toIsoString(row.started_at),
  completedAt: row.completed_at != null ? toIsoString(row.completed_at) : null,
  vercelDeploymentUrl:
    row.vercel_deployment_url != null ? String(row.vercel_deployment_url) : null,
  previousVercelDeploymentUrl:
    row.previous_vercel_deployment_url != null
      ? String(row.previous_vercel_deployment_url)
      : null,
  workerRevisions: (row.worker_revisions as Record<string, unknown>) ?? {},
  previousWorkerRevisions:
    (row.previous_worker_revisions as Record<string, unknown>) ?? {},
  workflowRuns: Array.isArray(row.workflow_runs) ? row.workflow_runs : [],
  preflightResult: (row.preflight_result as Record<string, unknown>) ?? {},
  postReleaseHealth: (row.post_release_health as Record<string, unknown>) ?? {},
  rollbackPlan: (row.rollback_plan as Record<string, unknown>) ?? {}
})

const toIsoString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return new Date(value).toISOString()

  return new Date(0).toISOString()
}
