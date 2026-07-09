# TASK-1373 — Careers Apply Native Growth Form Migration

## Delta 2026-07-08 — Revisión 3-lentes + skill `greenhouse-growth-forms`

Hechos verificados contra el repo real + el contrato canónico de Growth Forms. Task bien encuadrada (Careers = host del renderer, no segundo motor); ajustes:

- **⚠️ HALLAZGO — el form de careers es un HELPER DE CÓDIGO, no un Growth Form publicado (prerequisito duro):** `src/lib/hiring/public-careers/growth-form-contract.ts` **sintetiza el render contract en código** (`buildCareersApplicationFormContract`, con `CAREERS_APPLICATION_FORM_KEY='9f7a8fc0-…'`, `SURFACE_ID='public-careers-nextjs'` hardcodeados) y el `CareersApplyClient` lo consume directo. **NO** es un `form_definition`/`form_version` publicado en `greenhouse_growth.*` servido por `GET /api/public/growth/forms/<formKey>`. Regla dura de la skill: *los forms se autoran/versionan/gobiernan en la DB (draft→publish), no hardcodeados en código.* Para que `<greenhouse-form>` renderice nativo, **hay que autorar+publicar** el form `efeonce-careers-application` (mismo `form_key` + surface `public-careers-nextjs` + origin en `form_host_surface`) por el lifecycle gobernado. Esto es Slice 4 de TASK-1372 (seed del form) o un **prerequisito explícito de 1373** — declararlo, porque el render path exige un form publicado en DB, no el helper de código.
- **⚠️ Coordinación viva con TASK-354 (in-progress):** `src/components/greenhouse/careers/CareersApplyClient.tsx` (+166) y `careers.module.css` (+126) están **modificados sin commitear** (trabajo 354 en curso) — son los archivos exactos que 1373 migra. Secuenciar: 1373 arranca **después** de que la UI de apply de 354 aterrice/commitee Y de que 1372 publique el form. No migrar un archivo que 354 tiene mid-flight.
- **`.ghf-scope` / `hosted` (TASK-1298, el bug recurrente de theming):** al hostear `<greenhouse-form>`, el core NO debe re-declarar `.ghf-scope` (el host es el scope, `hosted=true`). El override de tokens va en `greenhouse-form { --ghf-* }`. Careers usa `appearance='bare'` + `color-scheme='light'` (bien) pero debe respetar explícitamente este contrato o los overrides no propagan al contenido.
- **Surface same-origin (gate más liviano que WordPress/AEO):** `SURFACE_ID='public-careers-nextjs'` = embed same-origin en una page Next.js de Greenhouse (NO un host WordPress cross-origin). CORS es trivial (mismo origin) pero el `form_host_surface` igual debe existir. NO cargar la ceremonia AEO/`heroans`/`verify-aeo-live-contract` — usar el gate proporcional (smoke API + GVC desktop/mobile 390 + overflow + captcha/upload smoke).
- **form_key, no slug** (regla dura de la skill): embeder por `form-key` (`9f7a8fc0-…`), nunca slug/page. La task ya lo hace.
- **a11y "gratis" del renderer:** los errores accesibles (`role=alert`/`aria-invalid`/`aria-describedby`), skeleton, anti-double-submit y Turnstile invisible los da el renderer por construcción; 1373 owns solo el host chrome (heading/hero/no-JS fallback) y su a11y.

## Contrato de paridad estética — HARD RULE, NO INTERPRETABLE (2026-07-08)

> **Directiva del operador:** migrar a `<greenhouse-form>` NO puede degradar ni un pixel de la riqueza estética actual del apply de Careers. "Growth Form" ≠ "look genérico". La migración es una **re-plataforma invisible al usuario**: mismo diseño, distinto motor. Esta sección es un contrato duro; ningún agente puede cerrarla reinterpretando la estética a la baja.
>
> **La prueba de aceptación es la paridad visual, no "se ve bien".** El estado objetivo es **indistinguible** del form custom actual + del HTML de referencia `~/Documents/carreers/Efeonce Carrers/Efeonce Careers.dc.html`, en desktop 1440 **y** mobile 390. Cualquier regresión visual (icono perdido, tipografía distinta, spacing, color, selector de país degradado, CTA plano, estados de error genéricos) = **task NO cerrada**, `UI ready: no`.

