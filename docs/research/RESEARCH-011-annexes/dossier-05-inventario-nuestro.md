# Dossier 05 — Inventario de lo que YA tenemos: SEO / AEO / DataForSEO

> Medido el **2026-09-11** sobre `/Users/jreye/Documents/greenhouse-eo`, rama `develop` (HEAD `cbd375bf5`).
> Documento descriptivo: sólo lo que EXISTE hoy, con evidencia. Sin juicio de gaps.

---

## A) NUESTRAS SKILLS

### A.0 Dónde viven realmente (importante para el diff)

Las tres skills son **canónicas dentro del repo**, no en `~/.claude/skills/`:

| Skill | Repo `.claude/skills/` | Repo `.codex/skills/` | `~/.claude/skills/` |
|---|---|---|---|
| `dataforseo-operator` | ✅ SKILL.md + `references/` (10 archivos) | ✅ SKILL.md + `agents/openai.yaml` (**sin** `references/`, por diseño) | ❌ no existe |
| `seo-aeo` | ✅ bundle completo (30 archivos) | ✅ byte-idéntico | ⚠️ copia **stale** (2026-08-25) |
| `seo-aeo-practice` | ✅ bundle completo (30 archivos) | ✅ byte-idéntico | ❌ no existe |

Gate mecánico: `pnpm skills:mirrors` → `scripts/skills/validate-mirrored-skills.mjs`
(corre dentro de `pnpm local:check`). Las tres están en el manifiesto de espejos:
- `seo-aeo` → `mode: 'byte-identical'` (`scripts/skills/validate-mirrored-skills.mjs:131`)
- `seo-aeo-practice` → `mode: 'byte-identical'` (`:137`)
- `dataforseo-operator` → `mode: 'shared-files'` con `agentLocal` nominal de 11 rutas
  (`agents/openai.yaml` + los 10 `references/*.md`) (`:149-166`)

**Ejecución del gate hoy: VERDE** (22 skills espejadas idénticas, incluidas las tres).

---

### A.1 `dataforseo-operator`

Ruta canónica: `/Users/jreye/Documents/greenhouse-eo/.claude/skills/dataforseo-operator/SKILL.md`
(48.077 bytes). Espejo Codex: `.codex/skills/dataforseo-operator/SKILL.md` (byte-idéntico) +
`agents/openai.yaml` (519 B).

**Tesis declarada:** skill de DOS capas inseparables — (1) oficio de la API DataForSEO v3
(as-of 2026-09-02) y (2) contrato Greenhouse interno. "La capa 1 nunca autoriza saltarse la capa 2."

#### Estructura de secciones del SKILL.md
1. Frontmatter (`name`, `description` con triggers explícitos: DataForSEO, SERP API, dataforseo_labs,
   backlinks API, on_page, instant pages, lighthouse, AI Mode, AI Overview, ai_optimization,
   LLM Mentions, rank tracking, keyword research, keyword gap, site audit, spam score, spend guard SEO).
2. **Regla cero — contrato Greenhouse (NO negociable)** — 10 viñetas duras.
3. **Mapa de decisión por trabajo** — tabla de 20 filas (quiero… → familia → endpoint → método → costo → reference).
4. **Carril AI — visibilidad en motores de respuesta** — 5 bloques ordenados por madurez.
5. **Modelo operativo de la API** — HTTP 200 ≠ éxito, task vs live, delivery, expiración, límites, sandbox, filtros, URLs de doc.
6. **Palancas de costo** — tabla de 10 multiplicadores.
7. **Límites del transporte canónico** — 5 límites numerados.
8. **Ampliar el allowlist (proceso gobernado)** — 5 pasos en el MISMO PR.
9. **Sinergias con otras skills** — tabla de 9 skills.
10. **References (load-on-demand)** — tabla de 10 archivos.
11. **Estado del runtime y drift conocido (as-of 2026-08-28)** — ~15 viñetas largas con TASK-IDs, flags, schedulers, revisiones de Cloud Run.

#### Familias / endpoints DataForSEO cubiertos EXPLÍCITAMENTE

Allowlist cerrado (5) + candidatas fuera del allowlist:

| Familia | Prefijo | Estado |
|---|---|---|
| `serp` | `/v3/serp/` | En allowlist · productiva (AI Mode + organic) |
| `labs` | `/v3/dataforseo_labs/` | En allowlist · 7 consumers |
| `backlinks` | `/v3/backlinks/` | En allowlist · productiva (semanal) |
| `onpage` | `/v3/on_page/` | En allowlist · productiva (site audit) |
| `domain` | `/v3/domain_analytics/` | En allowlist · **sin consumer** (declarado) |
| `ai_optimization` | `/v3/ai_optimization/` | **FUERA** — candidata #1 (reference 08) |
| `content_analysis` | — | FUERA — candidata #2 (brand monitoring + sentiment) |
| `business_data` | — | FUERA — candidata #3 acotada (reviews/listings) |
| `keywords_data` (Google Ads/Trends/Clickstream) | — | FUERA a propósito — usar `labs` |
| `merchant` / `app_data` | — | FUERA — sólo con cliente e-commerce/app |
| Content Generation | — | **Retirada** — ya no existe en la doc v3 |

Endpoints nombrados en el cuerpo del SKILL.md: `serp/google/organic/task_post`+poll,
`organic/live/advanced`, `ai_mode/live/advanced`, `load_async_ai_overview`, SERP AI Summary,
`keyword_overview`, `keyword_ideas`, `domain_intersection`, `page_intersection`, `ranked_keywords`
(incl. `item_types: ai_overview_reference`), `bulk_traffic_estimation`, `backlinks` bulk→`summary`→drill,
`backlinks/domain_intersection`, `on_page/task_post`→`summary`→reads, `instant_pages`,
`content_parsing/live`, `lighthouse/live`, `validate_micromarkup`/`microdata`,
`domains_by_technology`, `domain_technologies`, `whois/overview`, `/v3/appendix/user_data`,
`$path/id_list`, `$path/errors`, `tasks_ready`, `webhook_resend`, `GET /v3/serp/google/locations/{cc}`,
y (fuera de allowlist) `llm_mentions`, `llm_responses`, LLM Scraper, AI Keyword Data.

#### Heurísticas y umbrales NUMÉRICOS declarados
- **Breaker:** 5 fallos consecutivos → open; cooldown 60 s; half-open de sonda única. Cuentan
  `429/402/403/5xx`; **no** cuentan `400/404` de caller.
- **Costos (as-of 2026-08-06):** SERP task-based $0,0006/SERP (3,3× más barato que live) ·
  SERP live $0,002 (×2 con `load_async_ai_overview`) · AI Mode $0,004/request ·
  Labs `keyword_overview` $0,012/req + $0,00012/fila · Labs históricos ×10 ($0,12/req + $0,0012/fila) ·
  `bulk_traffic_estimation` ~$0,13/1.000 dominios · Backlinks $0,024/req + $0,000036/fila ·
  OnPage $0,00015/pág (JS ×9 = $0,0015; browser rendering ×33 = $0,0051) ·
  auditar 1 URL agéntico ~$0,01 las 4 llamadas · `keywords_data` Ads $0,06/1.000 kws ·
  Trends $0,0012–0,006/task · `domains_by_technology` ~$1,21/1.000 dominios ·
  `whois/overview` $0,12/task + $0,0012/dominio · SERP AI Summary $0,01/request ·
  LLM Mentions $0,1/request + $0,001/fila (~$1,1 por 1.000 filas) ·
  LLM Responses live $0,0006+LLM / task-based $0,0002 + $0,01 prepago ·
  LLM Scraper $0,0012–0,004/página · AI Keyword Data $0,0001/kw ·
  Content Analysis ~$0,06/1.000 filas.
- **Palancas multiplicadoras:** operadores de búsqueda (`site:`, `filetype:`) ×5 ·
  `calculate_rectangles`/`load_async_ai_overview` ×2 · `enable_javascript` ×9 ·
  `enable_browser_rendering` ×33 · `include_clickstream_data` ×2 · históricos Labs ×10 ·
  `depth` default 10 / máx 200 (proporcional).
- **Límites de la API:** 2.000 calls/min · 100 tasks/POST · 30 simultáneas en familias live ·
  filtros máx 8 · `order_by` máx 3 · regex RE2 ≤1.000 chars · paginación `offset` ≤10–20k ·
  `tasks_ready` ventana 3 días / 20 calls/min / no escala >1.000 tasks/min ·
  `webhook_resend` hasta 100 ids gratis · postback timeout 10 s ·
  expiración 30 días task-based (HTML 7) · `id_list` 6 meses · `errors` 7 días.
- **Status codes:** `20000` ok · `20100` created · `40602` en cola · `40205`/`40206` duplicate guard ·
  `40403` expirado · `40501`/`40201` (falsos negativos del adapter AI Mode).
- **Timeout del transporte:** 35 s (default de `postDataForSeoTask`); health check 15 s.
- **Cobertura LLM Responses:** 73 modelos (33 ChatGPT incl. gpt-5, 14 Claude incl. sonnet-4,
  23 Gemini, 3 Perplexity sonar); Gemini y Perplexity **live-only**.
