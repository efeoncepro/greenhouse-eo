# TASK-519 — `react-datepicker` → MUI X DatePicker

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo-Medio` (consistencia visual + i18n nativo)
- Effort: `Medio`
- Type: `refactor` + `dependency`
- Status real: `Backlog — Ola 3 stack modernization`
- Rank: `Post-TASK-511`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-519-datepicker-to-mui-x`

## Summary

Reemplazar `react-datepicker 8.9.0` por `@mui/x-date-pickers`. Ya usamos MUI 7 — MUI X DatePicker se integra nativo con theme, locale (es-CL), tokens de typography/color/radius.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 3.

## Why This Task Exists

`react-datepicker` trae estilos propios que luchan con MUI (custom CSS imports, inconsistencia con `CustomTextField`). MUI X DatePicker:
- Integración nativa con MUI theme (light/dark, primary color, radius tokens).
- i18n con `@mui/x-date-pickers/AdapterDateFns` + `date-fns` (ya tenemos date-fns 4).
- A11y mejor (keyboard, aria-live, screen reader friendly).
- Range picker out-of-the-box.
- Usa `LocalizationProvider` pattern canónico.

## Goal

1. Instalar `@mui/x-date-pickers` + `@mui/x-date-pickers-pro` (si necesitamos range picker).
2. Setup `LocalizationProvider` en el root layout con `AdapterDateFns` + locale `es`.
3. Grep consumers de `react-datepicker` y migrar cada uno.
4. Remover `react-datepicker` del `package.json`.
5. Verificar: date filters, quote validUntil, payroll period selectors, etc.

## Acceptance Criteria

- [ ] `@mui/x-date-pickers` instalado (versión compatible con MUI 7).
- [ ] `LocalizationProvider` con locale `es-CL`.
- [ ] Grep `react-datepicker` devuelve 0 hits.
- [ ] Range picker funcional donde se use (ej. filtros de period).
- [ ] Smoke staging: todos los date pickers renderizan correctamente y respetan dark mode.
- [ ] Gates tsc/lint/test/build verdes.

## Scope

- `src/providers/LocalizationProvider.tsx` — wrapper setup.
- Grep + migrate en: filtros de fecha, validUntil, birth date, period selectors.

## Out of Scope

- TimePickers (si no se usan).
- Rediseño de filtros (preservar flujo).

## Follow-ups

- Considerar `@mui/x-data-grid` si seguimos requiriendo tablas con sort/filter server-side (hoy TanStack Table cubre bien).
