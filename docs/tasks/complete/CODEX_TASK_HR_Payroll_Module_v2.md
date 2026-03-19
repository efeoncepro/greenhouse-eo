# CODEX TASK — HR Payroll: Módulo de Nómina y Compensación (v2)

## Estado del brief

Este documento queda como brief histórico de la implementación base de `HR Payroll`.

Estado al `2026-03-14`:
- el módulo `/hr/payroll` ya existe en runtime
- el route group `hr`, el rol `hr_payroll`, las tablas `compensation_versions`, `payroll_periods`, `payroll_entries` y `payroll_bonus_config`, y la mayoría de APIs ya están implementadas
- los gaps operativos restantes ya no deben trabajarse desde este documento greenfield

Brief vigente para continuar el módulo:
- `docs/tasks/to-do/CODEX_TASK_HR_Payroll_Module_v3.md`

## Resumen

Implementar el **módulo de nómina (payroll)** en el portal Greenhouse como espacio exclusivo para el HR Business Partner. Permite calcular la compensación mensual de cada colaborador combinando salario base, bonos variables por performance (OTD% y RpA), asignación de teletrabajo, y — para colaboradores en Chile — los descuentos legales obligatorios (AFP, salud, seguro cesantía, impuesto único).

**El problema hoy:** La nómina se calcula manualmente en planillas. Los KPIs que determinan bonos (OTD%, RpA) viven en BigQuery pero no se conectan con el cálculo de compensación. No hay trazabilidad de cómo se llegó a cada número ni historial de pagos.

**La solución:** Un módulo bajo `/hr/payroll` (route group propio, no bajo `/admin`) con:
1. **Configuración de compensación** por persona (salario base, moneda, asignaciones, topes de bono) — versionada por período
2. **Cálculo mensual automático** que lee KPIs de `notion_ops` y aplica reglas de bono
3. **Vista de nómina mensual** con desglose completo, aprobación por HR, y exportación
4. **Historial** de nóminas cerradas por persona y por mes, con snapshot normativo reproducible

**Dos regímenes de pago:**
- **Chile (CLP):** Salario bruto → descuentos legales (AFP, Fonasa/Isapre, seguro cesantía, impuesto único) → líquido
- **Internacional (USD):** Pago directo sin descuentos legales (contractors)

**Este módulo es independiente del Admin Team Module** pero consume la misma tabla `greenhouse.team_members`. Requiere un nuevo route group `hr` con su propio sublayout y guard de autorización.

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

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `AGENTS.md` (en el repo) | Reglas operativas del repo |
| `GREENHOUSE_IDENTITY_ACCESS_V1.md` (en el repo) | Modelo de roles, route groups, `roleCodes`, `routeGroups`, enforcement server-side |
| `project_context.md` (en el repo) | Schema real de `notion_ops.tareas`, campos disponibles, estrategia de identidad |
| `team-queries.ts` (en el repo) | Queries existentes de equipo — verificar campos reales |
| `authorization.ts` (en el repo) | Sistema de autorización actual — verificar cómo se validan route groups |
| `CODEX_TASK_Admin_Team_Module.md` (proyecto Claude) | Schema de `team_members`, dependencia directa |
| `Greenhouse_Nomenclatura_Portal_v3.md` (proyecto Claude) | Design tokens, colores, tipografía |

---

## Alineación obligatoria con Greenhouse 360 Object Model

Esta task debe ejecutarse alineada con:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

1. **Payroll no crea una identidad paralela de colaborador**
   - el objeto canónico `Collaborator` sigue anclado a `greenhouse.team_members.member_id`
   - `compensation_versions`, `payroll_periods` y `payroll_entries` son tablas de dominio y transacción
   - ninguna de ellas debe convertirse en un “employee master” separado

2. **La identidad transversal sigue viviendo en el modelo de People/Identity**
   - `identity_profile_id` sigue siendo la raíz de identidad transversal
   - Payroll la consume indirectamente a través del colaborador, no la reemplaza

3. **Payroll debe enriquecer el objeto Collaborator, no duplicarlo**
   - historiales, compensación, bonos y entradas de nómina deben recomponerse sobre el mismo colaborador usado por People, Finance y Agency

4. **Si Payroll se integra con Finance**
   - la integración debe mantener `member_id` como ancla común
   - `payroll_entry_id` es una referencia transaccional, no el identity anchor del colaborador

5. **Snapshots normativos son válidos**
   - esta task sí puede snapshotear tasas, UF, tramos y componentes de cálculo por reproducibilidad
   - pero esos snapshots no reemplazan la identidad canónica de la persona

