# EPIC-057 — revisión del programa contra el código, 2026-11-06

## Alcance y método

Pedido del operador: revisar EPIC-057, su ADR y sus tasks, y contrastarlos con el código. Seis revisores de sólo
lectura cubrieron contexto/autoridad, routing, Finance, alta y readers, historia/operación, y laboratorio más
integridad documental. Los hallazgos críticos se reverificaron en el código antes de registrarlos. Base: `develop`
en `7d717c4ca3`. No se abrió base de datos real, no se ejecutó producción y no se tocó la historia de Diseño.

Marcas: **[verificado]** se leyó en el código en la revisión final; **[revisor]** lo leyó un revisor con
`archivo:línea`, sin segunda lectura; **[inferido]** se deduce del código y no se ejecutó.

## Lo que se sostiene

- Laboratorio TASK-2094: 204 casos contados estáticamente y reejecutados por un revisor (`run-local.mjs`, exit 0,
  7 archivos, 204 PASS, PG16 efímero por socket UNIX, red bloqueada). Usa código real de identidad, Finance,
  atribución, services, Notion e Insights; ICO sigue simulado, como declara el ADR. **[revisor]**
- El trigger de asignación exige igualdad del client del gasto y del servicio
  (`migrations/20260507164348236_task-815-direct-service-expense-allocation.sql:122-128`); rechaza A′ y no afecta
  a B. **[verificado]**
- Enlaces del EPIC, ADR y tasks resuelven; dependencias acíclicas y consistentes; registros y siguientes IDs
  correctos; las doce dueñas externas conservan Epic y lifecycle; `task:lint` y `epic:lint` sin errores. **[revisor]**

## Hallazgos que corrigen la documentación

| # | Hallazgo | Evidencia | Marca | Dueña |
| --- | --- | --- | --- | --- |
| H1 | El laboratorio carga `session_360` desde `scripts/setup-postgres-identity-v2.sql` (ordena por `updated_at`), no la vista vigente. La vigente une Spaces por `client_id`, agrupa por `space_id` y `identity-store.ts:288` toma `LIMIT 1` sin `ORDER BY`: con dos Spaces el Space de sesión depende del plan, no de la metadata | `run-local.mjs:46-50`; `migrations/20260601194051024_task-987-…sql:200-206` | verificado | TASK-2096, TASK-2094 |
| H2 | Usuario inactivo: el refresh sólo renueva la marca de tiempo y conserva los claims anteriores indefinidamente | `src/lib/auth.ts:796-802` | verificado | TASK-2096 |
| H3 | Un período Finance cerrado se reescribe: `materializeOperationalPl` lee `periodClosed`, borra y reinserta la misma revisión; client→Space se resuelve con `DISTINCT ON … active … ORDER BY updated_at` | `src/lib/cost-intelligence/compute-operational-pl.ts:290-297,622-660` | verificado | TASK-2101 |
| H4 | `canonical.ts` resuelve el Space Finance por client con `LIMIT 1` y silencia errores | `src/lib/finance/canonical.ts:391-402` | verificado | TASK-2098 |
| H5 | El materializer cae a candidatos por client; bajo B una factura sin deal queda ambigua (no falso Diseño). El riesgo de falso candidato único es de A′. B reduce cobertura de Diseño sin deal | `src/lib/service-attribution/materialize.ts:527-540` | verificado (código) / inferido (cobertura) | TASK-2098 |
| H6 | Crear/aprobar asignaciones no emite evento ni re-materializa; la suma del trigger corre sin lock sobre el gasto | `expense-service-allocations.ts:178-249`; `sync/projections/service-attribution.ts:92-122`; trigger l.137-146 | revisor / inferido (carrera) | TASK-2098 |
| H7 | Service sync resuelve Space con `LIMIT 1` sin orden ni `active`; el upsert reasigna `space_id` en cada replay | `service-sync.ts:116-134`; `upsert-service-from-hubspot.ts:144-147` | verificado | TASK-2097 |
| H8 | Carriles con resolución propia no listados: intake asíncrono, handler de webhook, backfill, rutas cron/admin, segundo writer Notion; sin unicidad de DB Notion por Space | `hubspot-services-intake.ts:54-60`; `webhooks/handlers/hubspot-services.ts:145-151`; `scripts/services/backfill-from-hubspot.ts:82-87`; `scripts/sync-source-runtime-projections.ts`; `setup-postgres-space-notion-sources.sql:47` | revisor | TASK-2097 |
| H9 | `POST /api/admin/spaces` existe, rechaza un segundo Space activo e inserta sin `numeric_code` (`NOT NULL`, sin default): fallaría hoy. `numeric_code` es de dos dígitos y único global (tope de 100) | `src/app/api/admin/spaces/route.ts:62-74`; `migrations/20260427134952999_task-700-…sql:89,113,127` | verificado | TASK-2099 |
| H10 | Caches y readers sin Space no listados: workspace cache, resolver/enablement del portal, carriles App/ecosystem que convierten un binding de Space en toda la Organization | `organization-workspace/cache.ts:30-34`; `client-portal/enablement/reader.ts:77-95`; `api-platform/resources/ecosystem-insights-scope.ts:35-47` | revisor | TASK-2100 |
| H11 | El store Insights no persiste `space_id`/`service_id` y su idempotencia es `(organization_id, key)`; TASK-1960 ya exige herencia de Space, falta el criterio de schema | `migrations/20260915100154428_task-1845-insights-foundation.sql` | revisor | TASK-1960 |
| H12 | Pausa por Space existente a medias: `space_notion_sources.sync_enabled` sin command de desactivar; `enable-client-ico-sync` sin `spaceId` elige `LIMIT 1` por client | `space-notion-store.ts:38,51`; `ico-engine/enable-client-ico-sync.ts:111-117` | revisor | TASK-2102 |

## Correcciones de forma aplicadas

- Backend impact ampliado donde los criterios exigen DDL, commands o eventos (TASK-2096, 2097, 2098, 2101, 2102).
- Un dueño por archivo: `identity-store.ts`→2096; `space-notion-store.ts`→2097; `service-attribution/materialize.ts`
  y `project-notion-delivery-to-postgres.ts`→2097/2098, y 2101 los modifica sólo después, por dependencia.
- TASK-2099 deja de poseer los commands que el ADR prohíbe reutilizar; TASK-2102 reemplaza `src/lib/observability`
  por `src/lib/reliability`.
- ADR: hallazgo de sesión corregido, punto 5 separado por modelo, P&L cerrado incluido en protección temporal.

## Límites

Nada de lo anterior se ejecutó contra datos reales. H5 (cobertura), H6 (carrera) y el efecto de H3 sobre un P&L
real bajo B son inferencias. El ADR sigue Proposed; esta revisión no acepta el modelo ni autoriza implementación.
Disco local al 98–100% durante la revisión: un lint falló por espacio y se repitió.
