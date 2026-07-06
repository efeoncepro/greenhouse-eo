# TASK-1345 — Landing publica: desarrollo de sitios web

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1345-desarrollo-sitios-web-landing.md`
- Flow: `docs/ui/flows/TASK-1345-desarrollo-sitios-web-landing-flow.md`
- Motion: `docs/ui/motion/TASK-1345-desarrollo-sitios-web-landing-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Live WordPress landing v1; IA/form/legacy route follow-ups pending`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: `none`
- Branch: `develop` (operator override via `pnpm codex:task-hook TASK-1345 --develop`)

## Summary

Construye la landing publica de servicio "Diseno y desarrollo web" en el sitio publico de Efeonce. La ruta aspiracional de arquitectura sigue siendo `/servicios/diseno-desarrollo-web/`, pero el operador ajusto el slug productivo y la v1 quedo publicada en WordPress como `/desarrollo-sitios-web/`. La pagina captura demanda mid/bottom-funnel para empresas que buscan un sitio profesional y reencuadra el servicio como ingenieria de crecimiento: estrategia, diseno, desarrollo, SEO tecnico, performance y preparacion AI-ready. Usa el HTML Velo/v11 como referencia de implementacion y los docs importados de wireframe/flow como contrato canonico del repo. No crea backend nuevo: la conversion usa el contacto gobernado existente como fallback hasta que exista un Growth Form dedicado.

## Why This Task Exists

Hoy el sitio publico no tiene una landing de servicio dedicada para "diseno y desarrollo web" bajo una arquitectura de servicios gobernada. Existe una URL `/diseno-web/` que responde 200, pero el crawl inicial la identifica como archivo/categoria WordPress (`/category/diseno-web/`), no como pagina comercial canonicamente posicionada. La carpeta externa `diseno-web` ya contiene un boceto HTML Velo robusto, un wireframe y un flow de interlinks; falta absorberlos en la taxonomia documental de Greenhouse para ejecutar la landing sin improvisar posicionamiento, conversion ni rutas.

## Goal

- Publicar una landing de servicio en la ruta propuesta `/servicios/diseno-desarrollo-web/`, o documentar una decision distinta si el discovery de route ownership lo exige.
- Implementar el recorrido completo de 12 bloques: hero, "dos visitantes", metodo IDD, CTA intermedio, niveles AI-ready, "sale listo", segmentacion/jobs, performance, prueba, de-risk, FAQ, formulario y footer.
- Usar el HTML Velo/v11 como referencia visual y estructural, tomando de ahi lo reusable, pero sin copiarlo como artefacto productivo crudo.
- Convertir la pagina en nodo de demanda: CTA primario "Quiero cotizar", salida secundaria a agenda/WhatsApp y related links bajo FAQ.
- Alinear SEO/AEO: entidad Efeonce, JSON-LD `Service`/`Organization`/`FAQPage`/`BreadcrumbList`, answer-first copy y enlaces internos hacia AEO, SEO, CRM/RevOps, Think, hub de servicios y Loop Marketing segun disponibilidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/README.md`
- `docs/public-site/PRODUCT_ROADMAP.md`
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
- `docs/operations/public-site-route-ownership-matrix-20260616.md`
- `docs/context/05_voz-tono-estilo.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landing-workflow.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landing-registry.md`
- `.codex/skills/seo-aeo/efeonce/EFEONCE_AGENTIC_READINESS_FRAMEWORK.md`
- `.codex/skills/seo-aeo/efeonce/EFEONCE_OVERLAY.md`

Reglas obligatorias:

- Es sitio publico Efeonce, no portal Greenhouse: NO usar AXIS/MUI/`src/lib/copy` del portal como si fueran source of truth.
- User correction 2026-07-05: omitir Wave del posicionamiento/copy visible. La landing es de desarrollo de sitios web como servicio Efeonce; el HTML Velo/v11 y la landing AEO se usan solo como patrones adaptables.
- La ruta propuesta es `/servicios/diseno-desarrollo-web/`. Discovery debe tratar `/diseno-web/` como posible archivo/categoria legacy y decidir canonical, redirect o limpieza SEO.
- No publicar claims no verificables. El caso enterprise del boceto queda pendiente hasta tener prueba real autorizada.
- Si se usa el dato de Cloudflare, debe formularse con precision y fuente: bots/automatizacion en requests HTML, no "todo el trafico de internet son agentes IA".
- El CTA primario sobre la pagina debe ser uno: "Quiero cotizar". Los interlinks contextuales viven como texto/enlaces secundarios y el modulo de related services vive bajo FAQ.
- Full API Parity por reuso: la accion de negocio de captura/contacto debe consumir un contrato gobernado existente (Growth Forms/HubSpot/Meetings/WhatsApp). La landing no implementa una logica de negocio client-only como unica verdad.
- Voz: clara, mecanicista, sin "soluciones integrales", sin promesas vagas, sin exagerar IA. La idea fuerza es "sitios que trabajan como infraestructura comercial".

## Normative Docs

- `docs/ui/wireframes/TASK-1345-desarrollo-sitios-web-landing.md`
- `docs/ui/flows/TASK-1345-desarrollo-sitios-web-landing-flow.md`
- `docs/ui/motion/TASK-1345-desarrollo-sitios-web-landing-motion.md`

## Dependencies & Impact

### Depends on

- Skill `efeonce-public-site-wordpress` para discovery, backup, edicion, publicacion y verificacion del sitio publico.
- Decision de runtime/ruta: WordPress/Elementor actual vs rail Astro `efeonce-web` si el control plane publico lo exige.
- Conversion primitive `[verificar]`: Growth Forms portable renderer, HubSpot form, HubSpot Meetings o WhatsApp gobernado.
- URLs finales `[verificar]`: AEO landing, SEO landing `TASK-1343`, CRM/RevOps hub, Think AI visibility grader, hub de servicios y Loop Marketing.
- Fuente de prueba publicable `[verificar]`: casos Ghamadent, SKY y cualquier caso enterprise.

### Blocks / Impacts

- Habilita interlinks entrantes desde hub de servicios, AEO, SEO, Globe y Home.
- Alimenta el roadmap de servicios del sitio publico bajo EPIC-019.
- Puede requerir follow-up de route ownership si `/diseno-web/` debe redirigirse o dejar de indexarse como archivo.

