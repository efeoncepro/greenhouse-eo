# TASK-2062 — Rooms: autoría de contenido versionado

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
- Backend impact: `command`
- Epic: `EPIC-052`
- Status real: `Discovery y alcance R03B aprobados; registro y task-hook pendientes antes de código`
- Rank: `TBD`
- Domain: `platform|data|content|identity`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-rooms main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear contratos V2 de contenido y autoría que permitan borradores incompletos, perfiles creativo y SEO/AEO independientes, bloques y relaciones tipadas, referencias de assets y validación de cobertura antes de publicar. Mantener lectores V1 y snapshots históricos sin cambios. Este tramo prepara editor y pipeline de medios; no conecta identidad ni sube archivos.

## Why This Task Exists

En HEAD `bd4b802`, `src/domain/contracts.ts` exige piezas, artículo y plan completos para crear cualquier sala; fija tres ratios/artDirection y procedencia sintética. `rooms.updateDraft` reemplaza todo el documento; `editions.publish` valida su forma JSON, pero no cobertura ni disponibilidad de assets. Una UI de autoría sobre ese contrato tendría que inventar contenido o asumir bytes listos. TASK-2060 ya cerró persistencia/ciclo; ninguna task vigente posee este modelo de autoría.

## Goal

- Crear y editar contenido estructurado sin fabricar campos ni assertions para satisfacer el schema de publicación.
- Publicar únicamente snapshots V2 completos, con relaciones y cobertura resueltas, conservando compatibilidad V1.
- Exponer commands/readers canónicos a API/CLI y futuros consumidores UI/MCP con los mismos permisos y validaciones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

La decisión de versión y compatibilidad se registra en el ADR Rooms antes del hook. Docs antiguas de diseño no sustituyen el estado de TASK-2060/2061 y HEAD verificado. Rooms conserva datos propios; ningún adapter puede leer tablas, cookies o secretos de otros productos.

## Normative Docs

- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/manual-de-uso/rooms/operar-primera-experiencia-local.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-2060-rooms-persistence-and-lifecycle.md`: PostgreSQL local, autoridad, idempotencia, audit/outbox y recovery.
- `docs/tasks/complete/TASK-2058-rooms-foundation-and-permissions.md`: can y proyección sin datos privados.
- Contrato de perfiles y ADR Rooms anteriores. No depende del rollout de identidad para pruebas locales con autoridad sintética inyectada sólo en harness.

### Blocks / Impacts

- R05 consume referencias/versiones de assets y será dueño del registro de bytes ready; R08 consumirá borradores y coverage para autoría visual.
- R07 deberá renderizar V2 por contrato; esta task entrega DTOs compatibles/versionados, no una UI nueva.
- R04 conserva Efeonce ID pendiente; R13 certificará transporte MCP. No completar esas unidades por inferencia.

### Files owned

- Dominio: `../efeonce-rooms/src/domain/` (nuevos `content-*.ts`, más contratos/registry compartidos).
- Backend: `../efeonce-rooms/src/server/persistence/`, `../efeonce-rooms/src/server/commands/`, proyecciones en `../efeonce-rooms/src/server/readers.ts` y nueva migración CLI bajo `../efeonce-rooms/migrations/`.
- Coordinador: `../efeonce-rooms/src/server/http/`, `../efeonce-rooms/src/app/api/v1/`, `../efeonce-rooms/scripts/rooms.ts`; no lógica de negocio en transportes.
- QA: pruebas nuevas de contenido bajo `../efeonce-rooms/tests/`; separar ownership de tests de dominio y transporte antes de editar.
- Documentación: esta task y contratos/manuales Rooms; índices, ADR y Handoff a cargo del coordinador.

## Current Repo State

### Already exists

- HEAD `bd4b802`, working tree limpio al discovery; runtime y demo publicados según TASK-2061, sin identidad ni DB cloud.
- `src/domain/contracts.ts`, `persistence-contracts.ts`; ciclo `src/server/commands/execute.ts`; readers en `src/server/persistence/readers.ts`.
- `migrations/1792962301842_rooms-foundation.sql`: JSONB de draft/snapshot, CHECK synthetic, ediciones inmutables, autoridad y transacciones propias.
- `src/components/creative-artwork.tsx`: renderer de muestra fijo a tres PNG, sin AssetVersion ni delivery privado.

### Gap

- Un perfil requiere datos del otro; no existe borrador vacío válido ni importación con reporte por elemento.
- Sin ContentBlock discriminado/versionado, relaciones/anclas generales, coverage ni validación publicable separada.
- Sin referencias a AssetVersion gestionadas; el cliente no debe poder autodeclarar que hay bytes listos.
- Registro de capabilities limitado además en schema SQL y `access.grant`; cualquier ampliación exige paridad explícita.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-rooms`; documentación canónica en Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: manifest/blocks/evidence/relations, commands y coverage son dominio Rooms; API/CLI/UI/MCP adapters.
- Server/browser split: schemas y tipos browser-safe; SQL, resolución de assets/autoridad, secretos y readers exclusivamente server-only.
- Build impact: no dependencias nuevas; reutilizar zod/pg/TypeScript instalados. Sin Sharp, FFmpeg, SDK cloud ni entradas filesystem de assets al build.
- Extraction blocker: none; mantener transacción Rooms sin imports privados de Greenhouse.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: schema `rooms`, drafts y ediciones; manifest V2 y referencias/versiones tipadas.
- Consumidores afectados: API/CLI y contratos de futuros editor/media; demo V1 existente.
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `src/domain/contracts.ts` V1, `src/domain/persistence-contracts.ts`, `src/server/commands/execute.ts` y contrato API Rooms.
- Contrato nuevo o modificado: DraftManifestV2, PublishedSnapshotV2, ContentBlock, ContentRelation, EvidenceSnapshot, AssetVersionRef y CoverageReport; commands import/upsert/arrange/linkEvidence y reader editions.validate.
- Backward compatibility: additive/versioned. Lectura V1 y hashes históricos idénticos; ninguna conversión automática de snapshots ni reinterpretación de claims.
- Full API parity: operaciones declaradas en registry, schemas runtime, capability y DTO de resultado; API/CLI delegan a primitive. MCP con deuda explícita R13/Platform, no anunciado como conectado.

