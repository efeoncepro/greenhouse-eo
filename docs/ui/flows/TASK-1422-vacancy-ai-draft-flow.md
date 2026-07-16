# TASK-1422 — Vacancy AI Draft (propose→confirm) Flow Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1422 — Vacancy AI draft UI (propose→confirm del copy público en el Publication Desk)`
- Related wireframe: [docs/ui/wireframes/TASK-1422-vacancy-ai-draft-drawer.md](../wireframes/TASK-1422-vacancy-ai-draft-drawer.md)
- Master UI flow: [EPIC-011-hiring-ats-UI-FLOW.md](EPIC-011-hiring-ats-UI-FLOW.md) — este flujo **extiende el nodo N-publish** (Publication Desk, TASK-355 Surface 4): agrega el sub-flujo "redactar el copy que el publish gate exige" ANTES del publish. No crea nodo de journey nuevo para el candidato; es tooling del reclutador dentro del nodo interno.
- Intended route / surface: `/agency/hiring/publication` (base) + drawer lateral (sin cambio de ruta)
- Flow type: `single-surface` (base + drawer + dialog de descarte; command-backed)
- Primary primitives: MUI `Drawer` (patrón desk `ghHiringDrawer`), `GreenhouseButton`, `CustomTextField`, `CustomAutocomplete`, `Dialog`, `Snackbar`
- Copy source: `hiringDesk.publication.vacancyAi.*` (es-CL + en-US)

## Flow Brief

- Primary user: reclutador/hiring manager interno con `hiring.opening.ai_assist` + `hiring.opening.write`.
- Entry moment: está en el Publication Desk mirando el diff de un opening cuyo copy público está incompleto (columna pública llena de "No informado"; publish deshabilitado).
- Successful outcome: el opening tiene copy público completo aplicado por confirm humano; el diff lo refleja; publish habilitado. El aviso publicado quedará coherente con lo que el assessment evalúa.
- Primary decision/action: revisar/editar el borrador IA y decidir **Aplicar** (confirm) o **Descartar** (reject).
- Non-goals: publicar; editar verdad interna; regenerar en loop infinito (dedupe por digest reutiliza el pendiente).

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Publication Desk (base) | Entrada y contexto (diff público↔interno) | Grid 2 columnas; CTA en header de columna pública; selector de vacante en header card | columnas apiladas; CTA full-width bajo el título de la columna pública | vista existente `PublicationDeskView` |
| Drawer "Borrador del aviso con IA" | generate → proposing → review → confirming | anchor right, 480px, scroll interno | fullWidth (100vw), mismo contenido | MUI `Drawer` + `ghHiringDrawer` |
| Dialog "¿Descartar este borrador?" | confirmación destructiva del reject | `Dialog maxWidth='sm'` sobre el drawer | igual | patrón dialog del desk |
| Snackbar / Alerts | feedback de resultado | bottom-right | igual | existentes |

## Flow Map

