# TASK-1860 — Landing pública Trade Marketing & BTL (Channel & Commerce)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1860-landing-trade-marketing-btl.md`
- Flow: `docs/ui/flows/TASK-1860-landing-trade-marketing-btl-flow.md`
- Motion: `docs/ui/motion/TASK-1860-landing-trade-marketing-btl-motion.md`
- Visual direction: `docs/ui/visual-directions/TASK-1860-landing-trade-marketing-btl-direction.md`
- Form style: `docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|ui`
- Blocked by: `none`
- Promotion blocked by: `dirección visual aprobada; copy ledger aprobado; revisión legal de claims y tabla comparativa; Growth Form y Growth CTA publicados; slug validado con segunda fuente`
- Branch: `develop (Greenhouse) · efeonce-public-site-runtime según su contrato · sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir y publicar la landing pública de la línea **Channel & Commerce** en `efeoncepro.com`, bajo la working
route `/servicios/trade-marketing/`. La página convierte demanda de trade marketing y BTL en briefs y reuniones
calificadas, posicionando a Efeonce **en el medio** entre las plataformas que detectan y las agencias que
ejecutan: trade marketing que te dice qué corregir primero, lo corrige y lo demuestra, conectado con la inversión
digital de la marca. Reusa Growth Forms, Growth CTA y Meetings; no hay backend nuevo.

## Why This Task Exists

La línea se abrió el 2026-09-10 con ADR aceptado y 23 servicios canónicos, pero no tiene ninguna superficie
pública: hoy sólo existe en conversaciones salientes, el motor comercial con peor win rate histórico (2–3 %). El
[plan de prospección](../../business-models/channel-commerce/CHANNEL_COMMERCE_PROSPECTING_PLAN_V1.md) exige que
la primera conversación nunca sea la primera vez que el prospecto oye de Efeonce, y la ventana del presupuesto de
canal 2027 se cierra entre noviembre y diciembre. Sin landing, la Ola 1 de presencia no tiene destino.

La página además tiene que resolver un problema de búsqueda que las landings anteriores no tenían: la demanda está
en el término cabeza `trade marketing` (~880/mes en Chile) y su SERP es informativo y laboral, no comercial; el
modificador `agencia de trade marketing` casi no tiene volumen (~10/mes). El patrón de slug y de contenido de las
landings previas no sirve tal cual.

**Prioridad estimada P1** por la ventana comercial del Q4 y porque la línea no tiene otra superficie de entrada.
Ajustar si el owner decide otra secuencia.

## Goal

- Publicar una landing indexable que responda la intención definicional mejor que el SERP actual y la convierta en
  intención comercial en la misma página.
- Posicionar la línea en el medio, con una comparación por tipo de proveedor, sin nombrar competidores.
- Mostrar el mecanismo —estándar, cobertura, priorización, intervención, lectura— y el diferenciador digital con
  una sección firma que no use datos inventados.
- Presentar los 23 servicios agrupados como los compra el mercado, todos en el HTML inicial.
- Convertir a reunión (primario) y brief de canal (secundario) con los contratos gobernados existentes y medición
  sin PII.
- Dejar la triple documentación de la superficie y dos gates de verificación reutilizables.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CHANNEL_COMMERCE_LINE_DECISION_V1.md` — ADR de la línea: invariantes y lo que no autoriza.
- `docs/public-site/decisions/PDR-021-landing-trade-marketing-btl-posicionamiento.md` — posicionamiento de esta página.
- `docs/public-site/CHANNEL_COMMERCE_LANDING_SEO_AEO_BRIEF_V1.md` — contrato SEO/AEO con datos de demanda.
- `docs/services/channel-commerce/README.md` — catálogo canónico: nombres, alcance y exclusiones de los 23 servicios.
- `docs/audits/commercial/CHANNEL_COMMERCE_COMPETITIVE_BATTLECARDS_V1.md` — posición y reglas de conversación.
- `docs/architecture/public-site/PRIMITIVES.md` — primitives del sitio público a reusar.
- `docs/architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md` — patrón vigente de módulos semánticos.
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` — motor de formularios públicos.
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md` — scheduler nativo.
- `docs/ui/flows/EPIC-023-growth-cta-popup-UI-FLOW.md` — flujo maestro del que esta página es nodo.
- `docs/context/05_voz-tono-estilo.md` y `docs/context/09_marca-agencia.md` — voz y reglas de comunicación.

Reglas obligatorias:

- **NUNCA** prometer incremento de venta, sell-out, share o rotación.
- **NUNCA** nombrar competidores; la comparación es por tipo de proveedor con nota visible.
- **NUNCA** afirmar que el mercado no mide ni que un competidor no reporta.
- **NUNCA** mencionar en la página cómo Efeonce estructura su ejecución ni la existencia de proveedores.
- **NUNCA** publicar precios, bandas, cobertura nacional ni tiempos de respuesta.
- **NUNCA** renombrar un servicio del catálogo en la página.
- **NUNCA** reconstruir Growth Forms, Growth CTA, Meetings, CRM ni tracking.
- **SIEMPRE** rotular como ilustrativo todo ejemplo, ilustración o activo generado.
- **SIEMPRE** correr el gate de fidelidad y después el gate SEO tras cualquier guardado en Elementor.
- Tuteo neutro; nunca voseo.

