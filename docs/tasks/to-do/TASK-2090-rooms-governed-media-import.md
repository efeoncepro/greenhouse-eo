# TASK-2090 — Rooms: importación gobernada de medios

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
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
- Status real: `Diseno. ADR del carril de agentes Accepted (D5); pipeline privado de imágenes en producción (GCS, worker, dispatch); ningún código de importación escrito.`
- Rank: `después de TASK-2084; antes de que un agente arme una sala real con piezas visuales`
- Domain: `platform|content`
- Blocked by: `TASK-2084 (atribución del actor, clasificación D2 y cuotas)`
- Branch: `efeonce-rooms: rama derivada de main, sin push a main hasta autorización; Greenhouse: docs en develop, sin worktrees`

## Summary

Hoy un agente no puede poner una imagen en una sala: los bytes solo entran por la CLI con la cookie de una persona y
el MCP excluye `uploads.getTransfer` y `media.authorizeDelivery` a propósito. Esta task crea el comando
`media.importFromSource`: Rooms trae los bytes del lado del servidor desde fuentes en lista blanca (buckets aprobados
de Efeonce, `@efeoncepro/axis-brand-assets` o una subida hecha por una persona), con guard anti-SSRF, y los hace
entrar al pipeline privado existente (derivados, worker, reautorización). El agente nunca ve bytes ni URLs firmadas
y nunca entrega una URL arbitraria.

## Why This Task Exists

El ADR del carril de agentes declara que los agentes son ciudadanos de primera clase y arman las salas. Una sala sin
piezas no demuestra el servicio, y la escena `showcase` de «Vive el servicio» exige formatos visibles. El diseño
actual protege bien los bytes (`src/server/mcp/manifest.ts` excluye el transporte binario del modelo), pero no ofrece
una alternativa gobernada: el agente queda sin insumo o, peor, alguien le pasa una URL y el servidor la descarga. Una
descarga desde una URL elegida por el modelo es la puerta clásica de SSRF y de contenido sin procedencia.

## Goal

- Un agente (o una persona) importa una imagen a un borrador con un comando que solo acepta referencias a fuentes en
  lista blanca, nunca una URL.
