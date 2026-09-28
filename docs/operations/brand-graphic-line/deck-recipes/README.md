# Recetas por lámina del deck Efeonce «La órbita»

> **Tipo de documento:** Catálogo operativo (índice humano de un catálogo en JSON)
> **Versión:** 1.5
> **Creado:** 2026-09-27 por Claude
> **Última actualización:** 2026-09-28 por Claude (1.5: sección «Validar el plan: códigos y cómo leerlos» —
> `pnpm brand:deck-plan`, códigos del catálogo y de AXIS, avisos, propuesta del agente y catálogo de runtime generado
> (TASK-1929). Antes, 1.4: revisión de consistencia — todo empujado a `develop`,
> cuándo va el `layout` explícito, qué campo lleva la selección, `photo.focus` sólo en el reloj del día a día, TASK-1921
> en curso, enlace a la documentación funcional. Antes, 1.3: la portada con selección compone — layout `document-selection`,
> AXIS 0.3.21; **69 de 69** recetas con plantilla. Antes, 1.2: TASK-1928 — 68 de 69 recetas con plantilla, las familias
> nuevas y sus intents de ejemplo, paridad de slots receta ↔ plantilla y los pendientes de QA que resolvió. Antes, 1.1:
> estado tras el cierre de TASK-1927 — qué recetas tienen plantilla, equivalencia de nombres con el contrato de AXIS,
> pendientes de QA resueltos y abiertos, cómo cambiar la foto, el copy o la sección)
> **Fuente de verdad:** [`EFEONCE_DECK_SLIDE_RECIPES_V1.json`](./EFEONCE_DECK_SLIDE_RECIPES_V1.json) (esquema
> `efeonce.deck-slide-recipes.v1`, 69 recetas). Este README explica cómo usarlo; el índice del final se **genera**
> desde el JSON con `pnpm brand:deck-recipes` y no se edita a mano.
> **Canon que manda:** [composición por superficie §4.6](../EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) (reglas del
> deck, portadas y contraportadas, decisiones del 2026-09-27) · [manual de la línea gráfica](../EFEONCE_GRAPHIC_LINE_V1.md)
> (voz, órbita, firma, eslogan) · [registro cine](../../brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) (fotos de cine).
> **Relacionados:** [manual de uso · componer un deck con las recetas](../../../manual-de-uso/creative/componer-deck-con-recetas.md) ·
> [documentación funcional · composición de decks y brochures](../../../documentation/creative/composicion-de-decks-y-brochures.md) ·
> [documentación funcional de la línea](../../../documentation/creative/linea-grafica-efeonce.md) · skill
> [`deck-studio`](../../../../.claude/skills/deck-studio/SKILL.md) · [TASK-1926](../../../tasks/to-do/TASK-1926-cine-register-idempotent-photo-pipeline.md)
> (fotos) · [TASK-1927](../../../tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md) (plantillas
> de 31 recetas, `complete`) · [TASK-1928](../../../tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md)
> (plantillas de las 38 recetas restantes y la portada con selección, `complete`).

## Qué es

El operador aprobó el **2026-09-27** las **69 láminas** del canvas «La órbita», página «Deck»: portadas y
contraportadas, secciones, contenido, método, prueba, propuestas por línea de servicio, cotización, próximos pasos y
respiro. Este catálogo convierte cada lámina aprobada en una **receta**: qué comunica, cuándo se usa, cuándo no y qué
conviene en su lugar, con qué otras láminas va, qué partes son **data slots** del Artifact Composer, qué queda fijo, qué
selección lleva, de qué foto sale (ficha, prompt y post-proceso), con qué prompt se compone y qué reglas hace cumplir.

Sirve para que una persona o un agente arme un deck de **marca propia de Efeonce** (brochure, propuesta comercial,
pitch o QBR) eligiendo láminas aprobadas en vez de inventarlas. No aplica a decks con la marca de un cliente, al
catálogo `deck-axis` de las ofertas a comité ni a la interfaz de Greenhouse.

## Cómo se usa

1. **Decide el documento:** propuesta, brochure, pitch o QBR (tabla de abajo). El documento fija la portada, la
   contraportada y qué familias entran.
2. **Arma la secuencia por familias** (portada → secciones → contenido → método → prueba → cotización → próximos pasos
   → cierre) y, en cada familia, **elige la receta** con su «cuándo sí» y su «cuándo no». Si una receta dice «cuándo
   no», su `preferInstead` dice cuál usar.
3. **Respeta los pares:** `cover↔close` (portada y contraportada del mismo documento, alternando foto y sin foto),
   `variant` (se elige una, no las dos seguidas) y `sequence` (van una después de la otra).
4. **Llena los slots** con datos reales: textos dentro de su `maxChars` medido, montos siempre `[MONTO]`, cifras con
   fuente, logos sólo de clientes que autorizan su uso, fotos de ejemplo reemplazadas.
5. **Compón con la plantilla.** **Las 69** recetas tienen plantilla (columna «Plantilla» del índice y tabla de «Qué
   sale hoy con un comando»). **Escribe el intent** en un archivo propio, partiendo del intent de ejemplo de la receta
   (`src/lib/brand-surfaces/examples/deck-<receta>-intent.json`), con la receta y el `layout` de AXIS que le
   corresponden, y compón la lámina o el documento completo con `pnpm brand:compose`. La portada con selección
   (`cover-brochure-cine-lines-selection`) usa el layout `document-selection` de `cover-brochure` (AXIS 0.3.21).
6. **Revisa a ojo** el píxel final contra la referencia aprobada, con la lista de la norma y los pendientes de QA de
   abajo. Componer no aprueba ni publica.

El paso a paso para el equipo está en el
[manual de uso](../../../manual-de-uso/creative/componer-deck-con-recetas.md).

## Cómo elegir por documento

Las 69 láminas no traen portada ni cierre propios para **pitch** y **QBR**. El JSON y el índice generado todavía citan
las clásicas de AXIS (`cover-classic`, `close-classic`) como alternativa, pero **no se usan**: el operador no las
aprobó, en AXIS quedan `supersededBy` y Greenhouse no tiene plantilla para ellas. Para un pitch o un QBR, el marco se
le pregunta al operador.

| Documento | Portada | Contraportada | Secuencia típica | No va |
|---|---|---|---|---|
| **Propuesta comercial** (se envía después de conversar) | **sin foto**, con el logo del cliente: `cover-proposal-orbit` o `cover-proposal-dawn` (los `-sky` son el ejemplo) | **con foto** y «Empower your Growth»: `close-proposal-horizon` o `close-proposal-dawn` | agenda (`decision-agenda`) → sección → contexto o texto → página de servicio (`proposal-cinematic-*` o `proposal-service-*`) → método (`triptych`, `method-staircase`, `decision-plan`) → prueba (`content-clients`, `decision-case`, `decision-chart`, `decision-testimonial`) → equipo (`content-team`) → riesgo (`decision-risk`) → cotización (`content-pricing*`) → cierre | «¿Conversamos?»; `decision-next-steps` si el diagnóstico ya ocurrió (el gesto es aprobar: `content-pricing-live`) |
| **Brochure** (PDF horizontal que se lee sin presentador) | **con foto**: una de las tres generales (`cover-brochure-cine-orbit`, `-lines`, `-team`) o la de cinco líneas con selección, o la de una línea (`cover-brochure-line-*`) | **sin foto**: `close-brochure-orbit` con «¿Conversamos? Cuando quieras.» | quiénes somos (`section-cine-about` → `section-cine-purpose`) → servicios (`section-cine-services` → `proposal-cinematic-*`, `proposal-cinematic-nexa-lines`) → cómo trabajamos (`triptych`, `content-day*`) → equipo (`section-cine-team` → `content-team`) → prueba (`content-clients`, `content-partners`, `decision-case`) → `decision-next-steps` → cierre | cotización (los montos se definen en cada propuesta); eslogan en portada |
| **Pitch** (se presenta en sala) | sin portada aprobada: se pregunta al operador | sin cierre aprobado: se pregunta al operador | agenda → sección → texto o viñetas → método → prueba → `decision-next-steps` | cotización (no hay alcance acordado) |
| **QBR** (revisión con un cliente activo) | sin portada aprobada: se pregunta al operador | sin cierre aprobado: se pregunta al operador | agenda → sección → resultados (`content-measure`, `content-focus`, `decision-chart`, `content-day-live-results`) → método → respiro | páginas de venta de servicio y cotización |

Las dos contraportadas de brochure **con foto** (`close-brochure-horizon`, `close-brochure-dawn`) están aprobadas, pero
por la regla «foto ↔ sin foto» sólo emparejan con una portada de brochure sin foto, que hoy no existe (norma §6,
fila 15).

## Cómo elegir dentro de una familia

- **Sala o lectura.** Para una sala que necesita impacto: la versión en escena o en vivo (`content-pricing-stage`,
  `content-day-live-*`, `method-staircase`, `proposal-cinematic-*`). Para lectura atenta (finanzas, compras, un PDF
  que se estudia): la versión sobria (`content-pricing`, `content-day`, `method-staircase-flat`, `proposal-service-*`).
- **Ritmo.** Alterna papel y oscuro; no pongas dos secciones partidas con la misma esquina seguidas (`section-split`,
  `section-split-corner-bottom`, `section-split-panel-end` existen para alternar); no repitas un plate en el mismo
  deck.
- **Variantes.** Dentro de un par `variant` se elige una: la tabla de cotización o la escena o la cotización en vivo;
  la escalera BeX (`method-staircase`, la principal) o la plana (`method-staircase-flat`).
- **La promesa se prueba.** Una sección que promete («En días») va seguida de la lámina que lo prueba con fuente.

## Anatomía de una receta (campos del JSON)

| Campo | Para qué |
|---|---|
| `id`, `board`, `name`, `family`, `documents`, `surface`, `status` | identidad; `id` reutiliza el de AXIS cuando la lámina ya existe allí; `board` es el nombre de la lámina en el canvas |
| `communicates` | la idea que deja en quien la ve, en una frase |
| `useWhen` · `avoidWhen` · `preferInstead` | cuándo sí, cuándo no y qué receta conviene en su lugar (con su «cuándo») |
| `pairsWith` | pares `cover↔close`, `variant` y `sequence` |
| `slots` | data slots del Artifact Composer: `name`, `type` (`text`, `richText`, `number`, `metric`, `list`, `image`, `logo`, `person`, `money`, `date`, `enum`, `section`), `required`, `maxChars` medido, `example`, `notes` |
| `fixed` | lo que no se edita: órbita, firma, burbuja, grilla, estilo de fichas |
| `selection` | `none`, `collaborator`, `local-cta` o `multi`, con su etiqueta y su objetivo (contrato AXIS `efeonce.collaboration-selection`) |
| `photo` | registro, plate, ficha, prompt compilado, post-proceso (`foto:isotipo`, `foto:emblema`) y qué se reemplaza por cliente |
| `prompts.composition` | el prompt para componer la lámina desde datos, con tokens AXIS y medidas del canon, sin HEX ni px crudos |
| `renderSource` · `reference` · `referenceSource` | el prototipo de dirección que la compuso y la referencia aprobada (en AXIS: `references/surfaces/deck/<id>.jpg`) |
| `rules` · `notes` | reglas que la lámina hace cumplir y matices del operador |

