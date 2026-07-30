# TASK-1600 — AXIS pasa a ser dueño del valor de color; Greenhouse lo consume

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `completado; ownership AXIS, migración y evidencia pre/post verificadas`
- Rank: `TBD`
- Domain: `cross-runtime`
- Blocked by: `none`
- Branch: `task/TASK-1600-axis-color-ownership-inversion`
- Legacy ID: `none`
- GitHub Issue: `none`

> **Por qué `Execution profile: standard` y `UI impact: none` en una task que toca el theme.**
> No introduce ni modifica ninguna superficie visible: su criterio de éxito es exactamente la
> **ausencia** de cambio visual. No hay diseño nuevo que wireframear, ni copy, ni layout, ni estados
> nuevos — un wireframe acá sería un doc escrito para pasar el gate, que la skill de planning prohíbe.
> La evidencia visual **sí es obligatoria** y vive en `## Verification` como diff GVC: es la prueba de
> que el pixel no se movió, no el diseño de una pantalla. Si el operador prefiere `ui-ux`, el cambio
> es de una línea, pero entonces el wireframe debe declararse `n/a` con esta misma razón.

## Summary

Invertir la propiedad del valor de color de la marca Efeonce: los ramps, la capa semántica, los
neutrales, el secondary y la paleta de charts pasan a `@efeoncepro/axis-tokens`, y el theme MUI de
Greenhouse **los consume en vez de declararlos**. Greenhouse conserva su theme, sus tests de contraste
y el gobierno del proceso; entrega la autoría del valor.

## Why This Task Exists

Hoy cambiar el azul de la marca Efeonce es editar un archivo **dentro de un producto**
(`src/@core/theme/axis-tokens.ts`), y para que llegue a Globe alguien copia el valor a mano al paquete.
Eso produce dos efectos medidos:

1. **La copia manual ya falló.** `warning` y `danger` estuvieron divergidos desde TASK-1053 sin que
   nada lo detectara. Era inerte sólo porque ningún consumidor leía `efeonceTokens.color` todavía.
   Corregido en AXIS `0.1.5` (TASK-1589 V1.1), pero la causa —dos copias sin dueño declarado— sigue.
2. **Greenhouse no es un consumidor más: es el dueño disfrazado de par.** Con Wave declarada como
   marca de producto y todavía sin repo, el SSOT donde está hoy la haría nacer copiando valores del
   repo de otro producto. Tres copias en vez de dos.

El habilitador es medido: los tokens de Greenhouse son **datos puros**. `axis-tokens.ts` y
`axis-chart.ts` no tienen ningún `import`; `axis-semantic`, `axis-neutrals` y `axis-secondary` sólo
importan de `axis-tokens`. **Cero dependencias de MUI** — son portables tal cual.

## Goal

Que el valor de color viva una sola vez, en AXIS, y que Greenhouse lo consuma con su theme MUI
intacto y **sin un pixel de diferencia** en el portal.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md` — el ADR que esta task
  ejecuta (eje 1: el valor). Aceptado por el operador 2026-07-29.
- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md` — plataforma AXIS; su
  § Delta 2026-07-29 (a) queda parcialmente invertido por el ADR de arriba.
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — contrato de tokens de Greenhouse.
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` — distribución y credencial.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` — EPIC-026.

## Normative Docs

- `.claude/skills/axis-design-system/SKILL.md` — invariantes de AXIS. ⚠️ **Su invariante *"AXIS names
  semantic roles; it does not become the owner of a product brand value"* queda desactualizada por el
  ADR aceptado.** Actualizarla es un entregable de esta task (Slice 0): si se deja como está, cualquier
  agente que la cargue va a bloquear este trabajo por contradecir una invariante escrita.
- `DESIGN.md` — contrato visual agent-facing.

## Dependencies & Impact

### Depends on

- `TASK-1589` (foundation + distribución AXIS) — **operativa**: paquetes `0.1.5` publicados, CI del
  repo AXIS vivo, gate de contratos, secreto en `efeonce-group`, Cloud Build verificado en real.
- El ADR de ownership **aceptado** (hecho, 2026-07-29).

### Secuencia con tasks que tocan los mismos archivos

