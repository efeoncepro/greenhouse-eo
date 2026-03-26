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
  service: 'service',

  // Person Intelligence
  compensation: 'compensation',
  icoMaterialization: 'ico_materialization'
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

  // Finance
  financeIncomeCreated: 'finance.income.created',
  financeIncomeUpdated: 'finance.income.updated',
  financeExpenseCreated: 'finance.expense.created',
  financeExpenseUpdated: 'finance.expense.updated',
  financeIncomePaymentCreated: 'finance.income_payment.created',
  financeIncomePaymentRecorded: 'finance.income_payment.recorded',
  financeCostAllocationCreated: 'finance.cost_allocation.created',
  financeCostAllocationDeleted: 'finance.cost_allocation.deleted',

  // Payroll
  payrollPeriodCreated: 'payroll_period.created',
  payrollPeriodUpdated: 'payroll_period.updated',
  payrollPeriodCalculated: 'payroll_period.calculated',
  payrollPeriodApproved: 'payroll_period.approved',
  payrollEntryUpserted: 'payroll_entry.upserted',

  // Services
  serviceCreated: 'service.created',
  serviceUpdated: 'service.updated',
  serviceDeactivated: 'service.deactivated',

  // Person Intelligence
  compensationUpdated: 'compensation.updated',
  compensationVersionCreated: 'compensation_version.created',
  icoMaterializationCompleted: 'ico.materialization.completed'
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
  EVENT_TYPES.financeIncomeCreated,
  EVENT_TYPES.financeIncomeUpdated,
  EVENT_TYPES.financeExpenseCreated,
  EVENT_TYPES.financeExpenseUpdated,
  EVENT_TYPES.financeIncomePaymentCreated,
  EVENT_TYPES.financeIncomePaymentRecorded,
  EVENT_TYPES.financeCostAllocationCreated,
  EVENT_TYPES.financeCostAllocationDeleted,
  EVENT_TYPES.payrollPeriodCreated,
  EVENT_TYPES.payrollPeriodUpdated,
  EVENT_TYPES.payrollPeriodCalculated,
  EVENT_TYPES.payrollPeriodApproved,
  EVENT_TYPES.payrollEntryUpserted,

  // Notification triggers
  EVENT_TYPES.serviceCreated,
  EVENT_TYPES.reconciliationApproved,
  EVENT_TYPES.dteDiscrepancyFound,
  EVENT_TYPES.profileLinked,

  // Person Intelligence triggers
  EVENT_TYPES.compensationUpdated,
  EVENT_TYPES.icoMaterializationCompleted,
  EVENT_TYPES.memberCreated,
  EVENT_TYPES.memberUpdated,

  // Payroll compensation (published by payroll store directly)
  EVENT_TYPES.compensationVersionCreated
] as const
