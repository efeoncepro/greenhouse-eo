# Greenhouse Payroll Bonus Calculation V1

> **ADR canonical** — formaliza cómo Payroll consume las métricas ICO (RpA + OTD) per-member-month para calcular bonificaciones variables que se persisten en `payroll_entries` y aparecen en recibos. Es **downstream consumer cross-cutting** del ICO Engine — vive en `docs/architecture/` raíz porque es contrato Payroll-side, no spec de métrica individual.

| Campo | Valor |
|---|---|
| Status | Accepted (V1 SHIPPED — running en producción desde TASK-758 era) |
| Decision date | 2026-05-17 (canonización doc-only de código existente) |
| Author | Spec canónica creada post sesión deep-dive ICO metrics |
| Scope | Payroll bonus calculation downstream de ICO RpA + OTD per-member-month |
| Cross-refs | `metrics/RPA_V1.md` (primary input) · `metrics/OTD_V1.md` (primary input) · `metrics/FTR_V1.md` (NOT input V1) · `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` · `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` |

---

## 1. Decisión canonical

**Las bonificaciones variables RpA y OTD per-member-month** son **downstream consumers** del ICO Engine. Payroll NO recomputa métricas — consume agregados materializados `metrics_by_member` (o live-computed fallback) y aplica **fórmulas de proración canonical** declarativas para mapear `kpi value` → `bonus amount`.

**Las únicas 2 métricas ICO que hoy son inputs directos de bonus son RpA y OTD%.** FTR, Cumplimiento, Cycle Time, CT SLO%, Throughput, Pipeline Velocity, CSC Distribution, Stuck Assets, Stuck %, OCF, Iteration Velocity, BCS, TTM **NO entran al cálculo de bonus V1**. Pueden agregarse en V2+ pero requieren decisión HR/Finance + extensión schema `compensation_versions`.

---

## 2. Por qué este pattern

1. **Single source of truth**: RpA + OTD computan en ICO Engine canonical (post TASK-901/902). Payroll lee el resultado, NO recompute con lógica paralela. Cero drift cross-domain.
2. **Tope per-member configurable**: cada colaborador declara `bonus_otd_max` + `bonus_rpa_max` en su `compensation_versions` row. La proración aplica el % canonical sobre ese tope individual.
3. **Thresholds canonical configurables per-tenant**: BQ table `payroll_bonus_config` con vigencia temporal (`effective_from`). HR puede ajustar thresholds sin tocar código.
4. **Degradación honesta**: si KPI source ICO retorna `null` (data unavailable), bonus = $0 + `qualifies: false`. NO inventa data. Bug class TASK-877 follow-up (RpA=null) lo hizo visible operacionalmente.
5. **Reglas especiales declarativas per contractType**: honorarios usa bonus discrecional ($0 automático), Deel/EOR usa mismas fórmulas pero suma a `deelGrossTotal`, resto (CL dependent, international_internal) flow normal.

---

## 3. Pipeline canonical end-to-end

```text
Notion edit → webhook → ICO Engine canonical compute (TASK-901/902 writeback)
    ↓
v_tasks_enriched.{rpa, performance_indicator_code} materializado en BQ
    ↓
materializeMemberMetrics cron diario → metrics_by_member.{rpa, otd_pct} per member-month
    ↓
fetchKpisForPeriod({memberIds, year, month})
    ├─ readMemberMetricsBatch — lectura materialized (rápido, sourceMode='materialized')
    └─ computeMetricsByContext — fallback live computation (lento, sourceMode='live')
    ↓
Map<memberId, PayrollKpiSnapshot {otdPercent, rpaAvg, rpaDataStatus, ...}>
    ↓
buildPayrollEntry({compensation, kpi, attendance, bonusConfig}) per member
    ├─ calculateOtdBonus(otdPercent, bonusOtdMax, bonusConfig) → {amount, prorationFactor, qualifies}
    └─ calculateRpaBonus(rpaAvg, bonusRpaMax, bonusConfig) → {amount, prorationFactor, qualifies}
    ↓
payroll_entries persisted (cierre mensual) o projected live (UI /hr/payroll/projected)
    ↓
Recibo PDF / Excel reporte / UI Payroll views consumen amounts + prorationFactors
```

