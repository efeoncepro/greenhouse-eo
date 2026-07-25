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

- Extender el patrón existente de Globe Producer (región `producer-route` + tarjetas); **NUNCA** importar primitives, `CompositionShell`, MUI ni AXIS de `greenhouse-eo`. **ADR-014: el CSS/tokens de Globe dejan de vivir dispersos por archivo — el SSOT de tokens lo crea `TASK-1556` Slice 2 y el hex crudo pasa a ser error de lint (Slice 3). Todo token que esta task tocó migra a ese SSOT; no se re-declara.**
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

Mapa de implementación verificado **al 2026-07-24, sobre el payload de browser vigente entonces** (HTML-template + controller vanilla-JS + CSS **inline** en `producer-ui.ts`). **ADR-014 (2026-07-25) superseded eso: ya no es la arquitectura de Globe sino el payload legacy.** El payload canónico es una aplicación cliente tipada y componetizada (Vite + React + React Router, SSR apagado), gobernada por `TASK-1556`. El Producer sigue en el payload legacy hasta su propio slice de port, así que este mapa describe correctamente lo ya ejecutado — **no autoriza superficie nueva sobre el patrón viejo**. Reader `globe.producer.fleet.list` **desplegado + live-verificado** (Codex `c3b6bf4`).

- **`producer-client.ts`** — patrón de fetch idéntico al catálogo (`:610-614`: en boot, si `gateFor('globe.producer.catalog.list').state==='available'`, `reader(ids.catalog,{}).then(d => state.catalog = d.routes)`). Plan: agregar `fleet: 'globe.producer.fleet.list'` a `ids` (`:131`), `state.fleet` a `RuntimeState`, el fetch paralelo en boot, y exponerlo al controller (mismo mecanismo que `catalog`). `reader(id, query)` genérico (`:490`) ya arma el envelope (`workspaceSelection`, correlationId).
- **`producer-ui.ts`** — reemplazar `data-producer-static-route` (`:142`, el placeholder deshabilitado dentro de `route-card`/`route-output-grid`) por el contenedor de la galería + **CSS inline** de las láminas (Dirección A) en el `<style>` del page. Copy desde `producer-copy.ts`.
- **`producer-controller.ts`** — hidratar la galería desde `state.fleet` filtrando por `state.modality`; render de láminas (nombre público + `availability`); selección única `available` → `referenceRoute`; preselect del `recommendedDefault` si `available`; teclado/aria (radiogroup).
- **`producer-copy.ts`** — ids nuevos (wireframe §5): `modelAvailable`, `modelRecommended`, `modelGated`, `modelBlockedProviderVerifier`, `modelSelectAria`.
- **`producer-gvc-fixture.mjs`** — agregar la capability `globe.producer.fleet.list` (coverage ui available) + data fake de flota (available/gated/blocked) para el escenario `task-1555-model-selector`.

Slices de implementación (design-studio Steps 6-9): (1) data layer client + fixture; (2) render de la galería + CSS (first-fold checkpoint desktop+mobile); (3) estados+selección+a11y; (4) GVC premium + scorecard 14 dims. **Nota de dependencia:** el estado `available` real (modelo funcionando) necesita la **promoción ADR-009** (hoy bloqueada por identidades de readiness firmadas — paso humano); `gated`/`blocked` sí se pueden GVC-ear ya.

## Progress — Revisión del operador (2026-07-25, `efeonce-globe` `a45954f` + `0258534`)

La galería de láminas se implementó y **el operador la rechazó al verla**. La dirección visual quedó
revisada (ver `visual-directions/…-direction.md` §Decisión revisada) y el wireframe tiene su §0 delta.
Lo que cambió y por qué:

### 1. El control: desplegable compacto, no galería

*"¿Para qué cards gigantes … si con isotipo REAL del modelo y el label está ok en un desplegable?"*
Tiene razón: elegir el modelo es **una** decisión del composer, no su momento dominante — se elige
una vez y se itera el prompt muchas veces. La región pasó de **515px a 121px** y el prompt recuperó
el fold. Sobrevive la parte correcta del brief: que la flota completa sea **visible**.

### 2. Isotipos reales del modelo

- **OpenAI** desde el set `logos` de Iconify **que ya vive en Greenhouse**
  (`src/assets/iconify-icons/generated-icons.css`, `.logos-openai-icon`) — lo señaló el operador;
  simple-icons no distribuye OpenAI. Se decodificó su data-URI al SVG original, path intacto.
