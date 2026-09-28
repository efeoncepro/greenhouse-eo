# Componer un deck con las recetas por lámina — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.2
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude (1.2: TASK-1928 — 68 de 69 recetas con plantilla; ya no hay maquetas declaradas; cómo componer cualquier receta desde su intent de ejemplo, largos que hace cumplir el compositor, cifras con fuente, `[MONTO]` y selección. Antes, 1.1: flujo tras el cierre de TASK-1927 — 31 recetas con plantilla, intent propio, documento completo, cómo cambiar la foto, el copy o la sección)
> **Modulo:** Creative · marca propia de Efeonce (línea gráfica «La órbita»)
> **Ruta en portal:** no aplica — se arma con el catálogo de recetas, comandos locales y el Artifact Composer (la ruta productiva gobernada es TASK-1921, pendiente)
> **Documentacion relacionada:** [Catálogo de recetas por lámina](../../operations/brand-graphic-line/deck-recipes/README.md) · [Norma de composición por superficie §4.6](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) · [Documentación funcional](../../documentation/creative/linea-grafica-efeonce.md) · [Componer una pieza por superficie con AXIS](./componer-por-superficie-con-axis.md) · [Registro cine](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md)

## Para qué sirve

Para armar un deck real de la marca Efeonce —un **brochure**, una **propuesta comercial**, un **pitch** o un **QBR**—
con las **69 láminas aprobadas** el 2026-09-27, en vez de diseñar cada lámina desde cero. Cada lámina tiene una
**receta** en el catálogo: qué comunica, cuándo usarla, cuándo no y cuál conviene en su lugar, con qué otras va, qué
textos e imágenes se cambian (los *slots*) y qué queda fijo.

Sirve para el equipo creativo, comercial y para los agentes (Claude, Codex). No sirve para decks con la marca de un
cliente, para las ofertas a comité del catálogo `deck-axis` ni para la interfaz de Greenhouse.

## Antes de empezar

- **Ten claro el documento y su lector:** ¿se envía y se lee solo (brochure, propuesta) o se presenta en sala (pitch,
  QBR)? Cambia la densidad y qué variante elegir.
- **Abre el catálogo:** [`deck-recipes/README.md`](../../operations/brand-graphic-line/deck-recipes/README.md). Trae la
  tabla por documento, el índice por familia y los pendientes de QA. El detalle de cada receta está en
  `EFEONCE_DECK_SLIDE_RECIPES_V1.json`, en la misma carpeta.
- **Mira la referencia aprobada** de cada lámina en la página «Deck» del
  [canvas por superficie](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7) o en el Lab de AXIS
  (`references/surfaces/deck/<id>.jpg`).
- **Carga las skills:** `deck-studio` (el oficio del deck), `efeonce-graphic-line` (la línea), `copywriting` (la voz
  pregunta–respuesta) y `design-studio` si hay que pedir una foto nueva.
- **Reúne los datos reales:** nombre y logo del cliente (versión para fondo oscuro, en SVG o PNG), cifras **con su
  fuente** (sin fuente, la lámina no sale), fotos reales del caso si vas a usar el caso de éxito. Los montos no se
  escriben: la cotización imprime `[MONTO]` hasta la propuesta final.
- **Ten las fotos en disco.** Los plates viven fuera de git, bajo `ai-generations/`. Si el archivo que cita el intent
  no está, el comando falla antes de crear la salida.
- **Crea una carpeta de trabajo para tus intents**, fuera de `src/lib/brand-surfaces/examples/`. Esa carpeta es de
  los ejemplos y está vigilada por una prueba: no se editan ni se agregan ahí los intents de una pieza.

## El flujo en cinco pasos

1. Elige la lámina en el catálogo de 69 recetas.
2. Busca su intent de ejemplo: **68 de 69** recetas tienen plantilla y un ejemplo listo para copiar. La única sin
   plantilla es `cover-brochure-cine-lines-selection`, que se compone como `cover-brochure-cine-lines` sin la
   selección.
3. Copia el ejemplo a tu carpeta y cambia el copy, las cifras y las fotos.
4. Compón la lámina o el documento completo con `pnpm brand:compose`.
5. Revisa a ojo contra la referencia aprobada.

