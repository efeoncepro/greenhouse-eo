# SKY — 04. Routing de Services, fuentes Notion y replay

Fecha: 2026-11-01. Revisor: `deep_sync_sources`. Greenhouse `985f84d3c`; repo hermano
`../notion-bigquery` en `87a4391`. Sólo código local: sin DB, secretos, ejecución de sync ni consulta al
proveedor. Estos son caminos alcanzables en código y escenarios condicionados; no incidentes productivos
confirmados. Las pruebas de integración de abajo son **propuestas, no ejecutadas**.

## Conclusión

**A′ no evita la reasignación por sync y B tampoco.** El problema empieza antes del reader legacy: varios
writers deducen el Space a partir de Company, sin binding por servicio. Hay que resolver ownership antes de
crear otro Space, incluso inactivo. Reparar sólo `service-sync.ts` deja el intake reactivo con otra regla.

Notion tiene ya un pipeline canónico programable que lleva el Space desde raw hasta PG. Es mejor base que
el script manual, pero no verifica que un mismo objeto/fuente conserve su dueño anterior. Una base de Notion
visible mediante un token no acredita que sea la fuente exclusiva de ese Space.

## 1. Cuatro caminos de Services convergen en un upsert que reemplaza el dueño

### Cron y acción administrativa por Company

`src/app/api/cron/services-sync/route.ts:11–35` exige cron auth y readiness HubSpot, luego llama
`syncAllOrganizationServices`. La acción manual
`src/app/api/integrations/hubspot/services/sync/route.ts:9–23` exige admin y recibe Company, no Space/Service.
El barrido deduplica Companies de `clients`, no distingue servicios (`service-sync.ts:245–266`).

`src/lib/services/service-sync.ts:111–139` resuelve primero Organization→Space y después client→Space;
ambos SQL usan `LIMIT 1`, sin `ORDER BY`, `active` ni service ID. Resuelve **una vez por Company** y aplica
ese Space a todos sus servicios (`:198–232`). Dos Spaces hacen ambiguo el destino aunque sus clients sean
distintos. No hace falta que SEO esté activo para que participe en el primer resolver.

Auto-crear un Space está protegido por opt-in `createMissingSpace` (`:141–155`); cron/manual ordinario
no lo activa. Esa defensa evita altas accidentales, pero no protege la selección entre Spaces ya existentes.
La ruta de orphan services permite ese opt-in (`src/app/api/admin/integrations/hubspot/orphan-services/route.ts:157`).

### Webhook → outbox → intake reactivo

El handler verifica firma y encola IDs; el intake relee HubSpot. Cadena:
`src/lib/webhooks/handlers/hubspot-services.ts:201–234` → evento
`commercial.service_engagement.intake_requested` →
`src/lib/sync/projections/hubspot-services-intake.ts:109–135,219–244`.

Este resolver **no es el anterior**: une Space→clients→Company (`hubspot-services-intake.ts:54–60`), también
`LIMIT 1` sin active/orden. Company del servicio se toma de la primera asociación (`:87–106`); tampoco se
valida multiplicidad de Companies. Un resultado cero queda observable/reintentable; un resultado ambiguo
no se detecta porque SQL ya lo redujo a una fila.

Con A′ hay dos casos que la comparación debe cubrir: si el bridge operativo SEO no lleva Company, el intake
puede seguir seleccionando Diseño; si la replica, ambos Spaces son candidatos. El cron puede elegir otro
destino porque parte de Organization. Con B los dos Spaces comparten client y siguen siendo ambiguos.

**Protección real:** el eco de servicios creados desde Greenhouse busca `ef_greenhouse_service_id` como
`idempotency_key`, sólo enlaza HubSpot y omite el upsert normal (`:161–190`). No aplica automáticamente al
servicio SKY originado en HubSpot. Los failures parciales retornan summary; sólo todos fallidos lanzan error
para retry (`:257–275`): la futura ambigüedad necesita estado propio y recuperación, no sólo un contador.

### Legacy síncrono y backfill

`processHubSpotServiceEvents` se conserva para tests/fallback manual, mientras el canon es async
(`src/lib/webhooks/handlers/hubspot-services.ts:237–244`); su resolver está en `:145–151`.
`scripts/services/backfill-from-hubspot.ts:80–100,154` repite selección por Company y llama al mismo upsert.
No se afirma que esos fallbacks estén siendo ejecutados hoy. Deben certificarse o deshabilitarse en el cutover.

### El destino no queda protegido al llegar al store

`src/lib/services/upsert-service-from-hubspot.ts:125–168` hace conflicto por `hubspot_service_id` y reemplaza
`space_id`, `organization_id` y `hubspot_company_id`. El estado previo leído (`:117–122`) no incluye ownership.
La idempotencia evita otra fila del mismo servicio; **no conserva su asignación anterior**. Tampoco hay
vigencia del binding en esta operación. Un replay válido de campos comerciales puede mover el servicio.

