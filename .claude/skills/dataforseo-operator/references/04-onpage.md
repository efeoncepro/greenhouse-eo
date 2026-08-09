# DataForSEO On-Page API — Dossier técnico

> **As-of:** 2026-08-06 · Fuentes: documentación oficial `docs.dataforseo.com` + pricing/help-center `dataforseo.com`.
> **Nota de URLs:** el índice `https://docs.dataforseo.com/v3/on_page/` devuelve **404** (verificado 2026-08-06). Las rutas canónicas de docs usan guiones (`/v3/on_page-overview/`), aunque las variantes con slash (`/v3/on_page/overview/`, `/v3/on_page/task_post/`) también resuelven. Cada sección cita la URL exacta usada.

---

## 1. Resumen ejecutivo

- On-Page API es el crawler de auditoría técnica de DataForSEO: se monta una task de crawl (`task_post`) sobre un dominio y se leen resultados por ~15 endpoints de análisis (summary, pages, resources, links, duplicados, redirects, waterfall, keyword density, microdata, raw HTML).
- **Lighthouse y Content Parsing viven bajo `on_page`**: `/v3/on_page/lighthouse/*` (task + live) y `/v3/on_page/content_parsing/live`.
- Para uso agéntico, los endpoints clave son los **live/single-URL**: `instant_pages` (auditoría on-page completa de 1 URL en un POST, $0.00015), `content_parsing/live` (contenido estructurado header/main/secondary, con `markdown_view`), `page_screenshot` ($0.0048) y `lighthouse/live/json` ($0.005) — cero montaje de crawl.
- Modelo de costo: base $0.00015/página crawleada; multiplicadores por feature (resources ×2 ≈ $0.00045, JS ×9 ≈ $0.0015, browser rendering ×33 ≈ $0.0051, keyword density ×2 ≈ $0.0003). Los endpoints de lectura post-crawl (summary/pages/links/microdata/waterfall...) son **gratis durante 30 días**.
- ~65+ checks booleanos por página + `onpage_score` 0-100 (por página y sitewide), validación JSON-LD/Microdata, Core Web Vitals con browser rendering, y `custom_js` ejecutable en cada página.
- Gotchas dominantes: resultados expiran a los **30 días**; refund por páginas no crawleadas (pero 4xx/5xx y bloqueos Cloudflare SÍ se cobran); `extended_crawl_status` diagnostica por qué un sitio no se crawleó; robots.txt se puede overridear con `robots_txt_merge_mode: override`.

---

## 2. Flujo de crawl — inventario de endpoints (HOY)

**Fuente:** `https://docs.dataforseo.com/v3/on_page/overview/` (equivalente a `/v3/on_page-overview/`), as-of 2026-08-06.

Lista completa de endpoints documentados bajo On-Page API:

| # | Endpoint | Función |
|---|---|---|
| 1 | `POST /v3/on_page/task_post` | Montar crawl (hasta 100 tasks/llamada, 2000 llamadas/min) |
| 2 | `POST /v3/on_page/force_stop` | Detener un crawl en curso |
| 3 | `GET /v3/on_page/tasks_ready` | IDs de tasks completadas no recogidas |
| 4 | `POST /v3/on_page/summary` (id en el BODY `[{id}]`) | Overview del sitio + progreso de crawl. ⚠️ Verificado en vivo (TASK-1304, 2026-08-06): la variante POST-por-path `summary/$id` responde 200 **sin `tasks`** — el `$id` en el path es solo para el GET |
| 5 | `POST /v3/on_page/pages` | Páginas crawleadas con métricas y checks |
| 6 | `POST /v3/on_page/page_by_resource` | Páginas que contienen un resource dado |
| 7 | `POST /v3/on_page/resources` | Inventario de resources (img/css/js) |
| 8 | `POST /v3/on_page/duplicate_tags` | Páginas con title/description duplicados |
| 9 | `POST /v3/on_page/duplicate_content` | Detección de contenido similar |
| 10 | `POST /v3/on_page/links` | Links internos/externos |
| 11 | `POST /v3/on_page/redirect_chains` | Cadenas de redirect |
| 12 | `POST /v3/on_page/non_indexable` | Páginas bloqueadas a indexación |
| 13 | `POST /v3/on_page/waterfall` | Timeline de carga por página |
| 14 | `POST /v3/on_page/keyword_density` | Frecuencia de términos |
| 15 | `POST /v3/on_page/raw_html` | HTML crudo almacenado |
| 16 | `POST /v3/on_page/microdata` | Validación de structured data (ver §5) |
| 17 | `POST /v3/on_page/instant_pages` | **Live**: auditoría de 1 URL sin crawl |
| 18 | `POST /v3/on_page/page_screenshot` | **Live**: screenshot de 1 URL |
| 19 | `POST /v3/on_page/content_parsing/live` | **Live**: parsing de contenido estructurado |
| 20 | `POST /v3/on_page/lighthouse/task_post` | Lighthouse en cola |
| 21 | `GET /v3/on_page/lighthouse/task_get/json/$id` | Resultado Lighthouse |
| 22 | `POST /v3/on_page/lighthouse/live/json` | Lighthouse live |

(El overview de Lighthouse agrega además `lighthouse/tasks_ready`, `lighthouse/audits`, `lighthouse/versions`, `lighthouse/languages` — ver §7.)

*Nota: `microdata` no aparecía en el listado que devolvió el overview en esta pasada, pero su página propia está viva y verificada (§5). El endpoint `content_parsing` (no-live, post-crawl) existe y requiere `enable_content_parsing: true` en `task_post` — confirmado en la página de content_parsing/live.*

### 2.1 `task_post` — parámetros principales

**Fuente:** `https://docs.dataforseo.com/v3/on_page/task_post/` as-of 2026-08-06.

- **Target/alcance:** `target` (dominio sin `https://` ni `www.`), `start_url` (primera página; con `max_crawl_pages: 1` habilita single-page audit), `max_crawl_pages`, `max_crawl_depth` (homepage = nivel 0), `crawl_delay` (ms entre requests; **default 2000**), `allow_subdomains` (default false), `priority_urls` (hasta 20 URLs que saltan la cola), `force_sitewide_checks` (habilita checks sitewide en crawls de 1 página).
- **Sitemap:** `respect_sitemap` (sigue el orden del sitemap; deshabilita `max_crawl_depth`), `custom_sitemap` (URL alternativa), `crawl_sitemap_only`.
- **Robots override:** `robots_txt_merge_mode` = `merge` (default) | `override`; con `override` es obligatorio `custom_robots_txt`. Es el mecanismo oficial para crawlear sitios que prohíben por robots.txt.
- **JS / rendering:** `load_resources` (img/css/js; extra), `enable_javascript` (extra), `enable_xhr` (requiere JS), `enable_browser_rendering` (emulación completa de browser para **Core Web Vitals**; requiere JS + resources; extra), `custom_js` (JS propio, **máx 2.000 chars y 700 ms de ejecución**; resultado en `custom_js_response`).
- **Browser emulation:** `browser_preset` (`desktop` 1920×1080, `mobile` 390×844, `tablet` 1024×1366), `browser_screen_width/height` (240–9999 px), `browser_screen_scale_factor` (0.5–3.0).
- **Contenido/validación:** `store_raw_html` (habilita el endpoint Raw HTML), `enable_content_parsing` (habilita Content Parsing post-crawl), `validate_micromarkup` (habilita Microdata), `calculate_keyword_density` (extra), `check_spell` + `check_spell_language` + `check_spell_exceptions` (Hunspell).
- **Acceso:** `custom_user_agent` (default `Mozilla/5.0 (compatible; RSiteAuditor)`), `accept_language`, `support_cookies`, `disable_cookie_popup`, `switch_pool` (pools de proxy adicionales), `return_despite_timeout` (páginas que exceden timeout de 120 s).
- **Tuning de checks:** `checks_threshold` (objeto para redefinir umbrales, p. ej. `title_too_short: 30`, `high_loading_time: 3000` ms, `large_page_size: 1048576` bytes), `disable_sitewide_checks` (`test_page_not_found`, `test_canonicalization`, `test_https_redirect`, `test_directory_browsing`), `disable_page_checks`.
- **Gestión:** `tag` (255 chars), `pingback_url` (soporta variables `$id` y `$tag`).

