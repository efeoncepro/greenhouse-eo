# CODEX TASK — HRIS: Consolidación del Modelo de Tipos de Contrato

## Delta 2026-04-01 — Implementación cerrada

- La lane quedó implementada y validada end-to-end en el repo y en Cloud SQL `greenhouse-pg-dev`.
- Migración aplicada: `migrations/20260402001100000_hris-contract-types.sql`.
- Canon consolidado:
  - `greenhouse_core.members` ahora persiste `contract_type`, `pay_regime`, `payroll_via` y `deel_contract_id`
  - `greenhouse_payroll.compensation_versions` mantiene `contract_type` como snapshot histórico de compensación
  - `greenhouse_payroll.payroll_entries` ahora persiste `payroll_via`, `deel_contract_id`, `sii_retention_rate` y `sii_retention_amount`
- La semántica de `schedule_required` se resolvió sin crear una segunda columna física:
  - `daily_required` sigue siendo el backing field canónico
  - `schedule_required` se expone como alias de lectura en serving/UI/helpers
- Se actualizaron `member_360`, `member_payroll_360` y `person_hr_360` para exponer el canon de HRIS y separar explícitamente los aliases de snapshot histórico.
- El calculator de payroll ya distingue:
  - branch laboral Chile (`indefinido` / `plazo_fijo`)
  - branch `honorarios` con retención SII
  - branch Deel (`contractor` / `eor`) como registro externo sin cálculo inline
- Verificación cerrada:
  - `pnpm migrate:up` ✅
  - `pnpm db:generate-types` ✅
  - `pnpm lint` ✅
  - `pnpm build` ✅
- Nota operativa:
  - el carril CLI requirió Cloud SQL Proxy en `127.0.0.1:15432`
  - el timestamp inicial generado para la migración quedó detrás de migraciones ya aplicadas; se regeneró con `node-pg-migrate create` hasta quedar posterior al tracking real
  - el DDL cross-schema solo pudo aplicar con `greenhouse_ops` como owner efectivo, no con `migrator` ni `postgres`

## Delta 2026-04-01

- `greenhouse_core.departments` ya quedó como source of truth operativo del módulo `HR > Departments` por cierre de `TASK-180`.
- Cualquier join o filtro auxiliar `members -> departments` en esta lane debe asumir PostgreSQL runtime, no `greenhouse.departments` en BigQuery.

## Delta 2026-04-01 — Descubrimiento runtime real

- La spec externa `../Greenhouse_Portal_Spec_v1.md` no existe en este workspace. La fuente canónica para esta lane queda en esta task + arquitectura local bajo `docs/architecture/`.
- El schema live de `greenhouse_core.members` no tiene todavía `contract_type`, `pay_regime`, `payroll_via`, `schedule_required` ni `deel_contract_id`. Sí tiene `daily_required`, y hoy ese campo ya alimenta HR/People/Attendance.
- Decisión operativa para esta lane:
  - no introducir dos flags paralelos (`daily_required` y `schedule_required`) sin compatibilidad explícita
  - tratar `daily_required` como backing field vigente de las semánticas de asistencia/schedule hasta que exista un rename/cutover completo
- `greenhouse_payroll.compensation_versions.contract_type` sigue restringido por CHECK a `indefinido | plazo_fijo`, por lo que la expansión a `honorarios | contractor | eor` requiere migración de schema y actualización de validaciones/runtime.
- Los datos live actuales no alcanzan para distinguir automáticamente `contractor` vs `eor` en todos los colaboradores internacionales:
  - hoy existen `members` con `pay_regime = 'international'` y `contract_type` legacy `indefinido`
  - si no hay señal adicional confiable, la migración inicial debe defaultear esos casos a `contractor` y dejar explícito que HR puede reclasificarlos a `eor`
- Las vistas live `greenhouse_serving.member_360`, `greenhouse_serving.member_payroll_360` y `greenhouse_serving.person_hr_360` todavía consumen `daily_required` y toman `pay_regime` / `contract_type` desde `compensation_versions`, no desde `members`.
- Las rutas documentadas en esta task se corrigen al patrón real del repo:
  - HR member surfaces viven bajo `/api/hr/core/members/*`
  - Payroll compensation vive bajo `/api/hr/payroll/compensation*`
  - hoy no existe `GET /api/hr/payroll/members`; el read model vigente se resuelve desde `src/lib/payroll/get-payroll-members.ts` y `GET /api/hr/payroll/compensation`
