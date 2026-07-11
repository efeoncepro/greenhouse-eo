# Plan de recuperación V3 — toma 3D integral

> Estado: **RECHAZADO POR DIRECCIÓN; no continuar.** El blocking pasó timing, pero su reconstrucción visual fue claramente inferior al key visual. El operador confirmó que el resultado se veía horrible. No se desarrolla lookdev, no se usa como referencia de otro modelo y no existe candidata 3D.

## Entorno y almacenamiento

- Aplicación: `/Applications/Blender.app`.
- CLI: `/opt/homebrew/bin/blender`.
- Instalación: Homebrew cask, fuera de `/Users/jreye/Documents/greenhouse-eo`.
- Git conserva sólo scripts Python reproducibles, configuración, manifiestos de licencia/hashes y revisión Markdown.
- `.blend`, geometría, texturas, cachés y renders viven fuera del repo durante trabajo y luego en el bucket privado del run. No se copian a un bundle de producción sin aprobación creativa.

## Qué resuelve 3D

- Contactos fijados exactamente en uno o dos frames a 24 fps.
- Rebote, distancia aérea y pausa definidos por curvas, no inferidos por un modelo de video.
- Micrófono rígido y malla sin deformación.
- `ON AIR` como caja física, letras en geometría/material emisivo y luz roja que afecta el set.
- Cámara, lente, encuadre, paleta y profundidad de campo comparables contra el key visual 4K.
- Pista final independiente: exactamente dos respuestas de la cadena `micrófono → preamp → corneta/monitor`.

## Insumos necesarios

| Insumo | Ruta preferida | Condición |
| --- | --- | --- |
| Micrófono + boom | Modelado procedural desde el visual o modelo comercialmente utilizable | Sin marca visible; silueta, rejilla y soporte deben coincidir en cámara |
| Mano | Mesh humana riggeada con licencia comercial/CC0 | Índice con controles por falange y piel suficientemente detallada para close-up |
| Consola/estudio | Geometría simple modelada a cámara + props con licencia compatible | Se evalúa sólo la vista final, pero no se usa un backplate para falsificar el practical |
| `ON AIR` | Modelado propio | Caja, letras, emisión y luz integradas a la escena desde el primer frame |
| Audio de monitor | Grabación real preferida; diseño sintético como fallback | Dos eventos, 80–120 ms, cuerpo low-mid de altavoz, silencio fuera |

Toda descarga externa requiere registrar URL de origen, autor, licencia, fecha, hash y modificaciones en un manifiesto antes de incorporarla a la escena.

## Shot y keyframes

| Frame | Acción |
| ---: | --- |
| 1–13 | Hover estable, yema a 6–10 mm de la rejilla |
| 14 | Descenso |
| 15 | Contacto 1 |
| 16 | Rebote; aire inequívoco |
| 17–26 | Pausa aérea |
| 27 | Descenso |
| 28 | Contacto 2 |
| 29 | Rebote; aire inequívoco |
| 30–40 | Retirada suave de la mano |
| 41–120 | Settle; cámara y set estables |

Los contactos son de un frame por defecto. Se pueden ampliar a dos sólo si la revisión a velocidad real exige más legibilidad; nunca se sostiene la yema.

## Gates por fase

1. **Blocking gris:** cámara 9:16, micrófono, dedo proxy y practical físico. Se valida sólo timing, silueta y ausencia de penetraciones.
2. **Match visual:** geometría, lente, color, luces y profundidad de campo comparados con el PNG 4K. No avanza si el diseño cambia.
3. **Lookdev de piel/malla:** detalle suficiente para que el contacto se lea como yema contra rejilla, no botón.
4. **Animación final:** revisión a 1×, 0,5× y cuadro a cuadro; dos contactos y dos rebotes exactos.
5. **Audio:** dos respuestas amplificadas de corneta sincronizadas a frames 15 y 28; no direct foley, ambiente ni tercer evento.
6. **Entrega candidata:** render 1080×1920, 24 fps, cinco segundos. Sólo después de PASS se considera 2160×3840 o compresión final.

## Restricciones

- No backplate con `ON AIR` incrustado para simular integración.
- No overlay, tracking, máscara, crop ni composición posterior del letrero.
- No retime de mano para corregir contacto.
- No compra ni descarga de assets sin licencia verificable.
- No publicación ni promoción automática por completar un render.

## Cierre de la ruta

El blocking confirmó contactos únicos en frames 15 y 28, rebotes en 16 y 29 y practical modelado dentro de la escena. Esa prueba no compensó la pérdida de calidad: la mano/antebrazo, el micrófono, los materiales, la luz y la composición no alcanzaron el estándar del 4K. La ruta queda cerrada. Los binarios se conservan únicamente como evidencia rechazada en GCS; Blender permanece instalado fuera del repo, sin implicar continuidad de producción.
