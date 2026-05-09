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
- Status real: `Diseno`
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

TASK-607 cerro el warning de GitHub Actions migrando actions compatibles con runtime interno Node.js 24 (`checkout@v5`, `setup-node@v5`, `upload-artifact@v7`, etc.). Ese cierre no cambia el runtime de la app ni de los jobs: los workflows siguen usando `node-version: 20`.

Node.js oficial marca Node 20 como EOL al 2026, mientras Node 24 es LTS vigente. Vercel soporta Node 24.x para builds y functions y lo usa como default para proyectos nuevos. Mantener app/tests en Node 20 aumenta riesgo de seguridad, drift de tooling y comportamiento distinto entre Vercel/CI/local.

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
- No usar `>=20` como contrato final: Vercel mapearia a latest 24.x hoy, pero el repo debe expresar explicitamente `24.x` para evitar ambiguedad.
- No romper hooks canonicos Husky/lint-staged ni saltarlos con `--no-verify`.
- Si aparece incompatibilidad con una dependencia o script, resolver causa raiz en el script/helper/config compartido correspondiente; no fijar hacks por workflow aislado.

## Normative Docs

- `docs/tasks/complete/TASK-607-github-actions-nodejs-24-migration.md`
- `docs/documentation/plataforma/reliability-control-plane.md`
- `docs/documentation/plataforma/git-hooks-pre-commit-pre-push.md`
- `changelog.md`

## Dependencies & Impact

### Depends on

- TASK-607 completa: `docs/tasks/complete/TASK-607-github-actions-nodejs-24-migration.md`
- Vercel soporte Node 24.x para builds/functions.
- Runtime actual repo:
  - `package.json`
  - `.github/workflows/ci.yml`
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
- `.node-version` (nuevo si se decide estandarizar tambien para asdf/mise; evitar duplicidad si el repo define uno como canonico)
- `.github/workflows/ci.yml`
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
- No existe `.nvmrc` ni `.node-version` al momento de crear esta task.
- Vercel soporta Node 24.x para builds/functions y permite override via `engines.node` en `package.json`.

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
- Crear el archivo local de version canonico (`.nvmrc` con `24`) y decidir si tambien corresponde `.node-version`; si se agrega ambos, documentar por que no genera ambiguedad.
- Verificar que `pnpm` actual funciona bajo Node 24 o ajustar `packageManager`/Corepack si el repo lo requiere.

### Slice 2 — CI runtime cutover

- Cambiar `node-version: 20` a `node-version: 24` en workflows que ejecutan app/tests/builds.
- Mantener intactas las actions Node 24-compatible ya resueltas por TASK-607.
- Revisar workflows de deploy/worker que no usan `setup-node` para confirmar si necesitan contrato explicito o si corren en runtime container separado.

### Slice 3 — Local and script compatibility

- Ejecutar con Node 24 real, no solo editar YAML.
- Validar scripts core:
  - `pnpm lint`
  - `pnpm exec tsc --noEmit`
  - `pnpm test`
  - `pnpm build`
  - `pnpm design:lint` si el cambio toca docs/contrato visual indirectamente
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
  - dejar evidencia en `Handoff.md`

### Slice 5 — Documentation and closeout

- Actualizar `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` para reemplazar la nota transicional de `node-version: 20`.
- Actualizar documentacion funcional de plataforma si cambia el contrato operativo para agentes.
- Actualizar `project_context.md`, `Handoff.md` y `changelog.md`.
- Sincronizar lifecycle de la task y `docs/tasks/README.md`.

## Out of Scope

- No migrar a Node 26 mientras no sea LTS.
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

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `package.json` declara `engines.node = "24.x"`.
- [ ] Existe archivo local de version Node canonico y documentado (`.nvmrc` y/o `.node-version`).
- [ ] No quedan `node-version: 20` en workflows que ejecutan app/tests/builds.
- [ ] CI en GitHub corre con Node 24 para app/tests y termina success.
- [ ] Playwright smoke corre con Node 24 y termina success o publica failure real con evidencia clara no atribuible al upgrade.
- [ ] Vercel queda gobernado por Node 24.x para nuevos deployments, via `engines.node` y/o settings verificados.
- [ ] Documentacion viva diferencia claramente entre runtime interno de GitHub Actions y runtime de app/tests.
- [ ] No se introducen workarounds temporales sin owner, condicion de retiro y follow-up.

## Verification

- `node -v` bajo Node 24 local antes de correr checks.
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`
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
- [ ] `project_context.md` quedo actualizado si el contrato runtime cambia.
- [ ] `changelog.md` quedo actualizado.
- [ ] Arquitectura/documentacion funcional de plataforma quedo actualizada.
- [ ] Se ejecuto chequeo de impacto cruzado sobre TASK-607, workflows y deploys.

## Follow-ups

- Evaluar Node 26 solo cuando entre a LTS y Vercel lo soporte para production runtime.
- Si Cloud Run service Dockerfiles quedan en Node 20/22 por base image propia, abrir task separada por servicio con ownership aislado.

## Open Questions

- Ninguna bloqueante. Decision inicial: target `24.x` por ser LTS vigente y soporte oficial en Vercel/GitHub Actions.
