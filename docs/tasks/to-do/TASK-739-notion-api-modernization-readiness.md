# TASK-739 — Notion API Modernization Readiness

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `policy`
- Epic: `EPIC-009`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-737`, `TASK-738`, `TASK-879`
- Branch: `task/TASK-739-notion-api-modernization-readiness`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Prepara el salto ordenado desde la versión legacy de API Notion (`2022-06-28`, `databases`) al modelo moderno (`data sources` y endpoints nuevos), contrastando tanto el portal como el servicio upstream crítico.

Delta 2026-05-14: la modernizacion debe incluir los nuevos contracts de Notion Developer Platform. `TASK-879` aporta evidencia sobre `ntn`, Workers, Worker syncs, agent tools y External Agents API antes de fijar la secuencia final.

## Why This Task Exists

El repo del portal y `notion-bq-sync` siguen anclados a la API legacy. Eso no exige migración inmediata si primero estabilizamos el carril crítico, pero sí requiere readiness seria para no quedar bloqueados por deprecations futuras.

## Goal

- mapear dónde seguimos usando la API legacy
- definir gap exacto hacia `data sources`
- proponer secuencia segura de migración sin romper ICO
- incluir Notion Workers/CLI/API platform primitives en el gap analysis, no solo `databases -> data sources`

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-737`
- `TASK-738`
- `TASK-879`
- repo hermano `notion-bq-sync`

### Blocks / Impacts

- siguiente ola de modernización Notion

### Files owned

- `docs/architecture/**`
- `docs/operations/**`
- `src/lib/space-notion/**`

## Scope

### Slice 1 — Legacy surface map

- inventariar endpoints/versiones legacy en portal y upstream
- incluir `ntn`, Workers, Worker syncs y agent tools como superficies nuevas a contrastar

### Slice 2 — Gap analysis

- contrastar contracts actuales contra `data sources`
- declarar que partes del carril critico no deben moverse a API moderna hasta tener shadow/parity

### Slice 3 — Safe migration sequence

- definir orden, rollback y pruebas de compatibilidad
- secuenciar SDK/Workers/CLI con el hardening previo de `TASK-736/737`

## Out of Scope

- ejecutar la migración completa en esta task
- adoptar External Agents API como dependencia production mientras siga alpha/waitlist

## Acceptance Criteria

- [ ] existe mapa explícito de uso legacy en portal y upstream
- [ ] existe gap analysis hacia `data sources`
- [ ] existe secuencia segura y verificable de migración futura
- [ ] la secuencia futura incorpora o descarta formalmente las primitives evaluadas por `TASK-879`

## Verification

- revisión documental y técnica
- contraste con código real del portal y del repo hermano

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si aplica
- [ ] `changelog.md` actualizado si aplica
- [ ] chequeo de impacto cruzado sobre `TASK-737`, `TASK-738` y `TASK-879`
