# Greenhouse API Platform Architecture V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-25
> **Ultima actualizacion:** 2026-04-25
> **Scope:** API platform interna, ecosystem-facing y futura external-facing de Greenhouse
> **Docs relacionados:** `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`, `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`, `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`, `GREENHOUSE_MCP_ARCHITECTURE_V1.md`, `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`, `TASK-040`

---

## Delta 2026-04-26 — TASK-617.4 publica Developer API Documentation Portal

- `/developers/api` pasa a ser el entrypoint publico developer-facing de la API Platform.
- El framing canonico cambia de `Integrations API` a `Greenhouse API Platform`, con lanes explicitas:
  - `ecosystem`
  - `app`
  - event control plane
  - legacy `integrations/v1`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md` y `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml` nacen como artefactos derivados developer-facing para el estado runtime actual.
- El OpenAPI de platform se marca como preview: cubre rutas y auth principales, pero schema generation automatica queda como follow-up.
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml` sigue siendo el contrato machine-readable estable del carril legacy/transicional.

## Delta 2026-04-26 — TASK-617.1/617.2 recupera hardening REST y lane first-party app

- `api/platform/ecosystem/*` ya usa metadata de paginación uniforme (`meta.pagination`), headers de rate limit con `remaining/reset`, soporte selectivo de freshness (`ETag` / `Last-Modified`) y tests de contrato focalizados.
- Nace la lane first-party `api/platform/app/*`:
  - `POST /api/platform/app/sessions` crea una sesión app user-scoped con access token corto y refresh token durable hasheado.
  - `PATCH /api/platform/app/sessions` rota el refresh token.
  - `DELETE /api/platform/app/sessions/current` revoca la sesión actual.
  - `GET /api/platform/app/context`, `/home` y `/notifications` exponen los primeros resources compactos para mobile.
  - `POST /api/platform/app/notifications/:id/read` y `/notifications/mark-all-read` son commands explícitos acotados.
- Runtime persistente nuevo:
  - `greenhouse_core.first_party_app_sessions`
  - `greenhouse_core.api_platform_request_logs`
- Regla canónica:
  - `ecosystem` sigue siendo server-to-server con `sister_platform_consumers`.
  - `app` es first-party user-authenticated, rehidrata tenant/access por usuario y no consume rutas web internas como contrato móvil.
  - La app móvil prevista (`React Native`) debe usar `api/platform/app/*` y no `/api/home/*` ni rutas SSR/web internas.

## Delta 2026-04-26 — TASK-617.3 aterriza el Event Control Plane ecosystem-facing

- `api/platform/ecosystem/*` ya expone el plano de control de eventos sin mover el transport raw:
  - `GET /event-types`
  - `GET/POST /webhook-subscriptions`
  - `GET/PATCH /webhook-subscriptions/:id`
  - `GET /webhook-deliveries`
  - `GET /webhook-deliveries/:id`
  - `POST /webhook-deliveries/:id/retry`
- El transport sigue siendo `src/lib/webhooks/**`, `/api/webhooks/*` y `/api/cron/webhook-dispatch`.
- Las subscriptions creadas por el control plane guardan ownership ecosystem-facing en `greenhouse_sync.webhook_subscriptions`:
  - `sister_platform_consumer_id`
  - `sister_platform_binding_id`
  - `greenhouse_scope_type`
  - `organization_id`, `client_id`, `space_id`
- Regla canónica:
  - consumers externos solo ven subscriptions/deliveries propias del consumer + binding resuelto
  - legacy/internal subscriptions sin owner quedan fuera del control plane ecosystem-facing
  - retry es un command de control plane que reprograma delivery; no envía HTTP inline ni reemplaza al dispatcher

## 1. Objetivo

Formalizar la arquitectura canónica de la `API platform` de Greenhouse para que el portal deje de crecer como una suma de rutas aisladas y pase a operar una capa de contratos consistente, robusta, resiliente, segura y escalable para:

- surfaces internas del propio portal
- first-party clients como futuras apps `iOS` y `Android`
- consumers ecosystem/server-to-server
- sister platforms como `Kortex`
- futuros adapters `MCP`
- una futura API pública selectiva cuando el dominio realmente lo justifique

La idea central es esta:

> Greenhouse no debe tratar la API como un detalle de cada módulo. Debe tratarla como una capability de plataforma con reglas uniformes de auth, versionado, observabilidad, resiliencia, tenancy safety y evolución contractual.

---

## 2. Estado actual del repo

Hoy el repo ya tiene piezas reales de una API platform, pero aún no una capa uniforme.

### 2.1 Lo que sí existe

- Rutas machine-to-machine bajo `/api/integrations/v1/*`
- Un carril endurecido y binding-aware para sister platforms bajo `/api/integrations/v1/sister-platforms/*`
- Auth reusable de integración en:
  - `src/lib/integrations/integration-auth.ts`
- Auth reusable de sister platforms en:
  - `src/lib/sister-platforms/external-auth.ts`
