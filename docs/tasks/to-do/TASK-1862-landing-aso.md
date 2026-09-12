# TASK-1862 — Landing pública ASO (tercera superficie de Visibilidad)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-11 — pitch activo con Berel

El operador informó que ASO está en **pitch activo con Berel** (cliente existente). La landing pasa de ser la última
del portafolio a `Rank EPIC-047-02`: acompaña una expansión en cuenta, que es el primer criterio de EPIC-047. No cambia
el `Promotion blocked by`: validar PDR-023 y llevar la extensión Search & App Visibility a `Approved for validation`
pasan a ser urgentes, porque sin eso la página no sale de preview.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1862-landing-aso.md`
- Flow: `docs/ui/flows/TASK-1862-landing-aso-flow.md`
- Motion: `docs/ui/motion/TASK-1862-landing-aso-motion.md`
- Visual direction: `docs/ui/visual-directions/TASK-1862-landing-aso-direction.md`
- Form style: `docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md`
- Backend impact: `none`
- Epic: `EPIC-047`
- Status real: `Diseno`
- Rank: `EPIC-047-02`
- Domain: `content|ui`
- Blocked by: `none`
- Promotion blocked by: `extensión Search & App Visibility en Proposed (fase B exige Approved for validation; fase C exige Commercially approved); decisiones D1 y D2 de la extensión; dirección visual y copy ledger aprobados; revisión legal de claims y de marcas de terceros; Growth Form y Growth CTA publicados; slug validado con segunda fuente`
- Branch: `develop (Greenhouse) · efeonce-public-site-runtime según su contrato · sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la landing pública de **ASO** en `efeoncepro.com` (working route `/servicios/aso/`) como **tercera
superficie del grupo Visibilidad**, hermana de `/servicios/posicionamiento-seo/` y `/aeo-2/`: que una app se
encuentre en App Store y Google Play y se describa igual en la tienda, en Google y en los asistentes de IA. No es
una página de captura de demanda —el ASO casi no se busca en español—, sino el destino de expansión de SEO/AEO y
la referencia citable en español. Se publica por fases atadas al estado de la oferta, hoy `Proposed`. Reusa
Growth Forms, Growth CTA y el scheduler nativo; no hay backend nuevo.

## Why This Task Exists

El 2026-09-10 Efeonce registró el ASO como extensión por superficie de Search Visibility 360
([`SEARCH_APP_VISIBILITY_EXTENSION_V1.md`](../../business-models/search-visibility-360/SEARCH_APP_VISIBILITY_EXTENSION_V1.md),
`Proposed`) y hay una oportunidad viva que lo motivó: la app de Berel, cliente SEO actual
([workspace](../../commercial/tenders/berel-app-movil/README.md), deal en `qualifiedtobuy`). La oferta no tiene
superficie pública, y las landings de SEO y AEO no mencionan apps: un cliente con app no tiene dónde entender que
la tienda es la misma promesa de visibilidad.

La página también tiene que resolver un problema de búsqueda que ninguna landing previa tenía. Semrush
(`as-of 2026-09`): `app store optimization` ~20/mes en CL, MX, CO y PE; `agencia aso` 10; `posicionamiento de
apps` 0. `aso` suma 480–3.600/mes, pero su SERP lo ocupan el examen médico *antiestreptolisina O*, la empresa de
buses ADO y música. Optimizar esta página por tráfico sería medirla contra algo que no existe; el PDR-023 le
asigna otros trabajos. En Chile lo confirma una segunda fuente: una corrida de discovery de DataForSEO Labs (2026-09-11, USD 0,25)
devuelve `aso` con 390/mes repartido entre una marca de tobilleras, un fungicida y el examen médico, y 10/mes o
menos para cada término de la disciplina. México, Colombia y Perú siguen con una sola fuente: Efeonce no tiene
target SEO en esos mercados.

**Prioridad estimada P1** por la oportunidad de Berel y porque la fase B —URL `noindex` que se envía 1:1— sirve a
esa conversación. Ajustar si el owner prefiere esperar la aprobación de la extensión.

## Goal

- Diseñar y construir una landing que se reconozca de la familia de SEO y AEO y los conecte con la tienda.
- Responder mejor que el SERP en español qué es el ASO, en qué se parece al SEO y qué cambió con la IA.
- Mostrar el diferencial —la misma app contada igual en tres lugares— con una firma que no use datos inventados.
- Explicar la medición con las advertencias reales de cada consola.
- Convertir a diagnóstico (primario) y reunión (secundario) con los contratos gobernados existentes, sin PII en
  medición.
- Publicar por fases atadas al estado de la extensión y dejar la triple documentación y dos gates reutilizables.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-023-landing-aso-posicionamiento.md` — posicionamiento, fases y reglas duras.
- `docs/public-site/ASO_LANDING_SEO_AEO_BRIEF_V1.md` — contrato SEO/AEO con los datos de demanda y SERP.
- `docs/business-models/search-visibility-360/SEARCH_APP_VISIBILITY_EXTENSION_V1.md` — la oferta, sus líneas,
  claims no autorizados y decisiones abiertas D1–D6.
- `docs/public-site/decisions/PDR-001-seo-landing-complementaria-al-aeo.md` y
  `docs/public-site/decisions/PDR-002-arquitectura-informacion-seccion-visibilidad.md` — relación entre spokes,
  hub `/servicios/` y slugs por término.
- `.claude/skills/seo-aeo/modules/10_ASO_APP_DISCOVERY.md` y `.claude/skills/seo-aeo/SOURCES.md` §5 — oficio y
  hechos de plataforma verificados.
- `.claude/skills/seo-aeo-practice/modules/14_ASO_COMPLEMENTARIO.md` — reglas de venta y de prueba.
- `.claude/skills/efeonce-public-site-wordpress/references/landings/posicionamiento-seo.md` y `aeo.md` — contratos
  vivos de las hermanas (header, tracking de títulos, CTAs, forms, gates, backups).
- `docs/architecture/public-site/PRIMITIVES.md` y `docs/architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md`.
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` y
  `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`.