### Data model and invariants

- Entidades/tablas/views afectadas: `rooms.drafts`, `rooms.editions`, `rooms.command_receipts`, `rooms.audit`, `rooms.outbox`; referencia/catálogo de AssetVersion adicional sólo si hace falta para resolución canónica, definido en migración antes de commands.
- Invariantes que no se pueden romper:
  - Draft tolera incompletitud; published exige cobertura. Ambos conservan schemaVersion y IDs estables.
  - V1 publicado es inmutable y se lee con su contrato original. No backfill de snapshots ni actualización de su hash.
  - `dataOrigin=synthetic` sigue explícito en fixtures de este corte; ninguna hipótesis/simulación se transforma en observación o medición mediante un mapping.
  - Los assets referenciados no equivalen a originales/derivados disponibles; readiness y ownership salen del store autorizado, nunca del manifest del browser.
  - Una referencia requerida rota o sin ready bloquea publish. Exclusiones opcionales requieren razón; no se pierden elementos silenciosamente.
- Write-target allowlist: únicamente schema `rooms`; boundary test enumera cualquier tabla nueva y prohíbe writes a otros esquemas de producto.
- Tenant/space boundary: autoridad servidor más reconsulta persistida; todas las relaciones y assets intersectan organización/sala/edición. ID no concede acceso.
- Idempotency/concurrency: mismo lock/expectedRevision/receipt por actor+org+operación+key de TASK-2060; dry-run no muta ni emite eventos. Apply usa la revisión validada y publica audit/outbox en la misma transacción.
- Audit/outbox/history: hechos mínimos versionados, sin texto privado, bytes, tokens ni evidencia completa en logs. Recibo de importación identifica revision y coverage.

### Migration, backfill and rollout

- Migration posture: additive; crear archivo con CLI node-pg-migrate, nunca editar migración aplicada de TASK-2060.
- Default state: API real deniega sin principal Efeonce ID; sólo pruebas locales y herramientas gobernadas con fixtures sintéticas.
- Backfill plan: ninguno sobre ediciones. Un adapter explícito de importación V1→nuevo borrador V2, si se implementa, preserva origen/IDs y muestra pérdidas; no se ejecuta automáticamente.
- Rollback path: mantener lector dual V1/V2 mientras existan ediciones V2; deshabilitar nuevos writes antes de revert. Down sólo en DB de prueba vacía/descartable; restore local probado con datos de ambas versiones.
- External coordination: ninguna provisión o secreto externo para este tramo. Identity/media/storage/rollout conservan sus decisiones separadas.

