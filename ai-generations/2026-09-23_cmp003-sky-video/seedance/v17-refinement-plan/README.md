# SKY V17 — pausa de lectura y logo final

Estado: exportado y revisado visual/técnicamente; aprobación del operador pendiente. Autorización del operador: «Vamos, sí» al plan de reducir 0,5 s y corregir el logo. Sin nueva generación pagada; costo incremental USD 0. V16 y el paquete aprobado V10 permanecen intactos.

## Cambios

- Duración acordada: 29,5 s / 708 cuadros a 24 fps.
- Lectura estable fuente 6–9 s: 72→60 cuadros. Selección monotónica de cuadros originales, extremos conservados, sin interpolación óptica. Desde el acercamiento al botón, todo conserva su velocidad y secuencia; sólo cambia el inicio en −0,5 s.
- Logo final: vector del repositorio `sky-on-dark.svg`, todos los fills blancos, separación original flecha/trazo conservada. Mismo tamaño y posición; render vectorial directo a 4K.
- Música, marca, avión y cierre: stems existentes desplazados −0,5 s; primeros 0,5 s eliminados verificada como silencio digital. UI inicial conserva tiempos. Canción sin cortes internos ni nuevo tempo. Mezcla recompuesta desde stems, no recortada desde AAC.
- Cartelas aprobadas, cielo, cámaras, URL Luminosidad de 320 px equivalentes y transición azul→morado conservados.

## Calidad y fuentes

Imagen desde `../v16-brand-repair/topaz-full-4k.mp4` y cierre desde `../v15-review/picture-lossless.mkv`. Una composición RGBA alimenta ambos encoders, 2160×3840 CRF15 y 1080×1920 CRF14; ambos H.264 Rec.709, audio AAC320k/48kHz. La salida 1080p no se deriva del MP4 4K ya comprimido. 4K restaurado desde 1080p, no nativo. La compresión MP4 es con pérdida; no se promete identidad de píxeles con las fuentes.

## Reproducción y evidencia

- `PLAN.md`: propuesta aceptada y tiempos.
- `render-closing.mjs`: variante de cierre sobre alpha PNG4K, sin modificar overlay aprobado.
- `mix-v17.py`: mezcla y verificación de desplazamiento de stems existentes; requiere NumPy/soundfile.
- `compose-v17.mjs`: verifica hashes aprobados y exporta ambas resoluciones sin sobrescribir archivos.
- `verify-v17.py`: metadata, decodificación completa, hash de audio y correspondencia de cuadros respecto a V16.
- `review-v17.py`: muestras de toda la película, 96 cuadros consecutivos del ajuste/activación, cierre y detalles nativos de logo.
- `qa/composition.json`: mapa de cuadros y hashes; `qa/audio-mix.json`: medición y procedencia; `qa/delivery-technical.json`: salidas reales.

El agente no dispone de escucha perceptual en esta sesión. Mediciones y conservación de muestras no sustituyen la escucha del operador. Sin publicación, commit ni push; automatización anterior permanece pausada.

## Entregas revisadas

- [4K restaurado](sky-v17-restored-4k.mp4): 2160×3840, 29,5 s, 24 fps, 708 cuadros, Rec.709, video 30,19 Mbps.
- [1080p](sky-v17-restored-1080p.mp4): 1080×1920, misma duración/cuadros/color, video 10,15 Mbps.
- AAC idéntico entre resoluciones: −16,03 LUFS-I / −1,50 dBTP; hash y decodificación íntegra en `qa/delivery-technical.json`.
- 59 muestras generales, 96 cuadros consecutivos de lectura/activación, 18 muestras de entrada al cierre y recortes nativos de logo inspeccionados. Revisión registrada en `qa/review.json`.
- Correspondencia de 612 cuadros anteriores al cierre respecto a V16: error RGB medio 0,119/255 en comparación reducida; no se observan cambios de contenido o color en las muestras revisadas.
- Se corrigió el etiquetado del contenedor a Rec.709 con stream copy; hashes de video/audio comprimidos idénticos antes/después (`qa/color-remux.json`). Sin recodificación adicional.
- Reproducción: `render-closing.mjs` → `mix-v17.py` → `compose-v17.mjs` (incluye `finalize-color.py`) → verificaciones.
