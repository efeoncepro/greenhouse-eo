# TASK-1343 / `/servicios/posicionamiento-seo` — Landing pública de servicio SEO

## Meta

- Status: `draft`
- Owner task: `TASK-1343`
- Product Design asset: `none aprobado aún` — dirección de diseño derivada en conversación con las skills `seo-aeo` + `commercial-expert` + `copywriting` + `modern-ui` (2026-07-05). NO existe Figma/PNG aprobado → `UI ready: no`.
- Intended consumers: sitio público Efeonce (`efeoncepro.com`, runtime WordPress/Elementor hoy → Astro `efeonce-web` futuro). NO es el portal Greenhouse (no aplican AXIS/MUI/`src/lib/copy`).
- Copy source: contenido de página del sitio público (WordPress/Elementor o Astro). NO `src/lib/copy/*` (eso es microcopy del portal). Copy validado con `greenhouse-ux-writing` + `docs/context/05_voz-tono-estilo.md`.
- Primitive decision: `reuse` — patrones marketing de `modern-ui` (editorial header, section header, floating stat card, card-on-section) + embed del `<greenhouse-form>` gobernado (Growth Forms) + link al nodo grader en `think.efeoncepro.com`. NO se crea primitive de portal.
- UI ready target: `no`

## Brief

- Primary user: decisor de marketing (ICP Globe: equipos enterprise) buscando proveedor de SEO — query comercial "agencia seo"/"posicionamiento web".
- User moment: solution/product-aware (Schwartz) — sabe que necesita SEO, evalúa a quién contratar.
- Job to be done: entender qué hace Efeonce en SEO, confiar en el método (no commodity), y dar el primer paso de bajo compromiso (diagnóstico).
- Primary decision signal: "esta agencia tiene método medible y además me prepara para la era de la IA" (diferenciador vs agencia SEO commodity).
- Non-goals: no es página de precios; no es la página AEO (`/servicios/aeo`, hermana); no es el hub `/servicios`; no reconstruye el grader ni el form (los embebe/enlaza).

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Nav global del sitio público | Header Efeonce existente | sitio |
| 1 | Hero | Outcome + keyword + mecanismo + 2 CTAs | `editorial header pattern` (modern-ui) | estático |
| 2 | Stakes | Por qué rankear ya no basta (hook PAS + dato) | full-bleed / `two-col split` | estático |
| 3 | Método | 3 pilares (técnico · contenido · entidad) como answer capsules | `section header` + 3 `floating feature cards` (grid container-query) | estático |
| 4 | Prueba | Resultados con números + mecanismo, logos, 1 testimonial | `card-on-section sandwich` | estático / casos |
| 5 | Puente AEO | Cimiento → filo; link a `/servicios/aeo` | banda de contraste | estático |
| 6 | Grader | Nodo de conversión: diagnóstico gratis | `card-on-section` con CTA al grader | link a `think.efeoncepro.com` |
| 7 | Cómo trabajamos | Modelo productizado + instrumentado (anti-fricción) | lista/steps | estático |
| 8 | FAQ | Q&A citable (AEO) + manejo de objeciones (JOLT) | acordeón `<details>` nativo + JSON-LD FAQPage | queries reales (Semrush `phrase_questions`) |
| 9 | CTA final | Cierre directo (grader + contacto) | banda CTA | link grader |
| 10 | Footer | Footer global | Footer Efeonce existente | sitio |

## Copy Ledger

