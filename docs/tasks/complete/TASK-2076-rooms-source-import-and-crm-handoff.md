# TASK-2076 — Rooms: importación X-ray y referencia/handoff CRM

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Backend impact: `integration`
- Epic: `EPIC-052`
- Status real: `2026-10-29: Mapping nativo X-ray, metadata inmutable, referencia CRM y handoff pending locales completos;16focales y gate conjunto337PASS/0skip, fresh13/43, ACL/rollback/restore PG16/18 PASS. Puertos externos OFF: conector fuente/CRM y writer real conservan certificación posterior; sin UI ni producción.`
- Rank: `wip`
- Domain: `platform|data`
- Blocked by: `none`
- Branch: `Rooms codex/rooms-design-integration; Greenhouse develop; checkout compartido`

## Summary

Importar snapshots X-ray autorizados a bloques nativos con mapping versionado, pérdidas visibles y
aceptación explícita; conservar referencias HubSpot y solicitudes de handoff durables sin enviar nada.

## Why This Task Exists

EPIC-052 R14 requiere mapping de exportaciones reales y fallo CRM tolerado. Un iframe no acredita
conversión nativa; una referencia o evento pendiente tampoco acredita sincronización ni entrega CRM.

## Goal

- Mapear el contrato real XraySharedResponse1.0/AXIS0.1.0–0.2.0, con coverage y exclusiones.
- Aplicar mediante content.importManifest canónico y autoridad/CAS/idempotencia actuales.
- Persistir referencia CRM tipada y handoff pendiente con audit/outbox; default sin conectores externos.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_SOURCE_IMPORT_AND_CRM_HANDOFF_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`

## Dependencies & Impact

### Depends on

- TASK-2060/2062: transacciones, permisos y autoría programática;2074/2075: cadena migratoria9/10.

### Blocks / Impacts

- R14 y futuros conectores; Claude Design puede consumir contratos sin abrir producción.

### Files owned

- `../efeonce-rooms/src/domain/integration-contracts.ts`
- `../efeonce-rooms/src/server/integrations/`
- `../efeonce-rooms/migrations/1793252000000_rooms-integrations.sql`
- `../efeonce-rooms/tests/integrations*.test.ts`
- ADR dedicado y esta task; root integra HTTP/CLI/SDK y cierre documental común.

## Current Repo State

> Snapshot del discovery inicial; el resultado vigente y los límites están en Status real y el cierre29Oct.

### Already exists

- Runtime Rooms con manifestV3, import canónico, ACL persistida, CAS/receipts y outbox.
- Fuente real: `src/lib/aeo-xray/types.ts` y contrato AXIS en Greenhouse/Think.

### Gap

- No adapter ni entidad de referencia/handoff; puertos reales de autoridad fuente no conectados.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-rooms/src/domain` y `efeonce-rooms/src/server/integrations`
- Future candidate home: `remain-shared`
- Boundary: factory de servicios, puertos server-owned; sin acceso directo a tablas de Greenhouse.
- Server/browser split: DTOs/schemas browser-safe; fuente, autoridad, SQL y mapping server-only.
- Build impact: none; pg/zod existentes, sin deployable ni dependencias nuevas.
- Extraction blocker: atomicidad con can, revisión, contenido y outbox propios.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `rooms.source_imports`, `rooms.crm_links`, `rooms.crm_handoffs`; contenido sigue en comando canónico.
- Consumidores afectados: API/CLI/SDK/MCP por adapters root; sin UI en esta task.
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: content.importManifest, XraySharedResponse1.0/AxisAeoXrayManifest.
- Contrato nuevo o modificado: integrations.previewXrayImport/get/importXray/linkCrm/requestHandoff.
- Backward compatibility: additive; V1/V2/V3 y ediciones históricas permanecen intactos.
- Full API parity: primitives y catálogo compartidos; adapters del root, no lógica exclusiva UI.

### Data model and invariants

- Entidades/tablas/views afectadas: source_imports, crm_links, crm_handoffs; grants CHECK22→24.
- Invariantes que no se pueden romper:
  - Fuente reautoriza cada lectura; organizationId del cliente no amplía autoridad.
  - Claims verificados/medidos de origen no se vuelven certificaciones de Rooms.
  - Handoff pending no prueba envío/recepción ni modifica pipeline HubSpot.
- Write-target allowlist: tablas Rooms propias, comando de contenido canónico, ningún write externo.
- Tenant/space boundary: can integrations.read/manage interno por room y loadAuthority actual.
- Idempotency/concurrency: lock de organización, CAS y receipt por actor/operación/key/hash.
- Audit/outbox/history: misma transacción, metadata sin cuerpos ni tokens, handoff inmutable.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: ports externos OFF, sin autogrants ni producción.
- Backfill plan: ninguno.
- Rollback path: down vacío sin grants nuevos; con datos conservar tablas y revertir consumidor.
- External coordination: configurar conectores y certificar fuente/CRM real requiere corte posterior.

### Security and access

- Auth/access gate: interno con integrations.manage y rooms.read; import añade content.edit/evidence.read.
- Sensitive data posture: nunca URLs secretas/tokens/cuerpos en audit/outbox; refs CRM mínimas.
- Error contract: RoomsError canónico; unsupported/source_unavailable explícitos sin fallback.
- Abuse/rate-limit posture: fuente1MB, manifest límites existentes, handoffs100/room, CAS y páginas acotadas.

