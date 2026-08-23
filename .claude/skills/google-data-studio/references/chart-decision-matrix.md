# Matriz de decisión de gráficos

Última verificación documental: 2026-08-20. Confirma cambios recientes en las
[release notes](https://docs.cloud.google.com/data-studio/release-notes) y abre la referencia del gráfico antes de
usar un límite exacto.

## Selección por intención

| Pregunta                                      | Gráfico preferido       | Forma mínima de datos                   | Evita cuando                                                        |
| --------------------------------------------- | ----------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| ¿Cuál es el valor actual o contra un período? | Scorecard               | 1 métrica; fecha opcional               | el número necesita distribución o explicación causal                |
| ¿Cómo progresa contra una meta?               | Bullet                  | valor + target/rangos                   | necesitas mostrar historia temporal                                 |
| ¿Está dentro de un rango operativo?           | Gauge                   | valor + thresholds claros               | hay muchas entidades o el target es ambiguo                         |
| ¿Cómo cambia en el tiempo?                    | Time series             | fecha válida + métrica                  | el eje X no es temporal                                             |
| ¿Cómo cambia por categoría ordenada?          | Line                    | dimensión ordenable + métricas          | categorías sin continuidad o demasiadas series                      |
| ¿Necesito valor y tasa juntos?                | Combo                   | eje compartido + 2 métricas comparables | las escalas inducen una correlación falsa                           |
| ¿Importa magnitud acumulada?                  | Area                    | fecha/orden + métrica                   | series superpuestas ocultan la comparación                          |
| ¿Qué categorías son mayores?                  | Bar/column              | dimensión + métrica                     | hay demasiadas categorías o labels extensos en columnas             |
| ¿Cómo se distribuye una variable?             | Histogram               | dimensión numérica + bins               | los buckets no tienen significado o la muestra es pequeña           |
| ¿Cómo comparo mediana, dispersión y outliers? | Boxplot                 | categoría + valores numéricos           | la audiencia no conoce cuartiles y no hay explicación               |
| ¿Existe relación entre dos variables?         | Scatter/bubble          | X + Y; tamaño opcional                  | se pretende demostrar causalidad o hay fuerte overplotting          |
| ¿Cuál es la composición de un total?          | Pie/donut               | 1 dimensión + 1 métrica                 | hay más de pocas categorías o diferencias pequeñas                  |
| ¿Cómo se compone una jerarquía?               | Treemap                 | jerarquía + tamaño                      | importa comparar valores muy cercanos                               |
| ¿Cómo fluye entre estados?                    | Sankey                  | origen + destino + peso                 | el flujo tiene demasiados nodos o cruces ilegibles                  |
| ¿Cómo cae a través de etapas?                 | Funnel                  | etapa ordenada + valor                  | las etapas no son secuenciales o las cohortes no son comparables    |
| ¿Qué explica un cambio neto?                  | Waterfall               | contribución positiva/negativa ordenada | las categorías no reconcilian con el total                          |
| ¿Qué ocurrió y durante cuánto?                | Timeline                | entidad + inicio/fin                    | importa precisión cuantitativa más que duración                     |
| ¿Dónde ocurre?                                | Geo chart / Google Maps | dimensión geográfica válida + métrica   | la geografía no habilita una decisión o hay ambigüedad de geocoding |
| ¿Cómo inspecciono detalle y excepciones?      | Table                   | dimensiones + métricas                  | el objetivo principal es detectar un patrón visual                  |
| ¿Cómo cruzo dos dimensiones?                  | Pivot table             | filas + columnas + métrica              | la cardinalidad produce una matriz inmanejable                      |
| ¿Cómo muestro OHLC o rangos financieros?      | Candlestick             | open/high/low/close                     | no existen los cuatro valores o el orden temporal es incierto       |

## Familias disponibles

El inventario base incluye scorecard, table, pivot table, time series, bar, column, pie, donut, line, combo, geo,
Google Maps, area, scatter, bubble, bullet, gauge, treemap, Sankey, waterfall, boxplot, candlestick, timeline,
funnel, histogram y community visualizations. Consulta
[Types of charts](https://docs.cloud.google.com/data-studio/types-of-charts) y la
[Histogram reference](https://docs.cloud.google.com/data-studio/histogram-reference).

Google Maps ofrece variantes como bubble, filled, heat y line map. Una community visualization es código de un
tercero con acceso a datos provistos por la fuente: no la selecciones solo porque falta un estilo nativo.

## Configuración común que siempre se revisa

- dimensión primaria, breakdown y drill hierarchy;
- métricas, agregación explícita y formato;
- date range dimension, rango por defecto y comparación;
- orden, secondary sort, límites Top/Bottom N y agrupación de `Others`;
- filtros persistentes y alcance de controles;
- optional metrics, metric sliders, cross-filtering y zoom/pan compatibles;
- labels, axis, legend, tooltip, reference lines/bands y conditional formatting;
- missing/null/zero handling y comportamiento cuando no hay filas;
- cardinalidad, límite de series y legibilidad a tamaño real.

No todas las propiedades existen en todos los gráficos, conectores, layouts o ediciones. Lee la referencia específica
cuando el comportamiento dependa de un límite exacto.

## Reglas de diseño

1. Una visualización responde una pregunta principal.
2. El título declara métrica, segmento y período; no repite solo el tipo de gráfico.
3. Las unidades, moneda, zona horaria y denominador deben ser visibles o inequívocos.
4. El color comunica estado o categoría estable; no decora series arbitrarias.
5. Una comparación requiere baseline compatible, no solo dos números cercanos.
6. Pie/donut, gauges y funnels se usan con cardinalidad pequeña y orden semántico.
7. Un eje truncado, doble eje o suavizado debe justificarse y no distorsionar la lectura.
8. Una tabla de detalle necesita orden inicial, columnas prioritarias y formato de excepción.
9. Verifica el gráfico con datos normales, cero, null, outlier y sin resultados.

## Polaridad, deltas y ejes

Antes de diseñar un scorecard o una tendencia declara `higher_better`, `lower_better` o `neutral`:

- `higher_better`: un aumento es favorable y un descenso es desfavorable;
- `lower_better`: un descenso es favorable y un aumento es desfavorable;
- `neutral`: no asignes verde/rojo sin thresholds o una regla de negocio explícita.

En un scorecard `lower_better`, configura el cambio positivo numérico como desfavorable y el cambio negativo como
favorable. Verifica ambas configuraciones en el panel aunque los datos actuales materialicen solo una. El color no
sustituye el label, la flecha ni una aclaración como `↓ mejora`.

Invertir un eje cambia la geometría, no la definición de negocio. Antes de activarlo determina si el ajuste opera por
serie, eje o gráfico completo y verifica todas las series. No inviertas un eje compartido para corregir una sola
métrica con polaridad opuesta. Si afecta otras métricas, conserva la orientación natural, separa la métrica en otro
gráfico o usa un eje independiente solo cuando su alcance sea verificable.

El título debe coincidir con el rango efectivo. Si un date control puede cambiarlo, usa un título neutral y muestra el
rango/cutoff visible. Un mes incompleto se etiqueta `hasta DD de mes` y no se compara con un mes completo sin una
normalización explícita.

## Modern Charts

Modern Charts está activo por defecto en reportes nuevos y cambia defaults y opciones de estilo. Antes de replicar un
look, identifica si el reporte es classic o modern. No trates una diferencia de panel como ausencia de la función.
Fuente: [Modern charts](https://docs.cloud.google.com/data-studio/modern-charts).
