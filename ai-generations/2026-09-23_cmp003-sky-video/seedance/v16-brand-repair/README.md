# SKY V16 · transformación de marca y restauración

Estado real: V16 completa exportada y revisada visual/técnicamente en 4K restaurado y 1080p. Escucha y aprobación del operador pendientes. Sin publicación, commit ni push.

## Entrega actual

- [Máster 2160×3840 restaurado](sky-v16-restored-4k.mp4), 30s/24fps/720cuadros, Rec709, vídeo≈29,84Mbps.
- [Copia 1080×1920](sky-v16-restored-1080p.mp4), 30s/24fps/720cuadros, Rec709, vídeo≈10,43Mbps.
- Ambas salidas tienen la misma pista AAC≈310kbps; −16,03LUFS-I y −1,38dBTP medidos, sin clipping digital. La medición no sustituye escucha.
- 4K restaurado/reescalado desde el montaje1080p; no captura4K nativa. Se conserva el desenfoque de movimiento y las limitaciones generativas de las fuentes.
- Restauración completada en aproximadamente60min desde el envío. Coste reportado del piloto y completoUSD5,59944, dentro deUSD5,60. No hubo reintentos.
- Los624 cuadros conservan correspondencia temporal;52 muestras generales,48 cuadros densos de marca/pass y detalles de UI/avión revisados. Cartelas, Gracias, cierre y URL revisados después de componer;9 hashes aprobados intactos.
- Evidencia: `qa/full-restoration-review.json`, `qa/restoration-frame-check.json`, `qa/composition.json`, `qa/delivery-technical.json`, `qa/final-mux-and-audio.json`. Revisión visual muestreada; no se afirma escucha ni aprobación del operador.


## Corrección sonora

Se retiró íntegro el bus de marca anterior. Un único SFX nuevo de3s, Eleven Sound Effects v2, crea carga-impacto-liberación con ancho de banda completo. Fuente `audio/transformation.mp3`; colocación8,948–11,948s, crest9,583s. Refuerzo300–6000Hz≈7,44dB sobre música y comprobación mono por bandas en QA. Música Envato continúa sin empalmes; sólo−2,5dB de espacio gradual bajo la transformación. El agente no escucha audio en esta sesión: medidas y ASR no certifican el resultado perceptual. ASR de SFX fue inconcluso (frase Amara con tiempos degenerados), no se declara validación de ausencia de voz.

Previsualización sonora: `sky-v16-audio-review-1080p.mp4`, imagen V15; recorte `sky-transformation-audio-preview.mp4`. No confundir con una entrega visual restaurada.

## Calidad

V15:1080×1920,24fps,8,35Mbps. Comparación del cuadro nativoV11 y exportV15: MAE2,10 niveles RGB, mismo encuadre y desenfoque nativo. Restauración Topaz precise2×/24fps solicitada para4s8,25–12,25s. Sin reconstruir UI ni avión. Cartelas/cierre quedan fuera del restaurador y se componen después desde assets aprobados.

## Autorización y estado

Operador autorizó hastaUSD5,60 para piloto y completo, condicionado a mejora sin deformaciones. PilotoUSD0,746592, sesión `8aHGCV6oWdMvy2Ql5ouO`, generación `o9hrojdtJ7OUNtzfTNT8`, nodo `5yesXM5Bx4fPPyshbDN8`. Completo26s enviado una vez tras pasar el piloto; cotizadoUSD4,852848; nodo `Xz9aKMI6s2GMjea71k6N`, referencia `fIT32kucyS2knV7s27hY`. Total restauración cotizadoUSD5,59944. Piloto aceptado con límites en `qa/pilot-review.json`. Completo: sesión `hIP2qZLzr5W87dqwwrw8`, generación `n7NYe0WXEhIJtcANUUHR`. No volver a ejecutar el nodo.

Flow `SVt3llC8SDhciCoZjoQF`. SFX aparte: generación `feCbogWtcfSI2FSnGLlV`,30créditos/USD0,0066 reportados. Sin generación de canción ni nueva escena.

## Estado de cierre

Resultado descargado, revisado y compuesto. No volver a ejecutar el nodo. Seguimiento pausado tras completar y verificar estos archivos; cualquier nueva iteración requiere el feedback del operador y una autorización específica si implica gasto.

## Scripts de entrega preparados

- `review-full.py <archivo> <etiqueta>`:2 muestras por segundo y cuadros grandes de hitos, con Python de dependencias Codex/PIL.
- `check-restoration.py`:compara los624 cuadros del plate de26s antes/después, con `/tmp/sky-v7-audio-env/bin/python`; no sustituye revisión visual.
- `compose-restored.mjs`:restauración26s + cierre4s; conserva9 hashes de aprobación, Luminosidad y Rec709.
- `export-delivery.py`:mux4K y derivado1080p; valida30s/720cuadros/24fps/Rec709 y pistaAAC idéntica. No sobrescribe salidas existentes.
- `sky-v16-restored-brand-preview.mp4`:piloto4s restaurado + segmento8,25–12,25s de mezcla V16, mostrado al operador mientras termina el metraje completo.
