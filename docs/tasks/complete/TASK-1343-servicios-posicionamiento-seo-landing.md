# TASK-1343 — Landing pública de servicio SEO (`/servicios/posicionamiento-seo`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1343-servicios-posicionamiento-seo-landing.md`
- Flow: `docs/ui/flows/TASK-1343-servicios-posicionamiento-seo-landing-flow.md`
- Motion: `docs/ui/motion/TASK-1343-servicios-posicionamiento-seo-landing-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Publicado en WordPress`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: `none`
- Branch: `task/TASK-1343-servicios-posicionamiento-seo-landing`

## Summary

Construye la landing pública de servicio SEO `/servicios/posicionamiento-seo` en el sitio de Efeonce: una spoke de conversión (mid/bottom-funnel) que captura la búsqueda comercial ("agencia seo"/"posicionamiento web"), presenta el método sin caer en commodity, y entrega al usuario a un diagnóstico gobernado. La landing embeddeó el Growth Form `efeonce-seo-diagnostic` con `<greenhouse-form>` y no construye backend nuevo. Deriva de PDR-001/002/003.

## Why This Task Exists

Hoy el sitio público solo tiene `/aeo-2` (servicio AEO, el filo) y no captura la demanda SEO comercial, que es mucho mayor (Semrush CL: "agencia seo" 880/mes, "posicionamiento web" 390, "seo" 2.900). Sin una landing SEO, Efeonce cede tráfico transaccional de alta intención y deja su posicionamiento solo en el nicho AEO. PDR-001 decidió crear esta spoke como el **cimiento** (no commodity); PDR-002 cerró la IA (hub `/servicios` + slug `posicionamiento-seo`, data-backed) y PDR-003 la ubicó en la capa de adquisición del ecosistema. Falta materializar la página.

## Goal

