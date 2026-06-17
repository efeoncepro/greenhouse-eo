# Runbook operativo Kortex desde Greenhouse

## Estado staging validado

- Greenhouse deploy TASK-1166: `greenhouse-bfym2m5lx-efeonce-7670142f.vercel.app`
- Previous Kortex runtime command rollout deploy: `greenhouse-dnr2e8c04-efeonce-7670142f.vercel.app`
- Alias: `dev-greenhouse.efeoncepro.com`
- Package Vercel corregido: upload `57MB` despues de excluir artefactos locales.
- Deployment inflado removido: `greenhouse-hyqnb6n6k-efeonce-7670142f.vercel.app`
- Flags vigentes por aprobacion del operador: `KORTEX_COMMAND_ADAPTER_ENABLED=true`, `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=true`, `KORTEX_COMMAND_ADMIN_ENABLED=true`.
- Secret admin vigente: `KORTEX_COMMAND_ADMIN_TOKEN` en Vercel staging como sensitive env, provisionado desde GCP Secret Manager `efeonce-kortex-dev/kortex-admin-bootstrap-token`.
- GitHub repo commands TASK-1166 estan ON en staging por aprobacion del operador: `KORTEX_GITHUB_COMMANDS_ENABLED=true`, `KORTEX_GITHUB_WORKFLOW_DISPATCH_ENABLED=true`, `KORTEX_GITHUB_ALLOWED_WORKFLOWS=CI`, `KORTEX_GITHUB_ALLOWED_REFS=main,develop`. Production sigue OFF.

## Smokes ejecutados

Control-plane:

```bash
pnpm staging:request GET '/api/admin/kortex/control-plane?hubspot_portal_id=48713323'
```

Resultado:

- HTTP `200`
- binding `EO-SPB-0002`
- latest audit visible

Command smokes:

| Smoke | Resultado |
|---|---|
| `kortex.audit.run` | `200 completed`, `EO-APC-F75FD63E`, `d8b4b769-4c33-4193-bb15-9545253ac521` |
| `kortex.strategy.normalize` | `200 completed`, `EO-APC-86281ABC` |
| `kortex.strategy.release_candidate.execute_workflows` con release candidate dummy | `409 kortex_preview_required`; live ya no bloquea por flag y el guard de dry-run sigue activo. |
| `kortex.admin.users.bootstrap_e2e_agent` | `200 completed`, `EO-APC-E138ACF4`; valida admin flag + token bootstrap sin tocar HubSpot. |

## Como ejecutar un comando

Endpoint:

```http
POST /api/admin/kortex/commands
Idempotency-Key: <stable-key>
Content-Type: application/json
```

Ejemplo safe:

```json
{
  "commandName": "kortex.strategy.normalize",
  "hubspotPortalId": "48713323",
  "reason": "Normalize strategy from Greenhouse",
  "payload": {
    "authoringMode": "agent",
    "title": "Portal strategy",
    "strategyBody": "Create a governed CRM strategy."
  }
}
```

## Kortex GitHub control-plane

Endpoint read-only:

```bash
pnpm staging:request GET '/api/admin/kortex/github-control-plane'
```

Resultado esperado post-rollout TASK-1166:

- HTTP `200`
- `contractVersion='greenhouse-kortex-github-control-plane.v1'`
- `repository.nameWithOwner='efeoncepro/kortex'`
- workflow `CI` visible
- latest run `main` con `status=completed` y `conclusion=success` si GitHub esta sano

Smoke validado 2026-06-17:

- HTTP `200`
- `confidence='high'`
- latest CI run `27681588991`, `status='completed'`, `conclusion='success'`
- `runtimeCorrelation.status='matched'`
- `warnings=[]`
- reliability signal `platform.kortex.github.ci_last_status` con severity `ok`

Endpoint commands GitHub:

```http
POST /api/admin/kortex/github-commands
Idempotency-Key: <stable-key>
Content-Type: application/json
```

Con flags OFF, debe fallar cerrado:

```json
{
  "commandName": "kortex.github.workflow.rerun_failed",
  "reason": "Verify GitHub command gate from Greenhouse",
  "payload": { "runId": 27681588991 }
}
```

