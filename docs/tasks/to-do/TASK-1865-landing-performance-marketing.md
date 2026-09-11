# TASK-1865 — Landing pública Performance Marketing (Performance & Commerce Distribution)

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
- Wireframe: `docs/ui/wireframes/TASK-1865-landing-performance-marketing.md`
- Flow: `docs/ui/flows/TASK-1865-landing-performance-marketing-flow.md`
- Motion: `docs/ui/motion/TASK-1865-landing-performance-marketing-motion.md`
- Visual direction: `docs/ui/visual-directions/TASK-1865-landing-performance-marketing-direction.md`
- Form style: `docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|ui`
- Blocked by: `none`
- Promotion blocked by: `dirección visual aprobada; copy ledger aprobado; revisión legal de la tabla de posición y de los hechos de 2026; Growth Form y Growth CTA publicados; slug y migración de la URL legacy validados`
- Branch: `develop (Greenhouse) · efeonce-public-site-runtime según su contrato · sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir y publicar la landing pública de Performance & Commerce Distribution en `efeoncepro.com`, bajo la working route
`/servicios/performance-marketing/`, y retirar con 301 la página legacy `242862` (`/servicio-gestion-campanas-publicitarias/`).
La página vende el diferenciador real —la pauta aprende de ventas y oportunidades, no de clics— con una firma interactiva
sin cifras inventadas, las dos formas de trabajar (consumo y B2B), la cobertura de canales y una escalera de entrada.
Reusa Growth Forms, Growth CTA y el scheduler nativo; no hay backend nuevo.

## Why This Task Exists

La oferta de performance tiene desde el 2026-09-10 decisión, ficha y pricing propios, pero su superficie pública es una
página de 2023 que contradice esa decisión:

- **muestra contadores en cero en producción** ("0 campañas implementadas", "0 %", "< 0" de tiempo de respuesta);
- **afirma "Somos Google Partners y Meta Business Partners"**, cuando el Partnership Registry dice que el estado de Google
  Partners no está verificado y que con Meta no hay nada iniciado;
- vende "gestión de campañas" por plataforma, con capturas de dashboards, justo el comparison set que la decisión de oferta
  ordena evitar;
- no rankea ninguna keyword del cluster en Chile, México ni Colombia, aunque "agencia (de) performance marketing" tiene
  480–590 búsquedas al mes en Chile con dificultad baja.

Además, tres cambios de 2026 —la atribución de Meta, el retiro de las campañas dinámicas de búsqueda de Google y la
vigencia de la Ley 21.719— dan una razón concreta para que un anunciante revise su pauta este semestre. Sin una página
nueva, esa ventana no tiene destino.

**Prioridad estimada P1** por el riesgo de los claims en vivo y la ventana del segundo semestre. Ajustar si el owner decide
otra secuencia.

## Goal

- Contener en la legacy, antes de cualquier diseño, los contadores en cero y el claim de partners no verificado.
- Publicar una landing indexable que responda la intención definicional y la convierta en intención comercial.
- Hacer visible el mecanismo con una firma interactiva honesta, sin cifras, logos ni badges no verificados.
- Presentar las dos formas de trabajar, los cinco frentes, ocho canales con su estado y la escalera de entrada.
- Convertir a reunión (primario) y diagnóstico (secundario) con los contratos gobernados existentes y medición sin PII.
- Migrar la URL legacy con un 301 limpio, el menú reapuntado y los enlaces internos actualizados.
- Dejar la triple documentación y tres gates de verificación reutilizables.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1.md` — decisión de oferta: invariantes de
  claims, cuentas del cliente, canales como cobertura y lo que no autoriza.
- `docs/services/media-distribution/PERFORMANCE_COMMERCE_DISTRIBUTION_SERVICE_V1.md` — ficha: catálogo, motions, módulos,
  cobertura de canales y escalera.
- `docs/public-site/decisions/PDR-022-landing-performance-marketing-posicionamiento.md` — posicionamiento de esta página.
- `docs/public-site/PERFORMANCE_LANDING_SEO_AEO_BRIEF_V1.md` — contrato SEO/AEO y migración de la URL legacy.
- `docs/architecture/public-site/PRIMITIVES.md` — primitives del sitio público a reusar.
- `docs/architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md` — patrón vigente de módulos semánticos.
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` — motor de formularios públicos.
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md` — scheduler nativo.
- `docs/ui/flows/EPIC-023-growth-cta-popup-UI-FLOW.md` — flujo maestro del que esta página es nodo.
- `docs/context/05_voz-tono-estilo.md` y `docs/context/09_marca-agencia.md` — voz y reglas de comunicación.

Reglas obligatorias:

- **NUNCA** prometer ROAS, CAC, retorno, leads, pipeline ni ventas.
- **NUNCA** publicar un número sin fuente y fecha visibles; ningún contador animado.
- **NUNCA** afirmar un partnership o badge que el Partnership Registry no tenga verificado; no nombrar al partner
  programático mientras no haya acuerdo firmado.
- **NUNCA** mostrar logos de plataformas como prueba ni vender una plataforma como producto.
- **NUNCA** nombrar competidores; la comparación es por tipo de proveedor con nota visible.
- **NUNCA** publicar precios, bandas ni porcentajes del pricing pack.
- **NUNCA** usar un testimonio o caso sin autorización escrita y fuente del dato.
- **NUNCA** reconstruir Growth Forms, Growth CTA, Meetings, CRM ni tracking.
- **NUNCA** reescribir la opción completa de redirects de Yoast; sólo crear y retirar los objetos de esta task.
- **SIEMPRE** rotular como ilustrativo todo ejemplo o diagrama.
- **SIEMPRE** correr el gate de fidelidad y después el gate SEO tras cualquier guardado en Elementor.
- Tuteo neutro; nunca voseo.

