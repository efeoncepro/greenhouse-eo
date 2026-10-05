# TASK-2001 — Contrato de lectura de hojas email/web · 2026-10-05

Estado: implementación local; sin push, deploy, activación de flags ni lecturas autenticadas nuevas contra proveedores reales. El operador informa TASK-2002 en producción; este corte no modifica su UI. QA local PASS, rollout pendiente. No migración: se amplían los JSON de evidencia existentes. Studio commit local `1f2a0ef`. API **1.9.0**, 75 tools / 80 operaciones; manifiesto generado desde el registro.

## Handoff para Claude: nombres exactos de ActivationDto

Las operaciones `getActivation`, `listCampaignActivations`, `getCalendarRange` y `GET /api/v1/activations/{activationId}` comparten la proyección. `email` y `web` son aditivos/opcionales para compatibilidad; el reader nuevo siempre entrega objeto o `null`. No usar valores de ejemplo como datos de campaña.

| Campo | Semántica |
| --- | --- |
| `email.recordId` | Ejecución elegida: la última observación vinculada, desempate estable por recordId. No mezcla ejecuciones. |
| `email.sender.name`, `email.sender.address`, `email.sender.raw` | Remitente del proveedor; raw conserva el mailbox Resend original. Ausente = null. |
| `email.subject.text`, `email.preheader.text` | Literales del proveedor, incluido vacío, espacios, saltos, emojis y Unicode sin normalización. |
| `email.subject.characterCount`, `email.preheader.characterCount` | Code points Unicode del literal; vacío = 0, ausente = null. |
| `email.subject.copyLimits`, `email.preheader.copyLimits` | Array de límites aplicables de la versión de catálogo fijada por la activación, mayor especificidad placement/format; null si no existe. Cada entrada conserva `hardLimit`, `recommendedLimit`, `unit`, `sourceUrl`, `verifiedOn`, `field`, `placementKey`, `formatKey`. No se modifica ni rellena el catálogo publicado. |
| `email.source`, `email.observedAt` | Fuente y fecha de lectura de remitente/copy. |
| `email.audiences[]` | `kind` list/segment, `id`, `name`, `role` include/exclude, `source`, `observedAt`, `contactCount`. No se suman listas solapadas ni se infieren destinatarios. null si la fuente no informa listas. |
| `email.audiences[].contactCount` | Snapshot `{value, source, observedAt, windowStartAt, windowEndAt}` o null. HubSpot aporta el size de su lista de contactos en la fecha de lectura; no el tamaño histórico al enviar. |
| `email.scheduled` | `{value, source, observedAt}` o null. value es la fecha de programación observada; no el plan de Studio. |
| `email.sent` | `{completion, sentCount, lastSentAt, source, observedAt}`. Conserva la completitud probada aunque una lectura posterior sea parcial. La fecha puede ser null en evidencia anterior a esta extensión. |
| `email.delivered`, `email.opens`, `email.clicks` | Última lectura `{value, source, observedAt, windowStartAt, windowEndAt}` o null; cero sólo cuando el proveedor devuelve cero. No se guardan series ni se prometen usuarios únicos. |
| `web.url` | URL observada de la ejecución más reciente, o destino planificado si aún no hay observación. Por sí sola no prueba publicación. |
| `web.destinationActivationCount`, `web.destinationCountedAt` | Conteo actual de otras activaciones con destinationUrl exactamente igual, misma organización y campaña no archivada, excluyendo canceladas. No depende del filtro de fechas del calendario. null si no existe URL; 0 si existe y no hay referencias. |
| `web.connectedForms[]` | `{provider: 'growth_forms', id, surfaceId, source, observedAt}`. **id = form_key público**, jamás el GUID de destino HubSpot. null si no se pudo observar y validar. |
| `web.formReadStatus` | verified / not_observed / unavailable; null en evidencia antigua. unavailable añade aviso `growth_forms_unavailable`. No se inventa un booleano «sin formulario». |
| `web.publicUrlEvidence` | Evidencia existente: URL, checkedAt, HTTP, robots, canonical, sitemap, más la lectura de Growth Forms. |
| `web.publishedAt`, `web.publicationSource` | Fecha observada por proveedor o confirmada por persona; source provider/person o null. Nunca derivada de tener formulario o HTTP 200. |

La evidencia completa sigue en `execution.records[].emailEvidence` (nuevo `details` y `observedAt`) y `execution.records[].publicUrlEvidence`. Las métricas nuevas siguen refrescándose después de published. Una observación vieja no reemplaza una nueva; cambios únicamente de fecha de lectura no generan revisión/evento de descubrimiento.

## Fuentes y límites comprobados

