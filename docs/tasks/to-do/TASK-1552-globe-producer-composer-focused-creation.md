# TASK-1552 — Globe Producer Composer Focused Creation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`
- Flow: `docs/ui/flows/TASK-1552-globe-producer-composer-focused-creation-flow.md`
- Motion: `docs/ui/motion/TASK-1552-globe-producer-composer-focused-creation-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Port 1:1 del composer ENTREGADO en el payload cliente (ProducerComposer.tsx, 45KB); pendiente la recomposición de jerarquía, el contrato de motion y la evidencia visual`
- Rank: `TBD`
- Domain: `creative|ui|product`
- Blocked by: `none`
- Branch: `task/TASK-1552-globe-producer-composer-focused-creation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-07-25 — absorbe TASK-1564 (retirada) y la regla de reconciliación

Se creó `TASK-1564` ("Composer sobre el payload cliente") sin ver que esta task ya era la dueña del composer.
**`TASK-1564` queda retirada**; lo que aporta y pertenece acá:

**1. El composer se construye sobre el payload cliente** (`apps/studio-client`), no sobre el legacy — ADR-014
Slice 3. Hereda ya construido: transporte gobernado con epoch + idempotencia + refresh single-flight, resolver de
bytes con ciclo de vida de object URLs, SSOT de tokens y las primitives.

> ⚠️ **La ruta propia `/producer/compose` quedó DESCARTADA por la implementación** — ver el Delta medido más
> abajo. El composer **no tiene ruta propia**: vive dentro de `ProducerWorkspace` en `/producer`, y el gate es
> un flag, no una URL paralela.

**2. 🔴 La regla de reconciliación prototipo-vs-legacy — cinco clases, no una unión.** El prototipo aprobado tiene
riquezas que el legacy no tiene y viceversa; unir las dos listas es la respuesta equivocada porque **la autoridad
cambia según la clase**. Medido el 2026-07-25:

| Clase | Autoridad | Regla |
|---|---|---|
| forma, composición, motion, copy | **PROTOTIPO** | 11 `@keyframes` vs 0 en el legacy |
| invariantes de runtime (idempotencia, epoch, single-flight) | **LEGACY** | 7/19/9 menciones vs **0**: un HTML de fixtures no puede tenerlos |
| **plomería de accesibilidad** | **LEGACY** | contraintuitivo y medido: **9 `aria-live` vs 1**, 10 restauraciones de foco vs 0 |
| lo que el prototipo promete sin contrato | ninguna | deshabilitado **con su razón visible** |
| lo que el legacy muestra y **nunca despacha** | — | **no es riqueza: son promesas muertas** |

La última clase son **12 capabilities concretas** que el legacy gatea y jamás llama (`library.bulk.*`,
`experiment.evidence/list/tree`, `recipe.get`, `prompt.enhancement.accept/reject`, …), declaradas con su motivo en
`LEGACY_PARITY_EXCLUSIONS`. **Conclusión operativa: cuando alguien diga "el legacy tiene X y el nuevo no",
preguntar si X DESPACHA.**

**3. Retoque regional (inpaint) cae en la clase 4.** El prototipo lo desarrolla mucho (117 menciones), el legacy
tiene el diálogo pero el enmascarado es placeholder. Sin contrato de máscara → deshabilitado con su razón.

**4. El composer no necesita ningún scope OAuth nuevo.** Precisión sobre el enunciado original ("las 18
capabilities"): son **dos vocabularios distintos y no se cuentan juntos**. El composer despacha **14
capabilities** (`legacy-parity.ts`, `surface: 'composer'`), y la autoridad que las cubre son los **19 scopes**
de `PRODUCER_HUMAN_CAPABILITY_SCOPES` (`apps/studio-web/src/app.ts:241`), que sirven a **todas** las superficies
— no hay mapeo 1:1. Lo verificado y load-bearing es que **ninguna de las 14 exige un scope que hoy no se pida**:
los `globe.lab.*` los cubre `globe.lab.experiment.run`, los de ruta/flota `globe.producer.catalog.read`, las
voces `globe.voice.preset.manage` y el estimado `globe.credits.estimate`.

Importa porque agregar un scope es un rollout de 3 pasos cero-downtime **across dos repos**, y hacerlo de un
movimiento **tiró abajo todo el login de Globe** una vez. **Si la recomposición introduce una capability nueva,
verificar primero su `requiredCapability` contra esa lista ANTES de tocar el broker.**

**Docs de UI** (autorados para TASK-1564, **ya renombrados y migrados** a esta task — los paths `TASK-1564-*`
NO existen): wireframe `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md` (con el anexo
de geometría medida), flow del gasto con sus 4 compuertas
`docs/ui/flows/TASK-1552-globe-producer-composer-focused-creation-flow.md`, motion
`docs/ui/motion/TASK-1552-globe-producer-composer-focused-creation-motion.md`. Flow y motion son **compartidos
con `TASK-1532`** a propósito: el flujo del gasto es uno solo.

## Delta 2026-07-25 (tarde) — medido contra el runtime, no inferido

Verificado contra `efeonce-globe@main` y el árbol de trabajo. **El port 1:1 ya ocurrió**; lo que queda de esta
task es exactamente su alcance original: la **recomposición de jerarquía**, el motion y la evidencia.

| Qué | Estado medido | Consecuencia para esta task |
|---|---|---|
| `apps/studio-client/src/surfaces/producer/composer/ProducerComposer.tsx` | **existe, 45 KB**, con `producer-composer.css` | Slice 1 ya no parte de cero: parte del port |
| Ruta | `main.tsx`: `{ path: '/producer', Component: ProducerWorkspace }`; el comentario del archivo dice **«El composer NO tiene ruta propia: vive dentro de este [workspace]»**. `/producer/feed` sobrevive como ruta focalizada del strangler | **`/producer/compose` no existe y no se va a crear** |
| Gate de servido | `GLOBE_CLIENT_APP_ENABLED` **y** `GLOBE_CLIENT_PRODUCER_ENABLED`, ambos **cableados** en `infra/terraform/cloud_run_services.tf:136-137` | El cutover es un flip de flag, no una URL paralela. (El párrafo de `EPIC-028` que dice que `client_app_enabled` está sin cablear es **histórico**) |
| `GlobeGeneratingMark` | **YA EXISTE** (`primitives/GlobeGeneratingMark.tsx` + `globe-generating-mark.css`, 4 `@keyframes`) y **ya lo consume el composer** | El motion doc decía «nace en TASK-1565» (retirada). **Se consume, no se crea, y no hay deuda de isotipo estático** |
| `@keyframes` en el CSS del composer | **0** | El contrato de motion de esta superficie **está sin implementar**: la atenuación del estimado y las transiciones de popover son el trabajo de esta task |
| Ajustes avanzados | `<details className='advanced-controls' open>` — **abiertos por defecto** | Es el delta exacto que Slice 2 debe cerrar |
| Copy | namespace `producerComposer` **ya existe** en `apps/studio-client/src/copy/index.ts:132`; `apps/studio-web/src/producer-copy.ts` **sigue vivo** (14,5 KB) | La absorción por movimiento está **a medias**: quedan dos fuentes |
| `data-capture` presentes | 11 marcadores, pero **sólo `producer-output-shape` coincide** con los declarados en esta task | Los marcadores de la task estaban inventados; se alinean abajo contra el runtime |

**Regla que se desprende y hay que interiorizar:** el Delta de la mañana describía un plan (`/producer/compose`,
`producer-ui.ts` como owned, isotipo por construir). La tarde lo ejecutó de otra forma. **Un Delta describe el
día que se escribió; el runtime describe hoy** — antes de tomar esta task, `ls` sobre
`apps/studio-client/src/surfaces/producer/` y `grep` de la ruta en `main.tsx`, no memoria de este archivo.

## Summary

Recomponer el composer de Globe Producer para que una sola intención creativa domine el first fold: `prompt → dirección → output shape → generar`. Las capacidades avanzadas permanecen disponibles mediante progressive disclosure, sin duplicar el costo ni contradecir `TASK-1532`.

## Why This Task Exists

El composer actual intenta ser prompt editor, selector de modelos, panel de presets, laboratorio de seed, superficie de governance y panel de referencias simultáneamente. El resultado es una jerarquía débil, demasiados contenedores y una acción primaria poco concluyente. La solución es de composición y exposición progresiva, no de eliminación de capacidades.

## Goal

- Hacer del prompt la entrada dominante del Producer.
- Reducir la competencia visual entre sugerencias, presets, referencias, seed, modelo y governance.
- Mantener Imagen, Video y Audio como modos de un solo producto con controles específicos por modalidad.
- Integrar el CTA y los estados de `TASK-1532` sin añadir una línea de costo duplicada ni ocultar créditos.
- Entregar una recomposición premium verificable en desktop 1440 px y mobile 390 px.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md`
- `docs/tasks/in-progress/TASK-1505-globe-creative-producer-surface.md`
- `docs/tasks/to-do/TASK-1531-globe-creative-prompt-studio-experience.md`
- `docs/tasks/to-do/TASK-1532-globe-one-click-generate-automatic-estimate.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `.codex/skills/greenhouse-product-ui-architect/SKILL.md`

Reglas obligatorias:

- Reusar el lenguaje visual y el loop aprobado de Globe Producer, materializado en **componentes tipados del payload ADR-014** (esta task es el Slice 3 del strangler); no crear un sistema UI paralelo ni un cuarto bloque `:root` de tokens.
- El navegador no calcula costos, balance, policy, provenance ni provider metadata.
- El catálogo, estimate, prepare/generate, provenance y capabilities siguen siendo server-authoritative.
- El costo continúa visible en el CTA según `TASK-1532`; se elimina sólo la ceremonia de cálculo manual.
- Las capacidades aún gated aparecen con estados honestos y no como controles ejecutables falsos.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/ui/visual-directions/TASK-1552-globe-producer-composer-focused-creation.md`
- `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`

