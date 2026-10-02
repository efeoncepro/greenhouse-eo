# Spark 2D

Versión plana (ilustración vectorial) del Spark, **alternativa** al kit 3D, no su reemplazo. Reglas en
[SPARKS_V1 §8.2](../../../docs/operations/brand-characters/SPARKS_V1.md#82-la-versión-2d-ilustración-plana).

- **Canvas de exploración:** https://claude.ai/artifact/1z3Mr7Z7zvPgoFgXN2gmUe (privado; se comparte desde su menú).
  Láminas: 3D y 2D lado a lado, expresiones, color por línea, plantel, tamaños y tres composiciones (post 4:5 Engine,
  story 9:16 Growth, lámina 16:9 en papel).
- **Fuente:** `spark-2d.dc.html`, el componente del canvas (un SVG de viewBox 400). Props: `accent` (acento de la
  línea), `expr` (feliz, atento, trabajando, sorprendido, pensando, listo), `accessory` (ninguno, lupa, tarjeta,
  fichas, burbuja, grafico), `outline` (`si` sobre papel), `arms` (`no` por defecto), `detail` (`auto` pasa a la
  versión simple a 72 px o menos) y `size`.
- Sin degradados ni `id` internos: varias instancias conviven en una página sin chocar.
- Pendiente: exportar SVG estáticos y publicarlos en `@efeoncepro/axis-brand-assets` (SPARKS_V1 §11).
