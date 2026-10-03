# TASK-1975 — Wireframe: figuras nuevas del informe en PDF, deck y Think

Creado 2026-10-03. Describe, región por región, las cinco figuras que TASK-1975 agrega a los catálogos
`insights-report` (A4) e `insights-deck` (16:9) y a la vista web de Think: **cascada, waffle, dona, barras apiladas y
tarjeta de cifra**. Las cuatro primeras tienen hoja aprobada; la tarjeta de cifra **no**, y su sección es una
**propuesta pendiente de aprobación del operador** (Slice 1 de la task).

- Visual direction mode: source-led
- Product Design asset: `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`
- **Dirección aprobada:** la de TASK-1889, canvas «Gráficos de Efeonce Insights», aprobado por el operador el
  2026-09-25 («así quiero que se vea un informe»). Hojas durables de estas familias, a tamaño nativo, en
  `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/paginas/`:
  `Premium-Cascada.png`, `Premium-Waffle.png`, `Premium-Donut.png`, `Premium-Apiladas.png`, `Deck-Cascada.png`,
  `Deck-Waffle.png`, `Deck-Donut.png` y `Deck-Apiladas.png`. Fuente editable en `fuente-canvas-2026-09-25.tar.gz`
  (`Premium-Cascada.dc.html`, etc.).
- **Referencia para la tarjeta de cifra (sin hoja propia):** `Premium-Resumen.png` y `Deck-Resumen.png` (cifra grande
  en Poppins + texto en filas con filete, «Lo esencial del mes»), `Deck-Comparacion.png` (métricas cada una en su
  escala, con píldora de variación) y `Premium-Lectura.png` (columna de evidencia con cifras). La propuesta nace de ese
  lenguaje, no de una tarjeta genérica.
- **Criterio que gobierna qué figura sale:** [`EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md`](../../architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md)
  (la pregunta decide la familia; un dato no se muestra dos veces; la variedad sólo desempata). Anatomía de la
  tarjeta en su §5.1.
- **Contrato de datos:** TASK-1974 (tarjeta de cifra como tipo de figura nuevo en el plan y en el modelo web,
  evidencia de dona y barras apiladas, matriz familia × evidencia). Este wireframe no decide qué figura se elige: sólo
  cómo se dibuja la que el plan trae.
- **Master flow del programa:** [`EPIC-045-efeonce-insights-UI-FLOW.md`](../flows/EPIC-045-efeonce-insights-UI-FLOW.md).
  No agrega nodos ni rutas: produce páginas dentro de `report_pdf` y `deck_pdf` (S3, descargas) y bloques dentro de la
  vista web compartida S6 (`think.efeoncepro.com/insights/r/<token>`).
- **Modelo de wireframe:** el de TASK-1902 (`TASK-1902-efeonce-insights-gauge-heatmap-pages.md`), misma anatomía.

## Desktop Target

El «desktop» de los PDF es el documento a tamaño físico: A4 794×1123 px y lámina 1280×720 px a 96 dpi. Toda página
nueva usa la anatomía de figura de TASK-1889: pestaña de capítulo en el canto, cabecera corrida (logo del cliente,
sección, período), antetítulo con ícono, cifra principal + bajada, conclusión + lead, tablero de la figura (título,
leyenda, figura, nota), fila de procedencia (Unidad · Fuente · Cobertura), panel navy de cierre «Lo que significa /
Próximo paso» y pie institucional con folio. **Sólo cambia la región del tablero**, salvo en la tarjeta de cifra.

En Think, el «desktop» es la vista web a 1440 px: las cuatro familias con hoja ya se dibujan en `ChartFigure.astro`;
lo nuevo es la tarjeta de cifra y el waffle por unidad (ver «Waffle por unidad» abajo).

### A4 — Cascada (`report-figure-waterfall`, canvas `Premium-Cascada`)

