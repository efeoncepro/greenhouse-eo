# TASK-617.1 — API Platform REST Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementado y verificado en develop`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-617.1-api-platform-rest-hardening`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Endurecer la lane `api/platform/ecosystem/*` que ya salió en `TASK-616` para que deje de ser solo REST-like y pase a comportarse como una surface RESTful más madura: paginación consistente, status codes uniformes, headers operativos completos, conditional requests selectivas y tests/smokes de runtime más cercanos al consumo real.

## Why This Task Exists

La foundation nueva ya existe, pero la arquitectura también dejó claro que todavía faltan varios componentes para llamar a la platform una REST API madura:

- paginación uniforme
- status codes mutativos/no-mutativos bien definidos
- rate limit headers completos
- `ETag` / `Last-Modified` / conditional requests donde tenga sentido
- tests y smoke coverage más cercanos al runtime

Sin este hardening, Greenhouse corre el riesgo de:

- abrir writes o mobile surfaces sobre una base todavía inconsistente
- documentar un contrato público antes de que esté suficientemente estabilizado
- forzar a los futuros consumers a inferir comportamientos en vez de consumir un contrato claro

## Goal

- Endurecer la semántica REST de `api/platform/ecosystem/*`.
- Dejar headers, paginación y status code policy consistentes para la lane nueva.
- Agregar verificación técnica más cercana al runtime antes de abrir surfaces nuevas como `app` o event control plane.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Esta task endurece `api/platform/ecosystem/*`; no debe reabrir `/api/integrations/v1/*` salvo para checks de no-regresión.
- El hardening debe ser aditivo y no romper los endpoints de `TASK-616`.
- No abrir writes amplios en este corte; la meta es endurecer reads y la disciplina REST base.
- Si un recurso no puede soportar caching/conditional requests sin ambigüedad, documentarlo y no fingirlo.

## Normative Docs

- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `docs/tasks/complete/TASK-616-api-platform-foundation-ecosystem-read-surface-v1.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/**`
- `src/app/api/platform/ecosystem/**`
- `src/app/api/integrations/v1/**`

### Blocks / Impacts

- `TASK-617.2` first-party app surface
- `TASK-617.3` event control plane
- `TASK-617.4` developer documentation portal
- futuros writes ecosystem-facing

### Files owned

- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/**`
- `src/app/api/platform/ecosystem/**`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/documentation/plataforma/api-platform-ecosystem.md`

## Current Repo State

### Already exists

- lane `api/platform/ecosystem/*` con endpoints `context`, `organizations`, `capabilities` e `integration-readiness`
- version negotiation base
- response envelope
- request IDs
- rate limiting base
- tests focalizados de foundation y readers reutilizados

### Gap

- no todas las colecciones exponen paginación con la misma disciplina
- faltan conditional requests y policy clara de freshness donde aplique
- faltan rate-limit headers más completos y uniformes
- la semántica de status codes todavía necesita cerrarse de forma operativa y probada
- faltan route tests/smokes más cercanos al contrato real

## Scope

### Slice 1 — REST contract hardening

- Uniformar paginación/cursors/`meta` en los endpoints de colección del lane `ecosystem`.
- Aplicar la status code policy canónica donde ya corresponda para el carril read-only y dejar preparada la base para writes futuros.
- Completar headers operativos y de rate limiting del carril nuevo.

### Slice 2 — Conditional requests y freshness

- Evaluar e implementar `ETag`, `Last-Modified` o ambos en los resources donde sea seguro.
- Declarar la semántica de frescura/degradación en metadata cuando aplique.
- Evitar caching opaco o comportamiento ambiguo entre serving y readers truth.

### Slice 3 — Runtime verification

- Agregar route tests, contract tests o smokes del lane `api/platform/ecosystem/*`.
- Mantener smoke checks explícitos de no-regresión sobre `/api/integrations/v1/*`.
- Dejar evidencia verificable de que el hardening no rompe los endpoints ya desplegados por `TASK-616`.

### Slice 4 — Docs sync

- Actualizar arquitectura y documentación funcional para reflejar la madurez REST alcanzada.
- Dejar claro qué partes siguen faltando antes de abrir writes o documentación pública más formal.

## Out of Scope

- abrir lane `app`
- converger webhooks/event delivery
- abrir `POST` / `PATCH` amplios
- implementar `MCP`
- replatform completa de readers legacy

## Detailed Spec

El criterio de esta task es simple:

1. primero endurecer la lane `ecosystem`
2. después abrir consumers nuevos (`app`, docs públicas, event control plane)

La task debe cerrar, como mínimo:

- paginación uniforme
- status code policy visible en runtime
- rate-limit headers consistentes
- conditional request policy selectiva
- route/runtime verification más fuerte que la de `TASK-616`

## Acceptance Criteria

- [x] Los endpoints de colección del lane `ecosystem` exponen paginación/metadatos de forma consistente.
- [x] El carril nuevo expone headers operativos y de rate limiting uniformes.
- [x] Existe al menos una implementación segura de conditional requests o una política documentada y explícita de no-aplicación por recurso.
- [x] Existen tests o smokes del lane `api/platform/ecosystem/*` y checks de no-regresión sobre `/api/integrations/v1/*`.
- [x] La documentación funcional y arquitectónica quedó alineada con la madurez REST alcanzada.

## Verification

- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm lint` ✅
- `pnpm test` ✅
- `pnpm build` ✅
- route contract tests de `/api/platform/ecosystem/*` ✅
- no-regression tests de `/api/integrations/v1/*` ✅

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [x] `docs/documentation/plataforma/api-platform-ecosystem.md` quedó actualizada con el contrato final endurecido

## Follow-ups

- `TASK-617.2` — first-party app surface
- `TASK-617.3` — event control plane
- `TASK-617.4` — developer documentation portal
