# Greenhouse Public Site Astro GitHub Control Plane V1

> Tipo: Arquitectura / integration control plane
> Estado: V1 deployed en staging; production commands OFF
> Fecha: 2026-06-17
> Task: TASK-1167
> Contratos: `public-site-github-control-plane.v1`, `public-site-github-command-adapter.v1`
> Documentacion funcional: `docs/documentation/public-site/astro-github-control-plane.md`
> Manual operativo: `docs/manual-de-uso/public-site/operar-astro-github-control-plane.md`

## Decision

Greenhouse observa y gobierna el repositorio GitHub del sitio publico Astro mediante un control-plane propio, server-only, admin-only y allowlisted. El repositorio queda fijado en codigo como `efeoncepro/efeonce-web`; ningun request puede elegir `owner`, `repo`, method o path arbitrario.

La capa V1 tiene tres superficies:

- Reader: `GET /api/admin/public-site/github-control-plane`
- Commands: `POST /api/admin/public-site/github-commands`
- Reliability: `public_site.astro_ci_failed`

Esta decision complementa el binding/deploy reader de TASK-1161 (`public-site-astro-binding.v1`). TASK-1161 observa el rail Astro/Vercel; TASK-1167 agrega la dimension GitHub repo/CI y comandos GitHub gobernados. No autoriza deploy, rollback, DNS, Vercel production binding ni cutover.

## Reader Contract

El reader compone `public-site-github-control-plane.v1` desde GitHub API usando `src/lib/release/github-helpers.ts` y el binding reader de `src/lib/public-site/astro/`.

Incluye:

- repository identity: owner, repo, URL, default branch, privacy, pushed/updated at;
- branches tracked: `main`, `develop`;
- workflows: lista de GitHub Actions, con `CI` como workflow observado actual;
- runs recientes: id, workflow, branch, status, conclusion, SHA, timestamps y URL;
- open PR/issues count via GitHub search;
- latest release/tag si existe, con `no_release` como estado valido;
- commit correlation V1: compara `main` HEAD y/o latest CI head contra el SHA del ultimo deploy production reportado por `public-site-astro-binding.v1`.

Degradacion:

- sin token GitHub: `status='unavailable'`, `confidence='none'`, sources `unavailable`, HTTP 200 del endpoint admin si el caller esta autenticado;
- fallo parcial GitHub: source individual `degraded`, warnings en packet, sin tirar todo el reader salvo fallo inesperado del composer;
- release inexistente: `releases.status='no_release'`, no error operacional;
- binding reader no disponible: commit correlation degrada, pero repo/CI sigue observable.

## GitHub Auth

Usa `resolveGithubToken()`:

1. GitHub App installation token si `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID` y `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF` estan configurados.
2. `GITHUB_RELEASE_OBSERVER_TOKEN`.
3. `GITHUB_TOKEN`.
4. `null`, con degradacion honesta.

Para repo privado, el token debe tener permisos read sobre metadata/contents/actions. Para commands, GitHub Actions write es requerido por GitHub API y debe habilitarse solo en el ambiente autorizado.

## Command Contract

Los comandos GitHub viven separados del reader y del futuro rail Vercel para deploy/rollback. V1 solo permite acciones GitHub Actions acotadas.

Registry V1:

| Command | Tier | GitHub action | Default |
|---|---|---|---|
| `public_site.github.workflow.rerun_failed` | `workflow_rerun` | `POST /repos/efeoncepro/efeonce-web/actions/runs/{run_id}/rerun-failed-jobs` | OFF por `PUBLIC_SITE_GITHUB_COMMANDS_ENABLED=false` |
| `public_site.github.workflow.dispatch` | `workflow_dispatch` | `POST /repos/efeoncepro/efeonce-web/actions/workflows/{workflow_id}/dispatches` | OFF por `PUBLIC_SITE_GITHUB_COMMANDS_ENABLED=false` y `PUBLIC_SITE_GITHUB_WORKFLOW_DISPATCH_ENABLED=false` |

Guardrails:

- endpoint admin-only con `requireAdminTenantContext`;
- `Idempotency-Key` obligatorio;
- `executeApiPlatformCommand()` obligatorio para audit en `greenhouse_core.api_platform_command_executions`;
- repo fijo `efeoncepro/efeonce-web`;
- workflow allowlist por `PUBLIC_SITE_GITHUB_ALLOWED_WORKFLOWS`, default `CI`;
- ref allowlist por `PUBLIC_SITE_GITHUB_ALLOWED_REFS`, default `main,develop`;
- dispatch exige confirmacion humana con frase `EXECUTE PUBLIC SITE GITHUB WORKFLOW`;
- rerun solo acepta runs con conclusion fallida/cancelada/timed out/action_required y workflow allowlisted;
- errores upstream redacted.

