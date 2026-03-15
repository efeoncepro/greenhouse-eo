# CODEX TASKS — Actualización de Alineación con Estado Real del Repo

## Documento de actualización consolidado

**Efeonce Group — Marzo 2026 — CONFIDENCIAL**

**Propósito:** Este documento actualiza los 10 CODEX tasks existentes para alinearlos con el estado real del repositorio `greenhouse-eo` (46 commits en `main` al 14 de marzo 2026). Cada sección identifica qué cambió, qué ya se implementó, y qué instrucciones deben ajustarse antes de pasar el task a un agente.

**Fuente de verdad del estado actual:** `README.md` del repo + docs internos del repo (`docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`, `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`, `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`, `docs/architecture/MULTITENANT_ARCHITECTURE.md`, `docs/roadmap/PHASE_TASK_MATRIX.md`, `Handoff.md`, `project_context.md`).

---

## Deltas globales que afectan a TODOS los tasks

Estos cambios aplican transversalmente. Cada task que los referencie debe actualizarse:

### Stack actualizado

| Atributo | CODEX tasks dicen | Repo real |
|---|---|---|
| Next.js | 14+ | **16.1.1** |
| React | 18.x (implícito) | **19.2.3** |
| MUI | v5 | **v7.x** |
| Package manager | pnpm | pnpm (correcto) |
| TypeScript | 5.x (implícito) | **5.9.3** |

**Acción para todos los tasks:** Reemplazar `Next.js 14+` por `Next.js 16.1.1`, `MUI (Material UI) v5` por `MUI 7.x`, y `React 18` por `React 19.2.3`. Esto puede impactar imports de MUI Lab, patrones de Server Components, y APIs de hooks.

### Modelo de autenticación superado

| Atributo | CODEX tasks asumen | Repo real |
|---|---|---|
| Tabla de auth | `greenhouse.clients` con email + password_hash | **`greenhouse.client_users`** con bcrypt + roles + scopes |
| Modelo de roles | `role: 'client' \| 'admin'` en clients | **Tablas separadas:** `client_users`, `roles`, `user_role_assignments`, `user_project_scopes`, `user_campaign_scopes` |
| Auth runtime | NextAuth.js con credentials provider únicamente | NextAuth.js con **password_hash bcrypt** operativo para demo client y admin |
| Tenants | Schema simple en `greenhouse.clients` | **9 tenants bootstrap** desde HubSpot (deals closedwon) + `getTenantContext()` con `businessLines` y `serviceModules` |
| Feature flags | No existe | Tabla **`greenhouse.client_feature_flags`** creada |
| Audit | No existe | Tabla **`greenhouse.audit_events`** creada |

**Acción para todos los tasks:** Cualquier referencia a `greenhouse.clients` como tabla de auth debe cambiarse a `greenhouse.client_users`. La sesión ya expone más datos de los que los tasks originales asumían. Los tasks de SSO (Microsoft y Google) deben verificar si su schema de migración ya fue absorbido por `client_users`.

### Rutas admin ya implementadas

| Ruta | CODEX tasks asumen | Repo real |
|---|---|---|
| `/admin` | No existe o "futuro" | **Existe** con slices reales |
| `/admin/users` | No existe | **Existe** con data de BigQuery |
| `/admin/users/[id]` | No existe | **Existe** con tabs overview/security/billing reinterpretados |
| `/admin/roles` | No existe | **Existe** con patrones Vuexy sobre BigQuery |
| `/admin/tenants` | No existe | **Existe** como governance de empresa/tenant |
| `/admin/tenants/[id]` | No existe | **Existe** como slice real de governance |
| `/auth/landing` | No existe | **Existe** como redirect post-login por `portalHomePath` |
| `/internal/dashboard` | No existe | **Existe** con guard server-side |

**Acción:** Los tasks que proponen crear admin panels (Team Identity, Agency Operator) deben extender las superficies admin existentes, no crear rutas nuevas paralelas.

### Dashboard ejecutivo ya avanzado

El dashboard ya no es un placeholder de 4 KPI cards. Estado actual:

