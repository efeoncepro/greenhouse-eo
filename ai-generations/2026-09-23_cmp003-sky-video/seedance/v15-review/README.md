# SKY V15 · rock del operador y revisión de cierre

2026-09-24. Candidato de30s,1080×1920,24fps/720cuadros. Entrega: `sky-v15-rock-1080p.mp4`. Aprobación audiovisual pendiente. Sin publicación, commit, push ni nuevas generaciones pagadas.

## Feedback y música

El operador percibió pérdida de calidad, SFX desconectados, transformación SKY sin impacto y cierre abrupto. Rechazó Heroic para este video y proporcionó `rock-2026-08-08-12-13-23-utc.zip`. Music2.5 con referencia quedó autorizado como opción; no se ejecutó ni gastó.

Se usa `331music_rock_short-02.wav`, arreglo completo32s del ZIP. Tempo uniforme1,14×, afinación conservada, sin empalmes ni loops internos. Inicio1,61s; acento de transformación9,583s; remate26,127s; cola completa hasta29,660s. La subida de SKY y anticipación de cierre usan guitarra del mismo tema, invertida y filtrada. Golpe musical reforzado con grave del portal existente. Retirados clic del chip e impactos genéricos de cartelas; UI más discreta y un solo flyby. Cues y medidas: `qa/audio-mix.json`. AAC−16,03LUFS-I/−1,55dBTP,48kHz/320kbps.

ASR de la fuente sin detecciones; no equivale a escucha. El agente no puede oír en esta sesión; revisión perceptual humana pendiente. El ZIP no incluía certificado de licencia; fuente y hashes registrados en `qa/envato-source.json`, publicación no realizada.

## Calidad y cierre

El ajuste anterior de SFX conservaba el stream de video idéntico. La cadena previa sí acumulaba recodificaciones H264, intermedios JPEG, recorte hasta1,95× y señalización incompleta de color. V15 vuelve a fuentes V7/V9/V11 y Omni nativas. Lectura RGB, intermedio FFV1 sin pérdida y una codificación final H264CRF14. Conversión RGB→YUV y señalización Rec.709/rango limitado explícitas. Evita degradación adicional; no recupera detalle ausente de las fuentes ni del recorte.

Omni sigue integrado12,542–18s. Cartelas punch-v3 y assets oficiales conservados, hashes verificados. Se suaviza la salida de Gracias25,35–26s; el azul entra progresivamente siguiendo las nubes, sin flash blanco. Logos26s, URL320px/Luminosidad y azul→morado27,5–28,5s conservados.

## Evidencia

`qa/whole-film.jpg`: secuencia completa a2fps. `qa/closing-before.jpg` y `closing-after.jpg`: cierre a8fps. `qa/final-delivery.json`:720cuadros,30s,decode correcto, Rec.709 y video idéntico al muxar audio. Colores decodificados dentro de≈2–3 niveles RGB de paleta. Revisión auditiva pendiente; no declarar integración perceptual garantizada.

Reproducción: `rebuild-picture.py`, `compose-review.mjs`, `mix-rock.py`. Versiones previas conservadas en V14. USD0 adicionales.
