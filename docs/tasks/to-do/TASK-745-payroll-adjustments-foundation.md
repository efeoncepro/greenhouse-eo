# TASK-745 — Payroll Adjustments Foundation V1

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-745-payroll-adjustments-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilita la capacidad operativa de **excluir, reducir o descontar el pago de un colaborador** en una nómina específica via un modelo event-sourced de "ajustes" (`payroll_adjustments`). Cubre 3 escenarios reales con composicion ortogonal: no pagar (exclude), pagar un porcentaje del cálculo (gross_factor), o aplicar un descuento absoluto al neto (fixed_deduction). Trae maker-checker, audit trail completo, integracion con outbox a Finance y UI dedicada en PayrollEntryTable. Cierra el caso "Luis casi no trabajó este mes — necesito no pagarle" sin romper compliance Chile (CHECK constraint para dependientes).

## Why This Task Exists

Hoy `PayrollEntryTable` tiene un `manualOverride` plano que fuerza el neto en una sola dimensión, sin trazabilidad estructurada y sin maker-checker. Operativamente:

- No se puede excluir limpiamente a un colaborador del cálculo sin distorsionar el bruto (rompe SII / boleta honorarios).
- No hay forma de pagar un porcentaje del cálculo (ej. 50% por bajo rendimiento puntual del mes).
- No hay forma de descontar un anticipo o ajuste absoluto sin destruir la traza fiscal.
- No hay maker-checker, motivo controlado, ni audit log de ajustes.
- Reportería tipo "cuántas exclusiones hubo en el último año" es imposible (estado mutable).

Modelar esto como tres dimensiones independientes (`inclusion`, `gross factor`, `fixed deduction`) en una **tabla event-sourced** permite:

- Componer múltiples ajustes en un mismo entry (factor + descuento + override).
- Histórico íntegro: cada cambio crea row nuevo (`status='active'` / `'reverted'` / `'superseded'`).
- Maker-checker: `status='pending_approval'` requiere aprobación.
- Compliance: CHECK constraint impide `exclude` o `factor=0` para Chile dependiente sin motivo legal documentado.
- Integracion con Finance via outbox + `source_ref` para reconciliar adjustments con ledger de anticipos / préstamos.

V1 entrega `exclude`, `gross_factor`, `gross_factor_per_component`, `fixed_deduction`. Cronogramas recurrentes (préstamos en cuotas) quedan para TASK-746.

## Goal

- Operador con permiso `payroll.entries.adjust` puede aplicar 1+ ajustes a un entry en estado editable.
- Tres tipos cubiertos: `exclude`, `gross_factor` (uniforme o por componente), `fixed_deduction`.
- Ajustes son inmutables una vez aprobados; cambios crean nuevos rows en chain `superseded_by`.
- Maker-checker opcional por capability `payroll.adjustments.approve` (toggle global por tenant).
- CHECK constraint compliance Chile dependiente.
- UI: `PayrollEntryAdjustDialog` accesible desde menú kebab por row + chip indicador por row + drawer con histórico.
- Outbox emite `payroll.adjustment.{created,approved,reverted}` con `source_kind` + `source_ref`.
- Receipt PDF/Excel muestra desglose línea por línea cuando hay ajustes.
- CSV bancario respeta neto final (con todos los ajustes aplicados).
- Reliquidación (TASK-409) hereda adjustments activos al v2; computa delta sobre neto final.
- Doc funcional + manual de uso + tests unitarios de la función `computePayrollEntryNet`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (state machine + flow calculate→approve→export + reopen TASK-409)
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (outbox payroll → finance, reconciliacion delta TASK-411)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (registrar nuevos events `payroll.adjustment.*`)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capabilities `payroll.entries.adjust`, `payroll.adjustments.approve`)

Reglas obligatorias:

- **Compliance Chile dependiente**: CHECK constraint que rechaza `kind='exclude' OR (kind='gross_factor' AND payload->>'factor'='0')` para entries con `pay_regime='chile'` y contrato `indefinido`/`plazo_fijo` SIN `reason_code IN ('leave_unpaid','unauthorized_absence','termination_pending')`.
- **Honorarios y deel**: sin restriccion legal, solo motivo + nota.
- **Inmutabilidad**: una vez `status='active'`, no se mutan columnas. Cambios → row nuevo + `superseded_by` chain.
- **Outbox idempotente**: cada adjustment dispara evento via `outbox_events` con dedupe key `(adjustment_id, kind)`.
- **Reliquidación**: el reopen TASK-409 clona adjustments activos al v2 entry; el delta a Finance computa `net_v2 - net_v1` con ajustes incluidos.

## Normative Docs

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Dependencies & Impact

### Depends on

- `greenhouse_payroll.payroll_entries` (FK)
- `greenhouse_payroll.payroll_periods` (FK denorm)
- `greenhouse_core.team_members` (FK)
- TASK-409 (reliquidación) — el flow reopen debe heredar adjustments
- TASK-411 (finance delta consumer) — debe consumir `payroll.adjustment.*` events

### Blocks / Impacts

- **TASK-746** (Adjustment Schedules + Finance integration) construye encima de esta foundation.
- `src/lib/payroll/calculate-payroll.ts` — gana `applyAdjustments` step.
- `src/lib/payroll/postgres-store.ts` — lectura de entries gana `joinAdjustments`.
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx` — gana menú kebab + chip indicador.
- `src/lib/payroll/generate-payroll-pdf.tsx` y `generate-payroll-excel.ts` — incluyen líneas de ajuste.
- Outbox catalog — 3 events nuevos.
- Receipt component — desglose visible.

### Files owned

- `migrations/<timestamp>_task-745-payroll-adjustments.sql`
- `src/lib/payroll/adjustments/` (nuevo módulo: `compute-net.ts`, `apply-adjustment.ts`, `revert-adjustment.ts`, `compose-finance-event.ts`)
- `src/app/api/hr/payroll/entries/[entryId]/adjustments/route.ts` (POST list + GET history)
- `src/app/api/hr/payroll/entries/[entryId]/adjustments/[adjustmentId]/approve/route.ts`
- `src/app/api/hr/payroll/entries/[entryId]/adjustments/[adjustmentId]/revert/route.ts`
- `src/views/greenhouse/payroll/PayrollEntryAdjustDialog.tsx`
- `src/views/greenhouse/payroll/PayrollAdjustmentHistoryDrawer.tsx`
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx` (modificar: kebab menu + chip)
- `src/lib/sync/projections/payroll-adjustment-event.ts` (outbox handler)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (extender state machine + adjustments section)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (registrar 3 events)
- `docs/documentation/hr/ajustes-de-pago-en-nomina.md` (doc funcional)
- `docs/manual-de-uso/hr/ajustar-pago-de-nomina.md` (manual operativo)

## Current Repo State

### Already exists

- `payroll_entries` con `manualOverride` boolean + `netTotalOverride` + `manualOverrideNote` (override plano legacy)
- `BonusInput` → migrado a `InlineNumericEditor` (TASK-743)
- Reopen flow TASK-409 con `payroll_entry.reliquidated` event
- Outbox infrastructure (`outbox_events`)
- Capabilities motor (TASK-403)

### Gap

- No hay tabla canónica para ajustes estructurados.
- `manualOverride` es plano (un solo override de neto, sin composabilidad).
- No hay maker-checker.
- No hay CHECK constraint compliance Chile.
- No hay outbox event para Finance.
- No hay UI dedicada (solo el switch + textbox legacy en el row expandido).

## Scope

### Slice 1 — Schema + computación

- Migración `payroll_adjustments` con cols del modelo event-sourced.
- CHECK constraint compliance Chile.
- Indices: `(payroll_entry_id, status)`, `(member_id, period_id, status)`, `(reason_code) WHERE status='active'`.
- TS: `computePayrollEntryNet(entry, adjustments[])` puro, idempotente, testable. Tests unitarios (15+ casos: cada kind, composiciones, edge cases).
- Wire en `calculate-payroll.ts`: después de bruto natural, antes de export, aplicar adjustments activos.