## Normative Docs

- `docs/business-models/media-distribution/PERFORMANCE_COMMERCE_PRICING_INTEGRITY_PACK_V1.md` — umbrales de nivel que
  usan los rangos de inversión del formulario; nada de este pack se publica.
- `docs/audits/commercial/PERFORMANCE_MEDIA_CHANNELS_PARTNERS_PRICING_RESEARCH_2026-09-10.md` — demanda, plataformas,
  ChatGPT Ads, Ley 21.719 y competidores.
- `docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md` — estado de Google Ads, Meta y el partner programático.
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md` y `TRACKING-PLAN.md`.
- `docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md` — anatomía del host del brief.
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` — Visual Direction Contract y readiness.
- `.claude/skills/efeonce-public-site-wordpress/references/landing-workflow.md` — loop estándar de landings.
- `.claude/skills/efeonce-public-site-wordpress/references/taxonomy-permalink-migrations.md` — rail de redirects de Yoast
  SEO Premium.
- `.claude/skills/efeonce-public-site-wordpress/references/landings/influencer-marketing.md` — precedente vivo.
- `docs/tasks/to-do/TASK-1860-landing-trade-marketing-btl.md` — landing hermana en diseño, con el mismo patrón.

## Dependencies & Impact

### Depends on

- Decisión de oferta y ficha de Performance & Commerce (`Proposed`), PDR-022 y el brief SEO/AEO de esta task.
- Motor Growth Forms (lifecycle de definición/versión/publicación) y renderer `renderer-latest.js`.
- Growth CTA con acción `open_meeting_scheduler` y surface de Meetings `fhsf-efeonce-lead-gen-web` / `discovery`.
- Runtime `efeonce-public-site-runtime` con el plugin `eo-elementor-widgets` y los primitives
  `greenhouse_comparison_table`, `greenhouse_social_trust` y `greenhouse_growth_form`.
- Yoast SEO Premium como dueño de los redirects del sitio.
- Aprobación del owner de Media & Distribution sobre contención, dirección visual, copy y promoción.

### Blocks / Impacts

- Página legacy `242862`: contención en el Slice 0 y 301 en el Slice 6.
- Menú primario: el ítem `Performance Marketing` pasa a apuntar a la página nueva.
- `TASK-1860`: su enlace de conexión digital a Performance cambia de URL (Delta registrado).
- `EPIC-019`: nueva hija en la tabla de child tasks.
- Flujo maestro de `EPIC-023`: nuevo nodo consumidor en la tabla de nodos.
- `TRACKING-PLAN.md`: nueva fila de formulario.
- `docs/architecture/public-site/PRIMITIVES.md`: nueva fila `PerformanceLandingModules`.
- Ficha de servicio: nueva columna de nombres públicos en español (Slice 2).

### Files owned

- `docs/tasks/to-do/TASK-1865-landing-performance-marketing.md`
- `docs/ui/wireframes/TASK-1865-landing-performance-marketing.md`
- `docs/ui/flows/TASK-1865-landing-performance-marketing-flow.md`
- `docs/ui/motion/TASK-1865-landing-performance-marketing-motion.md`
- `docs/ui/visual-directions/TASK-1865-landing-performance-marketing-direction.md`
- `docs/ui/sources/TASK-1865/` (si el owner elige un source externo)
- `docs/ui/reviews/TASK-1865-landing-performance-marketing.scorecard.json`
- `docs/public-site/decisions/PDR-022-landing-performance-marketing-posicionamiento.md`
- `docs/public-site/PERFORMANCE_LANDING_SEO_AEO_BRIEF_V1.md`
- `docs/architecture/public-site/PERFORMANCE_ELEMENTOR_MODULES_V1.md` (nuevo, Slice 6)
- `docs/documentation/public-site/performance-marketing-landing.md` (nuevo, Slice 6)
- `docs/manual-de-uso/public-site/performance-marketing-landing.md` (nuevo, Slice 6)
- `scripts/frontend/scenarios/public-servicios-performance-marketing.scenario.ts` (nuevo)
- `scripts/public-website/verify-performance-landing-fidelity.ts`, `verify-performance-seo-package.ts` y
  `verify-performance-legacy-redirect.ts` (nuevos)
- `scripts/growth/` — helper idempotente de publicación del brief (nuevo) **[verificar]** ruta del patrón
- `.claude/skills/efeonce-public-site-wordpress/references/landings/performance-marketing.md` y su espejo `.codex`
- Runtime (repo hermano): `wp-content/plugins/eo-elementor-widgets/includes/performance/**`,
  `assets/css/performance.css`, `assets/js/performance.js` y las clases de los trece widgets

## Current Repo State

### Already exists

- Oferta: `docs/architecture/EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1.md`,
  `docs/services/media-distribution/PERFORMANCE_COMMERCE_DISTRIBUTION_SERVICE_V1.md` y el pricing pack.
- Posicionamiento, SEO/AEO y contratos UI de esta task (los seis documentos de `Files owned` ya escritos).
- Página legacy `242862` `publish`, indexable, en el menú como `Performance Marketing`, compuesta con widgets Ohio
  (`ohio_heading`, `ohio_icon_box`, `ohio_service_table`, 141 KB) según
  `docs/documentation/public-site/wordpress-ohio-elementor-widget-inventory.md`.
- Primitives públicos reutilizables: `ComparisonTable`, `LogoMarquee`/`greenhouse_social_trust`, `GrowthFormEmbed`,
  `GrowthFormEditorialBriefHost`, `NativeMeetingSchedulerHost` (ver `PRIMITIVES.md`).