### Files owned

- `docs/tasks/in-progress/TASK-1345-desarrollo-sitios-web-landing.md`
- `docs/ui/wireframes/TASK-1345-desarrollo-sitios-web-landing.md`
- `docs/ui/flows/TASK-1345-desarrollo-sitios-web-landing-flow.md`
- `docs/ui/motion/TASK-1345-desarrollo-sitios-web-landing-motion.md`
- Contenido de la pagina en el sitio publico (WordPress/Elementor o Astro) `[verificar]`
- `scripts/frontend/scenarios/public-desarrollo-sitios-web.capture.txt` `[verificar]`
- Registro de landing/ruta del sitio publico si el workflow lo exige `[verificar]`

## Current Repo State

### Already exists

- EPIC-019 como programa de control de landings publicas.
- PDR-003 para layering del ecosistema digital Efeonce.
- Growth Forms / HubSpot integration como ruta gobernada de captura, aunque el form especifico de esta landing debe confirmarse.
- Documentos externos de producto en la carpeta local `diseno-web`: wireframe, flow/interlinks y HTML Velo/v11. Esta task ya los adapta al formato canonico del repo.

### Gap

- No existe implementacion comercial canonica para esta landing.
- No existe pagina comercial canonicamente propuesta en `/servicios/diseno-desarrollo-web/`.
- `/diseno-web/` responde 200, pero apunta a una experiencia tipo archivo/categoria, no a la landing de servicio.
- Faltan decisiones finales de formulario, agenda, WhatsApp, URLs de interlinks y prueba enterprise.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: founder, gerente comercial, marketing manager u operador de crecimiento que necesita renovar o crear un sitio que venda.
- Momento del flujo: solution/product-aware; compara proveedores de web design/dev y busca una propuesta mas seria que "un sitio bonito".
- Resultado perceptible esperado: entiende que Efeonce construye un sitio como infraestructura comercial, no como brochure; decide cotizar o agendar.
- Friccion que debe reducir: miedo a comprar un sitio que queda lindo pero no mide, no convierte, no rankea y no queda preparado para IA/agentes.
- No-goals UX: no es pricing publico; no es portfolio completo; no es pagina AEO ni SEO; no crea un cotizador dinamico nuevo.

### Surface & system decision

- Surface: `efeoncepro.com/desarrollo-sitios-web/` publicada por decision operativa del 2026-07-05; `/servicios/diseno-desarrollo-web/` queda como ruta aspiracional/follow-up IA.
- Composition Shell: `no aplica` — es sitio publico, no portal Greenhouse.
- Primitive decision: `reuse` — patrones marketing del sitio publico, Ohio/Elementor/custom widgets existentes o rail Astro publico. El HTML Velo/v11 es blueprint, no primitive nueva.
- Adaptive density / The Seam: `no aplica` — patron del portal.
- Floating/Sidecar/Dialog decision: no aplica; pagina lineal con formulario/CTA.
- Copy source: contenido de pagina publica, adaptado de los docs externos y validado contra `docs/context/05_voz-tono-estilo.md`.
- Access impact: `none` (publica).

### State inventory

- Default: pagina renderizada, nav anchors activos, CTA primario visible y secciones completas.
- Loading: sin loading de pagina; el form embebido o widget de agenda tiene su propio loading.
- Empty: N/A, contenido curado.
- Error: error del form/agenda -> manejado por el renderer/servicio owner, con fallback visible.
- Degraded / partial: si el form no carga, mostrar link de contacto/WhatsApp/agenda gobernado; nunca dejar CTA muerto.
- Permission denied: N/A.
- Long content: pagina larga por diseno; scroll natural; sin scroll horizontal en 1440 y 390.
- Mobile / compact: stack 1-col, CTA claro, cards sin overflow, formulario usable.
- Keyboard / focus: nav, CTAs, FAQ y formulario alcanzables; focus visible.
- Reduced motion: reveals/hover sin transform bajo `prefers-reduced-motion`.

### Interaction contract

- Primary interaction: click "Quiero cotizar" -> scroll al formulario o abre/activa el form gobernado de cotizacion.
- Secondary interaction: "Prefiero agendar una llamada" / WhatsApp -> salida secundaria, nunca compite con el CTA principal sobre el cierre.
- Segment action: click "Producir a escala" -> preselecciona o contextualiza el job en el formulario si el form lo soporta; si no, solo hace scroll con contexto textual.
- Nav anchors: header fijo/anclas hacia metodo, niveles AI-ready, casos/FAQ y cotizar.
- FAQ: acordeon nativo o componente accesible equivalente.
- Interlinks: enlaces contextuales a AEO/SEO/CRM/Think/Loop sin romper el camino principal de conversion.

### Motion & microinteractions

- Motion primitive: `CSS` del sitio publico; no usar wrappers del portal.
- Enter / exit: hero fade+rise sutil; secciones reveal una vez si el runtime lo permite.
- Layout morph: ninguno.
- Stagger: corto en hero/cards.
- Timing / easing token: 75/150/200/300/400ms; ease-out `cubic-bezier(0.2,0,0,1)`.
- Reduced-motion fallback: contenido visible sin animacion.
- Non-goal motion: scroll-jacking, hero video pesado, loops infinitos, gradientes animados decorativos.

### Implementation mapping

