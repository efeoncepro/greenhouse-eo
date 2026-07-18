# 01 · SEO Técnico (incluye crawlers IA)

> Carga este módulo para: rastreo/indexación, Core Web Vitals, render JS,
> sitemaps, canonicalización, datos estructurados (JSON-LD), arquitectura de
> sitio, y **gestión de crawlers de IA** (robots para GPTBot/ClaudeBot/etc.).
> Sello base: as-of 2026-06; delta GSC/API verificado 2026-07-18. Reverifica
> umbrales CWV, lista de bots y features de Search Console con WebSearch.

## Mapa mental: la técnica habilita las 3 capas

El SEO técnico no rankea por sí solo; **remueve fricción**. Si Google (o un
crawler IA) no puede rastrear, renderizar e interpretar la página, todo lo demás
da igual. Orden de diagnóstico: **¿se puede rastrear? → ¿se puede indexar/
recuperar? → ¿se entiende? → ¿es rápido y estable?**

---

## 1. Rastreabilidad (crawlability)

- **robots.txt** — controla *acceso de rastreo*, NO indexación. Bloquear en
  robots.txt no quita una URL del índice si tiene enlaces; para des-indexar usa
  `noindex` (y deja la URL rastreable para que vean el `noindex`).
- **Crawl budget** — relevante solo en sitios grandes (>~10k URLs) o con mucha
  generación dinámica. Síntomas: páginas nuevas tardan en indexar, logs muestran
  bots gastando rastreo en facetas/parámetros basura. Fixes: canonical, robots
  para parámetros, `noindex` en thin pages, sitemaps limpios, internal linking.
- **Análisis de logs** — la verdad de qué rastrea Googlebot (y los bots IA).
  Busca: ratio de rastreo por plantilla, 404/5xx que consumen presupuesto,
  páginas dinero poco rastreadas, exceso de rastreo en parámetros.
- **Arquitectura de enlaces internos** — toda página importante a ≤3 clicks del
  home. El internal linking distribuye autoridad y *señala importancia*. Es de
  las palancas de mayor ROI y casi siempre subexplotada.

## 2. Indexación

- **Cobertura en GSC** (Pages report) — el tablero de verdad. Vigila:
  "Crawled - currently not indexed" (señal de calidad/thin), "Discovered - not
  indexed" (crawl budget o calidad), "Duplicate without user-selected canonical".
- **Canonicalización** — `rel=canonical` consolida señales de duplicados.
  Errores típicos: canonical a una URL `noindex`, cadenas de canonical,
  canonical cruzado de http/https/www inconsistente, paginación mal canonizada.
- **Sitemaps XML** — solo URLs indexables, 200, canónicas. Máx 50k URLs / 50MB
  por sitemap; usa sitemap index. Incluye `<lastmod>` honesto (mentir desgasta
  confianza). Sitemaps separados por tipo ayudan a diagnosticar indexación.
- **Estados a evitar:** `noindex` + bloqueo robots a la vez (Google no ve el
  noindex), soft 404, parámetros infinitos, calendarios/filtros sin límite.

### GSC API, nuevas URLs y Platform Properties

- La URL Inspection API **observa** la versión conocida por el índice; no hace
  live test ni solicita indexación.
- El sitemap ping legado fue retirado y responde `404`. Para páginas genéricas,
  no reemplazarlo con Indexing API: Google la limita a `JobPosting` y
  livestreams `BroadcastEvent` dentro de `VideoObject`.
- Para una URL nueva, el flujo robusto es `200` + canonical + `index, follow` +
  internal link + sitemap con `lastmod` honesto; luego observación asíncrona.
- Platform Properties existen para Instagram, TikTok, X y YouTube, pero su
  paridad con Search Console API no está documentada. Exige un canary live antes
  de modelarlas o prometerlas.

Carga `../references/google-search-console-api-indexing.md` para scopes,
matriz de capacidades, canary y checkpoints post-publicación.

### Imágenes editoriales y SVG

Google admite SVG en `img[src]` y descubre el fallback de `<picture>`. Exigir un `<img src>` real, filename,
ALT, contexto/caption, dimensiones, GET/MIME y crawlability. El texto convertido a paths no reemplaza HTML
indexable. Mantener un raster representativo separado para featured, Open Graph, Twitter y schema de Article.
Para infografías complejas, usar ALT breve + descripción larga equivalente. Carga
`../references/editorial-image-seo.md` para el contrato completo.

