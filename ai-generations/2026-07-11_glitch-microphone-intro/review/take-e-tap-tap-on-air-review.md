# Revisión — Take E `tap tap` + `ON AIR`

> Dictamen final: **rechazado por revisión creativa**. Este registro se conserva como evidencia del error: el panel `ON AIR` quedó por delante de la mano y el gesto leyó una presión, no un golpe y rebote.

## Identificación

| Campo | Valor |
| --- | --- |
| Base preservada | `exports/glitch-microphone-intro-a-natural-5s-silent.mp4` |
| Corrección editorial | `compose-glitch-tap-tap-on-air.mjs --execute` |
| Candidato | `exports/glitch-microphone-intro-e-tap-tap-on-air-5s-silent.mp4` |
| Formato | 5.000 s · 720×1280 · H.264 · 24 fps · sin audio |
| Hash del candidato | `c2a959e7fad20ad9071522856736020e6d26ae49e2b0c794ba5e45a05ad6819c` |
| Fuente de `ON AIR` | key visual 4K suministrado, SHA-256 `fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e` |

## Verificación visual

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| Gesto solicitado | Rechazado | Aunque hay dos beats, el contacto se sostiene demasiado y se lee como presión. F lo reemplaza por strike de uno a dos frames y rebote. |
| Anatomía y objeto | Pasa | Un único índice, articulaciones coherentes y rejilla rígida; el edit usa fotogramas contiguos de la misma fuente. |
| Señal | Pasa | El primer toque queda sin respuesta; el segundo conserva la respuesta azul suave de la fuente. |
| `ON AIR` | Rechazado | El texto es exacto, pero el crop era demasiado grande y se montó como tarjeta que ocluye la mano. F usa el panel 180×118 como practical del fondo, fuera de la silueta del índice. |
| Cámara, formato y audio | Pasa técnico | Cámara estable; `ffprobe` confirma 720×1280, 24 fps, 5.000 s y sin pista de audio. Esto no compensa los fallos de dirección. |
| Continuidad Omni editada | Rechazada | El intento `D` de Omni Interactions devolvió un video válido, pero introdujo artefactos después del primer segundo; se conserva como evidencia, no como entrega. |

## Reemplazo

Reemplazado por F/I. Ver [take-i-percussive-tap-on-air-gemini-foley-review.md](./take-i-percussive-tap-on-air-gemini-foley-review.md).
