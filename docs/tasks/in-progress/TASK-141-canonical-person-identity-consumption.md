# TASK-141 - Canonical Person Identity Consumption

## Delta 2026-03-30

- La task ya no debe leerse como lista abierta de ideas.
- Después del contraste contra arquitectura y codebase real, la decisión operativa quedó endurecida así:
  - `identity_profile` = raíz humana canónica
  - `member` = llave operativa obligatoria para payroll, capacity, ICO, serving por colaborador y costos
  - `client_user` = principal portal para sesión, inbox, preferencias, overrides y auditoría user-scoped
- Fuente canónica nueva del contrato:
  - `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- Evidencia real que condiciona el rollout:
  - notifications ya tiene un resolver híbrido razonablemente correcto en `src/lib/notifications/person-recipient-resolver.ts`
  - `NotificationService` sigue dependiendo correctamente de `userId` para inbox/preferencias y recipient key efectiva
  - `/admin/views` sigue siendo conceptualmente `client_user-first` desde `src/lib/admin/get-admin-access-overview.ts` y `src/lib/admin/get-admin-view-access-governance.ts`
  - `person_360` ya expone el grafo humano completo vía `scripts/setup-postgres-person-360-v2.sql`
  - `session_360` sigue siendo la base útil para access/runtime y recipients por rol
- Conclusión del contraste:
  - la task estaba bien orientada
  - no estaba todavía lo suficientemente endurecida para iniciar un cutover amplio sin antes fijar guardrails explícitos sobre outbox, projections, serving y recipient keys
- Relación con follow-ons:
  - `TASK-140` debe consumir este contrato para `/admin/views`
  - `TASK-134` debe cerrarlo en Notifications
  - `TASK-162` debe construirse encima sin reinterpretar costo/comercial attribution desde `identity_profile`

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Slice 1 - contrato endurecido`
- Rank: `56`
- Domain: `identity / platform / access`

## Summary

Institucionalizar en Greenhouse una regla canónica de consumo de identidad humana: la raíz de las superficies de lectura, administración, preview, recipients y resolución cross-module debe ser la persona canónica, no `client_user`.

Esta task no existe para cambiar una sola pantalla. Existe para dejar explícito cómo debe funcionar el objeto persona en el producto y cómo deben consumirlo los módulos cuando necesiten representar un humano, resolver un destinatario o previsualizar acceso.

## Why This Task Exists

La arquitectura ya empuja una lectura `person-first`, pero el repo todavía muestra drift en consumers reales:

- `/admin/views` arma su preview desde una base `client_user-first`
- notifications ya mostró problemas cuando resolvía humanos desde `client_user` en vez de persona
- algunos contratos todavía mezclan:
  - identidad humana
  - faceta operativa
  - principal de acceso al portal

Eso produce ambigüedad funcional:

- una persona puede existir canónicamente y no aparecer donde debería
- un módulo puede tratar al login como si fuera la persona
- nuevos consumers pueden nacer sobre el modelo equivocado aunque la arquitectura diga otra cosa

La task existe para volver canónica y reusable la regla correcta.

## Goal

- documentar y cerrar el contrato institucional del objeto persona en Greenhouse
- dejar explícita la jerarquía:
  - `identity_profile` / persona canónica
  - `member` / faceta operativa
  - `client_user` / principal o capacidad de acceso portal
- definir reglas de consumo por tipo de surface
- identificar consumers que todavía leen identidad humana desde `client_user`
- dejar una estrategia de migración segura y gradual

## Enterprise Thesis

Esto debe resolverse como capacidad de plataforma, no como cleanup cosmético.

Una implementación enterprise de identidad humana en Greenhouse debe garantizar:

- **una sola raíz humana canónica**
  - el humano no cambia porque cambie el login, el IdP o el canal de acceso
- **resolución determinística y reusable**
  - los consumers no deberían volver a implementar su propio matching de persona
- **compatibilidad fuerte con el presente**
  - `userId` sigue siendo válido para sesión, inbox, preferencias, overrides y auditoría donde aplique
