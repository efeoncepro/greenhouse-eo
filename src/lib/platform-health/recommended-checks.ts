import 'server-only'

import type { PlatformHealthRecommendedCheck } from '@/types/platform-health'

/**
 * Static catalogue of operator-runnable checks the composer can recommend
 * when a particular degradation is observed.
 *
 * Pure data: no DB access, no env-coupled values. Tests can assert exact
 * shape. New checks are added here; the composer filters by `appliesWhen`
 * and never has to mutate this list.
 *
 * Spec: docs/tasks/in-progress/TASK-672-platform-health-api-contract.md
 */

export const PLATFORM_HEALTH_CHECK_TRIGGERS = [
  'overall:degraded',
  'overall:blocked',
  'overall:unknown',
  'module:cloud:degraded',
  'module:cloud:blocked',
  'module:finance:degraded',
  'module:finance:blocked',
  'module:integrations.notion:degraded',
  'module:delivery:degraded',
  'source:reliability_control_plane:degraded',
  'source:operations_overview:degraded',
  'source:internal_runtime_health:degraded',
  'source:integration_readiness:degraded',
  'source:synthetic_monitoring:degraded',
  'source:webhook_delivery:degraded',
  'source:postgres_posture:degraded',
  'safe-mode:writeSafe:false',
  'safe-mode:deploySafe:false',
  'safe-mode:notifySafe:false',
  'safe-mode:backfillSafe:false'
] as const

export type PlatformHealthCheckTrigger =
  (typeof PLATFORM_HEALTH_CHECK_TRIGGERS)[number]

const CHECKS: PlatformHealthRecommendedCheck[] = [
  {
    id: 'reliability-overview',
    label: 'Inspect the full reliability overview',
    command: 'pnpm staging:request /api/admin/reliability --pretty',
    docs: 'docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md',
    appliesWhen: ['overall:degraded', 'overall:blocked', 'overall:unknown']
  },
  {
    id: 'platform-health-detail',
    label: 'Pull the detailed platform-health payload from admin lane',
    command: 'pnpm staging:request /api/admin/platform-health --pretty',
    docs: 'docs/documentation/plataforma/platform-health-api.md',
    appliesWhen: ['overall:degraded', 'overall:blocked']
  },
  {
    id: 'pg-doctor',
    label: 'Verify Postgres connectivity and access profiles',
    command: 'pnpm pg:doctor',
    docs: 'docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md',
    appliesWhen: [
      'module:cloud:degraded',
      'module:cloud:blocked',
      'source:postgres_posture:degraded',
      'source:internal_runtime_health:degraded',
      'safe-mode:writeSafe:false'
    ]
  },
  {
    id: 'inspect-handler-health',
    label: 'Inspect reactive handler state machine for active dead-letters',
    command: 'pnpm staging:request /api/admin/ops/reactive/handler-health --pretty',
    docs: 'docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md',
    appliesWhen: [
      'source:operations_overview:degraded',
      'safe-mode:writeSafe:false',
      'safe-mode:backfillSafe:false'
    ]
  },
  {
    id: 'inspect-webhook-endpoints',
    label: 'Inspect webhook endpoint health for active dead-letters',
    command: 'pnpm staging:request /api/admin/ops/webhooks/endpoint-health --pretty',
    docs: 'docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md',
    appliesWhen: [
      'source:webhook_delivery:degraded',
      'safe-mode:notifySafe:false'
    ]
  },
  {
    id: 'inspect-integration-readiness',
    label: 'Inspect per-integration readiness and last sync runs',
    command: 'pnpm staging:request /api/platform/ecosystem/integration-readiness --pretty',
    docs: 'docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md',
    appliesWhen: [
      'source:integration_readiness:degraded',
      'module:integrations.notion:degraded'
    ]
  },
  {
    id: 'rerun-synthetic-sweep',
    label: 'Trigger a fresh synthetic sweep against the deployment',
    command:
      'curl -X POST -H "Authorization: Bearer $CRON_SECRET" -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" "$STAGING_URL/api/cron/reliability-synthetic"',
    docs: 'docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md',
    appliesWhen: [
      'source:synthetic_monitoring:degraded',
      'overall:degraded',
      'overall:blocked'
    ]
  },
  {
    id: 'finance-data-quality',
    label: 'Inspect finance data quality drift and aging signals',
    docs: 'docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md',
    appliesWhen: ['module:finance:degraded', 'module:finance:blocked']
  },
  {
    id: 'notion-sync-trigger',
    label: 'Trigger the Notion conformed sync (Cloud Run + PG drain)',
    command:
      'gcloud scheduler jobs run ops-notion-conformed-sync --location=us-east4 --project=efeonce-group',
    docs: 'docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md',
    appliesWhen: ['module:integrations.notion:degraded', 'module:delivery:degraded']
  }
]

/**
 * Filter the catalogue to checks whose `appliesWhen` intersects the
 * provided trigger set. Order is stable (catalogue order). De-duplicated.
 */
export const collectRecommendedChecks = (
  triggers: ReadonlySet<string>
): PlatformHealthRecommendedCheck[] => {
  if (triggers.size === 0) return []

  const out: PlatformHealthRecommendedCheck[] = []
  const seen = new Set<string>()

  for (const check of CHECKS) {
    if (seen.has(check.id)) continue

    if (check.appliesWhen.some(condition => triggers.has(condition))) {
      out.push(check)
      seen.add(check.id)
    }
  }

  return out
}

export const PLATFORM_HEALTH_CHECK_CATALOGUE = CHECKS
