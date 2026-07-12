# TASK-1394 — ChartSplit: el callout `.gap` y los dos huecos del motor de resolvers

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial`
- Blocked by: `none`
- Branch: `task/TASK-1394-chart-split-gap-callout-resolver`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`ChartSplit` es la **única** entrada de `KNOWN_BROKEN` en el guard de componibilidad del Artifact
Composer: el catálogo está **24/25**. Esta task la cierra y lleva el catálogo a **25/25**, vaciando
`KNOWN_BROKEN`.

Pero la razón por la que está rota **no es la que dice el guard hoy**. La razón declarada
(*"de dónde sale la posición del callout es una decisión de diseño"*) es **falsa** — el contrato ya
la responde. Lo que falta son **dos huecos del MOTOR de resolvers**, no una decisión de producto.

## Why This Task Exists

Al escribir el guard `template-composability.test.ts` (2026-07-12, deck SKY) se declaró `ChartSplit`
como rota con esta razón:

> *"el callout `.gap` sólo existe en la 3ª fila del prototipo y no tiene resolver de geometría: de
> dónde sale su posición es una DECISIÓN DE DISEÑO (¿contra qué se mide la brecha?), no un fix
> mecánico. TASK-1394."*

**Esa razón no resiste la lectura del contrato.** Se verificó línea por línea:

1. **El resolver SÍ existe.** `chart-bar-geometry` está implementado en
   [`resolvers.ts:293`](../../../src/lib/commercial/tenders/deck/resolvers.ts) — no es un resolver
   faltante.
2. **"¿Contra qué se mide la brecha?" ya está respondido en el contrato.**
   `chart-split.slots.json` → `resolvers.chart-bar-geometry.contract` lo declara explícito: la brecha
   se mide **contra la serie líder** (la barra mayor). El `.gap` va `left = ancho de la barra
   destacada`, `width = (ancho de la líder − ancho de la destacada)`, y el texto del `.glabel` se
   deriva de `leader.valuePct − highlighted.valuePct`. **No hay decisión de diseño pendiente.**

Lo que realmente bloquea son **dos huecos del motor** — y son de la misma familia que las 4 bug
classes ya documentadas: **un contrato que declara algo que el motor no sabe expresar.**

**Hueco 1 — el vocabulario de ops del resolver no sabe BORRAR un nodo.**
El contrato exige: *"the resolver removes `.gap` from every non-highlighted row"*. Pero el tipo de op
([`resolvers.ts:25-43`](../../../src/lib/commercial/tenders/deck/resolvers.ts)) sólo sabe escribir:
`attr`/`value`, `toneClass`/`toneGroup`, `styleProp`/`styleValue`, `asText`. **No hay op de
remoción.** Un resolver hoy no puede quitar del DOM un nodo que el dato no sostiene. Y el `.gap`
existe en el markup de la fila-blueprint, así que al clonarla **aparece en TODAS las filas**: tres
brechas dibujadas donde el dato sólo sostiene una. Eso es **fabricación gráfica**, exactamente lo que
el propio contrato dice que el composer debe abortar.

**Hueco 2 — `gapCallout` está mal modelado: es un slot top-level cuyo selector vive DENTRO de un item repetido.**
Su selector es `[data-slot='series'] .gap .glabel`. Pero `.gap` sólo existe en **una** fila (la
destacada), y las filas son **items clonados de un array**. Un slot top-level no puede apuntar a un
nodo que sólo existe en una fila de una repetición — no es ni un campo de item ni un nodo estable de
la lámina. **El modelo del contrato es el bug**, no sólo el resolver.

**Hueco 3 (menor, misma raíz) — el resolver está incompleto respecto de su propio contrato.**
`chart-bar-geometry` declara que **posee** `.row .track .fill`, `.row .track .gap`,
`.row .track .gap .glabel`, `.refline` y la clase de tono `sky|muted` de la `.row`. Su `build()` hoy
emite **una sola op**: el `width` del `.fill`. No emite el tono, ni la geometría del `.gap`, ni el
texto del `.glabel`, ni valida que el `value` impreso ("50%") sea consistente con el `valuePct` que
dibuja la barra. **Un contrato que declara ownership sobre nodos que no toca es un contrato que
miente** — la misma enfermedad del `KNOWN_BROKEN` que originó esta task.

## Goal

- Cerrar los dos huecos del motor: **op de remoción** en el vocabulario de resolvers, y
  **`gapCallout` re-modelado** como derivado del item destacado, no como slot top-level.
- Completar `chart-bar-geometry` para que honre **todo** el ownership que declara (tono, `.gap`,
  `.glabel`, y la aserción `value ↔ valuePct`).
- Vaciar `KNOWN_BROKEN`: el catálogo del Artifact Composer queda **25/25 componible**, verificado en CI.
- Corregir la razón falsa que hoy vive en el guard y en la doc de arquitectura.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` — molde, contratos de slots, inventario de
  resolvers y **las 4 bug classes** (leerlas: esta task es de la misma familia)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`

Reglas obligatorias:

- **Anti-fabricación (la regla dura del dominio):** la geometría de una barra **se deriva del dato,
  siempre**. Una barra cuyo ancho no sale de su `valuePct` —o una brecha dibujada donde el dato no la
  sostiene— **no es un bug de layout: es fabricación gráfica** en un documento contractual.
- **Fail-closed:** si un tipo, campo u op que el motor no sabe ejecutar aparece en un contrato, el
  composer **aborta la lámina**. **NUNCA** agregar un `default:` silencioso ni un `continue` que deje
  pasar un slot sin escribir. Esa es la 1ª bug class del composer.
- **La op de remoción es una primitive del motor, no un caso de `ChartSplit`.** Debe servir a
  cualquier resolver que necesite quitar un nodo que el dato no sostiene. Si el fix sólo sirve para
  esta plantilla, está mal.
- **Los tests verdes NO son el gate.** Al cerrar, **componer una lámina `ChartSplit` real y MIRAR el
  frame**. Los peores bugs del composer (cuatro pasos numerados "01", párrafos aplanados con comas, la
  firma sin blend) pasaban los 92 tests.

## Normative Docs

- `docs/architecture/tender-deck-composer-prototypes/chart-split.slots.json` — el contrato. Su bloque
  `resolvers.chart-bar-geometry.contract` es **la spec funcional de esta task**: ya declara la
  aritmética completa (escala, refline, tono, `.gap`, `.glabel`). No re-decidir lo que ya está escrito.
- `docs/architecture/tender-deck-composer-prototypes/chart-split.html` — el prototipo. El `.gap`
  hardcodeado (`style="left:32%; width:56%"`) es el ejemplo, **no el dato**.
- `docs/manual-de-uso/comercial/componer-deck-de-licitacion.md`

## Dependencies & Impact

### Depends on

- `src/lib/commercial/tenders/deck/resolvers.ts` — motor de resolvers (op vocabulary + `chart-bar-geometry`)
- `src/lib/commercial/tenders/deck/compose.ts` — el filler que ejecuta las ops
- `src/lib/commercial/tenders/deck/contracts.ts` — tipos del contrato de slots
- `docs/architecture/tender-deck-composer-prototypes/chart-split.slots.json`

### Blocks / Impacts

- **`TASK-1393` (Artifact Composer: extracción a primitive domain-free).** ⚠️ **Colisión real de
  archivos:** TASK-1393 mueve el motor a `src/lib/artifact-composer/**`. Ambas tocan `resolvers.ts`.
  **Secuencia recomendada: TASK-1394 primero** (es chica y quirúrgica; la op de remoción es una mejora
  del motor que 1393 se lleva "gratis" al mover). Si 1393 aterriza antes, esta task rebasea sobre la
  ruta nueva — no cambia el contenido, sólo los paths.
- **El guard `template-composability.test.ts`** pasa de 24/25 a 25/25 y `KNOWN_BROKEN` queda **vacío**.
  El guard es un contrato de dos vías: si `ChartSplit` se arregla y nadie la saca de la lista, el test
  **falla**. Esta task DEBE sacarla.
- La op de remoción queda disponible para **cualquier** resolver futuro (deck y, tras 1393, también
  los catálogos de carrusel).

### Files owned

- `src/lib/commercial/tenders/deck/resolvers.ts`
- `src/lib/commercial/tenders/deck/compose.ts`
- `src/lib/commercial/tenders/deck/contracts.ts` (si el tipo de op vive ahí)
- `src/lib/commercial/tenders/deck/__tests__/template-composability.test.ts`
- `docs/architecture/tender-deck-composer-prototypes/chart-split.slots.json`
- `docs/architecture/tender-deck-composer-prototypes/chart-split.html` (si el `.gap` debe salir del blueprint)
- `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`

## Current Repo State

### Already exists

- **El resolver `chart-bar-geometry`** — `resolvers.ts:293`. Calcula la escala
  (`88 / max(valuePct)`) y emite el `width` del `.fill`. **Esa mitad funciona.**
- **El contrato completo** — `chart-split.slots.json` declara la aritmética del `.gap` y del
  `.glabel`, el tono `sky|muted`, la refline al 88%, y que `value` debe ser consistente con `valuePct`.
- **El guard de componibilidad** — `template-composability.test.ts`, con `KNOWN_BROKEN` de 1 entrada.
- **El vocabulario de ops** — `resolvers.ts:25-43`: `attr`/`value`, `toneClass`/`toneGroup`,
  `styleProp`/`styleValue`, `asText`.
- **`ResolverContext`** ya expone `item`, `index`, `itemCount` y **`slots`** — o sea, un resolver de
  item **ya puede leer cross-item** (de hecho `chart-bar-geometry` lo hace para sacar el `max`). El
  contexto no es el problema.

### Gap

- **No hay op de remoción.** El motor no sabe quitar un nodo del DOM. El `.gap` del blueprint se clona
  a las 3 filas.
- **`gapCallout` es un slot top-level con selector dentro de un item repetido** — estructuralmente
  irresoluble como está modelado.
- **`chart-bar-geometry` no honra su propio ownership:** no emite tono, ni `.gap`, ni `.glabel`, ni
  valida `value ↔ valuePct`.
- **La razón de `KNOWN_BROKEN` es falsa** y está copiada también en
  `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` (§3ª bug class): *"no tiene resolver de geometría"*. Sí lo
  tiene. Hay que corregir ambas.
- **`TASK-1394` estaba citada en el código sin existir** — referencia colgante creada al escribir el
  guard. Esta task la materializa.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/commercial/tenders/deck/` (motor del composer, hoy bajo el dominio comercial)
- Future candidate home: `domain-package`
  - Destino concreto: `src/lib/artifact-composer/**`, por `TASK-1393`. El motor es domain-free: no
    importa nada de `commercial/`.
- Boundary: el motor de resolvers es la primitive; sus consumers son los **catálogos** (`deck-axis`
  hoy; `social-carousel` tras 1393). La op de remoción nace **genérica**, no como caso de `ChartSplit`.
- Server/browser split: `n/a` — el composer corre en Node (CLI `pnpm deck:compose`) con Chromium
  headless para el render; no hay bundle de browser.
- Build impact: `none` — no agrega dependencias.
- Extraction blocker: `none` — esta task no introduce acoplamiento nuevo al dominio comercial. Al
  contrario: la op de remoción es motor puro y viaja limpia a `artifact-composer`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — La op de remoción (motor, genérica)

- Extender el tipo de op de resolver con una **remoción explícita** (nombre sugerido: `remove: true`
  sobre un `selector`). Vive junto a `styleProp`/`toneClass`/`asText`, no como caso especial.
- El filler (`compose.ts`) la ejecuta: si un resolver emite una op de remoción, el nodo sale del DOM
  **de esa instancia de item**, no del blueprint.
- **Fail-closed preservado:** una op desconocida sigue abortando la lámina. La remoción es explícita,
  nunca implícita.
- Test unitario del motor: un resolver que emite remoción sobre un item y no sobre otro produce el nodo
  en uno y no en el otro.

### Slice 2 — `gapCallout` deja de ser un slot top-level

- Re-modelar `gapCallout` en `chart-split.slots.json`: **no puede ser un slot top-level cuyo selector
  apunta dentro de una fila repetida.** Pasa a ser un **campo derivado del item destacado** (resuelto
  por `chart-bar-geometry`, `consumer: resolver-only`), coherente con cómo el motor ya trata a los
  campos derivados (`ordinal-number`, `timeline-phase-ordinal`).
- ⚠️ **Regla vigente que aplica acá** (3ª bug class): *un campo está provisto si lo dio el AUTOR **o**
  si lo derivó un RESOLVER.* El barrido de campos opcionales **no** debe borrar el `.glabel` que el
  resolver acaba de escribir — es exactamente el bug de los cuatro "01" de `ProcessStepsFull`.
- Si el `.gap` debe salir del markup de la fila-blueprint para no clonarse, ajustar `chart-split.html`
  en consecuencia y declarar el porqué.

### Slice 3 — `chart-bar-geometry` honra su contrato completo

Emitir, además del `width` del `.fill` que ya emite:

- **El tono**: `highlight = 'sky'` pone la clase `sky` en la `.row` y en el `.fill`; `'muted'` mantiene
  `muted`. **No existen otros tonos** (el contrato lo dice; no inventar).
- **La geometría del `.gap`** en la fila destacada: `left = ancho de la barra destacada`,
  `width = (ancho de la líder − ancho de la destacada)` — ambos en el **espacio ya escalado** (el que
  usa la refline al 88%), no en `valuePct` crudo.
- **La remoción del `.gap`** en toda fila no destacada (usa la op del Slice 1).
- **El texto del `.glabel`** derivado de `leader.valuePct − highlighted.valuePct`. **NUNCA** aceptar
  un `.glabel` escrito a mano y desincronizado del dato.
- **La aserción `value ↔ valuePct`**: si el `value` impreso ("50%") no es consistente con el `valuePct`
  que dibuja la barra, **abortar** la lámina. Una etiqueta que no coincide con su barra es una lámina
  que miente.
- **Caso borde a decidir y declarar:** qué pasa si la serie destacada **ES** la líder (brecha = 0). El
  `.gap` de ancho 0 con un callout "+0 pts" no tiene sentido. La conducta esperada es no dibujar el
  `.gap` (misma op de remoción). Declararlo en el contrato, no dejarlo implícito.

### Slice 4 — Vaciar `KNOWN_BROKEN` y corregir la razón falsa

- Sacar `ChartSplit` de `KNOWN_BROKEN` en `template-composability.test.ts`. La lista queda **vacía**:
  el catálogo es **25/25 componible**, verificado en CI.
- ⚠️ El guard es **contrato de dos vías**: si se arregla y no se saca, el test **falla** con
  *"ya es componible: sácala de KNOWN_BROKEN"*. Este slice es obligatorio, no cosmético.
- Corregir el comentario del guard (`resolvers.ts` / el test) que hoy afirma *"no tiene resolver de
  geometría"* — **es falso**.
- Corregir `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` → §"La 3ª bug class" y §"El guard", que repiten la
  misma razón falsa y declaran **24/25**.
- **Componer una lámina `ChartSplit` real y MIRAR el frame** (PNG + PDF). Con brecha > 0 y con brecha
  = 0. Adjuntar la evidencia al cierre.

## Out of Scope

- **La extracción del motor a `src/lib/artifact-composer/**`** — eso es `TASK-1393`. Esta task trabaja
  sobre la ruta actual y viaja con el `move`.
- **El brand pack / los 262 HEX hardcodeados** — `TASK-1393`.
- **La modularización de las plantillas en primitivas de layout/chrome** (regiones, safe-area, escala
  de espaciado) — decisión de arquitectura abierta, task hermana pendiente. **No** empezar a extraer
  primitivas de layout acá.
- **Los ajustes visuales del deck SKY** (`ProcessStepsFull`, `RequirementsTableFull`, `PricingFull`,
  la firma) — trabajo en curso separado, con deadline contractual.
- **Cualquier otro resolver** que hoy funcione. Esta task toca `chart-bar-geometry` y el vocabulario de
  ops; no es una auditoría de los 15.

## Detailed Spec

El contrato ya escrito en `chart-split.slots.json` → `resolvers.chart-bar-geometry.contract` **es la
spec**. Se reproduce acá lo esencial para que el agente no tenga que re-derivarlo:

```text
escala      = 88 / max(valuePct de todos los items)
ancho(i)    = round(valuePct(i) * escala) + '%'      → la mayor cae exacto en la refline (88%)
refline     = 88%  (marca la serie líder)

fila destacada (highlight === 'sky') — la ÚNICA que lleva .gap:
  .gap.left   = ancho(destacada)
  .gap.width  = ancho(líder) − ancho(destacada)
  .glabel     = derivado de (leader.valuePct − highlighted.valuePct)

toda fila NO destacada:
  .gap        → REMOVIDO del DOM   ← requiere la op del Slice 1

invariante: value (texto impreso) debe ser consistente con valuePct, o la lámina aborta
caso borde: destacada === líder → brecha 0 → .gap removido también (declararlo)
```

**Por qué importa tanto la op de remoción:** hoy el `.gap` vive en el markup de la fila que sirve de
blueprint. El filler **clona el blueprint por cada item**. Sin op de remoción, las 3 filas salen con
una brecha punteada dibujada encima. El dato sostiene **una** brecha; la lámina muestra **tres**.
Eso es fabricación gráfica — y es peor que un fallo, porque **parece terminada**.

## Rollout Plan & Risk Matrix

Cambio **repo-only, sin runtime de producción**: el composer no tiene API, ni UI, ni migración, ni
capability — su único consumer hoy es el CLI `pnpm deck:compose`. No hay flag, ni cutover, ni
verificación en staging/prod que hacer.

### Slice ordering hard rule

- **Slice 1 (op de remoción) → Slice 3 (resolver completo).** El Slice 3 **no puede** cerrar sin la op:
  sin ella el `.gap` se clona a todas las filas y la lámina fabrica dos brechas que el dato no sostiene.
- **Slice 2 (re-modelado de `gapCallout`) → Slice 3.** El resolver no puede escribir el `.glabel`
  mientras siga siendo un slot top-level con selector dentro de un item repetido.
- **Slice 4 es el último, siempre.** Sacar `ChartSplit` de `KNOWN_BROKEN` antes de que realmente componga
  deja el guard mintiendo en la dirección contraria — y ese guard existe justamente para que la lista
  **no pueda mentir**.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La op de remoción se usa como escape hatch y alguien borra un slot que no supo llenar (regresión de la 1ª bug class: el fallo silencioso) | Artifact Composer (motor) | medium | La remoción sólo la puede emitir un **resolver** declarado en el contrato, nunca el filler ante un campo que no entiende. El fail-closed ante tipo/campo desconocido se mantiene intacto y se cubre con test | `template-composability.test.ts` (una lámina que sale con el copy del prototipo) |
| El resolver escribe el `.glabel` y el barrido de campos opcionales lo borra acto seguido (es literalmente la 3ª bug class: los cuatro "01") | Artifact Composer (motor) | medium | La regla ya existe y está documentada: *un campo está provisto si lo dio el AUTOR o si lo derivó un RESOLVER*. Verificar que aplique al `.glabel`; test explícito | Frame con el callout ausente o con el texto del prototipo |
| El `.gap` se dibuja en el espacio de `valuePct` crudo en vez del espacio escalado (88%) → la brecha no coincide con las barras que hay debajo | Artifact Composer (salida visual) | medium | El Slice 3 lo declara explícito. Verificación **mirando el frame**, no sólo tests | Brecha punteada que no arranca donde termina la barra destacada |
| Colisión de merge con `TASK-1393`, que mueve `resolvers.ts` a `src/lib/artifact-composer/**` | Repo | high | Secuenciar: esta task primero (es chica). Si 1393 aterriza antes, rebase de paths — el contenido no cambia | Conflicto en `resolvers.ts` / `compose.ts` |

### Feature flags / cutover

Sin flag — cambio aditivo al motor, sin runtime de producción, cutover inmediato al mergear. El
composer sólo lo consume el CLI.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (op de remoción) | `git revert` del PR | < 5 min | sí |
| Slice 2 (`gapCallout` re-modelado) | `git revert` | < 5 min | sí |
| Slice 3 (resolver completo) | `git revert` | < 5 min | sí |
| Slice 4 (`KNOWN_BROKEN` vacío) | `git revert` — vuelve a 24/25 con la entrada declarada | < 5 min | sí |

### Production verification sequence

`N/A — repo-only`. El composer no tiene runtime de producción (sin API, UI, migración ni capability;
único consumer = CLI). La verificación real es **componer una lámina `ChartSplit` con datos reales y
mirar el frame** (ver Acceptance Criteria).

### Out-of-band coordination required

`N/A — repo-only change.` Ninguna coordinación externa. ⚠️ Sí requiere **coordinación interna** con
quien esté ejecutando `TASK-1393`: ambas tocan `resolvers.ts`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El vocabulario de ops del resolver soporta **remoción explícita** de un nodo, y la op es
      **genérica del motor** — no un caso especial de `ChartSplit`.
- [ ] Una op desconocida **sigue abortando** la lámina (fail-closed intacto; sin `default:` silencioso).
- [ ] `gapCallout` **ya no es** un slot top-level con selector dentro de un item repetido.
- [ ] `chart-bar-geometry` emite: ancho del `.fill`, clase de tono (`sky`/`muted`), geometría del `.gap`
      en la fila destacada, **remoción** del `.gap` en toda fila no destacada, y el texto del `.glabel`
      derivado de `leader.valuePct − highlighted.valuePct`.
- [ ] Un `value` impreso **inconsistente** con su `valuePct` **aborta** la lámina (test que lo prueba).
- [ ] El caso borde `destacada === líder` (brecha = 0) está **declarado en el contrato** y el `.gap` no
      se dibuja.
- [ ] `KNOWN_BROKEN` queda **vacío**. `template-composability.test.ts` pasa con **25/25**.
- [ ] La razón falsa (*"no tiene resolver de geometría"*) está corregida en el guard **y** en
      `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` (§3ª bug class y §El guard, que además dicen 24/25).
- [ ] **Se compuso una lámina `ChartSplit` real y se MIRÓ el frame** (PNG + PDF), con brecha > 0 **y**
      con brecha = 0. La barra de cada serie mide lo que dice su `valuePct`; la brecha arranca donde
      termina la barra destacada y llega a la líder; sólo hay **una** brecha. Evidencia adjunta al cierre.

## Verification

- `pnpm vitest run src/lib/commercial/tenders` — **92+ tests verdes**, `KNOWN_BROKEN` vacío, 25/25
- `pnpm local:check` (lint + tsc)
- `pnpm deck:compose <plan con ChartSplit> --out .captures/<dir>` y **mirar el frame emitido**
- ⚠️ **Los tests verdes NO son el gate.** Es regla dura del dominio: los cuatro "01" de
  `ProcessStepsFull`, los párrafos aplanados con comas y la firma sin blend **pasaban los 92 tests**.
  Los encontró una **revisión visual**. Mirar el frame es parte de la Definition of Done.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] **`TASK-1393` revisada**: si ya movió el motor, esta task rebaseó sobre `src/lib/artifact-composer/**`
- [ ] **La doc de arquitectura ya no declara 24/25** ni repite la razón falsa

## Follow-ups

- **La 5ª bug class, si el patrón se confirma:** *un contrato puede declarar ownership sobre nodos que
  el motor no sabe tocar.* `chart-bar-geometry` declaraba poseer 5 nodos y emitía 1 op. Vale la pena un
  guard que verifique que lo que un resolver **declara** en `owns[]` es lo que **efectivamente** emite —
  hoy nada lo ata, y es la misma familia de "el contrato que miente" que ya cazamos tres veces.
- **La modularización de las plantillas en primitivas de layout/chrome** — decisión de arquitectura
  abierta (2026-07-12). Los `calc(100% - 912px)` de `deck-signature.css` y el gradiente re-declarado en
  las 25 son la evidencia. Task hermana de `TASK-1393`, pendiente de ADR.
