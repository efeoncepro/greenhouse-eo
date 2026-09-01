# 01 · SEO Técnico (incluye crawlers IA)

> Carga este módulo para: rastreo/indexación, Core Web Vitals, render JS,
> sitemaps, canonicalización, datos estructurados (JSON-LD), arquitectura de
> sitio, y **gestión de crawlers de IA** (robots para GPTBot/ClaudeBot/etc.).
> Sello base: as-of 2026-06; delta GSC/API verificado 2026-07-18; cambio de
> extracción JSON-LD de Google verificado 2026-08-21; FAQ y Home metadata 2026-08-30. Reverifica umbrales CWV,
> lista de bots, parsers y features de Search Console con WebSearch.

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

### Superficies especiales: 404, búsqueda y archivos

No apliques una política global de robots, canonical o schema a todas las
superficies misceláneas. Clasifica primero la intención y el estado HTTP:

| Superficie | Contrato SEO técnico por defecto |
| --- | --- |
| 404 real o paginación imposible | Respuesta HTTP `404`, `noindex`, sin canonical y sin redirect genérico a Home. |
| Búsqueda interna | Respuesta `200`, `noindex, follow`; `SearchResultsPage` solo si describe contenido visible y no duplica otro grafo. La query vacía no debe convertirse en inventario público. |
| Categoría o autor editorial indexable | `200`, canonical propio, paginación coherente, enlaces internos y schema proporcional al contenido visible. |
| Tag, fecha o taxonomía custom | Decisión explícita basada en utilidad y calidad; no heredar indexabilidad por accidente. |
| Archivo vacío o delgado | Conservar, consolidar o retirar de forma explícita; el volumen por sí solo no justifica indexación. |

