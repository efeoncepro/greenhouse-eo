# TASK-1942 — Canonizar el deck Salesforce de «La órbita»: 12 recetas nuevas, 8 usos de recetas existentes, Composer y AXIS

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
- Status real: `Slice 1 (catálogo, norma, manual y docs) hecho el 2026-09-29; Slices 2 (Composer) y 3 (AXIS) pendientes en otras sesiones`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

El operador aprobó el 2026-09-29 las 19 láminas del deck «La órbita» sobre los servicios Salesforce de Efeonce
(«Esto está aprobado todo, canonicemos»). Esta task las lleva al sistema: 12 recetas nuevas en el catálogo del deck
(sin plantilla todavía), 8 láminas registradas como usos aprobados de recetas existentes, la variante de línea
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

- Las 19 láminas quedan en el catálogo: 12 recetas nuevas y 8 usos aprobados de recetas existentes, con slots
  medidos, pares, prompts, reglas y condiciones de terceros.
- Las 12 nuevas componen con `pnpm brand:compose` y pasan el gate visual.
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

- Catálogo con 90 recetas (78 con plantilla); las 12 nuevas con `template: null` y el aviso `recipe-without-template`.
- `approvedUses` en `cover-brochure-line-revenue`, `close-proposal-horizon`, `proposal-cinematic-revops`,
  `proposal-service-revops`, `decision-diagnosis-map`, `method-staircase`, `content-day-live-results` y
  `content-day-live-progress`, cada uno con su `fit` (qué cabe y qué no en los slots).
- Norma §4.6 con el deck de práctica Salesforce en cinco actos; manual y doc funcional con su delta.
- Láminas aprobadas `ai-generations/2026-09-29_deck-salesforce/out/SF*.jpg` y el script de dirección.

### Gap

- Ninguna de las 12 recetas nuevas tiene builder, plantilla, fila en `recipe-map.json` ni intent de ejemplo.
- Cuatro láminas registradas como datos de recetas existentes NO caben en sus slots (`decision-diagnosis-map` con SF5,
  `method-staircase` con SF10, `content-day-live-results` con SF11, `content-day-live-progress` con SF18): necesitan
  una composición nueva o una receta propia.
- Dos largos aprobados pasan el `maxChars` de su receta (pregunta de SF6, nombres de paso de SF7).
- La plantilla `close-proposal` hornea el eslogan a 72 px; falta llevarla al bloque al 64 %.
- AXIS no tiene las recetas ni sus referencias; los íconos de producto, el badge, Loom, Claude y Claudeforce no tienen
  procedencia en AXIS; `deck-axis/assets/tools/loom-isotype.svg` no existe.
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

### Slice 1 — Catálogo, norma, manual y docs (hecho el 2026-09-29)

- 12 recetas nuevas en `EFEONCE_DECK_SLIDE_RECIPES_V1.json` con slots medidos con las fuentes reales, pares, prompts,
  reglas y condiciones de terceros; `approvedUses` en 8 recetas existentes; `partnerMark` opcional en dos; eslogan en
  bloque en `close-proposal-horizon`.
- `pnpm brand:deck-recipes` (índice + `catalog.generated.json`), tests del catálogo, exclusiones de binding de las
  marcas de terceros.
- Norma §4.6 («Deck de práctica Salesforce», cinco actos), manual, doc funcional y skill `efeonce-graphic-line`.

### Slice 2 — Plantillas en el Artifact Composer

- Builder, plantilla, `registry.json`, `recipe-map.json` e intent de ejemplo para las 12 recetas nuevas (las 12 son de
  respuesta grande: entran a la auditoría 3× de `rendered-audit.ts`).
- `partnerMark` en `CoverBrochure` y `close-proposal` con test sin el slot; eslogan en bloque en `close-proposal`.
- Composición nueva o receta propia para SF5, SF10, SF11 y SF18 (decisión con el operador); resolver los largos de
  SF6 y SF7.
