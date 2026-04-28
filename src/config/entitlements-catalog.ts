export const ENTITLEMENT_MODULES = [
  'home',
  'agency',
  'people',
  'hr',
  'finance',
  'admin',
  'client_portal',
  'my_workspace',
  'ai_tooling',
  'commercial'
] as const

export type GreenhouseEntitlementModule = (typeof ENTITLEMENT_MODULES)[number]

export const ENTITLEMENT_ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'approve',
  'close',
  'export',
  'manage',
  'configure',
  'launch'
] as const

export type EntitlementAction = (typeof ENTITLEMENT_ACTIONS)[number]

export const ENTITLEMENT_SCOPES = ['own', 'team', 'space', 'organization', 'tenant', 'all'] as const

export type EntitlementScope = (typeof ENTITLEMENT_SCOPES)[number]

export const ENTITLEMENT_CAPABILITY_CATALOG = [
  {
    key: 'home.view',
    module: 'home',
    actions: ['read'] as const,
    defaultScope: 'own'
  },
  {
    key: 'home.nexa',
    module: 'home',
    actions: ['read'] as const,
    defaultScope: 'own'
  },
  {
    key: 'home.shortcuts',
    module: 'home',
    actions: ['read'] as const,
    defaultScope: 'own'
  },
  {
    key: 'agency.workspace',
    module: 'agency',
    actions: ['read', 'launch'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'people.directory',
    module: 'people',
    actions: ['read', 'launch'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.workspace',
    module: 'hr',
    actions: ['read', 'launch'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.leave',
    module: 'hr',
    actions: ['read', 'approve'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.leave_balance',
    module: 'hr',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.leave_backfill',
    module: 'hr',
    actions: ['create'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.leave_adjustment',
    module: 'hr',
    actions: ['create', 'update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.org_chart',
    module: 'hr',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.workspace',
    module: 'finance',
    actions: ['read', 'launch'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.status',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_instruments.read',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_instruments.update',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_instruments.deactivate',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_instruments.manage_defaults',
    module: 'finance',
    actions: ['manage'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_instruments.reveal_sensitive',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.cash.adopt-external-signal',
    module: 'finance',
    actions: ['create', 'update'] as const,
    defaultScope: 'space'
  },
  {
    key: 'finance.cash.dismiss-external-signal',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'space'
  },
  {
    key: 'admin.workspace',
    module: 'admin',
    actions: ['read', 'manage', 'launch'] as const,
    defaultScope: 'all'
  },
  {
    key: 'client_portal.workspace',
    module: 'client_portal',
    actions: ['read', 'launch'] as const,
    defaultScope: 'space'
  },
  {
    key: 'my_workspace.workspace',
    module: 'my_workspace',
    actions: ['read', 'launch'] as const,
    defaultScope: 'own'
  },
  {
    key: 'ai_tooling.workspace',
    module: 'ai_tooling',
    actions: ['read', 'launch'] as const,
    defaultScope: 'tenant'
  },

  // Commercial Party Lifecycle (TASK-535 §9.1).
  // Roles `sales` and `sales_lead` are not yet defined in role-codes.ts; the
  // runtime binding starts with `efeonce_admin` + `finance_admin`. When the
  // sales role family lands, extend `getTenantEntitlements()` accordingly.
  {
    key: 'commercial.party.create',
    module: 'commercial',
    actions: ['create'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.party.promote_to_client',
    module: 'commercial',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.party.churn',
    module: 'commercial',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.party.override_lifecycle',
    module: 'commercial',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.deal.create',
    module: 'commercial',
    actions: ['create'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.quote_to_cash.execute',
    module: 'commercial',
    actions: ['approve'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.product_catalog.resolve_conflict',
    module: 'commercial',
    actions: ['update'] as const,
    defaultScope: 'all'
  },

  // TASK-672 — Platform Health API contract.
  // Declarative catalog entries for the agent/MCP preflight contract.
  // V1 enforcement is route-group-driven (admin lane uses
  // requireAdminTenantContext; ecosystem lane uses runEcosystemReadRoute
  // scope binding). When TASK-658 lands the resource-authorization
  // bridge, runtime checks will read from these keys to gate detail.
  {
    key: 'platform.health.read',
    module: 'admin',
    actions: ['read'] as const,
    defaultScope: 'all'
  },
  {
    key: 'platform.health.detail',
    module: 'admin',
    actions: ['read'] as const,
    defaultScope: 'all'
  },

  // ─── TASK-696 Wave 6 — Smart Home strategic blocks (CEO/role-aware) ───
  // Each capability gates a Home block. The block is hidden server-side when
  // the user lacks the capability — payload never leaves the composer.
  {
    key: 'home.runway',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'organization'
  },
  {
    key: 'home.briefing.daily',
    module: 'home',
    actions: ['read'] as const,
    defaultScope: 'own'
  },
  {
    key: 'home.atrisk.spaces',
    module: 'agency',
    actions: ['read'] as const,
    defaultScope: 'organization'
  },
  {
    key: 'home.atrisk.invoices',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'organization'
  },
  {
    key: 'home.atrisk.members',
    module: 'hr',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'home.atrisk.projects',
    module: 'agency',
    actions: ['read'] as const,
    defaultScope: 'team'
  }
] as const

export type EntitlementCapabilityDefinition = (typeof ENTITLEMENT_CAPABILITY_CATALOG)[number]
export type EntitlementCapabilityKey = EntitlementCapabilityDefinition['key']

export const ENTITLEMENT_CAPABILITY_MAP = Object.fromEntries(
  ENTITLEMENT_CAPABILITY_CATALOG.map(definition => [definition.key, definition])
) as Record<EntitlementCapabilityKey, EntitlementCapabilityDefinition>
