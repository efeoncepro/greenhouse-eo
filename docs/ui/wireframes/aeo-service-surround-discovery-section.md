# AEO Public Landing — Service Surround Discovery Section

## Meta

- Status: `ready-for-implementation`
- Owner task: none, operator live iteration 2026-07-01
- Product Design asset: `/var/folders/cc/vqgjwxy57bbb49rp6ncvrtt80000gn/T/codex-clipboard-c2550161-d179-436b-b4bd-4a597471b29b.png`
- Intended consumers: Efeonce public landing visitors evaluating AEO service
- Copy source: operator-provided reference image; visible text must remain literal
- Primitive decision: WordPress/Elementor one-off section using Ohio badge/heading + page-scoped CSS; no Greenhouse portal primitive
- UI ready target: `yes`

## Brief

- Primary user: growth/marketing decision-maker considering an AEO diagnostic and service
- User moment: after understanding the five AEO maturity levels, before seeing the diagnostic deliverable
- Job to be done: understand that Efeonce does not only diagnose AEO gaps; it operates a continuous service to close them
- Primary decision signal: the four-part service loop `Medir`, `Crear`, `Distribuir`, `Optimizar`
- Non-goals: no form, no interactive dashboard, no new claim or copy rewrite

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Section root | Insert between `levels9` and `diagnos`; maintain post-hero rhythm | Elementor container `.gh-aeo-service` | Static Elementor |
| 1 | Header | Introduce service promise | Ohio `ohio_badge`, `ohio_heading`, text editor lead | Static copy |
| 2 | Method grid | Show four service workstreams | Text editor HTML cards, 2x2 desktop, 1 column mobile | Static copy + decorative PNG icons |
| 3 | Method note | Explain operating model | Text editor navy callout | Static copy |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `public.aeo.service.eyebrow` | Header | `El servicio` | none | Render with Ohio badge; style may uppercase visually via existing badge behavior only if theme does it |
| `public.aeo.service.h2` | Header | `Un tablero te muestra el problema. Cerrarlo es otra historia.` | none | `Cerrarlo es otra historia.` may be teal accent; words unchanged |
| `public.aeo.service.lead` | Header | `No te entregamos un score y te deseamos suerte. Nos hacemos cargo de tu visibilidad en los motores de IA: con Surround Discovery —nuestro motor— subimos tu marca por la escalera, nivel a nivel y mes a mes, hasta que te prefieran.` | none | `Surround Discovery` can be bold for hierarchy |
| `public.aeo.service.step1.kicker` | Method grid | `01 · Medir` | none | Static |
| `public.aeo.service.step1.title` | Method grid | `Medimos, siempre` | none | Static |
| `public.aeo.service.step1.body` | Method grid | `Monitoreamos tu visibilidad en ChatGPT, Google AI Overviews, Gemini, Perplexity, Copilot y Claude, por mercado y por prompt. Sabes dónde estás y cómo te mueves, mes a mes.` | none | Static |
| `public.aeo.service.step2.kicker` | Method grid | `02 · Crear` | none | Static |
| `public.aeo.service.step2.title` | Method grid | `Creamos activos que los motores de IA citan` | none | Static |
| `public.aeo.service.step2.body` | Method grid | `Construimos el contenido y la arquitectura que los motores entienden, citan y reproducen — para máquinas y para humanos. No "más contenido": el correcto.` | none | Static |
| `public.aeo.service.step3.kicker` | Method grid | `03 · Distribuir` | none | Static |
| `public.aeo.service.step3.title` | Method grid | `Te ponemos en cada superficie` | none | Static |
| `public.aeo.service.step3.body` | Method grid | `Distribuimos tu presencia donde los motores de IA descubren marcas, no solo en tu sitio. Apareces donde se toma la decisión.` | none | Static |
| `public.aeo.service.step4.kicker` | Method grid | `04 · Optimizar` | none | Static |
| `public.aeo.service.step4.title` | Method grid | `Optimizamos en loop` | none | Static |
| `public.aeo.service.step4.body` | Method grid | `Cada ciclo aprende del anterior: subimos un nivel, medimos, corregimos y volvemos a subir. La visibilidad ante los motores de IA no se "logra"; se sostiene.` | none | Static |
| `public.aeo.service.note` | Method note | `Cómo trabajamos: funcionamos como tu equipo de AEO dedicado. Empezamos por el diagnóstico, priorizamos por impacto, ejecutamos en ciclos y te reportamos el avance en la escalera. Combinamos las mejores herramientas del mercado con sistemas propios, pero el método conduce. Medible por etapas, sin amarres.` | none | Static |
| `public.aeo.service.result` | Result note | `El resultado: dejas de aparecer por azar. Subes de visible a preferido — y esa preferencia llega a la conversación de compra antes que tu competencia.` | none | Static; `visible` and `preferido` emphasized |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | n/a | Static public section renders all content | n/a | Only ready state |
| loading | n/a | n/a | n/a | No async data |
| empty | n/a | n/a | n/a | No async data |
| partial | n/a | n/a | n/a | No async data |
| error | n/a | n/a | n/a | No async data |
| denied | n/a | n/a | n/a | Public content |