### Security and access

- Auth/access gate: content.edit para edición, editions.publish para publicar y rooms.read para contenido; validate requiere lectura de borrador y permiso correspondiente. Añadir scopes nuevos sólo si existe diferencia semántica real y actualizar registry/rol/schema SQL/tests en el mismo corte.
- Sensitive data posture: fixtures sintéticas de dos marcas ficticias; sin acceso a datos reales, URLs ejecutables, HTML importado, scripts, crawlers ni datos ajenos.
- Error contract: invalid_input/not_found/conflict/configuration/unavailable sanitizados; CoverageReport tipado para referencias/fuentes/tipos inválidos, sin filtrar IDs ajenos.
- Abuse/rate-limit posture: límites cerrados de número de bloques/relaciones/refs y tamaño del manifest; nada de ejecución de código, fetch remoto o subida de bytes dentro del import.

### Runtime evidence

- Local checks: schemas con fixtures de dos marcas y perfiles independientes/combinado; lint, typecheck, build, pruebas negativas y de compatibilidad.
- DB/runtime checks: migración PG local, append-only V1/V2, import/apply/readback, concurrencia/replay/revocación, rollback ante error y restore mixto.
- Integration checks: harness HTTP→commands→PG y CLI por mismo contrato; rutas reales401; ningún bypass por persona/query/header.
- Reliability signals/logs: resultado/correlationId/operation/revision y errores de coverage; no claims ni notas en logs.
- Production verification sequence: no producción en esta task. Cualquier promoción exige gate independiente y no acredita editor, bytes privados o identidad real.

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

### Slice 1 — Contratos y compatibilidad

- Definir manifest V2 de borrador y snapshot publicado; perfiles creativos/editoriales independientes.
- Bloques media/editorial/diagnostic/plan y relaciones evidence/lineage con IDs estables. Tipos futuros no soportados se reportan, no se descartan.
- Mantener schemas/proyección/readers V1 y elegir versión de forma explícita.

### Slice 2 — Autoría programática y coverage

- Commands canónicos `content.importManifest`, `content.upsertBlock`, `content.arrange`, `content.linkEvidence` y validación `editions.validate`.
- Import preview/dry-run con reporte por elemento; apply transaccional, idempotente y sujeto a expectedRevision.
- Reader de coverage para bloques/relaciones/evidencias/AssetVersionRef y gate de publicación V2 sobre el mismo resultado.

### Slice 3 — Persistencia, transportes y evidencia

- Migración aditiva necesaria, referencias asset bajo ownership Rooms y schemaVersion preservado en snapshots.
- API/CLI por registry único; fixtures ficticias Nómada y una segunda marca, en creativo, SEO/AEO y combinado.
- Pruebas de compatibility, tenants, incompletitud, coverage, replay/conflict y restore antes de cierre.

## Out of Scope

- Upload de bytes, originales/derivados, worker Sharp/FFmpeg/PDF, delivery/tickets o recursos cloud.
- UI de editor, cambios de diseño del demo, login/invitaciones reales, sesiones falsas o sustitución de Efeonce ID.
- Observaciones medidas inventadas, crawling, consultas de pago, ejecución de HTML/JS, scenarios computables y tours completos.
- Modificar snapshots V1 publicados, replicar tablas/cookies de otros productos o completar R03/R05/R08 enteras por este corte.

## Detailed Spec

### Entrada y salida V2