- `PayrollEntryExpanded.tsx` no existe como componente separado; el desglose expandido vive hoy dentro de `src/views/greenhouse/payroll/PayrollEntryTable.tsx`.
- Tenant isolation:
  - `greenhouse_core.members`, `greenhouse_payroll.compensation_versions` y `greenhouse_payroll.payroll_entries` no tienen `space_id`
  - en este dominio el boundary runtime vigente es el tenant interno `efeonce` + route group `hr`
  - `space_id` aplica downstream en consumers como `staff_aug_placements`, assignments y serving económico, no como FK directa en el core HR/payroll actual

## Resumen

Consolidar el modelo de tipos de contrato en Greenhouse para soportar los 5 tipos reales de vinculación que maneja Efeonce Group: indefinido, plazo fijo, honorarios (Chile), contractor (Deel) y EOR (Deel). Consolidar el contrato canónico en `greenhouse_core.members`, crear la rama de cálculo de honorarios en el payroll calculator, y agregar la rama de registro Deel.

**El problema hoy:** El modelo actual tiene dos campos separados que no capturan la realidad:
- `employment_type` en `members` (`full_time | part_time | contractor`) — describe jornada, no tipo de contrato
- `contract_type` en `compensation_versions` (`indefinido | plazo_fijo`) — solo cubre contratos laborales Chile, no honorarios ni internacionales
- No existe `payroll_via` — no hay distinción entre "Greenhouse calcula nómina" y "Deel maneja el pago"
- No existe `schedule_required` — no se puede distinguir entre un contractor que participa en dailies y uno que entrega puntual
- No existe `deel_contract_id` — no hay referencia al contrato en Deel

**La solución:** Agregar los campos canónicos faltantes a `greenhouse_core.members`, migrar datos existentes, actualizar el payroll calculator con dos ramas nuevas (honorarios Chile y registro Deel), y actualizar la UI del CompensationDrawer para reflejar el nuevo modelo. En runtime actual esto implica agregar `contract_type`, `pay_regime`, `payroll_via` y `deel_contract_id`, y resolver la semántica `schedule_required` sobre el flag operativo existente `daily_required` o mediante una migración backward-compatible explícita.

**Este task es prerequisito de todas las fases futuras del HRIS** (Document Vault, Onboarding, Expenses, Goals, Evaluaciones) **y del módulo de Staff Augmentation** porque la elegibilidad de cada módulo y el modelo de placement se resuelven por `contract_type`, `payroll_via` y `deel_contract_id`.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/hris-contract-types`
- **Framework:** Next.js 16.1.1, React 19.2.3, TypeScript 5.9.3, MUI 7.x
- **OLTP:** PostgreSQL (Cloud SQL `greenhouse-pg-dev`, database `greenhouse_app`)
- **OLAP:** BigQuery (`efeonce-group.greenhouse`)
- **Deploy:** Vercel Pro (team `efeonce`)

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `Greenhouse_HRIS_Architecture_v1.md` | **Documento rector.** Sección 2: taxonomía completa de contract types, derivation rules, payroll branches, TypeScript types |
| `GREENHOUSE_ARCHITECTURE_V1.md` | Arquitectura maestro, principios, stack |
| `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` | Schemas canónicos, serving views, `greenhouse_core.members` |
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` | Roles, route groups, session payload |
| `CODEX_TASK_HR_Payroll_Module_v2.md` | Payroll calculator actual, `calculate-payroll.ts`, `CompensationDrawer` |
| `CODEX_TASK_HR_Core_Module.md` | HR Core, `MemberPersonalData`, `employment_type` actual |
| `Greenhouse_Nomenclatura_Portal_v3.md` | Constantes, colores, microcopy |

---

## Delta 2026-03-27 — Alineación arquitectónica

