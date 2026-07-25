# TASK-1561 — Gate de diseño de Globe: tipografía y cobertura de la frontera

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Status real: `Listo para tomar`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `ninguna`
- Branch: `task/TASK-1561-globe-design-gate-typography-hardening`
- GitHub Issue: `TBD`

## Summary

Extiende el gate de contrato de diseño de `apps/studio-client` para que atrape **literales de
tipografía** — hoy sólo escanea color, motion y copy. Y agrega el ejercicio que ningún gate se hace a
sí mismo: **morderlo**. Introducir una violación de cada clase, confirmar el rojo, restaurar.

## Why This Task Exists

El gate de color funcionó tan bien que **expuso su propio agujero**. Al portar la tipografía, la sesión
de `TASK-1558` encontró que `producer-ui.ts` declara `font-family:Poppins` y `font-family:Geist` como
literales en cuatro lugares, y **nada lo detuvo**. Lo dejó escrito en el SSOT:

> *"That is the same shape of failure that produced 63 unrepeatable colours, one step behind."*

Es exactamente el mismo fallo, una dimensión atrás. Un gate que cubre tres de cuatro dimensiones de
un contrato **no protege el contrato**: protege tres cuartos de él, y el cuarto restante es por donde
entra la deriva. La tipografía es peor que el color en un aspecto: un peso que no existe se
**sintetiza** — el browser deforma las letras sin fallar nada, y pasa todos los gates.

Hay un segundo agujero, de otra naturaleza: **el gate sólo escanea `studio-client`**. La frontera está
en el lugar equivocado — es la frontera de un *paquete*, no la de una *responsabilidad*.

## Goal

- El gate atrapa `font-family`, `font-weight` y `font-size` literales en el código del payload.
- Cada clase del gate está **verificada mordiendo**, no asumida.
- La frontera del gate queda declarada explícitamente y con razón escrita, para que `TASK-1560` la
  extienda a `studio-web` sin re-decidir.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md` — ADR-014, el gate
  como parte del sustrato.
- `docs/operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md` — los seis gates y su contrato.

Reglas obligatorias:

- **NUNCA** agregar una regla al gate sin morderla: una regla no ejercitada es una regla que se cree
  activa. El caso fuente es del mismo programa — el plugin de React Compiler typechequeaba, buildeaba y
  **no corría**, y sólo lo delató comparar dos bundles.
- **NUNCA** permitir un peso tipográfico sin archivo cargado: el browser lo sintetiza en silencio.

## Normative Docs

- `apps/studio-client/src/gates/design-contract.test.ts` — el gate vigente.
- `apps/studio-client/src/tokens/tokens.ts` — el SSOT, incluidos `--font-display`, `--font-body`,
  la escala tipográfica y `GLOBE_FONT_FACES`.

## Dependencies & Impact

### Depends on

`TASK-1556` (complete) — el gate y el SSOT existen. Nada más.

### Blocks / Impacts

- **`TASK-1560`** hereda estas reglas cuando amplía el gate a `studio-web`. Si esta task no corre
  primero, ese Slice extiende un gate que todavía no cubre tipografía.
- Cualquier superficie en vuelo (`TASK-1552`, `TASK-1558`, `TASK-1559`) queda protegida al portar.

### Files owned

- `apps/studio-client/src/gates/design-contract.test.ts`
- `docs/operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md`

## Current Repo State

### Already exists

- El gate con tres escaneos: literales de color, de motion, y de copy en JSX (incluidos
  `aria-label`/`title`/`placeholder`/`alt`).
- El SSOT con los tokens tipográficos ya definidos: familias, escala, pesos, line-heights, tracking.
- `GLOBE_FONT_FACES`, la lista cerrada de los tres archivos realmente cargados.

### Gap

- Ninguna regla de tipografía.
- Ninguna regla ha sido **ejercitada** contra una violación real.
- La frontera del gate no está declarada — es implícita, y una frontera implícita se mueve sola.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/studio-client/src/gates`
- Future candidate home: `remain-shared`
- Boundary: el gate escanea fuente y no ejecuta la aplicación; corre con `node --test`, igual que el resto de las pruebas del repo.
- Server/browser split: `N/A` — corre en build/CI.
- Build impact: `none`
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Regla de tipografía

Escanear el código del payload buscando:

- `font-family` con un valor que no sea `var(--font-…)`.
- `font-weight` numérico literal fuera del SSOT, y **cualquier** peso que no tenga archivo en
  `GLOBE_FONT_FACES`. Este segundo caso es el importante: un `600` de Poppins **no existe** y el
  browser lo sintetiza deformando las letras, sin error.
- `font-size` en `px`/`rem` literal fuera del SSOT.

El mensaje de error nombra el token correcto, no sólo la infracción. Un gate que dice "no hagas esto"
cuesta una búsqueda; uno que dice "usá `var(--text-base)`" cuesta cero.

### Slice 2 — Morder cada regla

Para **cada** clase del gate (las tres vigentes + las nuevas): introducir una violación real,
correr el gate, confirmar rojo con el mensaje esperado, restaurar. Dejar el resultado escrito en el
runbook — es la única evidencia de que el gate corre y no sólo compila.

### Slice 3 — Declarar la frontera

Documentar en el propio gate **qué escanea y por qué**, y dejar anotado que `TASK-1560` la extiende a
`studio-web` una vez retirado el legacy (hoy saldría rojo por los archivos que están por borrarse).

## Out of Scope

- Extender el gate a `studio-web` — es de `TASK-1560`, y hoy sería rojo por construcción.
- Cambiar valores de token.
- Portar superficies.

## Detailed Spec

Sigue la forma del gate vigente: escaneo de fuente con `node --test`, sin ejecutar la app. La única
decisión no obvia es **la lista de pesos permitidos**, que se deriva de `GLOBE_FONT_FACES` en lugar de
escribirse a mano — así, agregar un archivo de fuente habilita su peso automáticamente, y quitarlo lo
prohíbe. Una lista escrita a mano sería un segundo lugar donde la verdad puede divergir, que es
exactamente lo que este gate existe para impedir.

⚠️ **Coordinación:** al momento de crear esta task hay una sesión trabajando `TASK-1558` con cambios
sin commitear en `src/copy/`, `src/tokens/`, `src/data/` y `src/primitives/`. Antes de endurecer el
gate, verificar que el código en vuelo lo pasa; si no, coordinar en vez de dejarle el build en rojo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 2 (morder) **no es opcional ni posterior al cierre**. Una regla no ejercitada no cuenta como
entregada — es la lección del plugin que typechequeaba y no corría.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La regla no corre y se cree activa | Gate | **medium** | Slice 2: morder cada clase | Un literal obvio pasando limpio |
| Falso positivo bloquea trabajo legítimo | DX | medium | Morder con casos límite; mensajes que nombran el token | Un autor comentando el gate para avanzar |
| Rompe el trabajo en vuelo de `TASK-1558` | Colaboración | **medium** | Verificar contra el WIP antes de endurecer | `pnpm check` rojo en la otra sesión |

### Feature flags / cutover

`N/A — gate de CI, sin runtime de producción.`

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-3 | Revert PR | <5 min | sí |

### Production verification sequence

`N/A — no toca runtime de producción.` La verificación es el Slice 2.

### Out-of-band coordination required

Coordinar con la sesión de `TASK-1558` antes de endurecer (ver Detailed Spec).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El gate atrapa `font-family` literal.
- [ ] El gate atrapa un peso sin archivo en `GLOBE_FONT_FACES` (el caso de la síntesis silenciosa).
- [ ] El gate atrapa `font-size` literal fuera del SSOT.
- [ ] La lista de pesos permitidos se **deriva** de `GLOBE_FONT_FACES`, no está escrita a mano.
- [ ] Cada clase del gate fue mordida: violación → rojo → restaurar, con el resultado escrito.
- [ ] Los mensajes de error nombran el token correcto.
- [ ] La frontera del gate está declarada en el archivo, con su razón.
- [ ] `pnpm check` y `pnpm build` verdes; el WIP de `TASK-1558` no queda en rojo.
- [ ] Runbook de gates actualizado.

## Verification

`pnpm check` · `pnpm build` · el ejercicio de morder del Slice 2.

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] Runbook de gates actualizado
- [ ] `Handoff.md`
- [ ] `TASK-1560` notificada: hereda estas reglas al extender a `studio-web`
- [ ] chequeo de impacto cruzado

## Follow-ups

- `TASK-1560` Slice 2 — extender la frontera a `studio-web` tras el retiro del legacy.

## Open Questions

- Ninguna.
