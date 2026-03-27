# TASK-078 — Payroll Chile: Reverse Calculation Engine

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P0` |
| Impact | `Muy alto` |
| Effort | `Alto` |
| Status real | `Diseño` |
| Rank | — |
| Domain | HR Payroll |

## Summary

Implementar un motor de cálculo inverso (reverse payroll) que dado un sueldo líquido deseado calcule automáticamente la renta bruta, gratificación legal, base imponible, AFP, salud, cesantía, impuesto y costos empleador — usando indicadores económicos automáticos (UF, UTM, IMM, tasas AFP) sin input manual del usuario.

## Why This Task Exists

El flujo real de HR en Chile es:

1. "Valentina debe recibir $595,656 líquidos al mes"
2. El sistema calcula todo lo demás

Hoy Greenhouse pide que HR ingrese la renta base bruta, la tasa AFP manualmente, el plan UF de la Isapre, etc. Eso obliga al usuario a hacer cálculos externos, consultar Previred, y setear valores que deberían ser automáticos. Es un proceso lento, propenso a error, y no es como funcionan los sistemas de remuneraciones profesionales (BUK, Uwigo, Nubox Remuneraciones).

## Goal

Que al crear o editar una compensación Chile, el usuario solo ingrese:
- Sueldo líquido deseado
- AFP (seleccionar del catálogo — tasa automática)
- Sistema de salud (Fonasa o Isapre + plan UF)
- Tipo de contrato
- Colación y movilización
- Gratificación legal (sí/no)

Y el sistema calcule automáticamente todo lo demás.

## Architecture Alignment

- Fuente canónica: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- Motor de cálculo actual: `src/lib/payroll/calculate-chile-deductions.ts`
- Indicadores económicos: `src/lib/finance/economic-indicators.ts`
- Se conecta con TASK-076 (campos faltantes: gratificación, colación, movilización, AFP desglose, costos empleador)

## Core Concept: Reverse Payroll

### Fórmula directa (lo que existe hoy)

```
bruto → base imponible → descuentos → líquido
```

### Fórmula inversa (lo que necesitamos)

```
líquido deseado → resolver bruto → calcular descuentos → verificar que líquido = input
```

### Lógica del reverse

```
liquidoDeseado = rentaBase + colacion + movilizacion - AFP - salud - cesantia - impuesto

Donde:
  baseImponible = rentaBase + gratificacionLegal(rentaBase)
  AFP = baseImponible × tasaAFP
  salud = fonasa(baseImponible × 0.07) O isapre(planUF × valorUF)
  cesantia = baseImponible × tasaCesantia
  impuesto = tablaImpuesto(baseImponible - AFP - salud - cesantia, UTM)
```

**Caso simple (Fonasa, tramo 1 exento):**
La ecuación es lineal — se resuelve algebraicamente:
```
liquidoDeseado - colacion - movilizacion = rentaBase - baseImponible × (tasaAFP + 0.07 + tasaCesantia)
```

**Caso complejo (Isapre plan UF, tramos superiores de impuesto):**
Requiere resolución iterativa (Newton-Raphson o bisección):
1. Estimar rentaBase inicial = liquidoDeseado
2. Calcular descuentos con el motor forward existente
3. Comparar líquido resultante vs deseado
4. Ajustar rentaBase y repetir hasta convergencia (tolerancia: $1 CLP)

## Scope

### Slice 1 — Integración Gael Cloud API (indicadores Previred + impuesto único)

**Descubrimiento:** Existe una API pública gratuita que retorna todos los indicadores previsionales de Previred y la tabla de impuesto único en JSON, sin autenticación.

**Endpoints:**
- `GET https://api.gael.cloud/general/public/previred/{MMYYYY}` — 40+ campos con UF, UTM, IMM, tasas AFP (7 fondos), topes imponibles, cesantía, SIS, asignación familiar
- `GET https://api.gael.cloud/general/public/impunico/{MMYYYY}` — 8 tramos de impuesto único con desde, hasta, factor, cantidad a rebajar, tasa efectiva

**Rate limit:** 9 requests / 10 segundos. Suficiente para sync mensual.

**Campos clave del response de Previred (Marzo 2026 real):**

