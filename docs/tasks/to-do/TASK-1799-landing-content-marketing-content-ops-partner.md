# TASK-1799 — Landing Content Marketing: del pedido de piezas a una operación visible

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
- UI impact: `motion`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1799-landing-content-marketing-content-ops.md`
- Flow: `docs/ui/flows/TASK-1799-landing-content-marketing-content-ops-flow.md`
- Motion: `docs/ui/motion/TASK-1799-landing-content-marketing-content-ops-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site|content|growth|seo`
- Blocked by: `none`
- Branch: `Greenhouse develop; runtime público main; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la landing pública de **Content Marketing** de Efeonce como una experiencia inmersiva que
demuestra un sistema de contenidos en operación. La página no vende una bolsa de artículos, diseños o
videos: vende a Efeonce como **partner estratégico y operativo** que investiga, planifica, produce,
revisa, atomiza, publica, distribuye y aprende junto al equipo del cliente.

La narrativa convierte una idea central en un sistema visible: research y brief en un Content Hub,
revisión creativa en Frame.io, derivados por canal, publicación y optimización en el CMS del cliente,
y tres modelos de colaboración según quién opera la distribución. El visitante principal es el
operador de Marketing que busca y audita proveedores; la página también le entrega argumentos para
obtener la aprobación del CMO.

## Why This Task Exists

La página live histórica de Marketing de Contenidos (`page_id=242603`, ruta actual
`/servicio-marketing-de-contenidos/`) presenta una oferta genérica y fragmentada. No muestra la
operación diaria, no explica la frontera con SEO, AEO, Inbound, Redes Sociales, Influencer Marketing
o Agencia Creativa y contiene metadata desalineada con el servicio. Por eso no representa cómo
Efeonce trabaja hoy ni ayuda al operador a auditar el proveedor que atenderá la relación.

La brecha comercial no es «faltan más piezas»: falta hacer visible el **sistema que evita que cada
pieza sea un encargo aislado**. Efeonce ya tiene precedentes operativos reales —Content Hub,
investigación trazable, comentarios, derivados, revisión audiovisual y publicación en CMS— que
pueden demostrarse con evidencia aprobada, sin convertir las herramientas en el producto ni
inventar partnerships con sus vendors.

La landing merece una unidad propia porque es el tejido conectivo entre servicios existentes, pero
su JTBD es distinto: diseñar y operar el flujo que lleva una idea desde el research hasta su
distribución y aprendizaje. Inbound conserva su landing; blogging se modela inicialmente como
**Blog & Editorial Operations**, no como una página competidora sin demanda validada.

## Goal

- Lograr que un operador de Marketing reconozca en el primer fold que Efeonce puede convertirse en
  su partner de Content Marketing, no sólo entregar piezas.
- Hacer comprensible y auditable el sistema completo `research → estrategia → producción → revisión
  → atomización → publicación/distribución → aprendizaje`.
- Convertir interés cualificado en una conversación sobre la operación de contenidos, con una ruta
  secundaria para explorar cómo se trabaja y una narrativa que el operador pueda defender ante el CMO.
- Crear una experiencia visual memorable, inmersiva y rápida donde **una idea se transforma delante
  del visitante**, sin scroll hijacking, sin espectáculo vacío y con equivalencia completa en mobile
  y `prefers-reduced-motion`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/operations/public-site-route-ownership-matrix-20260616.md`
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
- `docs/public-site/decisions/PDR-012-growth-operating-system-global-positioning.md`
- `docs/public-site/decisions/PDR-017-content-engineering-territorio-editorial.md`
- `docs/public-site/decisions/PDR-018-pillar-experience-arquitectura-editorial-y-runtime.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `DESIGN.md`

## Normative Docs

- `docs/ui/visual-directions/TASK-1799-landing-content-marketing-content-ops.md` — dirección visual
  repo-native seleccionada, alternativas rechazadas, lenguaje visual, mapping y firma de aceptación.
- `docs/ui/wireframes/TASK-1799-landing-content-marketing-content-ops.md` — arquitectura de página,
  first fold, regiones desktop/mobile, contenido, estados y medición CRO/SEO.
