# TASK-1028 — Adaptive Sidecar UI Platform

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[none]`
- Status real: `Primitive reusable/idempotente y mockup no-Nexa implementados; piloto Nexa runtime pendiente`
- Rank: `TBD`
- Domain: `ui|platform|assistant|accessibility`
- Blocked by: `none`
- Branch: `develop` (operator override 2026-06-06 — no branch)
- Legacy ID: `[none]`
- GitHub Issue: `[optional]`

## Summary

Implementar la capacidad UI platform de **Adaptive Sidecar**: superficies contextuales que en desktop hacen que la UI se acomode y deje espacio al asistente, inspector, formulario contextual, preview o review panel, en vez de tapar el flujo con un overlay. Nexa puede ser un piloto, pero la capacidad NO es de Nexa: debe quedar validada para multiples usos de plataforma y al menos un flujo operacional no-Nexa.

## Why This Task Exists

Greenhouse ya tiene buenos patrones locales de rail/drawer, pero no tiene una primitive compartida ni reglas claras para distinguir sidecar in-flow, inspector rail, Drawer temporal y Dialog modal. Nexa desktop todavia usa una tarjeta fixed overlay (`NexaFloatingButton`) que tapa el contexto, pero ese es solo un sintoma: la misma capacidad debe servir para inspeccion operacional, review legal/financiero, previews de evidencia y formularios contextuales.

## Goal

- Crear primitives reutilizables `AdaptiveSidecarLayout` y `ContextualSidecar` en `src/components/greenhouse/primitives/`.
- Validar las variants `assistant`, `inspector`, `form`, `preview` y `review` en una ruta mockup/demo de plataforma.
- Migrar o validar el piloto Nexa desktop desde overlay fijo hacia sidecar adaptativo, con rollout guard y mobile Drawer preservado.
- Validar al menos un consumidor operacional no-Nexa con GVC.
- Formalizar reglas de uso para que futuras superficies no confundan sidecar, Drawer y Dialog.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_GSAP_ADOPTION_DECISION_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`

Reglas obligatorias:

- Desktop sidecar in-flow no debe usar `aria-modal=true` ni `role=dialog`.
- Mobile/tablet temporary mode puede usar MUI Drawer con focus trap.
- Dialog modal sigue siendo obligatorio para acciones destructivas, irreversibles, legales, financieras o maker-checker.
- La UI no implementa business logic; cualquier accion de sidecar consume primitives/readers/commands/API canonicos.
- Cualquier UI visible debe pasar por skills de Product Design aplicables y GVC en loop antes de declararse lista.
- No introducir libreria nueva de animation/drawer en V1 salvo que Plan Mode demuestre un gap concreto. Usar CSS/MUI transitions, `@/libs/FramerMotion`, View Transition helpers existentes y GSAP solo para excepciones avanzadas.

## Normative Docs

- `DESIGN.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`

## Dependencies & Impact

### Depends on

- MUI 7 Drawer/Dialog primitives already in the repo.
- Existing Greenhouse primitives under `src/components/greenhouse/primitives/`.
- Existing Nexa surface: `src/components/greenhouse/NexaFloatingButton.tsx`.
- Existing operational rail/panel surfaces in Workforce Contracting and HR Offboarding.
- Existing GVC tooling under `scripts/frontend/scenarios/`.
- Existing motion stack: MUI transitions/Drawer, `@/libs/FramerMotion`, `src/lib/motion/view-transition.ts`, `@formkit/auto-animate`, and GSAP wrappers for advanced-only cases.

### Blocks / Impacts

- Future Nexa assistant shell improvements.
- Future workbench inspector/review rails across HR, Finance, Commercial, People and Admin surfaces.
- Future document/evidence preview and contextual form surfaces.
- Future modal/drawer rationalization tasks.
- TASK-1018 may later strengthen visual-diff gates for this pattern.

### Files owned

