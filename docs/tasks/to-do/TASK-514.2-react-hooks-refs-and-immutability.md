# TASK-514.2 — Enable `react-hooks/refs` + `react-hooks/immutability` (React Compiler bundle, Wave 2)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio` (corrección de patterns sutiles que React 19 considera anti-patrón)
- Effort: `Bajo` (~19 sitios detectados durante TASK-514)
- Type: `refactor` + `quality`
- Status real: `Backlog — TASK-514 follow-up Tier 1`
- Rank: `Post-TASK-514.1`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-514.2-react-hooks-refs-and-immutability`

## Summary

Activar las reglas `react-hooks/refs` (18 hits durante TASK-514) y `react-hooks/immutability` (1 hit) que el bundle React Compiler trae instaladas pero TASK-514 dejó `off` por scope.

`react-hooks/refs` detecta lecturas/escrituras a `ref.current` durante el render — debería ocurrir solo en effects o handlers.

`react-hooks/immutability` detecta mutaciones a state objects/arrays en lugar de reemplazos inmutables.

## Why This Task Exists

- 19 violaciones reales encontradas en `TASK-514` lint pass.
- Refs accedidas durante render generan inconsistencias de hidratación con React Server Components.
- Mutaciones in-place rompen optimistic updates de react-query (TASK-513) y memoization.

## Goal

1. Inventariar las 18 violaciones de `react-hooks/refs` y la 1 de `react-hooks/immutability`.
2. Refactorear según patterns canónicos.
3. Activar ambas reglas como `error`.

## Acceptance Criteria

- [ ] `react-hooks/refs: error` en `eslint.config.mjs`.
- [ ] `react-hooks/immutability: error` en `eslint.config.mjs`.
- [ ] `pnpm lint` clean.
- [ ] Tests pasando.

## Scope

- `pnpm lint --rule '{ "react-hooks/refs": "error", "react-hooks/immutability": "error" }' .` para listar exactos.
- Refactor a `useImperativeHandle`, `useEffect(() => { ref.current = ... })` o spread inmutable según el caso.

## Out of Scope

- Otras reglas del bundle (TASK-514.1, TASK-514.3, TASK-514.4).

## Verification

- `pnpm lint`, `pnpm build`, `pnpm test`.
