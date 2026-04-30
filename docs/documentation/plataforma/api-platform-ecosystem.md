# API Platform Ecosystem

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-04-25 por Codex (TASK-616 follow-up)
> **Ultima actualizacion:** 2026-04-30 por Codex (TASK-647 MCP read-only runtime V1)
> **Documentacion tecnica:** [GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md)

---

## Que es

La API Platform Ecosystem es la nueva capa de APIs externas, machine-to-machine y first-party app de Greenhouse.

En simple:

- no reemplaza las rutas internas del portal
- no reemplaza todavía el carril legacy `/api/integrations/v1/*`
- crea lanes más ordenadas y estables para consumers del ecosistema y para clients first-party como la futura app móvil

La idea es que Greenhouse deje de exponer contratos externos como una suma de rutas aisladas y pase a operar una capa shared con reglas uniformes.

## Lanes Actuales

Hoy existen dos lanes:

- `ecosystem`: server-to-server, machine-to-machine, autenticada con consumer credentials y binding.
- `app`: first-party user-authenticated, pensada para mobile y futuros clients propios no web.

La regla importante:

- `ecosystem` no representa a un usuario final.
- `app` sí representa a un usuario autenticado de Greenhouse.

## Para que sirve

Sirve para tres cosas:

1. exponer lecturas ecosystem-facing con contrato más estable
2. resolver tenancy y contexto de forma segura
3. servir a la futura app React Native sin acoplarla a rutas web internas
4. dejar una base reutilizable para futuros writes, webhooks y adapters MCP

No es una API pública abierta. Hoy es una lane controlada, autenticada y binding-aware.

## Relacion con MCP

Esta lane es la base oficial del primer MCP server de Greenhouse.

La regla importante para `TASK-647` y sus follow-ups es:

- el MCP oficial va downstream de `api/platform/ecosystem/*`
- la V1 inicial es `read-only`
- no debe leer SQL directo
- no debe saltarse auth, scope, request logging ni rate limits del carril ecosystem
- cualquier write futuro por MCP queda bloqueado hasta que exista command policy e idempotencia transversal

Hoy ese MCP base ya existe como runtime local en:

- `src/mcp/greenhouse/*`
- `scripts/run-greenhouse-mcp.ts`
- `pnpm mcp:greenhouse`

La V1 expone cinco tools read-only:

- `get_context`
- `list_organizations`
- `get_organization`
- `list_capabilities`
- `get_integration_readiness`

## Como funciona hoy

Hoy la foundation nueva ya existe en el runtime:

- `src/lib/api-platform/core/*`
- `src/lib/api-platform/resources/*`
- `src/app/api/platform/ecosystem/*`
- `src/app/api/platform/app/*`

La lane inicial expone estos endpoints de lectura:

- `GET /api/platform/ecosystem/context`
- `GET /api/platform/ecosystem/organizations`
- `GET /api/platform/ecosystem/organizations/:id`
- `GET /api/platform/ecosystem/capabilities`
- `GET /api/platform/ecosystem/integration-readiness`

Ademas, ya existe una extension downstream inmediata:

- `GET /api/platform/ecosystem/health`

`health` ya esta disponible como contrato ecosystem-facing, pero no necesita inflar la surface minima del MCP read-only V1. Puede agregarse como tool hermana (`get_platform_health`) sobre el mismo cliente downstream cuando convenga.

También expone el plano de control de eventos:

- `GET /api/platform/ecosystem/event-types`
- `GET /api/platform/ecosystem/webhook-subscriptions`
- `POST /api/platform/ecosystem/webhook-subscriptions`
- `GET /api/platform/ecosystem/webhook-subscriptions/:id`
- `PATCH /api/platform/ecosystem/webhook-subscriptions/:id`
- `GET /api/platform/ecosystem/webhook-deliveries`
- `GET /api/platform/ecosystem/webhook-deliveries/:id`
- `POST /api/platform/ecosystem/webhook-deliveries/:id/retry`

Todos funcionan con el mismo patrón:

1. autentican al consumer
2. resuelven el binding activo
3. validan el scope permitido
4. aplican rate limiting
5. dejan request logging
6. responden con un envelope uniforme

La lane `app` expone:

- `POST /api/platform/app/sessions`
- `PATCH /api/platform/app/sessions`
- `DELETE /api/platform/app/sessions/current`
- `GET /api/platform/app/context`
- `GET /api/platform/app/home`
- `GET /api/platform/app/notifications`
- `POST /api/platform/app/notifications/:id/read`
- `POST /api/platform/app/notifications/mark-all-read`

Estos endpoints usan el mismo envelope y versionado de la API Platform.

## Como autentica la app

La app no usa tokens de ecosystem.

El flujo base es:

1. la app envía email/password a `POST /api/platform/app/sessions`
2. Greenhouse valida al usuario contra Identity Access
3. se crea una sesión en `greenhouse_core.first_party_app_sessions`
4. la app recibe un access token corto y un refresh token
5. cada refresh rota el refresh token y mantiene solo su hash en base de datos
6. la app puede revocar la sesión actual con `DELETE /api/platform/app/sessions/current`

