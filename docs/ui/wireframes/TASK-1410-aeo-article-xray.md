# TASK-1410 / think.efeoncepro.com — Radiografía AEO (AEO Article X-Ray)

## Meta

- Status: `draft`
- Owner task: `TASK-1410 — Radiografía AEO: demo reutilizable artículo + capa AEO visible`
- Product Design asset: no existe asset previo. La superficie **nace en esta task**. Referencia de lenguaje visual: tokens AXIS ya copiados en `efeonce-think` (`src/styles/`, `src/lib/primitives/`) y las landings vigentes `src/pages/brand-visibility/index.astro` + `src/pages/web-agentica/index.astro`, que fijan el registro visual del hub Think.
- Intended consumers: comité evaluador de una licitación (primer caso: SKY, Wherex) leyendo un enlace; equipo comercial Efeonce mostrando el enlace en vivo; una lámina del deck que lleva una captura de esta pantalla.
- Copy source: **`local one-off`.** El repo es `efeonce-think`, no `greenhouse-eo` — `src/lib/copy/*` y `greenhouse-nomenclature.ts` **no existen ahí**. El copy del artículo y del panel **es contenido**, y vive en el payload por cliente (`src/content/aeo-xray/<cliente>-<slug>.json`). Los strings de chrome (rótulo, nombres de panel, leyendas) viven en el mismo payload bajo `ui:`, para que el motor no hardcodee nada de un cliente.
- Primitive decision: `new` — no existe nada equivalente ni en Greenhouse (cero JSON-LD viewer / SERP preview en todo el repo, verificado 2026-07-13) ni en Think.
- UI ready target: `no`

## Brief

- Primary user: **evaluador de un comité de licitación.** No es técnico necesariamente; sí es escéptico. Llega desde un enlace en la propuesta o desde una lámina del deck.
- User moment: está comparando ofertas que **todas dicen lo mismo** ("optimizamos para SEO y AEO"). Ninguna se lo muestra.
- Job to be done: *"quiero saber si estos tipos realmente hacen algo distinto, o si es la misma promesa de siempre con otro nombre."*
- Primary decision signal: **la correspondencia visible.** Que el evaluador vea, con sus ojos, que cada dato de la capa de máquina corresponde a algo real que está en la página — y que el artículo existe porque un dato de investigación dijo que ahí había un hueco.
- Non-goals:
  - **No es un explicador de qué es el JSON-LD.** Si la pieza se vuelve un tutorial, perdió.
  - **No es un lead magnet.** No captura, no tiene formulario, no pide email.
  - **No es una herramienta.** No audita URLs que el usuario pegue (eso sería otro producto; ver Follow-ups de la task).
  - No es una página real del cliente y **no debe poder confundirse con una**.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Rótulo persistente (sticky, top) | Declara que es un ejemplo ilustrativo de Efeonce y **no** una página del cliente. No se puede cerrar ni scrollear fuera de vista. | `XrayDisclaimerBar.astro` | `payload.ui.disclaimer` |
| 1 | Encabezado de la pieza | Qué es, para quién, con qué fecha, y **la línea que lo justifica**: por qué existe este artículo y no otro. | `XrayHeader.astro` | `payload.meta` + `payload.evidence.thesis` |
| 2 | Panel A — El artículo (≈58% desktop) | El artículo **tal como se vería publicado** en el blog del cliente: hero, H1, cápsula de respuesta, H2/H3, imágenes con crédito, tabla, lista numerada, bloque FAQ, enlaces de cluster. | `ArticlePane.astro` + `ArticleBlock.astro` (por tipo de bloque) | `payload.article.blocks[]` |
| 3 | Panel B — La capa de máquina (≈42% desktop, pestaña 1) | Lo que el artículo le entrega a una máquina: meta title + description con **previsualización de resultado**, JSON-LD **como texto escapado**, `alt` de cada imagen, jerarquía de encabezados, Open Graph, enlaces internos. Cada ítem trae **una línea de "para qué"**. | `MachinePane.astro` + `SchemaBlock.astro` | `payload.machine.*` |
| 3b | Panel B — La evidencia (pestaña 2) | Por qué existe este artículo: keyword, volumen, posición actual del cliente, quién ocupa hoy ese espacio, la sub-pregunta del *fan-out* que nadie responde, y **qué H2 la cubre**. Cada cifra con su fuente y su `as-of`. | `EvidencePane.astro` | `payload.evidence.*` |
| 4 | El acoplamiento (no es una región: es el comportamiento que une 2 y 3) | Al enfocar un elemento del artículo se resalta su contraparte exacta en el panel, y viceversa. Es **el argumento de la pieza**: prueba que el schema describe contenido visible. | `useXrayCoupling` (island React) | `payload.*.coupleId` |
| 5 | Pie de licencias | Autor, licencia y enlace de cada imagen. **Es la demostración del requisito de "imagen libre de derechos o con permisos"**, no una nota al pie. | `LicenseFooter.astro` | `payload.article.images[].credit` |

