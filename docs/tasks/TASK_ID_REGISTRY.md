# TASK_ID_REGISTRY.md

## Objetivo

Registro canonico de asignacion de IDs `TASK-###` para evitar colisiones y renumeraciones del backlog.

## Reglas

- `TASK-###` es estable y no se recicla
- el orden de ejecucion actual vive en `Rank`, no en el ID
- una task legacy puede recibir un `TASK-###` operativo sin renombrar todavia su archivo
- no renumerar el registro cuando cambie la prioridad del backlog

## Registro completo

| Task ID    | Lifecycle actual | Legacy ID / brief                                                  | Archivo actual                                                          |
| ---------- | ---------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `TASK-001` | `in-progress`    | `CODEX_TASK_HR_Payroll_Operational_Hardening_v1`                   | `docs/tasks/in-progress/TASK-001-hr-payroll-operational-hardening.md`   |
| `TASK-002` | `to-do`          | `CODEX_TASK_Tenant_Notion_Mapping`                                 | `docs/tasks/to-do/TASK-002-tenant-notion-mapping.md`                    |
| `TASK-003` | `to-do`          | `CODEX_TASK_Invoice_Payment_Ledger_Correction_v1`                  | `docs/tasks/to-do/TASK-003-invoice-payment-ledger-correction.md`        |
| `TASK-004` | `to-do`          | `CODEX_TASK_Finance_Dashboard_Calculation_Correction_v1`           | `docs/tasks/to-do/TASK-004-finance-dashboard-calculation-correction.md` |
| `TASK-005` | `to-do`          | `CODEX_TASK_HR_Payroll_Attendance_Leave_Work_Entries_v1`           | `docs/tasks/to-do/TASK-005-hr-payroll-attendance-leave-work-entries.md` |
| `TASK-006` | `to-do`          | `CODEX_TASK_Webhook_Infrastructure_MVP_v1`                         | `docs/tasks/to-do/TASK-006-webhook-infrastructure-mvp.md`               |
| `TASK-007` | `complete`       | `CODEX_TASK_Lint_Debt_Burn_Down_v1`                                | `docs/tasks/complete/CODEX_TASK_Lint_Debt_Burn_Down_v1.md`              |
| `TASK-008` | `to-do`          | `CODEX_TASK_Team_Identity_Capacity_System_v2`                      | `docs/tasks/to-do/TASK-008-team-identity-capacity-system.md`            |
| `TASK-009` | `complete`       | `CODEX_TASK_Greenhouse_Home_Nexa_v2`                               | `docs/tasks/complete/TASK-009-greenhouse-home-nexa.md`                  |
| `TASK-010` | `to-do`          | `CODEX_TASK_Organization_Economics_Dashboard_v1`                   | `docs/tasks/to-do/TASK-010-organization-economics-dashboard.md`         |
| `TASK-011` | `to-do`          | `CODEX_TASK_ICO_Person_360_Integration_v1`                         | `docs/tasks/to-do/TASK-011-ico-person-360-integration.md`               |
| `TASK-012` | `to-do`          | `CODEX_TASK_Outbox_Event_Expansion_v1`                             | `docs/tasks/to-do/TASK-012-outbox-event-expansion.md`                   |
| `TASK-013` | `to-do`          | `CODEX_TASK_Nubox_Finance_Reconciliation_Bridge_v1`                | `docs/tasks/to-do/TASK-013-nubox-finance-reconciliation-bridge.md`      |
| `TASK-014` | `to-do`          | `CODEX_TASK_Projects_Account_360_Bridge_v1`                        | `docs/tasks/to-do/TASK-014-projects-account-360-bridge.md`              |
| `TASK-015` | `to-do`          | `CODEX_TASK_Financial_Intelligence_Layer_v2`                       | `docs/tasks/to-do/TASK-015-financial-intelligence-layer.md`             |
| `TASK-016` | `to-do`          | `CODEX_TASK_Business_Units_Canonical_v2`                           | `docs/tasks/to-do/TASK-016-business-units-canonical.md`                 |
| `TASK-017` | `to-do`          | `CODEX_TASK_Campaign_360_v2`                                       | `docs/tasks/to-do/TASK-017-campaign-360.md`                             |
| `TASK-018` | `complete`       | `CODEX_TASK_SCIM_User_Provisioning_v2`                             | `docs/tasks/to-do/TASK-018-scim-user-provisioning.md`                   |
| `TASK-019` | `complete`       | `CODEX_TASK_Staff_Augmentation_Module_v2`                          | `docs/tasks/complete/TASK-019-staff-augmentation-module.md`             |
| `TASK-020` | `to-do`          | `CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2`                | `docs/tasks/to-do/TASK-020-frameio-bigquery-analytics-pipeline.md`      |
| `TASK-021` | `to-do`          | `CODEX_TASK_Typography_Variant_Adoption_v1`                        | `docs/tasks/to-do/TASK-021-typography-variant-adoption.md`              |
| `TASK-022` | `to-do`          | `CODEX_TASK_Services_Runtime_Closure_v1`                           | `docs/tasks/to-do/TASK-022-services-runtime-closure.md`                 |
| `TASK-023` | `to-do`          | `CODEX_TASK_Notification_System`                                   | `docs/tasks/to-do/TASK-023-notification-system.md`                      |
| `TASK-024` | `to-do`          | `CODEX_TASK_Greenhouse_Login_Redesign`                             | `docs/tasks/to-do/TASK-024-greenhouse-login-redesign.md`                |
| `TASK-025` | `deferred`       | `Payroll FTR Bonus Policy Decision`                                | `docs/tasks/to-do/TASK-025-hr-payroll-module-delta-ftr.md`              |
| `TASK-026` | `complete`       | `CODEX_TASK_HRIS_Contract_Type_Consolidation`                      | `docs/tasks/complete/TASK-026-hris-contract-type-consolidation.md`      |
| `TASK-027` | `to-do`          | `HRIS Document Vault`                                              | `docs/tasks/to-do/TASK-027-hris-document-vault.md`                      |
| `TASK-028` | `to-do`          | `CODEX_TASK_HRIS_Expense_Reports`                                  | `docs/tasks/to-do/TASK-028-hris-expense-reports.md`                     |
| `TASK-029` | `to-do`          | `CODEX_TASK_HRIS_Goals_OKRs`                                       | `docs/tasks/to-do/TASK-029-hris-goals-okrs.md`                          |
| `TASK-030` | `to-do`          | `CODEX_TASK_HRIS_Onboarding_Offboarding`                           | `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`              |
| `TASK-031` | `to-do`          | `HRIS Performance Evaluations`                                     | `docs/tasks/to-do/TASK-031-hris-performance-evaluations.md`             |
| `TASK-032` | `to-do`          | Login Dark Mode Polish                                             | `docs/tasks/to-do/TASK-032-login-dark-mode-polish.md`                   |
| `TASK-033` | `to-do`          | `CODEX_TASK_Campaign_360` (brief historico)                        | `docs/tasks/to-do/TASK-033-campaign-360-brief.md`                       |
| `TASK-034` | `to-do`          | `CODEX_TASK_Business_Units_Canonical` (brief historico)            | `docs/tasks/to-do/TASK-034-business-units-canonical-brief.md`           |
| `TASK-035` | `to-do`          | `CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline` (brief historico) | `docs/tasks/to-do/TASK-035-frameio-analytics-brief.md`                  |
| `TASK-036` | `to-do`          | `CODEX_TASK_Greenhouse_Home_Nexa` (brief historico)                | `docs/tasks/to-do/TASK-036-greenhouse-home-nexa-brief.md`               |
| `TASK-037` | `complete`       | `CODEX_TASK_SCIM_User_Provisioning` (brief historico)              | `docs/tasks/to-do/TASK-037-scim-user-provisioning-brief.md`             |
| `TASK-038` | `complete`       | `CODEX_TASK_Staff_Augmentation_Module` (brief historico absorbido) | `docs/tasks/complete/TASK-038-staff-augmentation-module-brief.md`       |
| `TASK-039` | `to-do`          | `Data Node Product Vision (Legacy Reference)`                      | `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`                |
| `TASK-040` | `to-do`          | `Data Node Operating Baseline`                                     | `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`                |

| `TASK-041` | `complete` | `CODEX_TASK_Staff_Augmentation_HRIS_Addendum` (absorbida) | `docs/tasks/complete/TASK-041-staff-augmentation-hris-addendum.md` |
| `TASK-042` | `to-do` | Person Operational Serving Cutover | `docs/tasks/to-do/TASK-042-person-operational-serving-cutover.md` |
| `TASK-043` | `to-do` | Person 360 Runtime Consolidation | `docs/tasks/to-do/TASK-043-person-360-runtime-consolidation.md` |
| `TASK-044` | `to-do` | Organization Executive Snapshot | `docs/tasks/to-do/TASK-044-organization-executive-snapshot.md` |
| `TASK-045` | `to-do` | Reactive Projection Refresh | `docs/tasks/to-do/TASK-045-reactive-projection-refresh.md` |
| `TASK-046` | `to-do` | Delivery Performance Metrics ICO Cutover | `docs/tasks/to-do/TASK-046-delivery-performance-metrics-ico-cutover.md` |
| `TASK-047` | `to-do` | Delivery Project Scope Visibility Correction | `docs/tasks/to-do/TASK-047-delivery-project-scope-visibility-correction.md` |
| `TASK-048` | `to-do` | Delivery Sprint Runtime Completion | `docs/tasks/to-do/TASK-048-delivery-sprint-runtime-completion.md` |
| `TASK-049` | `to-do` | Delivery Client Runtime Consolidation | `docs/tasks/to-do/TASK-049-delivery-client-runtime-consolidation.md` |
| `TASK-050` | `to-do` | Finance Client Canonical Runtime Cutover | `docs/tasks/to-do/TASK-050-finance-client-canonical-runtime-cutover.md` |
| `TASK-051` | `to-do` | Finance Payroll Bridge Postgres Alignment | `docs/tasks/to-do/TASK-051-finance-payroll-bridge-postgres-alignment.md` |
| `TASK-052` | `to-do` | Person 360 Finance Access Alignment | `docs/tasks/to-do/TASK-052-person-360-finance-access-alignment.md` |
| `TASK-053` | `to-do` | TanStack Table Migration Remaining | `docs/tasks/to-do/TASK-053-tanstack-table-migration-remaining.md` |
| `TASK-054` | `to-do` | TanStack High Impact Remaining | `docs/tasks/to-do/TASK-054-tanstack-high-impact-remaining.md` |
| `TASK-055` | `complete` | Finance Intelligence Cost Coverage Repair | `docs/tasks/complete/TASK-055-finance-intelligence-cost-coverage-repair.md` |
| `TASK-056` | `complete` | Agency Team Capacity Semantics | `docs/tasks/complete/TASK-056-agency-team-capacity-semantics.md` |
| `TASK-057` | `complete` | Direct Overhead Tool Cost Attribution | `docs/tasks/complete/TASK-057-direct-overhead-tool-cost-attribution.md` |
| `TASK-058` | `complete` | Economic Indicators Runtime Layer | `docs/tasks/complete/TASK-058-economic-indicators-runtime-layer.md` |

