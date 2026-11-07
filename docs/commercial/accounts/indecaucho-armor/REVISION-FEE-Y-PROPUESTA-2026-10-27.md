# ARMOR · revisión para Julio: fee, reunión y propuesta

> **Antecedente sustituido en precio/estado V3:** por instrucción posterior de Julio se incorporaron Performance
> y Ecuador al catálogo y se calculó el [fee V3 vigente de US$22.450](COSTEO-V3-2026-10-27.md), con medios aparte
> de hastaUS$18.000. La explicación de la reunión se conserva; el bloqueo y los US$21.000 de abajo son históricos.

**27/10/2026 · interno · `hypothesis_only` · sin enviar ni aprobar precio.**

El [borrador de propuesta](PROPUESTA-90-DIAS-BORRADOR.md) recomienda **US$21.000 de honorarios** y una
**reserva de medios de hasta US$18.000** para 90 días. Sobre de planificación: **US$39.000**, antes de
impuestos/costos de terceros por confirmar. Ninguna de estas cifras fue un acuerdo de Vanessa.

## Por qué responde a la reunión

Fuente: conversación del 27/10, HubSpot MEETING119610757452, 104 intervenciones contrastadas con Notion.
La [cobertura y atribución](POSTREUNION.md#validación-programada-del-2710--1600-chile) conserva los límites.

| Voz de Vanessa / localización | Decisión propuesta por Efeonce | Efecto sobre el fee |
| --- | --- | --- |
| 05:48–06:28: prioridad de máscaras full face y filtros; acompañamiento técnico y distribuidores. | Dos familias de producto, mensajes técnicos aprobados y ruta al asesor/distribuidor; no e-commerce ni campañas de todo el portafolio. | Acota estrategia y textos; no vende una reestructuración de marca o catálogo. |
| 08:14–11:22: leads/ventas, piloto 90 días, LinkedIn Ads y Google Ads; Compras/SSO, Ecuador/Colombia y visibilidad Perú. | Dos canales y tres mercados con metas distintas. Preparación incluida dentro de los mismos 90 días. | Operación de campañas y lectura por mercado; Perú no se cotiza como un tercer embudo comercial completo. |
| 03:16: ~22 seguidores nuevos y 4–5 leads mensuales declarados. | Reconstruir baseline y definir calidad; no extrapolar leads orgánicos a rendimiento pagado. | Analítica y retroalimentación comercial; no una promesa de 100 leads ni un bono por ventas. |
| Recorrido web/WhatsApp descrito en la reunión; Kommo confirmado después por Julio. | Medición de origen, campos básicos y prueba de ingreso; alternativa manual si la conexión no está disponible. | Una puesta en marcha acotada; no integración CAPI a medida, migración o operación CRM integral. |
| Vanessa indica equipo interno de diseño y necesidad ocasional de contenido específico. | ARMOR diseña; Efeonce prepara textos, briefs y coordina formatos. | No cobramos un retainer creativo ni producción audiovisual. |
| 12:50–12:56: pide recomendación de inversión para construir presupuesto. | Reserva de US$6.000/período, validación de audiencias/búsqueda y liberación gradual. | Medios separados; fee fijo por trabajo, sin porcentaje o markup sobre inversión. |
| 14:26–14:50: terna a gerencia; 14:54 Julio compromete entrega 29–30/10. | Propuesta revisable con presupuesto y criterios de evaluación. | No presupone adjudicación, autoridad final, ni presupuesto aprobado. |

Los límites de dos variantes de landing, doce textos iniciales/cuatro mensuales, las horas, el tablero y los
criterios de avance son **diseño Efeonce**. Vanessa no los pidió ni aprobó como cantidades. Hay que revisarlos
con capacidad real antes de convertirlos en compromiso contractual.

## Qué hizo realmente Cotizador V3

Se verificó `current show`: catálogo **operating-review-2026-10-22-v13**, policy **operating-review-2026-10-22-v12**
y créditos **operator-screenshots-2026-10-09-v1**, consistentes. No se modificó catálogo, policy ni puntero.

- **Dimensionamiento calculado por V3:** puesta en marcha **160 horas**, ~0,889 FTE-mes; operación **121 horas
  por período de 30 días**, ~0,672 FTE. Son estimaciones de alcance, no una dotación reservada o dedicación
  aceptada por el cliente. Total de referencia: **523 horas** en el programa, entre varios perfiles.
- **Precio V3: no calculado.** Corrida diagnóstica con la oferta real de Performance y mercado EC, `--current`:
  exit **2**, `needs_input`, `totals:null`; `MISSING_CATALOG_SELECTION` en `offerMarketCountry` y política de
  precio del perfil. [Artefacto bloqueado](pricing-review-2026-10-27/diagnostic.blocked.artifact.json).
  Es una prueba de compatibilidad de una línea, no una cotización del programa completo.
- V3 tiene ofertas Creative, SEO/AEO y Staffing. No se usó una de ellas para disfrazar Performance, no se
  sustituyó Ecuador por otro mercado y no se inventó factor país, multiplicador o precio acordado.
- **Por tanto, los US$21.000 son una recomendación provisional sustentada en costos y el pack de Performance;
  no son un precio calculado o validado por V3.** Para cumplir la emisión V3 falta una decisión del CEO sobre
  oferta de Performance, mercado contractual/factor y sus reglas; si el contrato realmente se ubica en otro
  mercado, debe confirmarse ese hecho, no seleccionarlo por conveniencia.

## Corrección del costeo anterior

El [pack previo](PRICING-PILOTO-90D.md) dividía los costos mensuales entre **160 horas** sin explicitarlo.
La regla vigente de asignación V3 usa **180 horas/FTE-mes**, referencia estimada. Este documento y su
[cálculo reproducible](pricing-review-2026-10-27/cost-review.json) **sustituyen su aritmética de costos,
FTE y márgenes**, conservando el precio como candidato para revisión.

Se leen los costos objetivo vigentes de los perfiles, con referencia Chile; no nómina ni roster contratado.
Performance Lead **US$5.500/mes** y herramientas/overhead **12%** siguen siendo hipótesis del
[pack de Performance](../../../business-models/media-distribution/PERFORMANCE_COMMERCE_PRICING_INTEGRITY_PACK_V1.md).
No se usan sus costos históricos distintos cuando existe el registro actual del catálogo.

| Lectura interna, USD | Puesta en marcha | Cada período mensual | Programa completo |
| --- | ---: | ---: | ---: |
| Horas estimadas | 160 | 121 | 523 |
| Equipo, costo proporcional | 1.903,33 | 1.850,56 | 7.455,01 |
| Costo con 12% de herramientas/overhead | 2.131,73 | 2.072,62 | 8.349,59 |
| **Honorario propuesto** | **5.400** | **5.200** | **21.000** |
| Margen base estimado sobre honorarios | 60,52% | 60,14% | 60,24% |
| Escenario adicional: reserva del 12% del costo cargado | 255,81 | 248,71 | 1.001,94 |
| Costo con esa reserva | 2.387,54 | 2.321,33 | 9.351,53 |
| Margen con esa reserva | 55,79% | 55,36% | 55,47% |

Los totales monetarios del programa suman los importes de cada fase redondeados a centavos; no sumar las filas
de equipo ya redondeadas para volver a inferir el costo exacto. La reserva adicional es un **escenario prudencial
interno propuesto**, distinto del overhead; no se ha activado una política V3 de contingencia de Performance.
Tampoco se ha aplicado el recargo On-Demand de otra práctica. Estos márgenes dependen de horas, costo del Lead,
capacidad compartida vendible y overhead; no son margen realizado ni aprobación de Finance.

Con el método del pack al 55%, sin reserva adicional, los valores orientativos serían **US$4.737,19** de inicio
y **US$4.605,83** por período. Mantener US$5.400/US$5.200 deja espacio para incertidumbre de acceso, medición y
coordinación; no se presenta ese espacio como costo probado. Aumentar en 25% todo el costo estimado deja un
margen de ~50,30% sobre los US$21.000, antes de cualquier costo extraordinario. El piso 45% y objetivo 55%
del pack son hipótesis para esta práctica, no una nueva regla comercial aprobada.

## Cómo leer el valor y sus límites

El fee mensual equivale al 86,7% del techo mensual de medios; con el inicio, los honorarios representan 53,85%
del sobre combinado. Es una operación con bastante trabajo frente al gasto en plataformas. **No la vendería
como mera administración de anuncios:** incluye construir el recorrido comercial y comprobar la calidad.
Si ARMOR ya tiene esa infraestructura utilizable, revisar el esfuerzo de inicio y recotizar el delta; no
cobrar configuraciones ya resueltas. Si no acepta ese valor, conviene reducir alcance y volver a costear,
en lugar de mantener las mismas promesas con un descuento improvisado.

Los US$18.000 son una reserva máxima de medios: el arranque está dentro del primer período y puede consumir
menos. No hay 90 días completos de campañas después de dos semanas adicionales. Si el comprador exige 90 días
enteros de pauta, cambiará el calendario y habrá que revisar el esfuerzo y precio, antes de acordarlo.

Con los datos actuales no existe contribución por venta, conversión/ciclo comercial o capacidad de atención
comprobada. **No se sostiene un ROI, punto de equilibrio ni garantía de ventas.** El piloto compra ejecución,
medición y una decisión mejor informada; la rentabilidad del cliente sigue pendiente de datos.

## Decisiones antes de enviar

1. Julio: revisar US$5.400 de inicio, US$5.200 × 3, alcance y techo de medios. Son valores propuestos, no aprobados.
2. Pricing/CEO: resolver la oferta Performance en V3, el mercado contractual y sus factores/políticas, para
   una cotización completa. No basta con que el dimensionamiento haya calculado.
3. Operations: confirmar roster/capacidad, accesos y que las dos variantes de landing y la conexión básica
   se pueden realizar dentro de las horas estimadas. Un desarrollo a medida queda fuera.
4. ARMOR/Finance: confirmar contratante, facturante, USD, impuestos/retenciones y pagos; validar presupuesto,
   ruta de distribuidores y atención. No se envían preguntas al comprador desde esta corrida.

## Reproducibilidad

Desde la raíz del repo:

```sh
python3 docs/commercial/accounts/indecaucho-armor/pricing-review-2026-10-27/rebuild-review.py
pnpm --silent pricing:v3 current show
pnpm --silent pricing:v3 compose workload --input docs/commercial/accounts/indecaucho-armor/pricing-review-2026-10-27/setup.workload.json
pnpm --silent pricing:v3 compose workload --input docs/commercial/accounts/indecaucho-armor/pricing-review-2026-10-27/monthly.workload.json
```

`compose workload` no toma `--current`: recibe la capacidad con su fuente, extraída del catálogo vigente por el
script. Los JSON `*.dimensioning.json` conservan su salida. La corrida `quote` usó `--current`, el brief
`diagnostic.brief.json`, `--keep-blocked` y un `--out` nuevo; para repetir no sobrescribir el artefacto congelado,
usar otra ruta. El script es aritmética interna del pack, **no reemplaza el motor V3 ni emite una cotización**.
Costos, márgenes y archivos de esta revisión son internos: no adjuntarlos al correo del cliente.
