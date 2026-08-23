# Modelado, controles y blends

## Modelo mental

```text
dataset → connector → data source → report → page/section → component
```

Un campo tiene nombre, ID interno, tipo, agregación, semántica y grain. Antes de construir un KPI registra:

- definición de negocio y propietario;
- numerador, denominador y tratamiento de null/zero;
- grain de cada fila y claves únicas;
- zona horaria, calendario y date range dimension;
- agregación válida y unidad/formato;
- filtros que aplican y exclusiones deliberadas;
- reconciliación esperada contra la fuente.

No repares una definición ambigua con copy o formato. La semántica se resuelve antes del chart.

## Campos calculados

### Data source

- Reutilizables por todos los reportes que usan la fuente.
- Pueden participar en charts, controles, filtros y otros calculated fields.
- Requieren permiso de edición de la fuente.
- No trabajan directamente sobre el resultado combinado de un blend.

### Chart-specific

- Viven solo en el chart, aunque copiar el chart conserva el campo.
- Pueden operar sobre blended data.
- No pueden referenciar otro calculated field chart-specific del mismo chart.
- Requieren Field Editing in Reports habilitado cuando corresponda.

Prefiere data-source fields para métricas canónicas compartidas y chart-specific fields para una transformación local
que no merece ampliar el modelo. Declara agregación en la fórmula cuando el resultado depende de ella; evita mezclar
campos agregados y no agregados sin comprender el cálculo.

Fuente: [About calculated fields](https://docs.cloud.google.com/data-studio/about-calculated-fields) y
[Function list](https://docs.cloud.google.com/data-studio/function-list).

## Parámetros

Los parámetros almacenan text, number o boolean. Pueden recibir valor desde default, properties, control, URL,
BigQuery custom SQL o community connector. Úsalos para escenarios, targets, selectores y consultas parametrizadas;
no como sustituto de un filtro de seguridad.

Checklist:

- ID estable; cambiarlo rompe componentes y fórmulas dependientes;
- tipo, valores permitidos/rango y default explícitos;
- control compatible y estado reset verificable;
- saneamiento y allowlist cuando alcanza SQL/conector;
- ninguna tabla, cuenta, proyecto o dataset sensible seleccionable sin autorización;
- URL sin valores sensibles y sin asumir que compartir el link es inocuo.

Fuente: [Parameters](https://docs.cloud.google.com/data-studio/parameters).

## Filtros y controles

No mezcles estas superficies:

| Superficie                | Quién la define/usa | Propósito                                                         |
| ------------------------- | ------------------- | ----------------------------------------------------------------- |
| Filter property           | editor              | inclusión/exclusión persistente antes de que el viewer interactúe |
| Filter control            | editor/viewer       | filtrar por una dimensión                                         |
| Parameter control         | editor/viewer       | entregar input a un parámetro                                     |
| Date range control        | editor/viewer       | cambiar período sobre la date range dimension                     |
| Data control              | viewer              | cambiar dataset/cuenta compatible                                 |
| Dimension control         | viewer              | cambiar dimensión expuesta                                        |
| Filter bar / quick filter | viewer/editor       | análisis ad hoc y lectura de filtros aplicados                    |
| Chart cross-filter        | viewer              | usar selección/brushing del chart como filtro                     |
| Metric slider             | viewer              | limitar valores de métrica en un chart                            |

Tipos habituales: drop-down, fixed-size list, input box, advanced filter, slider, checkbox, preset filter, date range,
data control, dimension control y button.

### Alcance

- Un control normalmente afecta componentes compatibles de su página.
- Un control agrupado o dentro de una sección puede limitarse a esa región.
- Un control report-level puede persistir entre páginas cuando el layout lo soporta.
- Chart, group/section, page y report pueden aportar filtros persistentes adicionales.
- Controles pueden filtrarse entre sí.

### Varias fuentes

El filtro cruza fuentes por **field ID**, no por label visible. Conectores fixed-schema como Google Ads/Analytics
pueden compartir IDs automáticamente. Fuentes flexibles o de tipos distintos requieren unificación explícita de IDs
cuando la función esté disponible, o un modelo/blend compatible. Verifica cada chart; nunca asumas que dos campos
llamados `Country` reaccionan igual.

Para unificar IDs en la UI actual: `Resource → Manage field names and IDs → Add field override`; selecciona el campo
y asigna el mismo `New ID` a campos semánticamente equivalentes. El override existe solo a nivel de reporte. Los
campos deben tener el mismo tipo y significado. Cambiar un ID ya usado rompe los charts dependientes, que deben
reconectarse manualmente; por eso registra los consumers, trabaja con rollback y valida todos los charts después.

Fuentes: [About controls](https://docs.cloud.google.com/data-studio/about-controls),
[Filter across data sources](https://docs.cloud.google.com/data-studio/use-controls-across-data-sources),
[Filter properties](https://docs.cloud.google.com/data-studio/about-filter-properties) y
[Chart cross-filtering](https://docs.cloud.google.com/data-studio/chart-cross-filtering).

## Blends

Un blend combina hasta cinco tablas/data sources dentro del reporte. Soporta joins inner, left, right, full outer y
cross según la configuración vigente. Data Studio prepara/agrega cada tabla antes del join; por eso una clave no única
o grains incompatibles pueden cambiar totales sin producir un error visible.

Antes de unir:

1. escribe el grain de cada tabla;
2. demuestra cardinalidad de la join key y normaliza tipo/formato;
3. define qué lado debe preservar filas;
4. anticipa nulls y multiplicación/colapso de filas;
5. separa filtros pre-blend de filtros posteriores;
6. reconcilia cada tabla sola, luego el join y finalmente el chart;
7. prueba un caso conocido y un caso que no debe matchear.

Los calculated fields dentro de una tabla del blend solo referencian campos de esa tabla. Para calcular con campos de
tablas distintas, incluye los campos y crea un calculated field chart-specific sobre el blend.

Fuentes: [How blends work](https://docs.cloud.google.com/data-studio/how-blends-work) y
[Advanced blending concepts](https://docs.cloud.google.com/data-studio/blending-tips-and-advanced-concepts).
