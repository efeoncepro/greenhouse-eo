# TASK-1166 — Kortex GitHub Repo Control Plane

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `optional`
- Status real: `Complete — staging deploy + smokes verdes`
- Rank: `TBD`
- Domain: `platform|integrations|ops|ecosystem|kortex|github`
- Blocked by: `none`
- Branch: `task/TASK-1166-kortex-github-repo-control-plane`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el control-plane GitHub de Kortex dentro de Greenhouse: reader server-only para estado del repo `efeoncepro/kortex`, workflows, runs, branches, PRs/releases y deploy signals; y un primer adapter de comandos GitHub gobernados para acciones no destructivas o estrictamente allowlisted. Es el complemento de TASK-1162/TASK-1164/TASK-1165: hoy Greenhouse opera runtime Kortex, pero no gobierna el repo, CI ni el rail de cambios de Kortex desde Greenhouse.

## Why This Task Exists

El operador pidio controlar el repo Kortex y sus capacidades desde Greenhouse. TASK-1162 ya lee el repo de forma basica y TASK-1164/TASK-1165 ya ejecutan capacidades runtime Kortex, pero el control de GitHub queda incompleto: Greenhouse no ve en un contrato dedicado los workflows/runs/branches/PRs/releases del repo Kortex, no tiene status de CI/deploy como fuente operacional propia y no puede disparar acciones de repo de forma gobernada.

Sin esta task, operar Kortex desde Greenhouse queda dividido: runtime por adapter Kortex, repo/CI por `gh` manual. Esta task cierra la capa backend/API primero; una UI operacional puede venir despues consumiendo este contrato.

## Goal

- Reader canónico `greenhouse-kortex-github-control-plane.v1` para repo `efeoncepro/kortex`, compuesto desde GitHub API con timeout, redaccion y degradacion honesta.
- Exponer workflow `CI`, runs recientes, ramas principales, PRs/issues/releases y señales de divergencia `main`/`develop`/runtime Kortex sin hacer writes.
- Agregar endpoint admin `GET /api/admin/kortex/github-control-plane` con auth admin y contrato versionado.
- Agregar comandos GitHub gobernados y allowlisted solo para acciones seguras o explícitas, por ejemplo workflow dispatch read-safe/dry-run, rerun failed workflow y request de sync/deploy si el workflow existe.
- Reusar `src/lib/release/github-helpers.ts`, `src/lib/release/github-app-token-resolver.ts`, `src/lib/kortex/control-plane/**` y `greenhouse_core.api_platform_command_executions`; no crear un cliente GitHub paralelo ni proxy arbitrario.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`
- `docs/architecture/kortex/README.md`
- `docs/architecture/kortex/governance/guardrails-and-boundaries.md`
- `docs/architecture/kortex/operations/runbook.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- **Read/API-first.** La UI, agentes y futuros MCP consumen readers/commands Greenhouse; no hablan con GitHub directo.
- **No proxy GitHub arbitrario.** Todo endpoint/command debe estar allowlisted por registry con repo, workflow/action, method, payload y tier explícitos.
- **Kortex sigue siendo peer system.** Greenhouse observa y coordina repo/CI, pero no absorbe ownership runtime de Kortex ni lee Cloud SQL Kortex.
- **Secrets server-only.** Usar `resolveGithubToken()` / GitHub App installation token cuando exista; nunca exponer tokens en respuesta, logs o audit payload.
- **Comandos mutantes auditados.** Cualquier write GitHub pasa por `executeApiPlatformCommand()` + `greenhouse_core.api_platform_command_executions`, `Idempotency-Key`, confirmacion humana cuando aplique y errores redacted.
- **Produccion/dispatch con aprobacion.** Cualquier workflow dispatch que despliegue o mute estado real requiere flag/env, allowlist, frase humana y smoke; si no existe workflow dedicado, la task debe dejarlo bloqueado como gap, no improvisar.

## Normative Docs

- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1162` — reader base Kortex, ya completo.
- `TASK-1164` / `TASK-1165` — command adapter Kortex y audit/idempotency foundation, ya completos.
- GitHub repo real `efeoncepro/kortex` (verificado con `gh` 2026-06-17): privado, default branch `main`, ramas `main`, `develop`, `feat/efeonce-visual-identity`, workflow `CI` activo.
- Helpers existentes: `src/lib/release/github-helpers.ts`, `src/lib/release/github-app-token-resolver.ts`, `src/lib/kortex/control-plane/repository-reader.ts`, `src/lib/api-platform/core/commands.ts`.

### Blocks / Impacts

- Desbloquea una futura UI de Kortex Ops en Greenhouse.
- Desbloquea futuros commands de release/deploy Kortex desde Greenhouse si el workflow Kortex lo soporta.
- Complementa el runtime adapter de TASK-1165 con visibilidad de repo/CI.

### Files owned

- `src/lib/kortex/github-control-plane/types.ts` `[verificar/crear]`
- `src/lib/kortex/github-control-plane/reader.ts` `[verificar/crear]`
- `src/lib/kortex/github-control-plane/composer.ts` `[verificar/crear]`
- `src/lib/kortex/github-control-plane/commands/registry.ts` `[verificar/crear]`
- `src/lib/kortex/github-control-plane/commands/adapter.ts` `[verificar/crear]`
- `src/app/api/admin/kortex/github-control-plane/route.ts` `[verificar/crear]`
- `src/app/api/admin/kortex/github-commands/route.ts` `[verificar/crear]`
- `src/lib/kortex/control-plane/repository-reader.ts` (expandir o delegar sin romper TASK-1162)
- `src/lib/release/github-helpers.ts` (reusar; solo ampliar si falta helper genérico)
- `docs/architecture/GREENHOUSE_KORTEX_GITHUB_CONTROL_PLANE_V1.md` `[verificar/crear]`
- `docs/architecture/kortex/connection/README.md`
- `docs/architecture/kortex/commands/command-catalog.md`
- `docs/architecture/kortex/governance/guardrails-and-boundaries.md`
- `docs/architecture/kortex/operations/runbook.md`
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md`, `changelog.md`

## Current Repo State

### Already exists

- `src/lib/kortex/control-plane/repository-reader.ts` lee repo `efeoncepro/kortex` de forma basica via `githubFetchJson` y `resolveGithubToken`.
- `src/app/api/admin/kortex/control-plane/route.ts` expone el packet Kortex actual con `requireAdminTenantContext`.
- `src/lib/kortex/commands/**` y `src/app/api/admin/kortex/commands/route.ts` implementan command adapter runtime Kortex con registry, flags, idempotencia, preflight y audit.
- `src/lib/release/github-helpers.ts` + `github-app-token-resolver.ts` son el cliente GitHub canonico.
- GitHub CLI verificado 2026-06-17:
  - repo `efeoncepro/kortex`, privado, default branch `main`;
  - ramas visibles: `develop`, `feat/efeonce-visual-identity`, `main`;
  - workflow `CI` activo (`245705338`);
  - ultimo run `CI` en `main` para `7266902e9936d4ad2d56f10cbdcdd0467fc93f2a`, status `completed`, conclusion `success`, run `27681588991`.

### Gap

- No existe contrato dedicado para repo/CI Kortex; el reader de TASK-1162 solo incluye repo status basico.
- No existe endpoint Greenhouse para ver workflows/runs/branches/releases/PRs de Kortex como paquete operacional.
- No existe command adapter GitHub allowlisted para repo Kortex; cualquier operacion se hace por `gh` manual fuera de Greenhouse.
- No hay reliability signal propia para CI/deploy drift de Kortex desde GitHub.
- No hay policy documentada de que acciones GitHub son permitidas desde Greenhouse y cuales quedan bloqueadas.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: GitHub repo `efeoncepro/kortex` + GitHub Actions API + contratos Greenhouse `greenhouse-kortex-github-control-plane.v1`
- Consumidores afectados: API admin, agentes, futura UI Kortex Ops, futuros MCP/tools
- Runtime target: `staging` primero; `production` solo read-only hasta aprobacion explicita para commands

