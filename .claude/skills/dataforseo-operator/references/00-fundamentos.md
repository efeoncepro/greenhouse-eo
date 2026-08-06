# DataForSEO API v3 — Fundamentos transversales

> **Dossier as-of 2026-08-06.** Todo lo afirmado fue verificado contra páginas reales de `docs.dataforseo.com` y `dataforseo.com` en esa fecha (vía WebFetch/WebSearch). Cada sección cita la URL exacta. Donde una página no cargó o no detalló algo, se dice explícitamente.

## Resumen ejecutivo

- API REST sobre `https://api.dataforseo.com/v3/`, autenticación **Basic auth** (login + password de API, distinto del password de cuenta), requests como **arrays de tasks** (hasta 100 por POST en modo task-based; 1 en live).
- Dos modelos de ejecución: **task-based** (`task_post` → `tasks_ready`/callbacks → `task_get`; resultados almacenados 30 días) y **live** (síncrono, 1 task, sin almacenamiento).
- **Precio por task** con 3 velocidades (SERP Google Organic como referencia): standard $0.0006 / priority $0.0012 / live $0.002 por SERP de 10 resultados; el campo `cost` viene en cada respuesta; balance y tarifas en `/v3/appendix/user_data` (gratis).
- **Límites**: 2000 API calls/min, 30 requests simultáneos (código 40209), 100 tasks por POST (código 40006). Sandbox `sandbox.dataforseo.com` gratis con data dummy pero estructura idéntica.
- Códigos internos `20xxx` = éxito, `40xxx` = error de cliente/pago/datos, `50xxx` = error interno. Endpoints de soporte gratis: `$path/errors` (tasks fallidas últimos 7 días), `$path/id_list`, `appendix/webhook_resend`.

---

## Auth y formato

**Fuente:** https://docs.dataforseo.com/v3/auth/ y https://docs.dataforseo.com/v3/ (as-of 2026-08-06)

- **Basic Authentication** estándar HTTP. Credenciales en el header `Authorization: Basic <base64(login:password)>`. Ejemplo de la doc: `login:password` → `Authorization: Basic bG9naW46cGFzc3dvcmQ=`.
- El **password de API se genera automáticamente** y "is different from your account password". Se obtiene en el dashboard, pestaña API Access (`https://app.dataforseo.com/api-access`).
- "It is not possible to pass the login and password in URL parameters" — solo header. No hay llamada de autenticación separada (no hay token/OAuth): cada request lleva el Basic auth.
- **Base URL:** `https://api.dataforseo.com/` (los endpoints v3 cuelgan de `https://api.dataforseo.com/v3/`).
- **Formato de request:** POST con body JSON **UTF-8** que es un **array de tasks** (cada task = un objeto con sus parámetros). gzip es estándar en los clientes oficiales.
- **Formato de response:** JSON por defecto; se puede pedir XML o HTML anexando `.xml` o `.html` al path. Envelope consistente:
  - top-level: `version`, `status_code`, `status_message`, `time`, `cost` (USD), `tasks_count`, `tasks_error`, `tasks[]`.
  - cada elemento de `tasks[]` trae su propio `id` (UUID), `status_code`/`status_message` **por task**, `cost`, `result_count`, `path`, `data` (eco de parámetros) y `result[]` con la data.
  - Códigos por task: `20000` "ok.", `20100` "task created."; errores en rango `40xxx`/`50xxx` (ver sección Errores).
- **Rate limit visible por headers:** `X-RateLimit-Limit` ("the rate limit ceiling per minute") y `X-RateLimit-Remaining`.

## Task-based vs Live

**Fuentes:** https://docs.dataforseo.com/v3/serp/google/organic/task_post/ · https://docs.dataforseo.com/v3/serp/google/organic/tasks_ready/ · https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/ · https://docs.dataforseo.com/v3/ (as-of 2026-08-06)

### Modelo task-based (Standard method)

