# TASK-1350 — Landing pública "Agencia Creativa" (Efeonce · Design Engineer)

<!-- ═══════════════════════════════════════════════════════════
 ZONE 0 — IDENTITY & TRIAGE
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
- Wireframe: `docs/ui/wireframes/TASK-1350-landing-agencia-creativa.md`
- Flow: `docs/ui/flows/TASK-1350-landing-agencia-creativa-flow.md`
- Motion: `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Live candidate en /agencia-creativa-v2 noindex`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `task/TASK-1350-landing-agencia-creativa`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Landing pública de la capability creativa de Efeonce (`efeoncepro.com`), posicionada como **"la agencia creativa que puedes ver operar en tiempo real"**. **Comprador = los departamentos de marketing y/o equipos creativos in-house de empresas mid-market y enterprise**; Efeonce NO los reemplaza: es **la capacidad de producción creativa que les permite escalar** su output sin sumar headcount y sin perder control ni visibilidad ("tu equipo dirige, nosotros producimos a escala, y lo ves todo"). Concepto de ejecución **Design Engineer** = arte + color + ingeniería: assets art-dirigidos producidos con el stack IA propio (fal.ai / Higgsfield / Magnific / Adobe CC), montados como experiencia performante e interactiva. Lidera la masterbrand **Efeonce**; CTA primario **"Agenda una reunión"** (HubSpot Meetings). El diferenciador es un bloque de **operaciones creativas medibles** (ICO) — el mismo claim de transparencia que Greenhouse entrega.

### Runtime delta 2026-07-07 — operador override

La task nació con dirección `WordPress code-custom, NO Elementor`, pero el operador cambió explícitamente el contrato de ejecución para la implementación real: **WordPress + Elementor por módulos/widgets propios**, evitando un único widget HTML gigante. Fuente de verdad del diseño: `~/Documents/Creative/Ejecución de task 1350/TASK-1350 Landing Agencia Creativa.dc.html`; los screenshots de `Creative/` son iteraciones y no deben tratarse como source of truth. Estado live candidato: `https://efeoncepro.com/agencia-creativa-v2/` (`postId=251279`), publicado con `noindex` hasta decidir redirección/cutover desde `/agencia-creativa/`. Delta de fidelidad 2026-07-07: se reforzaron microinteracciones de fábrica/servicios/bento, se creó el contrato de motion, se restauró la coreografía scroll-bound de backlog/proceso y la auditoría Playwright confirmó colores fuente, keyframes activos, hover states y reduced-motion honesto.

## Why This Task Exists

El 68% de los compradores B2B dice que todas las agencias suenan igual (`docs/context/09_marca-agencia.md`). Efeonce no tiene hoy una landing de agencia creativa que (a) lidere con la marca masterbrand, (b) diferencie por la **operación creativa medible + transparencia radical** (el activo único que da ICO + el ecosistema de producto), y (c) **demuestre** capacidad técnica siendo ella misma una pieza de craft (el medio es el mensaje). Las landings de servicio existentes (TASK-1343 SEO, TASK-1345 desarrollo web) cubren servicios puntuales, no el posicionamiento de la capability creativa como sistema. Esta task define esa landing como artefacto de marca + conversión.

## Goal

- Publicar una landing de agencia creativa en `efeoncepro.com` que lidere con Efeonce, posicione a Efeonce como **la capacidad de producción creativa que escala el output del equipo de marketing in-house** (partner, no reemplazo) "operada como sistema medible con visibilidad total", y convierta a **"Agenda una reunión"** (HubSpot Meetings) con atribución UTM.
- Que la ejecución **pruebe** el concepto Design Engineer: art direction real, motion con intención, performance y accesibilidad. Para el candidato live 2026-07-07, esto se resuelve con widgets Elementor custom gobernados en `eo-elementor-widgets` por instrucción explícita del operador.
- Incluir el bloque diferenciador de **operaciones creativas medibles** con el **Time-to-Market como titular** (más piezas bien a la primera + menos rondas → ciclo más corto → llegas antes al mercado → Revenue Enabled) como componente vivo, no imagen estática — la ventaja competitiva es producir más rápido sin perder calidad, **probado con el número**.
- Dejar la superficie indexable + citable (SEO/AEO: schema, answer capsules) y medible (conversión + GA4/GSC).

