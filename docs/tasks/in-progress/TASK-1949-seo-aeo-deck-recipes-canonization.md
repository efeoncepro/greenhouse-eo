# TASK-1949 — Canonizar el deck SEO/AEO (Search Visibility 360) de «La órbita»: 6 recetas nuevas, slots opcionales de submarca/equipo, usos aprobados, Composer y AXIS

## Delta 2026-09-30 (d) — AXIS v0.3.40 publicado y Greenhouse lo fija

- AXIS `7986233` (tag `v0.3.40`, release y CI verdes): las seis recetas nativas aprobadas, `surfaces.deck.productMark`
  (lockups y lugares medidos; ocupa el lugar del eyebrow en `proposal-cinematic`), `section-cine` `team` con `body`
  opcional, referencias y miniaturas del Lab, `deck-recipes.json` a 100 recetas y delta (t) en el ADR de superficies.
  Commit con índice temporal y verificado en un árbol aislado (build, typecheck y test completos): no arrastra el WIP
  ajeno de AXIS.
- Decisión del operador (2026-09-30): «La insignia de HubSpot hay que mandarla a axis pero el deck de hubspot que hizo
  codex quedó horrible, así que ese no va». Entró la insignia HubSpot Solutions Partner Gold en `axis-brand-assets` 0.4.7
  tal como la dejó Codex (`operator-internal-review`, claim `internal-review`: tier no verificado, sin publicación
  externa); el `partnerMark` del cierre y la paleta vinotinto de RevOps HubSpot no entraron y siguen sin commitear en AXIS
  y en Greenhouse (close-brochure). Descartarlos es decisión del operador o de su dueño.
- Greenhouse `f363de357`: pines 0.3.40/0.3.40/0.4.7, sellos regenerados (sólo versión), snapshots con la órbita
  `data-axis-graphic-line="0.5.0"` (mismo dibujo), Glitch y Manzanitas `stable`, y baseline graphic-line congelado (u).
- En curso: retirar los `TODO AXIS TASK-1949` de Greenhouse que AXIS ya resuelve (fixture sv360, lugares de
  `productMark`, bajada del equipo). Quedan como seguimiento el escenario, la plataforma y la paleta de las seis recetas.

## Delta 2026-09-30 (c) — requiredUnless en el validador y largos de la aprobada

- `validateDeckPlan` honra `requiredUnless` (catálogo de runtime, tipo y `render-index.mjs`, que además valida que apunte a un slot
  de la receta); `content-text` ya no declara `productMark` y `PENDING_TEMPLATE_SLOTS` quedó vacío.
- Máximos subidos al largo de la aprobada: `cover-brochure-line-engine` 33/30/48, `cover-proposal-orbit` answer 14,
  `content-day-tools` answer 10 (receta y `slots.json`), `proposal-cinematic-aeo` answer 11; los `fit` lo dicen.
- `content-report-formats`: estado verificado de los formatos de Insights y la decisión del operador de mostrarlos.
- `pnpm vitest run src/lib/brand-surfaces scripts/creative`: 858/859; el rojo sigue siendo el snapshot revops del WIP ajeno.
- Slice 3 (AXIS) bloqueado: el clasificador de permisos rechazó el push a `main` de AXIS y el release v0.3.40; espera la
  autorización del operador. Los logos de BICE y BICECORP no entran a AXIS sin una autorización de uso registrada (a
  diferencia de los partners); queda para el operador.

## Delta 2026-09-30 (b) — el operador deja los datos del deck tal cual

- **Decisión del operador**, textual: «Deja esos datos... No marques nada en el deck como provisional, asumo la
  responsabilidad.» Las cifras de los tres casos, su fuente, los formatos de Insights, las industrias y la cifra de
  Bresler quedan **tal cual** en el deck, sin marca de «provisional» ni «próximamente». Registrada en `DECISIONES.md`,
  «Decisión del operador sobre los pendientes» (`8ceb2418f`).