## Normative Docs

- `docs/business-models/channel-commerce/CHANNEL_COMMERCE_PROSPECTING_PLAN_V1.md` — rol de la landing en la Ola 1.
- `docs/business-models/channel-commerce/CHANNEL_COMMERCE_BUSINESS_MODEL_V1.md` — claims prohibidos §4.
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md` y `TRACKING-PLAN.md`.
- `docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md` — anatomía del host del brief.
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` — Visual Direction Contract y readiness.
- `.claude/skills/efeonce-public-site-wordpress/references/landings/influencer-marketing.md` — precedente vivo.
- `docs/tasks/complete/TASK-1598-landing-influencer-marketing-creators-ugc.md` — precedente cerrado y sus
  lecciones de fidelidad, SEO y formulario.

## Dependencies & Impact

### Depends on

- ADR `EFEONCE_CHANNEL_COMMERCE_LINE_DECISION_V1` (`Accepted`) y catálogo `docs/services/channel-commerce/README.md`.
- PDR-021 y el brief SEO/AEO de esta task.
- Motor Growth Forms (lifecycle de definición/versión/publicación) y renderer `renderer-latest.js`.
- Growth CTA con acción `open_meeting_scheduler` y surface de Meetings `fhsf-efeonce-lead-gen-web` / `discovery`.
- Runtime `efeonce-public-site-runtime` con el plugin `eo-elementor-widgets` y los primitives
  `greenhouse_comparison_table`, `greenhouse_social_trust` y `greenhouse_growth_form`.
- Aprobación del owner de la línea sobre dirección visual y copy.

### Blocks / Impacts

- Ola 1 del plan de prospección de Channel & Commerce: sin landing, la presencia no tiene destino.
- `EPIC-019`: nueva hija en la tabla de child tasks.
- Flujo maestro de `EPIC-023`: nuevo nodo consumidor en la tabla de nodos.
- Menú `Soluciones → Crecimiento Multicanal` del sitio público.
- `TRACKING-PLAN.md`: nueva fila de formulario.
- `docs/architecture/public-site/PRIMITIVES.md`: nueva fila `ChannelCommerceLandingModules`.
- Follow-ups de satélites por sub-intención (promotoras, mystery shopper, material POP).

### Files owned

- `docs/tasks/to-do/TASK-1860-landing-trade-marketing-btl.md`
- `docs/ui/wireframes/TASK-1860-landing-trade-marketing-btl.md`
- `docs/ui/flows/TASK-1860-landing-trade-marketing-btl-flow.md`
- `docs/ui/motion/TASK-1860-landing-trade-marketing-btl-motion.md`
- `docs/ui/visual-directions/TASK-1860-landing-trade-marketing-btl-direction.md`
- `docs/ui/sources/TASK-1860/` (si el owner elige un source externo)
- `docs/ui/reviews/TASK-1860-landing-trade-marketing-btl.scorecard.json`
- `docs/public-site/decisions/PDR-021-landing-trade-marketing-btl-posicionamiento.md`
- `docs/public-site/CHANNEL_COMMERCE_LANDING_SEO_AEO_BRIEF_V1.md`
- `docs/architecture/public-site/CHANNEL_COMMERCE_ELEMENTOR_MODULES_V1.md` (nuevo, Slice 6)
- `docs/documentation/public-site/trade-marketing-landing.md` (nuevo, Slice 6)
- `docs/manual-de-uso/public-site/trade-marketing-landing.md` (nuevo, Slice 6)
- `scripts/frontend/scenarios/public-servicios-trade-marketing.scenario.ts` (nuevo)
- `scripts/public-website/verify-channel-commerce-landing-fidelity.*` y `verify-channel-commerce-seo-package.*`
  (nuevos) **[verificar]** carpeta y extensión contra los verificadores de influencers
- `scripts/growth/` — helper idempotente de publicación del brief (nuevo) **[verificar]** ruta del patrón
- `.claude/skills/efeonce-public-site-wordpress/references/landings/trade-marketing.md` y su espejo `.codex`
- Runtime (repo hermano): `wp-content/plugins/eo-elementor-widgets/includes/channel-commerce/**`,
  `assets/css/channel-commerce.css`, `assets/js/channel-commerce.js` y las clases de los doce widgets

## Current Repo State

### Already exists

- Línea, catálogo y ADR: `docs/services/channel-commerce/README.md`,
  `docs/architecture/EFEONCE_CHANNEL_COMMERCE_LINE_DECISION_V1.md`.