- **cutover gradual y observable**
  - la migración no puede depender de “big bang”
- **fallos explícitos y auditables**
  - si una persona no puede resolverse bien, el sistema debe degradar con semántica clara, no inventar identidad

## Canonical Contract

La task debe dejar institucionalizado este contrato:

- **Persona canónica**
  - raíz humana del sistema
  - identidad persistente cross-source
  - no depende del método de autenticación
- **Faceta operativa**
  - `member`
  - expresa relación laboral/operativa/HR/payroll/capacity
- **Principal portal**
  - `client_user`
  - expresa acceso, sesión, auth mode, tenant context y permisos portal

Regla de precedencia:

1. si el consumer necesita representar o resolver un humano, parte desde persona canónica
2. si el consumer necesita datos operativos de colaborador, resuelve además la faceta `member`
3. si el consumer necesita sesión, login, inbox, preferencias, overrides o principal de acceso, resuelve además `client_user`

## Non-Negotiable Invariants

- una persona no puede quedar definida por un `userId`
- un cambio de IdP no puede crear una “persona nueva”
- ningún consumer nuevo puede usar `client_user` como identidad humana raíz si existe persona canónica resoluble
- las joins y caches deben exponer el identificador canónico de persona junto con los enlaces a `member` y `client_user`
- los fallbacks heurísticos deben ser transicionales, explícitos y medibles
- los labels snapshot nunca deben reemplazar IDs canónicos para resolver humanos

## Operating Model

La task debe proponer un operating model simple:

- **resolver canónico único**
  - una capa compartida que entregue la identidad resuelta de persona
- **consumer adapters**
  - notifications, admin preview, people/admin surfaces consumen el resolver, no reimplementan matching
- **policy de escalamiento**
  - cuando el resolver no pueda enlazar persona con principal o faceta operativa, debe devolver estado degradado conocido
- **ownership claro**
  - arquitectura e identidad son dueñas del contrato
  - cada módulo es dueño solo de adoptar el resolver correctamente

## Resolution Shape

La salida objetivo del resolver transversal debería poder expresar, como mínimo:

- `personId` / `identityProfileId`
- `displayName`
- `canonicalEmail`
- `memberId | null`
- `userId | null`
- `tenantType`
- `memberships[]`
- `portalAccessState`
  - `active`
  - `missing_principal`
  - `degraded_link`
  - `inactive`
- `resolutionSource`
  - `exact_link`
  - `derived_bridge`
  - `fallback`

No significa que toda surface deba mostrarlo completo, pero sí que el contrato compartido lo soporte.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- la persona humana no debe modelarse con `client_user` como raíz
- `client_user` puede seguir existiendo como principal de acceso y sesión
- `member` no reemplaza a persona; expresa una faceta operativa
- ningún módulo nuevo debe nacer `client_user-first` cuando el problema real sea representar o resolver un humano
- donde un consumer siga siendo `userId`-scoped por diseño, eso debe quedar explícito y justificado

## Dependencies & Impact

### Depends on

- arquitectura 360 e identidad vigente
- `TASK-134` - notification identity model hardening
- `TASK-136` - gobernanza de vistas cerrada

### Impacts to

- notifications
- `/admin/views`
- futuras surfaces admin/person/people
- recipient resolution
- preview resolution
- cualquier consumer que hoy trate `client_user` como identidad humana raíz

