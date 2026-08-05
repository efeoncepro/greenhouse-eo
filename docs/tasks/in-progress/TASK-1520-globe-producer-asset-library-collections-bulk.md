# TASK-1520 — Globe Producer Asset Library, Collections and Bulk Operations

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Writes y bulk operativos internal-only; export y purge permanecen cerrados`
- Rank: `TBD`
- Domain: `creative|data|storage|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Checkpoint 2026-07-22 — library runtime code complete

- Se registraron 6 commands y 5 readers para feed/biblioteca durable, cursor estable, búsqueda/filtros/sort,
  collections/series, move, bulk con resultados parciales, trash/restore y export privado content-addressed.
- La autoridad compone outputs + Provenance; no crea un segundo source of truth. Purge sigue siendo solicitud
  gobernada y no borra físicamente por click.
- Verificación local integrada en `pnpm check`/`pnpm build`; la UI TASK-1505 consume las mismas primitives.
- Rollout pendiente: migration `0010`, `GLOBE_LIBRARY_CONFIRMATION_SECRET`, bucket
  `GLOBE_LIBRARY_EXPORT_BUCKET`, IAM privado y grants `library.read/manage/export/delete`.

## Checkpoint 2026-07-23 — writes y bulk promovidos con smoke humano

- Migración `0010`, secrets purpose-separated, bucket/IAM y grants quedaron aplicados. El flag de writes se
  promovió primero y el de bulk después, ambos gobernados en Git y verificados por OpenTofu.
- El smoke humano creó y movió a trash una entrada durable. El bulk exigió confirmation token y devolvió un
  resultado parcial honesto `not-found` para un asset inexistente; no convirtió el fallo en éxito agregado.
- `GLOBE_LIBRARY_EXPORT_ENABLED=false` permanece cerrado porque no existe un asset real elegible para probar
  queue, bytes e integridad de export. `GLOBE_LIBRARY_PURGE_ENABLED=false` permanece cerrado por policy/Legal.

## Delta 2026-07-25 — la unión con el feed YA está en el contrato, y no hace falta una task nueva

Estuve a punto de crear una task de biblioteca sin ver que **esta ya existe y ya la cubre** (su propio Summary dice
"proyectables en el feed canónico"). No se creó. Lo que el discovery aporta:

**🔴 La unión profunda feed↔biblioteca ya está en el contrato y no hay que inventarla.** El item del feed trae
**`output.containerIds`**, y `LibraryContainerKindV1` es **`'collection' | 'series'`**. O sea:

- **"Serie" es un `LibraryContainer` de kind `series`**, listable con `container.list?kind=series`;
- el agrupamiento por serie en el feed es **derivable de datos que el feed YA recibe** — `containerIds` es el join;
- la biblioteca no es un silo aparte: es la que **da sentido a "Serie" dentro del feed**, y el feed es donde una
  pieza entra a una colección.

**Corrección de una afirmación falsa que shippeé en el feed:** deshabilité el control "Serie" con el mensaje *"no
tiene contrato gobernado"*. **Falso en los dos casos** (Serie y Compartir): los contratos existen; lo que falta es
la superficie que los consume. Ya corregido en el copy del feed (`efeonce-globe`, commit `d939e95`), porque "no hay
contrato" manda al próximo agente a negociar un cambio de API que no hace falta.

**Lo que el feed necesita de esta task, concretamente:** `container.list` (kind `series` y `collection`),
`container.create/update`, y el agrupamiento visual en el feed leyendo `containerIds`. Las **6 capabilities de
`surface: 'library'`** del inventario de paridad (`apps/studio-client/src/data/legacy-parity.ts`) son las de esta
task, y el retiro del payload legacy (`TASK-1560`) **las necesita cubiertas**.

⚠️ **Ojo con las promesas muertas:** `library.bulk.prepare`, `library.bulk.execute` y `library.export.request`
están **gateadas y nunca despachadas** en el payload legacy — el botón existe, se ilumina si hay grant, y no llama
a nada. Están declaradas con su motivo en `LEGACY_PARITY_EXCLUSIONS`. Construirlas acá es **trabajo nuevo**, no un
port, y el contrato (`PrepareLibraryBulkPayloadV1` con `LibraryBulkActionV1`) **sí existe**.

## Summary

Crear la librería durable del Producer: collections/series, membership, búsqueda/filtros/orden, move y bulk
actions, export interno y trash/delete gobernado. Todas las operaciones serán tenant-safe, idempotentes,
auditadas y proyectables en el feed canónico.

