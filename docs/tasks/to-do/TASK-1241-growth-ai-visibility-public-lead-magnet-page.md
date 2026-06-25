# TASK-1241 — Growth AI Visibility: Public Lead Magnet Page

## Delta 2026-06-25 — impacto de TASK-1251 (convergencia sobre el motor)

Cuando el flag `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED` esté ON (converge-before-launch), `POST /run` devuelve `submissionId` (no `runPublicId`) como handle de poll. La página debe leer `submissionId ?? runPublicId` del response y pollear vía TASK-1245 (que resuelve ambos). No asumir que el run existe inmediatamente tras el 202: en el path convergente el run se encola async (estado inicial `queued`). Follow-up posible: re-render del lead magnet vía el renderer portable del motor (TASK-1231) consumiendo el `render_contract` del grader-form gobernado (`fdef-ai-visibility-grader`) — fuera de scope de 1251.

## Delta 2026-06-25 — el renderer portable (TASK-1231) está listo para la convergencia

- TASK-1231 (renderer portable Growth Forms) está **code-complete**. El form de esta página puede dejar de ser hand-built y **re-renderizarse vía `<greenhouse-form>`** (heredando reintentos, consent snapshot, observabilidad `gh_form_*`, validación 3-stage y operabilidad por Nexa/MCP por construcción) — ese upgrade sería el **first migration de TASK-1232**.
- El `render_contract` ya soporta el intake del grader (§9.2: marca, sitio, país, industria, descripción, work email, consent). Pendiente upstream para la convergencia plena: un **campo/widget captcha embebible** (Turnstile) dentro del contract/renderer — hoy el captcha vive en el path público server-side (TASK-1240) + el widget client-side de esta página. Si se migra al renderer, declarar el captcha como parte del contrato o como slot del host wrapper.
- No bloquea esta task: 1241 puede shippear su form actual y converger después; la decisión de migrar es de TASK-1232.

## Delta 2026-06-25 — Cloudflare Turnstile keys provisionadas

