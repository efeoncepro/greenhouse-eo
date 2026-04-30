# TASK-734 — ICO Materialization Concurrency, Idempotency & AI Isolation Hardening

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-009`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `task/TASK-734-ico-materialization-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurece la corrida de materialización ICO para que no dependa de `DELETE + INSERT` sin exclusión mutua, no mezcle generaciones parciales y aísle la lane AI de la métrica base.

## Why This Task Exists

Hoy cron, runs manuales y reconcile pueden solaparse sin lock fuerte. Además la lane AI puede vaciar o romper una corrida base ya comprometida. Eso es demasiado riesgoso para un motor que termina impactando payroll y reliquidación.

## Goal

- lock/lease de corrida
- atomicidad lógica por generación
- lane AI desacoplada y degradable sin romper base

## Architecture Alignment

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/ai/materialize-ai-signals.ts`
- `src/app/api/cron/ico-materialize/route.ts`

### Blocks / Impacts

- `TASK-733`
- confiabilidad de readers y signals ICO

### Files owned

- `src/lib/ico-engine/**`
- `src/app/api/cron/ico-materialize/**`

## Current Repo State

### Already exists

- cron/materialize funcionales
- lane AI ya integrada al flujo

### Gap

- sin run lock
- sin semántica clara de generación
- lane AI demasiado acoplada al éxito de base

## Scope

### Slice 1 — Run control

- introducir lease/lock para evitar solapes
- registrar estado de corrida y generation id

### Slice 2 — Atomicity and idempotency

- reducir o encapsular `DELETE + INSERT`
- endurecer publicación de eventos y replays

### Slice 3 — AI isolation

- mover AI a carril degradable que no invalide la métrica base cuando falla

## Out of Scope

- rediseñar consumers UI

## Acceptance Criteria

- [ ] dos corridas del mismo período no pueden solaparse sin control
- [ ] una falla de AI no deja inconsistente la métrica base
- [ ] readers no quedan expuestos a generaciones parciales

## Verification

- `pnpm lint`
- `pnpm test`
- smoke manual de corridas concurrentes/controladas

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si aplica
- [ ] `changelog.md` actualizado si aplica
- [ ] chequeo de impacto cruzado sobre `TASK-733` y `TASK-735`
