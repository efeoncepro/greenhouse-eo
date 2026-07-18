# TASK-1426 — Search Console Multi-Property Analytics, URL Inspection & Post-Publish Discovery

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `2`
- Domain: `growth|seo|public-site|integrations`
- Blocked by: `none`
- Branch: `task/TASK-1426-search-console-multi-property-discovery`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende la conexión Google Search Console de Greenhouse desde una única propiedad web seleccionada por organización hacia un contrato multi-property capaz de analizar el sitio y, cuando Google lo exponga por API, las nuevas Platform Properties de Instagram, TikTok, X y YouTube. En paralelo agrega URL Inspection read-only y un ciclo post-publicación que verifica descubribilidad, sitemap e indexación sin inventar un “ping” que Google ya retiró ni ampliar permisos OAuth sin evidencia.

## Why This Task Exists

La primitive actual de TASK-1282 sólo implementa `sites.list` y `searchAnalytics.query`, guarda una única `site_url` por organización y pide `webmasters.readonly`. Ese contrato basta para leer una propiedad web, pero no para conservar simultáneamente website + varias Platform Properties ni para observar qué ocurre después de publicar una URL nueva. Además, la API oficial aún no documenta de forma explícita el formato ni la compatibilidad de Platform Properties con `sites.list`/`searchAnalytics.query`, aunque la interfaz de Search Console ya ofrece Performance, Insights, Discover y Google News para Instagram, TikTok, X y YouTube. La solución debe probar compatibilidad real, degradar como `unsupported` si Google todavía no la expone y mantener least privilege.

## Goal

- Modelar múltiples propiedades Search Console por organización sin romper el consumer legacy de propiedad web primaria.
- Probar y documentar con evidencia real si Platform Properties aparecen en `sites.list` y aceptan `searchAnalytics.query`.
- Ampliar el reader de Search Analytics con tipos, filtros, agregación, paginación y metadata necesarios para análisis web y platform.
- Implementar URL Inspection read-only para URLs web administradas, con errores y cuotas gobernadas.
- Crear un ciclo post-publicación que pruebe HTTP/canonical/robots/sitemap y observe indexación inmediatamente, a 24 h y a 72 h.
- Mantener fuera del runtime cualquier ping retirado, uso indebido de Indexing API o ampliación automática al scope `webmasters`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — ownership del dominio `growth.seo`, GSC-first y series de observación.
- `docs/architecture/GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md` — GSC como primera parte y frontera con DataForSEO/AEO.
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — OAuth, token per-org, property picker y honest degradation de TASK-1282.
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — observaciones append-only y materialización proporcional.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — readers/commands canónicos consumidos por UI, Nexa, MCP, CLI y workers.
- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md` — estados `published_unverified` y QA posterior a publicación humana.
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` — causa raíz, least privilege, resiliencia y no workarounds permanentes.

Reglas obligatorias:

- **No existe ping genérico de URL.** El endpoint público de ping de sitemaps está retirado y no se implementa.
- **Indexing API no es un atajo.** `indexing.googleapis.com` sólo se considera para URLs elegibles `JobPosting` o `BroadcastEvent` dentro de `VideoObject`; nunca para artículos, páginas de servicio o landings normales.
- **URL Inspection observa, no solicita indexación.** El botón humano `Solicitar indexación` permanece fuera de la API programática general.
- **Least privilege.** Mantener `webmasters.readonly`; `sitemaps.submit` requiere `webmasters` y queda bloqueado salvo decisión separada sustentada por un sitemap realmente nuevo, reconsentimiento y rollout explícito.
- **Platform Properties son rollout experimental.** Instagram, TikTok, X y YouTube sólo se marcan `supported` después de un canary real. Documentación de interfaz no equivale a contrato API.
- **No inferir soporte por dominio solamente.** Preservar el `siteUrl` opaco devuelto por Google y registrar capability evidence; heurísticas de host pueden enriquecer display, nunca autorizar queries ni writes.
- **Website y platform no se mezclan.** Métricas, cuotas, estados y series deben conservar `property_binding_id`, tipo de superficie y `searchType`; nunca sumar silenciosamente website + social.
- **Publicación sigue siendo humana.** El ciclo de descubrimiento empieza sólo después de `published_unverified` y jamás publica, cambia robots o solicita indexación por sí mismo.