### Slice 2 — API + maker-checker

- POST `/api/hr/payroll/entries/[entryId]/adjustments` — crea adjustment con `status='pending_approval'` o `'active'` según tenant policy.
- POST `/api/hr/payroll/entries/[entryId]/adjustments/[adjustmentId]/approve` — capability `payroll.adjustments.approve`.
- POST `/api/hr/payroll/entries/[entryId]/adjustments/[adjustmentId]/revert` — crea row de reversión, marca chain.
- GET `/api/hr/payroll/entries/[entryId]/adjustments` — lista activos + histórico.
- Validación zod del payload por kind.

### Slice 3 — UI + drawer

- Menú kebab en row de PayrollEntryTable: "Ajustar pago".
- `PayrollEntryAdjustDialog`: 3 modos radio (excluir / porcentaje / pago normal), input descuento adicional, dropdown motivo, textarea nota obligatoria, preview en vivo del neto resultante.
- Chip "Ajustado: X% — motivo" en celda Colaborador cuando hay adjustment activo.
- `PayrollAdjustmentHistoryDrawer`: lista activos + revertidos + superseded con quién/cuándo/qué.
- Banner sectionado en PayrollPeriodTab: "1 colaborador excluido" / "2 con ajuste de pago".

### Slice 4 — Outbox + Finance + Receipt

- Outbox events: `payroll.adjustment.created`, `.approved`, `.reverted`. Catalog en `GREENHOUSE_EVENT_CATALOG_V1.md`.
- `payroll-adjustment-event.ts` projection que enruta a Finance: si afecta gasto neto, dispara recompute de `commercial_cost_attribution` + `client_economics`.
- Receipt PDF/Excel: incluir bloques "Bruto efectivo (X% del bruto natural)", "Descuentos pactados", motivos visibles para honorarios.
- CSV bancario: respeta neto final con ajustes.
- Reliquidación: `cloneAdjustmentsToV2(originalEntryId, v2EntryId)` en flow TASK-409.

### Slice 5 — Doc + tests + smoke

- `docs/documentation/hr/ajustes-de-pago-en-nomina.md` (lenguaje simple, casos cubiertos).
- `docs/manual-de-uso/hr/ajustar-pago-de-nomina.md` (paso a paso operador, qué motivos cuándo, troubleshooting).
- Vitest: `compute-net.test.ts`, `apply-adjustment.test.ts`, `compose-finance-event.test.ts`.
- Smoke test Playwright: flow completo "Luis: aplicar exclude → ver chip → recalcular → verificar bruto=0 → revertir → entry vuelve a $500K".

## Out of Scope

- Cronogramas recurrentes (préstamos N cuotas auto-aplicadas) → TASK-746.
- Integración con Finance ledger de anticipos/préstamos como entidades formales → TASK-746.
- Extender `manualOverride` legacy: queda activo para casos previos pero deprecado para nuevos. Migración data viva queda como follow-up.
- Bulk apply a varios entries simultáneamente (UI de un row a la vez).
- Approval flow multi-step (un solo approver por adjustment).

## Detailed Spec

### Schema

