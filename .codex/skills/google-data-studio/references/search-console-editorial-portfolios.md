# Search Console y portafolios editoriales

Lee esta referencia cuando el dashboard mida URLs o consultas de Google Search Console, compare contenido nuevo con
contenido reescrito o sirva como readout para cliente.

## Frontera de fuentes

Una lista externa —Notion, Sheets, CMS o brief— puede definir el inventario y metadata de las URLs, pero no reemplaza
la fuente de métricas. Normaliza y valida el dominio/canonical antes de unirla con Search Console.

Para análisis por artículo, usa una fuente Search Console de tipo **URL Impression** y declara esa agregación. No
mezcles sus totales con **Site Impression** sin explicar que la forma de contar impresiones, clics, CTR y posición
cambia. Search Console asigna habitualmente los datos a la URL canónica; si cambian slug o canonical, conserva un
mapping de continuidad.

Campos mínimos de la cohorte:

```text
canonical_url
previous_url?          # si hubo migración de slug/canonical
intervention_type      # new | rewrite
intervention_date
publish_date
topic_or_category?
owner?
```

## Semántica de Search Console

- **Clicks**: clics desde resultados de Google Search; no equivalen necesariamente a sesiones, visitas comprometidas,
  leads o conversiones.
- **Impressions**: apariciones registradas según las reglas del tipo de resultado; prueban visibilidad, no impacto de
  negocio por sí solas.
- **CTR**: `SUM(clicks) / SUM(impressions)`; no uses `AVG(CTR)` sobre filas ya agregadas.
- **Average Position**: promedio de la posición superior registrada por impresión. La posición 1 es la superior:
  **menor es mejor**.
- No promedies promedios de posición. Si modelas la exportación de Search Console en BigQuery, usa los acumuladores
  oficiales de posición e impresiones.
- La agregación por propiedad y por página cambia el resultado. Registra el grain y la tabla Search Console elegida.

Average Position es una métrica compleja y dependiente del mix de queries, páginas y apariciones. Prioriza la tendencia
de clics e impresiones y úsala como diagnóstico, no como veredicto aislado. Un valor agregado de 6,5 no demuestra que
cada URL o keyword esté en la primera página.

## Polaridad y visualización

Declara Average Position como `lower_better`.

- En scorecards, una subida aritmética es desfavorable: configura el color de cambio positivo en rojo y el negativo en
  verde; añade un label inequívoco como `Posición promedio (↓ mejora)`.
- Verifica ambos colores desde Style aunque el periodo actual solo muestre uno.
- El color no puede ser el único portador de significado.
- La opción `Reverse Y-axis direction` está documentada en la sección general de ejes. En una UI observada, invertir
  un combo afectó todas las series. Verifica el alcance en vivo y no la uses para corregir Average Position si también
  invierte clicks, impressions u otras métricas.
- Si la audiencia necesita que mejorar se vea como ascenso, prefiere un gráfico dedicado de Average Position con eje
  invertido verificable. Si no puede aislarse, conserva la orientación natural y explica `↓ mejora`.

No renombres una transformación de signo como Average Position. Si construyes un índice derivado de mejora, dale un
nombre, fórmula y baseline propios.

## Cohortes y baselines

### Contenido nuevo

No tiene un baseline preintervención equivalente. No presentes ausencia o cero como crecimiento porcentual.

Mide:

- días desde publicación/indexación;
- primera impresión y primer clic;
- acumulado y tendencia desde lanzamiento;
- ventanas comparables por edad —por ejemplo, primeros 28 o 90 días—;
- distribución por URL, query, dispositivo y país cuando ayude a decidir.

### Contenido reescrito

Compara la misma URL/canonical con ventanas pre/post equivalentes y deja visible la fecha de intervención. Controla, o
al menos declara:

- duración y días de semana comparables;
- estacionalidad;
- cambios de slug/canonical, title, template o tracking;
- cambios de query mix, dispositivo o país;
- retraso de indexación y datos preliminares.

