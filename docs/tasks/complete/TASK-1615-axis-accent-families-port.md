# TASK-1615 — Portar las familias de acento Coral y Magenta de AXIS al paquete

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
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
- Epic: `EPIC-028`
- Status real: `AXIS declara TRES familias de acento para Globe —Coral, Magenta y Orchid— y sólo orchid llegó a @efeoncepro/axis-tokens. La rampa magenta vive hoy DUPLICADA como constante local en Globe (deuda declarada por TASK-1613); coral no existe en ningún lado del código. Un valor de marca escrito dos veces es exactamente cómo warning y danger driftearon entre el paquete y su consumidor sin que nada lo notara`
- Rank: `TBD`
- Domain: `design-tokens|axis`
- Blocked by: `none`
- Branch: `task/TASK-1615-axis-accent-families-port`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Portar a `@efeoncepro/axis-tokens` las dos familias de acento de Globe que el paquete nunca recibió —
**Coral** y **Magenta** — y retirar la constante local que `TASK-1613` dejó declarada como deuda.

## Why This Task Exists

AXIS declara en Figma **tres** familias de acento para Globe (nodo `12770:121` y hermanos): Coral, Magenta
y Orchid, cada una con su rampa 100-900, sus opacidades y sus sombras. **Sólo orchid llegó al código.**

El costo no es teórico y ya se pagó dos veces en una sola sesión. Al elegir el color del lecho de las
piezas se descartó el magenta con el argumento de que *«sólo existe como color de gráficos»* — cierto
mirando el código, **falso mirando el sistema**. Y cuando la decisión se corrigió, hubo que escribir su
rampa a mano dentro de Globe para poder usarla.

Un valor de marca escrito en dos lugares es exactamente cómo `warning` y `danger` driftearon entre el
paquete y su consumidor sin que nada lo notara.

## Goal

Que las tres familias de acento que AXIS declara existan **en el código**, con un solo dueño, y que Globe
deje de llevar una copia. Sin cambiar un solo píxel de lo que se ve.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Normative Docs

| Doc | Qué gobierna acá |
|---|---|
| Figma `Design System \| AXIS`, nodo `12770:122` (Magenta) y su hermano Coral | Los valores canónicos, leídos del archivo |
| `docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md` | AXIS es dueño del valor; el consumidor adapta, no declara |
| `docs/tasks/complete/TASK-1613-globe-light-mode-appearance-switch.md` | Quien dejó la deuda y por qué |

## Architecture Alignment

`@efeoncepro/axis-tokens` es el SSOT portable. El cambio es **aditivo**: agrega `coral` y `magenta` a
`axisAccentRamp` sin tocar `orchid` ni ninguna forma existente. El drift test de Greenhouse afirma las
claves de `axisRamp` y `efeonceTokens.color` **exactamente**, así que crecer esas sí sería breaking —
`axisAccentRamp` no está en ese contrato, por lo que este cambio no lo toca.

## Dependencies & Impact

- **Depende de:** nada. Es aditivo y no bloquea a nadie.
- **Impacta a:** Globe (retira su constante local) y habilita a cualquier consumidor futuro.

### Files owned

- `~/Documents/axis-design-system/packages/tokens/src/tokens.ts` (+ `tokens.test.ts`)
- `apps/studio-client/src/tokens/tokens.ts` en `efeonce-globe` (retirar `axisMagentaRamp` local)

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `axis-design-system/packages/tokens/src/tokens.ts` (SSOT) + copia local en `efeonce-globe/apps/studio-client/src/tokens/tokens.ts`
- Future candidate home: `remain-shared`
- Nota de placement: el valor ya pertenece a `axis-design-system/packages/tokens`. Esta task **no mueve nada de sitio** — cierra una omisión: dos de las tres familias nunca se portaron
- Boundary: `AXIS es dueño del VALOR; el consumidor adapta a sus nombres de propiedad y nunca declara`
- Server/browser split: `n/a — dato puro, sin runtime`
- Build impact: `ninguno; aditivo sobre axisAccentRamp, que no está en el contrato de forma exacta de Greenhouse`
- Extraction blocker: `ninguno`

## Consumidor real, y por qué ya no es hipotética

Desde el 2026-07-31 la rampa magenta **tiene un consumidor en producción**: el token `--media-wash` del
payload de Globe —el escenario de una pieza sin bytes todavía— la usa entera (pasos 300, 400, 700, 800 y
900). O sea que la duplicación **no es un riesgo futuro: está viva y sirviendo píxeles.**

La elección de familia está medida y canonizada en ADR-017 §7. Los datos que la sostienen, por si esta
task los necesita al portar:

| Familia | Matiz | Saturación | Distancia a `danger` (357°) | Estado |
|---|---|---|---|---|
| Coral | 343° | 85% | **14°** | Sin rol, pero la más saturada y la más cerca del error |
| Magenta | 338° | 76% | 19° | **Sin rol asignado** — la elegida para el escenario |
| Orchid | 266° | 40% | 91° | **Ocupada**: es el acento de Globe (`--accent*`) |

## Current Repo State

