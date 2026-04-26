# TASK-514.6 — Biome / oxlint exploration (linter speed bench)

## Status

- Lifecycle: `to-do`
- Priority: `P4` (exploración, no producción)
- Impact: `Medio` (potencial 10-100x speed improvement en CI)
- Effort: `Medio` (PoC + medición + decisión)
- Type: `exploration` + `platform`
- Status real: `Backlog — TASK-514 follow-up Tier 1`
- Rank: `Post-TASK-514`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-514.6-biome-oxlint-exploration`

## Summary

PoC y benchmark de [Biome](https://biomejs.dev/) y [oxlint](https://oxc.rs/docs/guide/usage/linter.html) — los dos linters Rust-based que están reemplazando ESLint en el ecosistema 2025 cuando la velocidad importa.

Listado explícitamente en `Out of Scope` de TASK-514: "Biome / oxlint exploration (tarea separada futura)".

## Why This Task Exists

- ESLint corre en JS — para repos grandes (300+ files) tarda 10-30s. Biome / oxlint corren en 0.3-3s sobre el mismo repo.
- Biome además absorbe Prettier (formatter unificado).
- oxlint es ESLint-compatible para 99% de las reglas; Biome tiene su propio set.
- Decidir si conviene migrar (full o parcial — usar oxlint en pre-commit y ESLint en CI; o full Biome con cleanup de Prettier).

## Goal

1. Instalar Biome y oxlint en branches separados del repo.
2. Configurar mínimo viable equivalente a TASK-514 (`eslint.config.mjs`).
3. Medir:
   - Tiempo de lint full repo.
   - Tiempo en CI.
   - Cobertura de reglas vs ESLint actual.
4. Decidir y documentar:
   - **Option A**: full migration a Biome (drop ESLint + Prettier).
   - **Option B**: dual stack (oxlint en pre-commit, ESLint en CI).
   - **Option C**: Stay con ESLint 9 (status quo).

## Acceptance Criteria

- [ ] PoC branches con Biome y oxlint funcionando.
- [ ] Reporte de benchmark documentado (lint duration, rules covered, missing rules).
- [ ] Decisión documentada en `GREENHOUSE_UI_PLATFORM_V1.md` Delta.
- [ ] Si la decisión es migrar → spec follow-up con plan.

## Scope

- Branches throwaway, PoC only — esta task NO migra producción.
- Foco en reglas core: import order, ts-eslint recommended, react-hooks classics.

## Out of Scope

- Migración real (queda en follow-up si la decisión es positiva).
- Otras herramientas Rust (rustywind, knip, etc.).

## Verification

- Reporte cuantitativo (números de bench, no impresión).
- Decisión architectonica firmada.
