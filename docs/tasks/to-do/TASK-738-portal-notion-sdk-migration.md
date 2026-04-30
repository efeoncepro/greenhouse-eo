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
- Blocked by: `TASK-736`
- Branch: `task/TASK-738-portal-notion-sdk-migration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Migra los usos directos de Notion dentro de `greenhouse-eo` al SDK oficial `@notionhq/client`, manteniendo el secreto actual y sin mezclar este trabajo con el carril crítico de ingestión hacia ICO.

## Why This Task Exists

El portal hoy usa un wrapper manual con `fetch` y header fijo `2022-06-28`. El SDK oficial aporta retries, paginación, errores tipados y mejor mantenibilidad. Pero su prioridad es posterior al hardening de payroll/ICO porque no ataca el riesgo crítico principal.

## Goal

- reemplazar el wrapper manual del portal por el SDK
- mantener compatibilidad funcional y secret actual
- dejar el carril preparado para modernización futura de API

## Architecture Alignment

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/space-notion/notion-client.ts`
- `src/lib/space-notion/notion-performance-report-publication.ts`
- `src/lib/space-notion/notion-governance.ts`

### Blocks / Impacts

- `TASK-739`

### Files owned

- `src/lib/space-notion/**`
- `package.json`

## Scope

### Slice 1 — SDK adapter

- introducir cliente SDK y capa de compatibilidad

### Slice 2 — Publication and governance

- migrar publication/governance directos del portal

### Slice 3 — Cleanup

- retirar wrapper legacy o dejarlo deprecated con boundary claro

## Out of Scope

- absorber `notion-bq-sync`
- cambiar OAuth/secrets por defecto

## Acceptance Criteria

- [ ] el portal deja de usar el wrapper `fetch` manual como path principal
- [ ] publication y governance directos funcionan con SDK
- [ ] el secreto actual puede seguir usándose sin rediseño inmediato

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
- [ ] chequeo de impacto cruzado sobre `TASK-739`
