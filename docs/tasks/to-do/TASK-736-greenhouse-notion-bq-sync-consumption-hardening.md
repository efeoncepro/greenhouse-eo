# TASK-736 — Greenhouse Consumption Hardening for `notion-bq-sync`

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-009`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-879` para decisiones que cambien runtime/topologia; slices de hardening interno pueden prepararse en paralelo sin cutover
- Branch: `task/TASK-736-greenhouse-notion-consumption-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reduce el acople frágil de `greenhouse-eo` con `notion-bq-sync`: hardening de discovery/register/governance, menos readers directos a `notion_ops` y mejores contracts para freshness/health del upstream.

Delta 2026-05-14: esta task debe consumir `TASK-879` antes de decidir si discovery/register/governance siguen dependiendo del sibling endurecido, se absorben parcialmente al portal o se apoyan en Notion Developer Platform (`ntn`, SDK, Workers) para algun carril.

## Why This Task Exists

La auditoría de consumo mostró que Greenhouse depende del servicio externo en varios planos a la vez: admin/discovery, register/verification, governance, sync-conformed y algunos consumers raw. Para un pipeline que termina afectando ICO, ese acople necesita mejores boundaries antes de pensar en SDK.

## Goal

- endurecer los contratos internos que dependen de `notion-bq-sync`
- reducir lectura raw de `notion_ops` fuera del carril canónico
- mejorar observabilidad del upstream desde Greenhouse
- incorporar la decision de `TASK-879` sobre si Notion Workers/CLI cambian el boundary admin/discovery

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`

## Normative Docs

- `docs/audits/notion/notion-bq-sync/GREENHOUSE_CONSUMPTION_AUDIT_2026-04-30.md`
- `docs/tasks/to-do/TASK-879-notion-developer-platform-readiness-worker-pilot.md`

## Dependencies & Impact

### Depends on

- `TASK-879` para cualquier cambio de runtime/topologia Notion; hardening local puede avanzar sin cutover
- `src/app/api/integrations/notion/discover/route.ts`
- `src/app/api/integrations/notion/register/route.ts`
- `src/lib/sync/sync-notion-conformed.ts`
- `src/lib/space-notion/**`

### Blocks / Impacts

- `TASK-737`
- `TASK-738`
- `TASK-879`
- onboarding/admin Notion

### Files owned

- `src/app/api/integrations/notion/**`
- `src/lib/sync/**`
- `src/lib/space-notion/**`

## Scope

### Slice 1 — Contract hardening

- normalizar errores, freshness y health surface del upstream
- comparar el contract actual contra la alternativa documentada por `TASK-879` antes de fijar endpoint definitivo

### Slice 2 — Raw reader reduction

- inventariar y reducir consumers directos de `notion_ops` fuera del carril canónico

### Slice 3 — Admin/governance hardening

- endurecer `discover`, `sample`, `register` y verificaciones relacionadas
- declarar si estas rutas siguen proxyando el sibling, migran al SDK local o quedan listas para una opcion Worker/mixta

## Out of Scope

- absorber de inmediato `notion-bq-sync`
- migrar todavía al SDK oficial
- migrar production ingestion a Notion Workers; eso requiere follow-up posterior a `TASK-879`

## Acceptance Criteria

- [ ] Greenhouse depende menos de readers raw y más de contracts claros del upstream
- [ ] admin/discovery/register exponen errores y estados operativos más robustos
- [ ] existe una lectura más explícita de salud/freshness del pipeline upstream
- [ ] el diseño final referencia explicitamente el resultado de `TASK-879`

## Verification

- `pnpm lint`
- `pnpm test`
- smoke manual de discovery/register + sync conformed

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si aplica
- [ ] `changelog.md` actualizado si aplica
- [ ] chequeo de impacto cruzado sobre `TASK-737`, `TASK-738` y `TASK-879`
