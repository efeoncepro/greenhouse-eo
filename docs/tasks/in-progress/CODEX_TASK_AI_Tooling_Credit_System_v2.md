# CODEX TASK — AI Tooling & Credit System: Runtime Backend Foundation (v2)

## Resumen

Esta task ya no debe tratarse como brief greenfield puro. La `v2` asume la arquitectura 360 vigente, formaliza `Provider` como relación canónica reusable y congela la primera capa backend real para que Claude implemente frontend sobre contratos estables.

Objetivo de esta v2:
- cerrar la foundation backend de AI Tooling, licencias y créditos
- dejar listas las superficies de cliente, operador y admin
- evitar que frontend invente catálogo, ownership o lógica de consumo/costos

## Estado real del módulo

### No existía como runtime real

Antes de esta v2, el repo no tenía un backend operativo de AI Tooling comparable a Finance, Payroll o Admin Team:
- no existían tablas runtime propias para catálogo, licencias, wallets y ledger
- no existían endpoints de lectura/escritura para créditos o tooling
- `Provider` ya estaba decidido a nivel arquitectura, pero no había implementación mínima en runtime

### Resultado del contraste con arquitectura

Esta task fue contrastada contra:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

Conclusión:
- la task sí está alineada si se implementa como extensión de objetos canónicos existentes
- `Client` sigue anclado a `greenhouse.clients.client_id`
- `Collaborator` sigue anclado a `greenhouse.team_members.member_id`
- `Provider` queda formalizado en runtime bajo `greenhouse.providers.provider_id`
- `ai_tool_catalog`, `member_tool_licenses`, `ai_credit_wallets` y `ai_credit_ledger` son tablas de dominio, no identidades paralelas
- `fin_suppliers` se mantiene como extensión financiera opcional de un `provider_id`, no como identidad global del vendor

## Backend activo cerrado en esta v2

### Infraestructura runtime on-demand

Se agregó `ensureAiToolingInfrastructure()` en:
- `src/lib/ai-tools/schema.ts`

Provisiona on-demand:
- `greenhouse.providers`
- `greenhouse.ai_tool_catalog`
- `greenhouse.member_tool_licenses`
- `greenhouse.ai_credit_wallets`
- `greenhouse.ai_credit_ledger`

Reglas implementadas:
- montos y costos en `NUMERIC`
- seed mínimo de providers canónicos
- seed mínimo de catálogo de herramientas reales
- bootstrap idempotente siguiendo el patrón de Payroll y Finance

Además se dejó SQL versionado en:
- `scripts/setup-ai-tooling-tables.sql`

### Capa de servicio

Se agregó la capa server-side:
- `src/lib/ai-tools/shared.ts`
- `src/lib/ai-tools/service.ts`
- `src/types/ai-tools.ts`

Responsabilidades ya cubiertas:
- validación y normalización de inputs
- resolución de viewer:
  - `client`
  - `operator`
  - `admin`
- discovery de metadata admin
- catálogo de herramientas
- licencias por miembro
- wallets por cliente o pool
- ledger de créditos
- consumo idempotente por `requestId`
- recarga idempotente opcional por `requestId`
- resumen por cliente/admin con corte por período

### Endpoints activos

#### Operación / People

- `GET /api/ai-tools/catalog`
- `GET /api/ai-tools/licenses`

#### Créditos cliente/operación/admin

- `GET /api/ai-credits/wallets`
- `GET /api/ai-credits/ledger`
- `GET /api/ai-credits/summary`
- `POST /api/ai-credits/consume`
- `POST /api/ai-credits/reload`

#### Admin

- `GET /api/admin/ai-tools/meta`
- `GET/POST /api/admin/ai-tools/catalog`
- `GET/PATCH /api/admin/ai-tools/catalog/[toolId]`
- `GET/POST /api/admin/ai-tools/licenses`
- `GET/PATCH /api/admin/ai-tools/licenses/[licenseId]`
- `GET/POST /api/admin/ai-tools/wallets`
- `GET/PATCH /api/admin/ai-tools/wallets/[walletId]`

## Contrato operativo por audiencia

### Cliente

Puede consumir:
- `GET /api/ai-credits/wallets`
- `GET /api/ai-credits/ledger?walletId=...`
- `GET /api/ai-credits/summary`

Restricciones server-side:
- solo ve wallets con su `client_id`
- no ve pools internos
- no ve costos monetarios

### Operador

Puede consumir:
- `GET /api/ai-tools/catalog`
- `GET /api/ai-tools/licenses`
- `GET /api/ai-credits/wallets`
- `GET /api/ai-credits/ledger`
- `GET /api/ai-credits/summary`
- `POST /api/ai-credits/consume`
- `POST /api/ai-credits/reload`

Reglas:
- puede ver wallets de clientes y pool
- no ve costos monetarios en respuestas de wallet/ledger
- puede registrar consumo atribuible a `member_id` y opcionalmente a `client_id`, `notionTaskId` o `projectName`

