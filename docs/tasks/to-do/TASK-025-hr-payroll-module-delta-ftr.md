# DELTA — HR Payroll Module v2: Reemplazo de Bono RpA por Bono FTR%

## Delta 2026-04-03 — FTR health benchmark != payroll bonus threshold

- El contrato maestro `docs/architecture/Contrato_Metricas_ICO_v1.md` ya adopta bandas benchmark-informed para `FTR` (`world-class >= 85%`, `strong >= 70%`, etc.).
- Regla obligatoria si esta lane se reactiva:
  - no reutilizar automáticamente los thresholds legacy del body (`65%`, `70%`, etc.) como si fueran benchmark canónico de `ICO`
  - distinguir explícitamente entre:
    - salud del KPI `FTR` en el contrato de métricas
    - policy de compensación variable en payroll
- Implicación:
  - un umbral de bono futuro puede existir, pero debe decidirse como policy de compensación aparte y no contradecir ni reemplazar la semántica benchmark del contrato.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `deferred` |
| Razón | TASK-065 recalibró RpA con soft bands y se mantuvo como indicador de bonos. FTR es propuesta estratégica pendiente de decisión de producto. |

## Delta 2026-03-27 — Alineación arquitectónica

- **Lifecycle cambiado a `deferred`**: el body de esta task está CONGELADO. Ningún slice debe ejecutarse hasta que exista una decisión de producto que active formalmente FTR como indicador de bonos.
- **Correcciones obligatorias si FTR se activa:**
  - Fuente de KPI: usar `greenhouse_serving.ico_member_metrics.ftr_pct` (PostgreSQL serving, ya materializado por ICO projection). NO usar `notion_ops.tareas` directo.
  - Approach de schema: AGREGAR `bonus_ftr_min`, `bonus_ftr_max`, `kpi_ftr_percent`, `bonus_ftr_amount` como campos nuevos JUNTO a `bonus_rpa_*` existentes. NO renombrar ni eliminar los campos RpA — están en producción y son usados por TASK-065, proyecciones, exports y recibos.
  - `payroll_bonus_config`: extender la tabla PostgreSQL existente (ya ampliada por TASK-065 con `rpa_soft_band_*`). No crear tabla paralela ni referenciar BigQuery.
  - Motor de cálculo: integrar sobre el forward engine cortado a indicadores synced (TASK-078), no sobre el engine manual anterior.
- **Prerequisitos si se reactiva:** TASK-078 (forward engine cutover), TASK-065 (bonus config canónico)

## Delta 2026-03-27 (original)
- La lane inmediata aprobada por negocio no es reemplazar `RpA` todavía, sino recalibrar el payout vigente de `OTD + RpA` para hacerlo más flexible.
- La ejecución inmediata queda capturada en [TASK-065](../in-progress/TASK-065-payroll-variable-bonus-policy-recalibration.md).
- Interpretación actual:
  - `TASK-025` sigue vigente como propuesta estratégica de migración a `FTR`
  - pero ya no debe asumirse como el siguiente paso obligatorio antes de cerrar la nómina
- Si `TASK-065` se implementa, `TASK-025` debe reevaluarse después como:
  - reemplazo futuro de `RpA`
  - complemento a `OTD`
  - o lane cancelada si la recalibración de `RpA` resulta suficiente

**Aplica sobre:** `CODEX_TASK_HR_Payroll_Module_v2.md`
**Fecha:** 2026-03-21
**Decisión:** Reemplazar el bono por RpA (Rounds per Asset) con bono por FTR% (First Time Right)
**Razón:** FTR% alinea el incentivo interno con la promesa ICO al cliente. OTD% = "a tiempo", FTR% = "bien a la primera". RpA como promedio diluye outliers y no premia calidad desde el brief.

---

## Definición de First Time Right (FTR%)

**Para explicar al equipo:**

> FTR% mide cuántas de tus piezas terminadas el cliente aprobó sin pedir ningún cambio.
> Si 65 de cada 100 piezas que entregas pasan sin correcciones, calificas para el bono.
> Lo que importa es entender bien el brief antes de producir, validar contra guidelines,
> y entregar algo que no necesite iteración.
> Los ajustes internos antes de entregar al cliente no cuentan como ronda —
> solo cuentan las rondas de revisión del cliente.

**Definición técnica:**

```
FTR% = (Tareas completadas con client_change_round = 0) / (Total tareas con fase_csc = 'Completado') × 100
```

**Qué cuenta como FTR:**
- Cliente aprobó sin solicitar cambios
- 0 rondas de revisión cliente (`client_change_round = 0` o `NULL`)
- Ajustes internos pre-entrega al cliente no cuentan como ronda
- Solo tareas en fase `Completado`

**Qué NO cuenta como FTR:**
- Cliente pidió cualquier cambio (1 o más rondas)
- Da igual si fueron 1 o 5 rondas — cada una es un fallo
- Tareas canceladas o en backlog no entran al cálculo

