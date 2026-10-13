# TASK-1905 — verificación local

**Actualización posterior:** el operador autorizó el release de Studio. [Evidencia productiva y pendientes actuales](TASK-1905-release-2026-10-04.md). Las menciones de ausencia de deploy abajo describen el checkpoint local anterior.

**Fecha:** 2026-10-04. **Alcance:** código compartido local, tests unitarios y PostgreSQL local. **Estado:** implementación local verificada: check global Studio, suite PostgreSQL completa y build aprobados; Greenhouse typecheck aprobado con heap de 12 GB. Commits locales Studio `5036d94` y Greenhouse `7d5dc100f`; sin push, CI, deploy ni canary remoto. Documentación compartida permanece en el worktree para preservar WIP ajeno.

## Evidencia ejecutada

| Superficie | Resultado observado |
| --- | --- |
| Greenhouse capability, runtime y coverage | 33 tests pasan; admin/operations permitidos, resto de roles y combinación account+designer denegados; `delete`/`all` no autorizados; primaryRole sin rol efectivo no concede acceso. |
| Studio audiencias, customer model, writer boundaries, catálogo, upload y media | 73 tests focales pasan en seis archivos. |
| Audiencias con PostgreSQL local | Crear, replay idempotente, actualizar, fijar versión ICP, conservar audiencia pendiente y eliminar; constraints diferidas forzadas antes de rollback. Pasa. |
| Catálogo y plan con PostgreSQL local | Ambos suites pasan después de preparar catálogo/versiones referenciadas como fixture; `SET CONSTRAINTS ALL IMMEDIATE` antes del rollback verifica FKs diferidas. |
| Upload/media con PostgreSQL local | Suites de integración pasan. |
| Studio `pnpm check` global (readback coordinador) | PASS: gates, lint, manifest, typecheck, 243 tests Vitest + 7 tests de gates. 10 tests DB omitidos en entorno normal; posteriormente ejecutados dentro de la suite completa con PostgreSQL aislado descrita abajo. |
| Suite completa de dominio con PostgreSQL local (readback coordinador) | PASS: 34 archivos, 216 tests, cero skips; carriles IT, CHANNEL, CONCURRENCY y SEED habilitados con bases aisladas. Este conteo corresponde a otra invocación y no se suma al check global anterior. |
| Studio build | PASS local, informado por coordinador. |
| Seed CLI local | 52 canales publicados; replay sin cambios. Digest final `3a8939184b65d3aecdf66bdc3dfaa87a86363a1943f55ef0c3fd68f7581ee58d`. No es el hash del manifiesto MCP. |
| Backfill CLI local | Dry-run: 0 escrituras; apply: 1; replay: 0; revert: 1. Tres ops_run terminados succeeded. |
| UI real local | Desktop 1440 px y móvil 390 px; CTA correcto, cero errores reportados. Capturas en `.captures/TASK-1905-channel-attention-local` del repo Greenhouse. |
| Manifest Studio | API 1.6.0, 59 tools; generado y verificado localmente. No equivale a gateway sincronizado. |
| Contratos y calidad focal | Typecheck contracts, lint de archivos propios y diff check pasan. Greenhouse typecheck: primer intento agotó heap por defecto de 4 GB; retry con 12 GB PASS (exit 0). |

Archivos de pruebas Studio: `packages/domain/src/customer-model/customer-model.test.ts`, `commands/audience.test.ts`, `commands/audience.integration.test.ts`, `commands/channel-write-boundaries.test.ts`, `commands/catalog.test.ts`, `commands/catalog.integration.test.ts`, `commands/plan.integration.test.ts`, `media/upload.test.ts`, `media/upload.integration.test.ts`, `media/media.test.ts`, `media/media.integration.test.ts`. Prefijar los paths abreviados por `packages/domain/src/`. En Greenhouse: `src/lib/entitlements/marketing-studio-catalog.test.ts` más suites runtime/capability-grant-coverage.

## Casos de frontera comprobados