- Consecuencia para esta task: esos datos dejan de ser un bloqueo para mostrar el deck; su contexto (cifras reales no
  cargadas, correo de Insights no vivo y modo presentación sin probar al 2026-09-30, sin prueba por industria, Bresler no
  es cifra de SEO) queda sólo como registro. La fila de riesgo «Las cifras de ejemplo de los casos salen a un cliente» y
  el follow-up de reemplazarlas pasan a ser riesgo aceptado por el operador. Sigue vigente la condición de los logos de
  clientes (TASK-1937), que la decisión no nombra.
- La decisión es sobre este deck. Si alcanza a las reglas generales de `content-report-formats` y
  `content-committee-deck` («sólo formatos vivos») y a la regla de casos citables de la skill `seo-aeo-practice` en otros
  decks es pregunta abierta. Los textos de esas recetas (`avoidWhen`, `rules`) no se cambiaron.
- Slice 4 (docs y skills) aplicado con esta decisión: norma §4.6 v1.17 (`10c4907cb`), catálogo v1.11 (`a9a1de87e`),
  manual v1.12 (`ae657aa9c`), funcional 2.8 y arquitectura 1.6 (`afcd2b93d`) y skills (`0aab8e802`), más el ajuste por la
  decisión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Status real: `Slice 1 y Slice 4 hechos (2026-09-30): 100 recetas (6 nuevas sin plantilla), productMark y section-cine-team.body opcionales, requiredUnless en el eyebrow de proposal-cinematic seo/aeo, 27 usos aprobados, tres planes golden validados e intents de documento; norma, catálogo, manual, doc funcional, arquitectura y skills al día; el operador deja los datos del deck tal cual (delta b). Composer (Slice 2), AXIS (Slice 3) y gates de cierre (Slice 5) pendientes`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

El operador aprobó el 2026-09-30 el deck SEO/AEO de «La órbita» sobre Search Visibility 360 (SV360) en sus tres
documentos —completo (33 láminas), brochure (24) y propuesta (29)— («esto está aprobado todo», sesión «SEO deck para
brochure y propuestas») y pidió canonizarlo como el deck Salesforce (TASK-1942). Esta task lo lleva al sistema: seis
recetas nuevas para las láminas nativas que hoy se arman fuera del compositor, un slot opcional `productMark` para el
lockup de submarca (SV360, AEO, AEO Assessment, AI Visibility Report, Insights), el eyebrow de `proposal-cinematic` que
cede su lugar al lockup, la bajada opcional de `section-cine-team`, los usos aprobados de las recetas existentes y los
tres planes del deck como fixtures validados. Después, el Artifact Composer (plantillas) y AXIS (tokens, referencias
del Lab y logos de clientes con procedencia) las hacen componibles.

## Why This Task Exists

Las láminas aprobadas existen sólo como HTML nativo y PDF armados a mano en
`ai-generations/2026-09-29_deck-seo-aeo-documentos/` (fuera de git): seis láminas se insertan después del compositor
(`render-src/bake.cjs`), los logos de submarca se superponen como overlays por página, el eyebrow de la AEO de cine se
tapa con `render-src/patch-eyebrow.cjs` y la bajada del equipo se pega con `render-src/patch-team.cjs`. Sin receta, un
agente no puede elegir esas láminas ni validarlas en un plan (`validateDeckPlan`); sin slot, cada deck futuro repite el
post-proceso manual; y sin reglas escritas, las cifras de ejemplo de los tres casos y las preguntas de ejemplo de las
industrias pueden salir a un cliente como si fueran reales.

## Goal

- Las seis láminas nativas quedan como recetas del catálogo con slots medidos, pares, prompts y reglas.
- Los lockups de submarca, el eyebrow reemplazado por el lockup y la bajada del equipo son slots opcionales del
  catálogo (y después de la plantilla), sin cambiar `contentType` ni los slots existentes.
- Cada receta existente que el deck usa con contenido o plate propio registra su uso aprobado (`approvedUses`) con su
  `fit`; los tres planes validan como fixtures.
- El deck compone de punta a punta con `pnpm brand:compose` sin post-proceso y AXIS publica recetas, referencias y
  logos de clientes con procedencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 (deck, recetas por lámina)
