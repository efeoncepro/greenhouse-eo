# TASK-514.7 — Drop Redux + audit unused dev/runtime dependencies

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio` (~50KB bundle saved + reduced CVE surface)
- Effort: `Bajo`
- Type: `chore` + `cleanup`
- Status real: `Backlog — TASK-514 follow-up Tier 2 (also referenced from TASK-513)`
- Rank: `Post-TASK-513 / Post-TASK-514`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-514.7-drop-redux-and-unused-deps`

## Summary

Dos cleanups diferidos de TASK-513 + TASK-514:

1. Remover `@reduxjs/toolkit` y `react-redux` de `package.json`. Llegaron del Vuexy starter pero el repo NO los consume (0 hits en grep durante TASK-513). Server components + `useState` + react-query (TASK-513) cubren todo el state management actual.
2. Auditar el resto de dependencies con `knip` o `depcheck` para detectar otros packages instalados pero unused (probablemente quedan herederos del scaffold inicial).

## Why This Task Exists

- Dependencias unused inflan el bundle (aunque sean tree-shakeable, suman a la auditoria de seguridad).
- Cada package en `package.json` es CVE surface y Renovate noise.
- Confunde a developers nuevos que asumen que Redux es parte del stack canónico.

## Goal

1. `pnpm remove @reduxjs/toolkit react-redux`.
2. Confirmar que `pnpm build` y `pnpm lint` pasan después.
3. Correr `pnpm dlx knip` (o `depcheck`) para listar candidatos adicionales.
4. Por cada candidato, confirmar que es realmente unused (algunos son loaded indirectamente via Vuexy starter o Next plugins).
5. Removerlos en commits separados (uno por package o agrupado por dominio).

## Acceptance Criteria

- [ ] `@reduxjs/toolkit` y `react-redux` fuera de `package.json`.
- [ ] Reporte de knip/depcheck commiteado en `docs/architecture/` o como referencia en la spec cerrada.
- [ ] `pnpm build` + `pnpm lint` + `pnpm test` verdes.
- [ ] Bundle size del primer load route comparado pre/post (smoke).

## Scope

- Remoción de Redux es P0 dentro de la task.
- Otros packages: solo si knip los marca explicit-unused y un grep manual confirma.

## Out of Scope

- Bumpear deps no relacionadas (eso es tarea de Renovate/Dependabot).
- Refactoring de stores en caso de que aparezca uso de Redux (no debería).

## Verification

- `pnpm build` verde.
- `pnpm test` verde.
- Bundle size diff documentado.