Una coincidencia temporal no demuestra que la reescritura causó el cambio. Presenta atribución como hipótesis hasta
tener evidencia compatible.

### Portafolio mixto

Muestra el total solo junto con el desglose `new|rewrite`, la distribución por URL y la concentración Top N. Un
promedio agregado puede ocultar ganadores, pérdidas y ramp-up de contenido nuevo.

Un heatmap URL × mes sirve para detectar concentración y excepciones, pero no reemplaza KPIs, tendencia y tabla
accionable.

## Periodos y comparación

Separa dos conceptos:

- **período de cohorte**: cuándo se publicaron o reescribieron los artículos;
- **período de medición**: fechas de datos incluidas en las métricas.

Título, subtítulo, date control y cutoff deben permitir distinguir ambos. No rotules `Junio–Agosto` si el rango
efectivo comienza en mayo sin declararlo. Un mes en curso se muestra como `hasta DD de mes`; compáralo con igual
cantidad de días o usa meses completos. La fecha más reciente puede ser preliminar.

Antes de presentar un delta, registra `current_range`, `comparison_range`, duración, zona horaria, cutoff y si cada
periodo es `completo|parcial|preliminar`.

## Lectura y pitch para cliente

Usa esta escalera de evidencia:

```text
actividad: contenido publicado o reescrito
resultado observado: impressions, clicks, CTR y Average Position en Search Console
interpretación: patrón o hipótesis sustentada por desglose query/URL/cohorte
impacto de negocio: sesiones, leads, conversiones o ingresos validados en la fuente correspondiente
```

Clicks e impressions al alza con Average Position peor **pueden** ser compatibles con expansión de cobertura, pero no
la prueban. Valida por query, URL y cohorte antes de atribuir la causa.

Estructura el readout en:

1. hechos observados y período exacto;
2. contribución y concentración por cohorte/URL;
3. oportunidades —CTR, posición, cobertura o canibalización—;
4. hipótesis explícitamente rotuladas;
5. siguiente acción y criterio de éxito;
6. límites de atribución y fuente necesaria para demostrar negocio.

Pitch base seguro:

> Desde [fecha] se implementó un programa mixto de creación y optimización editorial. Search Console registra
> [resultados observados] para las URLs intervenidas durante [rango y cutoff]. La siguiente fase es consolidar las
> cohortes, mejorar CTR y rankings prioritarios, y conectar estos resultados con conversiones para medir impacto de
> negocio.

## QA focal

- El inventario externo contiene solo URLs permitidas y el blend usa la canonical correcta.
- Fuente Search Console, aggregation type, grain y fórmulas están declarados.
- Cohorte y período de medición no se confunden.
- Nuevos y reescritos no comparten un baseline inválido.
- Meses parciales/preliminares y comparison range están visibles.
- Average Position respeta `lower_better` en delta, flecha, color, eje y copy.
- Un combo no invierte otras series para acomodar Average Position.
- El readout separa hecho, inferencia e impacto demostrado.
- Conversiones o revenue no se atribuyen a Search Console sin una fuente onsite/negocio.

Fuentes: [definición de clicks, impressions y posición](https://support.google.com/webmasters/answer/7042828),
[análisis del informe de rendimiento](https://support.google.com/webmasters/answer/17010961),
[agregación por propiedad y página](https://support.google.com/webmasters/answer/17011364),
[fórmulas de exportación](https://support.google.com/webmasters/answer/12917174),
[Search Console y Google Analytics](https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console),
[conector Search Console](https://docs.cloud.google.com/data-studio/connect-to-search-console),
[rangos y comparaciones](https://docs.cloud.google.com/data-studio/set-report-date-ranges),
[series temporales](https://docs.cloud.google.com/data-studio/time-series-reference),
[gráficos combinados](https://docs.cloud.google.com/data-studio/line-chart-and-combo-chart-reference) y
[scorecards](https://docs.cloud.google.com/data-studio/scorecard-reference).
