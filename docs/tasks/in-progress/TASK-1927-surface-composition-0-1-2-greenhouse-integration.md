# TASK-1927 — Integrar en Greenhouse el contrato de superficie 0.1.2 (portada, cierre, layouts y brochure)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->


## Delta 2026-09-27 (d) — frontera con TASK-1928…TASK-1932

- Se registraron las cinco piezas que llevan las 69 recetas al flujo de producto: TASK-1928 (plantillas de las 38
  recetas sin plantilla ni dueña), TASK-1929 (plan validado contra el catálogo), TASK-1930 (datos reales en los slots),
  TASK-1931 (banco de plates) y TASK-1932 (salida desde Proposal Studio con Nexa/MCP).
- **Esta task conserva** lo que sus deltas (b) y (c) ya declaraban: las portadas y contraportadas aprobadas (13
  `cover-brochure-*`/`cover-proposal-*` y 5 `close-*` del catálogo de recetas, las que AXIS declare `approved`),
  `section-split` corregida más `section-split-corner-bottom` y `section-split-panel-end`, el `triptych` de una palabra
  por toma con su esfera, y los pendientes de QA de esas láminas (respuesta ≥ 3× en «Cuando quieras.», logo dentro de
  la órbita en el cierre, dirección desde `EFEONCE_CONTACT`). Se agregan como criterios abajo, porque prosa no es
  criterio.
- **Pasa a TASK-1928** el resto de las recetas sin plantilla, incluida `decision-next-steps` (el delta c la nombra como
  cambio del canon; su plantilla es de 1928). La validación del plan contra el catálogo es de TASK-1929 y se apoya en
  `resolveSurfaceDocument` sin duplicarlo.

## Delta 2026-09-27 (c) — las 69 láminas aprobadas, con receta por lámina

- El operador aprobó **las 69 láminas** del canvas «Deck»; cada una tiene receta (slots con `maxChars` medido, fijos,
  selección, pares, foto y prompt) en [`deck-recipes/`](../../operations/brand-graphic-line/deck-recipes/README.md)
  (JSON `efeonce.deck-slide-recipes.v1`, validado con `pnpm brand:deck-recipes`). Es el **contrato de slots** de las
  plantillas que esta task lleva al catálogo `graphic-line-deck`.
- **Cambios que la integración debe reflejar** (norma §4.6 «Recetas por lámina», §6 filas 19 y 21–24): `sectionSplit`
  de `src/lib/brand-surfaces/recipes/deck.ts` y el token AXIS (`progress.flipped`) suben por la **izquierda** y suman
  `section-split-corner-bottom` y `section-split-panel-end`; `triptych` pasa a una palabra por toma con su esfera
  (`voice.mode`); `decision-next-steps` a la agenda abierta; lo que AXIS marca como `option` pasa a aprobado; el issue
  `cine-requires-nexa-or-proposal` debe admitir la excepción de secciones y «about».
- **Pendientes de QA a resolver en la plantilla** (lista en el README del catálogo): respuesta ≥ 3× la pregunta, acento
  fuera de texto < 24 px, fuente visible de cifras, burbuja URL en partners, logo dentro de la órbita en el cierre y
  `EFEONCE_CONTACT` en los contactos. El visual gate (`pnpm composer:visual-gate --catalog=graphic-line`) sigue siendo
  la condición de cada plantilla nueva.

## Delta 2026-09-27 (b) — set de portadas y contraportadas aprobado

- El operador **aprobó el set completo** de portadas, contraportadas y láminas de sección del brochure y de la propuesta
  comercial. Norma completa, catálogo, receta medida de la columna de voz y descartes:
  `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 «Portadas y contraportadas». Supera las
  «opciones vivas» del delta anterior.
- Brochure: portada con foto (voz «¿Qué hace Efeonce? Crecer.») y **cinco portadas por línea** con el acento de su línea
  y su par aprobado; contraportadas con «¿Conversamos? Cuando quieras.» y el eslogan de firma (órbita gigante sin foto,
  y dos con foto).
- Propuesta: **cuatro portadas sin foto** con el logo del cliente (órbita gigante y amanecer, plantilla y ejemplo SKY;
  voz «¿Cómo crecemos en 2027? Con foco.») y **dos contraportadas con foto** con «Empower your Growth» como mensaje
  principal.
- Reglas nuevas: foto ↔ sin foto, mensaje de contraportada según el documento, voz en la portada, eslogan sólo en el
  cierre, logo de Efeonce a 500 px en 1920, ningún texto cruza la órbita ni al sujeto, selección sólo sobre la columna
  o el logo del cliente (un cursor en 16:9).
- **Descartadas** las portadas clásicas de propuesta del contrato (logo 230, y su versión a 500) y el cierre clásico
  (logo 220) como contraportada. Su ajuste ya estaba asignado a esta task; qué hacer con esas recetas en el contrato
  (retirarlas o reemplazarlas) se confirma con el operador.
- Sus recetas se están publicando en **AXIS Lab › Superficies › Deck** (formalización en curso). **La integración en
  Greenhouse — renderizar estas portadas y contraportadas desde el contrato — queda en el alcance de esta task.**

## Delta 2026-09-27 — portadas y contraportadas decididas en el canvas

- Regla del operador: **portada con foto ↔ contraportada sin foto, y al revés** (brochure y propuesta). La validación
  natural es `resolveSurfaceDocument` (issue de documento cuando portada y cierre repiten modo). Detalle y parejas:
  `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6.