**Reglas duras (NUNCA / SIEMPRE):**

- **NUNCA** aceptar el look default del renderer para los campos. La presentación premium va gobernada en el render contract vía un **`styleVariant` de careers** (patrón `diagnostic_premium` de AEO: input look tokenizado, foco/error ricos, combobox custom para selects sin popup nativo del SO, motion del CTA, copy field-level). El `styleVariant` es **obligatorio**, no opcional.
- **NUNCA** perder los **iconos por campo** ni el **selector de teléfono con país** (bandera/código) que el form tiene hoy. Se preservan como **capacidad gobernada del renderer** (`field.presentation.icon` allowlist + phone-country UI, provista por TASK-1372), no como decoración descartable. Si el renderer aún no los soporta, se extiende el renderer — NUNCA se degrada la UI.
- **SIEMPRE** `appearance='bare'`: TODO el chrome (hero, card, jerarquía, identidad Efeonce, layout de secciones, copy de confianza, progreso, no-JS fallback) queda como **markup del host de Careers**, intacto. El renderer pinta **solo** los inputs, transparente, dentro de la card rica del host. La riqueza "alrededor" del form no la toca el renderer.
- **SIEMPRE** mapear los tokens `--ghf-*` a la paleta Efeonce/careers **scopeada al host**, honrando el contrato `.ghf-scope`/`hosted` (TASK-1298) para que los overrides propaguen al contenido. NUNCA HEX inline.
- **NUNCA** hacer "rip and replace": el `CareersApplyClient` custom se **conserva detrás de un flag como rollback** hasta que el GVC before/after pruebe paridad. El cutover al nativo se hace **solo tras sign-off de paridad visual**, nunca antes.
- **SIEMPRE** cerrar con **GVC before/after** (form custom actual vs migrado, contra el HTML de referencia) mirado en loop, desktop 1440 + mobile 390. La evidencia de paridad es requisito de `UI ready: yes`, no un nice-to-have.
- **Deuda visual = 0 sin follow-up explícito.** No se acepta "casi igual" ni "se pulirá después" sin una task follow-up declarada y aprobada por el operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1373-careers-native-growth-form.md`
- Flow: `docs/ui/flows/TASK-1373-careers-native-growth-form-flow.md`
- Motion: `docs/ui/motion/TASK-1373-careers-native-growth-form-motion.md`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|hr|growth`
- Blocked by: `TASK-1372`
- Branch: `task/TASK-1373-careers-native-growth-form-apply`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplazar el formulario custom de `/public/careers/[publicId]/apply` por el renderer nativo `<greenhouse-form>` consumiendo el contrato real de Growth Forms para applications. La pagina conserva la estetica del HTML `carreers`, pero el submit, validacion, telefono, CV y handoff ATS pasan a Growth Forms.

## Why This Task Exists

El apply de Careers ya se ve como Growth Form, pero no lo es de punta a punta: mantiene estado, validacion, submit y CV en un componente local. Eso crea deuda, rompe escalabilidad y obliga a repetir capacidades que Growth Forms ya debe gobernar. Esta task convierte Careers en un host visual del renderer, no en un segundo motor de formularios.

## Goal

