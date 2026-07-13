# TASK-1368 — Hiring Activation Lane Motion Contract

## Meta

- Task: `TASK-1368`
- Superficie: activation lane "Contrataciones listas". Wireframe: `docs/ui/wireframes/TASK-1368-hiring-activation-lane.md` · Flow: `docs/ui/flows/TASK-1368-hiring-activation-lane-flow.md` · Master: `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`
- Rigor de motion: **fidelidad alta controlada al HTML fuente + sobriedad operacional**. Se porta el vocabulario real del canvas (`fade`, `rise`, `slide-right`, `pop`, `toast`, `skeleton`) sin reemplazar el chrome Greenhouse/Vuexy ni convertir acciones críticas en motion decorativa. Todo tokenizado + reduced-motion-aware.
- Estado: `ready for implementation` (UI ready: yes; evidencia GVC durante ejecución)

## Motion Brief

El movimiento acá conserva el carácter visual del HTML de Documents, pero sólo como feedback operacional: entrada del canvas, transición list-detail, estados de carga, dialogs y toasts. Cada motion comunica "esto apareció / esto se seleccionó / esto se está guardando / esto quedó listo / esto falta / esto se revirtió". Es una superficie de operación HR crítica (activa a un colaborador) — la fidelidad no debe sacrificar calma, a11y ni reduced-motion.

## Source HTML Microinteraction Parity

Fuente revisada: `/Users/jreye/Documents/carreers/Hiring-activation/Ejecutar tarea 1368/Hiring Activation Lane.dc.html`.

| HTML fuente | Runtime TASK-1368 | Contrato |
|---|---|---|
| `ha-fade` | `ghActivationFade` | Hero, empty states, backdrop/dialog support |
| `ha-rise` | `ghActivationRise` | Métricas, cola, filas, readiness lanes, journey |
| `ha-slide-right` | `ghActivationSlideRight` | Detail inspector/list→detail |
| `ha-pop` | `ghActivationPop` | Dialog paper |
| `ha-toast` | `ghActivationToast` | Snackbar/alert de resultado |
| `ha-skel` | `ghActivationSkeleton` | Skeletons de cola/detalle |

Notas:

- `support.js` es runtime genérico del export Design Component; no se porta.
- La equivalencia usa `motionCss`/tokens Greenhouse y sólo anima `opacity`/`transform`.
- El chrome global, nav bar y menú vertical quedan fuera de fidelidad por decisión explícita del operador.

## Motion Inventory

| # | Elemento | Comportamiento | Cuándo |
|---|---|---|---|
| M1 | Tab/lane switch | Feedback hover/focus + fade/rise breve del canvas | Cambio de tab (Onboarding/Offboarding/Contrataciones listas) |
| M2 | Detalle (list→detail) | Slide-in corto desde derecha (`ha-slide-right` equivalente) | Click en fila |
| M3 | Readiness ítem | Cambio de estado ✓/⚠/✗ (sin llamar la atención) | Al resolver un blocker / recompute |
| M4 | Botón de acción (crear/onboarding/activar) | Estado de carga ("Creando…"/"Activando…") + confirmación | Command en vuelo |
| M5 | Activar — bloqueado | Sin animación de "shake"; el motivo aparece estático junto al botón | readiness incompleto |
| M6 | Dialog (resolver/activar) | Backdrop fade + paper pop (`ha-pop` equivalente) | Abrir/cerrar |
| M7 | Rollback de acción | El estado vuelve + toast desde abajo (`role=alert`) | Command falla |
| M8 | KPIs/cola/detail loading | Skeleton pulse tokenizado (`ha-skel` equivalente) | Cola/detail loading |

## Microinteraction States

- **Acción en vuelo (M4):** el botón muestra label de progreso + spinner inline; al confirmar, el estado del caso avanza (member_created / onboarding_open / active).
- **Activar bloqueado (M5):** NO shake ni parpadeo; el botón queda disabled-con-motivo y el checklist muestra el ítem ✗ — el feedback es textual, no cinético.
- **Rollback (M7):** el estado vuelve visiblemente + toast de error; nunca queda ambiguo.

## Transition Specs

- Duración: 120–250ms (feedback), nunca > 350ms. Easing/duración desde tokens de motion (`MOTION_*`/`theme.axis.*`), NUNCA `ms`/curvas inline (lint `no-untokenized-motion`).
- Cross-fade (M1/M2) y estados de botón (M4) usan opacidad/transform tokenizados.

## Primitive & Token Mapping

- Dialog (M6): MUI dialog canónico con `PaperProps`/`BackdropProps` tokenizados para preservar `ha-pop`/`ha-fade`.
- Skeleton (M8): MUI skeleton canónico con animación propia desactivada y pulso tokenizado para preservar `ha-skel`.
- Botones (M4): estado pending del botón canónico con spinner inline/label de progreso. Duración/easing: tokens de motion; 0 magic numbers inline.

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

- Captura base code-complete: `.captures/2026-07-13T09-21-19_hiring-activation-lane` — desktop/mobile, dossier apto/0 findings.
- Captura de polish de fidelidad: `.captures/2026-07-13T09-53-44_hiring-activation-lane` — 28 frames; desktop/mobile; hover + keyboard + reduced-motion sobre tab "Contrataciones listas"; click + keyboard + reduced-motion sobre refresh de cola; dossier apto/0 findings.
- Pendiente para cierre remoto: con flags/data reales validar selección de caso, acciones pending reales, detail sidecar con data y rollback/error real en staging.

## Design Decision Log

- **Fidelidad alta controlada**: port del vocabulario motion del HTML de Documents dentro de los primitives/contratos Greenhouse; no se copia chrome ni `support.js`.
- **Sobriedad HR crítica**: el motion no distrae ni reemplaza el feedback textual de una acción sensible.
- **Activar bloqueado = feedback textual, no cinético** (calma en acción crítica + a11y).
- **Feedback esencial sobrevive a reduced-motion.**
- **Todo tokenizado**; reusar motion de los primitives (dialog/botón/skeleton), no rodar motion paralelo.

## Acceptance Checklist

- [x] M1/M2/M6/M8 con tokens de motion (0 magic numbers inline en JSX; helper route-local tokenizado).
- [x] Activar bloqueado comunica por texto (M5), sin shake/parpadeo.
- [x] Reduced-motion: cortes directos, feedback esencial conservado.
- [x] Solo `opacity`/`transform`; sin reflow intencional.
- [x] GVC micro-evidencia local para hover/click/keyboard/reduced-motion no-mutante desktop+mobile.
- [ ] Staging/data-real: acción en vuelo (M4), rollback (M7) y detail sidecar con caso real capturados antes de mover TASK-1368 a `complete`.