| `TASK-059` | `complete` | Tool Provider Canonical Object | `docs/tasks/complete/TASK-059-tool-provider-canonical-object.md` |
| `TASK-060` | `complete` | Team Assignment Admin (Agency > Team CRUD) | `docs/tasks/complete/TASK-060-team-assignment-admin.md` |
| `TASK-061` | `complete` | Payroll Go-Live Readiness Audit | `docs/tasks/complete/TASK-061-payroll-go-live-readiness-audit.md` |
| `TASK-062` | `complete` | Payroll Recurring Fixed Bonus Support | `docs/tasks/complete/TASK-062-payroll-recurring-fixed-bonus-support.md` |
| `TASK-063` | `complete` | Payroll Projected Payroll Runtime | `docs/tasks/complete/TASK-063-payroll-projected-payroll-runtime.md` |
| `TASK-064` | `complete` | ICO Assignee Attribution Remediation | `docs/tasks/complete/TASK-064-ico-assignee-attribution-remediation.md` |
| `TASK-065` | `complete` | Payroll Variable Bonus Policy Recalibration | `docs/tasks/complete/TASK-065-payroll-variable-bonus-policy-recalibration.md` |
| `TASK-067` | `complete` | Cost Intelligence Foundation | `docs/tasks/complete/TASK-067-cost-intelligence-foundation.md` |
| `TASK-068` | `complete` | Period Closure Status Projection | `docs/tasks/complete/TASK-068-period-closure-status-projection.md` |
| `TASK-069` | `complete` | Operational P&L Projection | `docs/tasks/complete/TASK-069-operational-pl-projection.md` |
| `TASK-070` | `complete` | Cost Intelligence Finance UI | `docs/tasks/complete/TASK-070-cost-intelligence-finance-ui.md` |
| `TASK-071` | `complete` | Cost Intelligence Cross-Module Consumers | `docs/tasks/complete/TASK-071-cost-intelligence-cross-module-consumers.md` |
| `TASK-072` | `to-do` | Compensation Versioning UX Clarity | `docs/tasks/to-do/TASK-072-compensation-versioning-ux-clarity.md` |
| `TASK-073` | `complete` | People Canonical Capacity Cutover | `docs/tasks/complete/TASK-073-people-canonical-capacity-cutover.md` |
| `TASK-074` | `complete` | Projected Payroll to Official Promotion Flow | `docs/tasks/complete/TASK-074-projected-payroll-to-official-promotion-flow.md` |

| `TASK-075` | `complete` | Projected Payroll UX Polish | `docs/tasks/complete/TASK-075-projected-payroll-ux-polish.md` |

| `TASK-076` | `complete` | Payroll Chile: Paridad con Liquidación Legal | `docs/tasks/complete/TASK-076-payroll-chile-liquidacion-parity.md` |

| `TASK-077` | `complete` | Payroll Receipt Generation & Delivery | `docs/tasks/complete/TASK-077-payroll-receipt-generation-delivery.md` |

| `TASK-078` | `complete` | Payroll Chile: Previsional Foundation & Forward Cutover | `docs/tasks/complete/TASK-078-payroll-chile-previsional-foundation.md` |
| `TASK-079` | `to-do` | Payroll Chile: Reverse Calculation Engine | `docs/tasks/to-do/TASK-079-payroll-chile-reverse-calculation-engine.md` |

| `TASK-080` | `complete` | ICO Person Intelligence Frontend + Event Wiring | `docs/tasks/complete/TASK-080-ico-person-intelligence-frontend.md` |
| `TASK-081` | `complete` | Organization Legal Entity Canonicalization | `docs/tasks/complete/TASK-081-organization-legal-entity-canonicalization.md` |

## Siguiente ID disponible

| `TASK-082` | `in-progress` | Compensation Drawer Chile UX Simplification | `docs/tasks/in-progress/TASK-082-compensation-drawer-chile-ux-simplification.md` |
| `TASK-083` | `in-progress` | Compensation Drawer Enterprise UX Redesign | `docs/tasks/in-progress/TASK-083-compensation-drawer-enterprise-ux-redesign.md` |
| `TASK-084` | `to-do` | Compensation Drawer Manual Mode UX Polish | `docs/tasks/to-do/TASK-084-compensation-drawer-manual-mode-ux-polish.md` |
| `TASK-085` | `in-progress` | Compensation Chile Líquido-First Flow | `docs/tasks/in-progress/TASK-085-compensation-chile-liquido-first-flow.md` |
| `TASK-086` | `complete` | Payroll Current Period View Logic Fix | `docs/tasks/complete/TASK-086-payroll-current-period-view-logic.md` |
| `TASK-087` | `complete` | Payroll Lifecycle Invariants and Readiness Hardening | `docs/tasks/complete/TASK-087-payroll-lifecycle-invariants-and-readiness-hardening.md` |
| `TASK-088` | `complete` | Payroll Reactive Projections and Delivery Hardening | `docs/tasks/complete/TASK-088-payroll-reactive-projections-and-delivery-hardening.md` |
| `TASK-089` | `complete` | Payroll UX Semantics and Feedback Hardening | `docs/tasks/complete/TASK-089-payroll-ux-semantics-and-feedback-hardening.md` |
| `TASK-090` | `complete` | Receipt Branding Efeonce + PDF Template Versioning | `docs/tasks/complete/TASK-090-receipt-branding-and-template-versioning.md` |
| `TASK-091` | `complete` | Greenhouse Operational Calendar Utility | `docs/tasks/complete/TASK-091-greenhouse-operational-calendar-utility.md` |
| `TASK-092` | `complete` | Payroll Operational Current Period Semantics | `docs/tasks/complete/TASK-092-payroll-operational-current-period-semantics.md` |
| `TASK-093` | `complete` | Personnel Expense Data Consistency | `docs/tasks/complete/TASK-093-personnel-expense-data-consistency.md` |
| `TASK-094` | `complete` | Payroll Close and CSV Download Separation | `docs/tasks/complete/TASK-094-payroll-close-and-csv-download-separation.md` |
| `TASK-095` | `complete` | Centralized Email Delivery Layer | `docs/tasks/complete/TASK-095-centralized-email-delivery-layer.md` |
| `TASK-097` | `complete` | Payroll Export Artifact Persistence and Resend | `docs/tasks/complete/TASK-097-payroll-export-artifact-persistence-and-resend.md` |

| `TASK-096` | `complete` | GCP Secret Management & Security Hardening | `docs/tasks/complete/TASK-096-gcp-secret-management-security-hardening.md` |
| `TASK-098` | `complete` | Observability MVP (Sentry + Health + Slack Alerts) | `docs/tasks/complete/TASK-098-observability-mvp.md` |
| `TASK-099` | `complete` | Security Headers & Next.js Proxy | `docs/tasks/complete/TASK-099-security-headers-middleware.md` |
| `TASK-100` | `complete` | CI Pipeline: Add Test Step | `docs/tasks/complete/TASK-100-ci-pipeline-test-step.md` |
| `TASK-101` | `complete` | Cron Auth Standardization | `docs/tasks/complete/TASK-101-cron-auth-standardization.md` |
| `TASK-102` | `complete` | Database Resilience Baseline | `docs/tasks/complete/TASK-102-database-resilience-baseline.md` |
| `TASK-103` | `in-progress` | GCP Budget Alerts & BigQuery Cost Guards | `docs/tasks/in-progress/TASK-103-gcp-budget-alerts-bigquery-guards.md` |
| `TASK-104` | `complete` | Payroll Export Email Redesign | `docs/tasks/complete/TASK-104-payroll-export-email-redesign.md` |
| `TASK-105` | `complete` | Lint Debt Stabilization | `docs/tasks/complete/TASK-105-lint-debt-stabilization.md` |
| `TASK-106` | `complete` | Email Delivery Admin UI | `docs/tasks/complete/TASK-106-email-delivery-admin-ui.md` |
| `TASK-107` | `complete` | Auth Email Verification Request Flow | `docs/tasks/complete/TASK-107-auth-email-verification-request-flow.md` |
| `TASK-108` | `complete` | Admin Center Governance Shell | `docs/tasks/complete/TASK-108-admin-center-governance-shell.md` |
| `TASK-109` | `to-do` | Projected Payroll Runtime Hardening and Observability | `docs/tasks/to-do/TASK-109-projected-payroll-runtime-hardening-observability.md` |
| `TASK-110` | `in-progress` | Nexa: assistant-ui Feature Adoption | `docs/tasks/in-progress/TASK-110-nexa-assistant-ui-features.md` |
| `TASK-111` | `complete` | Admin Center Secret Ref Governance UI | `docs/tasks/complete/TASK-111-admin-center-secret-ref-governance-ui.md` |
| `TASK-112` | `complete` | Admin Center Integration Health and Freshness UI | `docs/tasks/complete/TASK-112-admin-center-integration-health-freshness-ui.md` |
| `TASK-113` | `complete` | Admin Center Ops Audit Trail UI | `docs/tasks/complete/TASK-113-admin-center-ops-audit-trail-ui.md` |
| `TASK-114` | `complete` | Nexa Backend: Persistence, Feedback & Dynamic Suggestions | `docs/tasks/complete/TASK-114-nexa-backend-persistence-suggestions.md` |
| `TASK-115` | `to-do` | Nexa UI: Edit, Suggestions, Feedback, Floating & Thread History | `docs/tasks/to-do/TASK-115-nexa-ui-completion.md` |
| `TASK-116` | `to-do` | Sidebar Navigation Audit & Remediation | `docs/tasks/to-do/TASK-116-sidebar-navigation-audit-remediation.md` |
| `TASK-117` | `complete` | Payroll Last Business Day Auto-Calculation | `docs/tasks/complete/TASK-117-payroll-last-business-day-auto-calculation.md` |
| `TASK-118` | `complete` | ICO AI Core: Embedded Intelligence Layer | `docs/tasks/complete/TASK-118-ico-ai-core-embedded-intelligence.md` |
| `TASK-119` | `complete` | Home Landing Rollout and Navigation Cutover | `docs/tasks/complete/TASK-119-home-landing-rollout-navigation-cutover.md` |
| `TASK-120` | `complete` | Admin Center Governance Follow-on Cutover | `docs/tasks/complete/TASK-120-admin-center-governance-follow-on-cutover.md` |
| `TASK-121` | `complete` | Admin Center Hardening & Scalability | `docs/tasks/complete/TASK-121-admin-center-hardening.md` |
| `TASK-122` | `complete` | Cloud Governance Layer Institutionalization | `docs/tasks/complete/TASK-122-cloud-governance-layer-institutionalization.md` |

## Regla de asignacion desde aqui

Al crear una task nueva o bootstrapear una legacy adicional:

1. tomar el siguiente ID disponible
2. agregarlo a este registro
3. reflejarlo en la task markdown
4. usarlo en el issue `[TASK-###] ...`
5. usarlo en el GitHub Project como `Task ID`

## Siguiente ID disponible

| `TASK-123` | `to-do` | Nexa Product Hardening: Streaming, Rich Tools, UX Polish | `docs/tasks/to-do/TASK-123-nexa-product-hardening.md` |
| `TASK-124` | `complete` | GCP Secret Manager Critical Secrets Migration | `docs/tasks/complete/TASK-124-gcp-secret-manager-critical-secrets-migration.md` |
| `TASK-125` | `complete` | Webhook Activation: First Consumers & E2E Validation | `docs/tasks/complete/TASK-125-webhook-activation-first-consumers.md` |
| `TASK-126` | `to-do` | CSP Enforcement Hardening | `docs/tasks/to-do/TASK-126-csp-enforcement-hardening.md` |
| `TASK-127` | `to-do` | Cloud Architecture Posture Consolidation | `docs/tasks/to-do/TASK-127-cloud-architecture-posture-consolidation.md` |

| `TASK-128` | `to-do` | Webhook Consumers Roadmap: Slack, Cache, Nubox, In-App | `docs/tasks/to-do/TASK-128-webhook-consumers-roadmap.md` |