**Umbral para bono:** FTR% >= 65.0%
- 65% es el umbral inicial de activación
- Se revisará trimestralmente; el objetivo aspiracional ICO es 70%
- El `payroll_bonus_config` soporta versionado con `effective_from`

---

## Cambios por sección del CODEX TASK

### PARTE A: Infraestructura BigQuery

#### A1. `compensation_versions` — RENOMBRAR columnas de bono

**Eliminar:**
```sql
bonus_rpa_min FLOAT64 DEFAULT 0,
bonus_rpa_max FLOAT64 DEFAULT 0,
```

**Reemplazar con:**
```sql
bonus_ftr_min FLOAT64 DEFAULT 0,
bonus_ftr_max FLOAT64 DEFAULT 0,
```

#### A3. `payroll_entries` — RENOMBRAR columnas KPI y bono

**Eliminar:**
```sql
kpi_rpa_avg FLOAT64,
kpi_rpa_qualifies BOOL DEFAULT FALSE,
bonus_rpa_amount FLOAT64 DEFAULT 0,
```

**Reemplazar con:**
```sql
kpi_ftr_percent FLOAT64,
kpi_ftr_qualifies BOOL DEFAULT FALSE,
bonus_ftr_amount FLOAT64 DEFAULT 0,
```

#### A4. `payroll_bonus_config` — RENOMBRAR columna y cambiar umbral

**Tabla completa reemplazada:**

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.payroll_bonus_config` (
  config_id STRING NOT NULL DEFAULT 'default',
  otd_threshold FLOAT64 NOT NULL DEFAULT 89.0,    -- OTD% mínimo para calificar (>=)
  ftr_threshold FLOAT64 NOT NULL DEFAULT 65.0,    -- FTR% mínimo para calificar (>=)
  effective_from DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

INSERT INTO `efeonce-group.greenhouse.payroll_bonus_config`
  (config_id, otd_threshold, ftr_threshold, effective_from)
VALUES
  ('default', 89.0, 65.0, '2026-01-01');
```

---

### PARTE B: Contrato de KPIs

#### B3. Query de FTR% por persona (reemplaza query de RpA)

```sql
-- ADAPTAR: verificar nombres reales de columnas antes de usar
-- La fórmula es idéntica a la del ICO Engine metric registry (ftr_pct)
SELECT
  @identity_field AS member_ref,
  COUNTIF(IFNULL(client_change_round, 0) = 0) AS tasks_ftr,
  COUNT(*) AS tasks_completed,
  ROUND(
    COUNTIF(IFNULL(client_change_round, 0) = 0) * 100.0 / NULLIF(COUNT(*), 0),
    1
  ) AS ftr_percent
FROM `efeonce-group.notion_ops.tareas`
WHERE estado = 'Listo'
  AND last_edited_time >= TIMESTAMP(@month_start)
  AND last_edited_time < TIMESTAMP(@month_end)
GROUP BY member_ref
```

**Nota:** La query trata `client_change_round = NULL` como 0 rondas (FTR). Esto es consistente con el ICO Engine que usa `IFNULL(client_change_round, 0) = 0`. Si el equipo decide que NULL debe excluirse del cálculo, cambiar a `WHERE client_change_round IS NOT NULL` en el filtro.

#### B4. Evaluación de umbrales — REEMPLAZAR

**Antes:**
```
Si kpi_otd_percent >= 89.0 → kpi_otd_qualifies = TRUE
Si kpi_rpa_avg < 2.0       → kpi_rpa_qualifies = TRUE
```

**Después:**
```
Si kpi_otd_percent >= 89.0  → kpi_otd_qualifies = TRUE
Si kpi_ftr_percent >= 65.0  → kpi_ftr_qualifies = TRUE
```

Umbrales se leen de `payroll_bonus_config`. Notar que ambos usan operador `>=` (antes RpA usaba `<`).

#### B5. Bonos — sin cambio en lógica

Misma mecánica: si califica, HR ve rango `[bonus_ftr_min, bonus_ftr_max]`, pre-llena con min, HR ajusta. Validación server-side idéntica pero con los nuevos campos.

#### B6. Cálculo Chile — RENOMBRAR

```
Renta imponible = base_salary + bonus_otd + bonus_ftr + bonus_other
                  (remote_allowance NO es imponible)
```

El resto del cálculo no cambia.

#### B7. Cálculo Internacional — RENOMBRAR

```
Gross = base_salary + bonus_otd + bonus_ftr + bonus_other + remote_allowance
Net = Gross  (sin descuentos)
```

---

### PARTE C: API Routes

#### C6. `POST .../calculate` — Paso 3 cambia