- **TASK-078 es prerequisito** para la branch de honorarios: la tasa de retención SII debe resolverse desde indicadores synced (Gael Cloud API) cuando TASK-078 complete. Mientras tanto, `getSiiRetentionRate(year)` como lookup hardcoded es aceptable como fallback.
- **TASK-065 confirma** que `bonus_rpa_*` fields son canónicos — las branches honorarios/Deel deben referenciar los nombres de campo actuales, no los propuestos por TASK-025 (FTR).
- **Forward engine cutover** (TASK-078 slice 6): cambia el shape del contexto que recibe `calculateEntry`. La branch de honorarios debe aceptar el mismo contexto previsional pero solo usar `siiRetentionRate`. La branch Deel no necesita contexto previsional.
- **Outbox events obligatorios**: todas las branches de cálculo deben emitir `payroll_entry.upserted` via `publishOutboxEvent()` para que `person_intelligence`, `member_capacity_economics` y `projected_payroll` reaccionen correctamente.
- **Regla de `contract_type`**: el campo canónico vive en `greenhouse_core.members` (no en `compensation_versions`), alineado con HRIS Architecture V1.

## Dependencias

| Dependencia | Estado | Impacto si no está |
|---|---|---|
| `greenhouse_core.members` table en PostgreSQL | Existe, migrada | Blocker — los ALTER TABLE van aquí |
| `greenhouse_payroll.compensation_versions` table | Existe, migrada | Se lee `contract_type` existente para migración de datos |
| **TASK-078** (Previsional Foundation) | `in-progress` | **Blocker para branch honorarios** — tasa SII debe usar indicadores synced |
| **TASK-065** (Bonus Recalibration) | `complete` | Confirma `bonus_rpa_*` fields canónicos |
| `calculate-payroll.ts` en el repo | Existe | Se extiende con Branch 2 y Branch 3 |
| `CompensationDrawer.tsx` en el repo | Existe | Se actualiza UI para nuevos campos |
| `greenhouse_serving.member_360` view | Existe | Se actualiza para exponer nuevos campos |
| `greenhouse_serving.member_payroll_360` view | Existe | Se actualiza para exponer `payroll_via` |
| `src/lib/sync/event-catalog.ts` | Existe | Registrar eventos si se agregan branches nuevas |

---

## PARTE A: Schema — Cambios a PostgreSQL

### A1. ALTER TABLE `greenhouse_core.members`

```sql
-- Contract classification (canonical fields)
ALTER TABLE greenhouse_core.members
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) NOT NULL DEFAULT 'indefinido';
-- Values: 'indefinido' | 'plazo_fijo' | 'honorarios' | 'contractor' | 'eor'

ALTER TABLE greenhouse_core.members
ADD COLUMN IF NOT EXISTS pay_regime VARCHAR(20) NOT NULL DEFAULT 'chile';
-- Values: 'chile' | 'international'

ALTER TABLE greenhouse_core.members
ADD COLUMN IF NOT EXISTS payroll_via VARCHAR(20) NOT NULL DEFAULT 'internal';
-- Values: 'internal' | 'deel'

ALTER TABLE greenhouse_core.members
ADD COLUMN IF NOT EXISTS schedule_required BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE greenhouse_core.members
ADD COLUMN IF NOT EXISTS deel_contract_id TEXT;
-- Deel contract identifier (null for non-Deel members)
```

**Nota:** `contract_end_date` ya existe en `members` (definido en HR Core). No agregar de nuevo.

### A2. Migración de datos existentes

Ejecutar DESPUÉS de A1. El script debe ser idempotente.

```sql
-- Step 1: Migrate from compensation_versions.contract_type → members.contract_type
-- For each member, use the current (is_current = TRUE) compensation version
UPDATE greenhouse_core.members m
SET
  contract_type = COALESCE(cv.contract_type, 'indefinido'),
  pay_regime = COALESCE(cv.pay_regime, 'chile'),
  payroll_via = CASE
    WHEN COALESCE(cv.pay_regime, 'chile') = 'international' THEN 'deel'
    ELSE 'internal'
  END,
  schedule_required = CASE
    WHEN m.employment_type = 'contractor' AND COALESCE(cv.pay_regime, 'chile') = 'international' THEN FALSE
    ELSE TRUE
  END
FROM greenhouse_payroll.compensation_versions cv
WHERE cv.member_id = m.member_id
  AND cv.is_current = TRUE;

-- Step 2: Members without compensation versions get defaults
-- (already handled by DEFAULT values on the columns)
```

### A3. Update serving views