- **Gemini / ByteDance / ElevenLabs** desde simple-icons v16.27.0 (CC0-1.0), copiados sin modificar.
- Fuente, licencia y mapeo en `efeonce-globe/apps/studio-web/public/models/README.md`.
- **NUNCA** transcribir a mano ni inventar un logo: un logo aproximado es peor que un monograma.
- El anti-patrón "logos de terceros" del doc de dirección **se retiró** con decisión del operador: el
  nombre del modelo ya es público por ADR-003 ("GPT Image 2" ya identifica a OpenAI). Lo prohibido
  sigue siendo slug de wire, costo vendor y margen.

### 3. Jerga de ruteo fuera de la cara del producto

"Ruta y modelo" → **"Modelo"**. También salieron "Ruta seleccionada" de la barra de ejecución,
"Curada · modelo real" y el ícono `ti-route` (el test de contrato de íconos pasó a `sparkles`).

### 4. Tres defectos de contenido que el operador destapó

- **Bajo "Genera una imagen" se ofrecía `Seedream 5 Pro Edit`**, un modelo de EDICIÓN.
  `routeSupportsCurrentMode` filtraba sólo por modalidad; ahora decide la **capacidad**
  (`image-generate` vs `image-edit` según `editFrom`).
- **Bajo "Genera audio" sólo se ofrecía el modelo de voz**: `Seed Audio` (`audio-generate`) era
  inalcanzable desde toda la superficie — integrado y promovido, pero jamás seleccionable.
- **`data-compact-route` nunca se actualizaba**: la barra decía "elige un modelo" con un modelo ya
  elegido. Ahora refleja el modelo elegido y sigue la modalidad.

### 5. "¿Por qué en Video no están los modelos de Google?" — la flota completa es visible

Verificado contra el ledger y el catálogo: **sí eran alcanzables**, pero sólo adivinando un chip de
sub-modo — en "Crear" sólo aparecía Seedance. Corrijo mi primera lectura: no estaban "inalcanzables",
estaban **invisibles**, que para el objetivo de la task es igual de malo.

El selector ahora lista **toda la flota de la modalidad activa**, no sólo lo que el modo activo corre:

| Modalidad | Modelos visibles |
|---|---|
| Video | Seedance 2.0 (Disponible) · **Veo 2.0** ("Necesita cuadros") · **Gemini Omni Flash** (Próximamente) · Seedance motion (Próximamente) |
| Audio | Seed Audio · ElevenLabs Multilingual v2 / Voice Changer / Dubbing |
| Imagen | Seedream 5 Pro (✦) · Seedream 5 Pro Edit ("Necesita una imagen para editar") · Nano Banana Pro · GPT Image 2 / 1.5 |

**Elegir un modelo que necesita otro modo cambia el modo por ti** y lo deja seleccionado (verificado:
click en Veo → modo Cuadros + barra "Veo · 2.0"). `SWITCHABLE_MODES` declara qué modos tienen chip;
imagen no tiene (se entra a editar desde una pieza de la biblioteca), así que ahí es informativo.

**Por qué no basta con meterlos en "Crear":** `ref/motion/reference-v1` (Gemini Omni) declara
`minReferences: 1` y `ref/video/frames-v1` (Veo) exige keyframes. Ofrecerlos en un modo sólo-prompt
reventaría en `assertInputModeSatisfied` **después** de reservar crédito — el fail-open que la
arquitectura advierte. Se muestran con lo que necesitan, nunca como ejecutables donde no lo son.

### 6. "Te faltan modelos, revisa el ledger" — el catálogo crece (`9e57422`)

El operador tenía razón otra vez, y el gap era upstream de la UI: **5 de las 14 capacidades no tenían
NINGUNA ruta en `PRODUCER_ROUTE_CATALOG`**. Modelos integrados y verificados en vivo en el Lab desde
el 2026-07-19 que ninguna superficie podía nombrar, porque el reader proyecta el catálogo.

Catálogo **v1.3.0 → v1.4.0**, cuatro rutas nuevas declaradas contra **lo que el adapter realmente
transporta**, no contra lo que uno supone:

| Ruta | Modelo | Verdad del adapter |
|---|---|---|
| `ref/still/nanobanana-2-v1` | Nano Banana · 2 | 404 allowlist de Google → visible, no ejecutable |
| `ref/still/vector-v1` | Recraft · v4.1 | `text-to-vector`, `requiresInput: false` → **desde texto, sin imagen de origen** |
| `ref/still/upscale-v1` | Topaz · Upscale | `image_url`, `maxReferences: 1` |
| `ref/video/upscale-v1` | Topaz · Upscale | `video_url`, `maxReferences: 1` |

Declarar una referencia en Recraft habría sido anunciar un input que el adapter no adjunta — el
fail-open que sólo aparece gastando.