## Why This Task Exists

El target aprobado ofrece una librería operable, pero hoy hay asset retrieval/favorite y readers de candidatos,
no un agregado durable para colecciones, series, selección masiva, move/export/delete. Mantenerlo en memoria del
browser perdería estado y haría imposibles auditoría, reintentos y aislamiento consistente.

## Goal

- Collections/series y memberships durables por workspace con commands/readers gobernados.
- Query estable con search/filter/sort/pagination y proyección hacia `TASK-1498`.
- Bulk/move/export/trash/restore/delete idempotentes con audit, límites y resultados parciales explícitos.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`

Reglas obligatorias:

- Scope deriva del trusted workspace; IDs del payload nunca conceden autoridad.
- Writes viven en commands; `TASK-1498` sólo proyecta/consulta y `TASK-1503` conserva serving/favorite.
- Delete es recoverable por defecto; purge físico respeta retention/rights/legal hold y requiere gate separado.
- No se introduce un modelo alternativo de tenancy (`TASK-1511`).

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1465`, `TASK-1467`, `TASK-1481`, `TASK-1498`, `TASK-1503`.

### Blocks / Impacts

- Alimenta la librería/collections/bulk de `TASK-1505` vía `TASK-1519`.
- Proyecta memberships/series en el unified feed de `TASK-1498`.

### Files owned

- `../efeonce-globe/packages/contracts/`
- `../efeonce-globe/packages/domain/`
- `../efeonce-globe/packages/database/`
- `../efeonce-globe/apps/studio-web/`
- `../efeonce-globe/apps/creative-runner/` sólo para jobs de export si aplica.

## Current Repo State

### Already exists

- Cloud SQL durable/store patterns, trusted context/capability registry, private asset serving y favorite.
- Candidate list/lineage contract en `TASK-1498`.

### Gap

- No hay collection/series aggregate, memberships, bulk command, búsqueda library ni trash/restore/export durable.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `packages/{contracts,domain,database} + transport wiring en apps/studio-web`
- Future candidate home: `domain-package`
- Boundary: `Library commands/readers/events; asset bytes y serving permanecen en TASK-1467/TASK-1503`
- Server/browser split: `DB/search/export/delete policy server-only; browser consume commands/readers`
- Build impact: `migración aditiva; export worker usa storage/queue existentes si aplica`
- Extraction blocker: `transacciones de membership/audit, asset rights/retention y feed projection`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `library collections/series/memberships/bulk operations en Globe DB`
- Consumidores afectados: `Producer UI/BFF, unified feed, SDK/API, export worker, audit`
- Runtime target: `Globe API/database/worker`

### Contract surface

- Contrato existente a respetar: `asset descriptors/serving/favorite, candidate readers, spine trusted context`.
- Contrato nuevo o modificado: `collection/series resource, library query reader, move/bulk/export/trash/restore commands`.
- Backward compatibility: `aditiva y gated`.
- Full API parity: `un command/reader por semántica; no endpoints por click ni writes desde el feed`.

### Data model and invariants

- Entidades/tablas/views afectadas: `collection`, `series`, memberships, operation/audit/outbox [nombres finales en Discovery].
- Invariantes que no se pueden romper:
  - `workspace scope en cada fila/query; membership sólo referencia assets visibles del mismo workspace`.
  - `bulk produce resultado por item y no convierte partial success en éxito total`.
  - `trash/restore/purge son estados/transiciones distintas; legal hold/retention gana`.
- Tenant/space boundary: `TrustedCommandContextV1.workspaceId`.
- Idempotency/concurrency: `idempotency key por command; unique membership; optimistic/precondition version`.
- Audit/outbox/history: `append-only por create/rename/move/bulk/export/trash/restore/purge request`.

### Migration, backfill and rollout

- Migration posture: `aditiva`.
- Default state: `flag OFF/read-only projection hasta validar write paths`.
- Backfill plan: `N/A para collections; feed existente aparece como Library sin colección mediante projection`.
- Rollback path: `flag OFF; preservar tablas/data aditivas; no ejecutar purge durante rollback window`.
- External coordination: `storage/export lifecycle y worker/queue si export es async`.

### Security and access

- Auth/access gate: `capabilities finas para read/manage/export/delete; workspace del trusted context`.
- Sensitive data posture: `private asset metadata, rights/provenance y export grants`.
- Error contract: `canonical invalid_request/access_denied/not_found/conflict; no existencia cross-tenant ni object keys`.
- Abuse/rate-limit posture: `límites por batch/query/export, quotas y circuit breaker`.

