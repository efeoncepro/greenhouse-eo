# TASK-2075 — Rooms: presentación durable, tours y notas propias

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Backend impact: `migration, command, reader, api`
- Epic: `EPIC-052`
- Status real: `2026-10-29: Backend local completo: tours/notas propias/sesiones fijas, control/ACK/reconexión por lectura y actor guest sin identidad interna. HTTP/CLI/SDK/MCPstdio,337tests0skip y Chrome del contrato PASS; fresh/down/up/restore13PG16/18 PASS. UI/playback/rollout separados.`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `efeonce-rooms codex/rooms-design-integration; gobernanza Greenhouse develop; sin worktrees`

## Summary

Construir R09 backend: tours de edición publicada, notas propias y sesiones fijas con control exclusivo/secuencia/ack. Claude Design conserva interfaz. Reutiliza autoridad, can, transacción, revisión, receipts y auditoría Rooms.

## Why This Task Exists

El scaffold no contiene estado durable de presentación; una capability declarada o coordinación local de ventanas no acredita separación de notas, control exclusivo ni reconexión segura.

## Goal

- Contrato durable sin notas en audiencia ni telemetría.
- Edición/tour fijados y protocolo de control con secuencia monotónica.
- Verificación PostgreSQL local de ownership, revocación y concurrencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_DURABLE_PRESENTATION_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`, `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `.codex/skills/efeonce-rooms/references/program-ledger.md`.

## Dependencies & Impact

### Depends on

TASK-2060/2062/2065 y runtime `../efeonce-rooms/src/server/persistence/{pool,authority,store}.ts`.

### Blocks / Impacts

EPIC-052 R10 y certificación R13/R15. No dependencia del diseño visual para construir primitive.

### Files owned

- `../efeonce-rooms/src/domain/presentation-contracts.ts`.
- `../efeonce-rooms/src/server/presentation/lifecycle.ts`.
- `../efeonce-rooms/migrations/1793251000000_rooms-presentation.sql`.
- `../efeonce-rooms/tests/presentation*.test.ts`.
- Este documento y ADR; integración HTTP/CLI/client por root.

## Current Repo State

> Snapshot del discovery inicial; el resultado vigente y los límites están en Status real y el cierre29Oct.

### Already exists

Autoridad persistida, edición inmutable, receipts/audit/outbox, adaptadores API/CLI y presenter SSR de identidad/contenido.

### Gap