El paso a paso de abajo los detalla.

## Paso a paso

### Paso 1 · Elige el documento, su portada y su contraportada

| Documento | Portada | Contraportada |
|---|---|---|
| Propuesta comercial | **sin foto**, con el logo del cliente dentro de la órbita: `cover-proposal-orbit` o `cover-proposal-dawn` | **con foto** y «Empower your Growth»: `close-proposal-horizon` o `close-proposal-dawn` |
| Brochure | **con foto**: `cover-brochure-cine-orbit`, `cover-brochure-cine-lines`, `cover-brochure-cine-team` o la de una línea (`cover-brochure-line-*`) | **sin foto**: `close-brochure-orbit` («¿Conversamos? Cuando quieras.») |
| Pitch / QBR | no hay portada aprobada: pregúntale al operador | no hay cierre aprobado: pregúntale al operador |

La portada y el cierre clásicos de AXIS (`cover-classic`, `close-classic`) **no se usan**: el operador no los aprobó
y no tienen plantilla, aunque el catálogo todavía los cite como alternativa. La portada
`cover-brochure-cine-lines-selection` está aprobada como lámina, pero al componerla sale sin la selección (el contrato
no la admite en esa portada).

Regla que no se discute: **si la portada lleva foto, la contraportada no, y al revés.** El eslogan nunca va en la
portada.

### Paso 2 · Arma el esqueleto por familias

Escribe la secuencia antes de elegir láminas. Esqueletos de partida (ajústalos al caso):

- **Propuesta:** portada → agenda → sección → contexto → página del servicio → método → prueba → equipo → riesgo →
  cotización → contraportada.
- **Brochure:** portada → quiénes somos → por qué lo hacemos → sección de servicios → páginas de servicio → cómo
  trabajamos → equipo → prueba → próximos pasos → contraportada.
- **Pitch:** portada → agenda → sección → texto → método → prueba → próximos pasos → cierre.
- **QBR:** portada → agenda → sección → resultados → método → respiro → cierre.

### Paso 3 · Elige la receta de cada tramo

En el índice del catálogo, busca la familia del tramo y lee **«Cuándo sí»** y **«Cuándo no»**. Si la receta no
calza, su columna **«Alternativa»** dice cuál usar. Para ver la receta completa:

```bash
node -e 'const j=require("./docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json");
console.log(JSON.stringify(j.recipes.find(r => r.id === "content-pricing-live"), null, 2))'
```

Criterios rápidos:

- **Sala o lectura:** para impacto en sala, la versión en escena o en vivo (`content-pricing-stage`,
  `content-day-live-*`, `method-staircase`, `proposal-cinematic-*`); para lectura atenta, la sobria (`content-pricing`,
  `content-day`, `method-staircase-flat`, `proposal-service-*`).
- **Cotización (sólo propuesta):** tabla (`content-pricing`) para comparar planes; en escena (`content-pricing-stage`)
  para empujar el recomendado en sala; en vivo (`content-pricing-live`) cuando el alcance está acordado y el gesto es
  aprobar.
- **Próximos pasos** (`decision-next-steps`, la agenda del diagnóstico abierta): al final de un brochure o un pitch.
  En una propuesta enviada después del diagnóstico no va.
- **Día a día:** `content-day` (cuatro momentos) como base; `content-day-tools` si preguntan con qué herramientas;
  los dos «vívelo» (`content-day-live-progress`, `content-day-live-results`) para que el cliente viva la aprobación y
  los resultados.

### Paso 4 · Revisa pares y ritmo

- **`cover↔close`:** la portada y la contraportada deben ser pareja del mismo documento.
- **`variant`:** se elige una; nunca dos variantes seguidas (por ejemplo, la tabla y la escena de cotización).
- **`sequence`:** van una después de la otra (quiénes somos → por qué lo hacemos; sección de servicios → página de
  servicio).
- **Ritmo:** alterna papel y oscuro; no pongas dos secciones partidas con la misma esquina seguidas; no repitas el
  mismo plate en el mismo deck.

### Paso 5 · Llena los slots

Cada receta lista sus slots con tipo, si es obligatorio y su **largo máximo medido** (`maxChars`). El compositor hace
cumplir ese mismo largo: una prueba compara cada receta con su plantilla, así que el `maxChars` del catálogo es el que
vale. Reglas:

- **Voz:** la pregunta es real del cliente; la respuesta, de una a tres palabras (en el testimonio, la cita del
  cliente, hasta seis), se escribe **sin punto** (el punto lo pone la esfera); la evidencia lleva **una** palabra en
  negrita. La plantilla ya dibuja la respuesta al menos 3× la pregunta.
- **Si un texto no cabe, se acorta.** Si pasa el `maxChars`, la lámina no sale y el mensaje nombra el slot. No se
  mueve la órbita ni la foto.
- **Cifras** siempre con su fuente, en `figures` (valor, rótulo y fuente): la lámina imprime «Fuente: …». Sin fuente,
  AXIS rechaza la pieza.
- **Montos:** no se escriben. La cotización imprime siempre `[MONTO]`.
- **Contacto:** no se escribe. Sale de los datos de Efeonce (`EFEONCE_CONTACT`).
- **Logos** sólo de clientes que autorizan su uso. El compositor los deja en un tono y con el mismo peso.
- **Fotos de ejemplo** (el caso Sky, las piezas dentro de las interfaces del «vívelo») se reemplazan antes de enviar.

### Paso 6 · Resuelve las fotos

La receta trae el plate aprobado, su ficha, el prompt compilado y el post-proceso. Si cambias la foto, pide una nueva
**por ficha** (`pnpm foto:prompt` → `pnpm foto:generar` → `pnpm foto:validar`) y revisa el emblema de la ropa con
`pnpm foto:emblema`; si difiere del oficial, se compone con `pnpm foto:isotipo`. El estilo de cine sólo va con Nexa
protagonista, en las propuestas de cine y en las láminas de sección y «quiénes somos».

### Paso 7 · Busca la receta y su intent de ejemplo

