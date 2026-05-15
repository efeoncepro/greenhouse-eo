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
| `TASK-030` | `complete`       | `CODEX_TASK_HRIS_Onboarding_Offboarding`                           | `docs/tasks/complete/TASK-030-hris-onboarding-offboarding.md`           |
| `TASK-031` | `to-do`          | `HRIS Performance Evaluations`                                     | `docs/tasks/to-do/TASK-031-hris-performance-evaluations.md`             |
| `TASK-032` | `to-do`          | Login Dark Mode Polish                                             | `docs/tasks/to-do/TASK-032-login-dark-mode-polish.md`                   |
| `TASK-033` | `reference`      | `CODEX_TASK_Campaign_360` (brief historico)                        | `docs/tasks/briefs/TASK-033-campaign-360-brief.md`                      |
| `TASK-034` | `reference`      | `CODEX_TASK_Business_Units_Canonical` (brief historico)            | `docs/tasks/briefs/TASK-034-business-units-canonical-brief.md`          |
| `TASK-035` | `reference`      | `CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline` (brief historico) | `docs/tasks/briefs/TASK-035-frameio-analytics-brief.md`                 |
| `TASK-036` | `reference`      | `CODEX_TASK_Greenhouse_Home_Nexa` (brief historico)                | `docs/tasks/briefs/TASK-036-greenhouse-home-nexa-brief.md`              |
| `TASK-037` | `complete`       | `CODEX_TASK_SCIM_User_Provisioning` (brief historico)              | `docs/tasks/to-do/TASK-037-scim-user-provisioning-brief.md`             |
| `TASK-038` | `complete`       | `CODEX_TASK_Staff_Augmentation_Module` (brief historico absorbido) | `docs/tasks/complete/TASK-038-staff-augmentation-module-brief.md`       |
| `TASK-039` | `reference`      | `Data Node Product Vision (Legacy Reference)`                      | `docs/tasks/briefs/TASK-039-data-node-architecture-v1.md`               |
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
| `TASK-103` | `complete` (superseded 2026-05-05 — Billing Export Observability canónico) | GCP Budget Alerts & BigQuery Cost Guards | `docs/tasks/complete/TASK-103-gcp-budget-alerts-bigquery-guards.md` |
| `TASK-104` | `complete` | Payroll Export Email Redesign | `docs/tasks/complete/TASK-104-payroll-export-email-redesign.md` |
| `TASK-105` | `complete` | Lint Debt Stabilization | `docs/tasks/complete/TASK-105-lint-debt-stabilization.md` |
| `TASK-106` | `complete` | Email Delivery Admin UI | `docs/tasks/complete/TASK-106-email-delivery-admin-ui.md` |
| `TASK-107` | `complete` | Auth Email Verification Request Flow | `docs/tasks/complete/TASK-107-auth-email-verification-request-flow.md` |
| `TASK-108` | `complete` | Admin Center Governance Shell | `docs/tasks/complete/TASK-108-admin-center-governance-shell.md` |
| `TASK-109` | `to-do` | Projected Payroll Runtime Hardening and Observability | `docs/tasks/to-do/TASK-109-projected-payroll-runtime-hardening-observability.md` |
| `TASK-110` | `complete` (closed 2026-05-05 — lifecycle drift) | Nexa: assistant-ui Feature Adoption | `docs/tasks/complete/TASK-110-nexa-assistant-ui-features.md` |
| `TASK-111` | `complete` | Admin Center Secret Ref Governance UI | `docs/tasks/complete/TASK-111-admin-center-secret-ref-governance-ui.md` |
| `TASK-112` | `complete` | Admin Center Integration Health and Freshness UI | `docs/tasks/complete/TASK-112-admin-center-integration-health-freshness-ui.md` |
| `TASK-113` | `complete` | Admin Center Ops Audit Trail UI | `docs/tasks/complete/TASK-113-admin-center-ops-audit-trail-ui.md` |
| `TASK-114` | `complete` | Nexa Backend: Persistence, Feedback & Dynamic Suggestions | `docs/tasks/complete/TASK-114-nexa-backend-persistence-suggestions.md` |
| `TASK-115` | `complete` (closed 2026-05-05 — lifecycle drift) | Nexa UI: Edit, Suggestions, Feedback, Floating & Thread History | `docs/tasks/complete/TASK-115-nexa-ui-completion.md` |
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
| `TASK-178` | `complete` (superseded por TASK-395 — 2026-05-05) | Finance Budget Engine: Budget vs. Actual & Variance Analysis | `docs/tasks/complete/TASK-178-finance-budget-engine.md` |
| `TASK-179` | `to-do` | Finance Reconciliation Postgres-Only Cutover & Integration Hardening | `docs/tasks/to-do/TASK-179-finance-reconciliation-cutover-hardening.md` |
| `TASK-180` | `complete` | HR Departments Postgres Runtime Cutover | `docs/tasks/complete/TASK-180-hr-departments-postgres-runtime-cutover.md` |
| `TASK-181` | `complete` (closed 2026-05-05 — lifecycle drift) | Finance Clients: Canonical Source Migration to Organizations | `docs/tasks/complete/TASK-181-finance-clients-organization-canonical-source.md` |
| `TASK-182` | `complete` | Finance Expense Drawer: Agency Taxonomy, Cross-Module Synergies & Automation | `docs/tasks/complete/TASK-182-finance-expense-drawer-agency-taxonomy.md` |
| `TASK-183` | `complete` | Finance Expenses Reactive Intake & Cost Ledger Hardening | `docs/tasks/complete/TASK-183-finance-expenses-reactive-intake-cost-ledger.md` |
| `TASK-184` | `in-progress` | Database Migration Framework (node-pg-migrate) | `docs/tasks/in-progress/TASK-184-database-migration-framework.md` |
| `TASK-185` | `in-progress` | Database Tooling Foundation (db.ts + Kysely + Migrations) | `docs/tasks/in-progress/TASK-185_Database_Tooling_Foundation.md` |
| `TASK-186` | `complete` | Delivery Metrics Trust: Notion Property Audit & Conformed Contract Hardening | `docs/tasks/complete/TASK-186-delivery-metrics-trust-notion-property-audit-contract.md` |
| `TASK-187` | `complete` | Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness | `docs/tasks/complete/TASK-187-notion-integration-formalization-space-onboarding-schema-governance.md` |
| `TASK-188` | `complete` (closed 2026-05-05 — lifecycle drift) | Native Integrations Layer: Platform Governance, Runtime Contracts & Shared Operating Model | `docs/tasks/complete/TASK-188-native-integrations-layer-platform-governance.md` |
| `TASK-189` | `complete` | ICO Period Filter: Due-Date Anchor & Carry-Over Logic | `docs/tasks/complete/TASK-189-ico-period-filter-due-date-anchor.md` |
| `TASK-190` | `to-do` | Platform Temporal Scope Contract & Cross-Module Time Semantics | `docs/tasks/to-do/TASK-190-platform-temporal-scope-contract-cross-module-parity.md` |
| `TASK-191` | `complete` (closed 2026-05-05 — lifecycle drift) | Finance Organization-First Downstream Consumers Cutover | `docs/tasks/complete/TASK-191-finance-organization-first-downstream-consumers-cutover.md` |
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
| `TASK-224` | `to-do` (reverted 2026-05-05 — stalled 60+ días) | Finance Document vs Cash Semantic Contract | `docs/tasks/to-do/TASK-224-finance-document-vs-cash-semantic-contract.md` |
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
| `TASK-236` | `complete` (closed 2026-05-05 — lifecycle drift) | Agency: Resilience & Feedback Patterns | `docs/tasks/complete/TASK-236-agency-resilience-feedback-patterns.md` |
| `TASK-237` | `complete` (closed 2026-05-05 — lifecycle drift) | Agency ICO Engine Tab: UX Redesign | `docs/tasks/complete/TASK-237-agency-ico-engine-tab-ux-redesign.md` |
| `TASK-238` | `complete` (closed 2026-05-05 — lifecycle drift) | Agency Workspace & Space 360: Data Storytelling UX | `docs/tasks/complete/TASK-238-agency-workspace-data-storytelling-ux.md` |
| `TASK-239` | `to-do` | Nexa Insights: Prompt Enrichment con Glosario de Métricas y Cadena Causal | `docs/tasks/to-do/TASK-239-nexa-advisory-prompt-enrichment-metric-glossary.md` |
| `TASK-240` | `complete` | Nexa Insights: Menciones Interactivas de Spaces y Miembros | `docs/tasks/complete/TASK-240-nexa-insights-entity-mentions.md` |
| `TASK-241` | `complete` | Migrar procesos batch pesados a Cloud Run | `docs/tasks/complete/TASK-241-batch-processes-cloud-run-migration.md` |
| `TASK-242` | `to-do` | Nexa Insights en Space 360 | `docs/tasks/to-do/TASK-242-nexa-insights-space-360.md` |
| `TASK-243` | `to-do` | Nexa Insights en Person 360 | `docs/tasks/to-do/TASK-243-nexa-insights-person-360.md` |
| `TASK-244` | `to-do` | Nexa Insights Widget en Home Dashboard | `docs/tasks/to-do/TASK-244-nexa-insights-home-dashboard.md` |
| `TASK-245` | `to-do` | Finance Signal Engine | `docs/tasks/to-do/TASK-245-finance-signal-engine.md` |
| `TASK-246` | `complete` (closed 2026-05-05 — digest engine + email + ops-worker live) | Narrativa ejecutiva semanal de Nexa | `docs/tasks/complete/TASK-246-nexa-weekly-executive-digest.md` |
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
| `TASK-257` | `complete` (closed 2026-05-05 — code shipped en `dd3fe199`, lifecycle drift) | Mi Perfil: enterprise redesign con patron Vuexy User View (sidebar + tabs) | `docs/tasks/complete/TASK-257-mi-perfil-enterprise-redesign.md` |
| `TASK-258` | `to-do` | Migrar sync-conformed + sync-conformed-recovery a ops-worker | `docs/tasks/to-do/TASK-258-migrate-sync-conformed-to-ops-worker.md` |
| `TASK-259` | `to-do` | Migrar entra-profile-sync a ops-worker | `docs/tasks/to-do/TASK-259-migrate-entra-profile-sync-to-ops-worker.md` |
| `TASK-260` | `to-do` | Migrar nubox-sync + ico-member-sync a ops-worker | `docs/tasks/to-do/TASK-260-migrate-nubox-sync-ico-member-sync-to-ops-worker.md` |
| `TASK-261` | `to-do` | Migrar webhook-dispatch a ops-worker | `docs/tasks/to-do/TASK-261-migrate-webhook-dispatch-to-ops-worker.md` |
| `TASK-262` | `complete` | Migrar outbox-publish a ops-worker (absorbida en TASK-773 el 2026-05-03 — superset estricto con state machine, 2 reliability signals, lint rule E2E gate, protocol pre-merge) | `docs/tasks/complete/TASK-262-migrate-outbox-publish-to-ops-worker.md` |
| `TASK-263` | `to-do` | Permission Sets: CRUD enterprise para asignacion de vistas por persona y perfil | `docs/tasks/to-do/TASK-263-permission-sets-enterprise-view-access.md` |
| `TASK-264` | `to-do` | Greenhouse Theme Canonicalization & Kortex Brand Contract | `docs/tasks/to-do/TASK-264-greenhouse-theme-canonicalization-kortex-brand-contract.md` |
| `TASK-265` | `complete` | Greenhouse Nomenclature, Dictionary & Kortex Copy Contract | `docs/tasks/complete/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md` |
| `TASK-266` | `complete` | Greenhouse i18n & Globalization Activation | `docs/tasks/complete/TASK-266-greenhouse-i18n-globalization-activation.md` |
| `TASK-267` | `to-do` | Reenviar email de onboarding desde ficha de usuario | `docs/tasks/to-do/TASK-267-admin-resend-onboarding-email.md` |
| `TASK-268` | `to-do` | Boton "Revisar acceso" navega al tab Accesos | `docs/tasks/to-do/TASK-268-admin-review-access-button.md` |
| `TASK-269` | `to-do` | Email Delivery Enterprise Hardening: Context Resolver, i18n, Rate Limit, Bounce Handling | `docs/tasks/to-do/TASK-269-email-delivery-enterprise-hardening.md` |
| `TASK-270` | `to-do` | Admin Email Template Preview: vista integrada para previsualizar y probar templates | `docs/tasks/to-do/TASK-270-admin-email-template-preview.md` |
| `TASK-271` | `to-do` | Soporte de permisos de medio dia (periodos parciales) | `docs/tasks/to-do/TASK-271-hr-leave-half-day-periods.md` |
| `TASK-272` | `to-do` | Mi Perfil: vista rica basada en Vuexy user-profile | `docs/tasks/to-do/TASK-272-my-profile-vuexy-rich-view.md` |
| `TASK-273` | `complete` (closed 2026-05-05 — Phases A-F shipped) | Person Complete 360: capa de serving federada por facetas | `docs/tasks/complete/TASK-273-person-complete-360-federated-serving-layer.md` |
| `TASK-274` | `complete` (closed 2026-05-05 — Phases A-F shipped) | Account Complete 360: capa de serving federada por facetas | `docs/tasks/complete/TASK-274-account-complete-360-federated-serving-layer.md` |
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
| `TASK-407` | `complete` | Copy Migration: Shared Shell + Components (split de TASK-265) | `docs/tasks/complete/TASK-407-copy-migration-shared-shell-components.md` |
| `TASK-408` | `in-progress` | Copy Migration: Notification Categories + Institutional Emails (split de TASK-265) | `docs/tasks/in-progress/TASK-408-copy-migration-notifications-emails.md` |
| `TASK-428` | `complete` | i18n Architecture Decision (library + routing + locales) — child de TASK-266 | `docs/tasks/complete/TASK-428-i18n-architecture-decision.md` |
| `TASK-429` | `complete` | Locale-Aware Formatting Utilities — child de TASK-266 | `docs/tasks/complete/TASK-429-locale-aware-formatting-utilities.md` |
| `TASK-430` | `complete` | Dictionary Foundation Activation — child de TASK-266 | `docs/tasks/complete/TASK-430-dictionary-foundation-activation.md` |
| `TASK-431` | `complete` | Tenant + User Locale Persistence Model — child de TASK-266 | `docs/tasks/complete/TASK-431-tenant-user-locale-persistence.md` |
| `TASK-432` | `to-do` | Client Portal Nexa Pulse (Client-Facing Insights) | `docs/tasks/to-do/TASK-432-client-portal-nexa-pulse.md` |
| `TASK-433` | `to-do` | Payroll Signal Engine | `docs/tasks/to-do/TASK-433-payroll-signal-engine.md` |
| `TASK-434` | `to-do` | Staff Augmentation Assignment Economics Signal Engine | `docs/tasks/to-do/TASK-434-staff-augmentation-signal-engine.md` |
| `TASK-435` | `to-do` | Nexa Actionable Insights (CTA Contract) | `docs/tasks/to-do/TASK-435-nexa-actionable-insights-cta-contract.md` |
| `TASK-436` | `to-do` | Nexa Critical Push Distribution (Slack / Teams) | `docs/tasks/to-do/TASK-436-nexa-critical-push-distribution.md` |
| `TASK-437` | `to-do` | Nexa Cross-Domain Causality Engine | `docs/tasks/to-do/TASK-437-nexa-cross-domain-causality.md` |
| `TASK-438` | `to-do` | Nexa Contextual Chat Per Domain (Copilot by Surface) | `docs/tasks/to-do/TASK-438-nexa-contextual-chat-per-domain.md` |
| `TASK-439` | `to-do` | Nexa Daily Role-Based Briefing | `docs/tasks/to-do/TASK-439-nexa-daily-role-based-briefing.md` |
| `TASK-440` | `complete` (closed 2026-05-05 — lifecycle drift) | Nexa Insights Project Label Resolution | `docs/tasks/complete/TASK-440-nexa-project-label-resolution.md` |
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
| `TASK-471` | `complete`    | Pricing Catalog Phase-4 UI Polish (Diff + Revert + Bulk + Impact + Maker-Checker + Excel) | `docs/tasks/complete/TASK-471-pricing-catalog-phase-4-ui-polish.md` |
| `TASK-472` | `to-do`       | Fix `/my/profile` SSR 500 in staging (resuelve ISSUE-054) | `docs/tasks/to-do/TASK-472-my-profile-ssr-500-fix.md` |
| `TASK-473` | `to-do`       | Quote Builder Full-Page Surface Migration & Flow Recomposition | `docs/tasks/to-do/TASK-473-quote-builder-full-page-surface-migration.md` |
| `TASK-474` | `to-do`       | Quote Builder Catalog / Service Reconnection Pass | `docs/tasks/to-do/TASK-474-quote-builder-catalog-reconnection-pass.md` |
| `TASK-475` | `complete` | Greenhouse FX & Currency Platform Foundation | `docs/tasks/complete/TASK-475-greenhouse-fx-currency-platform-foundation.md` |
| `TASK-476` | `complete`    | Commercial Cost Basis Program | `docs/tasks/complete/TASK-476-commercial-cost-basis-program.md` |
| `TASK-477` | `to-do`       | Role Cost Assumptions Catalog & Effective-Dated Modeling | `docs/tasks/to-do/TASK-477-role-cost-assumptions-catalog.md` |
| `TASK-478` | `complete`    | Tool & Provider Cost Basis Snapshots | `docs/tasks/complete/TASK-478-tool-provider-cost-basis-snapshots.md` |
| `TASK-479` | `to-do`       | People Actual Cost + Blended Role Cost Snapshots | `docs/tasks/to-do/TASK-479-people-actual-cost-blended-role-snapshots.md` |
| `TASK-480` | `complete`    | Pricing Engine Cost Resolver, Provenance & Confidence | `docs/tasks/complete/TASK-480-pricing-engine-cost-resolver-provenance-confidence.md` |
| `TASK-481` | `complete`    | Quote Builder Suggested Cost UX & Override Governance | `docs/tasks/complete/TASK-481-quote-builder-suggested-cost-override-governance.md` |
| `TASK-482` | `in-progress` | Quoted vs Actual Margin Feedback Loop | `docs/tasks/in-progress/TASK-482-quoted-vs-actual-margin-feedback-loop.md` |
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
| `TASK-509` | `complete` | Floating UI en TotalsLadder (addons primitive self-contained) | `docs/tasks/complete/TASK-509-floating-ui-addons-primitive.md` |
| `TASK-510` | `to-do` | Platform-wide Floating UI migration | `docs/tasks/to-do/TASK-510-floating-ui-platform-migration.md` |
| `TASK-511` | `to-do` | Stack Modernization Roadmap (Linear/Stripe/Vercel 2026 bar) | `docs/tasks/to-do/TASK-511-stack-modernization-roadmap.md` |
| `TASK-512` | `to-do` | react-toastify → sonner | `docs/tasks/to-do/TASK-512-toastify-to-sonner.md` |
| `TASK-513` | `to-do` | @tanstack/react-query adoption (server state) | `docs/tasks/to-do/TASK-513-tanstack-react-query-adoption.md` |
| `TASK-514` | `to-do` | ESLint 8 → 9 flat config migration | `docs/tasks/to-do/TASK-514-eslint-9-flat-config.md` |
| `TASK-515` | `to-do` | jsonwebtoken → jose | `docs/tasks/to-do/TASK-515-jsonwebtoken-to-jose.md` |
| `TASK-516` | `to-do` | NextAuth v4 → Auth.js v5 migration | `docs/tasks/to-do/TASK-516-nextauth-v4-to-authjs-v5.md` |
| `TASK-517` | `to-do` | Playwright E2E smoke suite | `docs/tasks/to-do/TASK-517-playwright-e2e-smoke-suite.md` |
| `TASK-518` | `complete` (won't do — 2026-05-05) | ApexCharts deprecation; consolidate on Recharts | `docs/tasks/complete/TASK-518-apexcharts-deprecation.md` |
| `TASK-519` | `to-do` | react-datepicker → MUI X DatePicker | `docs/tasks/to-do/TASK-519-datepicker-to-mui-x.md` |
| `TASK-520` | `to-do` | mapbox-gl → maplibre-gl | `docs/tasks/to-do/TASK-520-mapbox-to-maplibre.md` |
| `TASK-521` | `to-do` | classnames → clsx + tailwind-merge | `docs/tasks/to-do/TASK-521-classnames-to-clsx-tailwind-merge.md` |
| `TASK-522` | `to-do` | Install MSW (Mock Service Worker) for tests | `docs/tasks/to-do/TASK-522-msw-mock-layer.md` |
| `TASK-523` | `to-do` | bcryptjs → @node-rs/argon2 (with re-hash policy) | `docs/tasks/to-do/TASK-523-bcryptjs-to-argon2.md` |
| `TASK-524` | `to-do` | Income → HubSpot Invoice Bridge | `docs/tasks/to-do/TASK-524-income-hubspot-invoice-bridge.md` |
| `TASK-525` | `to-do` | View Transitions API rollout (navegación animada nativa) | `docs/tasks/to-do/TASK-525-view-transitions-api-rollout.md` |
| `TASK-526` | `complete` | @formkit/auto-animate para list motion zero-config | `docs/tasks/complete/TASK-526-auto-animate-list-motion.md` |
| `TASK-527` | `to-do` | Rive interactive illustrations (next-gen Lottie) | `docs/tasks/to-do/TASK-527-rive-interactive-illustrations.md` |
| `TASK-528` | `to-do` | Chile Tax / IVA Program | `docs/tasks/to-do/TASK-528-chile-tax-iva-program.md` |
| `TASK-529` | `to-do` | Chile Tax Code Foundation | `docs/tasks/to-do/TASK-529-chile-tax-code-foundation.md` |
| `TASK-530` | `to-do` | Quote Tax Explicitness (Chile IVA) | `docs/tasks/to-do/TASK-530-quote-tax-explicitness-chile-iva.md` |
| `TASK-531` | `complete` | Income / Invoice Tax Convergence | `docs/tasks/complete/TASK-531-income-invoice-tax-convergence.md` |
| `TASK-532` | `to-do` | Purchase VAT Recoverability | `docs/tasks/to-do/TASK-532-purchase-vat-recoverability.md` |
| `TASK-533` | `complete` | Chile VAT Ledger & Monthly Position | `docs/tasks/complete/TASK-533-chile-vat-ledger-monthly-position.md` |
| `TASK-534` | `complete` | Commercial Party Lifecycle & Quote-to-Cash Program (umbrella) | `docs/tasks/complete/TASK-534-commercial-party-lifecycle-program.md` |
| `TASK-535` | `complete` | Party Lifecycle Schema & Commands Foundation (Fase A) | `docs/tasks/complete/TASK-535-party-lifecycle-schema-commands-foundation.md` |
| `TASK-536` | `complete` | HubSpot Companies Inbound Prospect Sync (Fase B) | `docs/tasks/complete/TASK-536-hubspot-companies-inbound-prospect-sync.md` |
| `TASK-537` | `complete` | Party Search & Adoption Endpoints (Fase C) | `docs/tasks/complete/TASK-537-party-search-adoption-endpoints.md` |
| `TASK-538` | `complete` | Quote Builder Unified Party Selector (Fase D) | `docs/tasks/complete/TASK-538-quote-builder-unified-party-selector.md` |
| `TASK-539` | `complete` | Inline Deal Creation from Quote Builder (Fase E) | `docs/tasks/complete/TASK-539-inline-deal-creation-quote-builder.md` |
| `TASK-540` | `complete` | HubSpot Lifecycle Outbound Sync (Fase F) | `docs/tasks/complete/TASK-540-hubspot-lifecycle-outbound-sync.md` |
| `TASK-541` | `complete` | Quote-to-Cash Atomic Choreography (Fase G) | `docs/tasks/complete/TASK-541-quote-to-cash-atomic-choreography.md` |
| `TASK-542` | `complete` | Party Lifecycle Admin Dashboards (Fase H) | `docs/tasks/complete/TASK-542-party-lifecycle-admin-dashboards.md` |
| `TASK-543` | `complete` | Party Lifecycle Deprecation & Flag Cleanup (Fase I) | `docs/tasks/complete/TASK-543-party-lifecycle-deprecation-flag-cleanup.md` |
| `TASK-544` | `to-do` | Commercial Product Catalog Sync Program (umbrella) | `docs/tasks/to-do/TASK-544-commercial-product-catalog-sync-program.md` |
| `TASK-545` | `to-do` | Product Catalog Schema & Materializer Foundation (Fase A) | `docs/tasks/to-do/TASK-545-product-catalog-schema-materializer-foundation.md` |
| `TASK-546` | `to-do` | Product Catalog Source Handlers & Event Homogenization (Fase B) | `docs/tasks/to-do/TASK-546-product-catalog-source-handlers-events.md` |
| `TASK-547` | `complete` | Product Catalog HubSpot Outbound Projection (Fase C) | `docs/tasks/complete/TASK-547-product-catalog-hubspot-outbound.md` |
| `TASK-548` | `complete` | Product Catalog Drift Detection & Admin Center (Fase D) | `docs/tasks/complete/TASK-548-product-catalog-drift-detection-admin.md` |
| `TASK-549` | `to-do` | Product Catalog Policy Enforcement & Legacy Cleanup (Fase E) | `docs/tasks/to-do/TASK-549-product-catalog-policy-enforcement-cleanup.md` |
| `TASK-550` | `complete` | Pricing Catalog Phase-5 Follow-ups (governance revert + tab gating + notifications + excel create/delete) | `docs/tasks/complete/TASK-550-pricing-catalog-phase-5-followups.md` |
| `TASK-551` | `to-do` | Outbox Reactive Decoupling from Analytics Publish | `docs/tasks/to-do/TASK-551-outbox-reactive-decoupling.md` |
| `TASK-552` | `to-do` | Multi-Currency Quote Output Follow-ups (email + bidirectional FX + locked rates + line history + drift alerts + client portal) | `docs/tasks/to-do/TASK-552-multi-currency-quote-output-followups.md` |
| `TASK-553` | `to-do` | Quick Access Shortcuts Platform | `docs/tasks/to-do/TASK-553-quick-access-shortcuts-platform.md` |
| `TASK-554` | `complete` | Commercial Domain Navigation Separation | `docs/tasks/complete/TASK-554-commercial-domain-navigation-separation.md` |
| `TASK-555` | `complete` | Commercial Access Model Foundation | `docs/tasks/complete/TASK-555-commercial-access-model-foundation.md` |
| `TASK-556` | `complete` | Commercial Surface Adoption over Legacy Finance Paths | `docs/tasks/complete/TASK-556-commercial-surface-adoption-over-legacy-finance-paths.md` |
| `TASK-557` | `complete` | Commercial Pipeline Lane Extraction | `docs/tasks/complete/TASK-557-commercial-pipeline-lane-extraction.md` |
| `TASK-558` | `to-do` | Ops Registry Schema, Parser & Repo Config Foundation | `docs/tasks/to-do/TASK-558-ops-registry-schema-parser-repo-config-foundation.md` |
| `TASK-559` | `to-do` | Ops Registry Validation, Query CLI & Generated Outputs | `docs/tasks/to-do/TASK-559-ops-registry-validation-query-cli-generated-outputs.md` |
| `TASK-560` | `to-do` | Ops Registry Human + Agent Surfaces | `docs/tasks/to-do/TASK-560-ops-registry-human-agent-surfaces.md` |
| `TASK-561` | `to-do` | Ops Registry Federation Contract for Sister Repos | `docs/tasks/to-do/TASK-561-ops-registry-federation-contract-sister-repos.md` |
| `TASK-562` | `to-do` | Quote Tax Explicitness Follow-ups (UI Selector + Per-Line Override + Email Integration + Multi-Jurisdiction) | `docs/tasks/to-do/TASK-562-quote-tax-explicitness-followups.md` |
| `TASK-563` | `complete` | Product Catalog HubSpot Outbound Follow-ups (External Service Deploy + Custom Properties Apply + Anti-Ping-Pong Refactor + Batch Coalescing + E2E Staging) | `docs/tasks/complete/TASK-563-product-catalog-hubspot-outbound-followups.md` |
| `TASK-564` | `to-do` | Quote Builder: Gate Deal Creation + Link-to-HubSpot-Company Fallback | `docs/tasks/to-do/TASK-564-quote-builder-deal-creation-hubspot-link-gating.md` |
| `TASK-565` | `to-do` | Quote Builder Context Strip Modernization (Prominence Tiers + Blocking-Empty Semantics + Progress Counter) | `docs/tasks/to-do/TASK-565-quote-builder-context-strip-modernization.md` |
| `TASK-566` | `to-do` | Typography Foundation: Inter + Poppins Theme Realignment (EPIC-004 child 1/4) | `docs/tasks/to-do/TASK-566-typography-foundation-geist-poppins-theme.md` |
| `TASK-567` | `complete` | Typography Code Sweep + ESLint Governance Rule (EPIC-004 child 2/4) | `docs/tasks/complete/TASK-567-typography-code-sweep-eslint-rule.md` |
| `TASK-568` | `to-do` | Typography in Delivery Surfaces: Email Stack + PDF Font Registration (EPIC-004 child 3/4) | `docs/tasks/to-do/TASK-568-typography-email-pdf-font-registration.md` |
| `TASK-569` | `to-do` | Typography Visual Regression + Figma Alignment + Skills/Docs Cleanup (EPIC-004 child 4/4) | `docs/tasks/to-do/TASK-569-typography-visual-regression-figma-docs.md` |
| `TASK-570` | `complete` | Move "Crear deal nuevo" CTA into Deal Chip Popover Footer | `docs/tasks/complete/TASK-570-create-deal-cta-in-popover-footer.md` |
| `TASK-571` | `complete` | Deal Creation Context Registry + Pipeline/Stage Governance | `docs/tasks/complete/TASK-571-deal-creation-context-pipeline-stage-governance.md` |
| `TASK-572` | `complete` | Deploy `POST /deals` en el Cloud Run `hubspot-greenhouse-integration` | `docs/tasks/complete/TASK-572-hubspot-integration-post-deals-deploy.md` |
| `TASK-573` | `complete` | Quote Builder Deal Birth Contract Completion & HubSpot Governance Hardening | `docs/tasks/complete/TASK-573-quote-builder-deal-birth-contract-completion.md` |
| `TASK-574` | `complete` | Absorber el Cloud Run `hubspot-greenhouse-integration` en `services/` de `greenhouse-eo` | `docs/tasks/complete/TASK-574-absorb-hubspot-greenhouse-integration-service.md` |
| `TASK-575` | `to-do` | Upgrade HubSpot Developer Platform + API calls del bridge a versión 2026.03 | `docs/tasks/to-do/TASK-575-hubspot-developer-platform-2026-upgrade.md` |
| `TASK-576` | `to-do` | HubSpot Quote Publish Contract Completion | `docs/tasks/to-do/TASK-576-hubspot-quote-publish-contract-completion.md` |
| `TASK-577` | `to-do` | Notion Write Bridge (HTTP service) — EPIC-005 child 1/6 | `docs/tasks/to-do/TASK-577-notion-write-bridge.md` |
| `TASK-578` | `to-do` | Canonical Mapping Registry + Identity Extension Notion — EPIC-005 child 2/6 | `docs/tasks/to-do/TASK-578-canonical-mapping-registry-notion.md` |
| `TASK-579` | `to-do` | Forward Orchestrator: Commercial → Delivery (HubSpot → Notion) — EPIC-005 child 3/6 | `docs/tasks/to-do/TASK-579-forward-orchestrator-commercial-to-delivery.md` |
| `TASK-580` | `to-do` | Reverse Orchestrator: Delivery → Commercial (Notion → HubSpot) híbrido — EPIC-005 child 4/6 | `docs/tasks/to-do/TASK-580-reverse-orchestrator-hybrid-notion-to-commercial.md` |
| `TASK-581` | `to-do` | Cutover de un tirón + sibling retirement + docs — EPIC-005 child 5/6 | `docs/tasks/to-do/TASK-581-notion-sync-cutover-and-sibling-retirement.md` |
| `TASK-582` | `to-do` | Monthly Project Provisioning Admin Surface with Preview — EPIC-005 child 6/6 | `docs/tasks/to-do/TASK-582-monthly-project-provisioning-admin-surface.md` |
| `TASK-583` | `to-do` | HubSpot Quote Native Publish & Tax Finalization | `docs/tasks/to-do/TASK-583-hubspot-quote-native-publish-tax-finalization.md` |
| `TASK-584` | `in-progress` | PostgreSQL Migration Tooling Hardening | `docs/tasks/in-progress/TASK-584-postgres-migration-tooling-hardening.md` |
| `TASK-585` | `to-do` (reverted 2026-05-05 — stalled 30+ días, runtime externo GCP) | Notion BQ Sync Cost Efficiency & Invocation Hardening | `docs/tasks/to-do/TASK-585-notion-bq-sync-cost-efficiency-hardening.md` |
| `TASK-586` | `to-do` | Notion Sync & Billing Export Observability in Admin Center | `docs/tasks/to-do/TASK-586-notion-sync-billing-observability.md` |
| `TASK-587` | `complete` | HubSpot Products Full-Fidelity Bidirectional Sync Expansion (umbrella — 5 fases A-E cerradas) | `docs/tasks/complete/TASK-587-hubspot-products-full-fidelity-sync.md` |
| `TASK-588` | `complete` | Project Title Resolution Hardening en Conformed Sync (fix ICO "Sin nombre") | `docs/tasks/complete/TASK-588-project-title-resolution-conformed-sync-hardening.md` |
| `TASK-589` | `complete` | Finance Read Path Provisioning Decoupling & Directory Hardening | `docs/tasks/complete/TASK-589-finance-runtime-read-path-decoupling-clients-suppliers.md` |
| `TASK-590` | `to-do` | ICO Signals Schema v2: identidad determinista + event store (EPIC-006 child 1/8) | `docs/tasks/to-do/TASK-590-ico-signals-schema-v2-identity-event-store.md` |
| `TASK-591` | `to-do` | Reconcile-based materialize refactor + idempotencia (EPIC-006 child 2/8) | `docs/tasks/to-do/TASK-591-ico-signals-reconcile-materialize-refactor.md` |
| `TASK-592` | `to-do` | Signal state machine + transitions API (EPIC-006 child 3/8) | `docs/tasks/to-do/TASK-592-ico-signals-state-machine-transitions-api.md` |
| `TASK-593` | `to-do` | LLM enrichment con versioning + budget + quality gate (EPIC-006 child 4/8) | `docs/tasks/to-do/TASK-593-ico-signals-llm-enrichment-versioning-budget.md` |
| `TASK-594` | `to-do` | Pipeline observability + SLIs + meta-alertas (EPIC-006 child 5/8) | `docs/tasks/to-do/TASK-594-ico-signals-observability-slis-meta-alerts.md` |
| `TASK-595` | `to-do` | UI inbox operativo + timeline + filtros (EPIC-006 child 6/8) | `docs/tasks/to-do/TASK-595-ico-signals-inbox-ui-timeline-filters.md` |
| `TASK-596` | `to-do` | Webhooks outbound + Nexa agent integration (EPIC-006 child 7/8) | `docs/tasks/to-do/TASK-596-ico-signals-webhooks-nexa-integration.md` |
| `TASK-597` | `to-do` | Migración strangler fig + backfill + deprecate v1 (EPIC-006 child 8/8) | `docs/tasks/to-do/TASK-597-ico-signals-migration-cutover-deprecate-v1.md` |
| `TASK-598` | `complete` | ICO Narrative Presentation Layer (resolve mentions + relevance filter + sanitization) | `docs/tasks/complete/TASK-598-ico-narrative-presentation-layer.md` |
| `TASK-599` | `to-do` | Finance Preventive Test Lane (Playwright + Component + Route Resilience) | `docs/tasks/to-do/TASK-599-finance-preventive-test-lane.md` |
| `TASK-600` | `to-do` | Reliability Registry & Signal Correlation Foundation | `docs/tasks/to-do/TASK-600-reliability-registry-signal-foundation.md` |
| `TASK-601` | `complete` | Product Catalog Schema Extension + 4 Reference Tables (TASK-587 Fase A) | `docs/tasks/complete/TASK-601-product-catalog-schema-extension-ref-tables.md` |
| `TASK-602` | `complete` | Product Catalog Multi-Currency Price Normalization (TASK-587 Fase B) | `docs/tasks/complete/TASK-602-product-catalog-multi-currency-prices.md` |
| `TASK-603` | `complete` | HubSpot Products Outbound Contract v2 + COGS Unblock (TASK-587 Fase C) | `docs/tasks/complete/TASK-603-hubspot-products-outbound-contract-v2-cogs-unblock.md` |
| `TASK-604` | `complete` | HubSpot Products Inbound Rehydration + Owner Bridge + Drift Detection (TASK-587 Fase D) | `docs/tasks/complete/TASK-604-hubspot-products-inbound-rehydration-owner-drift.md` |
| `TASK-605` | `complete` | Product Catalog Admin UI + Backfill + Reconcile + Governance (TASK-587 Fase E) | `docs/tasks/complete/TASK-605-product-catalog-admin-ui-backfill-governance.md` |
| `TASK-606` | `to-do` | Space 360 Motion Consistency & Empty State Follow-up | `docs/tasks/to-do/TASK-606-space-360-motion-consistency-empty-state-followup.md` |
| `TASK-607` | `complete` | GitHub Actions Node.js 24 Migration + smoke-lane semantics | `docs/tasks/complete/TASK-607-github-actions-nodejs-24-migration.md` |
| `TASK-608` | `to-do` | Product Catalog Price History (effective_at) — follow-up aditivo de TASK-602 | `docs/tasks/to-do/TASK-608-product-catalog-price-history.md` |
| `TASK-609` | `to-do` | AI Quote Draft Assistant (intent -> canonical draft + QA guardrails) | `docs/tasks/to-do/TASK-609-ai-quote-draft-assistant.md` |
| `TASK-610` | `complete` | Content Sanitization Runtime Isolation + Shared Policy Layer | `docs/tasks/complete/TASK-610-content-sanitization-runtime-isolation-shared-policy-layer.md` |
| `TASK-611` | `to-do` | Organization Workspace Facet Projection & Fine-Grained Entitlements Foundation | `docs/tasks/to-do/TASK-611-organization-workspace-facet-projection-entitlements-foundation.md` |
| `TASK-612` | `to-do` | Shared Organization Workspace Shell Convergence | `docs/tasks/to-do/TASK-612-shared-organization-workspace-shell-convergence.md` |
| `TASK-613` | `to-do` | Finance Clients Detail -> Organization Workspace Convergence | `docs/tasks/to-do/TASK-613-finance-clients-organization-workspace-convergence.md` |
| `TASK-614` | `to-do` | People / Payroll Economy Facet & Entitlements Hardening | `docs/tasks/to-do/TASK-614-people-payroll-economy-facet-entitlements-hardening.md` |
| `TASK-615` | `to-do` | Quote Builder Flow Orchestration & UX Hardening | `docs/tasks/to-do/TASK-615-quote-builder-flow-orchestration-ux-hardening.md` |
| `TASK-616` | `complete` | API Platform Foundation & Ecosystem Read Surface V1 | `docs/tasks/complete/TASK-616-api-platform-foundation-ecosystem-read-surface-v1.md` |
| `TASK-617` | `complete` | API Platform V1.1 Convergence Program | `docs/tasks/complete/TASK-617-api-platform-v1-1-convergence-program.md` |
| `TASK-617.1` | `complete` | API Platform REST Hardening | `docs/tasks/complete/TASK-617.1-api-platform-rest-hardening.md` |
| `TASK-617.2` | `complete` | API Platform First-Party App Surface Foundation | `docs/tasks/complete/TASK-617.2-api-platform-first-party-app-surface-foundation.md` |
| `TASK-617.3` | `complete` | API Platform Event Control Plane | `docs/tasks/complete/TASK-617.3-api-platform-event-control-plane.md` |
| `TASK-617.4` | `complete` | Developer API Documentation Portal | `docs/tasks/complete/TASK-617.4-developer-api-documentation-portal.md` |
| `TASK-619` | `to-do` | Quote eSignature (consumer del foundation neutro de firma) | `docs/tasks/to-do/TASK-619-quote-esignature-zapsign.md` |
| `TASK-619.1` | `to-do` | Signed PDF Storage Hardening (bucket separado + retention 10 anos + multi-region) | `docs/tasks/to-do/TASK-619.1-signed-pdf-storage-hardening.md` |
| `TASK-619.2` | `to-do` | Signature Operational Worker (reconciliation + expiry alerting + DLQ) | `docs/tasks/to-do/TASK-619.2-signature-operational-worker.md` |
| `TASK-619.3` | `to-do` | Quote Signature Notifications (email + in-app + Slack reactors) | `docs/tasks/to-do/TASK-619.3-quote-signature-notifications.md` |
| `TASK-620` | `to-do` | Sellable Catalog Unification (sellable_tools + sellable_artifacts + service_module_children schema desde dia 1) | `docs/tasks/to-do/TASK-620-sellable-catalog-unification.md` |
| `TASK-620.1` | `to-do` | Tools as Sellable Standalone (refactor service_tool_recipe -> sellable_tools FK + canonical pricing) | `docs/tasks/to-do/TASK-620.1-tools-as-sellable-standalone.md` |
| `TASK-620.1.1` | `to-do` | Tool Partner Program (Adobe / Microsoft / HubSpot reseller tracking + commission accounting) | `docs/tasks/to-do/TASK-620.1.1-tool-partner-program.md` |
| `TASK-620.2` | `to-do` | Artifacts Catalog (sellable_artifacts hibrido: priced standalone o absorbido en horas) | `docs/tasks/to-do/TASK-620.2-artifacts-catalog.md` |
| `TASK-620.3` | `to-do` | Service Module Composer with Native Nesting (composer recursivo depth 3 + cycle detection + constraints UI nesting-aware) | `docs/tasks/to-do/TASK-620.3-service-module-composer-native-nesting.md` |
| `TASK-620.4` | `to-do` | Quote Builder Direct Picker (autocomplete a 4 catalogos: roles + tools + artifacts + services) | `docs/tasks/to-do/TASK-620.4-quote-builder-direct-picker.md` |
| `TASK-620.5` | `to-do` | Ad-hoc Bundle Composer in Quote (modal inline + flag is_ad_hoc + promote-to-catalog) | `docs/tasks/to-do/TASK-620.5-adhoc-bundle-composer.md` |
| `TASK-627` | `cancelled` | Service Bundle Nesting (ABSORBIDA en TASK-620.3 v1.8 — nesting in-baked desde dia 1) | `docs/tasks/cancelled/TASK-627-service-bundle-nesting.md` |
| `TASK-630` | `to-do` | Rich Text Editor TipTap en admin product-catalog (componente reusable GreenhouseRichTextEditor) | `docs/tasks/to-do/TASK-630-rich-text-editor-tiptap.md` |
| `TASK-630.1` | `to-do` | Backfill productos legacy con descripcion plana envuelta en `<p>` (74 productos) | `docs/tasks/to-do/TASK-630.1-backfill-products-rich-html.md` |
| `TASK-630.2` | `to-do` | AI-assisted Description Generator (boton Generar con AI usando @google/genai) | `docs/tasks/to-do/TASK-630.2-ai-description-generator.md` |
| `TASK-557.1` | `complete` | Legacy Quotes Cleanup & Limbo State Audit (legacy_status normalization + legacy_excluded flag) | `docs/tasks/complete/TASK-557.1-legacy-quotes-cleanup-audit.md` |
| `TASK-619.4` | `to-do` | HubSpot Bidirectional Signature Sync (deal stage Signed - Awaiting Invoice + anti-ping-pong + conflict resolution) | `docs/tasks/to-do/TASK-619.4-hubspot-bidirectional-signature-sync.md` |
| `TASK-619.5` | `to-do` | Cost Guardrails + GDPR Signer Anonymization (tenant_quotas + envelope/AI rate limits + anonymize endpoint) | `docs/tasks/to-do/TASK-619.5-cost-guardrails-gdpr-anonymization.md` |
| `TASK-620.6` | `to-do` | HubSpot Field Mapping Detallado (sellable_tools + sellable_artifacts + nested service_modules outbound contract v3) | `docs/tasks/to-do/TASK-620.6-hubspot-field-mapping-extended.md` |
| `TASK-620.7` | `to-do` | Catalog Lifecycle & Sunset (service_module_lifecycle states + soft-delete unified + sunset notifications) | `docs/tasks/to-do/TASK-620.7-catalog-lifecycle-sunset.md` |
| `TASK-621` | `to-do` | Commercial Analytics Dashboards (win/loss + velocity + discount + renewal rate + MRR + program adoption metrics) | `docs/tasks/to-do/TASK-621-commercial-analytics-dashboards.md` |
| `TASK-622` | `to-do` | Multi-level Approval + Permission Hierarchy (sales_rep / account_lead / sales_lead / finance_admin scopes + escalation) | `docs/tasks/to-do/TASK-622-multi-level-approval-permission-hierarchy.md` |
| `TASK-623` | `to-do` | Tier/Volume/Graduated Pricing Engine (pricingModel: flat \| volume \| graduated, commitment discounts) | `docs/tasks/to-do/TASK-623-tier-volume-graduated-pricing-engine.md` |
| `TASK-624` | `to-do` | Renewal Engine + Co-term + Alerting Cascade (cron 90/30/7 + auto-renewal quote + service_renewal_alerts) | `docs/tasks/to-do/TASK-624-renewal-engine-coterm-alerting.md` |
| `TASK-625` | `to-do` | Multi-language i18n del Programa CPQ (PDF + composer UI + notifications + ZapSign templates ES/EN) | `docs/tasks/to-do/TASK-625-multi-language-cpq-i18n.md` |
| `TASK-626` | `to-do` | Tax Engine LATAM Extendido (Colombia IVA + Mexico IVA + Peru IGV + Brazil ICMS futuro, plugin per-pais) | `docs/tasks/to-do/TASK-626-tax-engine-latam-extended.md` |
| `TASK-627.1` | `to-do` | Quote Cloning + Templating from Prior Quote (POST /clone, override cliente/version/pricing) | `docs/tasks/to-do/TASK-627.1-quote-cloning-templating.md` |
| `TASK-628` | `to-do` | Quote Amendment Engine (amendment vs re-quote, signed quotes mantienen continuidad legal) | `docs/tasks/to-do/TASK-628-quote-amendment-engine.md` |
| `TASK-628.1` | `to-do` | Audit Timeline UI (visibility en QuoteDetailView de audit_log + outbox events + diff viewer entre versiones) | `docs/tasks/to-do/TASK-628.1-audit-timeline-ui.md` |
| `TASK-631.1` | `to-do` | Quote Share Pipeline Hardening Test Suite (PDF cache + email + short-link + redirect blast-radius coverage) | `docs/tasks/to-do/TASK-631.1-quote-share-pipeline-hardening-tests.md` |
| `TASK-631.2` | `to-do` | Contract Version Enforcement (frozen contracts + auto-bump QUOTE_PDF_TEMPLATE_VERSION + Zod schemas) | `docs/tasks/to-do/TASK-631.2-contract-version-enforcement.md` |
| `TASK-629` | `complete` | PDF Cotización Enterprise Redesign (single template + secciones condicionales + brand assets + QR signed) | `docs/tasks/complete/TASK-629-pdf-cotizacion-enterprise-redesign.md` |
| `TASK-632` | `to-do` | Reliability Synthetic Monitoring (rutas críticas del registry — cron periódico de GET autenticado + adapter kind=runtime) | `docs/tasks/to-do/TASK-632-reliability-synthetic-monitoring-routes.md` |
| `TASK-633` | `to-do` | Reliability Change-Based Verification Matrix (PR diff → módulos afectados → smoke + signal verify, status check obligatorio) | `docs/tasks/to-do/TASK-633-reliability-change-based-verification-matrix.md` |
| `TASK-634` | `to-do` | Reliability Sentry Incident → Module Correlator (rules-first path/title → module, LLM como tiebreaker opcional) | `docs/tasks/to-do/TASK-634-reliability-sentry-incident-module-correlator.md` |
| `TASK-635` | `to-do` | Reliability Registry DB Persistence + Tenant Overrides (híbrido: seed estático mantiene defaults, DB guarda overrides per-tenant + SLOs) | `docs/tasks/to-do/TASK-635-reliability-registry-db-persistence-tenant-overrides.md` |
| `TASK-636` | `to-do` | Vercel Billing FOCUS Cost Observability in Admin Center | `docs/tasks/to-do/TASK-636-vercel-billing-focus-observability.md` |
| `TASK-637` | `to-do` | GitHub Billing & Actions Cost Observability in Admin Center | `docs/tasks/to-do/TASK-637-github-billing-actions-cost-observability.md` |
| `TASK-638` | `complete` | Reliability AI Observer (Gemini watcher hosted en ops-worker + Cloud Scheduler) | `docs/tasks/complete/TASK-638-reliability-ai-observer.md` |
| `TASK-639` | `complete` | Finance VAT Reactive Lane & Data Quality Semantics Hardening | `docs/tasks/complete/TASK-639-finance-vat-reactive-data-quality-hardening.md` |
| `TASK-640` | `in-progress` | Nubox V2 Enterprise Enrichment Program | `docs/tasks/in-progress/TASK-640-nubox-v2-enterprise-enrichment.md` |
| `TASK-641` | `to-do` | Adopt Apache ECharts as canonical chart stack for high-impact dashboards | `docs/tasks/to-do/TASK-641-echarts-stack-adoption.md` |
| `TASK-642` | `to-do` | Greenhouse Motion Polish Program 2026 (umbrella) | `docs/tasks/to-do/TASK-642-motion-polish-program-2026.md` |
| `TASK-643` | `to-do` | Microinteractions polish + tokens canónicos de motion | `docs/tasks/to-do/TASK-643-microinteractions-polish.md` |
| `TASK-644` | `to-do` | Page entrance + skeleton crossfade | `docs/tasks/to-do/TASK-644-page-entrance-skeleton-crossfade.md` |
| `TASK-645` | `to-do` | KPI counter animations (rolling numbers) | `docs/tasks/to-do/TASK-645-kpi-counter-animations.md` |
| `TASK-646` | `to-do` | Scroll-triggered chart entrance + list stagger | `docs/tasks/to-do/TASK-646-scroll-triggered-chart-entrance-stagger.md` |
| `TASK-647` | `complete` | Greenhouse MCP Read-Only Adapter V1 | `docs/tasks/complete/TASK-647-greenhouse-mcp-read-only-adapter-v1.md` |
| `TASK-648` | `to-do` | API Platform ICO Read Surface V1 | `docs/tasks/to-do/TASK-648-api-platform-ico-read-surface-v1.md` |
| `TASK-649` | `complete` | API Platform Completion Program | `docs/tasks/complete/TASK-649-api-platform-completion-program.md` |
| `TASK-650` | `to-do` | API Platform Domain Read Surfaces Program | `docs/tasks/to-do/TASK-650-api-platform-domain-read-surfaces-program.md` |
| `TASK-651` | `to-do` | API Platform Finance / Commercial Read Surface | `docs/tasks/to-do/TASK-651-api-platform-finance-commercial-read-surface.md` |
| `TASK-652` | `to-do` | API Platform People / Workforce Read Surface | `docs/tasks/to-do/TASK-652-api-platform-people-workforce-read-surface.md` |
| `TASK-653` | `to-do` | API Platform Ops / Reliability Read Surface | `docs/tasks/to-do/TASK-653-api-platform-ops-reliability-read-surface.md` |
| `TASK-654` | `to-do` | API Platform Organization Workspace Facets Read Surface | `docs/tasks/to-do/TASK-654-api-platform-organization-workspace-facets-read-surface.md` |
| `TASK-655` | `to-do` | API Platform Command & Idempotency Foundation | `docs/tasks/to-do/TASK-655-api-platform-command-idempotency-foundation.md` |
| `TASK-656` | `to-do` | API Platform Query Conventions Foundation | `docs/tasks/to-do/TASK-656-api-platform-query-conventions-foundation.md` |
| `TASK-657` | `to-do` | API Platform Degraded Modes & Dependency Health | `docs/tasks/to-do/TASK-657-api-platform-degraded-modes-dependency-health.md` |
| `TASK-658` | `to-do` | API Platform Resource Authorization Bridge | `docs/tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md` |
| `TASK-659` | `to-do` | MCP OAuth / Hosted Auth Model | `docs/tasks/to-do/TASK-659-mcp-oauth-hosted-auth-model.md` |
| `TASK-660` | `to-do` | API Platform OpenAPI Stable Contract | `docs/tasks/to-do/TASK-660-api-platform-openapi-stable-contract.md` |
| `TASK-661` | `to-do` | API Platform Lifecycle & Deprecation Policy | `docs/tasks/to-do/TASK-661-api-platform-lifecycle-deprecation-policy.md` |
| `TASK-662` | `to-do` | Nubox Document Graph Foundation | `docs/tasks/to-do/TASK-662-nubox-document-graph-foundation.md` |
| `TASK-663` | `to-do` | Nubox Durable PDF/XML Artifact Persistence | `docs/tasks/to-do/TASK-663-nubox-durable-pdf-xml-artifacts.md` |
| `TASK-664` | `to-do` | Nubox Payment Graph & Expense Ledger Reconciliation | `docs/tasks/to-do/TASK-664-nubox-payment-graph-expense-ledger-reconciliation.md` |
| `TASK-665` | `to-do` | Nubox Tax Graph & VAT Data Quality Enrichment | `docs/tasks/to-do/TASK-665-nubox-tax-graph-vat-data-quality.md` |
| `TASK-666` | `to-do` | Nubox Master Data Enrichment Governance | `docs/tasks/to-do/TASK-666-nubox-master-data-enrichment-governance.md` |
| `TASK-667` | `to-do` | Nubox Additional Hot Lanes | `docs/tasks/to-do/TASK-667-nubox-additional-hot-lanes.md` |
| `TASK-668` | `to-do` | Nubox Ops Replay & Enterprise Promotion | `docs/tasks/to-do/TASK-668-nubox-ops-replay-enterprise-promotion.md` |
| `TASK-669` | `to-do` | Teams Workflow Notifications Channel | `docs/tasks/to-do/TASK-669-teams-workflow-notifications-channel.md` |
| `TASK-670` | `to-do` | Brand Icon Library React Adapter | `docs/tasks/to-do/TASK-670-brand-icon-library-react-adapter.md` |
| `TASK-671` | `complete` (closed 2026-05-05 — Azure deploy + cutover) | Greenhouse Teams Bot Platform (Bot Framework + Graph) | `docs/tasks/complete/TASK-671-greenhouse-teams-bot-platform.md` |
| `TASK-672` | `to-do` | Platform Health API Contract | `docs/tasks/to-do/TASK-672-platform-health-api-contract.md` |
| `TASK-673` | `complete` | Mercado Publico Licitaciones Intelligence (POC + Validacion de Matcher) | `docs/tasks/complete/TASK-673-mercadopublico-poc.md` |
| `TASK-674` | `to-do` | Commercial Public Procurement Architecture Contract | `docs/tasks/to-do/TASK-674-commercial-public-procurement-architecture-contract.md` |
| `TASK-675` | `to-do` | Mercado Publico Licitaciones Ingestion Foundation | `docs/tasks/to-do/TASK-675-mercado-publico-licitaciones-ingestion-foundation.md` |
| `TASK-676` | `to-do` | Mercado Publico Purchase Order Reconciliation Foundation | `docs/tasks/to-do/TASK-676-mercado-publico-purchase-order-reconciliation.md` |
| `TASK-677` | `to-do` | Compra Agil Monthly COT Ingestion Foundation | `docs/tasks/to-do/TASK-677-compra-agil-cot-ingestion-foundation.md` |
| `TASK-678` | `to-do` | Compra Agil Beta API Watch And Adapter Spike | `docs/tasks/to-do/TASK-678-compra-agil-beta-api-watch-adapter-spike.md` |
| `TASK-679` | `to-do` | Mercado Publico Document Ingestion And Private Assets | `docs/tasks/to-do/TASK-679-mercado-publico-document-ingestion-private-assets.md` |
| `TASK-680` | `to-do` | Mercado Publico Procedure Taxonomy Registry | `docs/tasks/to-do/TASK-680-mercado-publico-procedure-taxonomy-registry.md` |
| `TASK-681` | `to-do` | Consulta al Mercado / RFI Discovery Spike | `docs/tasks/to-do/TASK-681-consulta-mercado-rfi-discovery-spike.md` |
| `TASK-682` | `to-do` | Public Tenders Scoring V1 | `docs/tasks/to-do/TASK-682-public-tenders-scoring-v1.md` |
| `TASK-683` | `to-do` | Public Tenders Workbench List And Detail | `docs/tasks/to-do/TASK-683-public-tenders-workbench-list-detail.md` |
| `TASK-684` | `to-do` | Public Tenders Bid / No-Bid Workflow | `docs/tasks/to-do/TASK-684-public-tenders-bid-no-bid-workflow.md` |
| `TASK-685` | `to-do` | Tender Document Intelligence And Requirement Extraction | `docs/tasks/to-do/TASK-685-tender-document-intelligence-requirements.md` |
| `TASK-686` | `to-do` | Tender To Deal / Quote Bridge | `docs/tasks/to-do/TASK-686-tender-to-deal-quote-bridge.md` |
| `TASK-687` | `to-do` | Public Tender Notifications And Reliability Signals | `docs/tasks/to-do/TASK-687-public-tender-notifications-reliability.md` |
| `TASK-688` | `to-do` | Public Tender Submission Control Room Without API-Side Posting | `docs/tasks/to-do/TASK-688-public-tender-submission-control-room.md` |
| `TASK-689` | `to-do` | Mercado Publico Companion Extension Research Spike | `docs/tasks/to-do/TASK-689-mercado-publico-companion-extension-research.md` |
| `TASK-690` | `to-do` | Notification Hub Architecture Contract | `docs/tasks/to-do/TASK-690-notification-hub-architecture-contract.md` |
| `TASK-691` | `to-do` | Notification Hub Shadow Mode | `docs/tasks/to-do/TASK-691-notification-hub-shadow-mode.md` |
| `TASK-692` | `to-do` | Notification Hub Cutover | `docs/tasks/to-do/TASK-692-notification-hub-cutover.md` |
| `TASK-693` | `to-do` | Notification Hub Bidireccional + UI Preferences + Mentions | `docs/tasks/to-do/TASK-693-notification-hub-bidirectional-ui.md` |
| `TASK-694` | `complete` | Deep Link Platform Foundation | `docs/tasks/complete/TASK-694-deep-link-platform-foundation.md` |
| `TASK-695` | `to-do` | Nexa Insights via Notification Hub (Teams + In-App + Email) | `docs/tasks/to-do/TASK-695-nexa-insights-teams-delivery.md` |
| `TASK-696` | `complete` (closed 2026-05-05 — Waves 1-7 shipped) | Smart Home v2 (Enterprise-grade redesign — registry + contract + observability + 7 blocks) | `docs/tasks/complete/TASK-696-smart-home-v2-enterprise.md` |
| `TASK-697` | `complete` | Payment Instrument Admin Workspace Enterprise | `docs/tasks/complete/TASK-697-payment-instrument-admin-workspace-enterprise.md` |
| `TASK-698` | `to-do` | Nexa Conversation Drawer (cierre del Hero AI Smart Home v2) | `docs/tasks/to-do/TASK-698-nexa-conversation-drawer.md` |
| `TASK-699` | `complete` | Banco "Resultado cambiario" Canonical FX P&L Pipeline | `docs/tasks/complete/TASK-699-banco-fx-result-canonical-pipeline.md` |
| `TASK-700` | `complete` | Internal Account Number Allocator (CCA + future wallets) | `docs/tasks/complete/TASK-700-internal-account-number-allocator.md` |
| `TASK-701` | `complete` | Payment Provider Catalog + Greenhouse as platform_operator | `docs/tasks/complete/TASK-701-payment-provider-catalog-greenhouse-as-platform.md` |
| `TASK-702` | `complete` | Bank Reconciliation, Canonical Anchors & Account Balances Rematerialization | `docs/tasks/complete/TASK-702-bank-reconciliation-canonical-anchors-rematerialize.md` |
| `TASK-703` | `complete` | Canonical Opening Trial Balance + Liability Accounts (TC, CCA, future loans) | `docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md` |
| `TASK-705` | `complete` | Banco Read Model & Snapshot Cutover | `docs/tasks/complete/TASK-705-banco-read-model-snapshot-cutover.md` |
| `TASK-706` | `to-do` | Previred Processor UX & Bank Semantics | `docs/tasks/to-do/TASK-706-previred-processor-ux-and-bank-semantics.md` |
| `TASK-707` | `to-do` (umbrella) | Previred Canonical Payment Runtime & Backfill — split en 707a/b/c (2026-04-28) | `docs/tasks/to-do/TASK-707-previred-canonical-payment-runtime-and-backfill.md` |
| `TASK-707a` | `to-do` | Previred Detection & Canonical State Runtime (no backfill) | `docs/tasks/to-do/TASK-707a-previred-detection-and-canonical-state-runtime.md` |
| `TASK-707b` | `to-do` | Previred Historical Backfill & Downstream Rematerialize (bloqueada por 707a) | `docs/tasks/to-do/TASK-707b-previred-historical-backfill-and-rematerialize.md` |
| `TASK-707c` | `to-do` | Previred Componentization Runtime (bloqueada por 707a + 707b) | `docs/tasks/to-do/TASK-707c-previred-componentization-runtime.md` |
| `TASK-708` | `complete` | Nubox Documents-Only SoT + Reconciliation Purity Cutover | `docs/tasks/complete/TASK-708-nubox-documents-only-and-reconciliation-sot-cutover.md` |
| `TASK-708b` | `complete` | Nubox Phantom Cohort Remediation (historical cleanup) | `docs/tasks/complete/TASK-708b-nubox-phantom-cohort-remediation.md` |
| `TASK-708c` | `to-do` | Promote `payment_account_id` CHECK to `NOT NULL` puro (post 30 dias) | `docs/tasks/to-do/TASK-708c-promote-payment-account-id-not-null.md` |
| `TASK-708d` | `to-do` | Post-Cutover Phantom Cohort Detector | `docs/tasks/to-do/TASK-708d-post-cutover-phantom-cohort-detector.md` |
| `TASK-710` | `to-do` | Tool Consumption Bridge (provider→tool→assignment→consumption→client) — MLCM Fase 2 | `docs/tasks/to-do/TASK-710-tool-consumption-bridge.md` |
| `TASK-711` | `to-do` | Member ↔ Tool License Assignment UI — MLCM ops surface | `docs/tasks/to-do/TASK-711-member-tool-license-ui.md` |
| `TASK-712` | `to-do` | Tool Catalog Consolidation (cost models, lifecycle, vendor FK) — MLCM Fase 2 | `docs/tasks/to-do/TASK-712-tool-catalog-consolidation.md` |
| `TASK-713` | `to-do` | Period Closing Workflow (snapshots inmutables + restatement) — MLCM Fase 4 | `docs/tasks/to-do/TASK-713-period-closing-workflow.md` |
| `TASK-714` | `complete` | Banco Instrument Detail Semantic Drawer | `docs/tasks/complete/TASK-714-banco-instrument-detail-semantic-drawer.md` |
| `TASK-714c` | `to-do` | Shareholder Reimbursable Expense Canonical Runtime (factory + UI) | `docs/tasks/to-do/TASK-714c-shareholder-reimbursable-expense-canonical-runtime.md` |
| `TASK-714d` | `to-do` (umbrella, Slice 1+2 ✅) | Internal Transfer Pair Invariant + Global66 ledger canonicalization | `docs/tasks/to-do/TASK-714d-internal-transfer-pair-invariant.md` |
| `TASK-715` | `to-do` | Reconciliation Test Period Archive UX | `docs/tasks/to-do/TASK-715-reconciliation-test-period-archive-ux.md` |
| `TASK-716` | `to-do` | Manual Team Announcements | `docs/tasks/to-do/TASK-716-manual-team-announcements.md` |
| `TASK-717` | `to-do` | Reclasificación payroll declarativa via intents table (deriva TASK-714d Slice 3) | `docs/tasks/to-do/TASK-717-payroll-reclassification-intents.md` |
| `TASK-718` | `to-do` | TC backfill: análisis automatizado debt-reduction model + apply (deriva TASK-714d Slice 4) | `docs/tasks/to-do/TASK-718-tc-debt-reduction-model-decision.md` |
| `TASK-719` | `to-do` | OTB Global66 verificación contra cartola + detector de evidence_refs (deriva TASK-714d Slice 5) | `docs/tasks/to-do/TASK-719-otb-global66-verification-and-evidence-detector.md` |
| `TASK-720` | `complete` | Instrument Category KPI Rules + policy-driven Bank aggregation | `docs/tasks/complete/TASK-720-instrument-category-kpi-rules.md` |
| `TASK-721` | `complete` | Finance evidence canonical uploader (reconciliation + OTB) | `docs/tasks/complete/TASK-721-finance-evidence-canonical-uploader.md` |
| `TASK-722` | `complete` | Bank Reconciliation Synergy Workbench | `docs/tasks/complete/TASK-722-bank-reconciliation-synergy-workbench.md` |
| `TASK-723` | `complete` | AI-Assisted Reconciliation Intelligence | `docs/tasks/complete/TASK-723-ai-assisted-reconciliation-intelligence.md` |
| `TASK-724` | `to-do` | Cash Position Canonical Ledger Alignment | `docs/tasks/to-do/TASK-724-cash-position-canonical-ledger-alignment.md` |
| `TASK-725` | `to-do` | Finance Fiscal Scope & Legal Entity Foundation | `docs/tasks/to-do/TASK-725-finance-fiscal-scope-legal-entity-foundation.md` |
| `TASK-726` | `complete` | Finance Movement Feed Foundation | `docs/tasks/complete/TASK-726-finance-movement-feed-foundation.md` |
| `TASK-727` | `complete` | Internal Role × View Matrix Seed + Supervisor Scope en JWT | `docs/tasks/complete/TASK-727-internal-role-view-seed-and-supervisor-jwt.md` |
| `TASK-728` | `complete` | Finance Movement Feed Decision Polish | `docs/tasks/complete/TASK-728-finance-movement-feed-decision-polish.md` |
| `TASK-729` | `complete` | Payroll Reliability Module + Domain Tag + Data Quality Subsystem | `docs/tasks/complete/TASK-729-payroll-reliability-module.md` |
| `TASK-730` | `to-do` | Payroll E2E Smoke Lane (calculate → approve → close) | `docs/tasks/to-do/TASK-730-payroll-e2e-smoke-lane.md` |
| `TASK-731` | `to-do` | Payroll Pre-Close Validator + Pre-Flight Endpoint | `docs/tasks/to-do/TASK-731-payroll-pre-close-validator.md` |
| `TASK-732` | `to-do` | Payroll ICO Safety Gate + KPI Provenance for Liquidación y Reliquidación | `docs/tasks/to-do/TASK-732-payroll-ico-safety-gate-and-kpi-provenance.md` |
| `TASK-733` | `to-do` | ICO Locked Snapshot Immutability + Reliquidación Reproducibility | `docs/tasks/to-do/TASK-733-ico-locked-snapshot-immutability-and-reliquidation-reproducibility.md` |
| `TASK-734` | `to-do` | ICO Materialization Concurrency, Idempotency & AI Isolation Hardening | `docs/tasks/to-do/TASK-734-ico-materialization-concurrency-idempotency-and-ai-isolation.md` |
| `TASK-735` | `to-do` | ICO Consumer Boundary & Scoped Read Surface Convergence | `docs/tasks/to-do/TASK-735-ico-consumer-boundary-and-scoped-read-surface-convergence.md` |
| `TASK-736` | `to-do` | Greenhouse Consumption Hardening for `notion-bq-sync` | `docs/tasks/to-do/TASK-736-greenhouse-notion-bq-sync-consumption-hardening.md` |
| `TASK-737` | `to-do` | `notion-bq-sync` Hardening Contract & Absorption Readiness | `docs/tasks/to-do/TASK-737-notion-bq-sync-hardening-contract-and-absorption-readiness.md` |
| `TASK-738` | `to-do` | Portal Notion SDK Migration | `docs/tasks/to-do/TASK-738-portal-notion-sdk-migration.md` |
| `TASK-739` | `to-do` | Notion API Modernization Readiness | `docs/tasks/to-do/TASK-739-notion-api-modernization-readiness.md` |
| `TASK-740` | `to-do` | Critical Metrics Change Safety Harness | `docs/tasks/to-do/TASK-740-critical-metrics-change-safety-harness.md` |
| `TASK-741` | `complete` | Greenhouse MCP Remote Gateway V1 | `docs/tasks/complete/TASK-741-greenhouse-mcp-remote-gateway-v1.md` |
| `TASK-742` | `complete` | Auth Resilience 7-Layer Architecture | `docs/tasks/complete/TASK-742-auth-resilience-7-layers.md` |
| `TASK-743` | `complete` | Operational Data Table Density Contract (DataTableShell + InlineNumericEditor + lint+visual gates + 14 legacy tables migrated) | `docs/tasks/complete/TASK-743-operational-data-table-density-contract.md` |
| `TASK-744` | `complete` | Payroll Chile Compliance Remediation & International Guardrails | `docs/tasks/complete/TASK-744-payroll-chile-compliance-remediation.md` |
| `TASK-745` | `to-do` | Payroll Adjustments Foundation V1 (exclude / gross_factor / fixed_deduction event-sourced) | `docs/tasks/to-do/TASK-745-payroll-adjustments-foundation.md` |
| `TASK-746` | `to-do` | Adjustment Schedules + Finance Ledger Integration (loans, advances, cron materialization) | `docs/tasks/to-do/TASK-746-adjustment-schedules-finance-ledger.md` |
| `TASK-747` | `complete` | Payment Orders Program (umbrella, V1 cerrado) | `docs/tasks/complete/TASK-747-payment-orders-program.md` |
| `TASK-748` | `complete` | Payment Obligations Foundation V1 | `docs/tasks/complete/TASK-748-payment-obligations-foundation.md` |
| `TASK-749` | `complete` | Beneficiary Payment Profiles + Routing Policies V1 (dual-surface) | `docs/tasks/complete/TASK-749-beneficiary-payment-profiles-routing.md` |
| `TASK-750` | `complete` | Payment Orders, Batches, Payment Calendar + Maker-Checker Runtime V1 | `docs/tasks/complete/TASK-750-payment-orders-batches-maker-checker.md` |
| `TASK-751` | `complete` | Payroll Settlement Orchestration + Reconciliation Integration V1 | `docs/tasks/complete/TASK-751-payroll-settlement-orchestration-reconciliation.md` |
| `TASK-752` | `to-do` | Payment Profiles V2 Foundation (Suppliers + Tax authorities + Autocomplete + Scheduled rotation) | `docs/tasks/to-do/TASK-752-payment-profiles-v2-foundation.md` |
| `TASK-753` | `to-do` | Payment Profiles Self-Service (Mi cuenta de pago + Notificaciones) | `docs/tasks/to-do/TASK-753-payment-profiles-self-service.md` |
| `TASK-754` | `to-do` | Payment Profiles V3 Hardening (Vault externo + Micro-deposit verification) | `docs/tasks/to-do/TASK-754-payment-profiles-vault-and-verification.md` |
| `TASK-755` | `to-do` | Payment Profiles Ops Advanced (Bulk approve + Diff viewer + Splits + Threshold routing) | `docs/tasks/to-do/TASK-755-payment-profiles-ops-advanced.md` |
| `TASK-756` | `to-do` | Auto-generación de Payment Orders desde Payroll exportado (puente operativo faltante) | `docs/tasks/to-do/TASK-756-payroll-orders-auto-generation.md` |
| `TASK-757` | `to-do` | Payment Processor Execution Sync + Global66 Webhook Adapter V1 | `docs/tasks/to-do/TASK-757-payment-processor-execution-sync-global66-webhook.md` |
| `TASK-758` | `complete` | Payroll Receipt Render Contract Hardening (4 regímenes: chile_dependent, honorarios, international_deel, international_internal — helper canónico `resolveReceiptRegime` + `buildReceiptPresentation` puro server-safe con exhaustiveness `never`-check; cierra bug raíz `isChile=payRegime==='chile'` que afecta a 3/4 regímenes; RECEIPT_TEMPLATE_VERSION 3→4 lazy regen; ProjectedPayrollView converge al detector canónico; mockup vinculante 5-skills aprobado; F6 PeriodReport+Excel queda en TASK-782) | `docs/tasks/complete/TASK-758-payroll-honorarios-receipt-render-contract-hardening.md` |
| `TASK-759` | `complete` (closed 2026-05-05 — V1 ejecución path shipped) | Payslip Delivery On Payment Paid (split lifecycle) | `docs/tasks/complete/TASK-759-payslip-delivery-on-payment-paid.md` |
| `TASK-759b` | `to-do` | Payslip Payment Committed Promise (V2 sub-task) | `docs/tasks/to-do/TASK-759b-payslip-payment-committed-promise.md` |
| `TASK-759c` | `to-do` | Payslip Cancellation & Revision Compensation (V2 sub-task) | `docs/tasks/to-do/TASK-759c-payslip-cancellation-revision-compensation.md` |
| `TASK-759d` | `to-do` | Payslip UI Timeline + Capability finance.payslip.resend (V2 sub-task) | `docs/tasks/to-do/TASK-759d-payslip-ui-timeline-capability.md` |
| `TASK-759e` | `to-do` | Extender /my/payroll con estado de pago + timeline (V2 sub-task) | `docs/tasks/to-do/TASK-759e-mi-greenhouse-mis-pagos.md` |
| `TASK-759f` | `to-do` | Payslip Reliability Registry + Sentry Domain (V2 sub-task) | `docs/tasks/to-do/TASK-759f-payslip-reliability-sentry-domain.md` |
| `TASK-760` | `complete` | Workforce Offboarding Runtime Foundation | `docs/tasks/complete/TASK-760-workforce-offboarding-runtime-foundation.md` |
| `TASK-761` | `complete` | Payroll Final Settlement / Finiquito Engine Chile | `docs/tasks/complete/TASK-761-payroll-final-settlement-finiquito-engine-chile.md` |
| `TASK-762` | `complete` | Finiquito Document Generation + Approval Flow | `docs/tasks/complete/TASK-762-finiquito-document-generation-approval-flow.md` |
| `TASK-763` | `complete` | Lifecycle Onboarding & Offboarding UI Mockup Adoption | `docs/tasks/complete/TASK-763-lifecycle-onboarding-offboarding-ui-mockup-adoption.md` |
| `TASK-764` | `to-do` | DESIGN.md Contract Hardening (CI gate + spec sync + token hygiene + agent injection) | `docs/tasks/to-do/TASK-764-design-md-contract-hardening.md` |
| `TASK-765` | `complete` | Payment Order ↔ Bank Settlement Resilience (atomic mark-paid + materialize-or-throw + reliability signals + state machine hardening + recovery del incidente 2026-05-01) | `docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md` |
| `TASK-766` | `complete` | Finance CLP-Currency Reader Contract Resilience (VIEW expense_payments_normalized + helper canónico + lint rule no-untokenized-fx-math + reliability signal + repair endpoint + recovery del bug KPIs inflados 88× 2026-05-02) | `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md` |
| `TASK-767` | `reserved` | API Error Response Hardening + Transient Connection Retry (slot reservado; spec aún no creada — pendiente decisión scope) | `pending` |
| `TASK-768` | `complete` | Finance Expense Economic Category Dimension (separación accounting_type vs economic_category, populated at write-time, backfill defensivo, CHECK NOT NULL post-cutover, hint engine en bank reconciler, reclassification UI con audit + outbox v1, 2 reliability signals, lint rule, migración exhaustiva 8+ consumers analíticos, cierra mis-clasificación KPI Nómina detectada 2026-05-03) | `docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md` |
| `TASK-769` | `complete` | Cloud Cost Intelligence + AI FinOps Copilot (Billing Export V2 + resource drill-down + deterministic spike detection + AI grounded interpretation + alert routing portal-first) | `docs/tasks/complete/TASK-769-cloud-cost-intelligence-ai-finops-copilot.md` |
| `TASK-770` | `to-do` | Hiring to HRIS Collaborator Activation | `docs/tasks/to-do/TASK-770-hiring-to-hris-collaborator-activation.md` |
| `TASK-771` | `complete` | Finance Supplier Write Decoupling + BQ Projection vía Outbox (desacopla POST/PUT supplier de BQ inline; projection canónica `provider_bq_sync` consumiendo `provider.upserted` en ops-worker; reliability signal `finance.providers.bq_sync_drift`; backfill script one-shot para 3 suppliers huérfanos figma/microsoft/notion; recovery del incidente 2026-05-03 "Error al crear proveedor"; 5 slices entregados, 3025 tests verde) | `docs/tasks/complete/TASK-771-finance-supplier-write-decoupling-bq-projection.md` |
| `TASK-772` | `complete` | Finance Expense Supplier Hydration & Cash-Out Selection Integrity (5 slices: extiende contract reader expense con `supplierDisplayName`/`sortDate`/`amountPaid+Clp`/`pendingAmount+Clp`/`amountPaidIsHomogeneous` via LEFT JOIN suppliers + LATERAL aggregate VIEW canónica TASK-766; CTE en INSERT/UPDATE/RETURNING para outbox payload completo; ExpensesListView sort canónico; RegisterCashOutDrawer agrupa por `supplierKey` estable + separa moneda original vs CLP; POST hidrata snapshot supplier_name desde supplierId; tests regresión Figma EXP-202604-008) | `docs/tasks/complete/TASK-772-finance-expense-supplier-hydration-cash-out-selection.md` |
| `TASK-773` | `complete` | Outbox Publisher Cloud Scheduler Cutover + Reliability + E2E Pre-Merge Gate (cerrada 2026-05-03; absorbe TASK-262; state machine `pending→publishing→published/failed/dead_letter`; 2 reliability signals; finance E2E gate script + smoke nuevo verde Playwright+Chromium contra staging; cierra incidente Figma TC no rebajada del 2026-05-03) | `docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md` |
| `TASK-774` | `to-do` | Account Balance CLP-Native Reader Contract — patrón TASK-766 aplicado al path materializeAccountBalance (bug detectado 2026-05-03 post-TASK-773: el balance suma payment_amount_native en vez de payment_amount_clp, mostrando $92.9 USD como CLP en lugar de $83.773.5 CLP equivalente; aplicar VIEW canónica expense_payments_normalized + helper canónico + lint rule + reliability signal) | `docs/tasks/to-do/TASK-774-account-balance-clp-native-reader-contract.md` |
| `TASK-775` | `in-progress` | Vercel Cron Async-Critical Migration Platform (absorbe TASK-258 + TASK-259; cierra clase entera de bugs invisibles staging async; migra 15 crons async-critical Vercel→Cloud Scheduler; helper canónico de migración; reliability signal `platform.cron.staging_drift`; lint rule `greenhouse/no-vercel-cron-for-async-critical` mode error; clasificación canónica `async_critical`/`prod_only`/`tooling`; verificación E2E Playwright+Chromium; resuelve emisores outbox detectados en audit 2026-05-03 `email-deliverability-monitor`+`nubox-balance-sync` y duplicados `ico-materialize`+`quotation-lifecycle`) | `docs/tasks/in-progress/TASK-775-vercel-cron-async-critical-migration-platform.md` |
| `TASK-776` | `in-progress` | Account Detail Drawer Temporal Modes Contract (canoniza `temporalMode: 'snapshot'/'period'/'audit'` declarado en `instrument-presentation.ts` por categoría; helper canónico `resolveTemporalWindow`; endpoint `/api/finance/bank/[accountId]?mode=...` con backward compat; drawer default `snapshot` rolling 30d muestra movimientos recientes incluyendo Figma sin click adicional; selector inline 3 modos; chip header con ventana actual; banner OTB condicional; cierra deuda arquitectónica del drawer detectada 2026-05-03 post-fix TASK-774) | `docs/tasks/in-progress/TASK-776-account-detail-drawer-temporal-modes-contract.md` |
| `TASK-777` | `complete` | Canonical Expense Distribution & Shared Cost Pools (resolver `expense -> distribution lane`, shared pools canónicos, remediation abril 2026, close gate para meses futuros e IA advisory-only con aprobación humana) | `docs/tasks/complete/TASK-777-canonical-expense-distribution-and-shared-cost-pools.md` |
| `TASK-778` | `to-do` (blocked by TASK-779) | Treasury-Grade Cash Position Contract (refactor `/finance/cash-position` que viola IAS 7 §6 mezclando assets+liabilities+accounts in transit en KPI "Posición neta"; introduce `account_treasury_class` enum + 8 surfaces canónicas: Cash on Hand reconciliado / Runway / 13-week rolling forecast / AR aging / AP scheduling / FX exposure / IAS 7 categorización Operating-Investing-Financing / Working Capital DSO-DPO-CCC; reliability signals `cash_position.kpi_drift` + `unreconciled_accounts`; lint rule `no-untokenized-cash-aggregation`; benchmarks Mercury/Brex/Stripe Treasury/Kyriba; auditoría origen 2026-05-03 vía skill greenhouse-finance-accounting-operator) | `docs/tasks/to-do/TASK-778-treasury-grade-cash-position-contract.md` |
| `TASK-779` | `to-do` (P0 blocker para TASK-778) | Treasury Hub Spec Canonization + Visual Regression Foundation (canoniza el mockup aprobado de TASK-778 en 6 specs: GREENHOUSE_TREASURY_HUB_SPEC_V1.md + mockup HTML commiteado + microinteractions canónicas + WCAG 2.2 AA accessibility checklist + component manifest Vuexy/Recharts/tokens + decision log; monta visual regression infra Playwright+Chromium+agent auth con baseline snapshots por surface; tolerance maxDiffPixelRatio 0.01; viewports desktop/tablet/mobile; pattern reusable para futuras tasks UI via TEMPLATE-task-spec.md + UI_TASK_SPEC_OPERATING_MODEL_V1.md; cierra gap detectado 2026-05-03 cuando mockup aprobado vivía solo en /tmp + chat sin canonización ni mecánica de validación implementación-vs-mockup) | `docs/tasks/to-do/TASK-779-treasury-hub-spec-canonization-visual-regression-foundation.md` |
| `TASK-780` | `complete` | Home Rollout Flag Platform (tabla canónica `home_rollout_flags` PG-backed con scope precedence user>role>tenant>global, resolver PG-first→env fallback, reliability signal `home.rollout.drift`, Sentry tag `home_version`, admin endpoint `GET/POST/DELETE /api/admin/home/rollout-flags`, defensive try/catch V2→legacy degrade graceful; reemplaza env var binaria `HOME_V2_ENABLED` que causó divergencia visible dev↔prod 2026-05-04) | `docs/tasks/complete/TASK-780-home-rollout-flag-platform.md` |
| `TASK-781` | `to-do` | SCIM Reliability & Governance Control Plane | `docs/tasks/to-do/TASK-781-scim-reliability-governance-control-plane.md` |
| `TASK-782` | `complete` | Payroll Period Report + Excel Honorarios Disaggregation (PeriodReportDocument PDF + generate-payroll-excel.ts consumen `groupEntriesByRegime` exportado por TASK-758; subtotales `Total descuentos previsionales` + `Total retención SII honorarios` mutuamente excluyentes; PDF 10 columnas + summary strip 8 KPIs + 4 group dividers + estado `excluded` visible; Excel 2 sheets nuevas `Chile`/`Internacional` con 2 secciones internas + cell.note reconciliación Previred/F29) | `docs/tasks/complete/TASK-782-payroll-period-report-excel-honorarios-disaggregation.md` |
| `TASK-783` | `to-do` | Payroll Final Settlement Component Policy + Overlap Hardening | `docs/tasks/to-do/TASK-783-payroll-final-settlement-component-policy-overlap-hardening.md` |
| `TASK-784` | `to-do` | Person Legal Profile + Identity Documents Foundation | `docs/tasks/to-do/TASK-784-person-legal-profile-identity-documents-foundation.md` |
| `TASK-785` | `to-do` | Workforce Role Title Source of Truth + Assignment Override Governance | `docs/tasks/to-do/TASK-785-workforce-role-title-source-of-truth-governance.md` |
| `TASK-786` | `to-do` | Person Contact & Professional Presence Governance | `docs/tasks/to-do/TASK-786-person-contact-professional-presence-governance.md` |
| `TASK-787` | `to-do` | Person Country Reconciliation (Entra ↔ Declared) | `docs/tasks/to-do/TASK-787-person-country-reconciliation-entra-declared.md` |
| `TASK-788` | `to-do` | Workforce Role Title Effective-Dating + Compensation-Coupled Promotions | `docs/tasks/to-do/TASK-788-workforce-role-title-effective-dating-promotion-flow.md` |
| `TASK-789` | `complete` | Workforce Relationship Transition: Employee to Contractor (EPIC-013 child 1/10) | `docs/tasks/complete/TASK-789-workforce-relationship-transition-employee-to-contractor.md` |
| `TASK-790` | `to-do` | Contractor Engagements Runtime + Classification Risk (EPIC-013 child 2/10) | `docs/tasks/to-do/TASK-790-contractor-engagements-runtime-classification-risk.md` |
| `TASK-791` | `to-do` | Contractor Invoice Assets + Greenhouse Uploader Contexts (EPIC-013 child 3/10) | `docs/tasks/to-do/TASK-791-contractor-invoice-assets-uploader-contexts.md` |
| `TASK-792` | `to-do` | Contractor Work Submissions + Approval/Dispute Flow (EPIC-013 child 4/10) | `docs/tasks/to-do/TASK-792-contractor-work-submissions-approval-dispute-flow.md` |
| `TASK-793` | `to-do` | Contractor Payables to Finance Payment Obligations Bridge (EPIC-013 child 5/10) | `docs/tasks/to-do/TASK-793-contractor-payables-finance-obligations-bridge.md` |
| `TASK-794` | `to-do` | Chile Honorarios Compliance + SII Retention (EPIC-013 child 6/10) | `docs/tasks/to-do/TASK-794-chile-honorarios-compliance-sii-retention.md` |
| `TASK-795` | `to-do` | International Contractor + Provider Boundary + FX Policy (EPIC-013 child 7/10) | `docs/tasks/to-do/TASK-795-international-contractor-provider-boundary-fx-policy.md` |
| `TASK-796` | `to-do` | Contractor Self-Service Hub (EPIC-013 child 8/10) | `docs/tasks/to-do/TASK-796-contractor-self-service-hub.md` |
| `TASK-797` | `to-do` | Contractor Closure + Transition Controls (EPIC-013 child 9/10) | `docs/tasks/to-do/TASK-797-contractor-closure-transition-controls.md` |
| `TASK-798` | `to-do` | Contractor Reliability + Ops Control Plane (EPIC-013 child 10/10) | `docs/tasks/to-do/TASK-798-contractor-reliability-ops-control-plane.md` |
| `TASK-799` | `complete` | Payment Order Processor Source + Settlement Policy | `docs/tasks/complete/TASK-799-payment-order-processor-source-settlement-policy.md` |
| `TASK-800` | `to-do` | Production GCP WIF-Only Auth Posture Hardening | `docs/tasks/to-do/TASK-800-production-gcp-wif-only-auth-posture-hardening.md` |
| `TASK-801` | `complete` | Engagement Primitive: services + cost_attribution Extension (EPIC-014 child 1/10) — implementado 2026-05-06: migration 20260506200742463 aplicada con engagement_kind + commitment_terms_json en services, service_id TEXT FK opt en client_team_assignments con índice partial, attribution_intent en CCA v1 (TABLE) y v2 (CREATE OR REPLACE VIEW con literal 'operational'); 2 desvíos vs spec corregidos pre-implementación (UUID→TEXT, ALTER TABLE→VIEW); arch spec V1.2 actualizada con Delta v1.3; backward compat 100% verificada (30/30 services regular, 9/9 attribution operational); types regenerados, build/lint/test/tsc clean. | `docs/tasks/complete/TASK-801-engagement-primitive-services-extension.md` |
| `TASK-802` | `complete` | Engagement Commercial Terms Time-Versioned (EPIC-014 child 2/10) — implementado 2026-05-07: tabla `greenhouse_commercial.engagement_commercial_terms` con `service_id TEXT`, actor nullable + helper-required, checks de enum/range/reason/no_cost/success_fee, unique partial activo por service, helper canónico `getActiveCommercialTerms`/`declareCommercialTerms` con guard TASK-813 para excluir archived/inactive/unmapped. | `docs/tasks/complete/TASK-802-engagement-commercial-terms-time-versioned.md` |
| `TASK-803` | `complete` | Engagement Phases + Outcomes + Lineage (EPIC-014 child 3/10) | `docs/tasks/complete/TASK-803-engagement-phases-outcomes-lineage.md` |
| `TASK-804` | `complete` | Engagement Approvals Workflow + Capacity Warning Soft (EPIC-014 child 4/10) — implementado 2026-05-07: tabla `greenhouse_commercial.engagement_approvals`, state machine `pending/approved/rejected/withdrawn`, capacity warning soft persistido, helpers `requestApproval`/`approveEngagement`/`rejectEngagement`/`withdrawApproval` y capacity checker por periodo; `commercial.engagement.approve` reutilizado admin-gated. | `docs/tasks/complete/TASK-804-engagement-approvals-capacity-warning.md` |
| `TASK-805` | `complete` | Engagement Progress Snapshots Weekly Cadence (EPIC-014 child 5/10) | `docs/tasks/complete/TASK-805-engagement-progress-snapshots.md` |
| `TASK-806` | `complete` | VIEW gtm_investment_pnl + Reclassifier Helper (EPIC-014 child 6/10) | `docs/tasks/complete/TASK-806-gtm-investment-pnl-view-reclassifier.md` |
| `TASK-807` | `complete` | Commercial Health Reliability Subsystem NEW (EPIC-014 child 7/10) — implementado 2026-05-07: subsystem `Commercial Health` en Ops Health + Reliability Overview, seis readers `commercial.engagement.*`, primitive reusable `src/lib/commercial/sample-sprints/health.ts`, rollup max severity, threshold de conversion configurable y runtime alineado a `commercial_cost_attribution_v2` + outcomes/lineage reales. | `docs/tasks/complete/TASK-807-commercial-health-reliability-subsystem.md` |
| `TASK-808` | `complete` | Engagement Audit Log + Outbox Events v1 + Reactive Consumers (EPIC-014 child 8/10) — implementado 2026-05-07: audit append-only, 9 eventos `service.engagement.*`, helpers transaccionales audit/outbox y projections converted/cancelled sobre dominios existentes. | `docs/tasks/complete/TASK-808-engagement-audit-log-outbox-events-reactive-consumers.md` |
| `TASK-809` | `complete` | Sample Sprints UI + Wizards (EPIC-014 child 9/10) | `docs/tasks/complete/TASK-809-sample-sprints-ui-wizards.md` |
| `TASK-810` | `complete` | Engagement Anti-Zombie DB Guard (EPIC-014 child 10/10) — implementado 2026-05-07 como trigger PostgreSQL `BEFORE INSERT OR UPDATE` porque CHECK con EXISTS no es valido; preflight live 120d con 0 violations y SQL smoke rollback OK. | `docs/tasks/complete/TASK-810-engagement-anti-zombie-check-constraint.md` |
| `TASK-811` | `complete` | Copy Migration: greenhouse-nomenclature.ts Domain Microcopy Trim (originalmente Slice 7 de TASK-407 según Delta 2026-05-02; ID corregido 2026-05-06 — TASK-409 está burned por payroll-reliquidation-program). Cerrada sobre `develop`: nomenclature queda acotado a nav/product naming + tokens visuales transicionales; domain microcopy vive en `src/lib/copy/*`. | `docs/tasks/complete/TASK-811-greenhouse-nomenclature-domain-microcopy-trim.md` |
| `TASK-812` | `in-progress` | Compliance Exports Chile — Previred + LRE como proyecciones payroll versionadas. Implementacion V1 en `develop`: fuentes oficiales congeladas, registry `greenhouse_payroll.compliance_export_artifacts`, capabilities `hr.payroll.export_previred`/`hr.payroll.export_lre`, rutas de descarga, UI Payroll, eventos outbox y reliability drift. Boundary: TASK-707a sigue bloqueando paridad completa con `payment_order`; V1 valida contra `payroll_entries` cerradas + `calculatePreviredEntryBreakdown`. | `docs/tasks/in-progress/TASK-812-compliance-exports-chile-previred-planilla-lre-libro.md` |
| `TASK-813` | `complete` | HubSpot p_services (0-162) Inbound Sync + Legacy Cleanup — implementado 2026-05-06: archive script idempotente archivó 30 filas legacy seed con `engagement_kind='discovery'` + `status='legacy_seed_archived'`; backfill from HubSpot via direct API helper `fetchServicesForCompany` (bypass del bridge Cloud Run que tiene bug `p_services` URLs); webhook inbound `hubspot-services` con signature v3 + reliability signals (sync_lag, organization_unresolved, legacy_residual_reads); 4 services materializados con `hubspot_sync_status='unmapped'` (operador clasifica); 2 spaces auto-creados (Aguas Andinas + Motogas). Slice 5 (Cloud Scheduler cron) y Slice 7 (UI manual queue) diferidos a follow-ups. Hallazgo HubSpot-side: asociaciones cruzadas Aguas Andinas↔ANAM en HubSpot 0-162 — operador comercial debe corregir en HubSpot (Greenhouse refleja fielmente regla "HubSpot SoT"). 3 outbox events v1 nuevos. CLAUDE.md sección p_services webhook + EVENT_CATALOG Delta. | `docs/tasks/complete/TASK-813-hubspot-services-bidirectional-sync-phantom-seed-cleanup.md` |
| `TASK-814` | `to-do` | Ops Registry Human Surface (Portal V2) — extracción explícita de la UI humana del programa Ops Registry (EPIC-003) hacia rollout V2 conforme al spec maestro. Bloqueada por TASK-560. Contiene: navegación read-only en `/admin/ops-registry`, panel de drift/health consumiendo los 6 reliability signals declarados en TASK-559, vista graph de relaciones (ECharts), y wizards guiados (`create_task`/`take_task`/`close_task`) que delegan a la API/MCP write-safe de TASK-560 sin duplicar lógica. Access guard dual-plane (`view` + capability granular `ops.<artifact>.<action>`). Decisión arquitectónica 2026-05-07. | `docs/tasks/to-do/TASK-814-ops-registry-human-surface-portal.md` |
| `TASK-815` | `complete` | Direct Service Expense Allocation Primitive — primitive aprobada `greenhouse_finance.expense_service_allocations` para anclar gastos direct-client a `service_id` sin heurística; `commercial_cost_attribution_v2` agrega lane `expense_direct_service` y mantiene residual `expense_direct_client`; service attribution consume allocations aprobadas como facts high-confidence. | `docs/tasks/complete/TASK-815-direct-service-expense-allocation-primitive.md` |
| `TASK-694` | `to-do` | Notification Hub V1.5 — Engagement Metrics + Template Schema + Timezone + Ack Idempotent + Failure Matrix (follow-up post Delta v0.2 de TASK-690) | `docs/tasks/to-do/TASK-694-notification-hub-v1-5-engagement-templates-failure-resilience.md` |
| `TASK-816` | `to-do` | Client Lifecycle DDL + State Machine + Templates Seed (Client Lifecycle V1.0 Slice 1/6) — 4 tablas en `greenhouse_core` (`client_lifecycle_cases`, `client_lifecycle_case_events` append-only, `client_lifecycle_checklist_templates`, `client_lifecycle_checklist_items`), state machine via CHECK + triggers anti-mutation + 3 templates seed (10+10+5 items). Spec: `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md`. | `docs/tasks/to-do/TASK-816-client-lifecycle-ddl-state-machine-templates-seed.md` |
| `TASK-817` | `to-do` | Client Lifecycle Canonical Commands + Outbox Events v1 (Client Lifecycle V1.0 Slice 2/6) — 5 comandos atómicos (`provisionClientLifecycle`, `deprovisionClientLifecycle`, `advanceLifecycleChecklistItem`, `resolveLifecycleCase`, blockers), pre-flight blocker detector (invoices/phases/payment_orders), 8 outbox events `client.lifecycle.*` v1. Blocked by TASK-816. | `docs/tasks/to-do/TASK-817-client-lifecycle-canonical-commands-outbox.md` |
| `TASK-818` | `to-do` | Client Lifecycle API Surface + Capabilities (Client Lifecycle V1.0 Slice 3/6) — 9 endpoints HTTP `/api/admin/clients/*/lifecycle/*` con 6 capabilities granulares (read, open, advance, resolve, override_blocker EFEONCE_ADMIN, template.manage EFEONCE_ADMIN); validación owner_role per item; redaction completa. Blocked by TASK-817. | `docs/tasks/to-do/TASK-818-client-lifecycle-api-capabilities.md` |
| `TASK-819` | `to-do` | Client Lifecycle UI — Drawer + Listing + Banner + Tiles (Client Lifecycle V1.0 Slice 4/6) — mockup builder iterado, drawer `/admin/clients/[orgId]/lifecycle`, listing global `/admin/clients/lifecycle` con cursor pagination, banner contextual, 4 KPI tiles en `/admin/operations`; tokens-only + microcopy es-CL. Blocked by TASK-818. | `docs/tasks/to-do/TASK-819-client-lifecycle-ui-drawer-listing.md` |
| `TASK-820` | `to-do` | Client Lifecycle Reliability Signals + Cascade Reactive Consumers (Client Lifecycle V1.0 Slice 5/6) — 6 signals bajo `Commercial Health` (onboarding_stalled, offboarding_blocked_overdue, checklist_orphan_items, cascade_dead_letter, blocker_override_anomaly_rate, case_without_template) + 3 reactive consumers (cascade onboarding/offboarding/reactivation idempotentes via `outbox_reactive_log`). Blocked by TASK-817. | `docs/tasks/to-do/TASK-820-client-lifecycle-reliability-cascade-consumers.md` |
| `TASK-821` | `to-do` | Client Lifecycle HubSpot Semi-Automatic Trigger (Client Lifecycle V1.0 Slice 6/6) — webhook handler `hubspot-deals` con signature v3 + dedupe; deal `closedwon` → propone onboarding `status='draft'`; deal `closedlost` → propone offboarding draft; notificación a equipo comercial; banner UI; reliability signal `draft_pending_overdue`; feature flag staged rollout. Blocked by TASK-820. | `docs/tasks/to-do/TASK-821-client-lifecycle-hubspot-trigger-semi-automatic.md` |
| `TASK-822` | `to-do` | Client Portal Domain Consolidation: src/lib/client-portal/ + Reader Migration (EPIC-015 child 1/8) — crea carpeta canónica del dominio + migra readers desde agency/account-360/ico-engine via re-export sin cambiar comportamiento; Sentry domain `client_portal` registrado. | `docs/tasks/to-do/TASK-822-client-portal-domain-consolidation.md` |
| `TASK-823` | `to-do` | Client Portal API Namespace (EPIC-015 child 2/8) — `/api/client-portal/{health,account-summary}` con `requireClientSession` helper canónico, redaction completa, captureWithDomain. Blocked by TASK-822. | `docs/tasks/to-do/TASK-823-client-portal-api-namespace.md` |
| `TASK-824` | `to-do` | Client Portal DDL Schema + 3 Tablas + 10 Modules Seed (EPIC-015 child 3/8) — schema `greenhouse_client_portal` con `modules`, `module_assignments`, `module_assignment_events` (append-only), 10 módulos canónicos seed (5 Globe + 2 cross + 1 staff_aug + 1 CRM + 1 Wave), extension `engagement_commercial_terms.bundled_modules[]`. | `docs/tasks/to-do/TASK-824-client-portal-ddl-modules-assignments-seed.md` |
| `TASK-825` | `to-do` | Client Portal Resolver Canonical + Cache (EPIC-015 child 4/8) — `resolveClientPortalModulesForOrganization` server-only, cache TTL 60s, 3 helpers derivados (hasModuleAccess, hasViewCodeAccess, hasCapabilityViaModule), endpoint GET /api/client-portal/modules, filtra orphan + pilot expirado. Blocked by TASK-822, TASK-824. | `docs/tasks/to-do/TASK-825-client-portal-resolver-canonical.md` |
| `TASK-826` | `to-do` | Client Portal Admin Endpoints + 7 Capabilities + Audit + UI Admin (EPIC-015 child 5/8) — 5 comandos atómicos (enable/pause/resume/expire/churn), 6 outbox events v1, capabilities granulares (override_business_line_default EFEONCE_ADMIN-only), 7 endpoints HTTP, UI admin per-org modules + catalog. Blocked by TASK-825. | `docs/tasks/to-do/TASK-826-client-portal-admin-endpoints-capabilities.md` |
| `TASK-827` | `to-do` | Client Portal Composition Layer: Menú Dinámico + Page Guards + Empty States (EPIC-015 child 6/8) — `<ClientPortalNavigation>` server component compose desde resolver, `requireViewCodeAccess` page guards, 5 empty states explícitos (loading/empty/not_assigned/degraded/error), refactor branching legacy, lint rule warn. Mockup builder paso previo. Blocked by TASK-825. | `docs/tasks/to-do/TASK-827-client-portal-composition-layer-ui.md` |
| `TASK-828` | `to-do` | Client Portal Cascade from Client Lifecycle V1 (EPIC-015 child 7/8) — reactive consumer `client_portal_modules_from_lifecycle` que escucha `client.lifecycle.case.completed`, materializa/churn-ea assignments según `engagement_commercial_terms.bundled_modules[]`, idempotent via outbox_reactive_log, dead_letter recovery. Blocked by TASK-820, TASK-825, TASK-826. | `docs/tasks/to-do/TASK-828-client-portal-cascade-from-lifecycle.md` |
| `TASK-829` | `to-do` | Client Portal Reliability Signals + Legacy Backfill Idempotente (EPIC-015 child 8/8) — 6 signals bajo subsystem `Client Portal Health` + backfill `migrateClientPortalAssignmentsFromLegacy` con dry-run obligatorio + Fase A/B/C migration execution staging→producción + outbox event `migration.legacy_backfill.completed` v1. Cierra V1.0. Blocked by TASK-828. | `docs/tasks/to-do/TASK-829-client-portal-reliability-backfill.md` |
| `TASK-830` | `to-do` | Bow-tie HubSpot Portal Configuration Runbook + Drift Detection (Bow-tie V1.0 Slice 1/5) — runbook canónico `docs/operations/HUBSPOT_BOWTIE_CONFIGURATION_V1.md` + verification script `pnpm hubspot:verify-bowtie-config` + reliability signal `commercial.hubspot.config_drift`. Configura 7 stages custom empresas + 2 stages contactos + 5 motion + 13 contractual + 6 deal properties + pipeline Renewal + 7 deal_sub_types per Bow-tie §3-§8. Bloquea TASK-831/832/833. | `docs/tasks/to-do/TASK-830-bowtie-hubspot-portal-configuration-runbook.md` |
| `TASK-831` | `to-do` | Bow-tie Greenhouse → HubSpot Contractual Properties Projection (Bow-tie V1.0 Slice 2/5) — reactive consumer `hubspot_contractual_properties` que escucha 4 trigger events (client.classified.v1, client.contractual_state.changed.v1, services.materialized.v1, engagement_commercial_terms.applied.v1) y proyecta las 13 properties (`active_msa_id`, `total_mrr`, `customer_since`, etc.) a HubSpot Company. Idempotente via outbox_reactive_log + dead_letter. 3 reliability signals (sync_lag, drift, dead_letter) + backfill script. Blocked by TASK-830, TASK-816 Delta, TASK-817 Delta. | `docs/tasks/to-do/TASK-831-bowtie-greenhouse-hubspot-contractual-properties-projection.md` |
| `TASK-832` | `to-do` | Bow-tie Motion Property `is_at_risk` Evaluation + Projection (Bow-tie V1.0 Slice 3/5) — helper canónico `evaluateAtRiskTriggersForClient` con 3 sub-evaluators (msa_expiring, mrr_decline > 15%, ico_red), comando atómico `applyAtRiskState`, cron Cloud Scheduler diario + reactive consumer on-demand, projection `Company.is_at_risk` a HubSpot, reliability signal `evaluation_lag`. Blocked by TASK-830, TASK-831. | `docs/tasks/to-do/TASK-832-bowtie-motion-property-at-risk-evaluation.md` |
| `TASK-833` | `to-do` | Bow-tie Metrics Engine NRR/GRR/Expansion Rate/Logo Retention/Time-to-Expansion/Renewal Rate (Bow-tie V1.0 Slice 4/5) — VIEW canónica `greenhouse_serving.bowtie_metrics_monthly` + helper `getBowtieMetrics` + 6 reliability signals bajo subsystem nuevo `Bow-tie Health` (NRR target ≥ 100%/critical < 90%, GRR ≥ 90%, Expansion Rate ≥ 15% trim, Logo Retention ≥ 95%, compute_lag) + lint rule `no-untokenized-bowtie-metric-math` + endpoint admin. Blocked by TASK-831. | `docs/tasks/to-do/TASK-833-bowtie-metrics-engine-nrr-grr-expansion-rate.md` |
| `TASK-834` | `to-do` | Bow-tie Dashboards Greenhouse-side: Revenue Health + Expansion Engine + At Risk Accounts (Bow-tie V1.0 Slice 5/5) — 3 páginas dashboard `/admin/commercial/{revenue-health, expansion-engine, at-risk}` con ECharts (gauges NRR/GRR, MRR breakdown stacked bar, Top 10 cuentas, expansion pipeline, MSAs expiring kanban, at-risk accounts list). Mockup builder paso previo, microcopy es-CL, 100% tokens canónicos, visual regression + E2E. Cierra V1.0 del programa Bow-tie. Blocked by TASK-833, TASK-832, TASK-820 Delta. | `docs/tasks/to-do/TASK-834-bowtie-dashboards-revenue-health-expansion-engine-at-risk.md` |
| `TASK-835` | `to-do` | Sample Sprints Runtime Projection Hardening — follow-up EPIC-014 para reemplazar heurísticas client-side de `/agency/sample-sprints` por proyección server-side canónica: progress desde snapshots, costo real desde `commercial_cost_attribution_v2`, equipo/capacidad desde proposedTeam + capacity checker y señales alineadas a Commercial Health con degraded states honestos. | `docs/tasks/to-do/TASK-835-sample-sprints-runtime-projection-hardening.md` |
| `TASK-836` | `to-do` | HubSpot Services Lifecycle Stage Sync + Sample Sprint Validation Stage — corrige el contrato `p_services` (`0-162`) → `greenhouse_core.services`, agrega etapa previa `Validación / Sample Sprint` para services no-regulares (`engagement_kind != 'regular'`) y preserva el Service Pipeline real en `pipeline_stage/status/active` (`validation`, `onboarding`, `active`, `renewal_pending`, `renewed`, `closed`, `paused`). Incluye mapper canónico, posible migration de `pipeline_stage`, tests, backfill idempotente, degraded path para stage desconocida y docs Deal Pipeline vs Service Pipeline vs Sample Sprint. | `docs/tasks/to-do/TASK-836-hubspot-services-lifecycle-stage-sync-hardening.md` |
| `TASK-837` | `to-do` | Deal-Bound Sample Sprint HubSpot Service Projection — implementa el flujo outbound separado de TASK-836: wizard exige HubSpot Deal abierto, API revalida stage/company/contactos, crea Sample Sprint como service no-regular, proyecta `p_services` en `Validación / Sample Sprint` y asocia el servicio HubSpot al Deal, company y contactos heredados con idempotencia/retry. Blocked by TASK-836. | `docs/tasks/to-do/TASK-837-deal-bound-sample-sprint-service-projection.md` |
| `TASK-838` | `complete` | ISSUE-068 Resolution Fases 1-4 — forward-fix migration crea las 3 governance tables de TASK-404 + CI gate `migration-marker-gate.mjs` mode strict (anti regression del bug class) + reliability signal `infrastructure.critical_tables.missing` (runtime guard) + FK enforcement NOT VALID + VALIDATE atomic capability columns → `capabilities_registry.capability_key`. 3592/3592 tests verdes. Cerrada 2026-05-08. | `docs/tasks/complete/TASK-838-issue-068-resolution-fases-1-4.md` |
| `TASK-839` | `complete` | ISSUE-068 Fase 5 — Wire Admin Center governance mutation paths a writes reales con outbox + audit log + UI degraded mode honesto. Cerrada 2026-05-11 directo en `develop`: capabilities `access.governance.*`, endpoints `/api/admin/entitlements/**` con least privilege, segunda firma para grants sensibles, fan-out reactive y 2 reliability signals `identity.governance.*`. | `docs/tasks/complete/TASK-839-issue-068-fase-5-admin-center-governance-wire-up.md` |
| `TASK-840` | `complete` | ISSUE-068 Fase 6 — Deprecated capabilities cleanup oportunista. Cerrada 2026-05-11 directo en `develop`: helper canónico `markCapabilityDeprecated`, endpoint admin `/api/admin/entitlements/capabilities/[capabilityKey]/deprecate`, reporter CSV read-only, capability granular `access.governance.capability.deprecate`, audit/outbox `access.capability.deprecated` y drift TS→DB live reparado. | `docs/tasks/complete/TASK-840-issue-068-fase-6-deprecated-capabilities-cleanup.md` |
| `TASK-841` | `complete` | Nubox ops-worker Config + Freshness Hardening — contrato Cloud Run/Secret Manager para Nubox en `ops-worker`, replay de Scheduler sin errores de config faltante, freshness signal raw/conformed/Postgres/hot/balance, `balance_sync` trackeado y proyección Postgres resiliente por documento con semántica fiscal BHE/honorarios corregida. | `docs/tasks/complete/TASK-841-nubox-ops-worker-config-freshness-hardening.md` |
| `TASK-842` | `complete` | Finance FX Drift Auto-Remediation Control Plane — convierte `finance.account_balances.fx_drift` de detector reactivo + backfill manual a control plane autocorrectivo en `ops-worker`: reader detallado, planner con politica financiera segura, rematerialización canónica, scheduler bounded, run tracking/auditoría y regresión del drift `santander-clp` 2026-05-01. | `docs/tasks/complete/TASK-842-finance-fx-drift-auto-remediation-control-plane.md` |
| `TASK-612` | `complete` | Shared Organization Workspace Shell Convergence — entrega `OrganizationWorkspaceShell` (chrome only) + `FacetContentRouter` con registry lazy-loaded de 9 facets + 9 facet content components + migration que extiende `home_rollout_flags` CHECK + helper `isWorkspaceShellEnabledForSubject` + `/agency/organizations/[id]/page.tsx` reescrito server-side gated por flag con fallback legacy. 3617/3617 tests verdes. Cerrada 2026-05-08. | `docs/tasks/complete/TASK-612-shared-organization-workspace-shell-convergence.md` |
| `TASK-844` | `complete` | Cross-Runtime Observability: Sentry Init Canónico para Cloud Run Services — cierra ISSUE-074 root cause arquitectónico: el wrapper `captureWithDomain` importaba `@sentry/nextjs` (Next.js-específico) cuyo shape variaba en runtime Cloud Run, causando `Sentry.captureException is not a function` en projections. Solución: switch a `@sentry/node` runtime-portable + helper canónico `services/_shared/sentry-init.ts` invocado por cada Cloud Run service (`ops-worker`, `commercial-cost-worker`, `ico-batch`) en `server.ts` antes de `createServer`. 8 slices completos: foundation switch + helper + 3 service inits + reliability signal anti-regresión + lint rule modo `error` + CLAUDE.md hard rule + spec canonization. 27 tests Vitest verdes (7 wrapper + 8 helper + 9 reliability + 3 rule + 10 lint runner). Verificado live 2026-05-09 19:30:04 con cycle PATCH HubSpot `ef_engagement_kind=trial` → webhook → outbox publish → reactive consumer `materialized=1/1 failures=0` → `greenhouse_core.services` sync completo. ISSUE-074 cerrado. | `docs/tasks/complete/TASK-844-cross-runtime-observability-sentry-init.md` |
| `TASK-845` | `to-do` | Node 24 App/Test Runtime Upgrade — follow-up de TASK-607 para subir el runtime real de app/tests/builds/deploys a Node.js 24.x LTS. Agrega contrato `engines.node=24.x`, version file local, workflows `node-version: 24`, verificacion local/CI/Playwright/Vercel y documentacion del plano separado entre GitHub Actions runtime interno y runtime de aplicacion. | `docs/tasks/to-do/TASK-845-node-24-app-test-runtime-upgrade.md` |
| `TASK-846` | `complete` | PostgreSQL Connection Pooling V1: Data-Driven Deployment — cierra Sentry NEW issue 7 errors `remaining connection slots are reserved` (PG saturation 103% live → 66% post-Slice 1). Defense-in-depth 3 capas SIN multiplexer V1: Slice 1 ALTER ROLE `idle_session_timeout=5min` greenhouse_app + 15min greenhouse_ops (persistente via `pg_roles.rolconfig`, no requiere restart) — aplicado live 2026-05-09; Slice 3 runtime-aware pool sizing en `src/lib/postgres/client.ts` (Vercel `max=3 idleTimeout=10s`, Cloud Run `max=15 idleTimeout=30s`) detección via `process.env.VERCEL==='1'` + 5 tests Vitest; Slice 6 reliability signal `runtime.postgres.connection_saturation` (warning > 60%, error > 80%, signal data-driven que dispara V2 deployment) + 13 tests Vitest; Slice 7 CLAUDE.md sección "PostgreSQL connection management — runtime invariants" con 9 hard rules NUNCA/SIEMPRE; Slice 8 close + TASK-847 placeholder V2 contingente. **Pivot crítico durante implementación**: Cloud Run no soporta TCP raw → PgBouncer en Cloud Run arquitectónicamente inválido. V1 quedó sin multiplexer (deployment data-driven via signal). Patrón canónico Greenhouse `defense-in-depth + signal trigger + roadmap V2 documentado` aplicado a infrastructure. ADR: `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`. | `docs/tasks/complete/TASK-846-postgres-connection-pooling-v1-data-driven.md` |
| `TASK-847` | `to-do` | PostgreSQL Connection Pooling V2 — PgBouncer GKE Autopilot Deployment **CONTINGENTE**. NO se ejecuta proactivamente: data-driven trigger via reliability signal `runtime.postgres.connection_saturation` sustained > 60% por > 24h, o > 80% por > 1h, o > 5 events/sem `remaining connection slots are reserved` post-V1. PgBouncer NO va en Cloud Run (no soporta TCP raw); GKE Autopilot LoadBalancer TCP es el target canónico (~$75-85/mes). 8 slices: pre-deploy audit transaction pooling caveats + cluster + Deployment/Service + connectivity Vercel→GKE + cutover progresivo + reliability signals + lint rule + close. Predecessor: TASK-846 V1 deployed. ADR: `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md` sección V2. | `docs/tasks/to-do/TASK-847-postgres-pgbouncer-gke-v2-deployment.md` |
| `TASK-848` | `to-do` | Production Release Control Plane — formaliza un flujo deterministico para promover `develop` a produccion con preflight, deploy coordinado, deteccion de approvals `Production` obsoletos y pending runs sin jobs bloqueados por `concurrency`, worker deploy por SHA/revision, gating de infra Azure solo por diff/input explicito, manifest de release y rollback first-class. Nace del release 2026-05-09/10 donde Cloud Run worker workflows quedaron bloqueados por runs antiguos en `waiting` y Azure WIF/Production secrets se corrigieron en vivo. | `docs/tasks/to-do/TASK-848-production-release-control-plane.md` |
| `TASK-849` | `to-do` | Production Release Watchdog Alerts — mitigacion inmediata para no descubrir 14-22 dias tarde approvals productivos obsoletos: scheduled watchdog cada 30min, detector GitHub Actions para `Production` waiting approvals + pending runs sin jobs por concurrency, alertas Slack/Teams, signals `platform.release.{stale_approval,pending_without_jobs,worker_revision_drift}`, preflight reusable por TASK-848 y runbook operativo. | `docs/tasks/to-do/TASK-849-production-release-watchdog-alerts.md` |
| `TASK-856` | `to-do` | Previred Preflight, Fixture Harness & Mapping Hardening — follow-up de TASK-812 para convertir el upload aceptado real en guardrails permanentes: readiness antes de descargar, fixtures sanitizados desde CSV Previred, mapping declarativo de 105 campos, estado clean/warnings/blocking y signal/pre-close integration. | `docs/tasks/to-do/TASK-856-previred-preflight-fixtures-mapping-hardening.md` |
| `TASK-857` | `complete` | GitHub Webhooks Release Event Ingestion — follow-up de Release Control Plane V1.1: endpoint GitHub firmado para `workflow_run`/`workflow_job`/`deployment_status`, dedupe por `X-GitHub-Delivery`, payload redacted y reconciliacion contra `release_manifests` sin reemplazar el watchdog. | `docs/tasks/complete/TASK-857-github-webhooks-release-event-ingestion.md` |
| `TASK-858` | `to-do` | Release Orchestrator Webhook-Driven State Transitions — TASK-857 follow-up: reemplaza `wait-vercel` polling job en `production-release.yml` por suscripcion event-driven sobre `release_manifests.post_release_health` mutado por reconciler TASK-857. Reduce release time > 30% + GH API rate consumption > 50%. Polling fallback degradado timeout 300s. Watchdog TASK-849 NO se desactiva. Reliability signal `platform.release.webhook_polling_divergence`. | `docs/tasks/to-do/TASK-858-release-orchestrator-webhook-driven-state-transitions.md` |
| `TASK-859` | `to-do` | GitHub Workflow Run Metrics + DORA Signals + Flaky Detector — TASK-857 follow-up: materializa TODOS los `workflow_run`/`workflow_job` events (no solo release deploys) en tablas canonicas `greenhouse_sync.workflow_run_metrics` + `workflow_job_metrics`. Helper canonico `getDoraMetrics` con 4 metricas DORA. Subsystem `Platform CI` nuevo con 3 reliability signals (`workflow_duration_p95`, `flaky_workflow_rate`, `change_failure_rate`). Dashboard `/admin/operations/ci-health`. | `docs/tasks/to-do/TASK-859-github-workflow-run-metrics-dora-flaky-detector.md` |
| `TASK-860` | `to-do` | GitHub Pull Request Lifecycle + Multi-Agent Coordination — receiver dedicado `/api/webhooks/github/pull-request-events` (separado de TASK-857) para `pull_request`/`pull_request_review`/`pull_request_review_comment`. Tabla `pr_lifecycle_events` append-only. Helper `classifyPrAuthor` (claude/codex/cursor/human/bot_other). Dashboard `/admin/operations/multi-agent-activity` con collision detector. Subsystem `Platform PR` con 3 signals. Auto-trigger ultrareview opcional FLAG OFF default. | `docs/tasks/to-do/TASK-860-github-pull-request-lifecycle-multi-agent-coordination.md` |
| `TASK-861` | `complete` | HubSpot Production Release Drift Hardening — hardening acotado del worker `hubspot-greenhouse-integration` dentro del Release Control Plane: HubSpot incluido en tests de workflow contract, remediation accionable para `worker_revision_drift`, docs/skills/runbook alineados y README del bridge actualizado. No cambia `push:main`, Vercel ni runtime del bridge HubSpot. | `docs/tasks/complete/TASK-861-hubspot-production-release-drift-hardening.md` |
| `TASK-862` | `complete` | Final Settlement V1 Closing: Renuncia Voluntaria Legalmente Ratificable — CERRADA 2026-05-11 directo en `develop` (auto mode + 6 commits A-F). Engine emite 9 componentes (antes 4), PDF legal completo (clausulas PRIMERO-QUINTO + Ley 21.389 + Ley Bustos + reserva + 3 firmas + huella + watermark + logo empleador + monto en letras), pre-requisitos enforced (carta renuncia + pension alimentos + domicilio TASK-784), sign-or-ratify dialog real reemplaza placeholder, typography migrada Geist+Poppins (cerro drift TASK-568 en este consumer). Delta 2026-05-11 post-cierre: gate `final_settlement_resignation_production_enabled` removido por decision del usuario; revision legal externa queda como recomendacion no bloqueante. 57/57 tests verde. | `docs/tasks/complete/TASK-862-final-settlement-resignation-v1-closing.md` |
| `TASK-863` | `complete` | Finiquito Prerequisites UI: Carta Renuncia Uploader + Ley 21.389 Form en HrOffboardingView — CERRADA 2026-05-11 directo en develop. Cierra el contrato UI runtime para flujo finiquito de renuncia. Asset catalog extendido (resignation_letter_ratified_draft + attached, retention class final_settlement_document, HR + EFEONCE_ADMIN), microcopy GH_FINIQUITO.resignation.prerequisites tuteo es-CL, 2 chips estado en fila del caso, 2 dialogs modales (upload con GreenhouseFileUploader + form Alt A/B con validation cliente), gating client-side del boton Calcular con Tooltip explicativo. 8/8 tests verde. NO toca backend (endpoints TASK-862 Slice C ya canonizados). | `docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md` |
| `TASK-864` | `to-do` | Production Readiness Control Plane Contract — separa Control Plane Doctor de Product Release Preflight para que produccion solo avance cuando GitHub/Vercel/GCP/Azure/Sentry/Postgres sean observables y el SHA objetivo pase `readyToDeploy=true`. Agrega `release:doctor`, wiring en `production-release.yml`, scheduled doctor/watchdog integration y docs/skills. | `docs/tasks/to-do/TASK-864-production-readiness-control-plane-contract.md` |
| `TASK-865` | `to-do` | Production Worker Environment Isolation — corrige drift donde workflows `push:develop` de workers mutan los mismos servicios Cloud Run productivos que el orquestador. Decisión V1 híbrida: `develop` queda rápido con build/test/contract checks y validate-only si no hay staging aislado; deploy staging solo on-demand a servicios `*-staging`; production workers solo cambian via `production-release.yml` o break-glass explícito. | `docs/tasks/to-do/TASK-865-production-worker-environment-isolation.md` |
| `TASK-866` | `to-do` | Release Deployment Plan V2: Impact-Aware Worker Deploys — evolución del orquestador para no desplegar todos los workers por costumbre. Agrega planner deterministic por diff/dependencias, jobs worker con `if`, manifest per-surface `expectedSha`, watchdog V2 y override conservador `force_all_workers`. | `docs/tasks/to-do/TASK-866-release-deployment-plan-v2-impact-aware-workers.md` |
| `TASK-867` | `complete` | Offboarding Work Queue Projection + UX Modernization — CERRADA 2026-05-11 directo en develop. Crea proyeccion read-only `OffboardingWorkQueue` + endpoint `/api/hr/offboarding/work-queue`, elimina N+1 fetch en `HrOffboardingView` y moderniza `/hr/offboarding` como cola operacional con summary, tabs/filtros, progreso, accion principal, drawer de detalle y drawer de creacion sin reemplazar write paths TASK-862/TASK-863. | `docs/tasks/complete/TASK-867-offboarding-work-queue-projection-ux-modernization.md` |
| `TASK-868` | `to-do` | Payroll Receipt Documents Aggregate + Registry Link — spawneada del review arch TASK-489 V2.2 cuando usuario preguntó "¿y los recibos de nómina?". 4-pillar analysis confirmó Y1 (aggregate dedicado mirror TASK-863 V1.5.2) gana Safety/Robustness/Resilience/Scalability vs Y2 (linked directo a `payroll_period_entries`) y Y3 (virtual UNION). Materializa `greenhouse_payroll.payroll_receipt_documents` con state machine 6 estados (rendered/emitted/distributed/regenerated/superseded/voided) + helper canónico atomic + auto-regen pattern + audit append-only + 6 outbox events v1 + 3 reliability signals + bridge `document_payroll_receipt_link` + reactive consumer registry sync. Linkea al document registry (TASK-489 V2.1) como `kind='linked'` type `payroll_receipt`. Reusa receipt presenter TASK-758. Blocked by TASK-489 + TASK-758. 4 slices (~13-17h). | `docs/tasks/to-do/TASK-868-payroll-receipt-documents-aggregate.md` |
| `TASK-869` | `complete` | AI Product Design Studio Skills 2026 — suite de 5 skills globales + 3 overlays Greenhouse para diseño de producto 2026 tipo Lovable/Stitch, con Product UI ADR, generation director, microinteraction system, frontend reviewer, visual critic, screenshot loop y gate enterprise. | `docs/tasks/complete/TASK-869-ai-product-design-studio-skills-2026.md` |
| `TASK-870` | `in-progress` | Secret Manager normalizer hardening V2 — cierra bug class detectada live 2026-05-12 donde `normalizeSecretRefValue` no strippa quotes envolventes → `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF` con `"name\n"` literal en Vercel production producía Sentry burst recurrente "is not valid PEM" bloqueando Production Release Orchestrator preflight por ~3h. Fix: `stripEnvVarContamination` single-source helper + `SECRET_REF_SHAPE` regex en boundary + reliability signal `secrets.env_ref_format_drift` + `github-app-token-resolver` diferencia ref/content corruption + CLAUDE.md/AGENTS.md hard rules V2. 52/52 tests verde. | `docs/tasks/in-progress/TASK-870-secret-manager-normalizer-hardening-v2.md` |
| `TASK-871` | `to-do` | Account Balance Rolling Anchor Contract — corrige de raiz el bug class donde la rematerializacion rolling usa el primer dia objetivo como seed silencioso y omite sus movimientos; separa `rolling_window_repair` vs `historical_restatement`, preserva evidence guard y recupera el drift Playwright/Sentry del 2026-05-13 sin updates manuales. | `docs/tasks/to-do/TASK-871-account-balance-rolling-anchor-contract.md` |
| `TASK-872` | `complete` | SCIM Internal Collaborator Provisioning — endurece el contrato SCIM interno Efeonce para materializar automaticamente `client_user` + `identity_profile` + `member` + membership operating entity en altas humanas contratadas desde Entra, con ficha laboral pendiente y payroll/capacity gated; incluye remediacion idempotente de Felipe Zurita y Maria Camila Hoyos. CERRADA 2026-05-13 con 11 commits + backfill apply Felipe+Maria SUCCESS en staging. | `docs/tasks/complete/TASK-872-scim-internal-collaborator-provisioning.md` |
| `TASK-873` | `to-do` | Workforce Intake UI V1.1 (follow-up TASK-872) — cierra el loop operativo de TASK-872 con surface admin para que HR complete fichas laborales (`workforce_intake_status: pending_intake|in_review → completed`). Entrega: badge "Ficha pendiente" en `PeopleListTable`, botón "Completar ficha" en `PersonView`, admin queue dedicada en `/admin/workforce/intake-queue` con tabla + drawer + cursor pagination + signal banner. Endpoint backend ya shipped por TASK-872 Slice 5. | `docs/tasks/to-do/TASK-873-workforce-intake-ui.md` |
| `TASK-874` | `complete` | Workforce Activation Readiness Resolver + Workspace — resolver canónico por carriles, workspace HR `/hr/workforce/activation`, guard `complete-intake`, override auditado, signals y manual HR sin duplicar ownership de People/HR/Payroll/Finance/Legal Profile. | `docs/tasks/complete/TASK-874-workforce-activation-readiness-workspace.md` |
| `TASK-875` | `complete` | WorkRelationship Onboarding Case Foundation — agregado canónico para representar el inicio de una relación laboral/contractual, con schema HR, state machine, eventos auditables y wiring idempotente desde Workforce Activation sin crear UI nueva. | `docs/tasks/complete/TASK-875-work-relationship-onboarding-case-foundation.md` |
| `TASK-876` | `complete` | Workforce Activation Remediation Flow — agrega write path canónico para resolver blockers de intake laboral antes de completar ficha, separando remediación de la acción final y reconectando Personas/Activation sin mutar casos reales desde automatización. | `docs/tasks/complete/TASK-876-workforce-activation-remediation-flow.md` |
| `TASK-877` | `complete` | Workforce Activation External Identity Reconciliation — integra Workforce Activation con Identity Reconciliation para resolver vínculos externos requeridos, empezando por Notion, mediante candidatos/evidencia/audit y sin escribir IDs manuales. | `docs/tasks/complete/TASK-877-workforce-external-identity-reconciliation.md` |
| `TASK-878` | `to-do` | Session Member Identity Self-Heal — refresca JWTs internos stale que quedaron sin `memberId` cuando `session_360` ya tiene el vínculo correcto, sin mutar DB ni recalcular permisos. | `docs/tasks/to-do/TASK-878-session-member-identity-self-heal.md` |
| `TASK-879` | `to-do` | Notion Developer Platform Readiness & Worker Pilot — valida `ntn`, Workers, Worker syncs, agent tools y SDK/API modernization en sandbox antes de cambiar la estrategia de `notion-bq-sync`, write bridge o modernización Notion. | `docs/tasks/to-do/TASK-879-notion-developer-platform-readiness-worker-pilot.md` |
| `TASK-880` | `to-do` | Notion API Modernization & PAT Foundation — bumpea `Notion-Version` de `2022-06-28` a `2026-03-11` absorbiendo los 3 breaking changes (`archived`→`in_trash`, `after`→`position`, `transcription`→`meeting_notes`), centraliza toda llamada API en `NotionApiClient` canonical y reemplaza single-token global `NOTION_TOKEN` por resolver canonical `resolveNotionAuth` con cascade `operator_pat → workspace_pat → global_token`. Schema PG `greenhouse_core.notion_personal_access_tokens` (encrypted at rest pattern TASK-697) + 5 capabilities granulares + admin/operator surfaces + 2 reliability signals + lint rule. Foundation técnica que desbloquea TASK-881 (Meeting Notes), futura Markdown Reports, futura Views API. Coordina con TASK-879 (research/pilot) sin bloqueo mutuo. | `docs/tasks/to-do/TASK-880-notion-api-modernization-and-pat-foundation.md` |
| `TASK-881` | `to-do` | Notion Meeting Notes Ingestion → Delivery + ICO Surfaces — primer consumer real del endpoint `POST /v1/blocks/meeting_notes/query` (lanzado 11-may-2026). Materializa AI Meeting Notes en `greenhouse_delivery.notion_meeting_notes` (PG canonical) + mirror BQ conformed, con attendee resolver canonical + project link best-effort. Reactive projection consumer `notion_meeting_notes_intake`, Cloud Scheduler hourly job, surfaces project drawer + sprint timeline + admin queue unresolved attendees, 4 capabilities granulares + audit log append-only para `summary_full`, 3 reliability signals. Habilita contexto narrative para Pulse weekly digest + Nexa tooling + ICO `meeting_cadence_health` factor (consumers son tasks derivadas). Bloqueada por TASK-880 (necesita API version `2026-03-11+`). | `docs/tasks/to-do/TASK-881-notion-meeting-notes-ingestion-delivery-surfaces.md` |
| `TASK-882` | `to-do` | Nexa Tools as Notion Workers (EPIC-005 pillar) — implementa 3-5 tools read-only como Notion Workers que exponen capabilities Greenhouse (ICO, sprint health, last meeting, project status, my assignments) accesibles vía External Agents API directamente desde Notion. Habilita el patrón "Nexa-in-Notion": PM hace `@Nexa dame el ICO de este proyecto` desde Notion sin cambiar a Teams. Use case más alto-valor identificado en TASK-879 Slice 4 verdict (2026-05-15) donde Workers GANAN sobre Cloud Run (audit nativo + multi-agent OOB + latencia ~4s validada live). Schema PG `notion_worker_api_tokens` separado (no extiende TASK-880 PATs porque shape difiere), 3 capabilities granulares (`integrations.notion.worker.{invoke,register_token,revoke_token}`), 2 reliability signals (`tool_failure_rate` + `tool_latency_p95` + 1 V2 pricing `credits_burn_rate`), identity bridge canonical `notion_user_id → member_id` reusando TASK-877. Bloqueada por TASK-880 + External Agents API GA (alpha 2026-05-13) + decisión pricing post 11-ago-2026. Coordina con TASK-671 (Nexa Teams bot) — multi-channel coexistence. | `docs/tasks/to-do/TASK-882-nexa-tools-as-notion-workers.md` |
| `TASK-884` | `complete` | Ecosystem Access Control Plane Architecture — spec V1 entregada 2026-05-15 via `arch-architect` (Greenhouse overlay). Tres estados ortogonales `desired`/`observed`/`applied`, 4 platform modes per binding, 7 drift types con severity matriz, 11 capabilities internas, 14 outbox events v1, 9 reliability signals. Pasada de revision aplicada a TASK-885..889. DECISIONS_INDEX + delta §9.5 Sister Platforms Contract + §16 Kortex Integration anexo actualizados. | `docs/tasks/complete/TASK-884-ecosystem-access-control-plane-architecture.md` |
| `TASK-885` | `to-do` | Ecosystem Platform Registry + Capability Catalog — registry de plataformas (`kortex`, `verk`, `public_website`) y capabilities namespaced gobernables desde Greenhouse sin mezclarlas con entitlements internos del portal. | `docs/tasks/to-do/TASK-885-ecosystem-platform-registry-capability-catalog.md` |
| `TASK-886` | `to-do` | Ecosystem Desired Access Assignments Foundation — estado deseado de acceso cross-platform para asignar colaboradores/personas desde Greenhouse a plataformas, clientes/spaces y capabilities con audit/outbox. | `docs/tasks/to-do/TASK-886-ecosystem-desired-access-assignments-foundation.md` |
| `TASK-887` | `to-do` | Ecosystem Observed Access + Drift Reconciliation — ingestion de observed access local desde plataformas hermanas y drift engine desired vs observed para provisioning local no aprobado, pending provisioning y scope/capability mismatch. | `docs/tasks/to-do/TASK-887-ecosystem-observed-access-drift-reconciliation.md` |
| `TASK-888` | `to-do` | Ecosystem Provisioning Commands + Webhooks — commands/eventos idempotentes para que Greenhouse solicite provisionar/revocar/suspender accesos y las plataformas reporten applied/failed. | `docs/tasks/to-do/TASK-888-ecosystem-provisioning-commands-webhooks.md` |
| `TASK-889` | `to-do` | Ecosystem Access Admin Center + Kortex/Verk Pilot — surface operativa para asignar usuarios, ver drift, aprobar/rechazar provisioning local y pilotear Kortex/Verk desde Greenhouse. | `docs/tasks/to-do/TASK-889-ecosystem-access-admin-center-kortex-verk-pilot.md` |
| `TASK-890` | `complete` | Workforce Exit Payroll Eligibility Window — V1.0 SHIPPED 2026-05-15. 7 slices end-to-end: ADR + resolver canonico + integration behind flag + lint rule + capability granular + UI dialog + drift signal + docs. Cierra el seam Maria Camila Hoyos. | `docs/tasks/complete/TASK-890-workforce-exit-payroll-eligibility-window.md` |
| `TASK-891` | `complete` | Person 360 Relationship Drift Reconciliation Write Path — V1.0 SHIPPED 2026-05-15. 6 slices completos directo en develop: ADR canonica + helper canonico atomic (REUSE > CREATE, composes endRelationship + createContractor existentes) + capability + grant + migration + endpoint + UI form en /admin/identity/drift-reconciliation + auto-escalation severity 30d + docs/manuales/CLAUDE.md hard rules. Outbox events: NO crear .reconciled nuevo, reusar .deactivated + .created con metadata correlation. Reason >=20 chars. EFEONCE_ADMIN-only V1.0. Maria NO mutada. 17+9 tests verde focal. | `docs/tasks/complete/TASK-891-person-relationship-drift-reconciliation-write-path.md` |
| `TASK-892` | `complete` | Offboarding Closure Completeness Aggregate — **V1.0 SHIPPED 2026-05-15 directo en develop**. 47 tests verde (18 pure + 8 signal + view existentes). Modela `closureCompleteness` server-side sintetizando 4 capas ortogonales (case lifecycle + member runtime + Person 360 relationship + payroll scope). primaryAction se deriva de pendingSteps[0] actionable priorizado por STEP_PRIORITY canonical (NO mas hardcoded por lane). Reliability signal nuevo `hr.offboarding.completeness_partial` (subsystem Identity & Access, steady=0). UI HrOffboardingView con closureState badge + "Capas pendientes" section con CTAs a TASK-891 dialog. Bug class fuente: Maria case executed + drift Person 360 muestra boton "Cerrar con proveedor" obsoleto. Validado arch-architect Greenhouse overlay. Maria NO mutada — recovery espera dialog manual. P1 / Alto / Medio. Domain: hr\|identity\|payroll\|reliability. | `docs/tasks/complete/TASK-892-offboarding-closure-completeness-aggregate.md` |
| `TASK-893` | `to-do` | Payroll Participation Window — primitive canonica para ingreso/salida/vigencia de compensacion que calcula `eligibleFrom/eligibleTo/policy/reasonCodes/prorationFactor` y evita que colaboradores mid-month como Felipe Zurita se cuantifiquen full-month. Composes TASK-890, aplica a projected + official payroll, flag `PAYROLL_PARTICIPATION_WINDOW_ENABLED=false`, prorrateo V1 por weekdays, reliability signals y staging shadow compare. | `docs/tasks/to-do/TASK-893-payroll-participation-window.md` |
| `TASK-883` | `to-do` | Auth Smoke Synthetic Monitor Resilience: Internal Critical vs External Dependency Severity Matrix — rediseña `/smoke/identity-auth-providers` (TASK-742 Capa 6) para diferenciar fallos internos de Greenhouse (rotación mal hecha, secret content corruption, App Registration flip single-tenant) vs degradación transient de dependencias externas (Microsoft Entra OAuth, Google OIDC, portal `/api/auth/health`). Triggered by Sentry incident JAVASCRIPT-NEXTJS-5X (2026-05-15 04:25 UTC) `identity.auth.providers smoke failed: portal_auth_health, in_process_readiness` — autoresuelto pero confirmó fatiga de alertas que enmascararía bug real. Probe taxonomy declarativa (8 probes, `internal_critical | external_dependency` compile-time enforced), retry exponencial + jitter + escalating timeout en externas, counter persistente PG `greenhouse_sync.smoke_probe_consecutive_failures` (sibling pattern TASK-849 watchdog), severity matrix (ok/unknown/warning/error per consecutive count), 2 reliability signals canónicos (`identity.auth.smoke.internal_critical_failure` + `identity.auth.smoke.external_dependency_degraded`), Sentry routing diferenciado (internal=immediate, external=counter≥4). Decision matrix `invalid_client` → escala a internal. Flag `SMOKE_RESILIENCE_V2_ENABLED` con shadow rollout 7d. Pattern reusable cross-smoke-lane. P2 / Medio / Medio. Domain: identity. Spec: `to-do/TASK-883-auth-smoke-resilience-internal-vs-external.md`. | `docs/tasks/to-do/TASK-883-auth-smoke-resilience-internal-vs-external.md` |