1. Entry: el reclutador abre `/agency/hiring/publication` (o selecciona otra vacante en el selector). El page server ya resolvió `vacancyAi: { enabled, canPropose, canConfirm, pendingProposal? }`.
2. Primary action: click en `✨ Redactar con IA` (o `Revisar borrador pendiente` si el ledger tiene un `proposed` para ese opening).
3. Transition: abre el drawer — en paso `generate` (sin pendiente) o directo en `review` (pendiente).
4. User decision: en `generate`, opcionalmente elige template de assessment y pulsa `Generar borrador` → `proposing` (LLM server-side, 10–30 s) → `review`. En `review` edita los campos y decide.
5. Completion: `Aplicar al aviso` → confirm endpoint con `publicCopyOverride` (lo editado) → drawer cierra, toast, refetch del opening, diff actualizado, publish habilitado.
6. Recovery / exit: `Descartar borrador` (dialog → reject → toast) · cerrar/Esc en generate/review (borrador pendiente persiste en el ledger) · `Seguir en segundo plano` durante proposing (el propose termina server-side y queda pendiente) · degradación del provider → Alert `degraded` + `Reintentar`.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Click `Redactar con IA` | CTA columna pública | drawer `generate` | Enter/Space sobre el botón | oculto sin capability; disabled+tooltip con flag OFF |
| Click `Revisar borrador pendiente` | mismo CTA (variante) | drawer `review` (proposal del ledger) | Enter/Space | badge/chip con el estado pendiente |
| Seleccionar vacante | `CustomAutocomplete` header | recarga el diff con ese opening (client-side sobre snapshot) | patrón combobox APG | también re-resuelve pendingProposal (fetch client) |
| Click `Generar borrador` | drawer generate | `proposing` → `review` | Enter | POST propose; doble click protegido (disabled al disparar) |
| Elegir template | `CustomAutocomplete` | actualiza `templateId` del propose | combobox APG | opcional; lazy fetch de templates al abrir el picker |
| Click `Seguir en segundo plano` | drawer proposing | cierra drawer; CTA pasa a `pending` al completarse | Enter | el request NO se cancela; hint explica |
| Editar campo | form review | estado `dirty` local | — | validación onBlur; requeridos: título/resumen/descripción |
| Click `Aplicar al aviso` | footer review | `confirming` → cierre + toast | Enter | confirm con `publicCopyOverride` = form completo |
| Click `Descartar borrador` | footer review | dialog descarte | Enter | reject tras confirmar |
| Esc / click-away | drawer | cierra (si NO confirming/proposing-submit) | Esc | pendiente persiste; foco restaurado al CTA |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | drawer cerrado | inicial / cierre | click CTA | CTA refleja `ready/locked/pending` |
| generate | paso inicial sin pendiente | abrir sin proposal | Generar / cerrar | template picker + CTA; foco al primer control |
| proposing | LLM redactando | Generar borrador | 201 ok / 201 degraded / error / background | LinearProgress + `role=status` + skeleton shape-of-form; botón Generar disabled |
| review | borrador editable | proposal disponible (nueva o pendiente) | Aplicar / Descartar / cerrar | form prefilled + banner IA (model) + caption anti-sesgo; requeridos validan onBlur |
| dirty | review con ediciones | primer cambio | aplicar/descartar/cerrar | cerrar NO pierde el ledger (solo la edición local); sin dialog de descarte de cambios (el borrador persiste) — hint en el footer |
| confirming | aplicando al opening | Aplicar | 200 / error | spinner en botón (patrón desk), drawer bloqueado, Esc off |
| applied | confirmado | 200 confirm | auto | drawer cierra; toast `applied`; refetch opening; foco al CTA; CTA vuelve a `ready` |
| rejecting | descartando | confirmar dialog | 200 / error | spinner en botón del dialog |
| degraded | provider falló (status != ok) | 201 con proposal null | Reintentar / cerrar | Alert warning `degraded` + botón `retry`; NUNCA finge éxito |
| error | fallo API (confirm/reject/409 flag) | catch | Reintentar / cerrar | Alert error con mensaje es-CL canónico; el form CONSERVA lo editado |

## Routing Contract

- Route changes: `none` (drawer client-side; sin query param — la superficie es 1 vacante activa y el pendiente se re-resuelve al cargar).
- Canonical URL: `/agency/hiring/publication`.
- Deep-link behavior: la page al cargar resuelve pendientes del ledger server-side → el estado `pending` sobrevive reloads sin URL state.
- Back button behavior: sin efecto sobre el drawer (no route state); el navegador sale de la page normal.
- Reload behavior: proposing en curso → al recargar, si el propose terminó, CTA muestra `Revisar borrador pendiente`; si no terminó aún, CTA normal y el pendiente aparecerá al próximo load (honesto, sin polling V1).
- Shareability: n/a (superficie interna).

## Focus & Accessibility

- Initial focus: primer control del paso activo (template picker en generate; primer campo en review).
- Escape behavior: cierra en `generate`/`review`/`degraded`; bloqueado en `confirming`/`rejecting`.
- Click-away behavior: idéntico a Esc.
- Focus restore: al CTA que abrió el drawer (patrón drawer del desk).
- Modal vs non-modal semantics: modal (MUI Drawer con backdrop + focus trap), `aria-labelledby` → título del drawer.
- Screen reader announcement: `proposing` y transición a `review` vía `role="status" aria-live="polite"`; resultado del confirm vía Snackbar; errores `role="alert"`.
- Keyboard traversal: orden DOM = visual; footer al final; targets ≥24px.
- Reduced motion: drawer/keyframes con el guard existente del frame (`ghHiring*` respetan `prefers-reduced-motion`); skeleton sin shimmer.

## Data & Command Boundaries

