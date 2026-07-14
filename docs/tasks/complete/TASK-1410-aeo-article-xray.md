# TASK-1410 — Radiografía AEO: muestra reutilizable "artículo + su capa de máquina" (think.efeoncepro.com)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1410-aeo-article-xray.md`
- Flow: `docs/ui/flows/TASK-1410-aeo-article-xray-flow.md`
- Motion: `docs/ui/motion/TASK-1410-aeo-article-xray-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|public-site|growth`
- Blocked by: `none`
- Branch: `task/TASK-1410-aeo-article-xray`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Una **muestra de trabajo reutilizable** publicada en `think.efeoncepro.com`: un artículo de blog real —escrito de cero, elegido por investigación Semrush— con **su capa de máquina visible y acoplada al lado** (JSON-LD, meta title/description, `alt` de cada imagen, jerarquía de encabezados, enlaces de cluster) y **un tercer panel con la evidencia** de por qué ese artículo existe (keyword, volumen, posición actual del cliente, quién ocupa hoy ese espacio, la sub-pregunta del *fan-out* que nadie responde).

**El motor es reutilizable: el cliente es un payload, no código.** Primer caso: la licitación **SKY** (blog, vía Wherex, **cierra el 15/07/2026**), donde entra como **enlace** en la propuesta más una **captura en una lámina del deck**. Segundo caso previsto: Berel u otro, escribiendo un payload nuevo.

## Why This Task Exists

En una licitación de contenidos **todas las ofertas dicen lo mismo** ("optimizamos para SEO y AEO"). Ninguna lo muestra. La oferta técnica de SKY ya promete explícitamente *"datos estructurados y metadatos"*, *"respuesta directa al inicio"* y *"ser la fuente que la IA cita"* — pero esas promesas hoy viven **solo como texto en un PDF**, exactamente igual que las de la competencia.

Y hay un hueco que hace esto posible y barato de argumentar: el diagnóstico que Efeonce ya midió y **ya publicó dentro de la propia oferta** dice que el blog de SKY tiene **0 citas en 35 respuestas** de motores de IA, con **"Ser accionable" en 8/100** y **"Ser correcta" en 37/100**. Esos números están sobre la mesa. Lo que falta es la pieza que muestre **qué se hace exactamente para moverlos**.

Esta muestra cierra esa distancia: cada elemento técnico del panel **apunta al número que arregla**. El `potentialAction` no es "un campo más": *es* el 8/100. El `FAQPage` es el 37. La cápsula de respuesta es lo que hoy hace que la IA cite a BioBioChile y no a SKY.

Y hay una razón estructural por la que esta pieza puede probar algo que un PDF no puede: **el schema solo puede marcar contenido visible** (marcar contenido oculto es violación de política de Google). Esa restricción es el argumento — la pantalla partida **demuestra visualmente** que cada dato de la capa de máquina corresponde a algo que está en la página.

Verificado el 2026-07-13: **no existe nada equivalente en ninguno de los dos repos.** Cero JSON-LD viewer, cero SERP preview, cero meta preview en `greenhouse-eo` (grep sin resultados) y nada en `efeonce-think`.

## Goal

- Publicar en `think.efeoncepro.com/muestras/<slug>` una muestra que **demuestre** —no que afirme— cómo se produce contenido con capa AEO, con el artículo y su capa de máquina **acoplados y verificables a simple vista**.
- Que el artículo exista **porque un dato lo pidió**: la investigación Semrush encuentra el hueco real en el espacio de búsqueda del cliente, y el tercer panel lo muestra. Eso es lo que dice *"venimos a aportarles"* en vez de *"miren lo que sabemos hacer"*.
- Que el motor sea **reutilizable por payload**: un cliente nuevo = una entrada de contenido validada por schema, **cero código nuevo**.
- Que la pieza **no pueda confundirse** con una publicación real del cliente ni contaminar nuestro propio dominio con datos estructurados falsos.
- Entregar el frame que va a la lámina del deck de SKY, **mirado**, no solo capturado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` — la pieza nace en `efeonce-think`, que ya es un deployable aprobado. **No crea deployables, paquetes ni fronteras nuevas.**
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — los números del diagnóstico (escalera Be X, citas, ownership) que la pieza cita **salen de ahí**, con su `as-of`. No se re-derivan ni se redondean.
- `docs/commercial/tenders/sky-blog-2026/oferta-tecnica.md` — la muestra **no puede prometer nada que la oferta no prometa**, ni prometer menos. Es su prueba, no un documento aparte.
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` — regla `audience`: todo artefacto del bid es `internal` o `client_facing`. Esta muestra es **`client_facing`**: **nunca** puede filtrar loaded cost, piso de negociación, margen ni nada de los cuatro documentos `-INTERNO`.

Reglas obligatorias (skills a cargar antes de tocar nada):

- **`seo-aeo`** — es la competencia que la pieza demuestra. El JSON-LD tiene que ser **correcto y defendible ante un comité que lo puede verificar**. Cargar `modules/01_SEO_TECHNICAL.md`, `modules/04_AEO_GEO.md` y `ANTIPATTERNS.md`.
- **`astro`** + su **`efeonce-overlay.md`** — obligatorio: pinea las decisiones reales de `efeonce-think` (dumb render, tokens AXIS copiados como CSS vars, `output: 'static'`, Content Collections, el listón de verificación).
- **`copywriting`** y **`greenhouse-ux-writing`** para el copy visible.

## Normative Docs

- `docs/ui/wireframes/TASK-1410-aeo-article-xray.md` — la forma de la superficie, el momento héroe y el contrato de accesibilidad.
- `docs/ui/motion/TASK-1410-aeo-article-xray-motion.md` — el acoplamiento, sus estados y el contrato de reduced-motion.
- `docs/commercial/tenders/sky-blog-2026/README.md` — cifras reales del bid. **Regla del bid: cifras reales o marcadas como ilustrativas, NUNCA fabricadas.** Aplica igual acá.

## Dependencies & Impact

### Depends on

- **Acceso a Semrush** (MCP conectado). Base de datos **`cl`** — no `us`. Sin esto el Slice 1 no existe y la task pierde su tesis.
- Repo **`efeonce-think`** (`~/Documents/efeonce-think`) — Astro **7.0.6**, React 19.2, Tailwind 4.3, adapter Vercel, `output: 'static'`, `@astrojs/sitemap` **con un `filter` ya existente**.
- Diagnóstico del AI Visibility Grader de SKY ya medido y publicado (informe vivo: `think.efeoncepro.com/brand-visibility/r/grt-9892e…`).

### Blocks / Impacts

- **Licitación SKY (cierra 15/07/2026).** El deck ya está compuesto (15 láminas) y pendiente de ajustes visuales; la captura de esta muestra entra ahí. **Esta task NO reabre la oferta técnica ni la económica** — ambas están cerradas desde el 11/07.
- `docs/public-site/PRODUCT_ROADMAP.md` — si la pieza funciona, es candidata a versión genérica (sin marca de cliente) como activo de captación. **Fuera de alcance acá.**

### Files owned

**En `greenhouse-eo` (este repo):**

- `docs/tasks/to-do/TASK-1410-aeo-article-xray.md`
- `docs/ui/wireframes/TASK-1410-aeo-article-xray.md`
- `docs/ui/motion/TASK-1410-aeo-article-xray-motion.md`
- `docs/commercial/research/sky-blog-aeo-gap-2026-07.md` *(nuevo — el artefacto de evidencia del Slice 1)*

**En `efeonce-think` (repo separado):**

- `src/content.config.ts` *(se extiende: colección `aeoXray` con schema Zod)*
- `src/content/aeo-xray/sky-<slug>.json` *(el payload del primer caso)*
- `src/pages/muestras/[slug].astro`
- `src/components/aeo-xray/*` *(`XrayLayout`, `ArticlePane`, `MachinePane`, `EvidencePane`, `SchemaBlock`, `ArticleBlock`, `XrayDisclaimerBar`, `LicenseFooter`)*
- `src/components/aeo-xray/XrayCoupling.tsx` *(la única island)*
- `astro.config.mjs` *(se extiende el `filter` del sitemap)*
- `public/muestras/sky-<slug>/*.jpg` *(imágenes con licencia)*
- `scripts/verify-aeo-xray.mjs`
- `README.md` *(sección: cómo se crea la muestra del siguiente cliente)*

## Current Repo State

### Already exists

