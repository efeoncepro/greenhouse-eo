// ── Aggregate Types ──

export const AGGREGATE_TYPES = {
  // Finance
  income: 'income',
  expense: 'expense',
  account: 'account',
  supplier: 'supplier',
  exchangeRate: 'exchange_rate',
  economicIndicator: 'economic_indicator',
  provider: 'provider',
  providerToolingSnapshot: 'provider_tooling_snapshot',

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
  aiTool: 'ai_tool',
  aiLicense: 'ai_license',
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
  viewAccess: 'view_access',
  asset: 'asset',

  // Services
  service: 'service',

  // Person Intelligence
  compensation: 'compensation',
  icoMaterialization: 'ico_materialization',
  icoAiSignals: 'ico_ai_signals',
  icoAiLlmEnrichments: 'ico_ai_llm_enrichments',

  // Email Verification
  emailVerification: 'email_verification',

  // Quotes
  quote: 'quote',

  // Purchase Orders & HES
  purchaseOrder: 'purchase_order',
  serviceEntrySheet: 'service_entry_sheet',

  // Capacity Economics
  financeExchangeRate: 'finance_exchange_rate',
  financeOverhead: 'finance_overhead',
  financeLicenseCost: 'finance_license_cost',
  financeToolingCost: 'finance_tooling_cost',

  // Cost Intelligence
  periodClosure: 'period_closure',
  commercialCostAttribution: 'commercial_cost_attribution',
  operationalPl: 'operational_pl',
  marginAlert: 'margin_alert',
  staffAugPlacement: 'staff_aug_placement',
  staffAugOnboardingItem: 'staff_aug_onboarding_item',
  staffAugPlacementSnapshot: 'staff_aug_placement_snapshot',

  // Operational Responsibility
  operationalResponsibility: 'operational_responsibility',

  // Role Governance
  roleAssignment: 'role_assignment'
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
  financeSupplierCreated: 'finance.supplier.created',
  financeSupplierUpdated: 'finance.supplier.updated',
  financeIncomePaymentCreated: 'finance.income_payment.created',
  financeIncomePaymentRecorded: 'finance.income_payment.recorded',
  financeCostAllocationCreated: 'finance.cost_allocation.created',
  financeCostAllocationDeleted: 'finance.cost_allocation.deleted',
  financeEconomicIndicatorUpserted: 'finance.economic_indicator.upserted',
  providerUpserted: 'provider.upserted',
  providerToolingSnapshotMaterialized: 'provider.tooling_snapshot.materialized',

  // AI Tooling structural events
  aiToolCreated: 'ai_tool.created',
  aiToolUpdated: 'ai_tool.updated',
  aiLicenseCreated: 'ai_license.created',
  aiLicenseReactivated: 'ai_license.reactivated',
  aiLicenseUpdated: 'ai_license.updated',
  aiWalletCreated: 'ai_wallet.created',
  aiWalletUpdated: 'ai_wallet.updated',
  aiWalletCreditsConsumed: 'ai_wallet.credits_consumed',

  // Payroll
  payrollPeriodCreated: 'payroll_period.created',
  payrollPeriodUpdated: 'payroll_period.updated',
  payrollPeriodCalculated: 'payroll_period.calculated',
  payrollPeriodApproved: 'payroll_period.approved',
  payrollPeriodExported: 'payroll_period.exported',
  payrollEntryUpserted: 'payroll_entry.upserted',
  leaveRequestCreated: 'leave_request.created',
  leaveRequestEscalatedToHr: 'leave_request.escalated_to_hr',
  leaveRequestApproved: 'leave_request.approved',
  leaveRequestRejected: 'leave_request.rejected',
  leaveRequestCancelled: 'leave_request.cancelled',
  leaveRequestPayrollImpactDetected: 'leave_request.payroll_impact_detected',
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
  icoAiSignalsMaterialized: 'ico.ai_signals.materialized',
  icoAiLlmEnrichmentsMaterialized: 'ico.ai_llm_enrichments.materialized',

  // Projected Payroll
  projectedPayrollSnapshotRefreshed: 'payroll.projected_snapshot.refreshed',
  projectedPayrollPeriodRefreshed: 'payroll.projected_period.refreshed',
  projectedPayrollPromotedToOfficialDraft: 'payroll.projected_promoted_to_official_draft',
  payrollPeriodRecalculatedFromProjection: 'payroll_period.recalculated_from_projection',

  // Email Verification
  emailVerificationRequested: 'identity.email_verification.requested',
  emailVerificationCompleted: 'identity.email_verification.completed',

  // Quotes & Credit Notes
  quoteCreated: 'finance.quote.created',
  quoteConverted: 'finance.quote.converted',
  creditNoteCreated: 'finance.credit_note.created',

  // Purchase Orders & HES
  purchaseOrderCreated: 'finance.purchase_order.created',
  purchaseOrderConsumed: 'finance.purchase_order.consumed',
  purchaseOrderExpiring: 'finance.purchase_order.expiring',
  purchaseOrderExpired: 'finance.purchase_order.expired',
  hesSubmitted: 'finance.hes.submitted',
  hesApproved: 'finance.hes.approved',
  hesRejected: 'finance.hes.rejected',

  // Data Quality Alerts
  balanceDivergenceDetected: 'finance.balance_divergence.detected',
  siiClaimDetected: 'finance.sii_claim.detected',

  // View Access
  viewAccessOverrideChanged: 'access.view_override_changed',

  // Shared Assets
  assetUploaded: 'asset.uploaded',
  assetAttached: 'asset.attached',
  assetDeleted: 'asset.deleted',
  assetDownloaded: 'asset.downloaded',

  // Capacity Economics
  financeExchangeRateUpserted: 'finance.exchange_rate.upserted',
  financeOverheadUpdated: 'finance.overhead.updated',
  financeLicenseCostUpdated: 'finance.license_cost.updated',
  financeToolingCostUpdated: 'finance.tooling_cost.updated',

  // Cost Intelligence
  accountingPeriodClosed: 'accounting.period_closed',
  accountingPeriodReopened: 'accounting.period_reopened',
  accountingCommercialCostAttributionMaterialized: 'accounting.commercial_cost_attribution.materialized',
  accountingPlSnapshotMaterialized: 'accounting.pl_snapshot.materialized',
  accountingMarginAlertTriggered: 'accounting.margin_alert.triggered',
  staffAugPlacementCreated: 'staff_aug.placement.created',
  staffAugPlacementUpdated: 'staff_aug.placement.updated',
  staffAugPlacementStatusChanged: 'staff_aug.placement.status_changed',
  staffAugOnboardingItemUpdated: 'staff_aug.onboarding_item.updated',
  staffAugPlacementSnapshotMaterialized: 'staff_aug.placement_snapshot.materialized',

  // Operational Responsibility
  responsibilityAssigned: 'responsibility.assigned',
  responsibilityRevoked: 'responsibility.revoked',
  responsibilityUpdated: 'responsibility.updated',

  // Role Governance
  roleAssigned: 'role.assigned',
  roleRevoked: 'role.revoked'
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
  EVENT_TYPES.financeSupplierCreated,
  EVENT_TYPES.financeSupplierUpdated,
  EVENT_TYPES.financeIncomePaymentCreated,
  EVENT_TYPES.financeIncomePaymentRecorded,
  EVENT_TYPES.financeCostAllocationCreated,
  EVENT_TYPES.financeCostAllocationDeleted,
  EVENT_TYPES.financeEconomicIndicatorUpserted,
  EVENT_TYPES.financeSupplierCreated,
  EVENT_TYPES.financeSupplierUpdated,
  EVENT_TYPES.providerUpserted,
  EVENT_TYPES.staffAugPlacementCreated,
  EVENT_TYPES.staffAugPlacementUpdated,
  EVENT_TYPES.staffAugPlacementStatusChanged,
  EVENT_TYPES.staffAugOnboardingItemUpdated,
  EVENT_TYPES.payrollPeriodCreated,
  EVENT_TYPES.payrollPeriodUpdated,
  EVENT_TYPES.payrollPeriodCalculated,
  EVENT_TYPES.payrollPeriodApproved,
  EVENT_TYPES.payrollPeriodExported,
  EVENT_TYPES.payrollEntryUpserted,
  EVENT_TYPES.leaveRequestCreated,
  EVENT_TYPES.leaveRequestEscalatedToHr,
  EVENT_TYPES.leaveRequestApproved,
  EVENT_TYPES.leaveRequestRejected,
  EVENT_TYPES.leaveRequestCancelled,
  EVENT_TYPES.leaveRequestPayrollImpactDetected,
  EVENT_TYPES.payrollPrevisionalSnapshotUpserted,
  EVENT_TYPES.compensationVersionUpdated,

  // Notification triggers
  EVENT_TYPES.serviceCreated,
  EVENT_TYPES.reconciliationApproved,
  EVENT_TYPES.dteDiscrepancyFound,
  EVENT_TYPES.profileLinked,
  EVENT_TYPES.viewAccessOverrideChanged,

  // Person Intelligence triggers
  EVENT_TYPES.compensationUpdated,
  EVENT_TYPES.icoMaterializationCompleted,
  EVENT_TYPES.icoAiSignalsMaterialized,
  EVENT_TYPES.icoAiLlmEnrichmentsMaterialized,
  EVENT_TYPES.memberCreated,
  EVENT_TYPES.memberUpdated,

  // Capacity Economics triggers
  EVENT_TYPES.financeExchangeRateUpserted,
  EVENT_TYPES.financeOverheadUpdated,
  EVENT_TYPES.financeLicenseCostUpdated,
  EVENT_TYPES.financeToolingCostUpdated,
  EVENT_TYPES.providerUpserted,
  EVENT_TYPES.aiToolCreated,
  EVENT_TYPES.aiToolUpdated,
  EVENT_TYPES.aiLicenseCreated,
  EVENT_TYPES.aiLicenseReactivated,
  EVENT_TYPES.aiLicenseUpdated,
  EVENT_TYPES.aiWalletCreated,
  EVENT_TYPES.aiWalletUpdated,
  EVENT_TYPES.aiWalletCreditsConsumed,
  EVENT_TYPES.accountingMarginAlertTriggered,

  // Data quality / SII alerts
  EVENT_TYPES.balanceDivergenceDetected,
  EVENT_TYPES.siiClaimDetected,

  // Payroll compensation (published by payroll store directly)
  EVENT_TYPES.compensationVersionCreated,
  EVENT_TYPES.compensationVersionUpdated
] as const