- La portada de propuesta lleva **espacio fijo para el logo del cliente** dentro de la órbita y la burbuja URL alineada
  a la columna; el brochure no lleva cliente.
- Aprobadas en el canvas: contraportada «Nexa camina hacia la órbita» y la página interior «Nuestro equipo».
  Opciones vivas: portada «órbita gigante», portadas de propuesta con cliente, contraportada «órbita gigante».
- Medido: el logo de las recetas clásicas (230/220 px) queda en 45–47 px en un teléfono, bajo el mínimo de AXIS de 96 px.

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Implementacion — hechos bump AXIS, mapper (use/layout/anchor), hero y lines, triptico por palabra y documento multipagina; faltan las 18 portadas y contraportadas y section-split por la izquierda (esperan tokens nuevos en AXIS), docs y skills`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; AXIS main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

> **Perfil inferido (ajustable):** `standard` con `Backend impact: none`. Es tooling local del Artifact Composer
> (mapper puro, plantillas del catálogo y el CLI `pnpm brand:compose`): sin base de datos, sin API, sin UI del portal.
> La ruta productiva gobernada que sí es backend es [TASK-1921](TASK-1921-brand-surface-pieces-governed-production-route.md).
> P2 porque el brochure hoy se arma fuera del composer (`ai-generations/2026-09-27_brochure/`), no porque algo esté roto.

## Summary

AXIS publicó el 2026-09-27, con el tag `v0.3.9`, la versión **0.1.2** del contrato `efeonce.surface-composition`
(`@efeoncepro/axis-tokens` 0.3.9 + `@efeoncepro/axis-ui-contracts` 0.3.8). Trae el campo `use` (`proposal` |
`brochure`), las recetas aprobadas `cover-classic` y `close-classic`, los layouts `service` | `hero` | `lines` de
`proposal-cinematic`, `selection.anchor` y una API de documento (`resolveSurfaceDocument` / manifest
`axis.surface-document.v1`). Esta task sube Greenhouse a esa versión y la hace componible: plantillas nuevas en
`graphic-line-deck`, el mapper `src/lib/brand-surfaces` extendido y `pnpm brand:compose` capaz de producir un brochure
multipágina en un solo PDF, con el gate visual a cero píxeles y todo cambio de píxel declarado.

## Why This Task Exists

Greenhouse fija hoy `@efeoncepro/axis-tokens` 0.3.8 y `@efeoncepro/axis-ui-contracts` 0.3.7 (contrato 0.1.1). Con eso:

- **La portada y el cierre no se pueden componer.** El deck de «La órbita» tiene seis recetas en el catálogo, pero la
  lámina que abre y la que cierra (logo, eslogan en tres tramos) no son recetas del contrato 0.1.1: se pintan a mano
  con `deckSlideHtml('cover' | 'close')`. Un deck o un brochure nunca sale entero de `brand:compose`.
- **`proposal-cinematic` tiene un solo cuerpo.** Las seis láminas aprobadas usan tres composiciones distintas (servicio,
  Nexa como protagonista, portafolio de líneas) que el mapper actual no distingue; `hero` y `lines` se arman fuera del
  composer.
- **El brochure no tiene forma validada.** El operador decidió (2026-09-27) que las láminas del deck también hacen un
  brochure 16:9 que se lee sin presentador. AXIS ya valida el documento como un todo (portada primero, cierre al
  final, al menos una página de servicio, navegación coherente, una línea por documento); Greenhouse no lo consume y
  hoy el brochure se compone con un script ad hoc (`ai-generations/2026-09-27_brochure/componer-brochure.mjs`).
- **La documentación viva describe 0.1.1.** `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 y §7, el manual de uso y las
  skills `deck-studio` y `efeonce-graphic-line` no conocen `use`, portada, cierre, layouts ni documento.

## Goal

- Greenhouse consume `@efeoncepro/axis-tokens` 0.3.9 y `@efeoncepro/axis-ui-contracts` 0.3.8 sin romper ningún intent
  0.1.0/0.1.1 existente (el contrato 0.1.2 es aditivo).
- `cover-classic`, `close-classic` y los layouts `hero` y `lines` de `proposal-cinematic` son plantillas del catálogo
  `graphic-line-deck`, con builder en el mapper, ejemplo de intent y frame en el gate visual.
- `pnpm brand:compose` acepta un intent de documento (`axis.surface-document.v1`) y produce un PDF multipágina con su
  manifest de documento y su procedencia; un documento con issues de AXIS no se compone.
