# Operar el Public Site Astro GitHub Control Plane

## Antes de empezar

Esta guia aplica al control-plane GitHub de `efeoncepro/efeonce-web`.

Estado actual: V1 deployed en staging por TASK-1167; production commands OFF. No usar para deploy/rollback del sitio.

## Verificar el repo con GitHub CLI

```bash
gh repo view efeoncepro/efeonce-web --json nameWithOwner,defaultBranchRef,isPrivate,pushedAt
gh api repos/efeoncepro/efeonce-web/actions/workflows --jq '.workflows[] | {id,name,path,state}'
gh api 'repos/efeoncepro/efeonce-web/actions/workflows/CI/runs?branch=main&per_page=1' --jq '.workflow_runs[0] | {id,status,conclusion,head_sha,html_url}'
```

El estado observado el 2026-06-17 es `conclusion=failure` para el ultimo `CI` en `main`; la signal Greenhouse debe reportar `error` mientras eso siga asi.

## Smoke staging del reader

Staging verificado actual: `https://greenhouse-8arcw12v5-efeonce-7670142f.vercel.app` (`dpl_8sbZd3thkxFhaXSY79oS3RByFAn8`, target `staging`, Ready). Usar la via canonica del repo para requests protegidos:

```bash
pnpm staging:request '/api/admin/public-site/github-control-plane'
```

Esperado:

- HTTP 200;
- `contractVersion=public-site-github-control-plane.v1`;
- repository `efeoncepro/efeonce-web`;
- workflow `CI`;
- latest main run con el estado real de GitHub;
- errores por fuente degradada en `sources[]`, no raw provider errors.

## Smoke staging del command guardrail

Con flags default OFF, un command debe bloquearse antes de tocar GitHub:

```bash
pnpm staging:request '/api/admin/public-site/github-commands' \
  --method POST \
  --header 'Idempotency-Key: <uuid>' \
  --json '{"commandName":"public_site.github.workflow.rerun_failed","params":{"runId":27657858751},"reason":"staging guardrail smoke only"}'
```

Esperado:

- HTTP 409;
- code `public_site_github_command_disabled`;
- sin nuevo GitHub run;
- sin efectos sobre deploy, rollback, branches o repo settings.

## Verificar Reliability

```bash
pnpm staging:request '/api/admin/reliability'
```

Buscar `public_site.astro_ci_failed`.

Esperado mientras el CI siga rojo:

- `severity=error`;
- metadata con run id/SHA/conclusion cuando GitHub responde;
- degradacion `unknown` si el token o GitHub no estan disponibles.

## Habilitar commands

No prender commands salvo aprobacion explicita del operador.

Flags staging:

- `PUBLIC_SITE_GITHUB_COMMANDS_ENABLED=true`
- `PUBLIC_SITE_GITHUB_WORKFLOW_DISPATCH_ENABLED=true` solo si se probara dispatch
- `PUBLIC_SITE_GITHUB_ALLOWED_WORKFLOWS=CI`
- `PUBLIC_SITE_GITHUB_ALLOWED_REFS=main,develop`

Despues de cambiar env vars en Vercel, redeployar. Vercel no toma env vars nuevas en caliente.

## No hacer

- No usar este adapter para deploy/rollback.
- No aceptar owner/repo/path/method desde payload.
- No prender production commands sin aprobacion separada.
- No ocultar el CI rojo como `ok`.
- No ejecutar dispatch sin frase `EXECUTE PUBLIC SITE GITHUB WORKFLOW`.

## Rollback seguro

- Apagar `PUBLIC_SITE_GITHUB_COMMANDS_ENABLED`.
- Redeployar el ambiente afectado si se cambiaron env vars.
- Revertir el PR si el reader/API debe retirarse.
- Dejar `Handoff.md` con el deployment, flags y smoke observado.
