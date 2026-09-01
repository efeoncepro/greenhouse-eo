# TASK-1803 — Landing Branding Studio: la marca como sistema de decisión

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1803-landing-branding-studio.md`
- Flow: `docs/ui/flows/TASK-1803-landing-branding-studio-flow.md`
- Motion: `docs/ui/motion/TASK-1803-landing-branding-studio-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Estrategia, dirección, wireframe, flow y motion contratados; VoC, casos, CTA, slug y runtime binding pendientes`
- Rank: `TBD`
- Domain: `public-site|agency|content|growth|ui|seo`
- Blocked by: `decisión comercial del Brand Diagnostic/CTA; inventario de casos y derechos; research SEO/canonical; discovery de work page WordPress`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la landing pública de **Efeonce Branding Studio** como línea de servicio especializada —no como nueva masterbrand—
para empresas cuya operación cambió más rápido que su marca. La página posiciona branding como un sistema de
`decisión + expresión + operación`, captura situaciones de rebranding/arquitectura/governance y convierte mediante
un siguiente paso comercial gobernado.

La landing también corrige la arquitectura del portafolio creativo: **Branding define, Agencia Creativa activa y
Producción Creativa escala**. Debe enrutar al visitante entre las tres superficies, reducir canibalización de copy y
búsqueda, y demostrar continuidad desde estrategia hasta activación/producción sin presentar productos u ofertas
como proveedores separados.

## Why This Task Exists

La Home publica `Branding y estrategia` como capacidad, pero no existe una landing dueña de posicionamiento,
arquitectura de marca, identidad verbal/visual, identidad semántica y governance. Al mismo tiempo, TASK-1350 y la
superficie indexada `/agencia-creativa-v2/` —visible como `Producción Creativa`— conservan copy de identidad/branding,
mientras `/agencia-creativa/` y `/agencia-diseno-estrategico/` mantienen territorios legacy. El visitante no tiene una
frontera clara para decidir si necesita definir la marca, activar una campaña o producir a escala.

El problema no se resuelve con una página de `estrategia + logo + manual`. El ICP de rebranding compra cuando la
empresa evolucionó, el portafolio se volvió ambiguo o la marca dejó de funcionar entre equipos/mercados. BP3 necesita
ver impacto empresarial; BP6 necesita reglas utilizables, adopción y menor retrabajo. La landing debe educar y
calificar esa demanda de ticket/ciclo alto, probar un mecanismo defendible y derivar honestamente los casos que
pertenecen a Agencia o Producción.

## Goal

- Publicar una landing indexable/citable de Efeonce Branding Studio que haga entendible en menos de 10 segundos la
  tensión, el resultado y el mecanismo `decisión + expresión + operación`.
- Convertir branding en una escalera productizada —Brand Diagnostic, Strategy Sprint, Brand System/Activation y
  Governance Partner— sin prometer gratuidad, pricing, producción ilimitada ni resultados sin evidencia.
- Crear una experiencia premium y responsive cuyo wireframe, UI flow, copy y motion expliquen causalidad y ayuden a
  elegir `Define · Activa · Escala`.
- Establecer fronteras y enlaces contextuales con Agencia Creativa y Producción Creativa, incluida la corrección de
  copy solapado bajo coordinación con TASK-1350.
- Cerrar WordPress/Elementor, SEO/AEO, medición, accesibilidad, reduced motion, rollback y readback público con
  evidencia separada de publicación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/context/00_INDEX.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`
- `docs/context/13_icp-buyer-personas-jtbd.md`
- `docs/architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md`
- `docs/business-models/EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md`
- `docs/strategy/EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md`
- `docs/services/README.md`
- `docs/services/creative-services/README.md`
- `docs/public-site/README.md`
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Efeonce lidera relación, página, CTA y contrato. `Branding Studio` es el descriptor de una línea de servicio
  dentro de Efeonce, no masterbrand, product brand contractual ni agencia independiente.
- Globe/Creative Studio sigue siendo sistema productizado de producción; no equivale a toda Creative Services ni
  absorbe Branding Studio.
- La big idea es una sola: una marca útil permite decidir y operar; identidad visual, IA y governance sirven esa idea.
- La página no reduce branding a logo/brand book ni convierte governance en policing o soporte ilimitado.
- El comprador es héroe; Efeonce es guía/sistema. Cada promesa se conecta a mecanismo y proof.
- WordPress/Kinsta sigue siendo runtime público vigente. No se cambia DNS, front door, canonical rail ni estrategia
  Astro por esta task.
- Elementor se modifica mediante `Document::save(elements, settings)`, con snapshot/hash/ownership guards; nunca se
  escribe `_elementor_data` directamente.
- Header/footer Ohio son nativos. Motion, CSS y widgets quedan page-scoped; no corregir una landing desde seams globales.
- La work page permanece `noindex` hasta aprobar copy, casos, metadata, canonical, responsive, conversión y cutover.
- SEO/AEO deriva de la misma verdad visible: no schema/FAQ/claim paralelo ni una identidad “para IA”.

## Normative Docs

