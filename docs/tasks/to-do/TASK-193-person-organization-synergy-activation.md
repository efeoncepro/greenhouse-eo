# TASK-193 — Person ↔ Organization Synergy Activation

> **Status:** to-do
> **Priority:** P1
> **Impact:** Alto — desbloquea org-scoping transversal para todos los módulos downstream
> **Effort:** Alto
> **Created:** 2026-04-02

**Architecture doc:** `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`

## Objetivo

Cablear las sinergias reales entre Person (`identity_profiles`) y Organization (`organizations`) que hoy existen a nivel de schema pero no están siendo consumidas por los módulos downstream. La infraestructura Account 360 (`person_memberships`, serving views, assignment sync) está construida; lo que falta es que finance, payroll, delivery, session y resolución canónica la aprovechen — con claridad sobre las dos poblaciones distintas que conviven en el modelo.

## Modelo de negocio: Efeonce como agencia

Efeonce es una agencia que atiende clientes. Esto define dos poblaciones de personas radicalmente distintas en el sistema:

### Población A — Colaboradores Efeonce

Empleados de Efeonce que se asignan a atender clientes.

| Capa | Tabla | Rol |
|------|-------|-----|
| Identidad | `identity_profiles` | Ancla canónica del humano |
| Facet operativa | `members` (FK `identity_profile_id`) | Colaborador con payroll, HR, capacidad, FTE |
| Asignación a cliente | `client_team_assignments` (FK `member_id`) | Qué cliente atiende, con cuánto FTE, desde/hasta cuándo |
| Membership en org cliente | `person_memberships` tipo `team_member` | "Equipo Efeonce asignado a este cliente" — **proyectado automáticamente desde assignments** |
| Acceso al portal | `client_users` (FK `identity_profile_id`) | Principal de autenticación, `tenant_type = 'efeonce_internal'` |

**Flujo real:** Person → Member → se asigna vía `client_team_assignments` → la proyección `assignment_membership_sync` crea/desactiva `person_memberships(team_member)` en la org del cliente → economics fluye por el assignment, contexto organizacional fluye por la membership.

### Población B — Personas del cliente

Empleados del cliente (no de Efeonce). Contactos, usuarios del portal, facturación.

| Capa | Tabla | Rol |
|------|-------|-----|
| Identidad | `identity_profiles` | Ancla canónica (creada por HubSpot sync o manualmente) |
| Membership en su org | `person_memberships` tipo `contact` / `client_user` / `billing` | Relación laboral real con la org cliente |
| Acceso al portal | `client_users` (FK `identity_profile_id`) | Principal de autenticación, `tenant_type = 'client'` |
| Sin facet Member | — | NO son `members` de Efeonce, no tienen payroll ni capacidad |

### Población C — Personas de proveedores (no cubierta hoy)

Contactos de organizaciones tipo `supplier`. Reciben gastos, POs, HES.

| Capa | Tabla | Rol |
|------|-------|-----|
| Identidad | `identity_profiles` (si existe) | Puede no existir — muchos suppliers solo tienen nombre comercial |
| Org proveedor | `organizations` WHERE `organization_type IN ('supplier', 'both')` | Entidad a la que se emiten POs y gastos |
| Membership | `person_memberships` (tipo `contact` o similar) | **Hoy no se usa** — contactos de proveedores no están modelados en memberships |

### Entidades organizacionales

| Entidad | Tabla / Flag | Significado |
|---------|-------------|-------------|
| Efeonce (la agencia) | `organizations` WHERE `is_operating_entity = TRUE` | Empleador, emisor de DTEs, entidad de payroll |
| Org cliente | `organizations` WHERE `organization_type = 'client'` | Empresa que contrata a Efeonce |
| Org proveedor | `organizations` WHERE `organization_type = 'supplier'` | Proveedor externo |
| Org dual | `organizations` WHERE `organization_type = 'both'` | Entidad que es cliente Y proveedor simultáneamente |
| Space | `spaces` (FK `organization_id`, bridge `client_id`) | Tenant operativo bajo una org — puente al legacy `client_id` |

