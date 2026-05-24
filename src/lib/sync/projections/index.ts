import 'server-only'

import { registerProjection } from '../projection-registry'
import { organization360Projection } from './organization-360'
import { notificationProjection } from './notifications'
import { icoMemberProjection } from './ico-member-metrics'
import { clientEconomicsProjection } from './client-economics'
import { organizationExecutiveProjection } from './organization-executive'
import { personIntelligenceProjection } from './person-intelligence'
import { icoOrganizationProjection } from './ico-organization-metrics'
import { organizationOperationalProjection } from './organization-operational'
import { memberCapacityEconomicsProjection } from './member-capacity-economics'
import { assignmentMembershipSyncProjection } from './assignment-membership-sync'
import { operatingEntityLegalRelationshipProjection } from './operating-entity-legal-relationship'
import { operatingEntityMembershipProjection } from './operating-entity-membership'
import { projectedPayrollProjection } from './projected-payroll'
import { leavePayrollRecalculationProjection } from './leave-payroll-recalculation'
import { payrollReceiptsProjection } from './payroll-receipts'
import { payslipOnPaymentPaidProjection } from './payslip-on-payment-paid'
import { payslipOnPaymentApprovedProjection } from './payslip-on-payment-approved'
import { payslipOnPaymentCancelledProjection } from './payslip-on-payment-cancelled'
import { payrollExportReadyProjection } from './payroll-export-ready'
import { periodClosureStatusProjection } from './period-closure-status'
import { commercialCostAttributionProjection } from './commercial-cost-attribution'
import { serviceAttributionProjection } from './service-attribution'
import { operationalPlProjection } from './operational-pl'
import { providerToolingProjection } from './provider-tooling'
import { staffAugPlacementProjection } from './staff-augmentation'
import { financeExpenseReactiveIntakeProjection } from './finance-expense-reactive-intake'
import { paymentObligationsFromPayrollProjection } from './payment-obligations-from-payroll'
import { recordExpensePaymentFromOrderProjection } from './record-expense-payment-from-order'
import { payrollReliquidationDeltaProjection } from './payroll-reliquidation-delta'
import { agencyPerformanceReportProjection } from './agency-performance-report'
import { icoAiSignalsProjection } from './ico-ai-signals'
import { icoLlmEnrichmentsProjection } from './ico-llm-enrichments'
import { accountBalancesProjection } from './account-balances'
import { serviceSlaComplianceProjection } from './service-sla-compliance'
import { quotationPipelineProjection } from './quotation-pipeline'
import { quotationProfitabilityProjection } from './quotation-profitability'
import { quotationHubSpotOutboundProjection } from './quotation-hubspot-outbound'
import { dealPipelineProjection } from './deal-pipeline'
import { contractMrrArrProjection } from './contract-mrr-arr'
import { sourceToProductCatalogProjection } from './source-to-product-catalog'
import { productHubSpotOutboundProjection } from './product-hubspot-outbound'
import { incomeHubSpotOutboundProjection } from './income-hubspot-outbound'
import { quoteToCashAutopromoterProjection } from './quote-to-cash-autopromoter'
import { vatMonthlyPositionProjection } from './vat-monthly-position'
import { partyHubSpotOutboundProjection } from './party-hubspot-outbound'
import { partyLifecycleSnapshotProjection } from './party-lifecycle-snapshot'
import { pricingCatalogApprovalNotifierProjection } from './pricing-catalog-approval-notifier'
import { productCatalogPricesRecomputeProjection } from './product-catalog-prices-recompute'
import { productCatalogPricesSyncProjection } from './product-catalog-prices-sync'
import { teamsNotifyProjection } from './teams-notify'
import { providerBqSyncProjection } from './provider-bq-sync'
import { hrOnboardingAutoCreateProjection } from './hr-onboarding-auto-create'
import { hubspotServicesIntakeProjection } from './hubspot-services-intake'
import { hubspotCompaniesIntakeProjection } from './hubspot-companies-intake'
import { paymentProfileNotificationsProjection } from './payment-profile-notifications'
import { engagementConvertedProjection } from './engagement-converted'
import { engagementCancelledProjection } from './engagement-cancelled'
import { organizationWorkspaceCacheInvalidationProjection } from './organization-workspace-cache-invalidation'
import { notionStatusTransitionCaptureDemoProjection } from './notion-status-transition-capture-demo'
import { notionStatusTransitionCaptureProjection } from './notion-status-transition-capture'
import { notionDueDateChangeCaptureProjection } from './notion-due-date-change-capture'
import { notionTransitionBqSyncProjection } from './notion-transition-bq-sync'
import { notionRpaComputeDemoProjection } from './notion-rpa-compute-demo'
import { notionRpaWritebackDemoProjection } from './notion-rpa-writeback-demo'
import { notionRpaComputeProjection } from './notion-rpa-compute'
import { notionRpaWritebackProjection } from './notion-rpa-writeback'
import { sampleSprintHubSpotOutboundProjection } from './sample-sprint-hubspot-outbound'
import { sampleSprintRuntimeCacheInvalidationProjection } from './sample-sprint-runtime-cache-invalidation'

// DEPRECATED: personOperationalProjection removed — replaced by personIntelligenceProjection
// DEPRECATED: icoMemberProjection kept for backward compat (BQ → Postgres sync) but person_intelligence
// is now the primary consumer of that data

let registered = false

