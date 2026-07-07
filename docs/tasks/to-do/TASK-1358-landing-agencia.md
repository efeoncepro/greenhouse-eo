# TASK-1358 — Landing "Agencia" (`/agencia`) — pillar de categoría + growth partner

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
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
- Wireframe: `docs/ui/wireframes/TASK-1358-landing-agencia.md`
- Flow: `docs/ui/flows/TASK-1358-landing-agencia-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `task/TASK-1358-landing-agencia`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir `/agencia`, la **landing pillar de categoría** del sitio público: posiciona a Efeonce como **growth partner con software propio y visibilidad total** (NO "agencia digital" commodity) mientras **captura la demanda de búsqueda de la categoría** ("agencia de marketing digital / de marketing", ~2.400/mes CL). Full-service presentado como un solo motor (creatividad+contenido · **performance+medios** · web+CRM+infra · data), con el ecosistema ASaaS + operación medible como la prueba que ninguna agencia commodity puede mostrar. Cierra el gap del pillar de masterbrand: hoy el sitio solo tiene spokes de servicio sueltas + about-us. Posicionamiento en [PDR-008](../../public-site/decisions/PDR-008-landing-agencia-marketing-digital-posicionamiento.md).

## Why This Task Exists

Alguien que busca la **categoría completa** ("agencia de marketing digital") no tiene hoy puerta de entrada comercial en el sitio: cae en spokes sueltas (SEO/AEO/creativa/redes/web) o en el about-us (nodo de confianza, no de conversión de tráfico frío). El about-us ya carga el posicionamiento masterbrand pero su intención es marca/navegacional — un about-us compitiendo por "agencia de marketing digital" pierde ranking por mismatch de intención y convierte mal. Falta el **pillar comercial** que capture la categoría y reparta hacia las spokes. La decisión del operador (2026-07-07) resolvió la falsa dicotomía "growth partner vs agencia digital" con la separación de dos capas de [PDR-002](../../public-site/decisions/PDR-002-arquitectura-informacion-seccion-visibilidad.md): **slug/title = keyword buscada; hero/copy = categoría diferenciada** (dato duro: "partner de crecimiento" = 0 búsquedas; "agencia de marketing digital" = 720).

## Goal

Publicar en WordPress una landing `/agencia/` que:
1. Ranquee por el cluster de categoría ("agencia de marketing digital / de marketing") sin caer en el commodity, vía el reframe *no-es-X-es-Y*.
2. Convierta tráfico frío mid-market/enterprise a **reunión agendada** (lead gobernado con atribución HubSpot).
3. Reparta link equity hacia las spokes de `/servicios/*` y enlace el about-us como respaldo E-E-A-T.
4. Nazca `hreflang`-ready (es-LATAM neutro) y con JSON-LD (`Organization`+`Service`+`BreadcrumbList`+`FAQPage`) para descubrimiento humano y agéntico.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- **Posicionamiento/IA:** [PDR-008](../../public-site/decisions/PDR-008-landing-agencia-marketing-digital-posicionamiento.md) (decisión canónica: dos capas, `/agencia` como pillar, full-service incl. performance, mid-market/enterprise, casos citables). Alinea con [PDR-002](../../public-site/decisions/PDR-002-arquitectura-informacion-seccion-visibilidad.md) (dos capas slug/copy) y [PDR-003](../../public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md) (nodo demand-capture de la capa de adquisición). Patrón de landing de marca de [PDR-004](../../public-site/decisions/PDR-004-landing-agencia-creativa-posicionamiento.md).
- **Context pack (cita, no copia):** `docs/context/09_marca-agencia.md` (masterbrand + categoría growth partner + messaging por BP), `05_voz-tono-estilo.md` (voz + clichés a evitar), `13_icp-buyer-personas-jtbd.md` (ICP mid-market/enterprise + BPs + casos citables), `14_modelo-negocio-asaas.md` (oferta productizada + switching cost), `02_gtm.md`.
- **IA/rutas:** [route-ownership matrix](../../operations/public-site-route-ownership-matrix-20260616.md) — `/agencia` es página nueva (sin 301 entrante); registrar + SEO preflight antes de indexar.
- **Programa:** `EPIC-019` (public website landing control plane) — nodo de contenido/ejecución, no fase del control plane.

## Normative Docs

- Wireframe: [docs/ui/wireframes/TASK-1358-landing-agencia.md](../../ui/wireframes/TASK-1358-landing-agencia.md)
- Flow: [docs/ui/flows/TASK-1358-landing-agencia-flow.md](../../ui/flows/TASK-1358-landing-agencia-flow.md)
- Motion: `docs/ui/motion/TASK-1358-landing-agencia-motion.md` — **a crear como follow-up antes de `UI ready: yes`** (Slice 2).
- Build/operación: skill `efeonce-public-site-wordpress` + `references/landing-workflow.md` + `references/landings/desarrollo-sitios-web.md` (template más completo a replicar) + `references/growth-forms-wordpress.md`.
- Skills de diseño/copy: `commercial-expert`, `growth-marketing-cro`, `copywriting`, `digital-marketing`, `seo-aeo`, `product-design-loop`, `greenhouse-ux-writing`.

## Dependencies & Impact

### Depends on

- Skill `efeonce-public-site-wordpress` (acceso WP/Kinsta, Ohio/Elementor, `Document::save()`).
- Greenhouse Growth Forms: nuevo `form-key`/`surface`/slug para la reunión (`efeonce-agencia-reunion` o similar) `[a crear]`. HubSpot delivery `disabled` hasta cutover del dispatcher (TASK-1264) `[verificar]`.
- Assets: art direction del hero + sección firma (Slice 1); logos de clientes citables ya en `docs/assets/public-site/aeo-brand-logos/`.
- Confirmación del operador sobre el mecanismo del CTA "Agenda una reunión" (ver Open Questions).

### Blocks / Impacts

- No bloquea otras tasks. Impacta la nav global (entrada "Agencia" o cross-link desde `/servicios`) — coordinar con `/servicios` (PDR-002) para el link equity.
- Al publicar, actualizar el landing-registry de la skill + crear `references/landings/agencia.md`.

### Files owned

- `docs/tasks/to-do/TASK-1358-landing-agencia.md` (este archivo)
- `docs/ui/wireframes/TASK-1358-landing-agencia.md`
- `docs/ui/flows/TASK-1358-landing-agencia-flow.md`
- `docs/ui/motion/TASK-1358-landing-agencia-motion.md` `[a crear antes de UI ready: yes]`
- `scripts/frontend/scenarios/agencia.capture.txt` `[a crear si se automatiza la captura Playwright]`
- WordPress page `/agencia/` (nueva; page_id al crear)
- `.claude/skills/efeonce-public-site-wordpress/references/landings/agencia.md` `[a crear al publicar]`

## Current Repo State

### Already exists

- Sitio público WP/Kinsta + Ohio/Elementor; rail HTML gobernado `.gh-*` (patrón TASK-1345/1343).
- `<greenhouse-form>` web component + Growth Forms public API (`GET/POST /api/public/growth/forms/{slug}`), host safety CSS `growth-forms-host.css`, widget Elementor `greenhouse_growth_form`.
- About-us (`/about-us-efeonce/`, page_id 249770) con el claim masterbrand + eyebrow "Agencia de crecimiento integrada" (reusar como respaldo E-E-A-T y fuente del reframe).
- Logos de clientes citables (`docs/assets/public-site/aeo-brand-logos/`).

### Gap

- No existe página `/agencia/`.
- No existe `form-key`/surface para "solicitar reunión de agencia".
- No existe art direction del hero/sección firma ni contrato de Motion.
- No existe entrada de nav ni cross-link `/servicios` ↔ `/agencia`.

<!-- Conditional: UI impact = flow → UI/UX Contract obligatorio -->

## UI/UX Contract

### Experience brief
- UI rigor: `ui-standard`
- Usuario / rol: decisor de marketing mid-market/enterprise (CMO/BP1, Dir. Marketing·Head of Growth/BP2, CEO/BP3), tráfico frío de categoría.
- Momento del flujo: primer contacto comercial desde SERP/IA; solution-aware (conoce "agencias", no la nuestra).
- Resultado perceptible esperado: en <10s entiende que Efeonce no es una agencia digital más → agenda una reunión.
- Friccion que debe reducir: la percepción de commodity ("todas las agencias suenan igual") + el miedo a tercerizar (perder control) → lo resuelve la visibilidad total demostrada.
- No-goals UX: no self-serve, no exponer portal, no about-us, no reemplazar spokes.

### Surface & system decision
- Surface: WordPress `/agencia/` (Ohio/Elementor document + rail HTML gobernado `.gh-agencia-*`).
- Composition Shell: `no aplica` — sitio público WP, no shell del portal.
- Primitive decision: `reuse` — patrones marketing `modern-ui` + rail TASK-1345; NUNCA primitives del portal.
- Adaptive density / The Seam: `no aplica` (público).
- Floating/Sidecar/Dialog decision: sin overlays modales; conversión inline (`#agenda`).
- Copy source: WordPress es-LATAM validado con `greenhouse-ux-writing` — NUNCA `src/lib/copy/*`.
- Access impact: `none` (público, sin auth/entitlements).

### State inventory
- Default: página completa con hero + secciones firma. Loading: chrome del bloque `#agenda` + skeleton del form. Empty: N/A (sin listas). Error: fallo del form → mensaje + fallback `mailto`/`/contacto/`. Degraded / partial: asset (logo/video) falla → colapsa a texto/fondo sólido, sin white-on-white. Permission denied: N/A. Long content: secciones stackeadas, sin overflow horizontal. Mobile / compact: stack + sticky CTA `.mcta` (se oculta en `#agenda`). Keyboard / focus: foco visible en CTAs/form, DOM order. Reduced motion: marquee/reveals detenidos, contenido completo.

### Interaction contract
- Primary interaction: click "Agenda una reunión" → scroll a `#agenda` → montar form. Hover / focus / active: sistema page-scoped `task-1358-cta-hover-system-v1` (anillo `:focus-visible`, no solo color; `.btn-light` en dark sections para no quedar white-on-white). Pending / disabled: botón submit disabled + feedback de latencia. Escape / click-away: N/A (no modal). Focus restore: al `success_card` tras submit. Latency feedback: spinner/estado en el botón. Toast / alert behavior: success/error inline del renderer (no toast global).

### Motion & microinteractions
- Motion primitive: `CSS` + IntersectionObserver — **NUNCA** `@/components/greenhouse/motion/**`, `useGreenhouseGSAP` ni Framer (son del portal, no del sitio público).
- Enter / exit: reveal staggered `is-in-view` por sección. Layout morph: ninguno. Stagger: entradas de la sección firma. Timing / easing token: escala 75/150/200/300/400ms, `cubic-bezier(0.2,0,0,1)`. Reduced-motion fallback: aparecer sin animar; marquee detenido. Non-goal motion: sin parallax pesado ni animaciones que dañen CWV (LCP<2.5s, INP<200ms).
- **El contrato de Motion completo se crea en Slice 2** (`docs/ui/motion/TASK-1358-landing-agencia-motion.md`); hasta entonces `Motion: none` y `UI ready: no`.

### Implementation mapping
- Route / surface: `https://efeoncepro.com/agencia/` (canonical apex).
- Primitive / variant / kind: rail `.gh-agencia-*` + Ohio nativo; N/A design system portal.
- Component candidates: Ohio `ohio_badge`/`ohio_heading`(h1)/`ohio_button`; `<greenhouse-form>`; `<details>` FAQ; `greenhouse_comparison_table` (si tabla).
- Copy source: WordPress es-LATAM (`greenhouse-ux-writing`).
- Data reader / command: none (Growth Forms public API server-side).
- API parity: N/A (superficie de marketing, no capability operable; el único contrato es Growth Forms, ya gobernado).
- Access / capability: público.
- States to implement: ready/loading/error/partial del bloque de conversión + reduced-motion.

### GVC scenario plan
- Scenario file: **N/A** — GVC del portal no aplica a WP público; **Playwright live** sobre preview/publicada.
- Route: `/agencia/` (staging/preview).
- Viewports: `1440`, `1280`, `390`.
- Required steps: cargar → scroll por cada `data-capture` → click "Agenda una reunión" (verificar scroll a `#agenda`) → montar form (sin lead real) → abrir 1 FAQ → probar fallback.
- Required captures: hero fold; sección firma (motor + proof-engine); bloque de conversión con form montado; mobile 390 full-page.
- Required `data-capture` markers: `hero`, `trust`, `problem`, `reframe`, `motor`, `proof-engine`, `method`, `cases`, `ecosystem`, `audience`, `agenda`, `faq`.
- Assertions: un solo `<h1>`; `scrollWidth == clientWidth` (1440/1280/390); CTA hero → `#agenda`; form monta `data-form-ready="true"`; ningún CTA muerto; dark sections AA.
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce`; foco visible en CTAs/form.

### Design decision log
- Decision: pillar `/agencia` con hero que lidera el claim growth-partner y captura la keyword en `<title>`/meta (dos capas).
- Alternatives considered: H1 literal "Agencia de Marketing Digital" (commodity, viola masterbrand); landing "partner de crecimiento" (keyword 0); about-us hace el job (mismatch de intención).
- Why this pattern: PDR-002/008 (slug/title = keyword; hero = categoría diferenciada); reframe *no-es-X-es-Y* = Do canónico de voz.
- Reuse / extend / new primitive: `reuse` (rail Ohio + Growth Forms).
- Open risks: comprador SMB equivocado (mitiga anti-ICP); mecanismo del CTA "Agenda una reunión" sin precedente gobernado.

### Visual verification
- GVC scenario: Playwright live (portal GVC N/A).
- Viewports: 1440, 1280, 390.
- Required captures: hero, sección firma, conversión, mobile full-page.
- Required `data-capture` markers: los 12 de arriba.
- Scroll-width check: `scrollWidth == clientWidth`.
- Accessibility/focus checks: foco visible; success/error anunciados por SR; FAQ por teclado.
- Before/after evidence: N/A (página nueva).
- Known visual debt: contrato de Motion pendiente (Slice 2).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery de sitio + art direction + assets

- Crawl vivo de `efeoncepro.com`: confirmar que `/agencia` no colisiona, estado de la nav, equity del about-us para el cross-link. Registrar en el route-ownership matrix.
- Art direction del hero + sección firma con `product-design-loop` (3 conceptos → el operador elige) y `design-studio`; producir assets con el stack IA propio (evitar "AI slop"); color tokenizado.
- Definir FAQ data (6 objeciones de categoría) + casos citables a usar (Sky/Bresler/Berel/SSilva).

### Slice 2 — Copy final (es-LATAM) + contrato de Motion

- Copy final con `copywriting` + `greenhouse-ux-writing`: hero (reframe *no-es-X-es-Y*), problema (fragmentación), motor full-service (incl. performance), diferenciador medible, método, casos, ecosistema, para-quién, CTA, 6 FAQ. es-LATAM neutro, tuteo, sin voseo. Beneficios antes que siglas.
- Crear `docs/ui/motion/TASK-1358-landing-agencia-motion.md` robusto (reveals + marquee + reduced-motion; CSS/IntersectionObserver, NO wrappers del portal).
- Al cierre de este slice, con mapping + GVC plan + decision log completos y lint limpio → promover `UI ready: no → yes` y `Motion: none → docs/ui/motion/...`.

### Slice 3 — Build WordPress (Ohio/Elementor + rail HTML gobernado)

- Backup pre-mutación (snapshot `_elementor_data`/`_elementor_page_settings`/`_thumbnail_id`/metas Ohio).
- Construir hero nativo Ohio (dark, full-bleed) + rail HTML gobernado full-bleed (`content_width=full`, padding 0) con las 12 secciones `.gh-agencia-*` + `data-capture`; dark sections con `clb__dark_section`; CTA hover system page-scoped; `template default`, **NO** `elementor_canvas`, sin header/wrapper override.
- Embed `<greenhouse-form>` en `#agenda` (nuevo form-key/surface/slug, `diagnostic_premium`, Turnstile, consent; HubSpot destination `disabled` hasta cutover).
- FAQ `<details name="task1358-faq">` + FAQPage JSON-LD (1:1 con las preguntas visibles); JSON-LD `Organization`+`Service`+`BreadcrumbList` (Yoast owns el resto).

### Slice 4 — SEO/entidad + nav + cross-linking

- Yoast: title target "agencia de marketing digital" + meta; canonical apex; index/follow.
- Nav global (entrada "Agencia" o cross-link) + cross-link `/agencia` ↔ `/servicios/*` (reparto de spokes) + link al about-us (E-E-A-T) + al grader (nodo compartido). Preservar UTM.
- SEO preflight checklist del matrix.

### Slice 5 — Verificación (Playwright live) + registro

- Playwright live desktop (1440/1280) + mobile 390: scroll-width, CTAs, form monta sin lead real, reduced-motion, contraste AA.
- Registrar en landing-registry + crear `references/landings/agencia.md`. Purgar Kinsta. Actualizar changelog/Handoff.

## Out of Scope

- Migración a Astro (queda en WP; `hreflang`-ready pero sin fase EEUU/mundo).
- Spokes de servicio nuevas (`/servicios/*`) — esta task reparte hacia las existentes, no las crea.
- Conectar cifras **live** del portal al proof-engine (usa ilustrativas declaradas; live sería task aparte).
- Prender el delivery HubSpot del form (depende del cutover del dispatcher, TASK-1264).
- Rediseñar el about-us o el hub `/servicios`.

## Detailed Spec

Estructura de página (12 regiones, ver [wireframe](../../ui/wireframes/TASK-1358-landing-agencia.md) §Layout Skeleton): Header Ohio → Hero (reframe + 2 CTAs + proof) → Trust bar (logos) → Problema (fragmentación) → Reframe (*no-es-X-es-Y*) → **Motor full-service** (4 capabilities incl. performance, sección firma) → **Diferenciador medible** (ecosistema + ICO ilustrativo, sección firma) → Cómo trabajamos → Casos citables → Ecosistema/foso ASaaS → Para quién (mid-market/enterprise + anti-ICP suave) → CTA `#agenda` (`<greenhouse-form>`) → FAQ (`<details>` + JSON-LD) → Footer Ohio.

Reglas duras de copy (de PDR-008): el H1/section captura la keyword pero **remata con el reframe** que desmarca del commodity; beneficios antes que siglas (ICO/RpA/FTR solo en el bloque de prueba); sin precios commodity; solo casos citables (NUNCA GEA); masterbrand Efeonce lidera (Globe/Reach/Wave nunca solos ni como proveedores separados); es-LATAM neutro; CTA nunca muerto.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Discovery + art direction (S1) → copy + motion (S2) → build (S3) → SEO/nav (S4) → verificación (S5). No construir (S3) sin copy final (S2). No indexar (S4) sin verificación visual (S5). `UI ready: yes` solo al cierre de S2 con lint limpio.

### Risk matrix

| Riesgo | Prob. | Impacto | Mitigación |
| --- | --- | --- | --- |
| Atraer comprador SMB (commodity) | Media | Alto | Anti-ICP en copy, sin precios, señales enterprise |
| H1 suena commodity y diluye marca | Media | Alto | Reframe *no-es-X-es-Y* obligatorio; keyword en title, no en promesa |
| CTA "Agenda una reunión" sin precedente gobernado | Alta | Medio | Resolver mecanismo (Open Q) antes de S3; default = growth-form gobernado |
| Lead capturado no fluye a HubSpot (delivery `disabled`) | Alta | Medio | Documentar; coordinar cutover dispatcher (TASK-1264); no prometer flujo hasta prender |
| Overflow horizontal / dark section white-on-white (Ohio) | Media | Medio | `scrollWidth==clientWidth` + `clb__dark_section` + `.btn-light`; Playwright live |
| Canibalización con `/servicios` o about-us | Baja | Medio | Roles distintos (PDR-008 IA); canonical limpio + cross-link |
| Copy con voz startup-bro ("growth" suelto) | Media | Bajo | `greenhouse-ux-writing`; growth como sistema, no muletilla |

### Feature flags / cutover

- Sin feature flag de código (landing WP). "Cutover" = publicar la página + indexar tras SEO preflight. El delivery HubSpot del form queda `disabled` (gobernanza Growth Forms) hasta el cutover del dispatcher.

### Rollback plan per slice

| Slice | Rollback |
| --- | --- |
| S3 build | Restaurar snapshot `_gh_backup_before_task-1358_*` → purgar Kinsta → re-verificar |
| S4 SEO/nav | Revertir Yoast/nav; quitar de sitemap; `noindex` temporal |
| S5 registro | Doc-only; revert git |

### Production verification sequence

Playwright live sobre preview → SEO preflight (canonical, JSON-LD válido, HubSpot form IDs/UTM, sitemap excluye previews) → publicar → purgar Kinsta → verificar `/agencia/` live desktop+mobile → Search Console inspection de la URL.

### Out-of-band coordination required

- Operador: decisión del mecanismo del CTA "Agenda una reunión" (Open Q) + art direction del hero (S1).
- Confirmar estado del cutover del dispatcher HubSpot (TASK-1264) para el flujo del lead.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/agencia/` publicada en WP, canonical apex, index/follow.
- [ ] Hero captura la categoría en `<title>`/meta y remata con el reframe growth-partner (no queda "somos una agencia digital" como promesa).
- [ ] Full-service presentado como un motor incl. **performance marketing** como capability; cada capability enlaza su spoke cuando existe.
- [ ] Diferenciador medible (ecosistema + ICO ilustrativo declarado) + casos citables (Sky/Bresler/Berel/SSilva), NUNCA GEA.
- [ ] CTA "Agenda una reunión" funcional (mecanismo resuelto) + fallback `mailto`/`/contacto/`; CTA nunca muerto.
- [ ] Copy es-LATAM neutro validado con `greenhouse-ux-writing`; beneficios antes que siglas; sin precios commodity.
- [ ] JSON-LD `Organization`+`Service`+`BreadcrumbList`+`FAQPage` válido; FAQ 1:1 con lo visible.
- [ ] `scrollWidth == clientWidth` en 1440/1280/390; contraste AA en dark sections; reduced-motion respetado.
- [ ] Cross-link `/agencia` ↔ `/servicios/*` + about-us + grader; UTM/atribución preservada.
- [ ] Full API Parity: N/A justificado (superficie de marketing; único contrato = Growth Forms, ya gobernado).
- [ ] Registrada en landing-registry + `references/landings/agencia.md`.

## Verification

- `pnpm task:lint --task TASK-1358` (template=1, errors=0, warnings=0)
- `pnpm ui:wireframe-check --task TASK-1358`
- `pnpm ui:flow-check --task TASK-1358`
- `pnpm ui:motion-check --task TASK-1358` (tras crear el motion en S2)
- `pnpm ui:readiness-check --task TASK-1358` (para promover `UI ready: yes`)
- `pnpm ops:lint --changed`
- Playwright live sobre `/agencia/` (staging/preview) desktop+mobile.

## Closing Protocol

- Mover `to-do/ → complete/`; `Lifecycle: complete`; actualizar `docs/tasks/README.md` + `TASK_ID_REGISTRY.md`.
- Actualizar `changelog.md` + `Handoff.md`.
- Invocar `greenhouse-documentation-governor` + `pnpm docs:closure-check`.
- Invocar `greenhouse-qa-release-auditor` (`pnpm qa:gates --changed`).
- Chequeo de impacto cruzado: actualizar PDR-002/`/servicios` si el cross-link cambia el árbol; actualizar PRODUCT_ROADMAP.

## Follow-ups

- Crear el contrato de Motion (S2) y promover `UI ready: yes`.
- Fase EEUU/mundo: spoke `en-US` con localización real + `hreflang` (PDR-002 §alcance regional).
- Conectar cifras live del portal al proof-engine (task aparte).
- Prender el delivery HubSpot del form al completar el cutover del dispatcher.

## Open Questions

1. **Mecanismo del CTA "Agenda una reunión"** — ninguna landing viva lo tiene: ¿HubSpot Meetings embed (net-new, sin precedente gobernado, mayor riesgo) **o** `<greenhouse-form>` de solicitud de reunión in-page (patrón gobernado ya vivo, atribución+consent+Turnstile+dispatcher, menor riesgo)? Default propuesto = growth-form gobernado salvo decisión del operador. **Bloquea S3.**
2. **Nav global** — ¿"Agencia" entra como ítem top-level de nav, o solo como cross-link desde `/servicios` y hero? Afecta el reparto de link equity.
3. **Slug** — confirmado `/agencia` (operador). ¿Se agrega un alias/redirect desde algún término más literal si el crawl encuentra equity previo?
