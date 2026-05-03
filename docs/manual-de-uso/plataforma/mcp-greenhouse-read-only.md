# MCP Greenhouse Read-Only

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-04-30 por Codex
> **Ultima actualizacion:** 2026-05-01 por Codex
> **Modulo:** plataforma / MCP
> **Ruta en portal:** `N/A` (server MCP local `stdio` o remoto HTTP)
> **Documentacion relacionada:** [API Platform Ecosystem](../../documentation/plataforma/api-platform-ecosystem.md), [Platform Health API](../../documentation/plataforma/platform-health-api.md), [GREENHOUSE_MCP_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md)

## Para que sirve

Este MCP permite que un agente o cliente compatible consulte Greenhouse de forma segura y read-only, usando contratos estables de `api/platform/ecosystem/*`.

No entra por SQL directo, no inventa tenancy y no necesita leer rutas internas del portal.

Hoy sirve para:

- confirmar el contexto efectivo del consumer y binding
- listar organizaciones visibles para ese scope
- leer una organización puntual
- listar capabilities visibles para ese scope
- revisar integration readiness
- consultar platform health
- leer el event control plane en modo consulta

## Modalidades disponibles

Greenhouse expone el mismo MCP read-only de dos formas:

- Local `stdio`: para clientes que pueden levantar un proceso local, usando `pnpm mcp:greenhouse`.
- Remoto HTTP: para clientes que necesitan una URL estable, usando `POST /api/mcp/greenhouse`.

Ambas modalidades comparten las mismas tools y el mismo cliente downstream. La diferencia es solo el transporte y el envelope de acceso.

## Antes de empezar

Necesitas estas variables de entorno:

- `GREENHOUSE_MCP_API_BASE_URL`
- `GREENHOUSE_MCP_CONSUMER_TOKEN`
- `GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE`
- `GREENHOUSE_MCP_EXTERNAL_SCOPE_ID`

Opcionales:

- `GREENHOUSE_MCP_API_VERSION`
- `GREENHOUSE_MCP_REQUEST_TIMEOUT_MS`
- `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN`
- `GREENHOUSE_MCP_REMOTE_MAX_BODY_BYTES`

Reglas importantes:

- el token debe ser de un `consumer` ecosystem válido
- el scope lo define `externalScopeType + externalScopeId`
- si apuntas a `staging` o `preview`, no asumas que basta con la URL; debes respetar el flujo operativo ya documentado para entornos protegidos
- el modo local usa `stdio`
- el modo remoto HTTP V1 es privado/service-to-service, no público ni self-service
- el modo remoto no reemplaza `TASK-659`: OAuth hosted/multiusuario sigue fuera de este corte

## Como levantarlo

### Modo local `stdio`

El entrypoint canónico es:

```bash
pnpm mcp:greenhouse
```

Si usas el registro local del repo, `.vscode/mcp.json` ya define el server `greenhouse/greenhouse-mcp-readonly` y te pedirá los inputs necesarios sin embutir secretos en el archivo.

### Modo remoto HTTP

El endpoint remoto canónico es:

```text
POST /api/mcp/greenhouse
GET /api/mcp/greenhouse
DELETE /api/mcp/greenhouse
```

Para conectarte desde un cliente MCP compatible con Streamable HTTP, usa la URL completa del ambiente y agrega:

```text
Authorization: Bearer <GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN>
```

El gateway remoto está deshabilitado si `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN` no existe. En ese caso responde como no configurado en vez de abrir una surface anónima.

El modo remoto V1 es stateless. Eso significa:

- no guarda sesiones MCP en memoria entre requests
- no mantiene estado por usuario
- no implementa OAuth, refresh tokens ni revocación multiusuario
- cada request vuelve a usar el runtime MCP compartido y el scope server-side configurado

Este diseño es intencional para V1: permite publicar una URL operable sin confundirla con hosted auth multiusuario.

## Que puede hacer hoy

### 1. Contexto y tenancy

- `get_context`

Úsala para confirmar:

- qué `consumer` quedó autenticado
- qué `binding` se resolvió
- qué scope Greenhouse quedó activo

Es la tool correcta antes de empezar a leer datos más sensibles.

### 2. Organizaciones

- `list_organizations`
- `get_organization`

Sirven para:

- listar organizaciones visibles para el binding actual
- buscar por filtros pequeños
- leer el detalle de una organización puntual

No sirven para saltarse el scope del binding.

### 3. Capabilities

- `list_capabilities`

Sirve para revisar asignaciones/catálogo de capabilities visibles dentro del scope resuelto.

### 4. Integraciones

- `get_integration_readiness`

Sirve para consultar readiness operacional de integraciones y bindings expuestos por la lane ecosystem.

### 5. Salud de plataforma

- `get_platform_health`

Sirve para:

- saber si la plataforma está `healthy`, `degraded`, `blocked` o `unknown`
- revisar `safeModes`
- ver si un agente debería leer, escribir, desplegar, notificar o automatizar
- consultar `recommendedChecks[]` antes de operar

