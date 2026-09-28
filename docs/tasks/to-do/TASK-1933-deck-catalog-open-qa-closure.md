# TASK-1933 — Cerrar los pendientes abiertos del catálogo del deck «La órbita»: el logo en la órbita del cierre y el registro de QA

## Delta 2026-09-28 — pendientes que deja TASK-1934

- **Paridad de las cinco `proposal-cinematic`**: `recipe-map.json` las declara con `slots: null` (las cuatro de TASK-1928 y
  `proposal-cinematic-seo`). Mapearlas juntas exige que la plantilla cine compartida tenga el MAYOR largo de las cinco;
  mapear sólo una bajaría la plantilla y rompería las otras. Efecto hoy: la plantilla admite textos más largos que los
  medidos por receta (p. ej. respuesta 16 vs 10 en la SEO cine); el freno es `validateDeckPlan` (`slot-over-max-chars`),
  probado con un fixture adversarial de la SEO cine.
- **Plate CR2b repetido** (el operador pidió registrarlo aquí el 2026-09-28; la elección entre (a) y (b) sigue pendiente): `proposal-cinematic-creative` y `cover-brochure-line-brand`
  («Tu squad.») comparten `ai-generations/2026-09-26_deck-creativo/plates/CR2b-constelacion-isotipo.png`. En una
  propuesta no chocan (la portada es sólo de brochure); en un brochure de Creative Services con las dos, `plate-repeated`
  salta y es correcto. Opciones que propuso la sesión autora: (a) un plate propio para la portada, misma persona y
  registro, reserva a la izquierda hasta x ≈ 760 (~USD 0,05, con `foto:isotipo`); (b) en ese brochure, la propuesta
  sobria en vez de la cine. Mientras tanto `plate-repeated` sigue como error.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
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

## Summary

TASK-1928 dejó las 69 recetas del deck componiendo, pero el catálogo cerró con tres pendientes de QA abiertos
(`docs/operations/brand-graphic-line/deck-recipes/README.md` → «Abiertos»): el logo dentro de la órbita en el cierre,
los isotipos sin registro de procedencia y el plate P1 repetido. Esta task es dueña del primero, que es una
contradicción de norma sin dueño —la decisión D5 del ADR de la órbita y el manual §10.1 dicen que el cierre del deck
lleva el logo dentro de la órbita, y ninguna contraportada aprobada lo hace— junto con las otras dos decisiones de marco
que la norma deja «Pendiente (operador)» (filas 15 y 16 de la tabla de §6). Los otros dos pendientes ya tienen dueña
(`TASK-1926` la procedencia de isotipos; `TASK-1929` y `TASK-1931` el plate repetido): esta task los deja asignados y
verificables en el registro de QA, sin duplicar su trabajo.

## Why This Task Exists

- **La norma se contradice a sí misma.** D5 (`docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md`), el manual
  §10.1 y la base común de §4.6 de `EFEONCE_SURFACE_COMPOSITION_V1.md` dicen «el cierre lleva el logo dentro de la
  órbita»; las cuatro contraportadas aprobadas el 2026-09-27 (`close-brochure` orbit/photo, `close-proposal`) ponen el
  logo de 500 px arriba de la columna. Un agente que lee la norma y otro que lee el catálogo componen cierres distintos.
- **Dos decisiones de marco siguen sin tomar.** Fila 15: las dos contraportadas de brochure con foto están aprobadas
  pero no tienen pareja, porque todas las portadas de brochure llevan foto y la regla 1 exige alternar. Fila 16: la
  documentación dice que una portada con foto se firma con el logo abajo al centro, y las portadas del brochure lo
  llevan arriba en la columna.
- **El registro de QA no dice quién cierra qué.** El README lista tres pendientes sin dueña; dos ya son de otras tasks
  y nadie lo lee ahí.

## Goal

- El operador decide D5 para el deck (y las filas 15 y 16) y la decisión queda escrita en un solo lugar, sin
  contradicción entre ADR, norma, manual, catálogo y skills.
