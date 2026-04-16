export const ENTITLEMENT_MODULES = [
  'home',
  'agency',
  'people',
  'hr',
  'finance',
  'admin',
  'client_portal',
  'my_workspace',
  'ai_tooling'
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
  }
] as const

export type EntitlementCapabilityDefinition = (typeof ENTITLEMENT_CAPABILITY_CATALOG)[number]
export type EntitlementCapabilityKey = EntitlementCapabilityDefinition['key']

export const ENTITLEMENT_CAPABILITY_MAP = Object.fromEntries(
  ENTITLEMENT_CAPABILITY_CATALOG.map(definition => [definition.key, definition])
) as Record<EntitlementCapabilityKey, EntitlementCapabilityDefinition>