- Posicionamiento, SEO/AEO y contratos UI de esta task (los seis documentos de `Files owned` ya escritos).
- Primitives públicos reutilizables: `ComparisonTable`, `LogoMarquee`/`greenhouse_social_trust`,
  `GrowthFormEmbed`, `GrowthFormEditorialBriefHost`, `NativeMeetingSchedulerHost` (ver `PRIMITIVES.md`).
- Patrón de módulos semánticos: 13 widgets `greenhouse_content_*` con base `EO_Content_Marketing_Base`.
- Gates de referencia: `public-website:verify-influencer-landing-fidelity` y
  `public-website:verify-influencer-seo-package`.
- Surface de Meetings `fhsf-efeonce-lead-gen-web` / `discovery` en uso por influencers.
- Hub `/servicios/` (página `251077`) y grupo de menú `Crecimiento Multicanal`.

### Gap

- No existe página, formulario, CTA, surface ni entrada de menú para la línea.
- Dirección visual sin aprobar; copy sin validación de voz de cliente.
- Demanda con una sola fuente (Semrush): DataForSEO respondió `authorization_denied` durante el diseño.
- Sin confirmar: soporte de iconos por opción en el renderer; página pública de vacantes; duración real del meeting
  `discovery`; resolución de host público en GVC.
- Sin casos de la línea: la prueba disponible es de método.

## Modular Placement Contract

- Topology impact: `public`
- Current home: sitio público WordPress/Ohio en Kinsta; página Elementor nueva bajo `/servicios/`, módulos en
  `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets`.
- Future candidate home: `public`
- Boundary: WordPress posee la composición y consume los contratos gobernados de Growth Forms, Growth CTA y
  Meetings; la landing no reconstruye captura, destino, scheduler, CRM ni medición.
- Server/browser split: el navegador recibe sólo `form_key`, `surface_id`, `scheduler_key` y atributos
  allowlisted; destinos, mappings, secretos, disponibilidad y recibos viven server-side en Greenhouse.
- Build impact: `none` en Greenhouse; en el runtime público, doce widgets page-scoped nuevos dentro del plugin
  existente, sin plugin ni dependencia nueva.
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: Trade Marketing Manager, Category Manager o Jefe de Trade de una marca con distribución
  indirecta; economic buyer, el Gerente Comercial.
- Momento del flujo: solution-aware; llega por el término cabeza, un referral o un enlace de prospección.
- Resultado perceptible esperado: en el first fold entiende que esto es trade marketing que prioriza, ejecuta y
  demuestra, y ve un siguiente paso proporcional.
- Friccion que debe reducir: comparar a ciegas entre software y agencias; formularios largos; claims no
  verificables.
- No-goals UX: guía editorial, directorio de promotoras, precios, radiografía gratuita, formulario de procurement.

### Surface & system decision

- Surface: landing pública WordPress/Ohio + Elementor en `/servicios/trade-marketing/` (working route).
- Nav placement: `none` — no agrega destino al portal Greenhouse. En el sitio público agrega un ítem en
  `Soluciones → Crecimiento Multicanal`, fuera del contrato de navegación del portal.
- Composition Shell: `no aplica` — el runtime es WordPress; la composición la dan los módulos Elementor.
- Primitive decision: `reuse` de `ComparisonTable`, `greenhouse_social_trust`, `GrowthFormEmbed`,
  `GrowthFormEditorialBriefHost` y `NativeMeetingSchedulerHost`; `new` para doce módulos semánticos page-scoped.
- Adaptive density / The Seam: `no aplica` — componente del portal; los módulos declaran su responsive propio.
- Floating/Sidecar/Dialog decision: diálogo nativo del scheduler vía Growth CTA; paneles anclados en la firma;
  dock de conversión page-scoped.
- Copy source: `local one-off` — copy ledger del wireframe, publicado en los settings de cada instancia Elementor.
- Access impact: `none`

### State inventory

- Default: página completa servida en HTML; form montado; dock oculto en el hero.
- Loading: estado de carga del renderer del brief; nunca un bloque vacío.
- Empty: submit vacío con resumen de errores enfocable y errores por campo.
- Error: envío fallido con mensaje honesto y valores conservados.
- Degraded / partial: renderer no monta; reunión en el mismo bloque y enlace a `/contacto/`.
- Permission denied: correo no corporativo o verificación de abuso fallida, con alternativa de reunión.
- Long content: 23 servicios y 9 preguntas en HTML inicial; retículas que colapsan sin truncar.
- Mobile / compact: una columna; tabla de posición en modo card; conversión y FAQ estáticos.
- Keyboard / focus: puntos de lectura, FAQ, CTAs y campos operables; foco doble visible; dock oculto `inert`.
- Reduced motion: contenido y estados completos sin reveals, pulsos ni scroll suave.

### Interaction contract

