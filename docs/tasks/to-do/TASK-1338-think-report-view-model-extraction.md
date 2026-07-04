# TASK-1338 — Think report view-model extraction (`report-view.ts`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site`
- Blocked by: `none`
- Branch: `task/TASK-1338-think-report-view-model-extraction`
- Legacy ID: `none`
- GitHub Issue: `none`

> **Repo objetivo:** `efeoncepro/efeonce-think` (gobernado desde Greenhouse — control plane TASK-1326). La task se registra y trackea en Greenhouse; el código vive en efeonce-think. NO toca greenhouse-eo runtime/backend/data.

## Summary

Extraer la derivación de datos de presentación del report público monolítico
(`src/pages/brand-visibility/r/[token].astro`, ~1873 líneas) a un módulo puro
`src/lib/report-view.ts` (funciones testeables), sin cambiar el render. Reduce el
fence del monolito, hace la lógica de display unit-testeable, y le da un hogar limpio
al patrón `viewFacts?.X ?? (cálculo local)` que hoy vive inline. **Refactor
behavior-preserving**: el HTML renderizado debe quedar visualmente idéntico.

## Why This Task Exists

El report es un `.astro` SSR de ~1873 líneas. Su fence (~líneas 125-390) mezcla
consumo del modelo con **derivación de display**: `Math.round` de scores que el modelo
ya trae, `reduce` de totales, tasas `mentionRate`/`engineEvidenceRate`/`ownDomainShare`
computadas como `viewFacts?.X ?? (cálculo local)`. Esa lógica hoy **solo se ejercita
renderizando la página completa** — no hay forma de testearla aislada, y engorda el
archivo más iterado del repo (git log lleno de "polish report"). No es un problema de
runtime (es SSR, no pesa en el bundle) sino de **mantenibilidad y testabilidad**.

Es la única sub-extracción sin arrepentimiento hoy: no toca render ni diseño, no
colisiona con el polish visual activo, y prepara el terreno para que las tasas migren
100% a `viewFacts` (contrato TASK-1331) sin fallback local.

## Goal

- `src/lib/report-view.ts` con funciones puras que reciben el `model`/`viewFacts` y
  devuelven el view-model derivado que hoy computa el fence.
- El fence del report consume esas funciones; el markup no cambia (render idéntico).
- Cobertura unit (Vitest o el runner del repo) de las funciones de derivación, incluida
  la rama `viewFacts presente` vs `fallback local`.
- Extracción de secciones/estilos del monolito queda **fuera de scope** (diferida).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- ADR render público headless: `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` `[verificar path exacto]`
- Contrato view-facts: TASK-1331 (`modelVersion=1.1.0` + `model.viewFacts`) — spec en `docs/tasks/complete/TASK-1331-ai-visibility-public-report-viewmodel-contract.md`

Reglas obligatorias:

- **Dumb-render intacto:** las funciones de `report-view.ts` SOLO dan forma para mostrar
  (round/format/aggregate). NUNCA computan el grade/score ni reglas de negocio — eso vive
  en el headless de Greenhouse. Si una función parece "calcular" un score, está mal ubicada.
- **Behavior-preserving:** el render debe quedar visual/estructuralmente idéntico
  (verificar con captura before/after). El objetivo es mover lógica, no cambiar output.
- **Preferir `viewFacts`:** mantener el patrón `viewFacts?.X ?? fallback` dentro de las
  funciones puras; no eliminar el fallback en esta task (esa migración es follow-up).

## Normative Docs

- `.claude/skills/astro/` (skill `astro`) — §`efeonce-overlay.md` (dumb-render/SSOT) y
  `topics/data-fetching.md` (build vs request; derivación server-side).

## Dependencies & Impact

### Depends on

- TASK-1325 (report render live) — el archivo objetivo existe.
- TASK-1331 (contrato `viewFacts`) — la forma del `model.viewFacts` que las funciones consumen.

### Blocks / Impacts

- Habilita (no bloquea) la migración futura de tasas display → 100% `viewFacts` sin fallback local.
- No bloquea el polish visual activo del report (no toca markup/estilos).

### Files owned

- `efeonce-think:src/pages/brand-visibility/r/[token].astro` (adelgaza el fence)
- `efeonce-think:src/lib/report-view.ts` (nuevo)
- `efeonce-think:src/lib/__tests__/report-view.test.ts` (nuevo) `[verificar convención de tests del repo]`

## Current Repo State

### Already exists

- `efeonce-think:src/pages/brand-visibility/r/[token].astro` — ~1873 líneas; fence con
  derivación inline (`overallScore`, `perceptionScore`, `agenticScore`, `mentionRate`,
  `engineEvidenceRate`, `ownDomainSharePct`, totales `reduce`, patrón `viewFacts?.X ?? …`).
- `efeonce-think:src/lib/report.ts` — cliente headless (`fetchPublicReport`) que ya
  separa el fetch/estado; buen precedente de módulo puro en `lib/`.
- `efeonce-think:src/lib/report-tokens.ts` — capa de presentación (AXIS + severity + labels);
  precedente de "lib de presentación".

### Gap

- No hay separación entre "consumir el modelo" y "derivar el view-model de display".
- La derivación no es testeable aislada (solo vía render de página completa).

<!-- ZONE 2 — no se llena al crear la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — `report-view.ts` con funciones puras + tests

- Identificar en el fence todos los valores derivados (scores redondeados, tasas,
  totales, coverage, citation shares, radar dims, niveles de madurez).
- Crear `src/lib/report-view.ts` con funciones puras tipadas: entrada `model`/`viewFacts`,
  salida el view-model derivado. Mantener el patrón `viewFacts?.X ?? fallback` dentro.