## Normative Docs

- `src/lib/growth/search-console/api-client.ts`
- `src/lib/growth/search-console/contracts.ts`
- `src/lib/growth/search-console/oauth-client.ts`
- `src/lib/growth/search-console/reader.ts`
- `src/lib/growth/search-console/connection-store.ts`
- `src/lib/growth/search-console/command.ts`
- `src/lib/growth/search-console/__tests__/reader.test.ts`
- `src/lib/growth/ai-visibility/probes/structural/sitemap.ts`
- `src/lib/public-site/content-factory/`
- `services/ops-worker/server.ts`
- `services/ops-worker/deploy.sh`
- `docs/tasks/in-progress/TASK-1282-growth-search-console-multitenant-connection.md`
- `docs/tasks/to-do/TASK-1302-growth-seo-gsc-daily-snapshot-materializer.md`

Fuentes primarias verificadas al autorar la task (revalidar al tomarla por ser feature nueva/gradual):

- Google Search Console Help — `About platform properties in Search Console` y `Add a website or platform property`.
- Google Search Console API — `sites.list`, `searchAnalytics.query`, `urlInspection.index.inspect`, `sitemaps.list` y `sitemaps.submit`.
- Google Search Central — `Ask Google to recrawl your URLs`, `How to Use the Indexing API` y retiro del sitemap ping endpoint.

## Dependencies & Impact

### Depends on

- TASK-1282 y su primitive `src/lib/growth/search-console/**` ya materializada.
- `greenhouse_growth.search_console_connections` y OAuth `webmasters.readonly` existentes.
- Una cuenta operadora con al menos una Platform Property real cuando el rollout de Google la habilite; la ausencia no bloquea código, pero sí el claim `provider_verified`.
- Content Factory/runbook vigente como primer consumer post-publicación; otros publicadores podrán consumir el mismo primitive después.

### Blocks / Impacts

- Impacta TASK-1283: la UI legacy debe seguir leyendo la propiedad web primaria; administración multi-property visible queda para una task `ui-ux` separada.
- Impacta TASK-1302: su materializer debe poder adoptar `property_binding_id` y separar website/platform sin forkear el cliente GSC.
- Habilita análisis SEO/social search sobre Instagram, TikTok, X y YouTube si el provider confirma API parity.
- Habilita seguimiento operativo de nuevas URLs sin depender de chequeos manuales aislados.

### Files owned

- `src/lib/growth/search-console/**`
- `migrations/*task-1426-search-console-multi-property*.sql`
- `src/lib/growth/seo/url-discovery/**` (nuevo bounded context server-only para preflight/observaciones)
- `services/ops-worker/server.ts`
- `services/ops-worker/deploy.sh`
- `src/types/db.d.ts`
- tests focales bajo `src/lib/growth/search-console/**/__tests__/` y `src/lib/growth/seo/url-discovery/**/__tests__/`
- documentación Search Console/SEO/Content Factory afectada por el contrato final

## Current Repo State

### Already exists

- OAuth 3-legged con refresh token en Secret Manager y scope `webmasters.readonly`.
- `sites.list` para property picker y verificación anti-binding ajeno.
- `searchAnalytics.query` básico con fechas, dimensiones y `rowLimit` máximo local de 100 por defecto.
- Una fila `search_console_connections` por organización con una única `site_url` activa.
- Reader canónico `readSearchConsoleAnalytics(orgId, params)` con degradación honesta y revocación tipada.
- Probe HTTP de `/sitemap.xml` y checklist Content Factory que verifica sitemap después del publish.

### Gap