- Patrón de módulos semánticos: widgets `greenhouse_content_*` con base `EO_Content_Marketing_Base`.
- Gates de referencia: `public-website:verify-influencer-landing-fidelity` y `public-website:verify-influencer-seo-package`.
- Surface de Meetings `fhsf-efeonce-lead-gen-web` / `discovery` en uso por influencers.
- Hub `/servicios/` y menú primario `61` con el grupo `Soluciones`.

### Gap

- No existe la página nueva, el formulario, el CTA ni la surface de la línea.
- La legacy muestra contadores en cero y un claim de partners no verificado **en producción**.
- Dirección visual sin aprobar; copy sin validación de voz de cliente; casos sin autorización.
- Demanda con una sola fuente (Semrush); backlinks y tráfico de la legacy sin medir.
- Sin confirmar: ID del ítem de menú y su grupo; selección múltiple, campos condicionales e iconos por opción en el
  renderer; duración del meeting `discovery`; resolución del host público en GVC; estado real en Google Partners.

## Modular Placement Contract

- Topology impact: `public`
- Current home: sitio público WordPress/Ohio en Kinsta; página Elementor nueva bajo `/servicios/`, módulos en
  `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets`.
- Future candidate home: `public`
- Boundary: WordPress posee la composición y consume los contratos gobernados de Growth Forms, Growth CTA y Meetings; la
  landing no reconstruye captura, destino, scheduler, CRM ni medición.
- Server/browser split: el navegador recibe sólo `form_key`, `surface_id`, `scheduler_key` y atributos allowlisted;
  destinos, mappings, secretos, disponibilidad y recibos viven server-side en Greenhouse.
- Build impact: `none` en Greenhouse; en el runtime público, trece widgets page-scoped nuevos dentro del plugin existente,
  sin plugin ni dependencia nueva.
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: Performance Lead, E-commerce Manager o Head of Growth (consumo); Demand Gen Manager o Marketing Ops
  (B2B); economic buyer, el CMO.
- Momento del flujo: solution-aware; llega por "agencia de performance marketing", el menú, otra landing de Efeonce, la
  URL legacy o una campaña propia.
- Resultado perceptible esperado: en el first fold entiende que la diferencia es qué aprende la pauta y ve un siguiente
  paso proporcional.
- Friccion que debe reducir: agencias que dicen lo mismo; promesas de ROAS; dudas sobre de quién son las cuentas;
  formularios que piden datos sin explicar para qué.
- No-goals UX: guía editorial, precios, calculadora de ROAS, auditoría automática gratuita, directorio de plataformas.

### Surface & system decision

- Surface: landing pública WordPress/Ohio + Elementor en `/servicios/performance-marketing/` (working route).
- Nav placement: `none` — no agrega destino al portal Greenhouse. En el sitio público reapunta el ítem existente
  `Performance Marketing`, fuera del contrato de navegación del portal.
- Composition Shell: `no aplica` — el runtime es WordPress; la composición la dan los módulos Elementor.
- Primitive decision: `reuse` de `ComparisonTable`, `greenhouse_social_trust`, `GrowthFormEmbed`,
  `GrowthFormEditorialBriefHost` y `NativeMeetingSchedulerHost`; `new` para trece módulos semánticos page-scoped.
- Adaptive density / The Seam: `no aplica` — componente del portal; los módulos declaran su responsive propio.
- Floating/Sidecar/Dialog decision: diálogo nativo del scheduler vía Growth CTA; dock de conversión page-scoped; sin
  modales propios.
- Copy source: `local one-off` — copy ledger del wireframe, publicado en los settings de cada instancia Elementor.
- Access impact: `none`

### State inventory

- Default: página completa servida en HTML; firma en estado `Clics`; form montado; dock oculto en el hero.
- Loading: estado de carga del renderer del brief; nunca un bloque vacío.
- Empty: submit vacío con resumen de errores enfocable y errores por campo.
- Error: envío fallido con mensaje honesto y valores conservados.
- Degraded / partial: renderer no monta; reunión en el mismo bloque y enlace a `/contacto/`.
- Permission denied: correo no corporativo o verificación de abuso fallida, con alternativa de reunión.
- Long content: doce preguntas, ocho canales y cinco frentes en HTML inicial; retículas que colapsan sin truncar.
- Mobile / compact: una columna; circuito vertical; tabla de posición en modo card; conversión y FAQ estáticos.
- Keyboard / focus: control de la firma como radiogroup con flechas; FAQ, CTAs y campos operables; foco doble visible;
  dock oculto `inert`.
- Reduced motion: contenido y estados completos sin reveals, recorrido de la señal, trazos ni reordenamiento animado.

### Interaction contract

- Primary interaction: `Agenda una reunión` abre el scheduler nativo.
- Hover / focus / active: micro-elevación de 1 px, sombra contenida y anillo de foco doble; chips con fondo tonal.
- Pending / disabled: submit del renderer en estado pendiente; sin doble envío.
- Escape / click-away: Escape cierra el diálogo del scheduler; la firma no abre capas.
- Focus restore: vuelve al CTA que abrió el diálogo; en la firma el foco se queda en el control.
- Latency feedback: estado de carga del renderer y del scheduler; nunca un vacío.
- Toast / alert behavior: sin toasts; errores inline, success card gobernada y región live de la firma.

### Motion & microinteractions

