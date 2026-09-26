# SKY A320neo — continuidad del plano

## Identidad visual que se debe conservar

Los archivos oficiales `A320neo_CFM_SKY_V02`, `V07`, `V10`, `V14`, `V16` y `VR` representan el mismo A320neo de SKY desde distintos ángulos. La identidad incluye fuselaje blanco, palabra SKY morada con acento lima, cola morada con chevrón lima, extremos de ala verdes, dos motores CFM y tren retraído en vuelo. Las vistas se usan como evidencia de geometría y pintura; no son piezas intercambiables para construir un híbrido.

| Toma o referencia | Uso |
| --- | --- |
| `h3v3/R4-avion.png` | Plano fotográfico de salida: avión oficial V02 sobre el cielo de amanecer. |
| `refs/A320neo_CFM_SKY_V02.png` | Vista frontal de tres cuartos y detalle del morro, cabina, motores y marca. |
| `refs/A320neo_CFM_SKY_V10.png` | Continuidad del costado inferior, ala, panza, cola y motores durante el sobrevuelo. |
| `refs/A320neo_CFM_SKY_VR.png` | Perfil y proporciones del fuselaje; ubicación de la marca. |
| V07, V14 y V16 en la carpeta oficial de OneDrive | Comprobación adicional de ala, cola y parte posterior si la cámara necesita esos ángulos. |

## Pruebas

- `probe-chip-to-sky-916.mp4`: cielo y entrada fuertes, pero el modelo perdió la marca en el fuselaje y generó una panza genérica. Rechazada para montaje final.
- `plane-pass-multiview-916.mp4`: Seedance 2.5 reference-to-video, request `01a0d0d5-063a-75b1-8890-57b0a2b0cb1e`. Conserva marca y silueta en la aproximación; los detalles del motor y la estructura se degradan en el acercamiento extremo. Usar sólo el tramo comprobado.
- `plane-v10-dawn-keyframe-916.png`: referencia fotográfica editada con la herramienta integrada `image_gen`, usando V10, C1-b y R4; preservar las vistas oficiales como autoridad final para la marca y geometría.
- `plane-v10-continuation-916.mp4`: Seedance 2.5 image-to-video, request `01a0d0d8-feca-7f30-8ae7-78512543bd95`. Mantiene la identidad en un vuelo lateral, pero el acercamiento también deforma detalles; queda como alternativa de plano, no como reemplazo automático.
- `sky-v4-plane-test-c-916.mp4`: montaje de prueba de 15 s. Conserva H3 v3 hasta 7,90 s, usa 0,70–2,50 s del plano multivista y retoma H3 v3 desde 9,70 s. El audio conserva la pista original de H3 v3. Todavía no es un máster aprobado ni su adaptación 4:5.

## Regla de montaje

Si el modelo vuelve a deformar la geometría o borrar la marca al cruzar de vista, dividir el gesto en tomas con corte motivado por flare/motion blur y partir cada toma de su vista oficial correspondiente. No ocultar una transición defectuosa en un plano continuo. Los textos, chip, logo y cierre siguen siendo piezas exactas del kit de Claude, compuestas después del video generativo.
