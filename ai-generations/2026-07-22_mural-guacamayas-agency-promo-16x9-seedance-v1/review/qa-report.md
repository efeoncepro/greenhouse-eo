# QA — Mural Guacamayas 16:9 · Seedance V1

## Estado

`candidate_pending_operator_review`

Seedance utilizó el video original como referencia temporal y reprodujo de forma reconocible su coreografía.
El resultado es un candidato fuerte, no un master aprobado ni publicado.

## Procedencia

- Provider: Fal
- Endpoint: `bytedance/seedance-2.0/reference-to-video`
- Request ID: `019f8bc6-3d68-7720-8676-9d3cdbe08fac`
- Seed: `1391427052`
- Latencia: 301,498 ms
- Attempts ejecutados: 1
- Video de referencia: master original completo 9:16, derivado a 626×1112 sin alterar su contenido
- Referencias visuales: tres keyframes originales de ojo, ala y vuelo

## Resultado técnico

- 1280×720, 16:9 nativo
- H.264 `yuv420p`, 24 fps
- 10.054 s
- AAC 44.1 kHz estéreo
- Bitrate medio: 11.14 Mbps
- Tamaño: 13,995,137 bytes
- SHA-256: `f508c2c56556cea2101ca556f47aca7cde51ca205b2c024e7eec3320c085a5c2`
- Audio integrado: -17.6 LUFS; true peak -1.9 dBFS
- Sin barras verticales, cuadros negros ni congelamientos detectados

## Comparación cuantitativa

| Métrica temporal | Original 9:16 | Seedance 16:9 | Lectura |
| --- | ---: | ---: | --- |
| Luma media (YAVG) | 74.91 | 68.93 | Seedance es aproximadamente 8.0% más oscuro |
| Saturación media (SATAVG) | 14.27 | 13.17 | Aproximadamente 7.7% menos saturado; match fuerte |
| Diferencia entre cuadros (YDIF) | 8.78 | 7.70 | Aproximadamente 12.3% menos variación; cadencia cercana |

## Fidelidad observada

- El video comienza en el ojo mural con pintura húmeda y relieve visible.
- La salida del ala ocurre temprano y conserva el orden temporal del original.
- La guacamaya emerge de la pared acompañada por estelas físicas de pintura azul y verde.
- El vuelo avanza por la profundidad del callejón y conserva la energía del video de referencia.
- La pieza vuelve al ojo y conserva el arco narrativo completo dentro de diez segundos.
- El mundo fue regenerado de forma nativa en 16:9: no existe placa vertical, pillarbox, blur-fill ni relleno lateral.
- La paleta, el contraste y la saturación quedan considerablemente más cerca del original que los candidatos Omni.
- No aparece el portal negro ni el vacío artificial de la primera prueba Omni.

## Desviaciones y riesgos

- El primer y último ojo pertenecen al mismo lenguaje visual, pero no coinciden espacialmente: cambian el ángulo,
  la escala y parte de la geometría facial. El retorno es narrativo, no un loop pixel-perfect. SSIM primero/último:
  `0.1515`; el original tampoco cierra pixel-perfect (`0.2593`), pero su discontinuidad es menor.
- Durante el tramo final, la guacamaya en vuelo se superpone brevemente con el rostro que reaparece en la pared.
  Esta composición replica un beat del original, aunque aún puede percibirse como doble entidad por un instante.
- El arranque es más oscuro y cálido que el original debido a una fuente práctica ámbar en el lado izquierdo.
- La mezcla nativa está más alta que la candidata Omni y debe normalizarse en el finishing según el canal final.
- Algunos afiches y grafitis contienen marcas generativas no semánticas; no deben tratarse como copy legible.

## Evidencia

- `temporal/segment-0.png`
- `temporal/segment-2_5.png`
- `temporal/segment-5.png`
- `temporal/segment-7_5.png`
- `loop/first.png`
- `loop/last.png`

No se autoriza publicación, finishing generativo ni una segunda toma Seedance desde este reporte.
