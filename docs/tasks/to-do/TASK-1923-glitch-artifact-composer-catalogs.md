# TASK-1923 — Glitch en el Artifact Composer

## Delta 2026-09-27 — TASK-1922 publicada en AXIS `v0.3.12`: se levanta el bloqueo

- **Bloqueo levantado.** TASK-1922 publicó en AXIS el tag `v0.3.12` (commit `29a40b5`; CI y release-packages verdes):
  `@efeoncepro/axis-tokens` `0.3.12`, `@efeoncepro/axis-ui-contracts` `0.3.10`, `@efeoncepro/axis-brand-assets` `0.3.5`
  y `@efeoncepro/axis-graphic-line` `0.7.0` (`axis-ui-registry` sigue en `0.3.1`). Greenhouse `develop` fija exactamente
  esas versiones desde `4dfb147f7` (gate visual de graphic-line: 24 cuadros a 0 px). Esta task consume esas cuatro
  versiones; el `Blocked by: TASK-1922` queda satisfecho y los Slices 2–4 ya no esperan a AXIS.
- **Extensión `glitch` del brand pack (Slice 2):** lee el token `glitchLine` (export de primer nivel, tipo `GlitchLine`,
  `status: candidate`) y **nunca copia valores**; `pnpm glitch:tokens` compila desde él. El wordmark y la manzana salen de
  `AXIS_GLITCH_ASSETS` (`glitch-logo-positive`, `glitch-logo-negative`, `glitch-apple`, sellados en
  `GLITCH_ASSET_SEALS`; API `findGlitchAsset` / `glitchAssetUrl(id)`), fuera de `AXIS_BRAND_ASSETS`. Los cinco glifos
  (guardar, compartir, recomendar, comentar, deslizar) ya son catálogo en `PLASTILINA_GLYPHS` (D27) y en Glitch van
  **siempre planos** (`glitchLine.icons.actions.rendering: 'flat'`, `volume: 'never'`). **AXIS no publica fuentes:**
  Guttery sigue sellada por checksum en la extensión del brand pack (licencia declarada en `glitchLine.type.narrator`).
- **Validadores semánticos:** reutilizan (llaman) `validateGlitchLineIntent(intent, { narratorLicenseStatus })` y
  `resolveGlitchLineIntent` del contrato `efeonce.glitch-line` `0.1.0`; las plantillas consumen el manifiesto
  `axis.glitch-line-composition.v1` (lienzo, paleta por superficie, tipo, titular, cabecera, wordmark, esfera, bytes,
  zonas seguras, `cover`, `actionIcons`, firma, `adapterChecks`). Falla cerrado: cualquier issue → `status: 'invalid'`
  sin cuerpo, y no se renderiza. Códigos que esta task debe propagar sin duplicar: `piece-not-approved`,
  `previous-cover-template-required`, `cover-template-repeated`, `sphere-count-exceeded`, `accent-text-on-light`,
  `bytes-over-face`, `headline-weight-contrast-missing`, `narrator-font-unlicensed`, `narrator-rotation-invalid`,
  `slogan-not-applicable`, `icon-volume-not-applicable` y `url-bubble-not-applicable`. El mecanismo local
  `glitch.piece-approval@1` se concilia con el `piece-not-approved` del contrato en vez de mantener dos fuentes.
- **Piezas, formatos y rotación ya están en el token:** `glitchLine.formats` (`linkedin-4x5`, `landscape-16x9`,
  `square-1x1`, `blog-inline-16x9`, `reel-9x16`), `glitchLine.pieces` (id → estado/superficie/formato/plantilla/esfera/
  titular; todas `aprobada` salvo `historia-9x16` y `carrusel-panoramico` = `exploracion`; `interior-lente` con esfera
  `lens`; `blog-banner-square-a/b/c` con su plantilla 1:1 propia; `blog-banner-interno`) y `glitchLine.coverRotation`
  (A/B/C, nunca la misma que la semana anterior). El selector lee `coverRotation`; el estado de cada plantilla sale de
  `pieces`. El token lista `reel-portada` como `aprobada`: el `[verificar]` del Delta (noche) se resuelve contra el
  token al empezar el Slice 7, no decidiéndolo en el composer.
- **Contexto vigente:** el flujo de composición está `Accepted` y todas las piezas estáticas están aprobadas (blog y
  lámina con lente incluidos). Guía y ejemplos para escribir intents: `docs/agent-composition/glitch.md`,
  `docs/agent-composition/glitch-line-intent.schema.json` y `docs/examples/glitch/` del repo AXIS; CLI de referencia
  `pnpm glitch:resolve -- --input <intent.json> --out <manifest.json>`.

## Delta 2026-09-27 (noche) — blog y lente aprobados

