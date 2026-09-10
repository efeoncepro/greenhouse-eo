# TASK-1859 — Landing pública de capacidad de diseño (superficie de producto de Product Design 360)

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
- Wireframe: `docs/ui/wireframes/TASK-1859-landing-product-design-360.md`
- Flow: `docs/ui/flows/TASK-1859-landing-product-design-360-flow.md`
- Motion: `docs/ui/motion/TASK-1859-landing-product-design-360-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop para contratos; runtime WordPress efeoncepro.com vía eo-elementor-widgets; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Landing pública de la **superficie de producto** de Product Design 360: capacidad de diseño —investigación, UX/UI,
design system, accesibilidad, design ops— para **empresas que ya tienen equipo de diseño in-house** y no alcanzan a
cubrir su demanda. Se dirige al Head of Design (operador, campeón y veto) y le da al CPO/CTO un argumento que no es
estético. Se construye completa pero **se publica por fases atadas al estado del business model**: hoy la oferta
está en `Proposed` y el modelo prohíbe claims públicos, así que la página no se indexa hasta `Commercially approved`.

## Why This Task Exists

Efeonce modeló el 2026-09-10 su oferta de product design ([ADR](../../architecture/EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md),
[business model](../../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md),
[ficha](../../services/wave/product-design-360.md)) y no tiene una superficie pública que la exprese. Las landings
existentes cubren disciplinas vecinas, no esta: `TASK-1345` vende diseño y desarrollo de **sitios web** (la
superficie de sitio público, que es de Web Experience 360) y `TASK-1350` vende **producción creativa**. Ninguna
habla al comprador que ya tiene equipo de diseño, y ese comprador es el ICP primario de la oferta.

La investigación de mercado de la misma fecha fijó tres restricciones que una landing genérica violaría: el
comprador tiene equipo y poder de veto, así que la página no puede leerse como sustitución; no existen casos de
cliente de product design, así que la prueba tiene que venir de otro lado; y la oferta no autoriza claims
públicos todavía, así que la publicación tiene que esperar al modelo.

## Goal

- Una landing que en diez segundos le diga al Head of Design que **su roadmap crece más rápido que su equipo de diseño**, que él **elige qué frentes delegar** y que puede **verificar** el cumplimiento.
- Un reencuadre que convierta el gasto de diseño en **capacidad de ingeniería ociosa**, anclado en los datos del propio visitante y no en un benchmark ajeno.
- La página como **prueba de oficio**: cero errores de accesibilidad automáticos, porque vende accesibilidad.
- Publicación por fases (preview → `noindex` enviable → indexada) gobernada por el estado del business model.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md` — capability, dos ofertas, lanes, invariantes.
- `docs/business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md` — estados, gates y claims prohibidos.
- `docs/services/wave/product-design-360.md` — ficha de servicio y lo que la familia nunca vende.
- `docs/public-site/` y `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md` — `efeoncepro.com` = demand-capture + conversión.
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` y `docs/ui/flows/EPIC-023-growth-cta-popup-UI-FLOW.md` — el host WordPress es un nodo de EPIC-023.
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md` — `open_meeting_scheduler`, binding de surface, native-only.
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md` — dirección Astro aceptada, WordPress sigue sirviendo.
- `docs/context/09_marca-agencia.md` y `docs/context/05_voz-tono-estilo.md` — lidera Efeonce; tuteo; beneficios antes que siglas.
- `docs/context/13_icp-buyer-personas-jtbd.md` — **BP9 (candidata)**: líder de diseño in-house; roles, JTBD, anti-ICP por fase, triggers y plan de validación.

Reglas obligatorias:

- **La publicación sigue al business model:** preview en `Proposed`; `noindex` y fuera de sitemap/menú en `Approved for validation`; indexación sólo en `Commercially approved`.
- **"Product Design 360" no aparece en la página** mientras la decisión D1 del modelo siga abierta.
- **Lidera Efeonce**; no se presenta a Wave como proveedor separado.
- **Ningún claim fuera del Claims Ledger** del wireframe; el escaneo de Forbidden Copy bloquea la publicación.
- **Sin casos de cliente, sin precios, sin cifras de RpA/OTD, sin competidores nombrados, sin cifras de salario.**
- **El contrato anti-desplazamiento no se recita**: sólo la frase de control de la región 4.
- **WCAG 2.2 AA con cero errores automáticos** y recorrido manual limpio.

## Normative Docs

- `docs/ui/wireframes/TASK-1859-landing-product-design-360.md` — IA, copy, claims, estados, accesibilidad, SEO/AEO, publication gate.
- `docs/ui/flows/TASK-1859-landing-product-design-360-flow.md` — conversión, fases, rutas, fallas.
- `docs/ui/motion/TASK-1859-landing-product-design-360-motion.md` — motion contenido y sus prohibiciones.
- `docs/tasks/to-do/TASK-1350-landing-agencia-creativa.md` y `docs/tasks/in-progress/TASK-1345-desarrollo-sitios-web-landing.md` — patrón de landing Elementor modular, verificación Playwright live, purga Kinsta.
- `docs/documentation/public-site/wordpress-ohio-elementor-layout.md` — playbook de header/footer Ohio.
- `.claude/skills/creative-practice/efeonce/ESTADO_ACTUAL.md` — qué superficies del portal existen y cuáles no.
- Skill `efeonce-public-site-wordpress` — build del sitio público.

## Dependencies & Impact

### Depends on

- **Dirección visual aprobada** — no existe. `UI ready` permanece `no` hasta completar el Visual Direction Contract del wireframe.
- **Estado del business model** — la publicación de fase B exige `Approved for validation`; la de fase C, `Commercially approved`. Owners: Finance, Legal, Commercial.
- **Binding de meeting surface** en Growth Meetings (`meetingSurfaceId` + `schedulerKey`) y aprobación de booking/replay/medición antes de promover el scheduler.
- Growth CTA `open_meeting_scheduler` — existe en `src/lib/growth/ctas/action-registry.ts` y `src/growth-cta-renderer/action.ts`.

### Blocks / Impacts

- `TASK-1345` — comparte capability (accesibilidad y design system son lanes compartidas); enlace de costura en ambos sentidos, pero **sólo desde fase C** hacia esta página.
- `TASK-1350` — frontera de oficio (un brandbook no es un design system); esta página enruta a ella.
- EPIC-019 — nuevo nodo del programa de landings; EPIC-023 — nuevo host del flow maestro.
- Business model §11b — la futura Calculadora de Capacidad entra en la región 3 como CTA secundario.

### Files owned

- `docs/tasks/to-do/TASK-1859-landing-product-design-360.md`
- `docs/ui/wireframes/TASK-1859-landing-product-design-360.md`
- `docs/ui/flows/TASK-1859-landing-product-design-360-flow.md`
- `docs/ui/motion/TASK-1859-landing-product-design-360-motion.md`
- `docs/ui/reviews/TASK-1859-landing-product-design-360.scorecard.json` `[a crear en verificación]`
- WordPress: widgets en `eo-elementor-widgets` `[paths reales al implementar en el runtime del sitio]`

## Current Repo State

### Already exists

- Canon comercial completo de la oferta: ADR `Proposed`, business model V1.1, ficha de servicio, investigación de mercado con fuentes verificadas.
- Patrón de landing WordPress + Elementor modular verificado en vivo: `TASK-1350` (`/agencia-creativa-v2/`), `TASK-1345` (`/desarrollo-sitios-web/`), `TASK-1799`.
- Growth CTA con acción `open_meeting_scheduler` y scheduler nativo de Growth Meetings.
- Contratos UI de esta task: wireframe, flow y motion.

### Gap

- No existe la dirección visual.
- No existe la página ni sus widgets.
- No existe el binding de meeting surface para esta landing.
- El slug no está validado con evidencia de demanda.
- El business model está en `Proposed`: la página no puede publicarse todavía.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `WordPress efeoncepro.com — plugin eo-elementor-widgets (runtime externo a greenhouse-eo); contratos en docs/ui/ de greenhouse-eo`
- Future candidate home: `public`
- Boundary: `consume el contrato browser-safe de Growth CTA (open_meeting_scheduler) y el scheduler nativo de Growth Meetings; no llama stores, DB ni HubSpot`
- Server/browser split: `el navegador sólo recibe el contrato arbitrado de Growth CTA; booking, idempotencia y receipt viven server-side en Growth Meetings`
- Build impact: `none`
- Extraction blocker: `ninguno para la landing; su migración a Astro (efeonce-web) depende del cutover gobernado por EPIC-019`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: Head of Design / Design Director de empresa mid-market o enterprise con equipo de diseño in-house (operador, campeón y veto); CPO/CTO como comprador económico; visitante público no autenticado.
- Momento del flujo: fase B, envío 1:1 durante una conversación comercial; fase C, descubrimiento orgánico, AEO o referido.
- Resultado perceptible esperado: en diez segundos entiende que su roadmap crece más rápido que su equipo de diseño, que él elige qué frentes delegar y que puede verificar el cumplimiento; agenda una reunión o sale a la landing hermana correcta.
- Friccion que debe reducir: miedo a la sustitución; lectura del diseño como gasto estético; no saber por dónde empezar.
- No-goals UX: self-serve, checkout, precios, casos de cliente, portal, diseño de sitio web (`TASK-1345`), producción creativa (`TASK-1350`).

### Surface & system decision

- Surface: página pública WordPress en `efeoncepro.com` `[slug pendiente; candidato /servicios/diseno-ux-ui/]`; no es ruta del portal.
- Nav placement: `none` — no agrega destino al portal; el menú del sitio público se decide en fase C.
- Composition Shell: `no aplica` — sitio público WordPress; los contratos UI Platform del portal no aplican.
- Primitive decision: `new` — familia de widgets públicos en `eo-elementor-widgets`, un widget por módulo (patrón `TASK-1350`/`TASK-1799`).
- Adaptive density / The Seam: `no aplica` — no es portal.
- Floating/Sidecar/Dialog decision: scheduler nativo en dialog desktop y pantalla completa móvil, vía `open_meeting_scheduler` (ver Flow).
- Copy source: `local one-off` — contenido de página WordPress es-CL; la fuente es el Copy Ledger del wireframe.
- Access impact: `none`

### State inventory

- Default: página completa renderizada en HTML del servidor, legible sin JavaScript.
- Loading: la página no carga datos; el scheduler gestiona su propia carga con estructura visible.
- Empty: no aplica — contenido curado sin fuente de datos.
- Error: errores del scheduler resueltos dentro de él (calendario, navegación y Reintentar); resultado ambiguo bloquea el reintento.
- Degraded / partial: si falla la zona visual del hero o el esquema de la región 3, el texto queda completo.
- Permission denied: no aplica — página pública.
- Long content: página larga de 13 regiones; sin scroll horizontal en 1440 ni 390.
- Mobile / compact: una columna; H1 y CTA primario sin scroll; scheduler a pantalla completa.
- Keyboard / focus: recorrido completo operable por teclado; foco nunca oculto por el header persistente.
- Reduced motion: contenido asentado desde el primer render; sin transiciones ni desplazamiento suave.

### Interaction contract

- Primary interaction: *Agenda una reunión* → Growth CTA `open_meeting_scheduler`; con surface no promovida, enlace declarado a `/contacto/`.
- Hover / focus / active: el foco produce la misma apariencia que el hover; anillo de foco con contraste ≥ 3:1.
- Pending / disabled: el CTA muestra estado pendiente mientras monta el scheduler; sin doble activación.
- Escape / click-away: Escape cierra el scheduler; click fuera lo cierra sólo en desktop.
- Focus restore: el foco vuelve al CTA que abrió el scheduler.
- Latency feedback: el scheduler muestra la estructura del calendario mientras carga.
- Toast / alert behavior: sin toasts propios; la confirmación y los errores los muestra el scheduler nativo.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: entrada breve del hero y revelados de región desde un estado ya visible; nunca desde `opacity:0`.
- Layout morph: ninguno.
- Stagger: sólo en la entrada del hero.
- Timing / easing token: tokens de motion del sitio público; provisionales por página si no existen (ver Motion).
- Reduced-motion fallback: obligatorio; contenido asentado y cambios instantáneos.
- Non-goal motion: marquee, contadores animados, video en el hero, scroll-jacking, parallax, animaciones infinitas.

### Implementation mapping

- Route / surface: página WordPress `[slug pendiente]` en `efeoncepro.com`.
- Primitive / variant / kind: familia de widgets públicos, un widget por región (`hero`, `brand-proof`, `reframe`, `control`, `lanes`, `a11y-proof`, `reasons`, `verification`, `start`, `not-for`, `faq`, `cta`).
- Component candidates: módulos anteriores + header/footer nativos Ohio + `<greenhouse-cta>` + `<efeonce-meeting-scheduler>`.
- Copy source: Copy Ledger del wireframe → contenido de página es-CL.
- Data reader / command: ninguno de Greenhouse para el contenido; booking por el command gobernado de Growth Meetings.
- API parity: la acción de agendar es un command server-side gobernado; HubSpot nunca se llama desde WordPress ni desde el navegador.
- Access / capability: `none`.
- States to implement: ready, partial, surface no promovida, estados del scheduler nativo, reduced-motion, mobile 390, sin JavaScript.

### GVC scenario plan

- Scenario file: GVC del portal no aplica (WordPress público sin agent-auth); Playwright live + axe-core + WAVE.
- Route: preview en fase A; URL `noindex` en fase B.
- Viewports: 1440, 1280, 390.
- Quality profile: `premium`
- Required steps: cargar con UTM → recorrido por teclado → abrir y cerrar scheduler → anclas → reduced-motion → JavaScript deshabilitado.
- Required captures: hero, regiones 3, 5, 6, 9 y 10, scheduler abierto, foco bajo el header, reduced-motion 390, página sin JavaScript.
- Required `data-capture` markers: `capacidad-hero`, `capacidad-reframe`, `capacidad-lanes`, `capacidad-a11y`, `capacidad-start`, `capacidad-notfor`, `capacidad-faq`, `capacidad-cta`.
- Assertions: axe 0 violaciones; WAVE 0 errores; consola sin errores; sin overflow; un único `h1`; foco no oculto; objetivos ≥ 24×24; sin animaciones infinitas; escaneo de Forbidden Copy en 0; JSON-LD válido; robots según fase; CWV en budget.
- Scroll-width checks: sí, en 1440 y 390.
- Reduced-motion / focus evidence: capturas dedicadas y auditoría de estilos computados.
- Review dossier: `.captures/<ISO>_task1859-capacidad-diseno/`.
- Baseline decision / surface ID: superficie nueva sin baseline; `public-site/capacidad-diseno`.

### Design decision log

- Decision: landing de la superficie de producto para el Head of Design con equipo in-house, estructurada como reconocimiento → reencuadre → oferta → resolución de indecisión, con publicación por fases atada al business model.
- Alternatives considered: una sola landing para producto y sitio web (rechazada: dos compradores, y `TASK-1345` ya cubre el sitio); folleto con casos (rechazado: no hay casos de product design); indexar desde ya (rechazado: el modelo prohíbe claims públicos); liderar con el ratio de benchmark (rechazado: invita a discutir el número).
- Why this pattern: el comprador tiene equipo y poder de veto; la accesibilidad es la única prueba independiente medida, así que ocupa el lugar de los casos.
- Reuse / extend / new primitive: nueva familia de widgets públicos; reutiliza header/footer Ohio, Growth CTA y Growth Meetings sin fork.
- Open risks: dirección visual inexistente; slug sin validar; nombre público abierto; la página puede no publicarse si G1 falla.

### Visual verification

- GVC scenario: Playwright live con axe-core y WAVE (ver GVC scenario plan).
- Viewports: 1440, 1280, 390.
- Required captures: las del GVC scenario plan.
- Required `data-capture` markers: los del GVC scenario plan.
- Scroll-width check: sí.
- Accessibility/focus checks: axe, WAVE, teclado, lector de pantalla, foco no oculto, tamaño de objetivo.
- Before/after evidence: superficie nueva, sin estado previo.
- Known visual debt: dirección visual pendiente; scheduler no promovido hasta binding.
- Visual scorecard: `docs/ui/reviews/TASK-1859-landing-product-design-360.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

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

