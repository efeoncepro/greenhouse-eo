## Delta 2026-04-28 — Subordinada al programa Member Loaded Cost Model

Esta task ahora se mapea al programa canónico definido en `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`. El output (provisiones laborales agregadas al fully-loaded cost) **alimenta el bucket `payroll_cost_clp` de `member_loaded_cost_per_period`** (Fact 3 del modelo dimensional, §2.3 de MLCM_V1). El scope técnico de esta task NO cambia. Sigue siendo **prerequisito hard del gate Reliable Actual Foundation** y, en el nuevo contexto, prerequisito de Fase 2 (Materializers) del roadmap MLCM_V1 §11.

## Delta 2026-04-13

- TASK-392 cerrada como programa documental. Esta task queda como el **unico blocker restante** del gate `Reliable Actual Foundation` definido en `GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`. Los otros 5 prerequisitos (TASK-174 locking, TASK-175 tests, TASK-179 Postgres cutover, TASK-401 continuous matching, TASK-167/192 organization scope) ya estan cerrados. Hasta que esta task cierre, el `actual` de Management Accounting sigue subestimando labor cost en ~12.5% y las capabilities downstream (`TASK-395` planning, `TASK-396` variance, `TASK-397` financial costs, `TASK-398` enterprise hardening) no pueden declararse enterprise-ready.

## Delta 2026-03-31
- TASK-182 (Expense Drawer Agency Taxonomy) redefine Previred como egreso al proveedor "Previred" en vez de tipo `social_security`. Las provisiones laborales que esta task materializa en `member_capacity_economics` deben alinearse: el gasto Previred consolidado se registra como expense operacional, y el desglose por persona viene del calculo de provisiones de esta task.
- Delta correctiva: la implementación final de `TASK-182` + `TASK-183` mantuvo compatibilidad transicional con `expense_type = 'social_security'` para el consolidado de Previred, pero ya separa `payment_provider = 'previred'`, `payment_rail = 'previred'` y usa `payroll_period.exported` como trigger reactivo del ledger. Esta task debe consumir ese contrato real y no asumir un cutover completo a `supplier` todavía.

# TASK-176 — Labor Provisions: Fully-Loaded Cost Model Completeness

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseno` |
| Domain | Cost Intelligence / Payroll / Finance |
| Sequence | Despues de TASK-174 (data integrity) — afecta calculos de P&L |

## Summary

El costo laboral materializado en `member_capacity_economics` y consumido por `operational_pl_snapshots` subestima el costo real en ~12.5% porque no incluye provisiones legales obligatorias de Chile: vacaciones (4.17% del bruto), indemnizacion por anos de servicio (8.33%), y el componente variable de mutual de seguridad. Esta task agrega estas provisiones al modelo de costo fully-loaded para que el P&L refleje el costo laboral real.

## Why This Task Exists

### Gap declarado en arquitectura

`GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md` declara explicitamente:

> **Phase 3 Gap:** No vacation/indemnification provisions (~12.5% labor cost underestimated)
> SIS + mutual not visible

### Impacto numerico (ejemplo con 20 colaboradores)

```
Escenario: 20 colaboradores, sueldo promedio $2,000,000 CLP bruto

Sin provisiones:
  Labor cost mensual = $40,000,000 CLP

Con provisiones:
  Vacaciones (4.17%):      + $1,668,000
  Indemnizacion (8.33%):   + $3,332,000
  Mutual variable (~1.5%): +   $600,000
  Total provisiones:       + $5,600,000 (14% adicional)
  
  Labor cost real = $45,600,000 CLP

Diferencia en P&L:
  Gross margin reportado:   65% (sin provisiones)
  Gross margin real:        61% (con provisiones)
  → 4 puntos de diferencia en margen → decision de pricing incorrecta
