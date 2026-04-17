# Greenhouse Entitlements & Authorization Architecture V1

## Delta 2026-04-17 — TASK-404 conecta la gobernanza operativa de entitlements al Admin Center

- El catálogo de capabilities **sigue siendo code-versioned**; el source of truth canónico continúa en:
  - `src/config/entitlements-catalog.ts`
  - `src/lib/entitlements/runtime.ts`
- `TASK-404` agrega una capa operativa persistida para gobernar overlays administrativos sin duplicar el catálogo:
  - `greenhouse_core.role_entitlement_defaults`
  - `greenhouse_core.user_entitlement_overrides`
  - `greenhouse_core.entitlement_governance_audit_log`
- La precedencia efectiva queda así:
  1. runtime base derivado desde `roleCodes + routeGroups + authorizedViews`
  2. defaults por rol persistidos
  3. overrides por usuario persistidos
  4. startup policy resuelta vía `resolvePortalHomePolicy()` + excepción individual en `default_portal_home_path`
- El Admin Center ya expone dos surfaces complementarias:
  - `Admin Center > Gobernanza de acceso` para catálogo, defaults por rol, mapa `vista -> capability`, policies de Home y auditoría
  - `Admin Center > Usuarios > [usuario] > Acceso` para permisos efectivos, overrides y Home de inicio a nivel individual
- La conexión con Home se mantiene explícita:
  - no existe un segundo resolver de startup policy
  - la excepción individual de inicio sigue viviendo en `greenhouse_core.client_users.default_portal_home_path`
- Implicación operativa:
  - Greenhouse ya puede operar grants/revokes por `capability/action/scope` desde Admin Center sin romper `authorizedViews`, `permission_sets` ni el bridge runtime de `TASK-403`

## Delta 2026-04-16 — TASK-415 extiende el runtime a HR Leave admin operations

- El runtime canónico ahora cubre una primera granularidad útil para operaciones de vacaciones del equipo:
  - `hr.leave_balance` → lectura de saldo del equipo
  - `hr.leave_backfill` → creación de backfills retroactivos con fechas reales
  - `hr.leave_adjustment` → creación y reversión de ajustes manuales de saldo
- La intención arquitectónica no es reemplazar el bridge broad/supervisor existente, sino dejar capabilities explícitas para:
  - distinguir lectura de saldo vs aprobación de solicitudes
  - separar backfill retroactivo de ajuste manual
  - permitir que surfaces como `/hr/leave` expongan acciones operativas sin volver a checks ad hoc
- En esta fase la asignación sigue derivando desde `routeGroups` y `authorizedViews`, especialmente para HR broad access.
- Implicación operativa:
  - `TASK-404` y cualquier Admin Center de permisos deben reutilizar estas capabilities en vez de reintroducir permisos específicos solo en UI.

## Delta 2026-04-15 — TASK-403 materializa el primer runtime canónico y lo conecta a Home/Nexa

- Ya existe una foundation runtime code-versioned para entitlements sin migración de schema:
  - `src/config/entitlements-catalog.ts`
  - `src/lib/entitlements/types.ts`
  - `src/lib/entitlements/runtime.ts`
  - `src/lib/home/build-home-entitlements-context.ts`
- El bridge actual convive con el runtime existente:
  - deriva entitlements desde `roleCodes`, `routeGroups` y `authorizedViews`
  - mantiene `authorizedViews` como proyección útil para surfaces finas de HR/People
  - mantiene `resolvePortalHomePolicy()` como contrato separado de startup policy
- Consumers reales ya conectados:
  - `getHomeSnapshot()` y `GET /api/home/snapshot`
  - `POST /api/home/nexa`
  - Pulse ahora recibe `recommendedShortcuts` y `accessContext` desde el mismo runtime que usa Nexa
- La primera surface visible no reemplaza `CAPABILITY_REGISTRY`; ambas capas conviven:
  - capability modules siguen resolviéndose desde `businessLines + serviceModules`
  - entitlements gobiernan shortcuts, audience y señal de acceso cross-module
