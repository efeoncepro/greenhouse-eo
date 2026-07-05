# TASK-1327 / Brand Visibility Landing — Public Lead Magnet Wireframe

## Meta

- Status: `draft`
- Owner task: `TASK-1327 — Public lead-magnet landing + embed del form gobernado`
- Product Design asset: Reporte publico Think actual (`/brand-visibility/r/[token]`) + antecedente TASK-1241 (`Answer Engine Signal Scan`) como contexto historico, no como UI literal.
- Intended consumers: decisores de marketing, growth, founders y equipos comerciales B2B que llegan por busqueda, enlace o recomendacion.
- Copy source: copy local del hub `efeonce-think`, alineado a `docs/context/05_voz-tono-estilo.md`, `docs/context/09_marca-agencia.md` y `seo-aeo/efeonce/AI_VISIBILITY_GRADER.md`.
- Primitive decision: reuse del shell visual de Think + web component gobernado `<greenhouse-form>` + motion/loader local gobernado; no nace primitive Greenhouse porque la superficie vive en Astro publico externo.
- UI ready target: `no`

## Brief

- Primary user: una persona responsable de crecimiento o posicionamiento que quiere iniciar un análisis para saber si su marca aparece, se entiende y se cita en motores de respuesta.
- User moment: primer contacto con el lead magnet antes de entregar datos; todavía no existe diagnóstico ni evidencia del run.
- Job to be done: entender el valor del lead magnet, completar el form gobernado, esperar el análisis con una experiencia premium y ver el reporte en pantalla.
- Primary decision signal: la pagina debe demostrar continuidad con el informe final premium, no parecer una landing generica ni un lead form inflado.
- Non-goals: prometer ranking, mostrar scores ficticios, fingir progreso del analisis, explicar toda la metodologia, reconstruir el form, duplicar validacion, pedir datos fuera del contrato gobernado.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Identidad Efeonce/Think y contexto de producto sin distraer del form. | `BaseLayout` / header local Think | Static copy |
| 1 | First fold: lead magnet + form | Vender el lead magnet, anticipar que habra analisis posterior y permitir completar el form sin scroll obligatorio en desktop. | Two-column landing section + signal preview + `<greenhouse-form>` | Static copy + Growth Forms renderer |
| 1a | Lead magnet thesis | Explicar que el analisis posterior medira presencia, citabilidad, categoria percibida y operabilidad en IA. | Editorial block aligned to report hero | Static copy |
| 1b | Signal preview | Dar sensacion enterprise del futuro reporte, sin presentar resultados ni progreso real. | Signal lanes / dimension chips | Static illustrative labels only |
| 1c | Form host | Contenedor sobrio para el renderer gobernado, con fallback noscript/degraded y skeleton rico. | `<greenhouse-form>` + script loader | Greenhouse Growth Forms |
| 2 | Report preview | Mostrar continuidad con el informe final sin inventar datos. | Report-preview tiles using Think report visual language | Static illustrative labels only |
| 3 | Analysis wait panel | Reemplazar el form luego de accepted con consola premium de análisis, cuatro etapas, señal visual y handoff al reporte. | Route-local state panel + GSAP | Renderer success event + governed status URL/report token |
| 4 | How it works | Hacer explicito el loop: landing, form, grader async, loader, report token. | Four-step timeline | Static copy |
| 5 | Diagnostic scope | Delimitar lo que el informe cubre y lo que no promete. | Method notes / proof strip | Static copy |
| 6 | Trust / FAQ | Resolver dudas de privacidad, correo corporativo, tiempo y muestra. | FAQ list | Static copy + governed form behavior notes |
| 7 | Footer | Marca publica Efeonce y legal basico. | Existing Think footer | Static copy |

## Report-Derived Content Model

La landing se diseña desde el reporte real actual, no desde una landing genérica. Debe tomar sus bloques como promesa de valor y convertirlos en preview sin datos.

