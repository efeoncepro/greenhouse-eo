# TASK-1320 — Growth Forms Success Card — Renderer (ui-ux)

## Delta 2026-07-02 — bloqueante TASK-1319 resuelto (contrato listo)

TASK-1319 quedó **complete**: el contrato ya expone la success-card metadata en código.
Disponible para consumir:
- SoT `successBehaviorSchema` (`contracts.ts`): `presentation` (`inline_message|success_card`), `title`/`titleCopyRef`, `body`/`bodyCopyRef`, `steps[]` (≤4), `reward` (`SUCCESS_REWARD_KINDS`), `actions[]` (≤2, `SUCCESS_ACTION_KINDS`), `supportingNote`. `href` allowlisted (https/same-origin, rechaza `javascript:`/`data:`/non-https).
- Espejo de tipos `RendererSuccessBehavior` (`src/growth-forms-renderer/contract.ts`) con los sub-tipos `RendererSuccessCard{Action,Reward,Step}` — el renderer los consume tipados.
- Telemetría lista: `gh_form_success_viewed`/`gh_form_success_action_clicked` en `RENDERER_GTM_EVENTS`; `action_kind`/`reward_kind` en `RENDERER_ALLOWED_PAYLOAD_KEYS`. Slice 4 solo agrega los `telemetry.emit(...)` en `renderer.ts`.
- Activation script + extensión de `verify-aeo-public-api-contract` **se movieron a esta task** (Files owned / Slice 5).

## Delta 2026-07-02 — code complete, rollout/cutover pendiente

Codex implementó la mitad visible del split consumiendo el contrato de TASK-1319, sin tocar schema/compiler/backend ownership:

- Renderer: `presentation='success_card'` reemplaza el form tras `accepted` por una card estructurada (`growth-form-success-card`) con título/body, steps, reward/action opcional, support note, foco al contenedor, `role=status`, `aria-live=polite`, redirect legacy preservado y sin echo de PII/submission/destination internals.
- Copy/CSS: fallbacks es-CL/en-US `accepted`-only + estilos renderer-scoped `ghf-success-card`, responsive/mobile 390, hostile-host hardening para CTAs y motion CSS con reduced-motion heredado.
- Telemetry: `gh_form_success_viewed`, `gh_form_success_action_clicked` y `gh_form_asset_accessed` se emiten con payload allowlisted (`success_behavior`, `action_kind`, `reward_kind`) y tests que afirman que no viajan field values ni `submissionId`.
- Verificación UI local: preview interno `success_card` + scenario GVC `growth-forms-success-card` desktop/mobile 390 verde en `.captures/2026-07-02T19-24-33_growth-forms-success-card` (6 frames, assertions pass, `qualityFindings: []`).
- Cutover guard: `pnpm growth:forms:activate-aeo-success-card -- --apply` falla antes de mutar DB si `origin/main` todavía no contiene el renderer (`buildSuccessCard`, CSS `ghf-success-card`, copy `successCardTitle`). Resultado esperado actual: **rollout pendiente** hasta promover el runtime.
- Contrato público actual: `pnpm public-website:verify-aeo-public-api-contract` sigue verde con AEO v8 y `successBehavior.presentation='inline_message'`; el modo estricto `--expect-success-card` queda listo para post-cutover.
- QA/release posture: `pnpm public-website:verify-aeo-live-contract` verde confirma que producción actual sigue sana sin activar la card. `pnpm qa:gates --changed --agent codex --task TASK-1320 --ui --runtime --api --integration --production --docs` clasifica el cierre como UI/runtime/integration/production con release pendiente; verdict humano = **CONDITIONAL PASS / code complete, rollout pendiente**.

Estado honesto: **code complete; task permanece `in-progress`** porque AEO no debe publicar `success_card` hasta que el renderer esté released en producción y el activation guard pase sin override.

## Delta 2026-07-02 — motion polish "wow sobrio"

Por pedido del operador, la Success Card sube de V1 profesional a una microinteracción más premium, manteniendo el contrato portable del renderer:

- Card settle CSS-only con ligera escala/blur de entrada, highlight superior y aura decorativa scoped.
- Status mark con check + ring pulse de confirmación; el significado sigue siendo texto-first y `role=status`.
- Contenido entra por capas dentro de un presupuesto corto; el CTA no queda bloqueado por una espera teatral.
- CTA/reward action agrega hover/press affordance; reward conserva accent rail discreto.
- `prefers-reduced-motion` ahora elimina duración **y delays**, para que la card aparezca completa al instante.