**Momento héroe (restricción de diseño, no adorno).** La pieza se va a **capturar para una lámina 16:9**, y una pantalla partida densa reducida a ese tamaño se vuelve papilla ilegible. Por eso el estado inicial **no** es "todo apagado": al cargar, **un acoplamiento viene preseleccionado** (el bloque FAQ del artículo ↔ su nodo `FAQPage` en el panel), con ambos lados resaltados. Ese es el frame que se captura. Si el estado inicial no lee a tamaño de lámina, el diseño falló, aunque la página se vea bien en pantalla completa.

**Mobile (≤768px).** Los paneles se apilan: artículo primero, capa de máquina después, evidencia al final. El acoplamiento deja de ser *hover* y pasa a ser *tap*: tocar un elemento del artículo salta (scroll suave) a su dato, con el dato resaltado y un botón "volver al artículo". La correspondencia se preserva; el gesto cambia.

## Copy Ledger

Todo el copy visible sale del payload. Los ids son las claves del JSON, no un namespace de Greenhouse (este repo no tiene `src/lib/copy`).

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `ui.disclaimer.label` | 0 | "Ejemplo ilustrativo de Efeonce" | — | **Siempre visible.** Registro neutro, no promocional. |
| `ui.disclaimer.body` | 0 | "Esta página es una muestra de trabajo elaborada por Efeonce. No es una publicación de {cliente} ni está alojada en sus canales." | `{cliente}` | La frase debe negar dos cosas: autoría y alojamiento. |
| `ui.header.kicker` | 1 | "Muestra de trabajo — producción de contenido con capa AEO" | — | |
| `ui.header.thesis_label` | 1 | "Por qué existe este artículo" | — | Encabeza la línea de justificación. Es lo que convierte la demo en aporte. |
| `ui.pane_a.title` | 2 | "El artículo" | — | |
| `ui.pane_a.subtitle` | 2 | "Lo que ve el lector" | — | |
| `ui.pane_b.tab_machine` | 3 | "Lo que lee una máquina" | — | Deliberadamente **no** dice "JSON-LD" ni "schema": el evaluador no es técnico. |
| `ui.pane_b.tab_evidence` | 3b | "La evidencia" | — | |
| `ui.pane_b.hint` | 3 | "Pasa el cursor por el artículo y verás qué produce en la capa de máquina." | — | Desktop. En mobile: "Toca un elemento del artículo para ver qué produce." |
| `ui.machine.why_label` | 3 | "Para qué sirve" | — | Prefija la línea causal de cada técnica. |
| `ui.machine.schema_note` | 3 | "Este bloque se muestra como texto. No está activo en esta página." | — | **Load-bearing.** Explica al evaluador técnico por qué el schema no se emite aquí — y de paso demuestra criterio. |
| `ui.evidence.source_label` | 3b | "Fuente" | — | Acompaña cada cifra, con su fecha. |
| `ui.license.title` | 5 | "Imágenes: autoría y licencia" | — | |
| `article.*` | 2 | — | todo | El artículo completo. Es contenido, no chrome. |

**Regla de copy dura.** El panel **nunca** promete un resultado enriquecido de FAQ en Google. Google restringió ese *rich result* en 2023 a sitios de gobierno y salud. El copy del `FAQPage` habla de **capa de máquina** (que un motor de respuesta pueda extraer y citar la respuesta), nunca de "la cajita de preguntas en Google". Un evaluador que lo verifique y nos pille exagerando destruye exactamente la credibilidad que la pieza vino a construir.

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | La página completa, con el acoplamiento héroe preseleccionado. | — | Estado por defecto y único estado "feliz". |
| loading | — | — | — | **No aplica.** Es una página estática (Astro SSG) con el payload compilado adentro. No hay fetch, no hay spinner. Si aparece un skeleton, alguien introdujo un fetch que no debía existir. |
| empty | — | — | — | **No aplica.** Un payload sin artículo no es un estado: es un error de build. El build debe fallar. |
| partial | — | — | — | **No aplica** en runtime. Ver `degraded` abajo. |
| degraded (sin JS) | El artículo y su capa de máquina | Ambos paneles se renderizan completos, apilados, **sin** el acoplamiento interactivo. | — | **Contrato duro:** sin JavaScript la pieza sigue argumentando. Se pierde el resaltado sincronizado, no el contenido. El evaluador que abre el enlace con JS bloqueado ve el artículo, el schema y la evidencia. |
| error | — | — | — | **No aplica.** Sin red, sin API, sin runtime que pueda fallar. |
| denied | — | — | — | **No aplica.** Página pública, sin auth. |

