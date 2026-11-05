# Calcular el valor publicitario estimado del tráfico orgánico

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-10-15 (piloto Blog SKY)
> **Ultima actualizacion:** 2026-11-05 por Claude (1.1: flags `--markets`, `--brand` y `--content-scope`; propiedades `sc-domain:`; cómo cubrir los CPC de un mes nuevo para Insights; code complete local, rollout pendiente)
> **Documentacion tecnica:** [decisión técnica](../../architecture/GREENHOUSE_ORGANIC_TRAFFIC_VALUE_DECISION_V1.md) · [funcional](../../documentation/growth/valor-publicitario-organico.md)

Usar con el [método versionado](../../services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md).
Por CLI es un análisis de operador, sin panel, API/MCP propia ni job automático. Desde el 2026-11-04 (local, sin
release) el capítulo de búsqueda de Insights calcula la misma cifra con los precios ya capturados: ver
«Cubrir los CPC de un mes nuevo para Insights» abajo.

## Preparar y extraer

1. Verificar org, propiedad GSC activa, host, mes y calendario. Cargar entorno con
   `loadGreenhouseToolEnv`; usar el perfil runtime y el pool compartido. Nunca imprimir secretos.
2. Ejecutar `collectOrganicTrafficValueInputs` de `src/lib/growth/seo/organic-traffic-value/collect.ts`
   con `{ organizationId, siteUrl, hostname, range: { startDate, endDate } }` y, si aplica, `scopeRules`
   (alcance de contenido). El final es inclusivo. El helper usa el reader GSC autorizado de la org. No solicita
   nuevo OAuth.
   - `siteUrl` puede ser una propiedad de URL (`https://blog.ejemplo.com/`, el host debe ser exactamente ese) o de
     dominio (`sc-domain:ejemplo.com`, el host debe ser el dominio o un subdominio suyo). Si no calza:
     `site_hostname_mismatch`.
   - Con `scopeRules`, Google recibe una expresión de página con el mismo veredicto que el alcance de la org. Si vuelve
     una página fuera del alcance, el collector falla con `page_outside_content_scope`: no mezcla.
3. Guardar el JSON de entradas en evidencia local ignorada. Incluye captura, controles y detalle
   page/query/país. El collector pagina hasta agotar filas y corta al alcanzar su máximo declarado.

## Valorar con CPC disponible

Para extraer y valorar en una sola ejecución, con el entorno autorizado de GSC configurado:

```sh
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/seo/organic-traffic-value.ts \
  --org=org-b9977f96-f7ef-4afb-bb26-7355d78c981f \
  --site=https://blog.skyairline.com/ --host=blog.skyairline.com \
  --from=2026-09-01 --to=2026-09-30 --save-input=.captures/sky-gsc-inputs.json \
  --out=outputs/sky-organic-value.json
```

Para reutilizar una extracción ya guardada:

```sh
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/seo/organic-traffic-value.ts \
  --input=.captures/sky-gsc-2026-10-15/organic-value-gsc-inputs.json \
  --out=outputs/sky-blog-top50-2026-09/valor-organico-septiembre-2026.json
```

Flags para medir fuera de SKY (sin ellos, la CLI conserva los valores del piloto):

| Flag | Qué hace | Por defecto |
| --- | --- | --- |
| `--markets=mex:2484,chl:2152` | Pares país GSC (ISO-3 en minúsculas) : `location_code` de DataForSEO. Formato inválido: `invalid_market` | `chl:2152,per:2604` |
| `--brand='\bberel\b'` | Patrón (regex, sin distinguir mayúsculas) que separa búsquedas de marca. Sólo desglosa; no cambia el valor | El de SKY |
| `--content-scope` | Mide sólo el alcance de contenido vigente de la org. Exige extracción en vivo (con `--input` falla `content_scope_requires_live_collection`) y un alcance declarado (si no, `content_scope_not_declared`) | Sitio completo |

Ejemplo con una propiedad de dominio y el blog como alcance:

```sh
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/seo/organic-traffic-value.ts \
  --org=<organization_id> --site=sc-domain:ejemplo.com --host=www.ejemplo.com \
  --from=2026-10-01 --to=2026-10-31 --markets=mex:2484 --brand='\bejemplo\b' --content-scope \
  --save-input=.captures/<org>-gsc-inputs-2026-10.json --out=outputs/<org>-valor-organico-2026-10.json
```

La salida registra el alcance usado (versión, etiqueta y reglas) y el patrón de marca.

La CLI lee los CPC existentes de cada mercado de `--markets` (idioma `es`) mediante `readKeywordMarketData`. No compra datos.
Usa normalización canónica y el código de país de GSC. Otros países quedan sin valorar. Un CPC de
fecha posterior al mes se muestra con su fecha efectiva y no se convierte en precio histórico.
La salida conserva controles, cobertura, detalle y procedencia. Una segunda ejecución exige otra ruta
o retirar conscientemente el artefacto anterior: no sobreescribe evidencia silenciosamente.

## Si faltan CPC

Preparar selección única de consultas con clics por país, excluir snapshots frescos ya disponibles y
estimar con `estimateMarketDataCost`. No limitar a las cinco consultas del top 50. Construir payload de
`keyword_overview/live` en batches de hasta 700 keywords, con el `location_code` del mercado (2152 CL, 2604 PE,
2484 MX), language es.

Usar la CLI DataForSEO existente `run <endpoint> --file <payload> --org <org> --consumer seo --dry-run`.
Revisar su preview, estimación total, saldo y techo. Ejecutar con `--yes --estimated-usd <n> --max-usd <n>`
sólo dentro del encargo autorizado. Conservar `--out <receipt.json>` y comprobar HTTP + status de cada task
+ costo conocido. No reintentar automáticamente después de respuesta perdida o costo desconocido.

Proyectar los items con `parseKeywordOverviewItem` y persistir con `persistKeywordMarketData`
(`sourceEndpoint: 'keyword_overview'`, `capturedByOrganizationId`, `providerCostUsd`). Volver a leer desde PG,
calcular y registrar el recibo. La escritura de gasto la hace el transporte; no insertar otro ledger.
Las consultas que el proveedor no tiene se persisten igual, como filas con CPC `NULL`: quedan «sin valorar» y la
compra queda registrada.

## Cubrir los CPC de un mes nuevo para Insights

El capítulo de búsqueda de Insights (`readOrganicTrafficValueForWindow`) valora con el mercado del target SEO de la
org, sobre su alcance de contenido y **sólo con CPC ya capturados**: nunca compra. Si un mes trae consultas nuevas sin
precio, la cobertura baja; si ninguna consulta con clics tiene precio, el informe no muestra valor (límite, nunca US$ 0).
El scheduler mensual `ops-seo-keyword-market-data` sólo captura keywords seguidas, no las consultas de Search Console.

Antes de generar la edición del mes:

1. Correr la CLI de arriba (sólo lee; no compra): extracción en vivo del mes con `--markets` del mercado del target,
   `--content-scope` si la org tiene alcance y `--save-input`. Leer la cobertura de valoración.
2. Si la cobertura es baja, seleccionar las consultas con clics del mes que no tienen snapshot fresco y seguir
   «Si faltan CPC»: `pnpm dataforseo -- run …keyword_overview/live --file <payload> --org <org> --consumer seo`
   primero en `--dry-run`, después con techo (`--max-usd`) dentro de un encargo autorizado por el operador.
3. Persistir con `parseKeywordOverviewItem` + `persistKeywordMarketData` y volver a correr la CLI con `--input`
   para confirmar la cobertura.
4. Generar o previsualizar la edición. La fecha del valor es la de captura del precio, no un CPC histórico del mes.

Caso de referencia: blog de Berel, octubre 2026, mercado México: 508 consultas, 230 con precio, USD 0,048 reales
(techo USD 0,50), una sola compra autorizada.

## Entregar y verificar

Mantener GA4/GSC del top 50 y su ranking; anexar valor/cobertura por URL. Para todo el blog presentar el
resultado global y el detalle de cálculo necesario para trazabilidad. Validar números contra el JSON
canónico y abrir el archivo exportado. No modificar ediciones históricas de Insights ni llamar ROI al valor.
