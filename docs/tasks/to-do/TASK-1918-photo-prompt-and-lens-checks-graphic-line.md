# TASK-1918 — foto:prompt y chequeos de la lente para la línea gráfica

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->


## Delta 2026-09-27

- `scripts/foto/**` tiene migración planificada al repo taller `efeonce-brand-workshop` (TASK-1925, ADR `EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1`). Si esta task arranca antes, trabaja sobre `scripts/foto`; si arranca después, sobre `tools/foto` del taller. TASK-1925 no migra mientras esta esté `in-progress`.

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; AXIS main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El operador aprobó el 2026-09-26 las reglas de sinergia entre la línea gráfica «La órbita» y el lenguaje fotográfico
de Efeonce, y resolvió sus conflictos. Cuatro de esas decisiones necesitan código: que `foto:prompt` briefee la foto
para la lente del formato, que no emita el límite del 36 % sin reserva de texto, que genere el 1200 × 627 nativo, y
que los chequeos de la órbita midan contra el lecho y midan de verdad que el sujeto quede dentro de la lente.

## Why This Task Exists

Hoy la pieza con lente se arma con una cláusula escrita a mano en la escena y un chequeo que la lente no pasa por
geometría sino por revisión visual (`lens-subject-inside-circle` queda `manual`). El resultado depende de que el
agente recuerde el círculo visible de cada formato, y los conflictos resueltos por el operador (P-1…P-9) no llegan al
comando: `foto:prompt` sigue emitiendo el límite de cabezas y manos del 36 % en toda foto vertical, el banner
1200 × 627 no existe como formato y los chequeos no miran el lecho.

## Goal

- `foto:prompt` acepta `reservas.lente` y escribe el encuadre de la lente desde los tokens de AXIS (P9, P1, P-3).
- El límite del 36 % sale sólo cuando la toma tiene reserva de texto (P-8); el 1200 × 627 es formato nativo (P-6).
- Los chequeos de la órbita, la lente y el foco miden contra `bed` y `reserve`, y `lens-subject-inside-circle` se
  mide contra el círculo visible (P5), en AXIS y en el adapter de Greenhouse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` (delta 2026-09-26 (e): decisiones D9 y D10)
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` §9 y §9.1
- `docs/operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md` §11
- `docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md` (delta 2026-09-26)

Reglas obligatorias:

- Los valores de la lente (centro, radio, zoom, anillo) salen de los tokens `efeonceGraphicLine.pieces.lens` y
  `efeonceGraphicLine.lens` de `@efeoncepro/axis-tokens`; nunca se transcriben a mano en el prompt.
- El prompt se arma sólo con `pnpm foto:prompt`; nunca concatenando bloques (regla de `.claude/rules/brand-photography.md`).
- Nunca se recorta un formato desde otro: el 1200 × 627 se genera nativo.
- Un chequeo nuevo que cambia la conducta de un adapter se agrega también a `AXIS_GRAPHIC_LINE_ADAPTER_CHECKS` si es
  contrato, con prueba en AXIS y en Greenhouse.

## Normative Docs

- `.claude/skills/efeonce-graphic-line/references/photography-convergence.md` §5, §6 y §9 (reglas P1–P12 y
  resoluciones P-1…P-9)
- `.claude/skills/design-studio/references/efeonce-photographic-language.md`

## Dependencies & Impact

### Depends on

- `@efeoncepro/axis-tokens` 0.3.5 y `@efeoncepro/axis-ui-contracts` 0.3.5 publicados (tag `v0.3.5`, 2026-09-26);
  Greenhouse fija hoy tokens 0.3.3 y contracts 0.3.0 en `package.json` y debe subir antes del Slice 3.
- `scripts/foto/build-prompt.mjs` (tabla `FORMATOS`).

### Blocks / Impacts

- Todas las piezas con lente de marca propia (post, story, imagen de LinkedIn, portada de deck, muro) y el banco de
  fotos para lente.
- La skill `efeonce-graphic-line` y la skill `design-studio` (referencia del lenguaje fotográfico), que se actualizan
  al cerrar.

### Files owned

