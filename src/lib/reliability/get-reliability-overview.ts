import 'server-only'

import type { CloudSentryIncidentsSnapshot } from '@/lib/cloud/contracts'
import { getCloudSentryIncidents } from '@/lib/cloud/observability'
import { getGcpBillingOverview } from '@/lib/cloud/gcp-billing'
import { getGitHubBillingOverview } from '@/lib/cloud/github-billing'
import { getVercelBillingOverview } from '@/lib/cloud/vercel-billing'
import { getNotionSyncOperationalOverview } from '@/lib/integrations/notion-sync-operational-overview'
import type { NotionSyncOperationalOverview } from '@/lib/integrations/notion-sync-operational-overview'
import {
  getOperationsOverview,
  type OperationsOverview
} from '@/lib/operations/get-operations-overview'
import { getFinanceSmokeLaneStatus } from '@/lib/reliability/finance/get-finance-smoke-lane-status'
import { getLatestSyntheticSnapshotsByRoute } from '@/lib/reliability/synthetic/reader'
import type { GcpBillingOverview } from '@/types/billing-export'
import type { FinanceSmokeLaneStatus } from '@/types/finance-smoke-lane'
import type { GitHubBillingOverview } from '@/types/github-billing'
import type {
  ReliabilityIntegrationBoundary,
  ReliabilityModuleKey,
  ReliabilityModuleDefinition,
  ReliabilityModuleSnapshot,
  ReliabilityOverview,
  ReliabilitySeverity,
  ReliabilitySignal,
  ReliabilitySignalKind
} from '@/types/reliability'
import type { SyntheticRouteSnapshot } from '@/types/reliability-synthetic'
import type { VercelBillingOverview } from '@/types/vercel-billing'

import { buildAiSummarySignals } from './ai/build-ai-summary-signals'
import { getLatestAiObservationsByScope, type AiObservation } from './ai/reader'
import { getAccountBalancesFxDriftSignal } from './queries/account-balances-fx-drift'
import { getFinalSettlementPdfStatusDriftSignal } from './queries/final-settlement-pdf-status-drift'
import {
  getExpenseDistributionSharedPoolContaminationSignal,
  getExpenseDistributionUnresolvedSignal
} from './queries/expense-distribution'
import { getClientPortalResolverFailureRateSignal } from './queries/client-portal-resolver-failure-rate'
import { getEntraWebhookSubscriptionHealthSignal } from './queries/entra-webhook-subscription-health'
import { getExpensePaymentsClpDriftSignal } from './queries/expense-payments-clp-drift'
import { getLedgerUnresolvedDriftItemsSignal } from './queries/ledger-unresolved-drift-items'
import { getNuboxExportOrphanRfcSignal } from './queries/nubox-export-orphan-rfc'
import { getPaymentOrderMixedCurrencySignal } from './queries/payment-order-mixed-currency'
import { getFxGainLossUnclassifiedSignal } from './queries/fx-gain-loss-unclassified'
import {
  getCashSignalUnsupportedCurrencySignal,
  getFxSnapshotMissingSignal,
  getMxnRateFreshnessSignal,
  getNativeEquivalentDriftSignal,
  getNuboxExportForeignAmountMissingSignal
} from './queries/multi-currency-fx-signals'
import { getContractorPayableReadyWithoutObligationSignal } from './queries/contractor-payable-ready-without-obligation'
import { getContractorPayableExpenseUnmaterializedSignal } from './queries/contractor-payable-expense-unmaterialized'
import { getContractorPayablePaymentSlaOverdueSignal } from './queries/contractor-payable-payment-sla-overdue'
import { getContractingAiDraftFailedSignal } from './queries/contracting-ai-draft-failed'
import { getContractingApprovedWithoutPdfSignal } from './queries/contracting-approved-without-pdf'
import { getContractingPdfStatusDriftSignal } from './queries/contracting-pdf-status-drift'
import { getContractingSignatureDesyncSignal } from './queries/contracting-signature-desync'
import {
  getSignatureFailedSignal,
  getSignaturePendingOverdueSignal,
  getSignatureSignedArtifactMissingSignal
} from './queries/signature-orchestration-signals'
import { getContractingValidationBlockedOverdueSignal } from './queries/contracting-validation-blocked-overdue'
import { getContractorPayableUnbatchedOverdueSignal } from './queries/contractor-payable-unbatched-overdue'
import { getContractorPayableBridgeDeadLetterSignal } from './queries/contractor-payable-bridge-dead-letter'
import { getContractorRemittanceEmailDeadLetterSignal } from './queries/contractor-remittance-email-dead-letter'
import { getContractorPayableTaxReviewOverdueSignal } from './queries/contractor-payable-tax-review-overdue'
import { getContractorPayableFxUnresolvedOverdueSignal } from './queries/contractor-payable-fx-unresolved-overdue'
import { getContractorPayableExceedsAgreedAmountSignal } from './queries/contractor-payable-exceeds-agreed-amount'
import { getFinanceClientProfileUnlinkedSignal } from './queries/finance-client-profile-unlinked'
import { getIdentityLegalProfileEvidenceOrphanSignal } from './queries/identity-legal-profile-evidence-orphan'
import { getIdentityLegalProfilePayrollBlockingSignal } from './queries/identity-legal-profile-payroll-blocking'
import { getIdentityLegalProfilePendingOverdueSignal } from './queries/identity-legal-profile-pending-overdue'
import { getIdentityLegalProfileRevealAnomalySignal } from './queries/identity-legal-profile-reveal-anomaly'
import { getIcoMaterializerSkippedSafetySignal } from './queries/ico-materializer-skipped-safety'
import { getNexaInsightsFreshnessSignal } from './queries/nexa-insights-freshness'
import { getNexaInsightsNoNewSignalsSignal } from './queries/nexa-insights-no-new-signals'
import { getNexaTurnDegradedOutcomesSignal } from './queries/nexa-turn-degraded-outcomes'
import { getNotionCorrectionTransitionsSourceAvailabilitySignal } from './queries/notion-correction-transitions-source-availability'
import { getNotionMetricsOtdClassifierParitySignal } from './queries/notion-metrics-otd-classifier-parity'
import {
  getNotionMetricsShadowParidadRpaDemoSignal,
  getNotionMetricsEchoLoopDemoSignal,
  getNotionMetricsWebhookSignatureFailuresDemoSignal,
  getNotionMetricsWritebackDeadLetterDemoSignal,
  getNotionMetricsWritebackLagDemoSignal,
  getNotionMetricsDemoTeamspaceDriftSignal,
  getNotionMetricsTransitionCaptureRefetchFailedDemoSignal,
  getPayrollBonusDemoContaminationSignal
} from './queries/notion-metrics-demo-signals'
import {
  getNotionStatusTransitionsIngestionLagSignal,
  getNotionStatusTransitionsCaptureRefetchFailedSignal,
  getNotionStatusTransitionsBqSyncLagSignal
} from './queries/notion-status-transitions-signals'
import { getNotionStatusTransitionsReconciliationSignal } from './queries/notion-status-transitions-reconciliation'
import {
  getRescheduleCaptureLagSignal,
  getReschedulePendingReasonSignal
} from './queries/reschedule-signals'
import {
  getAttributableLatenessShadowParidadSignal,
  getAttributableLatenessOverlapSignal
} from './queries/attributable-lateness-signals'
import {
  getNotionMetricsWritebackDeadLetterSignal,
  getNotionMetricsWritebackLagSignal
} from './queries/notion-metrics-rpa-signals'
import {
  getNotionMetricsFtrWritebackDeadLetterSignal,
  getNotionMetricsFtrWritebackLagSignal
} from './queries/notion-metrics-ftr-signals'
import { getIdentityNotionBridgeCoverageSignal } from './queries/identity-notion-bridge-coverage'
import { getIdentitySessionRouteGroupDriftSignal } from './queries/identity-session-route-group-drift'
import { getLeaveInvalidDelegatedApprovalSnapshotsSignal } from './queries/leave-invalid-delegated-approval-snapshots'
import { getIdentityRelationshipMemberContractDriftSignal } from './queries/identity-relationship-member-contract-drift'
import { getOffboardingCompletenessPartialSignal } from './queries/offboarding-completeness-partial'
import { getContractorEngagementClassificationReviewPendingSignal } from './queries/contractor-engagement-classification-review-pending'
import { getContractorEngagementClassificationRiskOpenSignal } from './queries/contractor-engagement-classification-risk-open'
import { getContractorEngagementClosedWithOpenPayablesSignal } from './queries/contractor-engagement-closed-with-open-payables'
import { getContractorInvoiceAssetsBrokenEvidenceSignal } from './queries/contractor-invoice-assets-broken-evidence'
import { getContractorWorkSubmissionReviewOverdueSignal } from './queries/contractor-work-submission-review-overdue'
import { getContractorPayableHonorariosRutUnverifiedSignal } from './queries/contractor-payable-honorarios-rut-unverified'
import { getContractorTransitionOrphanSignal } from './queries/contractor-transition-orphan'
import { getContractorEngagementRateUnsetSignal } from './queries/contractor-engagement-rate-unset'
import { getScimWorkforceSignals } from './queries/scim-workforce-signals'
import {
  getIdentityGovernanceAuditLogWriteFailuresSignal,
  getIdentityGovernancePendingApprovalOverdueSignal
} from './queries/identity-governance-signals'
import {
  getSisterPlatformOAuthExchangeFailureRateSignal,
  getSisterPlatformOAuthRedirectRejectedSignal,
  getSisterPlatformOAuthStaleClientConfigSignal
} from './queries/sister-platform-oauth-signals'
import { getIncomePaymentsClpDriftSignal } from './queries/income-payments-clp-drift'
import { getPaymentOrdersDeadLetterSignal } from './queries/payment-orders-dead-letter'
import { getPaidOrdersWithoutExpensePaymentSignal } from './queries/payment-orders-paid-without-expense-payment'
import { getPayrollComplianceExportDriftSignal } from './queries/payroll-compliance-export-drift'
import { getPayrollExpenseMaterializationLagSignal } from './queries/payroll-expense-materialization-lag'
import { getPayrollParticipationWindowFullMonthEntryDriftSignal } from './queries/payroll-participation-window-full-month-entry-drift'
import { getPayrollParticipationWindowProjectionDeltaAnomalySignal } from './queries/payroll-participation-window-projection-delta-anomaly'
import { getPayrollParticipationWindowSourceDateDisagreementSignal } from './queries/payroll-participation-window-source-date-disagreement'
import { getLeaveAccrualOvershootDriftSignal } from './queries/leave-accrual-overshoot-drift'
import { getPayrollContractorDoubleRailOverlapSignal } from './queries/payroll-contractor-double-rail-overlap'
import { getPayrollDeelMemberWithoutContractIdSignal } from './queries/payroll-deel-member-without-contract-id'
import { getPayrollContractTaxonomyFallbackResolutionLegacySignal } from './queries/payroll-contract-taxonomy-fallback-resolution-legacy'
import { getPayrollContractTaxonomyInvalidTupleDriftSignal } from './queries/payroll-contract-taxonomy-invalid-tuple-drift'
import { getPayrollContractTaxonomyInvalidStatutoryApplicationSignal } from './queries/payroll-contract-taxonomy-invalid-statutory-application'
import { getProviderBqSyncDeadLetterSignal } from './queries/provider-bq-sync-dead-letter'
import { getHubspotCompaniesIntakeDeadLetterSignal } from './queries/hubspot-companies-intake-dead-letter'
import { getWorkforceUnlinkedInternalUsersSignal } from './queries/workforce-unlinked-internal-users'
// TASK-1082 — Knowledge Platform ingestion signals (moduleKey 'knowledge').
import { getKnowledgeNotionIngestDeadLetterSignal } from './queries/knowledge-notion-ingest-dead-letter'
import { getKnowledgeQuarantineCountSignal } from './queries/knowledge-quarantine-count'
import { getKnowledgeSyncFailedSourceSignal } from './queries/knowledge-sync-failed-source'
// TASK-1085 — Nexa knowledge retrieval observability (moduleKey 'knowledge').
import { getNexaKnowledgeRetrievalSignals } from './queries/nexa-knowledge-retrieval-signals'
import { getServiceEngagementEngagementKindUnmappedSignal } from './queries/service-engagement-engagement-kind-unmapped'
import { getServiceEngagementLifecycleStageUnknownSignal } from './queries/service-engagement-lifecycle-stage-unknown'
import { getServiceEngagementLineageOrphanSignal } from './queries/service-engagement-lineage-orphan'
import { getServiceEngagementRenewedStuckSignal } from './queries/service-engagement-renewed-stuck'
import { getServicesLegacyResidualReadsSignal } from './queries/services-legacy-residual-reads'
import { getServicesOrganizationUnresolvedSignal } from './queries/services-organization-unresolved'
import { getServicesSyncLagSignal } from './queries/services-sync-lag'
import { getHomeRolloutDriftSignal } from './queries/home-rollout-drift'
import {
  getRoleTitleDriftWithEntraSignal,
  getRoleTitleUnresolvedDriftOverdueSignal
} from './queries/role-title-drift'
import { getShortcutsInvalidPinsSignal } from './queries/shortcuts-invalid-pins'
import { getWorkspaceProjectionFacetViewDriftSignal } from './queries/workspace-projection-drift'
import { getWorkspaceProjectionUnresolvedRelationsSignal } from './queries/workspace-projection-unresolved-relations'
import {
  getOrganizationBrandAssetCoverageSignal,
  getOrganizationBrandAssetDiscoveryFailuresSignal
} from './queries/organization-brand-assets'
import { getCloudRunSilentObservabilitySignal } from './queries/cloud-run-silent-observability'
import { getAiObserverUnhealthySignal } from './queries/ai-observer-unhealthy'
import { getSecretsEnvRefFormatDriftSignal } from './queries/secrets-env-ref-format-drift'
import { getPostgresConnectionSaturationSignal } from './queries/postgres-connection-saturation'
import { getCriticalTablesMissingSignal } from './queries/critical-tables-missing'
import { getOutboxUnpublishedLagSignal } from './queries/outbox-unpublished-lag'
import { getOutboxDeadLetterSignal } from './queries/outbox-dead-letter'
import { getReleaseDeployDurationSignal } from './queries/release-deploy-duration'
import { getReleaseGithubWebhookUnmatchedSignal } from './queries/release-github-webhook-unmatched'
import { getReleaseLastStatusSignal } from './queries/release-last-status'
import { getReleasePendingWithoutJobsSignal } from './queries/release-pending-without-jobs'
import { getReleaseStaleApprovalSignal } from './queries/release-stale-approval'
import { getReleaseWorkerRevisionDriftSignal } from './queries/release-worker-revision-drift'
import { getEmailRenderFailureSignal } from './queries/email-render-failure'
import { getNuboxSourceFreshnessSignal } from './queries/nubox-source-freshness'
import { getNotionConformedDrainFreshnessSignal } from './queries/notion-conformed-drain-freshness'
import { getNotionOnboardingIncompleteSignal } from './queries/notion-onboarding-incomplete'
import { getEngagementBudgetOverrunSignal } from './queries/engagement-budget-overrun'
import { getEngagementConversionRateDropSignal } from './queries/engagement-conversion-rate-drop'
import { getEngagementOverdueDecisionSignal } from './queries/engagement-overdue-decision'
// TASK-991 Slice 0 — 4 reliability signals de completitud del nacimiento de la organización.
// Todas roll up bajo subsystem `commercial`. Steady=0.
import { getCommercialClientActiveWithoutProfileSignal } from './queries/commercial-client-active-without-profile'
import { getCommercialClientActiveWithoutSpaceSignal } from './queries/commercial-client-active-without-space'
// TASK-992 — 5 reliability signals del Client Lifecycle Orchestrator (roll up `commercial`).
import {
  getClientLifecycleOnboardingStalledSignal,
  getClientLifecycleChecklistOrphanItemsSignal,
  getClientLifecycleCascadeDeadLetterSignal,
  getClientLifecycleCaseWithoutTemplateSignal,
  getClientLifecycleBlockerOverrideAnomalySignal,
  getClientLifecycleEvidenceDetectedNotMarkedSignal
} from './queries/client-lifecycle-signals'
import { getCommercialOrganizationIncompleteIdentitySignal } from './queries/commercial-organization-incomplete-identity'
import { getCommercialOrganizationIndustryNoncanonicalSignal } from './queries/commercial-organization-industry-noncanonical'
import { getCommercialOrganizationTypeLifecycleDriftSignal } from './queries/commercial-organization-type-lifecycle-drift'
import { getSampleSprintProjectionDegradedSignal } from './queries/sample-sprint-projection-degraded'
// TASK-837 Slice 6 — 7 reliability signals for Sample Sprint outbound projection.
import {
  getSampleSprintDealAssociationsDriftSignal,
  getSampleSprintDealClosedButActiveSignal,
  getSampleSprintLegacyWithoutDealSignal,
  getSampleSprintOutboundDeadLetterSignal,
  getSampleSprintOutboundPendingOverdueSignal,
  getSampleSprintOutcomeTerminalPservicesOpenSignal,
  getSampleSprintPartialAssociationsSignal
} from './queries/sample-sprint-outbound-signals'
import { getCronStagingDriftSignal } from './queries/cron-staging-drift'
import { getEngagementStaleProgressSignal } from './queries/engagement-stale-progress'
import { getEngagementUnapprovedActiveSignal } from './queries/engagement-unapproved-active'
import { getEngagementZombieSignal } from './queries/engagement-zombie'
import { RELIABILITY_REGISTRY } from './registry'
import { getReliabilityRegistry } from './registry-store'
import {
  aggregateModuleStatus,
  computeConfidence,
  isConcreteSeverity
} from './severity'
import {
  buildCloudSignals,
  buildDomainIncidentSignals,
  buildGitHubBillingSignals,
  buildFinanceSmokeLaneSignals,
  buildGcpBillingSignals,
  buildVercelBillingSignals,
  buildNotionDataQualitySignals,
  buildNotionFreshnessSignal,
  buildObservabilityPostureSignal,
  buildFinanceClpDriftSignals,
  buildCommercialHealthSignals,
  buildExpenseDistributionSignals,
  buildPayrollContractTaxonomySignals,
  buildPayrollParticipationWindowSignals,
  buildLeaveAccrualSignals,
  buildPaymentOrderSettlementSignals,
  buildSentryIncidentSignals,
  buildSubsystemSignals,
  buildSyntheticModuleSignals,
  buildSyntheticRouteSignals
} from './signals'