| `TASK-129` | `complete` | In-App Notifications via Webhook Bus | `docs/tasks/complete/TASK-129-in-app-notifications-via-webhook-bus.md` |

| `TASK-130` | `to-do` | Login Auth Flow UX: Loading States & Transitions | `docs/tasks/to-do/TASK-130-login-auth-flow-ux-feedback.md` |

| `TASK-131` | `complete` | Cloud Health Runtime vs Tooling Posture Separation | `docs/tasks/complete/TASK-131-cloud-health-runtime-tooling-posture-separation.md` |

| `TASK-132` | `complete` | Admin Center: Notification System Landing | `docs/tasks/complete/TASK-132-admin-notification-center-landing.md` |
| `TASK-133` | `complete` | Ops Health: Sentry Incident Surfacing | `docs/tasks/complete/TASK-133-ops-health-sentry-incident-surfacing.md` |
| `TASK-134` | `complete` | Notification Identity Model Hardening | `docs/tasks/complete/TASK-134-notification-identity-model-hardening.md` |
| `TASK-135` | `to-do` | Ops Health Sentry Reactive Refresh | `docs/tasks/to-do/TASK-135-ops-health-sentry-reactive-refresh.md` |

| `TASK-136` | `in-progress` | Admin Center: View Access Governance | `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md` |

| `TASK-137` | `complete` | UI Foundation Activation: RHF, FullCalendar, DatePicker, DnD | `docs/tasks/complete/TASK-137-ui-foundation-activation.md` |

| `TASK-138` | `complete` | Finance Intelligence: Audit Gaps, Notifications & Synergies | `docs/tasks/complete/TASK-138-finance-intelligence-audit-gaps.md` |
| `TASK-139` | `complete` | Finance Module Hardening: Corrections & Data Quality | `docs/tasks/complete/TASK-139-finance-module-hardening.md` |
| `TASK-140` | `complete` | Admin Views Person-First Preview Cutover | `docs/tasks/complete/TASK-140-admin-views-person-first-preview.md` |
| `TASK-141` | `complete` | Canonical Person Identity Consumption | `docs/tasks/complete/TASK-141-canonical-person-identity-consumption.md` |
| `TASK-142` | `complete` | Agency Space 360 View | `docs/tasks/complete/TASK-142-agency-space-360-view.md` |
| `TASK-143` | `complete` | Agency Economics API & View | `docs/tasks/complete/TASK-143-agency-economics-api.md` |
| `TASK-144` | `complete` | Agency Team Dedicated API | `docs/tasks/complete/TASK-144-agency-team-api-dedup.md` |
| `TASK-145` | `complete` | Agency Campaigns API Rescope | `docs/tasks/complete/TASK-145-agency-campaigns-rescope.md` |
| `TASK-146` | `to-do` | Service-Level P&L (Economics per Service) | `docs/tasks/to-do/TASK-146-service-pnl.md` |
| `TASK-147` | `to-do` | Campaign ↔ Service Bridge | `docs/tasks/to-do/TASK-147-campaign-service-bridge.md` |
| `TASK-148` | `to-do` | Agency Outbox Event Emission | `docs/tasks/to-do/TASK-148-agency-outbox-events.md` |
| `TASK-149` | `to-do` | Team Capacity Engine — Alerts & Constraints | `docs/tasks/to-do/TASK-149-capacity-engine-alerts.md` |
| `TASK-150` | `to-do` | Space Health Score — Composite Indicator | `docs/tasks/to-do/TASK-150-space-health-score.md` |
| `TASK-151` | `to-do` | Space Risk Score & Churn Prediction | `docs/tasks/to-do/TASK-151-space-risk-score.md` |
| `TASK-152` | `to-do` | Anomaly Detection Engine — Rule-Based | `docs/tasks/to-do/TASK-152-anomaly-detection-engine.md` |
| `TASK-153` | `to-do` | Capacity Forecast — FTE Projection by Role | `docs/tasks/to-do/TASK-153-capacity-forecast.md` |
| `TASK-154` | `to-do` | Revenue Pipeline Intelligence (HubSpot → Forecast) | `docs/tasks/to-do/TASK-154-revenue-pipeline-intelligence.md` |
| `TASK-155` | `to-do` | Scope Intelligence — Automatic Scope Creep Detection | `docs/tasks/to-do/TASK-155-scope-intelligence.md` |
| `TASK-156` | `complete` | SLI/SLO/SLA Contractual per Service | `docs/tasks/complete/TASK-156-sla-slo-per-service.md` |
| `TASK-157` | `complete` | Skills Matrix + Intelligent Staffing Engine | `docs/tasks/complete/TASK-157-skills-matrix-staffing.md` |
| `TASK-158` | `to-do` | Client Lifecycle Intelligence & Churn Prediction | `docs/tasks/to-do/TASK-158-client-lifecycle-churn.md` |
| `TASK-159` | `to-do` | Nexa Agency Tools — Query, Recommend, Act | `docs/tasks/to-do/TASK-159-nexa-agency-tools.md` |
| `TASK-160` | `to-do` | Agency Enterprise Hardening — Contracts, Observability, Migration | `docs/tasks/to-do/TASK-160-agency-enterprise-hardening.md` |
| `TASK-161` | `to-do` | Agency Permissions, Data Retention & Operational Onboarding | `docs/tasks/to-do/TASK-161-agency-permissions-retention-onboarding.md` |
| `TASK-162` | `complete` | Canonical Commercial Cost Attribution | `docs/tasks/complete/TASK-162-canonical-commercial-cost-attribution.md` |

| `TASK-163` | `complete` | Finance Document Type Separation: Quotes, Credit/Debit Notes | `docs/tasks/complete/TASK-163-finance-document-type-separation.md` |

| `TASK-164` | `complete` | Purchase Orders (OC) & Service Entry Sheets (HES) Module | `docs/tasks/complete/TASK-164-purchase-orders-module.md` |

| `TASK-165` | `complete` | Nubox Full Data Enrichment: All Fields, Line Items, Sync Hardening | `docs/tasks/complete/TASK-165-nubox-full-data-enrichment.md` |
| `TASK-166` | `complete` | Finance BigQuery Write Cutover | `docs/tasks/complete/TASK-166-finance-bigquery-write-cutover.md` |