- Si la decisión es componer el cierre con el logo dentro de la órbita, existe la composición en AXIS y su plantilla en
  Greenhouse, aprobada a ojo y con frame en el gate visual.
- El registro de QA del catálogo lista cada pendiente con su task dueña y su criterio de cierre.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` (D5 y su delta 2026-09-28)
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (§8.2, §8.3 n.º 8, §10.1, §10.3, §10.6 y la tabla de
  decisiones)
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` (§4.6 y §6, filas 15, 16 y 17)
- `docs/architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md` (cómo se agrega o cambia una receta del deck)
- `docs/operations/runbooks/composer-visual-gate.md` (`--freeze` single-owner y ledger)

Reglas obligatorias:

- **La decisión es del operador.** El agente presenta las opciones con su efecto en cada documento y compone las
  pruebas; nunca elige por él ni «resuelve por la norma» algo que la norma deja pendiente.
- **Una sola fuente por decisión.** La decisión se escribe primero en el ADR y la norma; el manual, el catálogo, las
  skills y la documentación funcional la citan. Si cambia una receta aprobada, se corrige la norma y el JSON antes que
  la plantilla, nunca al revés.
- **Valores en AXIS.** Si nace una composición nueva, sus medidas viven en `efeonceGraphicLine.surfaces.deck`; la
  plantilla las lee del manifest, sin valores literales.

## Normative Docs

- `docs/operations/brand-graphic-line/deck-recipes/README.md` (sección «Pendientes de QA»)
- `docs/manual-de-uso/creative/componer-deck-con-recetas.md`
- `docs/tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md`
- `docs/tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md`

## Dependencies & Impact

### Depends on

- `TASK-1928` (complete): las 69 recetas con plantilla, el catálogo `graphic-line-deck` y el gate a 0 px.
- Decisión del operador sobre D5 y las filas 15 y 16 (checkpoint humano de Slice 1).

### Blocks / Impacts

- `TASK-1926`: dueña de la procedencia de isotipos (NX6b, CR2b, WB1b, RV1b, BR2b… sin registro de `foto:isotipo`; HW1,
  T2, T3, H2 y LN4 sin isotipo compuesto). Esta task sólo enlaza su criterio de cierre en el registro de QA.
- `TASK-1929`: su código `plate-repeated` es la verificación automática del plate P1 repetido.
- `TASK-1931`: el banco de plates gobierna el reuso de P1 por `assetId`.
- `TASK-1929` y `TASK-1932`: si nace una composición de cierre nueva, el validador y Proposal Studio la reciben como una
  receta más del catálogo.

### Files owned

- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` (§4.6 y §6, filas 15–17)
- `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` (D5)
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (§10.1 y tabla de decisiones)
- `docs/operations/brand-graphic-line/deck-recipes/README.md` (registro de QA) y, si cambia una receta,
  `EFEONCE_DECK_SLIDE_RECIPES_V1.json`
- Si nace una composición: `packages/tokens/src/tokens.ts` en AXIS, `src/lib/brand-surfaces/recipes/close.ts`,
  `src/lib/artifact-composer/catalogs/graphic-line-deck/close-*.html` y `.slots.json` `[verificar]`, `registry.json`,
  `recipe-map.json`, un intent de ejemplo y el ledger `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`

## Current Repo State

### Already exists

- Las contraportadas aprobadas con plantilla: `close-brochure` (`orbit`, `photo`) y `close-proposal`, con builder en
  `src/lib/brand-surfaces/recipes/close.ts` y frames en el gate visual.
- La tabla de pendientes de la norma (§6, filas 15, 16 y 17) marcadas «Pendiente (operador)».
- El registro de QA del README del catálogo con los tres abiertos.
- `pnpm foto:emblema` y `pnpm foto:isotipo` (TASK-1920) y el código `plate-repeated` planificado en TASK-1929.

### Gap

- Nadie es dueño de D5 para el deck ni de las filas 15 y 16.
- La norma, el ADR y el manual contradicen las contraportadas aprobadas.
- El registro de QA no nombra dueña ni criterio de cierre por pendiente.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `docs/operations/brand-graphic-line/**` y `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md`; si nace una composición, `src/lib/brand-surfaces/recipes/close.ts` y `src/lib/artifact-composer/catalogs/graphic-line-deck/`
- Future candidate home: `remain-shared`
- Boundary: los valores viven en AXIS (`efeonceGraphicLine.surfaces.deck`); Greenhouse los mapea con el builder del cierre y la plantilla del catálogo, sin literales
- Server/browser split: no aplica; sin código de runtime de portal
- Build impact: ninguno si la decisión es sólo de norma; una plantilla y un frame del gate si nace una composición
- Extraction blocker: `none`

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

### Slice 1 — Decisión del operador

- Componer con `pnpm brand:compose` las opciones de D5 sobre la contraportada de brochure y la de propuesta (logo arriba
  de la columna, como hoy, y logo dentro de la órbita) y presentarlas al operador junto a las filas 15 y 16, con el
  efecto de cada opción en ADR, norma, manual, catálogo y skills.
- Registrar la decisión del operador con su fecha en el ADR (D5) y en la norma (§4.6 y §6).

### Slice 2 — Norma, catálogo y registro de QA

- Alinear el manual §10.1, la tabla de decisiones del manual y la norma con la decisión. Si una receta aprobada cambia,
  corregir el JSON del catálogo y correr `pnpm brand:deck-recipes`.
- Reescribir el registro de QA del README: cada pendiente con su dueña (`TASK-1926`, `TASK-1929`, `TASK-1931` o esta
  task) y el hecho verificable que lo cierra.

### Slice 3 — Composición nueva (sólo si el operador la pide)

- AXIS: la composición del cierre con el logo dentro de la órbita (resguardo X, anillo fuera del resguardo) en
  `efeonceGraphicLine.surfaces.deck`, test de contrato, delta del ADR de AXIS y release.
- Greenhouse: fijar la versión, builder y plantilla del cierre (o la composición sobre la plantilla existente),
  `registry.json`, `recipe-map.json`, intent de ejemplo, paridad de slots y frame nuevo en el gate con su entrada en
  `BASELINE_DELTAS.md`.

### Slice 4 — Documentación y skills

- Documentación funcional (`docs/documentation/creative/composicion-de-decks-y-brochures.md`), manual del deck, spec
  técnica y skills `efeonce-graphic-line` y `deck-studio` (espejadas en `.codex/`).

## Out of Scope

- Registrar la procedencia de isotipos y componer los isotipos faltantes: `TASK-1926`.
- Validar el plate repetido dentro de un plan: `TASK-1929` (`plate-repeated`).
- Gobernar el reuso de plates por `assetId`: `TASK-1931`.
- Generar plates nuevos o cambiar fotos aprobadas.
- El logo dentro de la órbita en cierres de video o en el muro de recepción: D5 ya los cubre y no son del catálogo del
  deck.

## Detailed Spec

**Los tres pendientes y su dueña:**

| Pendiente | Dueña | Se cierra cuando |
|---|---|---|
| Logo dentro de la órbita en el cierre (D5; norma §6, fila 17) | esta task | ADR, norma, manual y catálogo dicen lo mismo y, si el operador lo pide, la composición existe y está aprobada |
| Contraportadas de brochure con foto sin pareja (norma §6, fila 15) | esta task | el operador decide si esperan una portada sin foto o se retiran del documento, y la norma lo dice |
| Firma de la portada con foto (norma §6, fila 16) | esta task | la norma dice explícitamente qué soportes firman abajo al centro y cuáles en la columna |
| Isotipo sin registro de procedencia | `TASK-1926` | cada plate listado tiene registro de `foto:isotipo` o isotipo compuesto con `foto:emblema` |
| Plate P1 repetido | `TASK-1929` y `TASK-1931` | `validateDeckPlan` rechaza el plate repetido en un plan y el banco lo sirve por `assetId` |

## Rollout Plan & Risk Matrix

Cambio de norma y documentación; sólo toca runtime si el operador pide la composición nueva (Slice 3), y en ese caso es
aditivo: una composición más del catálogo, sin cambiar las aprobadas.

### Slice ordering hard rule

- Slice 1 → Slice 2 → (Slice 3 si aplica) → Slice 4.
- Ningún cambio de norma o plantilla antes de la decisión del operador en Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El agente resuelve la contradicción sin el operador | norma | medium | checkpoint humano en Slice 1; la decisión se registra con su fecha | ADR cambiado sin fecha de decisión |
| La corrección deja un doc contradiciendo a otro | docs | medium | una sola fuente (ADR + norma) y barrido de menciones en Slice 2 y 4 | `grep` de «logo dentro de la órbita» con respuestas distintas |
| Una composición nueva mueve frames aprobados | gate visual | low | composición aditiva; `--freeze` single-owner con entrada en el ledger | gate rojo en frames que no se tocaron |

### Feature flags / cutover

Sin flag: norma y documentación; la composición nueva, si existe, es una receta más del catálogo local.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `git revert` del registro de la decisión | < 5 min | sí |
| Slice 2 | `git revert` de norma, catálogo y README | < 5 min | sí |
| Slice 3 | `git revert` en Greenhouse; en AXIS, fijar la versión anterior | < 15 min | sí |
| Slice 4 | `git revert` de docs y skills | < 5 min | sí |

### Production verification sequence

1. Local: `pnpm brand:deck-recipes -- --check`.
2. Local (si hay Slice 3): `pnpm brand:compose` del intent de ejemplo, comparación a ojo con la aprobada y
   `pnpm composer:visual-gate --catalog=graphic-line` a 0 px.
3. Cierre: `pnpm local:check`; `pnpm test` completo si hay Slice 3.

### Out-of-band coordination required

- Aprobación del operador en Slice 1 y, si hay composición nueva, aprobación visual en Slice 3.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La decisión del operador sobre D5 en el deck está registrada con su fecha en el ADR de la órbita y en la norma §4.6/§6.
- [ ] Las filas 15, 16 y 17 de la tabla de §6 de la norma dejan de decir «Pendiente (operador)».
- [ ] El manual §10.1, el catálogo, la documentación funcional y las skills no contradicen la decisión (barrido con `grep` registrado en la task).
- [ ] El registro de QA del README del catálogo lista cada pendiente con su task dueña y el hecho que lo cierra.
- [ ] Si el operador pidió la composición: existe en AXIS, compone con `pnpm brand:compose`, el operador la aprobó a ojo y el gate visual queda a 0 px con su entrada en el ledger.
- [ ] `pnpm brand:deck-recipes -- --check` y `pnpm skills:mirrors` pasan.

## Verification

- `pnpm brand:deck-recipes -- --check`
- `pnpm skills:mirrors`
- `pnpm local:check`
- Si hay Slice 3: `pnpm composer:visual-gate --catalog=graphic-line` y `pnpm test`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `## Delta` en TASK-1926, TASK-1929 y TASK-1931 con el pendiente de QA que les corresponde y su criterio de cierre

## Follow-ups

- Si el operador decide que el logo en la órbita también aplica a la portada de propuesta, abrir la composición como
  task aparte.

## Open Questions

- ¿D5 aplica al cierre del deck o queda sólo para video y recepción? Recomendación: presentar las dos composiciones
  lado a lado; la decisión es del operador.
- ¿Las contraportadas de brochure con foto esperan una portada sin foto o salen del documento? Recomendación: decidir
  junto con D5, porque las dos cambian la pareja portada ↔ cierre.