const RELIABILITY_INTEGRATION_BOUNDARIES: ReliabilityIntegrationBoundary[] = [
  {
    taskId: 'TASK-586',
    moduleKey: 'cloud',
    expectedSignalKind: 'billing',
    expectedSource: 'getGcpBillingOverview',
    status: 'ready',
    note: 'TASK-586 entregó el reader Billing Export con degradación honesta (awaiting_data cuando tablas no rinden). Adapter: buildGcpBillingSignals.'
  },
  {
    taskId: 'TASK-636',
    moduleKey: 'cloud',
    expectedSignalKind: 'billing',
    expectedSource: 'getVercelBillingOverview',
    status: 'ready',
    note: 'TASK-636 agrega Vercel Billing FOCUS v1.3 read-only con degradación honesta y adapter buildVercelBillingSignals.'
  },
  {
    taskId: 'TASK-637',
    moduleKey: 'cloud',
    expectedSignalKind: 'billing',
    expectedSource: 'getGitHubBillingOverview',
    status: 'ready',
    note: 'TASK-637 agrega GitHub Billing Usage read-only con degradación honesta y adapter buildGitHubBillingSignals.'
  },
  {
    taskId: 'TASK-586',
    moduleKey: 'integrations.notion',
    expectedSignalKind: 'freshness',
    expectedSource: 'getNotionSyncOperationalOverview',
    status: 'ready',
    note: 'TASK-586 entregó composer Notion sync end-to-end (raw + orchestration + DQ). Adapter: buildNotionFreshnessSignal.'
  },
  {
    taskId: 'TASK-599',
    moduleKey: 'finance',
    expectedSignalKind: 'test_lane',
    expectedSource: 'getFinanceSmokeLaneStatus',
    status: 'ready',
    note: 'TASK-599 entregó 3 smoke specs Playwright (clients, suppliers, expenses) + reader que parsea artifacts/playwright/results.json + adapter buildFinanceSmokeLaneSignals.'
  },
  {
    taskId: 'TASK-632',
    moduleKey: 'finance',
    expectedSignalKind: 'runtime',
    expectedSource: 'runReliabilitySyntheticSweep',
    status: 'ready',
    note: 'TASK-632 entregó cron de synthetic monitoring. Adapter: buildSyntheticRouteSignals.'
  },
  {
    taskId: 'TASK-632',
    moduleKey: 'integrations.notion',
    expectedSignalKind: 'runtime',
    expectedSource: 'runReliabilitySyntheticSweep',
    status: 'ready',
    note: 'TASK-632 entregó cron de synthetic monitoring. Adapter: buildSyntheticRouteSignals.'
  },
  {
    taskId: 'TASK-632',
    moduleKey: 'cloud',
    expectedSignalKind: 'runtime',
    expectedSource: 'runReliabilitySyntheticSweep',
    status: 'ready',
    note: 'TASK-632 entregó cron de synthetic monitoring. Adapter: buildSyntheticRouteSignals.'
  },
  {
    taskId: 'TASK-632',
    moduleKey: 'delivery',
    expectedSignalKind: 'runtime',
    expectedSource: 'runReliabilitySyntheticSweep',
    status: 'ready',
    note: 'TASK-632 entregó cron de synthetic monitoring. Adapter: buildSyntheticRouteSignals.'
  },
  {
    taskId: 'TASK-103',
    moduleKey: 'cloud',
    expectedSignalKind: 'billing',
    expectedSource: 'getGcpBudgetThresholdState',
    status: 'partial',
    note: 'TASK-103 todavía cubre solo cost guard runtime (kind=cost_guard). Budget thresholds 50/80/100% requieren GCP Console manual. La señal billing principal ya la cubre TASK-586.'
  },
  {
    taskId: 'TASK-638',
    moduleKey: 'finance',
    expectedSignalKind: 'ai_summary',
    expectedSource: 'reliability_ai_observer',
    status: 'ready',
    note: 'TASK-638 entregó AI Observer (Gemini Flash via Vertex AI) hosted en ops-worker + Cloud Scheduler. Adapter: buildAiSummarySignals. Default OFF (kill-switch RELIABILITY_AI_OBSERVER_ENABLED).'
  },
  {
    taskId: 'TASK-638',
    moduleKey: 'integrations.notion',
    expectedSignalKind: 'ai_summary',
    expectedSource: 'reliability_ai_observer',
    status: 'ready',
    note: 'TASK-638 entregó AI Observer (Gemini Flash via Vertex AI) hosted en ops-worker + Cloud Scheduler. Adapter: buildAiSummarySignals. Default OFF (kill-switch RELIABILITY_AI_OBSERVER_ENABLED).'
  },
  {
    taskId: 'TASK-638',
    moduleKey: 'cloud',
    expectedSignalKind: 'ai_summary',
    expectedSource: 'reliability_ai_observer',
    status: 'ready',
    note: 'TASK-638 entregó AI Observer (Gemini Flash via Vertex AI) hosted en ops-worker + Cloud Scheduler. Adapter: buildAiSummarySignals. Default OFF (kill-switch RELIABILITY_AI_OBSERVER_ENABLED).'
  },
  {
    taskId: 'TASK-638',
    moduleKey: 'delivery',
    expectedSignalKind: 'ai_summary',
    expectedSource: 'reliability_ai_observer',
    status: 'ready',
    note: 'TASK-638 entregó AI Observer (Gemini Flash via Vertex AI) hosted en ops-worker + Cloud Scheduler. Adapter: buildAiSummarySignals. Default OFF (kill-switch RELIABILITY_AI_OBSERVER_ENABLED).'
  }
]

const buildSummary = (
  status: ReliabilitySeverity,
  signalCounts: Record<ReliabilitySeverity, number>,
  missing: ReliabilitySignalKind[]
): string => {
  const concreteTotal = signalCounts.ok + signalCounts.warning + signalCounts.error

  if (signalCounts.error > 0) {
    return `${signalCounts.error} señal${signalCounts.error === 1 ? '' : 'es'} en error.`
  }

  if (signalCounts.warning > 0) {
    return `${signalCounts.warning} señal${signalCounts.warning === 1 ? '' : 'es'} en warning.`
  }

  if (concreteTotal === 0) {
    if (missing.length > 0) {
      return `Sin señales concretas. Pendiente plomar: ${missing.join(', ')}.`
    }

    return 'Sin señales activas todavía.'
  }

  if (status === 'ok') {
    return `${concreteTotal} señal${concreteTotal === 1 ? '' : 'es'} sanas.`
  }

  return `Estado: ${status}.`
}

const buildSignalCounts = (
  signals: ReliabilitySignal[]
): Record<ReliabilitySeverity, number> => {
  const counts: Record<ReliabilitySeverity, number> = {
    ok: 0,
    warning: 0,
    error: 0,
    unknown: 0,
    not_configured: 0,
    awaiting_data: 0
  }

  for (const signal of signals) {
    counts[signal.severity] += 1
  }

  return counts
}

const SIGNAL_SEVERITY_RANK: Record<ReliabilitySeverity, number> = {
  error: 0,
  warning: 1,
  not_configured: 2,
  unknown: 3,
  awaiting_data: 4,
  ok: 5
}

const sortSignalsForDisplay = (signals: ReliabilitySignal[]): ReliabilitySignal[] =>
  [...signals].sort((a, b) => SIGNAL_SEVERITY_RANK[a.severity] - SIGNAL_SEVERITY_RANK[b.severity])

interface ReliabilityOverviewSources {
  billing?: GcpBillingOverview | null
  vercelBilling?: VercelBillingOverview | null
  githubBilling?: GitHubBillingOverview | null
  notionOperational?: NotionSyncOperationalOverview | null
  syntheticSnapshots?: SyntheticRouteSnapshot[] | null
  financeSmokeLane?: FinanceSmokeLaneStatus | null

  /**
   * TASK-635: módulos efectivos resueltos para el tenant. Cuando se pasa,
   * el composer itera sobre este array (DB defaults + overlay overrides);
   * cuando es null/undefined, cae al `STATIC_RELIABILITY_REGISTRY` para
   * mantener compatibilidad pre-635.
   */
  modules?: ReliabilityModuleDefinition[] | null

  /**
   * TASK-638: AI Observer observations. Opt-in para evitar feedback loop
   * con el runner — cuando este source es undefined, NO se inyectan signals
   * `ai_summary`. El runner pasa `aiObservations: null` explícitamente para
   * pedir al composer "no inyectes" (signal de intención clara). El consumer
   * de UI (Admin Center) pasa las observations leídas desde la DB.
   */
  aiObservations?: {
    overview: AiObservation | null
    byModule: Record<string, AiObservation>
  } | null

  /**
   * Per-module Sentry incident snapshots, keyed by `moduleKey`. Populated by
   * the consumer (admin reliability page / cron AI watcher) by iterating the
   * registry's `incidentDomainTag` and calling `getCloudSentryIncidents({
   * domain })` once per tag. Kept opt-in so background watchers and tests
   * don't accidentally hammer the Sentry API.
   */
  domainIncidents?: Record<string, CloudSentryIncidentsSnapshot> | null

  /**
   * TASK-765 Slice 7 — payment_order ↔ bank settlement signals. 3 readers
   * que cuentan drift / dead_letter / lag para el path payroll → expense →
   * payment_order. Cada reader degrada honestamente (kind=unknown) si la
   * query falla. El composer los inyecta en `allSignals` con resto del array.
   */
  paymentOrderSettlement?: ReliabilitySignal[] | null

  /**
   * TASK-812 — Previred/LRE compliance export artifact drift. Steady state = 0
   * latest artifacts with failed validation or entries newer than artifact.
   */
  payrollComplianceExportDrift?: ReliabilitySignal | null
  payrollContractorDoubleRailOverlap?: ReliabilitySignal | null
  payrollDeelMemberWithoutContractId?: ReliabilitySignal | null
  finalSettlementPdfStatusDrift?: ReliabilitySignal | null

  /**
   * TASK-900 Slice 6 — ICO Materializer skipped_safety signal. Cuenta
   * corridas del materializer ICO con `status='skipped_safety'` en
   * ventana 24h. Roll up bajo moduleKey='delivery'. Steady state = 0
   * (gate canonical confía en upstream). Severity warning > 0, error > 5
   * en 24h. Complementario a `identity.notion_bridge.coverage_drift` —
   * cuando el gate alerta es porque protegió data buena downstream del
   * bug class TASK-877.
   */
  icoMaterializerSkippedSafety?: ReliabilitySignal | null
  nexaInsightsFreshness?: ReliabilitySignal | null

