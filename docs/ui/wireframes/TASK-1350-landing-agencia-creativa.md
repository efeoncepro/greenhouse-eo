# TASK-1350 / Landing pública "Agencia Creativa" — Wireframe

## Meta

- Status: `draft`
- Owner task: `TASK-1350 — Landing pública "Agencia Creativa" (Efeonce · Design Engineer)`
- Product Design asset: **PENDIENTE** — la dirección de arte del hero + KV se produce con `design-studio` → `fal.ai`/Higgsfield/Magnific/Adobe (Slice 1). `UI ready` se mantiene `no` hasta tenerla aprobada. Este wireframe fija **estructura, copy, estados y flujo**; no inventa la dirección visual.
- Intended consumers: visitante público (CMO/Director de Marketing/CEO/Compras) en `efeoncepro.com`.
- Copy source: contenido WordPress es-CL, validado con `greenhouse-ux-writing` + `docs/context/05_voz-tono-estilo.md` + `09_marca-agencia.md`. No `src/lib/copy/*` (no es portal).
- Primitive decision: `new (one-off público)` — bloques de theme custom WordPress (no design system del portal); bundle Vite para el hero e islands.
- UI ready target: `no` (hasta dirección de arte aprobada + contrato de Motion).

## Brief

- Primary user: decisor de marketing evaluando si Efeonce es su agencia creativa; frío→tibio.
- User moment: descubrimiento (orgánico/AEO/pauta/referido); primeros 10 segundos definen si sigue leyendo.
- Job to be done: "necesito una agencia creativa que no sea una caja negra — que produzca nivel y que yo pueda ver operar y medir".
- Primary decision signal: "esta agencia opera la creatividad como sistema medible con visibilidad total, y la propia página lo demuestra con craft" → agenda una reunión.
- Non-goals: no es self-serve, no vende un servicio puntual, no expone el portal ni datos de cliente, no lidera con siglas.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header / nav | Marca Efeonce + nav mínima + CTA "Agenda una reunión" (sticky) | header del theme custom | estático |
| 1 | Hero | Claim + subhead + media art-dirigido (poster+video lazy) + CTA primario + secundario | hero island (Vite) | asset producido (Slice 1) |
| 2 | Trust bar | Logos de clientes + proof stats | banda estática | curado |
| 3 | El problema | Nombrar fragmentación + caja negra | sección de contenido | estático |
| 4 | Cómo trabajamos | Loop Marketing como beneficio ("gasto → inversión que se acumula") | sección + diagrama sutil | estático |
| 5 | Qué hacemos | Capability creativa: identidad, contenido full-funnel, audiovisual (Globe Studio), campañas | grilla de servicios | estático |
| 6 | ⭐ Diferenciador medible | Operaciones creativas medibles (menos rondas / más bien a la primera / ciclo más corto → Revenue Enabled) | **island vivo** (number-tickers, reveal) | cifras curadas/ilustrativas (no live del portal) |
| 7 | Motor de producción IA | Multi-Model AI Studio + "cómo está hecho" (assets propios como portfolio) | sección + before/after | assets propios |
| 8 | Casos | Sky (+127% tráfico orgánico), Bresler (+180% ventas digitales), Berel (retainer SEO+AEO) | grilla de casos | curado (solo citables) |
| 9 | Ecosistema / switching cost | Greenhouse como prueba de la transparencia radical | sección | estático |
| 10 | CTA final + booking | "Agenda una reunión" → HubSpot Meetings (modal/embed o sección) | embed HubSpot Meetings | HubSpot |
| 11 | FAQ | Answer capsules (objeciones + AEO) | acordeón | estático |
| 12 | Footer | Marca Efeonce, contacto, legales, redes | footer del theme | estático |

## Copy Ledger

