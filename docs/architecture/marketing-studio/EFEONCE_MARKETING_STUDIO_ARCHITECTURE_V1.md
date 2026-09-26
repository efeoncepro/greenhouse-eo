# Efeonce Marketing Studio — Arquitectura V1

> **Tipo:** arquitectura técnica (contrato para agentes y desarrolladores)
> **Versión:** 1.4
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Última actualización:** 2026-09-26 por Claude (TASK-1896: observabilidad, health profundo, restauración)
> **Estado:** Accepted. En vivo en `https://studio.efeonce.org` desde 2026-09-25 (TASK-1887)
> **Decisión gobernante:** [`EFEONCE_STUDIO_API_FIRST_DECISION_V1.md`](../EFEONCE_STUDIO_API_FIRST_DECISION_V1.md) (principio 2026-09-23 + deltas de placement y de agentes 2026-09-25)
> **Programa:** [`EPIC-049`](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md)
> **Operación:** [`MARKETING_STUDIO_RUNTIME_HANDOFF.md`](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md)

## 0. Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Código de la plataforma | Repo `efeoncepro/efeonce-marketing-studio` (privado, rama `main`). **Sólo código** + `AGENTS.md`/`CLAUDE.md`/`README.md` como routers: sin ADRs, arquitectura, runbooks, handoff ni changelog. |
| Arquitectura, ADRs, EPIC, tasks, manuales, handoff | **Este repo** (`greenhouse-eo`), bajo `docs/architecture/marketing-studio/`, `docs/operations/marketing-studio/`, `docs/epics/`, `docs/tasks/`, `docs/documentation/marketing-studio/` y `docs/manual-de-uso/marketing-studio/`. Mismo patrón que Globe. |
| Flujo maestro de UI | `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md` |
| Manual MCP servido a agentes | `docs/mcp/skills/marketing-studio/SKILL.md` |
| Provider MCP | Repo `efeoncepro/efeonce-mcp`, `src/providers/marketing-studio.ts`; operación en `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` §Provider Marketing Studio |
| Decisiones de una campaña concreta (CDR) | `docs/campaigns/decisions/` en este repo. |
| Brief, conceptos y assets fuente (hasta el corte) | OneDrive `Alineación/2. Campañas/` y `5. Contenidos/15. Paid Media/`. |
| Datos operativos de campaña (desde el import) | Base `marketing_studio`, schema `studio`. |

**No confundir** con «Efeonce Creative Studio» (Globe, repo `efeonce-globe`): es otro producto.

## 1. Qué es y qué no es

Efeonce Marketing Studio (`studio.efeonce.org`) es el **sistema de registro de campañas**: brief, conceptos,
piezas (imágenes y videos) y sus versiones, copys literales por canal y variante, configuraciones de anuncio
(pieza × copy × placement × audiencia × destino con UTM), plan de medios (flight, mercados, presupuesto propuesto
vs aprobado vs real), calendario orgánico y pagado, y lo que requiere atención (decisiones pendientes).

Nace del prototipo local `ABRIR CAMPAIGN MANAGER.html` (Codex, OneDrive `5. Contenidos/15. Paid Media/` +
`01. Recursos/Campaign Manager/`), aprobado como **referencia de experiencia**, no de implementación.

**No es:**

- **Globe.** Globe produce y gobierna piezas generadas. Studio consume esos assets por referencia o API y no reimplementa generación, rutas de modelos ni gobierno de derechos de generación.
- **Greenhouse.** Organizaciones, clientes, identidad y acceso de personas siguen siendo de Greenhouse / Efeonce ID. Studio los recibe por API o por el canje de tokens; nunca por SQL.
- **Un gestor de pauta en vivo.** Hasta que existan adapters con readback, Studio registra lo preparado y lo observado; no afirma que algo está publicado o activo por inferencia de fecha.

## 2. Topología

```text
                        studio.efeonce.org (Vercel, proyecto efeonce-marketing-studio)
  Navegador ──► apps/web (Next.js App Router)
                   │  páginas: Server Components → mismos readers del dominio
                   │  API:     src/app/api/v1/**  (route handlers delgados)
                   ▼
            packages/domain  ◄── readers · import · auth (api_client) · media-url · actor y visibilidad · errores
                   │               (sin Next.js, sin React, sin SDK MCP — domain-boundary-gate)
            packages/contracts ◄── zod v4 → OpenAPI 3.1 · operations.ts (registro único) · semantics.ts · tool-manifest.ts
                   │
            packages/database ◄── Kysely + pg · Cloud SQL Connector + WIF · storage.ts (GCS) · migraciones SQL
                   │
                   ▼
     Cloud SQL greenhouse-pg-dev (efeonce-group:us-east4)
       ├── base greenhouse_app            (Greenhouse — Studio sin privilegios de lectura)
       ├── base marketing_studio          (prod)
       └── base marketing_studio_staging  (preview / development)
     GCS efeonce-marketing-studio-media[-staging]  (renditions privadas)

  Efeonce MCP (mcp.efeonce.org) ─► provider marketing-studio ─► /api/v1 con bearer de servicio
       └─ por cada llamada canjea el token de la persona en Greenhouse (RFC 8693) antes de llamar a Studio
  scripts/ (CLI)  ─► import del catálogo OneDrive · renditions · alta/revocación de api_client · manifiesto de tools
  apps/worker     ─► (futuro, Cloud Run + Scheduler, TASK-1893) renditions automáticas, readback de Metricool
```

Reglas de capas:

- `packages/domain` no importa `next`, `react`, `@vercel/*`, `@modelcontextprotocol/*` ni `@studio/database/connection`; lo impone `scripts/gates/domain-boundary-gate.mjs`. Recibe un `Database` (Kysely) y un `Actor` por parámetro.
- Los route handlers sólo resuelven actor, validan entrada contra `packages/contracts`, llaman al dominio y serializan con el contrato. El wiring server-side (conexión por instancia de función, resolución del actor, configuración de enlaces firmados) vive en `apps/web/src/server/runtime.ts`.
- Las páginas llaman a los readers en proceso, **con el mismo actor y la misma policy** que usaría la API.
- Funciones de Vercel = request/response. Nada asíncrono crítico en Vercel cron.

### 2.1 Código y toolchain

