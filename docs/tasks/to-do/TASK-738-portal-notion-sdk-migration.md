# TASK-738 — Portal Notion SDK Migration

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-009`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-736`, `TASK-879`
- Branch: `task/TASK-738-portal-notion-sdk-migration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Migra los usos directos de Notion dentro de `greenhouse-eo` al SDK oficial `@notionhq/client`, manteniendo el secreto actual y sin mezclar este trabajo con el carril crítico de ingestión hacia ICO.

Delta 2026-05-14: esta task ya no debe tratar el SDK como la unica modernizacion del portal. `TASK-879` debe definir si el adapter SDK convive con `ntn api`, Workers o un boundary Worker/SDK mixto.

## Why This Task Exists

El portal hoy usa un wrapper manual con `fetch` y header fijo `2022-06-28`. El SDK oficial aporta retries, paginación, errores tipados y mejor mantenibilidad. Pero su prioridad es posterior al hardening de payroll/ICO porque no ataca el riesgo crítico principal.

## Goal

- reemplazar el wrapper manual del portal por el SDK
- mantener compatibilidad funcional y secret actual
- dejar el carril preparado para modernización futura de API
- preservar compatibilidad con la decision de `TASK-879` sobre CLI/Workers antes de instalar dependencias o mover wrappers

## Architecture Alignment

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/space-notion/notion-client.ts`
- `src/lib/space-notion/notion-performance-report-publication.ts`
- `src/lib/space-notion/notion-governance.ts`
- `TASK-879` para definir si el SDK adapter se implementa antes, despues o junto a un Worker pilot

### Blocks / Impacts

- `TASK-739`
- portal Notion direct calls used by `TASK-879` inventory

### Files owned

- `src/lib/space-notion/**`
- `src/lib/identity/reconciliation/notion-users.ts` si Plan Mode decide incluir users.list en el adapter comun
- `package.json`

## Scope

### Slice 1 — SDK adapter

- introducir cliente SDK y capa de compatibilidad
- comparar `@notionhq/client` contra `ntn api`/Workers segun decision de `TASK-879`

### Slice 2 — Publication and governance

- migrar publication/governance directos del portal

### Slice 3 — Cleanup

- retirar wrapper legacy o dejarlo deprecated con boundary claro

## Out of Scope

- absorber `notion-bq-sync`
- cambiar OAuth/secrets por defecto
- desplegar Notion Workers o cambiar production ingestion; eso vive en `TASK-879`/follow-ups

## Acceptance Criteria

- [ ] el portal deja de usar el wrapper `fetch` manual como path principal
- [ ] publication y governance directos funcionan con SDK
- [ ] el secreto actual puede seguir usándose sin rediseño inmediato
- [ ] el adapter resultante no contradice la decision de `TASK-879`

## Verification

- `pnpm lint`
- `pnpm test`
- smoke manual de publication/governance Notion

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si aplica
- [ ] `changelog.md` actualizado si aplica
- [ ] chequeo de impacto cruzado sobre `TASK-739` y `TASK-879`
