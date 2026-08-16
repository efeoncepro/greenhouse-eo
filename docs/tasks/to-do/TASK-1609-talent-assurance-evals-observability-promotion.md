# TASK-1609 — Talent Assurance Evals, Observability and Autonomy Promotion

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader|integration`
- Epic: `EPIC-038`
- Status real: `Validity reader existe; eval/promotion contract Talent Assurance no implementado`
- Rank: `EPIC-038-phase-2`
- Domain: `agents|data|ops|hiring|workforce`
- Blocked by: `TASK-1602`, `TASK-1608`
- Branch: `task/TASK-1609-talent-assurance-evals-observability-promotion`
- GitHub Issue: `none`

## Summary

Construye datasets, trazas, métricas, costos, abstention y gates para decidir si un agente puede avanzar de observe a recommend, propose o execute_bounded.

## Why This Task Exists

La autonomía no puede promoverse por intuición. Talent Assurance necesita evidencia representativa, adversarial, segmentada y con override humano antes de ejecutar sobre personas o capacidad.

## Goal

- Versionar evals por rol, cuenta, geografía y workflow.
- Medir evidencia citada, abstention, false pass/fail, unauthorized action, override y costo.
- Expirar promoción cuando cambien modelo, prompt, tools, policy, corpus o población.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1608`, `TASK-1605` y validity reader existente.

### Blocks / Impacts

- Autonomy promotion de todos los agentes de EPIC-038.

### Files owned

- `evals/**`, `src/lib/agents/**`, observability/reliability docs y fixtures

## Current Repo State

### Already exists

- `TASK-1364` aporta evidencia agregada y auditable de assessment-validity con comportamiento honesto ante muestra
  insuficiente; no es una suite de evals agentic ni una aprobación de autonomía.

### Gap / start blockers

- No existen datasets Talent Assurance representative/holdout/adversarial, labels ciegos, policy de promoción,
  estado de democión, métricas override/abstention ni evidencia presupuestaria.
- Esta task comienza sólo después de que `TASK-1608` defina la superficie agent/run real y `TASK-1605` aporte
  outcomes gobernados. Ninguna acción productiva puede ejercerse desde un eval fixture.

## Modular Placement Contract

- Topology impact: `worker|tooling`
- Current home: evals y agent runtime compartido
- Future candidate home: `remain-shared`
- Boundary: eval runner consumes safe fixtures and emits promotion evidence
- Server/browser split: candidate/collaborator data redacted in eval fixtures; no secrets in browser
- Build impact: datasets/model adapters explicit
- Extraction blocker: shared model/policy/tool versions and audit lineage

## Backend/Data Contract

- Backend rigor: `backend-standard`
- Impacto principal: `reader|integration`
- Invariantes: no production action from eval; no protected-trait inference; reproducible prompt/model/policy versions
- Audit: eval run, dataset version, labels, failure and promotion decision
- Rollout: shadow/holdout; promotion is human-approved policy state
- Rollback: demote autonomy tier and kill switch; preserve evidence

## Scope

### Slice 1 — Dataset and scoring contract

- Representative, holdout and adversarial cases with human labels and abstention expectations.

### Slice 2 — Trace and cost observability

- Evidence citation, override, unauthorized action, latency, budget and cost per accepted success.

### Slice 3 — Promotion gate

- Versioned policy for tier changes, expiry and demotion.

## Out of Scope

- Training a new model or autonomous hiring decisions.

## Acceptance Criteria

- [ ] Every agent role has eval set, baseline and threshold.
- [ ] Promotion requires human sign-off and expires on material change.
- [ ] Adversarial cases cover ambiguity, stale evidence, leakage and conflicting sources.
- [ ] Cost and override metrics are queryable.

## Rollout Plan & Risk Matrix

Offline → shadow → observe/recommend → proposal promotion. Demotion is immediate on threshold breach or incident.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Eval no representa la población | agents/data | medium | holdout y slice analysis | `agent.eval_population_drift` |
| Cost runaway | agents/finance | medium | budget fence y per-run cap | `agent.talent_assurance_budget_breach` |

## Verification & Definition of Done

- [ ] Baseline reproducible, adversarial suite y human label review.
- [ ] Promotion/demotion drill y cost evidence.
- [ ] Docs de operación y handoff actualizados.