Copy es-CL, tuteo, beneficios antes que siglas, lidera Efeonce. Strings iniciales (a validar/afinar con `greenhouse-ux-writing`):

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `publicsite.agencia-creativa.hero.h1` | 1 | Creatividad que puedes ver operar en tiempo real. | — | H1; sin siglas; lidera beneficio |
| `publicsite.agencia-creativa.hero.subhead` | 1 | Concepto, contenido y producción audiovisual, operados como un solo sistema medible. Con visibilidad total. | — | descriptor |
| `publicsite.agencia-creativa.hero.cta_primary` | 1 | Agenda una reunión | — | CTA primario (repetido) |
| `publicsite.agencia-creativa.hero.cta_secondary` | 1 | Mira cómo medimos | — | ancla al bloque 6 |
| `publicsite.agencia-creativa.trust.stats` | 2 | 120+ empresas · 4 países · 80% de renovación · HubSpot Solutions Partner | — | cifras del doc de autoridad; no inflar |
| `publicsite.agencia-creativa.problem.title` | 3 | Tu marketing tiene muchas piezas y ningún sistema. | — | nombra la fragmentación |
| `publicsite.agencia-creativa.problem.body` | 3 | Una agencia hace la marca, otra los ads, otra el sitio — y nadie conecta nada. Y del trabajo creativo, "te mandan el reporte el viernes". | — | enemigo = fragmentación + caja negra |
| `publicsite.agencia-creativa.how.title` | 4 | Tu marketing deja de ser gasto y se vuelve inversión que se acumula. | — | Loop Marketing como beneficio |
| `publicsite.agencia-creativa.services.title` | 5 | Lo que hacemos | — | capability creativa |
| `publicsite.agencia-creativa.services.items` | 5 | Identidad y concepto · Contenido full-funnel · Producción audiovisual · Campañas | — | Globe Studio como motor de producción |
| `publicsite.agencia-creativa.diff.title` | 6 | Otras agencias te mandan el reporte. Nosotros te damos el tablero. | — | el diferenciador |
| `publicsite.agencia-creativa.diff.metric_rounds` | 6 | Menos rondas de revisión por entregable | valor ilustrativo | RpA como beneficio |
| `publicsite.agencia-creativa.diff.metric_ftr` | 6 | Más piezas bien a la primera | valor ilustrativo | FTR como beneficio |
| `publicsite.agencia-creativa.diff.metric_cycle` | 6 | Ciclo de producción más corto | valor ilustrativo | Cycle Time → Time-to-Market |
| `publicsite.agencia-creativa.diff.disclaimer` | 6 | Cifras ilustrativas del modelo de operación. | — | honestidad: no live del portal |
| `publicsite.agencia-creativa.aistudio.title` | 7 | IA con estándar de marca, no IA suelta. | — | Multi-Model AI Studio + gobernanza |
| `publicsite.agencia-creativa.cases.title` | 8 | Lo que producimos, con resultados | — | solo casos citables |
| `publicsite.agencia-creativa.cases.sky` | 8 | Sky Airlines · +127% tráfico orgánico | — | caso citable |
| `publicsite.agencia-creativa.cases.bresler` | 8 | Bresler · +180% ventas digitales | — | caso citable |
| `publicsite.agencia-creativa.cases.berel` | 8 | Pinturas Berel · retainer SEO + AEO | — | caso citable |
| `publicsite.agencia-creativa.ecosystem.title` | 9 | No te entregamos informes: te damos login. | — | switching cost / Greenhouse |
| `publicsite.agencia-creativa.cta_final.title` | 10 | Conversemos tu operación creativa. | — | CTA final |
| `publicsite.agencia-creativa.cta_final.button` | 10 | Agenda una reunión | — | mismo CTA primario |
| `publicsite.agencia-creativa.faq.q1` | 11 | ¿Qué es una operación creativa medible? | — | answer capsule (AEO) |
| `publicsite.agencia-creativa.faq.q2` | 11 | ¿Cómo veo el estado de mi trabajo creativo? | — | answer capsule |
| `publicsite.agencia-creativa.faq.q3` | 11 | ¿En qué países opera Efeonce? | — | answer capsule |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | landing renderizada, hero con media | Agenda una reunión | default |
| loading | — | poster/blur-up del hero; skeleton del island de métricas | — | no bloquea lectura |
| empty | — | N/A (contenido curado, sin data vacía) | — | el bloque de métricas usa cifras curadas |
| partial | — | si el video de frontera no carga → still art-dirigido | — | degradación sin romper layout |
| error | No pudimos abrir la agenda | Escríbenos y coordinamos por aquí. | Ir a /contacto/ · WhatsApp · mailto | fallback si el embed de Meetings falla; nunca CTA muerto |
| denied | — | N/A (público) | — | — |

## Accessibility Contract

