# DataForSEO Operator CLI Decision V1

> Status: Accepted · 2026-09-28
> Owner: Growth SEO / Platform
> Task: `TASK-1935`

Vista funcional: [`dataforseo-research-cli.md`](../documentation/growth/dataforseo-research-cli.md). Manual:
[`dataforseo-cli.md`](../manual-de-uso/growth/dataforseo-cli.md).
Registro de rutas todavía no autorizadas:
[`GREENHOUSE_DATAFORSEO_CATALOG_ONLY_ENABLEMENT_REGISTER_V1.md`](GREENHOUSE_DATAFORSEO_CATALOG_ONLY_ENABLEMENT_REGISTER_V1.md).

## Context

Greenhouse ya posee un transporte DataForSEO con auth, breaker, allowlist y spend ledger, pero no una entrada de
terminal. El proveedor no publica un OpenAPI reutilizable: su documentación v3 está compuesta por páginas
WordPress parametrizadas. La portada oficial sí enumera las páginas concretas y el REST oficial conserva ID y
fecha de modificación de sus plantillas.

La herramienta debe servir a personas y agentes sin crear una segunda integración: descubrir capacidades,
previsualizar payloads y costo, ejecutar una ruta gobernada, recuperar tasks asíncronas y componer research de
keywords. Inventario oficial, autorización Greenhouse y disponibilidad runtime son tres planos distintos.

## Decision

1. `src/lib/ai/dataforseo.ts` sigue siendo el único transporte. Gana `requestDataForSeo` para GET y POST;
   `postDataForSeoTask` permanece compatible.
2. POST tiene un solo intento. GET admite hasta tres intentos ante 429/5xx, con backoff acotado y el mismo breaker.
3. `scripts/dataforseo/generate-catalog.ts` deriva un snapshot versionado desde el REST y las páginas concretas
   enlazadas por la portada oficial. No se inventa un OpenAPI.
4. El snapshot distingue `official inventory` de `executable coverage`. Las seis familias del allowlist pueden
   ejecutarse; TASK-1651-A agrega `ai_optimization` con el mismo CHECK del ledger y paridad TS↔SQL.
5. La CLI es server-only y local. Research SEO consume `enforceSeoRunEntitlement`; research AI consume
   `resolveAeoBudget`. Nunca fabrica una organización. Sin `--yes` opera como preview. Todo POST pagado exige un
   ceiling y una estimación verificable o declarada.
6. El lifecycle asíncrono separa submit, pending y result. Polling nunca resubmite el POST original.
7. Los GET de catálogo, modelos y polling no crean gasto y pueden operar sin organización. Todo POST de
   `ai_optimization` exige organización, entitlement y `consumer='aeo'`; el preview sigue siendo libre de org.
8. LLM Responses exige `max_output_tokens`; LLM Mentions exige `platform` explícita. `--max-usd` valida el plan y,
   antes de cada POST nuevo, compara costo real acumulado + estimación incremental. No se presenta como hard cap
   transaccional dentro del proveedor.
9. Los comandos compuestos persisten un checkpoint versionado por `runId`, organización y fingerprint. Cada
   request aceptado se registra antes del siguiente; reanudar nunca vuelve a comprar un paso fresco idéntico.
10. El gasto compuesto se gobierna progresivamente: antes de cada POST se compara costo real acumulado más la
    estimación incremental contra el ceiling y se reconsulta entitlement.
11. `research` usa SERP task-based Standard por defecto. Live y AI Overview son opt-in. `--yes` confirma gasto,
    pero la selección SERP exige además un archivo de finalistas o aprobación explícita del ranking automático.
12. `ai-research` consume un panel versionado y conserva separadas las lanes API y consumer surface. Normaliza
    citas, fan-out, entidades y resultados por plataforma sin crear el data product recurrente de TASK-1651-B.
13. Las rutas `catalog_only` se documentan mediante un registro generado desde el mismo snapshot. El registro
    clasifica su valor eventual y su gate, pero no amplía el allowlist ni convierte inventario en autorización.
