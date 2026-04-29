# Sistema de Identidad, Roles y Acceso

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.5
> **Creado:** 2026-04-05 por Claude (TASK-248)
> **Ultima actualizacion:** 2026-04-29 por Claude (TASK-727 — caso canonico Creative Lead supervisora con menu detallado y matriz de capacidades)
> **Documentacion tecnica:** [GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md), [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md), [GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md)

---

## La idea central

Greenhouse es un portal donde entran dos tipos de personas: **gente de Efeonce** (el equipo interno) y **clientes externos**. Cada persona entra con su cuenta, y el sistema decide automaticamente que puede ver y que puede hacer.

---

## Los roles: "que puedes hacer"

Cada persona tiene uno o mas **roles** asignados. Piensa en ellos como sombreros — puedes usar varios al mismo tiempo.

### Para el equipo interno de Efeonce

| Rol                           | Que hace                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| **Colaborador**               | El rol base. Ves tu perfil, tu nomina, tus permisos, tus herramientas. Todos los internos lo tienen |
| **Operaciones**               | Ves la operacion completa de la agencia: clientes, capacidad del equipo, delivery, personas         |
| **Lider de Cuenta**           | Ves y gestionas las cuentas de clientes que tienes a cargo                                          |
| **Nomina**                    | Gestionas sueldos, compensaciones y periodos de pago. Tambien ves personas                          |
| **Gestion HR**                | Administras personas, estructura del equipo, permisos                                               |
| **Analista de Finanzas**      | Operas ingresos, egresos, conciliacion — el dia a dia financiero                                    |
| **Administrador de Finanzas** | Todo lo del analista mas configuracion y acciones sensibles                                         |
| **Lectura de Personas**       | Puedes ver perfiles y asignaciones del equipo, pero no modificar                                    |
| **Admin de Herramientas IA**  | Gobiernas licencias, herramientas y creditos de IA                                                  |
| **Superadministrador**        | Ve y hace absolutamente todo. Es el dueno del portal                                                |

### Para clientes externos

| Rol                      | Que hace                                                            |
| ------------------------ | ------------------------------------------------------------------- |
| **Cliente Ejecutivo**    | El CMO o VP — ve el dashboard ejecutivo, KPIs de alto nivel         |
| **Cliente Manager**      | El marketing manager — ve mas detalle operativo, proyectos, sprints |
| **Cliente Especialista** | Acceso limitado a proyectos o campanas especificas                  |

### Combinaciones de roles

Los roles se combinan. Algunos ejemplos reales:

- **Julio (fundador):** Superadministrador + Colaborador — puede administrar todo el portal Y tiene su experiencia personal de nomina y perfil
- **Persona de HR:** Colaborador + Nomina + Gestion HR — ve su nomina personal, gestiona la de los demas, y administra estructura del equipo
- **Account Lead:** Colaborador + Lider de Cuenta + Lectura de Personas — experiencia personal + gestion de cuentas + consulta de equipo
- **Junior Designer:** Solo Colaborador — ve su perfil, permisos, asistencia, nomina y herramientas

> **Detalle tecnico:** Los role codes y su mapping a route groups estan definidos en [`src/config/role-codes.ts`](../../src/config/role-codes.ts) y [`src/lib/tenant/role-route-mapping.ts`](../../src/lib/tenant/role-route-mapping.ts). La spec completa esta en [GREENHOUSE_IDENTITY_ACCESS_V2.md §Role Catalog](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md).

---

## Los cuatro planos: "quien es quien y quien responde por que"

El sistema separa claramente cuatro preguntas diferentes que antes se mezclaban:

### 1. Acceso — Que puede ver esta persona en el portal?

Se responde con los roles. Tu rol determina que secciones del menu ves y que APIs puedes llamar.

> **Detalle tecnico:** [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md §1](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md)

### 2. Supervision — A quien le reporta esta persona?

Se responde con una relacion directa: "Maria reporta a Carlos". Esto se usa para aprobar permisos y gastos. No es un rol — es una relacion entre dos personas.

> **Detalle tecnico:** [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md §2](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md). Source of truth: `greenhouse_core.members.reports_to_member_id`.

### 3. Estructura — En que departamento esta esta persona?

Se responde con la estructura organizacional: departamentos, areas, jefaturas. Es para organigramas y taxonomia, no para permisos.

> **Detalle tecnico:** [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md §3](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md). Source of truth: `greenhouse_core.departments`.

