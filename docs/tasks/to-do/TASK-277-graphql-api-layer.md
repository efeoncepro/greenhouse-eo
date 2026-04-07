# TASK-277 — GraphQL API Layer sobre resolvers 360

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`, `data`, `api`
- Blocked by: `TASK-273` (Person Complete 360), `TASK-274` (Account Complete 360)
- Branch: `task/TASK-277-graphql-api-layer`
- Legacy ID: —
- GitHub Issue: —

## Summary

Los resolvers 360 (Person + Account) sirven facetas completas via REST. El frontend recibe facetas enteras aunque solo necesite 3 campos — desperdiciando bandwidth y procesamiento. Esta task agrega una capa **GraphQL** sobre los mismos resolvers de facetas, permitiendo que cada consumer pida exactamente los campos que necesita. No reemplaza REST — coexiste. Un solo endpoint `POST /api/graphql` sirve ambos objetos (Person y Account) con la misma autorizacion, cache, y observabilidad.

## Why This Task Exists

1. **Over-fetching** — Mi Perfil solo necesita `identity.displayName + identity.avatarUrl + leave.summary` pero recibe las facetas completas (~5KB de JSON innecesario)
2. **Tipo-safety end-to-end** — GraphQL genera types del schema; el frontend sabe en compile-time qué campos existen
3. **Single round-trip** — una vista que necesita datos de una persona Y su organizacion hoy hace 2 requests REST. Con GraphQL:
   ```graphql
   query {
     person(id: "me") { identity { displayName } assignments { clientName teamMembers { name } } }
     organization(id: "org-xxx") { economics { currentPeriod { grossMarginPct } } }
   }
   ```
4. **Introspection + docs gratis** — GraphQL Playground/Sandbox para explorar el API sin leer docs
5. **Foundation para cliente externo** — si en el futuro se expone un API a clientes, GraphQL es el standard enterprise

## Goal

- `POST /api/graphql` sirve queries de Person 360 y Account 360
- Los resolvers GraphQL wrappean las facetas existentes — no duplican queries
- Autorizacion: reutiliza `facet-authorization.ts` de TASK-273/274
- Cache: reutiliza `facet-cache.ts` (mismo backend, sea in-memory o Redis)
- Schema tipado genera types para el frontend via codegen
- GraphQL Playground disponible en development/staging (deshabilitado en production)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — arquitectura general
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo 360

Reglas obligatorias:

- GraphQL Yoga como server (ligero, compatible con Vercel serverless, de The Guild)
- No Apollo Server (heavy, no optimizado para serverless)
- Los resolvers de GraphQL NO ejecutan queries — delegan a las facetas existentes de TASK-273/274
- Schema-first approach (SDL) — no code-first, para que el schema sea legible y versionable
- Auth: mismo `requireTenantContext` + `authorizeFacets()` que ya existe
- No subscriptions (WebSocket) en esta task — solo queries y mutations read-only

## Dependencies & Impact

### Depends on

- TASK-273 (Person Complete 360) — facetas de persona
- TASK-274 (Account Complete 360) — facetas de cuenta
- Opcionalmente TASK-275 (Redis) — mejora performance pero no es requerido

### Blocks / Impacts

- Frontend type generation — habilita `graphql-codegen` para types end-to-end
- Futuro API público para clientes — GraphQL es la base
- Mobile app (si se construye) — GraphQL es ideal para bandwidth limitado

### Files owned

- `src/app/api/graphql/route.ts` — endpoint Next.js (NUEVO)
- `src/lib/graphql/schema.ts` — SDL schema definition (NUEVO)
- `src/lib/graphql/resolvers/` — resolver modules per type (NUEVO)
- `src/lib/graphql/context.ts` — auth context builder (NUEVO)
- `codegen.ts` — GraphQL codegen config (NUEVO)

## Current Repo State

### Already exists (post TASK-273/274)

- `getPersonComplete360(profileId, facets[])` — resolver de persona con todas las facetas
- `getAccountComplete360(organizationId, facets[])` — resolver de cuenta
- `facet-authorization.ts` — autorizacion per-facet por rol
- `facet-cache.ts` — cache per-facet con TTL
- Types completos: `PersonComplete360`, `AccountComplete360` con todas las facetas tipadas

### Gap

- No existe endpoint GraphQL
- No existe schema SDL
- No existe `graphql` ni `graphql-yoga` en dependencies
- No existe codegen para types frontend

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dependencies y schema base

- `pnpm add graphql graphql-yoga`
- `pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations`
- Crear `src/lib/graphql/schema.ts` con types SDL:

```graphql
type Query {
  person(id: String!, asOf: String): Person
  organization(id: String!, asOf: String): Organization
  persons(ids: [String!]!): [Person!]!
  organizations(ids: [String!]!): [Organization!]!
  me: Person
}

