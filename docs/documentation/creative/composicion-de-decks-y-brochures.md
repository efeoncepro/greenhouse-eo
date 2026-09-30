# Composición de decks y brochures de marca propia

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 2.8
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-30 por Claude (2.8: el deck SEO/AEO (Search Visibility 360) aprobado en tres documentos — seis láminas nuevas que todavía no se componen solas, logos de submarca opcionales, casos con cifras de ejemplo y logos que esperan autorización, formatos de Insights sólo si están vivos (TASK-1949). Antes, 2.7: el operador aprobó todo el deck Salesforce, incluida la contraportada de brochure; la insignia «Salesforce Partner» está autorizada por Salesforce y va por defecto. Antes, 2.6: las 94 láminas se componen solas, incluidas las dieciséis del deck Salesforce; la contraportada de brochure Salesforce ya está compuesta y espera el visto bueno; la propuesta Salesforce existe como PDF sin insignia de partner (TASK-1942). Antes, 2.5: decisiones del operador al canonizar el deck Salesforce — las cuatro láminas que no cabían en recetas existentes pasan a tener la suya (94 recetas), el deck tiene dos cierres según se entregue como brochure o como propuesta, el logo grande de la contraportada es sólo de Salesforce y el servicio del CRM en Claude se llama «Enablement conversacional». Antes, 2.4: el deck de la práctica Salesforce aprobado — 19 láminas, doce recetas nuevas que todavía no se componen solas y ocho que usan recetas existentes; marcas de terceros con condición y el deck HubSpot pendiente (TASK-1942, TASK-1943). Antes, 2.3: sección «Ligar los datos reales de cada lámina» — las casillas de datos nunca se escriben a mano, de dónde sale cada una, evidencia interna prohibida en todo deck, muro de nueve logos, rastro por casilla y el comando `--bind` (TASK-1930). Antes, 2.2: las nueve láminas de SEO y AEO aprobadas el 2026-09-28 — cuándo usar cada una, las reglas nuevas (cifras con fuente, datos de muestra marcados, interfaz de IA genérica) y que dos versiones de una lámina nunca van en el mismo deck (TASK-1934). Antes, 2.1: sección «Validar y proponer el plan antes de componer» — qué revisa, AXIS y catálogo, errores y avisos, el agente propone recetas por id y la persona confirma, qué falta (TASK-1929). Antes, 2.0: las 69 láminas aprobadas del deck se componen solas — TASK-1928; la portada de brochure con la selección de Nexa; familias, reglas que el sistema hace cumplir y lo que falta)
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
| ¿Cuántas láminas puede componer? | **94 de las 100** que el operador aprobó: 69 el 2026-09-27, nueve de SEO y AEO el 2026-09-28, dieciséis del deck Salesforce el 2026-09-29 y seis del deck SEO/AEO el 2026-09-30. Esas seis todavía no se componen solas |
| ¿Quién lo usa hoy? | Una persona o un agente, desde su equipo, con un comando |
| ¿Está en el portal? | No. Hoy es un taller local. La ruta dentro de la plataforma (con permisos, cola y acceso para agentes) es TASK-1921, **en curso** |

> Detalle técnico: comando `pnpm brand:compose` en
> [`scripts/brand-surfaces/compose.ts`](../../../scripts/brand-surfaces/compose.ts) · traducción del pedido en
> [`src/lib/brand-surfaces/`](../../../src/lib/brand-surfaces/) · contrato `efeonce.surface-composition` 0.1.2 de AXIS
> (`@efeoncepro/axis-tokens` 0.3.33, `@efeoncepro/axis-ui-contracts` 0.3.33) ·
> [arquitectura](../../architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md).

## Qué láminas se componen

Las 100 láminas del deck están aprobadas y **94 se componen solas** (las del deck Salesforce desde el 2026-09-29;
ver abajo, «El deck de la práctica Salesforce»). Las seis láminas nuevas del deck SEO/AEO todavía no (ver «El deck
SEO/AEO»). Cada una tiene una **receta** en el catálogo del
deck: qué comunica, cuándo usarla, cuándo no y cuál conviene en su lugar, qué textos e imágenes se cambian y qué queda
fijo. Las recetas se agrupan en familias:

| Familia | Láminas | Para qué sirve |
| --- | --- | --- |
| **Portadas** (13) | tres portadas generales de brochure con Nexa, la de cinco líneas con la selección de Nexa, cinco de una línea de servicio, y dos portadas de propuesta (órbita y amanecer), cada una en su versión de plantilla y de ejemplo con el logo de Sky | Abre el documento |
| **Contraportadas** (5) | la de brochure sin foto (órbita) y dos con foto; dos de propuesta, con foto | Cierra el documento, con los datos de contacto de Efeonce |
| **Secciones** (8) | clásica; partida en tres versiones (esquina arriba, esquina abajo, panel a la derecha); con lente; con foto a sangre; de cine para abrir los servicios o el equipo | Abre un capítulo y muestra en qué parte del documento vamos |
| **Quiénes somos, equipo y stack** (5) | «quiénes somos», «por qué lo hacemos», el equipo en fichas, el stack de herramientas y las líneas de servicio con Nexa | Presenta a Efeonce |
| **Contenido y día a día** (9) | la cifra medida por la órbita, la hoja de contactos, el texto con una palabra gigante, las viñetas, la agenda y cuatro láminas del día a día (el reloj, las herramientas y dos «vívelo») | Explica, ordena y muestra cómo se trabaja |
| **Método** (10) | el tríptico «Escucha. Crea. Mide.», la escalera BeX y su versión plana, el plan de 90 días, el anillo del puntaje, la fuerza de trabajo híbrida (y su escena), la fuerza híbrida en cine, el ciclo Surround y E-E-A-T | Muestra cómo se hace |
| **Prueba** (12) | el foco sobre la prueba, clientes, partners, riesgos cubiertos, caso de éxito, gráfico, testimonio, «por qué elegirnos» y cuatro de SEO/AEO (la respuesta de la IA, el contexto de mercado, la diferencia y del tráfico al negocio) | Demuestra con evidencia |
| **Propuesta por línea de servicio** (10) | cinco en **cine** (servicios creativos, web, AEO, RevOps y SEO) y cinco **sobrias** (las mismas cinco, con lente y formas de empezar) | Presenta un servicio |
| **Cotización** (3) | la tabla de planes, los planes en escena y la cotización en vivo | Sólo en una propuesta |
| **Próximos pasos** (2) y **respiro** (1) | la agenda del diagnóstico abierta y el mapa de lo que entrega el diagnóstico; una foto a sangre sólo con la voz | Cierra la conversación o da una pausa |

Cómo elegir entre las versiones de una familia:

| Situación | Conviene |
| --- | --- |
| Se presenta en sala y necesita impacto | la versión en escena o «en vivo»: planes en escena, cotización en vivo, «vívelo», escalera BeX, propuestas de cine |
| Se lee con calma (finanzas, compras, un PDF que se estudia) | la versión sobria: tabla de planes, reloj del día a día, escalera plana, propuestas sobrias |
| El alcance ya está acordado y el gesto es aprobar | la cotización en vivo, con el cursor en «Aprobar propuesta» |
| El cliente pregunta con qué herramientas se trabaja | el día a día con las herramientas |

**Las láminas de SEO y AEO** (aprobadas el 2026-09-28) cuentan una sola historia: por qué ahora, cuál es el problema,
cómo se trabaja, qué se ofrece y qué recibe primero el cliente.

| Lámina | Cuándo usarla |
| --- | --- |
| **Contexto de mercado** | para abrir el tema con el porqué ahora: tres cifras de mercado, cada una con su fuente y su año |
| **La respuesta de la IA** | para que el cliente vea el problema: el mismo pedido a un asistente de IA, hoy sin su marca y con AEO con su marca primera. Es un ejemplo y lo dice |
| **El ciclo Surround** | para explicar cómo se trabaja un servicio continuo: medir, crear, distribuir y optimizar |
| **E-E-A-T** | para explicar por qué la IA citaría a la marca: experiencia, pericia, autoridad y confianza |
| **La propuesta SEO**, sobria o de cine | para presentar el servicio de SEO: la sobria se lee sola y explica cada forma de empezar; la de cine abre con impacto. Se usa una de las dos |
| **La diferencia** | cuando el cliente compara con otras agencias o con hacerlo con su equipo |
| **Del tráfico al negocio** | cuando el cliente mide el SEO sólo por visitas y hay que llevar la conversación a ventas |
| **El mapa del diagnóstico** | para cerrar mostrando lo que el cliente recibe primero. No va si el diagnóstico ya se hizo |