## Dependencies & Impact

### Depends on

- `TASK-1556` ✅ complete — foundation ADR-014: SSOT de tokens, capa de copy, primitives y shell del payload
  cliente. **Es de lo que esta superficie está hecha**; sin ella no hay dónde componer.
- `TASK-1505` — Producer surface y patrones existentes (dirección aprobada).
- `TASK-1532` — CTA único y estimate automático. **Flow y motion contract compartidos** con esta task.
- `TASK-1555` 🚧 in-progress — selector de modelo: dueño de la región `producer-model-*` **dentro del mismo
  archivo**. Coordinar orden.
- `TASK-1523` — dueña del SSOT de motion del payload cliente (`GLOBE_CLIENT_MOTION_CONTRACT_V1.md`) y de
  `GlobeGeneratingMark`, que esta superficie **consume**.
- `TASK-1531` — Creative Prompt Studio, si su propuesta se integra en el composer.
- `TASK-1553` 🚧 in-progress — resolución de modelo por-ruta. No bloquea la jerarquía, pero define cuántas
  opciones tiene que absorber el selector dentro del fold.
- `TASK-1494` ✅ complete — Style DNA/Reference Intelligence, cuando la UI exponga esas affordances.

### Blocks / Impacts

- **Bloquea `TASK-1560`** (retiro del payload legacy): mientras `producer-ui.ts` / `producer-controller.ts`
  existan siguen siendo la plantilla que el próximo agente copia.
