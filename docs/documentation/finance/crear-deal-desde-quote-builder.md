# Crear Deal desde el Cotizador — Sin salir a HubSpot

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-04-21 por Claude (Opus 4.7) — TASK-539
> **Ultima actualizacion:** 2026-04-22 por Claude — TASK-571 (governance de pipeline/stage)
> **Documentacion tecnica:**
> - Task: [TASK-539](../../tasks/complete/TASK-539-inline-deal-creation-quote-builder.md)
> - Spec tecnica: [GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1 § Delta Fase E](../../architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md)
> - Programa paraguas: [TASK-534](../../tasks/to-do/TASK-534-commercial-party-lifecycle-program.md)
> - Docs relacionadas: [Ciclo de Vida de Parties Comerciales](./ciclo-de-vida-party-comercial.md) · [Cotizador](./cotizador.md) · [Sincronizacion de Facturas a HubSpot](./sincronizacion-facturas-hubspot.md)

## Que problema resuelve

Antes, si querias cotizar a una empresa que aun no tenia un deal asociado en HubSpot, el operador comercial tenia que:

1. Pausar el cotizador.
2. Abrir HubSpot en otra pestana.
3. Crear el deal ahi.
4. Esperar a que el sync de Greenhouse detectara el nuevo deal.
5. Volver al cotizador y refrescar.

Eran minutos perdidos por cada cotizacion nueva, con riesgo real de duplicar empresas por typos o re-trabajo.

Ahora puedes crear el deal **desde el mismo cotizador**, en un drawer minimalista, sin cambiar de pestana.

## Como funciona

### El flujo desde el punto de vista del operador

1. Estas cotizando una oportunidad y el selector de deal aparece vacio (no hay deals asociados a la organization).
2. En el footer del popover del chip Deal aparece "¿No encontrás el deal que buscás?" con el CTA "Crear deal nuevo".
3. Click → se abre un drawer a la derecha con 5 campos: **nombre del deal**, **pipeline**, **etapa inicial**, **monto estimado**, **moneda**.
4. El drawer lee `GET /api/commercial/organizations/:id/deal-creation-context` para precargar pipeline + etapa con los defaults gobernados. Si la etapa es la sugerida por política, el helper text lo dice.
5. Completas los campos y presionas "Crear deal y asociar".
6. El sistema:
   - Valida que `pipelineId ↔ stageId` sean coherentes contra el registry local. Etapas cerradas o no seleccionables son rechazadas con `DEAL_CREATE_SELECTION_INVALID` (HTTP 422).
   - Crea el deal en HubSpot (via Cloud Run service) pasándole pipeline + stage + owner resueltos.
   - Lo refleja en `greenhouse_commercial.deals` usando el `pipelineUsed` / `stageUsed` que el servicio devuelve (o los elegidos si no hubo override).
   - Si la organization estaba en `prospect`, la promueve automaticamente a `opportunity`.
   - Asocia el nuevo deal a la cotizacion que estas editando.
7. Toast de confirmacion + el selector se actualiza con el nuevo deal usando `pipelineLabelUsed` / `stageLabelUsed` reales (sin el fallback a `appointmentscheduled` que existia en la version 1.0).

### Que pasa bajo el capo

| Step | Que hace el sistema |
|---|---|
| Validacion | Rechaza si no hay organization o nombre de deal vacio. |
| Idempotencia | Si el cliente reintenta con el mismo `idempotencyKey`, retorna el resultado anterior (no duplica). |
| Fingerprint dedupe | Sin idempotency key explicita, el sistema detecta doble-click (mismo actor + misma company + mismo nombre, 5 min) y reutiliza el intento. |
| Rate limit | Maximo 20 deals/minuto por usuario, 100 deals/hora por tenant. Exceso retorna HTTP 429 con `Retry-After`. |
| Threshold de aprobacion | Si el monto supera $50M CLP, el deal **NO** se crea automaticamente. Se persiste como `pending_approval` y se emite un evento para que el Sales Lead lo revise. |
| Cloud Run POST | Llama al service `hubspot-greenhouse-integration` con el payload. Timeout 4s, auth OIDC. |
| Transaction atomica | Insert en `deals` + `promoteParty` + emit eventos → todo en una sola transaccion. Si algo falla, nada se persiste. |
| Trazabilidad | Cada intento (exitoso o fallido) queda en `deal_create_attempts` con status, error, contador de reintentos. Soporte puede reconstruir exactamente que paso. |

## Los 6 estados de cada intento

