# TASK-839 — ISSUE-068 Fase 5: Wire Admin Center governance mutation paths

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation` (UI + API + outbox + audit log)
- Epic: `—`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none` (TASK-838 cerrada — infraestructura DB + observability + CI gate listas)
- Branch: `task/TASK-839-issue-068-fase-5-admin-center-governance-wire-up`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Activa la capa de governance overlay del Admin Center (defaults por rol + overrides personales por usuario) que TASK-404 declaró pero nunca quedó wired a writes reales. La infraestructura DB existe desde TASK-838 (ISSUE-068 Fase 1). Falta conectar 4-5 endpoints de mutation a la tabla canónica con outbox event + audit log + UI degraded mode honesto.

**Spec referenciado**: `docs/issues/resolved/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md` (Fase 5 del plan multi-fase 4-pillar).

## Why This Task Exists

- TASK-404 construyó UI surfaces de Admin Center > Gobernanza pero los writes **nunca alcanzaron PG** (governance tables no existían — pre-up-marker bug, ISSUE-068).
- TASK-838 Fases 1-4 crearon las 3 governance tables + FK enforcement + reliability signal + CI gate. **La data plane está lista**.
- Falta la **API plane**: cada endpoint que muta gobernanza debe escribir en la tabla canónica + publicar outbox event + insertar en audit log + propagar invalidación de cache.
- Sin esto, los admins escriben en Admin Center pero los grants no se aplican — silent failure UX.

## Goal

