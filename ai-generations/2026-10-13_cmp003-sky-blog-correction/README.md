# CMP-003 · V18 · Contenido para el blog de SKY

Fecha: 2026-10-13. Estado: **video exportado y revisado; copies propuestos; aprobación final/publicación pendientes**.

## Dirección autorizada

SKY pidió precisar el alcance: contenido para su blog con enfoque SEO y AEO. El operador aprobó corregir video/copies y verlos antes de publicar. Se retira la formulación «su agencia SEO/AEO». La portada V4 se conserva.

Cartela: **Ahora, también / en su blog. / Contenido con enfoque / SEO + AEO.**
Tres copies en `COPIES-PARA-REVISION.md` y `copies.json`: Efeonce habla en primera persona plural; Julio conserva «mi equipo Efeonce».

## Entregables

- `sky-v18-blog-1080p.mp4`: 1080×1920, H.264, 29,5 s, 24 fps, 708 cuadros, Rec.709.
- `sky-v18-blog-4k.mp4`: 2160×3840, mismas propiedades temporales; base 4K restaurada desde 1080p, no captura nativa 4K.
- Audio AAC aprobado de V17, copiado sin recodificación: hash del payload idéntico en ambas salidas respecto a sus originales.

## Método para conservar calidad

1. Rehidratar originales con `pnpm ai-gen:pull`; el comando validó sus hashes archivados. V17 y V16 se conservan.
2. Recuperar HTML/animador aprobados de V10. Cambiar sólo la escena news, conservar los tiempos y presets de movimiento. Añadir la línea «Contenido con enfoque», jerarquía mayor para «en su blog.»; conservar el aterrizaje/impacto de SEO y la salida a Gracias.
3. Renderizar 80 cuadros de overlay RGBA a 2160×3840, sin JPEG intermedio. Componerlos sobre el cielo limpio Topaz con correspondencia exacta de cuadros: V17 484–563 = fuente V16 496–575. Mantener los elementos salientes de +2.000 y entrantes de Gracias durante los solapamientos originales.
4. Exportar localmente el tramo modificado dentro de límites de GOP/IDR, CRF12, preset slow; conservar los bloques anteriores/posteriores mediante stream copy. El 1080p de la cartela se deriva del patch sin pérdidas, no del MP4 4K final.
5. Concatenar los bloques con duraciones explícitas y copiar el AAC de V17. Conservar color Rec.709 y faststart. No generar video/audio con proveedores.

La región recodificada incluye handles por la estructura H.264: 4K cuadros 344–603; 1080p 293–612. El cambio creativo es sólo 484–563. MP4 es compresión con pérdida; no se afirma igualdad de píxeles dentro de esos handles.

## QA ejecutado

- `qa/verification.json`: ambas salidas decodificadas completas; 708 cuadros, PTS verificados individualmente a 24 fps, duración exacta y Rec.709.
- Fotogramas decodificados idénticos a V17 antes/después de las ventanas recodificadas. La transformación SKY y las primeras cámaras permanecen exactamente iguales. Cierre final también preservado fuera de la ventana.
- Audio comprimido idéntico a V17. No se hizo nueva escucha perceptual; conservación por hash no es un juicio musical nuevo.
- `qa/ssim-preserved.log`: SSIM 0,995954 para el handle de 1080p sin cambio creativo (293–483), respecto al aprobado; métrica auxiliar, no garantía perceptual.
- Inspección visual de `qa/full-film.jpg` (30 muestras), `qa/sequence.png` (20 muestras de la cartela), `qa/entry.png` y `qa/exit.png` (12 cuadros consecutivos cada una), y cartela a 1080p. Sin restos del claim retirado en la cartela; sin recorte del texto durante lectura estable. El slam entra sobredimensionado como en la coreografía aprobada.
- `qa/text-layout.json`: geometría de texto medida; todos los textos asentados dentro del ancho seguro.

## Reproducción

`node render-overlay.mjs` produce los PNG de alfa; el comando de composición del patch se registra en `build-patch.sh`; `python3 compose.py` produce ambas resoluciones; `python3 verify.py` valida cuadros/audio/metadata. Los scripts rechazan sobreescribir videos existentes.

## Estado y límites

Costo incremental de generación: USD 0. No publicación, programación, subida pública, commit ni push. El operador informa que los posts salieron y retiró LinkedIn; no se consultó estado live por canal en esta corrección. CDR-009 y brief actualizados para que los agentes no reutilicen el claim anterior. La nueva aprobación del paquete sigue pendiente.