- **`efeonce-think`** vivo en `think.efeoncepro.com`: Astro 7.0.6, `site` configurado, adapter Vercel, `output: 'static'`, tokens AXIS copiados como CSS custom properties, React islands, Playwright en `devDependencies`.
- **El `filter` del sitemap ya existe** en `astro.config.mjs`: `sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/preview/') })`. **No hay que inventar mecanismo de exclusión — hay que extender ese filtro.**
- **Patrón de verificación del repo:** `scripts/verify-brand-visibility-landing.mjs` y `scripts/verify-surround-discovery-landing.mjs`. El nuevo `verify-aeo-xray.mjs` los espeja.
- **Motor que ya sabe extraer JSON-LD de una URL:** `src/lib/growth/ai-visibility/probes/html.ts` en `greenhouse-eo` (`extractJsonLdBlocks`, `flattenJsonLdNodes`, `analyzeDomSemantics`). **No se usa en esta task** (la muestra es autorada, no auditada), pero es el cimiento del follow-up.
- **El diagnóstico de SKY ya está medido y publicado** — los números que cita el panel de evidencia existen y son verificables.
- Licitación SKY: oferta técnica, económica, Excel y deck **listos**. Falta que el operador suba a Wherex.

### Gap

- **Cero superficie que muestre contenido y su capa técnica lado a lado**, en ninguno de los dos repos (grep de `serp.?preview|schema.?preview|jsonld.?viewer|structured.?data.?view` en `greenhouse-eo`: sin resultados).
- El `artifact-composer` **no sirve acá**: tiene un solo catálogo (`deck-axis`) y solo emite `pdf-merged` / `png-set`. No hay catálogo de artículo ni salida HTML.
- Los *probes* del grader son **a nivel de sitio** (homepage + `robots.txt` + `sitemap.xml` + `llms.txt` + `.well-known/*`). **No existe un probe a nivel de artículo** — el hueco que abre el follow-up.
- **El artículo no existe todavía y no debe inventarse.** Lo elige la investigación del Slice 1.

## Modular Placement Contract

- Topology impact: `public`
- Current home: repo **`efeonce-think`** (`~/Documents/efeonce-think`), proyecto Vercel propio → `think.efeoncepro.com`. **No es `greenhouse-eo`.** Los únicos archivos que esta task escribe en `greenhouse-eo` son documentación (task, wireframe, motion, artefacto de investigación).
- Future candidate home: `public`
- Boundary: **el motor de render nunca conoce a un cliente.** La frontera es el payload — una entrada de la Content Collection `aeoXray` (`src/content/aeo-xray/`, un archivo por muestra, nombrado `cliente-slug.json`), validada por schema Zod en `src/content.config.ts`. Consumidores autorizados: solo la ruta dinámica de `src/pages/muestras/` (segmento `slug`, generada con `getStaticPaths`) y los componentes de `src/components/aeo-xray/`. Un cliente nuevo = una entrada nueva, **cero código**. Si un componente termina con un `if (cliente === 'sky')`, la frontera se rompió.
- Server/browser split: la ruta se prerenderiza entera (`prerender = true` explícito); no hay SSR ni fetch en runtime. La única island (`XrayCoupling`, `client:idle`) **solo mantiene un id de acoplamiento**: no computa, no decide, no fetchea, no toca secretos. Cumple la doctrina *dumb render* del overlay: la pieza **pinta un payload autorado**, no deriva nada.
- Build impact: `none` — sin dependencias nuevas. Solo imágenes estáticas en `public/`.
- Extraction blocker: `none`.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: evaluador de un comité de licitación. Escéptico, no necesariamente técnico. Llega por un enlace en la propuesta o desde una lámina del deck.
- Momento del flujo: está comparando ofertas que **todas prometen lo mismo**. Ninguna se lo muestra.
- Resultado perceptible esperado: que **vea con sus ojos** que cada dato que lee una máquina corresponde a algo real que está en la página — y que el artículo existe porque un dato de investigación dijo que ahí había un hueco.
- Friccion que debe reducir: la desconfianza de fondo (*"¿esto es distinto, o es la misma promesa con otro nombre?"*).
- No-goals UX: no es un tutorial de JSON-LD; no es un lead magnet (no captura, no pide email); no es una herramienta que audita URLs; **no puede confundirse con una página real del cliente**.

### Surface & system decision

- Surface: `efeonce-think` → `/muestras/[slug]` (nueva).
- Composition Shell: `no aplica` — es del portal Greenhouse (MUI/Vuexy). Este repo es Astro + Tailwind 4 con tokens AXIS copiados.
- Primitive decision: `new` — verificado que no existe nada equivalente en ninguno de los dos repos. Se **reusan los tokens** AXIS (CSS custom properties); no se inventa paleta.
- Adaptive density / The Seam: `no aplica` (mismo motivo: contrato del portal).
- Floating/Sidecar/Dialog decision: **ninguno.** Una sola página, sin capas flotantes. Por eso `Flow: none`.
- Copy source: `local one-off` — `payload.ui.*` (chrome) + `payload.article.*` (contenido). `src/lib/copy` y `greenhouse-nomenclature.ts` **no existen en este repo**.
- Access impact: `none` — pública, sin auth, **con `noindex` + excluida del sitemap**.

### State inventory

- Default: página completa con el **acoplamiento héroe preseleccionado y pintado en el HTML servido**.
- Loading: **no aplica** — estática, sin fetch. Si aparece un skeleton, alguien metió un fetch que no debía existir.
- Empty: **no aplica** — un payload sin artículo **rompe el build** (schema Zod). No es un estado de runtime.
- Error: **no aplica** — sin red, sin API, sin runtime que pueda fallar.
- Degraded / partial: **sin JavaScript, la pieza sigue argumentando.** Ambos paneles se renderizan completos y apilados; se pierde el resaltado sincronizado, **no el contenido**. Contrato duro.
- Permission denied: no aplica (pública).
- Long content: el panel de máquina scrollea **dentro de sí mismo**; los nodos de JSON-LD van colapsados salvo el activo. **La página nunca scrollea en horizontal.**
- Mobile / compact: paneles apilados (artículo → máquina → evidencia). El acoplamiento pasa de `hover` a `tap` + scroll al dato + botón "volver al artículo".
- Keyboard / focus: `Tab` recorre los bloques acoplables; el foco produce **el mismo acoplamiento que el hover**; `Enter` lo fija, `Escape` vuelve al héroe. **Toda la demo se conduce sin mouse.**
- Reduced motion: transiciones a 0 ms y scroll `auto`. **El significado se conserva íntegro** — nunca estuvo en el movimiento, estuvo en la correspondencia.

### Interaction contract

- Primary interaction: acoplar un bloque del artículo con su dato en la capa de máquina (y a la inversa: es **bidireccional**).
- Hover / focus / active: **hover y `focus-visible` producen exactamente el mismo estado visual.** Cualquier divergencia es un bug.
- Pending / disabled: no aplica — no hay operaciones asíncronas.
- Escape / click-away: `Escape` suelta el acoplamiento fijado y vuelve al héroe.
- Focus restore: el resaltado **nunca roba el foco**.
- Latency feedback: no aplica (todo local, sin latencia).
- Toast / alert behavior: ninguno. La pieza no notifica nada.

### Motion & microinteractions

- Motion primitive: **CSS** (transiciones) + island React mínima para el estado. **GSAP prohibido acá** aunque esté en el repo (ver el contrato de motion: es un cambio de estado binario, no una coreografía).
- Enter / exit: resaltado 120 ms `ease-out` / 90 ms `ease-in`.
- Layout morph: **ninguno.** Nada cambia de tamaño ni posición salvo el `<details>`.
- Stagger: **ninguno.**
- Timing / easing token: 120 / 90 / 150 ms como CSS custom properties de la superficie. **Ninguna transición supera 150 ms** — la pieza se demuestra en vivo y la interfaz debe seguirle el ritmo a la persona.
- Reduced-motion fallback: todo a 0 ms; `scrollIntoView` con `behavior: 'auto'`.
- Non-goal motion: cero scroll reveals, parallax, contadores animados y partículas. Una pieza que argumenta rigor técnico y llega envuelta en animación **se desmiente sola**.

### Implementation mapping

Ver `docs/ui/wireframes/TASK-1410-aeo-article-xray.md` → `## Implementation Mapping` (completo: ruta, primitives, variantes, Content Collection + schema Zod, tokens, sitemap filter, GTM).

- Route / surface: `src/pages/muestras/[slug].astro` (`efeonce-think`), `prerender = true` explícito, `getStaticPaths()` sobre la colección.
- Primitive / variant / kind: `new` — `ArticleBlock` con variantes `heading | paragraph | answer-capsule | image | table | ordered-list | faq | internal-links | callout`.
- Component candidates: Astro estático + **una** island (`XrayCoupling`, `client:idle`).
- Copy source: `payload.ui.*` + `payload.article.*`.
- Data reader / command: **ninguno.** El payload es una **Content Collection** con schema Zod (regla dura del repo: *"NEVER `import.meta.glob` structured content that has a schema"*).
- API parity: **no aplica** — la pieza no expone ninguna acción de negocio (no muta estado, permisos, datos, aprobaciones, exports ni configuración). No hay capability que gobernar. Si algún día audita URLs de terceros, **eso** nace con contrato gobernado en Greenhouse y es otra task.
- Access / capability: pública, `noindex`, fuera del sitemap.
- States to implement: `default (héroe)`, `degraded sin JS`, `mobile apilado`, `keyboard`, `reduced-motion`.

