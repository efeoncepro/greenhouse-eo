# DataForSEO CLI — uso diario

> Alcance: herramienta local de operador/agentes. No despliega ni cambia flags.
> Catálogo verificado el 2026-09-28: 545 endpoints oficiales; 320 pertenecen a las seis familias ejecutables.

`pnpm dataforseo` es la entrada gobernada para research ad hoc. Usa el mismo transporte, allowlist, breaker,
entitlement y ledger que los consumers productivos; no es un SDK alternativo. La fuente rápida de sintaxis es:

Comportamiento funcional: [`dataforseo-research-cli.md`](../../documentation/growth/dataforseo-research-cli.md).
Contrato técnico: [`GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md`](../../architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md).
Evidencia de campo: [validación transversal del 2026-09-28](../../audits/seo/2026-09-28-dataforseo-cli-production-validation.md).
Relevancia por URL, CLI 1.1.0: [validación local del 2026-09-30](../../audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md).

```bash
pnpm dataforseo -- help
pnpm dataforseo -- version
```

## Versionar una mejora de la CLI

La versión vigente, el digest y el historial están en `data/dataforseo/cli-versions.json`. No edites la versión a
mano. Después de cambiar una fuente gobernada, clasifica el cambio y ejecuta:

```bash
pnpm dataforseo:version:bump -- minor \
  --summary "Agrega una capacidad compatible" \
  --change "Nuevo comando o campo opcional" \
  --ref "TASK-###"

pnpm dataforseo:version:check
pnpm dataforseo -- version --json
```

Usa `major` si un consumidor existente debe modificar comandos, flags, schema de salida o checkpoints; `minor`
para capacidades compatibles; `patch` para fixes y guardrails compatibles. Repite `--change` y `--ref` cuando
necesites más de uno. El bump falla si no detecta cambios en fuentes gobernadas y actualiza versión, release y
SHA-256 en una sola escritura. Luego ejecuta tests, lint y typecheck normales; el digest no sustituye esos gates.

No crees una release para typos o links que no cambian el contrato operativo. Si agregas un archivo que participa
en el comportamiento de la CLI, incorpóralo a `governedPaths` antes del bump. `pnpm local:check` incluye el check
de versión y bloquea un cambio material no registrado.

## Antes de empezar

- Configura `DATAFORSEO_API_LOGIN` y `DATAFORSEO_API_PASSWORD_SECRET_REF`; la contraseña se resuelve por la ruta
  gobernada y nunca se pone en argumentos, payloads, archivos de salida ni capturas.
- Define el objetivo, mercado y lente antes de comprar. GSC es medición de primera parte; DataForSEO es una
  estimación de mercado. No se promedian ni se presentan como equivalentes.
- Para una llamada pagada, empieza siempre con `--dry-run`. Revisa endpoint, mercado, cantidad de tasks,
  estimación y `consumer` antes de confirmar.
- Usa una organización real con `--org <uuid>` cuando corresponda. La CLI nunca la infiere ni la fabrica.

El flujo recomendado es `catalog search` → `catalog describe` → `quick|run --dry-run` → revisión humana →
`--yes --max-usd`. Si el endpoint es asíncrono, conserva el ID y termina con `task wait`.

## Descubrir antes de ejecutar

```bash
pnpm dataforseo -- catalog info
pnpm dataforseo -- catalog search "google organic live advanced"
pnpm dataforseo -- catalog describe /v3/serp/google/organic/live/advanced
pnpm dataforseo -- catalog list --family ai_optimization --status executable
pnpm dataforseo -- catalog list --status catalog_only
```

`catalog_only` no significa que el proveedor carezca de la ruta. Significa que Greenhouse la conoce pero no la
autoriza todavía; `describe` muestra la razón y el proceso de habilitación. Nunca se elude con `curl` o un SDK.
Para revisar todas las rutas bloqueadas, su posible utilidad y el gate aplicable, usa el
[`registro catalog-only`](../../architecture/GREENHOUSE_DATAFORSEO_CATALOG_ONLY_ENABLEMENT_REGISTER_V1.md). Es un
inventario de evaluación, no una lista de comandos disponibles.

Actualizar y comprobar el snapshot:

