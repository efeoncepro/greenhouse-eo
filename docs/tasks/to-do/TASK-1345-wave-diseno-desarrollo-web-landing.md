# TASK-1345 — Landing publica Wave: diseno y desarrollo web

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1345-wave-diseno-desarrollo-web-landing.md`
- Flow: `docs/ui/flows/TASK-1345-wave-diseno-desarrollo-web-landing-flow.md`
- Motion: `docs/ui/motion/TASK-1345-wave-diseno-desarrollo-web-landing-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: `none`
- Branch: `task/TASK-1345-wave-diseno-desarrollo-web-landing`

## Summary

Construye la landing publica de servicio Wave "Diseno y desarrollo web" en el sitio publico de Efeonce, con ruta propuesta `/servicios/diseno-desarrollo-web/`. La pagina captura demanda mid/bottom-funnel para empresas que buscan un sitio profesional y reencuadra el servicio como ingenieria de crecimiento: estrategia, diseno, desarrollo, SEO tecnico, performance y preparacion AI-ready. Usa el HTML v11 como referencia de implementacion y los docs importados de wireframe/flow como contrato canonico del repo. No crea backend nuevo: la conversion debe usar el contrato gobernado existente de Growth Forms/HubSpot/Meetings/WhatsApp, segun discovery.

## Why This Task Exists

Hoy el sitio publico no tiene una landing de servicio dedicada para "diseno y desarrollo web" bajo una arquitectura de servicios gobernada. Existe una URL `/diseno-web/` que responde 200, pero el crawl inicial la identifica como archivo/categoria WordPress (`/category/diseno-web/`), no como pagina comercial canonicamente posicionada. La carpeta externa `diseno-web` ya contiene un boceto HTML robusto, un wireframe y un flow de interlinks; falta absorberlos en la taxonomia documental de Greenhouse para ejecutar la landing sin improvisar posicionamiento, conversion ni rutas.

## Goal

- Publicar una landing de servicio Wave en la ruta propuesta `/servicios/diseno-desarrollo-web/`, o documentar una decision distinta si el discovery de route ownership lo exige.
- Implementar el recorrido completo de 12 bloques: hero, "dos visitantes", metodo IDD, CTA intermedio, niveles AI-ready, "sale listo", segmentacion/jobs, performance, prueba, de-risk, FAQ, formulario y footer.
- Usar el HTML v11 como referencia visual y estructural, tomando de ahi lo reusable, pero sin copiarlo como artefacto productivo crudo.
- Convertir la pagina en nodo de demanda: CTA primario "Quiero cotizar", salida secundaria a agenda/WhatsApp y related links bajo FAQ.
- Alinear SEO/AEO: entidad Efeonce + Wave, JSON-LD `Service`/`Organization`/`FAQPage`/`BreadcrumbList`, answer-first copy y enlaces internos hacia AEO, SEO, CRM/RevOps, Think, Wave Hub y Loop Marketing segun disponibilidad.

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

- Es sitio publico Efeonce/Wave, no portal Greenhouse: NO usar AXIS/MUI/`src/lib/copy` del portal como si fueran source of truth.
- La ruta propuesta es `/servicios/diseno-desarrollo-web/`. Discovery debe tratar `/diseno-web/` como posible archivo/categoria legacy y decidir canonical, redirect o limpieza SEO.
- No publicar claims no verificables. El caso enterprise del boceto queda pendiente hasta tener prueba real autorizada.
- Si se usa el dato de Cloudflare, debe formularse con precision y fuente: bots/automatizacion en requests HTML, no "todo el trafico de internet son agentes IA".
- El CTA primario sobre la pagina debe ser uno: "Quiero cotizar". Los interlinks contextuales viven como texto/enlaces secundarios y el modulo de related services vive bajo FAQ.
- Full API Parity por reuso: la accion de negocio de captura/contacto debe consumir un contrato gobernado existente (Growth Forms/HubSpot/Meetings/WhatsApp). La landing no implementa una logica de negocio client-only como unica verdad.
- Voz: clara, mecanicista, sin "soluciones integrales", sin promesas vagas, sin exagerar IA. La idea fuerza es "sitios que trabajan como infraestructura comercial".

## Normative Docs

- `docs/ui/wireframes/TASK-1345-wave-diseno-desarrollo-web-landing.md`
- `docs/ui/flows/TASK-1345-wave-diseno-desarrollo-web-landing-flow.md`
- `docs/ui/motion/TASK-1345-wave-diseno-desarrollo-web-landing-motion.md`