### GVC scenario plan

**GVC no aplica, y declararlo es parte del contrato.** `pnpm fe:capture` navega rutas `(dashboard)` autenticadas del portal Greenhouse con agent auth. Esta superficie vive en **otro repo**, es **pública sin auth** y se sirve desde **otro deploy**. Forzar GVC acá sería teatro de proceso.

El equivalente **ya existe en `efeonce-think`** y hay que seguirlo (Playwright está en `devDependencies`; hay dos `verify:*` vigentes). Esta task agrega `scripts/verify-aeo-xray.mjs`, con el detalle completo en el wireframe (`## GVC Scenario Plan`) y en el contrato de motion (`## GVC / Micro Evidence`).

- Scenario file: `efeonce-think/scripts/verify-aeo-xray.mjs`
- Route: `/muestras/sky-<slug>` sobre `astro build && astro preview`
- Viewports: `1440×900` (el frame de la lámina) y `390×844`
- Required steps: cargar → capturar el héroe **sin tocar nada** → hover en imagen → recorrer con `Tab` → `Escape` → repetir con `reduce` → repetir en 390 px
- Required captures: `hero-desktop.png` (**el que va a la lámina**), `couple-image-desktop.png`, `couple-keyboard-focus.png`, `hero-mobile.png`, `reduced-motion.png`
- Required `data-capture` markers: no aplican (son del helper de Greenhouse). Se selecciona por `data-testid` / `data-couple-id`.
- Assertions: las **8 duras** listadas en el wireframe (encabezadas por *"el HTML servido no contiene ningún `<script type=application/ld+json>`"*).
- Scroll-width checks: `scrollWidth <= clientWidth` en 1440 y 390. El panel de schema es el sospechoso: scrollea **dentro de su contenedor**.
- Reduced-motion / focus evidence: `reduced-motion.png` + assert de `transitionDuration: 0s` + assert de `aria-current` al enfocar con teclado.

### Design decision log

Completo en el wireframe (`## Design Decision Log`) y en el contrato de motion. Resumen de lo que se rechazó y por qué:

- **Dos paneles (artículo + código)** — era la petición original. Un artículo con código al lado es *un screenshot con código al lado*: enseña la técnica, **no argumenta**. El tercer panel (la evidencia) es lo que convierte la pieza en aporte.
- **Emitir el JSON-LD activo** — la trampa. Ver el invariante #1 abajo.
- **Un PDF** — sobrevive a Wherex pero mata el acoplamiento, que es el 80% del argumento. Resuelto por el operador: **enlace + captura en lámina**.
- **Herramienta que audita cualquier URL** — mejor producto, otro proyecto. La licitación cierra el 15/07. Queda como follow-up, y tiene un hueco real: el grader hoy solo tiene probes **a nivel de sitio**.
- **Coreografía con GSAP / líneas SVG** — es el reflejo de agencia que esta pieza tiene que desmentir, y las líneas SVG exigen medir geometría en caliente y no significan nada en mobile.

### Visual verification

- GVC scenario: no aplica (ver arriba). Equivalente: `scripts/verify-aeo-xray.mjs`.
- Viewports: 1440×900 y 390×844.
- Required captures: las 5 de arriba.
- Required `data-capture` markers: no aplican.
- Scroll-width check: sí, en ambos viewports.
- Accessibility/focus checks: `Tab` produce acoplamiento; `aria-current` en el nodo activo; `outline` (no solo color); `aria-live` anuncia el nodo activo.
- Before/after evidence: no aplica — la superficie **nace** con esta task.
- Known visual debt: ninguna al crear. **Riesgo abierto:** que el frame héroe no se lea a tamaño de lámina. Se mide mirando la captura, no assertándola.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Investigación Semrush: el hueco real (ES EL QUE DECIDE TODO)

- Correr Semrush con base **`cl`** sobre el dominio de SKY y su competencia (LATAM, JetSMART, y los terceros que hoy capturan las citas: BioBioChile, Despegar, YouTube).
- Buscar el cruce de **tres** condiciones, no una: (a) una pregunta **con volumen**, (b) que SKY **hoy no posee**, (c) sobre la que SKY tenga un **ángulo legítimamente propio** (es la aerolínea: sabe de rutas, frecuencias, temporadas, equipaje — cosas que un blog de viajes solo puede copiar). Buscar solo volumen produce una guía de destino genérica, que es un *commodity* imposible de convertir en fuente citada.
- Entregable: **`docs/commercial/research/sky-blog-aeo-gap-2026-07.md`** con la matriz de candidatos (keyword · volumen · posición actual de SKY · quién ocupa hoy el espacio · forma de la pregunta · ángulo propio de SKY · por qué sería citable) y **3 candidatos rankeados**, cada cifra con fuente y `as-of`.
- Mapear el **espacio de fan-out** del candidato ganador: las 8–15 sub-preguntas que un motor de respuesta generaría.
- 🔴 **GATE HUMANO. La task se detiene acá.** El operador elige el ángulo antes de que se escriba una sola línea del artículo. El agente **no elige** el artículo.

### Slice 2 — El artículo + su capa AEO, como payload validado

- Escribir el artículo **de cero** (es contenido nuevo, **no** un refresh de una página existente) contra el checklist medido de la skill `seo-aeo`, que no es opinable:
  - **Cápsula de respuesta de 40–60 palabras** bajo cada H2 (patrón presente en el **72,4%** de las páginas que ChatGPT cita).
  - **Cada H2 = una sub-pregunta del fan-out**, autocontenida (el pasaje viaja solo: nada de *"como vimos arriba"*).
  - **≥1 tabla y ≥1 lista numerada** (≈**2,3×** más citas).
  - Estadísticas con unidad y fuente (**+32%**), citas textuales (**+41%**), fuentes autoritativas enlazadas (**+30%**).
- Declarar la colección `aeoXray` en `src/content.config.ts` con **schema Zod** que obligue: `alt` no vacío por imagen, `credit.{author,license,url}` por imagen, y `source` + `asOf` por cada cifra de evidencia. **Un payload incompleto rompe el build.**
- Escribir `src/content/aeo-xray/sky-<slug>.json`: artículo + capa de máquina (JSON-LD, metas, OG, headings, enlaces de cluster) + panel de evidencia + la línea de **"para qué"** de cada técnica, **atada al número del diagnóstico que arregla**.
- Validar el JSON-LD contra schema.org: propiedades válidas, **cero campos inventados, cero sobre-marcado**.

### Slice 3 — Imágenes con licencia verificable (puede correr en paralelo al Slice 2)

- Fotos reales con licencia verificable y **crédito visible** (Wikimedia Commons CC o equivalente), con autor + licencia + enlace.
- **Ninguna imagen generada con IA.** La oferta promete *"imagen apta y libre de derechos o con permisos"*: una foto sintética de un lugar real en la pieza que demuestra cumplimiento es una bomba.
- Escribir los `alt` como parte del trabajo, no como relleno — **son contenido del panel**, se muestran y se acoplan.
- El pie de licencias **no es una nota al pie**: es la demostración del requisito 5 de las bases.

### Slice 4 — El motor de render (`efeonce-think`)

- `src/pages/muestras/[slug].astro` + los componentes de `src/components/aeo-xray/`, con los tres paneles y el **momento héroe servido pintado en el HTML**.
- La island `XrayCoupling` (`client:idle`): solo mantiene `activeCoupleId`. Hover, `focus-visible`, `Enter` (fija), `Escape` (suelta), bidireccional, con `aria-current` + `aria-live`.
- El JSON-LD se renderiza **como texto escapado** (`set:text` / interpolación). **NUNCA `set:html`, NUNCA dentro de un `<script type="application/ld+json">`.**
- Reduced-motion, mobile apilado, degradación sin JS.

### Slice 5 — Publicación, gates y el frame de la lámina

- `noindex` en la ruta + extender el `filter` del sitemap en `astro.config.mjs` para excluir `/muestras/`.
- Rótulo persistente **"Ejemplo ilustrativo de Efeonce"**, visible en el viewport inicial, que niega **autoría y alojamiento**.
- `scripts/verify-aeo-xray.mjs` con las **8 assertions duras** + capturas desktop/mobile/reduce.
- Deploy a Vercel (`efeonce-think`).
- **Mirar el frame héroe a tamaño de lámina.** Si la correspondencia no se lee, se rediseña el estado inicial. **Un verify verde con una captura ilegible no es un cierre válido.**
- `README.md` del repo: cómo se crea la muestra del siguiente cliente (escribir un payload, nada más).

