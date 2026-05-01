// ── Aggregate Types ──

export const AGGREGATE_TYPES = {
  // Finance
  income: 'income',
  expense: 'expense',
  account: 'account',
  paymentInstrument: 'payment_instrument',
  supplier: 'supplier',
  exchangeRate: 'exchange_rate',
  financeShareholderAccount: 'finance_shareholder_account',
  financeSettlementGroup: 'finance_settlement_group',
  financeSettlementLeg: 'finance_settlement_leg',
  financeReconciliationPeriod: 'finance_reconciliation_period',
  economicIndicator: 'economic_indicator',
  vatPosition: 'vat_position',
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

  // HR Goals (TASK-029)
  goal: 'goal',
  goalCycle: 'goal_cycle',

  // HR Performance Evaluations (TASK-031)
  evalCycle: 'eval_cycle',
  evalAssignment: 'eval_assignment',
  evalSummary: 'eval_summary',

  // Payroll
  payrollPeriod: 'payroll_period',
  payrollEntry: 'payroll_entry',
  payrollAdjustment: 'payroll_adjustment',
  paymentObligation: 'payment_obligation',
  paymentOrder: 'payment_order',
  paymentOrderLine: 'payment_order_line',
  paymentOrderArtifact: 'payment_order_artifact',
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
  crmCompany: 'crm_company',
  personLegalEntityRelationship: 'person_legal_entity_relationship',

  // Commercial Party Lifecycle (TASK-535)
  commercialParty: 'commercial_party',
  commercialClient: 'commercial_client',
  commercialOperation: 'commercial_operation',

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
  entitlementGovernance: 'entitlement_governance',
  asset: 'asset',

  // Services
  service: 'service',
  serviceSlaDefinition: 'service_sla_definition',
  serviceSkillRequirement: 'service_skill_requirement',

  // Person Intelligence
  compensation: 'compensation',
  icoMaterialization: 'ico_materialization',
  icoAiSignals: 'ico_ai_signals',
  icoAiLlmEnrichments: 'ico_ai_llm_enrichments',
  financeAiSignals: 'finance_ai_signals',
  financeAiLlmEnrichments: 'finance_ai_llm_enrichments',

  // Email Verification
  emailVerification: 'email_verification',

  // Email Delivery
  emailDelivery: 'email_delivery',

  // Quotes (legacy finance namespace, kept for compat during cutover — TASK-344)
  quote: 'quote',
  quoteLineItem: 'quote_line_item',

  // Commercial Quotation (canonical, TASK-347 cutover)
  quotation: 'quotation',
  quotationLineItem: 'quotation_line_item',
  quotationLineCostOverride: 'quotation_line_cost_override',
  commercialCapacity: 'commercial_capacity',
  contract: 'contract',
  contractQuote: 'contract_quote',
  masterAgreement: 'master_agreement',
  deal: 'deal',
  pricingCatalogApproval: 'pricing_catalog_approval',
  productCatalog: 'product_catalog',
  productSyncConflict: 'product_sync_conflict',
  sellableRole: 'sellable_role',
  overheadAddon: 'overhead_addon',
  employmentType: 'employment_type',

  // Products (legacy finance namespace)
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
  serviceAttribution: 'service_attribution',
  operationalPl: 'operational_pl',
  marginAlert: 'margin_alert',
  marginFeedback: 'margin_feedback',
  commercialCostBasis: 'commercial_cost_basis',
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
  permissionSet: 'permission_set',

  // Sister Platforms (TASK-375)
  sisterPlatformBinding: 'sister_platform_binding',

  // Identity credential (TASK-451)
  identityCredential: 'identity_credential'
} as const

export type AggregateType = (typeof AGGREGATE_TYPES)[keyof typeof AGGREGATE_TYPES]

// ── Event Types ──

