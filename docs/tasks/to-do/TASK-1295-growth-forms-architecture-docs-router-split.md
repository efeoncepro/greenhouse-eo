# TASK-1295 — Growth Forms architecture docs router split

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Backlog documental`
- Rank: `TBD`
- Domain: `growth|architecture|docs`
- Blocked by: `none`
- Branch: `task/TASK-1295-growth-forms-architecture-docs-router-split`

## Summary

Separar `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` en un router corto + docs tematicos vigentes + `HISTORIAL.md`, para que la arquitectura de Growth Forms deje de crecer como un changelog append-only.

## Why This Task Exists

`pnpm docs:closure-check` marca `architecture_doc_monolith`: el documento de arquitectura de Growth Forms ya mezcla estado vigente con deltas por task. Eso aumenta costo cognitivo para agentes y hace mas probable que una decision actual quede escondida entre historia.

## Goal

- Mantener links existentes con un router/stub canonico.
- Extraer estado vigente a docs tematicos leibles por dominio.
- Mover cronologia de `## Delta YYYY-MM-DD` a `HISTORIAL.md`.
- Actualizar referencias sin perder memoria operacional.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No borrar historia: moverla a `HISTORIAL.md` o dejar links.
- No hacer split mecanico solamente: el estado vigente debe quedar integrado en docs tematicos.
- El archivo actual debe seguir existiendo como router para no romper referencias.

## Normative Docs

- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `project_context.md`

## Dependencies & Impact

### Depends on

- TASK-1294 complete, porque el renderer Turnstile parity ya es parte del estado vigente.

### Blocks / Impacts

- Futuras tasks de Growth Forms y landings publicas que necesiten leer arquitectura sin cargar cronologia completa.
- `pnpm docs:closure-check`, que hoy mantiene warning `architecture_doc_monolith`.

### Files owned

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/growth-public-forms/README.md`
- `docs/architecture/growth-public-forms/HISTORIAL.md`
- `docs/architecture/growth-public-forms/*.md`
- Docs secundarios que enlacen al monolito.

## Current Repo State

### Already exists

- Un documento aceptado y rico en contenido: `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`.
- Docs operativas separadas: `growth-public-forms-runtime-contract.md`, manuales y documentacion funcional.

### Gap

- El doc principal contiene multiples secciones `## Delta YYYY-MM-DD`.
- Las decisiones vigentes de renderer, public API, HubSpot, seguridad y operaciones no estan separadas de la cronologia.
- `docs:closure-check` advierte que el archivo se esta convirtiendo en monolito append-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Router y mapa tematico

- Convertir el doc actual en router corto que preserve frontmatter, owner, ADR y links.
- Crear `docs/architecture/growth-public-forms/README.md` con mapa de lectura por tarea.

### Slice 2 — Docs tematicos vigentes

- Extraer estado vigente a docs tematicos: domain model, renderer contract, public API, HubSpot destination, security/privacy/abuse, operations/reliability.
- Integrar deltas vigentes como contenido actual, no como cronologia.

### Slice 3 — Historial y referencias

- Mover deltas por TASK a `HISTORIAL.md`.
- Actualizar links en docs/manuales/skills/project_context sin duplicar decisiones.

## Out of Scope

- Cambios runtime, DB, APIs, renderer o WordPress.
- Reescribir la ADR aceptada salvo links de referencia.
- Resolver todos los docs monoliticos del repo; esta task es solo Growth Forms.

## Detailed Spec

Estructura objetivo sugerida:

```text
docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md
docs/architecture/growth-public-forms/README.md
docs/architecture/growth-public-forms/domain-model.md
docs/architecture/growth-public-forms/renderer-contract.md
docs/architecture/growth-public-forms/public-api.md
docs/architecture/growth-public-forms/destination-hubspot.md
docs/architecture/growth-public-forms/security-privacy-abuse.md
docs/architecture/growth-public-forms/operations-reliability.md
docs/architecture/growth-public-forms/HISTORIAL.md
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 router before moving content.
- Slice 2 thematic docs before Slice 3 link updates.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Perder una decision vigente al mover deltas | docs/architecture | medium | diff review contra headings originales + rg de TASK IDs | docs review |
| Romper links existentes | docs | medium | mantener router y correr rg/link checks proporcionales | docs:closure-check |

### Feature flags / cutover

N/A — docs-only.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert docs | <10 min | si |
| Slice 2 | revert docs | <10 min | si |
| Slice 3 | revert docs | <10 min | si |

### Production verification sequence

N/A — no runtime.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El archivo original queda como router corto y sigue existiendo.
- [ ] El estado vigente de Growth Forms queda en docs tematicos bajo `docs/architecture/growth-public-forms/`.
- [ ] Los deltas historicos quedan en `HISTORIAL.md` sin perdida de TASK IDs.
- [ ] Referencias operativas principales apuntan al router o al doc tematico correcto.
- [ ] `pnpm docs:closure-check` deja de marcar `architecture_doc_monolith` para Growth Forms, o documenta una razon residual concreta.

## Verification

- `pnpm docs:closure-check`
- `pnpm docs:context-check`
- `rg -n "GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1|growth-public-forms" docs .codex .claude project_context.md`
- `git diff --check`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real.
- [ ] archivo movido a `complete/` si se cierra.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [ ] `Handoff.md` actualizado.
- [ ] `changelog.md` actualizado si cambia workflow documental.

## Follow-ups

- Aplicar el mismo patron a otros docs que `docs:closure-check` marque como monolitos.

## Open Questions

- Ninguna.