- Hero con gradiente, chips de capabilities por tenant
- Cards ejecutivas de throughput, salud on-time, mix operativo, esfuerzo
- Secciones reusables de account team, capacity inicial, tooling, quality
- Composición dinámica por `businessLines` y `serviceModules` del tenant
- Tenure de relación, on-time mensual, entregables/ajustes por mes
- La capa reusable combina BigQuery real + señales de Notion + overrides por tenant

**Acción:** El CODEX_TASK_Client_Dashboard_Redesign ya no parte de un dashboard primitivo. El diagnóstico visual (CODEX_TASK_Client_Dashboard_Visual_Diagnosis) sigue siendo válido porque describe bugs específicos de la implementación actual.

### Service modules operativos

- `getTenantContext()` ya expone `businessLines` y `serviceModules`
- Schema en `bigquery/greenhouse_service_modules_v1.sql`
- Bootstrap desde deals closedwon en `bigquery/greenhouse_service_module_bootstrap_v1.sql`
- El dashboard ya compone narrativa por serviceModules

**Acción:** El `docs/tasks/complete/CODEX_TASK_Creative_Hub_Module.md` ya no necesita asumir que capabilities no existe. El Capability Registry puede estar parcialmente implementado. Verificar contra `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md` en el repo.

### Componentes Greenhouse como capa propia

El repo define:
- `src/components/greenhouse/*` como capa compartida de UI
- `src/views/greenhouse/<modulo>/*` para composición por módulo
- Regla: antes de crear card/heading/badge nuevo, verificar si debe vivir en `components/greenhouse`

**Acción:** Todos los tasks que crean componentes deben respetar esta convención. No crear componentes ad hoc por vista.

---

## Task 1: `docs/tasks/complete/CODEX_TASK_Microsoft_SSO_Greenhouse.md`

### Estado vs repo

| Ítem | Task dice | Repo real |
|---|---|---|
| Auth base | No existe, implementar desde cero | **NextAuth.js operativo** con credentials + bcrypt |
| Tabla `greenhouse.clients` | Crear con schema SSO | **Superada por `client_users`** con schema más completo |
| Azure AD Client ID | Documentado | Probablemente en Vercel env vars |
| Login page | Crear desde cero | **Existe** funcional |

### Cambios requeridos

1. **Verificar si Microsoft SSO ya fue mergeado.** El README dice "el demo client y el admin interno ya autentican con password_hash bcrypt" pero no menciona SSO explícitamente. Si no fue implementado, el task sigue válido pero debe:
   - Trabajar sobre `client_users` (no `clients`)
   - Respetar la estructura de roles/scopes existente
   - No recrear la página de login — extenderla con botón Microsoft
2. **Stack:** Cambiar MUI v5 → v7, Next.js 14+ → 16.1.1
3. **Schema:** La migración DDL debe ser ALTER TABLE sobre `client_users`, no CREATE TABLE nueva

### Veredicto: PARCIALMENTE VÁLIDO — requiere revisión de dependencias contra estado actual de auth

---

## Task 2: `docs/tasks/complete/CODEX_TASK_Google_SSO_Greenhouse.md`

### Estado vs repo

Este task ya asume que Microsoft SSO existe ("Microsoft SSO y Credentials ya están implementados"). Es incremental.

### Cambios requeridos

1. **Tabla:** Cambiar `greenhouse.clients` → `greenhouse.client_users`
2. **Stack:** MUI v5 → v7, Next.js 14+ → 16.1.1
3. **Login page reference:** El task referencia `src/views/Login.tsx` — verificar path actual en el repo
4. **Archivos de auth:** El task referencia `src/lib/auth.ts` — verificar si sigue siendo el path

### Veredicto: VÁLIDO con ajustes menores de paths y tabla

---

## Task 3: `docs/tasks/to-do/CODEX_TASK_Typography_Hierarchy_Fix.md`

### Estado vs repo

| Ítem | Task dice | Repo real |
|---|---|---|
| Framework | Next.js 14+, MUI v5 | Next.js 16.1.1, MUI v7 |
| Dashboard | "Control Tower / Admin" | Dashboard ejecutivo real con hero, charts, KPIs |
| Tipografía | Poppins en peso alto para todo | Puede haber cambiado parcialmente |

### Cambios requeridos

