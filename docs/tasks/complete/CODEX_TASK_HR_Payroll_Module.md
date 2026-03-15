# CODEX TASK — HR Payroll: Módulo de Nómina y Compensación

## Resumen

Implementar el **módulo de nómina (payroll)** en el portal Greenhouse como espacio exclusivo para el HR Business Partner. Permite calcular la compensación mensual de cada colaborador combinando salario base, bonos variables por performance (OTD% y RpA), asignación de teletrabajo, y — para colaboradores en Chile — los descuentos legales obligatorios (AFP, salud, seguro cesantía, impuesto único).

**El problema hoy:** La nómina se calcula manualmente en planillas. Los KPIs que determinan bonos (OTD%, RpA) viven en BigQuery pero no se conectan con el cálculo de compensación. No hay trazabilidad de cómo se llegó a cada número ni historial de pagos.

**La solución:** Un módulo bajo `/admin/payroll` con:
1. **Configuración de compensación** por persona (salario base, moneda, asignaciones, topes de bono)
2. **Cálculo mensual automático** que lee KPIs de `notion_ops` y aplica reglas de bono
3. **Vista de nómina mensual** con desglose completo, aprobación por HR, y exportación
4. **Historial** de nóminas cerradas por persona y por mes

**Dos regímenes de pago:**
- **Chile (CLP):** Salario bruto → descuentos legales (AFP, Fonasa/Isapre, seguro cesantía, impuesto único) → líquido
- **Internacional (USD):** Pago directo sin descuentos legales (contractors)

**Este módulo es independiente del Admin Team Module** pero consume la misma tabla `greenhouse.team_members`. Requiere un nuevo rol `hr` para el HR Business Partner.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/hr-payroll`
- **Framework:** Next.js 16.1.1 (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **UI Library:** MUI 7.x
- **React:** 19.2.3
- **TypeScript:** 5.9.3
- **Deploy:** Vercel
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`
- **BigQuery dataset:** `greenhouse`

### Documentos normativos

| Documento | Qué aporta |
|-----------|------------|
| `AGENTS.md` (en el repo) | Reglas operativas del repo |
| `GREENHOUSE_IDENTITY_ACCESS_V1.md` (en el repo) | Modelo de roles, scopes, auth |
| `CODEX_TASK_Admin_Team_Module.md` (proyecto Claude) | Schema de `team_members`, dependencia directa |
| `Greenhouse_Nomenclatura_Portal_v3.md` (proyecto Claude) | Design tokens, colores, tipografía |
| `CODEX_TASKS_ALIGNMENT_UPDATE_v1.md` (proyecto Claude) | Estado real del repo vs tasks |

---

## Dependencias previas

### DEBE existir

- [x] Auth con NextAuth.js funcionando con `client_users`, roles, scopes
- [x] Guard server-side para rutas admin
- [ ] Tabla `greenhouse.team_members` creada y con seed data (CODEX_TASK_Admin_Team_Module.md)
- [ ] Pipeline `notion-bq-sync` operativo con `notion_ops.tareas` (para leer OTD% y RpA)

### NO es prerequisito

- Admin Team Module UI completo — solo necesitamos la tabla `team_members` con datos
- Integración con Nubox — es fase futura, se deja preparado

---

## Modelo de acceso

### Nuevo rol: `hr`

Agregar `hr` como rol válido en el sistema de roles existente.

| Rol | Qué ve | Qué puede hacer |
|-----|--------|-----------------|
| `hr` | `/admin/payroll/*` | Ver compensaciones, calcular nómina, aprobar, exportar. NO ve otras secciones admin (tenants, governance, feature flags). |
| `admin` | Todo incluyendo `/admin/payroll/*` | Todo lo de HR + gestión completa |

**Implementación:** Crear un role `hr` en `greenhouse.roles` y asignar al HR Business Partner via `user_role_assignments`. Agregar `/admin/payroll` al guard con validación de rol `hr` o `admin`.

---

## PARTE A: Infraestructura BigQuery

### A1. Tabla `greenhouse.team_compensation`

