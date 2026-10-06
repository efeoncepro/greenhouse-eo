# TASK-2013 — Brochure Agencia Creativa: 20 láminas a mano como candidatas a receta del catálogo del deck

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Status real: `Brochure canonizado en servicios y skills (2026-10-06); recetas y pendientes sin empezar`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; AXIS main con visto bueno del operador; sin worktrees`

## Summary

El operador aprobó el 2026-10-06 el brochure «Agencia Creativa» (27 láminas) y pidió canonizarlo. La canonización en
servicios y skills quedó hecha ese día. De las 27 láminas, 7 salen del Artifact Composer con recetas existentes y 20
están hechas a mano en el canvas: el operador decidió registrarlas como **candidatas** a receta, no promoverlas ahora.
Esta task las promueve al catálogo del deck con su imagen de referencia en AXIS y cierra los pendientes abiertos del
brochure (íconos, burbuja URL, foto SA1, autorización del caso SKY, lecciones de foto y naming en AXIS).

## Why This Task Exists

Mientras las 20 láminas vivan sólo en `build-canvas-v7.py` y en el canvas, ningún otro deck puede reutilizarlas:
`pnpm brand:deck-plan` no las conoce, no tienen `communicates`/`useWhen`/`avoidWhen` ni slots medidos, y el próximo
agente las volvería a dibujar a mano. Además, al aprobar quedaron decisiones abiertas que hoy contradicen el canon en
láminas concretas (íconos de plastilina en volumen y con esfera en contenido de deck, recuadro navy de la burbuja URL
sobre fotos casi negras) y una foto (SA1) que pone personas fuera del roster en un caso que el registro cine no cubre.
Si no se registran como trabajo exigible, el brochure se reutiliza con esos defectos.

## Goal

- Las 20 láminas a mano quedan en `EFEONCE_DECK_SLIDE_RECIPES_V1.json` como recetas nuevas o como `approvedUses` de
  recetas existentes, cada una con su `fit`, su imagen de referencia en AXIS y su `referenceSource`.
- El plan del brochure Agencia Creativa queda como fixture validado por `pnpm brand:deck-plan`.
- Las láminas 3, 8, 12, 13 y las que lleven la burbuja URL sobre foto oscura quedan corregidas según el canon.
- Las lecciones de foto del brochure entran al casebook cine y los plates aprobados a `cine-recetas.json`; SA1 sólo
  si el operador lo aprueba.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 (deck: portadas, contraportadas, recetas).
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` §4 (delta 2026-10-06, voz de decisión), §8.5 (la URL
  siempre en su burbuja), §14 (íconos en reposo sin esfera; en una lámina con voz todos en reposo) y §14.1 (la
  plastilina en volumen nunca va en contenido de deck).
- `docs/operations/brand-graphic-line/deck-recipes/README.md` (cómo nace una receta, `approvedUses`, `fit`, índice
  generado con `pnpm brand:deck-recipes`).
- `docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md` §2 y el casebook
  `docs/operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md`.
- `docs/architecture/marketing-studio/EFEONCE_STUDIO_CREATIVE_VIEW_DECISION_V1.md` D9 y §7 (naming de Creative Studio).

Reglas obligatorias:

- Una receta reproduce la lámina aprobada; no se rediseña al promoverla. Si una corrección del canon cambia la lámina
  (Slice 3), la imagen de referencia se toma después de la corrección y la ve el operador.
- La burbuja URL se corrige en el compositor o la plantilla, nunca con un parche en una lámina.
- AXIS posee las imágenes de referencia y los assets; nunca copias a mano en Greenhouse.

## Normative Docs

- `docs/services/creative-services/README.md` § «Collateral comercial» (brochure vigente, talento embebido, pendiente
  de autorización SKY).
- `docs/services/creative-services/EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1.md` (delta 2026-10-06, lámina 19).
- `ai-generations/2026-10-06_brochure-creativo/fotos/LEEME.md` (banco de fotos y descartes).
- Skills `deck-studio` (entrada del brochure y lecciones de oficio), `design-studio`
  (`references/efeonce-photographic-language.md`, lecciones de foto 1–8) y `efeonce-graphic-line`
  (`references/ledger.md`, logo de Creative Studio).

## Dependencies & Impact

### Depends on

- Canvas privado <https://claude.ai/artifact/WbQEN3xR1DqQSELTDbkHrs> (página «Agencia Creativa») y el builder
  `ai-generations/2026-10-06_brochure-creativo/build-canvas-v7.py`.
