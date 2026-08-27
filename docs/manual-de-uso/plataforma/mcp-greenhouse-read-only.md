# MCP Greenhouse Read-Only

> **Tipo de documento:** Manual de uso
> **Version:** 1.8
> **Creado:** 2026-04-30 por Codex
> **Ultima actualizacion:** 2026-08-27 por Claude (TASK-1775: inventario a 17 tools SEO — 13 lectura + 4 escritura con `get_seo_domain_overview`; allowlist federado sigue en 13)
> **Modulo:** plataforma / MCP
> **Ruta en portal:** `N/A` (server MCP local `stdio` o remoto HTTP)
> **Documentacion relacionada:** [API Platform Ecosystem](../../documentation/plataforma/api-platform-ecosystem.md), [Platform Health API](../../documentation/plataforma/platform-health-api.md), [GREENHOUSE_MCP_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md)

## Para que sirve

Este MCP permite que un agente o cliente compatible consulte Greenhouse de forma segura y read-only, usando contratos estables de `api/platform/ecosystem/*`.

No entra por SQL directo, no inventa tenancy y no necesita leer rutas internas del portal.

Hoy sirve para:

- confirmar el contexto efectivo del consumer y binding
- listar organizaciones visibles para ese scope
- leer una organización puntual
- listar capabilities visibles para ese scope
- revisar integration readiness
- consultar platform health
- leer el event control plane en modo consulta

## Modalidades disponibles

Greenhouse expone el mismo MCP read-only de dos formas:

- Local `stdio`: para clientes que pueden levantar un proceso local, usando `pnpm mcp:greenhouse`.
- Remoto HTTP: para clientes que necesitan una URL estable, usando `POST /api/mcp/greenhouse`.

Ambas modalidades comparten las mismas tools y el mismo cliente downstream. La diferencia es solo el transporte y el envelope de acceso.

## Antes de empezar

Necesitas estas variables de entorno:

- `GREENHOUSE_MCP_API_BASE_URL`
- `GREENHOUSE_MCP_CONSUMER_TOKEN`
- `GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE`
- `GREENHOUSE_MCP_EXTERNAL_SCOPE_ID`

Opcionales:

- `GREENHOUSE_MCP_API_VERSION`
- `GREENHOUSE_MCP_REQUEST_TIMEOUT_MS`
- `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN`
- `GREENHOUSE_MCP_REMOTE_MAX_BODY_BYTES`

Reglas importantes:

- el token debe ser de un `consumer` ecosystem válido
- el scope lo define `externalScopeType + externalScopeId`
- si apuntas a `staging` o `preview`, no asumas que basta con la URL; debes respetar el flujo operativo ya documentado para entornos protegidos
- el modo local usa `stdio`
- el modo remoto HTTP V1 es privado/service-to-service, no público ni self-service
- el modo remoto no reemplaza `TASK-659`: OAuth hosted/multiusuario sigue fuera de este corte

## Como levantarlo

### Modo local `stdio`

El entrypoint canónico es:

```bash
pnpm mcp:greenhouse
```

Si usas el registro local del repo, `.vscode/mcp.json` ya define el server `greenhouse/greenhouse-mcp-readonly` y te pedirá los inputs necesarios sin embutir secretos en el archivo.

### Modo remoto HTTP

El endpoint remoto canónico es:

```text
POST /api/mcp/greenhouse
GET /api/mcp/greenhouse
DELETE /api/mcp/greenhouse
```

Para conectarte desde un cliente MCP compatible con Streamable HTTP, usa la URL completa del ambiente y agrega:

```text
Authorization: Bearer <GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN>
```

El gateway remoto está deshabilitado si `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN` no existe. En ese caso responde como no configurado en vez de abrir una surface anónima.

El modo remoto V1 es stateless. Eso significa:

- no guarda sesiones MCP en memoria entre requests
- no mantiene estado por usuario
- no implementa OAuth, refresh tokens ni revocación multiusuario
- cada request vuelve a usar el runtime MCP compartido y el scope server-side configurado