- Mejora el first fold y la exposición de capacidades del Producer sin modificar contratos backend.
- Debe coordinar ownership de archivos con `TASK-1555` (misma superficie, mismo archivo), `TASK-1532` (CTA) y
  `TASK-1531` antes de implementación.
- No bloquea la librería, viewer ni las rutas de promoción; consume sus estados existentes.

### Files owned

- `../efeonce-globe/apps/studio-client/src/surfaces/producer/composer/ProducerComposer.tsx`
- `../efeonce-globe/apps/studio-client/src/surfaces/producer/composer/producer-composer.css`
- `../efeonce-globe/apps/studio-client/src/copy/index.ts` → namespace `producerComposer` (**sólo ese namespace**)
- `../efeonce-globe/apps/studio-client/scripts/producer-composer-canary.mjs` (**a crear**, junto a
  `producer-feed-canary.mjs` / `producer-motion-canary.mjs`)
- `docs/ui/visual-directions/TASK-1552-globe-producer-composer-focused-creation.md`
- `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`

**NO owned — colisiones declaradas:**

- `apps/studio-web/src/producer-ui.ts` · `producer-controller.ts` · `producer-copy.ts` → **legacy, owned por
  `TASK-1560`** (retiro). Esta task no los edita; a lo sumo deja de depender de ellos.
- `apps/studio-web/scripts/producer-gvc-fixture.mjs` → fixture del **payload legacy**. Sirve como referencia de
  estados, no como el canary de esta superficie.
- La región `producer-model-*` **dentro de** `ProducerComposer.tsx` → **owned por `TASK-1555`** (selector de
  modelo, `in-progress`). **Las dos tasks editan el mismo archivo**: coordinar orden antes de tomar esta, o el
  rediseño de jerarquía pisa el desplegable recién aceptado por el operador.
- `apps/studio-client/src/primitives/GlobeGeneratingMark.tsx` + su CSS → contrato de motion owned por
  `TASK-1523`. Acá se **consume**.

## Current Repo State

### Already exists

- **El composer PORTADO al payload cliente**: `ProducerComposer.tsx` (45 KB) + `producer-composer.css`, montado
  en `/producer` dentro de `ProducerWorkspace`, hermano del feed. Conversión 1:1 desde el legacy —
  estructura, chips y copy—, deliberadamente **sin recrear**.
- Regiones ya montadas: prompt bar, reference tray, negative prompt, `advanced-controls`, style, seed,
  route/model (selector de `TASK-1555`), output shape y riel de estimado.
- Namespace de copy `producerComposer` en `apps/studio-client/src/copy/index.ts`.
- Transporte gobernado (epoch, idempotencia, refresh single-flight) y `composer-recipe.ts` con sus 17 tests
  (modelo de vigencia del estimado, dueña `TASK-1532`).
- Primitive `GlobeGeneratingMark` con sus 4 `@keyframes`, ya consumida por el composer y por el feed.
- 11 marcadores `data-capture` y 3 `aria-live` en la superficie.
- Estimate server-side y CTA contract de `TASK-1532`; Creative Prompt Studio propuesto en `TASK-1531`.

### Gap

- **La jerarquía sigue siendo la del legacy**: el port conservó el orden y la densidad de origen, que es
  exactamente el problema que esta task existe para resolver.