- Cada mutation de governance (defaults por rol, overrides personales por usuario, startup policy) hace write atómica en una sola transacción: insert en governance table + outbox event + audit log row.
- TASK-611 Slice 6 reactive consumer ya está wireado para los 5 events canónicos (`access.entitlement_role_default_changed`, `access.entitlement_user_override_changed`, `role.assigned`, `role.revoked`, `user.deactivated`). Validar end-to-end.
- UI Admin Center: si la transaction falla, mensaje honesto de error. NO silent-fail. Cuando funciona, banner de confirmación + audit row visible en log viewer.
- Capability granular least-privilege per endpoint (`access.governance.role_defaults.update`, `access.governance.user_overrides.create`, etc.).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/issues/resolved/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md` (Fase 5 del plan canónico)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` Delta 2026-04-17 (TASK-404 contrato) + Delta 2026-05-08 (TASK-611 namespace organization)
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` V1.1 (cómo la projection consume el bag de capabilities — lectura, no escritura)
- `docs/tasks/complete/TASK-404-entitlements-governance-admin-center.md` (UI surfaces ya construidas)
- `docs/tasks/complete/TASK-611-...-foundation.md` Slice 6 (reactive consumer canónico — ya escucha los eventos correctos)

Reglas obligatorias:

- **NUNCA** escribir directo en `role_entitlement_defaults` / `user_entitlement_overrides` sin pasar por endpoint canónico que maneja outbox + audit log atómicos.
- **NUNCA** insertar en `entitlement_governance_audit_log` con UPDATE/DELETE — es append-only por triggers PG (TASK-838 Fase 1).
- **NUNCA** otorgar `*_sensitive` capabilities sin approval workflow del Admin Center (TASK-404 spec).
- **SIEMPRE** capability granular least-privilege; nada de checks broad.
- **SIEMPRE** publicar outbox event en la misma transaction que el write — pattern TASK-771.
- **SIEMPRE** que un grant aplique, validar que el reactive consumer (TASK-611 Slice 6) drop-ea el cache del subject afectado en pocos segundos.

## Normative Docs

- `docs/architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md` (TASK-742 7-layer pattern)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (eventos canónicos)
- `src/lib/sync/event-catalog.ts` líneas 272-274 (los 3 events `access.*` ya declarados)

## Dependencies & Impact

### Depends on

- `greenhouse_core.role_entitlement_defaults` (creada TASK-838 Fase 1)
- `greenhouse_core.user_entitlement_overrides` (creada TASK-838 Fase 1)
- `greenhouse_core.entitlement_governance_audit_log` (creada TASK-838 Fase 1, append-only)
- FK constraints `*_capability_fk` (creadas TASK-838 Fase 4)
- `capabilities_registry` (creada TASK-611 Slice 2)
- `organizationWorkspaceCacheInvalidationProjection` (creada TASK-611 Slice 6 — ya consume `access.entitlement_*` events)

### Blocks / Impacts

- Cualquier feature futura que dependa de overrides finos por usuario o defaults configurables por rol del Admin Center
- Onboarding/offboarding workflows que necesiten otorgar/revocar grants temporales

### Files owned (probables)

- `src/app/api/admin/governance/access/role-defaults/**` (endpoints de role defaults)
- `src/app/api/admin/users/[id]/access/overrides/**` (endpoints de overrides personales)
- `src/lib/admin/governance/role-defaults-store.ts` (canonical writer + outbox + audit)
- `src/lib/admin/governance/user-overrides-store.ts`
- `src/lib/admin/governance/audit-log-reader.ts`
- `src/views/greenhouse/admin/governance/**` (UI surfaces — ya pueden existir desde TASK-404; revisar)

## Current Repo State

### Already exists (TASK-404 + TASK-611 + TASK-838 ya entregados)

- 3 governance tables creadas en PG (TASK-838 Fase 1).
- FK enforcement de `capability` columns → `capabilities_registry.capability_key` (TASK-838 Fase 4).
- 3 events canónicos en `EVENT_TYPES` (`access.entitlement_role_default_changed`, `access.entitlement_user_override_changed`, `access.startup_policy_changed`).
- 2 events agregados a `REACTIVE_EVENT_TYPES` (TASK-611 Slice 6 + TASK-611 Slice 6).
- Reactive consumer escuchando los 5 events canónicos (TASK-611 Slice 6) — droppa cache del subject afectado.
- UI surfaces de Admin Center > Gobernanza posiblemente construidas (TASK-404 — verificar).

### Gap

- Endpoints de mutation pueden estar swallow-eando errors porque la tabla no existía.
- O pueden no existir aún. **Slice 0 de discovery debe inventariar qué endpoints existen y qué hacen hoy**.
- Audit log probablemente no se escribe (mismo motivo).
- Outbox events probablemente no se publican (mismo motivo).
- UI: probablemente no distingue success real de silent failure — necesita degraded mode honesto + banners.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Discovery + caller inventory

- Buscar endpoints existentes que mencionen las 3 governance tables.
- Inventariar UI surfaces de Admin Center > Gobernanza (probablemente bajo `src/views/greenhouse/admin/governance/`).
- Listar cada endpoint: estado actual (route + body + response shape), qué hace hoy (si swallow-ea, throw, no-op).
- Documentar caller inventory en este task file (Zone 1 sección "Already exists" actualizada).

### Slice 1 — Role defaults mutation path

- Helper canónico `upsertRoleEntitlementDefault({spaceId, roleCode, capability, action, scope, effect, reason, actorUserId})` en `src/lib/admin/governance/role-defaults-store.ts`.
- Transacción atómica:
  1. UPSERT en `role_entitlement_defaults` (UNIQUE composite `space_id, role_code, capability, action, scope`).
  2. INSERT en `entitlement_governance_audit_log` con `change_type='role_default_grant'` o `'role_default_revoke'`.
  3. `publishOutboxEvent('access.entitlement_role_default_changed', { roleCode, capability, action, scope, effect, actorUserId, spaceId })`.
- Endpoint `POST /api/admin/governance/access/role-defaults` con capability `access.governance.role_defaults.update` (FINANCE_ADMIN solo si toca finance.*; EFEONCE_ADMIN para todas).
- Validación: capability debe existir en `capabilities_registry` y no estar `deprecated_at`.
- 5+ tests: happy path, idempotency, capability inexistente (FK violation expected → 400), audit row append-only, outbox event publicado.

### Slice 2 — User overrides mutation path

- Helper canónico `upsertUserEntitlementOverride({spaceId, userId, capability, action, scope, effect, reason, expiresAt, actorUserId})` en `src/lib/admin/governance/user-overrides-store.ts`.
- Transacción atómica equivalente (UPSERT + audit + outbox `access.entitlement_user_override_changed`).
- Endpoint `POST /api/admin/users/[id]/access/overrides` con capability `access.governance.user_overrides.create`.
- **Approval workflow** para sensitive grants (`*_sensitive`): grant queda en `pending_approval` hasta segunda firma admin.
- 5+ tests análogos a Slice 1 + 2 tests del approval workflow.

### Slice 3 — Audit log reader + UI

- Helper read-only `listGovernanceAuditEntries({spaceId, fromDate, toDate, changeType?, targetUserId?})` paginado.
- Endpoint `GET /api/admin/governance/access/audit-log` con capability `access.governance.audit_log.read`.
- Vista `/admin/governance/access/audit-log` con tabla + filtros + export CSV.
- UI: render de cada row con `actor_user_id`, `change_type`, `target_role`/`target_user`, `capability`, `action`, `scope`, `effect`, `reason`, `created_at` formato es-CL.

### Slice 4 — UI degraded mode honesto

- Si el endpoint POST/DELETE falla, surface banner es-CL tuteo: "No pudimos aplicar el cambio. <razón sanitizada>". NO silent-fail.
- Si la transaction succeed: banner verde "Cambio aplicado. El usuario verá la diferencia en pocos segundos." (+ link al audit row recién creado).
- Si el audit log no escribió por algún error edge case: el endpoint retorna 500 (transacción falló), UI muestra banner rojo. La governance table NO se persistió.
- Skill obligatorio: `greenhouse-ux-writing` para todo el copy nuevo.

### Slice 5 — End-to-end test (Playwright + downstream-verified marker)

- Playwright smoke: admin login → `/admin/governance/access` → otorgar capability → verificar audit row + outbox event publicado + cache del subject droppada.
- Test de propagación: change capability → request del subject afectado refleja el grant en < 30s (TTL del cache + reactive consumer).
- Commit con `[downstream-verified: admin-governance-mutation]` per CLAUDE.md regla.

### Slice 6 — Capabilities granulares + seed inicial

- Agregar al catalog TS:
  - `access.governance.role_defaults.update` / `read`
  - `access.governance.user_overrides.create` / `read` / `approve` (sensitive grants)
  - `access.governance.startup_policy.update`
  - `access.governance.audit_log.read`
- Migration que seedea estas capabilities en `capabilities_registry` (disciplina TASK-611 Slice 2).
- Otorgarlas en `runtime.ts` solo a `efeonce_admin` (least privilege; opcionalmente `finance_admin` para `role_defaults` con capability `finance.*`).
- Parity test live verde post-seed.

### Slice 7 — Reliability signals + closing

- Signal `identity.governance.audit_log_write_failures` (drift, error si > 0). Detecta endpoints que retornaron 500 sin audit row creada.
- Signal `identity.governance.pending_approval_overdue` (drift, warning si > 7 días). Detecta sensitive grants en `pending_approval` sin segunda firma.
- 4-pillar score block.
- ISSUE-068 ya cerrada por TASK-838; este Slice solo confirma que el wire-up no introduce regresiones.

## Out of Scope

- Cambiar el modelo runtime de pure-function a DB-backed. El runtime sigue siendo pure-function; las governance tables son admin overlay.
- Approval workflow más complejo que segunda firma (e.g. tres firmas, jerarquías de approval) — out of scope V1.
- UI Spec Mockup completo del Admin Center > Gobernanza (asumir que TASK-404 ya lo dejó construido; verificar en Slice 0 y solo extender lo necesario).

## Acceptance Criteria

- [ ] Slice 0 caller inventory completado y documentado en este task file.
- [ ] `upsertRoleEntitlementDefault` + `upsertUserEntitlementOverride` helpers canónicos atómicos (UPSERT + audit + outbox).
- [ ] 4 endpoints nuevos o existentes wireados con capability granular + outbox + audit + degraded mode.
- [ ] UI honest degraded mode (es-CL tuteo via `greenhouse-ux-writing`).
- [ ] Playwright smoke con `[downstream-verified: admin-governance-mutation]` marker.
- [ ] Capabilities granulares seedeadas en `capabilities_registry` + parity test verde.
- [ ] 2 reliability signals (`audit_log_write_failures`, `pending_approval_overdue`) registrados.
- [ ] 4-pillar score block presente en este task file.
- [ ] CLAUDE.md sección actualizada (sumar las invariantes de wire-up al cuerpo existente de Organization Workspace projection).

## Verification

- `pnpm lint` + `pnpm tsc --noEmit` + `pnpm test`
- `pnpm pg:doctor` post-changes
- Live test: admin otorga capability → cache del subject droppada en < 30s.
- Audit log: cada mutation deja una row append-only, los triggers PG bloquean UPDATE/DELETE.
- Outbox: events `access.entitlement_*_changed` aparecen en `outbox_events` con `status='pending'` post-mutation.
- Reactive consumer dead-letter signal en steady=0.

## Closing Protocol

Estándar (mover a complete + sync README + Handoff + changelog + 4-pillar score).

## Follow-ups

- TASK-840 (Fase 6 — Cleanup deprecated capabilities oportunista).