## Out of Scope

- **Reabrir la oferta técnica o económica de SKY.** Están cerradas desde el 11/07. Esta muestra entra como **enlace + captura en el deck**, que sí está pendiente de ajustes.
- **Anexo PDF en Wherex.** Descartado por el operador. Existe un `@media print` mínimo para que un `Ctrl+P` no salga roto, pero **no se diseña ni se verifica un PDF**.
- **Versión genérica sin marca de cliente como lead magnet.** Es la evolución natural y probablemente valga la pena, pero **no es esta task**.
- **Herramienta que audita una URL de terceros.** Es otro producto (y necesita un probe a nivel de artículo que hoy no existe). Follow-up.
- **Publicar el artículo en el blog real de SKY.** No tenemos ni debemos tener ese acceso. La muestra es un mockup del entregable.
- **Cualquier contenido de los cuatro documentos `-INTERNO`** del bid (loaded cost, piso de negociación, margen). La muestra es `client_facing`.
- **Refresh/reescritura de un artículo existente de SKY.** El operador fue explícito: artículo **nuevo**.

## Detailed Spec

### Los 8 invariantes duros (si se rompe uno, la pieza se vuelve en contra)

1. **🔴 NUNCA emitir el JSON-LD del artículo como marcado activo.** Publicar en `think.efeoncepro.com` un `<script type="application/ld+json">` que declare `author: <cliente>` / `publisher: <cliente>` es **publicar datos estructurados falsos en nuestro propio dominio**, ingeribles por crawlers y motores de respuesta — justo en la pieza cuya tesis es el rigor técnico. **Autogol perfecto.** El schema se muestra como **texto escapado**; la página lleva **su propio** schema honesto (una muestra de trabajo de Efeonce). El `verify` **falla el build** si aparece un solo `application/ld+json` en el HTML servido.
2. **`noindex` + fuera del sitemap** mientras lleve marca de cliente. El `filter` de `@astrojs/sitemap` **ya existe**: se extiende, no se inventa.
3. **Rótulo "Ejemplo ilustrativo de Efeonce" persistente y visible** en el viewport inicial. Niega **autoría** y **alojamiento**. No es un pie de página, no se puede cerrar.
4. **Ninguna imagen generada con IA.** Licencia verificable + crédito visible, siempre.
5. **NUNCA prometer el resultado enriquecido de FAQ en Google.** Google lo restringió en 2023 a sitios de gobierno y salud. El copy habla de **capa de máquina** (que un motor de respuesta extraiga y cite), nunca de *"la cajita de preguntas en Google"*. Un evaluador que lo verifique y nos pille exagerando **destruye exactamente la credibilidad que la pieza vino a construir**.
6. **NUNCA prometer rankings, citas o resultados garantizados.** Ni la muestra ni el copy del panel. Se muestra el método y la evidencia; no se garantiza el desenlace.
7. **Cero cifras inventadas.** Toda cifra del panel de evidencia sale de Semrush o del grader, **con fuente y `as-of` visibles**. Si algo no se pudo medir, se dice. (Es la misma regla dura del bid: *cifras reales o marcadas como ilustrativas, nunca fabricadas*.)
8. **El motor nunca conoce a un cliente.** Un `if (cliente === 'sky')` en un componente significa que la frontera se rompió y la pieza dejó de ser reutilizable.

### Por qué el panel de evidencia es obligatorio y no un extra

Sin él, la pieza demuestra **técnica** ("sabemos poner JSON-LD"). Con él, demuestra **criterio** ("encontramos este hueco en su espacio de búsqueda y esta es la pieza que lo tapa"). Es la diferencia entre *"miren lo que sabemos hacer"* y *"venimos a aportarles"* — que es literalmente lo que el operador pidió que la pieza transmitiera. Cada cifra del panel es verificable, y esa verificabilidad **es** el argumento.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 → 🔴 GATE HUMANO → Slice 2.** El artículo lo elige el dato, no el agente. Escribir el artículo antes del gate viola el contrato de la task **y su tesis**: si el artículo no salió de la investigación, el panel de evidencia es decorativo y la pieza miente sobre su propio método.
- **Slice 3 puede correr en paralelo al Slice 2** una vez elegido el ángulo (las imágenes dependen del tema, no del texto final).
- **Slice 4 requiere Slice 2** (el schema Zod y la forma del payload definen los componentes).
- **Slice 5 va último** y **no cierra sin mirar el frame**.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| **Publicar datos estructurados falsos en nuestro dominio** (`author/publisher: <cliente>` activo en think.efeoncepro.com) | UI / dominio propio / entidad de marca Efeonce | **medium** (es el error "natural": *"hagámoslo de verdad para que se vea real"*) | JSON-LD **solo como texto escapado**; assert en `verify-aeo-xray.mjs` que **falla** si aparece cualquier `application/ld+json` en el HTML servido | El assert del verify. Sin él, **no hay señal**: el daño es silencioso y lo detectaría un crawler antes que nosotros |
| La muestra se indexa y compite/confunde en el SERP | SEO propio | medium | `noindex` + extender el `filter` del sitemap + assert de ambos en el verify | Assert del verify; Search Console de `think.efeoncepro.com` |
| Un evaluador la confunde con una publicación real de SKY | Reputación / legal | low-medium | Rótulo persistente que niega autoría **y** alojamiento, visible sin scrollear; assert en el verify | Assert del verify + revisión humana de la captura |
| El frame héroe no se lee a tamaño de lámina 16:9 | Entregable comercial | **medium-high** (es el riesgo más probable de todos) | Momento héroe preseleccionado y diseñado como frame; **mirar la captura**, no assertarla | La captura misma. El overlay del repo es explícito: *"don't ship on green assertions alone — the AEO form regression shipped exactly because the gate didn't look"* |
| Sobre-marcado de schema que gatille señal de spam | Credibilidad técnica ante el comité | low | Marcar **solo contenido visible** (política de Google); validar contra schema.org; skill `seo-aeo` + `ANTIPATTERNS.md` cargadas | Validación de schema.org; revisión de la skill |
| Prometer un rich snippet de FAQ que Google ya no da | Credibilidad ante el comité | medium (es un error de copy fácil de cometer) | Regla de copy dura en el wireframe; revisión con `seo-aeo` | Revisión de copy antes del deploy |
| Cifra inventada o sin `as-of` en el panel de evidencia | Credibilidad / bid | low | Schema Zod **obliga** `source` + `asOf` por cifra → **rompe el build** | Build del payload |
| No llegar al 15/07 | Licitación SKY | medium | El paquete del bid **ya está completo sin esta pieza**: es aditiva. Si no llega, se sube la propuesta igual y la muestra se publica después | Calendario |
| Filtrar contenido `-INTERNO` (loaded cost, piso) en la muestra | Comercial / negociación | low | La muestra es `client_facing`; el payload no toca esos documentos | Revisión humana antes del deploy |

### Feature flags / cutover

**Sin flag — aditivo, cutover inmediato.** Es una ruta nueva, estática, en un repo sin usuarios autenticados y sin runtime compartido. No hay nada que apagar gradualmente: la ruta existe o no existe. El "flag" efectivo es el `noindex` + la exclusión del sitemap, que hacen que la página **solo exista para quien tiene el enlace**.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (investigación) | Es un `.md` en `greenhouse-eo`. Revertir el commit. | < 1 min | sí |
| Slice 2 (artículo/payload) | Borrar la entrada de contenido. El build vuelve a pasar (la ruta desaparece con su entrada). | < 5 min | sí |
| Slice 3 (imágenes) | Borrar los assets de `public/`. | < 1 min | sí |
| Slice 4 (motor) | Revertir el PR en `efeonce-think` + redeploy Vercel. | < 10 min | sí |
| Slice 5 (publicación) | **Despublicar = borrar la ruta + redeploy.** Si por error se indexó: `noindex` ya presente + solicitud de retirada en Search Console. | < 10 min (despublicar) / días (des-indexar) | sí / **parcial** |

⚠️ **La única acción con reversibilidad parcial es la indexación.** Si la página se indexa (o peor: si un motor de respuesta ingiere un JSON-LD activo con `author: SKY`), quitarla del índice no es instantáneo. **Por eso el `noindex`, la exclusión del sitemap y el assert de "cero `application/ld+json`" son gates ANTES del deploy, no verificaciones posteriores.**

### Production verification sequence

