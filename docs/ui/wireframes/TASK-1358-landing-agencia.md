# TASK-1358 / `/agencia` — Landing "Agencia" (pillar de categoría · growth partner)

## Meta

- Status: `draft`
- Owner task: `TASK-1358`
- Product Design asset: art direction del hero + sección firma pendiente (Slice 1; `product-design-loop` — 3 conceptos → elegir)
- Intended consumers: público (tráfico frío de categoría "agencia de marketing digital"), comprador mid-market/enterprise
- Copy source: WordPress es-LATAM neutro, validado con `greenhouse-ux-writing` (NO `src/lib/copy/*` — sitio público)
- Primitive decision: `reuse` — patrones marketing `modern-ui` + rail HTML gobernado de TASK-1345 (Ohio/Elementor); NO primitives del portal
- UI ready target: `no` (se sostiene hasta art direction + contrato de Motion + copy final + lint limpio)

## Brief

- Primary user: decisor de marketing mid-market/enterprise que busca la **categoría** ("agencia de marketing digital / de marketing") en Google o un motor IA — tráfico frío, comparando.
- User moment: primer contacto comercial; llega desde SERP/IA con intención de categoría, no conoce a Efeonce aún (Schwartz: **solution-aware** — conoce "agencias", no la nuestra).
- Job to be done: entender en <10s que Efeonce **no es una agencia digital más** sino un growth partner con software propio y visibilidad total → agendar una reunión.
- Primary decision signal: la **prueba de operación medible** (ecosistema en vivo + casos citables) que ninguna agencia commodity puede mostrar.
- Non-goals: no es about-us (identidad/E-E-A-T ya vive en `/about-us-efeonce/`); no es self-serve; no expone el portal ni datos de cliente; no reemplaza las spokes de `/servicios`.

## Layout Skeleton

| # | Region | Slot | Purpose | Component candidate | Data source |
| --- | --- | --- | --- | --- | --- |
| 0 | Header | Ohio masthead nativo | Nav global + logo Efeonce | Ohio `header-3` (nativo, `position:absolute`) | WP theme |
| 1 | Hero (dark, full-bleed) | eyebrow + H1 + subhead + 2 CTAs + proof row | Captura keyword de categoría + reframe growth partner en la 1ª fold | Ohio `ohio_badge`/`ohio_heading`(h1)/`ohio_button` + `.gh-*` proof row | copy estático |
| 2 | Trust bar | franja de logos reales | Prueba social inmediata (juicio de confianza ~50ms) | `.gh-agencia-trust` logo strip (assets locales) | `docs/assets/public-site/aeo-brand-logos/` |
| 3 | Problema | "muchas piezas, ningún sistema" | Agita el dolor: fragmentación (el enemigo declarado) | `.gh-agencia-problem` band | copy estático |
| 4 | Reframe / posicionamiento | "No somos una agencia digital más → growth partner" | El *no-es-X-es-Y* canónico; desmarca del commodity | `.gh-agencia-reframe` (dark, `clb__dark_section`) | copy estático |
| 5 | ⭐ Motor full-service (**sección firma**) | 4 capabilities como un motor: creatividad+contenido · performance+medios · web+CRM+infra · data | Full-service **como sistema**, no menú; brand+performance dos velocidades | `.gh-agencia-motor` (craft concentrado; islands CSS) | copy + links a spokes |
| 6 | ⭐ Diferenciador medible (**sección firma**) | ecosistema (Greenhouse/Kortex/Verk) + ICO en vivo (RpA/OTD/FTR) | "Login, no informes" — la prueba que ninguna agencia da | `.gh-agencia-proof-engine` (dark, dashboard ilustrativo) | cifras **ilustrativas** declaradas |
| 7 | Cómo trabajamos | growth orquestado / loop (beneficios, no siglas) | Mecanismo causal: por qué el crecimiento compone | `.gh-agencia-method` | copy estático |
| 8 | Casos | Sky · Bresler · Berel · SSilva | Prueba con dato real (solo citables) | `.gh-agencia-cases` | casos citables (`13`) |
| 9 | Ecosistema / foso ASaaS | 3 plataformas → switching cost | Diferenciador estructural (`14`) | `.gh-agencia-ecosystem` (dark) | copy estático |
| 10 | Para quién | equipos de marketing mid-market/enterprise | Auto-calificación + anti-ICP suave | `.gh-agencia-audience` | copy estático |
| 11 | CTA / Agenda | conversión: "Agenda una reunión" | Cierre; launcher gobernado, aún no promovido | Growth CTA `open_meeting_scheduler` → scheduler native-only | Growth Meetings |
| 12 | FAQ | objeciones de categoría | Reduce fricción de decisión + FAQPage schema | `<details name="task1358-faq">` nativo | copy + FAQPage JSON-LD |
| 13 | Footer | Ohio `#colophon` nativo | Cierre + nav global | Ohio nativo | WP theme |