```sql
CREATE TABLE greenhouse_payroll.payroll_adjustments (
  adjustment_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_entry_id         uuid NOT NULL REFERENCES greenhouse_payroll.payroll_entries(entry_id) ON DELETE CASCADE,
  member_id                uuid NOT NULL,
  period_id                uuid NOT NULL,
  kind                     text NOT NULL CHECK (kind IN (
                             'exclude','gross_factor','gross_factor_per_component',
                             'fixed_deduction','manual_override'
                           )),
  payload                  jsonb NOT NULL,
  source_kind              text NOT NULL DEFAULT 'manual' CHECK (source_kind IN ('manual','recurring_schedule','finance_event','reliquidation_clone')),
  source_ref               text,
  reason_code              text NOT NULL,
  reason_note              text NOT NULL CHECK (length(reason_note) >= 5),
  status                   text NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval','active','reverted','superseded')),
  requested_by             text NOT NULL,
  requested_at             timestamptz NOT NULL DEFAULT now(),
  approved_by              text,
  approved_at              timestamptz,
  reverted_by              text,
  reverted_at              timestamptz,
  reverted_reason          text,
  superseded_by            uuid REFERENCES greenhouse_payroll.payroll_adjustments(adjustment_id),
  effective_at             timestamptz NOT NULL DEFAULT now(),
  version                  integer NOT NULL DEFAULT 1,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Compliance Chile dependiente
CREATE OR REPLACE FUNCTION greenhouse_payroll.assert_chile_dependent_adjustment_compliance()
RETURNS trigger AS $$
DECLARE
  v_regime text;
  v_contract text;
BEGIN
  SELECT pe.pay_regime, hc.contract_type
    INTO v_regime, v_contract
    FROM greenhouse_payroll.payroll_entries pe
    LEFT JOIN greenhouse_hr.contracts hc ON hc.member_id = pe.member_id
   WHERE pe.entry_id = NEW.payroll_entry_id;

  IF v_regime = 'chile' AND v_contract IN ('indefinido','plazo_fijo') THEN
    IF NEW.kind = 'exclude' OR (NEW.kind = 'gross_factor' AND (NEW.payload->>'factor')::numeric = 0) THEN
      IF NEW.reason_code NOT IN ('leave_unpaid','unauthorized_absence','termination_pending') THEN
        RAISE EXCEPTION 'Chile dependent payroll cannot be excluded or zeroed without legal reason_code (leave_unpaid|unauthorized_absence|termination_pending)';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payroll_adjustment_compliance
  BEFORE INSERT OR UPDATE ON greenhouse_payroll.payroll_adjustments
  FOR EACH ROW EXECUTE FUNCTION greenhouse_payroll.assert_chile_dependent_adjustment_compliance();
```

### Computación (TS)

```ts
type Adjustment = {
  adjustmentId: string
  kind: 'exclude' | 'gross_factor' | 'gross_factor_per_component' | 'fixed_deduction' | 'manual_override'
  payload: Record<string, unknown>
  status: 'active' | 'pending_approval' | 'reverted' | 'superseded'
}

export function computePayrollEntryNet(entry: PayrollEntry, adjustments: Adjustment[]) {
  const active = adjustments.filter(a => a.status === 'active')

  if (active.some(a => a.kind === 'exclude')) {
    return { excluded: true, gross: 0, net: 0, sii: 0, previsional: 0, breakdown: active }
  }

  // gross_factor (multiplicativo)
  let factor = 1
  for (const a of active.filter(a => a.kind === 'gross_factor')) {
    factor *= (a.payload as { factor: number }).factor
  }

  // gross_factor_per_component (override por componente)
  const perComp = active.find(a => a.kind === 'gross_factor_per_component')
  let gross: number
  if (perComp) {
    const map = (perComp.payload as { components: Record<string, number> }).components
    gross = computeGrossFromComponents(entry, map) * factor
  } else {
    gross = entry.naturalGross * factor
  }

  // Deducciones legales sobre gross efectivo
  const sii = entry.regime === 'honorarios' ? gross * (entry.siiRetentionRate ?? 0.135) : 0
  const previsional = entry.regime === 'chile' ? recomputeChileDeductions(gross, entry).total : 0

  let net = gross - sii - previsional

  // Deducciones absolutas
  for (const a of active.filter(a => a.kind === 'fixed_deduction')) {
    net -= (a.payload as { amount: number }).amount
  }

  // Manual override gana sobre todo
  const override = active.find(a => a.kind === 'manual_override')
  if (override) net = (override.payload as { netClp: number }).netClp

  return { excluded: false, gross, net, sii, previsional, breakdown: active }
}
```

