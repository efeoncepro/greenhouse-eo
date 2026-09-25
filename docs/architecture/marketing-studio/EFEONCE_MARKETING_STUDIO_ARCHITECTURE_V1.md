# Efeonce Marketing Studio — Arquitectura V1

> **Tipo:** arquitectura técnica (contrato para agentes y desarrolladores)
> **Versión:** 1.2
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Estado:** Accepted. En vivo en `https://studio.efeonce.org` desde 2026-09-25 (TASK-1887)
> **Decisión gobernante:** [`EFEONCE_STUDIO_API_FIRST_DECISION_V1.md`](../EFEONCE_STUDIO_API_FIRST_DECISION_V1.md) (principio 2026-09-23 + delta de placement 2026-09-25)
> **Programa:** [`EPIC-049`](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md)

## 0. Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Código de la plataforma | Repo `efeoncepro/efeonce-marketing-studio` (privado). **Sólo código**: sin ADRs, arquitectura, runbooks, handoff ni changelog. |
| Arquitectura, ADRs, EPIC, tasks, manuales, handoff | **Este repo** (`greenhouse-eo`), bajo `docs/architecture/marketing-studio/`, `docs/epics/`, `docs/tasks/`, `docs/documentation/marketing-studio/` y `docs/manual-de-uso/marketing-studio/`. Mismo patrón que Globe. |
| Decisiones de una campaña concreta (CDR) | `docs/campaigns/decisions/` en este repo (sin cambio). |
| Brief, conceptos y assets fuente (hasta el corte) | OneDrive `Alineación/2. Campañas/` y `5. Contenidos/15. Paid Media/`. |
| Datos operativos de campaña (desde el import) | Base `marketing_studio`, schema `studio`. |

Los `AGENTS.md`/`CLAUDE.md` del repo de Studio son **routers** que apuntan a este documento; no son fuente de verdad.

## 1. Qué es y qué no es

Efeonce Marketing Studio (`studio.efeonce.org`) es el **sistema de registro de campañas**: brief, conceptos,
assets y sus versiones, copys por canal y variante, configuraciones de anuncio (pieza × copy × placement ×
audiencia × destino con UTM), plan de medios (flight, mercados, presupuesto propuesto vs aprobado vs real),
calendario orgánico y pagado, revisión/aprobación y publicación.

Nace del prototipo local `ABRIR CAMPAIGN MANAGER.html` (Codex, 2026-09-22/24), que se aprobó como
**referencia de experiencia**, no de implementación.

**No es:**

- **Globe.** Globe («Efeonce Creative Studio») produce y gobierna piezas generadas. Studio consume esos assets por referencia o API y no reimplementa generación, rutas de modelos ni gobierno de derechos de generación.
- **Greenhouse.** Organizaciones, clientes, identidad y acceso de personas siguen siendo de Greenhouse / Efeonce ID. Studio los lee por API; nunca por SQL.
- **Un gestor de pauta en vivo.** Hasta que existan adapters con readback, Studio registra lo preparado y lo observado; no afirma que algo está publicado o activo por inferencia de fecha.

## 2. Topología

```text
                        studio.efeonce.org (Vercel, proyecto efeonce-marketing-studio)
  Navegador ──► apps/web (Next.js App Router)
                   │  páginas: Server Components → mismos readers del dominio
                   │  API:     app/api/v1/**  (route handlers delgados)
                   ▼
            packages/domain  ◄── commands · readers · policy de acceso · errores canónicos
                   │               (sin Next.js, sin React, sin SDK MCP)
            packages/contracts ◄── schemas zod v4 → JSON Schema → OpenAPI 3.1 (/api/v1/openapi.json)
                   │
            packages/database ◄── Kysely + pg; migraciones SQL (node-pg-migrate)
                   │
                   ▼  Cloud SQL Connector + usuario/contraseña de Secret Manager (WIF desde Vercel)
     Cloud SQL greenhouse-pg-dev (efeonce-group:us-east4)
       ├── base greenhouse_app      (Greenhouse — Studio sin privilegios de lectura)
       ├── base marketing_studio          (prod)
       └── base marketing_studio_staging  (staging / preview)

  scripts/ (CLI)  ─► import del catálogo OneDrive · alta de clientes API · verificación
  apps/worker     ─► (futuro, Cloud Run + Scheduler) renditions automáticas, readback de Metricool, publicación programada
  Efeonce MCP     ─► (futuro) adapter fino sobre /api/v1
```

