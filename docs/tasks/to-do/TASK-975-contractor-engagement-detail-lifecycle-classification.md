# TASK-975 — Contractor Engagement Detail + Lifecycle + Classification Review

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr|ui`
- Blocked by: `none`
- Branch: `task/TASK-975-contractor-engagement-detail-lifecycle`
- Legacy ID: `none`

## Summary

Construye la superficie HR de **detalle + ciclo de vida** del contractor engagement. Hoy el workbench HR (`/hr/contractors`, TASK-796/968) muestra la cola de revisión + el editor de compensación, pero **no hay controles de ciclo de vida** (activar/pausar/reanudar/iniciar cierre/finalizar/cancelar), **no hay revisión de riesgo de clasificación** (modal), ni **edición completa de términos** (más allá de la tarifa). Esta task cablea los endpoints `PATCH /api/hr/contractors/[id]` (`action=transition|review_classification|update`) ya existentes.

## Why This Task Exists

Auditoría 2026-05-31 del EPIC contractors: el engagement tiene una state machine completa (7 estados, 9 transiciones operador-iniciadas) + revisión de clasificación + edición de términos, todo en backend, pero la UI HR cubre solo ~20% (cola + compensación). Caso concreto bloqueante: **Valentina Hoyos (`EO-CENG-0001`) está en `classification_risk_status='needs_review'` ahora mismo** — sin una UI de revisión de clasificación, HR no puede revisarlo/limpiarlo; si escala a bloqueante, congela activación + pagos. Además no hay forma de pausar/cerrar/cancelar un engagement ni de editar payment model / FX policy / provider refs / flags de invoice-aprobación / bonus / fecha fin desde el portal.

## Goal

- Detalle del engagement (términos completos, fechas, tax, clasificación, payment rail) dentro de `/hr/contractors`.
- Controles de ciclo de vida: activar, pausar, reanudar, iniciar cierre, finalizar, cancelar (las transiciones operador-iniciadas de la state machine).
- Modal de **revisión de riesgo de clasificación** (`reviewContractorClassification`): factores, flag reviewed, override block opcional, motivo. SoD: distinto de quien creó el engagement.
- Edición completa de términos (`updateContractorEngagement`) más allá de la tarifa que ya cubre TASK-968.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Mandatory Skills (OBLIGATORIO — no negociable)

Esta task **DEBE** ejecutarse invocando **las skills de product design** en loop con GVC, igual que TASK-968. NO se permite escribir runtime sin haber pasado por el loop de product design + mockup aprobado. Las skills de product design canónicas a invocar:

1. **`greenhouse-mockup-builder`** — mockup como ruta real (`src/app/(dashboard)/hr/contractors/engagement/mockup/page.tsx` + `src/views/greenhouse/contractors/mockup/*`), mock data tipada, Vuexy/MUI wrappers, primitives del repo. NO HTML aparte.
2. **`greenhouse-ux`** + **`modern-ui`** — layout del detalle, jerarquía, selección de componentes, representación visual de la state machine (stepper/estado actual + transiciones disponibles), tokens 2026.
3. **`forms-ux`** — el modal de revisión de clasificación y los diálogos de transición (pausar/cerrar/cancelar con motivo) + el form de edición de términos deben pasar el 17-row floor.
4. **`greenhouse-microinteractions-auditor`** — feedback de transición de estado, motion del cambio de lifecycle.
5. **`greenhouse-ux-writing`** — copy es-CL antes de escribirlo (estados del engagement, factores de clasificación, CTAs, motivos, aria); extender `src/lib/copy/*`.
6. **`greenhouse-payroll-auditor`** — esta task toca clasificación laboral (riesgo de reclasificación) + términos del contractor; invocar para validar invariantes (TASK-790 classification risk, boundary honorarios/Deel).

**Loop GVC obligatorio**: `pnpm fe:capture` en loop con las skills de product design hasta enterprise 2026 + aprobación del operador del mockup + verificación runtime GVC.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (state machine engagement, classification risk first-class)
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` + `DESIGN.md`

Reglas obligatorias:

- **NO** crear endpoints nuevos: `PATCH /api/hr/contractors/[id]` ya soporta `action=transition|review_classification|update`. UI-only.
- **NO** transicionar fuera de la matriz canónica (el backend + el trigger DB lo enforzan; la UI solo ofrece las transiciones válidas desde el estado actual).
- **Riesgo de clasificación**: un engagement fresco nunca auto-clarea; `clear` exige review explícito. Activar requiere riesgo no bloqueante. La UI debe reflejar esto (no ofrecer "activar" si el riesgo es bloqueante).
- **SoD**: `review_classification` usa capability `hr.contractor_classification:approve` (distinta de `hr.contractor_engagement:update`); quien revisa idealmente ≠ quien creó.
- **Boundary EPIC-013/TASK-956/957**: NO mutar `member.contract_type` / `payroll_via` / `pay_regime` / finiquito desde acá. La transición empleado→contractor es TASK-976, no esta task. Gate: `pnpm vitest run src/lib/payroll` verde.

## Normative Docs

- `CLAUDE.md` → "Contractor Engagements invariants (TASK-790)" + "Contractor domain ↔ Finiquito/Offboarding non-regression boundary".

## Dependencies & Impact

### Depends on

- Backend completo: `src/lib/contractor-engagements/store.ts` (`transitionContractorEngagement`, `reviewContractorClassification`, `updateContractorEngagement`) + `state-machine.ts`.
- `PATCH /api/hr/contractors/[id]` (3 acciones, ya en runtime).
- Workbench HR existente `/hr/contractors` (TASK-796/968) — se extiende, no se reemplaza.

### Blocks / Impacts

- Desbloquea limpiar el `needs_review` de Valentina (`EO-CENG-0001`).
- Complementa TASK-974 (Finanzas) y TASK-976 (onboarding) — los 3 forman el set completo de superficies del EPIC.

### Files owned

- `src/views/greenhouse/contractors/ContractorEngagementDetailDrawer.tsx` (o panel en el inspector)
- `src/views/greenhouse/contractors/ContractorClassificationReviewDialog.tsx`
- `src/views/greenhouse/contractors/ContractorLifecycleControls.tsx`
- `src/views/greenhouse/contractors/ContractorEngagementCompensationDrawer.tsx` (extender a términos completos, o drawer separado)
- `src/views/greenhouse/contractors/mockup/*`
- `src/lib/copy/contractor-compensation.ts` (extender)
- `scripts/frontend/scenarios/contractor-engagement-detail.scenario.ts`

## Current Repo State

### Already exists

- State machine engagement completa + 3 helpers (`transitionContractorEngagement`, `reviewContractorClassification`, `updateContractorEngagement`).
- Workbench HR con cola + `CompensationPanel` + `ContractorEngagementCompensationDrawer` (TASK-968, edita solo rate/cadencia).
- `classification-risk.ts` (`computeClassificationRisk`, `isClassificationRiskBlocking`).

### Gap

- Sin detalle de engagement, sin controles de lifecycle, sin modal de clasificación, sin edición de términos completos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Mockup aprobado (GVC + skills de product design)

- Mockup: detalle del engagement + controles de lifecycle + modal de clasificación + edición de términos.
- Loop GVC + skills hasta enterprise 2026 + aprobación del operador.

### Slice 1 — Detalle del engagement (read)

- Panel/drawer de detalle: términos (payment model, rate, cadencia, moneda, FX policy), fechas, tax compliance owner, riesgo de clasificación (estado + factores), payment rail, relación legal.
- Representación visual de la state machine (estado actual + transiciones disponibles).

### Slice 2 — Controles de ciclo de vida

- Botones/diálogos para las transiciones operador-iniciadas válidas desde el estado actual: `draft→pending_review|active|cancelled`, `pending_review→active|draft|cancelled`, `active→paused|ending|cancelled`, `paused→active|ending|cancelled`, `ending→ended|active|cancelled`. `POST PATCH action=transition` con motivo.
- Ocultar "activar" si el riesgo de clasificación es bloqueante (reflejar el guard del backend).

### Slice 3 — Revisión de clasificación + edición de términos

- Modal `review_classification`: factores (schedule/supervision/exclusividad/dependencia económica/rol interno), flag reviewed, override block opcional, motivo. Capability `hr.contractor_classification:approve`.
- Edición completa de términos (`update`): payment model, FX policy, provider refs, requiresInvoice, requiresWorkApproval, bonus policy, end date — además del rate que ya cubre TASK-968.

### Slice 4 — Cierre

- Docs (funcional + manual). GVC runtime. CLAUDE.md invariants + arch Delta si emerge regla.

## Out of Scope

- Pagos/payables → TASK-974.
- Onboarding/crear engagement + transición empleado→contractor → TASK-976.
- Cualquier cambio a endpoints/state machine/helpers (UI-only).

## Detailed Spec

**Transiciones operador-iniciadas** (state machine TASK-793/790): la UI ofrece solo las salidas válidas del estado actual y rechaza el resto (el backend + trigger DB son la fuente de verdad). Cada transición que no sea "activar" desde un estado simple debería pedir motivo.

**Modal de clasificación** — `reviewContractorClassification({ factors, reviewed, block?, reason })`. `factors` es el dict de señales de subordinación; `reviewed=true` es lo único que permite `clear`. Si un engagement `active` escala a bloqueante, el backend auto-pausa — la UI debe mostrar ese efecto.

**Estados visibles**: `draft`, `pending_review`, `active`, `paused`, `ending`, `ended` (terminal), `cancelled` (terminal). Más `classification_risk_status`: `needs_review`, `clear`, `legal_review_required`, `blocked`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 0 (mockup) → 1 (detalle read) → 2 (lifecycle) → 3 (clasificación + edición) → 4 (cierre). Slice 2 antes de 3 porque el detalle + lifecycle son la base sobre la que viven los diálogos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ofrecer transición inválida (activar con riesgo bloqueante) | hr | low | UI deriva transiciones del estado + riesgo; backend + trigger rechazan igual | `hr.contractor_engagement.classification_risk_open` |
| Reclasificación errónea (clear sin review real) | identity/legal | medium | `clear` exige `reviewed=true` + motivo; capability `hr.contractor_classification:approve` distinta | `hr.contractor_engagement.classification_risk_open` |
| Regresión payroll/finiquito por tocar dominio compartido | payroll | low | UI-only; NO toca member/contract_type; gate `pnpm vitest run src/lib/payroll` | n/a |

### Feature flags / cutover

Sin flag — superficie UI nueva gateada por capability + viewCode (reusa `equipo.contratistas`). Additive, cutover inmediato.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0-4 | revert PR (UI additive, sin migración de datos) | <10 min | sí |

### Production verification sequence

1. Deploy staging + verify el detalle del engagement de Valentina carga con `needs_review` visible.
2. Ejecutar el modal de clasificación en staging (review → clear) + verify el estado cambió.
3. Ejecutar una transición de lifecycle (pause/resume) en un engagement de prueba.
4. Repetir en prod.

### Out-of-band coordination required

N/A — repo-only change (la revisión de clasificación es decisión HR interna; no toca sistemas externos).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Mockup aprobado por el operador (loop GVC + skills de product design).
- [ ] HR puede ver el detalle del engagement, ejecutar transiciones de lifecycle válidas, revisar clasificación y editar términos completos desde `/hr/contractors`.
- [ ] La UI solo ofrece transiciones válidas del estado actual; "activar" oculto si el riesgo es bloqueante.
- [ ] El modal de clasificación usa la capability distinta + exige motivo.
- [ ] Copy es-CL tokenizado.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm vitest run src/lib/payroll` (no-regresión EPIC-013)
- `pnpm design:lint`
- GVC runtime.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-968, TASK-974, TASK-976)
- [ ] CLAUDE.md invariants + arch Delta + doc funcional + manual

## Follow-ups

- Si emerge necesidad de bulk-actions (revisar clasificación de N engagements), evaluar en V1.1.

## Open Questions

- ¿Detalle como drawer dentro del workbench o página dedicada `/hr/contractors/[id]`? (decidir en Plan Mode con greenhouse-ux).