**La modalidad imagen gana su contrato de modos** (Crear · Editar · Vectorizar · Escalar) y video suma
Escalar. Sin un modo, una capacidad no tiene forma de existir en la superficie — es la misma causa
raíz de Seed Audio y de los modelos de Google en video.

**Mejora general que salió de acá:** el shape pane ya **no renderiza una perilla cuando la dimensión
admite un solo valor**. Un upscale hereda la proporción del origen: ofrecer un selector que el
proveedor ignora es mentir en la UI. Una constante es un hecho de la ruta, no una elección.

**Dos bugs de raíz destapados y corregidos:**
- `routeEligibility` respondía una pregunta de **imagen** con el copy de **video**.
- El mapa de modos sólo cubría los modos "otros", así que un modelo de la modalidad activa fuera del
  modo activo caía al gate equivocado. Ahora es total y las claves de copy van **calificadas por
  modalidad**, para que el cruce no pueda repetirse.

**Sin isotipo disponible:** Recraft y Topaz no están en simple-icons ni en Tabler → monograma,
documentado. **NUNCA** dibujar una aproximación para completar el set.

**Lo que queda fuera, con razón declarada:** `Hyper3D Rodin` (`model-3d-generate`) —
`ProducerRouteModality` es `image | video | audio`, así que **3D no existe como modalidad**: pide
cambio de contrato, cuarta pestaña y visor GLB, y es task propia. `video-extend` tampoco tiene ruta.
El catálogo cubre hoy **12 de 14 capacidades**.

### 7. Gate visual premium + el brief del composer (`246329a`, `1c7d03b`)

**GVC premium VERDE** en desktop 1440×1000 y mobile 390×844, escenario `task-1555-model-selector`
contra el fixture local de Globe. 24 frames, 7/7 aserciones, 0 errores de consola, 0 fallos HTTP.
Dossier: `.captures/2026-07-25T07-08-54_task-1555-model-selector/`.

Tres cosas que la captura obligó a resolver bien, y valen como método:

- **La rúbrica enterprise apuntaba al composer**, pero `data-surface-recipe` vive en la consola. Era
  configuración mía del escenario, no un defecto del producto.
- **La inercia de lo no ejecutable no se captura clickeando:** Playwright se niega a accionar un
  `aria-disabled` — que ES la prueba de que no es un control, pero un paso fallido no es evidencia.
  El invariante de comportamiento se movió a `producer-controller.test.ts`, y la captura declara el
  estado legible.
- **Una acción que elimina su propio disparador no puede ser `interaction`:** el harness la re-ejecuta
  para las variantes, y tras elegir Veo el modo ya es Cuadros. Pasó a paso simple + mark del estado.

**Scorecard:** `docs/ui/reviews/TASK-1555-globe-producer-model-selector.scorecard.json` —
`pnpm ui:quality --task TASK-1555` **PASS**, promedio **4.54**, piso **4.2** (iconografía).
Pisos exigidos cumplidos: jerarquía 4.7 · economía de superficies 4.6 · impacto visual 4.5 ·
fidelidad 4.7 · resistencia a template 4.5. Las tres dimensiones bajo 4.5 (iconografía 4.2, motion
4.3, ritmo 4.4) llevan `nextAction` declarada; **no se inflaron para pasar el gate**.

**Revisión del operador sobre el brief del composer** (cuatro defectos, uno era bug):

| Defecto | Corrección |
|---|---|
| Sugerencias hardcodeadas en el markup e **idénticas en las 3 modalidades** ("Retrato editorial" bajo *Genera audio*) | Por modalidad, desde el copy SoT, proyectadas por el `data-approved-mode` que ya existía |
| **223px** de alto para inspiración opcional, con peso constante | Etiqueta corta + prompt completo al insertar (el handler ya leía `data-prompt-suggestion`); se repliega al escribir: **223 → 121 → 0px** |
| "Excluir del resultado" se leía como una **quinta sugerencia** | Entra al bloque del prompt, tras las referencias y detrás de un separador: el brief cierra con su restricción |
| Las acciones del prompt **flotaban sobre el textarea**: hueco reservado con `padding-right` fijo de 118px, más angosto que los botones (145px) → el placeholder corría bajo el historial | En flujo debajo del texto. Cederles una columna de grid tampoco servía: en 390px dejaba el input primario en 166px de 318px |

El patrón común de los cuatro es el mismo de toda la task: **una constante hardcodeada que no sigue a
la realidad** — el copy que no sigue la modalidad, el peso que no sigue el estado, el hueco que no
sigue al contenido.