| Región | Contenido | Dato | Regla |
|---|---|---|---|
| Antetítulo | ícono de escalera + «Qué explica el cambio» | `GH_INSIGHTS.catalog.figureEyebrow.waterfall` | ícono nuevo `steps` en el resolver `report-icon` |
| Cifra principal + bajada | «+182» y «clics más que julio: 205 ganados en tres frentes y 23 perdidos en la home» | `readings[].keyFigure` | sin lectura: la diferencia entre el total final y el inicial, con el formateador canónico |
| Conclusión + lead | «Las páginas de servicio explican más de la mitad del alza» | `reading.conclusion` / afirmaciones | como toda página de figura |
| Título del tablero + leyenda | «De 1.102 a 1.284 clics: qué sumó y qué restó»; muestras {período anterior}, «Sumó», «Restó», {período actual} | `chart.title`; etiquetas de los pasos `isTotal` | los rótulos de los totales salen de los pasos del plan, no del copy |
| Figura (barras horizontales) | columna de rótulos a la izquierda (alineados a la derecha, hasta dos líneas, ~190 px), área de barras con eje desde 0 y marcas redondeadas (`niceAxis`), totales anclados en 0, pasos flotando sobre el acumulado, conectores punteados entre el fin de una barra y el inicio de la siguiente, valor a la derecha de cada barra | `data.kind: 'waterfall'` (`steps[]` con `factId` e `isTotal`), geometría `waterfallGeometry` del motor | el total inicial más la suma de los pasos debe dar el total final; si no cuadra, el mapper rechaza con causa («la cascada no cuadra: 1.102 + 205 − 23 ≠ 1.290») |
| Valores | totales en negrita («1.102», «1.284»); pasos con signo («+96», «−23»); el paso que resta va en el tono de oportunidad **y** con su signo | hechos de cada paso | nunca sólo color; el signo es obligatorio |
| Nota | «El eje empieza en cero: los pasos se ven en su proporción real sobre el total.» | copy | barras siempre desde 0 (regla heredada de `dataviz-design`) |
| Procedencia, cierre | como toda página de figura | plan | `closing` sólo si hay lectura |

Capacidad: hasta **8 pasos intermedios** (10 filas con los dos totales). Una cascada no se parte en dos páginas: con
más pasos, la figura no se emite (`hasFigurePage = false`) y el planner de TASK-1974 debe agrupar la cola en «Resto».

### A4 — Waffle (`report-figure-waffle`, canvas `Premium-Waffle`)

| Región | Contenido | Dato | Regla |
|---|---|---|---|
| Antetítulo | ícono de retícula + «Cómo se reparte» | `figureEyebrow.waffle` | ícono nuevo `grid` |
| Cifra principal + bajada | «74 de 100» y «keywords del mercado donde el sitio ya aparece en Google» | `readings[].keyFigure` | |
| Título del tablero | «100 keywords del mercado según la posición del sitio» | `chart.title` | |
| Retícula (izquierda, ~256 px) | un cuadro por unidad, llenado fila por fila en el orden de las partes; esquinas de 3 px y separación de 4 px; la parte de ausencia («Sin posición») en rayado neutro y siempre al final | `data.kind: 'waffle'` (`parts[]`, `totalFactId`) | **un cuadro = una unidad** (criterio §5): hasta 30 unidades, 5 columnas; de 31 a 100, 10 columnas; más de 100 unidades, la figura no se emite (no es un conteo legible) |
| Leyenda (derecha) | filas separadas por filete: muestra de color, nombre de la parte, marca «Oportunidad» opcional y la cuenta grande a la derecha (Poppins 700, cifras tabulares) | hechos de cada parte | la cuenta es el hecho, no un porcentaje; la marca «Oportunidad» y el rayado de ausencia sólo si el plan declara el rol de la parte (ver Design Decision Log) |
| Nota | «Cada cuadro es una keyword del conjunto de 100 que medimos para el mercado.» | `figure.note` del plan o copy `waffleUnitNote` | dice qué es un cuadro |
| Procedencia, cierre | como toda página de figura | plan | |

Partes: de 2 a 4 (criterio: waffle con ≤ 4 categorías). Con más de 4, la figura no se emite.

### A4 — Dona (`report-figure-donut`, canvas `Premium-Donut`)

