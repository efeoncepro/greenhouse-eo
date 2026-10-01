# Componentes y correcciones nativas SKY

Canon Workbench: `docs/architecture/workbench-sky-modular-components.md` y
`brands/sky-airline/components/`. La composición no redibuja cada adaptación a mano.

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
orquesta ensamblado, grafo, contenido, foto, renderer y contraste. Los trece módulos participan
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
Los contenedores ordinarios y las formas no circulares mantienen su comportamiento anterior.

`reference:build … --native-previews` verifica primero los previews históricos sellados y
produce un snapshot nuevo desde templates/imágenes del pack SKY. `reference-projections.json`
liga SHA original, template, renderer y PNG/SVG nuevos; el manifest liga ese archivo por SHA.
Los originales y outputs anteriores no se sobrescriben. El baseline
`brands/sky-airline/adaptations/native-geometry-baseline.json` fija los 126 resultados de esta
revisión y conserva el SHA histórico en los formatos no afectados. No equivale a aprobación visual.

Una muestra de producción antigua sigue siendo su corrida original: para aplicar una corrección
del renderer a copy/foto propios hace falta una corrida nueva con la autoridad viva habitual.
No modificar PNG/SVG/QA de un UUID completado ni presentar un render local como ejecución productiva.