### 8. Pasada de calidad sobre el composer y la biblioteca (`76bfada`, `802ba3f`, `45235cc`)

El operador marcó cuatro zonas más. Ninguna era cuestión de gusto: en las cuatro **la apariencia no
seguía al comportamiento real**, y en dos la causa raíz eran capas de CSS contradiciéndose sin dueño.

**El prompt leía como agujero, no como lienzo** (`76bfada`). Cinco defectos medidos, tres de ellos
violaciones de token: `padding: 0` (texto contra el borde), `background: rgba(0,0,0,.16)` — un lavado
**negro**, no un color, que sobre el azul lee como hueco —, placeholder en `rgb(117,117,117)` (**gris
neutro fuera de la paleta**; `--faint` es `#7f8cb5`), el agarre nativo de `resize` como chrome sin
gobernar, y el campo hero a 13.92px con 104px de vacío fijo. Ahora: respiro interno, superficie navy
levemente elevada, placeholder tokenizado, `.95rem` con interlineado de lectura y **alto que sigue al
contenido** (98 → 145 → 98px). Se removió además un residuo de mi propio fix anterior
(`padding-right:0`), que existía sólo para anular el hueco del overlay y le comía el padding derecho
al lienzo nuevo.

**El seed mostraba un número que el run ignora** (`802ba3f`). El payload es
`...(state.seedLocked ? { recipe: { seed: state.seed } } : {})`: con el candado abierto —el estado por
defecto— el número **no se usa** y el reroll no tiene efecto observable. La UI exhibía un valor preciso
que no participa: no parece un error, parece un dato. Y la jerarquía estaba invertida — el número que
no aplica a **16px**, el modelo que sí decide a 13.12px, y el botón "Fijar seed" también a 16px cuando
sus chips hermanos están a ~11px. Ahora el control **dice la verdad de su estado**: en aleatorio, una
línea ("Distinto en cada generación") sin número ni reroll; al fijarlo aparecen número (tabular, tamaño
de dato), reroll y ayuda. **150px → 63px** en el estado por defecto.

**Los filtros de biblioteca eran una cápsula rota** (`45235cc`). `.filter-row` había acumulado **12
declaraciones en 8 bloques y 4 breakpoints**. En mobile ganaban dos que se contradicen: una la volvía
grid de 3 columnas (5 filtros → 2 filas) y otra la envolvía en una cápsula `border-radius:999px`
diseñada para **una sola fila** → blob de 94px con dos huérfanos abajo; y un tercer override escondía
las etiquetas dejando filtros solo-icono. En vez del override nº 13, el control recibió **una
definición coherente**: si no cabe en una fila deja de ser cápsula y pasa a ser lo que sus vecinos ya
son (chips que envuelven, con etiqueta). 94px → 81px; desktop sin cambios.

**Trampa que costó un ciclo y vale registrar:** el primer intento dejó cada chip a ancho completo (5
filas, 210px, peor que el original) porque sobrevivía un `.filter-button{width:100%}` de la época de la
grilla de 2 columnas. Mi regla tenía más especificidad pero **no declaraba `width`**, así que el legacy
ganaba por omisión. Una definición nueva sobre capas viejas tiene que **neutralizar lo que contradice**,
no sólo declarar lo que quiere — es exactamente la dinámica que produjo las 12 declaraciones.

**Evidencia:** GVC premium re-capturado verde tras cada cambio; scorecard apunta a
`.captures/2026-07-25T07-34-15_task-1555-model-selector/`, `pnpm ui:quality` **PASS** (4.54 / piso 4.2).

**Señal para el operador (no resuelta acá):** cinco zonas revisadas, cinco con el mismo tipo de
defecto. Hay indicio de que es **sistémico en el composer y la biblioteca**, no una serie de
casualidades. Ir zona por zona funciona pero es reactivo; conviene una pasada completa bajo esa lente
como task propia.

## Progress — Implementación (2026-07-24, `efeonce-globe` `78a1863`, pusheado a `main`)

### Corrección al mapa de Discovery (hallazgo load-bearing)

El "placeholder estático" `data-producer-static-route` (`producer-ui.ts`) es **sólo el shell
PRE-hidratación**. La UI que el usuario ve la renderiza `renderRouteSelector()` en
`producer-controller.ts`, que reemplazaba esa región por un `<select>` oculto + un
`details.route-picker` con `role="listbox"` — es decir, **la Dirección C (dropdown técnico) que la
dirección visual rechaza explícitamente**. El trabajo real fue reescribir ESE render, no el
placeholder. El placeholder pasó a ser el skeleton de la galería.

