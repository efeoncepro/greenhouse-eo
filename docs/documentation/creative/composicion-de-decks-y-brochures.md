# Composición de decks y brochures de marca propia

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 2.0
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-28 por Claude (2.0: las 69 láminas aprobadas del deck se componen solas — TASK-1928; la portada de brochure con la selección de Nexa; familias, reglas que el sistema hace cumplir y lo que falta)
> **Documentacion tecnica:** [Arquitectura de la composición de piezas de marca](../../architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md) · [Norma de composición por superficie](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md)
> **Manual de uso:** [Componer un deck con las recetas por lámina](../../manual-de-uso/creative/componer-deck-con-recetas.md) · [Componer una pieza por superficie con AXIS](../../manual-de-uso/creative/componer-por-superficie-con-axis.md)

## Qué es

Componer un deck o un brochure de marca propia es **pedir una lámina, o un documento completo, describiendo su
contenido**, y recibirlo armado con la línea gráfica de Efeonce («La órbita»). Nadie dibuja la lámina a mano ni copia
medidas de un archivo de diseño.

El pedido es un archivo corto que dice qué lámina se quiere, qué texto lleva, qué cifras muestra y qué foto usa. El
sistema lo revisa contra las reglas de la marca y, si todo calza, entrega la pieza. Si algo no calza, no entrega nada
y dice qué falló.

| Pregunta | Respuesta |
| --- | --- |
| ¿Para qué marca sirve? | Sólo para la marca propia de Efeonce. No es para piezas con la marca de un cliente, para las ofertas a comité ni para la interfaz de Greenhouse |
| ¿Qué documentos arma? | Láminas sueltas y documentos completos: un **brochure** (presenta a Efeonce) o una **propuesta comercial** (va dirigida a un cliente). Las láminas también sirven para un pitch o un QBR |
| ¿Cuántas láminas puede componer? | **Las 69** que el operador aprobó el 2026-09-27. Desde el 2026-09-28 no queda ninguna fuera |
| ¿Quién lo usa hoy? | Una persona o un agente, desde su equipo, con un comando |
| ¿Está en el portal? | No. Hoy es un taller local. La ruta dentro de la plataforma (con permisos, cola y acceso para agentes) es TASK-1921, **en curso** |

> Detalle técnico: comando `pnpm brand:compose` en
> [`scripts/brand-surfaces/compose.ts`](../../../scripts/brand-surfaces/compose.ts) · traducción del pedido en
> [`src/lib/brand-surfaces/`](../../../src/lib/brand-surfaces/) · contrato `efeonce.surface-composition` 0.1.2 de AXIS
> (`@efeoncepro/axis-tokens` 0.3.21, `@efeoncepro/axis-ui-contracts` 0.3.19) ·
> [arquitectura](../../architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md).

## Qué láminas se componen

Las 69 láminas del deck están aprobadas y **todas se componen solas**. Cada una tiene una **receta** en el catálogo del
deck: qué comunica, cuándo usarla, cuándo no y cuál conviene en su lugar, qué textos e imágenes se cambian y qué queda
fijo. Las recetas se agrupan en familias:

| Familia | Láminas | Para qué sirve |
| --- | --- | --- |
| **Portadas** (13) | tres portadas generales de brochure con Nexa, la de cinco líneas con la selección de Nexa, cinco de una línea de servicio, y dos portadas de propuesta (órbita y amanecer), cada una en su versión de plantilla y de ejemplo con el logo de Sky | Abre el documento |
| **Contraportadas** (5) | la de brochure sin foto (órbita) y dos con foto; dos de propuesta, con foto | Cierra el documento, con los datos de contacto de Efeonce |
| **Secciones** (8) | clásica; partida en tres versiones (esquina arriba, esquina abajo, panel a la derecha); con lente; con foto a sangre; de cine para abrir los servicios o el equipo | Abre un capítulo y muestra en qué parte del documento vamos |
| **Quiénes somos, equipo y stack** (5) | «quiénes somos», «por qué lo hacemos», el equipo en fichas, el stack de herramientas y las líneas de servicio con Nexa | Presenta a Efeonce |
| **Contenido y día a día** (9) | la cifra medida por la órbita, la hoja de contactos, el texto con una palabra gigante, las viñetas, la agenda y cuatro láminas del día a día (el reloj, las herramientas y dos «vívelo») | Explica, ordena y muestra cómo se trabaja |
| **Método** (8) | el tríptico «Escucha. Crea. Mide.», la escalera BeX y su versión plana, el plan de 90 días, el anillo del puntaje, la fuerza de trabajo híbrida (y su escena) y la fuerza híbrida en cine | Muestra cómo se hace |
| **Prueba** (8) | el foco sobre la prueba, clientes, partners, riesgos cubiertos, caso de éxito, gráfico, testimonio y «por qué elegirnos» | Demuestra con evidencia |
| **Propuesta por línea de servicio** (8) | cuatro en **cine** (servicios creativos, web, AEO y RevOps) y cuatro **sobrias** (las mismas cuatro, con lente y formas de empezar) | Presenta un servicio |
| **Cotización** (3) | la tabla de planes, los planes en escena y la cotización en vivo | Sólo en una propuesta |
| **Próximos pasos** (1) y **respiro** (1) | la agenda del diagnóstico abierta; una foto a sangre sólo con la voz | Cierra la conversación o da una pausa |

