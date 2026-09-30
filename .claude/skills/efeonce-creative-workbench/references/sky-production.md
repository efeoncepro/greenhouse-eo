# SKY: producir una campaña y sus adaptaciones

## Antes del diseño

Identificar cliente `sky`, marca `sky-airline`, pieza y campaña. Recoger objetivo, mercado,
destino/origen, período de venta/viaje, tarifa/moneda/condiciones, CTA, canales/formatos y
fuente de aprobación comercial. No reconstruir datos faltantes desde las tarifas del Figma.
La tipografía vigente confirmada por el operador es **Metric**; Inter es auxiliar/experimental.

Leer en Workbench `docs/manual/native-design.md`, `docs/manual/kv-zones.md`, el pack activo
y el brief. Instalar su canon por la ruta gobernada si falta; no copiar fuentes del sistema.

## Descubrir formatos y preparar contenido

Desde el root de Workbench, estas consultas son de lectura:

```sh
pnpm marca:adaptaciones sky
pnpm marca:adaptaciones sky node-2026-3928
pnpm marca:zonas sky node-2026-3928
```

El catálogo incluye 126 escenas nativas, no sólo exports ZIP visibles. Resolver por ID de nodo,
nunca por nombre repetido ni suponiendo que dos “banner” tienen iguales campos o legal.
Cada adaptación conserva canvas, membresía de zonas, textos, imágenes y jerarquía propios.

Para una pieza nueva:

```sh
pnpm pieza:nueva sky campana-nueva
pnpm marca:adaptaciones sky node-2026-3928 --plan projects/sky/campana-nueva
```

Son ejemplos de preparación; comprobar antes que el slug no corresponda a trabajo ajeno.
Completar el brief y `pieza.json`. El plan devuelve campos, fuentes efectivas, cajas, photo slots,
componentes, bloqueos y un `jobDraft`. El borrador tiene textos vacíos y foto sin definir: no es
un job aprobado. `eligible-for-validation` sólo describe compatibilidad de fuentes/estilos;
no valida nuevo copy, encuadre, autoridad ni píxeles.

El objeto `text` exige **todos** los IDs de `textFields` de esa escena. Un nombre de zona no es
un ID de texto. Reescribir explícitamente títulos, moneda, precio, CTA, condiciones y legal,
incluso cuando algunos coincidan con el maestro. No reutilizar un draft histórico como oferta.

`footer-legal` y `fare-conditions` son módulos diferentes. Si el pedido dice “condiciones”,
identificar cuál. Legal ausente se declara ausente: no se agrega por herencia. Elegir una escena
con espacio legal o solicitar una variante admitida si el brief lo necesita.

## Job de diseño

Usar `workbench.design-job.v1`, `brandId`, versión exacta, operación `reference.compose`,
`purpose`, lista completa de recursos admitidos, `text` completo y `photograph` explícito.
`internal-proof` es prueba; `production-preview` es preview de un brief real; ninguno aprueba.
Ejemplo completo inspeccionable: `projects/sky/components-proof/node-2026-3928.json`.
Sus datos comerciales son históricos: copiar estructura, no oferta ni fechas.

La lista de recursos parte del template seleccionado, catálogo, skill de producción, imágenes
de esa escena, `sky-fonts-manifest` y caras Metric necesarias. El plan indica caras efectivas;
no cargar recursos de otra marca ni modificar el pack para satisfacer un job.

El compositor conserva ancho/alto/tamaño nativos. Ajusta líneas por palabras y LF explícitos;
no reduce letra, trunca, corta palabras/NBSP ni transforma CR silenciosamente. Si un CR fuente
necesita LF, declararlo en el contenido nuevo. Overflow requiere copy adecuado o otra variante.
La excepción de wrap de URL canónica SKY sólo aplica a los legales exactos admitidos.

## Cambiar la fotografía

