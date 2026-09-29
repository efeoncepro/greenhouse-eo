# TASK-1942 — Canonizar el deck Salesforce de «La órbita»: 16 recetas nuevas, 4 usos de recetas existentes, Composer y AXIS

## Delta 2026-09-29 (b) — decisiones del operador al canonizar

- **SF5, SF10, SF11 y SF18 son recetas propias** (no cabían en los slots de sus recetas): `decision-diagnosis-verdict`,
  `method-waves`, `content-day-live-console` y `content-day-live-approval`, medidas con el mismo método que las doce
  (94 recetas, 16 sin plantilla). Se quitaron de `approvedUses` de `decision-diagnosis-map`, `method-staircase`,
  `content-day-live-results` y `content-day-live-progress` (que no cambian `contentType` ni slots) y cada una apunta a
  la nueva en su `preferInstead`.
- **Dos cierres:** brochure con `close-brochure-orbit` en la línea `revenue-salesforce` (lámina por componer, con visto
  bueno del operador) y propuesta con SF19. Planes validados en
  `src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-{brochure,proposal}-salesforce.json` (0 errores, 16
  avisos `recipe-without-template`), probados en `validate.test.ts`.
- **Logo de 700 px sólo en la contraportada Salesforce** (`sloganBlock`); las del 2026-09-27 siguen a 500 px.
- **Columna de la portada en 190:** reserva propia de la línea `revenue-salesforce` en AXIS `v0.3.32` (Slice 3).
- **Servicio de SF16: «Enablement conversacional».**

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
- Status real: `Slice 1 hecho el 2026-09-29 (12 recetas) y ampliado el mismo día con las decisiones del operador (16 recetas, dos planes validados); Slice 3 (AXIS) publicado en v0.3.31, la ampliación va en v0.3.32; Slice 2 (Composer) pendiente en otra sesión`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

El operador aprobó el 2026-09-29 las 19 láminas del deck «La órbita» sobre los servicios Salesforce de Efeonce
(«Esto está aprobado todo, canonicemos»). Esta task las lleva al sistema: 16 recetas nuevas en el catálogo del deck
(sin plantilla todavía; cuatro nacieron al canonizar porque no cabían en recetas existentes), 4 láminas registradas
como usos aprobados de recetas existentes, la variante de línea
`revenue-salesforce` aprobada en la portada de línea, el slot opcional del badge de partner y el eslogan en bloque al
64 % en la contraportada de propuesta. Después, el Artifact Composer (plantillas) y AXIS (tokens, referencias y assets
de terceros con procedencia) las hacen componibles.

## Why This Task Exists

Las láminas existen sólo como maquetas de dirección (`ai-generations/2026-09-29_deck-salesforce/render-src/salesforce.mjs`)
y como imágenes aprobadas fuera de git. Sin receta, un agente no las puede elegir ni validar en un plan
(`validateDeckPlan`), y sin plantilla no se componen con `pnpm brand:compose`. Además traen marcas de terceros
(íconos de producto, badge de partner, Agent Astro, Claude y Claudeforce) cuyo uso depende de autorizaciones y de un
readback de Partner Community que todavía no están archivados: si no se canonizan con esas condiciones, el deck puede
salir a un cliente con un claim sin respaldo.

## Goal

- Las 19 láminas quedan en el catálogo: 16 recetas nuevas y 4 usos aprobados de recetas existentes, con slots
  medidos, pares, prompts, reglas y condiciones de terceros.
- Las 16 nuevas componen con `pnpm brand:compose` y pasan el gate visual; el deck compone como brochure y como propuesta.
- AXIS publica sus tokens, referencias y los assets de terceros con procedencia y estado de autorización.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 (deck, recetas por lámina, «Deck de práctica Salesforce»)
- `docs/operations/brand-graphic-line/deck-recipes/README.md` y `EFEONCE_DECK_SLIDE_RECIPES_V1.json`
- `docs/architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md`
- `.claude/skills/efeonce-graphic-line/references/applications.md` §L («Añadir o modificar una receta del deck»)
- `docs/services/salesforce/` y `docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md` (claims de partner)

Reglas obligatorias (inventario `ai-generations/2026-09-29_deck-salesforce/CANON-INVENTARIO.md`, §«Clasificación confirmada»):

- No cambiar `contentType` ni los slots existentes de las 78 recetas previas; sólo se suman slots OPCIONALES
  (`partnerMark` en `cover-brochure-line-revenue` y `close-proposal-horizon`), cada uno con un test que componga las
  recetas existentes SIN el slot.
- El badge «Salesforce Partner» es un claim bloqueante: sólo con readback vigente en Partner Community; respaldo
  «Operamos sobre» + logo corporativo.
