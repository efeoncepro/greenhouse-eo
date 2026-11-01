# TASK-2074 — Rooms: colaboración durable, preguntas y próximos pasos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-052`
- Status real: `2026-10-29: Backend local completo: preguntas/respuestas/pasos/actividad y anclas V4 con tiempos medidos;14pruebas focales(13PG+1schema), invitado OTP de fixture con derechos explícitos y gate conjunto337PASS/0skip. Fresh13/43, down/up y restore PG16/18 PASS. HTTP/CLI/SDK/MCPstdio integrados; UI, producción y federación remota separados.`
- Rank: `wip`
- Domain: `platform|data`
- Blocked by: `none`
- Branch: `Rooms codex/rooms-design-integration; Greenhouse develop; checkout compartido sin worktrees`

## Summary

Construir preguntas, respuestas, resolución, próximos pasos y actividad explícita de colaboración,
siempre anclados a una edición publicada. API/CLI/SDK reutilizan primitives con autoridad persistida,
capabilities explícitas, concurrencia y auditoría; Claude Design conserva la interfaz.

## Why This Task Exists

R11 carece de tablas, comandos y lectores. Los pasos del manifest son contenido fijo, no seguimiento.
La auditoría técnica no prueba visitas ni intención comercial. Ninguna task existente posee R11.

## Goal

- Persistir colaboración editable fuera del snapshot sin alterar la edición publicada.
- Exigir grants específicos y autoridad actual antes de lectura, escritura y replay.
- Probar aislamiento, idempotencia, carreras y migración local sin producción.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_COLLABORATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas: dominio browser-safe, stores server-only, can por recurso; ningún permiso derivado del rol
nominal ni autogrant. Preguntas y pasos no cambian snapshots. Un evento expresa una acción observada.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- TASK-2060 y TASK-2062: commands, autoridad y contenido versionado en el runtime hermano.

### Blocks / Impacts

- EPIC-052 R12/R13/R14; consumidor Claude Design posterior e integración MCP posterior.

### Files owned

- `../efeonce-rooms/src/domain/collaboration-contracts.ts`
- `../efeonce-rooms/src/server/collaboration/`
- `../efeonce-rooms/migrations/1793250000000_rooms-collaboration.sql`
- `../efeonce-rooms/tests/collaboration-persistence.test.ts`
- `docs/architecture/rooms/EFEONCE_ROOMS_COLLABORATION_DECISION_V1.md`

## Current Repo State

> Snapshot del discovery inicial; el resultado vigente y los límites están en Status real y el cierre29Oct.

### Already exists

- `../efeonce-rooms/src/server/persistence/pool.ts`: transacción y lock por organización.
- `../efeonce-rooms/src/server/persistence/authority.ts`: autoridad persistida y reloj DB.
- `../efeonce-rooms/src/server/commands/execute.ts`: CAS, receipts, audit/outbox.

### Gap