---

## 4. Helpers canonical

### 4.1 `calculateOtdBonus` — graduated linear proration

**File**: `src/lib/payroll/bonus-proration.ts:20-45`. **OTD% higher is better**.

```typescript
calculateOtdBonus(
  otdPercent: number | null,
  bonusAmount: number,    // tope desde compensation.bonusOtdMax
  config: BonusProrationConfig
): { amount: number; prorationFactor: number; qualifies: boolean }
```

**Lógica canonical** (3 zonas):

| OTD% | Zona | Resultado |
|---|---|---|
| `otdPercent >= otdThreshold` (default 89%) | **Full payout** | `amount = bonusAmount`, `factor = 1.0`, `qualifies = true` |
| `otdFloor <= otdPercent < otdThreshold` (default 70-89%) | **Linear proration** | `factor = (otdPercent - otdFloor) / (otdThreshold - otdFloor)` |
| `otdPercent < otdFloor` (default <70%) | **Cutoff** | `amount = 0`, `factor = 0`, `qualifies = false` |

**Edge cases**:

- `otdPercent === null` → `{amount: 0, factor: 0, qualifies: false}` (data unavailable)
- `bonusAmount <= 0` → `{amount: 0, factor: 0, qualifies: false}` (member sin bonus configurado)

**Ejemplo OTD 80%** con `bonusOtdMax = $120,000` y defaults:

```text
factor = (80 - 70) / (89 - 70) = 10/19 ≈ 0.5263
amount = $120,000 × 0.5263 = $63,158
```

### 4.2 `calculateRpaBonus` — banded inverse proration (3 zonas)

**File**: `src/lib/payroll/bonus-proration.ts:54-108`. **RpA lower is better** — métrica negativa.

```typescript
calculateRpaBonus(
  rpaAvg: number | null,
  bonusAmount: number,    // tope desde compensation.bonusRpaMax
  config: BonusProrationConfig
): { amount: number; prorationFactor: number; qualifies: boolean }
```

**Lógica canonical** (4 zonas):

| RpA promedio | Zona | Resultado |
|---|---|---|
| `rpaAvg <= rpaFullPayoutThreshold` (default 1.7) | **Full payout** | `amount = bonusAmount`, `factor = 1.0`, `qualifies = true` |
| `rpaFullPayoutThreshold < rpaAvg <= rpaSoftBandEnd` (default 1.7-2.0) | **Soft band linear** | `factor` baja de `1.0` a `rpaSoftBandFloorFactor` (default 0.8) |
| `rpaSoftBandEnd < rpaAvg < rpaThreshold` (default 2.0-3.0) | **Hard band linear** | `factor` baja de `rpaSoftBandFloorFactor` (0.8) a `0` |
| `rpaAvg >= rpaThreshold` (default 3.0) | **Cutoff** | `amount = 0`, `factor = 0`, `qualifies = false` |

**Edge cases**: idénticos a OTD (null → $0; bonusAmount ≤ 0 → $0).

**Ejemplo RpA 1.85** (mid soft band) con `bonusRpaMax = $180,000` y defaults:

```text
bandProgress = (1.85 - 1.7) / (2.0 - 1.7) = 0.5
factor = 1 - 0.5 × (1 - 0.8) = 0.9
amount = $180,000 × 0.9 = $162,000
```

**Ejemplo RpA 2.5** (mid hard band) con mismo tope:

```text
declineProgress = (2.5 - 2.0) / (3.0 - 2.0) = 0.5
factor = 0.8 × (1 - 0.5) = 0.4
amount = $180,000 × 0.4 = $72,000
```

