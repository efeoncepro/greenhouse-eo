# Componer un deck con las recetas por lámina — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.9
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-29 por Claude (1.9: decisiones del operador al canonizar el deck Salesforce — cuatro recetas nuevas más para las láminas 09, 13, 14 y 17 (94 recetas, 16 sin plantilla), los dos cierres con su plan validado (brochure y propuesta), el logo de 700 px sólo en la contraportada Salesforce y el servicio «Enablement conversacional». Antes, 1.8: el deck de práctica Salesforce — cómo armarlo en cinco actos, qué láminas son recetas nuevas (sin plantilla todavía) y cuáles son datos de recetas existentes, marcas de terceros con condición, badge de partner con readback, la pregunta abierta de portada y cierre, y el deck HubSpot pendiente (TASK-1942, TASK-1943). Antes, 1.7: paso 5b — ligar los datos reales de los slots con `pnpm brand:deck-plan -- --bind` (logo del cliente desde Account 360, cifras, casos, testimonios y logos con evidencia de la propuesta, montos en `[MONTO]` y equipo pendiente), cómo leer la tabla de slots y sus motivos (TASK-1930). Antes, 1.6: las nueve láminas SEO/AEO aprobadas el 2026-09-28 (78 recetas, todas con plantilla): cuándo usarlas, cifras siempre con fuente, datos de muestra marcados («Ejemplo ilustrativo», «Datos de muestra») y la interfaz de IA genérica; la regla de alternativas (una sola por deck, seguidas o no) y los códigos `variant-both-in-deck` y `figure-source-missing` (TASK-1934). Antes, 1.5: paso 4b — validar el plan con `pnpm brand:deck-plan` antes de componer, cómo escribir `plan.json`, la tabla completa de códigos con su arreglo, pedirle un plan al agente con `--propose --context`, el costo impreso y las credenciales locales (TASK-1929). Antes, 1.4: revisión de punta a punta — cómo elegir la composición de cada receta que tiene varias, los campos de la selección (`selected`, `recommended`, `selection.level`) y de `photo.focus`, cuándo escribir el `layout`, errores de conteo y de selección, TASK-1928 cerrada y empujada, ruta productiva TASK-1921 en curso. Antes, 1.3: la portada con selección compone con el layout `document-selection` (AXIS 0.3.21); 69 de 69 recetas con plantilla. Antes, 1.2: TASK-1928 — 68 de 69 recetas con plantilla; ya no hay maquetas declaradas; cómo componer cualquier receta desde su intent de ejemplo, largos que hace cumplir el compositor, cifras con fuente, `[MONTO]` y selección. Antes, 1.1: flujo tras el cierre de TASK-1927 — 31 recetas con plantilla, intent propio, documento completo, cómo cambiar la foto, el copy o la sección)
> **Modulo:** Creative · marca propia de Efeonce (línea gráfica «La órbita»)
> **Ruta en portal:** no aplica — se arma con el catálogo de recetas, comandos locales y el Artifact Composer (la ruta productiva gobernada es TASK-1921, en curso en otra sesión: todavía no está disponible)
> **Documentacion relacionada:** [Composición de decks y brochures (funcional)](../../documentation/creative/composicion-de-decks-y-brochures.md) · [Catálogo de recetas por lámina](../../operations/brand-graphic-line/deck-recipes/README.md) · [Norma de composición por superficie §4.6](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) · [Documentación funcional](../../documentation/creative/linea-grafica-efeonce.md) · [Componer una pieza por superficie con AXIS](./componer-por-superficie-con-axis.md) · [Registro cine](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md)

## Para qué sirve

Para armar un deck real de la marca Efeonce —un **brochure**, una **propuesta comercial**, un **pitch** o un **QBR**—
con las **94 láminas aprobadas** (69 el 2026-09-27, nueve de SEO/AEO el 2026-09-28 y dieciséis del deck Salesforce el 2026-09-29), en vez de diseñar cada lámina
desde cero. Cada lámina tiene una **receta** en el catálogo: qué comunica, cuándo usarla, cuándo no y cuál conviene en su lugar, con qué otras va, qué
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

## El flujo en seis pasos

1. Elige las láminas en el catálogo de 94 recetas (o pídele a un agente que proponga el plan).
2. Valida el plan del deck con `pnpm brand:deck-plan` y corrige hasta que no queden errores.
3. Busca el intent de ejemplo de cada lámina: **90 de las 94** recetas tienen plantilla y un ejemplo listo para copiar
   (las 4 de la segunda ronda Salesforce todavía no; ver «El deck de práctica Salesforce»).
4. Copia el ejemplo a tu carpeta y cambia el copy, las cifras y las fotos.
5. Compón la lámina o el documento completo con `pnpm brand:compose`.
6. Revisa a ojo contra la referencia aprobada.

El paso a paso de abajo los detalla.

## Paso a paso

### Paso 1 · Elige el documento, su portada y su contraportada

| Documento | Portada | Contraportada |
|---|---|---|
| Propuesta comercial | **sin foto**, con el logo del cliente dentro de la órbita: `cover-proposal-orbit` o `cover-proposal-dawn` | **con foto** y «Empower your Growth»: `close-proposal-horizon` o `close-proposal-dawn` |
| Brochure | **con foto**: `cover-brochure-cine-orbit`, `cover-brochure-cine-lines`, `cover-brochure-cine-team`, la de cinco líneas con selección (`cover-brochure-cine-lines-selection`) o la de una línea (`cover-brochure-line-*`) | **sin foto**: `close-brochure-orbit` («¿Conversamos? Cuando quieras.») |
| Pitch / QBR | no hay portada aprobada: pregúntale al operador | no hay cierre aprobado: pregúntale al operador |

