# TASK-093 — Gasto de Personal: Consistencia de datos y semántica de KPIs

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseño` |
| Domain | HR Payroll |

## Summary

La tab "Gasto de personal" en Nómina muestra KPIs con labels ambiguos, promedios calculados incorrectamente para escenarios multi-moneda, y un donut chart que compara monedas distintas. Los datos del query SQL son correctos, pero la capa de presentación y la función de agregación tienen bugs semánticos que generan confusión e inconsistencia visual.

## Why This Task Exists

Un HR manager que abre esta vista ve "$832.121 CLP — 2 períodos" y "$4,421.27 USD — 2 períodos" sin poder entender: cuántas personas representan cada moneda, qué meses están incluidos, si el promedio es per cápita o total, ni por qué el donut compara pesos con dólares. La vista entrega números correctos pero sin el contexto necesario para interpretarlos.

## Problems Identified

### P1. Promedio por moneda usa periodo count global (backend bug)

**Archivo:** `src/lib/payroll/personnel-expense.ts:149-164`

```ts
const periodCount = periods.length || 1  // ← global
// ...
gross: Math.round(bucket.gross / periodCount)  // ← aplica a cada moneda
```

Si CLP tiene entries en 2 de 2 períodos pero USD solo en 1, el promedio USD divide por 2 cuando debería dividir por 1. El conteo de períodos debe ser **por moneda**, no global.

**Fix:** contar `periodsWithCurrency(currency)` y usar ese conteo para cada bucket de promedio.

### P2. Labels de KPI ambiguos (UI)

| Actual | Problema | Propuesto |
|--------|----------|-----------|
| "Bruto total CLP — 2 períodos" | No dice cuántas personas ni cuáles meses | "Bruto total CLP — 1 colaborador · Feb–Mar" |
| "Promedio CLP $416.061 — Bruto promedio mensual" | No aclara si es total o per cápita | "Promedio mensual CLP — Bruto total / mes" o promedio per cápita |
| "Headcount máximo: 4 — Colaboradores" | No desglosa por régimen | "Headcount máximo: 4 — 1 Chile · 3 Internacional" |

### P3. Donut chart compara monedas incomparables (UI)

El donut muestra bruto Chile (CLP) vs bruto Internacional (USD) en la misma serie. $832K CLP domina visualmente sobre $4,421 USD por tipo de cambio, no por costo real. Esto es **engañoso**.

**Opciones:**
- A) Normalizar a una moneda (USD o CLP) usando el tipo de cambio del período
- B) Donut por headcount (% de personas por régimen) en vez de monto
- C) Dos donuts separados (uno por moneda) si ambas existen
- D) Donut solo cuando hay una moneda; cuando hay mix, mostrar breakdown cards sin donut

**Recomendación:** D — es el approach más honesto. El donut agrega valor cuando la comparación es válida (misma moneda). Cuando no lo es, las regime breakdown cards ya cubren la información.

### P4. Subtítulo "N períodos" es global, no por moneda (UI)

Las 4 KPI cards usan `periods.length` como subtítulo. Pero si CLP tiene entries en 2 períodos y USD en 1, ambas cards dicen "2 períodos". El subtítulo debe reflejar la cuenta por moneda.

**Requiere backend:** el report debe devolver `periodCount` por moneda, no solo global.

### P5. Chart de evolución no muestra data cuando hay mix (UI — menor)

Cuando hay monedas mixtas, el chart muestra un Alert en vez de data. Esto es correcto como protección, pero podría mostrar dos series separadas con dos ejes Y (CLP izquierdo, USD derecho) o tabs para alternar entre monedas.

**Recomendación:** tabs por moneda es más simple y más claro que dual axis.

### P6. Contradicción con KPIs del header (contexto — TASK-086/092)

Los KPIs del header (Período actual = "—", Colaboradores = 0, Costo = $0) contradicen la data real de la tab. Esto es efecto de TASK-086/092 (sin período abierto). No es scope de esta task pero debe documentarse como contexto.

## Scope

### Backend (`src/lib/payroll/personnel-expense.ts`)

- [ ] Calcular `periodCount` por moneda (no global) para promedios
- [ ] Incluir `periodsPerCurrency` en el response del report (para que la UI pueda mostrar subtítulos correctos)
- [ ] Incluir headcount por régimen en los totals (para label de KPI)
- [ ] Considerar incluir los meses específicos con data (para label "Feb–Mar")

### UI (`src/views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx`)

- [ ] Labels de KPI: incluir headcount por moneda y rango de meses con data
- [ ] Subtítulo de períodos por moneda, no global
- [ ] Donut: no renderizar cuando hay monedas mixtas — usar solo regime breakdown cards
- [ ] Headcount KPI: desglose Chile / Internacional en subtítulo
- [ ] Chart: considerar tabs por moneda en vez de alert bloqueante
- [ ] Promedio: clarificar "mensual total" vs "per cápita"

## Dependencies & Impact

### Depends on
- Ninguna

### Impacts to
- `src/lib/payroll/personnel-expense.ts` — response shape del report (nuevo campo `periodsPerCurrency`)
- `src/views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx` — labels, donut, chart
- API route no cambia (pass-through)

### Files owned
- `src/lib/payroll/personnel-expense.ts`
- `src/views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx`

## Acceptance Criteria

- [ ] Promedio por moneda usa periodo count por moneda, no global
- [ ] Labels de KPI incluyen contexto (headcount por moneda, meses con data)
- [ ] Donut no compara monedas distintas
- [ ] Headcount muestra desglose por régimen
- [ ] Subtítulo de períodos refleja la moneda específica
- [ ] tsc + eslint clean

## Verification

- `npx tsc --noEmit --pretty false`
- `pnpm exec eslint [archivos modificados]`
- Validación visual en staging con períodos mixtos CLP/USD
- Verificar que promedios cuadren manualmente: total / períodos con entries de esa moneda