> Copy es-CL, tuteo, mecanicista (context pack 05). IDs con convención public-site `public_site.servicios.posicionamiento_seo.*` (NO `src/lib/copy`). Wording final se valida con `greenhouse-ux-writing`.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `…hero.eyebrow` | 1 | Posicionamiento SEO | — | eyebrow |
| `…hero.h1` | 1 | Posicionamiento SEO con método: que te encuentren en Google, y que la IA no te ignore. | — | H1 carga keyword "posicionamiento SEO" |
| `…hero.subhead` | 1 | Técnico, contenido y entidad. Medimos lo que hacemos — no prometemos rankings. | — | mecanismo, sin promesa vacía |
| `…hero.cta_primary` | 1 | Diagnostica tu visibilidad | — | → nodo grader |
| `…hero.cta_secondary` | 1 | Habla con el equipo | — | → contacto/form existente |
| `…stakes.h2` | 2 | Rankear dejó de ser suficiente | — | hook |
| `…stakes.body` | 2 | Cuando aparece una respuesta de IA, la mayoría de las búsquedas terminan sin click. Estar en Google sigue siendo el cimiento — pero que te encuentren no garantiza que te elijan, ni que la IA te cite bien. | — | answer capsule 40–60 palabras |
| `…metodo.h2` | 3 | Cómo te hacemos encontrable | — | — |
| `…metodo.tecnica.title` | 3 | Base técnica — que te puedan leer sin adivinar | — | pilar 1 |
| `…metodo.tecnica.body` | 3 | Rastreo, indexación, Core Web Vitals y datos estructurados. Sin esto, ni Google ni la IA entienden tu sitio — por bueno que sea el contenido. | — | capsule |
| `…metodo.contenido.title` | 3 | Autoridad temática — que rankees por temas, no por keywords sueltas | — | pilar 2 |
| `…metodo.contenido.body` | 3 | Clusters de contenido por intención de búsqueda y guías de referencia. Construyes autoridad sobre un tema completo, no una palabra a la vez. | — | capsule |
| `…metodo.entidad.title` | 3 | Entidad y autoridad — que Google y la IA sepan quién eres | — | pilar 3 |
| `…metodo.entidad.body` | 3 | Schema de organización, señales de marca y menciones. Los motores razonan por entidades: si no existes como entidad clara, no te representan bien. | — | capsule |
| `…bridge.h2` | 5 | El SEO es el cimiento. La IA es el siguiente piso. | — | — |
| `…bridge.body` | 5 | Que te encuentren no es lo mismo que la IA te represente bien. Con el posicionamiento sólido, el paso siguiente es asegurar que ChatGPT, Perplexity y los resúmenes de IA te citen — y no confundan tu marca. | — | educativo, no venta dura |
| `…bridge.cta` | 5 | Ver AEO | — | → `/servicios/aeo` |
| `…grader.h2` | 6 | ¿Dónde estás hoy? | — | — |
| `…grader.body` | 6 | Diagnostica gratis tu visibilidad en búsqueda y en IA. Te mostramos qué encuentran los motores sobre tu marca — y qué falta. | — | lead magnet |
| `…grader.cta` | 6 | Diagnostica tu visibilidad | — | → nodo grader |
| `…faq.h2` | 8 | Preguntas frecuentes | — | JSON-LD FAQPage |
| `…final.h2` | 9 | Empieza por saber dónde estás | — | cierre |

> Copy pendiente de draft final (validar con `greenhouse-ux-writing`): pilares con métrica real, textos de prueba/casos, ítems FAQ (poblar con `phrase_questions` Semrush CL), "cómo trabajamos". NO inventar cifras de resultados sin caso real (regla de voz: prueba > hype).

## State Copy

> La landing es marketing (mayormente estática). Los estados de captura son del `<greenhouse-form>` embebido (owned por TASK-1320 renderer / TASK-1327) y del nodo grader (TASK-1327/1336) — no se re-especifican aquí; se referencian.

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | (contenido) | Página renderizada, CTAs activos | Diagnostica tu visibilidad | estado base |
| loading | — | Sin loading de página (SSR/estático) | — | form embebido tiene su propio loading (renderer) |
| empty | — | N/A — contenido curado, sin data dinámica | — | — |
| partial | — | Si el embed del form no carga (JS off / bloqueado): fallback link directo al grader en `think.efeoncepro.com` | Ir al diagnóstico | degradación honesta, no dejar CTA muerto |
| error | — | Error del form → lo maneja el renderer del `<greenhouse-form>` (Success Card / estados TASK-1320) | Reintentar (del renderer) | no reimplementar |
| denied | — | N/A — página pública, sin auth | — | — |

## Accessibility Contract

- Heading order: un solo `<h1>` (hero); H2 por sección (stakes, método, prueba, bridge, grader, cómo trabajamos, FAQ, final); H3 para los 3 pilares y los ítems FAQ. Sin saltos de nivel.
- Chart/table alternatives: N/A (sin charts). Si se agregan stats, texto equivalente.
- Aria labels: CTAs con nombre accesible explícito ("Diagnostica tu visibilidad — abre el diagnóstico de visibilidad"); FAQ con `<details>/<summary>` nativo (no ARIA custom).
- Focus notes: focus visible ≥2px, offset, contraste ≥3:1; orden de tab lógico top→bottom; el embed del form hereda el foco de su renderer.
- Color-independent state labels: el puente AEO y los CTAs no dependen solo de color; texto + ícono.

## Implementation Mapping