- Release de `@efeoncepro/axis-brand-assets` 0.4.26 con las 24 piezas `creative-studio-*`: AXIS `f4dd2fe` en `main` y
  tag `v0.4.26` (2026-10-06); sólo en el paquete hasta fragmentar el índice de búsqueda del Lab (399 → 416 KB).
- TASK-2012 (voz de decisión y acento como puntuación): si cambia el contrato de voz antes, las recetas nuevas nacen con
  la voz `decision`.

### Blocks / Impacts

- TASK-1933 (QA abierta del catálogo del deck): suma recetas nuevas a revisar.
- TASK-1926 (pipeline idempotente de fotos cine): consume las recetas cine nuevas.
- TASK-2012: el brochure es un caso medido de la voz (8 de 27 pares).

### Files owned

- `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json` (recetas y `approvedUses` del
  brochure) y el índice generado de `docs/operations/brand-graphic-line/deck-recipes/README.md`
- `src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-brochure-creativo.json` (nuevo)
- AXIS `apps/lab/public/references/surfaces/deck/<receta>.jpg` (imágenes de referencia nuevas)
- `docs/operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md` (sección del brochure) y
  `scripts/foto/cine-recetas.json` (plates aprobados)
- `ai-generations/2026-10-06_brochure-creativo/build-canvas-v7.py` (correcciones de las láminas 3, 8, 12 y 13)
- Plantilla o pie del compositor que pinta la burbuja URL `[verificar]` (en `src/lib/artifact-composer/catalogs/` o
  `src/lib/brand-surfaces/`)

## Current Repo State

### Already exists

- Brochure aprobado (2026-10-06): PDF en OneDrive
  `Alineación/4. Comercial/Brochures/2026/Agencia Creativa/Efeonce-Brochure-Agencia-Creativa.pdf` (27 páginas, 16:9) y
  copia en `ai-generations/2026-10-06_brochure-creativo/`.
- Canonización hecha el 2026-10-06: collateral vigente en `docs/services/creative-services/README.md` (reemplaza a la
  v1 «Servicios Creativos», no vigente), delta de la lámina 19 en el modelo del Embedded Creative Pod, entrada y
  lecciones en las skills `deck-studio`, `creative-practice`, `design-studio`, `efeonce-graphic-line` y
  `efeonce-brand-studio`.
- 7 láminas compuestas por el Artifact Composer desde `ai-generations/2026-10-06_brochure-creativo/intents-v2/`
  (`cover-brochure`, `content-team`, `proposal-service`, `content-bullets`, `content-markets`,
  `decision-next-steps`, `close-brochure`), con su `fit` en el catálogo.
- Fichas de foto en git en `ai-generations/2026-10-06_brochure-creativo/fotos/fichas/`; plates fuera de git en
  `fotos/plates/`.
- Generador `scripts/brand/build-creative-studio-logos.mjs` y 24 SVG `creative-studio-*` en el árbol de AXIS.

### Gap

- Las 20 láminas a mano no están en el catálogo (código del builder · posición): A02 · 2, A03 · 3 (rutas), B1–B6 ·
  4–9, P1–P3 · 10–12, A04 · 13 (seis capacidades), A07 · 15 (tríptico), P4–P5 · 16–17 (Creative Studio), A08 · 18
  (capacidad, no horas), A19 · 19 (talento embebido), A12–A13 · 22–23 (caso y testimonio SKY), A14 · 24 (clientes).
- No hay fixture del plan del brochure.
- Láminas 3, 8, 12 y 13 (posición; A03, B5, P3, A04) con íconos de plastilina en volumen y con esfera en contenido de deck.
- Recuadro navy visible de la burbuja URL sobre fotos casi negras (lámina 19 y otras).
- SA1 sin aprobación de receta cine (las lecciones ya son las fallas 36–43 del casebook y seis plates están en `cine-recetas.json` desde el 2026-10-06).
- Sin verificación de la autorización de las cifras y el testimonio del caso SKY para prospectos.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `docs/operations/brand-graphic-line/deck-recipes/` + `ai-generations/2026-10-06_brochure-creativo/` + AXIS `apps/lab/public/references/surfaces/deck/`
- Future candidate home: `remain-shared`
- Boundary: el catálogo de recetas describe láminas aprobadas; AXIS guarda la imagen de referencia; el compositor pinta la burbuja URL
- Server/browser split: `n/a` — catálogo en JSON y composición server-only por CLI local
- Build impact: `none` — sin dependencias nuevas
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