- `.codex/skills/efeonce-brand-studio/SKILL.md`
- `.codex/skills/efeonce-brand-studio/references/branding-as-a-service.md`
- `.codex/skills/efeonce-brand-studio/references/brand-diagnosis-and-positioning.md`
- `.codex/skills/efeonce-brand-studio/references/semantic-and-ai-brand.md`
- `.codex/skills/efeonce-brand-studio/references/experience-reputation-and-governance.md`
- `.codex/skills/efeonce-brand-studio/references/metrics-and-scorecards.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landing-workflow.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landing-registry.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landings/agencia-creativa.md`
- `.codex/skills/efeonce-public-site-wordpress/references/native-navigation.md`
- `.codex/skills/efeonce-public-site-wordpress/references/source-led-elementor-patterns.md`
- `.codex/skills/efeonce-public-site-wordpress/references/elementor-mutation.md`
- `.codex/skills/seo-aeo/references/home-landing-metadata-schema.md`
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md`
- `docs/ui/visual-directions/TASK-1803-landing-branding-studio.md`
- `docs/ui/wireframes/TASK-1803-landing-branding-studio.md`
- `docs/ui/flows/TASK-1803-landing-branding-studio-flow.md`
- `docs/ui/motion/TASK-1803-landing-branding-studio-motion.md`

Skills mandatorias durante Discovery/ejecución:

- `efeonce-brand-studio` + `efeonce-agency` para arquitectura, oferta, claims, casos y fronteras.
- `efeonce-public-site-wordpress` para runtime, work page, Elementor, Ohio, Kinsta, rollback y readback.
- `greenhouse-ai-design-studio` para dirección, first-fold checkpoint, responsive y premium review proporcional al sitio público.
- `copywriting` para VoC, big idea, framework, headline bank, narrativa, craft, voz y edición anti-slop.
- `growth-marketing-cro` para message-market fit, fricción, CTA, form y medición de conversión.
- `seo-aeo` para intent, canibalización, answer capsules, entidad, metadata/schema y medición orgánica.
- `motion-design` repo overlay + `greenhouse-microinteractions-auditor` para significado, feedback y reduced motion.
- `gsap` sólo como referencia mecánica si Discovery justifica una timeline scroll/SVG dentro del wrapper/runtime gobernado; nunca como import directo improvisado.
- `greenhouse-browser-diagnostics`, `greenhouse-typography-accessibility` y `greenhouse-qa-release-auditor` para evidencia/cierre.

## Dependencies & Impact

### Depends on

- TASK-1350 como dueña de `/agencia-creativa-v2/` / Producción Creativa y de su contrato visual/motion vigente.
- Home publicada y su capacidad `Branding y estrategia`; cualquier cambio requiere snapshot/hash y owner de Home.
- WordPress/Kinsta, `ohio-child`, Elementor y plugin gobernado en `../efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/`.
- Decisión de Commercial/Brand owner sobre nombre visible, oferta de entrada, gratuidad/no gratuidad y destino CTA.
- Inventario de casos/proof con autorización, baseline, período, denominador, fuente y owner.
- Research de intent/keywords/canibalización para slug, title, H1, canonical y tratamiento de páginas legacy.

### Blocks / Impacts

- Navegación pública `Soluciones` y card `Branding y estrategia` de Home.
- Copy y enlaces contextuales de Agencia Creativa/Producción Creativa bajo coordinación con TASK-1350.
- Tratamiento SEO/canonical/redirect de `/agencia-creativa/`, `/agencia-creativa-v2/` y `/agencia-diseno-estrategico/` cuando exista evidencia; esta task no preautoriza redirects.
- Catálogo/ficha futura de Branding as a Service en `docs/services/creative-services/`.
- Atribución comercial de Brand Diagnostic y rutas de expansión hacia Agencia/Producción.

### Files owned

- `docs/tasks/to-do/TASK-1803-landing-branding-studio-sistema-marca.md`
- `docs/ui/visual-directions/TASK-1803-landing-branding-studio.md`
- `docs/ui/wireframes/TASK-1803-landing-branding-studio.md`
- `docs/ui/flows/TASK-1803-landing-branding-studio-flow.md`
- `docs/ui/motion/TASK-1803-landing-branding-studio-motion.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landings/branding-studio.md` y espejo `.claude/` — crear tras confirmar identity/postId/runtime.
- `.codex/skills/efeonce-public-site-wordpress/references/landing-registry.md` y espejo `.claude/` — registrar superficie cuando exista.
- `../efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/` — módulos/assets page-scoped con nombres congelados en Discovery.
- `scripts/public-website/` — configurador/verificador/rollback TASK-1803 con nombres definidos en Discovery.
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md` — relación/estado de la unidad.

Cambios a Home, páginas hermanas, menú, metadata global o redirects son archivos/superficies coordinadas, no ownership
exclusivo. Preservar WIP y contratos activos de TASK-1350/TASK-1358/TASK-1799.

## Current Repo State

### Already exists

- Home publicada con `Branding y estrategia`, pero sin destino de landing dedicado registrado.
- `/agencia-creativa/` legacy `page_id=249582` publicada.
- `/agencia-creativa-v2/` `page_id=251279` publicada/indexada y visible como `Producción Creativa`, con 14 módulos
  Elementor, motion y SEO propios bajo TASK-1350.
