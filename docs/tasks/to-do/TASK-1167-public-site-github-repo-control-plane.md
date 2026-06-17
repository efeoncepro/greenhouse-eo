# TASK-1167 — Public Site GitHub Repo Control Plane (efeonce-web)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|public-site|astro|integrations|ops|github`
- Blocked by: `none`
- Branch: `task/TASK-1167-public-site-github-repo-control-plane`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el control-plane GitHub del **sitio público Astro** dentro de Greenhouse: reader server-only `public-site-github-control-plane.v1` para el repo `efeoncepro/efeonce-web` — workflow `CI`, runs recientes, branches, PRs/issues, releases/tags y correlación de commit con el binding reader — y un primer adapter de comandos GitHub gobernados, allowlisted y default OFF, solo para acciones no destructivas o explícitamente aprobadas (rerun de CI fallido, dispatch de `CI` sobre ref allowlisted). Es el complemento de TASK-1161 (binding/deploy reader): hoy Greenhouse podrá ver el binding y el estado de deploy del rail Astro/Vercel, pero no gobierna el **repo, su CI ni el rail de cambios** del sitio público desde Greenhouse.

**Verificado con `gh` 2026-06-17:** repo `efeoncepro/efeonce-web` privado, default `main`, ramas `main`+`develop`, único workflow `CI` (`.github/workflows/ci.yml`, id `259783595`, activo), **CI rojo en `main`** (últimos runs `conclusion=failure`, HEAD `4d050fb`). El reader expone ese estado real de inmediato. NO hay workflow de deploy: Vercel deploya por git-integration, así que el comando de deploy/rollback del sitio queda **fuera de scope** (es otra task del epic).

## Why This Task Exists

El operador pidió controlar el repo del sitio público Astro desde Greenhouse. TASK-1161 lee el binding repo↔Vercel y el estado de deploy, pero el control de GitHub queda incompleto: Greenhouse no ve en un contrato dedicado los workflows/runs/branches/PRs/releases del repo `efeonce-web`, no tiene el status de CI como fuente operacional propia, y no puede disparar acciones de repo de forma gobernada (hoy un rerun de CI fallido o un dispatch se hace por `gh` manual fuera de Greenhouse).

Sin esta task, operar el sitio público desde Greenhouse queda dividido: binding/deploy por el reader de TASK-1161, repo/CI por `gh` manual. Esta task cierra la capa backend/API repo/CI primero, reusando el mismo molde gobernado que TASK-1166 aplicó a Kortex; una UI operacional de Public Site Ops puede venir después consumiendo este contrato. El control-plane se construye read-first y command-gated.

## Goal

