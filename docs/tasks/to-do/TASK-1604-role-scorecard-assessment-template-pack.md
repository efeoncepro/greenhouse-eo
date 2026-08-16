# TASK-1604 — Critical Role Scorecards and Assessment Template Pack

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration|seed`
- Epic: `EPIC-038`
- Status real: `Diseño`
- Rank: `EPIC-038-phase-1`
- Domain: `hiring|hr|content|agency`
- Blocked by: `TASK-1602`
- Branch: `task/TASK-1604-role-scorecard-assessment-template-pack`
- GitHub Issue: `none`

## Summary

Materializa scorecards y assessment templates reutilizables para Account Manager y Content Creator, empezando por roles críticos y sin crear un banco paralelo.

## Why This Task Exists

El motor de assessment existe, pero los estándares por rol, work samples, software/hard skills, interview guide y criterios de calidad no están gobernados como paquete operativo uniforme.

## Goal

- Publicar templates versionados y preguntas con gate SME.
- Cubrir work sample, entrevista estructurada, portfolio/software evidence y límites de nivel.
- Conectar cada template al quality gate del opening.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `.codex/skills/greenhouse-talent-people-operator/references/assessment-interviewing.md`
- `docs/documentation/hr/assessment-question-authoring-guide.md`
- `TASK-1603`

## Dependencies & Impact

### Depends on

- `TASK-1602` y `TASK-1603`; assessment engine `TASK-1360..1363`.

### Blocks / Impacts

- Critical-role onboarding y validity loop.

### Files owned

- `migrations/**`
- `scripts/hiring/**`
- `docs/documentation/hr/**`

## Current Repo State

### Already exists

- Assessment engine, competencies, question bank, template versioning y Content Creator v2 runtime.

### Gap

- Falta un pack formal por rol con coverage matrix, interview scorecard, evidence policy y aprobación SME trazable.

### Baseline verified 2026-08-15

- El motor, templates/versionado, competencias y Content Creator v2 son reutilizables; no prueban que exista un
  pack de roles críticos aprobado bajo la policy de claims de `TASK-1602`.
- Ningún seed, coverage matrix ni gate SME de esta task fue aplicado. El pack debe esperar la policy de claims y
  consumir el binding de opening que `TASK-1719` implementará para `TASK-1603`.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `greenhouse_hiring` y documentación HR
- Future candidate home: `domain-package`
- Boundary: templates/questions/scorecards canónicos consumidos por Hiring y review
- Server/browser split: sensitive answer keys/rúbricas sólo server-side; candidato recibe allowlist
- Build impact: `none`
- Extraction blocker: template versioning y foreign keys a applications históricas

## Backend/Data Contract

- Backend rigor: `backend-standard`
- Impacto principal: `migration|seed`
- Source of truth afectado: hiring competency/question/template
- Consumidores afectados: assessment taking/review, Hiring Desk, Nexa
- Runtime target: local, staging y production por migración gobernada
- Invariantes: template usado es inmutable; preguntas `draft → sme_review → active`; score advisory
- Migration posture: additive seed con rollback sólo antes de uso; después retire/versione, nunca borre
- Audit: SME status transitions y template creation events
- Access: capabilities internas; no candidate answer key

## Scope

### Slice 1 — Scorecard matrix

- Definir competencias, niveles, pesos, evidencia, preguntas, entrevista y software/hard skills por rol.

### Slice 2 — Seed and SME activation

- Crear/activar templates y questions; documentar cómo asignar y puntuar.

## Out of Scope

- Nuevas UI de authoring y AI scoring autónomo.

## Acceptance Criteria

- [ ] Account Manager y Content Creator tienen template aprobado y coverage matrix.
- [ ] Cada pregunta tiene rubric observable y revisión SME.
- [ ] Se prueba candidate projection sin answer key/rubric.
- [ ] Manual de asignación y entrevista queda actualizado.

## Rollout Plan & Risk Matrix

Seed → revisión SME → staging → aplicación a un opening piloto → production. Rollback: retirar preguntas/template no usados; templates usados se versionan.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Assessment demasiado largo | candidate experience | medium | timebox, pilot y completion telemetry | `hiring.assessment_completion_drop` |
| Rubric inconsistente | hiring quality | medium | SME calibration y dual scoring sample | `hiring.assessment_rater_drift` |

## Verification & Definition of Done

- [ ] Coverage, anti-leak, scoring y live smoke verdes.
- [ ] SME owner acepta cada template.
- [ ] Docs/runbook y registry sincronizados.
