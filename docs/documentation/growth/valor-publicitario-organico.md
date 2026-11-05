# Valor publicitario estimado del tráfico orgánico

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-10-15 (piloto Blog SKY)
> **Ultima actualizacion:** 2026-11-05 por Claude (1.1: el método se usa fuera de SKY —Berel y el capítulo de búsqueda de Insights—, mide propiedades de dominio y un alcance de contenido; code complete local, rollout pendiente)
> **Documentacion tecnica:** [decisión técnica](../../architecture/GREENHOUSE_ORGANIC_TRAFFIC_VALUE_DECISION_V1.md) · [método](../../services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md)

Esta capacidad calcula una referencia monetaria sobre los clics orgánicos visibles del sitio:
clics de Google Search Console por página, consulta y país multiplicados por el CPC del mismo país.
El dinero es estimado; los clics son observados. El resultado no acredita ahorro, ingresos o ROI.

## Superficie disponible

- [CLI de operador](../../manual-de-uso/growth/valorar-trafico-organico.md), con export JSON y entrega Excel. Mide
  cualquier organización con Search Console conectado: la propiedad puede ser de una URL o de dominio completo
  (`sc-domain:`), en los mercados que se indiquen y, si se pide, sólo sobre su alcance de contenido.
- **Capítulo de búsqueda de Insights** (desde 2026-11-04, **code complete local, rollout pendiente**): la cifra
  «Valor publicitario estimado» con sus clics valorados, en el mercado declarado en el SEO de la organización y sobre
  su alcance de contenido. Usa sólo precios ya capturados; nunca los compra. Ver
  [Insights](../insights/efeonce-insights-dominio-ediciones.md).

No tiene panel propio, API/MCP propia ni compra automática de precios. El piloto SKY no modifica sus informes
anteriores.

### Alcance de contenido

Si la organización declara qué parte del sitio trabaja Efeonce (por ejemplo, los artículos de un blog dentro de un
sitio de productos), el cálculo pide a Google sólo esas páginas. Si Google devolviera una página fuera de ese alcance,
el cálculo se detiene en vez de mezclarla.

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

## Primer uso fuera de SKY: blog de Berel, octubre 2026

Propiedad de dominio de Berel, alcance de contenido del blog y mercado México. Se compraron una sola vez, con
autorización del operador, los costos por clic de 508 consultas (230 con precio; costo real USD 0,048). El valor de
octubre fue de cerca de US$ 85: bajo porque los costos por clic de pintura en México son bajos y porque sólo una parte
de las consultas tiene precio. La cifra aparece en el informe de Insights de octubre, generado como vista previa local.

**Para que un mes nuevo quede cubierto** hay que capturar antes los precios de las consultas que aparecieron ese mes.
Hoy es un paso manual; la captura mensual automática sólo cubre las keywords seguidas.

[Método de cuenta](../../services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md) ·
[decisión técnica](../../architecture/GREENHOUSE_ORGANIC_TRAFFIC_VALUE_DECISION_V1.md) ·
[marco del servicio](../../services/sky-blog-seo/README.md).
