# Valor publicitario equivalente estimado del tráfico orgánico

Método `gsc_clicks_country_cpc_v1`, aprobado para construir y evaluar por Julio el 15-10-2026.
El nombre y su lectura externa se validan con SKY. Unidad inicial: USD. Período: mes calendario GSC/PT.

## Pregunta que responde

¿Qué valor de referencia publicitaria representa la parte de los clics orgánicos del blog para la que
disponemos de una consulta visible y un CPC del mismo país?

`valor estimado USD = Σ(clics GSC de página × consulta × país × CPC USD de consulta/país)`.

Se calcula la multiplicación por fila, se suma sin redondeos intermedios y se redondea el agregado a centavos.
Los precios son estimados de mercado. El resultado monetario conserva esa naturaleza aunque los clics sean
medidos. No representa ahorro efectivo, ingresos, rentabilidad ni causalidad atribuible a Efeonce.

## Fuentes y unión

1. GSC: propiedad del blog, host exacto, `type=web`, `dataState=final`, `aggregationType=byPage`.
2. Control independiente sin query para el total del blog y por página. No reconstruirlo sumando consultas.
3. Detalle paginado por `page,query,country`. Usar todas las filas disponibles con clics positivos,
   no las cinco consultas del Excel ni sólo las cincuenta páginas principales.
4. Normalizar únicamente la búsqueda con `normalizeMarketKeyword` canónico: NFKC, espacios y minúsculas.
   Mantener la URL exacta de GSC; no mezclar versiones de URL sin una decisión de canonicalización comprobada.
5. CPC: DataForSEO Labs `keyword_overview`, mismo país y lenguaje declarado. Lectura del snapshot canónico;
   captura por transporte y CLI gobernados si falta. No seguir keywords para obtener este indicador.
6. Registrar captura de GSC, captura de CPC y fecha de actualización del proveedor. El primer piloto revaloriza
   septiembre con precios capturados en octubre: es una valoración retrospectiva a precios actuales.
   Para comparaciones futuras se conservan snapshots; no fingir CPC histórico de septiembre.

La API GSC no garantiza todas las filas y oculta consultas. Agotar la paginación sólo acredita que se
extrajeron sus filas disponibles. La cobertura se expresa contra el control sin query del mismo alcance.

## Cobertura y valores ausentes

| Campo | Definición |
| --- | --- |
| Clics totales | Control GSC del blog o página, sin dimensión query. |
| Clics de consultas visibles | Suma del detalle page/query/country disponible. |
| Clics valorados | Clics de filas con CPC no nulo del país correspondiente. |
| Cobertura de valoración | Clics valorados / clics totales. |
| Cobertura de consultas | Clics de consultas visibles / clics totales. |
| Clics visibles sin valorar | Clics visibles menos clics valorados. |
| Clics no expuestos | Clics totales menos clics visibles. Incluye límites/privacidad, no sólo anonimización. |

Sin CPC, país no comprado o query no disponible: `null`/«Sin valorar». Un CPC real de cero se conserva como
cero válido. Si ninguna fila con clics tiene CPC, el valor del alcance es `null`, no USD 0. No extrapolar al
resto ni multiplicar todo el tráfico GA4 por un CPC promedio. No mezclar Organic Search con Email/Direct.

Los desgloses por país y marca usan los clics visibles de esas filas. Sin control independiente por ese
desglose no muestran una cobertura sobre el total. El desglose de página sí usa el control de esa página.

## Marca, contexto y comparación

Para SKY, la regla inicial de marca identifica el término completo `sky` y `skyairline`/`skyairlines`, sin
confundir `skydiving`. Se publica la regla; nuevas variantes se revisan con el cliente. El resto se clasifica
como sin marca según esa regla, sin inferir automáticamente intención comercial.

El `estimated_paid_traffic_cost` nativo de DataForSEO se puede mostrar por separado como contexto competitivo.
Usa ETV modelado, no clics observados. ETV es volumen; el valor monetario está en otro campo. No sumar ni
promediar las dos valoraciones. Las series del valor nativo respetan la versión ETV canónica.

## Aceptación

- Misma organización/propiedad/host/período en detalle y controles; filas y controles reconcilian.
- Duplicados de page/query/country o CPC query/país se rechazan en lugar de duplicar valor.
- País y fecha del CPC visibles; cobertura y ausencias acompañan siempre el valor.
- Trazabilidad de la compra: endpoint, keywords, preview, cap, task, estado y costo real separados.
- Un fallo de proveedor o paginación produce error visible; no un resultado completo con ceros.
- Fórmulas y totales del Excel contrastados con el cálculo canónico y fuentes guardadas.
- Aprobación de interpretación por SKY antes de usarlo como indicador contractual o claim de rentabilidad.

Fuentes verificadas el 15-10-2026:
[Google Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query),
[límites y extracción](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data),
[CPC Labs](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/),
[traffic cost de DataForSEO](https://dataforseo.com/help-center/how-is-traffic-cost-calculated).