  /**
   * TASK-943 Slice 5 — Nexa Insights heartbeat (`no_new_signals_in_24h`).
   * Post-TASK-943 el materializer es append-only; un cron caído ya no
   * "borra" la última corrida — se vuelve silente. Este signal cierra la
   * pérdida de observabilidad que daba DELETE+INSERT, midiendo edad de la
   * última `generated_at` en `ai_signals_current`. Severity warning >24h,
   * error >48h, unknown si sin signals. Subsystem rollup 'delivery'.
   */
  nexaInsightsNoNewSignals?: ReliabilitySignal | null
  nexaTurnDegradedOutcomes?: ReliabilitySignal | null

  /**
   * TASK-908 Slice 3.5 — Notion correction transitions source availability.
   * % de tareas completadas en 90d sin rows en `task_status_transitions`.
   * Pre-TASK-908b deployment: severity=error 100% esperado. Post-deployment +
   * backfill verde: < 10% steady state. Roll up bajo moduleKey='delivery'.
   */
  notionCorrectionTransitionsSourceAvailability?: ReliabilitySignal | null

  /**
   * TASK-923 (M1) — shadow paridad del clasificador OTD GH-owned vs synced
   * Notion. Steady: paridad alta (mismatch ~0%). Roll up moduleKey='delivery'.
   */
  notionMetricsOtdClassifierParity?: ReliabilitySignal | null

  /**
   * TASK-893 Slice 5 — Payroll Participation Window signals (3 readers):
   * full_month_entry_drift + source_date_disagreement + projection_delta_anomaly.
   * Subsystem rollup `Finance Data Quality` via moduleKey='finance'. Cada
   * reader degrada honestamente (severity=unknown) si su query falla. El
   * monitor projection_delta_anomaly ships V1.0 con severity=unknown
   * (shadow compare wiring es V1.1 follow-up).
   */
  payrollParticipationWindow?: ReliabilitySignal[] | null

  /**
   * TASK-895 V1.1a Slice 3 — Leave Accrual Participation-Aware signals.
   * Single signal V1.1a (`hr.leave.accrual_overshoot_drift`) detectando shape
   * del bug class CL Art 67 CT (sobreacumulación contractor→dependent).
   * Subsystem rollup `Payroll Data Quality` (moduleKey='payroll') unificado
   * con TASK-893. Reader degrada honestamente (severity=unknown) si la query
   * falla. Steady state esperado = 0 post-flag-ON + re-seed.
   */
  leaveAccrual?: ReliabilitySignal[] | null

  /**
   * TASK-894 — Payroll contract taxonomy guardrails for the sixth canonical
   * contract type (`international_internal`). Observation-only readers:
   * tuple drift, invalid statutory application and legacy receipt fallback.
   */
  payrollContractTaxonomy?: ReliabilitySignal[] | null

  /**
   * TASK-766 Slice 2 — Finance CLP currency drift signals. 2 readers que
   * cuentan expense_payments / income_payments con currency!='CLP' y
   * amount_clp IS NULL (drift detectado por la VIEW *_normalized via flag
   * has_clp_drift). Cada reader degrada honestamente (kind=unknown) si la
   * query falla. Steady state esperado = 0; cualquier valor > 0 indica una
   * fila legacy pendiente del repair endpoint
   * `POST /api/admin/finance/payments-clp-repair` (slice 5).
   */
  financeClpDrift?: ReliabilitySignal[] | null

  /**
   * TASK-771 Slice 4 — Provider BQ sync dead-letter signal. Cuenta entries en
   * outbox_reactive_log para handler `provider_bq_sync:provider.upserted` que
   * llegaron a dead-letter (la projection canónica que sincroniza
   * greenhouse_core.providers PG → greenhouse.providers BQ). Steady state
   * esperado = 0; >0 indica drift PG↔BQ activo (AI Tooling y consumers BQ
   * verán datos stale hasta resolver). Mismo patrón que paymentOrderSettlement.
   */
  providerBqSyncDeadLetter?: ReliabilitySignal[] | null
  hubspotCompaniesIntakeDeadLetter?: ReliabilitySignal | null
  workforceUnlinkedInternalUsers?: ReliabilitySignal | null

  /** TASK-1082 — Knowledge ingestion signals (quarantine count + failed sync source). */
  knowledgeQuarantineCount?: ReliabilitySignal | null
  knowledgeSyncFailedSource?: ReliabilitySignal | null
  knowledgeNotionIngestDeadLetter?: ReliabilitySignal | null
  /** TASK-1085 — Nexa knowledge retrieval signals (no-source rate + stale-source). */
  nexaKnowledgeRetrieval?: ReliabilitySignal[] | null

  /**
   * TASK-773 Slice 4 — Outbox publisher health. 2 readers:
   *   - sync.outbox.unpublished_lag (events pending/failed > 10 min)
   *   - sync.outbox.dead_letter (events agotaron retries, requieren humano)
   * Steady state = 0 ambos. Si > 0, el event bus está roto y NINGUNA projection
   * corre — toda actualización async finance queda colgada (root cause del
   * incidente Figma 2026-05-03 cuando Vercel cron no corría en staging).
   */
  outboxHealth?: ReliabilitySignal[] | null

  /**
   * TASK-408 Slice 4 — Email render/template safety net:
   *   - notifications.email.render_failure_rate
   * Steady state = 0. Cuenta fallas de render/template en
   * email_deliveries + outbox_reactive_log para projections con side effect
   * email. Protege el sweep de copy sin tocar delivery ni templates.
   */
  emailRenderFailure?: ReliabilitySignal | null

  /**
   * TASK-775 Slice 5 — Cron staging drift signal:
   *   - platform.cron.staging_drift (Vercel async-critical sin Cloud Scheduler)
   * Steady state = 0. Si > 0, hay crons que no corren en staging (Vercel
   * custom environments NO ejecutan crons). Detecta la clase de bugs invisibles
   * que motivó TASK-773 y TASK-775.
   */
  cronStagingDrift?: ReliabilitySignal | null

  /**
   * TASK-774 Slice 4 — Account balances FX drift signal:
   *   - finance.account_balances.fx_drift (closing_balance vs recompute desde
   *     VIEWs canónicas TASK-766)
   * Steady state = 0. Si > 0, materializer corrió antes del fix TASK-774
   * o emerge nuevo callsite con anti-patrón SUM(payment.amount) sin _clp.
   * Bug Figma EXP-202604-008 (2026-05-03).
   */
  accountBalancesFxDrift?: ReliabilitySignal | null

  /**
   * TASK-929 Slice 3 — Unresolved finance ledger drift items (settlement
   * has_drift + unanchored paid expenses). Steady=0. Always-on dashboard metric
   * complementing the daily ledger-health cron.
   */
  ledgerUnresolvedDriftItems?: ReliabilitySignal | null

  /** TASK-990 Slice 4 — Nubox export RFC sin organización (disposición pendiente). */
  nuboxExportOrphanRfc?: ReliabilitySignal | null

  /** TASK-990 Slice 6 — payment order con currency distinta a sus obligations. */
  paymentOrderMixedCurrency?: ReliabilitySignal | null

  /** TASK-990 Slice 7 — pago no-CLP con resultado cambiario sin clasificar. */
  fxGainLossUnclassified?: ReliabilitySignal | null

  /** TASK-990 Slice 8 — multi-currency / FX rollout signals (5). */
  mxnRateFreshness?: ReliabilitySignal | null
  fxSnapshotMissing?: ReliabilitySignal | null
  nuboxExportForeignAmountMissing?: ReliabilitySignal | null
  multiCurrencyNativeEquivalentDrift?: ReliabilitySignal | null
  cashSignalUnsupportedCurrency?: ReliabilitySignal | null

  /**
   * TASK-793 Slice 3 — Contractor payable → Finance bridge signals (lag +
   * dead-letter). Single signals; degradan honestamente a null si la query falla.
   */
  contractorPayableReadyWithoutObligation?: ReliabilitySignal | null
  contractorPayableBridgeDeadLetter?: ReliabilitySignal | null
  contractorRemittanceEmailDeadLetter?: ReliabilitySignal | null
  /** TASK-795 Fase A — international boundary block signals (tax review + FX). */
  contractorPayableTaxReviewOverdue?: ReliabilitySignal | null
  contractorPayableFxUnresolvedOverdue?: ReliabilitySignal | null
  /** TASK-968 — payables blocked by the agreed-amount guardrail (no override). */
  contractorPayableExceedsAgreedAmount?: ReliabilitySignal | null
  /** TASK-977 — committed payables without a materialized expense (settlement precondition). */
  contractorPayableExpenseUnmaterialized?: ReliabilitySignal | null
  contractorPayablePaymentSlaOverdue?: ReliabilitySignal | null
  contractingAiDraftFailed?: ReliabilitySignal | null
  contractingValidationBlockedOverdue?: ReliabilitySignal | null
  contractingApprovedWithoutPdf?: ReliabilitySignal | null
  /** TASK-1023 — stale PDF watermark vs current case status. */
  contractingPdfStatusDrift?: ReliabilitySignal | null
  /** TASK-1024 — signature completed/failed but the contracting case never advanced. */
  contractingSignatureDesync?: ReliabilitySignal | null
  /** TASK-490 — signature orchestration signals (moduleKey 'documents'). */
  signaturePendingOverdue?: ReliabilitySignal | null
  signatureFailed?: ReliabilitySignal | null
  signatureSignedArtifactMissing?: ReliabilitySignal | null
  /** TASK-979 — un-batched overdue contractor obligations (monthly run coverage gap). */
  contractorPayableUnbatchedOverdue?: ReliabilitySignal | null

  /**
   * TASK-777 Slice 3 — Expense distribution management-accounting gates.
   * Protege P&L/overhead: cuenta expenses sin lane canónico y filas que el
   * pool legacy tomaría como overhead aunque son payroll provider, regulatorio
   * o costos financieros. Steady state = 0 antes de cerrar períodos.
   */
  expenseDistribution?: ReliabilitySignal[] | null

  /**
   * TASK-780 Phase 3 — Home rollout drift signal:
   *   - home.rollout.drift (PG flag vs env fallback divergence + opt-out rate)
   * Steady state = 0. Si > 0, divergencia entre la flag PG canónica y la env
   * var fallback (riesgo de variantes inconsistentes durante PG outages), o
   * opt-out rate > 5% (regresión UX en V2 que empuja a usuarios a legacy).
   */
  homeRolloutDrift?: ReliabilitySignal | null

  /**
   * TASK-553 Slice 4 — Quick Access Shortcuts catalog drift signal:
   *   - home.shortcuts.invalid_pins (distinct shortcut_keys pinned that are no
   *     longer in the canonical catalog).
   * Steady state = 0. Severity `warning` if > 0 (UI is unaffected — pins are
   * filtered at read time — but signals catalog retirement drift to ops).
   */
  shortcutsInvalidPins?: ReliabilitySignal | null

  /**
   * TASK-784 Slice 7 — Person Legal Profile signals (4):
   *   - identity.legal_profile.pending_review_overdue (drift, warning)
   *   - identity.legal_profile.payroll_chile_blocking_finiquito (data_quality, error)
   *   - identity.legal_profile.reveal_anomaly_rate (drift, warning|error)
   *   - identity.legal_profile.evidence_orphan (data_quality, error)
   * Roll up bajo moduleKey 'identity'.
   */
  identityLegalProfile?: ReliabilitySignal[] | null

  /**
   * TASK-785 Slice 7 — Workforce role title governance signals (2):
   *   - workforce.role_title.drift_with_entra (drift, warning)
   *   - workforce.role_title.unresolved_drift_overdue (drift, error)
   * Roll up bajo moduleKey 'identity'.
   */
  workforceRoleTitle?: ReliabilitySignal[] | null

  /**
   * TASK-839 — Admin Center entitlement governance signals (2):
   *   - identity.governance.audit_log_write_failures (drift, error)
   *   - identity.governance.pending_approval_overdue (drift, warning)
   * Roll up bajo moduleKey 'identity'.
   */
  identityGovernance?: ReliabilitySignal[] | null
  sisterPlatformOAuth?: ReliabilitySignal[] | null

  /**
   * TASK-611 Slice 5 — Organization Workspace projection signals (2):
   *   - identity.workspace_projection.facet_view_drift (drift, warning)
   *   - identity.workspace_projection.unresolved_relations (data_quality, error)
   * Roll up bajo moduleKey 'identity'.
   */
  workspaceProjection?: ReliabilitySignal[] | null
  organizationBrandAssets?: ReliabilitySignal[] | null
  scimWorkforce?: ReliabilitySignal[] | null

  /**
   * ISSUE-075 hardening — Microsoft Graph webhook subscription health.
   * Single signal:
   *   - identity.entra.webhook_subscription_health (drift, escalates with expiry proximity)
   *
   * Detecta proactivamente cuando la Entra subscription se acerca a su expiry
   * o ya expiró, en lugar de esperar al Sentry alert del cron renew failing.
   * Roll up bajo moduleKey 'identity'.
   */
  entraWebhookSubscriptionHealth?: ReliabilitySignal | null

  /**
   * TASK-827 Slice 8 — Client portal resolver failure rate.
   * Single signal:
   *   - client_portal.composition.resolver_failure_rate (drift)
   *
   * V1.0 scaffold (returns `unknown` — telemetry adapter pending TASK-829 V1.1).
   * Roll up bajo moduleKey 'identity' temporal (D7 decision); TASK-829 migrará
   * a moduleKey 'client_portal' cuando cree el subsystem dedicado.
   */
  clientPortalResolverFailureRate?: ReliabilitySignal | null

  /**
   * TASK-613 Slice 3 — Finance Clients ↔ Organization canonical link signal:
   *   - finance.client_profile.unlinked_organizations (data_quality, warning)
   * Roll up bajo moduleKey 'finance'. Steady state = 0. Cuando > 0,
   * /finance/clients/[id] cae al legacy detail view (degradación honesta).
   */
  financeClientProfileUnlinked?: ReliabilitySignal | null

  /**
   * TASK-841 — Nubox source freshness. Detecta raw stale aunque conformed
   * y Postgres projection parezcan frescos por reprocesar snapshots viejos.
   */
  nuboxSourceFreshness?: ReliabilitySignal | null