- **LLM Mentions:** base longitudinal del proveedor desde 2025-08-01; cobertura sólo
  ChatGPT (US/English) + Google AI Overview.
- **ETV:** 14 familias Labs ETV-capable; corte global `2026-11-01T00:00:00Z`;
  shadow real `etvshadow-f3fef9b3c2a8` (26 requests / USD 1,09536; improved err. rel. 49,4 % vs
  legacy 321,3 % contra GSC en berel.com; Jaccard 1,0; escala ≈ −60 %).
- **Techos de gasto diferido:** `GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET` default 200 ·
  `GROWTH_SEO_COMPETITORS_PER_TARGET` default 5 · `GROWTH_SEO_COMPETITOR_COVERAGE_ROW_LIMIT` 500 ·
  `GROWTH_SEO_BACKLINK_DRILLDOWN_MIN_BACKLINK_MOVEMENT` 10 · `…MIN_REFDOMAIN_MOVEMENT` 3 ·
  `GROWTH_SEO_BACKLINK_DETAIL_ROW_LIMIT` 100 · `GROWTH_SEO_URL_VISIBILITY_ROW_LIMIT` 100 ·
  topes AEO por tier `{CONTRACTED,PILOT,TRIAL}_MONTHLY_BUDGET_USD` = 60/10/3 · aviso al 80 % del tope.
- **Costos MEDIDOS propios:** keyword gap USD 0,1076 por competidor/ciclo (estimado peor caso 0,144) ·
  rank capture depth 20 + `load_async_ai_overview` ≈ 620 observaciones top-N/día.
- **Entitlement:** gate re-consultado cada **K=10** llamadas en batches (`entitlement.ts:288-307`).

#### Qué NO cubre (declarado explícitamente en el propio SKILL.md)
- **No decide estrategia SEO/AEO** (eso es `seo-aeo`) ni **precio al cliente** (eso es pricing/practice).
- **No hay camino runtime** para AI Optimization, Content Analysis, Business Data, Merchant,
  App Data, Keywords Data, Trends: "proponer ampliación gobernada primero".
- **Transporte POST-only:** `task_get/$id` y `tasks_ready` (GET con id en path) NO funcionan;
  SERP task-based y Lighthouse `task_get` requieren ampliar el transporte.
- `cost` de la respuesta es del **batch**, no per-task.
- Breaker por **familia**, no por operación.
- `postDataForSeoSerpLiveAdvanced` congelado y **no atribuye gasto**.
- Frecuencia de refresh de la base LLM Mentions **no publicada** por el proveedor.
- Precios del arch doc §6 (2026-06) ~20 % bajo la doc actual.
- Pendientes declarados: guard de deploy AIO sin creds en ops-worker (TASK-1341);
  rotación del password DataForSEO pre-producción (TASK-1265/1341).

#### Archivos de referencia (`references/`, sólo en `.claude/`, 248 KB)

| Archivo | Bytes | Resumen |
|---|---|---|
| `00-fundamentos.md` | 18.519 | Transversales: auth y formato, task-based vs live, precios/costos, límites y sandbox, errores y reintentos, filtros (`filters`/`order_by`/`limit`/`offset`), gotchas, fuentes con as-of 2026-08-06. |
| `01-serp.md` | 20.276 | SERP API: catálogo de motores y verticales, Google Organic en detalle, **AI Mode y AI Overview (AEO)**, live vs task-based + colas, locations/languages, gotchas, oportunidades. |
| `02-labs.md` | 33.485 | Labs (as-of 2026-09-01): catálogo de endpoints, semántica de métricas, filtros/orden, modelo de costo verificado, Labs vs Keywords Data (Google Ads), gotchas (incl. §7 gotcha 8 `keyword_difficulty` → `deriveLinkBarrier`), §3.1 ETV versionado. |
| `03-backlinks.md` | 22.458 | Backlinks: catálogo, métricas propias (spam score, rank), params clave, modelo de costo live + camino bulk, índice y frescura, gotchas. |
| `04-onpage.md` | 30.028 | On-Page: flujo de crawl, endpoints instant/live (uso agéntico), checks + OnPage Score, validación de microdata/schema, JS rendering, Lighthouse, costo, gotchas, **§11 cómo NO leer un reporte OnPage (verificado en UI, TASK-1309)**. |
| `05-keywords-domain-analytics.md` | 20.315 | Keywords Data API (Google Ads / Trends / Clickstream) + Domain Analytics (technologies, whois), costos verificados, gotchas, páginas de doc caídas. |
| `06-resto-catalogo.md` | 17.605 | Business Data, Merchant, App Data, Content Analysis, Content Generation (**ausente de la doc**), AI Optimization; evaluación de candidatas a allowlist. |
| `07-contrato-greenhouse.md` | 58.589 | **Contrato interno**: §1 cliente canónico y firmas · §2 allowlist · §3 breaker · §4 spend guard y costos · §5 consumers · §5b gasto diferido sin llamar al proveedor (TASK-1308/1659) · §5c gasto por CICLO (TASK-1661) · §5d carril `prospect` (TASK-1709) · §5e ETV metodología versionada · §5f shadow legacy/improved + cutover 2026-09-03 · §6 secretos/env · §7 invariantes · §8 tasks · §9 convenciones de skill dual. |
| `08-ai-optimization.md` | 24.133 | Deep-dive AI Optimization: LLM Responses, LLM Scraper, AI Keyword Data, LLM Mentions, tabla de precios verificada, gotchas, casos de uso Efeonce. |
| `09-editorial-mining.md` | 3.179 | Minería editorial orientada al negocio: antes de comprar, expansión y control, salida. |

---

### A.2 `seo-aeo`

Ruta canónica: `.claude/skills/seo-aeo/SKILL.md` (26.558 bytes). Espejo Codex byte-idéntico.
Bundle total 30 archivos / ~334 KB.

**Tesis declarada:** skill "de dos manos" — conocimiento experto del dominio búsqueda+IA 2026 +
capacidad de ejecución (Semrush MCP, browsing, generación de artefactos).
**Sello de frescura: núcleo verificado as-of 2026-06**, con protocolo de reverificación en `SOURCES.md`.
Delta 2026-09-10: entra ASO como superficie adyacente.

#### Estructura de secciones del SKILL.md
- §0 Cómo se usa (orden obligatorio, 7 pasos: diagnosticar → cargar sólo el módulo → priorizar RICE →
  verificar lo volátil → guardrails `ANTIPATTERNS` → cerrar con medición → informe cliente con módulo 09).
- §1 Modelo mental: **tres capas** (Capa 1 fundamentos / Capa 2 SEO clásico / Capa 3 AEO-GEO); las tiendas de apps repiten las tres.
- §2 **Intake diagnóstico** de 8 preguntas obligatorias (motor objetivo · vertical YMYL · tamaño/tipo de sitio · estado actual · geografía/idioma · objetivo de negocio · datos/herramientas · recursos).
- §3 **Mapa de módulos load-on-demand** (~30 filas) + subsección "Contrato de búsqueda para Cluster Experience federada" (external search vs platform search vs downstream progress; GSC Platform Properties).
- §4 **Priorización RICE** + subsección "Ordenar hallazgos que ya vienen de un crawler (≠ ordenar iniciativas)", 5 reglas.
- §5 **Herramientas** (Semrush MCP, browsing/WebSearch/WebFetch, generación de artefactos, overlay Efeonce, Radiografía AEO) + "Secuencia de evidencia para propuestas" (Grader → X-Ray → Greenhouse) + regla de honestidad de datos.
- §6 Voz, idioma y entrega (es-CL neutro, tuteo, sin voseo; cita fuentes con `as-of`).
- §7 **Principios cross-cutting** (7 principios).

#### Heurísticas y umbrales NUMÉRICOS declarados
- **Datos de mercado (verificados 2026-06):** AI Overviews en ~**48–50 %** de búsquedas (Mar 2026) ·
  **65 %** de búsquedas sin click, **83 %** cuando hay AI Overview ·
  marcas citadas dentro del AIO ganan ~**35 %** más clicks orgánicos que el #1 orgánico ·
  sólo ~**11 %** de los dominios citados se solapan entre ChatGPT y Perplexity (sobre 680M citas).
- **RICE:** `(Reach × Impact × Confidence) / Effort`; Impact `3 masivo / 2 alto / 1 medio / 0.5 bajo / 0.25 mínimo`;
  Confidence `100 % probado / 80 % razonable / 50 % especulativo`; Effort en persona-semanas.
- **Answer capsules: 40–60 palabras** bajo H2.
- **Capilaridad del grafo interno:** medir sólo enlaces editoriales → descartar lo que aparece en **>50 %** de las páginas.
- **Striking distance: posiciones 8–20** (con curva de CTR del propio sitio); posición ponderada por impresiones; piso mínimo de impresiones.
- **Ordenar hallazgos de crawler:** severidad como **corte ABSOLUTO** (nunca sumando); dentro del nivel
  `(páginas afectadas × valor de búsqueda) ÷ esfuerzo`; valor de búsqueda `high|medium|low` como eje ortogonal;
  `low` se hunde pero no desaparece; el esfuerzo es estimación propia, no del crawler.
  Caso fuente medido 2026-08-08 (auditoría Grupo Berel): favicon ausente en 91 páginas vs `alt` ausente en 50.