### Slice 0 — Canonización del brochure (hecha el 2026-10-06)

- Collateral vigente, reemplazo de la v1, encuadre de staff augmentation y lecciones en servicios y skills (ver
  «Already exists»). No se repite.

### Slice 1 — Mapa de las 20 láminas contra el catálogo

- Para cada lámina a mano: receta existente que la cubre (pasa a `approvedUses` con su `fit`) o receta nueva (id,
  familia, slots medidos con sus `maxChars`, `communicates`, `useWhen`, `avoidWhen`, `preferInstead`, `pairsWith`,
  `photo` con su ficha). Tabla en el `## Delta` de esta task, revisada por el operador antes del Slice 2.

### Slice 2 — Recetas en el catálogo e imágenes de referencia en AXIS

- Recetas nuevas y `approvedUses` en `EFEONCE_DECK_SLIDE_RECIPES_V1.json` con `referenceSource` apuntando a la lámina
  del brochure; índice regenerado con `pnpm brand:deck-recipes`.
- Imagen de referencia de cada receta nueva en AXIS `apps/lab/public/references/surfaces/deck/<id>.jpg` (después del
  Slice 3 para las láminas corregidas); push de AXIS con visto bueno del operador.
- Plan del brochure como `golden-brochure-creativo.json`, validado con `pnpm brand:deck-plan -- --plan <fixture>`.

### Slice 3 — Correcciones pendientes de las láminas

- **Íconos (láminas 3, 8, 12 y 13).** Según §14.1 la plastilina en volumen nunca va en contenido de deck: va la
  versión plana o el Trazo. Según §14 los íconos en reposo van sin esfera, y en una lámina con voz todos quedan en
  reposo. Corregir en `build-canvas-v7.py`, republicar las láminas en el canvas y mostrarlas al operador.
- **Burbuja URL sobre fotos casi negras.** El recuadro navy no viene del asset (`url-bubble-baked-dark.svg` no tiene
  fondo): lo agrega la plantilla o el pie al componer. Según §8.5 va `url-bubble-source` con
  `mix-blend-mode: luminosity` en Chromium, o la horneada oscura sin chip, con 4,5:1 medido bajo su caja. Se corrige
  en el compositor (y en las láminas a mano que la pintan igual), nunca con un parche en una lámina.

### Slice 4 — Fotos: casebook, recetas cine y SA1

- Hecho el 2026-10-06: sección del brochure en el casebook cine (fallas 36–43).
- Hecho el 2026-10-06: los seis plates cine aprobados (`CV1b`, `CV2b`, `CV3b`, `BS1c`, `RG1b`, `HB2`) como recetas en
  `scripts/foto/cine-recetas.json`, con su `ojo`; `SK1` es foto de lugar fuera del registro cine.
- **SA1 queda candidata.** No es receta cine aprobada: el §2 del registro cine no cubre extras del cliente con texto a
  la izquierda, y la sesión de línea gráfica lo lleva al operador. Mientras tanto rige: el cliente sale sólo en
  `panel-end` y nunca en su dolor (SP1), y en las fotos de marca no hay personas fuera del roster. Si el operador la
  rechaza, la lámina 19 cambia de foto y su imagen de referencia se toma con la nueva.

### Slice 5 — Pendientes comerciales y de marca

- Verificar con el operador si las cifras («25 % menos de tiempo de producción») y el testimonio del caso SKY
  requieren autorización del cliente antes de usar el brochure con prospectos; registrar la respuesta en el README de
  Creative Services y en `creative-practice`.

## Out of Scope

- Plantillas del Artifact Composer para las recetas nuevas: nacen sin plantilla, como las del deck SEO/AEO; su
  plantilla es un follow-up.
- Reescribir el copy o el orden del brochure aprobado.
- Abrir una oferta de Staff Augmentation puro: el brochure vende talento embebido con respaldo de Efeonce.
- El contrato de voz `decision` (TASK-2012).

## Detailed Spec