- `src/components/greenhouse/primitives/AdaptiveSidecarLayout.tsx`
- `src/components/greenhouse/primitives/ContextualSidecar.tsx`
- `src/components/greenhouse/primitives/index.ts`
- `src/components/greenhouse/NexaFloatingButton.tsx`
- `src/views/greenhouse/home/HomeView.tsx`
- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/views/greenhouse/hr/workforce-contracting/WorkforceContractingStudioView.tsx`
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx`
- `src/components/greenhouse/organization-workspace/OrganizationWorkspaceShell.tsx`
- `scripts/frontend/scenarios/`
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`

## Current Repo State

### Already exists

- Nexa desktop fixed overlay in `src/components/greenhouse/NexaFloatingButton.tsx`.
- Nexa mobile Drawer behavior in the same component.
- `OperationalPanel` primitive for Greenhouse-styled operational surfaces.
- Workforce Contracting command center with sticky detail rail.
- HR Offboarding view with desktop operational panel + mobile Drawer fallback.
- Organization Workspace shell with `drawerSlot`.

### Gap

- No shared primitive for adaptive sidecar layout.
- No canonical responsive/focus/a11y contract for in-flow sidecars.
- Nexa desktop covers page content instead of making room.
- Non-Nexa rails/panels are good local patterns but do not yet prove a shared platform contract.
- GVC scenarios do not yet cover this pattern as a reusable platform capability.

### Implementation evidence — 2026-06-06

- `AdaptiveSidecarLayout` implementado como primitive client-side con modos `push|inline|overlay|temporary`, medicion real de ancho disponible via `ResizeObserver`, fallback por `mainMinWidth`, `data-capture`, `prefers-reduced-motion`, Drawer temporal y dirty-close guard.
- `ContextualSidecar` implementado como region `complementary`, no modal en desktop, con header/body/footer, estados `idle|loading|saving|error`, scroll containment, close control con microcopy canonico y `aria-busy`.
- Controller puro implementado en `adaptive-sidecar-controller.ts`: mode resolution, URL params (`sidecar`, `sidecarId`, `sidecarMode`), collision/replacement guard, telemetry event shape y reducer idempotente `reduceAdaptiveSidecarState()` para open/close/replace/dirty.
- Mockup real no-Nexa creado en `/platform/adaptive-sidecar/mockup`, con variants `assistant`, `inspector`, `form`, `preview`, `review`, modo desktop push/overlay y mobile bottom drawer.
- Scenarios GVC creados:
  - `adaptive-sidecar-platform-mockup` desktop: push, switch a form, inline y keyboard frames.
  - `adaptive-sidecar-platform-mobile-mockup` mobile: drawer open, close, re-open.
- Product Design/GVC finding corregido: el modo `push` no puede depender solo del viewport global; ahora usa ancho real del contenedor para evitar overflow en dashboard con sidebar.
- Product Design/GVC finding corregido: el selector de variant no vive en `CardHeader` en mobile; queda como control horizontal dentro del cuerpo para evitar compresion del header.
- Product Design/GVC finding corregido por feedback operador: la primera version parecia Drawer/card flotante en desktop. `ContextualSidecar` ahora usa chrome `adaptive` sin borde/sombra/radius propio, `AdaptiveSidecarLayout` separa columnas in-flow con divider estructural y `gap=0`, y el mockup desktop muestra una sola superficie recompuesta.
- Product Design/GVC finding corregido por feedback operador: el sidecar no debe ocupar solo el alto de una card/seccion. `AdaptiveSidecarLayout` ahora acepta `minHeight` y el mockup lo usa como shell-level canvas wrapper, de modo que la lane adaptativa toma el espacio vertical util de arriba a abajo.
- Product Design/GVC finding corregido por feedback operador: se elevo el nivel de microinteraccion con transiciones `AnimatePresence`/`motionKey`, hover/pressed states, save feedback inline y reduced-motion handling sin agregar libreria nueva.
- Product Design/GVC enterprise polish 2026: el primitive ahora tiene contenedor in-flow con borde/radius/sombra sutil, sidecar header sticky con surface blur, close affordance refinado, workbench con filas redondeadas y seleccion de alta señal. El mockup oculta el FAB legacy de Nexa mediante `data-nexa-floating-trigger` para evidenciar el patron nuevo sin colision visual.
- Reusable platform hardening: barrel exporta primitives, types y controller; tests focales cubren idempotencia de open, dirty close/replace block, forced close/replace y dirty-state writes repetidos.
- Evidencia final corregida: `.captures/2026-06-06T01-30-31_adaptive-sidecar-platform-mockup` y `.captures/2026-06-06T01-30-00_adaptive-sidecar-platform-mobile-mockup`.
- Gates focales actualizados: `pnpm vitest run src/components/greenhouse/primitives/__tests__/adaptive-sidecar-controller.test.ts src/components/greenhouse/primitives/__tests__/ContextualSidecar.test.tsx src/components/greenhouse/primitives/__tests__/AdaptiveSidecarLayout.test.tsx` (18 tests) y `pnpm exec tsc --noEmit --pretty false`.
- Residual risk documentado: el FAB global de Nexa puede competir con contenido cuando el drawer mobile se cierra; esto confirma que el collision model debe aplicarse al piloto Nexa/shell antes de habilitar runtime global.

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

### Slice 1 — Platform primitives

- Crear `AdaptiveSidecarLayout` con modos `push|inline|overlay|temporary`, breakpoints responsivos, dimensiones estables, reduced-motion y hooks `data-capture`.
- Crear `ContextualSidecar` con chrome enterprise, slots de header/body/footer/actions y estados `loading|ready|empty|degraded|error|permission|dirty|saving|saved`.
- Implementar el motion contract sin librerias nuevas: CSS/MUI para reflow y Drawer, `@/libs/FramerMotion` para layout/entrance polish si hace falta, View Transition helpers solo para navegacion con continuidad de identidad.
- Implementar contrato base de scroll containment: header/footer estables, body scrolleable, main scroll preservado y mobile Drawer con body scroll managed.
- Exportar desde `src/components/greenhouse/primitives/index.ts`.
- Agregar tests focales para mode resolution, a11y props basicas, focus restore y dirty-close callback si aplica.

### Slice 2 — Platform controller concerns

- Definir API de controller/hook para `ephemeral` vs `addressable` state.
- Definir comportamiento Back/close: cerrar sidecar si la apertura empujo history; limpiar query params sin perder filtros existentes.
- Definir collision model: un primary sidecar por surface; replacement bloqueado si hay dirty state.
- Definir dirty guards para close, Escape, backdrop, cambio de seleccion, reemplazo de sidecar y navegacion.
- Exponer optional instrumentation hooks (`opened`, `closed`, `mode_resolved`, `dirty_close_blocked`, `fallback_temporary`, `primary_action_invoked`, `error/degraded`) sin hardcodear analytics.
- Agregar tests focales para URL cleanup, dirty guard y replacement/collision.

### Slice 3 — Mockup/demo route + GVC scenario

- Crear una ruta mockup real del portal para validar las variants `assistant`, `inspector`, `form`, `preview` y `review` sin tocar runtime productivo.
- Usar mock data tipada y primitives Greenhouse; no HTML/CSS separado.
- Agregar scenario GVC desktop + mobile que capture closed/open states, scroll containment, dirty-state guard visual y al menos un estado degradado/loading.
- Verificar que la UI no se comprime ni oculta contenido clave.

### Slice 4 — Nexa desktop pilot

- Tratar Nexa como consumidor, no como owner de la capacidad.
- Migrar desktop Nexa desde fixed overlay a `AdaptiveSidecarLayout`.
- Mantener mobile como Drawer temporal.
- Mantener `/home` inline/thread behavior sin regresion.
- Resolver rollout guard en Plan Mode: preferir flag/rollout existente si hay uno compatible; si no, introducir guard UI-only default OFF para produccion hasta GVC/staging verde.
- Definir context DTO redacted para assistant: tenant, route, selected entity cuando aplique, allowed actions y redaction mode; no pasar "todo lo visible" como contexto.
- Capturar GVC en una ruta real con sidecar cerrado/abierto y mobile Drawer.

### Slice 5 — Non-Nexa operational validation

- Elegir un workbench candidato en Plan Mode: Workforce Contracting detail/review rail, HR Offboarding operational panel, o una surface operacional equivalente.
- No migrar todos los drawers.
- Demostrar que el nuevo primitive puede servir a un uso no-Nexa sin romper density, tables, filters ni detail rails.
- Validar un caso addressable si el workbench lo justifica (`?panel=...&id=...`) o documentar por que V1 queda ephemeral.
- La validacion debe producir evidencia GVC. Si la migracion runtime real es demasiado riesgosa, crear un adapter/documented mapping + demo operacional no-Nexa con el mismo data shape, y dejar explicito que runtime adoption queda como follow-up.

### Slice 6 — Documentation, governance, verification

- Actualizar docs de UI platform si la implementacion concreta difiere del ADR.
- Agregar adoption checklist en docs o en el primitive README: pattern kind, URL mode, Back behavior, main min width, mobile fallback, dirty guard, collision rule, data/API primitive, AI redaction, GVC frames, telemetry, y por que no Dialog/Wizard/route/inline rail.
- Crear o actualizar GVC scenarios canonicos.
- Ejecutar `pnpm design:lint`, checks focales, `pnpm route-reachability-gate --strict` si se agrega ruta runtime no mockup, y `pnpm fe:capture`.
- Invocar `greenhouse-documentation-governor` y cerrar docs/task lifecycle segun corresponda.

## Out of Scope

- Migrar todos los modals/drawers del portal.
- Cambiar la logica o tooling de Nexa/LLM.
- Crear nuevas actions de negocio para Nexa.
- Reescribir `OrganizationWorkspaceShell`.
- Introducir un nuevo design system o libreria de side panel.
- Introducir una libreria nueva de animacion para V1 (`react-spring`, `anime.js`, otra drawer lib, etc.) salvo ADR/task separada.
- Agregar sidecars resizables/pinneables en V1 sin ADR separada.
- Cambiar Dialogs de confirmacion destructiva/legal/financiera.
- Cambiar access model, entitlements o view registry salvo que el piloto cree una ruta runtime nueva no mockup.

## Detailed Spec

La implementacion debe seguir `GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`.

Requisitos minimos:

- Desktop push mode usa layout flow (`grid`/`flex`) y no `position: fixed` para el panel principal.
- El main content conserva ancho minimo configurable; si no cabe, la primitive cae a `temporary`/`overlay` segun contrato del caller.
- El sidecar tiene ancho estable por breakpoint y no genera layout shift por loading text, badges o actions.
- Trigger y sidecar tienen IDs/a11y coherentes.
- Mobile usa Drawer temporal con focus trap.
- Dirty state no cierra por Escape/backdrop sin confirmacion.
- GVC debe tener marcadores `data-capture` en root/main/panel/trigger.
- La primitive debe poder renderizar contenido assistant, inspector, form, preview y review sin branching especifico de Nexa.
- Motion debe respetar `prefers-reduced-motion`; en reduced motion, preservar orientacion con transiciones discretas o cambios instantaneos, nunca con desplazamientos grandes.
- URL mode debe ser explicito: `ephemeral` o `addressable`.
- Back behavior debe ser explicito y testeado.
- Un surface puede tener solo un primary sidecar abierto.
- Dirty state debe bloquear close/replacement/navigation/selection change hasta resolver confirmacion.
- Sidecar body puede scrollear, pero header/footer/action bar no deben perderse.
- Assistant context debe ser DTO explicito y redacted, nunca un dump del DOM o "todo lo visible".

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (primitives) -> Slice 2 (controller concerns) -> Slice 3 (platform mockup/GVC) -> Slice 4 (assistant/Nexa pilot) -> Slice 5 (non-Nexa operational validation) -> Slice 6 (docs/closure).
- Slice 4 MUST NOT ship enabled in production until the mockup/demo and real Nexa GVC captures are reviewed.
- Slice 5 MUST prove the capability is platform-grade and not Nexa-only, but MUST NOT broaden into a portal-wide drawer migration.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Sidecar comprime tablas o colas operativas hasta volverlas inutiles | UI | medium | `mainMinWidth`, fallback `temporary`, GVC desktop open/closed | GVC visual finding / operator review |
| Nexa sidecar pierde contexto o conserva contexto stale tras navegar | UI/Nexa | medium | route-aware state reset, closed/open capture after navigation | no signal V1; logs/GVC/manual |
| A11y regresion por tratar panel in-flow como modal | Accessibility | medium | semantic contract + tests + GVC axe | axe finding / test failure |
| Cambio visual se siente menos enterprise que el overlay actual | UI/Product Design | low-medium | Product Design skills + mockup route + GVC loop | enterprise review finding |
| Dirty form se cierra accidentalmente | UI | low | dirty guard + confirmation Dialog | test failure / manual QA |
| Back button navega fuera en vez de cerrar un sidecar addressable | UI/routing | medium | explicit history strategy + URL tests | test failure / manual QA |
| Dos primary sidecars compiten o se apilan | UI/platform | medium | controller collision rule + dirty replacement guard | test failure / GVC finding |
| Sidecar filtra contexto AI no autorizado | Security/Nexa | low-medium | explicit redacted context DTO + access-aware links/actions | security review / test failure |
| Footer de acciones desaparece en sidecars largos | UI/accessibility | medium | scroll containment + sticky footer/header + GVC long-content frame | GVC visual finding |

### Feature flags / cutover

Plan Mode debe escoger una de estas opciones:

- Reusar un flag/rollout guard existente si hay uno compatible con Nexa UI.
- Si no existe, introducir un guard UI-only para el piloto Nexa, default `false` en produccion hasta staging/GVC verde.

El flag no debe esconder una capability de negocio ni alterar autorizacion; solo controla el shell visual del assistant.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR or leave unused primitives | <10 min | si |
| Slice 2 | Revert controller/hook additions or leave unused | <10 min | si |
| Slice 3 | Remove mockup route/scenario or leave as reference | <10 min | si |
| Slice 4 | Disable rollout guard or revert Nexa component diff | <5 min via flag if implemented | si |
| Slice 5 | Revert workbench adoption or keep adapter only | <30 min | si |
| Slice 6 | Revert docs only if decision superseded by new ADR | <10 min | si |

### Production verification sequence

1. Local: primitives tests + focused lint/tsc.
2. Focused controller tests for URL cleanup, Back behavior, dirty guard, collision/replacement and instrumentation hooks.
3. Local GVC platform mockup desktop/mobile across assistant, inspector, form, preview and review variants.
4. Local/staging Nexa capture closed/open desktop and mobile Drawer.
5. Non-Nexa operational capture closed/open desktop and mobile fallback or documented adapter demo.
6. Staging: enable pilot guard for agent/operator cohort only if runtime Nexa migration ships.
7. Verify no console/hydration errors and no obvious axe violations.
8. If approved, enable production guard gradually or keep disabled until a release task authorizes it.
9. Monitor user/operator feedback; rollback by flag if sidecar hurts density.

### Out-of-band coordination required

- Product Design review of mockup and Nexa pilot captures.
- Operator approval before enabling the Nexa adaptive sidecar in production.
- No external platform/secret/provisioning work expected.