```sql
-- Recreate member_360 to include new fields
CREATE OR REPLACE VIEW greenhouse_serving.member_360 AS
SELECT
  m.member_id,
  m.display_name,
  m.primary_email,
  m.job_level,
  m.employment_type,
  m.contract_type,       -- NEW
  m.pay_regime,          -- NEW
  m.payroll_via,         -- NEW
  m.schedule_required,   -- NEW
  m.deel_contract_id,    -- NEW
  m.contract_end_date,
  m.status,
  m.active,
  ip.profile_id AS identity_profile_id,
  ip.full_name,
  ip.canonical_email,
  d.department_name,
  mgr.display_name AS manager_name,
  m.reports_to_member_id,
  (SELECT COUNT(*) FROM greenhouse_core.client_users cu
   WHERE cu.identity_profile_id = ip.profile_id AND cu.active = TRUE
  ) AS auth_principal_count
FROM greenhouse_core.members m
LEFT JOIN greenhouse_core.identity_profiles ip ON m.identity_profile_id = ip.profile_id
LEFT JOIN greenhouse_core.departments d ON m.department_id = d.department_id
LEFT JOIN greenhouse_core.members mgr ON m.reports_to_member_id = mgr.member_id;

-- Recreate member_payroll_360 to include payroll_via
CREATE OR REPLACE VIEW greenhouse_serving.member_payroll_360 AS
SELECT
  m.member_id,
  m.display_name,
  m.primary_email,
  m.job_level,
  m.employment_type,
  m.contract_type,       -- NEW
  m.pay_regime,          -- NEW (was only on compensation_versions)
  m.payroll_via,         -- NEW
  m.status,
  d.department_name,
  cv.version_id AS current_compensation_version_id,
  cv.pay_regime AS comp_pay_regime,
  cv.currency,
  cv.base_salary,
  cv.remote_allowance,
  cv.contract_type AS comp_contract_type,
  (SELECT COUNT(*) FROM greenhouse_payroll.compensation_versions cv2
   WHERE cv2.member_id = m.member_id
  ) AS compensation_versions_count,
  (SELECT COUNT(*) FROM greenhouse_payroll.payroll_entries pe
   WHERE pe.member_id = m.member_id
  ) AS payroll_entries_count
FROM greenhouse_core.members m
LEFT JOIN greenhouse_core.departments d ON m.department_id = d.department_id
LEFT JOIN greenhouse_payroll.compensation_versions cv
  ON cv.member_id = m.member_id AND cv.is_current = TRUE;
```

---

## PARTE B: Payroll Calculator — Ramas nuevas

### B1. Branch 2: Honorarios Chile

Agregar en `src/lib/payroll/calculate-payroll.ts` (o archivo equivalente en el repo).

**Lógica:**
```
Input: base_salary (monto bruto acordado), bonuses (si aplica, discrecional)
gross_total = base_salary + bonus_otd + bonus_rpa + bonus_other
retencion_sii = gross_total × 0.145  (14.5% para 2025-2026)
net_total = gross_total - retencion_sii
```

**No aplican:** AFP, salud, cesantía, impuesto único, asignación teletrabajo (no es empleado).

**Campo en entry:**
```typescript
// Agregar a PayrollEntry
sii_retention_rate: number | null      // 0.145 for 2025-2026
sii_retention_amount: number | null    // Calculated retention
```

**Regla de negocio:** Los bonos KPI para honorarios son **discrecionales** — no tienen threshold mínimo. HR puede asignar cualquier monto dentro del rango o $0. La validación server-side de `kpiOtdQualifies / kpiRpaQualifies` no aplica; los campos se ignoran.

### B2. Branch 3: Registro Deel (international)

Para `payroll_via = 'deel'`, el payroll calculator NO calcula nada. Solo registra:

```typescript
// Entry for Deel members
{
  payRegime: 'international',
  payrollVia: 'deel',
  currency: 'USD',
  baseSalary: amount,        // Monto acordado con Deel
  remoteAllowance: 0,
  bonusOtdAmount: bonus,     // Discrecional, igual que honorarios
  bonusRpaAmount: bonus,
  // All deduction fields = 0
  grossTotal: baseSalary + bonuses,
  netTotal: grossTotal,      // No deductions — Deel handles compliance
  kpiDataSource: 'external', // Or 'notion_ops' if tracking KPIs
  deelContractId: member.deel_contract_id,
}
```

