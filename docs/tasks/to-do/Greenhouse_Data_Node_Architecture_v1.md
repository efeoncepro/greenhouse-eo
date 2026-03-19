# Greenhouse Data Node Architecture v1

## Estado 2026-03-19

Este documento se conserva como spec original de vision de producto para `Data Node`.

Para implementacion nueva y decisiones tecnicas, usar como baseline:
- `docs/tasks/to-do/Greenhouse_Data_Node_Architecture_v2.md`

En particular, no implementar literalmente desde esta `v1`:
- `BigQuery` como store principal de configuracion y control plane
- `middleware.ts` como boundary central de auth para la API externa
- servicios o repos externos adicionales como primer paso si el portal actual ya puede resolver la fase

Ante conflicto, prevalecen:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/tasks/to-do/Greenhouse_Data_Node_Architecture_v2.md`

**Del Dashboard al Nodo de Datos: Greenhouse como extensión del ecosistema operativo del cliente**

Especificación Técnica de Implementación — Efeonce Greenhouse™

| Atributo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | Marzo 2026 |
| Autor | Efeonce Group |
| Clasificación | CONFIDENCIAL |
| Dependencia | Greenhouse Portal Spec v1, Capabilities Architecture v1 |

---

## 1. Contexto estratégico

### 1.1 De dashboard a data node

Greenhouse en su diseño actual es un destino: el cliente se logea, ve sus métricas ICO y sale. Este modelo es valioso pero limitado — posiciona al portal como una ventana de transparencia, no como un componente integrado en la operación del cliente.

La evolución propuesta transforma Greenhouse de destino a fuente. Las métricas ICO — RpA, OTD%, Cycle Time, Throughput, First Time Right — viajan desde BigQuery hacia el ecosistema de datos del cliente, donde Efeonce aparece como un nodo más en sus dashboards ejecutivos, al lado de sus propios KPIs internos.

### 1.2 Por qué esto importa

- **Switching cost tangible:** Una vez que las métricas ICO están integradas en el dashboard ejecutivo del cliente, desconectar a Efeonce no es solo cambiar de proveedor — es perder una fuente de datos integrada.
- **Visibilidad estratégica:** La agencia pasa de line item en presupuesto a panel con nombre propio en el reporting del CMO al directorio.
- **Diferenciador competitivo:** Ninguna agencia en LATAM ofrece endpoints programáticos para que el cliente jale métricas operativas de su proveedor creativo a su propio BI stack.
- **Alineación ASaaS:** Refuerza el modelo Agency Service as a Software — el portal se comporta como un producto de software con API, no como un reporte disfrazado de app.

### 1.3 Buyer persona mapping

| Persona | Cómo usa el data node | Impacto en retención |
|---|---|---|
| **CMO (BP1)** | Agrega métricas ICO a su dashboard ejecutivo junto a performance, CRM y brand health. Presenta al directorio con Efeonce como panel propio. | Efeonce tiene nombre propio en el reporting al board. Desconectar = perder un panel visible. |
| **Brand Manager (BP6)** | Cruza datos de producción creativa (Cycle Time, RpA) con métricas de su equipo interno. Ve el ciclo completo desde brief hasta publicación. | El 360 operativo depende de los datos de Greenhouse. Sin Efeonce, el panorama queda incompleto. |
| **CEO / GM (BP3)** | Ve eficiencia de proveedores creativos en su BI unificado. Compara costo vs. velocidad vs. calidad con datos reales. | Reconectar un data feed toma meses. El costo de cambio se vuelve racional, no solo relacional. |

---

## 2. Arquitectura de cuatro niveles

La integración se implementa en cuatro niveles progresivos, cada uno con complejidad y valor creciente. Los cuatro niveles comparten la misma fuente de verdad (BigQuery) y respetan el mismo sistema de permisos (Capability Registry + tenant scoping).

| Nivel | Mecanismo | Complejidad cliente | Frecuencia | Tier ASaaS | Fase |
|---|---|---|---|---|---|
| **1. Data Export** | Botón de descarga en el portal | Nula | On-demand | Basic | MVP (Q2) |
| **2. Scheduled Reports** | Email digest automático | Baja | Semanal / mensual | Pro | Q3 2026 |
| **3. REST API** | Endpoints autenticados por API key | Media (requiere dev) | Real-time (cached) | Enterprise | Q3–Q4 2026 |
| **4. MCP Server** | Tools para agentes AI (Claude, Cursor, custom) | Baja (config file) | Real-time (cached) | Enterprise | Q4 2026+ |

---

## 3. Nivel 1: Data Export

### 3.1 Concepto

Botón de descarga presente en cada vista del portal (Pulse, Proyectos, Ciclos, Creative Hub, etc.) que serializa la data visible en formatos consumibles. No requiere setup técnico del cliente — cualquier persona puede descargar y abrir en Excel, Sheets o importar a su herramienta de BI.

### 3.2 Formatos soportados

| Formato | Contenido | Caso de uso | MIME type |
|---|---|---|---|
| **CSV** | Datos tabulares plain text, UTF-8 con BOM para compatibilidad Excel | Import a Sheets, Looker Studio, Notion databases, cualquier herramienta | `text/csv` |
| **XLSX** | Spreadsheet con formato, múltiples sheets si hay data de múltiples módulos | Equipos que viven en Excel / Google Sheets. Incluye formato de tabla. | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| **JSON** | Estructura jerárquica con metadata (período, métricas, timestamp de export) | Equipos técnicos que quieren automatizar la ingesta o hacer pipe a scripts | `application/json` |

### 3.3 Alcance por vista

Cada vista del portal expone un subset específico de data para export. El botón siempre exporta lo que el cliente está viendo, respetando filtros activos.

| Vista | Data exportable | Granularidad |
|---|---|---|
| Pulse (dashboard) | KPIs agregados: RpA promedio, OTD%, assets activos, deliveries, feedback pendiente. Incluye semáforo y trend. | Período seleccionado (default: últimos 30 días) |
| Proyectos | Lista de proyectos con métricas: nombre, total tareas, % completadas, RpA promedio, semáforo | Todos los proyectos activos |
| Proyecto detalle | Tabla completa de assets: nombre, estado, rondas de revisión, feedback, última actividad | Todas las tareas del proyecto |
| Ciclos (sprints) | Sprint activo + histórico: velocity, burndown data, tareas completadas vs total | Período del sprint |
| Creative Hub | Métricas ICO detalladas: RpA por asset, Cycle Time, First Time Right%, pipeline view | Período seleccionado |

### 3.4 UX del export

**Componente:** Botón IconButton con icono Tabler (`tabler-download`) posicionado en el header de cada vista, junto al título de página. Al hacer clic, abre un dropdown con las opciones de formato (CSV, Excel, JSON). No hay modal ni configuración adicional — un clic elige formato, el archivo se descarga.

**Nomenclatura de archivo:** `greenhouse_{vista}_{client_slug}_{YYYY-MM-DD}.{ext}`

**Ejemplo:** `greenhouse_pulse_sky-airline_2026-03-16.csv`

### 3.5 Implementación técnica

#### API Route

```
GET /api/export/[viewId]?format=csv|xlsx|json&period=30d|90d|custom&from=&to=
```

La API Route reutiliza las mismas query functions que las vistas del portal. La única diferencia es el formato de output — en vez de retornar JSON para renderizar cards, serializa en el formato solicitado.

#### Response headers

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="greenhouse_pulse_sky-airline_2026-03-16.csv"
X-Greenhouse-Export-Version: 1.0
X-Greenhouse-Period: 2026-02-14/2026-03-16
```