type Person {
  identity: PersonIdentity!
  assignments: [PersonAssignment!]
  organization: PersonOrganization
  leave: PersonLeave
  payroll: PersonPayroll
  delivery: PersonDelivery
  costs: PersonCosts
  staffAug: PersonStaffAug
}

type Organization {
  identity: AccountIdentity!
  spaces: [AccountSpace!]
  team: AccountTeam
  economics: AccountEconomics
  delivery: AccountDelivery
  finance: AccountFinance
  crm: AccountCrm
  services: AccountServices
  staffAug: AccountStaffAug
}

# ... sub-types para cada faceta, derivados de los TypeScript types existentes
```

### Slice 2 — Resolvers que delegan a facetas

Crear `src/lib/graphql/resolvers/`:

```typescript
// person.ts
export const personResolvers = {
  Query: {
    person: async (_, { id, asOf }, ctx) => {
      const profileId = await resolveIdentifier(id, ctx)
      return { _profileId: profileId, _asOf: asOf, _ctx: ctx }
    },
    me: async (_, __, ctx) => {
      return { _profileId: ctx.identityProfileId, _ctx: ctx }
    }
  },
  Person: {
    // Cada campo se resuelve lazy — solo ejecuta la faceta si el query la pide
    identity: async (parent) => fetchIdentityFacet(parent._profileId),
    assignments: async (parent, _, ctx) => {
      await authorizeOrThrow(ctx, parent._profileId, 'assignments')
      return fetchAssignmentsFacet(parent._memberId)
    },
    payroll: async (parent, _, ctx) => {
      await authorizeOrThrow(ctx, parent._profileId, 'payroll')
      return fetchPayrollFacet(parent._memberId, { asOf: parent._asOf })
    },
    // ... idem para cada faceta
  }
}
```

**Key insight:** GraphQL solo ejecuta los resolvers de los campos que el query pide. Si el frontend pide `person { identity { displayName } }`, solo se ejecuta `fetchIdentityFacet` — las demas facetas ni se tocan. Esto es la optimizacion principal sobre REST.

### Slice 3 — Auth context y endpoint

Crear `src/lib/graphql/context.ts`:

```typescript
export async function buildGraphQLContext(request: Request) {
  const tenant = await getTenantContext()
  if (!tenant) throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } })
  return {
    tenant,
    userId: tenant.userId,
    roleCodes: tenant.roleCodes,
    tenantType: tenant.tenantType,
    identityProfileId: tenant.identityProfileId,
    organizationId: tenant.organizationId,
  }
}
```

Crear `src/app/api/graphql/route.ts`:

```typescript
import { createYoga, createSchema } from 'graphql-yoga'
import { typeDefs } from '@/lib/graphql/schema'
import { resolvers } from '@/lib/graphql/resolvers'
import { buildGraphQLContext } from '@/lib/graphql/context'

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  context: ({ request }) => buildGraphQLContext(request),
  graphiql: process.env.NODE_ENV !== 'production',  // Playground solo en dev/staging
  fetchAPI: { Response }
})

