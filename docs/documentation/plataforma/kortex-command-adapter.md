# Kortex Command Adapter

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-17 por Codex
> **Modulo:** Plataforma / Integraciones / Kortex / HubSpot
> **Contrato runtime:** `greenhouse-kortex-command-adapter.v1`

## Para que sirve

Permite que Greenhouse solicite a Kortex operaciones de auditoria, compilacion de estrategia, dry-run y execute con trazabilidad. Kortex sigue siendo el runtime que modifica HubSpot.

## Contrato

```http
POST /api/admin/kortex/commands
Idempotency-Key: <stable-key>
Content-Type: application/json
```

Ejemplo:

```json
{
  "commandName": "kortex.strategy.release_candidate.dry_run",
  "hubspotPortalId": "51183921",
  "reason": "Validate the release candidate before live execution",
  "payload": {
    "releaseCandidateId": "rc_123"
  }
}
```

## Guardrails

- Requiere admin interno.
- Requiere `Idempotency-Key`.
- Requiere binding Kortex resuelto.
- Requiere `KORTEX_COMMAND_ADAPTER_ENABLED=true`.
- Live execute requiere flag live, dry-run reciente y frase humana.
- La respuesta es redacted.

## Que no hace

- No crea UI.
- No escribe HubSpot directo.
- No reemplaza Kortex.
- No agrega `kortex.*` al catalogo interno de entitlements.
