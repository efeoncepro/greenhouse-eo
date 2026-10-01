# Componentes y correcciones nativas SKY

## Alcance integrado — 2026-10-01

PR14 cerró la comparación técnica independiente de 126 referencias; PR15 añadió los componentes
estructurales consumidos por la producción. El Lab de PR16 sólo presenta sus recursos y relaciones.
Para operar, leer [flujo de agentes](agent-production.md) y [autónomos](autonomous-components.md).
Los conteos de reparaciones de apartados iniciales registran unidades históricas: el inventario
efectivo posterior contiene 12 logos, 105 flechas y las admisiones source-specific detalladas
al final. No volver a arreglar cada pieza a mano ni generalizar pins a otra marca/fuente.

El logo, iconos (incluido avión) y curvas nativas son vectoriales cuando la fuente conserva paths.
La foto y los PNG de referencia son raster; ver un icono dentro de un PNG no convierte su fuente
en raster. Inspeccionar instancia/definición/assets originales y extracción contextual para
comprobar escala y máscara; no agrandarlo con CSS del Lab ni dibujar otro avión por parecido.

Canon Workbench: `docs/architecture/workbench-sky-modular-components.md` y
`brands/sky-airline/components/`. La composición no redibuja cada adaptación a mano.

La biblioteca adicional de [íconos SKY](icons.md) contiene 101 familias y variantes
nativas `kind`/tamaño, con receta `sky.icon.native-variant.v1`. Es una colección
candidata separada del grafo productivo: seleccionar una variante no sustituye
las instancias admitidas ni amplía recursos/slots de una campaña.

## Biblioteca y grafo

Las 21 familias son canvas, photo, brand-logo, cta, offer-arrow, fare-price, fare-conditions,
footer-legal, destination, origin, campaign-title, campaign-subtitle, campaign-mark,
promotion-sticker, discount-code, corporate-strip, loyalty, ancillary-services, financing,
graphic-assets y other-copy. No son 21 dibujos universales ni todos están en todos los formatos.

`native-graph.mjs` verifica bytes de template/catálogo, marca, versión, FIG SHA y admisión exacta.
Registra cada instancia nativa con path, tipo, padre/hijos y SHA de subárbol; agrupa sus miembros
en componentes semánticos sin duplicar dibujo. Los 1196 campos de las 126 escenas tienen
exactamente un módulo responsable, incluido CTA. Un footer ausente no aparece por herencia.
Plan y QA exponen `components`, `contentSlots` y `nativeInstances`.

La unidad integrada por PR15 el 2026-10-01 añade la representación ejecutable de cada capa, definiciones,
tokens tipados, assets y recetas. Consultar [autonomous-components.md](autonomous-components.md)
para readers/export/extracción/roundtrip y evidencia de bindings. No confundir el grafo semántico
anterior con esa biblioteca estructural; ambas ya están integradas en main, con contratos distintos.

La variante es la escena realmente admitida, con jerarquía, orden, placement, clips, masks y
paints originales. El job cambia contenido, no define módulos ejecutables ni geometría nueva.
El grafo no concede acceso ni demuestra que el copy actual o la foto elegida sean adecuados.

## Módulos y composición

| Archivo en `components/` | Responsabilidad |
| --- | --- |
| `index.mjs` | Registry inmutable y cierre de dependencias del adapter |
| `source-admission.mjs` | Verifica fuente exacta y ausencia de cambios conflictivos en subárbol |
| `native-graph.mjs` | Instancias/variantes y ownership único de campos |
| `assemble.mjs` | Admisiones independientes contra el mismo original sellado |
| `logo.mjs` | Escala interna de los seis logos registrados, sin redibujar artwork |
| `offer-arrow.mjs`, `arrow-admissions.mjs` | Un contorno continuo para 74 variantes exactas |
| `cta.mjs` | Metric y centrado de tinta visible en CTA registrados |
| `content.mjs` | Shapeado Metric, estilos, líneas, límites y mediciones de slots |
| `text-policy.mjs` | Legal/financiación mixtos y case nativo admitidos |
| `photograph.mjs` | Bytes de imagen/foto propios, FILL/FIT y crop nativos |
| `campaign-mark.mjs` | Corrección de fecha Cyber en tres fuentes exactas |
| `artwork.mjs` | Premio y máscara circular en dos fuentes exactas |

