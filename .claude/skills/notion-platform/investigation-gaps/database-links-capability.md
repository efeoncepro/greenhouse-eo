# Investigation gap — Database links capability — STUB

> **Status**: ABIERTO al 2026-05-17 — Notion mentioned briefly in announcements
> **Next review trigger**: Notion publish detail spec, o emerge use case Greenhouse
> **Last verified**: 2026-05-17

## Context

Notion has historically had "linked databases" feature in UI (view de un database compartido en otro page). Post Developer Platform 2026 launch, "Database links" mentioned as separate concept from `relation` properties.

Questions abiertas:
1. ¿Cuál es la diferencia exacta entre "Database links" y `relation` properties?
2. ¿Existen API endpoints para crear/listar/borrar database links?
3. ¿Webhooks dispara cuando linked database referenced cambia?
4. ¿Permisos cascadan a través de links?
5. ¿Multi-workspace links supported? (Federated workspaces?)
6. ¿Use cases canonical recommended (cross-team sharing, etc.)?

## Posible relevancia Greenhouse

Si database links habilitan algún caso de uso no posible con relations hoy:
- Cross-tenant shared views (Efeonce dashboards leyendo Sky data sin duplicar)
- Multi-workspace federation (Greenhouse workspace separado por tenant)
- Read-only views para clientes externos

Acción canonical: investigation pasiva. Quote en este archivo cualquier discovery durante design sessions.

## Cross-refs

- `api-reference/data-model.md` — relations + parent types
- `developer-platform-2026/data-sources-vs-databases.md` — database vs data source distinction
- TASK-879 (Greenhouse) — readiness eval
