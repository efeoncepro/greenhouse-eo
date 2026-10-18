# Calcular el valor publicitario estimado del tráfico orgánico

Usar con el [método versionado](../../services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md).
El resultado es un análisis de operador, todavía sin panel, API/MCP o job automático.

## Preparar y extraer

1. Verificar org, propiedad GSC activa, host, mes y calendario. Cargar entorno con
   `loadGreenhouseToolEnv`; usar el perfil runtime y el pool compartido. Nunca imprimir secretos.
2. Ejecutar `collectOrganicTrafficValueInputs` de `src/lib/growth/seo/organic-traffic-value/collect.ts`
   con `{ organizationId, siteUrl, hostname, range: { startDate, endDate } }`. El final es inclusivo.
   El helper usa el reader GSC autorizado de la org. No solicita nuevo OAuth.
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

La CLI lee los CPC existentes para Chile y Perú mediante `readKeywordMarketData`. No compra datos.
Usa normalización canónica y el código de país de GSC. Otros países quedan sin valorar. Un CPC de
fecha posterior al mes se muestra con su fecha efectiva y no se convierte en precio histórico.
La salida conserva controles, cobertura, detalle y procedencia. Una segunda ejecución exige otra ruta
o retirar conscientemente el artefacto anterior: no sobreescribe evidencia silenciosamente.

## Si faltan CPC

Preparar selección única de consultas con clics por país, excluir snapshots frescos ya disponibles y
estimar con `estimateMarketDataCost`. No limitar a las cinco consultas del top 50. Construir payload de
`keyword_overview/live` en batches de hasta 700 keywords, location_code 2152 (CL) / 2604 (PE), language es.

Usar la CLI DataForSEO existente `run <endpoint> --file <payload> --org <org> --consumer seo --dry-run`.
Revisar su preview, estimación total, saldo y techo. Ejecutar con `--yes --estimated-usd <n> --max-usd <n>`
sólo dentro del encargo autorizado. Conservar `--out <receipt.json>` y comprobar HTTP + status de cada task
+ costo conocido. No reintentar automáticamente después de respuesta perdida o costo desconocido.

Proyectar los items con `parseKeywordOverviewItem` y persistir con `persistKeywordMarketData`
(`sourceEndpoint: 'keyword_overview'`, `capturedByOrganizationId`, `providerCostUsd`). Volver a leer desde PG,
calcular y registrar el recibo. La escritura de gasto la hace el transporte; no insertar otro ledger.

## Entregar y verificar

Mantener GA4/GSC del top 50 y su ranking; anexar valor/cobertura por URL. Para todo el blog presentar el
resultado global y el detalle de cálculo necesario para trazabilidad. Validar números contra el JSON
canónico y abrir el archivo exportado. No modificar ediciones históricas de Insights ni llamar ROI al valor.