```bash
pnpm dataforseo:catalog:sync
pnpm dataforseo:catalog:check
pnpm exec tsx scripts/dataforseo/generate-enablement-register.ts
pnpm exec tsx scripts/dataforseo/generate-enablement-register.ts --check
```

Después de sincronizar el catálogo, regenera el registro y corre `--check`. Si una ruta parece útil, primero define
caso, owner, consumer, fuentes/licencias y costo; después tramita el ADR/delta, registry, migración SQL, entitlement,
estimador, breaker, normalización y canary. No pruebes la ruta con credenciales reales mientras siga
`catalog_only`.

La fuente es `https://docs.dataforseo.com/v3/`: portada concreta + REST WordPress oficial, con digest, ID y fecha
de modificación. DataForSEO no publica un OpenAPI oficial equivalente; el snapshot no se presenta como uno.

## Consultas rápidas

Preview Perú, sin costo:

```bash
pnpm dataforseo -- quick ai-mode \
  --keyword "cuentas para empresas" \
  --market PE \
  --locale es-PE \
  --dry-run
```

El payload debe mostrar `location_code: 2604`, `language_code: es` y `device: desktop`. La etiqueta `Perú` sirve
para UX/prompt; nunca sustituye al identificador del proveedor.

Ejecución de una consulta rutinaria con techo:

```bash
pnpm dataforseo -- quick ai-mode \
  --keyword "cuentas para empresas" \
  --market PE \
  --locale es-PE \
  --max-usd 0.01 \
  --yes \
  --out /tmp/dataforseo-ai-mode.json
```

Otros presets:

```bash
pnpm dataforseo -- quick organic --keyword "pintura para exteriores" --market MX --locale es-MX --dry-run
pnpm dataforseo -- quick keyword-overview --keyword "uno,dos" --market CL --org <uuid> --dry-run
pnpm dataforseo -- quick ranked-keywords --target ejemplo.com --market US --locale en-US --org <uuid> --dry-run
pnpm dataforseo -- quick competitors --target ejemplo.com --market PE --org <uuid> --dry-run
pnpm dataforseo -- quick backlinks --target ejemplo.com --org <uuid> --dry-run
pnpm dataforseo -- quick onpage-instant --target https://example.com --org <uuid> --dry-run
pnpm dataforseo -- quick onpage-audit --target example.com --org <uuid> --max-crawl-pages 100 --dry-run
```

Los presets sin estimador oficial verificable exigen `--estimated-usd` y `--max-usd` al ejecutar. El preview no
los exige y siempre muestra `estimateStatus: unavailable` cuando corresponde; nunca imprime un costo inventado.

### Comparar cualquier marca o entidad en una SERP

La forma corta compara dominios sobre el mismo conjunto de SERPs:

```bash
pnpm dataforseo -- serp-compare \
  --query "iphone 18 pro max" \
  --targets falabella.com,paris.cl \
  --devices desktop,mobile \
  --market CL \
  --depth 20 \
  --load-ai-overview \
  --dry-run
```

No es un comando retail. Para cualquier marca, producto, institución o persona usa un panel con aliases y varios
dominios. Copia
[`dataforseo-serp-compare-panel.example.json`](dataforseo-serp-compare-panel.example.json) y reemplaza las
entidades y consultas. Incluye queries branded y no branded cuando la pregunta lo requiera.

```bash
pnpm dataforseo -- serp-compare \
  --panel docs/manual-de-uso/growth/dataforseo-serp-compare-panel.example.json \
  --dry-run

pnpm dataforseo -- serp-compare \
  --panel /tmp/serp-panel.json \
  --max-usd 0.05 \
  --yes \
  --out /tmp/serp-comparison.json \
  --csv /tmp/serp-comparison.csv
```

El costo se calcula por `queries × devices × bloques de depth`; las entidades no agregan requests porque se
comparan localmente sobre cada respuesta. Organic Live Advanced acepta una task por request, por lo que la CLI
serializa cada query/dispositivo y luego agrega las respuestas. `--load-ai-overview` eleva la estimación del SERP.
El preview debe mostrar `taskCount`, `requestCount`, multiplicadores, mercado y panel antes de confirmar.

Lee la matriz así:

