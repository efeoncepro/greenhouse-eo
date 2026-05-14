import 'server-only'

import type { CloudSentryIncidentsSnapshot } from '@/lib/cloud/contracts'
import { getCloudSentryIncidents } from '@/lib/cloud/observability'
import { getGcpBillingOverview } from '@/lib/cloud/gcp-billing'
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
import type {
  ReliabilityIntegrationBoundary,
  ReliabilityModuleDefinition,
  ReliabilityModuleSnapshot,
  ReliabilityOverview,
  ReliabilitySeverity,
  ReliabilitySignal,
  ReliabilitySignalKind
} from '@/types/reliability'
import type { SyntheticRouteSnapshot } from '@/types/reliability-synthetic'

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
import { getFinanceClientProfileUnlinkedSignal } from './queries/finance-client-profile-unlinked'
import { getIdentityLegalProfileEvidenceOrphanSignal } from './queries/identity-legal-profile-evidence-orphan'
import { getIdentityLegalProfilePayrollBlockingSignal } from './queries/identity-legal-profile-payroll-blocking'
import { getIdentityLegalProfilePendingOverdueSignal } from './queries/identity-legal-profile-pending-overdue'
import { getIdentityLegalProfileRevealAnomalySignal } from './queries/identity-legal-profile-reveal-anomaly'
import { getScimWorkforceSignals } from './queries/scim-workforce-signals'
import {
  getIdentityGovernanceAuditLogWriteFailuresSignal,
  getIdentityGovernancePendingApprovalOverdueSignal
} from './queries/identity-governance-signals'
import { getIncomePaymentsClpDriftSignal } from './queries/income-payments-clp-drift'
import { getPaymentOrdersDeadLetterSignal } from './queries/payment-orders-dead-letter'
import { getPaidOrdersWithoutExpensePaymentSignal } from './queries/payment-orders-paid-without-expense-payment'
import { getPayrollComplianceExportDriftSignal } from './queries/payroll-compliance-export-drift'
import { getPayrollExpenseMaterializationLagSignal } from './queries/payroll-expense-materialization-lag'
import { getProviderBqSyncDeadLetterSignal } from './queries/provider-bq-sync-dead-letter'
import { getHubspotCompaniesIntakeDeadLetterSignal } from './queries/hubspot-companies-intake-dead-letter'
import { getWorkforceUnlinkedInternalUsersSignal } from './queries/workforce-unlinked-internal-users'
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
import { getCloudRunSilentObservabilitySignal } from './queries/cloud-run-silent-observability'
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
import { getEngagementBudgetOverrunSignal } from './queries/engagement-budget-overrun'
import { getEngagementConversionRateDropSignal } from './queries/engagement-conversion-rate-drop'
import { getEngagementOverdueDecisionSignal } from './queries/engagement-overdue-decision'
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
  buildFinanceSmokeLaneSignals,
  buildGcpBillingSignals,
  buildNotionDataQualitySignals,
  buildNotionFreshnessSignal,
  buildObservabilityPostureSignal,
  buildFinanceClpDriftSignals,
  buildCommercialHealthSignals,
  buildExpenseDistributionSignals,
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
  finalSettlementPdfStatusDrift?: ReliabilitySignal | null

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

  /**
   * TASK-611 Slice 5 — Organization Workspace projection signals (2):
   *   - identity.workspace_projection.facet_view_drift (drift, warning)
   *   - identity.workspace_projection.unresolved_relations (data_quality, error)
   * Roll up bajo moduleKey 'identity'.
   */
  workspaceProjection?: ReliabilitySignal[] | null
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
    ...(sources.finalSettlementPdfStatusDrift ? [sources.finalSettlementPdfStatusDrift] : []),
    // TASK-766 Slice 2 — Finance CLP currency drift signals (expense + income).
    ...(sources.financeClpDrift ?? []),
    // TASK-771 Slice 4 — Provider BQ sync dead-letter signal (drift PG↔BQ).
    ...(sources.providerBqSyncDeadLetter ?? []),
    // TASK-878 Slice 2 — HubSpot companies intake dead-letter (async webhook path).
    ...(sources.hubspotCompaniesIntakeDeadLetter ? [sources.hubspotCompaniesIntakeDeadLetter] : []),
    // TASK-878 follow-up — Identity UX hardening: internal users sin member enlazado.
    ...(sources.workforceUnlinkedInternalUsers ? [sources.workforceUnlinkedInternalUsers] : []),
    // TASK-773 Slice 4 — Outbox publisher health (lag + dead_letter).
    ...(sources.outboxHealth ?? []),
    // TASK-408 Slice 4 — Email render/template safety net.
    ...(sources.emailRenderFailure ? [sources.emailRenderFailure] : []),
    // TASK-775 Slice 5 — Vercel ↔ Cloud Scheduler drift (async-critical crons).
    ...(sources.cronStagingDrift ? [sources.cronStagingDrift] : []),
    // TASK-774 Slice 4 — Account balances FX drift (closing_balance vs recompute).
    ...(sources.accountBalancesFxDrift ? [sources.accountBalancesFxDrift] : []),
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
    // TASK-611 Slice 5 — Organization Workspace projection signals (2).
    ...(sources.workspaceProjection ?? []),
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
    // TASK-838 Fase 3 — Runtime guard: critical tables missing in PG.
    ...(sources.criticalTablesMissing ? [sources.criticalTablesMissing] : []),
    // TASK-844 Slice 5 — Cross-runtime observability anti-regresión.
    ...(sources.cloudRunSilentObservability ? [sources.cloudRunSilentObservability] : []),
    // TASK-856 Slice 3 — Secret-ref env var format drift (active upstream detection).
    ...(sources.secretsEnvRefFormatDrift ? [sources.secretsEnvRefFormatDrift] : []),
    // TASK-845 Slice 6 — PG connection saturation (data-driven V2 trigger).
    ...(sources.postgresConnectionSaturation ? [sources.postgresConnectionSaturation] : []),
    // TASK-813 Slice 6 — Commercial engagement instance signals (3).
    ...(sources.servicesEngagement ?? []),
    // TASK-807 — Commercial Health signals (six Sample Sprints health gates).
    ...(sources.commercialHealth ?? []),
    // TASK-848 Slice 7 — Production Release Control Plane signals (2 of 4 V1).
    ...(sources.productionRelease ?? [])
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

  // TASK-784 Slice 7 — Identity legal profile signals (4 readers en paralelo).
  // Cada uno degrada honestamente a `unknown` si su query falla. Roll up
  // bajo moduleKey 'identity' via incidentDomainTag.
  const identityLegalProfile =
    preloadedSources.identityLegalProfile !== undefined
      ? preloadedSources.identityLegalProfile
      : await Promise.all([
          getIdentityLegalProfilePendingOverdueSignal().catch(() => null),
          getIdentityLegalProfilePayrollBlockingSignal().catch(() => null),
          getIdentityLegalProfileRevealAnomalySignal().catch(() => null),
          getIdentityLegalProfileEvidenceOrphanSignal().catch(() => null)
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
          getSampleSprintLegacyWithoutDealSignal().catch(() => null)
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

  return buildReliabilityOverview(operations, {
    billing,
    notionOperational,
    syntheticSnapshots,
    financeSmokeLane,
    modules,
    aiObservations,
    domainIncidents,
    paymentOrderSettlement,
    payrollComplianceExportDrift,
    finalSettlementPdfStatusDrift,
    financeClpDrift,
    providerBqSyncDeadLetter,
    hubspotCompaniesIntakeDeadLetter,
    workforceUnlinkedInternalUsers,
    outboxHealth,
    emailRenderFailure,
    cronStagingDrift,
    accountBalancesFxDrift,
    expenseDistribution,
    homeRolloutDrift,
    shortcutsInvalidPins,
    identityLegalProfile,
    workforceRoleTitle,
    identityGovernance,
    workspaceProjection,
    scimWorkforce,
    entraWebhookSubscriptionHealth,
    clientPortalResolverFailureRate,
    financeClientProfileUnlinked,
    nuboxSourceFreshness,
    criticalTablesMissing,
    cloudRunSilentObservability,
    secretsEnvRefFormatDrift,
    postgresConnectionSaturation,
    servicesEngagement,
    commercialHealth,
    productionRelease
  })
}

/**
 * Fetch Sentry incident snapshots in parallel for every module whose registry
 * entry declares an `incidentDomainTag`. Failures are isolated per domain so a
 * Sentry hiccup on one module never poisons the others.
 */
const hydrateDomainIncidents = async (
  registry: ReliabilityModuleDefinition[]
): Promise<Record<string, CloudSentryIncidentsSnapshot> | null> => {
  const taggedModules = registry.filter(m => Boolean(m.incidentDomainTag))

  if (taggedModules.length === 0) return null

  const entries = await Promise.all(
    taggedModules.map(async module => {
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

  const out: Record<string, CloudSentryIncidentsSnapshot> = {}

  for (const entry of entries) {
    if (entry) out[entry[0]] = entry[1]
  }

  return Object.keys(out).length > 0 ? out : null
}