## Reglas transversales

- **Una sola órbita por lámina**; la esfera cierra la respuesta y nunca va como viñeta. La luz de una foto de cine
  cuenta como la órbita de la lámina.
- **Ningún texto cruza la órbita ni al sujeto.** Si no cabe, se acorta la frase; no se mueve la órbita ni la foto.
- **Voz de la línea:** eyebrow · pregunta (con anillo) · respuesta de una a tres palabras con **una** esfera, al menos
  **3×** la pregunta · evidencia con **una** palabra en negrita. En el tríptico la respuesta se reparte en tres
  palabras, una por toma, cada una con su esfera (decisión 2 de abajo).
- **Fondo Efeonce siempre**; la línea de servicio sólo aporta su acento. El acento nunca en texto de menos de 24 px.
- **Portada con foto ⇄ contraportada sin foto** (y al revés). Propuesta: portada sin foto con el logo del cliente dentro
  de la órbita y contraportada con foto y «Empower your Growth». Brochure: portada con foto y contraportada con
  «¿Conversamos? Cuando quieras.». El eslogan nunca va en la portada. Logo de Efeonce a 500 px en portadas.
- **Lámina con foto a sangre sin logo**; el pie de las láminas lleva sólo la burbuja URL.
- **Registro cine** sólo con Nexa protagonista, en `proposal-cinematic` y, desde el 2026-09-27, en las **secciones y
  láminas «about»** aprobadas (decisión 4).
- **Isotipo del uniforme siempre compuesto** (`pnpm foto:isotipo`, revisado con `pnpm foto:emblema`), nunca el del
  modelo.
- **Montos como `[MONTO]`** hasta la propuesta; cifras sólo con fuente; fotos de ejemplo marcadas para reemplazo
  (caso Sky); selección y cursores sólo con el contrato AXIS, una sola selección por lámina.
- **Logos de terceros en un tono y con el mismo peso**; en `content-clients`, navy con la excepción tonal de Aguas
  Andinas y UC Temuco.

## Decisiones del operador (2026-09-27)

Registradas en la [norma §4.6](../EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) y en
`ai-generations/2026-09-27_deck-recetas/DECISIONES.md`. Si una nota del JSON contradice una decisión, **manda la
decisión** (ver «Notas del JSON que quedaron atrás»).

1. **Las 69 láminas están aprobadas.** Lo que el canon o AXIS marcaban como opción, prueba u «opción sin elegir» pasa a
   aprobado: lente, sangre, partida, foco, respiro, hoja de contactos, secciones cine (servicios y equipo), las tres
   portadas generales del brochure y la de cinco líneas con selección y cursor de Nexa
   (`cover-brochure-cine-lines-selection`). Esta última compone desde el 2026-09-28 con el layout
   `document-selection` (el operador relajó la regla «sin selección en cover-brochure»; AXIS 0.3.21).
2. **Tríptico:** una palabra por toma, cada una con su esfera: «Escucha.» «Crea.» «Mide.». Reemplaza la frase única con
   la esfera al final.
3. **Sección partida, las tres variantes:** el indicador sube por la **izquierda** y la esfera queda **arriba a la
   izquierda**. Variantes aprobadas: esquina arriba (`section-split`), esquina abajo (`section-split-corner-bottom`) y
   panel a la derecha (`section-split-panel-end`). La variante con la órbita a la derecha quedó descartada. El
   indicador barre las secciones ya recorridas, (n−1) de N; queda abierta para el operador la pregunta de unificarlo
   a n de N.
4. **Fotos de las secciones partidas y de «Quiénes somos» / «Por qué lo hacemos»:** aprobadas con personas en luz
   dramática. Son una **excepción aprobada del registro cine para secciones y láminas «about»**; no amplían el cine a
   otras superficies.
5. **Cotización:** tres variantes aprobadas (tabla, en escena 3D, en vivo). Montos siempre `[MONTO]`.
6. **Día a día:** cuatro momentos (`content-day`) + la alternativa con herramientas (`content-day-tools`) + dos «vívelo»
   (`content-day-live-progress`, avanza a la vista; `content-day-live-results`, resultados en vivo).
7. **Próximos pasos:** la versión con impacto (la agenda del diagnóstico abierta y el cursor en «Agenda un
   diagnóstico») reemplaza la de tres columnas.
8. **Clientes:** un solo tono navy; Aguas Andinas y UC Temuco en tonos de navy para conservar sus formas.
9. **Caso Sky:** la foto es de **ejemplo** y se reemplaza por una real del caso.
10. **BeX:** la escalera (`method-staircase`) es la principal; la plana (`method-staircase-flat`) es la variante.

### Notas del JSON que quedaron atrás

El JSON se escribió antes de que el operador cerrara estas decisiones. Estas notas se leen a la luz de la lista de
arriba (el JSON no se corrigió en este cambio):

- `triptych.notes` todavía dice «contradicción a resolver»: quedó resuelta por la decisión 2.
- `section-split-corner-bottom.notes` y `section-split-panel-end.notes` dicen que la excepción cine «no está escrita»:
  quedó escrita (decisión 4, registro cine y norma §4.6).
- Varias `notes` citan que §4.6 o el token AXIS tratan una lámina como «opción» o «prueba»: la norma ya dice
  aprobado (decisión 1). TASK-1927 integró en Greenhouse el contrato 0.1.2 con 31 recetas y TASK-1928 sumó las 38
  restantes (AXIS `axis-tokens` 0.3.20, `axis-ui-contracts` 0.3.18). La portada con selección llegó con AXIS
  `v0.3.21` (`axis-tokens` 0.3.21, `axis-ui-contracts` 0.3.19), que es lo que fija hoy Greenhouse.
- Varias recetas citan `cover-classic` o `close-classic` como alternativa (`preferInstead`): el marco clásico no fue
  aprobado y no se usa.

## Pendientes de QA

No bloquean la aprobación de las láminas. Se corrigieron al llevar cada receta a plantilla: TASK-1927 con las suyas y
TASK-1928 con las 38 restantes. Lo que sigue abierto está al final.

### Resueltos por TASK-1927

| Pendiente | Dónde | Cómo quedó |
|---|---|---|
| Respuesta bajo 3× la pregunta | contraportadas de brochure («Cuando quieras.») | la plantilla usa el valor del token y la respuesta queda sobre 3× la pregunta (3,1×) |
| Dirección de contacto | contraportadas de brochure y de propuesta | el contacto sale de `EFEONCE_CONTACT` (`src/config/efeonce-brand.ts`); AXIS sólo define el estilo |
| Plantillas en la versión anterior | `proposal-cinematic`, `section-split`, `triptych` | `pnpm brand:compose` compone sobre el contrato 0.1.2: prueba opcional en la página de servicio, layouts `hero` y `lines`, sección partida por la izquierda en sus tres composiciones y tríptico de una palabra por toma |

### Resueltos por TASK-1928

La plantilla aplica la norma sobre la referencia aprobada. Donde la referencia y la norma chocaban, manda la norma.

| Pendiente | Dónde | Cómo quedó (decisión) |
|---|---|---|
| Acento en texto de menos de 24 px | kickers «Recomendado» y cabecera de la cotización en vivo (`content-pricing*`), «01 · Diagnóstico · Sin costo» (`decision-next-steps`), kicker de las propuestas sobrias (`proposal-service-*`), rol del interlocutor (`content-team`), rótulos de los pilares de «por qué lo hacemos» (`section-cine-purpose`), rótulo «Revisamos contigo» del reloj (`content-day`), etiqueta de la tarjeta en revisión (`content-day-live-progress`) | **D1:** ese texto va en navy sobre papel o en el texto claro sobre oscuro, nunca en el acento de la línea. La auditoría renderizada del gate lo mide en todos los frames |
| Respuesta bajo 3× la pregunta | cotización (`content-pricing`, `-stage`, `-live`), clientes (`content-clients`), plan (`decision-plan`), partners (`content-partners`) y testimonio (`decision-testimonial`) | **3×:** la respuesta sube a 120 px (antes 118 en las cotizaciones, 116 en clientes, 112 en el plan, 110 en partners y 104 en el testimonio). La auditoría renderizada del gate mide la proporción en las cotizaciones, clientes, plan y partners |
| Cifras sin fuente visible | clientes (+127 %, +180 %), por qué elegirnos, «quiénes somos», prueba de Sky (`content-focus`) | **fuentes visibles:** toda cifra llega por `figures` del contrato, con valor, rótulo y fuente obligatoria, y la lámina imprime «Fuente: …». Una cifra sin fuente la rechaza AXIS. El foco, que imprimía «Datos de muestra», ahora cita el caso publicado de Sky |
| Logo chico en secciones de cine | `section-cine-services`, `section-cine-team` | **sin logo en láminas interiores con foto:** la plantilla retira el logo que venía de cuando eran portadas y el eyebrow vuelve al margen |
| Degradado sobre el plate (velo) | `section-cine-about`, `section-cine-purpose` | **sin velo:** la plantilla no pinta capa de degradado sobre la foto (regla `no-scrim` en AXIS) |
| Montos | cotización (`content-pricing*`) | **montos como marcador:** la plantilla imprime siempre `[MONTO]`; el intent no trae montos |
| Dirección de contacto | próximos pasos (`decision-next-steps`) | **contacto desde `EFEONCE_CONTACT`**, nunca desde el intent |
| Sin burbuja URL en el pie | partners (`content-partners`) | **burbuja URL** en el pie |

### Resuelto el 2026-09-28

| Pendiente | Dónde | Cómo quedó |
|---|---|---|
| Selección en la portada de cinco líneas | `cover-brochure-cine-lines-selection` | el operador relajó la regla «sin selección en cover-brochure». AXIS `v0.3.21` sumó a `cover-brochure` el layout `document-selection`: la misma columna y foto que `document`, selección de ocho tiradores sobre la respuesta («Crecer.»), nunca sobre la persona, y un solo cursor «Nexa» abajo al final. La respuesta baja 28 px y la evidencia queda 130 px debajo; logo arriba en 200. `document` y `line` siguen rechazando la selección (`selection-not-in-recipe`). Como la portada de cinco líneas de TASK-1927, firma con el logo y no lleva burbuja URL |