- Organización no visible se rechaza antes del upstream; modelos de otra organización/versión, draft o payload inválido no sirven para validar referencias.
- Cache separada por organización/versión, éxito/fallo con TTL distintos y limpieza al apagar flag; 404 upstream preserva el contrato `not_entitled`.
- ICP pendiente explícito no consulta upstream; referencia real con reader disabled/unavailable falla cerrada.
- Writer de brief preserva literal solicitado y guarda sólo claves conocidas; derechos preservan canales originales y metadata canónica, incluidos upload y CLI heredada.
- Catálogo inexistente en enforce impide escrituras; warn conserva finding y metadata sin atribuir una clave desconocida al catálogo.
- Cambio de versión ICP reporta incompatibilidades sin reescribir audiencias; remove no borra referencias activas.

La revisión independiente detectó tres puntos en commands de plan (metadata de dry-run, dimensiones de asset en validación de anuncios y copy enlazado bajo otro canal). Correcciones comprobadas después en source y cubiertas por `channels/validator.integration.test.ts`: metadata del dry-run, rechazo de copy demasiado largo para el canal del anuncio y asset de 51 bytes contra máximo de 50 con finding y actualValue correctos. El coordinador confirmó el PASS con PostgreSQL.

La última revisión independiente confirmó 15/15 operaciones con tool, tier, ruta y método; las nueve escrituras están en el registro de commands. Encontró un caso de backfill que podía reemplazar un snapshot deduplicado tras remapear alias y una guarda incompleta para operadores limitados a una organización. Ambos fixes están presentes: todo snapshot versionado con claves no vacías se conserva y el operador con `onlyOrganizationId` se deniega antes de consultar/escribir. Los arrays parcialmente resueltos requieren revalidación explícita.

## Pendientes que impiden declarar operación completa

| Componente | Pendiente / límite |
| --- | --- |
| Studio schema | Dos migraciones aplicadas en PostgreSQL local y preparadas para release atómico; aplicación en staging/producción no ejecutada ni verificada en esta sesión. |
| Catálogo | Seed y ciclo backfill probados en bases locales aisladas. Publicación e inventario/backfill del legacy productivo no ejecutados. No se afirma catálogo productivo completo. |
| Greenhouse capability | Migración `docs/tasks/pending-migrations/TASK-1905-marketing-studio-catalog-capability.sql.pending` parqueada fuera de migrations/, no aplicada. Owner: operador de release Greenhouse; reactivar con `pnpm migrate:create` y timestamp nuevo antes del rollout. Tests de grants no prueban intercambio de identidad en runtime. |
| Flags | Default del código `warn`; ICP desactivado. Valores desplegados no consultados para este slice. |
| ICP | Adapter inyectable preparado para TASK-1906; reader por defecto no provisionado. TASK-1906 + TASK-1892 siguen como dependencias de la referencia real. |
| Gateway | Checkout ajeno `feat/task-1921-brand-render`, HEAD observado `029272b`; main local `8ff029d`, origin/main `454d80e`. Sólo inspección, sin edición/sync/deploy. Reconciliar checkout autorizado y consumir manifiesto generado, nunca editarlo a mano. |
| MCP writes | TASK-2003 corre en paralelo; sin evidencia nueva de identidad delegada/federación T1. TASK-1899 retirada. T2 conserva CLI de operador. |
| Cierre global | Check global, integración PG completa, build y UI local aprobados. Greenhouse typecheck PASS. Falta canary con la conexión MCP real del operador. Manifiesto SHA-256 `2302c683cd1eee0d96d89f85b72ded73a50ff30152c8f0f34fa9279b739390e6`. |

## Reproducción y criterio de aceptación

Usar la configuración local de tests del repo Studio con PostgreSQL de pruebas; no ejecutar integración contra producción. Correr las suites focales con `pnpm --filter @studio/domain exec vitest run <paths>` y los gates del repo. Las pruebas transaccionales deben forzar constraints diferidas antes de rollback: un test que hace rollback sin ese paso puede ocultar una referencia inválida. No confundir un seed fixture con el catálogo sembrado en un entorno operativo.

[Contrato funcional](../../documentation/marketing-studio/catalogo-canales-y-referencias-icp.md) · [Manual](../../manual-de-uso/marketing-studio/gobernar-catalogo-canales.md) · [Plan](../../tasks/plans/TASK-1905-plan.md).

## Cierre de documentación y estado Git