| Campo API | Valor | Uso en Greenhouse |
|-----------|-------|-------------------|
| `UFValPeriodo` | 39,841.72 | Ya tenemos UF — validar cruzado |
| `UTMVal` | 69,889 | Ya tenemos UTM — validar cruzado |
| `RMITrabDepeInd` | 539,000 | **IMM** — tope gratificación legal |
| `RTIAfpPesos` | 3,585,755 | **Tope imponible AFP** (90 UF en $) |
| `RTISegCesPesos` | 5,386,601 | **Tope imponible cesantía** (135.2 UF en $) |
| `TasaSIS` | 1.54 | **Tasa SIS empleador** |
| `AFPUnoTasaDepTrab` | 10.46 | Tasa total dependiente AFP Uno |
| `AFPUnoTasaDepAPagar` | 10.56 | Tasa a pagar (incluye cargo empleador) |
| `AFPUnoTasaInd` | 12.00 | Tasa independiente AFP Uno |
| `AFCCpiEmpleador` | 2.4 | Cesantía empleador indefinido |
| `AFCCpiTrabajador` | 0.6 | Cesantía trabajador indefinido |
| `AFCCpfEmpleador` | 3.0 | Cesantía empleador plazo fijo |
| `AFCCpfTrabajador` | 0 | Cesantía trabajador plazo fijo |
| `Dist7PorcCCAF` | 4.2 | Distribución 7% salud CCAF |
| `Dist7PorcFonasa` | 2.8 | Distribución 7% salud Fonasa |
| (7 AFP × 3 tasas) | ... | Todas las tasas AFP actualizadas |

**Campos clave del response de impuesto único (Marzo 2026 real):**

| Campo API | Valor | Uso |
|-----------|-------|-----|
| `TR1Desde` / `TR1Hasta` | 0 / 943,501.50 | Tramo 1 exento |
| `TR1Factor` | 0 | Sin impuesto |
| `TR2Desde` / `TR2Hasta` | 943,501.51 / 2,096,670 | Tramo 2 |
| `TR2Factor` / `TR2CReb` | 0.04 / 37,740.06 | 4% con rebaja |
| ... hasta TR8 | ... | 8 tramos completos |

**Implementación:**

Nuevo servicio: `src/lib/payroll/previred-sync.ts`

```
syncPreviredIndicators(year, month):
  1. GET api.gael.cloud/general/public/previred/{MMYYYY}
  2. Parsear y normalizar (comas → puntos, strings → numbers)
  3. Upsert en greenhouse_payroll.previred_indicators
  4. Extraer tasas AFP → upsert en greenhouse_payroll.afp_rates
  5. Emitir evento payroll.previred_indicators.synced

syncImpuestoUnico(year, month):
  1. GET api.gael.cloud/general/public/impunico/{MMYYYY}
  2. Parsear 8 tramos
  3. Upsert en greenhouse_payroll.tax_brackets
  4. Emitir evento payroll.tax_brackets.synced
```

**Cron:** `GET /api/cron/sync-previred` — mensual (día 1 de cada mes) o al crear período.

**Tablas nuevas:**

`greenhouse_payroll.previred_indicators`:
| Columna | Tipo |
|---------|------|
| `period_year` | INT |
| `period_month` | INT |
| `uf_value` | NUMERIC(12,2) |
| `utm_value` | NUMERIC(12,0) |
| `uta_value` | NUMERIC(12,0) |
| `imm_value` | NUMERIC(12,0) |
| `tope_afp_pesos` | NUMERIC(12,0) |
| `tope_cesantia_pesos` | NUMERIC(12,0) |
| `tasa_sis` | NUMERIC(5,2) |
| `afc_indefinido_empleador` | NUMERIC(5,2) |
| `afc_indefinido_trabajador` | NUMERIC(5,2) |
| `afc_plazo_fijo_empleador` | NUMERIC(5,2) |
| `afc_plazo_fijo_trabajador` | NUMERIC(5,2) |
| `raw_json` | JSONB |
| `synced_at` | TIMESTAMPTZ |
| PRIMARY KEY | `(period_year, period_month)` |

`greenhouse_payroll.afp_rates`:
| Columna | Tipo |
|---------|------|
| `afp_code` | TEXT |
| `period_year` | INT |
| `period_month` | INT |
| `tasa_dependiente_trabajador` | NUMERIC(5,2) |
| `tasa_dependiente_a_pagar` | NUMERIC(5,2) |
| `tasa_independiente` | NUMERIC(5,2) |
| PRIMARY KEY | `(afp_code, period_year, period_month)` |

`greenhouse_payroll.tax_brackets`:
| Columna | Tipo |
|---------|------|
| `period_year` | INT |
| `period_month` | INT |
| `tramo` | INT (1-8) |
| `desde` | NUMERIC(14,2) |
| `hasta` | NUMERIC(14,2) |
| `factor` | NUMERIC(5,4) |
| `cantidad_rebajar` | NUMERIC(14,2) |
| `tasa_efectiva` | NUMERIC(5,2) |
| PRIMARY KEY | `(period_year, period_month, tramo)` |

**UX en alta de compensación:**
- Dropdown de AFP con nombre → tasa se autocompleta desde `afp_rates` del período actual
- No se edita la tasa manualmente
- Si no hay indicadores synced para el período: warning + opción de sync manual