- `docs/operations/brand-graphic-line/deck-recipes/README.md` y `EFEONCE_DECK_SLIDE_RECIPES_V1.json`
- `docs/architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md`
- `.claude/skills/efeonce-graphic-line/references/applications.md` §L («Añadir o modificar una receta del deck»)
- `docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md` (alcance del registro cine)
- `docs/tasks/complete/TASK-1942-salesforce-deck-recipes-canonization.md` (el patrón que esta task imita)

Reglas obligatorias (inventario `ai-generations/2026-09-29_deck-seo-aeo-documentos/CANON-INVENTARIO.md` y
`DECISIONES.md`):

- **No cambiar `contentType` ni los slots existentes** de las 94 recetas previas. Sólo se suman slots **opcionales**
  (`productMark` en las recetas de la brecha 1 del inventario; `body` en `section-cine-team`), cada uno con un test que
  componga la receta **sin** el slot.
- En `proposal-cinematic-seo` y `proposal-cinematic-aeo` el eyebrow sale **sólo cuando hay `productMark`**: el lockup
  ocupa su lugar (140, 112, alto 40). Sin `productMark`, el eyebrow sigue obligatorio. Se declara en el catálogo como
  `requiredUnless: "productMark"` y como regla; el validador y AXIS lo hacen cumplir en los Slices 2 y 3.
- **Cifras de los tres casos (BICECORP, Banco BICE, Berel) = de EJEMPLO**, pendientes de las reales (cuatro por caso,
  con fuente, período, servicio y permiso de uso). La fuente provisoria «Google Search Console, GA4 y Efeonce AEO
  Assessment, 12 meses» afirma algo que no es cierto hasta reemplazarla. Ningún deck con esas cifras sale a un cliente.
- **Anotaciones fuera del deck** («datos de ejemplo», «preguntas de ejemplo», «maquetas»): van en notas del canvas o
  del plan, nunca dentro de la lámina (decisión 13). Las marcas que el contrato exige se quedan: `mark` de
  `decision-ai-answer`, `sampleMark` de `decision-diagnosis-map` y `report.sample` de `content-day-live-results`.
- **Registro de las fotos:** cine sólo en `section-split` (SX4) y `proposal-cinematic-web` (DV1); los casos
  (`decision-case`: CS2, CS1b, CS3b) en **puesta en escena**; ningún plate de cine en recetas de contenido o método
  (MK2 de `content-markets` no es cine). La foto de un caso puede ser una imagen de ambiente puesta en escena asociada
  al cliente, con el logo del cliente **compuesto** desde el archivo oficial, nunca generado (decisión 14). Esa
  decisión **no** debilita la guarda de `foto:prompt` sobre anclar en el rubro de un cliente: la excepción es explícita
  y por ficha (campo `caso` con `tipo: cliente` y `registro: puesta-en-escena`; `bb7e34b37`, `8f7d66457`).
- **Logos de clientes** (Banco BICE, BICECORP, Berel) en `decision-case`: uso condicionado a la autorización del
  cliente (biblioteca TASK-1937). El BICE argentino de Wikimedia está descartado.
- `content-markets`: los países salen de `EFEONCE_OPERATING_MARKETS` (`src/config/efeonce-brand.ts`); nunca se inventan
  oficinas.
- Las contraportadas SEO quedan como en sus recetas (`close-brochure-orbit`, `close-proposal-horizon` sin cambios) y
  el delta del eslogan de TASK-1933 no se toca.
- Una sola sección partida por deck (`section-split` y `-panel-end` son alternativas) y navegación por capítulos: el
  mismo `progress.sections` (5 capítulos) en todas las páginas del documento.

## Normative Docs

- `ai-generations/2026-09-29_deck-seo-aeo-documentos/CANON-INVENTARIO.md` (fuente de hechos) y `DECISIONES.md`
- `ai-generations/2026-09-29_deck-seo-aeo-documentos/logos/PROCEDENCIA.txt` (procedencia de los logos de clientes)
- `docs/manual-de-uso/creative/componer-deck-con-recetas.md`
- `docs/documentation/creative/composicion-de-decks-y-brochures.md`