- **Site key (PÚBLICA, va en el widget client-side de esta página):** `0x4AAAAAADqwX2R7v-k9pItv` (Cloudflare account `eb167eac6a06fa19932249325898a096`). Es pública por diseño (aparece en el HTML); úsala en el `data-sitekey` del widget Turnstile.
- **Secret key:** guardada en **GCP Secret Manager** `efeonce-group` como `greenhouse-turnstile-secret` (NO se commitea el valor). La consume TASK-1240 server-side.
- **Pendiente de rollout (TASK-1240):** el código de captcha lee `process.env.TURNSTILE_SECRET`. Al hacer el rollout staging, o bien (a) `vercel env add TURNSTILE_SECRET` con el valor del secret, o bien (b) wire de `TURNSTILE_SECRET_REF` al resolver canónico de secrets (+ grant `secretAccessor` a `greenhouse-portal@`). Decidir en el rollout.
- **Rotación:** ambas llaves se mostraron en chat → rotar cuando el operador lo indique (Turnstile permite re-ver/rotar; al rotar, agregar nueva versión a `greenhouse-turnstile-secret` + actualizar la Site key acá).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ui`
- Blocked by: `TASK-1239, TASK-1240, TASK-1245, TASK-1252`
- Branch: `task/TASK-1241-growth-ai-visibility-public-lead-magnet-page`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La **cara pública del lead magnet** (EPIC-020 C): landing + formulario de captura (§9.2 + consent + widget Turnstile) que postea a `POST /api/public/.../run` (TASK-1240), muestra los estados async honestos (§9.3) por poll, y **renderiza el `PublicGraderReport`** (snapshot por token, TASK-1239) — radar/bar viz-ready + table-fallback. Consume los endpoints públicos ya construidos; NO crea lógica de negocio (Full API parity: la UI es cliente del primitive).

## Delta 2026-06-25 — convergencia con el Growth Forms engine (TASK-1229/1231/1232)

Esta página construye su formulario de captura **a mano** (§9.2) y postea al intake a-medida del grader (`POST /run`, TASK-1240). El **Growth Forms engine** (TASK-1229) es el **motor gobernado** que da robustez y riqueza a *cualquier* formulario: contratos versionados, validación/policy compiler, consent snapshot, entrega con reintentos + dead-letter, abuse-guard/captcha, observabilidad y operabilidad por Nexa/MCP/CLI (Full API Parity). El form hand-built de esta página **no hereda nada de eso** — es la versión artesanal del mismo problema.

Decisión (no bloquear el lanzamiento de EPIC-020): **esta task ships con el form hand-built** — el motor aún es `to-do` y bloquearía el lanzamiento. Pero se **registra la convergencia** como un **upgrade** (no una deduplicación): llevar este form al motor lo vuelve robusto por construcción.

- El lead magnet de esta task es el **candidato natural a "primer form real"** que **TASK-1232** migra al motor (TASK-1232 ya recomienda "un lead magnet nuevo" como first migration, justamente para no chocar con el intake a-medida de TASK-1240).
- Cuando el motor esté estable, esta página debería **re-renderizar vía el renderer portable de TASK-1231** consumiendo el mismo `render_contract`, y su submit pasar al path gobernado del motor — heredando reintentos/consent/observabilidad/operabilidad que hoy no tiene. Hasta entonces, mantener el form hand-built **sin duplicar lógica de negocio** (Full API parity: sigue siendo cliente de los endpoints públicos).

## Why This Task Exists

El motor + el intake + el snapshot existen (TASK-1226…1240) pero **no hay dónde un prospecto los use**: sin la página, el lead magnet no capta. Esta es la superficie que convierte el contrato estructurado (DTO viz-ready, estados con razón+nextAction, disclaimer) en un producto visible y convertible. Es el primer consumer público de la parity.

## Goal

- Landing + formulario de captura (§9.2) con consent + Turnstile, baja fricción, accesible (WCAG 2.2 AA / EAA).
- Estados async honestos (§9.3: queued/running/partial/completed/review_required/failed) por poll, nunca un blanco.
- Render del `PublicGraderReport` (headline KPI, hallazgos, plan priorizado, tendencia, dimensiones viz-ready + table-fallback, disclaimer), enterprise-moderno, verificado con GVC.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §9 (public experience: flow/input/states/trust), §Delta TASK-1239/1240.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la UI es cliente del primitive, no una segunda implementación.
- `docs/architecture/ui-platform/*` — Composition Shell, primitives, estados (state-design), a11y.
- `DESIGN.md` — contrato visual agent-facing (tokens `theme.palette.*`/`theme.axis.*`, sin HEX/px inline).
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md` — dónde se hospeda la landing (coordinación, no duplicar).

Reglas obligatorias:

- La página NO contiene lógica de negocio: postea a `POST /api/public/.../run` y lee `GET /api/public/.../report/[token]`. Cero recomputo del reporte.
- Public-safe: sólo renderiza el `PublicGraderReport` (sin raw provider text); el disclaimer es campo del contrato.
- a11y WCAG 2.2 AA (lead magnet público, EAA en vigor): table-fallback de los charts (el DTO ya es estructurado), severidad nombrada (no color-only), labels plain-language.
- Copy es-CL en `src/lib/copy/*` (no inline); validar con `greenhouse-ux-writing`. GVC desktop+mobile en loop antes de "listo".

## Normative Docs

- `docs/tasks/complete/TASK-1240-growth-ai-visibility-public-run-intake-abuse-cost-controls.md` — endpoint POST + outcomes + Turnstile (site key).
- `docs/tasks/complete/TASK-1239-growth-ai-visibility-public-report-snapshot-token-reader.md` — endpoint GET por token + shape `PublicGraderReport`.
- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — el contrato del DTO público (headline/findings/dimensions/trend/disclaimer).
- Skill `seo-aeo` `efeonce/AI_VISIBILITY_GRADER.md` — naming + estructura de conversión.

## Dependencies & Impact

### Depends on

- `TASK-1240` (complete dev) — `POST /api/public/growth/ai-visibility/run` (flag `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED`).
- `TASK-1245` — `GET /api/public/growth/ai-visibility/run/[publicId]` + delivery de `reportToken` para poll.
- `TASK-1239` (complete dev) — `GET /api/public/growth/ai-visibility/report/[token]`.
- `TASK-1234` (complete) — el worker async ejecuta el run encolado.
- Turnstile **site key** (out-of-band) + el secret server-side (TASK-1240).

### Blocks / Impacts

- Cierra el flujo end-to-end del lead magnet (input → reporte) visible al prospecto.
- Coordina con EPIC-019 (hosting de landing) y EPIC-020 D (HubSpot recibe el lead).
- Candidato a **primer form real gobernado por el motor** (`TASK-1232` first migration) y primer consumer del **renderer portable** (`TASK-1231`) — migrarlo lo vuelve robusto por construcción; ver Delta de convergencia 2026-06-25.
- Comparte el `reportToken` con la **entrega por email** (`TASK-1250`): pantalla y email son dos consumers del mismo delivery state (`TASK-1245`).

### Files owned

- `src/app/(public)/...` o ruta pública del grader [verificar convención de ruta pública en el repo] — page + form + states + report render.
- `src/views/growth/public/**` — vistas del lead magnet (form, estados, reporte).
- `src/lib/copy/growth.ts` — copy visible de la página.
- `scripts/frontend/scenarios/**` — scenario GVC.

## Current Repo State

### Already exists

- Endpoints públicos `run` (POST) + `report/[token]` (GET) + el `PublicGraderReport` (estructurado, viz-ready, estados con razón).
- Charts ECharts (política canónica) + primitives UI + copy layer.
- Patrón de página pública: `src/app/api/public/**` (API) — falta la página visible.

### Gap

- No existe ninguna página/ruta pública visible del grader (todo es API).
- No hay form de captura, estados async, ni render del reporte público.
- No hay scenario GVC del lead magnet.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: prospecto público (no autenticado), marketing/decisor de una marca.
- Momento del flujo: descubrimiento (lead magnet) → entrega del diagnóstico.
- Resultado perceptible esperado: ingresa su marca + email, ve su reporte de visibilidad en IA, entiende su gap dominante y el próximo paso.
- Friccion que debe reducir: captura mínima + Turnstile invisible + resultado que se siente instantáneo (queued→poll→reporte).
- No-goals UX: análisis exhaustivo, login, dashboards internos.

### Surface & system decision

- Surface: ruta pública nueva (Next.js public route en greenhouse-eo, o WordPress/Kinsta — **Open Question**, ver abajo).
- Composition Shell: `aplica` — landing + form + report como regiones.
- Primitive decision: `reuse` — primitives Greenhouse + charts ECharts; `new` sólo si un patrón de "report público" no existe.
- Adaptive density / The Seam: `aplica` — el reporte nace adaptable a su ancho.
- Copy source: `src/lib/copy/growth.ts`.
- Access impact: `none` (público sin sesión; protegido por captcha + rate-limit del endpoint).

### Approved visual direction

- Product Design exploration approved by operator on 2026-06-25: **Answer Engine Signal Scan** as the base direction, incorporating the async stepper from **Guided Diagnostic Journey** and the "Qué recibes" proof block from **Report-First Lead Magnet**.
- Durable visual references:
  - Base target: `docs/assets/product-design/task-1241-ai-visibility-public-lead-magnet/answer-engine-signal-scan.png`
  - Async/state reference: `docs/assets/product-design/task-1241-ai-visibility-public-lead-magnet/guided-diagnostic-journey.png`
  - Output/proof reference: `docs/assets/product-design/task-1241-ai-visibility-public-lead-magnet/report-first-lead-magnet.png`
- Visual objective: public, conversion-focused, modern and premium; it should feel like an Efeonce public product experience backed by Greenhouse, not like an internal admin dashboard.
- First-screen hierarchy:
  - Full-bleed public hero with the offer/category as the H1: AI Visibility / answer-engine visibility diagnostic. Hero text overlays the visual scene directly, not inside a card.
  - Primary conversion surface visible in the first viewport: intake form for brand/site/market/category/work email/consent/Turnstile + CTA.
  - Trust microcopy near the form: sampled diagnostic, privacy/consent posture, no raw provider responses, no guaranteed rankings.
  - Hint of the next section visible on desktop/mobile: report preview with score, primary gap, dimensions and states.
- Async/state pattern from option 2:
  - Use a compact stepper/progress rail for `queued -> running -> report ready`; phase labels are public-safe and never provider-internal.
  - `review_required` maps to a neutral "revisión" state; do not expose internal review reasons.
- Output/proof pattern from option 3:
  - Include a below-fold "Qué recibes" section showing report output, email delivery/link tokenizado and public-safe attachment expectation (TASK-1250 consumer), without making this UI responsible for email dispatch.
  - Show value through the report artifact early enough to sell the exchange of email for report.
- Avoided directions:
  - No generic SaaS dashboard hero, no centered app-card-on-background, no split text/media hero, no nested card stack.
  - No provider logos unless legal/provider terms explicitly allow them.
  - No raw evidence, no "secret data found" framing, no guaranteed AI ranking claims.
  - No Turnstile/reCAPTCHA ambiguity in implementation: visual placeholder must map to Cloudflare Turnstile.

### State inventory

- Default: landing + form.
- Loading: enviando (Turnstile + POST).
- Empty: N/A (form siempre presente).
- Error: `invalid`/`captcha_failed`/`rate_limited`/`cost_blocked`/`disabled` (mapear los outcomes del endpoint a estados con copy es-CL).
- Degraded / partial: reporte `partial` (algunos motores faltaron) con disclosure honesto.
- Permission denied: N/A (público).
- Long content: reporte largo → scroll + table-fallback.
- Mobile / compact: 390px sin scroll horizontal.
- Keyboard / focus: form accesible, focus visible, errores anunciados (aria-live).
- Reduced motion: animación del KPI/charts con fallback.

### Interaction contract

- Primary interaction: enviar el form → poll del run → mostrar reporte por token.
- Hover / focus / active: estados de los campos + CTA.
- Pending / disabled: CTA disabled durante el POST + spinner con copy.
- Escape / click-away: N/A (página, no modal).
- Focus restore: al pasar de form a resultado, mover foco al headline.
- Latency feedback: estados queued/running con progreso por fase (no internals de provider).
- Toast / alert behavior: errores inline (no toasts efímeros para errores de captura).

### Motion & microinteractions

- Motion primitive: `Motion`/`CSS` para la entrada del reporte + conteo del KPI.
- Enter / exit: transición form→reporte.
- Timing / easing token: tokens de motion del design system.
- Reduced-motion fallback: sin animación, valor final directo.
- Non-goal motion: nada que retrase la lectura del diagnóstico.

### Visual verification

- GVC scenario: `growth-public-lead-magnet` (form + estado running + reporte).
- Viewports: desktop + 390px.
- Required captures: form, estado async, reporte completo.
- Required `data-capture` markers: `data-capture="public-grader-form"` / `…-report`.
- Scroll-width check: `scrollWidth==clientWidth` en desktop + 390px.
- Accessibility/focus checks: axe + focus order + table-fallback de charts.
- Before/after evidence: N/A (página nueva).
- Known visual debt: declarar si el hosting WordPress limita primitives.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Form de captura + Turnstile + POST

- Landing + form (§9.2: marca, sitio, país/mercado, industria/categoría, descripción, email, consent; opcionales) con validación + widget Turnstile (site key).
- POST a `/api/public/.../run`; mapear outcomes (202/400/403/429/503/404) a estados con copy es-CL. Copy en `src/lib/copy/growth.ts`.
- Implementar la dirección aprobada **Answer Engine Signal Scan**:
  - hero público full-bleed con H1/offer y form visible en el primer viewport;
  - form integrado al flujo de la página, no app-card aislada;
  - trust/consent/Turnstile visibles y legibles sin fricción excesiva.

### Slice 2 — Estados async (poll) + render del reporte

- Poll del estado del run (queued/running/partial/completed/review_required/failed, §9.3) sin internals de provider.
- Al completar: leer el snapshot por token y renderizar el `PublicGraderReport` (headline KPI, 3-5 hallazgos, plan priorizado, tendencia, dimensiones viz-ready + **table-fallback**, disclaimer). Charts ECharts.
- Incorporar el stepper de estados de **Guided Diagnostic Journey** y el bloque "Qué recibes" de **Report-First Lead Magnet**.
- El report preview debe vender el valor del diagnóstico, pero el reporte completo sigue leyendo exclusivamente `PublicGraderReport`.

### Slice 3 — a11y + GVC + pulido enterprise

- WCAG 2.2 AA (table-fallback, severidad nombrada, aria-live, focus); reduced-motion.
- GVC desktop+mobile en loop hasta enterprise-moderno; `scrollWidth==clientWidth`.

## Out of Scope

- Backend del intake/snapshot (TASK-1239/1240 ya hechos).
- HubSpot handoff (EPIC-020 D / TASK-1242).
- Portal cliente / admin review (E/F).
- Tokenización/branding fino más allá del design system.

## Detailed Spec

La página es **cliente puro** de los endpoints públicos: form → `POST /run` (Turnstile + consent) → recibe `runPublicId` → poll del estado → al completar, snapshot por token → render del `PublicGraderReport`. El DTO ya viene estructurado para derivar table-fallback + texto alternativo sin recomputar (TASK-1235 P-6). Toda decisión de render (radar vs bar, layout, tokens) sigue el design system + GVC. El hosting (Next.js vs WordPress/Kinsta) se decide en Discovery con EPIC-019.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (form + POST) → Slice 2 (estados + reporte) → Slice 3 (a11y + GVC). El render del reporte (2) depende del form que genera el run (1).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Charts sin table-fallback → falla a11y/EAA | a11y/legal | medium | DTO ya estructurado → derivar tabla; axe en GVC | axe/GVC |
| La página recomputa o expone raw | privacy | low | cliente puro de los endpoints públicos (DTO public-safe) | code review |
| Estados async opacos (blanco mientras corre) | UX | medium | estados §9.3 con copy + progreso por fase | GVC estado running |
| Scroll horizontal / no responsive | UX | medium | `scrollWidth==clientWidth` check desktop+390px | GVC |

### Feature flags / cutover

- La página consume el endpoint gateado por `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` (default OFF). Sin flag ON, el form recibe `disabled` (404) → estado "no disponible". Cutover = flag ON (rollout de TASK-1240).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (página/form) | <10 min | si |
| Slice 2 | revert PR (estados/reporte) | <10 min | si |
| Slice 3 | revert PR (a11y/pulido) | <5 min | si |

### Production verification sequence

1. Slices en staging con flag ON: enviar form real → captcha → estado async → reporte por token.
2. GVC desktop+mobile mirado (enterprise) + axe verde + `scrollWidth==clientWidth`.
3. Prod: junto con el rollout de TASK-1240 (sign-off legal + secret captcha) vía release control plane.

### Out-of-band coordination required

- Turnstile **site key** (par del secret de TASK-1240).
- Decisión de hosting (Next.js vs WordPress/Kinsta, EPIC-019).
- Sign-off legal del consent/privacidad (compartido con TASK-1240).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: flow`.
- [ ] Form §9.2 + consent + Turnstile postea a `/api/public/.../run`; outcomes mapeados a estados con copy es-CL en `src/lib/copy/*`.
- [ ] La implementación sigue la dirección visual aprobada: **Answer Engine Signal Scan** como base + async stepper de **Guided Diagnostic Journey** + bloque "Qué recibes" de **Report-First Lead Magnet**.
- [ ] Estados async honestos (§9.3) por poll, nunca un blanco; reporte `partial` con disclosure.
- [ ] Render del `PublicGraderReport` (headline/hallazgos/plan/tendencia/dimensiones + **table-fallback** + disclaimer); cliente puro (sin recomputo ni raw).
- [ ] WCAG 2.2 AA: table-fallback, severidad nombrada, aria-live, focus; reduced-motion.
- [ ] GVC desktop+mobile capturado y mirado (enterprise); `scrollWidth==clientWidth` desktop+390px.
- [ ] Primitive decision declarada (reuse/extend/new); copy reusable en `src/lib/copy/*`.

## Verification

- `pnpm local:check:ui`
- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm fe:capture growth-public-lead-magnet --env=staging` (desktop+mobile) + dossier mirado
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] doc funcional + manual (cómo se ve / cómo se opera el lead magnet) + arch `## Delta` si cambia contrato
- [ ] `route-reachability-manifest` si aplica + `EPIC-020` Child Task C
- [ ] chequeo de impacto cruzado (TASK-1239/1240/1242 + EPIC-019)

## Follow-ups

- Branding/animación viva (Nexa mascot) si el lead magnet lo amerita.
- Variantes de copy A/B para conversión (con measurement, skill `seo-aeo` §07).

## Open Questions

1. **¿Dónde se hospeda la página?** Next.js public route en greenhouse-eo (más simple, reusa primitives + endpoints) vs WordPress/Kinsta (sitio marketing, EPIC-019). Decidir en Discovery con EPIC-019 (la decisión Astro/Next/WordPress del arch sigue abierta).
2. ¿El flujo muestra el reporte inline tras el poll, o envía el link del snapshot por email (o ambos)? V1 sugerido: inline + email. **La entrega por email (cuerpo breve + link tokenizado + adjunto public-safe) la implementa `TASK-1250`** (consumer del mismo delivery state de `TASK-1245`); esta página es el consumer en pantalla. Ambos comparten el `reportToken`.