## Accessibility Contract

- **Heading order:** el `<h1>` de la página es el **título de la muestra**, no el título del artículo. El artículo se renderiza dentro de un `<article>` cuyo título es `<h2>`, y sus secciones internas bajan a `<h3>`/`<h4>`. Esto importa: si el artículo aportara el `<h1>` de la página, estaríamos construyendo una página que *se comporta* como el artículo del cliente, que es justo lo que la pieza no debe ser.
- **Chart/table alternatives:** la tabla del artículo es una `<table>` real con `<caption>` y `<th scope>`. No hay charts en la pieza.
- **Aria labels:** el bloque de JSON-LD es un `<pre>` con `role="region"` y `aria-label` que nombra el nodo (`"Datos estructurados: FAQPage"`). Cada control de acoplamiento es un `<button>` real, no un `<div>` con `onClick`.
- **Focus notes:** el acoplamiento debe funcionar **con teclado**, no solo con mouse. `Tab` recorre los elementos acoplables del artículo; al recibir foco, el panel resalta su contraparte igual que en `hover`. El resaltado nunca roba el foco.
- **Color-independent state labels:** el elemento acoplado activo **no** se marca solo con color: lleva además un borde y un cambio de peso/fondo. Un evaluador con daltonismo debe ver la correspondencia igual.

## Implementation Mapping

- Route / surface: `src/pages/muestras/[slug].astro` en el repo **`efeonce-think`** (Astro **7.0.6**, React 19.2, Tailwind 4.3, adapter Vercel, `output: 'static'`). Ruta estática vía `getStaticPaths()` sobre la colección → una entrada = una muestra. **Declarar `export const prerender = true` explícito** (el repo usa `output: 'static'` con rutas SSR puntuales; no dejar el modo ambiguo). URL primer caso: `https://think.efeoncepro.com/muestras/sky-<slug-del-articulo>`.
- Primitives: `new` — `XrayLayout`, `ArticlePane`, `MachinePane`, `EvidencePane`, `SchemaBlock`, `XrayDisclaimerBar`, `LicenseFooter`. Los tokens (color, tipografía, spacing) **se reusan** de AXIS ya copiado en Think como **CSS custom properties** (`var(--…)`). **NUNCA un HEX de marca hardcodeado** (regla dura del overlay). El `AxisWordmark` **no** aparece: es del design system, nunca del sitio público.
- Variants / kinds: `ArticleBlock` es la única primitive con variantes, una por tipo de bloque del payload: `heading | paragraph | answer-capsule | image | table | ordered-list | faq | internal-links | callout`.
- Component candidates: Astro para todo el render estático; **una sola island React** (`XrayCoupling`, `client:idle`) para el acoplamiento. GSAP ya está en el repo pero **no se usa acá** — ver el contrato de motion: esto es un resaltado, no una coreografía.
- Copy source: `payload.ui.*` (chrome) + `payload.article.*` (contenido). Sin `src/lib/copy` — ese contrato es de Greenhouse y no existe en Think.
- Data reader / command: **ninguno.** Cero API, cero DB, cero fetch en runtime. **El payload es una Content Collection**, no un JSON suelto: se declara en `src/content.config.ts` con loader `glob({ base: './src/content/aeo-xray' })` y **schema Zod**. Esto es regla dura del repo (*"NEVER `import.meta.glob` structured content that has a schema"*) y es además el gate de calidad del motor reutilizable: **un payload de cliente mal formado rompe el build en vez de publicar una muestra a medias.** El schema Zod obliga, entre otras cosas, a que toda imagen traiga `alt` + `credit.author` + `credit.license` + `credit.url`, y a que toda cifra de evidencia traiga `source` + `asOf`.
- API parity: **no aplica.** La pieza no expone ninguna acción de negocio (no muta estado, permisos, datos ni configuración). No hay capability que gobernar. **Tampoco viola la doctrina de "dumb render"** del overlay: no computa, no deriva, no decide — pinta un payload autorado. La investigación Semrush y la redacción ocurren *fuera*, y su resultado entra como contenido versionado. Si algún día esto se vuelve una herramienta que audita URLs de terceros, **eso sí** nace con contrato gobernado en Greenhouse — y es otra task (ver Follow-ups).
- Access / capability: pública, sin auth. **Con `noindex` y excluida del sitemap** mientras lleve marca de un cliente. La exclusión **no inventa mecanismo**: `astro.config.mjs` ya tiene `sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/preview/') })` — se extiende ese `filter` para excluir también `/muestras/`.
- Runtime consumers: navegador del evaluador. Nada más. (La página hereda el GTM de `BaseLayout`; es una página nuestra y eso es correcto, pero **no** se instrumenta ninguna conversión: la pieza no captura.)
- Print/email/PDF considerations: **la salida impresa no está en alcance de esta task.** El operador decidió entrega por **enlace + captura en la lámina**. Existe un `@media print` mínimo (apila paneles, expande todos los bloques de schema, imprime los créditos) para que un `Ctrl+P` no salga roto, pero **no se diseña ni se verifica un PDF**.
- GVC markers: **no aplica** — ver abajo.