Los entrypoints antiguos `adaptations/*-repairs.mjs`, `cta-recipes.mjs`, `text-recipes.mjs` y
`production-template.mjs` exportan compatibilidad, sin segunda lógica. `render-design.mjs`
orquesta ensamblado, compilación/recomposición modular, contenido, foto, renderer y contraste. Los módulos participan
de `skyComponentModulePaths`, del SHA del adapter y de auditorías; cambiar uno exige nueva corrida.

## Bugs y solución causal

**Logo:** en la importación, los paths derivados ya tenían escala aplicada, pero las posiciones
internas conservaban la del master. El resultado separaba símbolos y cortaba la Y. No escalar
paths otra vez ni escribir “SKY” con una fuente. Seis pins: 4678/4685 al 2/3; 3825/3854/3891/3928
al 1/2. En los cuatro estrechos el FIG declara `uniformScaleFactor=0.5`; se restaura también
el contenedor/clip 65,5×24. Conservar precisión nativa del otro contenedor, no redondearla.
Se mantienen los cuatro paths, paints, ubicación y tamaño del logo. QA: `logoRepairs`.

**Flecha:** tres fills separados pueden dejar líneas antialias aunque sus edges sean adyacentes.
La biblioteca retira aristas internas y conserva un contorno exterior con curvas/control points
originales, una sola pintura, tag y texto intactos. No expandir segmentos como parche ni retocar PNG.
74 pins, once alturas 70/78/92/116/120/140/264/300/320/336/344. Hay adyacencia y solapes nativos de
un píxel; cuatro variantes son blancas, no “errores de morado”. QA: `arrowRepairs` y digest de path.

**CTA:** 41 fuentes importadas como Assistant-Bold tienen receta Metric-Bold sellada, tamaño/caja
nativos y fit de una línea. Centrar la **tinta visible** en ambos ejes, no sólo caja tipográfica o
baseline nominal. Plan/QA conservan font original, efectiva, centros y baseline corregida.
No usar un offset distinto por pieza para arreglar “Ver rutas”.

**Texto mixto:** 18 campos de diez formatos conservan legal Regular/URL Semibold y cuotas
Black/sufijo Medium; dos encabezados mantienen UPPER. El lector recupera definiciones por key/versión
exactos, sin heredar paints. La URL canónica de ocho legales puede dividirse sin truncar caracteres
ni insertar guiones. No uniformar pesos ni aprovechar esa excepción para URLs arbitrarias.

**Contenedores/máscaras:** prioridad incorrecta de tamaño de instancia recortaba premio en 2885/2984;
OUTLINE circular tratado como rectángulo dejaba sticker incorrecto. La admisión preserva artwork y
recupera contenedor/máscara nativos. El reader mejorado no activa automáticamente las demás escenas.
QA: `vectorRepairs`. Fuente nueva candidata necesita revisión/admisión.

**Campaña Cyber:** tres traslaciones de fecha admitidas contra controles independientes. No mover
wordmark ni habilitar coordenadas de job. QA: `layoutRepairs`, original/efectivo por fuente exacta.

## Modificar o añadir componentes

Pedido explícito de mantenimiento, fuente inspectada, marca/FIG/template SHA exactos y ownership
claro. Buscar módulo existente antes de otro; admitir variante nueva desde fuente, no por parecido.
Verificar que las recetas independientes no se pisan ni aceptan subárbol ya modificado. Mantener
compatibilidad histórica y registrar corrección efectiva en QA, sin resignar template/pack a escondidas.

Tests proporcionales: fuente/identidad cruzada rechazada, registro inmutable, cambio de bytes
reseñado rechazado, paths/paints/copy preservados, propiedad geométrica/raster real del bug.
Para flecha comprobar ambas uniones sobre fondo contrastante, incluida pintura blanca. Para logo
comparar PNG con/sin clip: el corregido no pierde píxeles. No “probar” sólo el nombre del componente.