Otras decisiones que la plantilla aplica: las **barras** de `decision-chart` salen de su número (índice, antes = 100);
los **logos de terceros** se normalizan al componer (un tono y el mismo peso óptico), con la excepción tonal de Aguas
Andinas y la UC de Temuco; el **stack** (`content-stack`) no pinta los «pilares de luz» del guion, porque en la
referencia aprobada nunca se vieron.

### Abiertos

La aprobación visual de las seis familias de TASK-1928 y de la portada con selección la dio el operador el 2026-09-28.

| Pendiente | Dónde | Estado |
|---|---|---|
| Logo dentro de la órbita en el cierre | contraportadas | **sin resolver**: ninguna contraportada aprobada lo lleva así; las aprobadas ponen el logo arriba de la columna (norma §6, fila 17) |
| Isotipo sin registro de procedencia | plates `b` (NX6b, CR2b, WB1b, RV1b, BR2b…); HW1, T2, T3, H2 y LN4 sin isotipo compuesto | pasar por `pnpm foto:emblema` (y `foto:isotipo` si difiere) antes de publicar |
| Plate repetido | P1 en lente, sangre, contenido con foto y hoja de contactos | regla de uso: no repetirlo en un mismo deck |

Diferencias conocidas de las plantillas del marco contra los prototipos aprobados (el operador aprobó a ojo las
láminas compuestas el 2026-09-27): «Cuando quieras.» sale algo más grande que en el prototipo porque usa el valor del
token; la burbuja URL sale horneada en vez de la de luminosidad; la caja de selección sale del pintor canónico y queda
unos píxeles más ajustada.

## Qué sale hoy con un comando

**Las 69 recetas caen en una plantilla** del catálogo `graphic-line-deck` del Artifact Composer y salen con
`pnpm brand:compose`. La columna «Plantilla» del índice lo dice por receta y se lee de `registry.json`;
`recipe-map.json` ya no tiene recetas `blocked`. La última en llegar fue `cover-brochure-cine-lines-selection`
(2026-09-28): contentType `deck.cover-brochure.document-selection`, sobre la misma plantilla `CoverBrochure`, que marca
la respuesta como objetivo de la selección y tiene un slot `selection` opcional.

- [TASK-1927](../../../tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md) (`complete`) cubrió
  31 recetas: el marco (portadas y contraportadas), las secciones clásica y partida, la medida, el tríptico, la
  escalera y las propuestas de cine. Treinta tuvieron plantilla ahí; la trigésimo primera, la portada con selección,
  compone desde el 2026-09-28 con el layout `document-selection` (AXIS `v0.3.21`).
- [TASK-1928](../../../tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md) sumó las otras 38
  en seis familias, sobre 34 plantillas nuevas: las cuatro `proposal-service-*` comparten
  `ProposalService`, y `section-cine-team` y `section-cine-services` comparten `SectionCine`.

TASK-1927 y TASK-1928 están `complete` y empujadas a `develop`. La ruta productiva gobernada (API, `artifact-worker`,
MCP) es [TASK-1921](../../../tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md), en curso:
todavía no está disponible.

### Dos nombres para la misma lámina

El **id del catálogo** nombra la lámina aprobada (`section-split-corner-bottom`, `cover-brochure-line-voice`). El
**intent** que se compone usa la **receta del contrato de AXIS** (`efeonce.surface-composition`) y su `layout`
(`section-split` + `corner-bottom`, `cover-brochure` + `line`). Varias láminas del catálogo comparten una receta de
AXIS y se distinguen por el `layout`, la línea, la foto y el copy del intent. El `layout` se copia tal como viene en
el ejemplo: va explícito cuando la receta tiene varias composiciones; cuando el ejemplo no lo trae, la receta tiene una
sola o resuelve la de por defecto (`section-split` → `corner-top`, `section-cine` → `team`).

Los ejemplos viven en `src/lib/brand-surfaces/examples/`. Las recetas de TASK-1927:

| id del catálogo | Receta AXIS | `layout` | `use` | Intent de ejemplo |
|---|---|---|---|---|
| `cover-brochure-cine-orbit` | `cover-brochure` | `document` | brochure | `deck-cover-brochure-cine-orbit-intent.json` |
| `cover-brochure-cine-lines` | `cover-brochure` | `document` | brochure | `deck-cover-brochure-cine-lines-intent.json` |
| `cover-brochure-cine-team` | `cover-brochure` | `document` | brochure | `deck-cover-brochure-cine-team-intent.json` |
| `cover-brochure-cine-lines-selection` | `cover-brochure` | `document-selection` | brochure | `deck-cover-brochure-cine-lines-selection-intent.json` (contentType `deck.cover-brochure.document-selection`, plantilla `CoverBrochure`) |
| `cover-brochure-line-growth` | `cover-brochure` | `line` | brochure | `deck-cover-brochure-line-growth-intent.json` |
| `cover-brochure-line-brand` | `cover-brochure` | `line` | brochure | `deck-cover-brochure-line-brand-intent.json` |
| `cover-brochure-line-engine` | `cover-brochure` | `line` | brochure | `deck-cover-brochure-line-engine-intent.json` |
| `cover-brochure-line-voice` | `cover-brochure` | `line` | brochure | `deck-cover-brochure-line-voice-intent.json` |
| `cover-brochure-line-revenue` | `cover-brochure` | `line` | brochure | `deck-cover-brochure-line-revenue-intent.json` |
| `cover-proposal-orbit` | `cover-proposal` | `orbit` | proposal | `deck-cover-proposal-orbit-intent.json` (sin `clientLogo`: sale el marcador) |
| `cover-proposal-orbit-sky` | `cover-proposal` | `orbit` | proposal | `deck-cover-proposal-orbit-sky-intent.json` (con `clientLogo`) |
| `cover-proposal-dawn` | `cover-proposal` | `dawn` | proposal | `deck-cover-proposal-dawn-intent.json` (sin `clientLogo`: sale el marcador) |
| `cover-proposal-dawn-sky` | `cover-proposal` | `dawn` | proposal | `deck-cover-proposal-dawn-sky-intent.json` (con `clientLogo`) |
| `close-brochure-orbit` | `close-brochure` | `orbit` | brochure | `deck-close-brochure-orbit-intent.json` |
| `close-brochure-horizon` | `close-brochure` | `photo` | brochure | `deck-close-brochure-horizon-intent.json` |
| `close-brochure-dawn` | `close-brochure` | `photo` | brochure | `deck-close-brochure-dawn-intent.json` |
| `close-proposal-horizon` | `close-proposal` | — | proposal | `deck-close-proposal-horizon-intent.json` |
| `close-proposal-dawn` | `close-proposal` | — | proposal | `deck-close-proposal-dawn-intent.json` |
| `section-classic` | `section-classic` | — | — | `deck-section-classic-intent.json` |
| `section-split` | `section-split` | `corner-top` (o sin layout) | — | `deck-section-split-intent.json` |
| `section-split-corner-bottom` | `section-split` | `corner-bottom` | — | `deck-section-split-corner-bottom-intent.json` |
| `section-split-panel-end` | `section-split` | `panel-end` | — | `deck-section-split-panel-end-intent.json` |
| `content-measure` | `content-measure` | — | — | `deck-content-measure-intent.json` |
| `triptych` | `triptych` | — | — | `deck-triptych-intent.json` |
| `method-staircase` | `method-staircase` | — | — | `deck-method-staircase-intent.json` |
| `proposal-cinematic-creative` | `proposal-cinematic` | `service` | proposal o brochure | página de servicio en `deck-brochure-document.json` y `deck-proposal-document.json` |
| `proposal-cinematic-web` | `proposal-cinematic` | `service` | proposal o brochure | ídem |
| `proposal-cinematic-aeo` | `proposal-cinematic` | `service` | proposal o brochure | ídem |
| `proposal-cinematic-revops` | `proposal-cinematic` | `service` | proposal o brochure | ídem |
| `proposal-cinematic-nexa` | `proposal-cinematic` | `hero` | proposal o brochure | `deck-proposal-cinematic-hero-intent.json` |
| `proposal-cinematic-nexa-lines` | `proposal-cinematic` | `lines` | proposal o brochure | `deck-proposal-cinematic-lines-intent.json` |

«—» en `use` significa que el ejemplo no lo declara y AXIS resuelve el de la receta.

### Las recetas de TASK-1928

Cada una tiene su intent de ejemplo en `src/lib/brand-surfaces/examples/deck-<id del catálogo>-intent.json` (por
ejemplo, `deck-content-pricing-live-intent.json`). Los 38 ejemplos declaran `use: proposal`. Como en la tabla de
arriba, el intent pide la receta de AXIS y su `layout`; el `contentType` lo deriva `src/lib/brand-surfaces` del
manifest y el autor no lo escribe. Las cuatro propuestas sobrias usan la misma receta y se distinguen por `line` y
por el copy.

| Familia | id del catálogo | Receta AXIS | `layout` | Plantilla |
|---|---|---|---|---|
| Propuestas sobrias | `proposal-service-aeo` | `proposal-service` | — | `ProposalService` |
|  | `proposal-service-creative` | `proposal-service` | — | `ProposalService` |
|  | `proposal-service-web` | `proposal-service` | — | `ProposalService` |
|  | `proposal-service-revops` | `proposal-service` | — | `ProposalService` |
| Método | `method-staircase-flat` | `method-staircase` | `flat` | `MethodStaircaseFlat` |
|  | `decision-plan` | `decision-plan` | — | `DecisionPlan` |
|  | `method-score-ring` | `method-score-ring` | — | `MethodScoreRing` |
|  | `method-hybrid-workforce` | `method-hybrid-workforce` | — | `MethodHybridWorkforce` |
|  | `method-hybrid-workforce-scene` | `method-hybrid-workforce` | `scene` | `MethodHybridWorkforceScene` |
| Cotización, próximos pasos y respiro | `content-pricing` | `content-pricing` | — | `ContentPricing` |
|  | `content-pricing-stage` | `content-pricing` | `stage` | `ContentPricingStage` |
|  | `content-pricing-live` | `content-pricing` | `live` | `ContentPricingLive` |
|  | `decision-next-steps` | `decision-next-steps` | — | `DecisionNextSteps` |
|  | `breather` | `breather` | — | `Breather` |
| Prueba | `content-focus` | `content-focus` | — | `ContentFocus` |
|  | `content-clients` | `content-clients` | — | `ContentClients` |
|  | `content-partners` | `content-partners` | — | `ContentPartners` |
|  | `decision-risk` | `decision-risk` | — | `DecisionRisk` |
|  | `decision-case` | `decision-case` | — | `DecisionCase` |
|  | `decision-chart` | `decision-chart` | — | `DecisionChart` |
|  | `decision-testimonial` | `decision-testimonial` | — | `DecisionTestimonial` |
|  | `decision-why-us` | `decision-why-us` | — | `DecisionWhyUs` |
| Secciones y quiénes somos | `section-lens` | `section-lens` | — | `SectionLens` |
|  | `section-bleed` | `section-bleed` | — | `SectionBleed` |
|  | `section-cine-team` | `section-cine` | `team` | `SectionCine` |
|  | `section-cine-services` | `section-cine` | `services` | `SectionCine` |
|  | `section-cine-about` | `section-cine` | `about` | `SectionCineAbout` |
|  | `section-cine-purpose` | `section-cine` | `purpose` | `SectionCinePurpose` |
|  | `content-team` | `content-team` | — | `ContentTeam` |
|  | `content-stack` | `content-stack` | — | `ContentStack` |
| Contenido y día a día | `contact-sheet` | `contact-sheet` | — | `ContactSheet` |
|  | `content-text` | `content-text` | — | `ContentText` |
|  | `content-bullets` | `content-bullets` | — | `ContentBullets` |
|  | `content-day` | `content-day` | `clock` | `ContentDay` |
|  | `content-day-tools` | `content-day` | `tools` | `ContentDayTools` |
|  | `content-day-live-progress` | `content-day` | `live-progress` | `ContentDayProgress` |
|  | `content-day-live-results` | `content-day` | `live-results` | `ContentDayResults` |
|  | `decision-agenda` | `decision-agenda` | — | `DecisionAgenda` |