### El grafo completo

```
Efeonce (operating_entity)
├── Members (colaboradores Efeonce) ─── Pob. A
│   ├── client_team_assignments → Client X (FTE, capacity, economics)
│   │   └── [projection: assignment_membership_sync]
│   │       └── person_memberships(team_member) → Org Client X
│   └── NO membership en Efeonce como org ← (gap: Efeonce members no pertenecen a su propia org)
│
Org Client X (organization_type = 'client')
├── Spaces → legacy client_id bridge
├── person_memberships(team_member) → Colaboradores Efeonce asignados ─── Pob. A
├── person_memberships(contact) → Contactos del cliente ─── Pob. B
├── person_memberships(client_user) → Usuarios portal del cliente ─── Pob. B
└── person_memberships(billing) → Contactos de facturación ─── Pob. B

Org Supplier Y (organization_type = 'supplier')
├── Recibe expenses, POs, HES desde Finance
└── person_memberships → (vacío hoy) ─── Pob. C no modelada
```

### Estado real de los dos grafos

El sistema tiene dos formas de vincular colaboradores Efeonce a clientes:

1. **Grafo operativo** — `client_team_assignments`: member → client_id. Maneja FTE, capacidad, economics, cost attribution. Alimenta P&L, ICO, economics. Opera con `client_id`, no `organization_id`.
2. **Grafo estructural** — `person_memberships`: identity_profile → organization_id. Maneja identidad, contexto, navegación, pertenencia organizacional.

**Puente existente:** `assignment_membership_sync` (`src/lib/sync/projections/assignment-membership-sync.ts`) ya conecta ambos grafos. Cuando se crea/modifica/elimina un assignment:
- **Create/Update:** Crea o reactiva un `person_membership(team_member)` en la org del cliente (vía bridge `spaces.client_id → spaces.organization_id`). Consolida a nivel org: N assignments al mismo org → 1 membership.
- **Remove:** Solo desactiva la membership si el member no tiene OTRAS assignments activas a clientes de la misma org.

**Lo que falta no es el puente en sí, sino que los consumers downstream no lo aprovechan** — economics, session, person-360 facets siguen operando con `client_id` directo sin pasar por el grafo unificado.

### Estado real de la sesión

`TenantAccessRecord` ya incluye campos Account 360:
- `organizationId: string | null` — resuelto desde `session_360` serving view
- `organizationName: string | null`
- `spaceId: string | null`

**Pero son nullable y no están consistentemente poblados.** El comment en `identity-store.ts:165` dice: `"nullable until M1 migration populates spaces/organizations"`. La session opera hoy con `clientId` como scope principal, y `organizationId` es informativo cuando existe.

## Contexto

### Lo que ya funciona (sinergias reales)

1. **Schema bidireccional** — `person_memberships` vincula `identity_profiles` ↔ `organizations` con contexto (role, dept, membership_type, tenure)
2. **Assignment → Membership sync** — `assignment_membership_sync` proyecta memberships `team_member` automáticamente desde assignments, con deactivation inteligente (solo si pierde TODOS los assignments en esa org)
3. **Organization Detail incluye people** — `organization_360` serving view devuelve personas con rol y departamento, distinguiendo `team_member` de `contact`
4. **Person Detail incluye memberships** — `getPersonDetail()` llama `getPersonMemberships()` para mostrar orgs
5. **Finance resuelve org como contexto canónico** — `canonical.ts` tiene resolución multi-path (org_id → client_id → hubspot → tax_id)
6. **Operating Entity Identity** — Payroll usa org con `is_operating_entity=TRUE` para DTEs y liquidaciones
7. **HubSpot sync crea identities + memberships** — Auto-vincula contactos importados como Población B (tipo `contact`)
8. **UI bidireccional** — `PersonMembershipsTab` (default `team_member`) y org detail people tab (default `contact`) permiten navegar en ambas direcciones
9. **Session ya tiene campos org** — `TenantAccessRecord` ya incluye `organizationId`, `organizationName`, `spaceId` (nullable, migration M1)
10. **Economics usa bridge space→org** — `organization-economics.ts` resuelve economics vía `client_team_assignments` → `spaces` → `organization_id`
11. **Pob. B org-scoping funcional vía clientId** — Los usuarios cliente ya ven data filtrada por su `clientId` (proyectos, equipo, delivery). La org es implícita pero el scoping es efectivo.

