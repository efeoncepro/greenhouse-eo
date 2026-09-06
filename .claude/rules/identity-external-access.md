---
paths:
  - "src/lib/identity/external-access/**"
  - "src/lib/identity/internal-access/**"
  - "src/app/api/admin/identity/external-access/**"
  - "src/app/api/platform/ecosystem/identity/**"
  - "scripts/identity/**"
---

# Identity / External access binding (TASK-1631) — invariantes (auto-load por path)

Carga **`docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` → §"External identity binding (TASK-1631)"** + funcional `docs/documentation/identity/binding-identidad-externa-mcp.md`. Contexto: el grant revocable por organización y por persona YA existe (`greenhouse_core.external_capability_grants`, aplicado 2026-09-04); el emisor propio y el gateway multi-issuer que emiten tokens con `gv` son EPIC-044 (TASK-1829/1830/1831/1832; ADR `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`).

Grafo: `external_identity_environments` → `external_organization_bindings` (`grants_version`) → `external_capability_grants` (`profile_id` NULL = todo el binding) → `external_member_invitations` (la fila `linked` ES la membership; `person_memberships` no se escribe). Persona = source link `external_idp:<environment_id>` + `subject`. El gateway resuelve por `(environment, subject)` en `GET /api/platform/ecosystem/identity/binding` (sólo binding `internal`; 404 anti-oráculo; `grantsVersion` por IGUALDAD contra el claim `gv`; TTL 60 s).

Reglas duras:

1. **NUNCA** escribir `greenhouse_core.external_*` fuera del núcleo canónico `src/lib/identity/external-access/commands.ts` y `authority-transactions.ts`. El wrapper interno compone las mismas primitives dentro de una única tx: estado + audit externo + outbox + versión; su audit interno es complementario. Población del binding explícita e inmutable: externo cliente activo + `linked`; interno enrollment + workforce y entidad operativa propia activos. Recuperación externa no toca source links internos. Ver delta de integridad del ADR interno TASK-1836. Los logs son append-only; reconciliar con actor/razón actuales, no fabricar historia. El token de invitación se devuelve UNA vez y sólo persiste sha256.
2. **NUNCA** resolver una persona por `client_id` ni por email: sólo por `(environment_id, subject)` vía `identity_profile_source_links` (`external_idp:<env>`). El email sólo desambigua al ACEPTAR una invitación y >1 match es `identity_collision`, nunca "el primero".
3. **NUNCA** llavear nada por el `issuer_url` crudo: la clave es `environment_id`; rotar issuer es un UPDATE auditado del environment e `issuer_class` es inmutable.
4. **SIEMPRE** bump de `grants_version` cuando cambia la autoridad (grant nuevo; revoke de grant, member o binding). El gateway compara por igualdad: un cambio sin bump sigue sirviendo el token viejo hasta que expire.
5. **SIEMPRE** `pnpm identity:external-access:smoke` (read-only; `-- --apply` sólo contra el fixture `ZZZ Q2C Smoke Fixture`) tras tocar SQL, readers o señales: ningún test con mocks ejercita el SQL — el primer `--apply` real atrapó un CHECK bidireccional que Vitest no vio.
6. **Entrega e invitación delegada (TASK-1837)** — cargar el mismo doc → §"Entrega gobernada de la invitación externa y autoridad delegada (TASK-1837)". Con entrega del sistema el token **NUNCA** viaja en la respuesta HTTP (sólo `delivery.mode='manual'`, flag OFF); la URL de aceptación sale **SIEMPRE** del `issuer_url` del environment, nunca de `NEXT_PUBLIC_APP_URL`; reenviar = rotar (la abierta queda `revoked`); revelar = excepción con capability + razón + 1 h + señal steady 0; el admin delegado **NUNCA** se eleva ni invita fuera de su binding (lane ecosystem por `(environment, subject)`); el consentimiento **SIEMPRE** muestra el host del `redirect_uri`. Verbos delegados `resend` (rotar sólo dentro del propio binding; ajena ⇒ `not_found`) y `revoke` (scope `invitation` o `member` con bump de `grants_version`; **NUNCA** a sí mismo ⇒ `invalid_request`) en `…/ecosystem/identity/invitations/[invitationId]/{resend,revoke}`; la escritura vía gateway usa el scope `efeonce.mcp.identity.write` (consentimiento explícito + step-up; sólo persona nativa externa). Flags (default OFF, sólo Vercel, en el ledger): `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` y `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED`; el rebote (ops-worker) no tiene flag. Estado 2026-09-06: migración aplicada; verificado end-to-end en staging (flags ON en staging); follow-ups cerrados 2026-09-06; producción pendiente de release; PR #3 del gateway abierto.
