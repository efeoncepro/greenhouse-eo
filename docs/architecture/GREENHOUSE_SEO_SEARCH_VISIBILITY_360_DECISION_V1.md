# ADR — Greenhouse SEO Module as "Search Visibility 360" (complemento del AEO)

> **Status:** Accepted · 2026-07-01
> **Scope:** Growth / SEO / AEO / DataForSEO / Search Console / Entitlements / Commercial
> **Canonical architecture doc:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)
> **Epic:** `EPIC-022` · **Fundacionales:** `TASK-1299` (schema), `TASK-1300` (DataForSEO families), `TASK-1301` (entitlements)

## Contexto

Greenhouse ya mide si los motores de IA citan una marca (AEO Grader, `growth.ai_visibility`, EPIC-020/021). No mide el otro lado — Google orgánico clásico: rankeo, click, evolución en el tiempo. Es media película para el cliente. Ya existen los dos primitives base: **DataForSEO** integrado (`src/lib/ai/dataforseo.ts`, hoy candado a `/v3/serp/`) y **Search Console per-org** (TASK-1282, Grupo Berel conectado live). La pregunta ancla del operador — *"¿cómo rinde una serie de URLs y su evolución en el tiempo?"* — no tiene hoy dónde vivir.

## Decisión

Construir un **módulo SEO** dentro del dominio `growth` (`growth.seo`), hermano del AEO, y envolver ambos en una sola narrativa de producto: **"Search Visibility 360"** — los dos internets de búsqueda (Google orgánico + motores de IA) en un panel, con la misma identidad de org, el mismo evidence ledger gobernado y el mismo modelo de entitlement. Se materializa como programa `EPIC-022` (12 tasks).

### Decisiones vinculantes

1. **Dominio `growth.seo`, hermano de `growth.ai_visibility`.** Reusa schema `greenhouse_growth`, entitlements per-org, cliente DataForSEO y reader GSC. No es módulo isla ni vive en `commercial`/`public_site`.
2. **Boundary duro SEO ↔ AEO.** SEO = serie temporal continua (Google clásico); AEO = veredicto episódico (citación IA). Se cruzan **solo por `organization_id`** en un derived read (`readSeoAeoGap`), **NUNCA** por schema compartido ni FK cross-motor. Un dominio puede rankear #1 y ser citado 0× por las IA: es señal, no bug a reconciliar. NUNCA promediar las dos métricas en un número.
3. **Modelo temporal append-only por `capture_date`.** Los snapshots (rank/audit/backlinks) son mediciones inmutables, no términos SCD. Config (keywords/competitors) es membership append-only con `effective_from/to`. PG = ventana caliente (~180d), BQ = historia infinita. Esto además **materializa GSC**, que hoy es read-through sin historia propia (>16 meses, latencia, cuota).
4. **DataForSEO: ampliar con allowlist cerrado de familias, no aflojar el candado.** Registry declarativo de 5 familias (`serp/labs/onpage/backlinks/domain`), con circuit breaker y cost-tracking **por familia**. NUNCA prefijo libre suministrado por el caller.
5. **Entitlements `growth.seo.*` per-org vía `module_assignments`, NO por rol** (lección TASK-1248), con las 4 puertas (público/contratado/trial/operador). Chokepoint único `enforceSeoRunEntitlement` con quota cap por-org (gate de costo).
6. **Full API Parity.** Cada capacidad es un reader/command gobernado en `src/lib/growth/seo/**`, reusable por UI + Nexa + MCP por construcción. Writes vía `propose → confirm → execute`.
7. **Boundary duro contra Payroll/Finance.** El dominio SEO NUNCA escribe ni referencia payroll/finance/compensación.
8. **Honestidad de datos.** GSC = medido (●, verdad de primera parte del dominio propio); DataForSEO = estimado (◑, mercado/competidores/scraped). Badges en toda superficie; degradación honesta, nunca `$0` fantasma.
9. **Scheduling async, no live-per-view.** Rank diario, audit semanal (queue+poll OnPage), backlinks semanal, GSC snapshot diario — todo Cloud Scheduler + ops-worker + reactive BQ mirror, con reliability signals. Nunca DataForSEO en el render de un dashboard.
10. **Comercial: capacidad del servicio + puerta contratada, NO producto standalone.** Interno-first en Berel → contratado → lead magnet foto. AEO = punta de embudo; SEO = profundidad recurrente (NRR bowtie HubSpot). El tracking histórico vive SOLO detrás de la puerta contratada.

