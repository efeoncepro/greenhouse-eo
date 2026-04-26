# TASK-514 — ESLint 8 → 9 flat config migration

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (performance de lint + futuro de plugins)
- Effort: `Medio`
- Type: `platform` + `tooling`
- Status real: `Backlog — Ola 1 stack modernization`
- Rank: `Post-TASK-511`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-514-eslint-9-flat-config`

## Summary

Actualizar `eslint 8.57.1` a `eslint 9.x` y migrar `.eslintrc` (legacy) a `eslint.config.js` (flat config). ESLint 8 está en maintenance mode; v9 + flat config es el default desde 2024. `eslint-config-next 15.1` ya soporta flat config.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 1.

## Why This Task Exists

ESLint 8 fue marcado como legacy en 2024. Plugins modernos (typescript-eslint 8+, eslint-plugin-react 7.35+) están convergiendo en flat config first. Quedarse en v8 significa plugins stale y performance inferior.

Flat config benefits:
- Un solo archivo, sin resolución mágica de `extends`.
- Más rápido (no walk del fs buscando `.eslintrc`).
- Mejor type-checking del config (TS support).

## Goal

1. Actualizar `eslint` a v9 + todos los plugins relacionados (typescript-eslint, eslint-plugin-import, eslint-plugin-react, eslint-plugin-jsx-a11y, eslint-config-next).
2. Convertir `.eslintrc.*` → `eslint.config.js` (flat config).
3. Preservar todas las reglas actuales (incluida `padding-line-between-statements` y `lines-around-comment`).
4. Actualizar scripts `pnpm lint` si cambia la CLI.
5. Verificar: sin regresiones (mismo número de errors/warnings que baseline).

## Acceptance Criteria

- [ ] `eslint` 9.x, `typescript-eslint` 8.x, `eslint-config-next` compatible con v9.
- [ ] `eslint.config.js` reemplaza `.eslintrc.*`.
- [ ] `pnpm lint` verde sin regresiones (mismo contingente de errors/warnings que pre-migration).
- [ ] CI pipeline pasa.
- [ ] Docs `AGENTS.md` mencionan el nuevo flat config path.

## Scope

- Update deps: `eslint`, `@typescript-eslint/*`, `eslint-config-next`, plugins.
- Crear `eslint.config.js` traduciendo rules actuales.
- Remover `.eslintrc.json` / `.eslintrc.js` (lo que haya).
- Ajustar `package.json` script `lint` si es necesario.

## Out of Scope

- Agregar reglas nuevas (scope es migración 1:1).
- Biome / oxlint exploration (tarea separada futura).

## Follow-ups

- Evaluar plugins nuevos enterprise: `eslint-plugin-import-x` (faster fork), `eslint-plugin-tailwindcss` para Tailwind 4 class sorting.