- Heading order: H1 único (hero) → H2 por sección (problema, cómo, servicios, diferenciador, IA, casos, ecosistema, FAQ) → H3 dentro de grillas. Sin saltos.
- Chart/table alternatives: el bloque de métricas (6) expone los valores como texto legible (no solo animación); las cifras tienen etiqueta textual, no dependen de color.
- Aria labels: CTAs con label explícito; embed de Meetings con `aria-label`; acordeón FAQ con `aria-expanded`.
- Focus notes: foco visible en CTAs/nav/FAQ; skip-to-content; al abrir el booking, foco entra al modal y al cerrar vuelve al CTA disparador.
- Color-independent state labels: estados (error/fallback) no dependen solo de color; texto explícito.

## Implementation Mapping

- Route / surface: página WordPress `efeoncepro.com/<slug>` `[slug pendiente: /agencia-creativa/ vs /servicios/... — Open Question]`; theme partial + bundle Vite (hero + island de métricas).
- Primitives: bloques de theme custom (NO primitives del portal). Island de métricas = componente aislado hidratado.
- Variants / kinds: N/A (público).
- Component candidates: hero, trust bar, secciones de contenido, island de métricas (number-tickers), grilla de casos, embed HubSpot Meetings, acordeón FAQ.
- Copy source: contenido WP es-CL (validado `greenhouse-ux-writing`); ledger de arriba.
- Data reader / command: ninguno de Greenhouse. Conversión = HubSpot Meetings/Forms (reuse). Métricas del bloque 6 = curadas/ilustrativas (declarado en copy).
- API parity: N/A — no expone acción de negocio del portal; agendar es acción HubSpot con su propio contrato.
- Access / capability: none (público).
- Runtime consumers: navegador público; agentes/crawlers IA (AEO) sobre el contenido + JSON-LD.
- Print/email/PDF considerations: N/A.
- GVC markers: N/A portal — verificación por Playwright live (secciones/selectores de la página pública).

## GVC Scenario Plan

- Scenario file: **N/A (GVC del portal no aplica)** — superficie WordPress pública. Verificación = Playwright live sobre la página publicada (patrón TASK-1343/1345).
- Route: URL pública `[una vez publicada]`.
- Viewports: 1440, 1280, 390.
- Required steps: cargar, scroll completo, abrir/cerrar booking, forzar `prefers-reduced-motion: reduce`.
- Required captures: hero, bloque 6 (métricas), sección casos, booking abierto, mobile 390 full-scroll, still con reduced-motion.
- Required `data-capture` markers: N/A (portal); usar selectores de sección de la página.
- Assertions: `errors=[]`, sin overflow horizontal (desktop + 390), CWV en budget (LCP/INP), contraste AA de texto sobre media, CTAs alcanzables por teclado, reduced-motion respetado, no-leak (sin datos internos/portal).
- Scroll-width checks: sí (desktop + 390).
- Accessibility/focus checks: foco visible, orden lógico, escape del modal restaura foco.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce` (sin video autoplay).

## Design Decision Log

- Decision: landing de posicionamiento de la capability creativa, liderada por Efeonce, con ejecución Design Engineer (arte+color+ingeniería) y diferenciador de operaciones medibles; WordPress **code-custom** (no Elementor); CTA "Agenda una reunión".
- Alternatives considered: Astro hand-built en Vercel (máx craft; descartado por decisión del operador a favor de WP-custom + dominio canónico); Elementor (descartado: contradice el mensaje Design Engineer).
- Why this pattern: el medio es el mensaje — la landing debe *probar* craft; WP-custom + Vite islands lo permite dentro del dominio canónico, asumiendo el trade-off de techo de craft (mitigado con media lazy + enqueue disciplinado + Kinsta CDN).
- Reuse / extend / new primitive: new (one-off público); reusa conversión HubSpot Meetings/Forms.
- Open risks: performance vs riqueza; AI slop; techo de WP; contraste/a11y sobre media.
- Follow-up: contrato de Motion (`docs/ui/motion/TASK-1350-...-motion.md`) antes de `UI ready: yes`; dirección de arte aprobada (Slice 1); slug/URL definitivo.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger (strings iniciales; a afinar con `greenhouse-ux-writing`).
- [x] Dynamic values are named and bounded (métricas del bloque 6 = ilustrativas, declaradas).
- [x] Partial/degraded states are explicit (video→still; embed→fallback `/contacto/`).
- [x] No copy implies a guarantee when data is estimated (disclaimer "cifras ilustrativas del modelo").
- [x] Charts have table/text alternatives (métricas expuestas como texto, no solo animación).
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough (Playwright live; portal GVC no aplica y se declara por qué).
- [x] Design decision log explains reuse/extend/new before JSX starts.