- Agent Astro (interpretación editada, no el arte oficial), Claude y Claudeforce son slots OPCIONALES sujetos a
  autorización; nunca fijos. El Astro editado no va a un package de AXIS publicado sin autorización escrita o arte
  oficial.
- `content-season-launches` lleva fecha de corte obligatoria y no entra en un brochure evergreen.
- `proposal-cinematic-revops` y `proposal-service-revops` usan el mismo plate `NXSF1`: variantes excluyentes.
- Cifras de muestra marcadas; montos `[MONTO]`; `content-measure-formulas` sin cifras.
- El plate SF1 de la arquitecta está rechazado y no entra a ninguna receta ni al banco.

## Normative Docs

- `docs/manual-de-uso/creative/componer-deck-con-recetas.md` (sección «El deck de práctica Salesforce»)
- `docs/documentation/creative/composicion-de-decks-y-brochures.md`
- `ai-generations/2026-09-29_deck-salesforce/DECISIONES.md` y `logos/FUENTES.txt` (procedencia de cada asset)

## Dependencies & Impact

### Depends on

- `TASK-1929` (validador del plan, complete) y `TASK-1930` (binding de datos reales, in-progress): el catálogo y el mapa
  de binding que esta task extiende.
- `TASK-1931` (banco de plates): los plates `NXSF1`–`NXSF3` son rutas locales hasta sembrarse allí.
- `TASK-1937` (biblioteca de autorizaciones de terceros): donde se archivan las autorizaciones de Salesforce y Anthropic.

### Blocks / Impacts

- `TASK-1932` (Proposal Studio): consume `catalog.generated.json` y `recipe-map.json`; ve 90 recetas, 12 sin plantilla.
- `TASK-1933`: el delta del eslogan en bloque quedó resuelto para `close-proposal-horizon` (2026-09-29).
- `TASK-1943` (deck HubSpot): reutiliza las recetas de práctica de esta task.

### Files owned

- `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json` (las 12 recetas y los `approvedUses`)
- `src/lib/brand-surfaces/deck-recipes/catalog.generated.json` (generado)
- `src/lib/artifact-composer/catalogs/graphic-line-deck/**` (plantillas nuevas, Slice 2) [verificar con la sesión del composer]
- `src/lib/brand-surfaces/recipes/**` (builders nuevos, Slice 2)
- Repo `axis-design-system` (tokens de las recetas, referencias `references/surfaces/deck/<id>.jpg`, assets de terceros, Slice 3)

## Current Repo State

### Already exists

- Catálogo con 94 recetas (78 con plantilla); las 16 nuevas con `template: null` y el aviso `recipe-without-template`.
- `approvedUses` en `cover-brochure-line-revenue`, `close-proposal-horizon`, `proposal-cinematic-revops` y
  `proposal-service-revops`, cada uno con su `fit` (qué cabe y qué no en los slots).
- Los dos planes del deck (brochure y propuesta) como fixtures validados.
- Norma §4.6 con el deck de práctica Salesforce en cinco actos; manual y doc funcional con su delta.
- Láminas aprobadas `ai-generations/2026-09-29_deck-salesforce/out/SF*.jpg` y el script de dirección.

### Gap

- Ninguna de las 16 recetas nuevas tiene builder, plantilla, fila en `recipe-map.json` ni intent de ejemplo.
- La contraportada de brochure Salesforce (`close-brochure-orbit` en la línea `revenue-salesforce`) no existe como
  lámina: el composer la compone desde la receta y necesita el visto bueno del operador.
- Dos largos aprobados pasan el `maxChars` de su receta (pregunta de SF6, nombres de paso de SF7).
- La plantilla `close-proposal` hornea el eslogan a 72 px; falta llevarla al bloque al 64 % (composición `sloganBlock`,
  logo a 700 px sólo en la contraportada Salesforce).
- `frame.ts` rechaza `column.topPx` 190 mientras Greenhouse fije AXIS `0.3.31`: la reserva propia de la línea
  `revenue-salesforce` llega con `0.3.32`.
- `deck-axis/assets/tools/loom-isotype.svg` no existe (el isotipo está en `AXIS_PARTNER_ASSETS`).
- Las autorizaciones escritas de Salesforce y Anthropic y el readback del badge no están archivados.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `greenhouse-eo/docs/operations/brand-graphic-line/deck-recipes` (catálogo) y `src/lib/brand-surfaces` + `src/lib/artifact-composer/catalogs/graphic-line-deck` (composición)
- Future candidate home: `undecided`
- Boundary: catálogo de recetas del deck + plantillas del Artifact Composer sobre el contrato AXIS `efeonce.surface-composition`
- Server/browser split: composición server-only (Playwright en CLI y en el Job `artifact-worker`)
- Build impact: `none` — plantillas y datos del catálogo, sin rutas nuevas
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

