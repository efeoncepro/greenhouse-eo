# Research SEO y AI con DataForSEO

## Para qué sirve

La CLI DataForSEO es la superficie local gobernada para investigar demanda orgánica, SERP y presencia en
superficies de IA sin construir llamadas aisladas al proveedor. Permite preparar un plan sin costo, decidir qué
keywords justifican análisis SERP y conservar evidencia reproducible en JSON, CSV y checkpoints.

El contrato técnico vive en
[`GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md`](../../architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md)
y los pasos de operación en [`dataforseo-cli.md`](../../manual-de-uso/growth/dataforseo-cli.md).
La batería pagada y sus límites de evidencia están consolidados en la
[auditoría productiva del 2026-09-28](../../audits/seo/2026-09-28-dataforseo-cli-production-validation.md).
Las rutas conocidas pero todavía no autorizadas viven en el
[`registro catalog-only`](../../architecture/GREENHOUSE_DATAFORSEO_CATALOG_ONLY_ENABLEMENT_REGISTER_V1.md).

## Flujos disponibles

### Identidad y evolución de la herramienta

La CLI tiene una versión SemVer independiente de Greenhouse. `pnpm dataforseo -- version` muestra la vigente y
`--json` entrega el historial completo. Los recibos JSON incluyen `cliVersion`, de modo que una observación puede
atribuirse al contrato que la produjo. El registro canónico vive en `data/dataforseo/cli-versions.json`.

Una capacidad compatible incrementa `minor`; un fix o guardrail compatible incrementa `patch`; un cambio que
rompe comandos, flags, outputs o checkpoints incrementa `major`. Las correcciones puramente editoriales no crean
releases vacías. El digest gateado obliga a registrar cualquier cambio material en las fuentes de la CLI.

### Relevancia de keywords por URL o host

`quick keywords-for-site` permite una consulta de relevancia; `site-keywords` añade muestra paginada y
reanudable con JSON/CSV. El sujeto se declara como `domain`, `subdomain` o `url` mediante `--target-kind`, sin
inferirlo de la cadena. La URL conserva path, query y trailing slash; exige `https://` o prefijo `www.`.
Hosts piden `include_subdomains:false` para no solicitar expansión; URL omite el flag.

La operación sólo compra Keywords for Site. No pide seeds, Overview, Competitors ni SERP y no altera el
research compuesto existente. Devuelve sugerencias relevantes para preparar briefs o revisar contenido;
no prueba posiciones de la URL. CPC y competencia son métricas publicitarias. Search Console conserva la
verdad de consultas observadas, y `ranked_keywords` el papel de posiciones estimadas del proveedor.

