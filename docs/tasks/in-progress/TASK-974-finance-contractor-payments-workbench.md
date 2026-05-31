# TASK-974 — Finance Contractor Payments Workbench

## MOCKUP APROBADO 2026-05-31 — reglas duras (vinculante)

El operador aprobó el mockup (Slice 0, commit del mockup en `develop`). El runtime DEBE basarse en él, no rediseñar. Referencia visual vinculante: `src/views/greenhouse/finance/contractor-payments/mockup/`. Ruta del mockup: `/finance/contractor-payments/mockup`.

**Decisiones aprobadas (no cambiar sin re-aprobación):**

- **Ruta runtime canónica**: `/finance/contractor-payments`, item nuevo en el submenú **Tesorería** (junto a `payment-orders` + `cash-out`). NO tab dentro de payment-orders ni cash-out (lifecycles distintos).
- **Layout**: header (eyebrow TESORERÍA + título + 2 CTAs) → KPI row (4: Por preparar / Bloqueados / Listos para Finanzas / Pagados, con count + monto neto) → 2 columnas **`lg={8}/lg={4}`** (lista + detalle al lado a 1440, NO `xl`).
- **Lista**: `DataTableShell` + filtro por estado. Columnas: Contractor, Origen, Bruto, Neto (bold), Vence, Estado (chip por `STATUS_TONE`), Acción.
- **Detalle**: desglose **Bruto − Retención SII = Neto** (acento verde `#2E7D32` solo en el neto) + nota contable "el neto va al banco, la retención se remesa al SII por separado" (refleja TASK-977). Readiness panel con los 13 blockers + **responsable** (Finanzas/HR/Contractor). Acciones de gobernanza.
- **Override reubicado**: aparece en el detalle del payable en **Finanzas** (no en el workbench HR), solo cuando el blocker es `payment_exceeds_agreed_amount`. El waiver aparece cuando es `payment_profile_unresolved`.
- **Crear**: diálogo desde-envío (preview neto) + off-cycle (engagement + bruto + motivo ≥10 + preview neto).
- **Copy**: `GH_FINANCE_CONTRACTOR_PAYMENTS` (`src/lib/copy/finance-payments.ts`) — tokenizado, es-CL.
- **Microinteracciones**: entrada escalonada framer-motion + fade en cambio de selección, reduced-motion aware.
- **Breakdown verbatim**: bruto/retención/neto se leen del payable, NUNCA se recalculan en runtime (la retención viene del snapshot del engagement, TASK-794).

