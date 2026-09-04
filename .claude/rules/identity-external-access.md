---
paths:
  - "src/lib/identity/external-access/**"
  - "src/app/api/admin/identity/external-access/**"
  - "src/app/api/platform/ecosystem/identity/**"
  - "scripts/identity/**"
---

# Identity / External access binding (TASK-1631) — invariantes (auto-load por path)

Carga **`docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` → §"External identity binding (TASK-1631)"** + funcional `docs/documentation/identity/binding-identidad-externa-mcp.md`. Contexto: el grant revocable por organización y por persona YA existe (`greenhouse_core.external_capability_grants`, aplicado 2026-09-04); el emisor propio y el gateway multi-issuer que emiten tokens con `gv` son EPIC-044 (TASK-1829/1830/1831/1832; ADR `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`).

Grafo: `external_identity_environments` → `external_organization_bindings` (`grants_version`) → `external_capability_grants` (`profile_id` NULL = todo el binding) → `external_member_invitations` (la fila `linked` ES la membership; `person_memberships` no se escribe). Persona = source link `external_idp:<environment_id>` + `subject`. El gateway resuelve por `(environment, subject)` en `GET /api/platform/ecosystem/identity/binding` (sólo binding `internal`; 404 anti-oráculo; `grantsVersion` por IGUALDAD contra el claim `gv`; TTL 60 s).

Reglas duras:

1. **NUNCA** escribir `greenhouse_core.external_*` fuera de los commands de `src/lib/identity/external-access/commands.ts` (una tx: estado + audit + outbox; los dos logs son append-only con trigger; el token de invitación se devuelve UNA vez y sólo se persiste su sha256).
2. **NUNCA** resolver una persona por `client_id` ni por email: sólo por `(environment_id, subject)` vía `identity_profile_source_links` (`external_idp:<env>`). El email sólo desambigua al ACEPTAR una invitación y >1 match es `identity_collision`, nunca "el primero".
3. **NUNCA** llavear nada por el `issuer_url` crudo: la clave es `environment_id`; rotar issuer es un UPDATE auditado del environment e `issuer_class` es inmutable.
4. **SIEMPRE** bump de `grants_version` cuando cambia la autoridad (grant nuevo; revoke de grant, member o binding). El gateway compara por igualdad: un cambio sin bump sigue sirviendo el token viejo hasta que expire.
5. **SIEMPRE** `pnpm identity:external-access:smoke` (read-only; `-- --apply` sólo contra el fixture `ZZZ Q2C Smoke Fixture`) tras tocar SQL, readers o señales: ningún test con mocks ejercita el SQL — el primer `--apply` real atrapó un CHECK bidireccional que Vitest no vio.
