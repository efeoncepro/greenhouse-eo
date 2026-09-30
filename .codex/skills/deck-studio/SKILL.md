---
name: deck-studio
description: >-
  Skill experta de DISEÑO Y ARMADO DE DECKS al estado del arte 2026 — el "estudio" que
  convierte un mensaje en un ARGUMENTO sobre láminas y lo entrega como pieza que sobrevive
  al comité, al PDF ajeno y a la lectura sin orador. Dos manos: (1) el craft fundado
  (arquitectura narrativa — Minto/SCQ, Assertion-Evidence de Garner & Alley, la única
  evidencia experimental que existe sobre diseño de láminas; arquetipos de deck; densidad y
  carga cognitiva — Mayer/Sweller; storytelling de datos — Zelazny/Knaflic), y (2) la
  ejecución (el deck se COMPONE desde un catálogo cerrado con el Artifact Composer, nunca se
  dibuja freehand; evidencia trazable; entrega que no se rompe). Domain-free: sirve a
  licitaciones, pitch de venta, QBR, board deck, readout de diagnóstico y webinar.
  Triggers: "deck", "láminas", "slides", "presentación", "pitch", "propuesta visual",
  "keynote", "QBR", "board deck", "armar el deck", "diseñar una presentación", "storyline",
  "narrativa del deck", "action title", "PPT", "PowerPoint", "brochure", "portada",
  "contraportada", "recetas del deck", "qué lámina uso", "deck Salesforce", "deck SEO", "deck SV360". En marca
  propia Efeonce, elige láminas del catálogo de 100 recetas aprobadas (docs/operations/brand-graphic-line/deck-recipes/;
  incluye las nueve SEO/AEO, las 16 del deck de práctica Salesforce y las seis del deck SEO/AEO), valida el plan con
  pnpm brand:deck-plan (o pídele al agente que lo proponga con --propose), liga los datos reales de los slots con
  --bind (TASK-1930) y compón las 94 que tienen plantilla (las seis del deck SEO/AEO todavía no), o el documento
  completo, con pnpm brand:compose.
---

# deck-studio — el deck es un ARGUMENTO, no una pila de láminas

> **Qué es:** la skill del **oficio de los decks**. Decide **qué decir, en qué orden, con qué
> evidencia y en qué forma**, y después lo **compone** (no lo dibuja).
>
> **Domain-free por diseño.** Un deck no es una licitación. Sirve igual a una oferta a comité,
> un pitch de venta, un QBR con un cliente, un readout de diagnóstico, un board deck o un
> webinar. La skill de **licitaciones** (`greenhouse-public-private-tenders`) es un **consumer**
> de ésta, no su dueña.
>
> **Todas las fuentes están verificadas.** Bibliografía + **la lista de mitos que NO se citan**:
> [`SOURCES.md`](SOURCES.md). Esta skill **no cita de memoria**.

---

> 🏆 **Hito 2026-09-23:** SKY Blog (Wherex) es la **primera licitación ganada** con el flujo agéntico de licitaciones —método de `greenhouse-public-private-tenders` + Artifact Composer, operado por el operador con un agente— y en una **cuenta de talla enterprise** (SKY Airline). No todo el mérito es del flujo (pesaron la relación, la ronda 2 y la negociación humana), pero es la primera validación en el mercado de lo construido. El deck de esa oferta se compuso con el método de esta skill y el Artifact Composer.

## Pie institucional de decks Efeonce

Cuando se solicite la contraportada institucional, reutiliza `BackCoverFull` del Artifact Composer. Su bloque de redes y contacto pertenece a esa composición oficial de cierre; no se replica como pie en las otras láminas. En un brochure o una propuesta de marca propia con La órbita, la contraportada es la del set aprobado el 2026-09-27 (§«Portadas y contraportadas», más abajo), con su propio bloque de redes y contacto.

El pie de una lámina lleva como máximo la URL bubble oficial. No hereda dirección, teléfonos, separadores ni folio de un informe escrito, aunque se exporte a PDF A4. Mantén los logos oficiales en la composición. Canon: `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`.

**Excepción aprobada (2026-09-25): el deck de Efeonce Insights.** Su pie lleva logo, edición, URL bubble y folio «NN / total», sin dirección ni teléfonos; los demás decks conservan la regla anterior. Ese deck es además la referencia aprobada de lámina de evidencia (cifra principal y título a la izquierda, gráfico en panel a la derecha, franja «Lo que significa / Próximo paso») y de color de datos por rol. Detalle en el estándar, sección «Delta 2026-09-25», y en `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`. El catálogo `insights-deck` del Artifact Composer ya lo implementa en producción (desde 2026-09-26, sólo la versión aprobada).

### Línea gráfica «La órbita» en decks de marca Efeonce (canónica desde 2026-09-25)

Aplica a decks de la marca propia Efeonce y su familia (Globe, Wave, Reach cambian sólo el acento); no a decks con
marca de cliente ni a Greenhouse. Contrato: [manual](../../../docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)
§1.3 y §10.1; referencia operativa y checklist: [graphic-line-orbit.md](../efeonce-brand-studio/references/graphic-line-orbit.md).

- **La órbita es la navegación.** Portada con un arco corto; cada sección suma su tramo; el cierre completa la
  órbita con la esfera arriba. En las láminas de contenido en papel, la órbita baja a 80 px en la esquina.
  (Delta 2026-09-27: en brochure y propuesta, la portada y la contraportada aprobadas son las de foto o de órbita
  gigante de «Portadas y contraportadas» más abajo; la portada de arco corto era la clásica, ya retirada.)
- **El arco mide:** en navegación, el tramo corresponde a la sección real en que va el deck; un arco de dato sólo
  existe con un dato real que se pueda citar. Nunca un arco decorativo.
- **Ningún texto cruza la órbita**, una sola por lámina, fuera de eje hacia arriba a la derecha; margen de 140 px
  en 16:9.
- **Pie:** la URL va en la burbuja oficial `url-lum` (regla de pie de arriba); en un PDF donde la fusión de
  luminosidad no esté garantizada, la variante horneada de `docs/operations/brand-graphic-line/deliverables/assets/`.
  Esa burbuja de pie es propia del deck: **no** es la firma de una pieza gráfica. Si una lámina se reutiliza como
  post, anuncio o portada con foto, firma con el logo de Efeonce centrado abajo y la burbuja sólo lo reemplaza
  cuando el logo ya está en la imagen (regla del 2026-09-26, en la referencia operativa).
- **Eslogan «Empower your …»** sólo en el cierre, desde el archivo oficial: nunca en cada lámina, nunca con esfera,
  nunca en mayúsculas, **nunca en la portada** (operador, 2026-09-27). En la contraportada de una propuesta comercial
  es el mensaje principal; en la de un brochure firma debajo de «¿Conversamos? Cuando quieras.» (ver «Portadas y
  contraportadas» abajo).
- Valores desde los tokens `efeonceGraphicLine` (`@efeoncepro/axis-tokens`) y logos/burbujas desde
  `@efeoncepro/axis-brand-assets`, nunca HEX, px ni archivos transcritos. La órbita
  de navegación se compone por intención con `progress` (`sections`, `current`) en `pnpm creative:orbit:render`;
  ver [graphic-line-orbit.md](../efeonce-brand-studio/references/graphic-line-orbit.md). Las cuatro láminas
  (portada, sección, contenido, cierre) están medidas una por una en `efeonceGraphicLine.pieces.deck` y se
  reproducen (fuera de Greenhouse, `deckSlideHtml` de `@efeoncepro/axis-graphic-line`): un solo anillo por lámina.
- **Íconos (canónicos desde 2026-09-26, sólo marca propia):** en un deck van en **Trazo** (lo que se mide); Plastilina
  sólo en una lámina de Brand, nunca mezclada con Trazo en el mismo grupo. Glifos de `ICON_CATALOG` pintados con
  `resolveIcon` de `@efeoncepro/axis-graphic-line/icons` (en Greenhouse lo pinta `pnpm brand:compose` en las recetas de
  La órbita; fuera de esa ruta, `pnpm icons:export` en AXIS);
  **nunca un ícono dibujado a mano**: el que falta se da de alta con `icons:check` y aprobación. En una fila: 48–56 px,
  espacio ≥ un ícono, etiqueta opcional en Poppins y nunca en el acento; **responde uno solo** (el servicio que se
  vende o la sección donde vamos) en el acento de la línea **del deck**, y ninguno si la lámina ya tiene esfera
  (órbita, título o voz con esfera). Cerrar con `auditIconGroup`. Criterio:
  [iconography.md](../efeonce-graphic-line/references/iconography.md); guía completa en AXIS `docs/agent-composition/iconography.md`.
  **Plastilina en volumen** (D24, 2026-09-27; arcilla mate, PNG con alfa de AXIS vía `volumeIconUrl(glyph)`): sólo como
  objeto protagonista de la **portada o el cierre**, uno por lámina, ≥ 160 px; **nunca** en láminas de contenido,
  filas de íconos ni junto a plano o Trazo, y nunca regenerado.

#### El deck como superficie: recetas `proposal-cinematic` y `method-staircase` (2026-09-27)