## Dependencies & Impact

### Depends on

- `TASK-1929` (validador del plan, complete) y `TASK-1930` (binding de datos reales, in-progress): catálogo, validador
  y mapa de binding que esta task extiende.
- `TASK-1931` (banco de plates, to-do): los plates SX4, DV1, CS1b, CS2, CS3b y MK2 van por ruta local hasta sembrarse.
- `TASK-1937` (biblioteca de autorizaciones de terceros, to-do): donde se archivan las de BICE, BICECORP y Berel.

### Blocks / Impacts

- `TASK-1932` (Proposal Studio): consume `catalog.generated.json` y `recipe-map.json`; verá 100 recetas, 6 sin
  plantilla hasta el Slice 2.
- `TASK-1933` (pendientes del catálogo): no se toca su delta del eslogan.
- `TASK-1943` (deck HubSpot): puede reutilizar `content-service-mockups`, `content-industries` y `content-markets`.

### Files owned

- `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json` (las 6 recetas, los slots
  opcionales y los `approvedUses` del deck SEO/AEO)
- `src/lib/brand-surfaces/deck-recipes/catalog.generated.json` (generado)
- `src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-{brochure,proposal,completo}-seo.json`
- `src/lib/brand-surfaces/examples/deck-seo-{completo,brochure,propuesta}-document.json`
- `src/lib/brand-surfaces/deck-recipes/bindings/map.ts` (exclusiones de `productMark` y de las cifras de maqueta)
- `src/lib/brand-surfaces/__tests__/recipe-slot-parity.test.ts` (`PENDING_TEMPLATE_SLOTS` temporal hasta el Slice 2)
- `src/lib/artifact-composer/catalogs/graphic-line-deck/**` (plantillas nuevas y slots opcionales, Slice 2) [verificar con la sesión del composer]
- Repo `axis-design-system` (recetas, referencias `references/surfaces/deck/<id>.jpg`, logos de clientes, Slice 3)

## Current Repo State

### Already exists

- Catálogo con 94 recetas, todas con plantilla (TASK-1942), `recipe-map.json`, validador `validateDeckPlan`, mapa de
  binding (TASK-1930) y los fixtures golden de los decks previos.
- Las recetas que el deck SEO/AEO usa sin cambios (`decision-ai-market`, `decision-traffic-to-revenue`, `method-eeat`,
  `method-surround-cycle`, `decision-difference`, `close-brochure-orbit`, `close-proposal-horizon`).
- Los lockups de submarca en `@efeoncepro/axis-brand-assets` 0.4.5 (`sv360-lockup-negative`, `sv360-logo-negative`,
  `sv360-name-lockup-negative`, `aeo-lockup-negative`, `aeo-assessment-lockup-negative`,
  `ai-visibility-report-lockup-negative`, `insights-lockup-negative`).
- Las láminas aprobadas y su reproducción fuera de git: `ai-generations/2026-09-29_deck-seo-aeo-documentos/`
  (`out/slides/{completo,brochure,propuesta}/NN.jpg`, `render-src/`, `fichas/`, `plates/`, `logos/`).

### Gap

- Las seis láminas nativas no son recetas; los lockups, el eyebrow reemplazado y la bajada del equipo se resuelven con
  post-proceso fuera del compositor.
- Los planes del deck no están como fixtures; las recetas existentes no registran su uso en este deck.
- AXIS no tiene las recetas nuevas, sus referencias del Lab ni los logos de BICE y BICECORP.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `greenhouse-eo/docs/operations/brand-graphic-line/deck-recipes` (catálogo) y `src/lib/brand-surfaces` + `src/lib/artifact-composer/catalogs/graphic-line-deck` (composición)
- Future candidate home: `undecided`
- Boundary: catálogo de recetas del deck + plantillas del Artifact Composer sobre el contrato AXIS `efeonce.surface-composition`
- Server/browser split: composición server-only (Playwright en CLI y en el Job `artifact-worker`)
- Build impact: `none` — datos del catálogo y plantillas, sin rutas nuevas
- Extraction blocker: `none` más allá de los de TASK-1921 (ruta productiva) y TASK-1931 (banco de plates)

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

