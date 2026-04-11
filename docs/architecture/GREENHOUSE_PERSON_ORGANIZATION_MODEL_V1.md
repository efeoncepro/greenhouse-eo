# Greenhouse Person ↔ Organization Model V1

**Version 1.0 — April 2026**

## Purpose

Documentar el modelo de negocio de Efeonce como agencia, las dos poblaciones de personas que genera, y cómo el sistema vincula personas a organizaciones a través de dos grafos complementarios (operativo y estructural). Este documento formaliza contratos que hoy existen implícitos en el código pero no estaban documentados.

Usar junto con:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canónico 360
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md` — contrato identity_profile vs member vs user
- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md` — schema y operaciones Account 360
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — auth principal, RBAC, route groups
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — módulo Finance, dual-store, outbox

## Status

Contrato vigente desde 2026-04-02.

Este documento describe el estado real del sistema y formaliza decisiones que estaban implícitas en el código. No introduce cambios — documenta lo que ya es.

Gaps identificados y cierre operativo quedan catalogados en `TASK-193` (`docs/tasks/complete/TASK-193-person-organization-synergy-activation.md`).

## Delta 2026-04-02 — TASK-193 activation slice aplicado

- La org canónica `Efeonce` quedó regularizada como `operating entity` real en runtime:
  - `legal_name = 'Efeonce Group SpA'`
  - `tax_id = '77.357.182-1'`
  - `is_operating_entity = TRUE`
- Los `members` activos con `identity_profile_id` quedaron backfilleados como `person_memberships(team_member)` en la operating entity y esa membership pasa a ser primaria para colaboradores internos.
- `greenhouse_serving.session_360` ya resuelve `organization_id` para ambos tenant types:
  - `client` vía `spaces.client_id -> organization_id` con fallback a primary membership
  - `efeonce_internal` vía operating entity con fallback a membership
- `greenhouse_serving.person_360` ya publica `primary_organization_id`, `primary_organization_name`, `primary_membership_type`, `organization_membership_count`, aliases canónicos (`eo_id`, `member_id`, `user_id`) y `is_efeonce_collaborator`.
- `CanonicalPersonRecord` ya consume contexto organizacional primario y `Finance` ya acepta `organizationId` opcional para scoping downstream.
- `Organization memberships` ahora exponen la distinción operativa `internal` vs `staff_augmentation` como contexto del vínculo cliente sobre `team_member`; no se creó un `membership_type` nuevo.

## Delta 2026-04-11 — semántica explícita para estructura, equipos operativos y capacidad extendida

- Greenhouse ya no debe usar la palabra `equipo` como sinónimo de cualquier relación entre personas.
- Quedan formalizadas cuatro capas distintas de relación para una persona de Efeonce:
  - **estructura interna** — departamento, supervisoría formal, subárbol, liderazgo de área
  - **equipos operativos** — pods/squads/cuentas que atienden clientes y mezclan varias áreas
  - **trabajo puntual** — proyectos, campañas e iniciativas concretas
  - **capacidad extendida** — freelancers, contractors y colaboradores externos que participan en la operación pero no pertenecen a la estructura interna
- Regla nueva:
  - `departments` y `reporting_lines` gobiernan solo la estructura interna
  - `client_team_assignments` y relaciones operativas similares gobiernan equipos de servicio
  - `staff_augmentation` y vínculos equivalentes siguen siendo relaciones operativas; no deben contaminar organigrama, jerarquía ni adscripción estructural
- Implicación de UI:
  - surfaces como `Mi Perfil`, `People`, `Org Chart` y directorios internos deben separar explícitamente `estructura`, `equipos operativos` y `capacidad extendida`
  - `colegas` no debe seguir tratándose como una bolsa plana de toda la organización cuando el caso de uso real es `mi área`, `mis equipos` o `personas externas con las que colaboro`

## Delta 2026-04-02 — org-scoping de People y contactos mínimos de supplier