## 3. Rendering (JavaScript SEO)

- Google rastrea → encola → **renderiza** (Chromium headless) → indexa. El
  render puede retrasarse; contenido crítico no debe depender solo de JS client-
  side.
- **Patrón recomendado 2026:** SSR o SSG/ISR para contenido indexable
  (Next.js App Router encaja perfecto). CSR puro = riesgo de contenido invisible
  o tardío para indexar, y **peor aún para crawlers IA** (muchos bots de
  retrieval **no ejecutan JS** o lo hacen pobremente).
- **Verificación:** URL Inspection en GSC ("ver página rastreada" / HTML
  renderizado), o `WebFetch` para ver qué HTML llega sin JS. Si el contenido no
  está en el HTML inicial, los bots IA probablemente no lo ven.
- Evita: contenido inyectado tras interacción, lazy-load sin fallback, hash
  routing (`#`) para contenido único.

## 4. Experiencia de página — Core Web Vitals (umbrales as-of 2026-06)

| Métrica | "Good" | Qué mide | Palancas |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5 s (algunas fuentes 2026 reportan el "good" afinado hacia 2.0 s — **reverificar**) | Carga del mayor elemento visible | imagen hero optimizada, `priority`/preload, TTFB, CDN, menos render-blocking |
| **INP** (Interaction to Next Paint) | ≤ 200 ms | Latencia de interacción (reemplazó a FID en 2024) | romper long tasks JS, `requestIdleCallback`, menos JS en main thread, web workers |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | Estabilidad visual | dimensiones en img/video, reservar espacio para ads/embeds, evitar inyección sobre contenido |

- **Update CWV 2026:** no movió los umbrales titulares pero **equiparó el peso**
  de LCP/INP/CLS como señal — un INP malo ahora pesa igual que un LCP malo.
  TTFB ganó prominencia diagnóstica (no es señal de ranking por sí solo).
- **Realidad de campo:** ~**55.9%** de orígenes pasan los 3 CWV (CrUX may-2026).
- **Dato de campo vs lab:** Google usa **CrUX (field data)** para ranking, no
  Lighthouse (lab). Optimiza para campo (usuarios reales), no para el número de
  Lighthouse.
- CWV es señal real pero **de desempate**, no la palanca principal. No sacrifiques
  contenido/autoridad por exprimir 50ms. Arregla lo que está en rojo; no persigas
  el 100.

## 5. Datos estructurados (Schema.org / JSON-LD)

- **Formato:** JSON-LD en `<head>` o `<body>` (preferido por Google sobre
  microdata/RDFa). Plantillas listas en `templates/jsonld/`.
- **Doble propósito 2026:** (a) *rich results* en SERP clásica (estrellas, FAQ,
  breadcrumb, sitelinks); (b) **hechos legibles por máquina** que ayudan a los
  motores IA a *entender y citar* la entidad. El schema es de los pocos puentes
  donde ganas en SEO y AEO con el mismo trabajo.
- **Tipos de mayor valor:** `Organization` (+ `sameAs`, logo, founder),
  `WebSite`, `Article`/`BlogPosting` (+ `author` con
  ⚠️ **`SearchAction` está MUERTO en Google:** el cuadro de búsqueda de sitelinks que alimentaba
  se anunció deprecado el **21-oct-2024** y se retiró el **21-nov-2024**. Y **no hay evidencia
  pública** de que ChatGPT, Perplexity o Gemini lean `potentialAction` para operar un sitio.
  Declararlo es higiene de grafo barata y correcta — pero **NUNCA lo vendas como la palanca que
  mueve el eje agéntico**. El eje agéntico se gana donde hay algo que un agente pueda EJECUTAR
  de verdad (WebMCP, `.well-known/mcp`, una API descubrible, un `FlightReservation`), no en el
  buscador del blog. Ver `efeonce/EFEONCE_AGENTIC_READINESS_FRAMEWORK.md`.
  `Person`), `Person` (autor con credenciales), `Product`+`Offer`+`AggregateRating`,
  `FAQPage`, `HowTo`, `BreadcrumbList`, `LocalBusiness`, `Service`.
