# Operar Kortex Command Adapter

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-17 por Codex
> **Modulo:** Plataforma / Integraciones / Kortex
> **Ruta en portal:** API interna `POST /api/admin/kortex/commands`

## Para que sirve

Sirve para pedirle a Kortex que ejecute operaciones HubSpot/estrategia desde Greenhouse con audit trail, idempotencia y confirmacion humana.

## Antes de empezar

- Tener sesion interna admin.
- Confirmar binding Kortex con `GET /api/admin/kortex/control-plane`.
- Usar un `Idempotency-Key` nuevo por intento real.
- Confirmar que el ambiente tenga `KORTEX_COMMAND_ADAPTER_ENABLED=true`.

## Paso a paso

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

## Bloqueos comunes

- `kortex_command_adapter_disabled`: falta flag del ambiente.
- `bad_request`: falta body, reason, payload o `Idempotency-Key`.
- `kortex_binding_missing`: no hay binding Greenhouse/Kortex.
- `kortex_portal_mismatch`: portal/binding no calza o no esta allowlisted.
- `kortex_live_execute_disabled`: live execute apagado por flag.
- `kortex_confirmation_required`: falta confirmacion humana.
- `kortex_preview_required`: no hay dry-run vigente.

## Que no hacer

- No llamar Kortex directo desde browser o agentes.
- No escribir HubSpot directo desde Greenhouse.
- No reutilizar un `Idempotency-Key` con payload distinto.
- No habilitar live execute en production sin staging smoke y aprobacion.
