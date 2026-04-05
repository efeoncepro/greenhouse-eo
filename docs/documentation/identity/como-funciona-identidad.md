# Como funciona el sistema de identidades

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Ultima actualizacion:** 2026-04-05
> **Documentacion tecnica:** [GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md), [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md)

---

## La idea central

Greenhouse es un portal donde entran dos tipos de personas: **gente de Efeonce** (el equipo interno) y **clientes externos**. Cada persona entra con su cuenta, y el sistema decide automaticamente que puede ver y que puede hacer.

---

## Los roles: "que puedes hacer"

Cada persona tiene uno o mas **roles** asignados. Piensa en ellos como sombreros — puedes usar varios al mismo tiempo.

### Para el equipo interno de Efeonce

| Rol | Que hace |
|-----|----------|
| **Colaborador** | El rol base. Ves tu perfil, tu nomina, tus permisos, tus herramientas. Todos los internos lo tienen |
| **Operaciones** | Ves la operacion completa de la agencia: clientes, capacidad del equipo, delivery, personas |
| **Lider de Cuenta** | Ves y gestionas las cuentas de clientes que tienes a cargo |
| **Nomina** | Gestionas sueldos, compensaciones y periodos de pago. Tambien ves personas |
| **Gestion HR** | Administras personas, estructura del equipo, permisos |
| **Analista de Finanzas** | Operas ingresos, egresos, conciliacion — el dia a dia financiero |
| **Administrador de Finanzas** | Todo lo del analista mas configuracion y acciones sensibles |
| **Lectura de Personas** | Puedes ver perfiles y asignaciones del equipo, pero no modificar |
| **Admin de Herramientas IA** | Gobiernas licencias, herramientas y creditos de IA |
| **Superadministrador** | Ve y hace absolutamente todo. Es el dueno del portal |

### Para clientes externos

| Rol | Que hace |
|-----|----------|
| **Cliente Ejecutivo** | El CMO o VP — ve el dashboard ejecutivo, KPIs de alto nivel |
| **Cliente Manager** | El marketing manager — ve mas detalle operativo, proyectos, sprints |
| **Cliente Especialista** | Acceso limitado a proyectos o campanas especificas |

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

| Tipo | Que significa |
|------|--------------|
| Lider de Cuenta | Dueno comercial de una cuenta u organizacion |
| Lider de Delivery | Responsable de la entrega operativa |
| Revisor Financiero | Valida numeros y finanzas de un scope |
| Delegado de Aprobacion | Aprueba en nombre de otro |
| Lider de Operaciones | Gestiona operaciones de un scope |

> **Detalle tecnico:** [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md §4](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md). Tabla: `greenhouse_core.operational_responsibilities`. API: `GET/POST /api/admin/responsibilities`.

---

## El menu: que ve cada persona al entrar

Cuando alguien inicia sesion, el sistema calcula que secciones del menu mostrar basandose en sus roles:

| Persona | Que ve en el menu |
|---------|-------------------|
| Colaborador (sin otros roles) | Solo "Mi Ficha": perfil, nomina, permisos |
| Operaciones | "Gestion" (agencia, clientes, delivery) + "Personas" |
| Nomina | "Gestion" + "Equipo/HR" + "Personas" |
| Superadministrador | Todo: Gestion, Administracion, Finanzas, HR, Personas, IA, Mi Ficha, Portal cliente |
| Cliente Ejecutivo | Solo su portal: dashboard, proyectos, ciclos, equipo |

Cada vista individual del portal (53 en total) esta registrada en un catalogo. Si tu rol no te da acceso al grupo requerido, esa vista no aparece en tu menu.

> **Detalle tecnico:** El catalogo de vistas esta en [`src/lib/admin/view-access-catalog.ts`](../../src/lib/admin/view-access-catalog.ts). La matriz completa rol-route groups esta en [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md §1.5](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md).

---

## Los candados de seguridad

El sistema tiene protecciones automaticas que no se pueden saltar:

| Proteccion | Que previene |
|-----------|-------------|
| **Siempre al menos un Superadministrador** | Si intentas quitarle el rol al ultimo, el sistema lo bloquea. Previene quedarse sin acceso admin |
| **Solo un Super puede crear otro Super** | Un usuario con otro rol no puede asignar ni revocar el Superadministrador |
| **Super siempre incluye Colaborador** | Un admin siempre tiene su experiencia personal (nomina, perfil, etc.) |
| **Un solo responsable primario por tipo** | Si asignas un nuevo Lider de Cuenta para Acme, el anterior se desplaza automaticamente |
| **Fechas validas en responsabilidades** | No puedes asignar una responsabilidad donde la fecha de inicio es posterior a la de fin |

> **Detalle tecnico:** Los guardrails estan implementados en [`src/lib/admin/role-management.ts`](../../src/lib/admin/role-management.ts) con `RoleGuardrailError` y transacciones con `FOR UPDATE`. Documentado en [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md Delta TASK-247](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md).

---

## Registro de actividad (audit)

Todo cambio importante queda registrado automaticamente como evento de auditoria:

| Que se registra | Cuando |
|-----------------|--------|
| Rol asignado | Cada vez que se le da un rol nuevo a alguien |
| Rol revocado | Cada vez que se le quita un rol a alguien |
| Responsabilidad asignada | Cuando alguien es nombrado responsable de un scope |
| Responsabilidad revocada | Cuando se quita una responsabilidad |
| Login exitoso | Cada vez que alguien entra al portal |
| Login fallido | Cada intento fallido de entrada con credenciales |
| Scope asignado | Cuando se le da acceso a un proyecto o campana especifica |

Cada evento incluye: quien lo hizo, cuando, y los detalles del cambio.

> **Detalle tecnico:** Los eventos se emiten via outbox pattern a `greenhouse_sync.outbox_events`. El catalogo completo esta en [GREENHOUSE_EVENT_CATALOG_V1.md](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md).

---

## En resumen

El sistema funciona como un edificio con tarjetas de acceso:

- Tu **rol** es tu tarjeta — determina a que pisos puedes entrar
- Tu **supervisor** es a quien le pides permiso para ausentarte
- Tu **departamento** es en que oficina te sientas
- Tu **responsabilidad operativa** es de que proyectos o clientes eres dueno

Son cuatro cosas distintas que se gestionan por separado. Cambiar una no afecta a las otras.