- Las 20 recetas aprobadas existentes siguen a 0 px, o su diferencia queda declarada lámina por lámina.
- Canon, manual y skills describen 0.1.2.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` (motor del Artifact Composer: domain-free,
  un autor nunca elige `template`, sólo el `ResolvedCompositionManifest` llega a render, render hermético)
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` (canon de composición por superficie; §2.1
  ruta por el composer, §4.6 deck, §7 estado)
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (línea gráfica «La órbita»; firma, eslogan)
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` +
  `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` (el motor nace extraction-ready)
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` (consumo de paquetes privados AXIS)
- Fuente del contrato (repo AXIS local `/Users/jreye/Documents/axis-design-system`):
  `docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md` §«Delta 2026-09-27 — 0.1.2»,
  `docs/agent-composition/surfaces/deck.md`, `docs/agent-composition/surface-document-intent.schema.json` y los
  ejemplos `docs/examples/surfaces/deck-*` (en particular `deck-cover-classic-*`, `deck-close-classic-*`,
  `deck-proposal-cinematic-*` y `deck-brochure-servicios-document*.json`)

Reglas obligatorias:

- AXIS es dueño de valores y contratos. **NUNCA** transcribir en una plantilla un px, un HEX o una fuente que el token
  o el manifest ya declaran: las reservas y la tipografía medidas de portada, cierre, `hero` y `lines` salen del
  manifest resuelto (`efeonceGraphicLine.surfaces.deck` / `pieces.deck.cover|close`). Si falta un token, se pide en
  AXIS; no se inventa en Greenhouse.
- El mapper sigue **puro** (intent → plan, sin filesystem ni render) y la validación la hace AXIS: si
  `resolveSurfaceComposition` o `resolveSurfaceDocument` devuelven `issues`, no se compone nada (ni la página válida
  de un documento inválido).
- Una receta entra al catálogo sólo si AXIS la declara `approved`. Las opciones siguen fallando con
  `recipe-not-approved`.
- El layout es **explícito** (`layout` del intent, default `service`), nunca inferido desde los campos presentes.
- La portada y el cierre firman con el logo y **sin burbuja URL** (regla `logo-signs-without-url-bubble`); el cierre
  lleva el eslogan en tres tramos desde `content.slogan`. Los cinco acentos sólo aparecen en `lines`
  (`five-accents-only-in-lines`).
- Gate visual a **cero píxeles**: todo cambio de píxel de las 20 recetas aprobadas se declara en
  `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md` antes de `--freeze`; `--freeze` es single-owner,
  serializado y atómico con su commit. El drift de fotos raster es `ISSUE-122`, nunca motivo de rebaseline.

## Normative Docs

- `docs/operations/runbooks/composer-visual-gate.md` (scope `graphic-line`, §3 flujo de freeze, §4 ISSUE-122)
- `docs/issues/open/ISSUE-122-composer-visual-gate-photo-nondeterminism-concurrency-docs.md`
- `docs/manual-de-uso/creative/componer-por-superficie-con-axis.md`
- `docs/tasks/complete/TASK-1919-graphic-line-surfaces-artifact-composer.md` (cómo quedaron el mapper, los catálogos,
  la procedencia y el scope del gate)
- `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md`

## Dependencies & Impact

### Depends on

- AXIS `v0.3.9` publicado (hecho el 2026-09-27): `@efeoncepro/axis-tokens` 0.3.9 y `@efeoncepro/axis-ui-contracts`
  0.3.8 en el registry privado. `[verificar]` que `pnpm view @efeoncepro/axis-ui-contracts@0.3.8` responda con la
  auth local del runbook de consumo.
  - **Nota 2026-09-27 (tarde) — ya hay `axis-tokens` 0.3.10** (tag `v0.3.10`; sólo cambió `axis-tokens`, el contrato
    0.1.2 y `axis-ui-contracts` 0.3.8 son los mismos). Esta task sigue fijando 0.3.9; si al tomarla se decide fijar 0.3.10 o más, el bump de tokens deja de ser
    neutro para los tests: `efeonceTokens.color` gana `info` y `src/@core/theme/axis-package-drift.test.ts` falla hasta
    agregar `info: axisSemanticHex.info` a `COMPATIBILITY_ROLES` en el mismo commit; `efeonceTokens.motion.standard`
    pasa de 220 a 200 ms (el test sólo mira claves y nada en Greenhouse lee ese valor). `axis-ui-contracts` 0.3.8
    depende de `axis-tokens` 0.3.9 exacto y `axis-graphic-line` 0.6.0 de 0.3.8, así que con 0.3.10 directo el lockfile
    resuelve 0.3.10, 0.3.9 y 0.3.8 a la vez. Detalle: runbook de consumo AXIS, Delta 2026-09-27 (c).
- `TASK-1919` (complete): catálogos `graphic-line-{deck,stills,overlays}`, mapper `src/lib/brand-surfaces`, CLI
  `pnpm brand:compose`, scope `graphic-line` del gate.