Este diseño es intencional para V1: permite publicar una URL operable sin confundirla con hosted auth multiusuario.

### Conectarse con tu propio cliente (Claude Code / claude.ai)

Desde el 2026-08-06 el gateway público `mcp.efeonce.org` acepta **clientes MCP estándar con login de usuario** (cuenta corporativa Entra del tenant Efeonce). Para las tools federadas no necesitas token de consumer ni levantar este server: el gateway autentica a la persona y transporta la consulta hasta Greenhouse.

**Claude Code:**

```bash
claude mcp add --transport http efeonce-mcp https://mcp.efeonce.org/mcp
```

Luego, en una sesión interactiva, ejecuta `/mcp`, elige el server y usa `Authenticate`: se abre el login Entra en el navegador y al volver el server queda `connected` con las tools SEO federadas (inventario exacto y estado de despliegue en el §8), más el lector de Globe.

**claude.ai / Claude Desktop:** `Settings` → `Connectors` → `Add custom connector` con la URL `https://mcp.efeonce.org/mcp`, y autentica con la misma cuenta Entra.

Recuerda que los conectores se cargan al **iniciar** la sesión: un conector agregado con una sesión ya abierta no aparece hasta abrir una nueva.

## Que puede hacer hoy

### 1. Contexto y tenancy

- `get_context`

Úsala para confirmar:

- qué `consumer` quedó autenticado
- qué `binding` se resolvió
- qué scope Greenhouse quedó activo

Es la tool correcta antes de empezar a leer datos más sensibles.

### 2. Organizaciones

- `list_organizations`
- `get_organization`

Sirven para:

- listar organizaciones visibles para el binding actual
- buscar por filtros pequeños
- leer el detalle de una organización puntual

No sirven para saltarse el scope del binding.

### 3. Capabilities

- `list_capabilities`

Sirve para revisar asignaciones/catálogo de capabilities visibles dentro del scope resuelto.

### 4. Integraciones

- `get_integration_readiness`

Sirve para consultar readiness operacional de integraciones y bindings expuestos por la lane ecosystem.

### 5. Salud de plataforma

- `get_platform_health`

Sirve para:

- saber si la plataforma está `healthy`, `degraded`, `blocked` o `unknown`
- revisar `safeModes`
- ver si un agente debería leer, escribir, desplegar, notificar o automatizar
- consultar `recommendedChecks[]` antes de operar

Si `agentAutomationSafe` es `false`, el operador debe tratarlo como bloqueo operativo.

### 6. Event control plane en lectura

- `list_event_types`
- `list_webhook_subscriptions`
- `get_webhook_subscription`
- `list_webhook_deliveries`
- `get_webhook_delivery`

Sirven para:

- ver qué event types existen
- listar subscriptions del consumer/binding actual
- inspeccionar una subscription puntual
- listar deliveries
- revisar el detalle de un delivery puntual

### 7. Conocimiento (Knowledge)

- `search_knowledge`
- `get_knowledge_document`
- resource `greenhouse://knowledge/document/{id}`

Sirven para que un agente consulte el **corpus de conocimiento gobernado** de Greenhouse (manuales, SOPs, runbooks, definiciones) y responda con **citas** en vez de inventar:

- `search_knowledge` recibe una pregunta (`query`, opcional `limit` ≤ 20) y devuelve el paquete `knowledge-search.v1`: los **fragmentos relevantes con su cita** (de qué documento y sección salen), un **nivel de confianza** y la **frescura** de las fuentes.
- `get_knowledge_document` carga un documento puntual por id, con sus **secciones** (ruta de encabezado + ancla de cita + texto).
- El resource `greenhouse://knowledge/document/{id}` es el mismo documento, direccionable por URI estable (read-only).

Reglas que el agente debe respetar:

- **Si la confianza es `none`, NO inventes.** Reporta que no hay guía publicada para esa pregunta. El paquete es la única fuente — no rellenes con conocimiento general.
- **Solo bindings de scope `internal`** ven el corpus (es interno-only en esta versión). Un binding tenant-scoped (organización/cliente/space) recibe `403 scope_not_allowed`. No es un error tuyo: ese binding no tiene grant al corpus interno.
- Un documento marcado como "no usado por agentes", borrador, deprecado o no-interno **no aparece** (responde `404` por id, o simplemente no entra en la búsqueda). Lo que queda fuera por política se **cuenta** sin mostrar su contenido.
- Es **read-only**: estas tools nunca crean, editan ni publican conocimiento.

### 8. SEO / Search Visibility 360 (TASK-1645 · 1303 · 1304 · 1306 · 1307 · 1308 · 1661 · 1664 · 1666 · 1775)

Hoy son **17 tools SEO: 13 de lectura y 4 de escritura**. Las de escritura son la excepción al
carácter read-only del resto de este MCP y están marcadas como tales.

**Lectura (13):**

- `get_seo_entitlement`
- `get_seo_keyword_opportunities`
- `get_seo_keyword_market_data`
- `get_seo_visibility_360`
- `get_seo_rank_evolution`
- `get_seo_overview_kpis`
- `get_seo_performance`
- `get_seo_performance_catalog`
- `get_seo_site_audit_report`
- `get_seo_backlink_profile`
- `get_seo_keyword_discovery` (TASK-1664)
- `get_seo_grounded_query_draft` (TASK-1666)
- `get_seo_domain_overview` (TASK-1775)

**Escritura (4):**

- `track_seo_keywords` — compromete gasto recurrente del proveedor
- `untrack_seo_keywords` — el reverso: cierra la ventana de gasto sin borrar historia
- `discover_seo_keywords` (TASK-1664) — **gasta presupuesto de proveedor por corrida** (cada
  llamada Live y cada fila devuelta se facturan): SIEMPRE `preview: true` primero + confirmación
  humana del costo estimado antes de encolar
- `prepare_seo_grounded_queries` (TASK-1666) — crea un **DRAFT** de grounded queries AEO desde
  candidatos de discovery (no gasta proveedor; jamás aprueba, activa ni corre el grader). Con la
  identidad máquina compartida responde `aeo_forbidden` **fail-closed hasta TASK-1631** — se
  reporta ese estado honesto, no se reintenta

Qué entregan:

- `get_seo_entitlement` dice si una organización tiene el módulo SEO (`seo_v2`) asignado, su tier (`contracted`/`trial`/`pilot`), cuántos site-audits le quedan en el mes y cuánto presupuesto de proveedor (USD) le queda. **Úsala PRIMERO**, antes de proponer cualquier operación SEO.
- `get_seo_keyword_opportunities` lista las oportunidades striking-distance **medidas** (Google Search Console): posición ponderada, impresiones, clics incrementales estimados, quick wins y canibalización. Desde TASK-1661 puede traer además `searchVolume` y `difficulty` como **enriquecimiento opcional ◑ estimado**; `null` significa "nunca se consultó", **jamás cero**, y el campo `market` dice si ese enriquecimiento existe para esa organización.
- `get_seo_keyword_market_data` (TASK-1661) resuelve el dato de mercado **◑ estimado** para una **lista explícita de keywords** (no existe el modo "todas las de la org"): volumen mensual, dificultad orgánica 0–100, competencia **paga** y core keyword, desde el snapshot mensual de DataForSEO Labs. El mercado (país + idioma) sale del target SEO, porque el volumen no es global. Cada valor viaja con `capturedAt`/`providerLastUpdatedAt`: **siempre se reporta el as-of**. `found=false` = nunca se consultó, se reporta como desconocido. La dificultad es una métrica de **barrera de enlaces** y se presenta como nivel (baja 0–14 / media 15–49 / alta 50+), nunca como número crudo: un 0 significa "entrar no está bloqueado por enlaces", **no** que rankear sea trivial.
- `get_seo_overview_kpis` (TASK-1306) devuelve los KPIs norte del cockpit Overview desde datos **medidos** de Search Console: clics, impresiones, posición media **ponderada por impresiones** (nunca un promedio plano) y CTR (clics totales / impresiones totales), más la serie diaria y la ventana anterior comparable. `previous: null` significa "sin comparación disponible", **nunca** un cambio de 100%.
- `get_seo_performance` y `get_seo_performance_catalog` (TASK-1307) son el par de la pantalla Rendimiento: el catálogo lista los ítems comparables (keywords o URLs, más los **grupos nombrados** que el operador configuró) y `get_seo_performance` devuelve la serie diaria + el standing de un set elegido. La fuente resuelta viaja en `data.source` y **debe declararse** al reportar números; un punto `value=null` es un hueco de medición, nunca un cero.
- `get_seo_visibility_360` cruza los dos internets de búsqueda: posición orgánica medida (GSC) × citabilidad IA (score del AEO grader). Devuelve la **matriz quadrant** por keyword y del dominio: `dominante` (rankea y la IA lo cita), `riesgo` (rankea pero la IA NO lo cita — autoridad sin citabilidad, la señal de venta cruzada al AEO), `oportunidad` (citado sin rankear) e `invisible`.
- `get_seo_rank_evolution` devuelve la serie temporal de **posiciones exactas por keyword** (fuente DataForSEO SERP; la captura diaria ya corrió sola — la tool solo lee). Parámetros opcionales: `organizationId` (obligatorio para binding `internal`), `rangeDays` (ventana en días, máx 1825), `engine`, `device` (`desktop`/`mobile`/`tablet`) y `keywords` (subset, máx 100). Ejemplo: `get_seo_rank_evolution {"organizationId": "…", "rangeDays": 30, "device": "desktop", "keywords": ["pintura para piscinas"]}` → `{ series: [{ keyword, points: [{ date, position, url }] }] }`.
- `get_seo_site_audit_report` (TASK-1304) devuelve el **audit técnico del sitio**: health score sitewide (0–100), páginas crawleadas y findings agrupados por severidad (`critical`/`warning`/`notice`) con `issueType` estable (p. ej. `is_4xx_code`, `no_description`, `has_micromarkup_errors`). Un run `running` significa "crawl en curso" (hecho, no error); un `succeeded` con 0 findings significa sitio técnicamente limpio. Parámetro opcional `auditRunId` para leer un run histórico puntual.
- `get_seo_backlink_profile` (TASK-1304) devuelve la **serie semanal del perfil de enlaces**: dominios referentes, backlinks totales, rank del dominio 0–100 (comparable a DR/DA), `toxicShare` (0–1, proxy del spam score del perfil entrante) y delta new/lost de la ventana de 30 días del proveedor. Parámetro opcional `rangeDays` (default 365).
- `get_seo_keyword_discovery` (TASK-1664) lee las corridas de descubrimiento de keywords y, con `runId`, sus **candidatos compuestos**: procedencia (seed, endpoint, rank) + lente de mercado **◑ estimada** (volumen, dificultad, intención, CPC, nivel de competencia, barrera de enlaces) + demanda **● medida** del propio sitio (GSC) como campo separado + estado de tracking y última acción. Un candidato es una **sugerencia**, no una keyword seguida: promoverlo pasa por `track_seo_keywords` con su propio disclosure de gasto. Filtros: `status`, `sourceEndpoint`, `query`, `intent`, `minSearchVolume`, `maxDifficulty`, `excludeTracked` (solo lo accionable), `limit`/`cursor`.
- `get_seo_domain_overview` (TASK-1775) devuelve la **foto de dominio ◑ estimada** (rank del proveedor, keywords posicionadas y `etv` = **volumen** de tráfico estimado, nunca dólares — el USD es `estimated_paid_traffic_cost`) con `capturedAt` siempre declarado; acepta `subject=` para leer el dominio de un **competidor**. `no_market_data` es un estado honesto (el proveedor no conoce ese dominio), jamás ceros. Es lectura pura: no dispara capturas ni gasta proveedor (la captura mensual está **code complete, rollout pendiente** — flag OFF + scheduler pausado — así que puede no haber foto todavía).
- `get_seo_grounded_query_draft` (TASK-1666) lee un **borrador** de grounded queries AEO creado desde candidatos de discovery, con su provenance opaca (`seo.discovery.*`) y el `groundingMode` honesto: `grounded_llm` = las preguntas se autoraron CON el contexto SEO; `baseline_fallback` = baseline genérico del arquetipo, NO específico de los candidatos (el aviso viaja en `fallbackNotice` y se reporta siempre). Un draft **nunca está activo**: la aprobación es del flujo de revisión AEO existente.