| `TASK-167` | `to-do` | Operational P&L: Organization Scope Materialization | `docs/tasks/to-do/TASK-167-operational-pl-organization-scope.md` |
| `TASK-168` | `complete` | Person Detail View: Enterprise Redesign | `docs/tasks/complete/TASK-168-person-detail-enterprise-redesign.md` |
| `TASK-169` | `complete` | Staff Aug Placement Bridge & HRIS Runtime Consolidation | `docs/tasks/complete/TASK-169-staff-aug-placement-bridge-hris-runtime-consolidation.md` |
| `TASK-170` | `complete` | Leave Request & Approval Flow | `docs/tasks/complete/TASK-170-leave-request-approval-flow.md` |
| `TASK-171` | `complete` | Access Model Hardening: Route Group Unification, Type Safety & Fallback Strategy | `docs/tasks/complete/TASK-171-access-model-hardening.md` |
| `TASK-172` | `to-do` | Platform Hardening: CI Pipeline, Structured Logging, Test Coverage & Security Headers | `docs/tasks/to-do/TASK-172-platform-hardening-ci-observability-security.md` |
| `TASK-173` | `in-progress` | Shared Attachments Platform and GCP Bucket Governance | `docs/tasks/in-progress/TASK-173-shared-attachments-platform-gcp-governance.md` |
| `TASK-174` | `to-do` | Finance Data Integrity: Transactions, Idempotency & Concurrent Safety | `docs/tasks/to-do/TASK-174-finance-data-integrity-hardening.md` |
| `TASK-175` | `to-do` | Finance Core Test Coverage & Regression Safety Net | `docs/tasks/to-do/TASK-175-finance-core-test-coverage.md` |
| `TASK-176` | `to-do` | Labor Provisions: Fully-Loaded Cost Model Completeness | `docs/tasks/to-do/TASK-176-labor-provisions-fully-loaded-cost.md` |
| `TASK-177` | `to-do` | Operational P&L: Business Unit Scope Materialization | `docs/tasks/to-do/TASK-177-operational-pl-business-unit-scope.md` |
| `TASK-178` | `to-do` | Finance Budget Engine: Budget vs. Actual & Variance Analysis | `docs/tasks/to-do/TASK-178-finance-budget-engine.md` |
| `TASK-179` | `to-do` | Finance Reconciliation Postgres-Only Cutover & Integration Hardening | `docs/tasks/to-do/TASK-179-finance-reconciliation-cutover-hardening.md` |
| `TASK-180` | `complete` | HR Departments Postgres Runtime Cutover | `docs/tasks/complete/TASK-180-hr-departments-postgres-runtime-cutover.md` |
| `TASK-181` | `in-progress` | Finance Clients: Canonical Source Migration to Organizations | `docs/tasks/in-progress/TASK-181-finance-clients-organization-canonical-source.md` |
| `TASK-182` | `complete` | Finance Expense Drawer: Agency Taxonomy, Cross-Module Synergies & Automation | `docs/tasks/complete/TASK-182-finance-expense-drawer-agency-taxonomy.md` |
| `TASK-183` | `complete` | Finance Expenses Reactive Intake & Cost Ledger Hardening | `docs/tasks/complete/TASK-183-finance-expenses-reactive-intake-cost-ledger.md` |
| `TASK-184` | `in-progress` | Database Migration Framework (node-pg-migrate) | `docs/tasks/in-progress/TASK-184-database-migration-framework.md` |
| `TASK-185` | `in-progress` | Database Tooling Foundation (db.ts + Kysely + Migrations) | `docs/tasks/in-progress/TASK-185_Database_Tooling_Foundation.md` |
| `TASK-186` | `complete` | Delivery Metrics Trust: Notion Property Audit & Conformed Contract Hardening | `docs/tasks/complete/TASK-186-delivery-metrics-trust-notion-property-audit-contract.md` |
| `TASK-187` | `complete` | Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness | `docs/tasks/complete/TASK-187-notion-integration-formalization-space-onboarding-schema-governance.md` |
| `TASK-188` | `to-do` | Native Integrations Layer: Platform Governance, Runtime Contracts & Shared Operating Model | `docs/tasks/to-do/TASK-188-native-integrations-layer-platform-governance.md` |
| `TASK-189` | `complete` | ICO Period Filter: Due-Date Anchor & Carry-Over Logic | `docs/tasks/complete/TASK-189-ico-period-filter-due-date-anchor.md` |
| `TASK-190` | `to-do` | Platform Temporal Scope Contract & Cross-Module Time Semantics | `docs/tasks/to-do/TASK-190-platform-temporal-scope-contract-cross-module-parity.md` |
| `TASK-191` | `in-progress` | Finance Organization-First Downstream Consumers Cutover | `docs/tasks/in-progress/TASK-191-finance-organization-first-downstream-consumers-cutover.md` |
| `TASK-192` | `complete` | Finance Org-First Materialized Serving Cutover | `docs/tasks/complete/TASK-192-finance-org-first-materialized-serving-cutover.md` |
| `TASK-193` | `in-progress` | Person ↔ Organization Synergy Activation | `docs/tasks/in-progress/TASK-193-person-organization-synergy-activation.md` |
| `TASK-194` | `to-do` | Expense Payment Ledger Separation | `docs/tasks/to-do/TASK-194-expense-payment-ledger-separation.md` |
| `TASK-195` | `to-do` | Space Identity Consolidation: Organization-First Admin Entry & Space Onboarding | `docs/tasks/to-do/TASK-195-space-identity-consolidation-organization-first-admin.md` |
| `TASK-196` | `complete` | Delivery Performance Report Parity: Greenhouse Canonical Report & Notion Consumption | `docs/tasks/complete/TASK-196-delivery-performance-report-parity-greenhouse-notion.md` |
| `TASK-197` | `complete` | Delivery Source Sync Assignee & Project Relation Parity | `docs/tasks/complete/TASK-197-delivery-source-sync-assignee-project-parity.md` |
| `TASK-198` | `complete` | Delivery Notion Assignee Identity Coverage | `docs/tasks/complete/TASK-198-delivery-notion-assignee-identity-coverage.md` |
| `TASK-199` | `complete` | Delivery Performance Owner Attribution Contract | `docs/tasks/complete/TASK-199-delivery-performance-owner-attribution-contract.md` |
| `TASK-200` | `complete` | Delivery Performance Metric Semantic Contract | `docs/tasks/complete/TASK-200-delivery-performance-metric-semantic-contract.md` |
| `TASK-201` | `complete` | Delivery Performance Historical Materialization Reconciliation | `docs/tasks/complete/TASK-201-delivery-performance-historical-materialization-reconciliation.md` |
| `TASK-202` | `complete` | Delivery Performance Report Publication & Notion Consumption Cutover | `docs/tasks/complete/TASK-202-delivery-performance-notion-publication-cutover.md` |
| `TASK-203` | `complete` | SCIM Provisioning Activation: Entra Config, Identity Reconciliation & Observability | `docs/tasks/complete/TASK-203-scim-provisioning-activation-entra-reconciliation.md` |
| `TASK-204` | `to-do` | Delivery Carry-Over & Overdue Carried Forward Semantic Split | `docs/tasks/to-do/TASK-204-delivery-carry-over-backlog-semantic-split.md` |
| `TASK-205` | `complete` | Delivery Notion Origin Parity Audit | `docs/tasks/complete/TASK-205-delivery-notion-origin-parity-audit.md` |
| `TASK-206` | `to-do` | Delivery Operational Attribution Model | `docs/tasks/to-do/TASK-206-delivery-operational-attribution-model.md` |
| `TASK-207` | `complete` | Delivery Notion Sync Pipeline Hardening & Freshness Gates | `docs/tasks/complete/TASK-207-delivery-notion-sync-pipeline-hardening.md` |
| `TASK-208` | `complete` | Delivery Data Quality Monitoring & Drift Auditor | `docs/tasks/complete/TASK-208-delivery-data-quality-monitoring-auditor.md` |
| `TASK-209` | `in-progress` | Delivery Notion Sync Recurrence Prevention & Orchestration Closure | `docs/tasks/in-progress/TASK-209-delivery-notion-sync-recurrence-prevention.md` |
| `TASK-210` | `to-do` | HubSpot Quotes Bidirectional Integration | `docs/tasks/to-do/TASK-210-hubspot-quotes-integration.md` |
| `TASK-211` | `to-do` | HubSpot Products & Line Items Bidirectional Integration | `docs/tasks/to-do/TASK-211-hubspot-products-line-items-integration.md` |
| `TASK-212` | `to-do` | Nubox Line Items Sync & Multi-Line Emission | `docs/tasks/to-do/TASK-212-nubox-line-items-sync-multiline-emission.md` |
| `TASK-213` | `to-do` | ICO Metrics Hardening Program & Trust Model | `docs/tasks/to-do/TASK-213-ico-metrics-hardening-trust-model.md` |
| `TASK-214` | `complete` | ICO Completion Semantics & Bucket Normalization | `docs/tasks/complete/TASK-214-ico-completion-semantics-bucket-normalization.md` |
| `TASK-215` | `complete` | ICO RpA Reliability, Source Policy & Fallbacks | `docs/tasks/complete/TASK-215-ico-rpa-reliability-source-policy-fallbacks.md` |
| `TASK-216` | `complete` | ICO Metric Trust Model: Benchmark Registry, Quality Gates & Confidence Metadata | `docs/tasks/complete/TASK-216-ico-metric-trust-model-benchmark-quality-gates.md` |
| `TASK-217` | `complete` | Agency KPI Trust Propagation & Serving Semantics | `docs/tasks/complete/TASK-217-agency-kpi-trust-propagation-serving-semantics.md` |
| `TASK-218` | `complete` | ICO Time-to-Market & Activation Evidence Contract | `docs/tasks/complete/TASK-218-ico-time-to-market-activation-evidence-contract.md` |
| `TASK-219` | `complete` | ICO Iteration Velocity & Experimentation Signal Contract | `docs/tasks/complete/TASK-219-ico-iteration-velocity-experimentation-signal-contract.md` |
| `TASK-220` | `complete` | ICO Brief Clarity Score & Intake Governance | `docs/tasks/complete/TASK-220-ico-brief-clarity-score-intake-governance.md` |
| `TASK-221` | `to-do` | Revenue Enabled Measurement Model & Attribution Policy | `docs/tasks/to-do/TASK-221-revenue-enabled-measurement-model-attribution-policy.md` |
| `TASK-222` | `complete` | Creative Velocity Review, Tiered Metric Surfacing & Client Narrative | `docs/tasks/complete/TASK-222-creative-velocity-review-tiered-metric-surfacing.md` |
| `TASK-223` | `complete` | ICO Methodological Accelerators Instrumentation | `docs/tasks/complete/TASK-223-ico-methodological-accelerators-instrumentation.md` |
| `TASK-224` | `in-progress` | Finance Document vs Cash Semantic Contract | `docs/tasks/in-progress/TASK-224-finance-document-vs-cash-semantic-contract.md` |
| `TASK-225` | `in-progress` | Internal Roles, Hierarchies & Approval Ownership Model | `docs/tasks/in-progress/TASK-225-internal-roles-hierarchies-approval-ownership-model.md` |
| `TASK-226` | `to-do` | Superadministrador Bootstrap & Assignment Policy | `docs/tasks/to-do/TASK-226-superadministrador-bootstrap-assignment-policy.md` |
| `TASK-227` | `to-do` | Operational Responsibility Registry | `docs/tasks/to-do/TASK-227-operational-responsibility-registry.md` |
| `TASK-228` | `to-do` | Employee Legacy Role Code Convergence | `docs/tasks/to-do/TASK-228-employee-legacy-role-convergence.md` |
| `TASK-229` | `to-do` | Client View Catalog Deduplication | `docs/tasks/to-do/TASK-229-client-view-catalog-deduplication.md` |
| `TASK-230` | `complete` | Portal Animation Library Integration | `docs/tasks/complete/TASK-230-portal-animation-library-integration.md` |
| `TASK-231` | `complete` | Codex Task Planner Skill | `docs/tasks/complete/TASK-231-codex-task-planner-skill.md` |
| `TASK-232` | `complete` | ICO LLM Quality Scoring & Explanation Pipeline | `docs/tasks/complete/TASK-232-ico-llm-quality-scoring-explanation-pipeline.md` |
| `TASK-233` | `to-do` | Three.js 3D Logo Animation | `docs/tasks/to-do/TASK-233-threejs-3d-logo-animation.md` |
| `TASK-234` | `complete` | Codex Skills: Animation Library Knowledge Sync | `docs/tasks/complete/TASK-234-codex-skills-animation-library-sync.md` |
| `TASK-235` | `to-do` | Agency ICO LLM Insights UI Surfacing | `docs/tasks/to-do/TASK-235-agency-ico-llm-insights-ui.md` |
| `TASK-236` | `to-do` | Agency: Resilience & Feedback Patterns | `docs/tasks/to-do/TASK-236-agency-resilience-feedback-patterns.md` |
| `TASK-237` | `to-do` | Agency ICO Engine Tab: UX Redesign | `docs/tasks/to-do/TASK-237-agency-ico-engine-tab-ux-redesign.md` |
| `TASK-238` | `to-do` | Agency Workspace & Space 360: Data Storytelling UX | `docs/tasks/to-do/TASK-238-agency-workspace-data-storytelling-ux.md` |
| `TASK-239` | `to-do` | Nexa Insights: Prompt Enrichment con Glosario de Métricas y Cadena Causal | `docs/tasks/to-do/TASK-239-nexa-advisory-prompt-enrichment-metric-glossary.md` |
| `TASK-240` | `complete` | Nexa Insights: Menciones Interactivas de Spaces y Miembros | `docs/tasks/complete/TASK-240-nexa-insights-entity-mentions.md` |
| `TASK-241` | `complete` | Migrar procesos batch pesados a Cloud Run | `docs/tasks/complete/TASK-241-batch-processes-cloud-run-migration.md` |
| `TASK-242` | `to-do` | Nexa Insights en Space 360 | `docs/tasks/to-do/TASK-242-nexa-insights-space-360.md` |
| `TASK-243` | `to-do` | Nexa Insights en Person 360 | `docs/tasks/to-do/TASK-243-nexa-insights-person-360.md` |
| `TASK-244` | `to-do` | Nexa Insights Widget en Home Dashboard | `docs/tasks/to-do/TASK-244-nexa-insights-home-dashboard.md` |
| `TASK-245` | `to-do` | Finance Signal Engine | `docs/tasks/to-do/TASK-245-finance-signal-engine.md` |
| `TASK-246` | `to-do` | Narrativa ejecutiva semanal de Nexa | `docs/tasks/to-do/TASK-246-nexa-weekly-executive-digest.md` |
| `TASK-247` | `complete` | Identity & Platform Block Hardening | `docs/tasks/complete/TASK-247-identity-platform-block-hardening.md` |
| `TASK-248` | `complete` | Identity & Access Spec Compliance | `docs/tasks/complete/TASK-248-identity-access-spec-compliance.md` |
| `TASK-249` | `complete` | Test Observability MVP | `docs/tasks/complete/TASK-249-test-observability-mvp.md` |
| `TASK-250` | `to-do` | Payroll Export Email React Key Warning Cleanup | `docs/tasks/to-do/TASK-250-payroll-export-email-react-key-warning.md` |
| `TASK-251` | `to-do` | Reactive Control Plane Backlog Observability & Replay | `docs/tasks/to-do/TASK-251-reactive-control-plane-backlog-observability-replay.md` |
| `TASK-252` | `to-do` | Admin Center Ops Copilot | `docs/tasks/to-do/TASK-252-admin-center-ops-copilot.md` |
| `TASK-254` | `in-progress` | Operational Cron Durable Worker Migration | `docs/tasks/in-progress/TASK-254-operational-cron-durable-worker-migration.md` |
| `TASK-253` | `complete` | Identity Spec Residual Gaps (Approval Snapshot + Audit Events) | `docs/tasks/complete/TASK-253-identity-spec-residual-gaps.md` |
| `TASK-255` | `complete` | Mi Perfil: fix identity chain so profile never shows "Perfil no disponible" | `docs/tasks/complete/TASK-255-mi-perfil-identity-chain-fix.md` |
| `TASK-256` | `complete` | Entra Profile Completeness: avatar sync + identity link for all internal users | `docs/tasks/complete/TASK-256-entra-profile-completeness-avatar-identity-link.md` |
| `TASK-257` | `to-do` | Mi Perfil: enterprise redesign con patron Vuexy User View (sidebar + tabs) | `docs/tasks/to-do/TASK-257-mi-perfil-enterprise-redesign.md` |
| `TASK-258` | `to-do` | Migrar sync-conformed + sync-conformed-recovery a ops-worker | `docs/tasks/to-do/TASK-258-migrate-sync-conformed-to-ops-worker.md` |
| `TASK-259` | `to-do` | Migrar entra-profile-sync a ops-worker | `docs/tasks/to-do/TASK-259-migrate-entra-profile-sync-to-ops-worker.md` |
| `TASK-260` | `to-do` | Migrar nubox-sync + ico-member-sync a ops-worker | `docs/tasks/to-do/TASK-260-migrate-nubox-sync-ico-member-sync-to-ops-worker.md` |
| `TASK-261` | `to-do` | Migrar webhook-dispatch a ops-worker | `docs/tasks/to-do/TASK-261-migrate-webhook-dispatch-to-ops-worker.md` |
| `TASK-262` | `to-do` | Migrar outbox-publish a ops-worker | `docs/tasks/to-do/TASK-262-migrate-outbox-publish-to-ops-worker.md` |
| `TASK-263` | `to-do` | Permission Sets: CRUD enterprise para asignacion de vistas por persona y perfil | `docs/tasks/to-do/TASK-263-permission-sets-enterprise-view-access.md` |
| `TASK-264` | `to-do` | Greenhouse Theme Canonicalization & Kortex Brand Contract | `docs/tasks/to-do/TASK-264-greenhouse-theme-canonicalization-kortex-brand-contract.md` |
| `TASK-265` | `to-do` | Greenhouse Nomenclature, Dictionary & Kortex Copy Contract | `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md` |
| `TASK-266` | `to-do` | Greenhouse i18n & Globalization Activation | `docs/tasks/to-do/TASK-266-greenhouse-i18n-globalization-activation.md` |
| `TASK-267` | `to-do` | Reenviar email de onboarding desde ficha de usuario | `docs/tasks/to-do/TASK-267-admin-resend-onboarding-email.md` |
| `TASK-268` | `to-do` | Boton "Revisar acceso" navega al tab Accesos | `docs/tasks/to-do/TASK-268-admin-review-access-button.md` |
| `TASK-269` | `to-do` | Email Delivery Enterprise Hardening: Context Resolver, i18n, Rate Limit, Bounce Handling | `docs/tasks/to-do/TASK-269-email-delivery-enterprise-hardening.md` |
| `TASK-270` | `to-do` | Admin Email Template Preview: vista integrada para previsualizar y probar templates | `docs/tasks/to-do/TASK-270-admin-email-template-preview.md` |
| `TASK-271` | `to-do` | Soporte de permisos de medio dia (periodos parciales) | `docs/tasks/to-do/TASK-271-hr-leave-half-day-periods.md` |
| `TASK-272` | `to-do` | Mi Perfil: vista rica basada en Vuexy user-profile | `docs/tasks/to-do/TASK-272-my-profile-vuexy-rich-view.md` |
| `TASK-273` | `to-do` | Person Complete 360: capa de serving federada por facetas | `docs/tasks/to-do/TASK-273-person-complete-360-federated-serving-layer.md` |
| `TASK-274` | `in-progress` | Account Complete 360: capa de serving federada por facetas | `docs/tasks/in-progress/TASK-274-account-complete-360-federated-serving-layer.md` |
| `TASK-275` | `to-do` | Notification Dispatch Correlation ID | `docs/tasks/to-do/TASK-275-notification-dispatch-correlation-id.md` |
| `TASK-276` | `to-do` | Upstash Redis: cache distribuido para resolvers 360 | `docs/tasks/to-do/TASK-276-upstash-redis-distributed-cache.md` |
| `TASK-277` | `to-do` | GraphQL API Layer sobre resolvers 360 | `docs/tasks/to-do/TASK-277-graphql-api-layer.md` |
| `TASK-278` | `to-do` | AI Visual Asset Generator: imagenes + animaciones SVG on-demand | `docs/tasks/to-do/TASK-278-ai-visual-asset-generator.md` |
| `TASK-279` | `complete` | Labor Cost Attribution Pipeline: cerrar brecha payroll → client_economics | `docs/tasks/complete/TASK-279-labor-cost-attribution-client-economics-pipeline.md` |
| `TASK-280` | `complete` | Finance Cash Modules: Ingresos (Cobros) y Egresos (Pagos/Desembolsos) | `docs/tasks/complete/TASK-280-finance-cash-modules-ingresos-egresos.md` |
| `TASK-281` | `complete` | Payment Instruments Registry, FX Tracking & Provider Logos | `docs/tasks/complete/TASK-281-payment-instruments-registry-fx-tracking.md` |
| `TASK-282` | `complete` | Finance Payment Instrument Reconciliation & Settlement Orchestration | `docs/tasks/complete/TASK-282-finance-payment-instrument-reconciliation-settlement-orchestration.md` |
| `TASK-283` | `complete` | Finance Bank & Treasury Module: saldos materializados, transferencias internas, coverage, multi-moneda | `docs/tasks/complete/TASK-283-finance-bank-treasury-module.md` |
| `TASK-284` | `complete` | Shareholder Current Account (Cuenta Corriente Accionista): movimientos bidireccionales, saldo neto, integración tesorería | `docs/tasks/complete/TASK-284-shareholder-current-account.md` |
| `TASK-285` | `to-do` | Client Role Differentiation for Globe Enterprise | `docs/tasks/to-do/TASK-285-client-role-differentiation.md` |
| `TASK-286` | `to-do` | Client View Catalog Expansion (10 new view codes) | `docs/tasks/to-do/TASK-286-client-view-catalog-expansion.md` |
| `TASK-287` | `to-do` | Revenue Enabled Standalone View | `docs/tasks/to-do/TASK-287-revenue-enabled-standalone-view.md` |
| `TASK-288` | `to-do` | Reports Center MVP (PDF + CSV export) | `docs/tasks/to-do/TASK-288-reports-center-mvp.md` |
| `TASK-289` | `to-do` | Reviews Split: Client vs Agency Wait | `docs/tasks/to-do/TASK-289-reviews-split-client-vs-agency.md` |
| `TASK-290` | `to-do` | Pipeline CSC Standalone View | `docs/tasks/to-do/TASK-290-pipeline-csc-standalone-view.md` |
| `TASK-291` | `to-do` | Brief Clarity Client View | `docs/tasks/to-do/TASK-291-brief-clarity-client-view.md` |
| `TASK-292` | `to-do` | Mis Revisiones: Personal Review Queue | `docs/tasks/to-do/TASK-292-mis-revisiones-personal-queue.md` |
| `TASK-293` | `to-do` | Campaigns with Performance Metrics | `docs/tasks/to-do/TASK-293-campaigns-performance-metrics.md` |
| `TASK-294` | `to-do` | Novedades: Implementar o Eliminar | `docs/tasks/to-do/TASK-294-novedades-implementation.md` |
| `TASK-295` | `to-do` | SLA & Performance Scorecard | `docs/tasks/to-do/TASK-295-sla-performance-scorecard.md` |
| `TASK-296` | `to-do` | Brand Health Dashboard | `docs/tasks/to-do/TASK-296-brand-health-dashboard.md` |
| `TASK-297` | `to-do` | Asset Tracker: Revision History per Asset | `docs/tasks/to-do/TASK-297-asset-tracker.md` |
| `TASK-298` | `to-do` | QBR Executive Summary | `docs/tasks/to-do/TASK-298-qbr-executive-summary.md` |
| `TASK-299` | `to-do` | Sprints Completion: Burndown & Team Velocity | `docs/tasks/to-do/TASK-299-sprints-completion.md` |
| `TASK-300` | `to-do` | Mi Proyecto Enhanced Drill-down | `docs/tasks/to-do/TASK-300-mi-proyecto-enhanced-drilldown.md` |
| `TASK-301` | `to-do` | Analytics Enrichment: Revenue Enabled Trend & Benchmarking | `docs/tasks/to-do/TASK-301-analytics-enrichment.md` |
| `TASK-302` | `to-do` | Equipo Enhanced: Workload Indicators | `docs/tasks/to-do/TASK-302-equipo-enhanced.md` |
| `TASK-303` | `to-do` | Notifications Role Differentiation | `docs/tasks/to-do/TASK-303-notifications-role-differentiation.md` |
| `TASK-304` | `to-do` | Pulse Revenue Enabled Headline | `docs/tasks/to-do/TASK-304-pulse-revenue-headline.md` |
| `TASK-305` | `complete` | Claude Secret Hygiene Skill | `docs/tasks/complete/TASK-305-claude-secret-hygiene-skill.md` |
| `TASK-306` | `to-do` | Shareholder Account Canonical Traceability & Cross-Module Linkage | `docs/tasks/to-do/TASK-306-shareholder-account-canonical-traceability.md` |
| `TASK-307` | `to-do` | Partnership Schema + Partner Programs Foundation | `docs/tasks/to-do/TASK-307-partnership-schema-partner-programs.md` |
| `TASK-308` | `to-do` | Partnership Revenue Registration | `docs/tasks/to-do/TASK-308-partnership-revenue-registration.md` |
| `TASK-309` | `to-do` | Partnership Serving Views + Dashboard | `docs/tasks/to-do/TASK-309-partnership-serving-views-dashboard.md` |
| `TASK-310` | `to-do` | Partner Cost Tracking + Profitability | `docs/tasks/to-do/TASK-310-partnership-cost-tracking-profitability.md` |
| `TASK-311` | `to-do` | Partner Contacts + Role Label | `docs/tasks/to-do/TASK-311-partnership-contacts-role-label.md` |
| `TASK-312` | `to-do` | Partnership Automation + Alerts | `docs/tasks/to-do/TASK-312-partnership-automation-alerts.md` |
| `TASK-313` | `complete` | Skills y Certificaciones: perfil profesional, verificación Efeonce y CRUD | `docs/tasks/complete/TASK-313-skills-certifications-profile-crud.md` |
| `TASK-314` | `complete` | Talent Profile Enterprise Program | `docs/tasks/complete/TASK-314-talent-profile-enterprise-program.md` |
| `TASK-315` | `to-do` | Talent Taxonomy & Canonical Professional Model | `docs/tasks/to-do/TASK-315-talent-taxonomy-canonical-model.md` |
| `TASK-316` | `complete` | Talent Trust Ops: Verification, Certification Governance & Review Queue | `docs/tasks/complete/TASK-316-talent-trust-ops-verification-governance.md` |
| `TASK-317` | `complete` | Internal Talent Discovery: Search, Filters & Ranking | `docs/tasks/complete/TASK-317-internal-talent-discovery-search-ranking.md` |
| `TASK-318` | `complete` | Client-Safe Verified Talent Profiles | `docs/tasks/complete/TASK-318-client-safe-verified-talent-profiles.md` |
| `TASK-319` | `complete` | Reputation, Evidence & Endorsements for Talent Profiles | `docs/tasks/complete/TASK-319-reputation-evidence-endorsements.md` |
| `TASK-320` | `complete` | Talent Ops Analytics, Completeness & Maintenance Automation | `docs/tasks/complete/TASK-320-talent-ops-analytics-maintenance-automation.md` |
| `TASK-321` | `to-do` | Space 360 View: UI/UX polish y eliminacion de jerga tecnica | `docs/tasks/to-do/TASK-321-space-360-ui-ux-polish.md` |
| `TASK-322` | `to-do` | Enriquecer Cuentas Detail con tabs operativas y deprecar Tenant Detail legacy | `docs/tasks/to-do/TASK-322-admin-tenant-detail-ui-overhaul.md` |
| `TASK-323` | `to-do` | Programa enterprise de jerarquias, supervisoria y permisos de aprobacion | `docs/tasks/to-do/TASK-323-hierarchy-supervisor-approval-program.md` |
| `TASK-324` | `complete` | Modelo canonico de jerarquia de reporte, historial y delegaciones | `docs/tasks/complete/TASK-324-reporting-hierarchy-foundation.md` |
| `TASK-325` | `complete` | Admin de jerarquias: CRUD, reasignaciones y auditoria | `docs/tasks/complete/TASK-325-hierarchy-admin-crud.md` |
| `TASK-326` | `complete` | Autoridad de aprobacion por dominio y snapshots de workflow | `docs/tasks/complete/TASK-326-approval-authority-workflow-snapshots.md` |
| `TASK-327` | `complete` | Supervisor scope: acceso subtree-aware y visibilidad limitada | `docs/tasks/complete/TASK-327-supervisor-scope-subtree-access.md` |
| `TASK-328` | `complete` | Workspace de supervisor: Mi equipo y cola de aprobaciones | `docs/tasks/complete/TASK-328-supervisor-workspace-my-team.md` |
| `TASK-329` | `complete` | Organigrama y explorador de jerarquias | `docs/tasks/complete/TASK-329-org-chart-hierarchy-explorer.md` |
| `TASK-330` | `complete` | Gobernanza de fuentes, sync y drift de jerarquias | `docs/tasks/complete/TASK-330-hierarchy-sync-drift-governance.md` |
| `TASK-331` | `to-do` | Rediseno UX completo de la vista Jerarquia | `docs/tasks/to-do/TASK-331-hierarchy-view-ux-redesign.md` |
| `TASK-332` | `to-do` | Contrato y gobernanza de superficies relacionales | `docs/tasks/to-do/TASK-332-relationship-surface-contract-governance.md` |
| `TASK-333` | `to-do` | Readers compartidos de relaciones para personas, workspaces y admin | `docs/tasks/to-do/TASK-333-shared-relationship-readers.md` |
| `TASK-334` | `to-do` | Superficies relacionales y entry points de administración | `docs/tasks/to-do/TASK-334-relationship-surfaces-admin-ux.md` |
| `TASK-335` | `to-do` | Rediseno UX de la vista Organigrama | `docs/tasks/to-do/TASK-335-org-chart-ux-redesign.md` |
| `TASK-336` | `to-do` | Person ↔ Legal Entity & Executive Economics Program | `docs/tasks/to-do/TASK-336-person-legal-entity-executive-economics-program.md` |
| `TASK-337` | `to-do` | Person ↔ Legal Entity Relationship Runtime Foundation | `docs/tasks/to-do/TASK-337-person-legal-entity-relationship-runtime-foundation.md` |
| `TASK-338` | `to-do` | Compensation Arrangement Canonical Contract & Runtime Foundation | `docs/tasks/to-do/TASK-338-compensation-arrangement-canonical-runtime-foundation.md` |
| `TASK-339` | `to-do` | Shareholder Account Legal Entity Alignment | `docs/tasks/to-do/TASK-339-shareholder-account-legal-entity-alignment.md` |
| `TASK-340` | `to-do` | Compensation Arrangement → Payroll Bridge | `docs/tasks/to-do/TASK-340-compensation-arrangement-payroll-bridge.md` |
| `TASK-341` | `to-do` | Executive Economics 360 Read Model | `docs/tasks/to-do/TASK-341-executive-economics-360-read-model.md` |
| `TASK-342` | `to-do` | Executive Compensation Cost Intelligence Integration | `docs/tasks/to-do/TASK-342-executive-compensation-cost-intelligence-integration.md` |
| `TASK-343` | `complete` | Commercial Quotation Canonical Program | `docs/tasks/complete/TASK-343-commercial-quotation-canonical-program.md` |
| `TASK-344` | `to-do` | Quotation Contract Consolidation & Cutover Policy | `docs/tasks/to-do/TASK-344-quotation-contract-consolidation-cutover-policy.md` |
| `TASK-345` | `to-do` | Quotation Canonical Schema & Finance Compatibility Bridge | `docs/tasks/to-do/TASK-345-quotation-canonical-schema-finance-compatibility-bridge.md` |
| `TASK-346` | `to-do` | Quotation Pricing, Costing & Margin Health Core | `docs/tasks/to-do/TASK-346-quotation-pricing-costing-margin-health-core.md` |
| `TASK-347` | `to-do` | Quotation Catalog & HubSpot Canonical Bridge | `docs/tasks/to-do/TASK-347-quotation-catalog-hubspot-canonical-bridge.md` |
| `TASK-348` | `to-do` | Quotation Governance Runtime: Approvals, Versions, Templates & Audit | `docs/tasks/to-do/TASK-348-quotation-governance-runtime-approvals-versions-templates.md` |
| `TASK-349` | `complete` | Quotation Workspace UI & PDF Delivery | `docs/tasks/complete/TASK-349-quotation-workspace-ui-pdf-delivery.md` |
| `TASK-350` | `to-do` | Quotation-to-Cash Document Chain Bridge | `docs/tasks/to-do/TASK-350-quotation-to-cash-document-chain-bridge.md` |
| `TASK-351` | `to-do` | Quotation Intelligence Automation: Pipeline, Renewals & Profitability | `docs/tasks/to-do/TASK-351-quotation-intelligence-automation-pipeline-renewals-profitability.md` |
| `TASK-352` | `to-do` | Hiring / ATS Canonical Program | `docs/tasks/to-do/TASK-352-hiring-ats-canonical-program.md` |
| `TASK-353` | `to-do` | Hiring / ATS Domain Foundation | `docs/tasks/to-do/TASK-353-hiring-ats-domain-foundation.md` |
| `TASK-354` | `to-do` | Public Careers Landing & Apply Intake | `docs/tasks/to-do/TASK-354-public-careers-landing-apply-intake.md` |
| `TASK-355` | `to-do` | Hiring Desk Internal Workspaces & Publication Governance | `docs/tasks/to-do/TASK-355-hiring-desk-internal-workspaces-publication-governance.md` |
| `TASK-356` | `to-do` | Hiring Handoff, Reactive Signals & Downstream Bridges | `docs/tasks/to-do/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md` |
| `TASK-357` | `to-do` | Assigned Team Canonical Program | `docs/tasks/to-do/TASK-357-assigned-team-canonical-program.md` |
| `TASK-358` | `to-do` | Assigned Team Semantic Layer & Portfolio Readers | `docs/tasks/to-do/TASK-358-assigned-team-semantic-layer-portfolio-readers.md` |
| `TASK-359` | `to-do` | Assigned Team Client Visibility Policy & Field-Level Access | `docs/tasks/to-do/TASK-359-assigned-team-client-visibility-policy-field-access.md` |
| `TASK-360` | `to-do` | Assigned Team Shared UI Primitives & Cards | `docs/tasks/to-do/TASK-360-assigned-team-shared-ui-primitives-cards.md` |
| `TASK-361` | `to-do` | Assigned Team Main Module Runtime | `docs/tasks/to-do/TASK-361-assigned-team-main-module-runtime.md` |
| `TASK-362` | `to-do` | Assigned Team Talent Detail Drawer & Client-Safe Dossier Convergence | `docs/tasks/to-do/TASK-362-assigned-team-talent-detail-drawer-client-safe-dossier.md` |
| `TASK-363` | `to-do` | Assigned Team Capacity Coverage & Health Signals Integration | `docs/tasks/to-do/TASK-363-assigned-team-capacity-health-signals-integration.md` |
| `TASK-364` | `to-do` | Assigned Team Risk, Continuity & Coverage Alerts | `docs/tasks/to-do/TASK-364-assigned-team-risk-continuity-coverage-alerts.md` |
| `TASK-365` | `to-do` | Assigned Team Cross-Surface Consumers | `docs/tasks/to-do/TASK-365-assigned-team-cross-surface-consumers.md` |
| `TASK-366` | `to-do` | Assigned Team Observability, Freshness, Export & Enterprise Hardening | `docs/tasks/to-do/TASK-366-assigned-team-enterprise-hardening-observability-export.md` |
| `TASK-367` | `to-do` | Claude Microinteractions Research & Dual Skill Creation | `docs/tasks/to-do/TASK-367-claude-microinteractions-research-dual-skill-creation.md` |
| `TASK-368` | `complete` | Theme Token Audit & Decision Contract | `docs/tasks/complete/TASK-368-theme-token-audit-decision-contract.md` |
| `TASK-369` | `complete` | Hardcoded Hex Cleanup | `docs/tasks/complete/TASK-369-theme-hardcoded-hex-cleanup.md` |
| `TASK-370` | `complete` | Semantic Token Absorption into Theme | `docs/tasks/complete/TASK-370-semantic-token-absorption-into-theme.md` |
| `TASK-371` | `complete` | Shell Primary Cutover | `docs/tasks/complete/TASK-371-shell-primary-cutover.md` |
| `TASK-372` | `complete` | Kortex Visual Preset Documentation | `docs/tasks/complete/TASK-372-kortex-visual-preset-documentation.md` |
| `TASK-373` | `complete` | Sidebar Reorganization: Density, Icons & Microinteractions | `docs/tasks/complete/TASK-373-sidebar-reorganization-density-microinteractions.md` |
| `TASK-374` | `complete` | Sister Platforms Integration Program | `docs/tasks/complete/TASK-374-sister-platforms-integration-program.md` |
| `TASK-375` | `complete` | Sister Platforms Identity & Tenancy Binding Foundation | `docs/tasks/complete/TASK-375-sister-platforms-identity-tenancy-binding-foundation.md` |
| `TASK-376` | `complete` | Sister Platforms Read-Only External Surface Hardening | `docs/tasks/complete/TASK-376-sister-platforms-read-only-external-surface-hardening.md` |
| `TASK-377` | `to-do` | Kortex Operational Intelligence Bridge | `docs/tasks/to-do/TASK-377-kortex-operational-intelligence-bridge.md` |
| `TASK-378` | `to-do` | Dashboard SSR Error Resilience | `docs/tasks/to-do/TASK-378-dashboard-ssr-error-resilience.md` |
| `TASK-379` | `complete` | Reactive Projections Enterprise Hardening | `docs/tasks/complete/TASK-379-reactive-projections-enterprise-hardening.md` |
| `TASK-380` | `to-do` | Structured Context Layer Foundation | `docs/tasks/to-do/TASK-380-structured-context-layer-foundation.md` |
| `TASK-381` | `to-do` | Structured Context Layer Enterprise Hardening | `docs/tasks/to-do/TASK-381-structured-context-layer-enterprise-hardening.md` |
| `TASK-382` | `complete` | Email System Enterprise Hardening | `docs/tasks/complete/TASK-382-email-system-enterprise-hardening.md` |
| `TASK-383` | `to-do` | Email Observabilidad | `docs/tasks/to-do/TASK-383-email-observabilidad.md` |
| `TASK-384` | `to-do` | Email Compliance & Retención GDPR | `docs/tasks/to-do/TASK-384-email-compliance-retencion.md` |
| `TASK-385` | `to-do` | Email Scaling Cloud Run | `docs/tasks/to-do/TASK-385-email-scaling-cloud-run.md` |
| `TASK-386` | `to-do` | Notificaciones In-App Real-Time SSE | `docs/tasks/to-do/TASK-386-notifications-realtime-sse.md` |
| `TASK-387` | `to-do` | Notificaciones In-App Agrupación y Digest | `docs/tasks/to-do/TASK-387-notifications-agrupacion-digest.md` |
| `TASK-388` | `to-do` | Notificaciones In-App Acciones Inline | `docs/tasks/to-do/TASK-388-notifications-acciones-inline.md` |
| `TASK-389` | `to-do` | Notificaciones In-App Retención y Purga | `docs/tasks/to-do/TASK-389-notifications-retencion-purga.md` |
| `TASK-390` | `to-do` | Notificaciones In-App Broadcast Admin | `docs/tasks/to-do/TASK-390-notifications-broadcast-admin.md` |
| `TASK-391` | `to-do` | Finance Factoring Operations | `docs/tasks/to-do/TASK-391-finance-factoring-operations.md` |
| `TASK-392` | `to-do` | Management Accounting Reliable Actual Foundation Program | `docs/tasks/to-do/TASK-392-management-accounting-reliable-actual-foundation-program.md` |
| `TASK-393` | `to-do` | Management Accounting Period Governance, Restatements & Reclassification | `docs/tasks/to-do/TASK-393-management-accounting-period-governance-restatements-reclassification.md` |
| `TASK-394` | `to-do` | Management Accounting Scope Expansion: BU, Legal Entity & Intercompany | `docs/tasks/to-do/TASK-394-management-accounting-scope-expansion-bu-legal-entity-intercompany.md` |
| `TASK-395` | `to-do` | Management Accounting Planning Engine: Budgets, Drivers & Approval Governance | `docs/tasks/to-do/TASK-395-management-accounting-planning-engine-budgets-drivers-approval-governance.md` |
| `TASK-396` | `to-do` | Management Accounting Variance, Forecast & Executive Control Tower | `docs/tasks/to-do/TASK-396-management-accounting-variance-forecast-executive-control-tower.md` |
| `TASK-397` | `to-do` | Management Accounting Financial Costs Integration: Factoring, FX, Fees & Treasury | `docs/tasks/to-do/TASK-397-management-accounting-financial-costs-integration-factoring-fx-fees-treasury.md` |
| `TASK-398` | `to-do` | Management Accounting Enterprise Hardening: Explainability, RBAC, Observability & Runbooks | `docs/tasks/to-do/TASK-398-management-accounting-enterprise-hardening-explainability-rbac-observability-runbooks.md` |
| `TASK-399` | `to-do` | Native Integrations Runtime Hardening: Source Adapters, Control Plane & Replay Governance | `docs/tasks/to-do/TASK-399-native-integrations-runtime-hardening-source-adapters-control-plane-replay.md` |
| `TASK-400` | `complete` | Portal Home Contract Governance, Entrypoint Cutover & Dashboard Compatibility | `docs/tasks/complete/TASK-400-portal-home-contract-governance-entrypoint-cutover.md` |
| `TASK-401` | `to-do` | Bank Reconciliation: Continuous Transaction Matching | `docs/tasks/to-do/TASK-401-bank-reconciliation-continuous-matching.md` |
| `TASK-402` | `to-do` | Universal Adaptive Home Orchestration | `docs/tasks/to-do/TASK-402-universal-adaptive-home-orchestration.md` |
| `TASK-403` | `complete` | Entitlements Runtime Foundation & Home Bridge | `docs/tasks/complete/TASK-403-entitlements-runtime-foundation-home-bridge.md` |
| `TASK-404` | `complete` | Entitlements Governance Admin Center | `docs/tasks/complete/TASK-404-entitlements-governance-admin-center.md` |
| `TASK-405` | `complete` | Reconcile `main` into `develop` for Kortex Identity Bridge | `docs/tasks/complete/TASK-405-reconcile-main-into-develop-kortex-identity.md` |
| `TASK-406` | `complete` | Promote Reconciled Kortex Identity Bridge to `main` | `docs/tasks/complete/TASK-406-promote-kortex-identity-bridge-to-main.md` |
| `TASK-409` | `complete` | Payroll Reliquidación Program | `docs/tasks/complete/TASK-409-payroll-reliquidation-program.md` |
| `TASK-410` | `complete` | Payroll Period Reopen Foundation & Entry Versioning | `docs/tasks/complete/TASK-410-payroll-period-reopen-foundation-versioning.md` |
| `TASK-411` | `complete` | Payroll Reliquidación Finance Delta Consumer | `docs/tasks/complete/TASK-411-payroll-reliquidation-finance-delta-consumer.md` |
| `TASK-412` | `complete` | Payroll Reliquidación Admin UI, Preview & Audit Trail | `docs/tasks/complete/TASK-412-payroll-reliquidation-admin-ui-preview-audit.md` |
| `TASK-413` | `to-do` | Kortex Identity Bridge Hardening & Contract Closure | `docs/tasks/to-do/TASK-413-kortex-identity-bridge-hardening.md` |
| `TASK-414` | `to-do` | Payroll Reopen Policy Engine & Hardening | `docs/tasks/to-do/TASK-414-payroll-reopen-policy-engine-hardening.md` |
| `TASK-415` | `complete` | HR Leave Balance Visibility, Admin Backfill & Manual Adjustments | `docs/tasks/complete/TASK-415-hr-leave-balance-admin-backfill.md` |
| `TASK-416` | `to-do` | Finance Metric Registry Foundation | `docs/tasks/to-do/TASK-416-finance-metric-registry-foundation.md` |
| `TASK-417` | `to-do` | Finance Metric Registry Reader Primitives | `docs/tasks/to-do/TASK-417-finance-metric-registry-reader-primitives.md` |
| `TASK-418` | `to-do` | Finance Signal Engine Cutover to Registry | `docs/tasks/to-do/TASK-418-finance-signal-engine-registry-cutover.md` |
| `TASK-419` | `to-do` | Finance Dashboard Cutover to Registry | `docs/tasks/to-do/TASK-419-finance-dashboard-registry-cutover.md` |
| `TASK-420` | `to-do` | Cost Intelligence Consumer Cutover to Registry | `docs/tasks/to-do/TASK-420-cost-intelligence-registry-cutover.md` |
| `TASK-421` | `to-do` | Finance Metric Targets Editable + Effective-Dating (v2) | `docs/tasks/to-do/TASK-421-finance-metric-targets-editable-effective-dating.md` |
| `TASK-422` | `to-do` | Finance Metric Quality Gates Runtime + Stale Data UX (v2) | `docs/tasks/to-do/TASK-422-finance-metric-quality-gates-stale-data-ux.md` |
| `TASK-423` | `to-do` | Finance Metric Per-Scope Thresholds (v2) | `docs/tasks/to-do/TASK-423-finance-metric-per-scope-thresholds.md` |
| `TASK-424` | `to-do` | Finance Metric LLM Glossary Prompt Scoping (v2) | `docs/tasks/to-do/TASK-424-finance-metric-llm-glossary-prompt-scoping.md` |
| `TASK-425` | `to-do` | Finance Metric Dependency DAG Runtime Propagation (v2) | `docs/tasks/to-do/TASK-425-finance-metric-dependency-dag-runtime-propagation.md` |
| `TASK-426` | `to-do` | Finance Metric Cross-Domain References (v2) | `docs/tasks/to-do/TASK-426-finance-metric-cross-domain-references.md` |
| `TASK-427` | `to-do` | Finance Metric Registry Sharding (trigger-based) | `docs/tasks/to-do/TASK-427-finance-metric-registry-sharding.md` |
| `TASK-407` | `to-do` | Copy Migration: Shared Shell + Components (split de TASK-265) | `docs/tasks/to-do/TASK-407-copy-migration-shared-shell-components.md` |
| `TASK-408` | `to-do` | Copy Migration: Notification Categories + Institutional Emails (split de TASK-265) | `docs/tasks/to-do/TASK-408-copy-migration-notifications-emails.md` |
| `TASK-428` | `to-do` | i18n Architecture Decision (library + routing + locales) — child de TASK-266 | `docs/tasks/to-do/TASK-428-i18n-architecture-decision.md` |
| `TASK-429` | `to-do` | Locale-Aware Formatting Utilities — child de TASK-266 | `docs/tasks/to-do/TASK-429-locale-aware-formatting-utilities.md` |
| `TASK-430` | `to-do` | Dictionary Foundation Activation — child de TASK-266 | `docs/tasks/to-do/TASK-430-dictionary-foundation-activation.md` |
| `TASK-431` | `to-do` | Tenant + User Locale Persistence Model — child de TASK-266 | `docs/tasks/to-do/TASK-431-tenant-user-locale-persistence.md` |
| `TASK-432` | `to-do` | Client Portal Nexa Pulse (Client-Facing Insights) | `docs/tasks/to-do/TASK-432-client-portal-nexa-pulse.md` |
| `TASK-433` | `to-do` | Payroll Signal Engine | `docs/tasks/to-do/TASK-433-payroll-signal-engine.md` |
| `TASK-434` | `to-do` | Staff Augmentation Assignment Economics Signal Engine | `docs/tasks/to-do/TASK-434-staff-augmentation-signal-engine.md` |
| `TASK-435` | `to-do` | Nexa Actionable Insights (CTA Contract) | `docs/tasks/to-do/TASK-435-nexa-actionable-insights-cta-contract.md` |
| `TASK-436` | `to-do` | Nexa Critical Push Distribution (Slack / Teams) | `docs/tasks/to-do/TASK-436-nexa-critical-push-distribution.md` |
| `TASK-437` | `to-do` | Nexa Cross-Domain Causality Engine | `docs/tasks/to-do/TASK-437-nexa-cross-domain-causality.md` |
| `TASK-438` | `to-do` | Nexa Contextual Chat Per Domain (Copilot by Surface) | `docs/tasks/to-do/TASK-438-nexa-contextual-chat-per-domain.md` |
| `TASK-439` | `to-do` | Nexa Daily Role-Based Briefing | `docs/tasks/to-do/TASK-439-nexa-daily-role-based-briefing.md` |
| `TASK-440` | `in-progress` | Nexa Insights Project Label Resolution | `docs/tasks/in-progress/TASK-440-nexa-project-label-resolution.md` |
| `TASK-441` | `to-do`       | Nexa Mentions Resolver + Allowlist + Sanitization | `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md` |
| `TASK-442` | `to-do`       | Nexa Mentions Registry + Entity Expansion | `docs/tasks/to-do/TASK-442-nexa-mentions-registry-entity-expansion.md` |
| `TASK-443` | `to-do`       | Nexa Thread Chat Mention Rendering (Quick Win) | `docs/tasks/to-do/TASK-443-nexa-thread-chat-mention-rendering.md` |
| `TASK-444` | `to-do`       | Nexa Mentions Input Autocomplete | `docs/tasks/to-do/TASK-444-nexa-mentions-input-autocomplete.md` |
| `TASK-445` | `to-do`       | Nexa Mentions Accessibility, Tests & Tombstone | `docs/tasks/to-do/TASK-445-nexa-mentions-a11y-tests-tombstone.md` |
| `TASK-446` | `complete`    | Nexa Insights Root Cause Narrative Surfacing (Insights Quick Win) | `docs/tasks/complete/TASK-446-nexa-insights-root-cause-narrative-surfacing.md` |
| `TASK-447` | `to-do`       | Nexa Insights Mention Hover Preview Cards | `docs/tasks/to-do/TASK-447-nexa-insights-mention-hover-preview-cards.md` |
| `TASK-448` | `to-do`       | Nexa Insights Mention Reverse Index + Entity Filter | `docs/tasks/to-do/TASK-448-nexa-insights-mention-reverse-index-filter.md` |
| `TASK-449` | `to-do`       | Nexa Insights Interaction Layer (Read / Pin / Dismiss / Share) | `docs/tasks/to-do/TASK-449-nexa-insights-interaction-layer.md` |
| `TASK-450` | `to-do`       | Agency ICO Serving & Performance Hardening | `docs/tasks/to-do/TASK-450-agency-ico-serving-performance-hardening.md` |
| `TASK-451` | `complete`    | Blindar `password_hash` contra rotaciones automáticas de batch/sync | `docs/tasks/complete/TASK-451-password-hash-mutation-guardrails.md` |
| `TASK-452` | `to-do`       | Service Attribution Foundation | `docs/tasks/to-do/TASK-452-service-attribution-foundation.md` |
| `TASK-453` | `to-do`       | Deal Canonicalization & Commercial Bridge | `docs/tasks/to-do/TASK-453-deal-canonicalization-commercial-bridge.md` |
| `TASK-454` | `to-do`       | HubSpot lifecyclestage sync on canonical Company | `docs/tasks/to-do/TASK-454-lifecyclestage-sync-company-contact.md` |
| `TASK-455` | `to-do`       | Quote Sales Context Snapshot | `docs/tasks/to-do/TASK-455-quote-sales-context-snapshot.md` |
| `TASK-456` | `to-do`       | Deal Pipeline Snapshots Projection | `docs/tasks/to-do/TASK-456-deal-pipeline-snapshots-projection.md` |
| `TASK-457` | `to-do`       | UI Revenue Pipeline Hybrid | `docs/tasks/to-do/TASK-457-ui-revenue-pipeline-hybrid.md` |
| `TASK-458` | `to-do`       | Honest-label quick fix — reframe "Pipeline" sub-tab (TASK-351 follow-up) | `docs/tasks/to-do/TASK-458-honest-label-pipeline-fix.md` |
| `TASK-459` | `to-do`       | Delivery Model Refinement (commercial + staffing orthogonal) | `docs/tasks/to-do/TASK-459-delivery-model-refinement.md` |
| `TASK-460` | `complete`    | Contract/SOW Canonical Entity & Lifecycle | `docs/tasks/complete/TASK-460-contract-sow-canonical-entity.md` |
| `TASK-461` | `complete` | MSA Umbrella Entity & Clause Library | `docs/tasks/complete/TASK-461-msa-umbrella-clause-library.md` |
| `TASK-462` | `to-do`       | MRR/ARR Contractual Projection & Dashboard | `docs/tasks/to-do/TASK-462-mrr-arr-contractual-projection-dashboard.md` |
| `TASK-463` | `to-do`       | Unified Quote Builder + Bidirectional HubSpot Bridge | `docs/tasks/to-do/TASK-463-unified-quote-builder-hubspot-bidirectional.md` |
| `TASK-464a` | `to-do`      | Sellable Roles Catalog Canonical + Seed | `docs/tasks/to-do/TASK-464a-sellable-roles-catalog-canonical.md` |
| `TASK-464b` | `to-do`      | Pricing Governance Tables (tiers + commercial models + country factors + FTE) | `docs/tasks/to-do/TASK-464b-pricing-governance-tables.md` |
| `TASK-464c` | `complete` | Tool Catalog Extension + Overhead Addons Canonical | `docs/tasks/complete/TASK-464c-tool-catalog-extension-overhead-addons.md` |
| `TASK-464d` | `to-do`      | Pricing Engine Full-Model Refactor (v2) | `docs/tasks/to-do/TASK-464d-pricing-engine-full-model-refactor.md` |
| `TASK-464e` | `to-do`      | Quote Builder UI Exposure (role/tool/addon pickers + gated cost stack) | `docs/tasks/to-do/TASK-464e-quote-builder-ui-exposure.md` |
| `TASK-465` | `in-progress` | Service Composition Catalog + Admin UI + Quote Picker | `docs/tasks/in-progress/TASK-465-service-composition-catalog-ui.md` |
| `TASK-466` | `to-do`       | Multi-Currency Quote Output (client view + PDF + email) | `docs/tasks/to-do/TASK-466-multi-currency-quote-output.md` |
| `TASK-467` | `to-do`       | Pricing Catalog Admin UI (self-service CRUD) | `docs/tasks/to-do/TASK-467-pricing-catalog-admin-ui.md` |
| `TASK-468` | `to-do`       | Payroll ↔ Commercial Employment Types Unification | `docs/tasks/to-do/TASK-468-payroll-commercial-employment-types-unification.md` |
| `TASK-469` | `complete`    | Commercial Pricing Program — UI Interface Plan & Vuexy Component Inventory | `docs/tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md` |
| `TASK-470` | `complete`    | Pricing Catalog Enterprise Hardening (Concurrency + Validation + Impact + Overcommit) | `docs/tasks/complete/TASK-470-pricing-catalog-enterprise-hardening.md` |
| `TASK-471` | `to-do`       | Pricing Catalog Phase-4 UI Polish (Diff + Revert + Bulk + Impact + Maker-Checker + Excel) | `docs/tasks/to-do/TASK-471-pricing-catalog-phase-4-ui-polish.md` |
| `TASK-472` | `to-do`       | Fix `/my/profile` SSR 500 in staging (resuelve ISSUE-054) | `docs/tasks/to-do/TASK-472-my-profile-ssr-500-fix.md` |
| `TASK-473` | `to-do`       | Quote Builder Full-Page Surface Migration & Flow Recomposition | `docs/tasks/to-do/TASK-473-quote-builder-full-page-surface-migration.md` |
| `TASK-474` | `to-do`       | Quote Builder Catalog / Service Reconnection Pass | `docs/tasks/to-do/TASK-474-quote-builder-catalog-reconnection-pass.md` |
| `TASK-475` | `complete` | Greenhouse FX & Currency Platform Foundation | `docs/tasks/complete/TASK-475-greenhouse-fx-currency-platform-foundation.md` |
| `TASK-476` | `to-do`       | Commercial Cost Basis Program | `docs/tasks/to-do/TASK-476-commercial-cost-basis-program.md` |
| `TASK-477` | `to-do`       | Role Cost Assumptions Catalog & Effective-Dated Modeling | `docs/tasks/to-do/TASK-477-role-cost-assumptions-catalog.md` |
| `TASK-478` | `complete`    | Tool & Provider Cost Basis Snapshots | `docs/tasks/complete/TASK-478-tool-provider-cost-basis-snapshots.md` |
| `TASK-479` | `to-do`       | People Actual Cost + Blended Role Cost Snapshots | `docs/tasks/to-do/TASK-479-people-actual-cost-blended-role-snapshots.md` |
| `TASK-480` | `to-do`       | Pricing Engine Cost Resolver, Provenance & Confidence | `docs/tasks/to-do/TASK-480-pricing-engine-cost-resolver-provenance-confidence.md` |
| `TASK-481` | `to-do`       | Quote Builder Suggested Cost UX & Override Governance | `docs/tasks/to-do/TASK-481-quote-builder-suggested-cost-override-governance.md` |
| `TASK-482` | `to-do`       | Quoted vs Actual Margin Feedback Loop | `docs/tasks/to-do/TASK-482-quoted-vs-actual-margin-feedback-loop.md` |
| `TASK-483` | `complete` | Commercial Cost Basis Engine Runtime Topology & Worker Foundation | `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md` |
| `TASK-484` | `complete`    | FX Provider Adapter Platform | `docs/tasks/complete/TASK-484-fx-provider-adapter-platform.md` |
| `TASK-485` | `to-do`       | FX Coverage Rollout (manual_only → auto_synced) | `docs/tasks/to-do/TASK-485-fx-coverage-rollout.md` |
| `TASK-486` | `complete`    | Commercial Quotation Canonical Anchor (Organization + Contact) | `docs/tasks/complete/TASK-486-commercial-quotation-canonical-anchor.md` |
| `TASK-487` | `complete` | Quote Builder Command Bar Redesign (Enterprise Pattern) | `docs/tasks/complete/TASK-487-quote-builder-command-bar-redesign.md` |
| `TASK-488` | `complete` | Design Tokens + UI Governance Hardening | `docs/tasks/complete/TASK-488-design-tokens-ui-governance-hardening.md` |
| `TASK-489` | `to-do` | Document Registry & Versioning Foundation (EPIC-001) | `docs/tasks/to-do/TASK-489-document-registry-versioning-foundation.md` |
| `TASK-490` | `to-do` | Signature Orchestration Foundation (EPIC-001) | `docs/tasks/to-do/TASK-490-signature-orchestration-foundation.md` |
| `TASK-491` | `to-do` | ZapSign Adapter + Webhook Convergence (EPIC-001) | `docs/tasks/to-do/TASK-491-zapsign-adapter-webhook-convergence.md` |
| `TASK-492` | `to-do` | Document Manager, Access Model & UI Foundation (EPIC-001) | `docs/tasks/to-do/TASK-492-document-manager-access-model-ui-foundation.md` |
| `TASK-493` | `to-do` | Document Rendering & Template Catalog Foundation (EPIC-001) | `docs/tasks/to-do/TASK-493-document-rendering-template-catalog-foundation.md` |
| `TASK-494` | `to-do` | HR Document Vault Convergence (EPIC-001) | `docs/tasks/to-do/TASK-494-hr-document-vault-convergence.md` |
| `TASK-495` | `to-do` | Commercial & Legal Document Chain Convergence (EPIC-001) | `docs/tasks/to-do/TASK-495-commercial-legal-document-chain-convergence.md` |
| `TASK-496` | `complete` | Quote Builder Deep Polish Sprint 1 | `docs/tasks/complete/TASK-496-quote-builder-deep-polish-sprint-1.md` |
| `TASK-497` | `to-do` | Quote Builder Autosave + react-hook-form Migration (Sprint 2) | `docs/tasks/to-do/TASK-497-quote-builder-autosave-react-hook-form.md` |
| `TASK-498` | `to-do` | UI Primitives Platform Extraction (Sprint 3) | `docs/tasks/to-do/TASK-498-ui-primitives-platform-extraction.md` |
| `TASK-499` | `to-do` | Quote Builder Polish Backlog (audit remanente) | `docs/tasks/to-do/TASK-499-quote-builder-polish-backlog.md` |
| `TASK-500` | `complete` | Quote Builder Quantity↔Periods Sync + EmpType Dropdown | `docs/tasks/complete/TASK-500-quote-builder-quantity-periods-sync.md` |
| `TASK-501` | `complete` | Quote Builder Unit Price UX + Fresh Simulate-on-Save | `docs/tasks/complete/TASK-501-quote-builder-unit-price-ux-and-fresh-simulate.md` |
| `TASK-502` | `complete` | Fix Role Double-Count + Derived Unit Price + Read-Only Catalog Prices | `docs/tasks/complete/TASK-502-quote-role-double-count-and-derived-unit-price.md` |
| `TASK-503` | `complete` | Quote Addon Toggle = Line Item (autoResolveAddons: 'internal_only') | `docs/tasks/complete/TASK-503-quote-addon-toggle-as-line-items.md` |
| `TASK-504` | `complete` | Commercial Quotation Issuance Lifecycle & Approval-by-Exception | `docs/tasks/complete/TASK-504-commercial-quotation-issued-lifecycle-approval-by-exception.md` |
| `TASK-505` | `complete` | Quote Summary Dock v2 — Enterprise Hierarchy + Primitives | `docs/tasks/complete/TASK-505-quote-summary-dock-v2-hierarchy.md` |
| `TASK-506` | `complete` | Quote Builder Dock: CTA simplification + addons chip amount | `docs/tasks/complete/TASK-506-dock-cta-simplification.md` |
| `TASK-507` | `complete` | Addons inline en la TotalsLadder (zone 3 = CTA-only) | `docs/tasks/complete/TASK-507-addons-inline-ladder.md` |
| `TASK-508` | `complete` | Line row polish: chip consolidation + warning inline + density | `docs/tasks/complete/TASK-508-line-row-polish.md` |
