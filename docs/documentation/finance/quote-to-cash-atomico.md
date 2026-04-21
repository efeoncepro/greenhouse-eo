# Quote-to-Cash Atómico — Coreografía sin Pasos Intermedios Rotos

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-21 por Claude (Opus 4.7) — TASK-541
> **Ultima actualizacion:** 2026-04-21 por Claude
> **Documentacion tecnica:**
> - Task: [TASK-541](../../tasks/complete/TASK-541-quote-to-cash-atomic-choreography.md)
> - Spec tecnica: [GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1 § Delta Fase G](../../architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md)
> - Programa paraguas: [TASK-534](../../tasks/to-do/TASK-534-commercial-party-lifecycle-program.md)
> - Docs relacionadas: [Ciclo de Vida de Parties Comerciales](./ciclo-de-vida-party-comercial.md) · [Contratos comerciales](./contratos-comerciales.md) · [Crear Deal desde el Cotizador](./crear-deal-desde-quote-builder.md)

## Que problema resuelve

Antes, la conversión de una cotización en un contrato con factura real era un proceso manual de multiples pasos:

1. Alguien aprobaba la cotización.
2. Alguien creaba el contrato.
3. Alguien marcaba el deal como ganado en HubSpot.
4. Alguien verificaba (a veces) que el cliente existiera en el sistema.
5. Alguien materializaba la factura.

Resultado: eventos perdidos, estados intermedios inconsistentes, Finance reconciliando a mano, y tasks operativas derivadas semana a semana.

Ahora es **un solo comando atómico** que hace todo de una vez, con rollback completo si algo falla. El operador dispara "Convertir a cash" y el sistema garantiza que al final:

- La cotización quedó en `converted`.
- Existe un contrato activo vinculado a la cotización.
- La organization está en `active_client` (promovida desde `prospect`/`opportunity`).
- Si no existía cliente financiero, se creó.
- El deal de HubSpot se marcó como ganado.
- Los eventos downstream (MRR, cost attribution, analytics) recibieron el trigger correcto.

O NADA de eso pasó — no hay estados intermedios.

## Como se dispara

Tres caminos:

1. **Operador manual**: `POST /api/commercial/quotations/:id/convert-to-cash`. Requiere capability `commercial.quote_to_cash.execute` (bindeada a `efeonce_admin` y `finance_admin`).
2. **Reactivo desde HubSpot**: cuando un deal se marca como `closedwon` en HubSpot, el sync inbound publica `commercial.deal.won`. La projection `quote_to_cash_autopromoter` lo escucha, busca la cotización convertible asociada al deal, y dispara el comando automaticamente con trigger `deal_won_hubspot`.
3. **Reactivo interno** (follow-up): trigger desde un workflow de approval resuelto, con `skipApprovalGate: true`.

## Que hace paso por paso

Dentro de una sola transacción PostgreSQL (`withTransaction`):

| # | Paso | Que ocurre |
|---|---|---|
| 1 | **Lock quote** | `SELECT ... FOR UPDATE` sobre la cotización. Previene conversiones concurrentes. |
| 2 | **Idempotency check** | Si la quote ya está `converted` y hay audit row previo, retorna ese resultado sin re-ejecutar. |
| 3 | **Convertibilidad** | Rechaza si el status no es `issued`, `sent` o `approved`. |
| 4 | **Anchors** | Rechaza si la quote no tiene `organization_id` (no se puede materializar party). |
| 5 | **Audit start** | Inserta row en `commercial_operations_audit` con un `correlation_id` UUID único. Este correlationId se propaga a **todos los eventos** downstream. |
| 6 | **Threshold gate** | Si `total_amount_clp > $100M CLP` y no hay override explícito, persiste `pending_approval`, emite `commercial.quote_to_cash.approval_requested`, lanza error y sale sin mutar contract/party/client. |
| 7 | **State transition** | `UPDATE quotations SET status = 'converted', converted_at = NOW()`. |
| 8 | **Contract** | Llama a `ensureContractForQuotation` (idempotente, reutilizado de TASK-460). Como la quote ya está `converted`, el contrato nace en status `active`. |
| 9 | **Party promotion** | Si la organization NO está en `active_client`, invoca `promoteParty(prospect/opportunity → active_client)`. La promoción también instancia el `client_id` si falta. |
| 10 | **Client fallback** | Si la promoción fue saltada (ya estaba en `active_client`) y la quote no tiene client_id, llama a `instantiateClientForParty` explícitamente. |
| 11 | **Eventos canónicos** | Emite `commercial.quotation.converted` con `correlationId`. Si el trigger no fue HubSpot sync, también emite `commercial.deal.won` local (consumers MRR, forecast). |
| 12 | **Audit complete** | Marca audit row como `completed` + emite `commercial.quote_to_cash.completed`. |