### Slice 1 — Catálogo y fixtures

- Seis recetas nuevas en `EFEONCE_DECK_SLIDE_RECIPES_V1.json`, con el esquema de las existentes y slots medidos con los
  textos de las láminas aprobadas: `content-brand-family`, `content-service-mockups`, `content-report-formats`,
  `content-committee-deck`, `content-industries` y `content-markets` (status `approved`, `approvedAt` 2026-09-30,
  referencia `references/surfaces/deck/<id>.jpg`).
- Slots opcionales: `productMark` (lista cerrada de lockups de `@efeoncepro/axis-brand-assets`) en las recetas de la
  brecha 1; `requiredUnless: "productMark"` en el eyebrow de `proposal-cinematic-seo` y `-aeo`; `body` en
  `section-cine-team`.
- `approvedUses` con su `fit` en cada receta existente que el deck usa con contenido, plate o lockup propio.
- Exclusiones de binding para `productMark` y para las cifras de maqueta (TASK-1930).
- `pnpm brand:deck-recipes` (índice y `catalog.generated.json`) y tests del catálogo; las seis nuevas avisan
  `recipe-without-template` hasta el Slice 2.
- Planes del deck como fixtures validados (`golden-{brochure,proposal,completo}-seo.json`) y los intents de documento
  aprobados como ejemplos (`src/lib/brand-surfaces/examples/deck-seo-{completo,brochure,propuesta}-document.json`).

### Slice 2 — Artifact Composer

- Builder, plantilla, `registry.json`, `recipe-map.json` e intent de ejemplo para las seis recetas nuevas.
- Slots opcionales en las plantillas: `productMark` (portada de línea 140,790 h64; portada de propuesta 140,880 h56;
  resto 140,44 h40, y 140,112 h40 en la AEO de cine), `proposal-cinematic` sin eyebrow con el lockup en su lugar,
  `section-cine-team.body` (hoy superpuesta a 22 px, top 900, ancho 540); cada uno con un test que componga la receta
  sin el slot. Retirar las entradas temporales de `PENDING_TEMPLATE_SLOTS` en `recipe-slot-parity.test.ts`.
- `validateDeckPlan` y el contrato AXIS honran `requiredUnless`.
- Intents de ejemplo y freeze del gate `graphic-line` declarado en `BASELINE_DELTAS.md`
  (`pnpm composer:visual-gate --catalog=graphic-line --freeze`).
- El deck compone de punta a punta sin `patch-eyebrow.cjs`, `patch-team.cjs` ni los overlays de `bake.cjs`.

### Slice 3 — AXIS

- Recetas nuevas en `efeonceGraphicLine.surfaces.deck.recipes`, pruebas del contrato y release.
- Referencias del Lab `apps/lab/public/references/surfaces/deck/<id>.jpg` de las seis (desde `out/slides/completo/`).
- Logos de clientes BICECORP y Banco BICE con procedencia (`logos/PROCEDENCIA.txt`) y estado de autorización.

### Slice 4 — Docs y skills

- Excepción declarada de caso de cliente en la fotografía de marca (hecho: `bb7e34b37` en `scripts/foto/build-prompt.mjs`
  y su test; `8f7d66457` en el lenguaje fotográfico, la regla auto-load y la referencia de `design-studio`).
- Inventario, decisiones, fichas, logos y fuentes de render versionados (hecho: `541eadf69`).
- Norma §4.6 («Deck SEO/AEO»), README del catálogo, manual, doc funcional, arquitectura y skills
  (`efeonce-graphic-line`, `deck-studio`, `seo-aeo-practice`).

### Slice 5 — Gates de cierre

- `pnpm test` completo, `pnpm build` de producción, gate `graphic-line` a 0 px y CI en verde en el último commit.

## Out of Scope