- `task:lint --task TASK-1905`: 0 errores / 0 advertencias. `skills:mirrors`: PASS.
- `ops:lint --changed`: PASS con 13 warnings históricos de epics ajenos.
- Auditoría de cierre con pathspec incluyendo task/plan/dossier/manual/contrato/Handoff/README/registry: 0 warnings.
- `docs:context-check:strict`: FAIL por presupuestos globales ya excedidos al iniciar (Handoff ahora ~12107 tokens,
  tope12000; changelog61 entradas, tope60). Se preserva WIP compartido; no se rotó documentación ajena.
- Studio código comprometido y árbol limpio tras verificación; Greenhouse commit sólo capability, grants, coverage
  y SQL `.pending`. Docs/skills/estado formal actualizados quedan sin stage por solapamiento con WIP previo.
- TASK-1905 sigue in-progress: implementación local ≠ rollout/canary. UI admin TASK-1912 fuera del alcance.

## Auditoría complementaria de los entregables documentales

El manual servido a agentes y su `appliesTo` cubren las 15 operaciones nuevas; las 27 referencias totales
coinciden con el manifiesto Studio 1.6.0. El artefacto generado cambia sólo la entrada marketing-studio.
Las 34 pruebas del manifiesto pasan, incluido el control que evita publicar IDs de tareas internas.
`mcp:skills:check`, lint focal, `skills:mirrors` y auditoría estática de flags pasan.

La skill de planificación distingue el inventario histórico de CMP-001 del catálogo versionado y retira
proposalDigest como requisito vigente. El registro de flags contiene ambos flags de Studio con estado local,
sin atribuir valores desplegados. Arquitectura §3.1 y project_context enlazan el contrato y estado operativo.
El manual y sus referencias deben viajar con la sincronización del manifiesto del provider en el gateway;
no desplegar aisladamente un `appliesTo` que el manifiesto federado aún no conoce.

Commit adicional Greenhouse `6aa1516ad`: manual MCP/manifest generado, skill de planificación en ambos
espejos, ledger de flags y router project_context. Chequeo de cierre documental del alcance revisado:
0 advertencias. El resto de documentos compartidos mantiene su WIP en el worktree. No se hizo push.

## Auditoría final de criterios abiertos (2026-10-04)

Readback actual: Studio sigue limpio en `5036d94`; Greenhouse HEAD `6aa1516ad`; gateway limpio en
`feat/task-1921-brand-render` / `029272b`. Su guard `marketing-studio-tool-parity.ts` sigue rechazando toda
write con `write_tool_without_scope_class`. TASK-2003, TASK-1906 y TASK-1892 conservan Lifecycle to-do y
Status real de diseño. No hay proceso de integración o despliegue en curso confirmado en esta sesión.

| Criterio abierto | Evidencia local y condición para resolverlo |
| --- | --- |
| UTM/GA4 para todos los canales | `channels/ga4.test.ts` y `seed.test.ts` verifican tracking y rechazan atribución inventada. La decisión vigente permite null con `unresolvedReason` cuando falta aparición/inventario. No se acredita cobertura productiva universal con el seed local. |
| Lectura API y MCP por versión | Reader y manifiesto implementados; falta llamada al provider desplegado y a la sesión MCP real. |
| Todas las operaciones nuevas por MCP | Manifiesto local 1.6.0 y 59 tools; el gateway actual no admite writes. T1 depende de TASK-2003; T2 permanece por operador según decisión vigente. |
| T2 con proposalDigest | Criterio histórico retirado por decisión explícita del encabezado. No es un bloqueo ni se implementará sin nueva decisión. |
| Catálogo publicado en staging/production | Sólo publicación local probada. Requiere release autorizado, migraciones, seed y readback remoto. |
| Snapshots de todos los writers | Commands/importadores y tests locales cubiertos. En warn, desconocido conserva raw y clave null con finding; no se fuerza una clave falsa para satisfacer el texto histórico. Falta verificación de writers desplegados. |
| channel_unmapped productivo | No se inventaría producción ni se revisó su mapa de aliases en esta ejecución. Requiere inventario de release y revisión humana antes de apply. |
| Capability en registry y grants | Código, coverage y SQL pending presentes; falta aplicación del SQL y readback de grants efectivos. |
| Allow/deny y actor humano por MCP | Depende de canje exacto y federación de TASK-2003, seguidos de canary real. Tests locales no prueban esos servicios. |
| Gateway minor/surface-baseline desplegados | Requiere checkout de integración y sincronización del artefacto junto con autoridad T1, release y canary. No se modifica la rama de TASK-1921. |
| ICP real | Adapter local probado; TASK-1906 y TASK-1892 deben proveer modelo y consumer reales antes de activar el flag. |