Reglas de capas:

- `packages/domain` no importa `next`, `react`, `@vercel/*` ni el SDK MCP. Recibe un `Database` (Kysely) y un `Actor` por parámetro.
- Los route handlers sólo: resuelven actor, validan entrada contra `packages/contracts`, llaman al dominio y serializan con el contrato. Ninguna regla de negocio vive en un handler ni en un componente.
- Las páginas pueden llamar a los readers en proceso, **con el mismo actor y la misma policy** que usaría la API.
- Funciones de Vercel = request/response. Nada asíncrono crítico en Vercel cron.

## 3. Modelo de dominio

Schema `studio` dentro de la base `marketing_studio`. IDs de negocio legibles preservados del catálogo
(`CMP-001`, `CMP001-01`, `CMP001-01-imagen-16x9`, `copy-01-linkedin-a`), porque son los que ya usan los CDR,
los nombres de archivo y las UTM.

| Entidad | Tabla | Clave | Notas |
|---|---|---|---|
| Campaña | `studio.campaign` | `campaign_id` (`CMP-###`) | `organization_id`, nombre, servicio, fase, audiencia resumida, destino, referencia de brief, `revision` |
| Concepto | `studio.concept` | `concept_id` | pertenece a una campaña; título; orden |
| Asset | `studio.asset` | `asset_id` | tipo `image`/`video`, ratio, concepto |
| Rendition | `studio.asset_rendition` | uuid | derivado liviano de una versión: `thumb` (640 px) o `preview` (1600 px) WebP en bucket privado; único por `(asset_version_id, kind)` |
| Versión de asset | `studio.asset_version` | uuid | nº de versión, `storage_provider` (`onedrive_provenance` \| `gcs`), ruta, bytes, sha256, dimensiones, procedencia jsonb. Única por `(asset_id, sha256)` |
| Copy | `studio.copy_variant` | `copy_id` | canal, variante, texto literal, headline, descripción, CTA nativo, nota editorial, estado |
| Audiencia | `studio.audience` | `(campaign_id, audience_key)` | canal, temperatura, definición jsonb (cargos, tamaños, geos, exclusiones) |
| Configuración de anuncio | `studio.ad_configuration` | `ad_id` | asset × copy × canal × placement × audiencia × objetivo × destino + UTM; `status`, `checks_pending[]` |
| Flight / plan de medios | `studio.media_flight` | uuid | modelo (always-on, burst), fechas, mercados, moneda, alcance del presupuesto, estacionalidad |
| Línea de presupuesto | `studio.budget_line` | uuid | `flight_id`, período `YYYY-MM`, canal (nullable = reserva), monto, **`kind` = `proposed` \| `approved` \| `actual`** |
| Post programado | `studio.scheduled_post` | uuid | proveedor (`metricool`), IDs del proveedor, red, fecha/zona, texto literal, media, **estado observado + `observed_at`** |
| Auditoría | `studio.audit_event` | bigserial | append-only |
| Corrida de import | `studio.import_run` | uuid | fuente, digest, modo, conteos, resultado |
| Cliente API | `studio.api_client` | uuid | hash sha256 del token, scopes, organizaciones permitidas, revocación |

### Invariantes