**No aplican:** AFP, salud, cesantía, impuesto, retención SII. Greenhouse solo registra para tracking de costos y Finance Module.

### B3. Routing logic actualizada

```typescript
// In calculate-payroll.ts (pseudocode)
function calculateEntry(member: Member, period: PayrollPeriod, kpis: KPIData): PayrollEntry {
  const compensation = getCurrentCompensation(member.member_id, period);

  if (member.payroll_via === 'deel') {
    return createDeelRegistrationEntry(member, compensation, kpis, period);
  }

  if (member.contract_type === 'honorarios') {
    return calculateHonorariosEntry(member, compensation, kpis, period);
  }

  // Existing logic: Chile laboral (indefinido | plazo_fijo)
  return calculateChileEntry(member, compensation, kpis, period);
}
```

---

## PARTE C: TypeScript Types

### C1. Nuevo archivo `src/types/hr-contracts.ts`

```typescript
// src/types/hr-contracts.ts

export type ContractType = 'indefinido' | 'plazo_fijo' | 'honorarios' | 'contractor' | 'eor'
export type PayRegime = 'chile' | 'international'
export type PayrollVia = 'internal' | 'deel'

export interface MemberContractInfo {
  contract_type: ContractType
  pay_regime: PayRegime
  payroll_via: PayrollVia
  schedule_required: boolean
  deel_contract_id: string | null
  contract_end_date: string | null
}

/** Derivation rules — enforced at API layer */
export const CONTRACT_DERIVATIONS: Record<ContractType, { pay_regime: PayRegime; payroll_via: PayrollVia }> = {
  indefinido:  { pay_regime: 'chile',         payroll_via: 'internal' },
  plazo_fijo:  { pay_regime: 'chile',         payroll_via: 'internal' },
  honorarios:  { pay_regime: 'chile',         payroll_via: 'internal' },
  contractor:  { pay_regime: 'international',  payroll_via: 'deel' },
  eor:         { pay_regime: 'international',  payroll_via: 'deel' },
}

/** Labels for UI — Spanish neutro LATAM, tú treatment */
export const CONTRACT_LABELS: Record<ContractType, { label: string; description: string }> = {
  indefinido:  { label: 'Indefinido',        description: 'Contrato laboral permanente — Código del Trabajo' },
  plazo_fijo:  { label: 'Plazo fijo',        description: 'Contrato laboral con fecha de término definida' },
  honorarios:  { label: 'Honorarios',        description: 'Prestación de servicios civil — boleta de honorarios' },
  contractor:  { label: 'Contractor (Deel)', description: 'Contrato internacional gestionado por Deel' },
  eor:         { label: 'EOR (Deel)',         description: 'Empleado internacional — Deel como empleador legal' },
}

/** Schedule required defaults per contract type */
export const SCHEDULE_DEFAULTS: Record<ContractType, { default: boolean; overridable: boolean }> = {
  indefinido:  { default: true,  overridable: false },
  plazo_fijo:  { default: true,  overridable: false },
  honorarios:  { default: false, overridable: true },
  contractor:  { default: false, overridable: true },
  eor:         { default: false, overridable: true },
}

/** SII retention rates by year (honorarios Chile) */
export const SII_RETENTION_RATES: Record<number, number> = {
  2024: 0.1375,
  2025: 0.145,
  2026: 0.145,
  2027: 0.1525,
  2028: 0.17,
}

export function getSiiRetentionRate(year: number): number {
  return SII_RETENTION_RATES[year] ?? SII_RETENTION_RATES[2028] // Cap at max rate
}
```

### C2. Update `src/types/payroll.ts`

Agregar/modificar:

```typescript
// Extend existing ContractType
export type ContractType = 'indefinido' | 'plazo_fijo' | 'honorarios' | 'contractor' | 'eor'
// Previously: 'indefinido' | 'plazo_fijo'

// Add to PayrollEntry
export interface PayrollEntry {
  // ... existing fields ...
  payrollVia: PayrollVia                    // NEW: 'internal' | 'deel'
  siiRetentionRate: number | null           // NEW: for honorarios
  siiRetentionAmount: number | null         // NEW: for honorarios
  deelContractId: string | null             // NEW: for Deel members
}
```