`pnpm harness:test`, `pnpm sky:test`, `pnpm gates`, `git diff --check` desde Workbench.
Tests de assets/font privados requieren canon instalado; un skip de CI pública no prueba píxeles.
No reescribir outcomes anteriores; generar runs nuevos y revisar PNG completo, además de recortes.

El módulo es reusable dentro de su marca y variantes admitidas. Efeonce/Berel requieren bibliotecas
propias; compartir helpers neutrales no permite portar values ni admitir sus assets desde SKY.

Para reunir variantes bajo una composición nombrada y seguir su proceso, leer
[composiciones y recetas](recipes.md). La receta versionada relaciona los formatos nativos y sus
componentes; los fields, la geometría y el legal siguen siendo propios de cada adaptación. No
heredar copy comercial ni introducir recipe overrides desde un job. Plan/QA asocian la receta
desde el formato admitido y el digest del adapter mantiene auditables sus módulos de metadata.

## Recetas de familia y ownership verificable en el Lab

La unidad de composiciones incorpora una receta declarativa para cada una de las 21 familias:
`sky-airline.component-recipe.<kind>` v1.0.0, con pasos y
`execution: existing-native-component; descriptive-metadata-only`. Describe el módulo existente;
no añade otro renderer, geometría editable o permisos de producción. La receta de composición
agrupa las familias presentes en sus variantes, sin crear componentes donde la fuente los omite.

La metadata de catálogo/zonas/canvas se completa con CTA observado en grafos nativos sellados.
`brands/sky-airline/compositions/native-component-slots.mjs` conserva 126 template pins y 41
instancias/41 fields CTA; el corte se leyó localmente el 2026-09-30. Los fields CTA pertenecen a
`sky-airline.cta` con basis `sealed-native-component-graph`, conservando nodo y template exactos.
El registro contiene metadata de paths, no fotos, vectores, fonts o copy. Su digest es el SHA de
`JSON.stringify(nativeComponentSlots)` fijado por `sourcePins.nativeComponentSlotsSha256`, distinto
del digest de bytes del módulo incluido en el adapter.

Para mantenerlo, leer fuentes privadas previamente autorizadas/admitidas sin modificarlas, derivar
el grafo mediante el código dueño y contrastar members/fields de todos los formatos antes de
registrar metadata/pins/version/hash. No identificar CTA por texto o rectángulos similares. Validar
metadata pública y comparación privada; sin canon, un test no certifica una extracción nueva.
No re-sellar pack ni reescribir QA/outcomes antiguos. Procedimiento detallado y límites de tokens
disponibles frente a bindings Figma en [recetas](recipes.md).

## Fotografía sustituible: PR 9 integrado

`photo-frame.mjs` se incorpora al digest del adapter; admite exactamente story 2611, banner 3378
 y 4:5 4616 por SHA y slot propios de SKY. Receta native-focus-cover 1.0.0: ventana proporcional
sobre bytes broker verificados, foco fuente o centro FIT, clamping dentro del archivo, sin bandas
ni opciones de crop en un job. Plan/QA registran receta y fracción visible. FILL no cambia;
las demás fuentes no heredan admisión. Ver `sky-production.md` para pruebas y problemas visuales
pendientes; el encuadre técnico no concede legibilidad o aprobación. Merge confirmado en main
`609d876feeef46b5785171d321fb4898ad9973cf`; un deploy o una entrega requieren su propio readback.


### Contornos circulares y previews del Lab

El renderer de SKY conserva `fillGeometry` en contenedores cuadrados plenamente redondeados
(FRAME/INSTANCE/SYMBOL/ROUNDED_RECTANGLE). No reconstruir sus círculos con curvas cuadráticas
ni cambiar proporciones por CSS. La rotación debe afectar por igual fondo, borde y contenido.
Los contenedores ordinarios también conservan los trazados disponibles, incluidos corner smoothing y radios independientes; el fallback sólo opera cuando no hay trazado fuente.

`reference:build … --native-previews` verifica primero los previews históricos sellados y
produce un snapshot nuevo desde templates/imágenes del pack SKY. `reference-projections.json`
liga SHA original, template, renderer y PNG/SVG nuevos; el manifest liga ese archivo por SHA.
Los originales y outputs anteriores no se sobrescriben. El baseline
`brands/sky-airline/adaptations/native-geometry-baseline.json` fija los 126 resultados de esta
revisión y conserva el SHA histórico en los formatos no afectados. No equivale a aprobación visual.