- Primary interaction: `Agenda una reunión` abre el scheduler nativo.
- Hover / focus / active: micro-elevación de 1 px, sombra contenida y anillo de foco doble.
- Pending / disabled: submit del renderer en estado pendiente; sin doble envío.
- Escape / click-away: Escape cierra el panel de un punto de lectura y el diálogo del scheduler.
- Focus restore: vuelve al CTA o al botón que abrió el diálogo o el panel.
- Latency feedback: estado de carga del renderer y del scheduler; nunca un vacío.
- Toast / alert behavior: sin toasts; errores inline y success card gobernada.

### Motion & microinteractions

- Motion primitive: `CSS` + `IntersectionObserver` del sitio público.
- Enter / exit: reveals de sección de 400–520 ms; dock con 220 ms.
- Layout morph: ninguno; la transformación de la firma es sólo visual.
- Stagger: por grupo, máximo seis elementos, 40–60 ms.
- Timing / easing token: tokens de motion del runtime público **[verificar]** nombres.
- Reduced-motion fallback: estado final completo desde el primer render.
- Non-goal motion: scroll pinning, animaciones ligadas al scroll, bucles, autoplay.

### Implementation mapping

- Route / surface: `/servicios/trade-marketing/`, hija de `/servicios/` (página `251077`).
- Primitive / variant / kind: doce `semantic-widget` nuevos + cinco primitives reusados.
- Component candidates: `greenhouse_channel_{hero,definition,problem,cycle,xray,trade,btl,digital,operating,proof,faq,conversion}`.
- Copy source: copy ledger del wireframe, IDs `channelCommerce.landing.*`.
- Data reader / command: Growth Forms (definición/versión/publicación) y Growth CTA por sus commands gobernados.
- API parity: la landing es cliente de primitives existentes; no introduce acciones de negocio nuevas.
- Access / capability: sin cambios; los commands de autoría usan las capabilities existentes de Growth.
- States to implement: ready, loading, empty, partial, error, denied, success, meeting unavailable, no-js,
  reduced motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-trade-marketing.scenario.ts`
- Route: `/servicios/trade-marketing/` en `efeoncepro.com` **[verificar]** targeting del host público.
- Viewports: 1536×911, 1440×1000, 890×911, 390×844.
- Quality profile: `premium`
- Required steps: first fold, cada región por marker, firma con punto abierto, FAQ abierto, submit vacío,
  select abierto, dock, scheduler abierto sin reservar, full page.
- Required captures: las del plan del wireframe.
- Required `data-capture` markers: `channel-hero` … `channel-dock`, quince en total.
- Assertions: un H1; formulario montado; scheduler nativo; tres instancias del rol verde; `<ol>` en ciclo y firma.
- Scroll-width checks: `scrollWidth === clientWidth` en los cuatro viewports.
- Reduced-motion / focus evidence: ruta completa con reduced motion; probes de teclado del wireframe.
- Review dossier: `pnpm fe:capture:review public-servicios-trade-marketing`.
- Baseline decision / surface ID: `public-servicios-trade-marketing`, baseline en la primera captura aprobada.

### Design decision log

- Decision: dirección A "Góndola leída", posición en el medio, 23 servicios en siete grupos, módulos semánticos.
- Alternatives considered: tablero de canal; campo en movimiento; widgets HTML page-scoped; slug `agencia-de-…`.
- Why this pattern: representa la posición real sin datos inventados ni fotografía de terreno, y conserva la
  interactividad que el precedente de influencers perdió al compilar HTML.
- Reuse / extend / new primitive: reuse de cinco primitives; doce módulos nuevos page-scoped; ningún primitive
  transversal nuevo.
- Open risks: dirección y copy sin aprobar; segunda fuente de demanda; iconos por opción en el renderer; GVC en
  host público.

### Visual verification

- GVC scenario: `public-servicios-trade-marketing`
- Viewports: 1536, 1440, 890, 390.
- Required captures: first fold por viewport, regiones, firma en dos estados, FAQ, form en estados, scheduler.
- Required `data-capture` markers: los quince del wireframe.
- Scroll-width check: en los cuatro viewports y durante las animaciones.
- Accessibility/focus checks: teclado en puntos, FAQ, CTAs y campos; foco devuelto; dock `inert`.
- Before/after evidence: no aplica antes (superficie nueva); after con baseline aprobado.
- Known visual debt: ninguno declarado al crear la task.
- Visual scorecard: `docs/ui/reviews/TASK-1860-landing-trade-marketing-btl.scorecard.json`
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

### Slice 1 — Validación de demanda, slug y riesgos

- Triangular la demanda con una segunda fuente (DataForSEO con autorización, o Search Console del sitio) y
  registrar el readback en el brief SEO/AEO.
- Confirmar o reemplazar el slug `/servicios/trade-marketing/` y el title; fijar el canonical sólo después.
- Revisar canibalización con `/servicio-gestion-campanas-publicitarias/` por retail media.
- Confirmar si existe una página pública de vacantes para el desvío de empleo.
- Confirmar la duración real y la disponibilidad del scheduler `discovery`.
- Entregable: brief SEO/AEO con sección de readback y PDR-021 con validaciones 1 a 3 resueltas.

### Slice 2 — Mensaje y copy ledger aprobado

- Elegir el H1 entre la hipótesis y su alternativa; afinar cápsulas, FAQ y copy de estados con `copywriting` y
  `greenhouse-ux-content-accessibility`.
- Revisión legal de la tabla comparativa por tipo de proveedor y del dato laboral fechado.
- Entregable: copy ledger del wireframe marcado como aprobado, sin hipótesis abiertas.

### Slice 3 — Dirección visual aprobada

- Presentar la dirección A al owner con B y C como rechazadas; aprobar, ajustar o reemplazar por un export
  versionado en `docs/ui/sources/TASK-1860/` y cambiar el modo a `source-led`.
- Curar la ilustración de la góndola desde las librerías propietarias antes de generar; si se genera, declararlo.
- Completar el Visual Direction Contract y pasar `UI ready` a `yes` sólo con `pnpm task:lint --task TASK-1860` en
  cero hallazgos.
- Entregable: dirección aprobada, asset de la góndola y `UI ready: yes`.

### Slice 4 — Formulario, CTA y tracking

- Publicar el Growth Form `efeonce-channel-commerce-brief` por el lifecycle gobernado, con el helper idempotente
  nuevo, surface `fhsf-efeonce-channel-commerce`, orígenes de producción con y sin www.
- Publicar el Growth CTA `channel-commerce-discovery-meeting` con `open_meeting_scheduler`.
- Registrar la fila del formulario en `TRACKING-PLAN.md`.
- Entregable: form y CTA publicados, readback de sus contratos, fila de tracking.

### Slice 5 — Build de los módulos y la página candidata

- Implementar los doce widgets `greenhouse_channel_*`, la base, los schemas, el CSS y el JS en
  `eo-elementor-widgets`, reutilizando los cinco primitives.
- Crear la página hija de `/servicios/` como candidata `noindex`, sin menú.
- Implementar `includes/channel-commerce/seo.php` con `Service` y `FAQPage` sin duplicar Yoast; metadata, OG e
  imagen social 1200×630.
- Crear los verificadores `public-website:verify-channel-commerce-landing-fidelity` y
  `public-website:verify-channel-commerce-seo-package` y el escenario GVC.
- Entregable: candidata live `noindex` con ambos gates verdes.

### Slice 6 — QA, promoción y documentación

- Ejecutar GVC premium, el scorecard visual y los gates en vivo en los cuatro viewports y con reduced motion.
- Promover a `index, follow`, sitemap y canonical; agregar el ítem de menú y el enlace desde el hub.
- Registrar el primitive en `PRIMITIVES.md` y la landing reference en ambas skills.
- Triple documentación: contrato técnico de módulos, documento funcional y manual de uso.
- Entregable: página publicada e indexable con evidencia y documentación completa.

## Out of Scope

- Satélites por sub-intención (promotoras, mystery shopper, material POP, visual merchandising).
- Guía editorial de trade marketing en Think.
- Radiografía de Ejecución como lead magnet público.
- Casos de cliente, testimonios o cifras de resultado.
- Precios, bandas o simulador de cobertura.
- Cambios al motor de Growth Forms, Growth CTA o Meetings; cualquier backend nuevo.
- Versión para otros mercados distintos de Chile.
- Registro periódico de prompts AEO: es seguimiento posterior, no parte del lanzamiento.
- Graduar el dock de conversión o los módulos a primitive transversal.

## Detailed Spec

### Estructura de la página

La especificación completa por región —layout desktop y mobile, contenido, IDs de copy, reglas y anchors— vive en
el [wireframe](../../ui/wireframes/TASK-1860-landing-trade-marketing-btl.md) y no se duplica aquí. Resumen:

| # | Región | Widget |
|---|---|---|
| R1 | Hero | `greenhouse_channel_hero` |
| R2 | Definición + trade vs BTL + desvío de empleo | `greenhouse_channel_definition` |
| R3 | Problema: tres reportes que no se hablan + por qué ahora | `greenhouse_channel_problem` |
| R4 | Posición por tipo de proveedor | `greenhouse_comparison_table` (reuse) |
| R5 | Ciclo en cinco pasos | `greenhouse_channel_cycle` |
| R6 | Firma: góndola leída → lista priorizada | `greenhouse_channel_xray` |
| R7 | Trade marketing en cuatro grupos (T1–T13) | `greenhouse_channel_trade` |
| R8 | BTL en tres grupos (B1–B9) + X1 | `greenhouse_channel_btl` |
| R9 | Conexión digital | `greenhouse_channel_digital` |
| R10 | Un solo responsable + lo que no se promete | `greenhouse_channel_operating` |
| R11 | Qué recibes + marcas que confían en Efeonce | `greenhouse_channel_proof` + `greenhouse_social_trust` |
| R12 | FAQ (9) | `greenhouse_channel_faq` |
| R13 | Conversión: brief + reunión + divulgación + dock | `greenhouse_channel_conversion` |

### Contrato del formulario

| Propiedad | Valor |
|---|---|
| Slug | `efeonce-channel-commerce-brief` |
| Kind | `quote_request` |
| Nombre | Brief de Trade Marketing y BTL |
| Surface | `fhsf-efeonce-channel-commerce` |
| Presentación | `diagnostic_premium`, host editorial premium |
| Campos | Nombre, correo de trabajo, empresa, categoría, canal principal, qué necesitas resolver (requeridos); cobertura aproximada y contexto (opcionales) |
| Seguridad | Consentimiento, Turnstile invisible, gate de correo corporativo |
| Retención | `730d` |
| Destino | `greenhouse_only` inicial; HubSpot directo conserva el gate vigente del sitio |

Las opciones exactas de cada select están en el wireframe, sección R13.

### Contrato del CTA de reunión

- Growth CTA `channel-commerce-discovery-meeting`, acción `open_meeting_scheduler`.
- Surface de Meetings `fhsf-efeonce-lead-gen-web`, scheduler `discovery`.
- Sin enlaces, iframes ni copy del proveedor en el host.

### Contrato SEO/AEO de lanzamiento

Completo en el [brief](../../public-site/CHANNEL_COMMERCE_LANDING_SEO_AEO_BRIEF_V1.md). Condiciones mínimas:

- H1 con `trade marketing`; title y meta validados en el Slice 1.
- Contenido crítico, los 23 servicios y el FAQ en el HTML inicial.
- Cápsulas de 40–60 palabras bajo H2/H3 con preguntas reales.
- `Service` y `FAQPage` sólo sobre contenido visible; Yoast conserva sus entidades.
- `noindex` hasta el Slice 6; canonical autorreferente y sitemap con `lastmod` sólo al promover.

### Medición

| Evento | Cuándo | Datos permitidos |
|---|---|---|
| `gh_cta_viewed` / `gh_cta_clicked` | CTA visible / activado | ID del CTA, surface, posición en la página |
| `gh_form_viewed` · `gh_form_started` | Form visible / primer input | `form_key`, `surface_id` |
| `gh_form_field_validation_failed` | Error de campo | Nombre del campo, sin valor |
| `gh_form_submitted` · `gh_form_submission_accepted` | Envío / aceptación | `form_key`, `surface_id` |
| `gh_form_success_viewed` | Success card | `form_key` |
| Evento server-confirmed del scheduler | Reserva confirmada | Surface del meeting |

Key event: `generate_lead` desde `gh_form_submission_accepted`. North Star de la landing: briefs o reuniones
calificadas por visita. Nunca se envían al dataLayer nombre, correo, empresa, categoría con marca, cobertura ni
contexto.

### Enlaces internos y menú

- Entrada: hub `/servicios/` y menú `Soluciones → Crecimiento Multicanal`, después de Content Marketing.
- Salida: Performance (`/servicio-gestion-campanas-publicitarias/`), SEO (`/servicios/posicionamiento-seo/`),
  AEO (`/aeo-2/`), Agencia Creativa (`/agencia-creativa/`) y `/contacto/` como respaldo.

### Gates de verificación nuevos

- `public-website:verify-channel-commerce-landing-fidelity`: por viewport (1536, 1440, 890, 390 y reduced motion)
  valida separación bajo el masthead, un H1, orden del first fold, tres instancias del rol verde, tabla por tipo de
  proveedor sin nombres de empresa, `<ol>` en ciclo y firma, rótulo ilustrativo, 23 servicios en HTML, FAQ
  operable, form montado con ocho campos, CTA que abre el scheduler nativo, dock `inert` cuando está oculto,
  consola sin errores propios y `scrollWidth === clientWidth`.
- `public-website:verify-channel-commerce-seo-package`: title, meta, canonical, robots, OG/Twitter, imagen social,
  `Service` y `FAQPage` sin entidades duplicadas, sitemap, menú y HTML inicial.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. El copy y la dirección dependen de la demanda validada.
- Slice 4 puede correr en paralelo con Slice 3 una vez cerrado el Slice 2, porque el copy del form sale del ledger.
- Slice 5 exige Slices 3 y 4 cerrados: no se construye sin `UI ready: yes` ni sin form y CTA publicados.
- Slice 6 exige ambos gates verdes en la candidata `noindex`. **La promoción a índice y el menú van últimos.**

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un claim de resultado se cuela en el copy | Contenido / legal | medium | Revisión legal en Slice 2 y aserción en el gate de fidelidad | Revisión del owner; no hay signal automática |
| Pérdida de interactividad al compilar el diseño | UI | high | Módulos semánticos, no HTML page-scoped; gate que ejercita puntos, FAQ, form y scheduler | Gate de fidelidad en rojo |
| El renderer del form no monta | Growth Forms | medium | Estado `partial` con reunión y contacto; el gate exige campos montados | Gate en rojo; `gh_form_viewed` en cero |
| Un guardado en Elementor borra metadata SEO | SEO | medium | Gate SEO después de cada guardado | Gate SEO en rojo |
| Canibalización con Performance por retail media | SEO | medium | Rol distinto por enlace y revisión en Slice 1 | Search Console: ambas URLs para la misma consulta |
| Tráfico laboral llena el form de spam | Growth Forms | medium | Desvío de empleo, gate corporativo, Turnstile | Tasa de rechazo del form |
| La comparación se lee como ataque a una empresa | Legal / marca | low | Por tipo de proveedor, nota visible, revisión legal | Revisión del owner |
| La ilustración se interpreta como caso real | Marca | low | Rótulo visible y divulgación | Revisión del owner |
| Ruptura del menú del sitio | Sitio público | low | Snapshot previo del menú; ítem aislado | Readback del menú en el gate SEO |
| Cache de Kinsta sirve una versión vieja | Sitio público | medium | Purga tras cada despliegue y readback post-cache | Diferencia entre hash guardado y HTML servido |
| LCP móvil degradado por la ilustración | Performance | medium | Imagen optimizada con dimensiones explícitas; sin video | LCP de laboratorio sobre el umbral |

### Feature flags / cutover

Sin flag de entorno: el cambio es aditivo y page-scoped. El cutover es por estado de la página en WordPress:

1. Candidata `noindex`, fuera del menú y del hub (Slice 5).
2. Promoción: `index, follow`, canonical, sitemap, enlace desde el hub y menú (Slice 6).

El form y el CTA se publican como versiones nuevas del motor; su retiro es por deprecación de versión y pausa del
CTA, que el motor ya soporta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir los cambios documentales | minutos | sí |
| Slice 2 | Revertir el copy ledger | minutos | sí |
| Slice 3 | Volver a `UI ready: no` y a la dirección anterior | minutos | sí |
| Slice 4 | Deprecar la versión del form y pausar el CTA | <5 min | sí |
| Slice 5 | Restaurar el snapshot `_gh_backup_before_task1860_*` o despublicar la candidata; revertir el paquete del plugin con su backup | <15 min | sí |
| Slice 6 | Volver a `noindex`, quitar el ítem de menú con su snapshot y el enlace del hub; purgar cache | <15 min | parcial: la indexación ya ocurrida tarda en retirarse de los buscadores |

### Production verification sequence

1. Candidata `noindex` desplegada; purga de Kinsta; gate de fidelidad en los cuatro viewports y reduced motion.
2. Gate SEO sobre la candidata, con el título y la meta validados.
3. Readback del form y del CTA: form montado, scheduler abierto, sin crear lead ni reserva.
4. GVC premium, dossier y scorecard; aprobación del owner.
5. Promoción a índice, menú y hub; purga de cache.
6. Repetir ambos gates después de la promoción.
7. Monitorear durante 14 días: `gh_form_*`, rechazo del form, consultas en Search Console y LCP de campo.

### Out-of-band coordination required

- Aprobación del owner de la línea sobre dirección visual, copy y promoción.
- Revisión legal de la tabla comparativa y del dato laboral.
- Autorización de DataForSEO o acceso a Search Console para la segunda fuente.
- Acceso al checkout y al rail de despliegue gobernado de `efeonce-public-site-runtime`.
- Confirmación con Commercial de quién recibe los briefs y las reuniones de la línea.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: flow` según el alcance real.
- [ ] `UI ready` permanece `no` hasta que el wireframe y el `## UI/UX Contract` tengan implementation mapping, GVC
      scenario plan y design decision log; si está en `yes`, pasa `pnpm task:lint --task TASK-1860`.