| Región | Contenido | Dato | Regla |
|---|---|---|---|
| Antetítulo | ícono + «Cómo se compone» | `figureEyebrow.donut` | |
| Cifra principal + bajada | «62 %» y «de las respuestas de IA nombra la marca (31 de 50)» | `readings[].keyFigure` | |
| Título del tablero | «Cómo aparece la marca en 50 respuestas · agosto 2026» | `chart.title` | |
| Fila de canales (opcional) | «Motores medidos» + discos blancos con logo (ChatGPT, Gemini, Claude, Perplexity) | `dimensionChannelIds` / canales del capítulo | sólo si el plan trae canales; logos de `insights-shared/channels.ts`, nunca dibujados a mano |
| Anillo (izquierda, ~260 px) | dona de radio interior 0,62, separación de 2 px entre porciones, porción de ausencia en rayado | serie única con 2 o 3 hechos (`donut`), geometría `sliceGeometry` del motor (`MAX_SLICES = 3`) | 1 parte o más de 3: la figura no se emite (nunca torta con más de 3 porciones) |
| Centro del anillo | cifra (Poppins 700 ~40 px) + rótulo («62 % / nombra la marca») | ver Design Decision Log | el centro repite la cifra principal sólo si la lectura cita hechos dibujados en la dona; si no, imprime el total de las partes con su unidad |
| Filas (derecha) | muestra, ícono opcional, nombre, marca «Oportunidad» opcional, cuenta grande, participación «38 %» en gris | hechos de cada parte | la participación es cifra derivada (parte ÷ suma), redondeada por restos mayores para que sume 100 |
| Nota | «Cada respuesta cuenta en una sola categoría: si cita con enlace, no se cuenta también como mención.» | `figure.note` | las partes no se superponen (lo exige el contrato) |
| Procedencia, cierre | como toda página de figura | plan | |

### A4 — Barras apiladas (`report-figure-stacked`, canvas `Premium-Apiladas`)

| Región | Contenido | Dato | Regla |
|---|---|---|---|
| Antetítulo | ícono de capas + «Cuánto del total» | `figureEyebrow.stacked` | ícono nuevo `layers` |
| Cifra principal + bajada | «60 %» y «de los clics de agosto llegó sin buscar la marca (772 de 1.284)» | `readings[].keyFigure` | |
| Título + leyenda | «Clics por tipo de búsqueda · junio a agosto»; un ítem por segmento, el de la base primero | `chart.title`, `series[].label` | |
| Columnas | eje vertical desde 0 con marcas redondeadas; de 2 a 6 períodos (columnas de ~110 px); segmento base (`series[0]`) abajo en el color del período actual, el resto encima | `bar_stacked`: series = segmentos, dimensiones = períodos | ≤ 4 segmentos; más, la figura no se emite |
| Valores | cifra dentro de cada segmento si mide ≥ 22 px de alto (si no, fuera, a la derecha); total del período sobre la columna, en negrita | hechos de cada segmento; total = suma de segmentos | si el plan trae el hecho del total, la suma debe coincidir o el mapper rechaza; nunca una resta para obtener un segmento (el complemento llega como hecho de TASK-1974) |
| Rótulo del eje X | período + participación del segmento base («52 % sin marca») | derivada: base ÷ total | cifra derivada declarada, redondeada |
| Anotación (opcional) | conector punteado entre la cima del segmento base de los dos últimos períodos + «+28 % sin marca» | `formatDeltaForUnit` sobre los dos hechos del segmento base | sólo con dos o más períodos; el triángulo/signo dice la dirección |
| Nota | «La base de cada barra es la búsqueda sin marca: su crecimiento se lee sobre la misma escala.» | `figure.note` | |

### A4 — Tarjeta de cifra (`report-figure-stat`) — **PROPUESTA PENDIENTE DE APROBACIÓN**

No hay hoja aprobada. El Slice 1 de la task diseña esta página en el mismo canvas «Gráficos de Efeonce Insights»
(tableros nuevos `Premium-Cifras` y `Deck-Cifras`) y la somete al operador. Hasta esa aprobación nada de esta sección
se implementa. Lo que sigue es la propuesta que se lleva al canvas.

**Anatomía de una tarjeta** (criterio §5.1, en orden de lectura):