| Pieza | Ubicación |
|---|---|
| Páginas | `apps/web/src/app/`: `/` (Hoy), `/campaigns`, `/campaigns/[campaignId]` (pestañas piezas, copys, anuncios, medios, calendario), `/calendar`, `/media`, `/library` |
| API | `apps/web/src/app/api/v1/**` (17 route handlers, §4) |
| Paridad handlers ↔ registro | `apps/web/src/server/operations-parity.test.ts` |
| Registro de operaciones | `packages/contracts/src/operations.ts` — fuente única de OpenAPI y del manifiesto de tools |
| Glosario semántico | `packages/contracts/src/semantics.ts` — descripciones por campo que leen humanos y agentes |
| Manifiesto de tools | `packages/contracts/src/tool-manifest.ts` + artefacto `packages/contracts/generated/tool-manifest.json` |
| Bearer de servicio | `packages/domain/src/auth/api-client.ts` |
| Enlaces firmados de imágenes | `packages/domain/src/media-url.ts` |
| Import del catálogo | `packages/domain/src/import/catalog.ts` + `scripts/import-catalog.ts` |
| Almacenamiento GCS | `packages/database/src/storage.ts` |
| Migraciones | `packages/database/migrations/` (`1758800000000_studio-foundation.sql`, `1758830000000_asset-renditions.sql`, `1790362617534_organization-canonical.sql`) |
| Gates | `scripts/gates/` (`absolute-path-gate`, `domain-boundary-gate`, `dependency-catalog-gate`) |

Toolchain: Node 24 LTS, pnpm 10.32, Next.js 16.3.6 (Turbopack), React 19.3, **TypeScript 7.0.2**, Vitest 5, Kysely
0.29, Zod 4.6.5, node-pg-migrate 9. Next 16.3.6 usa TypeScript 7 nativo en el chequeo de tipos del build: un error de
tipos hace fallar el build (verificado a propósito).

- **Versión única por dependencia:** todas viven en el `catalog:` de `pnpm-workspace.yaml` y cada paquete usa `catalog:`. `dependency-catalog-gate` (dentro de `pnpm gates`) falla ante una versión propia por paquete o una dependencia duplicada. Excepción declarada: `google-auth-library` 10 dentro de `google-gax` (el catálogo usa 11).
- **Una sola Zod:** `overrides` en `pnpm-workspace.yaml`, porque `@vercel/oidc` → `@vercel/cli-config` fijaba 4.1.11.
- **Tipos globales:** TypeScript 6+ no los incluye por defecto; `tsconfig.base.json` declara `types: ["node"]` y cada paquete trae `@types/node`.
- pnpm 12 no se adoptó (verificar primero el soporte de Vercel).
- `pnpm check` = gates + `mcp:manifest:check` + typecheck (incluye `theme:check`) + tests.

## 3. Modelo de dominio

Schema `studio` dentro de la base `marketing_studio`. IDs de negocio legibles preservados del catálogo
(`CMP-001`, `CMP001-01`, `CMP001-01-imagen-16x9`, `copy-01-linkedin-a`), porque son los que ya usan los CDR,
los nombres de archivo y las UTM.

| Entidad | Tabla | Clave | Notas |
|---|---|---|---|
| Campaña | `studio.campaign` | `campaign_id` (`CMP-###`) | `organization_id` canónico (`org-…`), nombre, servicio, fase, audiencia resumida, destino, referencia de brief, `revision` |
| Concepto | `studio.concept` | `concept_id` | pertenece a una campaña; título; orden |
| Asset | `studio.asset` | `asset_id` | tipo `image`/`video`/`audio`/`document` (PDF final; lista extensible), ratio, concepto |
| Versión de asset | `studio.asset_version` | uuid | nº de versión, `storage_provider` (`onedrive_provenance` \| `gcs`), ruta, bytes, sha256, dimensiones, procedencia jsonb. Única por `(asset_id, sha256)`. TASK-1893: `media_object_sha256` (FK; `gcs` ⇔ no nulo, `CHECK`) y derechos `rights_license_kind`, `rights_reference`, `rights_usage_starts_on/ends_on`, `rights_territories[]`, `rights_channels[]`, `rights_recorded_at` |
| Objeto de medios | `studio.media_object` | `sha256` | TASK-1893: bytes de un original por contenido en el bucket de originales del ambiente: objeto `originals/sha256/<2>/<sha256>`, `generation`, `crc32c`, tamaño, mime (allowlist), dimensiones, `duration_ms`, `page_count`, `custom_time`. Un sha256 = un objeto aunque lo usen varias versiones |
| Rendition | `studio.asset_rendition` | uuid | derivado de una versión en bucket privado, único por `(asset_version_id, kind)`: `thumb` (640 px) y `preview` (1600 px) WebP, `poster` (JPEG a resolución completa, videos) y `crop_1x1`/`crop_4x5`/`crop_9x16`/`crop_16x9` (recortes automáticos = vistas previas de colocación, nunca piezas aprobadas) |
| Copy | `studio.copy_variant` | `copy_id` | canal, variante, texto literal, headline, descripción, CTA nativo, nota editorial, estado |
| Audiencia | `studio.audience` | `(campaign_id, audience_key)` | canal, temperatura, definición jsonb (cargos, tamaños, geos, exclusiones) |
| Configuración de anuncio | `studio.ad_configuration` | `ad_id` | asset × copy × canal × placement × audiencia × objetivo × destino + UTM; `status`, `checks_pending[]` |
| Flight / plan de medios | `studio.media_flight` | uuid | modelo (always-on, burst), fechas, mercados, moneda, alcance del presupuesto, estacionalidad |
| Línea de presupuesto | `studio.budget_line` | uuid | `flight_id`, período `YYYY-MM`, canal (nullable = reserva), monto, **`kind` = `proposed` \| `approved` \| `actual`** |
| Post programado | `studio.scheduled_post` | uuid | proveedor (`metricool`), IDs del proveedor, red, fecha/zona, texto literal, media, **estado observado + `observed_at`**; `published_at` y `permalink` sólo desde una observación publicada (TASK-1893) |
| Observación de post | `studio.post_observation` | uuid | TASK-1893: evidencia de publicación append-only (trigger): estado del proveedor, `published`, `published_at`, `permalink`, error sanitizado, `payload_digest`; única por `(post_id, payload_digest)` |
| Corrida del worker | `studio.worker_run` | uuid | TASK-1893: `process` (`media-worker`), `kind` (`original_finalized` \| `reconcile_derivatives` \| `metricool_readback`), `trigger` (`pubsub` \| `scheduler` \| `manual`), `status` (`running` \| `succeeded` \| `partial` \| `failed` \| `skipped`), `started_at`, `finished_at`, `counts` jsonb, `error_code`, `error_summary` (≤ 500, sanitizado), `correlation_id`. La lee la salud profunda (TASK-1896) |
| Auditoría | `studio.audit_event` | bigserial | append-only |
| Corrida de import | `studio.import_run` | uuid | fuente, digest, modo, conteos, resultado |
| Cliente API | `studio.api_client` | uuid | sha256 del token, scopes, organizaciones permitidas, revocación |