- `organicStatus=observed` habilita `organicRankGroup` y `organicRankAbsolute`; si no, el estado exacto es
  `not_observed_in_captured_organic`, junto con `capturedOrganicCount` y `maxCapturedOrganicRank`.
- `aiMention`, `aiDirectLink` y `aiCitation` son señales diferentes. Una mención sin enlace no es una cita.
- `shoppingObserved` es opcional y sólo aplica cuando el SERP trae esa superficie; no define el modelo.
- `aiOverviewAsyncRequested` indica si el request pidió carga asíncrona. No describe el resultado.
- `aiFreshness=async_provider_result` exige `asynchronous_ai_overview=true` en la respuesta;
  `cached_provider_result` corresponde a `false`, y `not_returned` a ausencia del bloque. Ninguno prueba por sí
  solo la UI de Google en ese instante.
- Revisa `response.requests[]` y `response.taskCodes`: una task fallida no produce filas ni puede interpretarse
  como `not_observed_in_captured_organic`.
- `signals` resume brechas observables para investigación. No demuestra causa: valida crawl, canonical, schema,
  contenido, feeds y cobertura propia antes de convertirla en recomendación.

Para una serie temporal, vuelve a ejecutar el mismo panel y conserva artefactos con fecha. La CLI no agenda ni
repite compras automáticamente. No sobrescribe salidas existentes: `--out` y `--csv` usan creación exclusiva.
No uses un dominio recordado de una conversación para concluir cobertura propia: declara siempre el dominio
canónico en `entities` o `--target`. Una corrida sin ese target sigue siendo válida para leer la categoría, pero
no demuestra presencia ni ausencia de la marca.

Smoke final multidispositivo verificado el 2026-09-28: desktop y mobile se enviaron en dos requests secuenciales,
ambas tasks terminaron en `20000` y el costo total fue USD 0,0055 frente a una estimación conservadora de USD
0,016. Ambas capturas devolvieron `asynchronous_ai_overview=false` pese a haberse pedido carga asíncrona; el
resultado correcto es `cached_provider_result` en los cuatro registros.

### Elegir el carril correcto

| Necesidad                                                | Entrada recomendada                           | Familia / observación                                                |
| -------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| Ver posición y features de una búsqueda                  | `quick organic`                               | SERP live; para lotes recurrentes prefiere task-based mediante `run` |
| Observar Google AI Mode y sus referencias                | `quick ai-mode`                               | SERP con `consumer=aeo`                                              |
| Volumen, intent y dificultad                             | `quick keyword-overview`                      | Labs; DataForSEO es lente estimada                                   |
| Keywords de un dominio / competidores                    | `quick ranked-keywords` / `quick competitors` | Labs                                                                 |
| Keywords relevantes de una URL o host                    | `quick keywords-for-site` / `site-keywords`    | Labs; requiere `--target-kind`; relevancia temática, no posiciones |
| Perfil agregado de enlaces                               | `quick backlinks`                             | Backlinks; usa `run` para referring domains, anchors o link gap      |
| Diagnóstico inmediato de una URL                         | `quick onpage-instant`                        | OnPage live                                                          |
| Crawl técnico completo                                   | `quick onpage-audit` + `task wait`            | OnPage asíncrono; JS/browser multiplican costo                       |
| Tecnologías o WHOIS                                      | `run` después de `catalog search`             | Domain Analytics; no tiene preset dedicado                           |
| Respuestas/citas de ChatGPT, Claude, Gemini o Perplexity | presets `*-response`                          | AI Optimization; modelo vivo obligatorio                             |
| Superficie real de ChatGPT/Gemini                        | presets `*-scraper`                           | AI Optimization Scraper                                              |
| Demanda proxy para preguntas AI                          | `quick ai-keyword-volume`                     | Estimación derivada; no es frecuencia observada en LLMs              |
| Menciones longitudinales                                 | `quick llm-mentions`                          | Cobertura depende de plataforma y mercado                            |

`quick` sólo cubre operaciones frecuentes. Para cualquier otra ruta autorizada usa `catalog describe` y `run`;
no conviertas la ausencia de preset en permiso para usar `curl`.

### Keywords relevantes de una página, dominio o subdominio