  /**
   * Notion conformed → PG drain freshness. Escalation backstop for the FK
   * incident (JAVASCRIPT-NEXTJS-6C): surfaces if the bq_pg_drain stops
   * completing and greenhouse_delivery.* goes stale. Roll up under 'sync'.
   */
  notionConformedDrainFreshness?: ReliabilitySignal | null

  /** TASK-1009 — onboarding cases con verify_notion_flowing pendiente > 7d. */
  notionOnboardingIncomplete?: ReliabilitySignal | null

  /**
   * TASK-838 Fase 3 — Runtime guard: critical tables missing in PG.
   *   - infrastructure.critical_tables.missing (drift, error si > 0)
   * Roll up bajo moduleKey 'cloud'.
   */
  criticalTablesMissing?: ReliabilitySignal | null

  /**
   * TASK-844 Slice 5 — Cross-runtime observability anti-regresión.
   *   - observability.cloud_run.silent_failure_rate (drift, error si > 0)
   * Detecta Sentry init regression en Cloud Run services. Roll up bajo moduleKey 'cloud'.
   */
  cloudRunSilentObservability?: ReliabilitySignal | null

  /**
   * TASK-937 — AI Observer health (heartbeat).
   *   - reliability.ai_observer.unhealthy (drift)
   * Lee el heartbeat en source_sync_runs (source_system='reliability_ai_observer').
   * Detecta cron caído / kill-switch OFF / JSON truncado sostenido. Roll up
   * bajo moduleKey 'cloud'.
   */
  aiObserverUnhealthy?: ReliabilitySignal | null

  /**
   * TASK-856 Slice 3 — Secret-ref env var format drift (detección activa).
   *   - secrets.env_ref_format_drift (drift, error si > 0)
   * Detecta env vars `*_SECRET_REF` con shape no canónico (quotes, `\n` literal,
   * whitespace, paths malformados). Steady=0. Roll up bajo moduleKey 'cloud'.
   */
  secretsEnvRefFormatDrift?: ReliabilitySignal | null

  /**
   * TASK-845 Slice 6 — PostgreSQL connection saturation data-driven trigger.
   *   - runtime.postgres.connection_saturation (runtime, warning > 60%, error > 80%)
   * Es la señal data-driven que dispara V2 deployment del PgBouncer multiplexer
   * (TASK-846 contingente). Roll up bajo moduleKey 'cloud'.
   */
  postgresConnectionSaturation?: ReliabilitySignal | null

  /**
   * TASK-813 Slice 6 — Commercial engagement instance (HubSpot p_services 0-162) signals (3):
   *   - commercial.service_engagement.sync_lag (lag, warning)
   *   - commercial.service_engagement.organization_unresolved (drift, error)
   *   - commercial.service_engagement.legacy_residual_reads (drift, error)
   * Roll up bajo moduleKey 'commercial'. TASK-807 formaliza el subsystem.
   */
  servicesEngagement?: ReliabilitySignal[] | null

  /**
   * TASK-807 — Commercial Health signals (6):
   *   - commercial.engagement.overdue_decision
   *   - commercial.engagement.budget_overrun
   *   - commercial.engagement.zombie
   *   - commercial.engagement.unapproved_active
   *   - commercial.engagement.conversion_rate_drop
   *   - commercial.engagement.stale_progress (delivered in TASK-805, reused)
   * Roll up bajo moduleKey 'commercial'.
   */
  commercialHealth?: ReliabilitySignal[] | null

  /**
   * TASK-848 Slice 7 — Production Release Control Plane signals (V1, 2 of 4):
   *   - platform.release.stale_approval (drift)
   *   - platform.release.pending_without_jobs (drift)
   * Roll up bajo moduleKey 'platform'. V1.1 agregara deploy_duration_p95 + last_status
   * cuando exista release_manifests data populated.
   */
  productionRelease?: ReliabilitySignal[] | null

  /**
   * TASK-910 Slice 4 — Notion Demo Teamspace Sandbox signals (6 canonical):
   *   - notion.metrics.shadow_paridad_rpa_demo (drift)
   *   - notion.metrics.echo_loop_detected_demo (drift)
   *   - notion.metrics.webhook_signature_failures_demo (drift)
   *   - notion.metrics.writeback_dead_letter_demo (drift, deferred TASK-913)
   *   - notion.metrics.demo_teamspace_drift (drift)
   *   - payroll.bonus.demo_member_contamination (drift, ERROR si > 0 — CRITICAL
   *     defense in depth canonical anti-regresión bonus guardrail Slice 5)
   * Roll up: primer 5 bajo moduleKey 'delivery', último bajo moduleKey 'payroll'.
   * Sub-rollup conceptual `Notion Metrics Migration` (demo gate canonical
   * pre-Fase 1 RpA pilot Efeonce).
   */
  notionMetricsDemo?: ReliabilitySignal[] | null

  /**
   * TASK-912 — Notion status-transitions productive capture signals (Efeonce/Sky).
   *   - notion.task_status_transitions.ingestion_lag (lag)
   *   - notion.task_status_transitions.refetch_failed (dead_letter)
   *   - notion.task_status_transitions.bq_sync_lag (lag, TASK-912 Slice 3)
   * Roll up bajo moduleKey 'delivery'. Pre-activación (flag OFF) reportan steady.
   */
  notionStatusTransitions?: ReliabilitySignal[] | null
  notionMetricsReschedule?: ReliabilitySignal[] | null
  attributableLateness?: ReliabilitySignal[] | null

  /**
   * TASK-916 — Notion RpA V2 productive writeback signals (Efeonce/Sky).
   *   - notion.metrics.writeback_dead_letter (drift)
   *   - notion.metrics.writeback_lag (lag)
   * Roll up bajo moduleKey 'delivery'. Pre-flip (NOTION_RPA_WRITEBACK_ENABLED
   * OFF) reportan steady (writeback skipea sin tocar attempt_count).
   */
  notionMetricsRpa?: ReliabilitySignal[] | null

  /**
   * TASK-903 — FTR writeback signals (Efeonce/Sky). Roll up bajo moduleKey
   * 'delivery'. Pre-flip (NOTION_FTR_WRITEBACK_ENABLED OFF) reportan steady
   * (writeback skipea sin tocar attempt_count).
   */
  notionMetricsFtr?: ReliabilitySignal[] | null
}