Cada request rehidrata el acceso vigente del usuario. Esto evita depender por demasiado tiempo de permisos embebidos en un token viejo.

## Recursos app iniciales

### App Context

`/api/platform/app/context` devuelve:

- usuario técnico
- tenant efectivo
- `routeGroups`
- `authorizedViews`
- `portalHomePath`
- módulos visibles
- entitlements efectivos

La respuesta separa dos planos:

- `views`: para superficies visibles y navegación
- `entitlements`: para capacidades y acciones disponibles

### App Home

`/api/platform/app/home` reutiliza el snapshot de Home, pero lo sirve dentro del envelope/versionado de API Platform.

La app debe consumir este endpoint, no `/api/home/snapshot`.

### Notifications

`/api/platform/app/notifications` devuelve notificaciones in-app del usuario autenticado con paginación.

Los writes permitidos son acotados:

- marcar una notificación como leída
- marcar todas las notificaciones como leídas

## Event control plane

El plano de eventos permite administrar subscriptions y observar deliveries sin usar directamente el transport raw de webhooks.

La separación es intencional:

- `/api/webhooks/*` recibe llamadas HTTP reales de proveedores externos.
- `/api/cron/webhook-dispatch` ejecuta la entrega real de eventos pendientes.
- `/api/platform/ecosystem/webhook-*` administra recursos y comandos del plano de control.

Cada subscription creada desde la API Platform queda asociada al consumer autenticado y al binding resuelto. Por eso un consumer solo puede listar, modificar o reintentar deliveries de sus propias subscriptions.

El command de retry no envía el webhook en la misma request. Reprograma el delivery para que el dispatcher existente lo procese con la misma política de firma, timeout, attempts y dead-letter.

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

### Integration Readiness

`/integration-readiness` expresa health y readiness de integraciones y bindings.

No pretende ser una “readiness total de la plataforma”.

Hoy esta surface responde preguntas como:

- la integración existe en el registry
- está pausada o bloqueada
- su health operativo está sano o degradado

### Health

`/health` ya existe como surface ecosystem-facing de platform health.

Su uso correcto en este momento es:

- health operativo de la plataforma
- diagnostico downstream para agentes y consolas
- extension inmediata del MCP read-only, no requisito de la surface minima base

No debe confundirse con:

- readiness de una integración particular
- writes de control plane
- bypass de observabilidad interna

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

La versión inicial por default es:

- `2026-04-25`

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
- request logging
- version header
- envelope uniforme
- resources montados sobre readers reales del repo
- event control plane para subscriptions, deliveries y retry
- lane first-party `app` para sesiones, Home y notificaciones mobile-safe
- coexistencia explícita con `integrations/v1`

Además, este primer corte ya fue verificado con:

- tests nuevos de la foundation
- tests heredados de readers reutilizados
- `tsc`
- `lint`
- `build`

## Que todavia no hace

Todavía no hace estas cosas:

- writes ecosystem-facing amplios de dominio
- idempotencia runtime de commands
- generacion automatica de OpenAPI desde schemas runtime
- MCP write-safe o surfaces MCP más amplias que el slice read-only V1
- una API pública abierta
- migración total de todos los recursos legacy al carril nuevo

Si existe un command en V1, como crear/editar subscriptions o reprogramar un retry,
debe leerse como command acotado de control plane. No equivale a una superficie
general de writes para recursos de negocio.

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
- MCP read-only encima de esta lane, no directo sobre rutas legacy o readers ad hoc
- extension corta con `platform health` sobre el mismo cliente downstream antes de abrir writes o tools más libres

## Registro local MCP read-only V1

Para desarrollo local, el repo ya puede registrar un server MCP Greenhouse apuntando al entrypoint esperado `pnpm mcp:greenhouse`.

La configuracion local esperada usa estas env vars:

- `GREENHOUSE_MCP_API_BASE_URL`
- `GREENHOUSE_MCP_CONSUMER_TOKEN`
- `GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE`
- `GREENHOUSE_MCP_EXTERNAL_SCOPE_ID`

Reglas operativas:

- no versionar secrets ni tokens en `.vscode/mcp.json`
- usar `input/prompt` o env inyectado por el operador local
- tratar `GREENHOUSE_MCP_CONSUMER_TOKEN` como secreto
- no inventar consumers nuevos a ciegas solo para probar el MCP
- si el target es `staging` o `preview`, respetar el flujo operativo de bypass SSO ya documentado para requests programaticos

La V1 read-only esperada del MCP debe exponer un set chico de tools:

- `get_context`
- `list_organizations`
- `get_organization`
- `list_capabilities`
- `get_integration_readiness`

`get_platform_health` queda reconocido como extension downstream inmediata porque el endpoint ya existe hoy, pero no necesita crecer junto con la surface minima inicial.

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
