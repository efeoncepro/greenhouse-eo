# TASK-1100 — GVC explore mide los timings reales de la microinteracción (visual stability)

## Delta 2026-06-12 — COMPLETE (shipped local)

Implementado y verificado e2e. `explore --interaction` ya **mide** los timings (no fijos).

- **`detectInteractionTimings(samples, opts)`** (puro, `lib/explore.ts`): desde la serie de diff-ratios deriva `feedbackAtMs` (1er sample sobre `startThreshold` vs before) + `settledAtMs` (inicio del 1er tramo de `stableSamples` consecutivos bajo `settleThreshold` vs el sample previo) + `changed`.
- **`explore.ts`**: tras la acción muestrea el clip del target (bbox + padding, dims fijas → `pixelmatch` funciona) cada 50ms hasta `--interaction-window` (default 1000, clamp [200,4000] para GSAP largo), computa diffs vía `lib/visual-diff` (`loadPng`/`compareImages`), persiste before/feedback/settled en los momentos **medidos**. `measuredTimings:false` + fallback honesto cuando no hay cambio visible.
- **`promote`** ya emite el step `interaction` con los `atMs` medidos (usa `frame.atMs` — fluye sin cambio).
- **Verificado:** 28 tests focales (5 nuevos del helper) + tsc 0 + lint 0 + **e2e real**: hover sin efecto → honesto `sin feedback visible` (measuredTimings:false); `click` con cambio de estado → `feedback 50ms · settled 150ms` MEDIDOS (≠ los 300ms fijos). Mide cualquier motion (CSS/framer-motion/GSAP) porque mide píxeles, no eventos.

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Complete 2026-06-12 — explore mide timings reales (pixel-diff). Verificado e2e (hover honesto + click feedback@50 settled@150 medidos).`
- Rank: `TBD`
- Domain: `tooling|frontend|dx`
- Blocked by: `none` (TASK-1099 ya en develop)
- Branch: `develop` (override operador — sin branch)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

TASK-1099 captura la microinteracción en timings **fijos** (`before`/`feedback`/`settled` a 0/150/300ms). Para un motion de 600ms (GSAP cinemático) el "settled" a 300ms cae **a mitad** de la animación → evidencia incorrecta. Esta task hace que `explore` **mida** los timings reales: tras la acción, muestrea el clip del target cada ~50ms, computa el diff de píxeles (reusa `pixelmatch` vía `lib/visual-diff.ts`) y deriva `feedbackAtMs` (cuándo arranca el cambio) + `settledAtMs` (cuándo se estabiliza). Funciona para **cualquier** tecnología de motion (CSS, framer-motion, GSAP) porque mide píxeles, no eventos. Los frames + el step `interaction` que emite `promote` quedan en los momentos reales.

## Goal / Acceptance

- `fe:capture:explore --route=X --interaction 'hover:<sel>'` mide los timings (no fijos): muestrea el clip del target post-acción, `detectInteractionTimings` (helper puro) deriva feedback/settled desde los diff-ratios.
- `--interaction-window=<ms>` (default 1000) para animaciones largas (GSAP `extended` 600ms + buffer).
- Si no hay cambio visible observable → `measuredTimings:false` + fallback a defaults (el agente sabe que no hubo feedback).
- `promote` emite el step `interaction` con los `atMs` **medidos** (ya fluye: usa `frame.atMs`).
- Tests del helper puro (samples → feedback/settled) + e2e real (timings medidos != fijos).

## Guardrail

- Read-only (igual que TASK-1099). El muestreo es solo screenshots + pixel-diff; cero mutación.

## Dependencies & Impact

- **Depende de:** TASK-1099 (interaction observation). Reusa `lib/visual-diff.ts` (`loadPng`, `compareImages`).
- **Archivos owned:** `scripts/frontend/explore.ts` + `lib/explore.ts` + su test.
