# Destinos SKY: longitud, alineación y espacio

**Feedback posterior pendiente:** leer [handoff de alineación](layout-feedback-handoff.md).
LEFT global de legales fue invalidado por el operador; el código local todavía lo aplica.
Las observaciones de huecos, badge/ejes y promoción se corrigen en un chat nuevo.
Este documento describe la implementación y no aprueba el PDF v3 ni su composición.

Canon operativo en Creative Workbench: `docs/architecture/workbench-sky-destination-content-flow.md`.
Aislar `sky-airline` / pack 0.1.0; receta `sky-airline.destination.content-flow@1.0.0`
y contenido `designer-rules@1.3.0`. Archivos destination/admissions forman parte del adapter sellado.

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
huecos heredados de nombres largos. El hueco señalado en 03-2668 muestra que aún falta
revisión de la relación entre bandas, no sólo del interior de un componente. Otros KV conservan ancla superior. Fotos, logo, CTA,
fidelidad, servicios y ventanas de viaje no se mueven por deducción semántica.

Si no cabe ningún perfil: falla explícitamente. Cambiar formato o revisar el copy con el operador,
nunca quitar «de», abreviar ciudad, omitir palabras o bajar de piso. San Pedro de Atacama cabe
con salto en determinados banners/paneles; no se promete en todos los slots estrechos.

## Legal y revisión

La implementación local 1.3.0 fuerza LEFT por tinta y por línea en 169 campos de 104 fuentes;
las condiciones compactas siguen una línea con tamaños fijos 12/10/8 px. **El feedback nuevo
invalida esa generalización**: los pies legales señalados deben ir centrados y la corrección
debe separar funciones y source pins. No aplicar CENTER a todas las condiciones ni
modificar ejes del precio/badge por parecido semántico. Footer, condiciones y promociones
requieren admisión propia; no heredar cláusulas. El diagnóstico sellado de01-2611/03-2668
confirma footer1387 CENTER y condiciones1241/1242/1254 LEFT. El bloque promocional
de23-4685 es editorial, con fuente LEFT compartida, aunque el runtime lo trata como stickers.
Los titulares porcentuales de seis fuentes siguen el eje HASTA (regla 1.2.0 vigente).

Revisar QA `destination-content-flow` (copy declarado/efectivo, perfil, tamaño/SHA fuente, líneas,
ancla, centros, tinta, límite y dependientes), `destination-origin-spacing`, `legal-left-axis`
y `offer-stack.conditionAlignment`. Clipping de destinos/dependientes obligatorio, sin excepción
histórica de overhang. Ver PNG a tamaño nativo y detalles: alineación, respiración, logo, flecha,
CTA, condiciones y pie legal completo. Un fit no es aprobación comercial ni derechos.

Prueba local: `projects/sky/prueba-modular-24-adaptaciones/`, 24 formatos/source nodes distintos,
contenido ficticio, sin proveedores. Mantener runs previos inmutables, historial de selecciones,
PDF anterior y export nuevo. Commit, push, deploy y readback se registran por separado.
