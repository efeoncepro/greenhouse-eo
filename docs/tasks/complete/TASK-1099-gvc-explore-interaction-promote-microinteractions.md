# TASK-1099 — GVC explore de interacciones → promote a `interaction` steps (microinteracciones)

## Delta 2026-06-12 — COMPLETE (shipped local, sin push inicial)

Implementado y verificado e2e. El loop observe→author→determinismo ahora cubre coreografía.

- **`fe:capture:explore --route=X --interaction '<kind>:<selector>'`** (repetible): performa la acción (read-only: hover/focus/click — `parseInteractionSpec` rechaza fill/press) y captura `before`/`feedback`/`settled` (0/150/300ms) como screenshots; registra la interacción en `session.json` (`ExploreInteraction` con `resolved` + frames). Graceful degrade: una interacción no resuelta no rompe el explore.
- **`promote`** auto-emite un step **`interaction` (V2)** por cada interacción `resolved` (`buildInteractionStep`): action + frames + intent placeholder + `keyboardEquivalent` (hover/focus→Tab, click→Enter) + `reducedMotion: 'capture'`. Pasa `validateScenario`.
- **Verificado:** 23 tests focales (7 nuevos de interacción) + tsc 0 + lint 0 + **e2e real**: `explore --interaction hover` → 3 frames live → `promote` (step interaction) → `fe:capture` corre la coreografía (`before/feedback/settled/reduced-motion`).
- **Hallazgo (documentado en la skill):** `promote` auto-elige la readiness de un heading único cuando no hay markers `data-*`; headings con copy dinámico (ej. `/coming-soon` rota su titular) hacen la readiness flaky → el agente revisa/ajusta la readiness (preferir un marker `data-gvc-ready`/`data-capture` estable). El scenario generado ya pide "revisá selectores/readiness antes de commitear".

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Complete 2026-06-12 — explore --interaction + promote interaction step shipped local. Verificado e2e (coreografía corre).`
- Rank: `TBD`
- Domain: `tooling|frontend|dx`
- Blocked by: `none` (TASK-1098 ya en develop)
- Branch: `develop` (override operador — sin branch)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

TASK-1098 dejó `explore`/`promote` en **baseline estático** (`mark`s). Esta task lleva el loop observe→author a la **coreografía/microinteracciones**: `explore` *performa* una acción (hover/focus/click — read-only, sin mutación) y captura los frames **before → feedback → settled** con sus timings; `promote` emite un step **`interaction` (V2)** ya cableado (action + frames + keyboardEquivalent + `reducedMotion: 'capture'`). Cierra la respuesta a la pregunta del operador: el agente ya no autora la coreografía a mano.

## Why This Task Exists

El valor de una microinteracción está en su feedback temporal (hover→glow, click→drawer). El DSL `interaction` ya lo modela, pero hoy se autora a mano (selector + timings adivinados). Esta task extiende el modo explore para *observar* la interacción real y `promote` para *cristalizarla* — mismo principio que TASK-1098, ahora sobre motion.

## Goal / Acceptance

- `pnpm fe:capture:explore --route=X --interaction 'hover:<selector>'` (repetible): performa la acción (read-only: hover/focus/click — NUNCA fill/press), captura `before`/`feedback`/`settled` (0/150/300ms) como screenshots + registra la interacción en `session.json`.
- `pnpm fe:capture:promote …` emite un step `interaction` válido (pasa `validateScenario`) por cada interacción registrada, con intent placeholder, frames, keyboardEquivalent (hover/click → Tab/Enter) y `reducedMotion: 'capture'`. El agente ajusta timings/intent.
- Tests (build del interaction step + parse del spec) + e2e real `explore --interaction` → `promote` → `fe:capture:micro`.

## Guardrail

- Read-only: explore solo performa hover/focus/click (no fill/press). El output durable sigue siendo el DSL gobernado; cero code-as-action en runtime.

## Dependencies & Impact

- **Depende de:** TASK-1098 (explore/promote). Reusa `lib/explore.ts` + `lib/promote.ts` + el step `interaction` del DSL (TASK-1018 V2).
- **Archivos owned:** `scripts/frontend/{explore,promote}.ts` + `lib/{explore,promote}.ts` + su test.