- Motion primitive: `CSS` + `IntersectionObserver` del sitio público + FLIP con Web Animations API en la firma.
- Enter / exit: reveals de sección de 400–520 ms; dock con 220 ms; recorrido de la señal de 1.200 ms una vez.
- Layout morph: reordenamiento FLIP de la lista de la firma (360–420 ms), interrumpible.
- Stagger: por grupo, máximo seis elementos, 40–60 ms.
- Timing / easing token: tokens de motion del runtime público **[verificar]** nombres.
- Reduced-motion fallback: estado final completo desde el primer render y cambios de la firma instantáneos.
- Non-goal motion: scroll pinning, animaciones ligadas al scroll, bucles, autoplay, contadores animados.

### Implementation mapping

- Route / surface: `/servicios/performance-marketing/`, hija de `/servicios/`; legacy `242862` con 301 en el Slice 6.
- Primitive / variant / kind: trece `semantic-widget` nuevos + cinco primitives reusados.
- Component candidates: `greenhouse_performance_{hero,definition,problem,whynow,signal,motions,modules,channels,ladder,operating,proof,faq,conversion}`.
- Copy source: copy ledger del wireframe, IDs `performance.landing.*`.
- Data reader / command: Growth Forms (definición/versión/publicación) y Growth CTA por sus commands gobernados; redirect
  por la API de Yoast SEO Premium.