- `People` ya tiene un carril shared de scope organizacional vía `resolvePeopleOrganizationScope()`:
  - `finance`
  - `delivery`
  - `ico-profile`
  - `ico`
  - `GET /api/people/[memberId]`
- Cuando el request viene org-scoped desde tenant `client`, esos readers consumen `organizationId` y reducen el universo visible al set de `client_id` asociados a esa organización.
- `HR` e `intelligence` quedan explícitamente fuera de ese scope client-facing:
  - siguen siendo surfaces internas
  - para tenant `client` responden `403`
  - no deben tratarse como “faltó org-scoping”, porque exponen contrato, leave, compensación, costo y capacidad interna de Efeonce
- La foundation mínima de Población C dejó de ser completamente nula:
  - `organizations/[id]/memberships` ya puede sembrar `identity_profiles` ad hoc con nombre + email
  - `finance/suppliers` create/update ya intentan vincular `organization contact memberships` cuando el supplier tiene `organization_id` y contacto usable
  - `Finance Suppliers` detail/list ya prioriza esos contactos vía `organizationContacts` / `contactSummary`
  - `primary_contact_*` se mantiene como cache/compatibilidad mientras el fallback BigQuery y el directorio completo de proveedores siguen migrando

---

## Core Thesis: Efeonce como agencia

Efeonce Group es una agencia que atiende clientes. No es una empresa SaaS multi-tenant donde cada tenant es autónomo — es una organización que emplea colaboradores y los asigna a trabajar para organizaciones externas.

Esta realidad define:
- Dos poblaciones de personas radicalmente distintas en el sistema
- Dos grafos complementarios para vincular personas a organizaciones
- Una asimetría fundamental: los colaboradores de Efeonce generan datos operativos (payroll, capacidad, ICO, costo); las personas externas no

---

## Key Terms

| Concepto | Definición | Tabla raíz |
|----------|-----------|------------|
| **Person** | Humano canónico, independiente de sistema fuente | `greenhouse_core.identity_profiles` |
| **Member** | Faceta operativa de un colaborador de Efeonce: payroll, HR, capacidad, costo | `greenhouse_core.members` |
| **User** | Principal de autenticación en el portal | `greenhouse_core.client_users` |
| **Organization** | Entidad B2B: cliente, proveedor, o ambos | `greenhouse_core.organizations` |
| **Space** | Tenant operativo bajo una org, puente a legacy `client_id` | `greenhouse_core.spaces` |
| **Membership** | Vínculo persona → organización con contexto (rol, tipo, departamento, vigencia) | `greenhouse_core.person_memberships` |
| **Assignment** | Asignación operativa de un member a un cliente: FTE, capacidad, economics | `greenhouse_core.client_team_assignments` |
| **Operating Entity** | La org de Efeonce: empleador, emisor de DTEs, entidad de payroll (`is_operating_entity = TRUE`) | `greenhouse_core.organizations` |
| **Structural Team** | Equipo interno formal de una persona: área/departamento + cadena de supervisoría | `greenhouse_core.departments` + `greenhouse_core.reporting_lines` |
| **Operational Team** | Equipo de entrega al cliente o squad operativo, potencialmente cross-funcional | `greenhouse_core.client_team_assignments` + proyecciones/ownership operativo |
| **Extended Capacity** | Participación operativa de talento no estructural: freelancers, contractors, on-demand | misma capa operativa; nunca la jerarquía formal |

---

## Population Model

### Población A — Colaboradores Efeonce

Empleados de Efeonce que se asignan a atender clientes.

| Capa | Tabla | Rol |
|------|-------|-----|
| Identidad | `identity_profiles` | Ancla canónica del humano |
| Faceta operativa | `members` (FK `identity_profile_id`) | Colaborador con payroll, HR, capacidad, FTE |
| Asignación a cliente | `client_team_assignments` (FK `member_id`) | Qué cliente atiende, con cuánto FTE, desde/hasta cuándo |
| Membership en org cliente | `person_memberships` tipo `team_member` | Proyectado automáticamente desde assignments |
| Acceso al portal | `client_users` (`tenant_type = 'efeonce_internal'`) | Principal de autenticación |

