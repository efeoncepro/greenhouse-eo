# Componer un deck con las recetas por lámina — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude (1.1: flujo tras el cierre de TASK-1927 — 31 recetas con plantilla, intent propio, documento completo, cómo cambiar la foto, el copy o la sección)
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
  fuente**, montos (se escriben `[MONTO]` hasta la propuesta final), fotos reales del caso si vas a usar el caso de
  éxito.
- **Ten las fotos en disco.** Los plates viven fuera de git, bajo `ai-generations/`. Si el archivo que cita el intent
  no está, el comando falla antes de crear la salida.
- **Crea una carpeta de trabajo para tus intents**, fuera de `src/lib/brand-surfaces/examples/`. Esa carpeta es de
  los ejemplos y está vigilada por una prueba: no se editan ni se agregan ahí los intents de una pieza.

## El flujo en cinco pasos

1. Elige la lámina en el catálogo de 69 recetas.
2. Mira si tiene plantilla: 31 de 69 la tienen (lista por receta y `layout` en el
   [catálogo](../../operations/brand-graphic-line/deck-recipes/README.md#qué-sale-hoy-con-un-comando)). Las otras 38
   son TASK-1928.
3. Escribe el intent en un archivo propio.
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

Cada receta lista sus slots con tipo, si es obligatorio y su **largo máximo medido** (`maxChars`). Reglas:

- **Voz:** la pregunta es real del cliente; la respuesta, de una a tres palabras, se escribe **sin punto** (el punto
  lo pone la esfera) y mide al menos 3× la pregunta; la evidencia lleva **una** palabra en negrita.
- **Si un texto no cabe, se acorta.** No se mueve la órbita ni la foto.
- **Montos** como `[MONTO]`; **cifras** con su fuente en la lámina; **logos** sólo de clientes que autorizan su uso.
- **Fotos de ejemplo** (el caso Sky, las piezas dentro de las interfaces del «vívelo») se reemplazan antes de enviar.

### Paso 6 · Resuelve las fotos

La receta trae el plate aprobado, su ficha, el prompt compilado y el post-proceso. Si cambias la foto, pide una nueva
**por ficha** (`pnpm foto:prompt` → `pnpm foto:generar` → `pnpm foto:validar`) y revisa el emblema de la ropa con
`pnpm foto:emblema`; si difiere del oficial, se compone con `pnpm foto:isotipo`. El estilo de cine sólo va con Nexa
protagonista, en las propuestas de cine y en las láminas de sección y «quiénes somos».

### Paso 7 · Mira si la lámina tiene plantilla

Busca el id de la lámina en la tabla «Dos nombres para la misma lámina» del
[catálogo](../../operations/brand-graphic-line/deck-recipes/README.md#qué-sale-hoy-con-un-comando). Ahí está la receta
de AXIS, el `layout` y el intent de ejemplo de cada una de las 31 que tienen plantilla.

| Si la receta… | Haz esto |
|---|---|
| tiene plantilla (31 de 69) | escribe el intent (paso 8) y compón con `pnpm brand:compose` (paso 9) |
| no tiene plantilla (38, TASK-1928) | arma la lámina como **maqueta de dirección declarada**, siguiendo `prompts.composition` y la referencia aprobada |

El nombre cambia entre el catálogo y el intent: la lámina `section-split-corner-bottom` se pide como receta
`section-split` con `layout: "corner-bottom"`; la lámina `cover-brochure-line-voice`, como receta `cover-brochure` con
`layout: "line"` y la línea `voice`.

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
   | El copy | `voice` (eyebrow, pregunta, respuesta) y `body` |
   | La sección | `progress` (sección n de N) |
   | El uso | `use`: `proposal` o `brochure` |
   | El logo del cliente (portadas de propuesta) | `clientLogo`: `path` (SVG o PNG) y `alt` |
   | El alto de la columna (portadas con columna) | `column.topPx` |

3. Deja el `layout` escrito, aunque sea el que va por defecto.

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

Si tu deck mezcla láminas con plantilla y maquetas declaradas, une todo en **un solo PDF** 16:9.

### Paso 10 · Revisa y entrega

Mira cada lámina en el píxel final contra su referencia aprobada y contra los **pendientes de QA** del catálogo. La
prueba visual automática cubre las plantillas con sus datos de prueba, no tu pieza: tu pieza se revisa a ojo. En la
entrega, di qué láminas salieron de plantilla y cuáles son maqueta declarada. Componer no aprueba ni publica: la
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
| Mira el recorte | la foto se ajusta al área de la lámina cubriéndola y **centrada**. En la sección partida la franja de foto mide 1.260 × 1.080 px sobre un lienzo de 1.920 × 1.080; en las láminas a sangre, el lienzo completo |
| En la sección partida, elige bien el encuadre | esa lámina no tiene control de foco: si el sujeto queda cortado, usa otra foto |
| En el panel a la derecha (`panel-end`), revisa textos y logos | la foto va **espejada**: un texto legible o un logo saldrían al revés. Revisa también el isotipo del uniforme |
| En portadas con columna, revisa `column.topPx` | se elige según dónde queda el sujeto |

Qué **no** cambia: el panel, la esquina curva, el indicador de sección y la columna de voz. Eso lo fija el `layout`.

## Qué significan los estados

| Estado | Qué significa |
|---|---|
| **aprobado** | la lámina está aprobada por el operador (hoy, las 69) y se puede usar |
| **con plantilla** | además, `pnpm brand:compose` la produce entera (31 de 69) |
| **maqueta declarada** | aprobada pero sin plantilla todavía (38 recetas, TASK-1928): se arma a mano siguiendo la receta y se dice en la entrega |
| **pendiente de QA** | la referencia aprobada tiene un detalle que la plantilla corrige (respuesta bajo 3×, acento en texto chico, cifra sin fuente); no bloquea el uso. El catálogo separa los resueltos de los abiertos |
| `recipe-not-approved` | el contrato de AXIS no tiene esa receta como aprobada |
| `recipe-without-template` | la receta está aprobada en AXIS, pero el composer todavía no tiene plantilla para ella |

## Qué no hacer

- **No inventes una lámina** si hay una receta que la cubre; si ninguna sirve, pídesela al operador.
- **No mezcles** láminas de «La órbita» con el catálogo `deck-axis` de las ofertas a comité.
- **No uses** `decision-next-steps` en una propuesta enviada después del diagnóstico, ni cotización en un brochure.
- **No pongas** el eslogan en la portada ni «¿Conversamos?» en la contraportada de una propuesta.
- **No inventes cifras ni fuentes**; no pongas montos reales antes de la propuesta.
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
| La pregunta cruza la órbita o una mano | el texto supera el `maxChars` medido | acorta la frase («¿Qué hacemos por tu marca?» → «¿Qué hace Efeonce?») |
| La portada y la contraportada llevan foto las dos | se eligieron sin mirar el par `cover↔close` | cambia una por su pareja sin foto |
| `pnpm brand:compose` falla con `recipe-not-approved` o `recipe-without-template` | la receta no está aprobada en AXIS o todavía no tiene plantilla | ármala como maqueta declarada (las 38 sin plantilla son TASK-1928) |
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
| Una cifra no tiene fuente | la referencia aprobada la mostraba sin fuente | agrega la fuente real o quita la cifra |
| La etiqueta chica sale en color de acento | pendiente de QA D1 | llévala a blanco (oscuro) o navy (papel) |
| La lámina «quiénes somos» se ve con un velo oscuro | el plate se compuso con un degradado | pide el plate con la reserva izquierda, sin velo |

## Referencias técnicas

- Catálogo y su índice: `docs/operations/brand-graphic-line/deck-recipes/` (`README.md` y
  `EFEONCE_DECK_SLIDE_RECIPES_V1.json`, esquema `efeonce.deck-slide-recipes.v1`); se valida y regenera con
  `pnpm brand:deck-recipes` (`scripts/creative/deck-recipes/render-index.mjs`).
- Norma: [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md)
  §3, §4.6 (reglas del deck, portadas y contraportadas, recetas por lámina) y §6.
- Foto: [registro cine](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) (incluida la excepción
  para secciones y «about») y los comandos `pnpm foto:*`.
- Plantillas: catálogo `graphic-line-deck` del Artifact Composer
  (`src/lib/artifact-composer/catalogs/graphic-line-deck/`), mapper en `src/lib/brand-surfaces/` (documento:
  `document.ts`), comando `pnpm brand:compose` (`scripts/brand-surfaces/compose.ts`). Contrato
  `efeonce.surface-composition` 0.1.2; un intent 0.1.0 o 0.1.1 resuelve igual.
- Tasks: integración de las 31 recetas con plantilla, TASK-1927 (`complete`, 2026-09-27; en `develop` local, push
  pendiente); las 38 sin plantilla, TASK-1928; ruta productiva gobernada, TASK-1921; fotos idempotentes, TASK-1926.
- Prueba visual de las plantillas: `pnpm composer:visual-gate --catalog=graphic-line`.
- Skills: `deck-studio`, `efeonce-graphic-line`, `copywriting`, `design-studio`.
