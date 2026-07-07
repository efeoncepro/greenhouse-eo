# TASK-1352 — Reposicionar la landing HubSpot (`/servicios-contratar-hubspot/`) al mundo Agentic Customer Platform

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
- UI impact: `motion`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1352-landing-hubspot-agentic-platform.md`
- Flow: `docs/ui/flows/TASK-1352-landing-hubspot-agentic-platform-flow.md`
- Motion: `docs/ui/motion/TASK-1352-landing-hubspot-agentic-platform-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: `none`
- Branch: `task/TASK-1352-landing-hubspot-agentic-platform`

## Summary

Reposiciona la página pública existente `/servicios-contratar-hubspot/` (WordPress id `244079`, `publish`) del relato "compra e implementa un CRM" al de **plataforma agéntica operada con software propio**. Ángulo teach-first (HubSpot dejó de ser un CRM: hay que arquitecturarla, poblarla con datos limpios y gobernar a los agentes); arco de las **4 capas de CRM Solutions** (Licencia → Implementación → Managed Ops → Intelligence); diferenciador = **Kortex** (deployment programático trazable, producto validado y publicado en el HubSpot Marketplace); sección firma "stack agéntico"; oferta de dos escalones (reunión + diagnóstico de portal). **No es spoke SEO** (la demanda de partner HubSpot es mínima en todo el bloque hispano); su embudo es co-sell + Solutions Directory + directo + cross-sell. Reusa `<greenhouse-form>` + HubSpot Meetings; no construye backend nuevo. Deriva de PDR-006 (+ PDR-003).

## Why This Task Exists

Efeonce presta servicios de HubSpot en cuatro capas (`docs/context/02_gtm.md`) y ya tiene una página pública, pero fue escrita para el HubSpot anterior (el CRM que se compra e implementa). Desde el Spring Spotlight 2026 HubSpot se reposiciona como **Agentic Customer Platform** — Smart CRM (datos unificados) + **Breeze** (agentes de IA que ejecutan trabajo dentro del flujo). Encenderla ya no es comprar una licencia: es un cambio de modelo operativo (arquitectura + datos limpios + gobierno de agentes + integraciones), exactamente el trabajo que un partner con software propio hace mejor que uno que solo configura. La página actual no cuenta esa historia ni apalanca el diferenciador documentado (**Kortex**, "capacidad técnica que ningún competidor LATAM replica" — `docs/context/08_estrategia-comercial.md`), que además hoy es **prueba verificable de tercero** (Kortex publicado en el HubSpot Marketplace). PDR-006 fijó el posicionamiento; falta materializar el reposicionamiento en la página.

## Goal