Datos vigentes (producción y staging): 5 campañas (CMP-001..005), 21 conceptos, 54 piezas, 48 copys, 72 anuncios,
4 audiencias, 1 flight, 7 líneas de presupuesto y 6 posts, todos con `organization_id =
org-2df565fb-98aa-42f7-b324-ea9a2209017f` (Efeonce).

### Invariantes

1. **Los estados no se colapsan.** Una campaña tiene `creative_state`, `media_authorization_state` y `launch_state` separados. Un anuncio preparado no es un anuncio lanzado. Nunca existe un booleano `approved` genérico.
2. **Propuesto, aprobado y real son hechos distintos.** Una línea `proposed` nunca se suma con una `actual`. Ausencia de líneas `actual` ≠ gasto cero.
3. **El copy es literal.** Se almacena exactamente como en la fuente (menciones `@[urn:li:…]`, saltos de línea). Ningún reader lo reescribe.
4. **Programado ≠ publicado.** `scheduled_post.provider_status` siempre va con `observed_at` y `source`. Una fecha pasada no convierte `PENDING` en publicado.
5. **Ausencia no se inventa.** Un campo sin fuente es `null` y el reader lo expone como ausente, no como cero ni como cadena vacía.
6. **Import idempotente.** Reimportar la misma fuente inserta 0 filas: upsert por ID de negocio; versión de asset nueva sólo si cambia el sha256.
7. **Orden estable por bytes.** Las listas ordenan con `COLLATE "C"`, para que paginación y comparación en JavaScript coincidan.
8. **Paid y orgánico conservan destinos distintos** (los posts orgánicos no heredan la UTM del plan paid).
9. **Almacenar ≠ ser la autoridad** (TASK-1893). Hasta TASK-1894, OneDrive es la fuente y GCS una copia verificada de finales ya registrados: la ingesta nunca crea versiones ni escribe en OneDrive, y `import:catalog` nunca devuelve una versión `gcs` a `onedrive_provenance`.
10. **Un original nunca se sobrescribe ni es público.** Objeto nombrado por su sha256, subida con `ifGenerationMatch=0`, bucket con PAP `enforced` y UBLA; la descarga es una URL firmada de ≤ 15 min emitida y auditada por el dominio.
11. **Derechos siempre explícitos.** Toda versión y toda descarga traen `rights.status` (`unknown` \| `not_yet_valid` \| `active` \| `expired`), calculado al leer en `America/Santiago`; `unknown` = sin licencia registrada.
12. **Un recorte automático no es una pieza.** `crop_*` es un derivado rotulado `automatic: true`; nunca crea `asset_version` ni cuenta como aprobado.

## 4. Contrato API v1

- Base `/api/v1`. Documento `GET /api/v1/openapi.json` (OpenAPI 3.1, versión **1.2.0** desde TASK-1893: descarga de originales, derechos y evidencia de publicación).
- **Registro único:** toda operación nace en `packages/contracts/src/operations.ts` con `exposure` = `tool` (se federa a agentes) o `exclusion` (con razón). De ese registro se derivan el OpenAPI y el manifiesto de tools (§4.1), y un test de paridad lo compara con los route handlers reales: una ruta sin entrada, o una entrada sin ruta, rompe `pnpm check`. Las descripciones salen del glosario `semantics.ts`. La paridad queda así garantizada por construcción, no por revisión.
- Formato de error canónico (mismo espíritu que Greenhouse): `{ "error": "<es-CL seguro>", "code": "<snake_case estable>", "actionable": <bool> }`. Nunca stack traces, SQL ni rutas.
- `X-Correlation-Id` se acepta y se devuelve.

| # | Método y ruta | `operationId` | Exposición |
|---|---|---|---|
| 1 | `GET /api/v1/attention` | `getAttention` | tool `studio.attention.get` — decisiones pendientes, próximas publicaciones e inventario |
| 2 | `GET /api/v1/campaigns` | `listCampaigns` | tool `studio.campaigns.list` |
| 3 | `GET /api/v1/campaigns/{campaignId}` | `getCampaign` | tool `studio.campaign.get` |
| 4 | `GET /api/v1/campaigns/{campaignId}/assets` | `listCampaignAssets` | tool `studio.campaign.assets.list` (filtros `kind`, `ratio`, `conceptId`) |
| 5 | `GET /api/v1/assets/{assetId}` | `getAsset` | tool `studio.asset.get` — pieza + versiones con renditions + anuncios que la usan + copys de su concepto |
| 6 | `GET /api/v1/assets/{assetId}/preview?size=thumb\|preview` | `getAssetPreview` | tool `studio.asset.preview` — por defecto `thumb` (640 px); `preview` (1600 px) sólo si hace falta detalle |
| 7 | `GET /api/v1/campaigns/{campaignId}/copies` | `listCampaignCopies` | tool `studio.campaign.copies.list` (filtros `channel`, `conceptId`) |
| 8 | `GET /api/v1/campaigns/{campaignId}/ads` | `listCampaignAds` | tool `studio.campaign.ads.list` |
| 9 | `GET /api/v1/campaigns/{campaignId}/plan` | `getCampaignPlan` | tool `studio.campaign.media_plan.get` — flight, audiencias y presupuesto por `kind` |
| 10 | `GET /api/v1/campaigns/{campaignId}/posts` | `listCampaignPosts` | tool `studio.campaign.posts.list` — calendario orgánico con estado observado |
| 11 | `GET /api/v1/calendar?from&to` | `getCalendarRange` | tool `studio.calendar.get` — vuelos y publicaciones en `[from, to)` con `overdue` |
| 12 | `GET /api/v1/search?q` | `search` | tool `studio.search` — campañas, piezas y copys (mínimo 2 caracteres) |
| 13 | `GET /api/v1/renditions/{renditionId}` | `getRendition` | exclusión: transporte por id interno de rendition (compatibilidad); un agente usa `studio.asset.preview` |
| 14 | `GET /api/v1/media/{token}` | `getMedia` | exclusión: transporte de los enlaces firmados que devuelven los readers para la web (§7.1) |
| 15 | `GET /api/v1/health` | `getHealth` | exclusión operacional: `status`, `database` (`reachable`/`unreachable`), `accessMode`, `version`; 503 si la base no responde |
| 16 | `GET /api/v1/openapi.json` | `getOpenApi` | exclusión: metadato del contrato |
| 17 | `GET /api/v1/tool-manifest` | `getToolManifest` | exclusión: artefacto que consume el gateway para federar |

