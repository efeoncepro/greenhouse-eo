# TASK-1555 — Globe Producer Model Selector

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1555-globe-producer-model-selector.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1555-globe-producer-model-selector-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `creative|ui|product`
- Blocked by: `TASK-1554`
- Branch: `task/TASK-1555-globe-producer-model-selector`
- Legacy ID: `none`

## Summary

Reemplaza el **placeholder estático** de "Ruta y modelo" del composer del Producer por un **selector de modelo
data-driven y availability-aware**: una galería que consume `globe.producer.fleet.list` (TASK-1554) y muestra cada
modelo de la flota con su estado (`available`/`gated`/`blocked`), preselecciona el `recommendedDefault` y deja
elegir sólo lo realmente disponible. Escala a N modelos sin hand-edits por modelo.

## Why This Task Exists

Hoy la selección de modelo del Producer no existe: `efeonce-globe/apps/studio-web/src/producer-ui.ts` renderiza un
botón `aria-disabled` con "El catálogo publicará aquí sus rutas autorizadas". TASK-1553 volvió el catálogo
multi-modelo y TASK-1554 expuso la disponibilidad por-ruta×workspace en un reader gobernado; falta la superficie que
haga **cada modelo probado visible y elegible en el Producer** — el North Star del operador ("todos los modelos
funcionando en el Producer, verificado desde la UI"). Sin este selector, promover una ruta no se traduce en nada
visible para el usuario.

## Goal

- Reemplazar el placeholder por una galería de modelos por modalidad, ordenada recomendado → available → gated → blocked.
- Elegir un modelo alimenta `referenceRoute` del run (contrato existente); sólo `available` es ejecutable.
- Estados honestos para `gated` ("Próximamente") y `blocked` (razón del gate externo); nunca un control ejecutable falso.
- Escalar a toda la flota data-driven (agregar/promover un modelo → aparece, sin tocar la UI).
- Entrega premium verificable en desktop 1440px y mobile 390px, sin exponer slug/costo/margen.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/ui/visual-directions/TASK-1555-globe-producer-model-selector-direction.md` (**dirección visual ELEGIDA**, design-studio Step 1-2: Dirección A "Galería de láminas")
- `docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md` (dirección aprobada base del Producer)
- `docs/ui/wireframes/TASK-1555-globe-producer-model-selector.md` (contrato de diseño de esta task)
- `docs/ui/motion/TASK-1555-globe-producer-model-selector-motion.md` (contrato de motion)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` (catálogo, audiencia, slug guard)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md` (ADR-013)
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md` (ledger de flota)
- `.claude/skills/greenhouse-globe/SKILL.md` (Producer UI/BFF, patrones Globe)

Reglas obligatorias:

- Extender el patrón existente de Globe Producer (región `producer-route` + tarjetas); **NO** crear design system nuevo ni primitive Greenhouse (Globe tiene su propio registry/CSS).
- El navegador **no** calcula disponibilidad, promoción, ceiling ni provider metadata: sólo renderiza el `availability` que da el reader.
- **NUNCA** exponer slug de proveedor, costo vendor ni margen (el reader ya no los expone; la UI tampoco los infiere).
- Copy visible via `producer-copy.ts` (extender, no hardcodear en JSX).

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/tasks/in-progress/TASK-1554-globe-producer-fleet-availability-projection.md` (el reader que consume)
- `docs/tasks/to-do/TASK-1552-globe-producer-composer-focused-creation.md` (jerarquía del composer — coordinar ownership)

## Dependencies & Impact

### Depends on

- **TASK-1554** — `globe.producer.fleet.list` (availability + recommendedDefaults). **Bloqueante:** sin el reader desplegado, el selector no tiene dato real.
- TASK-1553/ADR-013 — catálogo multi-modelo + resolución por-ruta (shipped).
- Rutas realmente promovidas (ADR-009) para que existan modelos `available` que probar (coordinación con Codex/operador).

### Blocks / Impacts

- Cierra el North Star "cada modelo funcionando en el Producer + prueba UI" junto con las promociones.
- Coordinar ownership de `producer-ui.ts`/`producer-controller.ts`/`producer-copy.ts` con **TASK-1552** (jerarquía) y TASK-1505/1531/1532 antes de implementar.
- No cambia contratos backend, feed, viewer ni el runtime de generación.

### Files owned

- `../efeonce-globe/apps/studio-web/src/producer-ui.ts`
- `../efeonce-globe/apps/studio-web/src/producer-controller.ts`
- `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs`
- `docs/ui/wireframes/TASK-1555-globe-producer-model-selector.md`

## Current Repo State

### Already exists

- Composer del Producer con modalidades Image/Video/Audio + región `producer-route` como **placeholder estático** (`producer-ui.ts` `data-producer-static-route`).
- Reader gobernado `globe.producer.fleet.list` (TASK-1554, `efeonce-globe` `c3b6bf4`) con `availability` + `recommendedDefaults`.
- Copy `composer.route`/`routePending`/`routeDisclosure` en `producer-copy.ts`.
- BFF same-origin del Producer + patrón de dispatch de readers.
- GVC premium para desktop/mobile.

### Gap

- No hay selector real: el modelo no se puede ver ni elegir en el Producer.
- El `availability`/`recommendedDefault` del reader no se consume en la UI.
- Estados `gated`/`blocked` honestos sin renderizar.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-web` Producer Console
- Future candidate home: `remain-shared`
- Candidate home nota: UI consumer sobre el Producer existente; no se extrae a paquete nuevo.
- Boundary: UI consumer del reader de flota (TASK-1554) + contratos de estimate/run existentes
- Server/browser split: el browser posee presentación/selección/foco; Globe (reader/commands) posee catálogo, disponibilidad, estimate, acceso, generación
- Build impact: sólo UI/CSS/tests/GVC de Globe Studio Web; sin dependencia/paquete/runtime nuevo
- Extraction blocker: session/BFF same-origin, estado del Producer y el registry de patrones Globe

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador creativo autenticado de Globe Producer.
- Momento del flujo: al componer una pieza Image/Video/Audio, eligiendo con qué modelo generar.
- Resultado perceptible: ver todos los modelos de la flota, entender cuáles puede usar ya y elegir uno sin datos técnicos de proveedor.
- Fricción que reduce: hoy no hay selección de modelo; el placeholder no comunica la flota ni su disponibilidad.
- No-goals UX: exponer slug/costo/margen, mostrar `gated`/`blocked` como ejecutables, rediseñar el feed/viewer, convertir el composer en chat.

### Surface & system decision

- Surface: `/producer`, región `producer-route` del composer.
- Composition Shell: `no aplica` — extensión local del composer; superficie/pattern propio de Globe.
- Primitive decision: `extend` — región/tarjetas de Globe Producer; sin primitive paralela ni design system nuevo.
- Adaptive density / The Seam: `aplica` — la galería se recompone a 390px en columna única, sin overflow.
- Floating/Sidecar/Dialog decision: inline en el composer; el tooltip de razón (`gated`/`blocked`) usa el patrón accesible existente de Globe.
- Copy source: `../efeonce-globe/apps/studio-web/src/producer-copy.ts` (extender con los ids del wireframe §5).
- Access impact: `entitlements` existentes (`globe.producer.catalog.read`); sin cambio de autorización.

### State inventory

Ver wireframe §4 (contrato completo). Estados: default/loading (skeleton, nunca "0 modelos" falso), available (elegible), selected (refleja en `data-compact-route` + `referenceRoute`), gated ("Próximamente", no ejecutable), blocked (razón del gate externo, no ejecutable), empty (capacidad sin rutas), error (canónico + retry), permission denied (honesto), recommended preselect (sólo si `available`), mobile 390px (columna única, 44px, sin overflow), keyboard/focus (grid navegable, foco visible), reduced motion (estado final inmediato).

### Interaction contract

- Primary interaction: elegir una tarjeta `available` → set `referenceRoute` del run.
- Selección única (semántica radiogroup): una sola tarjeta `aria-checked`.
- `gated`/`blocked`: `aria-disabled` + razón en `aria-describedby`; no roban foco de acción ni son ejecutables.
- Hover/focus/active equivalentes en pointer, teclado y touch; foco visible.
- Recommended preselect: si no hay selección y el `recommendedDefault` está `available`, queda preseleccionado; si no, no se preselecciona una ruta ejecutable.
- Escape/click-away: no aplica (inline); tooltip de razón cierra con Escape.
- Latency feedback: skeleton mientras resuelve el reader; reusa estados textuales existentes, sin porcentajes inventados.

### Motion & microinteractions

- Motion primitive: `none` — reusa el comportamiento de disclosure/estado existente de Globe; sin core nuevo.
- Enter/exit: aparición instantánea o token existente; sin parallax/loops/confetti.
- Reduced-motion fallback: estado final inmediato + texto equivalente.

### Implementation mapping

- Route / surface: `/producer` en `../efeonce-globe/apps/studio-web`.
- Component candidates: `producer-ui.ts` (render de la galería en `producer-route`), `producer-controller.ts` (fetch del reader + selección), `producer-copy.ts` (copy).
- Data reader / command: `globe.producer.fleet.list` (TASK-1554) vía BFF; selección → `referenceRoute` del contrato de estimate/run existente.
- API parity: sin endpoint/reader/command nuevo; consume el primitive de TASK-1554 (mismo que Nexa/MCP).
- Access / capability: `globe.producer.catalog.read` (ya en los scopes del Producer).
- States to implement: los del wireframe §4.

### GVC scenario plan

- Scenario file: `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs` (nuevo escenario `task-1555-model-selector`).
- Route: `/producer?gvc=task-1555-model-selector`.
- Viewports: `1440×1000`, `390×844`. Quality profile: `premium`.
- Required captures: galería con available+gated+blocked, recomendado ✦, selección, modalidades Image/Video/Audio, empty, mobile.
- `data-capture` markers: `producer-route`, `producer-model-grid`, `producer-model-card`, `producer-model-recommended`.
- Assertions: cero slug/costo/margen en el DOM; una sola selección; `gated`/`blocked` no ejecutables; `scrollWidth === clientWidth` desktop y 390px.
- Review dossier: `.captures/<run>/review/`.
- Baseline decision / surface ID: `globe.creative-producer-surface` tras aceptación de first fold.

### Design decision log

- Decision: galería de modelos data-driven, availability-aware, dentro de la región `producer-route`.
- Alternatives considered: dropdown técnico de rutas; modal de selección de modelo.
- Why this pattern: hace la flota un momento creativo dominante (no un dropdown técnico), respeta la dirección aprobada TASK-1505 y escala data-driven.
- Reuse / extend / new primitive: extend Globe Producer patterns; sin primitive/system paralelo.
- Open risks: coordinación de ownership con TASK-1552; que existan rutas `available` reales (depende de promociones ADR-009).

### Visual verification

- GVC scenario: `task-1555-model-selector`; viewports 1440×1000 y 390×844.
- Required captures + markers: los de arriba.
- Scroll-width check: página y galería sin overflow horizontal.
- Accessibility/focus: radiogroup semántico, `aria-checked`/`aria-disabled`, foco visible, 44px, tooltips accesibles, reduced motion.
- Before/after: placeholder actual vs galería.
- Visual scorecard: `docs/ui/reviews/TASK-1555-globe-producer-model-selector.scorecard.json`.
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/generic-template resistance >= 4.5`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Consumo del reader + galería base

- Fetch de `globe.producer.fleet.list` por la modalidad activa; render de la galería de tarjetas (nombre+versión público, estado) reemplazando el placeholder estático. Copy nuevo en `producer-copy.ts`.

### Slice 2 — Estados + selección + recommendedDefault

- Estados honestos `available`/`gated`/`blocked` (con razón); selección única `available` → `referenceRoute`; preselect del recomendado sólo si `available`; teclado/foco/aria (radiogroup); mobile 390px.

### Slice 3 — GVC + verificación visual

- Escenario/fixture `task-1555-model-selector`, markers, capturas desktop/mobile, aserciones (no slug, una selección, gated/blocked no ejecutables, no overflow), scorecard premium.

## Out of Scope

- El reader de flota (TASK-1554, ya existe) y la promoción de rutas (ADR-009).
- La jerarquía del composer / progressive disclosure (TASK-1552).
- Cambios a estimate/credit/prepare/execute/spend, feed, viewer, colecciones.
- Nuevo API/reader/command/schema/migración/provider/capability, ni design system nuevo.
- Exponer créditos como vendor cost o slug/margen.

## Progress — Discovery (2026-07-24, contra código real de `efeonce-globe`)

Mapa de implementación verificado (arquitectura Globe = HTML-template + controller vanilla-JS + CSS **inline** en `producer-ui.ts`; NO React/JSX). Reader `globe.producer.fleet.list` **desplegado + live-verificado** (Codex `c3b6bf4`).

- **`producer-client.ts`** — patrón de fetch idéntico al catálogo (`:610-614`: en boot, si `gateFor('globe.producer.catalog.list').state==='available'`, `reader(ids.catalog,{}).then(d => state.catalog = d.routes)`). Plan: agregar `fleet: 'globe.producer.fleet.list'` a `ids` (`:131`), `state.fleet` a `RuntimeState`, el fetch paralelo en boot, y exponerlo al controller (mismo mecanismo que `catalog`). `reader(id, query)` genérico (`:490`) ya arma el envelope (`workspaceSelection`, correlationId).
- **`producer-ui.ts`** — reemplazar `data-producer-static-route` (`:142`, el placeholder deshabilitado dentro de `route-card`/`route-output-grid`) por el contenedor de la galería + **CSS inline** de las láminas (Dirección A) en el `<style>` del page. Copy desde `producer-copy.ts`.
- **`producer-controller.ts`** — hidratar la galería desde `state.fleet` filtrando por `state.modality`; render de láminas (nombre público + `availability`); selección única `available` → `referenceRoute`; preselect del `recommendedDefault` si `available`; teclado/aria (radiogroup).
- **`producer-copy.ts`** — ids nuevos (wireframe §5): `modelAvailable`, `modelRecommended`, `modelGated`, `modelBlockedProviderVerifier`, `modelSelectAria`.
- **`producer-gvc-fixture.mjs`** — agregar la capability `globe.producer.fleet.list` (coverage ui available) + data fake de flota (available/gated/blocked) para el escenario `task-1555-model-selector`.

Slices de implementación (design-studio Steps 6-9): (1) data layer client + fixture; (2) render de la galería + CSS (first-fold checkpoint desktop+mobile); (3) estados+selección+a11y; (4) GVC premium + scorecard 14 dims. **Nota de dependencia:** el estado `available` real (modelo funcionando) necesita la **promoción ADR-009** (hoy bloqueada por identidades de readiness firmadas — paso humano); `gated`/`blocked` sí se pueden GVC-ear ya.

## Progress — Implementación (2026-07-24, `efeonce-globe` `78a1863`, pusheado a `main`)

### Corrección al mapa de Discovery (hallazgo load-bearing)

El "placeholder estático" `data-producer-static-route` (`producer-ui.ts`) es **sólo el shell
PRE-hidratación**. La UI que el usuario ve la renderiza `renderRouteSelector()` en
`producer-controller.ts`, que reemplazaba esa región por un `<select>` oculto + un
`details.route-picker` con `role="listbox"` — es decir, **la Dirección C (dropdown técnico) que la
dirección visual rechaza explícitamente**. El trabajo real fue reescribir ESE render, no el
placeholder. El placeholder pasó a ser el skeleton de la galería.

### Decisiones de implementación (no re-decidir)

- **El `<select id="producer-route-select">` oculto sigue siendo la autoridad.** `estimate`,
  `renderShapePane`, `renderReferences`, `projectComposerMode` e `invalidateEstimate` cuelgan de su
  evento `change`. La lámina escribe **a través de él** (`select.value` + `dispatchEvent('change')`),
  igual que hacían los botones del `route-picker`. Bifurcar la selección habría roto el loop de gasto
  y los tests que assertean `producer-route-select` / `producer-runtime-route`.
- **El copy vive en `producer-copy.ts` (SoT) y viaja serializado.** `browserController` se serializa
  con `.toString()`, así que no puede importar el módulo de copy; se usó el mismo puente que
  `viewerCopy` (parámetro serializado, `ProducerFleetCopy`).
- **`route-card` cede su chrome** (`padding/border/background` a cero) para que la lámina sea la
  única superficie. Sin eso la galería quedaba *card-on-card*, el anti-patrón que la dirección marca
  como `BLOCK`.
- **Hue del campo de textura derivado de la identidad pública del modelo** (`name · version`), no del
  proveedor: dos tiers del mismo modelo (Seedream 5 Pro vs 5 Pro Edit) deben leerse como láminas
  distintas. El proveedor **no** es derivable del hue.
- **Señal de "no pude verificar" ≠ presencia del gate.** El client registra un gate para toda
  capability que sondea, así que la presencia de la clave no significa nada: sólo un gate cuyo
  `state !== 'available'` marca `fleetStatus='unverified'`. (Primera implementación tenía este bug;
  corregido y verificado en runtime.)

### Delta de dirección visual — mobile 390px (decisión registrada)

La dirección fija "columna única de láminas en 390px". **Se implementó 2 columnas en ≤430px** con
targets y tipografía más grandes. Razón: la columna del composer en desktop ya mide ~27,5rem (≈440px),
prácticamente el ancho del viewport mobile — una columna única produciría láminas de ~350px de alto y
~1.400px de scroll para 4 modelos, degradando la descubribilidad, que es exactamente el motivo por el
que la dirección **rechazó** la Dirección B. 2 columnas es una **transformación** (no una compresión):
menos densidad, targets mayores, nombres legibles. Pendiente de confirmar contra GVC 390px.

### Consecuencia de producto que requiere decisión del operador (⚠️ no silenciada)

Con la galería, **sólo una ruta `available` es ejecutable**. Hoy ninguna ruta de imagen está promovida
(ADR-009 bloqueada por identidades de readiness firmadas), así que en el runtime real **el Producer
queda sin modelo de imagen elegible** hasta la promoción. Es el comportamiento que la task, el
wireframe y los Acceptance Criteria especifican, y es el correcto desde gobernanza (ejecutar por el
Lab una ruta no promovida desde una superficie client-facing es justo lo que ADR-009/010 previene) —
pero hace visible el blocker en vez de esconderlo. `ref/audio/foley-v1` sí está promovida (canary
ADR-010), así que audio no queda a oscuras. **Si se necesita el Producer operable antes de la
promoción, es una decisión de rollout, no un bug.**

### Estado por slice

- [x] Slice 1a — data layer en `ProducerClient` (`d07a1cd`).
- [x] Slice 1b — copy + flota en el estado del controller.
- [x] Slice 2 — galería de láminas (HTML + CSS inline) + first-fold revisado en fixture local.
- [x] Slice 3 — estados honestos (`available`/`gated`/`blocked`/`unverified`/loading/empty),
      selección única, preselect del recomendado sólo si `available`, radiogroup + roving tabindex.
- [x] Fixture GVC con capability `globe.producer.fleet.list` + los tres estados.
- [ ] **Pendiente:** escenario GVC `task-1555-model-selector`, capturas premium 1440×1000 + 390×844,
      dossier, scorecard 14 dimensiones, `pnpm ui:quality`, enterprise review.
- [ ] **Pendiente:** limpieza del CSS muerto de `.route-picker`/`.route-menu`/`.route-identity`
      (quedó huérfano al remover el dropdown; vive dentro de una línea CSS minificada compartida).
- [ ] **Pendiente (out-of-band):** promoción ADR-009 para probar `available` real end-to-end.

### Verificación ejecutada

- `pnpm check` (typecheck + 235 tests) y `pnpm build` verdes en `efeonce-globe`.
- Runtime real contra el fixture (`http://127.0.0.1:4178/producer`): galería `ready`, orden
  recomendado → available → gated → blocked, `aria-checked`/`aria-disabled` correctos,
  `scrollWidth === clientWidth` (1429/1429), hues distintos por lámina, cero slug en el DOM.

## Detailed Spec

El contrato de layout, anatomía de tarjeta, estados, copy, data mapping, primitive, a11y y GVC está en el wireframe
`docs/ui/wireframes/TASK-1555-globe-producer-model-selector.md`. El loop de generación se mantiene:
`prompt → dirección → (modelo elegido) → output shape → Generar`. La disponibilidad es server-authoritative
(el browser sólo renderiza `availability`); el slug del proveedor nunca aparece.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (galería sobre el reader) antes de Slice 2 (estados/selección) antes de Slice 3 (GVC). No capturar evidencia hasta que estados y selección sean fieles.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Slug/costo/margen filtrado al DOM | seguridad/marca | low | consumir sólo la view pública del reader; aserción GVC de no-slug | slug en el DOM capturado |
| `gated`/`blocked` renderizado como ejecutable | UI/runtime | medium | `aria-disabled` + no-handler; aserción GVC | control habilitado sin `available` |
| Galería vacía en falso (reader lento/denegado) | UI | medium | skeleton + estado honesto; nunca "0 modelos" mientras carga | galería vacía sin loading |
| Colisión de ownership con TASK-1552 en `producer-ui.ts` | UI | medium | coordinar orden con TASK-1552 antes de implementar | conflicto de merge en el composer |

### Feature flags / cutover

Sin flag nueva — cambio aditivo de UI internal-only sobre una superficie existente. Rollback = revert del cambio UI/CSS/copy; no muta datos ni contratos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert de render/copy de la galería; vuelve el placeholder | <30 min | sí |
| 2 | revert de estados/selección | <30 min | sí |
| 3 | revert de markers/fixture/capturas | <15 min | sí |

### Production verification sequence

1. Checks focales de `../efeonce-globe/apps/studio-web` + task/wireframe/readiness.
2. Fixture local 1440×1000 y 390×844; revisar galería, estados, selección, teclado, reduced motion, scroll width.
3. Con una ruta realmente promovida (ej. Nano Banana Pro tras ADR-009), verificar que sale `available` y es elegible; una no promovida `gated`; una OpenAI `blocked`.
4. Promover a evidencia sólo tras scorecard premium + revisión humana internal-only.

### Out-of-band coordination required

- Depende de que existan rutas promovidas (ADR-009, Codex/operador) para probar el estado `available` real.
- Coordinar ownership de `producer-ui.ts` con TASK-1552.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Execution profile: ui-ux`, `UI impact: interaction`, `UI ready: no` hasta completar mapping/GVC/decision log; al pasar a `yes`, `pnpm task:lint --task TASK-1555` sin findings.
- [ ] Existe `docs/ui/wireframes/TASK-1555-globe-producer-model-selector.md` y pasa `pnpm ui:wireframe-check --task TASK-1555`.
- [ ] La región `producer-route` renderiza una galería data-driven desde `globe.producer.fleet.list` (no placeholder estático).
- [ ] Cada tarjeta muestra `model` público (nombre+versión) y su `availability`; **cero slug/costo/margen** en el DOM.
- [ ] `available` es elegible (selección única → `referenceRoute`); `gated` ("Próximamente") y `blocked` (razón) son legibles pero **no ejecutables**.
- [ ] El `recommendedDefault` se preselecciona sólo si está `available`; si no, no se preselecciona una ruta ejecutable.
- [ ] Se muestran sólo los modelos de la capacidad de la modalidad activa (Image/Video/Audio).
- [ ] Teclado/foco: radiogroup semántico, `aria-checked`/`aria-disabled`, foco visible, targets 44px, reduced-motion equivalente.
- [ ] GVC premium 1440×1000 + 390×844 con galería (available/gated/blocked), recomendado, selección, empty y mobile; dossier revisado.
- [ ] `scrollWidth === clientWidth` desktop y mobile, incluyendo la galería.
- [ ] Scorecard: promedio ≥4.5, piso ≥4, jerarquía/economía/impacto/resistencia a template ≥4.5.

## Verification

- `pnpm task:lint --task TASK-1555`
- `pnpm ui:wireframe-check --task TASK-1555`
- `pnpm ui:readiness-check --task TASK-1555`
- Checks/test/build focales de `../efeonce-globe/apps/studio-web`
- `pnpm fe:capture task-1555-model-selector --env=staging` cuando el scenario esté disponible
- `pnpm fe:capture:review <capture-dir>` + `pnpm ui:quality --task TASK-1555`
- Revisión manual desktop/mobile, teclado, reduced motion, no overflow.

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta.
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados.
- [ ] `Handoff.md`/`GLOBE_RUNTIME_HANDOFF.md` actualizados; delta en `GLOBE_MODEL_FLEET_STATUS.md` (selector = consumer live de la flota).
- [ ] Chequeo de impacto cruzado con TASK-1554 (reader), TASK-1552 (composer) y TASK-1505/1531/1532.
- [ ] Dossier visual + scorecard premium archivados.

## Follow-ups

- Consumo de la flota por Nexa ("qué modelos hay / cuáles disponibles") reusando el mismo reader.
- Si el pase visual premium exige un patrón nuevo de galería reusable en Globe, evaluar su ownership.

## Open Questions

- ¿La galería vive siempre inline en `producer-route`, o supera el fold y usa el sheet existente de Globe en 390px? El wireframe fija inline por defecto; confirmar en Discovery con GVC 390px.
- ¿El orden dentro de `available` sigue algún criterio (calidad/uso) además de recomendado-primero? Por defecto: recomendado → available (orden de catálogo) → gated → blocked.