- Route / surface: `efeoncepro.com/desarrollo-sitios-web/` publicada; ruta aspiracional original `/servicios/diseno-desarrollo-web/` pendiente de decision IA.
- Primitive / variant / kind: patrones marketing public-site; reuse de widgets existentes.
- Component candidates: secciones Elementor/Ohio o componentes Astro; form/agenda gobernado; FAQ; JSON-LD.
- Copy source: contenido de pagina publica, no `src/lib/copy`.
- Data reader / command: ninguno nuevo.
- API parity: satisfecha por reuso de Growth Forms/HubSpot/Meetings/WhatsApp; no hay endpoint ad hoc de cotizacion.
- Access / capability: publica, sin capability.
- States to implement: default, degraded fallback, mobile, focus, reduced-motion, form error/success si el renderer lo expone.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-desarrollo-sitios-web.capture.txt`
- Route: preview/staging de la pagina publica.
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; navegar por anchors; abrir 1 FAQ; activar CTA primario; validar fallback/estado del form; probar secondary CTA.
- Required captures: full-page desktop + mobile; hero; metodo IDD; niveles AI-ready; segmentacion; proof; FAQ abierto; formulario.
- Required `data-capture` markers: `hero`, `two-visitors`, `method`, `architecture-cta`, `ai-ready`, `segments`, `performance`, `proof`, `faq`, `conversion-form`.
- Assertions: H1 presente; CTA primario accionable; sin placeholder enterprise; sin scroll horizontal; canonical correcto; form/fallback visible.
- Scroll-width checks: `document.scrollingElement.scrollWidth <= clientWidth` en 1440 y 390.
- Accessibility/focus checks: focus ring visible en CTAs/FAQ/form; contraste AA en bandas.

### Design decision log

- Decision: crear spoke de servicio bajo `/servicios/diseno-desarrollo-web/`, separando una pagina comercial canonica de la URL legacy `/diseno-web/` que hoy parece archivo/categoria.
- Decision: adaptar el HTML Velo/v11 como referencia de implementacion porque ya captura jerarquia, copy base y visual direction, pero rehacerlo sobre el runtime/patrones del sitio publico.
- Decision: mantener un unico CTA principal hasta el formulario; los interlinks son secundarios y el modulo de related services va bajo FAQ para no fugar conversion temprano.
- Decision: tratar "AI-ready" como preparacion tecnica/estructural del sitio, no como claim magico de IA.
- Alternatives considered: usar `/diseno-web/` sin discovery (riesgo SEO/categoria), copiar HTML estatico completo (rompe workflow y gobernanza), lanzar sin form gobernado (viola parity).
- Open risks: URL final de hub de servicios/CRM/Think; caso enterprise no autorizado; form final; route ownership de `/diseno-web/`.

### Execution update — live v1 2026-07-05

- Hook aplicado: `pnpm codex:task-hook TASK-1345 --develop`.
- Operador ajusto la pagina en WordPress antes del build final: se elimino el sidebar y el slug quedo como `/desarrollo-sitios-web/`.
- Runtime verificado: WordPress/Kinsta, page ID `250816`, status `publish`, slug `desarrollo-sitios-web`, permalink `https://efeoncepro.com/desarrollo-sitios-web/`.
- Correccion de rail 2026-07-05: la primera publicacion quedo por error como bloque Gutenberg `custom-html`; el estado vigente fue convertido a documento Elementor real con `Document::save()`, `_elementor_edit_mode=builder`, hero nativo `wdhero` y contenido gobernado debajo `wdrest`, con `post_content` vacio.
- Visual vigente: hero full-bleed estilo AEO dark/two-column con `ohio_badge` (`wdtag`), `ohio_heading` (`wdtitle`, `heading_tag=h1`, `subtitle_type_layout=without_subtitle`), `ohio_button` (`wdbut`) y proof row; el card estatico `AI engine` (`wdans`) fue retirado y queda el contenedor `wdvis` como slot para una animacion posterior; sin breadcrumb/headline nativo Ohio visible.
- Backups WordPress antes de mutaciones live:
  - `_gh_backup_before_task1345_landing_20260705T203255Z`
  - `_gh_backup_before_task1345_landing_20260705T203338Z`
  - `_gh_backup_before_task1345_reference_align_20260705T204920Z`
  - `_gh_backup_before_task1345_elementor_convert_20260705T205610Z`
  - `_gh_backup_before_task1345_native_aeo_hero_20260705T210712Z`
  - `_gh_backup_before_task1345_native_header_css_cleanup_20260705T214905Z`
  - `_gh_backup_before_task1345_restore_sanitized_content_css_20260705T215102Z`
  - `_gh_backup_before_task1345_remove_hero_answer_visual_20260705T220147Z`
  - `_gh_backup_before_task1345_premium_two_visitors_section_20260705T220756Z` (rollback limpio antes del rediseño premium de la seccion)
  - `_gh_backup_before_task1345_premium_two_visitors_section_20260705T220906Z` (backup antes del save efectivo corregido)
  - `_gh_backup_before_task1345_premium_two_visitors_section_20260705T221320Z` (backup antes del compactado visual de la seccion)
  - `_gh_backup_before_task1345_premium_two_visitors_section_20260705T221607Z` (backup antes del compactado v2)
  - `_gh_backup_before_task1345_premium_two_visitors_section_20260705T221818Z` (backup antes del fix de tracking del H2 display)
  - `_gh_backup_before_task1345_hero_factory_animation_slot_20260705T222835Z` (backup antes del fix de ancho/fit para la animacion del hero en `wdvis`)
  - `_gh_backup_before_task1345_hero_factory_premium_v2_20260705T224535Z` (backup antes de retirar el sweep luminoso y ajustar escala/motion del Hero Factory)
  - `_gh_backup_before_task1345_hero_premium_mobile_polish_20260705T224931Z` (backup antes del polish mobile de proof pills + escala hero)
  - `_gh_backup_before_task1345_hero_premium_mobile_polish_20260705T225242Z` (backup antes del polish final que oculta tags moviles del hero visual)
  - `_gh_backup_before_task1345_hero_premium_system_v5_20260705T230250Z` (backup antes del polish integral de ritmo, CTA/proof y visual del hero)
  - `_gh_backup_before_task1345_hero_premium_system_v6_20260705T230626Z` (backup antes del override final de ritmo mobile sobre reglas legacy `!important`)
  - `_gh_backup_before_task1345_hero_premium_system_v7_20260705T230933Z` (backup antes del detalle final: tags del visual ocultos en todos los viewports y frase IDD sin corte en guion)
  - `_gh_backup_before_task1345_method_premium_v1_20260706T023637Z` (backup antes del polish enterprise de la seccion `how` / `data-capture="method"`)
  - `_gh_backup_before_task1345_hero_premium_system_v8_20260706T023818Z` (backup antes del polish enterprise final del hero: fondo, badge, CTA, proof y visual)
  - `_gh_backup_before_task1345_hero_motion_integration_v9_20260706T025745Z` (backup antes del primer intento de integrar la animacion al degradado nativo)
  - `_gh_backup_before_task1345_hero_motion_integration_v9_20260706T025839Z` (backup antes del save efectivo de motion integration v9)
  - `_gh_backup_before_task1345_hero_motion_integration_v9_20260706T030148Z` (backup antes del refinamiento visual v9)
  - `_gh_backup_before_task1345_hero_native_gradient_v10_20260706T030449Z` (backup antes de retirar el fondo/degradado local del Hero Factory)
  - `_gh_backup_before_task1345_hero_visual_balance_v11_20260706T031357Z` (backup antes de aumentar la altura del canvas visual)
  - `_gh_backup_before_task1345_hero_column_balance_v12_20260706T031657Z` (backup antes de corregir proporciones copy/visual)
  - `_gh_backup_before_task1345_hero_right_block_v13_20260706T033232Z` (backup antes de reestructurar el bloque derecho del hero como sistema de produccion)
  - `_gh_backup_before_task1345_hero_right_block_v14_20260706T033636Z` (backup antes del primer refinamiento v14; intento parcial CSS, sin cambio efectivo de HTML por bug de referencia)
  - `_gh_backup_before_task1345_hero_right_block_v14_20260706T033901Z` (backup antes del save efectivo v14 sin grain/fondo local)
  - `_gh_backup_before_task1345_levels_premium_v1_20260706T040046Z` (backup antes de convertir el CTA intermedio + niveles AI-ready a modulo premium)
  - `_gh_backup_before_task1345_levels_premium_v1_20260706T040351Z` (backup antes del compactado de ritmo/altura de niveles)
  - `_gh_backup_before_task1345_levels_premium_v1_20260706T041019Z` (backup antes del ajuste mobile para evitar solape con switcher flotante global)
