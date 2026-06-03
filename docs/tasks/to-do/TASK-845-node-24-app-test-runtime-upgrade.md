# TASK-845 — Node 24 App/Test Runtime Upgrade

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno actualizado 2026-06-03`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-845-node-24-app-test-runtime-upgrade`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Subir el runtime de aplicacion, tests y builds de Greenhouse desde Node.js 20 a Node.js 24.x LTS, sin mezclarlo con la migracion ya cerrada de GitHub Actions runtime en TASK-607.

La task debe dejar un contrato explicito y portable para Node 24 en `package.json`, archivos locales de version, GitHub Actions y Vercel, validando que Next.js 16, pnpm, Vitest, Playwright, scripts operativos y deploys sigan sanos.

## Why This Task Exists

TASK-607 cerro el warning de GitHub Actions migrando actions compatibles con runtime interno Node.js 24 (`checkout@v5`, `setup-node@v5`, `upload-artifact@v7`, etc.). Ese cierre no cambia el runtime de la app ni de los jobs: los workflows principales siguen usando `node-version: 20`.

Node.js 20 alcanzo fin de mantenimiento oficial el 2026-04-30; al 2026-05-18 Node 24.x es el target LTS vigente para este upgrade. Vercel soporta Node 24.x para builds y functions, lo ofrece como default para proyectos nuevos y permite que `package.json#engines.node` overridee Project Settings. Mantener app/tests en Node 20 aumenta riesgo de seguridad, drift de tooling y comportamiento distinto entre Vercel/CI/local.

## Goal

- Declarar Node 24.x como runtime canonico de app, tests, builds y deploys del portal.
- Sincronizar local tooling, CI y Vercel para que no existan runtimes divergentes.
- Validar compatibilidad real de Next.js 16, pnpm, Vitest, Playwright, scripts del repo y Cloud/Vercel deploy path bajo Node 24.
- Documentar cualquier incompatibilidad encontrada y resolverla en la primitive correcta, no con workaround local.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_GIT_HOOKS_AUTOENFORCEMENT_V1.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No reabrir TASK-607: esa task resolvio el runtime interno de GitHub Actions. Esta task cambia el runtime de app/tests/builds.
- Usar Node 24.x LTS, no Node 26 Current.
- No abrir una task separada para Node 26 ahora: Node 26 sigue en `Current` y no debe ser runtime productivo hasta LTS + soporte claro de Vercel Functions. El seguimiento vive como follow-up futuro de esta task.
- No usar `>=20` como contrato final: Vercel mapearia a latest 24.x hoy, pero el repo debe expresar explicitamente `24.x` para evitar ambiguedad.
- No usar `>=22` ni `>=24` como contrato final: rangos abiertos permiten upgrades mayores futuros sin decision explicita. Usar `24.x`.
- No romper hooks canonicos Husky/lint-staged ni saltarlos con `--no-verify`.
- Si aparece incompatibilidad con una dependencia o script, resolver causa raiz en el script/helper/config compartido correspondiente; no fijar hacks por workflow aislado.
- No declarar la task cerrada solo porque el build local pasa: debe haber evidencia de clean install, CI, Playwright y Vercel.

## Normative Docs

- `docs/tasks/complete/TASK-607-github-actions-nodejs-24-migration.md`
- `docs/documentation/plataforma/reliability-control-plane.md`
- `docs/documentation/plataforma/git-hooks-pre-commit-pre-push.md`
- `changelog.md`
- Node.js release schedule oficial: `https://nodejs.org/en/about/previous-releases`
- Node.js Release Working Group schedule: `https://github.com/nodejs/Release`
- Vercel Supported Node.js versions: `https://vercel.com/docs/functions/runtimes/node-js/node-js-versions`
- Vercel Node version file conformance: `https://vercel.com/docs/conformance/rules/REQUIRE_NODE_VERSION_FILE`
- Vercel Sandbox Node 26 changelog (solo referencia de no-alcance para production functions): `https://vercel.com/changelog/node-js-26-x-now-available-on-vercel-sandboxes`