### 4.3 Defensive degenerate config

`calculateRpaBonus` líneas 71-79 detecta `rpaSoftBandEnd <= rpaFullPayoutThreshold` (config degenerada — soft band colapsada) y degrada a fórmula linear simple `(rpaThreshold - rpaAvg) / rpaThreshold`. Defense in depth contra config invalida.

---

## 5. Inputs canonical

### 5.1 Métricas ICO (fuente canonical post TASK-901/902)

| Métrica | Source canonical | Spec |
|---|---|---|
| `otdPercent` (per-member-month) | `metrics_by_member.otd_pct` (materializado) o live `computeMetricsByContext` | [metrics/OTD_V1.md](metrics/OTD_V1.md) |
| `rpaAvg` (per-member-month) | `metrics_by_member.rpa` (materializado) o live | [metrics/RPA_V1.md](metrics/RPA_V1.md) |

### 5.2 Compensation per-member (topes máximos)

**Table**: `greenhouse_payroll.compensation_versions`. Per-member, versionado temporal (effective_from / effective_to).

| Columna | Tipo | Significado |
|---|---|---|
| `bonus_otd_max` | numeric | Tope $ a pagar si OTD% = 100% |
| `bonus_otd_min` | numeric | Piso informativo (NO entra al cálculo) |
| `bonus_rpa_max` | numeric | Tope $ a pagar si RpA = óptima |
| `bonus_rpa_min` | numeric | Piso informativo |

**Helper**: `src/lib/payroll/get-compensation.ts:221-223` (mapping de row a `CompensationVersion`).

### 5.3 Bonus proration config canonical (thresholds)

**Source canonical**: BQ table `<project>.greenhouse.payroll_bonus_config` con vigencia temporal `effective_from`.

**Resolver canonical**: `calculate-payroll.ts:73-112` lee la row más reciente con `effective_from <= periodEnd` ordenada DESC, normaliza con `normalizeBonusProrationConfig()` (defaults aplican si columna ausente o null).

**Defaults canonical** (`src/lib/payroll/bonus-config.ts:3-10`):

```typescript
DEFAULT_BONUS_PRORATION_CONFIG: BonusProrationConfig = {
  otdThreshold: 89,             // OTD% para 100% pago
  otdFloor: 70,                 // OTD% bajo este = $0
  rpaThreshold: 3,              // RpA sobre este = $0
  rpaFullPayoutThreshold: 1.7,  // RpA bajo este = 100% pago
  rpaSoftBandEnd: 2,            // Fin de soft band
  rpaSoftBandFloorFactor: 0.8   // Floor del soft band (80%)
}
```

**Validación canonical** (`normalizeBonusProrationConfig()`):

- `otdThreshold >= otdFloor` (enforced via Math.max)
- `rpaThreshold >= 0`
- `rpaFullPayoutThreshold <= rpaThreshold`
- `rpaSoftBandEnd ∈ [rpaFullPayoutThreshold, rpaThreshold]`
- `rpaSoftBandFloorFactor ∈ [0, 1]`

---

## 6. Bridge canonical ICO → Payroll

### 6.1 `fetchKpisForPeriod` — strategy `materialized_first_with_live_fallback`

**File**: `src/lib/payroll/fetch-kpis-for-period.ts:33-129`.

**Algoritmo canonical**:

1. Dedup `memberIds` input.
2. Llamar `readMemberMetricsBatch(memberIds, year, month)` → lectura BQ materializada (rápido).
3. Para members presentes → `sourceMode: 'materialized'`.
4. Para members ausentes → fallback `computeMetricsByContext('member', memberId, year, month)` live (lento).
5. Para members ausentes en live también → `diagnostics.missingMembers++`, snapshot NO se crea.

**Diagnostics canonical**:

```typescript
PayrollKpiDiagnostics = {
  source: 'ico',
  strategy: 'materialized_first_with_live_fallback',
  periodYear, periodMonth,
  materializedMembers: number,   // count materialized hits
  liveComputedMembers: number,   // count live fallback hits
  missingMembers: number         // count without data
}
```

Persistido en audit log de cierre mensual — auditable cuándo un cálculo usó fallback live (más lento, posible inconsistencia transiente).

### 6.2 Reusa el mismo agregado SQL canonical

`readMemberMetricsBatch` + `computeMetricsByContext` consumen agregados del registry `src/lib/ico-engine/metric-registry.ts` (`otd_pct` líneas 194-224 + `rpa` líneas 167-193). **Bonus NO tiene SQL paralelo** — usa la misma fuente canonical que dashboards Pulse, Person 360, scorecards.

---

## 7. Reglas especiales por `contractType`

`src/lib/payroll/calculate-payroll.ts:193-204`:

| `contractType` | Bonus behavior |
|---|---|
| `honorarios` | `usesDiscretionaryBonuses = true` → **ambos bonus = $0 automáticos**. Bonificación discrecional vive en `bonus_other_amount` manual override del operador HR (no automatizado por KPI). |
| `payrollVia === 'deel'` | Bonus RpA + OTD **SÍ aplican** mismo cálculo. Suman a `deelGrossTotal` (campo dedicado para Deel reconciliation). |
| `indefinido` / `plazo_fijo` / `international_internal` (resto) | Flow canonical normal — bonus aplican, suman a `grossTotal` per reglas estándar. |

**Edge canonical**: si `compensation.contractType === 'honorarios'` el helper retorna `{amount: 0, qualifies: true, prorationFactor: null}` (qualifies=true es intencional — el member ES elegible pero por discrecionalidad manual no por KPI automático).

---

## 8. Persistencia + auditabilidad

### 8.1 Campos canonical persistidos en `payroll_entries`

`src/lib/payroll/calculate-payroll.ts:361-402`:

| Campo | Source |
|---|---|
| `bonus_otd_amount` | `calculateOtdBonus().amount` |
| `bonus_rpa_amount` | `calculateRpaBonus().amount` |
| `bonus_otd_min` / `bonus_otd_max` | snapshot de `compensation.bonusOtdMin/Max` al momento del cálculo |
| `bonus_rpa_min` / `bonus_rpa_max` | snapshot de `compensation.bonusRpaMin/Max` |
| `bonus_otd_proration_factor` | `calculateOtdBonus().prorationFactor` (0-1, auditable) |
| `bonus_rpa_proration_factor` | `calculateRpaBonus().prorationFactor` (0-1, auditable) |
| `kpi_otd_percent` (snapshot) | `kpi.otdPercent` al momento del cálculo |
| `kpi_rpa_avg` (snapshot) | `kpi.rpaAvg` al momento del cálculo |

**Importante**: snapshot temporal del KPI + tope max + factor proration → el recibo es **reproducible y auditable** sin depender de re-fetch ICO.

### 8.2 UI / Recibo / Excel report

- **Recibo PDF** (`receipt-presenter.ts`): renderiza `bonusOtdAmount` + `bonusRpaAmount` con tooltip explicativo `OTD 80% → proración 0.5263 → paga $63,158 de $120,000 máximo`.
- **Excel reporte mensual** (`generate-payroll-excel.ts`): exporta amounts + proration factors per member, auditable per HR/Finance.
- **UI `/hr/payroll/projected`**: recompute live cada vista (sin persistir hasta el cierre del mes).

---

## 9. Bug class TASK-877 follow-up — implicación operacional

El bug class detectado 2026-05-16 (3,168 tareas Sky con `rpa = null` 10 meses) impactó directamente este pipeline:

1. ICO Engine: `materializeMemberMetrics` insertaba `rpa = null` en `metrics_by_member` (sync notion-bq-sync no extraía formula value correctamente).
2. `fetchKpisForPeriod` retornaba `rpaAvg = null` per member Sky.
3. `calculateRpaBonus(null, bonusRpaMax, config)` → `{amount: 0, qualifies: false}` (degradación honesta del helper).
4. **Toda la nómina Sky proyectada perdía bonus RpA silenciosamente** mes-tras-mes hasta detección.

**Severidad**: alta — afectaba compensación variable directa. El operador veía bonus $0 sin contexto del por qué.

**Mitigación canonical**: TASK-901 (RpA writeback canonical, post-TASK-908 foundation) elimina la dependencia del sync legacy. Post-ship, `metrics_by_member.rpa` viene del compute canonical Greenhouse (testeado, observable, alertable). Bonus RpA estables.

**Lessons learned canonizadas en CLAUDE.md**:

- Identity Bridge Cutover Protocol (TASK-877 follow-up section): bridges identity NO deben fallar silencioso.
- Delivery Metrics Ownership Boundary (esta sesión): fórmulas críticas NO viven en Notion editables sin git history.

---

## 10. Métricas que NO son inputs bonus V1 (deliberadamente)

Las siguientes 12 métricas ICO canonical **NO entran al cálculo de bonus V1**:

| Métrica | Razón |
|---|---|
| FTR | Es derivada de RpA (`calculateFtr === calculateRpa === 0`) — incluirla sería double-counting con RpA |
| Cumplimiento | Per-task audit signal + aggregate alias OTD — el alias agregado YA es OTD% (input canonical), incluir Cumplimiento sería duplicación |
| Cycle Time | Métrica de duration absoluta — NO promise compliance. Decisión HR: pagar por velocidad absoluta puede incentivar trade-offs (rushear para CT bajo a costa de quality) |
| CT SLO% | Competitive benchmark, no promise compliance — OTD% ya cubre promise; CT SLO% es narrative-level industry comparison |
| Throughput | Volume metric — decisión HR/Finance: pagar por volumen incentiva quantity over quality, conflict con RpA/OTD |
| Pipeline Velocity | Ratio flow del backlog — composite health, no per-member output direct |
| CSC Distribution | Shape metric (distribution), no magnitudinal — no bonus-evaluable |
| Stuck Assets / Stuck % | Detector operacional — bonus negativo automático sería injusto (causa puede ser dependencia externa) |
| OCF | Deuda histórica — bonus negativo sería injusto (causa puede ser cliente upstream slow) |
| Iteration Velocity | Narrative-level Revenue Enabled palanca 2 — V1 mostly proxy mode, no auditable suficiente para bonus |
| BCS | Project-level, no per-member-month — no map directo a bonus per individual |
| TTM | Per-campaign, no per-member-month — no map directo |

**Si HR/Finance decide V2 incluir métrica adicional como input bonus**:

1. Extender schema `compensation_versions` con `bonus_<metric>_max` + `_min` per-member
2. Crear helper `calculate<Metric>Bonus(value, bonusAmount, config)` en `bonus-proration.ts`
3. Agregar thresholds canonical a `BonusProrationConfig` + `payroll_bonus_config` BQ table
4. Actualizar `buildPayrollEntry` para invocar nuevo helper
5. Persistir nuevos campos en `payroll_entries`
6. Update spec canonical de la métrica con sección 13 "Downstream consumers — Payroll bonus" detallada
7. Update este ADR con nueva métrica en sección 5

Sin pasos 1-7 cubiertos, **NO agregar bonus nuevo inline en código** — viola single source of truth.

---

## 11. Hard rules canonical