- Header/hero alignment update 2026-07-05: se limpiaron reglas legacy en `_elementor_page_settings.custom_css` que tocaban `#content`, `.page-container`, `.elementor-250816`, `#site-navigation`, page headline/breadcrumbs y wrappers globales. Se restauro el CSS scoped de contenido `.gh-v11` desde backup para no romper secciones post-hero, pero sanitizado sin los selectores prohibidos. El header queda gobernado por metas Ohio + tema; Elementor mantiene solo su scoping nativo generado `.elementor-250816 .elementor-element-*`.
- Hero visual update 2026-07-05: por pedido del operador se elimino el widget HTML `wdans` (`gh-web-answer-widget`, md5 `08a35b2f91d26dd534ad1c6b935fed7d`) del contenedor `wdvis` via Elementor `Document::save()`. `wdvis` permanece como slot vacio para una animacion futura; no se tocaron header, wrappers, metadata SEO ni copy.
- Hero animation update 2026-07-05: el slot `wdvis` ahora contiene el widget HTML `whfd06a1` con la animacion "Hero Factory" basada en el demo local `ai-generations/2026-07-05_task-1345-hero-interface/hero-factory-demo-v2.html`. Se corrigio el fallo del intento previo: el widget existia, GSAP cargaba, pero el item Elementor calculaba `width:0`; se agrego CSS page-scoped `task-1345-hero-factory-animation-slot-v1` para dar ancho real y fit responsive al widget dentro de `.gh-web-hero-visual`, sin tocar `#masthead`, `#content`, `.page-container`, `.elementor-250816`, `#site-navigation` ni scripts de header/wrapper.
- Hero premium/native-gradient/right-block update 2026-07-05/06: se removio desde la fuente del widget el elemento/tween `ghf-sweep` / `[data-sweep]` que generaba la luz diagonal pasajera, y se ajusto el Hero Factory para leer mas integrado: motion mas pausado, tarjetas mas compactas, proof pills mobile ordenadas y tags `Humano/Agente` ocultos en todos los viewports por legibilidad. Tras feedback visual, la version vigente `v14` elimina el fondo/degradado propio de la animacion (`ghf-field`, `ghf-floor`, `ghf-glow`, `ghf-grain`) para que el widget viva directamente sobre el degradado global del hero, y reestructura el bloque derecho como sistema enterprise: motor humano+agente, rail funcional `Spec / Build / QA`, nodos de proceso, estacion de armado y delivery card con pills `SEO/AEO/IA`. CSS vigente adicional: `task-1345-hero-right-block-v14`, sobre el overlay editorial `task-1345-hero-premium-system-v8`; desktop slot `541x634`, mobile slot `310x347`, sin sweep/scan/fondo local. Todo page-scoped a hero/visual/proof, sin tocar header/wrappers Ohio ni metadata/copy.
- Method premium update 2026-07-06: la seccion `how` fue marcada como `how-premium` + `data-capture="method"` y pulida con CSS `task-1345-method-premium-v1`: contraste corregido (H2 blanco), tracking normal en el display de esta zona, cards de fase con profundidad sobria, callout `La sala de maquinas` mas ejecutivo, hover compositor-only y reduced-motion sin lift. Mutacion via Elementor `Document::save()`; CSS solo scoped a `.gh-v11 .how.how-premium...`, sin tocar header/wrappers Ohio, metadata ni scripts.
- CTA/niveles premium update 2026-07-06: el CTA intermedio quedo como `strip strip-premium` con `data-capture="architecture-cta"` y la seccion de madurez AI-ready quedo como `levels levels-premium` con `data-capture="ai-ready"` y CSS `task-1345-levels-premium-v1`. Mantiene el framework Efeonce `Be Found / Be Readable / Be Correct / Be Actionable / Be Intrinsic`, agrega la nota honesta de trayectoria ("no se promete como un interruptor") y usa microinteracciones compositor-only en CTA/cards, con reduced-motion sin lift. Ajuste mobile final: padding derecho interno en note/cards/footer para que el switcher flotante global no tape texto critico. CSS solo scoped a `.gh-v11 .strip.strip-premium...` y `.gh-v11 .levels.levels-premium...`; no toca header/wrappers Ohio ni metadata.
- Two-visitors premium update 2026-07-05: se rediseño la seccion `sig` como `sig-premium` con `data-capture="two-visitors"`, manteniendo el alma del mensaje "dos visitantes" pero elevando la composicion a comparativa premium humano/agente: header editorial, chips de senales, tarjetas `reader-card` human/agent, puente "Mismo sitio / dos decisiones" y proof/stat final. Mutacion via Elementor `Document::save()`; CSS solo scoped a `.gh-v11 .sig...`, sin tocar header, wrappers, metadata ni scripts.
- Two-visitors compact/typography update 2026-07-05: tras feedback del operador, se compacto el modulo para que no leyera gigante y se corrigio el tracking conocido del H2 display. Contrato vigente: `.gh-v11 .sig.sig-premium h2` computa `letter-spacing:-.045em`, el `em` teal hereda ese tracking, y body/chips/cards mantienen tracking normal/0.
- SEO publicado:
  - Yoast title: `Desarrollo de sitios web | Efeonce`
  - Yoast metadescription: `Diseñamos y desarrollamos sitios web rápidos, claros y preparados para vender, medir, rankear en buscadores y ser entendidos por IA.`
  - Canonical: `https://efeoncepro.com/desarrollo-sitios-web/`
  - OG/Twitter title y description alineados.
  - `noindex` removido; robots live confirma `index, follow`.
