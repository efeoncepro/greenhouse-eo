// ── Aggregate Types ──

export const AGGREGATE_TYPES = {
  // Finance
  income: 'income',
  expense: 'expense',
  account: 'account',
  supplier: 'supplier',
  exchangeRate: 'exchange_rate',
  economicIndicator: 'economic_indicator',

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
  compensationVersion: 'compensation_version',
  projectedPayroll: 'projected_payroll',
  payrollPrevisionalSnapshot: 'payroll_previsional_snapshot',

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
  icoMaterialization: 'ico_materialization',

  // Email Verification
  emailVerification: 'email_verification',

  // Capacity Economics
  financeExchangeRate: 'finance_exchange_rate',
  financeOverhead: 'finance_overhead',
  financeLicenseCost: 'finance_license_cost',
  financeToolingCost: 'finance_tooling_cost'
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
  financeEconomicIndicatorUpserted: 'finance.economic_indicator.upserted',

  // Payroll
  payrollPeriodCreated: 'payroll_period.created',
  payrollPeriodUpdated: 'payroll_period.updated',
  payrollPeriodCalculated: 'payroll_period.calculated',
  payrollPeriodApproved: 'payroll_period.approved',
  payrollPeriodExported: 'payroll_period.exported',
  payrollEntryUpserted: 'payroll_entry.upserted',
  compensationVersionCreated: 'compensation_version.created',
  compensationVersionUpdated: 'compensation_version.updated',
  payrollPrevisionalSnapshotUpserted: 'payroll.previsional_snapshot.upserted',

  // Services
  serviceCreated: 'service.created',
  serviceUpdated: 'service.updated',
  serviceDeactivated: 'service.deactivated',

  // Person Intelligence
  compensationUpdated: 'compensation.updated',
  icoMaterializationCompleted: 'ico.materialization.completed',

  // Projected Payroll
  projectedPayrollSnapshotRefreshed: 'payroll.projected_snapshot.refreshed',
  projectedPayrollPeriodRefreshed: 'payroll.projected_period.refreshed',
  projectedPayrollPromotedToOfficialDraft: 'payroll.projected_promoted_to_official_draft',
  payrollPeriodRecalculatedFromProjection: 'payroll_period.recalculated_from_projection',

  // Email Verification
  emailVerificationRequested: 'identity.email_verification.requested',
  emailVerificationCompleted: 'identity.email_verification.completed',

  // Capacity Economics
  financeExchangeRateUpserted: 'finance.exchange_rate.upserted',
  financeOverheadUpdated: 'finance.overhead.updated',
  financeLicenseCostUpdated: 'finance.license_cost.updated',
  financeToolingCostUpdated: 'finance.tooling_cost.updated'
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
  EVENT_TYPES.financeEconomicIndicatorUpserted,
  EVENT_TYPES.payrollPeriodCreated,
  EVENT_TYPES.payrollPeriodUpdated,
  EVENT_TYPES.payrollPeriodCalculated,
  EVENT_TYPES.payrollPeriodApproved,
  EVENT_TYPES.payrollPeriodExported,
  EVENT_TYPES.payrollEntryUpserted,
  EVENT_TYPES.payrollPrevisionalSnapshotUpserted,
  EVENT_TYPES.compensationVersionUpdated,

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

  // Capacity Economics triggers
  EVENT_TYPES.financeExchangeRateUpserted,
  EVENT_TYPES.financeOverheadUpdated,
  EVENT_TYPES.financeLicenseCostUpdated,
  EVENT_TYPES.financeToolingCostUpdated,

  // Payroll compensation (published by payroll store directly)
  EVENT_TYPES.compensationVersionCreated,
  EVENT_TYPES.compensationVersionUpdated
] as const
