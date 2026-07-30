# EPIC-038 — Efeonce Talent Assurance: agentic quality and continuity system

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Research/ADR proposed`
- Rank: `TBD`
- Domain: `cross-domain` (workforce + hiring + people + client experience + delivery + finance + agents)
- Owner: `unassigned`
- Branch: `epic/EPIC-038-efeonce-talent-assurance-agentic-quality-system`
- GitHub Issue: `none`

## Summary

Coordina la evolución de Greenhouse desde un Hiring/ATS con assessment hacia un sistema de assurance de capacidad humana. El programa protege la promesa `Verificado por Efeonce` para el operador del cliente, el colaborador y Efeonce como accountable agency.

Nace agentic-by-design: los agentes observan, recomiendan, proponen y ejecutan acciones acotadas sobre capabilities canónicas, con evidencia, evals, human oversight, audit y límites económicos. No autoriza agentes autónomos para contratar, rechazar, verificar/revocar claims, fijar precio, asignar personal o terminar relaciones.

## Why This Epic Exists

EPIC-011 resolvió la foundation y el flujo end-to-end de Hiring/ATS. EPIC-017 coordina la fundación workforce persona-céntrica. Ninguno por sí solo gobierna el claim comercial/operativo de capacidad verificada desde la demanda hasta el delivery, la experiencia del operador, el desarrollo, la continuidad, la selección fallida y la economía de la promesa.

El caso Berel muestra el gap: tres salidas en tres meses por falta de conocimiento/capacidad. Diseño estable muestra que no es una falla general de retención. La presión de precio agrega un segundo riesgo: una oportunidad puede ser difícil de reclutar y retener antes de que Recruiting reciba la vacante.

## Outcome

- Existe un contrato verificable y acotado para `Verificado por Efeonce`.
- Cada role/capability crítica tiene evidencia mínima, template, work sample, entrevista y Quality Gate.
- Hiring no permite decisiones con evidencia crítica ausente sin un override humano explícito.
- Onboarding, 30/60/90, feedback de operadores y performance cierran el loop de calidad.
- Las salidas distinguen `selection_failure`, `role_mismatch`, `needs_support` y otras causas.
- Workforce/Finance/Commercial validan recruitability, loaded cost, continuidad y margen antes de comprometer una promesa.
- Agents operate via canonical readers/commands and move through observe → recommend → propose → execute_bounded with promotion evidence.
- El sistema aprende por rol, template, cuenta, modalidad y economics sin convertir inferencias en verdad.

## Architectural non-duplication rule

Este epic **extiende y conecta capacidades existentes; no crea una plataforma desde cero**.

Child tasks deben reutilizar y extender `Person`, `candidate_facet`, `HiringApplication`, assessment/templates,
`HiringHandoff`, HRIS/onboarding, talent profiles, performance/ICO, `TalentDemand`, Team Capacity, Finance/CPQ y
Nexa/agent runtime.

Queda prohibido crear un ATS, HRIS, skills registry, portfolio/document vault, performance system, cost ledger o
agent runtime paralelo. Tampoco se puede crear una identidad paralela para personas verificadas ni otorgar al agente
permisos que evadan capabilities, entitlements, audit o los commands canónicos.

Una proyección nueva requiere fuente canónica, owner, lineage, freshness, autorización, retención, reconciliación y
consumers nombrados. Una nueva source of truth requiere ADR independiente y aceptación explícita; EPIC-038 no la
autoriza por defecto.

## Architecture Alignment

- [Talent Assurance Architecture V1](../../architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md)
- [Talent Assurance Decision V1](../../architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md)
- [Hiring/ATS Architecture V1](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
- [Unified Workforce Foundation V1](../../architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md)
- [Unified Workforce Foundation Decision V1](../../architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md)
- [Team Capacity Architecture V1](../../architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md)
- [Nexa Core Agentic Platform Decision V1](../../architecture/GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md)
- [Talent Assurance Economic Guardrails V1](../../business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md)

## Program phases

### Phase 0 — Decision and evidence baseline

- Accept or revise the ADR.
- Inventory existing profile, skills, portfolio, assessment, onboarding, performance, client feedback and economics sources.
- Define V1 claim taxonomy, verifier ownership, evidence policy and privacy boundaries.

### Phase 1 — Read-only assurance projection

- Verified Capability Record.
- Evidence completeness and freshness.
- Hiring Quality Case.
- Quality-of-Hire Outcome projection.
- Recruitability and economic feasibility reader.

### Phase 2 — Agent observe/recommend

- Demand Advisor.
- Role Calibrator.
- Candidate Evidence Analyst.
- Continuity Planner.
- Economics Advisor.
- Initial eval datasets, traces, abstention and cost controls.

### Phase 3 — Human-confirmed proposals

- role/assessment template proposal;
- missing-evidence proposal;
- development and onboarding proposal;
- verification renewal/review proposal;
- continuity plan proposal;
- scope/composition/pricing scenario proposal.

### Phase 4 — Bounded execution

Only reversible, allowlisted actions with exact approval binding, idempotency, readback and kill switch. Candidate/employment/client-capacity decisions remain human-owned.

### Phase 5 — Quality loop and promotion

- 30/60/90 operational review;
- client-operator feedback;
- selection-failure learning;
- template and rubric recalibration;
- autonomy evidence review;
- acceptance or rejection of further autonomy.

## Child Tasks

Task IDs were reserved through the task process. Execution remains gated by ADR acceptance, owner assignment and
the dependencies recorded in each task:

### Phase 0 — Decision and evidence baseline

- [TASK-1602](../../tasks/to-do/TASK-1602-talent-assurance-claim-verification-contract.md) — claims, verification lifecycle and evidence contract.
- [TASK-1607](../../tasks/to-do/TASK-1607-recruitability-economic-feasibility-gate.md) — recruitability and economic feasibility.

### Phase 1 — Read-only assurance projection

- [TASK-1603](../../tasks/to-do/TASK-1603-hiring-quality-gate-opening-binding.md) — Hiring Quality Gate and opening/template binding.
- [TASK-1604](../../tasks/to-do/TASK-1604-role-scorecard-assessment-template-pack.md) — critical-role scorecards and assessment templates.
- [TASK-1605](../../tasks/to-do/TASK-1605-quality-of-hire-outcome-selection-failure.md) — Quality-of-Hire outcomes and selection-failure taxonomy.
- [TASK-1606](../../tasks/to-do/TASK-1606-client-operator-feedback-continuity-projection.md) — client-operator feedback and continuity projection.
- [TASK-1610](../../tasks/to-do/TASK-1610-talent-assurance-read-models-api-parity.md) — read models and Full API Parity.

### Phases 2–4 — Agentic proposals and bounded actions

- [TASK-1608](../../tasks/to-do/TASK-1608-talent-assurance-agent-proposal-run-contract.md) — agent proposal, policy and run contract.
- [TASK-1609](../../tasks/to-do/TASK-1609-talent-assurance-evals-observability-promotion.md) — evals, observability and autonomy promotion.
- [TASK-1611](../../tasks/to-do/TASK-1611-talent-assurance-operator-cockpit.md) — internal assurance cockpit and operator workflows.

## Existing Related Work

- EPIC-011 Hiring / ATS End-to-End Program.
- EPIC-017 Unified Workforce Foundation Iterative Program.
- TASK-1360..1365 assessment, AI assist, fairness and validity.
- TASK-770 Hiring → HRIS collaborator activation.
- `src/views/greenhouse/admin/TalentOpsDashboardView.tsx` and talent verification flows.
- `docs/services/creative-services/EFEONCE_CREATIVE_SERVICES_OPERATING_MODEL_V1.md`.
- [Hiring Quality Assurance Audit 2026-07-30](../../audits/hiring/GREENHOUSE_HIRING_QUALITY_ASSURANCE_AUDIT_2026-07-30.md).

## Agent execution rules

- Agents use canonical readers and commands; never ad-hoc SQL or hidden writes.
- AI proposes; human confirms for hiring, claims, client-facing staffing, price/margin, adverse outcomes and sensitive data.
- Deterministic policy engines enforce authorization, tenant scope, state transitions, evidence completeness, budgets and idempotency.
- Every proposal carries evidence references, freshness, confidence, policy version, proposed-vs-confirmed diff and expiry.
- No hidden chain-of-thought is persisted; observability stores structured evidence and outcomes.
- No agent may use raw cross-domain tables as context when a safe projection is available.
- No autonomy promotion without representative evals, adversarial cases, human override metrics, failure containment and kill-switch evidence.
- Reuse-first: antes de crear cualquier schema, aggregate, route, capability, tool, agent runtime o surface, la task debe demostrar por qué no puede extender una capacidad existente.

## Exit Criteria

- [ ] ADR accepted or explicitly rejected/recalibrated.
- [ ] V1 claim taxonomy and verification lifecycle approved.
- [ ] Quality Gate is defined and enforced for at least one critical role.
- [ ] 30/60/90 outcome and selection-failure taxonomy are operational.
- [ ] Economics feasibility gate is linked to a real demand/proposal path.
- [ ] At least one agent reaches `recommend` with eval and human override evidence.
- [ ] Any `execute_bounded` action has idempotency, approval binding, audit, reconciliation and rollback/kill switch.
- [ ] Client-operator and collaborator experiences are documented and privacy-reviewed.
- [ ] Architecture, functional, manual, task and handoff docs are synchronized.

## Non-goals

- No autonomous hire/reject.
- No autonomous verification or revocation of a collaborator claim.
- No automatic compensation, price, discount or margin decisions.
- No replacement of HRIS, Payroll, Finance, Client Experience or Staff Augmentation ownership.
- No new deployable, agent platform, MCP server or cross-repo runtime in Phase 0.
- No public claim or badge rollout before evidence, privacy, commercial and operational approval.