#### JSON export schema

El JSON export incluye metadata que facilita la ingesta automatizada:

```json
{
  "meta": {
    "source": "greenhouse",
    "version": "1.0",
    "client": "sky-airline",
    "view": "pulse",
    "period": { "from": "2026-02-14", "to": "2026-03-16" },
    "exported_at": "2026-03-16T14:30:00Z",
    "metrics_definitions": {
      "rpa": "Rounds per Asset - avg revision rounds per deliverable",
      "otd_pct": "On-Time Delivery - % delivered on committed date"
    }
  },
  "kpis": { "rpa_avg": 1.4, "otd_pct": 92, ... },
  "data": [ ... ]
}
```

#### Dependencias

- **CSV:** Native serialization — no library needed. UTF-8 BOM (`\uFEFF`) prefix for Excel compat.
- **XLSX:** sheetjs (xlsx package) — ya disponible vía CDN en artifacts, instalar como server-side dep.
- **JSON:** Native `JSON.stringify` con metadata wrapper.

### 3.6 Seguridad

- Auth: Requiere sesión NextAuth válida. El export respeta el mismo tenant scoping que las vistas.
- Rate limit: Máximo 10 exports por hora por cliente. Previene scraping automatizado.
- Audit log: Cada export se registra en `greenhouse.export_logs` (client_id, view, format, timestamp).

---

## 4. Nivel 2: Scheduled Reports

### 4.1 Concepto