export const ensureProjectionsRegistered = () => {
  if (registered) return
  registered = true

  registerProjection(organization360Projection)
  registerProjection(notificationProjection)
  registerProjection(icoMemberProjection) // Keeps BQ → Postgres ico_member_metrics sync active
  registerProjection(clientEconomicsProjection)
  registerProjection(organizationExecutiveProjection)
  registerProjection(personIntelligenceProjection) // Replaces personOperationalProjection
  registerProjection(icoOrganizationProjection)
  registerProjection(organizationOperationalProjection)
  registerProjection(memberCapacityEconomicsProjection)
  registerProjection(assignmentMembershipSyncProjection)
  registerProjection(operatingEntityLegalRelationshipProjection)
  registerProjection(operatingEntityMembershipProjection)
  registerProjection(projectedPayrollProjection)
  registerProjection(leavePayrollRecalculationProjection)
  registerProjection(payrollReceiptsProjection)
  registerProjection(payslipOnPaymentPaidProjection)
  registerProjection(payslipOnPaymentApprovedProjection)
  registerProjection(payslipOnPaymentCancelledProjection)
  registerProjection(payrollExportReadyProjection)
  registerProjection(periodClosureStatusProjection)
  registerProjection(providerToolingProjection)
  registerProjection(financeExpenseReactiveIntakeProjection)
  registerProjection(paymentObligationsFromPayrollProjection)
  registerProjection(recordExpensePaymentFromOrderProjection)
  registerProjection(payrollReliquidationDeltaProjection)
  registerProjection(accountBalancesProjection)
  registerProjection(staffAugPlacementProjection)
  registerProjection(commercialCostAttributionProjection)
  registerProjection(serviceAttributionProjection)
  registerProjection(operationalPlProjection)
  registerProjection(agencyPerformanceReportProjection)
  registerProjection(icoAiSignalsProjection)
  registerProjection(icoLlmEnrichmentsProjection)
  registerProjection(serviceSlaComplianceProjection)
  registerProjection(quotationPipelineProjection)
  registerProjection(quotationProfitabilityProjection)
  registerProjection(quotationHubSpotOutboundProjection)
  registerProjection(dealPipelineProjection)
  registerProjection(contractMrrArrProjection)
  registerProjection(sourceToProductCatalogProjection)
  registerProjection(productHubSpotOutboundProjection)
  registerProjection(productCatalogPricesRecomputeProjection)
  registerProjection(productCatalogPricesSyncProjection)
  registerProjection(pricingCatalogApprovalNotifierProjection)
  registerProjection(incomeHubSpotOutboundProjection)
  registerProjection(partyHubSpotOutboundProjection)
  registerProjection(partyLifecycleSnapshotProjection)
  registerProjection(quoteToCashAutopromoterProjection)
  registerProjection(vatMonthlyPositionProjection)
  registerProjection(teamsNotifyProjection)
  registerProjection(providerBqSyncProjection) // TASK-771 — provider.upserted → BQ MERGE + fin_suppliers UPDATE
  registerProjection(hubspotServicesIntakeProjection) // TASK-813b — async intake p_services HubSpot via outbox event
  registerProjection(hubspotCompaniesIntakeProjection) // TASK-878 — async intake companies + contacts HubSpot via outbox event (mirror TASK-813b)
  registerProjection(hrOnboardingAutoCreateProjection)
  registerProjection(paymentProfileNotificationsProjection) // TASK-753 — notify beneficiary on profile lifecycle events
  registerProjection(engagementConvertedProjection)
  registerProjection(engagementCancelledProjection)
  registerProjection(organizationWorkspaceCacheInvalidationProjection) // TASK-611 Slice 6 — drops projection cache on grant/role/lifecycle events
  registerProjection(sampleSprintRuntimeCacheInvalidationProjection) // TASK-835 Slice 6 — drops Sample Sprints runtime projection cache on engagement events
  registerProjection(sampleSprintHubSpotOutboundProjection) // TASK-837 Slice 4 — projects Sample Sprints to HubSpot p_services with idempotency + association orchestration
  registerProjection(notionStatusTransitionCaptureDemoProjection) // TASK-910 Slice 3 — persist demo teamspace status transitions en tabla físicamente separada (filter metadata.demo_mode === true)
  registerProjection(notionStatusTransitionCaptureProjection) // TASK-912 Slice 2 — persist productive (Efeonce/Sky) status transitions vía re-fetch + workspace autoritativo por parent.data_source_id
  registerProjection(notionDueDateChangeCaptureProjection) // TASK-921 — captura cambios de Fecha límite (task_due_date_changes) reusando page_change_signal; persist-if-changed + inferencia de motivo; gated NOTION_DUE_DATE_CAPTURE_ENABLED (default OFF)
  registerProjection(notionTransitionBqSyncProjection) // TASK-912 Slice 3 — MERGE task_status_transitions PG → greenhouse_conformed BQ (reactivo, re-read PG, idempotente por transition_id)
  registerProjection(notionRpaComputeDemoProjection) // TASK-913 Slice 1 — compute RpA V2 demo via calculateRpaV2Demo + snapshot + emit writeback chain event (sibling físicamente separado del path productivo futuro TASK-901 Slice 4)
  registerProjection(notionRpaWritebackDemoProjection) // TASK-913 Slice 2 — PATCH Notion [GH] RpA v2 con valor del snapshot (re-read PG defensive, retryable, idempotent — sibling físicamente separado del writeback productivo futuro)
  registerProjection(notionRpaComputeProjection) // TASK-916 Slice 3 — compute RpA V2 PRODUCTIVO (Efeonce/Sky) via calculateRpaV2 post notion.task.status_transitioned + snapshot task_rpa_snapshots + chain event metrics_writeback_requested
  registerProjection(notionRpaWritebackProjection) // TASK-916 Slice 4 — PATCH Notion [GH] RpA v2 PRODUCTIVO con valor del snapshot, gated NOTION_RPA_WRITEBACK_ENABLED (default OFF hasta TASK-917 Flip A)
}
