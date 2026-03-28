# TASK-076 — Payroll Chile: Paridad con Liquidación Legal

## Delta 2026-03-28
- Se validó contra la liquidación real de febrero 2026 de Valentina Hoyos un smoke de nómina Chile con IMM sembrado en `539000`.
- Resultado validado del motor core:
  - `baseSalary = 539000`
  - `gratificacionLegal = 134750`
  - `grossTotal = 673750`
  - `chileAfpAmount = 70474.25`
  - `chileHealthAmount = 161947.86`
  - `chileUnemploymentAmount = 4042.5`
  - `netTotal = 437285.39`
- Conclusión:
  - el núcleo legal de la liquidación ya calza con el PDF en imponibles y descuentos
  - el gap restante para llegar al líquido final del PDF son los haberes no imponibles `colación` y `movilización`
  - hasta que se modelen esos haberes, el motor seguirá llegando al líquido imponible correcto pero no al total final de la liquidación impresa
- No se introdujo ningún evento nuevo; la propagación sigue por `compensation_version.created/updated` y `payroll_entry.upserted`.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P0` |
| Impact | `Muy alto` |
| Effort | `Alto` |
| Status real | `En progreso` |
| Rank | 2 de 4 (ejecutar después de TASK-078, antes de TASK-077 y TASK-079) |
| Domain | HR Payroll |

## Summary

Cerrar los gaps entre el cálculo de nómina chilena de Greenhouse y una liquidación de sueldos legal real. Contrastado contra liquidación Feb 2026 de Valentina Hoyos (Efeonce Group SPA), se identificaron 3 gaps críticos: gratificación legal ausente, haberes no imponibles (colación + movilización) no modelados, y costos empleador (SIS, cesantía empleador, mutual) no rastreados.

## Why This Task Exists

La liquidación real de Valentina muestra un **Total Haberes de $832,121** y un **Líquido de $595,656**. Greenhouse no puede reproducir esos números porque:

1. **Gratificación legal** ($134,750/mes) no se calcula — la base imponible está subestimada en $134,750, lo que invalida AFP, base tributable y bruto total
2. **Colación** ($83,371) y **Movilización** ($75,000) no se modelan — son haberes no imponibles que van al líquido pero no pasan por descuentos
3. **Costos empleador** (~$32,846/mes) son invisibles — SIS empleador, cesantía empleador y mutual no se rastrean

Sin estos campos, Greenhouse no puede:
- Generar una liquidación de sueldos válida para firma
- Calcular correctamente el costo real por colaborador chileno
- Alimentar Cost Intelligence con datos fidedignos
- Emitir documentos que cumplan con la normativa laboral chilena

## Execution Order

Esta task es la **segunda** de una cadena de 3:

```
TASK-078 → TASK-076 (esta) → TASK-077
                         ↘ TASK-079
```

**Prerequisito:** TASK-078 debe completarse primero porque provee:
- `previred_indicators` con IMM → necesario para tope de gratificación legal (slice 1)
- `afp_rates` con tasas separadas → necesario para AFP desglose (slice 3)
- `previred_indicators.tasa_sis` → necesario para costos empleador SIS (slice 5)
- Forward engine ya cortado a indicadores synced → los nuevos campos se calculan correctamente
- Helpers previsionales (`getImmForPeriod`, `getAfpRateForCode`, `getSisRate`) listos para usar

**Lo que desbloquea para TASK-077:**
- Gratificación legal, colación, movilización → secciones del PDF Chile
- AFP desglosada (cotización + comisión) → desglose legal en liquidación
- Isapre desglosada (obligatoria + voluntaria) → desglose legal
- Costos empleador → información adicional del PDF
- RUT → encabezado de la liquidación

## Goal

Que el motor de nómina chilena de Greenhouse produzca números idénticos a una liquidación legal generada por un sistema como Uwigo, BUK o Nubox Remuneraciones.

## Architecture Alignment

- Fuente canónica: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- Motor de cálculo: `src/lib/payroll/calculate-payroll.ts`, `src/lib/payroll/calculate-chile-deductions.ts`
- Modelo de datos: `src/types/payroll.ts`, `src/lib/payroll/schema.ts`
- Indicadores económicos: `src/lib/finance/economic-indicators.ts` (UF, UTM, IMM)

## Referencia: Liquidación Real (Feb 2026, Valentina Hoyos)

```
Empresa:    EFEONCE GROUP SPA (77.357.182-1)
Empleada:   VALENTINA SOFIA HOYOS SANCHEZ (20.557.199-K)
Cargo:      PR Analyst & Corporate Comms
Contrato:   Indefinido
F. Ingreso: 01/09/2025
Período:    Febrero 2026

