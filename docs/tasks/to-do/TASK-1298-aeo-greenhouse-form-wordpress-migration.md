# TASK-1298 — AEO WordPress greenhouse-form migration

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
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1298-aeo-greenhouse-form-migration.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1298-aeo-greenhouse-form-migration-motion.md`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site|growth`
- Blocked by: `TASK-1297`
- Branch: `task/TASK-1298-aeo-greenhouse-form-wordpress-migration`

## Summary

Migrar la seccion de conversion de AEO `/aeo-2/` desde el bridge HTML temporal a `<greenhouse-form>`, preservando la experiencia publica aprobada: una sola card visible, copy AEO, validacion inline, email corporativo, Turnstile invisible, dataLayer y mobile 390 sin overflow. No toca Home, hero ni el `/aeo` viejo.

## Why This Task Exists

El bridge AEO fue correcto como transicion, pero ya no debe quedarse como logica paralela: el renderer generico ya soporta `captchaToken`, `security.captcha`, validacion reactiva y submit gobernado. Mantener submit/captcha/email gate en HTML por landing vuelve caro escalar Growth Forms a otras landings.

## Goal

- Reemplazar la logica bridge del widget `convers` por `<greenhouse-form form-guid="<AEO_FORM_GUID>" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL">`.
- Preservar el shell visual AEO y evitar card-on-card.
- Verificar desktop/mobile 390, overflow, focus, validation, Turnstile boundary, dataLayer y `heroans` hash.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/documentation/public-site/aeo-landing-elementor.md`
- `docs/documentation/growth/motor-formularios-publicos.md`

Reglas obligatorias:

- No tocar Home `postId=2791`.
- No usar/revivir `/aeo` viejo `postId=250255`.
- No tocar hero salvo instruccion explicita; proteger widget derecho `heroans` con hash `e0b951b2456a83578cd9e22005900521`.
- Mutar Elementor solo con `\Elementor\Plugin::$instance->documents->get($post_id)->save([...])`, nunca escribir `_elementor_data` directo.
- Crear backup meta antes de guardar y purgar Kinsta cache despues.
- Verificar desktop/mobile, especialmente 390px, `scrollWidth == clientWidth`, spacing, letter-spacing y solapes.

## Normative Docs

- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.codex/skills/greenhouse-gvc-playwright/SKILL.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/tasks/to-do/TASK-1297-growth-forms-stable-identity-render-copy.md`

## Dependencies & Impact

### Depends on

- `TASK-1297`: public GET AEO debe exponer `formGuid`, copy de renderer aprobado, al menos `copy.submit`, y resolucion por GUID.
- `TASK-1294`: renderer Turnstile/captchaToken parity.
- `TASK-1296`: AEO `security.captcha` serializado en produccion.
- WordPress page `postId=250265`, section/widget `convers`.

### Blocks / Impacts

- Desbloquea retirar la excepcion bridge HTML para AEO.
- Sirve como primera migracion publica real del renderer generico con Turnstile en una landing de Efeonce.
- Informa patrones para futuras landings Growth Forms.

### Files owned

- `docs/documentation/public-site/aeo-landing-elementor.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/ui/wireframes/TASK-1298-aeo-greenhouse-form-migration.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- AEO live page: `https://efeoncepro.com/aeo-2/`, `postId=250265`, status `publish`.
- Conversion section: `convers`, `.gh-aeo-conversion`.
- Temporary bridge host/card: `.gh-aeo-form-card gh-aeo-growth-form-host` + `.gh-aeo-growth-form-card`.
- Renderer endpoint: `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js`.
- Public contract: slug `efeonce-aeo-diagnostic`, real `formGuid` pendiente de `TASK-1297`, surface `fhsf-efeonce-aeo-diagnostic`, `security.captcha` present.
- Typography gate: `pnpm public-website:verify-aeo-form-typography`.

### Gap

- WordPress still owns submit, `/verify-email`, Turnstile execution and error state in a bridge HTML blob.
- The generic renderer has not yet been smoke-tested as the live AEO form inside Elementor.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante publico con interes en diagnostico AEO.
- Momento del flujo: seccion final de conversion de `/aeo-2/`.
- Resultado perceptible esperado: el formulario se siente igual o mas confiable que el bridge, sin card doble ni cambios de copy aprobada.
- Friccion que debe reducir: duplicacion de validacion/captcha por landing y riesgo de drift entre WordPress y Growth Forms.
- No-goals UX: redisenar hero, FAQ, secciones anteriores o crear un nuevo layout de landing.

### Surface & system decision

- Surface: WordPress/Elementor page `postId=250265`, section `convers`.
- Composition Shell: `no aplica` — landing WordPress/Elementor existente, no vista Greenhouse React.
- Primitive decision: `reuse` — `<greenhouse-form>` portable renderer.
- Adaptive density / The Seam: `no aplica` — no se crea card primitive Greenhouse; se adapta con CSS scoped del host.
- Floating/Sidecar/Dialog decision: N/A.
- Copy source: `render_contract.copy` para CTA del renderer + copy local aprobado en AEO wrapper.
- Access impact: `none`; surface/origin/CORS ya gobernados por Growth Forms.