1. **Los estados no se colapsan.** Una campaña tiene `creative_state`, `media_authorization_state` y `launch_state` separados. Un anuncio preparado no es un anuncio lanzado. Nunca existe un booleano `approved` genérico.
2. **Propuesto, aprobado y real son hechos distintos.** Una línea `proposed` nunca se suma con una `actual`. Ausencia de líneas `actual` ≠ gasto cero.
3. **El copy es literal.** Se almacena exactamente como en la fuente (menciones `@[urn:li:…]`, saltos de línea). Ningún reader lo reescribe.
4. **Estado observado con fecha y fuente.** `scheduled_post.provider_status` siempre va con `observed_at` y `source`. Una fecha pasada no convierte `PENDING` en publicado.
5. **Ausencia no se inventa.** Un campo sin fuente es `null` y el reader lo expone como ausente, no como cero ni como cadena vacía.
6. **Import idempotente.** Reimportar la misma fuente no duplica filas: upsert por ID de negocio; versión de asset nueva sólo si cambia el sha256.
7. **Paid y orgánico conservan destinos distintos** (los posts orgánicos del grader no heredan la UTM del plan paid).

## 4. Contrato API v1

- Base: `/api/v1`. Documento: `GET /api/v1/openapi.json` (OpenAPI 3.1, versión 1.1.0). **Toda operación nace en el registro único `packages/contracts/src/operations.ts`**: de él se derivan el OpenAPI, el manifiesto de tools para agentes (§4.1) y un test de paridad contra los route handlers reales. Las descripciones salen del glosario `semantics.ts`.
- Formato de error canónico (igual espíritu que Greenhouse): `{ "error": "<es-CL seguro>", "code": "<snake_case estable>", "actionable": <bool> }`. Nunca stack traces, SQL ni rutas.
- Lecturas de la fundación:

| Método y ruta | Reader |
|---|---|
| `GET /api/v1/health` | salud (DB alcanzable, versión de schema) |
| `GET /api/v1/campaigns` | lista resumida con conteos y estados |
| `GET /api/v1/campaigns/{campaignId}` | detalle + estados + fuentes |
| `GET /api/v1/campaigns/{campaignId}/assets` | assets con versión vigente; filtros `kind`, `ratio`, `conceptId` |
| `GET /api/v1/campaigns/{campaignId}/copies` | copys; filtros `channel`, `conceptId` |
| `GET /api/v1/campaigns/{campaignId}/ads` | configuraciones de anuncio |
| `GET /api/v1/campaigns/{campaignId}/plan` | flight, audiencias y presupuesto por `kind` |
| `GET /api/v1/campaigns/{campaignId}/posts` | calendario orgánico con estado observado |
| `GET /api/v1/attention` | decisiones pendientes derivadas de estados (presupuesto sin aprobar, posts vencidos en «pendiente», pauta bloqueada, campañas sin piezas), próximas publicaciones e inventario |
| `GET /api/v1/calendar?from&to` | vuelos y publicaciones de todas las campañas en `[from, to)`, con `overdue` y campañas sin fechas |
| `GET /api/v1/search?q` | campañas, piezas y copys (mínimo 2 caracteres) |
| `GET /api/v1/assets/{assetId}` | detalle de una pieza: versiones con renditions, anuncios que la usan y copys de su concepto |
| `GET /api/v1/assets/{assetId}/preview?size=thumb\|preview` | imagen vigente de una pieza para clientes de API y agentes |
| `GET /api/v1/media/{token}` | imagen por enlace firmado (HMAC, vence a la semana): la forma de `thumbUrl`/`previewUrl`; se sirve sin consultar la base |
| `GET /api/v1/renditions/{renditionId}` | imagen por id de rendition, tras verificar la visibilidad (compatibilidad) |
| `GET /api/v1/tool-manifest` | artefacto del manifiesto de tools con `manifestHash` |