- **NUNCA** recomputar `otd_pct` ni `rpa` en código Payroll. Toda lectura pasa por `fetchKpisForPeriod()` que consume agregados ICO Engine canonical. Drift cross-domain = bug arquitectónico.
- **NUNCA** hardcodear thresholds en código (e.g. `if (otd >= 89) ...`). Toda comparación pasa por `bonusConfig` que viene de `payroll_bonus_config` BQ + defaults.
- **NUNCA** invocar `calculateOtdBonus` / `calculateRpaBonus` directamente desde UI / API route handler. La invocación canonical es vía `buildPayrollEntry` que orquesta KPI fetch + compensation + attendance + bonus en transacción única.
- **NUNCA** persistir `bonus_otd_amount` o `bonus_rpa_amount` sin el `proration_factor` correspondiente. Auditabilidad requiere ambos para reproducir el cálculo.
- **NUNCA** computar bonus per honorarios automáticamente. `usesDiscretionaryBonuses = true` enforced — bonificación honorarios es discrecional manual via `bonus_other_amount`.
- **NUNCA** mostrar bonus = $0 en UI sin contexto de causa raíz. Recibo + UI deben distinguir:
  - "OTD < 70% → bonus no aplica" (regla operacional)
  - "Sin datos ICO disponibles" (data unavailable)
  - "Member en régimen honorarios" (discrecional)
- **NUNCA** agregar métrica nueva como input bonus sin pasar por los 7 pasos canonical (sección 10). Default deny.
- **NUNCA** ignorar `diagnostics.missingMembers > 0` en cierre mensual. Operador HR debe ver alerta + decidir si remediar o aceptar.
- **SIEMPRE** persistir snapshot `kpi_otd_percent` + `kpi_rpa_avg` al cierre — bono es reproducible sin re-fetch ICO histórico.
- **SIEMPRE** validar `bonusConfig` via `normalizeBonusProrationConfig()` antes de invocar helpers. Config degenerada protegida defensivamente.

---

## 12. Cross-refs canonical

- **Specs de métricas (input canonical)**:
  - [metrics/RPA_V1.md](metrics/RPA_V1.md) §13 — bonus consumer detail per-RpA
  - [metrics/OTD_V1.md](metrics/OTD_V1.md) §13 — bonus consumer detail per-OTD
- **Specs de métricas (NO input V1, documentado)**:
  - [metrics/FTR_V1.md](metrics/FTR_V1.md) · [metrics/CUMPLIMIENTO_V1.md](metrics/CUMPLIMIENTO_V1.md) · [metrics/CYCLE_TIME_V1.md](metrics/CYCLE_TIME_V1.md) · [metrics/CYCLE_TIME_VARIANCE_V1.md](metrics/CYCLE_TIME_VARIANCE_V1.md) · [metrics/CT_SLO_PCT_V1.md](metrics/CT_SLO_PCT_V1.md) · [metrics/THROUGHPUT_V1.md](metrics/THROUGHPUT_V1.md) · [metrics/PIPELINE_VELOCITY_V1.md](metrics/PIPELINE_VELOCITY_V1.md) · [metrics/CSC_DISTRIBUTION_V1.md](metrics/CSC_DISTRIBUTION_V1.md) · [metrics/STUCK_ASSETS_V1.md](metrics/STUCK_ASSETS_V1.md) · [metrics/STUCK_ASSET_PCT_V1.md](metrics/STUCK_ASSET_PCT_V1.md) · [metrics/OCF_V1.md](metrics/OCF_V1.md) · [metrics/ITERATION_VELOCITY_V1.md](metrics/ITERATION_VELOCITY_V1.md) · [metrics/BCS_V1.md](metrics/BCS_V1.md) · [metrics/TTM_V1.md](metrics/TTM_V1.md)
- **ADRs relacionados**:
  - `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — Notion ↔ Greenhouse boundary (post TASK-901 writeback)
  - `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md` — pattern 1 métrica = 1 spec
  - `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato Payroll module completo