1. **`task_post`**: hasta **100 tasks por POST** (exceso → error `40006`); hasta **2000 API calls/min**. Cada task recibe un `id` UUID.
2. Recolección por una de tres vías:
   - **`tasks_ready`** (`GET /v3/serp/$se/tasks_ready`): "the list of completed tasks, which haven't been collected yet". Hasta 1000 tasks por respuesta dentro de una ventana de 3 días; "Each separate task will remain on the list until it is collected"; las tasks ya recogidas o no recogidas en 3 días salen de la lista. Límite: "up to 20 API calls per minute". Gratis.
   - **`pingback_url`**: GET a tu servidor al completarse la task; soporta variables `$id` y `$tag`.
   - **`postback_url`**: POST a tu servidor con el **resultado completo gzip-comprimido**; requiere `postback_data` (`regular` | `advanced` | `html`); también soporta `$id`/`$tag`. **Gotcha:** "If your server doesn't respond within 10 seconds, the connection will be aborted by timeout, and the task will be transferred to the 'Tasks Ready' list."
3. **`task_get`**: baja el resultado por `id`.
- Almacenamiento: "Standard method: results are stored for 30 days"; los resultados HTML solo 7 días. (Fuente: https://docs.dataforseo.com/v3/)
- Para alto volumen (>1000 tasks/min), la doc recomienda "pingbacks/postbacks instead, and applying the Tasks Ready endpoint only to obtain the IDs of failed postback tasks" (hay delays arquitecturales en la actualización de la cola).
- **`webhook_resend`** (`POST /v3/appendix/webhook_resend`): reenvía pingbacks/postbacks fallidos; hasta 100 ids por llamada, cada id como objeto separado; gratis y "Your account will not be double-charged for resending a webhook". (Fuente: https://docs.dataforseo.com/v3/appendix/webhook_resend/)

### Modelo live

- Una sola llamada síncrona request-response, sin task_get: "each Live SERP API call can contain only one task". "Your account will be charged for each request". "Live method: results are not stored". Rate limit igual: 2000 calls/min.

### Tabla de decisión

| Criterio | Standard (normal) | Standard (priority 2) | Live |
|---|---|---|---|
| Latencia (SERP Google) | ~5 min promedio | hasta ~1 min promedio | hasta ~6 s promedio |
| Costo (Google Organic, por SERP de 10) | $0.0006 | $0.0012 | $0.002 |
| Tasks por POST | hasta 100 | hasta 100 | 1 |
| Resultados almacenados | 30 días (HTML 7) | 30 días (HTML 7) | No |
| Recolección | tasks_ready / pingback / postback / task_get | ídem | inline |
| Cuándo usarlo | Batch/rank-tracking, costo mínimo | Batch con SLA corto | UX interactiva / on-demand |

(Latencias y precios: https://dataforseo.com/pricing/serp/google-organic-serp-api, as-of 2026-08-06.)

## Precios y costos

**Fuentes:** https://dataforseo.com/pricing (hub) · https://dataforseo.com/pricing/serp/google-organic-serp-api · https://dataforseo.com/help-center/serp-api-cost-explained · https://docs.dataforseo.com/v3/appendix/user_data/ (as-of 2026-08-06)

- **Pay-as-you-go**, sin suscripción obligatoria: "With DataForSEO you pay only for the individual services you consume". **Pago mínimo $50**. La página `dataforseo.com/pricing` es un hub de navegación; los números viven en las páginas por producto (p.ej. `pricing/serp/google-organic-serp-api`) y en `dataforseo.com/pricing-list`. Nota: la página que probé como `dataforseo.com/pricing/serp/google/organic` devolvió **404** — el slug real es `pricing/serp/google-organic-serp-api`.
- **Se cobra por task** y la unidad base varía por motor: Google Organic/Bing/Yahoo/Baidu por 10 resultados; Google News/Images/Maps por 100; Local Finder por 20 (desktop) o 10 (mobile); Naver por 15; YouTube por 20.
- **Multiplicadores** (help-center "cost explained"): `depth` mayor al default escala proporcional y se redondea hacia arriba ("rounded up… to the next 10th"); operadores de búsqueda (`site:`, `filetype:`…) **×5**; `calculate_rectangles` suma 1 base price (2 para News/Search-by-Image); `get_website_url` (Baidu) ×10. Si pides `depth` mayor que los resultados devueltos, "the difference will be automatically refunded to your account balance".
- **Campo `cost`**: viene en USD tanto a nivel top-level como por task en cada respuesta; los endpoints de soporte (`tasks_ready`, `id_list`, `errors`, `user_data`, `webhook_resend`) declaran explícitamente que no cobran.
- **`/v3/appendix/user_data`** (`GET`, gratis): devuelve `login`, `timezone`, `rates.limits` (caps por `day`/`minute`, p.ej. `tasks_ready: 60`/min), `rates.statistics` (uso real), `money.total`, `money.balance` (USD), `money.limits`/`money.statistics` (caps y gasto por función), `backlinks_subscription_expiry_date`, `llm_mentions_subscription_expiry_date` y un objeto `price` con costo por función, tipo de cobro (`per_result` | `per_request`) y prioridad. Es el endpoint canónico para monitorear saldo y tarifas efectivas de TU cuenta.
- No verifiqué en página cargada: precios exactos de Labs/Backlinks/Keywords Data (las páginas hub no los muestran; requieren sus páginas por producto) ni si los fondos no usados expiran.

## Límites y sandbox

**Fuentes:** https://docs.dataforseo.com/v3/appendix/sandbox/ · https://docs.dataforseo.com/v3/appendix/errors/ · https://docs.dataforseo.com/v3/serp/google/organic/task_post/ (as-of 2026-08-06)

- **2000 API calls por minuto** (excederlo → `40202`); **30 requests simultáneos** máximo (`40209` "too many simultaneous queries"); **100 tasks por POST** (`40006`); live = 1 task por POST.
- Límites propios de endpoints de soporte: `tasks_ready` 20 calls/min; `id_list` 10 calls/min; `user_data` reporta el cap por función en `rates.limits`.
- Hay además límites configurables/protectivos: `40203` daily cost limit, `40205`/`40206` duplicate task hourly/daily limit, `40207` IP no whitelisted.
- **Sandbox** (`https://sandbox.dataforseo.com/v3/`): "Your account will not be charged for using Sandbox endpoints", "completely free for any registered user". Devuelve "only generic responses"/"dummy data", **pero** "the structure and fields of the sandbox response are identical to that of the actual API response". Mismos rate limits que producción (2000/min, 100 tasks por POST, live 1 task). Soporta SERP, Keywords Data, Domain Analytics, Labs, Backlinks, OnPage, Content Analysis, Merchant, App Data y Business Data, **y también `pingback_url`/`postback_url`** (sirve para probar webhooks). Limitación implícita: la data es dummy → sirve para validar parsing/contratos, no para validar contenido. Código `40404` = "no Sandbox prepared data available" para ese endpoint.

## Errores y reintentos

**Fuentes:** https://docs.dataforseo.com/v3/appendix/errors/ · https://docs.dataforseo.com/v3/appendix/api_errors/ (as-of 2026-08-06)

Códigos internos (conviven con HTTP 200/401/402/404/500 — nota: un HTTP 200 puede envolver tasks con `40xxx`, hay que chequear el `status_code` POR TASK):

- **Éxito:** `20000` "ok.", `20100` "task created.".
- **Task en tránsito (no error):** `40601` "task handed.", `40602` "task in queue." — señal de esperar/re-pollear, no de reintentar el POST.
- **Request:** `40000` una sola task a la vez (endpoints que lo exigen), `40001–40004` colisiones de id, `40006` >100 tasks.
- **Auth/billing/límites:** `40100` auth failure, `40200` "payment required.", `40202` rate limit (2000/min), `40203` daily cost limit, `40205`/`40206` duplicados hora/día, `40207` IP no whitelisted, `40209` >30 simultáneos, `40210` "insufficient funds.".
- **Recurso/resultado:** `40102` "no search results.", `40103` fallo de ejecución — *retry recomendado por la doc*, `40400`/`40401` not found / task not found, **`40403` "results expired."** (data más vieja que ~1 mes: recoger a tiempo o re-postear), `40404` sin data sandbox, `40408` "target url is invalid.".
- **Validación:** `40501` "invalid field.", `40502` "post data is empty.", `40503` "post data is invalid.", `40505` location params desactualizados, `40506` "unknown fields in post data.".
- **Internos:** `50000` "internal error.", `50100` "not implemented.", `50301` "3rd party api service unavailable.", `50303` "update is in progress. please try after a few minutes", `50401` "internal error - timeout." (live >120 s), `50402` "target page took too long to respond." (>50 s).

Reintentos razonables según la doc: `40103` reintentar la task; `50303` reintentar tras unos minutos; `40202`/`40209` backoff (respetar `X-RateLimit-Remaining`); `40602` seguir esperando. Errores `405xx` son bugs del payload — no reintentar sin corregir.

**Endpoints de diagnóstico (gratis):**
- **`POST /v3/$path/errors`** (`$path` ∈ serp, ai_optimization, keywords_data, domain_analytics, dataforseo_labs, backlinks, on_page, content_analysis, merchant, app_data, business_data): tasks que "returned an error within the past 7 days"; params `datetime_from`/`datetime_to` (ventana 7 días, UTC), `limit` (default/max 1000), `offset` (max 100M), `filtered_function`. Útil para detectar postbacks fallidos.
- **`POST /v3/$path/id_list`** (mismos `$path`): ids + metadata de tasks creadas en un período — "including both successful and uncompleted tasks"; `datetime_from`/`datetime_to` obligatorios (hasta 1 mes atrás con metadata, 6 meses sin), `limit` max 1000, `offset` max 100M, `sort` asc/desc, `include_metadata` (eco del POST original). 10 calls/min.
- **`GET /v3/appendix/errors`**: listado de referencia de todos los códigos/mensajes posibles (gratis). *(La página que consulté no menciona filtros datetime para este listado; los filtros datetime pertenecen a `$path/errors`.)*

## Filtros transversales (`filters` / `order_by` / `limit` / `offset`)

**Fuente:** https://docs.dataforseo.com/v3/dataforseo_labs/filters/ (aplica al patrón usado en Labs; Backlinks y otros módulos usan la misma gramática con sus propios campos) (as-of 2026-08-06)

- **Sintaxis:** cada condición es un array `["$campo_con_ruta_punteada", "$operador", $valor]`, p.ej. `["keyword_data.keyword_info.search_volume", ">=", 50]`.
- **Operadores por tipo:** boolean `=`, `<>` · numéricos `<`, `<=`, `>`, `>=`, `=`, `<>`, `in`, `not_in` · strings `match`, `not_match`, `like`, `not_like`, `ilike`, `not_ilike`, `in`, `not_in`, `=`, `<>`, `regex`, `not_regex` · arrays `has`, `has_not` · time `<`, `>`.
- `regex`/`not_regex` usan **sintaxis RE2**; "the maximum limit for the number of characters you can specify in regex and not_regex is **1000**".
- **Combinación:** condiciones encadenadas con operador lógico explícito `"and"` / `"or"` entre ellas. Máximo: "You can add several filters at once **(8 filters maximum)**".
- **`order_by`:** restricción documentada: "It is not possible to use the following types of fields as sorting rules in order_by: `array.str`, `array.num`". (El formato habitual `"campo,asc|desc"` y el máximo de reglas por request se definen por endpoint; no quedó citado en la página de filtros — verificar en el endpoint concreto.)
- `limit`/`offset`: presentes en los endpoints Labs/Backlinks; los defaults/máximos son por endpoint (p.ej. en los endpoints appendix: limit 1000 / offset 100M). No hay una página transversal única con esos números — verificar por endpoint.

## Gotchas

1. **HTTP 200 ≠ éxito.** El envelope puede venir 200 con tasks en `40xxx`; siempre validar `tasks[].status_code` (y `tasks_error` a nivel top). as-of 2026-08-06, patrón del envelope en https://docs.dataforseo.com/v3/.
2. **Resultados expiran.** Task-based guarda 30 días (HTML 7); después `40403` "results expired." y hay que pagar de nuevo. `tasks_ready` solo muestra tasks de los últimos 3 días no recogidas.
3. **Postback con timeout de 10 s.** Si tu server no responde en 10 s, se aborta y la task cae a Tasks Ready — hay que tener el fallback de polling + `webhook_resend` (100 ids, sin doble cobro).
4. **El costo escala silencioso**: `depth`, operadores de búsqueda (×5), `calculate_rectangles`, etc. multiplican el precio base; el `cost` real viene en cada respuesta — registrar ese campo, no el precio de lista. El refund por depth no alcanzado es automático, pero `40102` "no search results." existe como estado (la doc de costos no afirma reembolso por task fallida; no lo asumas).
5. **Duplicate task limits** (`40205`/`40206`): re-postear la misma task idéntica dentro de la hora/día puede bloquearse — usa `tag` + `id_list` para reconciliar en vez de re-enviar.
6. **Sandbox valida contratos, no contenido**: estructura idéntica, data dummy; algunos endpoints ni siquiera tienen data preparada (`40404`).
7. **`pnpm`-style slugs de pricing**: las URLs de pricing por producto son del estilo `pricing/serp/google-organic-serp-api` (la variante `pricing/serp/google/organic` da 404).
8. **`tasks_ready` no escala** para >1000 tasks/min — la propia doc manda a pingback/postback y deja tasks_ready solo para recuperar postbacks fallidos.

## Fuentes (URLs + as-of 2026-08-06)

| URL | Qué se verificó | Estado |
|---|---|---|
| https://docs.dataforseo.com/v3/ | Overview, base URL, storage 30d/7d, rate-limit headers, formatos .xml/.html | Cargó OK |
| https://docs.dataforseo.com/v3/auth/ | Basic auth, header, base64, no URL params, API password distinto | Cargó OK |
| https://docs.dataforseo.com/v3/appendix/errors/ | Tabla de códigos 20xxx/40xxx/50xxx | Cargó OK |
| https://docs.dataforseo.com/v3/appendix/api_errors/ | Endpoint `$path/errors` (7 días, datetime, gratis) | Cargó OK |
| https://docs.dataforseo.com/v3/appendix/user_data/ | Balance, rates.limits/statistics, price object, subscripciones | Cargó OK |
| https://docs.dataforseo.com/v3/appendix/id_list/ | `$path/id_list`, params y límites | Cargó OK |
| https://docs.dataforseo.com/v3/appendix/sandbox/ | sandbox.dataforseo.com, gratis, dummy data, webhooks | Cargó OK |
| https://docs.dataforseo.com/v3/appendix/webhook_resend/ | Resend de webhooks, 100 ids, sin doble cobro | Cargó OK |
| https://docs.dataforseo.com/v3/serp/google/organic/task_post/ | 100 tasks/POST, priority 1/2, pingback/postback, timeout 10 s | Cargó OK |
| https://docs.dataforseo.com/v3/serp/google/organic/tasks_ready/ | Lista no-recogidas, 3 días, 20 calls/min | Cargó OK |
| https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/ | Live = 1 task síncrona, sin storage | Cargó OK |
| https://docs.dataforseo.com/v3/dataforseo_labs/filters/ | Sintaxis filters, operadores, 8 max, RE2 1000 chars, order_by | Cargó OK |
| https://dataforseo.com/pricing | Hub pay-as-you-go, mínimo $50 | Cargó OK (sin números por producto) |
| https://dataforseo.com/pricing/serp/google-organic-serp-api | $0.0006 / $0.0012 / $0.002 por SERP; turnarounds | Cargó OK |
| https://dataforseo.com/help-center/serp-api-cost-explained | Unidades por motor, multiplicadores, refund por depth | Cargó OK |
| https://dataforseo.com/pricing/serp/google/organic | — | **404 Not Found** (slug incorrecto) |

No verificado por falta de página cargada: precios exactos de Labs/Backlinks/Keywords Data, expiración de fondos no usados, y el formato/máximo exacto de reglas `order_by` por endpoint.