- Los bytes importados pasan por la misma inspección, worker, derivados y reautorización que una subida directa.
- La procedencia de cada pieza importada queda registrada (fuente, referencia, generación, hash y actor).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (D2 clase `author`, D3 actor, D5 medios, D7 cuotas)
- `docs/architecture/rooms/EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md` (estados, procedencia, límites)
- `docs/architecture/rooms/EFEONCE_ROOMS_CLOUD_MEDIA_BACKEND_DECISION_V1.md` (GCS privado, worker, generación)
- `docs/architecture/rooms/EFEONCE_ROOMS_SERVICE_SCENES_DECISION_V1.md` (las escenas consumen las piezas)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`

Reglas obligatorias:

- **NUNCA** URLs firmadas, bytes ni URLs arbitrarias en el contexto del modelo, en la entrada del comando ni en su respuesta.
- **NUNCA** una petición HTTP a un host derivado de la entrada; las fuentes se resuelven por identificador.
- Los bytes importados entran por el mismo camino que una subida: tamaño, tipo real, checksum, decoder aislado,
  derivados y estados `pending → processing → ready | failed`.
- `ready` nunca lo declara la entrada; lo declara el worker.
- Procedencia declarada (`dataOrigin`, `provenance`) según el ADR de imágenes; importar no convierte nada en `real` por inferencia.
- Todo comando nuevo se clasifica en D2 o se excluye con motivo; el guard de paridad de MCP lo exige.

## Normative Docs

- `.claude/skills/efeonce-rooms/SKILL.md` y `.claude/skills/efeonce-rooms/references/program-ledger.md`
- `docs/manual-de-uso/rooms/operar-worker-medios.md`
- `docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md` (qué asset de marca elegir)

## Dependencies & Impact

### Depends on

- `TASK-2084` (`docs/tasks/to-do/TASK-2084-rooms-agent-attribution-reversal-quotas.md`): `actor_kind`,
  `agent_client_id` y `channel` en `command_receipts` y `audit`; clasificación D2 con guard; cuotas por persona.
- Pipeline existente: `rooms.assets`, `rooms.asset_versions`, `rooms.upload_sessions`, `rooms.media_jobs`
  (`migrations/1792968329622_rooms-private-image-media.sql`), worker `rooms-media-worker` y dispatch por Scheduler.
- Paquete `@efeoncepro/axis-brand-assets` `0.4.30` en `package.json` de `efeonce-rooms`.

### Blocks / Impacts

- `TASK-2091`: la skill de oficio enseña a importar piezas con este comando.
- `TASK-2088`: el provider `rooms` expone el comando con la clase `efeonce.mcp.rooms.author`.
- Escenas `showcase`/`cycle`: dejan de depender de una subida manual.

### Files owned

- `../efeonce-rooms/src/domain/media-contracts.ts` (schema de `media.importFromSource`)
- `../efeonce-rooms/src/server/media/import-sources.ts` (nuevo: lista blanca y resolución por identificador)
- `../efeonce-rooms/src/server/media/import.ts` (nuevo: comando)
- `../efeonce-rooms/src/server/media/service.ts` (wiring con el executor de medios)
- `../efeonce-rooms/src/server/media/storage-gcs.ts` (copia de objeto entre buckets) [verificar si basta `storage-port.ts`]
- `../efeonce-rooms/src/server/mcp/manifest.ts` (herramienta y guard)
- `../efeonce-rooms/scripts/rooms.ts` (subcomando de CLI)
- `../efeonce-rooms/migrations/<timestamp>_rooms-media-imports.sql` (nuevo, aditivo)

## Current Repo State

### Already exists

- Comandos de medios `uploads.initiate`, `uploads.complete`, `uploads.cancel`, `media.retry`, `media.cancel` y readers
  `uploads.getTransfer`, `uploads.getStatus`, `media.getStatus`, `media.authorizeDelivery`
  (`src/domain/media-contracts.ts`), ejecutados por `createMediaService` (`src/server/media/service.ts`).
- Puerto `MediaStorage` (`src/server/media/storage-port.ts`) con implementaciones local y GCS; destino fijo
  `efeonce-rooms-production-media` / `rooms-media/` (`src/server/media/storage-gcs.ts`).
- `rooms.assets` con `data_origin` y `provenance` (`CHECK(NOT(data_origin='real' AND provenance->>'sourceType'='fixture'))`).
- Exclusiones de MCP con motivo para el transporte binario (`src/server/mcp/manifest.ts:31-34`) y guard de
  exclusiones obsoletas (línea 99).

### Gap

- No hay comando que traiga bytes desde una fuente del servidor; solo existen subidas iniciadas por un cliente.
- No hay lista blanca de fuentes ni guard anti-SSRF, porque hoy no se hace ninguna lectura saliente.
- La procedencia no distingue una pieza importada de una subida.
- El agente no tiene ninguna herramienta MCP para poner una imagen en un borrador.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `efeonce-rooms` (`src/server/media/**`, rutas API v1 y MCP stdio)
- Future candidate home: `remain-shared`
- Boundary: comando `media.importFromSource` sobre el executor de medios de Rooms; consumidores: API v1, SDK, CLI, MCP stdio y el provider `rooms` de `efeonce-mcp`
- Server/browser split: contrato en `src/domain/media-contracts.ts`; resolución de fuentes, lectura de bytes y copia solo en servidor
- Build impact: posible input de filesystem si los assets de marca se leen del paquete instalado dentro de una función Vercel; se prefiere su origen canónico en GCS para no inflar la función (decisión en Discovery, ver Open Questions)
- Extraction blocker: la copia usa la identidad de la app (WIF Vercel) con lectura acotada a los buckets en lista blanca

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (comando aditivo sobre un pipeline existente; la superficie de SSRF y la IAM nueva lo acercan a crítico)
- Impacto principal: `command`
- Source of truth afectado: `rooms.assets`, `rooms.asset_versions`, `rooms.media_jobs` y tabla nueva `rooms.media_imports`
- Consumidores afectados: API v1, SDK, CLI `scripts/rooms.ts`, MCP stdio, futuro provider `rooms`
- Runtime target: local y staging en esta task; producción con autorización aparte

### Contract surface

- Contrato existente a respetar: executor de medios (idempotencia, `expectedRevision`, CAS), estados y límites del ADR
  de imágenes (`MEDIA_LIMITS`, original ≤ 20 MiB, PNG/JPEG/WebP), DTO autor sin bucket, key ni URL.
- Contrato nuevo: `media.importFromSource` con
  `{ organizationId, roomId, expectedRevision, displayName, dataOrigin, source }`, donde `source` es una de:
  - `{ kind: 'efeonce_bucket', sourceId, objectName }`: `sourceId` de un enum cerrado en código; `objectName` con
    patrón estricto, sin `..`, sin esquema ni host;
  - `{ kind: 'brand_asset', assetId }`: id del manifiesto de `@efeoncepro/axis-brand-assets`;
  - `{ kind: 'person_upload', uploadId }`: una subida completada por una persona de la misma organización.

  Respuesta: `{ commandId, assetVersionId, state: 'pending', replayed }`; nunca bytes, rutas ni URLs.
- Backward compatibility: `compatible` (aditivo; ningún comando existente cambia).
- Full API parity: un solo comando en `src/server/media/import.ts`; API, SDK, CLI y MCP lo llaman igual.

### Data model and invariants

- Entidades/tablas/views afectadas: `rooms.assets`/`rooms.asset_versions` (filas nuevas por importación),
  `rooms.media_jobs` (cola existente), `rooms.media_imports` nueva (fuente, referencia, generación de origen,
  sha256, actor y canal; append-only).
- Invariantes que no se pueden romper:
  - La entrada nunca contiene una URL ni un host; un `sourceId` desconocido falla con `invalid_input`.
  - Los bytes se leen con generación fijada y se verifica su SHA-256 antes de crear la versión.
  - Una pieza importada nace `pending` y solo el worker la lleva a `ready`.
  - `person_upload` solo acepta subidas `completed` cuyo actor fue `person` (columna de TASK-2084) en la misma organización.
  - Importar exige `content.edit` sobre el borrador, re-verificado tras la lectura externa y antes de confirmar.
  - `dataOrigin=real` con una fuente `fixture` sigue rechazado por el CHECK vigente.
- Write-target allowlist: solo `src/server/media/**` escribe `rooms.media_imports`; el resto de las tablas ya
  pertenecen al executor de medios.
- Tenant/space boundary: organización y sala del borrador; la referencia de fuente nunca cruza organizaciones.
- Idempotency/concurrency: recibo por `(organización, actor, operación, idempotencyKey)`; lectura y copia fuera de la
  transacción SQL; CAS de `expectedRevision` al confirmar.
- Audit/outbox/history: `rooms.media_imports` append-only + receipt/audit/outbox del executor con actor de TASK-2084.

### Migration, backfill and rollout

- Migration posture: `additive` (tabla `rooms.media_imports` con trigger `reject_mutation`).
- Default state: `flag OFF` con `ROOMS_MEDIA_IMPORT_ENABLED=false` [propuesto]; además requiere `ROOMS_MEDIA_ENABLED`.
- Backfill plan: N/A — sin importaciones previas.
- Rollback path: flag OFF + redeploy + alias; la tabla se conserva; nunca `down` en producción.
- External coordination: IAM de lectura (`storage.objects.get`) de la identidad de la app solo sobre los buckets en
  lista blanca; lista de buckets aprobada por el operador; ensayo de la migración en clon.

### Security and access

- Auth/access gate: `can(actor, 'content.edit', borrador)`; clase D2 `efeonce.mcp.rooms.author` para agentes.
- Sensitive data posture: piezas de marca de clientes; sin bytes ni rutas en logs, audit, outbox ni respuestas.
- Error contract: `RoomsError` canónicos de `src/domain/errors.ts` (`invalid_input`, `not_found`, `conflict`,
  `configuration`, `unavailable`); los fallos de bytes van como `problem_code` de la versión, con `retryable`, sin
  bucket, key ni stack.
- Abuse/rate-limit posture: cuotas por persona y hora de TASK-2084; límite de tamaño previo a leer (metadata del
  objeto); una lectura por comando; sin redirecciones ni reintentos automáticos.

### Runtime evidence

- Local checks: pruebas de schema (rechazo de URL, host, `..`, `sourceId` desconocido), de cada tipo de fuente con
  storage local, de `person_upload` hecho por un agente (rechazo) y de idempotencia.
- DB/runtime checks: migración ensayada con `pnpm db:rehearse-production`.
- Integration checks: importación real en staging desde un bucket aprobado → worker → dos derivados → lectura privada.
- Reliability signals/logs: `rooms.media.import_rejected` [propuesto] y las señales de cuota de TASK-2084.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR.
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
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato, lista blanca y migración

- Schema de `media.importFromSource` en `src/domain/media-contracts.ts`, sin campo URL.
- `src/server/media/import-sources.ts`: enum cerrado de `sourceId` → bucket y prefijo fijos; resolución de
  `assetId` contra el manifiesto de `@efeoncepro/axis-brand-assets`; validación de `objectName`.
- Migración aditiva `rooms.media_imports` (append-only) con su bloque de verificación.

### Slice 2 — Comando sobre el pipeline existente

- `src/server/media/import.ts`: autoriza, lee metadata (tamaño y tipo) antes de los bytes, copia al destino de Rooms
  con generación fijada, verifica SHA-256, crea asset y versión `pending`, encola el job existente y registra la importación.
- `person_upload`: reutiliza el objeto ya verificado de la subida, sin volver a transferir bytes al cliente.

### Slice 3 — Paridad: API, SDK, CLI y MCP

- Ruta API v1, método SDK, subcomando `pnpm rooms` y herramienta MCP; `assertMcpOperationCoverage` verde; clase D2
  `author` en la clasificación de TASK-2084.

### Slice 4 — Canary y documentación

- Canary de staging desde un bucket aprobado y desde un asset de marca; producción con autorización aparte.
- Manual `docs/manual-de-uso/rooms/operar-worker-medios.md` y ledger de la skill `efeonce-rooms`.

## Out of Scope

- Importar desde URLs públicas, Drive, OneDrive, Figma o cualquier host no listado.
- PDF, audio, video o multimedia V4 (siguen su propio contrato).
- Generar imágenes con IA dentro de Rooms.
- Adjuntar la pieza a un bloque: sigue siendo `content.attachAsset`.
- Descarga del original.
- UI nueva.

## Detailed Spec

Orden del comando, alineado con el ADR de imágenes (I/O fuera del lock y de la transacción):

1. Validar entrada (sin URL; `sourceId` en enum; `objectName` con patrón).
2. Autorizar `content.edit` sobre el borrador (lectura corta).
3. Resolver la fuente a `{bucket, objectName}` fijo o al objeto de la subida; leer metadata; rechazar si excede
   `MEDIA_LIMITS` o el tipo declarado no es imagen permitida.
4. Copiar al destino generado por servidor bajo `rooms-media/` con precondición `generation=0`; leer la generación
   resultante y calcular SHA-256 acotado.
5. Transacción: re-autorizar, CAS de `expectedRevision`, insertar asset/versión `pending`, job, `media_imports`,
   receipt, audit y outbox.
6. El worker procesa como cualquier versión; un decoder que falla deja `failed` con `problem_code`.

Guard anti-SSRF: no existe una lectura HTTP; las lecturas usan el SDK de GCS con bucket constante o el manifiesto
del paquete. Si el origen canónico de los assets de marca fuera HTTP, se fija por host constante, sin redirecciones,
con resolución DNS que rechaza rangos privados y metadata (`169.254.169.254`) [verificar origen canónico].

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-2084 cerrada antes del slice 3 (sin actor y cuotas, un agente no puede importar en producción).
- Slice 1 → Slice 2 → Slice 3 → Slice 4. La IAM de lectura se aplica antes del canary, nunca antes de tener la lista
  blanca aprobada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| SSRF: el servidor lee un recurso interno elegido por el modelo | integration | low | Sin campo URL; enum cerrado de fuentes; sin HTTP saliente; tests de rechazo | `rooms.media.import_rejected` |
| Pieza de un cliente aparece en la sala de otro | identity | low | Fuente y destino acotados por organización; `person_upload` de la misma organización | auditoría de `media_imports` |
| Bytes maliciosos o malformados | integration | medium | Mismo decoder aislado, límites y estados que una subida | `failed` con `problem_code` |
| IAM demasiado amplia para la app | identity | medium | `storage.objects.get` solo en los buckets listados, sin rol de proyecto; readback IAM | revisión IAM |
| Agente en bucle llena el bucket | integration | low | Cuotas de TASK-2084; tope de tamaño previo a copiar | `rooms.agent.quota_hit` |
| Función Vercel inflada por leer el paquete de marca | release | medium | Preferir origen GCS; medir tamaño de la función en el build | tamaño de función en el deploy |
| Procedencia falsa (`real` sobre fixture) | content | low | CHECK vigente + procedencia server-side | rechazo del CHECK |

### Feature flags / cutover

- `ROOMS_MEDIA_IMPORT_ENABLED` [propuesto] (Rooms, default `false`): sin flag, el comando responde `unavailable`.
  Requiere `ROOMS_MEDIA_ENABLED=true`. Revert: flag a `false` + redeploy + alias manual; menos de 10 min.
- Registrar el flag en el ledger de la skill `efeonce-rooms` [verificar si `FEATURE_FLAG_STATE_LEDGER.md` cubre repos hermanos].

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Migración aditiva: se conserva; revertir código. Producción: restaurar respaldo, nunca `down` | minutos / 30 min con respaldo | sí |
| Slice 2 | Flag OFF + redeploy; las versiones importadas siguen válidas | < 10 min | sí |
| Slice 3 | Revertir commit; la herramienta MCP desaparece con el deploy | minutos | sí |
| Slice 4 | Flag OFF; retirar el binding IAM de lectura | < 15 min | sí |

### Production verification sequence

1. Ensayo de la migración en clon con `pnpm db:rehearse-production`; respaldo lógico; aplicar con autorización.
2. Binding IAM de lectura sobre los buckets aprobados + readback.
3. Deploy con flag OFF; reasignar el alias; verificar que el comando responde `unavailable`.
4. Flag ON en staging: importar una pieza de un bucket aprobado y un asset de marca a una sala sintética; worker
   produce derivados; lectura privada OK; el MCP no devuelve bytes ni URLs.
5. Producción con autorización: repetir 4 en una sala interna; observar señales 7 días.

### Out-of-band coordination required

- Operador: lista de buckets aprobados de Efeonce y prefijos permitidos.
- GCP: binding IAM de lectura para la identidad de la app de Rooms (proyecto `efeonce-group`).
- Vercel `efeonce-rooms`: flag y reasignación manual del alias `efeonce-rooms.vercel.app`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El schema de `media.importFromSource` no tiene ningún campo que acepte URL, host o esquema (test con cinco entradas maliciosas rechazadas).
- [ ] Un `sourceId` fuera del enum y un `objectName` con `..` o `/` inicial fallan con `invalid_input` sin lectura externa (test).
- [ ] La respuesta del comando y de su herramienta MCP no contiene bytes, bucket, key ni URL (test de forma).
- [ ] Una pieza importada nace `pending` y llega a `ready` solo por el worker, con los mismos derivados que una subida (test local + canary).
- [ ] `person_upload` rechaza una subida hecha por un agente o de otra organización (test).
- [ ] Repetir el comando con la misma `idempotencyKey` devuelve el mismo `assetVersionId` con `replayed: true` (test).
- [ ] `rooms.media_imports` registra fuente, referencia, generación, sha256, `actor_kind`, `agent_client_id` y `channel`, y rechaza UPDATE/DELETE (test).
- [ ] `assertMcpOperationCoverage` pasa y la operación tiene clase D2 `author`.
- [ ] Con el flag OFF el comando responde `unavailable` (test).
- [ ] Canary de staging registrado en `docs/audits/rooms/`.

## Verification

- `efeonce-rooms`: `LC_ALL=en_US.UTF-8 pnpm verify` y `pnpm db:rehearse-production`
- Canary de staging de la secuencia anterior
- `pnpm task:lint --task TASK-2090`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `references/program-ledger.md` de la skill `efeonce-rooms` actualizado y espejo `.codex` sincronizado.
- [ ] ADR de imágenes privadas con un delta que nombre la importación gobernada.

## Follow-ups

- Importación de multimedia V4 (PDF, audio, video) con su propio perfil.
- Fuentes nuevas (por ejemplo, la biblioteca de OneDrive del equipo) solo con ADR y lista blanca propia.

## Open Questions

- ¿Qué buckets y prefijos de Efeonce entran a la lista blanca?
- ¿Cuál es el origen canónico de los bytes de `@efeoncepro/axis-brand-assets` en runtime: el paquete instalado o un bucket?
- ¿`person_upload` acepta subidas de otra sala de la misma organización o solo una bandeja de la organización?