### Slice 1 — Catálogo, norma, manual y docs (hecho el 2026-09-29; ampliado el mismo día)

- **Ampliación (decisiones del operador al canonizar):** 4 recetas nuevas más (`decision-diagnosis-verdict`,
  `method-waves`, `content-day-live-console`, `content-day-live-approval`), fuera de `approvedUses`; `close-brochure-orbit`
  registrado como cierre del brochure Salesforce; logo de 700 px sólo en `sloganBlock`; los dos planes como fixtures
  validados; servicio de SF16 «Enablement conversacional».

- 12 recetas nuevas en `EFEONCE_DECK_SLIDE_RECIPES_V1.json` con slots medidos con las fuentes reales, pares, prompts,
  reglas y condiciones de terceros; `approvedUses` en 8 recetas existentes; `partnerMark` opcional en dos; eslogan en
  bloque en `close-proposal-horizon`.
- `pnpm brand:deck-recipes` (índice + `catalog.generated.json`), tests del catálogo, exclusiones de binding de las
  marcas de terceros.
- Norma §4.6 («Deck de práctica Salesforce», cinco actos), manual, doc funcional y skill `efeonce-graphic-line`.

### Slice 2 — Plantillas en el Artifact Composer

- Builder, plantilla, `registry.json`, `recipe-map.json` e intent de ejemplo para las 16 recetas nuevas (las 16 son de
  respuesta grande: entran a la auditoría 3× de `rendered-audit.ts`). Las cuatro de la ampliación:
  `decision-diagnosis-verdict` (selección «Cliente» sobre las olas, bottom-end), `method-waves` (sin plataforma: la
  órbita es la trayectoria; selección en `selectedStep`, bottom-end; `topMark` opcional), `content-day-live-console`
  (selección sobre la franja trimestral, bottom-start; `panelIcon` opcional) y `content-day-live-approval` (selección
  «Supervisora» sobre el primer botón, bottom-end, botones a 26 px; `agentIcon` y `executedIcon` opcionales).
- `partnerMark` en `CoverBrochure` y `close-proposal` con test sin el slot; eslogan en bloque en `close-proposal`
  (`sloganBlock`: logo a 700 px sólo en la Salesforce).
- Fijar AXIS `0.3.32` para componer la portada con `column.topPx` 190.
- Componer la contraportada de brochure Salesforce (`close-brochure-orbit`, línea `revenue-salesforce`) y pedir el
  visto bueno del operador; resolver los largos de SF6 y SF7.
- Declarar las altas en `BASELINE_DELTAS.md` y congelar con `pnpm composer:visual-gate --catalog=graphic-line --freeze`.

### Slice 3 — AXIS

- Recetas y composiciones nuevas en `efeonceGraphicLine.surfaces.deck.recipes`, pruebas del contrato y release
  (`v0.3.31`: las 12; `v0.3.32`: las 4 de la ampliación y la reserva propia de la línea `revenue-salesforce`).
- Referencias `apps/lab/public/references/surfaces/deck/<id>.jpg` de las 16 (desde `out/SF*.jpg`).
- Assets de terceros con procedencia y estado de autorización (como `logos/FUENTES.txt`); el badge como claim
  condicionado; el Astro editado fuera de todo package publicado.

## Out of Scope

- El deck HubSpot equivalente (TASK-1943).
- Archivar las autorizaciones y hacer el readback del badge: trabajo del owner comercial (Julio + RevOps & CRM).
- La ruta productiva gobernada (TASK-1921) y el banco de plates (TASK-1931).
- Rehacer las vistas puestas de espalda del kit de la softshell en bordado.

## Detailed Spec

- Recetas nuevas y su lámina: `content-one-platform` (SF1) · `method-agent-supervisor` (SF2) ·
  `decision-platform-coexistence` (SF3) · `decision-provider-fit` (SF4) · `content-service-lanes` (SF8) ·
  `content-season-launches` (SF9) · `method-identity-consent` (SF12) · `method-migration-reconcile` (SF13) ·
  `content-day-release-cycle` (SF14) · `content-day-live-library` (SF15) · `content-live-chat` (SF16) ·
  `content-measure-formulas` (SF17) · `decision-diagnosis-verdict` (SF5) · `method-waves` (SF10) ·
  `content-day-live-console` (SF11) · `content-day-live-approval` (SF18).
- Usos de recetas existentes: SF0 → `cover-brochure-line-revenue` · SF6 → `proposal-cinematic-revops` · SF7 →
  `proposal-service-revops` · SF19 → `close-proposal-horizon`.