- Tests unit de cada función: caso `viewFacts presente` (usa el fact) y caso `fallback`
  (computa localmente), más edge cases (`null != 0`, denominador 0 → `null`).

### Slice 2 — Consumir desde el fence (behavior-preserving)

- Reemplazar la derivación inline del fence por llamadas a `report-view.ts`.
- Verificar render idéntico con captura before/after (desktop + mobile) sobre un token real.
- `astro check` + build limpios.

## Out of Scope

- Extracción de secciones del monolito a `components/report/*.astro` (diferido; requiere
  diseño congelado + coordinación con el polish activo de Codex).
- Mover estilos inline → scoped styles.
- Eliminar el fallback local de las tasas (migrar a 100% `viewFacts`) — follow-up.
- Cualquier cambio de markup, copy, diseño, scoring o contrato backend.

## Detailed Spec

La derivación a mover está en el fence del report (~líneas 125-390 al momento de escribir;
`[verificar en Discovery]`). Ejemplos representativos:

- `overallScore = typeof model?.overallScore === 'number' ? Math.round(model.overallScore) : null`
- `mentionRate = engine.resolved ? Math.round(((engine.present ?? 0) / engine.resolved) * 100) : null`
- `engineEvidenceRate = viewFacts?.engineCoverage?.summary?.shareOfModel ?? (resolvedTotal > 0 ? Math.round((presentTotal / resolvedTotal) * 100) : null)`
- `ownDomainSharePct = citationTotals?.ownDomainShare ?? (totalCitations > 0 ? Math.round((ownDomainCitations / totalCitations) * 100) : null)`
- totales `reduce((sum, x) => sum + x.count, 0)`; `radarDims`; `orderedLevels`/coverage.

Contrato de las funciones: puras, sin efectos, sin `fetch`, sin acceso a `Astro.*`.
Entrada = objetos ya traídos por el fence; salida = valores/estructuras listas para el markup.

## Rollout Plan & Risk Matrix

N/A operationally-simple — **refactor behavior-preserving en repo cliente (efeonce-think),
sin migración, sin flag, sin runtime de producción Greenhouse**. No toca backend/data/API/
scoring. El único riesgo es cambiar el render por accidente; se mitiga con paridad visual
antes/después + tests unit.

### Slice ordering hard rule

- Slice 1 (funciones + tests) → Slice 2 (consumir desde el fence). No consumir antes de
  tener las funciones testeadas.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El render cambia por accidente al mover la derivación | UI (report público Think) | low | Captura GVC before/after (desktop+mobile) idéntica + tests unit de las funciones | Diff visual en la captura; `astro check`/build rojo |
| Una función "computa" lógica de negocio en vez de solo display | dumb-render / SSOT | low | Revisión: toda función solo round/format/aggregate; scoring queda en el headless | Code review de `report-view.ts` |

### Feature flags / cutover

Sin flag — refactor aditivo/interno, cutover inmediato al mergear. Revert = revert del PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (solo agrega archivo + tests) | <5 min | sí |
| Slice 2 | revert PR (restaura el fence inline) | <5 min | sí |

### Production verification sequence

1. Local: `astro check` + build limpios; tests unit verdes.
2. Local: captura before/after de un token real (desktop 1440 + mobile 390) — render idéntico.
3. Preview Vercel de efeonce-think (si aplica) + smoke del report contra un token real.
4. Merge → deploy Think; smoke del report en `think.efeoncepro.com` (un token válido) sin regresión.

### Out-of-band coordination required

N/A — repo-only change (efeonce-think). Coordinar timing con Codex si hay polish del report
en vuelo para evitar conflicto de merge sobre el mismo archivo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `efeonce-think:src/lib/report-view.ts` con funciones puras tipadas que producen el view-model derivado.
- [ ] El fence de `brand-visibility/r/[token].astro` ya no computa derivación inline: la obtiene de `report-view.ts`.
- [ ] Tests unit cubren cada función, incluyendo rama `viewFacts` vs `fallback local` y edge cases (`null != 0`, denominador 0 → `null`).
- [ ] El render del report queda visual/estructuralmente idéntico (evidencia captura before/after desktop + mobile sobre un token real).
- [ ] `astro check` + build de efeonce-think limpios.
- [ ] Ninguna función de `report-view.ts` computa scoring/reglas de negocio (solo display).

## Verification

- `astro check` (efeonce-think)
- `pnpm build` (efeonce-think)
- test runner del repo sobre `report-view.test.ts` `[verificar comando en Discovery]`
- Captura before/after del report (Playwright del repo / `scripts/verify-report.mjs`).

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si hubo aprendizajes/deuda
- [ ] `changelog.md` actualizado si cambió estructura visible
- [ ] chequeo de impacto cruzado (TASK-1331 fallback migration, TASK-1332 icon adapter, polish activo)
- [ ] captura before/after adjunta como evidencia de paridad visual

## Follow-ups

- Migrar las tasas display a 100% `viewFacts` (eliminar el `?? fallback local`) una vez que el contrato TASK-1331 cubra todos los denominadores.
- Extraer secciones del report a `components/report/*.astro` cuando el diseño se congele (task aparte).
- Mover estilos inline → scoped styles por sección (task aparte).

## Open Questions

- ¿Convención de tests del repo efeonce-think (Vitest? ubicación `__tests__`)? Confirmar en Discovery.
- ¿Rango exacto de líneas del fence a extraer? Confirmar en Discovery (el ~125-390 es aproximado al 2026-07).