- [ ] El wireframe, el flow, el motion y la dirección visual declarados existen.
- [ ] La demanda está triangulada con una segunda fuente y el slug quedó validado antes del canonical.
- [ ] El H1 contiene `trade marketing` y existe un solo H1.
- [ ] La cápsula de definición tiene entre 40 y 60 palabras y está bajo un H2 con la pregunta literal.
- [ ] Los 23 servicios aparecen con su nombre canónico en el HTML inicial.
- [ ] La tabla de posición no nombra ninguna empresa y muestra la nota por tipo de proveedor.
- [ ] Ninguna sección promete venta, sell-out, share, rotación, precios, cobertura nacional ni plazos.
- [ ] La página no menciona proveedores ni cómo Efeonce estructura su ejecución.
- [ ] La firma muestra el rótulo ilustrativo sin interacción y sus listas existen siempre en el DOM.
- [ ] El rol verde aparece exactamente en los tres CTAs de reunión.
- [ ] El form `efeonce-channel-commerce-brief` está publicado con consentimiento, Turnstile, gate corporativo y
      retención `730d`.
- [ ] Los estados ready, loading, empty, partial, error, denied y success del form fueron verificados.
- [ ] El CTA `channel-commerce-discovery-meeting` abre el scheduler nativo y no hay enlaces del proveedor.
- [ ] La fila del form está en `TRACKING-PLAN.md` y ningún evento envía PII ni datos comerciales del brief.
- [ ] `Service` y `FAQPage` validan y sólo marcan contenido visible; no hay entidades de Yoast duplicadas.
- [ ] Ambos gates `public-website:verify-channel-commerce-*` pasan en vivo después del último guardado.
- [ ] GVC premium capturado y mirado en 1536, 1440, 890 y 390, más reduced motion y teclado.
- [ ] `scrollWidth === clientWidth` en los cuatro viewports.
- [ ] El scorecard visual cumple el umbral declarado.
- [ ] La página está en `index, follow` con canonical, sitemap, enlace desde el hub e ítem de menú.
- [ ] La triple documentación, la fila en `PRIMITIVES.md` y la landing reference en ambas skills existen.
- [ ] No se creó ningún lead ni ninguna reserva ficticia durante QA.
- [ ] El copy publicado respeta la regla terminológica del wireframe: tienda, góndola, sala y punto de venta nombran cada uno su cosa, y corregir es el verbo único.
- [ ] Las celdas de la tabla de posición y el dato laboral fechado pasaron revisión legal.