HABERES IMPONIBLES
  Renta Mensual               $539,000
  Gratificación Legal         $134,750
  Total Imponible             $673,750

HABERES NO IMPONIBLES
  Colación                     $83,371
  Movilización                 $75,000
  Total No Imponible          $158,371

TOTAL HABERES                 $832,121

DESCUENTOS
  AFP (cotización obligatoria)  $67,375
  Comisión AFP                   $3,099
  Isapre (Colmena Golden Cross) $161,948
  Seguro Cesantía (0.6%)         $4,043
  Impuesto                           $0  (tramo 1 exento)
  Total Descuentos             $236,465

LÍQUIDO A PAGO                $595,656

COSTOS EMPLEADOR (no deducidos)
  Aporte SIS Empleador          $10,376
  Seguro Cesantía Empleador     $16,170
  Mutual (estimado)              ~$6,300
  Total Costo Empleador Adicional ~$32,846
```

## Current Repo State

### Lo que ya existe y funciona

- `baseSalary` como renta base ✅
- `afpName`, `afpRate`, `chileAfpAmount` ✅ (pero sin desglose cotización/comisión)
- `healthSystem` (fonasa/isapre), `healthPlanUf`, `chileHealthAmount` ✅
- `unemploymentRate`, `chileUnemploymentAmount` ✅
- `contractType` (indefinido/plazo_fijo) ✅
- `chileTaxableBase`, `chileTaxAmount` ✅
- `chileApvAmount`, `hasApv` ✅
- `chileUfValue` ✅
- Motor de cálculo `buildPayrollEntry()` + `computeChileDeductions()` ✅
- Indicadores económicos (UF, UTM) con sync automático ✅

### Lo que NO existe (gaps)

| Gap | Severidad | Impacto |
|-----|-----------|---------|
| Gratificación legal | **Crítico** | Base imponible incorrecta → AFP, tax, bruto, neto todos mal |
| Colación | Alto | Líquido subestimado, liquidación incompleta |
| Movilización | Alto | Líquido subestimado, liquidación incompleta |
| AFP desglose cotización/comisión | Medio | Liquidación no muestra el desglose legal requerido |
| Isapre desglose obligatoria/voluntaria | Medio | Liquidación no muestra cotización 7% vs plan UF excedente |
| Costos empleador (SIS, cesantía, mutual) | Alto | Costo real por persona invisible para Cost Intelligence |
| RUT del colaborador | Medio | Requerido para liquidación legal |
| Datos bancarios (banco, cuenta, tipo) | Medio | Requerido para liquidación legal y pago |
| IMM (Ingreso Mínimo Mensual) como indicador | Alto | Necesario para tope de gratificación legal |

## Scope

### Slice 1 — Gratificación Legal (P0, blocker)

**Modelo:**
- Agregar `gratificacion_legal_mode` a `compensation_versions`:
  - `'mensual_25pct'` — 25% del sueldo base, tope 4.75 IMM/12 (caso más común, el de Valentina)
  - `'anual_proporcional'` — proporcional por meses trabajados (menos común)
  - `'ninguna'` — empresa sin utilidades o exenta
- Agregar `IMM` como indicador económico en `economic-indicators` (sync desde mindicador.cl o manual)

**Cálculo:**
```
if mode === 'mensual_25pct':
  gratificacionLegal = min(baseSalary × 0.25, IMM × 4.75 / 12)
