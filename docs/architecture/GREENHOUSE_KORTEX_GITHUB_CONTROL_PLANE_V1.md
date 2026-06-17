# Greenhouse Kortex GitHub Control Plane V1

> Tipo: Arquitectura / integration control plane
> Estado: V1 code complete local; rollout staging pendiente
> Fecha: 2026-06-17
> Task: TASK-1166
> Contratos: `greenhouse-kortex-github-control-plane.v1`, `greenhouse-kortex-github-command-adapter.v1`

## Decision

Greenhouse opera el repositorio GitHub de Kortex mediante un control-plane propio, server-only, admin-only y allowlisted. El repositorio queda fijado en codigo como `efeoncepro/kortex`; ningun request puede elegir `owner`, `repo`, method o path arbitrario.

La capa V1 tiene tres superficies:

- Reader: `GET /api/admin/kortex/github-control-plane`
- Commands: `POST /api/admin/kortex/github-commands`
- Reliability: `platform.kortex.github.ci_last_status`

## Reader Contract

El reader compone `greenhouse-kortex-github-control-plane.v1` desde GitHub API usando el helper canonico `src/lib/release/github-helpers.ts`.

Incluye:

- repository identity: owner, repo, URL, default branch, privacy, pushed/updated at;
- branches tracked: `main`, `develop`;
- workflows: lista de GitHub Actions, con `CI` como workflow observado actual;
- runs recientes: id, workflow, branch, status, conclusion, SHA, timestamps y URL;
- open PR/issues count via GitHub search;
- latest release/tag si existe, con `no_release` como estado valido;
- runtime correlation V1: compara `main` HEAD contra latest CI head SHA. Kortex runtime todavia no expone SHA propia, por lo que `runtimeReportedSha` queda `null`.

Degradacion:

- sin token GitHub: `confidence='none'`, sources `unavailable`, HTTP 200 del endpoint admin si el caller esta autenticado;
- fallo parcial GitHub: source individual `degraded`, warnings en packet, sin tirar todo el reader salvo fallo inesperado del composer;
- release inexistente: `releases.status='no_release'`, no error operacional.

## GitHub Auth

Usa `resolveGithubToken()`:

1. GitHub App installation token si `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID` y `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF` estan configurados.
2. `GITHUB_RELEASE_OBSERVER_TOKEN`.
3. `GITHUB_TOKEN`.
4. `null`, con degradacion honesta.

Para repo privado, el token debe tener permisos read sobre metadata/contents/actions. Para commands, GitHub Actions write es requerido por GitHub API.

## Command Contract

Los comandos GitHub viven separados del adapter runtime Kortex para no mezclar writes hacia Kortex con writes hacia GitHub.

Registry V1:

| Command | Tier | GitHub action | Default |
|---|---|---|---|
| `kortex.github.workflow.rerun_failed` | `workflow_rerun` | `POST /repos/efeoncepro/kortex/actions/runs/{run_id}/rerun-failed-jobs` | OFF por `KORTEX_GITHUB_COMMANDS_ENABLED=false` |
| `kortex.github.workflow.dispatch` | `workflow_dispatch` | `POST /repos/efeoncepro/kortex/actions/workflows/{workflow_id}/dispatches` | OFF por `KORTEX_GITHUB_COMMANDS_ENABLED=false` y `KORTEX_GITHUB_WORKFLOW_DISPATCH_ENABLED=false` |

Guardrails:

- endpoint admin-only con `requireAdminTenantContext`;
- `Idempotency-Key` obligatorio;
- `executeApiPlatformCommand()` obligatorio para audit en `greenhouse_core.api_platform_command_executions`;
- repo fijo `efeoncepro/kortex`;
- workflow allowlist por `KORTEX_GITHUB_ALLOWED_WORKFLOWS`, default `CI`;
- ref allowlist por `KORTEX_GITHUB_ALLOWED_REFS`, default `main,develop`;
- dispatch exige confirmacion humana con frase `DISPATCH KORTEX WORKFLOW`;
- rerun solo acepta runs con conclusion fallida/cancelada/timed out y workflow allowlisted;
- errores upstream redacted.

## Flags

| Flag | Default | Efecto |
|---|---|---|
| `KORTEX_GITHUB_COMMANDS_ENABLED` | `false` | Habilita cualquier command GitHub Kortex. |
| `KORTEX_GITHUB_WORKFLOW_DISPATCH_ENABLED` | `false` | Habilita workflow dispatch. |
| `KORTEX_GITHUB_ALLOWED_WORKFLOWS` | `CI` | Allowlist por nombre/id de workflow. |
| `KORTEX_GITHUB_ALLOWED_REFS` | `main,develop` | Allowlist de refs para dispatch. |

## Reliability

`getKortexGithubCiLastStatusSignal()` agrega `platform.kortex.github.ci_last_status` al reliability overview bajo `moduleKey='platform'`.

Steady state:

- latest CI run en `main` con `conclusion='success'`;
- latest CI SHA igual a `main` HEAD.

Estados:

- `ok`: CI success y correlacion matched;
- `warning`: CI success pero correlacion mismatch, o conclusion inesperada;
- `error`: failure/cancelled/timed_out;
- `unknown`: token ausente, GitHub degradado, run in-flight o sin run main.

## Rollout

V1 queda local/code-complete hasta que se ejecute rollout:

1. Deploy staging de Greenhouse.
2. Smoke read-only: `pnpm staging:request GET '/api/admin/kortex/github-control-plane'`.
3. Verificar packet: `repository.nameWithOwner='efeoncepro/kortex'`, workflow `CI`, latest main run success.
4. Smoke command-deny: `POST /api/admin/kortex/github-commands` sin flags debe devolver `409 kortex_github_command_disabled`.
5. Solo con aprobacion explicita, prender `KORTEX_GITHUB_COMMANDS_ENABLED=true` en staging para probar `rerun_failed` contra un run fallido real allowlisted.
6. No prender dispatch en production sin workflow/release runbook dedicado.

## Evidence 2026-06-17

`gh` local verificado:

- repo `efeoncepro/kortex`, privado, default branch `main`;
- branches visibles: `develop`, `feat/efeonce-visual-identity`, `main`;
- workflow `CI` activo, id `245705338`;
- latest run `27681588991`, branch `main`, SHA `7266902e9936d4ad2d56f10cbdcdd0467fc93f2a`, `status=completed`, `conclusion=success`.

Validacion local:

- `pnpm exec vitest run src/lib/kortex/github-control-plane/reader.test.ts src/lib/kortex/github-control-plane/composer.test.ts src/app/api/admin/kortex/github-control-plane/route.test.ts src/lib/kortex/github-control-plane/commands/adapter.test.ts src/app/api/admin/kortex/github-commands/route.test.ts` -> 15 tests passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false` -> passed.