| Estado | Significa |
|---|---|
| `pending` | El intento esta en vuelo (corto — solo durante la transaccion). |
| `completed` | Deal creado en HubSpot y mirror en Greenhouse. |
| `pending_approval` | Monto > $50M CLP: aprobacion necesaria. No se llamo a HubSpot aun. |
| `rate_limited` | Rechazado por rate limit; no se creo el deal. |
| `failed` | Cloud Run respondio error (5xx, timeout). El intento queda registrado con el mensaje de error; el usuario puede reintentar. |
| `endpoint_not_deployed` | La ruta `/deals` en Cloud Run aun no esta desplegada. El intento queda registrado para replay cuando el deploy aterrice. |

## Valores por defecto (TASK-571)

El drawer pide pipeline + stage explícitamente y los precarga con los defaults que gobierna Greenhouse. La resolución sigue este orden:

| Señal | Prioridad |
|---|---|
| Override por tenant (`scope='tenant'`, `scope_key='<tenantScope>'`) | 1 — gana |
| Override por business line (`scope='business_line'`, `scope_key='<businessLineCode>'`) | 2 |
| Default global (`scope='global'`, `scope_key='__global__'`) | 3 |
| Único pipeline activo en el registry | 4 |
| Primer pipeline activo ordenado por `pipeline_display_order` | 5 |

Dentro del pipeline elegido, la stage default se resuelve así:

| Señal | Prioridad |
|---|---|
| Policy stage override (tenant/BU/global) | 1 |
| Stage marcada `is_default_for_create = TRUE` | 2 |
| Única stage `is_open_selectable = TRUE` | 3 |
| Primera stage `is_open_selectable = TRUE` ordenada por `stage_display_order` | 4 |

Otros defaults del drawer:

| Campo | Default |
|---|---|
| Owner | HubSpot user id del actor; fallback al `owner_hubspot_user_id` del default policy si existe. |
| Currency | La misma que el cotizador tiene seleccionada. |
| Nombre | Pre-rellenado como "{nombre de la empresa} — Nuevo deal" para acelerar. |

### Ownership del registry

- **HubSpot** es source of truth de qué pipelines y stages existen. El sync inbound alimenta `greenhouse_crm.deals`, que a su vez bootstrappea `hubspot_deal_pipeline_config` cuando aparecen combinaciones nuevas.
- **Greenhouse** es source of truth de la governance operativa: labels legibles, `pipeline_display_order`, `stage_display_order`, `pipeline_active`, `is_open_selectable`, `is_default_for_create`, y los overrides por tenant / business line en `hubspot_deal_pipeline_defaults`. Hoy se gestionan vía SQL (o admin CLI); el admin UI para gobernarlos es un follow-up.

## Cuando el deal se promueve automaticamente

Si la organization tenia `lifecycle_stage = 'prospect'` al momento de crear el deal, el sistema automaticamente la promueve a `opportunity` en la misma transaccion. El toast de exito lo confirma: "Deal creado. Organizacion promovida a oportunidad."

Si la organization ya estaba en `opportunity`, `active_client`, etc., no se promueve (no tiene sentido ir hacia atras en el lifecycle).

## Threshold de aprobacion

Los deals > **$50M CLP** requieren aprobacion:

- El drawer muestra un aviso naranja "Este deal requiere aprobacion" antes de enviar.
- El CTA cambia a "Solicitar aprobacion" en lugar de "Crear deal y asociar".
- Al submit, se crea una solicitud de aprobacion con un `approvalId` y el intento queda en `pending_approval`.
- El Sales Lead recibe la notificacion (via evento outbox) y puede aprobar desde Admin Center (follow-up UI).
- El deal **NO** llega a HubSpot hasta la aprobacion.

## Quien puede usarlo

Requiere la capability `commercial.deal.create`, hoy bindeada a los siguientes roles (segun TASK-535):

- `efeonce_admin` (siempre)

Cuando aterricen los roles `sales` y `sales_lead` (en fases posteriores del programa), tambien los tendran. Sin capability → el boton aparece pero al intentar submit el API retorna 403.

## Que eventos emite el sistema

| Evento | Cuando |
|---|---|
| `commercial.deal.create_requested` | Siempre, al momento de persistir el intento pending. Util para audit trail completo. |
| `commercial.deal.create_approval_requested` | Solo cuando supera el threshold de $50M. Dispara el workflow de aprobacion. |
| `commercial.deal.created_from_greenhouse` | Solo en el happy path. Distingue deals originados aqui vs el sync inbound de HubSpot. Incluye el `quotationId` cuando el drawer fue abierto desde el cotizador. |
| `commercial.deal.created` | Tambien se emite (evento canonico de deals, compartido con el sync inbound). |
| `commercial.party.promoted` | Si la organization fue promovida de `prospect` a `opportunity`. |

## Preguntas frecuentes