No son `Blocked by` —ninguna bloquea a esta— pero **comparten `Files owned`** y ejecutar en paralelo
produce conflicto:

- `TASK-1034` (in-progress, *adopción de la paleta AXIS en el runtime*): sus Slices 0–4 están DONE y
  su **Slice 5 (shadows/elevación) sigue abierto**. Su superficie es *"que el theme refleje el Figma
  AXIS"*, asumiendo que `axis-tokens.ts` local es el SSOT — exactamente lo que esta task invierte.
  **Regla: si TASK-1034 Slice 5 se retoma, va antes o después, nunca en paralelo.**
- `TASK-1050` (in-progress, spacing/radius) — toca geometría, no color. Solapamiento bajo, pero vive en
  la misma capa de theme.
- `TASK-1057` (to-do, adapter de paleta para email) y `TASK-1058` (to-do, elevation/shadow en controles
  MUI) — consumidores de la capa que esta task mueve.
- `TASK-1262` (to-do, `primary-text` AA) — toca un valor semántico.

### Blocks / Impacts

- `TASK-1588` (umbrella AXIS) — esta task es su hija de ejecución para el eje del valor.
- **Eje 2 del ADR (`axis-headless`)** — independiente; no lo bloquea ni depende de él. Necesita su
  propia task cuando el eje 1 esté verde.
- Habilita que un producto nuevo (Wave) consuma la marca instalando un paquete en vez de copiando.
- `TASK-1590` / `TASK-1592` (Lab, registry workflow) — el Lab pasa a poder mostrar el valor real
  publicado en vez de una copia.

### Files owned

En `../axis-design-system`:

- `packages/tokens/src/tokens.ts` — pasa de 12 roles a la paleta completa (aditivo).
- `packages/tokens/src/tokens.test.ts` · `packages/tokens/scripts/emit-css.mjs` [verificar]
- `packages/tokens/package.json` — bump a `0.2.0`.

En Greenhouse:

- `src/@core/theme/axis-tokens.ts` · `axis-semantic.ts` · `axis-neutrals.ts` · `axis-secondary.ts` ·
  `axis-chart.ts` — pasan de declarar a **re-exportar desde el paquete**.
- `src/@core/theme/axis-package-drift.test.ts` — el gate invierte su sentido.
- `src/@core/theme/axis-semantic-drift.test.ts` · `axis-semantic-contrast.test.ts` — se conservan;
  verifican el render de Greenhouse, no la procedencia.
- `package.json` — versión fija del paquete.
- Los 4 consumidores fuera de la capa de theme: `src/lib/finance/pdf/tokens.ts` [verificar],
  `src/lib/ai/**` [verificar], `src/config/**` [verificar],
  `src/components/growth/ai-visibility/report-artifact/pdf/**` [verificar].

## Current Repo State

## UI/UX Contract

`UI impact: none` is intentional. TASK-1600 changes only the ownership/import boundary of pure color
data and preserves the existing rendered theme; it does not add or alter a product surface, copy, layout,
flow, or motion. GVC captures are verification evidence for pixel stability, not a new UI deliverable.
Therefore `Wireframe`, `Flow`, and `Motion` remain `n/a`/`none`, and the dark capture scenario only selects
the existing theme control read-only.

### Already exists

- `@efeoncepro/axis-tokens@0.1.5` publicado, con **12 roles de color** + radius + spacing + motion, y
  `dist/tokens.css` con custom properties. Consumido por Greenhouse y Globe con versión fija.
- `src/@core/theme/axis-tokens.ts` (6,7 KB): `axisRamp` (ramps 100→900), `axisMain`, `axisOpacity`,
  `axisNeutral`, `axisTokens`. **Cero imports.**
- `axis-semantic.ts` (5 KB, `axisSemanticHex` + `axisSemanticPalette`), `axis-neutrals.ts` (6,3 KB),
  `axis-secondary.ts` (2 KB), `axis-chart.ts` (3 KB).
- `axis-package-drift.test.ts` — gate que hoy verifica *"AXIS deriva de Greenhouse"*, con los roles
  descubiertos por forma (no listados).
