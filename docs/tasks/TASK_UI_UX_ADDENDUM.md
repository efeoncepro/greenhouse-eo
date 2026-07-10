# UI/UX Task Addendum

Addendum copiable para cualquier `TASK-###` que toque una superficie visible, copy reusable,
layout, estados, interaccion, motion, primitive, flujo de producto o evidencia visual.

Este addendum no reemplaza `TASK_TEMPLATE.md`: lo extiende cuando `Execution profile` sea
`ui-ux` o cuando `UI impact` sea distinto de `none`.

Antes de este addendum, toda task nueva completa `## Modular Placement Contract`. Para UI,
`Current home` nombra la surface actual, `Future candidate home` normalmente es `portal`,
`public` o `ui-package`, `Boundary` identifica el reader/command/DTO consumido y
`Server/browser split` prohíbe stores/DB/secrets/provider SDKs en Client Components. Ver
`docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.

## Wireframe Gate

Toda task `ui-ux` o con `UI impact != none` debe declarar en `## Status`:

```md
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-###-short-slug.md`
```

El archivo debe existir antes de implementar JSX/copy visible. Para cambios realmente
triviales que no necesitan wireframe, la task debe mantener `UI impact: none` y explicar
la razon en `Current Repo State` o `Out of Scope`; no usar `Wireframe: none` con impacto UI.

`UI ready` es el semaforo final de preparacion, no el lifecycle de implementacion:

- `no` — estado por defecto mientras falta mapping, GVC plan, decision log, copy o estados.
- `yes` — la task tiene contratos suficientes para escribir JSX/copy visible sin inventar arquitectura.
- `n/a` — solo para tasks sin impacto UI.

`pnpm task:lint --task TASK-###` bloquea `UI ready: yes` si faltan `### Implementation mapping`,
`### GVC scenario plan` o `### Design decision log` dentro del `## UI/UX Contract`, o si el
wireframe declarado no tiene `## Implementation Mapping`, `## GVC Scenario Plan` y
`## Design Decision Log`.

## Flow Gate

Toda task con `UI impact: flow` debe declarar en `## Status`:

```md
- Flow: `docs/ui/flows/TASK-###-short-slug-flow.md`
```

El archivo debe existir antes de implementar JSX/copy visible. Para tasks UI que
no sean `flow`, `Flow: none` es valido solo si la superficie no coordina sidecar,
drawer, modal, popover, navegación entre pantallas, deep links, query params,
dirty-state confirmation ni una secuencia GVC. Si el texto de la task menciona
esas piezas y deja `Flow: none`, `task-lint` emite warning para forzar decisión
explícita.

## Motion Gate

Toda task con `UI impact: motion` debe declarar en `## Status`:

```md
- Motion: `docs/ui/motion/TASK-###-short-slug-motion.md`
```

El archivo debe existir antes de implementar JSX/copy visible. Para tasks UI que
no sean `motion`, `Motion: none` es valido solo si no hay motion,
microinteracciones, animaciones, transiciones no triviales, Framer/GSAP/Lottie,
animated counters/charts/empty states ni feedback temporal que afecte confianza,
foco o recuperacion. Si el texto de la task menciona esas piezas y deja
`Motion: none`, `task-lint` emite warning para forzar decisión explícita.

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

### Implementation mapping

- Route / surface:
- Primitive / variant / kind:
- Component candidates:
- Copy source:
- Data reader / command:
- API parity:
- Access / capability:
- States to implement:

### GVC scenario plan

- Scenario file:
- Route:
- Viewports:
- Required steps:
- Required captures:
- Required `data-capture` markers:
- Assertions:
- Scroll-width checks:
- Reduced-motion / focus evidence:

### Design decision log

- Decision:
- Alternatives considered:
- Why this pattern:
- Reuse / extend / new primitive:
- Open risks:

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
- [ ] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log; si esta en `yes`, pasa `pnpm task:lint --task TASK-###`.
- [ ] Se declaro `Wireframe: docs/ui/wireframes/TASK-###-short-slug.md` y el archivo existe.
- [ ] Si `UI impact: flow` o hay sidecar/drawer/modal/popover/navegacion cruzada, se declaro `Flow: docs/ui/flows/TASK-###-short-slug-flow.md` y el archivo existe.
- [ ] Si `UI impact: motion` o hay motion/microinteracciones no triviales, se declaro `Motion: docs/ui/motion/TASK-###-short-slug-motion.md` y el archivo existe.
- [ ] **Full API Parity:** si la UI expone una **acción de negocio** (capability que afecta estado/permisos/datos/aprobaciones/exports/recoveries/reportes/config), la lógica vive en un contrato gobernado server-side, NO en el componente; entonces `Backend impact != none` y aplica el **Capability Definition of Done** de `TASK_BACKEND_DATA_ADDENDUM.md` (preferir dos tasks: `backend-data` el contrato + `ui-ux` el cliente). La UI es cliente del primitive, igual que Nexa/MCP — no una segunda implementación.
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

El wireframe es gate duro para tasks UI cambiadas o revisadas en modo focal; el
resto del contrato UI/UX mantiene rollout `warning-first` para no migrar backlog
historico de golpe:

1. `pnpm task:lint --changed` bloquea si una task UI cambiada no declara un wireframe existente en `docs/ui/wireframes/`.
2. `pnpm task:lint --changed` bloquea si una task con `UI impact: flow` no declara un flow contract existente en `docs/ui/flows/`.
3. `pnpm task:lint --changed` bloquea si una task con `UI impact: motion` no declara un motion contract existente en `docs/ui/motion/`.
4. `pnpm task:lint --task TASK-###` bloquea `UI ready: yes` si falta implementation mapping, GVC scenario plan o design decision log.
5. `pnpm ui:wireframe-check --task TASK-###`, `pnpm ui:flow-check --task TASK-###`, `pnpm ui:motion-check --task TASK-###` y `pnpm ui:readiness-check --task TASK-###` son los atajos focales para revisar estos gates.
6. `pnpm task:lint --changed` advierte si una task UI activa no tiene `## UI/UX Contract`.
7. Legacy y backlog historico quedan exentos salvo que se editen.