<!-- ═══════════════════════════════════════════════════════════
 ZONE 1 — CONTEXT & CONSTRAINTS
 ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/` (índice del hogar-producto del sitio público: `README.md` + `PRODUCT_ROADMAP.md` + `decisions/` PDR) — **empezar aquí**.
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md` — layering: `efeoncepro.com` = demand-capture + conversión.
- `docs/context/09_marca-agencia.md` — arquitectura de marca (lidera Efeonce), sistema verbal "Empower your ___", messaging por audiencia, reglas de comunicación (beneficios antes que siglas, tuteo).
- `docs/context/01_quienes-somos.md` — qué hace Efeonce, las 4 unidades, ICO (4 dimensiones + 2 cadenas causales), tools, casos citables.
- `docs/context/06_glosario-metricas.md` — naming canónico de métricas ICO (RpA, FTR, Cycle Time, TTM, Revenue Enabled) para el bloque diferenciador.
- `docs/context/05_voz-tono-estilo.md` — voz/tono es-CL para el copy visible.

Reglas obligatorias:

- **Lidera Efeonce** (masterbrand). Globe/Reach/Wave nunca solos; Globe Studio solo como "| Efeonce". No exponer las capabilities como proveedores separados.
- **Beneficios antes que siglas.** ICO/RpA/FTR solo en el bloque de prueba/procurement, nunca en el hero. Tuteo ("tú"), sin voseo.
- **Solo casos citables:** Sky Airlines, Bresler, Pinturas Berel. No inflar cifras; para la barra de prueba de Creative V2 usar `+90 empresas` + países visibles, no el claim largo `120+ / 4 países / 80% / HubSpot`.
- **Assets IA producidos con el stack propio y gobernados:** dirección de arte con `design-studio`; generación con `fal.ai` (`GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`) / Higgsfield / Magnific; terminación Adobe. Producción **out-of-band** (no runtime del producto); paleta tokenizada, no HEX inventados; nunca logos de operating-entity generados por IA.
- **Design Engineer bar:** performance (LCP/INP) es señal de craft, no opcional; motion respeta `prefers-reduced-motion` (WCAG 2.3.3); contraste de texto sobre media (WCAG 1.4.3).

## Normative Docs

- `docs/tasks/complete/TASK-1343-servicios-posicionamiento-seo-landing.md` y `docs/tasks/in-progress/TASK-1345-...` (referencia de patrón de landing WordPress viva: page ID, Yoast/canonical/schema, verificación Playwright live 1440/390, purga Kinsta).
- `.claude/skills/efeonce-public-site-wordpress/` — skill canónica de build del sitio público (WP/Kinsta, theme custom, WP-CLI/REST).
- `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` — catálogo de modelos para producción de assets.

## Dependencies & Impact

### Depends on

- **Dirección de arte aprobada (Product Design)** — el hero + KV art-dirigidos NO existen aún; se producen con `design-studio` → `fal.ai`/Higgsfield/Magnific como paso previo. `UI ready` permanece `no` hasta tener esa dirección aprobada + el design decision log completo.
- Contrato de conversión existente del sitio público: HubSpot Meetings + el patrón UTM→`/contacto/`/Growth Form ya usado por TASK-1345 (reuse, no crear backend nuevo). `[verificar]` el embed/URL de Meetings vigente.

### Blocks / Impacts

- EPIC-019 (landings públicas): esta landing es un nodo del programa; su flow debe referenciar el patrón de conversión compartido del EPIC.
- Refuerza el claim de marca que el portal Greenhouse materializa (transparencia radical) — coherencia visual del bloque diferenciador con el producto real.

### Files owned

- `docs/tasks/to-do/TASK-1350-landing-agencia-creativa.md`
- `docs/ui/wireframes/TASK-1350-landing-agencia-creativa.md`
- `docs/ui/flows/TASK-1350-landing-agencia-creativa-flow.md`
- `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md` `[a crear como follow-up antes de UI ready: yes]`
- WordPress: theme partials/plantilla de página custom + bundle Vite del hero/islands `[paths reales al implementar en el repo del sitio / theme]`

## Current Repo State

### Already exists

- Patrón de landing pública WordPress viva y verificada (TASK-1343 / TASK-1345): theme Ohio, Yoast, schema JSON-LD, verificación Playwright live, purga Kinsta.
- Stack IA de producción de assets operativo: `src/lib/ai/fal.ts` (fal.ai, verificado 2026-07-06) + Higgsfield (CLI/MCP) + Magnific (MCP) + Adobe (MCP) + `pnpm ai:image`.
- Contexto de negocio completo (`docs/context/*`) y skills de disciplina (CRO, SEO/AEO, digital-marketing, design-studio, motion-design(-studio), modern-ui, web-perf-design, efeonce-public-site-wordpress).

### Gap