---

## PARTE D: API Changes

### D1. Contract mutation surface

La surface debe alinearse al namespace real de HR Core:

- preferencia 1: extender `PATCH /api/hr/core/members/[memberId]/profile` con contract info
- preferencia 2: crear `PATCH /api/hr/core/members/[memberId]/contract` si la separación mejora claridad sin duplicar validaciones

No crear endpoints bajo `/api/hr/members/*`, porque ese prefijo no existe hoy en el repo.

Surface para actualizar contract info de un member.

**Request body:**
```typescript
{
  contract_type: ContractType
  schedule_required?: boolean   // Only if overridable per SCHEDULE_DEFAULTS
  deel_contract_id?: string     // Only for contractor | eor
  contract_end_date?: string    // ISO date, required for plazo_fijo
}
```

**Server-side validation:**
1. Derive `pay_regime` and `payroll_via` from `contract_type` using `CONTRACT_DERIVATIONS`
2. Validate `schedule_required` override is allowed per `SCHEDULE_DEFAULTS`
3. If `contract_type = 'plazo_fijo'`, require `contract_end_date`
4. If `contract_type IN ('contractor', 'eor')`, require `deel_contract_id`
5. Update `greenhouse_core.members` with all derived fields
6. If contract type changes, do NOT auto-create a new `compensation_version` — HR must do that manually via the CompensationDrawer (different concern, different action)

**Auth:** `hr_manager` or `efeonce_admin` only.

### D2. Update `POST /api/hr/payroll/periods/[periodId]/calculate`

The existing calculate endpoint reads members and routes to the correct branch. Changes:
- Read `member.contract_type` and `member.payroll_via` from `greenhouse_core.members`
- Route to Branch 1 (Chile laboral), Branch 2 (Honorarios), or Branch 3 (Deel registration)
- For Deel members, entry creation is optional — HR can choose to include or exclude them from the period (toggle in UI)

### D3. Update payroll member read model

No existe hoy `GET /api/hr/payroll/members` como route dedicada.

La implementación debe extender el read model vigente (`src/lib/payroll/get-payroll-members.ts` y/o `GET /api/hr/payroll/compensation`) para que la UI de nómina pueda recibir `contract_type`, `pay_regime`, `payroll_via` y el flag operativo de asistencia.

---

## PARTE E: UI Changes

### E1. CompensationDrawer — Contract type section

Agregar una nueva sección al inicio del drawer (antes de "Salario y moneda"):

```
┌─────────────────────────────────────────────────────┐
│  Tipo de contrato                                    │
│                                                      │
│  [Select: Indefinido ▾]                              │
│                                                      │
│  Régimen de pago:  Chile (CLP)      ← derived, read-only
│  Nómina vía:       Interno          ← derived, read-only
│                                                      │
│  ☐ Requiere asistencia              ← checkbox       │
│    (deshabilitado para indefinido/plazo_fijo)        │
│                                                      │
│  [Si contractor/eor:]                                │
│  ID contrato Deel: [____________]                    │
│                                                      │
│  [Si plazo_fijo:]                                    │
│  Fecha de término: [📅 ____________]                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Al cambiar `contract_type`, `pay_regime` y `payroll_via` se derivan automáticamente (read-only pills)
- Las secciones "Previsión Chile" (AFP, salud, cesantía) se ocultan si `contract_type = 'honorarios'`
- Las secciones "Previsión Chile" + "Salario base" se reemplazan por "Monto bruto acordado" si `payroll_via = 'deel'`
- El campo de bonos KPI muestra "(discrecional)" en vez de "(threshold: OTD ≥ 89%)" para honorarios y Deel

### E2. PayrollEntryTable — Badges

Agregar badge de tipo de contrato por persona en la tabla de nómina:

| Badge | Color | Condición |
|---|---|---|
| `CLP` | `GH_COLORS.semantic.info` | `pay_regime = 'chile'` (ya existe) |
| `USD` | `GH_COLORS.semantic.warning` | `pay_regime = 'international'` (ya existe) |
| `HON` | `GH_COLORS.role.strategy` (Orchid Purple) | `contract_type = 'honorarios'` — **NUEVO** |
| `DEEL` | `#E94560` bg, `#1A1A2E` text | `payroll_via = 'deel'` — **NUEVO** |