- `docs/ui/flows/EPIC-023-growth-cta-popup-UI-FLOW.md` — flujo maestro del que esta página es nodo.
- `docs/context/05_voz-tono-estilo.md` y `docs/context/09_marca-agencia.md`.

Reglas obligatorias:

- **NUNCA** prometer ranking en la tienda, más descargas, más estrellas ni instalaciones que vengan de la IA.
- **NUNCA** citar el "65–70% de las descargas viene de búsqueda" como dato actual ni "de 3 a 4 estrellas = +89%".
- **NUNCA** afirmar que Ask Play lee la web del cliente ni presentar como activas en LATAM funciones no verificadas.
- **NUNCA** usar badges de App Store o Google Play ni el logo de Apple como decoración, ni replicar sus interfaces.
- **NUNCA** publicar precios, ni "gratis", ni plazos de resultado mientras D2 esté abierta.
- **NUNCA** publicar en fase B o C sin el estado de la extensión que la fase exige, ni enlazar la página desde SEO,
  AEO, menú o hub antes de la fase C.
- **NUNCA** reconstruir Growth Forms, Growth CTA, Meetings, CRM ni tracking.
- **SIEMPRE** rotular como ilustrativo el ejemplo de la firma.
- **SIEMPRE** tocar las landings SEO y AEO con snapshot, sus gates y, en AEO, el hash de `heroans` sin cambios.
- **SIEMPRE** correr el gate de fidelidad y después el gate SEO tras cualquier guardado en Elementor.
- Tuteo neutro, sin voseo ni chilenismos: la página sirve a CL, MX, CO y PE.

## Normative Docs

- `docs/audits/commercial/ASO_SERVICE_MARKET_RESEARCH_2026-09-10.md` — mercado, riesgos y medición, con marcas de
  confianza.
