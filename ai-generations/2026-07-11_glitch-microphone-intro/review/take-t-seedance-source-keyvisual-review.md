# Revisión — take T / Seedance 2.0 con key visual íntegro

> Nota de contrato: las referencias históricas de esta revisión a foley directo `piel → malla` quedaron supersedidas. El audio vigente son exactamente dos respuestas amplificadas `micrófono → preamp → monitor/corneta`; el veredicto de rechazo no cambia.

## Identificación

| Campo | Valor |
| --- | --- |
| Motor | Fal.ai `bytedance/seedance-2.0/image-to-video` |
| Referencia | Key visual PNG 2160×3840 íntegro, SHA-256 `fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e` |
| Request Fal | `019f51ce-780f-7533-b4be-60e11f3e0d5b` |
| Seed | `1307895314` |
| Coste estimado | US$3.41 más token billing, conforme al renderer/versioned Fal documentation |
| Salida | 1080×1920, H.264, 24 fps, 5.042 s; AAC 44.1 kHz estéreo |
| Master local | `masters/glitch-microphone-intro-t-seedance-2-source-keyvisual-master.mp4` |
| SHA-256 master | `8a71efd9eb31b91b960779df9822941381238ecc93687b7bfb0e11fce33c7dda` |

## Veredicto

**Rechazado como master de Glitch.** No se crea export editorial, no se retima la mano, no se extrae ni reemplaza su audio y no se publica.

## Gates

| Gate | Resultado | Evidencia |
| --- | --- | --- |
| Set / continuidad | **Pasa** | El key visual se conserva: cámara bloqueada, micrófono, boom, consola, paleta navy/azul/verde y piel cálida. `ON AIR` permanece pequeño, legible, fijo y físicamente situado detrás de la acción. |
| Practical diegético | **Pasa** | No hay overlay, máscara, tracking, crop ni composición posterior. El letrero existe desde el primer frame y conserva profundidad/perspectiva de estudio. |
| Actuación | **Falla — rechazo automático** | En la ventana de primer contacto, frames 31–70, la yema desciende y queda apoyada varios frames en vez de contactar 1–2 y rebotar al aire. La segunda ventana, frames 71–100, repite un apoyo perceptible. El gesto se lee como presión, no como `hover → impacto → rebote → pausa → impacto → rebote`. |
| Audio | **Falla — rechazo automático** | La pista no es silencio salvo dos foleys. Hay actividad ya desde el inicio; el detector de silencio registra regiones activas amplias y la forma de onda muestra colas resonantes, no dos `toc` secos de 100–150 ms. El gate exige sólo dos eventos de piel → malla → cuerpo/cápsula, sincronizados al contacto. |
| Entrega | **Falla** | Al fallar actuación y audio, no puede ser entrega candidata ni pasar a finish/upscale. |

## Rúbrica

| Criterio | Máx. | Puntaje | Nota |
| --- | ---: | ---: | --- |
| Anatomía y física de mano/micrófono | 5 | 4 | Anatomía, malla y micrófono son estables; el fallo es la duración del apoyo. |
| Doble contacto con rebote | 5 | 0 | Esencial. Ningún contacto demuestra el límite de 1–2 frames con rebote inmediato. |
| Staging, cámara, foco y continuidad 4K | 4 | 4 | Conservación fuerte del key visual. |
| Respuesta de señal | 3 | 2 | Discreta y en-set, pero no compensa la física fallida. |
| Luz, color y textura | 3 | 3 | Sin drift material. |
| Audio: exactamente dos foleys | 2 | 0 | Actividad temprana y colas largas invalidan el contrato. |
| Corte hacia Glitch | 3 | 0 | Sin performance ni audio aprobables no puede proponerse corte. |
| **Total** | **25** | **13** | Rechazo automático, independientemente de la puntuación. |

## Evidencia preservada

- `masters/glitch-microphone-intro-t-seedance-2-source-keyvisual-master.metadata.json` — request, fuente, seed, hash y salida de Fal.
- `review/take-t-seedance-overview.jpg` — continuidad del set a lo largo de la toma.
- `review/take-t-seedance-contact-window-frames-31-70.jpg` — primer gesto a 24 fps.
- `review/take-t-seedance-second-contact-frames-71-100.jpg` — segundo gesto a 24 fps.
- `review/take-t-seedance-audio-waveform.png` — forma de onda de la pista nativa.

## Decisión de gasto y siguiente estado

Se detiene el gasto tras esta única toma T. La conservación del key visual/practical es evidencia positiva del motor, pero no convierte el resultado en candidato: actuación y foley son gates duros. La ruta prohibida sigue prohibida: no overlay del `ON AIR`, no tracking/máscara/crop, no retime de los contactos y no extracción de audio. El run se archiva en GCS como evidencia privada; ningún output se agrega a un bundle de producción.
