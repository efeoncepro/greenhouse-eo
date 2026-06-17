# Operar Kortex Command Adapter

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-06-17 por Codex
> **Modulo:** Plataforma / Integraciones / Kortex
> **Ruta en portal:** API interna `POST /api/admin/kortex/commands`

## Para que sirve

Sirve para pedirle a Kortex que ejecute operaciones HubSpot/estrategia/admin desde Greenhouse con audit trail, idempotencia y confirmacion humana.

## Antes de empezar

- Tener sesion interna admin.
- Confirmar binding Kortex con `GET /api/admin/kortex/control-plane`.
- Usar un `Idempotency-Key` nuevo por intento real.
- Confirmar que el ambiente tenga `KORTEX_COMMAND_ADAPTER_ENABLED=true`.
- Para comandos live HubSpot, confirmar `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=true`.
- Para comandos admin/breakglass, confirmar `KORTEX_COMMAND_ADMIN_ENABLED=true` y token server-only `KORTEX_COMMAND_ADMIN_TOKEN` o `KORTEX_ADMIN_BOOTSTRAP_TOKEN`.

## Paso a paso

Crear una conversacion de estrategia:

```json
{
  "commandName": "kortex.strategy.conversation.create",
  "hubspotPortalId": "48713323",
  "reason": "Create strategy conversation for the connected portal",
  "payload": {
    "title": "Portal strategy",
    "defaultModelEngine": "claude"
  }
}
```

Dry-run:

```http
POST /api/admin/kortex/commands
Idempotency-Key: kortex-rc-123-dry-run-20260617
Content-Type: application/json
```

```json
{
  "commandName": "kortex.strategy.release_candidate.dry_run",
  "hubspotPortalId": "51183921",
  "reason": "Dry-run release candidate before live execution",
  "payload": {
    "releaseCandidateId": "rc_123"
  }
}
```

Live execute:

```json
{
  "commandName": "kortex.strategy.release_candidate.execute",
  "hubspotPortalId": "51183921",
  "reason": "Execute approved release candidate after validated dry-run",
  "payload": {
    "releaseCandidateId": "rc_123"
  },
  "confirmation": {
    "confirmed": true,
    "phrase": "EXECUTE KORTEX RELEASE",
    "previewCommandExecutionId": "cmd_dry_run_..."
  }
}
```

Admin/breakglass:

```json
{
  "commandName": "kortex.admin.snapshots.trigger",
  "hubspotPortalId": "48713323",
  "reason": "Trigger Kortex adoption snapshots for the connected portal",
  "payload": {},
  "confirmation": {
    "confirmed": true,
    "phrase": "EXECUTE KORTEX ADMIN COMMAND"
  }
}
```

## Catalogo por tier

- `safe`: `kortex.strategy.normalize`.
- `stateful`: hub profile, audit, intake, seed from audit, workspace update, compilation run, compile, approval decision, release dry-run, conversation create, chat send, conversation extract.
- `external_write`: release candidate execute, execute workflows, execute custom objects.
- `admin_breakglass`: snapshots trigger, auth verify, users seed, bootstrap E2E agent, internal operation execute.

## Bloqueos comunes

- `kortex_command_adapter_disabled`: falta flag del ambiente.
- `bad_request`: falta body, reason, payload o `Idempotency-Key`.
- `kortex_binding_missing`: no hay binding Greenhouse/Kortex.
- `kortex_portal_mismatch`: portal/binding no calza o no esta allowlisted.
- `kortex_live_execute_disabled`: live execute apagado por flag.
- `kortex_admin_command_disabled`: admin/breakglass apagado por flag.
- `kortex_confirmation_required`: falta confirmacion humana.
- `kortex_admin_confirmation_required`: falta frase `EXECUTE KORTEX ADMIN COMMAND`.
- `kortex_preview_required`: no hay dry-run vigente.
- `kortex_preflight_failed`: Kortex rechazo el preflight/upstream; revisar `sources` y logs de Kortex sin exponer secretos.

## Estado rollout 2026-06-17

Staging Greenhouse esta desplegado y el adapter responde. Kortex esta instalado en HubSpot portal `48713323`; el smoke `kortex.audit.run` completo `200 completed`. TASK-1165 agrega el catalogo completo en codigo con `external_write` y `admin_breakglass` apagados por defecto hasta aprobacion explicita.

## Que no hacer

- No llamar Kortex directo desde browser o agentes.
- No escribir HubSpot directo desde Greenhouse.
- No reutilizar un `Idempotency-Key` con payload distinto.
- No habilitar live execute en production sin staging smoke y aprobacion.
- No habilitar admin/breakglass sin owner humano presente y razon operacional concreta.
