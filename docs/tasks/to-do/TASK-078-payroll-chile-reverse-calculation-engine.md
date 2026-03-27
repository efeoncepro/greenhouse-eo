# TASK-078 — Payroll Chile: Reverse Calculation Engine

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P0` |
| Impact | `Muy alto` |
| Effort | `Alto` |
| Status real | `Diseño` |
| Rank | 1 de 3 (ejecutar antes de TASK-076 y TASK-077) |
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

## Execution Order

Esta task es la **primera** de una cadena de 3:

```
TASK-078 (esta) → TASK-076 → TASK-077
```

**Por qué va primero:**
- TASK-076 necesita IMM (para gratificación legal), tasas AFP (para desglose), tasa SIS (para costos empleador) — todo viene del sync Previred que esta task implementa
- TASK-077 necesita campos legales completos en las entries (gratificación, colación, AFP desglose) — eso lo implementa TASK-076 que depende de esta
- Sin esta task, 076 obliga a HR a buscar tasas manualmente en Previred, que es exactamente lo que queremos eliminar

**Lo que desbloquea para TASK-076:**
- `previred_indicators` con IMM, topes, tasa SIS → slice 1 y 5 de 076
- `afp_rates` con tasas por AFP → slice 3 de 076
- `tax_brackets` con tabla de impuesto → forward engine correcto
- Helpers previsionales (`getImmForPeriod`, `getSisRate`, etc.)

**Lo que desbloquea para TASK-077:**
- Motor forward con indicadores synced → PDFs con cálculos correctos
- Reverse engine → preview preciso antes de generar recibo

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

### Slice 6 — Forward engine cutover a indicadores synced

El motor forward (`calculatePayroll`, `projectPayrollForPeriod`) hoy usa valores hardcodeados o manuales. Debe cortarse a indicadores synced:

**`calculate-chile-deductions.ts` cambios:**
- `afpRate` → leer de `afp_rates` del período (no del input manual de `compensation_versions`)
- `computeChileTax()` → leer `tax_brackets` del período (no tablas hardcodeadas)
- Topes imponibles → leer de `previred_indicators.tope_afp_pesos` / `tope_cesantia_pesos`
- Cesantía rates → leer de `previred_indicators.afc_*` por tipo contrato
- SIS empleador → leer de `previred_indicators.tasa_sis`

**`project-payroll.ts` cambios:**
- Mismos cambios — reutiliza el motor forward
- Si no hay indicadores del mes futuro: usar último período disponible + warning en resultado

**Compatibilidad:**
- El campo `afpRate` en `compensation_versions` pasa a ser **override opcional**: si existe y difiere del catálogo, se usa el override (caso AFP no estándar)
- Si `afpRate` es null o no está, se lee del catálogo synced
- `unemploymentRate` sigue como override si fue seteado manualmente; si no, viene de Previred

### Slice 7 — Wiring reactivo (outbox events + projection triggers)

**Eventos nuevos en el catálogo:**

| Evento | Aggregate | Cuándo se emite |
|--------|-----------|-----------------|
| `payroll.previred_indicators.synced` | `previred_sync` | Cron mensual o sync manual exitoso |
| `payroll.tax_brackets.synced` | `previred_sync` | Mismo cron |

**Proyecciones que deben reaccionar a `previred_indicators.synced`:**

| Projection | Reacción |
|------------|----------|
| `member_capacity_economics` | Recalcular costos empleador (SIS, cesantía) con nuevas tasas para todos los miembros activos del período |
| `projected_payroll` | Refrescar proyección del período con nuevos indicadores |
| `client_economics` | Transitivo — se actualiza cuando `payroll_entry.upserted` o `member_capacity_economics` cambia |

**Agregar triggers al projection registry:**
- `member_capacity_economics` → agregar `payroll.previred_indicators.synced` a su lista de triggers (scope: `finance_period`)
- `projected_payroll` → agregar `payroll.previred_indicators.synced` (scope: `finance_period`)

**Wiring en cron:**
```
/api/cron/sync-previred
  1. syncPreviredIndicators(year, month)
  2. syncImpuestoUnico(year, month)
  3. Emitir payroll.previred_indicators.synced
  4. Emitir payroll.tax_brackets.synced
  → reactive consumer procesa: member_capacity_economics, projected_payroll se refrescan