| Pieza | Contenido | Regla |
|---|---|---|
| Ícono + nombre | ícono de trazo de la métrica (`METRIC_ICON`) + nombre de 3 palabras como máximo («Clics», «Tráfico orgánico estimado» se acorta a «Tráfico estimado») | el nombre viene del plan; más de 3 palabras o más de 24 caracteres ⇒ el mapper rechaza con causa, nunca trunca |
| Valor + unidad | cifra grande (Poppins 700, ~48 px en A4, cifras tabulares) y unidad pequeña a su derecha o debajo («clics», «%», «visitas») | `formatFactValue`; nunca truncar una cifra: si no cabe, el mapper rechaza |
| Variación | píldora `delta-pill` (▲/▼ + cifra sin signo, tono `delta--better`/`delta--plain` por `trendOf`) + texto «vs agosto 2026» | flecha + color + texto, nunca sólo color; el período de comparación siempre explícito |
| Dirección | rótulo pequeño «menor es mejor» cuando subir es malo (posición, rondas de revisión) | `higherIsBetterOf`; sin dirección conocida, tono neutro y sin rótulo |
| Estimado | marca «Estimado» junto al nombre | sólo si el hecho es estimado (lo declara el contrato de TASK-1974) |
| Sin dato | «—» en lugar del valor y «Sin dato en septiembre 2026» en lugar de la variación | nunca 0 |

**Página** — tres direcciones para el canvas; la recomendada es la 2:

1. **Ledger de cifras.** Filas a ancho completo como «Lo esencial del mes» de `Premium-Resumen`: nombre | cifra | variación
   y período, separadas por filete. Máxima coherencia con el resumen; con 5–6 filas la variación y el período se apretan
   en una línea.
2. **Retícula de cifras (recomendada).** Hasta 6 cifras en 2 o 3 columnas (2 columnas con 2 o 4 cifras; 3 columnas con 3,
   5 o 6), separadas por filetes verticales y horizontales finos, **sin borde de tarjeta ni fondo gris** (la dirección
   prohíbe «card soup»). Cada celda apila la anatomía de arriba. Sobre la retícula, la conclusión a ancho completo y el
   lead; **la página no lleva cifra principal en el héroe**: las cifras son la figura, y repetir una en el héroe
   mostraría el mismo dato dos veces (regla 2 del criterio). Una sola cifra ocupa la retícula completa en formato
   horizontal (valor a la izquierda, variación y período a la derecha).
3. **Cifra destacada + secundarias.** La primera cifra en el héroe a tamaño de cifra principal y las demás en una fila
   inferior. Rompe la regla 2 si la lectura cita la misma métrica, y jerarquiza sin criterio cuando las cifras pesan igual.

Regiones de la dirección 2 (A4):

| Región | Contenido | Regla |
|---|---|---|
| Cabecera corrida, pestaña | como toda página | |
| Antetítulo | ícono + «Cifras del período» | `figureEyebrow.stat` |
| Conclusión + lead | a ancho completo (658 px) | la conclusión es la de la lectura del plan |
| Retícula | 1 a 6 cifras con la anatomía de arriba | capacidad A4: 6; más cifras se reparten en páginas equilibradas (`balancedPages`) |
| Nota | opcional («Tráfico estimado a partir de la posición y el volumen de búsqueda.») | `figure.note` |
| Procedencia, cierre | como toda página de figura | |

Agrupación propuesta: las figuras de cifra **consecutivas** de un mismo capítulo comparten página, en el orden del plan
(Berel: clics, impresiones, keywords, CTR y tráfico estimado = una sola página de 5 cifras, no tres páginas). Se confirma
con TASK-1974 si el planner ya las entrega agrupadas (pregunta abierta de la task).

### Deck 16:9 — las cinco figuras (`insights-figure-waterfall`, `-waffle`, `-donut`, `-stacked`, `-stat`)

Misma retícula que las láminas de figura de TASK-1889: fondo navy, columna izquierda de 372 px (antetítulo, cifra de
104/112/132 px según largo con `withDeckFigureSize`, bajada, filete teal, conclusión) y panel translúcido de 428 px de
alto a la derecha con título de la figura, «Fuente» a la derecha, leyenda, figura y nota; cierre en dos columnas sobre
el pie; pie con logo, edición, URL y folio.