Una muestra de producción antigua sigue siendo su corrida original: para aplicar una corrección
del renderer a copy/foto propios hace falta una corrida nueva con la autoridad viva habitual.
No modificar PNG/SVG/QA de un UUID completado ni presentar un render local como ejecución productiva.


## Comparación independiente y recetas adicionales — 2026-09-30

Canon actualizado en Workbench: `workbench-sky-reference-comparison.md`. La inspección
usa 126 PNG REST independientes, versión 2404786957900889048, y recompone la copia
histórica con el motor actual en un carril de mantenimiento. Cero invocaciones de IA;
no genera UUID productivo ni hereda autorización comercial.

El registro efectivo contiene 12 logos reparados (seis grandes + seis pequeños),
105 flechas (74 + 25 + seis unions nativos), 21 bordes circulares `2 INSIDE`, un
premio 2910 de 380 × 69 y tres grupos sin clip heredado de 4697. Los dos CYBERSKY
2640/2845 restauran metadata de 15 descendientes cada uno; sus paths ya escalados
no se escalan dos veces. Todos los pins son específicos de template, nodo y marca.

Las seis unions deben tener winding coherente: contornos opuestos cancelan pintura
en su intersección. `native-paint.mjs` integra exactamente el área Bézier y revierte
control points cuando corresponde; nunca expande bordes ni redibuja una silueta.
La regresión raster inspecciona también el primer join, no sólo el centro del cuerpo.

Las máscaras OUTLINE heredadas conservan contornos de hojas y transforms compuestos.
Los círculos y chips bancarios usan curvas originales; nunca cajas sintéticas que
eliminen radios independientes. La referencia del Lab puede proyectar estas recetas
con `--native-previews`, conservando los glyphs originales y la procedencia histórica.

27 campos tienen overhang presente en la fuente; sus caps se ligan a field, template,
ancestro, cara Metric y límite medido. No modifican el clip ni admiten nuevas regiones.
El `$` de 4678 usa Regular 32 efectivo en lugar del descriptor heredado Bold 56.
El ajuste de altura respeta el primer baseline y usa el baseline real para cada línea
adicional; jamás clamping general que permita otra línea fuera de caja. El URL canónico
legal prefiere `/` y `-` como cortes; conserva cada carácter y su índice de estilo.

Comando reproducible, **desde Workbench**, tras instalar su canon privado:

```sh
node tools/sky-current-reference-comparison.mjs --manifest /ruta/privada/exports.json --out /ruta/privada/nueva/comparacion
```

`audit.json` registra 126 nodos, métricas por zona, SHA de controles/PNG/SVG, copia,
recetas, fuentes y módulos. `index.html` permite inspeccionar las dos piezas en tamaño
nativo y la diferencia amplificada. La revisión humana/técnica se registra aparte:
una métrica o un render exitoso no aprueba una campaña. Para fotografía/copy nuevos,
usar `marca:disenar`/`marca:lote` con la autoridad normal y contenido explícito.

## Reglas de la diseñadora para contenido variable — 2026-10-01

Canon: Workbench `docs/architecture/workbench-sky-designer-content-rules.md`.
La receta local `sky-airline.content-layout.designer-rules@1.0.0` tiene 104 fuentes selladas:
119 campos de precio, 126 de sticker, 76 relaciones destino/origen y 42 pilas simples en flecha.
Cada variante sólo recibe las reglas de sus elementos admitidos.

- Medir tinta real de Metric para centrar stickers y alinear cada moneda con su precio.
- Importes en Metric Black sellado, tamaño nativo; sin shrinking ni fallback.
- Condiciones debajo del precio en estilo de oración, conservando acrónimos y URLs.
- Origen tras las líneas efectivas del destino con gap nativo; badge de origen con icono, altura
  y padding nativos, ancho adaptativo. No mover un frame compartido que también contiene la ciudad.
- Badge de tarifa adaptativo y centrado; badge/precio/condiciones en una pila con separación.
  El legal de tarifa permanece dentro de la flecha. `footer-legal` sigue independiente.
