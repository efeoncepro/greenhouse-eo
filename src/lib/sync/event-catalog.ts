// ── Aggregate Types ──

export const AGGREGATE_TYPES = {
  // Finance
  income: 'income',
  expense: 'expense',
  account: 'account',
  supplier: 'supplier',
  exchangeRate: 'exchange_rate',
  financeShareholderAccount: 'finance_shareholder_account',
  financeSettlementGroup: 'finance_settlement_group',
  financeSettlementLeg: 'finance_settlement_leg',
  financeReconciliationPeriod: 'finance_reconciliation_period',
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
  memberSkill: 'member_skill',
  memberTool: 'member_tool',
  memberCertification: 'member_certification',
  memberEvidence: 'member_evidence',
  memberEndorsement: 'member_endorsement',
  memberLanguage: 'member_language',
  assignment: 'assignment',
  department: 'department',

  // Identity
  identityReconciliation: 'identity_reconciliation',
  identityProfile: 'identity_profile',
  viewAccess: 'view_access',
  asset: 'asset',

  // Services
  service: 'service',
  serviceSkillRequirement: 'service_skill_requirement',

  // Person Intelligence
  compensation: 'compensation',
  icoMaterialization: 'ico_materialization',
  icoAiSignals: 'ico_ai_signals',
  icoAiLlmEnrichments: 'ico_ai_llm_enrichments',

  // Email Verification
  emailVerification: 'email_verification',

  // Email Delivery
  emailDelivery: 'email_delivery',

  // Quotes
  quote: 'quote',
  quoteLineItem: 'quote_line_item',

  // Products
  product: 'product',

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
  reportingHierarchy: 'reporting_hierarchy',

  // Role Governance
  roleAssignment: 'role_assignment',

  // Scope Governance (TASK-248)
  userScope: 'user_scope',

  // Auth Session (TASK-248)
  authSession: 'auth_session',

  // User Lifecycle (TASK-253)
  userLifecycle: 'user_lifecycle',

  // Permission Sets (TASK-263)
  permissionSet: 'permission_set'
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
  memberSkillUpserted: 'member_skill.upserted',
  memberSkillVerified: 'member_skill.verified',
  memberSkillRejected: 'member_skill.rejected',
  memberSkillDeleted: 'member_skill.deleted',
  memberToolUpserted: 'member_tool.upserted',
  memberToolVerified: 'member_tool.verified',
  memberToolRejected: 'member_tool.rejected',
  memberToolDeleted: 'member_tool.deleted',
  memberCertificationVerified: 'member_certification.verified',
  memberCertificationRejected: 'member_certification.rejected',
  memberEvidenceCreated: 'member_evidence.created',
  memberEvidenceUpdated: 'member_evidence.updated',
  memberEvidenceDeleted: 'member_evidence.deleted',
  memberEndorsementCreated: 'member_endorsement.created',
  memberEndorsementModerated: 'member_endorsement.moderated',
  memberLanguageUpserted: 'member_language.upserted',
  memberLanguageDeleted: 'member_language.deleted',
  assignmentCreated: 'assignment.created',
  assignmentUpdated: 'assignment.updated',
  assignmentRemoved: 'assignment.removed',

  // Identity
  reconciliationProposed: 'identity.reconciliation.proposed',
  reconciliationApproved: 'identity.reconciliation.approved',
  reconciliationRejected: 'identity.reconciliation.rejected',
  profileLinked: 'identity.profile.linked',
  profileMerged: 'identity.profile.merged',

  // DTE Reconciliation
  dteAutoMatched: 'finance.dte.auto_matched',
  dteMatched: 'finance.dte.matched',
  dteDiscrepancyFound: 'finance.dte.discrepancy_found',

  // Finance
  financeIncomeCreated: 'finance.income.created',
  financeIncomeUpdated: 'finance.income.updated',
  financeExpenseCreated: 'finance.expense.created',
  financeExpenseUpdated: 'finance.expense.updated',
  financeShareholderAccountCreated: 'finance.shareholder_account.created',
  financeShareholderAccountMovementRecorded: 'finance.shareholder_account_movement.recorded',
  financeSupplierCreated: 'finance.supplier.created',
  financeSupplierUpdated: 'finance.supplier.updated',
  financeIncomePaymentCreated: 'finance.income_payment.created',
  financeIncomePaymentRecorded: 'finance.income_payment.recorded',
  financeIncomePaymentReconciled: 'finance.income_payment.reconciled',
  financeIncomePaymentUnreconciled: 'finance.income_payment.unreconciled',
  financeExpensePaymentRecorded: 'finance.expense_payment.recorded',
  financeExpensePaymentReconciled: 'finance.expense_payment.reconciled',
  financeExpensePaymentUnreconciled: 'finance.expense_payment.unreconciled',
  financeSettlementLegRecorded: 'finance.settlement_leg.recorded',
  financeSettlementLegReconciled: 'finance.settlement_leg.reconciled',
  financeSettlementLegUnreconciled: 'finance.settlement_leg.unreconciled',
  financeInternalTransferRecorded: 'finance.internal_transfer.recorded',
  financeFxConversionRecorded: 'finance.fx_conversion.recorded',
  financeReconciliationPeriodReconciled: 'finance.reconciliation_period.reconciled',
  financeReconciliationPeriodClosed: 'finance.reconciliation_period.closed',
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
  serviceSkillRequirementUpserted: 'service_skill_requirement.upserted',
  serviceSkillRequirementDeleted: 'service_skill_requirement.deleted',

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

  // Email Delivery
  emailDeliveryBounced: 'email_delivery.bounced',
  emailDeliveryComplained: 'email_delivery.complained',
  emailDeliveryRateLimited: 'email_delivery.rate_limited',
  emailDeliveryUndeliverableMarked: 'email_delivery.undeliverable_marked',

  // Quotes & Credit Notes
  quoteCreated: 'finance.quote.created',
  quoteSynced: 'finance.quote.synced',
  quoteConverted: 'finance.quote.converted',
  quoteLineItemSynced: 'finance.quote_line_item.synced',
  creditNoteCreated: 'finance.credit_note.created',

  // Products
  productSynced: 'finance.product.synced',
  productCreated: 'finance.product.created',

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
  reportingHierarchyUpdated: 'reporting_hierarchy.updated',
  reportingHierarchyDriftDetected: 'reporting_hierarchy.drift_detected',
  reportingHierarchyProposalResolved: 'reporting_hierarchy.proposal_resolved',

  // Role Governance
  roleAssigned: 'role.assigned',
  roleRevoked: 'role.revoked',

  // Scope Governance (TASK-248)
  scopeAssigned: 'scope.assigned',
  scopeRevoked: 'scope.revoked',

  // Auth Session (TASK-248)
  loginSuccess: 'auth.login.success',
  loginFailed: 'auth.login.failed',

  // User Lifecycle (TASK-253)
  userDeactivated: 'user.deactivated',
  userReactivated: 'user.reactivated',
  invitationResent: 'invitation.resent',

  // Permission Sets (TASK-263)
  viewAccessSetAssigned: 'access.permission_set_assigned',
  viewAccessSetRevoked: 'access.permission_set_revoked'
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
  EVENT_TYPES.serviceSkillRequirementUpserted,
  EVENT_TYPES.serviceSkillRequirementDeleted,
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
  EVENT_TYPES.memberSkillUpserted,
  EVENT_TYPES.memberSkillDeleted,

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
  EVENT_TYPES.compensationVersionUpdated,

  // Operational Responsibility & Role Governance (TASK-247)
  EVENT_TYPES.responsibilityAssigned,
  EVENT_TYPES.responsibilityRevoked,
  EVENT_TYPES.responsibilityUpdated,
  EVENT_TYPES.roleAssigned,
  EVENT_TYPES.roleRevoked,

  // Scope Governance & Auth Session (TASK-248)
  EVENT_TYPES.scopeAssigned,
  EVENT_TYPES.scopeRevoked,
  EVENT_TYPES.loginSuccess,
  EVENT_TYPES.loginFailed,

  // User Lifecycle (TASK-253)
  EVENT_TYPES.userDeactivated,
  EVENT_TYPES.userReactivated,

  // Permission Sets (TASK-263)
  EVENT_TYPES.viewAccessSetAssigned,
  EVENT_TYPES.viewAccessSetRevoked
] as const