1. Abre el índice del [catálogo](../../operations/brand-graphic-line/deck-recipes/README.md#índice) y confirma en la
   columna «Plantilla» que la receta la tiene (68 de 69 la tienen).
2. Busca su intent de ejemplo. En casi todas se llama
   `src/lib/brand-surfaces/examples/deck-<id del catálogo>-intent.json` (por ejemplo,
   `deck-content-pricing-live-intent.json`). Las excepciones (páginas de servicio de cine, que están dentro de los
   documentos de ejemplo) salen en la tabla «Dos nombres para la misma lámina» del
   [catálogo](../../operations/brand-graphic-line/deck-recipes/README.md#qué-sale-hoy-con-un-comando).
3. Anota la **receta de AXIS** y el **`layout`** que trae el ejemplo. El nombre cambia entre el catálogo y el intent:

   | Lámina del catálogo | Receta del intent | `layout` |
   |---|---|---|
   | `section-split-corner-bottom` | `section-split` | `corner-bottom` |
   | `cover-brochure-line-voice` | `cover-brochure` (con `line: "voice"`) | `line` |
   | `content-pricing-stage` | `content-pricing` | `stage` |
   | `method-staircase-flat` | `method-staircase` | `flat` |
   | `section-cine-about` | `section-cine` | `about` |
   | `content-day-live-results` | `content-day` | `live-results` |
   | `proposal-service-creative` | `proposal-service` (con `line: "brand"`) | — |

   La tabla completa, receta por receta, está en el catálogo («Dos nombres para la misma lámina» y «Las recetas de
   TASK-1928»).

La única receta sin plantilla es `cover-brochure-cine-lines-selection`: el contrato de AXIS no admite selección en esa
portada. Compónla como `cover-brochure-cine-lines` y di en la entrega que sale sin la selección.

### Paso 8 · Escribe el intent

1. Copia el intent de ejemplo de la lámina a tu carpeta de trabajo. No edites el ejemplo.

   ```bash
   mkdir -p <tu-carpeta>
   cp src/lib/brand-surfaces/examples/deck-section-split-corner-bottom-intent.json <tu-carpeta>/seccion-2-intent.json
   ```

2. Cambia el contenido en tu copia:

   | Qué cambias | Campo |
   |---|---|
   | La foto | `photo.plateRef` (ruta del archivo) y `photo.alt` (describe la escena, no el copy) |
   | El copy | `voice` (eyebrow, pregunta, respuesta), `body` y los campos propios de la receta (por ejemplo `quote` en la cotización, `moments` en el día a día) |
   | Las cifras | `figures`: `value`, `label` y `source` (la fuente es obligatoria) |
   | El ítem marcado por la selección | `selected`: el número del ítem, desde 1 |
   | La sección | `progress` (sección n de N) |
   | El uso | `use`: `proposal` o `brochure` |
   | El logo del cliente (portadas de propuesta) | `clientLogo`: `path` (SVG o PNG) y `alt` |
   | El alto de la columna (portadas con columna) | `column.topPx` |

3. Respeta los largos: cada texto dentro del `maxChars` de su slot en el catálogo.
4. No agregues montos ni datos de contacto: la plantilla los pone.
5. Deja el `layout` escrito, aunque sea el que va por defecto.

La plantilla no se toca: si una lámina necesita otra disposición, se cambia de `layout` o de receta.

### Paso 9 · Compón

Una lámina:

```bash
pnpm brand:compose -- --intent <tu-carpeta>/seccion-2-intent.json
```

Un documento completo (brochure o propuesta): un intent con `pages`, donde cada página es un intent que puede omitir
lo que el documento ya declara (`format`, `use`, `line`, `sections`). Parte de
`src/lib/brand-surfaces/examples/deck-brochure-document.json` (nueve páginas) o de `deck-proposal-document.json`
(siete páginas interiores), copiado a tu carpeta.

```bash
pnpm brand:compose -- --intent <tu-carpeta>/brochure.json --artifact-id brochure-servicios
```

La salida queda en `.captures/brand-surfaces/<id>/` (o en la carpeta que pases con `--out`): un solo PDF 16:9 de
varias páginas, el manifest del documento, la procedencia (qué intent, qué fotos y qué versiones de AXIS se usaron) y
un PNG y un PDF por página.

Si el documento tiene un solo problema, **no sale ninguna página**. El mensaje trae el código de AXIS que lo explica
(tabla de «Problemas comunes»).

### Paso 10 · Revisa y entrega

Mira cada lámina en el píxel final contra su referencia aprobada y contra los **pendientes de QA** del catálogo. La
prueba visual automática cubre las plantillas con sus datos de prueba, no tu pieza: tu pieza se revisa a ojo. Si usaste
`cover-brochure-cine-lines-selection`, dilo en la entrega: sale sin la selección. Componer no aprueba ni publica: la
aprobación es del operador.

## Cambiar la foto, el copy o la sección de una lámina

El contenido de una lámina es un dato del intent. Para cambiarlo:

1. Abre **tu** intent (no el ejemplo).
2. Cambia el campo: `photo.plateRef` y `photo.alt` para la foto; `voice` y `body` para el copy; `progress` para la
   sección.
3. Vuelve a componer con `pnpm brand:compose -- --intent <tu-intent>.json`.
4. Mira el resultado contra la referencia.

Qué cuidar al cambiar la foto:

| Cuidado | Por qué |
|---|---|
| Escribe `photo.alt` | es obligatorio; sin él falla con `missing-photo` |
| Confirma que el archivo existe | los plates viven fuera de git; sin el archivo, el comando falla antes de crear la salida |
| Mira el recorte | la foto se ajusta al área de la lámina cubriéndola y **centrada**. En la sección partida la franja de foto mide 1.260 × 1.080 px sobre un lienzo de 1.920 × 1.080; en las láminas a sangre, el lienzo completo. Las recetas que lo admiten (por ejemplo, la lente del día a día) aceptan `photo.focus` para dirigir el recorte hacia un punto del archivo |
| En la sección partida, elige bien el encuadre | esa lámina no tiene control de foco: si el sujeto queda cortado, usa otra foto |
| En el panel a la derecha (`panel-end`), revisa textos y logos | la foto va **espejada**: un texto legible o un logo saldrían al revés. Revisa también el isotipo del uniforme |
| En portadas con columna, revisa `column.topPx` | se elige según dónde queda el sujeto |

Qué **no** cambia: el panel, la esquina curva, el indicador de sección y la columna de voz. Eso lo fija el `layout`.

## Qué significan los estados

| Estado | Qué significa |
|---|---|
| **aprobado** | la lámina está aprobada por el operador (hoy, las 69) y se puede usar |
| **con plantilla** | además, `pnpm brand:compose` la produce entera (68 de 69) |
| **compone sin selección** | `cover-brochure-cine-lines-selection`: aprobada, pero el contrato no admite la selección en esa portada; se compone como `cover-brochure-cine-lines` y se dice en la entrega |
| **pendiente de QA** | la referencia aprobada tenía un detalle que la norma corrige (respuesta bajo 3×, acento en texto chico, cifra sin fuente). La plantilla ya lo corrige; el catálogo separa los resueltos de los que siguen abiertos |
| `recipe-not-approved` | el contrato de AXIS no tiene esa receta como aprobada |
| `recipe-without-template` | la receta está aprobada en AXIS, pero el composer no tiene plantilla para ella. En el deck no debería pasar: revisa que la receta y el `layout` sean los del ejemplo |
| `surface-issues` | AXIS rechazó el intent; el mensaje lista los códigos (por ejemplo, `figure-source-required`) |
| `invalid-intent` | un dato del intent no calza con la receta (una selección fuera de rango, una hora inválida, `column.topPx` fuera de la reserva) |

## Qué no hacer

- **No inventes una lámina** si hay una receta que la cubre; si ninguna sirve, pídesela al operador.
- **No mezcles** láminas de «La órbita» con el catálogo `deck-axis` de las ofertas a comité.
- **No uses** `decision-next-steps` en una propuesta enviada después del diagnóstico, ni cotización en un brochure.
- **No pongas** el eslogan en la portada ni «¿Conversamos?» en la contraportada de una propuesta.
- **No inventes cifras ni fuentes**; no pongas montos reales antes de la propuesta.
- **No escribas montos ni datos de contacto** en el intent para «ganarle» a la plantilla: los montos salen como
  `[MONTO]` y el contacto, de `EFEONCE_CONTACT`.
- **No subas un `maxChars`** ni toques un `slots.json` para que entre un texto largo: acorta el texto.
- **No uses la foto de ejemplo** del caso Sky ni el isotipo que dibuja el modelo en una prenda.
- **No pongas texto** sobre la órbita ni sobre la persona de la foto.
- **No uses** el mismo plate dos veces en el mismo deck (P1 aparece en varias recetas).
- **No edites una plantilla** (HTML, `slots.json` o builder) para que una pieza salga distinta: el contenido va en el
  intent.
- **No edites ni guardes intents** en `src/lib/brand-surfaces/examples/`.
- **No uses** `cover-classic` ni `close-classic`.
- **No armes un documento página por página** para esquivar un error de validación: corrige el documento.

## Problemas comunes

| Síntoma | Causa | Qué hacer |
|---|---|---|
| La lámina no sale y el mensaje dice que un texto excede el máximo (`too_long` o `item_too_long`) y nombra el slot | ese texto pasa el `maxChars` de la receta; el compositor no recorta | acorta el texto de ese slot («¿Qué hacemos por tu marca?» → «¿Qué hace Efeonce?») |
| Falla con `surface-issues` y el código `figure-source-required` | una cifra de `figures` no trae `source` | agrega la fuente real o quita la cifra; nunca inventes una fuente |
| Falla con `invalid-intent` y dice que `selected` va de 1 a N | el ítem seleccionado está fuera del rango de ítems de la lámina | usa un número entre 1 y la cantidad de ítems; la composición falla cerrado, no elige otro |
| La portada y la contraportada llevan foto las dos | se eligieron sin mirar el par `cover↔close` | cambia una por su pareja sin foto |
| `pnpm brand:compose` falla con `recipe-not-approved` o `recipe-without-template` | el intent pide una receta o un `layout` que no es el del ejemplo (por ejemplo, el id del catálogo en vez de la receta de AXIS) | copia `recipe` y `layout` del intent de ejemplo de la lámina |
| Falla con `missing-photo` | falta `photo.plateRef` o `photo.alt` | agrega la ruta del plate y un `alt` que describa la escena |
| Dice que no encuentra el plate | el archivo no está en disco (los plates viven fuera de git) | genera o copia el plate a la ruta que cita el intent |
| Falla con `invalid-intent` en una portada | `column.topPx` cae fuera de la reserva del logo | elige un valor dentro del rango que indica el mensaje, o quita el campo para usar el valor por defecto |
| El sujeto sale cortado en la sección partida | el recorte es centrado y esa lámina no tiene control de foco | usa una foto con otro encuadre |
| Un texto o un logo de la foto sale al revés | la composición `panel-end` espeja la foto | usa una foto sin texto legible ni logo, o cambia a `corner-top` o `corner-bottom` |
| El sujeto queda tapado por la columna de voz en una portada | `column.topPx` se eligió para otra foto | ajústalo mirando dónde queda el sujeto |
| El tríptico falla | una toma trae más de una palabra | una palabra por toma; cada una lleva su esfera |
| La portada de propuesta muestra «Logo del cliente» | el intent no trae `clientLogo` | agrega `clientLogo` con `path` y `alt` |
| El documento no produce ninguna página | un solo problema deja el documento sin componer | lee el código: `brochure-cover-first` (la portada va primero), `brochure-close-last` (el cierre va al final), `brochure-needs-service-page` (falta una página de servicio), `document-line-mismatch` (portada y cierre llevan la línea del documento), `frame-photo-must-alternate` (portada y contraportada no pueden llevar foto las dos), `page[i]:<código>` (el problema está en esa página) |
| La prueba de ejemplos falla después de tu cambio | editaste o agregaste un intent en `src/lib/brand-surfaces/examples/` | deja los ejemplos como estaban y guarda tu intent en tu carpeta |
| La lámina se ve distinta de la referencia aprobada en una etiqueta chica, el tamaño de la respuesta, la fuente de una cifra, el logo de una sección con foto o el velo de «quiénes somos» | la plantilla aplica la norma sobre la referencia (D1, 3×, fuentes visibles, sin logo ni velo en láminas interiores con foto) | es lo esperado; la decisión de cada caso está en «Pendientes de QA» del catálogo |
| La lámina «quiénes somos» se ve con un velo oscuro | el velo viene horneado en el plate, no de la plantilla | pide el plate con la reserva izquierda, sin velo |

## Referencias técnicas

- Catálogo y su índice: `docs/operations/brand-graphic-line/deck-recipes/` (`README.md` y
  `EFEONCE_DECK_SLIDE_RECIPES_V1.json`, esquema `efeonce.deck-slide-recipes.v1`); se valida y regenera con
  `pnpm brand:deck-recipes` (`scripts/creative/deck-recipes/render-index.mjs`).
- Norma: [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md)
  §3, §4.6 (reglas del deck, portadas y contraportadas, recetas por lámina) y §6.
- Foto: [registro cine](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) (incluida la excepción
  para secciones y «about») y los comandos `pnpm foto:*`.
- Plantillas: catálogo `graphic-line-deck` del Artifact Composer
  (`src/lib/artifact-composer/catalogs/graphic-line-deck/`, con `registry.json` y `recipe-map.json`), builders en
  `src/lib/brand-surfaces/recipes/` (documento: `src/lib/brand-surfaces/document.ts`), intents de ejemplo en
  `src/lib/brand-surfaces/examples/`, comando `pnpm brand:compose` (`scripts/brand-surfaces/compose.ts`). Contrato
  `efeonce.surface-composition` 0.1.2 (`axis-tokens` 0.3.20, `axis-ui-contracts` 0.3.18); un intent 0.1.0 o 0.1.1
  resuelve igual.
- Paridad de slots receta ↔ plantilla: `src/lib/brand-surfaces/__tests__/recipe-slot-parity.test.ts`.
- Tasks: TASK-1927 (31 recetas: el marco, secciones clásica y partida, medida, tríptico, escalera y propuestas de
  cine; `complete`); TASK-1928 (las 38 restantes; en `develop` local, push pendiente); ruta productiva gobernada,
  TASK-1921; fotos idempotentes, TASK-1926.
- Prueba visual de las plantillas: `pnpm composer:visual-gate --catalog=graphic-line` (66 frames).
- Skills: `deck-studio`, `efeonce-graphic-line`, `copywriting`, `design-studio`.
