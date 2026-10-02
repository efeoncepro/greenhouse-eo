# DataForSEO Catalog-only Enablement Register V1

> Estado: inventario, no autorización · Generado desde `data/dataforseo/endpoints.v3.json` · Snapshot
> 2026-09-28T09:58:22.458Z · Digest `f4eaad6571538761846a0f43d7a26acdb5f7a0213caaa15e735d4c92cc462dc5`

## Propósito

Registrar **todas** las rutas oficiales que la CLI conoce pero Greenhouse no autoriza. Este documento no amplía el
allowlist, no crea entitlement y no habilita gasto. Su función es evitar que una futura evaluación empiece desde
cero o confunda existencia en el proveedor con disponibilidad en Greenhouse.

El snapshot contiene 545 endpoints: 320
ejecutables y 225 `catalog_only`. De estos últimos, 216 pertenecen a cinco
familias de producto potencialmente habilitables y 9 son rutas de infraestructura o plantillas
de documentación que no equivalen a una capability.

## Gate común para habilitar una familia

1. ADR o delta aceptado con owner, caso de uso, consumer presupuestario y límites de datos/licencia.
2. Familia explícita en `DATAFORSEO_FAMILIES`; nunca prefijo libre ni bypass por SDK/curl.
3. Migración del CHECK de `seo_provider_spend_daily` + test de paridad TS↔SQL antes del primer POST.
4. Entitlement, estimador/ceiling, spend recorder, breaker y runtime owner definidos.
5. Contrato validado primero en sandbox cuando exista; luego canary mínimo con organización y techo explícitos.
6. Preset/command, normalización, procedencia, cache/checkpoint e idempotencia según el lifecycle de la familia.
7. Skill, documentación funcional/técnica/manual, task, handoff y changelog sincronizados.

Habilitar una familia no obliga a exponer todas sus rutas: el ADR puede limitar el scope a operaciones concretas.
Las rutas `task_post`, `tasks_ready` y `task_get` forman un solo lifecycle y nunca se evalúan como productos
independientes.

## Resumen de priorización

| Familia | Rutas | Postura | Valor eventual |
| --- | ---: | --- | --- |
| `content_analysis` | 10 | Candidata 1 | Brand monitoring web: menciones, sentiment, distribución de rating y tendencias por frase o categoría para retainers y QBR. |
| `business_data` | 52 | Candidata 2, alcance acotado | SEO local y reputación: listings, Google Business, reviews, Q&A, hoteles, Trustpilot y Tripadvisor. |
| `keywords_data` | 74 | Condicional | Planificación paid y estacionalidad: datos Google Ads/Bing, Google Trends, DataForSEO Trends y clickstream. Labs sigue siendo el default orgánico. |
| `merchant` | 40 | Dormant hasta caso e-commerce | Inteligencia de ecommerce: Google Shopping y Amazon para productos, sellers, precios, reviews y disponibilidad competitiva. |
| `app_data` | 40 | Dormant hasta caso app | ASO e inteligencia de apps: búsquedas, charts, fichas, categorías y reviews de Google Play y App Store. |
| `appendix` | 4 | Infraestructura, no familia de producto | Diagnóstico de cuenta, status/errores y recuperación gobernada de webhooks. `user_data` ya alimenta health fuera del allowlist. |
| `$path` | 4 | No habilitar | Artefactos genéricos extraídos de la documentación; no representan una familia o endpoint concreto operable. |
| `$path.ai` | 1 | No habilitar | Artefacto genérico de documentación para rutas AI; no es una capacidad concreta. |

## Content Analysis — 10 rutas

- Postura: **Candidata 1**.
- Para qué podría servir: Brand monitoring web: menciones, sentiment, distribución de rating y tendencias por frase o categoría para retainers y QBR.
- Gate específico: Definir owner y consumer presupuestario, retención de menciones, taxonomía de sentimiento y separación respecto de LLM Mentions.
- Mix actual: 4 GET · 6 POST.