### Files owned

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-140-admin-views-person-first-preview.md`
- `docs/tasks/to-do/TASK-134-notification-identity-model-hardening.md`

## Current Repo State

### Ya existe

- arquitectura que empuja persona canónica como raíz
- `identity_profile` como capa de identidad humana
- `member` como faceta fuerte para lo operativo
- `client_user` como principal de acceso y sesión
- notifications ya tiene parte del carril `person-first`
- `/admin/views` ya tiene la necesidad visible de esta corrección
- `greenhouse_serving.person_360` ya resuelve en una sola vista:
  - `identity_profile_id`
  - `member_id`
  - `user_id`
  - facetas y estados base del grafo humano
- `greenhouse_serving.session_360` ya es un serving útil para:
  - roles
  - route groups
  - acceso efectivo
  - recipients por rol user-scoped

### Gap actual

- falta una policy institucional simple y reusable
- no todos los consumers saben cuándo usar persona, `member` o `client_user`
- algunas surfaces ya muestran el drift al usuario
- los límites de lo que seguirá siendo `userId`-scoped no están suficientemente formalizados
- no existe todavía un resolver canónico único con shape reusable para consumers
- no hay métricas institucionales para saber cuántos casos siguen degradados o parcialmente enlazados
- la task no explicitaba suficientemente el boundary entre:
  - `person_360` como resolver humano cross-facet
  - `session_360` como carril access-first
  - consumers member-scoped que no deben degradarse

## Scope

### Slice 1 - Contrato canónico del objeto persona

- describir la entidad humana canónica en lenguaje de producto y arquitectura
- definir qué representa cada capa:
  - persona
  - `member`
  - `client_user`
- dejar reglas de precedencia y resolución

### Slice 2 - Reglas de consumo por tipo de surface

- definir cuándo una surface debe partir desde persona
- definir cuándo corresponde partir desde `member`
- definir cuándo sí corresponde consumir `client_user`
- dejar explícitos los casos que siguen siendo `userId`-scoped

### Slice 2.5 - Resolver transversal

- definir el shape canónico del resolver de persona
- declarar qué campos son obligatorios
- declarar qué degradaciones son válidas
- evitar que cada módulo siga armando DTOs de identidad incompatibles

### Slice 3 - Inventario de drift actual

- listar consumers actuales que nacen desde `client_user-first`
- clasificarlos por severidad:
  - conceptual
  - funcional
  - tolerable transicional

También clasificar por tipo de riesgo:

- `user-visible`
- `delivery-risk`
- `audit-risk`
- `auth-coupling`

### Slice 4 - Estrategia de cutover

- definir cómo migrar consumers sin romper compatibilidad
- explicitar qué carriles deben salir como follow-on específicos
- formalizar `TASK-140` como consumer follow-on de `/admin/views`
- alinear el framing de notifications con `TASK-134`

La estrategia debe explicitar:

1. fase de contrato
2. fase de resolver shared
3. fase de adopción por consumers prioritarios
4. fase de guardrails para nuevos consumers
5. fase de retiro de patrones legacy cuando sea seguro

### Slice 5 - Observabilidad y governance

- definir métricas o señales mínimas del carril
- proponer counters de:
  - personas sin principal portal
  - principals sin persona canónica
  - bridges degradados
  - consumers aún `client_user-first`
- dejar claro dónde debería verse esa postura:
  - docs
  - admin governance
  - health o audit surfaces futuras

### Slice 6 - Reactive, webhook and projection compatibility

- inventariar explícitamente qué carriles no pueden romperse durante el cutover
- formalizar qué identificadores siguen siendo operativos por dominio
- exigir rollout con verificación sobre notificaciones, projections, outbox y webhook dispatch

Componentes revisados que deben preservarse:

- outbox y dispatch:
  - `src/lib/sync/publish-event.ts`
  - `src/lib/webhooks/dispatcher.ts`
- projection registry y consumers:
  - `src/lib/sync/projection-registry.ts`
  - `src/lib/sync/projections/notifications.ts`
  - `src/lib/sync/projections/client-economics.ts`
  - `src/lib/sync/projections/ico-member-metrics.ts`
  - `src/lib/sync/projections/person-intelligence.ts`
- recipient resolution:
  - `src/lib/notifications/person-recipient-resolver.ts`
  - `src/lib/notifications/notification-service.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`

Reglas no negociables para este slice:

- no mutar silenciosamente payloads de outbox ya consumidos por projections o webhook subscriptions
- no sustituir `member_id` por `identity_profile_id` en consumers que materializan serving por miembro
- no sustituir `user_id` por `identity_profile_id` en consumers que dependen de inbox, preferencias, overrides o auditoría user-scoped
- sí enriquecer resolvers para que cada consumer pueda ver el grafo completo persona/member/user sin perder las claves operativas actuales
- cualquier cambio de envelope, payload o recipient key debe salir con migration note, compatibilidad transicional y observabilidad explícita

## Out of Scope

- reimplementar en esta misma task todos los consumers afectados
- rediseñar el modelo completo de auth
- eliminar `client_user`
- crear una nueva entidad si el modelo actual ya permite resolver persona canónica
- introducir matching fuzzy automático de alto riesgo sin policy explícita
- hacer backfills masivos sin observabilidad y rollout controlado

## Acceptance Criteria

- [ ] existe una definición institucional clara del objeto persona canónico en Greenhouse
- [ ] queda explícita la diferencia entre persona, `member` y `client_user`
- [ ] hay reglas concretas de cuándo cada consumer debe usar cada entidad
- [ ] existe un shape canónico de resolución reusable para consumers
- [ ] quedan identificados los consumers con drift actual
- [ ] existe una estrategia de rollout gradual con degradaciones explícitas y observables
- [ ] quedan definidos anti-patterns que no deben volver a aparecer
- [ ] `TASK-140` y `TASK-134` quedan claramente posicionadas como follow-ons o carriles dependientes de esta política
- [ ] el contrato deja explícito que notifications, outbox, projections, webhooks, ICO y finance no deben degradarse durante la migración
- [ ] quedan definidos los identificadores operativos que deben preservarse por cada carril sensible (`identity_profile_id`, `member_id`, `user_id`)

## Verification

- validación documental del contrato en arquitectura + task
- consistencia con:
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- revisión manual de que la task permita derivar implementaciones concretas sin ambigüedad
- revisión manual de que el contrato soporte:
  - consumers UI
  - consumers notifications
  - consumers audit/access
  - evolución futura de IdP y provisioning
- revisión explícita de los carriles sensibles:
  - `src/lib/notifications/person-recipient-resolver.ts`
  - `src/lib/notifications/notification-service.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`
  - `src/lib/sync/projections/notifications.ts`
  - `src/lib/sync/projections/client-economics.ts`
  - `src/lib/sync/projections/ico-member-metrics.ts`
  - `src/lib/sync/projections/person-intelligence.ts`
  - `src/lib/webhooks/dispatcher.ts`
- confirmar que la task no plantea un cutover que rompa:
  - inbox/preferencias user-scoped
  - projections member-scoped
  - payloads actuales del outbox

## Anti-Patterns To Ban

- consumers que usen `client_user` como sinónimo de persona
- APIs que solo expongan `userId` cuando el objeto real sea humano
- matching por `full_name` o labels snapshot para resolver identidad humana
- DTOs distintos por módulo para representar la misma persona
- degradaciones silenciosas donde el sistema “simplemente omite” una persona sin explicar el estado de resolución

## Rollout Notes

- esta task debería cerrarse antes de declarar estable cualquier nueva wave de consumers person-centric
- `TASK-134` y `TASK-140` deberían leerse como primeras adopciones visibles
- si en implementación aparece necesidad de backfill o repair operativo, eso debería salir como lane derivada y no meterse implícitamente en esta misma task

## Open Questions

- el nombre de la entidad canónica visible al equipo de producto debería seguir siendo `identity_profile` o conviene hablar simplemente de `persona` en surfaces y docs operativas
- qué surfaces deberían migrarse primero después de cerrar esta task:
  - notifications
  - `/admin/views`
  - people/admin surfaces relacionadas

## Slice 1 Outcome

- esta sesión cierra el framing contractual y deja la task lista para adopción gradual
- no ejecuta todavía un cutover de consumers porque eso habría sido prematuro
- el siguiente slice sano ya no es debatir la jerarquía, sino:
  - shared resolver/person DTO reusable
  - adopción en `TASK-140`
  - cierre institucional en `TASK-134`

## Follow-ups

- `TASK-140` - cutover del preview de `/admin/views`
- `TASK-134` - cierre institucional del recipient model en notifications