```

**Impacto en el motor:**
- `imponibleBase` pasa de `baseSalary + fixedBonus + variable` a `baseSalary + gratificacionLegal + fixedBonus + variable`
- AFP, health (fonasa), unemployment y tax se recalculan sobre la nueva base
- `grossTotal` se incrementa en `gratificacionLegal`
- Nuevo campo en `payroll_entries`: `chile_gratificacion_legal`

### Slice 2 — Haberes No Imponibles (colación + movilización)

**Modelo:**
- Agregar a `compensation_versions`:
  - `colacion_amount` NUMERIC DEFAULT 0
  - `movilizacion_amount` NUMERIC DEFAULT 0
- Agregar a `payroll_entries`:
  - `chile_colacion` NUMERIC DEFAULT 0
  - `chile_movilizacion` NUMERIC DEFAULT 0
  - `total_haberes_no_imponibles` NUMERIC DEFAULT 0

**Cálculo:**
- No afectan base imponible ni descuentos
- Se suman al líquido: `netTotal = imponibleBase + remoteAllowance + colacion + movilizacion - totalDeductions`
- Se incluyen en `grossTotal` como Total Haberes

**Nota:** `remoteAllowance` (bono conectividad) podría reclasificarse como haber no imponible si corresponde. Decisión de producto pendiente.

### Slice 3 — AFP desglose cotización/comisión

**Modelo:**
- Agregar a `compensation_versions`:
  - `afp_cotizacion_rate` NUMERIC — tasa de cotización obligatoria (e.g. 10%)
  - `afp_comision_rate` NUMERIC — tasa de comisión AFP (e.g. 0.46% para AFP Uno)
  - Mantener `afp_rate` como `cotizacion + comision` por compatibilidad
- Agregar a `payroll_entries`:
  - `chile_afp_cotizacion_amount` NUMERIC
  - `chile_afp_comision_amount` NUMERIC
  - Mantener `chile_afp_amount` como suma total

**Verificación contra liquidación:**
- Cotización: $673,750 × 10% = $67,375 ✅
- Comisión: $673,750 × 0.46% = $3,099 ✅
- Total AFP: $70,474 ($67,375 + $3,099) — pero la liquidación muestra $67,375 como "AFP" y $3,099 separado como "Comisión AFP"

### Slice 4 — Isapre desglose obligatoria/voluntaria

**Modelo:**
- Agregar a `payroll_entries`:
  - `chile_health_obligatoria_amount` NUMERIC — 7% de base imponible
  - `chile_health_voluntaria_amount` NUMERIC — excedente sobre 7% (pagado en exceso)
  - Mantener `chile_health_amount` como total plan

**Cálculo:**
```
obligatoria = imponibleBase × 0.07
voluntaria = max(0, healthPlanUfAmount - obligatoria)
totalHealth = obligatoria + voluntaria = healthPlanUfAmount
```

**Verificación contra liquidación:**
- Obligatoria: $673,750 × 7% = $47,163 ✅
- Plan UF total: $161,948
- Voluntaria: $161,948 - $47,163 = $114,785 ✅

### Slice 5 — Costos Empleador

**Modelo:**
- Nueva tabla o extensión: `payroll_employer_costs` o campos en `payroll_entries`:
  - `employer_sis_amount` NUMERIC — Seguro de Invalidez y Sobrevivencia
  - `employer_cesantia_amount` NUMERIC — Aporte empleador cesantía
  - `employer_mutual_amount` NUMERIC — Mutual de seguridad
  - `employer_total_cost` NUMERIC — total costo empleador adicional

**Tasas:**
- SIS: ~1.54% de base imponible (varía)
- Cesantía empleador: 2.4% (indefinido) o 0% (plazo fijo)
- Mutual: ~0.93% (tasa base, varía por empresa)

**Verificación:**
- SIS: $673,750 × 1.54% = $10,376 ✅
- Cesantía: $673,750 × 2.4% = $16,170 ✅
- Mutual: ~$673,750 × 0.93% ≈ $6,266

**Impacto en Cost Intelligence:**
- `member_capacity_economics.total_labor_cost_target` debe incluir costos empleador
- Hoy subestima el costo real por ~$32,846/mes por persona chilena

### Slice 6 — Datos de identidad y pago

**Modelo en `greenhouse_core.members`:**
- `rut` TEXT — RUT del colaborador (formato: 20.557.199-K)
- `bank_name` TEXT
- `bank_account_number` TEXT
- `bank_account_type` TEXT (corriente | vista | ahorro)

**Modelo en tenant/empresa:**
- `company_rut` TEXT en `greenhouse_core.clients` o config global (77.357.182-1)

## Out of Scope

- Generación de PDF de liquidación (follow-up)
- Libro de remuneraciones electrónico (LRE) para la DT
- Integración con Previred para pago de cotizaciones
- Centralización de nómina (múltiples empresas/RUT)
- Cálculo de finiquitos

## Dependencies & Impact

### Depende de
- **TASK-078** (Previsional Foundation & Forward Cutover) — **blocker** — provee sync Previred con IMM, tasas AFP, tasa SIS, topes imponibles, tabla impuesto, helpers previsionales y forward engine ya cortado a indicadores synced
- `TASK-058` Economic Indicators Runtime Layer — UF, UTM ya existen
- `TASK-061` Payroll Go-Live Readiness Audit — puede requerir re-validación
- Motor de cálculo ya cortado a indicadores synced (lo hace TASK-078)

### Impacta a
- **TASK-077** (Payroll Receipts) — desbloquea PDFs con campos legales completos
- `/hr/payroll/periods/[periodId]` — vista oficial con gratificación, colación, AFP desglose
- `/hr/payroll/projected` — proyección con campos completos
- `/hr/payroll/compensation` — alta con nuevos campos Chile
- `member_capacity_economics` — loaded cost con employer costs reales
- Cost Intelligence (TASK-067 a TASK-071) — P&L con costo laboral real
- Exportación de nómina — nuevas columnas
- Recibos de pago (TASK-077)

### Archivos owned
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/schema.ts`
- `src/types/payroll.ts`
- `scripts/setup-postgres-payroll.sql`
- Migrations para nuevos campos

