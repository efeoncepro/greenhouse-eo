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
| `TASK-009` | `in-progress`    | `CODEX_TASK_Greenhouse_Home_Nexa_v2`                               | `docs/tasks/in-progress/TASK-009-greenhouse-home-nexa.md`               |
| `TASK-010` | `to-do`          | `CODEX_TASK_Organization_Economics_Dashboard_v1`                   | `docs/tasks/to-do/TASK-010-organization-economics-dashboard.md`         |
| `TASK-011` | `to-do`          | `CODEX_TASK_ICO_Person_360_Integration_v1`                         | `docs/tasks/to-do/TASK-011-ico-person-360-integration.md`               |
| `TASK-012` | `to-do`          | `CODEX_TASK_Outbox_Event_Expansion_v1`                             | `docs/tasks/to-do/TASK-012-outbox-event-expansion.md`                   |
| `TASK-013` | `to-do`          | `CODEX_TASK_Nubox_Finance_Reconciliation_Bridge_v1`                | `docs/tasks/to-do/TASK-013-nubox-finance-reconciliation-bridge.md`      |
| `TASK-014` | `to-do`          | `CODEX_TASK_Projects_Account_360_Bridge_v1`                        | `docs/tasks/to-do/TASK-014-projects-account-360-bridge.md`              |
| `TASK-015` | `to-do`          | `CODEX_TASK_Financial_Intelligence_Layer_v2`                       | `docs/tasks/to-do/TASK-015-financial-intelligence-layer.md`             |
| `TASK-016` | `to-do`          | `CODEX_TASK_Business_Units_Canonical_v2`                           | `docs/tasks/to-do/TASK-016-business-units-canonical.md`                 |
| `TASK-017` | `to-do`          | `CODEX_TASK_Campaign_360_v2`                                       | `docs/tasks/to-do/TASK-017-campaign-360.md`                             |
| `TASK-018` | `to-do`          | `CODEX_TASK_SCIM_User_Provisioning_v2`                             | `docs/tasks/to-do/TASK-018-scim-user-provisioning.md`                   |
| `TASK-019` | `to-do`          | `CODEX_TASK_Staff_Augmentation_Module_v2`                          | `docs/tasks/to-do/TASK-019-staff-augmentation-module.md`                |
| `TASK-020` | `to-do`          | `CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2`                | `docs/tasks/to-do/TASK-020-frameio-bigquery-analytics-pipeline.md`      |
| `TASK-021` | `to-do`          | `CODEX_TASK_Typography_Variant_Adoption_v1`                        | `docs/tasks/to-do/TASK-021-typography-variant-adoption.md`              |
| `TASK-022` | `to-do`          | `CODEX_TASK_Services_Runtime_Closure_v1`                           | `docs/tasks/to-do/TASK-022-services-runtime-closure.md`                 |
| `TASK-023` | `to-do`          | `CODEX_TASK_Notification_System`                                   | `docs/tasks/to-do/TASK-023-notification-system.md`                      |
| `TASK-024` | `to-do`          | `CODEX_TASK_Greenhouse_Login_Redesign`                             | `docs/tasks/to-do/TASK-024-greenhouse-login-redesign.md`                |
| `TASK-025` | `deferred`       | `CODEX_TASK_HR_Payroll_Module_v2_DELTA_FTR`                        | `docs/tasks/to-do/TASK-025-hr-payroll-module-delta-ftr.md`              |
| `TASK-026` | `to-do`          | `CODEX_TASK_HRIS_Contract_Type_Consolidation`                      | `docs/tasks/to-do/TASK-026-hris-contract-type-consolidation.md`         |
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
| `TASK-037` | `to-do`          | `CODEX_TASK_SCIM_User_Provisioning` (brief historico)              | `docs/tasks/to-do/TASK-037-scim-user-provisioning-brief.md`             |
| `TASK-038` | `to-do`          | `CODEX_TASK_Staff_Augmentation_Module` (brief historico)           | `docs/tasks/to-do/TASK-038-staff-augmentation-module-brief.md`          |
| `TASK-039` | `to-do`          | `Greenhouse_Data_Node_Architecture_v1` (supporting spec)           | `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`                |
| `TASK-040` | `to-do`          | `Greenhouse_Data_Node_Architecture_v2` (supporting spec)           | `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`                |

| `TASK-041` | `to-do` | `CODEX_TASK_Staff_Augmentation_HRIS_Addendum` | `docs/tasks/to-do/TASK-041-staff-augmentation-hris-addendum.md` |
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

| `TASK-059` | `to-do` | Tool Provider Canonical Object | `docs/tasks/to-do/TASK-059-tool-provider-canonical-object.md` |
| `TASK-060` | `complete` | Team Assignment Admin (Agency > Team CRUD) | `docs/tasks/complete/TASK-060-team-assignment-admin.md` |
| `TASK-061` | `complete` | Payroll Go-Live Readiness Audit | `docs/tasks/complete/TASK-061-payroll-go-live-readiness-audit.md` |
| `TASK-062` | `complete` | Payroll Recurring Fixed Bonus Support | `docs/tasks/complete/TASK-062-payroll-recurring-fixed-bonus-support.md` |
| `TASK-063` | `complete` | Payroll Projected Payroll Runtime | `docs/tasks/complete/TASK-063-payroll-projected-payroll-runtime.md` |
| `TASK-064` | `complete` | ICO Assignee Attribution Remediation | `docs/tasks/complete/TASK-064-ico-assignee-attribution-remediation.md` |
| `TASK-065` | `complete` | Payroll Variable Bonus Policy Recalibration | `docs/tasks/complete/TASK-065-payroll-variable-bonus-policy-recalibration.md` |
| `TASK-067` | `to-do` | Cost Intelligence Foundation | `docs/tasks/to-do/TASK-067-cost-intelligence-foundation.md` |
| `TASK-068` | `to-do` | Period Closure Status Projection | `docs/tasks/to-do/TASK-068-period-closure-status-projection.md` |
| `TASK-069` | `to-do` | Operational P&L Projection | `docs/tasks/to-do/TASK-069-operational-pl-projection.md` |
| `TASK-070` | `to-do` | Cost Intelligence Finance UI | `docs/tasks/to-do/TASK-070-cost-intelligence-finance-ui.md` |
| `TASK-071` | `to-do` | Cost Intelligence Cross-Module Consumers | `docs/tasks/to-do/TASK-071-cost-intelligence-cross-module-consumers.md` |
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
| `TASK-086` | `to-do` | Payroll Current Period View Logic Fix | `docs/tasks/to-do/TASK-086-payroll-current-period-view-logic.md` |
- `TASK-087`

## Regla de asignacion desde aqui

Al crear una task nueva o bootstrapear una legacy adicional:

1. tomar el siguiente ID disponible
2. agregarlo a este registro
3. reflejarlo en la task markdown
4. usarlo en el issue `[TASK-###] ...`
5. usarlo en el GitHub Project como `Task ID`