Evidencia actualizada: `pnpm fe:capture growth-forms-success-card --env=local` verde en `.captures/2026-07-02T20-18-33_growth-forms-success-card` (desktop + mobile 390, 6 frames, assertions pass). Nota: el entorno dev reporta `runtime_hydration_warning` best-effort en la ruta preview; no hay layout findings y el frame mobile fue revisado visualmente para asegurar contenido completo.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1320-growth-forms-success-card-renderer.md`
- Flow: `docs/ui/flows/TASK-1320-growth-forms-success-card-renderer-flow.md`
- Motion: `docs/ui/motion/TASK-1320-growth-forms-success-card-renderer-motion.md`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Code complete, rollout pendiente`
- Rank: `TBD`
- Domain: `growth|public-site|forms|ui`
- Blocked by: `none`
- Branch: `develop` (por instruccion explicita del operador)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Renderizar la **Success / Thank You Card** in-card del renderer portable de Growth Forms, consumiendo la success-card metadata que TASK-1319 expone en el `RenderContract`. Reemplazar el `div.ghf-status--success` plano por una card enterprise (status mark, titulo, body, siguientes pasos, reward/CTA opcional, support note) con foco, accesibilidad, estados, reduced-motion y estilos tokenizados. Cierra el loop visible con AEO `/aeo-2/` como primer consumidor (GVC + cutover), sin Thank You page ni script host-specific.

## Why This Task Exists

Es la mitad **visible** de la Success Card Capability. TASK-1319 entrega el contrato de datos (schema + compiler + telemetry allowlist + activation primitive); esta task lo consume y lo pinta. Split canonico "backend-data foundation → ui-ux consumer": el renderer DOM, estilos, motion, copy fallback, GVC y el cutover AEO son responsabilidad de presentacion y no deben mezclarse con el contrato.

Hoy `renderSuccess()` (`src/growth-forms-renderer/renderer.ts:1646`) borra el root y pinta un status simple. Eso no estructura siguientes pasos, no permite reward/CTA gobernada y desperdicia el pico de intencion post-submit (borde de activacion, lente CRO).

## Goal

