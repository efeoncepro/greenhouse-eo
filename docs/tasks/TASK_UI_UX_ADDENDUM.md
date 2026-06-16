# UI/UX Task Addendum

Addendum copiable para cualquier `TASK-###` que toque una superficie visible, copy reusable,
layout, estados, interaccion, motion, primitive, flujo de producto o evidencia visual.

Este addendum no reemplaza `TASK_TEMPLATE.md`: lo extiende cuando `Execution profile` sea
`ui-ux` o cuando `UI impact` sea distinto de `none`.

## Cuándo aplica

Usar este addendum si la task toca cualquiera de estos puntos:

- JSX visible, rutas, vistas, cards, tablas, drawers, modales, sidecars o popovers.
- Copy visible, CTAs, empty states, alerts, tooltips, aria-labels o mensajes de error.
- Estados visuales: loading, empty, degraded, error, permission denied, long content o mobile.
- Microinteracciones: hover, focus, active, pending, keyboard, escape, click-away o feedback.
- Motion: entrance, exit, layout morph, stagger, scroll reveal, reduced-motion fallback.
- Primitives, variants, kinds, Composition Shell, Adaptive Card density o Design System labs.
- Mockup, Figma, GVC, screenshot review o paridad mockup-runtime.

## Niveles de rigor

Declarar el nivel dentro de `## UI/UX Contract`.

| Nivel | Uso | Evidencia minima |
|---|---|---|
| `ui-lite` | Microcopy, label, estado visual pequeno o fix local | lint/test aplicable + revision manual |
| `ui-standard` | Pantalla, componente o flujo visible | GVC desktop + mobile, estados clave, a11y/focus |
| `ui-platform` | Primitive, pattern reusable, motion system, shell o Design System | Lab interno + docs UI platform + GVC + ADR si cambia contrato compartido |

## Bloque Copiable

```md
## UI/UX Contract

### Experience brief

- UI rigor: `ui-lite|ui-standard|ui-platform`
- Usuario / rol:
- Momento del flujo:
- Resultado perceptible esperado:
- Friccion que debe reducir:
- No-goals UX:

### Surface & system decision

- Surface:
- Composition Shell: `aplica|no aplica` — [razon]
- Primitive decision: `reuse|extend|new|one-off` — [primitive/variant/kind]
- Adaptive density / The Seam: `aplica|no aplica` — [razon]
- Floating/Sidecar/Dialog decision: [si aplica]
- Copy source: `src/lib/copy/*|src/config/greenhouse-nomenclature.ts|local one-off`
- Access impact: `none|routeGroups|views|entitlements|startup policy`

### State inventory

- Default:
- Loading:
- Empty:
- Error:
- Degraded / partial:
- Permission denied:
- Long content:
- Mobile / compact:
- Keyboard / focus:
- Reduced motion:

### Interaction contract

- Primary interaction:
- Hover / focus / active:
- Pending / disabled:
- Escape / click-away:
- Focus restore:
- Latency feedback:
- Toast / alert behavior:

### Motion & microinteractions

- Motion primitive: `Motion|useGreenhouseGSAP|framer layout|CSS|none`
- Enter / exit:
- Layout morph:
- Stagger:
- Timing / easing token:
- Reduced-motion fallback:
- Non-goal motion:

### Visual verification

- GVC scenario:
- Viewports:
- Required captures:
- Required `data-capture` markers:
- Scroll-width check:
- Accessibility/focus checks:
- Before/after evidence:
- Known visual debt:
```

## Acceptance Criteria para UI

Agregar criterios binarios como corresponda:

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact` segun el alcance real.
- [ ] La task declara si reusa, extiende o crea primitive; no nace un componente paralelo sin razon.
- [ ] El copy visible reusable vive en `src/lib/copy/*` o nomenclatura canonica.
- [ ] Los estados loading/empty/error/degraded/permission/mobile quedan cubiertos o explicitamente fuera de scope.
- [ ] Motion y microinteracciones tienen fallback de reduced motion.
- [ ] GVC desktop + mobile fue capturado y mirado cuando el cambio es `ui-standard` o `ui-platform`.
- [ ] Se midio que no existe scroll horizontal de pagina en desktop ni mobile 390px cuando cambia layout.
- [ ] Si nace primitive/pattern platform-level, se agrego Lab interno y documentacion UI Platform.

## Migración de Tasks Existentes

- `complete/`: no migrar salvo que se reabra.
- `in-progress/`: agregar este addendum si el trabajo pendiente toca UI visible.
- `to-do/`: migrar solo cuando la task se rankea, se edita o se toma.
- legacy/pre-template: no forzar conversion completa; agregar solo `## UI/UX Contract` si se ejecuta.

## Rollout del Enforcement

El enforcement nace `warning-first`:

1. `pnpm task:lint --changed` advierte si una task UI activa no tiene `## UI/UX Contract`.
2. Legacy y backlog historico quedan exentos salvo que se editen.
3. Cuando el backlog nuevo ya use el campo consistentemente, se puede promover a error para tasks nuevas.