- API parity: la landing es cliente de primitives existentes; no introduce acciones de negocio nuevas.
- Access / capability: sin cambios; los commands de autoría usan las capabilities existentes de Growth.
- States to implement: ready, loading, empty, partial, error, denied, success, meeting unavailable, signal no-js, no-js,
  reduced motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-performance-marketing.scenario.ts`
- Route: `/servicios/performance-marketing/` en `efeoncepro.com` **[verificar]** targeting del host público.
- Viewports: 1536×911, 1440×1000, 890×911, 390×844.
- Quality profile: `premium`
- Required steps: first fold, cada región por marker, firma en `Clics` y en `Ventas`, FAQ abierto, submit vacío, select
  abierto, dock, scheduler abierto sin reservar, full page, URL legacy seguida hasta la nueva.
- Required captures: las del plan del wireframe.
- Required `data-capture` markers: `performance-hero` … `performance-dock`, dieciséis en total.
- Assertions: un H1; formulario montado con diez campos; scheduler nativo; tres instancias del rol verde; `<ol>` en firma
  y escalera; el primer ítem de la firma cambia; ningún número sin fuente; ningún logo de plataforma; 301 de la legacy.
- Scroll-width checks: `scrollWidth === clientWidth` en los cuatro viewports.
- Reduced-motion / focus evidence: ruta completa con reduced motion; probes de teclado del wireframe.
- Review dossier: `pnpm fe:capture:review public-servicios-performance-marketing`.
- Baseline decision / surface ID: `public-servicios-performance-marketing`, baseline en la primera captura aprobada.

### Design decision log

- Decision: dirección A "La señal", firma interactiva `Clics / Ventas`, página nueva con 301 desde la legacy, módulos
  semánticos.
- Alternatives considered: tablero de resultados; muro de plataformas; reconstruir sobre la URL legacy; widgets HTML
  page-scoped.
- Why this pattern: muestra el diferenciador sin cifras inventadas, logos ni badges no verificados, y rompe con el
  lenguaje de la legacy y de la competencia local.
- Reuse / extend / new primitive: reuse de cinco primitives; trece módulos nuevos page-scoped; ningún primitive
  transversal nuevo.
- Open risks: dirección y copy sin aprobar; segunda fuente de demanda; equidad de la legacy; soporte del renderer para
  selección múltiple, campos condicionales e iconos por opción; GVC en host público; base compartida con `TASK-1860`.

### Visual verification

- GVC scenario: `public-servicios-performance-marketing`
- Viewports: 1536, 1440, 890, 390.
- Required captures: first fold por viewport, regiones, firma en dos estados, canales, FAQ, form en estados, scheduler,
  legacy redirigida.
- Required `data-capture` markers: los dieciséis del wireframe.
- Scroll-width check: en los cuatro viewports y durante las animaciones.
- Accessibility/focus checks: teclado en la firma, FAQ, CTAs y campos; foco devuelto; dock `inert`; región live.
- Before/after evidence: before = legacy `242862` capturada antes del Slice 0 y después de la contención; after con
  baseline aprobado.
- Known visual debt: ninguno declarado al crear la task.
- Visual scorecard: `docs/ui/reviews/TASK-1865-landing-performance-marketing.scorecard.json`
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

### Slice 0 — Contención de la página legacy

- Snapshot de `_elementor_data`, `_elementor_page_settings` y metas de la página `242862` como
  `_gh_backup_before_task1865_containment_<timestamp>`.
- Con aprobación del owner, retirar la sección de contadores ("Liderando el Performance Marketing") y reemplazar el claim
  "Somos Google Partners y Meta Business Partners" y sus logos por un texto sin claim de partnership, o retirarlo, hasta que
  el Partnership Registry verifique cada estado.
- Purgar la cache de Kinsta y capturar la legacy antes y después.
- Entregable: legacy sin contadores en cero ni claims no verificados, con snapshot y evidencia.

### Slice 1 — Validación de demanda, URL y dependencias

- Triangular la demanda con una segunda fuente (Keyword Planner o Search Console) y registrar el readback en el brief
  SEO/AEO.
- Medir backlinks y tráfico orgánico de la legacy; confirmar o revertir la decisión de página nueva con 301.
- Inventariar los enlaces internos a la legacy (contenido, menús, widgets) y confirmar el ID y el grupo del ítem de menú.
- Revisar canibalización con `/servicios/redes-sociales/`, `/servicios/agencia-de-influencers/` y la landing de Trade
  Marketing.
- Verificar el estado real en Google Partners y registrar el resultado en el Partnership Registry.
- Confirmar en el renderer: selección múltiple, campos condicionales e iconos por opción; y la duración del meeting
  `discovery`.
- Entregable: brief SEO/AEO con readback, decisión de URL cerrada y PDR-022 con sus validaciones resueltas.

### Slice 2 — Mensaje y copy ledger aprobado

- Elegir el H1; afinar cápsulas, FAQ, estados y la firma con `copywriting` y `greenhouse-ux-content-accessibility`.
- Verificar cada hecho de R4 contra su documento primario (Meta, Google, Diario Oficial) y actualizar fuentes.
- Revisión legal de la tabla de posición y de las cápsulas de ChatGPT Ads y de la Ley 21.719.
- Resolver el slot de caso: autorización escrita y fuente del dato, o el slot no se publica.
- Registrar en la ficha de servicio la columna de nombres públicos en español.
- Entregable: copy ledger del wireframe marcado como aprobado, sin hipótesis abiertas.

### Slice 3 — Dirección visual aprobada

- Presentar la dirección A al owner con B y C como rechazadas; aprobar, ajustar o reemplazar por un export versionado en
  `docs/ui/sources/TASK-1865/` y cambiar el modo a `source-led`.
- Diseñar el circuito de la señal y la firma en alta fidelidad sobre los tokens existentes.
- Completar el Visual Direction Contract y pasar `UI ready` a `yes` sólo con `pnpm task:lint --task TASK-1865` en cero
  hallazgos.
- Entregable: dirección aprobada y `UI ready: yes`.

### Slice 4 — Formulario, CTA y tracking

- Publicar el Growth Form `efeonce-performance-brief` por el lifecycle gobernado, con el helper idempotente nuevo, surface
  `fhsf-efeonce-performance`, orígenes de producción con y sin www.
- Publicar el Growth CTA `performance-discovery-meeting` con `open_meeting_scheduler`.
- Registrar la fila del formulario en `TRACKING-PLAN.md`.
- Confirmar con Commercial quién recibe los briefs y las reuniones.
- Entregable: form y CTA publicados, readback de sus contratos, fila de tracking.

### Slice 5 — Build de los módulos y la página candidata

- Implementar los trece widgets `greenhouse_performance_*`, la base, los schemas, el CSS y el JS en `eo-elementor-widgets`,
  reutilizando los cinco primitives.
- Crear la página hija de `/servicios/` como candidata `noindex`, sin menú.
- Implementar `includes/performance/seo.php` con `Service` y `FAQPage` sin duplicar Yoast; metadata, OG e imagen social
  1200×630.
- Crear los tres verificadores y el escenario GVC.
- Entregable: candidata live `noindex` con los gates de fidelidad y SEO verdes.

### Slice 6 — QA, promoción, migración y documentación

- Ejecutar GVC premium, el scorecard visual y los gates en vivo en los cuatro viewports y con reduced motion.
- En una misma ventana: promover a `index, follow`, sitemap y canonical; crear el 301 legacy → nueva; reapuntar el ítem de
  menú; actualizar los enlaces internos del inventario; pasar la legacy a `private`; purgar cache.
- Correr `public-website:verify-performance-legacy-redirect` y los otros dos gates después de la migración.
- Registrar el primitive en `PRIMITIVES.md`, la landing en el registry de la skill y la landing reference en ambas skills.
- Triple documentación: contrato técnico de módulos, documento funcional y manual de uso.
- Entregable: página publicada e indexable, legacy redirigida, evidencia y documentación completa.

## Out of Scope

- Precios, bandas o calculadoras.
- Guía editorial de performance marketing en Think.
- Spoke propia de "agencia de marketing b2b" o spokes por canal.
- Casos de cliente sin autorización.
- Cambios al motor de Growth Forms, Growth CTA o Meetings; cualquier backend nuevo.
- Versión en inglés o por mercado distinto de la versión en español de LATAM.
- Nombrar o enlazar al partner programático.
- Registro periódico de prompts AEO: es seguimiento posterior, no parte del lanzamiento.
- Graduar el dock, la firma o los módulos a primitive transversal.

## Detailed Spec

### Estructura de la página

La especificación completa por región —layout desktop y mobile, contenido, IDs de copy, reglas y anchors— vive en el
[wireframe](../../ui/wireframes/TASK-1865-landing-performance-marketing.md) y no se duplica aquí. Resumen:

| # | Región | Widget |
|---|---|---|
| R1 | Hero con circuito de la señal | `greenhouse_performance_hero` |
| R2 | Definición: dos cápsulas | `greenhouse_performance_definition` |
| R3 | Problema: atribución, señal, creatividad | `greenhouse_performance_problem` |
| R4 | Qué cambió en 2026 | `greenhouse_performance_whynow` |
| R5 | Firma: cambia la señal | `greenhouse_performance_signal` |
| R6 | Dos formas de trabajar | `greenhouse_performance_motions` |
| R7 | Cinco frentes | `greenhouse_performance_modules` |
| R8 | Ocho canales con estado | `greenhouse_performance_channels` |
| R9 | Cómo empezamos | `greenhouse_performance_ladder` |
| R10 | Posición por tipo de proveedor | `greenhouse_comparison_table` (reuse) |
| R11 | Reglas del juego + lo que no se promete | `greenhouse_performance_operating` |
| R12 | Qué recibes + marcas | `greenhouse_performance_proof` + `greenhouse_social_trust` |
| R13 | FAQ (12) | `greenhouse_performance_faq` |
| R14 | Conversión: brief + reunión + divulgación + dock | `greenhouse_performance_conversion` |

### Contrato del formulario

| Propiedad | Valor |
|---|---|
| Slug | `efeonce-performance-brief` |
| Kind | `quote_request` |
| Nombre | Brief de Performance Marketing |
| Surface | `fhsf-efeonce-performance` |
| Presentación | `diagnostic_premium`, host editorial premium |
| Campos | Nombre, correo de trabajo, empresa, a quién le vendes, dónde inviertes hoy, inversión mensual en medios, mercados y qué necesitas resolver (requeridos); CRM y contexto (opcionales) |
| Seguridad | Consentimiento, Turnstile invisible, gate de correo corporativo |
| Retención | `730d` |
| Destino | `greenhouse_only` inicial; HubSpot directo conserva el gate vigente del sitio |

Las opciones exactas de cada select están en el wireframe, sección R14. Los rangos de inversión coinciden con los
umbrales de nivel del pricing pack.

### Contrato del CTA de reunión

- Growth CTA `performance-discovery-meeting`, acción `open_meeting_scheduler`.
- Surface de Meetings `fhsf-efeonce-lead-gen-web`, scheduler `discovery`.
- Sin enlaces, iframes ni copy del proveedor en el host.

### Contrato SEO/AEO de lanzamiento

Completo en el [brief](../../public-site/PERFORMANCE_LANDING_SEO_AEO_BRIEF_V1.md). Condiciones mínimas:

- H1 con `performance marketing`; title con `agencia de performance marketing`; meta validada en el Slice 1.
- Contenido crítico, los ocho canales y el FAQ en el HTML inicial.
- Cápsulas de 40–60 palabras bajo H2 o `<summary>` con preguntas reales.
- `Service` y `FAQPage` sólo sobre contenido visible; Yoast conserva sus entidades.
- `noindex` hasta el Slice 6; canonical autorreferente y sitemap con `lastmod` sólo al promover.

### Migración de la URL legacy

| Paso | Detalle |
|---|---|
| Snapshot | `_elementor_data`, `_elementor_page_settings`, metas y estado de `242862`; snapshot del ítem de menú |
| Redirect | 301 `/servicio-gestion-campanas-publicitarias/` → `/servicios/performance-marketing/` por la API de Yoast SEO Premium; verificar colisiones con y sin barra final |
| Menú | Reapuntar el ítem `Performance Marketing` (`object_id`) a la página nueva |
| Enlaces internos | Actualizar cada enlace del inventario del Slice 1 |
| Legacy | Estado `private`; fuera del sitemap; sin borrar |
| Verificación | `public-website:verify-performance-legacy-redirect`: 301 con `Location` correcto, menú apuntando a la nueva, cero enlaces internos a la legacy, legacy fuera del sitemap |

### Medición

| Evento | Cuándo | Datos permitidos |
|---|---|---|
| `gh_cta_viewed` / `gh_cta_clicked` | CTA visible / activado | ID del CTA, surface, posición en la página |
| `gh_form_viewed` · `gh_form_started` | Form visible / primer input | `form_key`, `surface_id` |
| `gh_form_field_validation_failed` | Error de campo | Nombre del campo, sin valor |
| `gh_form_submitted` · `gh_form_submission_accepted` | Envío / aceptación | `form_key`, `surface_id` |
| `gh_form_success_viewed` | Success card | `form_key` |
| Evento server-confirmed del scheduler | Reserva confirmada | Surface del meeting |

Key event: `generate_lead` desde `gh_form_submission_accepted`. North Star de la landing: briefs o reuniones calificadas
por visita. Nunca se envían al dataLayer nombre, correo, empresa, tipo de negocio, canal, rango de inversión, mercados,
CRM ni contexto. El control de la firma no emite eventos en V1.

### Enlaces internos y menú

- Entrada: hub `/servicios/`, ítem de menú `Performance Marketing` reapuntado, 301 de la legacy, Trade Marketing
  (`#digital`), Influencer Marketing, SEO, AEO y HubSpot.
