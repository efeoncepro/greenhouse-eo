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
| `TASK-025` | `deferred`       | `CODEX_TASK_HR_Payroll_Module_v2_DELTA_FTR`                        | `docs/tasks/to-do/TASK-025-hr-payroll-module-delta-ftr.md`              |
| `TASK-026` | `complete`       | `CODEX_TASK_HRIS_Contract_Type_Consolidation`                      | `docs/tasks/complete/TASK-026-hris-contract-type-consolidation.md`      |
| `TASK-027` | `to-do`          | `CODEX_TASK_HRIS_Document_Vault`                                   | `docs/tasks/to-do/TASK-027-hris-document-vault.md`                      |
| `TASK-028` | `to-do`          | `CODEX_TASK_HRIS_Expense_Reports`                                  | `docs/tasks/to-do/TASK-028-hris-expense-reports.md`                     |
| `TASK-029` | `to-do`          | `CODEX_TASK_HRIS_Goals_OKRs`                                       | `docs/tasks/to-do/TASK-029-hris-goals-okrs.md`                          |
| `TASK-030` | `to-do`          | `CODEX_TASK_HRIS_Onboarding_Offboarding`                           | `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`              |
| `TASK-031` | `to-do`          | `CODEX_TASK_HRIS_Performance_Evaluations`                          | `docs/tasks/to-do/TASK-031-hris-performance-evaluations.md`             |
| `TASK-032` | `to-do`          | Login Dark Mode Polish                                             | `docs/tasks/to-do/TASK-032-login-dark-mode-polish.md`                   |
| `TASK-033` | `to-do`          | `CODEX_TASK_Campaign_360` (brief historico)                        | `docs/tasks/to-do/TASK-033-campaign-360-brief.md`                       |
| `TASK-034` | `to-do`          | `CODEX_TASK_Business_Units_Canonical` (brief historico)            | `docs/tasks/to-do/TASK-034-business-units-canonical-brief.md`           |
| `TASK-035` | `to-do`          | `CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline` (brief historico) | `docs/tasks/to-do/TASK-035-frameio-analytics-brief.md`                  |
| `TASK-036` | `to-do`          | `CODEX_TASK_Greenhouse_Home_Nexa` (brief historico)                | `docs/tasks/to-do/TASK-036-greenhouse-home-nexa-brief.md`               |
| `TASK-037` | `complete`       | `CODEX_TASK_SCIM_User_Provisioning` (brief historico)              | `docs/tasks/to-do/TASK-037-scim-user-provisioning-brief.md`             |
| `TASK-038` | `complete`       | `CODEX_TASK_Staff_Augmentation_Module` (brief historico absorbido) | `docs/tasks/complete/TASK-038-staff-augmentation-module-brief.md`       |
| `TASK-039` | `to-do`          | `Greenhouse_Data_Node_Architecture_v1` (supporting spec)           | `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`                |
| `TASK-040` | `to-do`          | `Greenhouse_Data_Node_Architecture_v2` (supporting spec)           | `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`                |

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
| `TASK-118` | `to-do` | ICO AI Core: Embedded Intelligence Layer | `docs/tasks/to-do/TASK-118-ico-ai-core-embedded-intelligence.md` |
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
| `TASK-143` | `to-do` | Agency Economics API & View | `docs/tasks/to-do/TASK-143-agency-economics-api.md` |
| `TASK-144` | `to-do` | Agency Team Dedicated API | `docs/tasks/to-do/TASK-144-agency-team-api-dedup.md` |
| `TASK-145` | `to-do` | Agency Campaigns API Rescope | `docs/tasks/to-do/TASK-145-agency-campaigns-rescope.md` |
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
| `TASK-156` | `to-do` | SLA/SLO Contractual per Service | `docs/tasks/to-do/TASK-156-sla-slo-per-service.md` |
| `TASK-157` | `to-do` | Skills Matrix + Intelligent Staffing Engine | `docs/tasks/to-do/TASK-157-skills-matrix-staffing.md` |
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
| `TASK-222` | `to-do` | Creative Velocity Review, Tiered Metric Surfacing & Client Narrative | `docs/tasks/to-do/TASK-222-creative-velocity-review-tiered-metric-surfacing.md` |
| `TASK-223` | `to-do` | ICO Methodological Accelerators Instrumentation | `docs/tasks/to-do/TASK-223-ico-methodological-accelerators-instrumentation.md` |
| `TASK-224` | `in-progress` | Finance Document vs Cash Semantic Contract | `docs/tasks/in-progress/TASK-224-finance-document-vs-cash-semantic-contract.md` |
| `TASK-225` | `in-progress` | Internal Roles, Hierarchies & Approval Ownership Model | `docs/tasks/in-progress/TASK-225-internal-roles-hierarchies-approval-ownership-model.md` |
| `TASK-226` | `to-do` | Superadministrador Bootstrap & Assignment Policy | `docs/tasks/to-do/TASK-226-superadministrador-bootstrap-assignment-policy.md` |