### 4. Responsabilidad operativa — Quien responde por esta cuenta/proyecto/space?

Se responde con asignaciones explicitas. Por ejemplo:

- "Ana es la **Lider de Cuenta** de la organizacion Acme"
- "Pedro es el **Lider de Delivery** del space Sky Airlines"
- "Maria es la **Revisora Financiera** del departamento Creatividad"

Cada scope (organizacion, space, proyecto, departamento) puede tener un responsable primario por tipo. Los tipos de responsabilidad disponibles son:

| Tipo                   | Que significa                                |
| ---------------------- | -------------------------------------------- |
| Lider de Cuenta        | Dueno comercial de una cuenta u organizacion |
| Lider de Delivery      | Responsable de la entrega operativa          |
| Revisor Financiero     | Valida numeros y finanzas de un scope        |
| Delegado de Aprobacion | Aprueba en nombre de otro                    |
| Lider de Operaciones   | Gestiona operaciones de un scope             |

> **Detalle tecnico:** [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md §4](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md). Tabla: `greenhouse_core.operational_responsibilities`. API: `GET/POST /api/admin/responsibilities`.

---

## El menu: que ve cada persona al entrar

Cuando alguien inicia sesion, el sistema calcula que secciones del menu mostrar basandose en sus roles:

| Persona                       | Que ve en el menu                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Colaborador (sin otros roles) | Solo "Mi Ficha": perfil, nomina, permisos                                           |
| Operaciones                   | "Gestion" (agencia, clientes, delivery) + "Personas"                                |
| Nomina                        | "Gestion" + "Equipo/HR" + "Personas"                                                |
| Superadministrador            | Todo: Gestion, Administracion, Finanzas, HR, Personas, IA, Mi Ficha, Portal cliente |
| Cliente Ejecutivo             | Solo su portal: Pulse, proyectos, ciclos, equipo                                    |

Cada vista individual del portal (53 en total) esta registrada en un catalogo. Si tu rol no te da acceso al grupo requerido, esa vista no aparece en tu menu.

**Mi Perfil** muestra la informacion completa del colaborador: nombre, email, avatar (sincronizado desde Microsoft Entra), cargo, departamento, nivel, tipo de empleo, fecha de ingreso, telefono, y los sistemas vinculados (Entra, Notion, HubSpot, etc.). Esta informacion se sincroniza automaticamente desde Microsoft Entra ID mediante un cron diario que actualiza fotos, cargos y datos profesionales. Si un usuario recien creado aun no tiene todos los datos sincronizados, se muestra la informacion disponible de la sesion sin mostrar un error.

> **Detalle tecnico:** Los datos de perfil fluyen desde Microsoft Graph → `client_users` + `identity_profiles` → VIEW `person_360` → `toPersonProfileSummary()`. El avatar se almacena en GCS y se sirve via `/api/media/users/{id}/avatar`. El cron de Entra sync corre diariamente a las 8:00 UTC (`src/app/api/cron/entra-profile-sync/route.ts`). Spec: [GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md).

> **Detalle tecnico:** El catalogo de vistas esta en [`src/lib/admin/view-access-catalog.ts`](../../src/lib/admin/view-access-catalog.ts). La matriz completa rol-route groups esta en [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md §1.5](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md). El fallback de perfil usa `toPersonProfileSummaryFromSession()` en [`src/lib/person-360/get-person-profile.ts`](../../src/lib/person-360/get-person-profile.ts).

---

## Que ve cada rol interno (matriz canonica TASK-727)

Desde TASK-727 la matriz "rol x vista" para los 12 roles internos vive **en la base de datos** (`greenhouse_core.role_view_assignments`), no en heuristica de codigo. Cada fila tiene `granted: true` (visible) o `granted: false` (denial explicito, registrado en audit log). Esto cierra fugas como "el rol Operaciones veia la Economia de la agencia" y deja la matriz auditable y editable desde Admin Center.

