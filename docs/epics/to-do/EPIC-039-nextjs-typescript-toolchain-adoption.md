# EPIC-039 — Next.js 16.3 + TypeScript 7 Toolchain Adoption

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform|ops`
- Owner: `Platform / Architecture`
- Branch: `develop (shared checkout; sin worktrees)`
- GitHub Issue: `none`

## Summary

Coordinar la adopción staged de Next.js 16.3 y TypeScript 7 en el starter-kit de Greenhouse. El programa separa el alineamiento del framework de la migración del compilador para conservar rollback, aislar la incompatibilidad temporal de `typescript-eslint` y validar el build real de Vercel.

## Why This Epic Exists

El repositorio está en Next.js `16.1.1`, mantiene `eslint-config-next` en `16.2.4` y TypeScript en `5.9.3`. La primera prueba con TypeScript 7 falla por `downlevelIteration`, mientras que `typescript-eslint` todavía requiere una API de TypeScript 6. La adopción requiere dos slices coordinados: framework primero y compilador dual después.

## Outcome

- Next.js, `eslint-config-next`, lockfile y gates de build quedan alineados en `16.3.0` sin mezclar upgrades mayores de React, MUI o dependencias no necesarias.
- TypeScript 7 queda como CLI de typecheck/Next build y TypeScript 6 queda disponible para herramientas que importan la API del compilador.
- Lint, typecheck dual, tests, builds clean/warm, CI y preview Vercel tienen evidencia reproducible y rollback explícito.
- El runtime de la aplicación, la topología del repositorio y los contratos de producto permanecen sin cambios.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/12-testing-development.md`
- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Child Tasks

- `TASK-1638` — alineamiento de Next.js 16.3, `eslint-config-next`, lockfile, Turbopack y gates de runtime/build.
- `TASK-1639` — adopción de TypeScript 7 con lane compatible de TypeScript 6 para `typescript-eslint`, CI y medición de recursos; bloqueada por `TASK-1638`.

## Existing Related Work

- `TASK-514.5` — ESLint plugin upgrades + type-aware lint enablement; debe consumir el lane compatible de TypeScript sin forzar soporte no oficial de TS7.
- `package.json` y `pnpm-lock.yaml` — source of truth de versiones y resolución reproducible.
- `next.config.ts` y `scripts/run-next-build.mjs` — configuración y wrapper actuales del build.
- `EPIC-026` / `EPIC-027` — contexto de costos y límites de build; no autorizan crear una nueva topología para este programa.

## Exit Criteria

- [ ] `TASK-1638` y `TASK-1639` están cerradas con sus criterios de aceptación y evidencia de rollback.
- [ ] `pnpm install --frozen-lockfile`, `pnpm lint`, typecheck dual, tests y builds clean/warm pasan en CI y preview.
- [ ] Las rutas críticas de proxy, auth, SSR/hydration de MUI, redirects y Sentry no presentan regresiones.
- [ ] La promoción productiva, si se autoriza, sigue el release control plane y conserva una revisión Vercel previa como rollback.

## Non-goals

- Actualizar React, React DOM, MUI, NextAuth, `next-intl` o Sentry fuera de lo estrictamente necesario para compatibilidad.
- Activar `cacheComponents`, React Compiler, instant navigation u otras capacidades experimentales como parte de esta adopción.
- Crear `apps/*`, `packages/*`, un nuevo servicio, una nueva topología de build o un worktree.
- Cambiar rutas de producto, contratos API, esquemas, datos, secrets o comportamiento funcional.
