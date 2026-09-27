# Composición de decks y brochures de marca propia

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude
> **Documentacion tecnica:** [Norma de composición por superficie](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md)
> **Manual de uso:** [Componer una pieza por superficie con AXIS](../../manual-de-uso/creative/componer-por-superficie-con-axis.md)

## Qué es

Componer un deck o un brochure de marca propia es **pedir una lámina, o un documento completo, describiendo su
contenido**, y recibirlo armado con la línea gráfica de Efeonce («La órbita»). Nadie dibuja la lámina a mano ni copia
medidas de un archivo de diseño.

El pedido es un archivo corto que dice qué lámina se quiere, qué texto lleva y qué foto usa. El sistema lo revisa contra
las reglas de la marca y, si todo calza, entrega la pieza. Si algo no calza, no entrega nada y dice qué falló.

| Pregunta | Respuesta |
| --- | --- |
| ¿Para qué marca sirve? | Sólo para la marca propia de Efeonce. No es para piezas de clientes ni para la interfaz de Greenhouse |
| ¿Qué documentos arma? | Un **brochure** (presenta a Efeonce) o una **propuesta comercial** (va dirigida a un cliente) |
| ¿Quién lo usa hoy? | Una persona o un agente, desde su equipo, con un comando |
| ¿Está en el portal? | No. Hoy es un taller local; la ruta desde el portal está pendiente |

> Detalle técnico: [norma de composición por superficie](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) ·
> [manual de uso](../../manual-de-uso/creative/componer-por-superficie-con-axis.md) ·
> comando `pnpm brand:compose` en [`scripts/brand-surfaces/compose.ts`](../../../scripts/brand-surfaces/compose.ts) ·
> contrato `efeonce.surface-composition` 0.1.2 de AXIS.

## Qué láminas se pueden componer hoy

Las 69 láminas del deck están aprobadas como diseño, pero sólo una parte tiene plantilla para componerse sola. Éstas
son las que se componen hoy:

| Familia | Lámina | Variantes | Para qué sirve |
| --- | --- | --- | --- |
| Portada | Portada de brochure | documento · por línea de servicio | Abre un brochure. Foto a pantalla completa y columna de texto |
| Portada | Portada de propuesta | órbita · amanecer | Abre una propuesta. Sin foto; lleva el logo del cliente |
| Contraportada | Contraportada de brochure | órbita (sin foto) · con foto | Cierra un brochure, con datos de contacto y redes |
| Contraportada | Contraportada de propuesta | una sola | Cierra una propuesta. Con foto; el mensaje es el eslogan |
| Sección | Sección clásica | una sola | Abre un capítulo |
| Sección | Sección partida | esquina arriba · esquina abajo · panel a la derecha | Abre un capítulo con foto y muestra el avance del documento |
| Propuesta de servicio | Lámina de cine | servicio · protagonista · líneas | Presenta un servicio, una idea protagonista o las líneas de servicio |
| Contenido | Medida | una sola | Muestra una cifra con su fuente |
| Método | Escalera | una sola | Muestra un método por niveles |
| Secuencia | Tríptico | una sola | Tres tomas, una palabra por toma |

Lo que **no** se puede componer hoy:

| Qué | Por qué |
| --- | --- |
| Las 38 láminas restantes del deck | Están aprobadas como diseño, pero todavía no tienen plantilla. Es trabajo pendiente |
| La portada y la contraportada «clásicas» | No fueron aprobadas; quedaron reemplazadas por las portadas y contraportadas de arriba |
| Una portada de brochure con marca de selección | Las reglas de la marca no admiten selección en esa portada |
| Un tríptico con más de una palabra por toma | La lámina es una palabra por toma; con más, el pedido falla |

> Detalle técnico: plantillas en
> [`src/lib/artifact-composer/catalogs/graphic-line-deck/`](../../../src/lib/artifact-composer/catalogs/graphic-line-deck/)
> (16 plantillas en `registry.json`) · recetas en
> [`src/lib/brand-surfaces/recipes/`](../../../src/lib/brand-surfaces/recipes/) ·
> [catálogo de las 69 recetas](../../operations/brand-graphic-line/deck-recipes/README.md) ·
> [norma §4.6](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) · las 38 restantes son TASK-1928.

## Qué decide la persona y qué decide el sistema

La regla es simple: **la persona decide el contenido; el sistema decide la forma.**

