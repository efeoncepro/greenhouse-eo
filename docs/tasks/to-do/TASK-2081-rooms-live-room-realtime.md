# TASK-2081 — Rooms: sala en vivo (ADR y backend en tiempo real)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-052`
- Status real: `ADR propuesto 2026-10-30 (SSE same-origin + PostgreSQL efímero); espera aprobación del operador antes de código.`
- Rank: `último de la implementación de la UI aprobada`
- Domain: `platform`
- Blocked by: `TASK-2080 slices 1 y 6 (capítulos y contrato)`
- Branch: `efeonce-rooms: claude/rooms-approved-ui o rama derivada, sin push a main; Greenhouse: docs en develop`

## Summary

La pantalla «Sala en vivo» del canvas muestra a varias personas dentro de la misma sala al mismo tiempo: sus
cursores, la pieza que cada una tiene seleccionada (con 8 tiradores) y una burbuja de pregunta que aparece en vivo.
Rooms hoy no tiene ningún canal en tiempo real. Esta task decide el transporte en un ADR y construye presencia,
cursores, selección y preguntas en vivo sobre los contratos de colaboración existentes.

## Why This Task Exists

El backend de colaboración es durable pero asíncrono: las preguntas se crean y se leen por API, y la presentación
sincroniza por secuencia y ack, con la coordinación entre ventanas del lado del cliente. No hay canal servidor →
cliente ni noción de presencia. Rooms corre en Vercel (funciones sin WebSocket propio), así que el transporte es una
decisión de arquitectura con coste, límites de duración y privacidad, no un detalle de implementación.

## Goal

- ADR aceptado con el transporte (SSE en funciones con reconexión, servicio gestionado o polling corto) y sus límites.
- Presencia, cursores y selección efímeros por sala y edición, autorizados con `can` en cada conexión.
- Preguntas en vivo que se persisten con el command `questions.create` existente y se difunden a la sala.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- ADR de colaboración y presentación enlazado en `docs/architecture/rooms/README.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_STACK_BASELINE_V1.md`

Reglas obligatorias:

- Presencia, cursores y selección son efímeros: no se guardan como evidencia de atención.
- Una pregunta en vivo es la misma pregunta durable de `questions.create`; el canal solo la difunde.
- Cada conexión se autoriza con `can` sobre sala y edición; revocar una invitación corta su conexión.
- Notas internas y controladores de presentación nunca viajan a guests por este canal.

## Normative Docs

- `docs/documentation/rooms/backend-api-for-claude-design.md`
- `.claude/skills/efeonce-rooms/SKILL.md` y `references/program-ledger.md`
- Canvas aprobado: `https://claude.ai/code/artifact/6562987e-d882-44ba-a929-a6ab7863771d` (`Multiplayer.dc.html`)
- ADR propuesto: `docs/architecture/rooms/EFEONCE_ROOMS_LIVE_ROOM_REALTIME_DECISION_V1.md` (SSE same-origin + estado efímero en PostgreSQL; espera aprobación)

## Dependencies & Impact

### Depends on

- TASK-2080: capítulos (para ubicar a cada persona) y nombres visibles (`author.displayName`).
- Colaboración durable existente (`src/server/collaboration/**`).

### Blocks / Impacts

- Futura task de UI de la sala en vivo.
- TASK-2069 (perfil cloud): el transporte elegido puede requerir configuración en Vercel o un proveedor.

### Files owned

- `docs/architecture/rooms/EFEONCE_ROOMS_LIVE_ROOM_REALTIME_DECISION_V1.md` (nuevo)
- `../efeonce-rooms/src/server/live/**` (nuevo)
- `../efeonce-rooms/src/app/api/v1/rooms/[roomId]/live/**` (nuevo)
- `../efeonce-rooms/src/domain/live-contracts.ts` (nuevo)
- `../efeonce-rooms/src/client/live.ts` (nuevo)

## Current Repo State

### Already exists

- `questions.create` y `readQuestions` con anclas por bloque, pieza y evidencia.
- Presentación con `sequence`/`ack` y coordinación entre ventanas del lado del cliente.
- Autorización `can` y sesiones guest con revocación.

### Gap

- Sin canal en tiempo real, sin presencia, sin cursores ni selección compartida.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `efeonce-rooms` (`src/server/live/**`, rutas API)
- Future candidate home: `remain-shared`
- Boundary: canal de sala autorizado; consumidores: UI de Rooms y SDK
- Server/browser split: contratos en `src/domain/live-contracts.ts`; conexión y autorización en servidor; cliente en `src/client/live.ts`
- Build impact: depende del transporte elegido en el ADR (posible SDK de proveedor)
- Extraction blocker: límites de duración de funciones en Vercel

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (canal abierto hacia guests con datos de otras personas)
- Impacto principal: `integration`
- Source of truth afectado: canal efímero de sala; preguntas siguen en su tabla actual
- Consumidores afectados: UI de Rooms, SDK
- Runtime target: `local` en esta task; cloud con autorización aparte

### Contract surface

