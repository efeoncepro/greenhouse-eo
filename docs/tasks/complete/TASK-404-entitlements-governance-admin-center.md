# TASK-404 — Entitlements Governance Admin Center

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-404-entitlements-governance-admin-center`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la capa de gobernanza operativa de entitlements dentro del Admin Center para que Greenhouse pueda administrar capabilities, defaults por rol, overrides por usuario y policy de startup sin depender de cambios hardcodeados en código o ajustes manuales sobre la base de datos.

## Why This Task Exists

`TASK-403` deja lista la primera foundation runtime de entitlements, pero por sí sola no resuelve la operación diaria del modelo. Si Greenhouse quiere escalar hacia permisos granulares por capability y no seguir creciendo con lógica distribuida entre `routeGroups`, `authorizedViews` y excepciones locales, necesita una surface administrativa real para:

- gobernar el catálogo de capabilities
- definir defaults por rol o perfil
- aplicar overrides puntuales por usuario
- explicar el acceso efectivo y su origen
- administrar la startup policy de Home y entrypoints sin tocar código

Sin esta task, la arquitectura de entitlements quedaría atrapada en una capa técnica difícil de operar, auditar y evolucionar.

## Goal

- habilitar un Admin Center CRUD para gobernar entitlements de forma segura y multi-tenant
- formalizar cómo se administran defaults por rol, overrides por usuario y policy de Home
- dejar una base reutilizable para futuros módulos más allá de Home

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`

Reglas obligatorias:

- la administración de entitlements no reemplaza de golpe el modelo actual; debe convivir con `roleCodes`, `routeGroups` y `authorizedViews`
- toda mutación debe respetar `space_id` / tenant isolation
- el Admin Center solo debe permitir cambios a actores con permisos administrativos reales
- Home y startup policy deben quedar gobernables sin reintroducir lógica ad hoc por rol duro en frontend
- los cambios deben dejar trazabilidad y capacidad de auditoría

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-402-universal-adaptive-home-orchestration.md`
- `docs/tasks/complete/TASK-403-entitlements-runtime-foundation-home-bridge.md`
- `docs/tasks/complete/TASK-285-client-role-differentiation.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `src/app/(dashboard)/admin/views/page.tsx`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `src/lib/admin/get-admin-view-access-governance.ts`
- `src/lib/admin/view-access-store.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/app/api/admin/views/sets/route.ts`
- `src/app/api/admin/views/assignments/route.ts`
- `src/app/api/admin/views/overrides/route.ts`
- `src/app/(dashboard)/admin/users/page.tsx`
- `src/app/(dashboard)/admin/users/[id]/page.tsx`
- `src/views/greenhouse/admin/users/UserAccessTab.tsx`
- `src/views/greenhouse/admin/users/UserRoleManager.tsx`
- `src/lib/tenant/authorization.ts`
- outputs de `TASK-403`

### Blocks / Impacts

- `TASK-402`, porque la Home universal necesita una policy administrable y no una tabla informal de excepciones en código
- futuros módulos con permisos granulares por capability
- surfaces de Admin Center, governance de acceso y troubleshooting de soporte interno

### Files owned