### Runtime evidence

- Local checks: `unit/integration para scope, idempotencia, partial result, stable cursor y transitions`.
- DB/runtime checks: `migrate/readback, constraints/indices y query plan con fixture representativo`.
- Integration checks: `BFF/API + asset serving + export job + feed convergence`.
- Reliability signals/logs: `operationId, affected/succeeded/failed counts, duration, correlationId`.
- Production verification sequence: `migrate → flag OFF → shadow/read → allowlist writes → bulk/export/delete rehearsal`.

### Acceptance criteria additions

- [ ] Schema/query/commands preservan tenant isolation, idempotencia y resultados parciales.
- [ ] Delete/trash/restore respeta rights/retention/legal hold y no purga por click inmediato.
- [ ] Feed refleja collections/series sin duplicar el write model.

## Capability Definition of Done — Full API Parity gate

- [ ] Reads son readers canónicos; writes son commands con capability/idempotency/audit/errors.
- [ ] Grants y coverage se entregan con conformance positivo/negativo.
- [ ] Bulk es apto para propose → confirm → execute y devuelve resultado por item.
- [ ] UI/BFF/SDK usan el mismo primitive.

<!-- ZONE 2 — PLAN MODE: Discovery produce plan.md; no se llena al crear. -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Durable library aggregate

- Migración aditiva, stores y commands/readers para collections, series y membership.
- Audit, capabilities, idempotency y tests de aislamiento/concurrencia.

### Slice 2 — Query, search, filter and sort

- Reader cursor-paginado con predicates/sorts allowlisted y bounded search.
- Integración de projection con `TASK-1498`, sin write duplication.

### Slice 3 — Move and bulk operations

- Commands idempotentes para move y acciones masivas aplicables; resultado por item y retry sólo de faltantes.
- Límites, dry-run/confirmación cuando la acción sea destructiva o costosa.

### Slice 4 — Export and deletion lifecycle

- Export async con manifest/checksums/status y grants de descarga acotados.
- Trash/restore y purge gobernado por retention/rights/legal hold, con audit y reconciliación.

## Out of Scope

- Asset ingest/provenance/C2PA (`TASK-1467`), serving/favorite authority (`TASK-1503`) y delivery release (`TASK-1472`).
- Unified-feed read ownership (`TASK-1498`), tenancy/members/grants (`TASK-1511`) o ledger (`TASK-1468`/`TASK-1482`).
- UI visual/interaction de `TASK-1505`.

## Detailed Spec

La operación bulk crea una entidad/operation id durable y un resultado por item. Repetir la misma idempotency key
retorna la misma operación; retry explícito sólo procesa items retryable/no terminales. Export genera manifest y
signed retrieval mediante serving gobernado. Delete primero mueve a trash; purge es posterior, policy-gated y
observable.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2; Slice 3 requiere Slice 1; Slice 4 requiere Slice 1 y los gates de rights/serving.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Bulk duplica/muta parcialmente | DB/commands | medium | operation id + idempotency + per-item state | duplicate terminal item |
| Query no acotada degrada DB | reader/DB | medium | cursor/allowlist/limits + query-plan gate | latency/scan rows |
| Delete viola retention/rights | storage/legal | high | trash-first + legal-hold gate + no purge inicial | purge denied/asset missing |
| Export filtra asset privado | storage/access | medium | allowlisted manifest + short-lived serving grant | cross-workspace retrieval |

### Feature flags / cutover

Flags separados para library writes, bulk, export y purge; todos OFF inicialmente, purge último.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | flag OFF; conservar schema/data aditivos | medido en rehearsal | sí |
| 2 | volver al reader anterior | medido en rehearsal | sí |
| 3 | bulk flag OFF; reconciliar operations abiertas | medido en rehearsal | sí |
| 4 | export/purge OFF; restaurar trash no purgado | medido en rehearsal | parcial tras purge |

### Production verification sequence

1. Migrar y verificar constraints/indices en staging.
2. Deploy con writes OFF; comparar projection/query en shadow.
3. Habilitar collections/move en allowlist y probar retry/concurrency/cross-tenant.
4. Rehearsal bulk/export/trash/restore; habilitar purge sólo con gate y rollback probado.

### Out-of-band coordination required

