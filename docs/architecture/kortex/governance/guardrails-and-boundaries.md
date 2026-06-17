# Guardrails y limites Kortex desde Greenhouse

## Reglas duras

- Greenhouse no escribe HubSpot directo.
- Greenhouse no lee Cloud SQL de Kortex.
- Greenhouse no expone secretos Kortex/HubSpot al browser.
- Greenhouse no acepta paths arbitrarios hacia Kortex.
- Todo comando requiere `Idempotency-Key`.
- Todo comando pasa por `executeApiPlatformCommand()` y queda auditado en `greenhouse_core.api_platform_command_executions`.
- Los errores upstream se redacted antes de respuesta/persistencia.
- Los comandos GitHub de Kortex no aceptan `owner`, `repo`, method ni path desde request; `efeoncepro/kortex` queda fijado server-side.

## Flags

| Flag | Default esperado | Efecto |
|---|---|---|
| `KORTEX_COMMAND_ADAPTER_ENABLED` | `false` salvo staging/ambiente controlado | Habilita cualquier comando. |
| `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED` | `false` | Habilita `external_write`. |
| `KORTEX_COMMAND_ADMIN_ENABLED` | `false` | Habilita `admin_breakglass`. |
| `KORTEX_COMMAND_ALLOWED_PORTALS` | allowlist acotada | Restringe portal/binding autorizado. |
| `KORTEX_COMMAND_ADMIN_TOKEN` / `KORTEX_ADMIN_BOOTSTRAP_TOKEN` | server-only | Se envia como `X-Kortex-Admin-Token` solo para admin/breakglass. |
| `KORTEX_GITHUB_COMMANDS_ENABLED` | `false` | Habilita comandos GitHub de Kortex. |
| `KORTEX_GITHUB_WORKFLOW_DISPATCH_ENABLED` | `false` | Habilita `workflow_dispatch` sobre Kortex. |
| `KORTEX_GITHUB_ALLOWED_WORKFLOWS` | `CI` | Allowlist de workflows GitHub permitidos. |
| `KORTEX_GITHUB_ALLOWED_REFS` | `main,develop` | Allowlist de refs permitidos para dispatch. |

## Estado de flags por ambiente — 2026-06-17

| Ambiente | Estado |
|---|---|
| `staging` | `adapter=true`, `live_execute=true`, `admin_breakglass=true`, `KORTEX_COMMAND_ADMIN_TOKEN` provisionado como Vercel sensitive env. Habilitado por aprobacion explicita del operador para pruebas controladas. |
| `production` | Live/admin no habilitados por este rollout. Cualquier flip productivo requiere aprobacion explicita separada, dry-run cuando aplique, frase humana y smoke productivo dedicado. |

GitHub commands TASK-1166 quedan **OFF por default** en todos los ambientes hasta rollout especifico. El reader `GET /api/admin/kortex/github-control-plane` es read-only y puede operar con GitHub Actions read.

Pruebas staging vigentes:

- `kortex.strategy.normalize` -> `200 completed`, `EO-APC-86281ABC`.
- `kortex.strategy.release_candidate.execute_workflows` con release candidate dummy -> `409 kortex_preview_required`; valida que live ya no bloquea por flag y que el guard de dry-run sigue activo.
- `kortex.admin.users.bootstrap_e2e_agent` -> `200 completed`, `EO-APC-E138ACF4`; valida flag admin + token bootstrap sin tocar HubSpot.

## Confirmaciones humanas

Live execute:

```json
{
  "confirmed": true,
  "phrase": "EXECUTE KORTEX RELEASE",
  "previewCommandExecutionId": "..."
}
```

Admin/breakglass:

```json
{
  "confirmed": true,
  "phrase": "EXECUTE KORTEX ADMIN COMMAND"
}
```

GitHub workflow dispatch:

```json
{
  "confirmed": true,
  "phrase": "DISPATCH KORTEX WORKFLOW"
}
```

## Preview requerido

Los comandos `external_write` que ejecutan release candidates deben tener dry-run previo vigente para el mismo release candidate cuando la definicion del registry lo exige.

## Boundary con Kortex Vercel

Kortex puede tener superficies en Vercel ademas de Cloud Run. Greenhouse no debe asumir que todo Kortex vive en Cloud Run. Cada superficie debe entrar como capability o command explicito, con base URL/env/secret propios y guardrails equivalentes.

## Boundary con entitlements Greenhouse

No se agregaron `kortex.*` al catalogo interno de entitlements. En V1 la entrada es admin-only a traves de `/api/admin/kortex/*`. Si se crea UI operativa para usuarios no-admin, debe nacer con viewCode/capabilities propias en Greenhouse.