«—» en `layout`: la receta no lleva composición. `section-cine` sin `layout` resuelve como `team`.

Composiciones nuevas del contrato: `section-cine` ganó `about` y `purpose`; `content-day` ganó `tools`, `live-progress` y
`live-results`.

**Paridad de slots receta ↔ plantilla.** `recipe-map.json` (en el catálogo `graphic-line-deck`) declara, para cada
receta de TASK-1928, en qué campo del `slots.json` vive cada slot de la receta. El test
`src/lib/brand-surfaces/__tests__/recipe-slot-parity.test.ts` exige que cada slot tenga su campo, con tipo compatible,
que lo obligatorio siga obligatorio y el mismo largo máximo (en una plantilla compartida manda el mayor). Por eso el
`maxChars` del JSON es el largo que el compositor hace cumplir: un texto más largo **hace fallar la composición** con el
slot que lo recibe. Las recetas anteriores declaran `slots: null`.

### Componer una lámina o un documento

```bash
pnpm brand:compose -- --intent <intent.json>
pnpm brand:compose -- --intent <documento.json> --artifact-id <id> --out <dir>
```

Un intent con `pages` es un documento y produce un solo PDF multipágina 16:9 con su manifest y su procedencia. Un solo
issue de AXIS deja el documento sin componer. Portada con foto ↔ contraportada sin foto, y al revés: por eso
`close-brochure-horizon` y `close-brochure-dawn` tienen plantilla pero no emparejan con las portadas de brochure de
hoy. Ejemplos de documento: `deck-brochure-document.json` (nueve páginas) y `deck-proposal-document.json` (siete
páginas interiores). Paso a paso: [manual de uso](../../../manual-de-uso/creative/componer-deck-con-recetas.md).

Gate visual del catálogo: `pnpm composer:visual-gate --catalog=graphic-line` (66 frames a 0 px; altas declaradas en
`scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`).

### El contenido es dato del intent

La foto, el copy y la sección de una lámina se cambian **en el intent**, no en la plantilla; la plantilla nunca se
edita para una pieza. Para una pieza nueva se crea un intent propio **fuera de** `src/lib/brand-surfaces/examples/`:
esa carpeta está vigilada por un snapshot (`src/lib/brand-surfaces/__tests__/example-plans.test.ts`).

| Qué cambias | Campo del intent | Qué cuidar |
|---|---|---|
| La foto | `photo.plateRef`, `photo.alt` | `alt` obligatorio (describe la escena; sin él, `missing-photo`); el plate debe existir en disco (`ai-generations/**`, fuera de git) |
| El copy | `voice`, `body` | el `maxChars` medido de la receta; la respuesta sin punto |
| Las cifras | `figures` (valor, rótulo y fuente) | la fuente es obligatoria: sin ella AXIS rechaza la pieza |
| El ítem seleccionado | `selected` (número de ítem, desde 1); en la cotización, `recommended` (la selección sigue al plan recomendado); en la escalera, `selection.level` | fuera del rango de ítems, la composición falla con `invalid-intent`. `selection.item` es el campo interno de la plantilla: lo llena el sistema, no el intent. La portada `document-selection` no lleva `selection` en el intent |
| La sección | `progress` | sección n de N del deck real |
| El alto de la columna (portadas) | `column.topPx` | se elige según dónde queda el sujeto; fuera de la reserva del logo falla con `invalid-intent` |

El recorte de la foto es centrado y cubre el área que pide la receta: en la sección partida, una franja de
1.260 × 1.080 px sobre el lienzo de 1.920 × 1.080; en las láminas a sangre, el lienzo completo. La sección partida
**no tiene control de foco**: si el sujeto queda cortado, se usa una foto con otro encuadre. En el deck, hoy sólo la
lente del día a día (`content-day` con `clock`) lee `photo.focus` para dirigir el recorte hacia un punto del archivo. En
`section-split-panel-end` la foto va **espejada**: una foto con texto legible o con un logo saldría al revés. Al cambiar
la foto no cambian el panel, la esquina curva, el indicador ni la columna de voz: eso lo fija el `layout`.

Los montos no son dato del intent: la cotización imprime siempre `[MONTO]`. El contacto tampoco: sale de
`EFEONCE_CONTACT`.

Las fotos se piden por ficha (`pnpm foto:prompt`, `foto:generar`, `foto:validar`, `foto:emblema`, `foto:isotipo`); su
producción idempotente es TASK-1926 y el banco de plates gobernado, TASK-1931. La ruta productiva gobernada (fuera
del taller local) es TASK-1921, en curso; el plan de deck ya se valida (sección de abajo, TASK-1929); los datos reales en los slots
son TASK-1930 y el deck desde Proposal Studio, con la confirmación del plan, TASK-1932.

## Validar el plan: códigos y cómo leerlos

Desde el 2026-09-28 (TASK-1929) el **plan** de un deck —la lista de láminas, cada una por su `id` de este catálogo—
se valida antes de componer:

```bash
pnpm brand:deck-plan -- --plan <plan.json>
pnpm brand:deck-plan -- --propose --context <context.json> [--out <plan.json>]   # el agente propone; cuesta tokens
```

