# DataForSEO — Resto del catálogo: Business Data, Merchant, App Data, Content Analysis, Content Generation, AI Optimization

> **As-of:** 2026-08-06 · Fuente: documentación oficial `https://docs.dataforseo.com/v3/` + páginas de pricing `https://dataforseo.com/pricing/*`, verificadas hoy vía fetch directo.
> **Nota de estructura de URLs:** la doc v3 fue reestructurada; las rutas canónicas hoy usan guiones (`/v3/business_data-social_media-overview/`), no slashes anidados. Varias URLs "clásicas" (`/v3/business_data/social_media/overview/`) devuelven **404** aunque la navegación aún las referencia.

---

## Resumen ejecutivo

1. El catálogo "resto" hoy son **5 APIs vivas**: Business Data, Merchant, App Data, Content Analysis y **AI Optimization** (la novedad grande). **Content Generation ya NO aparece** en el índice de la doc v3 y sus páginas de docs/pricing devuelven 404 → tratarla como retirada/no contratable (detalle abajo).
2. **AI Optimization API es el hallazgo de máximo valor para AEO**: respuestas reales de ChatGPT/Claude/Gemini/Perplexity por API (LLM Responses), scraping de ChatGPT/Gemini search (LLM Scraper), **LLM Mentions** (share of voice de marcas/dominios dentro de respuestas de LLMs, con series temporales, new & lost, top mentioned domains/pages/brands) y **AI Keyword Data** (volumen de búsqueda "conversacional" en herramientas AI).
3. **Content Analysis** es el motor de brand monitoring clásico: índice de citas/menciones web por keyword con **sentiment + connotación** (anger/happiness/love/sadness/share/fun), tendencias por fecha y categoría, rating distribution. Todo **Live**, barato (~$0.06 por task de 1.000 filas).
4. **Business Data** cubre reputación local/reviews multi-plataforma (Google Business, Google Reviews/Q&A, Hotels, Trustpilot, Tripadvisor, Business Listings de Google Maps, Social Media FB/Pinterest/Reddit).
5. **Merchant** (Google Shopping + Amazon) y **App Data** (Google Play + App Store) son nicho para Efeonce salvo clientes e-commerce/apps; modelo task-based POST→GET con prioridades normal/high.
6. Modelo de costo general: pay-as-you-go, mínimo $50, precios por task/por fila; LLM Responses cobra **fee DataForSEO + el costo del modelo LLM subyacente**.

---

## 1. Business Data API

**URL:** `https://docs.dataforseo.com/v3/business_data/overview/` (verificada 2026-08-06)
Sub-secciones (nav oficial): Business Listings · Google (My Business Info, My Business Updates, Google Hotels, Google Reviews, Extended Reviews, Questions and Answers) · Trustpilot · Tripadvisor · Social Media.

### 1.1 Google (`/v3/business_data-google-overview/`)

| Endpoint | Devuelve | Método |
|---|---|---|
| My Business Info | título/descripción del negocio, categorías de servicio, atributos, teléfono, dominio, horarios y busy hours | Task-based + **Live** |
| My Business Updates | posts del perfil: texto, URL, imagen, autor, fecha, links | Task-based |
| Hotel Searches | lista de hoteles que matchean parámetros, coordenadas, star rating, reviews, precios, imágenes | Task-based + Live |
| Hotel Info | detalle de hotel: ranking, reviews, amenities, precios | Task-based + Live |
| Google Reviews | texto de review, fecha, rating, **respuesta del owner**, perfil del reviewer | Task-based |
| Extended Reviews | reviews extendidas del perfil | Task-based |
| Questions and Answers | Q&A del perfil de negocio | Task-based + Live |

### 1.2 Trustpilot y Tripadvisor

- **Trustpilot** (`/v3/business_data/trustpilot/overview/`): búsqueda de negocios + reviews.
- **Tripadvisor** (`/v3/business_data/tripadvisor/overview`): búsqueda de alojamientos + reviews de visitantes.
- Ambos con modelo task-based (POST → Tasks Ready → GET).

### 1.3 Business Listings (`/v3/business_data-business_listings-overview/`)

- Base de datos de entidades de **Google Maps**: dirección, contacto, rating, horarios, categoría.
- Endpoints: **Search** (con filtración custom sin fee extra), **Categories Aggregation** (conteo de entidades por grupo de categorías), + Locations/Categories/Filters de configuración.
- **Solo Live** (sin POST/GET separados).

### 1.4 Social Media (`/v3/business_data-social_media-overview/` — URL con guiones; la variante con slashes da 404)

Tres plataformas hoy (confirmado vía doc + páginas de producto `dataforseo.com/apis/social-media-api/*`):