- Sin entidad mutable de preguntas/respuestas/pasos ni reader de actividad con significado explícito.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-rooms/src/domain` y `efeonce-rooms/src/server/collaboration`
- Future candidate home: `remain-shared`
- Boundary: `executeCollaborationCommand/readQuestions/readSteps/readActivity`; HTTP/CLI/SDK adapters.
- Server/browser split: schemas/DTOs browser-safe; SQL, autoridad y transacciones server-only.
- Build impact: none; reutiliza pg/zod actuales, sin nuevo deployable.
- Extraction blocker: atomicidad con revisión, autoridad y outbox de Rooms.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `rooms.questions`, `rooms.question_answers`, `rooms.next_steps`.
- Consumidores afectados: HTTP/CLI/SDK; MCP conserva integración R13 explícita.
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `src/domain/persistence-contracts.ts`, `src/domain/permissions.ts`.
- Contrato nuevo o modificado: cinco commands questions.create/answer/resolve y steps.create/update; readers questions.list/steps.list/analytics.getRoomActivity.
- Backward compatibility: additive; ninguna capacidad anterior amplía permisos por inferencia.
- Full API parity: primitive único consumido por API/CLI/SDK, catálogo enumerable; MCP pendiente R13.

### Data model and invariants

- Entidades/tablas/views afectadas: questions, question_answers, next_steps; grants CHECK ampliado.
- Invariantes que no se pueden romper:
  - Toda fila fija organization/room/edition y FK compuesta de edición existente.
  - Las respuestas son append-only; cerrar pregunta exige autor o interno con capability.
- Write-target allowlist: no boundary test existe; destinos SQL explícitos de este dominio.
- Tenant/space boundary: sesión resuelta y loadAuthority; organización cliente sólo selecciona dentro de autoridad.
- Idempotency/concurrency: tenant advisory lock, CAS room revision y receipt por actor/operation/key/hash.
- Audit/outbox/history: append-only en misma transacción, sólo metadata, nunca cuerpos ni notas.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: sin grants nuevos; no producción y sin autogrant.
- Backfill plan: ninguno; datos históricos intactos.
- Rollback path: down sólo vacío; si hay colaboración conservar DB y revertir consumidor/código.
- External coordination: sin proveedor externo; release y grants reales decisión posterior.

### Security and access

- Auth/access gate: rooms.read sobre edición publicada más capability fina específica; externos scope edición.
- Sensitive data posture: texto privado, sin email ni tokens en audit; DTO allowlist y límites explícitos.
- Error contract: RoomsError unauthenticated/not_found/forbidden/invalid_input/conflict/unavailable.
- Abuse/rate-limit posture: 200 preguntas/edición, 20 respuestas/pregunta, 100 pasos/edición; texto4k, página100; CAS y replay.

### Runtime evidence

- Local checks: lint/typecheck y tests focales del runtime; gate global a cargo del integrador.
- DB/runtime checks: migración fresh, rollback vacío/no vacío, aislamiento, revocación, carreras y readback PG local.
- Integration checks: adapters sobre mismo primitive; sin provider real.
- Reliability signals/logs: audit/outbox por operación y correlationId sin cuerpos; no tracking de visitas.
- Production verification sequence: no production runtime impact en este corte; futura promoción requiere autorización.

### Acceptance criteria additions

- [x] Source of truth, invariantes, consumers, permisos e idempotencia documentados.
- [x] Migración y rollback local probados; capacidades nuevas sin autogrant. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Evidencia local distingue implementación y producción.


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

### Slice 1 — Contratos y persistencia

- Schemas estrictos, límites, nueva migración9 y FKs compuestas.
- Capabilities explícitas collaboration.read/questions.create/questions.answer/questions.resolve/steps.manage/activity.read.

### Slice 2 — Primitives y adapters

- Commands/readers con autoridad actual, proyección allowlist, anchors validados y revision CAS.
- Integración del catálogo HTTP/CLI/SDK por el integrador root, sin UI.

### Slice 3 — Evidencia

- Pruebas PG de denegaciones, replay, carrera, revocación y snapshots intactos.

## Out of Scope

- UI, Auth, correo, tracking browser, MCP desplegado, CRM, multimedia o activación de producción.

## Detailed Spec

El ADR dedicado define el contrato de cinco commands/readers. Bodies no viajan en receipts/audit/outbox.
Sólo referencias explícitas a edición publicada. Una respuesta no equivale a compromiso comercial.

## Rollout Plan & Risk Matrix

Corte additive local, no production runtime impact. No merge/push/deploy ni flags remotos.

### Slice ordering hard rule

Contratos/DDL → primitives → adapters → PG/transport gates; UI posterior separada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Acceso a otra edición | data/access | medium | FK compuesta y can doble actualizado | pruebas negativas |
| Pérdida por concurrencia | data | medium | lock y expectedRevision | conflict409 |
| Texto en actividad | privacy | low | DTO allowlist sin bodies | test sentinel |

### Feature flags / cutover

Sin flag nuevo en corte local: additive, ningún grant automático y producción retenida. Se requiere
migración antes de desplegar consumidor; los flags de acceso existentes siguen OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | down local vacío; con filas rechaza y conserva datos | medido en prueba | parcial |
| 2 | revert código consumidor, mantener tablas con datos | revisión local | sí |
| 3 | conservar recibo y quitar arnés si no aplica | local | sí |

### Production verification sequence

No producción en este corte. Una futura release verifica migración y grants mínimos antes de canary
separado autorizado; nunca repite el correo único de identidad ya cerrado.

### Out-of-band coordination required

Repo-only change; ninguna llamada externa o comunicación a clientes.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Una invitación guest real de fixture puede usar únicamente capacidades nuevas solicitadas explícitamente en su edición inicial; invitaciones legadas y otras ediciones no se amplían, pérdida de autoridad/revocación niega writes y replay. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).


- [x] Preguntas/respuestas/resolución y pasos persisten con editionId y anchors válidos.
- [x] Read y write exigen rooms.read más capability fina, sin autogrants ni roles forjados.
- [x] Idempotencia y CAS dejan un ganador y audit/outbox sin duplicados.
- [x] Actividad registra acciones explícitas sin cuerpos ni inferencia comercial.
- [x] Migración fresh/down/up local y rollback no vacío preservan datos. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] HTTP/CLI/SDK operan mismo contrato; UI/federación remota pendientes; MCPstdio local2078 integrado. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Pruebas negativas PG y gates lint/types pasan con evidencia proporcional.

## Verification

- Runtime: `pnpm lint`, `pnpm typecheck`, tests collaboration focales con PostgreSQL local.
- Gobernanza: `pnpm task:lint --task TASK-2074`, cierre documental por root.


## Closing Protocol

- [x] Lifecycle y carpeta sincronizados con estado real.
- [x] README y registry sincronizados.
- [x] Handoff/changelog/skills actualizados por el integrador root.
- [x] Impacto cruzado EPIC-052 y TASK-2071 revisado.
- [x] Evidencia SQL local registrada sin secretos.

## Follow-ups

- Claude Design integra UI; MCPstdio2078 ya consume los primitives; federación remota y producción/grants requieren decisión posterior.


## Delta 2026-10-29 — implementación local R11

- Cinco commands y tres readers de colaboración, DTOs estrictos y migración9 aditiva implementados.
-11/11pruebas focalesPASS0skip(10PG+1schema) (incluye cuotas200/20/100, anchorsV1/V2, evidencefilter,
  CASrace, revocación/replay, snapshots intactos, transactionrollback, ACL y respuestas/eventos inmutables).
- Evidencia privada: `efeonce-rooms/.captures/rooms-backend-qa-20261029/collaboration-focal.log`.
  ESLint focal y typecheckglobalPASS. No nuevo correo, Auth, UI ni producción.
- Integrador conectó HTTP/CLI/SDK/MCPstdio y verificó fresh/down/up/restore13; no se integró a main.

## Cierre backend local — 2026-10-29

[Corte consolidado](../../audits/rooms/2026-10-29-backend-local-completion.md):337/337tests,0fallos/0skip;
lint/negativo/types/build,13migraciones/43tablas, restore mixtoPG16/18 y cinco guards poblados PASS.
[Contrato Claude Design](../../documentation/rooms/backend-api-for-claude-design.md), manual y skill espejo
registran lo construido y los gates externos. El cierre sólo cubre el alcance local declarado; no UI,
release, conectores reales ni activación productiva. Los deltas anteriores conservan evidencia por fecha.