SEO y AEO son servicios distintos: sus dos propuestas pueden ir en el mismo documento.

Lo que **no** se usa, aunque el catálogo todavía lo nombre:

| Qué | Por qué |
| --- | --- |
| La portada y la contraportada «clásicas» | No fueron aprobadas; las reemplazan las portadas y contraportadas de arriba. No tienen plantilla |
| Una portada o un cierre propios para pitch o QBR | No hay uno aprobado: se le pregunta al operador |

> Detalle técnico: [catálogo de las 100 recetas](../../operations/brand-graphic-line/deck-recipes/README.md) (índice por
> familia y JSON `efeonce.deck-slide-recipes.v1`) · 57 plantillas en
> [`src/lib/artifact-composer/catalogs/graphic-line-deck/`](../../../src/lib/artifact-composer/catalogs/graphic-line-deck/)
> (`registry.json`; varias recetas comparten plantilla) · correspondencia receta → plantilla en
> [`recipe-map.json`](../../../src/lib/artifact-composer/catalogs/graphic-line-deck/recipe-map.json) · traducción por
> familia en [`src/lib/brand-surfaces/recipes/`](../../../src/lib/brand-surfaces/recipes/) ·
> [norma §4.6](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) · TASK-1927 (31 recetas) y
> TASK-1928 (las 38 restantes y la portada con selección) · TASK-1934 (las nueve de SEO y AEO: siete plantillas nuevas
> en [`recipes/seo-aeo/`](../../../src/lib/brand-surfaces/recipes/seo-aeo/) y dos que reutilizan las propuestas).

## El deck de la práctica Salesforce

El 2026-09-29 el operador aprobó 19 láminas para contar los servicios Salesforce de Efeonce, en cinco actos: la
promesa, cómo pensamos, qué hacemos, cómo trabajamos y el cierre. Dieciséis son láminas nuevas (una sola operación, el
veredicto de plataforma, Engagement y Next, los servicios, lo nuevo de Dreamforce, agentes con supervisora, la
aprobación del agente en el canal del equipo, el CRM en una conversación —el servicio de «Enablement
conversacional»—, identidad y consentimiento, la migración que cuadra, el diagnóstico con su veredicto, el equipo
híbrido por olas, el ciclo del release, la biblioteca de tutoriales, la operación gestionada y qué medimos) y el resto
usa recetas que ya existían (portada, propuesta y contraportada). Al canonizar, el operador decidió que las cuatro
láminas que no cabían en la receta que usaban tengan la suya.

- **Dos documentos, dos cierres:** si el deck se entrega como **brochure**, abre con la portada con foto y cierra con la
  contraportada sin foto «¿Conversamos? Cuando quieras.» en el color de Salesforce (compuesta desde su receta y
  aprobada por el operador el 2026-09-29). Si se entrega como **propuesta**, abre con la
  portada con el logo del cliente y cierra con la contraportada con foto «Empower your Revenue», la única con el logo
  de Efeonce a 700 px. Los dos planes están validados.
- **Se componen solas:** las dieciséis láminas nuevas tienen plantilla y se comparan contra una imagen de referencia
  congelada, así que un cambio accidental se detecta. Dos detalles quedaron como regla y no como copia exacta de la
  lámina aprobada: las negritas van en el peso que define la marca, y un número pequeño de SF18 va en gris suave porque
  el color de acento no se usa en textos chicos.
- **La insignia «Salesforce Partner» va por defecto:** Salesforce autorizó su uso (lo declaró el operador el
  2026-09-29), así que la portada y la contraportada de la propuesta la llevan. La versión «Operamos sobre» + logo de
  Salesforce queda como respaldo. La autorización es sólo de Salesforce: la insignia de cualquier otro partner sigue
  necesitando la suya.