- Filas dobles de moneda se resuelven por pares fuente; un overflow se rechaza, no se omite la moneda.

El plan declara `contentLayoutRecipe` y la fuente efectiva Black. QA expone `contentLayouts`,
`badgeLayouts`, `measurements[].conditionCopyTransform` y `finalSceneSha256`. La escena modular
es la base; la extensión registra aparte sus ajustes productivos. Los checks finales de tinta
contra clips efectivos son obligatorios incluso para los campos que se recolocan.

Revisión recibida: `ajustes.pdf`, SHA c6fe9d463a74a119d314e030e3513b176f7d890f6b07a0f69811f60afd42c24a.
Prueba nueva: `projects/sky/calama-reglas-diseno-7-formatos` (7 formatos, copy completo, fotos
históricas, cero proveedores). No inventar fechas, descuentos ni código monetario desde `$`.
Leer `review.md` de esa pieza para corridas seleccionadas, documento y verificación.
Cambios locales sin publicación acreditada; nunca modificar los CLIs de Greenhouse para producir.

### Condiciones compactas, regla 1.1.0 — local 2026-10-01

El operador autorizó una sola línea y tamaño menor en condiciones de la flecha compacta. `content-layout-admissions.mjs` fija 24 ofertas: display 12 px, banners 10 px y verticales 8 px; se conserva Metric/peso/color. La implementación 1.3.0 aplica LEFT, pendiente de corregir por función/source pin según [feedback nuevo](layout-feedback-handoff.md); lineHeight1,2; sin selección desde job ni cálculo de autofit por longitud. Máximo una línea: copy excesivo falla explícitamente. Plan `conditionTypography` y QA `offer-stack.conditionTypography` + `measurements.size`. No aplicar a pies legales, doble moneda o financiación. Prueba `projects/sky/prueba-modular-24-adaptaciones/`, incluyendo condiciones completas en display/vertical. Leer contrato Workbench actualizado, no redibujar la pieza o corregir PNG.

La prueba de 24 variantes añadió dos reglas de visibilidad/separación: al mover condiciones dentro de una flecha, heredar la pintura sellada del precio (también en los estilos de glifos), para evitar morado sobre morado; las dobles monedas conservan la orientación fijada por fuente y sus slots laterales o filas, con cajas finales que no se intersectan. QA `conditionPaintFromPrice`, `dual-currency-row` y `dual-currency-separation`. No aceptar fit como evidencia de visibilidad.

El badge DESDE de tarifas dobles/complejas usa ahora 16 pins adicionales, además de las 42 pilas simples: ancho de tinta + padding fuente, altura fija, extremos reales y centros de tinta comprobados. Plan `contentLayoutRecipe.fareBadges`; QA `fare-badge-adaptive`. No asumir que el badge de una doble moneda participa en `offer-stack`; revisar su admisión propia. Overflow se rechaza.

### Titular porcentual en flecha: eje izquierdo

Receta local1.2.0: seis fuentes3032/3040/3051/3059/3070/3078. El bloque «20% Dcto. / en rutas de prueba» sigue la referencia «50% Dcto. / en todos los destinos»: titular multilineal LEFT, todas las líneas y condiciones sobre el eje izquierdo nativo del badge HASTA. HASTA permanece centrado dentro de su badge. Se conservan tamaños, fuentes y bandas verticales; no centrar el titular como sticker. Pins exactos y `promotion-arrow-left-axis` en QA; ancho y clips finales obligatorios.

## Implementación local y feedback de alineación pendiente — 2026-10-01

Leer [destinos y espacios adaptativos](destination-content-flow.md) para conocer la implementación local y sus límites. **Antes de continuar, leer [feedback pendiente de alineación](layout-feedback-handoff.md)**: el operador invalidó LEFT global de legales y señaló huecos/ejes en 03-2668, 01-2611 y 23-4685. Corregir en el próximo chat por función y source pin; no aplicar CENTER global por deducción. El código 1.3.0 sigue LEFT, los 377 tests no certifican aceptación visual y el documento v3 queda parcial/rechazado en esos aspectos. No mover fotos/ventanas como origen, aplicar autofit a otros componentes ni sustituir corridas históricas.