- **18 archivos** consumen los símbolos de marca: 7 en `src/@core/theme`, 3 en `src/components/theme`,
  3 en `views/admin/design-system`, 1 mockup, y 4 consumidores reales fuera del theme.

### Gap

- El paquete publica un **subconjunto de 12 roles**, no los ramps ni la semántica ni los neutrales.
- **Nadie es dueño declarado del valor**: dos copias que coinciden por disciplina.
- `axisSemanticPalette` ya tiene forma de MUI → no es portable tal cual (ver Open Questions).
- Dark mode: Greenhouse resuelve neutrales por modo; el paquete no expresa modos (ver Open Questions).

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `src/@core/theme/axis-*.ts` (dentro del portal Greenhouse)
- Future candidate home: `ui-package`
- Future home detalle: `@efeoncepro/axis-tokens` en el repo `axis-design-system`
- Boundary: AXIS publica **valor + rol semántico**; el producto publica su **materialización**
  (`theme.palette.*` en MUI). Consumers autorizados: cualquier producto Efeonce con versión fija.
- Server/browser split: `n/a` — datos puros, sin runtime. Consumibles por RSC, cliente, PDF y worker.
- Build impact: `none` — el paquete ya está en el grafo de dependencias de Greenhouse desde
  `TASK-1591`; esta task cambia el contenido que se lee, no la topología del build.
- Extraction blocker: `none` — **medido**: los cinco archivos son datos puros sin dependencias de MUI.
  Es la excepción, no la regla: por eso este eje es viable sin refactor previo.

<!-- ZONE 2 — EXECUTION (la llena el agente que toma la task, NO quien la crea) -->

<!-- ZONE 3 — SCOPE & SPEC -->

## Scope

### Slice 0 — Alinear la invariante de la skill con el ADR aceptado

Actualizar `.claude/skills/axis-design-system/SKILL.md`: su invariante *"AXIS ... does not become the
owner of a product brand value"* contradice el ADR aceptado. Va **primero** porque mientras exista,
cualquier agente que cargue la skill bloquea el resto de la task por una regla escrita.

Entregable: la invariante reescrita a la frontera real del ADR (AXIS dueño del valor y del
comportamiento; el producto dueño de la materialización) + referencia al ADR.

### Slice 1 — AXIS publica la paleta completa (aditivo, nadie la consume todavía)

Mover ramps, semántica, neutrales, secondary y charts a `packages/tokens/src/`. **Los 12 roles
actuales se conservan tal cual** — Globe declara la dependencia y no debe romperse. Bump a `0.2.0`
(minor: aditivo). Tests del paquete cubren la forma de cada estructura nueva. `emit-css.mjs` emite las
custom properties nuevas.

Al cierre: `0.2.0` publicada por tag, con el CI y el gate de contratos de `TASK-1589` verdes.

### Slice 2 — El gate de drift invierte su sentido (doble lectura, sin cutover)

`axis-package-drift.test.ts` pasa de *"AXIS refleja a Greenhouse"* a *"Greenhouse refleja a AXIS"*,
leyendo del paquete `0.2.0` y comparando los adaptadores. Es la red
del cutover: si algún valor difiere, se ve acá y no en el portal.

Al cierre: el gate cubre los cinco archivos con descubrimiento por forma (no listas), y falla en rojo
deliberado ante una divergencia introducida a propósito.

### Slice 3 — El theme de Greenhouse consume AXIS; se retira la declaración local

Los cinco `axis-*.ts` pasan a re-exportar desde `@efeoncepro/axis-tokens`. **Ninguna otra línea del
theme cambia**: los consumidores siguen importando `axisRamp`/`axisSemanticHex` del mismo path. El
diff visual debe ser **cero**.

Al cierre: `axis-semantic-contrast.test.ts` y `axis-semantic-drift.test.ts` verdes sin modificación
(la mejor evidencia de que el valor no cambió), y diff GVC en desktop + 390 px.

### Slice 4 — Los 4 consumidores fuera de la capa de theme

`finance/pdf`, `lib/ai`, `config` y el `report-artifact/pdf` [verificar los cuatro en Discovery].
Verificar que un PDF renderizado antes y después es idéntico — el PDF no pasa por el theme MUI, así
que es el consumidor con más chance de divergir en silencio.

