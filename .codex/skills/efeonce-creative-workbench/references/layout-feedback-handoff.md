# SKY: feedback de alineación y corrección local

## Corte v7 — 2026-10-01 (vigente)

**Status real: implementado, verificado y commiteado localmente en Workbench (`695b701`); aceptación del operador pendiente.**
Revisión pieza a pieza de v6 contra los PNG de Figma. Reglas derivadas de la fuente sellada:

- `footer-legal`: alineación = `text.align` de la fuente (`alignmentSource: sealed-source-text-align`);
  56 CENTER, 6 LEFT. Condiciones siguen LEFT.
- Destino 1.3.0: primera línea en el baseline nativo escalado; origen/seguidores en
  `líneas × interlineado + gap` (QA `lineBox`). Con copy fuente reproduce Figma (2698 → 140, 2707 → 220).
  Si cruza `maxFlowBottom` o la fila 2668, `flowPull`/`originPull` acercan sólo el excedente con piso
  tinta + gap. 3311 único `horizontalFrame: parent-center`.
- 42 pilas simples: `priceRowAlignment: fare-left-axis` (reemplaza «la fila se centra»).
- Doble moneda: `nativeInkGap` por pareja (3,9/3,3 px a 28 px; 11,7/10,3 px a 120 px), con mínimo 1 px
  si el medio no tiene espacio. SKY vende en USD, CLP, PEN, BRL, ARS y UYU: el estilo oración preserva
  códigos y símbolos (`US$`, `R$`, `S/`, `$U`).
- No cambiar sin pedido: condiciones 8 px dentro de la flecha en 160×600 y badge de origen en dos líneas.

Evidencia: 24 runs nuevos sin proveedores (un duplicado de diagnóstico de 05 no seleccionado),
19 PNG cambian y 5 son idénticos a v6; harness 392/392, sky 10/10, gates PASS; PDF v7 de 25 páginas
rasterizado y revisado. Canon `sky-airline/2026-10-01/prueba-modular-24-v7/` y `layout-correction-v7/`
(mapa de selección e historia previa). `projects/sky/prueba-modular-24-adaptaciones/` sigue fuera de Git.

## Corte v6 (histórico)

**Status real: corregido en componentes del Workbench; pendiente aceptación visual del operador.**
El pedido posterior «Corrígela en TODAS» amplió el alcance a los 76 badges tarifarios admitidos,
no sólo al 2611 inicial. Contenido 1.5.0 / destino 1.2.0. Export v6 conserva v3/v4/v5.
El catálogo completo de 126 fuentes no contiene DESDE tarifarios sin admisión; los 34 Tags
incluyen 18 prefijos IDA Y VUELTA DESDE que antes figuraban como other-copy.

Canon vivo: `docs/audits/sky-layout-feedback-correction-2026-10-01.md` en Workbench;
contratos `workbench-sky-designer-content-rules.md` y `workbench-sky-destination-content-flow.md`
en `docs/architecture/`. [Componentes](components.md) y [flujo de destino](destination-content-flow.md)
explican las reglas actuales. El bloque histórico inferior conserva el diagnóstico inicial y
sus restricciones de aquel corte; sus instrucciones de diferir el trabajo ya fueron reemplazadas
por la autorización de implementarlo. No tratar pendientes históricos como defectos actuales.

- Footer: CENTER sólo en los dos pins 1387 de 2611/2668; condiciones 1241/1242/1254 LEFT.
- 2668: columna equilibrada contra banda completa de flecha; fila/footer/foto conservados.
- 76 badges: cápsula LEFT sobre eje nativo del bloque tarifario; label centrado por tinta dentro.
  42 pilas simples usan `offer.badgeAnchor`; 34 complejas/dobles usan `fareBadges[].anchor`.
  No convertir stickers, origen o CTA a LEFT por el nombre DESDE. Precio conserva su layout propio.
- 4685: HASTA/porcentaje/DE DCTO. pertenece a `editorialDiscount`; eje LEFT con destino/CTA
  comprobado DESPUÉS del reflujo. CTA conserva centrado interno.
- Prefijo: 2611/2668 dejan 16 px entre icono+texto del prefijo y tinta de ciudad, con origen separado.

QA `footer-center-axis`, `destination-row-balance`, `destination-prefix-city-spacing`,
`fare-badge-left-axis`, `fare-badge-price-conditions-axis` y
`editorial-discount-destination-cta-axis`. Regresiones de TODOS los badges, longitudes y duales;
revisión PNG/PDF y selección final con evidencia en la auditoría. Los jobs mantienen copy completo,
Metric y fotos selladas, sin overrides de geometría ni retocar PNGs. Overflow sigue rechazándose.

Greenhouse sólo contiene esta skill espejo; mantener ejecución en el checkout Workbench autorizado,
preservar WIP y corridas previas. El pedido posterior autoriza subagentes, actualización documental
y commit local de lo propio; no autoriza push, publicación, auth/infra ni deploy.
La verificación anterior al commit está registrada en `layout-feedback-correction-v6/final-review.json`:
384 harness + 10 SKY + cuatro gates PASS; 14 runs nuevos, 24 selecciones, cero proveedores y
2.310 archivos previos SHA intactos. PDF v6 de 25 páginas/24 adaptaciones, atlas de 76 badges y
matriz de 13 variantes revisados. No hay aprobación comercial de muestras ficticias.
El commit se registra por separado cuando exista; no reinterpretar `commit: false` del snapshot
como prohibición vigente ni editar ese corte histórico para aparentar evidencia posterior.

---

# Histórico: handoff de alineación previo a la corrección

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
  Diagnóstico: el destino/origen acaba en172,8 px locales, la fila conserva280 px, la
  flecha272 px y el pie inicia en320 px. Esos datos explican el hueco y la dependencia:
  no subir el pie sin verificar colisión con la flecha ni enviar esas coordenadas en jobs.
- `01-2611`: revisar el badge DESDE y su eje respecto al precio y las condiciones dentro
  de la flecha. Ancho adaptativo y texto centrado dentro de la cápsula no prueban que el
  bloque completo esté alineado. Comprobar el eje visual de la pila por tinta, no sólo cajas.
  Diagnóstico: la oferta compleja tiene `offer=null`; `fareBadges`1231 conserva
  `sourceCenterX=62.5`, pero el runtime centra DESDE usando `(maxWidth-w)/2` en el
  parent de435 px, separándolo del eje LEFT de precio/condiciones. El centro interno
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
