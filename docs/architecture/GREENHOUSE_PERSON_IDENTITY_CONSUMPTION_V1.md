# Greenhouse Person Identity Consumption V1

## Purpose

Definir el contrato canónico de consumo del objeto persona en Greenhouse.

Este documento no redefine el modelo base de identidad. Su objetivo es dejar explícito cómo deben consumirlo los módulos y qué identificadores no pueden degradarse durante la migración `person-first`.

Usar junto con:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

## Status

Contrato vigente desde `2026-03-30`.

Decisión ya tomada:
- `TASK-141` va antes que `TASK-162`
- `identity_profile` es la raíz humana canónica
- `member` sigue siendo la llave operativa fuerte para payroll, capacity, finance serving, ICO y costos
- `client_user` sigue siendo el principal de acceso para sesión, inbox, preferencias, overrides y auditoría user-scoped

## Core Contract

### 1. `identity_profile`

Representa a la persona humana canónica.

Debe usarse cuando el problema real sea:
- representar un humano
- resolver una persona cross-source
- unir facetas `member`, `client_user` y CRM
- construir surfaces person-first
- preparar evolución futura de IdP o provisioning

No debe reemplazar por sí sola:
- claves operativas `member_id`
- claves portal `user_id`

### 2. `member`

Representa la faceta operativa del colaborador.

Debe seguir siendo la llave operativa primaria para:
- HR
- payroll
- team capacity
- People
- ICO
- serving y snapshots por colaborador
- costos laborales y attribution layers futuras

Regla fuerte:
- si el carril materializa o calcula por colaborador, `member_id` no se sustituye por `identity_profile_id`

### 3. `client_user`

Representa el principal de acceso al portal.

Debe seguir siendo la llave operativa primaria para:
- sesión
- login
- inbox in-app
- preferencias de notificación
- overrides y auditoría de acceso
- cualquier flujo user-scoped por diseño

Regla fuerte:
- `client_user` no es la raíz humana
- tampoco debe eliminarse de carriles que dependen de `user_id`

## Canonical Resolution Shape

Todo resolver shared nuevo o endurecido para humanos debería poder exponer, como mínimo:

- `identityProfileId`
- `memberId | null`
- `userId | null`
- `eoId | null`
- `displayName`
- `canonicalEmail | null`
- `tenantType | null`
- `portalAccessState`
  - `active`
  - `missing_principal`
  - `degraded_link`
  - `inactive`
- `resolutionSource`
  - `person_360`
  - `direct_user`
  - `direct_member`
  - `session_360`
  - `fallback`

Regla:
- el contrato debe enriquecer el grafo humano
- no debe colapsarlo a un solo ID

## Consumer Decision Table

### Personas y surfaces humanas

Usar `identity_profile` como ancla primaria cuando la surface:
- liste personas
- haga preview de una persona
- resuelva detalle cross-module
- muestre estado de vínculo entre facetas

Ejemplos:
- `person_360`
- People detail
- futuros selectors person-first
- `/admin/views` preview follow-on

### Colaboradores y serving operativo

Usar `member` como ancla primaria cuando el consumer:
- calcule payroll
- materialice capacity
- materialice serving por colaborador
- haga snapshots financieros/personales por miembro

Ejemplos:
- `ico_member_metrics`
- `person_intelligence`
- `member_capacity_economics`
- futuros costos y attribution layers

### Portal access, inbox y auditoría

Usar `client_user` como ancla primaria cuando el consumer:
- dependa de sesión
- lea o escriba preferencias
- lea o escriba inbox
- persista overrides
- haga auditoría user-scoped

Ejemplos:
- `notification_preferences`
- `notifications`
- `notification_log`
- `view_access_log`
- `user_view_overrides`

### Consumers híbridos

Si el consumer necesita combinar capas:
- anclar el modelo humano en `identity_profile`
- resolver `member_id` y `user_id` como facetas explícitas
- preservar la llave operativa existente en persistencia, envelopes y serving

## Reactive Compatibility Guardrails

### Outbox y webhook transport

No cambiar silenciosamente:
- `event_id`
- `aggregate_id`
- `aggregate_type`
- payload keys existentes `memberId`, `userId`, `identityProfileId`

La capa person-first puede enriquecer consumers downstream, pero no debe mutar retrospectivamente el contrato de transporte.

### Notification recipients