- **La propuesta y el brochure ya existen como PDF, con la insignia:** 19 páginas cada uno, armados con las láminas
  aprobadas (la propuesta con la portada rotulada «Propuesta»; el brochure cierra con «¿Conversamos?»).
- **Marcas de terceros:** el logo, los íconos de producto y la insignia de Salesforce están autorizados por Salesforce.
  El personaje de Salesforce que usan dos láminas es una versión editada, no el arte oficial, y no se publica en el
  sistema de diseño. Las marcas de Claude (la lámina del CRM en una conversación) todavía esperan la autorización
  escrita de Anthropic.
- **Textos aprobados tal cual:** dos textos de las láminas de propuesta eran un poco más largos que lo que admitía su
  receta; el operador los aprobó y la receta ahora los admite, sin cambiar cómo se ven las demás láminas.
- **HubSpot:** la misma práctica vende HubSpot, pero su serie de láminas de contenido todavía no existe (TASK-1943).

> Detalle técnico: [norma §4.6, «Deck de práctica Salesforce»](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) ·
> [catálogo de recetas](../../operations/brand-graphic-line/deck-recipes/README.md) ·
> [TASK-1942](../../tasks/complete/TASK-1942-salesforce-deck-recipes-canonization.md).

## El deck SEO/AEO

El 2026-09-30 el operador aprobó el deck que presenta **Search Visibility 360 (SV360)**, el servicio de visibilidad en
Google y en los motores de IA, con sus piezas: el diagnóstico (AEO Assessment), su entregable (AI Visibility Report) y
la edición mensual (Efeonce Insights). Se entrega de tres formas: **completo** (33 láminas), **brochure** (24) y
**propuesta** (29), en cinco capítulos: el problema, SV360 y SEO, AEO, cómo trabajamos y por qué nosotros.

- **Seis láminas nuevas:** la familia de marcas (qué hay dentro de SV360), lo que hace el equipo (con maquetas grandes
  del trabajo técnico, del contenido y de la autoridad), cómo llega el informe (en qué formatos), el informe para el
  comité ya armado, las industrias (la pregunta que cada comprador le hace a la IA) y los mercados (los cinco países,
  vistos desde la órbita). **Todavía no se componen solas**: hoy se arman aparte y se insertan en el PDF.
- **El resto usa láminas que ya existían**, con su contenido propio: las portadas con el logo de SV360, las propuestas
  de SEO y AEO, el equipo con una bajada que nombra los roles, el día a día, los casos de éxito y los clientes.
- **Logos de submarca:** cada lámina que habla de una pieza puede llevar su logo oficial (SV360, AEO, AEO Assessment,
  AI Visibility Report o Insights), tal cual lo publica el sistema de diseño y nunca dibujado. En la propuesta AEO de
  cine, el logo reemplaza la etiqueta de arriba.
- **Casos de éxito:** BICECORP, Banco BICE y Berel, con imágenes de ambiente generadas para cada cliente y su logo
  oficial puesto encima (nunca dibujado por la IA). **Las cifras son de ejemplo** y el uso de cada logo depende de la
  autorización del cliente: con cualquiera de las dos cosas pendiente, el deck no sale a un cliente.
- **Formatos del informe:** la lámina promete que el informe llega por varios canales. Al 2026-09-30 están vivos la web
  y el celular, el PDF y el deck; el modo presentación no se ha probado con una edición real y **el correo que llega
  solo todavía no existe**. Antes de mostrarlo a un cliente, lo que no está vivo se quita o se marca «próximamente»
  (decisión pendiente del operador).
- **Las notas quedan fuera de la lámina:** «datos de ejemplo» o «maqueta» van en las notas del plan; sólo se quedan
  las marcas de muestra que el sistema exige.
- **Una sola sección partida por deck** y las industrias como preguntas de ejemplo, no como casos.