Decisión del operador (Julio Reyes), registrada en el
[Delta — blog y lente aprobados del ADR de Glitch](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md#delta-2026-09-27--blog-y-lente-aprobados)
y en la [norma §5, §6 y §9](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#6-blog--aprobado-2026-09-27):
«Vamos en todas con tu recomendación».

- **Aprobadas** las plantillas que el Slice 7 construía cerradas: `InteriorLens` (como **variante ocasional**: sólo
  cuando el POV trata de un detalle nítido de la foto; no cierra con la manzana), `BlogBannerPhoto`, `BlogBannerType`,
  `BlogBannerMosaic` (16:9, las portadas A/B/C en horizontal, sin «Desliza»), `BlogBannerSquare` y `BlogNewsBanner`.
  Pasan a construirse **abiertas** (`approval: "approved"`) y entran a la línea base de píxeles.
- **`BlogBannerSquare` es una plantilla propia 1:1**, derivada de las portadas; **nunca** el recorte de la portada 4:5
  (pierde un quinto del alto y puede cortar el titular o la manzana). No es un diseño nuevo que aprobar.
- **`BlogNewsBanner` (1600 × 900, duotono navy + bytes + chip número/sección + wordmark) exige el crédito de la foto**
  como slot requerido y pintado; reemplaza la imagen cruda de la fuente.
- **El callout «DROP» v2 no es plantilla de este composer:** vive en el bloque de WordPress `efeoncepro/glitch-drop`
  (TASK-1337), que pasa al v2 antes de publicar la #17 (los posts anteriores siguen con el v1). Coherente con Out of
  Scope, que ya lo dejaba fuera, igual que la maqueta del post (apertura, escaleta, suscripción, «El hilo de la
  semana», cierre), que es WordPress.
- **El mecanismo de PROPUESTA se conserva** (`approval` como dato, `piece-not-approved`, `glitch.piece-approval@1`)
  para piezas futuras. Hoy la norma no tiene piezas estáticas en PROPUESTA.
- `[verificar]` **Portada del reel (`ReelCover`), miniatura (`VideoThumbnail`) y las versiones PNG de los overlays del
  reel:** esta aprobación no las nombra. El kit de overlays del reel quedó aprobado como **motion** (HyperFrames,
  TASK-1924) y la norma no les da un estado propio como piezas estáticas. Siguen en el Slice 7 con `approval:
  "proposed"` hasta que el operador confirme si se construyen en el composer y con qué estado.

## Delta 2026-09-27 (tarde) — el motion lee su propio archivo de edición

- El motion de Glitch (TASK-1924) ya existe, está **aprobado** y **no espera este manifiesto**: lee su propio archivo de
  edición en el taller (`tools/glitch-motion/ejemplos/edicion-17.ejemplo.json`: `edition`, `nextEdition`, `host`,
  `guest`, `news[3]` con `image {file, credit}`, `drop`, `cta`, `transition`; ver la
  [norma §13.5](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#135-archivo-de-edición-la-fuente-del-texto)). El manifiesto de edición de esta task debe cubrir
  esos campos (o declarar su mapeo) para que TASK-1924 migre a él sin perder datos.
- Quedaron resueltos dos supuestos que esta task dejaba en TASK-1924: el mnemónico (diseño sonoro B aprobado) y el
  contenido del lower third («AL AIRE · GLITCH #N», nombre y cargo, con la órbita real; variante de invitado).

## Delta 2026-09-27

- **Guttery:** el operador confirmó la licencia para web y video (2026-09-27, segunda respuesta). La Open Question de Guttery queda resuelta; la task registra la referencia del contrato de licencia y sella la fuente.

Decisiones del operador (Julio Reyes) registradas en el [Delta 2026-09-27 del ADR de Glitch](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md#delta-2026-09-27--decisiones-del-operador):

- **Numeración resuelta** (Open Question 1): la próxima edición es la **#17**; la serie sigue la del blog y del
  pipeline editorial (TASK-1441/1442). Los «#11»–«#14» de las maquetas del canvas son ejemplos de diseño. El ejemplo
  del manifiesto pasa a `edition-17.example.json` (edición #17, anterior #16).
- **Glitch es línea de servicio Growth** (Open Question 8 resuelta): el eslogan de la contraportada queda «Empower your
  Growth».
- **Aprobados la manzana como esfera y el verde `#6ec207` como acento de franquicia**, y el **alta de los 5 glifos
  Plastilina**: TASK-1922 ya no espera esas aprobaciones (sigue bloqueando esta task hasta publicar el token, los
  archivos y el contrato).
- **Siguen abiertas:** el paso del flujo de composición a `Accepted` (Open Question 7: sin respuesta). El mnemónico queda
  pendiente de evaluación dedicada y el contenido del lower third en definición con el operador (ambos afectan a
  TASK-1924, no a esta task).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-031`
- Status real: `Diseño. Bloqueada por TASK-1922 (token glitchLine, archivos oficiales y contrato efeonce.glitch-line). Los Slices 1 y 5 (contrato del manifiesto y geometría pura de la falla) pueden adelantarse sin TASK-1922. Desde el 2026-09-27 (noche) el blog (banners 16:9 A/B/C, 1:1 propia, banner interno de noticia) y la lámina con lente están aprobados: se construyen abiertos; sólo la portada del reel, la miniatura y los overlays PNG del reel siguen en proposed [verificar].`
- Rank: `TBD`
- Domain: `content|creative|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; AXIS main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

> **Perfil de ejecución (inferido, ajustable):** `standard` con `Backend impact: command`, igual que TASK-1919. El
> trabajo es un catálogo del motor + un comando local: sin base de datos, sin API, sin UI de Greenhouse. Se completa el
> `## Backend/Data Contract` en rigor `backend-lite` porque el **manifiesto de edición** es un contrato de datos que
> comparten tres consumidores (este CLI, las composiciones de movimiento de TASK-1924 y la ruta productiva futura) y que
> mañana producirá el dominio de ediciones de TASK-1442. `UI impact: none`: las piezas son artefactos de marca
> (PDF/PNG), no pantallas del portal; el Lab de AXIS tampoco es UI de Greenhouse. Prioridad P1 inferida porque la
> próxima edición (#17) se sigue armando a mano desde el canvas.

## Summary

Convierte las piezas aprobadas de Glitch (portada A/B/C con regla de rotación, lámina interior, interior de la noticia
1, contraportada y, desde el 2026-09-27, la lámina con lente, los banners del blog 16:9 A/B/C y 1:1 y el banner interno
de noticia) en plantillas del Artifact Composer, repartidas en tres catálogos delgados sobre un mismo
`templatesDir`: `glitch-carousel` (PDF del carrusel de LinkedIn), `glitch-stills` (PNG sueltos) y `glitch-overlays`
(PNG con alfa). Un **manifiesto de edición** validado entra por `pnpm glitch:compose` y sale como PDF, PNG y un manifest
resuelto con procedencia, sin que ningún agente elija plantilla ni coordenadas. Una pieza en PROPUESTA se construye
pero falla cerrada hasta que el operador la apruebe (hoy la norma no tiene piezas estáticas en PROPUESTA; el mecanismo
queda para piezas futuras).

## Why This Task Exists

Cada edición de Glitch se arma hoy a mano a partir del canvas «Glitch en La órbita»: se copian valores, se reinterpreta
la portada y nada garantiza la regla de rotación, una sola esfera por pieza ni el crédito de la foto. La norma de la
sub-línea y el ADR ya dicen **qué** va en cada pieza; el ADR verificó (2026-09-27) que el motor ya cubre a Glitch sin un
«kind» nuevo (`pdf-merged`, `png-set`, viewport por plantilla, `render.background: 'transparent'`). Falta el dato: las
plantillas, sus contratos de slots, la extensión `glitch` del brand pack, el selector de portada, los validadores
semánticos, el hook de la falla en bytes y el comando que va de un manifiesto de edición a los archivos.

## Goal

- Un manifiesto de edición válido produce, de forma determinista, el PDF del carrusel de LinkedIn (1080 × 1350), las
  láminas como PNG y el manifest resuelto con procedencia; dos corridas con las mismas entradas dan los mismos bytes en
  los PNG.
- La portada la decide el contenido del manifiesto y la regla de rotación (nunca la misma plantilla que la semana
  anterior); un autor que intente declarar plantilla recibe `TemplateAuthorityError`.
- Las reglas duras de la sub-línea (una esfera por pieza, crédito y licencia de la foto, contraste de pesos del
  titular, verde nunca como texto sobre claro, falla nunca sobre un rostro, slots con `maxCharacters` y `overflow:
  reject`) fallan cerradas antes del render.
- Las plantillas aprobadas quedan bajo `pnpm composer:visual-gate` a cero píxeles; una pieza en PROPUESTA existe
  detrás de un estado de aprobación que es dato y falla con un error legible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md` — sobre todo «Decisión propuesta — flujo de composición» y
  «Encaje verificado en el Artifact Composer (2026-09-27)». **El flujo de composición está `Proposed`**: esta task no
  se toma hasta que el operador lo pase a `Accepted` (ver Open Questions).
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (catálogo = dato, motor domain-free,
  `outputTarget` implementados, entradas públicas barrel vs `/pure`).
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md` (render hermético; el Chromium productivo vive sólo en
  el Cloud Run Job `artifact-worker`).
- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md` (dueño del dominio de ediciones;
  numeración).
- `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` (la línea madre que Glitch hereda sin redefinir).

Reglas obligatorias:

- **Agregar un catálogo no toca el motor** (`catalog.ts`). Esta task no modifica `catalog.ts`, `compose.ts`,
  `render.ts`, `contracts.ts`, `plan.ts` ni `selector.ts`. Si Discovery encuentra que algo del motor falta, se detiene y
  se abre una task del motor; no se parcha dentro del catálogo.
- **AXIS es dueño de los valores** (token `glitchLine` y contrato `efeonce.glitch-line` de TASK-1922). Ninguna plantilla
  lleva HEX, `rgb()`, px de diseño, familia tipográfica ni ms literales; los valores llegan compilados desde el token
  como custom properties, igual que `graphic-line-tokens.css`.
- **El autor nunca elige plantilla.** El mapper del manifiesto produce `CompositionPlanInput` (sin `template`); el
  selector del catálogo resuelve; `TemplateAuthorityError` sigue vigente.
- **Los validadores semánticos son deterministas**: reciben el plan y el snapshot del registry, nunca consultan base,
  red ni reloj. Por eso la plantilla de la semana anterior viaja **como dato** dentro del plan.
- **El catálogo no importa paquetes** (patrón de `graphic-line-*`): los archivos oficiales (wordmark, manzana, glifos
  Plastilina, logo de Efeonce) se copian byte a byte desde `@efeoncepro/axis-brand-assets` a la carpeta del catálogo con
  un chequeo de drift; lo que necesita librerías (pintura, sharp) lo inyecta el consumidor.
- **Glitch no va por `src/lib/brand-surfaces` ni por `efeonce.surface-composition`**: ese puente es de las recetas de La
  órbita por superficie. Glitch tiene su propio mapper y su propio contrato.
- **Sólo lo APROBADO es canon.** Lo que la norma marca PROPUESTA se construye con `approval: "proposed"` y falla cerrado;
  lo que marca EXPLORACIÓN (historia 9:16, carrusel panorámico, acentos teal/naranja) no se construye.
- Lo exclusivo de Glitch (manzana, verde, navy del wordmark, bytes, Guttery, cabecera «EDICIÓN #N») vive sólo en estos
  catálogos; nunca en `graphic-line-*` ni en `deck-axis`.
- `src/**` fuera de scripts y del worker no importa el barrel del composer como valor (lint
  `greenhouse/no-worker-only-module-in-vercel-code`); el mapper consume `/pure` y tipos.

## Normative Docs

- `docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` (norma: §3 elementos, §4 portada y rotación, §5
  láminas del carrusel, §6 blog aprobado el 2026-09-27, §7 video con motion aprobado, §8 NUNCA, §9 estado de cada
  pieza).
- `.claude/skills/efeonce-graphic-line/references/glitch.md` (criterio para agentes y QA §10).
- `docs/operations/runbooks/composer-visual-gate.md` (protocolo del freeze: single-owner, atómico).
- `docs/issues/open/ISSUE-122-composer-visual-gate-photo-nondeterminism-concurrency-docs.md` (fotos raster y cero
  píxeles: afecta directo a Glitch, que lleva fotos en casi todas las láminas).
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` (gate a cero píxeles, `BASELINE_DELTAS.md`).
- `docs/tasks/complete/TASK-1919-graphic-line-surfaces-artifact-composer.md` (modelo: catálogos por superficie, CLI
  `pnpm brand:compose`, procedencia, gate).
- `docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md` §6 (Glitch es franquicia, no marca nueva).
- Canvas de referencia (privado): `https://claude.ai/artifact/N3Yg5cyz2zXa36SwtWVHYS` y los renders
  `apps/lab/public/media/glitch/*.webp` del repo AXIS.

## Dependencies & Impact

### Depends on

- **TASK-1922** (`docs/tasks/to-do/TASK-1922-glitch-axis-franchise-token-contract.md`): token `glitchLine` en
  `@efeoncepro/axis-tokens` (color, tipo, cabecera, bytes, manzana, zonas seguras por formato, motion), archivos en
  `@efeoncepro/axis-brand-assets` (wordmark claro/oscuro, manzana SVG, glifos Plastilina) y contrato
  `efeonce.glitch-line` 0.1.0 (estado de cada pieza y reglas verificables). Nombres exactos de export y de piezas
  `[verificar]` al cerrar TASK-1922; hoy los valores viven sólo en `apps/lab/src/data/glitch.ts` de AXIS (main
  `cf77452`) como propuesta.
- Motor del composer: `src/lib/artifact-composer/{catalog.ts,compose.ts,contracts.ts,plan.ts,selector.ts,validate.ts,brand-pack.ts,render.ts,quality-gates.ts,compile-catalog-tokens.ts,pure.ts}`.
- Brand pack `src/lib/artifact-composer/brand-packs/axis/` (`fonts.json`, `index.ts` con `packExtensions`; modelo:
  extensión `editorial` de TASK-1889 y `graphic-line` de TASK-1919).
- Licencia de Guttery (Open Question): sin licencia confirmada para web y video, Guttery no entra al pack y la
  portada B no se compone.
- Aprobación del operador del flujo de composición (ADR `Proposed` → `Accepted`).

### Blocks / Impacts

- **TASK-1924** (movimiento con HyperFrames): consume el mismo manifiesto de edición y sus tipos
  (`src/lib/glitch-composition/`). Cualquier cambio de forma del manifiesto después de cerrar esta task sube su
  `schemaVersion` y se coordina con TASK-1924.
- **TASK-1921** (ruta productiva de las piezas de marca): posible consumer productivo de estos catálogos (command,
  endpoint, consumer del `artifact-worker`, MCP). Si su dueño de dominio no calza con Glitch, la ruta productiva de
  Glitch va a una task nueva (Follow-ups).
- **TASK-1442** (dominio y API de ediciones de EPIC-031): fuente futura del manifiesto. Hasta que exista, el manifiesto
  es un JSON local.
- **TASK-1441** (piloto #16) y la numeración: el manifiesto lleva el número como dato y no decide la serie.
- `scripts/artifact-composer/visual-gate.ts` suma una entrada de probe; `scripts/frontend/baselines/artifact-composer/**`
  suma una carpeta de líneas base.

### Files owned

- `src/lib/artifact-composer/catalogs/glitch/**` (registry, plantillas `.html`, `*.slots.json`, CSS compilado, assets
  copiados, fuentes sincronizadas, `index.ts` con los tres catálogos, hooks, validadores semánticos)
- `src/lib/artifact-composer/catalogs/glitch/__tests__/**`
- `src/lib/artifact-composer/brand-packs/axis/fonts.json` y `brand-packs/axis/fonts/guttery-*` (sólo la entrada de
  Guttery con `extension: "glitch"`; condicionado a la licencia)
- `src/lib/artifact-composer/brand-packs/axis/glitch-roles.json` `[verificar]` (sólo si los pares de contraste de
  Glitch se declaran como extensión del pack, igual que `editorial-roles.json`)
- `src/lib/glitch-composition/**` (contrato del manifiesto, mapper, selector de portada, geometría de la falla, ejemplos)
- `scripts/glitch/**` (`compose.ts`, `compile-tokens.ts`, materializador de fotos)
- `scripts/artifact-composer/visual-gate.ts` (sólo la entrada de probe de Glitch y el filtro por aprobación)
- `scripts/frontend/baselines/artifact-composer/templates-glitch/**`, `BASELINE_DELTAS.md` y `baseline-manifest.json`
  (sólo las filas de Glitch)
- `package.json` (scripts `glitch:compose` y `glitch:tokens`)
- `docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` (delta §10 y §12)
- `docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md` (delta: implementado)
- `docs/manual-de-uso/creative/componer-una-edicion-de-glitch.md` (nuevo)
- `docs/documentation/creative/composicion-de-glitch.md` `[verificar]` la carpeta funcional de creative
- `.claude/skills/efeonce-graphic-line/references/glitch.md` y su espejo `.codex/`

## Current Repo State

### Already exists

- Motor con los dos destinos que Glitch necesita: `IMPLEMENTED_OUTPUT_TARGETS = {'pdf-merged', 'png-set'}`
  (`src/lib/artifact-composer/catalog.ts`), viewport por plantilla (`TemplateContract.viewport`) y fondo transparente por
  plantilla (`TemplateContract.render.background: 'opaque' | 'transparent'`, `src/lib/artifact-composer/contracts.ts`,
  entregado por TASK-1919 con `transparent-render.test.ts`).
- `ArtifactCatalog` con `templatesDir`, `outputTarget`, `resolvers`, `slideValidators`, `layoutHooks`,
  `semanticValidators` y `brand.packExtensions`; `resolvePlan` (selector → forma → semántica fail-closed → sellado con
  hashes); `TemplateAuthorityError`; `CatalogSemanticValidator` recibe `(plan, { registry })`.
- Slots con `maxCharacters`, `maxLines`, `overflow: 'reject'` (único modo), `consumer: 'validation-only' |
  'resolver-only'` y `example` para el probe del gate.
- Brand pack `axis` con font pack sellado por checksum (`brand-packs/axis/fonts.json`, fuentes con `extension`
  `editorial` y `graphic-line`); el compilador falla cerrado sin `embedRights`.
- Render con `--force-color-profile=srgb` (`render.ts`); gates `assertAllImagesResolved`, `assertNoFontFallback`,
  `assertSlideHasInk` (`quality-gates.ts`).
- Precedente completo en TASK-1919: catálogos `graphic-line-deck`, `graphic-line-stills`, `graphic-line-overlays`,
  carpeta compartida `graphic-line-shared/`, compilador de tokens `pnpm brand:tokens` (`scripts/brand-surfaces/compile-tokens.ts`,
  con copia byte a byte de assets desde `@efeoncepro/axis-brand-assets` y `--check`), CLI `pnpm brand:compose`
  (`scripts/brand-surfaces/compose.ts`, procedencia `<id>.provenance.json` sin fechas), mapper puro
  `src/lib/brand-surfaces/` con `SurfacePieceError('recipe-not-approved')`.
- Gate `pnpm composer:visual-gate` con `PROBE_CATALOGS` y `--catalog=<scope>` (`scripts/artifact-composer/visual-gate.ts`);
  el probe recorre **todas** las plantillas del `registry.json` de la carpeta (línea ~211).
- Wordmark de Glitch en `public/branding/glitch/glitch-{light,dark}.svg`; cinco glifos Plastilina en
  `ai-generations/2026-09-26_glitch-iconos/elegidos/{guardar,compartir,recomendar,comentar,deslizar}.json` (pasan
  `icons:check`; alta en AXIS pendiente, dueña TASK-1922).
- Worker productivo `services/artifact-worker/` con consumers `insights.ts` y `proposal.ts` (Glitch no tiene consumer:
  fuera de alcance).

### Gap

- No existe ningún catálogo de Glitch, ni el directorio `catalogs/glitch/`, ni su registry.
- No existe el contrato del manifiesto de edición ni un mapper de manifiesto a plan (`src/lib/glitch-composition/` no
  existe; `src/lib/content/glitch/` está reservado por TASK-1442 y tampoco existe).
- No existe la extensión `glitch` del brand pack (Guttery no está en `fonts.json`).
- No existe el selector de portada por rotación, ni validadores semánticos de Glitch, ni el hook de la falla en bytes.
- No existe `pnpm glitch:compose` ni `pnpm glitch:tokens`.
- Con un solo `templatesDir` para tres catálogos, el motor no restringe qué `contentType` pertenece a qué catálogo, y el
  probe del gate renderizaría todas las plantillas (incluidas las PROPUESTA): hace falta una regla de pertenencia como
  dato y un filtro en el probe.
- ISSUE-122 sigue abierto: las fotos raster rompen el cero píxeles entre procesos si Chromium re-muestrea.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `src/lib/artifact-composer/catalogs/glitch/` (plantillas y catálogos), `src/lib/glitch-composition/` (contrato del manifiesto y mapper puro), `scripts/glitch/` (CLI local y compilador de tokens)
- Future candidate home: `worker`
- Boundary: `src/lib/glitch-composition` expone una función pura manifiesto de edición → planes por catálogo más la lista de assets a materializar; la consumen el CLI local, las composiciones de TASK-1924 y la futura ruta productiva; el motor se consume sólo por su contrato público
- Server/browser split: `sólo server y CLI — Chromium, sharp y la lectura de archivos nunca van al browser ni a Vercel; el mapper es puro y no toca filesystem`
- Build impact: `sin dependencias nuevas: Chromium/Playwright y sharp ya están en el repo; suma fuentes (Guttery, condicionada a licencia) y SVG copiados al árbol del catálogo, que viaja al artifact-worker`
- Extraction blocker: `none — el render productivo ya corre sólo en el Job artifact-worker; la frontera productiva (command, API, consumer) queda para TASK-1921 o una task nueva`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `command`
- Source of truth afectado: el contrato AXIS `efeonce.glitch-line` 0.1.0 + token `glitchLine` (TASK-1922) para valores,
  estado de cada pieza y reglas; el **manifiesto de edición** (este contrato) para el contenido de cada edición. Los
  catálogos son dato derivado, no fuente. Fuente futura del manifiesto: el dominio de ediciones de TASK-1442.
- Consumidores afectados: CLI `pnpm glitch:compose`; composiciones HyperFrames de TASK-1924; ruta productiva futura
  (TASK-1921 o task nueva).
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `ArtifactCatalog`/`OutputTarget` (`catalog.ts`), `CompositionPlanInput` y
  `ResolvedCompositionManifest` (`plan.ts`), `TemplateContract` con `render.background` (`contracts.ts`),
  `ComposeOptions.externalAssets` (`compose.ts`), selector y `TemplateAuthorityError`, `CatalogSemanticValidator`.
- Contrato nuevo:
  - `GlitchEditionManifest` (`schemaVersion: 1`) con schema zod en `src/lib/glitch-composition/manifest.ts` y ejemplo
    `src/lib/glitch-composition/examples/edition-17.example.json`.
  - `planGlitchEdition(manifest, options) → { carousel: CompositionPlanInput; stills: CompositionPlanInput; overlays: CompositionPlanInput; assets: GlitchAssetRequest[] }`
    y `GlitchPieceError` con códigos estables (`manifest-invalid`, `piece-not-approved`, `cover-rotation-unsatisfiable`,
    `font-license-missing`, `photo-license-missing`, `fracture-over-face`).
  - CLI `pnpm glitch:compose -- --manifest <edition.json> [--out <dir>] [--only carousel|stills|overlays]`.
- Backward compatibility: `compatible` — todo es nuevo; el motor no cambia y los catálogos existentes no cambian un
  píxel (lo prueba el visual gate global).
- Full API parity: el mapper es el primitive; el CLI es su primer consumer. La ruta productiva gobernada (command,
  endpoint, consumer del `artifact-worker`, MCP) es deuda declarada con dueño (TASK-1921 o task nueva, ver Follow-ups) y
  condición de retiro (esa task cerrada).

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna; no hay base de datos.
- Invariantes que no se pueden romper:
  - Un manifiesto que no pasa el schema nunca llega al plan; un plan que no pasa forma o semántica nunca llega al render.
  - El manifiesto no tiene campo de plantilla. La portada se deriva del contenido y de la plantilla de la semana
    anterior; si ninguna candidata sobrevive a la rotación, falla con `cover-rotation-unsatisfiable` (lo corrige un
    humano cambiando contenido, nunca el composer).
  - Una pieza con `approval: "proposed"` en el registry falla cerrada (`piece-not-approved`) en el mapper **y** en el
    validador semántico; no hay fallback silencioso a otra plantilla.
  - Ninguna lámina lleva dos esferas (manzana y lente a la vez).
  - Toda foto lleva crédito visible y licencia declarada; sin licencia no se compone.
  - La falla en bytes nunca intersecta una región de rostro declarada.
  - Mismo manifiesto + mismas fotos + mismas versiones AXIS ⇒ mismos bytes en los PNG.
  - Ninguna plantilla contiene HEX, `rgb()`, familia tipográfica, px de diseño ni duraciones literales.
- Write-target allowlist: sin escrituras a base; la salida son archivos bajo `--out` (por defecto
  `.captures/glitch/<edición>/`, fuera de git).
- Tenant/space boundary: sin datos de tenant — franquicia editorial propia de Efeonce (`ownerOrgId: 'efeonce'`).
- Idempotency/concurrency: render determinista; re-ejecutar sobre el mismo `--out` reemplaza los mismos archivos.
- Audit/outbox/history: sin outbox; el CLI escribe la procedencia local junto a la salida (hash del manifiesto,
  SHA-256 de cada foto fuente y procesada, versiones AXIS, hash del registry, fuentes selladas). La procedencia
  versionada es de la ruta productiva.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: habilitado en local; sin ruta productiva en esta task.
- Backfill plan: sin backfill; las ediciones anteriores no se recomponen.
- Rollback path: revertir los commits; los catálogos nuevos salen de `PROBE_CATALOGS` y su carpeta de líneas base se
  retira con una entrada en `BASELINE_DELTAS.md`.
- External coordination: TASK-1922 publicada y fijada en `package.json`; confirmación de la licencia de Guttery.

### Security and access

- Auth/access gate: sin auth — herramienta local del operador; la gobernanza por capability es de la ruta productiva.
- Sensitive data posture: sin datos personales; las fotos de noticias son de terceros y por eso el contrato exige
  crédito y licencia. Los rostros sólo aparecen como regiones geométricas declaradas, nunca como identidad.
- Error contract: el CLI sale con código distinto de cero y lista issues con código, ruta del campo y mensaje en
  es-CL; nunca un stack trace crudo como único mensaje.
- Abuse/rate-limit posture: sin exposición de red.

### Runtime evidence

- Local checks: tests focales de `src/lib/glitch-composition` y del catálogo; `pnpm composer:visual-gate`;
  `pnpm local:check`; `pnpm test` completo al cerrar.
- DB/runtime checks: sin base de datos.
- Integration checks: `pnpm glitch:compose` sobre `edition-17.example.json` produce PDF de 10 páginas, PNG y
  procedencia; `pnpm glitch:tokens --check` sin drift contra la versión instalada de AXIS.
- Reliability signals/logs: sin señal; el gate visual y los tests son la vigilancia.
- Production verification sequence: sin producción en esta task; vive en la ruta productiva.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] *(No aplica: la task no crea tablas ni escribe en base de datos.)* Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] *(No aplica: no toca dominios sensibles; los errores son `GlitchPieceError` con códigos estables.)* Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Contrato del manifiesto de edición (puede adelantarse a TASK-1922)

- `src/lib/glitch-composition/manifest.ts`: tipo `GlitchEditionManifest` + schema zod (`schemaVersion: 1`), con la
  forma de «Detailed Spec · Manifiesto de edición».
- `src/lib/glitch-composition/examples/edition-17.example.json`: edición #17 con **titulares y noticias de ejemplo**
  (marcados así en el JSON, `"example": true`) y fotos sintéticas propias generadas por un script de fixtures (nada
  descargado de terceros).
- `src/lib/glitch-composition/types.ts`: `GlitchPieceError` y sus códigos.
- Tests: el ejemplo valida; faltar crédito, licencia, `faceRegions`, POV o una de las ocho noticias falla con la ruta
  del campo; un campo `template` o `coverTemplate` de la edición actual es rechazado por el schema (strict).

### Slice 2 — Extensión `glitch` del brand pack y tokens compilados (requiere TASK-1922)

- `scripts/glitch/compile-tokens.ts` → `pnpm glitch:tokens` y `pnpm glitch:tokens --check`: compila `glitchLine` de
  `@efeoncepro/axis-tokens` a `catalogs/glitch/glitch-tokens.css` (custom properties) y a un snapshot JSON para los
  tests; copia byte a byte desde `@efeoncepro/axis-brand-assets` el wordmark oscuro, la manzana, los cinco glifos
  Plastilina y el logo negativo de Efeonce a `catalogs/glitch/assets/`. Reusar `buildCatalogTokensCss` y el patrón de
  `scripts/brand-surfaces/compile-tokens.ts` `[verificar]` si conviene extender ese script en vez de uno nuevo.
- Guttery en `brand-packs/axis/fonts.json` con `extension: "glitch"`, `license` y `embedRights: true` **sólo si la
  licencia está confirmada por escrito**; binario en `brand-packs/axis/fonts/`. Sin licencia: no se agrega y el
  catálogo declara Guttery como fuente requerida de la portada B (ver Slice 4).
- Pares de contraste de Glitch (verde sobre `#001a33` permitido para titulares grandes; verde sobre claro prohibido)
  como extensión del pack, igual que `editorial-roles.json` `[verificar]` el mecanismo de `contrastPairs`.
- Tests: `brand-pack-sync.test.ts` y el test de fuentes del pack pasan; `glitch:tokens --check` detecta drift.

### Slice 3 — Directorio de plantillas y los tres catálogos delgados

- `src/lib/artifact-composer/catalogs/glitch/registry.json`: una entrada por plantilla con `name`, `contentTypes`,
  `prototype`, `slotsRef` y dos campos de datos de Glitch: `approval` (`approved` | `proposed`) y `catalogs` (subconjunto
  de `carousel`, `stills`, `overlays`), más `sphere` (`apple` | `lens` | `none`) y `surfaceTone` (`dark` | `light`).
- `catalogs/glitch/index.ts`: `createGlitchCarouselCatalog` (`outputTarget: 'pdf-merged'`), `createGlitchStillsCatalog`
  (`'png-set'`) y `createGlitchOverlaysCatalog` (`'png-set'`), los tres con `templatesDir` = la misma carpeta,
  `ownerOrgId: 'efeonce'`, `brand.packName: 'axis'` y `packExtensions: ['graphic-line', 'glitch']` `[verificar]` si
  Bricolage llega por `graphic-line` o se declara en `glitch`.
- Validadores semánticos transversales (Detailed Spec · Validadores): `glitch.catalog-membership@1` y
  `glitch.piece-approval@1`.
- Tests: `auditRegistry` sin problemas; una plantilla de `stills` pedida al catálogo `carousel` falla con
  `glitch.catalog-membership`; una plantilla `proposed` falla con `glitch.piece-approval`.

### Slice 4 — Plantillas APROBADAS

- Lienzo 1080 × 1350, fondo `#001a33` por token, firma de Efeonce centrada abajo, cabecera sin línea fina:
  - `CoverPhoto` (portada A), `CoverType` (portada B), `CoverMosaic` (portada C).
  - `Interior` y `InteriorOpening` (noticia 1 con la franja «EL MICRÓFONO SE ABRE»).
  - `BackCover` (contraportada: «El micrófono se cierra», acciones Plastilina «SI TE SIRVIÓ», píldora «Suscríbete a
    [wordmark]», firma 300 px + eslogan).
- Cada plantilla con su `*.slots.json`: todos los textos con `maxCharacters` y `overflow: "reject"`; titulares como
  objeto `{ entry, punch }` (contraste de pesos); crédito y licencia de la foto como campos requeridos (el crédito se
  pinta, la licencia es `validation-only`); `example` en los campos que el probe del gate no ejerce con texto.
- Pertenencia: las seis en `carousel` y `stills` (lámina suelta o post suelto de una lámina).
- Portada B: si Guttery no está en el pack, `CoverType` queda con `approval: "approved"` pero el mapper la excluye de
  las candidatas con `font-license-missing` (la rotación sigue con A y C).
- Referencia visual: canvas «Glitch en La órbita» (sistema de portada APROBADO, lámina interior, contraportada) y
  `apps/lab/public/media/glitch/*.webp` de AXIS; los valores, desde `glitch-tokens.css`.

### Slice 5 — La falla en bytes y el duotono (la geometría pura puede adelantarse)

- `src/lib/glitch-composition/byte-fracture.ts`: `computeByteFracture({ seed, width, height, edge, cell, faceRegions })`
  → lista de celdas (posición de origen, desplazamiento, opacidad) **pura y determinista**; `seed` = SHA-256 de los
  bytes de la foto procesada; `edge` = `bottom` | `left` | `right`; excluye toda celda que intersecte una región de
  rostro y falla con `fracture-over-face` si la banda del borde elegido intersecta un rostro.
- Layout hook `glitch-fracture` en `catalogs/glitch/`: lee la geometría del slot `resolver-only` que produjo el mapper y
  pinta las celdas como recortes de la misma imagen (sin JavaScript de azar en la página). La manzana en bytes usa la
  misma función con la caja de la manzana (8 bits por celda).
- Materializador `scripts/glitch/photos.ts`: con sharp aplica el duotono navy (`#001a33` → `#cfe4fa`, valores desde el
  snapshot del token) y **pre-rasteriza la foto al tamaño exacto de su hueco × deviceScaleFactor** (mitigación de
  ISSUE-122: Chromium hace blit 1:1 sin re-muestrear); entrega bytes al motor por `externalAssets`.
- Tests: misma foto → misma lista de celdas y mismo PNG; otra foto → otra lista; una región de rostro en la banda →
  `fracture-over-face`; ninguna celda intersecta un rostro declarado fuera de la banda.

### Slice 6 — Mapper del manifiesto, selector de portada y validadores de la edición

- `src/lib/glitch-composition/index.ts`: `planGlitchEdition(manifest, options)` produce los tres
  `CompositionPlanInput` (carrusel = portada + 8 interiores + contraportada = 10 láminas; stills = las mismas láminas
  como PNG más las piezas sueltas pedidas; overlays = las piezas del reel pedidas) y la lista `GlitchAssetRequest[]`.
- `resolveCoverContentType(manifest)`: candidatas por contenido en el orden de la norma (A si la noticia de portada
  tiene `photo.strong: true`; B si hay `cover.standalonePov`; C si `cover.mosaic` trae cuatro noticias), menos la
  plantilla de `previousEdition.coverTemplate`, menos las bloqueadas por licencia de fuente; toma la primera; si no
  queda ninguna, `cover-rotation-unsatisfiable`. La plantilla anterior viaja como slot `validation-only`
  (`previousCoverTemplate`) en la portada.
- Validadores semánticos de edición (Detailed Spec · Validadores): `glitch.cover-rotation@1`,
  `glitch.single-sphere@1`, `glitch.headline-contrast@1`, `glitch.photo-credit@1`, `glitch.face-safe-fracture@1`,
  `glitch.accent-on-light@1` y `glitch.edition-structure@1`.
- Sólo importa tipos y `@/lib/artifact-composer/pure`.
- Tests con fixtures: la tabla de rotación completa (A→¬A, B→¬B, C→¬C, `none` en la primera edición compuesta); un
  plan con `template` declarado → `TemplateAuthorityError`; cada validador con un caso que pasa y uno que falla.

### Slice 7 — Lente, blog y piezas del reel

- **Aprobadas el 2026-09-27** (construidas abiertas, `approval: "approved"`, con línea base de píxeles como las del
  Slice 4):
  - `InteriorLens` (lente de La órbita; `sphere: "lens"`, el POV no cierra con manzana) — `carousel`, `stills`.
    **Variante ocasional:** sólo cuando el POV trata de un detalle nítido de la foto; nunca por defecto. `[verificar]`
    cómo lo declara el manifiesto: el schema del Detailed Spec todavía no tiene el campo que la activa (lo define el
    Slice 1, sin que el autor elija plantilla).
  - `BlogBannerPhoto`, `BlogBannerType`, `BlogBannerMosaic` (1920 × 1080, las portadas A/B/C en horizontal, sin
    «Desliza») — `stills`.
  - `BlogBannerSquare` (1:1 para el archivo del blog): **plantilla propia** derivada de las portadas, nunca el recorte
    de la portada 4:5 — `stills`.
  - `BlogNewsBanner` (banner interno 1600 × 900, duotono navy + bytes + chip número/sección + wordmark), con el
    **crédito de la foto obligatorio** (slot requerido y pintado) — `stills`.
- **Siguen en `approval: "proposed"`** `[verificar]` con el operador (la aprobación del 2026-09-27 no las nombra; el kit
  del reel se aprobó como motion): sin línea base de píxeles (sólo prueba de humo: renderiza, tiene tinta, no cae en
  fuente de respaldo); entran a la línea base en el mismo PR que las aprueba.
  - `ReelCover` (1080 × 1920) y `VideoThumbnail` (1280 × 720) — `stills`.
  - Overlays del reel con `render.background: "transparent"` (1080 × 1920, respetando el mapa de zonas: nada en 0–220,
    desde 1500 ni desde x 940): `ReelHeader`, `ReelLowerThird`, `ReelSubtitle`, `ReelNewsCard`, `ReelSourceSplit`,
    `ReelDrop`, `ReelLastLine` — `overlays`. La apertura animada y la tarjeta final son movimiento (TASK-1924).
- Aprobar una pieza = cambiar su `approval` en el registry en el mismo PR que su línea base, con el estado del contrato
  `efeonce.glitch-line` de AXIS como fuente; un test de drift falla si el registry y el contrato difieren.

### Slice 8 — CLI `pnpm glitch:compose`

- `scripts/glitch/compose.ts` (con `tsx`, como `brand:compose`):
  `pnpm glitch:compose -- --manifest <edition.json> [--out <dir>] [--only carousel|stills|overlays]`.
- Valida el manifiesto → `planGlitchEdition` → materializa fotos y assets (Slice 5) → `resolvePlan` + `composeArtifact`
  por catálogo.
- Escribe en `--out` (por defecto `.captures/glitch/<número>/`): `carousel/glitch-<n>.pdf` y sus PNG, `stills/*.png`,
  `overlays/*.png`, un `*.resolved-manifest.json` por catálogo (el `ResolvedCompositionManifest` del motor) y
  `glitch-<n>.provenance.json` (SHA-256 del manifiesto de edición, de cada foto fuente y procesada, versiones de los
  paquetes AXIS, hash del registry, fuentes selladas; sin fechas).
- Sale con código distinto de cero y la lista de issues (código, ruta, mensaje es-CL) ante manifiesto inválido, pieza
  no aprobada, rotación insatisfacible, licencia faltante o falla sobre un rostro.
- Reporta el peso del PDF y lo compara con el límite de LinkedIn para documentos `[verificar]` el límite vigente
  (Open Questions); si lo excede, falla con `carousel-too-heavy`.

### Slice 9 — Gates

- `scripts/artifact-composer/visual-gate.ts`: **una** entrada de probe para la carpeta `catalogs/glitch/`
  (frameDir `templates-glitch`), con un filtro que sólo baselinea plantillas `approval: "approved"`; scope
  `--catalog=glitch`.
- Líneas base en `scripts/frontend/baselines/artifact-composer/templates-glitch/**` + fila en `BASELINE_DELTAS.md` +
  `baseline-manifest.json`; freeze single-owner y atómico según el runbook (freeze + commit juntos).
- Alta de la carpeta en los tests por catálogo (`catalog-portability.test.ts`, `template-authority.test.ts`,
  `external-assets.test.ts`, `quality-gates.test.ts`) y guardas propias: sin HEX/`rgb()`/familia/duraciones en las
  plantillas, sin la manzana ni el verde en plantillas `sphere: "none"` de tono claro, sin burbuja URL.
- Prueba cross-proceso de las láminas con foto: dos renders desde procesos frescos separados dan cero píxeles de
  diferencia (criterio de ISSUE-122).

### Slice 10 — Documentación y skill

- Delta en la norma (§10 flujo implementado, §12 dónde se ve) y en el ADR de Glitch (qué existe).
- Manual nuevo `docs/manual-de-uso/creative/componer-una-edicion-de-glitch.md` (llenar el manifiesto, correr el
  comando, leer los errores, qué no hacer).
- Documentación funcional corta `[verificar]` la carpeta de creative en `docs/documentation/`.
- `references/glitch.md` de la skill `efeonce-graphic-line` (§9 deja de decir «no existe») y su espejo `.codex/`;
  `pnpm skills:mirrors`.

## Out of Scope

- Cualquier cambio al motor (`catalog.ts`, `compose.ts`, `render.ts`, `contracts.ts`, `plan.ts`, `selector.ts`).
- Ruta productiva gobernada: command, endpoint `api/platform/app/**`, capability, consumer del `artifact-worker`, tool
  MCP, flag, asset versionado. Es follow-up (TASK-1921 o task nueva).
- Movimiento: apertura y cierre animados, overlays en video con alfa, sincronía con el mnemónico (TASK-1924).
- Tokens, archivos oficiales, contrato `efeonce.glitch-line` y alta de los glifos Plastilina en AXIS (TASK-1922).
- El dominio de ediciones, la API y la numeración (TASK-1442); el piloto (TASK-1441).
- Publicación en LinkedIn (Metricool) o WordPress, y el callout v2 del bloque `efeoncepro/glitch-drop` (TASK-1337 y su
  aprobación).
- Exploración: historia 9:16, carrusel panorámico, acentos teal y naranja.
- Detección automática de rostros (las regiones las declara el editor en el manifiesto).
- La maqueta completa del post del blog (apertura, escaleta, cierre): es WordPress, no el composer.
- Salida PPTX o Adobe Express.
- Cambiar `deck-axis`, `graphic-line-*`, `insights-*` o la línea base de SKY.

## Detailed Spec

### Manifiesto de edición (`GlitchEditionManifest`, `schemaVersion: 1`)

```jsonc
{
  "schemaVersion": 1,
  "edition": { "number": 17, "publishDate": "2026-10-05", "weekRange": { "from": "2026-09-28", "to": "2026-10-04" } },
  "thesis": "…",                                   // tesis de la edición (apertura y blog)
  "previousEdition": { "number": 16, "coverTemplate": "A" },   // "A" | "B" | "C" | "none" (explícito)
  "cover": {
    "newsId": "n1",                                // noticia de portada
    "standalonePov": { "entry": "…", "punch": "…" } | null,   // candidata B
    "mosaic": ["n2", "n3", "n4", "n5"] | null,                // candidata C (exactamente 4)
    "muletilla": "spoiler:" | null,                            // voz del narrador (Guttery)
    "lines": ["…", "…"]                                        // dos líneas de portada «+ IA»
  },
  "news": [                                        // exactamente 8, en orden
    {
      "id": "n1",
      "section": "marketing" | "creatividad" | "tecnologia",  // se pinta «SECCIÓN + IA»
      "headline": "…",
      "outlet": "…", "date": "2026-09-30",
      "photo": {
        "file": "fotos/n1.jpg",                    // relativo al manifiesto (local); asset ref en TASK-1442
        "credit": "…",                             // se pinta
        "license": { "kind": "licensed" | "owned" | "press-kit" | "generated", "ref": "…" },  // validation-only
        "strong": true,                            // candidata A si es la de portada
        "fractureEdge": "bottom" | "left" | "right",
        "faceRegions": [{ "x": 0.41, "y": 0.12, "w": 0.18, "h": 0.30 }]  // normalizado; [] = sin rostros (explícito)
      },
      "pov": { "entry": "…", "punch": "…" },       // remate del Glitch Drop
      "why": "…"                                   // el porqué en Poppins
    }
  ],
  "back": { "closingLine": "…" },
  "outputs": { "stills": ["cover", "interior:n3"], "overlays": [] }   // piezas sueltas pedidas (opcional)
}
```

- `strict`: campos desconocidos se rechazan (así un `template` no se cuela).
- Los largos máximos no viven en el schema sino en los `*.slots.json` (única fuente: el contrato de la plantilla); el
  mapper no recorta nada.
- La numeración es dato: el composer no decide la serie (el operador fijó el 2026-09-27 que la próxima es la #17, en la
  serie del blog y del pipeline editorial).

### Pertenencia y aprobación (un `templatesDir`, tres catálogos)

- El motor carga el mismo `registry.json` para los tres catálogos. `glitch.catalog-membership@1` lee
  `snapshot.registry` y falla si una lámina resuelve a una plantilla cuyo `catalogs` no incluye el catálogo en curso.
- `glitch.piece-approval@1` falla si la plantilla resuelta tiene `approval: "proposed"`. El mapper aplica la misma
  regla antes (mensaje legible, `piece-not-approved`); el validador es la segunda línea para cualquier plan que no pase
  por el mapper.
- Un test de drift compara `approval` del registry con el estado de cada pieza del contrato `efeonce.glitch-line`
  (TASK-1922). Aprobar es cambiar dato en AXIS y en el registry, no código.

### Validadores semánticos (deterministas; sólo plan + registry)

| Validador | Falla cuando |
|---|---|
| `glitch.catalog-membership@1` | la plantilla no pertenece al catálogo |
| `glitch.piece-approval@1` | la plantilla está en PROPUESTA |
| `glitch.cover-rotation@1` | la plantilla de portada es igual a `previousCoverTemplate` |
| `glitch.single-sphere@1` | la lámina lleva manzana y lente a la vez (por `sphere` del registry y los slots de cierre) |
| `glitch.headline-contrast@1` | un titular o POV no trae entrada y remate, o el remate está vacío |
| `glitch.photo-credit@1` | una foto no trae crédito o licencia, o la licencia es de un tipo no admitido |
| `glitch.face-safe-fracture@1` | la geometría de la falla intersecta una región de rostro |
| `glitch.accent-on-light@1` | un slot con tono de acento cae en una plantilla `surfaceTone: "light"` |
| `glitch.edition-structure@1` | el carrusel no es portada + 8 interiores (el primero `InteriorOpening`) + contraportada, o el avance n/8 no calza |

### Rotación de portada

| Semana anterior | Candidatas por contenido | Resultado |
|---|---|---|
| A | A y B | B |
| B | A y C | A |
| C | sólo C | `cover-rotation-unsatisfiable` |
| none | A, B y C | A |

Precedencia A > B > C según el orden de la norma §4.2 (confirmar en Open Questions).

### Falla en bytes

- Geometría en TypeScript puro (`computeByteFracture`), no en la página: se prueba sin Chromium y es la misma que usará
  TASK-1924 para animar.
- La semilla es el SHA-256 de la foto **procesada**; la cuadrícula y el tamaño de celda salen del token `glitchLine`.
- La página sólo pinta: recortes de la misma imagen por `background-position`, sin `Math.random`.

### Fotos y cero píxeles (ISSUE-122)

- El materializador entrega cada foto ya en duotono y ya al tamaño exacto de su hueco × deviceScaleFactor, en PNG sin
  perfil embebido; la plantilla la muestra sin `object-fit` que re-muestree.
- El render ya fuerza `--force-color-profile=srgb`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 y Slice 5 (sólo `computeByteFracture`) pueden correr antes de que cierre TASK-1922.
- TASK-1922 publicada y fijada → Slice 2 → Slice 3 → Slice 4 → Slice 5 (hook y materializador) → Slice 6 → Slice 8 →
  Slice 9 → Slice 10.
- Slice 7 corre después del Slice 6 y antes del Slice 9 (el gate necesita el filtro por aprobación ya probado).
- Slice 2 MUST ship antes que cualquier plantilla: sin tokens compilados, una plantilla sólo podría llevar literales.
- Slice 9 MUST cerrar antes de declarar los catálogos listos para una ruta productiva.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fotos raster rompen el cero píxeles entre procesos (ISSUE-122) | composer / gate visual | high | pre-rasterizado al tamaño exacto + sRGB forzado + prueba cross-proceso en el Slice 9 | `pnpm composer:visual-gate` rojo sólo en áreas de foto |
| Tres catálogos sobre una carpeta: una plantilla sale en el catálogo equivocado | composer | medium | `glitch.catalog-membership@1` + test por catálogo | test de pertenencia rojo |
| Una pieza en PROPUESTA se publica como canon | marca | medium | `approval` como dato, doble control (mapper + validador), sin línea base hasta aprobarse | `piece-not-approved` en el CLI |
| Guttery sin licencia termina embebida en un PDF público | legal / marca | medium | la fuente sólo entra con `embedRights: true` y licencia escrita; el compilador del pack falla cerrado sin `embedRights` | `font-license-missing` |
| Foto de tercero sin licencia en el carrusel | legal | medium | crédito y licencia requeridos por schema y por validador | `photo-license-missing` |
| La falla en bytes cae sobre un rostro | marca | low | regiones de rostro declaradas obligatorias + validador + exclusión de celdas | `fracture-over-face` |
| El contrato `efeonce.glitch-line` cambia después de fijado | contrato AXIS | medium | versiones exactas; `glitch:tokens --check`; test de drift de aprobación | `--check` rojo |
| El cambio en `visual-gate.ts` altera catálogos existentes | composer | low | sólo se agrega una entrada y un filtro opcional; gate global antes de commitear | frames ajenos en rojo |
| Otra sesión hace `--freeze` en paralelo | checkout compartido | medium | protocolo single-owner del runbook; freeze + commit en una sola llamada | archivos de línea base ajenos en `git status` |
| El manifiesto diverge del que necesita TASK-1924 | contrato de datos | medium | tipos únicos en `src/lib/glitch-composition/`; `schemaVersion`; revisión cruzada con TASK-1924 antes de cerrar | error de tipos en TASK-1924 |

### Feature flags / cutover

Sin flag: herramienta local y aditiva, sin runtime de producción. El «corte» por pieza es el campo `approval` del
registry, que es dato versionado y reversible con un commit. El flag productivo lo declara la task de la ruta
productiva.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir `src/lib/glitch-composition/manifest.ts` y ejemplos | minutos | si |
| Slice 2 | revertir el compilador, `glitch-tokens.css`, assets copiados y la entrada de Guttery en `fonts.json` | minutos | si |
| Slice 3 | revertir `catalogs/glitch/` (registry e `index.ts`) | minutos | si |
| Slice 4 | revertir las plantillas aprobadas | minutos | si |
| Slice 5 | revertir `byte-fracture.ts`, el hook y el materializador | minutos | si |
| Slice 6 | revertir el mapper y los validadores | minutos | si |
| Slice 7 | revertir las plantillas de lente, blog y reel; las aprobadas retiran su línea base con una fila en `BASELINE_DELTAS.md` | minutos | si |
| Slice 8 | revertir `scripts/glitch/compose.ts` y el script de `package.json` | minutos | si |
| Slice 9 | quitar la entrada de probe, revertir `templates-glitch/**` y agregar fila de retiro en `BASELINE_DELTAS.md` | minutos | si |
| Slice 10 | revertir los deltas de docs y skill | minutos | si |

### Production verification sequence

Sin producción en esta task (repo-only, no production runtime impact). Verificación local en orden:

1. Tests focales de `src/lib/glitch-composition` y de `catalogs/glitch/` (schema, rotación, validadores, geometría).
2. `pnpm glitch:tokens --check` sin drift.
3. `pnpm glitch:compose -- --manifest src/lib/glitch-composition/examples/edition-17.example.json`: PDF de 10 páginas a
   1080 × 1350, PNG y procedencia.
4. Dos corridas seguidas del paso 3 en procesos separados: PNG idénticos byte a byte.
5. Casos de falla del CLI: portada repetida, pieza en propuesta, foto sin licencia, rostro en la banda.
6. `pnpm composer:visual-gate --catalog=glitch` a cero píxeles y el gate global sin frames nuevos en rojo (SKY
   incluida).
7. `pnpm local:check`, `pnpm test` completo y `pnpm build` antes de cerrar.

### Out-of-band coordination required

- Aprobación del operador del flujo de composición (ADR `Proposed` → `Accepted`) antes de tomar la task.
- Confirmación escrita de la licencia de Guttery para web y video.
- Coordinación con la sesión dueña de TASK-1922 si AXIS publica una versión que cambie el contrato mientras esta task
  corre, y con la de TASK-1924 ante cualquier cambio de forma del manifiesto.
- Aviso a otras sesiones antes de un `--freeze` del gate (runbook del visual gate).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El ADR de Glitch tiene el flujo de composición en `Accepted` antes del primer commit de código.
- [ ] `GlitchEditionManifest` (`schemaVersion: 1`) valida `edition-17.example.json` y rechaza, con la ruta del campo,
      un manifiesto sin crédito, sin licencia, sin `faceRegions`, con menos de ocho noticias o con un campo `template`.
- [ ] `edition-17.example.json` usa titulares de ejemplo marcados como tales y fotos sintéticas propias; ningún archivo
      de terceros entra al repo.
- [ ] Los tres catálogos (`glitch-carousel` `pdf-merged`, `glitch-stills` `png-set`, `glitch-overlays` `png-set`)
      comparten un mismo `templatesDir` y ningún archivo del motor cambia (`git diff` vacío en
      `src/lib/artifact-composer/*.ts`).
- [ ] Una plantilla pedida a un catálogo al que no pertenece falla con `glitch.catalog-membership`.
- [ ] Las seis plantillas aprobadas (`CoverPhoto`, `CoverType`, `CoverMosaic`, `Interior`, `InteriorOpening`,
      `BackCover`) existen con `approval: "approved"`; todos sus textos declaran `maxCharacters` y `overflow: "reject"`.
- [ ] Las plantillas aprobadas el 2026-09-27 (`InteriorLens`, `BlogBannerPhoto`, `BlogBannerType`,
      `BlogBannerMosaic`, `BlogBannerSquare` propia 1:1 y `BlogNewsBanner` con crédito requerido) existen con
      `approval: "approved"` y línea base de píxeles; `BlogBannerSquare` no es un recorte de la portada 4:5.
- [ ] El mecanismo de PROPUESTA se conserva para piezas futuras: una plantilla con `approval: "proposed"` (las piezas
      del reel que sigan así o, si no queda ninguna, un fixture de test) pedida por el CLI sale con código distinto de
      cero y `piece-not-approved`, y un plan armado a mano con ella falla en `glitch.piece-approval`.
- [ ] La tabla de rotación del Detailed Spec pasa completa en tests, incluido `cover-rotation-unsatisfiable`.
- [ ] Un plan que declara `template` falla con `TemplateAuthorityError`.
- [ ] Cada uno de los nueve validadores semánticos tiene un fixture que pasa y uno que falla.
- [ ] `computeByteFracture` devuelve la misma lista para la misma foto, otra para otra foto, y ninguna celda intersecta
      una región de rostro declarada.
- [ ] Ninguna plantilla del catálogo contiene HEX, `rgb()`, familia tipográfica, px de diseño ni duraciones literales
      (guarda de test), ni burbuja URL.
- [ ] Guttery está en `fonts.json` con `extension: "glitch"` y `embedRights: true` sólo si la licencia quedó
      confirmada por escrito; si no, `CoverType` queda fuera de las candidatas con `font-license-missing` y así lo
      registra la procedencia.
- [ ] `pnpm glitch:compose` sobre el ejemplo produce un PDF de 10 páginas a 1080 × 1350, un PNG por lámina, un
      `*.resolved-manifest.json` por catálogo y `glitch-11.provenance.json` sin fechas.
- [ ] Dos corridas en procesos separados con el mismo manifiesto y las mismas fotos dan PNG idénticos byte a byte.
- [ ] `pnpm glitch:tokens --check` pasa contra la versión de AXIS fijada.
- [ ] `pnpm composer:visual-gate --catalog=glitch` da cero píxeles en las plantillas aprobadas y el gate global no
      suma frames en rojo; `BASELINE_DELTAS.md` registra el alta.
- [ ] El peso del PDF de ejemplo queda bajo el límite vigente de LinkedIn para documentos, citado con su fuente y
      fecha en el manual.
- [ ] Norma, ADR, manual, documentación funcional y skill (`efeonce-graphic-line`, con espejo) actualizados.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (completo al cerrar) y tests focales de `src/lib/glitch-composition` y `src/lib/artifact-composer`
- `pnpm composer:visual-gate --catalog=glitch` y el gate global
- `pnpm glitch:tokens --check`
- `pnpm glitch:compose -- --manifest src/lib/glitch-composition/examples/edition-17.example.json`
- `pnpm skills:mirrors`
- `pnpm build` (gate de cierre)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1924 recibió un `## Delta` con la forma final del manifiesto y la ruta de `computeByteFracture`
- [ ] TASK-1921 (o la task nueva de la ruta productiva de Glitch) recibió un `## Delta` con los nombres de los catálogos
      y del mapper
- [ ] TASK-1442 recibió un `## Delta` con el contrato del manifiesto que su dominio deberá producir
- [ ] ISSUE-122 recibió nota con el resultado de la prueba cross-proceso de las láminas con foto

## Follow-ups

- **Registro en Marketing Studio (aceptado por el operador, 2026-09-27):** cada edición compuesta —PDF del carrusel y PNG— se registra como piezas con versión en el calendario orgánico de Marketing Studio vía `/api/v1` o su tool MCP. Marketing Studio registra; no produce.
- Ruta productiva de Glitch (command, endpoint, capability con grant, consumer del `artifact-worker`, asset con
  procedencia, tool MCP, flag): sumarla a TASK-1921 si su dueño de dominio lo admite, o abrir una task nueva de EPIC-031.
- Adapter del dominio de ediciones de TASK-1442 → `GlitchEditionManifest` cuando ese dominio exista.
- Detección asistida de rostros para proponer `faceRegions` (hoy los declara el editor).
- Aprobación y línea base de cada pieza en PROPUESTA a medida que el operador las apruebe (hoy sólo las piezas del
  reel del Slice 7 `[verificar]`).
- Callout «DROP» v2 del bloque de WordPress: **aprobado el 2026-09-27** desde la #17; lo ejecuta TASK-1337 antes de
  publicar la #17 (fuera del composer).

## Open Questions

1. ~~**Numeración: #11 o #16.** El operador dice que la próxima edición es la #11; el ADR del pipeline editorial y
   TASK-1441/1442 usan #16 en adelante.~~ **Resuelta el 2026-09-27:** la próxima es la **#17**, en la serie del blog y
   del pipeline editorial; los «#11»–«#14» del canvas son ejemplos de diseño. El ejemplo es `edition-17.example.json`.
2. **Licencia de Guttery (resuelta 2026-09-27):** el operador confirmó la licencia para web y video. Guttery entra a la
   extensión `glitch` del pack con `embedRights: true` y la referencia del contrato que registra TASK-1922.
3. **Aprobación de las piezas en PROPUESTA** — **resuelta en parte el 2026-09-27:** aprobados el interior con lente
   (variante ocasional), los banners del blog 16:9 A/B/C, la 1:1 como plantilla propia y el banner interno (con
   crédito). Sigue abierta para la portada del reel, la miniatura y los overlays PNG del reel `[verificar]`: la
   aprobación no las nombra y el kit del reel se aprobó como motion.
4. **Límite de LinkedIn para documentos** (peso y páginas del PDF) `[verificar]` en la documentación vigente de
   LinkedIn antes del Slice 8.
5. **Precedencia de la portada** cuando el contenido califica para más de una plantilla: se propone A > B > C (orden de
   la norma §4.2). ¿Es correcta?
6. **Licencias admitidas para fotos de noticias**: ¿el kit de prensa de la fuente cuenta como licencia suficiente, o
   sólo `licensed`/`owned`/`generated`?
7. **Flujo de composición `Proposed` (abierta):** el ADR debe pasar a `Accepted` antes de tomar la task; sin respuesta
   del operador al 2026-09-27.
8. ~~**Línea de servicio de Glitch** (Growth recomendada, Brand alternativa): define la última palabra del eslogan de la
   contraportada.~~ **Resuelta el 2026-09-27:** Growth; el eslogan es «Empower your Growth» y sale del token que
   publique TASK-1922.