- `advanced-controls` está **`open` por defecto** — la progressive disclosure no existe todavía.
- La modalidad aparece duplicada dentro y fuera del composer.
- Sugerencias y presets forman una pared de chips sin jerarquía.
- Seed, modelo y governance compiten con la intención creativa.
- Referencias no disponibles pueden ocupar espacio dominante.
- **Cero `@keyframes` en el CSS del composer**: la atenuación del estimado y las transiciones de popover que el
  contrato de motion declara obligatorias **no están implementadas**.
- Faltan 3 de los marcadores `data-capture` que la evidencia necesita, y no existe canary de esta superficie.
- `producer-copy.ts` legacy sigue vivo en paralelo al namespace nuevo: dos fuentes de verdad.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-client/src/surfaces/producer/composer` (payload cliente ADR-014),
  servido por `apps/studio-web` bajo `GLOBE_CLIENT_APP_ENABLED` + `GLOBE_CLIENT_PRODUCER_ENABLED`
- Future candidate home: `remain-shared`
- Boundary: UI consumer over existing Producer catalog, estimate, run, provenance and prompt contracts
- Server/browser split: browser owns presentation, disclosure and focus; Globe readers/commands own catalog, estimate, policy, access, provenance and generation
- Build impact: bundle Vite de `studio-client` (TSX/CSS/tests/canary) únicamente; no new dependency, package or runtime
- Extraction blocker: same-origin session/BFF, Producer state and current Globe pattern registry

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador creativo autenticado de Globe Producer.
- Momento del flujo: antes de generar una pieza Image, Video o Audio.
- Resultado perceptible esperado: entender qué crear, ajustar lo mínimo necesario y generar sin navegar un panel técnico.
- Fricción que debe reducir: densidad, duplicación, jerarquía débil y controles avanzados expuestos demasiado pronto.
- No-goals UX: ocultar capacidades, ocultar créditos, rediseñar todo el feed o convertir el composer en chat.

### Surface & system decision

- Surface: `/producer` → `ProducerWorkspace` → `composer/ProducerComposer.tsx`. **El composer no tiene ruta
  propia**; convive con el feed como hermano dentro del workspace.
- Composition Shell: `no aplica` — **y es regla dura, no conveniencia**: ADR-014 punto 8 / `TASK-1540` prohíben
  importar `CompositionShell`, primitives de Greenhouse, MUI o AXIS dentro de `apps/studio-client`. Globe
  materializa sus propios tokens y componentes.
- Primitive decision: `extend` — primitives del payload cliente
  (`apps/studio-client/src/primitives/index.tsx`: `Chip`, `Eyebrow`, `FactList`, `StateBlock`, `MediaStage`,
  `GlobeGeneratingMark`). **No crear primitive nueva en esta task**: una primitive con un solo consumer es una
  hipótesis, y se promueve sólo cuando una segunda superficie la consume **sin modificarla**.
- Adaptive density / The Seam: `aplica` — el composer debe recomponerse a 390 px sin compresión ni overflow.
- Floating/Sidecar/Dialog decision: conservar el lane existente; advanced settings pueden usar el patrón Globe vigente sólo si superan el fold.
- Copy source: `../efeonce-globe/apps/studio-client/src/copy/index.ts` — este slice **absorbe** `producer-copy.ts` **moviéndolo** (studio-web depende de studio-client: el copy viaja en esa dirección y nunca de vuelta). Duplicarlo abre dos fuentes de verdad cuyo drift es invisible hasta que una etiqueta queda vieja.
- Access impact: `entitlements` existentes; sin cambio de autorización.

### State inventory

- Default: prompt vacío, dirección compacta, output shape mínimo y ajustes avanzados cerrados.
- Loading: estados de estimate/prepare/run de `TASK-1532` dentro del mismo CTA.
- Empty: prompt vacío con orientación breve, sin pared de sugerencias.
- Error: mensaje canónico y recovery contextual.
- Degraded / partial: catálogo, references o capabilities no disponibles se muestran como gated/partial honestos.
- Permission denied: estado de capability sin raw error ni control ejecutable.
- Long content: prompt y labels envuelven sin romper el layout.
- Mobile / compact: columna única, CTA 44 px, disclosures usables y cero overflow.
- Keyboard / focus: focus visible; disclosure y CTA no roban foco; focus restore determinista.
- Reduced motion: estados y disclosure conservan significado sin transición espacial.

### Interaction contract

- Primary interaction: prompt → dirección/formato → CTA único `Generar`.
- Hover / focus / active: estados equivalentes en pointer, teclado y touch.
- Pending / disabled: sólo disabled por input/capability inválidos o command activo; estimate stale sigue resolviéndose por `TASK-1532`.
- Escape / click-away: no aplica al composer base; si advanced settings usan sheet, reutilizar contrato Globe existente.
- Focus restore: vuelve al control que abrió/cerró disclosure; el CTA conserva foco durante estimate/prepare/run.
- Latency feedback: reutiliza estados textuales de `TASK-1532`; no porcentajes inventados.
- Toast / alert behavior: errores persistentes en el bloque de ejecución; no depender sólo de toast.

### Motion & microinteractions

> ⚠️ **Corregido 2026-07-25.** Esta sección decía `Motion primitive: none`, y eso contradecía al contrato de
> motion que la propia task declara en Status. `Motion: none` en una task de superficie **es una alarma, no un
> default**: `TASK-1559` se autorizó así y el feed shippeó con 4 de 11 animaciones del diseño aprobado. El
> contrato manda; esta sección lo resume.

- Contrato gobernante: `docs/ui/motion/TASK-1552-...-motion.md`, aplicación del **SSOT**
  `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md` (dueña `TASK-1523`).
- Motion primitive: **`GlobeGeneratingMark`, que se CONSUME** (ya existe, con sus 4 `@keyframes`); no se crea ni
  se reimplementa una segunda versión.
- El motion load-bearing de esta superficie es **la atenuación del estimado**: es la única señal de que el número
  en pantalla dejó de corresponder a lo que el botón va a ejecutar. Se dispara **sincrónica con el cambio de
  campo**, antes del debounce.
- Enter / exit: popover de ruta/estilo/voz con `--duration-overlay` / `--ease-enter`; anillo de foco con
  `--duration-short`.
- Layout morph: **ninguno**. El cambio del set de campos por capability es un salto deliberado — animar la altura
  de un formulario que cambia de contenido cuesta y no informa.
- Stagger: none.
- Timing / easing token: `--duration-none|short|overlay|breathe|flame|progress`, `--ease-enter|linear|pulse`.
  **Cero ms literales** — el gate de diseño de `studio-client` los rechaza como error.
- Reduced-motion fallback: `@media (prefers-reduced-motion: reduce)`, sin detección JS. ⚠️ **La atenuación del
  estimado NO se apaga**: se acorta la transición y el estado atenuado se conserva, porque no es decoración —
  es información sobre plata. El isotipo queda **en el DOM con la animación apagada**.
- Non-goal motion: parallax, loops, confetti, contadores animados en el riel de créditos, progreso ficticio o
  animaciones que retrasen control.

### Implementation mapping

- Route / surface: `/producer` (`main.tsx` → `ProducerWorkspace` → `composer/ProducerComposer.tsx`) en
  `../efeonce-globe/apps/studio-client`, servido por `studio-web` detrás de los dos flags.
- Primitive / variant / kind: primitives del payload cliente; sin variant nueva.
- Component candidates: las regiones ya montadas en `ProducerComposer.tsx` — prompt bar, reference tray,
  negative prompt, `advanced-controls`, style, seed, route/model, output shape, estimate rail — recompuestas;
  más los tokens del SSOT y `GlobeGeneratingMark`. El transporte gobernado (`governed-transport.ts`,
  `composer-recipe.ts`) se consume tal cual.
- Copy source: `apps/studio-client/src/copy/index.ts` → namespace `producerComposer` (ya existe). El
  `producer-copy.ts` legacy **se absorbe moviendo lo que falte**, nunca duplicando: dos fuentes de verdad cuyo
  drift es invisible hasta que una etiqueta queda vieja.
- Data reader / command: existing catalog, estimate, provenance, prepare/generate and prompt proposal contracts.
- API parity: no browser-side business logic; no endpoint/reader/command nuevo.
- Access / capability: current Globe capabilities/grants.
- States to implement: default, prompt entered, advanced open/closed, gated modality, no references, ready/stale estimate, estimating, preparing, running, invalid and error.

### GVC scenario plan

> ⚠️ **Corregido 2026-07-25.** El plan anterior apuntaba al fixture del **payload legacy**
> (`apps/studio-web/scripts/producer-gvc-fixture.mjs`) y a comandos `pnpm fe:capture`, que son de **Greenhouse**.
> Globe corre canaries propios en `apps/studio-client/scripts/` con Playwright. Y de los 6 marcadores
> declarados, **sólo 1 existía en el runtime**.

- Scenario file: `../efeonce-globe/apps/studio-client/scripts/producer-composer-canary.mjs` (**a crear**,
  siguiendo `producer-feed-canary.mjs` + `producer-motion-canary.mjs`; puerto propio, `CANARY_URL` override).
- Route: `http://127.0.0.1:<puerto>/producer` con el composer montado.
- Viewports: `1440×1000`, `390×844` **y `320`** — a 320 los campos de Salida pasan a una columna, y en el feed
  ya pasó que un chip decidiera el ancho de la página a 320 sin verse a 390.