### Gaps diagnosticados (ordenados por impacto)

| # | Gap | Poblaciones afectadas | Impacto | Archivos clave |
|---|-----|-----------------------|---------|----------------|
| G0 | **Membership types sin contrato fuerte** — `membership_type` es string libre sin CHECK constraint. No hay helper para distinguir "persona de Efeonce asignada" vs "persona nativa de la org". Las queries usan `= 'team_member'` hardcodeado. | A + B | Arquitectural | `greenhouse_core.person_memberships` |
| G1 | **CanonicalPersonRecord no tiene contexto de org** — resuelve identity/member/user pero nunca toca `person_memberships` ni `organizations`. A pesar de que assignment_membership_sync mantiene memberships al día, ningún consumer de CanonicalPerson las lee. | A + B | Bloqueante para G3-G4 | `src/lib/identity/canonical-person.ts` |
| G2 | **Session `organizationId` nullable y sin cobertura** — Los campos existen en `TenantAccessRecord` pero están vacíos para la mayoría de usuarios. `session_360` no los resuelve consistentemente. Sin `organizationId` poblado, las rutas no pueden hacer org-scoping. | A + B | Bloqueante para org-scoping | `src/lib/tenant/identity-store.ts:165`, `greenhouse_serving.session_360` |
| G3 | **Person-360 facets ignoran contexto org** — delivery, HR, finance, ICO muestran toda la data del colaborador sin filtro por org/cliente. Dato sensible para multi-tenancy cuando Pob. B accede. | A + B | Seguridad y multi-tenancy | `src/lib/person-360/get-person-*.ts` |
| G4 | **Colaboradores Efeonce no pertenecen a su propia org** — No hay `person_membership` vinculando members al operating entity (Efeonce). Un colaborador tiene memberships en orgs cliente (vía assignment sync) pero no en Efeonce como organización. Esto impide responder "quiénes son los empleados de Efeonce" desde el grafo de memberships. | A | Modelo incompleto | `greenhouse_core.person_memberships`, `assignment_membership_sync` |
| G5 | **Proveedores sin modelo de personas (Pob. C)** — Las orgs tipo `supplier` reciben gastos, POs y HES, pero no tienen `person_memberships`. No se puede saber quién es el contacto de un proveedor. Finance referencia `supplier_name` como string libre, no como org+persona. | C | Moderado (crece con escala) | `src/lib/finance/`, `greenhouse_core.organizations` |
| G6 | **Orgs duales (`both`) sin distinción de facets** — Una org que es cliente Y proveedor usa el mismo set de memberships. No hay forma de saber si un contacto lo es "como cliente" o "como proveedor" de esa org. | B + C | Edge case hoy, escala después | `greenhouse_core.person_memberships` |
| G7 | **Staff augmentation sin distinción de membership** — `client_team_assignments` tiene `assignment_type = 'staff_augmentation'` para colaboradores colocados en el cliente como pseudo-empleados. Pero la membership sync los trata igual que `internal` — ambos generan `team_member`. Un staff aug es operativamente distinto (trabaja ON-SITE como si fuera del cliente). | A | Relevante para Agency | `src/lib/sync/projections/assignment-membership-sync.ts` |
| G8 | **Payroll es 100% member-centric** — no existe vista "equipo de esta org con su payroll/costo". Para Pob. A falta la pregunta "cuánto nos cuesta el equipo asignado a este cliente" como vista org-scoped. | A | Moderado | `src/lib/payroll/` |
| G9 | **Account 360 crea identity_profiles fuera del reconciliation engine** — `organization-store.ts:createIdentityProfile()` inserta directo sin pasar por matching engine. Riesgo de duplicados al agregar contactos Pob. B manualmente. | B | Integridad de datos | `src/lib/account-360/organization-store.ts:643` |
| G10 | **No hay serving cruzado org↔person con datos operativos** — `person_360` no tiene org data; `organization_360` tiene people pero solo identity-level. Falta: "personas de esta org con FTE asignado, costo, ICO" (Pob. A) y "personas de esta org con rol y acceso" (Pob. B). | A + B | UX y analytics | `greenhouse_serving.person_360`, `greenhouse_serving.organization_360` |