## Alternativas consideradas y rechazadas

- **Un cliente DataForSEO por familia** → rechazado: duplica auth/timeout/cost/secret 5×. Se elige transporte compartido + gate de familia declarativo.
- **Aflojar `normalizeEndpoint` a prefijo libre** → rechazado: un endpoint inyectado podría pegarle a una superficie cara/inesperada. Allowlist cerrado de 5 familias nombradas.
- **Fusionar scoring SEO+AEO en un índice único** → rechazado: distorsiona ambas señales; el valor está en el cruce fila-por-fila, no en el promedio.
- **Rank tracking live-per-view contra DataForSEO** → rechazado: costo + latencia + cuota. Reads sobre snapshots materializados.
- **SEO como quinto producto standalone / SKU aparte** → rechazado: rompe la doctrina ASaaS (el portal es plumbing, no eje vendible). Es capacidad del servicio + puerta contratada.
- **Entitlement por rol** → rechazado: repite el error de TASK-1248. Per-org vía `module_assignments`.
- **SCD Type-2 para snapshots** → rechazado: son mediciones (cada día un hecho), no términos con supersede.

## Consecuencias

- **Positivas:** una categoría propia ("los dos internets de búsqueda en un panel") que ni Semrush ni Profound ocupan; reuso máximo de primitives ya pagados (DataForSEO, GSC, entitlements, report artifact); el gap de materialización de GSC queda resuelto de paso; margen del retainer sube (reemplaza licencias Semrush).
- **Riesgo #1 — costo DataForSEO** (rank tracking O(orgs × keywords × devices × días); Lighthouse $0.00425/pág): mitigado con GSC-first (gratis/medido), quota cap por-org en el chokepoint, audits programados, signal `seo.provider.cost_over_budget`.
- **Reversibilidad:** todo detrás de `GROWTH_SEO_ENABLED` (default OFF) + assignment per-org; rollback = revocar assignment (la historia append-only no se borra por diseño).
- **Secreto compartido con AEO:** DataForSEO comparte credenciales/cuota con el AEO AI Overview; los breakers y budgets **por familia** aíslan SERP-AI (AEO) de Labs/Backlinks/OnPage (SEO).

## Seguimiento

Programa `EPIC-022`. Fundacionales `TASK-1299/1300/1301`. Camino de máximo valor / mínimo costo: `TASK-1302 → TASK-1306 → TASK-1307` (dashboard temporal casi sin gasto DataForSEO). Documentación triple + flag en el Feature Flag Ledger como exit criteria del epic.

### Delta 2026-07-02 — granularidad URL / Topic Cluster

El 360 se extiende del nivel **marca** al nivel **página/topic cluster**: para una landing o cluster, análisis unificado de keywords · avg position · clicks · **grounded queries que cita la IA** · citation share · cuadrante 360 a ese nivel (el diferenciador más fuerte del producto; nadie lo da). No cambia ninguna de las 10 decisiones vinculantes: el cruce sigue siendo un **derived read** (join `org + url/cluster`), sin merge de tablas ni fusión de scoring (boundary §2 intacto). Materia prima ya existe: el grader captura citas con URL (`GrowthAiVisibilityCitation`); la extensión es atribución/lectura + entidad cluster + read unificado. Tasks `TASK-1311/1312/1313`. Detalle: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §15.
