# 16 · Numeración editorial e identidad estable

> Corrección autorizada por el operador el 2026-09-03. Canon: Playbook Producción vivo.
> Número editorial, posición de banner y nombre físico de archivo son conceptos distintos.

## Antes de asignar un número

1. Resolver proyecto/mes, ID del artículo en Content Hub y tarea principal por relación.
2. Inventariar el mes completo: reescrituras, nuevos, tutoriales, slots por definir y adicionales
   autorizados. No numerar solo las piezas ya redactadas ni según el orden de ejecución.
3. Continuar desde el bloque del mes anterior y reservar todos los slots del mes antes del siguiente.
   Un slot sin tema puede tener número/tarea principal; no genera subtareas visuales sin texto.
4. Registrar un índice ordenado por número con enlaces al artículo y su tarea. Número no significa
   fecha de publicación, prioridad, cantidad de piezas ni orden de escritura.
5. Antes de añadir una pieza extra, comprobar números ya asignados a meses posteriores. Si hay
   colisión, pedir decisión sobre el bloque; no renumerar trabajo existente por cuenta propia.

## Identidad, dependencias y corrección autorizada

- El ID de página y sus relaciones son estables. N## es una etiqueta editorial.
- Artículo N48 y Banner N2 no pertenecen a la misma secuencia: N2 es la posición del banner.
- Una corrección exige mapa anterior → vigente por ID, snapshot y alcance de meses autorizado.
- Aplicar el mapa simultáneamente desde originales; no encadenar reemplazos sobre texto ya cambiado.
- Antes de las dependencias, normalizar las tareas principales por ID y verificar todos los títulos:
  secuencia única por mes, número correcto y tema intacto. No declarar terminado un lote parcial.
- Un título como `Artículo N48 - 79 años de Rayados` contiene un número editorial y una edad,
  no un rango. Para reconocer rangos, exigir ambos prefijos (`N48–N50`); probar títulos con años,
  números en el tema, rangos reales, posiciones de banners, URLs y alias de archivos.
- Validar el resultado contra la tabla artículo/ID/mes, además del texto esperado por el reemplazo:
  comparar únicamente contra la salida del mismo transformador puede validar su propio error.
- Revisar títulos, planes, referencias cruzadas, tareas principales, banners, fotos, sociales,
  subítems, proyectos y documentos operativos vigentes. No basta renombrar la principal.
- Conservar texto editorial, estados, responsables, fechas, relaciones, tipo/canal, cupos y gates.
  No revertir cambios humanos usando una auditoría vieja como snapshot.
- No renombrar URLs, archivos existentes, Frame.io, CMS ni recursos entregados por inferencia.
  Conservar sus nombres como alias de archivo y añadir una equivalencia visible en la ficha.
  Los nombres históricos no autorizan reutilizar el antiguo número para identificar otra pieza.
- Auditorías cerradas e historial conservan la numeración de su fecha, con enlace al mapa vigente.
- Antes de cada write, releer y comparar; si cambia el fragmento objetivo, detener esa página.
  Cerrar con readback por ID y comprobación de secuencia, unicidad y referencias.

## Noviembre/diciembre 2026

Noviembre: N43–N51 (ocho piezas base + Navidad adicional). Diciembre: N52–N59 (ocho piezas).
N43–N47 permanecen. Mapa autorizado:

| Anterior | Vigente | Artículo |
| --- | --- | --- |
| N51 | N48 | Rendimiento de cubeta |
| N52 | N49 | Pintar sobre esmalte |
| N53 | N50 | Pintura que se desprende |
| N59 | N51 | Navidad |
| N48 | N52 | Rayados |
| N49 | N53 | 8M |
| N50 | N54 | Día de las Madres |
| N54 | N55 | Resanar pared |
| N55 | N56 | Rodillos |
| N56 | N57 | Techo |
| N57 | N58 | Papel tapiz |
| N58 | N59 | Pintura sobrante |

**Adicional de septiembre (2026-09-16):** `N61 — Colores de Temporada Berel 2027`, en
`Produccion Creativa - Septiembre 26`, publicación 2026-09-29. Se tomó el siguiente número libre después de N60
(Raíces de la piel, también en septiembre); no reabre el mapa de noviembre/diciembre.

**Adicionales de diciembre (2026-11-04):** `N62 — Colores de Temporada Berel 2027: Umbral Vivo` (reserva de
publicación 2026-12-01; sale en enero y conserva el número) y `N63 — Color a la Mexicana: colores vivos con blanco para
tu casa` (2026-12-06). Siguientes números libres después de N61, ordenados por fecha de reserva; no reabren el mapa de
noviembre/diciembre ni reutilizan N53/N54, que siguen siendo del 8M y del Día de las Madres aunque se movieron de mes.
El artículo de cierre de año («Conectar Umbral Vivo») sigue sin número: el siguiente libre es N64. Verificado con una
consulta SQL a los títulos de Tareas y Content Hub (máximo encontrado: N61).

Octubre y meses anteriores excluidos. La renumeración no reabre la distribución aprobada.
Evidencia y estado: [auditoría](../../../../docs/audits/seo/BEREL_EDITORIAL_NUMBERING_2026-09-03.md).

**N52 conserva su número tras la reescritura (2026-11-05).** Rayados pasó de «79 años de Rayados» a «Colores de
Rayados: la historia del azul y blanco» (módulo 03). Cambiar el tema o el título de la misma página no es una
renumeración: el ID y el N52 siguen, y la carpeta de entrega se llama `Artículo N52 - Colores de Rayados la historia
del azul y blanco` (sin los dos puntos del título), con los sociales `N52_SM_…`. El ejemplo `Artículo N48 - 79 años
de Rayados` de arriba queda como alias histórico.

## Artículos sin número asignado (2026-11-04)

Un artículo que queda fuera del mapa vigente **no recibe un N## inventado** para poder entregarse. *Caso
2026-11-04:* Color a la Mexicana y Umbral Vivo no figuran en el mapa de noviembre/diciembre.

- Se entrega como `Artículo (sin número) - <Título>` en `04_Entregables`
  (→ [`08`](08_PUBLICACION_CMS_DRUPAL.md), § La carpeta de entrega en OneDrive), con los sociales nombrados por slug:
  `<slug>_SM_POST.png`, `_SM_STORIE.png`, `_SM_PINTEREST.png`, `_SM_REEL.mp4`.
- Cuando este módulo le asigne N##: renombrar la carpeta a `Artículo N## - <Título>`, los sociales a `N##_SM_…` y
  actualizar toda referencia a la ruta o a los archivos (notas de Notion, tareas). Es la primera asignación, no una
  renumeración: la regla de conservar alias aplica a correcciones de un número que ya existía.
- La carpeta del mes sigue la reserva de la página. Umbral Vivo se publica en enero, pero su página conserva la reserva
  del 1 de diciembre: quedó en `07. Articulos Diciembre` y puede pasar a `08. Articulos Enero` cuando se confirme la
  fecha.