### Slice 1 — Demanda y dirección visual

- Validar slug y H1 con `seo-aeo` en es-CL (volumen, intención, SERP) entre `/servicios/diseno-ux-ui/`, `/servicios/capacidad-de-diseno/` y `/servicios/diseno-de-producto-digital/`; registrar evidencia y decisión en el wireframe.
- Producir 2–3 direcciones visuales con las skills de diseño sobre una fuente durable (`.dc.html` de Claude Design o nodo Figma); el operador elige.
- Completar el Visual Direction Contract del wireframe.

### Slice 2 — Copy y claims

- Primera pasada de craft hecha el 2026-09-10 (`## Copy Audit` del wireframe): gran idea al H1, antítesis de 5 a 2, tuteo, género, numerales.
- **Validar con voz del cliente real** antes de cerrar el slice. El perfil existe desde el 2026-09-10 como **BP9 candidata** en `docs/context/13_icp-buyer-personas-jtbd.md`, pero sin entrevistas: el copy sigue siendo hipótesis y se valida con el mismo plan de BP9.
- Re-verificar C2–C5 contra WebAIM (as-of vigente) y C6 con Legal; confirmar C1 con marca.
- Confirmar que el nombre interno de la familia no aparece en ningún string.

### Slice 3 — Build en Elementor

