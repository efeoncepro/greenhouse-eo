# Composición — el deck se COMPONE, no se dibuja

> **La regla que gobierna todo:** el deck es una **composición desde un catálogo cerrado de
> plantillas**. Se elige la plantilla por el **tipo de contenido** y se llenan sus **slots**.
> **Nunca** se inventa un layout para una lámina puntual.
>
> **Fuente de verdad técnica:** `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` ·
> ADR: `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`

---

## Por qué el catálogo es CERRADO (y el motivo no es estético)

> Si ningún tipo de contenido calza con lo que quieres decir, **eso es un GAP del catálogo** — ábrelo
> y diseña la plantilla con el molde. **No es una licencia para improvisar.**

**El motivo es comercial:** una propuesta la lee un **comité que COMPARA**. La cohesión visual es
**señal de rigor**; un deck que cambia de lenguaje cada tres láminas **se lee como un collage y
resta**.

**Y el motivo es de ingeniería:** el motor es **fail-closed**. Todo su diseño asume un contrato de
plantilla cerrado. Abrir la autoría a "ensamblar primitivas" **rompe el fail-closed** y reabre el
freehand por la puerta de atrás.

> ⚠️ **Las primitivas del molde son detalle INTERNO del catálogo, NO una superficie de autoría.**
> El `Plan` elige **una plantilla por nombre**. Nunca ensambla primitivas.
> **Modularizar por dentro es lo contrario de abrir por fuera.**

---

## Cómo se compone

> **Estado runtime (2026-07-12 — TASK-1393/1392/1391 shipped):** el motor vive en
> `src/lib/artifact-composer/**` (domain-free; el deck es el catálogo `catalogs/deck-axis/`).
> Hay DOS caminos y no se confunden:
>
> 1. **Exploratorio (autoría/iteración):** `pnpm deck:compose <plan.json> --out <dir>` — local,
>    sin DB, sin flag. Es donde se itera el argumento y se MIRAN los frames.
> 2. **Productivo (entregable de una Proposal):** `requestProposalRender` → job gobernado →
>    Cloud Run Job `artifact-worker` → PDF versionado en el asset store privado. Gates
>    fail-closed: audience por referencia (evidencia interna JAMÁS en un artefacto
>    client_facing), accesibilidad (PDF/UA exigido ⇒ rechazo), peso/páginas del RFP fijados,
>    deadline. Manual completo de uso y evolución:
>    `greenhouse-public-private-tenders/proposal-studio-runtime.md`.
>    **Delta 2026-09-16 (TASK-1846):** el Job `artifact-worker` es multiconsumidor (Proposal + Efeonce
>    Insights), está integrado al release control plane (primer deploy productivo: release
>    `917491fd02e4`) y el lanzador del Job vive fuera del motor (`src/lib/render-dispatch/job-runner.ts`);
>    el hash del manifest es del motor (`artifact-composer/manifest-hash.ts`).
>
> **La QA visual ya es MECÁNICA en ambos caminos** (`quality-gates.ts`, dentro del render):
> `missing_asset` (todo `<img>` con naturalWidth>0) · `font_fallback_detected` (familia sin
> FontFace declarada) · `blank_slide` (contraste local por tiles, calibrado contra el baseline).
> "Mirar los frames" sigue siendo el gate del CRAFT — estos detectores son el piso que no
> depende de que alguien mire.

```bash
pnpm deck:compose <plan.json> --out <dir>
```

El `Plan` (el JSON) es **el artefacto auditable**. El PDF es **derivado y re-componible** — si el
molde se corrige, el deck **se re-emite** sin re-autorarlo.

**Accounting:** elegir template, llenar slots, resolver geometría, componer, renderizar, exportar y hacer QA son
operaciones determinísticas con **0 Studio Credits**. El costo humano/plataforma vive en capacidad/gobierno. Un
asset generativo incluido en un slot conserva su propio run y ledger; el Composer no lo recobra por slide ni
convierte costo de provider en créditos. Reemitir el mismo plan o derivar otro target tampoco crea inferencia.

**El entregable es UN PDF de N páginas**, no un puñado de PNGs. El merge y el **gate de peso** son
parte del contrato: **los portales rechazan adjuntos sobre su límite** — el peso es **admisibilidad**,
no cosmética. *(Y el límite lo fijan **las bases**, no el portal. Ver [`evidence-integrity.md`](evidence-integrity.md).)*