- Implicación operativa:
  - `TASK-402` ya puede construir la Home adaptativa sobre un helper canónico en vez de checks ad hoc
  - `TASK-404` debe tomar esta layer como base y no redefinir la semántica runtime en Admin

## Delta 2026-04-13 — Se formaliza una capa de entitlements modular, action-based y scope-aware

- Greenhouse ya no debe pensar autorización solo como:
  - `roleCodes`
  - `routeGroups`
  - `authorizedViews`
  - guards locales por pathname
- La dirección canónica nueva propone una capa de `entitlements` que separa:
  - identidad base
  - superficies de navegación
  - permisos funcionales por módulo
  - alcance (`scope`)
  - startup policy / entrypoint
- Esta arquitectura nace para soportar:
  - Home universal adaptativa (`TASK-402`)
  - diferenciación real de roles cliente (`TASK-285`)
  - permisos enterprise en HR, Finance, People, Agency y Admin sin explotar en combinaciones de roles

## 1. Resumen

Greenhouse necesita evolucionar desde un modelo de autorización centrado en roles y vistas hacia un modelo híbrido:

1. `roleCodes` siguen definiendo la identidad base del usuario
2. `routeGroups` siguen definiendo grandes superficies de navegación
3. `entitlements` pasan a definir qué capability puede ejecutar un usuario y sobre qué alcance
4. `authorizedViews` pasan a ser una proyección UI derivada, no la fuente primaria de verdad
5. `startupPolicy` deja de inferirse accidentalmente desde permisos y se trata como contrato separado

La meta no es eliminar lo que existe, sino poner una capa más robusta encima del runtime actual para que Greenhouse pueda escalar sin derivar cada decisión desde `if role === x` o `if pathname === y`.

---

## 2. Problema actual

El runtime actual funciona, pero mezcla responsabilidades:

- `roleCodes` responden “quién eres”
- `routeGroups` responden “qué superficies amplias puedes abrir”
- `authorizedViews` responden “qué vistas concretas ve la UI”
- `portalHomePath` terminó respondiendo a veces “dónde aterrizas”

Eso crea varios problemas:

1. **El home puede romperse por combinaciones de permisos**
   - un `efeonce_admin` hereda muchos `routeGroups`
   - si el startup home se infiere desde esos grupos, puede terminar en un workspace incorrecto

2. **La UI y la autorización quedan demasiado acopladas**
   - si una vista cambia de ruta, el permiso también parece cambiar
   - si se agrega una tab o un botón nuevo, hay que repartir lógica en varios puntos

3. **Los roles se vuelven demasiado pesados**
   - cada necesidad nueva empuja a crear más roles o reglas hardcodeadas
   - las combinaciones de HR + Finance + Admin + Client se vuelven difíciles de razonar

4. **La política de negocio no es reusable**
   - sidebar, botones, API routes, exports, workflows y Nexa no comparten siempre la misma capa de decisión

---

## 3. Principio rector

Greenhouse debe separar explícitamente estas capas:

### 3.1 Identidad base

Responde:

- quién es el usuario
- a qué tenant pertenece
- qué roles institucionales tiene

Runtime actual:

- `roleCodes`
- `primaryRoleCode`
- `tenantType`

### 3.2 Superficie de navegación

Responde:

- qué áreas grandes del portal puede abrir

Runtime actual:

- `routeGroups`

Ejemplos:

- `internal`
- `admin`
- `client`
- `finance`
- `hr`
- `people`
- `my`
- `ai_tooling`

### 3.3 Capability entitlement

Responde:

- qué capacidad funcional puede ejecutar
- qué acción puede realizar
- con qué alcance

Esta es la capa nueva propuesta.

### 3.4 View projection

Responde:

- qué vistas, tabs, botones o acciones se renderizan en UI

Runtime actual:

- `authorizedViews`

Política nueva:

- las vistas deben derivarse desde entitlements y surfaces
- no deben ser el centro del modelo

### 3.5 Startup policy

Responde:

- dónde aterriza el usuario al entrar

Política nueva:

- debe tratarse como contrato separado
- no debe derivarse solo de `routeGroups`

---

## 4. Modelo conceptual canónico

