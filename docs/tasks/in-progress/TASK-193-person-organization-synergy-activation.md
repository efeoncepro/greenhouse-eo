# TASK-193 — Person ↔ Organization Synergy Activation

> **Status:** in-progress
> **Priority:** P1
> **Impact:** Alto — desbloquea org-scoping transversal para todos los módulos downstream
> **Effort:** Alto
> **Created:** 2026-04-02

**Architecture doc:** `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`

## Delta 2026-04-02 — auditoría inicial del runtime real

- `greenhouse_core.person_memberships.membership_type` **ya** tiene `CHECK constraint` en schema baseline y runtime; el gap no es crear el enum, sino institucionalizar helpers y reconciliar el legacy `client_contact`.
- `greenhouse_serving.session_360` **ya** resuelve `organization_id` para usuarios `tenant_type = 'client'` vía `spaces.client_id -> organization_id`; el gap real de sesión está concentrado en `tenant_type = 'efeonce_internal'`.
- La base real **no** tiene ninguna organización con `is_operating_entity = TRUE`; por lo tanto, la parte de la task que asume un operating entity listo para poblar sesión interna y memberships de Efeonce requiere primero definir/sembrar ese anchor canónico.
- La data activa hoy en memberships está concentrada en `client_contact` y `team_member`; la spec no puede asumir que `contact`, `client_user` o `billing` ya son el contrato operativo predominante.

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
| Membership en su org | `person_memberships` tipo `client_contact` / `contact` / `client_user` / `billing` | Relación laboral real con la org cliente |
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
9. **Session ya tiene campos org** — `TenantAccessRecord` ya incluye `organizationId`, `organizationName`, `spaceId`; en runtime real están poblados para usuarios `client`, pero siguen nulos para `efeonce_internal`
10. **Economics usa bridge space→org** — `organization-economics.ts` resuelve economics vía `client_team_assignments` → `spaces` → `organization_id`
11. **Pob. B org-scoping funcional vía clientId** — Los usuarios cliente ya ven data filtrada por su `clientId` (proyectos, equipo, delivery). La org es implícita pero el scoping es efectivo.

### Gaps diagnosticados (ordenados por impacto)

