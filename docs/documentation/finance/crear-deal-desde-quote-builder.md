# Crear Deal desde el Cotizador — Sin salir a HubSpot

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-04-21 por Claude (Opus 4.7) — TASK-539
> **Ultima actualizacion:** 2026-04-22 por Codex — TASK-573 (contrato de nacimiento endurecido: owner/contact/dealType/priority + governance HubSpot)
> **Documentacion tecnica:**
> - Task: [TASK-539](../../tasks/complete/TASK-539-inline-deal-creation-quote-builder.md)
> - Hardening: [TASK-573](../../tasks/complete/TASK-573-quote-builder-deal-birth-contract-completion.md)
> - Spec tecnica: [GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1 § Delta Fase E](../../architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md)
> - Programa paraguas: [TASK-534](../../tasks/complete/TASK-534-commercial-party-lifecycle-program.md)
> - Docs relacionadas: [Ciclo de Vida de Parties Comerciales](./ciclo-de-vida-party-comercial.md) · [Cotizador](./cotizador.md) · [Sincronizacion de Facturas a HubSpot](./sincronizacion-facturas-hubspot.md)

## Que problema resuelve

Antes, si querias cotizar a una empresa que aun no tenia un deal asociado en HubSpot, el operador comercial tenia que:

1. Pausar el cotizador.
2. Abrir HubSpot en otra pestana.
3. Crear el deal ahi.
4. Esperar a que el sync de Greenhouse detectara el nuevo deal.
5. Volver al cotizador y refrescar.

Eran minutos perdidos por cada cotizacion nueva, con riesgo real de duplicar empresas por typos o re-trabajo.

Ahora puedes crear el deal **desde el mismo cotizador**, en un drawer gobernado, sin cambiar de pestana.

## Como funciona

### El flujo desde el punto de vista del operador

1. Estas cotizando una oportunidad y el selector de deal aparece vacio (no hay deals asociados a la organization).
2. En el footer del popover del chip Deal aparece "¿No encontrás el deal que buscás?" con el CTA "Crear deal nuevo".
3. Click → se abre un drawer a la derecha con los campos operativos reales del nacimiento del deal: **nombre del deal**, **pipeline**, **etapa inicial**, **tipo de negocio**, **prioridad**, **monto estimado** y **moneda**. También muestra qué contacto se asociará y cómo se resolverá el owner.
4. El drawer lee `GET /api/commercial/organizations/:id/deal-creation-context` para precargar pipeline + etapa + `dealType` + `priority` con los defaults gobernados. Si falta `hubspot_company_id` o la governance está incompleta, el drawer bloquea el create antes del submit y explica el motivo.
5. Completas los campos y presionas "Crear deal y asociar".
6. El sistema:
   - Valida que `pipelineId ↔ stageId` sean coherentes contra el registry local y que la governance de create esté completa. Etapas cerradas, defaults faltantes o mappings obligatorios ausentes se rechazan con error explícito.
   - Resuelve `owner`, `contact`, `dealType` y `priority` de forma canónica antes de llamar al servicio.
   - Crea el deal en HubSpot (via Cloud Run service) pasándole pipeline + stage + owner + contact + type + priority ya resueltos.
   - Lo refleja en `greenhouse_commercial.deals` usando los valores efectivos que devuelve el backend.
   - Si la organization estaba en `prospect`, la promueve automaticamente a `opportunity`.
   - Asocia el nuevo deal a la cotizacion que estas editando.
7. Toast de confirmacion + el selector se actualiza con el nuevo deal usando `pipelineLabelUsed` / `stageLabelUsed` reales (sin el fallback a `appointmentscheduled` que existia en la version 1.0).

### Que pasa bajo el capo

