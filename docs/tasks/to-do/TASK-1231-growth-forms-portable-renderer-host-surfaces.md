# TASK-1231 — Growth Forms Portable Renderer + Host Surfaces

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|ui|wordpress|astro`
- Blocked by: `TASK-1229`
- Branch: `task/TASK-1231-growth-forms-portable-renderer-host-surfaces`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el renderer portable del motor Growth Forms como Web Component/custom element con wrappers finos para Greenhouse Next.js preview, WordPress public site y Astro parity. WordPress es el primer host surface, pero el core debe ser agnostico y consumir el mismo `render_contract` que Astro y Greenhouse.

## Why This Task Exists

El primer consumer real sera el sitio publico WordPress actual, pero Efeonce migrara progresivamente a Astro. Si se crea un renderer WordPress-native, el motor nace acoplado al runtime que queremos dejar atras. La arquitectura exige un core portable, host surface registry y wrappers que no cambien comportamiento ni mapping.

## Goal

- Crear renderer core framework-light para render contracts Growth Forms.
- Entregar Web Component/custom element como primitive portable.
- Crear Greenhouse Next.js preview wrapper usando el mismo core.
- Crear WordPress wrapper/plugin/shortcode/block minimo como primer host surface.
- Crear Astro wrapper/parity fixture que demuestre la misma version sin cambiar definition/destination.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`

Reglas obligatorias:

- Renderer core no depende de React, Next.js, WordPress globals, Astro runtime APIs ni HubSpot scripts.
- Wrappers son host adapters: import/enqueue/config/mount/CSP/nonce/surface id; no alteran fields, validation, conditions o destinations.
- UI se condiciona por `render_contract`, no por provider/destination.
- Greenhouse preview usa el mismo contract/core que public hosts.
- WordPress y Astro deben poder renderizar la misma form version.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `.codex/skills/greenhouse-product-ui-architect/SKILL.md`
- `.codex/skills/greenhouse-portal-ui-implementer/SKILL.md`
- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.codex/skills/astro-6/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1229` public render contract and host surface registry.
- Public-site runtime context for WordPress/Astro wrappers.

### Blocks / Impacts

- `TASK-1232` Growth Forms admin cockpit + first migration.
- Future migration from WordPress to Astro.

### Files owned

- `src/components/greenhouse/**` or renderer package path selected during discovery
- `src/app/admin/growth/forms/**` or preview route selected during discovery
- Public-site WordPress runtime wrapper files `[verificar en runtime repo]`
- Astro wrapper in `efeonce-web` sibling repo `[verificar]`
- `scripts/frontend/scenarios/**` for GVC scenarios if preview lives in Greenhouse
- `docs/tasks/to-do/TASK-1231-growth-forms-portable-renderer-host-surfaces.md`

## Current Repo State

### Already exists

- Architecture docs defining host surfaces and renderer contract.
- Greenhouse UI primitive guidance and GVC process.
- Public site WordPress and Astro control-plane docs/tasks exist, but forms renderer runtime does not.

### Gap

- No portable renderer core exists.
- No Greenhouse preview surface for Growth Forms exists.
- No WordPress/Astro wrappers exist for the same render contract.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: public visitor, Growth operator previewing forms, public-site implementer.
- Momento del flujo: visitor sees/completes a public lead/form; operator previews the same contract in Greenhouse.
- Resultado perceptible esperado: consistent branded, accessible forms across WordPress, Astro and Greenhouse preview.
- Friccion que debe reducir: no more HubSpot embed styling limitations or per-runtime hardcoded form behavior.
- No-goals UX: full visual form builder; final admin cockpit; custom per-site renderer forks.

### Surface & system decision

- Surface: Web Component/custom element + Greenhouse Next.js preview + WordPress wrapper + Astro wrapper.
- Composition Shell: `aplica` for Greenhouse preview page only; public wrappers embed into host layout.
- Primitive decision: `new` — portable Growth Form renderer primitive/core, with wrappers as adapters.
- Adaptive density / The Seam: `aplica` for form containers inside variable-width public layouts.
- Floating/Sidecar/Dialog decision: no modal default; host page decides placement, renderer handles form states.
- Copy source: render contract/copy refs; reusable UI copy should live in `src/lib/copy/*` if added to Greenhouse.
- Access impact: `none` for public render; preview route uses existing/internal access as decided in implementation.

### State inventory

- Default: form ready with fields/steps.
- Loading: contract fetch pending.
- Empty: no fields or unpublished contract -> safe fallback.
- Error: public fetch/submit failure with sanitized message.
- Degraded / partial: JS/CSP/load failure fallback; destination unavailable copy from contract if applicable.
- Permission denied: surface not allowed/origin blocked.
- Long content: multi-step/light forms, free text help, consent copy.
- Mobile / compact: no horizontal page scroll at 390px.
- Keyboard / focus: labels, focus order, errors, submit feedback.
- Reduced motion: no essential motion; transitions degrade.

### Interaction contract

- Primary interaction: fill fields, advance steps when applicable, submit.
- Hover / focus / active: tokenized and accessible.
- Pending / disabled: submit pending state, duplicate prevention.
- Escape / click-away: N/A unless host uses modal; renderer should not trap focus by default.
- Focus restore: focus first invalid field or success state after submit.
- Latency feedback: loading/pending/progress messaging.
- Toast / alert behavior: inline status preferred; host-level toast optional only via wrapper event.

### Motion & microinteractions

- Motion primitive: `CSS|framer layout` depending on implementation surface; no GSAP needed.
- Enter / exit: subtle field/step transitions.
- Layout morph: optional for multi-step height changes.
- Stagger: none by default.
- Timing / easing token: use Greenhouse motion tokens if inside Greenhouse; public CSS custom properties otherwise.
- Reduced-motion fallback: instant state changes.
- Non-goal motion: decorative animations.

### Visual verification

- GVC scenario: `growth-forms-renderer-preview` plus WordPress/Astro smoke evidence when available.
- Viewports: desktop, tablet if relevant, mobile 390px.
- Required captures: default, validation error, submitting, success, unauthorized/degraded.
- Required `data-capture` markers: form root, field group, submit state, success state.
- Scroll-width check: required for Greenhouse preview and public host smoke.
- Accessibility/focus checks: keyboard tab flow, labels/errors, focus after failed submit.
- Before/after evidence: N/A first implementation; capture against render contract fixtures.
- Known visual debt: public-site WordPress host CSS may impose constraints; wrapper must document overrides.

## Hybrid Execution Justification

Omitido: backend impact `none`. This task consumes APIs/contracts from TASK-1229 but should not create business logic or mutate backend state beyond normal public submit usage in smoke tests.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Portable renderer core

- Build renderer core around `render_contract`.
- Support static, conditional_simple and multi_step_light enough for fixtures.
- Emit semantic events for submit/success/error without leaking destination details.

### Slice 2 — Greenhouse Next.js preview

- Add internal preview surface consuming public/admin contract fixtures.
- Use Composition Shell where appropriate and GVC-ready markers.
- Cover default/loading/error/validation/success states.

### Slice 3 — WordPress first host surface

- Add wrapper/plugin/shortcode/block in the appropriate public-site runtime repo/path.
- Enqueue pinned renderer bundle and pass surface id/embed key.
- Smoke in WordPress host with test form.

### Slice 4 — Astro parity wrapper

- Add Astro wrapper in target public-site rail.
- Prove same published form/version renders with no form definition or destination changes.
- Document parity evidence.

## Out of Scope

- Backend schema/API/compiler work from TASK-1229.
- HubSpot adapter work from TASK-1230.
- Admin cockpit authoring UI.
- Migrating a real production form.
- Full drag-and-drop visual builder.

## Detailed Spec

Renderer receives `render_contract` only. It never receives destination mapping, provider config, HubSpot form GUID or HubSpot property names. Wrappers may translate host environment concerns such as script loading, CSP nonce, origin/surface id and local theme tokens.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- WordPress/Astro wrappers cannot fork behavior from renderer core.
- No public production form migration in this task unless explicitly approved as smoke fixture only.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Renderer forks per host | UI/platform | medium | Shared core + parity fixture | `growth.forms.surface_migration_drift` |
| Public host CSS breaks layout | WordPress/Astro | medium | Wrapper-scoped CSS + GVC/visual smoke | visual capture / scrollWidth |
| CSP blocks renderer | Public site | medium | CSP-compatible script strategy + nonce support | browser console/logs |
| A11y regressions in custom element | UI/accessibility | medium | labels/errors/focus tests + GVC review | accessibility checks |

### Feature flags / cutover

- Renderer channel `preview|beta|stable`; public surfaces pin preview/beta until smoke approved.
- No production real form cutover in this task.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert renderer package/core | <30 min | si |
| Slice 2 | Remove preview route or hide behind internal gate | <30 min | si |
| Slice 3 | Disable shortcode/block or dequeue script | <15 min | si |
| Slice 4 | Remove wrapper/import | <30 min | si |

### Production verification sequence

1. Local renderer fixture tests.
2. Greenhouse preview GVC desktop/mobile.
3. WordPress staging/test page smoke with test form.
4. Astro local/staging parity smoke.
5. Confirm no real production form replacement happened.

### Out-of-band coordination required

- Access to public-site WordPress runtime repo/deploy flow.
- Access to Astro public-site repo if wrapper lives outside greenhouse-eo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Renderer core consumes only browser-safe `render_contract`.
- [ ] Greenhouse preview, WordPress wrapper and Astro wrapper use the same core/contract.
- [ ] WordPress smoke proves first host surface works with a test form.
- [ ] Astro parity smoke proves future host surface can reuse same form/version.
- [ ] GVC/visual evidence covers desktop/mobile and key states.
- [ ] No horizontal page scroll is introduced in preview/public smoke surfaces.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm task:lint --task TASK-1231`
- `pnpm ops:lint --changed`
- `pnpm fe:capture <scenario>` for Greenhouse preview.
- WordPress/Astro smoke evidence as applicable.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Renderer compatibility/channel documented in architecture or manual if runtime choices differ.

## Follow-ups

- `TASK-1232` Growth Forms admin cockpit + first migration.

## Open Questions

- Final package/distribution path for renderer bundle.
- Whether WordPress wrapper lives in greenhouse-eo bridge tooling or public-site runtime repo.
