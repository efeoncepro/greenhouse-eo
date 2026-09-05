# Revisión de dirección de arte, UI/UX y evidencia · Berel agosto 2026

## Encargo y criterio

Presentación A4 horizontal de 15 láminas para que Berel exponga el mes ante su directorio. Conservar precisión y continuidad, mejorar identidad de agencia, ritmo y comprensión de las prioridades. HTML/CSS es la matriz, PDF el entregable. Sin PPTX. La contraportada es la oficial BackCoverFull.

Skills aplicadas: Greenhouse AI Design Studio, UX Content Accessibility, Enterprise Review, Design Studio (fundamentos y Key Visual Audit), Report Studio y Deck Studio. Se aplican sus criterios de composición, jerarquía, retícula, contraste y lectura; los controles de interacción de una aplicación no son requisitos de un deck estático. La auditoría visual es juicio editorial, no aprobación del cliente.

## Diagnóstico que motivó esta ronda

1. La misma silueta de columnas aparecía en demasiadas páginas. Limpiar cajas no había construido ritmo.
2. El dato preliminar del Grader competía con métricas observadas por tamaño y posición.
3. La producción se reducía a cantidades sin mostrar resultados creativos reales.
4. La magnitud de las caídas comerciales quedaba subordinada a un número «2» sin valor analítico.
5. On-time mostraba tres cifras equivalentes aunque cobertura es una condición de interpretación del envío.
6. Los acuerdos de seguimiento repetían la matriz de ejecución en vez de hacer visible el próximo hito.

## Revisión por lámina

| Lámina | Decisión de diseño y evidencia |
|---|---|
| 01 · Portada | Conservar apertura editorial: título Informe mensual, edición 08 y agosto 2026. No reintroducir el eslogan ni el panel lateral rechazados. Logos con roles de cliente/emisor. |
| 02 · Balance | Mantener comparación de las tres señales, identificar Analytics y Google con logos oficiales junto a sus cifras. El signo menos y los textos conservan significado sin depender del color. |
| 03 · Google | Identificar la fuente con logo Google; barras con origen cero, cifras exactas y descenso absoluto acompañado de límite causal. |
| 04 · Editorial | Misma gramática de comparación que 03, con cohorte editorial y limitación explícitas. |
| 05 · Recorridos | Dos comparaciones independientes y escala común 0–643; protagonistas −83,7% y −43,3%, calculados desde los slots. Iconos de localizador y aplicación. |
| 06 · IA | Evidencia medida dominante, sesiones atribuidas secundarias y Grader en un bloque de calibración. Logos de Google, Analytics y los cuatro motores identifican fuentes, no acreditan liderazgo ni comparabilidad. |
| 07 · Producción acumulada | Dos ejemplos reales del programa, cotejados con el informe y capturados de las páginas publicadas. Cantidades y unidad junto a la evidencia visual. Imágenes completas, sin deformar o cortar marca. |
| 08 · Producción mensual | Iconos de artículo, diseño y video; composición cuantitativa 8 + 54 + 10 + 2, con leyenda y distinción de carga operativa. |
| 09 · On-time | Dos mediciones separadas; cobertura 63/74 integrada al envío 63/63. Barras etiquetadas y 19 cierres posteriores visibles. Retirar el waffle sin leyenda. |
| 10 · Continuidad | Registro de mejoras con iconos de organización, rastreo y documento. No presentar los 33 hallazgos como 33 cierres. |
| 11 · Conexiones | Controles con base 115, grupos superpuestos, valores visibles y eje cero. Icono de relaciones identifica el tema sin inferir causalidad. |
| 12 · Medición | Estado observado en azul y siguientes comprobaciones unidas por una línea discontinua. No convertirlo en un embudo de conversiones ni inferir ventas. Analytics identifica la fuente observada. |
| 13 · Ejecución | Matriz de responsables, trabajo y alcance; iconos de contenido, navegación y criterio de producto. |
| 14 · Acuerdos | Hito del 6 de octubre de 2026 con icono calendario y tres coordinaciones al lado. La fecha sigue rotulada como revisión prevista, no fecha de implementación. |
| 15 · Contraportada | Conservar composición oficial Efeonce, incluidos redes y contacto propios de esa plantilla. |

## Activos y color

Los colores principales son azules Efeonce y rojo Berel. Los logos de plataformas conservan sus propios colores por pedido del operador. Iconos Tabler (MIT) y logos SVG Logos del paquete existente (CC0 para el recurso, sin alterar la titularidad de marcas); Gemini usa el isotipo local oficial. Inventario: `assets/platform-icons.json`. Las dos capturas reales y sus URLs, fechas y método están en `assets/provenance.json`. Son ejemplos de piezas del programa, no prueba de la fecha exacta de primera publicación ni una nueva medición de desempeño.

## Verificación

Se revisaron capturas del PDF, no sólo el HTML. Se corrigió un selector que había capturado un icono social en lugar de la imagen principal, se seleccionaron las imágenes por su recurso observado y se inspeccionaron antes de la entrega. Se corrigió el ancho mínimo de la agenda de 14 para impedir que el texto empujara la columna fuera de su retícula. Se reemplazó la marca textual de Gemini demasiado pequeña por su isotipo.

`qa.json` conserva integridad del texto, A4, recursos, enlaces y fuentes. La verificación HTML registrada correspondió a una iteración anterior; debe repetirse si el HTML autónomo se usa como entregable final. Las imágenes reales se incorporaron como recursos de evidencia; el documento mantiene texto y gráficos vectoriales. No se afirma conformidad PDF/UA ni aceptación estética del cliente.

### Portada con pintura en relieve — 4 de septiembre de 2026

Se sustituye el numeral decorativo 08 por una imagen generada de pintura en relieve a sangre. El peso visual se concentra a la derecha; título factual, período y marcas oficiales ocupan el espacio claro izquierdo. Los logos y textos son elementos independientes de la imagen. La procedencia del recurso está registrada en `assets/cover-paint-sculpture.provenance.json`.

Verificación: inspección visual de la página 1 del PDF final, exportación de 15 páginas A4 horizontal y comprobaciones de texto, fuentes incrustadas, enlaces y política de contacto mediante `finish-and-check.py`. Sin cambios en el contenido de las páginas interiores por esta revisión.