Características:
- Tienen payroll, compensación, capacidad, ICO, costo laboral
- Pueden atender múltiples clientes simultáneamente (múltiples assignments)
- Sus memberships `team_member` en orgs cliente son **proyecciones de assignments**, no relaciones laborales directas
- Su session resuelve `tenant_type = 'efeonce_internal'`
- Acceden a rutas internas: `internal`, `admin`, `finance`, `hr`, `people`, `employee`

### Población B — Personas del cliente

Empleados del cliente (no de Efeonce). Contactos, usuarios del portal, facturación.

| Capa | Tabla | Rol |
|------|-------|-----|
| Identidad | `identity_profiles` | Ancla canónica (creada por HubSpot sync o manualmente) |
| Membership en su org | `person_memberships` tipo `contact` / `client_user` / `billing` | Relación laboral real con la org cliente |
| Acceso al portal | `client_users` (`tenant_type = 'client'`) | Principal de autenticación |
| Sin faceta Member | — | NO son `members` de Efeonce, no tienen payroll ni capacidad |

Características:
- No generan datos operativos de Efeonce (ni payroll, ni ICO, ni costo laboral)
- Sus memberships son relaciones laborales reales ("esta persona TRABAJA en esta org")
- Su session resuelve `tenant_type = 'client'`
- Acceden a rutas cliente: `client` (dashboard, proyectos, equipo, campañas)
- Data scoping efectivo vía `clientId` en session — ven solo los datos de su organización

### Población C — Personas de proveedores (no modelada)

Contactos de organizaciones tipo `supplier`. Reciben gastos, POs, HES.

| Capa | Estado | Nota |
|------|--------|------|
| Identidad | Puede no existir | Muchos proveedores legacy solo tienen nombre comercial como string en Finance; create/update nuevos ya pueden sembrar `identity_profiles` mínimos |
| Org proveedor | `organizations` WHERE `organization_type IN ('supplier', 'both')` | Entidad a la que se emiten POs y gastos |
| Membership | Foundation mínima + read-path híbrido | Ya se pueden sembrar `person_memberships(contact)` para contactos primarios de supplier y `Finance Suppliers` ya los prioriza en detail/list; sigue faltando un directorio canónico completo |

Gap residual catalogado en `TASK-193` (G5).

### Tabla resumen de poblaciones

| Aspecto | Población A | Población B | Población C |
|---------|-------------|-------------|-------------|
| Relación con Efeonce | Empleado | Cliente/contacto externo | Proveedor/contacto externo |
| `member` facet | Si | No | No |
| `tenant_type` | `efeonce_internal` | `client` | Sin acceso al portal |
| Membership types | `team_member` (proyectado) | `contact`, `client_user`, `billing` | (no modelado) |
| Genera economics | Si (payroll, cost, capacity) | No | No (recibe gastos/POs) |
| Org scoping | Ve todos los clientes | Ve solo su org/client | N/A |

---

## Organization Types

| Tipo | `organization_type` | Flag | Significado |
|------|---------------------|------|-------------|
| Operating Entity | `'other'` + `is_operating_entity = TRUE` | `is_operating_entity` | Efeonce — empleador, DTE issuer, payroll entity |
| Cliente | `'client'` | — | Empresa que contrata a Efeonce |
| Proveedor | `'supplier'` | — | Proveedor externo |
| Dual | `'both'` | — | Entidad que es cliente Y proveedor simultáneamente |
| Otra | `'other'` | — | Orgs sin clasificar |

Regla de promoción: cuando una org tipo `client` se usa como proveedor (vía `ensureOrganizationForSupplier`), su tipo se promueve a `both`. Implementado en `src/lib/account-360/organization-identity.ts`.

---

## Two Graphs: Operational and Structural