export const buildReliabilityOverview = (
  operations: OperationsOverview,
  sources: ReliabilityOverviewSources = {}
): ReliabilityOverview => {
  const syntheticSnapshots = sources.syntheticSnapshots ?? []

  const effectiveModules = sources.modules && sources.modules.length > 0
    ? sources.modules
    : RELIABILITY_REGISTRY

  const allSignals: ReliabilitySignal[] = [
    ...buildSubsystemSignals(operations.subsystems),
    ...buildCloudSignals(operations.cloud),
    ...buildSentryIncidentSignals(operations.cloud.observability.incidents),
    buildObservabilityPostureSignal(operations.cloud.observability.posture),
    ...buildNotionDataQualitySignals(operations.notionDeliveryDataQuality ?? null),
    ...(sources.billing ? buildGcpBillingSignals(sources.billing) : []),
    ...(sources.vercelBilling ? buildVercelBillingSignals(sources.vercelBilling) : []),
    ...(sources.githubBilling ? buildGitHubBillingSignals(sources.githubBilling) : []),
    ...(sources.notionOperational ? [buildNotionFreshnessSignal(sources.notionOperational)] : []),
    ...buildSyntheticRouteSignals(syntheticSnapshots),
    ...buildSyntheticModuleSignals(syntheticSnapshots),
    ...(sources.financeSmokeLane ? buildFinanceSmokeLaneSignals(sources.financeSmokeLane) : []),
    // TASK-2026-04-26 — per-module incident signals via Sentry domain tag.
    // Iterates the registry's `incidentDomainTag` entries and projects one
    // `incident` signal per module from the domain-filtered Sentry feed.
    // Closes the `expectedSignalKinds: ['incident']` gap for finance,
    // delivery, integrations.notion (cloud already had a global signal).
    ...(sources.domainIncidents ? buildDomainIncidentSignals(sources.domainIncidents) : []),
    ...(sources.aiObservations ? buildAiSummarySignals(sources.aiObservations.byModule) : []),
    // TASK-765 Slice 7 — payment_order ↔ bank settlement signals (drift /
    // dead_letter / lag). Inyectadas pre-fetched desde getReliabilityOverview
    // para mantener buildReliabilityOverview sincrónico.
    ...(sources.paymentOrderSettlement ?? []),
    // TASK-812 — Previred/LRE artifact registry drift.
    ...(sources.payrollComplianceExportDrift ? [sources.payrollComplianceExportDrift] : []),
    // TASK-863 V1.5.2 — Final settlement PDF status drift (DB document_status vs
    // PDF asset metadata.documentStatusAtRender). Defense-in-depth para detectar
    // regen failure o transition agregada al state machine sin pasar por el helper.
    ...(sources.payrollContractorDoubleRailOverlap ? [sources.payrollContractorDoubleRailOverlap] : []),
    ...(sources.payrollDeelMemberWithoutContractId ? [sources.payrollDeelMemberWithoutContractId] : []),
    ...(sources.finalSettlementPdfStatusDrift ? [sources.finalSettlementPdfStatusDrift] : []),
    // TASK-900 Slice 6 — ICO Materializer skipped_safety signal. Roll up bajo
    // moduleKey='delivery'. Visibiliza cuando el freshness gate del materializer
    // ICO está protegiendo data buena del bug class TASK-877 (upstream bridge
    // Notion→member regresión silente). Steady=0.
    ...(sources.icoMaterializerSkippedSafety ? [sources.icoMaterializerSkippedSafety] : []),
    ...(sources.nexaInsightsFreshness ? [sources.nexaInsightsFreshness] : []),
    // TASK-943 Slice 5 — Nexa Insights heartbeat. Post append-only el cron caído
    // ya no "borra" la última corrida; este signal mide edad de la última
    // generation. Complementario a nexaInsightsFreshness (que cruza BQ vs PG
    // serving) + icoMaterializerSkippedSafety (que detecta gate active).
    ...(sources.nexaInsightsNoNewSignals ? [sources.nexaInsightsNoNewSignals] : []),
    ...(sources.nexaTurnDegradedOutcomes ? [sources.nexaTurnDegradedOutcomes] : []),
    // TASK-908 Slice 3.5 — Notion correction transitions source availability.
    // Pre-TASK-908b deployment: 100% unavailable esperado (tabla vacía).
    // Post-deployment + backfill: < 10% steady state. Visibiliza coverage del
    // foundation que sustenta calculateRpa (TASK-901) + calculateFtr (TASK-909).
    ...(sources.notionCorrectionTransitionsSourceAvailability
      ? [sources.notionCorrectionTransitionsSourceAvailability]
      : []),
    // TASK-923 (M1) — shadow paridad clasificador OTD GH vs Notion synced.
    ...(sources.notionMetricsOtdClassifierParity
      ? [sources.notionMetricsOtdClassifierParity]
      : []),
    // TASK-893 Slice 5 — Payroll Participation Window signals (3 readers).
    // Subsystem rollup Finance Data Quality via moduleKey='finance'. Each
    // reader degrades honestly (severity=unknown) on query failure. The
    // monitor projection_delta_anomaly ships V1.0 with severity=unknown
    // (shadow compare wiring is V1.1 follow-up).
    ...(sources.payrollParticipationWindow ?? []),
    ...(sources.leaveAccrual ?? []),
    // TASK-894 — Payroll contract taxonomy signals.
    ...(sources.payrollContractTaxonomy ?? []),
    // TASK-766 Slice 2 — Finance CLP currency drift signals (expense + income).
    ...(sources.financeClpDrift ?? []),
    // TASK-771 Slice 4 — Provider BQ sync dead-letter signal (drift PG↔BQ).
    ...(sources.providerBqSyncDeadLetter ?? []),
    // TASK-878 Slice 2 — HubSpot companies intake dead-letter (async webhook path).
    ...(sources.hubspotCompaniesIntakeDeadLetter ? [sources.hubspotCompaniesIntakeDeadLetter] : []),
    // TASK-878 follow-up — Identity UX hardening: internal users sin member enlazado.
    ...(sources.workforceUnlinkedInternalUsers ? [sources.workforceUnlinkedInternalUsers] : []),
    // TASK-1082 — Knowledge ingestion: quarantine count + failed sync source.
    ...(sources.knowledgeQuarantineCount ? [sources.knowledgeQuarantineCount] : []),
    ...(sources.knowledgeSyncFailedSource ? [sources.knowledgeSyncFailedSource] : []),
    ...(sources.knowledgeNotionIngestDeadLetter ? [sources.knowledgeNotionIngestDeadLetter] : []),
    // TASK-1085 — Nexa knowledge retrieval observability (no-source rate + stale-source).
    ...(sources.nexaKnowledgeRetrieval ?? []),
    // TASK-773 Slice 4 — Outbox publisher health (lag + dead_letter).
    ...(sources.outboxHealth ?? []),
    // TASK-408 Slice 4 — Email render/template safety net.
    ...(sources.emailRenderFailure ? [sources.emailRenderFailure] : []),
    // TASK-775 Slice 5 — Vercel ↔ Cloud Scheduler drift (async-critical crons).
    ...(sources.cronStagingDrift ? [sources.cronStagingDrift] : []),
    // TASK-774 Slice 4 — Account balances FX drift (closing_balance vs recompute).
    ...(sources.accountBalancesFxDrift ? [sources.accountBalancesFxDrift] : []),
    ...(sources.ledgerUnresolvedDriftItems ? [sources.ledgerUnresolvedDriftItems] : []),
    ...(sources.nuboxExportOrphanRfc ? [sources.nuboxExportOrphanRfc] : []),
    ...(sources.paymentOrderMixedCurrency ? [sources.paymentOrderMixedCurrency] : []),
    ...(sources.fxGainLossUnclassified ? [sources.fxGainLossUnclassified] : []),
    ...(sources.mxnRateFreshness ? [sources.mxnRateFreshness] : []),
    ...(sources.fxSnapshotMissing ? [sources.fxSnapshotMissing] : []),
    ...(sources.nuboxExportForeignAmountMissing ? [sources.nuboxExportForeignAmountMissing] : []),
    ...(sources.multiCurrencyNativeEquivalentDrift ? [sources.multiCurrencyNativeEquivalentDrift] : []),
    ...(sources.cashSignalUnsupportedCurrency ? [sources.cashSignalUnsupportedCurrency] : []),
    // TASK-793 Slice 3 — contractor payable → Finance bridge (lag + dead-letter).
    ...(sources.contractorPayableReadyWithoutObligation
      ? [sources.contractorPayableReadyWithoutObligation]
      : []),
    ...(sources.contractorPayableBridgeDeadLetter ? [sources.contractorPayableBridgeDeadLetter] : []),
    ...(sources.contractorRemittanceEmailDeadLetter ? [sources.contractorRemittanceEmailDeadLetter] : []),
    // TASK-795 Fase A — international boundary block signals (tax review + FX).
    ...(sources.contractorPayableTaxReviewOverdue ? [sources.contractorPayableTaxReviewOverdue] : []),
    ...(sources.contractorPayableFxUnresolvedOverdue
      ? [sources.contractorPayableFxUnresolvedOverdue]
      : []),
    // TASK-968 — payables blocked by the agreed-amount guardrail (no override).
    ...(sources.contractorPayableExceedsAgreedAmount
      ? [sources.contractorPayableExceedsAgreedAmount]
      : []),
    // TASK-977 — committed payables without a materialized expense (settlement precondition).
    ...(sources.contractorPayableExpenseUnmaterialized
      ? [sources.contractorPayableExpenseUnmaterialized]
      : []),
    ...(sources.contractorPayablePaymentSlaOverdue ? [sources.contractorPayablePaymentSlaOverdue] : []),
    // TASK-1019 — Workforce Contracting signals (moduleKey 'workforce').
    ...(sources.contractingAiDraftFailed ? [sources.contractingAiDraftFailed] : []),
    ...(sources.contractingValidationBlockedOverdue ? [sources.contractingValidationBlockedOverdue] : []),
    ...(sources.contractingApprovedWithoutPdf ? [sources.contractingApprovedWithoutPdf] : []),
    ...(sources.contractingPdfStatusDrift ? [sources.contractingPdfStatusDrift] : []), // TASK-1023 (was resolved+packed but not surfaced)
    ...(sources.contractingSignatureDesync ? [sources.contractingSignatureDesync] : []), // TASK-1024
    // TASK-490 — Signature orchestration signals (moduleKey 'documents').
    ...(sources.signaturePendingOverdue ? [sources.signaturePendingOverdue] : []),
    ...(sources.signatureFailed ? [sources.signatureFailed] : []),
    ...(sources.signatureSignedArtifactMissing ? [sources.signatureSignedArtifactMissing] : []),
    ...(sources.contractorPayableUnbatchedOverdue ? [sources.contractorPayableUnbatchedOverdue] : []),
    // TASK-777 Slice 3 — Expense distribution gates.
    ...(sources.expenseDistribution ?? []),
    // TASK-780 Phase 3 — Home rollout drift (PG flag vs env + opt-out rate).
    ...(sources.homeRolloutDrift ? [sources.homeRolloutDrift] : []),
    // TASK-553 Slice 4 — Quick Access Shortcuts catalog drift.
    ...(sources.shortcutsInvalidPins ? [sources.shortcutsInvalidPins] : []),
    // TASK-784 Slice 7 — Identity legal profile signals (4).
    ...(sources.identityLegalProfile ?? []),
    // TASK-785 Slice 7 — Workforce role title governance signals (2).
    ...(sources.workforceRoleTitle ?? []),
    // TASK-839 — Admin Center entitlement governance signals (2).
    ...(sources.identityGovernance ?? []),
    // TASK-948 — Sister-platform OAuth broker signals (exchange failures,
    // redirect rejects, stale client config). Roll up bajo identity.
    ...(sources.sisterPlatformOAuth ?? []),
    // TASK-611 Slice 5 — Organization Workspace projection signals (2).
    ...(sources.workspaceProjection ?? []),
    // TASK-999 — Organization brand asset coverage + discovery failures.
    ...(sources.organizationBrandAssets ?? []),
    // TASK-872 Slice 6 — SCIM Internal Collaborator + workforce intake signals (6).
    ...(sources.scimWorkforce ?? []),
    // ISSUE-075 hardening — Microsoft Graph webhook subscription health.
    ...(sources.entraWebhookSubscriptionHealth ? [sources.entraWebhookSubscriptionHealth] : []),
    // TASK-827 Slice 8 — Client portal resolver failure rate (V1.0 scaffold).
    ...(sources.clientPortalResolverFailureRate ? [sources.clientPortalResolverFailureRate] : []),
    // TASK-613 Slice 3 — Finance Clients ↔ Organization canonical link signal.
    ...(sources.financeClientProfileUnlinked ? [sources.financeClientProfileUnlinked] : []),
    // TASK-841 — Nubox raw/conformed/projection freshness.
    ...(sources.nuboxSourceFreshness ? [sources.nuboxSourceFreshness] : []),
    // Notion conformed → PG drain freshness (FK incident escalation backstop).
    ...(sources.notionConformedDrainFreshness ? [sources.notionConformedDrainFreshness] : []),
    // TASK-1009 — onboarding Notion sin fluir al portal.
    ...(sources.notionOnboardingIncomplete ? [sources.notionOnboardingIncomplete] : []),
    // TASK-838 Fase 3 — Runtime guard: critical tables missing in PG.
    ...(sources.criticalTablesMissing ? [sources.criticalTablesMissing] : []),
    // TASK-844 Slice 5 — Cross-runtime observability anti-regresión.
    ...(sources.cloudRunSilentObservability ? [sources.cloudRunSilentObservability] : []),
    // TASK-937 — AI Observer health (heartbeat-based liveness).
    ...(sources.aiObserverUnhealthy ? [sources.aiObserverUnhealthy] : []),
    // TASK-856 Slice 3 — Secret-ref env var format drift (active upstream detection).
    ...(sources.secretsEnvRefFormatDrift ? [sources.secretsEnvRefFormatDrift] : []),
    // TASK-845 Slice 6 — PG connection saturation (data-driven V2 trigger).
    ...(sources.postgresConnectionSaturation ? [sources.postgresConnectionSaturation] : []),
    // TASK-813 Slice 6 — Commercial engagement instance signals (3).
    ...(sources.servicesEngagement ?? []),
    // TASK-807 — Commercial Health signals (six Sample Sprints health gates).
    ...(sources.commercialHealth ?? []),
    // TASK-848 Slice 7 — Production Release Control Plane signals (2 of 4 V1).
    ...(sources.productionRelease ?? []),
    // TASK-910 Slice 4 — Notion Demo Teamspace Sandbox signals (6 canonical).
    // 5 bajo moduleKey 'delivery' + 1 CRITICAL bajo moduleKey 'payroll'.
    ...(sources.notionMetricsDemo ?? []),
    // TASK-912 — Notion status-transitions productive capture signals.
    ...(sources.notionStatusTransitions ?? []),
    // TASK-916 — Notion RpA V2 productive writeback signals (2).
    ...(sources.notionMetricsRpa ?? []),
    ...(sources.notionMetricsFtr ?? []),
    // TASK-921 — Reschedule (due-date change) capture signals (2).
    ...(sources.notionMetricsReschedule ?? []),
    // TASK-922 — Attributable lateness shadow signals (2).
    ...(sources.attributableLateness ?? [])
  ]

  const signalsByModule = new Map<string, ReliabilitySignal[]>()

  for (const signal of allSignals) {
    const list = signalsByModule.get(signal.moduleKey) ?? []

    list.push(signal)
    signalsByModule.set(signal.moduleKey, list)
  }

  const modules: ReliabilityModuleSnapshot[] = effectiveModules.map(definition => {
    const signals = sortSignalsForDisplay(signalsByModule.get(definition.moduleKey) ?? [])

    const observedKinds = new Set(signals.map(signal => signal.kind))
    const missing = definition.expectedSignalKinds.filter(kind => !observedKinds.has(kind))

    const status = aggregateModuleStatus(signals)
    const signalCounts = buildSignalCounts(signals)

    const concreteCount = signals.filter(signal => isConcreteSeverity(signal.severity)).length

    const confidence = computeConfidence(
      Math.max(definition.expectedSignalKinds.length, 1),
      observedKinds.size,
      concreteCount
    )

    return {
      moduleKey: definition.moduleKey,
      label: definition.label,
      description: definition.description,
      domain: definition.domain,
      status,
      confidence,
      summary: buildSummary(status, signalCounts, missing),
      routes: definition.routes,
      apis: definition.apis,
      dependencies: definition.dependencies,
      smokeTests: definition.smokeTests,
      signals,
      signalCounts,
      expectedSignalKinds: definition.expectedSignalKinds,
      missingSignalKinds: missing
    }
  })

  const totals = modules.reduce(
    (acc, module) => {
      acc.totalModules += 1

      if (module.status === 'ok') acc.healthy += 1
      else if (module.status === 'warning') acc.warning += 1
      else if (module.status === 'error') acc.error += 1
      else acc.unknownOrPending += 1

      return acc
    },
    { totalModules: 0, healthy: 0, warning: 0, error: 0, unknownOrPending: 0 }
  )

  const notes: string[] = []

  if (totals.unknownOrPending > 0) {
    notes.push(
      `${totals.unknownOrPending} módulo${totals.unknownOrPending === 1 ? '' : 's'} sin señal concreta — revisar boundaries de TASK-586/TASK-599.`
    )
  }

  if (operations.cloud.observability.incidents.status === 'unconfigured') {
    notes.push('Sentry incident reader no configurado — `cloud.incident` queda como not_configured.')
  }

  return {
    generatedAt: new Date().toISOString(),
    modules,
    totals,
    integrationBoundaries: RELIABILITY_INTEGRATION_BOUNDARIES,
    notes
  }
}

/**
 * Reader consolidado de confiabilidad. Reusa `getOperationsOverview()` como
 * agregador operativo. Si el caller ya tiene el overview (ej: la página de
 * Admin Center), debe pasarlo para evitar el doble fetch.
 *
 * Las fuentes adicionales (`billing`, `notionOperational`) son opcionales:
 * cuando no se pasan, se hace fetch adicional con tolerancia a fallos
 * (ningún error individual rompe la lectura consolidada).
 */