- Las cifras reales de los casos y el permiso de uso de cada cliente (owner comercial).
- La ruta productiva gobernada (TASK-1921) y la siembra del banco de plates (TASK-1931).
- Verificar qué formatos de Insights están vivos (sesión de Insights, EPIC-045).

## Detailed Spec

- Recetas nuevas y su lámina (completo · brochure · propuesta): `content-brand-family` (07 · 06 · 06) ·
  `content-service-mockups` (10 · 08 · 09) · `content-report-formats` (22 · 16 · 17) · `content-committee-deck`
  (23 · 17 · 18) · `content-industries` (27 · 20 · 21) · `content-markets` (28 · 21 · 22).
- Usos aprobados: tabla «Recorrido aprobado» del inventario (filas «uso» y las que llevan lockup o cambio de cuerpo).
- Planes: completo = brochure de 33 láminas; brochure = 24; propuesta = 29, cada uno con las seis nativas en su posición
  real y los plates por `plateRef`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 antes que todo; Slice 3 (AXIS) antes de congelar el gate del Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un slot opcional nuevo rompe una receta existente sin el slot | Composer | medium | test que compone cada receta SIN el slot | frame distinto en el gate `graphic-line` |
| Las cifras de ejemplo de los casos salen a un cliente | Comercial / legal | high | regla en `decision-case` y en `approvedUses`; fixtures marcados | deck enviado con la fuente provisoria |
| Logos de BICE, BICECORP o Berel sin autorización archivada | Legal | medium | condición en cada uso; TASK-1937 | lámina de caso en una propuesta enviada |
| Se promete un formato de Insights que no está vivo | Producto | medium | `avoidWhen` en `content-report-formats` y `-committee-deck` | cliente pide un formato inexistente |
| El catálogo pide slots que la plantilla no tiene | Composer | high hasta el Slice 2 | `PENDING_TEMPLATE_SLOTS` temporal en la paridad | test de paridad rojo |

### Feature flags / cutover

- Sin flag: cambio aditivo del catálogo y del composer, repo-only; las recetas nuevas avisan `recipe-without-template`
  hasta tener plantilla.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | `git revert` del catálogo y regenerar con `pnpm brand:deck-recipes` | minutos | sí |
| 2 | `git revert` de las plantillas y del congelado del gate | minutos | sí |
| 3 | release de AXIS sin las recetas; Greenhouse fija la versión anterior | una hora | sí |

### Production verification sequence

1. `pnpm brand:deck-recipes --check` y `pnpm vitest run src/lib/brand-surfaces` en verde.
2. `pnpm brand:deck-plan -- --plan` de los tres fixtures sin errores.
3. Cada receta nueva compone su ejemplo y se compara a ojo con `out/slides/completo/NN.jpg`; gate `graphic-line` a 0 px.

### Out-of-band coordination required

- Sesión del Artifact Composer (Slice 2) y sesión de AXIS (Slice 3). Owner comercial: cifras reales y permisos de los
  tres clientes. Sesión de Insights: formatos vivos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `foto:prompt` acepta la excepción declarada de caso de cliente (campo `caso`, sólo puesta en escena y sólo el rubro de ese cliente) sin debilitar la guarda general, con test (`bb7e34b37`; lenguaje fotográfico y regla en `8f7d66457`).