El orden final de las 27 láminas, su origen (composer o a mano), el copy de la lámina 19 y las ocho lecciones de foto
están en la entrada del brochure de la skill `deck-studio` y en `design-studio`
(`references/efeonce-photographic-language.md`); no se copian aquí. El formato de receta y `approvedUses` es el del
README del catálogo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 MUST ir antes del Slice 2: el operador ve el mapa antes de que nazcan recetas.
- Slice 3 MUST ir antes de tomar las imágenes de referencia de las láminas 3, 8, 12, 13 y las que llevan la burbuja.
- Slice 4 es independiente; la imagen de referencia de la lámina 19 espera la decisión sobre SA1.
- Slice 5 es independiente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una receta nueva duplica una existente | catálogo del deck | medium | Slice 1 mapea cada lámina contra las 100 recetas antes de crear | `pnpm brand:deck-plan` con avisos de receta duplicada o sin uso |
| La corrección de la burbuja cambia láminas ya aprobadas de otros decks | Artifact Composer | medium | `pnpm composer:visual-gate` y rebaseline en sección sin sellar de `BASELINE_DELTAS.md`, mirado por el operador | visual gate distinto de cero |
| SA1 se reutiliza antes de su aprobación | fotos de marca | low | marcada candidata en skills y casebook; no entra a `cine-recetas.json` sin aprobación | ficha que parte de SA1 |
| El brochure se manda a un prospecto con cifras SKY sin autorización | ventas | medium | pendiente visible en el README de servicios y en `creative-practice` | uso del PDF antes de cerrar el Slice 5 |

### Feature flags / cutover

- Sin flag: cambio aditivo en catálogo, docs y assets de referencia, sin impacto en runtime de producción.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del delta de la task | minutos | sí |
| Slice 2 | revert del commit del catálogo; revert del commit de AXIS con las imágenes | minutos | sí |
| Slice 3 | revert del builder y del compositor; baseline anterior | minutos | sí |
| Slice 4 | revert del casebook y de `cine-recetas.json` | minutos | sí |
| Slice 5 | revert de docs | minutos | sí |

### Production verification sequence

1. `pnpm brand:deck-recipes` regenera el índice sin diferencias manuales.
2. `pnpm brand:deck-plan -- --plan src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-brochure-creativo.json` sin errores.
3. `pnpm composer:visual-gate` en cero tras sellar el rebaseline de la burbuja, mirado por el operador.
4. Lab de AXIS muestra las imágenes de referencia nuevas.

### Out-of-band coordination required

- Visto bueno del operador para el mapa del Slice 1, para las láminas corregidas y para cada push a `main` de AXIS.
- Decisión del operador sobre SA1 (la lleva la sesión de línea gráfica) y sobre la autorización del caso SKY.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El brochure Agencia Creativa está registrado como collateral vigente en `docs/services/creative-services/README.md` y en las skills `deck-studio` y `creative-practice` (2026-10-06).
- [ ] Cada una de las 20 láminas a mano figura en el catálogo como receta nueva o como `approvedUses` de una existente, con `fit` y `referenceSource`.
- [ ] Cada receta nueva tiene su imagen en AXIS `apps/lab/public/references/surfaces/deck/` y el Lab la muestra.
- [ ] `golden-brochure-creativo.json` valida con `pnpm brand:deck-plan` sin errores.
- [ ] Las láminas 3, 8, 12 y 13 no usan plastilina en volumen y sus íconos van en reposo sin esfera; el operador las vio.
- [ ] Ninguna lámina del brochure ni plantilla del compositor pinta un recuadro navy detrás de la burbuja URL, y la burbuja mide 4,5:1 bajo su caja.
- [x] El casebook cine tiene la sección del brochure (fallas 36–43) y `cine-recetas.json` los seis plates cine aprobados (2026-10-06; `SK1` es foto de lugar fuera del registro cine).
- [ ] SA1 tiene decisión del operador registrada (receta cine o reemplazo de la foto de la lámina 19).
- [ ] La autorización del caso SKY para prospectos tiene respuesta registrada en el README de Creative Services.
- [x] El README de `brand-assets` en AXIS ya no dice que «Creative Studio» es sólo el descriptor de Globe (AXIS `f4dd2fe`, 2026-10-06).

## Verification

- `pnpm brand:deck-recipes`
- `pnpm brand:deck-plan -- --plan src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-brochure-creativo.json`
- `pnpm composer:visual-gate`
- `pnpm test src/lib/brand-surfaces`
- Revisión del operador del mapa de láminas, de las láminas corregidas y del Lab de AXIS

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1933 y TASK-1926 quedaron con delta sobre las recetas nuevas.

## Follow-ups

- Plantillas del Artifact Composer para las recetas nuevas del brochure.

## Open Questions

- ¿SA1 entra como receta cine o la lámina 19 cambia de foto? (decisión del operador, en curso con la sesión de línea gráfica).
- ¿Las cifras y el testimonio del caso SKY requieren autorización del cliente, como el caso ANAM?