- No se pueden conservar website + Instagram + TikTok + X + YouTube simultáneamente para una organización.
- El API client no soporta `type`, `aggregationType`, filtros, `startRow`, metadata de datos incompletos ni paginación hasta 25.000 filas.
- No existe prueba de compatibilidad real para Platform Properties ni un estado `unsupported/provider_not_documented`.
- URL Inspection quedó explícitamente fuera de TASK-1282.
- No hay historial de cuándo Google descubre/rastrea una URL ni verificación recurrente 0 h/24 h/72 h.
- No hay contrato canónico que una QA post-publish, sitemap e index status sin intentar un ping inexistente.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/search-console/` + `src/lib/growth/seo/url-discovery/` + `greenhouse_growth` + consumer batch en `services/ops-worker/`
- Future candidate home: `domain-package`
- Boundary: adapters de UI/API/Nexa/MCP/Content Factory/worker consumen readers y commands Search Console/URL Discovery; ninguno importa DB, secretos u OAuth directamente.
- Server/browser split: contratos allowlisted pueden ser browser-safe; OAuth, Secret Manager, Google fetch, sitemap crawling, DB stores y scheduler son server-only.
- Build impact: sin SDK pesado nuevo; continuar con `fetch` + `google-auth-library` existente y evitar incorporar `googleapis` completo.
- Extraction blocker: refresh tokens per-org, capability/auth del portal, transacciones de bindings/observaciones y coordinación con ops-worker/Cloud Scheduler.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: conexión OAuth existente + nuevos bindings multi-property y observaciones de descubrimiento/indexación en `greenhouse_growth`.
- Consumidores afectados: TASK-1283 legacy UI, TASK-1302 materializer, Content Factory, ops-worker, Nexa/MCP y futuras superficies SEO/social.
- Runtime target: `local|staging|production|worker|external`

### Contract surface

- Contrato existente a respetar: `SearchConsoleConnection`, `SearchConsoleAnalyticsParams/Result`, `readSearchConsoleAnalytics`, OAuth `webmasters.readonly`, capability `growth.search_console.connect` y errores canónicos.
- Contrato nuevo o modificado: bindings multi-property; `listSearchConsoleProperties`; `readSearchConsoleAnalyticsForProperty`; `probeSearchConsolePropertyCapabilities`; `inspectSearchConsoleUrl`; `verifyPublishedUrlDiscovery`; `readUrlDiscoveryTimeline`; batch 24 h/72 h.
- Backward compatibility: `gated` y compatible; `readSearchConsoleAnalytics(orgId, params)` continúa resolviendo la propiedad web primaria mientras consumers migran al binding explícito.
- Full API parity: primitives server-side son la única implementación; UI, Content Factory, CLI, worker, Nexa y MCP son consumers del mismo contrato.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.search_console_connections` (credencial/estado legacy), nueva tabla de property bindings y nueva tabla append-only de URL discovery/index observations; nombres físicos finales se fijan en Discovery y se documentan antes de migrar.
- Invariantes que no se pueden romper:
  - Una organización puede tener varias properties, pero un binding pertenece a una sola organización y credential connection.
  - Como máximo una website property es `primary_for_analytics`; Platform Properties nunca reemplazan implícitamente la primaria web.
  - `site_url` se conserva opaco y único dentro de la conexión; no se reconstruye desde username/host.
  - `property_kind` puede ser `website_domain|website_url_prefix|platform|unknown`; `platform_provider` puede ser `instagram|tiktok|x|youtube|unknown`.
  - `provider_capability_status` distingue `verified_supported|verified_unsupported|not_tested|inconclusive`; ausencia de filas nunca equivale a unsupported.
  - Observaciones de indexación son append-only por URL/binding/checkpoint/observed_at; no se sobrescribe historia.
  - URL Inspection sólo acepta una URL dentro de una website property accesible; Platform Properties degradan `unsupported_for_inspection` salvo evidencia oficial/live contraria.
  - Métricas siempre llevan binding + search type; no hay agregado cross-surface implícito.
- Tenant/space boundary: `organizationId` se deriva server-side; binding solicitado debe pertenecer a esa org y estar accesible por el token antes de cualquier Google call.
- Idempotency/concurrency: upsert de bindings por `(connection_id, site_url)`; checkpoints post-publish idempotentes por `(url, checkpoint)`; claim/lease para que 24 h/72 h no ejecuten dos veces en paralelo.
- Audit/outbox/history: connect/bind/unbind/primary changes auditables; observations append-only; emitir eventos sólo si existe un consumer real, no outbox decorativo.

### Migration, backfill and rollout