Reglas que el agente debe respetar:

- **La organización se resuelve por el binding.** Un binding ligado a una organización solo ve la suya (pedir otra da `404`). Un binding `internal` debe pasar `organizationId`.
- **Sin módulo `seo_v2` asignado, el recurso "no existe"** (`404`). No se puede inferir nada más de la organización desde ese 404.
- **Una lente faltante es un estado, no un cero.** `no_seo_data` / `no_aeo_data` / `target_not_configured` / `disabled` se reportan tal cual; NUNCA inventes un quadrant ni rellenes con ceros.
- **Los dos ejes del 360 nunca se promedian**: rankeo y citabilidad son verdades ortogonales de motores distintos.
- **En `get_seo_rank_evolution`, `position: null` en una fecha significa que el dominio no rankeó ese día.** Es una medición válida, no un error ni un hueco a rellenar. Y esa serie (DataForSEO) **nunca se promedia** con la serie de GSC — son fuentes distintas.
- **Medido ● y estimado ◑ nunca se promedian ni se sustituyen.** El volumen de mercado de `get_seo_keyword_market_data` es una estimación del mercado; las impresiones de `get_seo_keyword_opportunities` son la demanda medida de ESE sitio. Son dos hechos distintos y ambos ciertos.
- **Las 13 tools de lectura son read-only**: no disparan capturas ni gastan presupuesto de proveedor.
- **El par track/untrack compromete gasto recurrente.** `track_seo_keywords` factura cada keyword al proveedor en **cada ciclo diario** hasta que alguien la saque, así que la lista exacta se propone al humano y se confirma **antes** de llamarla — nunca especulativamente. Ambas son idempotentes y devuelven un **outcome por keyword** (`tracked` / `already_tracked` / `intent_changed` / `capacity_exceeded` / `invalid`, y `untracked` / `not_tracked` / `invalid`): reportar `data.ok` sin leer ese arreglo describe un cambio que puede no haber ocurrido. El lane acepta las 4 tools de escritura **solo desde bindings de scope `internal`**.
- **`discover_seo_keywords` gasta al encolar, no al seguir.** Cada corrida paga a DataForSEO por llamada y por fila devuelta: primero `preview: true`, se muestra la fórmula de costo estimado al humano y se confirma ANTES de encolar — nunca especulativamente. La corrida es **async** (el 202 solo significa "encolada durable"): los candidatos se consultan después con `get_seo_keyword_discovery` + `runId`, y declarar resultados recién encolada la corrida describe datos que aún no existen. Es idempotente **dentro del ciclo mensual del proveedor** (mismo intent = misma corrida sin gastar de nuevo; un mes nuevo permite corrida fresca). Encolar **jamás auto-trackea**.
- **`prepare_seo_grounded_queries` escribe un draft, nunca activa.** Se propone al humano la selección exacta de candidatos (≤20) y se confirma antes de llamar. El resultado declara `groundingMode` honesto, y desde la auditoría 2026-08-14 también la **cobertura por seed** (`seedCoverage`): si algún candidato quedó sin huella temática, viaja `coverageNotice` y se reporta al revisor — la etiqueta grounded se verifica, no se asume. Con la identidad máquina compartida el upstream responde `aeo_forbidden` fail-closed hasta TASK-1631.
- **La intención de una keyword se declara, no se adivina** (TASK-1659). `track_seo_keywords` acepta `intent` opcional: `target` (compromiso acordado con el cliente — puede estar en la posición 60, y eso es la **distancia que falta**, no un fracaso) u `opportunity` (demanda medida que se está empujando). **Omítelo salvo que un humano lo haya declarado**: adivinarlo fabrica una clasificación que nadie hizo. Los dos **nunca se promedian** al reportar. Cambiar la intención de una keyword ya seguida devuelve `intent_changed` (no `already_tracked`: sí pasó algo), **no consume cupo** —cierra la membresía vigente y abre otra— y preserva desde cuándo es objetivo. `intentDeclaredBy` lleva la **autoría humana** cuando el agente actúa por encargo; el actor del write sigue siendo la máquina (`mcp:<consumer>`), que es la procedencia real del gasto, y una autoría sin intención se descarta. Las keywords seguidas antes del 2026-08-14 no tienen intención declarada: eso significa **"nadie la declaró"**, jamás "oportunidad".

