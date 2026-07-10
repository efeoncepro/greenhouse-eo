# TASK-1387 — Surround Discovery Ebook Landing Wireframe

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1387 — Surround Discovery Ebook Landing: Discovery System in Think`
- Intended consumers: CMO, marketing/growth lead or founder who encounters SEO, AEO, AI visibility or fragmented discovery and needs a system-level map before buying a service.
- Surface: `think.efeoncepro.com/surround-discovery` (proposed canonical route; confirm in implementation discovery).
- Source material: `Surround Discovery_Final.pdf`, especially its five discovery surfaces and S⁴ method; `docs/context/06_glosario-metricas.md` is naming SoT.
- Copy source: local constants in Think, aligned to `docs/context/05_voz-tono-estilo.md`; the form's fields/consent/success contract remain in `EBOOK_FORMS`.
- Primitive decision: reuse Think `BaseLayout` + `<greenhouse-form>` dock pattern. Route-local editorial sections only; no Greenhouse portal primitive and no local form.

## Experience brief

- User moment: visitor knows a tactic (SEO, AEO, social or marketplace) but lacks a way to decide how the surfaces reinforce each other.
- Job to be done: understand Surround Discovery as a discovery system, see the loop behind it, and receive the guide without uncertainty about what happens after submitting.
- Primary decision: submit the standard governed form to download the ebook.
- Secondary decision: after download, optionally measure the AI-response-engine portion of the system in the Brand Visibility Grader.
- Non-goals: sell a meeting in the first fold, claim a guaranteed visibility outcome, simulate a live analytics product, create a five-tab channel selector or reproduce PDF pages one-for-one.

## Layout Skeleton

| Region | Slot | Purpose | Component / pattern | Data source |
| --- | --- | --- | --- | --- |
| 0 | Header | Keep Think identity and a quiet exit path. | `BaseLayout` existing header | Static |
| 1 | Hero | Reframe the problem from positions to discovery. | Editorial hero + map seed + scroll CTA | Static |
| 2 | Fragmentation proof | Make the false SEO-vs-AEO choice visible. | Three short contrast statements | Static, no unverified metrics |
| 3 | Five surfaces | Explain where discovery occurs: SEO, AEO, video, social, marketplace. | Semantic map + five readable cards | Static |
| 4 | S⁴ method | Show how Efeonce operates the system. | Four-step loop / ordered list | Static |
| 5 | Relationship map | Place SEO landing, AEO landing and grader as specialised doors, not replacements. | Three linked editorial cards | Static links |
| 6 | What the ebook contains | Make the value exchange tangible: executive summary, authority, SENSE/SHAPE/SURFACE/SOLVE, governance and competitive position. | Reading itinerary | Static |
| 7 | Form workspace | Capture standard lead data and deliver gated PDF. | `SurroundDiscoveryFormDock` host + `<greenhouse-form>` | Growth Forms TASK-1386 |
| 8 | FAQ | Resolve objections around surfaces, S⁴, grader scope and download. | Native `<details>` | Static |
| 9 | Closing | Reassert the system thesis without a second form. | Editorial closing + one recovery CTA | Static |

## Copy Ledger

| Copy id | Region | Proposed text | Notes |
| --- | --- | --- | --- |
| `surround.hero.eyebrow` | 1 | `El mapa de la búsqueda fragmentada` | Category, not a product claim. |
| `surround.hero.title` | 1 | `No compites por una posición. Compites por ser descubierto.` | Single H1; clear before clever. |
| `surround.hero.body` | 1 | `Tu próxima oportunidad puede empezar en Google, un motor de IA, un video, una conversación social o un marketplace. Surround Discovery™ te ayuda a leer esas rutas como un sistema.` | Explains mechanism, not guarantee. |
| `surround.hero.cta` | 1 | `Descargar el ebook` | Scrolls to the form. |
| `surround.fragment.title` | 2 | `SEO y AEO no compiten. Se quedan cortos cuando trabajan solos.` | Reframe; must not disparage existing service pages. |
| `surround.surfaces.title` | 3 | `Cinco superficies. Una sola decisión: dónde te descubre tu mercado.` | Introduces exact five-surface inventory. |
| `surround.s4.title` | 4 | `Un sistema no publica y espera. Escucha, construye, distribuye y aprende.` | Benefits before S⁴ acronym. |
| `surround.s4.solve` | 4 | `SOLVE conecta el impacto de negocio con la siguiente vuelta del sistema.` | Never calls SOLVE an independent framework. |
| `surround.relationship.title` | 5 | `Las herramientas ya existen. El mapa explica cómo se conectan.` | Places grader/SEO/AEO correctly. |
| `surround.ebook.title` | 6 | `Qué vas a encontrar dentro` | Tangible preview, not a feature dump. |
| `surround.form.title` | 7 | `Descarga el mapa completo` | Host-owned heading; fields come from renderer. |
| `surround.form.body` | 7 | `Una guía para dejar de optimizar canales aislados y empezar a construir presencia donde ocurre el descubrimiento.` | Does not promise email until verified. |
| `surround.success.bridge` | 7 | `Mide cómo te ven hoy los motores de respuesta` | One bridge to `/brand-visibility`, after delivery. |
| `surround.faq.title` | 8 | `Antes de elegir una táctica, aclaremos el sistema.` | Objection layer. |
| `surround.closing.title` | 9 | `El descubrimiento no ocurre en un solo lugar. Tu estrategia tampoco debería.` | Editorial close. |

The implementation must validate each line against the ebook and current brand copy. These are purposeful draft strings, not permission to hardcode ungoverned copy in the Greenhouse renderer.

## Five-surface content contract

| Surface | Reader question | Page explanation | Link treatment |
| --- | --- | --- | --- |
| SEO | “¿Te encuentran cuando buscan activamente?” | Foundation for intent-led search. | Contextual link to SEO service, secondary. |
| AEO | “¿Los motores de IA te entienden y citan correctamente?” | Discovery in answer engines; precise language, no generic AI hype. | Contextual link to AEO service, secondary. |
| Video Discovery | “¿Apareces cuando la audiencia aprende mirando?” | Video as a discovery surface, not merely a format. | No fake product CTA. |
| Social Discovery | “¿Entras en las conversaciones que forman preferencia?” | Social/community as discovery, not vanity reach. | No fake product CTA. |
| Marketplace Optimization | “¿Eres visible donde comparan o compran?” | Demand-capture surface; describe only what the ebook supports. | No product claim without scope. |

## State Copy

| State | Title | Body | Recovery / behavior |
| --- | --- | --- | --- |
| ready | `Descarga el mapa completo` | Host content plus governed fields. | Submit via renderer. |
| loading | `Preparando el formulario` | `Estamos cargando los campos y protecciones de Greenhouse.` | Skeleton, not spinner-only. |
| empty | `Formulario no disponible` | `No pudimos preparar una descarga en este momento.` | Retry; public contact fallback. |
| error | `No pudimos cargar el formulario` | `Recarga la página. Si el problema continúa, usa el contacto público de Efeonce.` | Never expose CORS/bucket internals. |
| denied | `Esta descarga no está disponible desde este origen` | Pre-launch only; no production promise. | No action except safe fallback. |
| submitting | Renderer-owned | `Validando tu solicitud antes de preparar la descarga.` | Prevent double submit. |
| success | `Tu descarga está lista` | Confirm only what TASK-1386 proves. | Redownload from `download_url`; one link to grader. |
| degraded | `Tu solicitud fue recibida` | Use only if accepted has no download handoff. | Honest recovery, report defect; no fake download claim. |

## Accessibility Contract

- One `h1`; every region begins at `h2`; S⁴ is an ordered list and surfaces are labelled text, not color/position alone.
- The map has a textual equivalent before or immediately after it; screen readers never need to infer orbit geometry.
- FAQ uses native `<details>/<summary>`; all links and buttons expose focus visibly and have 44px targets.
- Form host is labelled by the heading; loading, submit, success and error use `aria-live=polite` without a focusable full-panel live region.
- The SVG/illustration is decorative unless it conveys labels already present as text; then `aria-hidden=true`.
- Reduced motion preserves full content and direct navigation; no automatic movement, carousel, counter or parallax conveys meaning.

## Implementation Mapping

- Route / surface: `/Users/jreye/Documents/efeonce-think/src/pages/surround-discovery/index.astro`.
- Layout: `/Users/jreye/Documents/efeonce-think/src/layouts/BaseLayout.astro` with existing GTM and metadata conventions.
- Form: `<greenhouse-form>` configured with TASK-1386 `form_key` and surface; no locally authored inputs, validation, consent, captcha or POST handler.
- Components: route-local `SurroundDiscoveryMap.astro`, `SurroundDiscoveryCycle.astro` and `SurroundDiscoveryFormDock.astro` are permitted only if they keep the page readable; `BaseLayout` and renderer are reused.
- Tokens: `/Users/jreye/Documents/efeonce-think/src/lib/report-tokens.ts`; no literal palette/font system imported from the PDF.
- SEO: visible answer-first definition, canonical/noindex decision, `Book`/`FAQPage` JSON-LD only when visible content supports it, sitemap/llms.txt check.
- Tracking: generic form pipeline; CTA event family only if it is implemented through the governed event contract and tracked in `TRACKING-PLAN.md`.

## GVC Scenario Plan

- Scenario: `surround-discovery-ebook-landing` in the Think repo.
- Route: local and production `/surround-discovery`.
- Viewports: 1440 desktop, 390 mobile and a reduced-motion run.
- Steps: initial hero → CTA anchor → read five surfaces → inspect S⁴ → form loading/ready → controlled success/error → FAQ keyboard interaction → post-success grader bridge.
- Captures: `hero`, `surfaces`, `s4-cycle`, `form-ready`, `form-success`, `faq`, `mobile-full`, `reduced-motion`.
- Markers: `surround-discovery-landing`, `surround-discovery-hero`, `surround-discovery-surfaces`, `surround-discovery-cycle`, `surround-discovery-form`, `surround-discovery-faq`, `surround-discovery-final`.
- Assertions: real `form-key`; no duplicate consent; H1/heading order; no horizontal page scroll; no console/page errors; reduced-motion static; success focus deterministic.

## Design Decision Log

- Decision: make the system legible before asking for the email. The visual centre is a map, not a product dashboard or a cover mockup.
- Alternatives considered: generic “download now” landing (does not close the SEO/AEO/grader narrative); service-page sales letter (wrong Think/funnel role); interactive channel quiz (adds false precision and data work); direct PDF link (breaks gated delivery).
- Why this pattern: the user needs a durable mental model—five surfaces plus a feedback loop—then a low-friction exchange for the detailed guide.
- Reuse / extend / new primitive: reuse public Think shell and Growth Forms; extend only route-local editorial composition; no new portal primitive.
- Open risks: title/route requires final editorial/SEO review; any claim about business impact, customer results or email delivery requires source/runtime evidence.

## Acceptance Checklist

- [ ] All five surfaces and four S⁴ stages are accurate to the ebook and glossary.
- [ ] The form host is a consumer of TASK-1386 and no local form/asset URL exists.
- [ ] State and accessibility contracts are implemented and visually reviewed.
- [ ] Metadata/JSON-LD matches visible content only.
- [ ] GVC evidence covers desktop, mobile, reduced-motion, form states and page overflow.