- **Organización:** toda lectura acepta `organizationId` (id canónico `org-…`). **Intersecta, nunca amplía**: una organización fuera de lo visible responde 404 (anti-oráculo); en modo `open` restringe el resultado.
- Paginación por cursor opaco en listas que pueden crecer (`assets`, `ads`, `copies`); orden estable por ID.
- **Escrituras:** hoy no hay escrituras HTTP. El import corre por CLI con credencial de migrador. Los commands (crear campaña, versionar asset, revisar copy, aprobar) llegan en TASK-1894 con `Idempotency-Key` + digest, `If-Match` por `revision` y auditoría, y nacen en el mismo registro con su tool de clase `write` o una exclusión con razón.

## 4.1 Agentes y Efeonce MCP

**Manifiesto.** `studio-tool-manifest.v1`, derivado del registro de operaciones: las 12 tools de lectura y las 5
exclusiones con razón de la tabla anterior. Cada tool lleva descripción para agentes (cuándo usarla, qué NO significa,
qué hacer después), `inputSchema`/`output` autocontenidos (sin `$ref`), las cuatro `annotations` (`readOnlyHint`,
`destructiveHint`, `idempotentHint`, `openWorldHint`), la capability de Greenhouse (`marketing_studio.campaign.read`) y
el scope de API (`studio:read`). El artefacto `packages/contracts/generated/tool-manifest.json` incluye `manifestHash`
= sha256 del JSON (hoy `96d1f0caf6e5…`) y se sirve en `GET /api/v1/tool-manifest`.

- `pnpm mcp:manifest:generate` regenera el artefacto; `pnpm mcp:manifest:check` (dentro de `pnpm check`) falla si difiere.
- Tests: una tool o exclusión por operación, nombres únicos `studio.*`, readOnly, schemas autocontenidos, paridad con los route handlers, determinismo, artefacto idéntico y leak test (mismas prohibiciones que los manuales MCP de Greenhouse). Los detectores se vieron fallar antes de confiar en su verde.

**Regla del programa.** Toda capacidad nueva de Studio nace en el registro con su tool o una exclusión con razón. Todo
lo que se puede hacer en la UI se puede hacer por API y por MCP, **incluidas las aprobaciones**: las decide una
persona; un agente las ejecuta con la identidad delegada de esa persona (TASK-1894 / TASK-1899).

**Autoridad de la persona (lectura).** Studio no conoce personas. La autorización por persona ocurre en Greenhouse:

1. La persona usa una herramienta `studio.*` en `mcp.efeonce.org` con su token Entra.
2. El provider `marketing-studio` del gateway canjea ese token por RFC 8693 en
   `https://greenhouse.efeoncepro.com/api/integrations/v1/sister-platforms/oauth/token`, con el cliente
   `efeonce-mcp-marketing-studio` (input scope `efeonce.mcp.read`, scope pedido `marketing_studio.campaign.read`).
3. Greenhouse ejecuta `can(persona, 'marketing_studio.campaign.read', 'read', 'tenant')`
   (`authorizeMarketingStudio` en `src/lib/sister-platforms/mcp-token-exchange.ts`). Grant: `efeonce_admin`,
   `efeonce_account`, `efeonce_operations`.
4. Sólo si se aprueba, el gateway llama a Studio con su **bearer de servicio** (`api_client`, secreto
   `marketing-studio-mcp-gateway-token`), acotado por organización. El token canjeado nunca viaja a Studio.

Errores del provider hacia el agente: `forbidden`, `not_found` (anti-oráculo), `upstream_unavailable`,
`invalid_request`. `studio.asset.preview` devuelve contenido `image`. El issuer nativo `auth.efeonce.org` está en
`unsupported` para este provider (`marketing_studio_native_policy_missing`): el contexto interno v2 sólo delega
`growth.seo.observation.read` y sumar Studio exige consentimiento nuevo (D10).

**Estado del provider (2026-09-26).** En producción. El gateway `958c9de30` (1.8.0 más el fix `efeoncepro/efeonce-mcp#20`) sirve `efeonce-mcp-gateway-00061-sbc` al 100 % con `MARKETING_STUDIO_PROVIDER_ENABLED=true`, tras el release de Greenhouse `0e87c7a443a2`, que publicó el canje y el manual. Hubo una migración correctiva (`20260926071321910`): la política del cliente de canje traía `requireOnPrivilegedAction=false` y el esquema V1 exige `true`, así que el canje respondía 503. Una sesión MCP real con un token del cliente público devolvió datos de producción en `attention`, `campaigns` (5), `campaign` y `asset`, un preview WebP de 640×360, `not_found` para una organización ajena y el provider `enabled` en `efeonce.gateway.status`. El manifiesto se sincroniza con `pnpm studio:manifest:sync` (genera `src/providers/marketing-studio-tool-manifest.generated.ts`, con hash verificado al cargar), y el guard `marketing-studio-tool-parity.ts` compara de forma bidireccional el manifiesto, el `appliesTo` del manual y las escrituras sin clase.

**Manual servido.** `docs/mcp/skills/marketing-studio/SKILL.md` (audiencia `internal`), por `get_greenhouse_skill`. Su
entrada en `src/mcp/greenhouse/skill-manifest.ts` declara `provider: 'marketing-studio'`: Greenhouse valida el prefijo
`studio.` y el gateway verifica que cada tool exista en el artefacto sincronizado.

## 5. Acceso

| Modo (`STUDIO_ACCESS_MODE`) | Comportamiento | Estado |
|---|---|---|
| `open` | Lecturas abiertas sin login, por decisión del operador (2026-09-25). Sin escrituras HTTP. `X-Robots-Tag: noindex, nofollow` + `robots.txt` disallow. | **Vigente** |
| `efeonce_id` | Login first-party con `auth.efeonce.org` (Efeonce ID, relying party). La API exige sesión o bearer de `api_client`; organización derivada del actor. Hoy falla cerrado. | TASK-1898, **última del programa** por decisión del operador |

Riesgo aceptado del modo `open`: cualquiera con la URL ve presupuestos propuestos, copys y audiencias. Se revierte
cambiando el modo cuando exista el relying party. Aun en `open`, cada reader recibe un `Actor`
(`{ kind: 'anonymous_open' }`), para que activar `efeonce_id` sea configuración y no refactor.