- HubSpot: Marketing Emails v3 (`from.fromName`, `from.replyTo`, `subject`, `content.widgets.preview_text.body.value`, stats counters delivered/open/click); CRM Lists v3 (`listId`, `name`, `size`, objectTypeId 0-1), referenciadas por `to.contactIlsLists`. El SDK oficial aclara que replyTo es FROM; customReplyTo es otra dirección de respuesta. SENT events siguen gobernando completitud/fecha. Reader dueño: Greenhouse, mismo binding de organización/cuenta y credencial canónica; Studio consume su HTTP, nunca su DB.
- Resend: detalle de broadcast + segmento; `/emails/metrics` filtrado por broadcast_id, desde created_at hasta la lectura, sólo totals delivered/opened/clicked. Las fechas efectivas de la ventana vienen en el DTO; no se presenta como lifetime si el proveedor limita retención. Página reducida a 5 y presupuesto de 45 s; GET admite hasta dos reintentos de 429 con Retry-After corto (máximo 2 s), sin ampliar scope. Un límite persistente/fallo sigue como error visible del reader.
- **No disponible:** conteo de contactos Resend vía API pública estable: Retrieve Segment no devuelve size y Segment Metrics está en private beta. contactCount es null para Resend; no se añade una operación beta, no se enumeran contactos ni se sustituye por sentCount. SentCount Resend sigue null donde el broadcast no lo informa.
- **No disponible:** métricas de contactos únicos, tasas, series históricas, número de leads por formulario, GUID de destino HubSpot, estado de entrega DB → HubSpot. No están en este contrato. El flujo canónico sigue Growth Forms → DB Greenhouse → dispatcher HubSpot; verificar un embed no demuestra envíos ni entregas.
- Growth Forms: no hay registro página → form_key en el reader actual. Se valida el embed explícito de la página pública con `GET /api/public/growth/forms/{formKey}?surfaceId=…` en el origen canónico del owner. Deben coincidir identidad, surface y dominio permitido. HTML parseado con parse5; comentarios, scripts, templates, atributos y ejemplos escapados no cuentan. No se ejecuta JavaScript ni se inventan bindings de forms dinámicos/legacy sin form_key/surface. Se aceptan múltiples formularios comprobados. No se transmiten credenciales ni destinos privados.
- Catálogo sin subject/preheader: copyLimits null. Marketing Cloud Engagement/Next siguen preparados, sin reader ni evidencia inventada.

Fuentes primarias: [HubSpot FROM](https://github.com/HubSpot/hubspot-api-nodejs/blob/master/codegen/marketing/emails/models/PublicEmailFromDetails.ts), [HubSpot lista](https://github.com/HubSpot/hubspot-api-nodejs/blob/master/codegen/crm/lists/models/PublicObjectList.ts), [HubSpot estadísticas](https://github.com/HubSpot/hubspot-api-nodejs/blob/master/codegen/marketing/emails/models/EmailStatisticsData.ts), [Resend OpenAPI](https://github.com/resend/resend-openapi/blob/main/resend.yaml), [Resend Segment Metrics beta](https://resend.com/docs/api-reference/segments/get-segment-metrics). Growth Forms: `src/lib/growth/forms/readers.ts`, contracts y renderer/element en Greenhouse.

## Verificación y rollout

- Slice email: `pnpm check` con Postgres local real PASS; pruebas del puerto Greenhouse y permisos/bindings PASS.
- Slice web/Growth Forms: PG real, HTTP owner simulado, parser, aislamiento por organización y pruebas de ausencia/errores PASS.
- Corte final: Studio `pnpm check` **296 tests + 7 gates**, manifest/paridad/typecheck/lint PASS; `pnpm build` PASS. PG **18.6**, todas las suites de integración habilitadas con databases locales de test. Greenhouse **12 tests focales + 18 CLI**, lint y typecheck PASS.
- Las rutas de UI reservadas a Claude permanecen sin cambios. No se envió mensaje a otra task ni se cambió rama.
- Rollout pendiente: publicar el reader dueño Greenhouse con permisos de listas/estadísticas y el código/manifest/worker Studio; verificar flags/bindings existentes, ejecutar owned readback y comprobar DTO por API/CLI. No hay migración ni backfill destructivo: la siguiente lectura rellena los nuevos JSON. Los registros antiguos devuelven null hasta entonces. Este informe no certifica disponibilidad live nueva.

CLI existente: `pnpm studio describe studio.activation.get`, `pnpm studio call studio.activation.get --param activationId=<id>`, `pnpm studio call studio.calendar.get --param from=<YYYY-MM-DD> --param to=<YYYY-MM-DD>` contra el servidor explícitamente elegido. La CLI descubre schemas del servidor y devuelve estos campos sin otro adapter.

## Handoff histórico preservado (04/10; no certifica el runtime actual)

**Marketing Studio — cierre 04/10:** main `74073de`, API 1.6.0/59 tools y catálogo v1/52 canales desplegados; worker `/health` verificado. `pnpm studio` disponible localmente en Greenhouse: API-only, cargas/descargas, copys/canales y dryRun por defecto; 18 tests y lectura/dryRun autenticados PASS. [Cierre y evidencias](docs/audits/marketing-studio/2026-10-04-session-documentation-closure.md). Pendientes: backfill humano de 134 registros (`efeonce_operations`), ICP 1906/1892 y autoridad de catálogo; MCP write retirado como requisito (1899), sin federación nueva. Greenhouse/gateway sin release. Video 1998/1999 sigue completo; estado de 1894 en [runtime handoff](docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md).