14. `serp-compare` compara marcas o entidades transversales sobre una sola captura por query/dispositivo. Un panel
    puede declarar nombre, aliases y varios dominios; retail es sólo un caso. Orgánico, mención, enlace AI, cita AI
    y Shopping permanecen señales separadas. Un target no observado conserva el depth capturado y nunca recibe
    una posición fabricada. Organic Live Advanced admite una sola task por request: la CLI serializa esas tasks,
    pero sigue comprando una sola captura por query/dispositivo y no una por entidad.
15. La intención de pedir AI Overview asíncrono y la frescura devuelta son hechos distintos. La matriz conserva
    `aiOverviewAsyncRequested`; `aiFreshness` se deriva exclusivamente de la respuesta como
    `async_provider_result`, `cached_provider_result` o `not_returned`. Una task fallida conserva su código y raw,
    pero no produce filas que aparenten una ausencia orgánica.

## Technical architecture

```text
documentación oficial DataForSEO
        │ catalog:sync/check
        ▼
data/dataforseo/endpoints.v3.json
        │
        ├── catalog search/list/describe
        ├── quick ── presets + market resolver
        ├── run ──── payload JSON genérico
        ├── task wait ── GET acotado, nunca resubmit
        ├── research ─── Labs paginado → checkpoint editorial → SERP Standard → matriz
        ├── serp-compare ─ panel de entidades → SERP Live compartido → matriz JSON/CSV
        └── ai-research ─ panel versionado → API lanes + consumer lanes → matriz
                         │                         │
                         └──── checkpoint + costo progresivo
                                                   │
                         ▼
               requestDataForSeo
          allowlist · auth · breaker · cost
                         │
              entitlement + spend ledger
```

### Components and ownership

| Component                                                      | Responsibility                                                                                                          |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `scripts/dataforseo/generate-catalog.ts`                       | Lee REST WordPress y documentación renderizada oficiales, normaliza rutas v3 concretas y escribe/comprueba el snapshot. |
| `scripts/dataforseo/generate-enablement-register.ts`           | Genera y comprueba el registro exhaustivo de rutas `catalog_only`, propósito eventual y postura de habilitación.        |
| `data/dataforseo/endpoints.v3.json`                            | Inventario versionado con digest, método, path, campos, modo y estado ejecutable. Es evidencia, no autorización.        |
| `GREENHOUSE_DATAFORSEO_CATALOG_ONLY_ENABLEMENT_REGISTER_V1.md` | Backlog trazable de rutas no autorizadas; no es allowlist ni roadmap comprometido.                                      |
| `src/lib/ai/dataforseo-catalog.ts`                             | Loader tipado, búsqueda y mapeo de la familia del proveedor al allowlist cerrado de Greenhouse.                         |
| `src/lib/ai/dataforseo-cli-presets.ts`                         | Builders pequeños para operaciones frecuentes; la identidad de mercado sale de `src/lib/growth/markets`.                |
| `src/lib/ai/dataforseo-keyword-research.ts`                    | Plan, estimación, payloads, extracción/deduplicación y CSV del flujo compuesto de keywords.                             |
| `src/lib/ai/dataforseo-research-checkpoint.ts`                 | Fingerprints, runId, cache con TTL, resume tenant-safe y escritura atómica de pasos/tasks/costo.                        |
| `src/lib/ai/dataforseo-ai-research.ts`                         | Contrato de panel AI, requests por lane y matriz normalizada API vs consumer surface.                                   |
| `src/lib/ai/dataforseo-serp-compare.ts`                        | Panel transversal de entidades, estimación, normalización multiseñal y CSV de comparación SERP.                         |
| `scripts/dataforseo/cli.ts`                                    | Orquestación local, preview, confirmación, validación, preflight de entitlement, outcomes y artefactos.                 |
| `src/lib/ai/dataforseo.ts`                                     | Transporte único: credenciales, prefijo, timeout, retry, breaker y notificación de costo.                               |
| `src/lib/growth/seo/entitlement.ts`                            | Decisión de quota y presupuesto por organización antes del gasto.                                                       |
| `src/lib/growth/seo/register-provider-spend.ts`                | Registra el recorder del ledger; la CLI lo importa en el entrypoint.                                                    |