### Slice 2 — Helpers previsionales canónicos

Basados en datos synced de Gael Cloud:

**Readers:**
- `getPreviredIndicators(year, month)` → indicadores del período (con auto-sync si no existe)
- `getAfpRates(year, month)` → Map de AFP → tasas
- `getAfpRateForCode(afpCode, year, month)` → tasa específica
- `getTaxBrackets(year, month)` → 8 tramos
- `computeTaxFromBrackets(taxableBase, brackets)` → impuesto calculado

**Derivados:**
- `getImmForPeriod(year, month)` → `previred_indicators.imm_value`
- `getTopeAfpForPeriod(year, month)` → `previred_indicators.tope_afp_pesos`
- `getTopeCesantiaForPeriod(year, month)` → `previred_indicators.tope_cesantia_pesos`
- `getSisRate(year, month)` → `previred_indicators.tasa_sis`
- `getCesantiaRates(contractType, year, month)` → `{ empleador, trabajador }`

**Impacto:** Estos helpers reemplazan todos los valores hardcodeados o manuales en `calculate-chile-deductions.ts` y en `compute-chile-tax.ts`.

### Slice 3 — Reverse calculation engine

**Nuevo archivo: `src/lib/payroll/reverse-payroll.ts`**

```
computeGrossFromNet({
  netDesired: number,           // líquido que HR quiere que reciba la persona
  afpCode: string,              // AFP seleccionada del catálogo
  healthSystem: 'fonasa' | 'isapre',
  healthPlanUf?: number,        // solo si isapre
  contractType: 'indefinido' | 'plazo_fijo',
  gratificacionMode: 'mensual_25pct' | 'ninguna',
  colacionAmount: number,
  movilizacionAmount: number,
  hasApv: boolean,
  apvAmount?: number,
  periodDate: string,           // para resolver UF, UTM, IMM, tasas AFP
}): Promise<ReversePayrollResult>
```

**Retorna `ReversePayrollResult`:**
```
{
  rentaBase: number,                // renta bruta calculada
  gratificacionLegal: number,       // 25% de rentaBase, tope IMM
  baseImponible: number,            // rentaBase + gratificación
  colacion: number,
  movilizacion: number,
  totalHaberes: number,             // baseImponible + colación + movilización

  afpCotizacionAmount: number,      // cotización obligatoria
  afpComisionAmount: number,        // comisión AFP
  afpTotalAmount: number,           // total AFP
  healthObligatoriaAmount: number,  // 7% o equivalente
  healthVoluntariaAmount: number,   // excedente isapre
  healthTotalAmount: number,
  cesantiaAmount: number,
  taxAmount: number,
  apvAmount: number,
  totalDescuentos: number,

  liquidoCalculado: number,         // debe = netDesired (±$1)
  convergenceIterations: number,    // para debugging

  // Costos empleador
  employerSisAmount: number,
  employerCesantiaAmount: number,
  employerMutualAmount: number,
  employerTotalCost: number,
  totalCostToCompany: number,       // totalHaberes + employerTotalCost

  // Indicadores usados
  ufValue: number,
  utmValue: number,
  immValue: number,
  afpRates: { cotizacion: number, comision: number, total: number },
}
```

**Algoritmo:**
```
1. Obtener indicadores: UF, UTM, IMM, tasas AFP del catálogo
2. Estimar rentaBase₀ = netDesired (primer guess)
3. Loop (max 50 iteraciones):
   a. gratificación = min(rentaBase × 0.25, IMM × 4.75 / 12)
   b. baseImponible = min(rentaBase + gratificación, topeAFP)
   c. AFP = baseImponible × tasaTotalAFP
   d. salud = fonasa(baseImponible × 0.07) o isapre(planUF × UF)
   e. cesantía = min(baseImponible, topeCesantía) × tasaCesantía
   f. taxBase = baseImponible - AFP - salud - cesantía - APV
   g. impuesto = computeChileTax(taxBase, UTM)
   h. totalDescuentos = AFP + salud + cesantía + impuesto + APV
   i. liquidoResultante = rentaBase + colación + movilización - totalDescuentos
   j. diff = netDesired - liquidoResultante
   k. if |diff| <= 1: CONVERGED → break
   l. rentaBase += diff × adjustmentFactor
4. Si no converge en 50 iteraciones: throw error
5. Retornar resultado completo
```

### Slice 4 — Integración con alta de compensación

**Cambio en UX de `/hr/payroll/compensation`:**

Hoy:
```
[Input: Salario base]  ← HR ingresa el bruto
[Input: Tasa AFP]      ← HR busca en Previred
[Input: Plan UF]       ← HR busca en el plan isapre
```