- Structured data: se agregaron `Service` y `FAQPage` page-scoped. Yoast mantiene `WebPage`, `BreadcrumbList`, `WebSite` y `Organization`; no se duplican desde el bloque custom.
- Conversion: CTA primario y CTA final apuntan a `https://efeoncepro.com/contacto/?utm_source=landing_desarrollo_sitios_web&utm_medium=web&utm_campaign=task_1345`. No se creo backend ni form nuevo.
- Cache: Kinsta purgado con `wp kinsta cache purge --all`.
- Verificacion live:
  - HTTP 200 en `/desarrollo-sitios-web/`.
  - HTML live confirma title/meta/canonical/OG/Twitter, custom CSS, CTA y JSON-LD.
  - Sin texto visible `Wave`, sin placeholder `TASK-1345`, sin CTA muerto.
  - Playwright desktop 1440 y mobile 390: `scrollWidth == clientWidth`, hero 0->viewport, H1 real via `ohio_heading`, CTA/FAQ presentes, schema types `Service` + `FAQPage` presentes, Elementor presente, Gutenberg ausente.
  - Capturas miradas: `.captures/task-1345-desarrollo-sitios-web-native-aeo-hero/desktop-final.png` y `.captures/task-1345-desarrollo-sitios-web-native-aeo-hero/mobile-final-390.png`.
  - Re-verificacion post-cleanup: `.captures/task-1345-header-hero-probe/desktop-web.png`, `.captures/task-1345-header-hero-probe/mobile390-web.png` y `.captures/task-1345-header-hero-probe/probe.json`. Resultado: `#masthead.header-3.light-typo` nativo, `with-spacer=false`, `with-breadcrumbs=false`, `heroTop=0`, `scrollWidth-clientWidth=0` en 1440 y 390, sin `#masthead`/`#content`/`.page-container`/`#site-navigation` en `custom_css`.
  - Re-verificacion post-remove visual: `tmp/task1345_inspect_web_hero_visual.php` confirma `wdans` ausente y `wdvis` presente; `tmp/task1345_find_elementor_css_sources.php` devuelve `elementHits=[]` y `pageSettingsHits=[]`; Playwright live 1440 + 390 confirma sin overflow, sin `with-spacer`, sin `with-breadcrumbs`, header Ohio nativo y capturas actualizadas en `.captures/task-1345-header-hero-probe/desktop-web.png` y `mobile390-web.png`.
  - Re-verificacion post-hero-animation: Playwright live confirma `hasGhf=true`, `gsap=true`, `cards>=2`, `scrollWidth-clientWidth=0`, sin errores de consola, desktop slot `459.125x490`, mobile slot `310x358.796875`, reduced-motion con estado final estatico. Header probe confirma `with-spacer=false`, `with-breadcrumbs=false`, `#masthead.header-3.light-typo`, `position:absolute`, `heroTop=0` y overflow `0` en desktop/mobile. Capturas: `.captures/task-1345-hero-animation-live/desktop.png`, `.captures/task-1345-hero-animation-live/mobile390.png`, `.captures/task-1345-hero-animation-live/desktop-reduced.png`, `.captures/task-1345-hero-animation-live/mobile390-visual.png` y `.captures/task-1345-header-hero-probe/`.
  - Re-verificacion post-hero-premium: `tmp/task1345_dump_hero_factory_widget.php` confirma widget `whfd06a1`, md5 `63e6cf6b8cbc80be695a3ccd7b538409`, `hasGhfSlot=true`, `hasSweepTween=false`; el elemento sweep ya no existe en DOM live. `tmp/task1345_find_elementor_css_sources.php` devuelve `elementHits=[]` y `pageSettingsHits=[]`. `tmp/task1345_hero_premium_probe.mjs` confirma desktop/mobile/reduced: `premium=true`, `sweepEl=false`, `scriptSweepHits=0`, `gsap=true`, `overflow=0`, `withSpacer=false`, `withBreadcrumbs=false`, header `header-3 light-typo` nativo, desktop slot `459x470`, mobile slot `310x294`, reduced-motion estatico. Medicion mobile final: hero `1326px` (antes `1445px`), H1 `196px` (antes `270px`), visual inicia en `988px`, `scrollWidth-clientWidth=0`. Capturas finales: `.captures/task-1345-hero-premium-v2/desktop.png`, `mobile390.png`, `desktop-reduced.png`, `mobile390-visual.png`, `probe.json`. Console warning observado: WebGL `ReadPixels` de Chrome headless, no originado por el widget.
  - Re-verificacion post-hero-v8/method-premium: `tmp/task1345_hero_method_probe.mjs` confirma desktop/mobile390/reduced `overflow=0`, `methodPremium=true`, `methodMarker=true`, `sweepEl=false`, `scriptSweepHits=0`, `withSpacer=false`, `withBreadcrumbs=false`, header Ohio nativo `header-3 light-typo`, hero desktop `1440x949`, hero mobile `390x1312`, slot desktop `459x470`, slot mobile `310x286`, method desktop `1400x1036`, method mobile `350x1637`. Fuente WP confirma marcadores `task-1345-method-premium-v1` y `task-1345-hero-premium-system-v8`. Capturas: `.captures/task-1345-hero-method-premium-v8/desktop-hero.png`, `desktop-method.png`, `mobile390-hero.png`, `mobile390-method.png`, `desktop-reduced-hero.png`, `desktop-reduced-method.png`, `probe.json`.
  - Re-verificacion post-hero-v12 native-gradient/column-balance: `tmp/task1345_hero_motion_v9_probe.mjs` confirma desktop/mobile390/reduced `version=v12`, `localBg=false`, `sweepEl=false`, `scanEl=false`, `scriptSweepHits=0`, `overflow=0`, `withSpacer=false`, `withBreadcrumbs=false`, header Ohio nativo `header-3 light-typo`, CSS activo `task-1345-hero-column-balance-v12`, widget `whfd06a1` md5 `8aef758981f266690b75d7066e70c3f9`, desktop slot `527x619`, mobile slot `310x334`, reduced-motion estatico. Capturas: `.captures/task-1345-hero-column-balance-v12/desktop-entry.png`, `desktop-flow.png`, `desktop-settled.png`, `mobile390-flow.png`, `desktop-reduced-static.png`, `probe.json`.
  - Re-verificacion post-hero-v14 right-block premium: `tmp/task1345_dump_hero_factory_widget.php` confirma widget `whfd06a1`, md5 `74088d990f27b5c0dc626cd555b5b16f`, `.ghf-slot-right-v14`, `data-task1345-hero-premium="v14"`, sin `ghf-grain` ni sweep. `tmp/task1345_find_elementor_css_sources.php` devuelve `elementHits=[]` y `pageSettingsHits=[]`. `tmp/task1345_hero_motion_v9_probe.mjs` confirma desktop/mobile390/reduced `version=v14`, `localBg=false`, `sweepEl=false`, `scanEl=false`, `scriptSweepHits=0`, `overflow=0`, `withSpacer=false`, `withBreadcrumbs=false`, header Ohio nativo `header-3 light-typo`, CSS activo `task-1345-hero-right-block-v14`, desktop slot `541x634`, mobile slot `310x347`, reduced-motion estatico con `signals=3/3`, `nodesOn=3` y `liveCards=3`. Capturas: `.captures/task-1345-hero-right-block-v14/desktop-entry.png`, `desktop-flow.png`, `desktop-settled.png`, `mobile390-flow.png`, `desktop-reduced-static.png`, `probe.json`.
  - Re-verificacion post-two-visitors premium/compact/typography: `tmp/task1345_two_visitors_probe.mjs` confirma HTTP 200, `hasPremium=true`, `hasLegacyPane=false`, `scrollWidth-clientWidth=0`, `consoleErrors=0`, seccion `1400x1041` desktop y `350x1958` mobile 390. Probe tipografico confirma H2 `letter-spacing=-2.31984px` desktop y `-1.63215px` mobile, con `emLetterSpacing` heredado igual. Capturas: `.captures/task-1345-two-visitors-premium/desktop-two-visitors.png`, `.captures/task-1345-two-visitors-premium/mobile390-two-visitors.png` y `probe.json`.
  - Re-verificacion post-CTA/niveles premium: `tmp/task1345_find_elementor_css_sources.php` devuelve `elementHits=[]` y `pageSettingsHits=[]`; fuente WP confirma `strip-premium`, `levels-premium`, `data-capture="architecture-cta"`, `data-capture="ai-ready"` y CSS `task-1345-levels-premium-v1`. Playwright live confirma desktop/mobile390/reduced `overflow=0`, `withSpacer=false`, `withBreadcrumbs=false`, header Ohio nativo `header-3 light-typo`, strip desktop `1400x189`, levels desktop `1400x1401`, strip mobile `350x299`, levels mobile `350x2231`, 5 cards, reduced-motion con `transition:none`, y mobile `firstCardPaddingRight=44px` para proteger texto del switcher flotante. Capturas: `.captures/task-1345-levels-premium-v1-final/desktop-architecture-cta-element.png`, `desktop-ai-ready-element.png`, `desktop-actionable-hover.png`, `mobile390-architecture-cta-element.png`, `mobile390-ai-ready-element.png`, `probe.json`.