**Bearer de servicio (TASK-1890).** `Authorization: Bearer mst_…` (47 caracteres) resuelve un `studio.api_client`
activo (se guarda sólo el sha256; scope `studio:read`, único valor admitido hoy) con sus `organization_ids`. Un token
inválido, revocado o mal formado responde **401 aunque el modo sea `open`** (nunca se degrada a anónimo); sin
cabecera rige el modo vigente. Alta y revocación sólo por CLI de operador (`pnpm api-client:create|revoke`), con
`audit_event`; el token se imprime una vez. Verificado en producción: 200 con bearer, 404 con organización ajena,
401 con token inválido, 200 en la web sin bearer.

**Organización canónica.** `campaign.organization_id` guarda el id canónico de Greenhouse (`org-…`) con `CHECK` de
prefijo; el público `EO-ORG-####` es sólo presentación y el importador lo rechaza.

## 6. Persistencia y conexión

- Instancia compartida `greenhouse-pg-dev`, **base propia**. Postgres no permite joins entre bases: la separación con Greenhouse la impone el motor.
- Roles, creados por SQL (`SET ROLE cloudsqlsuperuser`), **nunca** con `gcloud sql users create` (los metería en `cloudsqlsuperuser`):

| Rol | Uso | Límite de conexiones |
|---|---|---|
| `marketing_studio_migrator` | dueño de ambas bases, DDL | 5 |
| `marketing_studio_runtime` | NOLOGIN, DML; sin `UPDATE/DELETE` sobre la auditoría | — |
| `marketing_studio_app` | runtime de producción, `CONNECT` sólo a `marketing_studio` | **20** |
| `marketing_studio_staging_app` | runtime de preview/development, `CONNECT` sólo a staging | 10 |
| `marketing_studio_worker` / `marketing_studio_staging_worker` | worker de medios en Cloud Run (TASK-1893), miembro de `marketing_studio_runtime`, `CONNECT` sólo a su base (`scripts/ops/sql/media-worker-roles.sql`) | 6 |

- `PUBLIC` sin `CONNECT` sobre las bases de Studio. **Riesgo residual verificado:** `greenhouse_app` conserva el `CONNECT` de PUBLIC, así que los roles de Studio pueden abrir sesión allí, pero no leen ninguna tabla ni alcanzan funciones `SECURITY DEFINER`. Cerrarlo es TASK-1897.
- Runtime en Vercel: `@google-cloud/cloud-sql-connector` con **usuario y contraseña** (la instancia no tiene `cloudsql.iam_authentication`; activarlo tocaría la instancia compartida con Greenhouse). La contraseña se resuelve server-side desde Secret Manager con credenciales WIF (`@vercel/oidc` → pool `vercel`, provider `greenhouse-eo`, subject `owner:efeonce-7670142f:project:efeonce-marketing-studio:environment:<env>`). Producción impersona `marketing-studio-runtime@`; preview y development, `marketing-studio-runtime-stg@`, que no puede leer el secreto ni el bucket de producción. Sin claves JSON.
- Pool por instancia de función: `STUDIO_PG_MAX_CONNECTIONS`, por defecto 3 en Vercel y 5 fuera.
- Migraciones SQL-first en `packages/database/migrations/`, tabla `public.studio_pgmigrations`, con `-- Up Migration` / `-- Down Migration` y bloque `DO … RAISE EXCEPTION` de verificación post-DDL.
- Ambientes: `production` → `marketing_studio`; `preview` y `development` → `marketing_studio_staging`.

## 7. Import desde OneDrive (corte de autoridad)

- Fuentes: `Campaign Manager/CATALOGO-DATOS.json` (proyección que consolida manifiestos, copys, anuncios, audiencias, flight y posts) + registro semilla del repo + readback de Metricool por campaña.
- CLI `pnpm import:catalog --catalog <CATALOGO-DATOS.json> [--registry scripts/seeds/campaign-registry.json] [--readback CMP-###=<ruta>] [--apply]`: dry-run por defecto con conteos por entidad; `--apply` en una transacción; registra `import_run` con digest de la fuente.
- El import registra cada versión como `onedrive_provenance` con ruta relativa a `Alineación/5. Contenidos` + sha256. La copia verificada del original en GCS la hace después `pnpm media:ingest` (§7.2); un reimport respeta las versiones ya en `gcs` y, si el catálogo trae la huella de un archivo que antes venía sin ella (misma ruta), la adopta en la misma versión en vez de crear una nueva.
- El registro semilla (`scripts/seeds/campaign-registry.json`) fija por campaña los tres estados, `organization_id`, CDR y, cuando la campaña no tiene manifiesto, sus conceptos y piezas: CMP-003 (video V17 y portada V4, CDR-009), CMP-004 (C01–C04, CDR-010), CMP-005 (S01–S03, CDR-011).
- **Corte:** hasta que existan commands de escritura (TASK-1894), OneDrive sigue siendo la fuente y Studio una proyección reimportable. El corte se declara por campaña; nunca se escribe en los dos lados.

## 7.1 Renditions e imágenes

- CLI `pnpm media:renditions --root <5. Contenidos> --bucket <bucket> [--apply] [--force]`: por cada versión vigente genera `thumb` (lado largo 640 px) y `preview` (1600 px) en WebP con `sharp`; los videos usan el cuadro del segundo 1 (ffmpeg). Sube sin sobrescribir (`ifGenerationMatch=0`) a `renditions/<asset_version_id>/<kind>-<sha12>.webp` y hace upsert de la fila. Idempotente. 108 renditions por bucket.
- Buckets privados por ambiente (`efeonce-marketing-studio-media` / `-staging`, us-east4). La web nunca expone URLs de GCS.
- **Enlaces firmados sin base.** Los readers devuelven `thumbUrl`/`previewUrl` como `/api/v1/media/{token}`: payload `{bucket, objeto, mime, expiración}` firmado con HMAC-SHA256 (`STUDIO_MEDIA_URL_SECRET`, ≥ 32 caracteres, distinto por ambiente). La expiración se redondea a la semana (el enlace vive entre una y dos semanas) para que la caché del navegador sirva. El endpoint verifica firma, vencimiento, mime y prefijo `renditions/` y sirve el objeto **sin consultar Postgres**: el reader ya autorizó la campaña al armar la respuesta. Sin secreto, los readers caen a `/api/v1/renditions/{id}`, que sí consulta la base. Rotar el secreto invalida los enlaces vigentes; la página los regenera al recargar.
- **Incidente 2026-09-25 (origen del diseño):** con una consulta Postgres por miniatura, una grilla de 20+ agotaba el tope de 20 conexiones de `marketing_studio_app` (`too many connections for role`); reproducido: 18 de 40 pedidos simultáneos devolvían 500. Con enlaces firmados: 108 de 108 pedidos simultáneos OK en producción. `MediaImage` reintenta una vez y, si vuelve a fallar, muestra «Vista previa no disponible» en el mismo espacio.
- Para versiones con original en GCS, las renditions las genera el worker de medios (§7.2); `media:renditions` queda para versiones que siguen sólo en OneDrive y usa el mismo toolkit del dominio.