- [x] Inventario, decisiones, fichas, logos con procedencia y fuentes de render del deck versionados (`541eadf69`).
- [x] Las seis recetas nuevas están en el catálogo con slots medidos, pares, prompts, reglas y referencia a su lámina aprobada (`content-brand-family`, `content-service-mockups`, `content-report-formats`, `content-committee-deck`, `content-industries`, `content-markets`; 2026-09-30).
- [x] `productMark` es opcional en las recetas de la brecha 1, con la lista cerrada de lockups; `section-cine-team.body` es opcional; ningún `contentType` ni slot previo cambió (sólo notas y `requiredUnless`; exclusiones de binding en `bindings/map.ts`).
- [x] El eyebrow de `proposal-cinematic-seo` y `-aeo` declara `requiredUnless: "productMark"` y la regla está escrita (en `rules` y en la nota del slot).
- [x] Las recetas existentes que el deck usa con contenido, plate o lockup propio tienen `approvedUses` con su `fit` (27 usos en 25 recetas; cuatro pasan un largo y el `fit` lo dice: portada de línea, portada de propuesta, `content-day-tools` y la AEO de cine).
- [x] Los tres planes del deck validan sin errores como fixtures probados en `validate.test.ts` (`golden-{completo,brochure,proposal}-seo.json`; sólo los seis avisos `recipe-without-template`).
- [x] `pnpm brand:deck-recipes --check` pasa y `pnpm vitest run src/lib/brand-surfaces` está en verde (824/825 el 2026-09-30: el rojo es el snapshot de `deck-proposal-service-revops-intent.json`, causado por un cambio ajeno sin commitear en `recipes/proposal-service.ts`, no por esta task).
- [ ] Las seis recetas nuevas tienen plantilla y componen con `pnpm brand:compose`; los slots opcionales componen con y sin el slot.
- [x] `validateDeckPlan` honra `requiredUnless`; `PENDING_TEMPLATE_SLOTS` quedó vacío (ff3cca87e, 2026-09-30; test «el eyebrow cede su lugar al lockup de submarca»).
- [x] Gate `graphic-line` a 0 px con el freeze declarado en `BASELINE_DELTAS.md` (sección (u) sellada, 95 frames, 15 re-promovidos; congelado en un árbol aislado porque el WIP ajeno de close-brochure cambia CloseBrochure y CloseBrochurePhoto).
- [x] AXIS publica las recetas y las referencias del Lab (v0.3.40, 7986233, release y CI verdes: axis-tokens 0.3.40, axis-ui-contracts 0.3.40, axis-brand-assets 0.4.7; Greenhouse lo fija en f363de357). Los logos de BICE y BICECORP quedan fuera de AXIS hasta que exista una autorización de uso registrada (pregunta abierta al operador).
- [x] Norma, README, manual, doc funcional, arquitectura y skills describen el deck SEO/AEO (norma §4.6 v1.17, catálogo v1.11, manual v1.12, funcional 2.8, arquitectura 1.6; skills `efeonce-graphic-line`, `deck-studio`, `seo-aeo-practice`, `efeonce-insights`, `axis-design-system` con espejo `.codex`; 2026-09-30).
- [ ] Gates de cierre: `pnpm test` completo y `pnpm build` de producción en el último commit.

## Verification

- `pnpm brand:deck-recipes --check`
- `pnpm vitest run src/lib/brand-surfaces`
- `pnpm brand:deck-plan -- --plan src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-completo-seo.json` (y brochure y proposal)
- `pnpm composer:visual-gate --catalog=graphic-line` (Slice 2)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (TASK-1930, 1931, 1932, 1933, 1937 y 1943)

## Follow-ups

- Reemplazar las cifras de ejemplo de los tres casos por las reales (con fuente, período, servicio y permiso).
- Cambiar la cifra de Bresler (+180 % ventas digitales, no es de SEO) por una de SEO publicada si existe.
- Renombrar la URL `think.efeoncepro.com/brand-visibility`, que sigue llamándose «Brand Visibility Grader».

## Open Questions

- ¿Cuenta el lockup «Efeonce | SV360» como firma de Efeonce en una lámina con foto a sangre (`content-markets`)? La
  regla transversal dice «lámina con foto a sangre sin logo» y el operador aprobó la lámina con el lockup.
- `content-text` figura en la brecha 1 del inventario, pero ninguna lámina aprobada del deck la usa con lockup: ¿se
  mantiene el slot sin lámina de referencia?
- ¿Las ciudades de `content-markets` (Miami, Ciudad de México, Bogotá, Lima, Santiago) son sedes o sólo la ciudad de
  referencia del mercado? La receta las trata como marcador del mercado, no como oficina.
- Formatos de Insights (correo, PDF A4, deck 16:9, modo presentación): ¿cuáles están vivos hoy?
- Frame.io como canal de aprobación del equipo SEO (pendiente menor de `DECISIONES.md`).
