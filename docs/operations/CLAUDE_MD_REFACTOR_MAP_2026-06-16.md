# CLAUDE.md Refactor Map — 2026-06-16 (TASK-1160 Slice 1)

> **Tipo:** entregable de Slice 1 (inventario + mapa de clasificación).
> **Generado por:** `node scripts/ci/claude-md-inventory.mjs` + clasificación manual.
> **Estado al generar:** `CLAUDE.md` = 6.191 líneas / ~190.551 tokens (chars/4) / 195 secciones H3 / 1.024 `NUNCA` / 211 `SIEMPRE`.
> **Regla del task:** relocación, NO edición. Move-then-pointer. Cero regla load-bearing perdida.

## 1. Diagnóstico medido

- Las 195 secciones **H3 son el 99% del archivo** (~187.925 tokens). El scaffolding H2 es ~1%.
- **117 de los bloques ya declaran su `Spec canónica`/`Fuente canónica`** y la spec existe. Es decir: el bloque en `CLAUDE.md` es en su mayoría el **espejo operativo redundante** de contenido ya canonizado en `docs/architecture/**` o en la spec de la task. El "move" del grueso es: verificar que la regla load-bearing está en la spec y, donde no esté, **appendearla como Delta antes de borrar el bloque** (move-then-pointer).
- Hay un **bloque estructural roto**: la sección titulada `Vercel Deployment Protection` (≈5.990 tokens, la más grande) en realidad contiene ~20 contratos de UI Platform (Composition Shell, Adaptive Card "The Seam", Floating Surface, Motion, Elevation, Breadcrumbs, contención de scroll horizontal, Figma Implementation Contract…) que fueron appendeados bajo ese H3. NO es una sección coherente → en Slice 3 se **parte**: lo que es realmente "Vercel Deployment Protection" se queda (keep, resumido); los contratos de UI Platform van a `docs/architecture/ui-platform/{PRIMITIVES,PATTERNS,STATE,...}.md` (move-to-spec).

## 2. Las 4 clases

| Clase | Qué es | Destino |
|---|---|---|
| **KEEP** | Cross-cutting, aplica a (casi) toda task. Se queda en `CLAUDE.md`; algunas se resumen. | `CLAUDE.md` |
| **MOVE→spec** | Invariante de un subsistema con spec canónica en `docs/architecture/**`. | la spec + pointer 1-2 líneas |
| **MOVE→spec/task** | Invariante cuyo único pointer hoy es el `.md` de su task (complete/in-progress). El destino canónico real suele ser una spec de `docs/architecture/**` (a veces ya existe); si la task-spec es el único hogar, el pointer apunta ahí. | spec o task-spec + pointer |
| **MOVE→needs-dest** | Bloque sin pointer a doc — el destino se resuelve en el plan (spec existente, spec nueva, o se queda como KEEP si es genuinamente cross-cutting). | a resolver en Slice 1/plan |

**Conteo:** KEEP 57 · MOVE→spec 36 · MOVE→spec/task 74 · MOVE→needs-dest 28.

## 3. Decisión de estrategia de destino (requiere operador)

**Hallazgo crítico:** muchas de las skills "naturales" de dominio (`greenhouse-finance-accounting-operator`, `greenhouse-ico`, `greenhouse-postgres`, `greenhouse-backend`, `greenhouse-cron-sync-ops`, `greenhouse-ux`, etc.) **son GLOBALES** (`~/.claude/skills/`), viven **fuera del repo** y **no se comparten con Codex**. Mover invariantes de `CLAUDE.md` a una skill global = sacarlos del control de versiones de greenhouse-eo y romper la paridad con Codex.

→ **Recomendación:** el destino canónico por defecto es la **spec en `docs/architecture/**`** (repo-tracked, agente-neutral, ya es donde apuntan 117 bloques), NO la skill global. Las skills **repo-tracked** (`.claude/skills/` + `.codex/skills/`: `greenhouse-production-release`, `greenhouse-secret-hygiene`, `hubspot-greenhouse-bridge`, `notion-platform`, `teams-bot-platform`, `greenhouse-documentation-governor`, `greenhouse-qa-release-auditor`) reciben pointer también cuando aplica. **Decisión del operador:** confirmar "spec-first" como destino por defecto.

## 4. Keep-list propuesto (cross-cutting, se queda)

Acordado vs spec §Detailed Spec + protocolo de lifecycle/docs que routea cada agente:

- **Identidad/triage:** Project Overview, Business Context Pack, Operator Communication Style, Data Architecture (corto), Canonical 360 Object Model, Deploy Environments.
- **Loop operativo:** Local-First Workflow, Greenhouse Operating Loop, Task Authoring Contract, Quick Reference, Solution Quality Contract, Full API Parity Principle.
- **Gates de cierre (resumen):** Runtime Rollout Completion Gate, Documentation Closure Gate, QA Release Auditor Gate, Task Closing Quality Gate (resumir — hoy 2.4k tokens).
- **Lifecycle:** Issue Lifecycle Protocol + sub, Task Lifecycle Protocol + sub, Platform Documentation Protocol, User Manual Protocol, Heurística de acceso.
- **Convenciones transversales:** Conventions/Estructura de código, Microcopy regla, API Routes, Canonical API error contract (resumen), Auth en server components, Agent Auth, Playwright smoke contract, Staging requests, PostgreSQL Access, Database Connection, Database Migrations, Migration markers, SQL embebido type alignment, Charts policy, Tooling CLIs, git hooks, Avatar helper, Secret Manager Hygiene (resumen), Otras convenciones.
- **Gobernanza de despliegue:** Vercel Deployment Protection (la parte real, resumida), Vercel CLI Scope Discipline, Cross-repo action safety.
- **Router** (nuevo, al inicio) + Architecture Docs index (resumen).

**Tamaño KEEP medido:** ~24.7k tokens **incluyendo** el bloque roto de 5.990 (UI Platform). Restando lo que se va a spec (~5k), el KEEP real ≈ **~19-20k tokens** + router (~2k) + résumés → **target ~22-25k tokens**.

## 5. Budget target propuesto

- **Arranque del gate (warn):** 200.000 tokens (tamaño actual, no rompe CI).
- **Escalones sugeridos:** 120k (post tanda 1) → 70k (post tanda mitad) → **40k (flip a error, Slice 5)**.
- **Target final recomendado:** **25.000 tokens** (decisión del operador: 25k agresivo vs 40k holgado). Con KEEP real ~20k + router + résumés, 25k es alcanzable sin perder nada cross-cutting.

## 6. Casos `needs-dest` a resolver (28 bloques)