| Step | Que hace el sistema |
|---|---|
| Validacion | Rechaza si no hay organization o nombre de deal vacio. |
| Idempotencia | Si el cliente reintenta con el mismo `idempotencyKey`, retorna el deal canonico. Si hubo 2 creates concurrentes, reutiliza el mas antiguo y archiva el duplicado en HubSpot. |
| Fingerprint dedupe | Sin idempotency key explicita, el sistema detecta doble-click (mismo actor + misma company + mismo nombre, 5 min) y reutiliza el intento. |
| Rate limit | Maximo 20 deals/minuto por usuario, 100 deals/hora por tenant. Exceso retorna HTTP 429 con `Retry-After`. |
| Threshold de aprobacion | Si el monto supera $50M CLP, el deal **NO** se crea automaticamente. Se persiste como `pending_approval` y se emite un evento para que el Sales Lead lo revise. |
| Cloud Run POST | Llama al service `hubspot-greenhouse-integration` con el payload expandido (`pipeline`, `stage`, `owner`, `hubspotContactId`, `dealType`, `priority`). Timeout 4s, auth por integration token (`Authorization: Bearer` o `x-greenhouse-integration-key`). El servicio vive en `services/hubspot_greenhouse_integration/` en este monorepo desde TASK-574 (2026-04-24); antes residía en el sibling `cesargrowth11/hubspot-bigquery`. |
| Transaction atomica | Insert en `deals` + `promoteParty` + emit eventos → todo en una sola transaccion. Si algo falla, nada se persiste. |
| Trazabilidad | Cada intento (exitoso o fallido) queda en `deal_create_attempts` con status, error, contador de reintentos. Soporte puede reconstruir exactamente que paso. |
| Resolucion canonica | `owner`: actor Greenhouse -> `members.hubspot_owner_id` -> policy. `contact`: `quotationId/contactIdentityProfileId -> person_360 -> hubspotContactId`. `dealType` y `priority`: policy Greenhouse + metadata HubSpot espejada localmente. |

## Los 6 estados de cada intento

| Estado | Significa |
|---|---|
| `pending` | El intento esta en vuelo (corto — solo durante la transaccion). |
| `completed` | Deal creado en HubSpot y mirror en Greenhouse. |
| `pending_approval` | Monto > $50M CLP: aprobacion necesaria. No se llamo a HubSpot aun. |
| `rate_limited` | Rechazado por rate limit; no se creo el deal. |
| `failed` | Cloud Run respondio error (5xx, timeout). El intento queda registrado con el mensaje de error; el usuario puede reintentar. |
| `endpoint_not_deployed` | Estado historico pre-go-live de TASK-572. Quedo registrado antes del deploy del `POST /deals` y sirve para replay/manual recovery. |

## Valores por defecto y governance (TASK-571 + TASK-573)

El drawer pide pipeline + stage explícitamente y los precarga con los defaults que gobierna Greenhouse. La resolución sigue este orden:

| Señal | Prioridad |
|---|---|
| Override por tenant (`scope='tenant'`, `scope_key='<tenantScope>'`) | 1 — gana |
| Override por business line (`scope='business_line'`, `scope_key='<businessLineCode>'`) | 2 |
| Default global (`scope='global'`, `scope_key='__global__'`) | 3 |
| Único pipeline activo en el registry | 4 |
| Si hay múltiples pipelines activos y no existe policy explícita | bloqueo, no fallback |

Dentro del pipeline elegido, la stage default se resuelve así:

| Señal | Prioridad |
|---|---|
| Policy stage override (tenant/BU/global) | 1 |
| Stage marcada `is_default_for_create = TRUE` | 2 |
| Única stage `is_open_selectable = TRUE` | 3 |
| Si hay múltiples stages válidas y no existe default explícita | bloqueo, no fallback |

Otros defaults del drawer:

| Campo | Default |
|---|---|
| Owner | HubSpot owner del actor Greenhouse; fallback al `owner_hubspot_user_id` del default policy si existe. |
| Contacto | `contactIdentityProfileId` de la quote; se traduce a `hubspotContactId` vía `person_360`. |
| Tipo de negocio | Policy tenant / business line / global, o única opción disponible en metadata HubSpot espejada localmente. |
| Prioridad | Policy tenant / business line / global, o única opción disponible en metadata HubSpot espejada localmente. |
| Currency | La misma que el cotizador tiene seleccionada. |
| Nombre | Pre-rellenado como "{nombre de la empresa} — Nuevo deal" para acelerar. |

### Ownership del registry

- **HubSpot** es source of truth de qué pipelines, stages y property options existen.
- **Greenhouse** mantiene un mirror local para create (`hubspot_deal_pipeline_config` + `hubspot_deal_property_config`) y gobierna defaults operativos, orden visible y enablement en `hubspot_deal_pipeline_defaults`.
- El refresh de metadata ya no depende solo de observar deals históricos. Existe un carril admin-safe para resincronizar metadata (`POST /api/admin/commercial/deal-governance`) y una lectura de summary (`GET /api/admin/commercial/deal-governance`).

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

El drawer queda bloqueado antes del submit y explica que la organización todavía no está vinculada a una empresa de HubSpot. El backend mantiene la defensa en profundidad y sigue rechazando el create si alguien intenta saltarse ese gating.

**¿Que pasa si mi idempotency key colisiona con un intento exitoso anterior?**

El sistema retorna el resultado del intento anterior sin crear un deal nuevo. Es el comportamiento correcto para retries.

