# Research SEO y AI con DataForSEO

## Para qué sirve

La CLI DataForSEO es la superficie local gobernada para investigar demanda orgánica, SERP y presencia en
superficies de IA sin construir llamadas aisladas al proveedor. Permite preparar un plan sin costo, decidir qué
keywords justifican análisis SERP y conservar evidencia reproducible en JSON, CSV y checkpoints.

El contrato técnico vive en
[`GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md`](../../architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md)
y los pasos de operación en [`dataforseo-cli.md`](../../manual-de-uso/growth/dataforseo-cli.md).
Las rutas conocidas pero todavía no autorizadas viven en el
[`registro catalog-only`](../../architecture/GREENHOUSE_DATAFORSEO_CATALOG_ONLY_ENABLEMENT_REGISTER_V1.md).

## Flujos disponibles

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
no significa ausencia en Google ni autoriza inferir la siguiente posición. Sin carga asíncrona explícita, el AI
Overview se etiqueta como resultado cacheado por el proveedor. Las señales de brecha son hipótesis para crawl,
contenido, schema, canonicals o feeds; requieren validación sobre la propiedad antes de recomendar cambios.

## Gobernanza y estados

- Preview no compra: muestra requests, superficies y estimación.
- Cada POST nuevo exige organización, entitlement del carril correcto y techo USD.
- `research` usa presupuesto SEO; `ai-research` usa presupuesto AEO y registra `consumer=aeo`.
- El checkpoint está ligado a organización y fingerprint. `--resume` reutiliza pasos vigentes y task IDs; un plan
  distinto falla cerrado.
- El costo se revalida antes de cada POST usando gasto real acumulado más la estimación del siguiente paso.
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

El 2026-09-28 quedó aplicado y validado el CHECK de `ai_optimization`. Un canary API con techo USD 0,012 costó
USD 0,0101 y produjo una sola imputación `consumer=aeo`, `cost_basis=invoiced`; su repetición con el mismo
checkpoint reutilizó el resultado sin otra llamada ni costo incremental. Esta evidencia valida el carril API
gobernado, no todas las combinaciones de modelos ni la consumer surface.
