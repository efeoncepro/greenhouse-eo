import 'server-only'

import type {
  PlatformHealthIssue,
  PlatformHealthModule,
  PlatformOverallStatus,
  PlatformSafeModes
} from '@/types/platform-health'

/**
 * Deterministic derivation of safe modes from per-module status.
 *
 * Rules are deliberately conservative: any uncertainty defaults to
 * `false`. A caller acting on `safeModes.writeSafe === true` should be
 * able to trust that AT LEAST the immediate write path is unobstructed.
 * False negatives (saying unsafe when safe) are acceptable; false
 * positives (saying safe when broken) are not.
 *
 * The mapping is table-driven so it stays trivially testable.
 *
 * Spec: docs/tasks/in-progress/TASK-672-platform-health-api-contract.md
 */

const STATUS_RANK: Record<PlatformOverallStatus, number> = {
  healthy: 0,
  degraded: 1,
  unknown: 2,
  blocked: 3
}

const moduleByKey = (
  modules: PlatformHealthModule[],
  key: string
): PlatformHealthModule | undefined => modules.find(m => m.moduleKey === key)

const isAtMost = (status: PlatformOverallStatus, max: PlatformOverallStatus): boolean =>
  STATUS_RANK[status] <= STATUS_RANK[max]

const isHealthyOrDegraded = (status: PlatformOverallStatus | undefined): boolean => {
  if (!status) return false

  return isAtMost(status, 'degraded')
}

const hasBlocking = (issues: PlatformHealthIssue[]): boolean =>
  issues.some(issue => issue.severity === 'error')

/**
 * Compute the safe-mode flags from the composed module set + blocking
 * issue list. Caller should pass the rolled-up overallStatus too — we
 * use it as the global gate for `agentAutomationSafe`.
 */
export const deriveSafeModes = ({
  overallStatus,
  modules,
  blockingIssues
}: {
  overallStatus: PlatformOverallStatus
  modules: PlatformHealthModule[]
  blockingIssues: PlatformHealthIssue[]
}): PlatformSafeModes => {
  const cloud = moduleByKey(modules, 'cloud')
  const finance = moduleByKey(modules, 'finance')
  const delivery = moduleByKey(modules, 'delivery')
  const notion = moduleByKey(modules, 'integrations.notion')

  // Read path: requires Postgres + BigQuery up. Cloud module surfaces both
  // via its runtime + posture signals. If cloud is blocked, reads are not
  // safe; if degraded (e.g. billing awaiting_data), reads are still safe.
  const readSafe =
    !!cloud && isAtMost(cloud.status, 'degraded') && !hasBlocking(blockingIssues)

  // Write path: requires reads + reactive backlog healthy + no blocking
  // dead-letter explosions. We approximate via cloud + delivery (delivery
  // surfaces the reactive worker subsystem). If either is blocked,
  // writes are unsafe.
  const writeSafe =
    readSafe &&
    isHealthyOrDegraded(delivery?.status) &&
    !blockingIssues.some(
      issue => issue.moduleKey === 'cloud' || issue.moduleKey === 'delivery'
    )

  // Deploy path: requires writes safe + no blocking issues anywhere.
  // We do NOT inspect CI status here (out of scope V1); a future
  // version may compose in a deployment health source.
  const deploySafe = writeSafe && overallStatus !== 'blocked'

  // Backfill path: long-running jobs. Requires writes safe + reactive
  // backlog acceptable. We refuse if delivery is degraded or blocked
  // because backfills will pile on top of an existing backlog.
  const backfillSafe = writeSafe && delivery?.status === 'healthy'

  // Notify path: outbound notifications (email, Teams, Slack). Requires
  // cloud reachable (so email delivery works) + no blocking webhook
  // issues. We are stricter here because a degraded notify path causes
  // alert fatigue or silent drops.
  const notifySafe =
    readSafe &&
    !blockingIssues.some(
      issue =>
        issue.source === 'webhook_delivery' ||
        issue.source === 'integration_readiness' ||
        issue.moduleKey === 'cloud'
    )

  // Agent automation: most conservative gate. Any blocking issue or
  // unknown overall status disables it. Agents must explicitly opt in
  // to act on degraded state via per-action checks.
  const agentAutomationSafe =
    overallStatus === 'healthy' &&
    !!cloud && cloud.status === 'healthy' &&
    !!finance && isHealthyOrDegraded(finance.status) &&
    !!delivery && isHealthyOrDegraded(delivery.status) &&
    !!notion && isHealthyOrDegraded(notion.status) &&
    blockingIssues.length === 0

  return {
    readSafe,
    writeSafe,
    deploySafe,
    backfillSafe,
    notifySafe,
    agentAutomationSafe
  }
}

/**
 * Build the trigger set used by `recommended-checks.ts` from the rolled-up
 * health snapshot. Triggers map to `appliesWhen` entries on each check.
 */
export const buildCheckTriggerSet = ({
  overallStatus,
  modules,
  safeModes,
  degradedSources
}: {
  overallStatus: PlatformOverallStatus
  modules: PlatformHealthModule[]
  safeModes: PlatformSafeModes
  degradedSources: { source: string; status: string }[]
}): Set<string> => {
  const triggers = new Set<string>()

  if (overallStatus !== 'healthy') {
    triggers.add(`overall:${overallStatus}`)
  }

  for (const moduleSnapshot of modules) {
    if (moduleSnapshot.status === 'degraded' || moduleSnapshot.status === 'blocked') {
      triggers.add(`module:${moduleSnapshot.moduleKey}:${moduleSnapshot.status}`)
    }
  }

  for (const degraded of degradedSources) {
    triggers.add(`source:${degraded.source}:degraded`)
  }

  if (!safeModes.writeSafe) triggers.add('safe-mode:writeSafe:false')
  if (!safeModes.deploySafe) triggers.add('safe-mode:deploySafe:false')
  if (!safeModes.notifySafe) triggers.add('safe-mode:notifySafe:false')
  if (!safeModes.backfillSafe) triggers.add('safe-mode:backfillSafe:false')

  return triggers
}