### State inventory

- Default: renderer montado con campos AEO visibles.
- Loading: estado de carga del renderer no deja caja vacia ni salto severo.
- Empty: N/A; form debe existir.
- Error: errores inline del renderer; errores submit sanitizados.
- Degraded / partial: API disabled/unavailable muestra fallback honesto del renderer.
- Permission denied: N/A para publico; origin/surface failure debe mostrarse como unavailable, no raw error.
- Long content: mobile 390 sin overflow ni solapes.
- Mobile / compact: una columna, CTA y privacidad visibles.
- Keyboard / focus: foco al primer campo invalido; todos los campos operables por teclado.
- Reduced motion: sin motion nueva; cualquier transicion existente debe respetar reduced-motion.

### Interaction contract

- Primary interaction: completar campos y enviar via renderer; no submit HTML custom.
- Hover / focus / active: usar estilos del renderer o CSS scoped sin romper contraste.
- Pending / disabled: submit pending visible y anti doble-submit del renderer.
- Escape / click-away: N/A.
- Focus restore: invalid submit lleva al primer error.
- Latency feedback: email verification y Turnstile submit no deben parecer congelados.
- Toast / alert behavior: no toasts; errores inline/status del renderer.

### Motion & microinteractions

- Motion primitive: `none` — contrato dedicado en `docs/ui/motion/TASK-1298-aeo-greenhouse-form-migration-motion.md`
- Enter / exit: no nuevo.
- Layout morph: no nuevo.
- Stagger: no nuevo.
- Timing / easing token: N/A.
- Reduced-motion fallback: renderer/page deben mantenerse estables.
- Non-goal motion: no agregar animaciones decorativas al form.

### Implementation mapping

- Route / surface: `https://efeoncepro.com/aeo-2/`, WordPress `postId=250265`, section `convers`.
- Primitive / variant / kind: `<greenhouse-form form-guid>` / `diagnostic_intake` / AEO form contract.
- Component candidates: HTML widget existing host + renderer script; scoped CSS variables/classes.
- Copy source: `render_contract.copy.submit` from `TASK-1297`; section/trust copy remains in WordPress wrapper.
- Data reader / command: public Growth Forms GET/POST/verify-email por `formGuid` con slug backward-compatible.
- API parity: WordPress embeds only; business logic stays in Growth Forms.
- Access / capability: public surface allowlist + CORS.
- States to implement: default, loading, field error, email gate, submit pending, captcha failure, success/unavailable.

### GVC scenario plan

- Scenario file: direct route capture or new scenario under `scripts/frontend/scenarios/` if assertions need persistence.
- Route: `https://efeoncepro.com/aeo-2/`.
- Viewports: desktop `1440x1200`, mobile `390x1100`, reduced-motion.
- Required steps: scroll to `.gh-aeo-conversion`, assert renderer mount, required errors, Gmail/free email block, corporate email verification path, submit boundary.
- Required captures: conversion section default, error state, email gate state, mobile 390.
- Required `data-capture` markers: `.gh-aeo-conversion`, renderer root, submit button.
- Assertions: `scrollWidth == clientWidth`, CTA copy, no card-on-card, no technical kicker, `heroans` hash stable, dataLayer event allowlist no PII.
- Scroll-width checks: desktop and mobile 390.
- Reduced-motion / focus evidence: reduced-motion no visual instability; keyboard/focus invalid state checked.

### Design decision log

- Decision: replace bridge logic with portable renderer while preserving AEO shell.
- Alternatives considered: keep bridge, fork renderer for AEO, rewrite all conversion markup.
- Why this pattern: avoids per-landing captcha/validation drift and proves the renderer as reusable public primitive.
- Reuse / extend / new primitive: reuse.
- Open risks: renderer CSS may need scoped host tuning; verify before saving live and back up Elementor data.

### Visual verification

- GVC scenario: `pnpm fe:capture --route=/aeo-2/ --env=prod` or public URL equivalent plus Playwright script for form states.
- Viewports: desktop and mobile 390.
- Required captures: conversion section and form states.
- Required `data-capture` markers: `.gh-aeo-conversion`.
- Scroll-width check: `scrollWidth == clientWidth`.
- Accessibility/focus checks: invalid submit focus and ARIA.
- Before/after evidence: screenshot/capture before mutation and after.
- Known visual debt: none accepted; card-on-card is a blocker.

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

### Slice 1 — Inspect and preview

- Inspeccionar Elementor `convers`, widget IDs/classes/CSS page-scoped y bridge HTML vigente.
- Crear backup meta y validar `heroans` hash antes de cualquier save.
- Probar renderer AEO en navegador sin guardar si es posible para observar layout/copy/states.

### Slice 2 — Elementor migration

- Reemplazar la logica bridge por embed `<greenhouse-form>` y script renderer.
- Mantener shell visual AEO, una sola superficie visible y copy/trust aprobado.
- Preservar/ajustar CSS scoped solo dentro de `.gh-aeo-conversion`.

### Slice 3 — Verification and closure