- Familia de widgets en `eo-elementor-widgets`, un widget por región, assets versionados por `filemtime()`.
- Header/footer nativos Ohio; JSON-LD (`Organization`, `Service` sin precio, `FAQPage`, `BreadcrumbList`); marcadores `data-capture`.
- `<greenhouse-cta>` con `open_meeting_scheduler` montado y surface en estado no promovido (enlace a `/contacto/`).
- Página en borrador o privada (fase A).

### Slice 4 — Verificación

- Playwright live 1440/1280/390 + axe-core + WAVE + recorrido con teclado y lector de pantalla + escaneo de Forbidden Copy + CWV.
- Dossier en `.captures/` y scorecard en `docs/ui/reviews/`.

### Slice 5 — Publicación fase B (gated)

- Sólo con el business model en `Approved for validation`: publicar `noindex, follow`, fuera de sitemap y menú.
- Crear el binding de meeting surface y aprobar booking/replay/medición antes de promover el scheduler.

### Slice 6 — Promoción fase C (gated)

- Sólo con `Commercially approved`: indexar, sitemap, menú *Servicios*, enlaces desde `TASK-1345` y `TASK-1350`; re-verificación live.

## Out of Scope

- La Calculadora de Capacidad de Diseño: follow-up con split `backend-data` + `ui-ux`.
- La landing de diseño de sitio web (`TASK-1345`) y la de producción creativa (`TASK-1350`).
- Aprobar el business model: lo gobiernan Finance, Legal y Commercial.
- Precios, cotizador público o checkout.
- Casos de cliente.
- Métricas reales del portal en la página.
- Migración a Astro.
- Cambios en el portal Greenhouse.
- Versión en inglés.