| Método | Ruta | Uso eventual |
| --- | --- | --- |
| GET | `/v3/content_analysis/available_filters` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/content_analysis/categories` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/content_analysis/category_trends/live` | Evolución de menciones dentro de una categoría competitiva. |
| GET | `/v3/content_analysis/languages` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/content_analysis/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/content_analysis/phrase_trends/live` | Serie temporal de menciones de una frase, marca, producto o ejecutivo. |
| POST | `/v3/content_analysis/rating_distribution/live` | Distribución de ratings asociada al corpus de menciones. |
| POST | `/v3/content_analysis/search/live` | Buscar menciones web y evidencia por keyword, marca, entidad o dominio. |
| POST | `/v3/content_analysis/sentiment_analysis/live` | Clasificar tono/connotación de menciones web para brand monitoring. |
| POST | `/v3/content_analysis/summary/live` | Resumen agregado del corpus antes de comprar o presentar detalle. |

## Business Data — 52 rutas

- Postura: **Candidata 2, alcance acotado**.
- Para qué podría servir: SEO local y reputación: listings, Google Business, reviews, Q&A, hoteles, Trustpilot y Tripadvisor.
- Gate específico: Limitar fuentes/casos, resolver datos personales y licencias, definir identidad de locales, deduplicación y owner de presupuesto.
- Mix actual: 34 GET · 18 POST.

| Método | Ruta | Uso eventual |
| --- | --- | --- |
| GET | `/v3/business_data/$se/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/business_listings/available_filters` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/business_data/business_listings/categories` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/business_data/business_listings/categories_aggregation/live` | Descubrir y comparar negocios/locales por categoría, mercado y filtros. |
| GET | `/v3/business_data/business_listings/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/business_data/business_listings/search/live` | Descubrir y comparar negocios/locales por categoría, mercado y filtros. |
| GET | `/v3/business_data/google/extended_reviews/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/google/extended_reviews/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/google/extended_reviews/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/google/hotel_info/live/advanced` | Ficha hotelera, amenities y datos competitivos del vertical de viajes. |
| POST | `/v3/business_data/google/hotel_info/live/html` | Ficha hotelera, amenities y datos competitivos del vertical de viajes. |
| GET | `/v3/business_data/google/hotel_info/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/google/hotel_info/task_get/html/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/google/hotel_info/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/google/hotel_info/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/google/hotel_searches/live` | Descubrimiento hotelero por mercado para benchmark de categoría. |
| GET | `/v3/business_data/google/hotel_searches/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/google/hotel_searches/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/google/hotel_searches/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/google/languages` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/business_data/google/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/business_data/google/locations/$country` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/business_data/google/my_business_info/live` | Ficha pública de Google Business para presencia local y consistencia de datos. |
| GET | `/v3/business_data/google/my_business_info/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/google/my_business_info/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/google/my_business_info/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/google/my_business_updates/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/google/my_business_updates/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/google/my_business_updates/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/google/questions_and_answers/live` | Auditar preguntas/respuestas públicas como señal de intención y soporte local. |
| GET | `/v3/business_data/google/questions_and_answers/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/google/questions_and_answers/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/google/questions_and_answers/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/google/reviews/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/google/reviews/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/google/reviews/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/tripadvisor/languages` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/business_data/tripadvisor/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/business_data/tripadvisor/locations/$country` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/business_data/tripadvisor/reviews/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/tripadvisor/reviews/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/tripadvisor/reviews/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/tripadvisor/search/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/tripadvisor/search/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/tripadvisor/search/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/trustpilot/reviews/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/trustpilot/reviews/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/trustpilot/reviews/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/trustpilot/search/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/business_data/trustpilot/search/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/business_data/trustpilot/search/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |

## Keywords Data — 74 rutas

- Postura: **Condicional**.
- Para qué podría servir: Planificación paid y estacionalidad: datos Google Ads/Bing, Google Trends, DataForSEO Trends y clickstream. Labs sigue siendo el default orgánico.
- Gate específico: Exigir caso donde Labs no alcance, fijar fuente/metodología por serie, evitar mezclar escalas y asignar consumer SEO o media.
- Mix actual: 43 GET · 31 POST.

