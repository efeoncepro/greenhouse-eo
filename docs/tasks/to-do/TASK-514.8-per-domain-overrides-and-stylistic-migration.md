# TASK-514.8 — Per-domain ESLint overrides + `@stylistic` migration

## Status

- Lifecycle: `to-do`
- Priority: `P4`
- Impact: `Bajo` (futuro-proofing + slight DX improvement)
- Effort: `Bajo`
- Type: `platform` + `tooling`
- Status real: `Backlog — TASK-514 follow-up Tier 3`
- Rank: `Post-TASK-514`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-514.8-per-domain-overrides-stylistic`

## Summary

Dos mejoras al `eslint.config.mjs` que TASK-514 dejó deliberadamente fuera para no inflar la migración 1:1:

1. **Per-domain overrides** — aprovechar la capacidad nativa de flat config para tener bloques `files: ['src/<domain>/**']` con reglas específicas por dominio:
   - `src/lib/finance/**` con `@typescript-eslint/no-explicit-any: error` (estricto).
   - `src/views/greenhouse/finance/**` con reglas más estrictas de complejidad.
   - `src/app/api/**` con `no-restricted-imports` para evitar leakage de helpers internos.
2. **Migración a `@stylistic/eslint-plugin`** — las reglas que estamos usando (`padding-line-between-statements`, `lines-around-comment`, `newline-before-return`) están en deprecation path desde ESLint core. `@stylistic` las absorbió oficialmente y va a ser el home a largo plazo. Migrar ahora evita break en futuros majors.

## Why This Task Exists

- Lint global es tibio: las reglas estrictas que harían sentido en `lib/finance` son demasiado para `views/components` cosméticos. Per-domain overrides resuelven esto.
- Las reglas stylistic core están deprecadas; el upgrade a ESLint 10 (cuando salga) puede romperlas. `@stylistic` es el reemplazo canónico.

## Goal

1. Auditar dominios con candidatos a override stricter (finance, hr core, identity).
2. Definir set inicial de overrides per-domain — empezar conservador.
3. Instalar `@stylistic/eslint-plugin` y migrar las 3 reglas mencionadas.
4. Verificar que `pnpm lint` queda clean.

## Acceptance Criteria

- [ ] Bloques `files: [...]` agregados a `eslint.config.mjs` con reglas per-domain documentadas.
- [ ] `@stylistic/eslint-plugin` instalado.
- [ ] `padding-line-between-statements` → `@stylistic/padding-line-between-statements`.
- [ ] `lines-around-comment` → `@stylistic/lines-around-comment`.
- [ ] `newline-before-return` mantiene equivalente en `@stylistic`.
- [ ] `pnpm lint` clean sin regresiones.
- [ ] Delta documentado en `GREENHOUSE_UI_PLATFORM_V1.md`.

## Scope

- Solo per-domain rules conservadoras (no abrir el debate de "linter strictness" con el equipo en una task technical-only).
- Stylistic migration es 1:1 (mismo nombre, distinto namespace).

## Out of Scope

- Activar el set completo de reglas `@stylistic` recommended (otra task).
- Reformatear el repo con prettier-plugin-organize-imports (separado).

## Verification

- `pnpm lint`
- `pnpm build`

## Follow-ups

- Activar `@stylistic` recommended set después de medir impact.
