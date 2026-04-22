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
  }
] as const

export type EntitlementCapabilityDefinition = (typeof ENTITLEMENT_CAPABILITY_CATALOG)[number]
export type EntitlementCapabilityKey = EntitlementCapabilityDefinition['key']

export const ENTITLEMENT_CAPABILITY_MAP = Object.fromEntries(
  ENTITLEMENT_CAPABILITY_CATALOG.map(definition => [definition.key, definition])
) as Record<EntitlementCapabilityKey, EntitlementCapabilityDefinition>
