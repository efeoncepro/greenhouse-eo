# SKY: feedback de alineación pendiente para el próximo chat

Corte: 2026-10-01, posterior al documento `prueba-modular-24-v3`. El operador pidió
actualizar documentación y skills ahora y corregir las piezas en un chat nuevo. Este corte
prevalece sobre los apartados anteriores que declaraban LEFT global como regla vigente.
No implementar, regenerar, publicar ni sustituir resultados como parte de este handoff.

Canon de la continuación en Creative Workbench:
`docs/operations/sky-layout-feedback-handoff-2026-10-01.md`.
Leerlo junto con `docs/architecture/workbench-sky-designer-content-rules.md` y
`docs/architecture/workbench-sky-destination-content-flow.md`; contrastar con el código real.

## Qué cambió y qué sigue pendiente

- El feedback nuevo invalida **LEFT global para todos los legales**. Los pies legales
  señalados deben ir centrados. `footer-legal`, condiciones dentro de la flecha, cláusula
  comercial y texto editorial son funciones distintas: resolver alineación y ancho útil
  por source pin/receta, sin inferir CENTER global ni aplicar el nombre «legal» a todos.
  El diagnóstico de las fuentes selladas confirma `footer-legal`1387 CENTER en01-2611
  y03-2668; las condiciones1241/1242/1254 de esas fuentes son LEFT.
- `03-2668`: revisar el hueco bajo destino/origen y la relación con el pie legal. Compactar
  y equilibrar el conjunto en su banda admitida; no trasladar foto, logo o flecha por una
  corrección aislada de ciudad ni considerar suficiente que todos los campos quepan.
  Diagnóstico: el destino/origen acaba en172,8px locales, la fila conserva280px, la
  flecha272px y el pie inicia en320px. Esos datos explican el hueco y la dependencia:
  no subir el pie sin verificar colisión con la flecha ni enviar esas coordenadas en jobs.
- `01-2611`: revisar el badge DESDE y su eje respecto al precio y las condiciones dentro
  de la flecha. Ancho adaptativo y texto centrado dentro de la cápsula no prueban que el
  bloque completo esté alineado. Comprobar el eje visual de la pila por tinta, no sólo cajas.
  Diagnóstico: la oferta compleja tiene `offer=null`; `fareBadges`1231 conserva
  `sourceCenterX=62.5`, pero el runtime centra DESDE usando `(maxWidth-w)/2` en el
  parent de435px, separándolo del eje LEFT de precio/condiciones. El centro interno
  del label no comprueba la alineación entre componentes.
- `23-4685`: revisar HASTA / 5% / DE DCTO. / CTA junto al destino. Medir y comparar el
  conjunto completo para que sus ejes y separación sean coherentes con la receta fuente.
  La fuente sellada tiene HASTA4692/porcentaje4694/DE DCTO.4695 LEFT, pero
  `pin.stickers` los convierte a CENTER en sus cajas individuales. Pendiente:
  reclasificar ese conjunto como bloque editorial de descuento (`editorial-discount-block`)
  con eje compartido y admisión propia; no tratarlo como sticker circular ni copiar
  automáticamente una receta Cyber. El CTA mantiene su centrado interno propio.

Las tres capturas y sus vínculos a pieza/source pin están conservados en el handoff del
Workbench. Son evidencia de observaciones, no archivos ejecutables ni autorización de
cambios adicionales de identidad, fuente, logo, foto o contenido comercial.

## Estado técnico frente a aceptación visual

La implementación local `designer-rules@1.3.0` **todavía fuerza LEFT en 169 campos legales
de 104 fuentes**; destino `content-flow@1.0.0` conserva su selección de perfiles finitos
para 95 destinos. La corrección solicitada no está implementada por documentarla aquí.
Los 377 tests y cuatro gates del corte anterior son evidencia técnica histórica; no
certifican composición ni aceptación visual. El PDF v3 queda **parcial/rechazado en los
aspectos señalados**, no una entrega aprobada. Sus corridas, locks, outcomes, selección,
PNG/SVG, PDF y ZIP permanecen inmutables para poder comparar después.

No extrapolar rechazo a todos los componentes ni anunciar que se corrigió el problema.
No se verificaron nuevo commit, push, merge, paquetes, deploy o readback de producción.

## Cómo continuar y cerrar

1. Localizar el checkout real y revisar rama/HEAD/WIP. El checkout de esta sesión es
   `/private/tmp/cw-sky-production-flow`; esa ruta no es portable. No recrearlo ni cambiar
   ramas por deducción; no ejecutar ni alterar las CLIs de Greenhouse.
2. Cargar este handoff y el canon de Workbench, los tres jobs, source pins, recetas,
   selección vigente, QA y los renders nativos correspondientes. Comparar con Figma/
   referencia de cada fuente; separar footer legal, condiciones, badge y eje editorial.
3. Resolver la causa en componentes/admisiones del Workbench, con regla explícita por
   función y source pin; no añadir coordenadas, fuentes o overrides al job ni retocar PNG.
   Mantener Metric, identidad SKY, vecinos protegidos y límites admitidos.
4. Añadir regresiones por alineación de líneas, eje compartido, espacios y copy corto/largo;
   comprobar que ninguna receta ajena hereda la corrección. Correr checks proporcionales.
5. Crear corridas nuevas por la entrada gobernada, conservar los outcomes anteriores y
   comparar antes/después a tamaño nativo. Revisar las tres piezas y las otras adaptaciones
   que compartan la receta; tests sin revisión visual no cierran el feedback.
6. Exportar otro documento con estado honesto y pedir la revisión correspondiente. Actualizar
   contratos, estado y mirrors con la evidencia real; commit, push y publicación separados.

No hay aprobación comercial de estas muestras; contenido ficticio y fotografías históricas
ilustrativas continúan bajo su contrato anterior. No activar proveedores ni IA por este cambio.