## Detailed Spec

El detalle vive en los contratos UI y no se duplica aquí:

- **Arquitectura de información, regiones, copy, claims, estados, accesibilidad, SEO/AEO y publication gate** → wireframe.
- **Conversión, nodos de programa, máquina de estados del scheduler, fases, rutas y fallas** → flow.
- **Inventario de motion, prohibiciones, reduced-motion y guardrails de performance** → motion.

Resumen de las 13 regiones en orden: header nativo · hero · prueba de marca · reencuadre · control · 7 frentes ·
accesibilidad con número · tres razones · verificable · cómo empezamos · cuándo no somos la opción · preguntas
frecuentes · CTA final · footer nativo.

Tres reglas que no admiten interpretación al implementar:

1. **La región 6 no usa contadores**: las cifras están en el DOM con su valor final desde el primer render.
2. **Ninguna animación infinita** en la página: no hay marquee de logos.
3. **Los enlaces internos no llevan UTM.**

## Rollout Plan & Risk Matrix

Cambio aditivo de contenido público: una página nueva de marketing en WordPress, sin runtime de producto Greenhouse,
sin migraciones ni datos de cliente. El riesgo material es **de gobierno comercial y de marca**, no de sistema:
publicar claims de una oferta no aprobada, o que una página que vende accesibilidad falle en accesibilidad.