- `DraftManifestV2`: schemaVersion discriminante, room/organization identity, profiles, metadata de marca/sala y colecciones de blocks/evidence/relations/assetRefs. Permite colecciones vacías y campos editoriales aún no resueltos con estado explícito; no impone contenido del perfil no seleccionado.
- `PublishedSnapshotV2`: versión de renderer/contrato, identidad de edición, documento validado y coverage congelado; no permite pendientes requeridos. Hash/sequence/publication instant se asignan en servidor.
- `ContentBlock`: id, type, schemaVersion y payload cerrado para media/editorial/diagnostic/plan. Editorial mantiene fragments con IDs/anclas estables y texto estructurado, sin HTML/JS arbitrario.
- `ContentRelation`: id, kind, source/target tipados y ancla cuando aplica; mismo tenant/sala, cardinalidad e integridad verificadas. Evidence y lineage no se reducen a URLs decorativas.
- `AssetVersionRef`: identidad opaca de asset/version y uso requerido/opcional; no almacena una URL pública como prueba de disponibilidad. Si no hay versión registrada/lista, coverage la marca unresolved/pending. Este corte no concede ready mediante entrada del cliente.
- `CoverageReport`: schemaVersion `rooms.coverage.v1`, valid/publicable, revision y manifestHash evaluados, conteos y resultado por elemento incluido/pendiente/excluido/unsupported. Issues con code/severity/path e itemId/blockId/assetId/relationId según corresponda. Sólo información autorizada; faltante/denegado no delata catálogo ajeno.
- `importManifest`: entrada roomId+expectedRevision+manifest+modo preview/apply; preview no produce cambios. Apply devuelve receipt+revision+coverage. El transporte de preview debe declararse como reader; nunca disfrazar mutation como GET.
- `upsertBlock`: roomId+expectedRevision+block; `arrange`: roomId+expectedRevision+orderedBlockIds exactos, únicos y completos; `linkEvidence`: roomId+expectedRevision+relación tipada. Cada command vuelve a validar el documento resultante.
- `editions.validate`: reader autorizado devuelve coverage de revisión exacta; publish recalcula dentro de la transacción y no confía en un reporte proporcionado por el navegador.
- Exports para transportes: `previewContentImport(input: ReaderInput & {manifest: unknown})` y `validateDraft(input: ReaderInput)` en nuevo `src/server/persistence/content-readers.ts`; POST `/api/v1/rooms/:roomId/content/validate-import` es lectura sin idempotency, GET `/api/v1/rooms/:roomId/validation` valida el borrador. El author DTO lleva draftId, revision, schema/renderVersion y permisos, separado del DTO de audiencia.

### Claims, assets y publicación

Los campos de procedencia conservan fuente/ámbito/fecha/método/cobertura/límite y diferencian hipótesis, simulación y propuesta. La declaración de una fuente no verifica su contenido: el servidor deriva autoridad `author-declared` y estado `unverified`, nunca `verified` o `measured` por input. La ampliación a observación/declaración/medición real requiere contrato y fuente explícitos; no se usa este tramo para convertir fixtures en hechos reales. UI y API no confunden valor ausente/no medido con cero.

Un manifest creativo con medios requeridos pendientes se puede guardar y validar, pero NO publicar. Para publicar una edición media completa hace falta R05 o una versión gestionada y verificable ya existente; un resolver ficticio de tests sólo demuestra policy, no pipeline. Una edición textual completa sin medios requeridos sí puede demostrar publish V2 en este corte. La matriz de pruebas distingue ambos resultados esperados.

### Capability registry y compatibilidad

Las operaciones nacen con schema/authorization/exposición/deuda MCP en el registry del dominio. Reutilizar content.edit evita inventar permisos de pantalla. Si hace falta ampliar capabilities, actualizar conjuntamente enums, role ceilings, access.grant, CHECK y cardinalidad SQL, grants de fixture y negativos; hoy existe límite11 hardcoded en schema y DB.

No renombrar V1 a V2 ni alterar contenido congelado. El reader selecciona schema/proyección por discriminante y devuelve DTO explícito; un consumer no compatible debe reportar versión no soportada, no reinterpretar silenciosamente. Contratos se comparten con los agentes UI/QA antes de implementar.

## Rollout Plan & Risk Matrix

Additive local-first, no production runtime impact. Go de continuación y subagentes ya autorizado; código sólo después de registro, ADR y task-hook del coordinador.

### Slice ordering hard rule

Contratos V2 y compatibility tests → migración/commands/coverage → adapters → evidencia PG/restore. UI/media posteriores consumen el contrato; no introducirlos mientras se define.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reinterpretar snapshot viejo | Readers/ediciones | medium | discriminante y hashes V1 inmutables | compatibility test failure |
| Publicar medios inexistentes | Coverage/publicación | high | resolver server-side y gate required-ready | asset_unresolved |
| Pérdida al importar | Blocks/relations | medium | reporte por elemento y exclusión razonada | unsupported / missing_reference |
| Mezclar tenants o claims | Authority/evidence | medium | intersección persistida y procedencia explícita | not_found / claim_validation_failed |
| UI depende de documento completo | Borrador/editor futuro | high | draft y published schemas separados | fixture incompleta rechazada |