Si cualquier paso falla, la transacción hace rollback de TODO. El audit row queda como `failed` con `error_code` + `error_message` (dentro de la misma transacción, también revertido, pero el evento `commercial.quote_to_cash.failed` se emite al outbox antes del rollback para que alerting lo vea).

## Los 5 estados del audit

Cada invocación deja exactamente una fila en `commercial_operations_audit` con uno de estos status:

| Estado | Significado |
|---|---|
| `started` | Operación en vuelo (corto — duración de la transacción). |
| `completed` | Todo salió bien. Quote convertida, contrato creado, party promovida. |
| `pending_approval` | Superó el threshold $100M CLP. Ninguna mutación real ocurrió. Espera resolución del workflow de approval. |
| `failed` | Algún paso lanzó error. La transacción hizo rollback. El audit queda con el error para soporte. |
| `idempotent_hit` | La quote ya estaba convertida; se retornó el resultado previo sin re-ejecutar. |

## Correlation ID — por qué importa

Cada operación nace con un `correlation_id` UUID único que se propaga en el payload de **todos** los eventos emitidos durante la coreografía:

- `commercial.quote_to_cash.started`
- `commercial.quotation.converted`
- `commercial.contract.created` + `.activated`
- `commercial.party.promoted`
- `commercial.client.instantiated` (si se dispara)
- `commercial.deal.won` (si aplica)
- `commercial.quote_to_cash.completed`

Soporte puede filtrar por `correlation_id` en BigQuery o en el outbox para reconstruir la cadena completa de lo que pasó con una cotización específica. No tienes que navegar 5 aggregates distintos — sigues el correlation_id.

## Dual approval $100M CLP

Cuando una cotización supera los CLP 100.000.000, el sistema **no la convierte automáticamente**. En su lugar:

1. Registra un audit row con status `pending_approval` + genera un `approvalId`.
2. Emite el evento `commercial.quote_to_cash.approval_requested` para que el workflow de approval (follow-up) lo procese.
3. Retorna error `QuoteToCashApprovalRequiredError` con el `approvalId`.
4. La quote **NO** cambia de status. El contrato **NO** se crea. Nada se mutó.

Cuando el CFO + CEO aprueben (workflow pendiente de aterrizar como task derivada), el resolver llamará a `convertQuoteToCash(..., skipApprovalGate: true)` para ejecutar la coreografía de verdad.

## Idempotencia

Llamar al comando dos veces sobre la misma quote es seguro:

- Si la primera fue exitosa (`completed`), la segunda retorna `idempotent_hit` sin ejecutar nada.
- Si la primera está `pending_approval`, la segunda retorna `pending_approval` con el mismo `approvalId`.
- Si la primera falló (`failed`), la segunda intenta de nuevo (el status de la quote aún no es `converted`).

Tambien el API acepta un `idempotencyKey` opcional para que los clientes reintenten con seguridad.

## Trigger "deal ganado en HubSpot"

Este es el caso más común y automático:

1. Un Sales Manager mueve un deal a `closedwon` en HubSpot.
2. El sync inbound detecta el cambio, inserta el `is_won = true` en Greenhouse, y publica `commercial.deal.won`.
3. La projection `quote_to_cash_autopromoter` se activa:
   - Busca cotizaciones `issued`/`sent`/`approved` vinculadas al `hubspot_deal_id`.
   - Si encuentra una, invoca `convertQuoteToCash({ conversionTriggeredBy: 'deal_won_hubspot' })`.
   - Si no hay quote, queda como no-op (el deal se marca won pero no hay contrato que firmar).