| Lámina | Hoja | Diferencias con el A4 |
|---|---|---|
| Cascada | `Deck-Cascada.png` | totales: anterior en periwinkle, actual en teal; «Sumó» en teal oscuro; «Restó» en coral; hasta **6 pasos intermedios** |
| Waffle | `Deck-Waffle.png` | retícula ~250 px a la izquierda del panel, leyenda con cuentas a la derecha; actual teal, oportunidad coral, tercera parte periwinkle, ausencia rayada |
| Dona | `Deck-Donut.png` | fila de motores bajo el título del panel; anillo ~240 px; filas con cuenta y participación |
| Apiladas | `Deck-Apiladas.png` | base en teal, segmento superior en periwinkle; hasta **4 períodos** |
| Cifras (propuesta) | sin hoja | columna izquierda **sin cifra principal**: antetítulo, conclusión grande y lead; panel con retícula 2×2 (hasta 4 cifras); valor ~40 px en teal sobre navy, píldora con el tono de la regla única |

### Think — vista web (S6)

| Bloque | Estado hoy | Cambio |
|---|---|---|
| Cascada, dona, apiladas | ya se dibujan en `src/components/insights/ChartFigure.astro` | ninguno de forma; se verifican con los planes reales de Berel |
| Waffle | `waffleCells` dibuja 100 celdas por participación (`src/lib/insights-chart-geometry.ts`) | **un cuadro por unidad** hasta 100, igual que el PDF (misma regla de 5/10 columnas); la geometría del PDF y la de la web siguen siendo la misma |
| Tarjeta de cifra | no existe | componente nuevo con la anatomía aprobada en el Slice 1, alimentado por el tipo de figura del modelo web de TASK-1974; Think no calcula variaciones ni períodos: los toma del modelo |

## Mobile Target

Los PDF son documentos de tamaño fijo: la versión compacta es la lámina 16:9 (sección anterior). El mobile real es la
vista web de Think a **390 px**:

- Tarjetas de cifra: una columna; nombre arriba, valor a ancho completo, variación y período en una línea que puede
  partir en dos; ninguna cifra se trunca ni se escala por debajo de 28 px.
- Waffle: la retícula conserva 10 columnas hasta 100 unidades (celdas de ~24 px) o 5 columnas hasta 30; la leyenda va
  debajo de la retícula.
- Cascada: la figura ocupa el ancho; los rótulos largos parten en dos líneas; el valor de cada barra queda a su derecha.
- Dona y apiladas: el anillo o las columnas arriba, filas o leyenda debajo.
- Sin scroll horizontal de página a 390 px (se mide en el dossier).

## Action Hierarchy

Documento de lectura, sin acciones. Orden de lectura en cada página: cifra principal → conclusión → figura → qué
significa → próximo paso. En la página de cifras (propuesta): conclusión → cifras de izquierda a derecha y de arriba
abajo → próximo paso. En Think, las tarjetas no son clicables; el único control existente de la vista (descargas,
navegación del informe) no cambia.

## Visual Fidelity Mapping

| Elemento del canvas | Token / recurso | Nota |
|---|---|---|
| Total anterior de la cascada | `dataPriorOnPaper` / `dataPriorOnNavy` | como el período anterior de las demás figuras |
| Total actual de la cascada | `dataCurrentOnPaper` / `dataCurrentOnNavy` | |
| Paso «Sumó» | rol nuevo `dataStepOnPaper` / `dataStepOnNavy` en `brand-packs/axis/editorial-roles.json`, valor tomado de `axis-tokens` | hoy no existe; si AXIS no tiene el tono, se pide en AXIS, nunca un HEX en la plantilla |
| Paso «Restó» | `dataOpportunityOnPaper` / `dataOpportunityOnNavy` + signo «−» | nunca sólo color |
| Conectores de la cascada | filete punteado con el rol `rule` (papel) / `navyMuted` (navy) | los mismos roles de filete que ya usa el catálogo |
| Parte de ausencia (waffle, dona) | `dataAbsenceOnPaper` + `dataAbsenceFillOnPaper` (rayado) / `dataAbsenceOnNavy` | el rayado dice «ausencia»; no se usa para otra categoría |
| Partes 1–3 sin rol de ausencia | orden actual → oportunidad → anterior (como en el canvas) | teal y coral tienen la misma luminosidad: los separa la etiqueta directa y la cuenta, no sólo el tono |
| Segmento base de las apiladas | `dataCurrentOnPaper` / `dataCurrentOnNavy` | |
| Segmento superior | `dataPriorOnPaper` / `dataPriorOnNavy` | |
| Píldora de variación | `delta-pill` de TASK-1889 (`delta--better` / `delta--plain`) | el triángulo sigue al valor; el tono dice si el cambio es mejor o peor (`trendOf`) |
| Marca «Oportunidad» / «Estimado» | chip de `report-editorial.css` / `deck-editorial.css` (el del canvas) | texto, no sólo color |
| Cifras grandes | Poppins 700 del font pack `axis`, `font-variant-numeric: tabular-nums` | se verifica que el subset de Poppins exponga `tnum`; si no, la cifra de la tarjeta va en Geist 700 (riesgo declarado en la task) |
| Rótulos y datos | Geist con `tabular-nums` | |

