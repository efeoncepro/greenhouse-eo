# QA — Mural Guacamayas 16:9 V2

## Estado

`candidate_pending_operator_review`

La pieza recupera sustancialmente la dirección artística y la transformación causal del original, pero no se
considera aprobada sin revisión humana del master completo.

## Resultado técnico

- 1280×720, relación 16:9
- 24 fps, duración 10.005 s
- H.264 `yuv420p` + AAC 48 kHz estéreo
- 2,947,440 bytes
- SHA-256: `a5465a2fda84b351d3e64408e05ca09330ba449a5e02ce6304b3977dc99a671c`
- Audio integrado: -25.3 LUFS; true peak: -3.2 dBFS

## Comparación con la referencia original

| Métrica temporal | Original 9:16 | Candidato V2 16:9 | Lectura |
| --- | ---: | ---: | --- |
| Luma media (YAVG) | 74.91 | 75.31 | Exposición prácticamente equivalente |
| Saturación media (SATAVG) | 14.27 | 10.15 | V2 es aproximadamente 28.9% menos saturado |
| Diferencia entre cuadros (YDIF) | 8.78 | 7.11 | V2 tiene aproximadamente 19.0% menos variación temporal |

## Fidelidad observada

- Conserva el arranque macro en el ojo, el impasto visible y la ambigüedad pintura/animal.
- La pintura de la pared se convierte físicamente en ala; no aparece el portal negro de V1.
- Mantiene el lenguaje de concreto húmedo, afiches urbanos, cobalto, esmeralda y relieve de espátula.
- La guacamaya avanza hacia cámara dentro del callejón y vuelve al ojo para cerrar el bucle.
- El encuadre es una generación 16:9 full-bleed; no contiene una placa vertical superpuesta ni áreas de relleno.

## Desviaciones y riesgos

- El despliegue del ala sucede más tarde que en el original y el rostro completo permanece estático durante más
  tiempo, reduciendo ligeramente el crescendo.
- Entre aproximadamente 7.5 y 8.5 s, el ave en vuelo se solapa con parte del rostro mural residual. Aunque la
  pintura líquida conecta ambos estados, por un instante puede percibirse como dos entidades.
- El color es profundo y consistente, pero la saturación media queda por debajo del original.
- El campo horizontal muestra más arquitectura del callejón durante el vuelo; la guacamaya sigue dominante,
  aunque la escala se reduce más que en los primeros dos tercios.

## Evidencia

- `temporal/segment-0.png`
- `temporal/segment-2_5.png`
- `temporal/segment-5.png`
- `temporal/segment-7_5.png`
- `original-temporal/segment-0.png`
- `original-temporal/segment-2_5.png`
- `original-temporal/segment-5.png`
- `original-temporal/segment-7_5.png`

No se autoriza publicación automática ni una tercera generación desde este reporte.