Digest automático que Greenhouse envía al cliente en una cadencia configurable (semanal o mensual). No es un "reporte de agencia" — es un data packet estructurado que el equipo interno del cliente consume directamente, con formato optimizado para forwarding a stakeholders internos y opcionalmente un JSON attachment para ingesta automatizada.

### 4.2 Canales y formato

| Canal | Formato | Propósito |
|---|---|---|
| **Email HTML** | React Email template con KPIs visuales, sparklines, y semáforos. Branding Greenhouse con header Midnight Navy. | Consumo humano. El Brand Manager lo forward al equipo. El CMO lo revisa en 30 segundos. |
| **JSON attachment** | Archivo .json adjunto al email con la misma data en formato estructurado (mismo schema que el JSON export del Nivel 1). | Ingesta automatizada. El equipo técnico del cliente configura una regla de email que extrae el attachment y lo mete a su pipeline. |
| **CSV attachment** | Archivo .csv adjunto como alternativa al JSON. Seleccionable en settings. | Equipos no técnicos que necesitan los datos en Excel sin entrar al portal. |

### 4.3 Contenido del digest

**Sección 1: KPI Summary (siempre presente)**

- RpA promedio del período + trend vs período anterior (↑ / ↓ / =)
- OTD% + trend
- Assets delivered (conteo)
- Cycle Time promedio
- Semáforo general de la operación (verde / amarillo / rojo)

**Sección 2: Highlights (contextual)**

- Top 3 proyectos más activos del período
- Assets con RpA > 2 (alerta)
- Sprint activo: progreso y velocity

**Sección 3: Call to Action**

- Link directo al portal: "Ver detalles en tu Greenhouse"
- Link a descarga completa (Data Export URL temporal, expira en 7 días)

### 4.4 Configuración por cliente

La configuración de scheduled reports vive en la tabla `greenhouse.client_preferences` en BigQuery:

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| report_enabled | BOOLEAN | false | Activa/desactiva el digest |
| report_cadence | STRING | weekly | `weekly` \| `monthly` |
| report_day | INTEGER | 1 (lunes) | Día de envío (1-7 para weekly, 1-28 para monthly) |
| report_recipients | STRING[] | [ email principal ] | Lista de emails destinatarios |
| report_format | STRING | html_only | `html_only` \| `html_json` \| `html_csv` |
| report_modules | STRING[] | [ "pulse" ] | Módulos incluidos en el digest |

### 4.5 Implementación técnica

#### Infraestructura

**Cloud Scheduler** (ya usado para syncs de Notion y HubSpot) dispara una Cloud Function diariamente a las 07:00 AM UTC. La función consulta `greenhouse.client_preferences`, filtra los clientes cuyo `report_cadence` y `report_day` coinciden con la fecha actual, ejecuta las queries correspondientes y envía vía Resend.

#### Cloud Function: greenhouse-reports

```
Runtime: Python 3.12
Trigger: Cloud Scheduler (0 7 * * *)
Repo: efeoncepro/greenhouse-reports (nuevo)
Dependencies: google-cloud-bigquery, resend, jinja2
```

#### Flujo de ejecución

1. Cloud Scheduler dispara HTTP POST a la Cloud Function
2. La función consulta `greenhouse.client_preferences WHERE report_enabled = true`
3. Filtra clientes cuya cadencia coincide con hoy (lunes para weekly, día 1 para monthly, etc.)
4. Para cada cliente: ejecuta queries de KPIs sobre BigQuery (mismas queries del portal)
5. Genera HTML del email usando Jinja2 template (consistente con brand tokens de React Email)
6. Si `report_format` incluye JSON/CSV, genera attachment y lo adjunta
7. Envía vía Resend a `report_recipients`
8. Registra evento en `greenhouse.report_logs`

#### Template del email