- Usar `<greenhouse-form>` como renderer real del apply de Careers.
- Mantener alta fidelidad al HTML fuente: iconos, jerarquia, progreso, telefono con pais y estetica Efeonce.
- Eliminar duplicacion local de validacion/submit/CV cuando `TASK-1372` entregue soporte de application upload + ATS destination.
- Verificar desktop/mobile y submit E2E sin scroll horizontal ni regresiones de privacidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/ui/wireframes/TASK-354-public-careers-landing.md`
- `docs/ui/flows/TASK-354-public-careers-landing-flow.md`
- `docs/tasks/to-do/TASK-1372-growth-forms-application-upload-ats-destination.md`
- `docs/tasks/in-progress/TASK-354-public-careers-landing-apply-intake.md`

Reglas obligatorias:

- La pagina apply no debe implementar un submit paralelo a Growth Forms.
- La UI puede proveer host chrome, heading, fallback no-JS y theming; no owns fields, validation, destination mapping ni ATS writes.
- El diseño debe conservar la referencia HTML local `~/Documents/carreers/Efeonce Carrers/Efeonce Careers.dc.html`.
- El renderer debe preservar iconos de campos, telefono internacional y errores accesibles.
- No exponer dedupe, estado interno de candidato, asset URLs privadas ni errores raw.

## Normative Docs

- `.codex/skills/greenhouse-growth-forms/SKILL.md`
- `.codex/skills/greenhouse-portal-ui-implementer/SKILL.md`
- `.codex/skills/greenhouse-ux-content-accessibility/SKILL.md`
- `docs/manual-de-uso/hr/operar-careers-publicas.md`

## Dependencies & Impact

### Depends on

- `TASK-1372` for native Growth Forms file/CV and ATS projection support + el form publicado (`efeonce-careers-application`).
- **Coordinación con `TASK-354` (in-progress):** `CareersApplyClient.tsx` + `careers.module.css` están modificados uncommitted por 354 — 1373 los migra. Secuenciar 1373 después de que 354 aterrice/commitee su apply UI; no migrar un archivo mid-flight.
- Existing Careers public shell/components in `src/components/greenhouse/careers/**`.
- Existing Growth Forms renderer in `src/growth-forms-renderer/**`.
- Existing form contract seed/helper in `src/lib/hiring/public-careers/growth-form-contract.ts`.

### Blocks / Impacts

- Closes the architectural debt in `TASK-354` where apply is Growth Forms-shaped but not Growth Forms-owned.
- Impacts GVC scenario `scripts/frontend/scenarios/task354-careers-runtime-audit.scenario.ts`.
- May require renderer presentation polish for application field icons/progress.

### Files owned

- `src/components/greenhouse/careers/CareersApplyClient.tsx`
- `src/components/greenhouse/careers/careers.module.css`
- `src/lib/hiring/public-careers/growth-form-contract.ts`
- `src/growth-forms-renderer/**`
- `scripts/frontend/scenarios/task354-careers-runtime-audit.scenario.ts`
- `docs/ui/wireframes/TASK-1373-careers-native-growth-form.md`
- `docs/ui/flows/TASK-1373-careers-native-growth-form-flow.md`
- `docs/manual-de-uso/hr/operar-careers-publicas.md`
- `docs/documentation/hr/careers-publicas.md`

## Current Repo State

### Already exists

- Careers public routes `/public/careers`, `/public/careers/[publicId]`, `/public/careers/[publicId]/apply`.
- `CareersApplyClient` currently implements the form locally and sends to `/api/public/hiring/applications`.
- `buildCareersApplicationFormContract` describes a Growth Forms application contract but is not the actual write path.
- Growth Forms renderer already supports phone masks, consent, Turnstile, telemetry and field validation.

### Gap

- **El form NO está publicado como Growth Form:** `growth-form-contract.ts` es un helper de código (`buildCareersApplicationFormContract`), no un `form_definition`/`form_version` publicado en `greenhouse_growth.*` servido por `GET /api/public/growth/forms/<formKey>`. Prerequisito: autorar+publicar el form (draft→publish) con `form_key=9f7a8fc0-…` + surface `public-careers-nextjs` (Slice 4 de 1372 o prerequisito de 1373).
- Apply page is not using `<greenhouse-form>` as the real renderer/source of truth (hoy `CareersApplyClient` hace POST directo a `/api/public/hiring/applications` + usa `TurnstileTokenClient` local).
- Field icons and Growth Forms phone country UI are not guaranteed by the current custom component.
- The local component duplicates submit, errors, validation and CV handling.
- Native migration is blocked until `TASK-1372` supports upload + ATS projection **y** el form está publicado.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: candidato externo que postula a una vacante Efeonce.
- Momento del flujo: apply publico despues de revisar detalle de la vacante.
- Resultado perceptible esperado: formulario corto, confiable, con estetica Efeonce y feedback claro.
- Friccion que debe reducir: duplicacion de reglas, telefono sin mascara, CV no gobernado, sensacion de form improvisado.
- No-goals UX: redisenar careers completo, crear un flujo multi-step nuevo o mostrar informacion interna del ATS.

### Surface & system decision

- Surface: `/public/careers/[publicId]/apply`.
- Composition Shell: `no aplica` — public shell especializado de Careers ya existe y el form es un embed focal.
- Primitive decision: `reuse` — usar `<greenhouse-form>` portable renderer; extender renderer si falta iconografia/application presentation.
- Adaptive density / The Seam: `no aplica` — form centrado con ancho controlado.
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: `src/lib/copy/dictionaries/*/careers.ts` + Growth Forms render contract.
- Access impact: `none` — ruta publica.

### State inventory

- Default: hero + host chrome + native Growth Form.
- Loading: Growth Forms skeleton/loading state.
- Empty: opening no disponible ya cubierto por Careers unavailable view.
- Error: renderer public error + retry; server errors genericos.
- Degraded / partial: captcha/render contract unavailable -> no-JS fallback/retry.
- Permission denied: no aplica, ruta publica.
- Long content: role title wraps without overflow.
- Mobile / compact: 390px no horizontal scroll, fields stack cleanly.
- Keyboard / focus: tab order through heading, fields, country selector, CV upload, consent, submit.
- Reduced motion: renderer and host obey reduced motion.

### Interaction contract

- Primary interaction: fill form, optionally upload CV, consent, submit.
- Hover / focus / active: tokenized controls, visible focus ring, no host CSS override.
- Pending / disabled: submit pending from renderer, no double submit.
- Escape / click-away: no modal.
- Focus restore: invalid field summary/first invalid field through renderer.
- Latency feedback: renderer pending/submission states.
- Toast / alert behavior: inline/generic, no revealing dedupe or candidate state.

### Motion & microinteractions

- Motion primitive: `CSS|renderer default`
- Enter / exit: no new non-trivial motion.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: existing Careers/Growth Forms tokens.
- Reduced-motion fallback: static.
- Non-goal motion: no decorative animations.

### Implementation mapping

- Route / surface: `src/app/public/careers/[publicId]/apply/page.tsx`.
- Primitive / variant / kind: `<greenhouse-form>` application form, `appearance='bare'`, `color-scheme='light'`, **`styleVariant` de careers premium (obligatorio)** — input look/foco/error tokenizados, combobox custom de selects, motion CTA, iconos por campo, phone-country; NUNCA el look default.
- Component candidates: simplify `CareersApplyClient` into host wrapper/no-JS fallback or replace with `GreenhouseFormHost`.
- Copy source: Growth Forms contract + careers copy.
- Data reader / command: Growth Forms render contract and public submit API from `TASK-1372`.
- API parity: native Growth Forms submit -> ATS destination adapter.
- Access / capability: public surface allowlist/Turnstile; no internal capability in browser.
- States to implement: loading, render error, invalid, pending, success, upload error, captcha error.

### GVC scenario plan

- Scenario file: update `scripts/frontend/scenarios/task354-careers-runtime-audit.scenario.ts` or add `task1373-careers-native-growth-form.scenario.ts`.
- Route: `/public/careers/EO-OPN-0009/apply` or seeded test opening.
- Viewports: desktop 1440, mobile 390.
- Required steps: load apply, inspect form, interact phone country, upload small PDF, submit smoke with approved captcha path or server-side equivalent.
- Required captures: hero, form default, phone field, CV upload, invalid state, success state.
- Required `data-capture` markers: `careers-apply-form`, `careers-growth-form-host`, `careers-cv-uploader`, `careers-apply-success`.
- Assertions: no custom direct POST to `/api/public/hiring/applications` from Careers component; renderer emits `gh_form_*`.
- Scroll-width checks: `documentElement.scrollWidth === clientWidth` desktop/mobile.
- Reduced-motion / focus evidence: tab path and focus rings on input/select/upload/submit.

### Design decision log

- Decision: Careers apply becomes a host of native Growth Forms.
- Alternatives considered: keep custom local form with shared helpers; rejected because it preserves two form engines.
- Why this pattern: one source of truth, reusable application capability, less bespoke code.
- Reuse / extend / new primitive: reuse portable renderer; extend renderer only for generic application presentation needs.
- Open risks: renderer must support CV/file UX and ATS destination first (`TASK-1372`).

### Visual verification

- GVC scenario: `task354-careers-runtime-audit` updated or new TASK-1373 scenario.
- Viewports: 1440 and 390.
- Required captures: default/apply/error/success/upload.
- Required `data-capture` markers: see GVC plan.
- Scroll-width check: required.
- Accessibility/focus checks: required.
- Before/after evidence: compare against HTML careers reference and current route.
- Known visual debt: none accepted without follow-up.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Renderer readiness and form contract binding

- Confirm `TASK-1372` application form contract can render all Careers fields including CV.
- Replace local field definitions/state with native Growth Forms render contract.
- Preserve host chrome: header, hero, page title and no-JS fallback.

### Slice 2 — Careers apply migration

- Replace custom submit code in `CareersApplyClient` with `<greenhouse-form>` or a thin host wrapper.
- Remove duplicated local validation for email/phone/url/consent/CV where renderer now owns it.
- Ensure opening binding is safe and server-derived, not browser-internal ID leakage.

### Slice 3 — Visual fidelity and accessibility

- Preserve icons, field hierarchy, phone country selector and CV upload visual language from the HTML reference.
- Ensure button contrast, labels, errors, helper text and focus states pass review.
- Validate desktop/mobile no overflow and no weird nested card composition.

### Slice 4 — E2E evidence and docs

- Run GVC desktop/mobile.
- Run submit smoke via Growth Forms -> ATS destination.
- Update manuals, task status and handoff.

## Out of Scope

- Adding Growth Forms upload/ATS destination capability; that is `TASK-1372`.
- Changing vacancy publication fields; that is `TASK-1371`.
- Redesigning Careers listing/detail.
- Changing assessment or candidate review desk.

## Detailed Spec

- The apply page should not import `TurnstileTokenClient` or implement direct fetch to `/api/public/hiring/applications` after migration.
- The host may still pass `form-key`, `surface`, `locale`, `color-scheme='light'` and `appearance='bare'`.
- **Theming (`.ghf-scope`/`hosted`, TASK-1298):** el override de tokens va en `greenhouse-form { --ghf-* }`; el core hosteado no re-declara `.ghf-scope` (`hosted=true`). Si se corre contra un bundle viejo, targetear también `greenhouse-form .ghf-scope`. Sin esto, `appearance='bare'` + `--ghf-font` no propagan al contenido.
- **El form es un Growth Form publicado en DB** (form_key `9f7a8fc0-…` + surface `public-careers-nextjs`), NO el helper de código `buildCareersApplicationFormContract`; cambios de copy/campos = clone→publish→deprecate, nunca editar la versión publicada in-place.
- The no-JS fallback should tell the candidate the form could not load and provide a safe retry/contact path, without exposing internals.
- The success state must remain generic: never reveal duplicate application or candidate state.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 can start only after `TASK-1372` contract is available.
- Slice 2 must not ship until Growth Forms submit creates ATS applications.
- Slice 3 visual/a11y polish must happen before production rollout.
- Slice 4 closes only after GVC and submit evidence.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Renderer visual fidelity lower than HTML | Careers UI | medium | host theming + GVC against reference | screenshot review |
| ATS submit regression | Hiring/Growth | medium | staging smoke through destination adapter | missing application |
| CV UX regression | Growth renderer | medium | upload state coverage + test PDF | upload error logs |
| Host CSS fights renderer | Public UI | low | `color-scheme='light'`, scoped tokens | visual diff/GVC |

### Feature flags / cutover

- Use a route-level/env feature flag if needed to switch custom form -> native Growth Form.
- Rollback should republish previous form version or temporarily restore custom component if production submit fails.

### Rollback plan per slice

| Slice | Rollback | Reversible? |
|---|---|---|
| Slice 1 | Restore previous contract binding | yes |
| Slice 2 | Revert Careers apply component to previous custom path | yes |
| Slice 3 | Revert CSS/renderer polish | yes |
| Slice 4 | Roll back flag/form version and document residual | yes |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Careers apply uses native `<greenhouse-form>` as the actual renderer and submit path.
- [ ] The local component no longer owns ATS submit, Turnstile execution, phone validation or CV upload orchestration.
- [ ] **PARIDAD ESTÉTICA (hard):** el form migrado es **visualmente indistinguible** del `CareersApplyClient` custom actual + del HTML de referencia, verificado con **GVC before/after** en desktop 1440 **y** mobile 390. Cualquier regresión (icono, tipografía, spacing, color, país del teléfono, CTA, estados de error) bloquea el cierre.
- [ ] **`styleVariant` de careers premium** aplicado en el render contract (input look/foco/error ricos + combobox custom de selects + motion CTA + copy field-level); NO se aceptó el look default del renderer.
- [ ] **Iconos por campo + selector de teléfono con país** preservados como capacidad gobernada del renderer (`field.presentation.icon` + phone-country, de TASK-1372), no descartados.
- [ ] `appearance='bare'` + todo el chrome (hero/card/jerarquía/identidad Efeonce/no-JS fallback) host-owned; `--ghf-*` mapeados a la paleta Efeonce scopeada al host, `.ghf-scope`/`hosted` (TASK-1298) honrado.
- [ ] **Rollback preservado:** el `CareersApplyClient` custom queda detrás de flag hasta el sign-off de paridad; el cutover al nativo ocurre solo después.
- [ ] Submit through Growth Forms creates/reuses a Hiring application through the ATS projection (TASK-1372).
- [ ] GVC desktop/mobile confirms no horizontal overflow and no missing key visual states.
- [ ] The success and error states remain generic and privacy-safe.
- [ ] Manuals and docs say Careers application form is a Growth Form, not a decorative adapter.

## Verification

- `pnpm task:lint --task TASK-1373`
- `pnpm ui:wireframe-check --task TASK-1373`
- `pnpm ui:flow-check --task TASK-1373`
- `pnpm ops:lint --changed`
- Growth Forms renderer tests.
- Careers GVC desktop/mobile.
- Submit smoke Growth Forms -> ATS application.

## Closing Protocol

- [ ] `Lifecycle` and folder are synchronized.
- [ ] `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md` are synchronized.
- [ ] `Handoff.md`, `changelog.md` and `project_context.md` updated.
- [ ] Careers manuals updated with native Growth Forms apply path.

## Follow-ups

- Remove any obsolete Careers-specific form helpers after migration.
- Consider renderer application visual presets if more public application forms appear.

## Open Questions

- **[RESUELTA 2026-07-08 — no interpretable]** El renderer expone una capacidad **gobernada de icono por campo** (`field.presentation.icon` allowlist en el contrato, provista por TASK-1372) + phone-country UI. Los iconos NO se pierden ni quedan a criterio del implementador; si el renderer no los soporta aún, se extiende el renderer. La opción "mapear por tipo" es aceptable solo si reproduce 1:1 los iconos actuales.
- **[RESUELTA 2026-07-08]** La migración ships **detrás de flag con el custom como rollback**, cutover **solo tras sign-off de paridad visual** (GVC before/after). NUNCA cutover directo sin paridad probada.