Lifecycle/retention de storage y capacidad/identidad del worker de export.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Collections/series/memberships sobreviven reinicios y se consultan con cursor/search/filter/sort estables.
- [ ] Move/bulk son idempotentes, auditados, bounded y muestran partial success por item.
- [ ] Export es recuperable e íntegro; trash/restore/purge respetan authorization y retention.
- [ ] `TASK-1498` proyecta el estado sin duplicar writes; no se duplicó serving, tenancy ni ledger.

### Criterios de la unión con el FEED — migrados del discovery 2026-07-25

La sinergia con el feed ya está en el Summary de esta task ("proyectables en el feed canónico"); estos criterios
la vuelven verificable en vez de aspiracional.

- [ ] **El agrupamiento por serie en el feed lee `output.containerIds` del propio item**, no un reader aparte. Es
      el join y ya viaja en el contrato: un segundo camino para saber a qué serie pertenece una pieza es un
      segundo camino que puede discrepar.
- [ ] `container.list` acepta `kind` y el feed pide **`series`** para agrupar y **`collection`** para mover. Un
      solo listado sin `kind` mezcla dos vocabularios que el contrato separó.
- [ ] El control **"Serie" del feed deja de estar deshabilitado** cuando esta task entrega `container.list`. Hoy
      muestra `pendingSeries` — *"la serie ya existe como dato en cada pieza"* — y esa razón tiene que dejar de
      ser verdad, no cambiarse de texto.
- [ ] **Mover una pieza a una colección se hace desde el feed**, no sólo desde una vista de biblioteca: es donde
      el operador está mirando la pieza. La acción vive en la card.
- [ ] La idempotencia de una anotación va **en SQL** (`ON CONFLICT DO NOTHING` + re-lectura), nunca read-then-write:
      con `maxScale=3` un chequear-y-después-insertar es una carrera cuyo síntoma visible es un `referenceId`
      duplicado o una estrella re-fechada.
- [ ] Un `favorite` toma el **estado deseado explícito**, nunca un toggle ciego: sobre una vista stale, un toggle
      invierte justo lo que el usuario quiso.
- [ ] Las **6 capabilities de `surface: 'library'`** del inventario de paridad
      (`apps/studio-client/src/data/legacy-parity.ts`) se despachan de verdad — el test de paridad pasa con ellas.
      `TASK-1560` (retiro del legacy) **las necesita cubiertas**.
- [ ] ⚠️ `library.bulk.prepare`, `library.bulk.execute` y `library.export.request` se construyen como **trabajo
      nuevo**, no como port: en el legacy están **gateadas y nunca despachadas** (el botón existe, se ilumina con
      grant, y no llama a nada). Están declaradas con su motivo en `LEGACY_PARITY_EXCLUSIONS`. El contrato
      (`PrepareLibraryBulkPayloadV1`) **sí** existe.
- [ ] Cross-workspace y contenedor desconocido son el **MISMO `not_found`**: cualquier respuesta más fina es un
      oráculo para sondear los contenedores de otro tenant.

## Verification

- `pnpm task:lint --task TASK-1520`
- `pnpm check` en `../efeonce-globe`
- Migration/readback/query-plan + staging bulk/export/delete rehearsal.

## Closing Protocol

- [ ] Lifecycle/carpeta, README, Handoff y changelog se sincronizaron al cerrar.
- [ ] Migración, rollback, audit, query-plan y cross-tenant evidence quedaron adjuntos.
- [ ] Purge quedó OFF hasta cumplir todos los gates.

## Follow-ups

- Index/search especializado sólo si evidencia de escala demuestra que Postgres bounded search no basta.

## Open Questions

- Discovery debe fijar límites de batch/export y política exacta de purge con Legal/Storage, sin inventarlos aquí.

## Delta 2026-07-26 — biblioteca dentro del master creative workspace

El benchmark de suites maduras confirma que Library/Collections no deben presentarse como un administrador de archivos aislado. `TASK-1520` conserva la autoridad durable de collections/series/membership/bulk; el master flow de EPIC-028 la proyecta junto a Project, Session, Asset Workspace y Review.

Consumers nuevos:

- `TASK-1581` usa collections para el contexto previo y el feed session-aware.
- `TASK-1582` muestra membership y acciones de organización desde el Asset Workspace.
- `TASK-1583` conecta aprobación y reuse sin mover el source asset ni crear Elements client-side.

Esto no crea un cuarto modelo de folders. `containerIds`, `container.list`, commands de membership y los límites tenant-safe de esta task siguen siendo la única autoridad de organización.
