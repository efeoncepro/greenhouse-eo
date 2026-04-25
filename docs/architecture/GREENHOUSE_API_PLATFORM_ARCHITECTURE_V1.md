# Greenhouse API Platform Architecture V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-25
> **Ultima actualizacion:** 2026-04-25
> **Scope:** API platform interna, ecosystem-facing y futura external-facing de Greenhouse
> **Docs relacionados:** `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`, `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`, `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`, `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`, `TASK-040`

---

## 1. Objetivo

Formalizar la arquitectura canónica de la `API platform` de Greenhouse para que el portal deje de crecer como una suma de rutas aisladas y pase a operar una capa de contratos consistente, robusta, resiliente, segura y escalable para:

- surfaces internas del propio portal
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
- Muchas rutas de dominio consolidadas para UI interna y producto

### 2.2 Lo que todavía no existe

- una `API platform` shared y uniforme para todo Greenhouse
- un envelope estable de respuestas transversal a las familias de API
- una taxonomía única de errores y degraded modes
- una policy uniforme de versionado
- una capability shared de idempotencia para writes
- una separación explícita entre:
  - rutas de producto/UI
  - contratos ecosystem-facing
  - futuros adapters MCP downstream

### 2.3 Lectura del codebase

El estado actual del código muestra tres realidades distintas:

1. `integrations/sister-platforms` ya funciona como foundation de plataforma
2. muchas rutas internas siguen resolviendo auth + payload + errores inline
3. los backends de lectura no son homogéneos:
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

### 7.3 Public

`/api/platform/public/*`

No se declara como lane V1 inmediata.

Solo debe existir cuando haya:

- ownership de producto claro
- SLA de contrato
- scopes y billing/governance definidos

---

## 8. Política de versionado

### 8.1 Regla canónica

Greenhouse debe preferir versionado explícito por header para la API platform, con una default version documentada.

Header recomendado:

- `X-Greenhouse-Api-Version: 2026-04-25`

### 8.2 Por qué no solo `/v1`

El repo todavía está convergiendo múltiples lanes y backends. Un header versionado por fecha permite:

- congelar comportamiento breaking sin multiplicar paths prematuramente
- mantener additive changes sin forks innecesarios
- alinear SDK/types/tests por versión

### 8.3 Reglas de cambio

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

### 8.4 Soporte

Cada nueva versión breaking de la API platform debe declarar explícitamente:

- versión nueva
- versión default
- ventana de soporte de la versión anterior

---

## 9. Modelo de autenticación

La platform API no debe mezclar auth humana del portal con auth machine-to-machine.

### 9.1 Internal auth

Usa:

- sesión NextAuth
- tenant context
- role codes / route groups / views / entitlements según corresponda

### 9.2 Ecosystem auth

Debe generalizar el patrón ya implementado en `sister-platforms`:

- token por consumer
- hash persistido, no token en claro
- `credential_status`
- expiración opcional
- allowlist de scope types
- rate limits por consumer

### 9.3 Binding-aware auth

Para requests ecosystem-facing que necesiten resolver tenancy externa:

- `externalScopeType`
- `externalScopeId`

La request solo puede servirse si:

- el consumer es válido y activo
- el binding resuelve un scope activo
- ese scope está permitido para el consumer

### 9.4 Public auth

No aprobada por defecto en V1.

Si aparece, debe usar credenciales, scopes y observabilidad propias, no reciclar tokens legacy de integración.

---

## 10. Response contract

La platform API debe usar un envelope uniforme.

### 10.1 Response envelope

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

### 10.2 Headers mínimos

- `x-greenhouse-request-id`
- `cache-control`
- `x-greenhouse-api-version`
- rate limit headers cuando aplique:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

### 10.3 Error contract

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

## 11. Idempotencia

Para que los writes sean robustos y seguros, la platform API debe tratar la idempotencia como contrato nativo.

### 11.1 Header

- `Idempotency-Key`

### 11.2 Regla

Todos los `POST`, `PUT` o `PATCH` mutativos de la API platform deben poder aceptar idempotency key.

### 11.3 Semántica

La plataforma debe:

- persistir la primera respuesta final asociada a la key
- devolver el mismo resultado si llega el mismo request otra vez
- rechazar el reuse de una key con payload distinto
- expirar las keys según política documentada

### 11.4 Alcance V1

No es obligatorio retrofitear todas las rutas históricas del repo.

Sí es obligatorio en nuevos command endpoints de `api/platform/*`.

---

## 12. Paginación y cursores

Los endpoints de colección deben evitar dumps sin control.

### 12.1 Regla

Toda colección ecosystem-facing debe soportar paginación explícita.

### 12.2 Contratos aceptados

- cursor-based preferido
- page/per_page permitido como compat temporal donde ya exista ese patrón

### 12.3 Respuesta

El contrato debe incluir:

- items
- page info / next cursor
- link headers cuando aplique

### 12.4 No-goal

Los consumers no deben inferir o construir manualmente URLs futuras; deben consumir cursores o links devueltos por la plataforma.

---

## 13. Observabilidad

La API platform debe ser observable desde el día 1.

### 13.1 Mínimos por request

- request ID
- consumer principal o tenant actor
- route key
- auth lane usada
- scope resuelto
- response status
- duration
- degraded flag
- backend provenance