`quick keywords-for-site` consulta una sola página de resultados. `site-keywords` consulta exclusivamente
`/v3/dataforseo_labs/google/keywords_for_site/live` y añade paginación acotada, checkpoint/resume y JSON/CSV.
Sirve para preparar o actualizar un brief desde una URL propia o referente, sin seeds ni compras de Overview,
Competitors o SERP. Son **sugerencias relevantes para el contenido**, no keywords por las que la página posiciona.
Para posiciones usa `ranked_keywords`; para consultas realmente observadas de tu propiedad, Search Console.

Declara siempre `--target-kind domain|subdomain|url`; la CLI no adivina el alcance. Para URL exige `https://` o
`www.` (añade `https://`), preserva ruta, trailing slash y query, y rechaza fragmentos, credentials, puertos y
comodines. `domain` y `subdomain` reciben sólo hostname; `domain` no admite prefijo `www.`. Los targets de host
envían `include_subdomains:false` para no solicitar expansión a subdominios. URL omite ese flag. Esto declara
la petición; no certifica canonicalización ni que el proveedor haya identificado todas las keywords del sujeto.

Preview por URL, sin credenciales, organización ni gasto:

```bash
pnpm dataforseo -- quick keywords-for-site \
  --target-kind url --target https://example.com/articulo \
  --market MX --locale es-MX --limit 100 --dry-run

pnpm dataforseo -- site-keywords \
  --target-kind url --target https://example.com/articulo \
  --market MX --locale es-MX --limit 100 --max-pages 2 --dry-run
```

`--limit` es el máximo comprado **por página**, default 100, rango 1–1000. `--max-pages` del compuesto tiene
default 1 y rango 1–20. Ordena por `relevance,desc`, criterio del proveedor sin score numérico propio. Con
clickstream desactivado, el estimador conservador usa USD 0,012 por request + USD 0,00012 por fila máxima;
100 filas y dos páginas estiman USD 0,048. Los filtros no se cobran por separado. El costo real queda en JSON.

Ejecuta sólo después de revisar el preview, con una organización real y ceiling que cubra el plan:

```bash
pnpm dataforseo -- site-keywords \
  --target-kind url --target https://example.com/articulo \
  --market MX --locale es-MX --limit 100 --max-pages 2 \
  --org <uuid> --max-usd 0.05 \
  --checkpoint /tmp/site-keywords.checkpoint.json --yes \
  --out /tmp/site-keywords.json --csv /tmp/site-keywords.csv
```

Para reanudar, conserva sujeto, tipo, mercado y límites y reemplaza `--checkpoint` por
`--resume /tmp/site-keywords.checkpoint.json`. Usa nuevos nombres `--out`/`--csv`: la CLI crea outputs de forma
exclusiva para preservar evidencia. `--cache-max-age-hours` controla TTL, default 24, rango 1–720 horas.
Cada página nueva revalida entitlement SEO y gasto acumulado + estimación antes del POST; un paso fresco
reutilizado no recompra. El ceiling no es una reserva transaccional dentro del proveedor.

El JSON conserva sujeto solicitado, mercado, `cliVersion`, fuente explícita en `plan.source` (proveedor,
documentación, lente `market_estimate`, semántica `category_relevance`, competencia `google_ads` y fecha de
verificación del precio), timestamp, tasks crudas, costo y
`result.coverage` (`pagesFetched`, `returnedRows`, `totalCount`, `hasMore`, `exhausted`). Una muestra truncada no
se declara exhaustiva. `result.scope` compara sólo `result.target` devuelto: `matched`, `mismatch` o `unreported`.
Un eco del request no es evidencia de scope; un mismatch no genera filas que aparenten relevancia de esa URL.
Más de un bloque de resultado en una página aborta sin combinar alcances. Un único bloque sin target mantiene
`unreported`, sin inventar evidencia de coincidencia.
Un target coincidente no demuestra posición, canonicalización ni calidad editorial.

CSV contiene keywords, métricas, estado de volumen, categorías, estacionalidad, tendencias y task ID; conserva
el JSON compañero para procedencia completa, mercado y alcance. CPC, `competition` y `competitionLevel` son
**métricas publicitarias**, no dificultad SEO. Missing, NULL y cero conservan estados diferentes; no rellenes
métricas ausentes con cero. `searchVolumeState` distingue `value`, `missing`, `null` e `invalid`; un valor
inválido del proveedor se conserva como `searchVolume:null` con estado `invalid`, sin convertirlo en cero.
Las tendencias no son posiciones ni tráfico observado.

