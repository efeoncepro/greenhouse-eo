# TASK-1322 / Public Site About — Copy Narrative Refresh

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1322`
- Product Design asset: live page audit + copywriting review, no external Figma asset
- Intended consumers: public website visitors, agency prospects, internal public-site operators
- Copy source: WordPress Elementor local landing copy, tracked in `.codex/skills/efeonce-public-site-wordpress/references/landings/about-us-efeonce.md` and `.claude/skills/efeonce-public-site-wordpress/references/landings/about-us-efeonce.md`
- Primitive decision: `reuse` existing Ohio/Elementor sections and public-site patterns; no new primitive
- UI ready target: `yes`

## Brief

- Primary user: CMO, founder, marketing lead, or commercial stakeholder evaluating Efeonce as an integrated growth agency.
- User moment: visitor has reached the About page after seeing Efeonce, AEO, services, or proof; they need to understand why this agency is different and whether it is credible.
- Job to be done: make the About page tell one progressive story: why Efeonce exists, what it integrates, how it operates, what it has produced, who built it, and how to start a conversation.
- Primary decision signal: the visitor should leave with one clear belief: Efeonce is not a bundle of providers; it is a governed operating system for growth.
- Non-goals: no new offer, no new pricing, no new forms, no new proof numbers, no replacement of AEO components, no redesign from scratch.

## Narrative Architecture

| Order | Section | Job | Current risk | Target narrative role |
|---|---|---|---|---|
| 1 | Hero | Set the one idea | Good | Keep: growth is orchestrated, not bought in pieces |
| 2 | Por que existimos | Establish enemy/status quo | Strong | Sharpen the belief: fragmented marketing wastes good investment |
| 3 | Que hacemos | Explain the model | Too dense | Make the four capabilities easy to scan and less feature-heavy |
| 4 | Como trabajamos / Loop Marketing | Explain method | Repeats hero | Make it the operating cycle, not another system promise |
| 5 | Lo que el sistema produce | Give proof | Good but could show arc | Turn cases into context -> mechanism -> result |
| 6 | Industrias | Show breadth | Thin | Add one framing line; keep list lightweight |
| 7 | Como lo operamos | Explain operating principles | Repeats system/datos | Convert to compact principles with less paragraph weight |
| 8 | Experiencia cliente | Make it tangible | Strong | Keep and tighten; this is key About differentiation |
| 9 | Founder | Humanize origin | Too CV-like | Make it a founder thesis, not a bio block |
| 10 | Infraestructura | Explain enablement | Can read like logo list | Make tools proof of friction removal |
| 11 | FAQ | Answer objections / SEO | Dense but acceptable | Keep in accordion; remove duplicated body copy if present |
| 12 | Final CTA | Convert | Good | Strengthen as the only direct scheduling CTA after hero removed agenda button |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Hero | One idea + proof + video CTA | Existing Elementor hero `6e46dcc` | Elementor widgets `6a1acc3`, `3ab9072`, `70afd83`, `e18428a`, `abproof` |
| 1 | Why / beliefs | Name the status quo problem | Existing white intro grid | Elementor text widgets |
| 2 | Capabilities | Explain model and capability cards | Existing dark capability cards | Elementor containers/cards |
| 3 | Loop method | Explain Nested Loops cycle | Existing full-bleed loop section `59385ab` | Elementor text + loop graphic |
| 4 | Proof cards | Client outcomes and cases | Existing case cards | Elementor case cards |
| 5 | Industries | Breadth / fit | Existing industry section | Elementor text/list |
| 6 | Operating principles | Difference in execution | Existing principle card/grid section | Elementor cards |
| 7 | Client experience | How it feels after signing | Existing white two-column section | Elementor text/cards |
| 8 | Founder thesis | Human origin and credibility | Existing founder section | Elementor image/text |
| 9 | Infrastructure | Tools as operating layer | Existing tech ecosystem `af43bed` | Elementor tool cards + sticky headline |
| 10 | Markets | Local footprint | Existing market section | Elementor map/labels |
| 11 | FAQ | Objections / SEO | Existing Ohio accordion | Elementor accordion |
| 12 | Final CTA | Schedule conversation | Existing form/CTA section | Elementor form/contact block |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `public.about.hero.eyebrow` | Hero | `AGENCIA DE CRECIMIENTO INTEGRADA` | none | Keep |
| `public.about.hero.title` | Hero | `El crecimiento real no se compra por partes. Se orquesta.` | none | Keep |
| `public.about.hero.deck.1` | Hero | `Creatividad, medios, CRM, data y tecnología trabajando como un solo sistema.` | none | Keep |
| `public.about.hero.deck.2` | Hero | `Menos proveedores sueltos. Más visibilidad, continuidad y aprendizaje acumulado.` | none | Keep |
| `public.about.hero.video_cta` | Hero | `Ver cómo operamos` | none | Keep as only hero action |
| `public.about.why.eyebrow` | Why | `POR QUÉ EXISTIMOS` | none | Existing |
| `public.about.why.title` | Why | `El marketing lineal está roto. El crecimiento real es compuesto.` | none | Keep |
| `public.about.why.lead` | Why | `Efeonce integra creatividad, medios, data y tecnología en un solo sistema operativo de crecimiento. Lo que el mercado fragmenta, nosotros lo conectamos.` | none | Replace current longer lead |
| `public.about.why.card.marketing.title` | Why | `El marketing sin sistema es caro accidentalmente.` | none | Keep |
| `public.about.why.card.marketing.body` | Why | `Tu empresa puede invertir bien en piezas sueltas y aun así perder valor en lo que no se conecta.` | none | Slightly sharpen |
| `public.about.why.card.creativity.title` | Why | `La creatividad que no se mide no se defiende.` | none | Keep |
| `public.about.why.card.creativity.body` | Why | `Si una pieza no se conecta con un resultado de negocio, queda expuesta cuando llega el recorte.` | none | More direct |
| `public.about.why.card.ai.title` | Why | `La IA sin gobernanza produce más caos, no menos.` | none | Keep |
| `public.about.why.card.ai.body` | Why | `La IA sobre procesos caóticos amplifica el caos a velocidad de máquina.` | none | Keep/tighten |
| `public.about.why.card.metrics.eyebrow` | Why | `MÉTRICAS` | none | Fix current missing accent |
| `public.about.why.card.metrics.title` | Why | `Las vanity metrics son un acuerdo de silencio entre agencia y cliente.` | none | Keep |
| `public.about.why.card.metrics.body` | Why | `Efeonce conecta cada acción con pipeline, revenue o una decisión operativa clara.` | none | Sharpen |
| `public.about.capabilities.eyebrow` | Capabilities | `QUÉ HACEMOS` | none | Existing |
| `public.about.capabilities.title` | Capabilities | `Un sistema, cuatro capacidades conectadas` | none | Replace `Un ecosistema, multiples capacidades` |
| `public.about.capabilities.lead` | Capabilities | `Contratas una marca, un equipo de cuenta y un sistema común de trabajo. Detrás operan capacidades especializadas que comparten datos, metodología y objetivos.` | none | Reduces provider explanation |
| `public.about.capabilities.globe.title` | Capabilities | `Operacion creativa continua` | none | Keep |
| `public.about.capabilities.globe.body` | Capabilities | `Producción creativa con briefs validados, checkpoints de calidad, revisión visual precisa y métricas por pieza. La IA acelera; el criterio creativo sigue siendo humano.` | none | Replace feature list |
| `public.about.capabilities.globe.includes` | Capabilities | `Incluye: branding e identidad, campañas 360, contenido full-funnel, producción audiovisual, social creativo y talento integrado.` | none | Shorter |
| `public.about.capabilities.reach.title` | Capabilities | `Amplificacion y medios` | none | Keep |
| `public.about.capabilities.reach.body` | Capabilities | `Distribución y medios coordinados por audiencia, no por canal. Sin reventa de inventario, con redistribución de inversión y medición de impacto antes de escalar.` | none | Replace feature list |
| `public.about.capabilities.reach.includes` | Capabilities | `Incluye: paid media, ATL, retail media, influencers, UGC, sponsorships, PR, comunicaciones y dark channels.` | none | Shorter |
| `public.about.capabilities.wave.title` | Capabilities | `Infraestructura digital` | none | Keep |
| `public.about.capabilities.wave.body` | Capabilities | `Infraestructura preparada para medir, convertir y ser entendida por motores de IA. Web, tracking, data, schema y observabilidad conectados al negocio.` | none | Replace feature list |
| `public.about.capabilities.wave.includes` | Capabilities | `Incluye: desarrollo web, server-side tracking, BigQuery, SEO técnico, AEO, experimentación, schema y observabilidad.` | none | Shorter |
| `public.about.capabilities.digital.title` | Capabilities | `Efeonce Digital` | none | Keep |
| `public.about.capabilities.digital.body` | Capabilities | `El núcleo estratégico que conecta CRM, posicionamiento, contenido, redes, data y medición. Donde las capacidades dejan de ser servicios sueltos y empiezan a operar como sistema.` | none | Replace current long list |
| `public.about.loop.eyebrow` | Loop | `CÓMO TRABAJAMOS` | none | Keep |
| `public.about.loop.title` | Loop | `Un sistema donde cada ciclo produce mejores resultados que el anterior` | none | Keep if layout supports |
| `public.about.loop.lead` | Loop | `Operamos en ciclos continuos: expresamos, amplificamos, adaptamos y evolucionamos. Cada aprendizaje vuelve al sistema para que el siguiente ciclo empiece con más información, no desde cero.` | none | Replace current lead |
| `public.about.proof.title` | Proof | `Lo que el sistema produce` | none | Keep |
| `public.about.proof.sky.body` | Proof | `Competir contra un líder dominante exigía más que SEO. Conectamos contenido, creatividad y arquitectura de búsqueda para abrir crecimiento orgánico medible.` | metric remains existing | Keep metric as-is; do not invent new numbers |
| `public.about.proof.bresler.body` | Proof | `La creatividad dejó de vivir separada del performance. El sistema conectó campaña, conversión y medición para mover ventas digitales.` | metric remains existing | Keep metric as-is |
| `public.about.proof.berel.body` | Proof | `Un mercado B2B complejo necesitaba constancia, no acciones aisladas. La estrategia convirtió contenido y distribución en generación sostenida de leads.` | metric remains existing | Keep metric as-is |
| `public.about.industries.title` | Industries | `Industrias que atendemos` | none | Keep |
| `public.about.industries.lead` | Industries | `Trabajamos donde la fragmentación entre marketing, ventas y operación cuesta caro.` | none | Add/replace lead |
| `public.about.operating.title` | Operating principles | `No es lo que hacemos — es cómo lo operamos` | none | Keep |
| `public.about.operating.lead` | Operating principles | `La integración no ocurre porque todos estén en la misma reunión. Ocurre cuando existen procesos, datos compartidos y decisiones conectadas.` | none | Replace intro |
| `public.about.operating.card.creative.body` | Operating principles | `Producción creativa con proceso, trazabilidad y criterios de calidad visibles.` | none | Compact |
| `public.about.operating.card.quarter.body` | Operating principles | `Cada trimestre empieza con aprendizaje acumulado, no con una pagina en blanco.` | none | Compact |
| `public.about.operating.card.visibility.body` | Operating principles | `Dashboards, métricas operativas y benchmarks visibles sin perseguir reportes.` | none | Compact |
| `public.about.operating.card.distribution.body` | Operating principles | `Medios, contenido, social y canales oscuros coordinados bajo una estrategia.` | none | Compact |
| `public.about.operating.card.ai.body` | Operating principles | `IA aplicada con criterio, control y supervisión humana.` | none | Compact |
| `public.about.operating.card.measurement.body` | Operating principles | `Medición conectada a ventas, pipeline o decisiones de negocio.` | none | Compact |
| `public.about.experience.title` | Client experience | `La diferencia empieza despues de firmar` | none | Replace long title |
| `public.about.experience.lead` | Client experience | `No entras a una agencia que ejecuta tareas. Entras a un sistema donde ves cómo funciona tu marketing.` | none | Replace current lead |
| `public.about.experience.tools.body` | Client experience | `Centro de operaciones, canal directo, revisión visual y repositorio de assets. Todo conectado desde la primera semana.` | none | Tighten |
| `public.about.experience.reviews.body` | Client experience | `Revisamos tiempos, rondas, cumplimiento y benchmarks. No para justificar trabajo: para mejorar decisiones.` | none | Tighten |
| `public.about.experience.friction.body` | Client experience | `Si algo no funciona, vamos con datos: qué pasó, por qué pasó y qué ajustamos.` | none | Tighten |
| `public.about.experience.growth.body` | Client experience | `Activamos nuevas capacidades cuando la evidencia lo justifica, no porque haya una reunion de ventas.` | none | Tighten |
| `public.about.founder.title` | Founder | `Julio César Reyes Rangel` | none | Keep |
| `public.about.founder.body` | Founder | `Efeonce nace de una frustración simple: demasiadas empresas invierten bien, pero pierden valor porque creatividad, medios y tecnología trabajan separados. Julio Reyes construyó Efeonce para resolver esa fragmentación con un sistema operativo de crecimiento: estrategia, ejecución, data y gobernanza conectadas desde el primer ciclo.` | none | Replace CV-heavy paragraph |
| `public.about.infrastructure.title` | Infrastructure | `La infraestructura que hace posible la promesa` | none | Keep |
| `public.about.infrastructure.lead` | Infrastructure | `No usamos herramientas para decorar procesos. Las usamos para que el cliente vea, comente, apruebe, mida y decida sin perseguir a nadie.` | none | Replace current lead |
| `public.about.infrastructure.hubspot.body` | Infrastructure | `CRM, marketing, ventas y servicio conectados al ciclo de crecimiento.` | none | Short card body |
| `public.about.infrastructure.frameio.body` | Infrastructure | `Revisión visual con feedback preciso y aprobaciones sin pérdida de contexto.` | none | Short card body |
| `public.about.infrastructure.notion.body` | Infrastructure | `Centro operativo, wiki de marca, proyectos y gobernanza.` | none | Short card body |
| `public.about.infrastructure.adobe.body` | Infrastructure | `Producción creativa, librerías, proyectos y consistencia de marca.` | none | Short card body |
| `public.about.infrastructure.bigquery.body` | Infrastructure | `Data warehouse para análisis, atribución y decisiones con evidencia.` | none | Short card body |
| `public.about.infrastructure.higgsfield.body` | Infrastructure | `IA generativa multi-modelo con criterio creativo y control operativo.` | none | Short card body |
| `public.about.infrastructure.sharepoint.body` | Infrastructure | `Repositorio seguro para activos, documentos y entregables.` | none | Short card body |
| `public.about.infrastructure.comms.body` | Infrastructure | `Comunicación directa, trazable y conectada al trabajo real.` | none | Short card body |
| `public.about.cta.title` | Final CTA | `Agenda una conversación` | none | Keep final CTA |
| `public.about.cta.lead` | Final CTA | `Empezamos entendiendo dónde se fragmenta tu operación y qué se puede resolver primero.` | none | Replace/support |
| `public.about.cta.bullets` | Final CTA | `30 minutos enfocados en tu situación. Diagnóstico inicial de fricción. Si no hay fit, te vas con claridad.` | none | Keep no-pressure framing |
| `public.about.newsletter.title` | Footer/newsletter | `Suscríbete a nuestro newsletter` | none | Fix `Subscribete` typo |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Page narrative refreshed | Public page uses concise progressive copy | none | Normal state |
| loading | N/A | Static WordPress page | N/A | No app loading state |
| empty | N/A | Static WordPress page | N/A | No empty state |
| partial | Copy updated, cache pending | Kinsta may take a few minutes globally | Purge cache / verify with cache-buster | Operational state only |
| error | Elementor save failed | Restore from backup meta or remote CSS backup | Roll back via stored backup key | Operational state only |
| denied | N/A | Public page | N/A | Not gated |

## Accessibility Contract

- Heading order: preserve one `h1` in hero; following primary section titles should remain `h2`; card titles should remain `h3`/`h4` according to current Elementor structure. Do not introduce multiple `h1`.
- Chart/table alternatives: no charts introduced. Existing case metrics must keep visible labels and not rely on color alone.
- Aria labels: video CTA keeps accessible name `Ver como operamos`; final form labels remain handled by existing form implementation.
- Focus notes: no new interactive elements except existing video CTA/final CTA/form. Do not move focus traps or create overlay UI.
- Color-independent state labels: no new semantic state colors introduced.

## Implementation Mapping

- Route / surface: `https://efeoncepro.com/about-us-efeonce/`, WordPress `page_id=249770`, Elementor landing `About us (Boceto)`.
- Primitives: existing Ohio/Elementor sections, `greenhouse_logo_marquee` + `BrandProofAvatarGroup` pattern for hero proof, existing Ohio accordion/form.
- Variants / kinds: About dark-context proof variant remains page-scoped under `body.page-id-249770 .elementor-element-abproof`.
- Component candidates: no new component; mutate Elementor widget settings/text HTML via `Document::save()` and, only if necessary, page-scoped child theme CSS in `efeonce-public-site-runtime/wp-content/themes/ohio-child/assets/css/global-fixes.css`.
- Copy source: local WordPress copy; record canonical operational refs in `.codex/.claude/skills/efeonce-public-site-wordpress/references/landings/about-us-efeonce.md`.
- Data reader / command: none.
- API parity: N/A; editorial public page, no business state change. Final form remains existing form/contact implementation.
- Access / capability: WordPress admin mutation only; protect hero featured image metas.
- Runtime consumers: public visitors, internal public-site operators, search crawlers reading FAQ/body text.
- Print/email/PDF considerations: none.
- GVC markers: use existing Elementor section IDs/classes as capture anchors; if adding `data-capture` is practical, add `data-capture="about-<section>"` only in scoped Elementor HTML and document it.

