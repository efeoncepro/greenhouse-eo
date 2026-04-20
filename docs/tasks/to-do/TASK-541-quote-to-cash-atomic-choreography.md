# TASK-541 — Quote-to-Cash Atomic Choreography (Fase G)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-535`
- Branch: `task/TASK-541-quote-to-cash-atomic-choreography`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase G del programa TASK-534. Entrega el comando canonico `convertQuoteToCash` como coreografia atomica: lock quote → transicion a `converted` → instanciar client si falta → promover party a `active_client` → marcar deal won (si aplica) → crear contract → emitir eventos. Se invoca desde `contract.created`, `deal.won` (inbound HubSpot), o explicitamente por operador. Cierra el loop end-to-end.

## Why This Task Exists

Hoy la conversion de quote a cash es multi-step manual: alguien aprueba la quote, alguien crea el contract, alguien marca el deal won, alguien (a veces) verifica que el client exista. Se pierden eventos, hay estados intermedios inconsistentes, y Finance debe reconciliar manualmente. Un comando atomico con rollback completo garantiza que el party siempre termina como `active_client` con `client_id` valido cuando hay contract, y que eventos downstream (MRR, cost attribution, invoicing) reciben el trigger correcto.

## Goal

- Comando `convertQuoteToCash(quotationId, conversionTriggeredBy, actor)` transaccional.
- Integracion con `createContractFromQuotation` (TASK-460 existente).
- Wiring reactivo: al recibir `commercial.contract.created` desde flow normal, disparar choreography si quote aun no esta `converted`.
- Wiring reactivo: al recibir `commercial.deal.won` desde HubSpot sync, invocar si hay quote `issued` asociada.
- Audit en `commercial_operations_audit` como operacion unica con correlation_id.
- Rollback completo si cualquier step falla.
- Dual approval ($100M CLP) integrado con TASK-460 contract approval.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §6.5, §9.2, §9.3
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Operacion atomica: `withTransaction` envolvente; rollback completo si un step falla.
- Lock pesimista sobre `quotations.quotation_id` para evitar double-conversion.
- Toda transicion de lifecycle pasa por los comandos de TASK-535; no hay shortcuts.
- Capability gate `commercial.quote_to_cash.execute`.
- Dual approval para contratos > $100M CLP (CFO + CEO) — bloquea conversion hasta aprobacion.
- Audit unico con correlation_id abarcando todos los eventos emitidos.
- Idempotencia: si la quote ya esta `converted`, retornar el resultado previo sin re-ejecutar.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-534-commercial-party-lifecycle-program.md`

## Dependencies & Impact

### Depends on

- TASK-535 cerrada (`promoteParty`, `instantiateClientForParty`)
- TASK-460 cerrada (Contracts canonicos — `createContractFromQuotation`)
- TASK-461 cerrada (MSA — opcional pero compatible)
- Approval workflow de TASK-460 + TASK-504
- Reactive consumer de outbox

### Blocks / Impacts

- MRR/ARR materializer (TASK-462) — el trigger `commercial.contract.created` atraviesa por aqui
- Cost attribution materialization
- Invoice generation downstream
- Finance income creation

### Files owned

- `src/lib/commercial/party/commands/convert-quote-to-cash.ts`
- `src/lib/sync/projections/quote-to-cash-autopromoter.ts`
- `src/app/api/commercial/quotations/[id]/convert-to-cash/route.ts` (si se expone como endpoint explicito)
- `migrations/YYYYMMDDHHMMSS_task-541-commercial-operations-audit.sql` (si la tabla no existe)

## Current Repo State

### Already exists

- `createContractFromQuotation` en `src/lib/commercial/contracts/` (TASK-460)
- State machine de quotations con estado `converted` (TASK-504)
- Approval workflow operativo
- Outbox + reactive consumer
- Deal lifecycle con `is_won` flag (TASK-453)

### Gap

- No existe comando atomico `convertQuoteToCash`.
- No existe reactive auto-promoter (hoy es manual).
- No hay correlation_id propagation en commercial events.
- Tabla `commercial_operations_audit` puede no existir — validar.
- Dual approval $100M threshold no esta wired a contract creation.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Audit + correlation infrastructure

- Tabla `commercial_operations_audit` (si falta).
- Helper `startCorrelatedOperation(name, actor)` → returns correlationId.
- Wrapper para que eventos emitidos durante la op hereden el correlationId.

### Slice 2 — Comando `convertQuoteToCash`

- Implementacion transaccional completa segun spec §6.5.
- Steps: lock quote → state check → guard idempotency → delegate contract create → instantiate client (si falta) → promote party → mark deal won (si aplica) → emit events.
- Rollback completo en cualquier fallo.

### Slice 3 — Dual approval wiring

- Threshold $100M CLP: crear approval request `commercial_quote_to_cash` con dual approvers (CFO + CEO roles).
- Bloquear execution hasta aprobacion total.
- Si se rechaza, quote NO pasa a converted; queda con flag `conversion_blocked_at` para UI.

### Slice 4 — Auto-promoter reactivo

- Projection `quote-to-cash-autopromoter` que consume:
  - `commercial.contract.created` — si hay quote vinculada y esta `issued`, invocar `convertQuoteToCash(triggered='contract_signed')`.
  - `commercial.deal.won` (desde HubSpot sync) — si hay quote `issued` asociada al deal, invocar `convertQuoteToCash(triggered='deal_won_hubspot')`.
- Idempotencia inherente via state machine (skip si ya `converted`).

### Slice 5 — Endpoint explicito (opcional)

- `POST /api/commercial/quotations/:id/convert-to-cash` para casos donde el operador fuerza la conversion.
- Capability gate estricto.

### Slice 6 — Tests E2E

- Happy path: issue quote → contract sign → auto-promote → verificar client, party, deal, contract todos consistentes.
- Rollback: forzar fallo en step 3 → validar que NADA queda mutado.
- Threshold: amount > $100M → validar approval gate.
- Deal won trigger: simular event HubSpot → validar choreography se ejecuta.

## Out of Scope

- Invoice generation (downstream, consume el evento `commercial.quotation.converted`).
- MRR snapshot (TASK-462, downstream reactivo).
- Cost attribution (downstream reactivo).
- Renovaciones (diferido, fuera de V1).
- Reversal (unconvert) — open question para follow-up.

## Detailed Spec

Ver `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` §6.5 para shape y steps exactos.

### Steps transaccionales

```typescript
await withTransaction(async (tx) => {
  const quote = await lockQuoteById(tx, quotationId);
  if (quote.status === 'converted') return quote.existingConversionResult;
  
  await assertConvertible(quote); // issued | approved
  
  let clientId = quote.organization.clientId;
  if (!clientId) {
    const result = await instantiateClientForParty(tx, { organizationId, triggerEntity, actor });
    clientId = result.clientId;
  }
  
  await promoteParty(tx, { organizationId, toStage: 'active_client', source: 'quote_converted', triggerEntity });
  
  if (quote.hubspotDealId) {
    await markDealWon(tx, quote.hubspotDealId, { origin: 'greenhouse_quote_to_cash' });
  }
  
  const contract = await createContractFromQuotation(tx, { quotationId, actor });
  
  await transitionQuoteTo(tx, quotationId, 'converted');
  
  await emitCorrelated(tx, [
    { event: 'commercial.quotation.converted', ... },
    { event: 'commercial.client.instantiated', ... }, // si aplica
    { event: 'commercial.party.promoted', ... },
    { event: 'commercial.deal.won', ... }, // si aplica
    { event: 'commercial.contract.created', ... },
  ], { correlationId });
  
  return { contractId: contract.contractId, clientId, ... };
});
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Invocar `convertQuoteToCash` sobre quote `issued` la pasa a `converted` Y crea contract Y promueve party Y instancia client en una sola transaccion.
- [ ] Fallar en cualquier step revierte 100% — no queda estado intermedio.
- [ ] Idempotencia: segunda invocacion sobre quote ya `converted` retorna el resultado previo sin side effects.
- [ ] Threshold $100M genera dual approval request y bloquea conversion hasta aprobacion.
- [ ] `commercial.contract.created` event dispara auto-choreography si quote esta `issued`.
- [ ] `commercial.deal.won` desde HubSpot dispara auto-choreography si hay quote asociada.
- [ ] Audit row en `commercial_operations_audit` con correlation_id que agrupa todos los eventos emitidos.
- [ ] Capability `commercial.quote_to_cash.execute` requerida; sin ella, 403.
- [ ] Tests E2E cubren happy, rollback, threshold, auto-trigger.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/commercial/party/commands/convert-quote-to-cash`
- Staging E2E: emitir quote, firmar contract, validar en PG que party, client, deal, contract coinciden
- Audit trail completo por correlation_id

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado con "Quote-to-cash atomic choreography shipped"
- [ ] Chequeo de impacto cruzado

- [ ] Update TASK-534 umbrella
- [ ] TASK-462 MRR/ARR verificado consumiendo events correctos

## Follow-ups

- Reversal (unconvert) si aparece caso operacional — evaluar post-V1.
- Dashboard de conversion velocity + funnel drop-off — va en TASK-542.
- Sweep para detectar quotes `issued` huerfanas sin contract (recover path).