### Admin

Puede consumir toda la superficie anterior y además:
- `GET /api/admin/ai-tools/meta`
- catálogo CRUD básico
- licencias CRUD básico
- wallets CRUD básico

Beneficios del contrato admin:
- metadata para formularios sin enums hardcodeados
- proveedores canónicos activos
- proveedores financieros activos para `finSupplierId`
- clientes activos
- miembros activos
- enums de categoría, cost model, access level, wallet scope, wallet status y reload reason

## Payloads ejemplo para frontend

### 1. Crear herramienta

`POST /api/admin/ai-tools/catalog`

```json
{
  "toolId": "sora-enterprise",
  "toolName": "Sora Enterprise",
  "providerId": "openai",
  "vendor": "OpenAI",
  "toolCategory": "gen_video",
  "toolSubcategory": "video generation",
  "costModel": "per_credit",
  "creditUnitName": "render",
  "creditUnitCost": 3.9,
  "creditUnitCurrency": "USD",
  "description": "Modelo de video para producción creativa"
}
```

### 2. Asignar licencia a colaborador

`POST /api/admin/ai-tools/licenses`

```json
{
  "memberId": "member-camila-rivera",
  "toolId": "chatgpt-team",
  "accessLevel": "full",
  "accountEmail": "camila@efeonce.com",
  "notes": "Seat de estrategia y prompting"
}
```

### 3. Crear wallet cliente

`POST /api/admin/ai-tools/wallets`

```json
{
  "walletScope": "client",
  "clientId": "sky-airline",
  "toolId": "kling-v2",
  "initialBalance": 120,
  "monthlyLimit": 80,
  "monthlyResetDay": 1,
  "lowBalanceThreshold": 20,
  "validFrom": "2026-03-01",
  "validUntil": "2026-03-31",
  "notes": "Wallet marzo campaña performance"
}
```

### 4. Registrar consumo

`POST /api/ai-credits/consume`

```json
{
  "requestId": "kling-sky-marzo-asset-014",
  "walletId": "client_sky-airline_kling-v2",
  "creditAmount": 3,
  "consumedByMemberId": "member-benjamin-ruiz",
  "notionTaskId": "task-89ab",
  "projectName": "Sky performance marzo",
  "assetDescription": "Cutdown vertical 9:16 variación B",
  "notes": "Generación final aprobada"
}
```

### 5. Registrar recarga

`POST /api/ai-credits/reload`

```json
{
  "requestId": "reload-sky-kling-marzo-extra-01",
  "walletId": "client_sky-airline_kling-v2",
  "creditAmount": 25,
  "reloadReason": "purchase",
  "reloadReference": "OC-IA-2026-031",
  "notes": "Compra adicional por extensión de campaña"
}
```

## Qué ya no debe reinventar Claude en frontend

- no crear catálogo paralelo de tools
- no hardcodear providers como texto libre cuando el backend ya entrega `providerId`
- no recalcular balances o consumo mensual desde tablas locales
- no exponer costos al cliente aunque el admin sí los vea
- no inventar enums para forms si `GET /api/admin/ai-tools/meta` ya los entrega

## QA runtime 2026-03-15 — frontend + flujos activos

### Flujos mapeados

- dashboard admin:
  - tabs de catálogo, licencias, wallets y consumo
- catálogo:
  - alta
  - edición
- licencias:
  - listado
  - asignación
- wallets:
  - alta
  - recarga
  - edición
- consumo:
  - ledger
  - registro manual de débito

### Estado verificado en esta pasada QA

- `AI Tooling` ya tiene operables los flujos admin más importantes:
  - alta/edición de catálogo
  - asignación de licencias
  - alta/edición/recarga de wallets
  - registro de consumo
- durante esta pasada no apareció un bloqueo frontend adicional comparable en `AI Tooling`
- falta smoke autenticado con datos reales para validar permisos y persistencia end-to-end

## Fuera de alcance de esta v2

- writeback automático a `fin_expenses`
- facturación automática al cliente por consumo IA
- reservas avanzadas (`reserve` / `release`) con workflow UI completo
- integración writeback directa con Notion ICO
- surface frontend completa dentro de dashboard cliente, `/people` o `/finance`

## Siguiente paso para Claude

Claude puede construir frontend sobre esta base en tres superficies:

1. Admin AI Tooling
- catálogo
- licencias
- wallets
- formularios apoyados en `GET /api/admin/ai-tools/meta`

2. People
- tab read-only de herramientas/licencias por `memberId`
- consumo atribuido por persona usando `GET /api/ai-tools/licenses?memberId=...`

3. Dashboard cliente
- wallet cards
- consumo reciente
- resumen mensual usando:
  - `GET /api/ai-credits/wallets`
  - `GET /api/ai-credits/ledger`
  - `GET /api/ai-credits/summary`
