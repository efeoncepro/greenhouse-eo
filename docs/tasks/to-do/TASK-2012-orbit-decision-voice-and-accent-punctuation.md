# TASK-2012 — La órbita: voz de decisión por defecto y acento como puntuación en contrato, recetas, compositor y gates

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
- Backend impact: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; AXIS main con visto bueno del operador; sin worktrees`

## Summary

El operador decidió el 2026-10-06 dos reglas de sistema para toda «La órbita»: la voz por defecto de una pieza es un
titular de decisión (afirmación corta con esfera) y el par pregunta–respuesta pasa a ser un recurso escaso; y el
acento de la línea es puntuación, nunca la luz de la escena. Las dos están escritas en el canon, pero el contrato AXIS,
las recetas, el compositor de Greenhouse, `brand:deck-plan`, `foto:cta:gate` y `foto:prompt` todavía imponen lo
contrario. Esta task las lleva al sistema para que se cumplan solas.

## Why This Task Exists

Leído en secuencia, un deck con el par en cada lámina se vuelve absurdo: de 96 pares de los decks aprobados, los que
fallan lo hacen porque se escriben al revés, porque el tope de tres palabras recorta el sentido y porque el slot de
voz es obligatorio en todas las recetas (16, 24 o 33 pares por deck). El defecto no apareció porque las láminas se
aprobaban una a una. A la vez, en el deck HubSpot la luz magenta de las fotos tiñó todo de rosado; el operador eligió
la versión con luz azul de Efeonce y el magenta sólo como puntuación. Mientras el contrato exija el par y los tokens
del escenario pinten con el acento, cada pieza nueva repite los dos errores aunque el canon diga lo contrario.

## Goal

- El contrato `efeonce.surface-composition` admite una voz `decision` sin pregunta, con su propio tope de palabras y
  su jerarquía medida contra el eyebrow o la bajada; el par queda opcional por receta.
- `brand:deck-plan` y `foto:cta:gate` avisan lo detectable de la voz (densidad de pares, sí/no sin calce, respuestas
  que señalan la lámina, preguntas en primera persona plural de Efeonce).
- Los tokens de escenario de AXIS (`stage.halo`, `platform`, `beam`, `document.halo`, `avatar.glow`) iluminan en el
  azul de Efeonce y dejan el acento como puntuación; el compositor de Greenhouse lo consume con un rebaseline revisado.
- `foto:prompt` avisa cuando una escena usa el acento de la línea como luz, llave, haz o fenómeno dominante.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` §2 («el acento es puntuación, no luz» y «Estado en
  las láminas diseñadas») y §4 («Delta 2026-10-06 — La voz por defecto es la decisión»), con su línea «Alcance».
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 (base común del deck), el hero web, DOOH
  y motion.
