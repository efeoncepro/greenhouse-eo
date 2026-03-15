# CODEX TASK — HR Core: Gestión de Personas, Permisos, Asistencia y Estructura Organizacional

> Brief histórico de descubrimiento. La task operativa vigente es `docs/tasks/in-progress/CODEX_TASK_HR_Core_Module_v2.md`.

## Resumen

Implementar el **módulo HR Core** (HRIS) en el portal Greenhouse. Cubre la gestión del ciclo de vida laboral que hoy no existe: solicitudes de permiso con flujo de aprobación de tres niveles, registro de asistencia adaptado a equipo remoto (participación en dailies vía webhook de Teams), estructura organizacional con departamentos y jerarquías de reporte, y un engine de aprobaciones trazable.

**El problema hoy:** Greenhouse tiene identidad de equipo (`team_members`), asignaciones operativas (`client_team_assignments`), y nómina (`payroll`). Pero no tiene:
- Dónde un colaborador solicita vacaciones o un permiso
- Quién aprueba qué, basado en qué jerarquía
- Registro de asistencia (quién se conectó a la daily, quién faltó sin avisar)
- A qué departamento pertenece cada persona ni quién es su supervisor
- Saldo de días de permiso por tipo y por año
- Historial de ausencias para auditoría y nómina
- **Ficha completa del colaborador:** no hay dónde almacenar RUT/cédula, teléfono, datos bancarios (banco, número de cuenta), si es Fonasa o Isapre, currículum online, skills y herramientas que maneja, suites de IA que domina, ni métricas de performance históricas (throughput, RpA, OTD%)
- **Perfil profesional:** no hay registro de las competencias de cada persona, sus oportunidades de mejora, tipo de piezas que produce (si es diseñador), volumen promedio mensual, ni herramientas con las que trabaja

**La solución:** Un módulo bajo `/hr/` (mismo route group que payroll) con cinco subsistemas:

1. **Estructura organizacional** — departamentos, jerarquías de reporte, niveles de cargo. Extiende `team_members` con campos nuevos.
2. **Ficha del colaborador** — datos personales (identidad, contacto, bancarios, previsión), perfil profesional (skills, herramientas, IA, currículum), métricas históricas de performance. Nueva tabla `member_profiles` + extensión de `team_members`.
3. **Gestión de permisos** — catálogo de causales, saldos por persona/año, solicitudes con flujo colaborador → supervisor → HR, calendario de ausencias.
4. **Registro de asistencia** — ingesta automática vía webhook de Microsoft Teams/Calendar, registro diario por persona, dashboard de asistencia mensual.
5. **Engine de aprobaciones** — genérico pero usado inicialmente solo para permisos. Cada solicitud tiene estados, aprobadores derivados de la jerarquía, historial de acciones.

**Flujo de aprobación de permisos:**
```
Colaborador solicita → Supervisor directo aprueba/rechaza → HR valida/registra
```

El supervisor se determina automáticamente por el campo `reports_to` en `team_members`. Si `reports_to` es NULL (ej: Julio), la solicitud va directo a HR.