Queda explicitamente bloqueado en V1:

- deploy/rollback del sitio publico;
- force-push, delete branch, secrets, repo settings, workflow file edits;
- merge/close PR automatico;
- proxy GitHub arbitrario.

## Flags

| Flag | Default | Efecto |
|---|---|---|
| `PUBLIC_SITE_GITHUB_COMMANDS_ENABLED` | `false` | Habilita cualquier command GitHub del sitio publico. |
| `PUBLIC_SITE_GITHUB_WORKFLOW_DISPATCH_ENABLED` | `false` | Habilita workflow dispatch. |
| `PUBLIC_SITE_GITHUB_ALLOWED_WORKFLOWS` | `CI` | Allowlist por nombre/id de workflow. |
| `PUBLIC_SITE_GITHUB_ALLOWED_REFS` | `main,develop` | Allowlist de refs para dispatch. |

El reader read-only no depende de estos flags. Los flags son solo para writes GitHub.

## Reliability

`getPublicSiteAstroCiFailedSignal()` agrega `public_site.astro_ci_failed` al reliability overview bajo `moduleKey='platform'`.

Steady state:

- latest `CI` run en `main` con `conclusion='success'`;
- deploy production reportado por `public-site-astro-binding.v1` correlaciona con `main` HEAD.

Estados:

- `ok`: CI success y correlation matched;
- `warning`: CI success pero deploy va detras/mismatch, o conclusion inesperada;
- `error`: failure/cancelled/timed_out/action_required;
- `unknown`: token ausente, GitHub degradado, run in-flight o sin run main.

Estado real verificado el 2026-06-17: `efeoncepro/efeonce-web` tiene `CI` rojo en `main` (`run_id=27657858751`, SHA `4d050fbf7baf4097684f131d4ac31e1d6148ff02`, `conclusion=failure`). Por contrato, la signal debe reportar `error` hasta que el CI del repo se arregle fuera de esta task. No es un falso positivo del control-plane.

## Evidence 2026-06-17

`gh` local verificado:

- repo `efeoncepro/efeonce-web`, privado, default branch `main`;
- branches visibles: `main`, `develop`;
- workflow `CI` activo, id `259783595`, path `.github/workflows/ci.yml`;
- latest `main` run `27657858751`, SHA `4d050fbf7baf4097684f131d4ac31e1d6148ff02`, `status=completed`, `conclusion=failure`;
- no workflow de deploy dedicado: el deploy/rollback pertenece al rail Vercel en una task posterior.

Validacion local:

- tests focales reader/composer/routes/commands: 5 files / 16 tests passed;
- tests focales reliability: 2 files / 5 tests passed;
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false` passed.
- `pnpm lint` passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm build` passed; warning preexistente de Roadmap dynamic pattern.

## Rollout

V1 fue desplegado y validado en staging el 2026-06-17.

1. Deploy staging `https://greenhouse-8arcw12v5-efeonce-7670142f.vercel.app`, id `dpl_8sbZd3thkxFhaXSY79oS3RByFAn8`, target `staging`, status `Ready`, aliases `dev-greenhouse.efeoncepro.com` y `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`.
2. Smoke `GET /api/admin/public-site/github-control-plane` con agent session: HTTP 200, `contractVersion=public-site-github-control-plane.v1`, `confidence=high`, repo `efeoncepro/efeonce-web`, workflow `CI`, latest main run `27657858751` `completed/failure`, correlation `matched`, sources `ok`, warnings `[]`.
3. Smoke `POST /api/admin/public-site/github-commands` con flags OFF: HTTP 409 `public_site_github_command_disabled`; no GitHub write.
4. `/api/admin/reliability` incluye `public_site.astro_ci_failed` con severity `error`, summary `run 27657858751, status=completed, conclusion=failure, correlation=matched`.
5. Vercel error logs del deployment en ventana 30m: no logs found.

No prender commands ni dispatch sin aprobacion explicita del operador, idempotency key, workflow/ref allowlist y evidencia en `api_platform_command_executions`.

Production queda read-only hasta aprobacion separada. Production commands siguen OFF por diseno.