**Qué está federado al gateway público `mcp.efeonce.org`.** Verificado contra el allowlist de paridad
del repo hermano `efeonce-mcp` (`src/providers/greenhouse-seo-tool-parity.ts`, cuyo test rompe el CI si
diverge de las tools realmente registradas en el gateway): el allowlist tiene **13 tools** — las 9 de
lectura federadas (`get_seo_entitlement`, `get_seo_keyword_opportunities`, `get_seo_visibility_360`,
`get_seo_rank_evolution`, `get_seo_site_audit_report`, `get_seo_backlink_profile`,
`get_seo_keyword_market_data`, `get_seo_keyword_discovery`, `get_seo_grounded_query_draft`) y las 4 de
escritura (`track_seo_keywords`, `untrack_seo_keywords`, `discover_seo_keywords`,
`prepare_seo_grounded_queries`). Es el mismo lane y el mismo entitlement: el gateway solo transporta.
⚠️ **Estado de despliegue (2026-08-14):** el gateway **en producción** aún sirve la revisión anterior
(9 tools); las 4 de TASK-1664/1666 están commiteadas en `efeonce-mcp` con canary verde contra staging
y **su deploy se despacha junto al próximo release develop→main** de Greenhouse (antes, responderían
404 upstream porque el lane no está en producción — lección TASK-1661).

**Qué NO está federado todavía** y por ahora vive solo en este MCP interno: `get_seo_overview_kpis`,
`get_seo_performance`, `get_seo_performance_catalog` y `get_seo_domain_overview` (TASK-1775). La federación es por **allowlist explícito con
revisión humana por tool** (decisión TASK-1647: nunca auto-federación), así que la ausencia es un
pendiente declarado, no un bug. Lectura funcional en
[Search Visibility 360 por MCP](../../documentation/growth/search-visibility-360-por-mcp.md); operación en
[Operar el provider Greenhouse-SEO del MCP](operar-provider-greenhouse-seo-mcp.md).

## Que no puede hacer

Este MCP no hace lo siguiente:

- no crea subscriptions
- no actualiza subscriptions
- no reintenta deliveries
- no hace writes **salvo** las dos excepciones gobernadas del §8 (`track_seo_keywords` / `untrack_seo_keywords`, TASK-1308), que exigen binding `internal`, entitlement, techo de capacidad e idempotencia; fuera de ese par, este MCP no escribe nada
- no consulta rutas legacy como source primaria
- no expone OAuth hosted/multiusuario
- no expone ICO por MCP todavía
- no bypass-ea permisos, bindings ni rate limits

Si necesitas alguno de esos casos, eso ya vive en otra task o follow-up:

- OAuth / hosted auth: `TASK-659`
- ICO ecosystem surface antes de MCP: `TASK-648`
- write-safe MCP commands: follow-up posterior con historia explícita de idempotencia y auditoría

## Paso a paso recomendado