```

### Consecuencia de negocio

Sin provisiones, el P&L muestra margenes artificialmente altos. Esto puede llevar a:
- Pricing de servicios que no cubre el costo real
- Bonificaciones basadas en margenes inflados
- Sorpresas de caja cuando se pagan vacaciones o finiquitos

## Dependencies & Impact

- **Depende de:**
  - `src/lib/payroll/calculate-chile-deductions.ts` — ya calcula employer charges (SIS, cesantia)
  - `src/lib/team-capacity/economics.ts` — materializa `member_capacity_economics`
  - `src/lib/sync/projections/member-capacity-economics.ts` — projection reactiva
  - Schema `greenhouse_serving.member_capacity_economics` — tabla destino
  - Datos de antiguedad del colaborador (para indemnizacion): `greenhouse_hr.employment_contracts` o `payroll_entries`
- **Impacta a:**
  - TASK-167 (org P&L scope — agregara provisiones en org-level)
  - TASK-177 (BU P&L — incluira provisiones por BU)
  - TASK-146 (service P&L — incluira provisiones por servicio)
  - Cost Intelligence — operational_pl_snapshots reflejara costo real
  - Person 360 Finance — mostrara costo fully-loaded con provisiones
  - Agency economics — margenes por space mas precisos
- **Archivos owned:**
  - `src/lib/payroll/labor-provisions.ts` (nuevo)
  - `src/lib/payroll/__tests__/labor-provisions.test.ts` (nuevo)

## Scope

### Slice 1 — Motor de calculo de provisiones (~3h)

1. **Crear** `src/lib/payroll/labor-provisions.ts`:

   ```typescript
   export interface LaborProvisions {
     vacationProvisionClp: number       // 4.17% del bruto (15 dias habiles / 360)
     severanceProvisionClp: number      // 8.33% del bruto (1 mes por ano)
     mutualVariableClp: number          // tasa segun actividad economica
     totalProvisionsClp: number
   }

   export interface LaborProvisionInput {
     grossSalaryClp: number
     memberSeniorityMonths: number      // para severance
     mutualRate: number                 // default 0.015 (1.5%)
     contractType: 'indefinido' | 'plazo_fijo' | 'honorarios' | 'staff_aug'
   }

   export function computeLaborProvisions(input: LaborProvisionInput): LaborProvisions {
     // Vacaciones: solo contratos indefinidos y plazo fijo
     // Indemnizacion: solo contratos indefinidos con >1 ano
     // Mutual: todos los contratos dependientes
     // Honorarios y staff_aug: sin provisiones laborales
   }
   ```

2. **Reglas de negocio Chile:**
   - **Vacaciones:** 15 dias habiles por ano = 4.17% del bruto mensual. Aplica desde dia 1.
   - **Indemnizacion:** 1 mes de sueldo por ano trabajado (tope 11 anos = 90 UF). Provision mensual = 8.33% del bruto. Solo contratos indefinidos con >12 meses.
   - **Mutual de seguridad:** tasa variable por actividad (0.95% base + cotizacion adicional). Default 1.5% para servicios profesionales.
   - **Honorarios:** sin provisiones (no hay relacion laboral).
   - **Staff aug:** sin provisiones (relacion laboral es del proveedor).

3. **Tests unitarios** con edge cases:
   - Contrato plazo fijo (vacaciones si, indemnizacion no)
   - Contrato indefinido <12 meses (vacaciones si, indemnizacion no)
   - Contrato indefinido >12 meses (ambos)
   - Honorarios (nada)
   - Staff aug (nada)
   - Tope indemnizacion (11 anos max, tope 90 UF)

### Slice 2 — Integracion en member_capacity_economics (~3h)

1. **Agregar columnas** a `greenhouse_serving.member_capacity_economics`:
   ```sql
   ALTER TABLE greenhouse_serving.member_capacity_economics
     ADD COLUMN IF NOT EXISTS vacation_provision_clp NUMERIC DEFAULT 0,
     ADD COLUMN IF NOT EXISTS severance_provision_clp NUMERIC DEFAULT 0,
     ADD COLUMN IF NOT EXISTS mutual_variable_clp NUMERIC DEFAULT 0,
     ADD COLUMN IF NOT EXISTS total_provisions_clp NUMERIC DEFAULT 0,
     ADD COLUMN IF NOT EXISTS fully_loaded_cost_clp NUMERIC DEFAULT 0;
   ```

2. **Modificar** `src/lib/team-capacity/economics.ts`:
   - Despues de calcular `total_labor_cost_target`, invocar `computeLaborProvisions()`
   - Sumar provisiones al costo fully-loaded
   - `fully_loaded_cost_clp = total_labor_cost_target + total_provisions_clp + direct_overhead_target + shared_overhead_target`

3. **Fuente de datos para seniority:**
   - Query: `SELECT EXTRACT(MONTH FROM AGE(NOW(), hire_date)) FROM greenhouse_hr.employment_contracts WHERE member_id = $1 AND status = 'active'`
   - Si no existe hire_date: usar fecha de primer payroll entry como fallback

4. **Fuente de datos para contract_type:**
   - `greenhouse_hr.employment_contracts.contract_type`
   - Mapping: `indefinido` → full provisions, `plazo_fijo` → vacaciones only, `honorarios` → none, `staff_aug` → none

### Slice 3 — Propagacion a operational_pl (~2h)

1. **Modificar** `src/lib/cost-intelligence/compute-operational-pl.ts`:
   - Usar `fully_loaded_cost_clp` en vez de `total_labor_cost_target` para labor cost en P&L
   - El campo `labor_cost_clp` en operational_pl_snapshots ahora incluye provisiones

2. **Backward compatibility:**
   - Agregar campo `labor_cost_before_provisions_clp` para comparacion historica
   - Primer materialization con provisiones marcada con `notes: 'includes_labor_provisions'`

### Slice 4 — Visibilidad en UI (~2h)

1. **Person 360 Finance tab:** mostrar desglose:
   ```
   Costo Laboral Base:        $2,000,000
   + Cargas Empleador (SIS):    $158,400
   + Provision Vacaciones:       $83,400
   + Provision Indemnizacion:   $166,600
   + Mutual de Seguridad:       $30,000
   = Costo Fully-Loaded:      $2,438,400
   ```

2. **Cost Intelligence dashboard:** agregar tooltip que explique que el labor cost incluye provisiones

## Acceptance Criteria

- [ ] `computeLaborProvisions()` calcula vacaciones, indemnizacion, mutual correctamente
- [ ] Contratos a honorarios y staff_aug devuelven provisiones = 0
- [ ] Indemnizacion solo aplica a contratos indefinidos con >12 meses
- [ ] Tope de indemnizacion respetado (11 anos / 90 UF)
- [ ] `member_capacity_economics` incluye columnas de provisiones
- [ ] `operational_pl_snapshots.labor_cost_clp` incluye provisiones
- [ ] Person 360 Finance muestra desglose de provisiones
- [ ] Tests unitarios para `computeLaborProvisions()` (min 6 tests)
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/payroll/labor-provisions.ts` | **Nuevo** — motor de calculo |
| `src/lib/payroll/__tests__/labor-provisions.test.ts` | **Nuevo** — tests unitarios |
| `src/lib/team-capacity/economics.ts` | Integrar provisiones en materialization |
| `src/lib/cost-intelligence/compute-operational-pl.ts` | Usar fully_loaded_cost |
| `src/lib/sync/projections/member-capacity-economics.ts` | Propagar nuevas columnas |
| `scripts/setup-postgres-cost-intelligence.sql` | ALTER TABLE nuevas columnas |
| `src/views/greenhouse/people/person-360/tabs/FinanceTab.tsx` | Mostrar desglose provisiones |