- **Menciones de marca pesan ~3×** más que los backlinks para visibilidad IA (data 2026).
- **Claim RETIRADO explícitamente:** «<2 meses → +28 % citas» — `SOURCES.md` no pudo localizar fuente reproducible.
- **Semrush MCP:** reportes `phrase_related`/`phrase_questions` ~**40 unidades por línea**; el error
  "el plan no incluye MCP" **miente** (es cuota); regla de distinción: si funcionó antes en la misma sesión, es cuota.
- **Bajo impacto declarado:** `llms.txt` (Google no lo usa; ROI marginal), keyword density, meta keywords.

#### Qué NO cubre (declarado)
- **No es el negocio**: pricing, packaging, descalificación, outbound → `seo-aeo-practice`.
- **No elige el CMS por SEO**; WordPress se ejecuta con `efeonce-public-site-wordpress`.
- **No duplica** BigQuery/HubSpot/WP logic: enlaza a la skill dueña.
- **Web agéntica / WebMCP** está delegada a la skill `webmcp` (cross-skill), no vive acá.
- **Paid de tiendas** → Reach; venta/empaquetado de ASO → `seo-aeo-practice`.
- **Núcleo con caducidad**: todo dato volátil exige reverificación con browsing antes de afirmarse.

#### Archivos del bundle (30)

**Raíz**
| Archivo | Bytes | Resumen |
|---|---|---|
| `SKILL.md` | 26.558 | Router + intake + RICE + herramientas + principios. |
| `ANTIPATTERNS.md` | 16.361 | Guardrails: **sobre-declarar una cifra** (el error más caro), borde black-hat Google, borde black-hat en tiendas de apps (2026-09-10), anti-patrones AEO/GEO, de proceso/criterio, de inventario y lectura de evidencia (as-of 2026-08-25), señal de alarma transversal. |
| `GLOSSARY.md` | 15.193 | 10 secciones: siglas de la categoría (AEO/GEO/LLMO/SGE), motores y superficies, métricas, cómo se gana la cita, técnico, SEO clásico, competitivo/negocio, producto Greenhouse, fuera de alcance v1, tiendas de apps. |
| `SOURCES.md` | 17.339 | Niveles de volatilidad por tema + fuentes canónicas + protocolo de refresh + datos clave verificados as-of 2026-06 con fuente + ASO as-of 2026-09-10. |

**`modules/` (10)**
| Módulo | Bytes | Resumen |
|---|---|---|
| `01_SEO_TECHNICAL.md` | 26.156 | Crawlability, indexación, rendering JS, CWV (umbrales as-of 2026-06), JSON-LD, **gestión de crawlers IA** (robots retrieval vs training), superficies especiales, leer un site audit sin mentir el diagnóstico, checklist priorizado. |
| `02_SEO_CONTENT.md` | 31.352 | Cobertura por prioridad de negocio, intención > keyword, topical authority, anatomía de página que rankea Y se cita, pre-producción (hito anual, canibalización interna, pre-emptor de tesis), programmatic SEO, content ops, **los dos carriles de priorización**, striking distance con datos propios, keyword research vigente. |
| `03_EEAT_ENTITY.md` | 8.895 | E-E-A-T qué es/qué no, entidad de marca + Knowledge Graph, YMYL, auditoría rápida. |
| `04_AEO_GEO.md` ⭐ | 15.118 | Vocabulario, modelo mental de un answer engine, **Query Fan-Out**, **chunking**, citabilidad con evidencia, prompt/answer-space research, `llms.txt` (verificado 2026-08-30), tácticas por motor, errores frecuentes. |
| `05_OFFPAGE_AUTHORITY.md` | 10.389 | De "links" a "presencia", backlinks de calidad, digital PR, capilaridad de enlaces editoriales, brand SERP, menciones sin enlace, Reddit/foros/UGC, RICE típico off-page. |
| `06_LOCAL_INTERNATIONAL.md` | 4.913 | Parte A local (GBP, local pack) + Parte B internacional/multilingüe (hreflang, ccTLD). |
| `07_MEASUREMENT.md` | 23.518 | Parte A medición clásica (GSC/GA4/BigQuery) · Parte B **Share of Voice en LLMs** · Parte C tráfico IA y exactitud · framework de reporting. |
| `08_PLAYBOOKS.md` | 6.157 | A auditoría SEO+AEO completa · B migración · C recuperación de caída/penalización · D lanzamiento. |
| `09_CLIENT_AUDIT_REPORTING.md` | 7.781 | Reconstruir la gestión antes de recomendar, rendir cuentas desde nuestro rol, hacer comparables las fuentes, validar el Grader antes de adoptar sus conclusiones, cerrar el entregable, presentación institucional. |
| `10_ASO_APP_DISCOVERY.md` | 20.930 | ASO en era IA: intake adicional, Apple App Store, Google Play, ChatGPT y asistentes, puente web↔tienda↔IA, medición honesta, playbook de auditoría, herramientas. |

**`references/` (4)**
| Archivo | Bytes | Resumen |
|---|---|---|
| `agentic-editorial-eeat.md` | 24.214 | Editorial agéntica end-to-end: frontera de skills, research dossier, contrato editorial y metadata, claims y fuentes, Who/How/Why y uso de IA, entidad de autor + schema, estados de publicación/indexación, enlaces y CTA, verificación live, gate de publicación, plantilla de auditoría. |
| `editorial-image-seo.md` | 3.928 | SEO/accesibilidad de imágenes editoriales y SVG: contrato HTML, semántica y alternativas, rastreabilidad/delivery, performance, QA post-publicación. |
| `google-search-console-api-indexing.md` | 6.242 | GSC API, Platform Properties, URL Inspection, sitemaps, procedimiento para URL nueva, overlay Greenhouse. |
| `home-landing-metadata-schema.md` | 6.706 | Home/landings: diagnosticar antes de agregar, redacción, un dueño por entidad, persistencia WordPress/Elementor, evidencia y cierre. |

**`templates/` (6+)** — `audit-checklists.md` (checklists A–G por módulo), `content-brief-aeo.md`,
`fan-out-matrix.md` (matriz de Query Fan-Out), `llms-txt.md`, y `jsonld/` con 5 plantillas:
`article.json`, `faqpage.json`, `localbusiness-breadcrumb.json`, `organization.json`, `person-author.json`.

**`efeonce/` (3)**
| Archivo | Bytes | Resumen |
|---|---|---|
| `AI_VISIBILITY_GRADER.md` | 24.857 | Integración skill↔producto: docs canónicos, render público del informe (live 2026-07-03), Grader→Radiografía, contrato de facts del reporte público (2026-07-04), uso de un run en auditorías, **panel competitivo multi-marca**, tesis del producto, mapeo duro de las **7 dimensiones del score ↔ módulos**, motor de recomendaciones, prompt packs ↔ Query Fan-Out, el grader como SoV IA productizado, providers = muestreo de answer engines, fronteras del dominio `growth`. |
| `EFEONCE_AGENTIC_READINESS_FRAMEWORK.md` | 10.081 | Framework propietario: **5 niveles** (Be Found · Readable · Correct · Actionable · Intrinsic), el modelo honesto de **2 ejes**, mapeo 1:1 al Grader, uso en asesoría/pitch, guardrails. |
| `EFEONCE_OVERLAY.md` | 10.532 | Caso Efeonce: WordPress/Kinsta + AI Content Factory + HubSpot + ICP Globe; skills y fuentes a cargar; reglas duras del caso. |

---

### A.3 `seo-aeo-practice` (resumen)

Ruta canónica: `.claude/skills/seo-aeo-practice/SKILL.md` (27.580 bytes). Bundle 30 archivos / ~389 KB.
Espejo Codex byte-idéntico.

**Alcance:** el NEGOCIO de vender SEO/AEO, no el oficio. Owner de portafolio: **Search Visibility 360**,
familia de servicios productizados de Wave dentro de Efeonce.
Tesis: *"en una categoría de humo, la honestidad es el producto"* — el comprador ya compró SEO y tiene cicatriz;
secuencia que gana: regalar el diagnóstico (Grader) → decir para qué NO le sirve → mostrar piso y techo con
supuestos → recién ahí la oferta.

Secciones del SKILL.md: §0 tesis · §1 las cuatro verdades · §2 reglas duras NUNCA · §3 router de módulos ·
§4 contrato de sinergias · §4b la Radiografía AEO como activo · §4c diagnóstico SEO de prospecto (TASK-1709) ·
§4d **ETV: toda cifra lleva versión de fórmula** (delta 2026-09-03) · §5 antes de responder cualquier cosa.