### 2.2 `summary` — el pulso del crawl

**Fuente:** `https://docs.dataforseo.com/v3/on_page/summary/` as-of 2026-08-06.

- `crawl_progress`: `in_progress` | `finished`; `crawl_status`: `max_crawl_pages`, `pages_in_queue`, `pages_crawled`; `crawl_stop_reason` (límite alcanzado, cola vacía, force stop, error).
- `domain_info`: CMS detectado, IP, server, certificado SSL completo (issuer, validez, expiración), y checks de dominio: `sitemap`, `robots_txt`, `ssl`, `http2`, `test_https_redirect`, `test_www_redirect`, `test_page_not_found`, directory browsing, canonicalization.
- `page_metrics`: conteos de links internos/externos, duplicate titles/descriptions/content, broken links & resources, redirect loops, páginas non-indexable, más el rollup de ~50+ checks y el **OnPage Score sitewide** (0–100).
- Diagnóstico de fallo: `extended_crawl_status` (ver §8).

### 2.3 Endpoints de lectura post-crawl

Todos toman el `id` de la task (+ `url` cuando es por página); todos con filtros/orden (`filters` hasta 8, operadores `regex, not_regex, <, <=, >, >=, =, <>, in, not_in, like, not_like`; `order_by` hasta 3; `limit` 100/máx 1000; `search_after_token` para >20k resultados — documentado en `pages`). **Costo $0: "Your account will not be charged for using this function. You can get the results of the task within the next 30 days for free"** (verbatim en microdata y waterfall; patrón general de los GET post-crawl).

- `pages`: por página `onpage_score`, objeto `checks` (§4), `page_timing`, `meta` (title/description/canonical, conteos de links/imágenes/scripts, render-blocking counts).
- `waterfall` (fuente: `https://docs.dataforseo.com/v3/on_page-waterfall/`): timeline por página — `time_to_interactive`, `dom_complete`, `connection_time`, `time_to_secure_connection`, `waiting_time` (TTFB), `download_time`, `fetch_start/fetch_end` — + array `resources` con ventanas de fetch por resource, ubicación en el documento (línea/offset) y `is_render_blocking`.
- `duplicate_tags` / `duplicate_content` / `links` / `redirect_chains` / `non_indexable` / `resources` / `page_by_resource` / `keyword_density` / `raw_html`: según inventario §2; `raw_html` requiere `store_raw_html: true` en el task_post.

---

## 3. Endpoints instant/live (clave para uso agéntico)

### 3.1 `instant_pages`

**Fuente:** `https://docs.dataforseo.com/v3/on_page/instant_pages/` as-of 2026-08-06.

- **Qué es:** auditoría on-page completa de **una URL en vivo**, método Live — un solo POST, resultado inmediato, sin cola ni GET posterior. Es el "audítame esta página ahora" agéntico.
- **Params:** `url` (requerido, absoluto) + los mismos knobs del crawl: `custom_user_agent`, `browser_preset`/`browser_screen_*`, `load_resources`, `enable_browser_rendering`, `store_raw_html`, `accept_language`, `validate_micromarkup`, `check_spell`, `custom_js` (700 ms).
- **Devuelve:** meta tags, métricas de contenido (word count, readability), timing (TTI, LCP, FID, CLS con rendering), checks on-page, análisis de resources con tamaños, `onpage_score` 0-100, errores/warnings de validación HTML.
- **Límites:** 2000 requests/min, máx 30 simultáneos, hasta 20 tasks por request y **máx 5 URLs del mismo dominio por request**.
- **Costo:** $0.00015 por página (igual que base de crawl) + extras si activas resources/rendering.

