import 'server-only'

import type { ReliabilityModuleDefinition, ReliabilityModuleKey } from '@/types/reliability'

/**
 * Static seed of the reliability registry.
 *
 * The registry maps each critical module to:
 *  - the surfaces (routes/APIs) operators expect to be reachable
 *  - the operational dependencies that, if degraded, propagate to the module
 *  - the smoke tests already in CI that protect the module
 *  - the kinds of signals we expect to see for the module today (not future)
 *
 * Adding a module here is the canonical way to declare it as critical.
 * Adding a `ReliabilitySignalKind` here is a contract: a signal of that kind
 * is expected to exist now or to be plumbed in soon (registered as an
 * integration boundary in `RELIABILITY_INTEGRATION_BOUNDARIES`).
 */
export const RELIABILITY_REGISTRY: ReliabilityModuleDefinition[] = [
  {
    moduleKey: 'finance',
    label: 'Finance',
    description:
      'Cotizaciones, facturación, reconciliación, P&L y aging. Crítico para la operación comercial diaria.',
    domain: 'finance',
    routes: [
      { path: '/finance', label: 'Finance home' },
      { path: '/finance/quotes', label: 'Cotizaciones' },
      { path: '/finance/clients', label: 'Clientes finanzas' },
      { path: '/finance/expenses', label: 'Egresos' }
    ],
    apis: [
      { path: '/api/finance/income', label: 'Ingresos' },
      { path: '/api/finance/expenses', label: 'Egresos' },
      { path: '/api/finance/quotations', label: 'Cotizaciones' }
    ],
    dependencies: ['greenhouse_finance schema', 'cloud.postgres', 'pricing-engine-v2', 'HubSpot deals bridge'],
    smokeTests: ['tests/e2e/smoke/finance-quotes.spec.ts'],
    expectedSignalKinds: ['subsystem', 'incident', 'test_lane']
  },
  {
    moduleKey: 'integrations.notion',
    label: 'Notion Integration',
    description:
      'Sync Notion → Greenhouse para delivery (tasks, projects). Backbone para visibilidad del trabajo del agency.',
    domain: 'integrations',
    routes: [
      { path: '/admin/integrations', label: 'Cloud & Integrations' },
      { path: '/agency/operations', label: 'Operaciones agency' }
    ],
    apis: [
      { path: '/api/admin/ops/services-sync', label: 'Manual sync trigger' },
      { path: '/api/internal/integrations/notion', label: 'Notion integration health' }
    ],
    dependencies: [
      'greenhouse_sync.source_sync_runs',
      'greenhouse_sync.integration_data_quality_runs',
      'notion-bq-sync Cloud Run service'
    ],
    smokeTests: [],
    expectedSignalKinds: ['subsystem', 'data_quality', 'freshness']
  },
  {
    moduleKey: 'cloud',
    label: 'Cloud Platform',
    description:
      'Postura cloud, runtime checks, observabilidad Sentry/Slack y guardrails de costo BigQuery.',
    domain: 'platform',
    routes: [
      { path: '/admin/integrations', label: 'Cloud & Integrations' },
      { path: '/admin/ops-health', label: 'Ops Health' }
    ],
    apis: [
      { path: '/api/internal/health', label: 'Internal health probe' }
    ],
    dependencies: [
      'GCP Workload Identity Federation',
      'Cloud SQL connector',
      'Sentry incident reader',
      'BigQuery cost guard'
    ],
    smokeTests: [],
    expectedSignalKinds: ['runtime', 'posture', 'incident', 'cost_guard']
  },
  {
    moduleKey: 'delivery',
    label: 'Delivery',
    description:
      'Pipeline conformed Notion → delivery_tasks/projects, ICO metrics y observabilidad reactiva del trabajo.',
    domain: 'delivery',
    routes: [
      { path: '/agency/operations', label: 'Operaciones' },
      { path: '/admin/ops-health', label: 'Ops Health' }
    ],
    apis: [
      { path: '/api/agency/operations', label: 'Operations overview' }
    ],
    dependencies: [
      'greenhouse_conformed.delivery_tasks',
      'greenhouse_serving.ico_member_metrics',
      'reactive worker (ops-worker)'
    ],
    smokeTests: [],
    expectedSignalKinds: ['subsystem', 'data_quality', 'freshness']
  }
]

const REGISTRY_BY_KEY: Map<ReliabilityModuleKey, ReliabilityModuleDefinition> = new Map(
  RELIABILITY_REGISTRY.map(definition => [definition.moduleKey, definition])
)

export const getReliabilityModuleDefinition = (
  moduleKey: ReliabilityModuleKey
): ReliabilityModuleDefinition | null => REGISTRY_BY_KEY.get(moduleKey) ?? null

export const listReliabilityModuleKeys = (): ReliabilityModuleKey[] =>
  RELIABILITY_REGISTRY.map(definition => definition.moduleKey)