Módulos (14): `01_MERCADO_2026` · `02_COMPRADOR` (la cicatriz) · `03_OFERTA` · `04_PRICING` (41 KB, el más grande) ·
`05_CUNA_GRADER` · `06_DESCALIFICACION` · `07_DISPLACEMENT` · `08_PRUEBA` · `09_CANALES_OUTBOUND` ·
`10_CONVERSACION` · `11_RETENCION` · `12_ACTIVOS` · `13_PROSPECCION` · `14_ASO_COMPLEMENTARIO`.

References (benchmarks competitivos as-of 2026-08, ~98 KB): `BENCHMARK_SUITES_AEO_2026-08.md` (39 KB) ·
`BENCHMARK_VENDORS_INCUMBENTES_2026-08.md` · `BENCHMARK_VENDORS_PUREPLAYS_2026-08.md` ·
`BENCHMARK_PRECIOS_LATAM_2026-08.md` · `BENCHMARK_METODOS_TRANSPARENCIA_2026-08.md`.

Templates (6): `calculadora-piso.md` · `correo-panel-competitivo-aeo.md` · `guion-reunion-grader.md` ·
`hoja-de-cuenta.md` · `propuesta-tipo.md` · `secuencia-outbound.md`.
`efeonce/ESTADO_ACTUAL.md` (39.745 B): estado real de la práctica (Berel, SKY) sin adornos.

---

### A.4 Estado de sincronización de espejos — VEREDICTO

| Comparación | Resultado |
|---|---|
| `.claude` ↔ `.codex` (`dataforseo-operator`) | ✅ **Sincronizado por contrato.** Única diferencia: `.codex` tiene `agents/openai.yaml`, `.claude` tiene `references/` (10 archivos). Ambas excepciones son **nominales en el validador** (`mode: 'shared-files'`, `agentLocal` con las 11 rutas). El `SKILL.md` es byte-idéntico (48.077 B en los dos). |
| `.claude` ↔ `.codex` (`seo-aeo`) | ✅ **Byte-idéntico.** `diff -rq` sin salida. |
| `.claude` ↔ `.codex` (`seo-aeo-practice`) | ✅ **Byte-idéntico.** `diff -rq` sin salida. |
| `pnpm skills:mirrors` | ✅ **VERDE** hoy (22 skills, las 3 incluidas). |
| `~/.claude/skills/` | ⚠️ **Fuera del contrato.** `dataforseo-operator` y `seo-aeo-practice` **no existen** ahí. `seo-aeo` existe como **copia stale de 2026-08-25**: 20 archivos difieren y le faltan 3 (`modules/09_CLIENT_AUDIT_REPORTING.md`, `modules/10_ASO_APP_DISCOVERY.md`, `references/home-landing-metadata-schema.md`). Su frontmatter no menciona ASO ni GSC API. El validador **no la cubre** (sólo compara `.claude` ↔ `.codex` dentro del repo). |

---

## B) CÓDIGO DEL CLIENTE DataForSEO

Archivos (`find src -iname "*dataforseo*"`):
- `src/lib/ai/dataforseo.ts` (14.625 B) — transporte canónico.
- `src/lib/ai/dataforseo-families.ts` (7.645 B) — registry declarativo de familias + consumers.
- `src/lib/ai/dataforseo-breaker.ts` (5.194 B) — circuit breaker por familia.
- `src/lib/reliability/queries/growth-dataforseo-spend-ledger-drift.ts` — reader de la señal de drift.
- Tests: `src/lib/ai/__tests__/` → `dataforseo.test.ts`, `dataforseo-families.test.ts`,
  `dataforseo-breaker.test.ts`, `dataforseo-spend-guard.test.ts`,
  `dataforseo-family-check-parity.test.ts`, `dataforseo-legacy-wrapper-guard.test.ts`.

### B.1 Familias permitidas y sus prefijos

`src/lib/ai/dataforseo-families.ts:44-71` — `DATAFORSEO_FAMILIES`, allowlist **CERRADO**:

| Familia | `prefix` | `requiresOrganization` | `purpose` |
|---|---|---|---|
| `serp` | `/v3/serp/` | **false** (por diseño) | SERP en vivo (AI Mode / organic). Familia COMPARTIDA SEO+AEO. |
| `labs` | `/v3/dataforseo_labs/` | true | Keyword research: volumen, dificultad, ranked keywords, competidores. |
| `backlinks` | `/v3/backlinks/` | true | Perfil de enlaces: dominios referentes, backlinks, toxicidad. |
| `onpage` | `/v3/on_page/` | true | Site audit. Task-based async. |
| `domain` | `/v3/domain_analytics/` | true | Analítica de dominio (tecnologías, Whois). |

`normalizeEndpoint(endpoint, family)` (`:134-150`) **lanza** —no degrada— si el endpoint no empieza
con el prefijo de la familia. El archivo **no** importa `server-only` (es sólo datos y tipos).

`serp.requiresOrganization: false` está documentado como decisión, no deuda (`:27-38`): la atribución
existe (`ProviderAdapterContext` transporta la org de `grader_profiles.organization_id`) pero no se
puede EXIGIR porque el grader corre sobre prospectos públicos sin organización.

Familias **ausentes a propósito** (`:94-97`): `keywords_data` (el equivalente dentro del allowlist es
`labs`; `keyword_ideas` trae el volumen inline) y `business_data` (reseñas/GBP, fuera de alcance).

### B.2 Cómo se declara `consumer` y `organizationId`

`DATAFORSEO_SPEND_CONSUMERS = ['seo', 'aeo']` (`dataforseo-families.ts:116`), vocabulario CERRADO,
espejado por CHECK en la base (migración `20260828015655472_task-1696-seo-provider-spend-consumer-dimension.sql`),
con test de paridad que rompe el build.

`DataForSeoTaskInput` (`dataforseo.ts:145-163`) es una **unión discriminada de dos brazos**:
- brazo `family: 'serp'` → `organizationId?: string` (opcional) + `consumer` **requerido**;
- brazo `family: Exclude<DataForSeoFamily,'serp'>` → `organizationId: string` **obligatorio por tipo** +
  `consumer` requerido + `tasks: DataForSeoTaskPayload[]` (genérico: OnPage/Backlinks toman `target`,
  Labs bulk toma `keywords[]`).

Distinción canónica: **la familia dice QUÉ se compró; el consumer dice PARA QUÉ SERVICIO.**

### B.3 Spend ledger / guard

- Recorder inyectable: `DataForSeoSpendRecorder` + `setDataForSeoSpendRecorder(recorder|null)`
  (`dataforseo.ts:111-121`). Firma: `{ organizationId, family, cost, consumer }`.
- **El costo se registra en el TRANSPORTE, no en cada caller** (`dataforseo.ts`, bloque post-respuesta):
  sólo si `cost !== null && cost > 0 && input.organizationId && spendRecorder`.
- **Fail-fast deliberado:** si `input.organizationId` existe y **no** hay `spendRecorder` registrado,
  el transporte **lanza**. La condición es *"¿HAY organización?"*, NO *"¿la familia la exige?"*.
  Mensaje: "Importa `@/lib/growth/seo/register-provider-spend` en el punto de entrada antes de llamar."
- Un fallo del recorder **nunca** invalida un resultado ya cobrado: se captura con
  `captureWithDomain(error, 'growth', { tags: { source: 'dataforseo_spend_recorder' } })` y se sigue.
- Writer del ledger: `src/lib/growth/seo/provider-spend.ts`; registro del recorder:
  `src/lib/growth/seo/register-provider-spend.ts`.
- Tabla: `greenhouse_growth.seo_provider_spend_daily` — **UN ledger, nunca dos**. Clave única de
  **6 columnas con `NULLS NOT DISTINCT`**: `(organization_id, family, spend_date, consumer, cost_basis, price_table_version)`.
- Chokepoint de entitlement/quota/budget: `enforceSeoRunEntitlement` en
  `src/lib/growth/seo/entitlement.ts`; entitlement per-ORG canónico **`seo_v2`** (`seo_v1` cerrado desde TASK-1677).
  Carril prospecto: `enforceProspectDiagnosticBudget`.
- Resolver AEO aparte: `resolveAeoBudget` en `src/lib/growth/ai-visibility/budget.ts` (misma tabla,
  `consumer='aeo'` + `cost_basis='invoiced'`, resta la porción DataForSEO del estimado).
- `buildSeoProviderSpendMonthlySumSql` filtra `consumer = 'seo'`.
- Señales de reliability: `growth.dataforseo.spend_ledger_drift` ·
  `growth.ai_visibility.observation_yield` · `seo.provider.cost_over_budget` (avisa al 80 % del tope).
- Reader/lane/tool: `readSeoProviderSpendByConsumer` → `/api/platform/ecosystem/growth/seo/provider-spend`
  → tool MCP `get_seo_provider_spend` (**sólo bindings internal**, 404 anti-oracle).

### B.4 Breaker

`src/lib/ai/dataforseo-breaker.ts` — `createDataForSeoBreaker(options)`, instancia compartida
`dataForSeoBreaker`. In-memory **por proceso**, best-effort; la defensa dura del gasto es el presupuesto persistido.