### Slice ordering hard rule

- Slice 1 y Slice 2 preceden a Slice 3: no se construye sin dirección visual aprobada ni copy validado.
- Slice 3 precede a Slice 4; Slice 4 precede a cualquier publicación.
- **Slice 5 exige el business model en `Approved for validation`; Slice 6 exige `Commercially approved`.** Ningún agente ejecuta estos slices sin evidencia del estado del modelo.
- `UI ready: no → yes` sólo con el Visual Direction Contract completo, el copy validado y `pnpm task:lint --task TASK-1859` sin findings.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Publicar claims de una oferta en `Proposed` | marca / comercial | medium | publication gate por fases; Slices 5 y 6 gated | página indexada con el modelo en `Proposed` |
| La página que vende accesibilidad falla en accesibilidad | UI / a11y | medium | axe 0 y WAVE 0 como criterio bloqueante; recorrido manual | reporte axe/WAVE con hallazgos |
| Se filtra un claim prohibido | marca | medium | escaneo automático de Forbidden Copy | coincidencias > 0 |
| Cannibalización o confusión con `TASK-1345` o `TASK-1350` | marca / conversión | medium | región 10 enruta; enlaces de costura; hermanas no enlazan en fase B | reuniones agendadas para la disciplina equivocada |
| "Diseño de producto" leído como diseño industrial | SEO / marca | medium | validación de slug y H1 en Slice 1 | intención de búsqueda equivocada en la SERP |
| Scheduler promovido sin binding aprobado | conversión | low | surface `not-promoted` hasta aprobación | booking sin receipt o sin medición |
| Cifras de WebAIM vencidas por una edición nueva | marca | medium | revisión editorial por as-of | publicación de una edición nueva de WebAIM |
| Performance degradada por la dirección visual | UI / público | low | LCP en texto; sin video en el hero; CWV como criterio | LCP > 2,5 s en verificación |