- No existe una landing de la **capability creativa** con posicionamiento de marca (hoy solo landings de servicio puntual).
- No existe la dirección de arte del hero ni los assets (a producir).
- No existe el componente vivo de "operaciones creativas medibles" para la web pública.
- El contrato de Motion de la candidata Elementor ya existe en `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md`; el cutover sigue pendiente de aprobación del operador y de verificación final post-redirección.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: **departamento de marketing y/o equipo creativo in-house** de una empresa **mid-market o enterprise** — el decisor típico es el Director/Gerente de Marketing (comprador), con CMO/CEO como sponsor y Compras como validador. Ya tienen equipo interno; buscan un partner de producción, no un reemplazo. Visitante público, no autenticado.
- Momento del flujo: descubrimiento (orgánico/AEO/pauta/referido) evaluando si Efeonce es el partner creativo; primer contacto frío→tibio.
- Resultado perceptible esperado: entiende en <10s que Efeonce es **la capacidad de producción creativa que escala su output** (partner, no reemplazo), **operada como sistema medible con visibilidad total**, y que la propia landing prueba craft técnico; agenda una reunión.
- Friccion que debe reducir: (a) "todas las agencias suenan/se ven igual"; (b) la desconfianza de "creatividad = caja negra"; (c) el miedo del equipo in-house a **perder control/visibilidad** al tercerizar producción.
- No-goals UX: no es self-serve, no es checkout, no expone el portal Greenhouse ni datos de cliente; no vende un servicio puntual (eso son otras landings).

### Surface & system decision

- Surface: página pública nueva en `efeoncepro.com`. Candidato live 2026-07-07: WordPress + Elementor modular custom widgets en `/agencia-creativa-v2/`; no es ruta del portal Greenhouse.
- Composition Shell: `no aplica` — es sitio público WordPress, no el shell del portal (contratos UI Platform de Greenhouse no aplican; el "sistema" acá es el theme + tokens de marca Efeonce).
- Primitive decision: `new public-site widget` — widget Elementor `greenhouse_creative_landing_module` en `eo-elementor-widgets`, instanciado una vez por módulo para evitar HTML monolítico. No usa primitives del portal; el bloque de métricas reusa el lenguaje visual del producto como implementación pública independiente.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: modal/embed de HubSpot Meetings para el booking (o sección dedicada); ver Flow.
- Copy source: contenido de página WordPress (es-CL), redactado/validado con `greenhouse-ux-writing` + `docs/context/05_voz-tono-estilo.md` + `09_marca-agencia.md`. No `src/lib/copy/*` (no es portal).
- Access impact: `none` (público, sin auth/capability).

### State inventory

- Default: landing completa renderizada, hero con media art-dirigido (poster + video lazy).
- Loading: media del hero con poster/blur-up mientras carga; islands (bloque métricas) con skeleton antes de hidratar.
- Empty: N/A (contenido estático curado; no hay data vacía) — el bloque de métricas usa cifras curadas/ilustrativas, no live del portal.
- Error: si el embed de Meetings/form falla, fallback visible a `/contacto/` + WhatsApp/mailto (nunca CTA muerto).
- Degraded / partial: si el video de frontera no puede cargar (red/datos/reduced-motion), degradar a still art-dirigido sin romper layout ni contraste.
- Permission denied: N/A (público).
- Long content: página larga multi-sección con scroll; sin scroll horizontal en desktop ni 390px.
- Mobile / compact: layout responsive real; media más liviano en mobile; CTA sticky/visible.
- Keyboard / focus: navegable por teclado; foco visible; orden lógico; skip-to-content.
- Reduced motion: `prefers-reduced-motion` → sin video autoplay, sin parallax/scroll-driven; entradas instantáneas o fade mínimo.

### Interaction contract

- Primary interaction: click en "Agenda una reunión" → abre booking (HubSpot Meetings modal/embed o sección) con UTM preservado.
- Hover / focus / active: estados tactile en CTAs y cards (motion tokenizado); foco visible siempre.
- Pending / disabled: durante carga del embed de Meetings, estado pending del CTA; nunca doble-submit.
- Escape / click-away: cierra el modal de Meetings y restaura foco al CTA disparador.
- Focus restore: al cerrar el booking, foco vuelve al CTA origen.
- Latency feedback: skeleton/poster para media; spinner/estado para el embed.
- Toast / alert behavior: confirmación de agendamiento la maneja HubSpot Meetings; fallback de error → mensaje es-CL + ruta alterna.

### Motion & microinteractions

