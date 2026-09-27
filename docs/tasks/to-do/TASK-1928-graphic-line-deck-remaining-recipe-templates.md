# TASK-1928 — Plantillas del deck «La órbita» para las 38 recetas aprobadas que aún no tienen

## Delta 2026-09-27 — lo que TASK-1927 ya dejó hecho

- Las **17 portadas y contraportadas** aprobadas que el contrato admite ya tienen plantilla en `graphic-line-deck`
  (`cover-brochure`, `cover-proposal` orbit/dawn, `close-brochure` orbit/photo, `close-proposal`), igual que
  `proposal-cinematic` hero y lines, las tres composiciones de `section-split` y el tríptico de una palabra por toma.
  Esta task queda sólo con las recetas interiores.
- Queda fuera de las dos tasks `cover-brochure-cine-lines-selection`: el contrato de AXIS no admite selección en
  `cover-brochure`. Necesita una decisión en AXIS antes de tener plantilla.
- Patrones que esta task puede reutilizar, ya probados: una plantilla por composición con `contentType`
  `deck.<receta>.<layout>` (sin ramas dentro de una plantilla aprobada); varias composiciones sobre un mismo HTML con un
  contrato de slots por composición (`section-split`); plantillas sin respaldo en CSS, con cada medida como custom
  property obligatoria; resolvers `gl-color`, `gl-slogan-run`, `gl-backdrop-ref`, `gl-file-ref` y `gl-split-layout`;
  builders del marco en `src/lib/brand-surfaces/recipes/frame.ts`.
- Lección de TASK-1927: antes de escribir una plantilla, confirmar que AXIS mide TODO lo que la lámina pinta. Lo que
  sólo existía en el script aprobado se tokenizó en AXIS (`v0.3.13`, `v0.3.14`) antes de componer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; AXIS main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

> **Perfil inferido (ajustable):** `standard` con `Backend impact: none`, igual que TASK-1919 y TASK-1927: son
> plantillas del catálogo `graphic-line-deck`, builders del mapper puro `src/lib/brand-surfaces/` y el CLI local
> `pnpm brand:compose`. No hay base de datos, API ni UI del portal. La ruta productiva es TASK-1921 y la salida desde
> Proposal Studio es TASK-1932. P2 porque hoy esas láminas salen como maqueta de dirección declarada, no porque algo
> esté roto.

## Summary

El operador aprobó el 2026-09-27 las 69 láminas del deck «La órbita» y cada una tiene receta en
`docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json`. Hoy sólo 20 recetas se componen
con `pnpm brand:compose`. Esta task lleva a plantilla del Artifact Composer las **38 recetas** que no tienen plantilla ni
dueña en otra task: secciones con lente, sangre y cine, «about», contenido y día a día, método, prueba, propuestas
sobrias, cotización, próximos pasos y respiro. Cada una sale con sus slots como datos, builder en el mapper, intent de
ejemplo y frame en el visual gate a cero píxeles, con los pendientes de QA de esas láminas corregidos en la plantilla.

## Why This Task Exists

- **El catálogo está aprobado pero no es componible.** De las 69 recetas, 7 tienen plantilla vigente
  (`section-classic`, `content-measure`, `method-staircase` y los cuatro `proposal-cinematic-*` con layout `service`),
  TASK-1927 se queda con 24 (portadas, contraportadas, sección partida con sus dos variantes, tríptico y los layouts
  `hero`/`lines` de `proposal-cinematic`) y las **38 restantes** sólo existen como referencia aprobada y prototipo de
  dirección fuera del repo (`ai-generations/2026-09-27_deck-recetas/render-src/*.mjs`). Un deck real mezcla láminas de
  plantilla con láminas armadas a mano; el manual lo declara como «maqueta de dirección declarada».
- **Los pendientes de QA viven en las referencias aprobadas.** La norma dice que se corrigen al llevar la receta a
  plantilla de producción: respuesta bajo 3× la pregunta en cotización, clientes, plan y partners; acento de línea en
  texto de menos de 24 px; cifras sin fuente visible; Partners sin burbuja URL; velo sobre el plate de «Quiénes somos»;
  logo chico en las secciones cine; dirección de contacto fuera del SSOT. Sin plantilla, cada deck vuelve a heredar el
  mismo defecto.
