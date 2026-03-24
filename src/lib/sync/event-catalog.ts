import 'server-only'

// ── Aggregate Types ──

export const AGGREGATE_TYPES = {
  // Finance
  income: 'income',
  expense: 'expense',
  account: 'account',
  supplier: 'supplier',
  exchangeRate: 'exchange_rate',

  // Nubox
  nuboxEmission: 'nubox_emission',
  nuboxSync: 'nubox_sync',

  // DTE Reconciliation
  dteReconciliation: 'dte_reconciliation',

  // HR
  leaveRequest: 'leave_request',
  leaveBalance: 'leave_balance',

  // Payroll
  payrollPeriod: 'payroll_period',
  payrollEntry: 'payroll_entry',

  // AI Tools
  aiCredits: 'ai_credits',
  aiWallet: 'ai_wallet',

  // Account 360
  organization: 'organization',
  space: 'space',
  membership: 'membership',

  // HR Core / People
  member: 'member',
  assignment: 'assignment',
  department: 'department',

  // Identity
  identityReconciliation: 'identity_reconciliation',
  identityProfile: 'identity_profile',

  // Services
  service: 'service'
} as const

export type AggregateType = (typeof AGGREGATE_TYPES)[keyof typeof AGGREGATE_TYPES]

// ── Event Types ──

export const EVENT_TYPES = {
  // Account 360
  organizationCreated: 'organization.created',
  organizationUpdated: 'organization.updated',
  membershipCreated: 'membership.created',
  membershipUpdated: 'membership.updated',
  membershipDeactivated: 'membership.deactivated',

  // HR Core / People
  memberCreated: 'member.created',
  memberUpdated: 'member.updated',
  memberDeactivated: 'member.deactivated',
  assignmentCreated: 'assignment.created',
  assignmentUpdated: 'assignment.updated',
  assignmentRemoved: 'assignment.removed',

  // Identity
  reconciliationProposed: 'identity.reconciliation.proposed',
  reconciliationApproved: 'identity.reconciliation.approved',
  reconciliationRejected: 'identity.reconciliation.rejected',
  profileLinked: 'identity.profile.linked',

  // DTE Reconciliation
  dteAutoMatched: 'finance.dte.auto_matched',
  dteMatched: 'finance.dte.matched',
  dteDiscrepancyFound: 'finance.dte.discrepancy_found',

  // Services
  serviceCreated: 'service.created',
  serviceUpdated: 'service.updated',
  serviceDeactivated: 'service.deactivated'
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

// ── Reactive event types (events that trigger downstream actions) ──

export const REACTIVE_EVENT_TYPES = [
  // Organization 360 invalidation
  EVENT_TYPES.assignmentCreated,
  EVENT_TYPES.assignmentUpdated,
  EVENT_TYPES.assignmentRemoved,
  EVENT_TYPES.membershipCreated,
  EVENT_TYPES.membershipUpdated,
  EVENT_TYPES.membershipDeactivated,

  // Notification triggers
  EVENT_TYPES.serviceCreated,
  EVENT_TYPES.reconciliationApproved,
  EVENT_TYPES.dteDiscrepancyFound,
  EVENT_TYPES.profileLinked
] as const