- Toda lectura acepta `organizationId` (id canónico `org-…`): filtra dentro de lo visible y nunca amplía; una organización no permitida responde 404. `X-Correlation-Id` se acepta y se devuelve.
- Paginación por cursor opaco en listas que pueden crecer (`assets`, `ads`, `copies`); orden estable por ID.
- **Escrituras:** la fundación no expone escrituras HTTP. El import corre por CLI con credencial de migrador. Los commands HTTP (crear campaña, versionar asset, revisar copy, aprobar) llegan en tasks hijas con idempotencia (`Idempotency-Key` + digest), `If-Match` por `revision` y auditoría, según el ADR.

## 4.1 Agentes y Efeonce MCP (TASK-1890)

- **Manifiesto de tools** `studio-tool-manifest.v1`, derivado del registro de operaciones: 12 tools de lectura `studio.*` y 5 exclusiones con razón (`renditions` y `media` son transporte de la web; `health`, `openapi.json` y `tool-manifest` son operación y metadato). Cada tool lleva descripción para agentes (cuándo usarla, qué NO significa, qué hacer después), `inputSchema`/`output` autocontenidos (sin `$ref`), las cuatro `annotations`, la capability de Greenhouse (`marketing_studio.campaign.read`) y el scope de API (`studio:read`).
- Tools: `studio.attention.get`, `studio.campaigns.list`, `studio.campaign.get`, `studio.campaign.assets.list`, `studio.asset.get`, `studio.asset.preview`, `studio.campaign.copies.list`, `studio.campaign.ads.list`, `studio.campaign.media_plan.get`, `studio.campaign.posts.list`, `studio.calendar.get`, `studio.search`.
- Artefacto `packages/contracts/generated/tool-manifest.json` con `manifestHash = sha256(JSON)`; `pnpm mcp:manifest:generate|check` (el check corre en `pnpm check`). Tests: tool o exclusión por operación, nombres únicos `studio.*`, readOnly, schemas autocontenidos, leak test (mismas prohibiciones que los manuales MCP de Greenhouse), determinismo y paridad con los route handlers. Los tres detectores se vieron fallar antes de confiar en su verde.
- **Regla del programa:** toda capacidad nueva de Studio nace en el registro con su tool o una exclusión con razón. Todo lo que se puede hacer en la UI se puede hacer por API y por MCP, incluidas las aprobaciones (TASK-1894/1899).
- **Autoridad:** Greenhouse registra la capability `marketing_studio.campaign.read` (grant: `efeonce_admin`, `efeonce_account`, `efeonce_operations`), que el gateway verifica para la persona; Studio acota por organización con el `api_client` del gateway (secreto `marketing-studio-mcp-gateway-token`).
- **Manual servido:** `docs/mcp/skills/marketing-studio/SKILL.md` (audiencia `internal`), por `get_greenhouse_skill`. Su entrada del manifiesto de manuales declara `provider: 'marketing-studio'`: Greenhouse valida el espacio de nombres y el gateway, la existencia de cada tool contra el artefacto sincronizado (TASK-1891).
- **Federación en `mcp.efeonce.org` (TASK-1891):** provider `marketing-studio` del gateway. Como Studio no conoce personas, el gateway canjea (RFC 8693) el token Entra de la persona en Greenhouse con el cliente `efeonce-mcp-marketing-studio`, donde se ejecuta `can(persona, 'marketing_studio.campaign.read')`; sólo si se aprueba llama a Studio con su bearer de servicio. El bearer canjeado nunca llega a Studio. Issuer nativo `unsupported` hasta un consentimiento nuevo (D10). Detalle operativo: runbook del gateway §Provider Marketing Studio.

## 5. Acceso

| Modo (`STUDIO_ACCESS_MODE`) | Comportamiento | Estado |
|---|---|---|
| `open` | Lecturas abiertas sin login, por decisión del operador (2026-09-25). Sin escrituras HTTP. `X-Robots-Tag: noindex, nofollow` + `robots.txt` disallow. | **Vigente al lanzar** |
| `efeonce_id` | Login first-party con `auth.efeonce.org` (Efeonce ID, relying party). API exige sesión o token de `api_client`; organización derivada del actor, nunca del request. | Task hija de EPIC-049 |