Greenhouse debe operar con este orden mental:

- **Role** = quién eres
- **Module** = dónde puedes entrar
- **Capability** = qué puedes hacer
- **Action** = qué tipo de operación puedes ejecutar
- **Scope** = sobre qué alcance puedes hacerlo
- **View** = cómo se representa eso en UI
- **Startup policy** = cuál es tu puerta de entrada

---

## 5. Entitlement model

## 5.1 Module

Representa una gran capability surface del portal.

Ejemplos iniciales:

- `home`
- `agency`
- `people`
- `hr`
- `finance`
- `admin`
- `client_portal`
- `my_workspace`
- `ai_tooling`

## 5.2 Capability

Representa una unidad funcional dentro de un módulo.

Ejemplos:

- `home.view`
- `finance.reconciliation`
- `finance.expenses`
- `finance.income`
- `finance.period`
- `hr.payroll`
- `hr.leave`
- `people.profile`
- `agency.capacity`
- `admin.tenants`

## 5.3 Action

Representa la acción permitida sobre la capability.

Set inicial recomendado:

- `read`
- `create`
- `update`
- `delete`
- `approve`
- `close`
- `export`
- `manage`
- `configure`

## 5.4 Scope

Representa el alcance sobre el que aplica el permiso.

Set inicial recomendado:

- `own`
- `team`
- `space`
- `organization`
- `tenant`
- `all`

## 5.5 Entitlement

Forma canónica:

- `module`
- `capability`
- `action`
- `scope`

Ejemplos:

- `finance.reconciliation.read@tenant`
- `finance.reconciliation.match@space`
- `hr.payroll.read@tenant`
- `hr.payroll.approve@tenant`
- `people.profile.read@team`
- `admin.tenants.manage@all`

---

## 6. Runtime contract propuesto

Tipo de referencia:

```ts
type GreenhouseModule =
  | 'home'
  | 'agency'
  | 'people'
  | 'hr'
  | 'finance'
  | 'admin'
  | 'client_portal'
  | 'my_workspace'
  | 'ai_tooling'

type CapabilityAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'close'
  | 'export'
  | 'manage'
  | 'configure'

type CapabilityScope =
  | 'own'
  | 'team'
  | 'space'
  | 'organization'
  | 'tenant'
  | 'all'

type Entitlement = {
  module: GreenhouseModule
  capability: string
  action: CapabilityAction
  scope: CapabilityScope
}
```

Helpers de consumo recomendados:

```ts
can(tenant, 'finance.reconciliation', 'read')
can(tenant, 'finance.reconciliation', 'match')
can(tenant, 'hr.payroll', 'approve')
can(tenant, 'admin.tenants', 'manage')
```

Helpers de UI recomendados:

```ts
canSeeModule(tenant, 'finance')
canSeeCapability(tenant, 'hr.payroll', 'read')
canRenderView(tenant, 'finance.reconciliation.list')
```

---

## 7. Persistencia propuesta

El runtime actual no necesita migrar todo de golpe, pero la arquitectura objetivo debería contemplar estas piezas:

### 7.1 Capability catalog

Tabla propuesta:

- `greenhouse_identity.capabilities`

Campos recomendados:

- `capability_key`
- `module_key`
- `label`
- `description`
- `active`

### 7.2 Role capability defaults

Tabla propuesta:

- `greenhouse_identity.role_capabilities`

Campos recomendados:

- `role_code`
- `capability_key`
- `action`
- `scope`

### 7.3 User capability overrides

Tabla propuesta:

- `greenhouse_identity.user_capability_overrides`

Campos recomendados:

- `user_id`
- `capability_key`
- `action`
- `scope`
- `effect` (`allow` | `deny`)

### 7.4 View capability map

Tabla o catálogo code-versioned propuesto:

- `greenhouse_identity.view_capability_map`

Campos recomendados:

- `view_code`
- `capability_key`
- `action`

### 7.5 Startup policy

Tabla o atributo propuesto:

- `startup_policy_key`
- `startup_override_path`
- `last_workspace_path`

Importante:

- `startup_policy_key` no debe colapsarse en una ruta cruda
- la ruta efectiva debe derivarse desde una policy semántica

---

## 8. Relación con el runtime actual

## 8.1 Qué se mantiene

Se mantiene:

- `roleCodes`
- `primaryRoleCode`
- `routeGroups`
- `authorizedViews`

## 8.2 Qué cambia de semántica

### `routeGroups`

Se mantienen como:

- capa de shell
- agrupación de rutas
- criterio broad de navegación

Pero dejan de ser:

- la única fuente de verdad para autorización fina
- la base automática del startup home

### `authorizedViews`

Se mantienen como:

- proyección de UI
- compatibilidad con guards y navegación ya existentes

Pero dejan de ser:

- el modelo primario de permisos

La dirección canónica es:

- `authorizedViews` se derivan desde entitlements + surface rules

---

## 9. Relación con `/home` y `TASK-402`

Esta arquitectura es el foundation correcto para `TASK-402`.

La Home universal debe dejar de preguntar:

- “¿tiene routeGroup HR?”
- “¿tiene routeGroup Finance?”

Y pasar a preguntar:

- qué módulos tiene activos
- qué capabilities relevantes tiene
- qué acciones puede ejecutar
- qué alcance tiene
- qué workspace conviene priorizar

La Home universal entonces puede renderizar:

- Nexa como constante principal
- cards y shortcuts adaptativos por audiencia
- CTAs del tipo:
  - `Continuar en Payroll`
  - `Ir a Finanzas`
  - `Abrir People`
  - `Revisar tu espacio`

Conclusión:

- **Home = orquestación**
- **Workspaces = ejecución**

---

## 10. Relación con `TASK-285`

La diferenciación de roles cliente debe apoyarse en esta arquitectura.

En vez de pensar solo:

- `client_executive`
- `client_manager`
- `client_specialist`

como menús distintos por hardcode, la arquitectura recomienda:

- `client_portal.view`
- `client.projects.read`
- `client.reviews.read`
- `client.analytics.read`
- `client.team.read`
- `client.campaigns.read`

con distinta combinación por rol.

Eso permite que `TASK-285` no termine encerrada en lógica de sidebar, sino en una policy extensible.

---

## 11. Reglas arquitectónicas

1. No modelar permisos primarios por pathname
2. No usar `routeGroups` como única capa de autorización fina
3. No derivar el startup home solo desde permisos de módulo
4. Mantener `roleCodes` como identidad base, no como única fuente de policy
5. Reusar la misma capa de autorización en:
   - UI
   - API routes
   - acciones inline
   - exports
   - tools de Nexa
   - workflows
6. Mantener `authorizedViews` como proyección derivada hasta completar la migración

---

## 12. Plan de migración recomendado

### Fase 1 — Foundation

- introducir el catálogo canónico de capabilities
- introducir helpers runtime (`can`, `canSeeModule`, etc.)
- no romper `routeGroups` ni `authorizedViews`

### Fase 2 — Consumer bridge

- conectar Home universal (`TASK-402`)
- conectar client role differentiation (`TASK-285`)
- conectar surfaces core de HR, Finance, People y Admin

### Fase 3 — UI projection

- derivar menú, tabs y botones desde entitlements
- reducir lógica local por rol/path

### Fase 4 — Authorization unification

- aplicar la misma capa en API routes y acciones sensibles
- dejar `authorizedViews` como cache/proyección, no como source of truth

---

## 13. Decisión recomendada para Greenhouse

Greenhouse debe adoptar un modelo híbrido:

- **Roles** para identidad base
- **Route groups** para shell y navegación broad
- **Entitlements** para autorización real por capability
- **Scopes** para alcance
- **Startup policy** como contrato separado

Ese modelo permite:

- Home universal adaptativa
- módulos enterprise con permisos granulares
- crecimiento de producto sin explosión de roles
- coherencia entre UI, APIs y automatización

## 14. Referencias relacionadas

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
- `docs/tasks/to-do/TASK-402-universal-adaptive-home-orchestration.md`
- `docs/tasks/to-do/TASK-285-client-role-differentiation.md`
