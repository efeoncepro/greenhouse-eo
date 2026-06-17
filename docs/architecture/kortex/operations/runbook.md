# Runbook operativo Kortex desde Greenhouse

## Estado staging validado

- Greenhouse deploy: `greenhouse-s63g4vzwt-efeonce-7670142f.vercel.app`
- Alias: `dev-greenhouse.efeoncepro.com`
- Package Vercel corregido: upload `57MB` despues de excluir artefactos locales.
- Deployment inflado removido: `greenhouse-hyqnb6n6k-efeonce-7670142f.vercel.app`

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
| `kortex.strategy.normalize` | `200 completed`, `EO-APC-0D842212` |
| `kortex.strategy.release_candidate.execute_workflows` | `409 kortex_live_execute_disabled` |
| `kortex.admin.snapshots.trigger` | `409 kortex_admin_command_disabled` |

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

## Antes de habilitar live/admin

Checklist live:

1. Kortex OAuth activo para el portal HubSpot objetivo.
2. Binding Greenhouse/Kortex activo.
3. `KORTEX_COMMAND_ALLOWED_PORTALS` incluye solo portal/scope esperado.
4. Dry-run ejecutado y revisado.
5. `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=true` solo en el target aprobado.
6. Confirmacion humana con `EXECUTE KORTEX RELEASE`.
7. Monitoreo de command execution y logs Kortex.

Checklist admin:

1. Owner humano presente.
2. Razon operacional concreta.
3. `KORTEX_COMMAND_ADMIN_ENABLED=true` solo en el target aprobado.
4. `KORTEX_COMMAND_ADMIN_TOKEN` o `KORTEX_ADMIN_BOOTSTRAP_TOKEN` provisionado server-only.
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