---

## Dependencias previas

### DEBE existir (verificar en el repo)

- [x] Auth con NextAuth.js funcionando con `client_users`, roles, scopes
- [x] Guard server-side para rutas protegidas
- [x] Tabla `greenhouse.team_members` creada y con seed data (**el repo ya la registra como creada**)
- [x] Pipeline `notion-bigquery` operativo con `notion_ops.tareas`
- [x] Endpoints de equipo funcionando

### Verificar antes de implementar

- [ ] **Schema real de `notion_ops.tareas`:** Ejecutar `SELECT column_name, data_type FROM efeonce-group.notion_ops.INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tareas'` para confirmar qué campos existen. Los campos de KPI que necesitamos son: `responsables_names` (o `responsable_texto`), `responsables_ids`, `frame_versions`, `client_change_round`, `rpa`, `estado`, `last_edited_time`. **NO asumir** que existen `fecha_entrega` o `deadline` — verificar.
- [ ] **Sistema de identidad actual:** El repo usa `identity_profile_id` y `notion_user_id` como match canónico, NO `notion_display_name` como texto libre. Verificar en `project_context.md` y `team-queries.ts`.
- [ ] **Route groups existentes:** Verificar en `authorization.ts` y `layout.tsx` cómo se definen route groups y cómo se validan roles.

---

## Modelo de acceso

### DECISIÓN ARQUITECTÓNICA: Route group propio, no `/admin`

El modelo actual del repo tiene:
- `/admin` → route group `efeonce_admin`, requiere rol específico
- `/internal` → route group para operación interna

**Problema:** Meter `hr` dentro de `/admin` genera conflicto — el layout de `/admin` deja pasar a cualquiera con route group `admin`, pero las APIs exigen `efeonce_admin` específicamente. Un rol `hr` quedaría o sobredimensionado dentro de `/admin`, o bloqueado en APIs.

**Solución:** Crear un route group `hr` propio:

```
src/app/(dashboard)/hr/
  ├── layout.tsx          # Guard: requiere routeGroup 'hr' o roleCodes incluye 'efeonce_admin'
  └── payroll/
      ├── page.tsx
      └── member/[memberId]/page.tsx
```

**Implementación:**
1. Crear role `hr_payroll` en `greenhouse.roles` con `route_group_scope: ['hr']`
2. Extender el wiring de auth del repo para reconocer `hr` como route group válido:
   - `TenantRouteGroup` en `authorization.ts`
   - guards reutilizables tipo `requireHrTenantContext()`
   - sidebar / navegación condicional
3. Crear sublayout `src/app/(dashboard)/hr/layout.tsx` que valide `routeGroups.includes('hr') || roleCodes.includes('efeonce_admin')`
4. Definir `default_portal_home_path = '/hr/payroll'` para usuarios `hr_payroll` o asegurar redirect equivalente post-login
5. Los admin con `efeonce_admin` ven todo incluyendo HR. El HR Business Partner solo ve `/hr/*`.

---

## PARTE A: Infraestructura BigQuery

### A1. Tabla `greenhouse.compensation_versions`

**Modelo versionado:** Cada cambio de compensación genera una nueva fila con `version` incremental. El cálculo de nómina siempre referencia la versión vigente al momento del cálculo, y el `payroll_entry` guarda el `compensation_version_id` usado. Esto permite reproducir cualquier nómina histórica.

**Regla crítica:** Para calcular o recalcular un período, la versión correcta no se obtiene por `is_current = TRUE`, sino por vigencia respecto del período:
- `effective_from <= @period_end`
- `effective_to IS NULL OR effective_to >= @period_start`