## Verification

- `pnpm task:lint --task TASK-1860`
- `pnpm ui:wireframe-check --task TASK-1860`
- `pnpm ui:flow-check --task TASK-1860`
- `pnpm ui:motion-check --task TASK-1860`
- `pnpm ui:readiness-check --task TASK-1860`
- `pnpm public-website:verify-channel-commerce-landing-fidelity`
- `pnpm public-website:verify-channel-commerce-seo-package`
- `pnpm fe:capture public-servicios-trade-marketing` + `pnpm fe:capture:review public-servicios-trade-marketing`
- `pnpm docs:closure-check`
- Validador de schema y readback de URL renderizada, canonical, robots y sitemap en producción.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] PDR-021 pasó de `Draft for validation` al estado que corresponda y el roadmap del sitio quedó al día.
- [ ] La fila de esta task en `EPIC-019` y el nodo en el flujo maestro de `EPIC-023` reflejan el estado final.
- [ ] El plan de prospección de Channel & Commerce apunta a la URL publicada.

## Follow-ups

- Satélite `agencia de promotoras` (320/mes en Chile) con B2 como servicio foco, si la landing muestra demanda.
- Satélite `mystery shopper` (390/mes, el CPC más alto del set), validando su ajuste con T3.
- Satélites de `material pop` y `visual merchandising` (720/mes cada uno) hacia B3 y X1.
- Guía editorial de trade marketing en Think para la intención definicional.
- Primer caso publicable de la línea, con autorización y evidencia.
- Registro periódico de prompts AEO y exactitud de la descripción de Efeonce en motores de respuesta.