## Dependencies & Impact

### Depends on

- Skill `efeonce-public-site-wordpress` para discovery, backup, edicion, publicacion y verificacion del sitio publico.
- Decision de runtime/ruta: WordPress/Elementor actual vs rail Astro `efeonce-web` si el control plane publico lo exige.
- Conversion primitive `[verificar]`: Growth Forms portable renderer, HubSpot form, HubSpot Meetings o WhatsApp gobernado.
- URLs finales `[verificar]`: AEO landing, SEO landing `TASK-1343`, CRM/RevOps hub, Think AI visibility grader, Wave Hub y Loop Marketing.
- Fuente de prueba publicable `[verificar]`: casos Ghamadent, SKY y cualquier caso enterprise.

### Blocks / Impacts

- Habilita interlinks entrantes desde Wave Hub, AEO, SEO, Globe y Home.
- Alimenta el roadmap de servicios del sitio publico bajo EPIC-019.
- Puede requerir follow-up de route ownership si `/diseno-web/` debe redirigirse o dejar de indexarse como archivo.

### Files owned

- `docs/tasks/to-do/TASK-1345-wave-diseno-desarrollo-web-landing.md`
- `docs/ui/wireframes/TASK-1345-wave-diseno-desarrollo-web-landing.md`
- `docs/ui/flows/TASK-1345-wave-diseno-desarrollo-web-landing-flow.md`
- `docs/ui/motion/TASK-1345-wave-diseno-desarrollo-web-landing-motion.md`
- Contenido de la pagina en el sitio publico (WordPress/Elementor o Astro) `[verificar]`
- `scripts/frontend/scenarios/public-wave-diseno-desarrollo-web.capture.txt` `[verificar]`
- Registro de landing/ruta del sitio publico si el workflow lo exige `[verificar]`

## Current Repo State

### Already exists

- EPIC-019 como programa de control de landings publicas.
- PDR-003 para layering del ecosistema digital Efeonce.
- Growth Forms / HubSpot integration como ruta gobernada de captura, aunque el form especifico de esta landing debe confirmarse.
- Documentos externos de producto en la carpeta local `diseno-web`: wireframe, flow/interlinks y HTML v11. Esta task ya los adapta al formato canonico del repo.

### Gap

- No existe task formal ni docs UI canonicos para esta landing.
- No existe pagina comercial canonicamente propuesta en `/servicios/diseno-desarrollo-web/`.
- `/diseno-web/` responde 200, pero apunta a una experiencia tipo archivo/categoria, no a la landing de servicio.
- Faltan decisiones finales de formulario, agenda, WhatsApp, URLs de interlinks y prueba enterprise.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: founder, gerente comercial, marketing manager u operador de crecimiento que necesita renovar o crear un sitio que venda.
- Momento del flujo: solution/product-aware; compara proveedores de web design/dev y busca una propuesta mas seria que "un sitio bonito".
- Resultado perceptible esperado: entiende que Wave construye un sitio como infraestructura comercial, no como brochure; decide cotizar o agendar.
- Friccion que debe reducir: miedo a comprar un sitio que queda lindo pero no mide, no convierte, no rankea y no queda preparado para IA/agentes.
- No-goals UX: no es pricing publico; no es portfolio completo; no es pagina AEO ni SEO; no crea un cotizador dinamico nuevo.

### Surface & system decision

- Surface: `efeoncepro.com/servicios/diseno-desarrollo-web/` propuesta; discovery puede ajustar la ruta y debe documentarlo.
- Composition Shell: `no aplica` — es sitio publico, no portal Greenhouse.
- Primitive decision: `reuse` — patrones marketing del sitio publico, Ohio/Elementor/custom widgets existentes o rail Astro publico. El HTML v11 es blueprint, no primitive nueva.
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
- Interlinks: enlaces contextuales a AEO/SEO/CRM/Think/Wave/Loop sin romper el camino principal de conversion.

### Motion & microinteractions

- Motion primitive: `CSS` del sitio publico; no usar wrappers del portal.
- Enter / exit: hero fade+rise sutil; secciones reveal una vez si el runtime lo permite.
- Layout morph: ninguno.
- Stagger: corto en hero/cards.
- Timing / easing token: 75/150/200/300/400ms; ease-out `cubic-bezier(0.2,0,0,1)`.
- Reduced-motion fallback: contenido visible sin animacion.
- Non-goal motion: scroll-jacking, hero video pesado, loops infinitos, gradientes animados decorativos.