Respuesta esperada antes de habilitar flags: `409 kortex_github_command_disabled`.

Smoke validado 2026-06-17 antes del flip: `409 kortex_github_command_disabled`.

Post-flip staging 2026-06-17:

- Redeploy: `https://greenhouse-9j6rau39c-efeonce-7670142f.vercel.app`, id `dpl_4cha9fkbXZSPc6QqjhABYMaovMN7`, target `staging`, `Ready`, alias `dev-greenhouse.efeoncepro.com`.
- Reader: `GET /api/admin/kortex/github-control-plane` -> HTTP `200`, `confidence=high`, latest CI run `27681588991` success.
- Global flag smoke sin write: `kortex.github.workflow.rerun_failed` contra run exitoso `27681588991` -> `409 kortex_github_command_not_allowed` con `conclusion=success`.
- Dispatch flag smoke sin write: `kortex.github.workflow.dispatch` sobre `CI/main` sin frase humana -> `409 kortex_github_confirmation_required`.

No ejecutar `workflow.dispatch` real sin owner humano, workflow/ref allowlisted, frase `DISPATCH KORTEX WORKFLOW` y proposito operacional claro.

## Antes de ejecutar live/admin real

Checklist live:

1. Kortex OAuth activo para el portal HubSpot objetivo.
2. Binding Greenhouse/Kortex activo.
3. `KORTEX_COMMAND_ALLOWED_PORTALS` incluye solo portal/scope esperado.
4. Dry-run ejecutado y revisado.
5. `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=true` solo en el target aprobado; en staging esta prendido para pruebas desde 2026-06-17.
6. Confirmacion humana con `EXECUTE KORTEX RELEASE`.
7. Monitoreo de command execution y logs Kortex.

Checklist admin:

1. Owner humano presente.
2. Razon operacional concreta.
3. `KORTEX_COMMAND_ADMIN_ENABLED=true` solo en el target aprobado; en staging esta prendido para pruebas desde 2026-06-17.
4. `KORTEX_COMMAND_ADMIN_TOKEN` o `KORTEX_ADMIN_BOOTSTRAP_TOKEN` provisionado server-only; en staging usa `KORTEX_COMMAND_ADMIN_TOKEN` desde Secret Manager `kortex-admin-bootstrap-token`.
5. Confirmacion humana con `EXECUTE KORTEX ADMIN COMMAND`.
6. Apagar flag despues de la operacion si era breakglass temporal.

## Errores esperados

| Error | Significado |
|---|---|
| `kortex_command_adapter_disabled` | Adapter apagado por flag. |
| `kortex_binding_missing` | No hay binding Greenhouse/Kortex activo. |
| `kortex_portal_mismatch` | Portal/binding no calza o no esta allowlisted. |
| `kortex_live_execute_disabled` | Live external write apagado. |
| `kortex_admin_command_disabled` | Admin/breakglass apagado. |
| `kortex_confirmation_required` | Falta frase live. |
| `kortex_admin_confirmation_required` | Falta frase admin. |
| `kortex_preview_required` | Falta dry-run vigente. |
| `kortex_preflight_failed` | Kortex rechazo o fallo upstream; revisar sources/logs redacted. |
| `kortex_github_command_disabled` | GitHub commands de Kortex apagados por flag. |
| `kortex_github_command_not_allowed` | Workflow/ref/run no permitido por allowlist o estado. |
| `kortex_github_confirmation_required` | Falta frase humana para dispatch. |
| `kortex_github_preflight_failed` | No se pudo verificar workflow/run antes del write. |
| `kortex_github_upstream_failed` | GitHub Actions API rechazo el command; revisar logs redacted. |

## Higiene Vercel

El deploy de Greenhouse no debe subir evidencia local ni caches de agentes. `.vercelignore` debe excluir:

- `.captures`
- `.codex`
- `.claude`
- `.agents`
- `.tmp`
- `tmp`
- `artifacts`
- `videos`
- `test-results`
- `tsconfig.tsbuildinfo`

Si un deploy vuelve a subir GBs, detener/remover la corrida inflada y revisar `du -sh .[^.]* *`.
