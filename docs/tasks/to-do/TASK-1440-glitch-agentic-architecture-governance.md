# TASK-1440 — Glitch Agentic Architecture and Editorial Governance

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Bajo`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-031`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `task/TASK-1440-glitch-agentic-architecture-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formaliza la decisión arquitectónica y de producto que permite operar Glitch como pipeline agéntico gobernado sin mezclar criterio editorial, persistencia, publicación y aprobación humana.

## Why This Task Exists

El starter exportado conserva oficio editorial, pero no define fuentes de verdad, fronteras de autonomía, tipos de contenido, contratos runtime ni ownership entre Greenhouse, Notion, Content Factory y WordPress.

## Goal

- Aceptar el ADR con source of truth y frontera humano/agente explícitos.
- Agregar a PDR-003 la cadencia y la distinción `weeklyEdition`/`tacticalGlitch`.
- Publicar el operating model que gobierna todas las tasks hijas.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_SKILL_ROUTER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- La skill WordPress permanece como router compacto.
- Publicar públicamente exige autorización humana explícita.
- No se inventan nombres físicos de schema/commands antes de TASK-1442.

## Normative Docs

- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`
- `docs/epics/to-do/EPIC-031-glitch-agentic-editorial-pipeline.md`

## Dependencies & Impact

### Depends on

- Discovery validado del sitio público, calendarios Q3/Q4 y `/Users/jreye/Documents/glitch-context/`.

### Blocks / Impacts

- `TASK-1441` a `TASK-1446`.

### Files owned

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
- `docs/operations/glitch/GLITCH_AGENTIC_OPERATING_MODEL_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

## Current Repo State

### Already exists

- ADR Proposed, PDR-003, Content Factory, runbook agentic y bloque Glitch.

### Gap

- Falta aceptación, delta de producto y operating model durable.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `docs/architecture/ y docs/operations/`
- Future candidate home: `remain-shared`
- Boundary: `decisión y protocolo; no runtime`
- Server/browser split: `n/a`
- Build impact: `none`
- Extraction blocker: `none`

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

- Revisar y aceptar o ajustar el ADR Proposed.
- Agregar delta fechado a PDR-003 sin duplicar arquitectura.
- Crear operating model con RACI, estados, gates y Definition of Done.

## Out of Scope

- Código, schema, cron, writes Notion/WordPress o implementación de la skill.

## Detailed Spec

El ADR y el operating model deben nombrar decisiones y fronteras; los nombres físicos de runtime quedan diferidos a TASK-1442.

## Rollout Plan & Risk Matrix

Impact-only: las decisiones aceptadas desbloquean TASK-1441–1446; cualquier cambio de frontera debe reflejarse en esas tasks antes de ejecución.

### Slice ordering hard rule

- ADR aceptado -> delta PDR -> operating model -> sincronización de índices.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ambigüedad de autonomía | editorial/public-site | medium | publish humano como regla dura | review documental |

### Feature flags / cutover

N/A — policy/doc-only, sin runtime.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Policy | Superseder ADR/delta antes de implementación | <1 día | sí |

### Production verification sequence

N/A — revisión manual y linters documentales.

### Out-of-band coordination required

Aprobación del operador sobre ADR y frontera de publicación.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] ADR queda `Accepted` e indexado con campos obligatorios completos.
- [ ] PDR-003 declara cadencia semanal y tipos de Glitch sin duplicar el ADR.
- [ ] Operating model identifica Greenhouse, Notion, Content Factory, WordPress, agente y humano.
- [ ] TASK-1441–1446 siguen alineadas con la decisión aceptada.

## Verification

- `pnpm task:lint --task TASK-1440`
- `pnpm ops:lint --changed`
- Revisión manual contra `ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`.

## Closing Protocol

- [ ] Lifecycle/carpeta/README sincronizados.
- [ ] `docs:closure-check`, changelog y Handoff ejecutados si aplica.
- [ ] DECISIONS_INDEX y PDR indexados.

## Follow-ups

- `TASK-1441` a `TASK-1446`.