Desde el 2026-09-27 la línea se compone **por superficie** y el deck es una de ellas: norma
[`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md)
§4.6, página «Deck» del [canvas por superficie](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7)
(empieza por su lámina «Guía · cómo componer …») y guía AXIS `docs/agent-composition/surfaces/deck.md` (en `main` de AXIS;
[página del Lab](https://axis.efeonce.org/references/surfaces/deck/)).

- **Cómo se pide una lámina de marca propia:** intent con `surface: "deck"`, `format`, `role`, `recipe`, `line`, voz,
  prueba y pasos. **Si la receta está aprobada, `pnpm brand:compose -- --intent <intent.json>`** la compone entera en
  el Artifact Composer (catálogo `graphic-line-deck`, PDF 16:9; ejemplos en
  `src/lib/brand-surfaces/examples/deck-*-intent.json`; desde TASK-1927 sobre el contrato
  `efeonce.surface-composition` 0.1.2, y un intent 0.1.0 o 0.1.1 resuelve igual). Qué tiene plantilla y con qué
  `layout`: subsección «Componer hoy con `pnpm brand:compose`» más abajo. Si una receta no tuviera plantilla (hoy
  sólo las seis nativas del deck SEO/AEO, que tampoco están en AXIS todavía: se hornean fuera del compositor hasta
  TASK-1949),
  `pnpm surface:resolve` en AXIS → los `delegates` van a `pnpm creative:orbit:render` (voz, órbita), la selección y
  `resolveIcon`. Valores desde `efeonceGraphicLine.surfaces.deck` y `pieces.deck`; **nunca coordenadas en la lámina**.
- **Recetas aprobadas: las 78 láminas de la página «Deck»** (69 el 2026-09-27 y nueve SEO/AEO el 2026-09-28). Ya no
  hay opciones en el deck.
  Antes de proponer o armar una lámina de marca propia, **elige la receta del catálogo** (subsección «Recetas por
  lámina» de abajo). Correcciones de ese día, ya en las plantillas (TASK-1927): la sección partida sube por la
  **izquierda** (tres composiciones por `layout`) y el tríptico lleva una palabra por toma, cada una con su esfera
  («Escucha.» «Crea.» «Mide.»).
- **Fondo Efeonce en toda lámina de línea**; la línea de servicio sólo cambia el acento. Una órbita por lámina; la
  selección toma una sola cosa; viñetas sin esfera. Lámina con foto sin logo: firman portada y cierre; burbuja URL en
  el pie.
- **`proposal-cinematic`** (vender un servicio con una imagen que se recuerda): foto de cine a sangre, **sujeto a la
  derecha mirando a cámara**, lo digital o el servicio **en acción** y el color saliendo de la escena; voz a la
  izquierda en el espacio oscuro (eyebrow «Nuestra propuesta · \<línea\>», pregunta con anillo, respuesta con esfera);
  selección «Cliente» sobre la respuesta; bajada; **prueba con fuente**; hasta cuatro pasos con íconos de la voz de la
  línea en reposo (Brand = Plastilina, el resto Trazo) y el **rótulo del primer paso en blanco o suave, nunca en el
  acento** (texto < 24 px); burbuja URL en el pie; sin logo ni indicador. Foto: registro cine con personas del equipo
  en su **uniforme por registro** (o Nexa), cámara a ~2 m y 85 mm, **isotipo oficial compuesto** sobre la prenda
  lisa (nunca el del modelo), nunca dos personas mirándose de cerca. Los **mini robots agentes** son el hilo visual
  entre láminas. Aprobadas: servicios creativos («¿Tu marca en cada pantalla? En todas.»), web («¿Para quién es tu
  web? Para todos.»), carrera de Nexa («¿Listos para la carrera? Vamos.»), RevOps («¿Tu CRM vende contigo? Con
  agentes.»), AEO («¿Te encuentra la IA? Visible.») y líneas de servicio con Nexa; ninguna pendiente. En esta última,
  las cinco esferas de luz que orbitan a Nexa son **luz de la foto, no la esfera de la voz** (la respuesta cierra con
  una sola) y es la única lámina con los cinco acentos (cada nombre de la pila en el suyo, ≥ 24 px); no se copia.
  Rechazadas: servicios creativos en Plastilina, la carrera v1, Nexa y un director mirándose de cerca, líneas de
  servicio con Nexa sin punch.
- **`method-staircase`** (el método por niveles, **sin foto**: la escalera es la imagen): peldaños de vidrio que se
  iluminan al subir y el nivel de llegada en bloque sólido en el acento de la línea. Aprobada con BeX (cinco
  peldaños; el quinto, Be Intrinsic, en Engine).
- **Artifact Composer (TASK-1919, TASK-1927 y TASK-1928, 2026-09-27):** el catálogo **`graphic-line-deck`** (PDF
  16:9) tiene plantilla para **las 78 láminas** del catálogo de recetas, con 57 plantillas: TASK-1927 dejó 30 láminas
  sobre 16 plantillas (`proposal-cinematic`, `method-staircase`, secciones, medida, tríptico y el marco), TASK-1928
  sumó las 38 restantes sobre 34 plantillas y TASK-1934 las nueve SEO/AEO (siete plantillas nuevas; las dos propuestas
  SEO reutilizan `ProposalService` y `ProposalCinematic`). La portada con selección,
  `cover-brochure-cine-lines-selection`, compone desde el 2026-09-28 con el layout `document-selection` (AXIS 0.3.21). El
  `contentType` es `deck.<receta>` o `deck.<receta>.<layout>` y lo deriva el mapper. Está separado de **`deck-axis`**,
  que sigue siendo el catálogo de las ofertas a comité con la línea base de SKY: **nunca mezcles** una lámina de La
  órbita en un deck de `deck-axis` ni al revés. Gate: `pnpm composer:visual-gate --catalog=graphic-line`. Detalle:
  subsección «Componer hoy con `pnpm brand:compose`» y [composition.md](composition.md) §Catálogos de La órbita.
  Montos siempre `[MONTO]`.
- **Portadas y contraportadas de brochure y propuesta** (operador, 2026-09-27): foto ↔ sin foto, mensaje de la
  contraportada por documento, voz en portada y logo a 500 px. Todo en la subsección «Portadas y contraportadas
  (aprobado 2026-09-27)» más abajo.
- **Deck de práctica Salesforce (aprobado 2026-09-29, TASK-1942; 94 recetas, todas con plantilla desde `f05c26e2f`).**
  Diecinueve láminas en cinco actos que venden la práctica RevOps & CRM sobre Salesforce; 16 recetas nuevas (familia
  `line-stage`) y cuatro usos de recetas existentes. **Se arma de dos formas según el documento:** como **brochure**
  (`cover-brochure-line-revenue` en la línea `revenue-salesforce` → cuerpo → `close-brochure-orbit`, SF20, aprobada
  el 2026-09-29) o como **propuesta** (`cover-proposal-orbit` → el mismo cuerpo → `close-proposal-horizon` en
  `sloganBlock`, SF19, logo de 700 px). Planes golden:
  `src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-{brochure,proposal}-salesforce.json` (validar con
  `pnpm brand:deck-plan -- --plan <fixture>`). **PDF de la propuesta y del brochure ya renderizados, con la insignia
  de partner:** `ai-generations/2026-09-29_deck-salesforce/out/Efeonce-{Propuesta,Brochure}-Servicios-Salesforce.pdf`
  (`render-src/pdf-propuesta.mjs`; no están en git). La insignia «Salesforce Partner» está **autorizada por
  Salesforce** (operador, 2026-09-29) y va por defecto en portada y contraportada de propuesta
  (`partnerMark.readbackRef: "salesforce-partner-authorization-2026-09-29"`); logo e íconos de producto, también autorizados. Antes de
  enviarlo: Claude y Claudeforce (SF16) exigen la autorización escrita de Anthropic, hoy pendiente; Agent Astro es una
  edición interpretativa, sólo por ruta local. Detalle y condiciones: norma §4.6 «Deck de práctica Salesforce», manual
  `docs/manual-de-uso/creative/componer-deck-con-recetas.md` y skill `efeonce-graphic-line`
  (`references/applications.md` §L). La serie HubSpot equivalente es TASK-1943.
- **Deck SEO/AEO — Search Visibility 360 (aprobado 2026-09-30, TASK-1949; 100 recetas, 94 con plantilla).** El
  ejemplo de **deck de práctica con submarcas**: SV360 es la marca paraguas y cada lámina que habla de una pieza lleva
  su lockup (`productMark`: SV360, AEO, AEO Assessment, AI Visibility Report, Insights; uno por lámina; en la AEO de
  cine reemplaza el eyebrow con `requiredUnless`). Tres documentos: **completo** (33, brochure extendido), **brochure**
  (24) y **propuesta** (29), cinco capítulos con el mismo `progress.sections`. Parte de los planes
  `src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-{completo,brochure,proposal}-seo.json` y de los intents
  `src/lib/brand-surfaces/examples/deck-seo-{completo,brochure,propuesta}-document.json`. Seis recetas nuevas **sin
  plantilla todavía** (`content-brand-family`, `content-service-mockups`, `content-report-formats`,
  `content-committee-deck`, `content-industries`, `content-markets`: el plan avisa `recipe-without-template` y el PDF
  aprobado se hornea con `ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/bake.cjs`). **Los datos van
  tal cual** por decisión del operador (2026-09-30: «Deja esos datos... No marques nada en el deck como provisional,
  asumo la responsabilidad»): cifras de los casos, su fuente, formatos de Insights, industrias y Bresler, sin rotular
  ni quitar; el contexto queda como registro en `DECISIONES.md`. Logos de clientes sólo con su autorización
  (TASK-1937). Anotaciones «de ejemplo» fuera de la lámina; una sola sección partida. Detalle: norma §4.6 «Deck SEO/AEO», manual «El deck SEO/AEO» y
  `efeonce-graphic-line` (`references/applications.md` §L); el uso comercial por objeción, en `seo-aeo-practice`.
- **Contrato 0.1.2 y el brochure (2026-09-27).** Guía AXIS `docs/agent-composition/surfaces/deck.md` (§«Dos usos»,
  §`proposal-cinematic`, §«El documento») y ejemplo `docs/examples/surfaces/deck-brochure-servicios-document.json`.
  **Integrado en Greenhouse** (TASK-1927 y TASK-1928, ambas `complete` y en `origin/develop`): `pnpm brand:compose`
  compone sobre la 0.1.2 y sus deltas. **Versiones vigentes (`package.json`, 2026-09-28):**
  `@efeoncepro/axis-tokens` **0.3.23** y `@efeoncepro/axis-ui-contracts` **0.3.21** (tag AXIS `v0.3.23`). La serie de
  TASK-1928 fue `v0.3.15`…`v0.3.21`, una por familia (deltas (f)…(l) del ADR AXIS
  `SURFACE_COMPOSITION_DECISION_V1.md`; la (l) es el layout `document-selection` de `cover-brochure`); TASK-1934 sumó
  `v0.3.22` (delta (m): las nueve láminas SEO/AEO) y `v0.3.23` (delta (n): las medidas que pidieron sus plantillas). Historia en la
  skill `efeonce-graphic-line` (`references/ledger.md`).
  - **Uso** (`use: 'proposal' | 'brochure'`, sin él es `proposal`): toda receta **aprobada** admite los dos; una opción
    sólo `proposal` (`use-not-for-recipe`). El brochure es un **PDF horizontal 16:9 que se lee sin presentador**
    (pregunta 1 de abajo: el artefacto se defiende solo). Las láminas `proposal-cinematic` sirven para propuesta y
    brochure; en el brochure son la **página de servicio** y el eyebrow nombra el servicio («Web», «AEO»), no «Nuestra
    propuesta» (copy del autor: el contrato no lo valida).
  - **`layout` de `proposal-cinematic`:** `service` (por defecto; exige pregunta, respuesta y bajada; prueba opcional,
    hasta cuatro pasos) · `hero` (la escena protagonista, Nexa en la partida; exige eyebrow, pregunta, respuesta y
    bajada; sin prueba ni pasos) · `lines` (el portafolio; exige eyebrow y `body`; sin pregunta, respuesta, prueba ni
    pasos; la pila sale de `efeonceGraphicLine.lines` y el intent sólo elige `lines`; la selección toma el grupo, con
    «Nexa» abajo a la derecha; lleva logo porque la marca es el sujeto). `selection.anchor` mueve la esquina del
    colaborador (RevOps: `bottom-end`).
  - **El marco clásico no se usa.** `cover-classic` (logo arriba a la izquierda, arco corto) y `close-classic`
    (órbita completa con el logo dentro) **no fueron aprobadas por el operador** como portada ni contraportada: en
    AXIS quedan `supersededBy` y Greenhouse no tiene plantilla para ellas. No las ofrezcas ni las pidas en un intent:
    usa las recetas de la subsección «Portadas y contraportadas» de abajo.
  - **Portada y contraportada cinematográficas, con Nexa:** `BR1b` («Nexa frente a la órbita») y `BR3` («Nexa camina
    hacia la órbita») son plates del registro cine. Desde TASK-1927 entran por las recetas del marco: `BR1b` es plate
    de `cover-brochure` y lámina de apertura de la sección de servicios (nunca las dos en el mismo documento); `BR3`
    es plate de `close-brochure` layout `photo` y de `close-proposal`. Su anillo de luz **es** la órbita de la pieza:
    no se le agrega otra.
  - **El documento** (`resolveSurfaceDocument` / `validateSurfaceDocumentIntent`, manifest `axis.surface-document.v1`;
    `pnpm surface:resolve` lo detecta por `pages`): en un brochure la portada va primero (`brochure-cover-first`), el
    cierre al final (`brochure-close-last`) y hay al menos una `proposal-cinematic` con `layout: 'service'`
    (`brochure-needs-service-page`). `surface`, `format`, `use`, `line` y `sections` se propagan a las páginas que no
    los declaran; la navegación es una sola (portada 0, cierre `sections`); portada y cierre llevan siempre la línea
    del documento (`document-line-mismatch`) y una página de servicio puede declarar la suya; la foto alterna entre
    portada y cierre (`frame-photo-must-alternate`). Greenhouse lo compone entero con `pnpm brand:compose`
    (subsección «Componer hoy con `pnpm brand:compose`»).
  - **La foto** de estas láminas se rige por el
    [registro cine](../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) (fuente vigente desde
    el 2026-09-27: cámara, la línea como luz, vestuario, robots, reservas, trampas y barra de juicio). Esta skill no
    dirige la foto: la pide por ficha (`pnpm foto:*`).

#### Portadas y contraportadas (aprobado 2026-09-27)

Decidido por el operador en la página Deck del
[canvas por superficie](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7). La norma, las parejas
y el detalle viven en [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md)
§4.6: esto es el resumen operativo. Vale para brochure y propuesta comercial de marca propia (no para `deck-axis`).

**Tres reglas.**

1. **Foto ↔ sin foto.** Si la portada lleva fotografía, la contraportada va sin fotografía, y al revés.
2. **El mensaje de la contraportada depende del documento.** Propuesta comercial: **«Empower your Growth»** grande y
   protagonista, en sus pesos oficiales (la propuesta llega después de conversar: «¿Conversamos?» no aplica).
   Brochure: **«¿Conversamos? Cuando quieras.»** (pregunta–respuesta) con el eslogan como firma debajo (el brochure
   abre la conversación).
3. **La portada habla con la voz de la línea** (§4 del manual): eyebrow (Poppins 500, mayúsculas espaciadas) ·
   pregunta (Poppins Light 300, anillo en el acento) · respuesta (Bricolage 760, esfera en el acento, 1–3 palabras,
   ≥ 3× la pregunta) · evidencia (Poppins 400, una palabra en negrita). Nunca un título suelto tipo «Servicios 2026».

Y además: el **eslogan nunca en la portada** (recarga, repite la respuesta y la esquina inferior derecha es del
sujeto o la órbita) · **logo de Efeonce a 500 px en 1920** en portada y contraportada (≥ 473 px =
`efeonceGraphicLine.logo.minScreenPx`, 96 px en un teléfono de 390 px) · **ningún texto cruza la órbita ni al
sujeto**: la columna vive en el 45 % izquierdo oscuro; si cruza un haz, una mano o la órbita, se acorta la frase
(«¿Qué hacemos por tu marca?» → «¿Qué hace Efeonce?»; «¿Dónde pongo el presupuesto?» → «¿Dónde invierto?») o se parte
la evidencia en 2–3 líneas.

**Catálogo aprobado (compacto; plates bajo `ai-generations/`).**

- **Brochure, portada general con foto** (registro cine, sin cliente): logo 500 · «Brochure · Servicios 2026» ·
  «¿Qué hace Efeonce?» (anillo teal) · **«Crecer.»** (esfera teal) · «**Cinco** líneas de servicio: Growth · Brand ·
  Engine · Voice · Revenue». ✅ Las cuatro aprobadas el 2026-09-27: Nexa frente a la órbita
  (`cover-brochure-cine-orbit`, `2026-09-27_brochure/plates/BR1b-…`), Nexa y las cinco esferas + burbuja URL
  (`cover-brochure-cine-lines`, `2026-09-26_deck-nexa/plates/NX6b-…`), Nexa y el equipo con agentes
  (`cover-brochure-cine-team`, `2026-09-27_brochure/plates/BR2b-…`) y la de cinco líneas con selección y cursor de
  Nexa sobre «Crecer.» (`cover-brochure-cine-lines-selection`). Esta última **compone desde el 2026-09-28** con el
  layout `document-selection` (el operador relajó la regla «sin selección en cover-brochure»): selección de ocho
  tiradores sobre «Crecer.», nunca sobre la persona, un solo cursor «Nexa» abajo al final; firma con el logo, sin
  burbuja URL.
- **Brochure, una portada por línea** (✅ las cinco): anillo y esfera en el acento de la línea
  (`efeonceGraphicLine.lines`), eyebrow «Brochure · \<Línea\>» y como evidencia las categorías de la línea en
  `docs/services/` (conteo en negrita; textos exactos en §4.6). Sus pares quedaron **aprobados** (salen de
  «candidatos» del banco del §4):

  | Línea (token) | Par | Plate |
  |---|---|---|
  | Growth Strategy & Measurement (`growth`) | ¿Lo medimos? **Siempre.** | `2026-09-26_deck-hibrido/plates/HW1-mismo-trabajo.png` |
  | Creative Services (`brand`) | ¿Quién crea mi contenido? **Tu squad.** | `2026-09-28_portada-creativa/plates/CR4-el-squad-te-la-entrega-v2.png` |
  | Digital Services & Engineering (`engine`) | ¿Te encuentra la IA? **Visible.** | `2026-09-26_deck-web/plates/WB1c-web-para-todos-bordado.png` |
  | Media & Distribution (`voice`) | ¿Dónde invierto? **Donde rinde.** | `2026-09-27_portadas-lineas/plates/LN4-voice-distribucion.png` |
  | RevOps & CRM (`revenue-hubspot`) | ¿Y el reporte del viernes? **Ya lo viste.** | `2026-09-26_deck-revops/plates/RV1b-motor-de-revenue-isotipo.png` |

  Desde el 2026-09-28 la portada «Tu squad.» usa **`CR4`** («El squad te la entrega»): antes compartía `CR2b` con la
  lámina `proposal-cinematic-creative` y un brochure con las dos marcaba `plate-repeated`. `CR2b` queda sólo para esa
  lámina. Caso y checklist para reemplazar el plate de una pieza aprobada: registro cine §16.7
  (`docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md`); se aprueba con la pieza compuesta, nunca
  con el frame del probe.

  Pendiente opcional: la variante RevOps Salesforce (acento cielo).
- **Brochure, contraportadas** (✅ las tres): Nexa camina hacia la órbita (foto, `BR3-contra-horizonte`), Nexa y un
  agente hacia la órbita al amanecer (foto, `BR4-contra-amanecer`) y **la órbita gigante sin foto** (SVG, sin plate;
  corchetes abiertos + cursor propio sobre «Cuando quieras.»), que es la pareja de las portadas de brochure con foto.
  Bloque común: logo 500 · «¿Conversamos? Cuando quieras.» · eslogan de firma · burbuja URL + redes (Spotify,
  Instagram, LinkedIn, Threads, YouTube, TikTok) · correo, dos teléfonos y dirección.
- **Propuesta, portadas sin foto con el logo del cliente** (✅ las cuatro: dos plantillas + su ejemplo con SKY): eyebrow
  «Propuesta comercial · Octubre 2026» · «¿Cómo crecemos en 2027?» · **«Con foco.»** · «Preparada para **[Cliente]** ·
  Confidencial» · burbuja URL alineada a la columna. **La órbita gigante sostiene el logo** (caja fija 460×200 dentro
  de la órbita) o **la órbita sale como el sol** (amanecer, eje central, logo 480, texto centrado, caja 340×130 dentro
  del domo). El nombre del cliente nunca se repite como título: vive en la evidencia y en su logo, que sale de la
  biblioteca del composer (SKY: `sky-on-dark.svg`). La órbita gigante sin foto es recurso de **esta** portada, no de
  la del brochure.
- **Propuesta, contraportadas con foto** (✅ las dos): BR3 (hacia la órbita) y BR4 (al amanecer) con logo 500 ·
  **«Empower your Growth»** a 72 px como mensaje principal (Empower ExtraBold itálica, your ExtraBold, Growth Black
  itálica en teal) · burbuja URL + redes · contacto completo. Sin «¿Conversamos?».
- **Láminas interiores de sección:** «¿Qué hace Efeonce? Crecer.» con Nexa frente a la órbita abre la sección de
  servicios (brochure o propuesta); ✅ «¿Quién hace crecer tu marca? Este equipo.» (Nexa + equipo + agentes) abre la
  del equipo; la escalera BeX es lámina interior, junto a la BeX original.

**Columna de voz (1920×1080, medida en los prototipos; referencia para revisar, no para transcribir):** la
plantilla toma sus valores de los tokens de AXIS y quien compone sólo elige `column.topPx`. x = 140; desde un `top` de 200–300 → logo 500 px en top · eyebrow 22 px en
top+190 · pregunta 40 px en top+238 · respuesta 124 px Bricolage 760, line-height .95, en top+300 (+28 con selección) ·
evidencia 28 px/1.3 Poppins 400 a 34 px bajo la respuesta (130 con selección, para la etiqueta del colaborador) ·
respuesta cerrada con `answerHtml` (esfera 0,2 em en el acento) · burbuja URL abajo a la izquierda (bottom 51–72).
Cierre de propuesta: eslogan 72 px en top 420 y bloque de contacto en 600.

**Plate de portada** (registro cine; la foto la dirige `design-studio` y se pide por ficha `pnpm foto:*`): sujeto en
la mitad derecha, de la cintura arriba, 85 mm a ~2 m, mirando al lente; el 45 % izquierdo, estudio oscuro y calmo (sin
haces, objetos ni órbita); lecho oscuro abajo; la luz de acento es la de la línea. Ficha de ejemplo:
`ai-generations/2026-09-27_portadas-lineas/fichas/LN4-voice-distribucion.json`.

**Selección y cursores en portada:** sólo sobre la columna de texto o el logo del cliente, nunca sobre la persona; en
16:9, un solo cursor (propio o de un colaborador). Quedaron en: portadas de propuesta (marco de 8 manijas sobre el logo
del cliente + colaborador «Cliente» o «SKY»), sección de servicios (8 manijas + cursor propio sobre «Crecer.») y
contraportada de órbita gigante (corchetes abiertos + cursor propio sobre «Cuando quieras.», invitación a actuar). Las
fotos de cine, por defecto, sin interfaz.

**Descartado (no lo ofrezcas):** portadas clásicas de propuesta del contrato (logo 230) y su versión a 500 px; anillo
completo con el logo del cliente al centro; órbita gigante como portada de brochure; cierre clásico AXIS (logo 220)
como contraportada; portadas genéricas (clásica de brochure, sólo logo); contraportadas partidas y la v4 centrada;
«Plastilina en su órbita» y «Tipográfica XXL» sin foto.

**Estado (2026-09-27, TASK-1927):** el set es receta del contrato y tiene plantilla en `graphic-line-deck`. Se
compone con `pnpm brand:compose` (subsección siguiente); ya no se arma como maqueta. La producción idempotente de los
plates sigue siendo TASK-1926 (registro cine / `foto:*`): los plates viven fuera de git, bajo `ai-generations/`.
Diferencias conocidas contra los prototipos: el tamaño de «Cuando quieras.» (la plantilla usa el valor del token, algo
mayor que el prototipo), la burbuja URL sale horneada en vez de la de luminosidad, y la caja de selección sale del
pintor canónico y queda unos píxeles más ajustada. El operador aprobó a ojo las láminas compuestas el 2026-09-27.

#### Componer hoy con `pnpm brand:compose` (TASK-1927 y TASK-1928, 2026-09-27)

Dos pasos distintos: **elegir** qué lámina usar se hace con el catálogo de recetas
(`docs/operations/brand-graphic-line/deck-recipes/`, subsección siguiente); **componerla** se hace con el intent de
AXIS (`efeonce.surface-composition`). El `id` del catálogo de recetas nombra la lámina aprobada
(`cover-brochure-cine-orbit`, `close-proposal-horizon`); el intent usa la receta de AXIS y su `layout`
(`cover-brochure` + `document`, `close-proposal`). El ejemplo de cada una lleva el nombre de la lámina:
`src/lib/brand-surfaces/examples/deck-<lámina>-intent.json`. Las páginas de servicio (`proposal-cinematic` layout
`service`) no tienen ejemplo suelto en esa carpeta: están como páginas de `deck-brochure-document.json` y
`deck-proposal-document.json`.

**El flujo completo de hoy (deck o brochure de marca propia):**

1. **Elige la lámina** en el catálogo de 78 recetas (subsección «Recetas por lámina»). Para un deck o documento
   entero, escribe primero el **plan** (ids de receta en orden) y valídalo con
   `pnpm brand:deck-plan -- --plan plan.json` hasta que no quede ningún error (subsección «Plan del deck»).
2. **Mira su plantilla.** Las 78 tienen plantilla; la lista por id del catálogo, con su receta y `layout` de
   AXIS, está en el [README del catálogo](../../../docs/operations/brand-graphic-line/deck-recipes/README.md)
   §«Qué sale hoy con un comando» (columna «Plantilla», leída del `registry.json`). `recipe-map.json` ya no tiene
   recetas `blocked`: la portada con selección (`cover-brochure-cine-lines-selection`) compone con el layout
   `document-selection`. No hay recetas que vayan como maqueta de dirección.
3. **Escribe el intent** en un archivo propio (ver «El contenido es dato del intent» abajo), partiendo del ejemplo de
   la lámina.
4. **Compón** la pieza o el documento: `pnpm brand:compose -- --intent <intent.json> [--out <dir>] [--artifact-id <id>]`.
   Sin `--out`, sale en `.captures/brand-surfaces/<id>/` (el id es el nombre del archivo sin `-intent.json`):
   `<id>.pdf` (16:9), `01-<slug>.png` + `.pdf` (la lámina suelta, para revisar), `deck-plan.json`,
   `<id>.manifest.json`, `<id>.surface-manifest.json` (el manifest de AXIS que la gobernó) y `<id>.provenance.json`. Si falla, lee la tabla «Qué falla y por qué» de abajo. Ojo: ese `deck-plan.json` es el `Plan` del
   composer (plantillas ya resueltas), **no** el `plan.json` de recetas que valida `pnpm brand:deck-plan`.
5. **Revisa a ojo** el PNG o el PDF contra la referencia aprobada de la lámina (canvas «Deck» o AXIS
   `references/surfaces/deck/<id>.jpg`). El gate visual cubre las plantillas con sus datos de prueba, no tu pieza.
   Componer no aprueba ni publica.

**Recetas con plantilla** (`recipe` + `layout` del intent → `contentType` que deriva el mapper; el autor nunca lo
elige):

| Receta | `layout` | `contentType` | Notas |
|---|---|---|---|
| `proposal-cinematic` | `service` (o sin layout) | `deck.proposal-cinematic` | página de servicio; la prueba es opcional; hasta cuatro pasos |
| `proposal-cinematic` | `hero` | `deck.proposal-cinematic.hero` | la escena protagonista; selección sobre la respuesta; sin prueba ni pasos |
| `proposal-cinematic` | `lines` | `deck.proposal-cinematic.lines` | la pila de líneas sale de los tokens y el intent sólo elige cuáles con `lines`; selección del grupo; logo junto a la frase; única lámina con los cinco acentos |
| `section-classic` | — | `deck.section-classic` | sin cambios |
| `content-measure` | — | `deck.content-measure` | sin cambios |
| `method-staircase` | `steps` (o sin layout) | `deck.method-staircase` | escalera de vidrio; la selección toma un nivel (`selection.level`) |
| `section-split` | `corner-top` (o sin layout) | `deck.section-split` | indicador por la izquierda |
| `section-split` | `corner-bottom` | `deck.section-split.corner-bottom` | |
| `section-split` | `panel-end` | `deck.section-split.panel-end` | panel a la derecha, foto espejada |
| `triptych` | — | `deck.triptych` | una palabra por toma, cada una con su esfera; una toma con más de una palabra falla |
| `cover-brochure` | `document` · `line` | `deck.cover-brochure` | uso brochure; foto de cine a sangre + columna de voz; sin selección ni burbuja URL |
| `cover-brochure` | `document-selection` | `deck.cover-brochure.document-selection` | misma plantilla `CoverBrochure`; selección sobre «Crecer.» y un cursor «Nexa» (receta `cover-brochure-cine-lines-selection`); sin burbuja URL |
| `cover-proposal` | `orbit` | `deck.cover-proposal` | uso proposal; **sin foto**; logo del cliente con la selección sobre su caja; burbuja URL |
| `cover-proposal` | `dawn` | `deck.cover-proposal.dawn` | ídem, la órbita sale como el sol |
| `close-brochure` | `orbit` | `deck.close-brochure` | uso brochure; sin foto; cursor del lector con corchetes sobre la respuesta |
| `close-brochure` | `photo` | `deck.close-brochure.photo` | uso brochure; con foto |
| `close-proposal` | — | `deck.close-proposal` | uso proposal; con foto; sin voz: el mensaje es el eslogan «Empower your Growth» |

**Recetas con plantilla desde TASK-1928** (id del catálogo → receta y `layout` del intent; el ejemplo de cada una es
`src/lib/brand-surfaces/examples/deck-<id>-intent.json`):

| Familia | Láminas (id del catálogo) | Receta + `layout` del intent |
|---|---|---|
| Propuestas sobrias | `proposal-service-aeo` · `-creative` · `-web` · `-revops` | `proposal-service` (una plantilla para las cuatro) |
| Método | `method-staircase-flat` · `method-score-ring` · `method-hybrid-workforce` · `-scene` · `decision-plan` | `method-staircase` + `flat` (la escalera sigue siendo la principal) · `method-score-ring` · `method-hybrid-workforce` (+ `scene`) · `decision-plan` |
| Cotización y cierre | `content-pricing` · `-stage` · `-live` · `decision-next-steps` · `breather` | `content-pricing` (`table` por defecto, `stage`, `live`) · `decision-next-steps` · `breather` |
| Prueba | `content-focus` · `content-clients` · `content-partners` · `decision-risk` · `decision-case` · `decision-chart` · `decision-testimonial` · `decision-why-us` | la receta del mismo nombre, sin `layout` |
| Secciones y quiénes somos | `section-lens` · `section-bleed` · `section-cine-team` · `-services` · `-about` · `-purpose` · `content-team` · `content-stack` | `section-cine` + `team` (por defecto) · `services` · `about` · `purpose`; las demás, su receta |
| Contenido y día a día | `contact-sheet` · `content-text` · `content-bullets` · `content-day` · `-tools` · `-live-progress` · `-live-results` · `decision-agenda` | `content-day` + `clock` (por defecto) · `tools` · `live-progress` · `live-results`; las demás, su receta |

**Recetas con plantilla desde TASK-1934 (SEO/AEO, aprobadas el 2026-09-28):**

| Láminas (id del catálogo) | Receta + `layout` del intent | Plantilla |
|---|---|---|
| `decision-ai-answer` · `decision-ai-market` · `method-surround-cycle` · `decision-difference` · `method-eeat` · `decision-traffic-to-revenue` · `decision-diagnosis-map` | la receta del mismo nombre, sin `layout` (estilo «vivo» de AXIS) | una propia cada una (`DecisionAiAnswer`, `DecisionAiMarket`, `MethodSurroundCycle`, `DecisionDifference`, `MethodEeat`, `DecisionTrafficToRevenue`, `DecisionDiagnosisMap`); builders en `src/lib/brand-surfaces/recipes/seo-aeo/` |
| `proposal-service-seo` | `proposal-service` (`line: "engine"`); la lente lleva el plate de cine SE1 y lee `photo.focus` | `ProposalService` (reutilizada) |
| `proposal-cinematic-seo` | `proposal-cinematic` + `service` (`line: "engine"`), con la nota del pie y la bajada bajo la selección | `ProposalCinematic` (reutilizada) |

El mapa completo de las 78 (id del catálogo → receta + `layout` del intent → `contentType` → plantilla) está en
[composition.md](composition.md) §«Mapa receta → plantilla». Fuente de verdad:
`src/lib/artifact-composer/catalogs/graphic-line-deck/recipe-map.json` (receta → `contentType` + ejemplo) y
`registry.json` (plantilla → `contentTypes`); si difieren de esta skill, manda el código.

**Cómo elegir la composición dentro de una receta:** el `useWhen` / `avoidWhen` de la lámina en el catálogo manda,
y la composición sale del id (el `layout` del ejemplo de la lámina es el correcto):

- `cover-brochure`: `document` (portada general: `-cine-orbit`, `-cine-lines`, `-cine-team`) · `line` (una por línea
  de servicio: `-line-growth|brand|engine|voice|revenue`) · `document-selection` (sólo `-cine-lines-selection`).
- `cover-proposal`: `orbit` (la órbita gigante sostiene el logo del cliente) · `dawn` (la órbita sale como el sol).
- `close-brochure`: `orbit` (sin foto, la pareja de toda portada de brochure) · `photo` (existe, no es pareja).
- `proposal-cinematic`: `service` (página de servicio) · `hero` (Nexa protagonista) · `lines` (el portafolio).
- `section-split`: `corner-top` · `corner-bottom` · `panel-end` (foto espejada).
- `section-cine`: `team` abre el equipo, `services` la sección de servicios, `about` es «quiénes somos» y `purpose`
  «por qué lo hacemos» (van en secuencia).
- `content-day`: `clock` (los cuatro momentos) · `tools` (herramientas) · `live-progress` (el avance en curso) ·
  `live-results` (los resultados).
- `content-pricing` (sólo en propuesta): `table` para lectura, `stage` para sala, `live` cuando el alcance ya está
  acordado.
- `method-staircase`: `steps` (la principal) · `flat` (BeX plana); `method-hybrid-workforce`: `ladder` · `scene`.

**Reglas del contenido que la plantilla hace cumplir:**

- **Los largos del catálogo mandan.** El `maxChars` de cada slot de la receta es el `maxCharacters` del `slots.json`
  (un test de paridad los mantiene iguales) y el compositor **falla** si un texto se pasa (`overflow=reject`): se
  acorta la frase, nunca se agranda la caja ni se edita la plantilla.
- **Toda cifra con fuente.** Las cifras entran por `figures` del intent (valor, rótulo y **fuente obligatoria**) y la
  lámina imprime «Fuente: …». Sin fuente real, se quita la cifra; nunca «Datos de muestra» para esconder una cifra sin
  fuente. Las tres de `decision-ai-market` salen de `docs/documentation/public-site/aeo-landing-elementor.md` §market
  (HubSpot 2026, McKinsey 2025, SparkToro 2026): cambiarlas exige citar ese documento, nunca memoria.
- **Datos de muestra, marcados (y sólo donde la receta es de muestra).** `decision-ai-answer` (`mark`: «Ejemplo
  ilustrativo…») y `decision-diagnosis-map` (`sampleMark`: «Datos de muestra») traen datos ilustrativos: mientras
  `dataOrigin` sea `illustrative` (por defecto) la marca es obligatoria y sin ella falla con `invalid-intent`; con
  `dataOrigin: "client"` se exige `evidenceRef` (TASK-1930).
- **Interfaz de IA genérica.** Nunca el cromo de ChatGPT, Gemini u otro motor (logo, color, burbuja, composer); los
  nombres de los motores sólo como texto en `decision-diagnosis-map`. La interfaz real son los recursos AEO de AXIS
  (`pnpm aeo:compose` en el repo AXIS), no estas recetas.
- **Montos como `[MONTO]`** en toda cotización; el **contacto** sale de `EFEONCE_CONTACT`
  (`src/config/efeonce-brand.ts`), nunca del intent.
- **Logos de clientes y partners** sólo de quienes autorizan su uso; el compositor los normaliza (un tono, mismo peso
  óptico). Las decisiones de norma que ya hornean las plantillas (acento, 3×, sin logo ni velo en láminas con foto)
  están en la skill `efeonce-graphic-line`.

**Qué portada con qué contraportada** (regla foto ↔ sin foto; el contrato la valida con
`frame-photo-must-alternate`):

| Documento | Portada | Contraportada |
|---|---|---|
| Brochure | `cover-brochure` (siempre con foto; `document` para la general, `document-selection` para la de cinco líneas con selección, `line` para la de una línea de servicio) | `close-brochure` layout `orbit` (sin foto) |
| Propuesta | `cover-proposal` (siempre sin foto; `orbit` o `dawn`) | `close-proposal` (con foto) |

`close-brochure` layout `photo` existe como plantilla, pero no es pareja de una portada con foto. Las contraportadas
de brochure llevan «¿Conversamos? Cuando quieras.», el eslogan como firma, redes y contacto; el contacto sale de
`EFEONCE_CONTACT` (`src/config/efeonce-brand.ts`), AXIS sólo define el estilo.

**Campos del intent que elige quien compone** (tipo `AxisSurfaceCompositionIntent` en AXIS
`packages/contracts/src/surface-composition.ts`; **copia siempre el ejemplo de la lámina**, porque cada receta suma sus
campos propios — `plans`, `risks`, `bars`, `team`, `tools`, `topics`, `partners`, `quote`, etc. — que lee su builder en
`src/lib/brand-surfaces/recipes/`):

- Cabecera: `contract: "efeonce.surface-composition"`, `version: "0.1.2"`, `surface: "deck"`, `format: "16x9"`,
  `theme: "dark"`, `role`, `recipe` (la de AXIS, no el id del catálogo), `line`.
- `use`: `proposal` | `brochure`. Sin él, AXIS resuelve el de la receta.
- `layout`: **siempre explícito** en lo que compones; la plantilla usa el que resolvió AXIS, nunca lo infiere de los
  campos presentes.
- `voice`: `{ eyebrow, question, answer }`; `answer` es un arreglo de líneas (`["Casi", "siempre"]`), **sin punto**
  (lo pone la esfera) y de 1–3 palabras (`decision-testimonial` admite hasta 6: cita al cliente textual).
- `body`: la bajada o la evidencia; `**palabra**` marca la negrita y los saltos de línea se respetan.
- `figures`: `[{ value, label, source }]`, **`source` obligatorio** (la lámina imprime «Fuente: …»).
- `steps`: `[{ kicker, name, desc }]` (propuesta de servicio; hasta cuatro); `levels`: `[{ name, descriptor? }]`
  (escalera); `note`: nota al pie, nunca una cifra sin fuente.
- `selection`: `{ target, label, participantKind, level?, box?, anchor? }`. `target` ∈ `answer`, `cta`, `object`,
  `level`, `lines`, `client-logo`; `level` (desde 1) elige el peldaño de la escalera; `anchor` la esquina del
  colaborador. En las recetas de prueba y contenido que eligen **un ítem** (la cifra, el logo, la fila del riesgo, la
  barra, el tema de la agenda), el ítem va en `selected` (desde 1) en la raíz del intent; en la cotización, el plan
  elegido es `recommended` (+ `recommendedLabel`). Fuera de rango falla con `invalid-intent`.
- `column.topPx` (portadas con columna): alto de la columna de voz. Se elige **mirando la foto** (el sujeto manda) y
  debe caer dentro de la reserva del logo que define el token; fuera de rango falla con `invalid-intent`. Sin él, va
  el valor por defecto del token.
- `clientLogo: { path, alt }` (portadas de propuesta): archivo SVG o PNG del logo del cliente y su `alt`
  obligatorio. Sin `clientLogo` sale el marcador «Logo del cliente».
- `body` de una portada es la **evidencia**: una palabra en negrita marcada con `**palabra**` (si no se marca, va la
  primera); los saltos de línea se respetan.
- `lines` (sólo `proposal-cinematic` layout `lines`): cuáles líneas entran a la pila; el contenido sale de los tokens.
- `photo`: `{ register, subject, plateRef, alt, focus? }`. `plateRef` es el plate bajo `ai-generations/` (sin el
  archivo, el CLI falla antes de crear la salida); `alt` obligatorio; `focus: { xOfWidth, yOfHeight }` (0–1) dirige
  el recorte hacia ese punto sólo en las recetas que lo leen (sin él, recorte centrado; `section-split` no lo lee).
- `progress`: `{ sections, current }` en las láminas con indicador.
- **Documento:** `pages` (ver «Documento completo» abajo).

**Qué falla y por qué** (el CLI imprime `✗ <mensaje>` y un `· {issue}` por problema; nunca entrega una pieza a medias):

| Código | Causa | Qué hacer |
|---|---|---|
| `surface-issues` | AXIS rechazó el intent; los `issues` traen el código real: `voice-answer-too-long`, `figure-source-required`, `figure-value-required`, `selection-not-in-recipe` (p. ej. selección en `cover-brochure` `document`/`line`), `layout-not-in-recipe`, `layout-field-required` / `layout-field-not-allowed`, `photo-register-invalid`, `cine-requires-nexa-or-proposal`, `frame-photo-must-alternate`… | corrige el campo que nombra el issue; nunca cambies la receta ni el token |
| `invalid-intent` | lo valida Greenhouse: `column.topPx` fuera de la reserva del logo, `selected` fuera de rango, una página del documento mal formada | ajusta el valor al rango que dice el mensaje |
| `missing-photo` | falta `photo.plateRef` o `photo.alt` | agrega los dos |
| `recipe-not-approved` | la receta no está `approved` en el token | no se compone; pide la aprobación |
| `recipe-without-template` | receta aprobada sin builder ni plantilla | hoy no ocurre en el deck (78/78); en otra superficie, es trabajo de plantilla |
| `recipe-outside-composer` | la pieza no la compone el composer (p. ej. `audiovisual.close-reveal`) | se produce por su ruta (motion) |
| `overflow=reject` | un texto excede el `maxCharacters` del `slots.json` (= `maxChars` de la receta), o se sale de su caja al renderizar | **acorta la frase**; nunca agrandes la caja ni edites la plantilla |
| auditoría renderizada (`accent-text-min-size`, 3×) | sólo en el gate visual: acento en texto < 24 px, o respuesta < 3× la pregunta en `content-pricing` (+ `.stage`/`.live`), `content-clients`, `decision-plan`, `content-partners` y las siete SEO/AEO de TASK-1934 | es un defecto de plantilla, no de tu intent: repórtalo |

**El contenido es dato del intent; la plantilla nunca se edita para una pieza.** La foto, el copy y la sección de una
lámina viven en el intent. Los HTML, los `slots.json` y los builders de `graphic-line-deck` y `src/lib/brand-surfaces`
son de todas las piezas: si tocas uno para que «tu» lámina salga distinta, cambias todas y rompes el gate visual. Para
una pieza nueva **crea un intent propio fuera de `src/lib/brand-surfaces/examples/`**: copia el ejemplo de la lámina a
tu carpeta de trabajo y edita la copia. Esa carpeta está vigilada por un snapshot
(`src/lib/brand-surfaces/__tests__/example-plans.test.ts`): editar un ejemplo o dejar ahí el intent de un cliente
rompe la prueba.

**Cambiar la foto, el copy o la sección de una lámina:**

| Qué cambias | Campo del intent |
|---|---|
| La foto | `photo.plateRef` (ruta del archivo) y `photo.alt` |
| El copy | `voice` (eyebrow, pregunta, respuesta) y `body` |
| La sección | `progress` (sección n de N) |

Después se vuelve a componer:

```bash
pnpm brand:compose -- --intent <tu-intent>.json
```

Qué cuidar al cambiar la foto:

- **`photo.alt` es obligatorio** y describe la escena, no el copy. Sin él falla con `missing-photo`.
- **El plate debe existir en disco.** Vive fuera de git, bajo `ai-generations/**`; si falta, el CLI falla antes de
  crear la salida.
- **El recorte es centrado.** El CLI ajusta la foto al tamaño que pide la receta, cubriendo el área y centrada. En la
  sección partida la franja de foto mide 1.260 × 1.080 px sobre un lienzo de 1.920 × 1.080; en las láminas a sangre,
  el lienzo completo.
- **La sección partida no tiene control de foco.** Su builder no lee `photo.focus`. Si el sujeto queda cortado, usa
  una foto con otro encuadre. Agregar foco a esa receta exigiría un cambio en AXIS y otro en Greenhouse: no está
  hecho ni registrado como task, así que no lo prometas.
- **En `panel-end` la foto va espejada** (la plantilla aplica el espejo que declara AXIS). Una foto con texto legible
  o con un logo saldría al revés. El isotipo del uniforme se compone aparte: revísalo en esa composición.
- **El registro de la foto lo valida AXIS.** Las secciones partidas admiten personas en luz dramática (registro cine,
  excepción aprobada) o documental.
- **En portadas con columna, revisa `column.topPx`** al cambiar la foto: se elige según dónde queda el sujeto.

Qué **no** cambia al cambiar la foto: el panel, la esquina curva, el indicador y la columna de voz. Eso lo fija la
composición (`layout`); si necesitas otra disposición, cambia de `layout`, no de plantilla.

**Documento completo (brochure o propuesta).** Un intent con `pages` es un documento:
`{ contract?, version?, surface: 'deck', format, use, line?, sections?, pages }`. Cada página es un intent que puede
omitir lo que el documento propaga.

```bash
pnpm brand:compose -- --intent <documento.json> [--artifact-id <id>] [--out <dir>]
```

Entrega en `.captures/brand-surfaces/<id>/`: `<id>.pdf` (un solo PDF multipágina 16:9),
`<id>.surface-document-manifest.json` (`axis.surface-document.v1`), `<id>.provenance.json`
(`efeonce.brand-surface-document.provenance.v1`: sha del intent, plates, archivos y versiones AXIS) y, además, un PNG
y un PDF por página.

- **Un solo issue deja al documento sin componer**: ni páginas parciales. Greenhouse no reimplementa reglas; valida
  `resolveSurfaceDocument` de AXIS. Códigos: `brochure-cover-first`, `brochure-close-last`,
  `brochure-needs-service-page`, `document-line-mismatch`, `frame-photo-must-alternate`, `document-pages-required`,
  `document-surface-invalid`, y los de una página con prefijo `page[i]:<code>`.
- **Ejemplos:** `src/lib/brand-surfaces/examples/deck-brochure-document.json` (nueve páginas: portada, cuatro
  servicios, hero de Nexa, líneas, escalera, contraportada) y `deck-proposal-document.json` (siete páginas
  interiores). Parte de uno de ellos, no de un JSON en blanco.
- Función pura: `planSurfaceDocument(intent, { artifactId })` en `src/lib/brand-surfaces/document.ts`.

**Sección partida:** el indicador sube por la **izquierda** y barre las secciones ya recorridas, (n−1) de N.
**Pregunta abierta del operador** (está anotada en el token): ¿unificar a n de N como el resto de la navegación? No
lo decidas por tu cuenta: la plantilla sigue el token.

**Estado (2026-09-28).** TASK-1927 y TASK-1928 están `complete`, aprobadas a ojo por el operador y empujadas a
`origin/develop`: las 69 recetas de entonces componen, gate `--catalog=graphic-line` a 0 px en 66 frames.
**TASK-1934 (en curso):** las nueve SEO/AEO componen (78 de 78) y el operador las aprobó a ojo el 2026-09-28, junto con
la nota del pie de la plantilla cine; sus siete frames y el re-congelado de `ProposalCinematic` (la nota mueve el probe)
se congelaron en `c652f4f83` (ledger (o)): el gate queda en 73 frames a 0 px. **Lo que todavía no
está** (no lo afirmes como hecho): la ruta productiva gobernada (API, worker, MCP) es **TASK-1921, `in-progress` en
otra sesión** — no la describas como disponible ni toques sus archivos (`src/lib/brand-surfaces/production/**`);
`pnpm brand:compose` es el taller local. TASK-1929 (plan de deck validado contra el catálogo y propuesta del agente)
está **code complete en `develop` local**, `in-progress` hasta docs y gates de cierre (subsección «Plan del deck»).
TASK-1930 (datos reales en los slots: `bindDeckSlots` y `--bind`) está **`in-progress`** con los Slices 1–4 y 7
entregados; montos y equipo esperan TASK-1417 y TASK-1418 (subsección «Datos reales en los slots»). Siguen TASK-1931 (banco de plates gobernado), TASK-1932 (Proposal Studio arma
el deck desde recetas: confirmación humana, API, Nexa y MCP del plan) y TASK-1933 (pendientes de QA del catálogo).
El documento completo no tiene frame propio en el gate visual (usa fotos reales): lo cubren sus páginas.

#### Recetas por lámina: el catálogo de las 78 (aprobado 2026-09-27 y 2026-09-28)

**Fuente:** [`docs/operations/brand-graphic-line/deck-recipes/`](../../../docs/operations/brand-graphic-line/deck-recipes/README.md)
— `EFEONCE_DECK_SLIDE_RECIPES_V1.json` (esquema `efeonce.deck-slide-recipes.v1`) + README con el índice por familia y
documento (`pnpm brand:deck-recipes` lo valida y regenera). Norma: `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6, «Recetas
por lámina». Manual: `docs/manual-de-uso/creative/componer-deck-con-recetas.md`.

**Cómo se usa (en este orden):**

1. **Documento → portada y contraportada.** Propuesta: portada sin foto con el logo del cliente (`cover-proposal-orbit`
   o `-dawn`) + contraportada con foto y «Empower your Growth» (`close-proposal-horizon` o `-dawn`). Brochure: portada
   con foto (`cover-brochure-cine-*` o `cover-brochure-line-*`) + `close-brochure-orbit`. Pitch y QBR: no hay portada
   propia en las 78; si el catálogo remite a `cover-classic` / `close-classic`, **no las uses** (el operador no las
   aprobó y no tienen plantilla): pregunta al operador qué marco usar. Ojo: el validador del plan **sí las acepta** en
   pitch y QBR (y en ningún otro documento) y no avisa que no tienen plantilla; que el plan pase no las vuelve
   componibles.
2. **Esqueleto por familias** (`cover`, `section`, `about`, `content`, `method`, `proof`, `proposal-service`,
   `pricing`, `next-steps`, `breather`, `close`) y, en cada tramo, la receta por su `useWhen` / `avoidWhen`; si no
   calza, su `preferInstead` (`[{ recipe, when }]`) dice cuál usar y cuándo. Cada receta trae también `documents`
   (en qué documento va), `communicates` (qué afirma la lámina) y `reference` (la imagen aprobada).
3. **Pares** (`pairsWith: [{ recipe, relation }]`): `cover↔close` (alternar foto y sin foto), `variant` (son
   **alternativas**: se elige una y la otra **no entra al deck, ni seguida ni separada** —decisión del operador del
   2026-09-28, código `variant-both-in-deck`—: tabla, escena o cotización en vivo; escalera o BeX plana; propuesta SEO
   sobria o de cine) y `sequence` (van juntas —quiénes somos y por qué lo hacemos; sección y página de
   servicio; cotización en vivo y riesgo—, **sin dirección**: no hay regla de orden, ver «Plan del deck»).
4. **Slots** con su `maxChars` **medido** en la referencia: si no cabe, se acorta; la respuesta se escribe sin punto
   (lo pone la esfera); `money` siempre `[MONTO]`; `metric` con fuente; `logo` sólo de clientes que autorizan su uso.
   Tú escribes sólo los slots de **voz**: los de **datos** (logo del cliente, cifras, casos, testimonios, logos de
   terceros, montos, equipo, datos de muestra) no se escriben a mano, se ligan en el paso 5b.
5. **Valida el plan** con `pnpm brand:deck-plan -- --plan plan.json`: corrige todo error, lee los avisos
   (subsección siguiente).
5b. **Liga los datos reales** con `pnpm brand:deck-plan -- --bind --plan plan.json …` y compón el plan ligado, no el
   que escribiste (subsección «Datos reales en los slots»).
6. **Componer:** intent propio de AXIS + `pnpm brand:compose` (las 78 tienen plantilla; tablas de «Componer hoy con
   `pnpm brand:compose`» y lista por id en el README del catálogo). La portada con selección va con
   `layout: 'document-selection'`.
7. **Revisar a ojo** cada lámina compuesta contra su referencia aprobada.

**Decisiones que un agente necesita en el momento:** cotización en tres variantes, sólo en propuesta (tabla para
lectura, escena para sala, en vivo cuando el alcance está acordado); `decision-next-steps` es la versión con la agenda
abierta y no va en una propuesta enviada después del diagnóstico; día a día = cuatro momentos + herramientas + dos
«vívelo»; clientes en un tono navy (Aguas Andinas y UC Temuco en tonos de navy); la foto del caso Sky es de ejemplo;
BeX: la escalera es la principal. **Registro cine** también en las láminas de sección y «about» (excepción aprobada,
no se extiende a otras superficies). **Pendientes de QA de las referencias** (respuestas bajo 3×, acento bajo 24 px,
cifras sin fuente, sin burbuja en partners, velo sobre el plate, logo chico en secciones de cine, dirección de
contacto): TASK-1928 los resolvió en las plantillas aplicando la norma; si compones con `pnpm brand:compose` ya salen
corregidos. Siguen abiertos (TASK-1933) el plate P1 repetido (no repetirlo en un mismo deck: el validador del plan ya lo
detecta con `plate-repeated`), los isotipos sin registro de
procedencia (`pnpm foto:emblema` antes de publicar) y el logo dentro de la órbita en el cierre; lista en el README del
catálogo.
Si una `notes` del JSON contradice estas decisiones, mandan las decisiones.

**Las nueve láminas SEO/AEO (operador, 2026-09-28; TASK-1934).** No crean familia nueva:

| Lámina | Familia | Úsala cuando | Regla dura |
|---|---|---|---|
| `decision-ai-market` | `proof` | hay que abrir SEO/AEO con el porqué ahora (también QBR) | máximo tres cifras, cada una con fuente y año; con una sola, `content-measure` |
| `decision-ai-answer` | `proof` | hay que hacer visible el problema antes de la oferta AEO | IA genérica; «Ejemplo ilustrativo» visible; con el diagnóstico real, `decision-diagnosis-map` |
| `method-surround-cycle` | `method` | se vende un servicio continuo y hay que decir cómo se trabaja | cuatro estaciones en orden (Medir, Crear, Distribuir, Optimizar); la órbita tendida es la única |
| `method-eeat` | `method` | hay que explicar por qué la IA citaría a la marca | las cuatro letras en orden E-E-A-T |
| `proposal-service-seo` / `proposal-cinematic-seo` | `proposal-service` | la oferta SEO: sobria para lectura, cine para impacto | **una de las dos** (`variant`); nunca prometer ranking: la nota lo aclara |
| `decision-difference` | `proof` | el cliente compara con otras agencias o con su equipo | la alternativa siempre genérica, nunca un competidor real |
| `decision-traffic-to-revenue` | `proof` | hay que subir la conversación de tráfico a negocio | sin cifras en los escalones salvo datos reales con fuente; sin CRM no se promete el escalón |
| `decision-diagnosis-map` | `next-steps` | cierre AEO con lo que el cliente recibe primero | «Datos de muestra» visible; share of voice suma 100; no va con `diagnosisDone: true` |

SEO y AEO son servicios distintos: `proposal-service-seo` y `proposal-service-aeo` pueden ir en la misma propuesta. Las
respuestas de las siete nuevas van a 120 px (3×); en `decision-ai-answer` la ventana trasera se corrió a 860 y se
angostó a 450 para que la respuesta no la toque.

#### Plan del deck: validar contra el catálogo antes de componer (TASK-1929, 2026-09-28)

**Flujo:** mensaje → **plan** (ids de receta en orden) → `pnpm brand:deck-plan -- --plan plan.json` (corrige **todo**
error; lee los avisos) → intent por lámina o documento con `pages` → `pnpm brand:compose`. El validador es la puerta
entre elegir y componer: un plan con error no se compone. Estado: `complete` en `develop` (TASK-1929, 2026-09-28).

**`plan.json`** (tipo `DeckPlan`; ejemplos en `src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/golden-*.json`):

```json
{ "document": "brochure", "line": "growth", "diagnosisDone": false,
  "slides": [
    { "recipeId": "cover-brochure-cine-orbit", "purpose": "abre con la pregunta de la línea" },
    { "recipeId": "proposal-cinematic-aeo", "plateRef": "ai-generations/…/plate.png",
      "progress": { "sections": 4, "current": 1 }, "slots": { "question": "¿Te encuentra la IA?" } }
  ] }
```

- `document`: `proposal` | `brochure` | `pitch` | `qbr`. `line`: token de línea (`growth`, `brand`, `engine`, `voice`,
  `revenue-hubspot`); la toman portada y cierre. `diagnosisDone`: sólo propuesta (activa `next-steps-after-diagnosis`).
- `slides[].recipeId`: **id del catálogo, nunca plantilla, `contentType`, `deck.*` ni familia de AXIS**
  (`proposal-cinematic` como familia no es receta; la excepción son `cover-classic`/`close-classic` en pitch y QBR,
  ver «Cómo se usa»). `slots`, `plateRef` y `progress` son opcionales: **sin `slots` la lámina es esqueleto** y sus
  slots no se validan; `plateRef` alimenta `plate-repeated`; sin `progress`, la navegación se deriva del orden de las
  secciones.
- Salida: `✓ Plan válido (N aviso(s))` o `✗ Plan inválido` con una línea por issue (`✗` error / `!` aviso,
  `[source]`, lámina, slot, detalle). Exit 1 si hay error; 2 si el archivo o el contexto no se leen. `ok` = sin errores
  (los avisos no bloquean).

**Qué valida y cómo se arregla.** Dos fuentes, **una regla, una voz**: lo que AXIS valida del documento llega con
`source: 'axis'` y el código de AXIS; el catálogo sólo agrega lo que AXIS no conoce, y calla si AXIS ya habló de esa
lámina (`AXIS_EQUIVALENT` en `issues.ts`). El piso AXIS corre **sólo en propuesta y brochure y sólo si todas las
láminas resolvieron** (arma el documento con la página de ejemplo de cada receta y lo pasa por
`resolveSurfaceDocument`; los issues de página se reportan en su lámina, sin el prefijo `page[i]:`).

| Código | Fuente | Tipo | Qué significa → cómo se arregla |
|---|---|---|---|
| `brochure-cover-first` · `brochure-close-last` | axis | error | la portada no abre / el cierre no cierra → muévelas |
| `brochure-needs-service-page` | axis | error | brochure sin `proposal-cinematic` layout `service` → agrega una página de servicio |
| `frame-photo-must-alternate` | axis | error | portada y cierre ambos con foto o ambos sin → cambia uno por su par (tabla «Qué portada con qué contraportada») |
| `document-line-mismatch` · `use-not-for-recipe` · `progress-required` | axis | error | línea del marco ≠ la del documento / receta que no admite ese uso / falta navegación → ajusta `line`, cambia la receta o declara `progress` |
| `plan-invalid` | catalog | error | el JSON no tiene la forma de `DeckPlan` → corrige la forma |
| `template-named-instead-of-recipe` | catalog | error | nombraste plantilla, `contentType`, `deck.*` o un id con mayúscula → usa el id del catálogo |
| `recipe-unknown` · `recipe-not-for-document` | catalog | error | id inexistente / receta que no va en ese documento (`documents`) → elige otra de `listDeckRecipes(document)` |
| `frame-count` · `frame-order` | catalog | error | más de una portada o cierre (cubre «eslogan dos veces») / marco fuera de lugar → una portada primera, un cierre último |
| `pair-cover-close-mismatch` | catalog | error | portada y cierre no son pareja `cover↔close` → usa la pareja declarada |
| `next-steps-after-diagnosis` | catalog | error | una receta de la familia `next-steps` (`decision-next-steps` o `decision-diagnosis-map`) en propuesta con `diagnosisDone: true` → quítala; el `preferInstead` de `decision-next-steps` sugiere `content-pricing-live` si el siguiente gesto es aprobar la cotización |
| `variant-both-in-deck` | catalog | error | dos variantes de la misma lámina en el mismo deck, **seguidas o no** (reemplaza a `variant-adjacent`) → deja una |
| `figure-source-missing` | catalog | error | una cifra del plan (objeto con `value`) sin `source` → agrega la fuente real o quita la cifra. Límite: una cifra escrita como texto plano en un slot `metric` («68 %») no se detecta; escríbela como objeto con `source` |
| `plate-repeated` | catalog | error | el mismo plate dos veces en el plan (el P1) → otro plate |
| `slot-unknown` · `slot-type-invalid` · `slot-required-missing` · `slot-over-max-chars` | catalog | error | slot que la receta no tiene (p. ej. eslogan en portada) / tipo / obligatorio / largo (`text` total, `richText` por línea sin `**`, `list` por ítem) → **acorta la frase**, nunca la caja |
| `recipe-without-template` | catalog | aviso | lámina sin plantilla en el composer: hoy sólo `cover-classic`/`close-classic` en pitch y QBR (las 78 recetas la tienen) → el plan vale pero ese deck no se compone de punta a punta |
| `section-split-corner-adjacent` | catalog | aviso | dos secciones partidas seguidas con la misma esquina → cambia el `layout` de una |
| `rhythm-paper-run` | catalog | aviso | tres láminas de papel seguidas (un aviso por tramo) → mete una oscura o un respiro; tres oscuras seguidas es la norma |
| `proposal-unavailable` | agent | error | sólo en `--propose`: el proveedor falló → reintenta más tarde o arma el plan a mano |

Sin código a propósito: la alternancia foto (AXIS), el eslogan en portada (`slot-unknown`), el orden de una
`sequence` (**no hay**: `pairsWith sequence` no tiene dirección; `proposal-cinematic-nexa-lines` lista la portada como
secuencia, así que una regla de orden daría avisos falsos).

**Que el agente proponga el plan:** `pnpm brand:deck-plan -- --propose --context context.json [--out plan.json]`
(`proposeDeckPlan` en `src/lib/brand-surfaces/deck-recipes/propose.ts`, `server-only`; ejemplo de contexto:
`__tests__/fixtures/context-brochure.json`).

- **Contexto por allowlist:** `document`, `audience` (`room` | `reading`), `line`, `diagnosisDone`, `sections`
  (1–20 temas), `availableFacts?` (nombres de pruebas, hasta 20), `brief?`; cada texto ≤ 200 caracteres. Cualquier otra
  clave (id de organización, monto, dato personal) → `DeckPlanContextError`, exit 2.
- **El modelo sólo elige recetas:** `claude-sonnet-5` por el cliente canónico (`generateStructuredAnthropic`), tool
  forzado con `recipeId` restringido a un **enum** con los ids del documento; devuelve `recipeId` + `purpose` + un
  porqué, **nunca contenido ni cifras** (el plan sale sin `slots`: es esqueleto).
- **Un reintento y fail-closed:** si el plan trae errores, **un** reintento con el plan previo y los issues; si
  persisten, `✗ Sin plan válido`, el plan rechazado sólo para diagnóstico y exit 1. Con `--out` se escribe el plan
  **sólo si es válido**. No confirma, no persiste ni compone (confirmación humana, API, Nexa y MCP: TASK-1932).
- **Costo:** imprime tokens y un costo **estimado** con tarifa de referencia USD 3/15 por millón (no es factura).
  Corrida real 2026-09-28 (brochure, 4 secciones): 16 láminas válidas en el 2.º intento (el 1.º sin página de servicio
  → `brochure-needs-service-page`, corregido en el reintento), 17 918 + 2 368 tokens, ≈ USD 0,09, un aviso
  `rhythm-paper-run`.
- **Credenciales locales:** si `.env.local` no las trae,
  `ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key GCP_PROJECT=efeonce-group pnpm brand:deck-plan -- --propose …`
  con ADC vigente (`pnpm gcloud:auth:playwright -- --force` si venció).

**Invariantes:**

- El plan **nombra recetas**, nunca plantillas ni `contentType`: la plantilla la deriva el mapper al componer
  (`TemplateAuthorityError` sigue vigente).
- **Nadie lee el JSON de `docs/` en runtime.** El código importa `catalog.generated.json` vía
  `@/lib/brand-surfaces/deck-recipes` (`deckRecipeCatalog`, `getDeckRecipe`, `listDeckRecipes`, `validateDeckPlan`); un
  test lo vigila. `proposeDeckPlan` se importa aparte desde `…/deck-recipes/propose`.
- **Al editar `EFEONCE_DECK_SLIDE_RECIPES_V1.json` corre siempre `pnpm brand:deck-recipes`:** regenera el índice del
  README **y** el catálogo de runtime. Sin eso, `pnpm brand:deck-recipes -- --check` falla («catálogo de runtime … no
  coincide …») y el test `catalog-drift` rompe CI.
- **Una regla, una voz con AXIS:** una regla que AXIS ya valida no se duplica en el catálogo; si AXIS cambia su código,
  manda AXIS.

#### Datos reales en los slots: `bindDeckSlots` (TASK-1930, 2026-09-28)

**Qué hace:** llena los slots de **datos** del plan (logo del cliente, cifras, casos, testimonios, logos de terceros,
montos, equipo, datos de muestra) desde la verdad de Greenhouse y deja el rastro de cada uno. Los slots de **voz** no
se ligan: los escribe quien propone y los confirma una persona. Estado: `in-progress` (Slices 1–4 y 7); ligar **no
compone ni guarda**: la salida productiva con confirmación humana es TASK-1932.

- **Dónde vive:** `bindDeckSlots(plan, context)` (`server-only`) en
  `src/lib/brand-surfaces/deck-recipes/bindings/index.ts`; núcleo puro `bindDeckSlotsWith(plan, sources)` en
  `bindings/core.ts`; el mapa slot → binder (o exclusión con razón) en `bindings/map.ts`. Devuelve
  `{ ok, plan, bindings, issues }`; al final corre `validateDeckPlan` sobre el plan ligado y el gate canónico de
  audiencia `assertEvidenceAllowedForAudience`.
- **Sólo readers canónicos, sin escritura:** la `Proposal` por `getProposalById`, su evidencia por la proyección
  allowlisted `buildProposalRenderProjection`, el logo del cliente por `readOrganizationLogoVariants` (Account 360);
  fuera de una `Proposal`, el asset de respaldo por `getAssetById`.
- **El valor viaja en un HECHO, la evidencia lo autoriza.** `proposal_evidence` no guarda el valor de una cifra ni el
  texto de una cita: el contexto trae `facts` (`kind`: `figure` | `logo` | `quote` | `photo` | `sample-data`, con
  `factId`, `evidenceRef` y `target.recipeId`/`slot`).
- **Un slot de datos NUNCA sale del texto del plan.** Lo que venía escrito se reemplaza por el hecho verificado o se
  quita, y el plan falla cerrado (`slot-required-missing`). El binder nunca completa un slot para que pase.

**Reglas de evidencia:**

| Slot | Regla | Si no se cumple |
| --- | --- | --- |
| Logo del cliente | Account 360; en portada oscura, la versión para fondo oscuro | `no-logo` · `no-on-dark-logo` |
| Cifras (`metric`) | evidencia `measured`; la fuente visible sale de la evidencia; un `metric` acepta una lista de cifras, cada una con su fuente | `no-evidence` |
| Casos, testimonios, logos de terceros, foto de caso | evidencia `attested` **con** documento de respaldo; frase destacada sólo si es fragmento literal de la cita; foto de ejemplo nunca | `no-authorization` · `not-in-quote` · `no-real-photo` |
| Montos (`money`) | siempre `[MONTO]` (`MONEY_PLACEHOLDER`) | hasta TASK-1417 (`no-frozen-quote`) |
| Equipo | sin ligar; nunca una cara generada | hasta TASK-1418 (`no-roster-facts`) |
| Láminas de muestra SEO/AEO | conservan muestra y marca; sólo con datos del cliente con evidencia se retira la marca | `illustrative-sample` |

- **Ningún deck usa evidencia interna, ni siquiera uno interno** (decisión del operador 2026-09-28: ahí vive el costo
  cargado y el margen) → `internal-evidence` / `binding-internal-evidence`.
- **Muro de logos: mínimo 9 logos autorizados** (`LOGO_WALL_MIN`, decisión del operador); con menos
  (`below-minimum`), usa otra lámina de prueba.
- **Fuera de una `Proposal`** (brochure, pitch, QBR: `kind: 'brand'`) sólo se ligan cifras con asset de respaldo; la
  prueba de terceros queda `no-authorization` hasta la biblioteca de autorizaciones por tercero (TASK-1937, `to-do`).
- **Rastro por slot:** estado (`bound` / `unbound`), fuente, evidencia, fecha (`asOf`) y motivo; va al manifest y a
  la procedencia del asset (TASK-1932, TASK-1921).

**Comando:**
`pnpm brand:deck-plan -- --bind --plan <plan.json> (--context <c.json> | --proposal <id> --org <ownerOrgId> [--facts <f.json>] | --sources <fixture.json>) [--out <ligado.json>]`
— imprime cada slot de datos con «ligado desde …» o «sin ligar: <motivo>». Con `--proposal` necesita el proxy de
Cloud SQL (`pnpm pg:connect`); `--sources` corre el núcleo puro sobre un fixture, sin base. Manual: paso 5b de
`docs/manual-de-uso/creative/componer-deck-con-recetas.md`; qué slot sale de qué fuente: «Datos reales por slot» en el
README del catálogo de recetas.

## ⚠️ Antes de nada: las 3 preguntas que decides ANTES de abrir nada

Casi todo el mal deck del mundo nace de saltarse una de estas. **Contéstalas en voz alta.**

### 1. ¿Hay narrador, o el artefacto se defiende solo?

**Es la pregunta más importante del oficio, y casi nadie la hace.** Cambia TODO — densidad, largo
del titular, cantidad de texto, si el gráfico lleva anotación.

| | **Deck CON narrador** (escenario, defensa oral) | **Deck SIN narrador** (se envía, se lee) |
|---|---|---|
| Quién carga el argumento | **el orador**; la lámina apoya | **la lámina**; no hay quién explique |
| Texto en pantalla | **poco** — el *redundancy principle* de Mayer dice que poner en pantalla lo que estás diciendo **degrada** la comprensión (d ≈ 0,87) | **más** — el texto **ES** el canal. El redundancy principle **NO APLICA** aquí (sus condiciones de frontera se revierten cuando el lector controla el ritmo y no hay narración compitiendo) |
| El titular | puede ser breve; el orador dice el "so what" | **DEBE afirmar la conclusión** — el orador ya no está |
| Gráficos | el orador señala qué mirar | **cada gráfico lleva su anotación** |
| Referencia | Reynolds, Duarte | **Slidedoc** (Duarte), Assertion-Evidence |

**⚠️ La trampa:** casi toda la biblioteca popular de presentaciones (*"una imagen y tres
palabras"*, Presentation Zen, la regla 10-20-30) está escrita para el **escenario**. Aplicada a un
deck que se lee sin orador, es **activamente dañina**: produce una lámina que no comunica nada.

**Y la mayoría de nuestros decks se leen sin orador.** Una oferta a comité **se LEE** — nadie la
presenta. Un deck de defensa oral **queda circulando después** para que el sponsor te defienda
cuando no estás en la sala. **Diseña para el peor caso: que se lea solo.**

**Si necesitas los dos → son DOS artefactos, mismo contenido**: el de escenario (poco texto) y el
*leave-behind* (autoexplicativo). No un compromiso que no sirve para ninguno.

### 2. ¿Un deck es siquiera la forma correcta?

A veces **no**. Un documento escrito le gana al deck cuando:

- La decisión es **irreversible o cara**.
- Hay **incertidumbre, supuestos y contra-argumentos** que hay que **exhibir, no esconder** — y la
  jerarquía de bullets **borra los conectores lógicos** (causa, evidencia, magnitud, incertidumbre).
  Un bullet puede esconder que no sabes por qué. Una oración con *"porque"* no.
- La audiencia es **pequeña, capaz, y va a leer**.
- El artefacto debe **sobrevivir la reunión** y ser auditable después.

Es el argumento de Amazon (memo narrativo de 6 páginas, leído en silencio al inicio de la reunión;
fuente primaria verificada: **carta a accionistas 2017**). Y el caso más brutal que existe: el
**Columbia Accident Investigation Board** escribió en su informe que *"es fácil entender cómo un
gerente sénior podría leer esta lámina de PowerPoint y no darse cuenta de que trata una situación
de riesgo vital"*. **Siete muertos.** No es opinión de un crítico de diseño: es una junta federal
de investigación.

**El deck gana cuando:** persuasión en vivo · la evidencia **es** visual/cuantitativa · **el
comprador exige el formato** (licitación, RFP, comité con rúbrica) · hay que anclar la memoria de
alguien que no va a leer nada.

> Ganar el punto intelectual y perder la licitación por formato **es una derrota**.

### 3. ¿Cuál es la ÚNICA frase?

El *governing thought* de Minto. La *Big Idea* de Knaflic. **Una oración, con sujeto, verbo y
consecuencia.**

> **Si no puedes escribirla, no tienes un deck: tienes material.**

---

## La ley del oficio (lo único que está realmente probado)

**Cinco autores independientes, cinco vocabularios, un solo hallazgo:**

> ### Elimina lo que no aporta.

Mayer lo llama **coherence principle** (y es el único con **200+ experimentos** detrás). Sweller lo
llama **carga extraneous**. Tufte, **chartjunk**. Reynolds, **signal-to-noise**. Knaflic,
**"clutter is your enemy"**.

Que cinco tradiciones distintas converjan es lo más cercano a una ley que existe acá. **Cítala con
Mayer** — es el único con evidencia experimental.

**El corolario de Sweller, que es la frase que hay que tener en la cabeza:**

> **La carga extraneous es presupuesto robado a la comprensión.** Cada adorno, cada bullet
> redundante, cada leyenda lejos de su dato, es memoria de trabajo que el evaluador **ya no tiene**
> para entender tu propuesta.

---

## Assertion-Evidence — la única evidencia real sobre diseño de láminas

**Garner & Alley (2013), *International Journal of Engineering Education*.** Dos audiencias,
**exactamente las mismas palabras habladas**, distintas láminas. La audiencia con láminas
*assertion-evidence* comprendió y recordó mejor (**p < .01**, n=110), con **menor carga cognitiva
percibida** y **mejor recall diferido**.

**El patrón:**

| | |
|---|---|
| **Titular** | una **ORACIÓN** que **afirma el mensaje**. No un tópico. No una etiqueta. |
| **Cuerpo** | **evidencia visual** que sostiene esa afirmación. |
| **Nunca** | tópico + bullets. **Nunca** leer la lámina en voz alta. |

```
❌  "Análisis de churn"                    ← etiqueta. No afirma nada.
✅  "El churn cae 40% si movemos el onboarding a la semana 1"
```

**⚠️ Honestidad de atribución.** La industria llama a esto *"action title"* o *"so-what title"* y
se lo atribuye a McKinsey. **No tiene fuente primaria: solo blogs de vendors de plantillas.** Lo
que sí es citable: **Minto** lo funda (*governing thought*), **Mayer** lo respalda (*signaling
principle*), **Knaflic** lo formula operativamente (*el título es el takeaway*), y **Garner & Alley
lo probaron experimentalmente**. **Cita a ellos. No le inventes una cita a McKinsey.**

**El test barato y brutal:** exporta **solo los títulos** a una lista. **Si no se lee como un
argumento completo, el deck no existe.**

---

## Lo que la evidencia dice sobre PARA QUÉ sirve un deck

Tres hallazgos que reencuadran el trabajo. No son opinión de diseño.

### 1. Tu competidor real es la INDECISIÓN, no el otro oferente

***The JOLT Effect*** (Dixon & McKenna, 2022) — **2,5 millones de conversaciones de venta**:

- **40-60%** de los deals calificados mueren en **"no decision"**.
- De esos, **~56% se pierden por INDECISIÓN del comprador** — gente que **ya estaba convencida de
  que había que cambiar** y no pudo comprometerse. Miedo a equivocarse. Miedo a la culpa.
- Solo **~44%** se pierde por preferencia por el status quo (nunca se convenció).

> **Un deck construido solo sobre "por qué cambiar" ataca la MINORÍA del modo de falla.**

La mayoría necesita lo contrario: **quitarle riesgo**, **darle a tu champion con qué defenderse
cuando tú no estás en la sala**, y ofrecer **un primer paso pequeño**. Un piloto acotado, una
garantía, un plan de salida, una referencia verificable.

**Traducción a láminas:** por cada lámina de "por qué esto", debe haber una de **"por qué es
seguro"**. Riesgos nombrados con su mitigación. El plan de arranque. Qué pasa si sale mal.

### 2. El problema no es falta de información — es EXCESO

**Gartner (2019, n > 1.000 compradores B2B):** el **89% dijo que la información que encontró era de
alta calidad.** Y **ese es el problema**: no falta información, **sobra información buena y
contradictoria entre proveedores**.

> **La función del deck no es informar. Es REDUCIR y ORDENAR** para que un comité pueda decidir.

El comprador B2B típico son **6-10 personas** (Gartner), cada una llegando con 4-5 piezas de
información recolectada por su cuenta, y **el 74% de los comités muestra conflicto no saludable**
durante la decisión. Tu deck no compite contra el deck del rival: compite contra **el ruido**.

### 3. En una licitación puntuada, la ARITMÉTICA le gana a la prosa

**Bergman & Lundberg (2013)**, peer-reviewed. Bajo scoring relativo:

- Tu **score de calidad está comprimido** — todos los que cumplen sacan 7-9 de 10.
- Tu **score de precio es no acotado**, y **lo fijan tus competidores**.

> **El punto marginal casi siempre se compra con precio, no con prosa. Modela la fórmula ANTES de
> escribir una palabra.**

Y **Pier et al. (2018), PNAS**: el acuerdo entre evaluadores puntuando **las mismas** propuestas es
**≈ 0**. **El evaluador es RUIDOSO.**

> Ese —y no la retórica de APMP— es el argumento **con evidencia** para la compliance matrix:
> **diseña el documento para que un evaluador cansado, distraído y no experto NO PUEDA dejar de
> encontrar y acreditar tu respuesta.**

---

## La firma delatora del deck generado por IA

No es visual. Es **estructural**. Y saberla sirve para dos cosas: no producirla, y reconocerla.

1. **Títulos descriptivos, no afirmativos.** "Análisis de mercado" en vez de la conclusión.
2. **Uniformidad.** Todo normalizado a la mediana: mismo largo de titular, mismo número de bullets,
   misma densidad en cada lámina. **Un deck humano es irregular a propósito: una lámina grita y
   cinco susurran.** La uniformidad es lo que lo delata.
3. **Cifras plausibles sin procedencia.**
4. **Cero criterio editorial** — el mismo deck para el CFO que para el ingeniero.
5. **Imagen genérica** — stock/IA descontextualizada, gente-que-no-existe sonriendo.

**Y el dato que ordena esta skill:** el paper **SlideAudit (UIST 2025)** midió que los modelos son
**malos identificando fallas de diseño** (F1 entre 0,33 y 0,65) — **pero que dándoles una taxonomía
explícita de fallas, el 82% de las láminas mejora significativamente.**

> **Por eso esta skill es una TAXONOMÍA, no un estilo.** Una lista de fallas **nombradas** vale más
> que cien adjetivos sobre buen gusto.

**"AI slop" ya no es jerga de foro:** *slop* es **Palabra del Año 2025 de Merriam-Webster**. Un deck
que se lee como IA **tiene un nombre público y despectivo**. Ese es el riesgo reputacional.

---

## Cómo se produce: el deck se COMPONE, no se dibuja

**Regla que gobierna todo:** el deck es una **composición desde un catálogo cerrado de plantillas**.
Se elige la plantilla por el **tipo de contenido** y se llenan sus slots. **Nunca** se inventa un
layout para una lámina puntual.

> Si ningún tipo de contenido calza con lo que quieres decir, **eso es un gap del catálogo** (ábrelo
> y diseña la plantilla) — **no** una licencia para improvisar.

**El motivo es comercial, no estético:** una propuesta la lee un **comité que COMPARA**. La cohesión
visual es señal de rigor; un deck que cambia de lenguaje cada tres láminas se lee como un collage y
**resta**.

Detalle completo (catálogo, selector, CLI, PDF, las bug classes del motor): **[`composition.md`](composition.md)**. Desde 2026-07-14 el motor además garantiza tres cosas que cambian lo que un deck puede afirmar: **enlaces `https://` clickeables en el PDF** (la evidencia viva se enlaza, no se describe), **páginas de agenda derivadas del plan** (nunca autoradas) y **anti-fuga de prototipo** (un slot opcional omitido se limpia — el copy de ejemplo de un cliente no puede viajar al deck del siguiente). Para el camino **productivo en Greenhouse** (el deck como entregable gobernado de una `Proposal`:
render job → Cloud Run Job `artifact-worker` → PDF en el asset store, con gates de audience/
accesibilidad/peso y QA visual mecánica) el manual es
`greenhouse-public-private-tenders/proposal-studio-runtime.md` — shipped 2026-07-12.

**Cierre productivo — regla fail-closed.** Componer y revisar el PDF no equivale a registrar una Proposal.
En una licitación, `pnpm deck:compose` es el taller local; el camino productivo es `Proposal →
ResolvedCompositionManifest → render job → artifact-worker → asset versionado`. Antes de declarar el
deck listo, ejecuta `pnpm tender:canonical-gate <slug>` y exige `status=verified` en
`docs/commercial/tenders/<slug>/proposal-studio.json`. Un PDF o PNG bajo `.captures/` nunca satisface
este cierre. Ver `docs/commercial/tenders/PROPOSAL_STUDIO_CLOSURE_SCHEMA.md`.

**De dónde viene el `deck-plan`: es una PROYECCIÓN de la oferta técnica, no se auto-genera.** En una
licitación el deck-plan vive en el **workspace del deal** (`docs/commercial/tenders/<slug>/`, scaffoldeado
con `pnpm tender:new`) junto a la `oferta-tecnica.md`. El autor/agente arma el plan **desde** esa oferta
(propose→confirm): comparten el **ledger de evidencia** (ninguna cifra sin fuente googleable), pero son
archivos independientes y revisables por separado — el `.md` es la fuente narrativa, el `deck-plan.json` la
de composición. Las piezas vivas (Radiografía, informe del Grader) que alimentan `artifact-showcase`/
`highlight` salen del **`artifact-manifest.json`** del deal, **por enlace, nunca captura**. Contrato:
`docs/commercial/tenders/TENDER_WORKSPACE_TEMPLATE.md`.

**Cronogramas `TimelineFull`.** El autor o agente escribe el schedule (`timeUnit`, eje, fases, hitos y
`barLabel`); nunca porcentajes, líneas de grilla ni conectores. `barLabel` es copy editable en barras
sólidas **y** punteadas, incluso si una fase ocupa una sola unidad. La geometría real decide si cabe y el
composer falla cerrado si se recortaría. Contrato operativo: [`composition.md`](composition.md#timelinefull--cronograma-data-driven).

### Frontera con Creative Studio y Studio Credits

Un deck no cuesta créditos por lámina. Storyline, copy, selección de template, composición, gráficos
determinísticos, render PDF/PPTX, export y QA consumen capacidad/gobierno y devengan **0 Studio Credits**. Si una
lámina incorpora un hero, imagen, clip o voz generados, sólo esas operaciones generativas gobernadas se
estiman/reservan/liquidan en Creative Studio. Reutilizar un anchor aprobado o derivar el PDF no crea consumo.
Derechos de stock, talento, música, likeness y licencias se cotizan aparte. Canon:
`docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`.

---

## Router — qué cargar según lo que estés haciendo

```
├─ QUÉ decir y en qué orden: storyline, Minto/SCQ,
│  Assertion-Evidence, el arco, el ask ................. narrative-architecture.md
├─ QUÉ TIPO de deck es: comité · pitch · exec/board ·
│  QBR · readout · webinar. Leído vs presentado ........ deck-archetypes.md
├─ CÓMO se ve: el molde, tipografía, color, íconos,
│  fotos, densidad, y qué está quemado en 2026 ......... visual-system.md
├─ CÓMO se produce: catálogo cerrado, selector,
│  Artifact Composer, las bug classes del motor ........ composition.md
├─ QUÉ puede afirmar: evidencia trazable, anti-
│  fabricación, accesibilidad, entrega que no se rompe . evidence-integrity.md
├─ GRÁFICOS en un deck (≠ dashboard) .................. data-storytelling.md
└─ FUENTES verificadas + LOS MITOS QUE NO SE CITAN .... SOURCES.md
```

## Sinergias — quién decide qué (para que no se pisen)

| Skill | Decide | Frontera |
|---|---|---|
| `commercial-expert` · `gtm-architect` | **qué ofrecer** y cómo posicionarlo | **Ellas deciden el mensaje; `deck-studio` lo convierte en argumento sobre láminas.** No al revés. |
| `greenhouse-public-private-tenders` | la **licitación**: rúbrica, compliance matrix, admisibilidad, subsanación, plazos | **Es CONSUMER de esta skill.** Le pide el deck; no re-declara el craft. |
| `copywriting` | el **craft de las palabras** | Se invoca para los titulares y el hook. |
| `dataviz-design` | el **encoding** del gráfico | `deck-studio` le agrega *"el takeaway es el título"* y *"un mensaje por gráfico"*. |
| `typography-design` | el **sistema de tipo** | La tipografía del molde sale de ahí. |
| `design-studio` · `greenhouse-ai-image-generator` | **dirección de arte** e imagen | ⚠️ **NUNCA** generar con IA la cara de una persona real del equipo. Ver `evidence-integrity.md`. |
| `research-benchmark-operator` · `seo-aeo` | la **evidencia medida** | Alimentan las láminas de diagnóstico. Sin `evidenceRef`, la cifra no entra. |
| `arch-architect` | la arquitectura del **motor y los catálogos** | El ADR del Artifact Composer manda. |
| Creative Studio / Efeonce Globe | las operaciones generativas y su ledger | El deck sigue siendo composición determinística; no convertir slides ni horas en créditos. |

**⚠️ NO** `greenhouse-ux-writing` — esa gobierna el **microcopy del portal** (`src/lib/copy`), que es
otra cosa. Cablearla acá es un error.

**⚠️ Frontera de herramienta:** deck del catálogo → **el Composer**. Una pieza visual suelta que no
está en el catálogo → lane de Adobe / `design-studio`. **No se mezclan.**

### Reglas generales para decks de licitación

- **Separa el deck técnico del económico.** El técnico desarrolla el desafío, la solución, la
  metodología, el equipo y la evidencia; el económico permite comparar alcance, inversión y
  condiciones sin esconder el precio dentro de la narrativa técnica.
- **Usa `PricingFull` para la oferta económica.** La lámina debe mostrar la opción recomendada, el
  desglose cotizado y las condiciones comerciales desde el snapshot aprobado de la cotización; no
  se reemplaza por una tabla improvisada ni por texto de otra plantilla.
- **Haz visibles los valores fiscales.** Cada monto client-facing debe declarar explícitamente si es
  neto y si el IVA está excluido o incluido. La condición no puede quedar solo en una nota escondida.
- **Conserva outputs y planes separados.** Cada licitación y cada deck tiene su propio `deck-plan`,
  output, manifest y carpeta de captura; nunca se reutilizan ni se sobrescriben artefactos de otra
  licitación.
- **Revisa visualmente todos los frames antes del cierre.** Inspecciona cada lámina exportada:
  recortes, jerarquía, legibilidad, captions, assets, firmas y consistencia. Los tests del Composer
  son necesarios, pero no sustituyen mirar todos los frames.
- **Pasa el gate de Proposal Studio.** La revisión visual es necesaria, pero el cierre también debe
  registrar la Proposal, el render job completado, el asset `deck` versionado y la comprobación
  autenticada del portal. Si falta, el estado es `code complete, rollout pendiente` o bloqueado; no
  `complete`.

---

## Hard rules (NUNCA / SIEMPRE)

- **NUNCA** empieces a diseñar sin haber contestado las **3 preguntas**: ¿hay narrador? · ¿un deck es
  la forma correcta? · ¿cuál es la única frase?
- **NUNCA** apliques consejos de deck-de-escenario (*"tres palabras por lámina"*, 10-20-30) a un deck
  **que se lee sin orador**. Es el error #1 del craft y produce una lámina que no comunica nada.
- **NUNCA** un titular que **etiqueta** en vez de **afirmar**. El test: **exporta solo los títulos —
  si no argumentan solos, el deck no existe.**
- **NUNCA** cifra sin procedencia. **NUNCA** geometría dibujada a mano. **NUNCA** cara de IA para una
  persona real. Ver `evidence-integrity.md`. *(Una barra cuyo ancho no sale del dato no es un bug de
  layout: es fabricación gráfica.)*
- **NUNCA** cites un número de esta industria sin verificar. **Casi todo es folclore o telemetría de
  un vendor que vende exactamente lo que el número justifica.** Antes de citar, pasa por
  **[`SOURCES.md`](SOURCES.md) → §Mitos**. *(El "attention span de 8 segundos" está **fabricado**; la
  BBC lo rastreó hasta un sitio SEO que citaba 25 personas abandonando webs en 2008.)*
- **NUNCA** dibujes una lámina freehand. Se **compone** desde el catálogo. Si no hay plantilla, hay un
  **gap de catálogo**, no una licencia.
- **NUNCA** compongas un deck de marca propia sin antes validar su plan con `pnpm brand:deck-plan -- --plan`
  (cero errores; avisos leídos). El plan nombra recetas por id, nunca plantillas ni `contentType`.
- **NUNCA** escribas a mano un slot de datos (logo del cliente, cifra, caso, testimonio, logo de tercero, monto,
  equipo): se liga con `bindDeckSlots` / `--bind` desde evidencia verificada, o queda sin ligar y el deck no compone.
  Ningún deck, ni uno interno, usa evidencia `internal`.
- **NUNCA** cotices Studio Credits por lámina, deck, hora de autoría, render o export. Sólo una capability
  generativa gobernada y ejecutada puede devengar créditos.
- **NUNCA** verifiques las anotaciones /Link de un PDF con grep sobre sus bytes: pdf-lib comprime en
  object streams y el regex no ve adentro — **se cuenta vía API** (`page.node.Annots()`). Un enlace
  prometido que no llegó al PDF es evidencia inalcanzable para el comité.
- **NUNCA** declares un deck "listo" sin **MIRAR LOS FRAMES — todos.** Los tests verdes **no** son el
  gate de un deck: cuatro pasos numerados "01", párrafos aplanados con comas y una firma sin blend
  **pasaban los 92 tests** del composer. Los encontró una revisión visual.
- **SIEMPRE** una lámina de *"por qué es seguro"* por cada lámina de *"por qué esto"*. **Tu competidor
  es la indecisión** (JOLT), no el otro oferente.
- **SIEMPRE** en material client-facing: **registro formal de usted**. Un documento contractual que
  evalúa un comité no es un blog.
- **SIEMPRE** cita la **dirección**, no los decimales. Y cuando exista fuente **peer-reviewed sin
  interés comercial**, cítala a ella en vez del vendor.

## Estándar obligatorio para informes Efeonce

Al producir o revisar un informe, carga
`docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`: pie en todas las páginas
con URL bubble oficial, dirección y teléfono; logos oficiales de Efeonce y del cliente
cuando aplique; gráficos con unidades y fuentes claras. Si el destino es PDF, entrega
y revisa el PDF A4; el HTML queda como insumo editable.

Para crear o mejorar el informe completo, carga `report-studio`: narrativa, evidencia, gráficos, producción y QA del formato final. La práctica especializada conserva sus contratos y datos.

## Metodología de deck ejecutivo mensual

Para resumir una auditoría o informe en un deck para directorio, cargar `docs/operations/EFEONCE_EXECUTIVE_REPORT_DECK_METHOD_V1.md`: continuidad de evidencia, producción mensual frente a acumulada, On-time con denominadores, narrativa ejecutiva, selección visual antes de implementación, marcas/pie/contraportada, HTML como insumo del PDF A4 y verificación del archivo final. El caso Berel conserva sus decisiones y límites; las cifras no se reutilizan entre meses.