- `@efeoncepro/axis-graphic-line` 0.6.0 (ya fijado): pinta la órbita (`paintGraphicLine`) y `deckSlideHtml`.
  `[verificar]` si portada y cierre necesitan una versión nueva de este paquete o bastan las piezas
  `pieces.deck.cover|close` de `axis-tokens` 0.3.9.

### Blocks / Impacts

- `TASK-1921` (ruta productiva gobernada): cuando exista, su command debe aceptar también el intent de documento. Esta
  task no la construye; deja el mapper con la entrada de documento pura para que 1921 la reutilice. Agregar un
  `## Delta` en TASK-1921 al cerrar.
- `TASK-1926` (registro cine en `foto:*`): produce los plates que el brochure consume; no comparte archivos.
- `TASK-1923` (catálogo de Glitch): comparte el motor y el gate visual (scope distinto). Coordinar el orden de
  `--freeze` si ambas corren a la vez.
- Consumidores de las skills `deck-studio` y `efeonce-graphic-line` (agentes que arman decks y brochures).

### Files owned

- `package.json`, `pnpm-lock.yaml` (sólo las dos dependencias AXIS)
- `src/lib/brand-surfaces/index.ts`, `src/lib/brand-surfaces/shared.ts`, `src/lib/brand-surfaces/types.ts`
- `src/lib/brand-surfaces/recipes/deck.ts`
- `src/lib/brand-surfaces/document.ts` `[nuevo]`
- `src/lib/brand-surfaces/examples/deck-cover-classic-intent.json`, `deck-close-classic-intent.json`,
  `deck-proposal-cinematic-hero-intent.json`, `deck-proposal-cinematic-lines-intent.json`,
  `deck-brochure-document-intent.json` `[nuevos]`
- `src/lib/brand-surfaces/__tests__/**`
- `src/lib/artifact-composer/catalogs/graphic-line-deck/{cover-classic,close-classic}.{html,slots.json}` `[nuevos]`,
  `proposal-cinematic.html`, `proposal-cinematic.slots.json`, `registry.json`, `index.ts`,
  `graphic-line-tokens.css` (regenerado)
