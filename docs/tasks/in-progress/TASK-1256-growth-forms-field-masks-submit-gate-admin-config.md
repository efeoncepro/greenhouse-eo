# TASK-1256 — Growth Forms Field Masks + Submit Gate + Admin Validator Config

## Delta 2026-06-26 — backend del email gate ya disponible (TASK-1254 code complete scaffold)

El submit-gating de email que esta task expone en UI ya tiene su backend gobernado: **endpoint `POST /api/public/growth/forms/{slug}/verify-email`** (debounced, devuelve `{ syntaxValid, isCorporate, isDisposable, isRoleBased, isFreeProvider, deliverable, quality, suggestion, reasonCode }` sanitizado) + validador `corporate_email` en el registry + `reasonCode` `email_not_corporate`/`email_disposable` (con copy es-CL/en-US ya en `growth-forms-renderer/copy.ts`). La UI de esta task **consume ese endpoint** para habilitar/deshabilitar el submit (la autoridad ya vive en `submitForm`; el botón es UX). El endpoint está gated por `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED` (default OFF). El `suggestion` (typo-suggest) está disponible para el affordance "¿quisiste decir …?".

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
- UI impact: `interaction`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1253, TASK-1254, TASK-1255`
- Branch: `task/TASK-1256-growth-forms-field-masks-submit-gate-admin-config`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Capa visible de la integridad de datos del motor de formularios: máscaras de entrada por tipo (teléfono E.164 por país estilo HubSpot, RUT, URL) en el renderer portable, **submit-gating** del email corporativo (botón deshabilitado + estado "verificando…" mientras corre la verificación de TASK-1254), el **builder admin** para configurar validador/máscara/política por campo desde el catálogo curado (sin regex libre), y el **masking PII + affordance de reveal** en el cockpit admin. Todo verificado en loop con GVC desktop+mobile.

## Why This Task Exists

TASK-1253/1254/1255 entregan los contratos server-side (validator registry, verificación de email, PII hardening), pero son invisibles sin su capa de cliente: el usuario final necesita máscaras que guíen el tipeo (un teléfono sin máscara por país es la queja clásica), el botón de submit debe reflejar el gate corporativo (deshabilitado hasta correo válido), el operador necesita configurar qué validador/política aplica cada campo desde la UI, y el cockpit debe mostrar PII enmascarada con reveal gobernado. El renderer ya tiene `mask.ts` (base a extender), pero no hay máscaras por país, ni gating de submit, ni config admin de validadores, ni masking en el cockpit.

## Goal

- **Máscaras de entrada por tipo** en el renderer: teléfono E.164 con formato por país (HubSpot-style), RUT, URL — alimentadas por el validator registry de TASK-1253.
- **Submit-gating del email corporativo**: botón deshabilitado + estado "verificando…" + mensaje claro cuando el correo no es corporativo/verificado, consumiendo `POST /verify-email` (TASK-1254) debounced.
- **Builder admin** para configurar por campo: tipo, validador nombrado, máscara, política de email (block/warn/tag) — todo desde el **catálogo curado**, nunca input de regex libre.
- **Masking PII + reveal affordance** en el cockpit admin (consume readers masked/reveal de TASK-1255; reveal pide reason).
- Copy es-CL en `src/lib/copy/*`, estados completos (loading/empty/error/degraded/permission/mobile), reduced-motion, y GVC desktop+mobile mirado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md` + `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la UI es cliente del contrato, no la autoridad
- `CLAUDE.md` §"Microcopy / UI copy" + §"Hook obligatorio de diseño UI"

Reglas obligatorias:

- El renderer es portable (Astro/WordPress/custom element `<greenhouse-form>`): las máscaras deben ser browser-safe y no romper el contrato del renderer.
- El submit-gating es **UX**; la autoridad sigue en `submitForm` (TASK-1253/1254). El cliente nunca llama al provider — solo a `/verify-email`.
- El builder admin **solo** ofrece validadores nombrados del catálogo curado + params; **NUNCA** un campo de regex libre.
- Copy visible reusable en `src/lib/copy/*`; validar tono es-CL con `greenhouse-ux-writing` antes de escribir strings.
- Hook UI obligatorio: diseñar con skills product-design + verificar con GVC en loop (desktop+mobile), nunca freehand.
- Reveal de PII en cockpit pide reason ≥ N (consume command de TASK-1255); botón reveal oculto si no hay capability.

## Normative Docs

- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md` (Real-Artifact Iterative Verification Loop)
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md` (GVC)

## Dependencies & Impact

### Depends on

- **TASK-1253** — validator registry + tipos de campo (`national_id`, e164) que las máscaras consumen.
- **TASK-1254** — endpoint `POST /verify-email` que el submit-gating consume.
- **TASK-1255** — readers masked + command reveal + capability `growth.forms.lead_pii.reveal` para el cockpit.
- `src/growth-forms-renderer/mask.ts` (base existente), `element.ts`, `renderer.ts`, `api-client.ts`.

### Blocks / Impacts

- Cierra la cara visible de la integridad de datos del motor de formularios.
- ⚠️ Posible solape con el cockpit admin de **TASK-1232** (Codex) — coordinar qué task owns las pantallas admin del cockpit.

### Files owned

- `src/growth-forms-renderer/mask.ts` (extender: E.164 por país, RUT, URL)
- `src/growth-forms-renderer/renderer.ts`, `element.ts`, `validation.ts`, `api-client.ts` (gating + estado verificando)
- `src/views/growth/**` o el cockpit admin de forms [verificar path real del builder, posible owner TASK-1232]
- `src/lib/copy/growth.ts` o `src/lib/copy/forms.ts` (copy es-CL: estados de verificación, máscaras, reveal)
- `scripts/frontend/scenarios/` (escenarios GVC)

## Current Repo State

### Already exists

- `src/growth-forms-renderer/mask.ts` (máscaras base — a extender por país/tipo).
- Renderer portable con timing de validación 3-stage (`renderer.ts`, `element.ts`, `validation.ts`).
- `api-client.ts` (cliente del submit) — a extender con la llamada debounced a `/verify-email`.

### Gap

- Sin máscara de teléfono por país (HubSpot-style); el `tel` actual es Chile-only sin formato guiado.
- Sin submit-gating del email corporativo ni estado "verificando…".
- Sin builder admin para configurar validador/máscara/política por campo.
- Sin masking PII ni reveal affordance en el cockpit.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante público (renderer) + operador interno (cockpit/builder)
- Momento del flujo: completar un formulario público (máscaras + gate) / configurar un form y revisar leads (builder + cockpit)
- Resultado perceptible esperado: tipeo guiado por máscara, feedback inmediato de validación, botón submit que refleja el gate corporativo, PII enmascarada con reveal gobernado
- Friccion que debe reducir: errores de formato, leads con datos basura, exposición innecesaria de PII
- No-goals UX: no rediseñar el motor de formularios; no inventar un sistema de máscaras paralelo a `mask.ts`

### Surface & system decision

- Surface: renderer portable `<greenhouse-form>` (público) + cockpit admin de forms (interno)
- Composition Shell: `aplica` (cockpit) — usar el shell canónico
- Primitive decision: `extend` — extender `mask.ts`; reusar inputs/botones Greenhouse primitives; para CTA de submit reusar primitive existente
- Adaptive density / The Seam: `aplica` (cockpit tabla de leads)
- Floating/Sidecar/Dialog decision: reveal de PII puede ir en sidecar/dialog con campo reason
- Copy source: `src/lib/copy/growth.ts|forms.ts`
- Access impact: `entitlements` — reveal affordance gateado por `growth.forms.lead_pii.reveal`

### State inventory

- Default: campo con máscara + placeholder guía
- Loading: estado "verificando correo…" durante el debounce de `/verify-email`
- Empty: form vacío / cockpit sin leads
- Error: validación de campo falla (reasonCode → copy es-CL); verificación falla
- Degraded / partial: provider de email caído → mensaje "no pudimos verificar, intenta de nuevo" sin bloquear duro si la política lo permite
- Permission denied: botón reveal oculto sin capability
- Long content: form largo / tabla de leads paginada
- Mobile / compact: máscaras + gate operan en 390px
- Keyboard / focus: máscara no rompe navegación por teclado; error con `aria-describedby` + `role=alert`
- Reduced motion: estado verificando sin spinner agresivo

### Interaction contract

- Primary interaction: tipear con máscara → blur valida → email dispara verificación debounced → submit habilita/deshabilita
- Hover / focus / active: estados estándar de input/botón
- Pending / disabled: submit deshabilitado mientras verifica o si email no corporativo (política block)
- Escape / click-away: cerrar dialog de reveal restaura foco
- Focus restore: tras reveal/cierre
- Latency feedback: "verificando…" inline en el campo email
- Toast / alert behavior: error de submit canónico es-CL

### Motion & microinteractions

- Motion primitive: `CSS`/`Motion` ligero
- Enter / exit: feedback de validación suave
- Timing / easing token: tokens de motion del Design System
- Reduced-motion fallback: sí
- Non-goal motion: nada cinemático en un form de captura

### Visual verification

- GVC scenario: nuevo escenario para el form público (máscaras + gate) + cockpit (masking/reveal)
- Viewports: desktop + mobile 390px
- Required captures: campo con máscara, estado verificando, submit deshabilitado, error de email no corporativo, cockpit con PII masked, dialog de reveal
- Required `data-capture` markers: sí, sobre las secciones clave
- Scroll-width check: sin scroll horizontal en desktop ni 390px
- Accessibility/focus checks: error `role=alert`, máscara navegable por teclado
- Before/after evidence: antes (sin máscara/gate) vs después
- Known visual debt: declarar si el builder admin queda parcial

## Hybrid Execution Justification

[Omitido — Backend impact: none. Esta task es cliente puro de los contratos de TASK-1253/1254/1255; toda lógica de negocio/validación/verificación/PII vive server-side en esas tasks.]

## Full API Parity (nace gobernado)

Esta task es **cliente**, no fuente de verdad. Invariantes parity duros para no desviar lógica al componente:

- El **submit-gating** del email es UX puro sobre el contrato `/verify-email`; la decisión de aceptar/rechazar vive en `submitForm` (TASK-1254). El cliente nunca llama al provider ni decide la política.
- El **builder admin** persiste la config de validador/máscara/política **vía el command gobernado de form-definition** (escribe `validation_schema_json` declarativo de TASK-1253), NO en estado local ni en un endpoint click-handler. El mismo command lo opera Nexa (`propose → confirm → execute`) y MCP por construcción.
- El **reveal de PII** del cockpit invoca el command reveal de TASK-1255 (capability + reason + audit); la UI solo dispara, no descifra.
- Renderer portable, cockpit, Nexa y MCP son **consumers del mismo primitive**; esta UI no nace una implementación paralela.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Máscaras de entrada por tipo

- Extender `mask.ts`: teléfono E.164 con formato por país (default país por form), RUT, URL.
- Cablear máscaras al validator registry (TASK-1253) en el renderer; estados de error con copy es-CL.

### Slice 2 — Submit-gating del email corporativo

- `api-client.ts` llama `/verify-email` debounced; estado "verificando…"; submit deshabilitado hasta corporativo+verificado (según política del form).
- Mensajes es-CL (no corporativo / desechable / typo-suggest "¿quisiste decir …?").

### Slice 3 — Builder admin de validadores/política

- UI para configurar por campo: tipo, validador nombrado, máscara, política de email — desde el catálogo curado (dropdowns), nunca regex libre.
- Persiste vía el contrato de form definition (TASK-1232/1253 `validation_schema_json` declarativo).

### Slice 4 — Cockpit PII masking + reveal

- Tabla/detalle de leads muestra PII masked por default (reader de TASK-1255).
- Affordance de reveal (dialog con campo reason ≥ N) gateado por capability; consume el command reveal.
- GVC desktop+mobile de todo + escenarios.

## Out of Scope

- Lógica de validación/normalización (server, TASK-1253).
- Servicio de verificación de email / provider (TASK-1254).
- Cifrado/retención de PII / capability/command reveal server-side (TASK-1255).
- Rediseño del motor de formularios o del cockpit base (TASK-1232 owns el cockpit base).

## Detailed Spec

El renderer es portable y ya tiene `mask.ts`; se extiende, no se reemplaza. El submit-gating es UX puro sobre el contrato `/verify-email`; la autoridad sigue en `submitForm`. El builder admin solo expone el catálogo curado de validadores (anti-ReDoS). El cockpit consume readers masked + command reveal. Loop Real-Artifact: emitir el form/cockpit real + audit con skills product-design + GVC en loop hasta enterprise.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Requiere TASK-1253/1254/1255 mergeadas (contratos server). Dentro: Slice 1 (máscaras) → Slice 2 (gating) → Slice 3 (builder) → Slice 4 (cockpit PII).
- Slice 2 NO funciona sin el endpoint `/verify-email` (TASK-1254) en runtime.
- Slice 4 NO expone reveal sin la capability + command de TASK-1255 Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Máscara rompe paste/teclado/IME en el renderer portable | UI | medium | Tests de paste/teclado + máscara tolerante + GVC mobile | no signal — GVC + manual |
| Submit-gating deja al usuario trabado (provider lento) | UI | medium | Estado verificando con timeout + degradación honesta + política warn como fallback | `growth.forms.email_provider_error_rate` (TASK-1254) |
| Scroll horizontal en 390px con máscara/formato | UI | low | scroll-width check en GVC | GVC mobile |
| Reveal de PII visible sin capability | identity | low | Affordance oculto sin capability + autoridad en command server | `growth.forms.pii_reveal_without_reason` (TASK-1255) |
| Solape de ownership del cockpit con TASK-1232 | growth | high | Coordinar con Codex qué task owns cada pantalla | no signal — review |

### Feature flags / cutover

- Sin flag propio nuevo; el comportamiento sigue los flags de TASK-1253/1254/1255 (`*_VALIDATION_ENABLED`, `*_EMAIL_VERIFICATION_ENABLED`). La UI reacciona al contrato disponible. Cutover: shippea tras las 3 backend tasks.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (renderer vuelve a input plano) | <5 min | sí |
| Slice 2 | revert PR (submit sin gate) | <5 min | sí |
| Slice 3 | revert PR (builder sin config de validador) | <5 min | sí |
| Slice 4 | revert PR (cockpit sin reveal; masking se mantiene por reader) | <5 min | sí |

### Production verification sequence

1. Confirmar TASK-1253/1254/1255 en staging.
2. Deploy staging: GVC del form público (máscara teléfono por país, RUT, URL) desktop+mobile.
3. Probar gating: gmail → submit deshabilitado + mensaje; corporativo verificado → habilita.
4. Builder admin: configurar un campo con validador+máscara+política; verificar persistencia.
5. Cockpit: PII masked por default; reveal con reason → muestra; sin capability → oculto.
6. GVC desktop+mobile mirado (no solo capturado) + scroll-width check.
7. Repetir en prod.

### Out-of-band coordination required

- Coordinar con Codex (TASK-1232) el ownership de las pantallas del cockpit admin para no duplicar/colisionar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El campo teléfono muestra máscara/formato por país (default país del form); RUT y URL con máscara/normalización.
- [ ] El botón submit se deshabilita mientras verifica y cuando el email no es corporativo (política block); muestra mensaje es-CL + typo-suggest.
- [ ] El builder admin configura tipo/validador/máscara/política por campo desde el catálogo curado; no hay campo de regex libre.
- [ ] El cockpit muestra PII masked por default; el reveal pide reason ≥ N y está oculto sin capability.
- [ ] Estados loading/empty/error/degraded/permission/mobile cubiertos.
- [ ] Copy visible en `src/lib/copy/*`, validado es-CL.
- [ ] GVC desktop + mobile capturado y mirado; sin scroll horizontal en 390px.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm fe:capture` (GVC) del form público + cockpit, desktop+mobile

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1253/1254/1255 + TASK-1232)
- [ ] GVC desktop+mobile adjuntado y mirado

## Follow-ups

- Manual de uso del builder de validadores para operadores.
- Considerar máscaras de otros países a medida que entren clientes nuevos.

## Open Questions

- ~~Path real del builder/cockpit admin de forms (¿lo crea TASK-1232 o esta task?). Resolver con Codex en Discovery.~~ **Resuelto 2026-06-26 (Discovery):** TASK-1232 está **complete** y owns el cockpit base en `src/views/greenhouse/admin/growth/forms/GrowthFormsAdminCockpitView.tsx` (page `src/app/(dashboard)/admin/growth/forms/page.tsx`, viewCode `administracion.growth_forms`). Esta task **extiende ese cockpit aditivamente** (Slice 4 = masking PII + reveal en el sidecar de evidencia; Slice 3 = builder de validadores por campo), NO lo reescribe — alineado con "no rediseñar el cockpit base". El builder de validadores (Slice 3) nace como sub-superficie del cockpit existente (sidecar `composer`/inspector), persistiendo `validation_schema_json` declarativo vía el command de form-definition de TASK-1232/1253.