La mayoría tienen spec existente sin pointer explícito en el bloque, o son genuinamente cross-cutting:
- **Cross-cutting candidatos a KEEP:** BigQuery DML Struct Timestamp Hard Rules (regla DB transversal), International Internal Contract Type (invariante de tipo canónico), Canonical task status vocabulary V1 (helper transversal), SQL Signal Reader Schema Validation Gate (regla SQL transversal — ya casi un "keep"), Reliability dashboard hygiene.
- **Tienen spec destino (asignar en plan):** Finance Internal Account Number/Payment Provider/Bank-Reconciliation/Evidence/Bank-KPI/Labor allocation → `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`; Notion Integrations Registry/teamspace linking/sync canónico/delivery PG projection → `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` + skill `notion-platform`; HubSpot bridge/p_services → `GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` + skill `hubspot-greenhouse-bridge`; AI providers → `AI providers` spec; ICO Status Transition Foundation → docs ICO; Identity Bridge Cutover → `GREENHOUSE_IDENTITY_ACCESS_V2.md`; Workforce Contracting Studio → `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md`; Nexa Intelligence doc → `nexa-intelligence/` + manifest; Admin Center/Deprecated Capabilities → `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

## 7. Patrones canónicos a deduplicar (Slice 4)

Repetidos inline ~8-12× cada uno; consolidar en `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` [crear] + pointer:
1. **VIEW canónica + helper + reliability signal + lint rule** (TASK-571/699/766/774…).
2. **State machine + CHECK constraint + audit trio append-only** (TASK-700/765/790/792/793…).
3. **Outbox event v1 + reactive consumer que re-lee de PG + dead-letter signal** (TASK-771/773…).
4. **Defense-in-depth N-layer + degradación honesta** (TASK-742…).
5. **Capability ⇒ grant en runtime.ts mismo PR + guard coverage** (TASK-873/935).
6. **Feature flag default-OFF + staging shadow + flip gated** (TASK-872/890/893/895/916…).

## 8. Tabla completa (195 secciones H3, ordenadas por archivo)

> `~tok` = chars/4. `cls` = clasificación propuesta. Destino = spec/skill o "(stays)".

| ~tok | clase | sección | destino propuesto |
|---|---|---|---|
| 224 | KEEP | Business Context Pack | (stays — trim to résumé where flagged) |
| 100 | KEEP | Operator Communication Style | (stays — trim to résumé where flagged) |
| 124 | KEEP | Data Architecture | (stays — trim to résumé where flagged) |
| 235 | MOVE→needs-dest | BigQuery DML Struct Timestamp Hard Rules (ISSUE-082 / TASK-941) | (no doc ref — resolve in plan) |
| 105 | KEEP | Payroll Operational Calendar | (stays — trim to résumé where flagged) |
| 308 | MOVE→needs-dest | International Internal Contract Type Invariants (TASK-894) | (no doc ref — resolve in plan) |
| 110 | KEEP | Canonical 360 Object Model | (stays — trim to résumé where flagged) |
| 54 | KEEP | Deploy Environments | (stays — trim to résumé where flagged) |
| 311 | KEEP | Local-First Development Workflow | (stays — trim to résumé where flagged) |
| 168 | KEEP | Greenhouse Operating Loop | (stays — trim to résumé where flagged) |
| 599 | KEEP | Task Authoring Contract (Claude) | (stays — trim to résumé where flagged) |
| 5990 | KEEP | Vercel Deployment Protection | (stays — trim to résumé where flagged) |
| 839 | KEEP | Vercel CLI Scope Discipline (ISSUE-076, desde 2026-05-13) | (stays — trim to résumé where flagged) |
| 630 | KEEP | Cross-repo action safety (desde 2026-05-18, post Kortex over-application) | (stays — trim to résumé where flagged) |
| 130 | KEEP | Solution Quality Contract | (stays — trim to résumé where flagged) |
| 395 | KEEP | Full API Parity Principle | (stays — trim to résumé where flagged) |
| 862 | MOVE→spec/task | Session access derivation must honor role-assignment lifecycle (TASK-987 / ISSUE-083, desde 2026-06-01) | docs/tasks/complete/TASK-987-session-route-groups-lifecycle-fix.md |
| 1268 | MOVE→spec/task | Approval Authority Delegation invariants (TASK-1020, desde 2026-06-07) | docs/tasks/complete/TASK-1020-leave-approval-authority-delegation-drift-hardening.md |
| 407 | KEEP | Runtime Rollout Completion Gate | (stays — trim to résumé where flagged) |
| 214 | KEEP | Documentation Closure Gate | (stays — trim to résumé where flagged) |
| 238 | KEEP | QA Release Auditor Gate | (stays — trim to résumé where flagged) |
| 2411 | KEEP | Task Closing Quality Gate — full test + production build local (desde 2026-05-13, TASK-827 follow-up) | (stays — trim to résumé where flagged) |
| 336 | MOVE→needs-dest | Admin Center Entitlement Governance (TASK-839, desde 2026-05-11) | (no doc ref — resolve in plan) |
| 233 | MOVE→needs-dest | Deprecated Capabilities Discipline (TASK-840, desde 2026-05-11) | (no doc ref — resolve in plan) |
| 1104 | MOVE→spec/task | View Registry Governance Pattern (TASK-827, desde 2026-05-13) | docs/tasks/complete/TASK-827-client-portal-composition-layer-ui.md |
| 144 | KEEP | Secret Manager Hygiene | (stays — trim to résumé where flagged) |
| 1605 | MOVE→spec | AI Visual Asset Generator | docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md |
| 1456 | MOVE→needs-dest | AI providers — texto/LLM (Gemini, Anthropic, OpenAI) — desde 2026-06-05 | (no doc ref — resolve in plan) |
| 890 | MOVE→needs-dest | Workforce Contracting Studio invariants (TASK-1019, foundation desde 2026-06-05) | (no doc ref — resolve in plan) |
| 510 | MOVE→needs-dest | GitHub Actions workflows — pnpm + Node setup ordering | (no doc ref — resolve in plan) |
| 1530 | MOVE→spec | Typography System — SoT + drift-guard + escala (TASK-1036 / TASK-1038) | docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md |
| 1622 | MOVE→spec | Efeonce brand assets (SSOT `src/config/efeonce-brand.ts`) | docs/architecture/DECISIONS_INDEX.md |
| 987 | KEEP | Architecture Docs (los más críticos) | (stays — trim to résumé where flagged) |
| 65 | KEEP | Al detectar un incidente | (stays — trim to résumé where flagged) |
| 48 | KEEP | Al resolver un incidente | (stays — trim to résumé where flagged) |
| 71 | KEEP | Diferencia con Tasks | (stays — trim to résumé where flagged) |
| 88 | KEEP | Al iniciar trabajo en una task | (stays — trim to résumé where flagged) |
| 150 | KEEP | Al completar una task | (stays — trim to résumé where flagged) |
| 158 | KEEP | Chequeo de impacto cruzado (obligatorio al cerrar) | (stays — trim to résumé where flagged) |
| 119 | KEEP | Dependencias entre tasks | (stays — trim to résumé where flagged) |
| 75 | KEEP | Reclasificación de documentos | (stays — trim to résumé where flagged) |
| 161 | KEEP | Estructura | (stays — trim to résumé where flagged) |
| 197 | KEEP | Cuándo crear o actualizar | (stays — trim to résumé where flagged) |
| 118 | KEEP | Convención de nombres | (stays — trim to résumé where flagged) |
| 166 | KEEP | Formato de cada documento | (stays — trim to résumé where flagged) |
| 117 | KEEP | Versionamiento | (stays — trim to résumé where flagged) |
| 71 | KEEP | Diferencia con docs de arquitectura | (stays — trim to résumé where flagged) |
| 126 | KEEP | Cuándo crear o actualizar | (stays — trim to résumé where flagged) |
| 31 | KEEP | Estructura | (stays — trim to résumé where flagged) |
| 81 | KEEP | Formato mínimo | (stays — trim to résumé where flagged) |
| 199 | KEEP | Heurística de acceso para agentes | (stays — trim to résumé where flagged) |
| 270 | KEEP | Estructura de código | (stays — trim to résumé where flagged) |
| 460 | KEEP | Microcopy / UI copy — regla canónica (TASK-265) | (stays — trim to résumé where flagged) |
| 126 | KEEP | API Routes | (stays — trim to résumé where flagged) |
| 1014 | KEEP | Canonical API error response contract (desde 2026-05-14) | (stays — trim to résumé where flagged) |
| 418 | KEEP | Auth en server components / layouts / pages — patrón canónico | (stays — trim to résumé where flagged) |
| 1077 | KEEP | Agent Auth (acceso headless para agentes y E2E) | (stays — trim to résumé where flagged) |
| 233 | KEEP | Playwright smoke navigation contract | (stays — trim to résumé where flagged) |
| 205 | KEEP | Staging requests programáticas (agentes y CI) | (stays — trim to résumé where flagged) |
| 772 | MOVE→spec/task | Teams Bot outbound smoke y mensajes manuales | docs/operations/manual-teams-announcements.md |
| 1564 | MOVE→spec | Cloud Run ops-worker (crons reactivos + materialización) | docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md |
| 981 | MOVE→spec | Vercel cron classification + migration platform (TASK-775) | docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md |
| 1004 | MOVE→needs-dest | Reliability dashboard hygiene — orphan archive, channel readiness, smoke lane bus, domain incidents | (no doc ref — resolve in plan) |
| 744 | MOVE→spec/task | Async observer liveness — heartbeat, no output freshness (TASK-937, desde 2026-05-26) | docs/tasks/complete/TASK-937-ai-observer-reliability-hardening.md |
| 818 | MOVE→spec | Platform Health API Contract — preflight programático para agentes (TASK-672) | docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md |
| 1342 | MOVE→needs-dest | Notion Integrations Registry — token ↔ servicio ↔ scope canónico (desde 2026-05-22) | (no doc ref — resolve in plan) |
| 1526 | MOVE→needs-dest | Notion teamspace linking — token POR teamspace + cómo enumerar DBs (TASK-998, desde 2026-06-03) | (no doc ref — resolve in plan) |
| 829 | MOVE→spec/task | Notion data_sources endpoint canónico — extractor notion-bq-sync (TASK-1003, desde 2026-06-04) | docs/tasks/complete/TASK-1003-notion-bq-sync-data-sources-endpoint-migration.md |
| 1377 | MOVE→needs-dest | Notion sync canónico — Cloud Run + Cloud Scheduler (NO usar el script manual ni reintroducir un PG-projection separado) | (no doc ref — resolve in plan) |
| 1270 | MOVE→needs-dest | Canonical task status vocabulary V1 — single source of truth cross-tenant (2026-05-18) | (no doc ref — resolve in plan) |
| 1553 | MOVE→needs-dest | Notion delivery PG projection — robust integer cast + per-row resilience (2026-05-18) | (no doc ref — resolve in plan) |
| 339 | MOVE→needs-dest | Cloud Run hubspot-greenhouse-integration (HubSpot write bridge + webhooks) — TASK-574 | (no doc ref — resolve in plan) |
| 1091 | MOVE→needs-dest | HubSpot inbound webhook — p_services (0-162) auto-sync (TASK-813) | (no doc ref — resolve in plan) |
| 1300 | MOVE→spec | HubSpot Service Pipeline lifecycle invariants (TASK-836) | docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md |
| 665 | MOVE→spec/task | HubSpot webhook events — dual-format invariant (TASK-836 follow-up) | docs/tasks/in-progress/TASK-836-hubspot-services-lifecycle-stage-sync-hardening.md |
| 1892 | MOVE→spec/task | Signature platform invariants — provider-neutral + ZapSign (TASK-490 + TASK-491, desde 2026-06-05) | docs/tasks/complete/TASK-490-signature-orchestration-foundation.md |
| 1989 | MOVE→spec/task | Sample Sprint outbound projection invariants (TASK-837) | docs/tasks/in-progress/TASK-837-deal-bound-sample-sprint-service-projection.md |
| 1272 | MOVE→spec/task | Cross-runtime observability — Sentry init invariant (TASK-844) | docs/tasks/in-progress/TASK-844-cross-runtime-observability-sentry-init.md |
| 1093 | MOVE→spec | PostgreSQL connection management — runtime invariants (TASK-846) | docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md |
| 1463 | MOVE→spec | HubSpot inbound webhook — companies + contacts auto-sync (TASK-706) | docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md |
| 508 | KEEP | PostgreSQL Access | (stays — trim to résumé where flagged) |
| 136 | KEEP | Database Connection | (stays — trim to résumé where flagged) |
| 180 | KEEP | Database Migrations | (stays — trim to résumé where flagged) |
| 470 | MOVE→needs-dest | Finance — reconciliación de income.amount_paid (factoring + withholdings) | (no doc ref — resolve in plan) |
| 833 | MOVE→spec/task | Finance — Ledger drift detection: superseded exclusion + honest degradation (TASK-929, desde 2026-05-24) | docs/tasks/in-progress/TASK-929-finance-ledger-drift-remediation-control.md |
| 617 | MOVE→spec/task | Finance — Unanchored paid expense acknowledgment (TASK-934, desde 2026-05-25) | docs/tasks/in-progress/TASK-934-unanchored-paid-expense-anchoring-review-queue.md |
| 635 | MOVE→needs-dest | Finance — FX P&L canónico para tesorería (Banco "Resultado cambiario") | (no doc ref — resolve in plan) |
| 1287 | MOVE→spec/task | Finance — CLP currency reader invariants (TASK-766) | docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md |
| 920 | MOVE→spec/task | Finance — Account balances FX consistency (TASK-774, extiende TASK-766) | docs/tasks/complete/TASK-774-account-balance-clp-native-reader-contract.md |
| 1936 | MOVE→spec/task | Finance — Rolling rematerialize anchor contract (TASK-871, supersedes ISSUE-069, 2026-05-13) | docs/tasks/complete/TASK-871-account-balance-rolling-anchor-contract.md |
| 886 | MOVE→spec/task | Finance — Account drawer temporal modes contract (TASK-776) | docs/tasks/in-progress/TASK-776-account-detail-drawer-temporal-modes-contract.md |
| 1108 | MOVE→spec/task | Finance — Economic Category Dimension Invariants (TASK-768) | docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md |
| 1071 | MOVE→spec/task | Finance — Reactive projections en lugar de sync inline a BQ (TASK-771) | docs/tasks/complete/TASK-771-finance-supplier-write-decoupling-bq-projection.md |
| 1034 | MOVE→spec/task | Finance — Expense display contract (TASK-772) | docs/tasks/complete/TASK-772-finance-expense-supplier-hydration-cash-out-selection.md |
| 928 | MOVE→spec/task | Outbox publisher canónico — Cloud Scheduler, no Vercel (TASK-773) | docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md |
| 1622 | MOVE→spec | Production Release Control Plane invariants (TASK-848) | docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md |
| 2562 | MOVE→spec/task | Production Release Watchdog invariants (TASK-849) | docs/tasks/complete/TASK-849-production-release-watchdog-alerts.md |
| 2054 | MOVE→spec/task | Production Preflight CLI invariants (TASK-850) | docs/tasks/in-progress/TASK-850-production-preflight-cli-complete.md |
| 2288 | MOVE→spec | Production Release Operational Playbook (TASK-871 follow-up — lessons 2026-05-13) | docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md |
| 2121 | MOVE→spec/task | Production Release Orchestrator invariants (TASK-851) | docs/tasks/in-progress/TASK-851-production-release-orchestrator-workflow.md |
| 1785 | MOVE→spec/task | Azure Infra Release Gating invariants (TASK-853) | docs/tasks/in-progress/TASK-853-azure-infra-release-gating.md |
| 1755 | MOVE→spec/task | Release Observability Completion invariants (TASK-854) | docs/tasks/in-progress/TASK-854-release-deploy-duration-last-status-signals.md |
| 642 | MOVE→spec/task | Finance write-path E2E gate (TASK-773 Slice 6) | docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md |
| 918 | KEEP | Database — Migration markers (anti pre-up-marker bug) | (stays — trim to résumé where flagged) |
| 525 | KEEP | SQL embebido — type alignment + live testing (ISSUE-071, 2026-05-08) | (stays — trim to résumé where flagged) |
| 584 | MOVE→needs-dest | Finance — Internal Account Number Allocator (TASK-700) | (no doc ref — resolve in plan) |
| 1164 | MOVE→spec | Finance — Payment order ↔ bank settlement invariants (TASK-765) | docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md |
| 571 | MOVE→needs-dest | Finance — Payment Provider Catalog + category provider rules (TASK-701) | (no doc ref — resolve in plan) |
| 700 | MOVE→needs-dest | Finance — Bank ↔ Reconciliation synergy (TASK-722) | (no doc ref — resolve in plan) |
| 566 | MOVE→needs-dest | Finance — Evidence canonical uploader (TASK-721) | (no doc ref — resolve in plan) |
| 468 | MOVE→needs-dest | Finance — Bank KPI aggregation policy-driven (TASK-720) | (no doc ref — resolve in plan) |
| 1092 | MOVE→spec/task | Finance — OTB cascade-supersede (TASK-703b) | docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md |
| 772 | MOVE→needs-dest | Finance — Labor allocation consolidada (TASK-709) — invariante anti double-counting | (no doc ref — resolve in plan) |
| 51 | KEEP | Tests y validación | (stays — trim to résumé where flagged) |
| 475 | KEEP | Charts — política canónica (decisión 2026-04-26 — prioridad: impacto visual) | (stays — trim to résumé where flagged) |
| 897 | KEEP | Tooling disponible (CLIs autenticadas) | (stays — trim to résumé where flagged) |
| 1024 | MOVE→spec/task | Auth resilience invariants (TASK-742) | docs/tasks/complete/TASK-742-auth-resilience-7-layers.md |
| 718 | MOVE→spec/task | Home Rollout Flag Platform (TASK-780) | docs/tasks/in-progress/TASK-780-home-rollout-flag-platform.md |
| 1711 | MOVE→spec/task | Nexa Insights detail page canonical invariants (TASK-947, desde 2026-05-28) | docs/tasks/complete/TASK-947-nexa-insights-detail-page-canonical.md |
| 946 | MOVE→spec | Quick Access Shortcuts Platform (TASK-553) | docs/architecture/ui-platform/HISTORIAL.md |
| 605 | MOVE→spec | Operational Data Table Density Contract (TASK-743) | docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md |
| 1219 | MOVE→spec | Final Settlement Document Lifecycle invariants (TASK-863 V1.5.2) | docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md |
| 1814 | MOVE→spec/task | Real-Artifact Iterative Verification Loop — metodología canónica para features visuales (TASK-863 V1.1→V1.5.1) | docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md |
| 1507 | MOVE→spec | Semantic Column Invariants — frontend / PDFs / emails / documentos legales (TASK-863 V1.5.1) | docs/architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md |
| 1409 | MOVE→spec/task | Sample Sprints Runtime Projection invariants (TASK-835) | docs/tasks/complete/TASK-835-sample-sprints-runtime-projection-hardening.md |
| 774 | MOVE→needs-dest | Account 360 facet readers — anti silent-catch contract (TASK-1059, desde 2026-06-09) | (no doc ref — resolve in plan) |
| 1352 | MOVE→spec | Organization Workspace projection invariants (TASK-611) | docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md |
| 1342 | MOVE→spec | Client Portal BFF / Anti-Corruption Layer invariants (TASK-822, desde 2026-05-12) | docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md |
| 1580 | MOVE→spec | Organization-by-facets — receta canónica para extender (TASK-613) | docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md |
| 975 | MOVE→spec | Payroll — Receipt presentation contract (TASK-758, v4 desde 2026-05-04) | docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md |
| 667 | MOVE→spec | Payroll — Period report + Excel disaggregation (TASK-782, desde 2026-05-04) | docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md |
| 573 | MOVE→spec | Legal Signatures Platform invariants (TASK-863 V1.4, desde 2026-05-11) | docs/architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md |
| 1013 | MOVE→spec | Finiquito V1.5 — Cláusulas legales state-conditional + auto-regeneración PDF (TASK-863, desde 2026-05-11) | docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md |
| 1463 | MOVE→spec/task | Person Legal Profile invariants (TASK-784, desde 2026-05-05) | docs/tasks/in-progress/TASK-784-person-legal-profile-identity-documents-foundation.md |
| 1059 | MOVE→spec/task | Workforce role title source-of-truth + Entra drift governance (TASK-785, desde 2026-05-05) | docs/tasks/in-progress/TASK-785-workforce-role-title-source-of-truth-governance.md |
| 1660 | MOVE→spec/task | SCIM Internal Collaborator Provisioning invariants (TASK-872, desde 2026-05-13) | docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md |
| 2560 | MOVE→spec | Capability runtime grant invariant (TASK-873, desde 2026-05-14) | docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md |
| 918 | MOVE→spec/task | Design System Figma node linking — ver ≠ vincular (TASK-1072, desde 2026-06-10) | docs/tasks/complete/TASK-1072-designer-role-figma-node-linking.md |
| 912 | MOVE→spec/task | Knowledge Platform foundation invariants (TASK-1081, desde 2026-06-11) | docs/tasks/complete/TASK-1081-knowledge-core-schema-source-registry.md |
| 1278 | MOVE→spec/task | Knowledge ingestion invariants (TASK-1082, desde 2026-06-11) | docs/tasks/complete/TASK-1082-notion-knowledge-ingestion-mvp.md |
| 987 | MOVE→spec/task | Knowledge auto-ingest por webhook Notion invariants (TASK-1094, desde 2026-06-12) | docs/operations/runbooks/notion-knowledge-webhook.md |
| 1332 | MOVE→spec/task | Knowledge Search API invariants (TASK-1083, desde 2026-06-12) | docs/tasks/complete/TASK-1083-knowledge-search-api-golden-questions.md |
| 425 | MOVE→needs-dest | Nexa Intelligence — documentación por capas + doc gate (TASK-1124, desde 2026-06-15) | (no doc ref — resolve in plan) |
| 871 | MOVE→spec/task | Nexa Knowledge Retrieval invariants (TASK-1085, desde 2026-06-12) | docs/tasks/in-progress/TASK-1085-nexa-knowledge-retrieval-citations.md |
| 1085 | MOVE→spec/task | Knowledge MCP / ecosystem lane invariants (TASK-1086, desde 2026-06-12) | docs/tasks/complete/TASK-1086-greenhouse-mcp-knowledge-resources-v1.md |
| 956 | MOVE→spec/task | Nexa provider abstraction + router interno invariants (TASK-1091, desde 2026-06-12) | docs/tasks/in-progress/TASK-1091-nexa-provider-abstraction-anthropic-adapter.md |
| 978 | MOVE→spec/task | Nexa governed action runtime invariants (TASK-1137, desde 2026-06-15) | docs/tasks/in-progress/TASK-1137-nexa-governed-action-runtime-command-bridge.md |
| 1648 | MOVE→needs-dest | SQL Signal Reader Schema Validation Gate (TASK-893 hotfix #3, desde 2026-05-16) | (no doc ref — resolve in plan) |
| 1771 | MOVE→spec | Workforce Exit Payroll Eligibility invariants (TASK-890, desde 2026-05-15) | docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md |
| 1600 | MOVE→spec | Payroll Participation Window invariants (TASK-893, desde 2026-05-16) | docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md |
| 1749 | MOVE→spec | Leave Accrual Participation-Aware invariants (TASK-895, desde 2026-05-16) | docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md |
| 1657 | MOVE→spec | Person 360 Relationship Reconciliation invariants (TASK-891, desde 2026-05-15) | docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md |
| 1341 | MOVE→spec | Offboarding Closure Completeness Aggregate invariants (TASK-892, desde 2026-05-15) | docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md |
| 1467 | MOVE→spec | Contractor Engagements invariants (TASK-790, desde 2026-05-29) | docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md |
| 1025 | MOVE→spec/task | Contractor Invoice Assets invariants (TASK-791, desde 2026-05-30) | docs/tasks/complete/TASK-791-contractor-invoice-assets-uploader-contexts.md |
| 1074 | MOVE→spec/task | Contractor Work Submissions invariants (TASK-792, desde 2026-05-30) | docs/tasks/complete/TASK-792-contractor-work-submissions-approval-dispute-flow.md |
| 1649 | MOVE→spec/task | Contractor Payables → Finance bridge invariants (TASK-793, desde 2026-05-30) | docs/tasks/complete/TASK-793-contractor-payables-finance-obligations-bridge.md |
| 1009 | MOVE→spec/task | Chile Honorarios Compliance invariants (TASK-794, desde 2026-05-30) | docs/tasks/complete/TASK-794-chile-honorarios-compliance-sii-retention.md |
| 971 | MOVE→spec/task | International Contractor Boundary invariants (TASK-795 Fase A, desde 2026-05-30) | docs/tasks/complete/TASK-795-international-contractor-provider-boundary-fx-policy.md |
| 1302 | MOVE→spec/task | Contractor Self-Service Hub invariants (TASK-796, desde 2026-05-30) | docs/tasks/complete/TASK-796-contractor-self-service-hub.md |
| 756 | MOVE→spec/task | Contractor domain ↔ Finiquito/Offboarding non-regression boundary (hard rule, desde 2026-05-30) | docs/tasks/complete/TASK-956-employee-to-contractor-transition-connected-command.md |
| 686 | MOVE→spec/task | Employee→Contractor connected command invariants (TASK-956, desde 2026-05-30) | docs/tasks/complete/TASK-956-employee-to-contractor-transition-connected-command.md |
| 1160 | MOVE→spec/task | Contractor ↔ Legacy Payroll double-rail exclusion + current work classification (TASK-957, desde 2026-05-30) | docs/tasks/complete/TASK-957-contractor-payroll-double-rail-exclusion-contract-type-reconciliation.md |
| 1127 | MOVE→spec/task | Contractor Closure + Transition Controls invariants (TASK-797, desde 2026-06-01) | docs/tasks/in-progress/TASK-797-contractor-closure-transition-controls.md |
| 690 | MOVE→spec/task | Compensation version tuple drift — payroll-safe reconcile + validated CHECK (TASK-958, desde 2026-05-31) | docs/tasks/complete/TASK-958-compensation-version-tuple-drift-remediation.md |
| 1372 | MOVE→spec/task | Contractor Remittance Advice invariants (TASK-960, desde 2026-05-31) | docs/tasks/complete/TASK-960-contractor-remittance-advice.md |
| 1365 | MOVE→spec/task | Contractor Agreed-Amount SoD + Guardrail invariants (TASK-968, desde 2026-05-31) | docs/tasks/complete/TASK-968-contractor-engagement-compensation-setup-agreed-amount-guardrail.md |
| 1365 | MOVE→spec/task | Contractor Payable Bank Settlement invariants (TASK-977, desde 2026-05-31) | docs/tasks/complete/TASK-977-contractor-payable-bank-settlement.md |
| 708 | MOVE→spec/task | Contractor Payment Due-Date + SLA invariants (TASK-978, desde 2026-05-31) | docs/tasks/complete/TASK-978-contractor-payment-due-date-sla.md |
| 980 | MOVE→spec/task | Monthly Contractor Payment Run invariants (TASK-979, desde 2026-05-31) | docs/tasks/complete/TASK-979-monthly-contractor-payment-run.md |
| 955 | MOVE→spec/task | Contractor Run Report ("Nómina de Contractors") invariants (TASK-980, desde 2026-05-31) | docs/tasks/complete/TASK-980-contractor-payment-run-report-pdf-excel.md |
| 1017 | MOVE→spec/task | Contractor Payable Paid Lifecycle + Remittance Email invariants (TASK-981, desde 2026-06-01) | docs/tasks/complete/TASK-981-contractor-payment-email-remittance.md |
| 919 | MOVE→spec/task | Navigation Reachability Governance (TASK-982, desde 2026-06-01) | docs/tasks/complete/TASK-982-navigation-reachability-governance-contract.md |
| 1006 | MOVE→needs-dest | Identity Bridge Cutover Protocol (TASK-877 follow-up, desde 2026-05-16) | (no doc ref — resolve in plan) |
| 2293 | MOVE→spec | ICO Materializer Hardening Pattern (TASK-900, desde 2026-05-18) | docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md |
| 1331 | MOVE→spec | Nexa AI Signals append-only event log invariants (TASK-943, desde 2026-05-28) | docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md |
| 1920 | MOVE→needs-dest | ICO Status Transition Foundation invariants (TASK-908, desde 2026-05-18) | (no doc ref — resolve in plan) |
| 1872 | MOVE→spec | Delivery Metrics Ownership Boundary invariants (TASK-901 + TASK-908 + TASK-909, desde 2026-05-17) | docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md |
| 1334 | MOVE→spec | ICO Metrics Progressive Migration invariants (TASK-901 + TASK-908 + TASK-910, desde 2026-05-17) | docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md |
| 1295 | MOVE→spec/task | Notion Demo Teamspace Sandbox invariants (TASK-910, desde 2026-05-19) | docs/tasks/in-progress/TASK-910-notion-demo-teamspace-migration-sandbox.md |
| 2923 | MOVE→spec/task | RpA V2 Demo Pipeline End-to-End invariants (TASK-913, desde 2026-05-19) | docs/tasks/in-progress/TASK-913-rpa-v2-demo-pipeline-end-to-end.md |
| 1138 | MOVE→spec/task | Notion Status Transition Capture — productive pipeline invariants (TASK-912, desde 2026-05-21) | docs/tasks/in-progress/TASK-912-ico-status-transition-webhook-ingestion-and-bq-formula.md |
| 1859 | MOVE→spec/task | RpA V2 productive compute + writeback invariants (TASK-916, desde 2026-05-21) | docs/tasks/complete/TASK-916-rpa-v2-productive-compute-writeback.md |
| 852 | MOVE→spec/task | FTR writeback invariants (TASK-903, sibling de TASK-916, desde 2026-05-24) | docs/tasks/complete/TASK-903-ftr-writeback-notion-gh-property.md |
| 1003 | MOVE→spec/task | OTD Bucket Classifier Ownership invariants (TASK-923, M1, desde 2026-05-24) | docs/tasks/complete/TASK-923-greenhouse-owns-otd-bucket-classifier-parity-shadow.md |
| 1040 | MOVE→spec/task | Due-Date Change Capture invariants (TASK-921, M0, desde 2026-05-24) | docs/tasks/complete/TASK-921-due-date-change-capture-reschedule-reason.md |
| 917 | MOVE→spec | Attributable Lateness invariants (TASK-922, M2, desde 2026-05-24) | docs/architecture/metrics/ATTRIBUTABLE_LATENESS_V1.md |
| 1605 | MOVE→spec/task | Canonical Organization Write SSOT invariants (TASK-991, desde 2026-06-02) | docs/tasks/in-progress/TASK-991-canonical-client-birth-lifecycle.md |
| 2066 | MOVE→spec | Client Lifecycle Orchestrator invariants (TASK-992, onboarding V1.0 desde 2026-06-03) | docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md |
| 716 | MOVE→spec/task | Client Portal User Invitation SSOT (TASK-1001, desde 2026-06-03) | docs/tasks/in-progress/TASK-1001-client-portal-people-provisioning-onboarding.md |
| 708 | MOVE→spec/task | Notion onboarding preflight — "configurado ≠ fluyendo" (TASK-1009, desde 2026-06-04) | docs/tasks/complete/TASK-1009-notion-onboarding-flow-preflight.md |
| 969 | MOVE→spec/task | Onboarding checklist evidence layer — el estado se deriva de evidencia real, no se marca a ciegas (TASK-1017, desde 2026-06-05) | docs/tasks/complete/TASK-1017-onboarding-checklist-item-evidence-auto-verification.md |
| 475 | KEEP | Git hooks canonicos (Husky + lint-staged) — auto-prevention de errores CI | (stays — trim to résumé where flagged) |
| 446 | KEEP | Avatares de usuario — helper canónico (fuente única, desde 2026-06-05) | (stays — trim to résumé where flagged) |
| 53 | KEEP | Otras convenciones | (stays — trim to résumé where flagged) |