| # | Gap | Poblaciones afectadas | Impacto | Archivos clave |
|---|-----|-----------------------|---------|----------------|
| G0 | **Membership types sin contrato institucionalizado** — el `CHECK constraint` ya existe, pero no hay helper shared para distinguir "persona de Efeonce asignada" vs "persona nativa de la org", y el runtime sigue mezclando `client_contact` legacy con los tipos nuevos. Las queries usan `= 'team_member'` hardcodeado. | A + B | Arquitectural | `greenhouse_core.person_memberships` |
| G1 | **CanonicalPersonRecord no tiene contexto de org** — resuelve identity/member/user pero nunca toca `person_memberships` ni `organizations`. A pesar de que assignment_membership_sync mantiene memberships al día, ningún consumer de CanonicalPerson las lee. | A + B | Bloqueante para G3-G4 | `src/lib/identity/canonical-person.ts` |
| G2 | **Session interna sin `organizationId`** — Los campos existen en `TenantAccessRecord` y ya se resuelven bien para `tenant_type = 'client'`, pero siguen vacíos para `efeonce_internal`. Sin un anchor organizacional interno, las rutas no pueden hacer org-scoping homogéneo. | A | Bloqueante para org-scoping interno | `src/lib/tenant/identity-store.ts:165`, `greenhouse_serving.session_360` |
| G3 | **Person-360 facets ignoran contexto org** — delivery, HR, finance, ICO muestran toda la data del colaborador sin filtro por org/cliente. Dato sensible para multi-tenancy cuando Pob. B accede. | A + B | Seguridad y multi-tenancy | `src/lib/person-360/get-person-*.ts` |
| G4 | **No existe anchor operativo de Efeonce en la base real** — no hay ninguna `organization` con `is_operating_entity = TRUE`, y por lo tanto tampoco existe `person_membership` que vincule members a Efeonce como organización. Esto bloquea responder "quiénes son los empleados de Efeonce" desde el grafo de memberships. | A | Modelo incompleto / prerrequisito | `greenhouse_core.organizations`, `greenhouse_core.person_memberships` |
| G5 | **Proveedores sin modelo de personas (Pob. C)** — Las orgs tipo `supplier` reciben gastos, POs y HES, pero no tienen `person_memberships`. No se puede saber quién es el contacto de un proveedor. Finance referencia `supplier_name` como string libre, no como org+persona. | C | Moderado (crece con escala) | `src/lib/finance/`, `greenhouse_core.organizations` |
| G6 | **Orgs duales (`both`) sin distinción de facets** — Una org que es cliente Y proveedor usa el mismo set de memberships. No hay forma de saber si un contacto lo es "como cliente" o "como proveedor" de esa org. | B + C | Edge case hoy, escala después | `greenhouse_core.person_memberships` |
| G7 | **Staff augmentation con distinción solo parcial en consumers** — `client_team_assignments` tiene `assignment_type = 'staff_augmentation'` para colaboradores colocados en el cliente como pseudo-empleados. La decisión vigente es mantener `team_member` como `membership_type` y distinguir `internal` vs `staff_augmentation` como contexto operativo del vínculo cliente. El gap residual ya no es de modelo base, sino de propagación consistente en readers/UI downstream. | A | Relevante para Agency | `src/lib/sync/projections/assignment-membership-sync.ts` |
| G8 | **Payroll es 100% member-centric** — no existe vista "equipo de esta org con su payroll/costo". Para Pob. A falta la pregunta "cuánto nos cuesta el equipo asignado a este cliente" como vista org-scoped. | A | Moderado | `src/lib/payroll/` |
| G9 | **Account 360 crea identity_profiles fuera del reconciliation engine** — `organization-store.ts:createIdentityProfile()` inserta directo sin pasar por matching engine. Riesgo de duplicados al agregar contactos Pob. B manualmente. | B | Integridad de datos | `src/lib/account-360/organization-store.ts:643` |
| G10 | **No hay serving cruzado org↔person con datos operativos** — `person_360` no tiene org data; `organization_360` tiene people pero solo identity-level. Falta: "personas de esta org con FTE asignado, costo, ICO" (Pob. A) y "personas de esta org con rol y acceso" (Pob. B). | A + B | UX y analytics | `greenhouse_serving.person_360`, `greenhouse_serving.organization_360` |

## Plan de implementación

### Fase 0 — Claridad semántica del modelo (G0 + G4)

**Objetivo:** Contrato fuerte de membership types, membership del operating entity, y helpers de población.

#### 0a. Membership type como contrato shared

El `CHECK constraint` ya existe. Lo pendiente es formalizar helpers/shared typing sin romper compatibilidad con el legacy activo:

```sql
-- Enum ya vigente en schema/runtime:
-- team_member, client_contact, client_user, contact,
-- billing, contractor, partner, advisor
```

Agregar helpers TypeScript:

```typescript
const EFEONCE_ASSIGNMENT_TYPES = ['team_member'] as const
const ORG_NATIVE_TYPES = ['client_contact', 'contact', 'client_user', 'billing', 'contractor', 'partner', 'advisor'] as const

export const isEfeonceAssignment = (type: string) => EFEONCE_ASSIGNMENT_TYPES.includes(type as any)
export const isOrgNative = (type: string) => ORG_NATIVE_TYPES.includes(type as any)
```

#### 0b. Membership de colaboradores en el operating entity

**Prerequisito real:** hoy no existe ninguna org marcada `is_operating_entity = TRUE` en la base real. Antes de backfillear memberships internos, esta task debe:
- identificar/sembrar la organización canónica de Efeonce, o
- dejar explícitamente delegado ese seed a `TASK-081` si no se va a resolver en este slice

Una vez exista ese anchor, crear memberships `team_member` vinculando cada `member` activo al operating entity (Efeonce org):
- Backfill: para todos los `members` con `identity_profile_id` NOT NULL y `active = TRUE`, crear `person_membership` en la org con `is_operating_entity = TRUE`
- Forward: hook/proyección que cuando se crea un nuevo member, cree su membership en Efeonce
- Esto cierra la pregunta "quiénes son los empleados de Efeonce" desde el grafo de memberships