- Motion primitive: `CSS + JS scoped` dentro del widget público Elementor `greenhouse_creative_landing_module`; contrato canónico en `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md`.
- Enter / exit: reveals on-scroll por sección (stagger), number-tickers en el bloque de métricas.
- Layout morph: transiciones de sección; hover tactile en cards.
- Stagger: sí, en grillas de capability y casos.
- Timing / easing token: fuente-mapeado desde el HTML aprobado y documentado en el contrato de Motion; futura extracción puede mapearlo a tokens compartidos del sitio público.
- Reduced-motion fallback: obligatorio (ver State inventory).
- Non-goal motion: nada que dañe CWV/INP ni que distraiga del claim; sin autoplay con sonido.

### Implementation mapping

- Route / surface: candidato live WordPress `https://efeoncepro.com/agencia-creativa-v2/` (`postId=251279`, `noindex` hasta cutover). La página canónica `/agencia-creativa/` (`postId=249582`) no se tocó.
- Primitive / variant / kind: public-site Elementor widget `greenhouse_creative_landing_module`, módulos `hero`, `trust`, `problem`, `workflow`, `services`, `ai_engine`, `metrics`, `work`, `cases`, `testimonial`, `ecosystem`, `process`, `cta`, `faq`.
- Component candidates: hero art-dirigido, trust bar, secciones de contenido, **bloque vivo de métricas** (island), grilla de casos, embed de Meetings, FAQ.
- Copy source: contenido WP es-CL (validado `greenhouse-ux-writing`).
- Data reader / command: **ninguno de Greenhouse** — conversión vía HubSpot Meetings/Forms existentes (reuse). Métricas del bloque diferenciador = cifras curadas/ilustrativas, no readers live del portal (declararlo honesto en copy).
- API parity: N/A — no expone acción de negocio de Greenhouse; la única acción (agendar) es HubSpot, gobernada por su propio contrato.
- Access / capability: none (público).
- States to implement: default, loading (media/island), error (embed fallback), degraded (video→still), mobile, keyboard/focus, reduced-motion.

### GVC scenario plan