- Reemplazar el success path simple por una Success Card estructurada que elige entre inline message legacy y presentacion `success_card` segun el contrato.
- Renderer-scoped CSS tokenizado (`ghf-success-card`) + transicion CSS-only + reduced-motion fallback, sin overflow a mobile 390.
- Mover el foco al contenedor de la card (`role=status`) tras `accepted`; CTAs nativos alcanzables.
- Emitir la telemetria de la card (`gh_form_success_viewed` / `gh_form_success_action_clicked`) usando los enums/allowlist definidos en TASK-1319.
- Cerrar con AEO `/aeo-2/`: publicar la version success-card (via el script de TASK-1319) tras renderer live + GVC desktop/mobile + live verifier.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/MOTION.md`

Reglas obligatorias:

- El renderer portable NUNCA depende de React/Next.js/WordPress globals/HubSpot scripts/GSAP/librerias de motion host-specific.
- El renderer NUNCA dibuja el chrome de la card del host ni un heading `h1`; el host es dueño de titulo/subtitulo/trust. `renderSuccess()` limpia solo el root del renderer, no el chrome del host — ver `## Host chrome & heading contract`.
- El browser nunca recibe HubSpot internals, destination mapping, URLs privadas sin allowlist, PII de submission ni dispatcher state. La success-card metadata ya viene browser-safe desde TASK-1319.
- El success card confirma `accepted`, no `delivered`/reporte generado.
- Toda accion/reward visible viene del contrato browser-safe (allowlist de TASK-1319); telemetry allowlisted sin field values.
- Contra hosts hostiles (Ohio/Elementor), fixear el renderer o el fixture compartido, NO parchar AEO CSS (leccion TASK-1298).

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`
- `.codex/skills/greenhouse-growth-forms/SKILL.md`
- `.codex/skills/modern-web-guidance/SKILL.md`
- `.codex/skills/greenhouse-product-ui-architect/SKILL.md`
- `.codex/skills/greenhouse-ux-content-accessibility/SKILL.md`

## Dependencies & Impact

### Depends on

- **TASK-1319** (contract + compiler + telemetry allowlist + activation primitive) — BLOQUEANTE. El renderer no puede leer ni emitir metadata que el contrato no expone.
- Renderer actual: `src/growth-forms-renderer/renderer.ts`, `styles.ts`, `copy.ts`, `contract.ts` (espejo de tipos, ya extendido por TASK-1319), `telemetry.ts` (constantes ya extendidas por TASK-1319).
- Verificador live: `scripts/public-website/verify-aeo-live-contract.ts`.

### Blocks / Impacts

- AEO `/aeo-2/` conversion card thank-you UX.
- Future lead magnets / gated resources con reward/download post-submit.
- Future Astro public site Growth Forms embeds.

### Files owned

- `src/growth-forms-renderer/renderer.ts` (renderSuccess → success card DOM + emit calls + focus)
- `src/growth-forms-renderer/styles.ts`
- `src/growth-forms-renderer/copy.ts` (fallback success card strings)
- `src/growth-forms-renderer/__tests__/renderer.test.ts`
- `scripts/frontend/scenarios/growth-forms-success-card.scenario.ts` (nuevo)
- `scripts/public-website/verify-aeo-live-contract.ts`
- `scripts/growth/activate-aeo-success-card-contract.ts` (nuevo, idempotente dry-run + runtime-guard; movido desde TASK-1319 en su Delta 2026-07-02)
- `scripts/public-website/verify-aeo-public-api-contract.ts` (extension: afirmar la success-card metadata en el GET tras el cutover)
- `docs/ui/wireframes/TASK-1320-growth-forms-success-card-renderer.md`
- `docs/ui/flows/TASK-1320-growth-forms-success-card-renderer-flow.md`
- `docs/ui/motion/TASK-1320-growth-forms-success-card-renderer-motion.md`

NO owned (son de TASK-1319): `contracts.ts`, `policy-compiler.ts`, `contract.ts`, las constantes de `telemetry.ts`, el activation script.

## Current Repo State

### Already exists

- `renderSuccess()` reemplaza el root y pinta `div.ghf-status.ghf-status--success` con `role=status`, `aria-live=polite`, `tabindex=-1`, y le da foco.
- Redirect ya soportado: `kind='redirect'` + `redirectUrl` → `window.location.assign` + `gh_form_asset_accessed`.
- Tokens `--ghf-*` en `styles.ts` (incluye `--ghf-success`, radius, gap, focus, shadows).
- `resolveSystemCopy()` en `copy.ts` con `successFallback` es-CL/en-US.
- AEO `/aeo-2/` live en el renderer premium (`styleVariant=diagnostic_premium`) tras TASK-1298.

### Gap (post TASK-1319)

- El renderer no lee ni pinta `presentation='success_card'` ni title/body/steps/reward/actions/supportingNote.
- No hay CSS `ghf-success-card` ni transicion/reduced-motion para la card.
- No hay fallback de copy es-CL para la success card estructurada.
- No se emiten `gh_form_success_viewed`/`gh_form_success_action_clicked`.
- No hay scenario GVC ni assertion de calidad de success card.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: visitante publico / lead que completa un Growth Form.
- Momento del flujo: inmediatamente despues de que el submit devuelve `accepted`.
- Resultado perceptible esperado: la misma card del form se vuelve una superficie de confirmacion pulida con siguientes pasos y accion/reward opcional.
- Friccion que debe reducir: incertidumbre post-submit, mensaje generico debil, thank-you host-specific, y oportunidad perdida de ofrecer una accion util.
- No-goals UX: Thank You page, confetti, modal host, toast generico, PII echo, over-promising downstream.

### Surface & system decision

- Surface: renderer portable de Growth Forms dentro de `<greenhouse-form>` en WordPress/Astro/Next.js.
- Composition Shell: `no aplica` — es un estado del renderer portable dentro de una card host, no una ruta/pantalla del portal.
- Primitive decision: `extend` — extender el estado success/status del renderer en una presentacion `success-card`.
- Adaptive density / The Seam: `aplica parcialmente` — la card adapta al ancho del host via CSS del renderer y evita overflow a 390; NO importar `card-density` del portal al renderer.
- Floating/Sidecar/Dialog decision: N/A.
- Copy source: `success_behavior_json` + `copy_refs_json` + fallback `src/growth-forms-renderer/copy.ts`.
- Access impact: `none` para acceso a ruta del portal; la autorizacion del host publico sigue con surface/CORS/embed/captcha.

### State inventory

- Default: success card accepted con titulo, body y siguientes pasos opcionales.
- Loading: estado pending del submit existente antes del success.
- Empty: N/A; la success card requiere submission accepted.
- Error: estados invalid/rejected/captcha/rate-limited existentes; sin success card en fallo.
- Degraded / partial: reward/accion no disponible/expirado/no configurado → mostrar confirmacion accepted y omitir/explicar el reward sin fallar el submit.
- Permission denied: copy disabled/surface unauthorized existente.
- Long content: clamp/cap de body/steps/actions por schema; sin rich HTML ilimitado.
- Mobile / compact: single-column, sin scroll horizontal, CTAs wrap limpio.
- Keyboard / focus: foco al contenedor de la card; CTAs nativos alcanzables.
- Reduced motion: swap de contenido inmediato con significado identico.

### Interaction contract

- Primary interaction: submit accepted → el renderer reemplaza los controles del form por la success card.
- Hover / focus / active: estados de CTA con affordances tokenizadas existentes del renderer.
- Pending / disabled: el submit queda disabled solo tras click valido; las acciones success se habilitan solo con URLs/kinds safe del contrato.
- Escape / click-away: N/A; no es modal.
- Focus restore: N/A; los controles del form se reemplazan intencionalmente tras accepted.
- Latency feedback: estado pending del submit existente antes de accepted.
- Toast / alert behavior: sin toast; la success card es el feedback in-card persistente.

### Motion & microinteractions

- Motion primitive: `CSS` (ver motion contract).
- Enter / exit: transicion corta form→card scoped al root del renderer.
- Layout morph: none; sin medicion de altura ni view transition de ruta.
- Stagger: none por default; sin CTA diferido.
- Timing / easing token: 160-220ms ease-out equivalente en CSS del renderer.
- Reduced-motion fallback: reemplazo inmediato, sin transform, foco igual se mueve.
- Non-goal motion: confetti, espectaculo celebratorio, scroll-driven, GSAP/Lottie.

### Implementation mapping

- Route / surface: renderer `<greenhouse-form>`; primer consumidor publico `/aeo-2/`.
- Primitive / variant / kind: estado success de Growth Forms `presentation: success_card`.
- Component candidates: `renderer.ts` (metodo success + emit + focus), `styles.ts` (CSS), `copy.ts` (fallback).
- Copy source: `success_behavior_json` + `copy_refs_json`; fallback locale solo para defaults genericos.
- Data reader / command: render contract publicado (reader) + submit command publico; el renderer no tiene logica de negocio propia.
- API parity: el contrato ya expone la success-card metadata (TASK-1319); el submit sigue siendo el primitive de acceptance.
- Access / capability: autorizacion de surface publica existente; sin capability admin nueva salvo authoring futuro.
- States to implement: success card accepted, reward present, reward omitido/degradado, redirect backward-compat, reduced-motion, focus.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-forms-success-card.ts` o extension del AEO live verifier.
- Route: `/aeo-2/` + fixture/preview para variante reward si esta disponible.
- Viewports: desktop 1440/2048 y mobile 390.
- Required steps: llenar form valido, submit por el path canonico/harness, esperar accepted, afirmar success card.
- Required captures: `before-submit`, `after-success`, reward variant si existe, mobile 390, `after-success-reduced-motion`.
- Required `data-capture` markers: `growth-form-success-card`, `growth-form-success-reward`, `growth-form-success-actions`.
- Assertions: sin legacy bottom-only, sin PII echo, sin submission id crudo, sin field values, sin scroll horizontal, foco valido.
- Scroll-width checks: desktop y mobile 390 `scrollWidth <= clientWidth`.
- Reduced-motion / focus evidence: success card visible de inmediato y foco en el contenedor.