El paso 3 ahora consulta FTR% en vez de RpA:
1. Leer `team_members` activos
2. Para cada uno, obtener `compensation_version` vigente
3. Consultar KPIs del mes: **OTD% y FTR%** desde `notion_ops.tareas`
4. Evaluar umbrales (`otd >= 89`, `ftr >= 65`)
5. Pre-llenar bonos
6. Calcular bruto, descuentos, neto
7-9. Sin cambios

#### C8. `PATCH /entries/[entryId]` — Campos editables actualizados

**Campos editables:** `bonus_otd_amount`, `bonus_ftr_amount` (antes `bonus_rpa_amount`), `bonus_other_amount`, `bonus_other_description`, `chile_tax_amount`, `manual_override`, `manual_override_note`, `net_total` (solo si manual_override = TRUE).

**Regla KPI manual:** si entran KPIs manuales, actualiza `kpi_*`, recalcula umbrales (`kpi_ftr_qualifies` en vez de `kpi_rpa_qualifies`) y vuelve a validar elegibilidad de bonos.

---

### PARTE D: Vistas UI

#### D2. Tab: Período actual — Tabla REEMPLAZAR columnas

| Columna | Dato |
|---------|------|
| Nombre | Avatar + nombre + badge régimen (CLP/USD) |
| Salario base | Formateado con moneda |
| OTD% | Porcentaje + semáforo (≥89 verde, <89 gris) + badge si califica |
| Bono OTD | **Input editable** con slider [min-max]. Disabled + $0 si no califica |
| **FTR%** | **Porcentaje + semáforo (≥65 verde, <65 gris) + badge si califica** |
| **Bono FTR** | **Input editable** con slider [min-max]. Disabled + $0 si no califica |
| Teletrabajo | Monto |
| Bruto | Calculado automático |
| Descuentos | Solo Chile. Click expande desglose |
| **Neto** | Número destacado |

**KPIs sin match automático:** Si para una persona no se encontraron KPIs en `notion_ops`, mostrar badge "KPI manual" y campos editables para que HR ingrese OTD% y **FTR%** manualmente (antes era OTD% y RpA).

#### D3. Tab: Compensaciones — Drawer

Sección 2 del drawer cambia de "Rangos OTD min/max, RpA min/max" a "Rangos OTD min/max, **FTR min/max**".

---

### PARTE E: Tipos TypeScript

#### `CompensationVersion` — RENOMBRAR

```typescript
// Eliminar:
bonusRpaMin: number
bonusRpaMax: number

// Reemplazar con:
bonusFtrMin: number
bonusFtrMax: number
```

#### `PayrollEntry` — RENOMBRAR

```typescript
// Eliminar:
kpiRpaAvg: number | null
kpiRpaQualifies: boolean
bonusRpaAmount: number

// Reemplazar con:
kpiFtrPercent: number | null
kpiFtrQualifies: boolean
bonusFtrAmount: number
```

---

### PARTE F: Estructura de archivos

```
// Renombrar en lib/payroll/:
fetch-kpis-for-period.ts     // Ahora consulta OTD% + FTR% (antes OTD% + RpA)

// Renombrar en views/:
BonusInput.tsx                // Sin cambio en componente, solo en props/labels
```

---

### Criterios de aceptación — ACTUALIZAR

**Reemplazar:**
- [ ] ~~HR no puede asignar bono RpA si RpA >= 2.0~~

**Con:**
- [ ] HR no puede asignar bono FTR si FTR% < 65% (validación server-side)
- [ ] La columna FTR% muestra semáforo: ≥65 verde, <65 gris
- [ ] El umbral FTR se lee de `payroll_bonus_config.ftr_threshold`
- [ ] La query de FTR% es consistente con la definición del ICO Engine (`client_change_round = 0`)

---

### Notas para el agente — AGREGAR

- **FTR% usa la misma fuente de datos que RpA** (`client_change_round` en `notion_ops.tareas`), pero la evaluación es diferente: RpA era un promedio continuo, FTR% es un ratio binario por tarea (0 rondas = éxito, ≥1 = fallo).
- **Consistencia con ICO Engine:** La fórmula de FTR% en payroll DEBE ser idéntica a la del ICO metric registry (`ftr_pct` en `ico-metric-registry.ts`). Si el ICO Engine cambia la fórmula, payroll debe actualizarse.
- **`NULL` en `client_change_round`:** Tratar como 0 rondas (FTR). Esto es consistente con el ICO Engine que usa `IFNULL(client_change_round, 0)`.
- **Umbral versionable:** El `payroll_bonus_config` tiene `effective_from`. Cuando el equipo estabilice FTR% por encima de 65%, se puede crear nueva fila con `ftr_threshold = 70.0` sin tocar código.
- **El operador cambió:** RpA usaba `<` (menor que 2.0). FTR% usa `>=` (mayor o igual a 65.0). No confundir al evaluar umbrales.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Delta técnico — Referencia normativa para agentes de desarrollo.*