El sistema tiene dos grafos complementarios para vincular personas a organizaciones. Esto no es un accidente ni un gap — es consecuencia del modelo de agencia.

### Grafo operativo — Assignments

```
member ──[client_team_assignments]──→ client_id
                                         │
                                    FTE, capacity, start/end, assignment_type
                                         │
                                    Alimenta: payroll cost allocation,
                                    commercial cost attribution,
                                    member capacity economics,
                                    operational P&L snapshots
```

- **Tabla:** `greenhouse_core.client_team_assignments`
- **Granularidad:** member → client (por `client_id`, no `organization_id`)
- **Datos:** FTE allocation (0.1–2.0), contracted hours, start/end dates, `assignment_type` (`internal` | `staff_augmentation`)
- **Consumers:** payroll cost allocation, commercial cost attribution, capacity breakdown, economics
- **Solo aplica a:** Población A

### Grafo estructural — Memberships

```
identity_profile ──[person_memberships]──→ organization_id
                                               │
                                          membership_type, role_label,
                                          department, is_primary, tenure
                                               │
                                          Alimenta: org detail, person detail,
                                          HubSpot sync, navigation, context
```

- **Tabla:** `greenhouse_core.person_memberships`
- **Granularidad:** person → organization (por `organization_id`)
- **Datos:** membership_type, role_label, department, is_primary, start/end dates
- **Consumers:** organization detail, person detail, HubSpot sync, UI navigation
- **Aplica a:** Población A (como proyección) y Población B (como relación directa)

### Regla de interpretación

- **Grafo estructural** responde:
  - dónde está una persona en Efeonce
  - qué área lidera
  - a quién reporta
  - quién cae en su subárbol formal
- **Grafo operativo** responde:
  - con qué cliente/equipo trabaja una persona
  - qué mezcla de áreas participa en la entrega
  - cuánto FTE dedica cada integrante
  - qué capacidad extendida externa participa en ese equipo

No deben colapsarse ambos grafos bajo una sola etiqueta de `equipo`.

### Bridge: Assignment → Membership Sync

Los dos grafos están conectados por una proyección event-driven:

**Archivo:** `src/lib/sync/projections/assignment-membership-sync.ts`

**Comportamiento:**
- **Trigger:** eventos `assignment.created`, `assignment.updated`, `assignment.removed`
- **Create/Update:** Cuando se crea o actualiza un assignment, la proyección:
  1. Resuelve `member_id` → `identity_profile_id` (vía `members`)
  2. Resuelve `client_id` → `organization_id` (vía `spaces` bridge)
  3. Crea o reactiva `person_membership(team_member)` en esa org
  4. Emite evento `membership.created` con `source: 'assignment_sync'`
- **Remove:** Solo desactiva la membership si el member no tiene OTRAS assignments activas a clientes de la misma org (consolidación org-level)
- **Cardinalidad:** N assignments al mismo org → 1 membership. La consolidación es a nivel org, no client.

**Contrato:** `team_member` memberships de Población A son proyecciones del grafo operativo. No deben crearse manualmente para Pob. A — el sync las mantiene.

### Diagrama completo

```
Efeonce (operating_entity = TRUE)
├── members (Pob. A: colaboradores)
│   ├── client_team_assignments → Client X (FTE, cost, capacity)
│   │   └── [assignment_membership_sync projection]
│   │       └── person_memberships(team_member) → Org of Client X
│   ├── client_team_assignments → Client Y
│   │   └── [assignment_membership_sync projection]
│   │       └── person_memberships(team_member) → Org of Client Y
│   └── person_memberships(team_member) → Operating Entity Efeonce
│
Org Client X (organization_type = 'client')
├── spaces → client_id bridge
├── person_memberships(team_member) → Pob. A (proyectados desde assignments)
├── person_memberships(contact) → Pob. B (relación directa)
├── person_memberships(client_user) → Pob. B (relación directa)
└── person_memberships(billing) → Pob. B (relación directa)

Org Supplier Y (organization_type = 'supplier')
├── Recibe expenses, POs, HES
└── person_memberships → (vacío — Pob. C no modelada)
```