| Método | Ruta | Uso eventual |
| --- | --- | --- |
| GET | `/v3/keywords_data/bing/audience_estimation/industries` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/keywords_data/bing/audience_estimation/job_functions` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/keywords_data/bing/audience_estimation/live` | Estimar audiencia Bing Ads por industria y función laboral para media planning. |
| GET | `/v3/keywords_data/bing/audience_estimation/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/bing/audience_estimation/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/bing/audience_estimation/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/bing/keyword_performance/live` | Performance paid estimada en Bing para planificación de campañas. |
| GET | `/v3/keywords_data/bing/keyword_performance/locations_and_languages` | Metadata/preflight combinado de mercados e idiomas admitidos. |
| GET | `/v3/keywords_data/bing/keyword_performance/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/bing/keyword_performance/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/bing/keyword_performance/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/bing/keyword_suggestions_for_url/languages` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/keywords_data/bing/keyword_suggestions_for_url/live` | Expandir keywords Bing desde una URL para paid/search planning. |
| GET | `/v3/keywords_data/bing/keyword_suggestions_for_url/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/bing/keyword_suggestions_for_url/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/bing/keyword_suggestions_for_url/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/bing/keywords_for_keywords/live` | Expandir semillas con datos Ads de la plataforma declarada. |
| GET | `/v3/keywords_data/bing/keywords_for_keywords/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/bing/keywords_for_keywords/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/bing/keywords_for_keywords/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/bing/keywords_for_site/live` | Descubrir keywords Ads asociadas a un dominio o sitio. |
| GET | `/v3/keywords_data/bing/keywords_for_site/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/bing/keywords_for_site/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/bing/keywords_for_site/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/bing/languages` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/keywords_data/bing/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/keywords_data/bing/search_volume_history/live` | Histórico de demanda Bing para estacionalidad y planificación. |
| GET | `/v3/keywords_data/bing/search_volume_history/locations_and_languages` | Metadata/preflight combinado de mercados e idiomas admitidos. |
| GET | `/v3/keywords_data/bing/search_volume_history/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/bing/search_volume_history/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/bing/search_volume_history/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/bing/search_volume/live` | Volumen Ads actual; usar sólo cuando Labs no cubra el objetivo metodológico. |
| GET | `/v3/keywords_data/bing/search_volume/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/bing/search_volume/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/bing/search_volume/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/bing/status` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/keywords_data/clickstream_data/bulk_search_volume/live` | Volumen de búsqueda calibrado por clickstream; conservar metodología por serie. |
| POST | `/v3/keywords_data/clickstream_data/dataforseo_search_volume/live` | Volumen de búsqueda calibrado por clickstream; conservar metodología por serie. |
| POST | `/v3/keywords_data/clickstream_data/global_search_volume/live` | Volumen de búsqueda calibrado por clickstream; conservar metodología por serie. |
| GET | `/v3/keywords_data/clickstream_data/locations_and_languages` | Metadata/preflight combinado de mercados e idiomas admitidos. |
| POST | `/v3/keywords_data/dataforseo_trends/demography/live` | Distribución demográfica relativa para ángulos de audiencia. |
| POST | `/v3/keywords_data/dataforseo_trends/explore/live` | Tendencia relativa de demanda con el motor propio del proveedor. |
| GET | `/v3/keywords_data/dataforseo_trends/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/keywords_data/dataforseo_trends/locations/$country` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/keywords_data/dataforseo_trends/merged_data/live` | Serie combinada de tendencias para análisis temporal comparativo. |
| POST | `/v3/keywords_data/dataforseo_trends/subregion_interests/live` | Interés relativo por subregión para priorización geográfica. |
| POST | `/v3/keywords_data/google_ads/ad_traffic_by_keywords/live` | Forecast de tráfico/costo Google Ads para presupuestación paid. |
| GET | `/v3/keywords_data/google_ads/ad_traffic_by_keywords/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/google_ads/ad_traffic_by_keywords/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/google_ads/ad_traffic_by_keywords/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/google_ads/keywords_for_keywords/live` | Expandir semillas con datos Ads de la plataforma declarada. |
| GET | `/v3/keywords_data/google_ads/keywords_for_keywords/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/google_ads/keywords_for_keywords/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/google_ads/keywords_for_keywords/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/google_ads/keywords_for_site/live` | Descubrir keywords Ads asociadas a un dominio o sitio. |
| GET | `/v3/keywords_data/google_ads/keywords_for_site/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/google_ads/keywords_for_site/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/google_ads/keywords_for_site/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/google_ads/languages` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/keywords_data/google_ads/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/keywords_data/google_ads/locations/$country` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/keywords_data/google_ads/search_volume/live` | Volumen Ads actual; usar sólo cuando Labs no cubra el objetivo metodológico. |
| GET | `/v3/keywords_data/google_ads/search_volume/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/google_ads/search_volume/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/google_ads/search_volume/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/google_ads/status` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/keywords_data/google_trends/categories` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/keywords_data/google_trends/explore/live` | Popularidad relativa de Google Trends; comparar sólo dentro del mismo request. |
| GET | `/v3/keywords_data/google_trends/explore/task_get/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/keywords_data/google_trends/explore/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/google_trends/explore/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/keywords_data/google_trends/languages` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/keywords_data/google_trends/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/keywords_data/google_trends/locations/$country` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |

## Merchant — 40 rutas

- Postura: **Dormant hasta caso e-commerce**.
- Para qué podría servir: Inteligencia de ecommerce: Google Shopping y Amazon para productos, sellers, precios, reviews y disponibilidad competitiva.
- Gate específico: Requiere cliente e-commerce, SKU/ASIN SSOT, política de matching, cobertura geográfica, presupuesto y límites contractuales.
- Mix actual: 27 GET · 13 POST.

| Método | Ruta | Uso eventual |
| --- | --- | --- |
| GET | `/v3/merchant/$se/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/merchant/amazon/asin/live/advanced` | Ficha y evidencia de un ASIN para inteligencia de producto. |
| POST | `/v3/merchant/amazon/asin/live/html` | Ficha y evidencia de un ASIN para inteligencia de producto. |
| GET | `/v3/merchant/amazon/asin/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/amazon/asin/task_get/html/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/merchant/amazon/asin/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/amazon/asin/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/amazon/languages` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/merchant/amazon/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/merchant/amazon/locations/$country` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/merchant/amazon/products/live/advanced` | Descubrimiento competitivo de productos Amazon por query/mercado. |
| POST | `/v3/merchant/amazon/products/live/html` | Descubrimiento competitivo de productos Amazon por query/mercado. |
| GET | `/v3/merchant/amazon/products/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/amazon/products/task_get/html/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/merchant/amazon/products/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/amazon/products/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/merchant/amazon/sellers/live/advanced` | Perfil y surtido de sellers Amazon. |
| POST | `/v3/merchant/amazon/sellers/live/html` | Perfil y surtido de sellers Amazon. |
| GET | `/v3/merchant/amazon/sellers/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/amazon/sellers/task_get/html/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/merchant/amazon/sellers/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/amazon/sellers/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/google/languages` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/merchant/google/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/merchant/google/locations/$country` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/merchant/google/product_info/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/merchant/google/product_info/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/google/product_info/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/google/products/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/google/products/task_get/html/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/merchant/google/products/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/google/products/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/google/reviews/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/merchant/google/reviews/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/google/reviews/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/google/sellers/ad_url/$shop_ad_aclk` | Sellers y enlaces de anuncios Shopping. |
| GET | `/v3/merchant/google/sellers/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/merchant/google/sellers/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/google/sellers/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/merchant/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |

## App Data — 40 rutas

- Postura: **Dormant hasta caso app**.
- Para qué podría servir: ASO e inteligencia de apps: búsquedas, charts, fichas, categorías y reviews de Google Play y App Store.
- Gate específico: Requiere cliente/app en cartera, app identity SSOT, mercados, cadencia, presupuesto y separación de métricas entre stores.
- Mix actual: 30 GET · 10 POST.

| Método | Ruta | Uso eventual |
| --- | --- | --- |
| GET | `/v3/app_data/$se/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/apple/app_info/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/app_data/apple/app_info/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/apple/app_info/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/apple/app_list/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/app_data/apple/app_list/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/apple/app_list/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/apple/app_listings/categories` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/app_data/apple/app_listings/search/live` | Buscar apps/listings por término y mercado. |
| GET | `/v3/app_data/apple/app_reviews/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/app_data/apple/app_reviews/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/apple/app_reviews/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/apple/app_searches/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/app_data/apple/app_searches/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/apple/app_searches/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/apple/categories` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/app_data/apple/languages` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/app_data/apple/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/app_data/google/app_info/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/google/app_info/task_get/html/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/app_data/google/app_info/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/google/app_info/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/google/app_list/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/google/app_list/task_get/html/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/app_data/google/app_list/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/google/app_list/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/google/app_listings/categories` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| POST | `/v3/app_data/google/app_listings/search/live` | Buscar apps/listings por término y mercado. |
| GET | `/v3/app_data/google/app_reviews/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/app_data/google/app_reviews/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/google/app_reviews/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/google/app_searches/task_get/advanced/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/google/app_searches/task_get/html/$id` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| POST | `/v3/app_data/google/app_searches/task_post` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/google/app_searches/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |
| GET | `/v3/app_data/google/categories` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/app_data/google/languages` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/app_data/google/locations` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/app_data/google/locations/$country` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/app_data/tasks_ready` | Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit. |

## Appendix — 4 rutas

- Postura: **Infraestructura, no familia de producto**.
- Para qué podría servir: Diagnóstico de cuenta, status/errores y recuperación gobernada de webhooks. `user_data` ya alimenta health fuera del allowlist.
- Gate específico: No agregar al allowlist de familias. Cada operación requiere contrato explícito; webhook resend necesita seguridad e idempotencia.
- Mix actual: 3 GET · 1 POST.

| Método | Ruta | Uso eventual |
| --- | --- | --- |
| GET | `/v3/appendix/errors` | Catálogo o consulta de errores del proveedor para diagnóstico sanitizado. |
| GET | `/v3/appendix/status` | Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra. |
| GET | `/v3/appendix/user_data` | Health de cuenta, saldo y límites; ya se usa por el carril especial de conexión. |
| POST | `/v3/appendix/webhook_resend` | Recuperación gobernada de una entrega webhook fallida, con idempotencia y destino validado. |

## Plantillas `$path` — 4 rutas

- Postura: **No habilitar**.
- Para qué podría servir: Artefactos genéricos extraídos de la documentación; no representan una familia o endpoint concreto operable.
- Gate específico: Excluir de decisiones de producto; corregir el extractor si empiezan a contaminar conteos o navegación.
- Mix actual: 1 GET · 3 POST.

| Método | Ruta | Uso eventual |
| --- | --- | --- |
| POST | `/v3/$path` | Artefactos genéricos extraídos de la documentación; no representan una familia o endpoint concreto operable. |
| GET | `/v3/$path/$id.ai` | Artefactos genéricos extraídos de la documentación; no representan una familia o endpoint concreto operable. |
| POST | `/v3/$path/errors` | Catálogo o consulta de errores del proveedor para diagnóstico sanitizado. |
| POST | `/v3/$path/id_list` | Artefactos genéricos extraídos de la documentación; no representan una familia o endpoint concreto operable. |

## Plantilla `$path.ai` — 1 ruta

- Postura: **No habilitar**.
- Para qué podría servir: Artefacto genérico de documentación para rutas AI; no es una capacidad concreta.
- Gate específico: Excluir del allowlist y de cualquier estimación de cobertura operativa.
- Mix actual: 0 GET · 1 POST.

| Método | Ruta | Uso eventual |
| --- | --- | --- |
| POST | `/v3/$path.ai` | Artefacto genérico de documentación para rutas AI; no es una capacidad concreta. |

## Regeneración y verificación

Después de `pnpm dataforseo:catalog:sync`:

```bash
pnpm exec tsx scripts/dataforseo/generate-enablement-register.ts
pnpm exec tsx scripts/dataforseo/generate-enablement-register.ts --check
```

El modo `--check` falla si el registro no coincide byte-for-byte con el catálogo vigente.
