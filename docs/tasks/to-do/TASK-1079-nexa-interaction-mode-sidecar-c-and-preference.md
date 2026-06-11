# TASK-1079 — Nexa interaction-mode: lane sidecar (concepto C) + preferencia de modo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Deferred-but-committed`
- Rank: `TBD`
- Domain: `ui|delivery|identity`
- Blocked by: `TASK-1078`
- Branch: `task/TASK-1079-nexa-interaction-mode`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Producir el **concepto C (lane sidecar full-height)** del `product-design-loop` de Nexa y exponer una **preferencia user-facing de "modo de interacción con Nexa"**: el usuario final elige cómo conversar con Nexa — dock compacto (A), panel expandible (B, TASK-1078) o lane sidecar full-height (C). C mapea a `AdaptiveSidecarLayout` + `ContextualSidecar` (primitive canónica): desktop = lane in-flow `role=complementary` junto al contexto de la página; mobile/tablet = Drawer temporal.

## Why This Task Exists

Decisión del operador (2026-06-11, durante el `product-design-loop`): el chat de Nexa no tiene un único form-factor correcto — depende de cómo trabaja la persona. Un dock compacto sirve para preguntas rápidas; un lane sidecar persistente sirve para trabajar CON el contexto de la página abierto. En vez de imponer uno, dar la **elección**. C se preserva como **deferred-but-committed**: se produce DESPUÉS de cerrar B (TASK-1078), reusando el shell + persistencia que B deja listos.

## Goal

- Producir el shell C (lane sidecar full-height) reusando `AdaptiveSidecarLayout` + `ContextualSidecar` + `NexaThread` + la persistencia adoptada en TASK-1078.
- Preferencia de modo de interacción (dock A / expandible B / lane C) persistida por usuario, con default sensato.
- Las 3 modalidades comparten runtime, persistencia, historial y selector de modelo (cero forks de lógica de chat).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `CLAUDE.md` → "Patron canonico Adaptive Sidecar (TASK-1028)", "Elevation / Shadow tokens", "Home Rollout Flag Platform (TASK-780)" (patrón para la preferencia persistida).
- `docs/architecture/ui-platform/PRIMITIVES.md` (`AdaptiveSidecarLayout`, `ContextualSidecar`).

Reglas obligatorias:

- C es un **lane in-flow** (`role=complementary`, NO `aria-modal`), NO un panel flotante ni un `Dialog`. Desktop lane / mobile Drawer (lo resuelve `AdaptiveSidecarLayout`).
- Reuse de TASK-1078: runtime persistente, `NexaThreadSidebar`, `NexaThread`, `NexaModelSelector`. Cero lógica de chat paralela por modo.
- La preferencia de modo sigue el patrón de flags/preferencias persistidas (NO env var binaria) — ver `Home Rollout Flag Platform` / preferencia per-usuario.

## Normative Docs

- `docs/tasks/to-do/TASK-1078-nexa-floating-chat-expandable-persisted.md` (foundation: shell + persistencia que C reusa).
- Conceptos IA del loop: `.captures/concepts/nexa-floating-chat/concept-c-sidecar-lane.png` (+ a/b). Gitignored — intención, no valores literales.

## Dependencies & Impact

### Depends on

- **TASK-1078** (B + adopción de persistencia + extracción del runtime reusable). C reusa todo eso.
- `AdaptiveSidecarLayout` + `ContextualSidecar` (`src/components/greenhouse/primitives/`).

### Blocks / Impacts

- Cierra la elección "modo de interacción con Nexa" iniciada en el loop 2026-06-11.

### Files owned

- `src/components/greenhouse/NexaFloatingButton.tsx` (o el shell que TASK-1078 deje) — agregar modo `lane`.
- Preferencia de modo: `[verificar]` store de preferencias per-usuario.
- `src/app/(dashboard)/nexa/.../mockup/*` + scenarios GVC para C.

## Current Repo State

### Already exists

- Primitive `AdaptiveSidecarLayout` + `ContextualSidecar` (TASK-1028) — el patrón canónico exacto para C.
- Concepto C generado: `.captures/concepts/nexa-floating-chat/concept-c-sidecar-lane.png`.
- (Post TASK-1078) shell + persistencia + historial + runtime reusable.

### Gap

- C no implementada.
- No existe preferencia user-facing de modo de interacción con Nexa.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Mockup del lane C + GVC

- Mockup tokenizado del lane sidecar full-height con `AdaptiveSidecarLayout` + `ContextualSidecar`, reusando `NexaThread` + historial. Desktop lane + mobile Drawer. GVC desktop+mobile.

### Slice 2 — Modo `lane` en el shell de Nexa

- Agregar el modo `lane` al shell (compacto A / expandible B / lane C comparten runtime + persistencia).

### Slice 3 — Preferencia de modo de interacción

- Preferencia per-usuario (dock/expandible/lane) persistida + UI de selección + default sensato + degradación honesta. Patrón de preferencia persistida (no env binaria).

## Out of Scope

- Backend de persistencia de chat (ya existe; lo reusa).
- Rediseño del motor de respuesta de Nexa.

## Detailed Spec

Concepto C: lane derecho full-height junto al dashboard **que queda 100% visible** (split, no atenuado), header de lane con presencia + selector de modelo + pin/close, thread a toda altura, composer pinned abajo. Referencia: `concept-c-sidecar-lane.png` (intención). Primitive: `AdaptiveSidecarLayout` + `ContextualSidecar`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Bloqueada por TASK-1078 (necesita el runtime reusable + persistencia adoptados). Slice 1 (mockup) → Slice 2 (modo lane) → Slice 3 (preferencia).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El lane in-flow rompe el layout de páginas | UI | medium | `AdaptiveSidecarLayout` ya resuelve el reflow; GVC por ruta | GVC `quality.layout` |
| Preferencia de modo mal scopeada por usuario | identity | low | patrón de preferencia persistida per-usuario + default | (sin signal — emerge en inspección) |

### Feature flags / cutover

- Preferencia persistida per-usuario (default = el modo de TASK-1078). Additive. Revert: default al modo previo.

### Rollback plan per slice

| Slice | Rollback | Reversible? |
|---|---|---|
| 1 (mockup) | borrar route | sí |
| 2 (modo lane) | quitar opción lane del selector | sí |
| 3 (preferencia) | forzar default | sí |

### Production verification sequence

- GVC lane desktop+mobile verde; preferencia persiste por usuario; las 3 modalidades comparten historial.

### Out-of-band coordination required

- Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El lane C usa `AdaptiveSidecarLayout`+`ContextualSidecar` (no un panel flotante ni `Dialog`); desktop lane `role=complementary`, mobile Drawer.
- [ ] Las 3 modalidades (A/B/C) comparten runtime, persistencia, historial y selector de modelo — cero lógica de chat duplicada.
- [ ] La preferencia de modo persiste por usuario, con default sensato y degradación honesta.
- [ ] Evidencia GVC desktop+mobile del lane mirada.

## Verification

- `pnpm local:check:ui` + `pnpm fe:capture` (lane desktop+mobile) + gates `quality.*`.

## Closing Protocol

- Mover a `complete/`, `Lifecycle: complete`, sincronizar `docs/tasks/README.md`, invocar `greenhouse-documentation-governor`.

## Follow-ups

- Ninguna prevista (cierra la elección de modo de interacción con Nexa).