## Copy Ledger

> Copy final se produce en Slice 2 con `greenhouse-ux-writing` (es-LATAM neutro, tuteo, sin voseo). Acá van **direcciones de copy** (hipótesis a validar), no strings finales. Convención de id: `publicsite.agencia.<section>.<slot>`.

| Copy id | Region | Text (dirección) | Dynamic values | Notes |
| --- | --- | --- | --- | --- |
| `publicsite.agencia.hero.eyebrow` | Hero | "Agencia de crecimiento integrada" | — | Reencuadre puente (findable + desmarcado); espeja eyebrow del about-us |
| `publicsite.agencia.hero.h1` | Hero | "El crecimiento real no se compra por partes. Se orquesta." | — | Claim canónico `09`; el término de categoría vive en `<title>`/meta, no fuerza el H1 visible |
| `publicsite.agencia.hero.subhead` | Hero | "Creatividad, performance, medios, CRM y data trabajando como un solo motor —con visibilidad total de qué pasa y qué resultado produce." | — | Enumera capabilities incl. **performance**; promete visibilidad |
| `publicsite.agencia.hero.cta_primary` | Hero | "Agenda una reunión" | — | → `open_meeting_scheduler` cuando la surface sea promovida |
| `publicsite.agencia.hero.cta_secondary` | Hero | "Mira cómo operamos" | — | video/tour ecosistema; bajo compromiso |
| `publicsite.agencia.hero.proof` | Hero | "+90 marcas · Chile · Colombia · México · Perú" | count, países | Cifra citable (`09`) |
| `publicsite.agencia.reframe.headline` | Reframe | "No somos una agencia de marketing digital más. Somos tu partner de crecimiento —con software propio y visibilidad total." | — | **Regla dura del PDR**: el remate que desmarca del commodity |
| `publicsite.agencia.problem.headline` | Problema | "Tu marketing tiene muchas piezas pero ningún sistema." | — | Messaging BP1/BP2 (`09`) |
| `publicsite.agencia.motor.headline` | Motor | "Un solo motor. Cuatro capacidades que se alimentan entre sí." | — | Full-service como sistema |
| `publicsite.agencia.motor.card_perf` | Motor | "Performance y medios: pauta, Google/Meta, retargeting —conectados al resto, no en una isla." | — | Performance como capability listada |
| `publicsite.agencia.proof_engine.headline` | Diferenciador | "Las agencias te entregan informes. Nosotros te damos login." | RpA/OTD/FTR ilustrativos | Cifras **ilustrativas declaradas**, no live |
| `publicsite.agencia.audience.headline` | Para quién | "Para equipos de marketing que ya tienen todo —menos un sistema que lo una." | — | Auto-calificación mid-market/enterprise |
| `publicsite.agencia.cta.headline` | CTA | "Hablemos de cómo orquestar tu crecimiento." | — | — |
| `publicsite.agencia.faq.q{1.6}` | FAQ | 6 objeciones de categoría (ver Detailed Spec de la task) | — | Coincide 1:1 con FAQPage JSON-LD |

## State Copy

> Landing pública estática con task surface de Growth Meetings. Agencia aún no está promovida; estos estados son el
> contrato objetivo del launcher/scheduler más la degradación editorial de assets.

| State | Title | Body | CTA / recovery | Notes |
| --- | --- | --- | --- | --- |
| `ready` | Agenda disponible | Calendario, agenda y zona del visitante listos | Elegir fecha/hora | scheduler native-only |
| `loading` | Cargando disponibilidad | Shell estructural estable | — | sin fechas falsas |
| `empty` | Sin horarios este mes | Grilla mensual completa con días no disponibles | Mes anterior/siguiente · Reintentar | sin provider link |
| `partial` | Assets degradados | Si un asset (logo/video) falla, la sección colapsa a texto/fondo sólido | — | Nunca romper layout; sin white-on-white |
| `error` | No pudimos actualizar la disponibilidad | Mensaje sanitizado | Reintentar | recuperación nativa |
| `denied` | — | N/A (público, sin auth) | — | — |

## Accessibility Contract

- Heading order: un solo `<h1>` (hero); secciones en `<h2>`; sub-bloques `<h3>`. Sin saltos de nivel.
- Chart/table alternatives: el dashboard ilustrativo (region 6) lleva texto equivalente (las cifras se leen en prosa, no solo en el gráfico); tabla comparativa (si se usa) es `<table>` semántica.
- Aria labels: CTAs con `aria-label` explícito cuando el texto visible no basta; logos con `alt` de marca; video con control accesible.
- Focus notes: launcher con `:focus-visible`; dialog/full-screen contiene foco, calendario usa semántica y cierre restaura al invocador.
- Color-independent state labels: disponibilidad/error/éxito usan texto + ícono, no sólo color; contraste AA.