Cómo elegir entre las versiones de una familia:

| Situación | Conviene |
| --- | --- |
| Se presenta en sala y necesita impacto | la versión en escena o «en vivo»: planes en escena, cotización en vivo, «vívelo», escalera BeX, propuestas de cine |
| Se lee con calma (finanzas, compras, un PDF que se estudia) | la versión sobria: tabla de planes, reloj del día a día, escalera plana, propuestas sobrias |
| El alcance ya está acordado y el gesto es aprobar | la cotización en vivo, con el cursor en «Aprobar propuesta» |
| El cliente pregunta con qué herramientas se trabaja | el día a día con las herramientas |

Lo que **no** se usa, aunque el catálogo todavía lo nombre:

| Qué | Por qué |
| --- | --- |
| La portada y la contraportada «clásicas» | No fueron aprobadas; las reemplazan las portadas y contraportadas de arriba. No tienen plantilla |
| Una portada o un cierre propios para pitch o QBR | No hay uno aprobado: se le pregunta al operador |

> Detalle técnico: [catálogo de las 69 recetas](../../operations/brand-graphic-line/deck-recipes/README.md) (índice por
> familia y JSON `efeonce.deck-slide-recipes.v1`) · 50 plantillas en
> [`src/lib/artifact-composer/catalogs/graphic-line-deck/`](../../../src/lib/artifact-composer/catalogs/graphic-line-deck/)
> (`registry.json`; varias recetas comparten plantilla) · correspondencia receta → plantilla en
> [`recipe-map.json`](../../../src/lib/artifact-composer/catalogs/graphic-line-deck/recipe-map.json) · traducción por
> familia en [`src/lib/brand-surfaces/recipes/`](../../../src/lib/brand-surfaces/recipes/) ·
> [norma §4.6](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) · TASK-1927 (31 recetas) y
> TASK-1928 (las 38 restantes y la portada con selección).

## La portada con la selección de Nexa

Una de las portadas del brochure muestra a Nexa con las cinco líneas de servicio y, encima de la respuesta «Crecer.»,
una **marca de selección** con el cursor de un colaborador llamado «Nexa», como si alguien estuviera editando el
documento en vivo. Hasta el 2026-09-27 las reglas de la marca no admitían selección en una portada de brochure; el
2026-09-28 el operador relajó esa regla sólo para esta portada, y desde entonces se compone.

| Cómo se comporta | Qué significa |
| --- | --- |
| La selección cae sobre la respuesta «Crecer.» | Nunca sobre la persona de la foto |
| Un solo cursor, «Nexa», abajo a la derecha de la selección | No se agregan más cursores |
| La columna de texto es la misma que en la portada general | La respuesta baja un poco para dejar lugar a la selección; la evidencia queda debajo |
| Firma con el logo arriba | Como las otras portadas del brochure, no lleva burbuja de dirección web |
| El pedido no describe la selección | La composición `document-selection` la trae completa: basta con elegirla |

Las otras dos composiciones de la portada de brochure (la general y la de una línea) **siguen sin admitir** selección:
si el pedido la trae, se rechaza.

> Detalle técnico: composición `document-selection` de `cover-brochure` (AXIS `v0.3.21`, delta (l) del ADR de AXIS
> `SURFACE_COMPOSITION_DECISION_V1.md`) · misma plantilla `CoverBrochure` · `coverBrochure` y `answerSelection` en
> [`src/lib/brand-surfaces/recipes/frame.ts`](../../../src/lib/brand-surfaces/recipes/frame.ts) · ejemplo
> [`deck-cover-brochure-cine-lines-selection-intent.json`](../../../src/lib/brand-surfaces/examples/deck-cover-brochure-cine-lines-selection-intent.json) ·
> rechazo `selection-not-in-recipe` en las otras composiciones.

## Qué decide la persona y qué decide el sistema