### Remaining follow-ups after live v1

- Decidir si la IA final debe mantener `/desarrollo-sitios-web/` o migrar a `/servicios/diseno-desarrollo-web/` con redirect/canonical.
- Resolver `/diseno-web/` legacy: redirect, canonical, noindex o decision documentada segun ownership real.
- Crear Growth Form dedicado o conectar HubSpot/Meetings/WhatsApp gobernado; hoy el fallback aprobado es `/contacto/`.
- Crear scenario durable `scripts/frontend/scenarios/public-desarrollo-sitios-web.capture.txt` si la landing entra al loop GVC formal.
- Correr Rich Results Test externo y Search Console post-indexacion.
- Siguiente deuda visual prioritaria: `section.ready` / "Incluido siempre" ("Sale listo para que te encuentren —y para medirlo.") todavia conserva tratamiento mas plano que hero, `sig`, `how`, CTA y niveles.

### Visual verification

- GVC scenario: `public-desarrollo-sitios-web`
- Viewports: 1440 + 390.
- Required captures: full-page + secciones clave + FAQ abierto + formulario/fallback.
- Required `data-capture` markers: `hero`, `two-visitors`, `method`, `architecture-cta`, `ai-ready`, `segments`, `performance`, `proof`, `faq`, `conversion-form`.
- Scroll-width check: si, ambos viewports.
- Accessibility/focus checks: focus ring, contraste AA, FAQ keyboard.
- Before/after evidence: si se reemplaza o redirige `/diseno-web/`, capturar before de la ruta legacy.
- Known visual debt: boceto HTML Velo/v11 usa CSS hardcodeado y placeholders; el build final debe tokenizar/adaptar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Discovery & Plan — 2026-07-05

### Hook / execution context