- Estados: `closed | open | half-open` (`:17`).
- `DEFAULT_FAILURE_THRESHOLD = 5` (`:20`), `DEFAULT_COOLDOWN_MS = 60_000` (`:23`).
- Registro **POR FAMILIA** (`Map<DataForSeoFamily, FamilyBreakerEntry>`), con `probeInFlight` para que
  `half-open` deje pasar **una sola sonda** (anti-estampida en crons por organización).
- API: `canAttempt` · `state` · `recordSuccess` · `recordFailure` · `reset`.
- `isProviderHealthFailure(httpStatus)` (`:145-146`): cuentan **429, 402, 403 y ≥500**.
  NO cuentan `400`/`404` (bugs del caller: abrirían el breaker castigando a callers sanos que comparten `serp`).
- Cuando el breaker está abierto, `postDataForSeoTask` **no llama** y devuelve
  `{ ok:false, httpStatus:0, tasks:[], cost:null, latencyMs:0, secretSource:'unconfigured', breakerOpen:true }`
  — no fabrica `tasks` ni `cost`, y `secretSource` no miente porque el return ocurre antes de resolver credenciales.

### B.5 Límites conocidos del transporte (documentados en el código)

`dataforseo-families.ts:74-98`:
1. **POST-only** con body `JSON.stringify(tasks)`. `task_get/$id` y `tasks_ready` son GET con id en el path:
   `normalizeEndpoint` los aceptaría (el prefijo calza) y el proveedor respondería 404/405.
   OnPage se salva porque `summary`/`pages` son POST; **Lighthouse `task_get` y el SERP task-based NO**.
2. **`cost` es del BATCH**, leído de `json.cost` en la raíz: con N tareas no hay reparto exacto por fila.
3. **Breaker por FAMILIA, no por operación**: los polls que fallan apagan también la creación de tareas.
4. **`checkDataForSeoConnection` es carril aparte deliberado**: `GET /v3/appendix/user_data`, sin familia,
   sin allowlist, sin breaker. Health check de credenciales, no capability.
5. **Familias ausentes a propósito** (ver B.1).

Otros hechos del transporte: base URL `https://api.dataforseo.com` (`dataforseo.ts:14`);
auth Basic (`Buffer.from(login:password).toString('base64')`); timeout default **35.000 ms**
(health check 15.000 ms); credenciales vía `resolveSecret` (`DATAFORSEO_API_LOGIN` env +
`DATAFORSEO_API_PASSWORD_SECRET_REF` → GCP `greenhouse-dataforseo-api-password`);
errores del transporte → `captureWithDomain(error, 'growth', { tags: { source: 'dataforseo_transport' } })`.

Wrapper legacy `postDataForSeoSerpLiveAdvanced` (`dataforseo.ts:323-334`): congelado, **no acepta
`organizationId`** (no atribuye gasto), declara `consumer: 'aeo'` fijo; su único consumer productivo
migró a `postDataForSeoTask`; guard `dataforseo-legacy-wrapper-guard.test.ts` rompe el build si otro
módulo productivo vuelve a entrar por ahí.

Constantes exportadas: `DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT = '/v3/serp/google/ai_mode/live/advanced'`
(`:16`) y `DATAFORSEO_DEFAULT_ORGANIC_ENDPOINT = '/v3/serp/google/organic/live/advanced'` (`:17`).

### B.6 Rutas `/v3/` que llamamos HOY — inventario completo

Medido con `grep -rnoE "/v3/[a-z0-9_/-]+" src --include="*.ts" --include="*.tsx"`.
⚠️ El prefijo `/v3/` lo usan **cuatro proveedores distintos**; separados abajo.

#### B.6.1 DataForSEO — código de producción (no-test)

**Familia `serp` (`/v3/serp/`)**
| Endpoint | Archivo:línea |
|---|---|
| `/v3/serp/google/ai_mode/live/advanced` | `src/lib/ai/dataforseo.ts:16` (constante) |
| `/v3/serp/google/organic/live/advanced` | `src/lib/ai/dataforseo.ts:17` (constante) |
| `/v3/serp/google/locations/{cc}` | `src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts:290` |
| `/v3/serp/` (prefijo de familia) | `src/lib/ai/dataforseo-families.ts:46`, `src/lib/ai/dataforseo.ts:20` |

Consumers reales del organic live/advanced: `src/lib/growth/seo/rank-capture.ts` (vía la constante) y
su parser hermano `src/lib/growth/seo/serp-top-results.ts`; del AI Mode:
`providers/google-ai-overview-adapter.ts`.

**Familia `labs` (`/v3/dataforseo_labs/`)**
| Endpoint | Archivo:línea |
|---|---|
| `/v3/dataforseo_labs/google/keyword_ideas/live` | `growth/seo/keyword-discovery/contracts.ts:64` |
| `/v3/dataforseo_labs/google/keyword_suggestions/live` | `growth/seo/keyword-discovery/contracts.ts:62` |
| `/v3/dataforseo_labs/google/related_keywords/live` | `growth/seo/keyword-discovery/contracts.ts:63` |
| `/v3/dataforseo_labs/google/keywords_for_site/live` | `growth/seo/keyword-discovery/contracts.ts:65` |
| `/v3/dataforseo_labs/google/keyword_overview/live` | `growth/seo/keyword-discovery/contracts.ts:69` · `growth/seo/keyword-market-data.ts:678` |
| `/v3/dataforseo_labs/google/ranked_keywords/live` | `growth/seo/etv-methodology/families.ts:54` · `growth/seo/url-visibility/capture.ts:138` · `growth/seo/prospect/contracts.ts:113` |
| `/v3/dataforseo_labs/google/relevant_pages/live` | `growth/seo/etv-methodology/families.ts:70` · `growth/seo/url-visibility/relevant-pages.ts:232,405` |
| `/v3/dataforseo_labs/google/subdomains/live` | `growth/seo/etv-methodology/families.ts:78` · `growth/seo/url-visibility/relevant-pages.ts:232,419` |
| `/v3/dataforseo_labs/google/serp_competitors/live` | `growth/seo/etv-methodology/families.ts:62` |
| `/v3/dataforseo_labs/google/competitors_domain/live` | `growth/seo/etv-methodology/families.ts:86` · `growth/seo/prospect/contracts.ts:114` |
| `/v3/dataforseo_labs/google/categories_for_domain/live` | `growth/seo/etv-methodology/families.ts:94` |
| `/v3/dataforseo_labs/google/domain_intersection/live` | `growth/seo/competitor-coverage.ts:70` · `growth/seo/etv-methodology/families.ts:102` |
| `/v3/dataforseo_labs/google/page_intersection/live` | `growth/seo/etv-methodology/families.ts:110` |
| `/v3/dataforseo_labs/google/domain_rank_overview/live` | `growth/seo/domain-overview/capture.ts:156` · `growth/seo/etv-methodology/families.ts:118` |
| `/v3/dataforseo_labs/google/historical_rank_overview/live` | `growth/seo/domain-overview/history-backfill.ts:111` · `growth/seo/etv-methodology/families.ts:126` |
| `/v3/dataforseo_labs/google/historical_serps/live` | `growth/seo/rank-history-seed.ts:237` · `growth/seo/etv-methodology/families.ts:134` |
| `/v3/dataforseo_labs/google/bulk_traffic_estimation/live` | `growth/seo/domain-overview/traffic-estimation.ts:65` · `growth/seo/etv-methodology/families.ts:142` |
| `/v3/dataforseo_labs/google/historical_bulk_traffic_estimation/live` | `growth/seo/etv-methodology/families.ts:150` |
| `/v3/dataforseo_labs/google/domain_metrics_by_categories/live` | `growth/seo/etv-methodology/families.ts:158` |
| `/v3/dataforseo_labs/` (prefijo) | `src/lib/ai/dataforseo-families.ts:52` |

> `etv-methodology/families.ts` es la **matriz contractual de las 14 familias Labs ETV-capable**:
> lista endpoints con su clasificación ETV (`etv_ignored` / `provider_supported_not_enabled` / capable).
> Algunos endpoints aparecen SÓLO ahí (no tienen caller de compra hoy):
> `serp_competitors`, `categories_for_domain`, `page_intersection`,
> `historical_bulk_traffic_estimation`, `domain_metrics_by_categories`.

**Familia `backlinks` (`/v3/backlinks/`)**
| Endpoint | Archivo:línea |
|---|---|
| `/v3/backlinks/summary/live` | `growth/seo/backlinks/capture.ts:40` |
| `/v3/backlinks/bulk_new_lost_backlinks/live` | `growth/seo/backlinks/capture.ts:41` |
| `/v3/backlinks/referring_domains/live` | `growth/seo/backlinks/detail-capture.ts:42` |
| `/v3/backlinks/anchors/live` | `growth/seo/backlinks/detail-capture.ts:43` |
| `/v3/backlinks/backlinks/live` | `growth/seo/backlinks/detail-capture.ts:44` |
| `/v3/backlinks/competitors/live` | `growth/seo/prospect/contracts.ts:115` |
| `/v3/backlinks/domain_intersection/live` | `growth/seo/prospect/contracts.ts:116` |
| `/v3/backlinks/` (prefijo) | `src/lib/ai/dataforseo-families.ts:57` |