| Rol                           | Que vistas tiene                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| **Superadministrador**        | Todas las vistas                                                                                  |
| **Operaciones**               | Gestion operativa + organigrama + personas + Mi Ficha. SIN Economia, Staff Augmentation ni nomina cross-team |
| **Lider de Cuenta**           | Cuentas + organizaciones + delivery + campanas + Mi Ficha. SIN Economia ni nomina cross-team      |
| **Colaborador / Empleado**    | Solo "Mi Ficha" (perfil, mi nomina, mis permisos, mis asignaciones)                               |
| **Nomina**                    | Equipo (personas, nomina, permisos, jerarquia, organigrama, departamentos, asistencia) + Mi Ficha |
| **Gestion HR**                | Todo "Equipo" (incluye objetivos y evaluaciones) + Mi Ficha                                       |
| **Analista de Finanzas**      | Todas las "Finanzas" + Economia + Mi Ficha (read-only via capabilities)                           |
| **Administrador de Finanzas** | Analista + Staff Augmentation + Instrumentos de pago                                              |
| **Gerente de Finanzas**       | Administrador de Finanzas + Delivery + Capacidad (cross-context forecasting)                      |
| **People Viewer**             | Solo Personas + Organigrama                                                                       |
| **AI Tooling Admin**          | Solo Herramientas IA + Mi Perfil/Inicio/Organizacion                                              |

**Distincion critica de nomina**: cualquier colaborador interno ve **su propia liquidacion** (`mi_ficha.mi_nomina` → `/my/payroll`). La vista cross-team de nomina (`equipo.nomina` y `equipo.nomina_proyectada`) es sensible y solo la ven HR (`hr_payroll`, `hr_manager`) y Superadministrador.

> **Detalle tecnico:** Seed canonico en [migrations/20260429100204419_task-727-seed-internal-role-view-assignments.sql](../../../migrations/20260429100204419_task-727-seed-internal-role-view-assignments.sql). Tests de regresion en [`src/lib/admin/internal-role-visibility.test.ts`](../../../src/lib/admin/internal-role-visibility.test.ts). El fallback heuristico ([`roleCanAccessViewFallback`](../../../src/lib/admin/view-access-store.ts)) emite warning a Sentry (domain `identity`) cuando se invoca — steady-state esperado = 0.

---

## Supervisores: aprobar permisos del equipo

Si un colaborador tiene **direct reports** en `reporting_lines` (o tiene autoridad delegada via `operational_responsibilities`), el sistema lo reconoce automaticamente como supervisor — **sin necesidad de un rol explicito de "supervisor"**.

Que pasa cuando entras como supervisor:

| Surface                       | Lo que hace                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Aprobar permisos** (`/hr/approvals`) | Lista de solicitudes pendientes de tu subarbol. Aprobar / rechazar con comentario.            |
| **Mi equipo** (`/hr/team`)             | Roster de tus reports directos + delegados, con saldos de permisos y estado.                  |
| **Organigrama parcial**                | Vista del subarbol bajo tu autoridad (solo si tienes `canAccessSupervisorPeople = true`).      |

Antes de TASK-727, este surface se mostraba solo a usuarios cuyo `default_portal_home_path` apuntaba a `/hr` o `/hr/approvals` — una heuristica fragil. Desde TASK-727, el flag `supervisorAccess` se inyecta en el JWT/session derivado de la jerarquia real, y el menu lateral lo consume directo. Cualquier supervisor con reports activos ve el surface, independiente de su pagina de inicio.

> **Detalle tecnico:** Resolver canonico [`getSupervisorScopeForTenant`](../../../src/lib/reporting-hierarchy/access.ts) → wrapper JWT-friendly [`resolveSupervisorAccessSummaryFromMinimalContext`](../../../src/lib/reporting-hierarchy/access.ts) → inyeccion en [`auth.ts`](../../../src/lib/auth.ts) JWT/session callbacks. Tipo [`SupervisorAccessSummary`](../../../src/lib/reporting-hierarchy/types.ts). Menu cleanup en [`VerticalMenu.tsx`](../../../src/components/layout/vertical/VerticalMenu.tsx).

---

## Caso canonico: Creative Lead supervisora (Daniela Ferreira)

Esta seccion documenta con precision lo que ve y puede hacer una **Creative Lead** post-TASK-727. Sirve como referencia concreta para tasks futuras que toquen visibilidad o aprobaciones para roles similares (Account Lead, Strategy Lead, etc.).

### Perfil

| Campo            | Valor                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Roles activos    | `efeonce_operations` + `collaborator`                                 |
| Route groups     | `internal` + `my`                                                     |
| Direct reports   | 3 (Andres Carlosama, Melkin Hernandez, Valentina Hoyos)               |
| Tenant type      | `efeonce_internal`                                                    |
| Supervisor scope | `canAccessSupervisorLeave = true`, `canAccessSupervisorPeople = true` |

