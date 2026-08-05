> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-05 por Claude (TASK-1299 + TASK-1301)
> **Ultima actualizacion:** 2026-08-05 por Claude
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)

# Modulo SEO — Search Visibility 360 (Growth)

## Que es

El modulo SEO es la mitad "buscadores clasicos" de **Search Visibility 360**: mide cómo le va a una marca en Google y otros buscadores a lo largo del tiempo — en qué posición aparece por cada keyword que importa, qué tan sano está su sitio a nivel técnico, y cómo evoluciona su perfil de enlaces. La otra mitad de Search Visibility 360 es el [AI Visibility Grader](ai-visibility-grader.md) (AEO), que mide lo mismo pero en los motores de respuesta de IA (ChatGPT, Claude, Perplexity, Gemini).

La idea central es que la visibilidad no es una foto: es una **serie de tiempo**. El valor del módulo no está en saber "hoy estás en la posición 7", sino en poder mostrar "hace tres meses estabas en la 15, hoy estás en la 7, y este competidor te está alcanzando". Por eso todo el modelo de datos está construido como mediciones append-only: cada captura se guarda y **nunca** se edita ni se borra.

Este documento describe el estado real al 2026-08-05: las dos primeras capas están construidas (modelo de datos + modelo de acceso). Las capturas automáticas, los readers y la UI llegan en las tasks siguientes de `EPIC-022`.

## Que existe hoy

### 1. El modelo de datos de serie temporal (TASK-1299)

El schema `greenhouse_growth` guarda dos familias de tablas con reglas distintas:

**Configuración** (qué se mide — mutable, con membresía versionada):

| Tabla | Qué guarda |
|---|---|
| `seo_targets` | Qué dominio trackea cada organización, con mercado (país + idioma). |
| `seo_keyword_sets` | Grupos nombrados de keywords por target (ej. "Marca", "Producto X"). |
| `seo_keyword_set_members` | Las keywords de cada grupo, con tags y vigencia `effective_from`/`effective_to`. Una keyword que deja de trackearse **se cierra con fecha, nunca se borra** — así la historia sigue siendo interpretable. |
| `seo_competitors` | Dominios competidores por target, con la misma disciplina de vigencia. |

**Mediciones** (qué se midió — append-only, inmutables, con triggers que rechazan UPDATE/DELETE):

| Tabla | Qué guarda |
|---|---|
| `seo_rank_snapshots` | Una fila por keyword × motor × dispositivo × fecha de captura: posición, URL que rankea, features del SERP, tráfico estimado y costo del proveedor. |
| `seo_site_audit_runs` | Una fila por crawl técnico del sitio (health score, páginas crawleadas, estado `running/succeeded/degraded/failed`). |
| `seo_site_audit_findings` | Los hallazgos de cada crawl (URL, tipo de problema, severidad `critical/warning/notice`). |
| `seo_backlink_snapshots` | Snapshot semanal del perfil de enlaces (dominios referentes, total de backlinks, domain rank, share tóxico). |