### E3. PayrollEntryExpanded — Honorarios desglose

Para entries de honorarios, el desglose expandido muestra:

```
Monto bruto:                 $1.500.000
  Retención SII (14.5%):    - $217.500
  ─────────────────────────────────────
  Líquido estimado:          $1.282.500
```

Para entries Deel, el desglose muestra:

```
Monto acordado:              $2,000.00 USD
  Bonos (discrecional):     + $200.00
  ─────────────────────────────────────
  Total registrado:          $2,200.00 USD
  Pagado vía:                Deel
```

---

## PARTE F: File structure

```
src/
├── types/
│   ├── hr-contracts.ts                           # NEW: ContractType, derivations, labels, SII rates
│   └── payroll.ts                                # MODIFIED: extend ContractType, add PayrollVia, SII fields
│
├── lib/
│   └── payroll/
│       ├── calculate-payroll.ts                  # MODIFIED: routing logic, Branch 2 + Branch 3
│       ├── calculate-honorarios.ts               # NEW: Honorarios calculation (bruto → SII retention → net)
│       ├── create-deel-entry.ts                  # NEW: Deel registration entry (no calculation)
│       └── calculate-chile-deductions.ts         # EXISTING: no changes
│
├── app/
│   └── api/
│       └── hr/
│           ├── core/
│           │   └── members/
│           │       └── [memberId]/
│           │           ├── profile/
│           │           │   └── route.ts          # MODIFIED if reusing existing PATCH surface
│           │           └── contract/
│           │               └── route.ts          # OPTIONAL NEW if split is justified
│           └── payroll/
│               ├── periods/
│               │   └── [periodId]/
│               │       └── calculate/
│               │           └── route.ts          # MODIFIED: uses new routing logic
│               └── compensation/
│                   └── route.ts                  # MODIFIED: return/propagate contract fields for payroll surfaces
│
├── views/
│   └── greenhouse/
│       └── payroll/
│           ├── CompensationDrawer.tsx             # MODIFIED: contract type section at top
│           └── PayrollEntryTable.tsx              # MODIFIED: contract badges + expanded honorarios/Deel breakdowns
│
└── scripts/
    └── migrate-contract-types.ts                 # ONE-TIME: migration script for existing data
```

---

## PARTE G: Orden de ejecución

### Fase 1: Descubrimiento (ANTES de escribir código)

1. Verificar columnas actuales de `greenhouse_core.members` — qué existe vs. qué falta
2. Verificar columnas actuales de `greenhouse_payroll.compensation_versions` — leer `contract_type` existente
3. Leer `calculate-payroll.ts` en el repo — entender el routing actual
4. Leer `CompensationDrawer.tsx` en el repo — entender las secciones actuales
5. Verificar qué members existen y sus `employment_type` y `pay_regime` actuales
6. Leer `greenhouse_serving.member_360` y `member_payroll_360` — entender las views actuales

### Fase 2: Infraestructura

7. ALTER TABLE `greenhouse_core.members` — agregar columnas canónicas faltantes y resolver compatibilidad del flag de asistencia (`daily_required` vs `schedule_required`)
8. Ejecutar migración de datos (A2)
9. Recrear serving views (A3)
10. Crear TypeScript types (`hr-contracts.ts`) (C1)
11. Actualizar `payroll.ts` types (C2)

### Fase 3: Payroll calculator

12. Crear `calculate-honorarios.ts` (B1)
13. Crear `create-deel-entry.ts` (B2)
14. Actualizar routing logic en `calculate-payroll.ts` (B3)
15. Actualizar `POST .../calculate` endpoint (D2)

### Fase 4: API

16. Extender surface de contrato en HR Core siguiendo el namespace real (`/api/hr/core/...`) (D1)
17. Actualizar el read model vigente de payroll members/compensation para retornar contract fields (D3)

### Fase 5: UI

18. Actualizar `CompensationDrawer.tsx` — contract type section (E1)
19. Actualizar `PayrollEntryTable.tsx` — badges (E2)
20. Actualizar el desglose expandido en la surface real que hoy vive dentro de `PayrollEntryTable.tsx` (E3)

---

## Criterios de aceptación

### Schema