### Feature flags / cutover

Sin cutover público: nuevo discriminante V2 aditivo y rutas reales conservan identidad fail-closed. Se preserva demo V1. No activar modos de autenticación sintética en rutas desplegadas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Schema/contratos | deshabilitar nuevos writes, mantener lector dual; down sólo DB descartable | medir al verificar | sí, preservando V2 ya guardado |
| Commands/adapters | revert de código propio compatible con datos existentes | medir al verificar | sí |
| Publicaciones nuevas | conservar snapshot; corrección por nueva edición | no se sobrescribe historia | compensación |

### Production verification sequence

No ejecutar release/provisión desde esta task. Antes de una promoción futura: verificar contrato y migración en entorno autorizado, preservar lectura V1/V2, identidad real, canary autenticado y recuperación DB+assets cuando existan medios.

### Out-of-band coordination required

Efeonce ID/RP y storage/media quedan en owners separados. Para este corte local sólo se coordina contrato con el padre (transportes/ADR) y QA; no se requiere acceso externo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] DraftManifestV2 permite sala vacía/incompleta y perfiles creativo/SEO-AEO independientes sin contenido inventado.
- [ ] Bloques/relaciones/evidence/AssetVersionRef tienen schemas cerrados, IDs/anclas estables y procedencia explícita; tipos desconocidos se reportan sin pérdida silenciosa.
- [ ] Dos marcas ficticias y creativo-only/editorial-only/combinado ejercitan importación/readback y resultados de coverage esperados.
- [ ] Import preview no muta; apply/upsert/arrange/linkEvidence respetan idempotencia, expectedRevision y autoridad persistida, con audit/outbox atómicos.
- [ ] Publicar V2 recalcula coverage y rechaza referencias rotas, assets requeridos sin ready y exclusiones sin razón; publish textual completo demuestra el camino positivo sin fingir pipeline.
- [ ] Lector V1 conserva exactamente snapshots/hashes existentes; lector/proyección V2 es explícito y no filtra notas, grants ni evidencias no autorizadas.
- [ ] Migración aditiva creada por CLI, destinos de escritura propios, down/up en fixture y restore mixto V1/V2 verificados; sin modificar migración aplicada ni snapshots históricos.
- [ ] API/CLI consumen primitives/registry compartidos; capabilities y SQL permanecen en paridad, y las rutas reales siguen denegando sin Efeonce ID.
- [ ] Pruebas negativas de tenants, roles, expiry/revoke, tamaño/payload, unsupported, lost updates, replay y rollback pasan contra PG real.
- [ ] Lint, typecheck, tests y build pasan; docs técnicas/funcionales/manuales registran qué quedó implementado y qué permanece en R04/R05/R08/R13.

## Verification

- Runtime: `pnpm verify`, tests de contenido/dominio y HTTP/CLI, PG real local55432.
- DB: migración creada por `pnpm exec node-pg-migrate create`, up/down/up descartable, readback de edición y `pnpm db:recovery` ampliado para versiones mixtas.
- Greenhouse: `pnpm task:lint --task TASK-2062`, `pnpm ops:lint --changed`, closure documental y context gate al cierre del coordinador.
- No GVC en esta task sin UI visible; el consumer UI se registra por separado con su contrato y evidencia.

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados con aceptación y evidencia reales.
- [ ] README/registry de tasks y EPIC-052 actualizados por el coordinador.
- [ ] Handoff/changelog y ADR/arquitectura reflejan contrato vigente y límites.
- [ ] Manual y documentación funcional actualizados; reporte claro de medios/identidad pendientes.
- [ ] Impacto cruzado sobre lectores V1, demo y futuros media/editor verificado.

## Follow-ups

- R05: uploads, AssetVersion gestionadas, originales/derivados, jobs y delivery privado; no instalar SDK ni aprovisionar cloud por esta task.
- R08: editor visible y preview usando el mismo renderer, sobre este contrato; requiere UX/GVC aparte.
- R04: RP Efeonce ID y autoridad real; depende de TASK-1834 y su rollout, no de un bypass local.
- R13: transporte MCP y equivalencia durable; owner Platform, retirada de deuda al registrar provider y certificar el ciclo.