La regla es simple: **la persona decide el contenido; el sistema decide la forma.**

| Lo decide la persona | Lo decide el sistema |
| --- | --- |
| Qué lámina quiere y, si tiene varias, en qué composición | Medidas y posiciones de cada elemento |
| Si el documento es un brochure o una propuesta | Colores, tipografía, tamaños e interlineado |
| El texto: etiqueta, pregunta, respuesta, bajada, pasos, ítems | Que la respuesta sea al menos tres veces más grande que la pregunta |
| Las cifras, cada una con su fuente | Cómo se imprime la fuente («Fuente: …») |
| La foto y su descripción | El recorte de la foto al tamaño de la lámina |
| La línea de servicio del documento | La órbita, el indicador de avance y la firma |
| El logo del cliente, en una portada de propuesta | El tono y el peso de los logos de clientes y partners |
| Qué ítem destaca la marca de selección (una viñeta, un tema de la agenda, un plan) | El dibujo de la selección y del cursor |
| La altura de la columna de texto de una portada, según dónde queda la persona en la foto | El rango permitido para esa altura |
| — | Los montos (siempre `[MONTO]`) y los datos de contacto de Efeonce |

Dos detalles que conviene conocer:

- **La composición se declara cuando la lámina tiene varias** (por ejemplo, la cotización en escena o el día a día con
  herramientas). Cuando la lámina tiene una sola, no hace falta escribirla. El sistema no adivina cuál quieres.
- **La forma no se ajusta desde el pedido.** Si una medida o un color necesita cambiar, se cambia en el sistema de
  diseño, con aprobación, y el cambio llega a todas las piezas.

> Detalle técnico: campos del pedido en el
> [manual del deck, pasos 7 y 8](../../manual-de-uso/creative/componer-deck-con-recetas.md) · valores de forma en los
> tokens de AXIS (`efeonceGraphicLine.surfaces.deck.recipes.<receta>`) · contacto en `EFEONCE_CONTACT` de
> [`src/config/efeonce-brand.ts`](../../../src/config/efeonce-brand.ts) · skills `deck-studio` y `axis-design-system`.

## Las reglas que el sistema hace cumplir

Estas reglas no dependen de la buena voluntad de quien arma el pedido: si no se cumplen, la lámina no sale.

| Regla | Qué pasa en la práctica |
| --- | --- |
| **Cada texto tiene un largo máximo** | Si un texto pasa el largo de su casilla, la lámina no sale y el mensaje nombra la casilla. El sistema no recorta ni achica la letra: el texto se acorta |
| **Toda cifra lleva su fuente** | Una cifra sin fuente se rechaza. La lámina imprime «Fuente: …» a la vista |
| **Los montos no se escriben** | La cotización imprime siempre `[MONTO]` hasta la propuesta final |
| **El contacto sale de los datos de Efeonce** | Correo, teléfonos y dirección no se escriben en el pedido |
| **Los logos de terceros se normalizan** | Clientes y partners quedan en un mismo tono y con el mismo peso visual; Aguas Andinas y la UC de Temuco conservan su forma en tonos del mismo azul |
| **Sin logo ni velo en las láminas interiores con foto** | Las secciones de cine, «quiénes somos» y «por qué lo hacemos» no llevan el logo chico ni una capa oscura sobre la foto |
| **Una sola selección por lámina** | La marca de selección destaca un solo elemento; si se pide un ítem que no existe (por ejemplo, la viñeta 5 de cuatro), la lámina no sale |
| **El acento no va en textos chicos** | Etiquetas como «Recomendado» o «Revisamos contigo» van en azul marino sobre papel o en blanco sobre oscuro, nunca en el color de la línea |
| **La respuesta domina** | La respuesta mide al menos tres veces la pregunta |
| **Cada lámina lleva lo que su receta pide** | Por ejemplo, tres planes en la cotización, cuatro viñetas, cinco temas en la agenda o tres cifras en el reporte en vivo. Si falta o sobra uno, el mensaje dice cuántos van |
| **La foto necesita descripción y archivo** | Sin descripción, o sin el archivo en el equipo, no se crea ninguna salida |
| **Una palabra destacada en la evidencia** | En las portadas, la evidencia lleva una sola palabra en negrita |

