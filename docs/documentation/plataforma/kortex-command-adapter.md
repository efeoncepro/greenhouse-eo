# Kortex Command Adapter

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.1
> **Creado:** 2026-06-17 por Codex
> **Modulo:** Plataforma / Integraciones / Kortex / HubSpot
> **Contrato runtime:** `greenhouse-kortex-command-adapter.v1`

## Para que sirve

Permite que Greenhouse solicite a Kortex operaciones de auditoria, estrategia, conversaciones, hub profile, releases y admin/breakglass con trazabilidad. Kortex sigue siendo el runtime que modifica HubSpot.

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
- `external_write` requiere `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=true`, dry-run reciente cuando aplica y frase humana.
- `admin_breakglass` requiere `KORTEX_COMMAND_ADMIN_ENABLED=true` y frase humana.
- La respuesta es redacted.

## Catalogo de comandos

- `safe`: `kortex.strategy.normalize`.
- `stateful`: `kortex.portal.hub_profile.put`, `kortex.audit.run`, `kortex.strategy.intake`, `kortex.strategy.seed_from_audit`, `kortex.strategy.workspace.update`, `kortex.strategy.workspace.compilation_run.create`, `kortex.strategy.compile`, `kortex.strategy.workspace.approval_decision.create`, `kortex.strategy.release_candidate.dry_run`, `kortex.strategy.conversation.create`, `kortex.strategy.chat.send`, `kortex.strategy.conversation.extract`.
- `external_write`: `kortex.strategy.release_candidate.execute`, `kortex.strategy.release_candidate.execute_workflows`, `kortex.strategy.release_candidate.execute_custom_objects`.
- `admin_breakglass`: `kortex.admin.snapshots.trigger`, `kortex.admin.auth.verify`, `kortex.admin.users.seed`, `kortex.admin.users.bootstrap_e2e_agent`, `kortex.strategy.operation.execute_internal`.

El source of truth del catalogo es `src/lib/kortex/commands/registry.ts`; el adapter no acepta `path` arbitrario desde el request.

## Estado operativo

Al 2026-06-17, Greenhouse staging tiene el adapter base desplegado, Kortex esta conectado al portal HubSpot `48713323` y el smoke `kortex.audit.run` completo `200 completed`. TASK-1165 amplia el catalogo completo con live/admin apagados por defecto.

## Que no hace

- No crea UI.
- No escribe HubSpot directo.
- No reemplaza Kortex.
- No agrega `kortex.*` al catalogo interno de entitlements.
