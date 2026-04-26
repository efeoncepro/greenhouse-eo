# TASK-514.5 — ESLint plugin upgrades + type-aware lint enablement

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio` (faster CI + new safety rails)
- Effort: `Medio`
- Type: `platform` + `tooling`
- Status real: `Backlog — TASK-514 follow-up Tier 2/3`
- Rank: `Post-TASK-514`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-514.5-eslint-plugin-upgrades`

## Summary

Cerrar tres ítems pendientes de TASK-514 en una sola task:

1. **`eslint-plugin-import-x`** — fork drop-in de `eslint-plugin-import`, ~3-10x más rápido. Listado en Follow-ups del spec original de TASK-514.
2. **`eslint-plugin-tailwindcss`** — class sorting determinístico para cuando se incorpore Tailwind 4.
3. **Type-aware linting de `typescript-eslint`** — habilitar `parserOptions.project: true` y activar el bundle de reglas que requieren type info: `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unnecessary-condition`, `prefer-nullish-coalescing`. Hoy off porque requieren type-checking (más lento) pero atrapan bugs runtime reales.

## Why This Task Exists

- `eslint-plugin-import` es el plugin más caro del bundle de TASK-514. `import-x` es el sucesor que el ecosistema 2025 está adoptando (Next 17 lo recomendará).
- Type-aware rules atrapan bugs runtime que el compiler no ve: `await fetch(...)` sin `await`, `if (a === undefined)` cuando `a` no puede ser undefined, etc.
- Tailwind 4 viene en pipeline platform; tener el class sorter ya configurado evita tener que hacerlo cuando el upgrade ya esté en curso.

## Goal

1. Migrar de `eslint-plugin-import` a `eslint-plugin-import-x` con la misma config (es drop-in).
2. Agregar `eslint-plugin-tailwindcss` con su flat config (no activar reglas hasta que Tailwind 4 entre).
3. Activar type-aware lint en una pasada con un set conservador de reglas:
   - `@typescript-eslint/no-floating-promises: error`
   - `@typescript-eslint/no-misused-promises: error`
   - `@typescript-eslint/await-thenable: error`
4. Refactorear los hits que aparezcan (probablemente promises sin await en handlers de submit / mutations).

## Acceptance Criteria

- [ ] `eslint-plugin-import-x` reemplaza `eslint-plugin-import` en `package.json` y `eslint.config.mjs`.
- [ ] `eslint-plugin-tailwindcss` instalado con config flat lista para activar en Tailwind 4.
- [ ] `parserOptions.project: true` activo en `eslint.config.mjs`.
- [ ] Las 3 reglas type-aware activas como `error`.
- [ ] `pnpm lint` clean.
- [ ] CI mide tiempo pre/post para validar la mejora.

## Scope

- Reemplazo 1:1 de import → import-x (mantener mismas pathGroups y reglas).
- Type-aware: arrancar con 3 reglas; no abrir el resto en este slice.
- Tailwind: solo install + config bridge, no enforcement.

## Out of Scope

- Activar el resto del set type-aware (otra task).
- Tailwind 4 actual upgrade (tarea separada).

## Verification

- `pnpm lint` clean.
- `pnpm build` verde.
- Medir lint duration con `time pnpm lint`.

## Follow-ups

- Activar `@typescript-eslint/no-unnecessary-condition`, `prefer-nullish-coalescing`, `consistent-type-assertions`, etc. en una task siguiente.
