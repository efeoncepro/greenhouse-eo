# TASK-984 — Contractor Closure Drawer UI + Lifecycle Funnel

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Complete (2026-06-01) — develop`
- Rank: `TBD`
- Domain: `hr|ui`
- Blocked by: `TASK-797 (complete), TASK-975 (complete)`
- Branch: `develop` (trabajo directo por instrucción del operador 2026-06-01)
- Legacy ID: `none`

## Delta 2026-06-01 — Discovery correction + implementation (develop)

Corrección de discovery vs la suposición del spec inicial:

- `ContractorClosureSidecar.tsx` (TASK-975) es la **superficie self-service del contractor** (informativa, checklist hardcodeado, sin acciones) — NO la del operador HR. Se deja intacta.
- La regresión `409 use_closure_flow` estaba en `ContractorLifecycleControls.tsx` (inspector HR), que ofrecía `ending`/`ended` como transiciones genéricas tras el funnel de API de TASK-797.
- El drawer de operador es **NUEVO** (`ContractorClosureDrawer.tsx`), no un rework del sidecar self-service.

Implementado:

- **Slice 1 (funnel)**: `ContractorLifecycleControls` filtra `ending`/`ended` + CTA tonal "Cerrar contractor" (visible en active/paused/ending) → abre el drawer. Threaded vía `AdminInspector.onRequestClosure` → workbench owns el drawer state. Cierra la regresión.
- **Slice 2 (drawer)**: `ContractorClosureDrawer.tsx` — `GET /api/hr/contractors/[id]/closure` (readiness real: blockers acknowledgeable + advisories), form (causal `select`, fecha efectiva `type=date`, provider ref solo si payrollVia∈{deel,remote,oyster}, motivo ≥10, toggle post-closure), acciones `POST` initiate/execute. "Ejecutar" disabled hasta reconocer todos los blockers.
- **Slice 3 (copy + cleanup + docs)**: bloque `closure` en `src/lib/copy/contractor-compensation.ts` (es-CL, ux-writing); subtítulo nav `offboarding` → "Employee exit cases" (no insinúa contractors); doc funcional + manual.

Gates: tsc 0 · lint 0 · `pnpm build` exit 0 · boundary `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` 566 verde. GVC visual = sign-off del operador (dev server + agent auth) — pendiente de su validación.
- GitHub Issue: `none`

## Summary

Superficie de operador (drawer) para el **cierre de contractor** en el workbench HR `/hr/contractors`, consumiendo el flujo backend canónico de TASK-797 (`GET/POST /api/hr/contractors/[id]/closure`). Reemplaza el placeholder estático `ContractorClosureSidecar` (checklist hardcodeado) por la readiness real + acciones initiate/execute con acknowledge de blockers, y **funnelea** la lifecycle UI hacia el flujo de cierre (cierra la regresión introducida por el guard de API de TASK-797).

## Why This Task Exists

TASK-797 shipeó el backend del cierre contractor (readiness, comandos initiate/execute, post-closure policy, signal) + un **funnel de API**: la transición genérica `PATCH /api/hr/contractors/[id]` (action `transition`) ahora **rechaza targets `ending`/`ended`** con `409 use_closure_flow` para evitar bypass del gate de cierre.

Pero la UI quedó desalineada en dos frentes:

1. **Regresión viva**: `ContractorLifecycleControls.tsx` ofrece TODAS las transiciones de `ENGAGEMENT_TRANSITIONS[status]` como botones genéricos (incluye `ending` y `ended`) que llaman `action:'transition'`. Tras TASK-797 esos botones devuelven `409` → el botón de "Cerrar" en el inspector HR **está roto en `develop`**.
2. **Placeholder estático**: `ContractorClosureSidecar.tsx` (TASK-975) muestra un checklist **hardcodeado de 3 ítems**, sin leer la readiness real ni ofrecer acciones de cierre. No consume `GET .../closure`.

El cierre backend existe y está verificado (live smoke sobre EO-CENG-0001), pero **no hay forma de ejecutarlo desde la UI** salvo por API directa. Esta task cierra ese gap y la regresión.

## Goal

- Que HR pueda **iniciar y ejecutar** el cierre de un contractor desde `/hr/contractors`, viendo la readiness real (blockers + advisories) y reconociendo blockers con razón.
- Que la lifecycle UI **no ofrezca** transiciones crudas a `ending`/`ended` — esas se canalizan al drawer de cierre (alineado con el funnel de API).
- Cero regresión: el resto de transiciones (pause/resume/cancel) y la revisión de clasificación siguen igual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (Delta 2026-06-01 — TASK-797 closure)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `CLAUDE.md` → "Contractor Closure + Transition Controls invariants (TASK-797)" + "Operational Data Table Density Contract (TASK-743)" + "Navigation Reachability Governance (TASK-982)"

Reglas obligatorias:

- El cierre NUNCA expone "Calcular finiquito" ni causales DT (boundary TASK-890). Cero acoplamiento al flujo de finiquito.
- El cierre vive como **drawer/acción dentro de `/hr/contractors`**, NO como ítem de menú nuevo (doctrina IA TASK-982: hub-por-audiencia + header/row action + drawer). Decidido con skills `info-architecture` + `arch-architect` + `greenhouse-ux` (2026-06-01).
- Toda lectura de readiness pasa por `GET /api/hr/contractors/[id]/closure`; toda mutación por `POST` (initiate|execute|allow_post_closure_invoices). NUNCA recomputar readiness en cliente ni llamar la transición genérica para ending/ended.
- Microcopy es-CL vía `src/lib/copy/*` (skill `greenhouse-ux-writing` obligatoria). Estados con color + icono + label (nunca color solo).
- Tokens canónicos (`GREENHOUSE_DESIGN_TOKENS_V1.md`): Drawer anchor right; 1 CTA primary contained + N tonal; chips de estado semáforo; sin `monospace`.

## Normative Docs

- `docs/tasks/complete/TASK-797-contractor-closure-transition-controls.md` (contrato backend)
- `docs/tasks/complete/TASK-975-contractor-engagement-detail-lifecycle-classification.md` (workbench actual)

## Dependencies & Impact

### Depends on

- `TASK-797` — endpoint `GET/POST /api/hr/contractors/[id]/closure`, helpers `assessContractorClosureReadiness` / `initiate` / `execute` / `setPostClosureInvoicesAllowed`, tipos `ContractorClosure*` (en barrel `@/lib/contractor-engagements`). **Complete.**
- `TASK-975` — `ContractorAdminWorkbenchView`, `ContractorLifecycleControls`, `ContractorClosureSidecar`, `ContractorEngagementDetailDrawer`. **Complete.**

### Blocks / Impacts

- Cierra la regresión `use_closure_flow` del inspector HR.
- Impacta Person 360 / workbench HR (visibilidad del estado de cierre — read-only, ya cubierto por el detalle).

### Files owned

- `src/views/greenhouse/contractors/ContractorClosureSidecar.tsx` (rework → readiness real + acciones; o renombrar a `ContractorClosureDrawer`)
- `src/views/greenhouse/contractors/ContractorLifecycleControls.tsx` (filtrar `ending`/`ended` + CTA "Cerrar contractor")
- `src/views/greenhouse/contractors/ContractorAdminWorkbenchView.tsx` (wire del drawer) `[verificar uso del sidecar]`
- `src/lib/copy/` (microcopy de cierre — namespace o `agency`/`hr` existente `[verificar]`)
- `src/config/greenhouse-navigation-copy.ts` (ajuste subtítulo `offboarding`)
- `docs/documentation/hr/contratistas-engagement-ciclo-de-vida.md`, `docs/manual-de-uso/hr/contratistas.md`
- `tests/e2e/smoke/` (smoke opcional del flujo) `[verificar]`

## Current Repo State

### Already exists

- Backend de cierre completo + verificado (TASK-797): readiness fail-closed acknowledgeable, comandos atómicos, signal `hr.contractor_engagement.closed_with_open_payables`, evento `closure_initiated v1`.
- `ContractorClosureSidecar.tsx` — **placeholder estático** (checklist hardcodeado de 3 ítems, sin readiness real ni acciones; recibe `scenario` de la self-service projection).
- `ContractorLifecycleControls.tsx` — ofrece `ENGAGEMENT_TRANSITIONS[status]` como botones genéricos vía `action:'transition'`.
- `ContractorEngagementDetailDrawer.tsx`, `ContractorClassificationReviewDialog.tsx` — patrón de drawer/dialog del workbench a reusar.

### Gap

- El sidecar no consume `GET .../closure` (checklist falso, sin blockers reales ni acknowledge).
- No hay UI para `initiate`/`execute`/`allow_post_closure_invoices`.
- `ContractorLifecycleControls` ofrece `ending`/`ended` crudos → **409 `use_closure_flow` en runtime** (regresión).
- Subtítulo de nav `offboarding` dice "Labor and contractual exit cases" — insinúa (mal) que cubre contractors.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Funnel de la lifecycle UI (cierra la regresión)

- En `ContractorLifecycleControls`, filtrar `ending` y `ended` del set de transiciones genéricas ofrecidas (espejo UI del guard de API TASK-797).
- Reemplazar por un único CTA contextual "Cerrar contractor" (tonal) que abre el drawer de cierre, visible cuando `status ∈ {active, paused, ending}`.
- Verificar que pause/resume/cancel + revisión de clasificación quedan intactos.

### Slice 2 — Closure drawer (readiness real + acciones)

- Rework de `ContractorClosureSidecar` → drawer (anchor right) que en open hace `GET /api/hr/contractors/[id]/closure` y renderiza:
  - blockers reales con severidad (color+icono+label), cada uno con control "Reconocer + razón" (≥10 chars);
  - advisories (access handoff) informativos;
  - form: causal (`CustomAutocomplete` sobre `CONTRACTOR_CLOSURE_REASONS`), fecha efectiva (datepicker), ref terminación provider (solo Deel/EOR), razón (textarea ≥10), toggle "permitir invoices post-cierre".
- Acciones: "Iniciar cierre" (`POST action=initiate`) y "Ejecutar cierre" (`POST action=execute` con `acknowledgedBlockerCodes`). "Ejecutar" disabled mientras queden blockers sin reconocer (tooltip es-CL). Refrescar workbench `onClosed`.

### Slice 3 — Copy, labeling cleanup, docs + GVC

- Microcopy es-CL en `src/lib/copy/*` (skill `greenhouse-ux-writing`). Cero literal en JSX para estados/CTAs/errores reutilizables.
- Ajustar subtítulo `offboarding` en `greenhouse-navigation-copy.ts` → "Casos de salida de colaboradores" (no insinuar que cubre contractors).
- Actualizar doc funcional + manual; evidencia visual con **Greenhouse Visual Capture** (`pnpm fe:capture`) del drawer en los 3 estados (sin blockers / con blockers reconocibles / ejecutado).

## Out of Scope

- Cualquier cambio al backend de cierre (TASK-797 ya es el contrato — solo se consume).
- Finiquito / `final_settlements` / causales DT (boundary duro).
- Ítem de menú nuevo o reagrupación bajo "Offboarding/Salidas" (decisión IA 2026-06-01: NO; el cierre es drawer contextual, los workbenches quedan hermanos en HR → Supervisión).
- Automatización de provider termination API y asset/device recovery (out of scope de TASK-797).
- Surface de cierre en el portal self-service del contractor (`/my/contractor`) — el cierre lo opera HR.

## Detailed Spec

Ver el UX spec (text wireframe + component manifest) en el análisis IA/arch/ux del 2026-06-01 (Handoff). Resumen: Drawer anchor right 480px · `CustomAutocomplete` (causal) · datepicker wrapper (fecha) · `CustomTextField` multiline (razón) · checklist con `CustomChip` (semáforo color+icono+label) · 1 primary contained ("Ejecutar cierre") + 1 tonal ("Iniciar cierre") diferenciados por icono+copy. Consume `GET/POST /api/hr/contractors/[id]/closure`. Estados `loading|ready|degraded` honestos (skill `state-design`).

## Rollout Plan & Risk Matrix

UI-only sobre endpoints existentes + cierre de una regresión. Aditivo, reversible por revert de PR.

### Slice ordering hard rule

Slice 1 (funnel) primero — cierra la regresión viva antes de construir el drawer. Slice 2 depende de 1 (el CTA abre el drawer). Slice 3 al final (copy/docs/GVC).

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Romper otras transiciones (pause/cancel) al filtrar ending/ended | lifecycle UI | Baja | Filtrar solo ending/ended; test de que el resto se ofrece | revisión + smoke |
| Drawer recomputa readiness en cliente | UI | Baja | Consumir SIEMPRE `GET .../closure`; no replicar el evaluador | code review |
| Copy en inglés / literal en JSX | UI | Media | `greenhouse-ux-writing` + lint `no-untokenized-copy` | lint |
| Mostrar "Cerrar" en estado terminal (ended/cancelled) | UI | Baja | CTA visible solo en active/paused/ending | revisión |

### Feature flags / cutover

N/A — sin flag. La regresión existe ya en `develop`; Slice 1 la cierra de inmediato. No hay cutover de datos.

### Rollback plan per slice

| Slice | Rollback | Reversible? |
|---|---|---|
| 1 | revert commit (los botones genéricos vuelven, regresión 409 reaparece) | Sí |
| 2 | revert commit (sidecar vuelve a placeholder) | Sí |
| 3 | revert commit (copy/docs) | Sí |

### Production verification sequence

1. Agent auth + Playwright/GVC sobre `/hr/contractors`, seleccionar un engagement activo.
2. Verificar que "Cerrar contractor" abre el drawer y carga readiness real (no el checklist falso).
3. Iniciar cierre → estado "En cierre" + nuevas work submissions bloqueadas.
4. Ejecutar cierre con un blocker reconocido → engagement "Finalizado".
5. Confirmar que la transición genérica ya no ofrece ending/ended.

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] La lifecycle UI ya NO ofrece transiciones crudas a `ending`/`ended`; en su lugar hay un CTA "Cerrar contractor" que abre el drawer (regresión `use_closure_flow` cerrada). — `ContractorLifecycleControls` filtra ending/ended + CTA.
- [x] El drawer carga la readiness real desde `GET /api/hr/contractors/[id]/closure` (blockers + advisories), NO un checklist hardcodeado. — `ContractorClosureDrawer`.
- [x] El operador reconoce cada blocker (checkbox) y "Ejecutar cierre" queda disabled hasta que no queden blockers sin reconocer (`allBlockersAcknowledged`). El motivo del cierre exige ≥10 chars.
- [x] "Iniciar cierre" lleva a `ending`; "Ejecutar cierre" lleva a `ended`; ambos vía `POST .../closure` (action initiate|execute).
- [x] El toggle "permitir invoices post-cierre" se envía en `execute` y persiste vía `post_closure_invoices_allowed` (auditado por el backend TASK-797).
- [x] Cero "Calcular finiquito" en la superficie de cierre (drawer 100% contractor; nota explícita "no es finiquito").
- [x] Copy es-CL tokenizado (`GH_CONTRACTOR_COMPENSATION.closure`); subtítulo de nav `offboarding` → "Employee exit cases" (ya no insinúa contractors).
- [ ] **GVC visual sign-off (pendiente operador)**: capture del drawer en los 3 estados. Requiere fixture de engagement en `active`/`paused` (el único engagement actual `EO-CENG-0001` está en `draft`, no muestra el CTA). Gates automáticos (tsc/lint/build/boundary) verdes.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint` (incl. `greenhouse/no-untokenized-copy`)
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` — boundary non-regression gate (debe seguir verde).
- `pnpm build`
- GVC: `pnpm fe:capture` del drawer en los 3 estados + flujo initiate→execute con agent auth.

## Closing Protocol

- [x] Lifecycle and folder synchronized.
- [x] `docs/tasks/README.md` synchronized.
- [x] `Handoff.md` updated.
- [x] `changelog.md` entry.
- [x] Doc funcional actualizado (`hr/contratistas-engagement-ciclo-de-vida.md` v1.2 — drawer de cierre).

## Follow-ups

- Wayfinding "temporada de salidas" (si emerge): resolver con ⌘K o cross-link contextual, NUNCA con reagrupación de menú que borre la frontera cierre≠offboarding≠finiquito.

## Open Questions

- ¿El drawer reusa el patrón de `ContractorEngagementDetailDrawer` o el `OperationalPanel` del sidecar actual? (Resolver en Plan Mode mirando ambos.)
- ¿Dónde vive la microcopy: namespace nuevo en `src/lib/copy/dictionaries/es-CL/` o extender `hr`/`agency`? `[verificar convención vigente]`
