# TASK-1638 — Next.js 16.3 Framework Alignment

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
- Blocked by: `none`
- Branch: `develop (shared checkout; sin worktrees)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Alinear el portal Greenhouse a Next.js `16.3.0`, junto con `eslint-config-next` `16.3.0` y el lockfile, y demostrar que el runtime actual sigue desplegable. La task conserva React/MUI y las capacidades experimentales existentes; no introduce features nuevas de Next.js.

## Why This Task Exists

El repositorio tiene `next@16.1.1` y `eslint-config-next@16.2.4`, por lo que el framework y su configuración de lint no están alineados. El portal ya usa `proxy.ts`, APIs dinámicas asíncronas y un wrapper de build con `distDir`/memoria propios; el riesgo real está en la resolución de dependencias, Turbopack persistente, SSR/hydration y el camino Vercel, no en una migración de arquitectura de rutas.

## Goal

- Actualizar `next` y `eslint-config-next` a `16.3.0` con lockfile reproducible.
- Validar `pnpm dev`/Webpack, `pnpm dev:turbo`/Turbopack y `pnpm build` con builds clean y warm.
- Confirmar que proxy, auth, rutas dinámicas, SSR/hydration de MUI, redirects, fuentes y Sentry conservan el comportamiento actual.
- Dejar un rollback claro a la combinación anterior sin tocar datos ni contratos de producto.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/12-testing-development.md`
- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Mantener el portal en el runtime actual y no crear `apps/*`/`packages/*` como parte del upgrade.
- Mantener `pnpm` como package manager y verificar siempre con `pnpm install --frozen-lockfile` después de actualizar el lockfile.
- Reusar `next.config.ts` y `scripts/run-next-build.mjs`; cualquier ajuste debe ser mínimo, reversible y justificado por evidencia.
- No mezclar upgrades mayores de React, MUI, NextAuth, `next-intl` o Sentry con esta task.
- No activar `cacheComponents`, React Compiler, instant navigation u otras features experimentales nuevas.

## Normative Docs

- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- [Next.js v16.3.0 release notes](https://github.com/vercel/next.js/releases/tag/v16.3.0)
- [Next.js TypeScript CLI by default](https://github.com/vercel/next.js/pull/96497)

## Dependencies & Impact

### Depends on

- Baseline actual de Node `24.x` y React `19.2.3` en `package.json`.
- `scripts/run-next-build.mjs`, que fija la memoria del build y el `distDir` aislado.
- `next.config.ts`, que configura `basePath`, redirects, Sentry y `experimental.viewTransition` existente.
- `.github/workflows/ci.yml`, `.github/workflows/ci-deep.yml`, `.github/workflows/playwright.yml` y `.github/workflows/production-release.yml`.

### Blocks / Impacts

- Desbloquea `TASK-1639` — TypeScript 7 dual compiler adoption.
- Impacta instalación reproducible, lint, build Turbopack, preview Vercel y release control plane.
- Debe mantener compatible `TASK-514.5`, que trabaja sobre el stack de ESLint y `typescript-eslint`.

### Files owned

- `package.json`
- `pnpm-lock.yaml`
- `next.config.ts` si la evidencia exige un ajuste mínimo
- `scripts/run-next-build.mjs` si la nueva caché/build requiere una corrección acotada
- `.github/workflows/ci.yml`
- `.github/workflows/ci-deep.yml`
- `.github/workflows/playwright.yml`
- `.github/workflows/production-release.yml`
- `docs/tasks/to-do/TASK-1638-nextjs-16-3-framework-alignment.md`

## Current Repo State

### Already exists

- Next.js `16.1.1`, `eslint-config-next` `16.2.4`, React/React DOM `19.2.3`, Node `24.x`.
- `src/proxy.ts`; no `middleware.ts` activo.
- Firmas con `Promise` para `params`/`searchParams` en las rutas dinámicas activas.
- `cookies()` y `headers()` ya se consumen con `await` en los helpers activos.
- `pnpm dev` fuerza Webpack; `pnpm dev:turbo` usa Turbopack; `pnpm build` usa `scripts/run-next-build.mjs`.
- `pnpm lint` y el typecheck canónico pasan en el baseline actual.

### Gap

- Framework y `eslint-config-next` están desalineados.
- No existe evidencia local de clean/warm build con Next.js `16.3.0` ni de su caché persistente de Turbopack sobre el wrapper actual.
- No existe evidencia de preview Vercel con el nuevo lockfile.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `scripts/run-next-build.mjs` y workflows CI/release del portal Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: package manager, framework build, lint/build scripts y workflows son consumidos por el único deployable actual; no se crea una primitive de dominio.
- Server/browser split: `n/a` — la task cambia toolchain y build; no importa módulos nuevos al navegador.
- Build impact: `Turbopack` persistente y CLI local de TypeScript de Next.js 16.3; no se agregan dependencias pesadas fuera del framework.
- Extraction blocker: `none` — cualquier futura separación de build debe ser una decisión independiente con evidencia de EPIC-027.

<!-- ZONE 2 — PLAN MODE: lo completa el agente que toma la task. -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Version and lock alignment

- Actualizar `next` y `eslint-config-next` a `16.3.0` y regenerar `pnpm-lock.yaml` sin actualizar dependencias no relacionadas.
- Mantener React/React DOM, MUI, NextAuth, `next-intl` y Sentry en sus versiones actuales salvo incompatibilidad demostrada.
- Ejecutar `pnpm install --frozen-lockfile` en una instalación limpia y registrar cualquier peer warning relevante.

### Slice 2 — Local build and development proof

- Ejecutar `pnpm lint`, typecheck, tests y `pnpm build` con el wrapper existente.
- Repetir `pnpm build` para medir y validar clean/warm build, incluyendo el comportamiento de la caché persistente de Turbopack.
- Probar `pnpm dev` y `pnpm dev:turbo` con smoke de rutas críticas, proxy, auth, redirects, SSR/hydration y assets.

### Slice 3 — Preview and rollback evidence

- Validar el artefacto en preview Vercel y conservar la revisión previa como rollback.
- Confirmar que el release control plane puede promover el SHA correcto y que revertir `package.json`/lockfile restaura el baseline.

## Out of Scope

- TypeScript 7, que vive en `TASK-1639`.
- React Compiler, `cacheComponents`, instant navigation, nueva estrategia de caché de aplicación o cambio de `viewTransition`.
- Migración de rutas, reescritura de componentes, cambios de API, schema, datos, secrets o autenticación.
- Creación de nuevos deployables, paquetes, servicios o worktrees.

## Detailed Spec

Next.js 16.3 incorpora cambios de Turbopack y habilita por defecto el CLI local de TypeScript. El build del repositorio debe probarse con su `distDir` aislado y con `NODE_OPTIONS` de 8 GB, sin asumir que una compilación exitosa en un único estado de caché demuestra correctitud.

La task debe comparar, como mínimo:

- clean build después de limpiar el output/cache local permitido por el wrapper;
- segundo build warm con el mismo SHA y lockfile;
- build con los mismos inputs en CI/preview;
- desarrollo por Webpack (`pnpm dev`) y Turbopack (`pnpm dev:turbo`).

El flag existente `experimental.viewTransition` se conserva sin ampliarlo. Si aparece una incompatibilidad que requiere un opt-out de una feature de Next.js, documentar el flag, el owner y el retiro; no introducir un bypass silencioso.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 debe cerrar instalación y lockfile antes de cualquier evidencia de build.
- Slice 2 debe pasar localmente antes de preview.
- Slice 3 debe pasar en preview antes de cualquier promoción; rollback disponible en cada paso.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Peer o lockfile incompatible con Next 16.3 | platform/tooling | medium | Versiones exactas, instalación congelada y diff acotado | install/build falla o peer warning nuevo no explicado |
| Caché persistente de Turbopack contamina `distDir`/outputs aislados | build/Vercel | medium | Clean/warm build, comparación de outputs y verificación de wrapper | rutas faltantes, hashes inesperados o fallo sólo en warm build |
| Divergencia entre Webpack dev y Turbopack build/dev | development/build | medium | Smoke explícito de ambos caminos | error de HMR, CSS, loaders o resolución sólo en uno |
| Regresión SSR/hydration en MUI/auth/proxy | runtime UI | low-medium | Smoke de rutas protegidas/públicas, consola y payload HTML/RSC | hydration warning, redirect incorrecto o 5xx |

### Feature flags / cutover

Sin feature flag de aplicación: es un cambio de dependencias y build. Cutover mediante preview Vercel y promoción del SHA aprobado. Rollback mediante revisión Vercel previa o revert del commit de `package.json`/`pnpm-lock.yaml`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir el commit de versiones/lockfile, ejecutar instalación congelada y volver a la revisión Vercel anterior. | <15 min | sí |
| Slice 2 | Promover la revisión Vercel anterior; si el problema es local/CI, restaurar el lockfile baseline y repetir gates. | <15 min | sí |
| Slice 3 | Detener promoción y seleccionar la revisión Vercel previa; no ejecutar cambios de datos ni secrets. | <10 min | sí |

### Production verification sequence

1. `pnpm install --frozen-lockfile` en CI.
2. `pnpm lint`, `pnpm typecheck` y `pnpm test` verdes.
3. `pnpm build` clean y segunda ejecución warm verdes.
4. Preview Vercel con smoke de proxy, auth, redirects, rutas dinámicas, SSR/hydration, assets y Sentry.
5. Confirmar SHA, logs y revisión de rollback en el release control plane.
6. Promover sólo después de la aprobación proporcional del release; monitorear errores de runtime y build.

### Out-of-band coordination required

Vercel preview y promoción productiva requieren coordinación estándar del release owner. No se esperan nuevos secrets, recursos cloud, migraciones ni cambios externos.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] `package.json` declara `next: 16.3.0` y `eslint-config-next: 16.3.0`, sin upgrades no relacionados aprobados dentro de esta task.
- [ ] `pnpm-lock.yaml` es reproducible y `pnpm install --frozen-lockfile` pasa.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm test` pasan con el nuevo framework.
- [ ] Dos ejecuciones consecutivas de `pnpm build` pasan y no muestran contaminación de output/cache.
- [ ] `pnpm dev` y `pnpm dev:turbo` pasan smoke de las rutas críticas sin regresiones de proxy, auth, redirects, SSR/hydration o assets.
- [ ] Preview Vercel queda verificado con SHA identificable y rollback a la revisión anterior documentado.
- [ ] `pnpm task:lint --task TASK-1638`, `pnpm epic:lint` y `pnpm ops:lint --changed` pasan sin errores introducidos por esta task.

## Verification

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm build`
- Smoke manual de `pnpm dev` y `pnpm dev:turbo`
- Preview Vercel y release control plane
- `pnpm task:lint --task TASK-1638`
- `pnpm epic:lint`
- `pnpm ops:lint --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas.
- [ ] `TASK-1639` recibió el resultado de esta task como dependencia explícita.

## Follow-ups

- `TASK-1639` — TypeScript 7 dual compiler adoption.
- Si Next.js 16.3 exige un ajuste no reversible de configuración, detenerse y abrir la decisión arquitectónica correspondiente antes de implementarlo.
