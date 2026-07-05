# TASK-1343 — Landing pública de servicio SEO (`/servicios/posicionamiento-seo`)

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
- Wireframe: `docs/ui/wireframes/TASK-1343-servicios-posicionamiento-seo-landing.md`
- Flow: `docs/ui/flows/TASK-1343-servicios-posicionamiento-seo-landing-flow.md`
- Motion: `docs/ui/motion/TASK-1343-servicios-posicionamiento-seo-landing-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: `none`
- Branch: `task/TASK-1343-servicios-posicionamiento-seo-landing`

## Summary

Construye la landing pública de servicio SEO `/servicios/posicionamiento-seo` en el sitio de Efeonce: una spoke de conversión (mid/bottom-funnel) que captura la búsqueda comercial ("agencia seo"/"posicionamiento web"), presenta el método sin caer en commodity, y entrega al usuario al nodo grader existente. Reusa el `<greenhouse-form>` gobernado y el grader en `think.efeoncepro.com` — no construye backend nuevo. Deriva de PDR-001/002/003.

## Why This Task Exists

Hoy el sitio público solo tiene `/aeo-2` (servicio AEO, el filo) y no captura la demanda SEO comercial, que es mucho mayor (Semrush CL: "agencia seo" 880/mes, "posicionamiento web" 390, "seo" 2.900). Sin una landing SEO, Efeonce cede tráfico transaccional de alta intención y deja su posicionamiento solo en el nicho AEO. PDR-001 decidió crear esta spoke como el **cimiento** (no commodity); PDR-002 cerró la IA (hub `/servicios` + slug `posicionamiento-seo`, data-backed) y PDR-003 la ubicó en la capa de adquisición del ecosistema. Falta materializar la página.

## Goal

- Publicar `/servicios/posicionamiento-seo` con el blueprint aprobado (hero outcome+mecanismo, stakes, 3 pilares como answer capsules, prueba, puente AEO, sección grader, cómo trabajamos, FAQ, CTA final).
- Capturar la keyword comercial (H1/title "posicionamiento SEO", copy trabaja "agencia seo") y ser citable por motores de respuesta (answer capsules + JSON-LD Service/Organization/FAQPage/BreadcrumbList).
- Entregar al usuario al nodo grader existente (embed `<greenhouse-form>` o link a Think) sin reconstruir el pipeline, con fallback honesto.

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
- Voz: mecanicista, tuteo es-CL, sin "soluciones integrales"/superlativos/promesa-sin-mecanismo; sin manzanitas 🍏 (marca personal de Julio).
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
- Degraded / partial: embed no carga (JS off/bloqueado) → fallback link directo al grader en Think (CTA nunca muere).
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

- `pnpm task:lint --task TASK-1343`
- `pnpm ui:wireframe-check --task TASK-1343`
- `pnpm ui:flow-check --task TASK-1343`
- `pnpm ui:motion-check --task TASK-1343`
- `pnpm fe:capture public-servicios-posicionamiento-seo --env=<preview> --gif` (desktop + mobile + reduced-motion)
- Google Rich Results Test (JSON-LD) + Search Console (indexación) sobre la URL productiva
- Validación manual del embed del form (submit real de prueba) o del fallback link

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

## Open Questions

- ¿El hub `/servicios` ya existe y en qué runtime (WordPress vs Astro)? Define nested + herramientas de build. Resolver en Slice 1 (crawl).
- ¿TASK-1335 (CORS surface-allowlist) ya cubre el origin `efeoncepro.com/servicios/*` para el `<greenhouse-form>`? Si no, el primer release usa fallback link y se agrega dependencia.