- Runtime persistente para bindings, consumers, request logs y rate limiting en:
  - `greenhouse_core.sister_platform_bindings`
  - `greenhouse_core.sister_platform_consumers`
  - `greenhouse_core.sister_platform_request_logs`
- Shared layer de API Platform en:
  - `src/lib/api-platform/core/**`
  - `src/lib/api-platform/resources/**`
- Lane canonica `ecosystem` en:
  - `src/app/api/platform/ecosystem/**`
- Lane first-party `app` en:
  - `src/app/api/platform/app/**`
- Event control plane en:
  - `src/app/api/platform/ecosystem/event-types`
  - `src/app/api/platform/ecosystem/webhook-subscriptions/**`
  - `src/app/api/platform/ecosystem/webhook-deliveries/**`
- Developer entrypoint publico en:
  - `src/app/(blank-layout-pages)/developers/api/page.tsx`
- Muchas rutas de dominio consolidadas para UI interna y producto

### 2.2 Lo que todavía no existe

- una `API platform` shared y uniforme para todos los dominios de Greenhouse
- una taxonomía completa y granular de degraded modes por dominio
- una capability shared de idempotencia para writes
- generacion automatica de OpenAPI desde schemas runtime
- una API publica anonima o self-service para developers externos
- adapters MCP downstream sobre todos los contratos estables

### 2.3 Lectura del codebase

El estado actual del código muestra tres realidades distintas:

1. `api/platform/ecosystem/*` ya funciona como lane canonica binding-aware.
2. `api/platform/app/*` ya funciona como foundation first-party user-authenticated.
3. `integrations/sister-platforms` sigue funcionando como carril legacy endurecido.
4. muchas rutas internas siguen resolviendo auth + payload + errores inline
5. los backends de lectura no son homogéneos:
   - `PostgreSQL / greenhouse_serving` domina en dominios nuevos o ya consolidados
   - `BigQuery` todavía aparece en carriles externos legacy como `integrations/v1`

Consecuencia:

> La `API platform` nueva no debe nacer como proxy de rutas existentes ni como rename cosmético de `/api/integrations/v1/*`. Debe nacer como una capa shared nueva montada sobre readers/adapters por aggregate.

---

## 3. Documentos absorbidos por esta arquitectura

Desde este documento:

- `docs/api/GREENHOUSE_API_REFERENCE_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`

quedan absorbidos a nivel de source of truth por esta spec.

Eso significa:

- la decisión arquitectónica canónica de API vive aquí
- `docs/api/*` pasan a ser documentos derivados, de referencia operativa o handoff para consumers puntuales
- el OpenAPI YAML existente:
  - `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`
  sigue siendo un artefacto machine-readable válido del carril actual, pero ya no debe tomarse como sustituto de la arquitectura general de la plataforma

Regla nueva:

> Si un documento API futuro contradice esta spec, debe tratarse como documento derivado desalineado y corregirse; no al revés.

---

## 4. Problemas que esta arquitectura corrige

Sin una `API platform` explícita, Greenhouse corre estos riesgos:

- crecimiento de rutas con auth inconsistente
- payloads atados a una surface UI en vez de a aggregates canónicos
- observabilidad desigual entre familias de API
- retries inseguros en writes mutativos
- polling excesivo o contratos sin cursores/versionado claros
- acoplar adapters `MCP` a rutas ad hoc en vez de a contratos estables
- reexponer drift interno de `BigQuery` / `Postgres` / mirrors externos como si fuera contrato público

La `API platform` existe para prevenir eso.

---

## 5. Principios rectores

### 5.1 Contract-first, not route-first

La unidad de diseño no es la ruta aislada, sino el contrato estable.

### 5.2 Aggregate-first, not table-first

La platform API no debe exponer tablas, mirrors ni joins raw como contrato.

Debe exponer resource models canónicos de aggregates como:

- `organization`
- `organization_workspace`
- `person`
- `capability_surface`
- `operational_readiness`
- futuros `artifact`, `issue`, `task` para `Ops Registry`

### 5.3 Read before write

Las primeras lanes ecosystem-facing deben ser read-only por defecto.

Los writes cross-system requieren:

- command semantics explícita
- idempotencia
- auditabilidad
- tenancy-safe authorization

### 5.4 MCP is downstream

`MCP` no es la foundation de la plataforma.

El orden correcto es:

1. resource adapters
2. stable API contract
3. observability + auth + degraded modes
4. MCP adapter downstream

### 5.5 Tenant safety is a hard rule

Ningún consumer ecosystem-facing debe resolver tenancy por labels, nombres visibles o heurísticas comerciales.

### 5.6 Degraded > opaque 500

Cuando una dependencia falle o un backend no esté listo, la platform API debe intentar responder de forma explícita y degradada si el caso lo permite, en vez de colapsar en un error opaco.

### 5.7 Versioning is explicit

La evolución del contrato debe ser gobernada; no implícita.

---

## 6. Modelo de capas