### 3.2 `content_parsing/live`

**Fuente:** `https://docs.dataforseo.com/v3/on_page/content_parsing/live/` as-of 2026-08-06.

- **Qué es:** parsing en vivo del contenido de una URL a estructura semántica: "link URLs, anchors, headings, and textual content".
- **Params:** `url` + `enable_javascript`, `enable_browser_rendering`, `enable_xhr`, `store_raw_html`, `disable_cookie_popup`, `accept_language`, `custom_user_agent`, `browser_*`, `switch_pool`, `ip_pool_for_scan` (`us`|`de`) y **`markdown_view`** (retorna el contenido como markdown — oro para pipelines LLM).
- **Respuesta (`page_content`):** `header`, `footer`, `main_topic`, `secondary_topic`, `ratings`, `offers`, `comments`, `contacts`. Cada topic trae `h_title`, `main_title`, `author`, `language`, `level`, `primary_content`, `secondary_content`, `table_content` (header/body/footer rows).
- **Costo:** "identical to that of Instant Pages" → $0.00015/página parseada. 2000 llamadas/min, 1 task por llamada.
- Existe además el **`content_parsing` post-crawl** (no-live) que exige `enable_content_parsing: true` en el `task_post`.

### 3.3 `page_screenshot`

**Fuente:** `https://docs.dataforseo.com/v3/on_page/page_screenshot/` as-of 2026-08-06.

- Screenshot en vivo de una URL "as viewed by the DataForSEO crawler and Googlebot". Params: `url`, `full_page_screenshot` (default **true**), `browser_preset`/`browser_screen_*`, `disable_cookie_popup`, `accept_language`, `custom_user_agent`, `switch_pool`, `ip_pool_for_scan`.
- Devuelve la URL de la imagen en el campo `image` (storage de DataForSEO). Costo $0.0048/request. 2000/min, 20 tasks/request, 30 simultáneos.

---

## 4. Checks on-page y OnPage Score

**Fuente:** `https://docs.dataforseo.com/v3/on_page/pages/` as-of 2026-08-06.

`onpage_score` — "shows how page is optimized on a 100-point scale" (por página en `pages`, sitewide en `summary`; pondera issues críticos y warnings; los checks deshabilitados via `disable_page_checks` salen del scoring, y `checks_threshold` recalibra umbrales).

Objeto `checks` por página (booleanos) — lista verificada:

- **Estado/HTTP:** `is_redirect`, `is_4xx_code`, `is_5xx_code`, `is_broken`, `is_www`, `is_https`, `is_http`, `has_meta_refresh_redirect`, `redirect_chain`, `https_to_http_links`, `has_links_to_redirects`.
- **Canonical:** `canonical`, `canonical_chain`, `canonical_to_redirect`, `canonical_to_broken`, `recursive_canonical`, `is_link_relation_conflict`.
- **Meta/HTML:** `no_title`, `has_meta_title`, `title_too_long`, `title_too_short`, `no_description`, `duplicate_title_tag`, `duplicate_meta_tags`, `irrelevant_title`, `irrelevant_description`, `irrelevant_meta_keywords`, `no_h1_tag`, `no_favicon`, `no_image_alt`, `no_image_title`, `no_doctype`, `has_html_doctype`, `no_encoding_meta_tag`, `meta_charset_consistency`, `deprecated_html_tags`, `flash`, `frame`.
- **Contenido:** `low_content_rate`, `high_content_rate`, `low_character_count`, `high_character_count`, `low_readability_rate`, `lorem_ipsum`, `has_misspelling`.
- **Performance/tamaño:** `high_loading_time`, `high_waiting_time`, `no_content_encoding`, `small_page_size`, `large_page_size`, `size_greater_than_3mb`, `has_render_blocking_resources`.
- **URL:** `seo_friendly_url` + sub-checks `seo_friendly_url_characters_check`, `seo_friendly_url_dynamic_check`, `seo_friendly_url_keywords_check`, `seo_friendly_url_relative_length_check`.
- **Estructura/descubrimiento:** `from_sitemap`, `is_orphan_page`, `has_micromarkup`, `has_micromarkup_errors`.