## Copy Ledger

Copy reusable en `src/lib/copy/insights.ts` (`GH_INSIGHTS.catalog`); los textos propuestos se validan con
`greenhouse-ux-writing` antes de escribir JSX/plantillas:

| Clave propuesta | Texto | Uso |
|---|---|---|
| `figureEyebrow.waterfall` | «Qué explica el cambio» | antetítulo cascada |
| `figureEyebrow.waffle` | «Cómo se reparte» | antetítulo waffle |
| `figureEyebrow.donut` | «Cómo se compone» | antetítulo dona |
| `figureEyebrow.stacked` | «Cuánto del total» | antetítulo apiladas |
| `figureEyebrow.stat` | «Cifras del período» | antetítulo tarjetas (propuesta) |
| `stepAdded` / `stepRemoved` | «Sumó» / «Restó» | leyenda cascada |
| `axisFromZeroNote` | «El eje empieza en cero: los pasos se ven en su proporción real sobre el total.» | nota cascada |
| `waffleUnitNote` | «Cada cuadro es {unidad}.» | nota waffle cuando el plan no trae nota |
| `opportunity` | «Oportunidad» | chip de waffle y dona; hoy `GH_INSIGHTS` no la tiene (la leyenda de columnas usa el ejemplo de la plantilla): nace aquí y la reutilizan las columnas |
| `estimated` | «Estimado» | marca de la tarjeta |
| `vsPeriod` | «vs {período}» | variación de la tarjeta |
| `noDataIn` | «Sin dato en {período}» | tarjeta sin dato |
| `lowerIsBetter` | «Menor es mejor» | dirección de la tarjeta |

Think usa `src/lib/insights-copy.ts` sólo para rótulos de interfaz; los textos de contenido (nombres, notas, períodos)
llegan en el modelo web (modelo 1.3: las decisiones de contenido viven en el API).

## State Copy

| Estado | Qué se ve | Recuperación |
|---|---|---|
| ready | la figura con todos sus hechos medidos, como en la hoja | — |
| loading | no aplica a los PDF (documento compuesto en el worker); en Think, la vista llega renderizada en el servidor, sin estado de carga propio del bloque | — |
| empty | sin hechos suficientes (cascada sin pasos, waffle sin partes positivas, dona con una sola parte, apiladas sin dos períodos), la figura **no se emite**: el capítulo la narra y su tabla queda en el anexo | el planner de TASK-1974 no la elige como esencial (`hasFigurePage = false`) |
| partial | tarjeta sin dato: «—» y «Sin dato en {período}»; segmento o parte sin dato: hueco declarado, nunca 0; waffle con parte de ausencia rayada | la lectura lo explica; nada se rellena |
| error | cascada que no cuadra, cifra que no cabe, nombre de tarjeta de más de 3 palabras, más partes que la capacidad: el mapper **rechaza con causa** (`InsightsRenderRejectedError`) y la emisión falla cerrada | se corrige el plan o el productor; nunca se trunca ni se dibuja a medias |
| denied | lo gobiernan los permisos de la edición y del enlace compartido (TASK-1845/1848); esta task no agrega acceso | sin cambio |
| Con período anterior | píldora con flecha, cifra y «vs {período}» | |
| Sin período anterior | la tarjeta muestra valor y unidad, sin píldora ni «vs» | |
| Estimado | marca «Estimado» junto al nombre | |
| Subir es malo | rótulo «Menor es mejor» y tono invertido | |
| Más cifras que la capacidad | se reparten en páginas equilibradas (6 A4 / 4 deck) | |

