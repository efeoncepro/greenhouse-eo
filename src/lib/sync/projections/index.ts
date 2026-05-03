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
}
