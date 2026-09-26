# SKY V12 · recuperación local con material existente

2026-09-24. **Exportado para revisión, no aprobado por el operador. Gasto adicional USD 0; cero llamadas a proveedores.**

## Entrega

- `sky-v12-recovery-1080p.mp4`: 30 s, 1080×1920, 24 fps, 720 cuadros; H.264 + AAC estéreo 48 kHz/256 kbps.
- `audio/sky-v12-master.wav`: master 24 bit/48 kHz; `music.wav` y `sfx.wav` son buses previos al mastering.
- Hash, streams y decodificación: `qa/final-export.json`. Audio y 32 cues: `qa/audio-mix.json`.
- Estado: revisión visual realizada; mezcla técnica realizada. **No hubo escucha perceptual del agente**: esta sesión no admite entrada de audio. No se afirma garantía de ausencia de fonemas por un ASR vacío. La escucha final sigue pendiente.

## Decisiones de montaje

| Tiempo | Fuente existente | Resultado |
| --- | --- | --- |
| 0–2,167 s | V7 | Escritura y cámara lateral generada |
| 2,167–9,833 s | V9 | Resultados, turno separado, revelado de respuesta y cita |
| 9,833–10,167 s | V7 | Bloom luminoso generado, enlace hacia vuelo |
| 10,167–15,75 s | V11 | Aproximación, paso cercano, seguimiento y reencuadre progresivo hacia nubes |
| 15,75–26 s | Cielo de ese mismo V11 | Cartelas punch-v3 sobre nubes en movimiento; lavado final a azul desde25,5 s |
| 26–30 s | Cierre permitido | Efeonce/SKY, URL Bubble canónica Luminosidad, azul→morado |

La película no se reconstruyó por código. La intervención editorial recorta, concatena y reencuadra material generado existente; sólo cartelas/cierre son capas deterministas. El recorte hacia el cielo permite retirar al avión de la reserva sin congelar, borrar objetos ni inventar otra nube. V7 procede de720p; export1080p no equivale a fuentes nativas1080p. El cielo ampliado pierde detalle respecto al original. Hay un corte editorial de perspectiva al primer resultado; no se promete una única toma generada continua.

## Impacto y sonido

- Zoom generado a la cita, bloom a9,833 s y salida a avión; se conserva el impulso con riser y motor anticipado.
- Máximo de flyby alineado al paso cercano f286/11,917 s. No pausa musical entre cita y vuelo.
- Cartelas aprobadas intactas: +f445 y SEO/AEO f521 reciben acentos de mayor intensidad; lectura y cierre respiran.
- Música original V6 de ElevenLabs a velocidad1×, instrumental por provenance; entra después de Enter1 s. SFX originales `ui`, `spark`, `jet` recortados por evento. Ningún audio de los videos ni stems de separación V7/V9 entra al master.
- Medición del AAC final: −16,25 LUFS integrados, −1,47 dBTP, LRA13,2 LU. Valores leídos de `input_*` del análisis del archivo final, no objetivos del normalizador.

## QA y reproducción

Revisados los720 cuadros en12 hojas de contacto, holds nativos y enlace cita/avión a12 fps. Cartelas legibles, avión fuera antes del texto; URL con geometría original y fusión canónica. Nueve hashes aprobados verificados por compositor. Paquetes de video del MP4 final idénticos a la imagen revisada; decodificación completa sin errores, duración30 s.

Scripts locales sin red: `render-picture.py` → revisar y registrar hash en `qa/picture-review.json` → `compose-approved.mjs` → `review-picture.py` → `mix-audio.py`. El compositor protege un export existente; versionar antes de ejecutar otra vez. Python imagen usa PIL/numpy; audio usa numpy/scipy/soundfile. FFmpeg/Node/sharp locales.

La concatenación inicial tenía cambios de metadata de color entre segmentos: reiniciaba el filtro y producía672 cuadros. `sky-v12-picture-cartelas.mp4` es ese diagnóstico fallido, **no entregar**. La conformación BT.709/yuv420p uniforme antes de componer resuelve el problema; export entregable720 cuadros.

No commit, push, publicación ni adaptación4:5. Esta entrega rescata9:16; aprobación final y escucha siguen separadas de la aprobación previa de cartelas.