La plataforma debe operar sobre cuatro capas claras.

### 6.1 Product API layer

Rutas orientadas a UI o workflows internos del portal, por ejemplo:

- `/api/organizations/*`
- `/api/finance/*`
- `/api/hr/*`
- `/api/admin/*`

Estas rutas pueden seguir existiendo aunque no todas sean ecosystem-facing.

### 6.2 API Platform shared layer

Capability shared nueva:

- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/**`

Responsabilidades:

- auth/context platform-wide
- version negotiation
- response envelope
- error taxonomy
- idempotency
- pagination/cursor helpers
- request logging
- degraded-mode contracts

### 6.3 Platform route layer

Surface estable de la API platform:

- `src/app/api/platform/**`

Aquí viven las rutas que sí son contrato de plataforma y no detalle accidental de un módulo.

### 6.4 MCP / agent adapters

Adapters downstream montados sobre la API platform o sobre sus adapters shared, no sobre rutas de producto ad hoc.

---

## 7. Namespaces canónicos

La `API platform` debe separar explícitamente sus lanes.

### 7.1 Internal

`/api/platform/internal/*`

Uso:

- portal interno
- operators
- services internos
- tooling operacional controlado

Auth:

- sesión Greenhouse / service auth interno según el caso

### 7.2 Ecosystem

`/api/platform/ecosystem/*`

Uso:

- sister platforms
- workers externos controlados
- integraciones ecosystem-facing
- futuros adapters MCP read-only

Auth:

- consumer credentials
- scope explícito
- bindings explícitos cuando aplique

### 7.3 App

`/api/platform/app/*`

Uso:

- apps first-party `iOS`
- apps first-party `Android`
- futuros clients first-party no web que necesiten un contrato estable y desacoplado del portal

Contexto actual:

- la app móvil prevista hoy para Greenhouse es `React Native`
- esta spec lo trata como supuesto vigente de consumer, no como dependencia rígida del contrato API

Auth:

- auth de usuario first-party
- sesión o tokens móviles gobernados por Identity Access
- tenancy y permisos resueltos por usuario autenticado, no por consumer token ecosystem

Regla:

- la app móvil no debe depender de rutas internas pensadas para server components o UI web del portal
- debe depender de contratos estables de `api/platform/*`

### 7.4 Public

`/api/platform/public/*`

No se declara como lane V1 inmediata.

Solo debe existir cuando haya:

- ownership de producto claro
- SLA de contrato
- scopes y billing/governance definidos

---

## 8. Objetivo RESTful

### 8.1 Posición canónica

La `API platform` de Greenhouse debe evolucionar hacia una API **RESTful**.

Eso significa, en términos prácticos:

- recursos identificables por URL
- métodos HTTP con semántica consistente
- contratos uniformes de request/response
- stateless auth por request
- uso correcto de status codes, headers y paginación
- writes seguros, idempotentes y auditables

Greenhouse no necesita perseguir una REST “académicamente pura” si eso complica la operación.

Sí necesita una API:

- resource-oriented
- predecible
- tenant-safe
- auditable
- evolutiva sin romper consumers

### 8.2 Estado actual

Hoy la lane `api/platform/ecosystem/*` ya es **REST-like** pero todavía no es una REST API madura completa.

Lo que ya cumple:

- recursos legibles por URL
- lane stateless y machine-to-machine
- `GET` read-only consistente
- versionado por header
- envelope uniforme
- auth/context por request
- request IDs y headers operativos

Lo que todavía falta para llamarla RESTful de forma fuerte:

- métodos mutativos (`POST`, `PUT`, `PATCH`, `DELETE`) con semántica estable
- política uniforme de status codes para create/update/delete
- paginación consistente en todas las colecciones
- headers/contratos de rate limiting más completos
- soporte explícito para conditional requests y caching donde tenga sentido
- deprecación/versionado operado end-to-end

### 8.3 Regla de diseño

Greenhouse debe modelar primero recursos y después comandos.

Eso implica:

- evitar rutas RPC disfrazadas como si fueran resources
- no usar `POST` genérico para todo
- usar `PATCH` para cambios parciales cuando la semántica sea clara
- reservar `DELETE` para delete real o deprecación claramente documentada

Cuando una operación sea más comando que recurso, debe quedar explícita como command endpoint auditable y no fingirse como un CRUD trivial.

### 8.4 Métodos HTTP objetivo

La `API platform` debe soportar esta semántica objetivo:

- `GET`
  - lectura de resources o colecciones
- `POST`
  - create o command explícito con idempotencia
- `PUT`
  - replace completo cuando el recurso realmente lo soporte
- `PATCH`
  - actualización parcial
- `DELETE`
  - eliminación lógica o física solo cuando el contrato sea inequívoco
- `HEAD`
  - opcional cuando aporte valor a consumers o tooling
- `OPTIONS`
  - soporte técnico/CORS cuando aplique

### 8.5 Brechas actuales para llegar a RESTful

Las brechas concretas hoy son:

1. **Writes de negocio siguen cerrados**
   - `ecosystem` ya tiene commands acotados de event control plane
   - todavía no existen command endpoints amplios para mutar recursos de negocio

2. **Idempotencia transversal pendiente**
   - los futuros writes de dominio deben exigir idempotency key y auditabilidad
   - aun no existe helper/runtime compartido en `src/lib/api-platform/**`

3. **OpenAPI de platform todavia es preview**
   - existe documentacion developer-facing y un YAML preview
   - falta generacion automatica o validacion schema-first para todos los payloads

4. **Freshness selectiva**
   - `ETag` / `Last-Modified` existe donde la frescura es segura
   - no debe prometerse como universal para app o event control plane

5. **Semántica mutativa no definida**
   - el event control plane ya usa create/update/retry commands
   - la semantica de writes de negocio queda pendiente antes de abrir mas dominios

6. **Relación legacy vs REST nueva aún transicional**
   - `/api/integrations/v1/*` sigue viva y no toda su semántica está alineada todavía con el carril nuevo

### 8.6 Secuencia correcta para cerrar la brecha

Greenhouse no debe intentar “volverse RESTful” de golpe.

La secuencia correcta es:

1. consolidar read resources y paginación
2. cerrar error/status code policy
3. abrir `POST` idempotentes y auditables
4. abrir `PATCH` donde el dominio ya sea estable
5. agregar conditional requests y caching selectivo
6. recién después evaluar `DELETE`, public API amplia o MCP downstream más rico

### 8.7 Criterio de salida

Greenhouse podrá decir que su `API platform` es RESTful de forma sólida cuando:

- la lane nueva ya no sea solo read-only
- los resources principales tengan semántica uniforme de colección y detalle
- los writes sean idempotentes y auditables
- la paginación y status code policy sean consistentes
- el carril nuevo sea la referencia principal para consumers ecosystem-facing

### 8.8 Objetivo completo de plataforma API

El objetivo canónico de Greenhouse no es solo una REST API de lectura/escritura.

El objetivo completo es una **API platform convergida** con cuatro piezas:

1. `RESTful resource API`
   - resources y command endpoints HTTP claros
2. `First-party client surface`
   - contrato estable para mobile app y futuros clients propios
3. `Event delivery / webhooks`
   - delivery outbound y recepción inbound gobernados como capability de plataforma
4. `MCP downstream`
   - adapters montados sobre contratos ya estabilizados

En otras palabras:

- REST es una parte del objetivo
- first-party app support es otra parte del objetivo
- webhooks/event delivery son otra parte del objetivo
- MCP viene después, no antes

### 8.8.1 First-party mobile rule

Si Greenhouse lanza app `iOS` o `Android`, esa app debe tratarse como consumer oficial de la `API platform`.

Eso implica:

- no acoplarla a rutas internas del portal diseñadas para la web
- no usar payloads accidentales de UI como contrato móvil
- diseñar resources y commands explícitos para mobile workflows
- garantizar auth, caching, paginación y performance compatibles con redes móviles

El hecho de que la app prevista hoy sea `React Native` refuerza además:

- la conveniencia de contratos HTTP predecibles
- OpenAPI usable
- generación o compartición de types TypeScript
- payloads compactos y ergonómicos para clientes JS/TS móviles

La `API platform` existe también para servir de backend contract de first-party clients, no solo de integraciones externas.

### 8.9 Estado actual del objetivo completo

Hoy Greenhouse ya tiene partes importantes de ese objetivo, pero todavía distribuidas en capas distintas.

#### Ya existe

- lane nueva `api/platform/ecosystem/*` read-only y REST-like
- outbox canónico en `greenhouse_sync.outbox_events`
- inbound webhooks con endpoint genérico
- outbound webhook delivery con subscriptions, deliveries, attempts y dead-letter semantics
- observabilidad interna básica de inbox/deliveries

#### Todavía falta converger

- que exista una lane first-party clara para mobile app
- que la estrategia de auth móvil quede separada del lane ecosystem server-to-server
- que webhooks/event delivery queden modelados explícitamente como parte de la `API platform`
- que exista un contrato canónico ecosystem-facing para subscriptions, deliveries y firmas
- que REST y event delivery compartan de forma explícita:
  - versionado
  - error taxonomy
  - observabilidad
  - reglas de seguridad
  - lifecycle/deprecación

### 8.10 Brechas concretas para alcanzar el objetivo completo

Además de las brechas REST descritas arriba, faltan estas:

1. **First-party mobile lane todavía no existe**
   - la arquitectura ya la necesita
   - el runtime todavía no la implementa

2. **Auth móvil first-party todavía no está formalizada dentro de la platform**
   - falta definir estrategia de sesión/tokens para mobile
   - falta cerrar cómo se resuelven refresh, revocación y device posture cuando aplique

3. **Webhooks todavía no viven bajo `api/platform/*`**
   - existen como capability operativa del repo
   - todavía no son una lane convergida de platform API

4. **Subscriptions y deliveries no están expuestos como resources canónicos de plataforma**
   - el runtime existe
   - el contrato ecosystem-facing todavía no

5. **Event contract no está gobernado junto a la lane nueva**
   - faltan reglas más explícitas para:
     - envelope versioning
     - firma y auth outbound
     - retry policy declarada como contrato
     - dead-letter semantics canónicas

6. **REST y webhooks aún no comparten un control plane unificado**
   - hoy se apoyan en foundations sanas pero separadas
   - todavía falta una historia única de platform API para consumers externos

### 8.11 Secuencia correcta para cerrar el objetivo completo

La secuencia canónica debería ser:

1. cerrar la madurez REST del lane `api/platform/ecosystem/*`
2. definir la lane `app` y la estrategia first-party mobile
3. formalizar webhooks/event delivery como parte de `api-platform`
4. converger observabilidad, seguridad, errores y versionado entre esas capas
5. recién después expandir commands amplios, public API o MCP más rico

### 8.12 Regla operativa

Greenhouse no debe tratar “REST” y “webhooks” como programas separados y competidores.

Debe tratar la `API platform` como una capability que sirve tres clases de consumers:

- first-party apps para experiencias propias como mobile
- REST para consultar y comandar
- webhooks/event delivery para reaccionar a cambios

El objetivo no se considera completo mientras una de esas capas siga viviendo como capability útil pero todavía no convergida bajo la disciplina de plataforma nueva.

---

## 9. Política de versionado

### 9.1 Regla canónica

Greenhouse debe preferir versionado explícito por header para la API platform, con una default version documentada.

Header recomendado:

- `X-Greenhouse-Api-Version: 2026-04-25`

### 9.2 Por qué no solo `/v1`

El repo todavía está convergiendo múltiples lanes y backends. Un header versionado por fecha permite:

- congelar comportamiento breaking sin multiplicar paths prematuramente
- mantener additive changes sin forks innecesarios
- alinear SDK/types/tests por versión

### 9.3 Reglas de cambio

Se consideran `breaking changes`:

- remover o renombrar un campo de respuesta
- volver obligatorio un parámetro antes opcional
- cambiar auth/scopes requeridos
- cambiar el tipo de un campo
- cambiar semántica de tenancy o visibility

Se consideran `additive changes`:

- agregar un campo opcional
- agregar un endpoint
- agregar headers opcionales
- agregar enum values no disruptivos

### 9.4 Soporte

Cada nueva versión breaking de la API platform debe declarar explícitamente:

- versión nueva
- versión default
- ventana de soporte de la versión anterior

---

## 10. Modelo de autenticación

La platform API no debe mezclar auth humana del portal con auth machine-to-machine.

### 10.1 Internal auth

Usa:

- sesión NextAuth
- tenant context
- role codes / route groups / views / entitlements según corresponda

### 10.2 Ecosystem auth

Debe generalizar el patrón ya implementado en `sister-platforms`:

- token por consumer
- hash persistido, no token en claro
- `credential_status`
- expiración opcional
- allowlist de scope types
- rate limits por consumer

### 10.3 Binding-aware auth

Para requests ecosystem-facing que necesiten resolver tenancy externa:

- `externalScopeType`
- `externalScopeId`

La request solo puede servirse si:

- el consumer es válido y activo
- el binding resuelve un scope activo
- ese scope está permitido para el consumer

### 10.4 Public auth

No aprobada por defecto en V1.

Si aparece, debe usar credenciales, scopes y observabilidad propias, no reciclar tokens legacy de integración.

---

## 11. Response contract

La platform API debe usar un envelope uniforme.

### 11.1 Response envelope

Shape recomendada:

```json
{
  "requestId": "req_...",
  "servedAt": "2026-04-25T18:30:00.000Z",
  "apiVersion": "2026-04-25",
  "status": "ok",
  "data": {},
  "meta": {},
  "errors": []
}
```

### 11.2 Headers mínimos

- `x-greenhouse-request-id`
- `cache-control`
- `x-greenhouse-api-version`
- rate limit headers cuando aplique:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

### 11.3 Error contract

Los errores deben ser machine-readable.

Shape recomendada:

```json
{
  "requestId": "req_...",
  "servedAt": "2026-04-25T18:30:00.000Z",
  "apiVersion": "2026-04-25",
  "status": "error",
  "data": null,
  "meta": {},
  "errors": [
    {
      "code": "scope_not_allowed",
      "message": "Resolved binding scope is not allowed for this consumer.",
      "retryable": false
    }
  ]
}
```

---

## 12. Idempotencia

Para que los writes sean robustos y seguros, la platform API debe tratar la idempotencia como contrato nativo.

### 12.1 Header

- `Idempotency-Key`

### 12.2 Regla

Todos los `POST`, `PUT` o `PATCH` mutativos de la API platform deben poder aceptar idempotency key.

### 12.3 Semántica

La plataforma debe:

- persistir la primera respuesta final asociada a la key
- devolver el mismo resultado si llega el mismo request otra vez
- rechazar el reuse de una key con payload distinto
- expirar las keys según política documentada

### 12.4 Alcance V1

No es obligatorio retrofitear todas las rutas históricas del repo.

Sí es obligatorio en nuevos command endpoints de `api/platform/*`.

---

## 13. Paginación y cursores

Los endpoints de colección deben evitar dumps sin control.

### 13.1 Regla

Toda colección ecosystem-facing debe soportar paginación explícita.

### 13.2 Contratos aceptados

- cursor-based preferido
- page/per_page permitido como compat temporal donde ya exista ese patrón

### 13.3 Respuesta

El contrato debe incluir:

- items
- page info / next cursor
- link headers cuando aplique

### 13.4 No-goal

Los consumers no deben inferir o construir manualmente URLs futuras; deben consumir cursores o links devueltos por la plataforma.

---

## 14. Observabilidad

La API platform debe ser observable desde el día 1.

### 14.1 Mínimos por request

- request ID
- consumer principal o tenant actor
- route key
- auth lane usada
- scope resuelto
- response status
- duration
- degraded flag
- backend provenance

### 14.2 Provenance

Toda response debería poder declarar, si aporta valor operativo:

- `postgres_serving`
- `postgres_truth`
- `bigquery`
- `external_facade`
- `derived_cache`

### 14.3 Error taxonomy

Los errores deben tipificarse de forma estable, por ejemplo:

- `unauthorized`
- `forbidden`
- `missing_scope`
- `scope_not_allowed`
- `not_found`
- `rate_limited`
- `dependency_timeout`
- `backend_unavailable`
- `schema_drift`
- `validation_failed`
- `idempotency_conflict`
- `internal_error`

---

## 15. Resiliencia y degraded modes

### 15.1 Regla

La platform API no debe fingir consistencia cuando una dependencia no está lista, pero tampoco debe colapsar innecesariamente en `500`.

### 15.2 Patrones admitidos

- fallback de serving materializado a truth reader cuando sea seguro
- respuesta parcial/degradada con metadata explícita
- timeouts conservadores hacia providers externos
- no bloquear un resource completo por metadata secundaria no crítica

### 15.3 Patrones no admitidos

- silent fallback que cambie semántica sin avisar
- mezclar en una misma response datos frescos y stale sin metadata
- esconder schema drift tras mensajes genéricos

---

## 16. Política de backend

La platform API debe desacoplar el contrato externo del backend real.

### 16.1 Prioridad de lectura

1. `PostgreSQL / greenhouse_serving` cuando exista serving canónico
2. `PostgreSQL truth layer` cuando el aggregate aún no tenga serving derivado
3. `BigQuery` solo como carril legacy o transición explícita
4. facades externas dedicadas cuando el dato deba leerse live desde un sistema hermano o integración dedicada

### 16.2 Regla dura

Un consumer de plataforma no debe tener que saber si un resource vino de `BigQuery` o `Postgres` para usar el contrato.

### 16.3 Consecuencia

La platform API debe montarse sobre resource adapters propios, no sobre SQL inline en cada route ni sobre proxies de rutas legacy.

---

## 17. Resource adapters canónicos

La capa técnica objetivo es:

- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/**`

### 17.1 `core`

Debe incluir al menos:

- auth
- request context
- version negotiation
- response helpers
- error types
- idempotency
- pagination
- observability
- rate limit helpers

### 17.2 `resources`

Debe incluir adapters por aggregate, por ejemplo:

- `organizations`
- `organization-workspaces`
- `people`
- `capabilities`
- `readiness`
- futuro `ops-registry`

Cada adapter decide:

- qué store/reader consume
- qué backend usa
- cómo normaliza el resource model
- cómo declara degraded mode

---

## 18. Lanes vigentes y migración

### 18.1 Lane legacy vigente

`/api/integrations/v1/*` sigue siendo un carril válido y operativo.

### 18.2 Nueva regla

No debe seguir creciendo como namespace catch-all de la plataforma.

### 18.3 Camino correcto

1. mantener `integrations/v1` estable mientras tenga consumers
2. crear `api/platform/ecosystem/*` como lane nueva y aditiva
3. mover nuevos contratos de plataforma a esa lane
4. dejar `integrations/v1` como surface legacy/transicional hasta convergencia real

---

## 19. Primer slice recomendado

La primera iteración de la platform API debe ser deliberadamente chica.

### 19.1 Foundation

- request context shared
- version header
- response envelope
- error taxonomy
- observability/rate limit headers
- idempotency foundation para futuros writes

### 19.2 Endpoints iniciales

- `GET /api/platform/ecosystem/context`
- `GET /api/platform/ecosystem/organizations`
- `GET /api/platform/ecosystem/organizations/:id`
- `GET /api/platform/ecosystem/capabilities`
- `GET /api/platform/ecosystem/integration-readiness`

### 19.3 No-goals del primer slice

- abrir una API pública genérica
- retrofitear todas las rutas históricas del repo
- exponer writes cross-platform amplios
- construir el MCP completo antes de estabilizar la API

---

## 20. Relación con sister platforms y Kortex

Esta arquitectura no reemplaza:

- `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`

Las complementa.

Distribución correcta:

- `SISTER_PLATFORMS_*`
  - define peer-system contract, tenancy binding y governance cross-platform
- `KORTEX_*`
  - define el anexo concreto de esa integración
- `API_PLATFORM_ARCHITECTURE_V1`
  - define cómo Greenhouse expone sus contratos API como capability de plataforma reusable

---

## 21. Relación con Data Node y Ops Registry

### 21.1 Data Node

`TASK-040` sigue vigente en su regla clave:

> `MCP` es downstream de una API estable.

Esta arquitectura la reafirma.

### 21.2 Ops Registry

`EPIC-003` y `GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md` quedan alineados así:

- `Ops Registry` es un dominio/platform capability
- su surface humana vive en el portal
- su surface agente/API/MCP debe montarse sobre esta disciplina de platform API

### 21.3 MCP

La arquitectura específica del server MCP vive en:

- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`

Regla canónica:

- esta spec define la dependencia y la secuencia
- la spec de MCP define el server, sus surfaces y su write policy

---

## 22. Plano de eventos canónico

La convergencia de webhooks y event delivery dentro de la `API platform` no debe rehacer el transport layer que ya existe.

Debe agregar un control plane canónico ecosystem-facing encima del runtime descrito en `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`.

### 22.1 Distinción obligatoria

Greenhouse debe separar explícitamente:

- `transport boundary`
  - recepción y entrega HTTP real de webhooks
- `event control plane`
  - resources y commands para administrar subscriptions, deliveries, retries y observabilidad

Regla:

- el transport inbound puede seguir viviendo en `/api/webhooks/*`
- el control plane nuevo debe vivir en `/api/platform/*`

### 22.2 Resources canónicos de event plane

La `API platform` debe tratar como resources oficiales, al menos:

- `event-types`
- `webhook-subscriptions`
- `webhook-deliveries`
- `webhook-delivery-attempts`
- `webhook-endpoints` cuando la recepción inbound deba administrarse como asset del consumer

Los nombres finales pueden refinarse, pero el modelo debe mantenerse resource-oriented.

### 22.3 Surface ecosystem recomendada

El carril `ecosystem` debería converger a algo como:

- `GET /api/platform/ecosystem/event-types`
- `GET /api/platform/ecosystem/webhook-subscriptions`
- `GET /api/platform/ecosystem/webhook-subscriptions/:id`
- `POST /api/platform/ecosystem/webhook-subscriptions`
- `PATCH /api/platform/ecosystem/webhook-subscriptions/:id`
- `GET /api/platform/ecosystem/webhook-deliveries`
- `GET /api/platform/ecosystem/webhook-deliveries/:id`
- `POST /api/platform/ecosystem/webhook-deliveries/:id/retry`

Regla:

- `POST` y `PATCH` viven en el control plane
- el POST real del webhook transport no reemplaza a esos resources

### 22.4 Envelope de evento

El contract de evento debe seguir una disciplina uniforme con la platform API.

Campos mínimos esperados:

- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `publishedAt`
- `scope`
- `data`
- `meta`

`eventVersion` y `apiVersion` pueden evolucionar por separado si hace falta, pero ambos deben ser explícitos.

### 22.5 Seguridad y retries

La convergencia del event plane debe preservar estas reglas:

- firma outbound obligatoria cuando exista secreto configurado
- retries declarados como contrato operativo documentado
- dead-letter visible y reintenable desde control plane
- ningún consumer externo debe leer tablas `greenhouse_sync.*` como integración oficial

### 22.6 Regla canónica nueva

Webhooks y event delivery sí son parte de la `API platform`, pero solo a través de su control plane convergido; no a través del transport raw ni de acceso directo a tablas.

---

## 23. Cierre de diseño pendiente ya resuelto

Para evitar que la `API platform` siga creciendo con ambigüedad, desde esta spec quedan resueltas estas decisiones arquitectónicas.

### 23.1 Resource canon V1.1

Los resources canónicos base de la plataforma son:

- `context`
- `organization`
- `organization-workspace`
- `person`
- `capability-surface`
- `integration-readiness`
- `event-type`
- `webhook-subscription`
- `webhook-delivery`

Eso significa:

- `capabilities` expresa catálogo/asignación de capability surface, no UI payload arbitrario
- `integration-readiness` expresa estado operativo de integraciones y bindings, no KPIs analíticos inline
- el event plane también entra al canon de plataforma, no queda como subsistema aparte

### 23.2 Write model V1.1

La política canónica de mutaciones queda así:

- `POST`
  - create o command explícito
- `PATCH`
  - cambios parciales de estado o metadata
- `PUT`
  - excepcional; solo para replace completo de recursos verdaderamente reemplazables
- `DELETE`
  - desaconsejado por defecto; preferir `archive`, `suspend`, `deprecate` o `disable` cuando esa sea la semántica real

Greenhouse no debe perseguir CRUD completo como objetivo; debe perseguir commands y resources semánticamente correctos.

### 23.3 Status code policy V1.1

La política uniforme objetivo queda así:

- `200 OK`
  - lectura exitosa o mutación que devuelve representación inmediata
- `201 Created`
  - create exitoso de recurso nuevo
- `202 Accepted`
  - command aceptado pero todavía asíncrono
- `204 No Content`
  - mutación exitosa sin body
- `304 Not Modified`
  - conditional request sin cambios
- `400 Bad Request`
  - request mal formada
- `401 Unauthorized`
  - credencial inválida o ausente
- `403 Forbidden`
  - actor autenticado pero sin permiso/scope
- `404 Not Found`
  - recurso no visible o inexistente dentro del scope
- `409 Conflict`
  - conflicto de estado o idempotencia
- `422 Unprocessable Entity`
  - payload válido sintácticamente pero rechazado por reglas de dominio
- `429 Too Many Requests`
  - rate limit
- `503 Service Unavailable`
  - dependencia o backend no disponible

### 23.4 Deprecation policy V1.1

La convivencia con lanes legacy debe seguir esta disciplina:

- todo contrato nuevo nace en `api/platform/*`
- `integrations/v1` solo crece por compatibilidad o transición explícita
- un endpoint legacy no se considera deprecado hasta que:
  - exista surface equivalente o superior en `api/platform/*`
  - el consumer haya sido identificado
  - exista ventana de migración documentada

### 23.5 SLO y frescura

La `API platform` debe documentar por resource cuál es su expectativa de frescura:

- `live`
- `near-real-time`
- `periodic-materialized`
- `derived-cache`

Regla:

- Greenhouse no debe prometer frescura implícita
- si un resource puede degradarse o venir materializado, eso debe declararse en metadata y documentación

### 23.6 Regla canónica nueva

La `API platform` de Greenhouse queda definida no solo por sus routes, sino por cinco contratos obligatorios:

- resource canon
- write model
- status code policy
- event control plane
- deprecation y freshness discipline

---

## 24. Reglas canónicas nuevas

Desde 2026-04-25 Greenhouse debe operar con estas reglas:

1. Ningún documento en `docs/api/*` es ya la source of truth arquitectónica principal de la plataforma; la arquitectura API canónica vive en `docs/architecture/`.
2. Nuevos contratos ecosystem-facing deben nacer en `api/platform/*`, no seguir engordando `integrations/v1` salvo compat o transición explícita.
3. Nuevos command endpoints de platform API deben soportar idempotencia.
4. Nuevos resources de platform API deben montarse sobre adapters shared por aggregate, no sobre proxies de rutas legacy.
5. `MCP` debe seguir siendo downstream de contratos API estables.
6. `BigQuery` puede seguir existiendo como backend transicional o analítico, pero no debe filtrarse como shape contractual del consumer.

---

## 25. Delta 2026-04-25 — Nace la arquitectura canónica de API platform

Se crea `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` como source of truth para la plataforma de APIs de Greenhouse.

Decisiones explícitas:

- `docs/api/GREENHOUSE_API_REFERENCE_V1.md` y `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md` quedan absorbidos por esta arquitectura a nivel canónico
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml` se conserva como artefacto machine-readable del carril vigente, no como spec arquitectónica superior
- la plataforma API correcta para Greenhouse debe nacer como capability shared nueva (`src/lib/api-platform/**` + `src/app/api/platform/**`)
- `integrations/v1` sigue vivo como lane legacy/transicional
- `MCP` queda reafirmado como adapter downstream de una API estable y no como punto de partida

## 26. Delta 2026-04-25 — TASK-616 implementa el primer slice runtime

Ya existe una primera implementación runtime aditiva de la arquitectura:

- foundation nueva en `src/lib/api-platform/**`
- lane nueva read-only en `src/app/api/platform/ecosystem/**`

Endpoints implementados:

- `GET /api/platform/ecosystem/context`
- `GET /api/platform/ecosystem/organizations`
- `GET /api/platform/ecosystem/organizations/:id`
- `GET /api/platform/ecosystem/capabilities`
- `GET /api/platform/ecosystem/integration-readiness`

Decisiones explícitas de este slice:

- `context` queda definido como contexto ecosystem binding-aware del consumer autenticado
- `capabilities` en esta V1 significa catálogo/asignación de tenant capabilities, no runtime data de módulos UI
- `integration-readiness` expresa health/readiness de integraciones y bindings; no pretende ser readiness transversal de toda la plataforma
- el auth/context nuevo reutiliza el modelo seguro de `sister_platform_consumers` + `sister_platform_bindings` + `sister_platform_request_logs` sin romper `/api/integrations/v1/*`
- `integrations/v1` y `integrations/v1/sister-platforms/*` siguen intactos y verificados como lanes legacy/transicionales