El patrón actual correcto es:
- resolver desde persona/facetas
- usar `userId` cuando existe principal portal
- caer a email cuando no existe inbox portal
- dedupear por recipient key efectiva

Regla:
- la recipient key efectiva sigue privilegiando `userId`
- no reemplazar `userId` por `identityProfileId` en inbox/preferencias

### Projections member-scoped

No sustituir `member_id` en:
- `src/lib/sync/projections/ico-member-metrics.ts`
- `src/lib/sync/projections/person-intelligence.ts`
- `src/lib/sync/projections/client-economics.ts` cuando el carril derive o preserve collaborator linkage

### Access preview y governance

Las surfaces de preview pueden dejar de ser `client_user-first`, pero deben seguir resolviendo:
- `userId` para overrides
- `authorizedViews`
- `routeGroups`
- `roleCodes`

Regla:
- `identity_profile` puede pasar a ser la raíz conceptual del preview
- `user_id` sigue siendo la llave de compatibilidad para persistencia actual

## Serving and Resolution Baselines

### `greenhouse_serving.person_360`

Es la base de lectura canónica para un humano resuelto.

Ya expone simultáneamente:
- `identity_profile_id`
- `member_id`
- `user_id`
- facetas y booleans `has_member_facet`, `has_user_facet`

Uso recomendado:
- resolvers shared
- People / admin read surfaces
- detalles y previews person-first

### `greenhouse_serving.session_360`

Debe seguir siendo la base útil para:
- acceso efectivo
- roles
- route groups
- authorized views
- recipients por rol user-scoped

Regla:
- `session_360` no reemplaza a `person_360`
- lo complementa para surfaces access-first

## Current Repo Alignment

### Ya alineado con este contrato

- `src/lib/notifications/person-recipient-resolver.ts`
  - resuelve desde `member`, `identity_profile` o `user`
  - preserva `userId` para inbox y fallback a email
- `src/lib/notifications/notification-service.ts`
  - mantiene dedupe/dispatch por recipient key efectiva
  - privilegia `userId` para preferencias e in-app
- `src/lib/sync/projections/notifications.ts`
  - combina `identityProfileId`, `memberId` y `userId`
- `src/lib/person-360/resolve-eo-id.ts`
  - devuelve el grafo base `identityProfileId/memberId/userId`
- `scripts/setup-postgres-person-360-v2.sql`
  - `person_360` ya modela facetas separadas

### Drift todavía abierto

- `src/lib/admin/get-admin-access-overview.ts`
  - sigue naciendo desde `client_users` en BigQuery
- `src/lib/admin/get-admin-view-access-governance.ts`
  - preview basado en `userId`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
  - UX y selección todavía user-first
- `src/lib/webhooks/consumers/notification-recipients.ts`
  - tiene partes maduras y una ruta legacy `getUserRecipient()` que no está alineada con el backbone Postgres actual

## Adoption Sequence

### Phase 1

Contrato y guardrails institucionales.

Salida:
- este documento
- `TASK-141` endurecida
- follow-ons reencuadrados

### Phase 2

Resolver shared reusable para consumers person-first sobre `person_360`, con estados de degradación explícitos.

### Phase 3

Adopción por consumers prioritarios:
- `TASK-140`
- `TASK-134`
- surfaces admin/person-first adicionales

### Phase 4

Guardrails para nuevos consumers:
- DTO shared
- checklist de llaves operativas
- observabilidad de casos degradados

### Phase 5

Retiro de patrones legacy solo cuando:
- no rompan `user_id`-scoped stores
- no rompan projections member-scoped
- exista compatibilidad transicional verificada

## Anti-Patterns Banned

- usar `client_user` como sinónimo de persona
- reemplazar `member_id` por `identity_profile_id` en serving/cálculo operativo
- reemplazar `user_id` por `identity_profile_id` en inbox, preferencias u overrides
- ocultar estados degradados de resolución
- crear DTOs incompatibles por módulo para el mismo grafo humano

## Relationship to TASK-162

`TASK-162` depende de este contrato, pero no hereda la raíz operativa del costo desde `identity_profile`.

Regla explícita:
- costos, payroll, capacity, finance serving e ICO siguen operando sobre `member_id`
- `identity_profile` solo enriquece el grafo humano y la trazabilidad cross-source

Consecuencia:
- `TASK-141` debe cerrarse antes de profundizar la capa canónica de commercial cost attribution
- `TASK-162` no debe reinterpretar identidad humana ni acceso portal