> Detalle técnico: [norma §4.6, «Deck SEO/AEO»](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) ·
> [catálogo de recetas](../../operations/brand-graphic-line/deck-recipes/README.md) ·
> [manual, «El deck SEO/AEO»](../../manual-de-uso/creative/componer-deck-con-recetas.md) ·
> [TASK-1949](../../tasks/in-progress/TASK-1949-seo-aeo-deck-recipes-canonization.md).

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
| **Toda cifra lleva su fuente** | Una cifra sin fuente se rechaza, al componer y ya en el plan. La lámina imprime «Fuente: …» a la vista |
| **Los datos de ejemplo se dicen** | La respuesta de la IA y el mapa del diagnóstico traen datos de ejemplo y lo muestran («Ejemplo ilustrativo», «Datos de muestra»). Esa marca no se puede quitar; sólo desaparece cuando los datos son del cliente y se adjunta la evidencia |
| **La interfaz de IA es genérica** | Ninguna lámina imita a ChatGPT, Gemini ni otro asistente (logo, colores, forma). Los nombres de los asistentes sólo aparecen como texto en el mapa del diagnóstico |
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
página por página, y sale en **un solo PDF** de varias páginas. Puede usar cualquiera de las 78 láminas con plantilla.

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

## Validar y proponer el plan antes de componer

Antes de escribir los textos y componer, conviene revisar el **plan** del deck: la lista de láminas en orden, cada una
nombrada por su receta del catálogo. Desde el 2026-09-28 el sistema revisa ese plan en segundos y, si se le pide, un
agente propone uno. Así un deck mal armado (dos cierres, una cotización en un brochure, la misma foto dos veces) se
detecta cuando todavía es una lista, no cuando ya hay 16 láminas escritas.

| Pregunta | Respuesta |
| --- | --- |
| ¿Qué es el plan? | Un archivo corto: qué documento es (brochure, propuesta, pitch o QBR), su línea de servicio y la lista de láminas por receta. Puede llevar ya los textos de cada lámina o no llevarlos todavía |
| ¿Qué revisa? | Que cada lámina exista en el catálogo y sirva para ese documento, que la portada vaya primero y el cierre al final, que la portada y el cierre sean pareja, que no haya dos cierres, dos versiones de la misma lámina en el deck (aunque vayan separadas) ni la misma foto dos veces, que los textos que ya estén escritos quepan en su casilla y que cada cifra escrita traiga su fuente |
| ¿Qué no revisa? | La calidad del texto, si una cifra es verdadera ni cómo se ve la lámina: eso sigue siendo revisión a ojo del operador. Tampoco ve una cifra escrita como texto suelto («68 %»): por eso las cifras se escriben con su fuente al lado |
| ¿Escribe o compone algo? | No. Revisar el plan no cambia nada ni produce piezas |

### Dos revisores, una sola voz por regla

El plan lo revisan dos capas, y cada regla vive en una sola:

| Capa | Qué revisa | Cómo se reconoce en el resultado |
| --- | --- | --- |
| **AXIS** (el sistema de diseño) | las reglas del documento completo que AXIS ya conoce: portada primero y cierre al final en un brochure, al menos una página de servicio, foto ↔ sin foto entre portada y cierre, una línea por documento, que la lámina sirva para ese uso | marcada `[axis]`. Sólo aplica a **brochure y propuesta**, y sólo cuando todas las láminas existen en el catálogo |
| **El catálogo de recetas** | lo que AXIS no conoce: recetas que no existen o no van en ese documento, parejas de portada y cierre, dos versiones de una lámina en el mismo deck, próximos pasos (o el mapa del diagnóstico) después de un diagnóstico, foto repetida, textos que no caben, cifras sin fuente, ritmo | marcada `[catalog]`. Aplica a los cuatro documentos |

Si AXIS ya dijo algo de una lámina, el catálogo no lo repite con otro nombre: cada problema aparece una vez.

### Errores y avisos

| Tipo | Qué significa | Ejemplos |
| --- | --- | --- |
| **Error** (✗) | el plan no está listo: hay que corregirlo antes de componer | una receta inventada, una plantilla nombrada en vez de una receta, dos cierres, una cotización en un brochure, la misma foto dos veces, la propuesta SEO sobria y la de cine en el mismo deck, una cifra sin fuente, un texto más largo que su casilla |
| **Aviso** (!) | el plan es válido, pero conviene mirarlo | tres láminas de papel seguidas, dos secciones partidas seguidas con la misma esquina |