1. `pnpm build` en `efeonce-think` (el schema Zod valida el payload; un payload incompleto rompe acá).
2. `pnpm type-check` (`astro check`).
3. `pnpm verify:aeo-xray` sobre `astro preview` — las **8 assertions duras**. Cualquiera roja **detiene el deploy**.
4. **Mirar** `hero-desktop.png` a tamaño de lámina. Si no se lee la correspondencia, volver al Slice 4.
5. Deploy a Vercel (`efeonce-think`, scope `efeonce-7670142f`).
6. Contra la URL de producción, reverificar a mano: (a) `view-source` no tiene `application/ld+json`; (b) `/sitemap-index.xml` no lista `/muestras/`; (c) el rótulo se ve sin scrollear.
7. Recién entonces, entregar el enlace al operador y la captura para la lámina.

### Out-of-band coordination required

- **El operador sube a Wherex.** Regla dura del bid: el agente prepara, el humano sube y firma. Esta task **no sube nada**.
- **El operador decide el ángulo del artículo** (gate del Slice 1).
- **El operador mira el frame** antes de que entre a la lámina.
- Deploy en el proyecto Vercel de `efeonce-think` (proyecto distinto de `greenhouse-eo`): confirmar el scope canónico antes de cualquier comando de Vercel.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El HTML servido de `/muestras/<slug>` **no contiene ningún** `<script type="application/ld+json">` (assert automatizado en el verify).
- [ ] La ruta tiene `<meta name="robots" content="noindex">` y **no** aparece en `sitemap-index.xml` ni en los `sitemap-*.xml`.
- [ ] El rótulo "Ejemplo ilustrativo de Efeonce" es visible en el viewport inicial (sin scrollear) y niega autoría **y** alojamiento.
- [ ] Toda `<img>` tiene `alt` no vacío, y toda imagen tiene autor + licencia + enlace visibles. **Ninguna imagen fue generada con IA.**
- [ ] Toda cifra del panel de evidencia tiene fuente y `as-of` visibles (el schema Zod lo obliga: sin ellos, el build falla).
- [ ] El artículo cumple el checklist medido: cápsula de respuesta de 40–60 palabras por H2, cada H2 = una sub-pregunta del fan-out y autocontenido, **≥1 tabla**, **≥1 lista numerada**, estadísticas con fuente y ≥1 cita textual.
- [ ] El JSON-LD valida contra schema.org, **marca solo contenido visible en la página**, y no tiene campos inventados.
- [ ] El copy **en ninguna parte** promete el rich snippet de FAQ en Google, ni rankings, ni citas garantizadas.
- [ ] El acoplamiento funciona **con teclado** (`Tab` produce el mismo estado que `hover`; `Enter` fija; `Escape` suelta) y el nodo activo lleva `aria-current="true"`.
- [ ] Con `prefers-reduced-motion: reduce`, `transitionDuration` es `0s` en los acoplables y el scroll es `auto`. **El significado se conserva.**
- [ ] El elemento acoplado se distingue por **más que color** (existe `outline-style` distinto de `none`).
- [ ] **Sin JavaScript**, el artículo, la capa de máquina y la evidencia siguen presentes en el DOM.
- [ ] No hay scroll horizontal de página en 1440 px ni en 390 px (el panel de schema scrollea dentro de su contenedor).
- [ ] Un cliente nuevo se agrega escribiendo **solo un payload**: ningún componente contiene el nombre de un cliente ni un `if` por cliente.
- [ ] El `hero-desktop.png` **fue mirado a tamaño de lámina** y la correspondencia se lee.
- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: interaction`; el wireframe y el contrato de motion existen y están completos.
- [ ] `UI ready` pasa a `yes` solo cuando `pnpm task:lint --task TASK-1410` queda sin findings.

## Verification

En **`efeonce-think`**:

- `pnpm build` (el schema Zod valida el payload en build)
- `pnpm type-check` (`astro check`)
- `pnpm verify:aeo-xray` (nuevo — las 8 assertions duras + capturas desktop/mobile/reduce)
- **Mirar** `hero-desktop.png`, `hero-mobile.png` y `reduced-motion.png`. No basta con que el script pase.

En **`greenhouse-eo`**:

- `pnpm task:lint --task TASK-1410`
- `pnpm ui:wireframe-check --task TASK-1410`
- `pnpm ui:motion-check --task TASK-1410`
- `pnpm ops:lint --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] **El enlace vivo fue entregado al operador y la captura entró a la lámina del deck de SKY.**
- [ ] **El `README.md` de `efeonce-think` explica cómo crear la muestra del siguiente cliente** (escribir un payload; cero código).
- [ ] `docs/commercial/tenders/sky-blog-2026/README.md` registra el enlace de la muestra como artefacto `client_facing` del bid.

## Follow-ups

- **Probe a nivel de artículo en el AI Visibility Grader.** Hoy los probes son **site-level** (homepage + `robots.txt` + `sitemap.xml` + `llms.txt` + `.well-known/*`). No existe *"dame la URL de un artículo y evalúa su capa AEO"*. Esa capacidad convertiría esta muestra estática en una **herramienta** — y ya existe la mitad del motor (`src/lib/growth/ai-visibility/probes/html.ts` sabe extraer y aplanar JSON-LD). Encaja con `PRODUCT_ROADMAP.md:183` (extender el grader al eje SEO, EPIC-022).
- **Versión genérica sin marca de cliente**, indexable, como activo de captación en Think. La versión con marca de cliente es `noindex` por diseño; una genérica sí puede hacer el trabajo de hub. Conecta con `PDR-001` (landing SEO complementaria a `/aeo-2/`, hoy sin demo).
- **Segundo payload (Berel u otro)** — es la prueba real de que el motor es reutilizable. Mientras exista un solo payload, la reutilización es una hipótesis, no un hecho.

## Delta 2026-07-14 (b) — la sesión de pulido: tipografía, fotografía, voz y la frontera ②/③

La pieza estaba **viva y funcionando**, y una sesión de pulido con el operador destapó **seis clases de bug** que el gate no veía. Todas cerradas y desplegadas. Detalle completo en [`docs/think/radiografia-aeo-architecture.md`](../../think/radiografia-aeo-architecture.md).

### 1. 🔴 Un `@font-face` que falta no falla: **sustituye**

La ruta pedía Poppins **600/700** y **nunca importó ninguno de los dos** — solo heredaba los 800/900i del slogan. El matching de CSS (Fonts L4 §5.2) busca hacia arriba y **sustituye**: los cuatro pantallas salían en **ExtraBold** mientras el CSS decía 600. Como el 800 es un cut real (no una negrita sintética), se veía *pesado pero bien dibujado* — no lo cazó el build, ni el lint, ni un assert de string. **El CSS no mentía; mentía el navegador.** Sistema de pesos con rol + compensación óptica (titulares ≥40px bajan a 500). Asserts **36-37** (peso **computado**, no declarado).

### 2. El color no era el color: `#001a33` no existe en AXIS

El navy de Efeonce **no es un color aparte**: es el peldaño **800/900 de la rampa del acento** (`axis-tokens.ts` lo dice literal). Lo que había era rgb(0,26,51) — casi negro-azul, **otra marca**. Todo deriva ahora de AXIS. De 24 hex crudos quedan la rampa y el blanco.

### 3. La tipografía del cliente: **el mockup usa la fuente del cliente**

SKY usa **Assistant** (700 titulares / 400 cuerpo a 18px). Ponerle Poppins es **la misma mentira** que teñirlo con nuestro navy: muestra un resultado que el cliente nunca vería. **Frontera dura:** Assistant vive **solo** bajo `.xr-article`; el chrome, el instrumento y las pantallas ①/④ siguen en Poppins + Geist. Asserts **38-39** (en los dos sentidos).

### 4. Fotografía licenciada (Shutterstock) + tres bug classes silenciosas

Las fotos eran **miniaturas** de Wikimedia (hero 1400×600) → pixelado. Y el hero estaba en **`21/9`**: sacar esa franja de una foto 3:2 **tira el 60% del alto**. Ahora **todas a 16:9**, y cuatro fotos licenciadas (96 → 94 créditos).

🔴 **Verificar cada foto contra su `description`, nunca contra sus keywords.** `789778528` se buscó como «Carretera Austral» y **era la Ruta 40 de ARGENTINA** (con `carretera` y `chile` entre sus keywords). De 13 candidatos "obvios", **9 eran de otra región o país**. Y `is_editorial` debe ser `false`. → **`TASK-1411`** formaliza la capability.

### 5. 🔴 La coherencia NO es una propiedad estructural

**El gate dio 40/40 con un artículo que se desmentía a sí mismo en SIETE puntos** (el lead contradecía una cápsula; un espantapájaros inventado; dos explicaciones para el mismo número; *«Google te promete dos horas»* — falso; «tres puertas» vs «las dos puertas»; «TRES transbordadores» vs «los DOS del norte» — **ése estaba desde el día uno**).

**La raíz:** se escribió la capa del narrador **sin releer el artículo completo**. Nuevo script **obligatorio**: `pnpm read:aeo-xray` — imprime cada párrafo **pegado a su cápsula**. *No verifica nada: hace que la contradicción salte a la vista en 30 segundos.*