- `docs/architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md` (spec técnica del compositor).
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` (consumo de paquetes AXIS).

Reglas obligatorias:

- AXIS posee los valores y el contrato; Greenhouse los consume. Nunca un parche local en el compositor que contradiga
  el token.
- Ninguna lámina aprobada cambia de píxel sin pasar por `pnpm composer:visual-gate` y un rebaseline en sección sin
  sellar de `BASELINE_DELTAS.md`, mirado por el operador.
- Las dos reglas aplican a toda La órbita (decisión del operador, 2026-10-06). En decks y documentos el par va como
  máximo en una de cada tres láminas; en piezas de una pantalla, sólo si pasa las cinco pruebas.

## Normative Docs

- `docs/operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md` (ficha RV1b y fotos con luz de acento).
- `ai-generations/2026-10-06_deck-hubspot/fotos/LEEME.md` (banco A/B/C de la decisión del acento).
- `docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md` (gate de tres voces).

## Dependencies & Impact

### Depends on

- AXIS `packages/contracts/src/surface-composition.ts` y `packages/tokens/src/tokens.ts` (`deckLineStage`,
  `deckLinePlatform`, `deckLineBeam`, `deckLineDocument`, `deckLineVoice`).
- Que el trabajo sin commitear de otra sesión en AXIS `packages/contracts` (AI Visibility Report) y
  `packages/tokens` quede commiteado antes de tocar esos paquetes.

### Blocks / Impacts

- TASK-1943 (serie HubSpot): se compone hoy dentro del contrato actual; sus pares se revisan al salir esta task.
- TASK-1918 (`foto:prompt` y lente): comparte `scripts/foto/build-prompt.mjs`; el aviso del acento vive aquí.
- TASK-1933 (QA del catálogo del deck) y TASK-1932 (salida productiva de Proposal Studio): consumen recetas con voz.
- Greenhouse fija `axis-ui-contracts` 0.3.40, `axis-tokens` 0.3.41 y `axis-graphic-line` 0.11.0; consumir el cambio
  exige subir esas versiones.

### Files owned

- AXIS: `packages/contracts/src/surface-composition.ts` (voz `decision`), `packages/tokens/src/tokens.ts` (luz del
  escenario de línea), `packages/graphic-line/src/recipes.ts` (par opcional) y sus pruebas.
- `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json` (campo de voz por receta)
- `src/lib/brand-surfaces/**` y `src/lib/artifact-composer/catalogs/graphic-line-deck/**` (voz `decision`)
- `src/lib/brand-surfaces/deck-recipes/validate.ts` e `issues.ts` (avisos de voz)
- `scripts/foto/componer-cta.gate.mjs` (voz de decisión en publicidad) y `scripts/foto/build-prompt.mjs` (aviso del
  acento como luz)

## Current Repo State

### Already exists

- Canon escrito: `EFEONCE_GRAPHIC_LINE_V1.md` §2 y §4 (commits 4f0e38d72, f3d9f6ca4, c97d498d3, 082f49801).
- Contrato AXIS con voz pregunta + respuesta obligatoria y `type.answer.maxWords` = 3
  (`packages/contracts/src/surface-composition.ts`).
- Tokens de escenario de línea que pintan con el acento: `deckLineStage.halo.stops`, `deckLinePlatform`,
  `deckLineBeam.gradient`, `deckLineDocument.halo` (`packages/tokens/src/tokens.ts`, línea ~455).
- Validador del plan de deck con códigos de severidad (`src/lib/brand-surfaces/deck-recipes/issues.ts`).
- Gate de tres voces de publicidad (`scripts/foto/componer-cta.gate.mjs`).

### Gap

- No hay voz `decision` en el contrato ni en las plantillas; el par es obligatorio en toda receta con voz.
- Ningún gate mide la densidad de pares ni el calce pregunta–respuesta.
- La luz del escenario de línea sale en el acento en 31 recetas line-stage.
- `foto:prompt` no avisa cuando la escena usa el acento como luz.
- El README del design system «La órbita» y la skill `efeonce-graphic-line` no tienen ninguna de las dos reglas.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `axis-design-system/packages/{contracts,tokens,graphic-line}` y `greenhouse-eo/src/lib/brand-surfaces` + `scripts/foto`
- Future candidate home: `remain-shared`
- Boundary: AXIS define voz y luz (contrato + tokens); Greenhouse compone y valida (compositor, `brand:deck-plan`, `foto:*`)
- Server/browser split: `n/a` — composición server-only y CLI local
- Build impact: `none` — sin dependencias nuevas; sube versiones de paquetes AXIS ya consumidos
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

### Slice 1 — Reglas en el design system y las skills

- README del design system «La órbita» y skill `efeonce-graphic-line` (Claude y espejo Codex) con las dos reglas, las
  cinco pruebas del par y la tabla de calce.
- Ficha RV1b en el casebook cine y en `scripts/foto/cine-recetas.json` con la advertencia de que su luz es el acento.

### Slice 2 — Contrato AXIS de voz

- Voz `decision` en `efeonce.surface-composition`: titular sin pregunta, tope de palabras propio, jerarquía medida
  contra el eyebrow o la bajada; el par opcional por receta, con su propio tope.
- Norma de composición por superficie: «base común» del deck reescrita; hero web, DOOH y motion con el titular por
  defecto y el par como recurso.
- Release AXIS con visto bueno del operador.

### Slice 3 — Luz del escenario en AXIS

- Tokens de escenario de línea con la luz en `photo-blue` y blanco frío; el acento sólo en esfera, anillo, arco que
  mide y palabra del eslogan.
- Release AXIS con visto bueno del operador.

### Slice 4 — Greenhouse consume el contrato y la luz

- Subir `axis-ui-contracts`, `axis-tokens` y `axis-graphic-line` a las versiones de los Slices 2–3.
- Plantillas del Artifact Composer con la voz `decision`; recetas del catálogo con el par opcional.
- `pnpm composer:visual-gate`: las diferencias esperadas se registran en una sección sin sellar de `BASELINE_DELTAS.md`
  y el operador las mira antes de sellar.

### Slice 5 — Gates que lo hacen cumplir

- `brand:deck-plan`: avisos de densidad de pares (más de una de cada tres láminas), sí/no sin calce, respuestas que
  señalan la lámina («Así», «Esto»…), preguntas en primera persona plural de Efeonce.
- `foto:cta:gate`: la pieza con titular de decisión certifica sin entrada de pregunta; el 3× se mide contra la voz que
  exista.
- `foto:prompt`: aviso cuando la escena usa el hex del acento de la línea como luz, llave, haz o fenómeno dominante;
  pide declararlo como puntuación o pasarlo a `photo-blue`. Prueba de no-regresión: `scripts/foto/regresion-prompt.mjs`.

### Slice 6 — Revisión de los decks aprobados

- Pasar los decks aprobados (SEO/AEO, Salesforce, HubSpot y pares por línea) por las cinco pruebas y la densidad; lista
  de pares a reemplazar para el operador. Los pares por línea que fallan los elige el operador.

## Out of Scope

- Reescribir el copy de los decks aprobados: esta task entrega la lista; el operador elige los reemplazos.
- Rehacer fotos aprobadas con luz de acento (RV1b y otras): se reemplazan al reutilizarlas.
- La serie HubSpot (TASK-1943) y el orquestador idempotente `pnpm foto:cine` (TASK-1926).

## Detailed Spec

Las cinco pruebas, la tabla de calce y las respuestas vacías están en `EFEONCE_GRAPHIC_LINE_V1.md` §4 (delta
2026-10-06); el inventario de tokens que pintan con el acento está en §2 («Estado en las láminas diseñadas»). No se
copian aquí.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 puede ir solo y primero.
- Slices 2 y 3 (AXIS) MUST ship ANTES del Slice 4: Greenhouse no compone una voz que el contrato no admite.
- Slice 5 depende del Slice 2 para la voz y es independiente para el aviso del acento en `foto:prompt`.
- Slice 6 corre al final, contra el contrato nuevo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Subir los paquetes AXIS mueve láminas aprobadas de todas las líneas | Artifact Composer / decks | high | rebaseline en sección sin sellar, revisado por el operador antes de sellar | `pnpm composer:visual-gate` distinto de cero |
| Arrastrar trabajo ajeno sin commitear en AXIS `contracts`/`tokens` | AXIS release | medium | no tocar esos paquetes hasta que ese trabajo esté commiteado; commitear sólo rutas propias | `git status` de AXIS con cambios ajenos |
| El aviso del acento cambia prompts de otros registros | `foto:prompt` | low | sólo avisa, no reescribe; `regresion-prompt.mjs` en 0 cambios | `regresion-prompt.mjs` sale con 1 |
| Decks en curso quedan con pares que el gate nuevo marca | ventas | medium | los avisos son advertencias, no errores, hasta que el operador cierre la revisión | avisos de `brand:deck-plan` |

### Feature flags / cutover

- Sin flag. Los avisos nuevos nacen como advertencias, no errores; el contrato nuevo es aditivo (voz `decision` y par
  opcional) y las recetas existentes siguen componiendo con el par.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit de docs y skills | minutos | sí |
| Slice 2 | release AXIS anterior; Greenhouse sigue fijo en la versión previa | minutos | sí |
| Slice 3 | release AXIS anterior | minutos | sí |
| Slice 4 | revert del bump de versiones y de las plantillas; baseline anterior | minutos | sí |
| Slice 5 | revert del commit de gates | minutos | sí |
| Slice 6 | sólo produce una lista; no muta piezas | no aplica: sin cambios que deshacer | sí |

### Production verification sequence

1. AXIS: pruebas de `contracts` y `tokens` en verde; release con visto bueno del operador; Lab muestra las piezas.
2. Greenhouse: bump de versiones, `pnpm typecheck`, pruebas de `src/lib/brand-surfaces`, `pnpm composer:visual-gate`
   con las diferencias registradas y miradas por el operador.
3. Componer un deck de prueba con voz `decision` y verificar los avisos de `brand:deck-plan`.

### Out-of-band coordination required

- Visto bueno del operador para cada push a `main` de AXIS (publica en axis.efeonce.org).
- Coordinar con la sesión que tenga trabajo sin commitear en AXIS `contracts`/`tokens`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El README de «La órbita» y la skill `efeonce-graphic-line` (Claude y Codex) contienen las dos reglas; `pnpm skills:mirrors` en verde.
- [ ] La ficha RV1b del casebook y su entrada en `cine-recetas.json` advierten que su luz es el acento.
- [ ] `efeonce.surface-composition` acepta una lámina con voz `decision` sin pregunta y la rechaza si excede su tope de palabras (prueba en AXIS).
- [ ] Una receta con par opcional compone con y sin par.
- [ ] Los tokens de escenario de línea no usan el acento como luz (prueba en AXIS que lo afirma para todas las líneas).
- [ ] Greenhouse fija las versiones nuevas y `pnpm composer:visual-gate` queda en cero tras sellar el rebaseline mirado por el operador.
- [ ] `brand:deck-plan` emite avisos de densidad, sí/no sin calce, respuesta que señala la lámina y primera persona plural, con pruebas.
- [ ] `foto:cta:gate` certifica una pieza con titular de decisión sin pregunta.
- [ ] `foto:prompt` avisa cuando la escena usa el acento como luz y `regresion-prompt.mjs` reporta 0 fichas no cine cambiadas.
- [ ] La lista de pares a reemplazar de los decks aprobados está entregada al operador.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm composer:visual-gate`
- Pruebas de `packages/contracts` y `packages/tokens` en AXIS

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1943 y TASK-1918 quedaron con delta sobre lo que cambió.

## Follow-ups

- Rehacer las fotos aprobadas con luz de acento cuando se reutilicen (RV1b y las que liste el Slice 6).

## Open Questions

- Tope de palabras del titular de decisión: lo propone el Slice 2 midiendo los decks aprobados; lo decide el operador.
