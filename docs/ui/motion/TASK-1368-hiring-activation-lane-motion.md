# TASK-1368 — Hiring Activation Lane Motion Contract

## Meta

- Task: `TASK-1368`
- Superficie: activation lane "Contrataciones listas". Wireframe: `docs/ui/wireframes/TASK-1368-hiring-activation-lane.md` · Flow: `docs/ui/flows/TASK-1368-hiring-activation-lane-flow.md` · Master: `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`
- Rigor de motion: **funcional mínima** (mandato del mockup aprobado TASK-763: "motion mínima, sin loaders apilados ni motion decorativa"). Todo tokenizado + reduced-motion-aware.
- Estado: `draft` (UI ready: no)

## Motion Brief

El movimiento acá solo confirma cambios de estado de una acción sensible (crear colaborador, abrir onboarding, activar) y el resultado del readiness. Nada decorativo: cada motion comunica "esto se está guardando / esto quedó listo / esto falta / esto se revirtió". Es una superficie de operación HR crítica (activa a un colaborador) — la sobriedad es intencional.

## Motion Inventory

| # | Elemento | Comportamiento | Cuándo |
|---|---|---|---|
| M1 | Tab/lane switch | Cross-fade breve del contenido | Cambio de tab (Onboarding/Offboarding/Contrataciones listas) |
| M2 | Detalle (list→detail) | Transición corta al abrir el caso | Click en fila |
| M3 | Readiness ítem | Cambio de estado ✓/⚠/✗ (sin llamar la atención) | Al resolver un blocker / recompute |
| M4 | Botón de acción (crear/onboarding/activar) | Estado de carga ("Creando…"/"Activando…") + confirmación | Command en vuelo |
| M5 | Activar — bloqueado | Sin animación de "shake"; el motivo aparece estático junto al botón | readiness incompleto |
| M6 | Dialog (resolver/activar) | Entrada/salida estándar del dialog primitive | Abrir/cerrar |
| M7 | Rollback de acción | El estado vuelve + toast de error (`role=alert`) | Command falla |
| M8 | KPIs `LaneCard` | Skeleton al cargar | Cola loading |

## Microinteraction States

- **Acción en vuelo (M4):** el botón muestra label de progreso + spinner inline; al confirmar, el estado del caso avanza (member_created / onboarding_open / active).
- **Activar bloqueado (M5):** NO shake ni parpadeo; el botón queda disabled-con-motivo y el checklist muestra el ítem ✗ — el feedback es textual, no cinético.
- **Rollback (M7):** el estado vuelve visiblemente + toast de error; nunca queda ambiguo.

## Transition Specs

- Duración: 120–250ms (feedback), nunca > 350ms. Easing/duración desde tokens de motion (`MOTION_*`/`theme.axis.*`), NUNCA `ms`/curvas inline (lint `no-untokenized-motion`).
- Cross-fade (M1/M2) y estados de botón (M4) usan opacidad/transform tokenizados.

## Primitive & Token Mapping

- Dialog (M6): dialog primitive existente (motion propio). Skeleton (M8): primitive de skeleton.
- Botones (M4): estado pending del botón canónico. Duración/easing: tokens de motion; 0 magic numbers inline.

## Reduced Motion Contract

`@media (prefers-reduced-motion: reduce)`:

- M1/M2 → corte directo (sin cross-fade). M3 → cambio instantáneo de ✓/⚠/✗ (el estado se conserva vía texto+icono+color).
- M4 → el label de progreso ("Creando…") **se conserva** (feedback esencial), solo se quita el spinner animado si aplica.
- M7 rollback → sin animación de regreso, pero **el toast de error se conserva**.
- M8 skeleton → estático.
- El feedback esencial (guardando / listo / falta / se revirtió) SIEMPRE sobrevive; solo se simplifica el adorno.

## Accessibility & Feedback

- El motion NUNCA es el único canal: cada cambio de estado tiene texto/foco/aria (M4 label + estado; M7 toast `role=alert`; readiness ✓/⚠/✗ por texto+icono+color).
- Activar bloqueado (M5) comunica por texto, no por movimiento (a11y + calma en una acción crítica).
- Foco visible; dialogs con foco atrapado + retorno. Sin parpadeos > 3Hz.

## Performance Guardrails

- Animar solo `opacity`/`transform`; nunca layout/reflow. Skeletons dimensionados (anti-CLS).

## GVC / Micro Evidence

- Capturar M4 (acción en vuelo), M5 (Activar bloqueado-con-motivo), M7 (rollback) en desktop 1440 + mobile 390.
- Verificar reduced-motion: cortes directos, feedback (label/toast/estado) conservado.

## Design Decision Log

- **Funcional mínima** (mandato mockup 763): el motion solo confirma acciones sensibles.
- **Activar bloqueado = feedback textual, no cinético** (calma en acción crítica + a11y).
- **Feedback esencial sobrevive a reduced-motion.**
- **Todo tokenizado**; reusar motion de los primitives (dialog/botón/skeleton), no rodar motion paralelo.

## Acceptance Checklist

- [ ] M1–M8 con tokens de motion (0 magic numbers inline).
- [ ] Activar bloqueado comunica por texto (M5), sin shake/parpadeo.
- [ ] Acción en vuelo (M4) + rollback (M7) con feedback claro.
- [ ] Reduced-motion: cortes directos, feedback esencial conservado.
- [ ] Solo `opacity`/`transform`; sin reflow.
- [ ] GVC micro-evidencia (acción/bloqueado/rollback) desktop+mobile + reduced-motion mirada.