### 6. La voz: dos capas, y el hook vive en la cápsula

> **La cápsula RESPONDE. El párrafo cuenta lo que la respuesta NO dice.**

Y **la cápsula puede SER el hook**: *answer-first ≠ voz de diccionario*. Abrir con *«La Carretera Austral (Ruta 7) recorre 1.247 km…»* es una **entrada de enciclopedia** — la radiografía filtrándose al artículo. StoryBrand: **el lector es el héroe, el artículo es el guía**. Hilo conductor que abre y **cierra**. Registro conversacional real (preguntas, remates cortos, antítesis, anáfora, cadencia de 1 a 34 palabras). **+ índice con anclas**, derivado de los H2 (drift imposible).

### 7. La frontera ②/③, y el contrato del acoplamiento

La ② se llama **«lo que ve el lector»**: fuera los rótulos, **los recuadros** y el pie de licencias. Todo el aparato va en la ③. *No cuesta nada en AEO: el motor lee el texto, no el CSS.*

Y **4 de las 6 cápsulas eran huérfanas** — acoplables, pero sin contraparte en el instrumento: se iluminaban **contra la nada**. Asserts **40-41** (huérfanos y fantasmas).

**Gate: 42/42.** Vive en `https://think.efeoncepro.com/muestras/sky-carretera-austral-861c18cc0e37`.


## Open Questions

- **El ángulo del artículo está sin resolver por diseño** y lo resuelve el gate humano del Slice 1. El agente **no debe** elegirlo.
- **¿La muestra se enlaza desde el deck, desde la oferta técnica, o desde ambos?** La oferta técnica ya está cerrada (11/07) y reabrirla tiene costo; el deck está pendiente de ajustes visuales. La ruta de menor riesgo es **solo el deck**, pero la decisión es del operador.

## Delta 2026-07-13 — Slices 1 a 5 ejecutados. Estado: `code complete, rollout pendiente`

**Lo que está hecho** (repo `efeonce-think`, commit `94d22fa`; `greenhouse-eo`, commits `cf7a75ddd` + `405a6e7ec`):

- **Slice 1** ✅ Investigación Semrush (base `cl`) → `docs/commercial/research/sky-blog-aeo-gap-2026-07.md`. **Gate humano cerrado: el operador eligió Carretera Austral.**
- **Slice 2** ✅ Artículo escrito de cero + payload validado por schema Zod.
- **Slice 3** ✅ 4 fotos de Wikimedia Commons con licencia CC verificable y crédito visible. Cero IA.
- **Slice 4** ✅ Motor de render en `/muestras/[slug]`.
- **Slice 5** ⏳ `pnpm build` + `type-check` limpios, `pnpm verify:aeo-xray` **15/15**, frame héroe **mirado**. **Falta el push + deploy: la URL todavía no existe.**

### Dos desvíos del wireframe, ambos deliberados

**1. Cero React. No hay island.** El wireframe declaraba una island (`XrayCoupling`, `client:idle`). Al implementar, chocó de frente con la regla dura de la skill de Astro: *"NEVER over-hydrate: reading content that never changes must stay zero-JS."* El artículo y el panel son contenido estático; envolverlos en React para conmutar un resaltado habría hidratado dos paneles enteros por una microinteracción. La implementación real es un `<script>` de ~40 líneas que conmuta `data-on` y deja que el CSS haga el resaltado. Degrada solo, pesa nada, y el estado héroe viene pintado desde el HTML.

**2. El acoplamiento héroe cambió de `faq` a `capsule-main`.** El FAQ era el argumento más fuerte (ataca el 37/100), pero el bloque vive muy abajo del artículo: la primera captura salió **sin una sola correspondencia encendida en el pliegue**. Un acoplamiento que no se ve no argumenta nada — y era exactamente el riesgo `medium-high` que la propia task había anotado. La cápsula de respuesta está arriba, igual que su contraparte, y las dos se ven en el frame. **Esto se detectó mirando la captura, no assertándola.**

### Tres bugs reales que cazó el gate (y que ningún test unitario habría visto)

| Bug | Cómo se veía | Causa |
|---|---|---|
| **892 px de scroll horizontal en móvil** | La página entera se desplazaba de lado | `min-width: auto` en los hijos de CSS Grid: el `<pre>` del JSON y la tabla se negaban a encogerse |
| **La página se arrastraba sola bajo el cursor** | Al acoplar, saltaba el scroll del documento | `scrollIntoView` scrollea **todos** los ancestros. Se reemplazó por mover el `scrollTop` del panel a mano |
| **El frame héroe salía sin acoplamiento** | La captura de la lámina no mostraba ninguna correspondencia | Ver desvío 2 |

También quedó anotado un **falso rojo** del propio verify: `locator.hover()` de Playwright scrollea el elemento a la vista como parte de su chequeo de accionabilidad. Medir el scroll después de un `hover()` mide a Playwright, no a nuestro código. El assert 13 ahora despacha el `mouseover` a mano.

### Lo que falta para cerrar

- [ ] `git push` de `efeonce-think` + deploy en Vercel → **la URL no existe todavía**.
- [ ] Verificación post-deploy contra la URL de producción: `view-source` sin `application/ld+json`, `/muestras/` fuera de `sitemap-index.xml`, rótulo visible sin scrollear.
- [ ] Entregar el enlace al operador + la captura `hero-desktop.png` a la lámina del deck.
- [ ] Registrar el enlace como artefacto `client_facing` en `docs/commercial/tenders/sky-blog-2026/README.md`.

## Delta 2026-07-13 (2) — URL tokenizada, por decisión del operador

La ruta pasa de `/muestras/<slug>` a **`/muestras/<slug>-<token>`**.

**Por qué.** La URL sin token es adivinable: quien recibe `/muestras/sky-…` puede probar `/muestras/jetsmart-…`. Hoy no encontraría nada. El día que le hagamos una muestra a un **competidor directo de un cliente vigente**, sí — y esa es una conversación que no queremos tener. El operador decidió tokenizar desde el arranque en vez de dejarlo como regla escrita.

**Slug + token, no token opaco.** Se conserva el slug legible porque el evaluador **lee la URL antes que el H1**: `sky-carretera-austral` se lee como *"esto lo hicieron para nosotros"*, no como una plantilla con el logo cambiado. Un token opaco (`/muestras/r/<token>`, el patrón del grader) no aportaría nada extra — la página revela el cliente apenas carga.

**🔴 El token se DECLARA en el payload, jamás se genera en el build.** Un token aleatorio por build cambiaría la URL en cada deploy, y esta URL va a una **lámina y a una propuesta**. Está validado por el schema (12 hex, `openssl rand -hex 6`). El `verify` lo **lee del payload** en vez de hardcodearlo, para que el gate y la URL real no se separen en silencio.

**Es oscuridad, no seguridad.** No hay auth: quien tenga el enlace, entra. Para una muestra de trabajo, es exactamente lo que queremos — no queremos que el comité tenga que loguearse.

**URL del primer caso:** `https://think.efeoncepro.com/muestras/sky-carretera-austral-861c18cc0e37`

*(Las imágenes siguen en un path legible, `/muestras/sky-carretera-austral/*.jpg`. Es deliberado: el token protege la **página**, que es la pieza. Un JPEG suelto no prueba nada y hay que adivinar su nombre igual.)*

Commit: `efeonce-think` `2133154`. `verify:aeo-xray` 15/15 · `type-check` limpio.

## Delta 2026-07-13 (3) — DEPLOYED. Rollout completo.

**Vive:** `https://think.efeoncepro.com/muestras/sky-carretera-austral-861c18cc0e37`

Push a `main` de `efeonce-think` (fast-forward limpio: `origin/main` era ancestro de HEAD y solo viajaron los 2 commits de esta task — nada ajeno). Deploy Production en Vercel: **Ready, 17s**.

### Verificado contra PRODUCCIÓN, no contra el build local

| Gate | Resultado |
|---|---|
| Cero `<script type="application/ld+json">` en el HTML servido | ✅ **El schema falso de SKY NO está publicado en nuestro dominio** |
| `<meta name="robots" content="noindex">` | ✅ |
| `/muestras/` fuera de `sitemap-0.xml` | ✅ |
| Rótulo "Ejemplo ilustrativo de Efeonce" visible | ✅ |
| La tesis (18.100 búsquedas/mes) en el HTML servido, sin JS | ✅ |
| El JSON-LD se ve **como texto** | ✅ |
| **La URL sin token → 404** (prueba de adivinanza) | ✅ **no adivinable** |
| El acoplamiento **vivo** en producción (hover → se enciende la contraparte) | ✅ |

Captura de producción: `efeonce-think/.captures/aeo-xray/PROD-couple.png`.

