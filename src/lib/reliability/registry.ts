/**
 * Static seed of the reliability registry — pure data, safe to import from
 * server, client, scripts and Vitest. Helpers that wrap the registry with
 * server-only side effects live in `get-reliability-overview.ts`.
 */
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
 *
 * TASK-635 nota: este array es la fuente canónica de DEFAULTS. La DB
 * (`greenhouse_core.reliability_module_registry`) almacena el seed para que
 * los overrides per-tenant (`reliability_module_overrides`) tengan algo
 * sobre qué proyectarse, pero el código sigue siendo source of truth — el
 * seed boot script reescribe los defaults con `ON CONFLICT DO UPDATE`.
 */
export const STATIC_RELIABILITY_REGISTRY: ReliabilityModuleDefinition[] = [
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
    smokeTests: [
      'tests/e2e/smoke/finance-quotes.spec.ts',
      'tests/e2e/smoke/finance-clients.spec.ts',
      'tests/e2e/smoke/finance-suppliers.spec.ts',
      'tests/e2e/smoke/finance-expenses.spec.ts'
    ],
    filesOwned: [
      'src/lib/finance/**',
      'src/views/greenhouse/finance/**',
      'src/app/api/finance/**',
      'src/app/(dashboard)/finance/**',
      'src/components/greenhouse/pricing/**',
      'src/components/greenhouse/quote-builder/**'
    ],
    expectedSignalKinds: ['subsystem', 'incident', 'test_lane'],
    incidentDomainTag: 'finance'
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
    smokeTests: ['tests/e2e/smoke/admin-nav.spec.ts'],
    filesOwned: [
      'src/lib/integrations/notion-*.ts',
      'src/lib/integrations/notion/**',
      'src/app/api/admin/integrations/**',
      'src/app/api/admin/tenants/*/notion-data-quality/**',
      'src/app/api/cron/notion-*/**',
      'src/app/api/integrations/v1/notion/**'
    ],
    expectedSignalKinds: ['subsystem', 'data_quality', 'freshness', 'incident'],
    incidentDomainTag: 'integrations.notion'
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
    smokeTests: [
      'tests/e2e/smoke/admin-nav.spec.ts',
      'tests/e2e/smoke/login-session.spec.ts',
      'tests/e2e/smoke/home.spec.ts'
    ],
    filesOwned: [
      'src/lib/cloud/**',
      'src/lib/postgres/**',
      'src/lib/bigquery.ts',
      'src/lib/operations/**',
      'src/lib/reliability/**',
      'src/lib/auth.ts',
      'src/lib/sync/**',
      'src/middleware.ts',
      'src/app/api/internal/health/**',
      'src/app/api/admin/cloud/**',
      'src/app/api/admin/reliability/**',
      'src/app/api/admin/ops/**',
      'src/app/api/cron/**',
      'src/app/api/auth/**',
      'src/app/(dashboard)/admin/**',
      'src/views/greenhouse/admin/**'
    ],
    expectedSignalKinds: ['runtime', 'posture', 'incident', 'cost_guard'],
    incidentDomainTag: 'cloud'
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
    smokeTests: ['tests/e2e/smoke/people-360.spec.ts', 'tests/e2e/smoke/hr-payroll.spec.ts'],
    filesOwned: [
      'src/lib/delivery/**',
      'src/lib/ico-engine/**',
      'src/lib/agency/**',
      'src/lib/payroll/**',
      'src/lib/people/**',
      'src/views/greenhouse/agency/**',
      'src/views/greenhouse/hr/**',
      'src/views/greenhouse/people/**',
      'src/app/api/agency/**',
      'src/app/api/hr/**',
      'src/app/api/people/**',
      'src/app/(dashboard)/agency/**',
      'src/app/(dashboard)/hr/**',
      'src/app/(dashboard)/people/**',
      'services/ops-worker/**'
    ],
    expectedSignalKinds: ['subsystem', 'data_quality', 'freshness', 'incident'],
    incidentDomainTag: 'delivery'
  }
]

/**
 * Backwards-compatible alias. Pre-TASK-635 callers (CLI affected-modules,
 * incident correlator, ad-hoc imports) leen `RELIABILITY_REGISTRY`. La
 * referencia mutable apunta al mismo array estático (defaults) — la
 * resolución per-tenant pasa por `getReliabilityRegistry(spaceId)` en
 * `registry-store.ts`.
 */
export const RELIABILITY_REGISTRY = STATIC_RELIABILITY_REGISTRY

const REGISTRY_BY_KEY: Map<ReliabilityModuleKey, ReliabilityModuleDefinition> = new Map(
  STATIC_RELIABILITY_REGISTRY.map(definition => [definition.moduleKey, definition])
)

export const getReliabilityModuleDefinition = (
  moduleKey: ReliabilityModuleKey
): ReliabilityModuleDefinition | null => REGISTRY_BY_KEY.get(moduleKey) ?? null

export const listReliabilityModuleKeys = (): ReliabilityModuleKey[] =>
  STATIC_RELIABILITY_REGISTRY.map(definition => definition.moduleKey)