### Catálogos de La órbita (marca propia Efeonce) — no son `deck-axis`

Desde el 2026-09-27 (TASK-1919, ampliado por TASK-1927) las láminas de «La órbita» con plantilla son un catálogo
propio, **`graphic-line-deck`** (PDF 16:9), con 16 `contentType`: `deck.proposal-cinematic` (+ `.hero`, `.lines`),
`deck.method-staircase`, `deck.section-classic`, `deck.section-split` (+ `.corner-bottom`, `.panel-end`),
`deck.content-measure`, `deck.triptych` y el marco `deck.cover-brochure`, `deck.cover-proposal` (+ `.dawn`),
`deck.close-brochure` (+ `.photo`) y `deck.close-proposal`. Viven junto a `graphic-line-stills` (heros web, caminero,
cuadros de motion) y `graphic-line-overlays` (capas de video con alfa). Tabla receta → `layout` → `contentType` y
campos del intent: [SKILL.md](SKILL.md) §«Componer hoy con `pnpm brand:compose`».

- **Se componen desde un intent de superficie**, no desde un `Plan` escrito a mano:
  `pnpm brand:compose -- --intent <intent.json>`. El mapper `src/lib/brand-surfaces` exige receta aprobada, valida con
  el contrato AXIS `efeonce.surface-composition` y deriva el `contentType`; el autor nunca elige plantilla (sigue
  vigente `TemplateAuthorityError`).
- **El contenido es dato del intent.** Foto (`photo.plateRef`, `photo.alt`), copy (`voice`, `body`) y sección
  (`progress`) se cambian en el intent y se vuelve a componer; la plantilla nunca se edita para una pieza. El intent
  de una pieza nueva vive fuera de `src/lib/brand-surfaces/examples/` (carpeta vigilada por el snapshot de
  `__tests__/example-plans.test.ts`). Qué cuidar al cambiar la foto: [SKILL.md](SKILL.md) §«Cambiar la foto, el copy o
  la sección de una lámina».
- **No se mezclan con `deck-axis`.** `deck-axis` es el catálogo de las ofertas a comité, con su molde y la línea base
  de SKY; meter ahí el fondo Efeonce, la voz con esfera o las fotos de cine degradaría lo que protege. Un deck de
  marca propia que necesita láminas sin plantilla combina `brand:compose` con el resto del deck armado con el oficio
  de esta skill (maqueta declarada); una receta nueva entra al catálogo sólo con la aprobación del operador.
- **La pintura de la selección y del CTA se inyecta** (`createCatalog({ selectionPainter, ctaPainter })`): el catálogo
  no importa paquetes.
- **Gate:** `pnpm composer:visual-gate --catalog=graphic-line` (32 frames a 0 px desde TASK-1927; altas y cambios
  declarados en `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`, entradas 2026-09-27 b–e; runbook
  `docs/operations/runbooks/composer-visual-gate.md`). Norma: `EFEONCE_SURFACE_COMPOSITION_V1.md` §2.1.
- **Contrato 0.1.2, integrado (TASK-1927, 2026-09-27; local en `develop`).** Greenhouse fija
  `@efeoncepro/axis-tokens` 0.3.14 y `@efeoncepro/axis-ui-contracts` 0.3.12. El mapper lee `use` y `layout` (el que
  resolvió AXIS, nunca inferido) y el marco vive en `src/lib/brand-surfaces/recipes/frame.ts`. Un intent 0.1.0 o 0.1.1
  resuelve igual.
- **Documentos.** Un intent con `pages` compone **un PDF multipágina** con su manifest `axis.surface-document.v1` y su
  procedencia (`planSurfaceDocument` en `src/lib/brand-surfaces/document.ts`, que valida con
  `resolveSurfaceDocument` de AXIS). Un solo issue (`brochure-cover-first`, `brochure-close-last`,
  `brochure-needs-service-page`, `document-line-mismatch`, `frame-photo-must-alternate`, …) deja el documento sin
  componer: nunca se arma página por página para esquivar la validación ni se «adivina» el manifest a mano. El
  documento completo no tiene frame en el gate (usa fotos reales); lo cubren sus páginas.