Riesgo aceptado del modo `open`: cualquiera con la URL ve presupuestos propuestos, copys y audiencias de las
campañas importadas. Se revierte cambiando el modo (redeploy) cuando exista el relying party.

Aun en `open`, el código ya pasa un `Actor` a cada reader (`{ kind: 'anonymous_open' }`), para que activar
`efeonce_id` sea configuración y no refactor.

**Bearer de servicio (TASK-1890, vigente):** `Authorization: Bearer mst_…` resuelve un `api_client` (se guarda sólo el
sha256, activo, scope `studio:read`) con sus organizaciones permitidas. Un token inválido, revocado o mal formado
responde 401 aunque el modo sea `open` (nunca se degrada a anónimo); sin cabecera rige el modo vigente. Alta y
revocación sólo por CLI de operador (`pnpm api-client:create|revoke`), con `audit_event`; el token se imprime una vez.

**Organización:** `campaign.organization_id` guarda el id canónico de Greenhouse (`org-…`), con `CHECK` de prefijo; el
público `EO-ORG-####` es sólo presentación y el importador lo rechaza.

## 6. Persistencia y conexión

- Instancia compartida `greenhouse-pg-dev`, **base propia**. Postgres no permite joins entre bases: la separación con Greenhouse la impone el motor.
- Roles (creados por SQL, **no** con `gcloud sql users create`, que los metería en `cloudsqlsuperuser`): `marketing_studio_migrator` (dueño de ambas bases, DDL), `marketing_studio_runtime` (NOLOGIN, DML; sin `UPDATE/DELETE` sobre la auditoría), `marketing_studio_app` (prod) y `marketing_studio_staging_app` (staging), cada uno con `CONNECT` sólo a su base; `PUBLIC` sin `CONNECT` sobre las bases de Studio.
- **Riesgo residual verificado:** la base de Greenhouse conserva el `CONNECT` por defecto de PUBLIC, así que los roles de Studio pueden abrir sesión en ella, pero no leen ninguna tabla ni alcanzan funciones `SECURITY DEFINER`. Cerrarlo es un cambio en Greenhouse (revocar `CONNECT` a PUBLIC).
- Runtime en Vercel: `@google-cloud/cloud-sql-connector` con **usuario y contraseña** (la instancia no tiene `cloudsql.iam_authentication`; activarlo tocaría la instancia compartida con Greenhouse en prod). La contraseña se resuelve server-side desde Secret Manager con credenciales WIF (`@vercel/oidc` → pool `vercel`, provider `greenhouse-eo`, subject `owner:efeonce-7670142f:project:efeonce-marketing-studio:environment:<env>`). Producción impersona `marketing-studio-runtime@`; preview y development, `marketing-studio-runtime-stg@`, que no puede leer el secreto ni el bucket de producción. Sin claves JSON.
- Pool en Vercel: `max = 3`.
- Migraciones SQL-first en `packages/database/migrations/`, con `-- Up Migration` / `-- Down Migration` y bloque `DO … RAISE EXCEPTION` de verificación post-DDL (mismo oficio que Greenhouse).
- Ambientes: `production` → `marketing_studio`; `preview` y `development` → `marketing_studio_staging`.

## 7. Import desde OneDrive (corte de autoridad)

- Fuentes: `Campaign Manager/CATALOGO-DATOS.json` (proyección generada que ya consolida manifiestos, copys, anuncios, audiencias, flight y posts) + `CAMPANAS.json`.
- CLI `pnpm import:catalog --source <ruta> [--apply]`: dry-run por defecto con conteos por entidad; `--apply` en una transacción; registra `import_run` con digest de la fuente.
- Los originales **no se suben**: `asset_version.storage_provider = 'onedrive_provenance'` con ruta relativa a `Alineación/5. Contenidos` (p. ej. `15. Paid Media/03. Finales/…`, `11. Spot/…`) + sha256.
- El registro semilla del repo (`scripts/seeds/campaign-registry.json`) fija por campaña los tres estados, `organization_id`, CDR y, cuando la campaña no tiene manifiesto, sus conceptos y piezas: CMP-003 (video V17 y portada V4, sha256 de CDR-009), CMP-004 (C01–C04, CDR-010), CMP-005 (S01–S03, CDR-011).