Un plan con avisos y sin errores es válido. La lista completa de códigos, con cómo corregir cada uno, está en el
[manual](../../manual-de-uso/creative/componer-deck-con-recetas.md#paso-4b--valida-el-plan-antes-de-componer).

### El agente propone, la persona confirma

Un agente puede proponer el plan a partir de un contexto corto: el documento, si se presenta en sala o se lee, la
línea, si el diagnóstico ya se hizo, los temas en orden y los nombres de los hechos disponibles (por ejemplo «caso Sky
publicado»).

| Lo hace el agente | Lo hace la persona |
| --- | --- |
| Elige recetas **por id**, sólo entre las del catálogo para ese documento | Revisa el plan propuesto y decide si lo usa |
| Explica en una línea para qué está cada lámina y por qué armó el plan así | Escribe o confirma los textos y elige las fotos; las cifras, los casos y los logos se ligan desde la evidencia (abajo) |
| Si su primer plan tiene errores, lo corrige una vez con la lista de problemas | Compone y aprueba la pieza |

Reglas de la propuesta:

- **El agente no escribe contenido ni cifras.** Sólo elige y ordena láminas.
- **El contexto no admite datos del cliente:** ni identificadores de organización, ni montos, ni datos personales.
  Cualquier campo fuera de la lista permitida se rechaza antes de llamar al modelo.
- **Si después del segundo intento sigue habiendo errores, no hay plan:** se muestra el plan rechazado sólo para
  entender qué falló.
- **Si el proveedor del modelo no responde,** el resultado dice que la propuesta no está disponible, sin mostrar el
  error interno.
- **Cada propuesta cuesta dinero:** el comando imprime los tokens usados y un costo **estimado** (no es la factura).
  Una propuesta real de un brochure de 16 láminas, el 2026-09-28, costó cerca de USD 0,09 en dos intentos: el
  primero no traía página de servicio, AXIS lo marcó y el segundo lo corrigió.
- **Proponer no guarda nada.** Hoy la confirmación es simplemente que la persona use el plan; la confirmación
  registrada es trabajo pendiente (abajo).

### Ligar los datos reales de cada lámina

Un plan tiene dos clases de casillas. Las de **voz** (la pregunta, la respuesta, el cuerpo) las escribe quien propone
y las confirma una persona. Las de **datos** (el logo del cliente, las cifras, los casos, los testimonios, los logos
de otras marcas, los montos, el equipo y los datos de muestra) **nunca se escriben a mano**: se ligan desde la
información verificada de Greenhouse. Si una casilla de datos traía algo escrito, se reemplaza por el dato verificado
o se quita. Nunca se usa lo que venía escrito.

| Casilla | De dónde sale | Cuándo queda vacía |
| --- | --- | --- |
| Logo del cliente | la ficha del cliente (Account 360); en una portada oscura, su versión para fondo oscuro | si no hay logo o falta la versión para fondo oscuro |
| Cifras | una cifra **medida** de la evidencia de la propuesta; la fuente que se ve en la lámina sale de esa evidencia | si la cifra no tiene evidencia medida |
| Casos, testimonios, logos de otras marcas y foto de un caso | evidencia **declarada con su documento de respaldo** (la autorización del cliente) | sin documento de respaldo. La frase destacada de un testimonio tiene que ser un trozo literal de la cita. Una foto de ejemplo nunca pasa por foto del caso |
| Montos | siempre `[MONTO]` | hasta que exista la cotización congelada (TASK-1417) |
| Equipo | todavía no se liga, y nunca se usa una cara generada | hasta TASK-1418 |
| Láminas de muestra de SEO y AEO | conservan los datos y la marca de muestra | sólo con datos reales del cliente, con su evidencia, se retira la marca |

Reglas que no cambian según el deck:

- **Ningún deck usa evidencia interna, ni siquiera uno interno.** La evidencia interna es donde vive el costo y el
  margen. Si una casilla apunta a evidencia interna, el plan falla.
- **El muro de logos lleva al menos nueve logos autorizados** (decisión del operador del 2026-09-28). Con menos, se
  usa otra lámina de prueba.
- **Fuera de una propuesta** (un brochure, un pitch o un QBR) sólo se ligan cifras con un documento de respaldo. Los
  casos, testimonios y logos de otras marcas quedan sin autorización hasta que exista la biblioteca de autorizaciones
  por marca ([TASK-1937](../../tasks/to-do/TASK-1937-third-party-brand-usage-authorization-library.md)).
- **Si falta un dato obligatorio, el plan no compone.** El sistema nunca llena una casilla para que pase.
- **Cada casilla deja su rastro:** si quedó ligada o no, de dónde salió, qué evidencia la respalda, de qué fecha y,
  si quedó vacía, por qué.

Ligar **sólo lee**: no compone el deck ni guarda nada. El comando muestra cada casilla de datos con «ligado desde …»
o «sin ligar: motivo». Cómo correrlo, paso a paso, está en el
[manual](../../manual-de-uso/creative/componer-deck-con-recetas.md#paso-5b--liga-los-datos-reales); qué casilla de
qué lámina sale de qué fuente, en el
[catálogo](../../operations/brand-graphic-line/deck-recipes/README.md#datos-reales-por-slot-task-1930).

> Detalle técnico: `bindDeckSlots(plan, context)` (`server-only`) en
> [`src/lib/brand-surfaces/deck-recipes/bindings/index.ts`](../../../src/lib/brand-surfaces/deck-recipes/bindings/index.ts)
> y su núcleo puro `bindDeckSlotsWith` en [`core.ts`](../../../src/lib/brand-surfaces/deck-recipes/bindings/core.ts);
> devuelve `{ ok, plan, bindings, issues }` · lee sólo readers canónicos (`getProposalById`, la proyección allowlisted
> de la evidencia, `readOrganizationLogoVariants`; fuera de una propuesta, `getAssetById`) · el valor viaja en un
> hecho (`figure`, `logo`, `quote`, `photo`, `sample-data`, con su `evidenceRef`) porque `proposal_evidence` no guarda
> el valor de una cifra ni el texto de una cita · comando
> `pnpm brand:deck-plan -- --bind --plan <plan.json> (--context <c.json> | --proposal <id> --org <ownerOrgId> [--facts <f.json>] | --sources <fixture.json>) [--out <ligado.json>]`
> (con `--proposal` necesita `pnpm pg:connect`) ·
> [TASK-1930](../../tasks/in-progress/TASK-1930-deck-recipe-slot-data-bindings.md), en curso.

### Qué todavía no hace

| Pendiente | Qué implica hoy | Dónde se resuelve |
| --- | --- | --- |
| Confirmar y guardar el plan; pedirlo por API, desde Nexa o por MCP | Sólo se valida y se propone desde un equipo, con un comando; el plan vive en un archivo | TASK-1932 |
| Montos y equipo con datos reales | Las cifras, los casos, los testimonios y el logo del cliente ya se ligan (arriba); los montos siguen como `[MONTO]` y el equipo queda sin ligar | TASK-1417 y TASK-1418 |
| Guardar el plan ligado y componerlo con confirmación | Ligar sólo muestra el resultado; no compone ni guarda | TASK-1932 |
| Elegir fotos del banco gobernado | El validador sólo detecta una foto repetida dentro del plan | TASK-1931 |
| Componer el plan de una vez | Se compone lámina a lámina o como documento con `pnpm brand:compose`; el plan no se convierte solo en pedido | TASK-1921 (ruta productiva, en curso) |

> Detalle técnico: `validateDeckPlan` (pura, sin red ni escritura) en
> [`src/lib/brand-surfaces/deck-recipes/validate.ts`](../../../src/lib/brand-surfaces/deck-recipes/validate.ts), que
> valida el piso de AXIS con `resolveSurfaceDocument` de `@efeoncepro/axis-ui-contracts` · códigos del catálogo en
> [`issues.ts`](../../../src/lib/brand-surfaces/deck-recipes/issues.ts) · catálogo de runtime
> `catalog.generated.json` generado por `pnpm brand:deck-recipes` · `proposeDeckPlan` (`server-only`) en
> [`propose.ts`](../../../src/lib/brand-surfaces/deck-recipes/propose.ts), vía el cliente canónico
> `generateStructuredAnthropic` con un enum de ids de receta y un reintento · comando `pnpm brand:deck-plan`
> ([`scripts/brand-surfaces/deck-plan.ts`](../../../scripts/brand-surfaces/deck-plan.ts)) ·
> [arquitectura](../../architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md) ·
> [TASK-1929](../../tasks/complete/TASK-1929-deck-plan-recipe-catalog-validator.md).

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
| Confirmar y guardar el plan del deck; pedirlo por API, Nexa o MCP | El plan ya se valida y un agente lo propone (TASK-1929, ver arriba), pero sólo desde un equipo y sin registro de la confirmación | TASK-1932 |
| Datos reales en las casillas | Logo del cliente, cifras, casos y testimonios ya se ligan desde un plan con `--bind` (ver arriba), pero sólo desde un equipo; montos y equipo siguen pendientes | TASK-1930 (en curso), TASK-1417, TASK-1418 |
| Banco de fotos gobernado | Las fotos viven en el equipo de quien compone, fuera del repositorio | TASK-1931 |
| Armar el deck desde Proposal Studio | Una propuesta no produce todavía su deck «La órbita» | TASK-1932 |
| Control de foco en la sección partida | No se puede decir qué parte de la foto conservar. Si la persona queda cortada, se usa otra foto | sin task |

Pendientes de revisión que siguen abiertos en el catálogo:

- ninguna contraportada aprobada lleva el logo dentro de la órbita (las aprobadas lo ponen arriba de la columna);
- algunas fotos tienen el isotipo de la ropa sin registro de revisión: se revisan antes de publicar;
- una misma foto aparece en varias recetas: no se repite dentro de un mismo deck;
- la foto de las propuestas SEO todavía vive en el equipo de quien compone; entra al banco de fotos con TASK-1931.

Diferencias conocidas entre las láminas del marco y los prototipos aprobados: el texto «Cuando quieras.» sale un poco
más grande, la dirección web usa la versión fija de su burbuja y la caja de selección queda unos puntos más ajustada.

El operador aprobó a ojo las láminas compuestas el 2026-09-27 (TASK-1927) y el 2026-09-28 las seis familias nuevas y la
portada con selección (TASK-1928); ese mismo 2026-09-28 aprobó las nueve láminas de SEO y AEO y la nota del pie de la
propuesta cinematográfica, y la prueba visual automática las congeló (TASK-1934). Esa aprobación cubre las plantillas, no cada pieza futura.

> Detalle técnico: [TASK-1921](../../tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md) ·
> [TASK-1929](../../tasks/complete/TASK-1929-deck-plan-recipe-catalog-validator.md) ·
> [TASK-1930](../../tasks/in-progress/TASK-1930-deck-recipe-slot-data-bindings.md) ·
> [TASK-1931](../../tasks/to-do/TASK-1931-brand-plate-bank-governed.md) ·
> [TASK-1932](../../tasks/to-do/TASK-1932-proposal-studio-graphic-line-deck-output.md) · cierres en
> [TASK-1927](../../tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md) y
> [TASK-1928](../../tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md) · láminas SEO/AEO en
> [TASK-1934](../../tasks/in-progress/TASK-1934-seo-aeo-deck-slides-recipe-catalog-templates.md) ·
> [norma §7, estado y pendientes](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#7-estado-y-pendientes).

## Documentos relacionados

- [Línea gráfica Efeonce — La órbita](./linea-grafica-efeonce.md): la línea gráfica completa y sus reglas.
- [Componer un deck con las recetas por lámina](../../manual-de-uso/creative/componer-deck-con-recetas.md): cómo elegir
  y componer las láminas de un deck, paso a paso.
- [Componer una pieza por superficie con AXIS](../../manual-de-uso/creative/componer-por-superficie-con-axis.md): el
  comando para todas las superficies (web, vía pública, motion, video y deck).
- [Catálogo de recetas por lámina](../../operations/brand-graphic-line/deck-recipes/README.md): las 90 recetas (78 con plantilla).