## Accessibility Contract

- Heading order: section H2 follows prior `levels` H2 and precedes `diagnos` H2.
- Chart/table alternatives: no chart.
- Aria labels: content is text-first; the 3D card icons are decorative only and use `alt="" aria-hidden="true"`.
- Focus notes: no interactive elements in this section.
- Color-independent state labels: numbers and verbs identify steps; teal is accent only.

## Implementation Mapping

- Route / surface: public WordPress landing `/aeo-2/`, WordPress `postId=250265`
- Primitives: Elementor container + Ohio badge/heading; page-scoped CSS
- Variants / kinds: static editorial service section, not a reusable primitive
- Component candidates: one root container `servic`, widgets `servicee`, `serviceh`, `servicel`, `serviceg`, `servicen`, `serviceis` for scoped CSS
- Copy source: inline Elementor static copy from operator-provided reference
- Visual assets: `docs/assets/public-site/aeo-service-icons/measure.png`, `create.png`, `distribute.png`, `optimize.png`; WordPress attachments `250642`-`250645`
- Data reader / command: none
- API parity: none; this is static marketing content
- Access / capability: public
- Runtime consumers: WordPress/Elementor/Ohio
- Print/email/PDF considerations: none
- GVC markers: root `data-capture="aeo-service-section"` via class hook and Playwright selector `.gh-aeo-service`

## GVC Scenario Plan

- Scenario file: ad-hoc Playwright verification for live WordPress; promote only if this section becomes a recurring regression surface
- Route: `https://efeoncepro.com/aeo-2/`
- Viewports: desktop 1440px and mobile 390px
- Required steps: scroll to `.gh-aeo-service`, capture, inspect texts, measure overflow
- Required captures: desktop service section, mobile service section
- Required `data-capture` markers: `.gh-aeo-service`, `.gh-aeo-service-grid`, `.gh-aeo-service-note`
- Assertions: exact copy present, section placed after `levels9` and before `diagnos`, 4 cards, 4 decorative PNG icons loaded, no horizontal overflow, `heroans` hash stable
- Scroll-width checks: `document.documentElement.scrollWidth === document.documentElement.clientWidth`
- Accessibility/focus checks: no interactive focus path required
- Reduced-motion evidence: section has no required motion; CSS must disable decorative transitions under `prefers-reduced-motion`

## Design Decision Log

- Decision: render as a compact service method section with 2x2 low cards and one navy method note, inserted after `levels9`. Density was tuned live to `gh-aeo-service-method-density-v3` after operator feedback: H2 aligned to post-hero scale, cards reduced, copy unchanged.
- Decision: add four generated 3D contextual icons to the service cards as decorative visual anchors. The assets intentionally avoid text, third-party logos, AI-engine marks and interactive affordance; they are static PNGs scoped to the WordPress section.
- Alternatives considered: duplicate the existing later `why` comparison section; replace the diagnostic section; use a dashboard mockup visual.
- Why this pattern: it bridges maturity levels to execution without asking the visitor to interpret a fake product UI.
- Reuse / extend / new primitive: one-off Elementor section; reuses existing AEO badge/heading/card/note language and page-scoped CSS.
- Open risks: duplicate headline theme with the existing later `why` section; acceptable because this new section explains service mechanics while `why` remains comparative proof.
- Follow-up: if the page feels repetitive after live review, consolidate the later `why` section in a separate operator-approved pass.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives.
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