## 7.1 Renditions

- CLI `pnpm media:renditions --root <5. Contenidos> --bucket <bucket> [--apply]`: por cada versión vigente genera `thumb` (lado largo 640 px) y `preview` (1600 px) en WebP con `sharp`; los videos usan el cuadro del segundo 1 (ffmpeg). Sube sin sobrescribir (`ifGenerationMatch=0`) a `renditions/<asset_version_id>/<kind>-<sha12>.webp` y hace upsert de la fila. Idempotente.
- Buckets privados por ambiente (`efeonce-marketing-studio-media` / `-staging`); la web nunca expone URLs de GCS. Los readers devuelven enlaces firmados `/api/v1/media/{token}` (HMAC con `STUDIO_MEDIA_URL_SECRET`) que se sirven sin consultar la base: con una consulta por imagen, una grilla de 20+ miniaturas agotaba el tope de 20 conexiones del rol (incidente 2026-09-25).
- El worker de Cloud Run (task hija) automatiza esto cuando exista el corte de OneDrive.
- **Corte:** hasta que la UI de Studio permita editar, OneDrive sigue siendo la fuente y Studio una proyección reimportable. El corte a Studio como fuente se declara en un CDR/ADR cuando existan commands de escritura; nunca se escribe en los dos lados.

## 8. Interfaz

- Diseño aprobado por el operador el 2026-09-25 en el canvas de diseño «Efeonce Marketing Studio» (v2 · claro y oscuro).
- Tema generado desde `@efeoncepro/axis-tokens@0.2.5` (`apps/web/scripts/generate-theme.mjs` → `theme.generated.css`); `theme:check` en el typecheck falla si el paquete y el CSS divergen. Studio materializa roles de superficie por tema (app, chrome, inset, card, elev, selected) sobre los valores AXIS; los textos sobre fotos y el preview del feed no dependen del tema.
- Tema claro/oscuro con switch; preferencia en la cookie `studio-theme`, leída en el servidor (sin parpadeo). Poppins (display) y Geist (texto) vía `next/font`.
- Pantallas: Hoy (decisiones), Campañas (hero + tarjetas con pista de tres estados), espacio de campaña (piezas concepto × formato real con inspector y preview en feed; copys; anuncios; medios; calendario), Calendario mensual (vuelos por semana, posts vencidos a verificar), Piezas y Medios. Búsqueda ⌘K. Bajo 860 px, navegación inferior.
- Logos oficiales (`public/brand/`) copiados de `greenhouse-eo/public/branding/`, sin estilos embebidos.

## 9. Observabilidad y operación

- `GET /api/v1/health` para smoke.
- Logs estructurados sin PII ni secretos; errores al cliente sólo por el contrato canónico.
- Sentry y alertas llegan con la task de observabilidad; la fundación no los finge.

## 10. Referencias

- ADR: [`EFEONCE_STUDIO_API_FIRST_DECISION_V1.md`](../EFEONCE_STUDIO_API_FIRST_DECISION_V1.md)
- Registro de campañas: [`EFEONCE_CAMPAIGN_REGISTRY_V1.md`](../../operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md)
- Manifiesto de pauta: [`EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md`](../../operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md)
- Precedente de repo hermano gobernado desde Greenhouse: [`creative-studio/`](../creative-studio/)
- Runtime handoff: [`MARKETING_STUDIO_RUNTIME_HANDOFF.md`](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md)