La condición de cierre pendiente se confirmó en la implementación inicial y en las dos continuaciones de
auditoría. El trabajo local autorizado quedó preparado; avanzar ahora requiere que esas dependencias estén
implementadas y autorización de release para las mutaciones remotas. No se declara la task complete.


## Readout posterior: release Studio y cliente CLI (2026-10-04)

Este apéndice conserva el cuerpo anterior como evidencia de la fase local. Sus menciones a release pendiente o
TypeScript en curso ya no son el estado actual para los componentes verificados a continuación. Fuentes:
[release autorizado](TASK-1905-release-2026-10-04.md), [checks](TASK-1905-release-2026-10-04-checks.json) y
[auditoría CLI](2026-10-04-studio-api-cli.md); en esta actualización documental no se hizo ninguna escritura runtime.

- Greenhouse TypeScript con heap de 12 GB: PASS exit 0, confirmado por coordinador; el intento anterior de 4 GB OOM se conserva.
  Check Studio final: 243 Vitest PASS (206 domain/10 DB omitidos en esa invocación), 7 gates PASS. La suite PG aislada separada
  fue 34 archivos/216 tests sin skips; no sumar conteos de invocaciones distintas. Build PASS.
- Studio `main 74073de1188f` desplegado: Vercel Ready, API 1.6.0, 59 tools; 64 operaciones HTTP descubiertas después por CLI.
  ManifestHash `2302c683cd1eee0d96d89f85b72ded73a50ff30152c8f0f34fa9279b739390e6`.
- Ambas migraciones Studio y seed v1/52 canales aplicados en staging/prod. Especificaciones publicadas rechazan UPDATE
  con 23514 en ambas bases. Worker staging 00006-p8q/prod 00004-j4h, Ready 100%, `/health` 200, misma imagen/digest.
- Flags productivos web/worker: warn, ICP false. Canary copy positivo/warnings/replay en sandbox CMP-900 staging;
  producción health/catálogo/atención 200, org ajena 404, bearer inválido 401, service catalog write 403 sin write, 44/44 thumbs 200.
- Backfill productivo sólo dry-run: 134 unmapped; cinco aliases con owner efeonce_operations. Sin map/apply de legacy.
  Capability Greenhouse pendiente, gateway sin nuevo release/federación y consumidor ICP real 1906/1892 pendiente.
- CLI API-only Greenhouse local: 18 tests/lint PASS; doctor/discovery de 59 tools/64 operaciones, catálogo de 52 canales, lectura asset autenticada y
  upload dry-run real sin ticket/bytes. Upload/download y writes aplicadas sólo con servidor local controlado; sin carga
  aplicada productiva. No release Greenhouse, cambios de scopes ni habilitación MCP por entregar este cliente.
- Docsclosure focal 0 warnings, tasklint 0/0 y opslint PASS con 13 warnings históricos reportados por coordinador. El gate
  docs:context-check:strict permaneció fallido por budgets de WIP compartido; la auditoría CLI posterior registra 3 warnings
  (project_context/Handoff/changelog). No se rotó ni descartó ese WIP para fabricar un gate verde.

TASK-1905 permanece in-progress. TASK-1899 retirada no es prerequisito de API/CLI/UI; T1 MCP corresponde a TASK-2003
paralela y no se declara operativa con el manifiesto. El servidor conserva autoridad global/organizacional y T2.

Capability Greenhouse: código en `src/config/entitlements-catalog.ts`, grants en `src/lib/entitlements/runtime.ts`,
create/update sólo admin/operations y 33 tests PASS. SQL parqueado en
`docs/tasks/pending-migrations/TASK-1905-marketing-studio-catalog-capability.sql.pending`; registry/canje efectivo
productivo y release Greenhouse no verificados por publicar Studio ni por la CLI. Account/designer no reciben el grant.