- `docs/tasks/to-do/TASK-1859-landing-product-design-360.md` — precedente de publicación por fases.
- `docs/tasks/to-do/TASK-1860-landing-trade-marketing-btl.md` — precedente de módulos semánticos, gates y firma.
- `docs/tasks/complete/TASK-1343-servicios-posicionamiento-seo-landing.md` — hermana SEO y sus lecciones.
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`.
- `docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md` y `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`.

## Dependencies & Impact

### Depends on

- Extensión `SEARCH_APP_VISIBILITY_EXTENSION_V1` y el estado que autorice cada fase.
- PDR-023 y el brief SEO/AEO de esta task.
- Motor Growth Forms (lifecycle de definición/versión/publicación) y renderer `renderer-latest.js`.
- Growth CTA con `open_meeting_scheduler` y surface de Meetings `fhsf-efeonce-lead-gen-web` / `discovery`.
- Runtime `efeonce-public-site-runtime` con `eo-elementor-widgets` y los primitives `greenhouse_comparison_table`,
  `greenhouse_social_trust` y `greenhouse_growth_form`.
- Landings vivas SEO (`251078`) y AEO (`250265`) para la costura de fase C.

### Blocks / Impacts

- Conversación comercial de la app de Berel (fase B).
- `EPIC-019`: nueva hija. Flujo maestro de `EPIC-023`: nuevo nodo host.
- Landing SEO (`251078`, owner histórico `TASK-1343`) y landing AEO (`250265`): un cambio acotado cada una en fase C.
- Menú `Visibilidad` del sitio (ítems `251312` SEO y `250691` AEO) y hub `/servicios/` (`251077`).
- `TRACKING-PLAN.md`: nueva fila de formulario. `PRIMITIVES.md`: nueva fila `AsoLandingModules`.
- Follow-ups: spoke `en-US`, runtime `app_data` (D4), guía editorial en español.

### Files owned

- `docs/tasks/to-do/TASK-1862-landing-aso.md`
- `docs/ui/wireframes/TASK-1862-landing-aso.md`
- `docs/ui/flows/TASK-1862-landing-aso-flow.md`
- `docs/ui/motion/TASK-1862-landing-aso-motion.md`
- `docs/ui/visual-directions/TASK-1862-landing-aso-direction.md`
- `docs/ui/sources/TASK-1862/` (si el owner elige un source externo)
- `docs/ui/reviews/TASK-1862-landing-aso.scorecard.json`
- `docs/public-site/decisions/PDR-023-landing-aso-posicionamiento.md`
- `docs/public-site/ASO_LANDING_SEO_AEO_BRIEF_V1.md`
- `docs/architecture/public-site/ASO_ELEMENTOR_MODULES_V1.md` (nuevo, Slice 7)
- `docs/documentation/public-site/aso-landing.md` (nuevo, Slice 7)
- `docs/manual-de-uso/public-site/aso-landing.md` (nuevo, Slice 7)
- `scripts/frontend/scenarios/public-servicios-aso.scenario.ts` (nuevo)
- `scripts/public-website/verify-aso-landing-fidelity.*` y `verify-aso-seo-package.*` (nuevos) **[verificar]**
  carpeta y extensión contra los verificadores de influencers
- `scripts/growth/` — helper idempotente de publicación del brief (nuevo) **[verificar]** ruta del patrón
- `.claude/skills/efeonce-public-site-wordpress/references/landings/aso.md` y su espejo `.codex`; actualizaciones
  a `posicionamiento-seo.md` y `aeo.md` en fase C
- Runtime (repo hermano): `wp-content/plugins/eo-elementor-widgets/includes/aso/**`, `assets/css/aso.css`,
  `assets/js/aso.js` y las clases de los once widgets

## Current Repo State

### Already exists

- La oferta y su evidencia: extensión Search & App Visibility, módulo 10 de `seo-aeo`, módulo 14 de
  `seo-aeo-practice`, investigación de mercado ASO.
- Posicionamiento, SEO/AEO y contratos UI de esta task (los seis documentos de `Files owned` ya escritos).
- Hermanas vivas con contrato documentado: SEO `251078` (form `efeonce-seo-diagnostic`, anchor `#grader`,
  diseño de Claude Design) y AEO `250265` (form `efeonce-aeo-diagnostic`, anchor `#diagnostico`, `heroans`
  protegido, FAQ de 14 ítems con `schema3`).
- Menú `Visibilidad` con SEO (`251312`) y AEO (`250691`); hub `/servicios/` (`251077`).
- Primitives públicos reutilizables: `ComparisonTable`, `LogoMarquee`/`BrandProofAvatarGroup`,
  `GrowthFormEmbed`, `GrowthFormEditorialBriefHost`, `NativeMeetingSchedulerHost`.
- Patrón de módulos semánticos (`EO_Content_Marketing_Base`) y gates de referencia
  `public-website:verify-influencer-landing-fidelity` / `verify-influencer-seo-package`.
- Assets locales de marcas de motores que usa SEO: Google, GPT y Perplexity. No hay assets de tiendas, y no se
  crearán.

### Gap

- No existe página, formulario, CTA ni entrada de menú para ASO; SEO y AEO no mencionan apps.
- La extensión está en `Proposed`: sólo la fase A está autorizada.
- Demanda triangulada sólo en Chile (Semrush + DataForSEO Labs); México, Colombia y Perú tienen una sola
  fuente porque Efeonce no tiene target SEO en esos mercados.
- Sin confirmar: disponibilidad de Ask Play, Personalized Collections y App Store tags en CL/MX/CO/PE; guías de
  marca de Apple y Google; kind del form en el motor; binding y duración de la surface `discovery`; targeting de
  GVC al host público.
- Sin casos de ASO: la prueba disponible es de método.

## Modular Placement Contract

- Topology impact: `public`
- Current home: sitio público WordPress/Ohio en Kinsta; página Elementor nueva bajo `/servicios/`, módulos en
  `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets`.
- Future candidate home: `public`
- Boundary: WordPress posee la composición y consume los contratos gobernados de Growth Forms, Growth CTA y
  Meetings; la landing no reconstruye captura, destino, scheduler, CRM ni medición.
- Server/browser split: el navegador recibe sólo `form_key`, `surface_id`, `scheduler_key` y atributos
  allowlisted; destinos, mappings, secretos, disponibilidad y recibos viven server-side en Greenhouse.
- Build impact: `none` en Greenhouse; en el runtime público, once widgets page-scoped dentro del plugin existente,
  sin plugin ni dependencia nueva.
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: quien responde por la ficha y los releases de una app de marca (growth móvil, product marketing o
  UA); sponsor CMO o gerencia digital, a menudo el mismo del SEO.
- Momento del flujo: problem-aware; llega por un envío 1:1 (fase B), desde SEO o AEO, el menú o una cita en un
  asistente (fase C).
- Resultado perceptible esperado: en el first fold entiende que esto es ASO conectado a su SEO y AEO y ve un
  siguiente paso proporcional.
- Friccion que debe reducir: no saber qué mide cada consola; promesas de ranking o descargas; coordinar tres
  proveedores para una sola app.
- No-goals UX: guía editorial, precios, grader automático, desarrollo de apps, anuncios en tiendas, juegos.

### Surface & system decision

- Surface: landing pública WordPress/Ohio + Elementor en `/servicios/aso/` (working route).
- Nav placement: `none` — no agrega destino al portal Greenhouse. En el sitio público agrega un ítem en
  `Visibilidad` sólo en fase C, fuera del contrato de navegación del portal.
- Composition Shell: `no aplica` — el runtime es WordPress; la composición la dan los módulos Elementor.
- Primitive decision: `reuse` de `ComparisonTable`, `greenhouse_social_trust`, `GrowthFormEmbed`,
  `GrowthFormEditorialBriefHost` y `NativeMeetingSchedulerHost`; `new` para once módulos semánticos page-scoped.
- Adaptive density / The Seam: `no aplica` — componente del portal; los módulos declaran su responsive propio.
- Floating/Sidecar/Dialog decision: diálogo nativo del scheduler vía Growth CTA; paneles anclados en la firma; CTA
  fijo sólo móvil.
- Copy source: `local one-off` — copy ledger del wireframe, publicado en los settings de cada instancia Elementor.
- Access impact: `none`

### State inventory

- Default: página completa servida en HTML; form montado; CTA fijo móvil oculto en el hero.
- Loading: estado de carga del renderer; nunca un bloque vacío.
- Empty: submit vacío con resumen de errores enfocable y errores por campo; enlace de app inválido.
- Error: envío fallido con mensaje honesto y valores conservados.
- Degraded / partial: renderer no monta → reunión en el mismo bloque y `/contacto/`; surface de Meetings sin
  binding → CTA a `/contacto/`.
- Permission denied: correo no corporativo o verificación de abuso fallida, con alternativa de reunión.
- Long content: cinco líneas, tabla de cinco filas y nueve preguntas en HTML inicial; retículas que colapsan.
- Mobile / compact: una columna; tabla en modo card; tira de marcos contenida; FAQ y conversión estáticos.
- Keyboard / focus: puntos, FAQ, CTAs y campos operables; foco doble visible; CTA fijo oculto `inert`.
- Reduced motion: contenido y estados completos sin reveals, trazos ni scroll suave.

### Interaction contract

- Primary interaction: `Pide el diagnóstico de tu app` → `#diagnostico` con foco en el primer campo.
- Hover / focus / active: contrato de CTA de las hermanas (color, fondo, flecha, `translateY(-1px)`) y anillo doble.
- Pending / disabled: submit del renderer en estado pendiente; sin doble envío.
- Escape / click-away: Escape cierra el panel de un punto y el diálogo del scheduler.
- Focus restore: vuelve al CTA o botón que abrió el diálogo o el panel.
- Latency feedback: estado de carga del renderer y del scheduler; nunca un vacío.
- Toast / alert behavior: sin toasts; errores inline y success card gobernada.

### Motion & microinteractions

- Motion primitive: `CSS` + `IntersectionObserver` del sitio público (patrón `.rv` de la landing SEO).
- Enter / exit: reveals de sección de 400–520 ms; CTA fijo móvil de 220 ms.
- Layout morph: ninguno; la coreografía de la firma es sólo visual.
- Stagger: por grupo, máximo cinco elementos, 40–60 ms.
- Timing / easing token: tokens de motion del runtime público **[verificar]** nombres.
- Reduced-motion fallback: estado final completo desde el primer render.
- Non-goal motion: scroll pinning, animaciones ligadas al scroll, marquee, bucles, autoplay.

### Implementation mapping

- Route / surface: `/servicios/aso/`, hija de `/servicios/` (página `251077`).
- Primitive / variant / kind: once `semantic-widget` nuevos + cinco primitives reusados.
- Component candidates: `greenhouse_aso_{hero,definition,shift,surfaces,triptych,lines,measurement,boundaries,proof,faq,conversion}`.
- Copy source: copy ledger del wireframe, IDs `aso.landing.*`.
- Data reader / command: Growth Forms (definición/versión/publicación) y Growth CTA por sus commands gobernados.
- API parity: la landing es cliente de primitives existentes; no introduce acciones de negocio nuevas.
- Access / capability: sin cambios; los commands de autoría usan las capabilities existentes de Growth.
- States to implement: ready, loading, empty, invalid URL, partial, error, denied, success, meeting unavailable,
  meeting not promoted, no-js, reduced motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-aso.scenario.ts`
- Route: preview en fase A; `/servicios/aso/` `noindex` en fase B **[verificar]** targeting del host público.
- Viewports: 1536×911, 1440×1000, 890×911, 390×844.
- Quality profile: `premium`
- Required steps: first fold, cada región por marker, firma con punto abierto, tabla en desktop y modo card, FAQ
  abierto, submit vacío, enlace inválido, select abierto, CTA fijo móvil, scheduler abierto sin reservar o
  fallback, full page, comparación de first fold con SEO y AEO.
- Required captures: las del plan del wireframe.
- Required `data-capture` markers: `aso-hero` … `aso-mobile-cta`, trece en total.
- Assertions: un H1 con `ASO` y `app`; form montado con diez campos; enlaces a SEO y AEO en `aso-surfaces`; `<ol>`
  en la firma; cero badges de tienda; robots `noindex` en fase B.
- Scroll-width checks: `scrollWidth === clientWidth` en los cuatro viewports.
- Reduced-motion / focus evidence: ruta completa con reduced motion; probes de teclado del wireframe.
- Review dossier: `pnpm fe:capture:review public-servicios-aso`.
- Baseline decision / surface ID: `public-servicios-aso`, baseline en la primera captura aprobada.

### Design decision log

- Decision: dirección A "Una app, tres vitrinas"; página de expansión y citabilidad, no de captura; publicación por
  fases; diagnóstico como CTA primario sin "gratis"; módulos semánticos.
- Alternatives considered: tablero de ASO; teléfonos en vitrina; optimizar por `aso`; HTML compilado desde Claude
  Design como la landing SEO; publicar indexada al construir.
- Why this pattern: hace visible el diferencial (consistencia tienda/web/IA) sin datos inventados, se reconoce de
  la familia de SEO y AEO y respeta que la oferta está en `Proposed`.
- Reuse / extend / new primitive: reuse de cinco primitives; once módulos nuevos page-scoped; ningún primitive
  transversal nuevo.
- Open risks: dirección y copy sin aprobar; segunda fuente de demanda; disponibilidad de funciones de IA en el
  país; guías de marca de Apple y Google; D1/D2; binding del scheduler; GVC en host público.

### Visual verification

- GVC scenario: `public-servicios-aso`
- Viewports: 1536, 1440, 890, 390.
- Required captures: first fold por viewport, regiones, firma en dos estados, tabla, FAQ, form en estados,
  scheduler, comparación con hermanas.
- Required `data-capture` markers: los trece del wireframe.
- Scroll-width check: en los cuatro viewports y durante las animaciones.
- Accessibility/focus checks: teclado en puntos, FAQ, CTAs y campos; foco devuelto; CTA fijo `inert`.
- Before/after evidence: no aplica antes (superficie nueva); after con baseline aprobado. En fase C, before/after de
  las secciones tocadas en SEO y AEO.
- Known visual debt: ninguno declarado al crear la task.
- Visual scorecard: `docs/ui/reviews/TASK-1862-landing-aso.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Validación de demanda, slug, disponibilidad y marcas

- Chile ya está triangulado (brief §1b). Para México, Colombia y Perú, conseguir la segunda fuente —un target SEO
  de Efeonce por mercado para correr discovery, o Search Console— y registrar el readback
  en el brief.
- Confirmar o reemplazar `/servicios/aso/`, el title y la meta; fijar canonical sólo después.
- Verificar en un dispositivo de cada país (CL, MX, CO, PE) si Ask Play, las recomendaciones de Gemini, las
  Personalized Collections y las App Store tags están activas, y ajustar la nota de disponibilidad de R3.
- Revisar las guías de marca vigentes de Apple y Google para nombrar las tiendas sin badges ni logos.
- Pedir al owner D1 (nombre visible) y D2 (diagnóstico gratis o pagado) de la extensión.
- Confirmar binding y duración de la surface `discovery` y el kind del form en el enum del motor.
- Entregable: brief con readback, PDR-023 con validaciones 1 a 5 resueltas o declaradas.

### Slice 2 — Mensaje y copy ledger aprobado

- Elegir el H1 entre la hipótesis y su alternativa; afinar cápsulas, FAQ y copy de estados con `copywriting` y
  `greenhouse-ux-content-accessibility`.
- Retirar la FAQ 8 si D2 o la aprobación comercial no están resueltas.
- Revisión legal de claims, del dato de StatCounter y del uso de nombres de marcas de terceros.
- Entregable: copy ledger aprobado, sin hipótesis abiertas.

### Slice 3 — Dirección visual aprobada

- Presentar la dirección A con B y C rechazadas; aprobar, ajustar o reemplazar por un export versionado en
  `docs/ui/sources/TASK-1862/` y cambiar el modo a `source-led`.
- Medir en `251078` y `250265` las familias tipográficas, tamaños, tracking y gradientes para fijar la kinship.
- Producir la app ilustrativa y los tres marcos: curar primero las librerías propietarias; si se genera, declararlo.
- Completar el Visual Direction Contract y pasar `UI ready` a `yes` sólo con `pnpm task:lint --task TASK-1862` en
  cero hallazgos.
- Entregable: dirección aprobada, assets de la firma y `UI ready: yes`.

### Slice 4 — Formulario, CTA y tracking

- Publicar el Growth Form `efeonce-aso-diagnostic` por el lifecycle gobernado con el helper idempotente nuevo,
  surface `fhsf-efeonce-aso-diagnostic`, orígenes de producción con y sin www.
- Publicar el Growth CTA `aso-discovery-meeting` con `open_meeting_scheduler`, o dejar el fallback a `/contacto/`
  si la surface no está aprobada.
- Registrar la fila del formulario en `TRACKING-PLAN.md`.
- Entregable: form y CTA publicados, readback de sus contratos, fila de tracking.

### Slice 5 — Build de los módulos y la candidata (fase A)

- Implementar los once widgets `greenhouse_aso_*`, la base, los schemas, el CSS y el JS en `eo-elementor-widgets`,
  reutilizando los cinco primitives.
- Crear la página hija de `/servicios/` como borrador o privada con preview, sin menú.
- Implementar `includes/aso/seo.php` con `Service` y `FAQPage` sin duplicar Yoast; metadata, OG e imagen social.
- Crear los verificadores `public-website:verify-aso-landing-fidelity` y `public-website:verify-aso-seo-package` y
  el escenario GVC.
- Entregable: candidata en preview con ambos gates verdes.

### Slice 6 — QA y fase B

- Ejecutar GVC premium, scorecard y gates en los cuatro viewports, con reduced motion y teclado.
- **Sólo con la extensión en `Approved for validation`:** publicar `noindex, follow`, fuera de sitemap, menú y hub,
  sin enlaces entrantes desde SEO ni AEO; entregar la URL al owner de la cuenta Berel.
- Entregable: evidencia premium y, si aplica, URL `noindex` enviable.

### Slice 7 — Fase C, costura con las hermanas y documentación

- **Sólo con la extensión en `Commercially approved` y aprobación del owner:** `index, follow`, canonical, sitemap,
  ítem `ASO` en `Visibilidad` y enlace desde el hub.
- Agregar en la landing SEO una línea en el puente SEO→AEO hacia esta página, con snapshot y verificación de su
  contrato.
- Agregar en la landing AEO la pregunta 15 con enlace, sincronizada con `schema3`, con snapshot, `heroans` sin
  cambios y `public-website:verify-aeo-live-contract` + `verify-aeo-wordpress-guards` verdes.
- Registrar el primitive en `PRIMITIVES.md` y la landing reference en ambas skills; actualizar las refs de SEO y AEO.
- Triple documentación: contrato técnico de módulos, documento funcional y manual de uso.
- Entregable: página indexada, trío de Visibilidad enlazado y documentación completa.

## Out of Scope

- Guía editorial de ASO en Think.
- Landing en inglés para EE. UU. (`app store optimization`, 2.400/mes).
- Grader o diagnóstico automático de apps; runtime `app_data` de DataForSEO (decisión D4).
- Precios, bandas, gratuidad o simuladores.
- Casos de cliente, testimonios o cifras de resultado.
- Oferta de Apple Ads o Google App campaigns (Reach), producción creativa (Globe) o desarrollo de apps.
- Juegos.
- El 301 de `/aeo-2/` a `/servicios/aeo` (task aparte).
- Cambios al motor de Growth Forms, Growth CTA o Meetings; cualquier backend nuevo.
- Graduar los módulos o la firma a primitive transversal.

## Detailed Spec

### Estructura de la página

La especificación completa por región —layout desktop y mobile, contenido, IDs de copy, reglas y anchors— vive en
el [wireframe](../../ui/wireframes/TASK-1862-landing-aso.md). Resumen:

| # | Región | Widget |
|---|---|---|
| R1 | Hero | `greenhouse_aso_hero` |
| R2 | Definición + relación con el SEO | `greenhouse_aso_definition` |
| R3 | Qué cambió + disponibilidad + Android primero | `greenhouse_aso_shift` |
| R4 | Tres lugares (Google · asistentes · tienda) con enlaces a SEO y AEO | `greenhouse_aso_surfaces` |
| R5 | Firma: la misma app en tres lugares → lista priorizada | `greenhouse_aso_triptych` |
| R6 | Qué hacemos (cinco líneas) | `greenhouse_aso_lines` |
| R7 | Medición: App Store Connect vs Play Console + tres advertencias | `greenhouse_aso_measurement` + `greenhouse_comparison_table` (reuse) |
| R8 | Lo que no se promete + para quién no es | `greenhouse_aso_boundaries` |
| R9 | Qué recibes + marcas que confían en Efeonce | `greenhouse_aso_proof` + `greenhouse_social_trust` |
| R10 | FAQ (9) | `greenhouse_aso_faq` |
| R11 | Conversión: brief + reunión + divulgación + CTA fijo móvil | `greenhouse_aso_conversion` |

### Contrato del formulario

| Propiedad | Valor |
|---|---|
| Slug | `efeonce-aso-diagnostic` |
| Kind | **[verificar]** contra el enum del motor |
| Nombre | Diagnóstico de visibilidad de tu app |
| Surface | `fhsf-efeonce-aso-diagnostic` |
| Presentación | `diagnostic_premium`, host editorial premium |
| Campos | Nombre completo, correo de trabajo, empresa, enlace de la app, plataformas, qué necesitas (requeridos); mercado principal, acceso a las consolas, próxima versión y contexto (opcionales) |
| Seguridad | Consentimiento, Turnstile invisible, gate de correo corporativo |
| Retención | `730d` |
| Destino | `greenhouse_only` inicial; HubSpot con el gate vigente del sitio |

Las opciones exactas de cada select están en el wireframe, sección R11.

### Contrato del CTA de reunión

- Growth CTA `aso-discovery-meeting`, acción `open_meeting_scheduler`.
- Surface de Meetings `fhsf-efeonce-lead-gen-web`, scheduler `discovery`; sin binding, enlace a `/contacto/`.
- Sin enlaces, iframes ni copy del proveedor en el host.

### Contrato SEO/AEO

Completo en el [brief](../../public-site/ASO_LANDING_SEO_AEO_BRIEF_V1.md). Condiciones mínimas:

- H1 con `ASO` y `app`; title y meta que desambiguan con `apps`, `App Store` y `Google Play`.
- Contenido crítico, las cinco líneas y el FAQ en el HTML inicial.
- Cápsulas de 40–60 palabras bajo H2/H3 con preguntas reales.
- `Service` y `FAQPage` sólo sobre contenido visible; Yoast conserva sus entidades.
- Robots por fase: sin URL pública (A), `noindex, follow` (B), `index, follow` con canonical y sitemap (C).

### Medición

| Evento | Cuándo | Datos permitidos |
|---|---|---|
| `gh_cta_viewed` / `gh_cta_clicked` | CTA visible / activado | ID del CTA, surface, posición, destino por función |
| `gh_form_viewed` · `gh_form_started` | Form visible / primer input | `form_key`, `surface_id` |
| `gh_form_field_validation_failed` | Error de campo | Nombre del campo, sin valor |
| `gh_form_submitted` · `gh_form_submission_accepted` | Envío / aceptación | `form_key`, `surface_id` |
| `gh_form_success_viewed` | Success card | `form_key` |
| Evento server-confirmed del scheduler | Reserva confirmada | Surface del meeting |

Key event: `generate_lead` desde `gh_form_submission_accepted`. North Star: diagnósticos o reuniones calificados de
clientes y prospectos con app. Métrica de citabilidad (fase C): presencia en el panel de prompts del brief §7.
Nunca se envían al dataLayer nombre, correo, empresa, enlace de la app, contexto ni opciones del brief.

### Enlaces internos y menú

- Salida desde fase B: R4 → `/servicios/posicionamiento-seo/` y `/aeo-2/`; conversión → `/contacto/`.
- Entrada sólo en fase C: puente SEO→AEO de `251078`, FAQ 15 de `250265`, menú `Visibilidad` después de AEO y hub.

### Gates de verificación nuevos

- `public-website:verify-aso-landing-fidelity`: por viewport (1536, 1440, 890, 390 y reduced motion) valida
  separación bajo el masthead, un H1 con `ASO` y `app`, orden del first fold, un solo relleno por bloque, enlaces a
  SEO y AEO en R4, `<ol>` en la firma, rótulo ilustrativo, cero badges de tienda, las tres advertencias de R7, FAQ
  operable, form montado con diez campos, CTA de reunión nativo o fallback, CTA fijo `inert` cuando está oculto,
  consola sin errores propios y `scrollWidth === clientWidth`.
- `public-website:verify-aso-seo-package`: title, meta, canonical, robots por fase, OG/Twitter, imagen social,
  `Service` y `FAQPage` sin entidades duplicadas, sitemap y menú en fase C, HTML inicial.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. El copy y la dirección dependen de la validación de demanda, disponibilidad y marcas.
- Slice 4 puede correr en paralelo con Slice 3 una vez cerrado el Slice 2, porque el copy del form sale del ledger.
- Slice 5 exige Slices 3 y 4 cerrados: no se construye sin `UI ready: yes` ni sin form publicado.
- Slice 6 exige ambos gates verdes en la candidata. **La fase B exige además la extensión en `Approved for validation`.**
- Slice 7 exige la fase B estable y la extensión en `Commercially approved`. **La indexación, el menú y los cambios
  en SEO y AEO van últimos y juntos.**

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Publicar claims de una oferta en `Proposed` | Comercial / marca | medium | Fases gateadas por el estado de la extensión; Slices 6 y 7 con condición explícita | Página pública con la extensión en `Proposed` |
| Un claim prohibido se cuela (ranking, descargas, IA→instalaciones, cifras sin fuente) | Contenido / legal | medium | Revisión legal en Slice 2 y aserciones en el gate de fidelidad | Revisión del owner; gate en rojo |
| Uso indebido de marcas de Apple o Google | Legal / marca | medium | Nombres en texto, sin badges ni logo de Apple; revisión de guías en Slice 1 | Aserción de cero badges en el gate |
| Tráfico ajeno por `aso` (médico, marcas) | SEO | medium | Desambiguación en title, H1 y meta; éxito medido por conversión y citabilidad | Search Console: consultas médicas con impresiones |
| Romper el hero protegido de AEO al agregar la FAQ | Sitio público | low | Snapshot, `heroans` md5 antes y después, gates AEO | Hash distinto; `verify-aeo-live-contract` en rojo |
| Regresión en la landing SEO al agregar el enlace | Sitio público | low | Snapshot y verificación del contrato de `posicionamiento-seo.md` | Captura o Playwright en rojo |
| Página descubrible antes de tiempo | SEO / comercial | low | Sin enlaces entrantes ni sitemap en fase B | Página en índice con `noindex` ignorado o enlaces entrantes |
| El renderer del form no monta | Growth Forms | medium | Estado `partial` con reunión y contacto | Gate en rojo; `gh_form_viewed` en cero |
| Un guardado en Elementor borra metadata SEO | SEO | medium | Gate SEO después de cada guardado | Gate SEO en rojo |
| Cache de Kinsta sirve una versión vieja | Sitio público | medium | Purga tras cada despliegue y readback post-cache | Diferencia entre hash guardado y HTML servido |
| LCP móvil degradado por la ilustración | Performance | medium | Ilustración optimizada con dimensiones explícitas; sin video | LCP de laboratorio sobre el umbral |
| Funciones de IA descritas como activas donde no lo están | Contenido | medium | Verificación por país en Slice 1 y nota de disponibilidad | Revisión trimestral de la extensión (H4) |

### Feature flags / cutover

Sin flag de entorno: el cambio es aditivo y page-scoped. El cutover es por estado de la página en WordPress y por
estado de la extensión:

1. Fase A: borrador o privado con preview, fuera de menú y hub (Slice 5).
2. Fase B: `noindex, follow`, fuera de sitemap, menú y hub, sin enlaces entrantes (Slice 6).
3. Fase C: `index, follow`, canonical, sitemap, menú, hub y enlaces desde SEO y AEO (Slice 7).

El form y el CTA se publican como versiones nuevas del motor; su retiro es por deprecación de versión y pausa del
CTA. La reunión queda en fallback a `/contacto/` mientras la surface no esté enlazada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir los cambios documentales | minutos | sí |
| Slice 2 | Revertir el copy ledger | minutos | sí |
| Slice 3 | Volver a `UI ready: no` y a la dirección anterior | minutos | sí |
| Slice 4 | Deprecar la versión del form y pausar el CTA | <5 min | sí |
| Slice 5 | Restaurar el snapshot `_gh_backup_before_task1862_*` o eliminar el borrador; revertir el paquete del plugin con su backup | <15 min | sí |
| Slice 6 | Volver a borrador o privado y purgar cache | <10 min | parcial: quien recibió la URL la conserva |
| Slice 7 | Volver a `noindex`, quitar el ítem de menú y el enlace del hub con su snapshot, restaurar los snapshots de SEO y AEO, purgar cache | <20 min | parcial: la indexación ya ocurrida tarda en retirarse de los buscadores |

### Production verification sequence

1. Candidata en preview (fase A); gate de fidelidad en los cuatro viewports y reduced motion.
2. Gate SEO sobre la candidata con title y meta validados.
3. Readback del form y del CTA: form montado, scheduler abierto o fallback, sin crear lead ni reserva.
4. GVC premium, dossier y scorecard; aprobación del owner.
5. Con `Approved for validation`: fase B, purga, repetir ambos gates, confirmar `noindex` y cero enlaces entrantes.
6. Con `Commercially approved`: fase C; snapshot de SEO y AEO; cambios acotados; `heroans` sin cambios; gates de
   AEO, verificación de SEO y ambos gates de esta página; purga.
7. Monitorear durante 14 días: `gh_form_*`, rechazo del form, consultas en Search Console (incluidas las ajenas),
   LCP de campo y el panel de prompts.

### Out-of-band coordination required

- Owner de la extensión: estado del modelo de negocio para las fases B y C, y decisiones D1 y D2.
- Revisión legal de claims y de uso de marcas de Apple y Google.
- Decisión de crear targets SEO de Efeonce en México, Colombia y Perú (o acceso a Search Console) para la
  segunda fuente de esos mercados.
- Dispositivos o personas en CL, MX, CO y PE para verificar la disponibilidad de las funciones de IA de las tiendas.
- Acceso al checkout y al rail de despliegue gobernado de `efeonce-public-site-runtime`.
- Commercial: quién recibe los diagnósticos y reuniones, y el owner de la cuenta Berel para la fase B.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: flow` según el alcance real.
- [ ] `UI ready` permanece `no` hasta que el wireframe y el `## UI/UX Contract` tengan implementation mapping, GVC
      scenario plan y design decision log; si está en `yes`, pasa `pnpm task:lint --task TASK-1862`.
- [ ] El wireframe, el flow, el motion y la dirección visual declarados existen.
- [ ] La demanda está triangulada con una segunda fuente y el slug quedó validado antes del canonical.
- [ ] La disponibilidad de Ask Play, Gemini, Personalized Collections y App Store tags se verificó por país y R3 lo
      refleja.
- [ ] El H1 contiene `ASO` y `app` y existe un solo H1.
- [ ] Las dos cápsulas de R2 tienen entre 40 y 60 palabras y están bajo un H2/H3 con la pregunta literal.
- [ ] R4 enlaza a la landing SEO y a la landing AEO por función.
- [ ] Ninguna sección promete ranking, descargas, rating, instalaciones por IA, precios, gratuidad ni plazos.
- [ ] La página no usa badges de tiendas, logo de Apple ni réplicas de interfaces de terceros.
- [ ] La firma muestra el rótulo ilustrativo sin interacción y sus listas existen siempre en el DOM.
- [ ] R7 muestra las tres advertencias de medición.
- [ ] El form `efeonce-aso-diagnostic` está publicado con consentimiento, Turnstile, gate corporativo, validación de
      URL y retención `730d`.
- [ ] Los estados ready, loading, empty, invalid URL, partial, error, denied y success del form fueron verificados.
- [ ] El CTA `aso-discovery-meeting` abre el scheduler nativo o enlaza a `/contacto/`, sin enlaces del proveedor.
- [ ] La fila del form está en `TRACKING-PLAN.md` y ningún evento envía PII ni datos del brief.
- [ ] `Service` y `FAQPage` validan y sólo marcan contenido visible; no hay entidades de Yoast duplicadas.
- [ ] Ambos gates `public-website:verify-aso-*` pasan en vivo después del último guardado.
- [ ] GVC premium capturado y mirado en 1536, 1440, 890 y 390, más reduced motion y teclado.
- [ ] `scrollWidth === clientWidth` en los cuatro viewports.
- [ ] El scorecard visual cumple el umbral declarado.
- [ ] Ninguna fase se publicó sin el estado de la extensión que exige.
- [ ] En fase B, la página está en `noindex, follow` y ninguna página del sitio la enlaza.
- [ ] En fase C, la página está en `index, follow` con canonical, sitemap, menú y hub, y SEO y AEO la enlazan.
- [ ] En fase C, el hash de `heroans` de AEO no cambió y los gates de AEO y la verificación de SEO pasan.
- [ ] La triple documentación, la fila en `PRIMITIVES.md` y la landing reference en ambas skills existen.
- [ ] No se creó ningún lead ni ninguna reserva ficticia durante QA.

## Verification

- `pnpm task:lint --task TASK-1862`
- `pnpm ui:wireframe-check --task TASK-1862`
- `pnpm ui:flow-check --task TASK-1862`
- `pnpm ui:motion-check --task TASK-1862`
- `pnpm ui:readiness-check --task TASK-1862`
- `pnpm public-website:verify-aso-landing-fidelity`
- `pnpm public-website:verify-aso-seo-package`
- `pnpm public-website:verify-aeo-live-contract` y `pnpm public-website:verify-aeo-wordpress-guards` (fase C)
- `pnpm fe:capture public-servicios-aso` + `pnpm fe:capture:review public-servicios-aso`
- `pnpm docs:closure-check`
- Validador de schema y readback de URL renderizada, canonical, robots y sitemap en producción.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] PDR-023 pasó de `Draft for validation` al estado que corresponda y el roadmap del sitio quedó al día.
- [ ] La fila de esta task en `EPIC-019` y el nodo en el flujo maestro de `EPIC-023` reflejan el estado final.
- [ ] La extensión Search & App Visibility y el módulo 14 de `seo-aeo-practice` apuntan a la URL publicada.

## Follow-ups

- Spoke `en-US` para `app store optimization` (EE. UU. 2.400/mes) con localización real y `hreflang`.
- Runtime `app_data` de DataForSEO en Greenhouse y, sobre él, un diagnóstico automático de apps (decisión D4).
- Guía editorial en español sobre ASO en Think, sólo si el panel de prompts lo justifica.
- Primer caso ASO publicable (Berel) con autorización y evidencia de consolas.
- Registro periódico del panel de prompts de ASO en ChatGPT, Gemini y Perplexity.
- 301 de `/aeo-2/` a `/servicios/aeo` y actualización del enlace de R4.

## Open Questions

- ¿El owner aprueba la dirección A o prefiere un export en Claude Design, como la landing SEO?
- ¿El nombre visible del servicio es "ASO" o "Posicionamiento de apps" en menú y title (D1)?
- ¿El diagnóstico es gratis para clientes SV360, pagado siempre o se omite el tema (D2)?
- ¿La reunión usa la surface `discovery` existente o una propia?
- ¿Cómo apunta GVC al host público, dado que su resolver de entornos sólo conoce Greenhouse?
- ¿Quién de Commercial recibe los diagnósticos y reuniones de ASO?