1. **Stack:** MUI v5 → v7. Los theme overrides de MUI pueden tener API diferente en v7.
2. **Diagnóstico:** El task describe problemas de "Control Tower" — verificar si ese nombre persiste o si ya cambió.
3. **La regla tipográfica sigue siendo normativa:** Poppins para títulos/nav, DM Sans para body/labels. Esto no cambia.

### Veredicto: VÁLIDO — los principios aplican, verificar API de theme overrides con MUI 7

---

## Task 4: `docs/tasks/complete/CODEX_TASK_Client_Dashboard_Redesign.md`

### Estado vs repo

Este es el task con mayor divergencia. El dashboard ya evolucionó significativamente:

| Ítem | Task asume | Repo real |
|---|---|---|
| Dashboard | Primitivo con ~15 cards/secciones dispersas | Dashboard ejecutivo con hero, 4 KPIs, 4 charts, secciones reusables |
| KPI cards | No existen o mal implementadas | **Existen:** RpA, Deliveries, OTD%, Feedback |
| Charts | No existen | **Existen:** 4 charts en grid 2x2 |
| Account team | No existe | **Existe** como sección reusable |
| Capacity | No existe | **Existe** como capacity inicial |
| Composición | Estática | **Dinámica** por `businessLines` y `serviceModules` |

### Cambios requeridos

1. **Reclasificar como task de refinamiento, no de redesign.** La arquitectura de 3 zonas (Hero+KPIs, Charts, Detalle) ya fue implementada en su mayoría.
2. **Lo que sigue siendo válido:**
   - Reglas de empty states para KPIs y charts
   - Ghost slot de "Ampliar equipo"
   - Limpieza de datos que son admin y no deben ser visibles al cliente
   - Semáforos con colores de `GH_COLORS`
3. **Lo que ya no aplica:**
   - "Crear 4 KPI cards" — ya existen
   - "Crear estructura de 3 zonas" — ya existe
   - "Implementar ApexCharts" — ya está integrado
4. **Stack:** MUI v5 → v7

### Veredicto: PARCIALMENTE SUPERADO — convertir en task de polish/fixes sobre implementación existente. Absorber contenido de CODEX_TASK_Client_Dashboard_Visual_Diagnosis como guía de correcciones.

---

## Task 5: `docs/tasks/complete/CODEX_TASK_Client_Dashboard_Visual_Diagnosis.md`

### Estado vs repo

Este addendum describe bugs concretos de la implementación actual. Es el más alineado con el estado real.

### Cambios requeridos

1. **Stack:** MUI v5 → v7
2. **Verificar si los bugs persisten.** El repo ha tenido 46 commits — algunos bugs pueden haberse corregido.
3. **El task referencia** `docs/tasks/complete/CODEX_TASK_Client_Dashboard_Redesign.md` como spec principal — si ese task se reclasifica, este addendum se convierte en el task principal de correcciones.

### Veredicto: VÁLIDO — es el task más útil para el estado actual del dashboard

---

## Task 6: `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md`

### Estado vs repo

| Ítem | Task dice | Repo real |
|---|---|---|
| Tablas BigQuery | Crear `team_members` y `client_team_assignments` | **Verificar** — el README menciona "secciones reusables de account team y capacity inicial" lo que sugiere que hay data pero puede ser mock/seed |
| API routes team | Crear 4 endpoints | **Verificar** — pueden no existir formalmente |
| Vistas 1-4 | No implementadas | Parcialmente — "account team" ya aparece en dashboard |
| Admin panel CRUD | "Tarea separada" | `/admin/users` existe — **esta es la superficie para extender** |
| Schema de auth | `greenhouse.clients` con `role: 'client' \| 'admin'` | **`client_users`** con roles, scopes, assignments |
| Pipeline notion-bq-sync | Modificar para incluir Responsable | **Verificar** si ya se hizo |

### Cambios requeridos

1. **Tablas BigQuery:** El schema de `team_members` y `client_team_assignments` probablemente sigue siendo necesario. Verificar si ya fueron creadas.
2. **La Vista 1 (Dossier) en `/settings`** sigue siendo necesaria como vista relacional.
3. **La Vista 2 (Capacity en Pulse)** ya existe parcialmente — los fixes están en CODEX_TASK_Fix_Team_Capacity_Views.
4. **Admin CRUD:** Ya no es "tarea separada futura" — debe extender `/admin/users` o crear `/admin/team` como nueva sección admin. **Esto es exactamente lo que Julio pidió en esta conversación.**
5. **Stack:** MUI v5 → v7, Next.js 14+ → 16.1.1
6. **Auth references:** Cambiar `greenhouse.clients` → `greenhouse.client_users` en todas las queries y joins