```

### Slice 8 — Impacto en `member_capacity_economics` (loaded cost real)

El snapshot de capacidad/economía debe incluir costos empleador para reflejar el costo real:

**Campos nuevos o derivados en el snapshot:**

| Campo | Cálculo | Fuente |
|-------|---------|--------|
| `employerSisTarget` | `baseImponible × tasaSIS` | `previred_indicators.tasa_sis` |
| `employerCesantiaTarget` | `baseImponible × tasaCesantiaEmpleador` | `previred_indicators.afc_*_empleador` |
| `employerMutualTarget` | `baseImponible × tasaMutual` | Config empresa (manual) |

**Impacto en campos existentes:**
```
ANTES:  loadedCostTarget = totalLaborCostTarget + directOverhead + sharedOverhead
AHORA:  loadedCostTarget = totalLaborCostTarget + employerCosts + directOverhead + sharedOverhead

Donde:
  totalLaborCostTarget = baseSalary + gratificación + colación + movilización (en CLP)
  employerCosts = SIS + cesantía empleador + mutual
```

**Resultado:** `costPerHourTarget` y `suggestedBillRateTarget` suben ~15-25% para colaboradores Chile. Eso es correcto — hoy están subestimados.

**Consumer chain downstream:**
```
member_capacity_economics (loaded cost real)
    ↓
person_intelligence (cost per hour, cost per asset)
    ↓
client_economics (labor cost allocation por FTE)
    ↓
operational_pl (P&L con labor cost correcto)
    ↓
Agency margin, Org Economics, People Finance tab
```

## Cross-Module Impact Summary

| Módulo | Qué cambia | Magnitud |
|--------|------------|----------|
| **Payroll official** | Indicadores de Previred en vez de hardcoded; gratificación en base imponible | Alto — cálculos cambian |
| **Payroll projected** | Mismo motor, mismos indicadores | Alto |
| **Payroll receipts** (TASK-077) | PDF con campos legales completos | Alto |
| **Compensation UI** | Nuevo modo reverse + dropdown AFP | Alto — UX cambia |
| **member_capacity_economics** | Loaded cost incluye employer costs | Alto — +15-25% costo CLP |
| **person_intelligence** | Cost per hour sube | Medio — transitivo |
| **client_economics** | Labor cost per client sube | Alto — márgenes bajan |
| **Cost Intelligence P&L** | Números más realistas | Alto — transitivo |
| **Agency Team** | Loaded cost por persona sube | Medio |
| **Organization Economics** | P&L corregido | Medio |
| **People Finance tab** | Costo fully-loaded real | Medio |
| **Payroll export (Excel)** | Nuevas columnas | Bajo |

## Out of Scope

- Cálculo para trabajadores independientes (boleta de honorarios)
- Gratificación anual proporcional (solo mensual 25% para MVP)
- Multi-empresa (múltiples RUT/razones sociales)
- Pago de cotizaciones via Previred (solo lectura de indicadores)
- Re-cálculo automático de compensaciones vigentes al cambiar indicadores (solo el cálculo de nómina usa indicadores nuevos; la compensación es contrato fijo)

## Dependencies & Impact

### Depende de
- **TASK-076** — campos de gratificación legal, colación, movilización, AFP desglose, costos empleador
- **TASK-058** — economic indicators runtime (UF, UTM ya existen)
- Motor forward actual (`calculate-chile-deductions.ts`, `compute-chile-tax.ts`)
- Projection registry (`src/lib/sync/projections/index.ts`)
- Event catalog (`src/lib/sync/event-catalog.ts`)

### Impacta a
- **Payroll** — motor forward y projected usan indicadores synced
- **Compensation UI** — nuevo modo reverse + dropdown AFP
- **member_capacity_economics** — loaded cost con employer costs reales
- **person_intelligence** — cost per hour/asset corregido
- **client_economics** — labor cost per client real
- **Cost Intelligence** (TASK-067-071) — P&L con costo laboral completo
- **TASK-077** — recibos de nómina con datos completos
- **Agency, Organization, People** — transitivo via capacity economics

### Archivos owned
- `src/lib/payroll/previred-sync.ts` (nuevo)
- `src/lib/payroll/reverse-payroll.ts` (nuevo)
- `src/lib/payroll/chile-previsional-helpers.ts` (nuevo)
- `src/lib/payroll/calculate-chile-deductions.ts` (modificar: leer de synced)
- `src/lib/payroll/compute-chile-tax.ts` (modificar: leer de tax_brackets)
- `src/app/api/cron/sync-previred/route.ts` (nuevo)
- `src/lib/sync/event-catalog.ts` (agregar eventos)
- `src/lib/sync/projections/member-capacity-economics.ts` (agregar trigger + employer costs)
- `scripts/setup-postgres-payroll.sql` (extensión: 3 tablas nuevas)
- `scripts/migrations/add-previred-tables.sql`
- Tests de reverse calculation, sync, y forward con indicadores

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
