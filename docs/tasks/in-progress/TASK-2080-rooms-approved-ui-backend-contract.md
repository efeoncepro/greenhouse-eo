# TASK-2080 — Rooms: contrato backend para la UI aprobada

## Delta 2026-10-30 — el operador pide todo el canvas

- Instrucción del operador: «Lo que haga falta para implementar lo que está en el canvas hay que desarrollarlo en el
  backend, quiero todo lo que está en el canvas». Resuelve las dos Open Questions a favor de lo que muestra el
  canvas: la tarjeta previa incluye quién invita (nombre y foto), el cliente (nombre y logo), la persona invitada
  (nombre y rol) y con quién comparte la sala; vencida, revocada e intentos se distinguen.
- El alcance se amplía a todo el backend del canvas salvo la sala en vivo: slices 7–10 cubren comparación de
  ediciones, vista previa por rol, reloj y avance automático de la presentación, señales de actividad y subtítulos
  de video. La sala en vivo (tiempo real) va en TASK-2081 porque requiere ADR propio.
- Implementación asignada por el operador a esta línea de trabajo (Claude), en la rama `claude/rooms-approved-ui`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `migration`
- Epic: `EPIC-052`
- Status real: `2026-10-30: slices 1 (capítulos) y 2 (recorrido propio) commiteados en efeonce-rooms claude/rooms-approved-ui (31c1a83, e37b152), migración14, suite 343/343 sin skips con PG18 local y ROOMS_RUNTIME_PROFILE=local. Sin push ni deploy. Faltan slices 3, 4, 5, 7, 8, 9, 10 y 6.`
- Rank: `2 de la implementación de la UI aprobada (en paralelo con TASK-2079)`
- Domain: `platform`
- Blocked by: `none`
- Branch: `efeonce-rooms: claude/rooms-approved-ui desde codex/rooms-design-integration@de38af5, sin push a main; Greenhouse: docs en develop`

## Summary

El canvas aprobado el 2026-10-29 necesita datos que el backend de Rooms no tiene: capítulos que agrupan
bloques, el recorrido real de cada persona, una tarjeta de invitación personalizada antes de entrar, estados de
invitación distinguibles, adaptaciones agrupadas por pieza y nombres visibles en las preguntas. Esta task los
agrega como readers y commands gobernados, para que la sala, la invitación y la pieza (TASK-2059, TASK-2068,
TASK-2071) no inventen datos en el cliente.

## Why This Task Exists

Verificación del 2026-10-30 contra el código (`3c7bcb5`):

- El manifest solo tiene `blocks[]` ordenados; no hay capítulos. La sala dibuja 5 capítulos alrededor de la órbita.
- No existe ningún registro de lo que una persona vio. La órbita de la sala mide el recorrido real y la regla de
  marca prohíbe simular progreso.
- Antes de entrar, `POST /api/invitations/start` y `GET /api/invitations/transaction` devuelven solo `state`,
  `expiresAt`, `retryAt`, `deliveryStatus` y `entryGate`. La invitación aprobada muestra quién invita (foto y
  nombre), el logo del cliente y a quién va dirigida.
- Vencida, revocada, reemplazada y enlace inválido llegan todos como `invalid_invitation` (404). El diseño tiene
  estados distintos para vencido y revocado, con acciones distintas.
- Un bloque de medio admite un solo asset (`assetRefIds.max(1)`) y nada agrupa las adaptaciones de una pieza
  (KV 16:9, feed 4:5, story 9:16, DOOH 3:1).
- Las preguntas devuelven `authorId` opaco, sin nombre visible.

## Goal