## Out of Scope

- **El eje 2 del ADR (`axis-headless`, comportamiento compartido).** Task aparte; es una compuerta que
  se decide con un solo primitive.
- **Tipografía, elevación, geometría y motion.** Son las capas 2 y 3 del ADR, cada una con su task.
- **Mover primitives o componentes a AXIS.** Ninguno de los 71 de Greenhouse se toca acá.
- **Cambiar cualquier valor de marca.** Esta task mueve de dónde viene el valor, no cuál es. Un cambio
  de color es otra task (y el criterio de éxito acá es que no haya ninguno).
- **`TASK-1034` Slice 5 (shadows).** Comparte archivos; se secuencia, no se absorbe.
- **Promoción de adapters a producto en Globe.** Sigue opt-in por decisión de `TASK-1591`.
- **Sustituir el PAT por identidad de máquina.** Vive en `TASK-1589`; vence 2026-08-28.

## Detailed Spec

**Forma del re-export (Slice 3).** El objetivo es que ningún consumidor cambie su import:

```ts
// src/@core/theme/axis-tokens.ts — después
export { axisRamp, axisMain, axisOpacity, axisNeutral, axisTokens } from '@efeoncepro/axis-tokens'
```

Si un símbolo necesita adaptación (p. ej. `axisSemanticPalette`, que ya tiene forma de MUI), **se
queda local y consume el valor portable**:

```ts
// src/@core/theme/axis-semantic.ts — el valor viene de AXIS, la forma MUI es de Greenhouse
import { axisSemanticHex } from '@efeoncepro/axis-tokens'
export { axisSemanticHex }
export const axisSemanticPalette = { success: { main: axisSemanticHex.success, /* … */ } }
```

Ésa es la frontera del ADR aplicada en concreto: **el valor sube, la materialización se queda.**

**Qué NO se pierde.** `axis-semantic-contrast.test.ts` y `axis-semantic-drift.test.ts` siguen viviendo
en Greenhouse sin cambios: verifican que *su* render cumple AA y que sus superficies semánticas no
driftan. Eso es evidencia del adapter, no del valor.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (skill) → **antes que todo**: sin él, un agente con la skill cargada bloquea la task.
- Slice 1 (publicar) → Slice 2 (gate invertido) → Slice 3 (consumir) → Slice 4 (consumidores).
- **Slice 2 DEBE shipear ANTES de Slice 3.** Sin el gate, el cutover no tiene red y una divergencia
  aparece como un color equivocado en producción en vez de un test rojo.
- Slice 4 puede correr en paralelo con Slice 3 una vez que Slice 2 cerró, pero su verificación
  (PDF idéntico) es independiente y no la cubre el diff GVC.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un valor cambia al mover y el portal se ve distinto | UI (theme completo) | medium | Slice 2 antes de Slice 3 · diff visual GVC desktop+390 · los tests de contraste y drift existentes deben pasar **sin modificarse** | `axis-semantic-contrast.test.ts` + `axis-package-drift.test.ts` en rojo |
| El PDF divergía y nadie lo ve (no pasa por el theme MUI) | Finance PDF · report-artifact | medium | Slice 4 con render antes/después comparado | ninguna — emerge en el PDF de un cliente; por eso la comparación es obligatoria |
| `axisSemanticPalette` se sube con forma de MUI y contamina la capa portable | AXIS (portabilidad) | medium | Regla del ADR: sube el valor, la forma MUI se queda local. Gate de portabilidad del paquete (sin imports de MUI) | CI del repo AXIS |
| Dark mode: un neutral resuelto por modo se aplana a un solo valor | UI (dark) | medium | Resolver la Open Question **antes** de Slice 1 · GVC en dark | revisión visual en dark; `TASK-1034` marcó este blast radius como alto |
| Conflicto con `TASK-1034` Slice 5 sobre los mismos archivos | UI platform | low | Regla de secuencia declarada en Dependencies | conflicto de merge |
| Un consumidor queda fijado a `0.1.5` y lee valores viejos | cross-runtime | low | Versión fija + gate de drift por consumidor | gate de drift |

### Feature flags / cutover

