# Visualización de datos para informes

Diseña cada figura para responder una pregunta con datos trazables. Este módulo no autoriza a recalcular
métricas con otra metodología; carga primero el [contrato de evidencia](evidence-and-continuity.md).
La marca y los assets se resuelven en el [overlay Efeonce](efeonce-overlay.md).

## 1. Contrato mínimo de figura

Antes de dibujar, registra en la fuente editable:

| Campo | Pregunta que resuelve |
|---|---|
| ID y pregunta | ¿Qué necesita entender el lector? |
| Mensaje | ¿Cuál es la conclusión respaldada? |
| Métrica y unidad | ¿Qué se cuenta, mide o estima? |
| Ámbito y población | ¿A qué cliente, proyecto o universo corresponde? |
| Período y corte | ¿Cuándo ocurrió y cuándo se comprobó? |
| Fuente y consulta | ¿Puede reproducirse o rastrearse? |
| Numerador, base y cobertura | ¿Qué casos entran y cuáles faltan? |
| Método | ¿Qué cálculo, transformación o versión se utilizó? |
| Geometría y escala | ¿Cómo representa las magnitudes? |
| Color y etiquetas | ¿Qué significa cada categoría? |
| Descripción equivalente | ¿Se entiende sin ver el gráfico? |
| Salvedad | ¿Qué límite cambia su interpretación? |

El registro es de producción; no todo debe aparecer como una ficha técnica en el PDF.
La figura sí debe mostrar lo suficiente para interpretarse sin reconstruir su contexto remoto.

## 2. Elegir el gráfico por relación

| Relación principal | Punto de partida | Evita |
|---|---|---|
| Comparar magnitudes | Barras con origen común | Burbujas de área difícil de comparar |
| Ranking | Barras ordenadas | Orden alfabético cuando oculta prioridad |
| Cambio entre dos períodos | Barras pareadas o puntos conectados | Inventar trayectoria intermedia |
| Serie temporal | Línea o columnas según naturaleza | Espaciar fechas irregularmente sin indicarlo |
| Parte de un total | Barra apilada o proporción simple | Componentes que no suman un universo común |
| Diferencia frente a referencia | Variación con cero o referencia visible | Color de éxito sin meta definida |
| Distribución | Histograma, puntos o formato pertinente | Promedio que oculta dispersión relevante |
| Consulta de valores exactos | Tabla | Gráfico que obliga a estimar cada cifra |