- Migration posture: `additive` + backfill de la `site_url` vigente como binding website primario; no borrar la columna legacy hasta que todos los consumers migren y una task posterior autorice cleanup.
- Default state: conservar `GROWTH_SEARCH_CONSOLE_ENABLED`; agregar flags separados default OFF para multi-property/platform probe y URL discovery scheduling si Discovery confirma que el blast radius lo exige.
- Backfill plan: dry-run de conexiones activas → crear un binding primario por fila con idempotencia; comparar conteos y `site_url` antes/después; sin llamadas Google durante el DDL/backfill.
- Rollback path: flags OFF + pausar scheduler + mantener reader legacy; revert code. Las tablas/observaciones se conservan durante diagnóstico y sólo se retiran con reverse migration segura si no hay datos productivos de valor.
- External coordination: Platform Property creada/verificada en Search Console; OAuth account con acceso; Cloud Scheduler/ops-worker rollout; no reconsentimiento mientras se mantenga read-only.

### Security and access

- Auth/access gate: capability existente `growth.search_console.connect` para bindings; reads vía capability/entitlement SEO vigente al integrarse; worker con auth canónico.
- Sensitive data posture: refresh/access tokens sólo en Secret Manager; consultas pueden revelar búsquedas y URLs del cliente, por lo que no se loggean payloads crudos.
- Error contract: códigos estables `property_not_accessible`, `provider_not_documented`, `provider_unsupported`, `inspection_unsupported`, `quota_exceeded`, `url_not_in_property`, `sitemap_missing`, `not_indexable`; raw Google errors nunca salen al cliente.
- Abuse/rate-limit posture: quotas por property/org, paginación acotada, backoff/circuit breaker, cache apropiada y batch por-org resiliente; repeated inspection no se usa para presionar crawl.

### Runtime evidence

- Local checks: unit tests de clasificación, binding, compatibilidad legacy, paginación, filtros, response metadata, sitemap traversal e idempotencia de checkpoints.
- DB/runtime checks: migration/backfill en staging, A≠B tenant test, uniqueness/append-only/lease verification y reader legacy bit-for-bit.
- Integration checks: canary real `sites.list` → seleccionar Platform Property → `searchAnalytics.query` para `web`, `discover` y `googleNews` cuando aplique; URL Inspection real sobre una URL web administrada.
- Reliability signals/logs: `growth.search_console.platform_property_compatibility`, `growth.search_console.url_discovery_lag` y batch summary sin queries/tokens/PII.
- Production verification sequence: conexión existente sin regresión → multi-binding shadow → canary platform → URL inspection shadow → scheduler 0 h/24 h/72 h para allowlist → rollout gradual.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica de properties, analytics, inspection y discovery vive en primitives `src/lib/growth/**`, no en rutas/UI/scripts.
- [ ] Reads son readers canónicos; cambios de binding/primary son commands autorizados, idempotentes y auditables.
- [ ] Capability/grants existentes se reutilizan o se refinan en el mismo PR con coverage; no se usa admin-coarse.
- [ ] Camino programático declarado para portal/API/Nexa/MCP/CLI/worker sin duplicar Google calls.
- [ ] Ningún write externo se ejecuta desde un LLM o publish automático; `sitemaps.submit` permanece fuera sin task/consent explícitos.
- [ ] Parity check = SÍ para cada primitive entregada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que tome esta task produce plan.md. No llenar aquí.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Provider contract verification + frozen compatibility matrix

- Revalidar documentación oficial vigente y congelar una matriz website/platform × método (`sites.list`, Search Analytics por `type`, URL Inspection, sitemaps).
- Ejecutar canary live con una Platform Property real cuando Google la habilite; capturar `siteUrl` redacted/shape, permission level, status y errores sanitizados.
- Si no hay Platform Property disponible, shippear código como `not_tested` y mantener el flag OFF; no fabricar soporte.

### Slice 1 — Multi-property binding foundation

- Migración aditiva para separar credential connection de property bindings; backfill de la propiedad vigente como website primaria.
- Commands/readers tenant-safe para list/bind/unbind/set-primary y compatibilidad con el reader legacy.
- Clasificación explícita con `unknown` y capability evidence; cero hardcode de clientes/accounts.

### Slice 2 — Search Analytics contract completeness