Checks sitewide (en `summary.domain_info.checks`): `sitemap`, `robots_txt`, `ssl`, `http2`, `test_https_redirect`, `test_www_redirect`, `test_page_not_found`, `test_canonicalization`, `test_directory_browsing`.

---

## 5. Validación de microdata / schema

**Fuente:** `https://docs.dataforseo.com/v3/on_page/microdata/` as-of 2026-08-06.

- Endpoint "designed to validate structured JSON-LD data and Microdata". Requiere `validate_micromarkup: true` en el `task_post` (también disponible en `instant_pages`). Params: `id` + `url`.
- Respuesta: `items` con `type` (p. ej. `json_ld`), `inspection_info` (parent types), `fields` (nombre/valor/anidados) y `test_results` con **errores, warnings y flags informativos** de validación.
- **Gratis** post-crawl, resultados 30 días.

---

## 6. JS rendering

**Fuentes:** task_post (§2.1) + pricing (§8 abajo).

- `enable_javascript` ejecuta los scripts de la página (extra ×9 sobre base). `enable_xhr` habilita llamadas XHR (requiere JS). `enable_browser_rendering` emula el browser completo y desbloquea **Core Web Vitals** (LCP, FID, CLS, TTI); requiere `enable_javascript` + `load_resources` y su precio ($0.0051, ×33) **ya incluye** JS y resources.
- `custom_js`: hasta 2.000 caracteres, 700 ms de ejecución por página, resultado en `custom_js_response` — corre en cada página crawleada (o en la URL de `instant_pages`). Incluido en el precio del crawl (sin fee propio listado).
- Browser settings: presets desktop/mobile/tablet o dimensiones custom 240–9999 px + scale factor 0.5–3.

---

## 7. Lighthouse

**Fuentes:** `https://docs.dataforseo.com/v3/on_page/lighthouse/task_post/` · `https://docs.dataforseo.com/v3/on_page-lighthouse-overview/` · `https://dataforseo.com/pricing/on-page/lighthouse-api` — as-of 2026-08-06.

- **Endpoints:** `lighthouse/task_post`, `lighthouse/tasks_ready`, `lighthouse/task_get/json/$id`, `lighthouse/live/json`, más metadatos: `lighthouse/audits` (títulos de todos los audits), `lighthouse/versions`, `lighthouse/languages`. Solo JSON ("HTML results planned for future release").
- **Params task_post:** `url` (requerido), `for_mobile` (default false), `categories` (`seo`, `performance`, `best_practices`, `accessibility` — nota: la lista estándar de Lighthouse incluye también PWA; la página verificada enumeró estas 4), `audits` (filtrar audits individuales), `version`, `language_name`/`language_code`, `tag`, `pingback_url`; emulación: `custom_user_agent`, `browser_screen_*`, `browser_network_throttling_method` (`simulate`|`devtools`|`provided`), `browser_cpu_throttling_multiplier` (1–4), `browser_network_throttling` (`no_throttling`, `fast_4g`, `slow_4g`, `regular_3g`, `pc`).
- **Respuesta:** estructura idéntica al Lighthouse oficial de Google — audits keyed por título, categorías con scores y referencias a sus audits. Performance simula móvil mid-tier en 4G por defecto.
- **Costo:** **$0.005 por página escaneada, precio unificado Standard Queue y Live** ("billed only for setting a task"). Live promedia ~11 s; queue ~45 min. Límites: 2000 llamadas/min, 100 tasks/POST (error `40006` si te pasas), 30 simultáneos.