### Feature flags / cutover

Sin flag de producto. El control es el **estado de publicación en WordPress** (borrador → `noindex` → indexada) y el
**binding de la meeting surface** (inactivo hasta aprobación). Revert: volver a borrador o a `noindex` y purgar
Kinsta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | descartar dirección visual y evidencia de slug | inmediato | sí |
| Slice 2 | revertir el ledger de copy | inmediato | sí |
| Slice 3 | página en borrador; desactivar widgets | minutos | sí |
| Slice 4 | sin efecto en runtime: es verificación | inmediato | sí |
| Slice 5 | volver a borrador; desactivar binding | < 10 min | sí |
| Slice 6 | volver a `noindex`, retirar del sitemap y menú, purgar Kinsta; desindexación efectiva según buscadores | < 10 min en el sitio | parcial: la desindexación depende de terceros |

### Production verification sequence

1. Slice 1 aprobado por el operador (dirección visual + slug con evidencia).
2. Slice 2: copy y claims validados; Legal sobre C6.
3. Slice 3: build en borrador; Slice 4 completo en preview.
4. **Confirmar el estado del business model**; si es `Approved for validation`, Slice 5: publicar `noindex`, purgar Kinsta, repetir Slice 4 sobre la URL publicada.
5. Aprobar binding y medición; promover el scheduler con verificación de booking/replay separada del smoke visual.
6. **Confirmar `Commercially approved`**; Slice 6: indexar, sitemap, menú, enlaces; re-verificar; monitorear conversión y CWV.

### Out-of-band coordination required