## GVC Scenario Plan

- Scenario file: create `scripts/frontend/scenarios/public-about-copy-refresh.scenario.ts` if using GVC; otherwise Playwright ad-hoc capture is acceptable only for first audit and should be promoted if task implementation proceeds.
- Route: `/about-us-efeonce/`.
- Viewports: desktop 1440x1100 and mobile 390x950.
- Required steps:
  - Load with cache-buster after Kinsta purge.
  - Capture hero and full page scroll slices.
  - Verify no `Agenda una conversacion` button exists in hero.
  - Verify final CTA section still contains `Agenda una conversacion`.
  - Verify AEO `/aeo-2/` `whylogo` proof remains unchanged.
- Required captures:
  - hero desktop/mobile
  - `Por que existimos`
  - `Que hacemos`
  - Loop Marketing
  - proof/cases
  - operating principles/client experience
  - founder/infrastructure
  - FAQ/final CTA
  - AEO `whylogo` desktop/mobile regression capture
- Required `data-capture` markers:
  - Prefer: `about-hero`, `about-why`, `about-capabilities`, `about-loop`, `about-proof`, `about-operating`, `about-experience`, `about-founder`, `about-infrastructure`, `about-faq`, `about-final-cta`.
  - Fallback: use known Elementor IDs/classes documented in the landing skill ref.
