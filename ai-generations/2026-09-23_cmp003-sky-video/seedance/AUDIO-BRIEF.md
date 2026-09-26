# CMP-003 — dirección de sonido para el video Seedance

**Instrucción confirmada por el operador:** música y SFX, sin voz, narración, diálogo, canto ni letras. El video generado en Seedance sale mudo (`generate_audio=false`); la música y los SFX se producen y mezclan como pistas separadas cuando se valide la imagen completa. No reutilizar automáticamente la pista de H3 v3.

## Música

- Pieza instrumental original de unos 19 s, electrónica cinematográfica cálida y moderna, no stock corporativo ni épica de tráiler.
- Arco: curiosidad ligera para búsqueda y resultados → tensión luminosa en el chip → máximo impacto durante el vuelo → resolución agradecida y limpia en la firma final.
- Pulso perceptible para acentuar cortes sin depender de un BPM fijo hasta conocer los hit points del render final.
- Sin voces procesadas, coros, samples hablados ni letra. Dejar espacio dinámico para el sobrevuelo.
- Antes de usar una pista en entrega de cliente: verificar fuente, licencia comercial y derechos de sincronización; guardar esa evidencia junto al audio.

## SFX

| Evento visual | Tratamiento | Restricción |
| --- | --- | --- |
| Tecleo y Enter | clics breves, táctiles y discretos | No convertirlos en percusión dominante. |
| Resultados y respuesta | tres apariciones diferenciadas; brillo suave | Cada acento sincronizado con el fotograma de aparición. |
| Chip SKY | chime corto y shimmer multicolor | Evitar sonido de notificación genérica. |
| Destello y avión | transición luminosa seguida de paso de jet con peso y Doppler | El sonido de motor no implica humo o estela visual. |
| `+2.000` y `SEO/AEO` | impactos musicales breves | Dejar leer el texto; no saturar. |
| Firma final | resolución tonal breve | Sostener limpia hasta el último frame. |

## Mezcla y QA

- Música como base; SFX puntuales con rango dinámico, sin clipping. Medir loudness y picos de la exportación final según el canal de entrega.
- Revisar el video completo con audio para asegurar ausencia de cualquier voz o canto y sincronía de SFX con la imagen.
- Mantener stems de música y SFX separados para adaptar 9:16 y 4:5 sin rehacer el diseño sonoro.