> Detalle técnico: largos máximos iguales en el catálogo y en la plantilla, vigilados por
> [`recipe-slot-parity.test.ts`](../../../src/lib/brand-surfaces/__tests__/recipe-slot-parity.test.ts); errores
> `too_long`/`item_too_long` del Artifact Composer; `figure-source-required` de AXIS; `invalid-intent` y
> `missing-photo` en [`src/lib/brand-surfaces/types.ts`](../../../src/lib/brand-surfaces/types.ts) · normalización de
> logos: asset `logo` materializado en [`compose.ts`](../../../scripts/brand-surfaces/compose.ts) · decisiones D1, 3×,
> fuentes visibles, sin logo ni velo: [pendientes de QA del catálogo](../../operations/brand-graphic-line/deck-recipes/README.md#pendientes-de-qa).

## Cómo se cambia la foto, el texto o las cifras

La foto, el texto y las cifras **no viven en la plantilla**: viven en el pedido. Para cambiarlos se edita el pedido y
se vuelve a componer.

1. Se crea un pedido propio para la pieza, copiando el ejemplo de la lámina (no se edita un ejemplo del repositorio).
2. Se cambia la foto y su descripción, el texto o las cifras con su fuente.
3. Se vuelve a componer.
4. Se mira la lámina resultante contra la referencia aprobada.

| Si cambias… | Ten en cuenta |
| --- | --- |
| La foto | Su descripción es obligatoria y describe la escena, no el texto de la lámina |
| La foto | El archivo debe existir en el equipo. Las fotos no se guardan en el repositorio; si falta, no se crea ninguna salida |
| La foto | El sistema la recorta al tamaño de la lámina, centrada. Hoy, en el deck, sólo el reloj del día a día acepta que se indique hacia dónde recortar |
| La foto de una portada con columna de texto | Conviene revisar la altura de la columna: depende de dónde queda la persona |
| La foto del «panel a la derecha» | La foto va **espejada**. Un texto legible o un logo dentro de la foto saldría al revés |
| Una cifra | Lleva valor, rótulo y fuente. Sin fuente, no sale |
| El ítem destacado | Se indica con su número, desde 1; en la cotización, la selección sigue al plan recomendado |
| El capítulo | El indicador de avance se actualiza solo |

Lo que **no** cambia al cambiar la foto: el panel, la esquina curva, el indicador y la columna de texto. Eso lo fija la
composición elegida.

> Detalle técnico: `photo.plateRef`, `photo.alt`, `photo.focus`, `voice`, `body`, `figures`, `selected` y `progress`
> en el pedido · recorte en `materializeAssets` de [`compose.ts`](../../../scripts/brand-surfaces/compose.ts) ·
> `photo.focus` se lee en la lente de `content-day` ([`recipes/content.ts`](../../../src/lib/brand-surfaces/recipes/content.ts)) ·
> ejemplos en [`src/lib/brand-surfaces/examples/`](../../../src/lib/brand-surfaces/examples/), vigilados por
> [`example-plans.test.ts`](../../../src/lib/brand-surfaces/__tests__/example-plans.test.ts).

## Qué es un documento y qué reglas cumple

Un **documento** es un pedido con varias páginas: un brochure o una propuesta completos. Se revisa **como un todo**, no
página por página, y sale en **un solo PDF** de varias páginas. Puede usar cualquiera de las 69 láminas.

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
| Brochure | con foto (cualquiera de las portadas de brochure, incluida la de la selección) | sin foto (órbita) |
| Propuesta | sin foto, con el logo del cliente | con foto |

Las dos contraportadas de brochure **con foto** están aprobadas y se componen, pero sólo emparejan con una portada de
brochure sin foto, que hoy no existe.

Lo que el documento completa solo: cada página hereda del documento el tipo de documento, el formato y la línea, así
que no hay que repetirlos en cada una.

Hay dos documentos de ejemplo: un brochure de 9 páginas (portada, cuatro servicios, lámina protagonista de Nexa,
líneas, escalera y contraportada) y una propuesta de 7 páginas interiores.

> Detalle técnico: `planSurfaceDocument` en
> [`src/lib/brand-surfaces/document.ts`](../../../src/lib/brand-surfaces/document.ts), que valida con
> `resolveSurfaceDocument` de AXIS y no reimplementa reglas · códigos `brochure-cover-first`, `brochure-close-last`,
> `brochure-needs-service-page`, `frame-photo-must-alternate`, `document-line-mismatch` en el
> [manual, códigos de un documento](../../manual-de-uso/creative/componer-por-superficie-con-axis.md#códigos-de-un-documento) ·
> ejemplos [`deck-brochure-document.json`](../../../src/lib/brand-surfaces/examples/deck-brochure-document.json) y
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

> Detalle técnico: salida en `.captures/brand-surfaces/<id>/` (o `--out <dir>`; `--artifact-id <id>` fija el nombre) ·
> `<id>.pdf` · `<id>.surface-manifest.json` (lámina) o `<id>.surface-document-manifest.json` (documento, esquema
> `axis.surface-document.v1`) · `<id>.provenance.json` · [`compose.ts`](../../../scripts/brand-surfaces/compose.ts).

## Cómo se cuida que no cambie sin querer

Cada plantilla tiene una imagen de referencia guardada. Una revisión automática vuelve a componer todas las plantillas
con datos de prueba y las compara con esa referencia punto por punto. Si una lámina cambia sin que alguien lo haya
declarado, la revisión falla. Además mide dos reglas en la imagen final: que el acento no caiga en texto chico y que la
respuesta sea al menos tres veces la pregunta.

| Dato | Estado al 2026-09-28 |
| --- | --- |
| Imágenes de referencia de la línea gráfica | 66, todas idénticas a su referencia |
| De esas, del deck | 50, una por plantilla |
| El documento completo | No tiene imagen de referencia propia: usa fotos reales, que varían. Lo cubren sus páginas |

Esta revisión cuida las plantillas, **no la pieza de cada persona**: una lámina con texto o foto nuevos se revisa a
ojo, y la aprobación es del operador. Revisar esa prueba no es trabajo de quien arma el deck.

> Detalle técnico: [runbook del gate visual](../../operations/runbooks/composer-visual-gate.md) ·
> `pnpm composer:visual-gate --catalog=graphic-line` ·
> [`BASELINE_DELTAS.md`](../../../scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md) (altas declaradas).

## Qué no hace todavía

| Pendiente | Qué implica hoy | Dónde se resuelve |
| --- | --- | --- |
| Ruta dentro de la plataforma | Sólo se compone desde un equipo, con un comando. No hay pantalla, cola ni acceso para agentes | TASK-1921, en curso |
| Validar un plan de deck completo contra el catálogo | Nadie revisa todavía, en automático, que la secuencia de láminas respete pares y ritmo | TASK-1929 |
| Datos reales en las casillas | Logo del cliente, equipo, métricas, casos y testimonios se escriben a mano en el pedido | TASK-1930 |
| Banco de fotos gobernado | Las fotos viven en el equipo de quien compone, fuera del repositorio | TASK-1931 |
| Armar el deck desde Proposal Studio | Una propuesta no produce todavía su deck «La órbita» | TASK-1932 |
| Control de foco en la sección partida | No se puede decir qué parte de la foto conservar. Si la persona queda cortada, se usa otra foto | sin task |

Pendientes de revisión que siguen abiertos en el catálogo:

- ninguna contraportada aprobada lleva el logo dentro de la órbita (las aprobadas lo ponen arriba de la columna);
- algunas fotos tienen el isotipo de la ropa sin registro de revisión: se revisan antes de publicar;
- una misma foto aparece en varias recetas: no se repite dentro de un mismo deck.

Diferencias conocidas entre las láminas del marco y los prototipos aprobados: el texto «Cuando quieras.» sale un poco
más grande, la dirección web usa la versión fija de su burbuja y la caja de selección queda unos puntos más ajustada.

El operador aprobó a ojo las láminas compuestas el 2026-09-27 (TASK-1927) y el 2026-09-28 las seis familias nuevas y la
portada con selección (TASK-1928). Esa aprobación cubre las plantillas, no cada pieza futura.

> Detalle técnico: [TASK-1921](../../tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md) ·
> [TASK-1929](../../tasks/in-progress/TASK-1929-deck-plan-recipe-catalog-validator.md) ·
> [TASK-1930](../../tasks/to-do/TASK-1930-deck-recipe-slot-data-bindings.md) ·
> [TASK-1931](../../tasks/to-do/TASK-1931-brand-plate-bank-governed.md) ·
> [TASK-1932](../../tasks/to-do/TASK-1932-proposal-studio-graphic-line-deck-output.md) · cierres en
> [TASK-1927](../../tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md) y
> [TASK-1928](../../tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md) ·
> [norma §7, estado y pendientes](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#7-estado-y-pendientes).

## Documentos relacionados

- [Línea gráfica Efeonce — La órbita](./linea-grafica-efeonce.md): la línea gráfica completa y sus reglas.
- [Componer un deck con las recetas por lámina](../../manual-de-uso/creative/componer-deck-con-recetas.md): cómo elegir
  y componer las láminas de un deck, paso a paso.
- [Componer una pieza por superficie con AXIS](../../manual-de-uso/creative/componer-por-superficie-con-axis.md): el
  comando para todas las superficies (web, vía pública, motion, video y deck).
- [Catálogo de recetas por lámina](../../operations/brand-graphic-line/deck-recipes/README.md): las 69 recetas.