- Scenario file: **N/A (GVC del portal no aplica)** — la superficie es WordPress público, no una ruta del portal con agent-auth. La verificación visual sigue el patrón de TASK-1343/1345: **Playwright live sobre la página publicada**.
- Route: URL pública de la página `[una vez publicada]`.
- Viewports: desktop 1440 + 1280 + mobile 390.
- Required steps: cargar página, scroll completo, abrir/cerrar booking, forzar `prefers-reduced-motion`.
- Required captures: hero, bloque diferenciador (métricas), sección casos, booking abierto, mobile 390 full-scroll.
- Required `data-capture` markers: N/A (portal); usar selectores/secciones de la página pública.
- Assertions: `errors=[]` en consola, sin overflow horizontal (desktop + 390), CWV dentro de budget (LCP/INP), contraste AA del texto sobre media, CTAs alcanzables por teclado, reduced-motion respetado, no-leak (sin datos internos/portal expuestos).
- Scroll-width checks: sí (desktop + 390px).
- Accessibility/focus checks: foco visible, orden lógico, escape del modal restaura foco.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce` mostrando still (sin video autoplay).

### Design decision log

- Decision: landing de posicionamiento de la capability creativa, liderada por Efeonce, con concepto de ejecución Design Engineer (arte+color+ingeniería) y diferenciador de operaciones medibles; build WordPress **code-custom** (no Elementor).
- Alternatives considered: (a) Astro hand-built en Vercel (máximo craft, pero routing hacia `efeoncepro.com` y sale del dominio canónico WP) — **descartado por decisión del operador a favor de WP-custom**; (b) Elementor drag-drop — **descartado**: contradice el mensaje Design Engineer y topa el techo de craft.
- Why this pattern: el medio es el mensaje — la landing debe *probar* craft técnico; WP-custom con bundle Vite para islands lo permite dentro del dominio canónico, asumiendo el trade-off de pelear con la plataforma (techo de craft más bajo que Astro, mitigado con enqueue disciplinado + media lazy + Kinsta CDN).
- Reuse / extend / new primitive: new (one-off público); reusa el contrato de conversión HubSpot Meetings/Forms del sitio.
- Open risks: performance vs riqueza visual (video de frontera pesado); riesgo "AI slop" (mitigar con art direction + color tokenizado); WP como techo de craft; contraste/a11y sobre media rica.

### Visual verification

- GVC scenario: N/A portal — Playwright live (ver GVC scenario plan).
- Viewports: 1440 / 1280 / 390.
- Required captures: hero, diferenciador, casos, booking, mobile full-scroll, reduced-motion still.
- Required `data-capture` markers: N/A (público).
- Scroll-width check: sí.
- Accessibility/focus checks: sí (teclado, foco, contraste AA).
- Before/after evidence: N/A (superficie nueva).
- Known visual debt: cutover/redirección y verificación final post-cutover pendientes; la candidata mantiene `noindex` hasta aprobación.

<!-- ═══════════════════════════════════════════════════════════
 ZONE 2 — PLAN MODE
 El agente que toma esta task ejecuta Discovery y produce
 plan.md segun TASK_PROCESS.md. No llenar al crear la task.
 ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
 ZONE 3 — EXECUTION SPEC
 ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dirección de arte + producción de assets (pre-build)

- Fijar dirección de arte del hero + KV con `design-studio` (concepto, paleta tokenizada Efeonce, racional arte+color+ingeniería).
- Producir 2–3 direcciones visuales reales del hero con el stack propio (`fal.ai` video de frontera / Higgsfield / upscale Magnific / terminación Adobe); el operador elige.
- Entregable: dirección aprobada + assets (poster + video optimizado AV1/WebM + stills) + registro en el design decision log. **Cierra el gate de `UI ready: no → yes` junto con el contrato de Motion.**

### Slice 2 — Copy es-CL + contrato de Motion

- Redactar el copy completo (hero, secciones, FAQ answer-capsules, estados) con `greenhouse-ux-writing`, liderando Efeonce, beneficios antes que siglas, tuteo; solo casos citables.
- Escribir `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md` (tokens de timing/easing, scroll reveals, number-tickers, reduced-motion) con `motion-design`/`motion-design-studio`.

### Slice 3 — Build WordPress Elementor modular (operator override 2026-07-07)

- Widget propio en `eo-elementor-widgets` + assets CSS/JS versionados por `filemtime()`, con un widget por módulo de la landing.
- Implementar secciones, estados (loading/error/degraded/mobile/reduced-motion), motion tokenizado, CTA "Agenda una reunión" → HubSpot Meetings con UTM.
- SEO/AEO: JSON-LD (`Organization`/`Service`/`FAQPage`/`BreadcrumbList`), Yoast/canonical, answer capsules; performance budget (LCP/INP).

### Slice 4 — Publicar + verificar + medir

- Publicar la página (page ID), purgar Kinsta, verificación Playwright live (1440/1280/390, overflow, `errors=[]`, contraste, reduced-motion).
- Instrumentar conversión: UTM + GA4 events (CTA click, booking, "mira cómo medimos") + registrar en HubSpot.
- Registrar en `docs/public-site/` (roadmap) y triple documentación proporcional.

## Out of Scope

- Portal Greenhouse: no se toca ninguna ruta/primitive/capability del portal.
- Backend Greenhouse nuevo: la conversión reusa HubSpot Meetings/Forms; no se crea API/DB/command.
- Métricas ICO **live** del portal en la web pública (el bloque usa cifras curadas/ilustrativas; conectar data real sería otra task con su contrato).
- Migración a Astro / cambio de host (decisión = WP-custom).
- Landings de servicio puntual (SEO, desarrollo web) — ya cubiertas por otras tasks del EPIC-019.
- Generación de logos de operating-entity por IA.

## Detailed Spec

Estructura canónica de la página (jerarquía de conversión; detalle de regiones y copy en el wireframe; detalle de transiciones/booking en el flow):

1. Hero — claim + media art-dirigido + CTA "Agenda una reunión" (+ secundario "Mira cómo medimos").
2. Barra de prueba — países `Chile · Colombia · México · Perú`, chip `+90 empresas` y marquee de logos a color.
3. El problema — el equipo de marketing in-house no da abasto (demanda de piezas > capacidad) + fragmentación + caja negra al tercerizar.
4. Cómo trabajamos contigo — **partner de producción, no reemplazo**: "tu equipo dirige, nosotros producimos a escala, y lo ves todo". Loop Marketing como beneficio ("gasto → inversión que se acumula").
5. Qué hacemos — capacidad de producción creativa que escala el output del equipo: identidad, contenido full-funnel, audiovisual (Globe Studio), campañas.
6. ⭐ Diferenciador medible — **la ventaja competitiva es el Time-to-Market probado**: más piezas bien a la primera (FTR = calidad, guardrail de la velocidad) + menos rondas (RpA) → ciclo más corto → **llegas antes al mercado (TTM)** → Revenue Enabled. TTM es el **titular** de la cadena; el bloque vivo (island) lo muestra como número, no como promesa. "Producir más rápido sin perder calidad" no se afirma: se mide y se ve.
7. Motor de producción IA — Multi-Model AI Studio + "cómo está hecho" (los propios assets como portfolio).
8. Casos — Sky (+127% tráfico orgánico), Bresler (+180% ventas digitales), Berel (retainer SEO+AEO).
9. Ecosistema / switching cost — Greenhouse como prueba de la transparencia.
10. CTA final + booking (HubSpot Meetings).
11. FAQ — answer capsules (doble función: objeciones + AEO).

## Rollout Plan & Risk Matrix

Cambio **aditivo, público, sin runtime de producto Greenhouse**: publicación de una página nueva de marketing en WordPress. Sin migraciones, sin flags de producto, sin datos de cliente. El riesgo material es de **marca/craft/performance**, no de sistema.

### Slice ordering hard rule

- Slice 1 (arte/assets) + Slice 2 (copy + Motion) → **preceden** a Slice 3 (build): no se implementa JSX/theme sin dirección aprobada, copy y contrato de Motion (regla anti "pintar freehand").
- Slice 3 (build) → Slice 4 (publicar + verificar): no se publica sin verificación Playwright live verde (overflow, errors, contraste, reduced-motion, CWV).
- `UI ready: no → yes` solo cuando Slice 1 (dirección aprobada + design decision log) y el contrato de Motion estén completos y `pnpm task:lint --task TASK-1350` quede sin findings.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Performance pobre (video de frontera pesado) mata el claim de "ingeniería" | UI / público | medium | poster + lazy AV1/WebM, islands, budget LCP/INP, Kinsta CDN | Lighthouse/CWV en verificación live; degradación visible |
| "AI slop" (visual genérico) lee barato, no premium | UI / marca | medium | art direction primero (design-studio), color tokenizado, restraint de motion, revisión humana del KV | rechazo del operador en Slice 1 |
| Copy filtra siglas/infla cifras/usa un caso no citable | marca | low | reglas duras de `09_marca-agencia`; validación `greenhouse-ux-writing`; solo casos citables | review de copy pre-publicación |
| Contraste/a11y sobre media rica falla | UI / a11y | medium | contraste AA verificado, reduced-motion, foco visible | Playwright live + audit a11y |
| CTA muerto si el embed de Meetings falla | conversión | low | fallback a `/contacto/` + WhatsApp/mailto | verificación del booking en live |

### Feature flags / cutover

Sin flag de producto. Candidato live additive en `/agencia-creativa-v2/` con `noindex, follow`; `/agencia-creativa/` queda intacta hasta que el operador apruebe redirección/cutover. Revert = despublicar la candidata o restaurar backups Elementor/post meta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | descartar dirección/assets (no publicados) | inmediato | sí |
| Slice 2 | descartar copy/Motion doc (docs) | inmediato | sí |
| Slice 3 | no publicar (queda en borrador) | inmediato | sí |
| Slice 4 | despublicar la página WP + purgar Kinsta | <10 min | sí |

### Production verification sequence

1. Slice 1 aprobado (operador elige dirección + assets producidos con el stack propio).
2. Slice 2: copy validado (`greenhouse-ux-writing`) + contrato de Motion escrito.
3. Slice 3: build en borrador WP; verificación Playwright en la preview.
4. Slice 4: publicar → purgar Kinsta → Playwright live 1440/1280/390 (overflow, `errors=[]`, contraste, reduced-motion, CWV) → verificar booking real (Meetings) + UTM + GA4 events.
5. Monitorear conversión + CWV los primeros días.

### Out-of-band coordination required

- HubSpot Meetings/Forms: confirmar el link/embed vigente y la propiedad de destino (reuse del contrato existente; sin crear propiedades nuevas salvo que se decida).
- WordPress/Kinsta: acceso de publicación + purga de cache.
- Decisión del slug/URL + registro SEO (canonical, sitemap).

<!-- ═══════════════════════════════════════════════════════════
 ZONE 4 — VERIFICATION & CLOSING
 ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

### Evidence 2026-07-07 live candidate

- [x] Nueva URL creada sin tocar `/agencia-creativa/`: `https://efeoncepro.com/agencia-creativa-v2/` (`postId=251279`, `publish`, `noindex`).
- [x] Implementación modular: árbol Elementor verificado con 14 widgets `greenhouse_creative_landing_module` y `0` widgets HTML.
- [x] Header/footer nativos Efeonce/Ohio preservados; header/footer del HTML fuente no publicados.
- [x] Header dark nativo Ohio aplicado como Home/AEO: root Elementor `ghcroot` conserva `clb__dark_section`, `#masthead.header-3` recibe `light-typo`, `page_header_menu_text_typo` queda como JSON string `{"color":"rgba(255,255,255,0.75)"}` y el menú desktop computa claro desde first paint/no-JS sin CSS de header forzado.
- [x] Rail superior del hero bajado bajo el header Ohio: `.ghc-hero-wrap` top padding `clamp(140px, 10vw, 184px)` con gap medido `35px` desktop 1440, `45px` wide 2048 y `31px` mobile 390.
- [x] Statement del hero alineado al HTML fuente: copy en `<span>` flexible + barra `<i aria-hidden>` flush-right al borde del pill, no pseudo-element junto al texto.
- [x] Runtime prototipo removido: sin `x-import`, `sc-if`, `image-slot`, `_ds_bundle`, `support.js` ni `text/x-dc`.
- [x] SEO base de candidata: Yoast title/metadescription/excerpt/focus keyphrase/OG/Twitter/FAQPage JSON-LD; `noindex` activo hasta cutover.
- [x] Verificación Playwright live desktop `1440`, mobile `390` y reduced-motion: HTTP `200`, consola sin errores, `scrollWidth == clientWidth`, CSS/JS del widget cargados, HubSpot Meetings con UTM, `prefers-reduced-motion` honrado.
- [x] Auditoría de fidelidad motion/microinteractions: colores fuente `#04263f`, `#fb7a00`, `#5145e0`, `#0375db`; keyframes `fabRise`, `fabBars`, `ghcCursor`, `ghcMarquee`; hover de servicios/bento; reduced-motion con `animationName=none`.
- [x] Scroll-bound motion restaurado contra el HTML aprobado: `backlogFill`, `procFill` y `procToken` ya no corren desde page load; esperan `[data-ghc-reveal].is-in`, se animan al entrar al viewport y quedan final/static bajo reduced-motion. Backup remoto: `/www/efeoncegroup_752/public/wp-content/plugins/eo-elementor-widgets/assets/css/creative-landing-before-scroll-motion-fix-20260707T104605Z.css`.
- [x] CTA hover/focus reparado y auditado: Ohio/global ya no puede inyectar fondo blanco sobre `Agenda una reunión` ni sobre `Mira cómo medimos`; primary/secondary/fallback links tienen estados idle/hover/focus/active/reduced-motion page-scoped. Backup remoto: `/www/efeoncegroup_752/public/wp-content/plugins/eo-elementor-widgets/assets/css/creative-landing-before-cta-hover-20260707T110557Z.css`; evidencia `.captures/task1350-cta-hover-audit-after/` (`failures=0`, `consoleErrors=0`, mobile overflow `0`, reduced-motion failures `0`).
- [x] Trust strip actualizado con el marquee de logos de AEO: reutiliza la primitiva `greenhouse_logo_marquee` dentro de `greenhouse_creative_landing_module`, 7 logos únicos a color (`filter=none`), 3 sets idénticos, hover pause, edge fade compacto y reduced-motion sin animación ni sets duplicados. Backups remotos: `class-eo-creative-landing-module-widget-before-trust-logo-marquee-20260707T112826Z.php`, `creative-landing-before-trust-logo-marquee-20260707T112826Z.css`, `creative-landing-before-trust-logo-marquee-reduced-motion-20260707T113012Z.css`; evidencia `.captures/task1350-trust-logo-marquee-2026-07-07T11-31-00Z/` (`firstSetCount=7`, `animationName=gh-logo-marquee-scroll`, `hoverState=paused`, desktop/mobile overflow `0`).
- [x] Gutter blanco lateral corregido: `.gh-creative-elementor-shell` y `.gh-creative` computan `left=0` en desktop `1440`, wide `2048` y mobile `390`; edge pixels resuelven al fondo de la sección y `scrollWidth == clientWidth`.
- [x] Evidencia final post-header: `.captures/task1350-header-variant-2026-07-07T08-23-24-152Z/`, `.captures/task1350-header-first-paint-2026-07-07T09-11-03-691Z/` y `.captures/task1350-creative-v2-2026-07-07T09-11-03-691Z/`.
- [x] Evidencia final post-hero-offset: `.captures/task1350-hero-offset-2026-07-07T08-28-52-018Z/` y `.captures/task1350-creative-v2-2026-07-07T08-29-15-615Z/`.
- [x] Evidencia final post-statement-parity: `.captures/task1350-statement-bar-2026-07-07T08-33-07-290Z/` y `.captures/task1350-creative-v2-2026-07-07T08-33-34-683Z/`.
- [x] Evidencia final post-services-marquee: `.captures/task1350-services-marquee-colors-2026-07-07T08-46-12-064Z/`.
- [x] Evidencia final post-service-card-motion: `.captures/task1350-service-card-motion-2026-07-07T08-45-47-960Z/`.
- [x] Evidencia final post-brand-logos: `.captures/task1350-brand-logos-2026-07-07T08-51-39-289Z/`.
- [x] Smoke completo vigente post-brand-logos: `.captures/task1350-creative-v2-2026-07-07T08-52-05-854Z/`.
- [x] Evidencia final post-metrics-wrap: `.captures/task1350-metrics-wrap-2026-07-07T08-59-44-613Z/` y `.captures/task1350-creative-v2-2026-07-07T09-00-15-263Z/`.
- [x] Playbook de headers Ohio documentado para evitar drift futuro: `docs/documentation/public-site/wordpress-ohio-elementor-layout.md#playbook-variantes-de-header-ohio`, runbook relacionado y skills Codex/Claude `efeonce-public-site-wordpress`.