**Nota sobre assignment_membership_sync:** La proyección existente ya implementa Opción A (proyección de assignments → memberships). Esta fase no cambia eso — solo agrega la membership faltante en el operating entity, que no viene de ningún assignment sino de la relación laboral directa.

### Fase 1 — Session y resolución canónica (G1 + G2)

**Objetivo:** Que `organizationId` en session esté siempre poblado y que CanonicalPersonRecord incluya contexto org.

#### 1a. Poblar `organizationId` en `session_360` para internos

El campo ya existe en `TenantAccessRecord`. Para usuarios `client` el bridge `client_id -> spaces -> organization` ya funciona; el gap real es completar la resolución para `efeonce_internal`:

- Para Pob. A (`tenant_type = 'efeonce_internal'`): `organizationId` = operating entity (`is_operating_entity = TRUE`) una vez exista ese anchor.
- Para Pob. B (`tenant_type = 'client'`): mantener resolución desde `spaces` WHERE `client_id` = user's `client_id` → `spaces.organization_id`. Si no hay space bridge, fallback a `person_memberships` WHERE `is_primary = TRUE`.

**Archivos a modificar:**
- `scripts/setup-postgres-identity-v2.sql` (owner real de `session_360`) — completar fallback interno/por membership
- `src/lib/tenant/identity-store.ts` — remover el comment "nullable until M1 migration"

#### 1b. Enriquecer CanonicalPersonRecord con org context

```typescript
// Agregar a CanonicalPersonRecord
primaryOrganizationId: string | null
primaryOrganizationName: string | null
organizationMembershipType: string | null
isEfeonceCollaborator: boolean  // shorthand: hasMemberFacet && member is active
```

- Para Pob. A: `primaryOrganization` = Efeonce (operating entity), porque es su empleador real. Esto queda bloqueado hasta definir/sembrar ese anchor en runtime real.
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

Decisión aplicada:
- no se agrega `membership_type` nuevo ni se deforma `person_memberships`
- `team_member` sigue siendo la relación estructural con la org cliente
- la distinción `internal` vs `staff_augmentation` se expone como metadata operativa (`assignmentType`, `assignedFte`, `memberId`, `jobLevel`, `employmentType`) en serving/readers/UI
- esto permite que la org vea "cuántos de mis asignados son staff aug vs internos" sin duplicar identidades ni memberships

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
- `TASK-081` (Organization Legal Entity Canonicalization) — si esta lane no siembra directamente la org `is_operating_entity`, queda como dependencia explícita para cerrar G4/G2 internos

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
- [ ] Helpers `isEfeonceAssignment()` / `isOrgNative()` alineados al enum real (`client_contact` incluido)
- [ ] Helpers `isEfeonceAssignment()` / `isOrgNative()` en TypeScript
- [ ] Operating entity definido/sembrado o dependencia explicitada
- [ ] Backfill de memberships de members activos en operating entity
- [ ] Proyección forward: nuevo member → membership en operating entity

### Fase 1
- [ ] `session_360` mantiene cobertura para `client` y resuelve `organization_id` para `efeonce_internal`
- [ ] `CanonicalPersonRecord` incluye `primaryOrganizationId`, `primaryOrganizationName`, `isEfeonceCollaborator`
- [ ] Tests unitarios para resolución de org en canonical person y session

### Fase 2
- [ ] `person_360` serving view incluye org data y flag de colaborador
- [ ] `organization_360` people aggregate incluye `memberId`, `assignedFte`, `assignmentType` para Pob. A

### Fase 3
- [ ] Al menos un facet de person-360 soporta filtro por `organizationId`
- [x] Staff aug assignments exponen metadata distinguible en org memberships sin crear `membership_type` nuevo

### Fase 4
- [ ] `createIdentityProfile` en org-store pasa por dedup check
- [ ] Orgs supplier pueden tener `person_memberships` tipo `contact`/`billing`
- [ ] Query de auditoría: assignments sin membership correspondiente y viceversa