- Reescribir `/servicios-contratar-hubspot/` con el blueprint de PDR-006 (hero teach-first + trust strip con proof de partner/Marketplace, stakes "encenderla no basta", las 4 capas como recorrido, sección firma "stack agéntico", tabla de diferenciación vs partners de la región, prueba con Kortex Marketplace + casos citables, puente/cross-sell, FAQ, CTA final + diagnóstico), **preservando la URL** (reposición en sitio, sin 301) y evolucionando el "Partner Proof Module" existente.
- Ser citable por motores de respuesta (answer capsules answer-first + JSON-LD `Service`/`Organization`/`FAQPage`/`BreadcrumbList`) sin depender de keyword bottom-funnel (que no existe): la captura de categoría se juega en Think.
- Entregar al usuario a la oferta de dos escalones —"Agenda una reunión" (HubSpot Meetings) y "Solicita un diagnóstico de tu portal HubSpot" (`<greenhouse-form>` embebido)— reusando contratos gobernados, con fallback honesto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md`
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md` (Kortex vive en el eje de plataformas, no front-of-house)
- `docs/context/02_gtm.md` (CRM Solutions en 4 capas; Efeonce = Solutions Partner; co-sell con PDM)
- `docs/context/03_ecosistema-producto.md` (Kortex = CRM Intelligence Platform sobre HubSpot)
- `docs/context/09_marca-agencia.md` (masterbrand Efeonce; "tres productos de software, no informes")
- `docs/context/11_hubspot-bowtie.md` (bow-tie dual; portal 48713323; pipeline HubSpot Shared Selling)
- `docs/context/05_voz-tono-estilo.md` (voz es-LATAM neutro, Don'ts)

Reglas obligatorias:

- **Reposicionar en sitio, misma URL** `/servicios-contratar-hubspot/` (id `244079`); **NO** crear spoke nueva ni gastar 301 (PDR-006 §Alternativas descartadas). Evolucionar el "Partner Proof Module" existente, no botarlo a ciegas.
- Full API Parity por reuso: la captura de lead (diagnóstico) YA es contrato gobernado (Growth Forms + pipeline); el agendamiento reusa HubSpot Meetings. La landing es cliente, NO owner — NO reconstruir el form ni el agendador. El form `efeonce-hubspot-portal-audit` es una config de form instance del contrato existente (como `efeonce-seo-diagnostic`/`efeonce-social-audit`), HubSpot delivery `disabled` hasta cutover.
- Lidera la masterbrand **Efeonce**; Kortex/Greenhouse/Verk se nombran como el **software propio que sostiene el servicio**, no como productos que el cliente compra aparte.
- **NUNCA afirmar un tier** de partner (Diamond/Platinum/Gold) — no está documentado. El claim de partner es "HubSpot Solutions Partner"; el claim de producto es "Kortex validado y en el HubSpot Marketplace" (con enlace al listing).
- **NUNCA** presentar la integración interna Greenhouse↔Kortex como productiva (es staging); el claim público es sobre el producto Kortex y su capability de deployment.
- **NO hardcodear** el roster ni el pricing de Breeze (volátiles; cambiaron a pay-per-result en abr-2026): describir categorías de agentes y el trabajo de gobernarlos; reverificar cualquier cifra de HubSpot (WebSearch) el día de publicación.
- Solo casos/resultados citables (Sky, Bresler, SSilva…); **NUNCA GEA**; **Berel NO como prueba de co-selling** (se cerró directo, sin PDM). Si no hay resultado citable con número, cifras ilustrativas del modelo declaradas.
- Build spoke Ohio nativo (`template default`, header claro heredado), CSS page-scoped; **NO** `elementor_canvas`, sin header/wrapper overrides. Mutación Elementor vía `Document::save()` (nunca `_elementor_data` directo), snapshot + Kinsta purge + rollback documentado.
- Ejecutar en el sitio público vía la skill `efeonce-public-site-wordpress`; NO usar AXIS/MUI/`src/lib/copy` (eso es portal).
- Idioma **es-LATAM neutro** (pan-hispano), tuteo, sin voseo ni chilenismos; preparar `hreflang` desde el build (fase `en-US` futura donde sí hay demanda de partner), sin traducción máquina.

## Normative Docs

- `docs/ui/wireframes/TASK-1352-landing-hubspot-agentic-platform.md`
- `docs/ui/flows/TASK-1352-landing-hubspot-agentic-platform-flow.md`
- `docs/ui/motion/TASK-1352-landing-hubspot-agentic-platform-motion.md`
- `.claude/skills/efeonce-public-site-wordpress/references/landings/hubspot-services.md` (identidad + do-not-touch + rollback de la página actual)
- `.claude/skills/efeonce-public-site-wordpress/references/landings/posicionamiento-seo.md` (patrón hermano de spoke)

## Dependencies & Impact

### Depends on

- `<greenhouse-form>` renderer (Growth Forms) — existente (TASK-1320 renderer; TASK-1327 embed pattern).
- HubSpot Meetings link + UTM — existente (patrón CTA de PDR-004/005) `[verificar]` el link canónico.
- **CORS / surface-allowlist del form para el origin `efeoncepro.com/servicios-contratar-hubspot/*`** — `[verificar]` **probable gap**: TASK-1335 cubrió `/servicios/*`, pero esta URL es sibling top-level (`/servicios-contratar-hubspot/`), NO hija de `/servicios/`, así que el origin puede NO estar en la allowlist. Confirmar y, si falta, agregarlo (o usar fallback link como primer release).
- Página existente `/servicios-contratar-hubspot/` (id `244079`) + su landing file `references/landings/hubspot-services.md` (Partner Proof Module, hero asset `EO_Hubspot_Hiro2-2.webp`, logo `243106`).
- Enlace al listing de **Kortex en el HubSpot Marketplace** — `[verificar]` la URL pública del listing (para el proof point).
- Dirección de arte de la sección firma "stack agéntico" (assets con stack IA propio) — **pendiente**; bloquea `UI ready: yes`.

### Blocks / Impacts

- Refuerza el canal partner/co-sell (PDM) con una cara pública moderna; sostiene la jugada B2B2B (Kortex Marketplace).
- Habilita el pillar de categoría "CRM/Agentic CRM" en Think (task aparte) que enlazará a esta página.

### Files owned

- `docs/tasks/to-do/TASK-1352-landing-hubspot-agentic-platform.md`
- `docs/ui/wireframes/TASK-1352-landing-hubspot-agentic-platform.md`
- `docs/ui/flows/TASK-1352-landing-hubspot-agentic-platform-flow.md`
- `docs/ui/motion/TASK-1352-landing-hubspot-agentic-platform-motion.md`
- Contenido de la página existente en el sitio público (WordPress/Ohio, id `244079`) `[verificar]`
- `scripts/frontend/scenarios/public-servicios-contratar-hubspot.capture.txt` `[verificar/crear]`
- Actualización de fila en el landing registry (`references/landing-registry.md`) + landing file `references/landings/hubspot-services.md`

## Current Repo State

### Already exists

- PDR-006 (posicionamiento) + PDR-003 (ecosistema/layering).
- Página `/servicios-contratar-hubspot/` (id `244079`, `publish`) con "Partner Proof Module" (secciones Elementor `83d3781`/`ebe0037`/`5b75db1`, clases `gh-section-hubspot-partner-proof`/`gh-partner-proof-*`) + landing file `references/landings/hubspot-services.md`.
- Growth Forms renderer `<greenhouse-form>` + pipeline + patrón de embed (TASK-1320/1327).
- Landings hermanas `/servicios/posicionamiento-seo` (TASK-1343) y `/desarrollo-sitios-web` (TASK-1345) como referencia de patrón spoke.
- Datos de demanda Semrush (CL + pan-hispano) en PDR-006.
- Investigación HubSpot 2026 (Agentic Customer Platform, Breeze, pay-per-result) en PDR-006 §Contexto.

### Gap

- La página cuenta el relato viejo (CRM que se compra), no el de plataforma agéntica; el "Partner Proof Module" no comunica Kortex-en-Marketplace ni el diferenciador de software propio.
- Copy final (hero teach-first, las 4 capas con answer capsule, tabla de diferenciación, prueba con Kortex Marketplace + casos, FAQ) sin draftear; FAQ pendiente de poblar con objeciones reales (migración, gobierno de agentes, "¿qué tier?", tiempos).
- Sección firma "stack agéntico" sin dirección de arte ni build.
- JSON-LD (Service/Organization/FAQPage/BreadcrumbList) no confirmado para esta ruta.
- Form `efeonce-hubspot-portal-audit` (config de instance) sin crear; entregable operativo del "diagnóstico de portal" sin definir.
- CORS del `<greenhouse-form>` para el origin `/servicios-contratar-hubspot/*` sin confirmar (probable gap).

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: líder comercial / RevOps / marketing de una empresa mid-market o enterprise (LATAM/hispano) evaluando a quién contratar para adoptar u operar HubSpot en serio.
- Momento del flujo: solution/product-aware; llega por co-sell del PDM, Solutions Directory, directo/marca o cross-sell; comparando partners.
- Resultado perceptible esperado: entiende que HubSpot hoy es una plataforma agéntica y que Efeonce la **opera con software propio** (Kortex/Greenhouse), no solo la configura; da un primer paso (reunión o diagnóstico de portal).
- Friccion que debe reducir: el miedo a elegir mal / migración fallida (JOLT) y el "todos los partners suenan igual"; el diagnóstico de portal baja la barrera de contacto.
- No-goals UX: no es pricing; no es self-serve; no reconstruye el form/agendador; no afirma un tier; no expone el portal Greenhouse.

### Surface & system decision

- Surface: `efeoncepro.com/servicios-contratar-hubspot/` (público; WordPress/Ohio, marketing lane `modern-ui`) — **reposición de página existente**, misma URL.
- Composition Shell: `no aplica` — es sitio público, no el portal Greenhouse.
- Primitive decision: `reuse` — patrones marketing `modern-ui` (editorial header, section header, floating feature card, logo wall, comparison band) + `<greenhouse-form>` embebido; la sección firma "stack agéntico" es page-scoped nueva (no primitive del portal).
- Adaptive density / The Seam: `no aplica` — patrón del portal.
- Floating/Sidecar/Dialog decision: no aplica (página; el form de diagnóstico es sección inline no-modal).
- Copy source: contenido de página pública (NO `src/lib/copy`); validado `greenhouse-ux-writing` + context pack 05.
- Access impact: `none` (pública).

### State inventory

- Default: página renderizada, CTAs activos, sección "stack agéntico" animándose.
- Loading: sin loading de página (SSR/estático); el form embebido tiene su propio loading (renderer).
- Empty: N/A (contenido curado).
- Error: error del form → Success/Error Card del renderer (TASK-1320).
- Degraded / partial: embed del form no carga (JS off/CORS) → fallback link a agendamiento/mailto con UTM (el CTA nunca muere).
- Permission denied: N/A (pública).
- Long content: página larga por diseño; scroll natural, sin scroll horizontal.
- Mobile / compact: stack 1-col; grid de "4 capas" y la tabla de diferenciación colapsan (container query / tarjetas apiladas); el "stack agéntico" reduce densidad/peso (o degrada a diagrama estático).
- Keyboard / focus: orden top→bottom; CTAs, `<summary>` de FAQ y campos del form alcanzables; focus ring AA.
- Reduced motion: reveals/entradas off y "stack agéntico" estático bajo `prefers-reduced-motion` (ver Motion contract).

### Interaction contract

- Primary interaction: "Agenda una reunión" (HubSpot Meetings) o "Solicita un diagnóstico de tu portal HubSpot" (scroll ancla `#diagnostico` + form).
- Hover / focus / active: CTAs con color + micro-lift + focus ring (ver Motion).
- Pending / disabled: estados del form owned por su renderer.
- Escape / click-away: N/A (no-modal).
- Focus restore: natural del navegador al volver de HubSpot Meetings (pestaña nueva).
- Latency feedback: del renderer del form.
- Toast / alert behavior: N/A en la página (Success/Error Card del form).

### Motion & microinteractions

- Motion primitive: `CSS` + IntersectionObserver (sitio público) — NO wrappers del portal.
- Enter / exit: hero fade+rise 400ms ease-out; reveals por sección 300ms; sin exit especial.
- Layout morph: ninguno.
- Stagger: corto en hero, las 4 tarjetas de capa y la entrada del "stack agéntico".
- Timing / easing token: escala 75/150/200/300/400ms; ease-out `cubic-bezier(0.2,0,0,1)`.
- Reduced-motion fallback: contenido visible sin animación; "stack agéntico" estático (diagrama).
- Non-goal motion: hero-video autoplay pesado, parallax fuerte, loops que distraen, "AI slop".

### Implementation mapping

- Route / surface: `efeoncepro.com/servicios-contratar-hubspot/` (reposición de la página id `244079`).
- Primitive / variant / kind: patrones marketing `modern-ui` (no Design System del portal) + sección firma page-scoped.
- Component candidates: secciones Ohio/Elementor (evolucionar las existentes, incl. Partner Proof Module) + CSS page-scoped + "stack agéntico" (SVG/CSS motion o island ligera) + `<greenhouse-form>` embebido.
- Copy source: contenido de página pública (validado `greenhouse-ux-writing`); es-LATAM neutro.
- Data reader / command: ninguno nuevo (reuso del submit gobernado de Growth Forms + HubSpot Meetings).
- API parity: satisfecho por reuso; la landing es cliente. `efeonce-hubspot-portal-audit` = config de form instance del contrato existente, HubSpot delivery `disabled` hasta cutover.
- Access / capability: pública, sin capability.
- States to implement: default, degraded (fallback link), mobile, reduced-motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-contratar-hubspot.capture.txt`
- Route: URL pública del preview (WordPress staging).
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; scroll por regiones; disparar el "stack agéntico"; click "Solicita un diagnóstico" → scroll+focus al form; abrir 1 FAQ.
- Required captures: full-page desktop + mobile; frames por región; "stack agéntico" en 2+ frames (movimiento); FAQ abierto; form montado; reduced-motion; **before/after** (la página tiene versión previa).
- Required `data-capture` markers: `hero`, `trust`, `stakes`, `capas`, `stack-agentico`, `diferenciacion`, `prueba`, `puente`, `faq`, `cta-final`, `diagnostico`.
- Assertions: sin scroll horizontal (1440 y 390); un solo `<h1>`; CTAs accionables o fallback visible; "stack agéntico" se mueve en default y estático en reduced-motion.
- Scroll-width checks: `scrollWidth <= clientWidth` ambos viewports.
- Reduced-motion / focus evidence: captura `prefers-reduced-motion: reduce`; focus ring visible en CTAs/`<summary>`/campos.

### Design decision log

- Decision: reposicionar la página existente `/servicios-contratar-hubspot/` (misma URL) al relato Agentic Customer Platform; arco de las 4 capas; diferenciador Kortex (Marketplace); sección firma "stack agéntico"; oferta de dos escalones. Ver PDR-006.
- Alternatives considered: spoke nueva `/servicios/hubspot` + 301; ángulo SEO keyword-led; liderar con "Somos Solutions Partner"; catálogo de agentes Breeze; consultora RevOps pura; build code-custom completo; lead magnet self-serve nuevo — todos descartados en PDR-006.
- Why this pattern: `modern-ui` marketing lane + Challenger (teach-first) + Command of the Message + JOLT (reducir el miedo a elegir mal); el "stack agéntico" hace show-don't-tell del deployment programático.
- Reuse / extend / new primitive: reuse (marketing + Growth Forms + HubSpot Meetings); el "stack agéntico" es page-scoped nuevo.
- Open risks: art direction del "stack agéntico" pendiente (bloquea `UI ready: yes`); casos HubSpot/CRM citables por confirmar; CORS del form para `/servicios-contratar-hubspot/*` (probable gap); volatilidad de datos Breeze; URL del listing de Kortex Marketplace; entregable operativo del "diagnóstico de portal" por definir.

### Visual verification

- GVC scenario: `public-servicios-contratar-hubspot`.
- Viewports: 1440 + 390.
- Required captures: full-page + por sección + "stack agéntico" en movimiento + FAQ abierto + reduced-motion + before/after.
- Required `data-capture` markers: `hero`, `trust`, `stakes`, `capas`, `stack-agentico`, `diferenciacion`, `prueba`, `puente`, `faq`, `cta-final`, `diagnostico`.
- Scroll-width check: sí, ambos viewports.
- Accessibility/focus checks: focus ring, contraste AA en hero, bandas oscuras y microtextos.
- Before/after evidence: sí — la página tiene versión previa; capturar antes de mutar.
- Known visual debt: ninguna al crear; el diseño final se valida en loop GVC.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery + art direction + FAQ data + snapshot

- Snapshot de la página actual `244079` (`_elementor_data`, settings, metas Ohio, `_thumbnail_id`, hashes) + before-capture; documentar rollback (contrato `hubspot-services.md`).
- Confirmar el link canónico de HubSpot Meetings + UTM; confirmar la URL pública del listing de **Kortex en el HubSpot Marketplace**.
- Verificar que el CORS/surface-allowlist del `<greenhouse-form>` cubra el origin `efeoncepro.com/servicios-contratar-hubspot/*` (probable gap vs TASK-1335 que cubrió `/servicios/*`); si no, declarar dependencia y usar fallback link como primer release.
- Reverificar (WebSearch) el estado de Breeze (roster/pricing) para no publicar cifras stale; decidir qué categorías de agentes se nombran.
- Dirección de arte de la sección firma "stack agéntico" (stack IA propio; art direction primero para evitar "AI slop"); decidir SVG/CSS animado vs island ligera por peso/CWV.
- Poblar el FAQ con objeciones reales (migración, gobierno de agentes, "¿qué tier son?", tiempos/costo de implementación, integraciones) — seed `phrase_questions` Semrush + objeciones de venta reales.

### Slice 2 — Copy final (greenhouse-ux-writing)

- Draftear el copy del copy ledger (hero teach-first, las 4 capas con answer capsule, tabla de diferenciación, prueba con Kortex Marketplace + casos, "cómo trabajamos", FAQ) validado con `greenhouse-ux-writing` + context pack 05.
- Reglas duras: NUNCA tier de partner; NUNCA GEA; Berel no como co-sell; no hardcodear pricing/roster Breeze; solo casos reales publicables; cifras del modelo declaradas como ilustrativas.

### Slice 3 — Build / reposición de la página

- Reescribir las regiones del wireframe en Ohio nativo (`template default`, sin `elementor_canvas`) vía `Document::save()`, evolucionando el Partner Proof Module existente; patrones marketing `modern-ui`; sección firma "stack agéntico"; embed del `<greenhouse-form>` de diagnóstico + link a HubSpot Meetings + fallback.
- On-page SEO/AEO: H1/title del servicio, answer capsules bajo cada H2, internal links (→ AEO, SEO, Agencia Creativa, desarrollo, pillar CRM en Think), markers `data-capture`; preservar canonical de la URL existente.

### Slice 4 — Form de diagnóstico + structured data

- Crear el form instance `efeonce-hubspot-portal-audit` (config del contrato Growth Forms existente) + surface WordPress dedicada; Turnstile obligatorio; HubSpot destination shape con delivery `disabled` hasta cutover.
- JSON-LD `Service` + `Organization` (entidad Efeonce) + `FAQPage` + `BreadcrumbList`; entity clarity (Efeonce + servicio HubSpot explícitos).

### Slice 5 — Verificación visual + registro

- Crear scenario GVC y capturar desktop+mobile+reduced-motion + "stack agéntico" en movimiento + before/after; iterar hasta acabado enterprise.
- Actualizar la fila del landing registry + el landing file `references/landings/hubspot-services.md` (nuevo section map/hashes) + route-ownership matrix; confirmar CWV (LCP<2.5s, INP<200ms), sin scroll horizontal; purge Kinsta.

## Out of Scope

- Pillar de categoría "CRM/Agentic CRM" en Think (task de contenido aparte, eje EPIC-020) que enlazará a esta página.
- Cutover de HubSpot delivery del form `efeonce-hubspot-portal-audit` (queda `disabled`; coordinar aparte).
- Definición del entregable operativo del "diagnóstico de portal HubSpot" (coordinación con el equipo / relación con Kortex Portal Audit; no es build de landing).
- Cualquier cambio al pipeline de Growth Forms, al `<greenhouse-form>` renderer o al agendador HubSpot (owned por sus tasks).
- Cambios al runtime de Kortex, a la integración Greenhouse↔Kortex o al listing del Marketplace.
- Variante `en-US` (fase internacional futura donde sí hay demanda de partner) — solo dejar `hreflang`-ready.

## Detailed Spec

Ver el blueprint completo en el wireframe (11 regiones, copy ledger, estados, a11y, implementation mapping) + el flow (oferta de dos escalones: reunión + diagnóstico) + el motion (sección firma "stack agéntico" tier acento). Sustrato estratégico (posicionamiento, diferenciación competitiva, demanda pan-hispana, guardrails de Kortex/tier/Breeze) en PDR-006. La página es marketing-lane `modern-ui`: whitespace editorial, un acento de marca Efeonce, body 18–21px, restraint; la única inversión de motion pesado es el "stack agéntico". La captura de lead reusa el contrato gobernado (Full API Parity por reuso).

## Rollout Plan & Risk Matrix

Reposición aditiva de contenido de una página pública existente (misma URL), sin runtime de datos nuevo en greenhouse-eo. Riesgo bajo-medio: se muta una página `publish` (no una nueva), con cuidado de preservar canonical/equity, el embed del form (CORS probable gap), peso/CWV del "stack agéntico", y marca (solo casos citables, sin tier, sin sobre-claim de Kortex).

### Slice ordering hard rule

- Slice 1 (discovery + snapshot + art direction + FAQ + reverificar Breeze) → Slice 2 (copy) → Slice 3 (build/reposición) → Slice 4 (form + structured data) → Slice 5 (GVC + registro).
- **NO mutar la página `244079` (Slice 3) sin snapshot + before-capture** en Slice 1 (es una página `publish`, no nueva).
- NO publicar sin confirmar en Slice 1 el CORS del form para el origin (si no, el embed falla → usar fallback link como primer release).
- NO publicar el "stack agéntico" sin validar CWV en Slice 5 (si degrada LCP, degradar a diagrama estático antes de productivo).
- NO publicar cifras de Breeze sin reverificarlas el día de publicación (Slice 1 + re-check en Slice 5).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Embed del `<greenhouse-form>` bloqueado por CORS en `/servicios-contratar-hubspot/*` | Growth Forms / público | medium | Verificar allowlist en Slice 1 (probable gap vs `/servicios/*`); agregar origin o fallback link | Form no renderiza / consola CORS |
| Mutar una página `publish` rompe layout/canonical/equity | público / SEO | medium | Snapshot + before/after; preservar URL/canonical; reposición in-place, no borrar bloques a ciegas; rollback WP revision | Caída de impresiones GSC / layout roto en GVC |
| Sobre-claim de partnership (tier) o de Kortex (integración interna como productiva) | Marca / compliance | medium | Regla dura: solo "Solutions Partner" + "Kortex validado y en Marketplace"; nunca tier; nunca integración interna | Revisión humana / feedback PDM |
| Cifras de Breeze stale (roster/pricing cambia por trimestre) | Contenido / público | medium | No hardcodear pricing/roster; reverificar (WebSearch) en Slice 1 y Slice 5; describir categorías | Dato contradice HubSpot al publicar |
| "AI slop" en los assets del "stack agéntico" (craft sin sustancia) | Marca / público | medium | Art direction primero; validar en loop GVC; degradar a diagrama vectorial limpio si hace falta | Revisión humana rechaza |
| "stack agéntico" degrada CWV (LCP/INP) en mobile | público / performance | medium | SVG/CSS compositor-only o diagrama estático; validar CWV en Slice 5 | LCP>2.5s / INP>200ms en captura |

### Feature flags / cutover

- Sin flag — reposición de contenido público. Cutover = publish de la versión reposicionada (WordPress revision). Revert = restaurar la revisión previa de WP + purge Kinsta. Tiempo de revert: minutos. HubSpot delivery del form queda `disabled` (no promete entrega CRM hasta cutover aparte).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A (discovery/snapshot/art direction, sin cambios productivos) | — | sí |
| Slice 2 | N/A (copy en doc/borrador) | — | sí |
| Slice 3 | Restaurar la WP revision previa de `244079` + purge Kinsta | <10 min | sí |
| Slice 4 | Despublicar form surface + quitar bloque JSON-LD | <10 min | sí |
| Slice 5 | Revertir fila del registry/landing file/matrix; captura no productiva | <5 min | sí |

### Production verification sequence

1. Slice 1: snapshot + before-capture + confirmar CORS/Meetings/Marketplace URL + reverificar Breeze antes de escribir markup.
2. Reposicionar en preview (WP staging / draft revision), `noindex` mientras se valida.
3. GVC desktop+mobile+reduced-motion + "stack agéntico" en movimiento + before/after; iterar a enterprise; verificar CWV + sin scroll horizontal.
4. Validar el embed del form en preview (submit real de prueba → llega al pipeline) o el fallback link; validar el CTA de reunión (HubSpot Meetings + UTM).
5. Publicar productivo (misma URL); verificar canonical intacto, JSON-LD (Rich Results Test), re-solicitar indexación en GSC si cambió el contenido sustancialmente.
6. Monitorear GSC (que la página no pierda impresiones tras la reposición) + tráfico por canal (UTM co-sell/directorio/directo).

### Out-of-band coordination required

- Publish/mutación en el sitio público (Kinsta/WordPress) — coordinar por la skill `efeonce-public-site-wordpress`.
- Search Console: confirmar que la reposición no degrada la URL existente.
- HubSpot Meetings: confirmar el link/UTM canónico del agendamiento.
- Marketing/PDM: confirmar el claim de partnership (sin tier) + URL del listing de Kortex en el Marketplace.
- Equipo de delivery: definir el entregable operativo del "diagnóstico de portal HubSpot" antes de prometerlo en producción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La página `/servicios-contratar-hubspot/` (misma URL, id `244079`) queda reposicionada al relato Agentic Customer Platform y accesible en el sitio público.
- [ ] El `<h1>` y el arco cuentan la historia teach-first (HubSpot dejó de ser un CRM) y las 4 capas de CRM Solutions como recorrido, no como menú.
- [ ] Cada H2 principal tiene una answer capsule (answer-first, 40–60 palabras) citable.
- [ ] La sección firma "stack agéntico" se anima en default y queda estática (diagrama) bajo `prefers-reduced-motion`, sin degradar CWV (LCP<2.5s / INP<200ms).
- [ ] La tabla de diferenciación **RevOps consultivo vs RevOps programático** está presente y comunica el mecanismo (definido como configuración versionada, desplegado con trazabilidad, operado por Kortex/Greenhouse), sin superlativos ni denigrar competidores nombrados.
- [ ] Prueba: **Kortex validado y en el HubSpot Marketplace** (con enlace al listing) + "HubSpot Solutions Partner" (**sin tier**) + casos citables; **NUNCA GEA**; Berel no como co-sell.
- [ ] No se afirma un tier de partner; no se presenta la integración interna Greenhouse↔Kortex como productiva; no se hardcodea pricing/roster de Breeze (reverificado el día de publicación).
- [ ] JSON-LD válido `Service` + `Organization` + `FAQPage` + `BreadcrumbList` (pasa Rich Results Test).
- [ ] CTA dual funciona: "Agenda una reunión" → HubSpot Meetings + UTM; "Solicita un diagnóstico de tu portal HubSpot" → `<greenhouse-form>` embebido con fallback honesto si no carga.
- [ ] NO se reconstruyó el form ni el agendador; la captura reusa el contrato gobernado (Full API Parity por reuso); HubSpot delivery del form `disabled` hasta cutover.
- [ ] Lidera la marca Efeonce (Kortex/Greenhouse/Verk como software que sostiene el servicio); copy es-LATAM neutro sin voseo ni chilenismos; sin clichés de voz (context pack 05); validado `greenhouse-ux-writing`.
- [ ] FAQ poblado con objeciones reales; internal links a AEO/SEO/Agencia Creativa/desarrollo y pillar CRM en Think presentes.
- [ ] Se preservó la URL/canonical (reposición in-place, sin 301); snapshot + before/after capturados antes de mutar.
- [ ] GVC desktop + mobile capturado y mirado; sin scroll horizontal (1440 y 390px); reduced-motion respeta el contenido; "stack agéntico" en movimiento evidenciado en 2+ frames; before/after evidenciado.
- [ ] `UI ready` sigue `no` hasta que wireframe + `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log **y** exista la dirección de arte del "stack agéntico"; si pasa a `yes`, `pnpm task:lint --task TASK-1352` queda sin findings.
- [ ] `Wireframe`, `Flow` y `Motion` declarados y los archivos existen.
- [ ] Fila del landing registry actualizada + landing file `references/landings/hubspot-services.md` actualizado + ruta en el route-ownership matrix.

## Verification

- `pnpm task:lint --task TASK-1352`
- `pnpm ops:lint --changed`
- `pnpm ui:wireframe-check --task TASK-1352` · `pnpm ui:flow-check --task TASK-1352` · `pnpm ui:motion-check --task TASK-1352`
- Playwright/GVC live: desktop 1440 + mobile 390 (scroll-width, "stack agéntico" en movimiento, form montado, reduced-motion, focus, before/after).
- Growth Form API smoke (GET render contract con `Origin: https://efeoncepro.com`; POST sin Turnstile → rechazo esperado).
- HTTP: `/servicios-contratar-hubspot/` responde `200` y preserva canonical.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (pillar CRM en Think, landings hermanas)
- [ ] La página quedó registrada/actualizada en el route-ownership matrix, el landing registry y el landing file `references/landings/hubspot-services.md`.

## Follow-ups

- Pillar de categoría "CRM / Agentic CRM" en Think (task de contenido aparte, eje EPIC-020) que enlaza a esta página y captura el volumen real (`crm`/`hubspot`).
- Cutover de HubSpot delivery para `efeonce-hubspot-portal-audit`.
- El "diagnóstico de portal HubSpot" ahora es un **producto propio: EPIC-024 (HubSpot Portal Grader)** — PDR-007 + ADR `GREENHOUSE_HUBSPOT_PORTAL_GRADER_DECISION_V1.md`. El CTA secundario **apuntará a la superficie de Think** cuando la Fase 1 (puerta pública / self-assessment) esté live; el `<greenhouse-form>`/fallback de esta task es el interino.
- **Fase 2 internacional**: variante `en-US` ("hubspot partner"/"hubspot implementation", donde sí hay demanda real: EEUU 1.600/mes) con `hreflang` + localización real.

## Open Questions

- ¿Cuál es el link canónico de HubSpot Meetings + UTM para el CTA de reunión? (mismo que Agencia Creativa/Redes Sociales `[verificar]`).
- ¿Cuál es la URL pública del listing de **Kortex en el HubSpot Marketplace** (para el proof point)?
- ¿El CORS/surface-allowlist del `<greenhouse-form>` cubre `efeoncepro.com/servicios-contratar-hubspot/*` o hay que agregar el origin (probable gap vs `/servicios/*`)?
- ¿Qué resultados HubSpot/CRM citables reales tenemos (Sky/Bresler/SSilva u otros)? Si no hay, ¿se aprueban cifras ilustrativas del modelo declaradas?
- ¿El "diagnóstico de portal HubSpot" existe operativamente? → **RESUELTO (2026-07-07): se construye como EPIC-024 (HubSpot Portal Grader). Fase 1 = self-assessment público sin OAuth — no bloquea esta landing; el CTA interino usa el `<greenhouse-form>`/fallback hasta que la superficie de Think esté live.**
