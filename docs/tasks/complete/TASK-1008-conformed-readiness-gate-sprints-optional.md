# TASK-1008 — conformed readiness gate: `sprints` (y `revisiones`) opcionales para clientes de contenido

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (todo cliente de contenido sin sprints queda invisible en el portal hasta meter un sprint postizo)
- Effort: `Bajo`
- Type: `implementation`
- Epic: `EPIC-CLIENT-360`
- Domain: `integrations.notion|infra`
- Blocked by: `none`
- Blocks: `none` (recomendado antes del próximo onboarding de cliente de contenido)
- Branch: `develop` (greenhouse-eo)

## Summary

El gate de readiness del conformed (`evaluateNotionRawFreshnessGate` en [notion-readiness.ts](../../../src/lib/integrations/notion-readiness.ts)) marca un space **no ready** si le falta filas en CUALQUIERA de las tres DBs: `tareas` **AND** `proyectos` **AND** `sprints`. Berel (cliente de **contenido**, flujo "Content Hub", no sprint-based) tenía 80 tareas + 4 proyectos pero **0 sprints** → marcado no-ready → el conformed lo saltó entero → 0 tareas en el portal. Se desbloqueó agregando 1 sprint a mano. **Eso se repite con cada cliente de contenido.** Fix robusto: `tareas + proyectos` son requeridos (núcleo de delivery); `sprints` y `revisiones` son **dimensiones opcionales** — su ausencia no bloquea.

## Why This Task Exists

El gate asume que todo space usa las 3 DBs (forma Efeonce/Sky). Es una suposición Efeonce/Sky-shaped que no escala a clientes de contenido. Sin este fix, cada cliente de contenido nuevo repite el "meter un sprint postizo" — un parche que hay que mantener para siempre (si el cliente borra sus sprints, vuelve a desaparecer del portal). La solución es relajar el gate a los objetos mínimos de delivery.

## Architecture Alignment

- Validado conceptualmente con arch-architect (sesión 2026-06-04): el conformed transform ya lee `sprints` con `WHERE notion_page_id IS NOT NULL` → para un space con 0 sprints produce 0 filas de sprint sin error; tareas/proyectos fluyen igual.
- Respetar dual-store (PG-first), reliability signals.
- CLAUDE.md → "Notion sync canónico", Solution Quality Contract.

## Goal

- Un space con `tareas>0 AND proyectos>0` es **ready**, aunque tenga 0 sprints / 0 revisiones.
- El staleness check de sprints/revisiones solo aplica **si el space tiene esas filas** (no exigir frescura de algo que no existe).
- Efeonce/Sky: **bit-for-bit** (tienen las 3 → siguen ready).
- Ningún cliente de contenido futuro necesita sprint postizo.

## Slices

- **Slice 1** — `evaluateNotionRawFreshnessGate`: mover sprints/revisiones de "requeridos" a "opcionales". `ready = taskRowCount>0 AND projectRowCount>0 AND maxTaskSyncedAt fresh AND maxProjectSyncedAt fresh`. Para sprints/revisiones: solo si `rowCount>0`, validar frescura; si `rowCount===0`, NO agregar reason. Tests anti-regresión (space con 0 sprints → ready; space con sprints stale → not ready; Efeonce/Sky con 3 → ready).
- **Slice 2** — verificar el mirror del gate en `writableSpaceIds`/`readRawConformedFreshnessBySpace` ([sync-notion-conformed.ts](../../../src/lib/sync/sync-notion-conformed.ts):1054) — que no re-imponga la regla de sprints por otro lado.
- **Slice 3** — (opcional) reliability signal info `integrations.notion.space_without_sprints` (no error — solo visibilidad de qué spaces son content-only). Evaluar si aporta o es ruido.

## Definition of Done

- [x] Gate relajado en `evaluateNotionRawFreshnessGate` (`tareas`+`proyectos` requeridos; `sprints` opcional, frescura solo si `rowCount>0`).
- [x] Slice 2 verificado: el mirror `writableSpaceIds`/`isSpaceFreshEnough` (sync-notion-conformed) NO re-impone sprints — el gate vivía solo aquí.
- [x] Tests anti-regresión: 4 casos (todos frescos→ready; core stale sin reason de sprints; **cliente de contenido 0 sprints→ready**; sprints presentes+stale→not ready).
- [x] Efeonce/Sky bit-for-bit (test #1, las 3 DBs frescas → ready).
- [x] Blast radius verde (`notion-readiness` + `notion-sync-freshness` + `sync-bq-conformed` + `title-cascade` = 20 tests), tsc 0, lint 0.
- [x] Lifecycle → complete, registros + Handoff.

## Cierre (2026-06-04)

- Cambio en [notion-readiness.ts](../../../src/lib/integrations/notion-readiness.ts) `evaluateNotionRawFreshnessGate`. La regla de sprints vivía **solo** ahí (verificado: `isSpaceFreshEnough` no la re-impone).
- Verificación del caso 0-sprints via unit test (test #3 reproduce el escenario exacto Berel: 80 tareas + 4 proyectos + 0 sprints → ready). Berel hoy tiene 1 sprint (lo agregamos antes de este fix), así que la verificación live del 0-sprint la cubre el test; el próximo cliente de contenido sin sprints la valida operativamente sin sprint postizo.
- Efeonce/Sky no se tocan (tienen las 3 DBs → siguen ready).

## Hard rules

- **NUNCA** exigir frescura de una dimensión (sprints/revisiones) que el space no tiene. `rowCount===0` ⇒ no es reason.
- **NUNCA** relajar `tareas`/`proyectos` — son el núcleo mínimo de delivery; sin ellos no hay nada que materializar.
- **SIEMPRE** mantener Efeonce/Sky bit-for-bit (tienen las 3).

## Out of Scope

- Hacer la dimensionalidad config-driven por `space_notion_sources` (qué DBs declara cada cliente) — over-engineering hasta que aparezca un cliente con forma distinta a "tareas+proyectos+[sprints]+[revisiones]".