- Readers y commands nuevos con contrato documentado en `docs/documentation/rooms/backend-api-for-claude-design.md`.
- Migraciones aditivas, con los contenidos V1/V2 publicados intactos.
- Paridad: API, SDK `src/client/**`, CLI `scripts/rooms.ts` y MCP stdio exponen lo mismo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- ADR de colaboración/presentación y de multimedia enlazados en `docs/architecture/rooms/README.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- El contenido V1/V2 publicado es inmutable; lo nuevo es opt-in por versión de contenido o por metadata de edición.
- Toda lectura se vuelve a autorizar con `can`; un guest nunca lee datos de otra sala, de otra persona ni notas internas.
- Lo que se expone antes de autenticar es lo mínimo aprobado por el operador y solo para un token válido y vigente.
- Ningún cambio a issuer, flags de producción, correo ni canary.

## Normative Docs

- `docs/documentation/rooms/backend-api-for-claude-design.md` (contrato que esta task amplía)
- `docs/manual-de-uso/rooms/operar-backend-local.md`
- `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md` (sección «Aprobación 2026-10-29»)
- `.claude/skills/efeonce-rooms/SKILL.md` y `references/program-ledger.md`

## Dependencies & Impact

### Depends on

- Backend local `codex/rooms-design-integration@3c7bcb5`: 13 migraciones, 43 tablas.
- Respuesta del operador a Open Questions 1 y 2 (slices 3 y 4).

### Blocks / Impacts

- TASK-2059 (capítulos y recorrido en la sala).
- TASK-2068 (tarjeta y estados de la invitación).
- TASK-2071 (adaptaciones agrupadas y nombres en preguntas).
- TASK-2066: el slice 4 modifica la respuesta de error de su flujo; coordinar con su contrato.

### Files owned

- `../efeonce-rooms/migrations/` (migraciones 14 en adelante de esta task)
- `../efeonce-rooms/src/domain/content-contracts.ts`, `content-v3.ts`, `multimedia-contracts.ts` (campos nuevos)
- `../efeonce-rooms/src/server/progress/**` (nuevo)
- `../efeonce-rooms/src/server/invitations/http.ts`, `service.ts`, `authority.ts` (slices 3 y 4)
- `../efeonce-rooms/src/server/collaboration/service.ts` (proyección de nombres)
- `../efeonce-rooms/src/client/**`, `scripts/rooms.ts`, `src/server/mcp/**` (paridad)
- `docs/documentation/rooms/backend-api-for-claude-design.md`

## Current Repo State

### Already exists

- Bloques ordenados `editorial|media|diagnostic|plan` con `id`, `title`, `required`, `excludedReason`; comando `content.arrange`.
- Preguntas ancladas `questions.create` y reader `readQuestions` con `anchor{blockId, fragmentId, pieceId, evidenceId, assetVersionId, timeMs}`.
- Invitación con `start`, `verify`, `resend` (cooldown 60 s, presupuestos por hora) y código de 6 dígitos.
- Relaciones `kind: evidence|lineage` entre contenidos.
- Error canónico `{error:{code,message}, correlationId}`.

### Gap

- Sin capítulos, sin recorrido por persona, sin tarjeta previa a la entrada, estados de invitación colapsados, sin agrupación de adaptaciones, sin nombres visibles de autor.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `efeonce-rooms` (`src/domain/**`, `src/server/**`, `migrations/`)
- Future candidate home: `remain-shared`
- Boundary: readers y commands de Rooms; consumidores autorizados: páginas Rooms, SDK, CLI, MCP stdio
- Server/browser split: contratos zod en `src/domain` (browser-safe); persistencia y autorización en `src/server`
- Build impact: none
- Extraction blocker: none

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (el slice 3 expone datos antes de autenticar)
- Impacto principal: `migration`
- Source of truth afectado: manifest de contenido, nueva tabla de recorrido, proyección de invitación
- Consumidores afectados: UI de Rooms, SDK, CLI, MCP stdio
- Runtime target: `local` (sin producción en esta task)

### Contract surface

- Contrato existente a respetar: `docs/documentation/rooms/backend-api-for-claude-design.md`, esquemas zod de `src/domain/**`
- Contrato nuevo o modificado:
  1. **Capítulos**: campo opcional `chapters[{id, title, blockIds[]}]` en el manifest de contenido para versiones nuevas. El reader de edición devuelve siempre `chapters`: los declarados, o uno por bloque visible si no hay declarados (derivación documentada en el servidor, no en el cliente). Comando `content.arrange` acepta `chapters`.
  2. **Recorrido**: comando `progress.mark {editionId, blockId}` (idempotente por persona + edición + bloque) y reader `progress.get {editionId}` que devuelve, para la propia persona, `visitedBlockIds[]`, `visitedChapterIds[]` y `lastBlockId`.
  3. **Tarjeta de invitación** (Open Question 1 resuelta): reader previo a la entrada `GET /api/invitations/card` con el token de transacción; respuesta `inviter{displayName, avatarUrl}`, `client{displayName, logoUrl}`, `roomLabel`, `invitee{displayName, role}`, `sharedWith[{displayName, role}]`; nunca correos.
  4. **Estados de invitación** (Open Question 2 resuelta): para un token criptográficamente válido, distinguir `invitation_expired`, `invitation_revoked` y `invitation_superseded`, con `canRequestNew`. Token inexistente o mal formado sigue en `invalid_invitation`.
  5. **Adaptaciones**: agrupar varios assets de una pieza (propuesta: `pieceId` + `adaptations[{assetRefId, label, ratio}]` en el bloque de medio de la versión nueva) y campos opcionales `rationale` y vínculo a evidencia por pieza.
  6. **Nombres visibles**: `author{displayName, kind: guest|internal}` en preguntas y respuestas, sin exponer identidad interna a guests más allá del nombre y «Efeonce».
- Backward compatibility: `compatible` — campos opcionales y readers nuevos; V1/V2 publicados se leen igual.
- Full API parity: cada reader y command vive en `src/server/**` y se expone por API, SDK, CLI y MCP stdio; la UI no lee tablas.

### Data model and invariants

- Entidades/tablas/views afectadas: nueva tabla de recorrido (nombre a decidir por el dueño backend, p. ej. `room_viewer_progress`); columnas o campos de manifest para capítulos y adaptaciones.
- Invariantes que no se pueden romper:
  - Un bloque excluido o huérfano nunca aparece en `chapters`, `progress` ni adaptaciones.
  - `progress.mark` solo acepta bloques visibles de la edición que la persona puede leer.
  - La tarjeta previa a la entrada no existe para tokens vencidos, revocados o inválidos.
  - Nadie lee el recorrido de otra persona en esta task.
- Write-target allowlist: N/A en Greenhouse; declarar la tabla nueva en las pruebas de persistencia de Rooms.
- Tenant/space boundary: sala + organización + edición desde la sesión o la concesión guest, como el resto de readers.
- Idempotency/concurrency: `progress.mark` con upsert por clave única (persona, edición, bloque); repetir no duplica.
- Audit/outbox/history: el recorrido es un hecho propio de la persona; sin outbox. No se presenta como evidencia de atención.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: todo activo solo en local; nada se publica en esta task.
- Backfill plan: ninguno; las ediciones existentes derivan un capítulo por bloque.
- Rollback path: migración down vacía la tabla nueva solo si no tiene datos; revertir la rama.
- External coordination: ninguna fuera del repo; sin cambios a issuer ni a Vercel.

### Security and access

- Auth/access gate: sesión o concesión guest con `can`; la tarjeta usa el token de transacción existente.
- Sensitive data posture: nombre y foto de quien invita, nombre y logo del cliente, nombre y rol de la persona invitada y de quienes comparten la sala (PII ligera aceptada por el operador); nunca correos. Señales de actividad solo para actores internos.
- Error contract: errores canónicos `{error:{code,message}, correlationId}`; códigos nuevos documentados.
- Abuse/rate-limit posture: la tarjeta comparte los presupuestos por hora de `start`; `progress.mark` con límite por sesión.

### Runtime evidence

- Local checks: tests de dominio y persistencia nuevos; `pnpm verify`.
- DB/runtime checks: `pnpm db:migrate` y `pnpm db:smoke` sobre la PG local; recovery con 14+ migraciones.
- Integration checks: `pnpm invitation:integration` cubre tarjeta y estados nuevos.
- Reliability signals/logs: ninguna señal nueva.
- Production verification sequence: N/A — esta task no publica.

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

### Slice 1 — Capítulos

- Campo `chapters` en el contrato de contenido para versiones nuevas, validación (todo bloque visible en exactamente un capítulo), derivación por defecto en el reader y soporte en `content.arrange`.

### Slice 2 — Recorrido propio

- Migración aditiva, `progress.mark`, `progress.get`, rutas API, SDK, CLI y MCP.

### Slice 3 — Tarjeta previa a la entrada

- Reader `card` con la forma resuelta en Open Question 1.

### Slice 4 — Estados de invitación distinguibles

- Códigos `invitation_expired` / `invitation_revoked` / `invitation_superseded` con `canRequestNew`, según Open Question 2.

### Slice 5 — Adaptaciones y nombres

- Agrupación de adaptaciones por pieza con `rationale` opcional; `author.displayName` en preguntas y respuestas.

### Slice 7 — Comparación de ediciones

- Reader `editions.compare {fromEditionId, toEditionId}` en servidor: bloques agregados, quitados y cambiados, y diff de texto por bloque editorial (`added`/`removed` por fragmento), respetando exclusiones.

### Slice 8 — Vista previa por rol

- `preview` acepta `as: buyer|champion|audience`, proyectando exactamente lo que vería cada rol (notas y excluidos fuera; derechos adicionales solo si la concesión los da). No suplanta sesión ni crea principales.

### Slice 9 — Presentación: reloj y avance automático

- Proyectar `startedAt` (y `endedAt`) en `PresentationView`; `tours.upsert` acepta `durationMs` opcional por escena para el modo audiencia sin presentador.

### Slice 10 — Señales y subtítulos

- Comando `activity.view {editionId, blockId, dwellMs}` (agregado por persona, bloque y día; idempotente por ventana) y reader interno `signals.read {roomId, window: day|week, by: chapter|block}` con vistas, tiempo y preguntas. Solo actores internos con capacidad; un guest nunca lee señales.
- Pista de subtítulos (WebVTT) opcional por asset de video V4, servida con la misma autorización privada.

### Slice 6 — Contrato y paridad

- Actualizar `backend-api-for-claude-design.md`, manual local y ledger; tests de paridad.

## Out of Scope

- Tiempo real de la sala en vivo (cursores, selección, preguntas en vivo): TASK-2081.
- Cambiar el formato del código (sigue en 6 dígitos; la UI se ajusta).
- Producción, flags `ROOMS_*`, correo, canary, issuer de Auth.

## Detailed Spec

Pantallas que consumen cada slice, en el canvas aprobado (`https://claude.ai/code/artifact/6562987e-d882-44ba-a929-a6ab7863771d`):
`Main.dc.html` (capítulos y arco de recorrido), `Invitacion.dc.html` e `InvitacionMovil.dc.html` (tarjeta y estados
enlace/código/vencido/revocado/intentos), `Pieza.dc.html` (adaptaciones, Fundamento, Evidencia, Preguntar). Los nombres de
tablas y campos finales los decide el dueño backend respetando los invariantes de esta task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slices 1–5 y 7–10 son independientes entre sí, salvo 10 que reutiliza los capítulos de 1. Slice 6 cierra después de los demás.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La tarjeta previa filtra quién negocia con quién a un enlace reenviado | identity | medium | Respuesta mínima aprobada, solo token vigente, flag OFF, revisión con la skill legal | Revisión de privacidad no aprobada |
| Distinguir estados facilita enumerar tokens | identity | low | Solo para tokens criptográficamente válidos; presupuesto compartido con `start` | Picos de 429 en `start` |
| El recorrido se interpreta como medición de atención | UI / producto | medium | Documentar que es propio de la persona; sin lectura cruzada en esta task | Pedido de mostrarlo a Efeonce sin decisión |
| Migración altera contenido publicado | migration | low | Solo aditiva; tests sobre V1/V2 publicados | Hash de edición distinto tras migrar |

### Feature flags / cutover

- Sin flag nuevo: los cambios viven en la rama y en la PG local; la publicación futura pasa por la autorización de producción de Rooms y los flags `ROOMS_*` existentes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir commit; ediciones sin `chapters` siguen derivando | minutos | sí |
| Slice 2 | Migración down (tabla vacía) + revertir | minutos | sí |
| Slice 3 | Revertir commit | minutos | sí |
| Slice 4 | Revertir commit | minutos | sí |
| Slice 5 | Revertir commit | minutos | sí |
| Slice 6 | Revertir docs | minutos | sí |

### Production verification sequence

- N/A: sin publicación. La publicación requiere autorización explícita, `pnpm verify` y lectura del deploy activo según la skill `efeonce-rooms`.

### Out-of-band coordination required

- Avisar a Codex (backend Rooms hasta 2026-10-29) que la rama `claude/rooms-approved-ui` parte de su `de38af5`; coordinar el error de invitación con TASK-2066.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El reader de edición devuelve `chapters` en toda edición; las publicadas sin capítulos derivan uno por bloque visible.
- [ ] `content.arrange` rechaza capítulos con bloques repetidos, excluidos o ausentes. (Parcial: los acepta y la cobertura bloquea la publicación con códigos explícitos; decidir si el comando debe rechazar en vez de dejar el borrador pendiente.)
- [x] `progress.mark` repetido no duplica filas y rechaza bloques excluidos o de otra edición.
- [x] `progress.get` solo devuelve el recorrido de la persona autenticada.
- [ ] La tarjeta previa responde solo para tokens vigentes y con la forma resuelta; nunca incluye correos.
- [ ] `editions.compare`, `preview as`, `startedAt`/`durationMs`, `activity.view`/`signals.read` y subtítulos cumplen su slice y tienen tests; un guest recibe `not_found` en `signals.read`.
- [ ] Los estados vencido y revocado se distinguen solo para tokens válidos; un token inventado sigue en `invalid_invitation`.
- [ ] Preguntas y respuestas exponen `author.displayName` sin identificadores internos para guests.
- [ ] API, SDK, CLI y MCP stdio exponen los mismos readers y commands (test de paridad).
- [ ] V1/V2 publicados conservan su hash tras las migraciones.
- [ ] `pnpm verify`, `pnpm db:smoke` e `pnpm invitation:integration` pasan.

## Verification

- `efeonce-rooms`: `pnpm verify`, `pnpm db:migrate`, `pnpm db:smoke`, `pnpm invitation:integration`, recovery local
- `pnpm task:lint --task TASK-2080`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `references/program-ledger.md` de la skill `efeonce-rooms` actualizado y espejo `.codex` sincronizado.

## Follow-ups

- TASK-2081: sala en vivo (ADR + tiempo real).
- Tasks de UI para Consola/Audiencia, Señales/Video y Sala en vivo cuando sus fases empiecen.

## Open Questions

Resueltas el 2026-10-30 por el operador («quiero todo lo que está en el canvas»):

1. Antes del código, con un enlace vigente, se muestra la tarjeta completa del canvas: quién invita (nombre y foto),
   cliente (nombre y logo), persona invitada (nombre y rol) y con quién comparte la sala (nombres). Nunca correos.
   Riesgo aceptado: un enlace reenviado revela esos datos; se mitiga con la vigencia corta del token y la revocación.
2. Vencida, revocada e intentos se distinguen para tokens válidos.