## Plan de implementación

### Fase 0 — Claridad semántica del modelo (G0 + G4)

**Objetivo:** Contrato fuerte de membership types, membership del operating entity, y helpers de población.

#### 0a. Membership type como enum con CHECK constraint

Formalizar `membership_type` con separación clara de poblaciones:

```sql
-- Migración
ALTER TABLE greenhouse_core.person_memberships
  ADD CONSTRAINT chk_membership_type
  CHECK (membership_type IN (
    'team_member',    -- Pob. A: colaborador Efeonce asignado
    'contact',        -- Pob. B/C: contacto general
    'client_user',    -- Pob. B: usuario del portal
    'billing',        -- Pob. B/C: contacto de facturación
    'contractor',     -- Pob. B: contratista externo
    'partner',        -- Pob. B: partner/socio
    'advisor'         -- Pob. B: asesor
  ));
```

Agregar helpers TypeScript:

```typescript
const EFEONCE_ASSIGNMENT_TYPES = ['team_member'] as const
const ORG_NATIVE_TYPES = ['contact', 'client_user', 'billing', 'contractor', 'partner', 'advisor'] as const

export const isEfeonceAssignment = (type: string) => EFEONCE_ASSIGNMENT_TYPES.includes(type as any)
export const isOrgNative = (type: string) => ORG_NATIVE_TYPES.includes(type as any)
```

#### 0b. Membership de colaboradores en el operating entity

Crear memberships `team_member` vinculando cada `member` activo al operating entity (Efeonce org):
- Backfill: para todos los `members` con `identity_profile_id` NOT NULL y `active = TRUE`, crear `person_membership` en la org con `is_operating_entity = TRUE`
- Forward: hook/proyección que cuando se crea un nuevo member, cree su membership en Efeonce
- Esto cierra la pregunta "quiénes son los empleados de Efeonce" desde el grafo de memberships

**Nota sobre assignment_membership_sync:** La proyección existente ya implementa Opción A (proyección de assignments → memberships). Esta fase no cambia eso — solo agrega la membership faltante en el operating entity, que no viene de ningún assignment sino de la relación laboral directa.

### Fase 1 — Session y resolución canónica (G1 + G2)

**Objetivo:** Que `organizationId` en session esté siempre poblado y que CanonicalPersonRecord incluya contexto org.

#### 1a. Poblar `organizationId` en `session_360`

El campo ya existe en `TenantAccessRecord` pero está vacío. Completar la resolución en la serving view `session_360`:

- Para Pob. A (`tenant_type = 'efeonce_internal'`): `organizationId` = operating entity (`is_operating_entity = TRUE`). Es estático para todos los internos.
- Para Pob. B (`tenant_type = 'client'`): resolver desde `spaces` WHERE `client_id` = user's `client_id` → `spaces.organization_id`. Si no hay space bridge, fallback a `person_memberships` WHERE `is_primary = TRUE`.

**Archivos a modificar:**
- `scripts/setup-postgres-session-360.sql` (o equivalente) — agregar JOIN a spaces/organizations
- `src/lib/tenant/identity-store.ts` — remover el comment "nullable until M1 migration"

#### 1b. Enriquecer CanonicalPersonRecord con org context

```typescript
// Agregar a CanonicalPersonRecord
primaryOrganizationId: string | null
primaryOrganizationName: string | null
organizationMembershipType: string | null
isEfeonceCollaborator: boolean  // shorthand: hasMemberFacet && member is active
```