**Este módulo vive junto a Payroll en `/hr/` y comparte route group.** Los colaboradores necesitan un route group propio (`employee`) para acceder a "Mis permisos" y "Mi asistencia" — hoy solo existen `efeonce_admin`, `efeonce_operations`, y `hr` (para HR Business Partner).

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/hr-core`
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
| `project_context.md` (en el repo) | Schema real de tablas, campos disponibles, estrategia de identidad |
| `authorization.ts` (en el repo) | Sistema de autorización actual — verificar cómo se validan route groups |
| `team-queries.ts` (en el repo) | Queries existentes de equipo — reutilizar patrones |
| `src/types/team.ts` (en el repo) | Tipos existentes de equipo — extender |
| `CODEX_TASK_HR_Payroll_Module_v2.md` (proyecto Claude) | Route group `hr`, sublayout, guard — ya diseñado |
| `CODEX_TASK_Admin_Team_Module_v2.md` (proyecto Claude) | CRUD de team_members — las mutaciones de este task extienden ese schema |
| `CODEX_TASK_People_Unified_View.md` (proyecto Claude) | Vista `/people` — un tab nuevo "Ausencias" se integra aquí |
| `Greenhouse_Nomenclatura_Portal_v3.md` (proyecto Claude) | Design tokens, GH_COLORS, tipografía |

---

## Dependencias previas

### DEBE existir (verificar en el repo)

- [x] Auth con NextAuth.js funcionando con `client_users`, roles, scopes
- [x] Guard server-side para rutas protegidas
- [x] Tabla `greenhouse.team_members` creada y con seed data
- [x] Route group `hr` con sublayout y guard (definido en HR Payroll v2)
- [x] Patrones Vuexy de tablas, drawers, tabs disponibles en `full-version`

### Verificar antes de implementar

- [ ] **Route group `hr` ya implementado:** Si HR Payroll no se ha implementado aún, este task necesita crear el route group `hr` con su sublayout. Verificar si `/hr/layout.tsx` existe.
- [ ] **Schema actual de `team_members`:** Ejecutar `SELECT column_name, data_type FROM efeonce-group.greenhouse.INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'team_members'` para confirmar qué campos existen. Los campos nuevos (`department_id`, `reports_to`, `job_level`, `hire_date`, `employment_type`) probablemente NO existen y deben agregarse.
- [ ] **Route group `employee`:** Verificar si existe un route group para colaboradores internos (no clientes). Si no existe, crearlo.
- [ ] **Webhook endpoint pattern:** Verificar si el repo tiene API routes que reciban webhooks externos (para el webhook de Teams). Necesitan auth por bearer token o shared secret, no por sesión NextAuth.

---

## Modelo de acceso

### Tres niveles de acceso

| Rol | Route group | Accede a | Acciones |
|-----|-------------|----------|----------|
| **Colaborador** | `employee` | `/hr/my-leave`, `/hr/my-attendance` | Solicitar permisos, ver su propia asistencia y saldos |
| **Supervisor** | `employee` + flag `is_supervisor` | Lo anterior + `/hr/approvals` | Aprobar/rechazar solicitudes de sus reportes directos |
| **HR Business Partner** | `hr` | Todo `/hr/*` | Validar solicitudes aprobadas, gestionar catálogos, ver dashboard completo, override manual de asistencia |
| **Admin** | `efeonce_admin` | Todo `/hr/*` | Igual que HR + configuración de departamentos y jerarquías |

### Decisión: route group `employee`

Hoy los route groups existentes son para clientes (`client`), admin interno (`efeonce_admin`), operaciones (`efeonce_operations`), y HR (`hr`). Los colaboradores de Efeonce que no son admin ni HR no tienen acceso a ninguna sección interna del portal.

**Solución:** Crear route group `employee` que agrupa a todo colaborador interno de Efeonce. Todo miembro del equipo con email `@efeonce.org` o `@efeoncepro.com` recibe este route group automáticamente al autenticarse via SSO.

**Implementación:**
1. Crear role `employee` en `greenhouse.roles` con `route_groups: ['employee']`
2. Verificar en el flujo de SSO si se puede asignar automáticamente basado en dominio de email
3. El sublayout de `/hr/my-leave` y `/hr/my-attendance` valida `routeGroups.includes('employee') || routeGroups.includes('hr') || roleCodes.includes('efeonce_admin')`
4. El sublayout de `/hr/approvals` valida adicionalmente que el usuario tenga reportes directos (query a `team_members WHERE reports_to = current_member_id`)

---

## PARTE A: Extensiones a `team_members`

### A1. Columnas nuevas en `greenhouse.team_members`

Agregar vía `ALTER TABLE` (no recrear la tabla):

```sql
-- Estructura organizacional
ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS department_id STRING;               -- FK → greenhouse.departments

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS reports_to STRING;                   -- FK → team_members.member_id (supervisor directo)

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS job_level STRING;                    -- 'junior' | 'semi_senior' | 'senior' | 'lead' | 'manager' | 'director'

-- Datos laborales
ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS hire_date DATE;                      -- Fecha de ingreso

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS contract_end_date DATE;              -- Fecha de término (NULL = indefinido)

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS employment_type STRING DEFAULT 'full_time';  -- 'full_time' | 'part_time' | 'contractor'

-- Datos personales y de contacto
ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS identity_document_type STRING;       -- 'rut' | 'cedula' | 'pasaporte' | 'dni'

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS identity_document_number STRING;     -- Número de RUT/cédula/pasaporte (encriptado en tránsito)

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS phone STRING;                        -- Teléfono principal con código país: '+56912345678'

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS emergency_contact_name STRING;       -- Nombre del contacto de emergencia

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS emergency_contact_phone STRING;      -- Teléfono del contacto de emergencia

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS date_of_birth DATE;                  -- Fecha de nacimiento (para cálculos legales Chile)

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS nationality STRING;                  -- Nacionalidad ISO alpha-2: 'CL', 'VE', 'CO'

-- Datos bancarios (para pago de nómina)
ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS bank_name STRING;                    -- 'Banco Estado', 'Banco de Chile', 'Santander', 'BCI', etc.

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS bank_account_type STRING;            -- 'corriente' | 'vista' | 'ahorro' | 'rut'

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS bank_account_number STRING;          -- Número de cuenta (dato sensible)

-- Previsión (complementa compensation_versions pero vive aquí porque es dato de la persona, no de la versión de pago)
ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS health_system STRING;                -- 'fonasa' | 'isapre' | 'none' (international)

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS isapre_name STRING;                  -- Nombre de la Isapre (si aplica): 'Colmena', 'Cruz Blanca', 'Banmédica', etc.

-- Perfil profesional
ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS cv_url STRING;                       -- Link al CV online (Google Drive, LinkedIn PDF, etc.)

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS linkedin_url STRING;                 -- Perfil de LinkedIn

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS portfolio_url STRING;                -- Portafolio (Behance, Dribbble, sitio personal)

-- Asistencia
ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS daily_required BOOL DEFAULT TRUE;    -- ¿Se espera que asista a la daily?

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS timezone STRING DEFAULT 'America/Santiago';  -- Zona horaria del colaborador
```

**Nota sobre datos sensibles:** Los campos `identity_document_number` y `bank_account_number` son datos sensibles. En la API, estos campos:
- Solo se retornan a usuarios con route group `hr` o `efeonce_admin`
- En las vistas del colaborador, se muestran enmascarados (`****5678`)
- En BigQuery no hay encriptación at-rest más allá de la que GCP provee por defecto, pero el acceso está restringido al service account del portal

### A2. Seed data para campos nuevos

```sql
UPDATE `efeonce-group.greenhouse.team_members`
SET
  department_id = 'globe-operations',
  reports_to = 'julio-reyes',
  job_level = 'lead',
  hire_date = '2024-03-01',
  employment_type = 'full_time',
  phone = '+57300XXXXXXX',
  identity_document_type = 'cedula',
  health_system = 'none',  -- Internacional
  daily_required = TRUE,
  timezone = 'America/Bogota'
WHERE member_id = 'daniela-ferreira';

-- Repetir para cada miembro con sus datos reales.
-- Julio no tiene reports_to (NULL) — sus solicitudes van directo a HR.
-- Datos bancarios y de identidad los ingresa HR desde el UI.
```

---

## PARTE B: Infraestructura BigQuery — Tablas nuevas

### B1. Tabla `greenhouse.departments`

Catálogo de departamentos con jerarquía anidable (un departamento puede tener un padre).

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.departments` (
  department_id STRING NOT NULL,                  -- PK slug: 'globe-operations', 'efeonce-digital', 'reach'
  name STRING NOT NULL,                           -- Nombre visible: 'Globe Operations'
  description STRING,                             -- Descripción breve
  parent_department_id STRING,                    -- FK → departments.department_id (NULL = nivel raíz)
  head_member_id STRING,                          -- FK → team_members.member_id (jefe del departamento)
  business_unit STRING NOT NULL,                  -- 'globe' | 'efeonce_digital' | 'reach' | 'wave' | 'shared'
  active BOOL DEFAULT TRUE,
  sort_order INT64 DEFAULT 0,                     -- Para orden visual en UI
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

**Seed data:**

```sql
INSERT INTO `efeonce-group.greenhouse.departments`
  (department_id, name, description, parent_department_id, head_member_id, business_unit, sort_order)
VALUES
  ('globe', 'Globe', 'Unidad de producción creativa', NULL, NULL, 'globe', 1),
  ('globe-operations', 'Globe Operations', 'Operaciones y gestión de producción', 'globe', 'daniela-ferreira', 'globe', 2),
  ('globe-design', 'Globe Design', 'Diseño visual y creativo', 'globe', NULL, 'globe', 3),
  ('efeonce-digital', 'Efeonce Digital', 'CRM, MarTech y automatización', NULL, NULL, 'efeonce_digital', 4),
  ('reach', 'Reach', 'Medios y distribución', NULL, NULL, 'reach', 5),
  ('wave', 'Wave', 'Producción audiovisual', NULL, NULL, 'wave', 6),
  ('shared-services', 'Shared Services', 'Administración, finanzas, HR', NULL, NULL, 'shared', 7);
```

### B2. Tabla `greenhouse.member_profiles`

Perfil profesional del colaborador. Datos que no pertenecen a `team_members` (identidad operativa) ni a `compensation_versions` (datos de pago), sino al perfil profesional: habilidades, herramientas, tipo de output, currículum, y evaluación cualitativa.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.member_profiles` (
  member_id STRING NOT NULL,                      -- PK + FK → team_members

  -- Perfil profesional
  bio STRING,                                     -- Descripción breve del perfil profesional (2-3 oraciones)
  years_of_experience INT64,                      -- Años de experiencia total en la industria

  -- Skills y competencias (JSON arrays almacenados como STRING)
  skills_highlighted STRING,                      -- JSON array de skills destacadas: '["Branding", "Motion Graphics", "Packaging"]'
  skills_improvement_areas STRING,                -- JSON array de oportunidades de mejora: '["Ilustración vectorial", "UX Writing"]'

  -- Herramientas que maneja (JSON arrays)
  tools_design STRING,                            -- '["Figma", "Photoshop", "Illustrator", "After Effects", "Premiere"]'
  tools_development STRING,                       -- '["VS Code", "Git", "Node.js", "Python"]'
  tools_project STRING,                           -- '["Notion", "Frame.io", "Jira", "Asana"]'
  tools_marketing STRING,                         -- '["HubSpot", "Google Analytics", "Meta Ads Manager", "Google Ads"]'
  tools_ai_suites STRING,                         -- '["ChatGPT", "Midjourney", "Claude", "Runway", "Firefly", "Copilot", "DALL-E", "Stable Diffusion"]'

  -- Output y especialización (para diseñadores y creativos)
  output_type STRING,                             -- Tipo principal: 'design' | 'content' | 'media' | 'development' | 'strategy' | 'operations'
  piece_types STRING,                             -- JSON array de tipos de piezas que produce:
                                                  -- Diseñadores: '["Social media", "Key Visual", "Packaging", "Editorial", "Motion"]'
                                                  -- Content: '["Blog posts", "Email campaigns", "Social copy", "Guiones"]'
                                                  -- Dev: '["Frontend", "Backend", "Cloud Functions", "Integrations"]'

  avg_monthly_pieces FLOAT64,                     -- Promedio de piezas/entregables por mes (últimos 3 meses rolling)
  avg_monthly_throughput FLOAT64,                 -- Throughput promedio: tareas completadas por mes

  -- Métricas de performance históricas (snapshots calculados, no inputs manuales)
  current_rpa_avg FLOAT64,                        -- RpA promedio actual (rolling 3 meses)
  current_otd_percent FLOAT64,                    -- OTD% actual (rolling 3 meses)
  historical_rpa_avg FLOAT64,                     -- RpA promedio histórico (desde hire_date)
  historical_otd_percent FLOAT64,                 -- OTD% histórico (desde hire_date)
  rpa_trend STRING,                               -- 'improving' | 'stable' | 'declining' (comparación rolling 3m vs 6m)
  otd_trend STRING,                               -- 'improving' | 'stable' | 'declining'

  -- Última evaluación
  last_review_date DATE,                          -- Fecha de la última revisión de perfil/evaluación
  last_review_notes STRING,                       -- Notas de la última evaluación
  reviewed_by STRING,                             -- member_id de quien hizo la revisión

  -- Metadata
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING                               -- Email de quien actualizó el perfil por última vez
);
```

**Reglas de negocio:**

- Los campos de skills, herramientas y tipos de pieza son JSON arrays almacenados como STRING. BigQuery no tiene tipo ARRAY nativo en todos los contextos, y STRING permite flexibilidad. Se parsean en la API y se presentan como tags/chips en el UI.
- `avg_monthly_pieces` y `avg_monthly_throughput` se recalculan automáticamente al cierre de cada mes leyendo `notion_ops.tareas` (mismo patrón que payroll usa para KPIs).
- `current_rpa_avg`, `current_otd_percent` y sus históricos se actualizan vía un scheduled job o al abrir la ficha del perfil. NO son inputs manuales — son outputs calculados.
- `skills_highlighted` y `skills_improvement_areas` sí son inputs manuales de HR o del propio colaborador.
- `tools_ai_suites` es una categoría separada de herramientas porque para Efeonce es un diferenciador clave y se quiere trackear específicamente qué suites de IA domina cada persona.

### B3. Tabla `greenhouse.member_performance_snapshots`

Snapshot mensual de métricas por persona. Permite graficar evolución temporal de RpA, OTD%, throughput. Un job mensual crea una fila por persona.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.member_performance_snapshots` (
  snapshot_id STRING NOT NULL,                    -- PK: '{member_id}_{year}_{month}'
  member_id STRING NOT NULL,                      -- FK → team_members
  year INT64 NOT NULL,
  month INT64 NOT NULL,

  -- Métricas del mes
  tasks_completed INT64 DEFAULT 0,                -- Tareas con estado 'Listo' en el mes
  tasks_in_progress INT64 DEFAULT 0,              -- Tareas activas al cierre del mes
  rpa_avg FLOAT64,                                -- RpA promedio del mes
  otd_percent FLOAT64,                            -- OTD% del mes (si hay data de deadlines)
  pieces_delivered INT64 DEFAULT 0,               -- Piezas/assets entregados (para diseñadores)
  avg_cycle_time_hours FLOAT64,                   -- Tiempo promedio de ciclo por tarea (horas)

  -- Distribución por tipo de pieza (JSON, solo para diseñadores/creativos)
  pieces_by_type STRING,                          -- '{"Social media": 25, "Key Visual": 3, "Motion": 2}'

  -- Distribución por proyecto/cliente
  tasks_by_project STRING,                        -- '{"sky-airline": 15, "entel": 8, "internal": 3}'

  -- Fuente
  data_source STRING DEFAULT 'notion_ops',        -- 'notion_ops' | 'manual'
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

**Cálculo:** Un Cloud Scheduler job (o endpoint invocado manualmente por HR) al cierre de cada mes:
1. Lee `notion_ops.tareas` filtrando por el mes, cruza con `team_members` por identidad canónica (mismo patrón que payroll)
2. Calcula RpA, OTD% (si hay deadlines), tasks completed, cycle time
3. Inserta un snapshot por persona
4. Actualiza `member_profiles.current_rpa_avg`, `current_otd_percent`, `avg_monthly_throughput`, `avg_monthly_pieces` con rolling 3 meses
5. Calcula trends comparando rolling 3m vs rolling 6m

### B4. Tabla `greenhouse.leave_types`

Catálogo de causales de permiso con reglas de negocio.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.leave_types` (
  leave_type_id STRING NOT NULL,                  -- PK slug: 'vacaciones', 'licencia-medica'
  name STRING NOT NULL,                           -- 'Vacaciones'
  description STRING,                             -- Descripción para el colaborador
  category STRING NOT NULL,                       -- 'paid' | 'unpaid' | 'legal' | 'special'

  -- Reglas
  requires_approval BOOL DEFAULT TRUE,            -- ¿Necesita aprobación del supervisor?
  requires_hr_validation BOOL DEFAULT TRUE,       -- ¿Necesita validación final de HR?
  requires_documentation BOOL DEFAULT FALSE,      -- ¿Requiere adjuntar documento? (ej: licencia médica)
  max_days_per_year INT64,                        -- Tope anual (NULL = sin tope)
  min_days_advance INT64 DEFAULT 0,               -- Días mínimos de anticipación para solicitar
  allows_half_day BOOL DEFAULT FALSE,             -- ¿Permite solicitar medio día?
  counts_as_absence BOOL DEFAULT TRUE,            -- ¿Cuenta como ausencia en el registro?
  deducts_from_balance BOOL DEFAULT TRUE,         -- ¿Descuenta del saldo? (licencia médica no descuenta de vacaciones)

  -- Aplicabilidad
  applicable_regimes STRING DEFAULT 'both',       -- 'chile' | 'international' | 'both'
  applicable_employment_types STRING DEFAULT 'full_time,part_time',  -- CSV de employment_type aplicables

  -- UI
  color STRING,                                   -- Hex para mostrar en calendario (ej: '#0375db')
  icon STRING,                                    -- Icono tabler (ej: 'tabler-beach')
  sort_order INT64 DEFAULT 0,

  active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

**Seed data — causales chilenas + internacionales:**

```sql
INSERT INTO `efeonce-group.greenhouse.leave_types`
  (leave_type_id, name, description, category, requires_approval, requires_hr_validation, requires_documentation, max_days_per_year, min_days_advance, allows_half_day, counts_as_absence, deducts_from_balance, applicable_regimes, color, icon, sort_order)
VALUES
  -- Vacaciones
  ('vacaciones', 'Vacaciones', 'Días de descanso anuales según contrato', 'paid', TRUE, TRUE, FALSE, 15, 5, FALSE, TRUE, TRUE, 'both', '#0375db', 'tabler-beach', 1),

  -- Licencia médica
  ('licencia-medica', 'Licencia médica', 'Ausencia por enfermedad con certificado médico', 'legal', FALSE, TRUE, TRUE, NULL, 0, FALSE, TRUE, FALSE, 'chile', '#bb1954', 'tabler-stethoscope', 2),

  -- Permiso administrativo
  ('permiso-administrativo', 'Permiso administrativo', 'Trámites personales que requieren ausentarse', 'paid', TRUE, TRUE, FALSE, 6, 2, TRUE, TRUE, TRUE, 'both', '#633f93', 'tabler-file-text', 3),

  -- Día personal
  ('dia-personal', 'Día personal', 'Día libre sin necesidad de justificar motivo', 'paid', TRUE, TRUE, FALSE, 3, 1, FALSE, TRUE, TRUE, 'both', '#ff6500', 'tabler-user', 4),

  -- Duelo
  ('duelo', 'Permiso por duelo', 'Fallecimiento de familiar directo (cónyuge, hijo, padre)', 'legal', FALSE, TRUE, TRUE, NULL, 0, FALSE, TRUE, FALSE, 'chile', '#022a4e', 'tabler-heart-broken', 5),

  -- Maternidad
  ('maternidad', 'Permiso postnatal', 'Descanso de maternidad según ley chilena', 'legal', FALSE, TRUE, TRUE, NULL, 0, FALSE, TRUE, FALSE, 'chile', '#6ec207', 'tabler-baby-carriage', 6),

  -- Paternidad
  ('paternidad', 'Permiso de paternidad', 'Descanso de paternidad (5 días según ley chilena)', 'legal', FALSE, TRUE, TRUE, 5, 0, FALSE, TRUE, FALSE, 'chile', '#6ec207', 'tabler-baby-carriage', 7),

  -- Matrimonio
  ('matrimonio', 'Permiso por matrimonio', 'Días legales por matrimonio del colaborador', 'legal', TRUE, TRUE, TRUE, 5, 15, FALSE, TRUE, FALSE, 'chile', '#6ec207', 'tabler-heart', 8),

  -- Sin goce de sueldo
  ('sin-goce', 'Permiso sin goce de sueldo', 'Ausencia no remunerada acordada con la empresa', 'unpaid', TRUE, TRUE, FALSE, NULL, 5, FALSE, TRUE, FALSE, 'both', '#848484', 'tabler-clock-pause', 9),

  -- Trabajo remoto desde otra ubicación (no es ausencia, pero se registra)
  ('remote-location', 'Trabajo remoto - otra ubicación', 'Trabajar desde una ubicación diferente a la habitual', 'special', TRUE, FALSE, FALSE, NULL, 1, FALSE, FALSE, FALSE, 'both', '#024c8f', 'tabler-map-pin', 10);
```

### B5. Tabla `greenhouse.leave_balances`

Saldo de días por persona, por tipo de permiso, por año. Se inicializa al comenzar el año o al ingresar un colaborador.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.leave_balances` (
  balance_id STRING NOT NULL,                     -- PK: '{member_id}_{leave_type_id}_{year}'
  member_id STRING NOT NULL,                      -- FK → team_members
  leave_type_id STRING NOT NULL,                  -- FK → leave_types
  year INT64 NOT NULL,                            -- Año calendario

  entitled_days FLOAT64 NOT NULL DEFAULT 0,       -- Días asignados (ej: 15 vacaciones)
  used_days FLOAT64 NOT NULL DEFAULT 0,           -- Días ya usados (aprobados y consumidos)
  pending_days FLOAT64 NOT NULL DEFAULT 0,        -- Días en solicitudes pendientes de aprobación
  carried_over_days FLOAT64 NOT NULL DEFAULT 0,   -- Días transferidos del año anterior

  -- Calculado: remaining = entitled + carried_over - used - pending
  -- NO se almacena, se calcula en query/API

  notes STRING,                                   -- "Ajuste por ingreso tardío", "Carry-over Q4 2025"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

**Regla de negocio:** `remaining_days = entitled_days + carried_over_days - used_days - pending_days`. Se calcula en la API, no se almacena. Cuando una solicitud se aprueba, `pending_days` baja y `used_days` sube. Cuando se rechaza, `pending_days` baja.

### B6. Tabla `greenhouse.leave_requests`

Cada solicitud de permiso con su ciclo de vida completo.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.leave_requests` (
  request_id STRING NOT NULL,                     -- PK: UUID o '{member_id}_{timestamp}'
  member_id STRING NOT NULL,                      -- FK → team_members (quien solicita)
  leave_type_id STRING NOT NULL,                  -- FK → leave_types

  -- Período
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  business_days FLOAT64 NOT NULL,                 -- Días hábiles (excluye fines de semana y feriados)
  is_half_day BOOL DEFAULT FALSE,                 -- Si aplica medio día
  half_day_period STRING,                         -- 'morning' | 'afternoon' (si is_half_day = TRUE)

  -- Estado del flujo
  status STRING NOT NULL DEFAULT 'pending_supervisor',
  -- Estados posibles:
  --   'pending_supervisor'  → Esperando aprobación del supervisor
  --   'pending_hr'          → Supervisor aprobó, esperando validación HR
  --   'approved'            → HR validó, permiso aprobado
  --   'rejected_supervisor' → Supervisor rechazó
  --   'rejected_hr'         → HR rechazó
  --   'cancelled'           → Colaborador canceló antes de aprobación
  --   'revoked'             → HR revocó después de aprobación (caso excepcional)

  -- Motivo y documentación
  reason STRING,                                  -- Motivo libre del colaborador
  rejection_reason STRING,                        -- Motivo de rechazo (si aplica)
  documentation_url STRING,                       -- Link a documento adjunto (ej: licencia médica en Drive)

  -- Aprobación — supervisor
  supervisor_member_id STRING,                    -- FK → team_members (derivado de reports_to al momento de la solicitud)
  supervisor_action_at TIMESTAMP,
  supervisor_notes STRING,

  -- Validación — HR
  hr_validator_member_id STRING,                  -- FK → team_members (HR que validó)
  hr_action_at TIMESTAMP,
  hr_notes STRING,

  -- Metadata
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

**Flujo de estados:**

```
[Colaborador solicita]
  → pending_supervisor
    → [Supervisor aprueba] → pending_hr
      → [HR valida] → approved ✓
      → [HR rechaza] → rejected_hr ✗
    → [Supervisor rechaza] → rejected_supervisor ✗
  → [Colaborador cancela] → cancelled ✗

[Excepción: leave_type.requires_approval = FALSE]
  → pending_hr (salta supervisor)
    → [HR valida] → approved ✓

[Excepción: reports_to = NULL]
  → pending_hr (no hay supervisor, va directo a HR)

[Post-aprobación]
  → [HR revoca] → revoked (caso excepcional, con motivo obligatorio)
```

### B7. Tabla `greenhouse.approval_actions`

Historial inmutable de cada acción en el flujo de aprobación. Sirve para auditoría y trazabilidad.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.approval_actions` (
  action_id STRING NOT NULL,                      -- PK: UUID
  request_id STRING NOT NULL,                     -- FK → leave_requests
  action_type STRING NOT NULL,                    -- 'submitted' | 'supervisor_approved' | 'supervisor_rejected' | 'hr_approved' | 'hr_rejected' | 'cancelled' | 'revoked'
  actor_member_id STRING NOT NULL,                -- FK → team_members (quien ejecutó la acción)
  actor_role STRING NOT NULL,                     -- 'requester' | 'supervisor' | 'hr'
  notes STRING,
  acted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

**Regla:** Esta tabla es append-only. Nunca se actualiza ni se borra un registro. Cada acción sobre una solicitud genera una fila nueva.

### B8. Tabla `greenhouse.attendance_records`

Registro diario de asistencia por persona. Una fila por persona por día hábil.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.attendance_records` (
  record_id STRING NOT NULL,                      -- PK: '{member_id}_{date}'
  member_id STRING NOT NULL,                      -- FK → team_members
  record_date DATE NOT NULL,

  -- Estado
  status STRING NOT NULL DEFAULT 'unknown',
  -- Estados posibles:
  --   'present'              → Participó en la daily / registró actividad
  --   'absent_notified'      → No participó pero avisó con anticipación
  --   'absent_unnotified'    → No participó sin aviso previo
  --   'partial'              → Participó parcialmente (llegó tarde, se fue temprano)
  --   'on_leave'             → Tiene permiso aprobado para este día
  --   'holiday'              → Feriado según su país/localización
  --   'weekend'              → Fin de semana (no se genera registro normalmente, pero puede existir)
  --   'not_required'         → No se le requiere daily este día (daily_required = FALSE)

  -- Participación en ceremonias
  daily_participated BOOL,                        -- ¿Participó en la daily standup?
  daily_join_time TIMESTAMP,                      -- Hora a la que se unió (del webhook de Teams)
  daily_duration_minutes INT64,                   -- Duración de su participación

  -- Fuente del dato
  source STRING NOT NULL DEFAULT 'manual',        -- 'teams_webhook' | 'calendar_webhook' | 'manual' | 'leave_system'
  source_event_id STRING,                         -- ID del evento de Teams/Calendar (para dedup)

  -- Override manual
  manual_override BOOL DEFAULT FALSE,             -- Si HR corrigió el registro
  override_by STRING,                             -- member_id de quien hizo el override
  override_reason STRING,

  -- Notas
  notes STRING,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### B9. Tabla `greenhouse.holidays`

Catálogo de feriados por país, necesario para calcular días hábiles y para marcar registros de asistencia como `holiday`.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.holidays` (
  holiday_id STRING NOT NULL,                     -- PK: '{country}_{date}'
  country STRING NOT NULL,                        -- 'CL' | 'CO' | 'MX' | 'PE' | 'VE'
  holiday_date DATE NOT NULL,
  name STRING NOT NULL,                           -- 'Año Nuevo', 'Fiestas Patrias'
  type STRING DEFAULT 'national',                 -- 'national' | 'regional' | 'company'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

**Nota:** La tabla de feriados chilenos ya se usa en el sync HubSpot → Notion (`notion-hubspot-sync`) para calcular business days. Reutilizar esa lista como seed data. Agregar feriados de Colombia, México y Perú para el equipo internacional.

---

## PARTE C: Webhook de Microsoft Teams para Asistencia

### C1. Arquitectura

La asistencia se registra automáticamente capturando participación en las reuniones diarias (dailies) de Microsoft Teams. El flujo:

```
Teams Daily Meeting finaliza
  → Microsoft Graph envía change notification al webhook
  → API Route en Greenhouse recibe el payload
  → Extrae participantes y duración
  → Cruza con team_members por email
  → Inserta/actualiza attendance_records
```

### C2. Configuración de Microsoft Graph

**Prerequisitos:**
- App Registration existente en Azure AD (tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4`)
- Agregar permisos: `OnlineMeetings.Read.All`, `CallRecords.Read.All`
- El webhook de Graph necesita un endpoint HTTPS público que responda al validation handshake

**Subscription a Graph API:**

```json
{
  "changeType": "created",
  "notificationUrl": "https://greenhouse.efeoncepro.com/api/webhooks/teams-attendance",
  "resource": "/communications/callRecords",
  "expirationDateTime": "2026-04-14T00:00:00Z",
  "clientState": "{secret_from_env}"
}
```

**Flujo del webhook:**

1. Graph notifica que un `callRecord` fue creado
2. El endpoint lee `callRecord.id` del payload
3. Hace `GET /communications/callRecords/{id}?$expand=sessions($expand=segments)` para obtener participantes
4. Para cada participante, busca match por email en `team_members`
5. Si el `callRecord` corresponde a un evento recurrente que matchea con la daily (por `organizeMeetingId` o por nombre del meeting que contenga "daily" / "standup" / "huddle"), registra asistencia
6. Si el participante no matchea, lo ignora (puede ser un invitado externo)

### C3. API Route del webhook

```
POST /api/webhooks/teams-attendance
```

**Auth:** Validación por `clientState` (shared secret almacenado en env var `TEAMS_WEBHOOK_SECRET`). No usa sesión NextAuth — es un webhook externo.

**Deduplicación:** Antes de insertar, verificar si ya existe un `attendance_record` con el mismo `source_event_id` para ese `member_id` y `date`. Si existe, no duplicar.

**Configuración de qué meetings trackear:**

```sql
-- Tabla de configuración ligera (o env var / config JSON en el repo)
-- Define qué meetings cuentan como "daily"
-- Opciones:
--   a) Por meeting_id recurrente (más preciso)
--   b) Por keywords en el subject ("daily", "standup", "huddle")
--   c) Por organizer_email + hora recurrente
```

**Recomendación para MVP:** Usar keyword matching en el subject del meeting (`LOWER(subject) LIKE '%daily%' OR LOWER(subject) LIKE '%standup%'`). En fase 2, configurar meeting IDs específicos desde el admin panel.

### C4. Generación diaria de registros base

Un Cloud Scheduler job (o cron interno) que a las 23:00 del timezone de cada persona genera un registro `attendance_record` para cada miembro activo con `daily_required = TRUE`:

- Si ya existe un registro con `source = 'teams_webhook'` y `daily_participated = TRUE` → no hacer nada
- Si no existe registro → crear uno con `status = 'unknown'`
- Si tiene un `leave_request` aprobado para esa fecha → crear con `status = 'on_leave'`, `source = 'leave_system'`
- Si la fecha es feriado en su país → crear con `status = 'holiday'`, `source = 'leave_system'`

Al día siguiente, HR puede revisar los registros `unknown` y marcarlos como `absent_notified` o `absent_unnotified`.

### C5. Fallback manual

Si el webhook de Teams no funciona o hay problemas de conectividad:

- HR puede registrar asistencia manualmente desde `/hr/attendance`
- El registro manual siempre marca `source = 'manual'` y `manual_override = TRUE`
- Si ya existía un registro automático, el manual lo sobreescribe con `manual_override = TRUE`

---

## PARTE D: APIs

Todas las API routes bajo `/api/hr/`. Agrupadas por subsistema.

### D1. Estructura organizacional

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/hr/departments` | GET | `employee` | Lista departamentos con jerarquía |
| `/api/hr/departments` | POST | `efeonce_admin` | Crear departamento |
| `/api/hr/departments/[id]` | PATCH | `efeonce_admin` | Editar departamento |
| `/api/hr/org-chart` | GET | `employee` | Árbol jerárquico completo (members + departments) |

**GET `/api/hr/org-chart`** retorna:

```typescript
{
  departments: Department[],
  members: {
    member_id: string,
    display_name: string,
    role_title: string,
    department_id: string,
    reports_to: string | null,
    job_level: string,
    direct_reports: string[],  // member_ids que le reportan
    avatar_url: string | null
  }[]
}
```

### D2. Ficha del colaborador — Perfil profesional y datos personales

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/hr/members/[memberId]/personal` | GET | `hr` o `efeonce_admin` (datos completos) / `employee` own (datos enmascarados) | Datos personales: identidad, bancarios, previsión, contacto |
| `/api/hr/members/[memberId]/personal` | PATCH | `hr` o `efeonce_admin` | Actualizar datos personales |
| `/api/hr/members/[memberId]/profile` | GET | `employee` | Perfil profesional: skills, herramientas, bio, CV, métricas |
| `/api/hr/members/[memberId]/profile` | PATCH | `hr` o `efeonce_admin` (todos los campos) / `employee` own (solo skills, bio, CV, tools) | Actualizar perfil profesional |
| `/api/hr/members/[memberId]/performance` | GET | `hr` o `efeonce_admin` | Snapshots de performance históricos (gráficos) |
| `/api/hr/members/[memberId]/performance/recalculate` | POST | `hr` o `efeonce_admin` | Recalcular métricas desde `notion_ops` |
| `/api/hr/performance/snapshot-month` | POST | `hr` o `efeonce_admin` | Generar snapshots del mes para todos los miembros activos |

**GET `/api/hr/members/[memberId]/personal`:**

Retorna datos personales. El nivel de detalle depende del rol:

```typescript
// Para HR / admin — datos completos
{
  member_id: string,
  identity_document_type: string,
  identity_document_number: string,       // Completo: '12.345.678-9'
  phone: string,
  date_of_birth: string,
  nationality: string,
  emergency_contact_name: string,
  emergency_contact_phone: string,
  bank_name: string,
  bank_account_type: string,
  bank_account_number: string,            // Completo: '00123456789'
  health_system: string,
  isapre_name: string | null,
  hire_date: string,
  contract_end_date: string | null,
  employment_type: string,
}

// Para el propio colaborador — datos enmascarados
{
  // ...mismos campos pero:
  identity_document_number: '****678-9',  // Solo últimos 5 caracteres
  bank_account_number: '****6789',        // Solo últimos 4 dígitos
  // El resto visible completo (su propio teléfono, etc.)
}
```

**GET `/api/hr/members/[memberId]/profile`:**

```typescript
{
  member_id: string,
  bio: string | null,
  years_of_experience: number | null,
  cv_url: string | null,
  linkedin_url: string | null,
  portfolio_url: string | null,

  // Skills como arrays parseados del JSON
  skills_highlighted: string[],
  skills_improvement_areas: string[],

  // Herramientas agrupadas por categoría
  tools: {
    design: string[],
    development: string[],
    project: string[],
    marketing: string[],
    ai_suites: string[],
  },

  // Output
  output_type: string | null,
  piece_types: string[],
  avg_monthly_pieces: number | null,
  avg_monthly_throughput: number | null,

  // Performance actual
  current_rpa_avg: number | null,
  current_otd_percent: number | null,
  historical_rpa_avg: number | null,
  historical_otd_percent: number | null,
  rpa_trend: 'improving' | 'stable' | 'declining' | null,
  otd_trend: 'improving' | 'stable' | 'declining' | null,

  last_review_date: string | null,
  last_review_notes: string | null,
}
```

**PATCH `/api/hr/members/[memberId]/profile`:**

El colaborador puede editar su propio perfil (skills, bio, herramientas, CV, portfolio, LinkedIn). HR puede editar todo incluyendo métricas manuales, oportunidades de mejora, y notas de evaluación.

Campos editables por el propio colaborador:
- `bio`, `cv_url`, `linkedin_url`, `portfolio_url`
- `skills_highlighted` (autocompletado de un catálogo + free text)
- `tools_design`, `tools_development`, `tools_project`, `tools_marketing`, `tools_ai_suites`

Campos editables solo por HR / admin:
- `skills_improvement_areas`, `years_of_experience`
- `output_type`, `piece_types`, `avg_monthly_pieces`
- `last_review_date`, `last_review_notes`, `reviewed_by`
- Override manual de `current_rpa_avg`, `current_otd_percent` (si la data de `notion_ops` no es confiable)

**POST `/api/hr/performance/snapshot-month`:**

Recibe `{ year: 2026, month: 3 }`. Para cada miembro activo:
1. Lee `notion_ops.tareas` del mes usando match de identidad canónico del repo
2. Calcula `tasks_completed`, `rpa_avg`, `otd_percent`, `pieces_delivered`, `avg_cycle_time_hours`
3. Si el miembro es diseñador (`output_type = 'design'`), cuenta piezas por tipo basándose en tags/categorías de las tareas
4. Inserta snapshot en `member_performance_snapshots` (UPSERT — idempotente)
5. Actualiza `member_profiles` con rolling 3 meses para `current_*` y total para `historical_*`
6. Calcula trends: si rolling 3m es >5% mejor que rolling 6m → `improving`, si <5% peor → `declining`, else `stable`

### D3. Gestión de permisos — Catálogo

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/hr/leave-types` | GET | `employee` | Lista causales activos |
| `/api/hr/leave-types` | POST | `hr` o `efeonce_admin` | Crear causal |
| `/api/hr/leave-types/[id]` | PATCH | `hr` o `efeonce_admin` | Editar causal |

### D4. Gestión de permisos — Saldos

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/hr/leave-balances` | GET | `hr` | Saldos de todos (filtrable por año, persona) |
| `/api/hr/leave-balances/me` | GET | `employee` | Mis saldos del año actual |
| `/api/hr/leave-balances` | POST | `hr` | Inicializar/ajustar saldo de una persona |
| `/api/hr/leave-balances/[id]` | PATCH | `hr` | Ajustar saldo (carry-over, corrección) |
| `/api/hr/leave-balances/initialize-year` | POST | `hr` | Inicializar saldos para un año nuevo (todos los miembros activos) |

**POST `/api/hr/leave-balances/initialize-year`:**
- Recibe: `{ year: 2027 }`
- Para cada miembro activo y cada leave_type con `max_days_per_year != NULL`:
  - Crea un `leave_balance` con `entitled_days = leave_type.max_days_per_year`
  - Si el leave_type permite carry-over, calcula `carried_over_days` del año anterior (regla configurable)
- Idempotente: si ya existe el balance, no lo recrea

### D5. Gestión de permisos — Solicitudes

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/hr/leave-requests` | GET | `hr` | Todas las solicitudes (filtrable por status, persona, fecha) |
| `/api/hr/leave-requests/me` | GET | `employee` | Mis solicitudes |
| `/api/hr/leave-requests/pending` | GET | `employee` con reportes | Solicitudes pendientes de mis reportes directos |
| `/api/hr/leave-requests` | POST | `employee` | Crear solicitud |
| `/api/hr/leave-requests/[id]` | GET | `employee` (solo la propia) o `hr` | Detalle de solicitud |
| `/api/hr/leave-requests/[id]/approve` | POST | supervisor o `hr` | Aprobar solicitud |
| `/api/hr/leave-requests/[id]/reject` | POST | supervisor o `hr` | Rechazar solicitud |
| `/api/hr/leave-requests/[id]/cancel` | POST | `employee` (solo la propia) | Cancelar solicitud pendiente |
| `/api/hr/leave-requests/[id]/revoke` | POST | `hr` | Revocar solicitud ya aprobada |

**POST `/api/hr/leave-requests` — Crear solicitud:**

Validaciones server-side:
1. `leave_type` existe y está activo
2. `start_date <= end_date`
3. `business_days > 0` (se calcula server-side excluyendo weekends y feriados del país del colaborador)
4. Si `leave_type.min_days_advance > 0`: `start_date - today >= min_days_advance`
5. Si `leave_type.deducts_from_balance`: `remaining_days >= business_days`
6. Si `leave_type.allows_half_day = FALSE` y `is_half_day = TRUE`: rechazar
7. Si `leave_type.requires_documentation = TRUE` y `documentation_url` vacío: rechazar
8. No hay overlap con otra solicitud aprobada o pendiente del mismo colaborador
9. Aplicabilidad: verificar `applicable_regimes` contra `pay_regime` del colaborador

Lógica de routing:
- Si `leave_type.requires_approval = FALSE` → status = `pending_hr` (salta supervisor)
- Si `member.reports_to IS NULL` → status = `pending_hr` (no hay supervisor)
- Else → status = `pending_supervisor`, `supervisor_member_id = member.reports_to`

Side effects al crear:
- Incrementar `pending_days` en `leave_balances` (si `deducts_from_balance`)
- Crear `approval_action` con `action_type = 'submitted'`

**POST `.../approve` — Aprobar:**

Validaciones:
1. Si el actor es supervisor: verificar que `request.supervisor_member_id = actor.member_id` y `status = 'pending_supervisor'`
2. Si el actor es HR: verificar que `status = 'pending_hr'`

Side effects:
- Si supervisor aprueba: `status → pending_hr`, crear `approval_action`
- Si HR aprueba: `status → approved`, mover `pending_days → used_days` en balance, crear `approval_action`, generar `attendance_records` con `status = 'on_leave'` para los días del permiso

**POST `.../reject` — Rechazar:**

Side effects:
- `status → rejected_supervisor` o `rejected_hr`
- Decrementar `pending_days` en balance
- Crear `approval_action`

**POST `.../cancel` — Cancelar:**

Validaciones:
- Solo si `status IN ('pending_supervisor', 'pending_hr')` — no se puede cancelar algo ya aprobado
- Solo el solicitante puede cancelar

Side effects:
- `status → cancelled`
- Decrementar `pending_days` en balance
- Crear `approval_action`

**POST `.../revoke` — Revocar:**

Validaciones:
- Solo HR puede revocar
- Solo si `status = 'approved'`
- `rejection_reason` obligatorio

Side effects:
- `status → revoked`
- Mover `used_days → entitled_days` (devuelve los días)
- Eliminar `attendance_records` con `source = 'leave_system'` para los días del permiso revocado
- Crear `approval_action`

### D6. Asistencia

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/hr/attendance` | GET | `hr` | Registros de asistencia (filtrable por fecha, persona, status) |
| `/api/hr/attendance/me` | GET | `employee` | Mi asistencia |
| `/api/hr/attendance/summary` | GET | `hr` | Resumen mensual: % asistencia por persona |
| `/api/hr/attendance/[recordId]` | PATCH | `hr` | Override manual de un registro |
| `/api/webhooks/teams-attendance` | POST | Bearer token | Webhook de Microsoft Teams |

**GET `/api/hr/attendance/summary`:**

Retorna para cada miembro activo en un mes dado:

```typescript
{
  member_id: string,
  display_name: string,
  month: string,               // '2026-03'
  total_workdays: number,       // Días hábiles del mes (excluyendo feriados y weekends)
  days_present: number,
  days_absent_notified: number,
  days_absent_unnotified: number,
  days_partial: number,
  days_on_leave: number,
  days_holiday: number,
  attendance_rate: number,      // (present + partial) / total_workdays * 100
  daily_participation_rate: number  // Veces que participó en daily / veces que debía
}
```

### D7. Calendario de equipo

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/hr/team-calendar` | GET | `employee` | Calendario de ausencias del equipo (quién no estará qué días) |

Retorna eventos agrupados por persona para un rango de fechas dado. Incluye:
- Permisos aprobados
- Feriados por país
- Registros de asistencia marcados como ausencia

---

## PARTE E: Tipos TypeScript

```typescript
// src/types/hr-core.ts

// =============================================
// DEPARTMENTS
// =============================================

export interface Department {
  department_id: string
  name: string
  description: string | null
  parent_department_id: string | null
  head_member_id: string | null
  business_unit: 'globe' | 'efeonce_digital' | 'reach' | 'wave' | 'shared'
  active: boolean
  sort_order: number
  children?: Department[]         // Populated en client para tree view
  head?: TeamMemberSummary | null // Populated en client
}

// =============================================
// MEMBER PERSONAL DATA
// =============================================

export type IdentityDocumentType = 'rut' | 'cedula' | 'pasaporte' | 'dni'
export type BankAccountType = 'corriente' | 'vista' | 'ahorro' | 'rut'
export type HealthSystem = 'fonasa' | 'isapre' | 'none'

export interface MemberPersonalData {
  member_id: string
  identity_document_type: IdentityDocumentType | null
  identity_document_number: string | null       // Enmascarado para employee, completo para HR
  phone: string | null
  date_of_birth: string | null
  nationality: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  bank_name: string | null
  bank_account_type: BankAccountType | null
  bank_account_number: string | null            // Enmascarado para employee
  health_system: HealthSystem | null
  isapre_name: string | null
  hire_date: string | null
  contract_end_date: string | null
  employment_type: 'full_time' | 'part_time' | 'contractor'
}

// =============================================
// MEMBER PROFILE (PROFESSIONAL)
// =============================================

export type OutputType = 'design' | 'content' | 'media' | 'development' | 'strategy' | 'operations'
export type PerformanceTrend = 'improving' | 'stable' | 'declining'

export interface MemberToolset {
  design: string[]
  development: string[]
  project: string[]
  marketing: string[]
  ai_suites: string[]
}

export interface MemberProfile {
  member_id: string
  bio: string | null
  years_of_experience: number | null
  cv_url: string | null
  linkedin_url: string | null
  portfolio_url: string | null

  skills_highlighted: string[]
  skills_improvement_areas: string[]

  tools: MemberToolset

  output_type: OutputType | null
  piece_types: string[]
  avg_monthly_pieces: number | null
  avg_monthly_throughput: number | null

  // Performance actual (calculado, no input)
  current_rpa_avg: number | null
  current_otd_percent: number | null
  historical_rpa_avg: number | null
  historical_otd_percent: number | null
  rpa_trend: PerformanceTrend | null
  otd_trend: PerformanceTrend | null

  last_review_date: string | null
  last_review_notes: string | null
  reviewed_by: string | null
}

// =============================================
// PERFORMANCE SNAPSHOTS
// =============================================

export interface PerformanceSnapshot {
  snapshot_id: string
  member_id: string
  year: number
  month: number
  tasks_completed: number
  tasks_in_progress: number
  rpa_avg: number | null
  otd_percent: number | null
  pieces_delivered: number
  avg_cycle_time_hours: number | null
  pieces_by_type: Record<string, number> | null  // Parsed from JSON
  tasks_by_project: Record<string, number> | null // Parsed from JSON
  data_source: 'notion_ops' | 'manual'
  calculated_at: string
}

// =============================================
// LEAVE TYPES
// =============================================

export type LeaveCategory = 'paid' | 'unpaid' | 'legal' | 'special'
export type LeaveRegime = 'chile' | 'international' | 'both'

export interface LeaveType {
  leave_type_id: string
  name: string
  description: string | null
  category: LeaveCategory
  requires_approval: boolean
  requires_hr_validation: boolean
  requires_documentation: boolean
  max_days_per_year: number | null
  min_days_advance: number
  allows_half_day: boolean
  counts_as_absence: boolean
  deducts_from_balance: boolean
  applicable_regimes: LeaveRegime
  applicable_employment_types: string  // CSV
  color: string | null
  icon: string | null
  active: boolean
}

// =============================================
// LEAVE BALANCES
// =============================================

export interface LeaveBalance {
  balance_id: string
  member_id: string
  leave_type_id: string
  year: number
  entitled_days: number
  used_days: number
  pending_days: number
  carried_over_days: number
  remaining_days: number           // Calculado: entitled + carried_over - used - pending
  leave_type?: LeaveType           // Populated en client
}

// =============================================
// LEAVE REQUESTS
// =============================================

export type LeaveRequestStatus =
  | 'pending_supervisor'
  | 'pending_hr'
  | 'approved'
  | 'rejected_supervisor'
  | 'rejected_hr'
  | 'cancelled'
  | 'revoked'

export interface LeaveRequest {
  request_id: string
  member_id: string
  leave_type_id: string
  start_date: string               // ISO date
  end_date: string
  business_days: number
  is_half_day: boolean
  half_day_period: 'morning' | 'afternoon' | null
  status: LeaveRequestStatus
  reason: string | null
  rejection_reason: string | null
  documentation_url: string | null
  supervisor_member_id: string | null
  supervisor_action_at: string | null
  supervisor_notes: string | null
  hr_validator_member_id: string | null
  hr_action_at: string | null
  hr_notes: string | null
  requested_at: string
  // Populated
  requester?: TeamMemberSummary
  supervisor?: TeamMemberSummary
  leave_type?: LeaveType
  actions?: ApprovalAction[]
}

// =============================================
// APPROVAL ACTIONS
// =============================================

export type ApprovalActionType =
  | 'submitted'
  | 'supervisor_approved'
  | 'supervisor_rejected'
  | 'hr_approved'
  | 'hr_rejected'
  | 'cancelled'
  | 'revoked'

export interface ApprovalAction {
  action_id: string
  request_id: string
  action_type: ApprovalActionType
  actor_member_id: string
  actor_role: 'requester' | 'supervisor' | 'hr'
  notes: string | null
  acted_at: string
  actor?: TeamMemberSummary
}

// =============================================
// ATTENDANCE
// =============================================

export type AttendanceStatus =
  | 'present'
  | 'absent_notified'
  | 'absent_unnotified'
  | 'partial'
  | 'on_leave'
  | 'holiday'
  | 'weekend'
  | 'not_required'
  | 'unknown'

export interface AttendanceRecord {
  record_id: string
  member_id: string
  record_date: string              // ISO date
  status: AttendanceStatus
  daily_participated: boolean | null
  daily_join_time: string | null
  daily_duration_minutes: number | null
  source: 'teams_webhook' | 'calendar_webhook' | 'manual' | 'leave_system'
  source_event_id: string | null
  manual_override: boolean
  override_by: string | null
  override_reason: string | null
  notes: string | null
  member?: TeamMemberSummary
}

export interface AttendanceSummary {
  member_id: string
  display_name: string
  month: string
  total_workdays: number
  days_present: number
  days_absent_notified: number
  days_absent_unnotified: number
  days_partial: number
  days_on_leave: number
  days_holiday: number
  attendance_rate: number
  daily_participation_rate: number
}

// =============================================
// TEAM CALENDAR
// =============================================

export interface TeamCalendarEvent {
  member_id: string
  display_name: string
  date: string
  type: 'leave' | 'holiday' | 'absence'
  label: string                    // 'Vacaciones', 'Feriado: Fiestas Patrias', 'Ausencia'
  color: string
}

// =============================================
// HELPERS
// =============================================

export interface TeamMemberSummary {
  member_id: string
  display_name: string
  role_title: string
  avatar_url: string | null
  department_id: string | null
}
```

---

## PARTE F: Estructura de archivos

```
src/
├── app/
│   └── (dashboard)/
│       └── hr/
│           ├── layout.tsx                              # Guard: routeGroups.includes('hr') || 'employee' || roleCodes.includes('efeonce_admin')
│           ├── my-leave/
│           │   └── page.tsx                            # Vista del colaborador: mis permisos y saldos
│           ├── my-attendance/
│           │   └── page.tsx                            # Vista del colaborador: mi asistencia
│           ├── approvals/
│           │   └── page.tsx                            # Vista supervisor: solicitudes pendientes de mis reportes
│           ├── leave-management/
│           │   └── page.tsx                            # Vista HR: gestión completa de permisos
│           ├── attendance/
│           │   └── page.tsx                            # Vista HR: dashboard de asistencia
│           ├── org-chart/
│           │   └── page.tsx                            # Vista: organigrama visual
│           ├── team-calendar/
│           │   └── page.tsx                            # Calendario de ausencias del equipo
│           └── settings/
│               ├── leave-types/
│               │   └── page.tsx                        # Admin: CRUD de causales de permiso
│               ├── departments/
│               │   └── page.tsx                        # Admin: CRUD de departamentos
│               └── holidays/
│                   └── page.tsx                        # Admin: gestión de feriados por país
├── api/
│   └── hr/
│       ├── departments/
│       │   └── route.ts                                # GET + POST
│       ├── org-chart/
│       │   └── route.ts                                # GET
│       ├── leave-types/
│       │   ├── route.ts                                # GET + POST
│       │   └── [id]/
│       │       └── route.ts                            # PATCH
│       ├── leave-balances/
│       │   ├── route.ts                                # GET + POST
│       │   ├── me/
│       │   │   └── route.ts                            # GET
│       │   ├── [id]/
│       │   │   └── route.ts                            # PATCH
│       │   └── initialize-year/
│       │       └── route.ts                            # POST
│       ├── leave-requests/
│       │   ├── route.ts                                # GET + POST
│       │   ├── me/
│       │   │   └── route.ts                            # GET
│       │   ├── pending/
│       │   │   └── route.ts                            # GET (para supervisores)
│       │   └── [id]/
│       │       ├── route.ts                            # GET
│       │       ├── approve/
│       │       │   └── route.ts                        # POST
│       │       ├── reject/
│       │       │   └── route.ts                        # POST
│       │       ├── cancel/
│       │       │   └── route.ts                        # POST
│       │       └── revoke/
│       │           └── route.ts                        # POST
│       ├── attendance/
│       │   ├── route.ts                                # GET
│       │   ├── me/
│       │   │   └── route.ts                            # GET
│       │   ├── summary/
│       │   │   └── route.ts                            # GET
│       │   └── [recordId]/
│       │       └── route.ts                            # PATCH
│       ├── team-calendar/
│       │   └── route.ts                                # GET
│       ├── members/
│       │   └── [memberId]/
│       │       ├── personal/
│       │       │   └── route.ts                        # GET + PATCH (datos personales/bancarios)
│       │       ├── profile/
│       │       │   └── route.ts                        # GET + PATCH (perfil profesional)
│       │       └── performance/
│       │           ├── route.ts                        # GET (snapshots históricos)
│       │           └── recalculate/
│       │               └── route.ts                    # POST (recalcular desde notion_ops)
│       ├── performance/
│       │   └── snapshot-month/
│       │       └── route.ts                            # POST (generar snapshots del mes)
│       └── webhooks/
│           └── teams-attendance/
│               └── route.ts                            # POST (webhook externo)
├── views/
│   └── greenhouse/
│       └── hr-core/
│           ├── MyLeaveView.tsx                         # Vista principal del colaborador
│           ├── LeaveRequestDrawer.tsx                   # Drawer para solicitar permiso
│           ├── LeaveBalanceCards.tsx                     # Cards de saldo por tipo
│           ├── LeaveRequestTimeline.tsx                  # Timeline de mis solicitudes
│           ├── MyAttendanceView.tsx                      # Mi asistencia mensual
│           ├── AttendanceCalendarGrid.tsx                # Grid calendario con colores por status
│           ├── ApprovalQueue.tsx                         # Cola de aprobaciones del supervisor
│           ├── ApprovalCard.tsx                          # Card individual de solicitud pendiente
│           ├── LeaveManagementView.tsx                   # Vista HR completa
│           ├── LeaveManagementTable.tsx                  # Tabla de todas las solicitudes
│           ├── LeaveManagementFilters.tsx                # Filtros por status, persona, tipo, fecha
│           ├── AttendanceDashboard.tsx                   # Dashboard HR de asistencia
│           ├── AttendanceSummaryTable.tsx                # Tabla resumen mensual
│           ├── AttendanceOverrideDrawer.tsx              # Drawer para override manual
│           ├── OrgChartView.tsx                          # Organigrama visual
│           ├── OrgChartNode.tsx                          # Nodo del organigrama (persona)
│           ├── TeamCalendarView.tsx                      # Calendario de ausencias del equipo
│           ├── TeamCalendarMonth.tsx                     # Vista mensual del calendario
│           ├── MemberPersonalDataTab.tsx                 # Tab: datos personales, identidad, bancarios
│           ├── MemberPersonalDataForm.tsx                # Formulario editable de datos personales
│           ├── MemberProfileTab.tsx                      # Tab: perfil profesional, skills, herramientas
│           ├── MemberProfileForm.tsx                     # Formulario editable de perfil profesional
│           ├── MemberPerformanceTab.tsx                  # Tab: métricas de performance con gráficos
│           ├── PerformanceSparklines.tsx                 # Mini-gráficos de RpA/OTD% por mes
│           ├── PerformancePieceBreakdown.tsx             # Donut chart de distribución por tipo de pieza
│           ├── SkillTagsInput.tsx                        # Input de tags para skills y herramientas
│           ├── ToolsChecklistGroup.tsx                   # Checklist agrupado por categoría de herramientas
│           ├── LeaveTypeConfigTable.tsx                  # Admin: tabla de causales
│           ├── LeaveTypeDrawer.tsx                       # Admin: drawer crear/editar causal
│           ├── DepartmentConfigTable.tsx                 # Admin: tabla de departamentos
│           ├── DepartmentDrawer.tsx                      # Admin: drawer crear/editar departamento
│           └── HolidayConfigTable.tsx                    # Admin: tabla de feriados
├── lib/
│   └── hr-core/
│       ├── departments.ts                               # Queries de departamentos
│       ├── leave-types.ts                               # Queries de causales
│       ├── leave-balances.ts                             # Queries de saldos
│       ├── leave-requests.ts                             # Queries y mutations de solicitudes
│       ├── approval-actions.ts                           # Insert de acciones
│       ├── attendance.ts                                 # Queries de asistencia
│       ├── attendance-webhook.ts                         # Procesamiento del webhook de Teams
│       ├── business-days.ts                              # Cálculo de días hábiles (usa holidays)
│       ├── org-chart.ts                                  # Query de organigrama
│       ├── team-calendar.ts                              # Query de calendario de equipo
│       ├── member-personal.ts                            # Queries de datos personales (con enmascaramiento)
│       ├── member-profile.ts                             # Queries de perfil profesional
│       ├── member-performance.ts                         # Queries de snapshots + cálculo de métricas
│       └── performance-calculator.ts                     # Lógica de cálculo de RpA, OTD%, throughput desde notion_ops
└── types/
    └── hr-core.ts                                       # Tipos (Parte E)
```

---

## PARTE G: Navegación

### Sidebar — sección HR expandida

El sidebar HR existente (definido en HR Payroll) se expande con las nuevas vistas. La visibilidad se controla por route group:

```typescript
// En src/data/navigation/
{
  sectionTitle: 'HR',
  items: [
    // Visible para todo employee
    {
      title: 'Mis permisos',
      icon: 'tabler-calendar-event',
      path: '/hr/my-leave',
      // Visible si routeGroups.includes('employee') || 'hr' || 'efeonce_admin'
    },
    {
      title: 'Mi asistencia',
      icon: 'tabler-clock-check',
      path: '/hr/my-attendance',
      // Visible si routeGroups.includes('employee') || 'hr' || 'efeonce_admin'
    },
    // Visible solo si tiene reportes directos
    {
      title: 'Aprobaciones',
      icon: 'tabler-checklist',
      path: '/hr/approvals',
      badge: pendingCount,  // Badge con cantidad de pendientes
      // Visible si el usuario tiene al menos 1 reporte directo
    },
    // Visible para HR y admin
    {
      title: 'Calendario de equipo',
      icon: 'tabler-calendar-stats',
      path: '/hr/team-calendar',
      // Visible si routeGroups.includes('employee') || 'hr' || 'efeonce_admin'
    },
    {
      title: 'Gestión de permisos',
      icon: 'tabler-file-check',
      path: '/hr/leave-management',
      // Visible si routeGroups.includes('hr') || roleCodes.includes('efeonce_admin')
    },
    {
      title: 'Asistencia',
      icon: 'tabler-user-check',
      path: '/hr/attendance',
      // Visible si routeGroups.includes('hr') || roleCodes.includes('efeonce_admin')
    },
    {
      title: 'Nómina',
      icon: 'tabler-receipt-2',
      path: '/hr/payroll',
      // Visible si routeGroups.includes('hr') || roleCodes.includes('efeonce_admin')
    },
    {
      title: 'Organigrama',
      icon: 'tabler-hierarchy-3',
      path: '/hr/org-chart',
      // Visible si routeGroups.includes('employee') || 'hr' || 'efeonce_admin'
    },
    // Configuración — submenú
    {
      title: 'Configuración HR',
      icon: 'tabler-settings',
      // Visible si routeGroups.includes('hr') || roleCodes.includes('efeonce_admin')
      children: [
        { title: 'Tipos de permiso', path: '/hr/settings/leave-types' },
        { title: 'Departamentos', path: '/hr/settings/departments' },
        { title: 'Feriados', path: '/hr/settings/holidays' },
      ]
    },
  ]
}
```

---

## PARTE H: Vistas clave — Especificación

### H1. `/hr/my-leave` — Mis permisos (vista del colaborador)

**Layout:** Dos zonas. Arriba: cards de saldo. Abajo: tabla/timeline de solicitudes.

**Cards de saldo (fila superior):**
Un card por cada `leave_type` donde el colaborador tiene balance. Cada card muestra:
- Nombre del tipo (ej: "Vacaciones")
- Icono y color del tipo
- Saldo: `{remaining_days}` días disponibles de `{entitled_days + carried_over_days}`
- Barra de progreso: `used_days / (entitled_days + carried_over_days)` como porcentaje
- Si `pending_days > 0`: badge "N pendientes"

**Botón "Solicitar permiso"** → abre `LeaveRequestDrawer`

**Tabla de solicitudes (abajo):**
Mis solicitudes del año actual, filtrable por status. Columnas:
- Tipo (badge con color e icono)
- Fechas (start_date → end_date, con business_days)
- Status (chip con color semántico)
- Aprobador actual (nombre del supervisor o "HR")
- Fecha de solicitud
- Acción: "Cancelar" (si status es pendiente), "Ver detalle"

**Status chips — colores:**
- `pending_supervisor` / `pending_hr`: `GH_COLORS.semantic.warning`
- `approved`: `GH_COLORS.semantic.success`
- `rejected_*`: `GH_COLORS.semantic.danger`
- `cancelled` / `revoked`: `GH_COLORS.neutral.textSecondary`

### H2. `LeaveRequestDrawer` — Solicitar permiso

**Drawer lateral derecho** con formulario:

1. **Tipo de permiso** — Select con opciones filtradas por el régimen del colaborador
2. **Fecha inicio** — DatePicker
3. **Fecha fin** — DatePicker
4. **Días hábiles** — Calculado automáticamente (read-only). Excluye weekends y feriados del país del colaborador.
5. **Medio día** — Switch (solo visible si `leave_type.allows_half_day = TRUE`)
6. **Período** — Radio: "Mañana" / "Tarde" (solo si medio día está activo)
7. **Motivo** — TextField multilínea
8. **Documentación** — Upload o URL (solo visible si `leave_type.requires_documentation = TRUE`)

**Validaciones en tiempo real (client-side):**
- Si saldo insuficiente → warning con días restantes
- Si no cumple anticipación mínima → error
- Si overlap con otra solicitud → error con detalle

**Al enviar:**
- Muestra confirmación: "Tu solicitud será enviada a {supervisor_name} para aprobación"
- Si `requires_approval = FALSE`: "Tu solicitud será enviada a HR para validación"
- Si no hay supervisor: "Tu solicitud será enviada directamente a HR"

### H3. `/hr/approvals` — Cola de aprobaciones (vista supervisor)

**Lista de solicitudes pendientes** de los reportes directos del supervisor logueado.

**Card por solicitud pendiente:**
- Avatar + nombre del solicitante
- Tipo de permiso (badge)
- Fechas y días
- Motivo
- Dos botones: "Aprobar" (verde) / "Rechazar" (rojo)
- Al rechazar: pide motivo obligatorio

**Badge en sidebar:** Contador de solicitudes pendientes, se actualiza al navegar.

### H4. `/hr/leave-management` — Gestión completa (vista HR)

**Layout:** Stats row arriba + tabla completa abajo.

**Stats row:**
- Solicitudes pendientes de validación HR
- Permisos aprobados este mes
- Colaboradores ausentes hoy
- Tasa de aprobación (%)

**Tabla completa:** Todas las solicitudes filtrable por:
- Status (multiselect)
- Persona (search)
- Tipo de permiso
- Rango de fechas
- Departamento

Columnas: Colaborador, Tipo, Fechas, Días, Status, Supervisor, Acción HR

**Acciones HR:**
- Si `status = pending_hr`: "Validar" / "Rechazar"
- Si `status = approved`: "Revocar" (con confirmación y motivo)

### H5. `/hr/attendance` — Dashboard de asistencia (vista HR)

**Dos vistas:** Resumen mensual (tabla) y Detalle diario (calendario/grid).

**Tab "Resumen mensual":**
Tabla con una fila por persona. Columnas: Nombre, Departamento, Días trabajados, Ausencias notificadas, Ausencias sin aviso, Permisos, Tasa de asistencia (%), Tasa de participación en dailies (%).

Colores de tasa: `>= 95%` → verde, `>= 80%` → amarillo, `< 80%` → rojo (usando `GH_COLORS.semaphore`).

**Tab "Detalle diario":**
Grid tipo calendario. Filas = personas, Columnas = días del mes. Cada celda muestra un dot de color según status:
- `present` → verde
- `absent_notified` → amarillo
- `absent_unnotified` → rojo
- `on_leave` → azul
- `holiday` → gris claro
- `unknown` → gris con "?"

Clic en una celda → abre `AttendanceOverrideDrawer` para que HR corrija el status.

### H6. `/hr/org-chart` — Organigrama

**Visualización de árbol** que muestra la jerarquía de reporte del equipo. Cada nodo:
- Avatar + nombre
- Cargo (`role_title`)
- Departamento
- Job level (badge sutil)
- Línea conectando a su supervisor (arriba) y sus reportes (abajo)

**Agrupación por departamento** con color de fondo sutil usando `GH_COLORS.service[business_unit]`.

**Patrón Vuexy:** Usar el componente de org chart si Vuexy incluye uno, o implementar con CSS flex/grid + líneas SVG para las conexiones.

### H7. `/hr/team-calendar` — Calendario de ausencias

**Vista mensual** tipo Gantt simplificado:
- Filas = personas del equipo
- Columnas = días del mes
- Barras de color por cada período de permiso aprobado o feriado

Permite ver de un vistazo quién estará ausente qué días. Útil para planificación operativa.

Filtrable por departamento y por tipo de permiso.

### H8. Ficha del colaborador — Tabs de perfil y performance

Estos tabs se integran en la ficha de persona de `/people/[memberId]` (definido en `CODEX_TASK_People_Unified_View`). Son tabs adicionales que viven junto a "Asignaciones" y "Actividad".

**Tab "Datos personales" (`MemberPersonalDataTab.tsx`):**

Solo visible para HR y admin. Formulario organizado en secciones:

**Sección "Identidad":**
- Tipo de documento (select: RUT, Cédula, Pasaporte, DNI)
- Número de documento (input, enmascarado si el viewer es el propio colaborador)
- Fecha de nacimiento (date picker)
- Nacionalidad (select con países LATAM + otros)

**Sección "Contacto":**
- Teléfono (input con código de país)
- Contacto de emergencia — nombre y teléfono

**Sección "Datos bancarios":**
- Banco (select: Banco Estado, Banco de Chile, Santander, BCI, Scotiabank, Itaú, etc.)
- Tipo de cuenta (select: Corriente, Vista, Ahorro, Cuenta RUT)
- Número de cuenta (input, enmascarado para el propio colaborador)

**Sección "Previsión":**
- Sistema de salud (radio: Fonasa / Isapre / N/A)
- Nombre de Isapre (input, visible solo si selecciona Isapre): Colmena, Cruz Blanca, Banmédica, Consalud, Vida Tres, Nueva Masvida

**Nota:** El salario base NO vive aquí — vive en `compensation_versions` (módulo Payroll). Pero los datos bancarios y previsionales sí son de la persona, no de la versión de pago. `health_system` e `isapre_name` en `team_members` son la fuente de verdad de "a qué sistema pertenece"; `compensation_versions` guarda el snapshot para el cálculo de nómina con la tasa exacta usada.

**Tab "Perfil profesional" (`MemberProfileTab.tsx`):**

Visible para HR, admin, y el propio colaborador (con campos editables limitados).

**Sección "Sobre mí":**
- Bio (textarea, 2-3 oraciones)
- Años de experiencia (number input)
- Links: CV (url), LinkedIn (url), Portafolio (url)

**Sección "Skills destacadas":**
- Tag input con autocompletado de un catálogo sugerido + free text
- Chips removibles, máximo 10
- Catálogo sugerido: "Branding", "Motion Graphics", "Packaging", "UX/UI", "Ilustración", "Fotografía", "Social Media", "Copywriting", "SEO", "Email Marketing", "CRM", "Analytics", "Desarrollo Frontend", "Desarrollo Backend", "Cloud/DevOps", "Video", "Audio"

**Sección "Oportunidades de mejora":**
- Mismo formato tag input
- Solo editable por HR/admin (el colaborador las ve pero no las edita)
- Se usan en evaluaciones y planes de desarrollo

**Sección "Herramientas" (`ToolsChecklistGroup.tsx`):**

Checklist agrupado por categoría. El colaborador marca las que domina. HR puede agregar o corregir.

| Categoría | Opciones sugeridas |
|-----------|-------------------|
| **Diseño** | Figma, Photoshop, Illustrator, After Effects, Premiere Pro, InDesign, Canva, Blender, Cinema 4D, Lightroom, XD |
| **Desarrollo** | VS Code, Git/GitHub, Node.js, Python, TypeScript, React, Next.js, SQL, Docker, Terraform |
| **Gestión de proyecto** | Notion, Frame.io, Jira, Asana, Monday, ClickUp, Trello, Basecamp |
| **Marketing** | HubSpot, Google Analytics, Google Ads, Meta Ads Manager, SEMrush, Mailchimp, Metricool, Looker Studio |
| **Suites de IA** | ChatGPT, Claude, Midjourney, DALL-E, Stable Diffusion, Runway, Adobe Firefly, GitHub Copilot, Cursor, v0, Suno, ElevenLabs, Kling, Perplexity |

Cada categoría es un acordeón colapsable. Las seleccionadas se muestran como chips arriba. Se pueden agregar herramientas personalizadas que no estén en la lista.

**Sección "Output y especialización":**
- Tipo de output (select: Diseño, Contenido, Medios, Desarrollo, Estrategia, Operaciones)
- Tipos de piezas que produce (tag input, contextual al output_type):
  - Si Diseño: "Social media", "Key Visual", "Packaging", "Editorial", "Motion", "Presentaciones", "Brand Identity", "Infografía"
  - Si Contenido: "Blog posts", "Email campaigns", "Social copy", "Guiones", "Landing pages", "Whitepapers"
  - Si Desarrollo: "Frontend", "Backend", "Cloud Functions", "Integraciones", "Dashboards", "Automatizaciones"
- Promedio mensual de piezas/entregables (number, read-only si calculado, editable si manual)

**Tab "Performance" (`MemberPerformanceTab.tsx`):**

Visible para HR y admin. Métricas calculadas desde `notion_ops` con historial visual.

**KPI cards (fila superior):**

| KPI | Valor | Visual |
|-----|-------|--------|
| RpA actual | `current_rpa_avg` (rolling 3m) | Número + semáforo (< 1.5 verde, < 2.0 amarillo, ≥ 2.0 rojo) + trend arrow |
| OTD% actual | `current_otd_percent` (rolling 3m) | Número + semáforo (≥ 95% verde, ≥ 89% amarillo, < 89% rojo) + trend arrow |
| Throughput | `avg_monthly_throughput` | Número de tareas/mes |
| Piezas/mes | `avg_monthly_pieces` | Número (solo si `output_type = 'design'`) |

**Trend arrows:** `improving` → ↑ verde, `stable` → → gris, `declining` → ↓ rojo.

**Gráficos de evolución (`PerformanceSparklines.tsx`):**
- Line chart con RpA por mes (últimos 12 meses desde `member_performance_snapshots`)
- Line chart con OTD% por mes
- Bar chart con tasks completed por mes
- Líneas de referencia: RpA = 2.0 (umbral), OTD% = 89% (umbral)
- Usar colores de semáforo de `GH_COLORS.semaphore` para las zonas

**Distribución por tipo de pieza (`PerformancePieceBreakdown.tsx`):**
- Donut chart con `pieces_by_type` del último snapshot
- Solo visible si `output_type = 'design'` o `content`
- Colores rotativos de `GH_COLORS.service`

**Distribución por proyecto/cliente:**
- Bar chart horizontal con `tasks_by_project` del último snapshot
- Muestra en qué cuentas está produciendo más

**Historial de evaluaciones:**
- Timeline con `last_review_date` y `last_review_notes`
- Botón "Registrar evaluación" (solo HR) que abre un drawer con textarea + date picker

**Botón "Recalcular métricas"** (solo HR): Llama a `/api/hr/members/[memberId]/performance/recalculate` y refresca la vista.

---

## PARTE I: Integración con módulos existentes

### I1. Integración con People (`/people/[memberId]`)

La ficha de persona en `/people/[memberId]` gana tres tabs nuevos además de "Ausencias":

| Tab | Componente | Visibilidad | Fuente de datos |
|-----|-----------|-------------|-----------------|
| **Asignaciones** | (ya existe) | Todos | `client_team_assignments` |
| **Actividad** | (ya existe) | Todos | `notion_ops.tareas` |
| **Datos personales** | `MemberPersonalDataTab` | HR + admin | `team_members` (campos personales/bancarios) |
| **Perfil profesional** | `MemberProfileTab` | Todos (edición limitada) | `member_profiles` |
| **Performance** | `MemberPerformanceTab` | HR + admin | `member_performance_snapshots` + `member_profiles` |
| **Ausencias** | (nuevo) | HR + admin | `leave_balances` + `leave_requests` + `attendance_records` |
| **Compensación** | (de payroll) | HR + admin | `compensation_versions` |
| **Nómina** | (de payroll) | HR + admin | `payroll_entries` |

**Orden de tabs:** Asignaciones → Actividad → Perfil profesional → Performance → Ausencias → Datos personales → Compensación → Nómina

Los tabs de HR (Datos personales, Performance, Ausencias, Compensación, Nómina) solo se renderizan si el usuario tiene route group `hr` o `efeonce_admin`. El tab "Perfil profesional" es visible para todos — el propio colaborador puede ver y editar parcialmente su perfil.

### I2. Integración con Payroll

El módulo de payroll puede consultar `attendance_records` y `leave_requests` para:
- Calcular bonos ajustados por ausencias (futuro)
- Mostrar días trabajados vs días del mes en el desglose de nómina
- Identificar licencias médicas que requieren ajuste en cálculo Chile

Esta integración es informativa en esta fase — no modifica el cálculo de payroll automáticamente.

### I3. Nomenclatura — extensión de `greenhouse-nomenclature.ts`

```typescript
// Agregar a greenhouse-nomenclature.ts

export const GH_HR = {
  // Navegación
  nav_my_leave: 'Mis permisos',
  nav_my_attendance: 'Mi asistencia',
  nav_approvals: 'Aprobaciones',
  nav_leave_management: 'Gestión de permisos',
  nav_attendance: 'Asistencia',
  nav_org_chart: 'Organigrama',
  nav_team_calendar: 'Calendario de equipo',
  nav_hr_settings: 'Configuración HR',

  // Permisos
  leave_request_title: 'Solicitar permiso',
  leave_balance_title: 'Mis saldos',
  leave_remaining: (days: number) => `${days} días disponibles`,
  leave_pending: (count: number) => `${count} pendiente${count !== 1 ? 's' : ''}`,

  // Status labels
  status_pending_supervisor: 'Pendiente supervisor',
  status_pending_hr: 'Pendiente HR',
  status_approved: 'Aprobado',
  status_rejected_supervisor: 'Rechazado por supervisor',
  status_rejected_hr: 'Rechazado por HR',
  status_cancelled: 'Cancelado',
  status_revoked: 'Revocado',

  // Asistencia
  attendance_present: 'Presente',
  attendance_absent_notified: 'Ausencia notificada',
  attendance_absent_unnotified: 'Ausencia sin aviso',
  attendance_partial: 'Parcial',
  attendance_on_leave: 'Con permiso',
  attendance_holiday: 'Feriado',
  attendance_unknown: 'Sin registro',

  // Mensajes
  msg_request_sent: (supervisor: string) => `Solicitud enviada a ${supervisor} para aprobación`,
  msg_request_sent_hr: 'Solicitud enviada a HR para validación',
  msg_no_supervisor: 'No tienes supervisor asignado. La solicitud irá directamente a HR.',
  msg_insufficient_balance: (remaining: number) => `Solo tienes ${remaining} días disponibles`,
  msg_overlap: 'Ya tienes una solicitud para estas fechas',

  // Empty states
  empty_leave: 'No tienes solicitudes de permiso registradas. Cuando necesites un día libre, solicítalo desde aquí.',
  empty_approvals: 'No hay solicitudes pendientes de aprobación.',
  empty_attendance: 'Los registros de asistencia aparecerán cuando el sistema de tracking esté activo.',
  empty_profile: 'Completa tu perfil profesional para que tu equipo conozca tus skills y herramientas.',
  empty_performance: 'Las métricas de performance aparecerán cuando haya datos suficientes en el sistema.',

  // Ficha del colaborador — Tabs
  tab_personal_data: 'Datos personales',
  tab_profile: 'Perfil profesional',
  tab_performance: 'Performance',
  tab_absences: 'Ausencias',

  // Datos personales — Secciones
  section_identity: 'Identidad',
  section_contact: 'Contacto',
  section_banking: 'Datos bancarios',
  section_health: 'Previsión',

  // Perfil profesional — Secciones
  section_about: 'Sobre mí',
  section_skills: 'Skills destacadas',
  section_improvement: 'Oportunidades de mejora',
  section_tools: 'Herramientas',
  section_tools_design: 'Diseño',
  section_tools_dev: 'Desarrollo',
  section_tools_project: 'Gestión de proyecto',
  section_tools_marketing: 'Marketing',
  section_tools_ai: 'Suites de IA',
  section_output: 'Output y especialización',

  // Performance — Labels
  perf_rpa_current: 'RpA actual',
  perf_otd_current: 'OTD% actual',
  perf_throughput: 'Throughput mensual',
  perf_pieces: 'Piezas / mes',
  perf_rpa_historical: 'RpA histórico',
  perf_otd_historical: 'OTD% histórico',
  perf_trend_improving: 'Mejorando',
  perf_trend_stable: 'Estable',
  perf_trend_declining: 'Declinando',
  perf_recalculate: 'Recalcular métricas',
  perf_snapshot_generate: 'Generar snapshot del mes',
  perf_evolution: 'Evolución mensual',
  perf_piece_breakdown: 'Distribución por tipo de pieza',
  perf_project_breakdown: 'Distribución por proyecto',
  perf_review_history: 'Historial de evaluaciones',
  perf_register_review: 'Registrar evaluación',

  // Datos bancarios — Labels
  label_bank: 'Banco',
  label_account_type: 'Tipo de cuenta',
  label_account_number: 'Número de cuenta',
  label_health_system: 'Sistema de salud',
  label_isapre: 'Isapre',
  label_document_type: 'Tipo de documento',
  label_document_number: 'Número de documento',
  label_phone: 'Teléfono',
  label_emergency_contact: 'Contacto de emergencia',
  label_dob: 'Fecha de nacimiento',
  label_nationality: 'Nacionalidad',
} as const
```

### I4. Colores para attendance status

```typescript
// Agregar a GH_COLORS

export const GH_ATTENDANCE_COLORS = {
  present:             GH_COLORS.semaphore.green,
  absent_notified:     GH_COLORS.semaphore.yellow,
  absent_unnotified:   GH_COLORS.semaphore.red,
  partial:             { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' },  // Sunset Orange
  on_leave:            GH_COLORS.semantic.info,
  holiday:             { source: '#848484', bg: '#f7f7f5', text: '#848484' },  // Neutral
  unknown:             { source: '#dbdbdb', bg: '#f7f7f5', text: '#848484' },
  not_required:        { source: '#dbdbdb', bg: '#f7f7f5', text: '#848484' },
} as const

export const GH_PERFORMANCE_COLORS = {
  // Semáforos de RpA (invertido: menor es mejor)
  rpa_green:  GH_COLORS.semaphore.green,    // < 1.5
  rpa_yellow: GH_COLORS.semaphore.yellow,   // < 2.0
  rpa_red:    GH_COLORS.semaphore.red,       // >= 2.0

  // Semáforos de OTD% (mayor es mejor)
  otd_green:  GH_COLORS.semaphore.green,    // >= 95%
  otd_yellow: GH_COLORS.semaphore.yellow,   // >= 89%
  otd_red:    GH_COLORS.semaphore.red,       // < 89%

  // Trends
  improving:  GH_COLORS.semaphore.green,
  stable:     { source: '#848484', bg: '#f7f7f5', text: '#848484' },
  declining:  GH_COLORS.semaphore.red,

  // Líneas de referencia en gráficos
  threshold_rpa: '#bb1954',                  // Línea en 2.0
  threshold_otd: '#ff6500',                  // Línea en 89%
} as const
```

---

## PARTE J: Orden de ejecución

### Fase 1: Descubrimiento (ANTES de escribir código)

1. Ejecutar query de descubrimiento del schema de `team_members` (verificar qué columnas existen)
2. Verificar si route group `hr` ya está implementado (de HR Payroll)
3. Verificar si existe route group `employee` o equivalente
4. Leer `authorization.ts` para entender cómo crear route groups
5. Leer `project_context.md` para estrategia de identidad
6. Verificar si la App Registration de Azure AD tiene permisos de `CallRecords.Read.All` / `OnlineMeetings.Read.All`

### Fase 2: Infraestructura

7. `ALTER TABLE team_members` — agregar columnas nuevas (A1: org + personal + banking + previsión + perfil)
8. Crear tablas BigQuery (B1-B9)
9. Insertar seed data (departamentos, causales de permiso, feriados, datos de personas)
10. Crear role `employee` si no existe
11. Crear/extender sublayout de `/hr/` para manejar `employee` + `hr` + `efeonce_admin`
12. Crear tipos TypeScript (E)

### Fase 3: APIs core — Estructura organizacional

13. `GET/POST /api/hr/departments`
14. `GET /api/hr/org-chart`

### Fase 4: APIs — Ficha del colaborador y perfil

15. `GET/PATCH /api/hr/members/[memberId]/personal` (datos personales, bancarios, previsión)
16. `GET/PATCH /api/hr/members/[memberId]/profile` (skills, herramientas, IA, CV, output type)
17. `GET /api/hr/members/[memberId]/performance` (snapshots históricos)
18. `POST /api/hr/members/[memberId]/performance/recalculate`
19. `POST /api/hr/performance/snapshot-month` (cálculo masivo mensual)

### Fase 5: APIs core — Permisos

20. `GET/POST /api/hr/leave-types`
21. `GET/POST/PATCH /api/hr/leave-balances` + `/me` + `/initialize-year`
22. `POST /api/hr/leave-requests` (crear solicitud con todas las validaciones)
23. `GET /api/hr/leave-requests` + `/me` + `/pending`
24. `POST .../approve` + `.../reject` + `.../cancel` + `.../revoke`

### Fase 6: APIs — Asistencia

25. `POST /api/webhooks/teams-attendance` (webhook)
26. `GET /api/hr/attendance` + `/me` + `/summary`
27. `PATCH /api/hr/attendance/[recordId]` (override manual)
28. `GET /api/hr/team-calendar`

### Fase 7: UI — Colaborador

29. `MyLeaveView.tsx` + `LeaveBalanceCards.tsx` + `LeaveRequestTimeline.tsx`
30. `LeaveRequestDrawer.tsx` (con cálculo de business days client-side)
31. `MyAttendanceView.tsx` + `AttendanceCalendarGrid.tsx`

### Fase 8: UI — Supervisor

32. `ApprovalQueue.tsx` + `ApprovalCard.tsx`

### Fase 9: UI — HR

33. `LeaveManagementView.tsx` + `LeaveManagementTable.tsx` + `LeaveManagementFilters.tsx`
34. `AttendanceDashboard.tsx` + `AttendanceSummaryTable.tsx` + `AttendanceOverrideDrawer.tsx`

### Fase 10: UI — Ficha del colaborador

35. `MemberPersonalDataTab.tsx` + `MemberPersonalDataForm.tsx`
36. `MemberProfileTab.tsx` + `MemberProfileForm.tsx` + `SkillTagsInput.tsx` + `ToolsChecklistGroup.tsx`
37. `MemberPerformanceTab.tsx` + `PerformanceSparklines.tsx` + `PerformancePieceBreakdown.tsx`

### Fase 11: UI — Organigrama y calendario

38. `OrgChartView.tsx` + `OrgChartNode.tsx`
39. `TeamCalendarView.tsx` + `TeamCalendarMonth.tsx`

### Fase 12: UI — Admin config

40. `LeaveTypeConfigTable.tsx` + `LeaveTypeDrawer.tsx`
41. `DepartmentConfigTable.tsx` + `DepartmentDrawer.tsx`
42. `HolidayConfigTable.tsx`

### Fase 13: Integraciones

43. Tabs nuevos en `/people/[memberId]`: Datos personales, Perfil profesional, Performance, Ausencias
44. Badge de aprobaciones pendientes en sidebar
45. Sidebar navigation completa con visibilidad condicional

---

## Criterios de aceptación

### Estructura organizacional

- [ ] `team_members` tiene campos `department_id`, `reports_to`, `job_level`, `hire_date`, `employment_type`
- [ ] Tabla `departments` existe con seed data de las unidades de negocio
- [ ] Organigrama renderiza correctamente la jerarquía de reporte
- [ ] Un colaborador sin `reports_to` muestra "Sin supervisor asignado" en su ficha

### Ficha del colaborador

- [ ] `team_members` tiene campos `identity_document_type`, `identity_document_number`, `phone`, `bank_name`, `bank_account_type`, `bank_account_number`, `health_system`, `isapre_name`, `cv_url`, `linkedin_url`, `portfolio_url`
- [ ] Tabla `member_profiles` existe con seed data inicial
- [ ] Tabla `member_performance_snapshots` existe
- [ ] HR puede ver y editar datos personales completos (identidad, bancarios, previsión)
- [ ] El colaborador ve sus propios datos con documento y cuenta bancaria enmascarados
- [ ] El colaborador puede editar su bio, skills, herramientas y links de CV/LinkedIn/portafolio
- [ ] HR puede editar oportunidades de mejora (el colaborador las ve pero no las edita)
- [ ] Las herramientas se organizan por categoría con checklist y se incluyen suites de IA como categoría propia
- [ ] Los tipos de pieza se contextualizan al `output_type` del colaborador
- [ ] Performance muestra RpA y OTD% actuales con semáforos y trends
- [ ] Performance muestra gráficos de evolución por mes (últimos 12 meses)
- [ ] Performance muestra distribución de piezas por tipo (para diseñadores)
- [ ] El snapshot mensual se puede generar manualmente y se calcula desde `notion_ops`
- [ ] `health_system` (Fonasa/Isapre) se selecciona en la ficha de persona; la tasa específica de cálculo vive en `compensation_versions`

### Permisos

- [ ] Colaborador puede solicitar permiso desde `/hr/my-leave`
- [ ] La solicitud valida saldo, anticipación, overlap, y régimen aplicable (server-side)
- [ ] Si `requires_approval = TRUE` y `reports_to` existe → status = `pending_supervisor`
- [ ] Si `requires_approval = FALSE` → status = `pending_hr` (salta supervisor)
- [ ] Si `reports_to IS NULL` → status = `pending_hr` (no hay supervisor)
- [ ] Supervisor ve solicitudes pendientes en `/hr/approvals` con badge en sidebar
- [ ] Supervisor puede aprobar/rechazar. Rechazar requiere motivo.
- [ ] HR puede validar/rechazar solicitudes en `pending_hr`
- [ ] Al aprobar: `pending_days` baja, `used_days` sube, se crean `attendance_records` con `on_leave`
- [ ] Al rechazar: `pending_days` baja
- [ ] Al cancelar: solo el solicitante, solo si pendiente
- [ ] Al revocar: solo HR, solo si aprobada, motivo obligatorio, devuelve días
- [ ] `approval_actions` registra cada acción (append-only)
- [ ] Saldos se pueden inicializar por año con `/initialize-year`

### Asistencia

- [ ] Webhook de Teams recibe `callRecord` y registra participación en daily
- [ ] Deduplicación por `source_event_id`
- [ ] Matching de participantes por email contra `team_members`
- [ ] Solo meetings que matcheen keyword ("daily", "standup") se procesan
- [ ] HR puede hacer override manual de cualquier registro
- [ ] Dashboard muestra tasa de asistencia y participación en dailies por persona
- [ ] Grid diario muestra dots de color por status

### Acceso

- [ ] Route group `employee` existe y se asigna a colaboradores internos
- [ ] Un colaborador sin reportes directos NO ve `/hr/approvals`
- [ ] Un colaborador solo ve sus propios permisos y asistencia
- [ ] HR ve todo
- [ ] Admin ve todo
- [ ] Un cliente (`client`) recibe 403 al intentar acceder a `/hr/*`

### Calendario de equipo

- [ ] Muestra permisos aprobados + feriados por país + ausencias registradas
- [ ] Filtrable por departamento y tipo de permiso
- [ ] Un colaborador puede ver el calendario (transparencia operativa)

---

## Lo que NO incluye esta tarea

- Notificaciones push / email cuando se aprueba o rechaza un permiso (fase 2)
- Integración con Google Calendar para bloquear agenda del colaborador ausente
- Cálculo automático de antigüedad para días progresivos de vacaciones
- Self-service para que el colaborador corrija su propia asistencia
- Reportes exportables de asistencia (CSV/XLSX) — se puede agregar reutilizando el patrón de export de payroll
- Política de carry-over automático de vacaciones — HR lo hace manual con `/leave-balances/[id]` PATCH
- Time tracking (horas trabajadas por día) — solo se registra participación en daily
- Integración automática de ausencias con cálculo de payroll (informativo por ahora)
- App móvil para solicitar permisos
- Flujo de aprobación para otros objetos que no sean permisos (extensible en el futuro)
- Evaluaciones formales de desempeño con scoring/rating — solo se registra fecha, notas y quién evaluó
- Upload de archivos de CV al portal — se almacena como URL (Google Drive, LinkedIn, etc.)
- Parsing automático de CV para extraer skills
- Catálogo maestro centralizado de herramientas/skills como tabla BigQuery — en esta fase se usan arrays JSON en `member_profiles`. Si crece, se puede migrar a tablas de catálogo
- Encriptación at-rest de datos sensibles (documento de identidad, cuenta bancaria) más allá de lo que GCP provee por defecto

---

## Notas para el agente

- **Fase de descubrimiento es OBLIGATORIA.** No escribas `ALTER TABLE` sin primero verificar qué columnas ya existen en `team_members`.
- **Route group `employee` es nuevo.** Lee `authorization.ts` y `GREENHOUSE_IDENTITY_ACCESS_V1.md` para crear un route group nuevo sin romper los existentes. El patrón más limpio es que `employee` se asigne automáticamente a todo usuario con email `@efeonce.org` o `@efeoncepro.com`.
- **El sublayout de `/hr/` debe soportar tres niveles:** `employee` (solo `/my-leave`, `/my-attendance`, `/team-calendar`, `/org-chart`), `hr` (todo), `efeonce_admin` (todo). No uses un solo guard — cada page necesita validar su propio nivel.
- **Las mutations de BigQuery no son atómicas.** Las operaciones de aprobación (actualizar `leave_requests` + actualizar `leave_balances` + insertar `approval_actions` + insertar `attendance_records`) deben ser idempotentes. Si falla a mitad de camino, debe poder re-ejecutarse sin corromper datos.
- **Business days:** La función `business-days.ts` debe consultar `greenhouse.holidays` filtrando por el país del colaborador (`location_country` en `team_members`). No asumir que todos están en Chile.
- **Webhook de Teams:** El endpoint NO usa sesión NextAuth — es un webhook externo autenticado por `clientState`. Validar el shared secret antes de procesar cualquier payload. Los payloads de Graph pueden ser grandes — procesar solo los campos necesarios.
- **Colores:** Usar `GH_COLORS`, `GH_ATTENDANCE_COLORS` y `GH_PERFORMANCE_COLORS` del archivo de nomenclatura. No hardcodear hex.
- **Formateo de fechas:** Usar `es-CL` como locale por defecto. Fechas en formato `dd/MM/yyyy` o `d de MMMM` según contexto.
- **Datos sensibles:** `identity_document_number` y `bank_account_number` se enmascaran en la API para el propio colaborador. La API retorna el valor completo solo si el caller tiene route group `hr` o `efeonce_admin`. No confiar en enmascaramiento frontend — la lógica es server-side.
- **Relación `health_system` ↔ `compensation_versions`:** `team_members.health_system` es "a qué sistema pertenece" (Fonasa, Isapre, N/A). `compensation_versions.health_system` + `health_plan_uf` es el snapshot para el cálculo de nómina. Si HR cambia la Isapre del colaborador en la ficha personal, eso NO cambia automáticamente la `compensation_version` — HR debe crear una nueva versión en payroll con los nuevos valores. No automatizar este cruce.
- **JSON arrays en `member_profiles`:** Los campos de skills y herramientas se almacenan como `STRING` con JSON serializado. Siempre parsear con `JSON.parse()` en la API y siempre serializar con `JSON.stringify()` antes de guardar. Validar que el parse no falle — si el campo es NULL o string vacío, retornar array vacío.
- **Performance calculator:** Reutilizar el patrón de match de identidad de `fetch-kpis-for-period.ts` (payroll). Usa `identity_profile_id` → `notion_user_id` → fallback manual. NO reimplementar.
- **El salario base vive en `compensation_versions`, NO en `team_members`.** Este módulo no toca payroll. Si alguien busca el salario de una persona, tiene que ir al tab "Compensación" de People, que lee de payroll.
- **Branch naming:** `feature/hr-core`.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo. Referencia normativa para implementación.*
