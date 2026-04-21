# Sincronizacion de Facturas a HubSpot — Continuidad Quote-to-Cash

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-21 por Claude (Opus 4.7) — TASK-524
> **Ultima actualizacion:** 2026-04-21 por Claude
> **Documentacion tecnica:**
> - Task: [TASK-524](../../tasks/complete/TASK-524-income-hubspot-invoice-bridge.md)
> - Spec tecnica: [GREENHOUSE_FINANCE_ARCHITECTURE_V1 § Delta 2026-04-21](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
> - Event catalog: [GREENHOUSE_EVENT_CATALOG_V1 § Finance](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md)
> - Docs relacionadas: [Ciclo de Vida de Parties Comerciales](./ciclo-de-vida-party-comercial.md) · [Contratos comerciales](./contratos-comerciales.md) · [Cotizador](./cotizador.md)

## Que problema resuelve

Antes, cuando una cotizacion se convertia en factura (`income`) en Greenhouse, la factura **perdia el hilo comercial con HubSpot**:

- La factura nacia sin `hubspot_company_id` ni `hubspot_deal_id`.
- No habia forma de reflejarla en el CRM contra el mismo deal y la misma empresa que generaron la cotizacion.
- Soporte no podia responder "¿esta factura se sincronizo a HubSpot? ¿cuando? ¿con que error?" — simplemente no habia rastro.

Ahora, toda factura materializada desde una cotizacion:
1. **Hereda automaticamente** los anchors CRM (`company_id` + `deal_id`) desde la cotizacion.
2. **Se espeja a HubSpot** como un objeto `invoice` nativo — visible en el deal, en la company y en el contacto.
3. **Deja trazabilidad completa** de cada intento de sync (estado, timestamp, error, contador de reintentos).

## Que NO es este sincronizador

- **No reemplaza a Nubox como emisor tributario.** Chile sigue teniendo su factura oficial emitida en Nubox con DTE + SII. HubSpot es un **reflejo CRM**, no un sistema de cobranza.
- **No cobra ni genera links de pago.** El invoice en HubSpot se crea como `non-billable` (`hs_invoice_billable=false`) precisamente para que HubSpot no intente cobrar.
- **No reemplaza al bridge de cotizaciones.** Ese sigue funcionando igual (TASK-463). Este bridge es el eslabon que faltaba despues del conversion.

## Como funciona (vista general)

```
Cotizacion issued en Greenhouse
  └─ tiene hubspot_deal_id + organization → hubspot_company_id
      │
      │  Quote-to-cash materializer
      ▼
Factura (income) en greenhouse_finance.income
  └─ HEREDA hubspot_company_id + hubspot_deal_id
      │
      │  Evento outbox finance.income.created
      ▼
Projection reactiva income_hubspot_outbound
  │
  │  Llama al Cloud Run service /invoices
  ▼
Invoice (non-billable) en HubSpot
  └─ asociada a deal + company (+ contact best-effort)
      │
      │  Evento outbox finance.income.hubspot_synced
      ▼
Trazabilidad persistida + visible en soporte
```

## Los 5 estados de sincronizacion

Cada fila en `greenhouse_finance.income` carga un `hubspot_sync_status` que siempre tiene significado operativo claro:

| Estado | Que significa | Accion del sistema |
|---|---|---|
| `pending` | La projection recibio el evento; el outbound esta en cola. | Worker lo tomara en el proximo tick. |
| `synced` | El mirror en HubSpot fue confirmado OK. | Nada — listo. Si cambia algo, se re-sincroniza. |
| `failed` | Cloud Run respondio 5xx o error de red. | Retry worker aplica backoff y reintenta. |
| `endpoint_not_deployed` | La ruta `/invoices` aun no esta desplegada en prod. | No se queman retries. Se retoma solo cuando el deploy aterrice. |
| `skipped_no_anchors` | La factura no tiene `company_id` ni `deal_id` (manualmente ingresada sin origen comercial). | Queda "degraded". Si despues se le completan los anchors, se sincroniza en el siguiente edit. |

La columna `hubspot_sync_error` guarda el ultimo mensaje de error (si hubo); la columna `hubspot_sync_attempt_count` cuenta monotonicamente cada intento — success o fail — para que operaciones pueda detectar si una factura lleva demasiados reintentos fallidos.

## Cuando se activa el sync

La projection `income_hubspot_outbound` se dispara ante tres eventos:

| Evento | Cuando ocurre | Que hace el bridge |
|---|---|---|
| `finance.income.created` | Se crea un `income` (manual via API o materializado desde quote/HES). | Crea el invoice en HubSpot con los anchors heredados + line items. |
| `finance.income.updated` | Se edita un `income` (monto, fecha, anchors). | Actualiza el invoice remoto preservando el mismo `hubspot_invoice_id`. |
| `finance.income.nubox_synced` | Nubox confirma la emision tributaria (DTE + folio SII). | Re-ejecuta el mirror para reflejar el numero de folio final; **Fase 2** (follow-up) atachara el PDF/XML como note en el invoice. |

## Que se asocia en HubSpot

Cuando el bridge empuja la factura:

- **Company** (`hubspot_company_id`): obligatorio cuando existe. Se resuelve desde la `organization` de la cotizacion si la quote no lo trae directo.
- **Deal** (`hubspot_deal_id`): obligatorio cuando existe. Viene directo de la cotizacion de origen.
- **Contact** (HubSpot contact): **best-effort** — si la cotizacion tiene contacto identificable, se asocia; si no, el sync no se bloquea y deja trace del caso degradado.
- **Line items**: si el `income` tiene `income_line_items` registrados, se envia el detalle. Si no hay desglose, se envia una unica linea sintetica con el total.

## Idempotencia y reintentos

El bridge es **completamente idempotente**:

- Llamar dos veces con el mismo estado no duplica: la segunda vez actualiza el mismo `hubspot_invoice_id` remoto.
- Si el Cloud Run cae a mitad de un push, la retry del outbox consumer arranca limpia y reescribe el invoice sin efectos colaterales.
- El `income_id` de Greenhouse es la **idempotency key** que el Cloud Run service usa para deduplicar.

## Que emite el sistema para otros modulos

| Evento | Payload principal | Para quien |
|---|---|---|
| `finance.income.hubspot_synced` | `{ incomeId, hubspotInvoiceId, hubspotCompanyId, hubspotDealId, syncedAt, attemptCount }` | Audit, analytics BigQuery |
| `finance.income.hubspot_sync_failed` | `{ incomeId, status, errorMessage, attemptCount }` | Alerting, retry worker, soporte |
| `finance.income.hubspot_artifact_attached` | `{ incomeId, hubspotInvoiceId, hubspotArtifactNoteId, artifactKind }` | Reservado para Fase 2 (DTE/PDF attach) |

## Preguntas frecuentes

**¿Que pasa con las facturas antiguas creadas antes de este cambio?**

Quedan con `hubspot_sync_status = NULL` (nunca se intento sincronizar). Si el operador edita la factura y completa los anchors, el siguiente `finance.income.updated` disparara el sync. Si no, quedan como historicas.

**¿Que pasa si edito manualmente un `income` y cambio el monto?**

El evento `finance.income.updated` se dispara y el bridge actualiza el mirror en HubSpot — el `hubspot_invoice_id` se preserva, asi que no hay invoices duplicados en el CRM.

**¿Que pasa si la cotizacion de origen no tenia anchors HubSpot?**

La factura nace sin anchors y queda en `skipped_no_anchors`. Operacion puede agregarlos manualmente despues y el proximo update sincroniza.

**¿Como veo el estado de sync de una factura?**

Hoy: via SQL directo a `greenhouse_finance.income` (columnas `hubspot_sync_status`, `hubspot_sync_error`, `hubspot_last_synced_at`, `hubspot_sync_attempt_count`) o via `getIncomeHubSpotSyncTrace(incomeId)` en codigo.

Follow-up: Admin Center surface visual (task derivada).

**¿Por que el invoice en HubSpot es non-billable?**

Porque Greenhouse/Nubox es el unico source of truth de la cobranza chilena. HubSpot no debe intentar cobrar. El flag `hs_invoice_billable=false` mantiene al invoice como un reflejo read-only del CRM, visible para el equipo comercial pero sin efectos monetarios.

**¿Que pasa si HubSpot cambia la factura desde su lado?**

Hoy no sincronizamos cambios desde HubSpot hacia Greenhouse (solo outbound). Si un operador edita el invoice en HubSpot, el proximo `update` desde Greenhouse sobrescribira esos cambios. Si HubSpot se convierte en origin para algun campo, sera una decision futura documentada en TASK derivada.

## Follow-ups conocidos

1. **Fase 2 del contrato** — al `finance.income.nubox_synced`, attachar el PDF/XML/DTE emitido como engagement/note en el invoice + deal + company.
2. **Contact association first-class** — resolver `contact_identity_profile_id` de la cotizacion para asociar contacto en HubSpot automaticamente.
3. **Admin Center surface** — listado visual de facturas en estados degradados (`failed`, `endpoint_not_deployed`, `skipped_no_anchors`) con boton de reintento manual.
4. **Deploy de `/invoices`** en el Cloud Run service `hubspot-greenhouse-integration`. Hasta que aterrice, las facturas quedan en `endpoint_not_deployed` y el retry worker las toma automaticamente cuando la ruta exista.

> Detalle tecnico:
> - Codigo del modulo: [src/lib/finance/income-hubspot/](../../../src/lib/finance/income-hubspot/)
> - Projection reactiva: [src/lib/sync/projections/income-hubspot-outbound.ts](../../../src/lib/sync/projections/income-hubspot-outbound.ts)
> - Materializers actualizados: [materialize-invoice-from-quotation.ts](../../../src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.ts) + [materialize-invoice-from-hes.ts](../../../src/lib/finance/quote-to-cash/materialize-invoice-from-hes.ts)
> - Cloud Run client: [src/lib/integrations/hubspot-greenhouse-service.ts](../../../src/lib/integrations/hubspot-greenhouse-service.ts) (`upsertHubSpotGreenhouseInvoice`)
> - Migration: [20260421125353997_task-524-income-hubspot-invoice-trace.sql](../../../migrations/20260421125353997_task-524-income-hubspot-invoice-trace.sql)
