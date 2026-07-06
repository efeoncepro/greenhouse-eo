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
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `task/TASK-1350-landing-agencia-creativa`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Landing pública de la capability creativa de Efeonce (`efeoncepro.com`, WordPress **code-custom**, NO Elementor), posicionada como **"la agencia creativa que puedes ver operar en tiempo real"**. Concepto de ejecución **Design Engineer** = arte + color + ingeniería: assets art-dirigidos producidos con el stack IA propio (fal.ai / Higgsfield / Magnific / Adobe CC), montados como experiencia performante e interactiva. Lidera la masterbrand **Efeonce**; CTA primario **"Agenda una reunión"** (HubSpot Meetings). El diferenciador es un bloque de **operaciones creativas medibles** (ICO) — el mismo claim de transparencia que Greenhouse entrega.

## Why This Task Exists

El 68% de los compradores B2B dice que todas las agencias suenan igual (`docs/context/09_marca-agencia.md`). Efeonce no tiene hoy una landing de agencia creativa que (a) lidere con la marca masterbrand, (b) diferencie por la **operación creativa medible + transparencia radical** (el activo único que da ICO + el ecosistema de producto), y (c) **demuestre** capacidad técnica siendo ella misma una pieza de craft (el medio es el mensaje). Las landings de servicio existentes (TASK-1343 SEO, TASK-1345 desarrollo web) cubren servicios puntuales, no el posicionamiento de la capability creativa como sistema. Esta task define esa landing como artefacto de marca + conversión.

## Goal

- Publicar una landing de agencia creativa en `efeoncepro.com` que lidere con Efeonce, posicione "creatividad operada como sistema medible" y convierta a **"Agenda una reunión"** (HubSpot Meetings) con atribución UTM.
- Que la ejecución **pruebe** el concepto Design Engineer: art direction real (assets producidos con el stack IA propio), motion con intención, performance (CWV) impecable y accesibilidad — construida a mano en un theme custom, no en Elementor.
- Incluir el bloque diferenciador de **operaciones creativas medibles** (menos rondas / más piezas bien a la primera / ciclo más corto → Revenue Enabled) como componente vivo, no imagen estática.
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
- **Solo casos citables:** Sky Airlines, Bresler, Pinturas Berel, SSilva. **NUNCA GEA Grupo** ni métricas inventadas. No inflar cifras; usar las del doc de autoridad (`120+ empresas`, `80% renovación`).
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
- El contrato de Motion (art+color+ingeniería, GSAP, video de frontera + reduced-motion) aún no está escrito — es follow-up obligatorio antes de `UI ready: yes`.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: decisor de marketing (CMO / Director de Marketing) + sponsor de presupuesto (CEO/Gerente General) + validador (Compras). Visitante público, no autenticado.
- Momento del flujo: descubrimiento (orgánico/AEO/pauta/referido) evaluando si Efeonce es la agencia creativa; primer contacto frío→tibio.
- Resultado perceptible esperado: entiende en <10s que Efeonce hace creatividad **operada como sistema medible con visibilidad total** y que la propia landing prueba craft técnico; agenda una reunión.
- Friccion que debe reducir: la percepción "todas las agencias suenan/se ven igual" y la desconfianza de "creatividad = caja negra".
- No-goals UX: no es self-serve, no es checkout, no expone el portal Greenhouse ni datos de cliente; no vende un servicio puntual (eso son otras landings).

### Surface & system decision

- Surface: página pública nueva en `efeoncepro.com` (WordPress code-custom; theme partial + bundle Vite para hero/islands). No es ruta del portal Greenhouse.
- Composition Shell: `no aplica` — es sitio público WordPress, no el shell del portal (contratos UI Platform de Greenhouse no aplican; el "sistema" acá es el theme + tokens de marca Efeonce).
- Primitive decision: `new (one-off público)` — secciones/bloques del theme custom, NO primitives del design system del portal; el bloque de métricas reusa el lenguaje visual del producto pero es implementación pública independiente.
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

- Motion primitive: `CSS + GSAP` (theme público; scroll-driven/reveal/number-tickers) — **detalle canónico pendiente en el contrato de Motion** (`docs/ui/motion/TASK-1350-...-motion.md`, follow-up obligatorio antes de `UI ready: yes`).
- Enter / exit: reveals on-scroll por sección (stagger), number-tickers en el bloque de métricas.
- Layout morph: transiciones de sección; hover tactile en cards.
- Stagger: sí, en grillas de capability y casos.
- Timing / easing token: definir en el contrato de Motion (tokens de marca Efeonce, no magic numbers).
- Reduced-motion fallback: obligatorio (ver State inventory).
- Non-goal motion: nada que dañe CWV/INP ni que distraiga del claim; sin autoplay con sonido.