1. Configura las variables de entorno.
2. Levanta el server con `pnpm mcp:greenhouse`.
3. Ejecuta `get_context`.
4. Confirma que el scope resuelto es el esperado.
5. Usa solo las tools necesarias para tu caso.
6. Si vas a automatizar algo sensible, corre `get_platform_health` antes.
7. Si `safeModes` o el scope no son los esperados, detente antes de seguir.

## Que significan los limites del scope

El MCP no “adivina” acceso por nombre visible.

Todo request baja con:

- `Authorization: Bearer <consumer token>`
- `externalScopeType`
- `externalScopeId`
- `x-greenhouse-api-version`

Eso significa:

- si el binding no existe o no está activo, fallará
- si el recurso existe pero cae fuera del scope, fallará
- si el token no es válido, fallará

En modo remoto hay dos credenciales separadas:

- `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN`: protege el gateway HTTP frente al cliente MCP remoto.
- `GREENHOUSE_MCP_CONSUMER_TOKEN`: se usa server-side para llamar la API Platform Ecosystem.

No mezcles ambas. El gateway token no reemplaza al consumer token, y el consumer token no debe exponerse como secreto de usuario final.

## Problemas comunes

### El server no levanta

Revisa:

- que existan las variables `GREENHOUSE_MCP_*`
- que `GREENHOUSE_MCP_API_BASE_URL` no termine con errores de path o protocolo
- que `GREENHOUSE_MCP_CONSUMER_TOKEN` no esté vacío

### El endpoint remoto responde que no está configurado

Revisa:

- que `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN` exista en el ambiente
- que el cliente envíe `Authorization: Bearer <token>`
- que no estés intentando usar el custom domain de staging sin el bypass operacional de Vercel cuando aplique

### El request falla por timeout

El client usa timeout configurable.

Revisa:

- conectividad al ambiente objetivo
- si el target está protegido o inaccesible
- si necesitas subir `GREENHOUSE_MCP_REQUEST_TIMEOUT_MS`

No subas el timeout a ciegas si el problema real es auth o networking.

### El request devuelve error de auth

Revisa:

- token correcto
- token vigente
- que el consumer corresponda al carril ecosystem

### El request devuelve error de scope

Revisa:

- `GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE`
- `GREENHOUSE_MCP_EXTERNAL_SCOPE_ID`
- que exista un binding activo entre ese scope externo y Greenhouse

### `get_platform_health` devuelve payload inválido

Eso indica drift del contrato downstream. El MCP valida `platform-health.v1` antes de responder `ok`.

Acción recomendada:

1. revisar el cambio reciente en `api/platform/ecosystem/health`
2. revisar la documentación de `Platform Health API`
3. tratarlo como incompatibilidad de contrato y no como “warning menor”

## Que no hacer

- no usar este MCP como sustituto de un diseño OAuth hosted
- no hardcodear tokens en archivos versionados
- no asumir que una tool de lectura autoriza luego un write manual
- no mezclar este MCP con scripts SQL ad hoc para “completar” acceso
- no usarlo como bypass de API Platform
- no publicar el gateway remoto como API anónima ni como OAuth multiusuario improvisado

## Referencias tecnicas

- Runtime MCP: [src/mcp/greenhouse](../../../src/mcp/greenhouse)
- Entry point: [scripts/run-greenhouse-mcp.ts](../../../scripts/run-greenhouse-mcp.ts)
- Gateway remoto: [src/app/api/mcp/greenhouse/route.ts](../../../src/app/api/mcp/greenhouse/route.ts)
- Lane ecosystem: [docs/documentation/plataforma/api-platform-ecosystem.md](../../documentation/plataforma/api-platform-ecosystem.md)
- Platform health: [docs/documentation/plataforma/platform-health-api.md](../../documentation/plataforma/platform-health-api.md)
- Knowledge (Knowledge Platform): [docs/documentation/plataforma/knowledge-platform.md](../../documentation/plataforma/knowledge-platform.md) · builder ecosystem [src/lib/api-platform/resources/ecosystem-knowledge.ts](../../../src/lib/api-platform/resources/ecosystem-knowledge.ts) · TASK-1086