## Implementation Mapping

- Route / surface: `https://efeoncepro.com/agencia/` (WordPress/Kinsta, Ohio/Elementor document; canonical apex).
- Primitives: patrones marketing `modern-ui` + rail HTML gobernado `.gh-agencia-*` (modelo TASK-1345); **NO** primitives del portal (`src/components/greenhouse/**`).
- Variants / kinds: N/A (sitio público, no design system del portal).
- Component candidates: Ohio `ohio_badge`/`ohio_heading`/`ohio_button` (hero) · Growth CTA
  `open_meeting_scheduler` + `<efeonce-meeting-scheduler>` · `greenhouse_comparison_table` · `<details>` nativo.
- Copy source: WordPress es-LATAM, validado `greenhouse-ux-writing`; NUNCA `src/lib/copy/*`.
- Data reader / command: Growth Meetings config/availability + verify-email/booking; WordPress sólo compone el host.
- API parity: booking permanece en el command server-side gobernado; no hay llamadas HubSpot desde WordPress/browser.
- Access / capability: público, sin auth, sin entitlements.
- Runtime consumers: navegador público + motores de respuesta IA (JSON-LD `Organization`+`Service`+`BreadcrumbList`+`FAQPage`).
- Print/email/PDF considerations: ninguna.
- GVC markers: `data-capture` por sección (`hero`, `trust`, `problem`, `reframe`, `motor`, `proof-engine`, `method`, `cases`, `ecosystem`, `audience`, `agenda`, `faq`) para captura Playwright live.

## GVC Scenario Plan

- Scenario file: **N/A** — GVC del portal (agent-auth) **no aplica** a WordPress público. Se usa **Playwright live** sobre la preview/página publicada (patrón TASK-1343/1345).
- Route: `/agencia/` (staging WP o preview antes de indexar).
- Viewports: `1440`, `1280`, `390`.
- Required steps: cargar → abrir/cerrar/reabrir scheduler sin booking → navegar calendario/mes vacío → abrir FAQ.
- Required captures: full-page desktop + mobile 390; hero; sección firma; launcher y scheduler dialog/full-screen.
- Required data-capture markers: los 12 listados arriba.
- Assertions: un solo `<h1>`; `scrollWidth == clientWidth`; action `open_meeting_scheduler`; cero links HubSpot en
  el scheduler; foco restaurado; dark sections AA y ningún booking durante smoke visual.
- Scroll-width checks: `scrollWidth == clientWidth` en 1440/1280/390.
- Accessibility/focus checks: foco visible, trap/restore del scheduler, teclado de calendario y FAQ operable.
- Reduced-motion evidence: capturar con `prefers-reduced-motion: reduce` — marquee/reveals detenidos, contenido legible y completo.

## Design Decision Log

- Decision: `/agencia` como pillar de categoría con hero que lidera el claim growth-partner y captura la keyword en `<title>`/meta (dos capas).
- Alternatives considered: (a) H1 = "Agencia de Marketing Digital en Chile" literal por SEO → descartado, viola doctrina masterbrand y suena commodity; (b) landing "partner de crecimiento" pura → descartado, keyword sin volumen; (c) que about-us haga el job → descartado, mismatch de intención.
- Why this pattern: resuelve la tensión posicionamiento vs descubrimiento como PDR-002 (slug/title = keyword; hero = categoría diferenciada); el reframe *no-es-X-es-Y* es Do canónico de voz.
- Reuse / extend / new primitive: `reuse` — rail HTML gobernado + Ohio nativo (TASK-1345); ninguna primitive nueva.
- Open risks: atraer comprador SMB equivocado (mitiga anti-ICP + sin precios commodity); activar Agencia antes de completar su binding, booking/replay y medición.
- Follow-up: contrato de Motion (region 5/6 sección firma) antes de `UI ready: yes`; art direction del hero (Slice 1).

## Acceptance Checklist

- [ ] Todas las strings visibles están en el Copy Ledger (o marcadas como dirección a validar en Slice 2 con `greenhouse-ux-writing`).
- [ ] Los valores dinámicos (proof count, países, cifras del proof-engine) están acotados y declarados como **ilustrativos** donde no son live.
- [ ] Estados empty/error/ambiguous son explícitos y su recovery permanece native-only.
- [ ] No se promete un dato como live cuando es ilustrativo (regla `09`/`13`).
- [ ] El dashboard/gráfico ilustrativo tiene alternativa textual.
- [ ] State + aria copy listos (calendario, error y success con texto + ícono).
- [ ] Implementation Mapping completo (route, primitives, copy source, data reader, access, GVC markers).
- [ ] GVC Scenario Plan específico (Playwright live, viewports, markers, scroll-width, reduced-motion).
- [ ] Design Decision Log explica reuse vs extend vs new y las alternativas descartadas.