### Runtime evidence

- Local checks: lint/types y pruebas mapper/ports/PG; gate global root.
- DB/runtime checks: migraciones fresh/down vacío y no vacío, ACL, aislamiento, replay/CAS.
- Integration checks: puertos fake explícitos sólo tests; defaults OFF verificados.
- Reliability signals/logs: handoff pending/outbox enumerable, sin inferencias de intención comercial.
- Production verification sequence: no production runtime impact; release/connector posteriores autorizados.

### Acceptance criteria additions

- [x] Fuente, mapping, pérdidas y autoridad documentados y versionados en ADR y contratos; inspección Think/Greenhouse y resolver real fixture-minimal READY.
- [x] Migración/rollback y denegaciones probados localmente. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Evidencia distingue puertos de prueba y conectores reales desactivados: fábrica inyectada en pruebas, singleton sin connectors.

<!-- ZONE 2 — PLAN MODE -->

Plan local acordado con integrador: contrato fuente real → preview/mapa → import canónico atómico →
referencia/handoff durable con puertos OFF → pruebas PG y adapters compartidos. Sin UI ni producción.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

Mapping nativo de texto/diagnóstico/evidencia; preview y aplicación canónica; referencias HubSpot;
handoff pendiente durable, sin consumidor outbound que envíe comunicaciones ni escrituras externas.

## Out of Scope

UI, Auth, correo, crawling/scoring, rasterización, iframe como conversión, sincronización CRM real,
credenciales proveedor, despliegue/flags y aceptación del perfil X-ray completo.

## Detailed Spec

El ADR dedicado fija contratos y límites. La autorización fuente es independiente de claims y de
permisos Rooms. Exclusiones requieren aceptación exacta; fuente cambiada invalida previewHash.

## Rollout Plan & Risk Matrix

Corte additive local. Riesgos: fuente revocada→revalidación; pérdida semántica→mapping/coverage;
CRM indisponible→edición independiente y handoff pending. Sin production runtime impact.

### Slice ordering hard rule

Contratos/DDL → mapping/servicios → adapters root → pruebas PG/transport → recibo.

### Feature flags / cutover

Ninguno nuevo: puertos no configurados por defecto, sin env que los habilite ni autogrants.

### Rollback plan per slice

Conservar datos y retirar consumidor; down sólo vacío y sin grants nuevos.

### Production verification sequence

No producción. Configuración futura exige autoridad fuente, credenciales y gates propios.

### Out-of-band coordination required

Ninguna llamada externa en este corte; owners X-ray/HubSpot deciden connectors reales posteriores.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] Contrato reconocido mapea contenido nativo y declara campos no convertibles:7tests mapper/schemas PASS y Think fixture-minimal con resolver AXIS real READY (9bloques/2evidencias/3relaciones/5exclusiones).
- [x] Cambio/revocación de fuente, tenant cruzado y claims/status alterados fallan sin writes: pruebas source drift/denied/expired/crossTenant y revocación de Rooms durante lectura.
- [x] Aplicación usa content.importManifest con CAS/receipt y permiso actual; fallo forzado en receipt alias revierte contenido/audit/outbox/source_imports juntos.
- [x] Referencia CRM verifica portal/object y owner activo antes de persistir; puertos read-only fake explícitos, denegaciones cruzadas y expiry PASS.
- [x] Handoff fija edición/hash/referencia; audit/outbox y replay no duplican; fila inmutable y cambio posterior de link no altera handoff.
- [x] Puertos ausentes no llaman red ni generan fixture de éxito: defaultOFF con conteos durables sin cambios PASS.
- [x] Migración, rollback, ACL, lint/types y pruebas locales pasan. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).

## Verification

- Recibos privados runtime: `.captures/rooms-backend-qa-20261029/integrations-tests.tap` (16PASS/0skip),
  `integrations-real-source.json` (source contrato Think real, lectura sin red). SQL temporal iterativo,
  no recibo freshDDL final: source_imports se añadió mediante patch explícito tras la primera aplicación11.
- Lint focal PASS; typecheck global más reciente bloqueado por WIP multimedia fuera de2076, sin errores integration. Revisión freshDDL y gate global por root.
- No conector real X-ray/CRM configurado; no descarga, writer outbound, correo, flags ni producción.

- Pruebas focales integrations con PostgreSQL efímero; lint/types.
- `pnpm task:lint --task TASK-2076`; cierre documental/adapters root.


## Closing Protocol

- [x] Lifecycle y Status real actualizados con evidencia local.
- [x] README/registry sincronizados; Handoff/changelog/skills por root.
- [x] Impacto EPIC-052 y contrato Claude Design registrado.

## Follow-ups

Conectores reales de fuente/CRM y entrega outbound permanecen desactivados hasta certificación propia.

## Cierre backend local — 2026-10-29

[Corte consolidado](../../audits/rooms/2026-10-29-backend-local-completion.md):337/337tests,0fallos/0skip;
lint/negativo/types/build,13migraciones/43tablas, restore mixtoPG16/18 y cinco guards poblados PASS.
[Contrato Claude Design](../../documentation/rooms/backend-api-for-claude-design.md), manual y skill espejo
registran lo construido y los gates externos. El cierre sólo cubre el alcance local declarado; no UI,
release, conectores reales ni activación productiva. Los deltas anteriores conservan evidencia por fecha.