## Delta 2026-03-27

- La task quedó promovida a `in-progress` como siguiente lane operativa luego de `TASK-078`.
- La primera iteración será `gratificacion_legal_mode` + `IMM`, porque ese gap es el que más altera la base imponible y el líquido real.
- El alcance de `TASK-076` sigue siendo la paridad legal completa, pero se desarrollará por slices para no mezclar con `TASK-077` ni `TASK-079`.

## Delta 2026-03-27 - Gratificación legal slice

- Se agregó `gratificacionLegalMode` a la compensación versionada y `chileGratificacionLegalAmount` al entry de nómina, con persistencia en PostgreSQL y BigQuery.
- El cálculo forward de Chile ahora incorpora la gratificación legal sobre IMM cuando el modo no es `ninguna`, y la superficie de compensación permite editar el modo sin perder la vigencia canónica.
- No se agregó un evento nuevo: este slice se apoya en los mismos `outbox events` existentes para `compensation_version.created/updated` y `payroll_entry.upserted`, que ya disparan las `projections` downstream.
- Las proyecciones afectadas siguen siendo `projected payroll`, `member_capacity_economics` y cualquier consumidor que lea las tablas canónicas de compensación / entries.

## Acceptance Criteria

- [ ] Gratificación legal se calcula automáticamente con modo `mensual_25pct` y tope 4.75 IMM
- [ ] Base imponible incluye gratificación legal
- [ ] Colación y movilización se modelan como haberes no imponibles y se suman al líquido
- [ ] AFP se desglosa en cotización obligatoria + comisión
- [ ] Isapre se desglosa en cotización obligatoria (7%) + voluntaria (excedente)
- [ ] Costos empleador (SIS, cesantía, mutual) se calculan y almacenan
- [ ] RUT y datos bancarios modelados en members
- [ ] Para Valentina Hoyos con los mismos inputs, Greenhouse produce líquido = $595,656
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa
- [ ] Tests de cálculo cubren: gratificación con tope, colación+movilización en neto, AFP desglosada, isapre desglosada, costos empleador

## Verification

- Contrastar cálculo de Greenhouse contra liquidación real de Valentina Hoyos Feb 2026
- Contrastar contra al menos 1 liquidación adicional de otro colaborador chileno
- Validar que la base imponible coincida con la del sistema externo (Uwigo)
- Validar que el líquido a pago coincida
- Correr `pnpm test` con escenarios:
  - Sueldo base + gratificación mensual (bajo tope IMM)
  - Sueldo alto donde gratificación topa
  - Fonasa (7%) vs Isapre (plan UF)
  - Con y sin colación/movilización
  - Indefinido (0.6% cesantía empleado) vs plazo fijo (3%)
  - Con APV