### Implementation mapping

- Route / surface: `efeoncepro.com/servicios/diseno-desarrollo-web/` propuesta.
- Primitive / variant / kind: patrones marketing public-site; reuse de widgets existentes.
- Component candidates: secciones Elementor/Ohio o componentes Astro; form/agenda gobernado; FAQ; JSON-LD.
- Copy source: contenido de pagina publica, no `src/lib/copy`.
- Data reader / command: ninguno nuevo.
- API parity: satisfecha por reuso de Growth Forms/HubSpot/Meetings/WhatsApp; no hay endpoint ad hoc de cotizacion.
- Access / capability: publica, sin capability.
- States to implement: default, degraded fallback, mobile, focus, reduced-motion, form error/success si el renderer lo expone.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-wave-diseno-desarrollo-web.capture.txt`
- Route: preview/staging de la pagina publica.
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; navegar por anchors; abrir 1 FAQ; activar CTA primario; validar fallback/estado del form; probar secondary CTA.
- Required captures: full-page desktop + mobile; hero; metodo IDD; niveles AI-ready; segmentacion; proof; FAQ abierto; formulario.
- Required `data-capture` markers: `hero`, `signature`, `idd`, `ai-ready`, `segments`, `performance`, `proof`, `faq`, `conversion-form`.
- Assertions: H1 presente; CTA primario accionable; sin placeholder enterprise; sin scroll horizontal; canonical correcto; form/fallback visible.
- Scroll-width checks: `document.scrollingElement.scrollWidth <= clientWidth` en 1440 y 390.
- Accessibility/focus checks: focus ring visible en CTAs/FAQ/form; contraste AA en bandas.

### Design decision log

- Decision: crear spoke de servicio bajo `/servicios/diseno-desarrollo-web/`, separando una pagina comercial canonica de la URL legacy `/diseno-web/` que hoy parece archivo/categoria.
- Decision: adaptar el HTML v11 como referencia de implementacion porque ya captura jerarquia, copy base y visual direction, pero rehacerlo sobre el runtime/patrones del sitio publico.
- Decision: mantener un unico CTA principal hasta el formulario; los interlinks son secundarios y el modulo de related services va bajo FAQ para no fugar conversion temprano.
- Decision: tratar "AI-ready" como preparacion tecnica/estructural del sitio, no como claim magico de IA.
- Alternatives considered: usar `/diseno-web/` sin discovery (riesgo SEO/categoria), copiar HTML estatico completo (rompe workflow y gobernanza), lanzar sin form gobernado (viola parity).
- Open risks: URL final de Wave Hub/CRM/Think; caso enterprise no autorizado; form final; route ownership de `/diseno-web/`.

### Visual verification

- GVC scenario: `public-wave-diseno-desarrollo-web`
- Viewports: 1440 + 390.
- Required captures: full-page + secciones clave + FAQ abierto + formulario/fallback.
- Required `data-capture` markers: `hero`, `signature`, `idd`, `ai-ready`, `segments`, `performance`, `proof`, `faq`, `conversion-form`.
- Scroll-width check: si, ambos viewports.
- Accessibility/focus checks: focus ring, contraste AA, FAQ keyboard.
- Before/after evidence: si se reemplaza o redirige `/diseno-web/`, capturar before de la ruta legacy.
- Known visual debt: boceto HTML v11 usa CSS hardcodeado y placeholders; el build final debe tokenizar/adaptar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

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
- Resolver interlinks: AEO, SEO `TASK-1343`, CRM/RevOps, Think, Wave Hub, Loop Marketing.

### Slice 3 — Build de la landing

- Implementar los bloques canonicos del wireframe en el runtime elegido.
- Reusar estructuras/patrones del sitio publico; tomar del HTML v11 lo que sirva en contenido/jerarquia, no su CSS/JS crudo.
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
- Crear una pagina Wave Hub completa si no existe; se deja como dependency/follow-up.
- Implementar la landing SEO `TASK-1343` o la landing AEO sibling.
- Migrar todo el sitio publico a Astro.
- Crear pricing dinamico, calculadora o configurador.
- Inventar nuevos casos/metricas de clientes sin fuente aprobada.

## Detailed Spec

La landing debe seguir el wireframe canonico `TASK-1345-wave-diseno-desarrollo-web-landing.md`. La narrativa base es: un sitio ya no atiende solo a humanos; tambien lo leen buscadores, modelos de IA, crawlers y agentes. Wave vende un proceso de diseno y desarrollo que produce un sitio rapido, claro, medible, SEO-ready, AI-ready y preparado para performance. El metodo IDD organiza el servicio: investigar, disenar/desarrollar, desplegar/medir. El cierre convierte con un CTA principal de cotizacion y una salida secundaria honesta.

El HTML v11 contiene estructura y copy aprovechable, pero tambien deuda: CSS hardcodeado, JS local de formulario, base64/logo embebido, anchors `#`, placeholders de proof y claims que requieren precision. El implementador debe extraer jerarquia, layout intent, textos candidatos y estados, no copiar el archivo como pagina final.

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
| HTML v11 se copia crudo y genera deuda responsive/perf | UI / publico | medium | Reimplementar sobre runtime/patrones; GVC 1440+390 | Scroll horizontal, CLS, CSS conflict |

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