- Hook aplicado: `pnpm codex:task-hook TASK-1345 --develop`.
- La task se toma en `develop` por override explicito del operador; no se crea rama ni worktree.
- Subagentes: no autorizados por ahora.
- Alcance inmediato pedido por operador: analizar la task completa y crear una pagina/superficie de trabajo para iterar la landing; no publicar la landing final todavia.

### Product correction

- Decision: la landing deja de hablar de Wave. La oferta visible queda como `desarrollo de sitios web` de Efeonce.
- Decision: el HTML Velo/v11 de `/Users/jreye/Documents/diseno-web/wave-diseno-web-boceto-v11.html` queda como blueprint historico de estructura/jerarquia, no como marca, copy final ni CSS/JS productivo.
- Decision: la landing AEO sirve como patron de ejecucion para una pagina de servicio: SEO metadata gobernada, narrativa answer-first, proof honesto, FAQ, CTA principal unico y form/contacto gobernado.

### Runtime / route stance

- Rail actual: WordPress/Kinsta con Elementor/Ohio como runtime productivo del sitio publico.
- Rail objetivo documentado: Astro publico/`efeonce-web`, aun no usado para publicar esta superficie.
- Ruta canonica aspiracional: `/servicios/diseno-desarrollo-web/`.
- Work surface de esta toma: crear pagina borrador/noindex en WordPress para trabajar la landing sin competir SEO ni activar una ruta canonica antes del discovery de `/diseno-web/` y `/servicios/`.
- Work surface creada: WordPress page ID `250816`, status `draft`, slug `task-1345-desarrollo-sitios-web`, edit URL `https://efeoncepro.com/wp-admin/post.php?post=250816&action=edit`, preview `http://efeoncepro.com/?page_id=250816&preview=true`, Yoast noindex `1`.
- Route probe al crearla: `/servicios/`, `/servicios/diseno-desarrollo-web/` y `/diseno-web/` no resuelven a page ID; `/aeo-2/` resuelve a page `250265`. Por ahora no hay redirect/canonical aplicado.

### Plan de ejecucion

1. Sincronizar lifecycle/documentos TASK-1345 a `in-progress` y quitar Wave del contrato visible.
2. Crear o reutilizar una pagina WordPress borrador con metadata `_gh_task_id=TASK-1345`, noindex y slug de trabajo.
3. Registrar en Handoff la pagina creada, estado no publicado, rollback y decisiones de reuse AEO/Velo.
4. Correr checks documentales/UI minimos: task lint, wireframe/flow/motion/readiness, ops lint changed.
5. Mantener como pendiente el build final, canonical/redirect de `/diseno-web/`, JSON-LD, form real, GVC y publicacion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery de sitio, ruta y conversion

- Verificar en vivo `/diseno-web/`, `/servicios/diseno-desarrollo-web/`, `/servicios/`, sitemap y canonical actuales.
- Decidir runtime de implementacion (WordPress/Elementor vs Astro rail) con la skill `efeonce-public-site-wordpress`.
- Definir canonical/redirect/noindex si `/diseno-web/` debe dejar de comportarse como archivo indexable.
- Elegir conversion primitive gobernado: Growth Forms, HubSpot form, Meetings o WhatsApp; registrar fallback.

### Slice 2 — Adaptacion de contrato UI/copy

- Ajustar wireframe, flow y motion si Slice 1 cambia ruta, form o URLs.
- Finalizar copy visible del ledger con `copywriting`/voz Efeonce, sin claims no probados.
- Resolver proof: Ghamadent, SKY y enterprise case `[verificar]`.
- Resolver interlinks: AEO, SEO `TASK-1343`, CRM/RevOps, Think, hub de servicios, Loop Marketing.

### Slice 3 — Build de la landing

- Implementar los bloques canonicos del wireframe en el runtime elegido.
- Reusar estructuras/patrones del sitio publico; tomar del HTML Velo/v11 lo que sirva en contenido/jerarquia, no su CSS/JS crudo.
- Agregar anchors, `data-capture` markers, heading order y FAQ accesible.

### Slice 4 — Conversion, SEO/AEO y structured data

- Cablear CTA/form/fallback gobernado.
- Implementar JSON-LD `Service`, `Organization`, `FAQPage`, `BreadcrumbList` alineado al contenido visible.
- Implementar canonical, title/meta description, internal links y related services bajo FAQ.

### Slice 5 — Verificacion visual/runtime + registro

- Ejecutar GVC desktop/mobile/reduced-motion y scroll-width checks.
- Verificar formulario/fallback, nav anchors, FAQ, secondary CTA y no placeholder enterprise.
- Registrar ruta/landing segun workflow publico y actualizar docs necesarios.

## Out of Scope

- Crear backend nuevo de cotizacion.
- Crear una pagina hub de servicios completa si no existe; se deja como dependency/follow-up.
- Implementar la landing SEO `TASK-1343` o la landing AEO sibling.
- Migrar todo el sitio publico a Astro.
- Crear pricing dinamico, calculadora o configurador.
- Inventar nuevos casos/metricas de clientes sin fuente aprobada.

## Detailed Spec

La landing debe seguir el wireframe canonico `TASK-1345-desarrollo-sitios-web-landing.md`. La narrativa base es: un sitio ya no atiende solo a humanos; tambien lo leen buscadores, modelos de IA, crawlers y agentes. Efeonce opera un proceso de diseno y desarrollo que produce un sitio rapido, claro, medible, SEO-ready, AI-ready y preparado para performance. El metodo IDD organiza el servicio: investigar, disenar/desarrollar, desplegar/medir. El cierre convierte con un CTA principal de cotizacion y una salida secundaria honesta.

El HTML Velo/v11 contiene estructura y copy aprovechable, pero tambien deuda: CSS hardcodeado, JS local de formulario, base64/logo embebido, anchors `#`, placeholders de proof y claims que requieren precision. El implementador debe extraer jerarquia, layout intent, textos candidatos y estados, no copiar el archivo como pagina final.

## Rollout Plan & Risk Matrix

Cambio aditivo de contenido publico. Riesgo bajo/medio por SEO, conversion y proof.

### Slice ordering hard rule