**Familia `onpage` (`/v3/on_page/`)**
| Endpoint | Archivo:línea |
|---|---|
| `/v3/on_page/task_post` | `growth/seo/site-audit/queue-audit.ts:43` |
| `/v3/on_page/summary` | `growth/seo/site-audit/collect.ts:59` · `growth/seo/prospect/contracts.ts:119` |
| `/v3/on_page/pages` | `growth/seo/site-audit/collect.ts:61` |
| `/v3/on_page/` (prefijo) | `src/lib/ai/dataforseo-families.ts:62` |

**Familia `domain` (`/v3/domain_analytics/`)**
| Endpoint | Archivo:línea |
|---|---|
| `/v3/domain_analytics/` (prefijo) | `src/lib/ai/dataforseo-families.ts:67` — **sin endpoint concreto llamado hoy** |

**Fuera de familia (health check)**
| Endpoint | Archivo:línea |
|---|---|
| `GET /v3/appendix/user_data` | `src/lib/ai/dataforseo.ts:344` (`checkDataForSeoConnection`) · documentado en `dataforseo-families.ts:92` |

**Sólo en tests / fixtures (no son llamadas productivas)**
`/v3/keywords_data/google_ads/search_volume/live` (`__tests__/dataforseo-families.test.ts:70`),
`/v3/business_data/google/reviews/live` (`__tests__/dataforseo.test.ts:99`),
`/v3/keywords_data/` (comentario en `dataforseo-families.ts:96`),
y strings sintéticos de validación negativa: `/v3/serpents/`, `/v3/serpapi/algo`, `/v3/serp/x`,
`/v3/dataforseo_labs/x`, `/v3/dataforseo_labs/google/x/live`, `/v3/on_page/summary/task-1`.

#### B.6.2 `/v3/` de OTROS proveedores (para no confundir en el diff)

| Endpoint | Proveedor | Archivo |
|---|---|---|
| `/v3/conversations`, `/v3/conversations/{id}/activities` | **Bot Framework (Teams)** | `src/lib/integrations/teams/bot-framework/{connector-client,sender,token-cache}.ts` |
| `/v3/objects/contacts`, `/v3/objects/companies`, `/v3/objects/leads` | **HubSpot CRM** | `src/lib/growth/ai-visibility/hubspot/crm-client.ts:94,122-137,185` |
| `/v3/objects/0-162/batch/read` | **HubSpot** (custom object services) | `src/lib/hubspot/list-services-for-company.ts:110` |
| `/v3/integration/secure/submit/{portal}/{form}` | **HubSpot Forms** | `src/lib/growth/forms/destinations/hubspot/adapter.ts:7,25` |
| `/v3/sites` (+ `/v3/sites/{site}`) | **Google Search Console API** | `src/lib/growth/search-console/api-client.ts:19,22` |

---

## C) MÓDULO SEO — `src/lib/growth/seo/**`

**Inventario:** 112 archivos `.ts` de producción (excluye tests) + 37 suites de test, en 14 subcarpetas.
Punto de acceso a proveedor: siempre `postDataForSeoTask`; gate siempre `enforceSeoRunEntitlement`.

### C.1 Raíz del módulo
| Archivo | Qué hace |
|---|---|
| `contracts.ts` | Contratos del dominio SEO (materialización GSC + oportunidades) — TASK-1302. |
| `flags.ts` | Feature flag del módulo SEO (default OFF) — TASK-1302. |
| `entitlement.ts` | **Chokepoint único** de entitlement/allowance/budget per-org (`enforceSeoRunEntitlement`, `enforceProspectDiagnosticBudget`, `SEO_MODULE_KEYS_READ = seo_v2`). |
| `resolve-target.ts` | Resolución canónica de target por organización **con mercado explícito** (ISSUE-153; `409 multiple_markets`). |
| `provider-spend.ts` | Writer del ledger de gasto DataForSEO. |
| `register-provider-spend.ts` | Registro del contador de gasto en el runtime actual (import de efecto obligatorio). |
| `provider-pricing.ts` | Precios del proveedor Labs — hecho PURO, runtime-agnóstico. |
| `lens.ts` | **`SeoLens` binaria** (●medido / ◑estimado), lista CERRADA de fuentes, `resolveSeoLens` total — TASK-1785. |
| `lens-coverage.ts` | Caminador que convierte `provenance` en contrato (cada hoja numérica con exactamente un dueño). |
| `lens-surface-manifest.ts` | Censo bidireccional de superficies (rutas del lane + tools `get_seo_*`) contra filesystem y `server.ts`. |
| `ctr-curve.ts` | Curva de CTR por posición con su MUESTRA y veredicto de usabilidad — TASK-1792. |
| `algorithm-updates.ts` | Registro curado de updates CONFIRMADOS del algoritmo de Google — TASK-1307. |
| `competitors.ts` | Commands `declareCompetitors` / `retireCompetitors` (techo, outcome por ítem, reverso) — TASK-1662. |
| `competitor-coverage.ts` | Captura mensual de cobertura de keywords de un competidor declarado (`domain_intersection` ×2). |
| `competitor-discovery.ts` | `readSerpCompetitorCandidates`: propone competidores por recurrencia en el top-N — TASK-1699. |
| `keyword-gap-reader.ts` | `readKeywordGap`: el gap competitivo DERIVADO al leer (excluye por impresiones GSC). |
| `keyword-market-data.ts` | Captura de datos de mercado por keyword vía `keyword_overview` (pre-check de **frescura**, 30 d). |
| `keyword-market-data-batch.ts` | Batch mensual (Cloud Scheduler → ops-worker). |
| `keyword-opportunities-reader.ts` | Reader canónico de oportunidades striking-distance (lente legacy). |
| `rank-capture.ts` | Command gobernado `captureRankSnapshot` — TASK-1303. |
| `rank-capture-batch.ts` | Batch diario de captura de rankings. |
| `rank-evolution-reader.ts` | `readRankEvolution` (la película de posiciones). |
| `rank-history-seed.ts` | Semilla histórica de posiciones vía `historical_serps` — TASK-1655. |
| `rank-history-bq-mirror.ts` | Mirror reactivo `seo_rank_snapshots` → BigQuery. |
| `serp-top-results.ts` | Parser hermano + writer append-only del top-N del SERP ya pagado — TASK-1699. |
| `track-keywords.ts` | `trackKeywords`/`untrackKeywords`: compromiso de gasto diferido con techo + outcome por keyword + reverso. |
| `gsc-daily-materializer.ts`, `gsc-daily-batch.ts`, `gsc-backfill.ts`, `gsc-history-bq-mirror.ts` | Materialización diaria de Google Search Console + backfill + mirror a BigQuery. |
| `grounded-query-bridge.ts`, `grounded-query-reader.ts` | Puente gobernado discovery SEO → draft de grounded query — TASK-1666. |