Configuración de compensación por persona. Una fila por persona — no por mes. Los valores aquí son los "vigentes" que se usan para calcular la nómina.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.team_compensation` (
  -- Relación
  member_id STRING NOT NULL,                      -- FK → greenhouse.team_members

  -- Régimen
  pay_regime STRING NOT NULL,                     -- 'chile' | 'international'
  currency STRING NOT NULL,                       -- 'CLP' | 'USD'

  -- Salario
  base_salary FLOAT64 NOT NULL,                   -- Salario base mensual bruto (en la moneda indicada)

  -- Asignación teletrabajo
  remote_allowance FLOAT64 DEFAULT 0,             -- Monto mensual para internet/teletrabajo

  -- Bonos variables — rangos con tope
  bonus_otd_min FLOAT64 DEFAULT 0,                -- Monto mínimo del bono OTD (si cumple umbral)
  bonus_otd_max FLOAT64 DEFAULT 0,                -- Monto máximo del bono OTD (tope)
  bonus_rpa_min FLOAT64 DEFAULT 0,                -- Monto mínimo del bono RpA (si cumple umbral)
  bonus_rpa_max FLOAT64 DEFAULT 0,                -- Monto máximo del bono RpA (tope)

  -- Chile: previsión y salud
  afp_name STRING,                                -- Nombre de la AFP (ej: 'Habitat', 'Cuprum', 'Capital')
  afp_rate FLOAT64,                               -- Tasa de cotización AFP (ej: 0.1144 para 11.44%)
  health_system STRING,                           -- 'fonasa' | 'isapre'
  health_plan_uf FLOAT64,                         -- Si isapre: valor del plan en UF (ej: 4.2)
  has_apv BOOL DEFAULT FALSE,                     -- Ahorro previsional voluntario
  apv_amount FLOAT64 DEFAULT 0,                   -- Monto APV mensual

  -- Metadata
  effective_from DATE NOT NULL,                   -- Desde cuándo aplica esta configuración
  notes STRING,                                   -- Notas del HR (ej: "Ajuste por evaluación Q1")
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A2. Tabla `greenhouse.payroll_periods`

Un registro por período de nómina (mes). Controla el estado del ciclo.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.payroll_periods` (
  -- Identificación
  period_id STRING NOT NULL,                      -- PK: '2026-03' (año-mes)
  year INT64 NOT NULL,
  month INT64 NOT NULL,

  -- Estado del ciclo
  status STRING NOT NULL DEFAULT 'draft',         -- 'draft' | 'calculated' | 'approved' | 'exported'
  calculated_at TIMESTAMP,                        -- Cuándo se corrió el cálculo
  calculated_by STRING,                           -- Email del HR que calculó
  approved_at TIMESTAMP,                          -- Cuándo HR aprobó
  approved_by STRING,                             -- Email del HR que aprobó
  exported_at TIMESTAMP,                          -- Cuándo se exportó

  -- Metadata
  notes STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A3. Tabla `greenhouse.payroll_entries`

Una fila por persona por mes. El desglose completo de la compensación calculada.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.payroll_entries` (
  -- Relación
  entry_id STRING NOT NULL,                       -- PK: '{period_id}_{member_id}'
  period_id STRING NOT NULL,                      -- FK → payroll_periods
  member_id STRING NOT NULL,                      -- FK → team_members

  -- Régimen
  pay_regime STRING NOT NULL,                     -- 'chile' | 'international'
  currency STRING NOT NULL,

  -- Componentes de ingreso
  base_salary FLOAT64 NOT NULL,                   -- Salario base del mes
  remote_allowance FLOAT64 DEFAULT 0,             -- Asignación teletrabajo

  -- KPIs del mes (snapshot)
  kpi_otd_percent FLOAT64,                        -- OTD% del mes (de notion_ops)
  kpi_rpa_avg FLOAT64,                            -- RpA promedio del mes (de notion_ops)
  kpi_otd_qualifies BOOL DEFAULT FALSE,           -- ¿Cumple umbral OTD ≥ 89%?
  kpi_rpa_qualifies BOOL DEFAULT FALSE,           -- ¿Cumple umbral RpA < 2?

  -- Bonos calculados
  bonus_otd_amount FLOAT64 DEFAULT 0,             -- Bono OTD asignado por HR (dentro del rango min-max)
  bonus_rpa_amount FLOAT64 DEFAULT 0,             -- Bono RpA asignado por HR (dentro del rango min-max)
  bonus_other_amount FLOAT64 DEFAULT 0,           -- Bono adicional discrecional
  bonus_other_description STRING,                 -- Descripción del bono adicional

  -- Total bruto
  gross_total FLOAT64 NOT NULL,                   -- base + allowance + bonos

  -- Descuentos legales Chile (NULL si international)
  chile_afp_amount FLOAT64,                       -- Cotización AFP
  chile_health_amount FLOAT64,                    -- Fonasa (7%) o Isapre (plan UF)
  chile_unemployment_amount FLOAT64,              -- Seguro cesantía (0.6% trabajador)
  chile_tax_amount FLOAT64,                       -- Impuesto único de segunda categoría
  chile_apv_amount FLOAT64,                       -- APV si aplica
  chile_total_deductions FLOAT64,                 -- Suma de todos los descuentos

  -- Neto
  net_total FLOAT64 NOT NULL,                     -- gross_total - deductions (o = gross_total si international)

  -- Override manual
  manual_override BOOL DEFAULT FALSE,             -- Si HR ajustó el neto manualmente
  manual_override_note STRING,                    -- Justificación del override

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A4. Tabla `greenhouse.payroll_bonus_config`

Configuración global de umbrales de bonos. Los umbrales son fijos pero se versionan por si cambian en el futuro.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.payroll_bonus_config` (
  config_id STRING NOT NULL DEFAULT 'default',
  otd_threshold FLOAT64 NOT NULL DEFAULT 89.0,    -- OTD% mínimo para calificar (89%)
  rpa_threshold FLOAT64 NOT NULL DEFAULT 2.0,     -- RpA máximo para calificar (< 2.0)
  effective_from DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Seed con los umbrales actuales
INSERT INTO `efeonce-group.greenhouse.payroll_bonus_config`
  (config_id, otd_threshold, rpa_threshold, effective_from)
VALUES
  ('default', 89.0, 2.0, '2026-01-01');
```

---

## PARTE B: Reglas de cálculo

### B1. KPIs del mes

Para cada `member_id`, los KPIs se calculan desde `notion_ops.tareas` filtrando por el mes calendario:

**OTD% por persona:**

```sql
SELECT
  responsable_nombre,
  COUNTIF(
    PARSE_DATE('%Y-%m-%d', SUBSTR(fecha_entrega, 1, 10)) <= PARSE_DATE('%Y-%m-%d', SUBSTR(deadline, 1, 10))
  ) * 100.0 / NULLIF(COUNT(*), 0) AS otd_percent
FROM `efeonce-group.notion_ops.tareas`
WHERE estado = 'Listo'
  AND last_edited_time >= TIMESTAMP(@month_start)
  AND last_edited_time < TIMESTAMP(@month_end)
GROUP BY responsable_nombre
```

**RpA promedio por persona:**

```sql
SELECT
  responsable_nombre,
  AVG(COALESCE(frame_versions, client_change_round, 0)) AS avg_rpa
FROM `efeonce-group.notion_ops.tareas`
WHERE estado = 'Listo'
  AND last_edited_time >= TIMESTAMP(@month_start)
  AND last_edited_time < TIMESTAMP(@month_end)
GROUP BY responsable_nombre
```

**Match persona:** JOIN por `notion_display_name` de `team_members` contra `responsable_nombre` de `notion_ops.tareas`. Si no hay match, los KPIs quedan NULL y HR los ingresa manualmente.

**Nota:** Las queries exactas dependen de los campos disponibles en `notion_ops.tareas`. Verificar contra el schema real. Si `fecha_entrega` o `deadline` no existen, OTD% se calcula a nivel de proyecto/sprint, no de persona. En ese caso, HR asigna el OTD% del equipo a cada persona.

### B2. Evaluación de umbrales

```
Si kpi_otd_percent >= 89.0 → kpi_otd_qualifies = TRUE
Si kpi_rpa_avg < 2.0       → kpi_rpa_qualifies = TRUE
```

Los umbrales (89%, 2.0) se leen de `payroll_bonus_config`. Son fijos hoy pero estar en tabla permite auditabilidad.

### B3. Bonos

Si `kpi_otd_qualifies = TRUE`:
- HR ve el rango `[bonus_otd_min, bonus_otd_max]` de `team_compensation`
- HR asigna un monto dentro de ese rango
- El cálculo sugiere `bonus_otd_min` como default, HR ajusta si quiere

Si `kpi_rpa_qualifies = TRUE`:
- Mismo patrón con `[bonus_rpa_min, bonus_rpa_max]`

Si no califica, el bono es $0. HR no puede asignar bono si el umbral no se cumple (regla de negocio enforced en la API).

### B4. Cálculo Chile

Para `pay_regime = 'chile'`:

```
Renta imponible = base_salary + bonus_otd + bonus_rpa + bonus_other
                  (remote_allowance NO es imponible — es asignación de colación/teletrabajo)

AFP = renta_imponible × afp_rate
Salud:
  Si fonasa: renta_imponible × 0.07
  Si isapre: health_plan_uf × valor_uf_del_mes (HR ingresa UF del mes, o se consulta API)
Seguro cesantía = renta_imponible × 0.006  (0.6% trabajador contrato indefinido)
APV = apv_amount (fijo)

Base imponible impuesto = renta_imponible - AFP - salud - seguro_cesantia
Impuesto único = según tabla SII del mes (tramos vigentes)

Total descuentos = AFP + salud + seguro_cesantia + impuesto + APV
Neto = renta_imponible + remote_allowance - total_descuentos
```

**Tabla de impuesto único (tramos 2026):** Los tramos se actualizan anualmente. Para MVP, HR ingresa el monto del impuesto manualmente o se hardcodean los tramos vigentes. La integración con SII es fase futura.

**Valor UF:** Para el cálculo de Isapre, se necesita el valor UF del mes. Opciones:
- HR ingresa el valor UF manualmente al abrir el período
- Se consulta `mindicador.cl/api` (API pública chilena) — fase futura

### B5. Cálculo Internacional

Para `pay_regime = 'international'`:

```
Gross = base_salary + bonus_otd + bonus_rpa + bonus_other + remote_allowance
Net = Gross  (sin descuentos)
```

---

## PARTE C: API Routes

Todas bajo `/api/admin/payroll/`. Requieren rol `hr` o `admin`.

### C1. `GET /api/admin/payroll/compensation`

Lista de configuraciones de compensación de todos los miembros.

### C2. `POST /api/admin/payroll/compensation`

Crear/actualizar configuración de compensación para un miembro.

**Body:** Todos los campos de `team_compensation`.

### C3. `GET /api/admin/payroll/periods`

Lista de períodos de nómina con estado.

### C4. `POST /api/admin/payroll/periods`

Crear un nuevo período (ej: abrir marzo 2026).

**Body:** `{ year: 2026, month: 3 }`

**Lógica:**
- Verificar que no exista ya un período para ese mes
- Crear con `status: 'draft'`
- Generar `period_id` como `'{year}-{month:02d}'`

### C5. `POST /api/admin/payroll/periods/[periodId]/calculate`

Ejecutar el cálculo de nómina para el período.

**Lógica:**
1. Leer todos los `team_members` activos
2. Para cada uno, leer su `team_compensation` vigente
3. Consultar KPIs del mes desde `notion_ops.tareas`
4. Evaluar umbrales de bono
5. Calcular bruto, descuentos (si Chile), neto
6. INSERT/UPDATE `payroll_entries` para cada persona
7. Actualizar `payroll_periods.status = 'calculated'`

**Response:** Array de `payroll_entries` calculadas con desglose.

### C6. `GET /api/admin/payroll/periods/[periodId]/entries`

Lista de entries del período con desglose completo.

### C7. `PATCH /api/admin/payroll/entries/[entryId]`

HR ajusta bonos dentro del rango o aplica override manual.

**Campos editables:**
- `bonus_otd_amount` (dentro de [min, max] si califica, 0 si no)
- `bonus_rpa_amount` (dentro de [min, max] si califica, 0 si no)
- `bonus_other_amount` + `bonus_other_description`
- `manual_override` + `manual_override_note` + `net_total` (override del neto)

**Validación:** Si `kpi_otd_qualifies = FALSE`, no se puede asignar `bonus_otd_amount > 0`.

### C8. `POST /api/admin/payroll/periods/[periodId]/approve`

HR aprueba la nómina del período.

**Lógica:**
- Verificar que `status = 'calculated'`
- Verificar que todas las entries tienen bonos asignados (si califican)
- Setear `status = 'approved'`, `approved_at`, `approved_by`
- Una vez aprobado, las entries no se pueden editar (solo con override manual documentado)

### C9. `GET /api/admin/payroll/periods/[periodId]/export`

Exportar la nómina aprobada como CSV/Excel.

**Formato del export:**

| Columna | Dato |
|---------|------|
| Nombre | display_name |
| Email | email |
| Régimen | chile / international |
| Moneda | CLP / USD |
| Salario base | base_salary |
| Asignación teletrabajo | remote_allowance |
| OTD% mes | kpi_otd_percent |
| Bono OTD | bonus_otd_amount |
| RpA mes | kpi_rpa_avg |
| Bono RpA | bonus_rpa_amount |
| Bono adicional | bonus_other_amount |
| Total bruto | gross_total |
| AFP | chile_afp_amount (o vacío) |
| Salud | chile_health_amount (o vacío) |
| Seg. cesantía | chile_unemployment_amount (o vacío) |
| Impuesto | chile_tax_amount (o vacío) |
| APV | chile_apv_amount (o vacío) |
| Total descuentos | chile_total_deductions (o vacío) |
| Neto a pagar | net_total |

### C10. `GET /api/admin/payroll/members/[memberId]/history`

Historial de nóminas de un miembro específico. Retorna entries de todos los períodos aprobados, ordenados por fecha.

---

## PARTE D: Vistas UI

### D1. `/admin/payroll` — Panel principal de nómina

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Nómina" + subtítulo + botón "Nuevo período"        │
├─────────────────────────────────────────────────────────────┤
│  Stats row: 4 cards                                          │
│  [Período actual] [Colaboradores] [Costo total bruto] [Estado]│
├─────────────────────────────────────────────────────────────┤
│  Tabs: [Período actual] [Compensaciones] [Historial]         │
├─────────────────────────────────────────────────────────────┤
│  Contenido del tab activo                                    │
└─────────────────────────────────────────────────────────────┘
```

### D2. Tab: Período actual

Vista del período de nómina en curso (el más reciente en estado `draft` o `calculated`).

**Si no hay período abierto:** Empty state con botón "Abrir período [mes actual]".

**Si hay período en `draft`:** Botón "Calcular nómina" prominente.

**Si hay período en `calculated`:**

Tabla con una fila por persona:

| Columna | Dato |
|---------|------|
| Nombre | Avatar + nombre + régimen badge (CLP/USD) |
| Salario base | Formateado con moneda |
| OTD% | Porcentaje + semáforo (≥89 verde, <89 gris) |
| Bono OTD | Input editable dentro del rango [min-max]. Disabled si no califica. |
| RpA | Número + semáforo (<2 verde, ≥2 gris) |
| Bono RpA | Input editable dentro del rango [min-max]. Disabled si no califica. |
| Teletrabajo | Monto |
| Bruto | Total bruto calculado |
| Descuentos | Total descuentos (solo Chile). Click expande desglose. |
| Neto | **Número destacado**. Color verde si positivo. |

**Acciones:**
- "Calcular" (si draft) → ejecuta el cálculo
- "Aprobar nómina" (si calculated) → confirma y cierra
- "Exportar" (si approved) → descarga CSV/Excel
- Click en fila → expande desglose completo de la persona

**Desglose expandido por persona (Chile):**

```
Renta imponible:         $1.200.000
  AFP (Habitat 11.44%):  - $137.280
  Fonasa (7%):           - $84.000
  Seg. cesantía (0.6%):  - $7.200
  Impuesto único:        - $0
  APV:                   - $0
  ─────────────────────────────────
  Total descuentos:      - $228.480
  Asig. teletrabajo:     + $30.000
  ═════════════════════════════════
  Neto a pagar:          $1.001.520
```

### D3. Tab: Compensaciones

Tabla con la configuración vigente de cada persona. Permite editar salarios, rangos de bono, asignaciones.

| Columna | Dato |
|---------|------|
| Nombre | Avatar + nombre |
| Régimen | Badge CLP / USD |
| Salario base | Número editable |
| Bono OTD rango | "[min] - [max]" editable |
| Bono RpA rango | "[min] - [max]" editable |
| Teletrabajo | Número editable |
| AFP / Salud | Solo Chile: AFP name + rate, sistema salud |
| Acciones | Editar (abre drawer) |

**Drawer de compensación:** Formulario completo con todos los campos de `team_compensation`. Secciones colapsables:
- Sección 1: Salario y moneda
- Sección 2: Bonos variables (rangos OTD y RpA)
- Sección 3: Asignación teletrabajo
- Sección 4: Previsión Chile (solo visible si `pay_regime = 'chile'`)

### D4. Tab: Historial

Lista de períodos cerrados con totales. Click en un período abre el desglose de ese mes.

| Columna | Dato |
|---------|------|
| Período | "Marzo 2026" |
| Estado | Badge (Aprobado / Exportado) |
| Colaboradores | Número |
| Total bruto | Suma formateada |
| Total neto | Suma formateada |
| Aprobado por | Nombre + fecha |
| Acciones | Ver desglose / Exportar |

### D5. `/admin/payroll/member/[memberId]` — Historial de un colaborador

Vista de todas las nóminas de una persona. Line chart de evolución del neto. Tabla con desglose mes a mes.

---

## PARTE E: Tipos TypeScript

```typescript
// src/types/payroll.ts

export type PayRegime = 'chile' | 'international'
export type PayrollCurrency = 'CLP' | 'USD'
export type PeriodStatus = 'draft' | 'calculated' | 'approved' | 'exported'
export type HealthSystem = 'fonasa' | 'isapre'

export interface TeamCompensation {
  memberId: string
  payRegime: PayRegime
  currency: PayrollCurrency
  baseSalary: number
  remoteAllowance: number
  bonusOtdMin: number
  bonusOtdMax: number
  bonusRpaMin: number
  bonusRpaMax: number
  // Chile
  afpName: string | null
  afpRate: number | null
  healthSystem: HealthSystem | null
  healthPlanUf: number | null
  hasApv: boolean
  apvAmount: number
  // Metadata
  effectiveFrom: string
  notes: string | null
}

export interface PayrollPeriod {
  periodId: string
  year: number
  month: number
  status: PeriodStatus
  calculatedAt: string | null
  calculatedBy: string | null
  approvedAt: string | null
  approvedBy: string | null
  exportedAt: string | null
  notes: string | null
}

export interface PayrollEntry {
  entryId: string
  periodId: string
  memberId: string
  memberName: string
  payRegime: PayRegime
  currency: PayrollCurrency
  // Ingresos
  baseSalary: number
  remoteAllowance: number
  // KPIs
  kpiOtdPercent: number | null
  kpiRpaAvg: number | null
  kpiOtdQualifies: boolean
  kpiRpaQualifies: boolean
  // Bonos
  bonusOtdAmount: number
  bonusRpaAmount: number
  bonusOtherAmount: number
  bonusOtherDescription: string | null
  // Totales
  grossTotal: number
  // Chile
  chileAfpAmount: number | null
  chileHealthAmount: number | null
  chileUnemploymentAmount: number | null
  chileTaxAmount: number | null
  chileApvAmount: number | null
  chileTotalDeductions: number | null
  // Neto
  netTotal: number
  // Override
  manualOverride: boolean
  manualOverrideNote: string | null
}
```

---

## PARTE F: Estructura de archivos

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── admin/
│   │       └── payroll/
│   │           ├── page.tsx                              # D1: Panel principal
│   │           └── member/
│   │               └── [memberId]/
│   │                   └── page.tsx                      # D5: Historial persona
│   └── api/
│       └── admin/
│           └── payroll/
│               ├── compensation/
│               │   └── route.ts                          # GET + POST
│               ├── periods/
│               │   ├── route.ts                          # GET + POST
│               │   └── [periodId]/
│               │       ├── route.ts                      # GET
│               │       ├── calculate/
│               │       │   └── route.ts                  # POST
│               │       ├── approve/
│               │       │   └── route.ts                  # POST
│               │       ├── entries/
│               │       │   └── route.ts                  # GET
│               │       └── export/
│               │           └── route.ts                  # GET (CSV/XLSX)
│               ├── entries/
│               │   └── [entryId]/
│               │       └── route.ts                      # PATCH
│               └── members/
│                   └── [memberId]/
│                       └── history/
│                           └── route.ts                  # GET
├── views/
│   └── greenhouse/
│       └── payroll/
│           ├── PayrollDashboard.tsx                       # Composición principal
│           ├── PayrollPeriodTab.tsx                       # Tab período actual
│           ├── PayrollCompensationTab.tsx                 # Tab compensaciones
│           ├── PayrollHistoryTab.tsx                      # Tab historial
│           ├── PayrollEntryTable.tsx                      # Tabla de entries
│           ├── PayrollEntryExpanded.tsx                   # Desglose expandido
│           ├── CompensationDrawer.tsx                     # Drawer de edición
│           ├── BonusInput.tsx                             # Input de bono con rango
│           ├── ChileDeductionBreakdown.tsx                # Desglose Chile
│           └── MemberPayrollHistory.tsx                   # Historial por persona
├── lib/
│   └── payroll/
│       ├── get-compensation.ts                           # Query builder
│       ├── get-payroll-periods.ts                        # Query builder
│       ├── get-payroll-entries.ts                         # Query builder
│       ├── calculate-payroll.ts                          # Lógica de cálculo
│       ├── calculate-chile-deductions.ts                 # Cálculo descuentos Chile
│       ├── fetch-kpis-for-period.ts                      # Lectura KPIs de notion_ops
│       └── export-payroll.ts                             # Generación CSV/XLSX
└── types/
    └── payroll.ts                                        # Interfaces
```

---

## PARTE G: Navegación

### Sidebar

Agregar "Nómina" en la sección Admin, visible solo para roles `hr` y `admin`.

```typescript
{
  title: 'Nómina',
  icon: 'tabler-receipt-2',
  path: '/admin/payroll',
  // Solo visible si role incluye hr o admin
}
```

---

## PARTE H: Orden de ejecución

### Fase 1: Infraestructura

1. Agregar rol `hr` a `greenhouse.roles`
2. Crear tablas BigQuery (A1, A2, A3, A4)
3. Insertar seed de `payroll_bonus_config`
4. Crear types TypeScript (E)
5. Crear query builders en `src/lib/payroll/`

### Fase 2: APIs core

6. `GET/POST /api/admin/payroll/compensation` (C1, C2)
7. `GET/POST /api/admin/payroll/periods` (C3, C4)
8. `POST /api/admin/payroll/periods/[periodId]/calculate` (C5)
9. `GET /api/admin/payroll/periods/[periodId]/entries` (C6)
10. `PATCH /api/admin/payroll/entries/[entryId]` (C7)

### Fase 3: Flujo completo

11. `POST /api/admin/payroll/periods/[periodId]/approve` (C8)
12. `GET /api/admin/payroll/periods/[periodId]/export` (C9)
13. `GET /api/admin/payroll/members/[memberId]/history` (C10)

### Fase 4: UI

14. Crear `PayrollDashboard.tsx` con tabs
15. Crear `PayrollPeriodTab.tsx` con tabla de entries
16. Crear `BonusInput.tsx` (input con slider de rango)
17. Crear `PayrollEntryExpanded.tsx` con desglose Chile
18. Crear `CompensationDrawer.tsx`
19. Crear `PayrollCompensationTab.tsx`
20. Crear `PayrollHistoryTab.tsx`
21. Crear `MemberPayrollHistory.tsx` con line chart
22. Crear export CSV/XLSX
23. Agregar "Nómina" al sidebar

### Fase 5: Polish

24. Verificar formateo de moneda (CLP con punto millar, USD con coma decimal)
25. Verificar responsive
26. Verificar que solo `hr` y `admin` ven el módulo
27. Verificar que bonos no se pueden asignar si el umbral no se cumple

---

## Criterios de aceptación

### Infraestructura

- [ ] Rol `hr` existe en `greenhouse.roles`
- [ ] Tablas `team_compensation`, `payroll_periods`, `payroll_entries`, `payroll_bonus_config` creadas
- [ ] APIs retornan datos correctos y validan rol `hr` o `admin`

### Flujo de nómina

- [ ] HR puede abrir un período mensual
- [ ] "Calcular nómina" lee KPIs reales de `notion_ops.tareas` y genera entries
- [ ] Las entries muestran OTD% y RpA por persona con semáforo de cumplimiento
- [ ] Si OTD ≥ 89%, el campo de bono OTD se habilita con el rango [min, max]
- [ ] Si RpA < 2, el campo de bono RpA se habilita con el rango [min, max]
- [ ] Si no califica, el campo de bono está disabled y en $0
- [ ] HR puede ajustar el bono dentro del rango permitido
- [ ] HR puede agregar bono adicional discrecional con descripción
- [ ] HR puede aprobar la nómina (cambia estado, bloquea edición)
- [ ] HR puede exportar a CSV/Excel

### Cálculo Chile

- [ ] AFP se calcula como `renta_imponible × afp_rate`
- [ ] Fonasa se calcula como `renta_imponible × 0.07`
- [ ] Si Isapre, se calcula como `health_plan_uf × valor_uf` (HR ingresa UF)
- [ ] Seguro cesantía se calcula como `renta_imponible × 0.006`
- [ ] Impuesto único: HR ingresa manualmente para MVP
- [ ] Asignación teletrabajo NO es imponible
- [ ] Desglose expandido muestra cada línea de descuento

### Cálculo Internacional

- [ ] No hay descuentos
- [ ] Neto = bruto
- [ ] Moneda en USD

### Compensaciones

- [ ] HR puede ver y editar la configuración de compensación de cada persona
- [ ] Drawer con secciones: salario, bonos, teletrabajo, previsión Chile
- [ ] Sección de previsión Chile solo visible si `pay_regime = 'chile'`

### Seguridad

- [ ] Solo roles `hr` y `admin` acceden a `/admin/payroll`
- [ ] Un usuario `client` o `operator` recibe 403
- [ ] Las entries aprobadas no se pueden editar (excepto con override manual documentado)

---

## Lo que NO incluye esta tarea

- **Integración con Nubox** — preparado a nivel de export pero sin API directa. Tarea futura.
- **Cálculo automático de impuesto único** — HR lo ingresa manualmente. Los tramos SII se pueden automatizar después.
- **Consulta automática de valor UF** — HR lo ingresa. API de mindicador.cl es fase futura.
- **Boletas de honorarios / facturación de contractors** — el módulo calcula el monto a pagar, no genera documentos tributarios.
- **Time tracking** — los KPIs vienen de Notion, no de un sistema de horas.
- **Notificaciones a colaboradores** — HR comunica por su canal habitual.
- **Multi-periodo** — no se pueden tener dos períodos abiertos simultáneamente.

---

## Notas para el agente

- **Este módulo maneja datos sensibles (salarios).** Verificar que NINGÚN endpoint de payroll sea accesible sin autenticación + rol `hr`/`admin`.
- **El cálculo de Chile es complejo.** Para MVP, enfocarse en que el flujo funcione end-to-end con AFP + Fonasa + seguro cesantía. Impuesto único como input manual. No intentar calcular Isapre con UF automático.
- **BigQuery no es ideal para transacciones.** Las mutations (INSERT/UPDATE) no son atómicas. El cálculo de nómina debe ser idempotente: si se ejecuta dos veces para el mismo período, debe hacer UPSERT, no duplicar entries.
- **Formateo de moneda:** CLP usa `$1.200.000` (punto como separador de miles, sin decimales). USD usa `$3,500.00` (coma como miles, punto como decimal). Usar `Intl.NumberFormat` con locale `es-CL` o `en-US` según la moneda.
- **Las queries de KPIs dependen del schema real de `notion_ops.tareas`.** Verificar qué campos existen (especialmente `responsable_nombre`, `fecha_entrega`, `deadline`) antes de implementar. Si no hay campos de fecha de entrega vs deadline, OTD% no se puede calcular por persona — escalar a HR para definición alternativa.
- **Branch naming:** `feature/hr-payroll`.
- **No mezclar con Admin Team Module.** Este task tiene su propio branch, sus propias tablas, sus propias rutas. La única dependencia compartida es `greenhouse.team_members`.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo. Referencia normativa para implementación.*