La CLI consume estos contratos. No es dueña de credenciales, autorización de familias, política de presupuesto ni
persistencia productiva.

## Command and execution contracts

### Catalog

`catalog info|list|search|describe` sólo lee el snapshot. `catalog_only` significa que la ruta existe en el
inventario oficial pero Greenhouse no autorizó su familia. `dataforseo:catalog:sync` refresca la fuente oficial;
`dataforseo:catalog:check` detecta drift sin convertir una ruta nueva en autorización.

### Quick and run

`quick` construye payloads para operaciones frecuentes de SERP, Labs, Backlinks, OnPage y AI Optimization. `run`
acepta ID/path y JSON objeto o arreglo, y permite alcanzar cualquier ruta catalogada sin mantener cientos de ramas.
Ambos convergen en el mismo `execute` y transporte.

El validador local comprueba requireds extraídos, batch limit y dos invariantes AI de alto riesgo:
`max_output_tokens` para LLM Responses y `platform` para LLM Mentions. No se presenta como validador OpenAPI:
parámetros condicionales, enums y formas anidadas siguen siendo contrato del proveedor visible en `describe`.

### Task lifecycle

`task wait` reemplaza `{id}`/`$id` o agrega el ID a un path task-get, y hace polling GET acotado. Los códigos
`20100`, `40601` y `40602` son pending; `20000` es éxito; los demás `>=40000` son errores de task. El polling
nunca repite `task_post`. GET puede reintentar 429/5xx; POST tiene un intento porque el timeout puede llegar después
de que el proveedor aceptó y cobró.

### Composed research

`research` es un orquestador local, no un endpoint nuevo. Ejecuta Suggestions y Related paginados, permite Ideas
de forma explícita y, con target, agrega Keywords for Site y Competitors. Deduplica candidatas, enriquece con
Keyword Overview y se detiene para aprobación editorial antes de comprar SERP.

La selección visible prioriza aprobación, intención, categoría, prioridad de negocio y brecha de cobertura; el
volumen queda al final. El operador entrega un archivo de finalistas o confirma expresamente el ranking automático.
SERP usa Standard (`task_post` + `task_get/advanced`) por defecto, persiste IDs antes del polling y nunca resubmite.
Live y AI Overview requieren flags explícitos.

El JSON conserva raw tasks. El CSV es una matriz con métricas, gobernanza, URLs propias/competidoras, dominios,
SERP features, PAA, AI Overview/citas y provenance. No se afirma un score de oportunidad ni se confunde ausencia,
no solicitado, sin datos y error.

`ai-research` ejecuta un panel versionado de Responses, Scraper, AI Keyword Data y Mentions. API y consumer
surface son lanes separadas. La matriz normaliza query, plataforma, modelo, mercado, citas, `fan_out_queries`,
`brand_entities`, menciones, task IDs, costo y evidencia; el JSON conserva raw. Es tooling local, no schema,
writer, reader, MCP, worker ni schedule de TASK-1651-B.

### Comparación transversal de marcas y entidades

`serp-compare` recibe consultas, dispositivos y entidades. La forma corta `targets` acepta dominios; la forma
completa `entities` declara `id`, `label`, `domains[]` y `aliases[]`. Una marca puede tener varios dominios y una
consulta puede ser branded o no branded. La cantidad de requests es `queries × devices`, no se multiplica por
entidades: todas se evalúan localmente sobre el mismo SERP.

La matriz mantiene por separado `rank_group`, `rank_absolute`, mención textual, enlace directo de AI Overview,
cita formal y Shopping. Shopping es opcional y no condiciona el modelo. `not_observed_in_captured_organic`
significa sólo que la entidad no apareció entre los orgánicos devueltos; reporta además cantidad y máximo rank
capturados. Una task con status distinto de `20000` no produce filas normalizadas: el error queda en `taskCodes`
y en las tasks crudas. Así, un rechazo del proveedor nunca se convierte en una falsa ausencia competitiva.