---

## 8. Modelo de costo

**Fuentes:** `https://dataforseo.com/pricing/on-page/onpage-api` · `https://dataforseo.com/help-center/cost-of-onpage-api-parameters` · `https://dataforseo.com/pricing/on-page/lighthouse-api` — as-of 2026-08-06. *(Ojo: el help-center listó los extras como incrementos — p. ej. `+$0.0003` resources — y la pricing page los totales; ambos cuadran en el total por página.)*

| Modo | Precio/página | Multiplicador vs base |
|---|---|---|
| Crawl base (`task_post`) | $0.00015 | ×1 |
| + `load_resources` | $0.00045 | ×2 (sic, según pricing page; el coeficiente listado es 2) |
| + `enable_javascript` | $0.0015 | ×9 (incluye implícitamente el trabajo de JS) |
| + `enable_browser_rendering` | $0.0051 | ×33 (**incluye** JS + resources) |
| + `calculate_keyword_density` | $0.0003 | ×2 |
| `instant_pages` | $0.00015 | = base (mismos extras aplican) |
| `content_parsing/live` | $0.00015 | "identical to Instant Pages" |
| `page_screenshot` | $0.0048 | — |
| `lighthouse` (task o live) | $0.005 | precio unificado queue/live |

- Facturación por **páginas efectivamente crawleadas**; si pediste más páginas de las que el sitio tiene, **se refunda la diferencia** al completarse la task.
- Los endpoints de lectura post-crawl (summary, pages, links, waterfall, microdata, etc.) **no cobran**: resultados disponibles gratis por 30 días.
- Excepción de refund: páginas 4xx/5xx y bloqueos Cloudflare **sí se cobran** (help-center, §9).
- `custom_js` no tiene fee separado listado (incluido en el precio del crawl).

---

## 9. Gotchas

**Fuentes:** `https://dataforseo.com/help-center/reason-why-website-is-not-crawled-by-onpage-api` · `https://dataforseo.com/help-center/troubleshooting-onpage-api` (localizada vía búsqueda) · docs citadas arriba — as-of 2026-08-06.

1. **Expiración:** resultados de crawl recuperables **solo 30 días**. Si el dossier/auditoría se consume después, persistir el JSON en tu lado (BQ/PG) al cerrar el crawl.
2. **Sitios que bloquean el crawler:** diagnóstico en `summary.extended_crawl_status`: `no_errors`, `site_unreachable`, `invalid_page_status_code` (4xx/5xx o Cloudflare — verificar `server: cloudflare`), `forbidden_meta_tag`, `forbidden_robots`, `forbidden_http_header`, `too_many_redirects`, `unknown`. Mitigaciones: `custom_user_agent`, `accept_language`, `switch_pool`, `ip_pool_for_scan`, whitelisting de las IPs del crawler (lista publicada en el help center; puertos estándar 80/443).
3. **Robots.txt:** por defecto se respeta (`merge`); override explícito con `robots_txt_merge_mode: override` + `custom_robots_txt`. Meta `noindex` / `X-Robots-Tag: noindex` en la primera página también abortan el crawl.
4. **Crawl budget:** `max_crawl_pages` es tope facturable; con refund por lo no usado. `crawl_delay` default 2000 ms → un crawl de 1000 páginas tarda >30 min como piso; `priority_urls` (≤20) adelanta lo importante.
5. **Single-page con contexto sitewide:** `max_crawl_pages: 1` deshabilita checks sitewide salvo `force_sitewide_checks: true`.
6. **Timeout por página:** 120 s; `return_despite_timeout` para rescatar datos parciales.
7. **Dependencias entre features:** `enable_browser_rendering` ⇒ requiere `enable_javascript` + `load_resources`; `enable_xhr` ⇒ JS; `crawl_sitemap_only`/`custom_sitemap` ⇒ `respect_sitemap`; `raw_html` ⇒ `store_raw_html`; microdata ⇒ `validate_micromarkup`; content parsing post-crawl ⇒ `enable_content_parsing`.
8. **Instant pages y dominios repetidos:** máx 20 tasks/request y no más de **5 URLs del mismo dominio** por request.
9. **Cobro pese a fallo:** 4xx/5xx y páginas bloqueadas por Cloudflare se facturan (sin refund).
10. **`respect_sitemap` anula `max_crawl_depth`.**