4. El comando corre idempotente — si alguien ya había disparado la conversión manual, el trigger reactivo es no-op.

Importante: cuando el trigger es `deal_won_hubspot`, el comando **NO** re-emite `commercial.deal.won` localmente (el sync ya lo hizo). Así evitamos duplicados en consumers downstream.

## Que NO hace esta coreografía

- **No crea la factura (income).** Eso sigue siendo un paso separado, manual, via `materializeInvoiceFromApprovedQuotation`. Motivo: el timing de emisión tributaria (Nubox) es independiente del momento en que se firma el contrato.
- **No escribe en HubSpot.** El `deal.won` es solo evento interno. Propagar a HubSpot es responsabilidad de TASK-540 (outbound sync, follow-up).
- **No maneja contratos multi-quote.** Si un contrato agrupa varias quotes, cada quote dispara su propia coreografía. `ensureContractForQuotation` reutiliza el contrato existente.
- **No reverte conversiones.** Si un operador convierte por error, hay que crear tickets manuales — no hay "unconvert".

## Preguntas frecuentes

**¿Qué pasa si el contrato falla al crearse?**

Rollback total. La quote NO cambia de status. La party NO se promueve. El audit queda en `failed` con el error exacto. Puedes reintentar después de corregir el problema (por ejemplo, rellenar el `organization_id` de la quote).

**¿Qué pasa si la party ya está en `active_client`?**

El paso de promoción se salta (no tiene sentido ir hacia atrás en el lifecycle). Si además la quote no tiene `client_id`, se invoca `instantiateClientForParty` para asegurarnos de que exista.

**¿Puedo convertir una quote que está en status `draft`?**

No. Solo `issued`, `sent` o `approved`. Primero hay que emitir la quote.

**¿Qué pasa con deals sin quote asociada?**

El auto-promoter los ignora. Un deal cerrado sin cotización adjunta no tiene contrato que firmar — el operador tendría que crear la cotización retroactivamente y convertirla manualmente.

**¿Cómo inspecciono el estado de una conversión?**

SQL directo a `greenhouse_commercial.commercial_operations_audit`:

```sql
SELECT operation_id, correlation_id, status, started_at, completed_at,
       contract_id, error_code, error_message, metadata
FROM greenhouse_commercial.commercial_operations_audit
WHERE quotation_id = 'QT-0001';
```

O filtra eventos del outbox por `correlation_id` para ver la cadena completa.

## Follow-ups conocidos

1. **Workflow genérico de approvals**: hoy el `pending_approval` queda en el audit pero no hay UI para resolver. Task derivada.
2. **Outbound HubSpot para `deal.won`**: TASK-540 Fase F.
3. **Income materialization reactiva**: escuchar `commercial.quote_to_cash.completed` para disparar `materializeInvoiceFromApprovedQuotation` automáticamente.
4. **Admin Center para funnel / velocity**: dashboard de conversiones completadas / pending / failed — TASK-542 Fase H.
5. **Reversal (unconvert)**: post-V1, solo si aparece necesidad operativa real.

> Detalle tecnico:
> - Comando: [src/lib/commercial/party/commands/convert-quote-to-cash.ts](../../../src/lib/commercial/party/commands/convert-quote-to-cash.ts)
> - Audit helper: [src/lib/commercial/party/commands/commercial-operations-audit.ts](../../../src/lib/commercial/party/commands/commercial-operations-audit.ts)
> - Events: [src/lib/commercial/party/commands/quote-to-cash-events.ts](../../../src/lib/commercial/party/commands/quote-to-cash-events.ts)
> - Projection reactiva: [src/lib/sync/projections/quote-to-cash-autopromoter.ts](../../../src/lib/sync/projections/quote-to-cash-autopromoter.ts)
> - API route: [src/app/api/commercial/quotations/\[id\]/convert-to-cash/route.ts](../../../src/app/api/commercial/quotations/[id]/convert-to-cash/route.ts)
> - Migration: [20260421150625283_task-541-commercial-operations-audit.sql](../../../migrations/20260421150625283_task-541-commercial-operations-audit.sql)