### Veredicto: PARCIALMENTE VÁLIDO — schema BigQuery probablemente necesario, vistas necesitan verificación, admin CRUD se convierte en task prioritario nuevo

---

## Task 7: `docs/tasks/complete/CODEX_TASK_Fix_Team_Capacity_Views.md`

### Estado vs repo

Este task documenta bugs de la Vista 2 y vistas faltantes (1, 3, 4). Los bugs son contra la implementación actual, así que son probablemente válidos.

### Cambios requeridos

1. **Los prerequisitos (Check 1-4)** siguen siendo necesarios — el agente debe verificar estado de tablas y API routes antes de ejecutar.
2. **Stack:** MUI v5 → v7
3. **Los 7 bugs de la Vista 2** deben verificarse contra el código actual — algunos pueden haberse corregido.
4. **Este task depende de CODEX_TASK_Team_Identity_Capacity_System** para la infraestructura. Si esa infra no existe, este task no puede ejecutarse.

### Veredicto: VÁLIDO — pero verificar que los bugs persistan. Ejecutar después de Team Identity.

---

## Task 8: `docs/tasks/complete/CODEX_TASK_Space_Admin_View_Redesign.md`

### Estado vs repo

| Ítem | Task dice | Repo real |
|---|---|---|
| Vista admin de Space | Existe con scroll infinito | `/admin/tenants/[id]` **existe** con slices reales |
| Tabs existentes | Capabilities, Usuarios, CRM, Proyectos, Configuración | **Verificar** — la vista actual puede tener estructura diferente |
| Governance | Manual con checkboxes | **Verificar** — service modules ya están bootstrapeados |
| Dependencias previas | "No tiene dependencias bloqueantes" | Correcto si la vista ya renderiza |

### Cambios requeridos

1. **Verificar la estructura actual de `/admin/tenants/[id]`** — el task describe problemas de una implementación específica que puede haber evolucionado.
2. **Stack:** MUI v5 → v7. Los componentes de Tab (`TabContext`, `TabList`) pueden tener API diferente.
3. **Los patrones de diseño** (header compacto, stats row, tabs, drawer de governance) siguen siendo válidos como objetivo.
4. **`GH_COLORS`** y nomenclatura: verificar si ya están implementados en `src/config/greenhouse-nomenclature.ts`.

### Veredicto: PROBABLEMENTE VÁLIDO — verificar estado actual de la vista antes de ejecutar

---

## Task 9: `docs/tasks/complete/CODEX_TASK_Agency_Operator_Layer.md`

### Estado vs repo

| Ítem | Task dice | Repo real |
|---|---|---|
| Roles | `'client' \| 'admin'`, agregar `'operator'` | Ya existe sistema de roles con `roles` y `user_role_assignments` — **agregar `operator` como nuevo role, no como campo en clients** |
| Auth schema | Agregar `can_view_all_spaces` a `greenhouse.clients` | Agregar a **`client_users`** o crear como scope/permission |
| Rutas admin | No existen | **Existen:** `/admin`, `/internal/dashboard` |
| Sidebar | Crear sección "Agencia" | El sidebar ya tiene estructura — **extender** |
| `?space=` override | Mecanismo central | Puede que el repo ya tenga algo similar con `getTenantContext()` |

### Cambios requeridos

1. **El modelo de roles ya es más sofisticado** que lo que el task asume. No agregar `role` como string field en `client_users` — usar las tablas `roles` + `user_role_assignments` existentes.
2. **Verificar si `/internal/dashboard`** ya cumple parte de la función del Pulse Global.
3. **El sidebar ya tiene secciones** condicionadas. Verificar `src/data/navigation/` para entender la estructura actual.
4. **Stack:** MUI v5 → v7, Next.js 14+ → 16.1.1
5. **El concepto de `operator` sigue siendo necesario** — el equipo Efeonce necesita vista panorámica sin privilegios admin destructivos.