- Purgar Kinsta.
- Verificar desktop/mobile 390/reduced-motion, overflow, spacing, letter-spacing, no solapes, focus/ARIA, email gate, Turnstile boundary, dataLayer no PII.
- Actualizar docs/manuales/skills si cambian contratos operativos.

## Out of Scope

- Hero, Home, `/aeo` viejo.
- Cambiar engine/backend de Growth Forms.
- Cambiar HubSpot mapping/destination.
- Rediseñar FAQ o secciones anteriores.
- Crear renderer fork para AEO.

## Detailed Spec

Embed objetivo:

```html
<greenhouse-form form-guid="<AEO_FORM_GUID>" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL"></greenhouse-form>
```

`<AEO_FORM_GUID>` debe venir del `form_guid` real publicado por `TASK-1297`; no inventarlo ni reemplazarlo por slug/surface/page. El host debe cargar el renderer desde `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js` siguiendo el contrato del widget/host actual. Si el widget Elementor existente ya provee esta carga, preferirlo sobre HTML manual.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `TASK-1297` debe estar complete antes de ejecutar esta task, incluyendo el `formGuid` real de AEO y el GET publico por GUID.
- Slice 1 backup/hash/preview -> Slice 2 save Elementor -> Kinsta purge -> Slice 3 verification.
- Si `heroans` hash cambia, detener y revertir solo el cambio de esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Card-on-card o visual regression | public-site | medium | preview + scoped CSS + Playwright desktop/mobile | screenshot/capture |
| Renderer no carga por CSP/CORS | public-site/growth | medium | GET script + public contract smoke antes de save | blank form/unavailable |
| Submit/captcha falla | growth/public-site | medium | smoke fail-closed + Turnstile boundary | `captcha_failed` unexpected |
| Hero se altera por Document::save | public-site | low | hash `heroans` before/after | md5 drift |

### Feature flags / cutover

Sin flag nuevo. Cutover vive en WordPress Elementor con backup meta y rollback por restore de backup.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | no-op si solo inspeccion/preview | inmediato | si |
| Slice 2 | restaurar backup Elementor meta y purgar Kinsta | <10 min | si |
| Slice 3 | revertir a backup si cualquier gate visual/funcional falla | <10 min | si |

### Production verification sequence

1. `pnpm public-website:wpcli -- --eval-file ./tmp/<inspect>.php --wp-user 12`
2. Save via `Document::save()` con backup meta.
3. Purgar Kinsta.
4. Playwright/GVC desktop + mobile 390.
5. `pnpm public-website:verify-aeo-form-typography`.
6. Contract GET/POST fail-closed smoke.
7. Hash `heroans` unchanged.

### Out-of-band coordination required

N/A — cambio live WordPress autorizado por la task; no requiere portal manual externo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact` segun el alcance real.
- [ ] `UI ready` permanece `yes` solo porque wireframe y `## UI/UX Contract` tienen implementation mapping, GVC scenario plan y design decision log; `pnpm task:lint --task TASK-1298` pasa.
- [ ] Se declaro `Wireframe: docs/ui/wireframes/TASK-1298-aeo-greenhouse-form-migration.md` y el archivo existe.
- [ ] Se declaro `Motion: docs/ui/motion/TASK-1298-aeo-greenhouse-form-migration-motion.md` y el archivo existe.
- [ ] `TASK-1297` esta complete antes del save WordPress.
- [ ] AEO `/aeo-2/` usa `<greenhouse-form form-guid>` para render/validation/submit en lugar del bridge HTML.
- [ ] El target se identifica por el `formGuid` real de AEO, no por pagina, screenshot, slug o surface.
- [ ] La seccion conserva una sola card visible y no muestra kicker tecnico.
- [ ] CTA visible es `Solicitar diagnóstico gratis →`.
- [ ] Email Gmail/free/disposable se bloquea inline antes de `/submit`.
- [ ] Turnstile/captchaToken path funciona; submit sin token sigue fail-closed.
- [ ] dataLayer events no contienen PII.
- [ ] Desktop y mobile 390 tienen `scrollWidth == clientWidth`, sin solapes.
- [ ] `heroans` md5 sigue `e0b951b2456a83578cd9e22005900521`.
- [ ] `pnpm public-website:verify-aeo-form-typography` pasa.

## Verification

- `pnpm task:lint --task TASK-1298`
- `pnpm ui:wireframe-check --task TASK-1298`
- `pnpm ui:motion-check --task TASK-1298`
- `pnpm public-website:verify-aeo-form-typography`
- Playwright/GVC desktop + mobile 390 + reduced-motion.
- Public Growth Forms GET/POST smoke.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado
- [ ] `Handoff.md` quedo actualizado
- [ ] `changelog.md` quedo actualizado
- [ ] docs public-site/Growth Forms actualizados si el contrato operativo cambia

## Follow-ups

- Aplicar el mismo patron a otras landings solo despues de que sus forms publiquen copy/security contract propio.

## Open Questions

- Ninguna para crear la task. El agente que la tome debe decidir, tras inspeccion, si usa el widget Elementor `greenhouse_growth_form` o un HTML host minimo con script renderer.
