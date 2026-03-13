# CODEX TASK — Sistema de Identidad y Capacidad del Equipo

## Resumen

Implementar el sistema completo de identidad del equipo Efeonce en el portal Greenhouse. Incluye: dos tablas nuevas en BigQuery (`greenhouse.team_members` y `greenhouse.client_team_assignments`), una API route para servir datos de equipo y capacidad, un cambio al pipeline `notion-bq-sync` para incluir el campo Responsable, y 5 vistas/componentes en el portal que consumen esta data.

**Este sistema resuelve dos necesidades distintas:** la relacional (quién es mi equipo, cómo los contacto) y la operativa (cuánta capacidad tengo, quién está haciendo qué). Cada necesidad vive en un espacio diferente del portal.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/team-identity-capacity`
- **Framework:** Next.js 14+ (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **UI Library:** MUI (Material UI) v5
- **Charts:** ApexCharts (incluido en Vuexy)
- **Deploy:** Vercel (auto-deploy desde `main`, preview desde feature branches)
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`
- **BigQuery datasets relevantes:** `greenhouse`, `notion_ops`, `hubspot_crm`

---

## Dependencias previas

Esta tarea asume que lo siguiente ya está implementado o en progreso:

- [ ] Auth con NextAuth.js funcionando (CODEX_TASK_Microsoft_SSO_Greenhouse.md)
- [ ] Dataset `greenhouse` creado en BigQuery
- [ ] Tabla `greenhouse.clients` creada con el schema de la spec SSO
- [ ] Service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con acceso a BigQuery
- [ ] Pipeline `notion-bq-sync` operativo sincronizando `notion_ops.tareas`, `notion_ops.proyectos`, `notion_ops.sprints`
- [ ] `greenhouse-nomenclature.ts` actualizado con `GH_TEAM`, `GH_COLORS` y extensiones de `GH_MESSAGES` según Nomenclatura Portal v3 (secciones 8, 13.1 y 14)

---

## Arquitectura de identidad del equipo

### Principio rector

Greenhouse es la fuente de verdad para la **asociación** (quién está asignado a qué cliente con cuánto FTE). Cada sistema externo sigue siendo fuente de verdad de sus propios atributos:

| Sistema | Fuente de verdad de | ID que aporta |
|---|---|---|
| Azure AD (Entra ID) | Identidad corporativa: email, nombre, foto, cargo | `azure_oid` (Object ID) |
| Notion | Asignación operativa: quién es responsable de qué tarea | `notion_user_id` (people property) |
| HubSpot | Ownership comercial: quién es owner de qué deal/contact | `hubspot_owner_id` (owner ID) |
| **Greenhouse** | **Asociación cliente ↔ miembro: FTE, rol, relevancia, canal de contacto** | **`member_id`** |

### Match entre sistemas

El email es el denominador común. Todos los miembros del equipo Efeonce tienen email `@efeonce.org` o `@efeoncepro.com`. Azure AD tiene ese email, Notion expone el email en el people property, y HubSpot tiene el email en la tabla `owners`. El JOIN entre sistemas se hace por email cuando no hay ID directo.

Para el match Notion → `member_id` en queries operativas (Vistas 2, 3, 4), el campo Responsable de la base Tareas contiene el nombre del usuario de Notion. El pipeline `notion-bq-sync` debe extraer este campo como texto. La tabla `team_members` incluye un campo `notion_display_name` que permite hacer match por nombre cuando el `notion_user_id` no está disponible directamente.

---

## PARTE A: Infraestructura BigQuery

### A1. Crear tabla `greenhouse.team_members`