- Quality profile: `premium`.
- Required steps: Image/Video/Audio, prompt, direction, output shape, advanced disclosure, no-reference route, stale estimate, one-click generate, keyboard and reduced motion.
- Required captures: first fold, advanced closed/open, modality variants, gated/invalid and ready/stale CTA.
- Required `data-capture` markers — **medidos contra el runtime**, no inventados:
  - ya existen y se conservan: `producer-prompt-bar`, `producer-reference-tray`, `producer-seed`,
    `producer-route`, `producer-output-shape`, `producer-estimate`;
  - existen y son de `TASK-1555` (no renombrar acá): `producer-model-picker`, `producer-model-trigger`,
    `producer-model-list`, `producer-model-option`, `producer-model-recommended`;
  - **a agregar por esta task**: `producer-composer` (raíz), `producer-advanced-settings` (el `<details>`),
    `producer-generate-primary` (el CTA).
- Assertions: exactly one primary CTA; no manual estimate button; no duplicated cost line; no dominant empty references panel; no provider slug/vendor cost/margin; no horizontal overflow.
- Scroll-width checks: `document.documentElement.scrollWidth === document.documentElement.clientWidth` desktop and 390 px.
- Reduced-motion / focus evidence: disclosure, CTA state changes and keyboard navigation.
- Review dossier: `.captures/<run>/review/`.
- Baseline decision / surface ID: `globe.creative-producer-surface` after first-fold acceptance.