## 2. Diferencias de contrato adicionales entre cron e intake

En `service-sync.ts:173–190` el adapter pasa `hubspotCompanyId: space.client_id` y omite
`hs_pipeline_stage`. El upsert persiste aquel valor como Company y pide ese stage al mapper
(`upsert-service-from-hubspot.ts:209–219,263–274`). Ante stage ausente el mapper devuelve
`paused/paused/false` (`src/lib/services/service-lifecycle-mapper.ts:118–173`).

Por tanto, **si corre ese adapter y el fetch devuelve servicios**, puede reemplazar una Company ID por un
client ID y desactivar un servicio antes correctamente materializado por intake. No depende del segundo
Space; no se ha comprobado la frecuencia/configuración productiva. Es un motivo concreto para probar
paridad de entradas reales, no limitar el experimento al nuevo mapping en memoria.

El upsert publica `materialized` y, si cambió lifecycle, `lifecycle_changed` (`:291–350`). No basta revisar la
fila final: el ensayo debe verificar downstream y un replay sin diffs. No interpretar el comentario de
"atomic" del intake como evidencia de una transacción compartida: el upsert y `publishOutboxEvent` son
llamadas separadas en ese helper.

## 3. Registrar Notion no valida ownership exclusivo de la fuente

La tabla inicial garantiza `UNIQUE(space_id)`, no exclusividad de las bases entre Spaces
(`scripts/setup-postgres-space-notion-sources.sql:23–47`). La ruta admin
`src/app/api/integrations/notion/register/route.ts:26–49,54–125` valida Space, formato y opcionalmente acceso;
permite `verify=false` y hace upsert por Space con `sync_enabled=TRUE`. No compara los IDs con otros Spaces.
Luego replica a BQ (`:133–175`), en otra operación. Un error entre ambas deja dos vistas diferentes del registry.

El nuevo command de conexión valida las DBs visibles para el token y guarda un intent; crea inicialmente
`sync_enabled=FALSE` (`src/lib/client-onboarding/notion-connect-store.ts:92–125,166–195`). Eso es una defensa
real para altas nuevas. En conflicto, sin embargo, reemplaza DBs/token y **no fuerza FALSE**: un source ya
habilitado sigue habilitado. No hay que usar reconnect como simulación de alta SEO sobre Diseño.

`getSpaceNotionSourceByClientId` tiene un caller operativo: provisioning de contactos admin →
`provisionTenantUsersFromHubSpotContacts` → `getTenantProvisioningContext`
(`src/lib/admin/tenant-member-provisioning.ts:96–155,569–581`). Ahí el `LIMIT 1` por client sí influye en Space
y proyectos otorgados. A′ reduce esta ambigüedad específica; B necesita recibir Space explícito. No es el
resolver central del pipeline Notion, por lo que corregir sólo este helper tampoco arregla ingestión.

## 4. Raw → conformed → PG: la cadena actual y sus defensas

El repo hermano carga BQ legacy y concatena fuentes PG con token específico sin deduplicar
(`../notion-bigquery/main.py:189–212,259–316`). La selección PG exige `sync_enabled` y token_ref, no Space activo.
Una fuente repetida en ambos registries produce dos entradas; una DB compartida por dos Spaces produce dos
extracciones de los mismos objetos con distinto dueño. Condición: configuración duplicada; no se verificó
que exista en SKY. El token per-Space usa contextvar y falla omitiendo ese Space, sin sustituirlo por el token
de otro (`:1953–1970,2016`). Los refs simples del writer son soportados (`:235–241`); no hay aquí evidencia de
incompatibilidad de formato de secret refs.

`sync_table` recibe Space/client del loop, los estampa y reemplaza raw **por Space**, no toda la tabla cuando
hay binding (`:1710–1809`). Eso preserva otros tenants normalmente. Si se ejecuta el legacy sin binding,
existe camino `WRITE_TRUNCATE`; la ausencia total de configs activa fallback estático (`:2018–2024`). Una
migración no debe permitir que un fallo del registry parezca permiso para cambiar de modo de ingestión.

Greenhouse: `/api/cron/sync-conformed` y acción admin `trigger-conformed-sync` →
`runNotionSyncOrchestration` → `runNotionConformedCycle` → `syncNotionToConformed`
(`src/lib/integrations/notion-sync-orchestration.ts:565–574,775–817`). El conformed toma Space del raw;
sólo deriva client mediante registry PG (`src/lib/sync/sync-notion-conformed.ts:1162–1200`). Cuenta con gates
de freshness, paridad, preservación de Spaces no procesados y staged-swap (`:1049–1062,1320–1367,1580–1588`).
Estas defensas no equivalen a comprobar que un objeto mantiene ownership correcto.