- `scripts/foto/build-prompt.mjs`
- `scripts/creative/layout-compiler/graphic-line.mjs`
- `scripts/creative/layout-compiler/compiler.test.mjs`
- `../axis-design-system/packages/graphic-line/src/checks.ts` (repositorio AXIS)
- `../axis-design-system/packages/contracts/src/graphic-line.ts` (repositorio AXIS, lista de chequeos)

## Current Repo State

### Already exists

- `scripts/foto/build-prompt.mjs`: tabla `FORMATOS` con `4:5`, `9:16` y `16:9`; en los verticales emite siempre
  «All heads and hands stay BELOW 36% of the frame height.»; al 2026-09-26 otra sesión agregó `3:1` (2304 × 768, sin
  validar) sin commit.
- `scripts/creative/layout-compiler/graphic-line.mjs`: `bindings.protect` con `subject | reserve | bed`; el chequeo
  `orbit-never-over-subject-or-reserves` filtra sólo `subject` y `reserve` (línea 313).
- AXIS `packages/graphic-line/src/checks.ts`: el mismo chequeo en el paquete; `lens-subject-inside-circle` existe en el
  contrato pero ningún adapter lo mide por geometría.

### Gap

- No hay campo `reservas.lente`; la cláusula de encuadre de la lente se escribe a mano en la escena.
- El límite del 36 % no depende de `reservas.texto`.
- No existe el formato 1200 × 627.
- Los chequeos no miran `bed` y la lente se revisa a ojo.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/foto/` y `scripts/creative/layout-compiler/` en Greenhouse; `packages/graphic-line` en AXIS
- Future candidate home: `remain-shared`
- Boundary: `foto:prompt` es el único constructor del prompt fotográfico; los chequeos de la órbita viven en el paquete
  AXIS y el adapter de Greenhouse los replica con el mismo nombre
- Server/browser split: `n/a — herramientas de línea de comandos`
- Build impact: `none`
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

### Slice 1 — foto:prompt: límite condicional y formato nativo

- El límite «heads and hands below 36 %» se emite sólo cuando la ficha declara `reservas.texto` (P-8).
- Nuevo formato `1200x627` en `FORMATOS` con su geometría, generado nativo (P-6); reconciliar con el `3:1` agregado
  por otra sesión si ya está commiteado.
- Pruebas de `foto:prompt` para ambos casos.

### Slice 2 — foto:prompt: reservas.lente

- Campo `reservas.lente` en la ficha (formato de la pieza y receta de lente), que lee centro y diámetro visible de
  `efeonceGraphicLine.pieces.lens` y `lens.zoom` y escribe la cláusula de encuadre (P9, P1, P-3).
- En piezas con lente, la ficha pide lecho igual (P12) y avisa si la palanca elegida llena el cuadro (P-9).

### Slice 3 — chequeos de la lente y el lecho

- `orbit-never-over-subject-or-reserves` también contra `bed`; la lente y el foco contra `reserve` y `bed` (no contra
  `subject`) (P5).
- `lens-subject-inside-circle` medido con la caja `subject` de `protect` contra el círculo visible, en el paquete AXIS
  y en el adapter de Greenhouse; deja de reportarse `manual`.
- Pruebas en `packages/graphic-line` (AXIS) y `compiler.test.mjs` (Greenhouse).

## Out of Scope

- La barra fotográfica del retrato de perfil (P-7): es redacción del lenguaje fotográfico, no código.
- Cambiar las recetas de lente o los tokens de las piezas medidas.
- Subir las versiones de AXIS en Greenhouse más allá de lo que el Slice 3 necesite (lo hace la sesión dueña del
  motion de la órbita al terminar sus renders).
- Generar el banco de fotos para lente.

## Detailed Spec

- Círculo visible de la lente por formato: `pieces.lens.<pieza>.ring` da centro y radio del anillo en el lienzo; la
  foto dentro mide `r / (1 + orbit.ringAirRatio)` y se amplía `lens.zoom` (1,25). La cláusula que escribe
  `reservas.lente` pide que el sujeto quepa en ese círculo, con aire (`lens.subjectAirRatio`), centrado en el punto que
  corresponde de la toma.
- P-3: el 55 % (`lens.subjectCircleRatio`) es del círculo visible, no del lado corto del plate.
- P-4: si la escena trae un anillo dibujado, la pieza con lente la rechaza (dos órbitas); el chequeo puede ser
  advertencia en `foto:validar` o regla de ficha, a decidir en el plan.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 (ambos en `build-prompt.mjs`).
- Slice 3 es independiente, pero en Greenhouse necesita contracts ≥ 0.3.5 instalado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cambiar el límite del 36 % altera prompts de piezas con texto ya aprobadas | tooling fotográfico | low | la regla sólo se quita cuando no hay `reservas.texto`; prueba de regresión sobre fichas existentes | diff del prompt en las pruebas |
| El chequeo contra `bed` rechaza composiciones que hoy pasan | compositor de campañas | medium | correr el chequeo sobre las piezas del banco antes de activarlo; reportar primero como advertencia | `creative:layout` con `status: fail` |
| Otra sesión edita `build-prompt.mjs` en paralelo | checkout compartido | medium | commitear sólo los hunks propios, con índice temporal si hace falta | conflicto en `git status` |

### Feature flags / cutover

Sin flag: herramientas locales de línea de comandos, sin runtime de producción; el cambio rige al commitear.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir el commit de `build-prompt.mjs` | minutos | si |
| Slice 2 | revertir el commit de `build-prompt.mjs` | minutos | si |
| Slice 3 | revertir el commit en Greenhouse; en AXIS, publicar una versión de parche sin el chequeo | minutos / una publicación | si |

### Production verification sequence

1. `pnpm foto:prompt` sobre una ficha con lente y otra con texto: el límite aparece sólo en la segunda.
2. Ficha 1200 × 627 genera el tamaño nativo.
3. `pnpm creative:layout:test` y la suite de `packages/graphic-line` en verde con los chequeos nuevos.
4. Una pieza real con lente pasa `lens-subject-inside-circle` medido, no `manual`.

### Out-of-band coordination required

Publicar AXIS (tag) si el Slice 3 cambia el paquete; avisar a la sesión que opera piezas OOH si toca `FORMATOS`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `foto:prompt` emite «heads and hands below 36 %» sólo cuando la ficha declara `reservas.texto`.
- [ ] `foto:prompt` acepta el formato 1200 × 627 y lo genera nativo.
- [ ] `foto:prompt` acepta `reservas.lente` y escribe el encuadre con valores leídos de `efeonceGraphicLine`.
- [ ] `orbit-never-over-subject-or-reserves` incluye `bed`; la lente y el foco se chequean contra `reserve` y `bed`.
- [ ] `lens-subject-inside-circle` se mide por geometría en AXIS y en Greenhouse, con prueba.
- [ ] La skill `efeonce-graphic-line` (`photography-convergence.md`, `package-and-tokens.md`, `qa-checklist.md`) y el
      lenguaje fotográfico §11 marcan P5, P9, P-6 y P-8 como implementados.

## Verification

- `pnpm foto:prompt` con fichas de prueba (con y sin texto, con lente, 1200 × 627)
- `pnpm creative:layout:test`
- AXIS: `pnpm build && pnpm test && pnpm typecheck && pnpm lint`
- `pnpm skills:mirrors`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] la skill `efeonce-graphic-line` quedó actualizada y espejada según su contrato de mantenimiento

## Follow-ups

- Barra fotográfica del retrato de perfil (P-7), en el lenguaje fotográfico.

## Delta 2026-09-26

- Insumo de la sesión de piezas OOH (sin aprobación del operador todavía): una ronda nativa 1:1 de cuatro plates en
  `ai-generations/2026-09-26_ronda-1x1/` pasa `foto:validar` con el lecho al 18 % (tinta blanca 5,5–14,9:1); la banda
  de texto al 28 % pasa en 3 de 4 (el macro da 0,26). **El modelo entrega 1024 × 1024 aunque la tabla pide 1152**:
  revisar ese tamaño al tocar `FORMATOS`. El formato `3:1` (2304 × 768, sin validar) sigue local en `build-prompt.mjs`
  y se reconcilia en el Slice 1.

## Open Questions

- ¿El anillo dibujado dentro de la escena (P-4) se detecta en `foto:validar` o basta con una regla de ficha?