### Menu completo que ve

#### Home

- Inicio (`/home`) — Nexa y operacion de hoy

#### Seccion "Gestion"

- Agencia (`/agency`) — workspace operativo institucional
- Spaces (`/agency/spaces`) — clientes activos, postura cross-space
- ❌ Economia — **bloqueada** (denial explicito `gestion.economia`)
- Equipo y talento (collapsible)
  - Equipo de agencia (`/agency/team`)
  - Talent Discovery (`/agency/talent-discovery`)
  - ❌ Staff Augmentation — **bloqueada** (denial explicito)
- Operaciones (collapsible)
  - Delivery (`/agency/delivery`)
  - Campanas (`/agency/campaigns`)
  - Organizaciones (`/agency/organizations`)
  - Servicios (`/agency/services`)
  - Operaciones (`/agency/operations`)
  - Capacidad (`/agency/capacity`)

#### Seccion "Personas y HR" (modo supervisor — sin route_group `hr`)

- Personas (`/people`) — directorio interno
- Mi equipo (`/hr/team`) — roster de los 3 reports
- Aprobar permisos (`/hr/approvals`) — solicitudes pendientes del subarbol
- Organigrama parcial (`/hr/org-chart`) — solo su subarbol

#### Seccion "Mi ficha"

- Mis Asignaciones (`/my/assignments`) — clientes, FTE, capacidad
- Mi Desempeno (`/my/performance`) — ICO, OTD, metricas
- Mi Delivery (`/my/delivery`) — tareas, proyectos, CRM
- Mi Perfil (`/my/profile`)
- Mi Nomina (`/my/payroll`) — su liquidacion personal (NO la del equipo)
- Mis Permisos (`/my/leave`) — saldos y solicitudes propias
- Mi Organizacion (`/my/organization`) — directorio, colegas
- Mis Objetivos (`/my/goals`)
- Mis Evaluaciones (`/my/evaluations`)

### Que NO ve (denegado o sin grant)

- Economia de la agencia (P&L global)
- Staff Augmentation (economics por placement)
- Nomina cross-team / Nomina proyectada (vistas HR sensibles)
- Finanzas (ingresos, egresos, conciliacion, banco, intelligence, etc.)
- Admin Center
- Permisos cross-team de toda la empresa
- Departamentos / Jerarquia / Asistencia globales
- Herramientas IA

### Que puede hacer con certeza

#### Como supervisora

- Aprobar o rechazar solicitudes de permisos de Andres, Melkin, Valentina (con comentario)
- Ver el roster de su equipo: nombre, cargo, saldos de permisos, ausencias proximas
- Ver el organigrama parcial del subarbol bajo su autoridad
- Ver el Person 360 completo de cada uno de sus reports

#### Como operadora (efeonce_operations)

- Ver workspace de la agencia y postura operativa
- Ver Spaces (clientes activos) y entrar a cada uno
- Ver delivery cross-tenant (estado de proyectos, tareas, sprints, riesgos)
- Ver capacidad operativa (dedicacion, FTE asignado, gaps)
- Ver campanas activas cross-space
- Ver operaciones (queue, postura del platform interno)
- Ver organizaciones, servicios contratados, equipo de agencia
- Ver el directorio de Personas y Person 360 de cualquier interno
- Read-only sobre datos comerciales/financieros — su rol no escribe en finanzas/quotes/contratos

#### Como colaboradora (collaborator)

- Solicitar permisos propios y ver historial
- Ver y editar su perfil (foto, datos personales, contacto)
- Ver su nomina personal (liquidaciones historicas)
- Ver sus asignaciones a clientes (FTE, capacidad consumida)
- Ver su desempeno personal (ICO, OTD, metricas)
- Ver su delivery personal (tareas asignadas, proyectos)
- Ver su organizacion (directorio, colegas)
- Crear/actualizar sus objetivos del ciclo activo
- Responder evaluaciones asignadas

#### Lo que NO puede hacer

- Ver P&L de la agencia, margenes, ranking de rentabilidad por Space
- Ver economics de placements de Staff Augmentation
- Ver nomina del equipo (cross-team payroll) ni nomina proyectada
- Aprobar permisos de personas que NO son sus reports directos
- Cambiar roles, capabilities ni asignaciones de otras personas
- Acceder a finanzas, instrumentos de pago, conciliacion, banco
- Acceder a Admin Center
- Modificar el organigrama, jerarquia formal o departamentos