**¿Que pasa si el Cloud Run `/deals` no esta desplegado?**

Ese era el gap original de TASK-539 y quedo cerrado el 2026-04-22 con TASK-572. Los intentos historicos previos al go-live pueden seguir existiendo como `endpoint_not_deployed`, pero ya no es el comportamiento esperado del sistema.

**¿Que pasa si pido 2 veces el mismo deal por error (doble-click)?**

El fingerprint dedupe (actor + company + deal name, 5 min) detecta y retorna el primer intento sin duplicar.

**¿Puedo editar un deal desde Greenhouse despues de crearlo?**

Todavia no. El update sigue siendo desde HubSpot. Fase F o posterior (TASK-540+) agregara bidirectional update.

**¿Cuando se crea el mirror en `greenhouse_commercial.deals`?**

En la misma transaccion que persiste la attempt como `completed`. Si algo falla despues del Cloud Run call, el deal no queda persistido pero el intento si queda registrado con el error.

## Limitaciones conocidas

1. **No existe todavía un flujo inline para vincular una organization legacy a una Company HubSpot** — el create queda bloqueado correctamente, pero la remediación guiada desde el mismo builder sigue como follow-up residual de `TASK-564`.
2. **No se crean lineas del deal** — el deal se crea vacio. Las quotations siguen siendo el source de detalle.
3. **No hay retry automatico de `failed` ni replay del historico `endpoint_not_deployed`** — el operador debe reintentar manualmente desde el cotizador. Follow-up: retry worker / replay lane.
4. **Approval workflow genérico no existe** — hoy el `pending_approval` queda registrado pero no hay UI para aprobar. Sales Lead recibe el evento pero tiene que actuar via otro canal. Follow-up: workflow generico de approvals.
5. **La surface admin es operativa, no full UI** — hoy existe route de refresh/summary, pero la pantalla administrativa rica para gobernar pipelines/properties sigue como follow-up.

## Follow-ups declarados

1. Workflow genérico de approval (para deals, no solo quotations).
2. Surface Admin Center completa para gobernar pipelines, stages, defaults y property options sin SQL/manual route calls.
3. Admin Center surface para listar intentos en `failed` / historico `endpoint_not_deployed` con boton de retry manual.
4. Override manual de owner/contact en UI cuando el default resuelto no sea suficiente para ciertos equipos comerciales.
5. Bidirectional update (editar deal desde Greenhouse) — TASK-540+.

> Detalle tecnico:
> - Comando: [src/lib/commercial/party/commands/create-deal-from-quote-context.ts](../../../src/lib/commercial/party/commands/create-deal-from-quote-context.ts)
> - API route: [src/app/api/commercial/organizations/\[id\]/deals/route.ts](../../../src/app/api/commercial/organizations/[id]/deals/route.ts)
> - Deal creation context route (TASK-571): [src/app/api/commercial/organizations/\[id\]/deal-creation-context/route.ts](../../../src/app/api/commercial/organizations/[id]/deal-creation-context/route.ts)
> - Governance admin route (TASK-573): [src/app/api/admin/commercial/deal-governance/route.ts](../../../src/app/api/admin/commercial/deal-governance/route.ts)
> - Reader + validator (TASK-571): `getDealCreationContext` y `validateDealCreationSelection` en [src/lib/commercial/deals-store.ts](../../../src/lib/commercial/deals-store.ts)
> - Metadata sync helper (TASK-573): [src/lib/commercial/deal-metadata-sync.ts](../../../src/lib/commercial/deal-metadata-sync.ts)
> - Drawer UI: [src/views/greenhouse/finance/workspace/CreateDealDrawer.tsx](../../../src/views/greenhouse/finance/workspace/CreateDealDrawer.tsx)
> - Hook: [src/hooks/useCreateDeal.ts](../../../src/hooks/useCreateDeal.ts) y [src/hooks/useDealCreationContext.ts](../../../src/hooks/useDealCreationContext.ts)
> - Cloud Run client: [src/lib/integrations/hubspot-greenhouse-service.ts](../../../src/lib/integrations/hubspot-greenhouse-service.ts) (`createHubSpotGreenhouseDeal`)
> - Migrations:
>   - [20260421143050333_task-539-deal-create-attempts.sql](../../../migrations/20260421143050333_task-539-deal-create-attempts.sql)
>   - [20260422141406517_task-571-deal-creation-context-governance.sql](../../../migrations/20260422141406517_task-571-deal-creation-context-governance.sql)
>   - [20260423010123303_task-573-deal-birth-contract-completion.sql](../../../migrations/20260423010123303_task-573-deal-birth-contract-completion.sql)