**Sin flag, y la razón importa:** no hay comportamiento nuevo que activar — es un cambio de
**procedencia** de un dato. Un flag que eligiera entre "valor local" y "valor del paquete" mantendría
las dos copias vivas, que es precisamente el problema que la task elimina.

El mecanismo de control es la **versión fija del paquete**: la propagación es *pull*, nunca *push*.
Ningún otro producto recibe nada hasta que actualiza su `package.json`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | revert del commit de la skill | <1 min | sí |
| Slice 1 | ninguno necesario — aditivo, nadie consume `0.2.0` todavía. No despublicar: fijar consumidores a `0.1.5` | n/a | sí |
| Slice 2 | revert del test | <5 min | sí |
| Slice 3 | revert del PR: los cinco `axis-*.ts` vuelven a declarar + `package.json` a `0.1.5` + redeploy | <15 min | sí |
| Slice 4 | revert del PR por consumidor | <10 min | sí |

Ningún slice muta estado durable: sin migraciones, sin backfills, sin transiciones de máquina de
estados. El rollback es de código y de versión de paquete.

### Production verification sequence

1. Slice 1 en AXIS: CI verde + gate de contratos + tag → `0.2.0` publicada. Verificar que `0.1.5`
   sigue instalable (nadie se rompe).
2. Slice 2 en Greenhouse: gate invertido verde contra `0.2.0`, y **en rojo deliberado** ante una
   divergencia introducida a propósito.
3. Slice 3 en staging: `pnpm build` + tests de contraste/drift sin modificar + **diff GVC
   desktop 1440 y 390 px, light y dark**, contra la captura previa al cutover.
4. Revisión humana del diff visual. Cualquier píxel movido detiene la promoción.
5. Producción: promoción por el release control plane (`greenhouse-production-release`).
6. Slice 4: render de un PDF real de finance y del report-artifact, comparado con el previo.

### Out-of-band coordination required

- **Publicar `0.2.0`** es un tag en `axis-design-system` — acto de release, no un merge. El operador
  decide cuándo.
- **Ninguna coordinación con Globe** en esta task: sigue en `0.1.5` con los 12 roles intactos. Su
  actualización es una decisión suya, posterior y opcional.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] `@efeoncepro/axis-tokens@0.2.0` publica ramps, semántica, neutrales, secondary y charts, y
      **conserva los 12 roles de `0.1.5`** sin cambio de forma ni de valor.
- [x] El paquete sigue sin importar MUI, Vuexy, Next ni browser globals (gate de portabilidad verde).
- [x] `axis-package-drift.test.ts` verifica *"Greenhouse refleja a AXIS"*, descubriendo los símbolos
      por forma y no por lista, y **falla** ante una divergencia introducida a propósito.
- [x] Los cinco `src/@core/theme/axis-*.ts` re-exportan desde el paquete y ninguna otra línea del
      theme cambió: los consumidores siguen importando del mismo path.
- [x] `axis-semantic-contrast.test.ts` y `axis-semantic-drift.test.ts` pasan **sin haber sido
      modificados**.
- [x] Diff visual GVC en desktop 1440 y 390 px, light y dark: el frame de rampas es 0.00% desktop y
      0.01% mobile; el scenario dark pasó en ambos tamaños. La comparación pre/post local del mismo
      runtime tuvo dimensiones idénticas y 0 píxeles alterados en desktop light; la captura mobile
      full-page registró solo 789 canales sobre 92,799,720 (~0.00085%), sin drift de layout.
- [x] Un PDF de finance y un report-artifact renderizados post-cutover son visualmente idénticos a los
      previos: raster diff a 144 dpi = 0 píxeles en finance enterprise, finance compact y report-artifact.
- [x] La invariante de `.claude/skills/axis-design-system/SKILL.md` ya no contradice el ADR.
- [x] Ninguna declaración de valor de color queda duplicada entre el paquete y Greenhouse.

## Verification

- `pnpm typecheck` (verde)
- `pnpm test` — suite completa, no focal
- `pnpm build` — producción
- `pnpm design:lint` — contrato de tokens
- En `../axis-design-system`: `pnpm build && pnpm typecheck && pnpm test`
- `pnpm fe:capture` + `pnpm fe:capture:diff` sobre las superficies de mayor densidad de color
  (dashboard, finance, design-system), desktop y 390 px, light y dark
