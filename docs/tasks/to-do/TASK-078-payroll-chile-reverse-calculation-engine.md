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

### Slice 1 — Catálogo AFP con tasas vigentes

**Nueva tabla `greenhouse_payroll.afp_catalog`:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `afp_code` | TEXT PK | `capital`, `cuprum`, `habitat`, `planvital`, `provida`, `modelo`, `uno` |
| `afp_name` | TEXT | Nombre legal |
| `cotizacion_obligatoria_rate` | NUMERIC(5,4) | Tasa cotización (e.g. 0.10 para 10%) |
| `comision_rate` | NUMERIC(5,4) | Tasa comisión (e.g. 0.0046 para 0.46%) |
| `total_dependiente_rate` | NUMERIC(5,4) | Total cargo trabajador |
| `cargo_empleador_rate` | NUMERIC(5,4) | Cargo empleador (0.001 = 0.1%) |
| `independiente_rate` | NUMERIC(5,4) | Tasa independientes |
| `effective_from` | DATE | Vigencia desde |
| `effective_to` | DATE | Vigencia hasta (NULL = vigente) |
| `source` | TEXT | `previred_manual` o `previred_sync` |
| `updated_at` | TIMESTAMPTZ | |

**Seed inicial (Marzo 2026 — datos de la screenshot de Previred):**

| AFP | Cotización | Comisión | Total Dep. | Independientes |
|-----|-----------|----------|------------|----------------|
| Capital | 10.00% | 1.44% | 11.44% | 12.98% |
| Cuprum | 10.00% | 1.44% | 11.44% | 12.98% |
| Habitat | 10.00% | 1.27% | 11.27% | 12.81% |
| PlanVital | 10.00% | 1.16% | 11.16% | 12.70% |
| Provida | 10.00% | 1.45% | 11.45% | 12.99% |
| Modelo | 10.00% | 0.58% | 10.58% | 12.12% |
| Uno | 10.00% | 0.46% | 10.46% | 12.00% |

**UX en alta de compensación:**
- Dropdown de AFP con nombre → tasa se autocompleta
- No se edita la tasa manualmente (viene del catálogo)
- Si la AFP no está en el catálogo: opción "Otra AFP" con tasa manual (fallback)

### Slice 2 — Indicadores previsionales automáticos

**Agregar a `economic-indicators` o tabla dedicada:**

| Indicador | Fuente | Frecuencia | Uso |
|-----------|--------|------------|-----|
| `IMM` (Ingreso Mínimo Mensual) | Gobierno/manual | Anual (cuando cambia) | Tope gratificación legal |
| `TOPE_IMPONIBLE_AFP` | 90 UF (fijo por ley) | Al cambiar UF | Tope base imponible AFP |
| `TOPE_IMPONIBLE_CESANTIA` | 135.2 UF (fijo por ley) | Al cambiar UF | Tope base imponible cesantía |
| `TASA_SIS` | Previred | Anual | Costo empleador SIS |
| `TASA_MUTUAL` | Configurable por empresa | Manual | Costo empleador mutual |

**Helpers:**
- `getImmForPeriod(year, month)` → IMM vigente
- `getAfpRatesForPeriod(afpCode, date)` → tasas vigentes
- `getTopeImponibleAfp(ufValue)` → `90 × ufValue`
- `getTopeImponibleCesantia(ufValue)` → `135.2 × ufValue`

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

- Sync automático con Previred (fase 2 — por ahora seed manual del catálogo AFP)
- Cálculo para trabajadores independientes (boleta de honorarios)
- Gratificación anual proporcional (solo mensual 25% para MVP)
- Multi-empresa (múltiples RUT/razones sociales)

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

- [ ] Catálogo AFP con 7 AFP vigentes y tasas separadas (cotización + comisión)
- [ ] `computeGrossFromNet()` converge en <50 iteraciones para todos los casos base
- [ ] Para Valentina Hoyos: input líquido $595,656 → output renta base $539,000 (±$1)
- [ ] IMM disponible como indicador económico
- [ ] Topes imponibles (90 UF AFP, 135.2 UF cesantía) aplicados automáticamente
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
