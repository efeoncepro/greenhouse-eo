# TASK-2082 — Rooms: acceso interno durable y gobernado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-052`
- Status real: `2026-10-31: EN PRODUCCIÓN. Migración 19 aplicada en rooms_production (ensayo PASS), dueño adoptado (members.manage hasta 2027-11-01), main@a2d72c0 desplegado (dpl_5FNV9MSLdqWxuBGyim5Yoiz2UkPG, alias efeonce-rooms.vercel.app), health sin señales. Recibo docs/audits/rooms/2026-10-31-durable-access-production.md. Falta: primer login humano del dueño con la versión nueva y un segundo administrador.`
- Rank: `antes del primer cliente real y antes de dar acceso a otra persona interna`
- Domain: `platform|identity`
- Blocked by: `ninguno para el corte local; producción espera autorización (migración + merge)`
- Branch: `efeonce-rooms: rama derivada de main, sin push a main hasta autorización; Greenhouse: docs en develop`

## Delta 2026-10-31 — renovación automática al entrar

- Decisión del operador: «quiero que mi acceso se renueve solo». Migración 20 `1793261000000_rooms-member-auto-renew`
  (`auto_renew` en memberships, evento `members.autoRenewed`, guarda acotada a reducciones) y
  `src/server/access/renewal.ts`, llamado en el callback. Código en `efeonce-rooms` `claude/rooms-owner-auto-renew`
  (`ce7eff1` + fix `50f8bcd`), [PR #6](https://github.com/efeoncepro/efeonce-rooms/pull/6) sin merge; verify 387/387; ensayo de la
  migración 20 PASS (su suite destapó una carrera de reloj en `access_requests`, corregida). Producción con autorización aparte.
- [ ] Renovación al entrar en producción y verificada con el primer login del dueño.

## Delta 2026-10-31 — carril de agentes Accepted: sin enmienda

- El ADR [Carril de agentes](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md) quedó **Accepted**
  (`4d8d6553c`). Decisión del operador: «Los agentes son ciudadanos de primera clase, pueden dar acceso y publicar».
- La enmienda a esta task se retiró: `members.*` sigue en el MCP local (toolset `members`) y en la CLI tal como está
  en `510ab42`. El gate de merge sobre la exposición en MCP queda resuelto sin quitar operaciones.
- Las columnas de actor (`actor_kind`, `agent_client_id`, `channel`) van en la task del carril de agentes, en otra
  migración; no entran en la migración 19 de esta task.

## Summary

Rooms no tiene forma gobernada de dar acceso interno: la única vía en producción es el script del canary, que da
2 horas a actores sintéticos. El 2026-10-31 el dueño quedó afuera (`identity_unbound`) porque su acceso del canary
había vencido. Esta task construye los comandos `members.grantInternal`, `members.renewInternal` y
`members.revokeInternal`, el reader `members.list`, las solicitudes de acceso que nacen de `identity_unbound`, el
bootstrap del primer administrador y las guardas para que el último administrador nunca se quede afuera.

## Why This Task Exists

`eligibleContexts` (`src/server/auth/store.ts`) exige binding, principal interno, membership y grant vigentes, pero
nada en el producto los crea ni avisa antes de que venzan. El arreglo del 2026-10-31 fue SQL manual autorizado:
funcionó, pero no deja auditoría de dominio, no es repetible por API ni por agentes y no evita el próximo vencimiento.

## Goal

- Dar, renovar y quitar acceso interno es un comando con contrato, idempotencia y auditoría, por API/SDK/CLI/MCP.
- Una organización nunca queda sin administrador vigente por una escritura.
- El vencimiento se avisa con 30 días de anticipación.
- El estado restaurado a mano el 2026-10-31 queda adoptado sin reescribirlo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md` (esta decisión)
- `docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md` (claims omitidos; autoridad local)
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Efeonce ID sólo prueba identidad; ningún rol de Rooms se deriva de Greenhouse, de Efeonce ID ni del email.
- `members.manage` es de organización y sólo del rol `administrator`; `access.manage` sigue siendo de sala.
- Todo acceso vence (máximo 12 meses por operación) y se renueva con un comando.
- Nunca queda una organización sin titular vigente de `members.manage` por una escritura.

## Normative Docs

- `.claude/skills/efeonce-rooms/SKILL.md` y `references/program-ledger.md`
- `docs/audits/rooms/2026-10-31-production-activation.md` (incidente y restauración manual)
- `docs/documentation/rooms/backend-api-for-claude-design.md`

## Dependencies & Impact

### Depends on

- ADR `EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1` aprobado.
- Tablas existentes `rooms.principals`, `rooms.memberships`, `rooms.identity_bindings`, `rooms.grants`,
  `rooms.command_receipts`, `rooms.sessions`.

### Blocks / Impacts

- TASK-2083: la referencia de `identity_unbound` pasa a ser el código de la solicitud de acceso.
- Manual de operación de Rooms: dar acceso deja de ser un script.
- Primer cliente real (EPIC-052): requiere administradores reales con acceso durable.

### Files owned

- `../efeonce-rooms/src/server/access/**` (nuevo)
- `../efeonce-rooms/src/domain/access-contracts.ts` (nuevo)
- `../efeonce-rooms/migrations/<timestamp>_rooms-internal-access.sql` (nuevo)
- `../efeonce-rooms/scripts/access.ts` y `scripts/production-access.sh` (nuevos)
- `../efeonce-rooms/src/domain/permissions.ts` (capacidad `members.manage`)
- `../efeonce-rooms/src/server/auth/service.ts` (registro de la solicitud en `identity_unbound`)

## Current Repo State

### Already exists

- `access.grant` / `access.revoke`: delegan capacidades por sala a un principal ya miembro (`src/server/commands/execute.ts`).
- Executor canónico con idempotencia por `command_receipts` y lock de organización.
- `scripts/bootstrap-production-pilot.ts`: actores sintéticos con vigencia de 2 horas.
- `rooms.audit` append-only con trigger `reject_mutation` (exige `room_id`).

### Gap

- Ningún comando crea principal interno + membership + binding.
- Sin capacidad de organización para administrar miembros.
- Sin aviso de vencimiento, sin guarda de último administrador, sin auditoría de acceso a nivel organización.
- `identity_unbound` no deja rastro útil para dar acceso después.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `efeonce-rooms` (`src/server/access/**`, rutas API v1)
- Future candidate home: `remain-shared`
- Boundary: administración de miembros internos de una organización de Rooms; consumidores: API, SDK, CLI, MCP stdio
- Server/browser split: contratos en `src/domain/access-contracts.ts`; escritura y lectura en servidor
- Build impact: ninguno fuera del repo `efeonce-rooms`
- Extraction blocker: ninguno; comparte el executor y el pool de Rooms

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (autoridad de acceso y bloqueo del dueño)
- Impacto principal: `command`
- Source of truth afectado: `rooms.principals`, `rooms.memberships`, `rooms.identity_bindings`, `rooms.grants`
- Consumidores afectados: login (`eligibleContexts`), sesión, API v1, SDK, CLI, MCP stdio
- Runtime target: local en esta task; producción con autorización aparte

### Contract surface

- Contrato existente a respetar: executor canónico, `access.grant`/`access.revoke`, `eligibleContexts`, errores `RoomsError`.
- Contrato nuevo: `members.grantInternal`, `members.renewInternal`, `members.revokeInternal`, reader `members.list`,
  `pnpm access:bootstrap-owner`, `pnpm access:health`.
- Backward compatibility: `compatible` (aditivo; el login no cambia).
- Full API parity: API v1, SDK, CLI `scripts/rooms.ts` y MCP stdio (toolset `write`) comparten el módulo `src/server/access/**`.

### Data model and invariants

- Entidades/tablas/views afectadas: CHECK de `rooms.grants.capabilities` ampliado con `members.manage`; tablas nuevas
  `rooms.access_requests` (vence a 7 días) y `rooms.access_events` (append-only); trigger diferido anti-bloqueo.
- Invariantes que no se pueden romper:
  - Ninguna escritura deja la organización sin titular vigente de `members.manage` si antes tenía uno.
  - Vigencia ≤ 12 meses por operación y nunca mayor que la del actor.
  - Un rol de Rooms nunca se deriva del email ni de otro producto.
  - El `sub` completo nunca sale en UI, logs ni respuestas.
- Write-target allowlist: sólo `src/server/access/**` escribe bindings, principals internos, memberships y grants de organización.
- Tenant/space boundary: todo por `organization_id`, con lock de organización.
- Idempotency/concurrency: recibo por `(organización, actor, operación, idempotencyKey)`; lock `pg_advisory_xact_lock`.
- Audit/outbox/history: `rooms.access_events` append-only con `reject_mutation`.

### Migration, backfill and rollout

- Migration posture: aditiva (CHECK ampliado, dos tablas, trigger). Ensayo con `pnpm db:rehearse-production` antes de aplicar.
- Default state: comandos activos donde exista sesión; bootstrap sólo por CLI con credencial de base.
- Backfill plan: el bootstrap adopta las filas restauradas el 2026-10-31 con un evento `adopted`, sin reescribirlas.
- Rollback path: restaurar desde respaldo (nunca `down` en producción); el código revertido deja el login intacto.
- External coordination: autorización del operador para migrar producción y para quién queda como administrador.

### Security and access

- Auth/access gate: `can(actor, 'members.manage', organización)`; techo de rol y de capacidades del actor.
- Sensitive data posture: `sub` con sufijo; código de solicitud que no revela el `sub`; sin email ni nombre en solicitudes.
- Error contract: `last_administrator`, `access_request_expired`, `subject_unbound` como `RoomsError` canónicos.
- Abuse/rate-limit posture: una solicitud vigente por sujeto; tope global por hora.

### Runtime evidence

- Local checks: pruebas de comando (idempotencia, techo, último administrador, vencimiento), migración en PG local.
- DB/runtime checks: ensayo en clon de producción con `pnpm db:rehearse-production`.
- Integration checks: login local `identity_unbound` → solicitud → `members.grantInternal` → login entra.
- Reliability signals/logs: `rooms.access.owner_expiring` y `rooms.access.no_owner` vía `pnpm access:health`.
- Production verification sequence: tras autorización, bootstrap en dry-run (debe decir «ya hay titular»), `members.list`, renovar el acceso del dueño.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migración y capacidad

- CHECK de capacidades con `members.manage`, `rooms.access_requests`, `rooms.access_events` (append-only) y trigger
  diferido anti-bloqueo; `members.manage` en `roleCapabilities.administrator` y en la política de `can`.

### Slice 2 — Comandos y reader

- `members.grantInternal`, `members.renewInternal`, `members.revokeInternal` y `members.list` en `src/server/access/**`
  con el executor canónico; rutas API v1, SDK, CLI y MCP stdio.

### Slice 3 — Solicitudes de acceso

- `identity_unbound` registra la solicitud y devuelve su código; la página de TASK-2083 lo muestra como referencia.

### Slice 4 — Bootstrap, salud y adopción

- `pnpm access:bootstrap-owner` (dry-run por defecto) y `pnpm access:health` con las dos señales; adopción del estado
  del 2026-10-31; manual de operación actualizado.

## Out of Scope

- UI de administración de miembros (task ui-ux posterior, cliente del mismo contrato).
- Correo de aviso de vencimiento.
- Cambios en Efeonce ID o en sus claims.
- Aplicar en producción sin autorización.

## Detailed Spec

Contrato completo en el ADR (D1–D7). Este archivo no lo repite.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- ADR aprobado antes de cualquier código. Slice 1 antes de 2; 3 y 4 después de 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El dueño queda afuera de nuevo | identity | medium hoy, low tras la task | Guarda de último administrador, trigger diferido, aviso a 30 días, bootstrap documentado | `rooms.access.owner_expiring` / `no_owner` |
| Escalada: un operador se da `members.manage` | identity | low | Capacidad sólo en el techo de `administrator`; techo del actor | Evento `grantInternal` con actor no administrador |
| La migración rompe el login en producción | production | low | Aditiva; ensayo en clon; el login no lee tablas nuevas | Callback `unavailable` en logs |
| Fuga del `sub` | identity | low | Sufijo en lecturas; código opaco en solicitudes | Test de respuesta sin `sub` completo |

### Feature flags / cutover

- Sin flag nuevo: los comandos requieren `members.manage`, que sólo tendrán administradores tras el bootstrap.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Restaurar respaldo de `rooms_production` (nunca `down`) | 30 minutos | sí, con respaldo |
| Slice 2 | Revertir commit; filas creadas quedan válidas | minutos | sí |
| Slice 3 | Revertir commit; solicitudes vencen solas en 7 días | minutos | sí |
| Slice 4 | Revertir commit | minutos | sí |

### Production verification sequence

1. Ensayo `pnpm db:rehearse-production` PASS.
2. Respaldo lógico privado y aplicar la migración con autorización.
3. `pnpm access:bootstrap-owner` en dry-run: debe informar titular existente y adoptarlo.
4. `members.list` muestra al dueño con vigencia; renovar con `members.renewInternal`.
5. Login real del dueño entra.

### Out-of-band coordination required

- Autorización del operador para migrar producción y para la lista de administradores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] ADR aprobado por el operador antes del primer commit de código («Aprobar ADR», 2026-10-31).
- [x] `members.grantInternal` crea principal, membership, binding y grant en una transacción y es idempotente (test `access-members`).
- [x] Un actor sin `members.manage` recibe error canónico y no escribe nada (test: operador recibe `not_found`).
- [x] Revocar o acortar al último administrador falla con `last_administrator` (test de comando y de trigger con SQL directo, más la salida de emergencia).
- [x] `identity_unbound` registra una solicitud y `members.grantInternal` la consume por código (test; el callback lleva `code` a la página, test `auth-http`).
- [x] Ninguna respuesta, log ni evento contiene el `sub` completo (test sobre `members.list` y `access_events.subject_suffix`).
- [x] `pnpm access:bootstrap-owner` no escribe si ya hay titular y la corrida en seco no deja filas (test). La adopción usa la misma ruta (`writeMemberGrant` con binding existente); no hay test dedicado de adopción.
- [x] `pnpm access:health` reporta `owner_expiring` a ≤30 días y `no_owner` sin titular (tests con vigencia de 20 días y con revocación de emergencia).
- [x] API (`/api/v1/members`, `/api/v1/commands`), SDK (`members()` + comandos), CLI (`pnpm rooms members` / `execute`) y MCP stdio (`members.list` en `read`; comandos sólo en el toolset `members`) exponen los cuatro contratos; `assertMcpOperationCoverage` pasa.
- [x] `LC_ALL=en_US.UTF-8 pnpm verify` pasa (385/385 con PG local y perfil multimedia; build OK).

## Verification

- `efeonce-rooms`: `LC_ALL=en_US.UTF-8 pnpm verify`, `pnpm db:rehearse-production` y recorrido local de login.
- `pnpm task:lint --task TASK-2082`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `references/program-ledger.md` de la skill `efeonce-rooms` actualizado y espejo `.codex` sincronizado.

## Follow-ups

- UI de administración de miembros.
- Correo de aviso de vencimiento.