`axisAccentRamp` tiene **sólo** `orchid`. Globe declara `axisMagentaRamp` local con un comentario que
apunta a esta task. **Coral no existe en el código en ningún lado.**

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Las dos rampas en AXIS

`axisAccentRamp.coral` y `axisAccentRamp.magenta`, 100-900, **leídas del archivo de Figma** y no de una
captura ni de memoria. Publicar como versión menor.

### Slice 2 — Globe consume y borra su copia

Retirar `axisMagentaRamp` de `tokens.ts` y consumir `axisAccentRamp.magenta`. El valor servido no cambia:
es el mismo hex con un dueño distinto.

## Out of Scope

- **Asignarles rol.** Coral y magenta entran como rampas disponibles. Que coral llegue a significar algo
  es una decisión de diseño con su propio dueño; esta task sólo cierra el drift.
- Las opacidades y sombras de cada familia, que Figma también declara. Se portan cuando alguien las
  consuma — portar lo que nadie usa es la otra forma de drift.

## Detailed Spec

Valores de magenta, leídos del nodo `12770:122` en alta resolución el 2026-07-31:

`100 #f1d1dd` · `200 #e3a3bb` · `300 #d67598` · `400 #c84776` · `500 #ba1954` (main) ·
`600 #a7164c` (dark) · `700 #9e1547` · `800 #951443` · `900 #8b133f`

🔴 Los de **coral hay que leerlos del archivo**, no de una captura de pantalla: en la captura de baja
resolución de esta sesión `#f1d1dd` se leyó como `#F101DD`, y ese es exactamente el error que un valor de
marca no puede permitirse. El instrumento correcto es `get_screenshot` sobre el nodo de la familia con
`maxDimension` alto, o `get_variable_defs` si las swatches están ligadas a variables.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

AXIS publica **antes** de que Globe consuma; al revés, Globe no compila.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Un valor mal transcrito | Marca | Media | Leer del archivo en alta resolución, nunca de una captura | Comparación visual contra Figma |
| Romper el contrato de Greenhouse | Greenhouse | Baja | Aditivo: `axisAccentRamp` no está en su test de forma exacta | Su drift test |

### Feature flags / cutover

Ninguno. Es dato aditivo sin consumidor obligado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | No publicar / revert; nadie consume todavía | minutos | sí |
| 2 | Revert; la constante local vuelve | minutos | sí |

### Production verification sequence

1. `pnpm --filter @efeoncepro/axis-tokens test` en verde.
2. Suite completa de `efeonce-globe` en verde con el pin subido.
3. El lecho de las piezas se ve **idéntico** — el valor no cambió, sólo su dueño.

### Out-of-band coordination required

Publicar la versión de AXIS (push del tag `v*.*.*`) y subir el pin de Globe.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] `axisAccentRamp` expone `coral` y `magenta` completas, con valores leídos del archivo de Figma.
- [x] `orchid` y toda forma existente quedan intactas.
- [x] Globe consume `axisAccentRamp.magenta` y su constante local ya no existe.
- [x] El lecho de las piezas se ve idéntico antes y después.
- [x] Suites de AXIS y del monorepo de Globe en verde.

## Verification

`pnpm --filter @efeoncepro/axis-tokens test` + `pnpm test` en `efeonce-globe`.

## Closing Protocol

- [x] `Lifecycle: complete` y archivo movido a `complete/`.
- [x] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados.
- [x] Retirado el comentario de deuda en `tokens.ts` de Globe.

## Follow-ups

- Decidir si coral merece un rol semántico — hoy no tiene ninguno, y está a 14° del rojo de `danger`.
- Portar opacidades y sombras de cada familia cuando alguien las consuma.

## Evidencia de cierre (2026-07-31)

`@efeoncepro/axis-tokens@0.2.4` publicada con las **tres** familias, leídas del archivo en alta
resolución (nodos `12770:4` coral, `12770:122` magenta, `12770:240` orchid). Globe subió el pin, consume
`axisAccentRamp.magenta` y **borró su copia local**. PR [#32](https://github.com/efeoncepro/efeonce-globe/pull/32).

**El valor servido no cambió:** los mismos cinco hex en `--media-wash` y `globe-theme.generated.css`
**byte-identical**. Sólo cambió de quién es, que era el punto.

**Verificación cruzada que vale registrar:** los nueve pasos de orchid que ya estaban en el paquete
coinciden **exactamente** con el archivo. Cero drift ahí — lo que valida el método de lectura usado para
las otras dos, y descarta que el problema fuera de transcripción y no de omisión.

**Tres asertos nuevos en AXIS:** que las tres familias estén (para que la ausencia vuelva a ser visible),
que cada rampa suba en oscuridad de forma monótona (una rampa que no ordena no es una rampa), y que
**coral queda a 14° del rojo de `danger`** — no como prohibición sino como el dato que la decisión de
asignarle rol necesita.

### Lo que sigue abierto, y es del equipo de diseño

Coral y magenta entran **sin rol asignado**. Las opacidades y sombras que el archivo también declara por
familia se portan cuando alguien las consuma: portar lo que nadie usa es la otra forma de drift.