- **Sin plantilla no hay producto.** El plan validado (TASK-1929), los datos reales (TASK-1930), los plates gobernados
  (TASK-1931) y la salida desde Proposal Studio (TASK-1932) necesitan que la receta sea una plantilla del catálogo: el
  composer nunca renderiza una lámina que no existe en su registro.

## Goal

- Las 38 recetas son plantillas de `graphic-line-deck`, con `slots.json` derivado de los slots de la receta
  (`name`, `type`, `required`, `maxChars`) y builder en el mapper que lee reservas, tipografía y color del manifest
  resuelto por AXIS.
- Cada receta compone desde su intent de ejemplo con `pnpm brand:compose` y tiene frame en
  `pnpm composer:visual-gate --catalog=graphic-line` a 0 px, con cada alta declarada en `BASELINE_DELTAS.md`.
- Los pendientes de QA de estas 38 recetas quedan corregidos en la plantilla y verificados por test o por el gate, no
  por revisión a ojo.
- El índice del catálogo de recetas dice qué receta tiene plantilla, derivado del `registry.json` del composer y no
  escrito a mano.

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
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` (§2.1 ruta por el composer, §4.6 deck y
  «Recetas por lámina», §6 reglas verificables, §7 estado)
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (voz pregunta–respuesta, órbita, firma, burbuja URL)
- `docs/operations/brand-graphic-line/deck-recipes/README.md` y `EFEONCE_DECK_SLIDE_RECIPES_V1.json` (contrato de
  slots, fijos, selección, foto, `prompts.composition`, pendientes de QA)
- `docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md` (excepción cine para secciones y «about»)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- Repo AXIS local `/Users/jreye/Documents/axis-design-system`: contrato `efeonce.surface-composition` vigente tras
  TASK-1927 y `docs/agent-composition/surfaces/deck.md`

Reglas obligatorias:

- AXIS es dueño de valores y contratos. **NUNCA** transcribir en una plantilla un px, un HEX o una familia tipográfica
  que el token o el manifest ya declaran; las medidas de la receta (`prompts.composition`) son dirección, no valores.
  Si falta un token o una receta en el contrato, se pide en AXIS y se espera la publicación.
- Una receta entra al catálogo sólo si AXIS la declara `approved`. Las que AXIS todavía no conozca se piden en AXIS
  antes de su slice; mientras tanto siguen fallando con `recipe-not-approved` y se siguen armando como maqueta declarada.
- El agente o el autor eligen **la receta**, nunca la plantilla: el `contentType` (`deck.<receta>`) lo deriva
  `src/lib/brand-surfaces` del manifest.
- Un texto que supera su `maxChars` falla la composición; nunca se reduce el cuerpo tipográfico ni se mueve la órbita
  o la foto para que quepa.
- Montos siempre `[MONTO]` en los intents de ejemplo; logos de terceros en un tono y con el mismo peso; la foto de
  ejemplo del caso Sky queda marcada como ejemplo.
- Gate visual a **cero píxeles**; `--freeze` single-owner, serializado y atómico con su commit y su declaración en
  `BASELINE_DELTAS.md`. El drift de foto raster es `ISSUE-122`, nunca motivo de rebaseline.

## Normative Docs

- `docs/manual-de-uso/creative/componer-deck-con-recetas.md`
- `docs/manual-de-uso/creative/componer-por-superficie-con-axis.md`
- `docs/operations/runbooks/composer-visual-gate.md`
- `docs/issues/open/ISSUE-122-composer-visual-gate-photo-nondeterminism-concurrency-docs.md`
- `docs/tasks/complete/TASK-1919-graphic-line-surfaces-artifact-composer.md`
- `docs/tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md`
- `ai-generations/2026-09-27_deck-recetas/DECISIONES.md` (fuera de git; las decisiones están también en la norma §4.6)

## Dependencies & Impact

### Depends on

- `TASK-1927`: contrato 0.1.2 en Greenhouse (`use`, `selection.anchor`, documento), plantillas de portada y cierre,
  sección partida corregida y tríptico nuevo. Sin esa base, las plantillas de esta task nacerían sobre 0.1.1 y habría
  que moverlas dos veces.
- Publicación en AXIS de las recetas que el contrato todavía no declara `approved` (out-of-band, repo
  `axis-design-system`). `[verificar]` al tomar la task cuáles de las 38 conoce el contrato vigente.
- Motor y catálogo existentes: `src/lib/artifact-composer/**`, `src/lib/artifact-composer/catalogs/graphic-line-deck/`,
  `src/lib/brand-surfaces/**`, `scripts/brand-surfaces/compose.ts`, `scripts/artifact-composer/visual-gate.ts`.

### Blocks / Impacts

- `TASK-1929`: el validador del plan distingue «receta con plantilla» leyendo el registro que esta task amplía.
- `TASK-1930`: los binders llenan los slots que esta task declara en cada `slots.json`.
- `TASK-1921` y `TASK-1932`: el consumer del `artifact-worker` renderiza estas plantillas; ninguna de las dos toca
  plantillas.
- `TASK-1395`: la matriz de capacidad PPTX debe declarar estas plantillas (nativa o falla cerrada).
- `TASK-1923` (Glitch): comparte motor y gate visual; coordinar el orden de `--freeze`.

### Files owned

- `src/lib/artifact-composer/catalogs/graphic-line-deck/<receta>.html` y `<receta>.slots.json` para las 38 recetas
  `[nuevos]`, `registry.json`, `index.ts`
- `src/lib/brand-surfaces/recipes/deck.ts` (sólo altas; si el plan decide partirlo por familia,
  `src/lib/brand-surfaces/recipes/deck/*.ts` `[nuevos]`)
- `src/lib/brand-surfaces/examples/deck-<receta>-intent.json` `[nuevos]`
- `src/lib/brand-surfaces/__tests__/**` (casos nuevos)
- `scripts/frontend/baselines/artifact-composer/templates-graphic-line-deck/**`,
  `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`, `baseline-manifest.json`
- `scripts/creative/deck-recipes/render-index.mjs` (columna «con plantilla» derivada del registro)
- `docs/operations/brand-graphic-line/deck-recipes/README.md` (sección «Qué sale hoy con un comando» y pendientes de QA)
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` (§2.1 y §7)
- `docs/manual-de-uso/creative/componer-deck-con-recetas.md`
- `.claude/skills/deck-studio/**`, `.claude/skills/efeonce-graphic-line/**` y sus espejos `.codex/skills/**`

## Current Repo State

### Already exists

- Catálogo `src/lib/artifact-composer/catalogs/graphic-line-deck/` con seis plantillas (`proposal-cinematic`,
  `section-classic`, `section-split`, `content-measure`, `triptych`, `method-staircase`), `registry.json` con
  `contentTypeTaxonomy` `deck.<receta>`, tokens compilados (`graphic-line-tokens.css`, `deck-tokens.css`) y fuentes
  locales.
- Mapper puro `src/lib/brand-surfaces/index.ts` (`planSurfacePiece`: receta aprobada → `resolveSurfaceComposition` →
  builder), builders en `src/lib/brand-surfaces/recipes/deck.ts` y 19 intents de ejemplo en `examples/`.
- CLI `pnpm brand:compose` (`scripts/brand-surfaces/compose.ts`), que materializa plates como data URI e inyecta los
  pintores de selección y CTA con `createCatalog(options)`.
- Gate `pnpm composer:visual-gate --catalog=graphic-line` a 0 px, con baselines en
  `scripts/frontend/baselines/artifact-composer/templates-graphic-line-deck/`.
- Catálogo de 69 recetas (`efeonce.deck-slide-recipes.v1`) validado por `pnpm brand:deck-recipes`
  (`scripts/creative/deck-recipes/render-index.mjs`), con referencias aprobadas en
  `ai-generations/2026-09-27_deck-recetas/references/` (fuera de git) y en AXIS `references/surfaces/deck/<id>.jpg`.
- SSOT de contacto `EFEONCE_CONTACT` en `src/config/efeonce-brand.ts`.

### Gap

- Sin plantilla ni builder: `section-lens`, `section-bleed`, `section-cine-services`, `section-cine-team`,
  `section-cine-about`, `section-cine-purpose`, `content-team`, `content-stack`, `contact-sheet`, `content-text`,
  `content-bullets`, `content-day`, `content-day-tools`, `content-day-live-progress`, `content-day-live-results`,
  `decision-agenda`, `decision-plan`, `method-hybrid-workforce`, `method-hybrid-workforce-scene`,
  `method-staircase-flat`, `method-score-ring`, `content-focus`, `content-clients`, `content-partners`,
  `decision-risk`, `decision-case`, `decision-chart`, `decision-testimonial`, `decision-why-us`, `proposal-service-aeo`,
  `proposal-service-creative`, `proposal-service-web`, `proposal-service-revops`, `content-pricing`,
  `content-pricing-stage`, `content-pricing-live`, `decision-next-steps`, `breather`.
- Los pendientes de QA de esas láminas siguen en sus referencias aprobadas.
- El índice del catálogo no sabe qué receta tiene plantilla; la tabla «Qué sale hoy con un comando» del README se
  mantiene a mano.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `src/lib/artifact-composer/catalogs/graphic-line-deck/` (plantillas), `src/lib/brand-surfaces/` (builders puros), `scripts/brand-surfaces/` y `scripts/creative/deck-recipes/` (CLI local)
- Future candidate home: `worker`
- Boundary: las plantillas se alcanzan sólo por `planSurfacePiece(intent)` y su entrada de documento (TASK-1927); el CLI local, el command de TASK-1921 y el consumer de TASK-1932 son los consumidores; el motor se usa sólo por su contrato público
- Server/browser split: sólo server y CLI; Chromium y la lectura de plates nunca van al browser ni a Vercel; los builders no tocan filesystem
- Build impact: sin dependencias nuevas; agrega plantillas HTML y `slots.json` al árbol del catálogo, que el Job `artifact-worker` ya empaqueta
- Extraction blocker: `none` (el render productivo vive en el Job `artifact-worker`; la frontera la cierran TASK-1921 y TASK-1932)

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

### Slice 1 — Base común de las 38 recetas

- Inventario contra el contrato AXIS vigente: qué recetas declara `approved`; las que falten se piden en AXIS con la
  referencia aprobada y la receta del JSON, y su slice espera la publicación.
- Convención de `slots.json` generado desde los slots de la receta: `text`/`richText` con `maxChars` medido,
  `money` como `[MONTO]`, `metric` con valor y fuente obligatoria, `logo`/`person`/`image` como referencia de asset,
  `list` con largo máximo, `enum` con sus valores; test que compara cada `slots.json` con su receta del JSON.
- Decisión del plan sobre la forma de los builders (un archivo o `recipes/deck/<familia>.ts`) sin cambiar la firma
  pública de `planSurfacePiece`.
- `render-index.mjs` lee `graphic-line-deck/registry.json` y agrega la columna «con plantilla» al índice; el README deja
  de mantener esa tabla a mano.

### Slice 2 — Secciones y «about» (8 recetas)

- `section-lens`, `section-bleed`, `section-cine-services`, `section-cine-team`, `section-cine-about`,
  `section-cine-purpose`, `content-team`, `content-stack`.
- QA en la plantilla: ningún degradado ni velo sobre el plate de `section-cine-about` y `section-cine-purpose` (la
  regeneración del plate con la reserva es de TASK-1926); las secciones cine siguen «lámina con foto a sangre sin logo»
  (§6 fila 19) salvo confirmación del operador; `content-team` usa sólo fotos del allowlist `squad-person`.

### Slice 3 — Contenido y día a día (8 recetas)

- `contact-sheet`, `content-text`, `content-bullets`, `content-day`, `content-day-tools`, `content-day-live-progress`,
  `content-day-live-results`, `decision-agenda`.
- QA en la plantilla: las etiquetas de los cuatro momentos y de los «vívelo» sin acento de línea en texto de menos de
  24 px (navy en papel, blanco en oscuro); las piezas dentro de las interfaces del «vívelo» son slots de imagen
  reemplazables, marcadas como ejemplo en los intents.

### Slice 4 — Método (5 recetas)

- `decision-plan`, `method-hybrid-workforce`, `method-hybrid-workforce-scene`, `method-staircase-flat`,
  `method-score-ring`.
- QA en la plantilla: respuesta de `decision-plan` a ≥ 3× la pregunta (la referencia está en 2,8×); `method-staircase-flat`
  como variante de `method-staircase` sin duplicar su geometría.

### Slice 5 — Prueba (8 recetas)

- `content-focus`, `content-clients`, `content-partners`, `decision-risk`, `decision-case`, `decision-chart`,
  `decision-testimonial`, `decision-why-us`.
- QA en la plantilla: respuesta ≥ 3× en `content-clients` (2,9×) y `content-partners` (2,75×); burbuja URL en el pie
  de `content-partners`; toda cifra lleva su fuente visible como slot obligatorio (`+127 %`, `+180 %`, «+10 años · 5
  países · 1 interlocutor» y la prueba del caso Sky no componen sin fuente); logos de clientes en un solo tono navy con
  la excepción tonal declarada de Aguas Andinas y UC Temuco; la foto del caso Sky queda marcada como ejemplo.

### Slice 6 — Propuestas sobrias (4 recetas)

- `proposal-service-aeo`, `proposal-service-creative`, `proposal-service-web`, `proposal-service-revops`.
- QA en la plantilla: el kicker sin acento en texto de menos de 24 px; el fondo sigue siendo Efeonce y la línea sólo
  aporta su acento.

### Slice 7 — Cotización, próximos pasos y respiro (5 recetas)

- `content-pricing`, `content-pricing-stage`, `content-pricing-live`, `decision-next-steps`, `breather`.
- QA en la plantilla: respuesta ≥ 3× en las tres cotizaciones (2,95× en la referencia); «Recomendado», la cabecera de
  la cotización en vivo y «01 · Diagnóstico · Sin costo» sin acento en texto chico; `decision-next-steps` en la versión
  con impacto (agenda del diagnóstico abierta, cursor en «Agenda un diagnóstico») y dirección desde `EFEONCE_CONTACT`;
  los montos son slots `money` que en los ejemplos se imprimen `[MONTO]`.

### Slice 8 — Documentación y skills

- README del catálogo de recetas: «Qué sale hoy con un comando» y pendientes de QA al día (resueltos marcados con la
  receta que los resolvió).
- `EFEONCE_SURFACE_COMPOSITION_V1.md` §2.1 y §7, manual `componer-deck-con-recetas.md` (menos «maqueta declarada»),
  skills `deck-studio` y `efeonce-graphic-line` con su espejo (`pnpm skills:mirrors`).

## Out of Scope

- Portadas y contraportadas (`cover-*`, `close-*`), `section-split` y sus variantes `section-split-corner-bottom` y
  `section-split-panel-end`, `triptych` y los layouts `hero`/`lines` de `proposal-cinematic`: son de TASK-1927.
- El validador del plan del deck, alternancia foto/sin foto, eslogan por documento, pares y plates repetidos:
  TASK-1929.
- Datos reales en los slots (logo del cliente, montos, equipo, métricas, casos): TASK-1930.
- Generar, regenerar o registrar plates (incluido el plate de «Quiénes somos» sin velo y los isotipos sin procedencia):
  TASK-1926 y TASK-1931.
- Ruta productiva, `artifact-worker`, API, MCP y Proposal Studio: TASK-1921 y TASK-1932.
- Salida PPTX (TASK-1395) y recetas no aprobadas o nuevas.

## Detailed Spec

**Del JSON a la plantilla.** Cada receta aporta cuatro cosas que la plantilla respeta sin copiar valores:
`slots` (contrato de datos), `fixed` (lo que el autor no edita: órbita, firma, burbuja, grilla, estilo de fichas),
`selection` (`none`, `collaborator`, `local-cta` o `multi`, pintada por el adaptador existente con el contrato AXIS
`efeonce.collaboration-selection`) y `prompts.composition` (la dirección: qué va dónde, en tokens AXIS y medidas del
canon). La referencia aprobada es la comparación visual del cierre de cada slice.

**Voz.** Eyebrow · pregunta con anillo · respuesta de una a tres palabras sin punto (la esfera pone el punto) a ≥ 3× la
pregunta · evidencia con una palabra en negrita. La proporción 3× sale del token; un test por plantilla la mide sobre el
HTML resuelto.

**Acento D1.** Ningún texto de menos de 24 px lleva el acento de línea. Test sobre el HTML resuelto: todo nodo con el
color de acento tiene cuerpo ≥ 24 px.

**Gate.** Un frame por receta con un intent de ejemplo determinista (plates de fixture, sin foto real nueva). Las altas
se declaran en `BASELINE_DELTAS.md` en el mismo commit que su `--freeze`. Las 20 recetas vigentes y las de TASK-1927
siguen a 0 px.

## Rollout Plan & Risk Matrix

Cambio de tooling local, aditivo y repo-only: agrega plantillas al catálogo y builders al mapper; no toca runtime
productivo (el render productivo sólo corre en el Job `artifact-worker`, y esta task no lo despliega ni cambia su código).

### Slice ordering hard rule

- TASK-1927 cerrada antes del Slice 1.
- Slice 1 antes que cualquier familia: fija la convención de `slots.json` y el test de paridad receta ↔ plantilla.
- Slices 2 a 7 son independientes entre sí; cada uno cierra con sus frames a 0 px y su `--freeze` atómico.
- Slice 8 al final, para describir lo que realmente compone.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una plantilla transcribe px/HEX/fuente en vez de leer el token | contrato AXIS | medium | revisión contra el manifest resuelto; lint de literales del composer | revisión de plantilla con literales; diferencia contra la referencia |
| Una receta entra sin estar `approved` en AXIS | catálogo | low | `planSurfacePiece` sigue exigiendo receta aprobada; el slice espera la publicación de AXIS | `recipe-not-approved` en el intent de ejemplo |
| Un `--freeze` mezcla frames de otra sesión (TASK-1923, TASK-1927) | gate visual | medium | freeze single-owner y atómico (runbook §3); coordinar el orden | diff de `baseline-manifest.json` con frames ajenos |
| Drift de foto raster confundido con cambio propio | gate visual | low | plates de fixture deterministas; ISSUE-122 | diferencia no determinista entre dos corridas |
| Texto largo rompe la composición en producción | plantilla | medium | `maxChars` de la receta como límite duro del slot; falla, nunca encoge | error de slot en `brand:compose` |
| Un pendiente de QA se «corrige» a ojo y vuelve en el próximo deck | plantilla | medium | test por regla (3×, D1, fuente de cifra, burbuja) sobre el HTML resuelto | test rojo |

### Feature flags / cutover

Sin flag: aditivo y repo-only. Las plantillas nuevas sólo se alcanzan con un intent explícito; los intents existentes
resuelven igual. El cutover es inmediato al commit de cada slice.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `git revert` de la convención, el test de paridad y la columna del índice | < 10 min | sí |
| Slice 2–7 | `git revert` del slice (plantillas, builders, ejemplos, frames y su declaración salen juntos) | < 10 min | sí |
| Slice 8 | `git revert` de docs y skills (+ espejo) | < 5 min | sí |

### Production verification sequence

1. Local por slice: tests focales (`src/lib/brand-surfaces`, `scripts/brand-surfaces`, `scripts/creative/deck-recipes`),
   `pnpm brand:deck-recipes -- --check` y `pnpm composer:visual-gate --catalog=graphic-line` a 0 px.
2. Local por slice: `pnpm brand:compose -- --intent src/lib/brand-surfaces/examples/deck-<receta>-intent.json` para
   cada receta nueva; comparación contra la referencia aprobada registrada en el cierre del slice.
3. Cierre: `pnpm local:check`, `pnpm test` completo y `pnpm build` (este último **requiere autorización previa del
   operador** por consumo de memoria).
4. Push a `develop` sólo con indicación del operador; la CI del gate queda verde en ese commit.

### Out-of-band coordination required

- AXIS: publicar como `approved` las recetas que el contrato no declare y los tokens que falten; Greenhouse no parchea
  valores.
- Coordinación con las sesiones de TASK-1927 y TASK-1923 antes de cada `--freeze`.
- Aprobación visual del operador de cada familia compuesta contra su referencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 38 recetas listadas en `### Gap` tienen plantilla, `slots.json`, builder y entrada en `registry.json`.
- [ ] Un test compara cada `slots.json` con los slots de su receta del JSON (nombre, tipo, `required`, `maxChars`) y falla ante cualquier diferencia.
- [ ] Cada receta compone desde su intent de ejemplo con `pnpm brand:compose` sin issues de AXIS.
- [ ] `pnpm composer:visual-gate --catalog=graphic-line` queda a 0 px con un frame por receta nueva, y cada alta está declarada en `BASELINE_DELTAS.md`.
- [ ] Ninguna plantilla nueva contiene px, HEX o familia tipográfica literales que el token o el manifest ya declaran.
- [ ] Un test mide que la respuesta es ≥ 3× la pregunta en `content-pricing`, `content-pricing-stage`, `content-pricing-live`, `content-clients`, `decision-plan` y `content-partners`.
- [ ] Un test verifica que ningún texto de menos de 24 px lleva el color de acento de línea en las 38 plantillas.
- [ ] Ninguna cifra (`metric`) compone sin su fuente visible: el slot de fuente es obligatorio y el intent sin fuente falla.
- [ ] `content-partners` lleva la burbuja URL en el pie.
- [ ] `section-cine-about` y `section-cine-purpose` no pintan degradado ni velo sobre el plate.
- [ ] `decision-next-steps` compone la versión con impacto y toma la dirección de `EFEONCE_CONTACT`.
- [ ] Un texto que supera su `maxChars` hace fallar la composición con el código del slot (test).
- [ ] El índice del catálogo muestra qué receta tiene plantilla, derivado de `registry.json`, y `pnpm brand:deck-recipes -- --check` pasa.
- [ ] El README del catálogo, la norma §2.1/§7, el manual y las skills `deck-studio` y `efeonce-graphic-line` describen lo que compone, y `pnpm skills:mirrors` pasa.
- [ ] El operador aprobó a ojo cada familia compuesta contra su referencia.

## Verification

- `pnpm local:check`
- `pnpm typecheck`
- `pnpm test` (completo al cierre; focales por slice)
- `pnpm brand:deck-recipes -- --check`
- `pnpm composer:visual-gate --catalog=graphic-line` (y `--selftest` antes de cualquier `--freeze`)
- `pnpm brand:compose -- --intent src/lib/brand-surfaces/examples/deck-<receta>-intent.json` por receta nueva
- `pnpm build` — **requiere autorización explícita del operador** antes de correrlo

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `## Delta` en TASK-1929, TASK-1930 y TASK-1932 con la lista final de recetas componibles
- [ ] `pnpm build` corrido con autorización del operador, o el cierre dice `code complete, build pendiente de autorización`

## Follow-ups

- AXIS: recetas y tokens que falten para alguna de las 38 (se abren allá, no aquí).
- Retirar los prototipos de `ai-generations/2026-09-27_deck-recetas/render-src/*.mjs` como fuente de composición una vez
  que cada receta salga del catálogo (quedan como registro de dirección).

## Open Questions

- ¿Las secciones cine (`section-cine-services`, `section-cine-team`) conservan el logo chico de la referencia aprobada o
  siguen la regla «lámina con foto a sangre sin logo»? La plantilla aplica la regla salvo confirmación del operador.
- ¿`method-staircase-flat` comparte plantilla con `method-staircase` (variante por slot) o tiene la suya? Decidirlo en
  el plan con el criterio de cero píxeles movidos en la escalera aprobada.
