# TASK-1351 — Landing pública de servicio Redes Sociales (`/servicios/redes-sociales`)

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
- Wireframe: `docs/ui/wireframes/TASK-1351-landing-redes-sociales.md`
- Flow: `docs/ui/flows/TASK-1351-landing-redes-sociales-flow.md`
- Motion: `docs/ui/motion/TASK-1351-landing-redes-sociales-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: `none`
- Branch: `task/TASK-1351-landing-redes-sociales`

## Summary

Construye la landing pública de servicio de gestión de redes sociales `/servicios/redes-sociales` en el sitio de Efeonce: una spoke de conversión (mid/bottom-funnel) que captura la búsqueda comercial ("agencia de redes sociales"/"gestión de redes sociales"), posiciona el servicio con ángulo **outcome + craft moderno + prueba** (no commodity), demuestra craft con una sección firma "muro social vivo", y entrega al usuario a una oferta de dos escalones (reunión + auditoría de redes). Reusa `<greenhouse-form>` + HubSpot Meetings; no construye backend nuevo. Deriva de PDR-005 (+ PDR-003/PDR-004).

## Why This Task Exists

Efeonce presta gestión de redes (Community Management, Creators/Influencers, Trendjacking, Reels/contenido moderno, social listening) como parte de su capability creativa (Globe + pie en Reach), pero no tiene una superficie pública que la posicione ni capture su demanda comercial (Semrush CL: "community manager" 4.400 —intención job/how-to—, "agencia de marketing digital" 720, "agencia de redes sociales" 170 —comercial limpio—, "gestión/manejo de redes sociales" 140 c/u, "agencia de influencers" 140). Sin esta spoke, Efeonce cede tráfico de intención comercial y deja el servicio social sin una cara pública coherente con su sello (outcome medible + transparencia). PDR-005 fijó el posicionamiento (ángulo, build, oferta, IA/slug); falta materializar la página.

## Goal

- Publicar `/servicios/redes-sociales` con el blueprint aprobado (hero outcome+craft, trust strip, stakes, "qué incluye" con los 5 bloques, muro social vivo, prueba, cómo medimos, puente/cross-sell, FAQ, CTA final + auditoría).
- Capturar la keyword comercial (H1/title "redes sociales"/"gestión de redes sociales"; copy trabaja "agencia de redes sociales") y ser citable por motores de respuesta (answer capsules + JSON-LD Service/Organization/FAQPage/BreadcrumbList).
- Entregar al usuario a la oferta de dos escalones —"Agenda una reunión" (HubSpot Meetings) y "Pide una auditoría de tus redes" (`<greenhouse-form>` embebido)— reusando contratos gobernados, con fallback honesto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-005-landing-redes-sociales-posicionamiento.md`
- `docs/public-site/decisions/PDR-004-landing-agencia-creativa-posicionamiento.md` (paraguas creativo + doctrina marca/CTA/prueba)
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
- `docs/context/09_marca-agencia.md` (masterbrand Efeonce; Globe/Reach nunca solos)
- `docs/context/05_voz-tono-estilo.md` (voz es-LATAM neutro, Don'ts)

Reglas obligatorias:

- Hub `/servicios` + slug `redes-sociales` (data-backed PDR-005, head term comercial "agencia de redes sociales").
- Full API Parity: la captura de lead (auditoría) YA es contrato gobernado (Growth Forms + pipeline); el agendamiento reusa HubSpot Meetings. La landing es cliente, NO owner — NO reconstruir el form ni el agendador. El form `efeonce-social-audit` es una config de form instance del contrato existente (como `efeonce-seo-diagnostic`).
- Lidera la masterbrand **Efeonce**; capabilities descriptivas ("nuestro equipo de creatividad y contenido"); Globe/Reach nunca solos.
- Ángulo outcome+craft+prueba; NUNCA liderar con volumen de posts/seguidores ni "somos ágiles" sin prueba.
- Solo casos/resultados citables (Sky, Bresler, Berel, SSilva…); **NUNCA GEA** ni cifras infladas; si no hay resultado social citable, cifras ilustrativas del modelo declaradas.
- Doctrina social 2026 (autenticidad > pulido, social search, community como alcance, micro/nano creadores, watch-time/saves sobre likes) reverificando cifras volátiles antes de citarlas (`social-media-studio/SOURCES.md`).
- Build spoke Ohio nativo (`template default`, header `header-3` claro heredado), CSS page-scoped; **NO** `elementor_canvas`, sin header/wrapper overrides, sin hero oscuro forzado.
- Ejecutar en el sitio público vía la skill `efeonce-public-site-wordpress`; NO usar AXIS/MUI/`src/lib/copy` (eso es portal).
- Idioma es-LATAM neutro, tuteo, sin voseo; preparar `hreflang` desde el build (fase internacional futura), sin traducción máquina.

## Normative Docs

- `docs/ui/wireframes/TASK-1351-landing-redes-sociales.md`
- `docs/ui/flows/TASK-1351-landing-redes-sociales-flow.md`
- `docs/ui/motion/TASK-1351-landing-redes-sociales-motion.md`
- `.claude/skills/efeonce-public-site-wordpress/references/landings/posicionamiento-seo.md` (patrón hermano de spoke)

## Dependencies & Impact

### Depends on

- `<greenhouse-form>` renderer (Growth Forms) — existente (TASK-1320 renderer; TASK-1327 embed pattern).
- HubSpot Meetings link + UTM — existente (patrón CTA de PDR-004/Agencia Creativa) `[verificar]` el link canónico.
- CORS / surface-allowlist del form para el origin `efeoncepro.com/servicios/*` — `[verificar]` cubierto (TASK-1335 lo cubrió para la spoke SEO; el origin `/servicios/*` debería estar cubierto).
- Hub `/servicios` — existente como página mínima (creado en TASK-1343, ID `251077`); esta task cuelga la spoke bajo él.
- Assets del muro social vivo (art direction) — **pendiente**; bloquea `UI ready: yes`.

### Blocks / Impacts

- Refuerza el paraguas creativo (PDR-004/Agencia Creativa) con una capability social concreta.
- Habilita la guía pillar "community manager" en Think (task aparte) que enlazará a esta spoke.

### Files owned

- `docs/tasks/to-do/TASK-1351-landing-redes-sociales.md`
- `docs/ui/wireframes/TASK-1351-landing-redes-sociales.md`
- `docs/ui/flows/TASK-1351-landing-redes-sociales-flow.md`
- `docs/ui/motion/TASK-1351-landing-redes-sociales-motion.md`
- Contenido de la página en el sitio público (WordPress/Ohio) `[verificar]`
- `scripts/frontend/scenarios/public-servicios-redes-sociales.capture.txt` `[verificar/crear]`
- Fila en el landing registry de la skill (`references/landing-registry.md`) + landing file `references/landings/redes-sociales.md` `[crear]`

## Current Repo State

### Already exists

- PDR-005 (posicionamiento) + PDR-003/PDR-004 (ecosistema + paraguas creativo).
- Growth Forms renderer `<greenhouse-form>` + pipeline + patrón de embed (TASK-1320/1327).
- Landings hermanas `/servicios/posicionamiento-seo` (TASK-1343) y `/desarrollo-sitios-web` (TASK-1345) como referencia de patrón spoke.
- Hub `/servicios` como página mínima (ID `251077`).
- Datos de keyword Semrush CL (en PDR-005).

### Gap

- No existe la página `/servicios/redes-sociales`.
- Copy final (los 5 bloques con su answer capsule, prueba/casos con números reales, FAQ) sin draftear; FAQ pendiente de poblar con `phrase_questions` Semrush CL (seed "gestión de redes sociales"/"community manager").
- Dirección de arte del muro social vivo sin producir (assets con stack IA propio).
- JSON-LD (Service/Organization/FAQPage/BreadcrumbList) no implementado para esta ruta.
- Form `efeonce-social-audit` (config de instance) sin crear; entregable operativo de la auditoría sin definir.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: decisor de marketing / líder creativo in-house (ICP Globe) buscando proveedor de gestión de redes.
- Momento del flujo: solution/product-aware, evaluando a quién contratar.
- Resultado perceptible esperado: entiende que Efeonce hace social del estado del arte con outcome medible, y da un primer paso (reunión o auditoría).
- Friccion que debe reducir: la desconfianza al "otra agencia de redes"; la auditoría de bajo compromiso baja la barrera de contacto.
- No-goals UX: no es pricing; no es self-serve; no reconstruye el form/agendador; no lidera con volumen de posts.

### Surface & system decision

- Surface: `efeoncepro.com/servicios/redes-sociales` (público; WordPress/Ohio, marketing lane `modern-ui`).
- Composition Shell: `no aplica` — es sitio público, no el portal Greenhouse.
- Primitive decision: `reuse` — patrones marketing `modern-ui` (editorial header, section header, floating feature card, logo wall) + `<greenhouse-form>` embebido; la sección firma "muro social vivo" es page-scoped nueva (no primitive del portal).
- Adaptive density / The Seam: `no aplica` — patrón del portal.
- Floating/Sidecar/Dialog decision: no aplica (página; el form de auditoría es sección inline no-modal).
- Copy source: contenido de página pública (NO `src/lib/copy`); validado `greenhouse-ux-writing` + context pack 05.
- Access impact: `none` (pública).

### State inventory

- Default: página renderizada, CTAs activos, muro social animándose.
- Loading: sin loading de página (SSR/estático); el form embebido tiene su propio loading (renderer).
- Empty: N/A (contenido curado).
- Error: error del form → Success/Error Card del renderer (TASK-1320).
- Degraded / partial: embed del form no carga (JS off/CORS) → fallback link a agendamiento/mailto con UTM (el CTA nunca muere).
- Permission denied: N/A (pública).
- Long content: página larga por diseño; scroll natural, sin scroll horizontal.
- Mobile / compact: stack 1-col; grid de "qué incluye" colapsa vía container query; el muro social reduce densidad/peso (o degrada a mosaico estático).
- Keyboard / focus: orden top→bottom; CTAs, `<summary>` de FAQ y campos del form alcanzables; focus ring AA.
- Reduced motion: reveals/entradas off y muro social estático bajo `prefers-reduced-motion` (ver Motion contract).

### Interaction contract

- Primary interaction: "Agenda una reunión" (HubSpot Meetings) o "Pide una auditoría de tus redes" (scroll ancla `#auditoria` + form).
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
- Stagger: corto en hero, cards de "qué incluye" y entrada del muro social.
- Timing / easing token: escala 75/150/200/300/400ms; ease-out `cubic-bezier(0.2,0,0,1)`.
- Reduced-motion fallback: contenido visible sin animación; muro social estático (frames).
- Non-goal motion: hero-video autoplay pesado, parallax fuerte, loops que distraen, mascota animada, "AI slop".

### Implementation mapping

- Route / surface: `efeoncepro.com/servicios/redes-sociales`.
- Primitive / variant / kind: patrones marketing `modern-ui` (no Design System del portal) + sección firma page-scoped.
- Component candidates: secciones Ohio/Elementor + CSS page-scoped + muro social vivo (islands ligeras o CSS/`<video muted loop>`) + `<greenhouse-form>` embebido.
- Copy source: contenido de página pública (validado `greenhouse-ux-writing`); es-LATAM neutro.
- Data reader / command: ninguno nuevo (reuso del submit gobernado de Growth Forms + HubSpot Meetings).
- API parity: satisfecho por reuso; la landing es cliente. `efeonce-social-audit` = config de form instance del contrato existente, HubSpot delivery `disabled` hasta cutover.
- Access / capability: pública, sin capability.
- States to implement: default, degraded (fallback link), mobile, reduced-motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-redes-sociales.capture.txt`
- Route: URL pública del preview (WordPress staging).
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; scroll por regiones; disparar el muro social; click "Pide una auditoría" → scroll+focus al form; abrir 1 FAQ.
- Required captures: full-page desktop + mobile; frames por región; muro social en 2+ frames (movimiento); FAQ abierto; form montado; reduced-motion.
- Required `data-capture` markers: `hero`, `trust`, `stakes`, `incluye`, `muro-social`, `prueba`, `medimos`, `puente`, `faq`, `cta-final`, `auditoria`.
- Assertions: sin scroll horizontal (1440 y 390); un solo `<h1>`; CTAs accionables o fallback visible; muro se mueve en default y estático en reduced-motion.
- Scroll-width checks: `scrollWidth <= clientWidth` ambos viewports.
- Reduced-motion / focus evidence: captura `prefers-reduced-motion: reduce`; focus ring visible en CTAs/`<summary>`/campos.

### Design decision log

- Decision: spoke de conversión `/servicios/redes-sociales`, slug data-backed; ángulo outcome+craft+prueba; build spoke Ohio + sección firma "muro social vivo"; oferta de dos escalones. Ver PDR-005.
- Alternatives considered: code-custom completo; Elementor estándar sin firma; slug en inglés; ancla dentro de `/agencia-creativa`; lead magnet self-serve nuevo — todos descartados en PDR-005.
- Why this pattern: `modern-ui` marketing lane + doctrina social 2026 + Command of the Message + copywriting solution-aware; el muro social hace show-don't-tell.
- Reuse / extend / new primitive: reuse (marketing + Growth Forms + HubSpot Meetings); el muro es page-scoped nuevo.
- Open risks: art direction del muro pendiente (bloquea `UI ready: yes`); casos sociales citables por confirmar; CORS del form para `/servicios/*`; riesgo "AI slop"; entregable operativo de la auditoría por definir.

### Visual verification

- GVC scenario: `public-servicios-redes-sociales`.
- Viewports: 1440 + 390.
- Required captures: full-page + por sección + muro en movimiento + FAQ abierto + reduced-motion.
- Required `data-capture` markers: `hero`, `trust`, `stakes`, `incluye`, `muro-social`, `prueba`, `medimos`, `puente`, `faq`, `cta-final`, `auditoria`.
- Scroll-width check: sí, ambos viewports.
- Accessibility/focus checks: focus ring, contraste AA en hero, bandas oscuras y microtextos.
- Before/after evidence: N/A (página nueva).
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

### Slice 1 — Discovery + art direction + FAQ data

- Confirmar el runtime del hub `/servicios` (ID `251077`) y que la spoke cuelga limpia bajo él; confirmar el link canónico de HubSpot Meetings y su UTM.
- Verificar que el CORS/surface-allowlist del `<greenhouse-form>` cubra el origin `efeoncepro.com/servicios/*` (TASK-1335); si no, declarar dependencia y usar fallback link como primer release.
- Dirección de arte del muro social vivo: producir/curar los assets (stack IA propio, art direction primero para evitar "AI slop"); decidir `<video muted loop>` vs mosaico CSS por peso/CWV.
- Poblar el FAQ con queries reales (`phrase_questions` Semrush CL, seed "gestión de redes sociales"/"community manager"/"agencia de redes sociales").

### Slice 2 — Copy final (greenhouse-ux-writing)

- Draftear el copy pendiente del copy ledger (hero, los 5 bloques con answer capsule, prueba/casos con números reales, "cómo medimos", FAQ) validado con `greenhouse-ux-writing` + context pack 05.
- Regla dura: no inventar cifras de resultados; solo casos reales publicables; NUNCA GEA. Cifras de "cómo medimos" declaradas como ilustrativas del modelo.

### Slice 3 — Build de la página

- Implementar las 11 regiones del wireframe en Ohio nativo (`template default`, sin `elementor_canvas`), con los patrones marketing `modern-ui`, la sección firma "muro social vivo", embed del `<greenhouse-form>` de auditoría + link a HubSpot Meetings + fallback.
- On-page SEO/AEO: H1/title keyword, answer capsules bajo cada H2, internal links (→ `/agencia-creativa`, servicios hermanos, guía Think), markers `data-capture`.

### Slice 4 — Form de auditoría + structured data

- Crear el form instance `efeonce-social-audit` (config del contrato Growth Forms existente) + surface WordPress dedicada; Turnstile obligatorio; HubSpot destination shape con delivery `disabled` hasta cutover.
- JSON-LD `Service` + `Organization` (entidad Efeonce) + `FAQPage` + `BreadcrumbList`; entity clarity (Efeonce + servicio explícitos).

### Slice 5 — Verificación visual + registro

- Crear scenario GVC y capturar desktop+mobile+reduced-motion + muro en movimiento; iterar hasta acabado enterprise.
- Registrar la ruta en el route-ownership matrix + fila en el landing registry de la skill + landing file `references/landings/redes-sociales.md`; confirmar CWV (LCP<2.5s, INP<200ms), sin scroll horizontal.

## Out of Scope

- Guía pillar "community manager" en Think (task de contenido aparte, eje EPIC-020).
- Cutover de HubSpot delivery del form `efeonce-social-audit` (queda `disabled`; coordinar aparte).
- Definición del entregable operativo de la auditoría de redes (coordinación con el equipo; no es build de landing).
- Cualquier cambio al pipeline de Growth Forms, al `<greenhouse-form>` renderer o al agendador HubSpot (owned por sus tasks).
- Rediseño del hub `/servicios` como índice editorial propio (task aparte).
- Landings de otros servicios sociales puntuales (paid social, etc.) si emergen.

## Detailed Spec

Ver el blueprint completo en el wireframe (11 regiones, copy ledger, estados, a11y, implementation mapping) + el flow (oferta de dos escalones: reunión + auditoría) + el motion (sección firma "muro social vivo" tier acento). Datos de keyword (Semrush CL 2026-07-06) en PDR-005. La página es marketing-lane `modern-ui`: whitespace editorial, un acento de marca Efeonce, body 18–21px, restraint; la única inversión de motion pesado es el muro social vivo. La captura de lead reusa el contrato gobernado (Full API Parity por reuso).

## Rollout Plan & Risk Matrix

Cambio aditivo de contenido en el sitio público (nueva ruta), sin runtime de datos nuevo en greenhouse-eo. Riesgo bajo, con cuidado SEO (nueva URL indexable), embed del form, peso/CWV del muro social, y marca (solo casos citables).

### Slice ordering hard rule

- Slice 1 (discovery + art direction + FAQ data) → Slice 2 (copy) → Slice 3 (build) → Slice 4 (form + structured data) → Slice 5 (GVC + registro).
- Slice 4 (JSON-LD) puede solaparse con Slice 3 una vez que el markup base existe.
- NO publicar (Slice 3+) sin confirmar en Slice 1 que el CORS del form cubre el origin (si no, el embed falla en producción → usar fallback link como primer release).
- NO publicar el muro social sin validar CWV en Slice 5 (si degrada LCP, degradar a mosaico estático antes de productivo).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Embed del `<greenhouse-form>` bloqueado por CORS en `/servicios/*` | Growth Forms / público | low | Verificar TASK-1335 en Slice 1; fallback link si no cubre | Form no renderiza / consola CORS |
| Muro social vivo degrada CWV (LCP/INP) en mobile | público / performance | medium | `<video>` con `preload=metadata`/playsinline o mosaico estático; validar CWV en Slice 5 | LCP>2.5s / INP>200ms en captura |
| Copy con cifras inventadas o "AI slop" en assets (promesa/craft sin sustancia) | Marca / público | medium | Regla dura Slice 1/2: solo casos reales + art direction primero; validar `greenhouse-ux-writing` | Revisión humana rechaza |
| Nueva URL canibaliza con `/agencia-creativa` u otra | SEO / público | low | Canonical limpio; roles distintos (spoke social vs paraguas creativo); internal links correctos | Caída de impresiones en GSC post-publish |

### Feature flags / cutover

- Sin flag — cambio aditivo de contenido público. Cutover = publish de la página. Revert = despublicar/`draft` (WordPress) + purge Kinsta. Tiempo de revert: minutos. HubSpot delivery del form queda `disabled` (no promete entrega CRM hasta cutover aparte).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A (discovery/art direction, sin cambios productivos) | — | sí |
| Slice 2 | N/A (copy en doc/borrador) | — | sí |
| Slice 3 | Despublicar página (WP `draft`) + purge Kinsta | <10 min | sí |
| Slice 4 | Despublicar form surface + quitar bloque JSON-LD | <10 min | sí |
| Slice 5 | Quitar la ruta del matrix/registry; captura no productiva | <5 min | sí |

### Production verification sequence

1. Slice 1: confirmar hub/runtime/CORS + art direction antes de escribir markup.
2. Publicar en preview (WP staging), `noindex` mientras se valida.
3. GVC desktop+mobile+reduced-motion + muro en movimiento; iterar a enterprise; verificar CWV + sin scroll horizontal.
4. Validar el embed del form en preview (submit real de prueba → llega al pipeline) o el fallback link; validar el CTA de reunión (HubSpot Meetings + UTM).
5. Publicar productivo; verificar canonical, JSON-LD (Rich Results Test), solicitar indexación en GSC.
6. Monitorear GSC (impresiones/clicks de "agencia de redes sociales"/"gestión de redes sociales") post-publish.

### Out-of-band coordination required

- Publish en el sitio público (Kinsta/WordPress) — coordinar por la skill `efeonce-public-site-wordpress`.
- Search Console: solicitar indexación de la nueva URL.
- HubSpot Meetings: confirmar el link/UTM canónico del agendamiento.
- Equipo de delivery social: definir el entregable operativo de la "auditoría de redes" antes de prometerla en producción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La página `/servicios/redes-sociales` está publicada y accesible en el sitio público.
- [ ] El `<h1>` trabaja "redes sociales"/"gestión de redes sociales"; el copy trabaja "agencia de redes sociales" (keyword targeting PDR-005).
- [ ] Cada H2 principal tiene una answer capsule (answer-first, 40–60 palabras) citable.
- [ ] Los 5 bloques de capability (Community · Creators/Influencers · Trendjacking · Reels/Contenido · Social listening) están presentes y descritos por outcome, no por volumen.
- [ ] La sección firma "muro social vivo" se anima en default y queda estática (frames) bajo `prefers-reduced-motion`, sin degradar CWV (LCP<2.5s / INP<200ms).
- [ ] JSON-LD válido `Service` + `Organization` + `FAQPage` + `BreadcrumbList` (pasa Rich Results Test).
- [ ] CTA dual funciona: "Agenda una reunión" → HubSpot Meetings + UTM; "Pide una auditoría de tus redes" → `<greenhouse-form>` embebido con fallback honesto si no carga.
- [ ] NO se reconstruyó el form ni el agendador; la captura reusa el contrato gobernado (Full API Parity por reuso); HubSpot delivery del form `disabled` hasta cutover.
- [ ] Lidera la marca Efeonce (Globe/Reach no aparecen solos); copy es-LATAM neutro sin voseo, sin clichés de voz (context pack 05); sin cifras inventadas; validado `greenhouse-ux-writing`.
- [ ] Solo casos/resultados citables (NUNCA GEA); cifras de "cómo medimos" declaradas como ilustrativas.
- [ ] FAQ poblado con queries reales (Semrush `phrase_questions` CL).
- [ ] Internal links a `/agencia-creativa`, servicios hermanos y guía pillar en Think presentes.
- [ ] GVC desktop + mobile capturado y mirado; sin scroll horizontal (1440 y 390px); reduced-motion respeta el contenido; muro en movimiento evidenciado en 2+ frames.
- [ ] `UI ready` sigue `no` hasta que wireframe + `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log **y** exista la dirección de arte del muro social; si pasa a `yes`, `pnpm task:lint --task TASK-1351` queda sin findings.
- [ ] `Wireframe`, `Flow` y `Motion` declarados y los archivos existen.
- [ ] Ruta registrada en el route-ownership matrix + fila en el landing registry + landing file `references/landings/redes-sociales.md`.

## Verification

- `pnpm task:lint --task TASK-1351`
- `pnpm ops:lint --changed`
- `pnpm ui:wireframe-check --task TASK-1351` · `pnpm ui:flow-check --task TASK-1351` · `pnpm ui:motion-check --task TASK-1351`
- Playwright/GVC live: desktop 1440 + mobile 390 (scroll-width, muro en movimiento, form montado, reduced-motion, focus).
- Growth Form API smoke (GET render contract con `Origin: https://efeoncepro.com`; POST sin Turnstile → rechazo esperado).
- HTTP: `/servicios/redes-sociales/` responde `200`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (guía Think, paraguas Agencia Creativa)

- [ ] La página quedó registrada en el route-ownership matrix, el landing registry y (si aplica) la nav del hub `/servicios`.

## Follow-ups

- Guía pillar "community manager" en Think (task de contenido aparte, eje EPIC-020) que enlaza a esta spoke.
- Cutover de HubSpot delivery para `efeonce-social-audit`.
- Definir + operacionalizar el entregable de la "auditoría de redes".
- **Fase 2 internacional**: spoke localizada `en-US` ("social media agency"/"social media management") con `hreflang` + localización real; Brasil `pt-BR` posterior.

## Open Questions

- ¿Cuál es el link canónico de HubSpot Meetings + UTM para el CTA de reunión? (mismo que Agencia Creativa `[verificar]`).
- ¿Qué resultados sociales citables reales tenemos (Sky/Bresler/Berel/SSilva u otros)? Si no hay, ¿se aprueban cifras ilustrativas del modelo declaradas?
- ¿El entregable de la "auditoría de redes" existe operativamente o requiere definirse antes de prometerlo? Resolver antes de Slice 4.