---

## Membership Type Contract

### Enum vigente

Definido por CHECK constraint en `person_memberships.membership_type`:

```
team_member, client_contact, client_user, contact, billing, contractor, partner, advisor
```

### Clasificación por población

| `membership_type` | Población | Significado | Source of truth |
|--------------------|-----------|-------------|-----------------|
| `team_member` | A | Colaborador Efeonce asignado a esta org | Proyección de `client_team_assignments` vía `assignment_membership_sync` |
| `contact` | B / C | Contacto general de la org | Manual o HubSpot sync |
| `client_contact` | B | Contacto del cliente (legacy, equivalente a `contact`) | HubSpot sync |
| `client_user` | B | Usuario del portal de la org | Manual o reconciliation |
| `billing` | B / C | Contacto de facturación | Manual |
| `contractor` | B | Contratista externo de la org | Manual |
| `partner` | B | Partner/socio | Manual |
| `advisor` | B | Asesor | Manual |

### Regla de discriminación

```typescript
// Población A: colaboradores Efeonce asignados a esta org
const isEfeonceAssignment = (type: string) => type === 'team_member'

// Población B/C: personas nativas de la org
const isOrgNative = (type: string) => !isEfeonceAssignment(type)
```

No existe un helper institucionalizado hoy — las queries usan `= 'team_member'` hardcodeado. `TASK-193` propone formalizarlo.

---

## Session & Tenant Model

### Campos Account 360 en session

`TenantAccessRecord` (resuelto desde `session_360` serving view) ya incluye:

| Campo | Tipo | Estado |
|-------|------|--------|
| `organizationId` | `string \| null` | Nullable — pendiente de población consistente |
| `organizationName` | `string \| null` | Nullable |
| `spaceId` | `string \| null` | Nullable |
| `memberId` | `string \| null` | Poblado para Pob. A con member facet |
| `identityProfileId` | `string \| null` | Poblado cuando hay identity link |

**Archivo:** `src/lib/tenant/identity-store.ts:165` — comment: `"nullable until M1 migration populates spaces/organizations"`

### Diferencia entre poblaciones en session

| Aspecto | Población A | Población B |
|---------|-------------|-------------|
| `tenantType` | `'efeonce_internal'` | `'client'` |
| `clientId` | Nullable (interno) | Required (cliente) |
| `memberId` | Presente (linked to person) | Ausente |
| `organizationId` | Debería ser operating entity | Debería resolverse desde `spaces.client_id` |
| `portalHomePath` | `/home` | `/dashboard` |
| Route groups | `internal`, `admin`, `finance`, `hr`, `people`, `employee`, `ai_tooling` | `client` |
| Role prefix | `efeonce_*` | `client_*` |
| Data scope | Ve todos los clientes | Ve solo su `clientId` |

### Gap: `organizationId` no está consistentemente poblado

Para Pob. A, debería ser siempre el operating entity (Efeonce).
Para Pob. B, debería resolverse desde `spaces` WHERE `client_id` = session `client_id`.
Hoy está vacío para la mayoría de usuarios. Catalogado en `TASK-193` (G2).

---

## Staff Augmentation

`client_team_assignments` distingue `assignment_type`:
- `'internal'` — colaborador Efeonce trabaja desde Efeonce para el cliente
- `'staff_augmentation'` — colaborador Efeonce colocado ON-SITE como pseudo-empleado del cliente

Ambos tipos generan la misma membership `team_member` vía `assignment_membership_sync`.

Decisión vigente:
- `staff_augmentation` no crea una nueva clase de persona ni un `membership_type` adicional
- la persona sigue siendo colaborador Efeonce con membership primaria en la operating entity
- la relación con la org cliente sigue siendo `team_member`, enriquecida con `assignmentType`, `assignedFte` y metadata laboral cuando existe faceta `member`

