# Destinos SKY: longitud, alineación y espacio

**Estado actual:** destino 1.2.0 y contenido 1.5.0; [corrección verificada localmente](layout-feedback-handoff.md),
pendiente aceptación visual del operador. Export v6, históricos v3/v4/v5 intactos.

Canon Workbench: `docs/architecture/workbench-sky-destination-content-flow.md`.
Marca única `sky-airline` / pack 0.1.0. Destination/admissions pertenecen al adapter sellado.

## Antes de componer

- Leer el plan `destinationRecipe`, `contentLayoutRecipe` y TODOS los campos del formato.
- Hay 95 destinos reales fijados por template/campos SHA. Dos textos legales catalogados como
  destino no reciben esta regla. No trasladar colores/Metric/pins a otra marca.
- Job declara copy completo, origen, moneda, precio, legales y foto. No admite posiciones,
  padding, estilos, fuentes o overrides. No rellenar legal con la oferta histórica.

## Selección y flujo

El motor prueba el tamaño nativo y después perfiles finitos admitidos: hasta dos líneas por
palabras, acentos intactos, sin truncar ni dividir nombres dentro de una palabra. Conserva saltos
explícitos; sin saltos busca equilibrio y evita preposición/artículo colgante si cabe otro corte.
Piso 16 px para pequeño display/banner/160 vertical; 40 px en piezas grandes. El plan fija la
lista exacta por fuente. No calcular una escala continua ni estirar letras. Esta excepción es
SOLO para destino: precio, CTA, badges, legales y financiación conservan su política propia.

Origen se sitúa tras la tinta efectiva y gap admitido 8–20 px. Banner: conjunto de nombre/prefijo/
origen centrado verticalmente en banda fuente, vecinos fijos. Panel blanco: precio y condiciones
siguen la altura del destino; el bloque completo se centra dentro de su banda admitida, con el objetivo de evitar
huecos heredados de nombres largos. 2668 usa center-row: equilibra prefijo/ciudad/origen
frente a toda la flecha, preserva fila 280/banda 8–272 y al menos 40 px de gap al footer.
2611/2668 dejan 16 px entre prefijo visible con icono de flecha y ciudad; origen conserva su gap.
Otros KV conservan ancla superior. Fotos, logo, CTA,
fidelidad, servicios y ventanas de viaje no se mueven por deducción semántica.

Si no cabe ningún perfil: falla explícitamente. Cambiar formato o revisar el copy con el operador,
nunca quitar «de», abreviar ciudad, omitir palabras o bajar de piso. San Pedro de Atacama cabe
con salto en determinados banners/paneles; no se promete en todos los slots estrechos.

## Legal y revisión

Contenido 1.5.0 separa función y source pin: de los 169 campos legales admitidos,
los dos footer-legal 1387 de 2611/2668 usan CENTER y los otros 167 conservan LEFT.
Condiciones 1241/1242/1254 siguen LEFT; las compactas mantienen una línea con tamaños
fijos 12/10/8 px. No extrapolar CENTER a todas las condiciones ni heredar cláusulas.
Los 76 badges tarifarios usan ancla LEFT propia, con label centrado dentro y precio conservado.
4685 usa editorialDiscount LEFT con eje final de destino/CTA; los titulares porcentuales
de las seis fuentes admitidas mantienen el eje HASTA. El comportamiento 1.3.0 y el rechazo
visual de v3 son historia, conservada en el [handoff](layout-feedback-handoff.md).

Revisar QA `destination-content-flow` (copy declarado/efectivo, perfil, tamaño/SHA fuente, líneas,
ancla, centros, tinta, límite y dependientes), `destination-origin-spacing`, `destination-prefix-city-spacing`, `destination-row-balance`,
`footer-center-axis`, `legal-left-axis` y `offer-stack.conditionAlignment`. Clipping de destinos/dependientes obligatorio, sin excepción
histórica de overhang. Ver PNG a tamaño nativo y detalles: alineación, respiración, logo, flecha,
CTA, condiciones y pie legal completo. Un fit no es aprobación comercial ni derechos.

Prueba local: `projects/sky/prueba-modular-24-adaptaciones/`, 24 formatos/source nodes distintos,
contenido ficticio, sin proveedores. Mantener runs previos inmutables, historial de selecciones,
PDF anterior y export nuevo. Commit, push, deploy y readback se registran por separado.