- Extender params/response para `type`, filtros, `aggregationType`, `startRow`, `dataState`, `responseAggregationType` y metadata de incompletitud.
- Implementar paginación segura hasta el máximo oficial por request y límites totales por caller/org.
- Añadir reader por binding y análisis separado website/platform; preparar el contrato que TASK-1302 materializará.

### Slice 3 — URL Inspection reader

- Implementar `inspectSearchConsoleUrl(orgId, bindingId, inspectionUrl)` con el scope read-only actual.
- Validar pertenencia URL→property y proyectar sólo verdict, coverage, crawl/fetch/indexing/robots, Google/user canonical, sitemap, referring URLs y last crawl.
- Tratar quota/transient/provider unsupported de forma explícita; inspection no dispara recrawl.

### Slice 4 — Post-publish discovery verifier + observations

- Implementar preflight `200`, canonical, robots/noindex, sitemap discovery e `lastmod` coherente antes de llamar URL Inspection.
- Persistir observaciones append-only y exponer timeline/read model.
- Integrar como consumer posterior a `published_unverified`, sin cambiar el gate humano ni el write WordPress.

### Slice 5 — 0 h/24 h/72 h scheduling + operational signals

- Ejecutar checkpoint inmediato y batch diferido 24 h/72 h mediante ops-worker/Cloud Scheduler con claim idempotente.
- Emitir lag/compatibility signals y estados `discovered|crawled|indexed|excluded|not_seen|not_indexable|inconclusive` sin falsas garantías.
- Verificar rollout allowlisted en staging y una URL productiva autorizada antes de ampliar cobertura.

### Slice 6 — Sitemap/indexing policy closure

- Añadir `sitemaps.list` read-only para conocer los sitemaps registrados y evitar asumir `/sitemap.xml` único.
- Documentar que el sitemap ping retirado, generic Indexing API y repetición de submit por página están prohibidos.
- Si aparece un sitemap nuevo no registrado, producir propuesta de follow-up separada para `sitemaps.submit` con scope `webmasters`, reconsentimiento, capability, audit y aprobación; no incluir ese write en esta task.

## Out of Scope

- UI multi-select/administración de Platform Properties; requiere task `ui-ux` separada con wireframe/flow/GVC.
- Botón programático equivalente a `Solicitar indexación`; Google no ofrece API general pública.
- `sitemaps.submit`, `sites.add` o cualquier ampliación automática al scope OAuth `webmasters`.
- Indexing API para páginas normales; sólo una task de Hiring/Video podría evaluarla con schema elegible real.
- Publicación automática, cambio de WordPress status, canonical, robots o contenido.
- Sumar website + social como una sola métrica sin desglose.
- Materialización histórica completa de Search Analytics; TASK-1302 sigue siendo owner del snapshot diario.

## Detailed Spec

Flujo objetivo:

```text
Google OAuth credential (org)
  -> sites.list
  -> property bindings [website primary + 0..N platform]
       -> searchAnalytics.query(binding, type, dimensions, filters)
       -> URL Inspection (website-only unless provider evidence changes)

human approved publish
  -> published_unverified
  -> verifyPublishedUrlDiscovery(0h)
       -> HTTP/canonical/robots
       -> registered sitemap(s) + URL/lastmod
       -> URL Inspection observation
  -> scheduled observations 24h / 72h
  -> timeline + lag signal
```