Para Efeonce WordPress, carga
`../../efeonce-public-site-wordpress/references/miscellaneous-surfaces.md`.
La auditoría live confirmó que Ohio, no Elementor Theme Builder, posee hoy 404,
búsqueda y archivos. Cualquier cambio de ownership necesita spike y evidencia
del renderer real.

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
- **Dos usos distintos:** describir hechos legibles por máquina y habilitar experiencias
  de búsqueda que admitan ese tipo. Ninguno garantiza ranking o citas de IA.
  Inspecciona el grafo existente y su dueño antes de añadir marcado.
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
- **FAQ, verificado 2026-08-30:** Google retiró FAQ rich results el 7 de mayo de 2026
  y la documentación el 15 de junio ([fuente oficial](https://developers.google.com/search/updates)).
  FAQPage sigue en Schema.org; no lo añadas automáticamente ni prometas un rich result.
  Las preguntas y respuestas útiles, visibles y accesibles conservan su valor.

Para Home/landings carga `../references/home-landing-metadata-schema.md`: title/H1/social,
propiedad del grafo, alcance local/global, escrituras CMS y límites de verificación.

### Cambio de parser 2026-08-21: un solo HTML unescape

[Google Search Central anunció](https://www.linkedin.com/feed/update/urn:li:activity:7496492350907596801/)
que su extractor de JSON-LD aplica desde ahora **una sola pasada de HTML
unescaping**. Es un cambio de compatibilidad del parser, no un core update, spam
update ni nueva señal general de ranking. Los datos estructurados hacen a una
página elegible para experiencias enriquecidas; no garantizan que aparezcan y
un problema de schema no equivale por sí mismo a una caída del resultado web
normal ([guía oficial de Google](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)).

**Qué cambia exactamente.** Una entidad HTML doblemente escapada deja de
"desenrollarse" hasta el carácter final:

| Literal emitido dentro del JSON-LD | Tras una pasada | Valor que probablemente se quería |
|---|---|---|
| `Efeonce &amp;amp; Wave` | `Efeonce &amp; Wave` | `Efeonce & Wave` |
| `SEO &amp;#10004;` | `SEO &#10004;` | `SEO ✓` |

Las entidades HTML (`&amp;`, `&#10004;`) **no son escapes JSON**. JSON admite
Unicode directo y escapes `\u` de cuatro dígitos según
[RFC 8259 §7](https://www.rfc-editor.org/rfc/rfc8259.html#section-7). Las formas
correctas son, por ejemplo:

```json
{
  "name": "Efeonce & Wave",
  "alternateName": "Efeonce \u0026 Wave",
  "headline": "SEO \u2714"
}
```

**Por qué un validador puede quedar verde.** `"&amp;amp;"` sigue siendo una
cadena JSON sintácticamente válida. `JSON.parse()` puede aprobar el bloque y el
grafo seguir transportando el literal equivocado. Distingue por eso:

1. **Sintaxis:** ¿el bloque se parsea como JSON?
2. **Extracción:** ¿qué valor obtiene el consumidor después de su única pasada?
3. **Semántica:** ¿ese valor coincide con el contenido visible y el source of
   truth?

El riesgo suele ser mayor en `@id`, `url`, `sameAs`, `image`, `contentUrl` y
URLs con query strings: una entidad residual puede fragmentar la identidad del
grafo o apuntar a otro recurso. En `name`, `headline` o `description` puede
quedar copy corrupto o inconsistente. El efecto puede ir desde un literal
incorrecto hasta que Google ignore un campo o un item para una feature; **no
afirmes que siempre descarta el grafo completo**. Tampoco extrapoles este cambio
de Google a ChatGPT, Perplexity, Bing u otro parser sin evidencia propia.

**Contrato de generación — causa raíz, no parche:**

1. Construye el schema como objeto desde el mismo contenido gobernado que se
   muestra a la persona.
2. Serialízalo **una vez** con el serializer JSON estándar del lenguaje.
3. Insértalo como data block `application/ld+json`; la especificación JSON-LD
   permite extraer el documento embebido *as is*
   ([W3C JSON-LD 1.1 §7](https://www.w3.org/TR/json-ld11/#embedding-json-ld-in-html-documents)).
4. Si el contexto HTML exige neutralizar `<` o la secuencia `</script>`, usa un
   escape JSON/Unicode como `\u003c` o un serializer seguro para ese contexto;
   **no** pases el JSON serializado por un encoder de entidades HTML.
5. No agregues una segunda decodificación de input ni un replace global sobre
   el HTML servido: puede alterar contenido visible, URLs o la frontera XSS.
   Corrige el writer/template/plugin que serializa dos veces.

**Auditoría y verificación:**

- inspecciona el HTML **live emitido**, no solo el objeto previo al render, en
  una muestra por template/tipo de schema y en páginas de mayor valor;
- dentro de cada `script[type="application/ld+json"]`, busca entidades HTML y
  eleva como riesgo de doble escape el patrón
  `&amp;(?:#[0-9]+|#x[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]+);`;
- ejecuta `JSON.parse(script.textContent)` y luego compara valores sensibles
  contra el DOM visible y la fuente gobernada; parseable no significa correcto;
- prueba la **URL live** con Rich Results Test y Schema.org Validator, revisando
  los valores extraídos además del estado verde; Google advierte que sus tests
  no capturan todos los problemas semánticos;
- tras el fix, monitorea items válidos/inválidos y el informe *Unparsable
  structured data*; para impacto observa Search Console por *Search appearance*
  (impresiones, clicks y CTR), dejando tiempo para recrawl/reindexación.

**Prioridad:** si nace en un template o plugin sitewide, el reach vuelve el fix
alto impacto/bajo esfuerzo y va primero. Una entidad residual aislada en un
campo no elegible de una página de bajo valor no debe presentarse como incidente
de ranking.

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
- 🔴 **Un `robots.txt` limpio NO prueba acceso.** La forma más común del bloqueo vive en el
  **borde/CDN/WAF**: 403/429 al rastreador con el archivo impecable — 2 de cada 3 casos con
  problema en una muestra propia de 12 dominios LatAm/CL (2026-08-15). Verifica el status real
  del fetch, no sólo el archivo, y nunca suplantando el token de un bot ajeno (§8 d.2–d.3).
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

> **Ética de rastreo del tooling propio (TASK-1778, 2026-08-27):** el fetcher
> propio de Greenhouse (sustrato `@/lib/growth/site-substrate` desde TASK-1697,
> consumido por los probes del AI Visibility Grader) obedece el `robots.txt`
> del sitio auditado matcheando **su propio token** (`GreenhouseAEOGrader`,
> fallback `*`) — jamás actúa con el token de un bot de terceros ni lo suplanta.
> Un sitio con `User-agent: GPTBot / Disallow: /` sigue siendo legible para
> nosotros; "bloqueas GPTBot" es el hallazgo. Un Disallow que sí nos alcanza →
> `blocked_robots` (hallazgo, no fallo).

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

## 8. Leer un site audit de crawler sin mentir el diagnóstico

Un site audit de crawler (DataForSEO OnPage, Semrush Site Audit, Screaming Frog) es un
**passthrough**: reporta lo que encontró su propio catálogo de checks, con su propia
ponderación. Cuatro confusiones convierten su salida en un diagnóstico falso.

**(a) Sus checks de rendimiento son de LABORATORIO, no de campo.** `high_loading_time`,
`large_page_size`, `has_render_blocking_resources`, `no_content_encoding` y todo Lighthouse
miden una corrida sintética desde la red y la CPU del crawler. Google rankea con **CrUX
(campo)** — §4 de este módulo. Los dos números discrepan en ambos sentidos: un sitio que el
crawler declara lento puede pasar CWV en campo, y uno que el crawler aprueba puede fallar INP
en móviles reales. Reglas: (1) declara la fuente **en el entregable mismo**, no en una nota al
pie — presentarlos sin decirlo induce a optimizar lo que no se mide; (2) usa el lab para
*diagnosticar la causa* (qué recurso bloquea, qué pesa) y el campo para *decidir si hay
problema*; (3) si tienes GSC/CrUX, nunca priorices por el lab.

**(b) El puntaje del proveedor y tu conteo de issues no miden lo mismo.** "Salud 95" junto a
"519 issues" se lee como contradicción y no lo es: el puntaje lo calcula el proveedor con su
ponderación (pesa sobre todo lo que rompe indexación) y el conteo sale de tu catálogo curado
de checks. Un sitio sin críticos puede acumular cientos de menores y seguir puntuando alto. Si
presentas ambos, explica cuál mide qué; si no lo explicas, el cliente asume que uno de los dos
está mal.

**(c) Un crawl con techo describe la muestra, no el sitio.** `max_crawl_pages` es un tope
facturable: cuando lo choca, "páginas revisadas" deja de ser el sitio y pasa a ser lo que se
alcanzó a mirar, y la salud describe esa muestra. Declararlo es la diferencia entre una
muestra y un censo. Distinto de un crawl parcial por bloqueo (`extended_crawl_status`), donde
sí falló algo.

**(d) Su catálogo NO cubre AEO — y el silencio se lee como aprobación.** Un sitio puede
puntuar 95/100 y estar bloqueando a todos los answer engines. Ningún crawler comercial lo
evalúa: hay que evaluarlo aparte, y hacerlo mal produce diagnósticos falsos en las dos
direcciones. Las reglas del oficio:

**d.1 — Retrieval y training son dos hallazgos distintos, nunca uno.** Bloquear el rastreo que
te **cita** (`OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Claude-SearchBot`, `ChatGPT-User`)
te saca de la respuesta: es **crítico**. Bloquear el que **entrena** (`GPTBot`,
`Google-Extended`, `CCBot`, `anthropic-ai`, `Applebot-Extended`) es una **postura de derechos
legítima y frecuente**, no un defecto técnico, y **jamás** se pinta crítico — como mucho un
aviso con lectura de postura. Un evaluador que los mete en la misma bolsa con score
proporcional saca en rojo a un sitio con el retrieval completamente abierto, y eso entrena al
cliente a ignorar la severidad más alta del informe. Un bot que no cae limpio en una familia
(`Bytespider`, `Amazonbot`) se clasifica a mano y el default **nunca** es crítico: su bloqueo
es práctica común y emitirlo como issue es ruido que erosiona la lista priorizada.

**d.2 — El bloqueo más común NO está en `robots.txt`, está en el borde.** Medición propia sobre
**12 dominios LatAm/CL (2026-08-15): 3 con problema de acceso IA, y 2 de esos 3 bloquean en el
borde/CDN/WAF** — 403 al rastreador con un `robots.txt` impecable. Un audit que sólo parsea
`robots.txt` les dice "acceso correcto": exactamente el falso sano que se quería evitar. Por eso
el bloqueo de borde es un **hallazgo con tipo propio**, no una variante del de robots: la
remediación es una regla de CDN/WAF, no un archivo de texto. Chequeo barato, dos requests: `GET`
del home con el rastreador identificado vs. el fetch normal; 403/429 en uno y 200 en el otro =
filtro en el borde.

**d.3 — Nunca suplantes el user-agent de un bot ajeno para probar el borde.** Los WAF validan la
identidad por DNS inverso, así que hacerse pasar por `GPTBot` u `OAI-SearchBot` es evasión
verificable y el costo reputacional lo paga el dominio que audita. Se compara el status del
**rastreador propio identificado** contra una **variante del propio token**. Y el límite se
declara en el entregable: eso prueba que el borde **filtra rastreadores identificados**, no cuál
bot de terceros está bloqueado — determinarlo exige leer las reglas del WAF con el cliente.

**d.4 — La directiva `Sitemap:` del `robots.txt` manda sobre `/sitemap.xml`.** En la misma
muestra, **3 de 12 devuelven 404 en la ruta convencional** y declaran su índice en `robots.txt`:
están **bien**, y marcarlos como defecto es ruido. Ausencia de ambos = aviso menor; el peso de
`warning` se reserva para el sitemap **declarado y roto** (404/5xx/no parseable). Aparte, el
check del crawler sigue siendo booleano de *presencia*: no dice si el índice trae `noindex`,
404s, no-canónicas o `lastmod` mentido.

**d.5 — Una prohibición del `robots.txt` no es un defecto del sitio.** Si el `robots.txt` te
prohíbe a **ti** la ruta que ibas a mirar, el resultado es **"no verificado", nunca "roto"**.
Caso real: `reuters.com` nos prohíbe la ruta del sitemap que él mismo declara, y la primera
implementación lo reportó como sitemap roto — inventándole un defecto al cliente sobre un
archivo que nunca miramos. Un hueco de medición se declara con su razón; disfrazarlo de hallazgo
es un modo de falla propio, y no lo ve ningún test con fixtures: sale ejercitando dominios
reales.

**d.6 — Ausencia total de JSON-LD.** Los validadores de microdata validan *lo que existe*; una
página sin schema no genera error, genera silencio. Auditar la **ausencia** (¿publica la portada
algún bloque `ld+json`?), no sólo la validez.

**d.7 — Conflicto `noindex` + bloqueo en robots.** Google nunca ve el `noindex` porque no puede
rastrear la página. Cada señal se reporta por separado y la contradicción no salta sola.

**Dos cosas que deliberadamente NO pertenecen a esta capa:** los **Core Web Vitals medidos con
Lighthouse** —es laboratorio, igual que lo que el crawler ya da, y la señal de campo viene de
GSC/CrUX (punto **(a)**)— y **`llms.txt`**, de ROI marginal y que Google no usa
(`04_AEO_GEO.md`).

> **Estado en Greenhouse (as-of 2026-09-01).** El site audit de `/admin/growth/seo/audit` ya
> tiene su **propia capa de hallazgos de SITIO** con estas reglas (`TASK-1670`): acceso de
> crawlers IA cortado por familia (`ai_retrieval_crawlers_blocked` crítico ·
> `ai_training_crawlers_blocked` aviso), bloqueo de borde con tipo propio
> (`ai_crawler_edge_access_denied`), JSON-LD ausente, salud de sitemap con la regla d.4, y
> `site_check_unverified` para lo que no se pudo medir. Se evalúa con fetches propios, **cero
> gasto de proveedor**. 🔴 Su flag `GROWTH_SEO_SITE_FINDINGS_ENABLED` está **OFF** (runtime
> ops-worker) hasta que `TASK-1671` despliegue la superficie: **hasta ese flip el punto ciego
> sigue abierto** y el audit todavía declara sano un sitio invisible para los motores de IA. Al
> auditar hoy, estas verificaciones se hacen a mano.

Corolario: la checklist §A de `templates/audit-checklists.md` **no se puede tildar desde el
reporte del crawler**. Varias de sus filas exigen verificación aparte.

## Checklist técnico rápido (orden de prioridad)
1. ¿Indexación rota? (GSC Pages) → arreglar primero, bloquea todo lo demás.
2. ¿Contenido crítico requiere JS? → SSR/SSG.
3. ¿CWV en rojo en campo (CrUX)? → INP y LCP primero.
4. ¿El grafo existente representa la página y sus entidades? → corregir o completar sólo tipos pertinentes, sin duplicar dueño.
5. ¿robots permite retrieval IA? → revisar.
6. ¿Internal linking a páginas dinero? → reforzar.
7. ¿Logs muestran desperdicio de rastreo? → solo si sitio grande.

> **Cross-refs:** entidad/`sameAs` → `03_EEAT_ENTITY.md`. Schema para citabilidad
> IA → `04_AEO_GEO.md`. hreflang/multirregión → `06_LOCAL_INTERNATIONAL.md`.
> Medir CWV/indexación en el tiempo → `07_MEASUREMENT.md`.