- Para Pob. A: `primaryOrganization` = Efeonce (operating entity), porque es su empleador real. Las orgs cliente son assignments, no pertenencia.
- Para Pob. B: `primaryOrganization` = su org nativa (de `person_memberships` con `is_primary = TRUE`)
- Query: LEFT JOIN a `person_memberships` WHERE `is_primary = TRUE`, o derivar de la membership en operating entity (Pob. A) / primera membership nativa (Pob. B)

### Fase 2 — Serving enriquecido (G10)

**Objetivo:** Serving views que crucen persona y organización con datos apropiados por población.

#### 2a. Enriquecer `person_360` con org data

Agregar a la serving view:
- `primary_organization_id`, `primary_organization_name`
- `primary_membership_type`
- `organization_membership_count`
- `is_efeonce_collaborator` (ya derivable de `has_member_facet`, pero explicitarlo)

#### 2b. Enriquecer `organization_360` people aggregate por población

**Para Pob. A (team_member):**
- `memberId` (member facet, vía identity_profile → members)
- `assignedFte` (de `client_team_assignments` activas para clients de esa org)
- `assignmentType` (`internal` vs `staff_augmentation`)
- `jobLevel`, `employmentType`

**Para Pob. B (contact, client_user, billing):**
- `membershipType`, `roleLabel`, `department` (ya existen)
- Sin datos operativos de Efeonce (no les corresponden)

### Fase 3 — Org-scoped consumption (G3 + G7)

**Objetivo:** Que los módulos downstream filtren por org cuando el contexto lo requiera, y que staff aug se distinga.

#### 3a. Person-360 facets con org-scoping opcional

Agregar parámetro `organizationId?: string` a:
- `getPersonFinance()` — filtrar gastos/ingresos por clientes de esa org
- `getPersonDelivery()` — filtrar proyectos por spaces de esa org
- `getPersonIcoProfile()` — filtrar ICO por org

Para Pob. B estos facets no aplican (no tienen finance/delivery/ICO propios).

#### 3b. Staff augmentation membership refinement

Extender `assignment_membership_sync` o agregar metadata a la membership:
- Cuando `assignment_type = 'staff_augmentation'`, la membership podría tener un `role_label` que incluya el indicador (e.g., "Staff Aug — Senior Designer")
- O agregar campo a `person_memberships` para distinguir (futuro: `assignment_context` o similar)
- Esto permite que la org vea "cuántos de mis asignados son staff aug vs internos"

### Fase 4 — Hardening (G5 + G6 + G8 + G9)

#### 4a. Supplier contact model (Pob. C foundation)

- Cuando se crea una org `supplier`, permitir agregar `person_memberships` tipo `contact` o `billing`
- Extender `AddMembershipDrawer` para orgs tipo `supplier` y `both`
- En Finance, vincular `supplier_name` de gastos/POs a una org + contacto cuando exista
- **No bloquear esta task por Pob. C** — es un follow-on natural, pero el foundation de membership ya lo soporta

#### 4b. Org dual facet distinction (G6)

- Para orgs `both`: agregar campo `membership_context` (`as_client` | `as_supplier`) a `person_memberships`
- O usar `space_id` para distinguir: memberships con space_id de un space tipo `client_space` vs sin space = contexto proveedor
- **Decisión diferible** — hoy hay pocas orgs `both`, pero documentar el gap

#### 4c. Payroll vista org-scoped (Pob. A only)

- Endpoint `/api/organizations/[id]/team-cost`: resumen de costo del equipo Efeonce asignado a esa org
- Query: `person_memberships(team_member)` + `members` + payroll/cost data
- Ya parcialmente resuelto por `organization-economics.ts` que calcula labor cost, pero sin drill-down a miembros individuales

#### 4d. Identity creation dedup guard (Pob. B)

- En `organization-store.ts:createIdentityProfile()`, check contra `identity_profiles` por email antes de INSERT
- O delegar a `ensureIdentityForEmail()` con upsert semántico

## Dependencies & Impact