### Design decision log

- Decision: construir la Success Card in-card reusable dentro del renderer de Growth Forms, gobernada por `success_behavior_json` (contrato de TASK-1319).
- Alternatives considered: Thank You page, bloque WordPress-local, success message HubSpot, toast, alert generico, modal.
- Why this pattern: portable, accesible, medible, sin host drift, sin destination leakage, soporta lead magnets/rewards futuros.
- Reuse / extend / new primitive: extender el estado success del renderer; sin import de primitives del portal al renderer.
- Open risks: seguridad de asset/reward (mitigado por allowlist de TASK-1319), copy over-promising, interferencia CSS del host, layout jump mobile, focus hijack.

### Visual verification

- GVC scenario: `growth-forms-success-card` o extension del AEO verifier.
- Viewports: desktop y mobile 390.
- Required captures: pre-submit form card, success card, reward variant, reduced-motion.
- Required `data-capture` markers: `growth-form-success-card`, `growth-form-success-reward`, `growth-form-success-actions`.
- Scroll-width check: obligatorio desktop y mobile.
- Accessibility/focus checks: active element = contenedor de la card + semantica de status.
- Before/after evidence: comparar contra el `ghf-status--success` actual.
- Known visual debt: capas CSS hostiles del host pueden requerir hardening a nivel renderer; fixear en el renderer, no en AEO CSS.