El plan (`document`, `line?`, `diagnosisDone?`, `slides[{ recipeId, slots?, plateRef? }]`) nombra **recetas por id**,
nunca plantillas ni `contentType`; los `slots` usan los nombres de slot de este catálogo. Validar no escribe ni compone
nada. Paso a paso, formato de `context.json` y problemas comunes:
[manual de uso, paso 4b](../../../manual-de-uso/creative/componer-deck-con-recetas.md#paso-4b--valida-el-plan-antes-de-componer).

Cada problema sale con su **fuente**: `[axis]` para las reglas de documento que AXIS ya valida (sólo brochure y
propuesta, y sólo cuando todas las láminas existen) y `[catalog]` para las de este catálogo. Una regla vive en una sola
de las dos: si AXIS ya la marcó en una lámina, el catálogo no la repite.

| Código | Fuente | Tipo | Qué campo del catálogo lo decide |
|---|---|---|---|
| `plan-invalid` | catalog | error | forma del plan |
| `template-named-instead-of-recipe` | catalog | error | el plan nombra una plantilla, un `contentType`, un id que empieza con `deck.` o con mayúscula |
| `recipe-unknown` | catalog | error | `id` (acepta `cover-classic` y `close-classic` sólo en pitch y QBR; una familia de AXIS como `proposal-cinematic` no es receta) |
| `recipe-not-for-document` | catalog | error | `documents` |
| `frame-count` | catalog | error | más de una portada o de un cierre (cubre también el eslogan dos veces) |
| `frame-order` | catalog | error | portada primera y cierre último |
| `pair-cover-close-mismatch` | catalog | error | `pairsWith` con `cover↔close` |
| `next-steps-after-diagnosis` | catalog | error | `decision-next-steps` en una propuesta con `diagnosisDone: true` |
| `variant-adjacent` | catalog | error | `pairsWith` con `variant`: dos variantes seguidas |
| `plate-repeated` | catalog | error | el plate de la receta (o `plateRef`) repetido en el plan; cierra el pendiente «plate repetido» dentro de un plan |
| `slot-unknown` | catalog | error | `slots[].name` (el eslogan en una portada cae aquí: ninguna portada lo tiene) |
| `slot-type-invalid` | catalog | error | `slots[].type` |
| `slot-required-missing` | catalog | error | `slots[].required`, sólo si la lámina ya trae `slots` |
| `slot-over-max-chars` | catalog | error | `slots[].maxChars` (texto: largo total; `richText`: por línea, sin `**`; lista: por ítem) |
| `recipe-without-template` | catalog | aviso | lámina sin plantilla en el composer (hoy sólo `cover-classic`/`close-classic` en pitch y QBR) |
| `section-split-corner-adjacent` | catalog | aviso | dos secciones partidas seguidas con la misma esquina |
| `rhythm-paper-run` | catalog | aviso | tres láminas de papel seguidas (una vez por tramo) |
| `brochure-cover-first`, `brochure-close-last`, `brochure-needs-service-page`, `frame-photo-must-alternate`, `document-line-mismatch`, `use-not-for-recipe`, `progress-required` | axis | error | el contrato de documento de AXIS; los de página (`page[i]:x`) salen como `x` en la lámina i |
| `proposal-unavailable` | agent | error | sólo al proponer: el proveedor del modelo no respondió |

Reglas del catálogo **sin código propio**, porque otra ya las cubre: la alternancia foto ↔ sin foto
(`frame-photo-must-alternate` de AXIS), el eslogan en la portada (`slot-unknown`), el eslogan dos veces
(`frame-count`) y el mensaje de cierre o las familias que un documento excluye (`recipe-not-for-document`). **No hay
regla de orden de secuencia:** `pairsWith` con `sequence` dice qué láminas van juntas, no en qué orden
(`proposal-cinematic-nexa-lines` lista una portada como secuencia), así que una regla de orden daría avisos falsos. El
ritmo se vigila sólo en papel: las láminas oscuras son el fondo base del deck.

El validador no lee este JSON en runtime: lee `src/lib/brand-surfaces/deck-recipes/catalog.generated.json`, que escribe
`pnpm brand:deck-recipes` junto con el índice de abajo. Por eso, **después de editar el JSON, corre
`pnpm brand:deck-recipes`**: `--check` falla si el índice **o** el catálogo de runtime quedaron atrás.

## Cómo regenerar el índice

```bash
pnpm brand:deck-recipes            # valida el JSON y reescribe el índice de abajo y el catálogo de runtime
pnpm brand:deck-recipes -- --check # valida y falla si el índice o el catálogo de runtime no están al día (no escribe)
```

El script (`scripts/creative/deck-recipes/render-index.mjs`, Node sin dependencias) falla si el JSON no parsea, si
falta un campo del esquema, si hay ids repetidos o si un `preferInstead` o `pairsWith` apunta a un id que no existe
(las familias de AXIS declaradas en `axisRecipeFamilies` son la única excepción).

## Índice

<!-- deck-recipes-index:start -->

<!-- Generado por scripts/creative/deck-recipes/render-index.mjs desde EFEONCE_DECK_SLIDE_RECIPES_V1.json. No editar a mano: corre «pnpm brand:deck-recipes». -->

Catálogo `efeonce.deck-slide-recipes.v1` versión 1.0.0 · 78 recetas · aprobado el 2026-09-27 por operador (canvas «La órbita», página Deck).
**71 de 78** recetas tienen plantilla en el Artifact Composer y se componen con `pnpm brand:compose` (columna «Plantilla», leída de `graphic-line-deck/registry.json`). Las demás todavía no.

### Recetas por familia y documento

| Familia | Propuesta | Brochure | Pitch | QBR | Total |
|---|---:|---:|---:|---:|---:|
| Portadas (`cover`) | 4 | 9 | — | — | 13 |
| Contraportadas (`close`) | 2 | 3 | — | — | 5 |
| Secciones (`section`) | 8 | 6 | 6 | 6 | 8 |
| Quiénes somos, equipo y stack (`about`) | 5 | 5 | 4 | 1 | 5 |
| Contenido (`content`) | 9 | 7 | 9 | 4 | 9 |
| Método (`method`) | 10 | 9 | 8 | 3 | 10 |
| Prueba (`proof`) | 12 | 10 | 12 | 4 | 12 |
| Propuesta por línea de servicio (`proposal-service`) | 10 | 10 | — | — | 10 |
| Cotización (`pricing`) | 3 | — | — | — | 3 |
| Próximos pasos (`next-steps`) | 2 | 2 | 2 | — | 2 |
| Respiro (`breather`) | 1 | — | 1 | 1 | 1 |

«Cuándo sí» y «cuándo no» muestran el primer criterio de la receta; los demás, el «cuándo» de cada alternativa, los pares, los elementos fijos, la foto y el prompt de composición están en el JSON. «Slots clave» lista los obligatorios con su largo máximo medido (`≤N` caracteres).

### Portadas · `cover` (13)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `cover-brochure-cine-orbit` | Portada de brochure · Nexa frente a la órbita · «¿Qué hace Efeonce? Crecer.» | `deck.cover-brochure` | brochure | Portada del brochure GENERAL de servicios (las cinco líneas), en PDF que se lee sin presentador. | En una propuesta comercial: la portada de propuesta va SIN foto y con el logo del cliente. | `cover-proposal-orbit`, `cover-brochure-line-growth`, `section-cine-services`, `cover-classic` (AXIS) | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `photo` |
| `cover-brochure-cine-lines` | Portada de brochure · Nexa y las cinco líneas · «¿Qué hace Efeonce? Crecer.» | `deck.cover-brochure` | brochure | Portada del brochure general cuando el documento recorre las cinco líneas y conviene mostrarlas desde la tapa. | En una propuesta comercial (portada sin foto con el logo del cliente). | `cover-brochure-cine-orbit`, `cover-brochure-line-brand`, `cover-proposal-orbit`, `cover-brochure-cine-lines-selection` | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `photo` |
| `cover-brochure-cine-lines-selection` | Portada de brochure · Nexa y las cinco líneas, con selección y cursor de Nexa sobre «Crecer.» | `deck.cover-brochure.document-selection` | brochure | Portada del brochure general cuando se quiere contar que Efeonce trabaja con personas y agentes sobre el mismo documento. | Si otra lámina del documento ya repite el mismo gesto de selección sobre «Crecer.» (la sección de servicios lo lleva con cursor propio): no dos veces seguidas. | `cover-brochure-cine-lines`, `section-cine-services` | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `selectionLabel` ≤8, `photo` |
| `cover-brochure-cine-team` | Portada de brochure · Nexa y el equipo con agentes · «¿Qué hace Efeonce? Crecer.» | `deck.cover-brochure` | brochure | Portada del brochure general cuando el argumento principal es el equipo (personas + agentes), por ejemplo para compradores que temen perder control o conocer a quién les atiende. | Si la sección del equipo del mismo documento abre con esta misma foto («¿Quién hace crecer tu marca? Este equipo.»): no repetirla. | `section-cine-team`, `cover-brochure-cine-orbit`, `content-team` | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `photo` |
| `cover-brochure-line-growth` | Portada de brochure por línea · Growth Strategy & Measurement · «¿Lo medimos? Siempre.» | `deck.cover-brochure` | brochure | Portada del brochure de la línea Growth Strategy & Measurement (documento de una sola línea de servicio). | En el brochure general de las cinco líneas: allí va una de las portadas generales («¿Qué hace Efeonce? Crecer.»). | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `proposal-cinematic` (AXIS) | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `line`, `photo` |
| `cover-brochure-line-brand` | Portada de brochure por línea · Creative Services · «¿Quién crea mi contenido? Tu squad.» | `deck.cover-brochure` | brochure | Portada del brochure de la línea Creative Services (documento de una sola línea de servicio). | En el brochure general de las cinco líneas: allí va una de las portadas generales («¿Qué hace Efeonce? Crecer.»). | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `proposal-cinematic` (AXIS) | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `line`, `photo` |
| `cover-brochure-line-engine` | Portada de brochure por línea · Digital Services & Engineering · «¿Te encuentra la IA? Visible.» | `deck.cover-brochure` | brochure | Portada del brochure de la línea Digital Services & Engineering (documento de una sola línea de servicio). | En el brochure general de las cinco líneas: allí va una de las portadas generales («¿Qué hace Efeonce? Crecer.»). | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `proposal-cinematic` (AXIS) | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `line`, `photo` |
| `cover-brochure-line-voice` | Portada de brochure por línea · Media & Distribution · «¿Dónde invierto? Donde rinde.» | `deck.cover-brochure` | brochure | Portada del brochure de la línea Media & Distribution (documento de una sola línea de servicio). | En el brochure general de las cinco líneas: allí va una de las portadas generales («¿Qué hace Efeonce? Crecer.»). | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `proposal-cinematic` (AXIS) | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `line`, `photo` |
| `cover-brochure-line-revenue` | Portada de brochure por línea · RevOps & CRM · «¿Y el reporte del viernes? Ya lo viste.» | `deck.cover-brochure` | brochure | Portada del brochure de la línea RevOps & CRM (documento de una sola línea de servicio). | En el brochure general de las cinco líneas: allí va una de las portadas generales («¿Qué hace Efeonce? Crecer.»). | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `proposal-cinematic` (AXIS) | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `line`, `photo` |
| `cover-proposal-orbit` | Portada de propuesta sin foto · la órbita gigante sostiene el logo del cliente (plantilla) | `deck.cover-proposal` | proposal | Portada de una propuesta comercial enviada a un cliente con nombre (después de conversar). | En un brochure: la portada de brochure lleva foto y no lleva cliente. | `cover-brochure-cine-orbit`, `cover-proposal-dawn` | `eyebrow` ≤34, `question` ≤24, `answer` ≤10, `clientName` ≤18, `evidence` ≤44, `clientLogo`, `selectionLabel` ≤12 |
| `cover-proposal-orbit-sky` | Portada de propuesta sin foto · la órbita gigante con el logo de SKY (ejemplo) | `deck.cover-proposal` | proposal | Portada de una propuesta comercial enviada a un cliente con nombre (después de conversar). | En un brochure: la portada de brochure lleva foto y no lleva cliente. | `cover-brochure-cine-orbit`, `cover-proposal-dawn`, `cover-proposal-orbit` | `eyebrow` ≤34, `question` ≤24, `answer` ≤10, `clientName` ≤18, `evidence` ≤44, `clientLogo`, `selectionLabel` ≤12 |
| `cover-proposal-dawn-sky` | Portada de propuesta sin foto · la órbita sale como el sol con SKY dentro (ejemplo) | `deck.cover-proposal.dawn` | proposal | Portada de una propuesta comercial enviada a un cliente con nombre (después de conversar). | En un brochure: la portada de brochure lleva foto y no lleva cliente. | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `cover-proposal-dawn` | `eyebrow` ≤34, `question` ≤24, `answer` ≤10, `clientName` ≤18, `evidence` ≤44, `clientLogo`, `selectionLabel` ≤12 |
| `cover-proposal-dawn` | Portada de propuesta sin foto · la órbita sale como el sol con el logo del cliente (plantilla) | `deck.cover-proposal.dawn` | proposal | Portada de una propuesta comercial enviada a un cliente con nombre (después de conversar). | En un brochure: la portada de brochure lleva foto y no lleva cliente. | `cover-brochure-cine-orbit`, `cover-proposal-orbit` | `eyebrow` ≤34, `question` ≤24, `answer` ≤10, `clientName` ≤18, `evidence` ≤44, `clientLogo`, `selectionLabel` ≤12 |

### Contraportadas · `close` (5)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `close-brochure-horizon` | Contraportada de brochure · Nexa camina hacia la órbita · «¿Conversamos? Cuando quieras.» | `deck.close-brochure.photo` | brochure | Contraportada de un brochure cuya portada va SIN foto (regla de alternancia). | Con cualquiera de las portadas de brochure aprobadas hoy: todas llevan foto, así que esta contraportada no tiene pareja válida. | `close-brochure-orbit`, `close-proposal-horizon` | `sloganLineWord`, `photo` |
| `close-brochure-dawn` | Contraportada de brochure · Nexa y un agente hacia la órbita al amanecer · «¿Conversamos? Cuando quieras.» | `deck.close-brochure.photo` | brochure | Contraportada de un brochure con portada SIN foto, cuando se quiere subrayar que personas y agentes trabajan juntos. | Con cualquiera de las portadas de brochure aprobadas hoy (todas con foto): no tiene pareja válida. | `close-brochure-orbit`, `close-proposal-dawn` | `sloganLineWord`, `photo` |
| `close-brochure-orbit` | Contraportada de brochure sin foto · la órbita gigante · «¿Conversamos? Cuando quieras.» | `deck.close-brochure` | brochure | Contraportada por defecto de TODO brochure: es la pareja sin foto de las portadas con foto (las tres generales y las cinco por línea). | En una propuesta comercial: la propuesta cierra con foto y con «Empower your Growth». | `close-proposal-horizon`, `close-brochure-horizon`, `close-classic` (AXIS) | `sloganLineWord` |
| `close-proposal-horizon` | Contraportada de propuesta · «Empower your Growth» hacia la órbita | `deck.close-proposal` | proposal | Contraportada de toda propuesta comercial: es la pareja CON foto de las portadas de propuesta sin foto. | En un brochure: su contraportada abre la conversación con «¿Conversamos? Cuando quieras.». | `close-brochure-orbit`, `decision-next-steps`, `close-proposal-dawn` | `sloganLineWord`, `photo` |
| `close-proposal-dawn` | Contraportada de propuesta · «Empower your Growth» al amanecer | `deck.close-proposal` | proposal | Contraportada de toda propuesta comercial: es la pareja CON foto de las portadas de propuesta sin foto. | En un brochure: su contraportada abre la conversación con «¿Conversamos? Cuando quieras.». | `close-brochure-orbit`, `decision-next-steps`, `close-proposal-horizon` | `sloganLineWord`, `photo` |

### Secciones · `section` (8)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `section-lens` | Sección con lente · el arco mide en qué sección vamos | `deck.section-lens` | proposal, pitch, qbr | Abrir una sección de un deck que alguien presenta, cuando existe una foto documental del oficio de esa sección. | Cuando la foto no aguanta el recorte circular (sujeto pegado al borde o escena que necesita todo el ancho). | `section-classic`, `section-bleed`, `section-split` | `section`, `question` ≤34, `answer` ≤14, `photo`, (+1 opcional) |
| `section-classic` | Sección clásica AXIS · el número dentro del anillo | `deck.section-classic` | proposal, brochure, pitch, qbr | Abrir una sección cuando no hay foto propia del tema o el deck ya tiene suficiente fotografía. | Cuando la sección necesita emoción o mostrar al equipo trabajando: una sección sin foto no lo hace. | `section-split`, `section-lens`, `section-cine-services` | `section`, `question` ≤36, `answer` ≤14 |
| `section-bleed` | Sección con foto a sangre · el indicador chico arriba a la izquierda | `deck.section-bleed` | proposal, pitch, qbr | Abrir una sección con una escena ancha del oficio que pierde fuerza recortada en un círculo. | Cuando la foto no trae una zona calma y oscura a la izquierda para la voz (reservar después de generar no existe). | `section-lens`, `section-classic`, `breather` | `section`, `question` ≤24, `answer` ≤10, `photo` |
| `section-split` | Sección partida · la órbita sube por la izquierda | `deck.section-split` | proposal, brochure, pitch, qbr | Abrir una sección de brochure o propuesta cuando hay un retrato fuerte relacionado con el tema. | Si la persona del retrato mira fuera de la lámina, hacia el borde opuesto al panel: la mirada saca al lector. | `section-split-corner-bottom`, `section-split-panel-end`, `section-classic` | `section`, `question` ≤32, `answer` ≤12, `photo` |
| `section-split-corner-bottom` | Sección partida · esquina abajo («¿Cuánto tarda tu campaña? En días.») | `deck.section-split.corner-bottom` | proposal, brochure, pitch, qbr | Abrir una sección sobre velocidad, producción o campaña, con una persona del equipo en acción. | Si la promesa de la respuesta («en días») no se prueba en la lámina siguiente con una cifra con fuente. | `section-split`, `section-split-panel-end`, `content-measure` | `section`, `question` ≤30, `answer` ≤12, `photo` |
| `section-split-panel-end` | Sección partida · panel a la derecha («¿Qué responde la IA? Tu marca.») | `deck.section-split.panel-end` | proposal, brochure, pitch, qbr | Abrir una sección sobre el resultado del cliente (AEO, visibilidad, respuesta), cuando la protagonista es la persona del cliente. | Si la persona mira hacia el borde izquierdo: el panel a la derecha la dejaría mirando fuera. | `section-split`, `section-split-corner-bottom` | `section`, `question` ≤30, `answer` ≤12, `photo` |
| `section-cine-services` | Sección de cine · abre los servicios («¿Qué hace Efeonce? Crecer.») | `deck.section-cine.services` | brochure, proposal | Abrir la sección de servicios de un brochure o de una propuesta. | Como portada: el operador la reubicó como lámina interior (la portada de brochure es otra receta). | `section-cine-team`, `section-classic` | `eyebrow` ≤24, `question` ≤20, `answer` ≤8, `photo` |
| `section-cine-team` | Sección de cine · abre el equipo («¿Quién hace crecer tu marca? Este equipo.») | `deck.section-cine` | brochure, proposal | Abrir la sección del equipo en un brochure o una propuesta, antes de la lámina con las personas asignadas. | Como portada: se reubicó como interior. | `content-team`, `section-cine-about` | `eyebrow` ≤24, `question` ≤40, `answer` ≤16, `photo` |

### Quiénes somos, equipo y stack · `about` (5)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `section-cine-about` | Sección de cine · quiénes somos («¿Quiénes somos? Un solo equipo.») | `deck.section-cine.about` | brochure, proposal, pitch | Presentar a Efeonce en un brochure, una propuesta o un pitch, antes de los servicios. | Si las cifras no están verificadas y vigentes: cada cifra necesita respaldo. | `decision-why-us`, `section-cine-team` | `eyebrow` ≤24, `question` ≤24, `answer` ≤16, `body` ≤100, `figures` ≤4, `photo` |
| `section-cine-purpose` | Sección de cine · por qué lo hacemos («¿Por qué lo hacemos así? Contigo.») | `deck.section-cine.purpose` | brochure, proposal, pitch | Explicar el propósito y la forma de trabajo de Efeonce, después de «quiénes somos». | Si la lámina anterior ya dijo el propósito con otra receta. | `decision-why-us`, `section-cine-about` | `eyebrow` ≤24, `question` ≤26, `answer` ≤9, `evidence` ≤110, `pillars` ≤70, `photo` |
| `content-team` | El equipo · el squad real en fichas de vidrio sobre la órbita | `deck.content-team` | proposal, pitch, qbr, brochure | En una propuesta o pitch con el squad ya asignado a la cuenta. | El squad no está asignado: nunca fotos genéricas, de stock ni generadas. | `section-cine` (AXIS), `content-text` | `eyebrow` ≤20, `question` ≤40, `answer` ≤18, `body` ≤85, `lead` ≤26, `team` ≤26 |
| `content-stack` | Nuestro stack · tres capas de herramientas sobre Efeonce | `deck.content-stack` | proposal, brochure, pitch | Para justificar un delivery premium por el stack que lo sostiene. | La conversación es de programas de partner. | `content-partners`, `content-day-tools` | `eyebrow` ≤20, `question` ≤26, `answer` ≤12, `body` ≤100, `layers` ≤22, `highlightedLayer` |
| `proposal-cinematic-nexa-lines` | Líneas de servicio con Nexa · cinco esferas de luz, una por línea, orbitan a su alrededor | `deck.proposal-cinematic.lines` | proposal, brochure | Presentar el portafolio completo de líneas de servicio | La propuesta es de una sola línea: se pasa directo a su lámina de servicio | `proposal-cinematic-creative`, `cover-brochure` (AXIS) | `eyebrow` ≤34, `body` ≤36, `photo`, (+1 opcional) |

### Contenido · `content` (9)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `content-measure` | Contenido · la órbita mide la cifra | `deck.content-measure` | proposal, brochure, pitch, qbr | Cuando el hallazgo o el resultado principal es UN porcentaje real con fuente. | Si la cifra no es un porcentaje entre 0 y 100: el arco no puede medir días, montos ni multiplicadores. | `content-focus`, `decision-chart`, `decision-why-us` | `eyebrow` ≤28, `question` ≤38, `measure` ≤5, `body` ≤90, `source` ≤60, `photo`, (+1 opcional) |
| `contact-sheet` | Varias fotos · hoja de contactos con profundidad | `deck.contact-sheet` | proposal, pitch, qbr | Mostrar un proceso creativo con varias tomas reales y la decisión sobre ellas. | Con fotos de formatos distintos que habría que recortar: todas nativas 16:9. | `triptych`, `breather` | `question` ≤32, `answer` ≤6, `chosen`, `alternatives` ≤30, `collaborator` ≤20 |
| `content-text` | Texto · el porqué, dicho en una palabra gigante | `deck.content-text` | proposal, brochure, pitch | Para fijar el porqué o la promesa de marca antes de entrar al detalle de la oferta. | La respuesta necesita más de una palabra: la escala que la justifica se pierde. | `content-bullets`, `decision-why-us`, `content-measure` | `eyebrow` ≤28, `question` ≤32, `answer` ≤8, `body` ≤95, `pillars` ≤46, `nav` |
| `content-bullets` | Texto con viñetas · cuatro puntos numerados | `deck.content-bullets` | proposal, brochure, pitch | Para explicar qué recibe el cliente en cuatro ideas del mismo peso. | Son más o menos de cuatro puntos: la grilla es de 2 × 2. | `content-text`, `decision-plan`, `decision-why-us` | `eyebrow` ≤28, `question` ≤40, `answer` ≤14, `items` ≤95, `selectedItem`, `selectionLabel`, `nav` |
| `content-day` | El día a día · cuatro momentos con horario en la órbita-reloj | `deck.content-day` | proposal, brochure, pitch | Para mostrar cómo se trabaja con fotos reales de oficio (terreno, taller, revisión, medición). | No hay fotos aprobadas de los momentos. | `content-day-tools`, `content-day-live-progress`, `content-day-live-results` | `eyebrow` ≤24, `question` ≤34, `answer` ≤5, `body` ≤120, `keyMoment`, `moments` ≤24 |
| `content-day-tools` | El día a día con las herramientas · el panel de Greenhouse al centro | `deck.content-day.tools` | proposal, brochure, pitch | Cuando el cliente pregunta cómo se coordina el trabajo y dónde ve lo que pasa. | La cuenta no usa esas herramientas o no tiene panel de Greenhouse. | `content-day`, `content-stack` | `eyebrow` ≤26, `question` ≤30, `answer` ≤5, `body` ≤100, `panel`, `tools` ≤22 |
| `content-day-live-progress` | Vívelo 1 · el plan en Notion y la aprobación en Frame.io | `deck.content-day.live-progress` | proposal, brochure, pitch | Después del día a día con herramientas, para que quien lo ve viva la aprobación. | La cuenta no aprueba piezas visuales (servicios sin producción creativa). | `content-day-live-results`, `content-day-tools` | `eyebrow` ≤26, `question` ≤28, `answer` ≤12, `body` ≤100, `boardTitle` ≤24, `boardCards` ≤24, `reviewTitle` ≤20, `reviewImage`, `clientComment` ≤32, `teamReply` ≤32, (+1 opcional) |
| `content-day-live-results` | Vívelo 2 · los resultados en vivo en Insights, Greenhouse y Teams | `deck.content-day.live-results` | proposal, brochure, pitch, qbr | Después de «Vívelo 1», o sola cuando la objeción es la reportería. | La cuenta no tiene Efeonce Insights ni panel de Greenhouse. | `decision-chart`, `content-day-tools` | `eyebrow` ≤26, `question` ≤16, `answer` ≤10, `body` ≤100, `panel`, `meeting` ≤40, `reportTitle` ≤36, `metrics` ≤18 |
| `decision-agenda` | Agenda · cinco temas y el que importa marcado | `deck.decision-agenda` | proposal, pitch, qbr | Después de la portada de una presentación en sala (propuesta, pitch, QBR). | En un brochure que se lee solo: no hay «hoy». | `section-classic` | `eyebrow` ≤16, `question` ≤24, `answer` ≤14, `items` ≤26, `highlightedItem`, `nav` |

### Método · `method` (10)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `triptych` | Tríptico · Escucha. Crea. Mide. | `deck.triptych` | proposal, brochure, pitch, qbr | Explicar el método o la forma de trabajo en tres pasos con fotos reales del equipo. | Con fotos horizontales recortadas a vertical: las tomas nacen 9:16. | `method-staircase`, `contact-sheet` | `question` ≤22, `words` ≤9, `panels` |
| `decision-plan` | Plan de 90 días · la trayectoria que sube en tres tramos | `deck.decision-plan` | proposal, pitch | Para responder «¿qué pasa al empezar?» con tramos y plazos concretos. | El plan tiene más de tres tramos o plazos no comprometidos. | `decision-next-steps`, `content-bullets` | `eyebrow` ≤20, `question` ≤26, `answer` ≤11, `body` ≤120, `horizon`, `stops` ≤84, `currentStop` |
| `method-hybrid-workforce` | Fuerza de trabajo híbrida · personas y agentes, la autoridad del agente por tramos | `deck.method-hybrid-workforce` | proposal, brochure, pitch | Explicar el modelo de fuerza de trabajo híbrida con su gobierno: qué puede hacer un agente en cada tramo | La lámina anterior o siguiente ya es otra versión de fuerza híbrida (escena o cine): se usa una sola de las tres por deck | `method-hybrid-workforce-scene`, `proposal-cinematic-nexa`, `method-staircase` | `eyebrow` ≤32, `question` ≤30, `answer` ≤20, `body` ≤150, `ladderTitle` ≤45, `ladder` ≤22, (+2 opcionales) |
| `method-staircase-flat` | Metodología BeX · la escalera tipográfica (variante plana) | `deck.method-staircase.flat` | proposal, brochure, pitch, qbr | Explicar un método por niveles cuando la lámina tiene que verse liviana o va impresa | El método es la imagen principal de la sección y se busca impacto: esa es la escalera de vidrio | `method-staircase`, `method-score-ring` | `eyebrow` ≤32, `question` ≤28, `answer` ≤18, `body` ≤110, `levels` ≤14, `note` ≤60, `selectedLevel`, `selectionLabel` ≤12 |
| `method-score-ring` | Brand Visibility Grader · el anillo del puntaje en siete dimensiones | `deck.method-score-ring` | proposal, brochure, pitch, qbr | Presentar el Brand Visibility Grader como puerta de entrada (diagnóstico sin costo) | Se quiere mostrar el puntaje REAL de un cliente: esta lámina muestra la composición del puntaje, no un resultado | `content-measure`, `method-staircase` | `eyebrow` ≤32, `question` ≤28, `answer` ≤8, `body` ≤135, `dimensions` ≤28, `total`, `cta` ≤22, `ctaUrl` ≤45 |
| `method-hybrid-workforce-scene` | Fuerza de trabajo híbrida · la escena: persona y agente sobre la misma pieza | `deck.method-hybrid-workforce.scene` | proposal, brochure, pitch | Mostrar la fuerza híbrida en una escena creíble de trabajo, con una persona real del oficio | El comité necesita ver los tramos de autoridad del agente: la versión gráfica | `method-hybrid-workforce`, `proposal-cinematic-nexa` | `eyebrow` ≤32, `question` ≤30, `answer` ≤20, `body` ≤120, `photo`, `selectionTargets` |
| `method-staircase` | Metodología BeX · la escalera de cinco peldaños de vidrio que se iluminan al subir | `deck.method-staircase` | proposal, brochure | Mostrar un método por niveles cuando la imagen es el propio método (BeX es el caso aprobado) | Los niveles no son una progresión real | `method-staircase-flat`, `method-score-ring` | `eyebrow` ≤32, `question` ≤28, `answer` ≤18, `body` ≤110, `levels` ≤14, `note` ≤60, `selectedLevel`, `selectionLabel` ≤12 |
| `proposal-cinematic-nexa` | Fuerza híbrida en cine · Nexa biónica con lentes en la partida, con sus agentes | `deck.proposal-cinematic.hero` | proposal, brochure | Abrir o cerrar el bloque de fuerza híbrida con impacto | Hay que explicar el gobierno del agente o vender pasos: esta composición no lleva prueba ni pasos | `method-hybrid-workforce`, `method-hybrid-workforce-scene` | `eyebrow` ≤32, `question` ≤26, `answer` ≤8, `body` ≤110, `photo` |
| `method-surround-cycle` | El método en ciclo · Surround Discovery: Medir, Crear, Distribuir, Optimizar | — | proposal, brochure, pitch | Explicar cómo trabajamos AEO/SEO después de mostrar el problema | El servicio es un proyecto de una vez | `method-staircase`, `decision-plan` | `eyebrow` ≤51, `question` ≤21, `answer` ≤8, `evidence` ≤161, `stations` ≤155, `coreLabel` ≤15, (+1 opcional) |
| `method-eeat` | E-E-A-T · cuatro letras de vidrio y lo que construimos en cada una | — | proposal, brochure, pitch | Explicar por qué el contenido y la autoridad importan para la IA | La audiencia ya domina E-E-A-T: pasar a la oferta | `method-surround-cycle` | `eyebrow` ≤51, `question` ≤43, `answer` ≤21, `evidence` ≤161, `meter` ≤24, `letters` ≤85 |

### Prueba · `proof` (12)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `content-focus` | Contenido · el foco sobre la prueba | `deck.content-focus` | proposal, pitch, qbr | Cuando el resultado se dice mejor como frase («A la primera.») y la cifra la respalda. | Sin una cifra con fuente que respalde la frase. | `content-measure`, `decision-testimonial` | `eyebrow` ≤28, `question` ≤44, `answer` ≤16, `proof` ≤6, `proofText` ≤70, `source` ≤60, `photo` |
| `content-clients` | Nuestros clientes · logos reales en un tono y dos pruebas gigantes | `deck.content-clients` | proposal, brochure, pitch | Como credencial en propuestas, pitches y brochures. | No hay autorización para mostrar un logo. | `decision-case`, `content-partners` | `eyebrow` ≤20, `question` ≤30, `answer` ≤16, `proofs` ≤50, `logos`, `markets` ≤45, `selectedProof`, `nav` |
| `content-partners` | Nuestros partners · los nueve programas que se pueden declarar | `deck.content-partners` | proposal, brochure, pitch | Como credencial técnica en propuestas y pitches. | Hay que mostrar las herramientas que se usan, no los programas de partner. | `content-stack`, `content-clients` | `eyebrow` ≤20, `question` ≤30, `answer` ≤18, `body` ≤80, `partners`, `selectedPartner`, `selectionLabel`, `nav` |
| `decision-risk` | Por qué es seguro · cada riesgo con su cobertura | `deck.decision-risk` | proposal, pitch | Para responder la objeción «¿y si no funciona?» antes de la cotización o justo después. | Una cobertura no se ofrece de verdad en este servicio (por ejemplo, no hay Sample Sprint disponible). | `decision-plan`, `decision-case` | `eyebrow` ≤24, `question` ≤22, `answer` ≤18, `body` ≤100, `rows` ≤100, `selectedRow`, `nav` |
| `decision-case` | Caso de éxito · Sky en 12 meses, con foto de ejemplo | `deck.decision-case` | proposal, brochure, pitch | Para demostrar con un caso publicado lo que se promete en la propuesta. | No hay foto real del caso: la de la referencia es sólo de ejemplo y no sale a una pieza final. | `decision-chart`, `decision-testimonial` | `clientLogo`, `eyebrow` ≤20, `question` ≤26, `answer` ≤11, `stats` ≤24, `source` ≤120, `photo`, `selectedStat` |
| `decision-chart` | Gráfico · el dato con su anotación | `deck.decision-chart` | proposal, brochure, pitch, qbr | Para mostrar un antes y después medido de un caso. | No hay línea base comparable. | `content-measure`, `decision-case` | `eyebrow` ≤30, `question` ≤24, `answer` ≤10, `body` ≤100, `bars` ≤14, `annotation` ≤7, `chartNote` ≤70, `kpis` ≤22, `source` ≤90, `nav` |
| `decision-testimonial` | Testimonio · la frase del cliente a escala de titular | `deck.decision-testimonial` | proposal, brochure, pitch | Hay una cita real, textual y publicada, con autorización del cliente. | La cita no es textual o no está autorizada. | `decision-case`, `content-clients` | `eyebrow` ≤28, `question` ≤34, `keyPhrase` ≤36, `fullQuote` ≤170, `clientLogo`, `author` ≤24, `proof` ≤24, `source` ≤90, `nav` |
| `decision-why-us` | Por qué elegirnos · un muro de seis cifras | `deck.decision-why-us` | proposal, brochure, pitch | Para responder «¿por qué ustedes?» con hechos citables. | Las cifras no tienen fuente. | `content-text`, `content-clients` | `eyebrow` ≤22, `question` ≤22, `answer` ≤9, `body` ≤100, `facts` ≤54, `source` ≤100, `selectedFact`, `nav` |
| `decision-ai-answer` | La respuesta de la IA · hoy tu marca no aparece, con AEO aparece primera | — | proposal, brochure, pitch | Abrir la sección AEO haciendo visible el problema antes de la oferta | Ya se mostró el informe real del diagnóstico del cliente: usar sus datos, no la muestra | `decision-diagnosis-map`, `decision-ai-market` | `eyebrow` ≤51, `question` ≤43, `answer` ≤24, `evidence` ≤161, `prompt` ≤86, `answerIntroToday` ≤57, `competitorsToday` ≤46, `answerIntroWithAeo` ≤66, `clientName` ≤40, `clientDescription` ≤114, `competitorsWithAeo` ≤46, `illustrativeMark` ≤62, (+1 opcional) |
| `decision-ai-market` | Contexto de mercado · tres cifras con su fuente sobre la órbita de luz | — | proposal, brochure, pitch, qbr | Abrir la conversación de SEO/AEO con el porqué ahora | No hay fuente verificable para alguna cifra: no se muestra sin fuente | `content-measure`, `decision-ai-answer` | `eyebrow` ≤51, `question` ≤43, `answer` ≤9, `evidence` ≤161, `figures` ≤124 |
| `decision-difference` | La diferencia · agencia commodity vs. método medible, y la objeción del equipo propio | — | proposal, brochure, pitch | El cliente compara con otras agencias o con hacerlo en casa | No hay comparación en juego: la lámina se lee defensiva | `decision-why-us`, `decision-risk` | `eyebrow` ≤51, `question` ≤43, `answer` ≤21, `evidence` ≤161, `alternativeTitle` ≤25, `rows` ≤88, `efeonceTitle` ≤23, `ownTeamTitle` ≤19, `ownTeamPillars` ≤49 |
| `decision-traffic-to-revenue` | Del tráfico al negocio · cuatro escalones hasta los ingresos | — | proposal, brochure, pitch, qbr | El cliente mide al proveedor por tráfico y hay que subir la conversación a negocio | No hay CRM ni medición de leads: no prometer el escalón que no se puede medir | `decision-chart` | `eyebrow` ≤51, `question` ≤43, `answer` ≤18, `evidence` ≤161, `steps` ≤102, `cutLabel` ≤68 |

### Propuesta por línea de servicio · `proposal-service` (10)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `proposal-service-aeo` | Propuesta AEO · sobria, con lente y cuatro formas de empezar (acento Engine) | `deck.proposal-service` | proposal, brochure | La propuesta AEO necesita que cada forma de empezar se explique con una frase (más datos que impacto) | La lámina tiene que golpear y recordarse: la versión cine hace ese trabajo | `proposal-cinematic-aeo`, `method-score-ring` | `eyebrow` ≤40, `question` ≤32, `answer` ≤14, `body` ≤140, `lensPhoto`, `steps` ≤90, (+1 opcional) |
| `proposal-service-creative` | Propuesta de servicios creativos · sobria, con lente y tres formas de comprar (acento Brand) | `deck.proposal-service` | proposal, brochure | La propuesta creativa necesita explicar cada modalidad (Sprint, Capacity, Studio) con su frase | La propuesta pide impacto visual: la versión cine de servicios creativos digitales | `proposal-cinematic-creative`, `content-pricing` | `eyebrow` ≤40, `question` ≤32, `answer` ≤14, `body` ≤140, `lensPhoto`, `steps` ≤90, (+1 opcional) |
| `proposal-service-web` | Propuesta web · sobria, con lente y cuatro formas de empezar (acento Engine) | `deck.proposal-service` | proposal, brochure | La propuesta web necesita explicar cada modalidad (Foundation, Conversion, Agent-Ready, Performance Ops) | La propuesta pide impacto: la versión cine con la web holográfica | `proposal-cinematic-web`, `content-pricing` | `eyebrow` ≤40, `question` ≤32, `answer` ≤14, `body` ≤140, `lensPhoto`, `steps` ≤90 |
| `proposal-service-revops` | Propuesta RevOps · sobria, con lente y cuatro formas de empezar (acento Revenue HubSpot) | `deck.proposal-service` | proposal, brochure | Propuesta de RevOps sobre HubSpot que necesita explicar cada etapa (evaluación, Blueprint, implementación, operación) | La propuesta pide impacto: la versión cine con el moño de luz | `proposal-cinematic-revops`, `method-hybrid-workforce` | `eyebrow` ≤40, `question` ≤32, `answer` ≤14, `body` ≤140, `lensPhoto`, `steps` ≤90, (+1 opcional) |
| `proposal-cinematic-creative` | Propuesta · servicios creativos digitales en cine: la directora dirige una órbita de pantallas | `deck.proposal-cinematic` | proposal, brochure | La propuesta creativa pide impacto (apertura de la sección de servicios creativos) | Hay que detallar cada modalidad con una frase: la versión sobria | `proposal-service-creative`, `content-pricing` | `eyebrow` ≤40, `question` ≤28, `answer` ≤10, `body` ≤140, `steps` ≤22, `photo`, (+1 opcional) |
| `proposal-cinematic-web` | Propuesta web en cine · una web holográfica que usan personas, buscadores y agentes | `deck.proposal-cinematic` | proposal, brochure | La propuesta web pide impacto | Hay que describir cada modalidad: la versión sobria | `proposal-service-web`, `proposal-cinematic-aeo` | `eyebrow` ≤40, `question` ≤28, `answer` ≤12, `body` ≤120, `steps` ≤20, `photo`, (+1 opcional) |
| `proposal-cinematic-aeo` | Propuesta AEO en cine · entre miles de marcas, la IA ilumina una | `deck.proposal-cinematic` | proposal, brochure | La propuesta AEO pide impacto | Hay que detallar cada forma de empezar: la versión sobria | `proposal-service-aeo`, `method-staircase` | `eyebrow` ≤40, `question` ≤26, `answer` ≤10, `body` ≤130, `steps` ≤20, `note` ≤70, `photo` |
| `proposal-cinematic-revops` | Propuesta RevOps en cine · un moño de luz (captar, cerrar, crecer) con agentes en el flujo | `deck.proposal-cinematic` | proposal, brochure | La propuesta de RevOps sobre HubSpot pide impacto | Hay que detallar cada etapa: la versión sobria | `proposal-service-revops`, `method-hybrid-workforce` | `eyebrow` ≤40, `question` ≤28, `answer` ≤11, `body` ≤125, `steps` ≤20, `photo` |
| `proposal-service-seo` | Propuesta SEO · sobria, con lente y cuatro formas de empezar (acento Engine) | `deck.proposal-service` | proposal, brochure | La propuesta AEO necesita que cada forma de empezar se explique con una frase (más datos que impacto) | La lámina tiene que golpear y recordarse: la versión cine hace ese trabajo | `proposal-cinematic-seo`, `proposal-service-aeo` | `eyebrow` ≤40, `question` ≤32, `answer` ≤14, `body` ≤140, `lensPhoto`, `steps` ≤90, (+1 opcional) |
| `proposal-cinematic-seo` | Propuesta SEO con punch · el mapa de luz del oficio y su núcleo | `deck.proposal-cinematic` | proposal, brochure | La propuesta AEO pide impacto | Hay que detallar cada forma de empezar: la versión sobria | `proposal-service-seo`, `proposal-cinematic-aeo` | `eyebrow` ≤40, `question` ≤26, `answer` ≤10, `body` ≤130, `steps` ≤20, `note` ≤70, `photo` |

### Cotización · `pricing` (3)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `content-pricing` | Cotización · tabla de tres planes con Pro recomendado | `deck.content-pricing` | proposal | En una propuesta, para presentar los planes de Greenhouse junto al fee del equipo. | En un brochure: los montos se definen en cada propuesta. | `content-pricing-live`, `content-pricing-stage` | `eyebrow` ≤16, `question` ≤24, `answer` ≤14, `body` ≤120, `plans` ≤40, `amounts`, `recommendedPlan` |
| `content-pricing-stage` | Cotización en escena · los tres planes en 3D con Pro al frente | `deck.content-pricing.stage` | proposal | En una propuesta presentada en sala, cuando la cotización necesita el mismo impacto que el resto del deck. | En un brochure. | `content-pricing`, `content-pricing-live` | `eyebrow` ≤16, `question` ≤24, `answer` ≤14, `body` ≤90, `plans` ≤32, `amounts`, `recommendedPlan` |
| `content-pricing-live` | Cotización en vivo · cada línea a la vista y el cursor en «Aprobar propuesta» | `deck.content-pricing.live` | proposal | En una propuesta con alcance acordado y una cotización única. | El alcance no está acordado o hay que comparar planes. | `content-pricing`, `content-pricing-stage` | `eyebrow` ≤16, `question` ≤22, `answer` ≤16, `body` ≤110, `quoteTitle` ≤20, `lineItems` ≤48, `total` |

### Próximos pasos · `next-steps` (2)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `decision-next-steps` | Próximos pasos · la agenda del diagnóstico abierta y el cursor en «Agenda un diagnóstico» | `deck.decision-next-steps` | pitch, brochure, proposal | Al final de un pitch o de un brochure, para convertir el interés en una reunión. | En una propuesta enviada después del diagnóstico: ese paso ya ocurrió y el gesto es aprobar. | `content-pricing-live` | `eyebrow` ≤20, `question` ≤22, `answer` ≤10, `body` ≤60, `cardDescriptor` ≤100, `days`, `times`, `chosenSlot`, `nextSteps` ≤70 |
| `decision-diagnosis-map` | Qué entrega el diagnóstico · el informe abierto con sus cuatro entregables | — | proposal, brochure, pitch | Cerrar una propuesta o brochure AEO con el primer paso tangible | Ya se hizo el diagnóstico: mostrar el real del cliente | `decision-next-steps` | `eyebrow` ≤51, `question` ≤43, `answer` ≤8, `evidence` ≤161, `reportTitle` ≤38, `engineScores` ≤13, `shareOfVoice` ≤25, `lostPrompts` ≤50, `plan` ≤45, `sampleMark` ≤16, `expertNote` ≤92 |

### Respiro · `breather` (1)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `breather` | Respiro · foto a sangre y sólo la voz | `deck.breather` | proposal, pitch, qbr | Después de dos o tres láminas densas, para bajar el ritmo sin perder el hilo. | Si la lámina tiene que probar algo: un respiro no lleva cifra ni fuente. | `content-focus`, `section-bleed` | `section`, `question` ≤24, `answer` ≤12, `photo` |

### Familias de AXIS citadas como alternativa (fuera del catálogo)

| id | Qué es |
|---|---|
| `cover-classic` | portada clásica AXIS (deckSlideHtml cover) |
| `close-classic` | cierre clásico AXIS (deckSlideHtml close) |
| `proposal-cinematic` | familia de recetas de propuesta cine en AXIS (layouts service/hero/lines) |
| `section-cine` | familia de secciones con foto cine en AXIS (layouts services/team) |
| `cover-brochure` | familia de portadas de brochure en AXIS |

<!-- deck-recipes-index:end -->