- Contrato existente a respetar: `questions.create`, contratos de presentación, `can`
- Contrato nuevo o modificado: suscripción `GET /api/v1/rooms/:roomId/live?editionId=` (o el equivalente del proveedor), mensajes `presence.join|leave`, `cursor.move {x, y, chapterId}`, `selection.set {blockId, assetRefId?}`, `question.created {questionId}`; envío `POST .../live/events` para cursor y selección con límite de frecuencia.
- Backward compatibility: `compatible` (todo nuevo)
- Full API parity: el canal es un contrato del SDK; CLI y MCP solo leen presencia actual (`live.presence`), no transmiten cursores.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla nueva si el transporte no la exige; estado efímero en memoria del proveedor o con TTL corto.
- Invariantes que no se pueden romper:
  - Nadie recibe eventos de una sala o edición que no puede leer.
  - Revocar acceso cierra la conexión en ≤ 30 s.
  - Cursores y selección no se persisten.
- Write-target allowlist: N/A.
- Tenant/space boundary: canal por sala + edición, derivado de la sesión o concesión guest.
- Idempotency/concurrency: eventos efímeros sin garantía de entrega; preguntas con la idempotencia de su command.
- Audit/outbox/history: ninguno para cursores; preguntas mantienen su historial.

### Migration, backfill and rollout

- Migration posture: `none` salvo que el ADR elija estado con TTL en PG.
- Default state: desactivado fuera de local hasta autorización de producción.
- Backfill plan: ninguno.
- Rollback path: revertir; la sala funciona sin canal (degrada a preguntas por API).
- External coordination: si el ADR elige proveedor gestionado, cuenta y secreto aprobados por el operador.

### Security and access

- Auth/access gate: sesión o concesión guest con `can` al conectar y re-verificación periódica.
- Sensitive data posture: nombres visibles y posiciones de cursor; nunca correos ni notas.
- Error contract: errores canónicos al conectar; cierre con código explícito al revocar.
- Abuse/rate-limit posture: frecuencia máxima de cursor por conexión y conexiones por persona.

### Runtime evidence

- Local checks: tests de autorización del canal, revocación y límite de frecuencia.
- DB/runtime checks: si hay TTL en PG, migración verificada en PG local.
- Integration checks: dos navegadores locales en la misma sala (interno + guest).
- Reliability signals/logs: conexiones activas y cierres por revocación en logs.
- Production verification sequence: N/A en esta task.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en las pruebas de persistencia de Rooms, en el mismo cambio.
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

### Slice 1 — ADR del transporte

- Comparar SSE en funciones de Vercel, servicio gestionado y polling corto (coste, duración máxima, reconexión, revocación, privacidad); decisión aceptada por el operador.

### Slice 2 — Canal autorizado y presencia

- Conexión autorizada por sala y edición, `presence.join|leave`, cierre por revocación.

### Slice 3 — Cursores y selección

- Eventos `cursor.move` y `selection.set` con límite de frecuencia; sin persistencia.

### Slice 4 — Preguntas en vivo y SDK

- Difusión de `question.created` tras `questions.create`; cliente `src/client/live.ts`; lectura `live.presence` en CLI/MCP; contrato documentado.

## Out of Scope

- La UI de la sala en vivo.
- Edición colaborativa del contenido.
- Producción, flags y proveedores sin autorización.

## Detailed Spec

Referencia visual: `Multiplayer.dc.html` del canvas (cursores animados con nombre, selección con 8 tiradores sobre la
pieza, burbuja de pregunta). El ADR fija transporte y límites antes de escribir código.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (ADR aceptado) antes de cualquier código. Slice 2 antes de 3 y 4.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un guest revocado sigue recibiendo eventos | identity | medium | Re-verificación periódica y cierre al revocar; test dedicado | Conexión viva tras revocación en logs |
| Coste o límites de duración del transporte | release / infra | medium | ADR con números; degradar a polling | Reconexiones excesivas |
| Fuga de notas o controles a guests | identity | low | Mensajes tipados por rol; tests de proyección | Evento con campo no permitido |

### Feature flags / cutover

- Desactivado fuera de local; activar en producción requiere autorización y flag `ROOMS_*` nuevo registrado en el ledger de Rooms.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Marcar ADR como reemplazado | minutos | sí |
| Slice 2 | Revertir commit | minutos | sí |
| Slice 3 | Revertir commit | minutos | sí |
| Slice 4 | Revertir commit | minutos | sí |

### Production verification sequence

- N/A en esta task.

### Out-of-band coordination required

- Si el ADR elige proveedor gestionado: cuenta, secreto y aprobación de gasto del operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR aceptado por el operador antes del primer commit de código.
- [ ] Una conexión sin permiso de lectura sobre la sala recibe error canónico y ningún evento.
- [ ] Revocar una invitación cierra su conexión en ≤ 30 s (test).
- [ ] Cursores y selección no generan filas persistentes.
- [ ] Una pregunta creada con `questions.create` llega a las demás conexiones de la sala.
- [ ] Ningún evento enviado a un guest contiene notas, `controllerInstance` ni correos.
- [ ] `pnpm verify` pasa.

## Verification

- `efeonce-rooms`: `pnpm verify` y prueba local con dos navegadores
- `pnpm task:lint --task TASK-2081`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `references/program-ledger.md` de la skill `efeonce-rooms` actualizado y espejo `.codex` sincronizado.

## Follow-ups

- Task de UI de la sala en vivo.