Organic Live Advanced acepta una task por request. Para paneles multidispositivo, `serp-compare` envía requests
secuenciales de una task, agrega sus respuestas y expone `requestCount`, `requestBatchSize` y `response.requests[]`.
Antes de cada request reevalúa el techo con costo observado más estimación incremental. El número de capturas
sigue siendo `queries × devices`, no `queries × devices × entities`.

`aiOverviewAsyncRequested` registra la intención del request. `aiFreshness` registra lo realmente devuelto:
`async_provider_result` sólo cuando el bloque incluye `asynchronous_ai_overview=true`, `cached_provider_result`
cuando devuelve `false`, y `not_returned` cuando no existe bloque. Pedir carga asíncrona no autoriza a rotular el
resultado como asíncrono. Las señales derivadas son observaciones para priorizar una auditoría, no causalidad ni
estrategia. Repetir el panel en otra fecha crea otra muestra; la CLI no agenda ni compra repeticiones silenciosas.

## Authorization, cost and tenancy

- El registry ejecutable está cerrado a `serp`, `labs`, `backlinks`, `onpage`, `domain` y `ai_optimization`.
- Todo POST fuera de SERP exige `organizationId`; SERP permite prospectos públicos sin org. Si existe org, el
  recorder de gasto es obligatorio para cualquier familia.
- Toda llamada declara `consumer: seo|aeo`; AI Optimization usa `aeo`, y los presets SEO/research usan `seo`.
- La ejecución pagada exige estimación conocida o declarada más `--max-usd`. Los comandos simples comparan antes
  de la llamada; los compuestos vuelven a comparar costo real acumulado + siguiente estimación antes de cada POST.
- Los comandos compuestos reconsultan entitlement antes de cada POST nuevo. Un paso fresco idéntico recuperado del
  checkpoint no vuelve a gastar ni consume otra decisión de entitlement.
- El costo registrado es `cost` de la respuesta completa; no se inventa un costo por task.

## Output and failure contract

El artefacto genérico contiene `queriedAt`, surface, request resuelto, status por task, costo, latencia, breaker,
diagnóstico por request y tasks crudas. `--out` crea en modo exclusivo (`wx`) para no sobrescribir evidencia.
Research puede sumar CSV. Secretos y raw HTTP error bodies no se emiten.

Exit codes estables: `0` éxito/preview válido, `2` uso o validación local, `3` bloqueo de autorización/entitlement/
presupuesto, `4` error de task, `5` HTTP/transporte, `6` éxito sin datos y `7` pending.

## Coverage and runtime state

El snapshot del 2026-09-28 contiene 545 rutas oficiales; 320 caen en las seis familias autorizadas: 160 SERP,
45 Labs, 22 Backlinks, 28 OnPage, 12 Domain Analytics y 53 AI Optimization. Las otras 225 son `catalog_only`:
216 rutas de cinco familias de producto y 9 rutas de infraestructura o plantillas que no son capabilities.
Cobertura significa que la CLI genérica puede enrutar un payload válido por el transporte gobernado; no significa
que cada endpoint tenga preset, estimador específico o smoke pagado.

El registro exhaustivo prioriza `content_analysis` para brand monitoring y `business_data` acotada para SEO local
y reputación. `keywords_data` queda condicional a paid, trends o clickstream cuando Labs no responda la pregunta;
`merchant` y `app_data` permanecen dormant hasta existir un caso e-commerce o app. Esta clasificación facilita una
evaluación futura, pero cada habilitación necesita ADR/delta, owner, consumer, migración del CHECK, entitlement,
cost controls, contrato de datos y canary propio.

`ai_optimization` está operativa en registry, catálogo, transporte y guards. La migración
`migrations/20260928095506879_task-1651-ai-optimization-family.sql` quedó aplicada el 2026-09-28 y el readback
confirmó el constraint validado con las seis familias. Un canary API con techo USD 0,012 costó USD 0,0101 y dejó
una sola fila lógica atribuida a `consumer=aeo` y `cost_basis=invoiced`; reanudar desde el mismo checkpoint tuvo
costo incremental cero y no aumentó `call_count`. Esto certifica la lane API gobernada, no todas las combinaciones
de proveedor/modelo ni la consumer surface. Captura recurrente, schema, readers, MCP y schedules quedan fuera de
la CLI y pertenecen a `TASK-1651-B`.