- **Reglas:** marca solo contenido **visible** en la página (marcar contenido
  oculto = violación). Mantén el schema sincronizado con el contenido real.
  Valida con Rich Results Test + Schema.org validator.
- **Nota de volatilidad:** Google ha recortado qué rich results muestra (p.ej.
  FAQ/HowTo se restringieron en 2023). Marca igual por la capa de entidad/IA,
  pero no prometas el rich snippet sin verificar elegibilidad vigente.

## 6. Gestión de crawlers de IA (robots para bots LLM) — as-of 2026-06

Decisión **estratégica**, no solo técnica. Hay dos familias de bots:

| Familia | Qué hacen | Ejemplos | Si los bloqueas… |
|---|---|---|---|
| **Training** | Recolectan contenido para *entrenar* el modelo | `GPTBot` (OpenAI), `ClaudeBot` (Anthropic), `Google-Extended`, `CCBot` (Common Crawl), `Meta-ExternalAgent` | reduces aparición en *conocimiento entrenado* futuro; no quita citas en retrieval |
| **Retrieval / user** | Fetch en *tiempo real* para responder una consulta | `OAI-SearchBot` + `ChatGPT-User` (ChatGPT Search), `PerplexityBot`, `Google` (AI Overviews usa Googlebot) | **te sacan de esa respuesta IA** — es el costo caro |

- **Estrategia que la mayoría recomienda en 2026:** *permitir retrieval, decidir
  training según postura de licenciamiento*. Bloquear `OAI-SearchBot`/
  `PerplexityBot`/Googlebot = desaparecer de esos answer engines.
- **Dato clave (Rutgers/Wharton, dic-2025):** publishers que bloquearon
  crawlers IA tuvieron **−23.1% de tráfico total** *sin* reducir de forma fiable
  las citas. Conclusión: bloquear suele ser net-negativo salvo postura editorial
  o legal explícita.
- **AI Overviews / AI Mode** usan **Googlebot**: si quieres estar en orgánico de
  Google, ya estás disponible para sus features IA (no hay opt-out granular del
  AI Overview manteniendo orgánico, salvo `nosnippet`/`max-snippet`, que también
  te quita el snippet clásico — trade-off duro).
- `llms.txt` **no** es robots.txt y Google no lo usa (ver `04_AEO_GEO.md`).

**Snippet robots.txt (permitir retrieval, ejemplo conservador):**
```
# Retrieval / answer engines — permitir (queremos ser citados)
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: PerplexityBot
Allow: /

# Training — decidir por política de marca (ejemplo: permitir)
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: https://EXAMPLE.com/sitemap_index.xml
```

## 7. Otros técnicos que importan

- **HTTPS** — requisito básico. Mixed content rompe confianza y features.
- **Mobile-first indexing** — Google indexa la versión móvil. La paridad de
  contenido móvil/desktop es obligatoria; contenido escondido tras tabs/accordion
  cuenta, pero contenido *ausente* en móvil no se indexa.
- **Redirects** — 301 para permanentes (pasa señales). Evita cadenas (>2 saltos)
  y loops. Nunca 302 para movimientos permanentes.
- **Paginación** — `rel=next/prev` ya no la usa Google; usa enlaces rastreables +
  canonical autorreferente por página, o vista "ver todo" canónica.
- **Internacional (hreflang)** — ver `06_LOCAL_INTERNATIONAL.md`.

## Checklist técnico rápido (orden de prioridad)
1. ¿Indexación rota? (GSC Pages) → arreglar primero, bloquea todo lo demás.
2. ¿Contenido crítico requiere JS? → SSR/SSG.
3. ¿CWV en rojo en campo (CrUX)? → INP y LCP primero.
4. ¿JSON-LD de `Organization`/`Article`/`Person` presente y válido? → agregar.
5. ¿robots permite retrieval IA? → revisar.
6. ¿Internal linking a páginas dinero? → reforzar.
7. ¿Logs muestran desperdicio de rastreo? → solo si sitio grande.

> **Cross-refs:** entidad/`sameAs` → `03_EEAT_ENTITY.md`. Schema para citabilidad
> IA → `04_AEO_GEO.md`. hreflang/multirregión → `06_LOCAL_INTERNATIONAL.md`.
> Medir CWV/indexación en el tiempo → `07_MEASUREMENT.md`.
