# TASK-1800 — La capa que atrapa los defectos de UI es la única que nadie corre sola

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
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
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

**Ningún workflow del repo corre axe.** El chequeo de accesibilidad vive dentro del GVC
(`scripts/frontend/lib/quality.ts`) y sólo se ejecuta cuando alguien decide correr
`pnpm fe:capture` a mano. Esta task lo automatiza montándolo sobre `playwright.yml`, que **ya**
levanta la app y ya tiene sesión de agente — es decir, sin infraestructura nueva.

## Why This Task Exists

Medido el 2026-08-30 sobre los 20 workflows de `.github/workflows/`: **cero** invocan `fe:capture`,
`ui:visual-gate`, `ui:quality` ni axe de ninguna forma. `design-contract.yml` corre `design:lint`
(contrato de tokens, estático, no mira la página renderizada) y `playwright.yml` corre
`pnpm test:e2e` (smoke de navegación, sin accesibilidad).

El origen es concreto. En una sola sesión (`TASK-1693`) aparecieron **tres defectos reales de UI y
el lint estuvo verde en los tres**:

| Defecto | Quién lo atrapó | ¿Automatizado? |
|---|---|---|
| `aria-label` que rompía *label in name* (WCAG 2.5.3) | la skill de UX writing, antes de renderizar | ✅ pero depende de invocar la skill |
| Un contrato de diseño que afirmaba una live region habiendo dos | un test | ✅ CI |
| `opacity: 0.75` sobre texto → **3.14:1** contra 4.5:1 exigido | **axe, dentro del GVC** | ❌ **sólo si alguien captura** |

🔴 **El tercero se habría ido a producción con todo verde.** Y el primero también: `label-in-name`
es una regla que axe cubre bajo el tag `wcag21a` —ya presente en `DEFAULT_AXE_TAGS`—, así que
habría sido detectada por la misma corrida que nunca ocurre automáticamente.

O sea: de las cuatro capas del harness (lint → tests → axe/GVC → runtime), **la que mejor ve los
defectos de UI es la única que no tiene disparador propio**.

## Goal

- Un PR que introduce una violación de accesibilidad en una ruta cubierta **se pone rojo solo**,
  sin que nadie haya decidido capturar.
- El gate arranca **acotado y sin ruido**: si es amplio y ruidoso, alguien lo desactiva y volvemos
  al punto de partida con una falsa sensación de cobertura.
- La cobertura queda **declarada y legible**: se sabe qué rutas protege y cuáles no.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` — el GVC y su gate de accesibilidad.
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` — el estándar que este gate defiende.
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` §Agent Auth — la sesión headless que
  `playwright.yml` ya usa.
- `CLAUDE.md` §GitHub Actions workflows — orden canónico `pnpm/action-setup` antes de `setup-node`.

## Normative Docs

- `scripts/frontend/lib/quality.ts` — `analyzeAccessibility` y `DEFAULT_AXE_TAGS`
  (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa`). **La configuración de tags ya
  está decidida; esta task no la re-litiga, la reusa.**
- `.github/workflows/playwright.yml` — el job que ya levanta la app con sesión de agente.
- `tests/e2e/smoke/` — el contrato de navegación de smoke, incluido `gotoWithTransientRetries`.

## Dependencies & Impact

### Depends on

- `playwright.yml` y su setup de agente (`scripts/playwright-auth-setup.mjs`) — **ya existen**;
  esta task los reusa en vez de montar un runner nuevo.
- `AGENT_AUTH_SECRET` disponible en el workflow `[verificar que ya esté como secret del repo]`.

### Blocks / Impacts

- `TASK-1055` (matriz `riesgo → evidencia → gate`) — **complementaria, no duplicada**. 1055 produce
  el contrato que dice qué evidencia protege qué superficie; ésta cablea **una** de esas evidencias.
  Si 1055 aterriza antes, esta task es una de sus primeras remediaciones; si aterriza después,
  hereda este gate como celda ya poblada de la matriz. Coordinar el nombre del gate.
- Cualquier task de UI futura: gana una red que hoy depende de que el agente se acuerde de capturar.

### Files owned

