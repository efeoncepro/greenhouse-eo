# Greenhouse Person Identity Consumption V1

## Purpose

Definir el contrato canónico de consumo del objeto persona en Greenhouse.

Este documento no reemplaza la arquitectura base de identidad. La complementa para dejar explícito:
- cuándo la raíz humana es `identity_profile`
- cuándo debe preservarse `member_id`
- cuándo debe preservarse `user_id`
- cómo debe migrarse `person-first` sin romper outbox, projections, serving, notifications ni access runtime

Usar junto con:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

## Status

Contrato vigente desde `2026-03-30`.

Secuencia ya tomada:
- `TASK-141` va antes que `TASK-162`
- `TASK-141` institucionaliza el contrato persona/member/user
- `TASK-140` y `TASK-134` adoptan ese contrato en consumers concretos
- `TASK-162` debe construirse encima sin mezclar identidad humana con llaves operativas de costo

## Core Contract

### 1. `identity_profile`

Es la raíz humana canónica.

Debe usarse cuando el problema real sea:
- representar a una persona
- resolver un humano cross-source
- unir facetas `member`, `client_user`, CRM u otras fuentes
- construir selectors, previews o read surfaces `person-first`

No reemplaza por sí sola:
- `member_id`
- `user_id`

### 2. `member`

Es la faceta operativa del colaborador.

Sigue siendo la llave primaria para:
- payroll
- HR
- People
- team capacity
- ICO
- serving y snapshots por colaborador
- costo laboral, attribution y consumers financieros ligados a colaboración

Regla fuerte:
- si el carril calcula o materializa por colaborador, `member_id` no se sustituye por `identity_profile_id`

### 3. `client_user`

Es el principal de acceso al portal.

Sigue siendo la llave primaria para:
- sesión
- login
- inbox
- preferencias
- overrides
- auditoría user-scoped

Regla fuerte:
- `client_user` no es la raíz humana
- tampoco debe eliminarse de carriles donde `user_id` es la llave operativa correcta

## Decision Table

### Usar `identity_profile` como ancla primaria

Cuando el consumer:
- lista personas
- hace preview de un humano
- resuelve un detalle cross-module
- necesita mostrar el vínculo entre facetas

Ejemplos:
- `person_360`
- futuros selectors person-first
- `/admin/views` follow-on
- read surfaces administrativas o people-first

### Usar `member` como ancla primaria

Cuando el consumer:
- calcula payroll
- materializa capacity
- materializa serving por colaborador
- calcula métricas ICO o costos por colaborador

Ejemplos:
- `ico_member_metrics`
- `person_intelligence`
- `member_capacity_economics`
- serving de People y slices de costo laboral

### Usar `client_user` como ancla primaria

Cuando el consumer:
- depende de sesión
- lee o escribe inbox
- lee o escribe preferencias
- persiste overrides
- registra auditoría user-scoped

Ejemplos:
- `notification_preferences`
- `notifications`
- `notification_log`
- `view_access_log`
- `user_view_overrides`

### Consumers híbridos

Si un consumer necesita combinar capas:
- la raíz conceptual es `identity_profile`
- `member_id` y `user_id` deben resolverse como facetas explícitas
- la persistencia no debe perder la llave operativa vigente

## Canonical Resolution Shape

Todo resolver shared nuevo o endurecido debería poder exponer, como mínimo:
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
  - `fallback`

Regla:
- el contrato enriquece el grafo humano
- no lo colapsa a un solo identificador

## Reactive Guardrails

### Outbox y webhook transport

No cambiar silenciosamente:
- `event_id`
- `aggregate_id`
- `aggregate_type`
- payload keys ya existentes como `memberId`, `userId`, `identityProfileId`

`person-first` puede enriquecer consumers downstream, pero no debe reescribir el contrato de transporte.

### Notifications

El patrón correcto es:
- resolver desde persona/facetas
- usar `userId` cuando existe principal portal
- caer a email cuando no existe inbox portal
- dedupear por recipient key efectiva

Regla fuerte:
- la recipient key efectiva sigue privilegiando `userId`
- no reemplazar `userId` por `identityProfileId` en inbox o preferencias

### Projections y serving member-scoped

No sustituir `member_id` en:
- `src/lib/sync/projections/ico-member-metrics.ts`
- `src/lib/sync/projections/person-intelligence.ts`
- `src/lib/sync/projections/client-economics.ts` cuando preserve collaborator linkage
- serving y snapshots financieros por colaborador

### Access preview

Las surfaces de preview pueden dejar de ser `client_user-first`, pero deben seguir resolviendo:
- `userId`
- `authorizedViews`
- `routeGroups`
- `roleCodes`

Regla:
- `identity_profile` puede pasar a ser la raíz conceptual del preview
- `user_id` sigue siendo la llave de compatibilidad para persistencia actual

## Current Slice

Primer slice runtime conservador implementado:
- `src/lib/identity/canonical-person.ts`
- adopción inicial en:
  - `src/lib/notifications/person-recipient-resolver.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`

Qué hace este slice:
- institucionaliza un resolver shared de persona canónica
- expone simultáneamente `identityProfileId`, `memberId`, `userId`, `portalAccessState` y `resolutionSource`
- preserva recipient keys y comportamiento `userId`-scoped del sistema de notificaciones

Qué no hace todavía:
- no corta `/admin/views`
- no cambia envelopes de outbox
- no cambia projections member-scoped
- no redefine serving financiero ni de payroll

## Follow-ons

- `TASK-140`: mover `/admin/views` a persona previewable real
- `TASK-134`: endurecer notifications como sistema transversal sobre este contrato
- `TASK-162`: construir cost attribution encima de este contrato, preservando `member_id` como llave operativa
