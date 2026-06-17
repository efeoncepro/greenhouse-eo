# Kortex Command Adapter

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.2
> **Creado:** 2026-06-17 por Codex
> **Modulo:** Plataforma / Integraciones / Kortex / HubSpot
> **Contrato runtime:** `greenhouse-kortex-command-adapter.v1`

> **Mapa por capas:** [`docs/architecture/kortex/README.md`](../../architecture/kortex/README.md)

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

Al 2026-06-17, Greenhouse staging tiene el adapter completo desplegado contra Kortex/HubSpot portal `48713323`.

Estado de staging:

- Deploy activo: `greenhouse-dnr2e8c04-efeonce-7670142f.vercel.app`, aliased a `dev-greenhouse.efeoncepro.com`.
- `KORTEX_COMMAND_ADAPTER_ENABLED=true`.
- `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=true`.
- `KORTEX_COMMAND_ADMIN_ENABLED=true`.
- `KORTEX_COMMAND_ADMIN_TOKEN` provisionado como secret server-only.

Smokes vigentes:

- `kortex.strategy.normalize` -> `200 completed`, `EO-APC-86281ABC`.
- `kortex.strategy.release_candidate.execute_workflows` con release candidate dummy -> `409 kortex_preview_required`; esto confirma que live ya no bloquea por flag y que el dry-run sigue siendo obligatorio antes de un write real.
- `kortex.admin.users.bootstrap_e2e_agent` -> `200 completed`, `EO-APC-E138ACF4`; esto confirma admin flag + token sin tocar HubSpot.

Production no fue modificado por este rollout.

## Que no hace

- No crea UI.
- No escribe HubSpot directo.
- No reemplaza Kortex.
- No agrega `kortex.*` al catalogo interno de entitlements.