**Estado: `complete`.** El enlace quedó registrado como artefacto `client_facing` en `docs/commercial/tenders/sky-blog-2026/README.md`.

### Lo único que queda, y es del operador

- Meter la captura (`hero-desktop.png` / `PROD-hero.png`) a una lámina del deck de SKY.
- Decidir si la muestra se enlaza **solo desde el deck** (recomendado: no reabre nada) o también desde la oferta técnica, cerrada desde el 11/07.
- Subir a Wherex (regla dura del bid: el agente prepara, el humano sube y firma).


## Delta 2026-07-13 (4) — Dirección de arte: la pieza es un instrumento y ahora lo parece

Feedback del operador sobre la V1 desplegada: *"falta jerarquía, falta branding de Efeonce, y cuando paso el cursor no sé si mirar a la izquierda o a la derecha"*. Los tres eran correctos, y el tercero era un error de encoding, no de gusto. Se auditó con las skills `modern-ui` + `typography-design`.

### El diagnóstico: se llama Radiografía y estaba diseñada como dos tarjetas blancas

**Un solo movimiento resolvió casi todo: DOS ZONAS DE MARCA.**

- **Izquierda = la muestra del CLIENTE.** Fondo claro, su acento. Es el **espécimen**.
- **Derecha + todo el chrome = el INSTRUMENTO de Efeonce.** Navy `#001a33` + azul `#0375db`, Geist/Poppins. Es la **máquina que lo lee**.

La V1 usaba el magenta de SKY para **todo** — incluidas *nuestras propias anotaciones*. El análisis de Efeonce hablaba con la voz del cliente. Estaba invertido.

La separación hace tres cosas de una: pone la marca donde corresponde, vuelve los dos lados **inconfundibles** (por eso el ojo ya sabe dónde mirar), y **refuerza el disclaimer sin decir una palabra** — se *ve* que el artefacto del cliente está contenido dentro de nuestro instrumento. Es el patrón de las DevTools / el inspector de Figma: lee como **herramienta**, no como dos cards.

### El acoplamiento era simétrico, y por eso era ambiguo

Fuente y destino recibían **el mismo tratamiento**. Si los dos gritan igual, el ojo no sabe cuál es la causa y cuál el efecto.

**Regla nueva: la fuente susurra, el destino grita.**

| | Antes | Ahora |
|---|---|---|
| **Fuente** (bajo el cursor) | outline + tinte | tinte + barra lateral, **sin outline** — ya la estás tocando |
| **Destino** (el pago) | outline + tinte | outline + **pulso** + **marca de origen `←`** |
| **Dirección** | ninguna | **chip `→ 3 datos`** que apunta a través de la canaleta y dice *cuánto* hay |
| **En reposo** | **nada avisaba que el artículo era interactivo** | punto discreto en el borde derecho de cada bloque acoplable |
| **Apilado (móvil)** | igual que desktop | el chip apunta `↓` y la marca de origen `↑` — **el dato viene de arriba, no de la izquierda** |

Se descartaron las líneas SVG conectoras: exigen geometría en cada scroll/resize, se rompen con el panel scrolleando por dentro, y apiladas no significan nada.

### Jerarquía

- **Escala real** (base 16 × 1.25) en vez de **seis tamaños dentro de 4px** — con esos saltos la jerarquía era imposible por construcción. El cuerpo sube a 16px (estaba **bajo el piso** que exige `typography-design`).
- **El número es el héroe:** `72,4%` · `2,3×` · `8/100` a 40px, Geist con `tabular-nums` (**nunca monoespaciada** — regla dura de la skill: lee como editor de código). La prosa pasó a ser la nota al pie del número, no al revés.
- **Tres niveles de nodo** (`tier`, y es **dato**, no código): el 1 mueve un número del diagnóstico; el 3 es *prueba de completitud, no argumento*, y va callado. Antes `og:title` pesaba **exactamente igual** que `FAQPage`. Esa era la planitud.
- **El JSON se colapsa** bajo "Ver el código". El argumento es el stat + el para qué; el código es su prueba. Con el JSON abierto el panel era un muro y el argumento quedaba enterrado bajo su propia evidencia.
- **La evidencia SUBE:** el instrumento **abre** con tres KPIs (`18.100` / `+100` / `0`). Era el argumento —*"venimos a aportarles"*— y estaba al fondo de 3.000px de scroll.
- **El h1 de la página deja de robarle el título al artículo.** Ahora la página se llama por lo que es (*"Radiografía AEO · muestra para SKY"*) y el título del artículo vive solo dentro de su panel.

### Lo que emergió sin diseñarlo

Al pasar por el bloque de **Preguntas frecuentes**, el acoplamiento enciende el KPI **"0 citas en 35 respuestas"**. La pieza conecta sola el FAQ del artículo con la evidencia de que hoy nadie cita a SKY. No estaba planeado: salió del grafo de acoplamiento.

### Verificación

`verify:aeo-xray` **16/16**. El assert nuevo: *en táctil el copy no habla de "cursor"*. Playwright reportaba `hover: hover` en un viewport de 390px (Chromium de escritorio con ventana chica), así que **la captura mentía** — mostraba "Pasa el cursor" en un teléfono. Ahora emula táctil (`hasTouch` + `isMobile`) y lo assertea.

Desplegado y verificado contra producción. Commit `efeonce-think` `d2cb4f8`.


## Delta 2026-07-13 (5) — El espécimen es EDITORIAL, no product UI

Feedback: *"el área del artículo se ve super plana"*. Correcto, y la causa era estructural: **le apliqué densidad de producto a un artefacto editorial.**

El panel izquierdo es un **mockup de un blog real** — eso es *marketing UI* (cuerpo 18–21px, interlineado generoso, imágenes que respiran), no *product UI* (13–16px, denso, compacto). `modern-ui` separa los dos explícitamente, y yo mezclé: diseñé el artículo con la densidad del instrumento **porque vive dentro del instrumento**. Resultado: le estábamos mostrando al comité **un wireframe del contenido que produciríamos, no el contenido**.

### 🔴 Y había un error de CORRECCIÓN, no solo estético

El `BlogPosting` declara `author`, `datePublished` y `articleSection` — y **ninguno de los tres estaba visible en el artículo**. El schema **solo puede marcar contenido visible** (marcar contenido oculto es violación de política de Google). **La muestra estaba violando su propia tesis.**

La firma (categoría · autor · fecha · tiempo de lectura) **no es adorno: es lo que hace legal ese schema.** Que además haga que el artículo se lea como un post publicado es la consecuencia, no el motivo.

### Qué cambió

| | Antes | Ahora |
|---|---|---|
| Cuerpo | 16px / 1.65 | **18px / 1.7**, medida 64ch |
| H1 | 25px | **36px Poppins**, `text-wrap: balance` |
| Hero | thumbnail recortado a **150px** | **a sangre, 21:9** |
| Ritmo | márgenes de 0.45rem | aire **antes** de cada H2 (el ojo agrupa por proximidad) |
| Firma | **no existía** (y el schema la declaraba) | categoría · autor · fecha · lectura calculada |
| Cita destacada | no existía | **bloque nuevo** (es DATO) + su nodo **+41%** — la táctica GEO de mayor lift medido |
| Tabla | planilla de 13px | presencia editorial: bordes, aire, primera columna fuerte |
| Lista | viñetas | contadores en el acento del cliente |
| URL | chip con el dominio | **barra con la URL canónica completa**, en contexto |

### Tres bugs que el gate cazó — y que yo mismo introduje

1. **Al reescribir el CSS borré las reglas del lado FUENTE del acoplamiento** (chip, marca en reposo, resaltado). **No se notaba** porque la cápsula tiene fondo tintado propio y *parecía* encendida. → **assert 17**: el chip direccional tiene que ser **visible**, no solo existir en el CSS.
2. **El mouse QUIETO le robaba el acoplamiento al teclado.** Al enfocar con Tab la página scrollea, los elementos pasan bajo el cursor inmóvil y disparan un `mouseover` fantasma que repinta encima de lo que el teclado acababa de seleccionar. Un usuario que navega con teclado y dejó el mouse apoyado **no podía conducir la pieza**. → seguimiento de modalidad de entrada. El assert 12 ahora ejercita el caso real (teclado **con el mouse apoyado en otra parte**).
3. **El chip contaba de menos** (no incluía los nodos de evidencia ni del fan-out, que **sí** se encienden) y decía **"1 datos"**.

### Frames para la lámina

Con el hero editorial la correspondencia queda bajo el pliegue. **La página se diseña para leerse; la lámina se captura donde argumenta.** El verify produce dos frames deliberados:

- **`slide-oficio.png`** — la cápsula de respuesta ↔ el **72,4%** de las páginas que ChatGPT cita.
- **`slide-competencia.png`** — el H2 de *«cómo se llega»* ↔ **quién ocupa hoy ese espacio**.