## 7.2 Almacén de originales y worker de medios (TASK-1893)

Estado: **code complete, rollout pendiente** (buckets, SA, Pub/Sub, Cloud Run, Scheduler, migración de producción,
ingesta y release de Greenhouse). Runbook: [`MARKETING_STUDIO_RUNTIME_HANDOFF.md`](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md) §Originales y worker.

- **Buckets** `efeonce-marketing-studio-originals` / `-staging` (us-east4, Standard, UBLA, PAP `enforced`, versionado,
  soft delete 30 días, labels `app`/`env`). Lifecycle: no vigentes se borran a los 30 días; `daysSinceCustomTime > 30`
  → Nearline y `> 365` → Coldline. Sólo finales: allowlist `image/png|jpeg|webp`, `video/mp4|quicktime`,
  `audio/mpeg|wav|aac`, `application/pdf`; formatos de trabajo (PSD, AEP, AI, INDD, PRPROJ, comprimidos) rechazados por
  extensión **y** por firma de bytes.
- **Ingesta** (`pnpm media:ingest`, primitive `ingestOriginals`): sólo versiones de `studio.asset_version`; sha256 local
  = sha256 del catálogo (si no, `drift`); crc32c local = el que devuelve GCS; subida reanudable con
  `ifGenerationMatch=0` y metadata `sha256`; en una transacción: `media_object` (upsert), versión a `gcs` con guarda de
  estado previo, ruta de OneDrive a `provenance.onedrive_path`, `audit_event asset_version.original_ingested`. Conteos
  `to_upload`, `dedup`, `already_gcs`, `drift`, `rejected`, `missing_local`, `unverifiable` (el catálogo no trae huella).
  Dry-run por defecto; reversible con `--revert-provider` (los objetos quedan). La CLI exige que el bucket corresponda
  a la base (`marketing_studio` ↔ originales de producción).
- **Descarga** `GET /api/v1/assets/{assetId}/versions/{versionNo}/download` (tool `studio.asset.download`, capability
  `marketing_studio.asset.download`, scope `studio:assets:download` además de `studio:read`): JSON `{ url, expiresAt,
  filename, mimeType, byteSize, sha256, rights }`. URL V4 de 10 min firmada por IAM `signBlob` con la SA del runtime
  (sin claves JSON), `response-content-disposition: attachment; filename="<assetId>-v<n>.<ext>"`. Compuertas: flag
  `STUDIO_ORIGINAL_DOWNLOADS_ENABLED` y actor `api_client` (el anónimo del modo open recibe 403 `download_disabled`),
  scope (403 `forbidden`), organización (404), versión en el bucket del ambiente (404 `original_not_stored`). Cada
  emisión deja `audit_event asset_version.download_issued`. Firma verificada byte a byte contra `@google-cloud/storage`.
- **Derechos** por versión: command `setAssetVersionRights` (CLI `pnpm media:rights`, con `audit_event` que guarda el
  estado anterior); la API de escritura nace con TASK-1894. DTO de versión: `mimeType`, `durationMs`, `pageCount`,
  `storage.available`, `rights`; el detalle agrega `posterUrl` y `placementPreviews[] { aspectRatio, url, automatic }`.
  `storagePath` sigue siendo la ruta de trabajo (en `gcs` se lee de `provenance.onedrive_path`); el nombre del objeto
  nunca sale del servidor.
- **Worker** `apps/worker` (Node 24, `node:http`, ffmpeg + sharp) en Cloud Run `marketing-studio-media-worker[-staging]`:
  privado (`run.invoker` sólo para `marketing-studio-invoker@`), 0–3 instancias, concurrencia 1, 2 vCPU / 2 GiB, 900 s,
  pool PG de 2 con su propio rol. `apps/worker/deploy.sh` es la fuente de verdad de sus variables.
  - `POST /events/original-finalized`: push de Pub/Sub (`OBJECT_FINALIZE` del bucket de originales, prefijo
    `originals/`; ack 600 s, backoff 10–600 s, DLQ `…-dlq` tras 5 intentos). Si la fila `media_object` aún no existe
    responde 503 (reintento); eventos que nunca podrán procesarse se confirman con 204 y quedan `skipped`.
  - `POST /jobs/reconcile-derivatives` (Scheduler, cada hora): repara versiones `gcs` sin derivados o desactualizados
    en lotes de 20 y, con `MEDIA_WORKER_ARCHIVE_TIERING_ENABLED`, fija `customTime` de objetos cuyas campañas cerraron
    todas (archivada o lanzamiento `ended`). GCS no permite retroceder `customTime`: una campaña reabierta sale como
    `tiering_reopened` y se reescribe a Standard a mano (runbook).
  - `POST /jobs/metricool-readback` (Scheduler, cada 30 min, sólo producción): posts con fecha en las últimas 72 h o sin
    estado terminal; lee el estado real por marca y agrega `post_observation`; actualiza `provider_status`,
    `observed_at`, `observation_source = 'metricool_api'` y, sólo si el proveedor dice publicado, `published_at` y
    `permalink`. Sin token o `userId`, falla cerrado con `not_configured`.
  - Derivados: `thumb`/`preview` WebP, `poster` JPEG del segundo 1 y `crop_*` **sólo** para proporciones que el
    concepto no tiene como pieza real. Decisión de Discovery (2026-09-26): 14 de 16 combinaciones concepto × tipo ya
    tienen 3–4 formatos reales; el recorte queda como vista previa de colocación rotulada, no como pieza.
  - Flags `MEDIA_WORKER_DERIVATIVES_ENABLED`, `MEDIA_WORKER_METRICOOL_READBACK_ENABLED`,
    `MEDIA_WORKER_ARCHIVE_TIERING_ENABLED` (default `false`): apagados, el worker responde 2xx y registra `skipped`.