- **Portadas y contraportadas (operador, 2026-09-27).** `cover-classic` y `close-classic` **no se usan**: el
  operador no las aprobó, en AXIS quedan `supersededBy` y no tienen plantilla. El marco aprobado sí la tiene:
  `cover-brochure` (con foto), `cover-proposal` (sin foto, logo del cliente), `close-brochure` (`orbit` sin foto,
  `photo` con foto) y `close-proposal` (con foto, «Empower your Growth»). Portada con foto ↔ contraportada sin foto, y
  al revés. La producción idempotente de los plates es TASK-1926. Norma: `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6;
  resumen en [SKILL.md](SKILL.md) §«Portadas y contraportadas».
- **Recetas por lámina (operador, 2026-09-27): las 69 láminas del canvas «Deck» están aprobadas** y cada una tiene su
  receta en `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json` (esquema
  `efeonce.deck-slide-recipes.v1`; índice humano en el README de esa carpeta, regenerado con `pnpm brand:deck-recipes`).
  Para el composer, la receta es el **contrato de slots** de la plantilla: cada `slots[]` trae `name`, `type`
  (`text`, `richText`, `number`, `metric`, `list`, `image`, `logo`, `person`, `money`, `date`, `enum`, `section`),
  `required` y `maxChars` **medido en la referencia aprobada** (lo que cabe sin cruzar la órbita ni al sujeto);
  `fixed[]` es lo que la plantilla quema y el autor no toca; `selection` declara el objetivo para
  `efeonce.collaboration-selection`; `pairsWith` (`cover↔close`, `variant`, `sequence`) alimenta la validación del
  documento. **El `id` de la receta reutiliza el de AXIS cuando existe** (`content-pricing`, `decision-next-steps`,
  `method-staircase`…); los nuevos son kebab-case en inglés. **El catálogo de recetas sirve para elegir la lámina; se
  compone con el intent de AXIS.** Hoy componen las de la tabla de [SKILL.md](SKILL.md) (sección partida por la
  izquierda y tríptico de una palabra por toma incluidos): **31 de las 69** caen en una plantilla (lista por id en el
  README del catálogo); las **38 restantes no tienen plantilla: TASK-1928**.
  **Nunca** se agrega una plantilla sin su receta ni una receta sin la aprobación del operador.

### Destinos editables posteriores — no confundir fuente, conversión ni renderer

**Hoy sólo existe PDF contractual + PNG de revisión.** Los dos destinos siguientes aceptados son
**PPTX nativo editable** y, después, **Adobe Express REST editable**. En ambos, el `Plan`/manifest sigue
siendo la fuente de verdad: agente o persona cambia slots y vuelve a emitir; nunca usa un archivo
externo como nueva fuente silenciosa.

- **PPTX:** se genera con texto, formas, barras e hitos nativos; no se convierte PDF/PNG/HTML. Un
  `TimelineFull` mantiene su geometría derivada del schedule y su `barLabel` como texto editable.
- **Adobe Express REST:** Greenhouse crea variaciones por API de templates Express nativos etiquetados;
  no hay Add-on en el flujo de producto. Sólo reemplaza tags texto/imagen/video: cada Gantt coincide
  con una estructura de matriz o el target aborta. Importar PDF nunca es renderer.
- Todo target declara soporte por plantilla y falla cerrado si no puede representar el contenido. No se
  rasteriza o simplifica una lámina en silencio para "hacerla exportar".

Fuente canónica: `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` → ADR *PDF contractual, luego PPTX nativo y
Adobe Express REST*.

---

## Las bug classes del motor — lecciones que costaron caro

**Léelas.** Todas se descubrieron **en producción**, sobre una licitación real, y **todas pasaban los
tests**.

### 1ª — El FALLO SILENCIOSO

**El peor bug posible acá:** la lámina sale con **el contenido de ejemplo del prototipo** y nadie se
entera. Un deck llegando al comité con el copy de relleno.

Apareció tres veces: un campo sin `data-slot-field` → el filler no escribía. Un tipo no implementado
→ el KPI decía **"3/3"** cuando el dato era **"4/4"**. El tono del blueprint contagiando a los items
→ **los dos planes marcados como "el propuesto"**.

> **Cerrada de raíz: cualquier tipo o campo que el filler no sepa llenar ABORTA el deck.**
> **NUNCA** agregues un `default:` silencioso ni un `continue` que deje pasar un slot sin escribir.

### 2ª — El contrato que MIENTE sobre lo que CABE

La tesis de una lámina salió **amputada a media palabra** en el PDF (`…se vuelve sosteni|`) y el
composer lo dio por bueno. **El copy había pasado validación con holgura** (100 de 150 caracteres).

La causa era **aritmética**: `grid-template-columns: 30% 35% 35%` + `gap: 46px`. **Los porcentajes de
Grid no descuentan el gap** → los tracks se salían 20px del lienzo y `overflow:hidden` los cortaba
**sin emitir nada**.

> **NUNCA asumas que "pasó `maxCharacters`" significa "cabe".** El contrato declara una intención;
> **el único juez de la geometría es el layout real.**
> **Y NUNCA dejes que un recorte sea silencioso: un PDF con una palabra guillotinada es PEOR que un
> fallo, porque parece terminado y nadie lo revisa dos veces.**

### 3ª — "Tiene contrato" ≠ "es componible"

El catálogo se declaraba **25/25 con contrato ✅** y la doc prometía que el composer podía llenarlas
todas. **Era falso: 7 de 25 reventaron** al componer la primera oferta real. **Nadie las había
ejercitado.**

> **Tener un `slots.json` no es ser componible.** Hoy hay un guard en CI que **sintetiza un payload
> desde cada contrato e intenta llenar las 25**. "Componible" pasó de promesa de la doc a **hecho
> verificable**.

### 4ª — El chrome que depende de DÓNDE vive en el DOM

Una plantilla **puede verse bien y estar mal armada**, y solo se nota en el frame. La firma de URL
perdía su blend según la lámina: `mix-blend-mode` se mezcla con el backdrop de **su** contexto de
apilamiento, y **21 de 22** plantillas la tenían fuera del `.slide`.

Y un hito de timeline rotulado *"Semana 1"* con `at: 1` **caía en el cierre del Mes 1** → **la lámina
afirmaba una fecha falsa**. Eso no es un bug de layout: **es fabricación.**

---

## ⚠️ La lección operativa que manda sobre todas

> # Los tests verdes NO son el gate de un deck.
>
> Cuatro pasos numerados todos como **"01"**. Párrafos aplanados **con las comas del join a la
> vista**. La firma sin blend. **Todo eso pasaba los 92 tests.**
>
> **Los encontró una revisión VISUAL.**

**SIEMPRE mirar los frames. TODOS. No una muestra.**

Y el corolario que vale para todo este oficio: un artefacto que **parece terminado** es más peligroso
que uno que falla, porque **nadie lo revisa dos veces**.

---

## La geometría se deriva del DATO, siempre

**Los prototipos tienen barras con anchos hardcodeados.** Si el composer solo cambiara los NÚMEROS,
**la barra seguiría midiendo lo del ejemplo** — un gráfico que exagera (o esconde) la mejora real.

> **En una oferta eso no es un bug de layout: es FABRICACIÓN GRÁFICA.**

Por eso existen los **resolvers de geometría**: el ancho de la barra sale de su valor, la posición del
hito sale de su fecha, la brecha sale de la diferencia real. **Si el resolver no se aplica, el
composer DEBE abortar la lámina.**

**Una barra sin dato es una barra que miente.**

### Colecciones y brechas derivadas — el contrato gobierna el DOM

Un array no se rellena tomando “el primer hijo que haya” en el HTML. Si el contrato declara
`itemSelector`, ese es el blueprint repetible; si declara `fixedChildren`, esos nodos se preservan al
reconstruir la colección. Un selector o fijo que no matchea el DOM **aborta**: el orden casual del
prototipo no es un fallback válido.

El chrome que el dato no sostiene se elimina mediante una operación **explícita del resolver**, nunca se
deja como residuo del blueprint. En un gráfico comparativo:

- el valor visible debe coincidir con el número que determina la barra;
- el callout de brecha se deriva de las mismas series, no lo escribe el autor;
- si la serie destacada ya lidera, la brecha es cero y **no se dibuja** un callout ficticio;
- si falta una serie destacada única, el dato no puede explicarse y el composer aborta.

El caso canónico es `ChartSplit` (TASK-1394): 25/25 plantillas componibles, con fixtures revisados
visualmente para brecha positiva y cero. Esta regla es del **Composer**, no de una plantilla concreta.

---

## `TimelineFull` — cronograma data-driven

Use `TimelineFull` cuando la lámina comunica **duración, solapes, entregables o hitos en el tiempo**.
Un proceso lógico sin duración pertenece a `ProcessStepsFull`; no se simula un Gantt para hacerlo más
ornamental.

El `DeckPlan` expresa el schedule, no su dibujo:

```ts
{
  timeUnit: 'day' | 'week' | 'month' | 'quarter' | 'custom',
  timeAxis: ['Mes 1', 'Mes 2', 'Mes 3'], // 3..8 unidades ordenadas
  phases: [{
    kind: 'work' | 'continuous',
    startUnit: 1,                         // entero, inclusivo
    endUnit: 2,                           // entero, inclusivo
    title: 'Diagnóstico',
    description: '...',
    barLabel: 'Movimiento desde la primera semana' // opcional, editable
  }],
  milestones: [{ at: 1, label: 'Baseline', caption: 'Fin Mes 1' }]
}
```

- `startUnit`, `endUnit` y `at` son fronteras enteras del eje (`1..N`); un hito se sitúa al **fin** de
  su unidad.
- `barLabel` es contenido estructurado, no texto metido en el HTML. Puede usarse en barras sólidas y
  punteadas, incluso si la fase ocupa una sola unidad.
- El compiler deriva de ese único schedule la grilla, el rango de cada barra, los diamantes, sus
  conectores y los anclajes de etiquetas de borde. No se editan porcentajes ni líneas a mano.
- `assertSlideFitsCanvas` mide el resultado real: si el `barLabel` (u otro texto) se recortaría, el
  compose aborta. No se borra la etiqueta para “hacerlo pasar”; se acorta el copy o se corrige el plan.

Fuentes canónicas: `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` → `TimelineFull`,
`docs/architecture/tender-deck-composer-prototypes/timeline-full.slots.json` y el ejemplo real
`docs/commercial/tenders/sky-blog-2026/deck-plan.json`.

---

## Enlaces, páginas de agenda y la garantía de reutilización (2026-07-14)

Tres capacidades del motor que cambian lo que un deck puede afirmar:

1. **Un deck que se LEE puede enlazar su evidencia viva — y navegarse.** La agenda salta a la página real de cada capítulo (anotaciones GoTo derivadas del plan vía sentinel `deck.internal`, convertidas en el merge; un sentinel sin destino se descarta). Además: `<a href="https://…">` en un rich-slot
   sobrevive el sanitizador (sólo `https://`; todo otro atributo se borra), Chromium lo imprime como
   anotación `/Link` y el merge la porta al PDF final (pdf-lib `copyPages` la descartaba — bug real,
   medido). El molde estila el anchor (color heredado + subrayado). ⚠️ Verificar anotaciones **vía API
   pdf-lib** (`page.node.Annots()`), nunca grep sobre los bytes: los object streams comprimen los dicts.