La portada y el cierre clásicos de AXIS (`cover-classic`, `close-classic`) **no se usan**: el operador no los aprobó
y no tienen plantilla, aunque el catálogo todavía los cite como alternativa. La portada
`cover-brochure-cine-lines-selection` compone desde el 2026-09-28 con el layout `document-selection`: la selección va
sobre «Crecer.», nunca sobre la persona, con un solo cursor «Nexa».

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
- **SEO/AEO** (nueve láminas aprobadas el 2026-09-28; tabla completa en el
  [catálogo](../../operations/brand-graphic-line/deck-recipes/README.md#las-láminas-seoaeo-aprobadas-el-2026-09-28)):
  - el porqué ahora, con tres cifras de mercado con fuente: `decision-ai-market`;
  - el problema, visible: `decision-ai-answer` (el mismo prompt, «Hoy» sin tu marca y «Con AEO» con tu marca primera);
  - cómo trabajamos: `method-surround-cycle` (servicio continuo) y `method-eeat` (por qué la IA te citaría);
  - la oferta SEO: `proposal-service-seo` (sobria, se lee sola) **o** `proposal-cinematic-seo` (cine, para golpear),
    nunca las dos. SEO y AEO son servicios distintos: `proposal-service-seo` y `proposal-service-aeo` sí pueden ir
    juntas;
  - las objeciones: `decision-difference` (otras agencias o el equipo propio) y `decision-traffic-to-revenue` (del
    tráfico al negocio; sin CRM ni medición de leads, no la uses);
  - el cierre: `decision-diagnosis-map` (lo que el cliente recibe primero). Es de la familia de próximos pasos: no va
    en una propuesta enviada después del diagnóstico.
- **Deck de práctica Salesforce** (19 láminas aprobadas el 2026-09-29): ver la sección de abajo.

#### El deck de práctica Salesforce

Para un brochure o una propuesta de los servicios Salesforce, sigue el orden aprobado en cinco actos (tabla completa en
la [norma §4.6, «Deck de práctica Salesforce»](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck)):

1. **Apertura:** como brochure, la portada de línea `cover-brochure-line-revenue` con `line: revenue-salesforce` y el
   plate NXSF2; como propuesta, `cover-proposal-orbit` con el logo del cliente →
   propuesta cine `proposal-cinematic-revops` con el plate NXSF1 (o la sobria `proposal-service-revops`, nunca las dos).
2. **Cómo pensamos:** `content-one-platform` → `decision-provider-fit` → `decision-platform-coexistence`.
3. **Qué hacemos:** `content-service-lanes` → `content-season-launches` (sólo en temporada, con fecha de corte) →
   `method-agent-supervisor` → `content-day-live-approval` → `content-live-chat` (servicio «Enablement
   conversacional») → `method-identity-consent` →
   `method-migration-reconcile`.
4. **Cómo trabajamos:** `decision-diagnosis-verdict` → `method-waves` → `content-day-release-cycle` →
   `content-day-live-library` → `content-day-live-console` → `content-measure-formulas`.
5. **Cierre:** como brochure, `close-brochure-orbit` en la línea `revenue-salesforce` («¿Conversamos? Cuando quieras.» +
   «Empower your Revenue» como firma); como propuesta, SF19 con «Empower your Revenue» (`close-proposal-horizon`,
   composición `sloganBlock`, plate NXSF3 bordada, logo a 700 px).

Antes de armarlo:

- **Cuatro láminas todavía no se componen** (09, 13, 14 y 17: recetas de la segunda ronda sin plantilla; las otras doce componen desde `84c83a044`): el plan las acepta con el aviso
  `recipe-without-template`. Mientras tanto, las láminas aprobadas están en
  `ai-generations/2026-09-29_deck-salesforce/out/` y se regeneran con `ONLY=<lámina> node
  ai-generations/2026-09-29_deck-salesforce/render-src/salesforce.mjs` (maquetas de dirección, no la ruta productiva).
- **Las láminas 09, 13, 14 y 17 tienen receta propia** desde el 2026-09-29 (`content-day-live-approval`,
  `decision-diagnosis-verdict`, `method-waves`, `content-day-live-console`): no uses las recetas de las que antes se
  registraban como datos (`content-day-live-progress`, `decision-diagnosis-map`, `method-staircase`,
  `content-day-live-results`).
- **Portada y cierre según el documento** (decisión del operador, 2026-09-29): parte de los dos planes validados,
  `src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-brochure-salesforce.json` y
  `golden-proposal-salesforce.json`, y valídalos con `pnpm brand:deck-plan -- --plan <plan>` (sin errores, 4 avisos
  `recipe-without-template`). Conserva los `plateRef` de la portada, la 02 y la contraportada: sin ellos el plan falla
  con `plate-repeated`. **La contraportada de brochure Salesforce todavía no existe como lámina:** la compone el
  composer desde `close-brochure-orbit` y el operador tiene que darle el visto bueno antes de enviarla.
- **Logo de la contraportada:** 700 px sólo en la Salesforce de propuesta (SF19); las demás contraportadas, 500 px.
- **Marcas de terceros:** logo, íconos de producto, badge y Agent Astro necesitan la autorización escrita de Salesforce;
  Claude y Claudeforce, además la de Anthropic. **Están pendientes de archivar: sin ellas, el deck no sale a un
  cliente ni a pauta.** Agent Astro, Claude y Claudeforce son opcionales.
- **Badge «Salesforce Partner»:** sólo con readback vigente en Partner Community. Sin él, usa el respaldo sin badge
  (`SIN_BADGE=1`): «Operamos sobre» + logo de Salesforce en la portada y nada en la contraportada.
- **Cifras de muestra** marcadas y montos `[MONTO]`; la lámina de Dreamforce siempre con su fecha de corte.

**Deck HubSpot:** todavía no existe la serie de contenido (sólo portada y propuesta `revenue-hubspot`). Está en
[TASK-1943](../../tasks/to-do/TASK-1943-hubspot-deck-content-series.md): no armes un deck HubSpot con las láminas de
Salesforce.

### Paso 4 · Revisa pares y ritmo

- **`cover↔close`:** la portada y la contraportada deben ser pareja del mismo documento.
- **`variant`:** son alternativas: se elige una y la otra no entra al deck, **ni seguida ni separada** (por ejemplo,
  la tabla y la escena de cotización, o la propuesta SEO sobria y la de cine).
- **`sequence`:** van una después de la otra (quiénes somos → por qué lo hacemos; sección de servicios → página de
  servicio).
- **Ritmo:** alterna papel y oscuro; no pongas dos secciones partidas con la misma esquina seguidas; no repitas el
  mismo plate en el mismo deck.

El paso 4b revisa casi todo esto por ti.

### Paso 4b · Valida el plan antes de componer

Antes de escribir intents y componer, escribe el **plan** del deck y valídalo. Es un archivo corto con la lista de
láminas por receta; el comando lo revisa contra el catálogo y contra AXIS en segundos, no escribe nada y no compone
nada.

#### 1. Escribe `plan.json`

Guárdalo en tu carpeta de trabajo:

```json
{
  "document": "brochure",
  "line": "growth",
  "slides": [
    { "recipeId": "cover-brochure-cine-lines" },
    { "recipeId": "proposal-cinematic-creative" },
    { "recipeId": "section-cine-about" },
    { "recipeId": "method-staircase" },
    { "recipeId": "content-measure" },
    { "recipeId": "decision-case" },
    { "recipeId": "close-brochure-orbit" }
  ]
}
```

| Campo | Qué va | Obligatorio |
|---|---|---|
| `document` | `brochure`, `proposal`, `pitch` o `qbr` | sí |
| `line` | la línea de servicio del documento (por ejemplo `growth`) | no |
| `diagnosisDone` | `true` si es una propuesta enviada **después** del diagnóstico | no |
| `slides` | las láminas en orden, al menos una | sí |
| `slides[].recipeId` | el **id del catálogo** (`cover-proposal-orbit`, `content-pricing`…), nunca el nombre de la plantilla (`CoverBrochure`) ni el `contentType` (`deck.content-text`) | sí |
| `slides[].slots` | los textos de la lámina, **por nombre de slot del catálogo** (`eyebrow`, `question`, `answer`, `evidence`…). Si no lo pones, la lámina es un esqueleto y sus textos no se revisan | no |
| `slides[].plateRef` | otra foto para esa lámina, si no usas el plate de su receta | no |

Los nombres de los slots son los del **catálogo**, no los campos del intent (`voice`, `body`). Para ver los de una
receta, con su tipo, si es obligatorio y su largo máximo:

```bash
node -e 'const c=require("./src/lib/brand-surfaces/deck-recipes/catalog.generated.json");
const r=c.recipes.find(r => r.id === "cover-brochure-cine-lines");
console.table(r.slots)'
```

El orden recomendado: valida primero el esqueleto (sin `slots`) y, cuando ya tengas los textos, agrégalos y vuelve a
validar para comprobar que caben.

#### 2. Corre la validación

```bash
pnpm brand:deck-plan -- --plan <tu-carpeta>/plan.json
```

Un plan sin problemas responde `✓ Plan válido (0 aviso(s))`. Uno con problemas lista cada uno así (salida real):

```text
✗ Plan inválido: 2 error(es)
  ✗ frame-photo-must-alternate [axis] · lámina 3 (close-brochure-horizon)
    AXIS: frame-photo-must-alternate (pages[2])
  ✗ pair-cover-close-mismatch [catalog] · lámina 3 (close-brochure-horizon)
    «close-brochure-horizon» no es pareja aprobada de «cover-brochure-cine-lines» (parejas: close-brochure-orbit).
```

Cómo leer cada línea:

- **`✗` es un error, `!` es un aviso.** Con un solo error el comando termina con código 1 y el plan no está listo. Los
  avisos no impiden nada: mira si tienen sentido en tu deck.
- **`[axis]` o `[catalog]`** dice quién lo detectó: AXIS (las reglas del documento; sólo en brochure y propuesta) o el
  catálogo de recetas. Un mismo problema no sale dos veces con dos nombres.
- **`lámina N (receta)`** cuenta desde 1. Si el problema es de todo el plan, dice `plan`. Si es de un texto, agrega el
  slot.
- En los códigos de AXIS, `pages[i]` cuenta desde 0: `pages[2]` es la lámina 3.

#### 3. Corrige según el código

| Código | Tipo | Qué significa | Cómo lo corriges |
|---|---|---|---|
| `plan-invalid` | error | al plan le falta algo básico: `document` no es uno de los cuatro, `slides` está vacío, una lámina no trae `recipeId` o `slots` no es un objeto | completa el campo que nombra el mensaje |
| `template-named-instead-of-recipe` | error | nombraste una plantilla o un `contentType` (`CoverBrochure`, `deck.content-text`) en vez de una receta | usa el id del catálogo (columna «id» del [índice](../../operations/brand-graphic-line/deck-recipes/README.md#índice)) |
| `recipe-unknown` | error | ese id no está en el catálogo (por ejemplo un id mal escrito, como `content-pricing-table`) | busca la receta en el índice; si ninguna sirve, pídesela al operador |
| `recipe-not-for-document` | error | la receta no va en ese documento (por ejemplo la cotización en un brochure) | cámbiala por una que sí vaya; el mensaje lista sus documentos |
| `frame-count` | error | hay más de una portada o más de un cierre (y con dos cierres, el eslogan saldría dos veces) | deja una portada y un cierre |
| `frame-order` | error | la portada no va primera o el cierre no va último | mueve la portada al inicio y el cierre al final |
| `pair-cover-close-mismatch` | error | el cierre no es pareja aprobada de la portada | usa una de las parejas que lista el mensaje |
| `next-steps-after-diagnosis` | error | pusiste una lámina de próximos pasos (`decision-next-steps` o `decision-diagnosis-map`) en una propuesta con `diagnosisDone: true` | quítala: el gesto es aprobar (`content-pricing-live`) |
| `variant-both-in-deck` | error | dos versiones de la misma lámina van en el mismo deck, seguidas o no (por ejemplo la tabla y la escena de cotización, o `proposal-service-seo` y `proposal-cinematic-seo`) | elige una de las dos. Reemplaza a `variant-adjacent`, que sólo miraba las seguidas |
| `plate-repeated` | error | la misma foto sale dos veces en el deck | cambia una lámina por otra, o dale otra foto con `plateRef` |
| `slot-unknown` | error | escribiste un slot que esa receta no tiene (por ejemplo el eslogan en una portada: ninguna portada lo lleva) | quita el slot o revisa su nombre en el catálogo |
| `slot-type-invalid` | error | el valor no es del tipo del slot (un número donde va texto, un texto donde va una lista) | escribe el valor con el tipo que dice el mensaje |
| `slot-required-missing` | error | falta un slot obligatorio en una lámina que ya trae `slots` | escríbelo, o quita `slots` para dejar la lámina como esqueleto |
| `slot-over-max-chars` | error | el texto pasa el largo máximo (en un texto enriquecido cuenta cada línea sin `**`; en una lista, cada ítem) | acorta el texto; nunca subas el `maxChars` |
| `figure-source-missing` | error | una cifra del plan (un objeto con `value`) no trae `source` | agrega la fuente real del documento que la respalda, o quita la cifra. Ojo: una cifra escrita como texto plano («68 %») no la ve el validador; escríbela como objeto con `source` |
| `recipe-without-template` | aviso | la lámina no tiene plantilla en el composer. Hoy sale en las 4 recetas de la segunda ronda del deck Salesforce y en la portada y el cierre clásicos de un pitch o un QBR (`cover-classic`, `close-classic`) | ese deck se valida pero todavía no se compone de punta a punta: avísale al operador |
| `section-split-corner-adjacent` | aviso | dos secciones partidas seguidas con la misma esquina (sin `layout` cuenta como esquina arriba) | alterna `section-split` con `section-split-corner-bottom` o `section-split-panel-end`, o separa las secciones |
| `rhythm-paper-run` | aviso | tres láminas de papel (fondo claro) seguidas | intercala una oscura o con foto |
| `brochure-cover-first` | error, AXIS | el brochure no abre con su portada | pon una portada de brochure primero |
| `brochure-close-last` | error, AXIS | el brochure no termina con su contraportada | pon la contraportada al final |
| `brochure-needs-service-page` | error, AXIS | el brochure no tiene ninguna página de servicio | agrega una (por ejemplo `proposal-cinematic-*` o `proposal-service-*`) |
| `frame-photo-must-alternate` | error, AXIS | portada y cierre llevan foto los dos, o ninguno | cambia uno por su pareja con o sin foto |
| `document-line-mismatch` | error, AXIS | la portada o el cierre llevan una línea distinta a la del documento | usa la misma línea en `line` y en las láminas del marco |
| `use-not-for-recipe` | error, AXIS | la lámina no sirve para ese uso (por ejemplo una contraportada de brochure en una propuesta) | cámbiala por la del documento correcto |
| `progress-required` | error, AXIS | la lámina necesita saber en qué sección del deck va y no se pudo deducir | revisa que el plan tenga secciones, o agrega `progress` a esa lámina (`{ "sections": N, "current": n }`) |

Si AXIS devuelve otro código, el mensaje lo trae tal cual: búscalo en
[los códigos de un documento](./componer-por-superficie-con-axis.md#códigos-de-un-documento).

#### 4. O pídele el plan a un agente

En vez de escribir el plan a mano, puedes pedirle uno al agente. Escribe un `context.json`:

```json
{
  "document": "brochure",
  "audience": "reading",
  "line": "growth",
  "sections": ["qué hace Efeonce", "cómo trabajamos", "pruebas", "cierre"],
  "availableFacts": ["caso Sky publicado"],
  "brief": "Brochure general de servicios 2026 para enviar a un prospecto."
}
```

| Campo | Qué va | Obligatorio |
|---|---|---|
| `document` | `brochure`, `proposal`, `pitch` o `qbr` | sí |
| `audience` | `room` (se presenta en sala) o `reading` (se lee sin presentador) | no |
| `line` | la línea de servicio | no |
| `diagnosisDone` | `true` o `false` | no |
| `sections` | los temas del deck en orden, entre 1 y 20 | sí |
| `availableFacts` | **nombres** de hechos que puedes usar (hasta 20), nunca sus valores | no |
| `brief` | una línea de intención, hasta 200 caracteres | no |

Sólo se aceptan esos campos. Cualquier otro (un id de organización, un monto, un nombre de persona) hace que el
comando falle con `✗ Contexto inválido` **antes** de llamar al modelo. Cada texto admite hasta 200 caracteres.

```bash
pnpm brand:deck-plan -- --propose --context <tu-carpeta>/context.json --out <tu-carpeta>/plan.json
```

La respuesta trae el modelo y los intentos, los **tokens** usados y un **costo estimado** en dólares (calculado con una
tarifa de referencia; no es la factura), la lista de láminas con para qué está cada una, el porqué del plan y los
avisos. Con `--out`, el plan queda escrito en tu carpeta. Sin `--out`, sólo se imprime.

Lo que tienes que saber:

- **Cada corrida cuesta.** Una propuesta real de un brochure de 16 láminas costó cerca de USD 0,09 el 2026-09-28. No
  la repitas para «ver otra opción» sin necesidad.
- **El agente sólo elige recetas del catálogo** para ese documento y no escribe textos ni cifras.
- **Si su primer plan tiene errores, lo corrige una vez.** Si el segundo también los tiene, responde
  `✗ Sin plan válido`, muestra el plan rechazado sólo para diagnóstico y no escribe `--out`.
- **`proposal-unavailable`** significa que el proveedor del modelo no respondió. Reintenta más tarde; no hay detalle
  del error a propósito.
- **Tú confirmas.** El plan propuesto es una sugerencia: revísalo, ajústalo si hace falta y vuelve a validarlo con
  `--plan` después de cualquier cambio. Hoy la confirmación no queda registrada en ninguna parte (TASK-1932).

**Credenciales para correrlo en tu equipo.** La propuesta usa el cliente de Anthropic de Greenhouse. Si tu
`.env.local` no las trae, necesitas `ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key` y
`GCP_PROJECT=efeonce-group`, con tu sesión de `gcloud` (ADC) vigente:

```bash
ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key GCP_PROJECT=efeonce-group \
  pnpm brand:deck-plan -- --propose --context <tu-carpeta>/context.json --out <tu-carpeta>/plan.json
```

Validar con `--plan` no necesita credenciales ni red.

#### Qué no hace todavía

- No convierte el plan en intents ni compone: eso sigue siendo `pnpm brand:compose` (pasos 7 a 9).
- No llena los slots con datos reales: eso es el paso 5b (`--bind`, TASK-1930). Tampoco elige fotos del banco (TASK-1931).
- No está en el portal, en Nexa ni en MCP, y no guarda la confirmación (TASK-1932).

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
  AXIS rechaza la pieza (`figure-source-required`), y en el plan la marca `figure-source-missing`. Las tres cifras de
  `decision-ai-market` salen de `docs/documentation/public-site/aeo-landing-elementor.md` §market (HubSpot 2026,
  McKinsey 2025, SparkToro 2026): para cambiar una cifra o su fuente, cita el documento de origen, nunca memoria.
- **Datos de muestra:** `decision-ai-answer` y `decision-diagnosis-map` traen datos ilustrativos y su marca visible
  («Ejemplo ilustrativo» en `mark`, «Datos de muestra» en `sampleMark`). No la quites: sin ella la lámina no sale
  (`invalid-intent`). Cuando los datos sean del cliente, el intent dice `dataOrigin: "client"` y trae su evidencia
  (`evidenceRef`); sin ella, tampoco sale.
- **Interfaz de IA:** la de estas láminas es genérica a propósito. No pongas logos, colores ni la interfaz de ChatGPT,
  Gemini u otro motor; los nombres de los motores sólo van como texto en el diagnóstico. Si necesitas la interfaz real,
  son los recursos AEO de AXIS ([manual](./componer-recursos-aeo-con-axis.md)).
- **Montos:** no se escriben. La cotización imprime siempre `[MONTO]`.
- **Contacto:** no se escribe. Sale de los datos de Efeonce (`EFEONCE_CONTACT`).
- **Logos** sólo de clientes que autorizan su uso. El compositor los deja en un tono y con el mismo peso.
- **Selección:** una sola por lámina. Qué destaca depende de la receta (paso 8, «La selección»); si la receta no la
  lleva, no la agregues.
- **Fotos de ejemplo** (el caso Sky, las piezas dentro de las interfaces del «vívelo») se reemplazan antes de enviar.

### Paso 5b · Liga los datos reales

Los slots de **datos** —logo del cliente, cifras, casos, testimonios, logos del muro, montos y equipo— no se escriben a
mano: se ligan desde Greenhouse, y lo que hayas escrito en ellos se reemplaza por el dato verificado o se quita.

1. **Registra primero la evidencia en la propuesta.** Cada cifra necesita una evidencia `measured` y cada caso,
   testimonio, logo de tercero o foto de caso, una evidencia `attested` **con su documento de respaldo** (la
   autorización de uso). Se registran con la acción `record_proposal_evidence` (Nexa) antes de ligar.
2. **Escribe los hechos** (`hechos.json`): una lista con lo que va en cada slot y la evidencia que lo respalda.

   ```json
   [
     { "kind": "figure", "factId": "otd", "target": { "recipeId": "content-focus", "slot": "proof" },
       "value": "88 %", "label": "entregas a tiempo", "evidenceRef": "prev-…" },
     { "kind": "quote", "factId": "cita", "target": { "recipeId": "decision-testimonial" },
       "quote": "«…»", "authorName": "Nombre", "authorRole": "Cargo o equipo", "evidenceRef": "prev-…" },
     { "kind": "logo", "factId": "sky", "target": { "recipeId": "content-clients", "slot": "logos" },
       "name": "Sky Airline", "logoAssetId": "asset-…", "evidenceRef": "prev-…" }
   ]
   ```

   Los tipos son `figure` (cifra; `numericValue` para barras y para el arco de `content-measure`, entre 0 y 1),
   `logo`, `quote`, `photo` (foto real de un caso) y `sample-data` (datos del cliente en las láminas de muestra
   SEO/AEO). Con `slideIndex` en `target` apuntas a una lámina puntual cuando la receta se repite.
3. **Liga y lee la tabla** (necesita el proxy de Cloud SQL: `pnpm pg:connect`):

   ```bash
   pnpm brand:deck-plan -- --bind --plan <tu-carpeta>/plan.json --proposal <proposalId> --org <ownerOrgId> \
     --facts <tu-carpeta>/hechos.json --out <tu-carpeta>/plan-ligado.json
   ```

   Cada slot de datos sale con `✓ ligado desde …` (y su evidencia y fecha) o `· sin ligar: <motivo>`. Sin propuesta
   (brochure de marca propia) usa `--context` con `"kind": "brand"`: sólo ligan cifras con un asset de respaldo y su
   `sourceLabel`. Para probar sin base, `--sources` con un fixture de fuentes ya leídas.

| Motivo | Qué pasó | Qué hacer |
|---|---|---|
| `no-evidence` | la cifra no tiene evidencia `measured` válida | registra la evidencia medida o quita la cifra |
| `no-authorization` | el logo, la cita, la foto o la cifra de un caso no tiene evidencia `attested` con documento | registra la autorización con su documento |
| `internal-evidence` | la evidencia es interna: **ningún deck la usa**, ni siquiera uno interno, y no compone | usa una evidencia `client_facing` o quita el dato |
| `no-on-dark-logo` / `no-logo` | Account 360 no tiene el logo del cliente (o su versión para fondo oscuro) | súbelo en la organización del cliente |
| `below-minimum` | el muro tiene menos logos autorizados de los que muestra la lámina (9) | autoriza más logos o usa otra lámina |
| `not-in-quote` | la frase destacada no es un fragmento literal de la cita | copia la frase tal cual de la cita |
| `no-real-photo` | el caso no trae foto real | registra la foto del caso con su autorización |
| `no-frozen-quote` | los montos todavía no salen de la cotización congelada (TASK-1417) | se imprime `[MONTO]`: es lo esperado |
| `no-roster-facts` | el equipo todavía no sale del roster real (TASK-1418) | la lámina de equipo no compone por ahora |
| `too-many-facts` | mandaste más hechos de los que la lámina admite | deja sólo los que van |
| `illustrative-sample` | la lámina de muestra conserva sus datos de ejemplo y su marca | es lo esperado mientras no haya diagnóstico real |

No hagas: escribir cifras, montos o nombres de personas en los slots de datos esperando que queden (el binding los
quita); quitar la marca «Datos de muestra» o «Ejemplo ilustrativo» sin datos del cliente con evidencia; usar una foto de
ejemplo o una cara generada para un caso o el equipo.

### Paso 6 · Resuelve las fotos

La receta trae el plate aprobado, su ficha, el prompt compilado y el post-proceso. Si cambias la foto, pide una nueva
**por ficha** (`pnpm foto:prompt` → `pnpm foto:generar` → `pnpm foto:validar`) y revisa el emblema de la ropa con
`pnpm foto:emblema`; si difiere del oficial, se compone con `pnpm foto:isotipo`. El estilo de cine sólo va con Nexa
protagonista, en las propuestas de cine y en las láminas de sección y «quiénes somos»; desde el 2026-09-28, también en
la lente de `proposal-service-seo`, que recorta el plate de cine SE1.

### Paso 7 · Busca la receta y su intent de ejemplo

1. Abre el índice del [catálogo](../../operations/brand-graphic-line/deck-recipes/README.md#índice) y confirma en la
   columna «Plantilla» que la receta la tiene (hoy, 90 de las 94).
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
   | `cover-brochure-cine-lines-selection` | `cover-brochure` | `document-selection` |
   | `content-pricing-stage` | `content-pricing` | `stage` |
   | `method-staircase-flat` | `method-staircase` | `flat` |
   | `section-cine-about` | `section-cine` | `about` |
   | `content-day-live-results` | `content-day` | `live-results` |
   | `proposal-service-creative` | `proposal-service` (con `line: "brand"`) | — |

   Las siete láminas SEO/AEO nuevas usan la receta de AXIS con su mismo id y sin `layout`; `proposal-service-seo` es
   `proposal-service` (con `line: "engine"`) y `proposal-cinematic-seo` es `proposal-cinematic` con `layout` `service`.
   La tabla completa, receta por receta, está en el catálogo («Dos nombres para la misma lámina», «Las recetas de
   TASK-1928» y «Las recetas de TASK-1934»).

#### Cómo elegir la composición (`layout`) de una receta que tiene varias

Varias láminas del catálogo comparten una receta de AXIS y se distinguen por su `layout`. Estas son las que conviene
tener claras:

| Receta del intent | `layout` | Cuándo |
|---|---|---|
| `cover-brochure` | `document` | la portada general del brochure (Nexa frente a la órbita, las cinco líneas o el equipo: cambia la foto y el copy, no el `layout`) |
| `cover-brochure` | `line` | la portada de **una** línea de servicio; la línea sale de `line` (`growth`, `brand`, `engine`, `voice`, `revenue-hubspot`) |
| `cover-brochure` | `document-selection` | la portada de cinco líneas con la selección de Nexa sobre «Crecer.». La selección la trae el `layout`: el intent **no** lleva campo `selection` |
| `section-cine` | `team` (o sin `layout`) | abre el capítulo del equipo |
| `section-cine` | `services` | abre el capítulo de servicios |
| `section-cine` | `about` · `purpose` | «quiénes somos» y «por qué lo hacemos», en ese orden |
| `content-day` | `clock` | el día a día base: la órbita-reloj con los momentos del día |
| `content-day` | `tools` | si preguntan con qué herramientas se trabaja (el panel de Greenhouse al centro) |
| `content-day` | `live-progress` · `live-results` | los dos «vívelo»: cómo avanza y se aprueba el trabajo, y los resultados en vivo |
| `content-pricing` | sin `layout` · `stage` · `live` | la tabla de planes para comparar · los planes en escena para empujar el recomendado en sala · la cotización en vivo cuando el alcance está acordado |
| `method-staircase` | sin `layout` · `flat` | la escalera BeX (la principal) · la variante plana |
| `method-hybrid-workforce` | sin `layout` · `scene` | la fuerza híbrida por tramos · la escena de persona y agente |
| `section-split` | `corner-top` (o sin `layout`) · `corner-bottom` · `panel-end` | alterna la esquina para no repetir dos secciones partidas iguales seguidas |
| `proposal-cinematic` | `service` · `hero` · `lines` | la página de un servicio en cine · Nexa protagonista · las líneas de servicio con Nexa |
| `cover-proposal` | `orbit` · `dawn` | la órbita gigante · la órbita que sale como el sol |
| `close-brochure` | `orbit` · `photo` | sin foto (la pareja de las portadas de brochure de hoy) · con foto |

La portada con selección (`cover-brochure-cine-lines-selection`) se compone desde
`deck-cover-brochure-cine-lines-selection-intent.json`. Sólo `document-selection` admite la selección: con
`document` o `line`, AXIS la rechaza (`selection-not-in-recipe`).

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
   | El ítem marcado por la selección | `selected`: el número del ítem, desde 1. Según la receta es la viñeta, el tema de la agenda, la cifra (clientes, caso, «por qué elegirnos»), el partner, la barra del gráfico o el riesgo |
   | El plan recomendado (cotización) | `recommended`: el número del plan; la selección lo sigue. En la escena, el recomendado es el que va al frente |
   | El peldaño seleccionado (escalera) | `selection.level` |
   | Quién aparece en el cursor | `selection.label` y `selection.participantKind` (`department`, `role` o `person`), como en el ejemplo |
   | Hacia dónde recortar la foto | `photo.focus` (`xOfWidth`, `yOfHeight`, de 0 a 1). En el deck hoy sólo lo lee la lente del día a día (`content-day`, `clock`) |
   | La sección | `progress` (sección n de N) |
   | El uso | `use`: `proposal` o `brochure` |
   | El logo del cliente (portadas de propuesta) | `clientLogo`: `path` (SVG o PNG) y `alt` |
   | El alto de la columna (portadas con columna) | `column.topPx` |

3. Respeta los largos: cada texto dentro del `maxChars` de su slot en el catálogo.
4. No agregues montos ni datos de contacto: la plantilla los pone.
5. Copia el `layout` tal como viene en el ejemplo. Si el ejemplo no lo trae, la receta tiene una sola composición o
   usa la de por defecto (`section-split` → `corner-top`, `section-cine` → `team`); no inventes uno.
6. No toques `selection.item`: es el campo interno que la plantilla recibe. Lo llena el sistema a partir de `selected`
   o de `recommended`.

La plantilla no se toca: si una lámina necesita otra disposición, se cambia de `layout` o de receta.

### Paso 9 · Compón

Antes de componer un documento completo, confirma que su plan pasó el paso 4b sin errores. El plan y el intent son
archivos distintos: si cambiaste láminas al escribir los intents, actualiza el plan y vuelve a validarlo.

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
prueba visual automática (`pnpm composer:visual-gate`) cubre las plantillas con sus datos de prueba, no tu pieza: tu
pieza se revisa a ojo. Correr esa prueba **no es tu trabajo** como quien arma el deck; es de quien cambia una plantilla.
Si usaste `cover-brochure-cine-lines-selection`, revisa que la selección caiga sobre «Crecer.» y no sobre la persona.
Componer no aprueba ni publica: la aprobación es del operador.

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
| Mira el recorte | la foto se ajusta al área de la lámina cubriéndola y **centrada**. En la sección partida la franja de foto mide 1.260 × 1.080 px sobre un lienzo de 1.920 × 1.080; en las láminas a sangre, el lienzo completo. En el deck, hoy leen `photo.focus` para dirigir el recorte hacia un punto del archivo la lente del día a día (`content-day` con `clock`) y la lente de la propuesta sobria (`proposal-service`); en las demás el recorte es centrado |
| En la sección partida, elige bien el encuadre | esa lámina no tiene control de foco: si el sujeto queda cortado, usa otra foto |
| En el panel a la derecha (`panel-end`), revisa textos y logos | la foto va **espejada**: un texto legible o un logo saldrían al revés. Revisa también el isotipo del uniforme |
| En portadas con columna, revisa `column.topPx` | se elige según dónde queda el sujeto |

Qué **no** cambia: el panel, la esquina curva, el indicador de sección y la columna de voz. Eso lo fija el `layout`.

## Qué significan los estados

| Estado | Qué significa |
|---|---|
| **aprobado** | la lámina está aprobada por el operador (hoy, las 94) y se puede usar |
| **con plantilla** | además, `pnpm brand:compose` la produce entera (hoy, 90 de las 94) |
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
- **No quites** «Ejemplo ilustrativo» ni «Datos de muestra» mientras los datos no sean del cliente con su evidencia.
- **No imites** la interfaz de ChatGPT, Gemini u otro motor en una lámina, ni nombres a un competidor real en
  `decision-difference`.
- **No pongas** las dos versiones de una lámina (sobria y de cine, tabla y escena) en el mismo deck.
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
| `decision-ai-answer` o `decision-diagnosis-map` fallan con `invalid-intent` y piden la marca de los datos | quitaste `mark` («Ejemplo ilustrativo…») o `sampleMark` («Datos de muestra») con datos de muestra, o pusiste `dataOrigin: "client"` sin `evidenceRef` | devuelve la marca; con datos reales del cliente, agrega su evidencia |
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
| Falla con `invalid-intent` y dice cuántos elementos lleva la lámina («La cotización lleva 3 planes», «La lámina lleva 4 viñetas», «La agenda lleva 5 temas», «El reporte lleva tres cifras») | la lista del intent no tiene la cantidad que pide la receta | deja exactamente esa cantidad; si te sobra contenido, llévalo a otra lámina |
| Falla con `invalid-intent`: «En el escenario, el plan recomendado va al frente» | en `content-pricing` + `stage`, `recommended` no es el plan del centro | usa como recomendado el plan que la escena pone al frente (el del ejemplo) o cambia a la tabla |
| Falla con `invalid-intent`: la respuesta «va en una línea» | la receta (texto, viñetas, respiro, próximos pasos) no admite respuesta en dos líneas | escribe la respuesta en una sola línea |
| Falla con `surface-issues` y `selection-not-in-recipe` | pediste selección en una receta o composición que no la lleva (por ejemplo, `cover-brochure` con `document` o `line`) | quita `selection`, o usa `document-selection` si es la portada de cinco líneas |
| La portada de propuesta muestra «Logo del cliente» | el intent no trae `clientLogo` | agrega `clientLogo` con `path` y `alt` |
| El documento no produce ninguna página | un solo problema deja el documento sin componer | lee el código: `brochure-cover-first` (la portada va primero), `brochure-close-last` (el cierre va al final), `brochure-needs-service-page` (falta una página de servicio), `document-line-mismatch` (portada y cierre llevan la línea del documento), `frame-photo-must-alternate` (portada y contraportada no pueden llevar foto las dos), `page[i]:<código>` (el problema está en esa página) |
| La prueba de ejemplos falla después de tu cambio | editaste o agregaste un intent en `src/lib/brand-surfaces/examples/` | deja los ejemplos como estaban y guarda tu intent en tu carpeta |
| La lámina se ve distinta de la referencia aprobada en una etiqueta chica, el tamaño de la respuesta, la fuente de una cifra, el logo de una sección con foto o el velo de «quiénes somos» | la plantilla aplica la norma sobre la referencia (D1, 3×, fuentes visibles, sin logo ni velo en láminas interiores con foto) | es lo esperado; la decisión de cada caso está en «Pendientes de QA» del catálogo |
| `pnpm brand:deck-plan` responde `Uso: …` y sale con código 2 | no le pasaste `--plan` ni `--propose` | usa `-- --plan <plan.json>` o `-- --propose --context <context.json>` (el `--` después del nombre del comando es necesario) |
| `✗ No se pudo leer plan.json` | la ruta no existe o el JSON está mal escrito | revisa la ruta y valida el JSON (comas, comillas) |
| `✗ --propose necesita --context <context.json>` | pediste una propuesta sin contexto | agrega `--context` con tu `context.json` |
| `✗ Contexto inválido: El contexto no admite …` | el `context.json` trae un campo fuera de la lista permitida (por ejemplo un id de cliente o un monto) | deja sólo `document`, `audience`, `line`, `diagnosisDone`, `sections`, `availableFacts` y `brief` |
| La propuesta falla con `proposal-unavailable` y 0 tokens (en el log previo puede aparecer «[secrets] Secret ref normalization failed») | faltan las credenciales del cliente de Anthropic en tu equipo | define `ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key` y `GCP_PROJECT=efeonce-group`, y renueva tu sesión de `gcloud` si venció |
| `✗ Sin plan válido` después de dos intentos | el agente no logró un plan sin errores | lee los códigos del plan rechazado, ajusta el contexto (por ejemplo, agrega un tema de servicios a un brochure) o escribe el plan a mano |
| `proposal-unavailable [agent]` | el proveedor del modelo no respondió | reintenta más tarde o escribe el plan a mano |
| El plan valida, pero `pnpm brand:compose` rechaza una lámina | el plan revisa la secuencia y los largos de sus `slots`; el intent tiene campos que el plan no ve (cifras con fuente, `selected`, `column.topPx`) | corrige el intent según la fila de este cuadro que corresponda al código |
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
  `efeonce.surface-composition` 0.1.2 (`axis-tokens` 0.3.21, `axis-ui-contracts` 0.3.19); un intent 0.1.0 o 0.1.1
  resuelve igual.
- Paridad de slots receta ↔ plantilla: `src/lib/brand-surfaces/__tests__/recipe-slot-parity.test.ts`.
- Plan del deck (TASK-1929): `validateDeckPlan` y `proposeDeckPlan` en `src/lib/brand-surfaces/deck-recipes/`
  (`validate.ts`, `issues.ts` con los códigos, `propose.ts` `server-only` sobre el cliente canónico
  `generateStructuredAnthropic`, modelo `claude-sonnet-5`, dos intentos como máximo); catálogo de runtime
  `catalog.generated.json`, generado por `pnpm brand:deck-recipes`; comando `pnpm brand:deck-plan`
  (`scripts/brand-surfaces/deck-plan.ts`); planes de ejemplo en `src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/`
  (`golden-*.json`, `adversarial.json`, `context-brochure.json`). Arquitectura:
  [`GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md`](../../architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md).
- Tasks: TASK-1927 (31 recetas: el marco, secciones clásica y partida, medida, tríptico, escalera y propuestas de
  cine; `complete`); TASK-1928 (las 38 restantes y la portada con selección; `complete`, en `develop`); ruta
  productiva gobernada, TASK-1921 (en curso, todavía no disponible); fotos idempotentes, TASK-1926; plan de deck
  validado, TASK-1929; datos reales en los slots, TASK-1930; banco de plates, TASK-1931; deck desde Proposal Studio,
  TASK-1932.
- Documentación funcional: [Composición de decks y brochures de marca propia](../../documentation/creative/composicion-de-decks-y-brochures.md);
  arquitectura: [`GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md`](../../architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md).
- Prueba visual de las plantillas: `pnpm composer:visual-gate --catalog=graphic-line` (66 frames, 50 del deck, a 0 px).
- Skills: `deck-studio`, `efeonce-graphic-line`, `copywriting`, `design-studio`.