- `/agencia-diseno-estrategico/` publicada con territorio histórico de diseño/marketing a auditar.
- Patrón gobernado de work copies, módulos Elementor, Ohio native chrome, Growth Forms/Meetings, Yoast/Service/FAQ,
  snapshots, cache purge y public readback.
- Dirección, wireframe, flow y motion de TASK-1803 creados en estado draft detallado.

### Gap

- No existe URL/postId/canonical ni landing registry para Branding Studio.
- No existe frontera de copy/intent/CTA entre Branding, Agencia y Producción.
- No hay VoC/claim ledger/case-rights inventory aprobados para escribir copy final.
- No está decidido si la conversión ofrece Brand Diagnostic pagado, evaluación inicial o reunión consultiva.
- No existe implementación mapping de módulos Elementor, design first fold aprobado, runtime motion tokens ni GVC scenario.
- No hay keyword/intent research que permita elegir slug y prevenir canibalización con páginas legacy.
- No existe tracking plan de selección `Define · Activa · Escala`, form start/submit/receipt o cross-page handoff.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeoncepro.com` en WordPress/Kinsta + `../efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/` para módulos públicos gobernados.
- Future candidate home: `public`
- Boundary: WordPress/Elementor compone contenido público y consume únicamente hosts Growth ya gobernados; Home y páginas hermanas consumen enlaces/copy aprobados, no una segunda lógica de calificación.
- Server/browser split: PHP/WordPress resuelve contenido, metadata, schema y config pública; browser mejora selección/motion y llama sólo al host Growth existente, sin HubSpot/DB/secrets/provider SDKs.
- Build impact: módulos/assets/scripts page-scoped; cero framework o animation engine nuevo por defecto; cualquier dependencia pesada requiere medición y decisión explícita.
- Extraction blocker: route ownership y canonical WP/Astro, estado legacy de páginas creativas y destino de conversión deben cerrarse antes de mover o cortar la surface.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: BP3 CEO/GM, BP1/BP2 marketing sponsor y BP6 Brand Manager/Creative lead en una empresa en cambio.
- Momento del flujo: reconoce desalineación/inconsistencia o explora un rebranding; necesita saber si debe definir, activar o escalar.
- Resultado perceptible esperado: entiende que Branding Studio convierte cambio empresarial en un sistema de marca operable; identifica su intervención y siguiente ruta.
- Friccion que debe reducir: branding confundido con logo, catálogo solapado, claims abstractos, casos sin contexto y CTA genérica.
- No-goals UX: quiz mágico, portfolio sin narrativa, calculadora/precio, customer portal, asset manager o branding app.

### Surface & system decision

- Surface: nueva landing pública WordPress/Elementor, work page `noindex` antes de canonical/cutover.
- Nav placement: `none` — no agrega destino al rail Greenhouse; su ubicación vive en el menú Ohio público y se decide con `native-navigation.md`.
- Composition Shell: `no aplica` — no es portal Greenhouse; usa chrome Ohio y módulos públicos page-scoped.
- Primitive decision: `extend` — buscar/reusar módulos públicos adaptables; `one-off` sólo para set-piece relacional R3.
- Adaptive density / The Seam: `no aplica` — contrato de producto Greenhouse, no landing WordPress.
- Floating/Sidecar/Dialog decision: conversión inline preferida; dialog sólo si Meetings canónico lo exige, con focus restore.
- Copy source: `local one-off` en controles Elementor/documento gobernado; microcopy reusable del host permanece en su SSOT.
- Access impact: `none` — página pública y payload allowlisted.

### State inventory

- Default: contenido SSR/natural con H1, argumentos, links y CTA disponibles.
- Loading: la página no espera JS; media lazy reserva dimensiones; host de conversión usa su estado canónico.
- Empty: ningún caso/claim vacío se publica; el módulo se omite o se reemplaza por método/artefacto real.
- Error: enhancement falla seguro; form/scheduler conserva input y ofrece recovery sin raw errors.
- Degraded / partial: prueba incompleta se etiqueta u omite; falla de media no elimina argumento; sibling unavailable bloquea cutover.
- Permission denied: no aplica a contenido; Turnstile/abuse denial del host se explica con recuperación.
- Long content: headlines, claims, nombres y FAQ extensos no rompen grid/diagrama.
- Mobile / compact: composición vertical, cero pinning/horizontal travel, no overflow de documento.
- Keyboard / focus: selector, rutas, FAQ y host operables; focus visible/restaurado; no hover-only.
- Reduced motion: mismo orden/significado; sin travel, pinning, stagger, autoplay ni smooth scroll obligatorio.

### Interaction contract

- Primary interaction: reconocer síntoma, comprender sistema y elegir `Define · Activa · Escala`.
- Hover / focus / active: refuerzan affordance; labels/destinos siempre visibles; state no depende de color.
- Pending / disabled: sólo el host real puede declarar pending/complete; evita doble submit.
- Escape / click-away: sólo dialog real; no se pierde input silenciosamente.
- Focus restore: CTA exacta que abre host; Back de páginas hermanas restaura contexto cuando sea posible.
- Latency feedback: skeleton sólo para media/layout conocido; status textual para request real.
- Toast / alert behavior: form usa inline/status/receipt canónico; fallo bloqueante no es toast-only.

### Motion & microinteractions

- Motion primitive: `CSS` como base; IntersectionObserver/JS scoped; timeline gobernada sólo para M0/M3/M8/M11 si Discovery la justifica.
- Enter / exit: enhancement desde contenido visible; copy/CTA nunca esperan timeline.
- Layout morph: ninguno global; cambios de panel local usan crossfade/transform y latest-input-wins.
- Stagger: acotado a un artefacto/relación, nunca a cada card/FAQ/logo/sección.
- Timing / easing token: tiers page-scoped `feedback|transition|reveal|narrative`, mapeados al runtime antes de implementación.
- Reduced-motion fallback: composición estática vertical y cambios inmediatos con significado completo.
- Non-goal motion: video hero obligatorio, parallax/particles/cursor custom, infinite float, scroll hijack, confetti o counter ornamental.

### Implementation mapping

- Route / surface: work page WordPress a crear; slug provisional `/branding/`; canonical/postId se confirman en Slice 0.
- Primitive / variant / kind: Ohio native chrome + módulos Elementor semánticos; schemas/nombres congelados tras lookup.
- Component candidates: hero, symptoms, brand-system, maturity, buying moments, offers, artifacts, Creative Services navigator, cases, semantic identity, governance, measurement, routing, FAQ, conversion.
- Copy source: copy ledger + claim ledger + controles Elementor; host mantiene microcopy funcional.
- Data reader / command: ninguno nuevo; Growth Forms/Meetings existente si se aprueba.
- API parity: WordPress/browser no escribe CRM ni simula receipt; consume command server-side gobernado.
- Access / capability: pública; zero internal Greenhouse data.
- States to implement: los declarados en wireframe/flow/motion, incluidas rutas hermanas y conversión.

### GVC scenario plan

- Scenario file: nuevo escenario público TASK-1803; path se congela en implementación.
- Route: work page `noindex`, luego URL canonical aprobada.
- Viewports: 1440×1000, 1280×900, 390×844 y spot-check 2048.
- Quality profile: `premium` proporcional al sitio público.
- Required steps: first paint; full scroll; síntomas/madurez; R3 states; ofertas; rutas hermanas/Back; casos; FAQ; host default/invalid/pending/error/success; reduced motion; JS-off; resize.
- Required captures: hero, R3, R4/R6, R8/R9, R10/R11, R13, host states, mobile full-page y reduced/static.
- Required `data-capture` markers: `hero|symptoms|brand-system|maturity|offers|ecosystem|cases|governance|routing|conversion`.
- Assertions: H1/CTA visibles; copy/schema parity; links/canonical/robots correctos; no fake success; focus/aria synchronized; console/network sin errores.
- Scroll-width checks: `scrollWidth === clientWidth` en cada viewport/estado.
- Reduced-motion / focus evidence: desktop/mobile reduced; keyboard trace; focus ring/restore; intermediate contrast.
- Review dossier: `docs/ui/reviews/TASK-1803-landing-branding-studio/`.
- Baseline decision / surface ID: crear tras aprobar first fold; work page identity/hash forma parte del baseline.

### Design decision log

- Decision: dirección `Editorial operating system`; narrativa síntomas→sistema→intervención→proof→routing→conversión.
- Alternatives considered: Brand Laboratory, Governance Command Center, portfolio visual, página corta y quiz score.
- Why this pattern: diferencia Branding de Agencia/Producción y soporta una decisión B2B de ticket/ciclo alto.
- Reuse / extend / new primitive: reusar chrome/hosts; extender módulos adaptables; one-off R3 sólo con lookup y performance gate.
- Open risks: VoC/casos/rights, offer/CTA, slug/canibalización, runtime motion mapping y coordinación TASK-1350.

### Visual verification

- GVC scenario: Playwright/GVC-style público TASK-1803.
- Viewports: 1440 / 1280 / 390 / spot 2048.
- Required captures: first fold, firma R3, rutas, proof, conversion, mobile, reduced motion y JS-off.
- Required `data-capture` markers: roots semánticos definidos arriba.
- Scroll-width check: sí, por estado.
- Accessibility/focus checks: heading order, diagram alternatives, contrast, keyboard, focus restore y host states.
- Before/after evidence: baseline work page vs última candidata; páginas hermanas sólo donde cambie copy/routing.
- Known visual debt: ninguna deuda puede ocultarse como `future polish` si afecta jerarquía, prueba, mobile o interacción.
- Visual scorecard: `docs/ui/reviews/TASK-1803-landing-branding-studio.scorecard.json`
- Quality threshold: `average >= 4.5; no dimension <4; hierarchy/surface economy/visual impact/source fidelity/template resistance >=4.5`

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

### Slice 0 — Discovery comercial, semántico y runtime

- Auditar Home, `/agencia-creativa/`, `/agencia-creativa-v2/`, `/agencia-diseno-estrategico/`, menú, canonicals,
  metadata, tráfico/intents disponibles y ownership antes de proponer redirects o cambios.
- Confirmar line architecture `Efeonce → Creative Services → Branding Studio` y aprobar nombre/descriptor visible.
- Ejecutar VoC real: ventas, briefs, win/loss, testimonios y lenguaje BP3/BP6; separar hecho, inferencia e hipótesis.
- Crear claim/proof/case-rights ledger con owner, evidencia, período, denominador y autorización.
- Decidir oferta de entrada y CTA: Diagnostic pagado, evaluación inicial o reunión; declarar anti-ICP y no-fit.
- Investigar intent/keywords/canibalización y cerrar slug, H1/SEO title/OG/canonical y páginas legacy.
- Confirmar work page/postId, Elementor/runtime plugin, hashes/guards, backup plan y módulos/primitives reusables.

### Slice 1 — Dirección, copy architecture y first fold

- Producir 2–3 composiciones materially different para el hero dentro de la dirección seleccionada y registrar descartes.
- Generar 15–25 variantes de H1, elegir por VoC/4U/claridad/anti-sameness y diferenciar H1/SEO/OG/slug.
- Revisar todo el copy ledger con framework por awareness, voice Efeonce, claim ledger y edición humana anti-slop.
- Implementar únicamente el first fold en work page `noindex`, con Ohio chrome nativo, CTA real/fallback honesto y
  set-piece visible sin JS.
- Capturar desktop/mobile, revisar, y no continuar sin checkpoint `ACCEPT FIRST FOLD` del operador.

### Slice 2 — Sistema narrativo y módulos Elementor

- Implementar R2–R14 como módulos Elementor separados/adaptables; no monolithic HTML widget.
- Materializar `decisión + expresión + operación`, madurez, momentos, offer ladder, artefactos, semantic identity,
  governance y measurement con alternativas textuales accesibles.
- Implementar casos sólo desde evidencia/autorización; ocultar/recomponer módulos faltantes sin placeholders públicos.
- Crear el navegador compartido `Define · Activa · Escala` y enlaces contextuales hacia páginas hermanas.
- Verificar long copy, localization, media degradation, HTML/JS-off, keyboard y mobile 390.

### Slice 3 — UI flow y motion

- Implementar selector de síntomas/madurez/rutas con semántica, URL/deep-link y Back definidos en Flow Contract.
- Implementar M0–M15 proporcionalmente; motion explica relaciones/feedback, no decora.
- Resolver tokens/tier de timing y easing en una única fuente page-scoped; no tiempos dispersos.
- Probar localized sticky M3 sólo si pasa control de scroll, resize, performance y mobile/reduced alternatives.
- Cerrar focus, aria/live status, latest-input-wins, cleanup, reduced motion, JS-off e intermediate-frame contrast.

### Slice 4 — Conversión, SEO/AEO y medición

- Integrar Growth Forms o Meetings aprobado sin fork de CRM/booking; estados default/invalid/pending/error/unavailable/complete.
- Verificar receipt real, idempotency del host, consent/Turnstile/attribution y cero lead accidental en QA.
- Implementar metadata, OG/Twitter, canonical, robots, `Service`/FAQ/Breadcrumb integrados al grafo Yoast existente.
- Asegurar answer capsules, entity relationship, visible/schema parity y no claims paralelos para IA.
- Definir tracking plan allowlisted: entry/source, symptom/maturity interaction, route Define/Activa/Escala, CTA, form start,
  server-confirmed receipt y cross-page handoff; no considerar interacción como conversión.

### Slice 5 — Sinergia y fronteras de páginas hermanas

- Aplicar cambios mínimos aprobados a Home y páginas creativas: links, labels, answer capsule o route module, sin
  sobreescribir contratos/motion de TASK-1350.
- Retirar/reencuadrar copy de branding donde produzca canibalización; preservar aplicación de identidad dentro de
  producción sin confundirla con definición estratégica.
- No redirigir ni desindexar páginas legacy sin análisis de tráfico/backlinks/canonical, rollback y aprobación explícita.
- Verificar todas las rutas de entrada/retorno, UTM/eventos y restore de Back/focus.

### Slice 6 — Rollout, readback y continuidad

- Snapshot Elementor/settings/Ohio/thumbnail/Yoast/menu y hash/ownership guard antes de cada mutación.
- Publicar/cutover en orden, purgar Kinsta y hacer hard/fresh navigation al bundle actual.
- Verificar desktop/mobile/reduced/JS-off, keyboard, axe/contrast, console/network, CWV/long tasks y overflow.
- Leer públicamente HTML/head/schema/robots/canonical/menu/links/form receipt; publicación no equivale a verificación.
- Registrar landing registry/ref, rollback, docs/manual/skill mirrors y estado real de task/epic.

## Out of Scope

- Diseñar una identidad visual nueva para Efeonce o una submarca/logotipo independiente de Branding Studio.
- Construir un portal/asset manager/brand management SaaS o presentar Greenhouse como capacidad live no verificada.
- Crear schema/API/DB/CRM/Meetings/Growth Forms nuevos dentro de esta task; cualquier gap reusable se separa.
- Publicar pricing, descuentos, garantía, auditoría gratuita o SLA sin aprobación Commercial/Finance/Legal.
- Producir brand film, video cinematográfico o showreel nuevo; si se aprueba contenido audiovisual, usa task/pipeline propio.
- Rediseñar por completo Agencia Creativa, Producción Creativa, Home o navegación global.
- Ejecutar redirects, desindexación o cutover de páginas legacy sin autorización explícita y evidencia SEO.
- Prometer ranking, citación/recomendación de IA, revenue causal o eliminación total de retrabajo.

## Detailed Spec

### Positioning contract

```text
Audience: CEO/GM, CMO/Head of Marketing y Brand Manager en empresas que cambiaron o escalan.
Situation: la operación, el portafolio o el mercado evolucionó más rápido que la marca.
Job: convertir la realidad actual del negocio en un sistema claro, distintivo y utilizable.
Tension: existe identidad/comunicación, pero no una lógica compartida para decidir y operar.
Category: servicio especializado en estrategia y sistemas de marca dentro del portafolio creativo de Efeonce.
Promise: claridad para decidir, consistencia para expresar y capacidad para operar/evolucionar.
Mechanism: Brand Diagnostic → Strategy → System/Activation → Governance/Review.
Expansion: Agencia Creativa activa; Producción Creativa escala.
No-claims: memorable/líder/innovador/360; “optimiza ChatGPT”; revenue atribuible sin método.
```

### Page architecture contract

El wireframe R0–R16 es normativo. Se puede ajustar el orden sólo si la revisión de VoC/CRO demuestra que cambia la
pregunta dominante; cualquier cambio registra decisión y actualiza wireframe/flow/motion antes del runtime.

### Copy delivery contract

- Entregables previos al copy final: VoC dossier, copy brief, one thing, awareness, framework map, 15–25 H1,
  objection map, claim ledger, case ledger y edit checklist.
- Copy visible usa es-CL neutro/tuteo, profundidad accesible y mecanismo concreto; no narrar la interfaz.
- H1 promete/diagnostica; eyebrow identifica el servicio; SEO/OG/slug hacen trabajos distintos.
- Cada sección tiene una función persuasiva única; si dos secciones responden la misma objeción, se fusionan/cortan.
- CTA usa verbo + valor; ansiedad se reduce sólo con condiciones verdaderas.
- Copy final se lee en voz alta, se prueba en 390px y se audita contra AI-slop/anti-sameness antes de publicar.

### UI flow contract

- Las tres rutas son honestas y reversibles: `Define` no captura necesidades de `Activa/Escala`.
- Selecciones locales orientan y nunca generan score, lead o recomendación definitiva.
- Ruta, hash, Back, reload, focus y fallback JS-off siguen el Flow Contract.
- Conversiones existen sólo en el host gobernado y el éxito exige receipt server-confirmed.

### Motion contract

- Motion language: `ordenar y conectar`; inventario M0–M15 normativo.
- Default: CSS/IntersectionObserver; timeline avanzada sólo con justificación, wrapper/runtime existente, cleanup y
  cero dependencia pesada no aprobada.
- Un único candidato localized sticky: M3; mobile/reduced siempre vertical/static.
- Estado natural visible, transform/opacity, latest-input-wins, no layout thrash, no infinite ambient loops.
- Capturar motion normal y reduced, mirar frames intermedios y bloquear por contraste/CWV/INP/CLS/long tasks.

### SEO/AEO and page boundary contract

| Surface | Intent owner | Content owner |
|---|---|---|
| Branding Studio | branding, rebranding, estrategia/arquitectura/gobierno de marca | definición del sistema |
| Agencia Creativa | agencia creativa, concepto/campaña/activación | idea y campaña |
| Producción Creativa | producción creativa/audiovisual/contenido a escala | ejecución, formatos y capacidad |

- Query research valida el mapa; no se elige slug por intuición.
- FAQ/schema sólo representa contenido visible y aprobado.
- Yoast Organization/WebSite graph se reutiliza; no aparece una segunda Efeonce ni Branding Studio como Organization.
- Legacy decisions se separan de publicación de nueva landing y requieren su propio rollback/readback.

### Measurement contract

- Primary: solicitudes/receipts calificadas para la oferta aprobada, no clicks o form starts.
- Secondary: handoffs correctos a Agencia/Producción, diagnostic→core si CRM lo permite, y razones de no-fit.
- Behavioral: selector/routing/proof depth sólo para diagnóstico de fricción; no se reporta como revenue.
- Search: query cluster, impressions/clicks/position con fuente/ventana; index eligible no prueba indexación.
- Brand outcomes: cada métrica declara baseline/target/frequency/owner/evidence y `controla|influye|monitorea`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`Slice 0 Discovery → Slice 1 first fold approval → Slice 2 narrative → Slice 3 flow/motion → Slice 4 conversion/SEO/measurement → Slice 5 sibling boundaries → Slice 6 rollout/readback`.

- No crear/publicar work page antes de confirmar ID/guardrails y copy/offer constraints de Slice 0.
- No implementar toda la página antes de `ACCEPT FIRST FOLD`.
- No aplicar cambios a páginas hermanas antes de aprobar boundary map y coordinar TASK-1350.
- No retirar `noindex` ni cambiar menú/canonical antes de conversión, SEO, GVC, rollback y public readback verdes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Branding compite con Agencia/Producción | content/SEO | high | intent/boundary map + cross-links + copy audit | queries/CTAs indistinguibles |
| Nueva línea de servicio parece submarca/proveedor | brand | medium | Efeonce masterbrand + descriptor + schema owner | logo/naming independiente |
| Copy genérico o sin evidencia | content/commercial | high | VoC + headline/claim/case gates | claim sin source/owner |
| Work page se indexa antes de tiempo | SEO | medium | noindex + canonical gate + head verifier | robots/canonical drift |
| Elementor mutación afecta Ohio/global | WordPress UI | medium | Document::save + page scope + snapshot/hash | header/footer/other page diff |
| Motion degrada control/performance | UI/CWV | medium | one localized stage + reduced/mobile static + trace | jank, long task, CLS/INP |
| Form simula éxito o crea leads de QA | Growth/CRM | medium | existing host + test mode/no submit + receipt readback | lead sin receipt/duplicado |
| Redirect legacy pierde equity | SEO | medium | GSC/backlink/content audit + explicit approval | 404/canonical/index drop |
| Casos sin derechos o métricas falsas | Legal/brand | medium | rights/claim ledger + omit fallback | asset sin authorization |

### Feature flags / cutover

- Sin feature flag de aplicación: work page WordPress permanece `publish + noindex` o draft según discovery.
- Cutover se controla con robots/canonical/menu/links y, sólo con aprobación, redirect. Cada control tiene snapshot y
  rollback independiente.
- Motion enhancements tienen JS/reduced/viewport gates y fallan a HTML visible.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | revertir sólo docs/decisiones no aprobadas | <15 min | sí |
| 1 | restaurar snapshot work page o volver a first-fold anterior | <30 min | sí |
| 2 | `Document::save` desde snapshot/hash protegido + plugin artifact anterior | <45 min | sí |
| 3 | deshabilitar enhancement page-scoped/restaurar CSS/JS anterior | <30 min | sí |
| 4 | restaurar Yoast/form config y mantener noindex; no borrar receipts | <30 min | parcial |
| 5 | restaurar snapshots de cada sibling/menu; revertir links/copy | <45 min | sí |
| 6 | retirar menú/restaurar noindex/canonical y plugin/page snapshots; redirect sólo con regla reversible | <60 min | sí salvo indexación externa |

### Production verification sequence

1. Verificar work page identity/postId/hash y backups; mantener `noindex`.
2. Guardar first fold mediante `Document::save`, purgar cache y revisar desktop/mobile/reduced/JS-off.
3. Tras aceptación, desplegar módulos/runtime scoped y repetir readback/captures.
4. Verificar host de conversión sin lead accidental; ejecutar submit real sólo con autorización y reconciliar receipt.
5. Verificar title/meta/OG/canonical/robots/schema/visible parity en HTML público cache-busted.
6. Aplicar cross-links/menu page-by-page con snapshot/readback; no tocar redirects aún.
7. Con gates verdes y aprobación, retirar noindex/activar canonical/menu; purgar cache y hacer fresh navigation.
8. Verificar URL canonical, páginas hermanas, Back/focus, GSC eligibility y tracking; observar, no declarar indexación inmediata.

### Out-of-band coordination required

- Brand/Commercial: nombre visible, offer/CTA, anti-ICP, proof/case rights y aprobación editorial.
- Owner TASK-1350: copy/routing en Producción Creativa y página legacy.
- SEO owner: slug/canonical/legacy/redirect/indexation decision.
- Growth/CRM: form/scheduler binding, consent, attribution, test receipt y event mapping.
- WordPress/Kinsta operator: work page, mutation window, backups/cache/cutover.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux`, `UI impact: flow`, `UI ready: no`, y wireframe/flow/motion existentes.
- [ ] `pnpm task:lint --task TASK-1803`, `pnpm ui:wireframe-check --task TASK-1803`, `pnpm ui:flow-check --task TASK-1803` y `pnpm ui:motion-check --task TASK-1803` pasan.
- [ ] `UI ready` permanece `no` hasta cerrar implementation mapping, GVC plan, design log, VoC, claims/cases, CTA, slug y work page; si cambia a `yes`, pasa `pnpm ui:readiness-check --task TASK-1803`.
- [ ] Discovery confirma postId/slug/status/hash/Ohio metas/runtime owners y registra landing ref/registry antes de la segunda mutación.
- [ ] Brand architecture presenta Efeonce como masterbrand, Branding Studio como línea de servicio y Globe como habilitador, no proveedor/agencia separada.
- [ ] VoC dossier, one thing, awareness/framework map, 15–25 headlines, objection map, claim ledger y case-rights ledger existen y tienen revisión humana.
- [ ] H1, SEO title, OG title y slug cumplen funciones distintas; ningún claim/caso/cifra sin evidencia/autorización se publica.
- [ ] En 10 segundos el first fold comunica cambio, resultado, mecanismo y acción; el operador emite `ACCEPT FIRST FOLD` antes de implementar below-fold completo.
- [ ] R0–R16 están implementadas o una decisión registrada explica su fusión/retiro; no aparece card soup ni portfolio sin narrativa.
- [ ] `Branding define · Agencia activa · Producción escala` aparece como navegador semántico y cada ruta tiene links contextuales/retorno verificados.
- [ ] Los cambios de frontera en páginas hermanas son mínimos, coordinados con TASK-1350 y no alteran sus visual/motion/canonical sin aprobación.
- [ ] El selector orienta sin score ni lead; Back/deep link/reload/focus/JS-off funcionan según el Flow Contract.
- [ ] Motion M0–M15 usa significado/feedback, una fuente de tokens, cleanup/latest-input-wins y contenido natural visible; no dependencia/engine nuevo injustificado.
- [ ] Reduced motion conserva significado completo; mobile 390 no usa pinning, parallax, horizontal travel o autoplay.
- [ ] Diagrams, maturity y selected states tienen alternativa textual/semántica y no dependen de color/motion.
- [ ] Conversión usa Growth Forms/Meetings canónico; no hay CRM write browser-side, fake success, duplicate submit ni lead de QA no autorizado.
- [ ] Success sólo aparece con receipt server-confirmed; invalid/error/unavailable conservan contexto y recovery.
- [ ] Metadata/OG/Twitter/canonical/robots/Service/FAQ/Breadcrumb reutilizan el grafo Yoast y coinciden con contenido visible.
- [ ] Keyword/intent map evita canibalización; cualquier redirect/desindexación legacy tiene evidencia, aprobación, rollback y public readback.
- [ ] Tracking plan distingue interacción, handoff y conversión confirmada; eventos siguen taxonomía allowlisted y no contienen PII.
- [ ] Desktop 1440/1280, mobile 390, reduced motion, keyboard, JS-off, long copy y form states están capturados y revisados.
- [ ] `scrollWidth === clientWidth`, consola/network limpios, contraste/axe verde y performance sin regresión material en todos los estados críticos.
- [ ] Elementor se guardó con `Document::save`, snapshots/hash/ownership guards; Kinsta cache purge y fresh-navigation readback quedaron documentados.
- [ ] Publicación, menú, index eligibility, receipt, tracking y verificación live se reportan como evidencias separadas; ninguna se infiere de otra.
- [ ] Scorecard premium alcanza promedio ≥4.5, ningún eje <4 y los ejes de jerarquía, surface economy, impacto, fidelidad y resistencia a template ≥4.5.