Platform Properties V1 son Instagram, TikTok, X y YouTube según Google Help, con rollout gradual. La Search Analytics API documenta `web|image|video|news|discover|googleNews`, pero todavía ejemplifica `siteUrl` sólo con URL-prefix/domain properties. La implementación debe aceptar el identificador opaco que entregue `sites.list`, probar cada combinación y conservar `inconclusive` cuando la ausencia de data pueda significar propiedad nueva, rollout parcial o cero impresiones.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 0 → Slice 1 → Slice 2. Slice 3 puede empezar tras Slice 1. Slice 4 requiere Slice 3 + contratos de sitemap. Slice 5 requiere persistencia/idempotencia de Slice 4. Slice 6 cierra política y nunca autoriza writes en esta task.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Google UI soporta Platform Properties pero API no | provider | high | canary + `not_tested/inconclusive/unsupported`, flag OFF | `growth.search_console.platform_property_compatibility` |
| Migración rompe reader legacy | GSC/portal | medium | backfill primary + compatibility wrapper + shadow compare | legacy reader regression |
| Cross-tenant property binding | identity/data | low | org server-side + `sites.list` revalidation + A≠B test | unauthorized binding rejection |
| Cuota de analytics/inspection agotada | provider | medium | caps, cache, backoff, circuit breaker, checkpoint limitado | quota error rate |
| Falso “indexado” o falso “no soportado” | SEO/data | medium | estados tipados + timestamps + `inconclusive` | observation contradiction |
| Scheduler duplica observaciones | worker/cron | medium | unique checkpoint + claim lease | duplicate claim conflict |
| Expansión accidental de OAuth/write | security | low | scope assertion + tests + out-of-scope hard gate | unexpected scope/write call |
| URL pública defectuosa llega a Google | public-site | medium | preflight antes de inspection; contener según runbook | `not_indexable` / sitemap missing |

### Feature flags / cutover

- Reusar `GROWTH_SEARCH_CONSOLE_ENABLED` como master kill switch.
- Introducir `GROWTH_SEARCH_CONSOLE_MULTI_PROPERTY_ENABLED` y `GROWTH_SEARCH_CONSOLE_URL_DISCOVERY_ENABLED` default OFF si no existe un mecanismo equivalente al tomar la task.
- Platform queries permanecen shadow/allowlist hasta canary `verified_supported` por provider/property.
- Scheduler se despliega paused; activar staging → allowlist productiva → cobertura general.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | desactivar canary/flag; conservar evidencia | <5 min | sí |
| 1 | flag multi-property OFF + reader legacy; conservar tablas | <5 min | sí operacionalmente |
| 2 | volver al query contract legacy por flag/revert | <5 min | sí |
| 3 | flag inspection OFF | <5 min | sí |
| 4 | flag discovery OFF; conservar observaciones | <5 min | sí operacionalmente |
| 5 | pausar Scheduler + flag OFF | <5 min | sí |
| 6 | docs/policy revert; no hay external write | inmediato | sí |

### Production verification sequence

1. Migrar staging y comprobar backfill 1:1 de conexiones activas→binding primario.
2. Comparar reader legacy antes/después para una propiedad web real.
3. Ejecutar `sites.list` y canary Platform Property sin persistir métricas si el provider no está documentado.
4. Validar Search Analytics por `web`, y `discover/googleNews/video` sólo donde la UI/provider muestre datos.
5. Ejecutar URL Inspection sobre una URL web conocida dentro de la propiedad; comprobar canonical/last crawl sin recrawl.
6. Publicar ninguna URL como parte del smoke: usar una URL ya autorizada o engancharse a una publicación humana real en `published_unverified`.
7. Activar checkpoint 0 h y luego 24 h/72 h en staging/allowlist; verificar idempotencia y señales.
8. Producción sólo con QA release auditor, docs closure y sign-off; detener si aparece scope distinto de `webmasters.readonly`.

### Out-of-band coordination required

