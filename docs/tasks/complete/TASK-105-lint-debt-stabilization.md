# TASK-105 - Lint Debt Stabilization

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Alto` |
| Status real | `Cerrada` |
| Rank | `33` |
| Domain | `ops` |
| Legacy ID | `CODEX_TASK_Lint_Debt_Burn_Down_v1` |

## Delta 2026-03-28

- `pnpm lint`: 124 issues iniciales → 0. Limpieza en scripts, APIs `my/*`, helpers de intelligence/capacity y vistas agency/greenhouse; sin cambios de comportamiento.
- `pnpm test -- --runInBand`: verde (94 files / 468 tests).
- `pnpm build`: verde tras limpieza. Se ajustaron imports, blank lines, useMemo deps y hooks condicionales para cumplir ESLint.

## Summary

Stabilizar `pnpm lint` en el repo actual para que vuelva a ser una señal confiable de calidad. La deuda está distribuida en scripts, rutas API, helpers compartidos y vistas; no corresponde a un solo módulo funcional.

## Why This Task Exists

`pnpm build` y `pnpm test` están verdes en el estado actual, pero `pnpm lint` no. Eso hace que la verificación del repo siga siendo ruidosa y que cada entrega tenga que aclarar si el lint roto es deuda nueva o ruido heredado.

Sin una task explícita, esta deuda termina compitiendo con features activas y se vuelve fácil ignorarla.

## Goal

- Dejar `pnpm lint` en verde otra vez.
- Corregir la deuda mecánica sin cambiar comportamiento de negocio.
- Evitar que nuevas entregas vuelvan a depender de un baseline de lint ruidoso.

## Architecture Alignment

Revisar y respetar:

- `AGENTS.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_TEMPLATE.md`

Reglas obligatorias:

- no mezclar esta lane con features funcionales
- no cambiar comportamiento solo para satisfacer ESLint
- si una excepción es necesaria, documentarla con razón concreta

## Dependencies & Impact

### Depends on

- el estado actual del árbol y la configuración de ESLint del repo
- la observación real de la última corrida completa de `pnpm lint`

### Impacts to

- `TASK-096`, `TASK-098`, `TASK-099`, `TASK-100`, `TASK-101` y cualquier task futura que quiera usar `pnpm lint` como gate confiable
- cualquier lane que toque scripts, views compartidas o helpers transversales

### Files owned

- `scripts/**` con errores actuales de lint
- `src/app/(dashboard)/my/**`
- `src/app/api/cron/**`
- `src/app/api/people/[memberId]/intelligence/route.ts`
- `src/app/api/team/capacity-breakdown/route.ts`
- `src/lib/account-360/**`
- `src/lib/member-capacity-economics/**`
- `src/lib/person-intelligence/**`
- `src/lib/sync/**`
- `src/lib/team-capacity/**`
- `src/types/people.ts`
- `src/views/agency/**`
- `src/views/greenhouse/**`

## Current Repo State

### Ya existe

- `pnpm build` pasa
- `pnpm test` pasa
- existe un baseline histórico de limpieza en `CODEX_TASK_Lint_Debt_Burn_Down_v1`

### Gap actual

- `pnpm lint` falla con deuda dispersa en múltiples carpetas
- hay errores de `padding-line-between-statements`, `import/order`, `no-unused-vars`, `lines-around-comment`, `react-hooks/rules-of-hooks` y `consistent-type-imports`
- la falla no está acotada a un solo módulo, así que el cierre requiere un pase sistemático

## Scope

### Slice 1 - Triage y clasificación

- agrupar errores por patrón y por zona de código
- separar deuda mecánica de decisiones de estilo discutibles
- priorizar hotspots con más impacto cruzado

### Slice 2 - Limpieza y estabilización

- corregir los archivos con errores de lint sin alterar comportamiento
- mantener `pnpm test` y `pnpm build` verdes durante el proceso
- documentar cualquier excepción puntual si fuera necesaria

## Out of Scope

- features nuevas
- refactors amplios no motivados por lint
- cambios de arquitectura
- cambios de comportamiento para “hacer pasar” ESLint

## Acceptance Criteria

- [ ] `pnpm lint` pasa sin errores ni warnings
- [ ] `pnpm test` sigue pasando
- [ ] `pnpm build` sigue pasando
- [ ] no se introducen cambios funcionales no justificados
- [ ] cualquier excepción de lint queda documentada

## Verification

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `git diff --check`