- Reader canónico `public-site-github-control-plane.v1` para repo `efeoncepro/efeonce-web`, compuesto desde GitHub API con timeout, redacción y degradación honesta.
- Exponer metadata repo, default branch, latest commits `main`/`develop`, branches, PRs/issues counts, latest release/tag si existe, workflow `CI` y sus últimos runs, y correlación de commit con el binding reader (TASK-1161) — todo sin hacer writes.
- Agregar endpoint admin `GET /api/admin/public-site/github-control-plane` con auth admin y contrato versionado.
- Agregar comandos GitHub gobernados y allowlisted solo para acciones seguras o explícitas: `public_site.github.workflow.rerun_failed` (rerun de run CI fallido) y `public_site.github.workflow.dispatch` (solo workflow/ref allowlisted, con flag explícitamente ON + frase humana).
- Reusar `src/lib/release/github-helpers.ts`, `src/lib/release/github-app-token-resolver.ts`, `executeApiPlatformCommand()` + `greenhouse_core.api_platform_command_executions`; no crear un cliente GitHub paralelo ni proxy arbitrario, y fijar `efeoncepro/efeonce-web` server-side.
- Primera reliability signal del repo público: `public_site.astro_ci_failed` (el último run de `CI` en `main` no está `success`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md` — la decisión que nombra el control-plane contract `public_site.*` + el observability contract (`public_site.astro_deploy_failed`, …). Source of truth de los nombres.
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md` — el programa; esta es la pieza repo/CI + comandos del control-plane.
- `docs/tasks/in-progress/TASK-1161-public-site-greenhouse-binding-reader.md` — pieza hermana (binding/deploy reader). Esta task la **complementa** con la dimensión repo/CI + comandos, igual que TASK-1166 complementa a TASK-1162 en Kortex.
- `docs/tasks/to-do/TASK-1166-kortex-github-repo-control-plane.md` — el molde directo (reader GitHub dedicado + command adapter allowlisted/default OFF). Replicar el patrón, no reinventar.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — lanes app/ecosystem + command execution foundation.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — read/API-first: el reader/command es el SSOT, la UI/agente/MCP son clientes.
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` — helpers GitHub canónicos + patrón de allowlist de workflows.
- `docs/operations/public-site-astro-runtime-binding-20260616.json` — el binding manifest Astro (repo/vercel coords). Fuente de las coords que se fijan server-side.

Reglas obligatorias:

- **Read/API-first.** La UI, agentes y futuros MCP consumen readers/commands Greenhouse; no hablan con GitHub directo.
- **No proxy GitHub arbitrario.** Todo endpoint/command debe estar allowlisted por registry con repo, workflow/action, method, payload y tier explícitos. `efeoncepro/efeonce-web` queda fijado server-side; nunca owner/repo desde request.
- **Reuse, no reinvent.** GitHub via `src/lib/release/github-helpers.ts` (`githubFetchJson`, `fetchGithubWithTimeout`, `githubRepoCoords`) + `github-app-token-resolver.ts`; comandos via `executeApiPlatformCommand()` + `greenhouse_core.api_platform_command_executions`. Reusar el namespace `src/lib/public-site/astro/` que estrena TASK-1161 (desambigua del dominio WordPress preexistente en `src/lib/public-site/`).
- **Secrets server-only.** Token GitHub via el resolver existente (GH App → PAT fallback); nunca exponer tokens en respuesta, logs ni audit payload.
- **Comandos mutantes auditados.** Cualquier write GitHub pasa por `executeApiPlatformCommand()` + `greenhouse_core.api_platform_command_executions`, `Idempotency-Key`, confirmación humana cuando aplique y errores redacted.
- **Dispatch con aprobación.** Cualquier workflow dispatch requiere flag/env + allowlist de workflow/ref + frase humana + smoke; si no existe workflow dedicado para una acción (p.ej. deploy), la task la deja **bloqueada como gap**, no improvisa.
- **Cero deploy/rollback de sitio en esta task.** `efeonce-web` no tiene workflow de deploy (deploya por Vercel git-integration); el deploy/rollback del sitio es `public_site.asset_change.deploy`/`rollback` en una task posterior del epic.

## Normative Docs

- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` — si emerge necesidad de refresco periódico (no en MVP; el reader es on-demand con cache TTL corto).

## Dependencies & Impact

### Depends on

- `EPIC-019` (programa) + la decisión `..._ASTRO_RUNTIME_STRATEGY_DECISION_V1`.
- Helpers GitHub/release existentes: `src/lib/release/github-helpers.ts`, `src/lib/release/github-app-token-resolver.ts`.
- Command/audit foundation: `executeApiPlatformCommand()` (`src/lib/api-platform/core/commands.ts` `[verificar]`) + `greenhouse_core.api_platform_command_executions` (TASK-1164/1165, completas).
- GitHub repo real `efeoncepro/efeonce-web` (verificado con `gh` 2026-06-17): privado, default branch `main`, ramas `main`+`develop`, workflow `CI` activo (`259783595`), CI rojo en `main`.
- `TASK-1161` (binding reader) — **complemento, no bloqueante.** Si TASK-1161 ya aterrizó, este reader reusa su packet para la correlación de commit (HEAD vs deploy SHA). Si no, lee HEAD `main`/`develop` directo via release helpers y deja la correlación de deploy degradada.

### Blocks / Impacts

- Desbloquea una futura UI de Public Site Ops en Greenhouse (read + acciones gobernadas).
- Complementa TASK-1161 con visibilidad de repo/CI + comandos GitHub.
- No desbloquea el deploy/rollback del sitio (ese requiere el rail Vercel, otra task).

### Files owned

- `src/lib/public-site/astro/github-control-plane/types.ts` `[verificar/crear]`
- `src/lib/public-site/astro/github-control-plane/reader.ts` `[verificar/crear]`
- `src/lib/public-site/astro/github-control-plane/composer.ts` `[verificar/crear]`
- `src/lib/public-site/astro/github-control-plane/commands/registry.ts` `[verificar/crear]`
- `src/lib/public-site/astro/github-control-plane/commands/adapter.ts` `[verificar/crear]`
- `src/app/api/admin/public-site/github-control-plane/route.ts` `[verificar/crear]`
- `src/app/api/admin/public-site/github-commands/route.ts` `[verificar/crear]`
- `src/lib/release/github-helpers.ts` (reusar; solo ampliar si falta un helper genérico)
- `src/lib/reliability/queries/public-site-astro-ci-failed.ts` `[verificar/crear]`
- `src/lib/reliability/get-reliability-overview.ts` (wire de la signal)
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_GITHUB_CONTROL_PLANE_V1.md` `[verificar/crear]` (spec del contrato + reuse map + policy de acciones permitidas)
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md`, `changelog.md`, `docs/epics/to-do/EPIC-019-...md`

## Current Repo State

### Already exists

- `src/lib/release/github-helpers.ts` + `github-app-token-resolver.ts` son el cliente GitHub canónico (token GH App → PAT fallback, fetch con timeout, repo coords).
- `greenhouse_core.api_platform_command_executions` + `executeApiPlatformCommand()` son el audit/idempotency foundation para comandos gobernados (estrenados por el adapter Kortex TASK-1164/1165 — molde directo).
- `src/lib/public-site/astro/` es el namespace del rail Astro que estrena TASK-1161 (binding reader). **Coexiste con el dominio WordPress preexistente** en `src/lib/public-site/` (`runtime-binding.ts`, `bridge-*.ts`, `content-factory/`) — son rails distintos durante la ventana de migración.
- GitHub CLI verificado 2026-06-17:
  - repo `efeoncepro/efeonce-web`, privado, default branch `main`, push `2026-06-17`;
  - ramas visibles: `main`, `develop`;
  - único workflow `CI` activo (`259783595`, `.github/workflows/ci.yml`);
  - **últimos runs de `CI` en `main` con `conclusion=failure`** (HEAD `4d050fb`, run `27657858751`) — el CI del repo está rojo hoy.

### Gap

- No existe contrato dedicado para repo/CI del sitio público Astro; el binding reader de TASK-1161 cubre binding/deploy state (Vercel), NO el packet repo/CI (workflows/runs/branches/PRs/releases) de GitHub.
- No existe endpoint Greenhouse para ver workflows/runs/branches/releases/PRs de `efeonce-web` como paquete operacional.
- No existe command adapter GitHub allowlisted para el repo público; cualquier operación (rerun CI, dispatch) se hace por `gh` manual fuera de Greenhouse.
- No hay reliability signal propia para CI failed del repo público desde GitHub.
- No hay policy documentada de qué acciones GitHub son permitidas desde Greenhouse y cuáles quedan bloqueadas (deploy/rollback/force-push/secrets).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration` (+ `reader`, `api`, `command`)
- Source of truth afectado: GitHub repo `efeoncepro/efeonce-web` + GitHub Actions API + contrato Greenhouse `public-site-github-control-plane.v1`
- Consumidores afectados: API admin, agentes, futura UI Public Site Ops, futuros MCP/tools
- Runtime target: `staging` primero; `production` solo read-only hasta aprobación explícita para commands

### Contract surface

- Contrato existente a respetar: GitHub helper canónico (`release/github-helpers.ts`), `executeApiPlatformCommand()` + `api_platform_command_executions`, Full API Parity, y el contrato hermano `public-site-astro-binding.v1` (TASK-1161) para la correlación de commit.
- Contrato nuevo: `GET /api/admin/public-site/github-control-plane`; opcional `POST /api/admin/public-site/github-commands` con registry allowlisted; contrato `public-site-github-control-plane.v1`.
- Backward compatibility: `compatible` y aditivo (todo nuevo).
- Full API parity: la futura UI/agente consume el reader/command server-side; no invoca GitHub directo ni replica botones ad hoc.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.api_platform_command_executions` para commands; sin nuevas tablas obligatorias en V1.
- Invariantes que no se pueden romper:
  - Greenhouse nunca acepta owner/repo arbitrario desde request; `efeoncepro/efeonce-web` queda fijado server-side.
  - El reader nunca escribe en GitHub.
  - Los commands solo ejecutan acciones registradas por nombre; no paths/methods arbitrarios.
  - Workflow dispatch queda disabled si no hay workflow allowlisted y evidencia de dry-run/smoke.
  - Una fuente caída/timeout NUNCA produce un estado falso-sano: degrada (`sources[]` degraded + baja `confidence`), nunca 5xx global.
- Tenant/space boundary: admin tenant context; el repo del sitio público es recurso global interno de Efeonce, no per-space.
- Idempotency/concurrency: reader read-only; commands requieren `Idempotency-Key` y `executeApiPlatformCommand()`. Reintentos de rerun/dispatch deben ser idempotentes por `runId`/`workflowId`/`ref`.
- Audit/outbox/history: commands mutantes auditados en `api_platform_command_executions`; reader sin audit por ser read-only.

### Migration, backfill and rollout

- Migration posture: `none` para datos; `additive` solo si se decide formalizar capabilities (`public_site.github.read`/`public_site.github.command`) con seed en `capabilities_registry` + grant runtime mismo PR.
- Default state: reader enabled para admin; commands default disabled por flag hasta staging smoke.
- Backfill plan: N/A.
- Rollback path: flag off para commands + revert PR; reader puede degradar sin writes.
- External coordination: validar GitHub App/PAT con permisos repo `efeonce-web`: contents read, metadata read, actions read; actions write solo si se aprueba rerun/dispatch.

### Security and access

- Auth/access gate: `requireAdminTenantContext`; si se formalizan capabilities, usar `public_site.github.read` y `public_site.github.command` con grants internos (catalog + `capabilities_registry` + grant runtime mismo PR; `capability-grant-coverage.test.ts` verde).
- Sensitive data posture: tokens GitHub server-only; payloads y errores redacted; no imprimir secrets ni raw provider errors.
- Error contract: canonical errors (`public_site_github_reader_degraded`, `public_site_github_command_disabled`, `public_site_github_command_not_allowed`, `public_site_github_preflight_failed`) + `captureWithDomain('cloud', { tags: { source: 'public_site_github' } })` (el union `CaptureDomain` no tiene `public_site`; usar `cloud` salvo que se agregue el dominio).
- Abuse/rate-limit posture: cache TTL corto para reader; commands allowlisted, idempotentes y rate-aware; no loops de polling agresivo.

### Runtime evidence

- Local checks: tests del reader/composer/registry/adapter; route tests para auth, degraded source y denied command.
- DB/runtime checks: verificar `api_platform_command_executions` para commands mutantes si se habilitan.
- Integration checks: smoke GitHub real contra `efeonce-web`: repo metadata, branches, workflow `CI`, último run; **se espera CI rojo** (la signal debe reportar `failed`, NO falso-verde). Command smoke solo si flag aprobado.
- Reliability signals/logs: `public_site.astro_ci_failed` si el último run de `CI` en `main` no está `success`; signal degraded si GitHub token falta. **Estado actual NO es verde** (CI rojo 2026-06-17): el steady-state honesto es `error` hasta que se arregle el CI en el repo `efeonce-web` (fuera de scope de esta task).
- Production verification sequence: staging reader 200 + degraded tests; staging command flag off denied; producción inicialmente read-only.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers están nombrados con paths reales.
- [ ] Repo GitHub queda fijado server-side; no owner/repo arbitrario desde request.
- [ ] Invariantes, auth/access boundary e idempotencia/concurrency están explícitos.
- [ ] Runtime evidence incluye smoke real GitHub y, si hay command, audit en `api_platform_command_executions`.
- [ ] Secretos GitHub server-only, errores redacted y sin raw provider leaks.

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

- Crear `src/lib/public-site/astro/github-control-plane/**` con tipos, reader y composer para repo `efeoncepro/efeonce-web`.
- Exponer metadata repo, default branch, latest commits `main`/`develop`, branches, PRs/issues counts, latest release/tag si existe, workflow `CI` y últimos runs (status/conclusion/sha/age/branch).
- Reusar `githubFetchJson`, `fetchGithubWithTimeout` y el token resolver; source failures degradan por fuente, no tiran 5xx global (shape `sources[]` + `confidence`).
- Tests unitarios con mocks de GitHub API, incluyendo token ausente, rate-limit/404 y run failed (el caso real hoy).

### Slice 2 — Endpoint admin read-only

- Crear `GET /api/admin/public-site/github-control-plane` con `requireAdminTenantContext`, `Cache-Control: no-store` y header `X-Greenhouse-Contract: public-site-github-control-plane.v1`.
- Integrar la correlación de commit con el binding reader (TASK-1161) solo por referencia, sin romper `GET /api/admin/public-site/binding`. Si TASK-1161 no aterrizó, leer HEAD directo y dejar la correlación de deploy degradada.
- Smoke staging contra GitHub real: repo `efeonce-web`, workflow `CI`, último run `main` (rojo esperado).

### Slice 3 — Command registry GitHub allowlisted

- Diseñar registry `public_site.github.*`: nombre, tier, GitHub endpoint, payload permitido, preflight y flags.
- Candidatos iniciales permitidos solo si se confirma soporte GitHub/API:
  - `public_site.github.workflow.rerun_failed` para rerun de run `CI` fallido allowlisted (caso de uso inmediato: el CI está rojo).
  - `public_site.github.workflow.dispatch` solo para workflow `CI` / ref allowlisted y con flag explícitamente ON.
  - `public_site.github.branch.compare` como read command si conviene mantenerlo command-like.
- Rechazar cualquier owner/repo/path/method arbitrario.
- Usar `executeApiPlatformCommand()` + `Idempotency-Key` para cualquier write.

### Slice 4 — Flags, signal y spec doc

- Flags sugeridos: `PUBLIC_SITE_GITHUB_COMMANDS_ENABLED=false`, `PUBLIC_SITE_GITHUB_WORKFLOW_DISPATCH_ENABLED=false`, `PUBLIC_SITE_GITHUB_ALLOWED_WORKFLOWS=CI`.
- Reliability signal `public_site.astro_ci_failed` (último `CI` en `main` no `success`) en `src/lib/reliability/queries/` + wire a `get-reliability-overview.ts` (rollup `cloud` o subsystem `Public Site` — decidir en Plan Mode). Signal degraded si falta token.
- Documentar spec `GREENHOUSE_PUBLIC_SITE_ASTRO_GITHUB_CONTROL_PLANE_V1.md` (contrato + reuse map + policy de acciones permitidas/bloqueadas) y actualizar EPIC-019.
- Verificación staging: reader 200, command disabled 409 esperado, y si operador aprueba flag, un rerun de CI allowlisted con audit.

## Out of Scope

- **Deploy/rollback del sitio** (`public_site.asset_change.deploy`/`rollback`): `efeonce-web` no tiene workflow de deploy (Vercel deploya por git-integration); el deploy desde Greenhouse va por el rail Vercel en otra task del epic.
- `public_site.asset_change.*` (create/preview/request_review) y `public_site.seo_preflight.run` — tasks posteriores del epic.
- UI operacional de Public Site Ops dentro de Greenhouse.
- Crear, mergear o cerrar PRs automáticamente; force-push, borrar branches, rotar secrets GitHub, cambiar repo settings o modificar workflow files.
- Arreglar el CI rojo de `efeonce-web` (eso vive en el repo `efeonce-web`, no en Greenhouse). Esta task lo **observa** y permite **rerun**, no lo arregla.
- El binding/deploy reader (`public-site-astro-binding.v1`) — owned por TASK-1161.
- Repo genérico multi-repo; esta task es `efeonce-web`-only.

## Detailed Spec

- **Contrato del reader:** incluir `contractVersion`, `generatedAt`, `confidence`, `repository`, `branches`, `workflows`, `runs`, `pullRequests`, `issues`, `releases`, `commitCorrelation`, `sources`, `warnings`.
- **Commit correlation:** comparar HEAD `main` del repo con el SHA del último deploy prod del binding reader (TASK-1161); si difieren, reportar `deployBehindMain`/`deployShaMismatch` como warning read-only (sin actuar).
- **GitHub API endpoints esperados:** `/repos/efeoncepro/efeonce-web`, `/repos/efeoncepro/efeonce-web/branches`, `/repos/efeoncepro/efeonce-web/actions/workflows`, `/repos/efeoncepro/efeonce-web/actions/runs`, `/search/issues?q=repo:efeoncepro/efeonce-web...`, `/repos/efeoncepro/efeonce-web/releases/latest` degradando `404` como `no_release`.
- **Commands:** deben vivir en registry con `tier='read'|'workflow_rerun'|'workflow_dispatch'`. `workflow_dispatch` requiere flag + frase humana `EXECUTE PUBLIC SITE GITHUB WORKFLOW` + workflow/ref allowlisted.
- **Errores:** normalizar provider errors a códigos canónicos; no devolver body raw de GitHub.
- **Estado CI rojo (realidad 2026-06-17):** el reader y la signal deben reportar honestamente `failed`. NO se debe "verdear" artificialmente ni esconder el estado; el valor de esta task es justamente hacer visible el CI rojo en Greenhouse.

## Rollout Plan & Risk Matrix

Cambio aditivo backend/API. Reader read-only primero, commands apagados por default. No hay DB migration obligatoria salvo que el agente decida formalizar capabilities.

### Slice ordering hard rule

- Slice 1 (reader) → Slice 2 (endpoint) → Slice 3 (commands) → Slice 4 (flags/signal/docs).
- Slice 3 no puede ejecutar writes hasta que Slice 1/2 tengan staging smoke verde (reader 200).
- Slice 4 debe dejar commands default OFF salvo aprobación explícita del operador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| GitHub token sin permisos suficientes (actions read/write) | integration | medium | degradación honesta en reader; documentar missing scope; commands OFF | source `github` degraded |
| Command GitHub ejecuta workflow/ref incorrecto | release / ops | medium | registry allowlist, flags OFF, frase humana, workflow/ref allowlisted, audit idempotente | `api_platform_command_executions` + GitHub run |
| Rate-limit por polling | integration | low | cache TTL corto, no polling loop, endpoint admin-only | warning `github_rate_limited` |
| Repo/path arbitrario por payload | security | low | owner/repo hardcoded server-side; no endpoint passthrough | tests de rechazo |
| Signal `astro_ci_failed` se interpreta como bug del control-plane (cuando es CI real rojo) | ops | medium | documentar que el steady-state honesto NO es verde hoy; el fix vive en `efeonce-web` | signal `error` esperado |
| Commit correlation falso por dependencia de TASK-1161 no aterrizada | ops | medium | degradar correlación de deploy si falta el binding reader; warning informativo, no bloqueante | `deployShaMismatch`/`correlation_degraded` |

### Feature flags / cutover

- `PUBLIC_SITE_GITHUB_COMMANDS_ENABLED=false` default: bloquea cualquier command mutante.
- `PUBLIC_SITE_GITHUB_WORKFLOW_DISPATCH_ENABLED=false` default: bloquea dispatch incluso si commands generales están ON.
- `PUBLIC_SITE_GITHUB_ALLOWED_WORKFLOWS=CI` default staging; producción requiere aprobación explícita.
- Reader sin flag, admin-only, read-only.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert de `src/lib/public-site/astro/github-control-plane/**` | <10 min | si |
| Slice 2 | revert route o retirar export del endpoint | <10 min | si |
| Slice 3 | apagar `PUBLIC_SITE_GITHUB_COMMANDS_ENABLED` y revert adapter | <5 min | si |
| Slice 4 | apagar signal/flags o revert docs/signal wire | <10 min | si |

### Production verification sequence

1. Local tests del reader/route/commands.
2. Deploy staging con commands OFF.
3. Smoke `GET /api/admin/public-site/github-control-plane` → 200 y repo/workflow/run reales (CI rojo esperado, reportado honestamente).
4. Smoke command con flag OFF → 409 canónico.
5. Si el operador aprueba, prender staging-only y ejecutar `public_site.github.workflow.rerun_failed` allowlisted; verificar GitHub run + `api_platform_command_executions`.
6. Producción queda read-only salvo aprobación separada para commands.

### Out-of-band coordination required

- Confirmar que el GitHub App/PAT server-side tenga permisos mínimos: contents read, metadata read, actions read; actions write solo si se aprueba rerun/dispatch.
- Confirmar si `efeonce-web` tendrá un workflow separado de deploy/release o seguirá deployando solo por Vercel git-integration; si no existe workflow de deploy, no inventar deploy desde Greenhouse en esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe contrato `public-site-github-control-plane.v1` con reader dedicado y tests bajo `src/lib/public-site/astro/github-control-plane/`.
- [ ] `GET /api/admin/public-site/github-control-plane` devuelve estado real de `efeoncepro/efeonce-web` con workflow `CI`, runs recientes y degradación honesta.
- [ ] Repo owner/name quedan hardcoded server-side; payloads no pueden apuntar a otros repos.
- [ ] Si se implementan commands, viven en registry allowlisted, default OFF, con `Idempotency-Key`, audit y confirmación humana cuando aplica.
- [ ] `public_site.astro_ci_failed` wired a `get-reliability-overview` y reporta el CI rojo real (sin falso-verde).
- [ ] Staging evidence documenta reader 200, command disabled 409 y cualquier command aprobado con audit.
- [ ] Cero deploy/rollback del sitio; cero write destructivo (force-push, delete branch, secrets, workflow files).
- [ ] Spec `GREENHOUSE_PUBLIC_SITE_ASTRO_GITHUB_CONTROL_PLANE_V1.md` y EPIC-019 sincronizados.

## Verification

- `pnpm test src/lib/public-site/astro/github-control-plane`
- `pnpm test src/app/api/admin/public-site/github-control-plane/route.test.ts`
- `pnpm test src/app/api/admin/public-site/github-commands/route.test.ts` si se implementan commands
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm docs:closure-check`
- `pnpm task:lint --task TASK-1167`
- `pnpm ops:lint --changed`
- Staging smoke con `pnpm staging:request GET '/api/admin/public-site/github-control-plane'`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas (TASK-1161, EPIC-019)
- [ ] spec `GREENHOUSE_PUBLIC_SITE_ASTRO_GITHUB_CONTROL_PLANE_V1.md` creada y enlazada desde EPIC-019
- [ ] si se habilitó algún command, Vercel env/flags y evidence staging quedaron documentados

## Follow-ups

- UI Public Site Ops en Greenhouse que consuma este reader/commands.
- Command de deploy/rollback del sitio via rail Vercel (`public_site.asset_change.deploy`/`rollback`) — task separada del epic.
- `public_site.seo_preflight.run` (canonical/sitemap/redirects/HubSpot checks) como reader/command.
- Production command enablement solo si hay evidencia de dry-run/smoke y aprobación explícita.
- Ecosystem/MCP tool para agentes externos si se necesita operar el repo público fuera del portal.

## Open Questions

- ¿El comando de deploy del sitio público se modela sobre el rail **Vercel** (deploy hook / Vercel API) en una task aparte, dado que `efeonce-web` no tiene workflow de deploy en GitHub? (Recomendación: sí, task separada.)
- ¿Formalizamos capabilities `public_site.github.read` / `public_site.github.command` en V1 o mantenemos admin-only hasta la UI? (Mirror TASK-1166: admin-only en V1, formalizar al construir la UI.)
- ¿Arreglar el CI rojo de `efeonce-web` entra como issue/task hermana en el repo `efeonce-web`? Esta task solo lo observa y permite rerun.
- ¿Subsystem de reliability propio (`Public Site`) o rollup en `cloud`? Decidir en Plan Mode junto con TASK-1161 (misma decisión).