`is_current` queda solo como shortcut de UX para la pestaña de compensaciones vigentes, no como fuente de verdad para payroll histórico.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.compensation_versions` (
  -- Identificación
  version_id STRING NOT NULL,                     -- PK: '{member_id}_v{N}' ej: 'daniela-ferreira_v3'
  member_id STRING NOT NULL,                      -- FK → greenhouse.team_members
  version INT64 NOT NULL,                         -- Número de versión (1, 2, 3...)

  -- Régimen
  pay_regime STRING NOT NULL,                     -- 'chile' | 'international'
  currency STRING NOT NULL,                       -- 'CLP' | 'USD'

  -- Salario
  base_salary FLOAT64 NOT NULL,                   -- Salario base mensual bruto

  -- Asignación teletrabajo
  remote_allowance FLOAT64 DEFAULT 0,             -- Monto mensual para internet/teletrabajo

  -- Bonos variables — rangos con tope
  bonus_otd_min FLOAT64 DEFAULT 0,
  bonus_otd_max FLOAT64 DEFAULT 0,
  bonus_rpa_min FLOAT64 DEFAULT 0,
  bonus_rpa_max FLOAT64 DEFAULT 0,

  -- Chile: previsión y salud
  afp_name STRING,                                -- Nombre AFP (Habitat, Cuprum, Capital, etc.)
  afp_rate FLOAT64,                               -- Tasa cotización (ej: 0.1144)
  health_system STRING,                           -- 'fonasa' | 'isapre'
  health_plan_uf FLOAT64,                         -- Valor plan Isapre en UF
  unemployment_rate FLOAT64 DEFAULT 0.006,        -- Seguro cesantía trabajador (0.6% indefinido)
  contract_type STRING DEFAULT 'indefinido',      -- 'indefinido' | 'plazo_fijo' (afecta cesantía)
  has_apv BOOL DEFAULT FALSE,
  apv_amount FLOAT64 DEFAULT 0,

  -- Vigencia
  effective_from DATE NOT NULL,                   -- Desde cuándo aplica
  effective_to DATE,                              -- Hasta cuándo (NULL = vigente)
  is_current BOOL DEFAULT TRUE,                   -- Shortcut: ¿es la versión activa?

  -- Metadata
  change_reason STRING,                           -- "Ajuste por evaluación Q1", "Cambio de AFP", etc.
  created_by STRING,                              -- Email del HR que hizo el cambio
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

**Regla de versionado:** Al crear una nueva versión, setear `is_current = FALSE` y `effective_to = fecha_nueva - 1 día` en la versión anterior. La nueva versión se crea con `is_current = TRUE` y `effective_to = NULL`.

### A2. Tabla `greenhouse.payroll_periods`

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.payroll_periods` (
  period_id STRING NOT NULL,                      -- PK: '2026-03'
  year INT64 NOT NULL,
  month INT64 NOT NULL,

  -- Estado del ciclo
  status STRING NOT NULL DEFAULT 'draft',         -- 'draft' | 'calculated' | 'approved' | 'exported'
  calculated_at TIMESTAMP,
  calculated_by STRING,
  approved_at TIMESTAMP,
  approved_by STRING,
  exported_at TIMESTAMP,

  -- Snapshot normativo del período
  uf_value FLOAT64,                               -- Valor UF usado este mes (HR lo ingresa)
  tax_table_version STRING,                       -- Ref a la tabla de tramos usada (ej: '2026-H1')

  -- Metadata
  notes STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A3. Tabla `greenhouse.payroll_entries`

Cada entry guarda el **snapshot completo** de la compensación usada + los parámetros normativos del período. Esto hace cada nómina **reproducible y auditable** sin depender del estado actual de otras tablas.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.payroll_entries` (
  entry_id STRING NOT NULL,                       -- PK: '{period_id}_{member_id}'
  period_id STRING NOT NULL,                      -- FK → payroll_periods
  member_id STRING NOT NULL,                      -- FK → team_members
  compensation_version_id STRING NOT NULL,        -- FK → compensation_versions (snapshot)

  -- Régimen (snapshot de la versión de compensación usada)
  pay_regime STRING NOT NULL,
  currency STRING NOT NULL,

  -- Componentes de ingreso (snapshot)
  base_salary FLOAT64 NOT NULL,
  remote_allowance FLOAT64 DEFAULT 0,

  -- KPIs del mes (snapshot de notion_ops al momento del cálculo)
  kpi_otd_percent FLOAT64,
  kpi_rpa_avg FLOAT64,
  kpi_otd_qualifies BOOL DEFAULT FALSE,
  kpi_rpa_qualifies BOOL DEFAULT FALSE,
  kpi_tasks_completed INT64,                      -- Tareas completadas en el mes
  kpi_data_source STRING,                         -- 'notion_ops' | 'manual' (si HR ingresó a mano)

  -- Bonos
  bonus_otd_amount FLOAT64 DEFAULT 0,
  bonus_rpa_amount FLOAT64 DEFAULT 0,
  bonus_other_amount FLOAT64 DEFAULT 0,
  bonus_other_description STRING,

  -- Bruto
  gross_total FLOAT64 NOT NULL,

  -- Descuentos Chile (snapshot de parámetros usados)
  chile_afp_name STRING,
  chile_afp_rate FLOAT64,                         -- Tasa usada en este cálculo
  chile_afp_amount FLOAT64,
  chile_health_system STRING,
  chile_health_amount FLOAT64,
  chile_unemployment_rate FLOAT64,                -- Tasa usada (0.6% o 3% según contrato)
  chile_unemployment_amount FLOAT64,
  chile_taxable_base FLOAT64,                     -- Base imponible después de descuentos previsionales
  chile_tax_amount FLOAT64,
  chile_apv_amount FLOAT64,
  chile_uf_value FLOAT64,                         -- UF usada en este cálculo
  chile_total_deductions FLOAT64,

  -- Neto
  net_total_calculated FLOAT64,                  -- Neto calculado por el motor antes de override
  net_total_override FLOAT64,                    -- Neto overrideado manualmente por HR
  net_total FLOAT64 NOT NULL,

  -- Override
  manual_override BOOL DEFAULT FALSE,
  manual_override_note STRING,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A4. Tabla `greenhouse.payroll_bonus_config`

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.payroll_bonus_config` (
  config_id STRING NOT NULL DEFAULT 'default',
  otd_threshold FLOAT64 NOT NULL DEFAULT 89.0,    -- OTD% mínimo para calificar
  rpa_threshold FLOAT64 NOT NULL DEFAULT 2.0,     -- RpA máximo para calificar (< 2.0)
  effective_from DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

INSERT INTO `efeonce-group.greenhouse.payroll_bonus_config`
  (config_id, otd_threshold, rpa_threshold, effective_from)
VALUES
  ('default', 89.0, 2.0, '2026-01-01');
```

---

## PARTE B: Contrato de KPIs

### B1. Descubrimiento del schema real

**ANTES de escribir queries, el agente DEBE ejecutar:**

```sql
SELECT column_name, data_type
FROM `efeonce-group.notion_ops.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'tareas'
ORDER BY ordinal_position;
```

Y verificar en `project_context.md` y `team-queries.ts` del repo cuáles son los campos canónicos de identidad y métricas.

### B2. Match de persona: usar identidad canónica del repo

El repo ya tiene una estrategia de identidad endurecida. **NO usar `notion_display_name` como texto libre.** En su lugar:

**Prioridad de match:**
1. `identity_profile_id` (si existe en `team_members` y en `tareas`) — match exacto
2. `notion_user_id` → contra `responsables_ids` en `tareas` — match por UUID
3. **Fallback manual:** Si no hay match automático, HR ingresa KPIs manualmente para esa persona

Verificar en `team-queries.ts` cómo el repo ya hace este match y **reutilizar la misma lógica**.

### B3. Queries de KPIs (templates — adaptar al schema real)

**RpA promedio por persona (mes calendario):**

```sql
-- ADAPTAR: verificar nombres reales de columnas antes de usar
SELECT
  -- Usar el campo de identidad que exista: responsables_ids, identity_profile_id, etc.
  @identity_field AS member_ref,
  AVG(COALESCE(rpa, frame_versions, client_change_round, 0)) AS avg_rpa,
  COUNT(*) AS tasks_completed
FROM `efeonce-group.notion_ops.tareas`
WHERE estado = 'Listo'
  AND last_edited_time >= TIMESTAMP(@month_start)
  AND last_edited_time < TIMESTAMP(@month_end)
GROUP BY member_ref
```

**OTD% por persona:** Depende de qué campos de fecha existen. Verificar si hay `fecha_entrega`, `deadline`, `due_date`, o similar. Si no existen campos de deadline por tarea, OTD% se calcula a nivel de sprint/proyecto y HR lo asigna por persona.

**Regla:** Si el agente no puede confirmar el schema con la query de descubrimiento, debe dejar las queries como templates con `@placeholders` y documentar qué verificar. NO inventar columnas.

### B4. Evaluación de umbrales

```
Si kpi_otd_percent >= 89.0 → kpi_otd_qualifies = TRUE
Si kpi_rpa_avg < 2.0       → kpi_rpa_qualifies = TRUE
```

Umbrales se leen de `payroll_bonus_config`. Son fijos hoy (89%, 2.0).

### B5. Bonos

Si califica:
- HR ve el rango `[bonus_min, bonus_max]` de la `compensation_version` vigente
- El cálculo pre-llena con `bonus_min` como default
- HR ajusta dentro del rango
- **Validación server-side:** `bonus_amount >= bonus_min AND bonus_amount <= bonus_max` si califica, `bonus_amount == 0` si no califica

### B6. Cálculo Chile

```
Renta imponible = base_salary + bonus_otd + bonus_rpa + bonus_other
                  (remote_allowance NO es imponible)

AFP = renta_imponible × afp_rate
Salud:
  Si fonasa: renta_imponible × 0.07
  Si isapre: health_plan_uf × uf_value_del_periodo
Seguro cesantía:
  Si contrato indefinido: renta_imponible × 0.006
  Si contrato plazo fijo:  renta_imponible × 0.03
APV = apv_amount (fijo, si aplica)

Base imponible impuesto = renta_imponible - AFP - salud - seguro_cesantia
Impuesto único = HR ingresa manualmente (MVP) o se calcula con tramos SII

Total descuentos = AFP + salud + seguro_cesantia + impuesto + APV
Neto = renta_imponible + remote_allowance - total_descuentos
```

**Snapshot normativo:** El `payroll_entry` guarda `chile_afp_rate`, `chile_unemployment_rate`, `chile_uf_value`, `chile_taxable_base` — todos los parámetros usados. Si alguien audita marzo 2027, puede ver exactamente qué tasa y UF se usaron, sin depender del estado actual de `compensation_versions`.

### B7. Cálculo Internacional

```
Gross = base_salary + bonus_otd + bonus_rpa + bonus_other + remote_allowance
Net = Gross  (sin descuentos)
```

### B8. Regla de recálculo

Cuando HR edita un bono o aplica un override via `PATCH /entries/[entryId]`:
- **El servidor recalcula automáticamente** `gross_total`, `chile_*` descuentos, y `net_total`
- Retorna el entry completo actualizado
- Si `manual_override = TRUE`, se usa el `net_total` del override y se ignora el cálculo operativo para pago, pero se guarda el cálculo como referencia en `net_total_calculated` y el valor aprobado manualmente en `net_total_override`
- Si `manual_override = FALSE`, `net_total = net_total_calculated` y `net_total_override = NULL`

---

## PARTE C: API Routes

Todas bajo `/api/hr/payroll/`. Requieren route group `hr` o roleCode `efeonce_admin`.

**Patrón de auth en cada route:**

```typescript
// Verificar contra el patrón real en authorization.ts del repo
const session = await getServerSession(authOptions)
if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

const { routeGroups, roleCodes } = session.user
if (!routeGroups.includes('hr') && !roleCodes.includes('efeonce_admin')) {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

### C1. `GET /api/hr/payroll/compensation`

Lista de compensaciones vigentes (`is_current = TRUE`) de todos los miembros activos.

### C2. `POST /api/hr/payroll/compensation`

Crear nueva versión de compensación para un miembro. **NO es update — es INSERT de nueva versión.** La versión anterior se cierra automáticamente.

### C3. `GET /api/hr/payroll/periods`

Lista de períodos con estado.

### C4. `POST /api/hr/payroll/periods`

Crear período. Body: `{ year, month, ufValue? }`. HR puede ingresar UF al crear o después.

### C5. `PATCH /api/hr/payroll/periods/[periodId]`

Actualizar metadata del período (UF, notas, tax_table_version).

### C6. `POST /api/hr/payroll/periods/[periodId]/calculate`

Ejecutar cálculo de nómina.

**Lógica:**
1. Leer `team_members` activos
2. Para cada uno, obtener la `compensation_version` aplicable al período (`effective_from/effective_to` contra el mes calculado), NO simplemente `is_current = TRUE`
3. Consultar KPIs del mes desde `notion_ops.tareas` usando match de identidad canónico
4. Evaluar umbrales, pre-llenar bonos con min
5. Calcular bruto, descuentos (si Chile), neto
6. **UPSERT** `payroll_entries` (idempotente — si ya existe entry para este period+member, la actualiza)
7. Guardar `compensation_version_id` en cada entry
8. Guardar todos los parámetros normativos como snapshot en la entry
9. Actualizar `payroll_periods.status = 'calculated'`

### C7. `GET /api/hr/payroll/periods/[periodId]/entries`

Entries del período con desglose.

### C8. `PATCH /api/hr/payroll/entries/[entryId]`

HR ajusta bonos o aplica override.

**Campos editables:** `bonus_otd_amount`, `bonus_rpa_amount`, `bonus_other_amount`, `bonus_other_description`, `chile_tax_amount` (impuesto manual), `manual_override`, `manual_override_note`, `net_total` (solo si manual_override = TRUE).

**Campos KPI manuales editables cuando no hubo match automático:** `kpi_otd_percent`, `kpi_rpa_avg`, `kpi_tasks_completed`, `kpi_data_source`.

**Regla KPI manual:** solo se aceptan si la entry está marcada como `kpi_data_source = 'manual'` o si HR fuerza explícitamente el fallback manual por falta de match. Si se editan estos campos, el servidor debe re-evaluar `kpi_otd_qualifies` y `kpi_rpa_qualifies` antes de validar bonos.

**Regla:** Al recibir el PATCH, el servidor:
1. Valida bonos dentro de rangos permitidos
2. Si entran KPIs manuales, actualiza `kpi_*`, recalcula umbrales y vuelve a validar elegibilidad de bonos
3. **Recalcula** `gross_total`, todos los descuentos Chile, y `net_total`
4. Si `manual_override = TRUE`, guarda `net_total` del request como override
5. Retorna entry completa actualizada

### C9. `POST /api/hr/payroll/periods/[periodId]/approve`

Aprobar nómina. Cambia status, bloquea edición.

### C10. `GET /api/hr/payroll/periods/[periodId]/export`

Exportar como CSV/XLSX.

### C11. `GET /api/hr/payroll/members/[memberId]/history`

Historial de nóminas de un miembro (entries de períodos aprobados).

---

## PARTE D: Vistas UI

### D1. `/hr/payroll` — Panel principal

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Nómina" + subtítulo + botón "Nuevo período"        │
├─────────────────────────────────────────────────────────────┤
│  Stats: [Período actual] [Colaboradores] [Costo bruto] [Estado]│
├─────────────────────────────────────────────────────────────┤
│  Tabs: [Período actual] [Compensaciones] [Historial]         │
└─────────────────────────────────────────────────────────────┘
```

### D2. Tab: Período actual

Tabla con fila por persona. Si `status = calculated`:

| Columna | Dato |
|---------|------|
| Nombre | Avatar + nombre + badge régimen (CLP/USD) |
| Salario base | Formateado con moneda |
| OTD% | Porcentaje + semáforo (≥89 verde, <89 gris) + badge si califica |
| Bono OTD | **Input editable** con slider [min-max]. Disabled + $0 si no califica. |
| RpA | Número + semáforo (<2 verde, ≥2 gris) + badge si califica |
| Bono RpA | **Input editable** con slider [min-max]. Disabled + $0 si no califica. |
| Teletrabajo | Monto |
| Bruto | Calculado automático |
| Descuentos | Solo Chile. Click expande desglose. |
| **Neto** | Número destacado |

**Desglose expandido Chile:**

```
Renta imponible:             $1.200.000
  AFP Habitat (11.44%):      - $137.280
  Fonasa (7%):               - $84.000
  Seg. cesantía (0.6%):      - $7.200
  Impuesto único:            - $0  [editable por HR]
  ─────────────────────────────────────
  Total descuentos:          - $228.480
  Asig. teletrabajo:         + $30.000
  ═══════════════════════════════════════
  Neto a pagar:              $1.001.520
```

**KPIs sin match automático:** Si para una persona no se encontraron KPIs en `notion_ops`, mostrar badge "KPI manual" y campos editables para que HR ingrese OTD% y RpA manualmente.

**Persistencia:** esos KPI manuales se guardan en la `payroll_entry` del período (`kpi_*` + `kpi_data_source = 'manual'`), no solo en estado local de UI.

### D3. Tab: Compensaciones

Tabla con configuración vigente. Drawer de edición al hacer click.

**Drawer de compensación — secciones:**
1. Salario y moneda (régimen, moneda, salario base)
2. Bonos variables (rangos OTD min/max, RpA min/max)
3. Asignación teletrabajo
4. Previsión Chile (solo visible si `pay_regime = 'chile'`): AFP, salud, tipo contrato, cesantía, APV
5. Motivo del cambio (texto libre, obligatorio)

**Al guardar:** Se crea nueva `compensation_version`, la anterior se cierra. Se muestra historial de versiones en el drawer.

### D4. Tab: Historial

Períodos cerrados con totales y acciones (ver desglose, exportar).

### D5. `/hr/payroll/member/[memberId]` — Historial de un colaborador

Line chart de evolución del neto. Tabla mes a mes. Historial de versiones de compensación.

---

## PARTE E: Tipos TypeScript

```typescript
// src/types/payroll.ts

export type PayRegime = 'chile' | 'international'
export type PayrollCurrency = 'CLP' | 'USD'
export type PeriodStatus = 'draft' | 'calculated' | 'approved' | 'exported'
export type HealthSystem = 'fonasa' | 'isapre'
export type ContractType = 'indefinido' | 'plazo_fijo'

export interface CompensationVersion {
  versionId: string
  memberId: string
  version: number
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
  unemploymentRate: number
  contractType: ContractType
  hasApv: boolean
  apvAmount: number
  // Vigencia
  effectiveFrom: string
  effectiveTo: string | null
  isCurrent: boolean
  changeReason: string | null
  createdBy: string | null
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
  ufValue: number | null
  taxTableVersion: string | null
  notes: string | null
}

export interface PayrollEntry {
  entryId: string
  periodId: string
  memberId: string
  memberName: string
  compensationVersionId: string
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
  kpiTasksCompleted: number | null
  kpiDataSource: 'notion_ops' | 'manual'
  // Bonos
  bonusOtdAmount: number
  bonusRpaAmount: number
  bonusOtherAmount: number
  bonusOtherDescription: string | null
  // Bruto
  grossTotal: number
  // Chile snapshot
  chileAfpName: string | null
  chileAfpRate: number | null
  chileAfpAmount: number | null
  chileHealthSystem: string | null
  chileHealthAmount: number | null
  chileUnemploymentRate: number | null
  chileUnemploymentAmount: number | null
  chileTaxableBase: number | null
  chileTaxAmount: number | null
  chileApvAmount: number | null
  chileUfValue: number | null
  chileTotalDeductions: number | null
  // Neto
  netTotalCalculated: number | null
  netTotalOverride: number | null
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
│   │   └── hr/
│   │       ├── layout.tsx                                # Guard: routeGroup 'hr' || roleCode 'efeonce_admin'
│   │       └── payroll/
│   │           ├── page.tsx                              # D1: Panel principal
│   │           └── member/
│   │               └── [memberId]/
│   │                   └── page.tsx                      # D5: Historial persona
│   └── api/
│       └── hr/
│           └── payroll/
│               ├── compensation/
│               │   └── route.ts                          # GET (vigentes) + POST (nueva versión)
│               ├── periods/
│               │   ├── route.ts                          # GET + POST
│               │   └── [periodId]/
│               │       ├── route.ts                      # GET + PATCH
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
│               │       └── route.ts                      # PATCH (recalcula automáticamente)
│               └── members/
│                   └── [memberId]/
│                       └── history/
│                           └── route.ts                  # GET
├── views/
│   └── greenhouse/
│       └── payroll/
│           ├── PayrollDashboard.tsx
│           ├── PayrollPeriodTab.tsx
│           ├── PayrollCompensationTab.tsx
│           ├── PayrollHistoryTab.tsx
│           ├── PayrollEntryTable.tsx
│           ├── PayrollEntryExpanded.tsx
│           ├── CompensationDrawer.tsx
│           ├── BonusInput.tsx                            # Input con slider de rango
│           ├── ChileDeductionBreakdown.tsx
│           └── MemberPayrollHistory.tsx
├── lib/
│   └── payroll/
│       ├── get-compensation.ts
│       ├── get-payroll-periods.ts
│       ├── get-payroll-entries.ts
│       ├── calculate-payroll.ts                          # Orquestador
│       ├── calculate-chile-deductions.ts                 # Cálculo descuentos Chile
│       ├── fetch-kpis-for-period.ts                      # Lee KPIs de notion_ops
│       ├── recalculate-entry.ts                          # Recálculo tras edición de bono
│       └── export-payroll.ts
└── types/
    └── payroll.ts
```

---

## PARTE G: Navegación

### Sidebar

Nueva sección "HR" visible solo para route group `hr` o `efeonce_admin`:

```typescript
// En src/data/navigation/
{
  sectionTitle: 'HR',
  // Solo visible si routeGroups.includes('hr') || roleCodes.includes('efeonce_admin')
  items: [
    {
      title: 'Nómina',
      icon: 'tabler-receipt-2',
      path: '/hr/payroll',
    }
  ]
}
```

---

## PARTE H: Orden de ejecución

### Fase 1: Descubrimiento (ANTES de escribir código)

1. Ejecutar query de descubrimiento del schema de `notion_ops.tareas`
2. Leer `project_context.md` para estrategia de identidad
3. Leer `authorization.ts` para entender route groups y guards
4. Leer `team-queries.ts` para reutilizar lógica de match de persona
5. Documentar hallazgos en un comentario al inicio de `src/lib/payroll/fetch-kpis-for-period.ts`

### Fase 2: Infraestructura

6. Crear role `hr_payroll` en `greenhouse.roles`
7. Extender `TenantRouteGroup`, guards y redirect post-login para soportar `hr`
8. Crear tablas BigQuery (A1, A2, A3, A4)
9. Crear sublayout `/hr/layout.tsx` con guard
10. Crear types TypeScript

### Fase 3: APIs core

11. `GET/POST /api/hr/payroll/compensation`
12. `GET/POST /api/hr/payroll/periods`
13. `POST .../calculate` (con lógica de match de KPIs real y selección de compensación por vigencia del período)
14. `GET .../entries`
15. `PATCH /api/hr/payroll/entries/[entryId]` (con recálculo automático y persistencia KPI manual)

### Fase 4: Flujo completo

16. `POST .../approve`
17. `GET .../export`
18. `GET .../members/[memberId]/history`

### Fase 5: UI

19-27. Componentes y vistas (ver Parte F)

---

## Criterios de aceptación

### Arquitectura

- [ ] Route group `hr` existe con su propio sublayout y guard
- [ ] `TenantRouteGroup` y helpers reutilizables del repo aceptan `hr`
- [ ] HR Business Partner accede a `/hr/payroll` sin ver secciones admin
- [ ] Admin con `efeonce_admin` accede a `/hr/payroll` también
- [ ] Un `client` recibe 403 al intentar acceder
- [ ] Usuarios `hr_payroll` aterrizan en `/hr/payroll` tras login o tienen redirect equivalente explícito

### Compensación versionada

- [ ] Cada cambio de compensación crea nueva versión (no update in-place)
- [ ] La versión anterior se cierra con `effective_to` y `is_current = FALSE`
- [ ] El drawer muestra historial de versiones de la persona
- [ ] El cálculo de un período toma la versión vigente para ese mes, no la versión “current” del día de ejecución

### Cálculo

- [ ] KPIs se leen de `notion_ops.tareas` usando el match de identidad canónico del repo
- [ ] Si no hay match, la entry se marca como `kpi_data_source = 'manual'` y HR ingresa KPIs
- [ ] Los KPI manuales se persisten server-side en `payroll_entries`
- [ ] Bonos se pre-llenan con min del rango si califica, $0 si no
- [ ] HR no puede asignar bono si el umbral no se cumple (validación server-side)
- [ ] Cada entry guarda `compensation_version_id` y todos los parámetros normativos como snapshot
- [ ] Al editar un bono via PATCH, el servidor recalcula gross, descuentos y neto automáticamente

### Chile

- [ ] AFP, Fonasa/Isapre, seguro cesantía se calculan correctamente
- [ ] Seguro cesantía usa 0.6% si indefinido, 3% si plazo fijo
- [ ] Impuesto único: HR lo ingresa manualmente (MVP)
- [ ] UF del período se guarda en `payroll_periods` y en cada entry Chile
- [ ] Asignación teletrabajo NO es imponible

### Auditabilidad

- [ ] Cualquier nómina aprobada se puede reproducir: la entry tiene todos los parámetros usados
- [ ] Si la compensación cambia en abril, recalcular marzo usa la versión de marzo (via `compensation_version_id`)
- [ ] Si hubo override manual, la entry conserva `net_total_calculated`, `net_total_override` y la justificación
- [ ] Export CSV/XLSX incluye desglose completo

---

## Lo que NO incluye esta tarea

- Integración con Nubox — preparado a nivel de export
- Cálculo automático de impuesto único con tramos SII — HR lo ingresa manualmente
- Consulta automática de valor UF — HR lo ingresa al crear período
- Boletas de honorarios / facturación de contractors
- Time tracking
- Notificaciones a colaboradores
- Multi-periodo simultáneo

---

## Notas para el agente

- **Fase de descubrimiento es OBLIGATORIA.** No escribas queries contra `notion_ops.tareas` sin primero verificar el schema real. Los campos pueden llamarse diferente a lo que este doc asume.
- **Reutiliza el match de identidad del repo.** No reimplementes match por texto libre. Busca en `team-queries.ts` cómo se hace el JOIN entre `team_members` y `notion_ops.tareas`.
- **Route group `hr` es separado de `admin`.** Lee `authorization.ts` y `GREENHOUSE_IDENTITY_ACCESS_V1.md` para entender cómo crear un route group nuevo sin romper el existente.
- **Las mutations de BigQuery no son atómicas.** El cálculo de nómina debe ser idempotente (UPSERT, no INSERT ciego).
- **Recálculo tras edición es crítico.** Si HR cambia un bono, el neto DEBE recalcularse. No confiar en que el frontend envíe los totales correctos.
- **Formateo de moneda:** CLP usa `$1.200.000` (Intl.NumberFormat con locale `es-CL`, sin decimales). USD usa `$3,500.00` (locale `en-US`, 2 decimales).
- **Branch naming:** `feature/hr-payroll`.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo. Referencia normativa para implementación.*