- Planes (decisión del operador, 2026-09-29): **brochure** `cover-brochure-line-revenue` → 02–18 →
  `close-brochure-orbit` (línea `revenue-salesforce`); **propuesta** `cover-proposal-orbit` → 02–18 →
  `close-proposal-horizon` (SF19). Fixtures `golden-{brochure,proposal}-salesforce.json`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 antes que todo; Slice 3 (AXIS) antes de congelar el gate del Slice 2 (la plantilla usa los valores del token).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un slot opcional nuevo rompe una receta existente sin el slot | Composer | medium | test que compone las recetas existentes SIN `partnerMark` | gl-css «undefined» o frame distinto en el gate |
| El deck sale a un cliente con el badge sin readback | Comercial / legal | medium | slot opcional condicionado; respaldo sin badge listo | deck con badge en una propuesta enviada |
| Marcas de Salesforce o Anthropic sin autorización archivada | Legal | high | condición en cada receta; biblioteca TASK-1937 | lámina con marcas en pauta o cliente |
| La sesión del composer cambia slots de las 78 | Composer / Proposal Studio | low | regla escrita en la receta y en esta task; paridad de slots | `recipe-slot-parity.test.ts` rojo |

### Feature flags / cutover

- Sin flag: repo-only change aditivo; las 12 recetas avisan `recipe-without-template` hasta tener plantilla.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | `git revert` del commit del catálogo y regenerar con `pnpm brand:deck-recipes` | minutos | sí |
| 2 | `git revert` de las plantillas y del congelado del gate | minutos | sí |
| 3 | nuevo release de AXIS sin las recetas; Greenhouse fija la versión anterior | una hora | sí |

### Production verification sequence

1. `pnpm brand:deck-recipes --check` y tests de `src/lib/brand-surfaces` en verde.
2. `pnpm brand:deck-plan -- --plan` de los dos planes del deck Salesforce (brochure y propuesta) sin errores.
3. Cada receta nueva compone su ejemplo y se compara a ojo con `out/SF*.jpg`; gate `graphic-line` a 0 px.

### Out-of-band coordination required

- Sesión del Artifact Composer (Slice 2) y sesión de AXIS (Slice 3). Owner comercial: readback del badge y
  autorizaciones de Salesforce y Anthropic.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Las 16 recetas nuevas están en el catálogo con slots medidos, pares, prompts, reglas y referencia a su lámina aprobada (12 y 4 más con las decisiones del operador al canonizar).
- [x] Las 4 láminas que son datos de recetas existentes están registradas en `approvedUses` sin cambiar `contentType` ni los slots previos.
- [x] Los dos planes del deck (brochure y propuesta) validan sin errores y están como fixtures probados.
- [x] `cover-brochure-line-revenue` tiene la línea `revenue-salesforce` aprobada y el slot opcional `partnerMark`.
- [x] `close-proposal-horizon` registra el eslogan en bloque al 64 % y el slot opcional `partnerMark`; el delta de TASK-1933 quedó cerrado con la fecha.
- [x] `pnpm brand:deck-recipes --check` pasa y los tests de `src/lib/brand-surfaces` están en verde.
- [x] La norma §4.6, el manual y la doc funcional describen el deck de práctica Salesforce y el pendiente HubSpot.
- [ ] Las 16 recetas nuevas tienen plantilla y componen con `pnpm brand:compose`.
- [ ] La contraportada de brochure Salesforce compone y tiene el visto bueno del operador.
- [ ] `partnerMark` y el eslogan en bloque componen, con test sin el slot y el gate `graphic-line` a 0 px.
- [ ] AXIS publica las recetas, sus referencias y los assets de terceros con procedencia y estado de autorización.

## Verification

- `pnpm brand:deck-recipes --check`
- `pnpm vitest run src/lib/brand-surfaces`
- `pnpm brand:deck-plan -- --plan src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-brochure-salesforce.json` (y `golden-proposal-salesforce.json`)
- `pnpm composer:visual-gate --catalog=graphic-line` (Slice 2)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1932 y TASK-1931 recibieron delta: 94 recetas, 16 sin plantilla hasta el Slice 2; plates NXSF1–NXSF3 por ruta local

## Follow-ups

- TASK-1943: la serie de contenido HubSpot equivalente.
- Rehacer en bordado las vistas puestas de espalda de softshell y bomber del kit.
- Reemplazar Agent Astro por el arte oficial si aparece en Brand Central, y el wordmark Claudeforce si Salesforce publica el vector.

## Open Questions

- Resueltas el 2026-09-29 por el operador: el deck se entrega como brochure (cierre `close-brochure-orbit`) o como
  propuesta (cierre SF19); el servicio de SF16 es «Enablement conversacional»; el logo de 700 px es sólo de la
  contraportada Salesforce; la columna de la portada queda en 190.
- Costo de color de los íconos de producto en SF1 y SF8 (DECISIONES.md, a confirmar por el operador).
- Visto bueno de la contraportada de brochure Salesforce, cuando el composer la componga.