No tours, notas propias ni sesiones con control/ack durables. El presenter SSR existente no es este agregado.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `efeonce-rooms/src/domain` y `src/server/presentation`.
- Future candidate home: `remain-shared`
- Boundary: commands/readers de tours, ownnotes y presentation.
- Server/browser split: schemas/DTO browser-safe; SQL/autoridad exclusivamente server.
- Build impact: sin dependencia nueva ni deployable adicional.
- Extraction blocker: transacción/lock/autoridad del dominio Rooms.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration, command, reader`
- Source of truth afectado: `rooms.presentation_tours/notes/sessions/acks`.
- Consumidores afectados: API/CLI/client y UI posterior.
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: autoridad/edición/inmutabilidad Rooms y Full API Parity.
- Contrato nuevo o modificado: `presentation-contracts.ts`; `createPresentationService({transaction})`.
- Backward compatibility: `compatible`; tablas aditivas, sin cambiar snapshots.
- Full API parity: primitive server compartido, HTTP/CLI/client integrados por root.

### Data model and invariants

- Entidades/tablas/views afectadas: cuatro tablas propias Presentation.
- Invariantes: owner estricto incluso admin; tour fija edición; sesión copia tour; audience no notas/instance; revocación revalidada.
- Write-target allowlist: N/A; runtime Rooms sin boundary-test de tablas; allowlist SQL explícito en ADR.
- Tenant/space boundary: FKs compuestas organización/sala/edición y autoridad servidor.
- Idempotency/concurrency: receipts propios operación/actor/key; expectedRevision para negocio, sequence para protocolo; lock canónico por organización.
- Audit/outbox/history: business commands audit/outbox; control/ack sólo audit/receipt; sin body de notas.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: rama local sin push; acceso humano productivo conserva OFF.
- Backfill plan: ninguno, ninguna concesión automática.
- Rollback path: revert consumer; down sólo si tablas nuevas vacías; no borrar historial.
- External coordination: autorización posterior antes de producción; Auth retenido.

### Security and access

- Auth/access gate: sesión+autoridad persistida+can; nuevas caps y grants explícitos.
- Sensitive data posture: notas privadas; nunca en eventos ni audiencia.
- Error contract: RoomsError canónico sin SQL/stack/paths.
- Abuse/rate-limit posture: schemas estrictos, texto/listas/paginación y TTL acotados, revision/CAS/idempotency.

### Runtime evidence

- Local checks: tests presentation, lint/types y suite integradora.
- DB/runtime checks: PG efímero con migración10 y controles negativos.
- Integration checks: HTTP/CLI/client por root, sin UI.
- Reliability signals/logs: audit operation/correlationId; sin notas.
- Production verification sequence: fuera de este corte local; sin deploy ni flags.

### Acceptance criteria additions

- [x] Source of truth, consumers y contrato con paths reales. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Tenant/ownership/CAS y replay revalidados. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Migración aditiva/down guard probado. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Evidencia local sin atribuir cloud/UI. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).

## Capability Definition of Done — Full API Parity gate

- [x] Primitive canónico con read/write, autoridad fina, receipts, errores y audit. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Capability registry y techos de rol sin grants automáticos. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] HTTP/CLI/client consumen el mismo primitive. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Writes modelados como intents explícitos, no click-handlers. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contratos y migración

Tours, ownnotes, sesiones/ack y FK/constraints/privilegios. ADR fija TTL/secuencia y no cambia Auth.

### Slice 2 — Primitive e integración

Commands/readers canónicos con transacción inyectable; DTOs audiencia/consola separados; root integra transports.

### Slice 3 — Verificación

PG efímero para concurrencia, replay, ownership, revocación, snapshots y down protegido.

## Out of Scope

UI/ventanas/motion/fullscreen/reproducción; control remoto; producción; Auth; correo; nuevos deployables.

## Detailed Spec

El ADR dueño define business revision frente a protocol sequence y la separación de proyecciones. Notes sólo actor propio; session owner/controlinstance fijados; ack declara recepción de escena, no playback medido. Expiry no supera actor, grants, TTL2h.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contratos/migración -> primitive -> transports -> tests/recibos. No producción por esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Nota expuesta | API | medium | DTO separado y ownership negativo | test audiencia/otroowner |
| Orden obsoleta | protocolo | medium | sequence exacta y controlinstance | conflict canónico |
| Sesión tras revoke | acceso | medium | reload actor+owner cada llamada | not_found |
| Down borra datos | SQL | low | guard tablas no vacías | migración aborta |

### Feature flags / cutover

Sin flag adicional local: código no publicado, grants explícitos. Flags humanos actuales conservan OFF. Ningún nuevo runtime cloud.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Contratos/migración | Down si vacío; conservar con datos | local medido | parcial |
| Primitive/transports | Revert exacto sin borrar filas | local | sí |
| Verificación | Retirar PG efímero y temporales | al terminar | sí |

### Production verification sequence

No autorizado. Requerirá migración, deploy, aceptación y readback posteriores; no reutilizar canary de correo.

### Out-of-band coordination required

N/A repo-only local; Claude Design recibe contrato estable después del QA.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Tour sólo referencia anclas publicadas y edición correcta.
- [x] Notas propias create/update/delete/list sin visibilidad ajena incluso admin.
- [x] Sesión fija edición/tour, TTL y owner/instance; secuencia y ack rechazan stale.
- [x] Audience nunca recibe notas/instance; console sólo owner.
- [x] Replay/read/write revalidan grants, archivo y owner vivo.
- [x] Tests PG reales con races/replay/rollback; lint/types PASS.
- [x] API/CLI/client integrados y verificados sin UI. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).

## Verification

- `pnpm exec eslint src/domain/presentation-contracts.ts src/server/presentation/lifecycle.ts tests/presentation*.test.ts --max-warnings=0`
- `pnpm exec tsc --noEmit`
- `node --conditions=react-server --import tsx --test tests/presentation*.test.ts` con PG efímero.
- `pnpm task:lint --task TASK-2075`.


## Closing Protocol

- [x] Lifecycle y carpeta sincronizados con evidencia real.
- [x] README/registro de tasks sincronizados por root.
- [x] Handoff/changelog/ledger espejo actualizados por root.
- [x] Impacto cruzado R09/R10/R13/R15 registrado.

## Follow-ups

Claude Design implementa consumer visual; release/rollout requiere autorización posterior.

## Delta 2026-10-29 — primitive local verificado

9testsPASS0skip (8PG +1schemas); lint/types y tasklint0errors/0warnings. PG18 efímero de root, sin producción/correo. Grants champion emitidos por access.grant canónico; renovación no extiende la sesión preparada y replay expired denegado. Control/ack no alteran revisión de autoría ni outbox; snapshot/ownership/revoke/archivo probados. Root integra transports y hará gate global/freshDDL. Evidencia privada runtime `.captures/rooms-presentation-20261029/summary.json`.

## Cierre backend local — 2026-10-29

[Corte consolidado](../../audits/rooms/2026-10-29-backend-local-completion.md):337/337tests,0fallos/0skip;
lint/negativo/types/build,13migraciones/43tablas, restore mixtoPG16/18 y cinco guards poblados PASS.
[Contrato Claude Design](../../documentation/rooms/backend-api-for-claude-design.md), manual y skill espejo
registran lo construido y los gates externos. El cierre sólo cubre el alcance local declarado; no UI,
release, conectores reales ni activación productiva. Los deltas anteriores conservan evidencia por fecha.