Preview libre de gasto, ejecución con org/entitlement SEO/ceiling y checkpoint tenant-safe siguen el mismo
contrato de la CLI. Scope retornado, cobertura parcial y ausencia/error se declaran explícitamente. El CSV
viaja con su JSON para conservar fuente, mercado, sujeto, fecha, versión, tasks y costo. La capacidad es local;
no crea capturas recurrentes, writer productivo ni flags. `plan.source` declara proveedor, URL documental,
lente de mercado, semántica de relevancia y significado Ads de competencia. Volumen `invalid`, NULL, missing y
cero permanecen distintos. Un checkpoint con costo desconocido, fallo de transporte/task, scope divergente o
múltiples bloques no reabre compras al vencer el TTL: la barrera se revisa antes de cualquier página, para evitar
repetir un POST incierto. `httpOk` queda durable; costos desconocidos se reportan NULL. Los artefactos guardan
raw y stdout se vuelve compacto con `--out`/`--csv`. La
[prueba live de Berel México](../../audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md#corrección-de-mercado-del-operador--berel-méxico)
validó filas reales, paginación y reutilización; el ruido observado exige revisión editorial. El `totalCount`
del proveedor no representa keywords exclusivas ni demanda del sujeto.

Mercado, idioma y sujeto se confirman contra el brief antes de comprar. Para Berel, el caso corregido usa
México (`MX`/`2484`) y español; Chile queda como antecedente separado. Un hostname parecido no acredita la
propiedad del sitio ni permite sumar su visibilidad al dominio confirmado.

### Research SEO/SERP

`research` combina descubrimiento de keywords, métricas, cobertura propia, competidores y SERP. Antes de comprar
SERP exige una decisión explícita sobre los finalistas. La salida estructurada conserva intención declarada,
categoría, prioridad de negocio, cobertura existente, URLs propias y competidoras, features, PAA, AI Overview,
citas y procedencia por keyword.

SERP Standard es el modo predeterminado para lotes. Live y AI Overview requieren opt-in porque cambian costo y
latencia. El ranking determinista ayuda a revisar candidatos, pero no reemplaza el criterio editorial.

### Research AI

`ai-research` consume un panel versionado que puede incluir LLM Responses, LLM Scraper, AI Keyword Data y LLM
Mentions. La salida separa resultados obtenidos por API de observaciones de consumer surface y normaliza query,
plataforma, modelo, mercado, fecha, respuesta, citas, fan-out, entidades, menciones, task IDs y costo.

La disponibilidad de una ruta no demuestra cobertura universal: modelo, plataforma, idioma y mercado deben quedar
declarados. Mentions, Scraper y Responses observan productos distintos y no son intercambiables.

### Comparación de marcas o entidades en SERP

`serp-compare` ejecuta un panel reproducible de consultas y dispositivos y reutiliza cada SERP para todas las
entidades comparadas. Sirve de forma transversal para empresas, productos, instituciones, personas o retailers:
la entidad se define por nombre, aliases y uno o más dominios. La salida JSON conserva el raw y la matriz; CSV
facilita el análisis.

Orgánico, mención textual en AI Overview, enlace directo, cita formal y Shopping son dimensiones distintas.
Shopping sólo aparece si el SERP lo trae. “No observado” se limita al bloque orgánico y profundidad capturados;
no significa ausencia en Google ni autoriza inferir la siguiente posición. Una task fallida no genera filas de
entidades: queda como error del proveedor en el raw. La intención de pedir carga asíncrona se conserva en
`aiOverviewAsyncRequested`, mientras `aiFreshness` describe sólo lo devuelto por el proveedor. Las señales de
brecha son hipótesis para crawl, contenido, schema, canonicals o feeds; requieren validación sobre la propiedad
antes de recomendar cambios.

Organic Live Advanced acepta una task por request. La CLI serializa dispositivos y agrega el resultado en un solo
artefacto; el preview muestra tanto `taskCount` como `requestCount`. Esta serialización no cambia la economía por
entidad: todas las entidades se comparan localmente sobre la misma captura de cada query/dispositivo.

## Gobernanza y estados

- Preview no compra: muestra requests, superficies y estimación.
- Cada POST nuevo exige organización, entitlement del carril correcto y techo USD.
- `research` usa presupuesto SEO; `ai-research` usa presupuesto AEO y registra `consumer=aeo`.
- El checkpoint está ligado a organización y fingerprint. `--resume` reutiliza pasos vigentes y task IDs; un plan
  distinto falla cerrado.
- El costo se revalida antes de cada POST usando gasto real acumulado más la estimación del siguiente paso.
- En operaciones divididas en varios requests, el artefacto conserva `response.requests[]`; un request rechazado
  nunca se normaliza como “no observado”.
- La CLI sólo ejecuta las familias autorizadas. El catálogo puede describir rutas que siguen bloqueadas.

## Capacidades que podrían habilitarse

El catálogo vigente deja 225 rutas bloqueadas: 216 pertenecen a familias de producto y 9 son infraestructura o
plantillas documentales. No son herramientas disponibles ni un roadmap comprometido. El registro exhaustivo
conserva método, path, propósito eventual y gate de cada una.

- `content_analysis` (10) podría servir para menciones web, sentimiento y tendencias de marca.
- `business_data` (52) podría apoyar SEO local, listings, reviews, Q&A y reputación por fuente.
- `keywords_data` (74) podría complementar paid media, estacionalidad y clickstream; Labs sigue siendo el default
  para research orgánico.
- `merchant` (40) podría habilitar inteligencia de Google Shopping y Amazon para clientes e-commerce.
- `app_data` (40) podría habilitar ASO, charts, fichas y reviews cuando exista un caso de producto móvil.

Las 9 restantes no se habilitan como producto: Appendix requiere contratos de infraestructura explícitos y las
plantillas `$path`/`$path.ai` son artefactos del extractor. Cualquier familia nueva exige una decisión separada;
su presencia en este registro no autoriza llamadas, gasto ni exposición en la CLI.

## Qué no entrega

La CLI no crea una estrategia editorial por sí sola, no certifica exhaustividad de una muestra paginada y no
convierte una observación AI en medición recurrente. Snapshots, readers, MCP, cron y series SoV pertenecen a
`TASK-1651-B`. Tampoco autoriza publicación ni amplía el allowlist a las demás familias del proveedor.

## Estado verificado

El 2026-09-30, TASK-1948 agregó la capacidad local `site-keywords` / `quick keywords-for-site` en CLI 1.1.0.
Verificación: 96 tests en nueve archivos (23 de integración), lint propio, digest y dry-run URL/domain/subdomain.
Typecheck del proyecto heredado excluyendo sólo `ai-generations` WIP ajeno pasó; el global conserva 17 errores
en ese WIP. La [auditoría local](../../audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md) registra
barreras de gasto/resume, scope, parser query y límites de evidencia. Después del cierre local se ejecutó la
prueba pagada de Berel México, reconciliada con el ledger: resultados reales y paginación/resume verificados.
La auditoría conserva cifras, recibos y límites de esa muestra. La selección editorial y el contraste con
contenido/GSC siguen siendo necesarios; la prueba no activa capturas productivas ni despliegue.


El 2026-09-28 quedó aplicado y validado el CHECK de `ai_optimization`. Un canary API con techo USD 0,012 costó
USD 0,0101 y produjo una sola imputación `consumer=aeo`, `cost_basis=invoiced`; su repetición con el mismo
checkpoint reutilizó el resultado sin otra llamada ni costo incremental. Esta evidencia valida el carril API
gobernado, no todas las combinaciones de modelos ni la consumer surface.

El mismo día, el smoke final multidispositivo de `serp-compare` para Falabella y Paris completó dos requests
secuenciales con tasks `20000` y costo total real USD 0,0055. La estimación previa fue USD 0,016; la diferencia no
se usa para recalibrar precios automáticamente. Ambas capturas devolvieron `asynchronous_ai_overview=false`,
aunque se pidió carga asíncrona. Esto valida la separación entre intención del request y frescura observada, no un
ranking estable de ninguna marca.

También se validó el flujo editorial transversal con cinco seeds de servicios creativos, Chile/es y
`efeoncepro.com`. El run `e2689fbf-9946-4954-b705-16a888495218` produjo 100 candidatas, exigió aprobación de
cinco finalistas y completó SERP Standard + competidores por USD 0,22152. La prueba detectó y corrigió tres clases
de defecto: las seeds sin volumen ya no pueden caer fuera de `candidateLimit`; PAA reconoce la estructura anidada
`people_also_ask_element` sin incorporar títulos de respuestas expandidas; y la CLI cierra PostgreSQL al terminar.
Cuando existe `--out` o `--csv`, stdout entrega un recibo compacto y conserva el raw sólo en el artefacto.

La evidencia resultante distingue volumen `missing` de cero, intención estimada del proveedor de intención
declarada por el operador y ausencia en el bloque orgánico capturado de ausencia total en Google. El checkpoint
reutilizó discovery y tasks Standard al rematerializar la matriz corregida, sin costo incremental.

La misma auditoría documenta las consultas `agencia seo en chile` y `agencia creativa en chile`. En ambos casos
el reporte inicial revisó `efeonce.org`, no el dominio canónico `efeoncepro.com`, y la corrida no recibió un target
propio. Por tanto, esos snapshots sirven para observar la categoría, competidores, local pack, PAA y AI Overview,
pero no para afirmar presencia o ausencia de Efeonce.