- **Frontera:** la web nunca importa `@studio/database/storage-write`, `@studio/domain/worker`,
  `@studio/domain/media-toolkit` ni `sharp` (`domain-boundary-gate`); el dominio usa puertos y no los adapters de escritura.
- **Infraestructura como código:** scripts `gcloud` idempotentes con dry-run por defecto (misma convención que
  TASK-1896): `scripts/ops/infra/media-originals.sh --env <env> [--wiring] [--apply]` y `apps/worker/deploy.sh`.
  No se adoptó Terraform: el repo no lo usa.

## 8. Interfaz

- Diseño aprobado por el operador el 2026-09-25 (artifact «v2 · Claro y oscuro»).
- Tema generado desde `@efeoncepro/axis-tokens@0.2.5` (`apps/web/scripts/generate-theme.mjs` → `theme.generated.css`); `theme:check` en el typecheck falla si el paquete y el CSS divergen. Roles de superficie por tema (app, chrome, inset, card, elev, selected) sobre los valores AXIS.
- Claro/oscuro con switch; preferencia en la cookie `studio-theme`, leída en el servidor (sin parpadeo). Poppins (display) y Geist (texto) vía `next/font`.
- Pantallas: Hoy (decisiones), Campañas (hero + tarjetas con pista de tres estados), espacio de campaña (piezas concepto × formato con inspector y preview; copys; anuncios; medios; calendario), Calendario mensual (vuelos por semana, posts vencidos a verificar), Piezas (`/library`) y Medios. Búsqueda ⌘K. Bajo 860 px, navegación inferior.
- **Vista previa por formato:** 9:16 se muestra como story; 1:1, 4:5 y 16:9 en tarjeta de feed con su proporción real (antes un `max-height` de 320 px recortaba).
- Logos oficiales (`public/brand/`) copiados de `greenhouse-eo/public/branding/`.
- Flujo maestro y huecos conocidos (p. ej. `/library` no alcanzable a 390 px): `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md`; la UI de edición es TASK-1895.

## 9. Observabilidad y operación (TASK-1896)

Estado: **code complete, rollout pendiente** (proyecto Sentry, variables de Vercel, uptime check, rol y job del
ensayo, secreto del cliente de Greenhouse y release de Greenhouse). Runbooks:
[`MARKETING_STUDIO_RUNTIME_HANDOFF.md`](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md) y
[`MARKETING_STUDIO_RESTORE_RUNBOOK.md`](../../operations/marketing-studio/MARKETING_STUDIO_RESTORE_RUNBOOK.md).

### 9.1 Errores y logs

- Paquete `packages/observability`: `scrubEvent`/`scrubValue` (fuera `Authorization`, `Cookie`, `Set-Cookie`, cuerpos,
  cookies, variables de entorno; tokens `mst_`, bearers, JWT, enlaces firmados `/api/v1/media/{token}` y credenciales en
  URLs tapados en cualquier string), `captureWithDomain(error, domain)` sobre `@sentry/core` (misma forma que el de
  Greenhouse, sin importarlo), `initSentry(service)` para job y worker, `logEvent` (una línea JSON).
- Web: `@sentry/nextjs` 11 (`src/instrumentation.ts`, `instrumentation-client.ts`, `sentry.{server,edge}.config.ts`),
  `sendDefaultPii: false`, trazas al 5 %. Sin `SENTRY_DSN` no inicializa. Source maps sólo con `SENTRY_AUTH_TOKEN`.
  Proyecto `efeonce-marketing-studio` en la org `efeonce-group-spa`, environments `production` y `preview`.
- Un test de extremo a extremo arma un evento con cabeceras, cookies, cuerpo y tokens, lo pasa por el SDK real con las
  opciones de Studio e inspecciona el sobre que saldría: falla si algo sensible sale (corre en `pnpm check`).
- Regla: nada de `Sentry.captureException` suelto en `packages/domain` ni en rutas; siempre `captureWithDomain`.
- **Id de request:** `X-Correlation-Id` del cliente (el gateway MCP lo manda), si no `x-vercel-id`, si no uno nuevo. Toda
  respuesta dinámica de `/api/v1` lo devuelve y deja una línea JSON `studio_request` con `requestId`, `route`, `method`,
  `status`, `durationMs`, `domain` y `code`. Los 5xx de `/api/v1/media` y `/api/v1/renditions` quedan contables por
  esas líneas (`route` + `status`) y en Sentry. `openapi.json` y `tool-manifest` son estáticas (sin id).

### 9.2 Health

- `GET /api/v1/health` (público, uptime check): `SELECT 1`; 200 o 503. Sin cambios de contrato.
- `GET /api/v1/health?deep=1` con `Authorization: Bearer` de un `api_client` con scope **`studio:health`** (nuevo en
  `API_SCOPES`; no da lectura de campañas): `HealthDeep { status, version, accessMode, observedAt, components[],
  freshness[] }` (`packages/contracts/src/health.ts`, schema estricto). Sin cabecera `Authorization` responde el
  superficial; token inválido 401; sin el scope 403; 503 sólo si la base no responde.
- Componentes: `database` (latencia; > 800 ms degraded), `database_connections` (conexiones abiertas del rol de la app
  contra su tope: ≥ 70 % degraded, ≥ 90 % down — el modo de falla del incidente del 2026-09-25), `media_bucket` (listar
  un objeto con el SA del ambiente), `greenhouse_metrics` (TASK-1892) y `media_worker` (última fila de
  `studio.worker_run`, TASK-1893). Lo que aún no existe es `not_configured`, detectado en runtime (`to_regclass`,
  columnas en `information_schema`): no degrada ni cuenta como sano.
- Frescura, siempre desde la corrida registrada y nunca desde el dato: `catalog_import` (`import_run`/`ops_run`, 7 días),
  `pending_renditions` (versiones de imagen/video con más de 1 h sin miniatura o preview), `overdue_unverified_posts`
  (`PENDING` con más de 2 h de vencido), `metricool_readback` (48 h, sólo con campañas activas; lee `ops_run` y
  `worker_run.kind = 'metricool_readback'`), `restore_rehearsal` (45 días; fallido o vencido = `down`; nunca corrido =
  `degraded`), `rights_expiring` (versiones cuyo uso vence en 14 días; `not_configured` sin la columna de derechos).
- Umbrales en un solo módulo: `packages/domain/src/health/thresholds.ts`. Estado global: `down` si la base no
  responde; `degraded` si algo más está degradado o caído; si no, `ok`.

### 9.3 Registro de corridas