export const EVENT_TYPES = {
  // Account 360
  organizationCreated: 'organization.created',
  organizationUpdated: 'organization.updated',

  // Commercial Party Lifecycle (TASK-535)
  commercialPartyCreated: 'commercial.party.created',
  commercialPartyPromoted: 'commercial.party.promoted',
  commercialPartyDemoted: 'commercial.party.demoted',
  commercialPartyLifecycleBackfilled: 'commercial.party.lifecycle_backfilled',
  commercialClientInstantiated: 'commercial.client.instantiated',
  commercialPartyHubSpotSyncedOut: 'commercial.party.hubspot_synced_out',
  commercialPartySyncConflict: 'commercial.party.sync_conflict',
  membershipCreated: 'membership.created',
  membershipUpdated: 'membership.updated',
  membershipDeactivated: 'membership.deactivated',
  companyLifecycleStageChanged: 'crm.company.lifecyclestage_changed',
  personLegalEntityRelationshipCreated: 'person_legal_entity_relationship.created',
  personLegalEntityRelationshipUpdated: 'person_legal_entity_relationship.updated',
  personLegalEntityRelationshipDeactivated: 'person_legal_entity_relationship.deactivated',

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
  entitlementRoleDefaultChanged: 'access.entitlement_role_default_changed',
  entitlementUserOverrideChanged: 'access.entitlement_user_override_changed',
  startupPolicyChanged: 'access.startup_policy_changed',

  // DTE Reconciliation
  dteAutoMatched: 'finance.dte.auto_matched',
  dteMatched: 'finance.dte.matched',
  dteDiscrepancyFound: 'finance.dte.discrepancy_found',

  // Finance
  financeIncomeCreated: 'finance.income.created',
  financeIncomeUpdated: 'finance.income.updated',
  financeIncomeNuboxSynced: 'finance.income.nubox_synced',
  financeIncomeHubspotSynced: 'finance.income.hubspot_synced',
  financeIncomeHubspotSyncFailed: 'finance.income.hubspot_sync_failed',
  financeIncomeHubspotArtifactAttached: 'finance.income.hubspot_artifact_attached',
  financeExpenseCreated: 'finance.expense.created',
  financeExpenseUpdated: 'finance.expense.updated',
  financeExpenseNuboxSynced: 'finance.expense.nubox_synced',
  financeAccountCreated: 'finance.account.created',
  financeAccountUpdated: 'finance.account.updated',
  financePaymentInstrumentRevealedSensitive: 'finance.payment_instrument.revealed_sensitive',
  financePaymentInstrumentDeactivated: 'finance.payment_instrument.deactivated',
  financeVatPositionPeriodMaterialized: 'finance.vat_position.period_materialized',
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
  financePaymentInstrumentCreated: 'finance.payment_instrument.created',
  financePaymentInstrumentUpdated: 'finance.payment_instrument.updated',
  financePaymentInstrumentStatusChanged: 'finance.payment_instrument.status_changed',
  financePaymentInstrumentSensitiveRevealed: 'finance.payment_instrument.sensitive_revealed',
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
  providerToolingSnapshotPeriodMaterialized: 'provider.tooling_snapshot.period_materialized',
  commercialCostBasisPeoplePeriodMaterialized: 'commercial_cost_basis.people.period_materialized',
  commercialCostBasisToolsPeriodMaterialized: 'commercial_cost_basis.tools.period_materialized',
  commercialCostBasisBundlePeriodMaterialized: 'commercial_cost_basis.bundle.period_materialized',
  commercialCostBasisRolesPeriodMaterialized: 'commercial_cost_basis.roles.period_materialized',

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
  payrollEntryReliquidated: 'payroll_entry.reliquidated',
  payrollAdjustmentCreated: 'payroll.adjustment.created',
  payrollAdjustmentApproved: 'payroll.adjustment.approved',
  payrollAdjustmentReverted: 'payroll.adjustment.reverted',
  financePaymentObligationGenerated: 'finance.payment_obligation.generated',
  financePaymentObligationSuperseded: 'finance.payment_obligation.superseded',
  financePaymentObligationPaid: 'finance.payment_obligation.paid',
  financePaymentObligationCancelled: 'finance.payment_obligation.cancelled',

  // Payment Orders (TASK-750)
  financePaymentOrderCreated: 'finance.payment_order.created',
  financePaymentOrderApproved: 'finance.payment_order.approved',
  financePaymentOrderScheduled: 'finance.payment_order.scheduled',
  financePaymentOrderSubmitted: 'finance.payment_order.submitted',
  financePaymentOrderPaid: 'finance.payment_order.paid',
  financePaymentOrderSettled: 'finance.payment_order.settled',
  financePaymentOrderClosed: 'finance.payment_order.closed',
  financePaymentOrderFailed: 'finance.payment_order.failed',
  financePaymentOrderCancelled: 'finance.payment_order.cancelled',
  financePaymentOrderArtifactGenerated: 'finance.payment_order_artifact.generated',
  financePaymentOrderArtifactDownloaded: 'finance.payment_order_artifact.downloaded',
  leaveRequestCreated: 'leave_request.created',
  leaveRequestEscalatedToHr: 'leave_request.escalated_to_hr',
  leaveRequestApproved: 'leave_request.approved',
  leaveRequestRejected: 'leave_request.rejected',
  leaveRequestCancelled: 'leave_request.cancelled',
  leaveRequestPayrollImpactDetected: 'leave_request.payroll_impact_detected',
  leaveBalanceAdjusted: 'leave_balance.adjusted',
  leaveBalanceAdjustmentReversed: 'leave_balance.adjustment_reversed',

  // HR Goals (TASK-029)
  goalCreated: 'goal.created',
  goalUpdated: 'goal.updated',
  goalProgressRecorded: 'goal.progress_recorded',
  goalCycleActivated: 'goal_cycle.activated',
  goalCycleClosed: 'goal_cycle.closed',

  // HR Performance Evaluations (TASK-031)
  evalCyclePhaseAdvanced: 'eval_cycle.phase_advanced',
  evalCycleClosed: 'eval_cycle.closed',
  evalAssignmentSubmitted: 'eval_assignment.submitted',
  evalSummaryFinalized: 'eval_summary.finalized',
  compensationVersionCreated: 'compensation_version.created',
  compensationVersionUpdated: 'compensation_version.updated',
  payrollPrevisionalSnapshotUpserted: 'payroll.previsional_snapshot.upserted',

  // Services
  serviceCreated: 'service.created',
  serviceUpdated: 'service.updated',
  serviceDeactivated: 'service.deactivated',
  serviceSlaDefinitionCreated: 'service.sla_definition.created',
  serviceSlaDefinitionUpdated: 'service.sla_definition.updated',
  serviceSlaDefinitionDeleted: 'service.sla_definition.deleted',
  serviceSlaStatusChanged: 'service.sla_status.changed',
  serviceSkillRequirementUpserted: 'service_skill_requirement.upserted',
  serviceSkillRequirementDeleted: 'service_skill_requirement.deleted',

  // Person Intelligence
  compensationUpdated: 'compensation.updated',
  icoMaterializationCompleted: 'ico.materialization.completed',
  icoAiSignalsMaterialized: 'ico.ai_signals.materialized',
  icoAiLlmEnrichmentsMaterialized: 'ico.ai_llm_enrichments.materialized',
  financeAiSignalsMaterialized: 'finance.ai_signals.materialized',
  financeAiLlmEnrichmentsMaterialized: 'finance.ai_llm_enrichments.materialized',

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
  emailDeliveryDead: 'email_delivery.dead_letter',
  emailDeliverabilityAlert: 'email_delivery.deliverability_alert',
  emailGdprDeletionCompleted: 'email_delivery.gdpr_deletion_completed',

  // Quotes & Credit Notes (legacy finance namespace, TASK-344 cutover aliased via commercial.*)
  quoteCreated: 'finance.quote.created',
  quoteSynced: 'finance.quote.synced',
  quoteConverted: 'finance.quote.converted',
  quoteLineItemSynced: 'finance.quote_line_item.synced',
  creditNoteCreated: 'finance.credit_note.created',

  // Commercial Quotation (canonical, TASK-347)
  // Emitted alongside finance.quote.* during cutover so consumers can migrate gradually.
  quotationCreated: 'commercial.quotation.created',
  quotationUpdated: 'commercial.quotation.updated',
  quotationSynced: 'commercial.quotation.synced',
  quotationConverted: 'commercial.quotation.converted',
  quotationLineItemsSynced: 'commercial.quotation.line_items_synced',
  quotationDiscountHealthAlert: 'commercial.discount.health_alert',

  // Commercial Deals (TASK-453)
  dealSynced: 'commercial.deal.synced',
  dealCreated: 'commercial.deal.created',
  dealCreatedFromGreenhouse: 'commercial.deal.created_from_greenhouse',
  dealCreateRequested: 'commercial.deal.create_requested',
  dealCreateApprovalRequested: 'commercial.deal.create_approval_requested',
  dealStageChanged: 'commercial.deal.stage_changed',
  dealWon: 'commercial.deal.won',
  dealLost: 'commercial.deal.lost',

  // Commercial Quote-to-Cash choreography (TASK-541, Fase G)
  quoteToCashStarted: 'commercial.quote_to_cash.started',
  quoteToCashCompleted: 'commercial.quote_to_cash.completed',
  quoteToCashFailed: 'commercial.quote_to_cash.failed',
  quoteToCashApprovalRequested: 'commercial.quote_to_cash.approval_requested',

  // Commercial Quotation Governance (TASK-348)
  quotationVersionCreated: 'commercial.quotation.version_created',
  quotationApprovalRequested: 'commercial.quotation.approval_requested',
  quotationApprovalDecided: 'commercial.quotation.approval_decided',
  quotationIssued: 'commercial.quotation.issued',
  quotationSent: 'commercial.quotation.sent',
  quotationApproved: 'commercial.quotation.approved',
  quotationRejected: 'commercial.quotation.rejected',
  quotationTemplateUsed: 'commercial.quotation.template_used',
  quotationTemplateSaved: 'commercial.quotation.template_saved',

  // Quotation-to-Cash Document Chain Bridge (TASK-350)
  quotationPurchaseOrderLinked: 'commercial.quotation.po_linked',
  quotationServiceEntryLinked: 'commercial.quotation.hes_linked',
  quotationInvoiceEmitted: 'commercial.quotation.invoice_emitted',

  // Quotation Intelligence Automation (TASK-351)
  quotationExpired: 'commercial.quotation.expired',
  quotationRenewalDue: 'commercial.quotation.renewal_due',
  quotationPipelineMaterialized: 'commercial.quotation.pipeline_materialized',
  quotationProfitabilityMaterialized: 'commercial.quotation.profitability_materialized',
  commercialCapacityOvercommitDetected: 'commercial.capacity.overcommit_detected',

  // Commercial Contracts (TASK-460)
  contractCreated: 'commercial.contract.created',
  contractActivated: 'commercial.contract.activated',
  contractRenewed: 'commercial.contract.renewed',
  contractModified: 'commercial.contract.modified',
  contractTerminated: 'commercial.contract.terminated',
  contractCompleted: 'commercial.contract.completed',
  contractRenewalDue: 'commercial.contract.renewal_due',
  contractProfitabilityMaterialized: 'commercial.contract.profitability_materialized',

  // Margin Feedback Loop (TASK-482) — batch-level convergence of the
  // quotation + contract profitability snapshots plus calibration signals
  // for downstream cost basis recalibration.
  marginFeedbackBatchCompleted: 'commercial.margin_feedback.batch_completed',
  masterAgreementCreated: 'commercial.master_agreement.created',
  masterAgreementUpdated: 'commercial.master_agreement.updated',
  masterAgreementClausesChanged: 'commercial.master_agreement.clauses_changed',
  contractMsaLinked: 'commercial.contract.msa_linked',

  // Unified Quote Builder HubSpot bidirectional outbound (TASK-463)
  quotationPushedToHubSpot: 'commercial.quotation.pushed_to_hubspot',
  quotationHubSpotSyncFailed: 'commercial.quotation.hubspot_sync_failed',

  // Quote Builder Suggested Cost Override Governance (TASK-481)
  quotationLineCostOverridden: 'commercial.quotation_line.cost_overridden',

  // Pricing Catalog Approvals (TASK-550)
  pricingCatalogApprovalProposed: 'commercial.pricing_catalog_approval.proposed',
  pricingCatalogApprovalDecided: 'commercial.pricing_catalog_approval.decided',

  // Products (legacy finance namespace)
  productSynced: 'finance.product.synced',
  productCreated: 'finance.product.created',

  // Commercial Product Catalog (canonical, TASK-347 + TASK-545 sync foundation)
  productCatalogSynced: 'commercial.product_catalog.synced',
  productCatalogCreated: 'commercial.product_catalog.created',
  productCatalogUpdated: 'commercial.product_catalog.updated',
  productCatalogArchived: 'commercial.product_catalog.archived',
  productCatalogUnarchived: 'commercial.product_catalog.unarchived',

  // Product Catalog HubSpot Outbound (TASK-547)
  productHubSpotSynced: 'commercial.product.hubspot_synced_out',
  productHubSpotSyncFailed: 'commercial.product.hubspot_sync_failed',
  productSyncConflictDetected: 'commercial.product_sync_conflict.detected',
  productSyncConflictResolved: 'commercial.product_sync_conflict.resolved',
  sellableRoleCreated: 'commercial.sellable_role.created',
  sellableRoleUpdated: 'commercial.sellable_role.updated',
  sellableRoleCostUpdated: 'commercial.sellable_role.cost_updated',
  sellableRolePricingUpdated: 'commercial.sellable_role.pricing_updated',
  sellableRoleDeactivated: 'commercial.sellable_role.deactivated',
  sellableRoleReactivated: 'commercial.sellable_role.reactivated',

  // AI Tool lifecycle (deactivation added in TASK-546 Fase B)
  aiToolDeactivated: 'ai_tool.deactivated',
  aiToolReactivated: 'ai_tool.reactivated',

  // Overhead Addon lifecycle (publishers added in TASK-546 Fase B)
  overheadAddonCreated: 'commercial.overhead_addon.created',
  overheadAddonUpdated: 'commercial.overhead_addon.updated',
  overheadAddonDeactivated: 'commercial.overhead_addon.deactivated',
  overheadAddonReactivated: 'commercial.overhead_addon.reactivated',

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

  // TASK-484 FX sync observability (non-persistent events — emitted only
  // when the orchestrator needs to surface a degraded condition)
  financeFxSyncProviderFallback: 'finance.fx_sync.provider_fallback',
  financeFxSyncAllProvidersFailed: 'finance.fx_sync.all_providers_failed',

  // Cost Intelligence
  accountingPeriodClosed: 'accounting.period_closed',
  accountingPeriodReopened: 'accounting.period_reopened',
  accountingCommercialCostAttributionMaterialized: 'accounting.commercial_cost_attribution.materialized',
  accountingCommercialCostAttributionPeriodMaterialized: 'accounting.commercial_cost_attribution.period_materialized',
  accountingServiceAttributionPeriodMaterialized: 'accounting.service_attribution.period_materialized',
  accountingPlSnapshotMaterialized: 'accounting.pl_snapshot.materialized',
  accountingPlSnapshotPeriodMaterialized: 'accounting.pl_snapshot.period_materialized',
  accountingMarginAlertTriggered: 'accounting.margin_alert.triggered',
  staffAugPlacementCreated: 'staff_aug.placement.created',
  staffAugPlacementUpdated: 'staff_aug.placement.updated',
  staffAugPlacementStatusChanged: 'staff_aug.placement.status_changed',
  staffAugOnboardingItemUpdated: 'staff_aug.onboarding_item.updated',
  staffAugPlacementSnapshotMaterialized: 'staff_aug.placement_snapshot.materialized',
  staffAugPlacementSnapshotPeriodMaterialized: 'staff_aug.placement_snapshot.period_materialized',

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
  viewAccessSetRevoked: 'access.permission_set_revoked',

  // Sister Platforms (TASK-375)
  sisterPlatformBindingCreated: 'sister_platform_binding.created',
  sisterPlatformBindingUpdated: 'sister_platform_binding.updated',
  sisterPlatformBindingActivated: 'sister_platform_binding.activated',
  sisterPlatformBindingSuspended: 'sister_platform_binding.suspended',
  sisterPlatformBindingDeprecated: 'sister_platform_binding.deprecated',

  // Identity credential (TASK-451)
  identityPasswordHashRotated: 'identity.password_hash.rotated'
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
  EVENT_TYPES.personLegalEntityRelationshipCreated,
  EVENT_TYPES.personLegalEntityRelationshipUpdated,
  EVENT_TYPES.personLegalEntityRelationshipDeactivated,
  EVENT_TYPES.financeIncomeCreated,
  EVENT_TYPES.financeIncomeUpdated,
  EVENT_TYPES.financeExpenseCreated,
  EVENT_TYPES.financeExpenseUpdated,
  EVENT_TYPES.financeAccountCreated,
  EVENT_TYPES.financeAccountUpdated,
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
  EVENT_TYPES.payrollEntryReliquidated,
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
  EVENT_TYPES.financeAiSignalsMaterialized,
  EVENT_TYPES.financeAiLlmEnrichmentsMaterialized,
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
  EVENT_TYPES.viewAccessSetRevoked,

  // Sister Platforms (TASK-375)
  EVENT_TYPES.sisterPlatformBindingCreated,
  EVENT_TYPES.sisterPlatformBindingUpdated,
  EVENT_TYPES.sisterPlatformBindingActivated,
  EVENT_TYPES.sisterPlatformBindingSuspended,
  EVENT_TYPES.sisterPlatformBindingDeprecated,

  // Projection fan-out reduction (TASK-379)
  // v1 legacy per-entity events are kept here so the V2 consumer still recognizes
  // them as eligible during the migration window. They coexist with the v2
  // period-level events below until the legacy publish paths are retired.
  EVENT_TYPES.providerToolingSnapshotMaterialized,
  EVENT_TYPES.providerToolingSnapshotPeriodMaterialized,
  EVENT_TYPES.accountingCommercialCostAttributionMaterialized,
  EVENT_TYPES.accountingCommercialCostAttributionPeriodMaterialized,
  EVENT_TYPES.accountingPlSnapshotMaterialized,
  EVENT_TYPES.accountingPlSnapshotPeriodMaterialized,
  EVENT_TYPES.staffAugPlacementSnapshotMaterialized,
  EVENT_TYPES.staffAugPlacementSnapshotPeriodMaterialized
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