- **Código canonical**:
  - `src/lib/payroll/bonus-proration.ts` — helpers canonical (`calculateOtdBonus`, `calculateRpaBonus`)
  - `src/lib/payroll/bonus-config.ts` — defaults + `normalizeBonusProrationConfig`
  - `src/lib/payroll/fetch-kpis-for-period.ts` — bridge ICO → Payroll
  - `src/lib/payroll/calculate-payroll.ts:73-112` — `resolveBonusConfig` lee `payroll_bonus_config` BQ
  - `src/lib/payroll/calculate-payroll.ts:174-410` — `buildPayrollEntry` orquesta cálculo
  - `src/lib/payroll/project-payroll.ts` — proyección live `/hr/payroll/projected`
  - `src/lib/ico-engine/metric-registry.ts:166-224` — agregado SQL `rpa` + `otd_pct`
  - `src/types/payroll.ts:19-26` — `BonusProrationConfig` type
- **Tasks relacionadas**:
  - TASK-877 follow-up (bug class motivador)
  - TASK-901 (RpA writeback canonical — elimina dependencia sync legacy)
  - TASK-902 (OTD writeback futuro)
  - TASK-758 (recibo per-régimen, downstream consumer del cálculo)
  - TASK-872/873/890/891/892/893/894/895 (workforce + payroll contracts canonical)

---

## 13. Open questions deliberadamente NO resueltas en V1

- **Bonus de FTR como input separado**: V1 NO (FTR = `calculateRpa === 0`, double-counting con RpA). Si V2 cambia FTR para incluir Frame.io signals (cuando integración exista), evaluar si emerge como input bonus independiente de RpA.
- **Bonus de Cycle Time / CT SLO%**: HR/Finance decisión política — pagar por velocidad absoluta puede incentivar trade-offs con quality. V1 NO.
- **Bonus de Iteration Velocity / TTM**: V1 NO (mayoría proxy mode V1, no auditable suficiente). V2 cuando Frame.io + ad platform integration shippeen y mayoría scopes alcancen `observed`.
- **Calibración thresholds per-rol / per-cliente / per-tipo de pieza**: V1 thresholds uniformes cross-member (config global per-tenant via `payroll_bonus_config` BQ). V2 per-rol o per-cliente si emerge demanda HR.
- **Bonus negative (penalización por OCF / Stuck Assets crítico)**: V1 NO. Decisión HR/Finance: bonus solo positivo, métricas negativas son señal operacional pero no descuento automático.
- **Multi-currency**: V1 asume CLP. International members con `currency != 'CLP'` necesitan conversion FX en proración — código actual no maneja explícitamente (uniforme asume mismo currency que `bonus_max`).
- **Writeback de bonus computed a Notion property** (e.g. `[GH] Bonus RpA` per-member-month visible al colaborador): V1 NO. V2 si emerge transparency demand.
- **Bonus reclassification post-cierre**: V1 inmutable post-persist (auditabilidad). Si HR detecta error → supersede entry pattern (TASK-758 era).
- **Diagnostics threshold alerting**: V1 expone `diagnostics.missingMembers` pero NO alerta automática. V2 reliability signal `payroll.bonus.missing_kpi_rate` si emerge.

---

## 14. Histórico de decisiones

### 2026-05-17 — V1 spec created (canoniza código existente)

- Spec canonical creado post sesión deep-dive ICO metrics + RpA bug class investigation.
- **Documenta código existente** — el flow bonus está SHIPPED en producción desde TASK-758 era; este spec lo canoniza explícitamente para auditabilidad + onboarding.
- **Hard rules canonizadas** (11 reglas duras anti-regresión).
- **Lista explícita de 12 métricas NO-input bonus** con razones — previene drift "agregar bonus inline ad-hoc".
- **Bug class TASK-877 follow-up documentado** (sección 9) — captura el impacto operacional para reference futura.
- **Pre-existente**: helpers `calculateOtdBonus` + `calculateRpaBonus` operan en producción desde TASK-758 era. Config `payroll_bonus_config` BQ table existe. Defaults canonical estables.