- `docs/ui/flows/TASK-1799-landing-content-marketing-content-ops-flow.md` — journey del operador,
  progresión de conversión, CTA, formulario/scheduler y rutas de recuperación.
- `docs/ui/motion/TASK-1799-landing-content-marketing-content-ops-motion.md` — coreografía causal,
  fallbacks, performance, accesibilidad y reduced motion.

## Dependencies & Impact

### Depends on

- `TASK-1159` (`complete`) — shell y precedentes del sitio público; no implica migrar esta ruta a
  Astro ni cambiar su canonical sin evaluación.
- `TASK-1598` (`complete`) — precedente de landing de servicio con posicionamiento, formulario,
  evidencia visual y verificación live de alta fidelidad.
- Growth Forms, Growth CTAs y Meetings vigentes — se reutilizan; esta task no crea un formulario,
  scheduler, endpoint ni destino comercial paralelo.

### Blocks / Impacts

- Landing de Inbound — mantiene su JTBD; debe enlazar sin absorber la operación de Content Marketing.
- Landings SEO, AEO, Redes Sociales, Influencer Marketing y Agencia Creativa — serán spokes hermanos
  de capacidades, no secciones duplicadas dentro de esta página.
- Think / territorio editorial — recibe y entrega enlaces contextuales, pero no se convierte en la
  landing comercial ni replica su canonical.
- `TASK-1350` y `TASK-1351` poseen trabajo activo en el runtime público. Antes de tocar archivos
  compartidos del plugin, theme o assets se exige reconciliar ownership y serializar el cambio.

### Files owned

- `docs/tasks/to-do/TASK-1799-landing-content-marketing-content-ops-partner.md`
- `docs/ui/visual-directions/TASK-1799-landing-content-marketing-content-ops.md`
- `docs/ui/wireframes/TASK-1799-landing-content-marketing-content-ops.md`
- `docs/ui/flows/TASK-1799-landing-content-marketing-content-ops-flow.md`
- `docs/ui/motion/TASK-1799-landing-content-marketing-content-ops-motion.md`
- Composición Elementor/page-scoped de `page_id=242603`, **sólo tras** backup, decisión de ruta y
  reconciliación del checkout runtime.
- Assets y estilos `gh-content-marketing-*` page-scoped; si el audit demuestra repetición o riesgo,
  un widget dentro de `eo-elementor-widgets`, nunca un plugin nuevo por landing.
- Escenario GVC público `TASK-1799` y su evidencia/review dossier, con ruta exacta a resolver en Slice 1.

## Current Repo State

### Already exists

- Página WordPress live `page_id=242603` en `/servicio-marketing-de-contenidos/`, indexable y con
  canonical propio; es la superficie que conserva la equidad mientras no exista una decisión de ruta.
- Header/footer Ohio y stack Elementor/Kinsta del sitio público.
- Growth Forms, CTA/Meetings y primitives públicas registradas que deben inspeccionarse antes de
  implementar cualquier captura o agenda.
- Landings modernas de SEO, AEO, Redes Sociales e Influencer Marketing que fijan la necesidad de
  coherencia de ecosistema, sin obligar a repetir su composición.
- Evidencia operativa de Content Hub, revisión de assets y publicación en CMS que puede convertirse
  en prueba sólo cuando esté aprobada, redactada y libre de PII/datos de cliente no autorizados.

### Gap

- Posicionamiento live centrado en entregables, no en partnership ni Content Operations.
- Metadata actual desalineada con el servicio.
- Sin demostración visible del ciclo completo ni de la atomización de una idea.
- Sin responsabilidad explícita por modo de operación: Efeonce publica, co-opera o entrega el asset
  y copy channel-ready para que publique el cliente.
- Sin puente de decisión para que el operador venda internamente la opción al CMO.
- Sin research SERP vigente que decida keyword primaria, supporting terms, intención regional o si
  blogging amerita un satellite propio.

## Modular Placement Contract

- Topology impact: `public`
- Current home: WordPress/Elementor `page_id=242603`, ruta live
  `/servicio-marketing-de-contenidos/`.
- Future candidate home: `public`
- Boundary: WordPress posee composición pública; Growth Forms/CTA/Meetings poseen captura y agenda;
  Notion, Frame.io y los CMS son evidencia/capacidades operativas, no dependencias client-side de la
  landing ni claims de partnership.