Tabla maestra de cada persona del equipo Efeonce. Se provisiona manualmente (admin panel futuro).

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.team_members` (
  -- Identificación
  member_id STRING NOT NULL,                    -- PK, slug legible: 'daniela-ferreira'
  display_name STRING NOT NULL,                 -- Nombre visible: 'Daniela Ferreira'
  email STRING NOT NULL,                        -- Email corporativo: 'daniela@efeonce.org'
  
  -- IDs externos (FKs lógicas a otros sistemas)
  azure_oid STRING,                             -- Microsoft Entra Object ID
  notion_user_id STRING,                        -- Notion people property ID
  notion_display_name STRING,                   -- Nombre tal como aparece en Notion (para match por texto)
  hubspot_owner_id STRING,                      -- HubSpot owner ID (nullable — no todos están en HS)
  
  -- Presentación (datos para la Vista 1: Dossier)
  role_title STRING NOT NULL,                   -- Cargo visible: 'Creative Operations Lead'
  role_category STRING NOT NULL,                -- Categoría: 'operations' | 'design' | 'strategy' | 'development' | 'media' | 'account'
  avatar_url STRING,                            -- URL de foto de perfil (Azure AD photo o custom)
  relevance_note STRING,                        -- Nota personalizada por cliente (template, se override en assignments)
  
  -- Contacto
  contact_channel STRING DEFAULT 'teams',       -- 'teams' | 'slack' | 'email'
  contact_handle STRING,                        -- Handle o ID del canal: '#acme-efeonce' para Teams, email para email
  
  -- Metadata
  active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A2. Crear tabla `greenhouse.client_team_assignments`

Tabla many-to-many que conecta miembros con clientes. Aquí vive la dedicación (FTE) y la relevancia personalizada por cliente.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.client_team_assignments` (
  -- Relación
  assignment_id STRING NOT NULL,                -- PK: '{client_id}_{member_id}' — ej: 'acme-corp_daniela-ferreira'
  client_id STRING NOT NULL,                    -- FK → greenhouse.clients
  member_id STRING NOT NULL,                    -- FK → greenhouse.team_members
  
  -- Dedicación
  fte_allocation FLOAT64 NOT NULL DEFAULT 1.0,  -- FTE asignado a este cliente (0.5, 1.0, etc.)
  hours_per_month INT64,                        -- Horas/mes derivadas (fte * 160). Nullable, se calcula.
  
  -- Presentación override (si difiere del default en team_members)
  role_title_override STRING,                   -- Override de cargo para este cliente (nullable)
  relevance_note_override STRING,               -- Override de nota de relevancia para este cliente
  contact_channel_override STRING,              -- Override del canal de contacto para este cliente
  contact_handle_override STRING,               -- Override del handle para este cliente
  
  -- Estado
  active BOOL DEFAULT TRUE,
  start_date DATE,                              -- Fecha de inicio de asignación
  end_date DATE,                                -- Fecha de fin (nullable para ongoing)
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A3. Insertar datos iniciales del equipo (seed data)

```sql
-- Team members del equipo Globe actual
INSERT INTO `efeonce-group.greenhouse.team_members`
  (member_id, display_name, email, role_title, role_category, contact_channel, active)
VALUES
  ('daniela-ferreira', 'Daniela Ferreira', 'daniela@efeonce.org', 'Creative Operations Lead', 'operations', 'teams', TRUE),
  ('melkin-hernandez', 'Melkin Hernandez', 'melkin@efeonce.org', 'Senior Visual Designer', 'design', 'teams', TRUE),
  ('andres-carlosama', 'Andres Carlosama', 'andres@efeonce.org', 'Senior Visual Designer', 'design', 'teams', TRUE),
  ('valentina-hoyos', 'Valentina Hoyos', 'valentina@efeonce.org', 'Account Manager', 'account', 'teams', TRUE),
  ('humberly-henriquez', 'Humberly Henriquez', 'humberly@efeonce.org', 'Content Strategist', 'strategy', 'teams', TRUE);

-- Nota: Los campos azure_oid, notion_user_id y hubspot_owner_id se llenan
-- conforme se identifican los IDs en cada sistema. El admin panel futuro
-- facilitará este proceso. Por ahora, el match operativo se hace por
-- notion_display_name (texto) y email.
```

### A4. Script SQL de referencia

Crear archivo `scripts/setup-team-tables.sql` en el repo con todo el DDL anterior documentado.

---

## PARTE B: Cambio al pipeline notion-bq-sync

### B1. Agregar campo Responsable al sync de tareas

El pipeline `notion-bq-sync` (Cloud Function en `us-central1-efeonce-group.cloudfunctions.net/notion-bq-sync`) sincroniza la base Tareas de Notion a `notion_ops.tareas`. Actualmente **no incluye** el campo Responsable (people property).

**Cambio requerido:** Agregar extracción del campo Responsable en la config de la tabla `tareas`. El people property en Notion retorna un array de objetos con `{id, name, person: {email}}`. Extraer:

| Nuevo campo en BQ | Tipo | Origen |
|---|---|---|
| `responsable_nombre` | STRING | Primer elemento del people property → `name` |
| `responsable_email` | STRING | Primer elemento → `person.email` |
| `responsable_notion_id` | STRING | Primer elemento → `id` |

**Notas de implementación:**

- El campo Responsable en Notion puede tener múltiples personas. Para MVP, extraer solo el primero (el responsable principal). Si hay más de uno, concatenar nombres separados por `;` en `responsable_nombre`.
- Si el campo está vacío, los tres campos son NULL.
- El pipeline usa schema inference dinámico — los nuevos campos aparecerán automáticamente en BigQuery al primer sync después del deploy.
- **Repo del pipeline:** `github.com/cesargrowth11/notion-frame-io.git` — NO. El pipeline notion-bq-sync es un repo separado. Verificar cuál es el repo correcto antes de modificar.

### B2. Verificar campo Responsable en Notion

Antes de modificar el pipeline, verificar que la base Tareas (`3a54f0904be14158833533ba96557a73`) tiene una propiedad de tipo People llamada "Responsable" (o nombre similar). Si el nombre es diferente, ajustar la extracción en el pipeline.

### B3. Re-deploy y sync manual

Después de modificar el pipeline:

```bash
# Deploy de la Cloud Function actualizada
./deploy.sh

# Sync manual para verificar
curl -X POST https://us-central1-efeonce-group.cloudfunctions.net/notion-bq-sync?table=tareas

# Verificar en BigQuery
SELECT responsable_nombre, responsable_email, COUNT(*) 
FROM `efeonce-group.notion_ops.tareas` 
WHERE responsable_nombre IS NOT NULL 
GROUP BY 1, 2 
ORDER BY 3 DESC;
```

---

## PARTE C: API Routes

### C1. GET /api/team/members

Retorna los miembros del equipo asignados al cliente autenticado, con sus datos de presentación.

**Lógica:**
1. Autenticar → extraer `client_id` del JWT
2. Query: JOIN `greenhouse.client_team_assignments` con `greenhouse.team_members` WHERE `client_id` = @current AND `active` = TRUE
3. Para cada miembro, aplicar overrides: si `role_title_override` no es NULL, usarlo en vez de `role_title`. Mismo para `relevance_note_override`, `contact_channel_override`, `contact_handle_override`.
4. Retornar array de miembros con sus datos de presentación.

**Query:**

```sql
SELECT
  m.member_id,
  m.display_name,
  m.email,
  m.avatar_url,
  m.role_category,
  COALESCE(a.role_title_override, m.role_title) AS role_title,
  COALESCE(a.relevance_note_override, m.relevance_note) AS relevance_note,
  COALESCE(a.contact_channel_override, m.contact_channel) AS contact_channel,
  COALESCE(a.contact_handle_override, m.contact_handle) AS contact_handle,
  a.fte_allocation,
  a.start_date
FROM `efeonce-group.greenhouse.client_team_assignments` a
JOIN `efeonce-group.greenhouse.team_members` m
  ON a.member_id = m.member_id
WHERE a.client_id = @client_id
  AND a.active = TRUE
  AND m.active = TRUE
ORDER BY 
  CASE m.role_category 
    WHEN 'account' THEN 1 
    WHEN 'operations' THEN 2 
    WHEN 'strategy' THEN 3 
    WHEN 'design' THEN 4 
    WHEN 'development' THEN 5 
    WHEN 'media' THEN 6 
    ELSE 7 
  END,
  m.display_name
```

**Respuesta:**

```typescript
interface TeamMemberResponse {
  memberId: string
  displayName: string
  email: string
  avatarUrl: string | null
  roleTitle: string
  roleCategory: string
  relevanceNote: string | null
  contactChannel: 'teams' | 'slack' | 'email'
  contactHandle: string | null
  fteAllocation: number
  startDate: string | null
}
```

### C2. GET /api/team/capacity

Retorna la capacidad contratada y la carga operativa real del equipo para el cliente autenticado.

**Lógica:**
1. Autenticar → extraer `client_id` y `notion_project_ids` del JWT
2. Obtener miembros asignados (misma query que C1, pero solo `member_id`, `display_name`, `role_category`, `fte_allocation`)
3. Obtener carga operativa por persona: contar tareas activas (estado NOT IN 'Listo', 'Cancelado') por `responsable_nombre` en `notion_ops.tareas`, filtradas por los proyectos del cliente
4. Hacer match entre miembros y carga por `notion_display_name` ↔ `responsable_nombre` (o por email si se tiene)
5. Calcular totales: FTE total contratado, horas totales (FTE * 160), horas estimadas utilizadas (basado en carga)

**Query de carga operativa:**

```sql
SELECT
  t.responsable_nombre,
  t.responsable_email,
  COUNT(*) AS total_assets,
  COUNT(CASE WHEN t.estado NOT IN ('Listo', 'Cancelado') THEN 1 END) AS active_assets,
  COUNT(CASE WHEN t.estado = 'Listo' THEN 1 END) AS completed_assets,
  AVG(CASE WHEN t.frame_versions > 0 THEN t.frame_versions END) AS avg_rpa,
  COUNT(DISTINCT t.proyecto) AS project_count
FROM `efeonce-group.notion_ops.tareas` t
WHERE t.proyecto IN UNNEST(@client_project_ids)
  AND t.responsable_nombre IS NOT NULL
GROUP BY t.responsable_nombre, t.responsable_email
```

**Query de carga por proyecto (para las barras de distribución):**

```sql
SELECT
  t.responsable_nombre,
  p.titulo AS proyecto_nombre,
  COUNT(*) AS asset_count,
  COUNT(CASE WHEN t.estado NOT IN ('Listo', 'Cancelado') THEN 1 END) AS active_count
FROM `efeonce-group.notion_ops.tareas` t
LEFT JOIN `efeonce-group.notion_ops.proyectos` p
  ON t.proyecto LIKE CONCAT('%', p.notion_page_id, '%')
WHERE t.proyecto IN UNNEST(@client_project_ids)
  AND t.responsable_nombre IS NOT NULL
GROUP BY t.responsable_nombre, p.titulo
ORDER BY t.responsable_nombre, active_count DESC
```

**Respuesta:**

```typescript
interface TeamCapacityResponse {
  summary: {
    totalFte: number
    totalHoursMonth: number
    utilizationPercent: number       // Estimado basado en carga
    memberCount: number
  }
  members: Array<{
    memberId: string
    displayName: string
    roleCategory: string
    fteAllocation: number
    activeAssets: number
    completedAssets: number
    avgRpa: number | null
    projectCount: number
    projectBreakdown: Array<{
      projectName: string
      assetCount: number
      activeCount: number
    }>
  }>
  period: string                    // Ej: 'Marzo 2026'
}
```

### C3. GET /api/team/by-project/[projectId]

Retorna los miembros del equipo que trabajan en un proyecto específico con métricas individuales.

**Lógica:**
1. Autenticar → verificar que el proyecto pertenece al cliente
2. Query: tareas de ese proyecto agrupadas por `responsable_nombre`
3. JOIN con `team_members` para enriquecer con datos de presentación

**Query:**

```sql
SELECT
  t.responsable_nombre,
  t.responsable_email,
  COUNT(*) AS total_assets,
  COUNT(CASE WHEN t.estado NOT IN ('Listo', 'Cancelado') THEN 1 END) AS active_assets,
  COUNT(CASE WHEN t.estado = 'Listo' THEN 1 END) AS completed_assets,
  AVG(CASE WHEN t.frame_versions > 0 THEN t.frame_versions END) AS avg_rpa,
  COUNT(CASE WHEN t.estado = 'Listo para revisión' THEN 1 END) AS in_review,
  COUNT(CASE WHEN t.estado = 'Cambios Solicitados' THEN 1 END) AS changes_requested
FROM `efeonce-group.notion_ops.tareas` t
WHERE t.proyecto LIKE CONCAT('%', @project_notion_id, '%')
  AND t.responsable_nombre IS NOT NULL
GROUP BY t.responsable_nombre, t.responsable_email
ORDER BY active_assets DESC
```

### C4. GET /api/team/by-sprint/[sprintId]

Retorna velocity por persona dentro de un sprint específico.

**Lógica:**
1. Autenticar → verificar que el sprint pertenece a un proyecto del cliente
2. Query: tareas del sprint agrupadas por `responsable_nombre`

**Query:**

```sql
SELECT
  t.responsable_nombre,
  t.responsable_email,
  COUNT(*) AS total_in_sprint,
  COUNT(CASE WHEN t.estado = 'Listo' THEN 1 END) AS completed,
  COUNT(CASE WHEN t.estado NOT IN ('Listo', 'Cancelado') THEN 1 END) AS pending,
  AVG(CASE WHEN t.frame_versions > 0 THEN t.frame_versions END) AS avg_rpa
FROM `efeonce-group.notion_ops.tareas` t
WHERE t.sprint LIKE CONCAT('%', @sprint_notion_id, '%')
  AND t.responsable_nombre IS NOT NULL
GROUP BY t.responsable_nombre, t.responsable_email
ORDER BY completed DESC
```

---

## PARTE D: Componentes y Vistas

### Nomenclatura Greenhouse (referencia)

Todos los textos visibles al cliente y colores de UI salen de `greenhouse-nomenclature.ts`. Este archivo ya está definido en la Nomenclatura Portal v3 (secciones 13.1 y 14). Las constantes relevantes para este task son:

- `GH_TEAM` — labels y copy de las 4 vistas de equipo (secciones 8.1–8.4 de Nomenclatura)
- `GH_MESSAGES` — empty states, tooltips (incluyendo `empty_team`, `empty_capacity`, `tooltip_utilization`)
- `GH_COLORS.role` — colores por `role_category` para avatares, badges, bloques de relevancia
- `GH_COLORS.semaphore` — semáforos ICO para RpA y utilización
- `GH_COLORS.semantic.warning` — CTA de upselling
- `GH_COLORS.service` — badges de línea de servicio

**Este task NO define constantes nuevas.** Todo lo que necesita ya está en la Nomenclatura v3. Si Codex no encuentra `GH_TEAM` o `GH_COLORS` en el archivo, debe implementar primero la sección 13.1 de la Nomenclatura Portal v3.

### D1. Vista 1 — Tu equipo de cuenta (Mi Greenhouse / Settings)

**Ubicación:** `/settings` → sección dentro de la página Mi Greenhouse
**Ruta técnica:** Componente `TeamDossier.tsx` renderizado en la página de settings
**Prioridad:** P1 (post-MVP, pero antes de capabilities)

**Descripción:** Dossier relacional del equipo. El cliente ve quiénes son las personas que trabajan para su cuenta, por qué son relevantes, y cómo contactarlas directamente. Es la digitalización del dossier de equipo del sistema Greenhouse.

**Layout:**

Grid de 2 columnas con cards de personas. Cada card incluye:
- Avatar (foto de Azure AD vía `avatar_url`, fallback a iniciales con color por `role_category`)
- Nombre + cargo
- Bloque de relevancia: fondo de color suave (por `role_category`) con la `relevance_note` personalizada
- Canales de contacto: ícono + nombre del canal + handle. Puede ser Teams, Slack o email según el `contact_channel`
- No muestra FTE individual ni métricas operativas — eso vive en la Vista 2

**Ghost slot (último elemento del grid):**
- Card con borde dashed, fondo `background-secondary`
- Ícono "+" centrado
- Texto: "Ampliar equipo" / "Agrega capacidad creativa, de medios o tecnología."
- Click dispara el modal de solicitud de expansión (mismo modal del dashboard, ver CODEX_TASK_Client_Dashboard_Redesign.md sección ghost slot)
- Solo visible si hay al menos 1 persona asignada

**Footer de la sección:**
- Barra con tres datos en fila: Línea de servicio (badge), Modalidad (On-Going/On-Demand), Equipo total (X.X FTE)
- Los datos de línea de servicio y modalidad vienen del JOIN con `hubspot_crm.companies` (misma lógica de Capabilities Architecture)

**Data source:** `GET /api/team/members`

**Colores:** Todos los colores de este módulo salen de `GH_COLORS` en `greenhouse-nomenclature.ts` (definido en Nomenclatura Portal v3, sección 14). No se definen colores en este documento — la fuente de verdad es la nomenclatura.

Referencia rápida para este task:

| Uso | Constante | Ejemplo |
|---|---|---|
| Avatar por role_category | `GH_COLORS.role[category].bg` (fondo), `.text` (iniciales) | `GH_COLORS.role.design.bg` → #f9ecf1 |
| Bloque de relevancia | `GH_COLORS.role[category].bg` (fondo), `.text` (texto) | `GH_COLORS.role.operations.text` → #024c8f |
| Semáforo RpA / utilización | `GH_COLORS.semaphore.green/yellow/red` | `GH_COLORS.semaphore.red.text` → #bb1954 |
| Badge de línea de servicio | `GH_COLORS.service[line].bg` (fondo), `.text` (texto) | `GH_COLORS.service.globe.bg` → #f9ecf1 |
| CTA de upselling | `GH_COLORS.semantic.warning.bg` (fondo), `.text` (acento) | `GH_COLORS.semantic.warning.bg` → #fff2ea |
| Textos neutrales | `GH_COLORS.neutral.textPrimary` / `.textSecondary` | `GH_COLORS.neutral.textPrimary` → #022a4e |

**Componentes Vuexy a usar:**
- `Card` + `CardContent` para cada persona
- `Avatar` con iniciales como fallback
- `Chip` para badges de línea de servicio
- `Grid` de 2 columnas responsive (1 columna en mobile)
- `Dialog` para modal de solicitud de expansión (reutilizar del dashboard)

---

### D2. Vista 2 — Capacidad del equipo (Pulse / Dashboard)

**Ubicación:** `/dashboard` → sección debajo de los charts, arriba de "Tu equipo" existente
**Ruta técnica:** Componente `TeamCapacity.tsx` renderizado en el dashboard
**Prioridad:** P1

**Descripción:** Card operativa que muestra la capacidad contratada, la utilización actual, y la carga por persona con distribución por proyecto. Es la vista que permite al cliente entender si su equipo está disponible o saturado.

**Layout:**

Card única con tres zonas:

**Zona 1 — KPI strip (fila de 3 métricas):**

| Métrica | Cálculo | Visualización |
|---|---|---|
| Capacidad contratada | SUM(fte_allocation) de assignments activos | Número grande + "FTE" como sufijo |
| Horas este mes | Capacidad * 160 / horas usadas estimadas | "X / Yh" |
| Utilización | % estimado basado en carga vs capacidad | Porcentaje con color semáforo |

Semáforo de utilización: ≤70% `GH_COLORS.semaphore.green`, 71-89% `GH_COLORS.semaphore.yellow`, ≥90% `GH_COLORS.semaphore.red`.

**Zona 2 — Carga por persona:**

Lista vertical. Cada persona muestra:
- Avatar pequeño (28px) con iniciales + nombre + categoría de rol
- A la derecha: conteo de assets activos + conteo de proyectos
- Debajo: barra horizontal segmentada mostrando distribución de assets por proyecto (cada segmento de color diferente con nombre del proyecto adentro)
- Si una persona tiene assets activos > promedio * 1.5, mostrar el conteo en `GH_COLORS.semaphore.red.text`

**Zona 3 — CTA de upselling (condicional):**

Banner con fondo `GH_COLORS.semantic.warning.bg` que solo aparece si la utilización ≥ 85%. Contenido:
- Título: "Tu equipo está al {X}% de capacidad este mes"
- Subtítulo: "Si tienes necesidades adicionales, puedes sumar capacidad On-Demand sin afectar tu equipo actual."
- Botón: "Ampliar capacidad" → abre el mismo modal de solicitud de expansión

Si la utilización < 85%, el CTA no se renderiza.

**Data source:** `GET /api/team/capacity`

**Componentes Vuexy a usar:**
- `Card` con `CardHeader` para el título
- `LinearProgress` con label custom para la barra de utilización general
- `Box` con flex layout para cada persona
- `Tooltip` en el porcentaje de utilización explicando el cálculo
- `Alert` variante `outlined` con severity `warning` para el CTA de upselling (o un `Box` custom con colores amber)

---

### D3. Vista 3 — Equipo en proyecto (Proyectos/[id])

**Ubicación:** `/proyectos/[id]` → sección en el header del proyecto, debajo del nombre y estado
**Ruta técnica:** Componente `ProjectTeam.tsx` renderizado en la vista de detalle de proyecto
**Prioridad:** P1

**Descripción:** Muestra quiénes del equipo están trabajando en este proyecto específico, con métricas individuales dentro del contexto del proyecto.

**Layout:**

Sección compacta con avatares inline y un expandible con detalle.

**Vista colapsada (default):**
- Fila de avatares circulares (32px) apilados con overlap estilo GitHub/Figma
- Al lado: "X personas trabajando en este proyecto"
- Click expande el detalle

**Vista expandida:**

Tabla simple (o lista) con una fila por persona:

| Columna | Dato |
|---|---|
| Persona | Avatar + nombre |
| Assets activos | Conteo de tareas activas en este proyecto |
| Completados | Conteo de tareas completadas |
| RpA | Promedio de RpA individual en este proyecto |
| En revisión | Conteo de tareas en "Listo para revisión" |

El RpA individual tiene semáforo: ≤1.5 verde (Óptimo), ≤2.5 amarillo (Atención), >2.5 rojo (Alerta).

**Data source:** `GET /api/team/by-project/[projectId]`

**Componentes Vuexy a usar:**
- `AvatarGroup` de MUI para avatares colapsados
- `Collapse` o `Accordion` para expandir
- `Table` simple de MUI con `TableHead`, `TableBody`, `TableRow`, `TableCell`
- `Chip` con color de semáforo para RpA individual

---

### D4. Vista 4 — Velocity por persona (Ciclos/[id])

**Ubicación:** `/sprints/[id]` → sección dentro del detalle de sprint
**Ruta técnica:** Componente `SprintTeamVelocity.tsx` renderizado en la vista de detalle de sprint
**Prioridad:** P2

**Descripción:** Rendimiento de cada persona dentro del sprint activo. Cuántos assets completó, cuántos le quedan, y su RpA en el contexto del ciclo.

**Layout:**

Card con una fila por persona y mini-progress bar:

| Persona | Completados / Total | Progreso | RpA |
|---|---|---|---|
| Avatar + nombre | "8 / 12" | Progress bar al 67% | 1.4 |

La progress bar usa colores semáforo basados en el % de completitud relativo a los días restantes del sprint:
- Si % completitud >= % tiempo transcurrido → verde (va bien)
- Si % completitud < % tiempo transcurrido → amarillo (va lento)
- Si diferencia > 20 puntos → rojo (en riesgo)

**Data source:** `GET /api/team/by-sprint/[sprintId]`

**Componentes Vuexy a usar:**
- `LinearProgress` con `variant="determinate"` para cada persona
- `Card` + `CardContent`
- `Typography` para los conteos
- `Chip` para semáforo de RpA

---

### D5. Vista 5 — Tu año con Efeonce, sección equipo (futuro P3)

**Ubicación:** Vista generada bajo demanda (artefacto de renovación)
**Ruta técnica:** Componente `YearReviewTeam.tsx` — no se implementa en esta tarea
**Prioridad:** P3

**Descripción:** Resumen acumulado de quién trabajó en la cuenta del cliente durante el año. Se documenta aquí para contexto pero NO se implementa en esta tarea.

**Datos que necesitará (para diseño futuro de queries):**
- Total de assets entregados por persona (acumulado del año)
- RpA promedio anual por persona
- Evolución de la composición del equipo (quién entró, quién salió durante el año)
- Comparativa de productividad por trimestre

**Nota:** Esta vista se genera como artefacto estático (PDF o HTML compartible), no como vista live del portal. Requiere lógica de generación que no existe aún. Se documenta aquí para que las tablas `team_members` y `client_team_assignments` estén diseñadas con los campos necesarios.

---

## PARTE E: Estructura de archivos resultante

```
src/
├── app/
│   ├── api/
│   │   └── team/
│   │       ├── members/
│   │       │   └── route.ts                    # GET /api/team/members
│   │       ├── capacity/
│   │       │   └── route.ts                    # GET /api/team/capacity
│   │       ├── by-project/
│   │       │   └── [projectId]/
│   │       │       └── route.ts                # GET /api/team/by-project/[id]
│   │       └── by-sprint/
│   │           └── [sprintId]/
│   │               └── route.ts                # GET /api/team/by-sprint/[id]
│   └── ...
├── components/
│   └── team/
│       ├── TeamDossier.tsx                     # Vista 1: Mi Greenhouse
│       ├── TeamCapacity.tsx                    # Vista 2: Pulse
│       ├── ProjectTeam.tsx                     # Vista 3: Detalle proyecto
│       ├── SprintTeamVelocity.tsx              # Vista 4: Detalle sprint
│       ├── TeamMemberCard.tsx                  # Card reutilizable de persona
│       ├── TeamAvatarGroup.tsx                 # Avatares apilados
│       ├── CapacityBar.tsx                     # Barra de utilización
│       ├── PersonLoadBar.tsx                   # Barra segmentada de carga por proyecto
│       └── UpsellBanner.tsx                    # CTA condicional de expansión
├── config/
│   └── greenhouse-nomenclature.ts              # Labels, mensajes, equipo Y colores (GH_COLORS). Todo en un archivo.
├── lib/
│   └── team-queries.ts                         # Query builders para BigQuery
├── types/
│   └── team.ts                                 # Interfaces TypeScript
└── ...
scripts/
└── setup-team-tables.sql                       # DDL de las tablas
```

---

## PARTE F: Orden de ejecución

### Fase 1: Infraestructura (sin dependencia de UI)
1. Crear tablas en BigQuery (A1, A2)
2. Insertar seed data (A3)
3. Crear script SQL de referencia (A4)
4. Modificar pipeline notion-bq-sync para incluir Responsable (B1, B2, B3)

### Fase 2: API (requiere Fase 1 + Auth)
5. Crear types TypeScript (`src/types/team.ts`)
6. Crear query builders (`src/lib/team-queries.ts`)
7. Implementar `GET /api/team/members` (C1)
8. Implementar `GET /api/team/capacity` (C2)
9. Implementar `GET /api/team/by-project/[id]` (C3)
10. Implementar `GET /api/team/by-sprint/[id]` (C4)

### Fase 3: Componentes base (requiere Fase 2)
11. Actualizar `src/config/greenhouse-nomenclature.ts` con `GH_TEAM` y `GH_COLORS` (según Nomenclatura Portal v3, secciones 8 y 14)
12. Crear `TeamMemberCard.tsx` (reutilizable)
12. Crear `TeamMemberCard.tsx` (reutilizable)
13. Crear `TeamAvatarGroup.tsx` (reutilizable)
14. Crear `CapacityBar.tsx` (reutilizable)
15. Crear `PersonLoadBar.tsx` (reutilizable)
16. Crear `UpsellBanner.tsx` (reutilizable, condicional)

### Fase 4: Vistas (requiere Fase 3)
17. Implementar Vista 1 `TeamDossier.tsx` y montar en `/settings`
18. Implementar Vista 2 `TeamCapacity.tsx` y montar en `/dashboard`
19. Implementar Vista 3 `ProjectTeam.tsx` y montar en `/proyectos/[id]`
20. Implementar Vista 4 `SprintTeamVelocity.tsx` y montar en `/sprints/[id]`

---

## Criterios de aceptación

### Infraestructura:
- [ ] Tabla `greenhouse.team_members` creada con el schema especificado
- [ ] Tabla `greenhouse.client_team_assignments` creada con el schema especificado
- [ ] Seed data insertado para el equipo Globe actual (mínimo 3 personas)
- [ ] Script SQL documentado en `scripts/setup-team-tables.sql`
- [ ] Pipeline `notion-bq-sync` actualizado para incluir `responsable_nombre`, `responsable_email`, `responsable_notion_id` en `notion_ops.tareas`
- [ ] Sync manual ejecutado y verificado — campos de responsable visibles en BigQuery

### API:
- [ ] `GET /api/team/members` retorna miembros del equipo del cliente autenticado con datos de presentación
- [ ] `GET /api/team/capacity` retorna FTE contratados, utilización estimada, y carga por persona con distribución por proyecto
- [ ] `GET /api/team/by-project/[id]` retorna métricas individuales por persona en el contexto de un proyecto
- [ ] `GET /api/team/by-sprint/[id]` retorna velocity por persona en el contexto de un sprint
- [ ] Todas las API routes validan autenticación y filtran por `client_id`
- [ ] Match entre `responsable_nombre` de BQ y `display_name` / `notion_display_name` de `team_members` funciona correctamente

### Vista 1 — Tu equipo de cuenta (Mi Greenhouse):
- [ ] Grid de 2 columnas con card por persona (responsive a 1 columna en mobile)
- [ ] Cada card muestra: avatar, nombre, cargo, bloque de relevancia personalizada, canales de contacto
- [ ] Ghost slot "Ampliar equipo" como último elemento, solo visible si hay ≥1 persona
- [ ] Click en ghost slot abre modal de solicitud de expansión
- [ ] Footer con Línea de servicio (badge), Modalidad, FTE total
- [ ] Colores de avatar/badge consistentes por `role_category`

### Vista 2 — Capacidad del equipo (Pulse):
- [ ] Strip de 3 KPIs: Capacidad contratada (FTE), Horas este mes, Utilización (%)
- [ ] Utilización con semáforo: ≤70% verde, 71-89% amarillo, ≥90% rojo
- [ ] Carga por persona con conteo de assets activos + proyectos
- [ ] Barra segmentada de distribución de carga por proyecto para cada persona
- [ ] CTA de upselling solo aparece si utilización ≥ 85%
- [ ] CTA con banner amber + botón "Ampliar capacidad" → modal de solicitud

### Vista 3 — Equipo en proyecto:
- [ ] Avatares apilados con conteo "X personas trabajando en este proyecto"
- [ ] Expandible con tabla: persona, assets activos, completados, RpA, en revisión
- [ ] RpA individual con semáforo (≤1.5 verde, ≤2.5 amarillo, >2.5 rojo)

### Vista 4 — Velocity por persona (Ciclos):
- [ ] Card con fila por persona: completados/total, progress bar, RpA
- [ ] Progress bar con color contextual basado en % completitud vs % tiempo transcurrido del sprint

### UX Writing e idioma:
- [ ] Todos los textos visibles salen de `GH_TEAM` y `GH_MESSAGES` en `greenhouse-nomenclature.ts` — cero strings hardcodeados
- [ ] Todos los colores salen de `GH_COLORS` en `greenhouse-nomenclature.ts` — cero hex hardcodeados en componentes
- [ ] No existe archivo `greenhouse-colors.ts` separado — todo vive en `greenhouse-nomenclature.ts` (fuente de verdad única)
- [ ] Colores de role_category alineados a Efeonce Core Palette vía `GH_COLORS.role` (Nomenclatura v3, sección 14.3)
- [ ] Semáforos usan `GH_COLORS.semaphore` — Neon Lime, Sunset Orange, Crimson Magenta (no rojo/amarillo/verde genérico)
- [ ] CTA de upselling usa `GH_COLORS.semantic.warning` como base
- [ ] Tratamiento "tú" consistente. Cero "usted", cero "vos"
- [ ] Empty states diseñados para cada vista cuando no hay data
- [ ] Spanglish natural: FTE, assets, feedback, On-Demand se dejan en inglés

### Calidad técnica:
- [ ] Skeleton loaders en cada sección al cargar
- [ ] Error boundary por componente — si una vista falla, las demás siguen
- [ ] Responsive funcional en desktop (1440px+), tablet (1024px) y mobile (768px)
- [ ] Tooltips accesibles por teclado en métricas con semáforo

---

## Lo que NO incluye esta tarea

- Vista 5 (Tu año con Efeonce) — documentada pero es P3 futuro
- Admin panel para CRUD de team_members y assignments — tarea separada
- Sync automático de Azure AD → team_members (foto, cargo) — manual por ahora
- Sync automático de HubSpot owners → team_members — manual por ahora
- Lógica de estimación precisa de horas utilizadas — MVP usa conteo de assets como proxy de carga, no un time tracking real
- Notificación al owner cuando un cliente solicita expansión desde el CTA — tarea separada

---

## Notas técnicas

- **Match por nombre es frágil.** El campo `responsable_nombre` de Notion es texto libre. Si alguien se llama "Daniela Ferreira" en Notion y "Daniela Ferreira C." en `team_members`, el match falla. Mitigación: el campo `notion_display_name` en `team_members` debe ser exactamente como aparece en Notion. A futuro, usar `notion_user_id` (UUID) como match definitivo.
- **Utilización es estimada, no exacta.** Sin time tracking real, la utilización se calcula como proxy basado en el ratio de assets activos vs capacidad esperada. La fórmula sugerida: `(active_assets_count / expected_monthly_throughput) * 100`, donde `expected_monthly_throughput` se configura por `role_category` (ej: un designer produce ~20 assets/mes, un ops lead gestiona ~30). Estos benchmarks se pueden guardar en `team_members` como campo `expected_monthly_throughput` o calcularse desde datos históricos.
- **role_category importa para el orden.** El equipo se muestra ordenado: primero account (si hay), luego operations, strategy, design, development, media. Esto refleja la jerarquía de contacto — el cliente contacta primero al account manager o al ops lead, no al diseñador directamente.
- **Los overrides por cliente son opcionales.** Si un miembro tiene la misma nota de relevancia para todos sus clientes, no se necesita override. Solo se usa `relevance_note_override` cuando hay algo específico que decir para ese cliente en particular (ej: "Experiencia en tu industria farmacéutica").

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico para agentes de desarrollo. Referencia normativa para implementación.*