## Verification

- `pnpm task:lint --task TASK-1803`
- `pnpm ui:wireframe-check --task TASK-1803`
- `pnpm ui:flow-check --task TASK-1803`
- `pnpm ui:motion-check --task TASK-1803`
- `pnpm ui:readiness-check --task TASK-1803` antes de `UI ready: yes`
- `pnpm public-website:ssh-check` antes de cualquier Kinsta/WP-CLI
- `pnpm public-website:runtime-status`
- TASK-1803 configurator/verifier/rollback scripts a crear después de Discovery
- Playwright/GVC-style público: 1440/1280/390 + reduced motion + JS-off + keyboard + form states
- Public readback: HTML/head/schema/robots/canonical/menu/links/form receipt/cache-busted bundle
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate si se actualizan Handoff/changelog

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] landing registry/ref y mirrors `.codex/.claude` reflejan identity, modules, forms, guards, rollback y readbacks finales
- [ ] EPIC-019 y PRODUCT_ROADMAP reflejan estado real de la landing y páginas hermanas
- [ ] el cierre declara por separado commit, push, deploy, CMS save, cache purge, index eligibility, conversion receipt y live readback

## Follow-ups

- Si Slice 0 descubre una capability reusable faltante en Growth Forms/Meetings, crear task `backend-data` dependiente; no implementarla dentro de Elementor.
- Si el navegador `Define · Activa · Escala` demuestra reuso en tres o más landings, evaluar un módulo público compartido con ownership propio; no pre-crear primitive global.
- Si Brand Governance requiere producto/portal real, abrir discovery/product task separada; esta landing no autoriza simularlo.
- La ficha formal Branding as a Service en `docs/services/creative-services/` puede nacer cuando offer, pricing integrity, RACI y proof estén aprobados.

## Open Questions

- ¿El label público será `Branding`, `Branding Studio` o `Estrategia de marca`? Propuesta: menú `Branding`; eyebrow `Efeonce Branding Studio`; descriptor `Estrategia y sistemas de marca`.
- ¿La oferta de entrada es Brand Diagnostic pagado, evaluación inicial o reunión? No usar `diagnóstico` como promesa gratuita por defecto.
- ¿Qué dos o más casos tienen materiales, resultados y autorización suficientes para una narrativa de branding?
- ¿El slug `/branding/` gana contra `/agencia-branding/` después de investigación de intención y páginas legacy?
- ¿Agencia Creativa quedará como página conceptual separada de Producción o la arquitectura pública inmediata operará sólo Branding + Producción? Resolver sin renombrar TASK-1350 a ciegas.