- Crear/verificar una Platform Property real en la cuenta operadora cuando Google habilite el rollout.
- Acordar una URL pública autorizada para el smoke post-publish.
- Configurar/pausar Cloud Scheduler durante rollout; no requiere secreto OAuth nuevo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migración aditiva separa credential connection de property bindings y backfillea cada `site_url` vigente como website primaria sin pérdida ni cambio observable del reader legacy.
- [ ] Una org puede mantener website + varias Platform Properties; A≠B no puede listar, bindear, consultar ni inspeccionar properties de otra org.
- [ ] `siteUrl` se conserva opaco y se revalida contra `sites.list`; ninguna heurística de dominio autoriza acceso.
- [ ] Canary real documenta si Platform Properties aparecen en `sites.list` y si `searchAnalytics.query` funciona; sin canary el estado queda `not_tested`, nunca `supported`.
- [ ] Search Analytics soporta tipos oficiales, filtros, agregación, paginación, data state y metadata sin mezclar superficies ni ocultar datos incompletos.
- [ ] Reader legacy `readSearchConsoleAnalytics(orgId, params)` mantiene compatibilidad sobre la website primaria y tiene regression tests.
- [ ] URL Inspection usa `webmasters.readonly`, valida URL dentro de property y devuelve un projection sanitizado; no solicita indexación.
- [ ] Post-publish verifier prueba HTTP 200, canonical, robots/noindex, sitemap registrado, inclusión de URL y `lastmod` antes de observar index status.
- [ ] Checkpoints 0 h/24 h/72 h son idempotentes, append-only y concurrency-safe; reintentos no duplican observaciones.
- [ ] Estados distinguen `not_seen`, `not_indexable`, `excluded`, `crawled`, `indexed`, `unsupported` e `inconclusive`; no prometen ranking ni indexación.
- [ ] Tests demuestran cero llamadas a sitemap ping, generic Indexing API, `sitemaps.submit` y `sites.add`.
- [ ] OAuth scope permanece exactamente `webmasters.readonly`; cualquier ampliación falla el gate y requiere una task separada.
- [ ] Content Factory conserva approval humano y lifecycle; el hook empieza en `published_unverified` y no cambia WordPress.
- [ ] TASK-1302 recibe contrato/documentación para adoptar binding y surface type sin duplicar el cliente GSC.
- [ ] Signals de compatibility/discovery lag no contienen tokens, queries crudas ni PII.
- [ ] `pnpm task:lint --task TASK-1426`, `pnpm ops:lint --changed`, gates focales, QA release y docs closure pasan sin findings bloqueantes.

## Verification

- `pnpm task:lint --task TASK-1426`
- Tests focales de `src/lib/growth/search-console/**` y `src/lib/growth/seo/url-discovery/**`.
- Migration up/backfill/readback + A≠B + append-only/unique/lease checks en staging.
- Canary oficial/live `sites.list` + Search Analytics sobre website y Platform Property disponible.
- URL Inspection live sobre URL administrada, verificando que no existe request indexing.
- Smoke ops-worker de checkpoints 0 h/24 h/72 h con scheduler paused/allowlisted.
- Scope assertion y network guard contra ping/Indexing API/sitemap writes.
- `pnpm qa:gates --changed` y `pnpm docs:closure-check` antes del cierre.

## Closing Protocol

- [ ] Mover lifecycle/carpeta y sincronizar `docs/tasks/README.md` + `TASK_ID_REGISTRY.md`.
- [ ] Actualizar arquitectura SEO, source-sync, Content Factory, documentación funcional y manual operativo con el contrato real.
- [ ] Actualizar `FEATURE_FLAG_STATE_LEDGER.md`, `Handoff.md`, `changelog.md` y `project_context.md` si cambian runtime/rollout.
- [ ] Invocar `greenhouse-qa-release-auditor` y registrar `PASS|CONDITIONAL PASS|BLOCK`.
- [ ] Invocar `greenhouse-documentation-governor` y ejecutar cierre documental.
- [ ] Declarar honestamente `complete`, `code complete, rollout pendiente` o `operativamente bloqueado` según canary/scheduler/producción.

## Follow-ups

- Task `ui-ux` para administrar website + Platform Properties en Account 360, sólo después del backend y con wireframe/flow/GVC.
- Ajuste de TASK-1302 para materializar métricas por `property_binding_id`, `property_kind` y `search_type`.
- Task separada de `sitemaps.submit` únicamente si aparece un sitemap nuevo no registrado y se aprueba ampliar OAuth/reconsentimiento.
- Evaluar Indexing API exclusivamente desde una capacidad elegible de Hiring (`JobPosting`) o video live (`BroadcastEvent`), nunca desde public-site general.

## Open Questions

- ¿Qué shape exacto entrega `sites.list` para Instagram, TikTok, X y YouTube durante el rollout de Platform Properties?
- ¿Qué `type` y dimensiones acepta cada Platform Property, y cómo diferencia Google cero data de feature no soportada?
- ¿Qué cuenta operadora y property no sensible se usarán para el primer canary real?
- ¿La retención de observaciones 0 h/24 h/72 h vive sólo en PG hot o requiere export posterior a BigQuery según volumen medido?
- ¿Qué consumers, además de Content Factory, pueden emitir de forma gobernada el evento/command post-publicación?