- Slice 1 (discovery ruta/runtime/conversion) debe cerrar antes del build.
- Slice 2 (copy/proof/interlinks) debe cerrar antes de publicar contenido indexable.
- Slice 4 (structured data) no puede separarse del contenido visible final.
- No publicar con placeholder enterprise ni con CTA `href="#"`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `/diseno-web/` indexado como categoria compite con la landing nueva | SEO / publico | medium | Discovery + canonical/redirect/noindex documentado | GSC muestra pagina de archivo para query comercial |
| CTA/form final queda client-only o roto | Growth Forms / HubSpot / publico | medium | Reusar contrato gobernado + fallback visible | Submit no llega a HubSpot / consola CORS |
| Claim enterprise o Cloudflare se publica sin precision | Marca / legal / SEO | medium | Proof gate en Slice 2; fuente o removal | Revision humana rechaza copy |
| Interlinks tempranos fugan conversion | CRO / publico | low | Contextual links discretos; related bajo FAQ | CTA final pierde foco / mapas de click |
| HTML Velo/v11 se copia crudo y genera deuda responsive/perf | UI / publico | medium | Reimplementar sobre runtime/patrones; GVC 1440+390 | Scroll horizontal, CLS, CSS conflict |

### Feature flags / cutover

- Sin flag — cambio de contenido publico aditivo. Cutover = publicar pagina y canonical/redirect asociado.
- Revert: despublicar pagina (WordPress draft) o revert PR (Astro), purgar cache/CDN. Tiempo de revert: minutos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A discovery | — | si |
| Slice 2 | Revertir copy/docs antes de publish | <10 min | si |
| Slice 3 | Despublicar pagina o revert PR | <10 min | si |
| Slice 4 | Quitar JSON-LD/canonical/redirect si falla validacion | <10 min | si |
| Slice 5 | Capturas/registro no productivos; corregir y recapturar | <15 min | si |

### Production verification sequence

1. Confirmar runtime, ruta, canonical y destino del form en staging/preview.
2. Publicar preview noindex o borrador accesible para QA.
3. Ejecutar GVC desktop/mobile/reduced-motion, scroll-width y revision visual humana.
4. Validar CTA primario, secondary CTA, formulario/fallback y FAQ.
5. Validar JSON-LD en Rich Results Test y canonical/meta.
6. Publicar productivo, purgar cache y verificar 200/canonical.
7. Solicitar indexacion y monitorear GSC/HubSpot conversion.

### Out-of-band coordination required

- Acceso/edicion del sitio publico WordPress/Elementor o repo Astro externo segun discovery.
- Confirmacion comercial de casos/proof publicables.
- Confirmacion de agenda/WhatsApp/form final y routing HubSpot.
- Search Console post-publish.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] La pagina publica de "Diseno y desarrollo web" existe en una ruta canonica documentada: `https://efeoncepro.com/desarrollo-sitios-web/`. La ruta ideal `/servicios/diseno-desarrollo-web/` queda como follow-up IA.
- [x] La task declara `Execution profile: ui-ux`, `UI impact: flow`, `UI ready: no`, y tiene Wireframe/Flow/Motion existentes.
- [x] El HTML Velo/v11 fue usado como referencia de implementacion, no copiado como artefacto crudo con CSS/JS locales sin gobierno.
- [x] La pagina implementa los bloques canonicos: hero, dos visitantes, IDD, CTA intermedio, niveles AI-ready, sale listo, segmentacion, performance, proof, de-risk, FAQ, conversion fallback y footer.
- [x] CTA primario "Quiero cotizar" entrega a contacto gobernado con UTM; no hay anchors `#` ni CTA muerto.
- [x] CTA secundario agenda/WhatsApp esta removido hasta tener destino real.
- [x] No hay placeholder enterprise ni claims de proof sin aprobacion.
- [x] El dato de Cloudflare no se usa en la v1.
- [x] Interlinks internos implementados parcialmente: AEO y About us vivos; SEO/CRM/Think/hub/Loop quedan sujetos a rutas live.
- [x] JSON-LD `Service`/`FAQPage` agregado; `Organization`/`BreadcrumbList` quedan via Yoast y se verifican en HTML live.
- [ ] `/diseno-web/` legacy queda tratado por canonical/redirect/noindex/decision documentada.
- [x] Desktop 1440 + mobile 390 capturado con Playwright y mirado; sin scroll horizontal. Focus/reduced-motion quedan para el scenario GVC durable.
- [x] Ruta/landing registrada en los docs public-site aplicables.

## Verification

- `pnpm task:lint --task TASK-1345`
- `pnpm ui:wireframe-check --task TASK-1345`
- `pnpm ui:flow-check --task TASK-1345`
- `pnpm ui:motion-check --task TASK-1345`
- `pnpm ui:readiness-check --task TASK-1345`
- Playwright live ad hoc: `.captures/task-1345-desarrollo-sitios-web-native-aeo-hero/desktop-final.png` y `.captures/task-1345-desarrollo-sitios-web-native-aeo-hero/mobile-final-390.png`
- `pnpm fe:capture public-desarrollo-sitios-web --env=<preview> --gif` `[pendiente si se crea scenario durable]`
- Playwright/manual: `scrollWidth <= clientWidth` en 1440 y 390.
- Google Rich Results Test para JSON-LD.
- Smoke real de formulario/fallback hacia HubSpot/Meetings/WhatsApp.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [x] Se actualizo el registro/ownership de rutas del sitio publico si la landing fue publicada.
- [ ] Se documento la decision final sobre `/diseno-web/`.

## Follow-ups

- Crear/ordenar hub de servicios si la ruta de hub aun no existe.
- Crear redirect/canonical cleanup de `/diseno-web/` si discovery lo confirma.
- Conectar los interlinks definitivos hacia AEO, SEO `TASK-1343`, CRM/RevOps y Think cuando esas rutas esten live.
- Crear una version localizada/en-US solo si el roadmap publico lo aprueba.

## Open Questions

- ¿La ruta final sera `/servicios/diseno-desarrollo-web/` o conviene absorber equity de `/diseno-web/` con redirect/canonical?
- ¿Que conversion primitive queda aprobada para esta landing: Growth Form, HubSpot form, HubSpot Meetings o WhatsApp?
- ¿Que casos/proof son publicables hoy sin placeholder?
- ¿Existe hub de servicios como URL viva o debe quedar como follow-up?
