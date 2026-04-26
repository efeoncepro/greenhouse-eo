# TASK-514.4 — Enable residual `react-hooks/*` rules (React Compiler bundle, Wave 4)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo` (rules edge — la mayoría sin hits actuales)
- Effort: `Bajo`
- Type: `refactor` + `quality`
- Status real: `Backlog — TASK-514 follow-up Tier 1`
- Rank: `Post-TASK-514.1`
- Domain: `ui` + `platform`
- Blocked by: `TASK-514.1, TASK-514.2, TASK-514.3` (resolver primero el grueso)
- Branch: `task/TASK-514.4-react-hooks-residual-rules`

## Summary

Activar las reglas restantes del bundle React Compiler que TASK-514 dejó `off`:

- `react-hooks/incompatible-library` (47 warnings durante TASK-514).
- `react-hooks/static-components`
- `react-hooks/component-hook-factories`
- `react-hooks/error-boundaries`
- `react-hooks/gating`
- `react-hooks/globals`
- `react-hooks/unsupported-syntax`
- `react-hooks/config`, `react-hooks/fbt`, `react-hooks/fire`, `react-hooks/todo` (defaults internos del compiler — probablemente off-by-default upstream).

## Why This Task Exists

Cerrar el bundle. Después de las 3 waves anteriores, estas reglas son edge — pero dejarlas off indefinidamente significa que `eslint-config-next` siguiente upgrade puede sorprender con nuevos hits no detectados.

## Goal

1. Para cada regla, ejecutar `pnpm lint` con la regla activa y catalogar hits reales.
2. Refactorear o silenciar (con justificación documentada) los pocos casos que aparezcan.
3. Activar todas como `error` o `warn` según severidad upstream.

## Acceptance Criteria

- [ ] Todas las reglas listadas activas en `eslint.config.mjs`.
- [ ] `pnpm lint` clean.
- [ ] Cualquier `eslint-disable` queda documentado con comentario `// TASK-514.4: <razón>`.

## Scope

- Pasada por archivo, regla por regla.
- Probable: la mayoría sin hits.

## Out of Scope

- Cambiar la severidad default upstream — solo activar lo que el bundle ya provee.

## Verification

- `pnpm lint`, `pnpm build`, `pnpm test`.