## Dependencies & Impact

### Depends on

- TASK-607 completa: `docs/tasks/complete/TASK-607-github-actions-nodejs-24-migration.md`
- Vercel soporte Node 24.x para builds/functions.
- Runtime actual repo:
  - `package.json`
  - `.github/workflows/ci.yml`
  - `.github/workflows/ci-deep.yml`
  - `.github/workflows/task-contract.yml`
  - `.github/workflows/playwright.yml`
  - `.github/workflows/reliability-verify.yml`
  - `.github/workflows/design-contract.yml`
  - `vercel.json`

### Blocks / Impacts

- CI `develop`
- Playwright smoke lane
- Vercel Staging/Preview/Production build runtime
- Hooks locales pre-commit/pre-push
- Scripts Node/tsx del repo (`scripts/**`, `services/**`)
- Future dependency upgrades that already expect Node 24 types/runtime

### Files owned

- `package.json`
- `.nvmrc` (nuevo si no existe)
- `.node-version` (opcional; si se agrega debe tener exactamente el mismo contenido que `.nvmrc`)
- `.github/workflows/ci.yml`
- `.github/workflows/ci-deep.yml`
- `.github/workflows/task-contract.yml`
- `.github/workflows/playwright.yml`
- `.github/workflows/reliability-verify.yml`
- `.github/workflows/design-contract.yml`
- `vercel.json` (solo si hace falta documentar runtime o validar que no contradice el contrato)
- `docs/tasks/to-do/TASK-845-node-24-app-test-runtime-upgrade.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/documentation/plataforma/reliability-control-plane.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `package.json` usa `next` `16.1.1` y `@types/node` `24.10.1`.
- Workflows ya usan actions Node 24-compatible por TASK-607.
- Workflows principales siguen ejecutando app/tests con `node-version: 20`.
- Verificacion 2026-06-03:
  - `node-version: 20` aparece en `.github/workflows/ci.yml`, `.github/workflows/playwright.yml`, `.github/workflows/design-contract.yml`, `.github/workflows/ci-deep.yml`, `.github/workflows/task-contract.yml` y dos jobs de `.github/workflows/reliability-verify.yml`.
  - `node-version: '24'` ya aparece en `.github/workflows/production-release.yml` y `.github/workflows/production-release-watchdog.yml`.
  - shell local observado: Node `22.22.2`; `pnpm` `10.32.1`; `packageManager` `pnpm@10.32.1`.
  - Vercel CLI (`vercel project ls --scope efeonce-7670142f`) muestra `greenhouse-eo` con `Node Version` = `24.x`.
  - Cloud Run worker Dockerfiles siguen en `node:22-slim` (`services/ops-worker`, `services/commercial-cost-worker`, `services/ico-batch`); quedan inventariados como runtime container separado y no deben bloquear el corte portal/Vercel.
- No existe `.nvmrc` ni `.node-version` al momento de reforzar esta task.
- Vercel soporta Node 24.x para builds/functions y permite override via `engines.node` en `package.json`.
- Node 26 existe, pero al 2026-06-03 sigue como `Current`; Vercel anuncio soporte Node 26 para Sandboxes, no como senal suficiente para migrar Greenhouse Functions production.

### Gap

- No hay contrato repo-local explicito para Node 24.x.
- CI y smoke lanes siguen usando Node 20 como runtime de app/tests.
- Vercel puede quedar gobernado por settings externos si `package.json` no declara `engines.node`.
- La documentacion de TASK-607 aclara que `node-version: 20` era separado, pero no hay follow-up ejecutable para completar el upgrade del runtime real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Runtime contract

- Confirmar tags/soporte vigente de Node 24.x en Vercel y GitHub Actions al momento de ejecutar.
- Agregar `engines.node = "24.x"` en `package.json`.
- Crear `.nvmrc` con contenido exacto `24` como version file local canonico.
- Agregar `.node-version` solo si se decide soportar herramientas tipo asdf/mise; si se agrega, su contenido debe ser exactamente `24` y la documentacion debe explicar que `.nvmrc` sigue siendo el archivo canonico humano.
- Verificar que `pnpm` actual funciona bajo Node 24 o ajustar `packageManager`/Corepack si el repo lo requiere.
- No activar `engine-strict=true` en `.npmrc` en este slice salvo que todos los ambientes locales/CI/Vercel ya esten probados con Node 24 y el equipo acepte el corte duro. `engines.node` gobierna Vercel; el enforcement local puede quedar como follow-up si hace falta.

### Slice 2 — CI runtime cutover

- Cambiar `node-version: 20` a `node-version: 24` en workflows que ejecutan app/tests/builds.
- Validar con `rg -n "node-version: 20|node-version: '20'|node-version: \"20\"" .github/workflows` que no quedan jobs de app/tests/builds en Node 20.
- Mantener intactas las actions Node 24-compatible ya resueltas por TASK-607.
- Revisar workflows de deploy/worker que no usan `setup-node` para confirmar si necesitan contrato explicito o si corren en runtime container separado.
- Confirmar que `.github/workflows/ci-deep.yml` y `.github/workflows/task-contract.yml` quedan cubiertos por el corte si ejecutan scripts del repo, aunque no sean deploy paths.

### Slice 3 — Local and script compatibility

- Ejecutar con Node 24 real, no solo editar YAML.
- Ejecutar un install limpio bajo Node 24:
  - `corepack enable`
  - `pnpm install --frozen-lockfile`
  - preferir worktree limpio o remover `node_modules` solo dentro de un workspace aislado si se necesita detectar native/prebuilt dependency drift
- Validar scripts core:
  - `pnpm lint`
  - `pnpm exec tsc --noEmit`
  - `pnpm test`
  - `pnpm build`
  - `pnpm design:lint` si el cambio toca docs/contrato visual indirectamente
- Validar al menos un script operativo `tsx` que use bootstrap real de repo y no solo Next/Vitest; minimo recomendado:
  - `pnpm docs:context-check`
  - `pnpm migration-marker-gate:test`
- Si falla un script por cambio de Node 24, corregir el script/helper compartido y agregar regresion focal cuando aplique.

### Slice 4 — E2E and deploy verification

- Correr Playwright smoke relevante bajo Node 24.
- Validar en GitHub Actions post-push:
  - CI success
  - Playwright success
  - sin warnings de Node 20 actions
  - logs muestran `Setup Node.js` con Node 24 para app/tests
- Verificar Vercel build/runtime:
  - via `engines.node` o Project Settings/CLI segun corresponda
  - incluir evidencia concreta de deployment/build log o `process.version` que muestre Node 24.x
  - si Vercel Project Settings siguen en 20.x/22.x, documentar que `engines.node=24.x` overridea settings o corregir settings con Vercel CLI si corresponde
  - si Vercel Project Settings ya estan en `24.x`, documentar evidencia CLI y mantener `engines.node=24.x` igualmente como SSOT de repo
  - dejar evidencia en `Handoff.md`

### Slice 5 — Documentation and closeout

- Actualizar `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` para reemplazar la nota transicional de `node-version: 20`.
- Actualizar documentacion funcional de plataforma si cambia el contrato operativo para agentes.
- Actualizar `project_context.md`, `Handoff.md` y `changelog.md`.
- Sincronizar lifecycle de la task y `docs/tasks/README.md`.

## Out of Scope

- No migrar a Node 26 mientras no sea LTS.
- No crear ni ejecutar una task Node 26 readiness en este ciclo; re-evaluar cerca de octubre 2026, cuando Node 26 entre a LTS y Vercel Functions tenga soporte productivo documentado.
- No cambiar version mayor de Next.js, React, pnpm o Playwright salvo incompatibilidad demostrada por Node 24.
- No modificar codigo funcional de dominios Greenhouse salvo que un test demuestre incompatibilidad real con Node 24.
- No reabrir ni repetir TASK-607.
- No tocar Cloud Run container base images si no consumen el runtime Node del portal; si aparece drift, abrir follow-up separado.

## Detailed Spec

### Runtime target

- Target: Node.js `24.x` LTS.
- `package.json` debe declarar:

```json
"engines": {
  "node": "24.x"
}
```

- Workflows que hoy usan `node-version: 20` deben pasar a `node-version: 24`.
- Workflows confirmados al 2026-06-03: `.github/workflows/ci.yml`, `.github/workflows/playwright.yml`, `.github/workflows/design-contract.yml`, `.github/workflows/ci-deep.yml`, `.github/workflows/task-contract.yml` y dos jobs de `.github/workflows/reliability-verify.yml`.
- `.nvmrc` debe declarar `24`. `.node-version` solo existe si declara el mismo valor.
- La task debe comprobar que `@types/node` ya esta en version compatible y que no hay polyfills/hacks para Node 20 que deban retirarse.

### Architecture decision

Esta task no crea una nueva semantica de producto, pero si cambia contrato operativo de plataforma. Debe registrarse como decision distribuida o delta en la arquitectura de Reliability/Platform:

- Node 24.x es el runtime canonico de app/tests/builds.
- GitHub Actions runtime interno y app runtime son planos distintos.
- `engines.node` gobierna Vercel para evitar dependencia silenciosa de settings externos.

### Robustness guardrails

- Si una dependencia no soporta Node 24, no degradar todo el repo a Node 22/20 sin checkpoint humano.
- Si un test falla por timing/flakiness no relacionado, usar el parser smoke-lane canonico y distinguir flake de fallo final.
- Si Vercel Settings contradicen `engines.node`, resolver la fuente de verdad con CLI y documentar el resultado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (runtime contract) debe shippear antes de Slice 2 (CI cutover), porque CI debe leer el contrato canonico del repo. Slice 2 debe cerrar antes de declarar compatible Slice 3/4: no basta validar local si los workflows siguen en Node 20. Slice 4 (E2E/deploy evidence) debe ejecutarse antes de Slice 5 (docs + cierre). Los worker Dockerfiles `node:22-slim` no bloquean este orden; si se decide migrarlos, abrir follow-up con rollout Cloud Run separado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Dependencia nativa o prebuilt falla bajo Node 24 durante install/build | local/CI/build | medium | Clean install bajo Node 24 antes de merge; corregir dependencia/script compartido, no bajar runtime | install/build logs |
| CI queda parcialmente partido entre Node 20 y 24 | CI/reliability | medium | `rg node-version: 20` obligatorio; cubrir `ci`, `ci-deep`, `task-contract`, `design-contract`, `playwright`, `reliability-verify` | GitHub Actions logs |
| Vercel usa Project Settings en vez del contrato repo | Vercel deploy/runtime | low | `engines.node=24.x` + evidencia CLI/deployment; documentar si settings ya estan en 24.x | Vercel build log / `process.version` |
| Playwright/GVC muestra flake no atribuible al runtime | E2E/UI verification | medium | Re-run acotado y clasificar con smoke-lane semantics; no cerrar si falla reproducible bajo Node 24 | Playwright report |
| Cloud Run workers quedan en Node 22 y se confunden con runtime portal | Cloud Run workers | low | Inventariar como fuera de alcance; follow-up separado si se homogeneiza base image | Dockerfile inventory / deploy notes |

### Feature flags / cutover

No hay feature flag runtime. El cutover se controla por contrato de repo (`engines.node=24.x`, `.nvmrc`) y por `node-version: 24` en workflows. Vercel ya reporta `24.x` para `greenhouse-eo`, pero el repo debe declararlo igualmente para evitar drift silencioso.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revertir `engines.node` y version files si install/build falla antes de CI cutover | <10 min | si |
| 2 | Revertir workflow `node-version: 24` a `20` solo con checkpoint humano y evidencia de incompatibilidad real | <10 min | si |
| 3 | Revertir fix focal de script/dependencia si no corresponde; no degradar runtime sin decision | variable | si |
| 4 | Revertir deployment/config o mantener `engines.node=24.x` y corregir fallo si Vercel ya esta sano en 24.x | <30 min | si |
| 5 | Revertir docs si el cierre no coincide con evidencia real | <10 min | si |

### Production verification sequence

1. Ejecutar Node 24 local + clean install + checks core.
2. Confirmar `rg node-version: 20` sin jobs app/tests/builds pendientes.
3. Push/PR y verificar CI + Playwright corriendo con Node 24.
4. Verificar Vercel build/runtime con evidencia concreta.
5. Actualizar docs vivas, Handoff y cerrar lifecycle de TASK-845.

### Out-of-band coordination required

Coordinar cualquier cambio de Vercel Project Settings si la evidencia CLI contradice el contrato de repo. Coordinar Cloud Run worker base images solo si se abre follow-up dedicado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `package.json` declara `engines.node = "24.x"`.
- [ ] `.nvmrc` existe y contiene `24`; si `.node-version` existe, tambien contiene `24`.
- [ ] `rg -n "node-version: 20|node-version: '20'|node-version: \"20\"" .github/workflows` no devuelve jobs de app/tests/builds pendientes.
- [ ] Clean install bajo Node 24 (`corepack enable` + `pnpm install --frozen-lockfile`) termina sin errores.
- [ ] CI en GitHub corre con Node 24 para app/tests y termina success.
- [ ] Playwright smoke corre con Node 24 y termina success o publica failure real con evidencia clara no atribuible al upgrade.
- [ ] Vercel queda gobernado por Node 24.x para nuevos deployments, via `engines.node` y/o settings verificados, con evidencia de build/deployment.
- [ ] Worker Dockerfiles `node:22-slim` quedan revisados y documentados como fuera de alcance o follow-up separado, sin bloquear el runtime portal/Vercel.
- [ ] Documentacion viva diferencia claramente entre runtime interno de GitHub Actions y runtime de app/tests.
- [ ] No se introducen workarounds temporales sin owner, condicion de retiro y follow-up.

## Verification

- `node -v` bajo Node 24 local antes de correr checks.
- `corepack enable`
- `pnpm install --frozen-lockfile`
- `rg -n "node-version: 20|node-version: '20'|node-version: \"20\"" .github/workflows`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm docs:context-check`
- `pnpm migration-marker-gate:test`
- `pnpm exec playwright test tests/e2e/smoke/login-session.spec.ts tests/e2e/smoke/cron-staging-parity.spec.ts --project=chromium --workers=1`
- Post-push: verificar GitHub CI + Playwright run logs.
- Verificar Vercel runtime con CLI o deployment evidence.

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado con evidencia de Node 24 local, CI, Playwright y Vercel.
- [ ] `Handoff.md` incluye el output/resumen de `node -v`, clean install, `rg node-version`, CI run IDs, Playwright run ID y evidencia Vercel.
- [ ] `project_context.md` quedo actualizado si el contrato runtime cambia.
- [ ] `changelog.md` quedo actualizado.
- [ ] Arquitectura/documentacion funcional de plataforma quedo actualizada.
- [ ] Se ejecuto chequeo de impacto cruzado sobre TASK-607, workflows y deploys.

## Follow-ups

- Evaluar Node 26 solo cuando entre a LTS (plan Node.js: octubre 2026) y Vercel lo soporte para production functions runtime, no solo para Sandboxes.
- Si se decide homogeneizar Cloud Run service Dockerfiles (`services/ops-worker`, `services/commercial-cost-worker`, `services/ico-batch`) de `node:22-slim` a `node:24-slim`, abrir task separada por servicio o batch de workers con deploy/rollback Cloud Run propio.

## Open Questions

- Ninguna bloqueante. Decision inicial: target `24.x` por ser LTS vigente y soporte oficial en Vercel/GitHub Actions.