### C.2 Subcarpetas
| Carpeta | Archivos | Qué hace |
|---|---|---|
| `backlinks/` | `capture.ts` · `reader.ts` · `detail-capture.ts` · `detail-reader.ts` · `should-drill-down.ts` · `anchors.ts` · `backlink-history-bq-mirror.ts` | Snapshot semanal del perfil (`summary` + `bulk_new_lost_backlinks`); **drill-down nominal condicionado** (`shouldDrillDownBacklinks`: predicado puro sobre el delta ya persistido) → `referring_domains`/`anchors`/`backlinks`; `deriveAnchorProfile` (sobre-optimización de anchors, separada de `toxic_share`); reader con TRES estados (`available` · `skipped_no_movement` · `drilldown_failed`). |
| `site-audit/` | `queue-audit.ts` · `collect.ts` · `enqueue-batch.ts` · `findings-map.ts` · `reader.ts` · `site-findings.ts` · `site-audit-history-bq-mirror.ts` | Ciclo async OnPage en 2 fases (`task_post` → poll idempotente `summary`+`pages` → materialización); mapeo puro de checks por página → findings; `site-findings.ts` (TASK-1670): hallazgos de SITIO (acceso de crawlers IA, borde, JSON-LD, sitemap); mirror a BQ. |
| `keyword-discovery/` | `contracts.ts` · `provider.ts` · `queue.ts` · `runner.ts` · `reader.ts` | Seed expansion + enrichment con 5 endpoints Labs live; enqueue + action log append-only; runner async en ops-worker; reader único (app/Nexa/lane/MCP). |
| `work-queue/` | `contracts.ts` · `materialize.ts` · `materialize-batch.ts` · `reader.ts` · `record-decision.ts` · `priority-score.ts` · `score-versions.ts` · `cannibalization.ts` · `client-dto.ts` · `opportunities-adapter.ts` · `collectors/{gsc-striking-distance,discovery-candidate,declared-target,aeo-gap,competitor-gap,consolidation,context}.ts` | **La ÚNICA autoridad de orden del módulo** (TASK-1700). 6 orígenes con CHECK cerrado, 4 verbos (`optimize|create|consolidate|measure`), 3 `score_basis` atados por CHECK a banda y nulidad del score, append-only estricto en 3 tablas, decisión anclada al SUJETO no al `item_id`, propone-jamás-ejecuta, config VERSIONADA append-only + vectores dorados. `cannibalization.ts` = **predicado ÚNICO** `evaluateCannibalization` compartido por dos colectores (v2 `incremental-clicks-v2`, 2026-08-29): no-marca ∧ share de la página principal ≤ **0,7** ∧ ≥2 páginas fusionables; marca por `root_domain` con tolerancia a **1 error de tipeo**; `positionCeilingGuard`; `snippetCeilingClicks` como evidencia, nunca como orden. |
| `etv-methodology/` | `contracts.ts` · `policy.ts` · `families.ts` · `persisted.ts` · `provenance.ts` · `evaluator.ts` · `replay.ts` · `drift-alert.ts` · `shadow-{runner,decision,report,report-markdown}.ts` · `index.ts` + fixtures legacy/improved | Metodología de ETV como **dimensión del hecho**. `buildEtvMethodologyRequest({endpoint})` es la ÚNICA forma de construir `use_improved_etv`; matriz de 14 familias Labs ETV-capable; persistencia por fila (`etv_methodology_version`, `_evidence`, `etv_requested_at`, `etv_policy_version`); shadow `exact_ab` ejecutado + cutover a `improved_layout_clickstream_v2` (2026-09-03); corte global `2026-11-01`. |
| `domain-overview/` | `capture.ts` · `history-backfill.ts` · `persist.ts` · `reader.ts` · `traffic-estimation.ts` | Foto mensual de dominio (`domain_rank_overview`), backfill histórico (`historical_rank_overview`, ~10× costo, con `--dry-run` + tope USD), screening de cartera (`bulk_traffic_estimation`, hasta 1.000 dominios/request). Tabla append-only multi-productor SIN org en la clave. |
| `url-visibility/` | `capture.ts` · `persist.ts` · `reader.ts` · `relevant-pages.ts` · `resolve-subject.ts` | Visibilidad por sujeto-página: `resolveVisibilitySubject` DECLARA la clase (`domain|subdomain|subfolder|url`, CHECK cerrado); captura por `ranked_keywords`; `relevant_pages` + `subdomains` on-demand; `readVisibilityConcentration`. Tercer productor de `seo_keyword_market_data` a costo 0. |
| `prospect/` | `command.ts` · `collect.ts` · `contracts.ts` · `derive.ts` · `reader.ts` · `site-evidence.ts` · `store.ts` | Carril tier `prospect` (TASK-1709): `runProspectDiagnostic` = corrida ÚNICA inline en Vercel, cero cron. Tope duro POR DIAGNÓSTICO; gasto atribuido a `EO-ORG-0007`; toda cifra `estimated`; sin score/veredicto/benchmark; evidencia de sitio sólo vía `@/lib/growth/site-substrate`. |
| `gap/` | `read-seo-aeo-gap.ts` · `quadrant.ts` | `readSeoAeoGap`: derived read cross-módulo "Search Visibility 360" (SEO × AEO) + clasificador puro de cuadrantes. Boundary §1.1: cruce en memoria por `organization_id`, nunca JOIN. |
| `composed/` | `read-dual-lens-visibility.ts` | Presenta las DOS lentes (●GSC / ◑DataForSEO) separadas y rotuladas; **sin campo combinado, por diseño**. |
| `overview/` | `list-seo-spaces.ts` · `read-overview-connection.ts` · `read-overview-kpis.ts` · `read-overview-sidebar.ts` | Cockpit Overview (TASK-1306): spaces elegibles, estado de la fuente medida, KPIs norte + serie, sidebar (salud · movers · cruce AEO). |
| `performance/` | `read-performance.ts` · `read-performance-catalog.ts` · `derive-insight.ts` | Lectura de performance + catálogo + lectura cruzada del resumen (TASK-1307). |
| `client/` | `read-seo-client-surface.ts` · `resolve-seo-metric-signal.ts` · `select-featured-series.ts` · `mock-surface.ts` | Superficies SEO del portal cliente (TASK-1310) + fixture determinista de QA visual. |

### C.3 Notas de los frentes que pediste específicamente
- **backlinks** → ver C.2; doctrina replicable: *"condición de disparo sobre el agregado ya pagado"*.
- **site-audit** → 2 fases async; el step de poll es idempotente; `site-findings.ts` es el bloque AEO-adyacente (crawlers IA, JSON-LD, sitemap).
- **keyword-discovery** → 5 endpoints Labs (`keyword_suggestions`, `related_keywords`, `keyword_ideas`, `keywords_for_site`, `keyword_overview`).
- **keyword-gap** → `competitor-coverage.ts` (captura) + `keyword-gap-reader.ts` (derivación al leer, excluye por GSC).
- **editorial** → **no hay carpeta `editorial/` en `src/lib/growth/seo/`**. La minería editorial vive como
  conocimiento en `dataforseo-operator/references/09-editorial-mining.md` y en
  `docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`; el motor editorial es la skill
  `content-marketing-studio` / `berel-content-production`.
- **work-queue (incl. `cannibalization.ts`)** → ver C.2, fila `work-queue/`.
- **rank-capture** → `rank-capture.ts` + `rank-capture-batch.ts` + `serp-top-results.ts` + `rank-history-seed.ts` + `rank-evolution-reader.ts` + mirror BQ.
- **etv-methodology** → ver C.2, 14 archivos + 4 fixtures JSON (legacy/improved × domain_rank_overview/relevant_pages).
- **competitor-\*** → `competitors.ts` (commands), `competitor-coverage.ts` (captura), `competitor-discovery.ts` (propuesta por top-N).
- **provider-spend / pricing** → `provider-spend.ts` (writer), `register-provider-spend.ts` (registro), `provider-pricing.ts` (precios puros).
- **lens** → `lens.ts` + `lens-coverage.ts` + `lens-surface-manifest.ts` (3 capas de mecanismo, ninguna opcional).

---

## D) GRADER AEO — `src/lib/growth/ai-visibility/**`

**Inventario:** 173 archivos `.ts` de producción (excluye tests) + 79 suites de test.

### D.1 Providers (`providers/`) — qué LLMs consultamos

Registry: `providers/registry.ts` → `createGrowthAiVisibilityProviderAdapters()`.
IDs cerrados en `contracts.ts:29-37`:

| `providerId` | Adapter | Display público (`report/engine-roster.ts`) | Naturaleza |
|---|---|---|---|
| `openai` | `openai-adapter.ts` | `chatgpt` | LLM propio con web_search |
| `anthropic` | `anthropic-adapter.ts` | `claude` | LLM propio con web_search |
| `perplexity` | `perplexity-adapter.ts` | `perplexity` | LLM propio |
| `gemini` | `gemini-adapter.ts` | `gemini` | LLM propio |
| `google_ai_overview` | `google-ai-overview-adapter.ts` | `google_ai_overview` | **DataForSEO** `serp/google/ai_mode/live/advanced` |

Soporte: `types.ts` (interfaz `ProviderAdapter` + `ProviderAdapterContext`) ·
`web-search-adapter.ts` (factory genérica de adapter con búsqueda web) ·
`observation-builders.ts` (constructores de observación + mapeo de errores) ·
`fake-adapter.ts` (no-op determinista para tests) · `index.ts` (barrel).
`policy.ts` resuelve qué providers corren por tier (el tier `light` puede excluir providers caros).
Sin flag/secret, cada adapter resuelve **skip limpio por construcción**.
`PUBLIC_ENGINE_ROSTER` cubre los 5 provider IDs (assert de cobertura en el propio módulo).

**Otros LLMs dentro del dominio** (no son "answer engines observados", son utilidades):
- `brand-intelligence/` — routers con **3 providers** (`gemini-provider.ts` default low-cost ·
  `openai-provider.ts` · `anthropic-provider.ts` premium fallback) + `prompt.ts` (prompt+schema compartido) +
  `fetch-site-content.ts` + `store.ts` + `read-brand-intelligence.ts` + `resolve-public-brand-category.ts`.
- `normalization/prose-extraction/` — mismo patrón de 3 providers (`gemini`/`openai`/`anthropic`) +
  `router.ts` + `prompt.ts` + `contracts.ts`, para extraer estructura de la prosa de una respuesta.
- `normalization/llm-extraction.ts` — hook de extracción LLM (server-only).

### D.2 Prompt packs (`prompt-packs/` + `prompt-pack.ts`) — cómo se construyen los prompt sets

Tres carriles coexistentes:

1. **Packs fijos versionados e inmutables**
   - `prompt-pack-v1.ts` — `prompt-pack.v1`, `locale: 'es-CL'`, `market: 'CL'`. Espejo tipado de
     `docs/architecture/growth/ai-visibility/prompt-pack.v1.json`. Cada prompt:
     `{ id, family, fanOutType, intentStage, namesBrand, text }` con interpolación de
     `{{brand}} {{category}} {{market}} {{competitor}} {{painPoint}} {{year}}` **como DATO delimitado**
     (anti prompt-injection, nunca PII). Ejemplos: `p01` category_discovery/awareness,
     `p05` comparison/comparative con marca, `p07` trust_reputation, `p09` purchase_readiness,
     `p11` local_intent (Santiago de Chile), `p12` enterprise_intent.
   - `prompt-pack-v2.ts` — `prompt-pack.v2`, **additive** sobre V1: único cambio es `p12`
     (V1 nombraba sectores "aerolínea o banca" y contaminaba los controles del brand-set →
     V2 lo neutraliza a "(enterprise)"). V1 queda intacto y reproducible.
   - `index.ts` — registry de packs.