| Lo decide la persona | Lo decide el sistema |
| --- | --- |
| Qué lámina quiere y en qué variante | Medidas y posiciones de cada elemento |
| Si el documento es un brochure o una propuesta | Colores |
| El texto: pregunta, respuesta, bajada, pasos | Tipografía: familia, tamaño, peso e interlineado |
| La foto y su descripción | El recorte de la foto al tamaño de la lámina |
| La línea de servicio del documento | La órbita, el indicador de avance y la firma |
| El logo del cliente, en una portada de propuesta | Los datos de contacto de Efeonce en la contraportada |
| La altura de la columna de texto de una portada, según dónde queda la persona en la foto | El rango permitido para esa altura |
| En qué esquina va la marca de selección | El dibujo de la selección y del cursor |

Dos detalles que conviene conocer:

- **La variante siempre se declara.** El sistema no adivina cuál quieres.
- **La forma no se ajusta desde el pedido.** Si una medida o un color necesita cambiar, se cambia en el sistema de
  diseño, con aprobación, y el cambio llega a todas las piezas.

> Detalle técnico: campos del pedido en el
> [manual, paso 2](../../manual-de-uso/creative/componer-por-superficie-con-axis.md) · valores de forma en los tokens de
> AXIS (`efeonceGraphicLine.surfaces.deck.recipes.<receta>`, `@efeoncepro/axis-tokens`) · contacto en `EFEONCE_CONTACT`
> de [`src/config/efeonce-brand.ts`](../../../src/config/efeonce-brand.ts) · skill `axis-design-system`.

## Cómo se cambia la foto o el texto

La foto y el texto **no viven en la plantilla**: viven en el pedido. Para cambiarlos se edita el pedido y se vuelve a
componer.

1. Se crea un pedido propio para la pieza (no se edita un ejemplo del repositorio).
2. Se cambia la ruta de la foto y su descripción, o el texto.
3. Se vuelve a componer.
4. Se mira la lámina resultante.

| Si cambias… | Ten en cuenta |
| --- | --- |
| La foto | Su descripción es obligatoria y describe la escena, no el texto de la lámina |
| La foto | El archivo debe existir en el equipo. Las fotos no se guardan en el repositorio; si falta, no se crea ninguna salida |
| La foto | El sistema la recorta al tamaño de la lámina, centrada |
| La foto de una portada con columna de texto | Conviene revisar la altura de la columna: depende de dónde queda la persona |
| La foto del «panel a la derecha» | La foto va **espejada**. Un texto legible o un logo dentro de la foto saldría al revés |
| El texto de una portada | La evidencia lleva una sola palabra destacada; si no se marca ninguna, se destaca la primera |
| El capítulo | El indicador de avance se actualiza solo |

Lo que **no** cambia al cambiar la foto: el panel, la esquina curva, el indicador y la columna de texto. Eso lo fija la
variante elegida.

> Detalle técnico: `photo.plateRef`, `photo.alt`, `voice`, `body` y `progress` en el pedido · recorte en
> `materializeAssets` de [`scripts/brand-surfaces/compose.ts`](../../../scripts/brand-surfaces/compose.ts) · ejemplos en
> [`src/lib/brand-surfaces/examples/`](../../../src/lib/brand-surfaces/examples/), vigilados por
> [`example-plans.test.ts`](../../../src/lib/brand-surfaces/__tests__/example-plans.test.ts) ·
> [manual, problemas comunes](../../manual-de-uso/creative/componer-por-superficie-con-axis.md).

## Qué es un documento y qué reglas cumple

Un **documento** es un pedido con varias páginas: un brochure o una propuesta completos. Se revisa **como un todo**, no
página por página.

| Regla | Qué significa |
| --- | --- |
| La portada va primero | Un brochure abre con su portada |
| El cierre va al final | Un brochure termina con su contraportada |
| Al menos una página de servicio | Un brochure sin ningún servicio no es un brochure |
| Foto ↔ sin foto | Si la portada lleva foto, la contraportada no, y al revés |
| Una línea por documento | La portada y la contraportada llevan la línea de servicio del documento |
| Todo o nada | Si una sola regla falla, no se compone ninguna página, ni siquiera las válidas |

Las parejas de portada y contraportada, según la regla de la foto:

| Documento | Portada | Contraportada |
| --- | --- | --- |
| Brochure | con foto | sin foto (órbita) |
| Propuesta | sin foto, con el logo del cliente | con foto |

Lo que el documento completa solo: cada página hereda del documento el tipo de documento, el formato y la línea, así
que no hay que repetirlos en cada una.

Hay dos documentos de ejemplo: un brochure de 9 páginas (portada, cuatro servicios, lámina protagonista de Nexa,
líneas, escalera y contraportada) y una propuesta de 7 páginas interiores.