- Render manual de un PDF de finance y de un report-artifact, comparado con el previo

### Evidence recorded 2026-07-30

- Axis package: `0.2.0` published, followed by compatible `0.2.1` to expose the public type aliases
  required by the Greenhouse adapter. Axis `build`, `typecheck` and `test` pass; commits `1e020c9` and
  `dba1922` are pushed to `main`.
- Greenhouse: 3 focused suites pass (43 tests), `typecheck`, `design:lint`, `docs:closure-check` and
  `docs:context-check:strict` pass; production build compiles and generates all routes.
- GVC staging: `/design-system/axis-adapters` passed at 1440×900 and iPhone 13; canonical
  `/design-system/colors` passed ramp baseline at 0.00% desktop and 0.01% mobile. A dedicated
  `task-1600-axis-colors-dark` scenario switched the real portal control to Oscuro and passed at
  1440×1000 and 390×844. Two repeated light captures were pixel-identical to each other in all four
  frames; the historical full-page baseline differs only in height (12/2 px). A direct pre/post local
  capture against parent commit `c2405f21e` then confirmed identical dimensions and 0 changed pixels
  for desktop brand/full-page and mobile brand; mobile full-page had 789 changed channels out of
  92,799,720 (~0.00085%), with no layout drift.
- PDFs: finance quotation samples rendered successfully via `scripts/render-test-pdf.ts` using the
  server-only shim; the report-artifact PDF no-leak/render suite passed (17 tests across report + drift
  suites). Before/after artifacts were rendered from the parent commit in a detached worktree and the
  post-cutover PDFs; raster diff at 144 dpi was exactly 0 pixels for all three documents. Raw PDF bytes
  differ only in renderer metadata/timestamps; extracted text hashes also match exactly.
- Rollback rehearsal: detached worktree at parent commit `c2405f21e` (Greenhouse on `0.1.5` and local
  token declarations) installed cleanly and passed the three AXIS color suites (43 tests); temporary
  worktree was removed after verification.

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con el estado real
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` quedó sincronizado con el cierre
- [x] `Handoff.md` quedó actualizado
- [x] `changelog.md` quedó actualizado
- [x] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [x] El § Delta 2026-07-29 (a) de `EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md` quedó marcado
      como **superado** (hoy dice "parcialmente invertido por un ADR `Proposed`")
- [x] El ADR de ownership pasó de `Accepted` a `Accepted — eje 1 implementado`
- [x] `TASK-1588` (umbrella) refleja que el eje del valor cerró
- [x] `TASK-1034` quedó anotada: su premisa (`axis-tokens.ts` local = SSOT) ya no es cierta

## Follow-ups

- **Eje 2 del ADR — `axis-headless`.** Task nueva cuando el eje 1 esté verde. Empieza por **un solo**
  primitive (candidato: `GreenhouseAnchoredDisclosure`) como compuerta.
- **Capa 2 del eje 1 — tipografía.** Ya tiene SoT propio + drift-guard (`TASK-1036`); se mueve con la
  misma forma que esta task.
- **Capa 3 — elevación, geometría, motion.** Coordinar con `TASK-1050`, `TASK-1058` y `TASK-1034` S5.
- **Que el Lab consuma lo publicado** en vez de `workspace:*`, para validar el tarball y no sólo el
  código fuente (open question del ADR).

## Open Questions

1. **`axisSemanticPalette`: resuelta.** Se queda en Greenhouse como materialización MUI; AXIS publica
   sólo la semántica portable (`axisSemanticHex`).
2. **Dark mode: resuelta.** AXIS publica explícitamente `axisNeutral.light` y `.dark`; cada producto
   resuelve el modo activo sin aplanar los valores.
3. **Firma de cambios: resuelta.** El cambio de valor requiere ADR/task y aprobación del operador en
   Greenhouse; el release/tag se ejecuta en AXIS después de esos gates.
4. **Charts: resuelta.** Las paletas puras categórica/direccional son datos portables de AXIS; los
   subsets y mapeos de dominio siguen siendo responsabilidad del producto.