export const getReliabilityOverview = async (
  preloadedOperations?: OperationsOverview,
  preloadedSources: ReliabilityOverviewSources = {},
  options: { spaceId?: string | null; includeAiObservations?: boolean } = {}
): Promise<ReliabilityOverview> => {
  const operations = preloadedOperations ?? (await getOperationsOverview())

  const billing =
    preloadedSources.billing !== undefined
      ? preloadedSources.billing
      : await getGcpBillingOverview().catch(() => null)

  const vercelBilling =
    preloadedSources.vercelBilling !== undefined
      ? preloadedSources.vercelBilling
      : await getVercelBillingOverview().catch(() => null)

  const githubBilling =
    preloadedSources.githubBilling !== undefined
      ? preloadedSources.githubBilling
      : await getGitHubBillingOverview().catch(() => null)

  const notionOperational =
    preloadedSources.notionOperational !== undefined
      ? preloadedSources.notionOperational
      : await getNotionSyncOperationalOverview().catch(() => null)

  const syntheticSnapshots =
    preloadedSources.syntheticSnapshots !== undefined
      ? preloadedSources.syntheticSnapshots
      : await getLatestSyntheticSnapshotsByRoute().catch(() => [])

  const financeSmokeLane =
    preloadedSources.financeSmokeLane !== undefined
      ? preloadedSources.financeSmokeLane
      : await getFinanceSmokeLaneStatus().catch(() => null)

  // TASK-635: módulos efectivos resueltos por el store DB-aware. Si no se
  // pasa preloaded.modules, el store consulta DB defaults + overlay overrides
  // para `options.spaceId`. Fallback a STATIC_RELIABILITY_REGISTRY si DB falla.
  const modules: ReliabilityModuleDefinition[] | null =
    preloadedSources.modules !== undefined
      ? preloadedSources.modules
      : await getReliabilityRegistry(options.spaceId ?? null)

  /**
   * TASK-638: AI observations son opt-in. Default OFF — el runner del AI
   * Observer NO debe ver señales `ai_summary` previas (evita feedback loop).
   * El consumer de UI (Admin Center page) pasa `includeAiObservations=true`.
   * Si el caller ya pasó `aiObservations` en preloadedSources, se respeta.
   */
  const aiObservations =
    preloadedSources.aiObservations !== undefined
      ? preloadedSources.aiObservations
      : options.includeAiObservations
        ? await getLatestAiObservationsByScope().catch(() => null)
        : null

  // Per-module Sentry incidents via the `domain` tag. Iterates the registry's
  // `incidentDomainTag` entries and queries Sentry once per tag in parallel.
  // Catches per-domain to ensure a single failure doesn't poison the whole
  // overview. Skipped when caller pre-provides `domainIncidents` (admin/AI
  // observer paths that already have the data) or when there are no modules
  // declaring an incident tag.
  const domainIncidents = preloadedSources.domainIncidents !== undefined
    ? preloadedSources.domainIncidents
    : await hydrateDomainIncidents(modules ?? RELIABILITY_REGISTRY)

  // TASK-765 Slice 7 — payment_order ↔ bank settlement signals (drift /
  // dead_letter / lag). Cada reader degrada honestamente (severity=unknown)
  // si su query falla — un solo signal roto NO envenena el overview entero.
  const paymentOrderSettlement =
    preloadedSources.paymentOrderSettlement !== undefined
      ? preloadedSources.paymentOrderSettlement
      : await buildPaymentOrderSettlementSignals({
          paidWithoutExpensePayment: getPaidOrdersWithoutExpensePaymentSignal,
          deadLetter: getPaymentOrdersDeadLetterSignal,
          materializationLag: getPayrollExpenseMaterializationLagSignal
        }).catch(() => null)

  const payrollComplianceExportDrift =
    preloadedSources.payrollComplianceExportDrift !== undefined
      ? preloadedSources.payrollComplianceExportDrift
      : await getPayrollComplianceExportDriftSignal().catch(() => null)

  // TASK-957 Slice A — Contractor double-rail overlap. Corre regardless del flag
  // PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED (detector temprano). Steady=0:
  // un contractor con engagement no debe tener comp-version vigente.
  const payrollContractorDoubleRailOverlap =
    preloadedSources.payrollContractorDoubleRailOverlap !== undefined
      ? preloadedSources.payrollContractorDoubleRailOverlap
      : await getPayrollContractorDoubleRailOverlapSignal().catch(() => null)

  // TASK-958 Slice 3 — Deel member sin deel_contract_id (gap operacional). Steady=0
  // tras backfill (Melkin 'm4ye2qg' aplicado 2026-05-31).
  const payrollDeelMemberWithoutContractId =
    preloadedSources.payrollDeelMemberWithoutContractId !== undefined
      ? preloadedSources.payrollDeelMemberWithoutContractId
      : await getPayrollDeelMemberWithoutContractIdSignal().catch(() => null)

  // TASK-893 Slice 5 — Payroll Participation Window signals (3 readers).
  // Subsystem rollup `Finance Data Quality` vía moduleKey='finance' (alineado
  // con TASK-765/766/768/774 — payroll deltas son outcomes económicos, no
  // identity/access). Cada reader degrada honestamente (severity=unknown) si
  // su query falla; el monitor projection_delta_anomaly ships V1.0 con
  // severity=unknown (shadow compare wiring es V1.1 follow-up).
  const payrollParticipationWindow =
    preloadedSources.payrollParticipationWindow !== undefined
      ? preloadedSources.payrollParticipationWindow
      : await buildPayrollParticipationWindowSignals({
          fullMonthEntryDrift: getPayrollParticipationWindowFullMonthEntryDriftSignal,
          sourceDateDisagreement: getPayrollParticipationWindowSourceDateDisagreementSignal,
          projectionDeltaAnomaly: getPayrollParticipationWindowProjectionDeltaAnomalySignal
        }).catch(() => null)

  // TASK-895 V1.1a — Leave Accrual Participation-Aware signals (1 reader
  // canonical V1.1a; subsystem rollup Payroll Data Quality unified con
  // TASK-893). Reader degrada honestamente si la query falla.
  const leaveAccrual =
    preloadedSources.leaveAccrual !== undefined
      ? preloadedSources.leaveAccrual
      : await buildLeaveAccrualSignals({
          accrualOvershootDrift: getLeaveAccrualOvershootDriftSignal
        }).catch(() => null)

  const payrollContractTaxonomy =
    preloadedSources.payrollContractTaxonomy !== undefined
      ? preloadedSources.payrollContractTaxonomy
      : await buildPayrollContractTaxonomySignals({
          invalidTupleDrift: getPayrollContractTaxonomyInvalidTupleDriftSignal,
          invalidStatutoryApplication: getPayrollContractTaxonomyInvalidStatutoryApplicationSignal,
          fallbackResolutionLegacy: getPayrollContractTaxonomyFallbackResolutionLegacySignal
        }).catch(() => null)

  // TASK-863 V1.5.2 — Final settlement PDF status drift (DB vs asset metadata).
  // Detecta documentos cuyo pdf_asset_id apunta a un PDF rendereado con un
  // documentStatus distinto al actual en DB. Steady=0 post-helper canónico.
  const finalSettlementPdfStatusDrift =
    preloadedSources.finalSettlementPdfStatusDrift !== undefined
      ? preloadedSources.finalSettlementPdfStatusDrift
      : await getFinalSettlementPdfStatusDriftSignal().catch(() => null)

  // TASK-766 Slice 2 — Finance CLP currency drift signals (expense + income).
  const financeClpDrift =
    preloadedSources.financeClpDrift !== undefined
      ? preloadedSources.financeClpDrift
      : await buildFinanceClpDriftSignals({
          expensePayments: getExpensePaymentsClpDriftSignal,
          incomePayments: getIncomePaymentsClpDriftSignal
        }).catch(() => null)

  // TASK-771 Slice 4 — Provider BQ sync dead-letter signal (drift PG↔BQ).
  // Single signal pero envuelto en array para shape consistency con
  // paymentOrderSettlement / financeClpDrift. Degrada honestamente si la
  // query falla (severity=unknown) — un solo signal roto NO envenena el
  // overview entero.
  const providerBqSyncDeadLetter =
    preloadedSources.providerBqSyncDeadLetter !== undefined
      ? preloadedSources.providerBqSyncDeadLetter
      : await getProviderBqSyncDeadLetterSignal()
          .then(signal => [signal])
          .catch(() => null)

  // TASK-878 Slice 2 — HubSpot companies intake dead-letter (mirror provider_bq_sync).
  // Detecta path async caído: webhook companies emite outbox event pero la projection
  // no logra completar el sync después de N retries → operador escala bridge / secret.
  const hubspotCompaniesIntakeDeadLetter =
    preloadedSources.hubspotCompaniesIntakeDeadLetter !== undefined
      ? preloadedSources.hubspotCompaniesIntakeDeadLetter
      : await getHubspotCompaniesIntakeDeadLetterSignal().catch(() => null)

  // TASK-878 follow-up — Identity UX hardening signal.
  // Detecta usuarios internos activos sin member_id enlazado. Cuando alerta,
  // significa que un usuario interno entró pero TASK-877 reconciliación no
  // los procesó aún — están viendo banner "Tu cuenta aún no está enlazada..."
  // en todas las vistas /my hasta que HR los active vía workforce intake.
  const workforceUnlinkedInternalUsers =
    preloadedSources.workforceUnlinkedInternalUsers !== undefined
      ? preloadedSources.workforceUnlinkedInternalUsers
      : await getWorkforceUnlinkedInternalUsersSignal().catch(() => null)

  // TASK-1082 — Knowledge ingestion signals (moduleKey 'knowledge'). Degradan
  // honestamente (severity='unknown') si su query falla.
  const knowledgeQuarantineCount =
    preloadedSources.knowledgeQuarantineCount !== undefined
      ? preloadedSources.knowledgeQuarantineCount
      : await getKnowledgeQuarantineCountSignal().catch(() => null)

  const knowledgeSyncFailedSource =
    preloadedSources.knowledgeSyncFailedSource !== undefined
      ? preloadedSources.knowledgeSyncFailedSource
      : await getKnowledgeSyncFailedSourceSignal().catch(() => null)

  const knowledgeNotionIngestDeadLetter =
    preloadedSources.knowledgeNotionIngestDeadLetter !== undefined
      ? preloadedSources.knowledgeNotionIngestDeadLetter
      : await getKnowledgeNotionIngestDeadLetterSignal().catch(() => null)

  // TASK-1085 — Nexa knowledge retrieval signals (un solo scan jsonb → 2 señales).
  const nexaKnowledgeRetrieval =
    preloadedSources.nexaKnowledgeRetrieval !== undefined
      ? preloadedSources.nexaKnowledgeRetrieval
      : await getNexaKnowledgeRetrievalSignals().catch(() => null)

  // TASK-773 Slice 4 — Outbox publisher health (lag + dead_letter).
  // 2 readers en paralelo. Cada uno degrada honestamente si su query falla.
  // Critical signal: si el publisher está caído, NINGUNA projection corre.
  const outboxHealth =
    preloadedSources.outboxHealth !== undefined
      ? preloadedSources.outboxHealth
      : await Promise.all([
          getOutboxUnpublishedLagSignal().catch(() => null),
          getOutboxDeadLetterSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-408 Slice 4 — Email render/template failures. Reader propio con
  // degradacion honesta para no envenenar todo el reliability overview.
  const emailRenderFailure =
    preloadedSources.emailRenderFailure !== undefined
      ? preloadedSources.emailRenderFailure
      : await getEmailRenderFailureSignal().catch(() => null)

  // TASK-775 Slice 5 — Cron staging drift (Vercel async-critical sin Cloud
  // Scheduler equivalent). Lee vercel.json + snapshot canónico de Cloud
  // Scheduler jobs. Degrada honestamente a `unknown` si vercel.json falla.
  const cronStagingDrift =
    preloadedSources.cronStagingDrift !== undefined
      ? preloadedSources.cronStagingDrift
      : await getCronStagingDriftSignal().catch(() => null)

  // TASK-774 Slice 4 — Account balances FX drift (closing_balance vs recompute
  // desde VIEWs canonicas TASK-766). Steady=0. Degrada honestamente a `unknown`.
  const accountBalancesFxDrift =
    preloadedSources.accountBalancesFxDrift !== undefined
      ? preloadedSources.accountBalancesFxDrift
      : await getAccountBalancesFxDriftSignal().catch(() => null)

  // TASK-929 Slice 3 — Unresolved finance ledger drift items (settlement +
  // unanchored). Always-on steady-state metric. Degrada honestamente a `unknown`.
  const ledgerUnresolvedDriftItems =
    preloadedSources.ledgerUnresolvedDriftItems !== undefined
      ? preloadedSources.ledgerUnresolvedDriftItems
      : await getLedgerUnresolvedDriftItemsSignal().catch(() => null)

  const nuboxExportOrphanRfc =
    preloadedSources.nuboxExportOrphanRfc !== undefined
      ? preloadedSources.nuboxExportOrphanRfc
      : await getNuboxExportOrphanRfcSignal().catch(() => null)

  const paymentOrderMixedCurrency =
    preloadedSources.paymentOrderMixedCurrency !== undefined
      ? preloadedSources.paymentOrderMixedCurrency
      : await getPaymentOrderMixedCurrencySignal().catch(() => null)

  const fxGainLossUnclassified =
    preloadedSources.fxGainLossUnclassified !== undefined
      ? preloadedSources.fxGainLossUnclassified
      : await getFxGainLossUnclassifiedSignal().catch(() => null)

  const mxnRateFreshness =
    preloadedSources.mxnRateFreshness !== undefined
      ? preloadedSources.mxnRateFreshness
      : await getMxnRateFreshnessSignal().catch(() => null)

  const fxSnapshotMissing =
    preloadedSources.fxSnapshotMissing !== undefined
      ? preloadedSources.fxSnapshotMissing
      : await getFxSnapshotMissingSignal().catch(() => null)

  const nuboxExportForeignAmountMissing =
    preloadedSources.nuboxExportForeignAmountMissing !== undefined
      ? preloadedSources.nuboxExportForeignAmountMissing
      : await getNuboxExportForeignAmountMissingSignal().catch(() => null)

  const multiCurrencyNativeEquivalentDrift =
    preloadedSources.multiCurrencyNativeEquivalentDrift !== undefined
      ? preloadedSources.multiCurrencyNativeEquivalentDrift
      : await getNativeEquivalentDriftSignal().catch(() => null)

  const cashSignalUnsupportedCurrency =
    preloadedSources.cashSignalUnsupportedCurrency !== undefined
      ? preloadedSources.cashSignalUnsupportedCurrency
      : await getCashSignalUnsupportedCurrencySignal().catch(() => null)

  // TASK-793 Slice 3 — Contractor payable → Finance bridge (lag + dead-letter).
  // Cada reader degrada honestamente a null si su query falla — un solo signal
  // roto NO envenena el overview entero.
  const contractorPayableReadyWithoutObligation =
    preloadedSources.contractorPayableReadyWithoutObligation !== undefined
      ? preloadedSources.contractorPayableReadyWithoutObligation
      : await getContractorPayableReadyWithoutObligationSignal().catch(() => null)

  const contractorPayableBridgeDeadLetter =
    preloadedSources.contractorPayableBridgeDeadLetter !== undefined
      ? preloadedSources.contractorPayableBridgeDeadLetter
      : await getContractorPayableBridgeDeadLetterSignal().catch(() => null)

  // TASK-981 Slice 3 — remittance email dead-letter (paid payable → comprobante).
  const contractorRemittanceEmailDeadLetter =
    preloadedSources.contractorRemittanceEmailDeadLetter !== undefined
      ? preloadedSources.contractorRemittanceEmailDeadLetter
      : await getContractorRemittanceEmailDeadLetterSignal().catch(() => null)

  // TASK-795 Fase A — payables blocked by the international boundary (tax review + FX).
  const contractorPayableTaxReviewOverdue =
    preloadedSources.contractorPayableTaxReviewOverdue !== undefined
      ? preloadedSources.contractorPayableTaxReviewOverdue
      : await getContractorPayableTaxReviewOverdueSignal().catch(() => null)

  const contractorPayableFxUnresolvedOverdue =
    preloadedSources.contractorPayableFxUnresolvedOverdue !== undefined
      ? preloadedSources.contractorPayableFxUnresolvedOverdue
      : await getContractorPayableFxUnresolvedOverdueSignal().catch(() => null)

  // TASK-968 — payables blocked by the agreed-amount guardrail (no override).
  const contractorPayableExceedsAgreedAmount =
    preloadedSources.contractorPayableExceedsAgreedAmount !== undefined
      ? preloadedSources.contractorPayableExceedsAgreedAmount
      : await getContractorPayableExceedsAgreedAmountSignal().catch(() => null)

  // TASK-977 — committed payables without a materialized expense (settlement precondition).
  const contractorPayableExpenseUnmaterialized =
    preloadedSources.contractorPayableExpenseUnmaterialized !== undefined
      ? preloadedSources.contractorPayableExpenseUnmaterialized
      : await getContractorPayableExpenseUnmaterializedSignal().catch(() => null)

  // TASK-978 — contractor payment SLA: committed payables overdue vs the 5-business-day commitment.
  const contractorPayablePaymentSlaOverdue =
    preloadedSources.contractorPayablePaymentSlaOverdue !== undefined
      ? preloadedSources.contractorPayablePaymentSlaOverdue
      : await getContractorPayablePaymentSlaOverdueSignal().catch(() => null)

  // TASK-1019 — Workforce Contracting reliability signals (moduleKey 'workforce').
  const contractingAiDraftFailed =
    preloadedSources.contractingAiDraftFailed !== undefined
      ? preloadedSources.contractingAiDraftFailed
      : await getContractingAiDraftFailedSignal().catch(() => null)

  const contractingValidationBlockedOverdue =
    preloadedSources.contractingValidationBlockedOverdue !== undefined
      ? preloadedSources.contractingValidationBlockedOverdue
      : await getContractingValidationBlockedOverdueSignal().catch(() => null)

  const contractingApprovedWithoutPdf =
    preloadedSources.contractingApprovedWithoutPdf !== undefined
      ? preloadedSources.contractingApprovedWithoutPdf
      : await getContractingApprovedWithoutPdfSignal().catch(() => null)

  const contractingPdfStatusDrift =
    preloadedSources.contractingPdfStatusDrift !== undefined
      ? preloadedSources.contractingPdfStatusDrift
      : await getContractingPdfStatusDriftSignal().catch(() => null)

  const contractingSignatureDesync =
    preloadedSources.contractingSignatureDesync !== undefined
      ? preloadedSources.contractingSignatureDesync
      : await getContractingSignatureDesyncSignal().catch(() => null)

  const contractorPayableUnbatchedOverdue =
    preloadedSources.contractorPayableUnbatchedOverdue !== undefined
      ? preloadedSources.contractorPayableUnbatchedOverdue
      : await getContractorPayableUnbatchedOverdueSignal().catch(() => null)

  // TASK-490 — Signature orchestration reliability signals (moduleKey 'documents').
  const signaturePendingOverdue =
    preloadedSources.signaturePendingOverdue !== undefined
      ? preloadedSources.signaturePendingOverdue
      : await getSignaturePendingOverdueSignal().catch(() => null)

  const signatureFailed =
    preloadedSources.signatureFailed !== undefined
      ? preloadedSources.signatureFailed
      : await getSignatureFailedSignal().catch(() => null)

  const signatureSignedArtifactMissing =
    preloadedSources.signatureSignedArtifactMissing !== undefined
      ? preloadedSources.signatureSignedArtifactMissing
      : await getSignatureSignedArtifactMissingSignal().catch(() => null)

  const expenseDistribution =
    preloadedSources.expenseDistribution !== undefined
      ? preloadedSources.expenseDistribution
      : await buildExpenseDistributionSignals({
          unresolved: getExpenseDistributionUnresolvedSignal,
          sharedPoolContamination: getExpenseDistributionSharedPoolContaminationSignal
        }).catch(() => null)

  // TASK-780 Phase 3 — Home rollout drift signal. Lee PG flag vs env fallback
  // y opt-out rate. Degrada honestamente a `unknown` si PG falla.
  const homeRolloutDrift =
    preloadedSources.homeRolloutDrift !== undefined
      ? preloadedSources.homeRolloutDrift
      : await getHomeRolloutDriftSignal().catch(() => null)

  // TASK-553 Slice 4 — Quick Access Shortcuts catalog drift. Lee distinct
  // shortcut_keys pineados y los cruza contra el catálogo canónico TS.
  const shortcutsInvalidPins =
    preloadedSources.shortcutsInvalidPins !== undefined
      ? preloadedSources.shortcutsInvalidPins
      : await getShortcutsInvalidPinsSignal().catch(() => null)

  // TASK-784 Slice 7 + TASK-890 Slice 6 — Identity legal profile signals
  // (5 readers en paralelo). Cada uno degrada honestamente a `unknown` si su
  // query falla. Roll up bajo moduleKey 'identity' via incidentDomainTag.
  // TASK-890 agrega `identity.relationship.member_contract_drift` — detecta
  // member contractor/Deel con relacion legal activa employee (caso Maria).
  const identityLegalProfile =
    preloadedSources.identityLegalProfile !== undefined
      ? preloadedSources.identityLegalProfile
      : await Promise.all([
          getIdentityLegalProfilePendingOverdueSignal().catch(() => null),
          getIdentityLegalProfilePayrollBlockingSignal().catch(() => null),
          getIdentityLegalProfileRevealAnomalySignal().catch(() => null),
          getIdentityLegalProfileEvidenceOrphanSignal().catch(() => null),
          getIdentityRelationshipMemberContractDriftSignal().catch(() => null),
          // TASK-892 — closure completeness partial (case-level UX surface
          // del drift Person 360, complementario al signal sistema).
          getOffboardingCompletenessPartialSignal().catch(() => null),
          // Notion bridge coverage drift — detecta regresión del resolver
          // Notion-user-id → member-id (caso fuente: incidente 2026-05-16
          // post-TASK-877 dejó coverage en 3.7%, colapsando OTD/RpA bonuses).
          getIdentityNotionBridgeCoverageSignal().catch(() => null),
          // TASK-790 — contractor engagements con riesgo de clasificación
          // bloqueante (legal_review_required|blocked) y no terminales.
          getContractorEngagementClassificationRiskOpenSignal().catch(() => null),
          // TASK-791 — contractor invoice assets cuyo asset_id apunta a un asset
          // inexistente/eliminado (integridad de evidencia).
          getContractorInvoiceAssetsBrokenEvidenceSignal().catch(() => null),
          // TASK-792 — work submissions estancadas en review (submitted|disputed) > 14d.
          getContractorWorkSubmissionReviewOverdueSignal().catch(() => null),
          // TASK-794 — honorarios_cl activos sin RUT chileno verificado (payable
          // bloqueado por readiness fail-closed antes de Finance).
          getContractorPayableHonorariosRutUnverifiedSignal().catch(() => null),
          // TASK-956 — relaciones contractor por transición sin engagement
          // asociado (transición incompleta; defense-in-depth del comando atómico).
          getContractorTransitionOrphanSignal().catch(() => null),
          // TASK-968 — engagements contractor activos sin monto acordado fijado por HR.
          getContractorEngagementRateUnsetSignal().catch(() => null),
          // TASK-797 — engagements contractor cerrados (ended/cancelled) que aún
          // tienen payables abiertos (liquidar/cancelar; defense-in-depth del cierre).
          getContractorEngagementClosedWithOpenPayablesSignal().catch(() => null),
          // TASK-985 — engagements no terminales con clasificación `needs_review`
          // (worklist de revisión; salvedad de la auto-activación de onboarding).
          getContractorEngagementClassificationReviewPendingSignal().catch(() => null),
          // TASK-987 — route_groups de sesión que no derivan de roles ACTIVOS
          // (over-exposure por roles revocados; defense-in-depth del fix session_360).
          getIdentitySessionRouteGroupDriftSignal().catch(() => null),
          // TASK-1020 — snapshots de aprobación pendientes con autoridad efectiva
          // derivada de un approval_delegate genérico inválido (over-exposure de
          // autoridad de aprobación; steady=0 tras el recovery).
          getLeaveInvalidDelegatedApprovalSnapshotsSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-785 Slice 7 — Workforce role title governance signals (2 readers en
  // paralelo). Cada uno degrada honestamente a `unknown` si su query falla.
  // Roll up bajo moduleKey 'identity'.
  const workforceRoleTitle =
    preloadedSources.workforceRoleTitle !== undefined
      ? preloadedSources.workforceRoleTitle
      : await Promise.all([
          getRoleTitleDriftWithEntraSignal().catch(() => null),
          getRoleTitleUnresolvedDriftOverdueSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-839 — Admin Center entitlement governance signals (2 readers en
  // paralelo). Protegen el contrato transaccional audit+outbox y el SLA de
  // segunda firma para grants sensibles.
  const identityGovernance =
    preloadedSources.identityGovernance !== undefined
      ? preloadedSources.identityGovernance
      : await Promise.all([
          getIdentityGovernanceAuditLogWriteFailuresSignal().catch(() => null),
          getIdentityGovernancePendingApprovalOverdueSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-948 — Sister-platform OAuth broker signals. Estos readers se basan
  // en el audit log append-only del broker; no leen secretos ni tokens raw.
  const sisterPlatformOAuth =
    preloadedSources.sisterPlatformOAuth !== undefined
      ? preloadedSources.sisterPlatformOAuth
      : await Promise.all([
          getSisterPlatformOAuthExchangeFailureRateSignal().catch(() => null),
          getSisterPlatformOAuthRedirectRejectedSignal().catch(() => null),
          getSisterPlatformOAuthStaleClientConfigSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-611 Slice 5 — Organization Workspace projection signals (2 readers en
  // paralelo). Cada uno degrada honestamente a `unknown` si su query/cómputo falla.
  // Roll up bajo moduleKey 'identity'.
  const workspaceProjection =
    preloadedSources.workspaceProjection !== undefined
      ? preloadedSources.workspaceProjection
      : await Promise.all([
          getWorkspaceProjectionFacetViewDriftSignal().catch(() => null),
          getWorkspaceProjectionUnresolvedRelationsSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-999 — Organization brand asset signals. Roll up bajo Identity porque
  // la proyección Organization 360 consume el logo canónico, pero el flujo
  // protege explícitamente operating/legal entities.
  const organizationBrandAssets =
    preloadedSources.organizationBrandAssets !== undefined
      ? preloadedSources.organizationBrandAssets
      : await Promise.all([
          getOrganizationBrandAssetCoverageSignal().catch(() => null),
          getOrganizationBrandAssetDiscoveryFailuresSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-872 Slice 6 — SCIM + workforce intake signals (6 readers en paralelo).
  // Cubre: users sin identity_profile / sin member / ineligibles in scope /
  // member identity drift / members pending intake completion / allowlist-blocklist
  // conflict. Roll up bajo moduleKey 'identity'.
  const scimWorkforce =
    preloadedSources.scimWorkforce !== undefined
      ? preloadedSources.scimWorkforce
      : await getScimWorkforceSignals().catch(() => null)

  // ISSUE-075 hardening — Microsoft Graph webhook subscription health. Single
  // reader; consulta `greenhouse_sync.integration_registry.metadata` para
  // detectar expiración del subscription. Degrada honestamente a `unknown`.
  const entraWebhookSubscriptionHealth =
    preloadedSources.entraWebhookSubscriptionHealth !== undefined
      ? preloadedSources.entraWebhookSubscriptionHealth
      : await getEntraWebhookSubscriptionHealthSignal().catch(() => null)

  // TASK-827 Slice 8 — Client portal resolver failure rate. Single reader
  // (V1.0 scaffold returns `unknown` hasta que TASK-829 ship telemetry adapter).
  const clientPortalResolverFailureRate =
    preloadedSources.clientPortalResolverFailureRate !== undefined
      ? preloadedSources.clientPortalResolverFailureRate
      : await getClientPortalResolverFailureRateSignal().catch(() => null)

  // TASK-613 Slice 3 — Finance Clients ↔ Organization canonical link signal.
  // Single reader; degrada honestamente a `unknown` si la query falla.
  const financeClientProfileUnlinked =
    preloadedSources.financeClientProfileUnlinked !== undefined
      ? preloadedSources.financeClientProfileUnlinked
      : await getFinanceClientProfileUnlinkedSignal().catch(() => null)

  const nuboxSourceFreshness =
    preloadedSources.nuboxSourceFreshness !== undefined
      ? preloadedSources.nuboxSourceFreshness
      : await getNuboxSourceFreshnessSignal().catch(() => null)

  const notionConformedDrainFreshness =
    preloadedSources.notionConformedDrainFreshness !== undefined
      ? preloadedSources.notionConformedDrainFreshness
      : await getNotionConformedDrainFreshnessSignal().catch(() => null)

  const notionOnboardingIncomplete =
    preloadedSources.notionOnboardingIncomplete !== undefined
      ? preloadedSources.notionOnboardingIncomplete
      : await getNotionOnboardingIncompleteSignal().catch(() => null)

  // TASK-838 Fase 3 — Runtime guard: critical tables missing in PG. Single
  // reader; degrada honestamente a `unknown` si la query falla.
  const criticalTablesMissing =
    preloadedSources.criticalTablesMissing !== undefined
      ? preloadedSources.criticalTablesMissing
      : await getCriticalTablesMissingSignal().catch(() => null)

  // TASK-844 Slice 5 — Cross-runtime observability anti-regresión. Detecta
  // Cloud Run services con Sentry init regresado o secret missing (ISSUE-074
  // class). Steady=0; cualquier > 0 indica observabilidad rota en algún
  // service. Degrada `unknown` si la query falla.
  const cloudRunSilentObservability =
    preloadedSources.cloudRunSilentObservability !== undefined
      ? preloadedSources.cloudRunSilentObservability
      : await getCloudRunSilentObservabilitySignal().catch(() => null)

  // TASK-937 — AI Observer health desde el heartbeat (source_sync_runs).
  // Steady=0; detecta cron caído, kill-switch OFF o JSON truncado sostenido.
  // Degrada `unknown` si la query falla.
  const aiObserverUnhealthy =
    preloadedSources.aiObserverUnhealthy !== undefined
      ? preloadedSources.aiObserverUnhealthy
      : await getAiObserverUnhealthySignal().catch(() => null)

  // TASK-856 Slice 3 — Secret-ref env var format drift. Detección activa
  // upstream del Sentry burst downstream cuando un env var `*_SECRET_REF`
  // queda persistido con shape no canónico (quotes, `\n` literal, etc.).
  // Lectura puramente sincrónica sobre process.env, sin GCP round-trip.
  const secretsEnvRefFormatDrift =
    preloadedSources.secretsEnvRefFormatDrift !== undefined
      ? preloadedSources.secretsEnvRefFormatDrift
      : await getSecretsEnvRefFormatDriftSignal().catch(() => null)

  // TASK-845 Slice 6 — PG connection saturation (data-driven trigger para V2
  // PgBouncer multiplexer deployment). Steady < 60%; sustained > 60% justifica
  // TASK-846. Degrada `unknown` si la query falla.
  const postgresConnectionSaturation =
    preloadedSources.postgresConnectionSaturation !== undefined
      ? preloadedSources.postgresConnectionSaturation
      : await getPostgresConnectionSaturationSignal().catch(() => null)

  // TASK-813 Slice 6 + TASK-836 Slice 7 — Commercial engagement instance signals.
  // 3 readers TASK-813 + 4 readers TASK-836 en paralelo. Cada uno degrada
  // honestamente a `unknown` si su query falla. Roll up bajo moduleKey 'commercial'.
  // TASK-807 formaliza el subsystem.
  const servicesEngagement =
    preloadedSources.servicesEngagement !== undefined
      ? preloadedSources.servicesEngagement
      : await Promise.all([
          getServicesSyncLagSignal().catch(() => null),
          getServicesOrganizationUnresolvedSignal().catch(() => null),
          getServicesLegacyResidualReadsSignal().catch(() => null),
          // TASK-836 — 4 reliability signals nuevos
          getServiceEngagementLifecycleStageUnknownSignal().catch(() => null),
          getServiceEngagementEngagementKindUnmappedSignal().catch(() => null),
          getServiceEngagementRenewedStuckSignal().catch(() => null),
          getServiceEngagementLineageOrphanSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-900 Slice 6 — ICO Materializer skipped_safety. Single reader;
  // consulta count de runs con status='skipped_safety' en últimas 24h.
  // Degrada honestamente a `unknown` si la query falla.
  const icoMaterializerSkippedSafety =
    preloadedSources.icoMaterializerSkippedSafety !== undefined
      ? preloadedSources.icoMaterializerSkippedSafety
      : await getIcoMaterializerSkippedSafetySignal().catch(() => null)

  // TASK-941 Slice 5 — Nexa Insights freshness (stale_with_eligible_signals).
  // Cross-store: BQ ai_signals latest período vs PG serving enrichments.
  // Degrada honestamente a `unknown` si la query falla.
  const nexaInsightsFreshness =
    preloadedSources.nexaInsightsFreshness !== undefined
      ? preloadedSources.nexaInsightsFreshness
      : await getNexaInsightsFreshnessSignal().catch(() => null)

  // TASK-943 Slice 5 — Nexa Insights heartbeat (no_new_signals_in_24h).
  // BQ-only: MAX(generated_at) FROM ai_signals_current vs NOW(). Cierra la
  // pérdida de observabilidad post append-only (un cron caído ya no "borra"
  // la última corrida → silente sin este signal). Degrada honestamente.
  const nexaInsightsNoNewSignals =
    preloadedSources.nexaInsightsNoNewSignals !== undefined
      ? preloadedSources.nexaInsightsNoNewSignals
      : await getNexaInsightsNoNewSignalsSignal().catch(() => null)

  const nexaTurnDegradedOutcomes =
    preloadedSources.nexaTurnDegradedOutcomes !== undefined
      ? preloadedSources.nexaTurnDegradedOutcomes
      : await getNexaTurnDegradedOutcomesSignal().catch(() => null)

  // TASK-908 Slice 3.5 — Notion correction transitions source availability.
  // Single reader; LEFT JOIN tasks completadas vs task_status_transitions.
  // Degrada honestamente a `unknown` si la query falla.
  const notionCorrectionTransitionsSourceAvailability =
    preloadedSources.notionCorrectionTransitionsSourceAvailability !== undefined
      ? preloadedSources.notionCorrectionTransitionsSourceAvailability
      : await getNotionCorrectionTransitionsSourceAvailabilitySignal().catch(() => null)

  // TASK-923 (M1) — shadow paridad clasificador OTD. PG-based, degrada a `unknown`.
  const notionMetricsOtdClassifierParity =
    preloadedSources.notionMetricsOtdClassifierParity !== undefined
      ? preloadedSources.notionMetricsOtdClassifierParity
      : await getNotionMetricsOtdClassifierParitySignal().catch(() => null)

  // TASK-848 Slice 7 + TASK-849 Slice 2 + TASK-854 Slice 0 + TASK-857 —
  // Production Release Control Plane signals. 6 readers en paralelo. Cada
  // uno degrada a `severity=unknown` si no hay GITHUB_RELEASE_OBSERVER_TOKEN /
  // gcloud / release_manifests data o si GH API/PG falla. NO bloquea el dashboard.
  const productionRelease =
    preloadedSources.productionRelease !== undefined
      ? preloadedSources.productionRelease
      : await Promise.all([
          getReleaseStaleApprovalSignal().catch(() => null),
          getReleasePendingWithoutJobsSignal().catch(() => null),
          getReleaseWorkerRevisionDriftSignal().catch(() => null),
          getReleaseDeployDurationSignal().catch(() => null),
          getReleaseLastStatusSignal().catch(() => null),
          getReleaseGithubWebhookUnmatchedSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-807 — Commercial Health readers (6). Cada reader degrada
  // honestamente a `unknown` si su query falla. Incluye stale_progress de
  // TASK-805 como primitive reutilizada, no recreada.
  const commercialHealth =
    preloadedSources.commercialHealth !== undefined
      ? preloadedSources.commercialHealth
      : await Promise.all([
          buildCommercialHealthSignals({
            overdueDecision: getEngagementOverdueDecisionSignal,
            budgetOverrun: getEngagementBudgetOverrunSignal,
            zombie: getEngagementZombieSignal,
            unapprovedActive: getEngagementUnapprovedActiveSignal,
            conversionRateDrop: getEngagementConversionRateDropSignal,
            staleProgress: getEngagementStaleProgressSignal
          }).catch(() => null),
          // TASK-835 Slice 6 — Sample Sprints Runtime Projection degraded signal
          getSampleSprintProjectionDegradedSignal().catch(() => null),
          // TASK-837 Slice 6 — 7 Sample Sprint outbound projection signals.
          // All roll up under subsystem `commercial`. Steady=0 for all.
          getSampleSprintOutboundPendingOverdueSignal().catch(() => null),
          getSampleSprintOutboundDeadLetterSignal().catch(() => null),
          getSampleSprintPartialAssociationsSignal().catch(() => null),
          getSampleSprintDealClosedButActiveSignal().catch(() => null),
          getSampleSprintDealAssociationsDriftSignal().catch(() => null),
          getSampleSprintOutcomeTerminalPservicesOpenSignal().catch(() => null),
          getSampleSprintLegacyWithoutDealSignal().catch(() => null),
          // TASK-991 Slice 0 — Organization birth completeness signals (roll up bajo `commercial`).
          getCommercialOrganizationTypeLifecycleDriftSignal().catch(() => null),
          getCommercialOrganizationIncompleteIdentitySignal().catch(() => null),
          getCommercialClientActiveWithoutProfileSignal().catch(() => null),
          getCommercialClientActiveWithoutSpaceSignal().catch(() => null),
          // TASK-997 Slice 1 — industria fuera del enum canónico HubSpot (data quality).
          getCommercialOrganizationIndustryNoncanonicalSignal().catch(() => null),
          // TASK-992 — Client Lifecycle Orchestrator signals (roll up bajo `commercial`).
          getClientLifecycleOnboardingStalledSignal().catch(() => null),
          getClientLifecycleChecklistOrphanItemsSignal().catch(() => null),
          getClientLifecycleCascadeDeadLetterSignal().catch(() => null),
          getClientLifecycleCaseWithoutTemplateSignal().catch(() => null),
          getClientLifecycleBlockerOverrideAnomalySignal().catch(() => null),
          // TASK-1017 — evidencia auto-derivable detectada pero el paso sigue sin marcar.
          getClientLifecycleEvidenceDetectedNotMarkedSignal().catch(() => null)
        ])
          .then(([healthSignals, projectionSignal, ...outboundSignals]) => {
            const collected = healthSignals ?? []

            const withProjection = projectionSignal
              ? [...collected, projectionSignal]
              : collected

            const validOutbound = outboundSignals.filter(
              (s): s is NonNullable<typeof s> => s !== null
            )

            return [...withProjection, ...validOutbound]
          })
          .catch(() => null)

  // TASK-910 Slice 4 — Notion Demo Teamspace signals (6 canonical).
  // Defense in depth dual: 5 signals delivery + 1 critical signal payroll.
  // El payroll signal `payroll.bonus.demo_member_contamination` es ERROR si > 0
  // (NUNCA debe pasar — alerta immediate canonical anti-regresión).
  const notionMetricsDemo =
    preloadedSources.notionMetricsDemo !== undefined
      ? preloadedSources.notionMetricsDemo
      : await Promise.all([
          getNotionMetricsShadowParidadRpaDemoSignal().catch(() => null),
          getNotionMetricsEchoLoopDemoSignal().catch(() => null),
          getNotionMetricsWebhookSignatureFailuresDemoSignal().catch(() => null),
          getNotionMetricsWritebackDeadLetterDemoSignal().catch(() => null),
          getNotionMetricsWritebackLagDemoSignal().catch(() => null),
          getNotionMetricsDemoTeamspaceDriftSignal().catch(() => null),
          getNotionMetricsTransitionCaptureRefetchFailedDemoSignal().catch(() => null),
          getPayrollBonusDemoContaminationSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-912 — Notion status-transitions productive capture signals (Efeonce/Sky).
  const notionStatusTransitions =
    preloadedSources.notionStatusTransitions !== undefined
      ? preloadedSources.notionStatusTransitions
      : await Promise.all([
          getNotionStatusTransitionsIngestionLagSignal().catch(() => null),
          getNotionStatusTransitionsCaptureRefetchFailedSignal().catch(() => null),
          getNotionStatusTransitionsBqSyncLagSignal().catch(() => null),
          getNotionStatusTransitionsReconciliationSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-916 — Notion RpA V2 productive writeback signals (Efeonce/Sky).
  const notionMetricsRpa =
    preloadedSources.notionMetricsRpa !== undefined
      ? preloadedSources.notionMetricsRpa
      : await Promise.all([
          getNotionMetricsWritebackDeadLetterSignal().catch(() => null),
          getNotionMetricsWritebackLagSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-903 — Notion FTR writeback signals (Efeonce/Sky).
  const notionMetricsFtr =
    preloadedSources.notionMetricsFtr !== undefined
      ? preloadedSources.notionMetricsFtr
      : await Promise.all([
          getNotionMetricsFtrWritebackDeadLetterSignal().catch(() => null),
          getNotionMetricsFtrWritebackLagSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-921 — Notion reschedule (due-date change) capture signals.
  const notionMetricsReschedule =
    preloadedSources.notionMetricsReschedule !== undefined
      ? preloadedSources.notionMetricsReschedule
      : await Promise.all([
          getRescheduleCaptureLagSignal().catch(() => null),
          getReschedulePendingReasonSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-922 — Attributable lateness shadow signals (M2).
  const attributableLateness =
    preloadedSources.attributableLateness !== undefined
      ? preloadedSources.attributableLateness
      : await Promise.all([
          getAttributableLatenessShadowParidadSignal().catch(() => null),
          getAttributableLatenessOverlapSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  return buildReliabilityOverview(operations, {
    billing,
    vercelBilling,
    githubBilling,
    notionOperational,
    syntheticSnapshots,
    financeSmokeLane,
    modules,
    aiObservations,
    domainIncidents,
    paymentOrderSettlement,
    payrollComplianceExportDrift,
    payrollContractorDoubleRailOverlap,
    payrollDeelMemberWithoutContractId,
    finalSettlementPdfStatusDrift,
    payrollParticipationWindow,
    leaveAccrual,
    payrollContractTaxonomy,
    financeClpDrift,
    providerBqSyncDeadLetter,
    hubspotCompaniesIntakeDeadLetter,
    workforceUnlinkedInternalUsers,
    knowledgeQuarantineCount,
    knowledgeSyncFailedSource,
    knowledgeNotionIngestDeadLetter,
    nexaKnowledgeRetrieval,
    outboxHealth,
    emailRenderFailure,
    cronStagingDrift,
    accountBalancesFxDrift,
    ledgerUnresolvedDriftItems,
    nuboxExportOrphanRfc,
    paymentOrderMixedCurrency,
    fxGainLossUnclassified,
    mxnRateFreshness,
    fxSnapshotMissing,
    nuboxExportForeignAmountMissing,
    multiCurrencyNativeEquivalentDrift,
    cashSignalUnsupportedCurrency,
    contractorPayableReadyWithoutObligation,
    contractorPayableExpenseUnmaterialized,
    contractorPayablePaymentSlaOverdue,
    contractingAiDraftFailed,
    contractingValidationBlockedOverdue,
    contractingApprovedWithoutPdf,
    contractingPdfStatusDrift,
    contractingSignatureDesync,
    signaturePendingOverdue,
    signatureFailed,
    signatureSignedArtifactMissing,
    contractorPayableUnbatchedOverdue,
    contractorPayableBridgeDeadLetter,
    contractorRemittanceEmailDeadLetter,
    contractorPayableTaxReviewOverdue,
    contractorPayableFxUnresolvedOverdue,
    contractorPayableExceedsAgreedAmount,
    expenseDistribution,
    homeRolloutDrift,
    shortcutsInvalidPins,
    identityLegalProfile,
    workforceRoleTitle,
    identityGovernance,
    sisterPlatformOAuth,
    workspaceProjection,
    organizationBrandAssets,
    scimWorkforce,
    entraWebhookSubscriptionHealth,
    clientPortalResolverFailureRate,
    financeClientProfileUnlinked,
    nuboxSourceFreshness,
    notionConformedDrainFreshness,
    notionOnboardingIncomplete,
    criticalTablesMissing,
    cloudRunSilentObservability,
    aiObserverUnhealthy,
    secretsEnvRefFormatDrift,
    postgresConnectionSaturation,
    servicesEngagement,
    commercialHealth,
    productionRelease,
    icoMaterializerSkippedSafety,
    nexaInsightsFreshness,
    nexaInsightsNoNewSignals,
    nexaTurnDegradedOutcomes,
    notionCorrectionTransitionsSourceAvailability,
    notionMetricsOtdClassifierParity,
    notionMetricsDemo,
    notionStatusTransitions,
    notionMetricsRpa,
    notionMetricsFtr,
    notionMetricsReschedule,
    attributableLateness
  })
}

/**
 * Fetch Sentry incident snapshots for every module whose registry entry
 * declares an `incidentDomainTag`. Sentry currently rate-limits this endpoint
 * around 5 requests/sec, so we batch the domain reads instead of firing the
 * whole registry at once. Failures are still isolated per domain so a Sentry
 * hiccup on one module never poisons the others.
 */
const SENTRY_DOMAIN_INCIDENT_BATCH_SIZE = 4
const SENTRY_DOMAIN_INCIDENT_BATCH_DELAY_MS = 1100

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const hydrateDomainIncidents = async (
  registry: ReliabilityModuleDefinition[]
): Promise<Record<string, CloudSentryIncidentsSnapshot> | null> => {
  const taggedModules = registry.filter(m => Boolean(m.incidentDomainTag))

  if (taggedModules.length === 0) return null

  const entries: Array<readonly [ReliabilityModuleKey, CloudSentryIncidentsSnapshot] | null> = []

  for (let index = 0; index < taggedModules.length; index += SENTRY_DOMAIN_INCIDENT_BATCH_SIZE) {
    const batch = taggedModules.slice(index, index + SENTRY_DOMAIN_INCIDENT_BATCH_SIZE)

    const batchEntries = await Promise.all(
      batch.map(async module => {
        try {
          const snapshot = await getCloudSentryIncidents(process.env, {
            domain: module.incidentDomainTag ?? null
          })

          return [module.moduleKey, snapshot] as const
        } catch {
          return null
        }
      })
    )

    entries.push(...batchEntries)

    if (index + SENTRY_DOMAIN_INCIDENT_BATCH_SIZE < taggedModules.length) {
      await wait(SENTRY_DOMAIN_INCIDENT_BATCH_DELAY_MS)
    }
  }

  const out: Record<string, CloudSentryIncidentsSnapshot> = {}

  for (const entry of entries) {
    if (entry) out[entry[0]] = entry[1]
  }

  return Object.keys(out).length > 0 ? out : null
}
