# TASK-894 — International Internal Contract Type Foundation

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr|payroll|workforce|finance|data`
- Blocked by: `none`
- Branch: `task/TASK-894-international-internal-contract-type`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear `international_internal` como tipo contractual canonico para colaboradores internacionales pagados internamente por Greenhouse/Efeonce, sin Deel/EOR. Hoy el recibo y los reportes reconocen el regimen `international_internal` como fallback, pero no existe un `ContractType` seleccionable ni persistible por el flujo canonico de colaboradores.

La solucion debe cerrar la matriz contrato -> regimen -> via de pago -> moneda -> requisitos, sin permitir combinaciones libres en UI y sin parches locales en los dropdowns.

## Why This Task Exists

Hoy `src/types/hr-contracts.ts` solo permite cinco contratos: `indefinido`, `plazo_fijo`, `honorarios`, `contractor`, `eor`. Los dos contratos internacionales (`contractor`, `eor`) derivan siempre a `payrollVia='deel'`, y los contratos internos derivan siempre a `payRegime='chile'`.

Esto produce un gap real: un colaborador internacional pagado internamente no puede configurarse desde el flujo canonico. El UI de compensacion muestra `Internacional` como regimen, pero lo mantiene deshabilitado y derivado desde el contrato; el backend tambien re-deriva `payRegime/payrollVia` desde `CONTRACT_DERIVATIONS`, asi que enviar `payRegime='international'` manualmente no basta.

## Goal

- Agregar un contrato canonico `international_internal` con derivacion `{ payRegime: 'international', payrollVia: 'internal' }`.
- Exponerlo en los dropdowns correctos para compensacion y remediacion workforce, sin habilitar combinaciones arbitrarias.
- Asegurar que payroll projected/official, receipts, reportes, exports, payment obligations y readiness lo traten como internacional interno, sin descuentos Chile y sin requisito Deel.
- Actualizar schema/check constraints, normalization, labels, tests y docs para que el estado sea first-class y no un fallback legacy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYROLL_PERIOD_OUTPUTS_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No habilitar un selector libre `payRegime + payrollVia` en UI. El operador escoge un perfil contractual valido y Greenhouse deriva lo demas.
- No mapear `international_internal` a Deel ni exigir `deelContractId`.
- No aplicar AFP, Fonasa/Isapre, Seguro de Cesantia, SIS, mutual, APV, IUSC ni retencion SII Chile a `international_internal`.
- No degradar `international_internal` a `contractor` si el colaborador es pagado internamente.
- No romper data legacy: `resolveReceiptRegime` debe seguir clasificando entradas antiguas `payRegime='international'` + `payrollVia='internal'`.
- Toda migracion de CHECK constraints debe ser forward-safe, reversible por rollback de constraint, y validada en staging.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/documentation/hr/recibos-y-reporte-mensual.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `AGENTS.md`
- `CLAUDE.md`

## Dependencies & Impact

### Depends on

- `src/types/hr-contracts.ts`
- `src/views/greenhouse/payroll/CompensationDrawer.tsx`
- `src/views/greenhouse/admin/workforce-activation/WorkforceIntakeRemediationDrawer.tsx`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/receipt-presenter.ts`
- `src/lib/payroll/project-payroll.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `scripts/setup-postgres-payroll.sql`
- `scripts/setup-postgres-canonical-360.sql`

### Blocks / Impacts

- `TASK-893` Payroll Participation Window debe incluir `international_internal` en su matriz de internos proyectables/prorrateables.
- Payroll projected payroll (`GET /api/hr/payroll/projected`).
- Official payroll calculation and `payroll_entries.contract_type_snapshot`.
- Payroll receipts, period PDF/Excel and `groupEntriesByRegime`.
- Payment obligations bridge, because `payrollVia='internal'` implies Greenhouse/Finance owns the payment instruction.
- Workforce Activation and intake remediation.
- Staff Aug / commercial cost mapping where `contract_type` maps to employment type aliases.
- Offboarding lane derivation for non-Chile/internal international closures.

### Files owned

- `src/types/hr-contracts.ts`
- `src/views/greenhouse/payroll/CompensationDrawer.tsx`
- `src/views/greenhouse/admin/workforce-activation/WorkforceIntakeRemediationDrawer.tsx`
- `src/lib/payroll/receipt-presenter.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/project-payroll.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/*international*.test.ts`
- `src/views/greenhouse/payroll/CompensationDrawer.test.tsx`
- `src/views/greenhouse/payroll/PayrollReceiptCard.test.tsx`
- `scripts/setup-postgres-payroll.sql`
- `scripts/setup-postgres-canonical-360.sql`
- `scripts/migrations/*international-internal*.sql`
- `scripts/audit-payroll-contract-types.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYROLL_PERIOD_OUTPUTS_V1.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/documentation/hr/recibos-y-reporte-mensual.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Contract taxonomy and derivations:
  - `src/types/hr-contracts.ts`
- Compensation UI derives regime/via from contract:
  - `src/views/greenhouse/payroll/CompensationDrawer.tsx`
- Workforce remediation uses `CONTRACT_LABELS`:
  - `src/views/greenhouse/admin/workforce-activation/WorkforceIntakeRemediationDrawer.tsx`
- Backend compensation persistence re-derives member contract facts:
  - `src/lib/payroll/postgres-store.ts`
- Receipt/report regime classifier already recognizes `international_internal` as a regime:
  - `src/lib/payroll/receipt-presenter.ts`
  - `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- DB setup scripts constrain contract types:
  - `scripts/setup-postgres-payroll.sql`
  - `scripts/setup-postgres-canonical-360.sql`

### Gap

- No `ContractType` exists for `payRegime='international'` + `payrollVia='internal'`.
- Dropdowns cannot select the state.
- API payloads cannot reliably force the state because persistence normalizes from `CONTRACT_DERIVATIONS`.
- Current CHECK constraints only allow `indefinido`, `plazo_fijo`, `honorarios`, `contractor`, `eor`.
- Receipt/report surfaces can display `international_internal`, but that regime is currently legacy/fallback rather than a first-class contract.

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

### Slice 1 — ADR + Taxonomy Contract

- Actualizar arquitectura HR/Payroll con la matriz canonica de contratos (3 dimensiones):

  | contractType | payRegime | payrollVia | legalEmployer | currencyDefault | chileDeductions |
  | --- | --- | --- | --- | --- | --- |
  | `indefinido` | chile | internal | Efeonce SpA (Chile) | CLP | si (AFP + salud + cesantia + IUSC) |
  | `plazo_fijo` | chile | internal | Efeonce SpA (Chile) | CLP | si (mismo set) |
  | `honorarios` | chile | internal | trabajador (boleta honorarios) | CLP | si (retencion SII Art 74 N°2) |
  | `contractor` | international | deel | Deel entity / contractor self | USD | no |
  | `eor` | international | deel | Deel EOR | USD | no |
  | `international_internal` | international | **internal** | **Efeonce SpA (operativo, NO legal employer)** | USD | no |

- **Legal Employer Dimension** es invariante canonico explicito. La matriz tiene 3 dimensiones ortogonales (`payRegime`, `payrollVia`, `legalEmployer`) que `contractType` colapsa lineal. La diferencia entre `contractor` y `international_internal` NO es solo via de pago — es **quien es legal employer**:
  - `contractor`: Greenhouse contrata via Deel; legal employer es Deel entity o contractor mismo.
  - `international_internal`: Efeonce SpA paga internamente; Efeonce es operational payer pero **NO declara employer of record** en jurisdiccion del trabajador.

- **Legal Scope V1 (declaracion vinculante)**: `international_internal` es perfil **OPERATIVO**, no legal. Significa:
  - Greenhouse procesa la nomina (calculo, recibo, payment obligation) internamente.
  - Greenhouse **NO declara** local-country tax (income tax, social security) en V1.
  - Greenhouse **NO actua como employer of record** en jurisdiccion del trabajador en V1.
  - Cualquier obligacion de retencion / declaracion local-country es responsabilidad del trabajador o de un vehiculo separado.
  - El recibo emitido lleva disclaimer obligatorio: "Pago internacional procesado por Efeonce SpA. Las obligaciones tributarias locales del trabajador son responsabilidad del trabajador o su jurisdiccion de residencia."

- Indexar la decision en `docs/architecture/DECISIONS_INDEX.md` si cambia contrato arquitectonico compartido.

### Slice 2 — Schema + Runtime Type Foundation

- Extender `ContractType` con `international_internal`.
- Extender `CONTRACT_DERIVATIONS`, `CONTRACT_LABELS`, `SCHEDULE_DEFAULTS`, `CONTRACT_COMPENSATION_POLICIES`, `normalizeContractType`, `contractAllowsRemoteAllowance`.
- Crear migracion para ampliar CHECK constraints en:
  - `greenhouse_core.members.contract_type` (CHECK por columna ampliado con 'international_internal')
  - `greenhouse_payroll.compensation_versions.contract_type` (idem)
  - cualquier snapshot/entry constraint descubierto en Plan Mode.
- **CHECK constraint compuesto canonico** (defense in depth nivel DB, mirror TASK-742 `client_users_auth_mode_invariant` pattern) sobre la tupla `(contract_type, pay_regime, payroll_via)` enforce las 6 combinaciones validas a nivel DB. Sin esto, las 14 combinaciones invalidas (5x2x2 - 6) pueden existir via SQL directo:

  ```sql
  ALTER TABLE greenhouse_core.members
    ADD CONSTRAINT members_contract_facts_canonical_tuple_check
    CHECK (
      (contract_type IN ('indefinido', 'plazo_fijo', 'honorarios') AND pay_regime = 'chile' AND payroll_via = 'internal')
      OR (contract_type IN ('contractor', 'eor') AND pay_regime = 'international' AND payroll_via = 'deel')
      OR (contract_type = 'international_internal' AND pay_regime = 'international' AND payroll_via = 'internal')
    ) NOT VALID;

  -- Validate atomic post-backfill (TASK-708/728 pattern)
  ALTER TABLE greenhouse_core.members VALIDATE CONSTRAINT members_contract_facts_canonical_tuple_check;
  ```

  Mirror constraint en `greenhouse_payroll.compensation_versions`. Si quedan rows preexistentes con tuple invalido, el `VALIDATE` los detecta y la migracion falla loud — la decision (allowlist temporal vs fix data primero) queda explicita y documentada.

- Actualizar setup scripts (`setup-postgres-canonical-360.sql` + `setup-postgres-payroll.sql`) para que entornos nuevos nazcan con AMBOS checks (columna + tupla compuesto).
- Agregar test de normalizacion/derivacion exhaustivo cubriendo matriz completa 6x2x2 = 24 combinaciones: asserting que las 6 validas pasan, las 18 invalidas son rechazadas (a nivel normalizador TS + a nivel CHECK constraint DB con test live contra PG).
- Verificacion post-`pnpm migrate:up`: query a `information_schema.check_constraints` que confirma constraint creado (anti pre-up-marker bug check pattern, ver `migrations/20260508104217939_task-611-capabilities-registry.sql` para template).

### Slice 3 — Write Paths + UI Selection

- Agregar opcion visible en `CompensationDrawer` con label `Internacional interno` (decision Open Question Q1).
- Agregar opcion en Workforce Activation remediation.
- Mantener `payRegime` y `payrollVia` como derivados/read-only en UI.
- Asegurar que `deelContractId` no se exija ni se envie para `international_internal`.
- Asegurar moneda default `USD` sin conversion silenciosa. Override explicito per `compensation_version` cuando emerja caso EUR / GBP / ARS futuro (no anticipar matriz country→currency V1).
- Asegurar que schedule/KPI defaults sean explicitos y testeados.
- `contractAllowsRemoteAllowance(international_internal)` = `false` (V1 conservador; remote allowance es beneficio chile-specific. Override explicito V1.1 si HR define caso de uso).

- **Capability gate canonica** (defense in depth UI + API):
  - Nueva capability `payroll.contract.use_international_internal` (module=`hr`, action=`use`, scope=`tenant`, reserved EFEONCE_ADMIN). Sin la capability, la opcion `Internacional interno` se oculta en dropdown.
  - Seed en `greenhouse_core.capabilities_registry` (migration en Slice 2 incluye el seed).
  - Grant en `src/lib/entitlements/runtime.ts` con comentario `// TASK-894 — internacional interno requires legal review per member`.

- **Payload contract** para write paths (`POST /api/admin/team/members/...` y `PATCH /api/admin/workforce/.../compensation`):
  - Cuando `contractType === 'international_internal'`, el payload **debe** incluir `legalReviewReference: string` (free-text, min 10 chars, apuntando a doc legal: ticket Legal/HR, contract reference, approval thread). Persistido en `compensation_versions.metadata_json.legalReviewReference`.
  - Sin `legalReviewReference`, endpoint retorna `400` con canonical error code `international_internal_requires_legal_review_reference` (per CLAUDE.md canonical error contract).
  - Tests: payload sin reference rechazado; con reference < 10 chars rechazado; con reference valido persistido en metadata_json.

### Slice 4 — Payroll Semantics

- Ajustar projected + official payroll para clasificar `international_internal` como pago interno internacional:
  - entra a nomina interna cuando esta activo y no excluido por TASK-890/TASK-893;
  - no aplica deductions Chile (branch en `payRegime === 'chile'`, NUNCA en `contractType`);
  - no aplica retencion SII;
  - no requiere Deel provider metadata.

- **`resolveReceiptRegime` tightening** (`src/lib/payroll/receipt-presenter.ts`): la cascade actual usa step 4 `payRegime === 'international'` como fallback path (line 295). Post-task ese path tiene que pasar a primary cuando `contractTypeSnapshot === 'international_internal'`. Nueva cascade canonica:
  - Step 1a (NEW): `contractTypeSnapshot === 'international_internal'` → `international_internal` (primary, explicit)
  - Step 1b: contractor / eor → `international_deel` (existing)
  - Step 2: `payrollVia === 'deel'` → `international_deel` (existing)
  - Step 3: `siiRetentionAmount > 0` → `honorarios` (existing)
  - Step 4 (fallback legacy): `payRegime === 'international'` → `international_internal` + emit `captureWithDomain('payroll', warn, { source: 'receipt_regime.fallback_resolution_legacy_data', contractType: null })` para detectar drift historico en entries pre-task.

- Extender receipts/reportes/export Excel/PDF para que `contractTypeSnapshot='international_internal'` sea primario y no solo fallback por `payRegime`. Display layer YA esta listo (`receipt-presenter.ts:32`, `generate-payroll-pdf.tsx:460`, `generate-payroll-excel.ts:110`); validar que las 4 surfaces (preview MUI + PDF + Excel + period report PDF) leen del nuevo primary path.

- Revisar `PayrollEntryTable`, `ProjectedPayrollView`, `PaymentOrders` y cualquier agregacion por regimen para mostrarlo separadamente de Deel.

- **Cross-task TASK-893 integration test** (canonical fixture):

  ```text
  Member: contractType='international_internal'
  Compensation: effective_from='2026-05-13', baseSalary=5000, currency='USD'
  Period: 2026-05-01 -> 2026-05-31
  Expected (with TASK-893 flag ON):
    - policy: 'prorate_from_start'
    - prorationFactor: ~0.6 (12 of 22 weekdays)
    - chileTotalDeductions: 0
    - siiRetentionAmount: null
    - grossTotal: ~3000 USD
    - netTotal: ~3000 USD (no Chile deductions, no SII)
    - currency: USD (no conversion silente a CLP)
    - regime classified: international_internal
    - PDF receipt: "Internacional interno" badge + USD section
  ```

  Sin TASK-893 flag (legacy mode), mismo member retorna grossTotal=5000 (full month). Test cubre ambos paths para anti-regression.

### Slice 5 — Cross-Domain Mapping + Readiness + Audit

- Actualizar Workforce Activation readiness para que `payroll_via='internal'` siga exigiendo payment profile interno cuando aplique, aunque el regimen sea internacional. Validar especificamente:
  - Intake form NO pide datos chile-specific (RUT, AFP, sistema salud) cuando `contractType='international_internal'`.
  - Bank account requirement: payment profile internacional (USD wire / SWIFT) requerido en lugar de cuenta chile.
  - `workforce_intake_status='completed'` (TASK-872 gate) coexiste sin friction.

- Actualizar Staff Aug/commercial employment type alias audit para no mapearlo accidentalmente a Deel.

- **Payment Obligations bridge** (verificado en codigo, `materialize-payroll.ts:164`): la lane se decide por `payroll_via === 'deel'`, no por `pay_regime`. `international_internal` con `payroll_via='internal'` ya cae en la lane interna existente. **NO requiere lane nueva**. Validar especificamente:
  - `amount_native = grossTotal USD`
  - `amount_clp = grossTotal × exchange_rate_at_period_end` (rate historico al periodo payroll, NO actual — TASK-766 reader pattern)
  - `currency = 'USD'` persistido en payment_obligation
  - Lane = `payroll_internal` (existente)
  - Coordinacion con `greenhouse-finance-accounting-operator` skill ANTES de Slice 5 merge para confirmar que el reader CLP canonico (TASK-766/774 patterns) cubre el caso. Si emerge gap, follow-up task explicita.

- **Audit log canonico `member_contract_type_audit_log`** (append-only, mirror TASK-785 role title governance pattern):

  ```sql
  CREATE TABLE greenhouse_core.member_contract_type_audit_log (
    audit_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id         TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
    previous_contract_type TEXT,
    previous_pay_regime    TEXT,
    previous_payroll_via   TEXT,
    new_contract_type      TEXT NOT NULL,
    new_pay_regime         TEXT NOT NULL,
    new_payroll_via        TEXT NOT NULL,
    actor_user_id     TEXT,
    actor_label       TEXT NOT NULL,  -- e.g. 'user:USER_ID', 'script:task-894-backfill', 'migration:TASK-894'
    reason            TEXT NOT NULL,  -- min 10 chars enforced at app layer
    legal_review_reference TEXT,      -- required when new_contract_type='international_internal'
    metadata_json     JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Anti-mutation triggers (append-only)
  CREATE TRIGGER member_contract_type_audit_no_update
    BEFORE UPDATE ON greenhouse_core.member_contract_type_audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_update_on_audit_log();

  CREATE TRIGGER member_contract_type_audit_no_delete
    BEFORE DELETE ON greenhouse_core.member_contract_type_audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_delete_on_audit_log();
  ```

  Write path (`updateMemberContractType()` o equivalente helper canonico) escribe audit row en la misma tx que el UPDATE de `members` / `compensation_versions`.

- **3 reliability signals canonicos** bajo subsystem `Identity & Access` (audit + drift) + `Finance Data Quality` (payroll impact):

  | Signal | Kind | Severity | Steady | Detects |
  | --- | --- | --- | --- | --- |
  | `payroll.contract_taxonomy.invalid_tuple_drift` | data_quality | error if > 0 | 0 | rows con tuple invalido (defense in depth despues del CHECK compuesto; detecta drift si constraint es bypaseada via DDL futuro) |
  | `payroll.contract_taxonomy.invalid_statutory_application` | drift | error if > 0 | 0 | members `international_internal` con `chileTotalDeductions > 0` o `siiRetentionAmount > 0` en payroll entry |
  | `payroll.contract_taxonomy.fallback_resolution_legacy` | drift | warning if > 0 | 0 | entries con `contractTypeSnapshot=NULL` que caen al fallback step 4 de `resolveReceiptRegime` |

### Slice 6 — Tests + Docs + Rollout

- Tests unitarios para derivacion y normalizacion.
- Tests UI para dropdowns y clearing de Deel ID.
- Tests payroll para projected/official no-Chile deductions.
- Tests receipt/report para label y grouping.
- Actualizar docs funcionales/manuales y Handoff/changelog.
- Validar staging con un colaborador fixture o synthetic data, sin mutar casos productivos reales sin aprobacion HR/Finance.

## Out of Scope

- Definir obligaciones fiscales del pais de residencia del colaborador. V1 registra payroll operativo, no reemplaza legal counsel/local tax engine.
- Implementar nuevo proveedor distinto de Deel.
- Convertir `payrollVia` a enum abierto (`remote`, `oyster`, `direct_international`, etc.). Eso pertenece a una V2 de payroll provider taxonomy.
- Backfill masivo automatico de colaboradores reales. V1 debe incluir dry-run/report primero.
- Recalcular payroll periods cerrados/exportados.
- Resolver prorrata de ingreso/salida; eso vive en `TASK-893`.

## Detailed Spec

### Canonical Derivation

```ts
international_internal: {
  payRegime: 'international',
  payrollVia: 'internal'
}
```

### UI Contract

El operador elige `Contrato = Internacional interno`. El UI muestra:

- `Regimen = Internacional`
- `Via de pago = Interna`
- `Contrato Deel = no aplica`
- `Moneda = USD` por default, editable solo si el flujo actual ya permite moneda.

El UI no debe permitir que el operador elija `contractor` y luego cambie manualmente la via a `internal`.

### Payroll Calculation Contract

Para `international_internal`:

- `grossTotal` parte de compensacion/bonos/remuneracion internacional.
- `netTotal` no descuenta Chile statutory ni SII.
- `payrollVia='internal'` significa que Finance debe poder generar obligacion de pago interna.
- `payRegime='international'` significa que los reports lo separan de Chile dependiente y honorarios.

### Migration Safety

La migracion debe:

- dropear/recrear CHECK constraints de forma explicita y nombrada;
- preservar datos existentes;
- incluir preflight que cuente valores fuera del nuevo set;
- no convertir ningun miembro existente sin allowlist;
- documentar rollback de constraint si el codigo se revierte.

### Data Quality / Backfill

Antes de cualquier apply sobre personas reales:

1. Reportar candidatos con `payRegime='international' AND payrollVia='internal'` pero `contract_type` distinto.
2. Reportar candidatos con `contract_type='contractor' AND payrollVia='internal'`.
3. Reportar candidatos con `payrollVia='deel'` sin `deelContractId`.
4. Producir CSV/dry-run y requerir aprobacion HR/Finance para backfill.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (ADR/taxonomy) -> Slice 2 (schema + types) -> Slice 3 (write paths/UI) -> Slice 4 (payroll semantics) -> Slice 5 (cross-domain/readiness) -> Slice 6 (tests/docs/rollout).
- Slice 2 schema migration MUST land before any UI can persist `international_internal`.
- Slice 4 MUST land before production enables selection for real users.
- Slice 5 reliability checks MUST land before any backfill apply.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Clasificar internacional interno como Deel y excluirlo de pagos internos | payroll/finance | medium | derivation canonical + tests projected/payment obligations | `payroll.contract_taxonomy.invalid_tuple_drift` |
| Aplicar descuentos Chile a internacional interno | payroll/compliance | medium | receipt/payroll regime tests + branch en `payRegime`, no en `contractType` | `payroll.contract_taxonomy.invalid_statutory_application` |
| UI permite combinaciones libres invalidas | UI/payroll | medium | profile selection only; derived read-only regime/via | component tests |
| CHECK constraint columna ampliada bypaseada via SQL directo | data | low | **CHECK constraint compuesto** sobre tupla `(contract_type, pay_regime, payroll_via)` enforce 6 combinaciones validas DB-level | `payroll.contract_taxonomy.invalid_tuple_drift` |
| Migracion `VALIDATE CONSTRAINT` falla por rows preexistentes invalidas | data | low-medium | migration preflight count + decision documentada (allowlist vs fix data) ANTES de apply | migration failure loud |
| Backfill cambia personas reales incorrectamente | data/hr | low | dry-run CSV + allowlist + HR/Finance approval + `member_contract_type_audit_log` append-only | audit log + handoff evidence |
| TASK-893 no contempla nuevo tipo y prorratea mal | payroll | medium | fixture explicita `international_internal` mid-month en Slice 4 + paralela en TASK-893 acceptance | `payroll.participation_window.*` |
| **Legal/Tax: PE risk en jurisdiccion del trabajador** | legal/finance | **high si se usa sin review** | Legal Scope V1 declaracion vinculante + capability `payroll.contract.use_international_internal` + `legalReviewReference` payload required + allowlist documentada en `Handoff.md` | audit log row per write + manual review per case |
| FX conversion silente USD -> CLP en payment_obligations | finance | medium | rate historico al periodo (TASK-766 reader pattern) + validacion `greenhouse-finance-accounting-operator` pre-Slice 5 merge | `finance.expense_payments.clp_drift` (existente) |
| `resolveReceiptRegime` fallback path masks legacy contract_type_snapshot=NULL | observability | low | step 1a explicit primary + Sentry warning cuando fallback dispara | `payroll.contract_taxonomy.fallback_resolution_legacy` |
| Activacion productiva sin legal/finance review | legal/release | high | capability NO grant-eada hasta legal/finance firme; dropdown oculto sin capability | `Handoff.md` evidence + grant audit |

### Feature flags / cutover

- Sin env flag obligatorio para agregar el valor a tipos y schema; es additive y no cambia datos existentes.
- Para UI productiva, si el equipo lo estima necesario en Plan Mode, agregar flag `PAYROLL_INTERNATIONAL_INTERNAL_CONTRACT_ENABLED=false` default hasta staging validation.
- Si no se agrega flag, el rollout debe depender de que todos los semantics/tests de Slice 4 esten en el mismo release antes de mostrar la opcion.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Slice 1 | Revert docs/ADR | <10 min | si |
| Slice 2 | Revert code + recrear CHECK anterior solo si no hay rows `international_internal` | 15-30 min | parcial |
| Slice 3 | Ocultar opcion via flag o revert UI; no muta datos por si sola | <10 min | si |
| Slice 4 | Revert code; si hubo payroll calculations, no recalcular periods cerrados sin protocolo | 15-30 min | parcial |
| Slice 5 | Disable signal/report or revert; no amount impact | <10 min | si |
| Slice 6 | Docs update/revert | <10 min | si |

### Production verification sequence

1. Apply migration in staging and verify CHECK constraints accept `international_internal`.
2. Create/update synthetic staging member compensation as `international_internal`.
3. Verify persisted facts:
   - `contract_type='international_internal'`
   - `pay_regime='international'`
   - `payroll_via='internal'`
   - `deel_contract_id IS NULL`
4. Verify projected payroll includes the member as internal payment and no Chile deductions.
5. Verify receipt/report grouping shows `Internacional interno`, not Deel.
6. Verify payment obligation bridge treats it as internal payable or explicitly documented pending lane.
7. Verify TASK-893 staging, once implemented, prorates the same member correctly.
8. Repeat production only after HR/Finance approval and no real backfill unless separately approved.

### Out-of-band coordination required

- HR/Finance must confirm the business label and default currency for the profile.
- Legal/People Ops must confirm whether V1 label can say `Internacional interno` without implying employee status in the worker's country.
- Finance must confirm payment obligation lane and funding workflow before real use in production.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `ContractType` includes `international_internal`.
- [ ] `CONTRACT_DERIVATIONS.international_internal` resolves to `payRegime='international'` and `payrollVia='internal'`.
- [ ] Matriz canonica 3D (`contractType` × `payRegime` × `payrollVia` × `legalEmployer` × `currencyDefault`) documentada en spec con 6 filas explicitas (Slice 1).
- [ ] **Legal Scope V1 declaracion vinculante** persistida en spec: perfil operacional, NO legal employer, disclaimer obligatorio en recibo.
- [ ] DB CHECK constraints **columna ampliada** allow `international_internal` en member y compensation contract snapshots.
- [ ] DB CHECK constraint **compuesto** sobre tupla `(contract_type, pay_regime, payroll_via)` enforce 6 combinaciones validas; 18 invalidas rechazadas a nivel DB.
- [ ] Capability `payroll.contract.use_international_internal` seedeada en `capabilities_registry` + granteada en `runtime.ts` SOLO a EFEONCE_ADMIN.
- [ ] UI dropdown `Internacional interno` oculto sin capability; visible cuando capability presente; `payRegime`/`payrollVia` siempre derived read-only.
- [ ] Payload `legalReviewReference` (min 10 chars) requerido en write paths cuando `contractType='international_internal'`; canonical error code `international_internal_requires_legal_review_reference` cuando ausente.
- [ ] `deelContractId` is not required and is cleared for `international_internal`.
- [ ] Payroll projected and official calculations do not apply Chile statutory deductions or SII retention.
- [ ] `resolveReceiptRegime` cascade actualizada: step 1a explicit `contractTypeSnapshot==='international_internal'` primary path; step 4 fallback legacy data emite warning Sentry.
- [ ] Receipt/report/export grouping treats `contractTypeSnapshot='international_internal'` as primary `international_internal` regime; 4 surfaces (preview MUI + PDF + Excel + period report) validadas.
- [ ] Payment obligations bridge usa lane interna existente (`payroll_via='internal'`) sin lane nueva; FX historico al periodo aplicado correctamente (`amount_native` USD + `amount_clp` con rate at-period-end).
- [ ] `member_contract_type_audit_log` append-only creada con anti-UPDATE/anti-DELETE triggers; cada write de contract_type emite audit row en misma tx.
- [ ] 3 reliability signals readable y wired en `getReliabilityOverview`:
  - [ ] `payroll.contract_taxonomy.invalid_tuple_drift`
  - [ ] `payroll.contract_taxonomy.invalid_statutory_application`
  - [ ] `payroll.contract_taxonomy.fallback_resolution_legacy`
- [ ] TASK-893 explicitly includes `international_internal` fixture mid-month entry en su acceptance criteria + tests.
- [ ] Coordinacion con `greenhouse-finance-accounting-operator` skill para validar payment_obligations FX path completada y documentada.
- [ ] Backfill script (si aplica): idempotente (skipea members ya migrados); dry-run CSV requerido pre-apply; HR/Finance approval documentada en `Handoff.md`; audit row per apply.
- [ ] Hard rules lifted a `CLAUDE.md` (seccion "International Internal Contract Type invariants") en Slice 6.
- [ ] Docs, Handoff and changelog are synchronized.

### Pre-flip productivo (separado de implementacion)

- [ ] Legal/People Ops review escrita confirma V1 perfil operacional sin claim de employer of record.
- [ ] Finance review escrita confirma payment rail viable + AML clearance + FX policy per caso.
- [ ] HR review escrita confirma contractual arrangement por separado para cada member objetivo.
- [ ] Allowlist members documentada en `Handoff.md` ANTES de grant capability productivo.
- [ ] Capability `payroll.contract.use_international_internal` NO granteada hasta los 3 reviews completos.

## Verification

- `pnpm vitest run src/types/hr-contracts.test.ts`
- `pnpm vitest run src/views/greenhouse/payroll/CompensationDrawer.test.tsx`
- `pnpm vitest run src/views/greenhouse/payroll/PayrollReceiptCard.test.tsx`
- `pnpm vitest run src/lib/payroll`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`
- Staging DB verification query for synthetic member:
  - `SELECT contract_type, pay_regime, payroll_via, deel_contract_id FROM greenhouse_core.members WHERE member_id = '<synthetic_member_id>';`
- Authenticated staging `GET /api/hr/payroll/projected?year=<year>&month=<month>&mode=projected_month_end`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/DECISIONS_INDEX.md` indexa la decision si se agrego ADR.
- [ ] `TASK-893` quedo actualizado si la task sigue abierta al implementar esta.
- [ ] No se mutaron colaboradores reales sin allowlist y aprobacion HR/Finance documentada.

## Follow-ups

- V2: separar `contractClass`, `payRegime`, `payrollVia`, `legalEmployer`, `paymentOwner`, `taxOwner` en un catalogo versionado en vez de seguir agregando significado a `contractType`.
- V2: soportar providers adicionales (`remote`, `oyster`, `manual_provider`, `direct_international`) con taxonomia de payroll provider.
- V2: payment profile internacional self-service y funding workflow por moneda.
- V2: local-country tax/compliance engine si HR/Finance decide internalizar paises especificos.

## Delta 2026-05-15

- Task creada desde investigacion del dropdown de contrato: `international_internal` aparece en receipts/reportes como regimen, pero no existe como `ContractType` seleccionable ni persistible por el write path canonico.
- Decision de diseno inicial: V1 debe agregar un perfil contractual canonico, no habilitar combinaciones libres de regimen/via de pago en UI.

## Delta 2026-05-16

- **Review arquitectonico pre-Slice 1** via `arch-architect`: 6 ajustes incorporados al spec:
  1. **Legal Employer dimension** explicita en matriz canonica (3 dimensiones ortogonales colapsadas linealmente en `contractType`); Efeonce SpA es operational payer pero NO legal employer para `international_internal`.
  2. **Audit log canonico** `member_contract_type_audit_log` append-only (mirror TASK-785 role title governance pattern) — cada cambio de contract_type emite row en misma tx que UPDATE.
  3. **CHECK constraint compuesto** sobre tupla `(contract_type, pay_regime, payroll_via)` enforce 6 combinaciones validas DB-level; mirror TASK-742 `client_users_auth_mode_invariant` pattern. Sin esto, las 14 combinaciones invalidas (5x2x2 - 6) pueden existir via SQL directo.
  4. **Cross-task fixture** `international_internal` mid-month en Slice 4 + paralela en TASK-893 acceptance criteria. Composicion canonica entre TASK-894 (contractType) y TASK-893 (participation window).
  5. **Legal Scope V1 declaracion vinculante**: perfil OPERATIVO, NO legal employer. Capability `payroll.contract.use_international_internal` (EFEONCE_ADMIN only) + payload `legalReviewReference` (min 10 chars) requerido + allowlist per-member documentada en `Handoff.md`. Sin estos gates, opcion oculta en UI productiva.
  6. **`resolveReceiptRegime` tightening**: step 1a explicit `contractTypeSnapshot==='international_internal'` primary path; step 4 fallback legacy emite warning Sentry para detectar drift historico.
- Reality check: el gap es mas chico de lo que la spec sugeria. Display layer (`ReceiptRegime` taxonomy, PDF, Excel, period report) YA es first-class para `international_internal` desde TASK-758. Payment obligations lane YA reusa interna sin lane nueva (`materialize-payroll.ts:164` branchea por `payrollVia`). Calc path YA branchea Chile deductions por `payRegime`. Bottleneck real: `ContractType` enum + `CONTRACT_DERIVATIONS` + DB CHECK + UI dropdown + capability gate.
- Hard rules canonicos declarados en task para lift a `CLAUDE.md` en Slice 6.

## Canonical Hard Rules (lift to `CLAUDE.md` post-Slice 6)

- **NUNCA** persistir un tuple `(contract_type, pay_regime, payroll_via)` fuera de las 6 combinaciones canonicas. CHECK constraint compuesto enforce a nivel DB.
- **NUNCA** usar `international_internal` para un member real en produccion sin (a) capability `payroll.contract.use_international_internal` granteada, (b) `legalReviewReference` documentado en el payload, (c) allowlist HR/Finance escrita en `Handoff.md`.
- **NUNCA** declarar a Efeonce SpA como legal employer / employer of record en jurisdiccion del trabajador `international_internal`. V1 es perfil OPERATIVO. Recibo lleva disclaimer obligatorio.
- **NUNCA** degradar `international_internal` a `contractor` automaticamente si el flow detecta "international + sin Deel ID". Loud-fail con canonical error code `contract_type_inconsistent_with_payroll_via`.
- **NUNCA** aplicar Chile statutory deductions (AFP, salud, cesantia, IUSC, retencion SII) basandose en `contractType` solo. Branch en `payRegime === 'chile'` (single source of truth).
- **NUNCA** inferir currency desde `contractType` o `payRegime` en consumers. Leer `compensation_versions.currency` explicito.
- **NUNCA** modificar `member_contract_type_audit_log`. Append-only enforced por trigger PG (`prevent_update_on_audit_log` + `prevent_delete_on_audit_log`).
- **NUNCA** backfillear masivamente `contract_type` sin (a) dry-run CSV, (b) allowlist explicita per member, (c) HR/Finance approval escrita, (d) audit row per apply.
- **NUNCA** loggear `legalReviewReference` value crudo en Sentry / outbox payloads — puede contener referencias confidenciales a docs legales. Redactar via `redactSensitive`.
- **NUNCA** persistir `legalReviewReference` < 10 chars; rechazar a nivel API con canonical error code `international_internal_requires_legal_review_reference`.
- **SIEMPRE** que emerja un 7º perfil contractual que no encaje en la matriz lineal canonica, abrir TASK V2 (ortogonal `contractClass × payRegime × payrollVia × legalEmployer`) en lugar de seguir agregando valores al enum `ContractType`.
- **SIEMPRE** que `resolveReceiptRegime` caiga al fallback step 4 por `contractTypeSnapshot=NULL`, emitir warning `captureWithDomain('payroll', warn, { source: 'receipt_regime.fallback_resolution_legacy_data' })`.
- **SIEMPRE** que un consumer downstream necesite "es internacional interno", branchear por `contractType === 'international_internal'` directo (post-task), NO por composicion `payRegime + payrollVia`.

## Open Questions

1. ~~Label final~~ **Resuelto**: `Internacional interno` (es-CL neutral, alineado con regimen). Decision documentada en Slice 1 matriz.
2. ~~Currency default~~ **Resuelto**: `USD` default V1. Override explicito per `compensation_version` cuando emerja caso EUR/GBP/ARS futuro. NO armar matriz country→currency V1.
3. ~~`allowsRemoteAllowance`~~ **Resuelto**: `false` V1 conservador (remote allowance es chile-specific). HR puede definir override en V1.1 si emerge caso de uso.
4. ~~Payment Obligations lane~~ **Resuelto** (verificado en codigo `materialize-payroll.ts:164`): lane interna existente reusada. Branching es por `payrollVia`, no por `payRegime`. **Pendiente**: coordinacion con `greenhouse-finance-accounting-operator` para validar FX rate historico aplicado correctamente.
5. **Pre-Slice 1 (no resuelta)**: Legal/People Ops escala — V1 perfil OPERATIVO declarado, pero el rollout productivo requiere review legal escrita ANTES de grant capability `payroll.contract.use_international_internal`. Sin review, opcion oculta en UI productiva.
6. **Pre-Slice 5**: confirmar subsystem rollup definitivo para los 3 signals — `Identity & Access` (audit + drift) vs `Finance Data Quality` (payroll impact). Mi recomendacion: `tuple_drift` + `fallback_resolution` van a `Identity & Access`; `invalid_statutory_application` va a `Finance Data Quality` (economic outcome).
7. **Pre-rollout productivo**: politica explicita HR/Finance sobre members reales — preserve actual estado (`contractor` legacy) vs backfill a `international_internal` con allowlist. Recomendacion: backfill es opt-in per member, NO masivo.