- Salida: SEO (`/servicios/posicionamiento-seo/`), AEO (`/aeo-2/`), Influencer Marketing
  (`/servicios/agencia-de-influencers/`), HubSpot (`/servicios-contratar-hubspot/`) y `/contacto/` como respaldo.

### Gates de verificación nuevos

- `public-website:verify-performance-landing-fidelity`: por viewport (1536, 1440, 890, 390 y reduced motion) valida
  separación bajo el masthead, un H1, orden del first fold, tres instancias del rol verde, firma que cambia de primer ítem,
  `<ol>` en firma y escalera, rótulo ilustrativo, ausencia de números sin fuente y de logos de plataformas, ocho canales con
  chip, doce preguntas operables, form montado con diez campos, CTA que abre el scheduler nativo, dock `inert` cuando está
  oculto, consola sin errores propios y `scrollWidth === clientWidth`.
- `public-website:verify-performance-seo-package`: title, meta, canonical, robots, OG/Twitter, imagen social, `Service` y
  `FAQPage` sin entidades duplicadas, sitemap, menú y HTML inicial.
- `public-website:verify-performance-legacy-redirect`: los cuatro puntos de la migración.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 va primero y no depende del diseño: corrige claims en vivo.
- Slice 1 → Slice 2 → Slice 3. El copy y la dirección dependen de la demanda y la URL validadas.
- Slice 4 puede correr en paralelo con Slice 3 una vez cerrado el Slice 2, porque el copy del form sale del ledger.
- Slice 5 exige Slices 3 y 4 cerrados: no se construye sin `UI ready: yes` ni sin form y CTA publicados.
- Slice 6 exige los gates de fidelidad y SEO verdes en la candidata `noindex`. **La promoción, el 301 y el menú van
  juntos y al final.**

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La legacy sigue mostrando claims no verificados mientras se diseña | Contenido / legal | high | Slice 0 antes de cualquier diseño | Captura de la legacy tras el Slice 0 |
| Un claim de resultado o de partner se cuela en el copy | Contenido / legal | medium | Revisión legal en Slice 2 y aserciones del gate de fidelidad | Revisión del owner; gate de fidelidad |
| Un hecho de 2026 queda desactualizado | Contenido | medium | Fecha visible y revisión trimestral; retiro del bloque | Revisión trimestral registrada en el manual |
| La disponibilidad de ChatGPT Ads cambia | Contenido | high | Fecha visible en canales y FAQ; revisión mensual contra el centro de ayuda de OpenAI | Revisión mensual registrada en el manual |
| Pérdida de interactividad al compilar el diseño | UI | high | Módulos semánticos; gate que ejercita firma, FAQ, form y scheduler | Gate de fidelidad en rojo |
| El renderer del form no monta | Growth Forms | medium | Estado `partial` con reunión y contacto; el gate exige campos montados | Gate en rojo; `gh_form_viewed` en cero |
| Un guardado en Elementor borra metadata SEO | SEO | medium | Gate SEO después de cada guardado | Gate SEO en rojo |
| Colisión o bucle en el redirect | SEO / sitio público | low | Verificación de colisiones antes de crear; sólo objetos de esta task | Gate de redirect en rojo |
| Pérdida de equidad de la legacy | SEO | low | Medición en Slice 1 y 301 permanente | Search Console: impresiones de la URL nueva vs la legacy |
| Canibalización con Redes Sociales o Influencer Marketing | SEO | medium | Rol distinto por enlace y revisión en Slice 1 | Search Console: dos URLs para la misma consulta |
| El rango de inversión se filtra al dataLayer | Analítica / privacidad | low | Allowlist de atributos; revisión del Tracking Plan | Auditoría `growth:forms-tracking-audit` |
| Tráfico de empleo por "paid media" llena el form de spam | Growth Forms | medium | "paid media" fuera del slug y del H1; gate corporativo; Turnstile | Tasa de rechazo del form |
| Ruptura del menú del sitio | Sitio público | low | Snapshot previo del menú; se reapunta un ítem existente | Readback del menú en el gate SEO |
| Cache de Kinsta sirve una versión vieja | Sitio público | medium | Purga tras cada despliegue y readback post-cache | Diferencia entre hash guardado y HTML servido |
| LCP móvil degradado por el circuito | Performance | low | SVG inline sin raster; animación fuera de la ruta del LCP | LCP de laboratorio sobre el umbral |
| Módulo base duplicado con `TASK-1860` | Runtime público | medium | Coordinar en Discovery; la primera en construir documenta su base | Revisión de código del plugin |