> **Importante para refresh de sesion:** Cuando se aplican cambios al `role_view_assignments` o cambian las `reporting_lines` de una persona, su sesion existente sigue mostrando lo anterior hasta el proximo login. El JWT se materializa una vez al iniciar sesion y carga `authorizedViews` + `supervisorAccess` en ese momento. Para que un cambio sea visible inmediatamente, el usuario debe hacer logout/login. Esto es comportamiento esperado y aceptado por la spec V1 — un follow-up futuro puede agregar refresh on-demand via outbox listener.

---

## Los candados de seguridad

El sistema tiene protecciones automaticas que no se pueden saltar:

| Proteccion                                 | Que previene                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Siempre al menos un Superadministrador** | Si intentas quitarle el rol al ultimo, el sistema lo bloquea. Previene quedarse sin acceso admin |
| **Solo un Super puede crear otro Super**   | Un usuario con otro rol no puede asignar ni revocar el Superadministrador                        |
| **Super siempre incluye Colaborador**      | Un admin siempre tiene su experiencia personal (nomina, perfil, etc.)                            |
| **Un solo responsable primario por tipo**  | Si asignas un nuevo Lider de Cuenta para Acme, el anterior se desplaza automaticamente           |
| **Fechas validas en responsabilidades**    | No puedes asignar una responsabilidad donde la fecha de inicio es posterior a la de fin          |

> **Detalle tecnico:** Los guardrails estan implementados en [`src/lib/admin/role-management.ts`](../../src/lib/admin/role-management.ts) con `RoleGuardrailError` y transacciones con `FOR UPDATE`. Documentado en [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md Delta TASK-247](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md).

---

## Registro de actividad (audit)

Todo cambio importante queda registrado automaticamente como evento de auditoria:

| Que se registra          | Cuando                                                    |
| ------------------------ | --------------------------------------------------------- |
| Rol asignado             | Cada vez que se le da un rol nuevo a alguien              |
| Rol revocado             | Cada vez que se le quita un rol a alguien                 |
| Responsabilidad asignada | Cuando alguien es nombrado responsable de un scope        |
| Responsabilidad revocada | Cuando se quita una responsabilidad                       |
| Login exitoso            | Cada vez que alguien entra al portal                      |
| Login fallido            | Cada intento fallido de entrada con credenciales          |
| Scope asignado           | Cuando se le da acceso a un proyecto o campana especifica |

Cada evento incluye: quien lo hizo, cuando, y los detalles del cambio.

> **Detalle tecnico:** Los eventos se emiten via outbox pattern a `greenhouse_sync.outbox_events`. El catalogo completo esta en [GREENHOUSE_EVENT_CATALOG_V1.md](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md).

---

## Gobernanza de acceso en Admin Center

Greenhouse ahora separa dos trabajos distintos:

### 1. Politica base

Vive en **Admin Center > Gobernanza de acceso**.

Desde ahi un administrador puede:

- revisar el catalogo de capabilities activas
- definir defaults por rol
- ver el mapa entre una vista del portal y la capability que la sostiene
- revisar la politica de inicio de Home
- auditar cambios recientes

Importante: el catalogo de capabilities sigue siendo una base canonica del sistema, no una lista que se inventa a mano en la UI. Lo que si se administra desde Admin Center son las **excepciones y overlays operativos** sobre ese catalogo.

### 2. Caso individual

Vive en **Admin Center > Usuarios > [usuario] > Acceso**.

Desde ahi un administrador puede:

- ver los roles base del usuario
- ver las vistas activas hoy
- revisar los permisos efectivos por capability, accion y scope
- agregar o quitar excepciones manuales
- cambiar la politica de inicio solo para esa persona

La pantalla responde cuatro preguntas operativas:

1. que ve esta persona
2. por que lo ve
3. que excepcion manual tiene
4. cual sera su Home de inicio al entrar

### Como se resuelve el acceso efectivo

Greenhouse combina cuatro capas, en este orden:

1. **Runtime base** — lo que se deriva desde roles, route groups y vistas autorizadas
2. **Defaults por rol** — grants o revokes adicionales definidos por Admin Center
3. **Overrides por usuario** — excepciones individuales con motivo y vencimiento opcional
4. **Politica de inicio** — el Home sugerido y, si aplica, una excepcion individual guardada