- [ ] `greenhouse_core.members` expone el contrato canónico (`contract_type`, `pay_regime`, `payroll_via`, `deel_contract_id`)
- [ ] La semántica de asistencia queda resuelta de forma backward-compatible sobre `daily_required` o un alias/migración equivalente documentada
- [ ] Datos existentes migrados correctamente (members con `pay_regime = 'international'` en compensations → `payroll_via = 'deel'`)
- [ ] Serving views `member_360` y `member_payroll_360` exponen los nuevos campos
- [ ] Migration script es idempotente (puede correr múltiples veces sin efecto)

### Payroll calculator

- [ ] Branch 2 (honorarios): calcula bruto → retención SII → neto correctamente
- [ ] Branch 2: usa rate de SII del año del período (no hardcodeado)
- [ ] Branch 3 (Deel): crea entry de registro sin calcular descuentos
- [ ] Branch 3: `net_total = gross_total` (no hay descuentos)
- [ ] Routing: `payroll_via = 'deel'` → Branch 3, `contract_type = 'honorarios'` → Branch 2, else → Branch 1
- [ ] Bonos para honorarios y Deel son discrecionales (sin threshold validation)

### API

- [ ] La surface de contrato en HR Core valida derivations (contractor → international + deel)
- [ ] `PATCH` rechaza `schedule_required = false` para indefinido y plazo_fijo
- [ ] `PATCH` requiere `contract_end_date` para plazo_fijo
- [ ] `PATCH` requiere `deel_contract_id` para contractor y eor
- [ ] El read model vigente de payroll members/compensation retorna `contract_type`, `pay_regime`, `payroll_via`

### UI

- [ ] CompensationDrawer muestra selector de contract type con derivaciones read-only
- [ ] Secciones de previsión Chile se ocultan para honorarios
- [ ] Secciones de previsión y salario se adaptan para Deel
- [ ] Badges `HON` y `DEEL` aparecen en la tabla de nómina
- [ ] Desglose expandido de honorarios muestra retención SII
- [ ] Desglose expandido de Deel muestra "Pagado vía: Deel"

---

## Lo que NO incluye esta tarea

- Crear nuevos módulos HRIS (Document Vault, Onboarding, etc.) — son fases posteriores
- Integración con Deel API — solo se guarda `deel_contract_id` como referencia manual
- Migración del campo `employment_type` — coexiste con `contract_type` (jornada vs. tipo contractual)
- Cambios a leave_types eligibility — eso se resuelve cuando se implemente la matriz de elegibilidad del HRIS Architecture doc
- Cálculo automático del impuesto único para Chile laboral — sigue siendo manual por HR (MVP)
- Integración Nubox — sigue fuera de scope

---

## Notas para el agente

- **Fase de descubrimiento es OBLIGATORIA.** No escribas `ALTER TABLE` sin primero verificar qué columnas ya existen en `members`. El campo `contract_end_date` ya podría existir de HR Core.
- **No elimines `employment_type`.** Coexiste con `contract_type`. El primero describe jornada (full_time/part_time/contractor), el segundo describe tipo contractual legal (indefinido/plazo_fijo/honorarios/contractor/eor). Son dimensiones ortogonales.
- **No elimines `contract_type` de `compensation_versions`.** Sigue existiendo como snapshot del momento del cálculo. Pero el campo canónico ahora vive en `members`.
- **Las derivations son soft, no constraints.** Se validan en la API, no con CHECK constraints en la DB. Esto permite flexibilidad futura (ej: un contractor Chile si Efeonce abre entidad local en otro país).
- **SII retention rate cambia por año.** Usa `getSiiRetentionRate(period.year)`, no un hardcoded `0.145`.
- **`schedule_required` no es lo mismo que `daily_required`.** Si `daily_required` ya existe en el repo (de HR Core), evalúa si se puede reusar o si son conceptos diferentes. Si son lo mismo, renombra. Si no, documenta la diferencia.
- **Colores para badges:** Usar `GH_COLORS` para todo excepto el badge de Deel que usa colores de marca Deel (#E94560 / #1A1A2E) — documentar como excepción en nomenclatura.
- **Branch naming:** `feature/hris-contract-types`.
- **Cada push genera preview en Vercel.** Usa ese preview para QA visual antes de merge.

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*
*Documento técnico interno para agentes de desarrollo. Referencia normativa para implementación.*