El template mantiene los design tokens de la spec de transactional email existente: header Midnight Navy (#022a4e), body card blanco, CTA Core Blue (#0375db), footer con branding Greenhouse. Se agrega una sección de KPI cards visuales y un bloque de highlights.

#### UX en el portal: Settings > Integraciones

El cliente configura sus scheduled reports desde la sección "Mi Greenhouse" del portal. UI: toggle de activación, selector de cadencia, input de emails adicionales, checkboxes de formato de attachment, multi-select de módulos a incluir.

### 4.6 Email subject line

```
Semanal: "Tu operación creativa — Semana del {date} — Greenhouse"
Mensual: "Tu operación creativa — {month} {year} — Greenhouse"
```

---

## 5. Nivel 3: REST API

### 5.1 Concepto

Endpoints REST públicos autenticados por API key que permiten al equipo técnico del cliente consumir métricas ICO programáticamente. Esto habilita integración directa con Power BI, Looker Studio, Tableau, Notion, Google Sheets, o cualquier herramienta que soporte HTTP data sources.

La API es read-only. No expone operaciones de escritura. Los datos están scoped al tenant del cliente y filtrados por las mismas capabilities que el portal.

### 5.2 Autenticación

#### API Key model

Cada cliente puede generar una o más API keys desde el portal (Settings > Integraciones > API). Las keys se almacenan hasheadas en BigQuery.

| Campo | Tipo | Descripción |
|---|---|---|
| key_id | STRING | UUID único de la key |
| client_id | STRING | ID del cliente dueño |
| key_hash | STRING | SHA-256 hash de la key (nunca se almacena en plain text) |
| key_prefix | STRING | Primeros 8 chars de la key (para identificación visual: `gh_sk_ab12cd34...`) |
| label | STRING | Nombre descriptivo dado por el cliente (ej: "Power BI integration") |
| scopes | STRING[] | Módulos a los que la key tiene acceso (ej: `["pulse", "creative-hub"]`) |
| created_at | TIMESTAMP | Fecha de creación |
| last_used_at | TIMESTAMP | Último uso |
| expires_at | TIMESTAMP | Expiración (nullable — null = no expira) |
| active | BOOLEAN | Permite revocar sin eliminar |

#### Formato de la key

```
gh_sk_{32_random_alphanumeric_chars}
Ejemplo: gh_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

La key se muestra al cliente una sola vez al momento de la creación. Después solo se muestra el prefix (`gh_sk_a1b2c3d4...`).

#### Header de autenticación

```
Authorization: Bearer gh_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 5.3 Endpoints

| Endpoint | Método | Retorna |
|---|---|---|
| `GET /api/v1/kpis` | GET | KPIs agregados del período: RpA, OTD%, Cycle Time, assets activos, deliveries, semáforo |
| `GET /api/v1/kpis/history` | GET | Serie temporal de KPIs (para graficado en BI): un datapoint por semana/mes |
| `GET /api/v1/projects` | GET | Lista de proyectos con métricas resumidas |
| `GET /api/v1/projects/:id/assets` | GET | Assets de un proyecto con estado, RpA, feedback, actividad |
| `GET /api/v1/sprints` | GET | Sprints con velocity y progreso |
| `GET /api/v1/sprints/:id` | GET | Detalle de sprint con burndown data |
| `GET /api/v1/capabilities` | GET | Módulos activos del cliente (metadata) |
| `GET /api/v1/capabilities/:moduleId` | GET | Data completa de un módulo específico |

### 5.4 Query parameters comunes

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| period | STRING | 30d | `7d` \| `30d` \| `90d` \| `ytd` \| `custom` |
| from | DATE | — | Inicio del período (solo si period=custom) |
| to | DATE | — | Fin del período |
| format | STRING | json | `json` \| `csv` (respuesta directa en el formato) |
| page | INTEGER | 1 | Paginación para endpoints que retornan listas |
| per_page | INTEGER | 50 | Items por página (máx 200) |

### 5.5 Response format

#### Response envelope

```json
{
  "meta": {
    "source": "greenhouse-api",
    "version": "v1",
    "client": "sky-airline",
    "period": { "from": "2026-02-14", "to": "2026-03-16" },
    "generated_at": "2026-03-16T14:30:00Z",
    "cache_ttl": 3600
  },
  "data": { ... },
  "pagination": { "page": 1, "per_page": 50, "total": 127, "pages": 3 }
}
```

#### Ejemplo: GET /api/v1/kpis?period=30d

```json
{
  "meta": { ... },
  "data": {
    "rpa_avg": 1.4,
    "rpa_trend": -0.2,
    "rpa_semaphore": "green",
    "otd_pct": 92,
    "otd_trend": 3,
    "cycle_time_avg_days": 4.2,
    "assets_active": 23,
    "assets_delivered": 47,
    "feedback_pending": 5,
    "first_time_right_pct": 68,
    "throughput": 11.75
  }
}
```

### 5.6 Rate limiting

| Tier | Límite | Window |
|---|---|---|
| Enterprise (default) | 1,000 requests/hora | Sliding window por API key |
| Burst | 20 requests/minuto | Token bucket por API key |

Headers de rate limit en cada response:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1710600000
```

Cuando el límite se excede, la API retorna `429 Too Many Requests` con body explicativo y `Retry-After` header.

### 5.7 Caching

La data de BigQuery se refresca diariamente (03:00-03:30 AM). La API implementa cache server-side idéntico al portal:

- Cache TTL: 1 hora (`revalidate: 3600` via `unstable_cache` de Next.js)
- Cache key: `{client_id}:{endpoint}:{params_hash}`
- El response incluye `Cache-Control: public, max-age=3600` para que el BI del cliente también cachee
- ETag support para conditional requests (`If-None-Match` → `304 Not Modified`)

### 5.8 Implementación técnica

#### Estructura de archivos

```
/src/app/api/v1/
  ├─ middleware.ts        // API key validation + rate limiting
  ├─ kpis/
  │   ├─ route.ts          // GET /api/v1/kpis
  │   └─ history/route.ts  // GET /api/v1/kpis/history
  ├─ projects/
  │   ├─ route.ts          // GET /api/v1/projects
  │   └─ [id]/assets/route.ts
  ├─ sprints/
  │   ├─ route.ts
  │   └─ [id]/route.ts
  └─ capabilities/
      ├─ route.ts
      └─ [moduleId]/route.ts
```

#### API key middleware

El middleware de la API v1 extrae la key del header Authorization, computa SHA-256, busca en `greenhouse.api_keys`, verifica `active` y expiración, verifica que el scope de la key incluya el módulo solicitado, aplica rate limiting, y actualiza `last_used_at`. Es una capa delgada sobre la misma lógica de `verifyModuleAccess` de la Capabilities Architecture.

#### Reutilización de query builders

Los endpoints de la API v1 reutilizan los mismos query builders de `/src/lib/capability-queries/`. La única diferencia es que la autenticación viene de API key en vez de sesión, y el response format incluye el envelope con metadata y paginación.

### 5.9 Documentación para el cliente

#### Developer portal

Se crea una página de documentación dentro del portal en `/settings/api-docs` (accessible solo para clientes con API habilitada). Incluye:

- Quick start guide con ejemplo curl
- Listado interactivo de endpoints con parámetros
- Ejemplo de integración con Power BI (web connector)
- Ejemplo de integración con Looker Studio (URL data source)
- Ejemplo de integración con Google Sheets (IMPORTDATA o Apps Script)
- Referencia de métricas ICO con definiciones

#### Quick start example

```bash
curl -H "Authorization: Bearer gh_sk_your_key_here" \
  "https://greenhouse.efeoncepro.com/api/v1/kpis?period=30d"
```

### 5.10 BigQuery tables (nuevas)

| Tabla | Dataset | Propósito |
|---|---|---|
| api_keys | greenhouse | API keys hasheadas con scopes y metadata |
| api_request_logs | greenhouse | Log de cada request a la API (analytics + rate limiting) |
| client_preferences | greenhouse | Configuración de scheduled reports y preferencias de export |
| export_logs | greenhouse | Log de exports manuales desde el portal |
| report_logs | greenhouse | Log de scheduled reports enviados |

---

## 6. Alineación con tier pricing ASaaS

Los tres niveles del data node se alinean directamente con la estructura de tiers del modelo ASaaS:

| Feature | Basic | Pro | Enterprise |
|---|---|---|---|
| Portal + dashboard | ✓ | ✓ | ✓ |
| Data Export (CSV/Excel/JSON) | ✓ | ✓ | ✓ |
| Scheduled Reports | — | ✓ Semanal + mensual | ✓ + diario |
| JSON/CSV attachment | — | ✓ | ✓ |
| REST API | — | — | ✓ 1,000 req/hr |
| API key management | — | — | ✓ Multi-key + scopes |
| Developer docs | — | — | ✓ + integration guides |
| MCP Server | — | — | ✓ AI-native integration |

### 6.1 PLG upsell triggers

El data node genera oportunidades naturales de upsell:

- **Basic → Pro:** Cuando el cliente exporta manualmente más de 4 veces en un mes, aparece un nudge contextual: "Recibe estos datos automáticamente cada semana. Activa Scheduled Reports."
- **Pro → Enterprise:** Cuando el digest incluye JSON attachment y el cliente lo descarga consistentemente, el footer del email incluye: "Conecta esta data directamente a tu BI. Habilita la API de Greenhouse."
- **Ghost slot en Settings:** En la sección de integraciones, los niveles no activados se muestran como ghost cards (dashed border, icono lock) con CTA de "Conoce más".

---

## 7. Roadmap de implementación

| Fase | Entregable | Dependencia | Estimado | Tier |
|---|---|---|---|---|
| **DN0** | API Route `/api/export/[viewId]` con CSV/JSON | Portal spec v1 P0 (auth + views) | 1 día | Basic |
| **DN0** | Botón de export en UI (dropdown formato) | API export | 0.5 día | Basic |
| **DN0** | XLSX export (sheetjs server-side) | API export | 0.5 día | Basic |
| **DN0** | Export audit log (`greenhouse.export_logs`) | API export | 0.5 día | Basic |
| **DN1** | Tabla `greenhouse.client_preferences` | DN0 | 0.5 día | Pro |
| **DN1** | UI Settings > Integraciones (report config) | client_preferences | 1.5 días | Pro |
| **DN1** | Cloud Function greenhouse-reports | client_preferences + Resend | 2 días | Pro |
| **DN1** | Jinja2 email template (digest) | Cloud Function | 1 día | Pro |
| **DN1** | JSON/CSV attachment generation | Cloud Function | 0.5 día | Pro |
| **DN2** | Tabla `greenhouse.api_keys` + `api_request_logs` | DN1 | 0.5 día | Enterprise |
| **DN2** | API key management UI (Settings > API) | api_keys table | 1.5 días | Enterprise |
| **DN2** | API v1 middleware (auth + rate limit) | api_keys | 1 día | Enterprise |
| **DN2** | API v1 endpoints (8 routes) | middleware + query builders | 2 días | Enterprise |
| **DN2** | Developer docs page (`/settings/api-docs`) | API v1 endpoints | 1 día | Enterprise |
| **DN2** | Integration guides (Power BI, Looker, Sheets) | Developer docs | 1 día | Enterprise |
| **DN3** | MCP Server core (FastMCP + tool definitions) | API v1 endpoints estables | 1.5 días | Enterprise |
| **DN3** | OAuth adapter (scope interno + externo) | MCP core + api_keys | 1 día | Enterprise |
| **DN3** | Tool testing + prompt descriptions | MCP core | 0.5 día | Enterprise |
| **DN3** | Deployment (Cloud Run o Vercel SSE endpoint) | MCP completo | 0.5 día | Enterprise |
| **DN3** | Documentación MCP para cliente + connection guide | MCP deployed | 0.5 día | Enterprise |

**Estimados por nivel:**
- **Nivel 1 (Data Export):** ~2.5 días — puede entregarse con el MVP del portal.
- **Nivel 2 (Scheduled Reports):** ~5.5 días — Q3 2026, post-estabilización del portal.
- **Nivel 3 (REST API):** ~7 días — Q3–Q4 2026, requiere query builders estables.
- **Nivel 4 (MCP Server):** ~4 días — Q4 2026 o Q1 2027, requiere API v1 estable.
- **Total acumulado:** ~19 días de desarrollo.

---

## 8. Dependencias con specs existentes

| Spec | Qué se necesita | Estado | Impacto si no está |
|---|---|---|---|
| Portal Spec v1 | Auth (NextAuth), API Routes, BigQuery service account | Definida | Blocker para todo |
| Capabilities Architecture v1 | Query builders, Capability Registry, `verifyModuleAccess()` | Definida | Blocker para API v1 scoping |
| Transactional Email Spec v1 | Resend config, DNS records, design tokens | Definida | Blocker para Scheduled Reports |
| Nomenclatura v3 | Constantes `GH_NAV`, `GH_LABELS` para microcopy de Settings | Definida | Inconsistencia de UX |
| HubSpot → BQ Sync | companies con `linea_de_servicio` y `servicios_especificos` | Pipeline activo | Sin capability resolution |
| Kortex Architecture v1.1 | Patrón dual-mode intelligence (interno/externo), governance de agentes | Definida | Sin alineación de MCP con CRM Advisor |

---

## 9. Nivel 4: MCP Server

### 9.1 Concepto

Un servidor MCP (Model Context Protocol) que expone las métricas ICO de Greenhouse como tools consumibles por agentes de IA. Esto posiciona a Greenhouse como data source nativo en el ecosistema de AI tooling — cualquier agente que soporte MCP (Claude Desktop, Cursor, Windsurf, agentes custom) puede consultar datos de la operación creativa del cliente en lenguaje natural.

El MCP server no reemplaza la REST API — es un adapter sobre ella. Recibe tool calls MCP, las traduce a requests HTTP contra la API v1, y retorna los resultados formateados para consumo por LLMs.

### 9.2 Dos modos de operación

Siguiendo el mismo patrón de Kortex (Manifest Intelligence interno + CRM Advisor externo), el MCP de Greenhouse opera en dos scopes:

| Scope | Interno (Efeonce) | Externo (Cliente) |
|---|---|---|
| **Audiencia** | Account managers, equipo operativo, Kortex agents | Equipo técnico del cliente, analistas de datos, AI tools internos |
| **Autenticación** | Service account token (efeonce.org domain) | API key del cliente (misma del Nivel 3) |
| **Acceso a data** | Multi-tenant: puede consultar cualquier cliente | Tenant-scoped: solo data del cliente dueño de la key |
| **Tools extra** | `compare_clients`, `get_team_utilization`, `get_portfolio_health` | No disponibles |
| **Caso de uso** | "Dame el RpA de Sky Airline vs BeFUN este trimestre" | "¿Cómo va mi operación creativa este mes?" |

### 9.3 Tools expuestos

#### Tools compartidos (ambos scopes)

| Tool | Descripción | API v1 subyacente |
|---|---|---|
| **get_kpis** | Retorna KPIs agregados de la operación creativa: RpA, OTD%, Cycle Time, assets activos, deliveries, semáforo. Acepta parámetro de período. | `GET /api/v1/kpis` |
| **get_kpi_trend** | Serie temporal de un KPI específico para graficado o análisis de tendencia. Retorna datapoints semanales o mensuales. | `GET /api/v1/kpis/history` |
| **get_projects** | Lista proyectos activos con métricas resumidas: nombre, total assets, completados, RpA, semáforo. | `GET /api/v1/projects` |
| **get_project_assets** | Assets de un proyecto específico con estado, rondas de revisión, feedback pendiente, última actividad. | `GET /api/v1/projects/:id/assets` |
| **get_sprint_status** | Estado del sprint activo: progreso, velocity, burndown, tareas completadas vs total. | `GET /api/v1/sprints` |

#### Tools exclusivos del scope interno

| Tool | Descripción | Notas |
|---|---|---|
| **compare_clients** | Compara KPIs entre dos o más clientes en un período. Útil para benchmarking interno y reporting ejecutivo de Efeonce. | Query custom sobre BQ |
| **get_team_utilization** | FTE y utilización del equipo asignado al cliente. Cruza con Efeonce Ops. | Requiere `efeonce_ops` dataset |
| **get_portfolio_health** | Resumen de salud de todos los clientes activos: cuántos en verde, amarillo, rojo. Alertas de atención. | Multi-tenant aggregation |
| **get_revenue_attribution** | Métricas de Revenue Enabled por cliente: impacto atribuido de la operación creativa en resultados de negocio. | Requiere analytics sync |

### 9.4 Diseño de tool descriptions

La calidad de las tool descriptions determina si el agente invoca el tool correcto. Cada description debe ser concisa, indicar qué retorna y cuándo usarla. Ejemplo:

```json
{
  "name": "get_kpis",
  "description": "Get aggregated creative operations KPIs for a client. Returns: RpA avg, OTD%, Cycle Time, active assets, deliveries, semaphore status, and period-over-period trends. Use when asked about operational performance, efficiency metrics, or general health of the creative operation.",
  "input_schema": {
    "type": "object",
    "properties": {
      "period": {
        "type": "string",
        "enum": ["7d", "30d", "90d", "ytd"],
        "default": "30d",
        "description": "Time period for KPI calculation"
      },
      "client_id": {
        "type": "string",
        "description": "Client identifier (internal scope only, omit for external scope — auto-resolved from API key)"
      }
    }
  }
}
```

### 9.5 Stack técnico

| Componente | Tecnología | Justificación |
|---|---|---|
| **MCP Framework** | FastMCP (Python) | Consistente con el stack de Cloud Functions de Efeonce (Python 3.12). FastMCP es el framework más maduro para MCP servers. |
| **Transport** | SSE (Server-Sent Events) | Protocolo estándar de MCP para remote servers. Compatible con Claude Desktop, Cursor y clientes MCP genéricos. |
| **Hosting** | Cloud Run (GCP) | Soporta SSE nativo, auto-scaling, mismo proyecto `efeonce-group`. Alternativa: Vercel con endpoint SSE si se prefiere unificar. |
| **Auth (externo)** | API key (header) | Reutiliza las mismas API keys del Nivel 3. El MCP server valida la key y resuelve el tenant. |
| **Auth (interno)** | Service account token | Token de servicio con scope multi-tenant, restringido a dominio efeonce.org. |
| **Data layer** | HTTP proxy → API v1 | El MCP server no consulta BigQuery directamente. Hace requests HTTP a la REST API v1, reutilizando auth, cache, y rate limiting existentes. |

### 9.6 Arquitectura de deployment

El MCP server se deploya como servicio independiente en Cloud Run, conectado a la API v1 que corre en Vercel. Esta separación es intencional:

- **Cloud Run para SSE:** Vercel Serverless Functions tienen timeout de 60s y no soportan SSE persistente de forma nativa. Cloud Run mantiene conexiones SSE abiertas sin límite práctico.
- **Proxy a API v1:** El MCP server no duplica lógica de negocio. Cada tool call se traduce a un GET a la API v1 en Vercel, que ejecuta el query builder, aplica cache y retorna JSON.
- **Mismo proyecto GCP:** Cloud Run corre en `efeonce-group`, `us-central1`. El service account `greenhouse-portal@` tiene acceso a la API v1 vía HTTP.

#### Flujo de un tool call

1. Cliente MCP (Claude Desktop, Cursor, agente custom) envía tool call al MCP server vía SSE
2. MCP server extrae API key del header, valida contra `greenhouse.api_keys`
3. Resuelve el tool call a un endpoint de API v1 con los parámetros correspondientes
4. Hace GET a `https://greenhouse.efeoncepro.com/api/v1/{endpoint}` con la API key del cliente
5. Recibe JSON de la API v1, lo formatea como tool result para el LLM
6. Retorna resultado al cliente MCP vía SSE

### 9.7 Conexión con Kortex

El MCP de Greenhouse es un building block para el CRM Advisor (Kortex v2.0+). Cuando el agente Kortex necesita contexto de la operación creativa para hacer una recomendación de CRM, puede invocar los tools de Greenhouse como data source:

- **Escenario:** El CRM Advisor analiza por qué un deal de upsell se estancó. Invoca `get_kpis` del MCP Greenhouse para verificar que la operación actual está en verde antes de recomendar expandir scope.
- **Escenario:** Un account manager pregunta en Claude "Prepárame el talking point para la QBR de Sky Airline". El agente invoca `get_kpis` + `get_projects` del MCP Greenhouse y `search_crm_objects` del MCP HubSpot para armar un resumen con datos reales.

El patrón de governance de Kortex aplica: el MCP de Greenhouse retorna datos e insights, nunca ejecuta acciones. Las recomendaciones basadas en esos datos son sugerencias que requieren aprobación humana.

### 9.8 Ejemplo de integración: Claude Desktop

El cliente Enterprise configura el MCP server en su Claude Desktop con un archivo de configuración:

```json
{
  "mcpServers": {
    "greenhouse": {
      "url": "https://greenhouse-mcp.efeoncepro.com/sse",
      "headers": {
        "Authorization": "Bearer gh_sk_your_key_here"
      }
    }
  }
}
```

Una vez conectado, el usuario puede preguntar en lenguaje natural y Claude invoca los tools automáticamente:

```
Usuario: "¿Cómo va la operación creativa este mes?"
Claude: [invoca get_kpis(period="30d")]
Claude: "Tu operación este mes muestra un RpA de 1.4 (óptimo),
  OTD% de 92%, y 47 assets entregados. El Cycle Time promedio
  es 4.2 días. Tienes 5 feedback pendientes en Frame.io."
```

### 9.9 Repo y estructura de archivos

```
Repo: efeoncepro/greenhouse-mcp
Runtime: Python 3.12
Framework: FastMCP

/greenhouse-mcp
  ├─ main.py                  # FastMCP server entry point
  ├─ tools/
  │   ├─ shared.py            # Tools compartidos (get_kpis, get_projects, etc.)
  │   └─ internal.py          # Tools exclusivos scope interno
  ├─ auth/
  │   ├─ api_key.py           # Validación de API key (proxy a BQ)
  │   └─ service_account.py   # Auth para scope interno
  ├─ proxy/
  │   └─ api_v1.py            # HTTP client hacia la REST API v1
  ├─ Dockerfile
  ├─ requirements.txt
  └─ deploy.sh                # gcloud run deploy
```

### 9.10 Seguridad y gobernanza

- Read-only: el MCP server solo expone operaciones de lectura. No hay tools de escritura.
- Tenant isolation: cada request se resuelve contra el tenant del dueño de la API key. El scope interno requiere token de servicio efeonce.org.
- Rate limiting heredado: el MCP server usa las mismas API keys del Nivel 3. Los límites de rate de la API v1 aplican.
- Logging: cada tool call se registra en `greenhouse.mcp_request_logs` con tool_name, client_id, latency, timestamp.
- No cross-contamination: siguiendo governance de Kortex, un client-scoped MCP nunca accede a datos de otro cliente.

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*
*Documento técnico interno. Su reproducción o distribución sin autorización escrita está prohibida.*