Después llama `projectNotionDeliveryToPostgres`, salvo flag explícitamente false (`:1604–1630`). Éste es el
writer PG canónico: upsert por `notion_project_id` cambia Space/client (`src/lib/sync/project-notion-delivery-to-postgres.ts:295–299`);
sprints/tasks hacen lo mismo (`:377–380,476–480`). No verifica dueño anterior. Trabaja por filas y captura
fallos; marca ausentes sólo en `targetSpaceIds` (`:575–610,631–674`). Repetir un objeto en dos Spaces puede
dejar el último dueño escrito, no dos objetos aislados. No hay prueba aquí de que un guard upstream rechace
ese conflicto de ownership antes del writer.

El script manual `sync-source-runtime-projections.ts:936–956` mantiene otra regla: map DB→Space mediante
`Map.set`, último registro gana; `:1376–1379` reescribe PG. Su reemplazo global BQ está gated por
`allowLegacyConformedOverwrite` (`:1309–1320`), pero el upsert PG posterior sigue siendo un camino a cubrir.

## Contratos mínimos antes del split

| Dato | Autoridad propuesta | Regla necesaria |
| --- | --- | --- |
| Company, condiciones comerciales, lifecycle externo | HubSpot + mappers canónicos | Todas las entradas entregan el mismo contrato completo; no derivar Company desde client |
| Service→Space | Greenhouse, binding explícito y versionado | Una única resolución compartida; ausencia/ambigüedad no modifica el dueño existente |
| Fuente/DB→Space | Registry Greenhouse | Exclusividad normalizada; una transición explícita, nunca copia incidental de Diseño |
| Objeto Notion→Space | Binding registrado con procedencia | Upsert ordinario actualiza contenido; cambio de dueño exige command separado y evidencia |
| Proyecto→Servicio | Binding propio de negocio | No inferir del módulo ni del único servicio actual del Space |

Necesario para ambas variantes: unificar resolvers, cubrir todos los writers, rechazar conflictos antes de
mutar, registrar versión/procedencia y disponer de replay reconciliable. A′ requiere además resolver Company
por owner comercial sin reutilizarlo como selector del Space. B convierte provisioning client-only a Space.
No es necesario duplicar Companies, reorganizar todas las bases históricas ni reemplazar todo el bus de sync.

## Matriz de integración pendiente — misma batería A′/B

1. Dos servicios/Spaces de una Company; cron, manual, webhook async y backfill conservan sus respectivos bindings.
2. Segundo Space inactivo y orden SQL invertido: ninguna ruta mueve el servicio ni elige un candidato implícito.
3. Replay tras cambiar sólo importe/nombre en HubSpot: ownership y baseline Diseño idénticos; lifecycle coherente.
4. Intake seguido de cron: Company ID, stage, active y engagement_kind permanecen iguales; no evento espurio.
5. Mapping ausente/ambiguo, batch con otro servicio válido: sólo el válido progresa; pendiente recuperable por ID.
6. DB Notion ya asignada a Diseño: alta/reconnect SEO rechazados antes de habilitar/replicar; nada en raw/PG cambia.
7. BQ+PG registran mismo source y luego conflictos de DB/Space: dedupe exacto y rechazo de discrepancia, sin fallback legacy.
8. Mismo Notion ID con segundo Space en batch/replay: writer real rechaza ownership conflictivo; no último-writer-gana.
9. Falla registry, token, carga de un Space o fila PG: preservar Diseño; reportar parcial y reanudar sólo lo pendiente.
10. Una persona aprovisionada en SEO con dos fuentes activas: scopes de proyectos SEO exactos; sin elección por client.

Las pruebas necesitan DB aislada y stubs del proveedor; no ejecutar cron productivo como validación. Registrar
antes/después de sources, Services, projects/tasks y eventos; igualdad de totales no basta si cambia el dueño.

## Rollback y decisión

Antes de altas reales, rollback es descartar el candidato local. Después del split no sirve apagar SEO:
los resolvers actuales incluyen Spaces inactivos, y dos registries pueden seguir alimentando raw. La transición
requiere pausar sólo escritores afectados, mantener versión del mapping compatible, drenar/reconciliar eventos
pendientes y restaurar ownership desde evidencia del cutover; no volver a ejecutar un sync legacy para "corregir".

Decisión pendiente: contrato único de binding y transferencia histórica. Este frente no selecciona A′ sobre B:
la ventaja de A′ en el helper de provisioning es puntual, mientras el routing por Company es un bloqueo común.