`{"kind":"source-reference"}` conserva de forma explícita la foto histórica de la escena.
Sirve para pruebas o reutilización autorizada; no acredita derechos de una campaña nueva.

Para una foto nueva propia, `photograph` usa `kind: broker-run`, `slotId` exacto, `piece` de
la intención fotográfica y `requestId` del broker. Los campos salen del manual y de la corrida;
no acepta ruta/URL local de foto ni UUID de otra persona/marca. Consulta/descarga verifican
autoridad, ZIP, inputs, locks y PNG; no generan otra imagen durante el diseño.

Si la foto se generó con un pack anterior, su recuperación no la admite automáticamente para
componer. La regla predecessor activa debe autorizar ese SHA y todos sus recursos originales
seguir admitidos sin cambios. No crear la regla desde el job.

FILL conserva encuadre nativo y registra recorte; FIT exige proporción compatible. Una imagen
correcta aislada puede perder foreground, rostro, hito o reserva de texto al entrar en el slot.
Inspeccionar cada adaptación. Para crear/admitir una foto leer `sky-photography.md`.

## Validar y ejecutar

Guardar un job propio dentro de la pieza; para diseño su path se resuelve **desde el root**:

```sh
pnpm marca:disenar projects/sky/campana-nueva projects/sky/campana-nueva/job.json --validate
pnpm marca:disenar projects/sky/campana-nueva projects/sky/campana-nueva/job.json --execute
```

Estos comandos presuponen brief/job/canon completos y pedido autorizado. Validación consulta
GitHub vivo y renderiza en memoria; no llama IA ni crea run de diseño. Foto de broker puede
recuperar/verificar su cache privado en la validación. Ejecutar crea nueva corrida con copy
shapeado por Metric, SVG/PNG/QA y locks. Campo faltante, glyph ausente, fuente ajena, overflow,
foto no admitida o receta pendiente bloquea antes del run.

`marca:componer` usa otro schema para referencia histórica; no usarlo para “cambiar campaña”.
El diseño modular sí usa geometría nativa más contenido declarado y correcciones admitidas.

## Todas las adaptaciones

Inventariar todos los IDs requeridos y su cobertura por canal. Preparar un job completo por
variante: seleccionar sus propios campos, legal y photo slot. No escalar el square ni copiar
coordenadas para fabricar horizontales/verticales. Reutilizar contenido comercial aprobado
como dato del brief, pero asignarlo explícitamente a cada campo del formato.

`pnpm sky:design-audit projects/sky/always-on-pipeline-proof` diagnostica cobertura del canon
instalado en memoria; no produce, autoriza ni asegura fit de un copy nuevo. El histórico tenía
95 copys shapeados y 31 rechazados; no confundir 126 planes compatibles con 126 ofertas válidas.
Para un lote autorizado, enumerar resultados y fallos por ID. No rellenar formatos fallidos
con otra marca/fuente o declararlos “traídos” sólo porque su miniatura existe.

## Revisión y cierre de pieza

Abrir el PNG final completo y recortes de logo, flecha, CTA, texto y footer. Revisar imagen,
encuadre, anatomía cuando aplique, composición, fidelidad, fuente/pesos, copy/fechas/moneda,
contraste, legibilidad, intersecciones y límites. No revisar únicamente la plancha reducida.

QA mide luminancia sRGB en núcleos de glifos sobre backdrop sin copy; excluye antialias de
borde, shadows/blends no soportados. Campos no medidos no se certifican. El ratio es diagnóstico,
no aprobación automática: 4,495581:1 no se redondea a una aprobación de 4,5.

Guardar evaluación con run, marca, PNG SHA, método, hallazgos y alcance. Estado `completed`
significa que el motor terminó. Criterio fotográfico confirmado no aprueba KV, legibilidad,
tarifa o publicación. Registrar aprobación comercial/entrega aparte cuando realmente existan.
Archivar resultados binarios fuera de Git con ubicación y SHA; conservar intent/locks.