## Accessibility Contract

- Cada SVG lleva `role="img"` y un `aria-label` con el resumen de sus cifras («De 1.102 a 1.284 clics: páginas de
  servicio +96, blog +71, keywords nuevas en top 3 +38, home −23»). El equivalente tabular sigue en el anexo del PDF y
  en la tabla de la vista web.
- Ninguna figura depende del color: la cascada lleva signo, el waffle y la dona etiqueta directa y cuenta, la ausencia
  rayado, la píldora triángulo y texto.
- Prueba de impresora: cada página nueva se compone también en escala de grises (`--gray`) y se mira en el dossier.
- Contraste AA medido para cifras dentro de segmentos (blanco sobre navy, tinta sobre teal) y para la cifra de la
  tarjeta en teal sobre navy.
- En Think, la tarjeta es una lista de definiciones (`<dl>`: nombre en `<dt>`, valor y variación en `<dd>`); la
  variación se lee completa («sube 12 % contra agosto 2026»), no como «flecha arriba»; foco y teclado no aplican porque
  el bloque no es interactivo.

## Implementation Mapping

- Plantillas A4: `src/lib/artifact-composer/catalogs/insights-report/report-figure-{waterfall,waffle,donut,stacked,stat}.html`
  con sus `*.slots.json`; alta en `registry.json` (`ReportFigureWaterfallPage`, `ReportFigureWafflePage`,
  `ReportFigureDonutPage`, `ReportFigureStackedPage`, `ReportFigureStatPage`) y hooks en `index.ts`.
- Plantillas deck: `src/lib/artifact-composer/catalogs/insights-deck/insights-figure-{waterfall,waffle,donut,stacked,stat}.html`
  con sus `*.slots.json`; alta en `registry.json` (`InsightsFigure{Waterfall,Waffle,Donut,Stacked,Stat}Slide`) y hooks
  envueltos en `withDeckFigureSize` (la lámina de cifras no usa cifra principal).
- Geometría pura: `catalogs/insights-shared/figure-svg.ts` (`waterfallSvg`, `waffleSvg`, `donutSvg`,
  `stackedColumnsSvg`) sobre `waterfallGeometry`, `sliceGeometry` y `barGeometry` del motor
  (`src/lib/artifact-composer/chart-geometry.ts`); el waffle por unidad es una función nueva en el motor
  (`waffleUnitGeometry`) para no romper `waffleGeometry`, que sigue sirviendo al reparto por participación.
- Mapper: `src/lib/efeonce-insights/render/figure-slots.ts` (`FigureKind` + `FIGURE_CONTENT_TYPE` + `FIGURE_CAPACITY`
  + `PDF_FIGURE_FAMILIES` + `hasFigurePage`), consumido sin cambios de forma por `report-mapper.ts` e
  `insights-deck-mapper.ts`.
- Copy: `src/lib/copy/insights.ts`.
- Fidelidad: fixtures `scripts/insights/canvas-fixtures/{report,deck}/44-figura-cascada.json`, `45-figura-waffle.json`,
  `46-figura-dona.json`, `47-figura-apiladas.json` con los datos del canvas; `48-figura-cifras.json` con `reference:
  null` hasta que exista la hoja aprobada.
- Think: `src/components/insights/ChartFigure.astro` (waffle por unidad), componente nuevo de tarjeta en
  `src/components/insights/`, tipos en `src/lib/insights.ts`, geometría en `src/lib/insights-chart-geometry.ts`,
  estilos en `src/styles/insights.css`, fixtures en `src/lib/insights-fixtures.ts`, pruebas en `tests/insights.test.ts`.

## GVC Scenario Plan