`studio.ops_run` (migración `1790409464603_ops-run`): `process`, `mode`, `status running|succeeded|failed|partial|
cancelled`, `actor`, `started_at`, `finished_at`, `counts`, `error_code`, `correlation_id`. Índice único parcial
`(process) WHERE status = 'running'` = una corrida a la vez; trigger: sólo `running → terminal`, sin borrados.
`recordOpsRun` envuelve `import:catalog` (y `metricool_readback` cuando trae `--readback`) y `media:renditions` sin
romperlos si el registro falla. El worker de TASK-1893 registra en su propia `studio.worker_run`.

### 9.4 Restauración verificada

- La instancia es compartida con Greenhouse: **nunca** se restaura, clona ni hace PITR sobre ella para recuperar Studio.
  La recuperación es lógica y por base; el camino de punto exacto usa PITR a una instancia **nueva** y extrae sólo
  `marketing_studio`.
- Postura verificada 2026-09-26 (sólo lectura): backups automáticos 7 retenidos a las 07:00 UTC, PITR con 7 días de logs.
- Ensayo `pnpm ops:restore-rehearsal`: conteo y `pg_dump --snapshot` sobre el mismo snapshot `REPEATABLE READ`, base
  temporal `marketing_studio_restore_<16 hex>`, paridad por tabla del schema `studio`, `DROP` siempre y verificado,
  `ops_run` + `audit_event`. Rol dedicado `marketing_studio_restore` (por SQL, `CREATEDB`, sin `CREATEROLE`, tope 3).
  Cloud Run Job `marketing-studio-restore-rehearsal` + Scheduler pausado hasta el primer ensayo verde; dump conservado
  30 días en `efeonce-marketing-studio-restore-dumps`.

### 9.5 Alertas

- **Por su cuenta (no depende de Greenhouse):** uptime check de Cloud Monitoring sobre el health superficial cada
  5 min desde 4 regiones, alerta si falla en ≥ 2 regiones durante 10 min, email al operador (correo laboral); Sentry:
  issue nuevo en `production`, regresión y más de 10 eventos en 5 min, al mismo email.
- **En Greenhouse:** una señal agregada `platform.marketing_studio.health` (`kind: runtime`, módulo `platform`) que lee
  el health profundo por HTTP con el secreto `greenhouse-marketing-studio-health-token` (nunca SQL a la base de Studio):
  `error` si un componente o el ensayo está `down`, `warning` con cualquier degradación, `ok` con `not_configured`,
  `unknown` sin credencial o sin respuesta. Aviso diario a Teams **«EO - Admin»** (destino
  `marketing-studio-reliability-alerts`, decisión del operador 2026-09-26) sólo en `error`, desde el ops-worker
  (`POST /marketing-studio/health-watch`, scheduler `ops-marketing-studio-health-watch`, nace pausado). Studio nunca
  recibe credenciales del bot de Teams.

### 9.6 SLOs (producto interno, sin error budget formal ni guardia fuera de horario)

| SLO | Objetivo | Medición |
|---|---|---|
| Disponibilidad de `/api/v1/health` | 99,5 % mensual | uptime check de Cloud Monitoring |
| Errores 5xx en `/api/v1` | < 1 % de requests por semana | Sentry + líneas `studio_request` de Vercel |
| Latencia de lecturas de colección | p95 < 800 ms | trazas muestreadas de Sentry + `durationMs` |
| Frescura del readback de Metricool | ≤ 48 h con campañas activas | health profundo |
| Restauración verificada | 1 ensayo exitoso cada ≤ 45 días; RTO medido | `studio.ops_run` |

### 9.7 Costo mensual estimado (a verificar tras el primer mes)

| Pieza | Estimación |
|---|---|
| Sentry | dentro del plan de la org `efeonce-group-spa` si la cuota compartida lo permite (trazas al 5 %) — **pendiente confirmar plan y cuota** |
| Uptime check (4 regiones × cada 5 min ≈ 35 k ejecuciones/mes) + 1 política | dentro del tramo gratuito de Cloud Monitoring |
| Cloud Run Job mensual (1 vCPU, 1 GiB, minutos) + Scheduler | céntimos de USD |
| Bucket de dumps (KB–MB, retención 30 días) | prácticamente cero |
| Artifact Registry (una imagen) + Cloud Build (un build por cambio) | céntimos de USD |

## 10. Programa pendiente (EPIC-049)

| Task | Qué entrega | Estado |
|---|---|---|
| TASK-1887 | Fundación | Complete |
| TASK-1890 | Registro de operaciones, manifiesto, semántica, bearer, organización canónica, capability, manual | Code complete; falta servir el manual en producción (release de Greenhouse) |
| TASK-1891 | Provider `marketing-studio` en el gateway | Gateway 1.8.0 desplegado con flag OFF; falta release de Greenhouse → flag ON → canary |
| TASK-1893 | Originales en GCS + worker de medios | To-do |
| TASK-1896 | Observabilidad, alertas y restauración | In-progress: code complete (Studio + Greenhouse), rollout pendiente |
| TASK-1892 | Métricas desde Greenhouse (GA4 aún no en producción: TASK-1284) | To-do |
| TASK-1894 | Commands de escritura, brief como entidad, corte de autoridad, subida firmada | To-do |
| TASK-1895 | UI de edición, revisión y métricas | To-do |
| TASK-1899 | Escrituras y aprobaciones por MCP (scopes `.write`/`.approve`, identidad delegada) | To-do |
| TASK-1897 | Revocar `CONNECT` de PUBLIC en `greenhouse_app` | To-do |
| TASK-1898 | Login con Efeonce ID | To-do, última |

Orden: 1890 → 1891 · 1893 · 1896 → 1892 → 1894 → 1895 · 1899 → 1897 → 1898.

## 11. Referencias

- ADR: [`EFEONCE_STUDIO_API_FIRST_DECISION_V1.md`](../EFEONCE_STUDIO_API_FIRST_DECISION_V1.md)
- Runtime handoff: [`MARKETING_STUDIO_RUNTIME_HANDOFF.md`](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md)
- Gateway: [`EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) §Provider Marketing Studio
- Invariantes de superficie MCP: [`MCP_TOOL_SURFACE_INVARIANTS.md`](../agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md)
- Registro de campañas: [`EFEONCE_CAMPAIGN_REGISTRY_V1.md`](../../operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md)
- Manifiesto de pauta: [`EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md`](../../operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md)
- Precedente de repo hermano gobernado desde Greenhouse: [`creative-studio/`](../creative-studio/)