Eso permite que el sistema siga siendo compatible con el modelo actual de vistas y permission sets, pero ya no obliga a resolver todo con reglas duras escondidas en codigo.

### La politica de inicio (Home)

La politica de inicio ya no es solo "a que ruta te mando". Greenhouse distingue entre:

- **politica global** — la que se deriva automaticamente del contexto del usuario
- **excepcion individual** — un path configurado solo para esa persona

Ejemplos:

- un colaborador puro normalmente cae en **My**
- alguien de HR cae en **HR Workspace**
- alguien de finanzas cae en **Finance Workspace**
- un superadministrador cae en **Internal Home**

Si una persona tiene una excepcion individual valida, esa excepcion se usa. Si no, el sistema vuelve a la politica global.

### Que sigue igual

- los roles siguen definiendo la identidad base
- los route groups siguen definiendo las superficies grandes del portal
- las vistas autorizadas siguen siendo utiles para surfaces finas
- los permission sets siguen agregando vistas reutilizables

La diferencia es que ahora Admin Center tambien puede explicar y operar la capa de capabilities sin depender de cambios manuales en base de datos o de editar codigo para cada caso.

---

## Acceso para agentes y automatizaciones

Greenhouse incluye un mecanismo especial para que agentes de IA y tests automatizados (E2E) puedan obtener una sesion valida del portal sin pasar por el formulario de login.

### Por que existe

Los agentes de desarrollo (Claude, Copilot, Codex) y los tests de Playwright necesitan navegar el portal como un usuario real para verificar que las paginas funcionan. Si usaran la cuenta de una persona real, cualquier cambio de password o de rol romperia las pruebas sin aviso. Ademas, los eventos generados por un agente quedarian mezclados con los de un usuario humano.

### Como funciona

1. El agente envia un **secreto compartido** junto con el email de un usuario existente a un endpoint especial
2. El sistema verifica que el secreto sea correcto (usando comparacion segura contra timing attacks)
3. Busca al usuario en la base de datos — si no existe, rechaza la solicitud
4. Genera una cookie de sesion valida identica a la que obtendria un usuario al hacer login normal
5. El agente usa esa cookie para navegar el portal como si fuera ese usuario

### El usuario de agente

Existe un usuario dedicado exclusivamente para agentes y tests automatizados:

| Dato           | Valor                            |
| -------------- | -------------------------------- |
| Email          | `agent@greenhouse.efeonce.org`   |
| Password       | `Gh-Agent-2026!`                 |
| ID de usuario  | `user-agent-e2e-001`             |
| Tipo de tenant | Interno de Efeonce               |
| Roles          | Superadministrador + Colaborador |

Este usuario fue creado via migracion de base de datos (`20260405151705425_provision-agent-e2e-user.sql`) y no debe usarse para acceso humano.

### Modos de uso

| Modo              | Que hace                                           | Cuando usarlo                                        |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------- |
| **API** (default) | Llama al endpoint directamente sin abrir navegador | Tests automatizados, agentes AI, CI/CD               |
| **Credentials**   | Abre un navegador y llena el formulario de login   | Cuando se necesita probar el flujo completo de login |

### Restricciones de seguridad

- **Produccion bloqueada**: el endpoint no funciona en el entorno de produccion salvo configuracion explicita
- **Sin secreto, invisible**: si la variable `AGENT_AUTH_SECRET` no esta configurada, el endpoint ni siquiera aparece (devuelve 404)
- **No crea usuarios**: solo puede autenticar usuarios que ya existen en la base de datos
- **Comparacion segura**: el secreto se valida con `timingSafeEqual` para prevenir ataques de timing

> **Detalle tecnico:** El endpoint es `POST /api/auth/agent-session`, documentado en [GREENHOUSE_IDENTITY_ACCESS_V2.md — Agent Auth](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md). Script de setup: `scripts/playwright-auth-setup.mjs`. Lookup PG-first: `getTenantAccessRecordForAgent()` en `src/lib/tenant/access.ts`.

---

## En resumen

El sistema funciona como un edificio con tarjetas de acceso:

- Tu **rol** es tu tarjeta — determina a que pisos puedes entrar
- Tu **supervisor** es a quien le pides permiso para ausentarte
- Tu **departamento** es en que oficina te sientas
- Tu **responsabilidad operativa** es de que proyectos o clientes eres dueno

Son cuatro cosas distintas que se gestionan por separado. Cambiar una no afecta a las otras.