### Feature flags / cutover

Sin flag de entorno: el cambio es aditivo y page-scoped. El cutover es por estado de la página en WordPress:

1. Legacy contenida (Slice 0).
2. Candidata `noindex`, fuera del menú y del hub (Slice 5).
3. Promoción en una sola ventana: `index, follow`, canonical, sitemap, 301 de la legacy, menú reapuntado, enlaces internos
   actualizados y legacy `private` (Slice 6).

El form y el CTA se publican como versiones nuevas del motor; su retiro es por deprecación de versión y pausa del CTA, que
el motor ya soporta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Restaurar el snapshot `_gh_backup_before_task1865_containment_*` | <10 min | sí (no se debería restaurar un claim no verificado) |
| Slice 1 | Revertir los cambios documentales | minutos | sí |
| Slice 2 | Revertir el copy ledger | minutos | sí |
| Slice 3 | Volver a `UI ready: no` y a la dirección anterior | minutos | sí |
| Slice 4 | Deprecar la versión del form y pausar el CTA | <5 min | sí |
| Slice 5 | Despublicar la candidata; revertir el paquete del plugin con su backup | <15 min | sí |
| Slice 6 | Retirar sólo el objeto de redirect creado; restaurar el `object_id` del ítem de menú y los enlaces con sus snapshots; publicar la legacy desde `private`; volver la nueva a `noindex`; purgar cache | <20 min | parcial: la indexación ya ocurrida tarda en retirarse de los buscadores |

### Production verification sequence

1. Legacy contenida y capturada; purga de Kinsta.
2. Candidata `noindex` desplegada; purga; gate de fidelidad en los cuatro viewports y reduced motion.
3. Gate SEO sobre la candidata, con el título y la meta validados.
4. Readback del form y del CTA: form montado, scheduler abierto, sin crear lead ni reserva.
5. GVC premium, dossier y scorecard; aprobación del owner.
6. Ventana de promoción: índice, 301, menú, enlaces, legacy `private`; purga de cache.
7. Gates de fidelidad, SEO y redirect después de la migración.
8. Monitorear durante 14 días: `gh_form_*`, rechazo del form, consultas y URLs en Search Console y LCP de campo.

### Out-of-band coordination required

- Aprobación del owner de Media & Distribution sobre la contención, la dirección visual, el copy y la promoción.
- Revisión legal de la tabla de posición, los hechos de 2026 y las cápsulas de ChatGPT Ads y de la Ley 21.719.
- Autorización escrita de cualquier caso o testimonio.
- Acceso a Search Console o Keyword Planner para la segunda fuente.
- Acceso al checkout y al rail de despliegue gobernado de `efeonce-public-site-runtime`.
- Confirmación con Commercial de quién recibe los briefs y las reuniones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: flow` según el alcance real.
- [ ] `UI ready` permanece `no` hasta que el wireframe y el `## UI/UX Contract` tengan implementation mapping, GVC scenario
      plan y design decision log; si está en `yes`, pasa `pnpm task:lint --task TASK-1865`.
