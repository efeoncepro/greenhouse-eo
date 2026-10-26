# Plan — TASK-2062 Rooms: autoría de contenido versionado

> Estado posterior26Oct: consultar la [task vigente](../complete/TASK-2062-rooms-versioned-content-authoring.md) y sus criterios/evidencias. Este plan conserva la secuencia e hipótesis de su fecha; sus pendientes históricos no sustituyen el estado actual. Auth retenido en PR; interfaz Claude Design y activación general separadas.

## Discovery summary

HEAD Rooms bd4b802 y Greenhouse538dbdd81 limpios al inicio. V1 conserva contratos/can y PostgreSQL local verificados; el schema obliga contenido creativo/editorial completo y tres artes sintéticas. No hay upload/AssetVersion listo ni editor genérico. Esto exige contenido versionado, no un formulario que fabrique datos. Identity depende de TASK-1834; no bloquea dominio/test harness, sí usuarios reales. El objetivo completo de EPIC-052 permanece activo, sin reducirlo a este corte.

## Access model

- routeGroups/views de Greenhouse: no afectados; Rooms es runtime independiente.
- entitlements: content.edit para commands/readers de borrador; editions.publish independiente. Techo de roles y grants persistidos de TASK-2060.
- startup policy: resolvePrincipal sigue cerrado; no modo demo que conceda writes.
- DTOs: V2 explícito, proyección de audiencia elimina evidencia y relaciones restringidas, no sólo controles UI.

## Architecture decision

ADR existente Rooms, delta «contenido versionado para autoría» de2026-10-25; indexado en DECISIONS_INDEX. Versiones preservan snapshots V1. Nueva estructura sólo en borradores/snapshots V2; no mover source of truth a otro runtime. El goal humano vigente y la instrucción de continuar autorizan este trabajo y subagentes; no se repite una confirmación para decisiones de implementación dentro del alcance acordado.

## Backend/data contract

DraftManifestV2 permite incompletitud; PublicationSnapshotV2 requiere coverage válido recalculado dentro de la transacción. Bloques media/editorial/diagnostic/plan, evidencia y relaciones tipadas, IDs estables, límites explícitos. AssetVersionRef no incorpora ready ni URL como autoridad; ausencia de registro gestionado bloquea publicación. Claims son declaraciones del autor, no verificación remota. Tipos futuros unsupported se reportan y apply es atómico, nunca descarta datos para aparentar éxito.

Migración creada por CLI, preserva filas/hash V1. Readers duales y guards comunes también para rooms.updateDraft/publish. Idempotencia, expectedRevision, tenant/expiry/revocation, audit/outbox existentes. Rollback mantiene lector V2; down sólo fixture descartable. Sin provisionamiento, secretos, cambios al issuer, DB cloud ni promoción desde este corte.

## Skills

- software-architect-2026 + overlay: frontera, versión, migration y assurance.
- greenhouse-task-planner: registro canónico y split backend/UI.
- Product Design/AXIS: revisión de necesidades del consumidor por rooms_ui; no JSX ni UI nueva aquí.
- QA independiente: matrix de acceso, coverage, compatibilidad, rollback y transportes.

## Subagent strategy

Fork autorizado por el usuario, reutilizando agentes existentes:

- rooms_domain: src/domain/content-*.ts, persistence-contracts.ts, commands/execute.ts, persistence/store/readers/content-readers.ts, server/readers.ts si necesario, migración CLI. Comparte schemas y exports antes de tests.
- rooms_qa: tests/content-v2*.test.ts (dominio y PG), fixtures de prueba, readback/negativos. Sin editar implementación.
- rooms_ui: discovery read-only del consumidor completado; revisión de DTO/errores/coverage ya incorporada. Sin implementación visual en esta task.
- raíz: src/server/http/{api,runtime}.ts, rutas API nuevas, scripts/rooms.ts, pruebas tests/transport-content*.test.ts, package test inclusion, integración, docs/registro/plan/ADR y commits exactos.

## Execution order

1. Registrar task, ADR y este plan; hook TASK-2062 --subagents, lint cero findings.
2. Dominio congela DraftManifestV2/coverage y funciones previewContentImport(ReaderInput & {manifest:unknown}), validateDraft(ReaderInput), en persistence/content-readers.ts.
3. En paralelo: commands/store/migración; raíz adapta HTTPPOST /rooms/[id]/content/validate-import (read-only), GET /rooms/[id]/validation y CLI validate-import/validate; QA prepara negativos por contratos.
4. Pruebas PG reales: dos marcas/perfiles, incompletitud, edición/orden/relaciones, publicación textual positiva y medios unresolved negativos, compatibilidad/replay/concurrencia/revocación/faultrollback.
5. Lint/typecheck/build, HTTP/CLI readback, restore mixto; verificar API no autenticada y demoV1 sin regresión. No GVC repetida si no cambian píxeles; sí smoke render/surface cuando el build lo requiera.
6. Actualizar Status real/criterios/evidencia/manuales; task sólo complete si todo su contrato local está demostrado. EPIC mantiene medios/identidad/editor/presentación/colaboración/MCP y piloto pendientes.

## Files to create

- Runtime: domain/content-*.ts, server/persistence/content-readers.ts, migración generada y rutas API validation/validate-import, tests/content-v2*.test.ts y transport-content*.test.ts.
- Greenhouse: task2062, este plan y auditoría de resultados al verificar.

## Files to modify

Runtime contracts/store/commands/readers, HTTP/runtime, scripts/rooms.ts y package test glob. Greenhouse ADR/API/arquitectura/epic/índices, documentación funcional/manual/Handoff/changelog al cierre.

## Files to delete

Ninguno. Snapshots y migración aplicada V1 se conservan.

## Risk flags

Publicar por una ruta antigua podría evadir coverage; toda entrada desemboca en guard común. Importar ready/provenance no otorga autoridad. Un reader que no entienda V2 debe fallar explícitamente, nunca convertirlo a V1 descartando bloques. Dos tareas no editan el mismo archivo simultáneamente.

## Open questions

Ninguna bloquea este corte. R05 fijará storage/bytes/derivados y la UI R08 consumirá preview de revisión guardada mediante proyección explícita. Efeonce ID requiere su owner y rollout; no se sustituye con tokens de fixtures.