### 13.2 Provenance

Toda response debería poder declarar, si aporta valor operativo:

- `postgres_serving`
- `postgres_truth`
- `bigquery`
- `external_facade`
- `derived_cache`

### 13.3 Error taxonomy

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

## 14. Resiliencia y degraded modes

### 14.1 Regla

La platform API no debe fingir consistencia cuando una dependencia no está lista, pero tampoco debe colapsar innecesariamente en `500`.

### 14.2 Patrones admitidos

- fallback de serving materializado a truth reader cuando sea seguro
- respuesta parcial/degradada con metadata explícita
- timeouts conservadores hacia providers externos
- no bloquear un resource completo por metadata secundaria no crítica

### 14.3 Patrones no admitidos

- silent fallback que cambie semántica sin avisar
- mezclar en una misma response datos frescos y stale sin metadata
- esconder schema drift tras mensajes genéricos

---

## 15. Política de backend

La platform API debe desacoplar el contrato externo del backend real.

### 15.1 Prioridad de lectura

1. `PostgreSQL / greenhouse_serving` cuando exista serving canónico
2. `PostgreSQL truth layer` cuando el aggregate aún no tenga serving derivado
3. `BigQuery` solo como carril legacy o transición explícita
4. facades externas dedicadas cuando el dato deba leerse live desde un sistema hermano o integración dedicada

### 15.2 Regla dura

Un consumer de plataforma no debe tener que saber si un resource vino de `BigQuery` o `Postgres` para usar el contrato.

### 15.3 Consecuencia

La platform API debe montarse sobre resource adapters propios, no sobre SQL inline en cada route ni sobre proxies de rutas legacy.

---

## 16. Resource adapters canónicos

La capa técnica objetivo es:

- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/**`

### 16.1 `core`

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

### 16.2 `resources`

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

## 17. Lanes vigentes y migración

### 17.1 Lane legacy vigente

`/api/integrations/v1/*` sigue siendo un carril válido y operativo.

### 17.2 Nueva regla

No debe seguir creciendo como namespace catch-all de la plataforma.

### 17.3 Camino correcto

1. mantener `integrations/v1` estable mientras tenga consumers
2. crear `api/platform/ecosystem/*` como lane nueva y aditiva
3. mover nuevos contratos de plataforma a esa lane
4. dejar `integrations/v1` como surface legacy/transicional hasta convergencia real

---

## 18. Primer slice recomendado

La primera iteración de la platform API debe ser deliberadamente chica.

### 18.1 Foundation

- request context shared
- version header
- response envelope
- error taxonomy
- observability/rate limit headers
- idempotency foundation para futuros writes

### 18.2 Endpoints iniciales

- `GET /api/platform/ecosystem/context`
- `GET /api/platform/ecosystem/organizations`
- `GET /api/platform/ecosystem/organizations/:id`
- `GET /api/platform/ecosystem/capabilities`
- `GET /api/platform/ecosystem/readiness`

### 18.3 No-goals del primer slice

- abrir una API pública genérica
- retrofitear todas las rutas históricas del repo
- exponer writes cross-platform amplios
- construir el MCP completo antes de estabilizar la API

---

## 19. Relación con sister platforms y Kortex

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

## 20. Relación con Data Node y Ops Registry

### 20.1 Data Node

`TASK-040` sigue vigente en su regla clave:

> `MCP` es downstream de una API estable.

Esta arquitectura la reafirma.

### 20.2 Ops Registry

`EPIC-003` y `GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md` quedan alineados así:

- `Ops Registry` es un dominio/platform capability
- su surface humana vive en el portal
- su surface agente/API/MCP debe montarse sobre esta disciplina de platform API

---

## 21. Reglas canónicas nuevas

Desde 2026-04-25 Greenhouse debe operar con estas reglas:

1. Ningún documento en `docs/api/*` es ya la source of truth arquitectónica principal de la plataforma; la arquitectura API canónica vive en `docs/architecture/`.
2. Nuevos contratos ecosystem-facing deben nacer en `api/platform/*`, no seguir engordando `integrations/v1` salvo compat o transición explícita.
3. Nuevos command endpoints de platform API deben soportar idempotencia.
4. Nuevos resources de platform API deben montarse sobre adapters shared por aggregate, no sobre proxies de rutas legacy.
5. `MCP` debe seguir siendo downstream de contratos API estables.
6. `BigQuery` puede seguir existiendo como backend transicional o analítico, pero no debe filtrarse como shape contractual del consumer.

---

## 22. Delta 2026-04-25 — Nace la arquitectura canónica de API platform

Se crea `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` como source of truth para la plataforma de APIs de Greenhouse.

Decisiones explícitas:

- `docs/api/GREENHOUSE_API_REFERENCE_V1.md` y `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md` quedan absorbidos por esta arquitectura a nivel canónico
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml` se conserva como artefacto machine-readable del carril vigente, no como spec arquitectónica superior
- la plataforma API correcta para Greenhouse debe nacer como capability shared nueva (`src/lib/api-platform/**` + `src/app/api/platform/**`)
- `integrations/v1` sigue vivo como lane legacy/transicional
- `MCP` queda reafirmado como adapter downstream de una API estable y no como punto de partida