| Reporte actual | Landing pre-submit | Loader/post-submit | Prohibido antes del run |
|---|---|---|---|
| Hero navy + gauge | Hero navy/white hybrid con promesa `Brand Visibility Grader` y form visible. | Consola visual con anillos/scan SVG y `Visibilidad IA`, sin número ni severidad. | Score, severidad, fecha, organización, ID. |
| Resumen ejecutivo | Cuatro promesas compactas: presencia, motores, citabilidad, operabilidad. | Cuatro tarjetas estáticas: Presencia, Citabilidad, Categoría, Operabilidad, todas en preparación. | Porcentajes, motor fuerte/débil, brecha. |
| SoM por motor | Tira de motores evaluables con logos/nombres. | Etapa `Consultando motores de respuesta`. | Barras y estados por motor. |
| SoV competitivo | Card "cuota de conversación frente a competidores". | Etapa `Agrupando menciones competitivas`, solo si status real lo permite. | Ranking/líder/brecha. |
| Tono de mención | Card "cómo te describen cuando apareces". | Skeleton de sentiment sin valores. | Counts, donut, saldo. |
| Mapa de citabilidad | Card "qué fuentes alimentan la respuesta". | Etapa `Mapeando citabilidad`. | Dominios, URLs, citas totales. |
| Operabilidad | Card "si te pueden usar, no solo citar". | Etapa `Revisando operabilidad del sitio`. | Readiness scores, pruebas medidas. |
| Categoría percibida | Card "cómo la IA puede ubicar tu categoría". | Etapa `Leyendo categoría percibida`. | Categoría, señales, ambigüedad. |
| Escalera 5 niveles | Sección educativa con los 5 niveles del framework. | El reporte final resuelve el peldaño actual. | `Empieza aquí`, scores de peldaños. |
| Brecha + recomendaciones | Promesa de prioridad operativa y secuencia de acciones. | Skeleton de recomendación. | Recomendación personalizada. |
| Detalle técnico/radar | Promesa de explicación del puntaje por dimensiones. | Skeleton de detalle técnico. | Radar o puntajes por dimensión. |
| Share/PDF | Mención suave: "cuando esté listo, podrás guardar/compartir". | Activar solo con token/report ready. | Links de share/PDF sin token. |

Orden recomendado en la landing:

1. Hero con H1, promesa del análisis y form visible.
2. Tira de confianza/método: motores muestreados, muestra acotada, sin promesas de ranking.
3. Preview de módulos del reporte, agrupado en 4 familias: presencia, competencia, citabilidad, acción.
4. Escalera de 5 niveles como marco educativo.
5. Cómo funciona: enviar datos, ejecutar análisis, esperar loader, ver reporte.
6. FAQ/trust: correo corporativo, privacidad, muestra, qué no se garantiza.
7. Post-submit in-place: analysis wait panel y transición al reporte.

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `think.brandVisibility.landing.meta.title` | SEO | `Brand Visibility Grader | Efeonce Think` | none | Indexable landing title. |
| `think.brandVisibility.landing.meta.description` | SEO | `Solicita un analisis de Brand Visibility para ver como la IA entiende, cita y recomienda tu marca.` | none | Avoids unsupported guarantees. |
| `think.brandVisibility.landing.hero.eyebrow` | 1a | `Brand Visibility Grader` | none | Literal offer/category. |
| `think.brandVisibility.landing.hero.title` | 1a | `Mide como la IA entiende y recomienda tu marca` | none | First-viewport signal. |
| `think.brandVisibility.landing.hero.body` | 1a | `Deja tus datos y ejecutaremos un analisis muestreado de presencia, citabilidad, categoria percibida y capacidad de accion en motores de respuesta.` | none | Promise of future analysis. |
| `think.brandVisibility.landing.hero.methodNote` | 1a | `No es un ranking cosmetico: el reporte se arma despues del submit con senales que influyen en como la IA presenta tu marca.` | none | Serious lead magnet tone. |
| `think.brandVisibility.landing.rail.title` | 1b | `El reporte observara cuatro senales` | none | Future report preview heading. |
| `think.brandVisibility.landing.rail.presence` | 1b | `Presencia` | none | Static dimension. |
| `think.brandVisibility.landing.rail.citation` | 1b | `Citabilidad` | none | Static dimension. |
| `think.brandVisibility.landing.rail.category` | 1b | `Categoria percibida` | none | Static dimension. |
| `think.brandVisibility.landing.rail.operability` | 1b | `Operabilidad` | none | Static dimension. |
| `think.brandVisibility.landing.form.title` | 1b | `Inicia tu analisis` | none | Surrounding heading; fields come from governed form. |
| `think.brandVisibility.landing.form.body` | 1b | `Deja tus datos y el grader iniciara el analisis para mostrarte el reporte en pantalla.` | none | On-screen report is primary. |
| `think.brandVisibility.landing.form.loading.title` | 1c | `Preparando el formulario gobernado` | none | Skeleton state. |
| `think.brandVisibility.landing.form.loading.body` | 1c | `Estamos conectando con Greenhouse para cargar los campos, consentimiento y protecciones del form.` | none | Explains useful loader. |
| `think.brandVisibility.landing.form.degraded` | 1b | `No pudimos cargar el formulario. Intenta recargar la pagina o escribenos desde el sitio de Efeonce.` | none | No internal errors. |
| `think.brandVisibility.landing.preview.title` | 2 | `Lo que vas a recibir` | none | Preview section. |
| `think.brandVisibility.landing.preview.presence` | 2 | `Presencia por motor` | none | No values. |
| `think.brandVisibility.landing.preview.citation` | 2 | `Citabilidad y fuentes` | none | No values. |
| `think.brandVisibility.landing.preview.category` | 2 | `Categoria percibida` | none | Aligns TASK-1331/TASK-1334. |
| `think.brandVisibility.landing.preview.operability` | 2 | `Plan accionable` | none | Mirrors report operability. |
| `think.brandVisibility.landing.preview.competitive` | 2 | `Cuota competitiva` | none | Mirrors SoV benchmark. |
| `think.brandVisibility.landing.preview.sentiment` | 2 | `Tono de mención` | none | Mirrors sentiment module. |
| `think.brandVisibility.landing.preview.sources` | 2 | `Mapa de citabilidad` | none | Mirrors source evidence. |
| `think.brandVisibility.landing.preview.ladder` | 2 | `Escalera de visibilidad` | none | Mirrors MaturityLadder. |
| `think.brandVisibility.landing.preview.recommendations` | 2 | `Prioridad operativa` | none | Mirrors recommendation block. |
| `think.brandVisibility.landing.steps.title` | 3 | `Del formulario al informe` | none | Flow clarity. |
| `think.brandVisibility.landing.steps.1` | 3 | `Dejas tus datos en el form gobernado.` | none | Form ownership clear. |
| `think.brandVisibility.landing.steps.2` | 3 | `Greenhouse ejecuta el grader en segundo plano.` | none | SSOT clear. |
| `think.brandVisibility.landing.steps.3` | 3 | `Ves el avance mientras se prepara el reporte.` | none | Loader / wait state. |
| `think.brandVisibility.landing.steps.4` | 3 | `Lees el reporte privado en Think.` | none | On-screen completion. |
| `think.brandVisibility.landing.analysis.kicker` | 3 | `Pipeline de análisis` | none | Post-submit panel. |
| `think.brandVisibility.landing.analysis.title` | 3 | `Estamos construyendo tu informe privado` | none | Post-submit panel. |
| `think.brandVisibility.landing.analysis.body` | 3 | `Recibimos tu solicitud y estamos esperando el estado gobernado del análisis.` | none | No fake timing; screen-first. |
| `think.brandVisibility.landing.analysis.assurance` | 3 | `El reporte se abrirá en una ruta privada apenas Greenhouse confirme que está listo.` | none | Trust / wait reassurance. |
| `think.brandVisibility.landing.analysis.stepAccepted` | 3 | `Solicitud recibida` | none | True after accepted. |
| `think.brandVisibility.landing.analysis.stepQueued` | 3 | `Analisis en cola` | none | Only mark current if governed status confirms, otherwise static "siguiente". |
| `think.brandVisibility.landing.analysis.stepProcessing` | 3 | `Señales en preparación` | none | Current only when governed status is processing. |
| `think.brandVisibility.landing.analysis.stepReport` | 3 | `Reporte privado` | none | Primary handoff. |
| `think.brandVisibility.landing.analysis.readyCta` | 3 | `Abrir informe` | report URL if governed | Conditional only. |
| `think.brandVisibility.landing.analysis.readyOverlay` | 3 | `Abriendo tu informe privado` | report URL if governed | Transition overlay copy. |
| `think.brandVisibility.landing.trust.sample` | 4 | `El analisis usa una muestra acotada de prompts y motores. No reemplaza una auditoria completa ni garantiza posicionamiento.` | none | Legal/expectation safety. |
| `think.brandVisibility.landing.faq.email.title` | 5 | `Por que pedimos correo corporativo` | none | Mirrors governed gate. |
| `think.brandVisibility.landing.faq.email.body` | 5 | `El informe esta pensado para marcas y equipos reales. El form puede rechazar correos personales o temporales.` | none | Avoids surprise. |
| `think.brandVisibility.landing.faq.privacy.title` | 5 | `Que pasa con mis datos` | none | Trust. |
| `think.brandVisibility.landing.faq.privacy.body` | 5 | `La captura, consentimiento, validacion y entrega pasan por el motor gobernado de formularios de Greenhouse.` | none | No custom logic. |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Inicia tu analisis` | `Completa el form gobernado para ejecutar el grader y ver el reporte en pantalla.` | Form submit handled by `<greenhouse-form>` | Default. |
| loading | `Preparando el formulario gobernado` | `Estamos conectando con Greenhouse para cargar campos, consentimiento y protecciones.` | none | Rich skeleton; no spinner-only UI. |
| empty | `Formulario no disponible` | `El contrato del form no devolvio campos publicables.` | `Reintentar` | Should be rare; no internals. |
| partial | `Formulario con disponibilidad parcial` | `Algunas capacidades externas pueden tardar en cargar.` | `Reintentar` | Use only if renderer exposes safe partial state. |
| error | `No pudimos cargar el formulario` | `Intenta recargar la pagina. Si persiste, usa el contacto publico de Efeonce.` | `Reintentar` | Do not leak API/CORS details. |
| denied | `Este formulario no esta disponible desde este origen` | `La superficie publica aun no esta autorizada para este form.` | none | Pre-launch/degraded evidence; should be blocked by TASK-1335. |
| submitting | `Enviando solicitud` | `Estamos validando el form gobernado antes de iniciar el analisis.` | none | Renderer owns duplicate-submit prevention. |
| analysis_wait | `Estamos construyendo tu informe privado` | `Recibimos tu solicitud y estamos esperando el estado gobernado del análisis.` | none | Rich post-submit state; no fake percentages. |
| report_ready | `Tu informe privado está listo para abrirse en Think.` | `Estamos preparando una transición segura hacia el reporte.` | `Abrir informe` | Only if a governed handle/status returns a report URL. |
| accepted | `Recibimos tu solicitud` | `El grader iniciara el analisis. Si no podemos mantener la espera en pantalla, te daremos una recuperacion segura.` | `Volver al inicio` | Fallback only, not desired final UX. |

## Accessibility Contract

- Heading order: one `h1` in the first fold; subsequent sections use ordered `h2` headings; card titles use `h3` only when nested in a section.
- Chart/table alternatives: report preview must be static explanatory cards, not fake charts. If visual indicators are used, each needs text labels.
- Aria labels: form host region labelled by `Inicia tu analisis`; form loader, analysis wait, degraded/retry messages use polite live region.
- Focus notes: initial focus remains browser default; skip link from layout should reach main; after accepted/error state, focus moves to the state heading if the renderer allows host callback.
- Color-independent state labels: all states use text labels; status is not expressed only through color.
- Reduced motion: all signal preview and loader movement collapses to static skeleton + text with equivalent meaning.

## Implementation Mapping

- Route / surface: `efeonce-think` route `/brand-visibility` (`think.efeoncepro.com/brand-visibility`), public and indexable.
- Primitives: Think `BaseLayout`; existing Think report visual language; governed `<greenhouse-form>`.
- Variants / kinds: no Greenhouse MUI primitive. The web component uses `appearance="bare"` to inherit the public landing container.
- Component candidates: Astro page `src/pages/brand-visibility/index.astro`; route-local `BrandVisibilityFormDock.astro` owns the governed form host, analysis console, polling status messages and report-ready overlay; optional local presentational components only if they do not duplicate the form renderer.
- Copy source: local Think landing copy module or constants near the route; avoid scattering reusable copy inside JSX/Astro markup.
- Data reader / command: none in Think for submit. Report/status reader required for on-screen completion, but only through a governed handle/token returned by the renderer or public grader contract.
- API parity: no local submit endpoint, no local validation, no local consent/Turnstile. The only command path is the governed form renderer.
- Access / capability: public unauthenticated page; report token route remains `noindex`.
- Runtime consumers: anonymous prospects, search crawlers for the landing only, report viewers after successful submit.
- Print/email/PDF considerations: email can be secondary recovery, but the primary UX target is report in screen.
- GVC markers: `brand-visibility-landing`, `brand-visibility-hero`, `brand-visibility-signal-preview`, `brand-visibility-form`, `brand-visibility-form-loader`, `brand-visibility-analysis`, `brand-visibility-report-preview`, `brand-visibility-flow`, `brand-visibility-trust`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/think-brand-visibility-landing.scenario.ts` or equivalent Think Playwright capture if GVC cannot target the external repo directly.
- Route: `/brand-visibility` on local Think and staging/prod after deployment.
- Viewports: desktop 1440, laptop 1280, mobile 390.
- Required steps: load page, confirm meta indexability, capture entry settled state, wait for `<greenhouse-form>`, verify first fold contains lead magnet thesis + signal preview + form host, capture form loader/ready, capture analysis wait in controlled safe mode, capture report-ready overlay when governed token/status is available, scroll through preview/flow/FAQ, trigger degraded state only in controlled local scenario if supported.
- Required captures: first fold desktop, form loader, form ready, analysis wait, report-ready overlay, full page desktop, first fold mobile, mobile analysis wait, full page mobile, accepted/degraded state if reachable without fake production submission.
- Required `data-capture` markers: `brand-visibility-landing`, `brand-visibility-hero`, `brand-visibility-signal-preview`, `brand-visibility-form`, `brand-visibility-form-loader`, `brand-visibility-analysis`, `brand-visibility-report-preview`, `brand-visibility-flow`, `brand-visibility-trust`.
- Assertions: no fake scores, no fake progress, no local form fields outside `<greenhouse-form>`, script loads from Greenhouse, route is indexable, report token route remains noindex.
- Scroll-width checks: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at 1440 and 390.
- Accessibility/focus checks: keyboard reaches form host and FAQ links; visible focus for CTAs/retry; no heading skips that break the document outline.
- Reduced-motion evidence: run a reduced-motion capture/assertion proving loader/analysis states remain understandable without animation.

## Design Decision Log

- Decision: first viewport combines lead magnet thesis, signal preview and form host; only after submit does it transition into a GSAP-orchestrated enterprise analysis console, report-ready overlay and then the report.
- Alternatives considered: generic marketing hero above the fold; custom-built form; iframe embed; fake preview scores; spinner-only success.
- Why this pattern: the page is the entry to the lead magnet; credibility belongs before submit, diagnosis/report belongs after the governed run.
- Reuse / extend / new primitive: reuse Think shell/report language and Growth Forms renderer; do not create a new Greenhouse primitive.
- Open risks: TASK-1335 must authorize `think.efeoncepro.com`; render contract availability must be verified; Turnstile/site config must be valid for the Think origin; submit contract may not yet expose the handle/token needed for on-screen report completion.
- Follow-up: if the governed form success contract cannot return a report/status handle, split or block the missing contract rather than falling back to email as the primary UX.

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
