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
    // TASK-765 Slice 7 — drift / dead_letter / lag signals para el path
    // payment_order ↔ bank settlement (3 readers en
    // src/lib/reliability/queries/). Quedan rolleados al subsystem `Finance
    // Data Quality` vía buildReliabilityOverview, que ya rutea por moduleKey.
    expectedSignalKinds: ['subsystem', 'incident', 'test_lane', 'drift', 'dead_letter', 'lag'],
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
    expectedSignalKinds: ['runtime', 'posture', 'incident', 'cost_guard', 'billing'],
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
  },
  {
    moduleKey: 'integrations.teams',
    label: 'Teams Notifications & Bot',
    description:
      'Canal interactivo bidireccional con Microsoft Teams (Logic Apps + Bot Framework). Despacha alertas ops/finance/delivery y recibe Action.Submit de aprobaciones.',
    domain: 'integrations',
    routes: [
      { path: '/admin/ops-health', label: 'Ops Health · Teams Notifications' }
    ],
    apis: [
      { path: '/api/teams-bot/messaging', label: 'Bot Framework inbound (Action.Submit)' },
      { path: '/api/admin/teams/test', label: 'Manual test sender' }
    ],
    dependencies: [
      'greenhouse_core.teams_notification_channels',
      'greenhouse_core.teams_bot_inbound_actions',
      'greenhouse_sync.source_sync_runs (source_system=teams_notification)',
      'Azure Bot Service + App Registration (TASK-671)',
      'Microsoft Graph API (chats, teams, users)'
    ],
    smokeTests: ['tests/e2e/smoke/admin-nav.spec.ts'],
    filesOwned: [
      'src/lib/integrations/teams/**',
      'src/lib/teams-bot/**',
      'src/app/api/teams-bot/**',
      'src/app/api/admin/teams/**',
      'infra/azure/teams-notifications/**',
      'infra/azure/teams-bot/**',
      'migrations/*teams_notification_channels*.sql',
      'migrations/*teams_bot_inbound_actions*.sql'
    ],
    expectedSignalKinds: ['subsystem', 'incident'],
    incidentDomainTag: 'integrations.teams'
  },
  {
    moduleKey: 'home',
    label: 'Smart Home Surface',
    description:
      'Smart Home v2 (TASK-696). Compositor server-side de 7 bloques role-aware (Hero AI, Pulse Strip, Tu Día, Closing, AI Insights, Recents, Reliability). Contrato versionado home-snapshot.v1.',
    domain: 'home',
    routes: [
      { path: '/home', label: 'Smart Home v2' }
    ],
    apis: [
      { path: '/api/home/snapshot/v2', label: 'Home Snapshot V1 (composer)' }
    ],
    dependencies: [
      'greenhouse_serving.home_block_flags',
      'greenhouse_serving.home_rollout_flags',
      'greenhouse_serving.home_pulse_snapshots',
      'greenhouse_serving.user_recent_items',
      'greenhouse_core.client_users (home_default_view, ui_density, home_v2_opt_out)'
    ],
    smokeTests: [],
    filesOwned: [
      'src/lib/home/**',
      'src/views/greenhouse/home/v2/**',
      'src/app/api/home/snapshot/v2/**',
      'src/app/api/admin/home/rollout-flags/**'
    ],
    // TASK-780 Phase 3 — drift signal cubre divergencia PG ↔ env y opt-out rate.
    expectedSignalKinds: ['runtime', 'incident', 'drift'],
    incidentDomainTag: 'home'
  },
  {
    moduleKey: 'payroll',
    label: 'Payroll',
    description:
      'Motor de cálculo de nómina, cierre mensual, reliquidación post-export, integración PREVIRED Chile y proyección de nómina. Crítico para el ciclo de pago mensual del equipo.',
    domain: 'hr',
    routes: [
      { path: '/hr/payroll', label: 'Nómina' },
      { path: '/hr/payroll/projected', label: 'Nómina proyectada' }
    ],
    apis: [
      { path: '/api/hr/payroll/periods', label: 'Períodos de nómina' },
      { path: '/api/hr/payroll/projected', label: 'Nómina proyectada (read)' }
    ],
    dependencies: [
      'greenhouse_payroll schema',
      'cloud.postgres',
      'greenhouse_sync.source_sync_runs (previred)',
      'greenhouse_sync.projection_refresh_queue (projected_payroll, leave_payroll_recalculation)',
      'PREVIRED Chile sync',
      'operational-calendar (feriados Chile)'
    ],
    smokeTests: [
      'tests/e2e/smoke/hr-payroll.spec.ts'
    ],
    filesOwned: [
      'src/lib/payroll/**',
      'src/views/greenhouse/hr/payroll/**',
      'src/app/api/hr/payroll/**',
      'src/app/(dashboard)/hr/payroll/**'
    ],
    expectedSignalKinds: ['subsystem', 'incident', 'test_lane'],
    incidentDomainTag: 'payroll'
  },
  {
    // TASK-773 — Outbox publisher + reactive consumer infrastructure.
    // El event bus es fundamento del sistema reactivo (provider.upserted,
    // expense_payment.recorded, payroll_period.exported, etc.). Si el
    // publisher (PG → BQ raw) está caído o un batch dead-letterea, NINGUNA
    // projection corre — toda actualización async finance queda colgada.
    // Reliability dashboard ahora detecta:
    //   - sync.outbox.unpublished_lag (events 'pending'/'failed' con edad > 10 min)
    //   - sync.outbox.dead_letter (events que agotaron retries — requieren humano)
    moduleKey: 'sync',
    label: 'Event Bus & Sync Infrastructure',
    description:
      'Outbox publisher (PG → BQ raw) + reactive consumer + projection refreshes. Backbone async de Greenhouse: si está caído, nada async progresa.',
    domain: 'sync',
    routes: [
      { path: '/admin/operations', label: 'Ops Health' }
    ],
    apis: [
      { path: '/api/admin/reliability/overview', label: 'Reliability overview' }
    ],
    dependencies: [
      'greenhouse_sync.outbox_events',
      'greenhouse_sync.outbox_reactive_log',
      'greenhouse_sync.source_sync_runs',
      'greenhouse_raw.postgres_outbox_events (BigQuery)',
      'ops-worker Cloud Run (POST /outbox/publish-batch, /reactive/process-domain)',
      'Cloud Scheduler ops-outbox-publish (*/2 min) + ops-reactive-* (*/5 min)'
    ],
    smokeTests: [],
    filesOwned: [
      'src/lib/sync/**',
      'services/ops-worker/**'
    ],
    expectedSignalKinds: ['subsystem', 'lag', 'dead_letter', 'incident', 'drift'],
    incidentDomainTag: 'sync'
  },
  {
    // TASK-784 — Person Legal Profile foundation. Identity domain rolls up
    // auth incidents (TASK-742) + SCIM drift (TASK-781 follow-up) + new
    // person legal profile signals introduced here.
    moduleKey: 'identity',
    label: 'Identity & Access',
    description:
      'Identidad legal de personas, autenticacion (NextAuth + Azure AD), SCIM/Entra sync y readiness para finiquitos/payroll/honorarios.',
    domain: 'identity',
    routes: [
      { path: '/admin/users', label: 'Usuarios admin' },
      { path: '/my/profile', label: 'Mi perfil' }
    ],
    apis: [
      { path: '/api/my/legal-profile', label: 'Self-service legal profile' },
      { path: '/api/auth/health', label: 'Auth readiness' }
    ],
    dependencies: [
      'greenhouse_core.identity_profiles',
      'greenhouse_core.person_identity_documents',
      'greenhouse_core.person_addresses',
      'greenhouse_core.client_users',
      'GCP Secret Manager (greenhouse-pii-normalization-pepper)',
      'Azure AD (multi-tenant)'
    ],
    smokeTests: [
      'tests/e2e/smoke/auth-providers.spec.ts'
    ],
    filesOwned: [
      'src/lib/person-legal-profile/**',
      'src/lib/auth/**',
      'src/lib/entra/**',
      'src/app/api/my/legal-profile/**',
      'src/app/api/hr/people/**/legal-profile/**'
    ],
    expectedSignalKinds: ['incident', 'drift', 'data_quality'],
    incidentDomainTag: 'identity'
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