- [x] Se declaró `Execution profile: ui-ux`, `UI impact: flow`, `Backend impact: none`.
- [ ] `UI ready` permanece `no` hasta aprobación de cutover/redirección, revisión final de dirección de arte y `pnpm task:lint --task TASK-1350` sin findings.
- [x] Existe `docs/ui/wireframes/TASK-1350-landing-agencia-creativa.md` (declarado en Status).
- [x] Existe `docs/ui/flows/TASK-1350-landing-agencia-creativa-flow.md` (declarado en Status).
- [ ] La landing lidera **Efeonce** (no Globe/Reach/Wave sueltos) y el hero no usa siglas.
- [ ] CTA primario = **"Agenda una reunión"** → HubSpot Meetings con UTM; fallback si el embed falla.
- [ ] Bloque diferenciador de operaciones creativas medibles presente (cifras honestas/ilustrativas, no live del portal).
- [ ] Solo casos citables (Sky/Bresler/Berel); cifras coherentes con el doc de autoridad.
- [ ] Assets producidos con el stack IA propio (fal.ai/Higgsfield/Magnific/Adobe), art-dirigidos, color tokenizado; sin logos de operating-entity generados por IA.
- [x] Motion respeta `prefers-reduced-motion`; sin scroll horizontal desktop/390 en candidata live.
- [ ] CWV dentro de budget (LCP/INP) verificado en live.
- [ ] SEO/AEO: JSON-LD válido (`Organization`/`Service`/`FAQPage`/`BreadcrumbList`), canonical/Yoast, answer capsules en el FAQ.
- [ ] Conversión instrumentada (UTM + GA4 events) y registrada en HubSpot.
- [ ] Verificación Playwright live 1440/1280/390 con `errors=[]`, sin overflow, reduced-motion evidenciado.