### Contract surface

- Contrato existente a respetar: `greenhouse-kortex-control-plane-reader.v1`, `greenhouse-kortex-command-adapter.v1`, `executeApiPlatformCommand()`, GitHub helper canonico.
- Contrato nuevo o modificado: `GET /api/admin/kortex/github-control-plane`; opcional `POST /api/admin/kortex/github-commands` con registry allowlisted; contrato `greenhouse-kortex-github-control-plane.v1`.
- Backward compatibility: `compatible` y aditivo.
- Full API parity: la futura UI/agente consume el reader/command server-side; no invoca GitHub directo ni replica botones ad hoc.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.api_platform_command_executions` para commands; sin nuevas tablas obligatorias en V1.
- Invariantes que no se pueden romper:
  - Greenhouse nunca acepta owner/repo arbitrario desde request; `efeoncepro/kortex` queda fijado server-side.
  - El reader nunca escribe en GitHub.
  - Los commands solo ejecutan acciones registradas por nombre; no paths/methods arbitrarios.
  - Workflow dispatch/deploy queda disabled si no hay workflow allowlisted y evidencia de dry-run/smoke.
- Tenant/space boundary: admin tenant context; Kortex repo es recurso global interno de Efeonce, no per-space.
- Idempotency/concurrency: reader read-only; commands requieren `Idempotency-Key` y `executeApiPlatformCommand()`. Reintentos de rerun/dispatch deben ser idempotentes por `runId`/`workflowId`/`ref`.
- Audit/outbox/history: commands mutantes auditados en `api_platform_command_executions`; reader sin audit por ser read-only.

### Migration, backfill and rollout

- Migration posture: `none` para datos; `additive` solo si se agregan capabilities futuras o registry rows.
- Default state: reader enabled para admin; commands default disabled por flag hasta staging smoke.
- Backfill plan: N/A.
- Rollback path: flag off para commands + revert PR; reader puede degradar sin writes.
- External coordination: validar GitHub App/PAT con permisos repo Actions read, checks read, contents read; writes solo si se aprueba workflow dispatch/rerun.

### Security and access

- Auth/access gate: `requireAdminTenantContext`; si se formalizan capabilities, usar `kortex.github.read` y `kortex.github.command` con grants internos.
- Sensitive data posture: tokens GitHub server-only; payloads y errores redacted; no imprimir secrets ni raw provider errors.
- Error contract: canonical errors (`kortex_github_reader_degraded`, `kortex_github_command_disabled`, `kortex_github_command_not_allowed`, `kortex_github_preflight_failed`) + `captureWithDomain('integrations.kortex')`.
- Abuse/rate-limit posture: cache TTL corto para reader; commands allowlisted, idempotentes y rate-aware; no loops de polling agresivo.

### Runtime evidence

- Local checks: tests del reader/composer/registry/adapter; route tests para auth, degraded source y denied command.
- DB/runtime checks: verificar `api_platform_command_executions` para commands mutantes si se habilitan.
- Integration checks: smoke GitHub real contra repo Kortex: repo metadata, branches, workflow `CI`, ultimo run success; command smoke solo si flag aprobado.
- Reliability signals/logs: `platform.kortex.github.ci_last_status` si ultimo run de `CI` en `main` falla o diverge de HEAD; steady actual debe ser verde.
- Production verification sequence: staging reader 200 + degraded tests; staging command flag off denied; si se aprueba command, ejecutar una accion no destructiva allowlisted y auditar; production inicialmente read-only.

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumers estan nombrados con paths reales.
- [x] Repo GitHub queda fijado server-side; no owner/repo arbitrario desde request.
- [x] Invariantes, auth/access boundary e idempotencia/concurrency estan explícitos.
- [ ] Runtime evidence incluye smoke real GitHub y, si hay command, audit en `api_platform_command_executions` (pendiente deploy/smoke staging del nuevo endpoint).
- [x] Secretos GitHub server-only, errores redacted y sin raw provider leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reader GitHub dedicado

- Crear `src/lib/kortex/github-control-plane/**` con tipos, reader y composer para repo `efeoncepro/kortex`.
- Exponer metadata repo, default branch, latest commits `main`/`develop`, branches allowlisted, PRs/issues counts, latest release/tag si existe, workflow list y ultimos runs.
- Reusar `githubFetchJson`, `fetchGithubWithTimeout` y `resolveGithubToken`; source failures degradan por fuente, no tiran 5xx global.
- Tests unitarios con mocks de GitHub API, incluyendo token ausente, rate-limit/404 y run failed.

### Slice 2 — Endpoint admin read-only

- Crear `GET /api/admin/kortex/github-control-plane` con `requireAdminTenantContext`, `Cache-Control: no-store` y header `X-Greenhouse-Contract: greenhouse-kortex-github-control-plane.v1`.
- Integrar el packet con el control-plane Kortex existente solo por referencia, sin romper `GET /api/admin/kortex/control-plane`.
- Smoke staging contra GitHub real: repo `efeoncepro/kortex`, workflow `CI`, ultimo run `main`.

### Slice 3 — Command registry GitHub allowlisted

- Diseñar registry `kortex.github.*` separado del registry runtime Kortex: nombre, tier, GitHub endpoint, payload permitido, preflight y flags.
- Candidatos iniciales implementados tras confirmar soporte GitHub/API:
  - `kortex.github.workflow.rerun_failed` para rerun de run fallido allowlisted.
  - `kortex.github.workflow.dispatch` solo para workflow/ref allowlisted y con flag explicitamente ON.
- `kortex.github.branch.compare` queda fuera de V1 como command; cualquier compare debe nacer como reader, no como write/audit command.
- Rechazar cualquier owner/repo/path/method arbitrario.
- Usar `executeApiPlatformCommand()` + `Idempotency-Key` para cualquier write.

### Slice 4 — Flags, signals y runtime evidence

- Flags sugeridos: `KORTEX_GITHUB_COMMANDS_ENABLED=false`, `KORTEX_GITHUB_WORKFLOW_DISPATCH_ENABLED=false`, `KORTEX_GITHUB_ALLOWED_WORKFLOWS=CI`.
- Reliability signal `platform.kortex.github.ci_last_status` si el ultimo `CI` en `main` no esta `success` o diverge de `main`; signal `unknown` si GitHub token falta.
- Documentar ADR `GREENHOUSE_KORTEX_GITHUB_CONTROL_PLANE_V1.md` y actualizar docs por capas Kortex.
- Verificacion staging: reader 200, command disabled 409 esperado, y si operador aprueba flag, un command no destructivo/allowlisted con audit.

## Out of Scope

- UI operacional de Kortex Ops dentro de Greenhouse.
- Crear, mergear o cerrar PRs automaticamente.
- Hacer force-push, borrar branches, rotar secrets GitHub, cambiar repo settings o modificar workflow files.
- Deploy productivo de Kortex si el repo no tiene workflow allowlisted y dry-run/smoke documentado.
- Leer Kortex Cloud SQL o escribir HubSpot; eso sigue en los adapters Kortex existentes.
- Agregar repo genérico multi-tenant para cualquier repositorio; esta task es Kortex-only.

## Detailed Spec

- **Contrato del reader:** incluir `contractVersion`, `generatedAt`, `confidence`, `repository`, `branches`, `workflows`, `runs`, `pullRequests`, `issues`, `releases`, `runtimeCorrelation`, `sources`, `warnings`.
- **Runtime correlation:** comparar HEAD `main` con el latest CI run en `main`; Kortex runtime V1 no expone SHA propia, por lo que `runtimeReportedSha` queda `null` hasta que Kortex publique ese dato.
- **GitHub API endpoints esperados:** `/repos/efeoncepro/kortex`, `/repos/efeoncepro/kortex/branches`, `/repos/efeoncepro/kortex/actions/workflows`, `/repos/efeoncepro/kortex/actions/runs`, `/search/issues?q=repo:efeoncepro/kortex...`, `/repos/efeoncepro/kortex/releases/latest` degradando `404` como `no_release`.
- **Commands:** deben vivir en registry con `tier='workflow_rerun'|'workflow_dispatch'`. `workflow_dispatch` requiere flag + frase humana `DISPATCH KORTEX WORKFLOW` + workflow/ref allowlisted.
- **Errores:** normalizar provider errors a códigos canónicos; no devolver body raw de GitHub.

## Rollout Plan & Risk Matrix

Cambio aditivo backend/API. Reader read-only primero, commands apagados por default. No hay DB migration obligatoria salvo que el agente decida formalizar capabilities.

### Slice ordering hard rule

- Slice 1 (reader) -> Slice 2 (endpoint) -> Slice 3 (commands) -> Slice 4 (flags/signals/docs).
- Slice 3 no puede ejecutar writes hasta que Slice 1/2 tengan staging smoke verde.
- Slice 4 debe dejar commands default OFF salvo aprobacion explicita del operador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| GitHub token sin permisos suficientes | integration | medium | degradacion honesta en reader; documentar missing scope; commands OFF | source `github` degraded |
| Command GitHub ejecuta workflow incorrecto | release / ops | medium | registry allowlist, flags OFF, frase humana, workflow/ref allowlisted, audit idempotente | `api_platform_command_executions` + GitHub run |
| Rate-limit por polling | integration | low | cache TTL corto, no polling loop, endpoint admin-only | warning `github_rate_limited` |
| Repo/path arbitrario por payload | security | low | owner/repo hardcoded server-side; no endpoint passthrough | tests de rechazo |
| Runtime correlation falso por SHA truncado o deploy manual | ops | medium | warning informativo, no bloqueante; usar full SHA cuando exista | `runtimeShaMismatch` warning |

### Feature flags / cutover

- `KORTEX_GITHUB_COMMANDS_ENABLED=false` default: bloquea cualquier command mutante.
- `KORTEX_GITHUB_WORKFLOW_DISPATCH_ENABLED=false` default: bloquea dispatch incluso si commands generales estan ON.
- `KORTEX_GITHUB_ALLOWED_WORKFLOWS=CI` default staging; production requiere aprobacion explícita.
- Reader sin flag, admin-only, read-only.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert de `src/lib/kortex/github-control-plane/**` | <10 min | si |
| Slice 2 | revert route o retirar export del endpoint | <10 min | si |
| Slice 3 | apagar `KORTEX_GITHUB_COMMANDS_ENABLED` y revert adapter | <5 min | si |
| Slice 4 | apagar signals/flags o revert docs/signal wire | <10 min | si |

### Production verification sequence

1. Local tests del reader/route/commands.
2. Deploy staging con commands OFF.
3. Smoke `GET /api/admin/kortex/github-control-plane` -> 200 y repo/workflow/run reales.
4. Smoke command con flag OFF -> 409 canónico.
5. Si el operador aprueba, prender staging-only y ejecutar command allowlisted no destructivo o rerun seguro; verificar GitHub run + `api_platform_command_executions`.
6. Production queda read-only salvo aprobacion separada para commands.

### Out-of-band coordination required

- Confirmar que GitHub App/PAT server-side tenga permisos mínimos: contents read, metadata read, actions read; actions write solo si se aprueba rerun/dispatch.
- Confirmar si Kortex tiene o necesita workflow separado para deploy/Cloud Run; si no existe, no inventar deploy desde Greenhouse en esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe contrato `greenhouse-kortex-github-control-plane.v1` con reader dedicado y tests.
- [x] `GET /api/admin/kortex/github-control-plane` devuelve estado real de `efeoncepro/kortex` con workflow `CI`, runs recientes y degradacion honesta.
- [x] Repo owner/name quedan hardcoded server-side; payloads no pueden apuntar a otros repos.
- [x] Si se implementan commands, viven en registry allowlisted, default OFF, con `Idempotency-Key`, audit y confirmacion humana cuando aplica.
- [x] Staging evidence documenta reader 200, command disabled 409 y cualquier command aprobado con audit. No se habilito ningun command mutante; default OFF verificado.
- [x] Docs Kortex por capas y ADR quedan sincronizados.

## Verification

### Local evidence 2026-06-17

- `pnpm exec vitest run src/lib/kortex/github-control-plane/reader.test.ts src/lib/kortex/github-control-plane/composer.test.ts src/app/api/admin/kortex/github-control-plane/route.test.ts src/lib/kortex/github-control-plane/commands/adapter.test.ts src/app/api/admin/kortex/github-commands/route.test.ts` -> 5 files, 15 tests passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false` -> passed. Primer intento sin `NODE_OPTIONS` fallo por heap OOM de Node, no por tipos.
- `gh` real 2026-06-17: repo `efeoncepro/kortex` privado, default `main`, branches `main`/`develop`/`feat/efeonce-visual-identity`, workflow `CI` activo `245705338`, latest run `27681588991` en `main` SHA `7266902e9936d4ad2d56f10cbdcdd0467fc93f2a`, `completed/success`.

### Staging evidence 2026-06-17

- Vercel deploy staging: `https://greenhouse-bfym2m5lx-efeonce-7670142f.vercel.app`, id `dpl_3dbr9qmtmZPYwxmyLQQhZmxXEMJ2`, target `staging`, status `Ready`, aliases `https://dev-greenhouse.efeoncepro.com` y `https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`.
- `pnpm staging:request GET '/api/admin/kortex/github-control-plane' --pretty` -> HTTP `200`, `confidence='high'`, repo `efeoncepro/kortex`, workflow `CI`, latest run `27681588991` on `main`, `status='completed'`, `conclusion='success'`, runtime correlation `matched`, warnings `[]`.
- `POST /api/admin/kortex/github-commands` con `kortex.github.workflow.rerun_failed`, `Idempotency-Key` y flags OFF -> HTTP `409`, code `kortex_github_command_disabled`; no write GitHub ejecutado.
- `GET /api/admin/reliability` -> signal `platform.kortex.github.ci_last_status`, severity `ok`, summary `Kortex CI en main sano: run 27681588991 (7266902).`

### Verification commands

- `pnpm exec vitest run src/lib/kortex/github-control-plane/reader.test.ts src/lib/kortex/github-control-plane/composer.test.ts src/app/api/admin/kortex/github-control-plane/route.test.ts src/lib/kortex/github-control-plane/commands/adapter.test.ts src/app/api/admin/kortex/github-commands/route.test.ts` -> passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false` -> passed.
- `pnpm lint` -> passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm build` -> passed; warning preexistente de Roadmap dynamic pattern no relacionado.
- `pnpm docs:closure-check` -> warnings `0`.
- `pnpm task:lint --task TASK-1166` -> `errors=0`, `warnings=0`.
- `pnpm ops:lint --changed` -> `errors=0`, `warnings=0`.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] `docs/architecture/kortex/**` refleja el nuevo control-plane GitHub y sus guardrails
- [x] si se habilito algun command, Vercel env/flags y evidence staging quedaron documentados; no se habilitaron commands, se valido fail-closed.

## Follow-ups

- UI Kortex Ops en Greenhouse que consuma este reader/commands.
- Production command enablement solo si hay workflow allowlisted, dry-run/smoke y aprobacion explicita.
- Ecosystem/MCP tool para agentes externos si se necesita operar Kortex fuera del portal.

## Open Questions

- Resuelto V1: Kortex expone solo workflow `CI` para esta task; no se inventa deploy/release desde Greenhouse.
- Resuelto V1: mantener admin-only hasta que exista UI operacional; capabilities `kortex.github.read` / `kortex.github.command` quedan como follow-up.
