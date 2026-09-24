# SKY × Efeonce — versión de revisión 6, con acabado editorial

## Archivos

- `sky-v6-30s-musica-sfx-sin-voz.mp4`: 30 s, 720×1280, 24 fps, H.264 y AAC estéreo 48 kHz.
- `sky-v6-30s-4x5-musica-sfx-sin-voz.mp4`: adaptación 720×900. Encuadre superior durante el vuelo para conservar la cola y encuadre central para interfaz, textos y cierre.
- `delivery-manifest.json`: metadata y SHA256 de ambos archivos.

## Procedencia y método real

Se solicitó un vídeo Seedance completo de 30 s con las 30 imágenes y la referencia de movimiento Minimax, sin audio. Request `01a0d110-aa66-7542-b5c0-c257696cf221`.

El bruto conservó repeticiones de interfaz y tiempos inadecuados. Se ejecutó una edición del vídeo completo (`task=editing`), request `01a0d11d-3a47-7db0-a919-0f6d1a1bc1d2`. Esta edición tardó más de 30 minutos; se retomó sin nueva generación y finalmente devolvió un vídeo que seguía conservando los errores. No se consideró resuelto por haber terminado.

La versión entregada tiene **acabado editorial programado**. Conserva apertura y vuelo del mismo bruto completo; elimina repeticiones, incorpora estados exactos de chat/cita, ajusta duración de planos del avión, compone tipografía con perspectiva y usa los vectores oficiales en el cierre. No son tramos de vuelo generados de forma independiente. Tampoco es una salida cruda de Seedance: esta distinción debe mantenerse al presentar el resultado.

## Secuencia verificada

| Tiempo | Contenido |
|---|---|
| 0–3,75 | Búsqueda y tres resultados, macro lateral de interfaz |
| 3,75–4,85 | Turno del usuario solo |
| 4,85–8 | Respuesta del LLM con una cita SKY morada |
| 8–9,5 | Cita se ilumina, macro y transición luminosa |
| 9,5–12,125 | Aproximación del A320neo |
| 12,125–13,125 | Paso inferior, retimado a 1 s |
| 13,125–15,5 | Salida trasera, disminución progresiva de escala |
| 15,5–18 | Un año creando con SKY. |
| 18–20,5 | +2.000 piezas. |
| 20,5–23 | Y ahora nos eligió como su agencia SEO/AEO. |
| 23–25 | ¡Gracias, SKY! y transición a azul |
| 25–27 | Logos oficiales y URL bubble, fondo azul |
| 27–28,2 | Fondo cambia a morado; logos y URL permanecen fijos |
| 28,2–30 | Cierre morado |

## Audio: requisito sin voz

- Brutos Seedance comprobados con ffprobe: **cero streams de audio**.
- Música original ElevenLabs solicitada con `instrumental=true` y `lyrics_type=instrumental`.
- SFX originales separados de UI, brillo y un paso de reactor.
- Mezcla con mapeo explícito de vídeo silencioso y audio nuevo. Ninguna pista de versiones anteriores.
- Scribe no transcribió palabras en la música, los SFX ni la mezcla final. Evidencias en `audio/*speech-check.json`.
- Archivo final medido: **−16,0 LUFS integrados, pico −1,5 dBFS, LRA 4,6 LU**.
- Esta comprobación automatizada no se describe como escucha humana.

## Revisión realizada y límites

Se inspeccionó todo el montaje en 120 fotogramas a 4 fps, la salida trasera, la separación de turnos del chat, los mensajes completos y el cierre. Se inspeccionó además la adaptación 4:5. La URL se hizo más legible mediante su vector oficial en mayor tamaño y luminosidad. Los logos finales son los vectores oficiales; la geometría no se redibuja.

Versión de revisión creativa, sin publicación. La fuente de vídeo es 720p. Los movimientos del chat y los títulos son composición gráfica con perspectiva sobre la referencia fotográfica de cielo; el movimiento físico del avión procede del vídeo generado. La valoración final de impacto cinematográfico corresponde a la revisión del vídeo, no a un supuesto cumplimiento automático del prompt.

## Reproducibilidad

`finish-render.mjs` / `finish-tail.mjs`: chat y títulos. `render-closing.mjs`: cierre de marca. `assemble.py`: montaje y retiming. `mix.py`: música y SFX. `finish/edit-decision-list.json`: decisiones de montaje. Las capturas de los brutos y del montaje se conservan en carpetas QA separadas.