**¿Puedo crear un deal sin cotizacion de origen?**

Si — el drawer funciona incluso fuera del cotizador si invocas el API directamente. Pero la UI solo expone el CTA dentro del Quote Builder. Casos fuera del cotizador son para follow-ups (Admin Center, integraciones).

**¿Que pasa si la organization no tiene HubSpot company ID?**

El API responde 409 `ORGANIZATION_HAS_NO_HUBSPOT_COMPANY`. El drawer muestra un error. Solucion: completar el `hubspot_company_id` de la organization (via Admin Center) antes de cotizar.

**¿Que pasa si mi idempotency key colisiona con un intento exitoso anterior?**

El sistema retorna el resultado del intento anterior sin crear un deal nuevo. Es el comportamiento correcto para retries.

**¿Que pasa si el Cloud Run `/deals` no esta desplegado?**

El sistema persiste el intento como `endpoint_not_deployed` y muestra un toast de advertencia. Cuando el deploy aterrice, un worker de retry (follow-up) tomara estos intentos y los procesara. Mientras tanto el intento no se pierde.

**¿Que pasa si pido 2 veces el mismo deal por error (doble-click)?**

El fingerprint dedupe (actor + company + deal name, 5 min) detecta y retorna el primer intento sin duplicar.

**¿Puedo editar un deal desde Greenhouse despues de crearlo?**

Todavia no. El update sigue siendo desde HubSpot. Fase F o posterior (TASK-540+) agregara bidirectional update.

**¿Cuando se crea el mirror en `greenhouse_commercial.deals`?**

En la misma transaccion que persiste la attempt como `completed`. Si algo falla despues del Cloud Run call, el deal no queda persistido pero el intento si queda registrado con el error.

## Limitaciones conocidas

1. **No se crea `contact` association** — los contactos de HubSpot quedan no asociados en esta fase. Follow-up: resolver `contact_identity_profile_id` desde la quote.
2. **No se crean lineas del deal** — el deal se crea vacio. Las quotations siguen siendo el source de detalle.
3. **No hay retry automatico de `failed` / `endpoint_not_deployed`** — el operador debe reintentar manualmente desde el cotizador. Follow-up: retry worker.
4. **Approval workflow genérico no existe** — hoy el `pending_approval` queda registrado pero no hay UI para aprobar. Sales Lead recibe el evento pero tiene que actuar via otro canal. Follow-up: workflow generico de approvals.

## Follow-ups declarados

1. Deploy de `POST /deals` en el Cloud Run `hubspot-greenhouse-integration`.
2. Crear custom property `gh_deal_origin` en el HubSpot portal.
3. Workflow genérico de approval (para deals, no solo quotations).
4. Resolucion automatica de `ownerHubspotUserId` desde `identity_profile_source_links`.
5. Admin Center surface para listar intentos en `failed` / `endpoint_not_deployed` con boton de retry manual.
6. Bidirectional update (editar deal desde Greenhouse) — TASK-540+.

> Detalle tecnico:
> - Comando: [src/lib/commercial/party/commands/create-deal-from-quote-context.ts](../../../src/lib/commercial/party/commands/create-deal-from-quote-context.ts)
> - API route: [src/app/api/commercial/organizations/\[id\]/deals/route.ts](../../../src/app/api/commercial/organizations/[id]/deals/route.ts)
> - Deal creation context route (TASK-571): [src/app/api/commercial/organizations/\[id\]/deal-creation-context/route.ts](../../../src/app/api/commercial/organizations/[id]/deal-creation-context/route.ts)
> - Reader + validator (TASK-571): `getDealCreationContext` y `validateDealCreationSelection` en [src/lib/commercial/deals-store.ts](../../../src/lib/commercial/deals-store.ts)
> - Drawer UI: [src/views/greenhouse/finance/workspace/CreateDealDrawer.tsx](../../../src/views/greenhouse/finance/workspace/CreateDealDrawer.tsx)
> - Hook: [src/hooks/useCreateDeal.ts](../../../src/hooks/useCreateDeal.ts) y [src/hooks/useDealCreationContext.ts](../../../src/hooks/useDealCreationContext.ts)
> - Cloud Run client: [src/lib/integrations/hubspot-greenhouse-service.ts](../../../src/lib/integrations/hubspot-greenhouse-service.ts) (`createHubSpotGreenhouseDeal`)
> - Migrations:
>   - [20260421143050333_task-539-deal-create-attempts.sql](../../../migrations/20260421143050333_task-539-deal-create-attempts.sql)
>   - [20260422141406517_task-571-deal-creation-context-governance.sql](../../../migrations/20260422141406517_task-571-deal-creation-context-governance.sql)