## Delta 2026-09-10

- Revisión de copy con `copywriting` y `greenhouse-ux-writing`: 17 hallazgos aplicados al copy ledger del
  wireframe, entre ellos vocabulario del operador chileno (terreno, reporte mensual, ejecución) tomado de avisos
  de empleo como proxy de VoC, claims de mercado sin prueba reescritos, celdas de la tabla de posición agregadas para
  revisión legal, copy faltante del formulario y de los 22 servicios, cero em-dash en strings y una FAQ nueva.
  Detalle en la sección `Copy Review 2026-09-10` del wireframe. Sigue siendo hipótesis hasta el Slice 2.
- Corrección del owner sobre esa revisión: en Chile `tienda` y `góndola` son de uso común; la regla quedó por cosa
  nombrada —tienda el local, góndola el mueble, sala la jerga del trade, punto de venta la unidad— y no por término
  único.

## Delta 2026-09-11

- La página de Performance que esta task enlaza desde su conexión digital (`/servicio-gestion-campanas-publicitarias/`,
  página `242862`) será reemplazada por `/servicios/performance-marketing/` con un 301, en el Slice 6 de
  [TASK-1865](TASK-1865-landing-performance-marketing.md). El 301 mantiene el enlace funcionando, pero al construir el
  enlace `digital.items.retailMedia.link` conviene apuntar a la URL nueva (anchor `#canales`) si `TASK-1865` ya promovió,
  para no depender de la redirección. Si ambas tasks construyen su módulo base a la vez, coordinar en Discovery para no
  duplicarlo.

## Open Questions

- ¿El owner aprueba la dirección A o prefiere producir un export en Claude Design y pasar a `source-led`?
- ¿Apruebas el H1 recomendado, "Trade marketing que te dice qué corregir primero. Y lo corrige."? La alternativa pasó a ser el título de la sección de problema.
- ¿Existe una página pública de vacantes para el desvío de empleo?
- ¿El renderer admite iconos por opción como metadata o se limitan a los labels?
- ¿Cómo apunta GVC al host público, dado que su resolver de entornos sólo conoce Greenhouse?
- ¿Quién de Commercial recibe los briefs y las reuniones de la línea?
