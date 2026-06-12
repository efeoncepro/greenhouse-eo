# TASK-1098 — GVC explore mode + scenario promotion (Capa 2/3)

## Delta 2026-06-12 — COMPLETE (shipped local, sin push)

Implementado y verificado e2e. `fe:capture:explore` + `fe:capture:promote` cierran el loop observe→author→determinismo.

- **`fe:capture:explore --route=X`** (`scripts/frontend/explore.ts` + `lib/explore.ts`): observa la página viva (read-only por construcción) y persiste en `.captures/_explore/<slug>/` → `session.json` + `aria.txt` + `snapshot.png`. Da: árbol de accesibilidad + `candidates[]` con `getByRole(...)` sugerido + **validación de uniqueness** (¿el locator resuelve a 1 nodo?) + bounding boxes + markers `data-capture`/`data-gvc-ready` + `--probe '<selector>'` (valida un locator Playwright). Reusa env/auth/bypass/browser de GVC. `enforceProductionGate` respetado.
- **`fe:capture:promote --route=X --name=<n>`** (`scripts/frontend/promote.ts` + `lib/promote.ts`): cristaliza la sesión en un `.scenario.ts` **válido** (gate `validateScenario`): readiness auto-elegido (marker `data-gvc-ready` > `data-capture` > heading único vía `role=heading[name="…"]`) + `mark` inicial + `scroll`+`mark` (clipSelector) por cada `--mark`. NUNCA `mutating`. Serializa con JSON (subset TS válido, sin inyección).
- **Guardrail mantenido:** el output durable es el DSL gobernado; explore/promote son **ayuda de autoría**, no runtime de producto; cero code-as-action.
- **Scope V1 — estático:** promote emite un baseline de `mark`s; **NO** auto-genera `interaction` steps (microinteracciones/coreografía). Eso sigue siendo autoría manual con el DSL `interaction` (V2) existente o `fe:capture:micro`. Un explore que *grabe* una interacción (probe → before/feedback/settled) queda como follow-up posible.
- **Verificado:** 16 tests focales (`lib/explore-promote.test.ts`) + tsc 0 + lint 0 + **e2e real**: `explore /coming-soon` → candidatos+probe → `promote` (scenario válido, readiness de heading único) → `fe:capture` OK 1 frame.
- **Wire:** `package.json` scripts `fe:capture:explore` + `fe:capture:promote`. Skill `greenhouse-gvc-playwright` + helper doc + DSL README actualizados.

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Complete 2026-06-12 — explore + promote shipped local (sin push). Verificado e2e. Microinteracciones fuera de scope V1 (DSL interaction existente).`
- Rank: `TBD`
- Domain: `tooling|frontend|dx`
- Blocked by: `none` (TASK-1097 Capa 1 ya en develop local)
- Branch: `task/TASK-1098-gvc-explore-mode`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar el loop **observe → author → determinismo** que `microsoft/webwright` modela, sobre GVC, sin romper su determinismo gobernado. TASK-1097 (Capa 1) ya le dio **ojos** a la captura (`aria_snapshot` por mark). Esta task agrega las dos capas restantes:

- **Capa 2 — `fe:capture --explore --route=X`**: un REPL de autoría contra la página viva. El agente navega, corre snippets de locators (`getByRole`/`getByText`), recibe de vuelta count matcheado + texto + bounding box + screenshot + el `aria_snapshot`, e itera — **sin commitear scenario**. Es el `spawn → inspect → discard` de Webwright aplicado a la **autoría**: descubrís selectores/readiness/scroll contra la página real y *después* escribís el scenario sabiendo que están bien. Reusa `lib/auth.ts` + `lib/browser.ts` (auth + lifecycle + gotchas ya resueltos).
- **Capa 3 — `fe:capture:promote`**: toma una sesión de exploración exitosa y **emite el `.scenario.ts` determinístico** (cristaliza improvisación → DSL gobernado).

## Why This Task Exists

La fricción de autoría que Claude/Codex tienen con Playwright es **autorar a ciegas**: escribir selectores adivinados sin ver la página. Capa 1 la mitigó (leés el `.aria.txt` post-captura). Capa 2/3 la elimina: un modo interactivo donde observás la página viva **antes** de comprometer un scenario, y luego promovés lo explorado al DSL. Es el patrón completo de Webwright, acotado a **ayuda de autoría** (no runtime de producto).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` (el helper que se extiende)
- `scripts/frontend/scenarios/_README.md` (el DSL que `promote` debe emitir)
- Skill `greenhouse-gvc-playwright` (el craft que el explore mode debe respetar)

## Guardrail (límite vs Webwright)

- El **output de GVC se queda determinístico y gobernado**: el script improvisado en explore **NUNCA** es la verificación commiteada — se destila al `.scenario.ts` (con sus quality gates, failure taxonomy, determinismo de baseline).
- `mutating`/`safeForCapture`/Triple-Gate **siguen enforced en explore** (read-only por default; nada de crear entidades reales en staging "explorando").
- NO se adopta el code-as-action en runtime de producto (Full API Parity + tenant safety).

## Acceptance (alto nivel)

- `pnpm fe:capture --explore --route=X --env=staging` abre una sesión interactiva (o un protocolo request/response máquina-legible) que el agente puede manejar: ejecutar un locator query → recibir `{ count, texts[], boundingBoxes[], ariaSnapshot, screenshotPath }`.
- Read-only enforced (sin `mutating`).
- `pnpm fe:capture:promote <explore-session>` emite un `<name>.scenario.ts` válido (pasa la validación del DSL) con `getByRole`/data-markers descubiertos + readiness sugerido.
- Tests + un real explore→promote→capture sobre una ruta autenticada.

## Dependencies & Impact

- **Depende de:** TASK-1097 (Capa 1, ya shipped local). Reusa `lib/{auth,browser,scenario,recorder}.ts`.
- **Impacta a:** `scripts/frontend/capture.ts` (CLI), tooling compartido con Codex.
- **Archivos owned:** `scripts/frontend/capture.ts` (flag `--explore`/`--promote`), nuevos `scripts/frontend/lib/explore.ts` + `promote.ts`.

## Provenance

Patrón de `microsoft/webwright` `local_browser.py` (spawn→inspect→discard, observación primero). Tomado como **ayuda de autoría** dentro del DSL gobernado; el code-as-action en runtime no.