---

## 10. Oportunidades de máximo provecho (lectura Efeonce/Greenhouse)

1. **Auditoría técnica completa automatizada por cliente:** `task_post` (target + `validate_micromarkup` + `store_raw_html` + `checks_threshold` propios) → poll `summary` → volcar `pages/links/duplicate_*/non_indexable/redirect_chains` a BigQuery antes de los 30 días. El costo es marginal ($0.15/1000 páginas sin JS; $1.50/1000 con JS).
2. **Validación de schema para AEO:** `validate_micromarkup` + endpoint `microdata` da validación JSON-LD con errores/warnings por página — insumo directo para la Radiografía AEO y el grader (citabilidad exige schema válido, no solo presente).
3. **Análisis de citabilidad con `content_parsing/live` + `markdown_view`:** contenido ya segmentado en `main_topic`/`secondary_topic`/`primary_content` y exportable como markdown = chunking natural para evaluar answerability/citabilidad por bloque sin scraping propio.
4. **Lane agéntico sin crawl:** `instant_pages` + `content_parsing/live` + `lighthouse/live/json` + `page_screenshot` cubren "audítame ESTA URL ahora" en 4 llamadas live (~$0.01 total con screenshot y Lighthouse) — perfecto para un tool MCP/Nexa por URL.
5. **Evidencia visual:** `page_screenshot` (full-page, viewport mobile/desktop) como evidencia adjunta en dossiers de auditoría o comparativas before/after.
6. **CWV programáticos:** `enable_browser_rendering` en páginas prioritarias (`priority_urls`) para LCP/CLS/TTI reales del crawler + Lighthouse para el desglose de audits — dos fuentes cruzables.
7. **`custom_js` como sonda:** extraer señales propias (dataLayer, versiones de librerías, flags de consentimiento) durante el crawl sin segunda pasada.

---

## 11. Cómo NO leer un reporte OnPage (verificado en UI, TASK-1309)

El reporte es un **passthrough**: dice lo que su catálogo encontró, con su ponderación. Cuatro lecturas que lo convierten en un diagnóstico falso — todas salieron de mirar la pantalla con datos reales de Grupo Berel (health 95.4 · 0 críticos · 138 avisos · 381 menores).