export const GET = yoga
export const POST = yoga
```

### Slice 4 — Codegen: types frontend auto-generados

Crear `codegen.ts`:

```typescript
import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'src/lib/graphql/schema.ts',
  documents: 'src/**/*.graphql',
  generates: {
    'src/types/graphql-generated.ts': {
      plugins: ['typescript', 'typescript-operations']
    }
  }
}
export default config
```

Script: `pnpm graphql:codegen` → genera types que el frontend importa directamente.

### Slice 5 — Error handling + field-level authorization en GraphQL

- Faceta denegada: retorna `null` + extension `{ code: 'FORBIDDEN', facet: 'payroll', reason: '...' }`
- Campo redactado: retorna `null` para el campo, GraphQL lo maneja nativamente
- Faceta con error interno: retorna `null` + extension `{ code: 'INTERNAL_ERROR', facet: 'delivery' }`
- Rate limiting: max 10 queries por segundo por usuario (via `graphql-rate-limit` o custom middleware)
- Query depth limiting: max depth 5 (previene queries abusivas anidadas)
- Query complexity limiting: max 1000 puntos de complejidad por query

### Slice 6 — Cross-object queries

GraphQL habilita queries que cruzan Person y Account en un solo round-trip:

```graphql
query TeamWithEconomics {
  organization(id: "org-xxx") {
    identity { name }
    team {
      members {
        profileId
        name
        avatarUrl
        # Sub-resolver: cargar delivery de cada miembro
        delivery { icoMetrics { rpaAvg otdPct } }
      }
    }
    economics { currentPeriod { grossMarginPct } }
  }
}
```

El sub-resolver `team.members[].delivery` llama a `fetchDeliveryFacet(memberId)` lazy — solo si el query lo pide.

### Slice 7 — Playground y documentacion

- GraphQL Playground (built-in de Yoga) disponible en `dev-greenhouse.efeoncepro.com/api/graphql` (staging)
- Deshabilitado en production (`graphiql: process.env.NODE_ENV !== 'production'`)
- Schema auto-documentado con descriptions en SDL:

```graphql
"""
Faceta de identidad — siempre disponible, no requiere autorizacion especial.
Datos resueltos de person_360 (nombre, email, avatar, cargo, departamento).
"""
type PersonIdentity {
  """Nombre completo resuelto (COALESCE member → identity_profile → user → CRM)"""
  displayName: String!
  # ...
}
```

## Out of Scope

- Mutations (escritura via GraphQL) — los resolvers 360 son read-only. Writes siguen via REST
- Subscriptions (WebSocket) — futuro
- Federation (Apollo Federation / schema stitching) — no necesario con un solo servicio
- Migrar TODOS los consumers a GraphQL — coexiste con REST, migracion gradual y voluntaria
- Persisted queries — optimizacion futura para production

## Acceptance Criteria

- [ ] `POST /api/graphql` con query `{ me { identity { displayName avatarUrl } } }` retorna datos correctos
- [ ] Query pidiendo solo `identity` NO ejecuta queries de payroll/delivery (verificar con tracing)
- [ ] Query pidiendo `payroll` como collaborator retorna `null` + error extension FORBIDDEN
- [ ] Query pidiendo `payroll` como admin retorna datos completos
- [ ] Cross-object query `{ person(...) { ... } organization(...) { ... } }` funciona en un solo request
- [ ] `pnpm graphql:codegen` genera types correctos en `src/types/graphql-generated.ts`
- [ ] GraphQL Playground funciona en staging, no en production
- [ ] Query depth > 5 es rechazado con error
- [ ] `pnpm build`, `pnpm lint` pasan sin errores

## Verification

- `pnpm build` + `pnpm lint`
- Staging: abrir `dev-greenhouse.efeoncepro.com/api/graphql` → Playground funciona
- Staging: ejecutar `{ me { identity { displayName } leave { summary { totalAvailableVacation } } } }` → datos correctos
- Staging: ejecutar query con profundidad 6 → error
- Production: `greenhouse.efeoncepro.com/api/graphql` → Playground deshabilitado (404 o redirect)
- Production: POST query → funciona normalmente

## Follow-ups

- Persisted queries: pre-registrar queries conocidas para performance en production
- Apollo Client o urql en el frontend para cache client-side
- Subscriptions (WebSocket) para real-time updates
- Public API: exponer subset del schema para clientes externos con API keys
- Schema registry: versionar el schema y detectar breaking changes en CI