El canary de regresión de `serp-compare` del 2026-09-28 ejecutó desktop y mobile de `iphone 18 pro max` en Chile
como dos requests secuenciales, ambos con task `20000`, por USD 0,007 reales frente a USD 0,016 de estimación
conservadora. El smoke final repitió el panel con desktop `09281157-1987-0139-0000-77d35f5a773f` y mobile
`09281157-1987-0139-0000-91c4b65ee202`, ambas `20000`, por USD 0,0055. Falabella y Paris se evaluaron sobre cada
captura compartida. Aunque el request pidió carga asíncrona, ambos bloques devolvieron
`asynchronous_ai_overview=false`; la frescura correcta fue `cached_provider_result` en los cuatro registros.

La evidencia completa de Falabella/Paris, las consultas de categoría `agencia seo en chile` y
`agencia creativa en chile`, y el research editorial de servicios creativos vive en la
[auditoría productiva de la CLI](../audits/seo/2026-09-28-dataforseo-cli-production-validation.md). Esa auditoría
también corrige las conclusiones de cobertura que no declararon el dominio canónico como target.

## Known limitations

- La fuente oficial es documentación HTML/WordPress, no OpenAPI; la validación extraída es parcial.
- El pricing no es uniforme. Sin estimador verificable, el operador debe declarar `--estimated-usd`.
- El ceiling progresivo evita iniciar el siguiente request, pero DataForSEO no ofrece un hard cap transaccional
  dentro de un request ya aceptado.
- Cache/checkpoints son artefactos locales; su TTL no convierte DataForSEO en fuente de primera parte.
- `--max-pages` mantiene la paginación acotada; no afirma exhaustividad.
- La prioridad editorial sigue requiriendo decisión humana aunque la tupla sea determinista.
- Ejecutabilidad no crea un data product: un consumer recurrente requiere schema, writer, idempotencia/frescura,
  readers, MCP parity, rollout y evidencia runtime.

## Alternatives rejected

- Mantener cientos de rutas a mano: drift inevitable y cobertura imposible de probar.
- Instalar un SDK o cliente REST paralelo: evita allowlist, breaker y ledger.
- Tratar todas las rutas oficiales como ejecutables: amplía gasto y superficie sin ADR, entitlement ni schema.
- Reintentar POST ante timeout: puede duplicar task y costo cuando el provider ya aceptó la primera llamada.

## Consequences

- El snapshot es grande, pero sólo lo carga tooling local; no entra a bundles del portal.
- Un cambio en el HTML oficial puede romper la sincronización de forma visible; el snapshot anterior permanece
  usable hasta corregir el parser.
- Las estimaciones exactas siguen siendo endpoint-specific. Sin base verificable, la CLI exige estimación y
  ceiling en vez de mostrar precisión falsa.

## Fitness functions

- `pnpm dataforseo:catalog:check` detecta drift.
- `pnpm exec tsx scripts/dataforseo/generate-enablement-register.ts --check` fuerza paridad byte-for-byte entre
  el snapshot y el registro de rutas no autorizadas.
- Tests comprueban rutas diarias, allowlist, Perú→2604, AI guards, research, estados task y GET sin body/retry.
- Tests focales comprueban fingerprints, aislamiento tenant, TTL, costo progresivo, cursor/offset, gobernanza,
  matriz SERP, comparación transversal por aliases/dominios y normalización AI API vs consumer.
- `pnpm typecheck`, lint y task lint protegen integración.

## Revisit triggers

- DataForSEO publica OpenAPI oficial estable.
- Se propone una séptima familia.
- El catálogo supera el costo aceptable de sync o la portada deja de enumerar rutas concretas.
- DataForSEO cambia el contrato de tokens de paginación, precios Standard o shapes AI normalizados.
