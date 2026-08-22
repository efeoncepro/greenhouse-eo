# TASK-1763 — Hiring Capacity Closure Confirmation Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1763 — Hiring Capacity Closure Preview and Confirmation Flow`
- Related wireframe: `docs/ui/wireframes/TASK-1763-hiring-capacity-closure-confirmation.md`
- Intended route / surface: `/agency/hiring/applications/[applicationId]`
- Flow type: `command-backed`
- Primary primitives: `Dialog, GreenhouseButton, state surfaces`
- Copy source: `src/lib/copy/dictionaries/*/hiringDesk.ts`

## Flow Brief

- Primary user: Talent/People autorizado.
- Entry moment: una decisión selected acaba de persistirse y completa capacidad.
- Successful outcome: run confirmado y status observable, sin duplicados.
- Primary decision/action: cerrar vacante y notificar a N.
- Non-goals: auto-cierre, rollback de selección, edición de capacidad.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
| --- | --- | --- | --- | --- |
| Application 360 | contexto/decisión | conserva hero/tab | fondo no interactivo | HiringDeskFrame |
| Decision dialog | registra decisión individual | modal actual | full-width | Dialog |
| Capacity closure dialog | preview/confirm/status | modal segundo paso | single-plane/full-screen | Dialog + state surface |

## Flow Map

1. Entry: operador registra `selected` por el command actual.
2. Primary action: respuesta/readback indica `capacityClosureAvailable`.
3. Transition: UI solicita preview TASK-1762 y abre segundo dialog.
4. User decision: revisa el desenlace y la causa que se van a registrar y las categorías; incluye explícitamente backup/hold; confirma o elige `Ahora no`.
5. Completion: confirm crea run; UI muestra status real `running|completed|partial_failed`.
6. Recovery / exit: stale refresca preview; cancel preserva selección; partial reintenta sólo pendientes.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
| --- | --- | --- | --- | --- |
| selección persistida + available | decision response | preview loading | n/a | no auto-confirm |
| preview ready | reader | dialog ready | focus title | announce N, desenlace y causa |
| confirm | button | pending/status | Enter/Space | actor + digest |
| cancel/Escape | dialog | Application 360 | Escape | sólo antes de submit |
| stale | confirm error | refresh required | button | no side effects |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
| --- | --- | --- | --- | --- |
| closed | dialog ausente | default/cancel | available | selección permanece |
| opening | solicita preview | available | ready/error | feedback explícito |
| open | preview fresco | reader success | confirm/cancel | N, categorías y el desenlace + causa que se escribirán (`not_selected` / `capacity_filled`) |
| loading | confirm pending | primary CTA | status/error | CTA/close disabled |
| error | preview/confirm falló | sanitized error | retry/cancel | no false rollback |
| dirty | backup/hold cambia | operator toggle | refresh/confirm | effect digest local no autoritativo |
| complete | run terminal | status read | close | counts reales |

## Routing Contract

- Route changes: `none`.
- Canonical URL: application exacta.
- Deep-link behavior: no se deep-linkea un preview efímero.
- Back button behavior: no cambia ruta; dialog maneja cierre.
- Reload behavior: status reader recupera run vigente desde la application/opening.
- Shareability: no aplica; datos internos/capability-gated.

## Focus & Accessibility

- Initial focus: título/resumen del segundo dialog.
- Escape behavior: cierra antes de submit; bloqueado en pending.
- Click-away behavior: igual que Escape.
- Focus restore: botón `Decidir` o CTA que abrió el flujo.
- Modal vs non-modal semantics: modal por efecto irreversible.
- Screen reader announcement: N, categorías y cambio de status con live region acotada.
- Keyboard traversal: orden título → categorías → cancel → confirm.
- Reduced motion: mismo estado y foco sin transición.

## Data & Command Boundaries

- Readers: TASK-1762 preview/status.
- Commands: TASK-1762 confirm; decisión individual existente.
- API routes: adapters thin definidos por TASK-1762.
- Optimistic updates: ninguno para decisión/cierre/email.
- Cache / invalidation: re-read tras decisión, confirm y terminalidad.
- Audit / signals: server-side; UI muestra correlation/run ID sólo si es seguro y útil para soporte.
- Tenant / access boundary: capabilities server-resolved; opening se deriva de application.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
| --- | --- | --- | --- |
| denied | explica permiso insuficiente | cerrar | selección preservada |
| not found / empty | no hay otros destinatarios | cerrar opening si command lo permite | no inventar N |
| partial / degraded | counts procesados/pendientes/fallidos | reintentar pendientes | persistente |
| stale data | preview cambió | volver a revisar | confirm original no se aplica |
| timeout / API error | resultado incierto | status readback antes de retry | no repetir a ciegas |
| dirty exit | hay toggles locales | descartar cambios visuales | no hay write aún |

## GVC Scenario Plan

- Scenario: `task-1763-hiring-capacity-closure`.
- Scenario file: `src/lib/frontend-capture/scenarios/task-1763-hiring-capacity-closure.ts`.
- Route: Application 360 autorizada.
- Viewports: `1440x1000`, `390x844`.
- Required steps: ready/cancel, ready/confirm, stale/refresh, partial/retry, denied.
- Required captures: cada estado y mobile single-plane.
- Required `data-capture` markers: dialog, summary, confirm, run status.
- Assertions: exact N, desenlace y causa visibles antes de confirmar, no double submit, selection preserved, focus restore.
- Scroll-width checks: `scrollWidth === clientWidth`.
- Accessibility/focus checks: Escape, pending lock, live status, axe.
- Reduced-motion evidence: capture con preferencia activa.

## Design Decision Log

- Decision: two-step command-backed dialog.
- Alternatives considered: auto-close, checkbox inline, cross-route page.
- Why this pattern: separa efectos y permite recuperación sin perder contexto.
- Reuse / extend / new primitive: reuse.
- Open risks: timeout con resultado incierto y categoría backup.
- Follow-up: no crear route nueva sin evidencia.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided.
- [ ] Failure paths are user-safe and do not expose internals.
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains why the flow uses these surfaces.
