# API Platform Ecosystem

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-25 por Codex (TASK-616 follow-up)
> **Ultima actualizacion:** 2026-04-25 por Codex (TASK-616 follow-up)
> **Documentacion tecnica:** [GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md)

---

## Que es

La API Platform Ecosystem es la nueva capa de APIs externas y machine-to-machine de Greenhouse.

En simple:

- no reemplaza las rutas internas del portal
- no reemplaza todavía el carril legacy `/api/integrations/v1/*`
- crea una lane nueva, más ordenada y más estable, para consumers del ecosistema

La idea es que Greenhouse deje de exponer contratos externos como una suma de rutas aisladas y pase a operar una capa shared con reglas uniformes.

## Para que sirve

Sirve para tres cosas:

1. exponer lecturas ecosystem-facing con contrato más estable
2. resolver tenancy y contexto de forma segura
3. dejar una base reutilizable para futuros writes, webhooks y adapters MCP

No es una API pública abierta. Hoy es una lane controlada, autenticada y binding-aware.

## Como funciona hoy

Hoy la foundation nueva ya existe en el runtime:

- `src/lib/api-platform/core/*`
- `src/lib/api-platform/resources/*`
- `src/app/api/platform/ecosystem/*`

La lane inicial expone estos endpoints:

- `GET /api/platform/ecosystem/context`
- `GET /api/platform/ecosystem/organizations`
- `GET /api/platform/ecosystem/organizations/:id`
- `GET /api/platform/ecosystem/capabilities`
- `GET /api/platform/ecosystem/integration-readiness`

Todos funcionan con el mismo patrón:

1. autentican al consumer
2. resuelven el binding activo
3. validan el scope permitido
4. aplican rate limiting
5. dejan request logging
6. responden con un envelope uniforme

## Que significa cada endpoint

### Context

`/context` devuelve el contexto efectivo del consumer autenticado.

Eso incluye:

- quién es el consumer
- qué binding se resolvió
- qué scope Greenhouse quedó activo

Este endpoint sirve para confirmar que el consumer está apuntando al tenant correcto antes de consumir recursos más específicos.

### Organizations

`/organizations` y `/organizations/:id` exponen lecturas de organizaciones sobre el read model canónico de Postgres.

La lane nueva no inventa otro modelo organizacional:

- reutiliza readers maduros
- filtra por el scope resuelto del binding
- devuelve un contrato ecosystem-facing, no un payload improvisado de UI

### Capabilities

`/capabilities` en esta V1 significa catálogo y asignación de tenant capabilities.

No significa:

- runtime data de módulos UI
- snapshots completos de cada capability del portal
- entitlements finos de vistas internas

La idea de esta surface es mostrar qué capacidades tiene activas el tenant o cliente dentro del scope resuelto.

###+ Integration Readiness

`/integration-readiness` expresa health y readiness de integraciones y bindings.

No pretende ser una “readiness total de la plataforma”.

Hoy esta surface responde preguntas como:

- la integración existe en el registry
- está pausada o bloqueada
- su health operativo está sano o degradado

## Como resuelve seguridad y tenancy

La lane ecosystem no adivina tenancy por nombre visible ni por etiquetas comerciales.

Resuelve tenancy con el mismo modelo duro del carril de sister platforms:

- consumer credential dedicada
- `externalScopeType`
- `externalScopeId`
- binding activo
- scope Greenhouse resuelto

Eso permite trabajar con estos niveles:

1. `organization`
2. `client`
3. `space`
4. `internal`

Aprendizaje importante:

la isolation ya no debe describirse como “siempre por `space_id`”.

En esta lane la isolation correcta es por scope resuelto. A veces eso termina en `space`, pero otras veces el anchor correcto es `client`, `organization` o `internal`.

## Que envelope usa

La lane nueva responde con un envelope uniforme.

En una respuesta exitosa, el consumer recibe:

- `requestId`
- `servedAt`
- `version`
- `data`
- `meta`

En un error, recibe:

- `requestId`
- `servedAt`
- `version`
- `data: null`
- `errors`
- `meta`

Además, los headers operativos incluyen:

- `x-greenhouse-request-id`
- `x-greenhouse-api-version`
- headers de rate limit
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
  - `Retry-After` cuando una respuesta queda en `429`
- `ETag` y, cuando existe una fecha confiable de actualización, `Last-Modified`

La versión inicial por default es:

- `2026-04-25`

## Paginación y frescura

Las colecciones del carril ecosystem exponen paginación uniforme.

Hoy aplica a:

- `GET /api/platform/ecosystem/organizations`
- `GET /api/platform/ecosystem/capabilities`

El consumer puede enviar:

- `page`
- `pageSize`

La respuesta mantiene compatibilidad con `data.page`, `data.pageSize`, `data.count` e `data.items`, y además declara el contrato más estable en:

- `meta.pagination.page`
- `meta.pagination.pageSize`
- `meta.pagination.total`
- `meta.pagination.count`
- `meta.pagination.hasNextPage`
- `meta.pagination.nextPage`
- `meta.pagination.hasPreviousPage`
- `meta.pagination.previousPage`

Cuando existe página siguiente o anterior, la respuesta también incluye `Link` headers.

La frescura se declara en `meta.freshness`. Los resources que pueden calcular un validator seguro responden con `ETag`; cuando la fuente tiene timestamp confiable también responden con `Last-Modified`. Los consumers pueden usar:

- `If-None-Match`
- `If-Modified-Since`

Si no hay cambios, Greenhouse responde `304 Not Modified`.

## Como convive con el carril legacy

La API platform nueva no rompe el carril actual.

Hoy conviven dos familias:

- carril legacy/transicional:
  - `/api/integrations/v1/*`
  - `/api/integrations/v1/sister-platforms/*`
- carril nuevo:
  - `/api/platform/ecosystem/*`

La regla actual es:

- lo legacy sigue funcionando
- lo nuevo nace en `api/platform/*`
- la convergencia se hace de forma aditiva, no con renombres bruscos

Eso evita romper consumers existentes mientras la lane nueva madura.

## Que esta robusto hoy

Ya hay varias piezas sanas:

- auth binding-aware
- rate limiting por consumer
- remaining/reset headers para rate limiting
- request logging
- version header
- envelope uniforme
- paginación uniforme en colecciones ecosystem principales
- conditional requests selectivas con `ETag` / `Last-Modified`
- resources montados sobre readers reales del repo
- coexistencia explícita con `integrations/v1`

Además, este primer corte ya fue verificado con:

- tests nuevos de la foundation y del hardening REST
- route contract tests de `api/platform/ecosystem/*`
- tests de no-regresión de `/api/integrations/v1/*`
- tests heredados de readers reutilizados
- `tsc`
- `lint`
- `build`

## Que todavia no hace

Todavía no hace estas cosas:

- writes ecosystem-facing
- idempotencia runtime de commands
- webhooks outbound específicos de esta lane
- MCP downstream
- una API pública abierta
- migración total de todos los recursos legacy al carril nuevo

Tampoco intenta resolver todos los dominios del portal en V1. El primer slice está enfocado en recursos suficientemente maduros.

## Que sigue

El siguiente paso sano no es abrir “más endpoints porque sí”.

Lo razonable ahora es seguir este orden:

1. endurecer la foundation
2. validar adopción controlada por consumers reales
3. recién después abrir writes o MCP

En términos concretos, lo siguiente debería ser:

### 1. Hardening del harness

- separar mejor logging de plataforma vs logging legacy si hace falta
- agregar observabilidad más explícita de degraded modes y provenance
- definir códigos de error y metadata operativa más finos

### 2. Resources más sólidos

- fortalecer `capabilities` con un adapter más claramente canónico si hoy depende de una proyección transicional
- evaluar si `people` ya está suficientemente maduro para una lane ecosystem
- documentar relaciones de convivencia endpoint viejo ↔ endpoint nuevo

### 3. Commands seguros

- abrir writes pequeños y auditables
- exigir idempotency key
- no mezclar command semantics con reads informales

### 4. Eventing y downstream

- webhooks o delivery contracts donde tenga sentido
- MCP encima de esta lane, no directo sobre rutas legacy o readers ad hoc

## Como robustecerla sin romper nada

La regla de oro ya quedó validada en TASK-616:

- cambio aditivo primero
- refactor compartido profundo después, si sigue valiendo la pena

Para robustecer sin romper, Greenhouse debería mantener estas reglas:

1. No mover `/api/integrations/v1/*` mientras tenga consumers activos.
2. No convertir `api/platform/ecosystem/*` en proxy del carril legacy.
3. No mezclar en la misma iteración reads, writes y MCP.
4. No esconder dependencias transicionales; si un adapter depende de una proyección legacy, documentarlo explícitamente.
5. Verificar siempre no-regresión con tests, `lint`, `tsc`, `build` y smoke checks del carril legacy.

## Cuando usar esta lane y cuando no

Usar `api/platform/ecosystem/*` cuando:

- el consumer es ecosystem-facing
- se necesita un contrato más estable
- el recurso ya tiene semántica suficientemente madura

No usarla todavía cuando:

- el caso es puramente interno del portal
- el recurso todavía está demasiado acoplado a UI o a backend híbrido inestable
- el caso requiere un command mutativo que aún no tiene contrato idempotente y auditable

## Resumen corto

Hoy Greenhouse ya tiene una API platform real, pero todavía en V1 temprana.

Lo importante no es que ya exista una carpeta nueva. Lo importante es que ya existe una forma canónica de crecer:

- lane nueva
- auth segura
- tenancy por binding
- envelope uniforme
- recursos seleccionados
- convivencia sin romper legacy

Ese es el piso correcto para que después lleguen writes seguros, eventos y MCP sin rehacer todo desde cero.