Cualquier desviación visual requiere update + re-aprobación del mockup ANTES de mergear (regla TASK-863).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|ui`
- Blocked by: `none`
- Branch: `task/TASK-974-finance-contractor-payments-workbench`
- Legacy ID: `none`

## Summary

Construye la superficie de **operador Finanzas** para procesar los pagos a contractors. Hoy todo el backend de payables (TASK-793/794/795/968) está completo y operativo, pero **Finanzas tiene 0% de UI**: ningún operador puede ver, crear, evaluar readiness, enviar a Finanzas, cancelar, waivear ni autorizar un pago de contractor desde el portal. Esta task cierra el ciclo de pago end-to-end con un workbench Finanzas que cablea los 7 endpoints existentes.

## Why This Task Exists

Auditoría 2026-05-31 del EPIC contractors (cross-map de 17 endpoints × 3 state machines × superficies UI): el dominio tiene backend completo pero la UI cubre solo 2 de 3 audiencias (contractor self-service ✅, HR workbench ~70% ✅). **Finanzas = 0% UI** pese a tener todos los endpoints listos. Consecuencia operativa real: el pago de Valentina Hoyos (`EO-CENG-0001`, $600.000 honorarios CL) solo se puede crear por API/script — no hay pantalla donde Finanzas calcule el neto (bruto − retención SII) y dispare el pago. El override de monto acordado (TASK-968) quedó provisionalmente en el workbench HR (`ContractorGuardrailPanel`), lo cual es una ambigüedad de SoD: la capability es de Finanzas pero el botón vive en superficie HR.

## Goal

- Workbench Finanzas runtime `/finance/contractor-payables` (o ruta canónica equivalente) que lista payables por estado + filtros + KPIs.
- Detalle del payable con panel de **readiness completo** (TODOS los blockers, no solo el guardrail) + breakdown bruto/retención/neto.
- Crear payable desde envío aprobado (el "calcular el pago") + crear payable off-cycle (ajuste/bono/reembolso).
- Acciones de gobernanza: enviar a Finanzas (`ready`), cancelar, waivear perfil de pago, override de monto acordado.
- Reubicar el override de monto acordado a Finanzas; dejar el panel HR read-only ("hay un pago bloqueado, lo resuelve Finanzas").

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Mandatory Skills (OBLIGATORIO — no negociable)

Esta task **DEBE** ejecutarse invocando **las skills de product design** en loop con GVC, igual que TASK-968. NO se permite escribir runtime sin haber pasado por el loop de product design + mockup aprobado. Las skills de product design canónicas a invocar:

1. **`greenhouse-mockup-builder`** — construir el mockup como ruta real del portal (`src/app/(dashboard)/finance/contractor-payables/mockup/page.tsx` + `src/views/greenhouse/contractors/mockup/*`), con mock data tipada, Vuexy/MUI wrappers y primitives del repo. NO HTML/CSS aparte.
2. **`greenhouse-ux`** + **`modern-ui`** — layout, jerarquía visual, selección de componentes, densidad (tabla operativa → respetar el contrato `DataTableShell` TASK-743), tokens canónicos, motion 2026.
3. **`forms-ux`** — los dos formularios de creación de payable (desde envío + off-cycle) y los diálogos de readiness/override/waiver/cancel deben pasar el 17-row floor (label sobre input, validación 3-stage, errores inline, submit con verbo de acción, etc.).
4. **`greenhouse-microinteractions-auditor`** — feedback de estado, transiciones de readiness, loading states de las acciones.
5. **`greenhouse-ux-writing`** — TODO el copy es-CL antes de escribirlo (CTAs, estados, empty states, errores, aria); extender `src/lib/copy/*` (NO literals en JSX).
6. **`greenhouse-finance-accounting-operator`** — esta task toca finance/payables/retención SII: invocar para validar contratos canónicos (TASK-766/768/793/794) y la presentación de bruto/retención/neto.

**Loop GVC obligatorio**: `pnpm fe:capture` en loop con las skills de diseño hasta calidad enterprise 2026, aprobación del operador del mockup, y luego verificación runtime con GVC. El mockup aprobado queda como referencia vinculante (regla TASK-863 Semantic Column Invariants para documentos/tablas con montos por entidad).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (state machine payables, readiness fail-closed, bridge a Finance)
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` + `DESIGN.md`
- `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md` (contrato densidad TASK-743)

Reglas obligatorias:

- **NO** crear endpoints nuevos: los 7 ya existen (`/api/finance/contractor-payables` GET/POST + `[id]` GET + `[id]/{ready,cancel,override-agreed-amount,waive-payment-profile}` POST). Esta task es UI-only sobre backend existente.
- **NO** recomputar montos en cliente: bruto/retención/neto se leen verbatim del payable (contrato TASK-793/794). La retención SII viene del snapshot del engagement (TASK-758/794), NUNCA recalculada en UI.
- **NO** mostrar `$0` ambiguo: distinguir `loading | empty | degraded | ready`. Montos vía `formatCurrency` (no `toLocaleString`).
- **SoD**: la acción override (`finance.contractor_payable.override_agreed_amount`) vive en Finanzas; el panel HR existente (`ContractorGuardrailPanel`) pasa a read-only.
- **Boundary EPIC-013/TASK-957**: cero cambios a payroll engine / `payroll_entries` / `contract_type` / finiquito. Gate de cierre: `pnpm vitest run src/lib/payroll` verde.
- Auth: `requireFinanceTenantContext` + `can(tenant, 'finance.contractor_payable', '<action>', 'tenant')` en cada surface; los diálogos override/waiver usan sus capabilities distintas.

## Normative Docs

- `CLAUDE.md` → "Contractor Payables → Finance bridge invariants (TASK-793)" + "Contractor Agreed-Amount SoD + Guardrail invariants (TASK-968)" + "Operational Data Table Density Contract (TASK-743)".

## Dependencies & Impact

### Depends on

- Backend completo: `src/lib/contractor-engagements/payables/*` (store, state-machine, readiness) — TASK-793/794/795/968.
- Endpoints `/api/finance/contractor-payables/**` (los 7, ya en runtime).
- `assessPayableReadiness` (devuelve `{ ready, blockers[] }`) para el panel de readiness.

### Blocks / Impacts

- Desbloquea el procesamiento de pagos de Valentina (`EO-CENG-0001`) y de todo contractor futuro desde el portal.
- TASK-968 `ContractorGuardrailPanel` (HR) pasa a read-only — actualizar.
- Complementa TASK-960 (comprobante de pago, ya runtime) cerrando el paso previo (crear/pagar el payable).

### Files owned

- `src/app/(dashboard)/finance/contractor-payables/page.tsx` (+ `/mockup/page.tsx`)
- `src/views/greenhouse/contractors/ContractorPayablesWorkbenchView.tsx` (+ drawers/diálogos)
- `src/views/greenhouse/contractors/mockup/*` (mockup nuevo)
- `src/lib/copy/contractor-compensation.ts` (extender) o `src/lib/copy/contractor-payables.ts` (nuevo)
- `src/lib/contractor-engagements/payables/workbench-projection.ts` (read-only projection si se necesita componer la lista + readiness)
- `scripts/frontend/scenarios/contractor-payables-workbench.scenario.ts`
- viewCode `finanzas.contractor_payables` (migración seed view_registry + role_view_assignments, regla TASK-827)

## Current Repo State

### Already exists

- 7 endpoints Finanzas operativos + 19 helpers de store + state machine completa (`pending_readiness → ready_for_finance → obligation_created → payment_order_created → paid` + `blocked` + `cancelled`).
- `ContractorGuardrailPanel` (TASK-968) — único punto UI que toca payables hoy (override desde HR).
- Mockup aprobado de compensación (TASK-968) como referencia de estilo del dominio.

### Gap

- Ninguna página Finanzas. Ningún list/detail. Ningún create-payable. Ningún readiness panel completo. Ningún ready/cancel/waive desde UI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Mockup aprobado (GVC + skills de diseño)

- Mockup ruta real `/finance/contractor-payables/mockup` con los 4 estados (lista, detalle+readiness, crear-desde-envío, crear-off-cycle) + diálogos (ready/cancel/waive/override).
- Loop GVC + skills hasta enterprise 2026 + aprobación del operador.

### Slice 1 — Lista + detalle + readiness (read)

- Workbench `/finance/contractor-payables`: tabla por estado (`DataTableShell`), filtros, KPIs (pendientes/bloqueados/listos/pagados + monto total neto).
- Drawer de detalle: breakdown bruto/retención/neto + panel de readiness con TODOS los blockers (de `assessPayableReadiness`).

### Slice 2 — Crear payable (calcular el pago)

- Form "crear desde envío aprobado" (selecciona engagement → envío aprobado → preview neto calculado → crear). `POST /api/finance/contractor-payables` (`contractorWorkSubmissionId`).
- Form "crear off-cycle" (ajuste/bono/reembolso; bruto + moneda + motivo ≥10). `POST` (`contractorEngagementId`).

### Slice 3 — Acciones de gobernanza

- Enviar a Finanzas (`POST /[id]/ready`) con manejo del 409 `payable_not_ready` (mostrar blockers).
- Cancelar (`POST /[id]/cancel`, motivo opcional).
- Waiver perfil de pago (`POST /[id]/waive-payment-profile`, reason ≥10, capability).
- Override monto acordado (`POST /[id]/override-agreed-amount`, reason ≥10, capability admin-only) — **reubicado desde HR**.

### Slice 4 — SoD cleanup + cierre

- `ContractorGuardrailPanel` (HR) → read-only (quita el botón override, deja "lo resuelve Finanzas" + link al workbench).
- viewCode + migración seed (regla TASK-827). Docs (funcional + manual). GVC runtime.

## Out of Scope

- Lifecycle del engagement (pausar/cerrar/etc.) → TASK-970.
- Onboarding/crear contractor → TASK-971.
- Cualquier cambio a endpoints/state machine/helpers (UI-only sobre backend existente).
- Automatizar el bridge → Finance obligations (ya reactivo, TASK-793).

## Detailed Spec

**Estados del payable a renderizar** (state machine TASK-793): `pending_readiness` (recién creado), `blocked` (falló readiness — mostrar blockers), `ready_for_finance` (enviado al bridge), `obligation_created` / `payment_order_created` (en curso por el bridge, read-only), `paid` (terminal → link al comprobante TASK-960), `cancelled` (terminal).

**Panel de readiness** — consumir `assessPayableReadiness(payable) → { ready, blockers[] }`. Blocker codes a mapear a copy es-CL accionable: `source_not_approved`, `invoice_asset_missing`, `net_mismatch`, `currency_unsupported`, `fx_unresolved`, `fx_policy_unresolved`, `payment_profile_unresolved`, `provider_split_missing`, `classification_risk_blocking`, `rut_unverified`, `honorarios_withholding_mismatch`, `tax_owner_review_required`, `payment_exceeds_agreed_amount`. Cada blocker indica responsable (Finanzas vs HR vs contractor) y, si aplica, la acción (waiver/override).

**Breakdown del monto** — bruto, retención (SII para honorarios CL), neto = bruto − retención. Leer verbatim del payable; NUNCA recalcular. Para honorarios mostrar la tasa snapshot (TASK-794).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 0 (mockup aprobado) → Slice 1 (read) → Slice 2 (create) → Slice 3 (governance) → Slice 4 (SoD cleanup + cierre). El override no se reubica (Slice 3/4) hasta que el workbench Finanzas exista (Slice 1-3), para no dejar el override sin hogar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Mostrar monto recalculado en cliente (drift vs backend) | finance/UI | medium | Leer verbatim del payable; lint anti-recompute; review finance skill | `finance.contractor_payable.exceeds_agreed_amount` |
| Crear payable duplicado de un envío ya consumido | finance | low | El backend ya dup-guarda (UNIQUE + lock); UI muestra el estado consumido | n/a (backend enforced) |
| Override accesible a rol equivocado | identity | low | Capability server-side (`override_agreed_amount`); botón solo si `can(...)` | n/a |
| Regresión payroll por tocar dominio compartido | payroll | low | UI-only; gate `pnpm vitest run src/lib/payroll` | n/a |

### Feature flags / cutover

Sin flag — superficie UI nueva gateada por capability + viewCode. Cutover inmediato al merge (no muta data; solo expone acciones ya existentes). El guardrail de monto sigue detrás de su flag `CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED` (TASK-968).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0-4 | revert PR (UI additive, sin migración de datos; la migración de viewCode es seed idempotente reversible vía `granted=FALSE`) | <10 min | sí |

### Production verification sequence

1. Deploy a staging + verify `/finance/contractor-payables` carga (lista vacía honesta o con payables reales).
2. Crear payable de prueba desde un envío aprobado en staging + verify neto correcto vs `assessPayableReadiness`.
3. Ejecutar ready/cancel/waive/override en staging contra un payable de prueba.
4. Verify el panel HR pasó a read-only.
5. Repetir en prod con cooldown.

### Out-of-band coordination required

Comunicar a Finanzas que ya tienen pantalla para procesar pagos de contractors (cambio de proceso operativo: dejan de depender de API/script).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Mockup aprobado por el operador (loop GVC + skills de diseño).
- [ ] Finanzas puede ver, crear (desde envío + off-cycle), evaluar readiness, enviar a Finanzas, cancelar, waivear y autorizar override de un payable desde `/finance/contractor-payables`.
- [ ] El breakdown bruto/retención/neto se lee verbatim del backend (cero recompute).
- [ ] El override quedó reubicado en Finanzas; el panel HR es read-only.
- [ ] Copy es-CL tokenizado (skill UX writing); densidad de tabla respeta `DataTableShell`.
- [ ] viewCode + migración seed (regla TASK-827).

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm vitest run src/lib/payroll` (no-regresión EPIC-013)
- `pnpm design:lint`
- GVC runtime de las 4 superficies + diálogos.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-968 panel HR, TASK-970/971)
- [ ] CLAUDE.md invariants + arch Delta + doc funcional + manual

## Follow-ups

- Auto-resolve del perfil de pago (V1.1 del readiness, hoy waiver manual).
- Vista de timeline del payable (obligation → payment order → paid) si se necesita trazabilidad fina.

## Open Questions

- ¿Ruta canónica `/finance/contractor-payables` o integrarlo como tab dentro de un hub Finanzas existente? (decidir en Plan Mode con greenhouse-ux).