## Verification

- Playwright live sobre la página publicada (1440/1280/390): overflow, `errors=[]`, contraste, reduced-motion, CWV.
- Validación de copy con `greenhouse-ux-writing` + reglas de marca.
- Validación de JSON-LD (Rich Results) + canonical/sitemap.
- Verificación del booking real (HubSpot Meetings) + UTM + GA4 events.
- `pnpm task:lint --task TASK-1350`, `pnpm ui:wireframe-check --task TASK-1350`, `pnpm ui:flow-check --task TASK-1350`.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/`, `complete/`).
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado.
- [ ] `changelog.md` actualizado si cambia comportamiento/estructura visible.
- [ ] chequeo de impacto cruzado (EPIC-019, docs/public-site/PRODUCT_ROADMAP).
- [x] Contrato de Motion (`docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md`) creado y declarado en Status.
- [ ] Triple documentación proporcional (técnica/funcional/manual o delta según aplique) + registro en `docs/public-site/`.

## Follow-ups

- **Motion contract** `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md` (creado para la candidata live; actualizar si el operador pide una variante post-cutover).
- Definir slug/URL canónico y registro SEO (posible hub `/servicios/` o `/agencia-creativa/`).
- Posible V2: conectar el bloque diferenciador a métricas reales (con su propio contrato de datos) — hoy fuera de scope.
- Variantes de campaña/pauta (Reach) y medición de Share of Voice IA (AEO) como seguimiento de digital-marketing.

## Open Questions

- Slug/URL canónico de la página (`/agencia-creativa/` vs bajo `/servicios/`) — pendiente de IA/SEO.
- ¿El bloque diferenciador queda con cifras ilustrativas curadas (recomendado v1) o se prioriza conectar data real (V2)?
- Embed vs sección dedicada para HubSpot Meetings `[verificar]` el contrato vigente del sitio.