- Quality profile: premium
- PDF (sin ruta de portal; el harness es el del Artifact Composer):
  - `pnpm insights:canvas-fidelity --only=Cascada|Waffle|Donut|Apiladas` y `--gray`: ≤ 1 % contra las ocho hojas a
    tamaño nativo (A4 794×1123 y lámina desktop 1280×720).
  - Tarjeta de cifra: fidelidad contra `Premium-Cifras.png` / `Deck-Cifras.png` una vez aprobadas en el Slice 1.
  - `pnpm composer:visual-gate --catalog=insights`: los diez frames nuevos declarados en `BASELINE_DELTAS.md` y
    congelados en el mismo commit; baseline del resto intacto.
  - Scroll-width del lienzo: `assertSlideFitsCanvas` rechaza cualquier desborde de página o lámina.
  - Vista previa real: `scripts/insights/preview-edition.ts --editorial-v2` con Berel (SEO + AEO) y Sky (ICO),
    septiembre 2026 contra agosto.
- Think (vista web S6):
  - `scripts/capture-insights-report.mjs` a 1440 px desktop y 390 px mobile sobre fixtures con tarjetas y waffle por
    unidad, y sobre el modelo real de Berel servido por staging.
  - scroll-width: `document.documentElement.scrollWidth <= innerWidth` a 390 px.
  - `pnpm audit:insights-a11y` (contraste y nombres accesibles).
- Review dossier: `docs/ui/reviews/TASK-1975-efeonce-insights-new-figure-pages/README.md` con hojas lado a lado en
  color y en gris, capturas de Think desktop y 390, y el antes/después de Berel y Sky.
- Baseline decision / surface ID: frames `templates-insights-report/ReportFigure{Waterfall,Waffle,Donut,Stacked,Stat}Page`
  y `templates-insights-deck/InsightsFigure{Waterfall,Waffle,Donut,Stacked,Stat}Slide` nuevos; ninguno existente cambia.

## Design Decision Log

- Decision: construir las páginas de las cinco figuras que el criterio de 2026-10-03 pide y que TASK-1974 alimenta,
  con la anatomía de figura de TASK-1889; la cascada se mueve aquí desde el follow-up de TASK-1958/TASK-1902 (decisión
  del operador, 2026-10-03).
- Decision: la tarjeta de cifra se diseña antes de implementarse (Slice 1) porque no tiene hoja; propuesta recomendada,
  retícula de cifras sin borde ni fondo gris y sin cifra principal en el héroe.
- Decision: el waffle dibuja **un cuadro por unidad** (criterio §5: «cada cuadro es una unidad»). Hoy PDF y Think
  reparten 100 celdas por participación, lo que convierte 8 respuestas en 100 cuadros. Se cambia en ambos a la vez para
  que la web y el PDF sigan diciendo lo mismo.
- Decision: cifras derivadas permitidas y declaradas, además del % de la meta que ya existe: participación de una parte
  (parte ÷ suma), total de una pila (suma de segmentos) y su participación base. Siempre con sus hechos a la vista y con
  el formateador canónico; nunca una resta para producir una parte.
- Decision: una cascada no se pagina y un waffle o una dona no se truncan: con más partes que la capacidad, la figura no
  se emite y el planner lo sabe por `hasFigurePage`.
- Alternatives considered: (a) dejar la tarjeta de cifra como fila dentro del resumen ejecutivo (rechazado: el criterio
  la hace figura de capítulo y el resumen ya tiene sus esenciales); (b) tarjetas con borde sobre fondo gris (rechazado
  por la dirección aprobada, «card soup»); (c) waffle de 100 celdas por participación (rechazado por el criterio).
- Why this pattern: reutiliza la retícula, los hooks, la píldora, el gate de fidelidad y el gate visual de TASK-1889;
  ninguna superficie nueva de portal.
- Reuse / extend / new primitive: `extend` (cinco plantillas por catálogo, cuatro funciones de geometría, una función de
  motor y un componente de Think).
- Open risks: el rol de cada parte (ausencia, oportunidad) y la marca «estimado» dependen de que el contrato de
  TASK-1974 los traiga; el tono de «Sumó» exige un rol nuevo en el pack; el soporte de cifras tabulares de Poppins;
  la tarjeta de cifra puede requerir más de una ronda de canvas.
