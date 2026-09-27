# Componer un deck con las recetas por lámina — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude
> **Modulo:** Creative · marca propia de Efeonce (línea gráfica «La órbita»)
> **Ruta en portal:** no aplica — se arma con el catálogo de recetas, comandos locales y el Artifact Composer
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
- **Reúne los datos reales:** nombre y logo del cliente (versión para fondo oscuro), cifras **con su fuente**, montos
  (se escriben `[MONTO]` hasta la propuesta final), fotos reales del caso si vas a usar el caso de éxito.

## Paso a paso

### Paso 1 · Elige el documento, su portada y su contraportada

| Documento | Portada | Contraportada |
|---|---|---|
| Propuesta comercial | **sin foto**, con el logo del cliente dentro de la órbita: `cover-proposal-orbit` o `cover-proposal-dawn` | **con foto** y «Empower your Growth»: `close-proposal-horizon` o `close-proposal-dawn` |
| Brochure | **con foto**: `cover-brochure-cine-orbit`, `cover-brochure-cine-lines`, `cover-brochure-cine-lines-selection`, `cover-brochure-cine-team` o la de una línea (`cover-brochure-line-*`) | **sin foto**: `close-brochure-orbit` («¿Conversamos? Cuando quieras.») |
| Pitch / QBR | la portada clásica de AXIS (`cover-classic`) | el cierre clásico de AXIS (`close-classic`) |

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

### Paso 7 · Compón

| Si la receta… | Haz esto |
|---|---|
| tiene plantilla (`section-classic`, `content-measure`, `method-staircase`, `proposal-cinematic-*` con layout `service`) | `pnpm brand:compose -- --intent <intent.json>` ([cómo](./componer-por-superficie-con-axis.md)) |
| tiene plantilla en su versión anterior (`section-split`, `triptych`) | no uses esa salida tal cual: arma la lámina como maqueta declarada con la receta nueva |
| no tiene plantilla | arma la lámina como **maqueta de dirección declarada**, siguiendo `prompts.composition` y la referencia aprobada |

Une todo en **un solo PDF** 16:9.

### Paso 8 · Revisa y entrega

Mira cada lámina en el píxel final contra su referencia y contra los **pendientes de QA** del catálogo. En la entrega,
di qué láminas salieron de plantilla y cuáles son maqueta declarada. Componer no aprueba ni publica: la aprobación es
del operador.

## Qué significan los estados

| Estado | Qué significa |
|---|---|
| **aprobado** | la lámina está aprobada por el operador (hoy, las 69) y se puede usar |
| **con plantilla** | además, `pnpm brand:compose` la produce entera |
| **maqueta declarada** | aprobada pero sin plantilla todavía: se arma a mano siguiendo la receta y se dice en la entrega |
| **pendiente de QA** | la referencia aprobada tiene un detalle que la plantilla corrige (respuesta bajo 3×, acento en texto chico, cifra sin fuente); no bloquea el uso |
| `recipe-not-approved` | el comando no conoce la receta como aprobada: hoy pasa también con láminas aprobadas que aún no tienen plantilla |

## Qué no hacer

- **No inventes una lámina** si hay una receta que la cubre; si ninguna sirve, pídesela al operador.
- **No mezcles** láminas de «La órbita» con el catálogo `deck-axis` de las ofertas a comité.
- **No uses** `decision-next-steps` en una propuesta enviada después del diagnóstico, ni cotización en un brochure.
- **No pongas** el eslogan en la portada ni «¿Conversamos?» en la contraportada de una propuesta.
- **No inventes cifras ni fuentes**; no pongas montos reales antes de la propuesta.
- **No uses la foto de ejemplo** del caso Sky ni el isotipo que dibuja el modelo en una prenda.
- **No pongas texto** sobre la órbita ni sobre la persona de la foto.
- **No uses** el mismo plate dos veces en el mismo deck (P1 aparece en varias recetas).

## Problemas comunes

| Síntoma | Causa | Qué hacer |
|---|---|---|
| La pregunta cruza la órbita o una mano | el texto supera el `maxChars` medido | acorta la frase («¿Qué hacemos por tu marca?» → «¿Qué hace Efeonce?») |
| La portada y la contraportada llevan foto las dos | se eligieron sin mirar el par `cover↔close` | cambia una por su pareja sin foto |
| `pnpm brand:compose` falla con `recipe-not-approved` | la receta aprobada todavía no tiene plantilla | ármala como maqueta declarada (TASK-1927) |
| La sección partida sale con el indicador por la derecha | la plantilla del composer está en la versión anterior | arma la lámina como maqueta declarada con la receta nueva |
| El tríptico sale con una sola frase | la plantilla del composer está en la versión anterior | una palabra por toma con su esfera: maqueta declarada |
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
- Plantillas: catálogo `graphic-line-deck` del Artifact Composer (`src/lib/brand-surfaces/`), comando
  `pnpm brand:compose`; integración de las recetas nuevas: TASK-1927; fotos idempotentes: TASK-1926.
- Skills: `deck-studio`, `efeonce-graphic-line`, `copywriting`, `design-studio`.