- Server/browser split: el navegador recibe contenido público, assets aprobados, estados visuales y
  hosts canónicos; destinos, claves, routing comercial, PII y credenciales permanecen server-side.
- Build impact: page-scoped por defecto; cero dependencia nueva y cero WebGL/video pesado como
  requisito. Si la dirección exige ampliar un widget existente, declarar impacto de build, schema,
  assets y rollback antes de editarlo.
- Extraction blocker: ownership concurrente en el runtime público y decisión de ruta/canonical.

Una eventual ruta `/servicios/content-marketing/` sólo puede adoptarse con auditoría de GSC,
backlinks, SERP, canonical, redirect y paridad de medición.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard` de alta intensidad.
- Usuario / rol: Marketing Manager generalista como champion principal; Content, SEO, Brand,
  Communications y Digital Leads como operadores adyacentes; CMO como aprobador secundario.
- Momento del flujo: búsqueda, comparación y auditoría de proveedores antes de shortlist/reunión.
- Resultado perceptible esperado: «entienden mi operación, puedo ver cómo trabajaremos y tengo cómo
  justificar esta opción internamente».
- Fricción que debe reducir: proveedores intercambiables, procesos opacos, entregables aislados,
  múltiples herramientas sin gobierno y duda sobre quién publica/distribuye.
- No-goals UX: dashboard de software, demo autenticada de Notion/Frame.io, catálogo exhaustivo de
  piezas, administrador de redes sociales, promesa de automatización autónoma o portafolio infinito.

### Surface & system decision

- Surface: landing pública de servicio Content Marketing.
- Nav placement: sin nueva navegación de Greenhouse; evaluar su ubicación bajo «Servicios» del sitio
  público y enlaces desde los spokes durante Slice 1.
- Composition Shell: `no aplica` — runtime WordPress/Ohio/Elementor, no portal Greenhouse.
- Primitive decision: `reuse + landing-pattern`. Reusar header/footer y hosts canónicos de captura;
  implementar una composición page-scoped `gh-content-marketing-*`. Graduar sólo el patrón
  `IdeaAtomizationStage` si el audit demuestra reuso y contrato estable.
- Adaptive density / The Seam: `no aplica` como primitive de portal; sí aplica el principio de
  recomposición responsive, no serializar un desktop ancho como pila de cards.
- Floating/Sidecar/Dialog decision: navegación secundaria in-page; formulario/scheduler usa el host
  canónico y su focus contract. Nada de modal promocional, exit intent ni chat que compita con el CTA.
- Copy source: copy page-scoped gobernado por esta task y PDRs públicos; no fingir que vive en
  `src/lib/copy/*` del portal.
- Access impact: `none`; superficie pública.

### State inventory

- Default: experiencia completa con contenido crítico en HTML inicial.
- Loading: ningún contenido esencial depende de un loader o de ejecutar animación.
- Empty: si falta una prueba aprobada, se usa una demostración conceptual rotulada; nunca un hueco ni
  una captura falsa presentada como caso real.
- Error: CTA/formulario conserva copy y recuperación nativos; la narrativa sigue siendo legible.
- Degraded / partial: sin JS y reduced motion muestran todos los estados finales, jerarquía y enlaces.
- Permission denied: no aplica a la página; la captura gobernada no filtra datos.
- Long content: titulares, CMS, modos y FAQs toleran traducción/extensión sin solaparse.
- Mobile / compact: 390px mantiene el viaje «una idea → sistema» como capítulos verticales, sin rail
  horizontal de página ni texto ilegible.
- Keyboard / focus: nodos interactivos son alcanzables, tienen nombre/estado y no dependen de hover.
- Reduced motion: equivalencia semántica completa; sin pinning ni trayectorias obligatorias.

### Interaction contract

- Primary interaction: CTA «Conversemos sobre tu operación de contenidos» hacia captura/reunión
  gobernada.
- Secondary interaction: «Mira cómo trabajamos» navega al stage del sistema, no abre un video.
- Exploración: selector accesible de derivados y matriz de modos; ambas conservan la información
  visible sin interacción.
- Hover / focus / active: mismo contenido y affordance; focus visible sobre fondo claro y oscuro.
- Pending / disabled: estados heredados del host de formulario/scheduler, sin falsos success.
- Escape / click-away: si el scheduler canónico abre overlay, conserva su contrato; la landing no
  agrega un segundo diálogo.
- Focus restore: al cerrar/cancelar agenda vuelve al CTA originador.
- Latency feedback: host canónico, live region única.
- Toast / alert behavior: host canónico; no montar otra infraestructura de notificaciones.

### Motion & microinteracciones

- Motion primitive: CSS/JS page-scoped y compositor-friendly; GSAP sólo si el runtime ya lo justifica
  y la versión page-scoped no duplica dependencias.
- Enter / exit: la idea/núcleo entra primero; research, estrategia y derivados se revelan por causalidad.
- Layout morph: una pieza madre se convierte en formatos por canal; no morph de texto ilegible.
- Timing / easing token: variables page-scoped documentadas; cero timings dispersos en handlers.
- Reduced-motion fallback: estados finales estáticos, chapters y enlaces ancla.
- Non-goal motion: scroll hijacking, autoplay con audio, loops ambientales permanentes, parallax
  agresivo, count-ups, cursor personalizado, partículas o 3D/WebGL como requisito.

### Implementation mapping

- Route / surface: resolver en Slice 1 entre la ruta live preservada o una migración gobernada; el
  default seguro es editar `page_id=242603` manteniendo canonical.
- Runtime: `/Users/jreye/Documents/efeonce-public-site-runtime`, sólo checkout compartido autorizado.
- Component candidates: composición Elementor page-scoped; `IdeaAtomizationStage` como landing
  pattern candidato; hosts públicos existentes para proof/captura/reunión.
- Data reader: `none`; todo claim operativo es contenido público aprobado.
- API parity: reuso de Growth Forms/CTA/Meetings; no API nueva.
- Access / capability: pública; destinos/routing continúan gobernados server-side.
- States to implement: default, JS-off, reduced motion, 390px, keyboard, focus, form success/error,
  scheduler available/unavailable según contrato canónico.

### GVC scenario plan

- Scenario file: nuevo escenario público `content-marketing-landing` en el carril vigente de GVC.
- Route: la canonical decidida en Slice 1, nunca una URL inventada.
- Quality profile: `premium`.
- Viewports: desktop 1440 + mobile 390px.
- Required captures: first fold, sistema completo, atomización interactiva, Content Hub, Frame.io,
  modos de operación, bloque para el CMO, FAQ, CTA/form y estados de focus/reduced motion.
- Required `data-capture` markers: `content-marketing-hero`, `content-system-stage`,
  `content-hub-proof`, `creative-review-proof`, `operating-modes`, `internal-case`,
  `content-marketing-conversion`.
- Assertions: H1 único; CTA primario inequívoco; contenido crítico sin JS; foco visible; ninguna PII;
  schema coincide con contenido visible; page overflow inexistente.
- Scroll-width evidence: `documentElement.scrollWidth <= clientWidth` en 1440 y 390px.
- Review dossier: first-fold + full-page + interacciones + reduced motion + form negative path.
- Baseline decision: repo-native; comparar antes/después contra `page_id=242603` y registrar deltas
  deliberados. No usar la landing legacy como objetivo visual.

### Design decision log

- Decision: **Sistema de Contenidos Vivo — «La idea que se multiplica»**.
- Alternatives considered: «Revista editorial cinética» y «Content Factory / command center».
- Why this pattern: convierte la promesa operativa en una experiencia causal y auditable, diferenciada
  de un portafolio creativo o dashboard de software.
- Reuse / extend / new primitive: reusar hosts, crear landing pattern page-scoped y evaluar graduación
  después de medir reuso; no introducir primitive de portal ni widget antes del audit.
- Open risks: espectacularidad sobre claridad, performance, evidencia sensible, conflicto de canonical,
  solape con landings hermanas y claims de capacidad no aprobados.

### Visual verification

- GVC scenario: `content-marketing-landing`.
- Viewports: desktop 1440 + mobile 390px.
- Accessibility/focus checks: WCAG AA, headings/landmarks, tab order, focus visible, target size,
  no color/motion como único portador de significado y reduced-motion real.
- Before/after evidence: live legacy vs candidate, con fecha, URL/post ID y cache state.
- Visual scorecard: `docs/ui/reviews/TASK-1799-landing-content-marketing-content-ops.scorecard.json`.
- Quality threshold: average ≥4.5; ninguna dimensión <4; `hierarchy`, `surfaceEconomy`,
  `visualImpact`, `fidelity` y `genericTemplateResistance` ≥4.5.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Revalidación de negocio, evidencia y ownership

- Releer runtime live, metadata, canonical, GSC/backlinks y ownership del checkout público.
- Inventariar pruebas reales y aprobables de Content Hub, Frame.io, CMS y atomización; redactar PII,
  comentarios, research o marcas no autorizadas.
- Confirmar naming `Modyo` frente al «Modo» del brief del operador; hasta entonces usar «CMS del
  cliente» en copy visible.
- Congelar claims: una herramienta demuestra el proceso, no una alianza comercial ni una capacidad
  universal.

### Slice 1 — SEO/AEO, IA y contrato de conversión

- Ejecutar research SERP regional para CL/MX/CO/PE sobre la familia comercial: `agencia content
  marketing`, `agencia de marketing de contenidos`, `servicio de marketing de contenidos`,
  `agencia de contenidos`, `estrategia de contenidos` y términos adyacentes.
- Decidir keyword primaria, title, H1, supporting questions, slug/canonical y enlaces internos con
  evidencia. `Content Ops`, «squad creativo» y «atomización» son diferenciadores hasta demostrar que
  tienen demanda principal.
- Auditar la familia blogging (`agencia de blogging`, `servicio de blogging`, `gestión de blog`,
  `producción editorial`) y aplicar la regla: **módulo dentro de la landing por defecto**; satellite
  sólo si intención, demanda y SERP son distinguibles y no generan canibalización.
- Definir baseline y events de conversión sin inventar volumen: reunión cualificada como North Star;
  formulario aceptado, navegación al sistema/modos, calidad de lead y búsqueda no-brand como señales.
- Mantener un solo objetivo primario y una acción secundaria de exploración. No correr A/B tests sin
  tráfico suficiente; empezar por GSC, calidad comercial, entrevistas y comportamiento agregado.

### Slice 2 — First fold y experiencia inmersiva

- Implementar primero hero, núcleo visual, CTA primario/secundario y una prueba temprana.
- Capturar desktop + 390px y registrar `ACCEPT FIRST FOLD` o `REVISE` con hallazgos precisos.
- Ninguna sección posterior se implementa hasta que jerarquía, lectura, performance y equivalencia
  mobile/reduced motion del first fold estén aceptadas.

### Slice 3 — Sistema operativo, evidencia y modos

- Implementar el journey completo de una idea y su atomización por canal.
- Mostrar Content Hub y revisión creativa con material aprobado o demostraciones conceptuales
  rotuladas; nunca fixtures presentados como cliente real.
- Explicar Blog & Editorial Operations, operación CMS y tres modos: operado por Efeonce, co-operado,
  y Content Engine/enablement.
- Conectar sin duplicar las landings SEO, AEO, Redes Sociales, Influencer, Inbound y Agencia Creativa.

### Slice 4 — Conversión, schema, calidad y cutover

- Integrar captura/reunión canónica, FAQ visible y cápsulas AEO.
- Aplicar `Service`, `Organization`, `BreadcrumbList` y `FAQPage` sólo cuando correspondan al contenido
  visible, validado y sin duplicar schema del theme.
- GVC premium, browser checks, performance, analytics, formulario negativo, cache purge, backup,
  cutover y rollback verificados en runtime.

## Out of Scope

- Administrar las redes sociales del prospecto como condición del servicio.
- Construir un DAM, portal de cliente, Content Hub o integración real con Notion/Frame.io dentro de
  la landing.
- Crear una landing de blogging sin research e intención diferenciada.
- Reescribir las landings SEO, AEO, Redes Sociales, Influencer, Inbound o Agencia Creativa.
- Crear APIs, formularios, schedulers, CRM routing o plugins nuevos sin una task/decisión separada.
- Prometer resultados, volúmenes, SLAs, partnerships, certificaciones o capacidades CMS no verificadas.
- Publicar, migrar slug, cambiar canonical, aplicar 301 o purgar cache durante la fase de planificación.

## Detailed Spec

### Posicionamiento y audiencia

- Categoría: Content Marketing como partnership estratégico + operación visible de contenidos.
- Champion: operador de Marketing que busca, compara, audita y gestionará la relación diaria.
- Aprobador: CMO; la landing debe entregar un business case, no hablarle sólo en lenguaje ejecutivo.
- Tesis de hero candidata: «Content Marketing para equipos que necesitan un partner, no otro
  proveedor de piezas».
- Subpromesa: «Investigamos, planificamos, producimos, atomizamos, publicamos y hacemos visible la
  operación para que cada idea trabaje en más canales».
- CTA primario candidato: «Conversemos sobre tu operación de contenidos».
- CTA secundario candidato: «Mira cómo trabajamos».
- Todo copy candidato se valida con research, longitud responsive, nomenclatura pública y legal antes
  de publicarse; esta task fija la intención, no autoriza afirmaciones no probadas.

### Arquitectura narrativa obligatoria

1. Hero: partnership + sistema + CTA.
2. Proof band temprana: operación visible y evidencia aprobada.
3. Problema del operador: piezas aisladas, seguimiento manual, versiones dispersas, distribución sin dueño.
4. Sistema: research → estrategia → producción → revisión → atomización → publicación → aprendizaje.
5. Content Hub: briefs, estado, research, fuentes, comentarios, artículos y derivados.
6. Revisión creativa: banners, reels, posts e historias con versiones y feedback.
7. «Una idea, muchas expresiones»: adaptación por canal, no copy-paste.
8. Blog & Editorial Operations: estrategia, calendario, producción, optimización, publicación y mantenimiento.
9. CMS Operations: publicar y optimizar en el stack del cliente sin convertir logos en partnerships.
10. Tres modos de colaboración con responsabilidad explícita por publicación/distribución.
11. Sinergias: enlaces a SEO, AEO, Redes Sociales, Influencer, Inbound y Agencia Creativa.
12. Business case para el CMO: visibilidad, velocidad, consistencia, reutilización, gobernanza y aprendizaje.
13. Prueba/casos aprobados; si no existen, metodología y artefactos, sin números inventados.
14. FAQ orientada a objeciones e intención AEO.
15. Conversión: CTA, formulario mínimo y agenda/recuperación canónica.

### CRO contract

- Progresión: reconocimiento → fit → comprensión → confianza → justificación → acción.
- Un CTA primario semánticamente estable; secundarios nunca compiten por color/peso.
- Formulario mínimo candidato: nombre, email laboral, empresa, desafío y modo preferido opcional.
- Objeciones explícitas: «ya tenemos equipo», «sólo necesito producción», «no quiero que administren
  mis redes», «usamos otro CMS», «cómo se aprueba», «cómo se mide», «qué hace la IA y quién gobierna».
- La prueba responde a una duda, no decora. Cada logo, screenshot, número o caso necesita fuente y autorización.
- Instrumentación respeta consentimiento/privacy y usa nomenclatura vigente de GTM/GA4; ningún event
  nuevo se publica sin contrato y lectura posterior.

### SEO/AEO contract

- H1 único, jerarquía H2/H3 lógica y contenido crítico server-rendered/inicial.
- Preguntas respondibles en cápsulas breves seguidas de profundidad, evidencia y enlaces.
- Metadata, canonical, OG, sitemap/lastmod y enlaces internos se verifican en HTML live post-cutover.
- Schema sólo por entidades/FAQ realmente visibles; cero schema como sustituto de contenido.
- La decisión de slug preserva equidad: sin 301 ni ruta nueva por preferencia estética.
- Cluster editorial soporta la landing; la landing convierte y no intenta absorber todos los artículos.

### Content operations contract

- Herramientas como Notion o Frame.io son **evidencia de transparencia**, no el producto.
- Content Hub muestra artefactos y decisiones: brief, research, fuentes, estado, comentarios,
  contenido madre y derivados.
- Revisión creativa muestra versiones, feedback y aprobación de formatos audiovisuales/gráficos.
- CMS Operations incluye carga, formato, metadata, enlazado, assets, QA y optimización en el stack del
  cliente según alcance contratado.
- Los tres modos declaran RACI visible: quién define, produce, aprueba, publica, distribuye y mide.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`Slice 0 → Slice 1 → Slice 2 → Slice 3 → Slice 4`. No se escribe la experiencia final antes de
resolver canonical, claims, evidencia y first fold. No se publica desde la fase de diseño.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| La inmersión eclipsa la propuesta y el CTA | CRO/UI | alta | First-fold checkpoint y test de comprensión con operadores | Visitante recuerda el efecto pero no qué se vende |
| Motion degrada performance o accesibilidad | UI/runtime | alta | CSS/transform primero, budgets y reduced-motion equivalente | LCP/INP/CLS empeoran, jank o contenido oculto sin JS |
| Prueba expone PII, research o comentarios de cliente | legal/content | media | inventario, redacción y aprobación antes de asset | Nombres, URLs privadas o feedback legible en captura |
| Se sugieren partnerships con vendors | marca/legal | media | copy «trabajamos en tu stack», no «partners de» | Logos sin qualifier o claims no documentados |
| Nueva ruta pierde equidad de la página live | SEO | alta | GSC/backlinks/canonical/301 gate | slug elegido antes del research |
| Blogging canibaliza Content Marketing | SEO/IA | media | mantenerlo como módulo salvo intención distinta probada | dos páginas responden la misma SERP y CTA |
| Se duplican servicios hermanos | IA/copy | media | una frase de frontera + enlace por spoke | landing se convierte en mega-menú de servicios |
| Checkout runtime pisa trabajo de Creative/Social | delivery | alta | ownership y serialización antes de tocar plugin/theme | archivos dirty sin dueño confirmado |
| El formulario crea un carril paralelo | growth/data | baja | reusar host y routing canónicos | endpoint, form ID o agenda ad-hoc |
| Claims de IA suenan a fábrica autónoma | confianza | media | humano en control, research/fuentes/revisión visibles | lenguaje de «generación infinita» o «piloto automático» |

### Feature flags / cutover

- Candidate/noindex o preview gobernado mientras se valida; no dos canonicals indexables.
- Cutover sólo con backup de Elementor/runtime, metadata preparada, analytics verificada, cache purge
  y rollback exacto.
- Si se conserva el post ID/ruta live, reemplazo atómico con backup; si se migra, 301 + canonical +
  sitemap + enlaces internos + readback obligatorio.

### Rollback plan per slice

| Slice | Rollback | Tiempo objetivo | Reversible? |
|---|---|---:|---|
| 0–1 | revertir docs/research; cero runtime | inmediato | sí |
| 2–3 | restaurar backup candidate/Elementor o desactivar módulo page-scoped | < 15 min | sí |
| 4, misma ruta | restaurar backup de `page_id=242603`, purgar cache y leer live | < 15 min | sí |
| 4, ruta migrada | revertir redirect/canonical/sitemap y restaurar ruta previa según plan firmado | < 30 min | sí, con monitoreo SEO |

### Production verification sequence

1. Confirmar health del sitio, backup, ownership, post ID, ruta y canonical.
2. Validar candidate/noindex desktop, 390px, keyboard, JS-off y reduced motion.
3. Ejecutar GVC premium y revisar visualmente cada frame; gates verdes no sustituyen la lectura.
4. Probar CTA, formulario vacío/éxito controlado, scheduler/recovery y readback de destino sin crear
   contactos basura en producción.
5. Verificar HTML inicial, title, description, H1, canonical, schema, sitemap, robots y enlaces.
6. Cutover gobernado, purge de Kinsta y readback en ventana incógnita.
7. Repetir smoke, `scrollWidth`, CWV lab, analytics y enlaces desde/hacia spokes.
8. Monitorear errores, conversiones, indexación y calidad de lead; rollback si aparece señal crítica.

### Out-of-band coordination required

- Content/Marketing aprueba claims, casos, capturas y copy final.
- Owner del runtime público confirma ventana y resuelve trabajo dirty de Creative/Social.
- Growth/RevOps confirma formulario, routing, agenda y taxonomía de medición.
- SEO confirma keyword/canonical/redirect y baseline GSC.
- Legal/cliente autoriza cualquier evidencia identificable.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El posicionamiento vende partnership estratégico + operación visible, no una bolsa de piezas.
- [ ] El first fold identifica servicio, audiencia, resultado y CTA sin depender de animación.
- [ ] La experiencia «una idea se multiplica» es memorable, causal y comprensible en desktop, 390px,
      teclado, sin JS y reduced motion.
- [ ] El operador puede auditar flujo, artefactos, responsabilidades, revisiones y modo de trabajo.
- [ ] Existe una sección explícita para armar el business case ante el CMO.
- [ ] Content Hub y Frame.io se presentan como evidencia de proceso; ninguna marca implica partnership.
- [ ] Los tres modos declaran quién publica/distribuye y admiten que el cliente puede recibir assets + copy.
- [ ] Blog & Editorial Operations permanece como módulo salvo research que justifique un satellite separado.
- [ ] SEO/AEO research regional, keyword map y decisión de slug/canonical quedan documentados con fuente/fecha.
- [ ] Content Marketing, Inbound y los spokes hermanos tienen fronteras y enlaces sin copy duplicado.
- [ ] Sólo hay claims, screenshots, marcas, cifras y casos aprobados; cero PII o evidencia simulada no rotulada.
- [ ] Formulario/scheduler reutiliza el carril canónico, con negative path, focus restore y readback.
- [ ] HTML inicial contiene H1, propuesta, secciones críticas y respuestas; schema refleja contenido visible.
- [ ] GVC premium desktop 1440 + mobile 390px + reduced motion + keyboard + full page revisado.
- [ ] `documentElement.scrollWidth <= clientWidth` en 1440 y 390px.
- [ ] Scorecard PASS: average ≥4.5, ninguna dimensión <4 y dimensiones críticas ≥4.5.
- [ ] Performance/CWV no sufre una regresión material respecto de la baseline acordada; sin scroll hijack,
      autoplay audible ni dependencia WebGL pesada.
- [ ] Backup, cache purge, cutover y rollback fueron probados/read-back en el runtime real.

## Verification

- `pnpm task:lint --task TASK-1799`
- `pnpm ui:readiness-check --task TASK-1799`
- `pnpm design-contract:lint --task TASK-1799`
- `pnpm ops:lint --changed`
- Lint/tests/build proporcionales del runtime público, definidos después del audit del owner real.
- GVC público premium: desktop 1440 + mobile 390 + keyboard + reduced motion + JS-off.
- Browser probes: headings, canonical/schema, overflow, computed styles, assets, console/network y CWV lab.
- Form/scheduler: empty-submit negativo, success controlado, recovery y focus restore.
- Live readback post-cutover: URL, post ID, title, description, H1, canonical, schema, robots, sitemap,
  analytics, formulario y cache.
- `pnpm qa:gates --changed` y `pnpm docs:closure-check` al cierre.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- Crear una task separada para una landing de Blogging **sólo** si el research demuestra intención y
  demanda diferenciadas, un SERP propio y ausencia de canibalización.
- Evaluar la graduación de `IdeaAtomizationStage` al registry de primitives públicas cuando exista un
  segundo consumer o cuando su a11y/motion/responsive justifique ownership de widget.
- Si la ruta migra, abrir seguimiento SEO de redirects/indexación sólo cuando exceda el ciclo de esta task.

## Open Questions

- ¿La canonical debe permanecer en `/servicio-marketing-de-contenidos/` o migrar a
  `/servicios/content-marketing/`? Resolver con evidencia, no por preferencia.
- ¿Qué capturas/casos de Content Hub y Frame.io tienen autorización pública y qué debe recrearse como
  demo conceptual rotulada?
- ¿Cuál es el nombre público del tercer modo: «Content Engine», «Equipo extendido» o «Enablement»?
  Validar con operadores; no resolverlo durante el maquetado.
- ¿Qué CMS pueden nombrarse públicamente como capacidad verificada? Confirmar especialmente `Modyo`.
