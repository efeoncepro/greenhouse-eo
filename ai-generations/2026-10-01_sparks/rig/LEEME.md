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