- `src/lib/artifact-composer/catalogs/graphic-line-shared/graphic-line-tokens.json` (regenerado)
- `scripts/brand-surfaces/compose.ts`, `scripts/brand-surfaces/compile-tokens.ts`, `scripts/brand-surfaces/__tests__/**`
- `scripts/frontend/baselines/artifact-composer/templates-graphic-line-deck/**`,
  `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`, `baseline-manifest.json`
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md`
- `docs/manual-de-uso/creative/componer-por-superficie-con-axis.md`
- `.claude/skills/deck-studio/**`, `.claude/skills/efeonce-graphic-line/**` y sus espejos `.codex/skills/**`

## Current Repo State

### Already exists

- Dependencias fijadas en `package.json`: `@efeoncepro/axis-tokens` `0.3.8`, `@efeoncepro/axis-ui-contracts` `0.3.7`,
  `@efeoncepro/axis-graphic-line` `0.6.0`, `@efeoncepro/axis-brand-assets` `0.3.4` (commit `016d0a183`).
- Mapper puro `src/lib/brand-surfaces/index.ts` (`planSurfacePiece`: exige receta aprobada → `resolveSurfaceComposition`
  → builder por receta), builders de deck en `recipes/deck.ts` (6 recetas: `proposal-cinematic`, `method-staircase`,
  `section-classic`, `section-split`, `content-measure`, `triptych`), 19 intents de ejemplo en `examples/`.
- Catálogo `src/lib/artifact-composer/catalogs/graphic-line-deck/` con una plantilla HTML + `slots.json` por receta,
  `registry.json`, tokens compilados (`graphic-line-tokens.css`) y fuentes locales.
- CLI `scripts/brand-surfaces/compose.ts` (`pnpm brand:compose -- --intent <intent.json> [--out] [--artifact-id]`):
  una pieza por invocación, materializa plates como data URI, escribe `<id>.surface-manifest.json` y la procedencia
  `efeonce.brand-surface-piece.provenance.v1` con las versiones AXIS instaladas.
- `pnpm brand:tokens` (`scripts/brand-surfaces/compile-tokens.ts`) compila los tokens de la línea al catálogo.
- El plan del composer ya admite varias láminas (`slides: SlideSpec[]` en `src/lib/artifact-composer/contracts.ts`).
- Gate visual con scope propio: `pnpm composer:visual-gate --catalog=graphic-line`, **22 frames a 0 px** (20 recetas
  aprobadas), baselines en `scripts/frontend/baselines/artifact-composer/templates-graphic-line-{deck,stills,overlays}/`.

### Gap

- Sin `cover-classic` ni `close-classic` en el catálogo ni en el mapper (en 0.1.1 no son recetas del contrato).
- `proposal-cinematic` sin `layout`: `hero` y `lines` (stack de `efeonceGraphicLine.lines` con `serviceName`, acento
  por línea, selección de grupo) no existen; `selection.anchor` no se lee.
- `use` no viaja del intent al manifest ni al eyebrow de la página de servicio.
- `brand:compose` no acepta un documento ni produce un PDF multipágina; no existe `resolveSurfaceDocument` en el
  árbol de consumo.
- `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 y §7 dicen 0.1.1; el manual y las skills tampoco conocen 0.1.2.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `src/lib/artifact-composer/catalogs/graphic-line-deck/` (plantillas), `src/lib/brand-surfaces/` (mapper puro, incluida la entrada de documento), `scripts/brand-surfaces/` (CLI local)
- Future candidate home: `worker`
- Boundary: el mapper expone dos funciones puras, `planSurfacePiece(intent)` y la nueva de documento (intent de documento → plan multilámina + assets), que consumen el CLI local y, en TASK-1921, el command gobernado; el motor del composer se consume sólo por su contrato público
- Server/browser split: sólo server y CLI; Chromium y la lectura de plates nunca van al browser ni a Vercel; el mapper no toca filesystem
- Build impact: sin dependencias nuevas; sólo sube dos paquetes AXIS ya presentes y agrega plantillas HTML al árbol del catálogo
- Extraction blocker: `none` (el render productivo ya vive en el Job `artifact-worker`; la frontera la cierra TASK-1921)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Subir AXIS y confirmar la compatibilidad

- `package.json`: `@efeoncepro/axis-tokens` 0.3.9 y `@efeoncepro/axis-ui-contracts` 0.3.8; `pnpm install` con lockfile.
- `pnpm brand:tokens` y `pnpm brand:tokens --check` limpios (tokens regenerados y commiteados).
- Los 19 intents de `src/lib/brand-surfaces/examples/` resuelven sin issues nuevos y sus planes no cambian (test de
  snapshot del plan o comparación explícita).
- `pnpm composer:visual-gate --catalog=graphic-line` a 0 px **sin** freeze. Si algo se mueve, se declara en
  `BASELINE_DELTAS.md` con la causa (cambio de token en AXIS) antes de congelar; si no se puede explicar, se detiene y
  se reporta a AXIS.

### Slice 2 — `use` y `selection.anchor` en el mapper

- `SurfaceIntent`/manifest llevan `use`; el eyebrow de `proposal-cinematic` en `use: 'brochure'` se toma del intent
  (nombra el servicio; es copy del autor, AXIS no lo valida).
- `selection.anchor` del manifest llega al adaptador de selección de Greenhouse (esquina del colaborador).
- Tests: intent 0.1.1 sin `use` sigue resolviendo `proposal`; `use-not-for-recipe` de AXIS aborta la composición.

### Slice 3 — Plantillas `cover-classic` y `close-classic`

- Plantillas HTML + `slots.json` en `graphic-line-deck`, registradas en `registry.json` y en `index.ts`.
- Builders en `recipes/deck.ts`: reservas, tipografía y firma leídas del manifest (`pieces.deck.cover|close`),
  `progress.at` fijo (portada 0, cierre `sections`), logo sin burbuja URL, eslogan del cierre en tres tramos desde
  `content.slogan`.
- Intents de ejemplo `deck-cover-classic-intent.json` y `deck-close-classic-intent.json` (espejo de los ejemplos de
  AXIS).
- Frames nuevos en el gate (`templates-graphic-line-deck`), declarados como altas en `BASELINE_DELTAS.md`.
- Comparación visual contra las referencias de AXIS (`/references/surfaces/deck/cover-classic.jpg` y
  `close-classic.jpg`) registrada en el cierre del slice.

### Slice 4 — Layouts `hero` y `lines` de `proposal-cinematic`

- El builder de `proposal-cinematic` ramifica por `manifest.layout` (`service` por defecto; un intent pre-0.1.2 compone
  como hoy, con sus seis referencias).
- `hero`: respuesta a 176 px, selección de Nexa sobre la respuesta, sin prueba ni pasos.
- `lines`: stack desde `content.lines { key, name, sloganWord, accent }`, cinco acentos como excepción declarada,
  selección del grupo (`selection.target: 'lines'`), logo de 52 px junto a la frase y burbuja URL en el pie.
- Plantilla: extender `proposal-cinematic.html` con los tres layouts o separarla en plantillas por layout (decisión del
  plan, sin cambiar el `contentType` público `deck.proposal-cinematic`). Cualquier píxel movido en las seis láminas
  aprobadas de `service` se declara lámina por lámina.
- Intents de ejemplo `deck-proposal-cinematic-hero-intent.json` y `deck-proposal-cinematic-lines-intent.json`; frames
  nuevos en el gate.

### Slice 5 — Documento y brochure en `brand:compose`

- `src/lib/brand-surfaces/document.ts`: función pura que recibe un intent de documento, lo valida con
  `resolveSurfaceDocument` / `validateSurfaceDocumentIntent` y devuelve un plan multilámina (una `SlideSpec` por
  página, en orden del `outline`) + la unión de assets; si hay `issues` (incluidos los `page[i]:<code>`), falla con
  esos códigos sin plan parcial.
- `scripts/brand-surfaces/compose.ts` detecta `pages` en el intent (como `pnpm surface:resolve` en AXIS) y produce un
  solo PDF 16:9 multipágina, `<id>.surface-document-manifest.json` (`axis.surface-document.v1`) y la procedencia con
  el sha del intent de documento y el de cada plate.
- Ejemplo `deck-brochure-document-intent.json` (espejo de `deck-brochure-servicios-document.json` de AXIS: portada,
  servicios, hero de Nexa, líneas, escalera BeX y cierre) y tests de las reglas que el CLI debe respetar
  (`brochure-cover-first`, `brochure-close-last`, `brochure-needs-service-page`, `document-line-mismatch`).
- Un frame de documento en el gate sólo si el probe es determinista (sin foto real); si no, el documento se cubre con
  las páginas individuales y se deja escrito.

### Slice 6 — Documentación y skills

- `EFEONCE_SURFACE_COMPOSITION_V1.md`: §2.1 (tabla del catálogo con portada, cierre y layouts; comando de documento),
  §4.6 (`use`, portada y cierre como recetas aprobadas, tres layouts, brochure), §7 (contrato 0.1.2, versiones AXIS
  0.3.9/0.3.8).
- Manual `docs/manual-de-uso/creative/componer-por-superficie-con-axis.md`: cómo componer un brochure paso a paso,
  qué significan los códigos de documento y problemas comunes.
- Skills `deck-studio` y `efeonce-graphic-line` en `.claude/skills/` y su espejo `.codex/skills/` (`pnpm skills:mirrors`
  limpio).

## Out of Scope

- Portadas y contraportadas cinematográficas con Nexa como receta: hoy no están en el contrato 0.1.2; es un
  follow-up en AXIS (nace en el canvas, se aprueba y recién entonces entra al token).
- La ruta productiva gobernada (command, API, consumer del `artifact-worker`, MCP, flag): `TASK-1921`.
- El catálogo de Glitch: `TASK-1923`.
- El pipeline `foto:*` (plates, registro cine, lente): `TASK-1918`, `TASK-1925`, `TASK-1926`.
- Salida PPTX del deck (depende de `pptx-native` en el composer).
- Recetas no aprobadas del deck, DOOH o pDOOH, y cambios de valor en AXIS (si falta un token, se abre en AXIS).

## Detailed Spec

**Intents y compatibilidad.** El contrato 0.1.2 es aditivo: un intent 0.1.0/0.1.1 resuelve igual. El mapper no debe
tocar la ruta de esos intents salvo para propagar `use` (con su default) y leer `layout`/`selection.anchor` cuando
existan. El test de no-regresión del Slice 1 es la prueba de ese invariante.

**Entrada de documento.** Forma del intent (fuente: AXIS `surface-document-intent.schema.json`):
`{ contract?, version?, surface: 'deck', format, use, line?, sections?, pages }`. El documento propaga a cada página
que los omite `surface`, `format`, `use`, `line`, `contract`/`version` y el punto fijo de navegación de portada y
cierre. La línea del marco (portada y cierre) es la del documento; una página de servicio puede declarar su propia
línea. Greenhouse no reimplementa ninguna de esas reglas: las lee del resultado de `resolveSurfaceDocument`.

**Salida de documento.** Un PDF, un manifest de documento y una procedencia:

```text
.captures/brand-surfaces/<id>/<id>.pdf
.captures/brand-surfaces/<id>/<id>.surface-document-manifest.json   # axis.surface-document.v1
.captures/brand-surfaces/<id>/<id>.provenance.json                   # intent de documento + plates + versiones AXIS
```

El nombre exacto de los archivos sigue la convención que dejó TASK-1919 en `compose.ts` `[verificar]`.

**Plantillas.** Cero valores de diseño literales: variables `--gl-*` generadas por `pnpm brand:tokens` y slots
alimentados por el builder desde el manifest resuelto. Portada y cierre usan el logo oficial de
`@efeoncepro/axis-brand-assets` (nunca un SVG copiado a mano).

## Rollout Plan & Risk Matrix

Cambio de tooling local, aditivo y repo-only: no toca runtime productivo (el render productivo del composer sólo corre
en el Job `artifact-worker` y esta task no lo despliega ni cambia su código de dominio). El riesgo real es visual y de
contrato.

### Slice ordering hard rule

- Slice 1 (subir AXIS + gate a 0 px sin freeze) MUST cerrar antes que cualquier otro: sin la línea base verde no se
  puede atribuir un píxel movido a la plantilla nueva o al token nuevo.
- Slice 2 → Slice 3 → Slice 4 (en ese orden: `use` y `anchor` los consumen portada, cierre y layouts).
- Slice 5 (documento) requiere Slices 3 y 4: un brochure válido exige portada, cierre y al menos una página `service`.
- Slice 6 (docs y skills) cierra después de Slice 5 para describir el comando real.
- Cada `--freeze` va en el mismo commit que su declaración en `BASELINE_DELTAS.md`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El bump de tokens mueve píxeles de las 20 recetas aprobadas | gate visual composer | medium | Slice 1 corre el gate sin freeze; toda diferencia se explica contra el changelog de AXIS y se declara lámina por lámina | `pnpm composer:visual-gate --catalog=graphic-line` con frames > 0 px |
| Un `--freeze` co-mingla trabajo de otra sesión (TASK-1923 u otra) | gate visual composer | medium | freeze single-owner, árbol del composer limpio salvo este cambio, freeze + commit atómicos (runbook §3) | diff de `baseline-manifest.json` con frames ajenos a `graphic-line-deck` |
| Drift de foto raster confundido con cambio propio | gate visual composer | low | el scope `graphic-line` no usa foto real; si aparece drift fotográfico se reporta contra ISSUE-122 y no se congela | frames con diferencia no determinista entre dos corridas |
| Extender `proposal-cinematic` rompe las seis láminas `service` aprobadas | catálogo deck | medium | layout `service` por defecto y test de no-regresión del plan pre-0.1.2; píxeles declarados | snapshot de plan o frame de `proposal-cinematic` con diferencia |
| Transcribir un valor medido (px/HEX) en la plantilla en vez de leerlo del token | contrato AXIS | medium | revisión contra el manifest resuelto; si falta un token se pide en AXIS | `design-contract`/revisión de la plantilla con literales |
| Documento parcialmente compuesto con páginas inválidas | CLI `brand:compose` | low | el CLI aborta ante cualquier `issue` del documento, sin PDF | test del CLI con intents inválidos |
| Paquete AXIS 0.3.9/0.3.8 inaccesible desde el registry privado | dependencias | low | runbook de consumo AXIS; no forzar versiones locales | `pnpm install` falla con 401/404 |

### Feature flags / cutover

Sin flag: el cambio es aditivo y repo-only. Las plantillas nuevas sólo se alcanzan desde el CLI local con un intent
explícito, y los intents existentes resuelven igual. El cutover es inmediato al commit.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `git revert` del commit del bump (vuelve a 0.3.8/0.3.7 y a los tokens previos) + `pnpm install` | < 10 min | sí |
| Slice 2 | `git revert` del commit del mapper | < 5 min | sí |
| Slice 3 | `git revert` (plantillas, builders, frames y su declaración en BASELINE_DELTAS salen juntos) | < 5 min | sí |
| Slice 4 | `git revert`; las láminas `service` vuelven a su baseline previo en el mismo revert | < 5 min | sí |
| Slice 5 | `git revert` del módulo de documento y del CLI | < 5 min | sí |
| Slice 6 | `git revert` de docs y skills (+ espejo) | < 5 min | sí |

### Production verification sequence

1. Local: `pnpm brand:tokens --check`, tests focales (`src/lib/brand-surfaces`, `scripts/brand-surfaces`) y
   `pnpm composer:visual-gate --catalog=graphic-line` a 0 px tras cada slice.
2. Local: componer los ejemplos nuevos (portada, cierre, hero, lines) y el brochure de ejemplo con
   `pnpm brand:compose`; revisar el PDF a ojo contra las referencias de AXIS.
3. Cierre: `pnpm local:check`, `pnpm test` completo y `pnpm build` (este último **requiere autorización previa del
   operador** porque consume mucha memoria del equipo).
4. Push a `develop` sólo con indicación del operador; la CI del gate (`composer:visual-gate`) debe quedar verde en ese
   commit.

### Out-of-band coordination required

- AXIS: si durante el Slice 1 o 3 falta un token o una referencia (p. ej. portada/cierre sin pieza medida suficiente),
  se abre en el repo AXIS y se espera la publicación; Greenhouse no parchea valores.
- Coordinación con la sesión que lleve TASK-1923 antes de cualquier `--freeze` (mismo gate, scopes distintos).
- Aprobación visual del operador de la portada, el cierre y el brochure compuestos antes de declarar la task cerrada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `package.json` fija `@efeoncepro/axis-tokens` `0.3.9` y `@efeoncepro/axis-ui-contracts` `0.3.8`, y el lockfile coincide. — Superado: se fijó `0.3.11` / `0.3.9` (release AXIS `v0.3.11` con los deltas b y c, commit `0d8a2b025`); TASK-1922 subió después a `0.3.12` / `0.3.10` (`4dfb147f7`).
- [x] `pnpm brand:tokens --check` pasa sin diferencias. — Verificado tras el bump (`0d8a2b025`).
- [x] Los 19 intents de ejemplo previos resuelven sin issues y producen el mismo plan que antes del bump (test en verde). — Comparación antes/después idéntica en 20 intents; snapshot en `__tests__/example-plans.test.ts`. El único plan que cambió después es el del tríptico, a propósito (`e811bc98c`).
- [x] Un intent sin `use` resuelve `use: 'proposal'`; un `use` no admitido por la receta aborta la composición con el código de AXIS. — Tests en `plan-surface-piece.test.ts` (`d368ad1cc`).
- [x] `selection.anchor` del manifest llega al adaptador de selección (test). — `d368ad1cc`.
- [ ] **No se hace: el operador no aprobó el marco clásico (2026-09-27); lo reemplazan las 18 portadas y contraportadas del delta (d).** `cover-classic` y `close-classic` componen desde su intent de ejemplo, firmados con logo y sin burbuja URL; el cierre muestra el eslogan en tres tramos desde `content.slogan`.
- [x] `proposal-cinematic` compone con `layout` `service`, `hero` y `lines`; un intent pre-0.1.2 compone igual que antes. — `5983b55f0`; una plantilla por composición, `ProposalCinematic.png` sin cambios. Compuestas con plate real y comparadas contra las referencias aprobadas.
- [ ] Ninguna plantilla nueva o modificada contiene px, HEX o familia tipográfica literales que el token o el manifest ya declaran.
- [ ] `pnpm brand:compose` con el intent de brochure produce un único PDF multipágina, el manifest `axis.surface-document.v1` y la procedencia. — Parcial (`6b5d3a97b`): el documento de propuesta de 7 páginas sale en un PDF con manifest y procedencia; el brochure se detiene en `cover-brochure`, que aún no tiene plantilla.
- [x] Un intent de documento con issues (portada fuera del primer lugar, sin página `service`, línea del marco distinta) no produce PDF y reporta los códigos de AXIS. — Tests en `document.test.ts` (`6b5d3a97b`).
- [ ] `pnpm composer:visual-gate --catalog=graphic-line` queda a 0 px con los frames nuevos, y cada cambio de píxel (altas y modificaciones) está declarado en `BASELINE_DELTAS.md`.
- [ ] `EFEONCE_SURFACE_COMPOSITION_V1.md` (§2.1, §4.6 y §7), el manual de uso y las skills `deck-studio` y `efeonce-graphic-line` describen 0.1.2, y `pnpm skills:mirrors` pasa.
- [ ] El operador aprobó a ojo la portada, el cierre, los layouts `hero`/`lines` y el brochure compuestos.
- [ ] (Delta d) **Espera token en AXIS: el ángulo de inicio del arco (−115° desde las 12) y la regla de barrido ((n−1)×72°) sólo existen en el script aprobado.** `section-split` sube por la izquierda con la esfera arriba a la izquierda, y `section-split-corner-bottom` y `section-split-panel-end` componen desde su intent con frame en el gate.
- [x] (Delta d) `triptych` compone una palabra por toma, cada una con su esfera («Escucha.» «Crea.» «Mide.»). — `e811bc98c`; frame declarado como modificación en `BASELINE_DELTAS.md`.
- [ ] (Delta d) **Espera tokens en AXIS: pintura de la órbita gigante y del amanecer, tipografía y aire del bloque de contacto y redes, y el top de la columna de voz por lámina.** Las portadas y contraportadas del delta (b) que AXIS declare `approved` componen desde su intent, con respuesta ≥ 3× en «Cuando quieras.», logo dentro de la órbita en el cierre y dirección desde `EFEONCE_CONTACT`; las que AXIS aún no declare quedan listadas en el cierre con su estado.

## Verification

- `pnpm local:check`
- `pnpm typecheck`
- `pnpm test` (completo al cierre; focales `src/lib/brand-surfaces` y `scripts/brand-surfaces` por slice)
- `pnpm brand:tokens --check`
- `pnpm composer:visual-gate --catalog=graphic-line` (y `--selftest` antes de cualquier `--freeze`)
- `pnpm brand:compose -- --intent src/lib/brand-surfaces/examples/<ejemplo>.json` para cada ejemplo nuevo y el brochure
- `pnpm build` — **requiere autorización explícita del operador** antes de correrlo (consume mucha memoria)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `## Delta` en `TASK-1921` indicando que su command debe aceptar también el intent de documento y dónde vive la función pura
- [ ] `pnpm build` corrido con autorización del operador, o el cierre dice `code complete, build pendiente de autorización`

## Follow-ups

- AXIS: portadas y contraportadas cinematográficas con Nexa como receta del contrato (nacen en el canvas).
- TASK-1921: aceptar el intent de documento en la ruta productiva gobernada.
- Retirar el script ad hoc `ai-generations/2026-09-27_brochure/componer-brochure.mjs` una vez que el brochure salga de `brand:compose`.

## Open Questions

- ¿Los tres layouts de `proposal-cinematic` viven en una plantilla con ramas o en tres plantillas? Decidirlo en el plan
  con el criterio de menor movimiento de píxeles en las láminas `service` aprobadas.
- ¿El gate debe tener un frame de documento completo o basta con las páginas individuales? Depende de que el probe del
  brochure sea determinista sin foto real.