## Host chrome & heading contract (frontera dura del renderer)

El renderer NUNCA dibuja el chrome de la card del host ni un heading `h1`-`h6`: el host es dueño de titulo/subtitulo/trust. `renderSuccess()` hace `root.replaceChildren()`, que limpia SOLO el root del renderer, NO el chrome que lo rodea. Por lo tanto, tras `accepted`, el titulo del host (p. ej. AEO "Diagnostica tu visibilidad en IA") queda visible ARRIBA de la success card. Decisiones a honrar:

- La success card es autocontenida dentro del root y comunica estado con titulo/body/forma de icono + `role=status`; NO asume que el host oculto su chrome.
- Para que un host reemplace su chrome en success SIN meter logica en el renderer, apalancar el `CustomEvent gh_form_submission_accepted` ya emitido (composed+bubbles). Un host que quiera neutralizar su titulo se suscribe a ese evento — mantiene Full API Parity.
- Nivel de heading: la card NO inyecta `h1`; si renderiza heading, usar nivel interno seguro (`h3` default), nunca un heading falso/solo-ARIA. Para AEO, confirmar en Discovery que titulo del host + titulo de la card no lean como dos headings compitiendo; si compiten, preferir titulo de estado NO-heading dentro de la card, o documentar el swap de chrome del host via el evento `accepted`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Renderer success card presentation

- Reemplazar el success path simple por un metodo que elige entre inline message legacy y presentacion success card segun el contrato.
- Renderizar una card estructurada: status mark, titulo, body, siguientes pasos, reward opcional, action row opcional, support note.
- `data-capture` markers para success card, reward y actions.
- Mover el foco al contenedor de la success card tras accepted.
- Nunca renderizar field values, PII, submission id crudo, HubSpot internals ni destination state.
- Preservar el comportamiento redirect para contratos redirect existentes.

### Slice 2 — Copy fallback (renderer system copy)

- Extender `RendererSystemCopy` + tablas es-CL/en-US en `copy.ts` con los defaults genericos de la success card (titulo/body/steps).
- Copy `accepted`-only: NO "te contactaremos"/"enviado a HubSpot"/"reporte generado"/timing salvo que el contrato lo pruebe. Validar tono con `greenhouse-ux-content-accessibility` (es-CL tuteo).
- El copy autorado por form vive en el contrato (`copy_refs_json`); el fallback es solo para defaults.

### Slice 3 — Styling, motion y reduced motion

- CSS tokenizado del renderer para `ghf-success-card` y sub-elementos (typography/spacing/radius/color desde tokens `--ghf-*`, no hex host).
- Transicion CSS-only por el motion contract (160-220ms, opacity+transform).
- Fallback `prefers-reduced-motion`.
- Verificar mobile 390 sin overflow horizontal ni CTA clipeado; hostile-host hardening scoped (leccion TASK-1298), sin parchar AEO CSS.

### Slice 4 — Telemetry emit

- Emitir `gh_form_success_viewed` al pintar la card y `gh_form_success_action_clicked` al clickear una accion/reward, con `action_kind`/`reward_kind` (enums/allowlist de TASK-1319).
- Sin field values ni PII (la allowlist ya lo garantiza; agregar test de emit que lo afirme).