- Declarar las altas en `BASELINE_DELTAS.md` y congelar con `pnpm composer:visual-gate --catalog=graphic-line --freeze`.

### Slice 3 — AXIS

- Recetas y composiciones nuevas en `efeonceGraphicLine.surfaces.deck.recipes`, pruebas del contrato y release.
- Referencias `apps/lab/public/references/surfaces/deck/<id>.jpg` de las 12 (desde `out/SF*.jpg`).
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
  `content-measure-formulas` (SF17).
- Usos de recetas existentes: SF0 → `cover-brochure-line-revenue` · SF5 → `decision-diagnosis-map` · SF6 →
  `proposal-cinematic-revops` · SF7 → `proposal-service-revops` · SF10 → `method-staircase` · SF11 →
  `content-day-live-results` · SF18 → `content-day-live-progress` · SF19 → `close-proposal-horizon`.
- Pregunta abierta del operador que bloquea el plan del brochure tal como se aprobó: la contraportada SF19 es de
  propuesta; un brochure cierra con `close-brochure-orbit` (norma §4.6).

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
2. `pnpm brand:deck-plan -- --plan` del deck Salesforce como propuesta sin errores.
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

- [x] Las 12 recetas nuevas están en el catálogo con slots medidos, pares, prompts, reglas y referencia a su lámina aprobada.
- [x] Las 8 láminas que son datos de recetas existentes están registradas en `approvedUses` sin cambiar `contentType` ni los slots previos.
- [x] `cover-brochure-line-revenue` tiene la línea `revenue-salesforce` aprobada y el slot opcional `partnerMark`.
- [x] `close-proposal-horizon` registra el eslogan en bloque al 64 % y el slot opcional `partnerMark`; el delta de TASK-1933 quedó cerrado con la fecha.
- [x] `pnpm brand:deck-recipes --check` pasa y los tests de `src/lib/brand-surfaces` están en verde.
- [x] La norma §4.6, el manual y la doc funcional describen el deck de práctica Salesforce y el pendiente HubSpot.
- [ ] Las 12 recetas nuevas tienen plantilla y componen con `pnpm brand:compose`.
- [ ] SF5, SF10, SF11 y SF18 componen (composición nueva o receta propia decidida con el operador).
- [ ] `partnerMark` y el eslogan en bloque componen, con test sin el slot y el gate `graphic-line` a 0 px.
- [ ] AXIS publica las recetas, sus referencias y los assets de terceros con procedencia y estado de autorización.

## Verification

- `pnpm brand:deck-recipes --check`
- `pnpm vitest run src/lib/brand-surfaces`
- `pnpm brand:deck-plan -- --plan <plan del deck Salesforce>`
- `pnpm composer:visual-gate --catalog=graphic-line` (Slice 2)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1932 y TASK-1931 recibieron delta: 90 recetas, 12 sin plantilla hasta el Slice 2; plates NXSF1–NXSF3 por ruta local

## Follow-ups

- TASK-1943: la serie de contenido HubSpot equivalente.
- Rehacer en bordado las vistas puestas de espalda de softshell y bomber del kit.
- Reemplazar Agent Astro por el arte oficial si aparece en Brand Central, y el wordmark Claudeforce si Salesforce publica el vector.

## Open Questions

- ¿El deck Salesforce se entrega como brochure (cierre `close-brochure-orbit`, sin foto) o como propuesta (portada
  `cover-proposal-*` y cierre SF19)? La narrativa aprobada mezcla la portada de brochure con la contraportada de propuesta.
- Nombre del servicio de SF16: «CRM conversacional» o «Enablement conversacional».
- Ancho del logo en `close-proposal-horizon`: 500 px (receta del 2026-09-27) o 700 px (SF19).
- Costo de color de los íconos de producto en SF1 y SF8 (DECISIONES.md, a confirmar por el operador).
