# TASK-1639 — TypeScript 7 Dual Compiler Adoption

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-039`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `TASK-1638`
- Branch: `develop (shared checkout; sin worktrees)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Adoptar TypeScript 7 como compilador CLI del proyecto sin romper las herramientas que todavía importan la API de TypeScript 6. La task elimina opciones retiradas, instala los aliases oficiales TS7/TS6, separa los typechecks y deja CI y Next.js 16.3 verificando el lane correcto.

## Why This Task Exists

El baseline usa TypeScript `5.9.3`; la primera prueba con TS7 falla por `downlevelIteration` en el `tsconfig` raíz. Además, `typescript-eslint` mantiene soporte oficial para TypeScript `<6.1.0`, mientras TypeScript 7 aún no ofrece una API programática estable. Reemplazar `typescript` directamente por TS7 rompería el contrato de lint; la adopción debe usar `tsc` de TS7 y `tsc6`/API de TS6 en paralelo.

## Goal

- Remover opciones y supuestos incompatibles con TypeScript 7 sin alterar los contratos de la aplicación.
- Instalar TypeScript 7 para el CLI y `@typescript/typescript6` como compatibilidad para `typescript-eslint`.
- Ejecutar typecheck TS7, typecheck compatible TS6, lint y Next build de forma explícita en local y CI.
- Medir tiempo/memoria y conservar un rollback simple al baseline actual.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/12-testing-development.md`
- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- `TASK-1638` debe estar verificada antes de cambiar el compilador consumido por Next.js.
- El lane TS6 se conserva para toda herramienta que importe la API de TypeScript; no se silencia la incompatibilidad de `typescript-eslint` con TS7.
- Los flags de paralelización de TS7 (`--checkers`) se ajustan sólo con evidencia de tiempo/memoria del repositorio y del runner CI.
- No cambiar `skipLibCheck`, `strict`, `moduleResolution: bundler` o aliases de aplicación para ocultar errores sin justificar la causa.
- No convertir la task en una migración de código funcional; los cambios de fuente deben limitarse a incompatibilidades demostradas de TS7.

## Normative Docs

- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [typescript-eslint dependency versions](https://typescript-eslint.io/users/dependency-versions/)

## Dependencies & Impact

### Depends on

- `TASK-1638` — Next.js 16.3 framework alignment.
- `package.json` y `pnpm-lock.yaml` como source of truth de los aliases y binarios.
- `tsconfig.json`, que contiene `downlevelIteration` y el include de la aplicación.
- `eslint.config.mjs`, que consume `typescript-eslint` y debe continuar resolviendo la API compatible.

### Blocks / Impacts

- Impacta `pnpm typecheck`, `next build`, `pnpm lint`, CI y la experiencia del editor.
- Impacta la preparación de `TASK-514.5`, pero no cambia su alcance de reglas type-aware.
- No impacta rutas, datos, APIs, auth, secrets ni workers de Cloud Run.

### Files owned

- `package.json`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `eslint.config.mjs`
- `.github/workflows/ci.yml`
- `.github/workflows/ci-deep.yml`
- `.github/workflows/playwright.yml`
- `.github/workflows/production-release.yml` si el build requiere declarar el lane de forma explícita
- `docs/tasks/to-do/TASK-1639-typescript-7-dual-compiler-adoption.md`

## Current Repo State

### Already exists

- TypeScript `5.9.3`, `@typescript-eslint/*` `8.59.0` y ESLint 9.
- `tsconfig.json` con `strict: true`, `target: ESNext`, `moduleResolution: Bundler`, `isolatedModules: true`, `allowJs: true`, `skipLibCheck: true` y `downlevelIteration: true`.
- El script canónico `pnpm typecheck` fija `NODE_OPTIONS=--max-old-space-size=8192`.
- `pnpm typecheck` canónico y `pnpm lint` pasan en el baseline.
- `pnpm dlx --package typescript@7.0.2 tsc --noEmit --incremental false` falla antes del análisis de fuentes con `TS5102` por `downlevelIteration`.

### Gap

- No hay un lane TS7 separado del lane de API TS6.
- No hay scripts/CI que demuestren qué compilador consume `tsc`, `tsc6`, ESLint y `next build`.
- No hay auditoría de las opciones retiradas por TS7 ni de los cambios de JS/JSDoc relevantes para `allowJs`.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `eslint.config.mjs` y workflows CI del portal Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: `tsc`/`tsc6`, ESLint parser, Next build y CI consumen el contrato de compilación; el código de producto sigue siendo consumidor sin nueva primitive.
- Server/browser split: `n/a` — configuración de compilación y lint; no se agregan imports de runtime.
- Build impact: dos binarios TypeScript y paralelización configurable de TS7; preservar el límite de heap hasta contar con medición.
- Extraction blocker: `none` — el lane dual es reversible y no crea un nuevo deployable.

<!-- ZONE 2 — PLAN MODE: lo completa el agente que toma la task. -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Compiler compatibility baseline

- Eliminar `downlevelIteration` del `tsconfig.json` raíz y revisar las demás opciones retiradas por TS7.
- Confirmar que `moduleResolution: Bundler`, `target: ESNext`, `strict`, `isolatedModules` y los paths actuales conservan semántica.
- Auditar archivos JS/JSDoc que estén dentro del programa efectivo o sean procesados por scripts de typecheck.

### Slice 2 — Dual compiler packages and scripts

- Declarar el alias oficial `@typescript/native` para TypeScript 7 y `typescript: npm:@typescript/typescript6@^6.0.2` para la API compatible.
- Regenerar el lockfile y verificar que `pnpm exec tsc` usa TS7, `pnpm exec tsc6` queda disponible y `typescript-eslint` importa TS6.
- Añadir scripts explícitos para `typecheck:ts7` y `typecheck:compat` sin duplicar configuraciones de proyecto.

### Slice 3 — CI, Next build and resource proof

- Ejecutar ambos typechecks en CI y mantener `pnpm lint` sobre el lane TS6 compatible.
- Confirmar que Next.js 16.3 usa el CLI TS7 durante `next build`; el opt-out `experimental.useTypeScriptCli: false` queda sólo como rollback documentado, no como configuración por defecto.
- Medir duración y memoria con el valor por defecto de `--checkers`; fijar un valor menor si el runner CI lo necesita y dejar la razón registrada.

## Out of Scope

- Actualizar reglas type-aware de `TASK-514.5`.
- Migrar ESLint, cambiar de parser o habilitar soporte no oficial de TS7 en `typescript-eslint`.
- Cambiar React, MUI, NextAuth, rutas, APIs, schemas, datos, auth, secrets o workers.
- Corregir deuda histórica de tipos no causada por TS7.
- Activar nuevas features de Next.js o cambiar el editor/language server como requisito de producción.

## Detailed Spec

La configuración de dependencias debe seguir el patrón oficial de convivencia TS6/TS7. TypeScript 7 aporta el binario `tsc`; `@typescript/typescript6` aporta `tsc6` y la API que necesitan herramientas como `typescript-eslint`. El nombre `typescript` debe seguir apuntando al paquete compatible para satisfacer peers e imports de herramientas, mientras el alias nativo expone el CLI nuevo.

La task debe demostrar la resolución real, no sólo revisar `package.json`:

- imprimir versiones de `tsc`/`tsc6` desde los scripts del repositorio;
- ejecutar TS7 con el `tsconfig.json` raíz y sin `downlevelIteration`;
- ejecutar TS6 compatible contra el mismo proyecto y comparar errores relevantes;
- ejecutar ESLint y confirmar que no importa APIs de TS7;
- ejecutar `next build` y verificar en logs/evidencia qué CLI local usa;
- registrar tiempo, peak RSS o equivalente disponible y exit code de cada lane.

El typecheck canónico conserva el límite de heap de 8 GB hasta que la medición TS7 demuestre un valor menor seguro. `--checkers` no se incrementa para perseguir benchmarks; el valor se fija según el runner y el presupuesto de memoria.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 debe cerrar antes de instalar los aliases.
- Slice 2 debe demostrar la resolución dual local antes de editar CI.
- Slice 3 debe pasar en CI y preview antes de considerar TS7 parte del baseline adoptado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `typescript-eslint` recibe TS7 y rompe por API/peer incompatibility | lint/tooling | high | Alias `typescript` a TS6, `tsc6` explícito y no usar TS7 en parser | peer warning, crash del parser o lint no determinista |
| Opción retirada u otra incompatibilidad de TS7 cambia el programa | compiler/config | medium | Auditoría de opciones, typecheck TS6/TS7 y corrección acotada | TS5102 u otros diagnósticos nuevos no clasificados |
| Paralelización TS7 excede memoria del runner | CI/build | medium | Mantener 8 GB, medir `--checkers`, fijar valor conservador | OOM, runner killed o duración regresiva |
| Next build no resuelve el CLI esperado | Next/Vercel | medium | Smoke de `next build`, logs de versión y opt-out documentado sólo como rollback | build usa API incompatible o cambia lane sin evidencia |
| Cambios de JS/JSDoc bajo `allowJs` alteran tipos | compiler/source | low-medium | Auditar programa efectivo y corregir sólo archivos afectados | errores en `.js`/JSDoc nuevos o cambio de inferencia |

### Feature flags / cutover

Sin feature flag de aplicación. El cutover es de tooling: primero local, luego CI/preview y finalmente el build de producción. Revertir aliases, `tsconfig.json` y scripts vuelve al compiler baseline; no se cambian datos ni runtime de negocio.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Restaurar `downlevelIteration` y el `tsconfig` baseline, revertir el commit y reinstalar el lockfile anterior. | <15 min | sí |
| Slice 2 | Revertir aliases/scripts y volver a `typescript@5.9.3`; conservar el lockfile anterior como target explícito. | <15 min | sí |
| Slice 3 | Desactivar la adopción en CI/revertir el commit y promover el build Next/Vercel anterior; no requiere rollback de datos. | <15 min | sí |

### Production verification sequence

1. `pnpm install --frozen-lockfile` en un runner limpio.
2. `pnpm typecheck:ts7` y `pnpm typecheck:compat` verdes con el mismo `tsconfig.json`.
3. `pnpm lint` verde usando la API compatible.
4. `pnpm test` y `pnpm build` verdes; verificar que Next build usa TS7.
5. Repetir en preview Vercel y comparar logs/memoria contra el baseline.
6. Promover sólo mediante el release control plane, con rollback a la revisión y lockfile anteriores.

### Out-of-band coordination required

N/A — cambio repo-only. La preview y eventual promoción siguen la coordinación estándar del release owner; no se esperan secrets ni provisión externa.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] `tsconfig.json` no contiene `downlevelIteration` ni otra opción retirada no justificada por TS7.
- [ ] `pnpm-lock.yaml` instala `@typescript/native`/TypeScript 7 y `@typescript/typescript6` sin peer mismatch no explicado.
- [ ] `pnpm exec tsc` resuelve TypeScript 7 y `pnpm exec tsc6` resuelve TypeScript 6.
- [ ] `pnpm typecheck:ts7` y `pnpm typecheck:compat` pasan sobre el mismo proyecto.
- [ ] `pnpm lint` pasa y `typescript-eslint` continúa usando la API TS6 compatible.
- [ ] `next build` en Next.js 16.3 usa el CLI TS7, sin activar el opt-out por defecto.
- [ ] CI ejecuta ambos lanes, registra tiempo/memoria y no excede el presupuesto de runner.
- [ ] `pnpm task:lint --task TASK-1639`, `pnpm epic:lint` y `pnpm ops:lint --changed` pasan sin errores introducidos por esta task.

## Verification

- `pnpm install --frozen-lockfile`
- `pnpm exec tsc --version`
- `pnpm exec tsc6 --version`
- `pnpm typecheck:ts7`
- `pnpm typecheck:compat`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Preview Vercel con logs de versión y memoria
- `pnpm task:lint --task TASK-1639`
- `pnpm epic:lint`
- `pnpm ops:lint --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas.
- [ ] `TASK-1638` quedó cerrada antes de tomar esta task.

## Follow-ups

- Actualizar `TASK-514.5` sólo cuando `typescript-eslint` documente soporte para TS7 o exista una decisión explícita de experimentar con ese lane.
- Si el lane dual se convierte en un contrato permanente de plataforma, evaluar una ADR dedicada antes de cambiarlo de nuevo.