- Assertions:
  - `document.body.innerText` does not contain the old overlong capability paragraphs.
  - Hero has `Ver como operamos` and no `Agenda una conversacion` hero CTA.
  - Final CTA still exists.
  - `scrollWidth - clientWidth <= 0` on desktop; mobile residual overflow must be identified and not worsened.
  - AEO `whylogo` marquee display remains `block` desktop/mobile and pill text remains `+90–Chile · Colombia · Mexico · Peru`.
- Scroll-width checks: desktop 1440, mobile 390.
- Accessibility/focus checks: heading count/order sanity; video CTA focus visible; accordion still keyboard accessible.
- Reduced-motion evidence: no new motion introduced.

## Design Decision Log

- Decision: refresh copy in place, not redesign layout.
- Alternatives considered:
  - Full visual redesign: rejected; current sections already support the story and recent fixes stabilized margins/proof.
  - Add more proof/case content: rejected for this task; current problem is density/repetition, not lack of content.
  - Move final CTA to hero: rejected; user explicitly removed hero scheduling CTA to keep video as the only hero action.
- Why this pattern: About page needs trust and narrative, but Efeonce voice requires concise, high-signal copy. Section-by-section copy reduction preserves existing SEO/value while improving scanability.
- Reuse / extend / new primitive: reuse existing Elementor/Ohio sections and public-site patterns; no primitive.
- Open risks:
  - WordPress/Elementor text widgets may contain duplicated desktop/mobile variants; implementation must inspect both.
  - SEO FAQ/body may rely on some long-form content; do not remove FAQ answers blindly.
  - Accented Spanish copy may be altered by editor encoding; verify live rendered text.
  - Kinsta cache may show stale copy; verify with cache-buster.
- Follow-up:
  - If the copy refresh reveals visual crowding in specific cards, create a separate layout task rather than expanding this copy-only task.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives or are not introduced.
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [x] Design decision log explains reuse/extend/new before implementation starts.