Esto permite que readers y UI distingan `internal` vs `staff_augmentation` sin deformar el grafo estructural. El gap residual de `TASK-193` (G7) queda acotado a seguir propagando ese contexto en consumers downstream adicionales, no a cambiar el modelo base.

### Extensión del principio a capacidad extendida

La misma regla aplica a freelancers, contractors externos y talento on-demand:

- pertenecen a la capa operativa, no a la estructura formal de Efeonce
- pueden formar parte de un equipo de servicio, un squad o una cobertura de delivery
- no deben convertirse en `department head`, `reporting line`, nodo estructural del organigrama ni miembro del subárbol formal salvo que exista un contrato interno explícito que los materialice como faceta `member`

En otras palabras:

- **capacidad extendida sí** aparece en rosters operativos
- **capacidad extendida no** redefine departamentos ni jerarquías

---

## Surface Semantics

Este documento deja un contrato semántico para surfaces que muestran personas, especialmente `Mi Perfil`, `People`, `Org Chart` y vistas de workspace:

### Estructura

Debe responder: **“Dónde estoy en Efeonce?”**

Fuente:
- `greenhouse_core.departments`
- `greenhouse_core.reporting_lines`
- `departments.head_member_id`
- `members.department_id`

Puede mostrar:
- departamento/área
- supervisor formal
- breadcrumb estructural
- reportes directos / subárbol
- liderazgo de área

No debe mostrar:
- equipos cliente
- squads operativos
- freelancers on-demand como si fueran parte del organigrama

### Equipos

Debe responder: **“Con quién entrego valor?”**

Fuente:
- `greenhouse_core.client_team_assignments`
- ownership operativo por cliente/space/proyecto
- proyecciones de roster y cobertura

Puede mostrar:
- cuentas/clientes como `Sky`
- squads operativos cross-funcionales
- internos + capacidad extendida
- rol operativo
- dedicación / FTE

No debe asumirse como sinónimo de departamento.

### Proyectos

Debe responder: **“En qué iniciativas concretas participo?”**

Fuente:
- proyectos/campañas/iniciativas puntuales

Puede cruzarse con `Equipos`, pero no los reemplaza.

### Personas

Debe responder: **“Qué red humana es relevante para mí?”**

No debe resolverse como una lista plana de toda la organización bajo la palabra `colegas`.

Debe poder desagregar al menos en:
- `mi área` — cercanía estructural
- `mis equipos` — cercanía operativa
- `capacidad extendida` — externos con los que colaboro

### Regla de naming

- `Área` / `Departamento` = estructura formal
- `Equipo` = unidad operativa de entrega
- `Proyecto` = trabajo puntual
- `Capacidad extendida` = talento externo no estructural
- `Colegas` no debe usarse como source of truth conceptual cuando el reader necesita distinguir estructura, operación y externalidad

---

## Economics Flow

```
client_team_assignments (FTE per member per client)
    │
    ├──→ payroll_cost_allocation
    │    Distributes member's gross cost across clients proportionally by FTE
    │    Formula: allocated_cost = member_gross × (assignment.fte / total_member_fte)
    │
    ├──→ commercial_cost_attribution (serving table)
    │    Classification: active + positive FTE + external client = commercial_billable
    │    Internal clients excluded
    │
    ├──→ member_capacity_economics (serving table)
    │    Contracted hours, assigned hours, used hours, available capacity
    │    Base: 160 hours per 1.0 FTE
    │
    └──→ organization_economics (aggregated)
         Revenue + labor cost + direct/indirect costs + margins per org
         Bridge: assignments → spaces.client_id → spaces.organization_id
```

**Solo aplica a Población A.** Población B no genera economics — consume surfaces (dashboards, proyectos, equipo).

---

## Known Follow-ons (post TASK-193)