## GVC Scenario Plan

**GVC no aplica a esta superficie, y decirlo es parte del contrato.** `pnpm fe:capture` es la herramienta del portal Greenhouse: navega rutas `(dashboard)` autenticadas con agent auth contra `localhost:3000` / staging de Vercel. Esta pieza vive en **otro repo** (`efeonce-think`), es **pública sin auth**, y se sirve desde otro deploy. Forzar GVC acá sería teatro de proceso.

El equivalente real ya existe en Think y hay que seguirlo: `scripts/verify-brand-visibility-landing.mjs` y `scripts/verify-surround-discovery-landing.mjs` (Playwright está en `devDependencies`). Esta task agrega **`scripts/verify-aeo-xray.mjs`** con el mismo patrón.

- Scenario file: `efeonce-think/scripts/verify-aeo-xray.mjs` (nuevo, sigue el patrón de los dos `verify:*` existentes)
- Route: `/muestras/sky-<slug>` contra `astro build && astro preview`
- Viewports: `1440×900` (desktop, el que se captura para la lámina) y `390×844` (mobile)
- Required steps: build → preview → navegar → assertar → capturar desktop y mobile
- Required captures: `desktop-hero.png` (estado inicial con el acoplamiento héroe activo — **este es el frame que va a la lámina**), `desktop-evidence.png` (pestaña de evidencia abierta), `mobile-stacked.png`
- Required `data-capture` markers: no aplican (son del helper de Greenhouse). El script selecciona por `data-testid` estándar.
- **Assertions (son gates duros, no chequeos cosméticos):**
  1. El HTML servido **no contiene ningún** `<script type="application/ld+json">`. Cero. Si aparece uno, el build está publicando datos estructurados falsos en nuestro dominio y **el script falla**.
  2. `<meta name="robots" content="noindex">` está presente.
  3. La ruta **no** aparece en `dist/sitemap-index.xml` ni en los `sitemap-*.xml` (`@astrojs/sitemap` está activo en el repo y la incluiría por defecto).
  4. El rótulo "Ejemplo ilustrativo de Efeonce" está en el DOM y es visible en el viewport inicial (no hay que scrollear para encontrarlo).
  5. **Toda** `<img>` tiene `alt` no vacío.
  6. Toda imagen tiene autor + licencia + enlace en el pie de licencias.
  7. Cada cifra del panel de evidencia tiene fuente y `as-of` (se verifica que ningún nodo de cifra quede sin su `<cite>`).
  8. Sin JavaScript (`javaScriptEnabled: false`), el artículo, el schema y la evidencia siguen presentes en el DOM.
- Scroll-width checks: `document.documentElement.scrollWidth <= clientWidth` en 1440 y en 390. El panel de schema es el sospechoso obvio (líneas largas de JSON) — debe scrollear **dentro de su propio contenedor**, nunca empujar la página.
- Accessibility/focus checks: recorrer con `Tab` los elementos acoplables y verificar que el foco dispara el resaltado y que el `:focus-visible` es visible.
- Reduced-motion evidence: correr con `prefers-reduced-motion: reduce` y verificar que el resaltado sigue ocurriendo (instantáneo, sin transición) y que el scroll de acoplamiento es `auto`, no `smooth`.