- [ ] El wireframe, el flow, el motion y la dirección visual declarados existen.
- [ ] La legacy `242862` no muestra contadores en cero ni claims de partnership no verificados (Slice 0).
- [ ] La demanda está triangulada con una segunda fuente y la decisión de URL quedó cerrada antes del canonical.
- [ ] El H1 contiene `performance marketing`, el title contiene `agencia de performance marketing` y existe un solo H1.
- [ ] Las dos cápsulas de R2 tienen entre 40 y 60 palabras y están bajo un H2 con la pregunta literal.
- [ ] La firma cambia de primer ítem al cambiar la señal, funciona con teclado, anuncia el cambio y muestra el rótulo
      ilustrativo sin interacción.
- [ ] Ninguna región muestra un número sin fuente y fecha, un contador, un logo de plataforma o un badge de partner.
- [ ] Los ocho canales aparecen con su chip de estado; ChatGPT Ads muestra su fecha de vigencia.
- [ ] La tabla de posición no nombra ninguna empresa y muestra la nota por tipo de proveedor.
- [ ] Ninguna sección promete ROAS, retorno, leads, pipeline, ventas ni precios.
- [ ] El partner programático no se nombra en la página.
- [ ] El rol verde aparece exactamente en los tres CTAs de reunión.
- [ ] El form `efeonce-performance-brief` está publicado con consentimiento, Turnstile, gate corporativo y retención `730d`.
- [ ] Los estados ready, loading, empty, partial, error, denied y success del form fueron verificados.
- [ ] El CTA `performance-discovery-meeting` abre el scheduler nativo y no hay enlaces del proveedor.
- [ ] La fila del form está en `TRACKING-PLAN.md` y ningún evento envía PII ni los datos comerciales del brief.
- [ ] `Service` y `FAQPage` validan y sólo marcan contenido visible; no hay entidades de Yoast duplicadas.
- [ ] Los tres gates `public-website:verify-performance-*` pasan en vivo después del último guardado y de la migración.
- [ ] GVC premium capturado y mirado en 1536, 1440, 890 y 390, más reduced motion y teclado.
- [ ] `scrollWidth === clientWidth` en los cuatro viewports.
- [ ] El scorecard visual cumple el umbral declarado.
- [ ] La URL legacy responde 301 a la nueva, el ítem de menú apunta a la nueva, no quedan enlaces internos a la legacy y
      la legacy está `private` y fuera del sitemap.
- [ ] La página nueva está en `index, follow` con canonical, sitemap y enlace desde el hub.
- [ ] La triple documentación, la fila en `PRIMITIVES.md`, el registry de la skill y la landing reference en ambas skills
      existen.
- [ ] No se creó ningún lead ni ninguna reserva ficticia durante QA.
- [ ] El copy publicado respeta la regla terminológica del wireframe y los nombres públicos mapeados al catálogo.

## Verification

- `pnpm task:lint --task TASK-1865`
- `pnpm ui:wireframe-check --task TASK-1865`
- `pnpm ui:flow-check --task TASK-1865`
- `pnpm ui:motion-check --task TASK-1865`
- `pnpm ui:readiness-check --task TASK-1865`
- `pnpm public-website:verify-performance-landing-fidelity`
- `pnpm public-website:verify-performance-seo-package`
- `pnpm public-website:verify-performance-legacy-redirect`
- `pnpm fe:capture public-servicios-performance-marketing` + `pnpm fe:capture:review public-servicios-performance-marketing`
- `pnpm growth:forms-tracking-audit`
- `pnpm docs:closure-check`
- Validador de schema y readback de URL renderizada, canonical, robots, sitemap y 301 en producción.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] PDR-022 pasó de `Draft for validation` al estado que corresponda y el roadmap del sitio quedó al día.
- [ ] La fila de esta task en `EPIC-019` y el nodo en el flujo maestro de `EPIC-023` reflejan el estado final.
- [ ] `TASK-1860` apunta a la URL nueva en su conexión digital.
- [ ] La ficha de servicio registra la URL pública y los nombres públicos.

## Follow-ups

- Spoke "agencia de marketing b2b" (390/mes, KD 9) coordinada con la página de inbound y la landing de HubSpot.
- Spoke "agencia de Google Ads" para México y Colombia (260/mes cada uno) cuando exista la fase LATAM con hreflang.
- Guía editorial de performance marketing en Think para la intención definicional.
- Primer caso publicable de la línea, con autorización y evidencia.
- Evento de analítica del control de la firma si aparece una decisión que dependa de él.
- Registro periódico de prompts AEO y exactitud de la descripción de Efeonce en motores de respuesta.
- Graduar un módulo base compartido de landings de servicio si `TASK-1860` y esta task terminan con bases equivalentes.

## Open Questions

- ¿El owner aprueba la dirección A o prefiere producir un export en Claude Design y pasar a `source-led`?
- ¿Aprueba el H1 recomendado, "Performance marketing que aprende de tus ventas, no de tus clics."?
- ¿La contención del Slice 0 retira el bloque de partners completo o lo reemplaza por un texto sin claim?
- ¿El estado real en Google Partners permite mostrar algún badge después del Slice 1?
- ¿El testimonio de Eusari y el caso de Bresler tienen autorización escrita y fuente del dato?
- ¿El renderer admite selección múltiple, campos condicionales e iconos por opción?
- ¿Cómo apunta GVC al host público, dado que su resolver de entornos sólo conoce Greenhouse?
- ¿Quién de Commercial recibe los briefs y las reuniones de performance?