Si `agentAutomationSafe` es `false`, el operador debe tratarlo como bloqueo operativo.

### 6. Event control plane en lectura

- `list_event_types`
- `list_webhook_subscriptions`
- `get_webhook_subscription`
- `list_webhook_deliveries`
- `get_webhook_delivery`

Sirven para:

- ver qué event types existen
- listar subscriptions del consumer/binding actual
- inspeccionar una subscription puntual
- listar deliveries
- revisar el detalle de un delivery puntual

## Que no puede hacer

Este MCP no hace lo siguiente:

- no crea subscriptions
- no actualiza subscriptions
- no reintenta deliveries
- no hace writes de ningún tipo
- no consulta rutas legacy como source primaria
- no expone OAuth hosted/multiusuario
- no expone ICO por MCP todavía
- no bypass-ea permisos, bindings ni rate limits

Si necesitas alguno de esos casos, eso ya vive en otra task o follow-up:

- OAuth / hosted auth: `TASK-659`
- ICO ecosystem surface antes de MCP: `TASK-648`
- write-safe MCP commands: follow-up posterior con historia explícita de idempotencia y auditoría

## Paso a paso recomendado

1. Configura las variables de entorno.
2. Levanta el server con `pnpm mcp:greenhouse`.
3. Ejecuta `get_context`.
4. Confirma que el scope resuelto es el esperado.
5. Usa solo las tools necesarias para tu caso.
6. Si vas a automatizar algo sensible, corre `get_platform_health` antes.
7. Si `safeModes` o el scope no son los esperados, detente antes de seguir.

## Que significan los limites del scope

El MCP no “adivina” acceso por nombre visible.

Todo request baja con:

- `Authorization: Bearer <consumer token>`
- `externalScopeType`
- `externalScopeId`
- `x-greenhouse-api-version`

Eso significa:

- si el binding no existe o no está activo, fallará
- si el recurso existe pero cae fuera del scope, fallará
- si el token no es válido, fallará

En modo remoto hay dos credenciales separadas:

- `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN`: protege el gateway HTTP frente al cliente MCP remoto.
- `GREENHOUSE_MCP_CONSUMER_TOKEN`: se usa server-side para llamar la API Platform Ecosystem.

No mezcles ambas. El gateway token no reemplaza al consumer token, y el consumer token no debe exponerse como secreto de usuario final.

## Problemas comunes

### El server no levanta

Revisa:

- que existan las variables `GREENHOUSE_MCP_*`
- que `GREENHOUSE_MCP_API_BASE_URL` no termine con errores de path o protocolo
- que `GREENHOUSE_MCP_CONSUMER_TOKEN` no esté vacío

### El endpoint remoto responde que no está configurado

Revisa:

- que `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN` exista en el ambiente
- que el cliente envíe `Authorization: Bearer <token>`
- que no estés intentando usar el custom domain de staging sin el bypass operacional de Vercel cuando aplique

### El request falla por timeout

El client usa timeout configurable.

Revisa:

- conectividad al ambiente objetivo
- si el target está protegido o inaccesible
- si necesitas subir `GREENHOUSE_MCP_REQUEST_TIMEOUT_MS`

No subas el timeout a ciegas si el problema real es auth o networking.

### El request devuelve error de auth

Revisa:

- token correcto
- token vigente
- que el consumer corresponda al carril ecosystem

### El request devuelve error de scope

Revisa:

- `GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE`
- `GREENHOUSE_MCP_EXTERNAL_SCOPE_ID`
- que exista un binding activo entre ese scope externo y Greenhouse

### `get_platform_health` devuelve payload inválido

Eso indica drift del contrato downstream. El MCP valida `platform-health.v1` antes de responder `ok`.

Acción recomendada:

1. revisar el cambio reciente en `api/platform/ecosystem/health`
2. revisar la documentación de `Platform Health API`
3. tratarlo como incompatibilidad de contrato y no como “warning menor”

## Que no hacer

- no usar este MCP como sustituto de un diseño OAuth hosted
- no hardcodear tokens en archivos versionados
- no asumir que una tool de lectura autoriza luego un write manual
- no mezclar este MCP con scripts SQL ad hoc para “completar” acceso
- no usarlo como bypass de API Platform
- no publicar el gateway remoto como API anónima ni como OAuth multiusuario improvisado

## Referencias tecnicas

- Runtime MCP: [src/mcp/greenhouse](../../../src/mcp/greenhouse)
- Entry point: [scripts/run-greenhouse-mcp.ts](../../../scripts/run-greenhouse-mcp.ts)
- Gateway remoto: [src/app/api/mcp/greenhouse/route.ts](../../../src/app/api/mcp/greenhouse/route.ts)
- Lane ecosystem: [docs/documentation/plataforma/api-platform-ecosystem.md](../../documentation/plataforma/api-platform-ecosystem.md)
- Platform health: [docs/documentation/plataforma/platform-health-api.md](../../documentation/plataforma/platform-health-api.md)