### Slice 5 — GVC + AEO first-consumer cutover

- Scenario GVC / extension del live verifier para los estados de success card (default, reward, mobile, reduced-motion).
- Crear el activation script idempotente dry-run-default (publish de una version success-card por `form_key`, runtime-guard estilo TASK-1318) + extender `verify-aeo-public-api-contract` para afirmar la metadata en el GET (movidos desde TASK-1319 en su Delta 2026-07-02).
- Publicar la version AEO success-card (`--apply`) SOLO tras renderer live (runtime guard).
- Preservar fields AEO, validation, Turnstile, destination mapping, namePolicy y consent.
- Correr `pnpm public-website:verify-aeo-live-contract` + GVC desktop/mobile 390 mirados.

## Out of Scope

- El contrato/schema/compiler/telemetry constants/activation primitive — TASK-1319.
- Thank You page separada; DAM/file hosting; admin UI de authoring; tokenized/personalized report; echo de valores.
- Cambiar fields AEO, mapping HubSpot o name split de TASK-1318.
- Reward con URL privada directa sin modelo token/asset gobernado.

## Detailed Spec

### Rendering rules

- `presentation='success_card'` (o presencia de `title`/`steps`/`reward` segun se resuelva en TASK-1319) elige la card; `inline_message` sin presentacion mantiene el status simple actual.
- `kind='redirect'` + `redirectUrl` sigue navegando (backward-compat), sin card.
- Bounded: max 4 steps, max 2 actions, max 1 reward (el contrato ya lo acota; el renderer no debe asumir mas).
- `target="_blank"` renderiza `rel="noopener noreferrer"`.

### Copy principles

- "Recibimos..." / "Quedo registrado..." para el estado accepted. Reward copy generoso pero sin dark pattern ("Te dejamos un recurso para empezar"). Para AEO, card concisa y premium; sin reintroducir un H3 de titulo del form arriba de los fields.
- Recomendacion CRO/commercial (Open Question resuelta en TASK-1319): AEO V1 = UN solo proximo paso (CTA agenda), no menu; degradar a next-steps sin CTA si no hay infra de agenda estable.

### Telemetry principles

- Emitir solo eventos allowlisted (`gh_form_success_viewed`, `gh_form_success_action_clicked`, `gh_form_asset_accessed`) con payloads allowlisted (`success_behavior`, `action_kind`, `reward_kind`, `form_key`, `surface_id`, `form_version_id`). Nunca field values/email/name/phone/HubSpot IDs/private tokens.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (render) → Slice 2 (copy) → Slice 3 (style/motion) → Slice 4 (telemetry) → Slice 5 (GVC + AEO cutover).
- Slice 5 `--apply` en AEO SOLO tras renderer live (runtime guard del script de TASK-1319).
- Reward/private asset NO ship con URLs privadas directas.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| CSS hostil del host rompe la calidad visual | public-site UI | medium | CSS renderer-scoped, hostile-host verifier, GVC desktop/mobile | public verifier / visual review |
| Copy over-promete delivery downstream | UX / CRM | medium | Copy `accepted`-only; acceptance prohibe `delivered` sin prueba | review manual / GVC dossier |
| Layout jump mobile empuja al visitante sobre el titulo | UX | medium | Sin animacion de altura; foco alineado; scroll-width check 390 | GVC mobile |
| AEO publica success-card antes de renderer live | release | medium | Runtime guard del activation script (TASK-1319), dry-run default | activation FAIL |
| Reward CTA crea dark pattern de conversion | brand / UX | low | Un solo proximo paso, sin condiciones ocultas | review manual |
| Telemetry emit filtra PII | analytics | low | Allowlist (TASK-1319) + test de emit | telemetry unit test |

### Feature flags / cutover

- Sin feature flag global. Cutover por published form version (`success_behavior_json`), reversible por publish/deprecate.
- Si el renderer se despliega antes del cutover AEO, los forms viejos mantienen inline behavior.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert renderer PR; success path simple restaurado | <30 min | yes |
| Slice 2 | Revert copy PR | <15 min | yes |
| Slice 3 | Revert CSS o forzar comportamiento estatico/reduced | <30 min | yes |
| Slice 4 | Revert emit calls; contrato queda sin metrica | <15 min | yes |
| Slice 5 | Publicar/deprecar version AEO con inline message legacy | <30 min | yes |