- `.github/workflows/playwright.yml`
- `tests/e2e/smoke/` — el spec de accesibilidad `[nombre exacto a definir en Discovery]`
- `scripts/ci/` — el reporte/baseline si el Slice 2 lo necesita
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` (delta: qué corre en CI y qué no)

## Current Repo State

### Already exists

- `analyzeAccessibility` en `scripts/frontend/lib/quality.ts`: `AxeBuilder` con `withTags`,
  `include(selector)`, y emisión de findings `axe_violations` con el detalle serializado a
  `frames/*.axe.json`. **Funciona: es lo que atrapó el `color-contrast` de 3.14:1.**
- `playwright.yml` con la app levantada y `pnpm test:e2e` corriendo con `storageState` de agente.
- `@axe-core/playwright` ya en dependencias (lo usa el GVC y `globe-share-board-canary.mjs`).
- El contrato de navegación de smoke (`gotoWithTransientRetries` / `gotoAuthenticated`).

### Gap

- Ningún workflow invoca axe. La cobertura de accesibilidad depende 100% de que un agente corra
  `pnpm fe:capture` por decisión propia.
- No existe una lista declarada de rutas cuya accesibilidad esté protegida.
- No existe baseline de violaciones preexistentes, así que hoy no se sabe cuántas hay ni dónde —
  y sin eso, prender un gate amplio lo pondría rojo el día 1 por deuda ajena al PR.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `.github/workflows/playwright.yml` + `tests/e2e/smoke/`
- Future candidate home: `portal`
- Boundary: el gate consume la app desplegada por el propio job; no toca `src/lib/**`, ni
  PostgreSQL, ni proveedores externos.
- Server/browser split: N/A — es tooling de CI.
- Build impact: `none`; `@axe-core/playwright` ya está instalado.
- Extraction blocker: `none`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Medir la deuda antes de prender nada

- Correr axe sobre las rutas del smoke y **publicar el inventario**: cuántas violaciones hay, de qué
  reglas, en qué rutas. Sin gate todavía.
- 🔴 **Este slice es obligatorio y va primero.** Prender un gate sin saber la deuda lo pone rojo el
  día 1 por defectos ajenos al PR, y la reacción previsible es desactivarlo — quedaríamos peor que
  hoy, porque además habría un gate que nadie mira.

### Slice 2 — Gate acotado, con cobertura declarada

- Spec de accesibilidad en `tests/e2e/smoke/` que corre axe sobre una **lista explícita de rutas**,
  con los mismos tags que ya usa el GVC (`DEFAULT_AXE_TAGS`). No se inventa configuración nueva.
- La deuda preexistente del Slice 1 se declara —baseline o allowlist por regla/ruta— **con fecha y
  dueño**, nunca como silencio permanente.
- Falla el job ante una violación **nueva**; la preexistente declarada no rompe.
- La lista de rutas protegidas queda visible en el repo, no enterrada en el YAML.

### Slice 3 — Cerrar el lazo con lo que ya existe

- Delta en `GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`: qué accesibilidad corre en CI y qué sigue
  siendo exclusiva del GVC premium (viewports, scroll-width, teclado, rúbrica enterprise).
- Nota en el harness de UI para que un agente sepa que el gate existe y qué NO cubre.

## Out of Scope

- Portar el GVC completo a CI. Necesita Spaces con datos, corridas materializadas y capturas
  pesadas; su valor está en la revisión visual con humano, no en un check por PR.
- Los otros gates del GVC: scroll-width, teclado, performance, rúbrica enterprise. Son otra decisión.
- Arreglar la deuda que el Slice 1 encuentre. **Medirla y declararla sí; arreglarla es otra task** —
  mezclarlas convierte un cambio de tooling en una remediación de alcance desconocido.
- Cambiar `DEFAULT_AXE_TAGS`.

## Detailed Spec

El insight de secuencia, que es lo que evita que esto termine desactivado: **primero se mide, después
se prende.** Un gate de accesibilidad que nace rojo por deuda histórica no protege nada; enseña a
ignorarlo.

Y una consecuencia útil aguas abajo: hoy `greenhouse/no-opacity-on-text` está en `warn` con **26
ocurrencias legacy** en `src/`. Esa regla marca una *práctica*, no un ratio medido. Con axe corriendo
en CI se sabrá **cuáles de las 26 fallan de verdad** 4.5:1 — y el barrido se hace sobre esas, no
sobre las 26 a ciegas. Por eso ese barrido es follow-up de esta task y no al revés.

## Rollout Plan & Risk Matrix

Cambio de tooling de CI. No toca runtime de producción, no gasta, no migra datos. El riesgo es de
**adopción**, no de infraestructura: un gate ruidoso se desactiva y deja una falsa sensación de
cobertura, que es peor que no tenerlo.

### Slice ordering hard rule

- Slice 1 (medir) → Slice 2 (gate) → Slice 3 (docs).
- 🔴 **Slice 2 NO empieza sin el inventario del Slice 1.** Es la regla load-bearing de esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El gate nace rojo por deuda histórica y alguien lo desactiva | CI / adopción | **high** | Slice 1 obligatorio antes del gate; baseline declarada con fecha y dueño | Un PR que agrega `continue-on-error` o saca el step |
| La allowlist se vuelve un basurero permanente | gobernanza | **high** | Cada entrada lleva fecha y dueño; el Slice 3 lo declara en la arquitectura | Entradas sin dueño o más viejas que un trimestre |
| Falsos rojos por flakiness de navegación | CI | medium | Reusar `gotoWithTransientRetries` del contrato de smoke, no `page.goto` crudo | Rojos que pasan al reintentar sin cambio de código |
| El job se alarga y molesta en cada PR | CI / costo | medium | Lista acotada de rutas; medir el delta de duración en el Slice 2 | Duración del workflow fuera de patrón |
| Se cree que esto reemplaza al GVC | gobernanza | medium | Slice 3 declara explícito qué NO cubre | Una task de UI que cierra sin evidencia GVC «porque CI ya chequea a11y» |

### Feature flags / cutover

Sin flag de runtime. El cutover es el propio orden de slices: el Slice 1 no bloquea nada y el Slice 2
prende el gate recién con la deuda declarada. Revert: sacar el step del workflow, < 5 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | ninguno necesario: sólo mide y reporta | — | sí |
| Slice 2 | revert del PR o quitar el step del workflow | < 5 min | sí |
| Slice 3 | revert docs | < 5 min | sí |

### Production verification sequence

1. Slice 1 en una rama: correr y publicar el inventario de violaciones.
2. Revisar el inventario con el operador antes de elegir el alcance del gate.
3. Slice 2 en una rama: verificar que el job **falla** con una violación introducida a propósito y
   **pasa** con la deuda declarada.
4. Merge a `develop` y observar dos o tres PRs reales antes de ampliar la lista de rutas.

### Out-of-band coordination required

`N/A — repo-only change`, salvo que `AGENT_AUTH_SECRET` no esté ya disponible en el workflow; en ese
caso es configuración de secrets del repo y la hace el operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un inventario publicado de violaciones de accesibilidad por regla y por ruta, producido
      **antes** de prender ningún gate.
- [ ] Un PR que introduce una violación en una ruta cubierta pone el job en rojo, verificado
      introduciendo una a propósito.
- [ ] La deuda preexistente está declarada con **fecha y dueño**, no silenciada.
- [ ] La lista de rutas protegidas es legible en el repo, no sólo dentro del YAML.
- [ ] El gate usa `DEFAULT_AXE_TAGS`; no se inventa configuración paralela.
- [ ] El spec usa el contrato de navegación de smoke, nunca `page.goto` crudo.
- [ ] El workflow respeta el orden canónico `pnpm/action-setup` antes de `actions/setup-node`.
- [ ] Está declarado en la arquitectura qué accesibilidad corre en CI y qué sigue siendo exclusiva
      del GVC premium.
- [ ] El delta de duración del workflow está medido y declarado.

## Verification

- `pnpm local:check` (lint + tsc)
- Corrida del workflow en rama, con y sin violación introducida a propósito
- `pnpm test:e2e` local sobre el spec nuevo
- `pnpm task:lint --task TASK-1800` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- **Barrido de las 26 ocurrencias de `greenhouse/no-opacity-on-text`** y promoción de `warn` a
  `error`. Va **después** de esta task a propósito: con axe en CI se sabe cuáles fallan de verdad
  4.5:1 y cuáles son práctica mejorable pero con contraste suficiente.
- Evaluar si los otros gates del GVC (scroll-width, teclado) merecen el mismo tratamiento, con el
  mismo orden: medir, declarar, prender.
- Coordinar con `TASK-1055` para que este gate quede como celda poblada de su matriz
  `riesgo → evidencia → gate`.

## Open Questions

- ¿Qué rutas entran en la primera lista? La respuesta razonable es «las que el smoke ya visita», pero
  conviene confirmarlo con el inventario del Slice 1 en la mano, no antes.
