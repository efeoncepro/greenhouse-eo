# TASK-539 — Inline Deal Creation from Quote Builder (Fase E)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementado — 2026-04-21`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-535`
- Branch: `task/TASK-539-inline-deal-creation-quote-builder`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase E del programa TASK-534. Entrega el comando canonico `createDealFromQuoteContext`, el endpoint `POST /api/commercial/organizations/:id/deals`, y un drawer "Crear deal nuevo" en el Quote Builder. Extiende el Cloud Run service `hubspot-greenhouse-integration` con `POST /deals`. Promueve automaticamente la organization a `opportunity` al crear el primer deal. Elimina el context-switch a HubSpot — este es el pain point principal del programa.

## Why This Task Exists

Hoy, si no existe deal, el operador sale del builder, crea deal en HubSpot, espera al sync, y vuelve. Fase E permite que desde el mismo builder se dispare la creacion del deal en HubSpot + mirror en Greenhouse en un drawer minimo. Es el que mas se siente en UX diaria.

## Goal

- Comando `createDealFromQuoteContext` con idempotencia + audit + outbox.
- Endpoint `POST /api/commercial/organizations/:id/deals` que lo expone.
- Extension del Cloud Run `hubspot-greenhouse-integration` con `POST /deals`.
- Drawer UI en Quote Builder: "Crear deal nuevo" + mini-form (name, amount opcional, pipeline, stage).
- Defaults inteligentes: pipeline por BU del actor, stage inicial (`appointmentscheduled` o equiv), owner = actor.
- Promocion automatica a `opportunity` si la organization estaba en `prospect`.
- Threshold: monto > $50M CLP requiere approval (reutiliza workflow de TASK-504).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §6.4, §7.3, §7.4, §9.2
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (Cloud Run ops)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Toda creacion de deal pasa por `createDealFromQuoteContext`; no hay write paths paralelos.
- Idempotency key obligatorio si el caller lo incluye; dedupe por `hubspotCompanyId + dealName + actor` en 5min.
- Capability gate `commercial.deal.create`.
- Rate limit 20/min por user, 100/hora por tenant.
- Cloud Run service endpoint auth via OIDC token (patron existente).
- Si `organization.lifecycle_stage === 'prospect'`, invocar `promoteParty → opportunity` en la misma transaccion.
- Tag en HubSpot: custom property `gh_deal_origin='greenhouse_quote_builder'`.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-534-commercial-party-lifecycle-program.md`

## Dependencies & Impact

### Depends on

- TASK-535 cerrada (`promoteParty`, schema party)
- `greenhouse_commercial.deals` (TASK-453 cerrada)
- `hubspot-greenhouse-integration` Cloud Run service + deploy access
- HubSpot Deals API credentials
- Approval workflow existente (TASK-504) para thresholds

### Blocks / Impacts

- TASK-541 Fase G (quote-to-cash) — reutiliza el mismo `dealId` creado aqui
- UX del operador comercial — elimina el pain point principal

### Files owned

- `src/lib/commercial/party/commands/create-deal-from-quote-context.ts`
- `src/app/api/commercial/organizations/[id]/deals/route.ts`
- `src/views/greenhouse/finance/CreateDealDrawer.tsx` (nuevo)
- `src/hooks/useCreateDeal.ts`
- `services/hubspot-greenhouse-integration/routes/deals.ts` (nuevo — en el Cloud Run repo)
- `migrations/YYYYMMDDHHMMSS_task-539-deal-create-attempts.sql` (tabla de idempotencia)

## Current Repo State

### Already exists

- `greenhouse_commercial.deals` con sync inbound desde HubSpot
- Cloud Run `hubspot-greenhouse-integration` con POST/PATCH quotes
- Approval workflow de TASK-504 operativo
- Pattern de drawer en Quote Builder (`ContactDrawer`, etc.)
- Entitlements runtime

### Gap

- No existe comando `createDealFromQuoteContext`.
- No existe endpoint `POST /organizations/:id/deals`.
- Cloud Run no tiene `POST /deals`.
- Drawer UI no existe.
- Tabla de idempotencia `deal_create_attempts` no existe.
- Custom property HubSpot `gh_deal_origin` queda gobernada por el manifest canónico `src/lib/hubspot/custom-properties.ts` y el reconcile `scripts/ensure-hubspot-custom-properties.ts`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Cloud Run `POST /deals`

- Endpoint en `hubspot-greenhouse-integration` que wrappea HubSpot Deals API.
- Input shape: dealName, amount, currency, pipeline, stage, ownerId, companyId, businessLine, correlationId.
- Output: `{ hubspotDealId, pipelineUsed, stageUsed, ownerUsed }`.
- Manejo de rate limit HubSpot con retry exponencial + DLQ.

### Slice 2 — Tabla idempotencia + comando

- Migracion `deal_create_attempts` (pk: idempotencyKey).
- Comando `createDealFromQuoteContext` en `src/lib/commercial/party/commands/`.
- Transaccion: resolve company → check idempotency → POST Cloud Run → insert deals + update idempotency → promoteParty si aplica → emit outbox.
- Rollback completo si cualquier step falla.

### Slice 3 — Endpoint Next.js

- `POST /api/commercial/organizations/:id/deals`.
- Capability gate + rate limit.
- Threshold check: si amount > $50M CLP, crear approval request y retornar `{ status: 'pending_approval', approvalId }`.
- Response: `{ dealId, hubspotDealId, organizationPromoted, requiresApproval }`.

### Slice 4 — Drawer UI en Quote Builder

- `CreateDealDrawer.tsx` con form (RHF + zod).
- Campos: Nombre, Monto estimado, Moneda, Pipeline (dropdown con default), Stage (dropdown con default), Owner (default actor).
- CTA primaria: "Crear deal y asociar".
- Feedback tras exito: toast + setear `hubspotDealId` en el Quote form.
- Uso del skill `greenhouse-ui-review` antes de commit.

### Slice 5 — Hook + wiring

- `useCreateDeal` encapsula llamada + error handling + refresh del selector de deals.
- Integrar CTA "Crear deal nuevo" en el selector de deal existente (TASK-463 entrego el selector).

### Slice 6 — Custom properties HubSpot + docs

- Validar/aplicar `gh_deal_origin` via `pnpm hubspot:deal-properties` o `pnpm hubspot:properties -- --object deals`.
- Documentar en `docs/documentation/finance/crear-deal-desde-quote-builder.md` el flujo funcional.

## Out of Scope

- Edicion de deal desde Greenhouse (post-create). El update sigue en HubSpot hasta TASK-540 o posterior.
- Bulk create deals.
- Creacion de deals sin organization (no aplica; siempre asociados a company).
- Sync inbound de deal recien creado — el reactive worker lo hace por su cuenta en proximo tick.
- Dual approval ($100M CLP) — diferido a TASK-541 que orquesta quote-to-cash.

## Detailed Spec

Ver `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` §6.4, §7.3, §7.4, §9.2 para contratos.

### Defaults

- Pipeline: derivado de `actor.businessLineCode` via `hubspot_deal_pipeline_config`.
- Stage: primer stage open del pipeline seleccionado.
- Owner: HubSpot user id del actor (mapeado desde `identity_profiles.hubspot_user_id`). Fallback al default del BU si no mapeado.

### Threshold logic

```
if (amount_clp > 50_000_000) {
  createApprovalRequest({ type: 'commercial_deal_create', amount, actor });
  return { status: 'pending_approval', approvalId };
}
// else: execute immediately
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Desde el Quote Builder, clickear "Crear deal nuevo" abre drawer con defaults sensatos.
- [ ] Submit crea deal en HubSpot en < 3s p95 y lo mirror en `greenhouse_commercial.deals`.
- [ ] Organization en `prospect` queda en `opportunity` tras creacion del primer deal.
- [ ] Idempotency key evita double-creation si el caller reintenta con el mismo key.
- [ ] Rate limit 20/min dispara 429.
- [ ] Amount > $50M genera approval request y NO crea el deal hasta aprobacion.
- [ ] Custom property `gh_deal_origin='greenhouse_quote_builder'` presente en el deal HubSpot.
- [ ] Sin capability, endpoint retorna 403.
- [ ] Tests integracion cubren happy path, rate limit, idempotency, threshold, lifecycle promotion.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.
- [ ] Skill `greenhouse-ui-review` aprobo pre-commit del drawer.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm staging:request POST /api/commercial/organizations/<id>/deals '{"dealName":"Test","amount":1000000,"currency":"CLP"}'`
- Validar en HubSpot sandbox que el deal aparece con custom property
- Test manual completo del drawer en staging

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

- [ ] Update TASK-534 umbrella
- [ ] Deploy Cloud Run service validated
- [ ] Doc funcional publicada en `docs/documentation/finance/`

## Follow-ups

- Edicion inline de deal (post-create) — decidir si va en TASK-540 o programa nuevo.
- Dual approval $100M CLP — orquestar en TASK-541.
- Bulk create para migraciones historicas — no prioritario.
- Resolver open question #7 (pricing HubSpot API) con volumen real post-rollout.