La separación importa porque el negocio de cada familia es distinto: la configuración responde "¿qué estamos midiendo y desde cuándo?"; las mediciones responden "¿qué pasó cada día?". Un snapshot jamás se corrige — si una captura salió mal, se degrada o se marca, pero la historia no se reescribe.

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §4](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (modelo de datos, decisión temporal, split PG ventana caliente / BigQuery historia larga). Migración TASK-1299 en `migrations/`.

### 2. El modelo de acceso per-org con tiers y cupos (TASK-1301)

El SEO se habilita **por organización, no por rol** (misma lección del AEO: un rol no se factura; un módulo asignado a una org sí). Tiene tres piezas:

- **Capabilities `growth.seo.*`** — 5 permisos finos: configurar targets (`target.configure`), disparar audits (`audit.run`), leer observaciones (`observation.read`), leer el reporte cliente (`report.read_client`, scope `own`) y administrar el entitlement (`entitlement.manage`, solo `EFEONCE_ADMIN` + `EFEONCE_ACCOUNT`).
- **Módulo per-org `seo_v1`** — vive en el catálogo `greenhouse_client_portal.modules`; una org tiene SEO cuando existe un assignment activo en `module_assignments`. El **tier comercial** va en `metadata_json.seo_tier`: `contracted`, `trial` o `pilot`.
- **Chokepoint único `enforceSeoRunEntitlement`** — la única puerta por la que pasa cualquier corrida que gasta dinero (DataForSEO cobra por llamada). Evalúa en cadena: ¿hay assignment? → ¿no está vencido? → ¿queda cupo de site-audits del mes? → ¿queda presupuesto USD del mes? Si algo falla, devuelve un `blockedReason` explícito (`no_entitlement` / `expired` / `quota_exhausted` / `budget_exhausted`). Es consumer-agnóstico: la misma puerta sirve para UI, Nexa, la lane `app` y la lane `ecosystem`/MCP.

Los cupos por tier salen de env-knobs con defaults sanos:

| Tier | Site-audits / mes | Presupuesto USD / mes |
|---|---|---|
| `contracted` | 8 | $50 |
| `trial` | 1 | $2 |
| `pilot` | 2 (override por org vía `metadata_json.seo_audit_runs_per_month`) | $10 |

El presupuesto consumido se calcula sumando el `provider_cost` de los snapshots del mes — o sea, el gasto real registrado en la serie temporal, no un contador aparte (eso cambia de fuente cuando exista `seo_provider_spend_daily` en TASK-1300).

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §9](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (entitlements) · chokepoint en [`src/lib/growth/seo/entitlement.ts`](../../../src/lib/growth/seo/entitlement.ts) · sanity live [`scripts/growth/_sanity-seo-entitlement.ts`](../../../scripts/growth/_sanity-seo-entitlement.ts).

## Que NO existe todavia

Nada de lo siguiente está construido; las tablas están vacías hasta que lleguen sus tasks:

| Falta | Task que lo trae |
|---|---|
| Materialización diaria de Search Console (`seo_gsc_daily`) + reader de keyword opportunities | TASK-1302 |
| Captura diaria de rankings (Cloud Scheduler + ops-worker + mirror BigQuery) | TASK-1303 |
| Site audit (queue + poll OnPage async) y snapshot semanal de backlinks | TASK-1304 |
| Derived read SEO ↔ AEO (`readSeoAeoGap`) | TASK-1305 |
| UI operador `/admin/growth/seo` (overview) | TASK-1306 |
| Pantalla ancla: Rank & URL performance over time | TASK-1307 |
| Keyword opportunities (UI) | TASK-1308 |
| Site audit (UI) | TASK-1309 |
| Superficie cliente + Report Artifact + quadrant 360 | TASK-1310 |

Además: **ninguna organización tiene todavía el assignment `seo_v1`**. El primer alta (por ejemplo Grupo Berel) es un paso operativo manual — ver el manual [Asignar el módulo SEO a una organización](../../manual-de-uso/growth/asignar-modulo-seo-organizacion.md). Todo el runtime queda gateado por el flag `GROWTH_SEO_ENABLED` (default OFF, registrado en el Feature Flag State Ledger cuando exista consumo).

## Relacion con el AI Visibility Grader (motores hermanos)

SEO y AEO son los dos motores de **Search Visibility 360** y se diseñaron como espejo deliberado:

- **Mismo patrón de acceso:** módulo per-org (`seo_v1` / `ai_visibility_v1`) + capabilities con el mismo grano + `entitlement.manage` restringido a los mismos roles.
- **Mismo proveedor compartido:** DataForSEO, con familias de endpoints aisladas por circuit breaker para que un problema en el carril SEO no hunda el carril AEO (ni viceversa).
- **Métricas espejo:** el SoV orgánico del SEO (share of visibility en Google) es el reflejo del SoV IA del grader (share of voice en answer engines). La lectura conjunta — "¿dónde te ve Google y dónde te ven las IA?" — es el derived read `readSeoAeoGap` (TASK-1305).

Lo que **no** comparten: datos. Cada motor tiene sus tablas y su frontera; los cruces se hacen por `organization_id` en reads derivados, nunca con FKs entre schemas.

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §2](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (complementariedad SEO ↔ AEO) · [ai-visibility-grader.md](ai-visibility-grader.md) (doc funcional del motor hermano).

## Destino: Wave

Por decisión del operador (2026-08-05), Search Visibility 360 **nace dentro de greenhouse-eo pero su casa de largo plazo es Wave** (`wave.efeonce.org`, `EPIC-037`): Wave será el runtime del producto y Greenhouse quedará como administrador (orgs, acceso, entitlements, handoffs comerciales). Por eso todo el trabajo de `EPIC-022` nace **extraction-ready**:

- El schema `greenhouse_growth.seo_*` es una unidad autocontenida: su único acople deliberado es la FK de `seo_targets` a la organización canónica, y ese intercambio (FK dura hoy → identidad federada en la extracción) es el paso 1 conocido del runbook, no deuda oculta.
- El dominio `src/lib/growth/seo/**` no importa de otros dominios de Greenhouse (solo primitives transversales), para que el grafo se pueda cortar con el seam.
- La lane `ecosystem` será el contrato sister-platform que sobrevive la extracción: tras el cutover, Greenhouse consumirá SEO desde Wave por esa misma API.

Mientras `EPIC-027` (desacople build-runtime) esté activo, ninguna task de EPIC-022 crea deployables por anticipado — la extracción física es un programa posterior con sus propias tasks.

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §17](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (placement, inventario del seam, reglas duras extraction-ready).