Estas elecciones siguen la relación de los datos, no una cuota de variedad visual.
[ONS](https://service-manual.ons.gov.uk/data-visualisation/chart-types/choosing-a-chart-type)
recomienda formatos familiares y separar relaciones cuando una figura se vuelve compleja.
No hace falta graficar cada tabla. Conserva el detalle completo en datos o anexos accesibles.

## 3. Integridad de escala y geometría

- Barras y áreas parten de cero cuando longitud o área representan magnitud desde el eje.
- No apliques ancho mínimo decorativo a valores pequeños; alteraría la proporción real.
- Comparaciones equivalentes usan la misma escala, o una diferencia explícita y necesaria.
- Paneles de métricas distintas declaran unidades y escalas; no simulan una comparación de tamaños.
- Una línea puede necesitar eje recortado; haz visible el rango y evita exagerar variaciones triviales.
- No uses doble eje para sugerir que dos métricas se mueven juntas; separa gráficos cuando sea posible.
- Declara logaritmos, índices, normalización o porcentajes acumulados si se emplean.
- Representa ausentes como ausentes; no los interpolas ni los conviertes en cero silenciosamente.
- Evita 3D, perspectivas, áreas decorativas y pictogramas cuyo tamaño distorsione la comparación.
- Recalcula longitudes y etiquetas desde la misma fuente; no mantengas cifras duplicadas a mano.

Base: [ONS: Axes and gridlines](https://service-manual.ons.gov.uk/data-visualisation/guidance/axes-and-gridlines).
Una figura agradable no compensa una escala que altera el mensaje.

## 4. Mensaje, subtítulo y contexto local

- Escribe un titular de conclusión breve y específico, en lugar de «Resultados» o «Gráfico 1».
- Añade medida, ámbito y período en subtítulo, sin repetir lo ya dicho en el título.
- Numera figuras cuando facilite referencias; conserva IDs estables en el material editable.
- Sitúa la fuente directamente debajo y explica transformaciones que afectan la interpretación.
- Usa las mismas etiquetas en gráfico, texto y tabla; explica siglas dentro de la figura si es necesario.
- Prefiere etiquetas directas cuando evitan viajes entre leyenda y serie.
- Las notas esenciales quedan junto al gráfico; método extenso puede enlazarse al capítulo pertinente.
- No atribuyas causalidad en el titular si los datos sólo muestran coincidencia o variación.

Base: [ONS: Chart text](https://service-manual.ons.gov.uk/data-visualisation/guidance/chart-text).
Su objetivo de títulos de hasta 15 palabras es orientación editorial, no un truncado automático.

## 5. Porcentajes, stocks y cohortes

- Muestra numerador/base cuando su ausencia pueda inducir una lectura equivocada.
- Diferencia porcentaje de variación y puntos porcentuales; conserva precisión coherente.
- No presentes 100% sobre casos documentados como 100% del universo si hay registros sin evidencia.
- Separa producción acumulada de producción del período y producción de resultado comercial.
- No sumes entregables, archivos, adaptaciones y paquetes sin definir una unidad común.
- No dibujes un embudo con métricas de fuentes distintas sin población y tránsito verificables.
- No compares clientes o meses si cambian cobertura, definición o método sin explicarlo.

Ejemplo de prueba: 55/74 cierres en fecha y 63/63 primeros envíos documentados en fecha son indicadores
diferentes; los 11 envíos sin fecha deben permanecer visibles. Un cierre posterior no prueba entrega tardía.
Esta prueba deriva del caso Berel, no define una fórmula universal de On-time.

## 6. Color, accesibilidad e impresión

- Usa los colores institucionales verificados; no adoptes la paleta de una fuente de investigación.
- Conserva el significado de cada color entre figuras; no reutilices el acento arbitrariamente.
- Usa pocas categorías cromáticas y combina color con texto, posición o patrón cuando corresponda.
- Contrasta texto y elementos significativos sobre el fondo real del PDF.
- Prueba escala de grises para documentos imprimibles: la conclusión no debe desaparecer.
- Conserva gráficos vectoriales cuando sea viable y texto seleccionable en el resultado exportado.
- Incluye descripción textual del hallazgo; añade tabla cuando importa consultar valores exactos.
- Verifica lectura de etiquetas y orden semántico en PDF; HTML accesible no prueba PDF accesible.

Bases: [ONS: Colour](https://service-manual.ons.gov.uk/data-visualisation/colours/using-colours-in-charts)
y [Analysis Function: Publishing charts](https://analysisfunction.civilservice.gov.uk/support/communicating-analysis/introduction-to-data-visualisation-e-learning/module-10-publishing-charts/).

## 7. Incertidumbre, validez y revisión

Si el límite cambia la conclusión, muéstralo junto al dato. No inventes rangos estadísticos para un problema
de validez metodológica. Un score de un instrumento mal configurado no se convierte en estado de negocio
por dibujarlo como medidor. Conserva el resultado técnico con su condición o exclúyelo de comparaciones.
[ONS](https://service-manual.ons.gov.uk/data-visualisation/guidance/showing-uncertainty-in-charts)
explica cuándo la incertidumbre altera la lectura; su aplicación a validez de instrumentos es una inferencia.

Revisión obligatoria: fuente→cálculo→etiqueta→geometría→texto. Pide al revisor explicar qué comparación ve,
sin anticipar la respuesta. Si difiere del mensaje respaldado, modifica la figura. Comprueba además leyendas,
fuentes, cortes de página y tamaño de lectura en el archivo final, no sólo en el generador.

Fuentes consultadas el 2026-09-04. [IBCS 2.0](https://www.ibcs.com/ibcs-version-2-0/) es la edición vigente
identificada entonces; los criterios de este módulo no constituyen certificación IBCS ni conformidad ISO.