> Detalle técnico: `planSurfaceDocument` en
> [`src/lib/brand-surfaces/document.ts`](../../../src/lib/brand-surfaces/document.ts), que valida con
> `resolveSurfaceDocument` de AXIS y no reimplementa reglas · códigos `brochure-cover-first`, `brochure-close-last`,
> `brochure-needs-service-page`, `frame-photo-must-alternate`, `document-line-mismatch` en el
> [manual, códigos de un documento](../../manual-de-uso/creative/componer-por-superficie-con-axis.md) · ejemplos
> [`deck-brochure-document.json`](../../../src/lib/brand-surfaces/examples/deck-brochure-document.json) y
> [`deck-proposal-document.json`](../../../src/lib/brand-surfaces/examples/deck-proposal-document.json) ·
> pruebas en [`document.test.ts`](../../../src/lib/brand-surfaces/__tests__/document.test.ts).

## Qué entrega

Cada composición deja una carpeta con la pieza y con los archivos que permiten auditarla.

| Archivo | Una lámina | Un documento |
| --- | --- | --- |
| PDF | la lámina | **un** PDF con todas las páginas, en formato 16:9 |
| Imagen y PDF por página | sí | sí, uno por página |
| Registro de reglas | qué reglas de la marca gobernaron la lámina | lo mismo, para el documento completo |
| Procedencia | huella del pedido, de las fotos y de los archivos usados, y las versiones del sistema de diseño | lo mismo, con todas las páginas |

La procedencia no guarda fechas: el mismo pedido con las mismas fotos produce la misma procedencia. Sirve para
comprobar después con qué se hizo una pieza.

La carpeta de salida es un área de trabajo local; no se guarda en el repositorio.

> Detalle técnico: salida en `.captures/brand-surfaces/<id>/` · `<id>.pdf` · `<id>.surface-manifest.json` (lámina) o
> `<id>.surface-document-manifest.json` (documento, esquema `axis.surface-document.v1`) · `<id>.provenance.json` ·
> [`scripts/brand-surfaces/compose.ts`](../../../scripts/brand-surfaces/compose.ts) ·
> [manual, paso 3](../../manual-de-uso/creative/componer-por-superficie-con-axis.md).

## Cómo se cuida que no cambie sin querer

Cada plantilla tiene una imagen de referencia guardada. Una revisión automática vuelve a componer todas las plantillas
y las compara con esa referencia punto por punto. Si una lámina cambia sin que alguien lo haya declarado, la revisión
falla.

| Dato | Estado al 2026-09-27 |
| --- | --- |
| Imágenes de referencia de la línea gráfica | 32, todas idénticas a su referencia |
| De esas, del deck | 16 |
| El documento completo | No tiene imagen de referencia propia: usa fotos reales, que varían. Lo cubren sus páginas |

> Detalle técnico: [runbook del gate visual](../../operations/runbooks/composer-visual-gate.md) ·
> `pnpm composer:visual-gate --catalog=graphic-line` ·
> [`BASELINE_DELTAS.md`](../../../scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md).

## Qué no hace todavía

| Pendiente | Qué implica hoy |
| --- | --- |
| Ruta desde el portal | Sólo se compone desde un equipo, con un comando. No hay pantalla ni acceso para agentes del portal |
| Las 38 láminas restantes | Un documento sólo puede usar las láminas de la tabla «Qué láminas se pueden componer hoy» |
| Control de foco en la sección partida | No se puede decir qué parte de la foto conservar. Si la persona queda cortada, se usa una foto con otro encuadre |
| Publicación de los cambios | El trabajo está terminado en el equipo de desarrollo; falta subirlo al repositorio compartido |

Diferencias conocidas entre las láminas compuestas y los prototipos aprobados:

- el texto «Cuando quieras.» sale un poco más grande que en el prototipo;
- la dirección web usa la versión fija de su burbuja, no la que se funde con la foto;
- la caja de selección queda unos puntos más ajustada.

El operador aprobó a ojo las láminas compuestas (protagonista, líneas y el brochure de 9 páginas) el 2026-09-27.

> Detalle técnico: ruta productiva en TASK-1921 · láminas restantes en TASK-1928 · cierre en
> [TASK-1927](../../tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md) ·
> [norma §7, estado y pendientes](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) ·
> el recorte de la sección partida no lee `photo.focus`
> ([`src/lib/brand-surfaces/recipes/deck.ts`](../../../src/lib/brand-surfaces/recipes/deck.ts)).

## Documentos relacionados

- [Línea gráfica Efeonce — La órbita](./linea-grafica-efeonce.md): la línea gráfica completa y sus reglas.
- [Componer un deck con las recetas por lámina](../../manual-de-uso/creative/componer-deck-con-recetas.md): cómo elegir
  las láminas de un deck.
- [Componer una pieza por superficie con AXIS](../../manual-de-uso/creative/componer-por-superficie-con-axis.md): el
  paso a paso.