- Route / surface: `efeoncepro.com/servicios/posicionamiento-seo` (público). Runtime: WordPress/Elementor hoy (vía skill `efeonce-public-site-wordpress`) o Astro `efeonce-web` si el hub `/servicios` ya migró — decidir en Discovery según crawl.
- Primitives: patrones marketing `modern-ui` (editorial header, section header, floating feature card, card-on-section). NO primitives del portal.
- Variants / kinds: N/A (no es Design System del portal).
- Component candidates: secciones Elementor / componentes Astro del sitio público; `<greenhouse-form>` (Growth Forms renderer, existente) para captura; enlaces al grader.
- Copy source: contenido de página del sitio público (no `src/lib/copy`). Validado `greenhouse-ux-writing` + context pack 05.
- Data reader / command: ninguno nuevo. Reusa el pipeline gobernado del grader (submit → outbox → projection) y el `<greenhouse-form>` — Full API Parity satisfecho por reuso, no por lógica nueva en la página.
- API parity: la única acción de negocio (captura de lead / arranque del grader) YA es contrato gobernado (Growth Forms + grader pipeline). La landing es cliente, no owner.
- Access / capability: pública, sin capability. El form hereda consent/Turnstile/surface-auth del renderer gobernado.
- Runtime consumers: navegador público. Cross-surface: landing → `<greenhouse-form>` / grader (`think.efeoncepro.com`) → reporte → email (nodos de `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`). Esta landing es un **nodo de entrada** de ese flow maestro; no lo re-autora.
- Print/email/PDF considerations: N/A (el reporte/PDF del grader es otra superficie).
- GVC markers: `data-capture="hero|stakes|metodo|prueba|bridge|grader|faq"` en cada sección para captura por sección.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-posicionamiento-seo.capture.txt` (crear en implementación).
- Route: URL pública del preview del sitio (WordPress staging / Vercel preview de `efeonce-web`). NO es ruta del portal — GVC captura por `--route`/URL pública, no requiere agent-auth del portal.
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar página; scroll por secciones marcadas; abrir 1 ítem FAQ.
- Required captures: full-page desktop + mobile; frames por `data-capture` de cada sección; estado FAQ abierto.
- Required `data-capture` markers: `hero`, `stakes`, `metodo`, `prueba`, `bridge`, `grader`, `faq`.
- Assertions: sin scroll horizontal de página (desktop y 390px); H1 presente; CTAs visibles; embed del form presente o fallback link visible.
- Scroll-width checks: `document.scrollingElement.scrollWidth <= clientWidth` en ambos viewports.
- Accessibility/focus checks: focus ring visible en CTAs; contraste AA en hero y bandas de color.
- Reduced-motion evidence: capturar con `prefers-reduced-motion: reduce` — entradas/reveals desactivados, contenido legible sin motion.

## Design Decision Log

- Decision: landing de servicio SEO como **spoke de conversión** bajo hub `/servicios`, slug `posicionamiento-seo`; pillar de autoridad vive como guía de contenido en Think (no en esta página).
- Alternatives considered: (a) pillar `/visibilidad` como URL de servicio — descartado (término sin volumen, Semrush CL); (b) hub `/soluciones` — descartado (cliché de voz de marca, context pack 05); (c) reconstruir el grader/form en la página — descartado (Full API Parity: reuse del contrato gobernado).
- Why this pattern: `modern-ui` marketing lane (whitespace editorial, restraint, un acento) + `commercial-expert` Command of the Message (outcome + mecanismo) + `seo-aeo` (keyword en slug/H1, answer capsules, JSON-LD, entity clarity) + `copywriting` (FAB/solution-aware, big idea "que te encuentren, con método").
- Reuse / extend / new primitive: reuse (patrones marketing + `<greenhouse-form>` + nodo grader). Sin primitive nueva.
- Open risks: (1) ¿`/servicios` ya existe con contenido? → crawl en Discovery; (2) copy de prueba/casos requiere números reales (no inventar); (3) el runtime (WordPress vs Astro) depende del estado del hub al implementar.
- Follow-up: sibling `/servicios/aeo` (301 desde `/aeo-2`) + guía pillar "Visibilidad en búsqueda e IA" en Think — tasks aparte.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger (los pendientes marcados como a-draftear con `greenhouse-ux-writing`).
- [ ] Dynamic values are named and bounded (esta landing es estática — sin dynamic values salvo el embed del form).
- [ ] Partial/degraded states are explicit (fallback link al grader si el embed no carga).
- [ ] No copy implies a guarantee when data is estimated (voz: "no prometemos rankings"; cifras de resultados solo con caso real).
- [ ] Charts have table/text alternatives (N/A — sin charts).
- [ ] State and aria copy is ready for implementation (estados del form referenciados a su renderer owner).
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` (route pública + markers + viewports + reduced-motion).
- [ ] Design decision log explains reuse/extend/new before JSX starts.
