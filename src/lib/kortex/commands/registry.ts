export const KORTEX_COMMAND_TIERS = ['safe', 'stateful', 'external_write', 'admin_breakglass'] as const

export type KortexCommandTier = (typeof KORTEX_COMMAND_TIERS)[number]

export type KortexCommandHttpMethod = 'POST' | 'PUT' | 'PATCH'

export type KortexCommandRegistryEntry = {
  method: KortexCommandHttpMethod
  pathTemplate: string
  operationKind: string
  tier: KortexCommandTier
  requiredPayloadKeys: string[]
  summary: string
  requiresDryRunPreview?: boolean
  confirmationPhrase?: string
}

export const LIVE_EXECUTE_CONFIRMATION_PHRASE = 'EXECUTE KORTEX RELEASE'
export const ADMIN_BREAKGLASS_CONFIRMATION_PHRASE = 'EXECUTE KORTEX ADMIN COMMAND'

export const KORTEX_COMMAND_REGISTRY = {
  'kortex.portal.hub_profile.put': {
    method: 'PUT',
    pathTemplate: '/api/v1/portals/{hubspot_portal_id}/hub-profile',
    operationKind: 'portal_hub_profile_update',
    tier: 'stateful',
    requiredPayloadKeys: ['hubs'],
    summary: 'Declare or override the Kortex portal hub profile.'
  },
  'kortex.admin.snapshots.trigger': {
    method: 'POST',
    pathTemplate: '/api/v1/admin/snapshots/trigger',
    operationKind: 'admin_snapshots_trigger',
    tier: 'admin_breakglass',
    requiredPayloadKeys: [],
    summary: 'Trigger adoption KPI snapshots for one or all active portals.',
    confirmationPhrase: ADMIN_BREAKGLASS_CONFIRMATION_PHRASE
  },
  'kortex.admin.auth.verify': {
    method: 'POST',
    pathTemplate: '/api/v1/admin/auth/verify',
    operationKind: 'admin_auth_verify',
    tier: 'admin_breakglass',
    requiredPayloadKeys: ['email', 'password'],
    summary: 'Verify a Kortex local user credential set.',
    confirmationPhrase: ADMIN_BREAKGLASS_CONFIRMATION_PHRASE
  },
  'kortex.admin.users.seed': {
    method: 'POST',
    pathTemplate: '/api/v1/admin/users/seed',
    operationKind: 'admin_user_seed',
    tier: 'admin_breakglass',
    requiredPayloadKeys: ['email', 'password'],
    summary: 'Create or update a Kortex local user.',
    confirmationPhrase: ADMIN_BREAKGLASS_CONFIRMATION_PHRASE
  },
  'kortex.admin.users.bootstrap_e2e_agent': {
    method: 'POST',
    pathTemplate: '/api/v1/admin/users/bootstrap-e2e-agent',
    operationKind: 'admin_e2e_agent_bootstrap',
    tier: 'admin_breakglass',
    requiredPayloadKeys: [],
    summary: 'Ensure the configured Kortex E2E agent user exists.',
    confirmationPhrase: ADMIN_BREAKGLASS_CONFIRMATION_PHRASE
  },
  'kortex.audit.run': {
    method: 'POST',
    pathTemplate: '/api/v1/audits/run',
    operationKind: 'audit_run',
    tier: 'stateful',
    requiredPayloadKeys: [],
    summary: 'Run and persist a portal audit.'
  },
  'kortex.strategy.normalize': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/normalize',
    operationKind: 'strategy_normalize',
    tier: 'safe',
    requiredPayloadKeys: ['authoringMode', 'title'],
    summary: 'Normalize a freeform strategy into structured intents without persisting.'
  },
  'kortex.strategy.intake': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/intake',
    operationKind: 'strategy_intake',
    tier: 'stateful',
    requiredPayloadKeys: ['authoringMode', 'title'],
    summary: 'Create a strategy input and initial workspace.'
  },
  'kortex.strategy.seed_from_audit': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/seed-from-audit',
    operationKind: 'strategy_seed_from_audit',
    tier: 'stateful',
    requiredPayloadKeys: [],
    summary: 'Seed a strategy workspace from a persisted audit.'
  },
  'kortex.strategy.workspace.update': {
    method: 'PATCH',
    pathTemplate: '/api/v1/strategy/workspaces/{workspace_id}',
    operationKind: 'strategy_workspace_update',
    tier: 'stateful',
    requiredPayloadKeys: ['workspaceId'],
    summary: 'Update editable sections of a strategy workspace.'
  },
  'kortex.strategy.workspace.compilation_run.create': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/workspaces/{workspace_id}/compilation-runs',
    operationKind: 'strategy_compilation_run_create',
    tier: 'stateful',
    requiredPayloadKeys: ['workspaceId'],
    summary: 'Record a strategy compilation run.'
  },
  'kortex.strategy.compile': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/workspaces/{workspace_id}/compile',
    operationKind: 'strategy_compile',
    tier: 'stateful',
    requiredPayloadKeys: ['workspaceId'],
    summary: 'Compile a strategy workspace into candidate artifacts.'
  },
  'kortex.strategy.workspace.approval_decision.create': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/workspaces/{workspace_id}/approval-decisions',
    operationKind: 'strategy_approval_decision_create',
    tier: 'stateful',
    requiredPayloadKeys: ['workspaceId', 'strategyCompilationRunId', 'decisionStatus'],
    summary: 'Persist an approval or rejection decision.'
  },
  'kortex.strategy.release_candidate.dry_run': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/release-candidates/{release_candidate_id}/execute',
    operationKind: 'release_candidate_dry_run',
    tier: 'stateful',
    requiredPayloadKeys: ['releaseCandidateId'],
    summary: 'Dry-run an approved schema release candidate.'
  },
  'kortex.strategy.release_candidate.execute': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/release-candidates/{release_candidate_id}/execute',
    operationKind: 'release_candidate_execute',
    tier: 'external_write',
    requiredPayloadKeys: ['releaseCandidateId'],
    summary: 'Execute an approved schema release candidate against HubSpot.',
    requiresDryRunPreview: true,
    confirmationPhrase: LIVE_EXECUTE_CONFIRMATION_PHRASE
  },
  'kortex.strategy.release_candidate.execute_workflows': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/release-candidates/{release_candidate_id}/execute-workflows',
    operationKind: 'release_candidate_execute_workflows',
    tier: 'external_write',
    requiredPayloadKeys: ['releaseCandidateId'],
    summary: 'Execute approved workflow candidates against HubSpot.',
    requiresDryRunPreview: true,
    confirmationPhrase: LIVE_EXECUTE_CONFIRMATION_PHRASE
  },
  'kortex.strategy.release_candidate.execute_custom_objects': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/release-candidates/{release_candidate_id}/execute-custom-objects',
    operationKind: 'release_candidate_execute_custom_objects',
    tier: 'external_write',
    requiredPayloadKeys: ['releaseCandidateId'],
    summary: 'Execute approved custom-object candidates against HubSpot.',
    requiresDryRunPreview: true,
    confirmationPhrase: LIVE_EXECUTE_CONFIRMATION_PHRASE
  },
  'kortex.strategy.conversation.create': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/conversations',
    operationKind: 'strategy_conversation_create',
    tier: 'stateful',
    requiredPayloadKeys: [],
    summary: 'Create a strategy conversation.'
  },
  'kortex.strategy.chat.send': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/chat',
    operationKind: 'strategy_chat_send',
    tier: 'stateful',
    requiredPayloadKeys: ['conversationId', 'message'],
    summary: 'Send a strategy chat message and stream model work upstream.'
  },
  'kortex.strategy.operation.execute_internal': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/internal/operations/execute/{operation_id}',
    operationKind: 'strategy_operation_execute_internal',
    tier: 'admin_breakglass',
    requiredPayloadKeys: ['operationId'],
    summary: 'Execute a queued internal strategy operation.',
    confirmationPhrase: ADMIN_BREAKGLASS_CONFIRMATION_PHRASE
  },
  'kortex.strategy.conversation.extract': {
    method: 'POST',
    pathTemplate: '/api/v1/strategy/conversations/{conversation_id}/extract',
    operationKind: 'strategy_conversation_extract',
    tier: 'stateful',
    requiredPayloadKeys: ['conversationId'],
    summary: 'Extract a structured strategy from a conversation.'
  }
} as const satisfies Record<string, KortexCommandRegistryEntry>

export type KortexCommandName = keyof typeof KORTEX_COMMAND_REGISTRY

export const KORTEX_COMMAND_NAMES = Object.keys(KORTEX_COMMAND_REGISTRY) as KortexCommandName[]

export const getKortexCommandDefinition = (commandName: KortexCommandName) => KORTEX_COMMAND_REGISTRY[commandName]

export const isKortexCommandName = (value: string): value is KortexCommandName =>
  Object.hasOwn(KORTEX_COMMAND_REGISTRY, value)

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const KORTEX_COMMAND_PATH_PATTERNS = KORTEX_COMMAND_NAMES.map(commandName => {
  const template = KORTEX_COMMAND_REGISTRY[commandName].pathTemplate
  const pattern = `^${escapeRegExp(template).replace(/\\\{[^}]+\\\}/g, '[^/]+')}$`

  return new RegExp(pattern)
})