Si hay costo desconocido, `actualCostUsd`/`incrementalCostUsd` quedan NULL y el compuesto se detiene. Transporte
fallido, task fallida o pending inesperada, scope divergente y múltiples bloques quedan registrados como barrera
durable en el checkpoint, incluyendo `httpOk`. Antes de reutilizar o recomprar **cualquier** página, `--resume`
revisa todo el checkpoint: una respuesta fallida o con costo desconocido bloquea nuevas compras incluso si venció
el TTL. No renueves el checkpoint ni cambies el TTL para repetir un POST incierto; primero revisa su evidencia.
Cambiar flags no elimina la incertidumbre de si el proveedor aceptó o cobró. Un resultado parcial no se presenta
como plan completado. Con `--out` o `--csv`, stdout entrega un recibo compacto; el JSON guarda las tasks crudas.

Contrato oficial verificado el 2026-09-30:
[Keywords for Site](https://docs.dataforseo.com/v3/dataforseo_labs-google-keywords_for_site-live/) y
[precios Labs Google](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api).
La [prueba live Berel México del 2026-09-30](../../audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md#corrección-de-mercado-del-operador--berel-méxico)
validó resultados reales, dos páginas, JSON/CSV y resume sin recompra. Las sugerencias incluyeron ruido de
hoteles y bancos: revisa cada candidata frente al contenido y objetivo del brief. `totalCount` es metadata del
proveedor; no lo traduzcas a keywords propias ni demanda del cliente, ni compres más páginas sólo por ese valor.

Para repetir el caso de Berel, confirma **México (`MX`, location `2484`) / español** y la URL exacta antes de
comprar. La comparación inicial en Chile queda como antecedente; no sustituye el mercado solicitado por el
cliente. No atribuyas `berelmexico.com` a `berel.com` sin verificar su relación.

```bash
pnpm dataforseo -- site-keywords \
  --target-kind url --target https://berel.com/ubica-tienda \
  --market MX --locale es-MX --limit 10 --max-pages 2 --dry-run
```

Este preview reproduce el plan, sin repetir el gasto. Para analizar «mejor pinturería de México», usa SERP como
una captura separada de `site-keywords`: distingue la visibilidad recibida de una valoración objetiva de la
mejor tienda y limita cualquier ausencia al bloque orgánico efectivamente capturado.

### Keyword research compuesto

`research` encadena descubrimiento, enriquecimiento y validación sin bajar todo el universo a SERP. Por defecto
usa Suggestions + Related; agrega Keywords for Site y Competitors cuando recibe `--target`. `keyword_overview`
enriquece hasta 700 candidatas y SERP Standard valida sólo las finalistas aprobadas. Live y AI Overview son
opt-in.

```bash
pnpm dataforseo -- research \
  --keyword "seo con ia,visibilidad en chatgpt" \
  --market CL \
  --target efeoncepro.com \
  --limit 50 \
  --candidate-limit 500 \
  --serp-limit 10 \
  --serp-mode standard \
  --page-size 100 \
  --max-pages 2 \
  --dry-run
```

El preview muestra el plan, el modo SERP, el checkpoint editorial y una estimación conservadora. La ejecución
exige un checkpoint persistente, porque un POST aceptado nunca se vuelve a enviar automáticamente:

```bash
pnpm dataforseo -- research \
  --keyword "seo con ia,visibilidad en chatgpt" \
  --market CL \
  --target efeoncepro.com \
  --org <uuid> \
  --max-usd 0.25 \
  --checkpoint /tmp/keyword-research.checkpoint.json \
  --yes \
  --out /tmp/keyword-candidates.json \
  --csv /tmp/keyword-candidates.csv
```

La primera pasada se detiene antes de SERP con `outcome: awaiting_finalist_approval`. Revisa el CSV y crea un
archivo JSON como éste:

```json
[
  {
    "keyword": "agencia seo con ia",
    "intent": "commercial",
    "category": "seo-aeo",
    "businessPriority": 5,
    "existingCoverage": "gap",
    "approved": true
  }
]
```

Reanuda sin recomprar Suggestions, Related ni Overview:

```bash
pnpm dataforseo -- research \
  --keyword "seo con ia,visibilidad en chatgpt" \
  --market CL \
  --target efeoncepro.com \
  --org <uuid> \
  --max-usd 0.25 \
  --resume /tmp/keyword-research.checkpoint.json \
  --finalists-file /tmp/finalistas.json \
  --yes \
  --out /tmp/keyword-research.json \
  --csv /tmp/keyword-research.csv
```

`--approve-ranked-finalists` permite aprobar explícitamente el ranking automático, pero no es implícito en
`--yes`. La tupla de selección prioriza aprobación, intención, categoría, prioridad de negocio y brecha de
cobertura; el volumen sólo desempata después. `--cache-max-age-hours` controla la frescura de métricas reutilizadas.

El CSV final es una matriz auditable: métricas, intención, gobernanza, URLs propias/competidoras, dominios,
features, PAA, presencia/citas de AI Overview y evidencia con endpoint/task/fecha. El JSON conserva además las
respuestas crudas. Missing, `null`, cero, no solicitado, sin datos y error no se colapsan.

Para recuperar una task Standard pendiente, repite el mismo comando con `--resume`; el task ID se guarda justo
después de `task_post`. No vuelvas a ejecutar con un checkpoint nuevo. Usa `--serp-mode live` sólo cuando la
latencia lo justifique y `--load-ai-overview` sólo si el objetivo requiere ese bloque y el preview muestra el
multiplicador.

`--include-ideas` añade `keyword_ideas`, pero sólo debe usarse con seeds de una categoría homogénea: una entidad
dominante puede arrastrar una categoría válida pero ajena. Los límites son muestra y control de costo, nunca una
afirmación de exhaustividad.

#### Flujo productivo para decidir qué redactar

Parte de un conjunto pequeño de seeds que pertenezcan al mismo problema comercial, no de una lista de servicios
sin relación. La primera pasada compra discovery y métricas, pero se detiene antes de SERP. Revisa las candidatas,
descarta marcas ajenas, geografías que no aplican y navegación accidental; luego aprueba una mezcla deliberada de
intenciones comerciales e informativas. Las seeds manuales siempre se conservan dentro de `--candidate-limit`,
aunque el proveedor no devuelva volumen para alguna de ellas.

La validación del 2026-09-28 usó `servicios creativos`, `agencia creativa`, `branding para empresas`,
`producción de contenido` y `diseño de marca`, con Chile/es, `efeoncepro.com`, 100 candidatas y cinco finalistas.
El run terminó en USD 0,22152. La matriz observó volumen estimado 140 para `agencia creativa`, 110 para
`diseño de marca`, 10 para `branding para empresas` y `servicios creativos`, y estado `missing` —no cero— para
`producción de contenido`. Ninguna URL propia apareció en el bloque orgánico capturado de esas cinco SERP.

Ese resultado orienta un backlog, no lo publica ni decide el copy:

1. Landing principal de agencia/servicios creativos: propuesta, capacidades, proceso, evidencia y criterios de
   selección; las PAA observadas preguntan qué es una agencia, cuáles destacan en Chile y cuánto cobra diseño.
2. Página de branding para empresas: estrategia, naming, identidad, sistema y despliegue; el CPC estimado alto
   señala valor comercial posible, no conversión probada.
3. Guía de diseño de marca: proceso, elementos y tipos de branding, conectada a la página de servicio.
4. Página o guía de producción de contenido: definición, tipos, proceso y ejemplos; conserva la demanda como
   desconocida hasta contrastarla con GSC u otra medición.

Con `--out` o `--csv`, stdout muestra sólo un recibo con estado, rutas, conteos y costo. El JSON completo queda en
el archivo. Las rutas usan creación exclusiva; para rematerializar un checkpoint sin gastar, elige nombres nuevos.

### Research en superficies AI

Primero consulta los modelos vivos; el nombre no se hardcodea porque el catálogo rota:

```bash
pnpm dataforseo -- run /v3/ai_optimization/chat_gpt/llm_responses/models --yes
pnpm dataforseo -- run /v3/ai_optimization/claude/llm_responses/models --yes
pnpm dataforseo -- run /v3/ai_optimization/gemini/llm_responses/models --yes
pnpm dataforseo -- run /v3/ai_optimization/perplexity/llm_responses/models --yes
```

Los cuatro GET son gratuitos y no requieren `--org`. Presets de las cuatro capacidades principales:

```bash
pnpm dataforseo -- quick chatgpt-response --prompt "¿Qué marcas recomiendas?" --model <modelo-vivo> --web-search --market CL --dry-run
pnpm dataforseo -- quick gemini-scraper --keyword "mejores agencias digitales" --market MX --dry-run
pnpm dataforseo -- quick ai-keyword-volume --keyword "seo con ia,visibilidad en chatgpt" --market CL --dry-run
pnpm dataforseo -- quick llm-mentions --target ejemplo.com --platform google --market CL --dry-run
```

También existen `claude-response`, `gemini-response`, `perplexity-response` y `chatgpt-scraper`. Las 53 rutas
AI Optimization son accesibles por `run`, incluidos `task_post`, `tasks_ready` y `task_get`. Para ejecutar un
POST real agrega `--org`, `--estimated-usd`, `--max-usd` y `--yes`; el preview no necesita una organización.
`--max-usd` valida la estimación antes de llamar, pero DataForSEO no ofrece un hard cap por request.

`llm_responses` exige `max_output_tokens`. `llm_mentions` exige `platform=chat_gpt|google`: mezclar ambas
plataformas produce escalas y coberturas incomparables. ChatGPT Mentions sólo admite US/en; Google usa el mercado
declarado. AI Keyword Data es un proxy estadístico derivado de búsquedas, no demanda observada dentro de un LLM.

Para una comparación multi-modelo, conserva una fila por plataforma/modelo/mercado/fecha y separa citas observadas
de preguntas propuestas. No mezcles una respuesta de API con la interfaz de consumidor: `llm_responses` y
`llm_scraper` observan superficies distintas. Los `fan_out_queries` y `brand_entities` del proveedor son evidencia
para análisis de entidades; no son un score propio de Greenhouse.

`ai-research` automatiza ese panel sin mezclar las superficies. Copia
[`dataforseo-ai-research-panel.example.json`](dataforseo-ai-research-panel.example.json), consulta los `/models`
gratuitos y reemplaza cada modelo antes del preview. Cada lane declara su estimación por task porque el pricing
depende del endpoint y modelo.

```bash
pnpm dataforseo -- ai-research \
  --panel /tmp/panel-ai.json \
  --dry-run

pnpm dataforseo -- ai-research \
  --panel /tmp/panel-ai.json \
  --org <uuid> \
  --max-usd 0.25 \
  --checkpoint /tmp/panel-ai.checkpoint.json \
  --yes \
  --out /tmp/panel-ai.json.out \
  --csv /tmp/panel-ai.csv
```

El resultado separa `result.api` de `result.consumer` y normaliza query, plataforma, modelo, mercado, respuesta,
citas, `fanOutQueries`, `brandEntities`, menciones, task IDs, costo y procedencia. `--resume` reutiliza únicamente
requests con el mismo digest de panel, organización y TTL. Este comando es research local, no el pipeline
recurrente de TASK-1651-B.

## Endpoint genérico

```bash
pnpm dataforseo -- run post:serp.google.organic.live.advanced \
  --file /tmp/tasks.json \
  --dry-run

printf '[{"keyword":"efeonce","location_code":2152,"language_code":"es"}]' | \
  pnpm dataforseo -- run /v3/serp/google/organic/live/advanced --stdin --dry-run
```

El input puede ser objeto o arreglo. `--out` crea un archivo nuevo y falla si ya existe para no sobrescribir
evidencia. La salida JSON conserva fecha, superficie, endpoint, organización si existe, task IDs/status, costo,
latencia y respuesta.

Flags comunes:

| Flag                  | Efecto                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------- |
| `--dry-run`           | Genera preview sin llamar al proveedor                                                 |
| `--yes`               | Confirma ejecución; sin este flag una operación pagada sigue en preview                |
| `--org <uuid>`        | Atribuye gasto y habilita entitlement; obligatorio para POST no-SERP y para `research` |
| `--consumer seo\|aeo` | Clasifica el gasto; los presets eligen el valor coherente, `run` permite declararlo    |
| `--estimated-usd <n>` | Estimación explícita cuando no existe calculador verificable                           |
| `--max-usd <n>`       | Ceiling de preflight; no limita el cargo dentro del proveedor                          |
| `--timeout-ms <n>`    | Timeout de transporte                                                                  |
| `--out <ruta>`        | Escribe el artefacto JSON con creación exclusiva                                       |

Antes de un `run`, comprueba los campos obligatorios con `catalog describe`. La validación local comprueba forma
básica, requireds y batch limit; el proveedor sigue siendo la autoridad sobre enums, condiciones y formas anidadas.

## Tasks asíncronas

1. Ejecuta `task_post` una sola vez y conserva el ID.
2. Consulta `tasks_ready` o el `task_get` descrito en el catálogo.
3. Para polling acotado:

```bash
pnpm dataforseo -- task wait <id-del-endpoint-task-get> \
  --task-id <uuid-provider> \
  --timeout-ms 120000 \
  --poll-ms 5000
```

El polling sólo hace GET. Nunca repite `task_post`. Códigos `20100`, `40601` y `40602` son `pending`; `20000`
es éxito; `>=40000` distinto de los pendientes es error de task. HTTP 200 por sí solo no prueba éxito.

## Exit codes

| Código | Significado                                        |
| -----: | -------------------------------------------------- |
|      0 | éxito o preview válido                             |
|      2 | uso/payload/validación inválida                    |
|      3 | bloqueado por allowlist, entitlement o presupuesto |
|      4 | error de task del proveedor                        |
|      5 | error HTTP/transporte                              |
|      6 | task exitosa sin datos                             |
|      7 | task pendiente                                     |

## Cobertura

| Plano                       |                       Cobertura 2026-09-28 |
| --------------------------- | -----------------------------------------: |
| Inventario oficial          |                              545 endpoints |
| SERP ejecutable             |                                        160 |
| Labs ejecutable             |                                         45 |
| Backlinks ejecutable        |                                         22 |
| OnPage ejecutable           |                                         28 |
| Domain Analytics ejecutable |                                         12 |
| AI Optimization ejecutable  |                                         53 |
| Otras familias              | catalogadas; ejecución bloqueada con razón |

La cifra cambia cuando cambia la documentación. Ejecuta `catalog:sync`, revisa el diff y no conviertas un cambio
de catálogo en ampliación de autorización.

## Limitaciones y estado operativo

- `--max-usd` frena cada siguiente request contra costo real acumulado + estimación incremental. Sigue sin ser un
  hard cap transaccional dentro de DataForSEO: una respuesta individual puede costar más de lo estimado.
- Checkpoints y cache son locales. Debes protegerlos como evidencia operativa y conservar el mismo archivo para
  reanudar; cambiar plan, panel u organización falla cerrado.
- La paginación está acotada por `--max-pages`; una muestra sigue sin demostrar exhaustividad.
- El ranking de finalistas es una ayuda determinista, no una decisión editorial ni un score de oportunidad.
- Standard reduce costo de lotes, pero puede quedar pending y requerir `--resume`.
- La CLI cataloga endpoints fuera del allowlist, pero no puede ejecutar Keywords Data, Trends, Content Analysis,
  Business Data u otras familias sin una ampliación gobernada.
- `ai_optimization` está integrado y el CHECK quedó aplicado y validado el 2026-09-28. Un canary API con techo
  USD 0,012 costó USD 0,0101 y dejó una llamada `consumer=aeo`, `cost_basis=invoiced` en el ledger. Repetirlo con
  `--resume` reutilizó el checkpoint sin costo incremental. Esta evidencia no certifica cada modelo ni la consumer
  surface: usa preview, consulta `/models` y mantén un techo explícito para cada nueva combinación.
- No existe captura recurrente AI, snapshot, reader, MCP ni cron por el solo hecho de que la CLI pueda ejecutar una
  ruta. Esos consumers pertenecen al rollout de `TASK-1651-B`.
