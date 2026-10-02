# Rig 2.5D del Spark

Página interactiva publicada: https://claude.ai/artifact/7qfzWJMiu2f7Fw9DWZRUwF (privada; se comparte desde su menú).

- **Capa 1 · cuerpo:** `spark-<linea>-sin-cara.png` (6 líneas), el Spark base de frente con el visor vacío,
  generado desde la vista `frente` con `../prompts/rig-sin-cara.txt` y recortado (fuente en `fuente/`).
- **Capa 2 · cara:** ojos y sonrisa en SVG con textura de matriz y brillo, recortados a la elipse del visor
  (cx 496, cy 414, rx 252, ry 96 en un viewBox de 1000). Siguen el cursor dentro del visor, parpadean y tienen
  6 expresiones (feliz, atento, trabajando, sorprendido, pensando, listo).
- **Capa 3 · cuerpo en 3D:** la esfera gira hasta 9° hacia el cursor y flota.

Rearmar la página: reemplazar `__BODIES__` en `rig-del-spark.template.html` por un JSON `{linea: dataURI WebP}`
de los 6 cuerpos y publicarla.

## v2 por capas (2026-10-01): brazos, manos, anillo y antena

Publicado en el Lab de AXIS: https://axis.efeonce.org/references/sparks/#rig (`<efeonce-spark-rig base=…>`).

Producción en `capas/` (en orden; todo reproducible):

1. `mask-anillo.png`: anillo segmentado con SAM 2 (`fal-ai/sam2/image`, puntos sobre el tubo y la esfera; el cuerpo
   como punto negativo) sobre `fuente/spark-engine-sin-cara.png`. SAM no sirvió para brazos ni manos (salían
   incompletos).
2. `mascaras.cjs`: el resto por geometría. Cuerpo = elipse medida (cx 794, cy 716, rx 417, ry 410 sobre 1600);
   brazos = fuera de la elipse, bajo y = 780 y a los lados; manos = más allá de la muñeca (x < 232 / x > 1368);
   antena = sobre y = 292; anillo partido en mitad trasera (sobre la línea entre sus extremos) y delantera (con la
   esfera).
3. Relleno de lo que tapaba el anillo: inpaint con máscara sólo sobre esa banda (`prompts/rig-v2-banda.txt`,
   `banda-1.png` elegida). **La edición sin máscara (`rig-v2-cuerpo-limpio.txt`) reencuadra el cuerpo: no sirve.**
4. `capas.cjs`: capas alineadas de 1600 px + `pivotes.json`. El brazo suma sólo la parte navy de la articulación a
   ≤ 80 px del hombro (más lejos arrastraba paneles del cuerpo que giraban con el brazo).
5. Poses de mano: inpaint sobre la mano derecha (`prompts/rig-v2-mano-{abierta,senala,puno}.txt`). Elegidas
   abierta-1 (pulgar + tres dedos, como el original; la 2 tenía cinco), senala-1 y puno-2. `manos.cjs` las recorta del
   gris y crea las izquierdas en espejo, llevadas a su muñeca.
6. `islas.cjs` quita motas; `lineas.cjs` recolorea la luz azul a las seis líneas y exporta WebP de 1000 px
   (`web/<línea>/`, ~190 KB por línea). `manifiesto-v2.json`: SHA-256 de los masters.
7. Bucket: `sparks/v1/web/rig/v2/<línea>/` y `sparks/v1/masters/rig/v2/engine/`.

Costo: ~USD 2 (2 ediciones descartadas, 2 inpaints de banda, 6 de manos, 6 SAM).