`verify:aeo-xray` **17/17**. Desplegado y verificado en producción. Commit `efeonce-think` `d492f6e`.


## Delta 2026-07-13 (6) — Auditoría con `a11y-architect` + `seo-aeo` + `copywriting`

### 🔴 El hallazgo más grave: sobre-declaré una táctica

El nodo **«+41% de visibilidad con citas textuales — la táctica GEO de mayor lift medido»** estaba **mal aplicado**. La investigación GEO (Princeton + Georgia Tech + Allen Institute, KDD 2024) mide *Quotation Addition* = **citas de fuentes o expertos entre comillas**. La cita destacada de la muestra es **una frase nuestra resaltada**. Le atribuí un lift medido a una técnica que **no apliqué** — en la pieza cuyo valor entero es *no exagerar*, y que un evaluador técnico caza en un minuto.

**La salida no fue maquillar el claim: fue declarar las tácticas que SÍ aplicamos y no estábamos reclamando.**

- **Cite Sources (+30%)** — tres fuentes enlazadas y verificables. El comité las puede comprobar en el acto.
- **Statistics Addition (+32%)** — cada dato con unidad y fuente (1.247 km · 56 km · 40 min · 5 h).

La cita destacada queda declarada **por lo que es** (un pasaje extraíble y atribuible) y su nodo dice **explícitamente por qué NO es el +41%**.

### 🔴 E-E-A-T del autor: la debilidad convertida en aporte

El artículo firma «Equipo editorial SKY» —la práctica actual del blog— y el schema **solo puede declarar lo que es cierto**. Pero es la versión **más débil posible de E-E-A-T**, justo en el eje donde SKY saca **37/100**.

En vez de **inventar una persona** (fabricación) o **esconder el hueco** (deshonestidad), la muestra **lo declara**: nodo nuevo `author → Person (recomendación)` que arregla el 37 y dice que es **el primer cambio que propondríamos**. *La muestra dice también lo que le falta* — que es exactamente el "venimos a aportarles".

### 🔴 Dos fallos WCAG 2.2 AA

- **El chip direccional es `content` de CSS** → la afordancia central de la pieza era **sighted-only**. Un usuario ciego no sabía que el artículo produce datos, ni cuántos. Ahora cada bloque acoplable lo anuncia.
- **El `<pre>` scrollea pero no era enfocable** (2.1.1). Un usuario de teclado **no podía leer el JSON completo**.

*(Los dos anteriores —el header pegajoso tapando el nodo (2.4.11) y el mouse quieto robándole el foco al teclado— eran de la misma familia.)*

### 🟡 Menores

Sin JS el *hint* prometía interactividad que no ocurre (ahora se revela solo cuando el JS carga) · texto de 10px → 12px · un cierre que conecta la muestra con la oferta · *«La diferencia no es menor»* reescrito (**decía** que algo importa en vez de **mostrarlo**).

### Dos bugs que solo se vieron MIRANDO

1. **La regla CSS `.sr` nunca se agregó**: el reemplazo apuntaba a una clase que ya no existía tras el rediseño → **no-op silencioso**, y los textos para lectores de pantalla **se veían en pantalla**. → assert 24.
2. **El assert 20 pasaba por la razón equivocada** (por distancia entre strings). Y *«que la cadena +41% no exista»* habría sido un test **falso**: la muestra **nombra** esa táctica a propósito, dentro de la frase que declara que **no la aplica**. Lo que no puede existir es un **stat** que la reclame. → assert 20 parsea los stats renderizados, y el **20b** exige lo simétrico: que sí se declaren las que sí aplicamos.

`verify:aeo-xray` **25/25**. Desplegado y verificado en producción. Commit `efeonce-think` `3c42109`.


## Delta 2026-07-14 (7) — De una pantalla a un FLOW de cuatro. Y documentado en Greenhouse.

*"En vez de una pantalla, debes pensar entonces en un flow de pantallas."* Correcto, y es una corrección de **arquitectura**, no de layout.

La V1 metía **cinco trabajos en una página**. Y el síntoma que el operador venía reportando —*"el artículo se ve plano"*— tenía su causa raíz **acá**: **el artículo nunca tuvo espacio para ser LEÍDO**, porque el panel de máquina le comía el 46% del ancho. Le puse tipografía editorial a un contenedor que no era editorial.

### Las cuatro pantallas

| # | Ruta | Trabajo |
|---|---|---|
| ① | `/muestras/<slug>-<token>` | **El hueco.** El SERP real: Wikipedia, Instagram, gochile, chile.travel, TripAdvisor. **Cero aerolíneas.** Y SKY es la que vuela a Balmaceda. Vivía comprimido en una cajita; ahora es la portada y es el golpe |
| ② | `…/articulo` | **El artículo.** Ancho completo, **sin acoplamiento**. Acá por fin respira |
| ③ | `…/radiografia` | **La radiografía.** El split. Funciona 10× mejor porque el evaluador **ya leyó** el artículo: la revelación aterriza en vez de competir por su atención |
| ④ | `…/atomizacion` | **Dónde más vive.** *«Este artículo no vive solo en una URL»* — la frase **textual** de la oferta, que la muestra hasta hoy **contradecía** |

### La atomización no es una lista de entregables

Cada átomo es **una superficie más donde el motor de respuesta puede encontrar a SKY**, con su dato medido:

- **Video** ← del H2 *«¿Cómo se llega?»*. **YouTube superó a Reddit** como la plataforma social más citada. El video **es un canal de búsqueda**, no contenido extra.
- **Pieza social** ← de la cita destacada. Las **menciones off-site correlacionan ~3× más que los backlinks** con la visibilidad en IA. La distribución social se hace **por entidad**, no por alcance.
- **Set de imágenes** ← las 4 fotos, con el `alt` **como contenido**, no como trámite.

Y cada uno declara su **línea de sangre**: de qué bloque del artículo nació. **No son entregables sueltos: son derivados con trazabilidad.**

**Honestidad:** la tarjeta del video dice explícito que **especifica el entregable y NO lo simula** — la producción va en el mes 1. Un reproductor con play y nada detrás sería la trampa que esta pieza existe para no cometer.

### Navegación y transiciones

**Riel pegajoso** cuyo trabajo no es navegar sino **avisar que el recorrido tiene más**. **"Siguiente"** grande con la frase que engancha. **Cada paso es una URL** (el deck enlaza directo) y **la URL que ya circulaba sigue viva**: es la portada.

**View Transitions cross-document, CSS puro, CERO JavaScript.** La que cuenta la historia es la **② → ③**: el artículo que acabas de leer **se encoge y se convierte en el espécimen** bajo el instrumento. El chrome y el riel **no** se animan: son el marco estable.

### Lo inmediato que se cerró antes

**Core Web Vitals.** La pieza **reprobaba su propio examen**: 1,5 MB de JPEG crudos desde `public/`, que salta el pipeline de Astro (sin `width`/`height` → CLS; sin `srcset` → el teléfono bajaba los 527 KB del hero de escritorio; sin AVIF). Y **optimizar no arregla una fuente mal recortada**: el hero era **933×1400 vertical** para pintarse como franja 21:9.

| | Antes | Ahora |
|---|---|---|
| Imágenes en móvil | 1.536 KB | **78 KB** (20×) |
| Imágenes en desktop | 1.536 KB | **128 KB** |
| LCP | — | **52 ms** móvil · **112 ms** desktop |
| CLS | garantizado | **0** |

**El acoplamiento no existía en móvil.** Apilado, el instrumento queda a **diez pantallas**. Tocabas un bloque, se encendía el chip… y nada más. Ahora **sube como hoja inferior**. Y otro falso verde propio: lo medía con `isVisible()`, que **solo mira el CSS** y devolvía `true` para un nodo diez pantallas fuera de vista.

### Documentación en Greenhouse (para que sobreviva a la sesión)

- **`docs/think/radiografia-aeo-architecture.md`** — los 10 invariantes, el flow, la arquitectura de datos, los CWV, la a11y, el gate.
- **`docs/think/radiografia-aeo-manual.md`** — cómo se crea la muestra del siguiente cliente, qué significan las señales, qué NO hacer, problemas comunes.
- **`docs/ui/flows/TASK-1410-aeo-article-xray-flow.md`** — el contrato de flow. La task pasa de `UI impact: interaction` a **`flow`**.
- **`docs/think/README.md`** — índice + tabla de herramientas vivas en Think + dos principios nuevos (*un gate verde con una captura ilegible no es un cierre válido* · *una muestra con marca de cliente NUNCA emite su schema como marcado activo*).

`verify:aeo-xray` **36/36**. Desplegado y verificado en producción. Commit `efeonce-think` `60b7784`.
