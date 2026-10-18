# Valor publicitario estimado del tráfico orgánico

Esta capacidad calcula una referencia monetaria sobre los clics orgánicos visibles del sitio:
clics de Google Search Console por página, consulta y país multiplicados por el CPC del mismo país.
El dinero es estimado; los clics son observados. El resultado no acredita ahorro, ingresos o ROI.

## Superficie disponible

Foundation local de Growth SEO y [CLI de operador](../../manual-de-uso/growth/valorar-trafico-organico.md),
con export JSON y entrega Excel. No tiene panel productivo, API/MCP propia, programación automática ni
integración de esta cifra en una edición de Insights. El piloto SKY no modifica sus informes anteriores.

## Qué muestra

- Valor estimado en USD para los clics que tienen un CPC utilizable.
- Clics totales del alcance, obtenidos sin dimensión de consulta.
- Clics de consultas visibles, clics valorados, cobertura y ausencias.
- Desglose por página, país y búsquedas de marca/sin marca.
- Período GSC, captura del análisis, captura del CPC y actualización del proveedor.

La cobertura es clics valorados dividido por el control GSC del mismo alcance. Un resultado parcial no se
extrapola al resto. Los desgloses de país/marca muestran sólo detalle visible cuando no tienen control propio.

Un precio cero explícito es válido. Un precio ausente permanece sin valorar. Si no hay ninguna fila con
clics y CPC disponible, el dinero se muestra como no disponible, no USD 0. Un error de acceso, paginación o
reconciliación detiene el análisis en vez de producir un total aparentemente completo.

## Relación con otros indicadores

GA4 conserva sesiones, canales y comportamiento. GSC conserva clics, impresiones, CTR y posición. Los clics
y sesiones no se equiparan. El top 50 GA4 es una vista de páginas y mantiene su orden al añadir esta cifra.

DataForSEO también entrega un valor nativo del tráfico estimado con ETV. Es otra estimación, con una base
distinta. Se puede usar como contexto de mercado, pero no se suma o promedia con la valoración por clics.

Cuando se aplica CPC capturado hoy a un mes anterior, el análisis es una revaloración con esos precios.
No prueba el CPC histórico de aquel mes. Para comparar períodos se conserva la versión de método y el
snapshot de precios utilizado.

## Alcance del piloto SKY

Host `blog.skyairline.com`; GSC búsqueda web y datos finales. Septiembre 2026, con CPC de Chile y Perú
capturados el 15-10-2026. El resultado y cobertura verificados están en la
[auditoría de entrega](../../audits/growth/2026-10-15-sky-seo-service-and-organic-value.md).

[Método de cuenta](../../services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md) ·
[decisión técnica](../../architecture/GREENHOUSE_ORGANIC_TRAFFIC_VALUE_DECISION_V1.md) ·
[marco del servicio](../../services/sky-blog-seo/README.md).