- [ ] La pagina publica de Wave "Diseno y desarrollo web" existe en una ruta canonica documentada, idealmente `/servicios/diseno-desarrollo-web/`.
- [ ] La task declara `Execution profile: ui-ux`, `UI impact: flow`, `UI ready: no`, y tiene Wireframe/Flow/Motion existentes.
- [ ] El HTML v11 fue usado como referencia de implementacion, no copiado como artefacto crudo con CSS/JS locales sin gobierno.
- [ ] La pagina implementa los bloques canonicos: hero, dos visitantes, IDD, CTA intermedio, niveles AI-ready, sale listo, segmentacion, performance, proof, de-risk, FAQ, conversion form y footer.
- [ ] CTA primario "Quiero cotizar" entrega a un form/contacto gobernado con fallback; no hay anchors `#` ni CTA muerto.
- [ ] CTA secundario agenda/WhatsApp esta configurado o removido hasta tener destino real.
- [ ] No hay placeholder enterprise ni claims de proof sin aprobacion.
- [ ] El dato de Cloudflare, si se usa, esta formulado con precision y fuente; si no, se elimina.
- [ ] Interlinks internos implementados segun flow: AEO, SEO, CRM/RevOps, Think, Wave Hub, Loop Marketing, con related services bajo FAQ.
- [ ] JSON-LD `Service`/`Organization`/`FAQPage`/`BreadcrumbList` valido y consistente con contenido visible.
- [ ] `/diseno-web/` legacy queda tratado por canonical/redirect/noindex/decision documentada.
- [ ] GVC desktop 1440 + mobile 390 capturado y mirado; sin scroll horizontal; focus y reduced-motion verificados.
- [ ] Ruta/landing registrada en los docs public-site aplicables.

## Verification

- `pnpm task:lint --task TASK-1345`
- `pnpm ui:wireframe-check --task TASK-1345`
- `pnpm ui:flow-check --task TASK-1345`
- `pnpm ui:motion-check --task TASK-1345`
- `pnpm ui:readiness-check --task TASK-1345`
- `pnpm fe:capture public-wave-diseno-desarrollo-web --env=<preview> --gif`
- Playwright/manual: `scrollWidth <= clientWidth` en 1440 y 390.
- Google Rich Results Test para JSON-LD.
- Smoke real de formulario/fallback hacia HubSpot/Meetings/WhatsApp.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Se actualizo el registro/ownership de rutas del sitio publico si la landing fue publicada.
- [ ] Se documento la decision final sobre `/diseno-web/`.

## Follow-ups

- Crear/ordenar Wave Hub si la ruta de hub aun no existe.
- Crear redirect/canonical cleanup de `/diseno-web/` si discovery lo confirma.
- Conectar los interlinks definitivos hacia AEO, SEO `TASK-1343`, CRM/RevOps y Think cuando esas rutas esten live.
- Crear una version localizada/en-US solo si el roadmap publico lo aprueba.

## Open Questions

- ¿La ruta final sera `/servicios/diseno-desarrollo-web/` o conviene absorber equity de `/diseno-web/` con redirect/canonical?
- ¿Que conversion primitive queda aprobada para esta landing: Growth Form, HubSpot form, HubSpot Meetings o WhatsApp?
- ¿Que casos/proof son publicables hoy sin placeholder?
- ¿Existe Wave Hub como URL viva o debe quedar como follow-up?