### Depende de
- `TASK-181` (Finance Clients org-canonical source) — completado
- `TASK-191` (Finance org-first downstream cutover) — en progreso, cierra consumption patterns que esta task extiende
- `TASK-141` (Canonical Person Identity Consumption) — completado, base de `CanonicalPersonRecord`

### Impacta a
- `TASK-167` (Operational P&L Organization Scope) — Fase 3 enriquece el input de personas para P&L org-scoped
- `TASK-177` (Operational P&L Business Unit Scope) — BU scope requiere org context en session (G2)
- `TASK-143` (Agency Economics) — la distinción Pob. A/B + staff aug es prerequisite
- `TASK-146` (Service-Level P&L) — org-scoping permite P&L per service per org
- `TASK-192` (Finance Org-First Materialized Serving) — Fase 2 alimenta los serving views que esta task necesita
- `TASK-008` (Team Identity Capacity System) — Fase 0 formaliza memberships y su relación con capacity

### Archivos owned
- `src/lib/identity/canonical-person.ts`
- `src/lib/tenant/identity-store.ts`
- `src/lib/tenant/access.ts`
- `scripts/setup-postgres-canonical-360.sql`
- `scripts/setup-postgres-session-360.sql` (o equivalente)
- `src/lib/sync/projections/assignment-membership-sync.ts` (parcial: staff aug refinement)
- `src/lib/account-360/organization-store.ts` (parcial: `createIdentityProfile`, membership helpers)
- `src/lib/person-360/get-person-finance.ts` (parcial: org-scoping)
- `src/lib/person-360/get-person-delivery.ts` (parcial: org-scoping)

## Riesgos

1. **Sobre-ingeniería de la distinción de poblaciones** — no crear abstracciones donde un simple `WHERE membership_type = 'team_member'` basta. Los helpers deben ser funciones puras de una línea.
2. **Performance de serving views** — agregar JOINs a `person_memberships` y `organizations` en `person_360` y `session_360`. Mitigación: LEFT JOIN lateral con LIMIT 1, o subquery materializada.
3. **Backfill del operating entity membership** — crear memberships para todos los members activos en Efeonce puede ser disruptivo si el membership_count de la org salta repentinamente. Mitigación: backfill silencioso, validar en staging primero.
4. **Multi-org para Pob. A** — un colaborador Efeonce atiende múltiples clientes. Su `primaryOrganization` en CanonicalPerson debería ser Efeonce (su empleador), no uno de los clientes. Las orgs cliente son contexto de assignment, no de pertenencia.
5. **Backward compatibility** — módulos existentes esperan `client_id` como scope principal. `organization_id` es additive, nunca reemplaza `client_id` en esta fase.
6. **Pob. C scope creep** — modelar contactos de proveedores puede expandirse. Mantener mínimo: solo membership + identity, sin building un "supplier portal".

## Criterios de cierre

### Fase 0
- [ ] CHECK constraint en `person_memberships.membership_type`
- [ ] Helpers `isEfeonceAssignment()` / `isOrgNative()` en TypeScript
- [ ] Backfill de memberships de members activos en operating entity
- [ ] Proyección forward: nuevo member → membership en operating entity

### Fase 1
- [ ] `session_360` resuelve `organization_id` para todos los usuarios (internos y clientes)
- [ ] `CanonicalPersonRecord` incluye `primaryOrganizationId`, `primaryOrganizationName`, `isEfeonceCollaborator`
- [ ] Tests unitarios para resolución de org en canonical person y session

### Fase 2
- [ ] `person_360` serving view incluye org data y flag de colaborador
- [ ] `organization_360` people aggregate incluye `memberId`, `assignedFte`, `assignmentType` para Pob. A

### Fase 3
- [ ] Al menos un facet de person-360 soporta filtro por `organizationId`
- [ ] Staff aug assignments generan memberships con metadata distinguible

### Fase 4
- [ ] `createIdentityProfile` en org-store pasa por dedup check
- [ ] Orgs supplier pueden tener `person_memberships` tipo `contact`/`billing`
- [ ] Query de auditoría: assignments sin membership correspondiente y viceversa