| # | Gap | Poblaciones | Referencia |
|---|-----|-------------|-----------|
| G0 | Helpers/shared typing de `membership_type` todavía parciales; el CHECK ya estaba resuelto | A + B | `TASK-193` Fase 0 |
| G1 | `CanonicalPersonRecord` ya tiene contexto org; queda extender consumers residuales | A + B | `TASK-193` Fase 1 |
| G2 | `session_360` ya resuelve `organizationId` para ambos tenant types; quedan consumers legacy client-first | A + B | `TASK-193` Fase 1 |
| G3 | `HR` e `intelligence` quedan explícitamente como surfaces internas; cualquier versión client-safe futura requerirá otro contrato | A + B | `TASK-193` Fase 3 |
| G4 | Cerrado en runtime: colaboradores Efeonce ya tienen membership en operating entity | A | `TASK-193` Fase 0 |
| G5 | Proveedores con read-path híbrido; falta directorio fully canonical | C | `TASK-193` Fase 4 |
| G6 | Orgs duales (`both`) sin distinción de facets | B + C | `TASK-193` Fase 4 |
| G7 | Staff aug con distinción operativa base cerrada; queda propagación downstream adicional si hiciera falta | A | `TASK-193` Fase 3 |
| G8 | Payroll 100% member-centric, sin vista org-scoped | A | `TASK-193` Fase 4 |
| G9 | `createIdentityProfile` ahora deduplica por email, pero sigue fuera del reconciliation engine completo | B | `TASK-193` Fase 4 |
| G10 | Serving views ya cruzan org↔person en el slice base; quedan enrichments posteriores por facet | A + B | `TASK-193` Fase 2 |

---

## Implementation References

### Core files

| File | Layer | Purpose |
|------|-------|---------|
| `src/lib/account-360/organization-store.ts` | Store | CRUD organizaciones, memberships, search |
| `src/lib/account-360/organization-identity.ts` | Store | Operating entity, find/ensure org by tax_id/hubspot |
| `src/lib/account-360/organization-economics.ts` | Store | Economics aggregation per org |
| `src/lib/account-360/organization-executive.ts` | Store | Executive snapshot consolidation |
| `src/lib/identity/canonical-person.ts` | Store | Resolución canónica de persona (sin org context hoy) |
| `src/lib/sync/projections/assignment-membership-sync.ts` | Projection | Bridge assignments → memberships |
| `src/lib/tenant/identity-store.ts` | Session | Session resolution desde `session_360` |
| `src/lib/tenant/access.ts` | Session | `TenantAccessRecord` con campos Account 360 |
| `src/lib/tenant/authorization.ts` | Auth | Guards por route group y tenant type |
| `src/lib/people/get-person-detail.ts` | Store | Person detail con memberships |
| `src/lib/person-360/get-person-finance.ts` | Store | Person finance facet (cruza org name) |

### Serving views

| View / Table | Schema | Purpose |
|-------------|--------|---------|
| `session_360` | `greenhouse_serving` | Session resolution con fallback a primary membership y operating entity |
| `person_360` | `greenhouse_serving` | Read-optimized person con org primaria, aliases canónicos y collaborator flag |
| `organization_360` | `greenhouse_serving` | Read-optimized org con people aggregate |
| `commercial_cost_attribution` | `greenhouse_serving` | Cost allocation member → client |
| `member_capacity_economics` | `greenhouse_serving` | Capacity snapshot per member per period |
| `operational_pl_snapshots` | `greenhouse_serving` | P&L agregado org-level |

### UI components

| Component | Path | Purpose |
|-----------|------|---------|
| `PersonMembershipsTab` | `src/views/greenhouse/people/tabs/` | Memberships de una persona (default: `team_member`) |
| `AddPersonMembershipDrawer` | `src/views/greenhouse/people/drawers/` | Agregar persona a org (default: `team_member`) |
| `AddMembershipDrawer` | `src/views/greenhouse/organizations/drawers/` | Agregar persona desde org (default: `contact`) |
| `EditPersonMembershipDrawer` | `src/views/greenhouse/people/drawers/` | Editar membership |