- Readers: page server — `getHiringDeskSnapshot` (existente) + `isHiringVacancyAiEnabled()` + `can()` ×2 + `listAiProposals({kind:'opening_public_copy',status:'proposed'})`; client — `GET /api/hiring/assessments/templates` (picker lazy), `GET /api/hiring/openings/[id]` (refetch post-confirm), `GET /api/hiring/assessments/ai/proposals?kind=opening_public_copy&status=proposed` (re-resolver pendiente al cambiar vacante).
- Commands: `POST /api/hiring/openings/[id]/ai/propose-public-copy` (propose; capability `hiring.opening.ai_assist`; flag-gated) · `POST /api/hiring/assessments/ai/proposals/[id]/confirm` (`decision confirm|reject`, `publicCopyOverride`; capability `hiring.opening.write`; NO flag-gated).
- API routes: solo las existentes de TASK-1385/1361 — CERO endpoints nuevos.
- Optimistic updates: NO optimista en el confirm (el write es la decisión humana; se espera el 200 y se refetch-ea el opening). El único estado optimista es UI-local (dirty form).
- Cache / invalidation: refetch puntual del opening tras confirm; sin revalidatePath (el publish, que sí refresca careers, es otra acción).
- Audit / signals: los del backend 1385 (ledger + outbox); la UI no duplica.
- Tenant / access boundary: interno-only; viewCode `gestion.hiring_publication`; capabilities re-enforzadas server-side (la UI solo decide affordances).

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied (sin capability propose) | CTA no se renderiza | — | page server no manda el affordance |
| flag OFF | CTA disabled + tooltip honesto | flip del flag (operador) | locked state; backend re-enforza 409 |
| 409 `vacancy_ai_disabled` post-load | Alert error en drawer con el mensaje canónico | cerrar | defensa si el flag cambió en caliente |
| provider degraded (`not_configured`/`provider_error`/`schema_invalid`) | Alert warning `degraded` en el drawer | `Reintentar` / cerrar | 201 con proposal null; NUNCA se muestra como éxito |
| confirm falla (API/red) | Alert error; form conserva TODO lo editado | `Reintentar` | forms-ux: nunca limpiar |
| proposal ya confirmada/rechazada por otro actor | error 409 terminal-once del backend → Alert + refetch de pendientes | cerrar; CTA re-resuelve | carrera multi-operador |
| opening sin demanda/404 | Alert error canónico | cerrar | improbable (FK), manejado por mensaje |
| empty (sin openings) | estado existente `noOpening` | — | sin CTA |

## GVC Scenario Plan

- Scenario: `task1422-vacancy-ai-draft`
- Scenario file: `scripts/frontend/scenarios/task1422-vacancy-ai-draft.yaml`
- Route: `/agency/hiring/publication` (dev local, flag ON, proposal `proposed` sembrada para review determinista)
- Viewports: 1440×900 + 390×844
- Required steps: base con CTA → abrir drawer (review con pendiente) → editar campo → dialog descarte → cerrar → variante generate (sin pendiente) → mobile
- Required captures: `base-diff-with-cta` · `drawer-review` · `drawer-generate` · `drawer-discard-dialog` · `mobile-drawer`
- Required `data-capture` markers: `hiring-vacancy-ai-cta` · `hiring-vacancy-ai-drawer` · `hiring-publication-diff`
- Assertions: consola limpia; `scrollWidth==clientWidth` (base y drawer, ambos viewports); foco entra/restaura correctamente
- Scroll-width checks: sí (desktop + 390)
- Accessibility/focus checks: foco inicial + Esc + restore capturados en frames
- Reduced-motion evidence: captura con reduce activo (drawer sin animación)

## Design Decision Log

- Decision: sub-flujo de drawer dentro del nodo N-publish del master flow; sin ruta nueva ni estado en URL.
- Alternatives considered: query param `?draft=1` para deep-link del drawer — descartado V1: el pendiente ya sobrevive reloads vía ledger (server-fetch), y el drawer es una tarea de minutos, no una ubicación.
- Why this pattern: el desk ya enseñó al usuario este vocabulario (drawer Nueva demanda + dialog de confirmación + toast); el flujo propose→confirm es idéntico al mental model de 1363 ("la IA sugiere, tú confirmas").
- Reuse / extend / new primitive: reuse total (ver wireframe DDL).
- Open risks: latencia LLM percibida — mitigada con progreso honesto + background; carrera multi-operador sobre la misma proposal — resuelta por terminal-once del backend + mensaje claro.
- Follow-up: polling/refresh automático del pendiente tras "segundo plano" (V1 = al recargar/reabrir); edición manual sin IA; Nexa actionKey.

## Acceptance Checklist

- [x] The owning task declares this file in `Flow`.
- [x] Every surface has desktop and compact behavior.
- [x] Opening, closing, escape and focus restore are specified.
- [x] Route/deep-link/back-button behavior is explicit.
- [x] Data readers/commands are named and UI-only business logic is avoided.
- [x] Failure paths are user-safe and do not expose internals.
- [x] GVC sequence captures prove the flow, not only static screens.
- [x] Design decision log explains why the flow uses these surfaces/routes.