- Transiciones de estado del business model (Finance, Legal, Commercial).
- Growth Meetings: `meetingSurfaceId`, `schedulerKey` y aprobación de booking/medición.
- WordPress/Kinsta: acceso de publicación y purga.
- Legal: revisión de la mención a la Ley Europea de Accesibilidad (C6).
- SEO: registro de canonical y sitemap en fase C.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Se declaró `Execution profile: ui-ux`, `UI impact: flow` y `Backend impact: none`.
- [x] Existen y están declarados en Status el wireframe, el flow y el motion.
- [ ] `UI ready` permanece `no` hasta completar el Visual Direction Contract, validar el copy y pasar `pnpm task:lint --task TASK-1859` sin findings.
- [ ] El slug está validado con evidencia de demanda y SERP registrada en el wireframe.
- [x] Primera pasada de craft (`copywriting` + `greenhouse-ux-writing`) aplicada al Copy Ledger — ver `## Copy Audit` del wireframe (2026-09-10).
- [ ] El copy está validado con voz del cliente real: al menos 5 conversaciones con líderes de diseño in-house, y el Copy Ledger ajustado a sus palabras literales.
- [ ] La página lidera con Efeonce y el string `Product Design 360` no aparece.
- [ ] El escaneo de Forbidden Copy sobre el texto renderizado da 0 coincidencias.
- [ ] Cada claim publicado corresponde a una fila del Claims Ledger, con su fuente enlazada.
- [ ] axe-core reporta 0 violaciones y WAVE 0 errores en 1440 y 390.
- [ ] El recorrido completo es operable por teclado y el foco nunca queda oculto por el header persistente.
- [ ] Los objetivos interactivos miden al menos 24×24 px.
- [ ] No hay animaciones infinitas ni marquee; reduced-motion verificado con estilos computados.
- [ ] Las cifras de la región 6 muestran su valor final en el primer render.
- [ ] No hay overflow horizontal en 1440 ni 390 y la consola no tiene errores.
- [ ] CWV dentro de budget: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.
- [ ] JSON-LD válido: `Organization`, `Service` sin precio, `FAQPage` y `BreadcrumbList`.
- [ ] La meta robots coincide con la fase de publicación.
- [ ] La página no hace ninguna llamada de red a dominios de HubSpot y la conversión sólo se emite desde receipt server-confirmed.
- [ ] Los enlaces internos no llevan UTM.
- [ ] La publicación en fase B ocurrió con el business model en `Approved for validation`, con evidencia del estado.
- [ ] La indexación ocurrió con el business model en `Commercially approved`, con evidencia del estado.

## Verification

- `pnpm task:lint --task TASK-1859`
- `pnpm ui:wireframe-check --task TASK-1859`, `pnpm ui:flow-check --task TASK-1859`, `pnpm ui:motion-check --task TASK-1859`, `pnpm ui:readiness-check --task TASK-1859`
- Playwright live 1440/1280/390 con axe-core y WAVE.
- Recorrido manual con teclado, VoiceOver y NVDA.
- Escaneo de Forbidden Copy sobre el texto renderizado.
- Validación de JSON-LD en Rich Results y de robots/canonical/sitemap según fase.
- Verificación de booking/replay/read-back separada del smoke visual.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1345` y `TASK-1350` enlazan a esta página sólo desde fase C.
- [ ] La página queda registrada en `docs/public-site/PRODUCT_ROADMAP.md`.
- [ ] Triple documentación proporcional (técnica, funcional y manual, o delta según aplique).

## Follow-ups

- Calculadora de Capacidad de Diseño (business model §11b), con split `backend-data` + `ui-ux`; entra en la región 3 como CTA secundario.
- Master UI flow de EPIC-019, si el programa lo crea; esta landing se declara como nodo.
- Migración a Astro cuando el cutover de EPIC-019 lo habilite.
- Verificación del marco chileno de accesibilidad, antes de cualquier argumento legal local.
- Actualización de la región 6 con cada edición nueva de WebAIM Million.
- Versión en inglés si el ICP internacional lo justifica.

## Open Questions

- **Runtime:** se infiere WordPress + Elementor modular por ser la práctica vigente del operador (`TASK-1350`, `TASK-1345`, `TASK-1799`), aunque la dirección aceptada es Astro. Confirmar antes de Slice 3.
- **Slug:** `/servicios/diseno-ux-ui/` es candidato; lo decide la evidencia de Slice 1.
- **Owner comercial** de la oferta y de la página.
- **`meetingSurfaceId` y `schedulerKey`** de esta surface.
- **¿Fase B como instrumento de G1?** La página enviable podría servir para medir demanda en las conversaciones de G1; si se adopta, el modelo debe declararlo.
- **Prueba de marca (C1):** confirmar si la línea de masterbrand se mantiene en una página que no puede mostrar casos de su disciplina.