### Implementation mapping

- Route / surface: nueva página WordPress `efeoncepro.com/<slug>` `[slug a definir: p.ej. /agencia-creativa/ — verificar IA/SEO]`; theme partial + bundle Vite (hero/islands).
- Primitive / variant / kind: bloques de theme custom (no design system del portal).
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
- Known visual debt: dirección de arte + assets del hero y contrato de Motion pendientes (bloquean `UI ready: yes`).

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

### Slice 3 — Build WordPress code-custom

- Theme partial + plantilla de página custom (no Elementor) + bundle Vite para hero e islands (bloque de métricas vivo).
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
2. Barra de prueba — logos + `120+ empresas · 4 países · 80% renovación · HubSpot Solutions Partner`.
3. El problema — fragmentación + caja negra.
4. Cómo trabajamos — Loop Marketing como beneficio ("gasto → inversión que se acumula").
5. Qué hacemos — capability creativa (identidad, contenido full-funnel, audiovisual Globe Studio, campañas).
6. ⭐ Diferenciador medible — operaciones creativas (menos rondas / más bien a la primera / ciclo más corto → Revenue Enabled) como bloque vivo (island).
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
| Copy filtra siglas/infla cifras/usa caso no citable (GEA) | marca | low | reglas duras de `09_marca-agencia`; validación `greenhouse-ux-writing`; solo casos citables | review de copy pre-publicación |
| Contraste/a11y sobre media rica falla | UI / a11y | medium | contraste AA verificado, reduced-motion, foco visible | Playwright live + audit a11y |
| CTA muerto si el embed de Meetings falla | conversión | low | fallback a `/contacto/` + WhatsApp/mailto | verificación del booking en live |

### Feature flags / cutover

Sin flag — additive, immediate cutover. Es una página pública nueva; el "cutover" es publicarla en WordPress (borrador → publicada). Revert = despublicar la página (inmediato, reversible). No hay flag de producto porque no toca runtime de Greenhouse.

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

- [ ] Se declaró `Execution profile: ui-ux`, `UI impact: flow`, `Backend impact: none`.
- [ ] `UI ready` permanece `no` hasta tener dirección de arte aprobada + contrato de Motion + design decision log; solo entonces pasa a `yes` con `pnpm task:lint --task TASK-1350` sin findings.
- [ ] Existe `docs/ui/wireframes/TASK-1350-landing-agencia-creativa.md` (declarado en Status).
- [ ] Existe `docs/ui/flows/TASK-1350-landing-agencia-creativa-flow.md` (declarado en Status).
- [ ] La landing lidera **Efeonce** (no Globe/Reach/Wave sueltos) y el hero no usa siglas.
- [ ] CTA primario = **"Agenda una reunión"** → HubSpot Meetings con UTM; fallback si el embed falla.
- [ ] Bloque diferenciador de operaciones creativas medibles presente (cifras honestas/ilustrativas, no live del portal).
- [ ] Solo casos citables (Sky/Bresler/Berel/SSilva); ninguna métrica de GEA; cifras coherentes con el doc de autoridad.
- [ ] Assets producidos con el stack IA propio (fal.ai/Higgsfield/Magnific/Adobe), art-dirigidos, color tokenizado; sin logos de operating-entity generados por IA.
- [ ] Motion respeta `prefers-reduced-motion`; contraste de texto AA sobre media; sin scroll horizontal desktop/390.
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
- [ ] Contrato de Motion (`docs/ui/motion/TASK-1350-...-motion.md`) creado y declarado en Status antes de `UI ready: yes`.
- [ ] Triple documentación proporcional (técnica/funcional/manual o delta según aplique) + registro en `docs/public-site/`.

## Follow-ups

- **Motion contract** `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md` (obligatorio antes de `UI ready: yes`; el usuario pidió task+wireframe+flow primero — Motion es el siguiente artefacto).
- Definir slug/URL canónico y registro SEO (posible hub `/servicios/` o `/agencia-creativa/`).
- Posible V2: conectar el bloque diferenciador a métricas reales (con su propio contrato de datos) — hoy fuera de scope.
- Variantes de campaña/pauta (Reach) y medición de Share of Voice IA (AEO) como seguimiento de digital-marketing.

## Open Questions

- Slug/URL canónico de la página (`/agencia-creativa/` vs bajo `/servicios/`) — pendiente de IA/SEO.
- ¿El bloque diferenciador queda con cifras ilustrativas curadas (recomendado v1) o se prioriza conectar data real (V2)?
- Embed vs sección dedicada para HubSpot Meetings `[verificar]` el contrato vigente del sitio.