## Design Decision Log

- **Decision:** tres paneles (artículo · capa de máquina · evidencia), acoplados por interacción, en una página estática sin runtime, con el JSON-LD renderizado como **texto inerte**.
- **Alternatives considered:**
  1. **Dos paneles (artículo + código).** Era la petición original. Se descartó porque un artículo con código al lado es *un screenshot con código al lado*: enseña la técnica pero no argumenta. El tercer panel —la evidencia de por qué este artículo existe— es lo que convierte la pieza de "miren lo que sabemos hacer" en "miren el hueco que encontramos en su SERP y la pieza que lo tapa".
  2. **Emitir el JSON-LD activo para que sea "de verdad".** Es la trampa. Publicar en `think.efeoncepro.com` un `<script type="application/ld+json">` que declara `author: <cliente>` / `publisher: <cliente>` es **publicar datos estructurados falsos en nuestro propio dominio**, ingeribles por crawlers y motores de respuesta — justo en la pieza cuya tesis es el rigor técnico. Autogol perfecto. El schema se muestra como texto y la página lleva su propio schema honesto (una muestra de trabajo de Efeonce).
  3. **Un PDF.** Sobrevive a Wherex pero mata el acoplamiento, que es el 80% del argumento. El operador resolvió: enlace + captura en la lámina.
  4. **Una herramienta que audita cualquier URL.** Es mejor producto pero es otro proyecto, y la licitación cierra el 15/07. Queda como follow-up y tiene un hueco real que llenar: el grader de Greenhouse hoy solo tiene *probes* **a nivel de sitio**, no de artículo.
- **Why this pattern:** porque el schema **solo puede marcar contenido visible** (marcar contenido oculto es violación de política de Google). Esa restricción, que suena a limitación, es exactamente el argumento: la pantalla partida **prueba visualmente** que cada dato de la capa de máquina corresponde a algo que está en la página. Ningún competidor puede demostrar eso con un PDF.
- **Reuse / extend / new primitive:** `new`. Verificado el 2026-07-13: no hay JSON-LD viewer, SERP preview, meta preview ni nada equivalente en `greenhouse-eo` (cero resultados) ni en `efeonce-think`. Se reusan los tokens AXIS de Think; no se inventa lenguaje visual.
- **Open risks:**
  - **El frame para la lámina.** Una pantalla partida densa a 16:9 se vuelve ilegible. Mitigado con el momento héroe preseleccionado, pero hay que **mirar la captura**, no asumirla. El overlay de `efeonce-think` es explícito sobre esto: *"verify the real rendered frame, don't ship on green assertions alone — the AEO form regression shipped exactly because the gate didn't* look*."* Si a tamaño de lámina no se lee la correspondencia, se rediseña el estado inicial. Un `verify` verde con una captura ilegible **no es un cierre válido**.
  - **Densidad del panel de máquina.** Es fácil que se convierta en un muro de JSON. Los nodos van colapsados por defecto, salvo el del acoplamiento activo.
  - **Astro 7 es estricto con el HTML inválido** (ya no autocorrige: falla el build). El `<pre>` con el JSON-LD escapado es el candidato obvio a romperlo si el escape se hace mal. Se escapa con `set:text` / interpolación, **nunca** con `set:html`.
  - **El artículo todavía no existe.** Lo elige la investigación Semrush (Slice 1), no el diseñador. Este wireframe fija la **forma**; el contenido llega con el gate humano del Slice 1.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Charts have table/text alternatives.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts.


## Delta 2026-07-13 — La implementación real difiere de este wireframe en tres puntos

1. **Dos zonas de marca** (no estaba en el wireframe). Izquierda = espécimen del cliente (claro, su acento); derecha + chrome = instrumento de Efeonce (navy `#001a33` + azul `#0375db`). El wireframe pintaba los dos paneles iguales — y por eso el operador no sabía dónde mirar.
2. **Cero React.** El wireframe declaraba una island (`XrayCoupling`, `client:idle`). Chocaba con la regla dura de Astro (*"NEVER over-hydrate"*): el contenido es estático. Es un `<script>` de ~40 líneas que conmuta un atributo; el CSS hace el resaltado.
3. **Tres niveles de nodo + el stat como héroe.** No estaban. Ver `TASK-1410` → `## Delta 2026-07-13 (4)`.

El resto del wireframe (regiones, momento héroe, contrato de accesibilidad, plan de verificación) se implementó como está escrito.
