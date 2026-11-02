# Revisión y estados

## 1. Píxel al 100 %, en este orden

| Qué | Falla típica |
|---|---|
| Manos | Dedos de más o fundidos, escala equivocada respecto del objeto, apoyos imposibles |
| Arquitectura | Líneas que se curvan, ventanas fuera de ritmo, pisos que cambian de altura |
| Texturas | Adobe, fruta, ladrillo o adoquín con patrón repetido idéntico |
| Letreros | Texto que parece legible y no lo es: el artefacto que más se cuela |
| Sombras | Dirección distinta de la luz declarada |
| Fidelidad | Elementos que no existen en el lugar o forma del monumento alterada (contra REF-01) |
| Personas | Poses, miradas al lente, rostros en primer plano, personas reales identificables |
| Miradas (E) | Ojos divergentes del mismo objetivo, iris lechosos, atención sin relación con el gesto. Con ojos ocultos no se certifica la dirección de ambas pupilas |
| Microescena (E) | La cámara no está donde la ficha dice que está quien fotografía (el modelo puede invertirla: delante en vez de detrás); acción, contacto o consecuencia distintos de los declarados |
| Profundidad | Borrón gaussiano plano, franjas, halos, máscaras, primer plano nítido o que tapa al protagonista, sujeto borroso |
| Luz y color | Exposición apagada, sombras empastadas, altas luces quemadas, HDR, sobresaturación, luz que no corresponde a la hora |
| Producto | Avión, cabina, uniforme o tripulación SKY: rechazo inmediato |

Un artefacto en el punto focal **se regenera, no se retoca**. Después de una edición generativa, repetir anatomía,
mirada y geografía. Tres intentos fallidos = estado `Bloqueado`, anotar qué falla y escalar.

## 2. Portada

Además del píxel: `medir-portada.mjs` en verde **y** mirar las vistas `-hero-desktop` y `-hero-mobile` (¿se lee el H1?
¿el sujeto queda entero arriba?). Revisar og y cuadrado por separado.

## 3. Secuencia del artículo

Mirar las piezas juntas: un mismo viaje (clima, hora, vestuario, objetos coherentes) con variedad de tipo, escala y
encuadre. Si la tanda pierde variedad, se escala a Editorial; no se cambia la escena en el motor para compensar.

## 4. Banner de ruta

Ruta verificada el día de publicación; copy sin precios ni ofertas; titular sin viudas y dentro de sus líneas; CTA y
etiqueta correctos; en B, titular fuera de la foto; peso < 150 KB; ALT presente. Ver `qa.json`.

## 5. Qué se registra en la ficha (Notion)

Tipo A–H y registro D/E · decisión de primer plano (elemento o razón) · para E: posición de quien fotografía, acción,
contacto y objetivo de mirada · prompt final BASE y NEGATIVE tal como se usó · motor y versión desde el log · parámetros,
semilla e ID si el motor los expone · versión V01, V02… (sube con cada regeneración entregada, no con cada intento) ·
REF usadas (REF-ESTILO-D separada de REF-01 reales) · caja del sujeto y foco de la portada · salida de `medir-portada`.

## 6. Estados

**Ejecución completada ≠ criterio de marca confirmado ≠ aprobación ≠ entrega.** Una no implica las demás.

- `qa.approval` del Workbench queda `pending-human-and-pixel-review` siempre.
- Revisión por versión en Frame.io. Un comentario en Frame.io no reemplaza el cambio de estado en Notion.
- Aprueban Diseño (Daniela, Melkin) y, para el estilo, Marca SKY. Entrega final en `SKY Blog SEO › 04 Entregables`
  (sólo la última versión aprobada), luego WordPress.
- Estado de la ficha y estado de la tarea que no coinciden son un hallazgo (Playbook, 2026-10-14): no se aprueba encima.

## 7. Llevarlo a un canvas de Claude Design (`/design`)

Cuando se pida presentar la línea en un canvas:

- El canvas **muestra piezas compuestas por el motor; nunca redibuja a mano** piezas de marca (lección de
  `efeonce-graphic-line`). Los banners de ruta se componen con `componer-ruta.mjs` y las portadas se exportan con
  `exportar.mjs`; el canvas recibe esos WebP/PNG como assets.
- Láminas sugeridas: principios (la imagen hace avanzar el artículo) · D y E con ejemplos · tipos A–H · la portada en el
  tema (vista `-zonas` y las dos simulaciones del hero) · antes/después de una portada de octubre · banner A y B en
  escritorio y móvil · reglas del banner · revisión y estados · pendientes de Marca.
- Formato del proyecto: carpeta con un `*.dc.html` por lámina y `canvas.json` (patrón del kickoff
  `ai-generations/2026-10-31_kickoff-seo-sky/canvas/project/`). Publicar con la herramienta Artifact (privado por
  defecto); subir las imágenes como assets y referenciarlas por la URL que devuelve.
- Las piezas de octubre son entregas reales del cliente: mostrarlas en un canvas privado de revisión está bien; no
  publicarlas fuera del equipo.
