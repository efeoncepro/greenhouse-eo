# TASK-1097 — GVC agent-authoring observability (aria snapshot) + greenhouse-gvc-playwright skill

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Complete 2026-06-12 — Capa 1 (aria_snapshot por mark) verificada e2e + skill greenhouse-gvc-playwright (.claude + .codex). Local-first, sin push.`
- Rank: `TBD`
- Domain: `tooling|frontend|dx`
- Blocked by: `none`
- Branch: `develop` (override operador — sin branch)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Fortalecer GVC (`pnpm fe:capture`) para reducir la fricción que Claude **y** Codex tienen autorando Playwright: hoy autoramos **a ciegas** (selectores adivinados en un `.scenario.ts` sin ver la página → correr → mirar el PNG → descubrir el error → re-correr). Se destilan las técnicas robustas de `microsoft/webwright` (`local_browser.py`, Apache-2.0, SOTA Mind2Web 86.7%) **sin** adoptar su runtime de ejecución de código libre (GVC se queda determinístico y gobernado).

Dos entregables:
1. **Capa 1 — observación máquina-legible (`aria_snapshot`)**: cada `mark` de GVC ahora escribe el árbol de accesibilidad de la región capturada. El agente **lee el a11y tree y escribe `getByRole(...)`** contra lo que existe, en vez de adivinar el selector.
2. **Skill `greenhouse-gvc-playwright`**: captura el *craft* (aria-observation, user-facing locators > CSS, timeouts en capas, graceful degrade) + los gotchas propios de GVC (sidebar `position:fixed` clip, readiness anti-Turbopack, agent-auth, `mutating` safety). Carga conocimiento robusto de Playwright cuando cualquier agente toca GVC.

## Why This Task Exists

GVC ya es maduro (auth, browser lifecycle, failure-taxonomy, quality gates, ~90 scenarios). La fricción real no es el setup — es que **autoramos contra un target que no podemos ver**. Webwright resuelve esto dándole al modelo el `aria_snapshot` (no el PNG) para que escriba código contra el DOM real. Esa es la pieza que faltaba; el resto de las prácticas de Webwright (domcontentloaded > networkidle, console capture, graceful degrade) GVC **ya las hace** — lo cual valida la base.

## What shipped

- **Capa 1** ([scripts/frontend/lib/recorder.ts](../../../scripts/frontend/lib/recorder.ts) + [manifest.ts](../../../scripts/frontend/lib/manifest.ts)):
  - En `onMark`, después del screenshot, captura `ariaSnapshot()` de la región: `clipSelector` → snapshot del nodo; sino → snapshot del `body`. Best-effort + `try/catch` (graceful degrade, patrón Webwright): **nunca rompe el mark**.
  - Escribe `frames/<NN>-<label>.aria.txt` + nuevo campo opcional `FrameRecord.ariaSnapshotPath` en el `manifest.json`.
  - Aditivo: `manifest.schemaVersion` se mantiene en `1`; scenarios existentes no cambian de comportamiento (solo ganan el sibling file).
- **Skill** `greenhouse-gvc-playwright` ([.claude](../../../.claude/skills/greenhouse-gvc-playwright/SKILL.md) + [.codex](../../../.codex/skills/greenhouse-gvc-playwright/SKILL.md) mirror): Regla #1 (observá antes de autorar), tabla locators user-facing > CSS, readiness anti-networkidle, layered timeouts, graceful degrade, gotchas GVC, cuándo caer a ad-hoc, el límite vs Webwright, comandos canónicos.

## Verification

- `pnpm exec vitest run scripts/frontend/lib/{scenario,capture-index,layout-integrity}.test.ts` → 30 passed.
- Standalone proof (PW 1.59 `locator.ariaSnapshot()` + sibling write) → árbol correcto (`tab "Conciliados"`, `button "Registrar pago"`).
- **e2e real** `pnpm fe:capture coming-soon --env=local` → `manifest.frames[].ariaSnapshotPath = "frames/01-snapshot.aria.txt"` (desktop + mobile) + `.aria.txt` con el árbol real de `/coming-soon` (`button "Notifícame"`, `timer "49 Días…"`, `img "Efeonce"`).

## Dependencies & Impact

- **Depende de:** Playwright >= 1.49 (`locator.ariaSnapshot`); el repo está en 1.59.1.
- **Impacta a:** todos los scenarios GVC (ganan el `.aria.txt`, aditivo). Tooling compartido con Codex — cambio additivo, sin breaking.
- **Archivos owned:** `scripts/frontend/lib/recorder.ts` (bloque aria), `scripts/frontend/lib/manifest.ts` (`ariaSnapshotPath`), `.{claude,codex}/skills/greenhouse-gvc-playwright/`.

## Follow-up

- **TASK-1098** — Capa 2/3: modo `fe:capture --explore` (REPL de autoría contra la página viva) + `promote` (exploración → `.scenario.ts`). Cierra el loop observe→author→determinismo que Webwright modela.

## Provenance

Técnicas de `microsoft/webwright` `src/webwright/environments/local_browser.py` (Apache-2.0). Tomadas: aria-tree observation, user-facing locators, layered timeouts, graceful degrade. **NO** tomado: ejecución de código libre del modelo en runtime (incompatible con Full API Parity + tenant safety + determinismo de baselines).
