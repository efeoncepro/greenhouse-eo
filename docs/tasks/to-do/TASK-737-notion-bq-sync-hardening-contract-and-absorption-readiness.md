# TASK-737 — `notion-bq-sync` Hardening Contract & Absorption Readiness

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `policy`
- Epic: `EPIC-009`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-736`
- Branch: `task/TASK-737-notion-bq-sync-hardening-readiness`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formaliza el contrato operativo que Greenhouse necesita del repo/servicio hermano `notion-bq-sync` y deja lista la evaluación seria de absorción futura al monorepo, sin ejecutar todavía el cutover.

## Why This Task Exists

El flujo crítico de ICO depende del writer canónico `notion-bq-sync`, pero su source of truth sigue fuera de este repo. La auditoría encontró riesgos de auth, atomicidad y runtime ambiguity. Antes de absorberlo o tocar SDK, hace falta un contrato explícito de operación, seguridad, observabilidad y cutover readiness.

## Goal

- fijar un contrato mínimo exigible al servicio upstream
- definir readiness checklist para absorción futura
- alinear ownership y rollback path

## Architecture Alignment

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`

## Normative Docs

- `docs/audits/notion/notion-bq-sync/NOTION_BQ_SYNC_AUDIT_2026-04-30.md`
- `docs/audits/notion/notion-bq-sync/GREENHOUSE_CONSUMPTION_AUDIT_2026-04-30.md`

## Dependencies & Impact

### Depends on

- repo hermano `cesargrowth11/notion-bigquery`
- docs operativas de integración

### Blocks / Impacts

- decisión de absorción futura
- `TASK-739`

### Files owned

- `docs/architecture/**`
- `docs/operations/**`
- runbooks/contracts relacionados

## Scope

### Slice 1 — Upstream contract

- definir auth, retries, rate-limit handling, atomicidad, observabilidad y data contract mínimos

### Slice 2 — Absorption readiness

- checklist de runtime, secrets, CI/CD, rollback, dual-run y ownership

### Slice 3 — Decision memo

- documentar si la absorción pasa a siguiente ola o queda diferida con condiciones explícitas

## Out of Scope

- mover código del repo hermano en esta task

## Acceptance Criteria

- [ ] existe contrato operativo explícito para el servicio upstream crítico
- [ ] existe readiness checklist seria para una absorción futura
- [ ] se documenta una decisión concreta de siguiente paso, no solo “evaluar después”

## Verification

- revisión documental
- contraste con repo hermano y runtime actual

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si aplica
- [ ] `changelog.md` actualizado si aplica
- [ ] chequeo de impacto cruzado sobre `TASK-736` y `TASK-739`