### Veredicto: VÁLIDO conceptualmente — la implementación debe adaptarse al modelo de roles existente (tablas separadas, no campo string)

---

## Task 10: `docs/tasks/complete/CODEX_TASK_Creative_Hub_Module.md`

### Estado vs repo

| Ítem | Task dice | Repo real |
|---|---|---|
| Capabilities | "Capability Registry no existe" | **`serviceModules` y `businessLines`** ya se resuelven en runtime via `getTenantContext()` |
| Sidebar dinámico | "Implementar fase C0" | **Verificar** — el sidebar ya muestra secciones condicionadas |
| Data | Queries sobre `notion_ops.tareas` | Correcto — los datasets existen |
| Dashboard | "El Creative Hub es módulo separado" | El dashboard ya compone por `serviceModules` — el Creative Hub puede ser una extensión de esa composición |

### Cambios requeridos

1. **Verificar qué existe del Capability Registry.** El README dice que `getTenantContext()` expone `businessLines` y `serviceModules` y el dashboard ya compone basado en ellos. Esto puede ser la base sobre la que el Creative Hub se monta.
2. **Schema:** Verificar `bigquery/greenhouse_service_modules_v1.sql` — los módulos ya están definidos.
3. **Stack:** MUI v5 → v7, Next.js 14+ → 16.1.1
4. **Las 3 capas** (Revenue Enabled, Brand Intelligence, CSC Pipeline Tracker) siguen siendo el objetivo correcto.
5. **`requiredServices` activation** debe verificarse contra cómo `getTenantContext()` resuelve capabilities hoy.

### Veredicto: VÁLIDO conceptualmente — la infraestructura base ya avanzó, ajustar dependencias

---

## Resumen ejecutivo: Prioridad de actualización

| Prioridad | Task | Estado | Acción |
|---|---|---|---|
| **Superado parcialmente** | Client Dashboard Redesign | Dashboard ya implementado | Reclasificar como polish. Absorber Visual Diagnosis. |
| **Superado parcialmente** | Microsoft SSO | Auth ya operativa | Verificar si SSO fue implementado. Si no, ajustar contra `client_users`. |
| **Requiere ajuste mayor** | Team Identity & Capacity | Schema probablemente necesario, admin CRUD es la pieza clave faltante | Verificar tablas BQ, crear CRUD admin como extensión de `/admin`. |
| **Requiere ajuste mayor** | Agency Operator Layer | Concepto válido, modelo de roles cambió | Adaptar a tablas `roles`/`user_role_assignments`. |
| **Requiere ajuste menor** | Fix Team Capacity Views | Bugs contra implementación actual | Verificar persistencia de bugs. |
| **Requiere ajuste menor** | Space Admin Redesign | Vista ya existe, verificar estado | Verificar si problemas persisten. |
| **Requiere ajuste menor** | Typography Fix | Principios válidos, MUI API cambió | Actualizar para MUI 7. |
| **Requiere ajuste menor** | Google SSO | Incremental | Ajustar tabla y paths. |
| **Requiere ajuste menor** | Creative Hub Module | Infra base avanzó | Ajustar dependencias contra `getTenantContext()`. |
| **Válido tal cual** | Dashboard Visual Diagnosis | Bugs concretos contra implementación actual | Verificar si persisten. |

---

## Task faltante identificado: Admin CRUD de Colaboradores

**Este es el task que Julio pidió en esta conversación y que no existe en ningún CODEX task.**

Los CODEX tasks existentes dejan explícitamente como "tarea separada" el admin panel para CRUD de `team_members` y `client_team_assignments`. Ese es exactamente el módulo que falta:

- CRUD de miembros del equipo Efeonce
- Asignación de colaboradores a Spaces/cuentas con FTE, horas, rol
- Radiografía de cada colaborador (en cuántas cuentas está, carga, historial)
- Vista de capacidad global de agencia

**Debe crearse como CODEX task nuevo**, extendiendo la superficie admin existente (`/admin/users`, `/admin/tenants`), usando las tablas `team_members` y `client_team_assignments` del Team Identity task, y respetando el modelo de roles/scopes ya implementado.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento de alineación técnica para agentes de desarrollo.*