2. **Baselines deterministas por arquetipo** — `archetypes/baseline-packs.ts`:
   7 packs (`consumer_b2c` · `b2b_product_saas` · `retail_ecommerce` · `marketplace` ·
   `public_institution` · … · `unknown`→`archetype-generic.v1`), **sin LLM**, category-noun-based.
3. **Autoría por LLM** — `authoring/author-prompt-set.ts` + `authoring/author-system-prompt.ts`
   ("AEO brain" versionado, server-only) + `prompt-set-command.ts` (commands gobernados) +
   `prompt-set-store.ts` (store + lifecycle).

**Vocabulario cerrado** (`tag-vocabulary.ts`):
- `PROMPT_FAN_OUT_TYPES` = `related | comparative | implicit | recent` (mapea a Query Fan-Out).
- `PROMPT_INTENT_STAGES` = `awareness · problem_aware · consideration · comparison · trust · purchase_intent · local · enterprise · risk` (+).
- `PROMPT_FAMILIES` = `category_discovery · provider_recommendation · comparison · trust_reputation ·
  purchase_readiness · local_intent · enterprise_intent · risk_reputation · message_recall ·
  product_discovery · value_assessment · support_experience` (+).

`prompt-pack.ts` (raíz) hace la interpolación; `resolvePromptInputs` descarta un prompt cuando falta el
insumo (p. ej. sin competidor, `p06` no corre).

### D.3 Probes (`probes/`) — dos ejes

Contratos en `probes/contracts.ts`; registry en `probes/registry.ts`; orquestación en
`probes/gatherer.ts` + `probes/command.ts`; persistencia en `probes/store.ts`.

**Eje `structural`** (`probes/structural/`) — 5 probes:
`robots-txt.ts` (acceso de crawlers IA) · `json-ld.ts` (structured data schema.org) ·
`llms-txt.ts` · `sitemap.ts` · `core-web-vitals.ts` (headless-dependiente).

**Eje `agentic`** (`probes/agentic/`, TASK-1266 Slice 3) — 5 probes + helper:
`well-known-mcp.ts` (`.well-known/mcp`) · `api-discoverability.ts` · `structured-actions.ts`
(`potentialAction`) · `dom-semantics.ts` · `webmcp-tools.ts` (headless-dependiente) ·
`well-known.ts` (helper de sondeo de paths).

**Eje `entity`** (`probes/entity/`, TASK-1267): `knowledge-graph.ts` (Google Knowledge Graph) ·
`wikidata.ts` (Wikidata/Wikipedia) · `reddit-ugc.ts` (presencia Reddit/UGC) · `shared.ts` (helpers puros);
fetcher en `probes/entity-fetch.ts`.

**Sustrato de fetch (TASK-1697):** `safe-fetch.ts`, `read-body.ts`, `html.ts` y `robots-policy.ts` son
**re-export shims** — la implementación real vive en `@/lib/growth/site-substrate` (lint rule
`greenhouse/growth-substrate-boundary` prohíbe deep imports a `ai-visibility/probes/**`).

### D.4 Scoring (`scoring/`)

- `config.ts` — **7 dimensiones con pesos que suman 100**:
  `ai_visibility` 25 · `entity_clarity` 15 · `category_ownership` 15 · `competitive_sov` 15 ·
  `citation_quality` 15 · `message_alignment` 10 · `revenue_intent_coverage` 5.
- `engine.ts` — motor de scoring V1. · `dto.ts` — DTOs de score. · `store.ts` — findings + scores (server-only).
- `command.ts` — command de scoring (server-only). · `index.ts` — barrel.
- `readiness-config.ts` / `readiness-engine.ts` — scoring **de readiness por probe**, con pesos propios:
  structural `robots_txt` 30 · `json_ld` 30 · `llms_txt` 15 · `core_web_vitals` 15 · `sitemap` 10;
  agentic `well_known_mcp` 25 · `api_discoverability` 20 · `structured_actions` 20 · `dom_semantics` 15 (+`webmcp_tools`).

### D.5 Report (`report/`)

`builder.ts` (report builder V1) · `contracts.ts` · `command.ts` (server-only) · `index.ts` ·
`recommendations.ts` (motor de recomendaciones gap→acción) · `trend.ts` (tendencia temporal) ·
`snapshot.ts` (snapshot público inmutable, EPIC-020 A) · `citation-breakdown.ts` (desglose de dominios
citados) · `engine-roster.ts` (mapeo `providerId → display id público` + roster) ·
`report-header.ts` (SSOT del masthead render-ready) · `public-report-response.ts` (ensamblador headless
del payload público) · `short-link.ts` (short links gobernados) · `view-facts.ts` (facts de vista).

### D.6 Resto del dominio (para completitud del diff)
| Carpeta/archivo | Qué hace |
|---|---|
| `run-engine.ts` · `request-run.ts` · `commands.ts` · `lifecycle.ts` · `store.ts` · `contracts.ts` | Motor de corridas del grader, request, commands, lifecycle, store, contratos. |
| `observation.ts` | Helpers de observación (la unidad de dato que produce cada provider). |
| `cost.ts` · `budget.ts` | Estimador de costo + presupuesto AEO en dólares por organización (`resolveAeoBudget`, gate en shadow). |
| `policy.ts` · `assign-tier.ts` · `provision-profile.ts` · `entitlement.ts` · `flags.ts` | Resolución de providers por tier, asignación de tier, provisión de perfil, entitlement, flags. |
| `normalization/` | `normalizer.ts` (determinista) · `contracts.ts` (`NormalizedFinding`) · `llm-extraction.ts` · `source-type-classifier.ts` (clasificador determinista de `sourceType`, ISSUE-120) · `prose-extraction/` (router 3 providers). |
| `accuracy/` | Contrato + `detector.ts` de exactitud de marca V1 (TASK-1238). |
| `taxonomy/` | `catalog.ts` · `contracts.ts` · `mapper.ts` · `resolve-category.ts` (cascade con confianza) · `business-model.ts` (eje buyer-intent) · `hubspot-industry-map.ts`. |
| `brand-intelligence/` | Router 3-provider + prompt + store + `resolve-public-brand-category.ts` (marca pública sin perfil). |
| `review/` + `review-gates/` | `state.ts` · `commands.ts` · `queries.ts` + `gates.ts` (gates de publicación). |
| `public-intake/` | `create-public-run.ts` · `abuse-guard.ts` · `captcha.ts` · `forms-engine-binding.ts` · `aeo-form-grader-adapter.ts` · `store.ts` — el camino público del lead magnet. |
| `public-delivery/` | `finalize-delivery.ts` · `read-guard.ts` · `status-reader.ts` + `email/` (`build-report-attachment.ts`, `dispatch-report-email.ts`, `dispatch-ledger.ts`, `request-report-email.ts`, `events.ts`). |
| `hubspot/` | `command.ts` · `execute.ts` · `crm-client.ts` · `properties.ts` · `property-mapper.ts` · `email-domain.ts` · `report-link.ts` · `events.ts` · `status.ts` — puente grader → CRM. |
| `operator/` | `command.ts` · `execute-operator-send.ts` · `send-report-and-create-lead.ts` · `hubspot-cross-sell-mapper.ts` · `organization-commercial-facts.ts` · `subject-gradeable.ts` · `send-log-store.ts`. |
| `fix-it/` | `command.ts` · `contracts.ts` · `generators.ts` — artefactos "fix-it" accionables. |
| `regrade/` | `scheduler.ts` — reprogramación de re-grades. |
| `evals/` | `eval-runner.ts` · `golden-set.v1.json` · `archetype-coverage-eval.{ts,v1.json}` · `category-taxonomy-eval.v1.json` · `prose-extraction-eval.ts` + fixtures de marca/observación/metodología. |
| `category-guard.ts` · `override-business-model.ts` · `recommendation-status.ts` · `public-report-url.ts` · `client/command.ts` | Guardas y utilidades transversales. |

---

## E) Rutas de evidencia rápidas (para reproducir)

```bash
# Espejos de skills
diff -rq .claude/skills/seo-aeo .codex/skills/seo-aeo
node scripts/skills/validate-mirrored-skills.mjs

# Endpoints /v3 en uso
grep -rnoE "/v3/[a-z0-9_/-]+" src --include="*.ts" --include="*.tsx" | sort -u

# Inventario de módulos
find src/lib/growth/seo -name "*.ts" -not -path "*__tests__*" -not -name "*.test.ts" | wc -l   # 112
find src/lib/growth/ai-visibility -name "*.ts" -not -path "*__tests__*" | wc -l
```