### Production verification sequence

1. Correr renderer tests + typecheck + lint + build locales.
2. GVC desktop + mobile 390 en preview/fixture; mirar los frames.
3. Desplegar el renderer por el release path normal.
4. Verificar que el runtime productivo contiene success-card support.
5. Publicar la version AEO success-card (`--apply`, runtime-guarded, script de TASK-1319).
6. `pnpm public-website:verify-aeo-live-contract` + `verify-aeo-public-api-contract`.
7. GVC/live capture desktop + mobile 390 mirados; submit controlado si el harness lo permite.
8. Monitorear Sentry/logs/telemetria por render errors o rejected submissions.

### Out-of-band coordination required

- Coordinar con TASK-1319 (contrato live primero).
- Si el primer reward es ebook/download, confirmar owner del asset, hosting, URL allowlist y copy legal/brand antes de publicar.
- Si el CTA es agenda, confirmar URL + UTMs sin PII y estables.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El renderer reemplaza el form por una success card in-card tras `accepted`, no un mensaje bottom-only.
- [x] La success card incluye titulo/body y soporta siguientes pasos acotados, reward opcional y CTA opcional desde el contrato.
- [x] Reward/action puede representar ebook/download/gift/surprise sin exponer tokens privados, HubSpot internals, field values, submission id crudo ni PII.
- [x] El copy confirma recepcion `accepted` y no reclama delivery HubSpot, reporte generado ni timing de follow-up salvo que el contrato lo pruebe.
- [x] El foco se mueve al contenedor de la card y el estado se anuncia polite con semantica accesible.
- [x] Reduced-motion: success card estatica inmediata con significado identico.
- [x] `redirect` backward-compat preservado.
- [x] `gh_form_success_viewed` (+ `gh_form_success_action_clicked` cuando hay accion/reward) emiten con `action_kind`/`reward_kind`, sin field values ni PII.
- [x] La task declara wireframe/flow/motion existentes y pasa `pnpm ui:wireframe-check`, `pnpm ui:flow-check`, `pnpm ui:motion-check`, `pnpm ui:readiness-check --task TASK-1320`.
- [x] GVC/local verifier captura desktop y mobile 390 con assertions verdes y sin quality findings.
- [ ] El cutover AEO preserva fields, Turnstile, namePolicy, consent y mapping HubSpot de TASK-1318. **Pendiente:** requiere release del renderer y activation `--apply` guardado.
- [x] Documentation, task lifecycle y handoff sincronizados para estado `code complete, rollout pendiente`.

## Verification

- `pnpm task:lint --task TASK-1320`
- `pnpm ui:wireframe-check --task TASK-1320`
- `pnpm ui:flow-check --task TASK-1320`
- `pnpm ui:motion-check --task TASK-1320`
- `pnpm ui:readiness-check --task TASK-1320`
- `pnpm exec vitest run src/growth-forms-renderer`
- `pnpm public-website:verify-aeo-public-api-contract`
- `pnpm public-website:verify-aeo-live-contract`
- `pnpm public-website:verify-aeo-form-typography`
- GVC scenario `growth-forms-success-card` desktop + mobile 390 (mirado, no solo capturado)
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm qa:gates --changed --agent codex --task TASK-1320 --runtime --api --integration --production --docs`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` actualizado si cambio comportamiento visible
- [ ] chequeo de impacto cruzado (TASK-1319 y otras)
- [ ] `project_context.md` actualizado si AEO publica una nueva version o si la capacidad queda disponible transversalmente
- [ ] cualquier reward/asset publicado queda documentado con owner, URL policy y rollback

## Follow-ups

- Admin authoring UI para success cards si operadores necesitan configurarlas sin scripts.
- Governed private asset/tokenized download primitive si V1 necesita ebooks/reportes no publicos.
- Generic Growth Forms preview route para variantes de success-card fuera de AEO.

## Open Questions

1. Resuelta para V1: AEO queda en next-steps sin CTA/reward hasta confirmar una URL/owner estable de agenda o asset. La capacidad de CTA/reward queda probada en fixture del renderer.
2. Resuelta para V1: no se publica ebook/download real en AEO. Cualquier reward productivo futuro requiere owner del asset, URL policy y rollback documentados.