### Decisiones de implementación (no re-decidir **dentro del payload legacy**)

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
- [x] Selector **compacto** con isotipo real + label (`a45954f`), flota completa de la modalidad
  visible (`0258534`) y catálogo v1.4.0 (`9e57422`) — **la dirección revisada está implementada y viva**.
  La galería rechazada no sobrevive en ninguna parte.
- [x] Limpieza del CSS muerto de `.route-picker`/`.route-menu`/`.route-identity`
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
- Coordinar ownership de `producer-ui.ts` con TASK-1552 **y con `TASK-1556` (ADR-014): esta task no bloquea el Slice 0, pero su superficie es candidata a port en el slice del composer. Declarar antes de empezar ese slice si lo construido acá se porta a componentes o se reimplementa.**

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

## Contrato de port al payload cliente (ADR-014 / TASK-1556)

> **Para la sesión que ejecuta `TASK-1556`.** No es una objeción a ADR-014 — el diagnóstico es
> correcto y esta task es parte de su evidencia. Es lo que el port del Producer tiene que preservar
> para no perder trabajo verificado en silencio. `TASK-1556` **no tocó** estos archivos en sus Slices 1-3 (seam · tokens+copy · gates)
> (su superficie es el share board); esto aplica al slice de port del Producer, cuando llegue.

### 1. Portar desde `efeonce-globe` `45235cc`, no desde una lectura anterior

Lo **desplegado en internal** (revisiones `globe-api-internal-00091-wnq` y
`globe-studio-internal-00068-gx6`, imagen `:45235ccb62ca`, 2026-07-25) incluye cambios que no existían
horas antes: isotipos reales de modelo, flota completa por modalidad, contrato de modos de imagen,
seed honesto, filtros de biblioteca y el prompt re-estilizado. Un port hecho contra un snapshot previo
los pierde **sin que ningún test lo note**, porque son cambios de superficie.

### 2. Contratos que deben sobrevivir (son contratos, no estilo)

| Qué | Por qué no se re-inventa |
|---|---|
| `producer-copy.ts` como SoT de copy visible | La capa de copy nueva debería **absorberlo**. Duplicarlo reabre el drift que ya produjo "Retrato editorial" bajo *Genera audio* |
| `MODEL_ISOTYPES` + `apps/studio-web/public/models/` + su `README.md` | Es **dato con implicancia legal**: fuentes y licencias declaradas (simple-icons CC0; OpenAI desde el set `logos` de Iconify). El README prohíbe explícitamente re-transcribir un logo a mano. **`TASK-1557` toca estos mismos archivos** |
| Markers `data-capture`: `producer-model-picker`, `producer-model-trigger`, `producer-model-option`, `producer-model-recommended`, `producer-route` | El escenario GVC `task-1555-model-selector` y el scorecard cuelgan de ellos. Renombrarlos los mata **sin fallar** |
| Invariantes de dominio: availability server-authoritative · `aria-disabled` + razón para lo no ejecutable · cero slug/costo/margen · el `<select>` oculto como autoridad del loop de gasto | Están asertados en `producer-controller.test.ts`; si el port los deja atrás, los tests se van con ellos |

### 3. Dato honesto para re-medir antes de citar números

Esta task **agregó peso al payload legacy** mientras corregía defectos de producto: **+614 líneas** en
`producer-controller.ts`, **+144** en `producer-ui.ts` y **68 colores crudos nuevos** en
`producer-ui.ts` (`d07a1cd..45235cc`). Los conteos de ADR-014 (4.999 líneas, 184 hex / 63 colores)
son **anteriores** a esta sesión: conviene re-medir antes de volver a citarlos.

### 4. Señal que esta task levantó y no resolvió

Cinco zonas revisadas por el operador, cinco con el mismo tipo de defecto: **apariencia que no sigue
al comportamiento real**, o capas contradiciéndose sin dueño. Es coherente con la tesis de ADR-014 y
refuerza que el problema es del sustrato, no de cada pantalla.

## Follow-ups

- Consumo de la flota por Nexa ("qué modelos hay / cuáles disponibles") reusando el mismo reader.
- Si el pase visual premium exige un patrón nuevo de galería reusable en Globe, evaluar su ownership.

## Open Questions

- ¿La galería vive siempre inline en `producer-route`, o supera el fold y usa el sheet existente de Globe en 390px? El wireframe fija inline por defecto; confirmar en Discovery con GVC 390px.
- ¿El orden dentro de `available` sigue algún criterio (calidad/uso) además de recomendado-primero? Por defecto: recomendado → available (orden de catálogo) → gated → blocked.
