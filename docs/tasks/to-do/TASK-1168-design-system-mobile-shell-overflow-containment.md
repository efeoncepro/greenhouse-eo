# TASK-1168 — Design System Mobile Shell Overflow Containment

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|design-system|quality`
- Blocked by: `none`
- Branch: `task/TASK-1168-design-system-mobile-shell-overflow-containment`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Eliminar el scroll horizontal de pagina en mobile para las rutas internas del Design System. La deuda se detecto durante TASK-1132: `/design-system/nexa-chat` en viewport 390px reporto `scrollWidth=676` y `clientWidth=390`, mientras el specimen nuevo no desbordaba internamente.

## Why This Task Exists

Greenhouse tiene una regla dura: page-level horizontal scroll nunca debe existir en desktop ni mobile. Durante la validacion de `NexaExpressionCue`, el marker `nexa-expression-cue-specimen` quedo contenido (`scrollWidth=310`, `clientWidth=310`), pero el documento completo del Design System overfloweaba por el shell/layout mobile. Si no se corrige, futuras capturas GVC de labs pueden esconder deuda real, obligar a compensaciones por scenario y degradar la confiabilidad visual del Design System.

## Goal

- Localizar el owner real del overflow mobile en `/design-system/**` usando Playwright/GVC y mediciones `scrollWidth`.
- Corregir la causa raiz en el shell/layout compartido correcto, sin parchear specimens individuales.
- Dejar GVC desktop+mobile y medicion `scrollWidth <= clientWidth` como evidencia de cierre.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md`
- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/complete/TASK-1132-nexa-expression-layer-fluent-visual-cues.md`

Reglas obligatorias:

- No ocultar el problema con `overflow-x: hidden` global si un descendiente sigue midiendo ancho fuera de contrato.
- Si una region realmente requiere scroll horizontal, debe ser scroll interno accesible (`role='region'`, `aria-label`, `tabIndex={0}`), nunca scroll de pagina.
- Preferir arreglar el owner comun del shell/layout del Design System antes de tocar cada Lab.
- Medir `document.documentElement.scrollWidth <= document.documentElement.clientWidth` en desktop y mobile 390px.
- Usar tokens MUI/AXIS y primitives existentes; no introducir hex, font families o layout systems paralelos.

## Normative Docs

- `docs/documentation/plataforma/nexa-conversational-experience.md`
- `scripts/frontend/scenarios/design-system-nexa-chat.scenario.ts`
- `docs/architecture/ui-platform/HISTORIAL.md`

## Dependencies & Impact

### Depends on

- `TASK-1132` — detecto y documento la deuda durante GVC de `/design-system/nexa-chat`.
- GVC local o staging con usuario agente autenticado.

### Blocks / Impacts

- GVC confiable para labs bajo `/design-system/**`.
- Futuras tasks UI Platform que usen captures mobile como evidencia.
- Reduce compensaciones fragiles de `scrollY` en scenarios cuando el problema real es el shell.

### Files owned

- `src/app/(dashboard)/design-system/layout.tsx`
- `src/views/greenhouse/admin/design-system/DesignSystemBreadcrumbShell.tsx`
- `src/views/greenhouse/admin/design-system/**`
- `src/components/layout/vertical/NavbarContent.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/NavbarContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `scripts/frontend/scenarios/design-system-nexa-chat.scenario.ts`
- `scripts/frontend/scenarios/design-system-*.scenario.ts`
- `docs/architecture/ui-platform/HISTORIAL.md`

## Current Repo State

### Already exists

- `/design-system/**` vive bajo `src/app/(dashboard)/design-system/` y hereda el guard/layout de `src/app/(dashboard)/design-system/layout.tsx`.
- El Lab de Nexa Chat vive en `src/views/greenhouse/admin/design-system/NexaChatLabView.tsx`.
- El scenario `design-system-nexa-chat` ya captura desktop y mobile.
- TASK-1132 dejo evidencia: GVC `.captures/2026-06-18T01-17-53_design-system-nexa-chat`, route browser OK, y medicion mobile documentada.

### Gap

- En mobile 390px, el documento completo de `/design-system/nexa-chat` reporta `scrollWidth=676` y `clientWidth=390`.
- El offender observado aparece fuera del marker nuevo, con main/footer/header del shell desplazados; el specimen `nexa-expression-cue-specimen` no desborda internamente.
- No hay gate especifico que falle cuando una ruta Design System introduce page-level horizontal scroll.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: agentes y equipo Efeonce que revisan el Design System interno en desktop y mobile.
- Momento del flujo: revision GVC y browser diagnostics de labs bajo `/design-system/**`.
- Resultado perceptible esperado: mobile se comporta como una pagina contenida; cualquier overflow horizontal es interno, intencional y accesible.
- Friccion que debe reducir: captures mobile con contenido desplazado, header/footer tapando o extendiendo el ancho real, y falsos positivos al revisar primitives.
- No-goals UX: no redisenar el Design System, no rehacer navigation shell, no cambiar primitives no relacionadas, no ocultar overflow real con un clipping global ciego.

### Surface & system decision

- Surface: `/design-system/nexa-chat` como caso reproducible inicial; ampliar a 1-2 labs adicionales si el owner es compartido.
- Composition Shell: `no aplica` — deuda del dashboard/layout shell, no de una nueva superficie Composition Shell.
- Primitive decision: `reuse` — corregir wrappers/layout existentes; no crear primitive nueva.
- Adaptive density / The Seam: `no aplica` — no hay cards nuevas; validar que cards existentes no empujen ancho de pagina.
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: no copy nueva esperada; si emerge copy visible, debe ser local one-off de Lab o capa canonica segun alcance.
- Access impact: `none`.

### State inventory

- Default: rutas Design System sin scroll horizontal de pagina.
- Loading: no debe introducir ancho transitorio fuera de viewport.
- Empty: fuera de scope salvo que el shell vacio desborde.
- Error: error boundaries no deben ser el estado capturado.
- Degraded / partial: si un Lab degrada, debe seguir contenido en mobile.
- Permission denied: fuera de scope; route guard existente se mantiene.
- Long content: textos largos, chips, breadcrumbs, footer links y toolbars deben wrappear o contenerse.
- Mobile / compact: viewport 390px es el criterio principal de cierre.
- Keyboard / focus: no agregar scroll traps; cualquier region con scroll horizontal interno debe ser focusable y nombrada.
- Reduced motion: no agregar motion nueva; cualquier ajuste de layout debe respetar reduced motion existente.

### Interaction contract

- Primary interaction: navegacion/lectura del Lab, sin acciones nuevas.
- Hover / focus / active: conservar estados existentes; si se agrega scroll region, foco visible obligatorio.
- Pending / disabled: no aplica.
- Escape / click-away: no aplica.
- Focus restore: no aplica.
- Latency feedback: no aplica.
- Toast / alert behavior: no aplica.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: no agregar.
- Layout morph: no agregar.
- Stagger: no agregar.
- Timing / easing token: no aplica.
- Reduced-motion fallback: mantener comportamiento actual.
- Non-goal motion: no introducir animaciones para resolver layout.

### Visual verification

- GVC scenario: `design-system-nexa-chat`; agregar/usar otro scenario Design System si discovery muestra owner compartido.
- Viewports: desktop 1280px y mobile 390px.
- Required captures: first fold + marker afectado por el overflow; para `/design-system/nexa-chat`, `nexa-expression-cue-specimen` o equivalente.
- Required `data-capture` markers: usar markers existentes; agregar solo si falta un punto estable de shell.
- Scroll-width check: obligatorio, documentar `scrollWidth <= clientWidth` desktop y mobile 390px.
- Accessibility/focus checks: si hay scroll interno, validar nombre/foco; si no, confirmar que no se agregaron targets.
- Before/after evidence: registrar medicion before (`676 > 390`) y after.
- Known visual debt: no cerrar si queda page-level horizontal scroll en el route objetivo.

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

### Slice 1 — Reproduction and owner isolation

- Reproducir `/design-system/nexa-chat` en mobile 390px con agent auth.
- Ejecutar script Playwright que liste descendientes con `right > clientWidth`, `scrollWidth > clientWidth` o `left < 0`.
- Separar overflow del shell global vs overflow de Lab/specimen.
- Identificar el menor owner comun: dashboard layout, Design System layout, breadcrumb shell, navbar/footer, o Lab local.

### Slice 2 — Root-cause layout containment

- Aplicar fix en el owner correcto usando `minWidth: 0`, `minmax(0, 1fr)`, wrapping, accessible internal scroll o constraints responsive segun corresponda.
- Evitar parches route-locales si el offender esta en `src/components/layout/**` o en `DesignSystemBreadcrumbShell`.
- Mantener desktop byte-equivalente salvo donde el fix mejore containment.

### Slice 3 — GVC and guardrail evidence

- Ejecutar `pnpm fe:capture design-system-nexa-chat --env=local` o staging equivalente.
- Revisar frames PNG desktop y mobile.
- Medir `scrollWidth <= clientWidth` en desktop y mobile 390px despues del fix.
- Si la deuda afecta multiples labs, documentar un plan minimo para extender el gate o agregar un scenario especifico.

### Slice 4 — Documentation and closure

- Actualizar `Handoff.md` con before/after y el owner real.
- Actualizar `docs/architecture/ui-platform/HISTORIAL.md` solo si el fix cambia una regla vigente del shell o del Design System.
- Cerrar la task con task/ops/docs gates verdes.

## Out of Scope

- No redisenar el dashboard shell completo.
- No tocar `NexaExpressionCue`; TASK-1132 ya confirmo que la primitive no causa el overflow.
- No introducir un nuevo layout system para Design System.
- No corregir todos los labs historicos salvo que compartan exactamente el mismo owner.
- No cambiar guards, entitlements, route groups ni navegacion funcional.

## Detailed Spec

La medicion inicial conocida viene de TASK-1132:

```txt
route: /design-system/nexa-chat
viewport: 390x844
documentElement.scrollWidth: 676
documentElement.clientWidth: 390
nexa-expression-cue-specimen.scrollWidth: 310
nexa-expression-cue-specimen.clientWidth: 310
```

El cierre debe demostrar que el documento completo queda contenido. Si durante discovery se detecta que el overflow viene de una region horizontal intencional, esa region debe convertirse en scroll interno accesible. Si viene de grid/flex min-content, el fix esperado es contener el ancho intrinseco con `minWidth: 0`, `minmax(0, 1fr)`, wrap y/o breakpoint mobile.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (repro/owner) -> Slice 2 (fix) -> Slice 3 (GVC/scroll-width evidence) -> Slice 4 (docs/closure).
- No ejecutar Slice 2 antes de aislar el offender real; esconder overflow global sin owner conocido invalida la task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se oculta overflow real con clipping global y se pierden contenidos | UI / Design System | medium | Medir offender antes/despues; preferir owner local/comun correcto; revisar frames | `scrollWidth` verde pero contenido cortado en GVC |
| Fix en layout compartido rompe rutas dashboard no Design System | UI shell | low-medium | Scopear al layout Design System si es posible; si toca shell global, probar ruta adicional | GVC/browser route con header/footer colapsados |
| Region que requiere scroll horizontal queda inaccesible por teclado | a11y | low | Si se usa scroll interno, agregar role/aria/tabIndex y validar foco | QA/a11y tree sin region nombrada |
| Scenario GVC queda compensado con offsets fragiles en vez de corregir layout | tooling / QA | medium | Scroll-width check obligatorio; documentar before/after | `scrollWidth > clientWidth` post-fix |

### Feature flags / cutover

- Sin flag — correccion UI/layout interna y aditiva. Revert = revert del commit si emerge regresion.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | No cambia runtime | N/A | si |
| Slice 2 | Revertir commit o aplicar patch inverso del owner layout | <15 min | si |
| Slice 3 | Retirar cambios de scenario si solo eran evidencia | <10 min | si |
| Slice 4 | Revertir doc del cierre si no corresponde | <10 min | si |

### Production verification sequence

1. Validar local con GVC y Playwright `scrollWidth`.
2. Si el fix toca shell compartido global, ejecutar al menos una ruta dashboard no Design System en mobile 390px.
3. Correr `pnpm lint`, `pnpm exec tsc --noEmit --pretty false`, `pnpm task:lint --task TASK-1168`, `pnpm ops:lint --changed`, `pnpm docs:closure-check`.
4. No requiere deploy/flag/backfill.

### Out-of-band coordination required

- N/A — repo-only internal UI fix.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: layout`.
- [ ] Se identifico el owner real del overflow con evidencia Playwright/GVC.
- [ ] `/design-system/nexa-chat` mide `scrollWidth <= clientWidth` en desktop y mobile 390px.
- [ ] El fix no depende de clipping global ciego ni de offsets fragiles de scenario.
- [ ] Si existe scroll horizontal interno intencional, es accesible por teclado y tiene nombre.
- [ ] GVC desktop + mobile fue capturado y mirado despues del fix.
- [ ] `pnpm task:lint --task TASK-1168` reporta `errors=0`, `warnings=0`.
- [ ] `pnpm ops:lint --changed` y `pnpm docs:closure-check` quedan verdes al cierre.

## Verification

- `pnpm task:lint --task TASK-1168`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `AGENT_AUTH_BASE_URL=http://localhost:<port> pnpm fe:capture design-system-nexa-chat --env=local --task=TASK-1168`
- Playwright scroll-width check en desktop y mobile 390px.

## Closing Protocol

- [ ] `Lifecycle` del markdown queda sincronizado con el estado real.
- [ ] El archivo se mueve a `docs/tasks/complete/` al cerrar.
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` quedan sincronizados.
- [ ] `Handoff.md` documenta owner, before/after y cualquier deuda residual.
- [ ] No queda page-level horizontal scroll en el route objetivo.

## Follow-ups

- Si el overflow aparece en otros labs por causas distintas, crear tasks focales por owner en lugar de expandir esta sin limite.