Nuevo:
```
[Input: Líquido deseado]      ← HR ingresa lo que la persona debe recibir
[Dropdown: AFP]               ← selecciona AFP, tasa se autocompleta
[Radio: Fonasa / Isapre]      ← selecciona sistema de salud
[Input: Plan UF]              ← solo si Isapre
[Radio: Indefinido / Plazo fijo]
[Checkbox: Gratificación legal mensual]
[Input: Colación]
[Input: Movilización]

→ [Preview calculado en tiempo real]:
  Renta bruta:        $539,000
  Gratificación:      $134,750
  Base imponible:     $673,750
  AFP Uno:           -$70,474
  Isapre:           -$161,948
  Cesantía:           -$4,043
  Impuesto:               $0
  Líquido:           $595,656 ✓
  Costo empresa:     $706,596
```

**Compatibilidad:**
- El modo "ingresar bruto" sigue disponible como toggle avanzado
- El reverse genera exactamente los mismos campos de `CompensationVersion`
- El motor forward (`calculatePayroll`) sigue sin cambios — solo cambia cómo se setea la compensación

### Slice 5 — Validación cruzada

**Test de paridad:**
Usar la liquidación real de Valentina Hoyos como test case:
- Input: líquido $595,656, AFP Uno, Isapre Colmena 4.18 UF, indefinido, colación $83,371, movilización $75,000, gratificación mensual
- Expected output: renta base $539,000, total haberes $832,121, total descuentos $236,465
- Tolerance: ±$1 CLP

**Tests adicionales:**
- Fonasa (7%) sin isapre
- Tramo 2 de impuesto (sueldo más alto)
- Sin gratificación legal
- Plazo fijo (3% cesantía empleado)
- Con APV
- Sueldo que topa base imponible AFP (90 UF)

## Out of Scope

- Cálculo para trabajadores independientes (boleta de honorarios)
- Gratificación anual proporcional (solo mensual 25% para MVP)
- Multi-empresa (múltiples RUT/razones sociales)
- Pago de cotizaciones via Previred (solo lectura de indicadores)

## Dependencies & Impact

### Depende de
- **TASK-076** — campos de gratificación legal, colación, movilización, AFP desglose, costos empleador
- **TASK-058** — economic indicators (UF, UTM ya existen; IMM por agregar)
- Motor forward actual (`calculate-chile-deductions.ts`)

### Impacta a
- Alta/edición de compensación (`/hr/payroll/compensation`)
- Preview de cálculo en la UI de compensación
- `member_capacity_economics` — costo empresa real
- Cost Intelligence — P&L con costo laboral completo
- TASK-077 — recibos de nómina con datos completos

### Archivos owned
- `src/lib/payroll/reverse-payroll.ts` (nuevo)
- `src/lib/payroll/afp-catalog.ts` (nuevo)
- `src/lib/payroll/chile-previsional-helpers.ts` (nuevo)
- `scripts/setup-postgres-payroll.sql` (extensión: `afp_catalog` table)
- `scripts/migrations/add-afp-catalog.sql`
- Tests de reverse calculation

## Acceptance Criteria

- [ ] `syncPreviredIndicators()` trae y persiste indicadores de Gael Cloud API para el período
- [ ] `syncImpuestoUnico()` trae y persiste 8 tramos de impuesto único
- [ ] Cron `/api/cron/sync-previred` funciona mensualmente
- [ ] Tasas AFP (7 fondos) se autocompletan desde `afp_rates` sin input manual
- [ ] IMM, topes imponibles, tasa SIS, cesantía — todos vienen del sync, no hardcodeados
- [ ] `computeGrossFromNet()` converge en <50 iteraciones para todos los casos base
- [ ] Para Valentina Hoyos: input líquido $595,656 → output renta base $539,000 (±$1)
- [ ] Impuesto se calcula desde `tax_brackets` synced, no desde tablas hardcodeadas
- [ ] UI de compensación permite ingresar líquido deseado con preview en tiempo real
- [ ] Modo "ingresar bruto" sigue disponible como toggle
- [ ] Costos empleador (SIS, cesantía, mutual) calculados y visibles en preview
- [ ] Tests cubren: Fonasa, Isapre, tramo 1 exento, tramo 2, con/sin gratificación, indefinido/plazo fijo, con APV, tope imponible
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

- Test case Valentina Hoyos (Feb 2026) como golden test
- Al menos 2 liquidaciones reales adicionales como contraste
- Comparar contra calculadora de sueldos online (e.g. chilesueldos.cl) para validar
- UI: ingresar líquido → preview muestra desglose → guardar compensación → calcular nómina → verificar que el neto coincide