// ── Event Payload Types (TASK-247) ──

export interface ResponsibilityAssignedPayload {
  responsibilityId: string
  memberId: string
  scopeType: string
  scopeId: string
  responsibilityType: string
  isPrimary: boolean
}

export interface ResponsibilityRevokedPayload {
  responsibilityId: string
  memberId: string
  scopeType: string
  scopeId: string
  responsibilityType: string
  changes: { active: false; effectiveTo?: string }
}

export interface ResponsibilityUpdatedPayload {
  responsibilityId: string
  memberId: string
  scopeType: string
  scopeId: string
  responsibilityType: string
  changes: Record<string, unknown>
}

export interface ReportingHierarchyUpdatedPayload {
  memberId: string
  reportingLineId: string
  previousSupervisorMemberId: string | null
  supervisorMemberId: string | null
  changedByUserId: string | null
  changeReason: string
  sourceSystem: string
  sourceMetadata?: Record<string, unknown>
}

export interface ReportingHierarchyDriftDetectedPayload {
  proposalId: string
  memberId: string
  driftKind: string
  policyAction: string
  sourceSystem: string
  proposedSupervisorMemberId: string | null
  currentSupervisorMemberId: string | null
}

export interface ReportingHierarchyProposalResolvedPayload {
  proposalId: string
  memberId: string
  resolution: string
  resolvedByUserId: string
  proposedSupervisorMemberId: string | null
}

export interface RoleAssignedPayload {
  userId: string
  roleCode: string
  assignedByUserId: string
}

export interface RoleRevokedPayload {
  userId: string
  roleCode: string
  revokedByUserId: string
}

// ── Event Payload Types (TASK-248) ──

export interface ScopeAssignedPayload {
  userId: string
  scopeType: 'project' | 'campaign' | 'client'
  scopeId: string
  clientId: string
  accessLevel?: string
}

export interface ScopeRevokedPayload {
  userId: string
  scopeType: 'project' | 'campaign' | 'client'
  scopeId: string
  clientId: string
}

export interface LoginSuccessPayload {
  userId: string
  email: string
  provider: string
  tenantType: string
}

export interface LoginFailedPayload {
  email: string
  provider: string
  reason: string
}

// ── Event Payload Types (TASK-253) ──

export interface UserDeactivatedPayload {
  userId: string
  memberId?: string
  deactivatedBy: 'admin' | 'scim' | 'system'
  reason?: string
}

export interface UserReactivatedPayload {
  userId: string
  memberId?: string
  reactivatedBy: 'admin' | 'scim' | 'system'
}