2. **La agenda funge como agenda**: cada capítulo lleva su número de página REAL, derivado por hook del
   plan (`targetSlideId` → posición viva). Reordenar el deck recalcula las páginas. **NUNCA** se autoran
   — un deck reordenado con páginas a mano se contradice solo (misma bug class que los ordinales).
3. **El copy del prototipo no puede fugarse a otra propuesta.** Un slot opcional no provisto se LIMPIA
   en el render (`absent-optional`): los prototipos están escritos contra un cliente real, y sin el
   barrido, el deck del siguiente cliente heredaba ese copy. Guard mecánico: un probe por plantilla que
   llena **sólo los required** y falla si un opcional conserva texto/imagen del prototipo.

## Hard rules

- **NUNCA** dibujes una lámina freehand. Si no hay plantilla, **hay un gap de catálogo**.
- **NUNCA** el `Plan` ensambla primitivas. **Elige una plantilla por nombre.** El catálogo es cerrado.
- **NUNCA** un `default:` silencioso en el filler. **Fail-closed o nada.**
- **NUNCA** asumas que pasó la validación de caracteres = cabe.
- **NUNCA** geometría dibujada a mano. **Se deriva del dato, siempre.**
- **NUNCA** edites porcentajes, grilla o conectores de `TimelineFull`; escribe el schedule y deja que el
  compiler los derive.
- **NUNCA** borres `barLabel` para pasar una fase corta. Es copy editable; si no cabe, el renderer debe
  rechazarlo y el autor debe resolver el contenido o el schedule.
- **NUNCA** declares un deck listo sin **MIRAR TODOS LOS FRAMES**. Los tests verdes no son el gate.
- **SIEMPRE** el `Plan` es el artefacto auditable; el PDF es derivado y re-componible.
- **SIEMPRE** preserva el lineage/ledger de un asset generativo insertado, sin imputar el render del deck como
  nueva operación generativa.