### Design decision log

- Decision: Focus + Context sidecar with progressive disclosure.
- Alternatives considered: technical compact composer; centered modal composer.
- Why this pattern: mantiene el loop aprobado de Producer y reduce competencia visual sin eliminar capacidades.
- Reuse / extend / new primitive: extend existing Globe Producer patterns; no parallel primitive/system.
- Open risks: coordinación de ownership con 1505/1531/1532 y composición de advanced settings en mobile.

### Visual verification

- GVC scenario: `task-1552-focused-composer`.
- Viewports: 1440×1000 and 390×844.
- Required captures: first fold, each modality, advanced disclosure, gated/invalid, CTA states.
- Required `data-capture` markers: all markers listed above.
- Scroll-width check: page and open surfaces must have no horizontal overflow.
- Accessibility/focus checks: labels, keyboard disclosure, visible focus, live states, reduced motion and 44 px targets.
- Before/after evidence: current Producer screenshot and focused-composer capture.
- Known visual debt: none accepted in first fold; gated capability styling may remain task-owned by backend/runtime owners.
- Visual scorecard: `docs/ui/reviews/TASK-1552-globe-producer-composer-focused-creation.scorecard.json`.
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/generic-template resistance >= 4.5`.

<!-- ZONE 2 — se completa al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

> **Punto de partida medido:** los tres slices operan sobre `ProducerComposer.tsx` **ya portado**, no sobre una
> superficie por construir. Ninguno reescribe el transporte, el modelo de vigencia del estimado ni el selector
> de modelo.

### Slice 1 — First-fold composer hierarchy

- Remove duplicated modality/title chrome inside the composer.
- Make prompt, direction and output shape the dominant creation path.
- Replace the suggestion chip wall with compact direction choices.
- Preserve the existing CTA and route/model semantics while reducing visual competition.
- Conservar el **riel de estimado fijo al pie**: es la información que decide el gasto y no puede perderse al
  scrollear.

### Slice 2 — Progressive disclosure and modality recomposition

- Cerrar `advanced-controls` por defecto (hoy es `open`) y agrupar bajo él model, seed, Style DNA, referencias y
  controles de governance.
- Render only modality-relevant controls for Image, Video and Audio. ⚠️ **El set de campos se deriva del
  catálogo, nunca de un `switch` sobre `capability` en el render**: una capability nueva server-side produciría
  un composer sin campos, en silencio.
- Keep unavailable references/capabilities honest without dominant empty panels; ninguna opción deshabilitada
  sin su razón visible (`title`), porque con motion apagado el texto es el único canal que queda.
- Ensure advanced settings remain keyboard-accessible and usable at 390 px; el `<details>` no puede ocultar bajo
  el foco (si el foco queda adentro al cerrar, moverlo antes a un ancla estable).

### Slice 3 — Execution states, motion and visual verification

- Integrate the `TASK-1532` CTA states without a second estimate button or duplicated cost line.
- Implementar el contrato de motion: atenuación sincrónica del estimado, transición del popover, isotipo
  consumido, y el fallback de `prefers-reduced-motion` que **conserva** el estado atenuado.
- Agregar los 3 marcadores faltantes (`producer-composer`, `producer-advanced-settings`,
  `producer-generate-primary`) sin renombrar los de `TASK-1555`.
- Crear `producer-composer-canary.mjs` y registrar sus tests en el script `test` del package.
- Capture, inspect and score desktop/mobile/320 first fold y estados clave.

## Out of Scope

- Changes to estimate, credit, balance, hard-cap, prepare, execute or spend contracts.
- Hiding credits or exposing vendor cost/margin.
- New API, reader, command, schema, migration, provider integration or capability.
- Full feed, viewer, collections, batch, review or share redesign.
- Crear el token SSOT / design system de Globe — entregado por `TASK-1556` Slices 2-3 (`apps/studio-client/src/{tokens/tokens.ts,copy/index.ts,gates/design-contract.test.ts}`, `eslint.config.js`); esta task lo consume. Tampoco crea primitives Greenhouse.
- Replacing the approved `TASK-1505` baseline; this task refines its composition.
- **Rediseñar el selector de modelo** (`producer-model-*`): es `TASK-1555`, ya vivo y **ya rechazado una vez en
  su versión galería**. Acá sólo se decide **dónde vive dentro de la jerarquía**, no su forma interna.
- **Autorar el contrato de motion del payload cliente** ni crear/modificar `GlobeGeneratingMark`: SSOT y
  primitive son de `TASK-1523`. Acá se aplican.
- **Borrar el payload legacy** (`producer-ui.ts` / `producer-controller.ts` / `producer-copy.ts`) ni ampliar la
  frontera del gate de diseño a `apps/studio-web`: es `TASK-1560` Slices 2 y 5.
- **Crear la ruta `/producer/compose`** ni cualquier URL paralela del composer.
- **Prender los flags** `GLOBE_CLIENT_APP_ENABLED` / `GLOBE_CLIENT_PRODUCER_ENABLED` en un entorno vivo: el
  cutover es decisión de rollout con su propia verificación, no un efecto colateral de esta task.

## Detailed Spec

The selected direction is documented in `docs/ui/visual-directions/TASK-1552-globe-producer-composer-focused-creation.md` and the layout/state contract in `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`.

The implementation must preserve the following product loop:

```text
prompt → direction → output shape → optional advanced settings → Generar · créditos → feed/viewer
```

The visible cost contract is owned by `TASK-1532`: the CTA shows `Generar · {credits} créditos` when current, otherwise transitions through the canonical estimating/preparing/running states. No separate estimate line or manual estimate action is introduced by this task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 MUST establish the first-fold hierarchy before Slice 2 exposes advanced disclosures.
- Slice 2 MUST preserve modality/capability truth before Slice 3 captures evidence.
- Slice 3 MUST pass desktop/mobile visual review before the task is considered code complete.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Advanced settings disappear or become inaccessible | UI | medium | Preserve existing controls, keyboard tests and marker-based GVC | missing control in state inventory or failed focus capture |
| New composition contradicts approved Producer baseline | UI | medium | Source/direction review against TASK-1505 before implementation | scorecard fidelity or hierarchy below threshold |
| Cost is duplicated or hidden | UI | low | Reuse TASK-1532 CTA contract and explicit DOM assertion | extra cost line or missing credits in ready CTA |
| Gated capability appears executable | UI/runtime | medium | Server-backed capability states and fixture assertions | enabled control without positive capability evidence |

### Feature flags / cutover

**Sin flag nueva**, pero **no sin flag**: la superficie ya está gateada por `GLOBE_CLIENT_APP_ENABLED` +
`GLOBE_CLIENT_PRODUCER_ENABLED` (`infra/terraform/cloud_run_services.tf:136-137`). Ese par es el kill switch
real — apagarlo devuelve el payload legacy en `/producer` sin tocar código. Rollback preferente: revert del
cambio UI; rollback de emergencia: flip del flag **en Terraform** (`gcloud` sobre estos servicios es out-of-band
y muere en el próximo `tofu apply`, en silencio). No muta datos ni contratos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 1 | Revert de render/CSS/copy del composer y restauración del bloque anterior | <30 min | sí |
| 2 | Desactivar disclosures mediante revert, manteniendo contratos y estados existentes | <30 min | sí |
| 3 | Revert markers/fixture/captures; no afecta runtime de generación | <15 min | sí |

### Production verification sequence

1. Ejecutar checks focales y validar task/wireframe/readiness.
2. Capturar fixture local en 1440×1000 y 390×844.
3. Revisar first fold, estados CTA, teclado, reduced motion y scroll width.
4. Verificar integración de `TASK-1532` sin estimate button duplicado.
5. Promover sólo después de scorecard premium y revisión humana del runtime internal-only.

### Out-of-band coordination required

N/A — repo-only task/documentation plus UI changes in the Globe runtime owned by the linked implementation task; no cloud, billing, provider or access mutation.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Se mantiene `Execution profile: ui-ux`, `UI impact: flow`, `UI ready: no` hasta completar mapping, GVC plan y decision log; al pasar a `yes`, `pnpm task:lint --task TASK-1552` queda en cero findings.
- [ ] Existe `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md` y pasa `pnpm ui:wireframe-check --task TASK-1552`.
- [ ] El composer tiene una sola jerarquía primaria: prompt → dirección/output shape → CTA Generate.
- [ ] No existe selector/título de modalidad duplicado dentro del composer.
- [ ] Modelo, seed, Style DNA, referencias y controles avanzados permanecen accesibles mediante progressive disclosure o estado contextual honesto.
- [ ] Imagen, Video y Audio muestran sólo los controles relevantes para su modalidad y no presentan capacidades gated como activas.
- [ ] El CTA reutiliza `TASK-1532`: no hay botón manual `Calcular costo`, no se duplica la línea de costo y el estimate vigente aparece dentro del CTA.
- [ ] El prompt, disclosures, CTA y estados son operables por teclado, tienen focus visible, targets táctiles de 44 px y equivalencia reduced-motion.
- [ ] GVC premium captura 1440×1000 y 390×844, con first fold, estados clave y evidencia revisada en dossier.
- [ ] `scrollWidth === clientWidth` en desktop y mobile, incluyendo disclosures abiertos.
- [ ] La evidencia visual alcanza el scorecard definido: promedio ≥4.5, ninguna dimensión <4, jerarquía/economía/impacto/resistencia a template ≥4.5.

### Criterios del GASTO — migrados de TASK-1564 (retirada), no negociables

Estos son los que hacen que el composer no gaste crédito sobre información falsa. El flow contract los desarrolla
con sus cuatro compuertas (`docs/ui/flows/TASK-1552-...-flow.md`).

- [ ] **G1 — estimado vigente.** `execute` **no está disponible** sin estimado que corresponda a la recipe en
      pantalla. No es una advertencia: es el botón deshabilitado. Sin esto, un operador ve "12 cr", cambia la
      cantidad a 4 y ejecuta creyendo que gasta 12.
- [ ] **G2 — grant.** Sin `lab.experiment.execute` el botón está deshabilitado **con su razón**, y el resto del
      composer **sigue usable** (se puede escribir y estimar). Ni bloquear toda la superficie ni dejar apretar
      para fallar después de escribir todo.
- [ ] **G3 — clave compartida.** La clave de idempotencia **nace en `prepare` y se reusa en `execute`**. Una
      clave nueva por intento convierte un reintento en gasto nuevo.
- [ ] **G4 — no re-apretable.** Mientras `prepare`/`execute` están en vuelo el botón está en pendiente.
      Verificado contando llamadas: **doble click produce UNA** llamada a `execute`.
- [ ] La vigencia se evalúa por los **dos ejes observables** (forma vía `recipeKey`, tiempo vía
      `estimateExpiresAt`); el tercero —cambio de tarifa— lo cubre el servidor invalidando el `approvalToken`.
      **Ya implementado** en `apps/studio-client/src/data/composer-recipe.ts` (17 tests, commit `feffd47`) — ver
      el Delta de `TASK-1532`, que es su dueña.
- [ ] El costo va **en el botón** además del riel (patrón medido de Higgsfield): son dos preguntas distintas.
- [ ] Un estimado stale **se conserva atenuado**, nunca en blanco — un riel vacío se lee como "no cuesta nada".
- [ ] `routeId` **no aparece en el DOM servido** en ninguno de los tres anchos, con el selector abierto.
- [ ] Un modelo no listo se muestra **deshabilitado con su motivo**, nunca oculto.
- [ ] Las cuatro razones de negación se distinguen, y "Reintentar" aparece **sólo donde puede funcionar**.
- [ ] Las afordancias sin contrato (inpaint, batch) van **deshabilitadas con su razón visible**.
- [ ] El prompt escrito **no se pierde ante ningún error**, incluida sesión expirada.
- [ ] Canary a 1440/390/**320**, sin overflow de página ni de panel, más pasada con `prefers-reduced-motion`.
- [ ] Scorecard visual: promedio ≥ 4.5, piso ≥ 4, fidelidad y resistencia a template ≥ 4.5.

## Verification

**En `greenhouse-eo`** (control plane documental):

- `pnpm task:lint --task TASK-1552`
- `pnpm ui:wireframe-check --task TASK-1552`
- `pnpm ui:readiness-check --task TASK-1552`
- `pnpm ui:quality --task TASK-1552`

**En `../efeonce-globe`** (runtime — toolchain independiente; **NO** correr acá los comandos de Greenhouse):

- `pnpm check && pnpm build` (typecheck NodeNext strict + `node --test`)
- `node apps/studio-client/scripts/producer-composer-canary.mjs` en los dos modos de
  `prefers-reduced-motion`, y a 1440 / 390 / 320
- Gates de `studio-client`: `src/gates/design-contract.test.ts` (color/motion/tipografía/copy literal) +
  `src/gates/reduced-motion.test.ts`
- ⚠️ **Todo `*.test.ts` nuevo se agrega a mano al script `test` de `apps/studio-client/package.json`** — no hay
  glob ni descubrimiento: un test no registrado nunca corre y la suite queda verde por no haberlo mirado.
- Revisión manual desktop/mobile, teclado, reduced motion y no overflow (de página **y de panel**)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre TASK-1505, TASK-1531 y TASK-1532.
- [ ] Se archivó el dossier visual y scorecard premium.

## Follow-ups

- Si la evolución hacia `Creative Suite` requiere IA común entre Producer y Workbench, coordinar con `TASK-1523`.
- Si los advanced settings necesitan un patrón reusable de Globe, evaluar su ownership con `TASK-1485`.

## Open Questions

- Confirmar durante Discovery si el disclosure de ajustes avanzados puede permanecer inline en 390 px o debe usar el sheet existente de Globe; no bloquea la dirección, pero sí la implementación final.