- `src/app/(dashboard)/admin/[verificar-entitlements]/page.tsx`
- `src/views/greenhouse/admin/[verificar-entitlements]/**`
- `src/app/api/admin/entitlements/**`
- `src/lib/admin/[verificar-entitlements-*].ts`
- `src/lib/tenant/authorization.ts`
- `src/lib/home/**`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/documentation/identity/**`
- `docs/tasks/complete/TASK-404-entitlements-governance-admin-center.md`

## Current Repo State

### Already exists

- ya existe una surface de governance para `authorizedViews` en Admin Center
- ya existen stores y APIs para asignaciones por set, overrides por usuario y lectura de acceso administrativo
- ya existe `User Access` dentro de Admin Users
- la arquitectura objetivo de entitlements ya quedó documentada
- `TASK-403` ya cerró la primera foundation runtime para capabilities y bridge con `/home`
- ya existe una vista parcial de acceso efectivo a nivel de vistas (`effective-views`) para usuario
- la startup policy de Home ya tiene resolver centralizado (`resolvePortalHomePolicy`) y soporte en `default_portal_home_path`

### Gap

- no existe todavía una surface administrativa explícita para `entitlements`
- no existe CRUD para defaults por rol en términos de capabilities/actions/scopes
- no existe CRUD para overrides de entitlements con reason, expiración u origen
- no existe una vista de “acceso efectivo” que explique si una capacidad viene de rol, override o policy derivada
- la startup policy de Home todavía no tiene una gobernanza clara dentro del Admin Center

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Modelo de gobernanza y source of truth

- definir cómo se gobiernan:
  - catálogo de capabilities
  - defaults por rol
  - overrides por usuario
  - mappings auxiliares para vistas/acciones
  - startup policy de Home
- decidir qué parte queda code-versioned y qué parte persiste en DB
- dejar explícita la precedencia de acceso efectivo

### Slice 2 — Admin Center surfaces

- crear o extender la surface de Admin Center para entitlements
- cubrir como mínimo:
  - integración dentro de `Admin Center > Usuarios` para operación por usuario
  - una surface global `Gobernanza de acceso` para política general
  - catálogo de capabilities
  - defaults por rol
  - overrides por usuario
  - preview de acceso efectivo
  - policy de startup / Home

### Slice 3 — API y store layer

- exponer CRUD administrativo para entitlements
- centralizar validación, autorización y tenant isolation
- publicar eventos/auditoría cuando cambien defaults, overrides o startup policy

### Slice 4 — Integración con Users y Home

- conectar User detail para leer/editar acceso efectivo
- conectar Home/startup policy para que la gobernanza tenga un consumer real
- mantener compatibilidad con el modelo actual mientras progresa la migración

### Slice 5 — Tests y documentación operativa

- tests de store/API/guards administrativos
- documentación de arquitectura y documentación funcional de identity/admin
- guías para soporte interno sobre cómo leer el origen de un permiso

## Out of Scope

- migrar todos los módulos existentes a full entitlements en una sola iteración
- reemplazar toda la surface actual de `authorizedViews` sin estrategia de transición
- introducir un IAM externo o policy engine third-party
- diseñar analytics complejos de uso de permisos fuera de la gobernanza operativa básica

## Detailed Spec

La task debe materializar un principio simple:

### Un solo Home, muchos accesos efectivos

Greenhouse no debe derivar hacia “una Home distinta por rol” mantenida como forks de UI. La gobernanza correcta es:

- una Home canónica
- módulos, bloques, CTA y prioridad adaptados por acceso efectivo
- startup policy separada de la definición del permiso

Para que eso sea gobernable, el Admin Center debe permitir administrar:

1. **Qué capabilities existen**
2. **Qué roles las reciben por default**
3. **Qué usuarios reciben excepciones**
4. **Cómo se explica el acceso efectivo**
5. **Cuál es el entrypoint o startup policy por contexto**

### Information Architecture propuesta

La solución debe vivir dentro del Admin Center existente y no como una consola paralela.

#### Surface 1 — `Admin Center > Usuarios`

La ficha del usuario debe seguir siendo el lugar para operar casos concretos. Dentro del tab de acceso, la task debe contemplar una evolución que permita ver y administrar:

- `Roles base`
  - roles asignados
  - route groups heredados
- `Vistas`
  - vistas autorizadas actuales
  - herencia vs override
- `Entitlements efectivos`
  - modules
  - capabilities
  - acciones permitidas
  - source of truth efectivo
- `Overrides`
  - grants o denies manuales
  - motivo
  - expiración
- `Startup / Home`
  - policy activa
  - si usa default global o excepción individual

Esta surface debe responder preguntas operativas concretas:

- qué ve este usuario
- por qué lo ve
- qué excepción manual tiene
- qué cambiaría si se modifica su rol base

#### Surface 2 — `Admin Center > Gobernanza de acceso`

Debe existir una surface global para administrar la política general del sistema. Como mínimo, la task debe considerar tabs o secciones equivalentes para:

- `Capabilities`
  - catálogo canónico de capabilities
- `Defaults por rol`
  - capabilities/actions asignadas por default a cada rol
- `Mapa vista -> capability`
  - relación entre vistas visibles y capabilities requeridas
- `Policies de Home`
  - startup policy
  - entrypoint rules
  - priorización de bloques o CTA por audiencia cuando aplique
- `Auditoría`
  - cambios administrativos relevantes
  - actor, fecha, motivo y alcance

#### Conexión entre ambas surfaces

La task debe dejar explícito que ambas surfaces son complementarias:

- `Usuarios` muestra el resultado efectivo y permite operar excepciones individuales
- `Gobernanza de acceso` administra la política base y el catálogo reusable

Capacidades mínimas esperadas de navegación:

- desde la ficha del usuario: `ver política base`
- desde gobernanza: `ver usuarios afectados`

### Modelo mental obligatorio

La implementación debe evitar tratar `vistas` y `permisos` como dos sistemas sin relación. El contrato funcional esperado es una cadena explicable:

1. `rol`
2. `capabilities por rol`
3. `vistas derivadas`
4. `overrides por usuario`
5. `startup policy / home`

La vista de usuario debe mostrar el resultado efectivo.

La vista de gobernanza debe administrar la causa.

### UI/UX blueprint

Esta task ya asume una dirección explícita de UI/UX basada en:

- `greenhouse-ui-orchestrator`
- `greenhouse-ux-content-accessibility`
- `ui-product-design-orchestrator`
- `modern-ui-architect`
- `ux-content-accessibility`

La propuesta no debe resolverse como una pantalla genérica de IAM ni como una matriz plana de checkboxes. Debe responder a dos trabajos distintos con dos surfaces complementarias.

#### Normalización del request

##### Surface A — usuario individual

- surface type: `admin_detail`
- page intent: `identity_access`
- data shape: `mixed_summary`
- data quality: `strong`
- action density: `heavy_actions`
- repeatability: `module_local`
- tarea principal del usuario: entender y operar el acceso efectivo de una persona concreta

##### Surface B — policy global

- surface type: `table_surface`
- page intent: `governance`
- data shape: `capability_inventory`
- data quality: `strong`
- action density: `heavy_actions`
- repeatability: `shared_product_ui`
- tarea principal del usuario: administrar la política base del sistema sin entrar usuario por usuario

#### Surface A — `Admin Center > Usuarios > [usuario] > Acceso`

Patrón principal:

- `detail-shell` existente de usuario
- banda resumen + sección dominante + bloques secundarios

First fold obligatorio:

- título: `Acceso de {Nombre}`
- subtítulo: `Revisa roles, vistas, permisos efectivos y excepciones activas.`
- summary strip de 4 señales:
  - `Rol base`
  - `Módulos activos`
  - `Excepciones activas`
  - `Home de inicio`

Secciones obligatorias:

1. `Roles base`
   - roles asignados
   - route groups heredados
   - CTA: `Editar roles`

2. `Vistas derivadas`
   - vistas autorizadas visibles hoy
   - origen: `Rol`, `Override`, `Derivada`

3. `Permisos efectivos`
   - sección dominante
   - tabla principal con columnas:
     - `Módulo`
     - `Capability`
     - `Acciones`
     - `Scope`
     - `Origen`
     - `Vigencia`
   - el row detail debe abrir panel lateral o drawer, no navegar a otra pantalla innecesaria

4. `Overrides`
   - grants o denies manuales
   - motivo
   - expiración
   - actor del cambio cuando aplique
   - CTA: `Agregar excepción`

5. `Home de inicio`
   - policy activa
   - indicador de `Usa política global` o `Tiene excepción individual`
   - preview del resultado esperado
   - CTA: `Cambiar política de inicio`

Preguntas operativas que esta pantalla debe responder en segundos:

- qué ve este usuario
- por qué lo ve
- qué excepción manual tiene
- qué cambiaría si se modifica su rol base

#### Surface B — `Admin Center > Gobernanza de acceso`

Patrón principal:

- `summary + table/list-detail`
- filtros arriba
- tabla dominante o inventario principal
- detalle/edición en panel lateral persistente o drawer

First fold obligatorio:

- título: `Gobernanza de acceso`
- subtítulo: `Administra capacidades, defaults por rol, excepciones y política de inicio.`
- summary strip corto con:
  - `Capabilities activas`
  - `Roles configurados`
  - `Usuarios con excepciones`
  - `Cambios recientes`

Tabs o secciones equivalentes mínimas:

1. `Capabilities`
   - catálogo canónico
   - columnas mínimas:
     - `Capability`
     - `Módulo`
     - `Acciones`
     - `Scope`
     - `Estado`
     - `Uso`
   - CTA: `Crear capability`

2. `Defaults por rol`
   - selector de rol
   - edición por inventario filtrable de capabilities
   - evitar una matriz inmanejable si el volumen crece

3. `Mapa vista -> capability`
   - tabla de trazabilidad entre surface visible y capability requerida
   - debe ayudar a explicar por qué un usuario ve o no ve una vista

4. `Políticas de Home`
   - startup policy
   - entrypoint rules
   - priorización de bloques o CTA por audiencia si aplica
   - CTA: `Crear política`

5. `Auditoría`
   - cambios administrativos relevantes
   - actor
   - fecha
   - alcance
   - motivo

#### Navegación cruzada entre ambas surfaces

La task debe dejar previstas conexiones de navegación entre política global y caso individual:

- desde la ficha del usuario: `Ver política base`
- desde gobernanza: `Ver usuarios afectados`

#### Component strategy

Reutilizar antes de crear:

- `src/views/greenhouse/admin/users/UserAccessTab.tsx`
- `src/views/greenhouse/admin/users/UserListCards.tsx`
- `src/views/greenhouse/admin/users/UserListTable.tsx`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- patterns de dialog/drawer/summary strip ya usados en Admin

Promover a shared solo si repite entre múltiples surfaces:

- row summaries de entitlement
- provenance chips
- effective access badges

Mantener route-local si la composición es específica de identity/admin.

#### Copy contract

Labels y títulos base esperados:

- `Acceso de usuario`
- `Permisos efectivos`
- `Excepciones activas`
- `Política de inicio`
- `Gobernanza de acceso`
- `Capabilities`
- `Defaults por rol`
- `Mapa vista -> capability`
- `Cambios recientes`

Helper / feedback copy base:

- `Este usuario hereda el acceso desde su rol base.`
- `Esta excepción vence el 30 de abril de 2026.`
- `No hay excepciones activas.`
- `Usa la política global de inicio.`
- `Tiene una excepción individual de inicio.`
- `No se pudo guardar el cambio. Revisa los campos obligatorios e intenta de nuevo.`

CTAs preferidos:

- `Editar roles`
- `Agregar excepción`
- `Quitar excepción`
- `Crear capability`
- `Guardar cambios`
- `Ver usuarios afectados`

#### State model obligatorio

Cada surface debe cubrir, como mínimo:

- `loading`
- `empty`
- `partial`
- `warning`
- `error`
- `success`

Reglas:

- si la data es derivada o parcial, debe decirlo
- si un permiso viene de herencia, override o policy global, eso debe verse explícitamente
- los estados vacíos deben orientar la siguiente acción
- errores de escritura deben decir qué pasó y qué hacer después

#### Accessibility guardrails

- no usar color como único diferenciador entre `Grant` y `Deny`
- toda acción row-level debe ser accesible por teclado
- tablas densas deben tener nombres de columna inequívocos
- los dialogs destructivos deben explicar la consecuencia exacta
- foco visible obligatorio en cards, tabs, filas interactivas y acciones secundarias
- `Origen`, `Vigencia` y `Scope` deben poder entenderse sin tooltip obligatorio

#### Anti-patterns prohibidos

- matriz gigante de checkboxes sin jerarquía ni filtros
- esconder overrides críticos dentro de modales profundos
- mezclar roles, vistas y capabilities sin explicar causalidad
- pantallas de cards uniformes sin sección dominante
- copy genérica tipo `Administrar configuración`

Principios de implementación:

1. **Governance first**
   - no dejar entitlements como una convención técnica invisible
   - los admins deben poder operar el modelo

2. **Compatibilidad progresiva**
   - la UI nueva debe convivir con el modelo actual y facilitar la transición

3. **Explainability**
   - un admin debe poder responder “por qué este usuario ve esto”

4. **Auditabilidad**
   - cada cambio relevante debe dejar huella operativa

5. **Reutilización multi-módulo**
   - la solución no puede quedar acoplada solo a `/home`

## Acceptance Criteria

- [ ] existe una surface de Admin Center para gobernar entitlements
- [ ] la ficha de usuario expone acceso efectivo, overrides y startup policy a nivel individual
- [ ] existe una surface global de gobernanza de acceso separada de la ficha individual
- [ ] existe CRUD para defaults por rol y overrides por usuario
- [ ] el sistema puede explicar acceso efectivo y su origen
- [ ] la startup policy de Home queda modelada dentro del esquema de gobernanza o explícitamente conectada a él
- [ ] los cambios respetan `space_id` y permisos administrativos
- [ ] existe auditoría o event publishing suficiente para cambios relevantes
- [ ] la solución convive con `authorizedViews` y el modelo actual sin romperlo
- [ ] la documentación técnica y funcional queda actualizada

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual con superadmin en Admin Center
- validación manual con usuario sin permisos admin para asegurar denegación
- validación manual de Home / startup policy con al menos dos perfiles distintos

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-402` y `TASK-403`
- [ ] la arquitectura de entitlements y la documentación funcional de identity/admin quedaron reconciliadas con la implementación real

## Follow-ups

- posible derivación futura: consola de auditoría de acceso efectivo y diff histórico por usuario/rol
- posible derivación futura: promotion path de capabilities entre alpha / beta / stable por tenant o cohort