### Reason codes (controlled vocabulary)

```ts
export const ADJUSTMENT_REASON_CODES = [
  'low_performance',
  'no_activity',
  'paid_externally',
  'advance_payback',
  'loan_payback',
  'leave_unpaid',           // Chile dependiente
  'unauthorized_absence',    // Chile dependiente
  'termination_pending',     // Chile dependiente
  'agreed_discount',
  'correction_prior_period',
  'other'
] as const
```

### UI flow

PayrollEntryTable row → kebab menu → "Ajustar pago" → PayrollEntryAdjustDialog:

- Radio 1: "Pagar normal (sin ajuste)" → no crea row
- Radio 2: "Pagar un porcentaje" → slider 0-100% → crea row `gross_factor`
- Radio 3: "Excluir de la nómina" → crea row `exclude`
- Input "Descuento adicional CLP" (opcional, independiente del radio) → crea row `fixed_deduction` (excepto si excluded)
- Dropdown reason_code + textarea note (required, min 5 chars)
- Preview vivo: bruto natural / bruto efectivo / SII / previsional / descuento / neto

Dispatch hace POST con array de adjustments (puede ser 1 o 2 rows en transacción).

### Permisos

- `payroll.entries.adjust` — crear adjustments. Default: efeonce_admin + hr_payroll.
- `payroll.adjustments.approve` — aprobar pending_approval. Default: efeonce_admin solo.
- Tenant policy `requireApproval: boolean` global: si false, adjustments nacen `status='active'`. Si true, `status='pending_approval'`.

## Acceptance Criteria

- [ ] Migración aplicada con tabla + trigger compliance Chile.
- [ ] `computePayrollEntryNet` cubre 15+ casos (cada kind, composiciones).
- [ ] API endpoints (POST/approve/revert/GET) con permisos correctos.
- [ ] PayrollEntryAdjustDialog renderiza preview correcto.
- [ ] Chip indicador en row Colaborador cuando hay adjustment activo.
- [ ] Outbox emite 3 events nuevos con `source_ref`.
- [ ] Receipt PDF/Excel muestra desglose con ajustes.
- [ ] CSV bancario respeta neto con ajustes.
- [ ] Reliquidación clona adjustments al v2.
- [ ] CHECK constraint Chile dependiente funcional (test SQL directo).
- [ ] Doc funcional + manual de uso publicados.
- [ ] Smoke Playwright: caso Luis end-to-end pasa.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test src/lib/payroll/adjustments`
- `pnpm build`
- Manual: `/hr/payroll` → row Luis → kebab → "Excluir" → motivo `no_activity` → recalcular → bruto=0, neto=0 → CSV no incluye Luis → revertir → bruto vuelve.
- DB: `INSERT INTO payroll_adjustments` con kind='exclude' para Chile indefinido sin reason válido → debe FALLAR con RAISE.

## Closing Protocol

- [ ] `Lifecycle` → `complete`
- [ ] Archivo en `docs/tasks/complete/`
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` con sección de Payroll Adjustments V1
- [ ] Chequeo de impacto cruzado: TASK-746 (debería pasar de bloqueada a unblocked), TASK-409 (extender doc reopen-flow para mencionar adjustment cloning)

## Follow-ups

- TASK-746 — Adjustment Schedules + Finance ledger integration (préstamos en cuotas, anticipos como entidades).
- Migración del `manualOverride` legacy a `kind='manual_override'` formal (one-time backfill).
- Reportes ejecutivos: "ajustes del último año" en Admin Center.
- Notificación al colaborador via email/Teams cuando se le aplica ajuste (post V1).

## Open Questions

- ¿`requireApproval` default es false (operación rápida) o true (compliance estricto)? — propuesto: false, configurable.
- ¿Migrar `manualOverride` legacy en esta task o dejar coexistencia? — propuesto: coexistencia + deprecar uso nuevo.