- Publicar `/servicios/posicionamiento-seo` con el blueprint aprobado (hero outcome+mecanismo, stakes, 3 pilares como answer capsules, prueba, puente AEO, sección grader, cómo trabajamos, FAQ, CTA final).
- Capturar la keyword comercial (H1/title "posicionamiento SEO", copy trabaja "agencia seo") y ser citable por motores de respuesta (answer capsules + JSON-LD Service/Organization/FAQPage/BreadcrumbList).
- Entregar al usuario al diagnóstico SEO mediante embed `<greenhouse-form>` gobernado, sin reconstruir el pipeline y con fallback honesto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-001-seo-landing-complementaria-al-aeo.md`
- `docs/public-site/decisions/PDR-002-arquitectura-informacion-seccion-visibilidad.md`
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
- `docs/operations/public-site-route-ownership-matrix-20260616.md`
- `docs/context/05_voz-tono-estilo.md` (voz es-CL, Don'ts)

Reglas obligatorias:

- Hub `/servicios` (NO `/soluciones` — cliché de voz de marca); slug `posicionamiento-seo` (data-backed, no `/visibilidad`).
- Full API Parity: la única acción de negocio (captura/arranque del grader) YA es contrato gobernado (Growth Forms + grader pipeline). La landing es cliente, NO owner — NO reconstruir el form ni el grader.
- Un solo nodo grader (una engine, muchos entry points) servido desde `think.efeoncepro.com`; la landing enlaza/embebe, no duplica.
- Voz: mecanicista, tuteo **es-LATAM neutro** (sin voseo, sin chilenismos — el servicio es pan-LATAM: EC/MX/CL/CO/PE/AR), sin "soluciones integrales"/superlativos/promesa-sin-mecanismo; sin manzanitas 🍏 (marca personal de Julio).
- Alcance regional (PDR-002 §Alcance regional): LATAM-first → EEUU → mundo. "agencia seo" es el head term pan-LATAM (~8.000+/mes). Copy sin referencias Chile-only; **preparar `hreflang` desde el build** para no re-migrar al sumar `en-US` (fase 2). NO traducción máquina.
- Ejecutar en el sitio público vía la skill `efeonce-public-site-wordpress`; NO usar AXIS/MUI/`src/lib/copy` (eso es portal).

## Normative Docs

- `docs/ui/wireframes/TASK-1343-servicios-posicionamiento-seo-landing.md`
- `docs/ui/flows/TASK-1343-servicios-posicionamiento-seo-landing-flow.md`
- `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md` (master flow — esta landing es un nodo de entrada)
- `docs/ui/motion/TASK-1343-servicios-posicionamiento-seo-landing-motion.md`

## Dependencies & Impact

### Depends on

- `<greenhouse-form>` renderer (Growth Forms) — existente (TASK-1320 renderer; TASK-1327 embed pattern).
- Nodo grader en `think.efeoncepro.com` — existente (TASK-1325 live).
- Handoff tokenized report — TASK-1336 (para el journey post-submit; no lo re-autora).
- CORS / surface-allowlist del form para el origin `efeoncepro.com/servicios/*` — `[verificar]` que TASK-1335 cubra este origin.
- Hub `/servicios` — `[verificar]` por crawl: ¿existe con contenido/IA propia? decide nested limpio y runtime (WordPress vs Astro).

### Blocks / Impacts

- Habilita el sibling `/servicios/aeo` (301 desde `/aeo-2`) y la guía pillar en Think (tasks aparte).

### Files owned

- `docs/tasks/to-do/TASK-1343-servicios-posicionamiento-seo-landing.md`
- `docs/ui/wireframes/TASK-1343-servicios-posicionamiento-seo-landing.md`
- `docs/ui/flows/TASK-1343-servicios-posicionamiento-seo-landing-flow.md`
- `docs/ui/motion/TASK-1343-servicios-posicionamiento-seo-landing-motion.md`
- Contenido de la página en el sitio público (WordPress/Elementor o `efeonce-web` Astro — determinar en Discovery) `[verificar]`
- `scripts/frontend/scenarios/public-servicios-posicionamiento-seo.capture.txt` `[verificar]`

## Current Repo State

### Already exists

- Decisiones PDR-001/002/003 (posicionamiento + IA + ecosistema).
- Growth Forms renderer `<greenhouse-form>` + pipeline grader + nodo Think (`think.efeoncepro.com`).
- Landing hermana `/aeo-2` (servicio AEO) como referencia de patrón.
- Route-ownership matrix del sitio público.

### Gap

- No existe la página `/servicios/posicionamiento-seo` ni el hub `/servicios` (confirmar por crawl).
- Copy final (pilares con métrica real, prueba/casos, ítems FAQ) sin draftear; FAQ pendiente de poblar con `phrase_questions` Semrush CL.
- JSON-LD (Service/Organization/FAQPage/BreadcrumbList) no implementado para esta ruta.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: decisor de marketing (ICP Globe) buscando proveedor SEO.
- Momento del flujo: solution/product-aware, evaluando a quién contratar.
- Resultado perceptible esperado: entiende el método (medible, no commodity) y da un primer paso de bajo compromiso (diagnóstico).
- Friccion que debe reducir: la desconfianza al "otra agencia SEO"; un CTA claro de bajo compromiso (grader) reduce la barrera de contacto.
- No-goals UX: no es pricing; no es la página AEO; no reconstruye el form/grader.

### Surface & system decision

- Surface: `efeoncepro.com/servicios/posicionamiento-seo` (público; WordPress/Elementor o Astro).
- Composition Shell: `no aplica` — es sitio público (marketing lane `modern-ui`), no el portal Greenhouse.
- Primitive decision: `reuse` — patrones marketing `modern-ui` (editorial header, section header, floating feature card, card-on-section) + `<greenhouse-form>` embebido.
- Adaptive density / The Seam: `no aplica` — patrón del portal.
- Floating/Sidecar/Dialog decision: no aplica (página, no-modal).
- Copy source: contenido de página del sitio público (NO `src/lib/copy`); validado `greenhouse-ux-writing` + context pack 05.
- Access impact: `none` (pública).

### State inventory

- Default: página renderizada, CTAs activos.
- Loading: sin loading de página (SSR/estático); el form embebido tiene su propio loading (renderer).
- Empty: N/A (contenido curado).
- Error: error del form → manejado por el renderer (Success Card TASK-1320).
- Degraded / partial: embed no carga (JS off/bloqueado) → fallback link a contacto con UTM de la landing (CTA nunca muere).
- Permission denied: N/A (pública).
- Long content: página larga por diseño; scroll natural, sin scroll horizontal.
- Mobile / compact: stack 1-col; grid de pilares colapsa vía container query.
- Keyboard / focus: orden top→bottom; CTAs y FAQ (`<summary>`) alcanzables.
- Reduced motion: reveals/entradas off bajo `prefers-reduced-motion` (ver Motion contract).

### Interaction contract

- Primary interaction: click "Diagnostica tu visibilidad" → embed del form o nodo grader.
- Hover / focus / active: CTAs con color + micro-lift + focus ring (ver Motion).
- Pending / disabled: estados del form owned por su renderer.
- Escape / click-away: N/A (no-modal).
- Focus restore: natural del navegador al volver de Think/`/servicios/aeo`.
- Latency feedback: del renderer del form (no de la página).
- Toast / alert behavior: N/A en la página.

### Motion & microinteractions

- Motion primitive: `CSS` (sitio público) — NO wrappers del portal.
- Enter / exit: hero fade+rise 400ms ease-out; sin exit especial.
- Layout morph: ninguno.
- Stagger: corto en hero y cards de pilares.
- Timing / easing token: escala 75/150/200/300/400ms; ease-out `cubic-bezier(0.2,0,0,1)`.
- Reduced-motion fallback: contenido visible sin animación.
- Non-goal motion: hero-video, parallax pesado, loops, mascota animada.

### Implementation mapping

- Route / surface: `efeoncepro.com/servicios/posicionamiento-seo`.
- Primitive / variant / kind: patrones marketing `modern-ui` (no Design System del portal).
- Component candidates: secciones Elementor / componentes Astro + `<greenhouse-form>` embebido.
- Copy source: contenido de página pública (validado `greenhouse-ux-writing`).
- Data reader / command: ninguno nuevo (reuso del submit gobernado del grader).
- API parity: satisfecho por reuso (Growth Forms + grader pipeline); la landing es cliente.
- Access / capability: pública, sin capability.
- States to implement: default, degraded (fallback link), mobile, reduced-motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-posicionamiento-seo.capture.txt`
- Route: URL pública del preview (WordPress staging / Vercel preview).
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; scroll por secciones; abrir 1 FAQ.
- Required captures: full-page desktop + mobile; frames por sección; FAQ abierto; reduced-motion.
- Required `data-capture` markers: `hero`, `stakes`, `metodo`, `prueba`, `bridge`, `grader`, `faq`.
- Assertions: sin scroll horizontal (1440 y 390); H1 presente; CTA grader accionable o fallback visible.
- Scroll-width checks: `scrollWidth <= clientWidth` ambos viewports.
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce`; focus ring visible en CTAs.

### Design decision log

- Decision: spoke de conversión bajo `/servicios`, slug data-backed `posicionamiento-seo`; pillar de autoridad en Think, no en esta página.
- Alternatives considered: `/visibilidad` (sin volumen), `/soluciones` (cliché de voz), reconstruir grader (viola Full API Parity) — todos descartados en PDR-002.
- Why this pattern: `modern-ui` marketing lane + Command of the Message + on-page SEO/AEO + copywriting FAB/solution-aware.
- Reuse / extend / new primitive: reuse.
- Open risks: estado del hub `/servicios`; copy de prueba requiere casos reales; runtime (WordPress vs Astro) según crawl.

### Visual verification

- GVC scenario: `public-servicios-posicionamiento-seo`.
- Viewports: 1440 + 390.
- Required captures: full-page + por sección + FAQ abierto + reduced-motion.
- Required `data-capture` markers: `hero`, `stakes`, `metodo`, `prueba`, `bridge`, `grader`, `faq`.
- Scroll-width check: sí, ambos viewports.
- Accessibility/focus checks: focus ring, contraste AA en hero y bandas.
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

### Slice 1 — Discovery de sitio + FAQ data

- Crawl del sitio público: confirmar si `/servicios` existe (contenido/IA) y el runtime activo (WordPress vs Astro); confirmar equity de `/aeo-2`.
- Verificar que el CORS/surface-allowlist del `<greenhouse-form>` cubra el origin `efeoncepro.com/servicios/*` (TASK-1335); si no, declarar dependencia.
- Poblar el FAQ con queries reales (`phrase_questions` Semrush CL, seed "posicionamiento seo"/"agencia seo").

### Slice 2 — Copy final (greenhouse-ux-writing)

- Draftear el copy pendiente del copy ledger (pilares con métrica, prueba/casos con números reales, FAQ, "cómo trabajamos") validado con `greenhouse-ux-writing` + context pack 05.
- Regla dura: no inventar cifras de resultados; solo casos reales publicables.

### Slice 3 — Build de la página

- Implementar las 10 regiones del wireframe en el runtime del sitio (Elementor o Astro), con los patrones marketing `modern-ui`, embed del `<greenhouse-form>` o link al grader + fallback.
- On-page SEO/AEO: H1/title keyword, answer capsules bajo cada H2, internal links (→ `/servicios/aeo`, guía Think, grader), markers `data-capture`.

### Slice 4 — Structured data + entidad

- JSON-LD `Service` + `Organization` (entidad Efeonce) + `FAQPage` + `BreadcrumbList`; entity clarity (Efeonce + Chile + servicio explícitos).

### Slice 5 — Verificación visual + registro

- Crear scenario GVC y capturar desktop+mobile+reduced-motion; iterar hasta acabado enterprise.
- Registrar la ruta en el route-ownership matrix; confirmar CWV (LCP<2.5s, INP<200ms), sin scroll horizontal.

## Out of Scope

- Sibling `/servicios/aeo` + el 301 `/aeo-2` → `/servicios/aeo` (task aparte).
- Guía pillar "Visibilidad en búsqueda e IA" en Think (task aparte).
- Página índice del hub `/servicios` si requiere rediseño propio (task aparte; esta task asume el hub como contexto/nav).
- Cualquier cambio al pipeline del grader, al `<greenhouse-form>` renderer o al handoff (owned por TASK-1320/1327/1336).
- Nuevas capabilities/forms backend (si emerge un form nuevo, es task `backend-data` aparte por Full API Parity).

## Detailed Spec

Ver el blueprint completo en el wireframe (regiones, copy ledger, estados, a11y, implementation mapping) + el flow (entrega al grader) + el motion (acento tier bajo). Datos de keyword (Semrush CL 2026-07-05) en PDR-002. La página es marketing-lane `modern-ui`: whitespace editorial, un acento de marca Efeonce, body 18–21px, restraint. La captura de lead reusa el contrato gobernado (Full API Parity por reuso).

## Rollout Plan & Risk Matrix

Cambio aditivo de contenido en el sitio público (nueva ruta), sin runtime de datos nuevo en greenhouse-eo. Riesgo bajo, pero con cuidado SEO (nueva URL indexable) y de embed del form.

### Slice ordering hard rule

- Slice 1 (discovery + FAQ data) → Slice 2 (copy) → Slice 3 (build) → Slice 4 (structured data) → Slice 5 (GVC + registro).
- Slice 4 (JSON-LD) puede solaparse con Slice 3 una vez que el markup base existe.
- NO publicar (Slice 3+) sin confirmar en Slice 1 que el CORS del form cubre el origin (si no, el embed falla en producción → usar fallback link como primer release).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Embed del `<greenhouse-form>` bloqueado por CORS en `/servicios/*` | Growth Forms / público | medium | Verificar TASK-1335 en Slice 1; fallback link al grader si no cubre | Form no renderiza / consola CORS |
| Nueva URL compite/canibaliza con `/aeo-2` o contenido existente | SEO / público | low | Canonical limpio; roles distintos (SEO vs AEO); internal links correctos | Caída de impresiones en GSC post-publish |
| Copy con cifras inventadas (promesa sin prueba) | Marca / público | medium | Regla dura Slice 2: solo casos reales; validar `greenhouse-ux-writing` | Revisión humana rechaza |
| Slug/hub `/servicios` inexistente → 404 o IA rota | público / SEO | medium | Crawl en Slice 1 antes de fijar ruta | 404 en preview |

### Feature flags / cutover

- Sin flag — cambio aditivo de contenido público. Cutover = publish de la página. Revert = despublicar/`draft` (WordPress) o revert del PR (Astro). Tiempo de revert: minutos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A (discovery, sin cambios productivos) | — | sí |
| Slice 2 | N/A (copy en doc/borrador) | — | sí |
| Slice 3 | Despublicar página (WP `draft`) o revert PR (Astro) + purge CDN | <10 min | sí |
| Slice 4 | Quitar el bloque JSON-LD | <10 min | sí |
| Slice 5 | Quitar la ruta del matrix; captura no productiva | <5 min | sí |

### Production verification sequence

1. Slice 1: crawl + confirmar hub/runtime/CORS antes de escribir markup.
2. Publicar en preview (WP staging / Vercel preview), `noindex` mientras se valida.
3. GVC desktop+mobile+reduced-motion; iterar a enterprise; verificar CWV + sin scroll horizontal.
4. Validar el embed del form en preview (submit real de prueba → llega al pipeline) o el fallback link.
5. Publicar productivo; verificar canonical, JSON-LD (Rich Results Test), y solicitar indexación en GSC.
6. Monitorear GSC (impresiones/clicks de "posicionamiento seo"/"agencia seo") post-publish.

### Out-of-band coordination required

- Publish en el sitio público (Kinsta/WordPress o Vercel de `efeonce-web`) — coordinar por la skill `efeonce-public-site-wordpress`.
- Search Console: solicitar indexación de la nueva URL.
- Si el hub `/servicios` no existe, coordinar su creación/nav antes o junto a esta página.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La página `/servicios/posicionamiento-seo` está publicada y accesible en el sitio público.
- [ ] El `<h1>` contiene "posicionamiento SEO"; el copy trabaja "agencia SEO" + "posicionamiento web" (keyword targeting PDR-002).
- [ ] Cada H2 principal tiene una answer capsule (answer-first, 40–60 palabras) citable.
- [ ] JSON-LD válido `Service` + `Organization` + `FAQPage` + `BreadcrumbList` (pasa Rich Results Test).
- [ ] El CTA "Diagnostica tu visibilidad" entrega al nodo grader existente (embed o link) con fallback honesto si el embed no carga.
- [ ] NO se reconstruyó el form ni el grader; la captura reusa el contrato gobernado (Full API Parity por reuso).
- [ ] Copy es-CL, mecanicista, sin clichés de voz (context pack 05); sin cifras inventadas; validado `greenhouse-ux-writing`.
- [ ] FAQ poblado con queries reales (Semrush `phrase_questions` CL).
- [ ] Internal links a `/servicios/aeo`, guía pillar en Think y grader presentes.
- [ ] GVC desktop + mobile capturado y mirado; sin scroll horizontal (1440 y 390px); reduced-motion respeta el contenido; CWV LCP<2.5s / INP<200ms.
- [ ] `UI ready` sigue `no` hasta que wireframe + `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log; si pasa a `yes`, `pnpm task:lint --task TASK-1343` queda sin findings.
- [ ] `Wireframe`, `Flow` y `Motion` declarados y los archivos existen.
- [ ] Ruta registrada en `docs/operations/public-site-route-ownership-matrix-20260616.md`.

## Verification

### 2026-07-06 — Live WordPress rollout

Nota de scope: el operador corrigió explícitamente que la landing aprobada era el artefacto de Claude Design, no el blueprint original de esta task. La implementación final respeta ese diseño aprobado: el `<h1>` queda como `Que te encuentren en Google, y que la IA no te ignore.`; el targeting SEO vive en title/meta, schema, copy, FAQ y secciones.

- Publicado en WordPress/Elementor vía `Document::save()` en `https://efeoncepro.com/servicios/posicionamiento-seo/`.
- WordPress page ID: `251078`; parent `/servicios/` creado como página mínima ID `251077`.
- Backup meta final: `_gh_backup_before_task1343_seo_landing_20260706T210238Z`.
- CTA primario apunta a `#grader`, donde vive el Growth Form SEO embebido.
- Puente AEO apunta a `/aeo-2/` mientras el sibling `/servicios/aeo` queda como follow-up.
- El primer release usó link al nodo Think existente; el rollout posterior documentado abajo migró la conversión SEO a un Growth Form propio embebido.
- Kinsta cache purgada con `wp kinsta cache purge --all`.
- Corrección post-feedback del operador: widgets Ohio visibles; font de Tabler Icons restaurada (`138` iconos, `invalidIcons=[]`).
- Corrección post-feedback de header/gutter: la página quedó en `template default` con header Ohio nativo `header-3`, variante clara heredada (`main-blue-logo.svg`, nav oscuro), sin `elementor_canvas`, sin header sticky custom y sin forzar hero oscuro. También se eliminó la franja blanca lateral del wrapper full-width: `page_full_width_margins_size=0px` + override page-scoped específico contra `.e-con-full.e-parent` de `seo1343`.
- Corrección post-feedback de paridad con Claude Design: se restauró el keyword marquee bajo el hero (`[data-capture="keyword-marquee"].gh-seo-keyword-marquee`) y el scroll reveal volvió a activarse por intersección real; ya no hay reveal-all global que quite el motion al bajar.
- Corrección post-feedback de footer: se eliminó el footer custom dentro de `.gh-seo-landing`; el cierre de página usa el footer nativo Ohio `#colophon`.
- Corrección post-feedback de marca: el badge flotante `Indexado` reemplazó `ti-brand-google` por el SVG local multicolor de Google (`public/images/greenhouse/SVG/icon-google.svg`) inline como `.gh-google-logo-mark`.
- Corrección post-feedback de marca en E-E-A-T: se retiró el intento temporal con `simple-icons` monocromo y el panel `Peso de E-E-A-T` ahora usa assets locales reales en badges consistentes de `24px`: `.gh-google-dark-mark.gh-eeat-brand-badge` contiene el SVG multicolor local de Google a `15px` en soporte claro compatible con fondo oscuro, y `.gh-chatgpt-mark.gh-eeat-brand-badge` contiene el isotipo GPT local (`public/images/logos/axis/gpt-isotype.svg`) a `15px` en soporte verde oscuro en lugar del sparkle. Backup más reciente de esta corrección: `_gh_backup_before_task1343_seo_landing_20260706T225431Z`.
- Corrección post-feedback de marca en comparativa: en la card derecha de `Agencia SEO commodity vs. método medible` se reemplazó el ícono de planta + texto visible `Efeonce · método medible` por el logo local completo de Efeonce (`public/branding/logo-full.svg`) inline como `.gh-comparison-efeonce-logo`, seguido sólo por `· método medible`. Backup final de esta corrección: `_gh_backup_before_task1343_seo_landing_20260706T220359Z`.
- Corrección post-feedback de marca en plataforma Greenhouse: el pill superior de `Tu SEO, en vivo — en un dashboard propio` usa el logotipo local azul de Greenhouse (`public/images/greenhouse/SVG/greenhouse-blue.svg`) como `.gh-greenhouse-logotype-pill`, y el chrome del dashboard usa el isotipo blanco local de Greenhouse (`public/images/greenhouse/SVG/negative-isotipo.svg`) como `.gh-greenhouse-isotype-badge`. Backup: `_gh_backup_before_task1343_seo_landing_20260706T221051Z`.
- Auditoría global post-feedback de logos: los chips y filas nombradas de `ChatGPT`, `Perplexity` y `Google AI` usan SVGs locales reales (`gpt-isotype.svg`, `perplexity-icon.svg`, `icon-google.svg`), y el puente `SEO -> AEO` usa Google blanco + GPT local en lugar de glyphs genéricos. Backups de la secuencia: `_gh_backup_before_task1343_seo_landing_20260706T221352Z`, `_gh_backup_before_task1343_seo_landing_20260706T221602Z` y `_gh_backup_before_task1343_seo_landing_20260706T221930Z`.
- Corrección post-feedback de tracking de títulos: los H1/H2 display y los tres H3 grandes del bloque `Qué incluye` quedaron alineados con el precedente aprobado de AEO/desarrollo (`letter-spacing:-0.045em` en DM Sans), mientras los spans de acento heredan el tracking y los textos internos pequeños permanecen sin tracking display. Backup final de esta corrección: `_gh_backup_before_task1343_seo_landing_20260706T224418Z`.
- Polish post-feedback solicitado por el operador, limitado a los puntos `2, 3, 4, 5, 7`: hero móvil, lógica de CTAs, prueba comercial/social trust, protagonismo de Greenhouse y contraste de microtextos. No se compactó `Qué incluye` ni se recortaron blancos globales. Estado live:
  - Hero móvil: H1/párrafo/CTA secundario/proof row compactados sólo en mobile; `.mcta` fijo queda oculto al inicio (`opacity=0`, `pointer-events=none`) y aparece tras scroll (`.is-visible`).
  - CTA logic: `Habla con el equipo` y `Hablar sobre Greenhouse` apuntan a `mailto:hola@efeoncepro.com?subject=Diagn%C3%B3stico%20SEO%20Efeonce`; `Ver AEO` conserva `https://efeoncepro.com/aeo-2/`; diagnósticos apuntan a `#grader`.
  - Social proof: se agregó `[data-capture="commercial-proof"].gh-commercial-proof` con logos reales locales (`sky`, `anam`, `berel`, `carozzi`, `bresler`, `marca-chile`) y prueba operativa sin métricas inventadas.
  - Reflow narrativo posterior: por feedback del operador, ese bloque ya no vive entre marquee y contexto; ahora cae después de `[data-capture="prueba"]` y antes de `[data-capture="plataforma"]`, con copy visible `Evidencia del método` / `La diferencia se demuestra cuando puedes auditar el trabajo.` para que funcione como confirmación del reporte, no como interrupción post-hero.
  - Rediseño editorial posterior: por feedback del operador, la prueba comercial dejó de sentirse contenida en una card. Ahora renderiza como franja editorial abierta: `.gh-proof-shell` transparente sin borde/radio/sombra, logo wall con divisores finos (`.gh-proof-wall`) y tres puntos de prueba en ledger abierto (`.gh-proof-ledger`) en lugar de métricas encajonadas.
  - Greenhouse: la sección de plataforma tiene badge `Reporte vivo`, operating row `.gh-greenhouse-operating-row`, cards de prioridades/señales/decisión y CTA `Diagnostica tu baseline`.
  - Microtextos: se endureció contraste de los tonos inline `#9a98a4`, `#8a8894`, `#b0aeba` y secundarios de secciones oscuras.
  - CTA hover/focus: por feedback del operador, todos los CTAs quedaron bajo el sistema scoped `task-1343-cta-hover-system-v1`. Se retiró el shine overlay que podía lavar texto, se fijaron estados explícitos para `.btn-primary`, `.btn-ghost`, `.btn-light` y `.lnk`, y se agregó reduced-motion sin lift. El caso señalado `Ver AEO` ahora pasa a fondo blanco con texto azul en hover/focus, no blanco sobre blanco.
  - Backup final publicado: `_gh_backup_before_task1343_seo_landing_20260707T000629Z`.
- Growth Form SEO end-to-end: se creó y publicó `efeonce-seo-diagnostic` (`formId=fdef-3d065f54-42b4-4964-9216-6fefae7cc765`, `formKey=7772dcf4-e2ca-4f5b-b386-2db92659b050`, `formVersionId=fver-af974bcd-2e20-45ea-9c3e-a897eeb27d2e`, version `3`) y una surface WordPress dedicada (`fhsf-48a4b95f-5f2a-453a-88d7-af3257e7c417`). La sección `#grader` vive entre `bridge` y `faq`, usa `diagnostic_premium`, 11 campos visibles de captura, Turnstile obligatorio y HubSpot destination shape con delivery `disabled` hasta cutover. Todos los CTA diagnósticos aterrizan en `#grader`; el sticky CTA móvil se oculta antes/dentro del formulario para no tapar campos. La v3 conserva `Sitio web a diagnosticar` en la fila de `Empresa` mediante `type=text` + `inputMode=url` + `validator=url` + `maxLength=160`, elimina el select opcional `CMS o plataforma`, absorbe ese contexto en el textarea, agrega microcopy a `Nombre completo` y `Empresa`, reduce helpers redundantes bajo selects, oculta contadores visuales y oscurece el gradiente del submit para contraste accesible con texto blanco. Backup final de la pasada WordPress: `_gh_backup_before_task1343_seo_landing_20260707T013432Z`; el form v3 se publicó sin cambiar el `formKey`.
- Integración visual/motion del Growth Form: por feedback del operador, `#grader` dejó de sentirse como una card desconectada. Se agregó el marker page-scoped `task-1343-seo-growth-form-motion-v1`: la sección tiene estación visual clara con orbit/halo, entrada `is-in-view`, proof/meta con microinteracciones, header host con status pills, card con hover/focus-within lift, campos con hover/focus polish, y marcador `.gh-form-ready[data-form-ready="true"]` cuando el renderer monta. Reduced-motion queda estático sin lift ni field animations. No se cambió el contrato del form ni sus campos; WordPress sólo gobierna el chrome de la sección. Backup de esta pasada: `_gh_backup_before_task1343_seo_landing_20260707T053404Z`.
- Corrección de desplegables del Growth Form SEO: tras feedback visual del operador, se corrigió el listbox premium que quedaba enterrado bajo filas posteriores del grid al abrir `Qué quieres mejorar primero`. Fix live page-scoped: active field/listbox con stack explícito (`z-index=90/120`), `overflow` visible en la grid y contraste oscuro para opción seleccionada. Fix de raíz en el renderer compartido: el select premium marca su `.ghf-field` con `data-overlay-open="true"`, y el CSS base eleva fields activos/listbox; también se corrigió el color de opción seleccionada/hover para no depender de `--ghf-accent-contrast` blanco sobre fondos claros. Backup final de esta corrección: `_gh_backup_before_task1343_seo_landing_20260707T055455Z`.
- Sticky editorial lane del Growth Form SEO: por feedback del operador, se investigó el patrón de Home/Ohio y se reprodujo de forma page-scoped en `#grader`. La columna izquierda usa `.gh-seo-diagnostic-copy.-sticky-block` como lane completa, con altura de viewport, inner centrado y mobile estático; el sticky acompaña el scroll del formulario y se suelta al llegar al final del shell/form. Causa raíz corregida: `<main class="gh-seo-landing site-content">` heredaba `overflow-y:auto` y convertía la landing en scroll container; se removió `site-content` del wrapper y se mantuvo una guarda page-scoped de `overflow:visible` en wrappers Elementor/landing. Backup final de esta corrección: `_gh_backup_before_task1343_seo_landing_20260707T063508Z`. El patrón quedó canonizado para próximas landings en `docs/documentation/public-site/wordpress-ohio-elementor-layout.md` y en las skills Codex/Claude `efeonce-public-site-wordpress`.

Evidencia:

- `pnpm task:lint --task TASK-1343`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --agent codex --task TASK-1343 --ui --runtime --production` (advisory; evidencia visual/runtime abajo)
- Playwright live: `.captures/task1343-seo-live-user-correction-2026-07-06T21-03-13-511Z/`
- Desktop `1440`: `scrollWidth=1440`, `clientWidth=1440`, `errors=[]`, widgets Ohio visibles, `invalidIcons=[]`.
- Mobile `390`: `scrollWidth=390`, `clientWidth=390`, `errors=[]`, widgets Ohio visibles, `invalidIcons=[]`.
- Header/gutter Playwright live: `.captures/task1343-seo-native-header-2026-07-06T21-20-50-110Z/` y `.captures/task1343-seo-gutter-fix-final-2026-07-06T21-29-30-989Z/`.
- Gutter fix: `.page-container`, `.elementor-251078`, `.gh-task-1343-seo-landing-shell`, `.gh-seo-landing`, hero y `#eeat` computan `left=0` en desktop `1440` y mobile `390`; `scrollWidth == clientWidth`; `invalidIcons=0`.
- Marquee/motion Playwright live: `.captures/task1343-seo-marquee-motion-2026-07-06T21-39-37-247Z/`; desktop/mobile `hasMarquee=true`, `.marquee-track` se mueve (`trackMoved=true`), `stakes` está oculto antes del scroll y entra con `.in`/opacity ~1 al intersectar, una sección posterior permanece oculta, reduced-motion desactiva marquee y revela contenido estático, `scrollWidth == clientWidth`, `invalidIcons=0`.
- Footer Playwright live: `.captures/task1343-seo-remove-custom-footer-2026-07-06T21-43-47-560Z/`; `.gh-seo-landing footer` ausente, texto duplicado `© 2026 Efeonce · posicionamiento SEO` ausente, `#colophon` nativo presente como único `footer`, `scrollWidth == clientWidth`, console errors `[]`.
- Google badge Playwright live: `.captures/task1343-seo-google-logo-badge-2026-07-06T21-47-03-175Z/`; `.gh-google-logo-mark svg` presente en el badge `Indexado`, fills `#4285F4/#34A853/#FBBC05/#EB4335`, `.floaty .ti-brand-google=0`, desktop/mobile sin overflow, `invalidIcons=0`, console errors `[]`.
- E-E-A-T brand badges Playwright live: `.captures/task1343-seo-eeat-brand-badges-2026-07-06T22-55-10-532Z/`; `.gh-google-dark-mark.gh-eeat-brand-badge` y `.gh-chatgpt-mark.gh-eeat-brand-badge` presentes como badges `24x24`, SVGs reales `15x15`, Google viewBox `0 0 256 262` con fills `#4285F4/#34A853/#FBBC05/#EB4335`, GPT viewBox `0 0 45.9894 47.0006` con `--fill-0:#f3ffe3`, sin `ti-brand-google` en `En SEO clásico`, sin `ti-sparkles` en `En AEO / IA`, desktop/mobile `scrollWidth==clientWidth`.
- Comparativa Playwright live: `.captures/task1343-seo-comparison-efeonce-logo-final-2026-07-06T22-04-31-801Z/`; `.gh-comparison-efeonce-logo svg` presente con viewBox `0 0 837.07 196.68`, sin `<style>` interno, paths con `fill="#023c70"`, header text `· método medible`, sin `.ti-plant-2` en el header derecho, sin frase vieja `Efeonce · método medible`, desktop/mobile sin overflow.
- Bridge AI icons Playwright live: `.captures/task1343-seo-bridge-ai-icons-2026-07-06T22-16-47-922Z/`; el bloque `SEO -> AEO` usa `.gh-bridge-google-white-mark svg` con viewBox Google `0 0 256 262` y cuatro fills blancos, y `.gh-bridge-chatgpt-mark svg` con viewBox GPT local `0 0 45.9894 47.0006`; sin `ti-brand-google` ni `ti-sparkles` en esos wrappers.
- Auditoría global de logos Playwright live: `.captures/task1343-seo-brand-logo-audit-2026-07-06T22-22-03-192Z/`; desktop/mobile `ok=true`, `i.ti-brand-google=0`, `i.ti-brand-openai=0`, wrappers de Google/ChatGPT/Perplexity/Greenhouse/Efeonce con SVGs esperados, y sin sparkles residuales en wrappers de marca nombrada. El overflow desktop reportado por la auditoría full-page (`576px`) corresponde al comportamiento off-canvas del megamenu Ohio inactivo; mobile `390` queda sin overflow y las verificaciones focales de la landing quedaron sin overflow.
- Tracking de títulos Playwright live: `.captures/task1343-seo-letter-spacing-audit-2026-07-06T22-45-55-689Z/`; desktop/mobile `ok=true`, `17` display titles auditados (H1/H2 + tres H3 grandes de `Qué incluye`), todos computan `letter-spacing:-0.045em`; `Contenido que rankea por temas, no por suerte`, `Landings que rankean y convierten` y `Autoridad real, con enlaces que sí cuentan` computan `-1.404px` a `31.2px`; `El SEO no termina en tráfico. Termina en negocio.` computa `-1.944px` a `43.2px`; spans de acento (`IA no te ignore`, `exige`) heredan tracking; desktop/mobile `scrollWidth==clientWidth`; `failures=[]`.
- CTA/proof/Greenhouse polish Playwright live: `.captures/task1343-seo-final-polish-2026-07-06T23-29-34-593Z/`, `.captures/task1343-seo-final-check-2026-07-06T23-31-49-943Z/`, reflow narrativo `.captures/task1343-seo-commercial-proof-reflow-2026-07-06T23-41-50-507Z/`, rediseño editorial `.captures/task1343-seo-commercial-proof-editorial-2026-07-06T23-52-56-893Z/` y hover/focus CTAs `.captures/task1343-seo-cta-hover-system-final-2026-07-07T00-07-18-007Z/`; mobile `390` `overflowX=0`, desktop `1440` `overflowX=0`, `.mcta` top oculto y tras scroll visible; `commercial-proof` quedó en orden `prueba -> commercial-proof -> plataforma`, `proofLogoCount=6`, `.gh-proof-shell` sin background/borde/radio/sombra, `.gh-proof-wall` con hairlines, console errors `[]`, CTAs con destinos esperados, CTA hover audit `failures=[]` en desktop/mobile, reduced-motion `transform:none`.
- Growth Form SEO v3 Playwright live: `.captures/task1343-seo-growth-form-v3-2026-07-07T01-35-20-839Z/`; desktop `1440` y mobile `390` `ok=true`, renderer mounted, 11 labels, 6 select triggers, first select opens, submit label `Solicitar diagnóstico SEO`, diagnostic CTAs all `href="#grader"`, old Think links `0`, no internal `Growth Forms`/`WordPress solo` copy, order `bridge -> grader -> faq`, Ohio widgets present, sticky CTA hidden at `#grader`, `scrollWidth==clientWidth`, console errors `[]`, request failures `[]`. Desktop confirma `Empresa` + `Sitio web a diagnosticar` en la misma fila (`sameRow=true`, `websiteFullWidthClass=false`) y `Rango de inversión mensual pensado` + `Cuándo quieres avanzar` en la misma fila; mobile `390` confirma `stacked=true`. El submit computa texto blanco sobre gradiente `#0264bd -> #0871c8 -> #075ba8`, `visibleCounters=0`, helpers de `fullName`/`companyName` presentes y `cmsPlatform` ausente.
- Growth Form section motion + dropdown overlay Playwright live: `.captures/task1343-seo-growth-form-motion-v1-2026-07-07T05-55-19-456Z/`; desktop `1440` y mobile `390` `ok=true`, marker `task-1343-seo-growth-form-motion-v1` presente, `sectionInView=true`, `formReady=true`, `hasOrbit=true`, `statusPillCount=3`, card overlay presente, card hover `matrix(..., -3)`, `cardFocusWithin=true`, renderer mounted, 11 labels, 6 selects, sticky hidden at grader, `scrollWidth==clientWidth`, consola/request failures limpios. Reduced-motion probe verde: `cardTransform=none`, `fieldAnimationName=none`, `overflow=0`. Dropdown probe verde: `mainGoal` abierto con `expanded=true`, `listVisible=true`, `fieldZIndex=90`, `listZIndex=120`, `topElementInList=true`, `selectedOptionColor=rgb(15, 33, 53)`. Capturas revisadas: `desktop-1440-grader.png`, `mobile-390-grader.png`, `desktop-1440-mainGoal-open-visible.png`.
- Growth Form sticky editorial lane Playwright live: `.captures/task1343-seo-growth-form-motion-v1-2026-07-07T06-39-59-496Z/`; desktop `1440` `homePatternClass=true`, `stickyPosition=true`, `stableWhileFormScrolls=true`, `stopsAtEnd=true`, `sectionAllowsSticky=true`, `scrollWidth==clientWidth`; mobile `390` `mobileStatic=true`, sin overflow, widgets Ohio preservados, motion/form/dropdowns/reduced-motion siguen verdes.
- Earlier Growth Form section motion Playwright live: `.captures/task1343-seo-growth-form-motion-v1-2026-07-07T05-34-40-531Z/`.
- Growth Form API smoke v3: GET render contract with `Origin: https://efeoncepro.com` returns `200` + CORS, slug `efeonce-seo-diagnostic`, version `3`, `styleVariant=diagnostic_premium`, `fieldCount=11`, `captcha=true`, surface `fhsf-48a4b95f-5f2a-453a-88d7-af3257e7c417`; `website` returns `type=text`, `inputMode=url`, `validator=url`, `maxLength=160`; `fullName.help` and `companyName.help` are present; `cmsPlatform` is absent; POST submit without Turnstile token returns `403` with `{"outcome":"captcha_failed","message":"missing_token"}`.
- HTTP: `/servicios/posicionamiento-seo/`, `/servicios/` y `/aeo-2/` responden `200`; el form público responde por `greenhouse.efeoncepro.com`.

Pendiente no bloqueante:

- Convertir `/servicios/` desde página mínima a hub editorial propio.
- Crear sibling `/servicios/aeo` + 301 desde `/aeo-2` cuando se ejecute la task correspondiente.
- HubSpot delivery para `efeonce-seo-diagnostic` sigue intencionalmente `disabled`; coordinar dispatcher/destination cutover antes de prometer entrega CRM desde este form.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (sibling `/servicios/aeo`, guía Think)

- [ ] La página quedó registrada en el route-ownership matrix y (si aplica) la nav del hub `/servicios`.

## Follow-ups

- Sibling `/servicios/aeo` + 301 `/aeo-2` → `/servicios/aeo` (task ui-ux aparte).
- Guía pillar "Visibilidad en búsqueda e IA" en Think (task de contenido aparte).
- Página índice del hub `/servicios` si requiere diseño propio.
- Conectar el diagnóstico del grader con el eje SEO cuando EPIC-022 lo habilite (Search Visibility 360).
- **Fase 2 internacional**: spoke localizada `en-US` ("seo agency"/"seo services", US 60.500 — mineado) con `hreflang` + localización real (no traducción máquina); FAQ inglés ya mineado en el wireframe. Brasil `pt-BR` fase posterior.

## Open Questions

- ¿El hub `/servicios` ya existe y en qué runtime (WordPress vs Astro)? Define nested + herramientas de build. Resolver en Slice 1 (crawl).
- ¿TASK-1335 (CORS surface-allowlist) ya cubre el origin `efeoncepro.com/servicios/*` para el `<greenhouse-form>`? Si no, el primer release usa fallback link y se agrega dependencia.