1. **Los checks de performance son LABORATORIO.** `high_loading_time`, `high_waiting_time`, `large_page_size`, `has_render_blocking_resources`, `no_content_encoding`, los CWV de `enable_browser_rendering` y todo Lighthouse miden una corrida sintética desde la red y la CPU del crawler. Google rankea con **CrUX (campo)**. Al exponerlos a un operador o cliente hay que decirlo **en el dato mismo**: usa el lab para diagnosticar la causa (qué recurso bloquea, qué pesa), el campo (GSC/CrUX) para decidir si hay problema. Sin la etiqueta, el cliente optimiza lo que no se mide.
2. **`onpage_score` y tu conteo de issues NO miden lo mismo.** El score es la ponderación del proveedor (pesa sobre todo lo que rompe indexación); el conteo sale de tu allowlist curado (`site-audit/findings-map.ts`). "95 de salud" con "519 issues" no es una contradicción ni un bug de la pantalla: es un sitio sin críticos con mucha higiene pendiente. Presentar ambos sin explicar cuál mide qué invita a leerlos como error.
3. **Un crawl que chocó `max_crawl_pages` describe la MUESTRA, no el sitio.** `crawl_status.pages_crawled` + `crawl_stop_reason` son parte del dato, no metadata: si el tope se alcanzó, "páginas revisadas" y la salud describen lo que se alcanzó a mirar. Distinto de un crawl abortado por bloqueo — eso lo diagnostica `extended_crawl_status` (§9.2) y sí es una falla.
4. **El catálogo no cubre AEO, y su silencio se lee como aprobación.** Un sitio puede puntuar 95/100 y estar bloqueando a todos los answer engines. Cuatro cosas que OnPage **no** te dice y hay que resolver aparte:
   - **Acceso de crawlers IA en `robots.txt`.** El check sitewide `robots_txt` es booleano de *existencia*; no hay check de `OAI-SearchBot` / `PerplexityBot` / `ClaudeBot` bloqueados. Es el hallazgo más caro y el único que no degrada ninguna métrica del reporte. Se resuelve leyendo el `robots.txt` (o `raw_html` del propio crawl).
   - **Ausencia total de JSON-LD.** `microdata` valida *lo que existe*; una página sin schema no genera error, genera silencio. La señal de ausencia es `checks.has_micromarkup = false` en `pages`, que hay que consultar explícitamente — no aparece en el rollup de issues.
   - **Salud del sitemap.** `domain_info.checks.sitemap` es presencia, no calidad: no dice si trae URLs `noindex`, 404s, no-canónicas o `lastmod` mentido. Cruzarlo con `non_indexable` + `pages.checks.from_sitemap`.
   - **Conflicto `noindex` + bloqueo en robots.** Google nunca ve el `noindex` porque no puede rastrear. Cada señal se reporta por separado y la contradicción no salta sola.

**Corolario de producto:** el *esfuerzo* de arreglo tampoco es un dato de DataForSEO — el proveedor no lo reporta. Si tu UI ordena por esfuerzo (Greenhouse lo hace, `GH_GROWTH_SEO_AUDIT_ISSUES`), ese tier es un juicio editorial y se declara como estimación en pantalla.

---

## 12. Fuentes

| Sección | URL | Estado |
|---|---|---|
| Índice on_page | `https://docs.dataforseo.com/v3/on_page/` | **404** (usar overview) |
| Overview / inventario | `https://docs.dataforseo.com/v3/on_page/overview/` (≡ `/v3/on_page-overview/`) | OK |
| task_post | `https://docs.dataforseo.com/v3/on_page/task_post/` | OK |
| summary | `https://docs.dataforseo.com/v3/on_page/summary/` | OK |
| pages (checks) | `https://docs.dataforseo.com/v3/on_page/pages/` | OK |
| instant_pages | `https://docs.dataforseo.com/v3/on_page/instant_pages/` | OK |
| content_parsing/live | `https://docs.dataforseo.com/v3/on_page/content_parsing/live/` | OK |
| microdata | `https://docs.dataforseo.com/v3/on_page/microdata/` | OK |
| page_screenshot | `https://docs.dataforseo.com/v3/on_page/page_screenshot/` | OK |
| waterfall | `https://docs.dataforseo.com/v3/on_page-waterfall/` | OK |
| lighthouse task_post | `https://docs.dataforseo.com/v3/on_page/lighthouse/task_post/` | OK |
| lighthouse overview | `https://docs.dataforseo.com/v3/on_page-lighthouse-overview/` | OK |
| Pricing OnPage | `https://dataforseo.com/pricing/on-page/onpage-api` | OK |
| Pricing extras | `https://dataforseo.com/help-center/cost-of-onpage-api-parameters` | OK |
| Pricing Lighthouse | `https://dataforseo.com/pricing/on-page/lighthouse-api` | OK |
| Sitio no crawleado | `https://dataforseo.com/help-center/reason-why-website-is-not-crawled-by-onpage-api` | OK |
| Troubleshooting/IPs | `https://dataforseo.com/help-center/troubleshooting-onpage-api` | localizada vía búsqueda (IPs whitelisting, puertos 80/443) |
