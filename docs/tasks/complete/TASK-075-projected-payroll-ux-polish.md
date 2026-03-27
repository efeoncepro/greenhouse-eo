# TASK-075 — Projected Payroll UX Polish

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Diseño` |
| Rank | — |
| Domain | HR Payroll |

## Summary

Pulir la vista de nómina proyectada (`/hr/payroll/projected`) para cerrar gaps de UX identificados en staging: contexto de período ausente, descuentos como ruido para régimen internacional, bonos variables sin explicación de payout, falta de equivalente CLP, indicadores espartanos y jerarquía visual del desglose.

## Why This Task Exists

La vista de nómina proyectada ya funciona y muestra datos correctos, pero presenta problemas de interpretabilidad que confunden al usuario:
- Bruto = Neto sin explicación (régimen USD internacional sin descuentos chilenos)
- Dots de color en OTD/RpA sin leyenda ni % de payout
- 4 filas de `-$0.00` en descuentos que son ruido para colaboradores internacionales
- Sin equivalente CLP para una empresa chilena
- Sin contexto explícito del mes proyectado
- Indicadores con solo "Días hábiles" sin permisos/ausencias

## Goal

Que un usuario de HR o Finance pueda entender el desglose proyectado de cada colaborador sin necesidad de preguntar "¿por qué no hay descuentos?" o "¿qué significa el punto naranja?".

## Architecture Alignment

- Vista: `src/views/greenhouse/payroll/ProjectedPayrollView.tsx` (o equivalente)
- APIs: `GET /api/hr/payroll/projected` (ya existente, no requiere cambios de API)
- Patrón: ajustes de presentación client-side, sin cambios de modelo ni backend
- Fuente canónica Payroll: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

## Dependencies & Impact

- **Depende de:**
  - Vista de nómina proyectada ya implementada (TASK-063 runtime)
  - Bonus policy recalibration (TASK-065) para las bandas de OTD/RpA
- **Impacta a:**
  - UX de la vista oficial de nómina (`/hr/payroll/periods/[periodId]`) — los mismos fixes aplican
  - TASK-070 (Cost Intelligence UI) — patrones visuales de desglose reutilizables
- **Archivos owned:**
  - Cambios en componentes de vista de nómina proyectada (no archivos nuevos)

## Current Repo State

- `/hr/payroll/projected` existe y funciona en staging (`dev-greenhouse.efeoncepro.com`)
- Tabs "Hoy" / "Fin de mes" implementados
- KPI cards (Bruto total, Neto total, Personas) funcionan
- Tabla con accordion expandible por persona funciona
- Desglose en 3 columnas: Composición, Descuentos, Indicadores
- Datos de 3 colaboradores USD visibles con cálculos correctos

## Scope

### Fix 1 — Contexto de período explícito

**Problema:** El tab dice "Fin de mes" pero no indica qué mes. "Corte: 2026-03-31" en el card de Personas es fácil de perder.

**Solución:**
- Agregar subtítulo al tab o header de sección: `Fin de mes — Marzo 2026`
- O bien en el área de tabs: `Hoy (27 Mar)` / `Fin de mes (Mar 2026)`

### Fix 2 — Chip informativo para régimen sin descuentos

**Problema:** Bruto = Neto ($2,696.27 = $2,696.27) parece error cuando todas las deductions son $0.00.

**Solución:**
- Cuando `pay_regime != clp_chile` y total descuentos = 0: mostrar chip `Sin descuentos legales` con tooltip explicativo: "Régimen USD internacional — sin retenciones previsionales chilenas"
- En la columna DESCUENTOS del row de la tabla: mostrar `—` o `N/A` en vez de `-$0.00`

### Fix 3 — Descuentos condicionales por régimen

**Problema:** 4 filas de `-$0.00` (AFP, Salud, Cesantía, Impuesto) son ruido para USD internacional.

**Solución:**
- Para `pay_regime = usd_international` o cuando todos los descuentos = 0:
  - Reemplazar el bloque DESCUENTOS por texto compacto: `Sin descuentos previsionales`
  - O colapsar a una sola línea: `Descuentos: $0.00 (internacional)`
- Para `pay_regime = clp_chile`: mantener desglose completo (AFP, Salud, Cesantía, Impuesto)

### Fix 4 — Leyenda y % payout en bonos variables

**Problema:** Dots naranjas/rojos en OTD y RpA sin leyenda. OTD (70.4%) paga $0.21 y RpA (1.6) paga $75.00 — parece contradictorio sin contexto de bandas.

**Solución:**
- Agregar **% de payout** junto al monto de cada bono variable:
  - `OTD (70.4%) — 0% payout — $0.21`
  - `RpA (1.6) — 100% payout — $75.00`
- Agregar **tooltip al dot de color** explicando la banda:
  - Verde: "En meta o por encima"
  - Naranja: "Bajo meta, payout parcial"
  - Rojo: "Bajo umbral mínimo, sin payout"
- Opcional: micro-leyenda al pie del desglose expandido

### Fix 5 — Equivalente CLP en totales

**Problema:** Todos los totales están en USD sin referencia a CLP. Para HR/Finance chileno, falta el dato operativo principal.

**Solución:**
- En KPI cards de Bruto total y Neto total, agregar sublabel:
  - `$2,696.27 USD`
  - `~$2,534,850 CLP` (usando FX del día o del período)
- En la tabla por persona, agregar tooltip o sublabel con equivalente CLP al hover
- Si el período tiene mix de monedas (CLP + USD), el total en CLP ya incluye ambas; mostrar desglose: `CLP: $X | USD: $Y (~$Z CLP) | Total CLP: $W`

### Fix 6 — Indicadores enriquecidos

**Problema:** Solo "Días hábiles 22/22". Para proyección de nómina, falta contexto de asistencia.

**Solución:**
- Mostrar al menos 3 indicadores:
  - `Días hábiles: 22 / 22`
  - `Permisos: 0` (o cantidad real si hay)
  - `Ausencias: 0` (o cantidad real si hay)
- Si hay permisos no remunerados, mostrar en naranja: `Ausencias no remuneradas: 2`
- Estos datos ya están disponibles en el backend (`daysAbsent`, `daysOnUnpaidLeave`, `daysOnPaidLeave`)

### Fix 7 — Jerarquía visual del desglose

**Problema:** Las 3 columnas (Composición, Descuentos, Indicadores) tienen el mismo peso visual, pero Composición tiene más contenido y es más importante.

**Solución:**
- Ajustar proporciones: Composición ~50%, Descuentos ~25%, Indicadores ~25%
- Cuando Descuentos está colapsado (Fix 3), redistribuir: Composición ~60%, Indicadores ~40%
- Composición debe tener la tipografía más prominente (es el desglose del pago)

## Out of Scope

- Cambios de cálculo en el motor de payroll (solo presentación)
- Cambios de API / modelo de datos
- Vista de nómina oficial (aplica los mismos fixes como follow-up, no en esta task)
- Exportación de nómina proyectada a PDF

## Acceptance Criteria

- [ ] Tabs muestran el mes/año explícito del período proyectado
- [ ] Colaboradores USD internacionales muestran chip "Sin descuentos legales" en vez de 4 filas de $0.00
- [ ] Bonos variables (OTD, RpA) muestran % de payout y tooltip en el dot de color
- [ ] KPI cards de Bruto/Neto muestran equivalente en CLP
- [ ] Indicadores muestran al menos: días hábiles, permisos, ausencias
- [ ] Columna Composición tiene más peso visual que Descuentos e Indicadores
- [ ] `pnpm build` pasa
- [ ] Validación visual en staging

## Verification

- `pnpm build`
- `pnpm lint`
- Validación visual en `dev-greenhouse.efeoncepro.com/hr/payroll/projected`:
  - Tab muestra "Fin de mes — Marzo 2026"
  - Colaborador USD: chip "Sin descuentos legales", sin 4 filas de $0.00
  - OTD/RpA: % payout visible, tooltip en dot
  - KPI cards: equivalente CLP visible
  - Indicadores: 3 líneas (hábiles, permisos, ausencias)
  - Desglose: Composición ocupa más espacio
