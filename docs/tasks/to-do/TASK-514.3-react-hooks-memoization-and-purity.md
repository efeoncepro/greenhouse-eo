# TASK-514.3 — Enable `react-hooks/preserve-manual-memoization` + `purity` + `use-memo` (React Compiler bundle, Wave 3)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio` (memoization correctness + side-effect-free render)
- Effort: `Medio` (~6 sitios detectados, pero requiere análisis)
- Type: `refactor` + `quality`
- Status real: `Backlog — TASK-514 follow-up Tier 1`
- Rank: `Post-TASK-514.1`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-514.3-react-hooks-memoization-purity`

## Summary

Activar las reglas que validan memoization y pureza del render — todas off desde TASK-514:

- `react-hooks/preserve-manual-memoization` (6 hits durante TASK-514): `useMemo` / `useCallback` con dependencies incompletas.
- `react-hooks/purity`: side effects fuera de effects/handlers.
- `react-hooks/use-memo`: uso correcto de `useMemo` (no para side effects).

## Why This Task Exists

- Memoization rota produce children que re-renderean innecesariamente — costo amplificado por la cantidad de hooks que el portal tiene en views grandes (QuoteBuilderShell, FinanceDashboardView).
- Render impuro es invisible en dev y catastrófico en Concurrent Mode + Server Components.

## Goal

1. Inventariar violaciones reales (puede haber falsos positivos en patrones legítimos como `useMemo` con dependency vacía intencional).
2. Refactorear: completar dependency arrays, mover side effects a effects, usar `useMemo` solo para cálculos puros.
3. Activar las 3 reglas.

## Acceptance Criteria

- [ ] `react-hooks/preserve-manual-memoization: error`.
- [ ] `react-hooks/purity: error`.
- [ ] `react-hooks/use-memo: error`.
- [ ] `pnpm lint` clean.
- [ ] Tests pasando.

## Scope

- Inventario exacto via `pnpm lint --rule '...' .`
- Refactor case-by-case.

## Out of Scope

- Otras reglas (TASK-514.1, .2, .4).

## Verification

- `pnpm lint`, `pnpm build`, `pnpm test`.