- **Facebook**: número de likes recibidos por una página vía embed del Like Button.
- **Pinterest**: número de pins recibidos por una página vía embed del Save Button.
- **Reddit**: interacciones relevantes por URL — subreddit, autor, permalink, título, miembros del subreddit.
- Todo **Live**; hasta 10 URLs por task; 2.000 calls/min.

**Ojo:** son *social signals por URL*, no analítica de cuentas sociales. No hay Instagram/X/LinkedIn/TikTok.

### 1.5 Modelo operativo

Live para info/listings; Standard (task POST → `tasks_ready`/`pingback_url`/`postback_url` → task GET) para reviews masivas. Hasta 2.000 calls/min.

---

## 2. Merchant API

**URL:** `https://docs.dataforseo.com/v3/merchant/overview/` (verificada 2026-08-06)

### Catálogo

**Google Shopping:**
- **Products** — listados de producto (Task POST/Ready/GET; Advanced + HTML)
- **Sellers** — vendedores por producto + endpoint **Ad URL** (resolución de URL completa del anuncio)
- **Product Info** — spec completa de un producto
- **Reviews** — reviews de producto

**Amazon:**
- **Products** — resultados orgánicos y pagados (Task POST/Ready/GET/**Live**; Advanced + HTML)
- **ASIN** — variaciones/modificaciones de un ASIN
- **Sellers** — vendedores de un producto

### Modelo

Task-based estándar (POST hasta 100 tasks por call; polling vía Tasks Ready o push vía `pingback_url`/`postback_url`); Amazon además tiene Live. **Dos prioridades** (normal/high) con precio distinto. 2.000 calls/min.

---

## 3. App Data API

**URL:** `https://docs.dataforseo.com/v3/app_data/overview/` (verificada 2026-08-06)

Plataformas: **Google Play** y **Apple App Store**, con catálogo simétrico:

- **App Searches** — apps que rankean para una keyword en el store
- **App List** — listados por colección/categoría (top charts)
- **App Info** — ficha completa de una app
- **App Reviews** — reviews con rating y texto
- **App Listings** — base de datos de apps con filtros
- **Categories** — taxonomía

Funciones: **Advanced** (datos estructurados por keyword/app id/categoría + location/language) y **HTML** (raw, solo Google). Modelo task-based (POST/GET, `pingback/postback`), prioridades normal/high, 2.000 calls/min, hasta 100 tasks por POST.

---

## 4. Content Analysis API — clave para brand monitoring

**URL:** `https://docs.dataforseo.com/v3/content_analysis/overview/` (verificada 2026-08-06)

Índice de **citas/menciones web** por keyword (marca, producto, ejecutivo, competidor) con análisis semántico:

| Endpoint | Qué da |
|---|---|
| **Search** | todas las citas del keyword objetivo con detalle de página, sentiment y métricas sociales |
| **Summary** | overview agregado de las citas (para dashboards) |
| **Sentiment Analysis** | stats por polaridad (positive/negative/neutral) y **connotación**: anger, happiness, love, sadness, share, fun |
| **Rating Distribution** | citas por rating del contenido |
| **Phrase Trends** | serie temporal de citas por fecha |
| **Category Trends** | tendencias de citación por fecha dentro de categorías objetivo |
| Locations / Languages / Categories / Filters | configuración; filtros custom **sin fee adicional** |

- **Solo Live** — resultados inmediatos, sin cola.
- Hasta 1.000 filas por request.
- 2.000 calls/min.

**Pricing verificado** (página de producto, 2026-08-06): **$0.024 por request + $0.000036 por fila → $0.06 por task de 1.000 filas.**

---

## 5. Content Generation API — **AUSENTE de la doc oficial hoy**

**Estado as-of 2026-08-06 (declarado, con evidencia):**

- El índice `https://docs.dataforseo.com/v3/` **no lista** Content Generation entre las APIs.
- `https://docs.dataforseo.com/v3/content_generation/overview/` → **404**.
- `https://docs.dataforseo.com/v3/content_generation-overview/` (patrón nuevo de URLs) → **404**.
- `https://dataforseo.com/pricing/content-generation` → **404**.
- `https://dataforseo.com/apis/content-generation-api` sirve hoy el contenido del **Content Analysis API** (redirección/reemplazo de producto).
- Solo sobreviven referencias legacy en el blog de updates (`dataforseo.com/updates/category/content-generation-api`), que describían generate/paraphrase/grammar/meta tags con "hasta 10 resultados por call".

**Conclusión:** tratarla como **retirada del catálogo contratable**. Para generación de contenido, Efeonce ya tiene providers LLM propios (`src/lib/ai/`); no hay caso para depender de un producto que el vendor des-publicó.

---

## 6. AI Optimization API — el oro para AEO

**URL:** `https://docs.dataforseo.com/v3/ai_optimization/overview/` (verificada 2026-08-06)
Propósito declarado: "data for keyword discovery, conversational optimization, and real-time LLM benchmarking".

### 6.1 LLM Mentions API (`/v3/ai_optimization/llm_mentions/overview/`)

Rastrea cómo keywords, **marcas y sitios** aparecen dentro de respuestas de LLMs: frecuencia de mención, fuentes citadas y **AI Search Volume** (potencial de tráfico derivado).

- Endpoints: **Search Mentions**, **Target Metrics**, **Multi-Target Metrics**, **Top Mentioned Pages / Domains / Brands / Brand Categories**, **Historical**, **Timeseries Delta**, **Timeseries New & Lost**.
- **Variantes Lite** (más baratas/rápidas) para Target Metrics y Top Mentioned Domains/Pages/Brands/Brand Categories.
- **Solo Live**; locations/languages + filtros; 2.000 calls/min, 30 requests simultáneos.
- Es el equivalente funcional de un "rank tracker de AEO": share of voice de la marca dentro de las respuestas AI + qué dominios/páginas está citando el modelo (→ target list de digital PR).

### 6.2 AI Keyword Data API (`/v3/ai_optimization-ai_keyword_data-overview/`)

- **AI Keyword Search Volume**: estimación de volumen de uso de keywords en herramientas AI tipo ChatGPT ("search volume estimates and user intent insights based on keyword usage in AI tools like ChatGPT").
- Endpoint de Locations and Languages.
- **Solo Live**; 2.000 calls/min, 30 simultáneos.

### 6.3 LLM Responses APIs (por proveedor)

Respuestas estructuradas en tiempo real de los modelos:

| Proveedor | Métodos | URL doc |
|---|---|---|
| **ChatGPT** | Task POST / Tasks Ready / Task GET / Live | `/v3/ai_optimization/chat_gpt/llm_responses/overview/` |
| **Claude** | Task POST / Tasks Ready / Task GET / Live | `/v3/ai_optimization/claude/llm_responses/overview/` |
| **Gemini** | Task POST / Tasks Ready / Task GET / Live | `/v3/ai_optimization/gemini/llm_responses/overview/` |
| **Perplexity** | **Solo Live** | `/v3/ai_optimization/perplexity/llm_responses/overview/` |

Modelos ChatGPT declarados (`/v3/ai_optimization-chat_gpt-llm_responses-models/`, verificada 2026-08-06): reasoning — o4-mini, o3-mini, o1, **gpt-5 / gpt-5-mini / gpt-5-nano**; non-reasoning — gpt-4o(-mini, fechados), gpt-4.1-nano, gpt-3.5-turbo-1106. Algunos modelos soportan **web search** (crucial: es lo que hace la respuesta comparable a lo que ve un usuario real con browsing).

### 6.4 LLM Scraper API

- Resultados **scrapeados** de búsquedas en ChatGPT y Gemini (la experiencia search del producto, no el API del modelo), por keyword + parámetros.
- Plataformas: **ChatGPT, Gemini**. Métodos Standard y Live; formatos **Advanced + HTML**; locations/languages.
- Diferencia clave vs LLM Responses: Responses = llamar al modelo vía API con web search opcional; Scraper = capturar la superficie real del producto (con sus citas/fuentes tal como las ve el usuario).

---

## 7. Costos (a grandes rasgos, verificado 2026-08-06)

Modelo general: **pay-as-you-go, mínimo $50** (`https://dataforseo.com/pricing`). Precios finos viven en subpáginas por producto (varias renderizan por JS y no exponen la cifra al fetch — declarado). Verificado en concreto:

| API | Precio verificado | Fuente |
|---|---|---|
| Content Analysis | **$0.024/request + $0.000036/fila ≈ $0.06 por task de 1.000 filas** | `dataforseo.com/apis/content-generation-api` (sirve la ficha de Content Analysis) |
| AI Optimization — LLM Responses | **Live: $0.0006 + precio cobrado por el LLM** (hasta 120 s) · **Standard: $0.0002 + $0.01** (hasta 72 h) | `dataforseo.com/pricing/ai-optimization/llm-responses` |
| Business Data / Merchant / App Data | por task, con tiers **normal vs high priority** (high más caro); cifras exactas solo en subpáginas JS (`dataforseo.com/pricing/business-data`, `/pricing/merchant`, `/pricing/app-data`) — no extraíbles por fetch hoy | páginas hub verificadas |
| LLM Mentions / AI Keyword Data | en `dataforseo.com/pricing/ai-optimization` (hub); variantes **Lite** explícitamente más económicas | doc + hub verificados |

Todas las APIs: tracking de gasto vía dashboard o endpoint User Data; **Sandbox gratis** para testing.

---

## 8. Casos de uso de máximo provecho para Efeonce (agencia B2B)

### AI Optimization API ★ prioridad 1
1. **AEO Share of Voice productizado**: LLM Mentions (Target/Multi-Target + Timeseries New & Lost) como serie mensual por cliente — "tu marca aparece en X% de las respuestas AI de tu categoría, ganaste/perdiste estas menciones". Alimenta directamente el AI Visibility Grader y la Radiografía AEO con datos longitudinales que hoy no tenemos.
2. **Target list de citabilidad**: Top Mentioned Domains/Pages por categoría de marca = a qué dominios apuntar con digital PR/guest content para que el cliente sea citado por los LLMs.
3. **Benchmarking multi-modelo barato**: LLM Responses en cola Standard ($0.0102/prompt + LLM) para correr el question set del grader contra GPT-5/Claude/Gemini/Perplexity de forma programada, en vez de mantener 4 integraciones propias con 4 API keys.

### Content Analysis API ★ prioridad 2
1. **Brand monitoring continuo** para clientes retainer: Search + Sentiment por marca/ejecutivo/producto, con Phrase Trends como serie para el QBR (¿la campaña movió menciones y tono?). A $0.06/1.000 filas es casi gratis de operar.
2. **Inteligencia competitiva**: mismas queries sobre competidores → gap de menciones + connotación dominante; insumo directo para el Barómetro competitivo.
3. **Prospección/preventa**: radiografía de reputación del prospecto en la primera reunión (menciones, sentiment, fuentes) sin trabajo manual.

### Business Data API
1. **Reputación local multi-fuente** para clientes con presencia física: Google Reviews (con respuesta del owner) + Trustpilot + Tripadvisor en un solo pipeline → dashboard de reputación + alertas de reviews negativas.
2. **Market mapping B2B**: Business Listings (Google Maps) por categoría+geo → universo de prospectos/partners de un vertical con contacto y rating (list building para outbound).
3. **Auditoría de perfil GBP** en onboarding SEO local: My Business Info + Q&A + Updates para detectar fichas incompletas o desatendidas.

### Merchant API
1. **Price/assortment intelligence** para clientes e-commerce: tracking de precios y sellers en Google Shopping/Amazon del set competitivo.
2. **Reviews mining de producto** (Google Shopping + Amazon) como insumo de messaging/copy: objeciones y lenguaje real del comprador.
3. *(Nicho para Efeonce hoy — activar solo con cliente e-commerce en cartera.)*

### App Data API
1. **ASO competitivo** si entra un cliente con app: rankings por keyword (App Searches) + reviews mining para roadmap/UX.
2. **Vigilancia de categoría**: App List por colección para detectar entrantes en el vertical del cliente.
3. *(Igual que Merchant: dormant hasta tener el caso.)*

### Content Generation API
- Sin caso: producto ausente de la doc; la generación vive en los providers LLM propios de Greenhouse.

---

## 9. Fuentes (todas verificadas 2026-08-06)

- Índice v3: `https://docs.dataforseo.com/v3/`
- Business Data: `https://docs.dataforseo.com/v3/business_data/overview/` · Google: `/v3/business_data-google-overview/` · Listings: `/v3/business_data-business_listings-overview/` · Social Media: `/v3/business_data-social_media-overview/` (la variante `/v3/business_data/social_media/overview/` → **404**) · fichas producto `dataforseo.com/apis/social-media-api/{pinterest-api,reddit-api}`
- Merchant: `https://docs.dataforseo.com/v3/merchant/overview/`
- App Data: `https://docs.dataforseo.com/v3/app_data/overview/`
- Content Analysis: `https://docs.dataforseo.com/v3/content_analysis/overview/` · pricing en `https://dataforseo.com/apis/content-generation-api` (hoy sirve Content Analysis)
- Content Generation (evidencia de ausencia): `docs.dataforseo.com/v3/content_generation/overview/` → 404 · `docs.dataforseo.com/v3/content_generation-overview/` → 404 · `dataforseo.com/pricing/content-generation` → 404 · legacy: `dataforseo.com/updates/category/content-generation-api`
- AI Optimization: `https://docs.dataforseo.com/v3/ai_optimization/overview/` · LLM Mentions: `/v3/ai_optimization/llm_mentions/overview/` · AI Keyword Data: `/v3/ai_optimization-ai_keyword_data-overview/` · modelos ChatGPT: `/v3/ai_optimization-chat_gpt-llm_responses-models/` · pricing: `https://dataforseo.com/pricing/ai-optimization/llm-responses`
- Pricing general: `https://dataforseo.com/pricing` (pay-as-you-go, mínimo $50; subpáginas por producto renderizan por JS — cifras no extraíbles por fetch, declarado)
