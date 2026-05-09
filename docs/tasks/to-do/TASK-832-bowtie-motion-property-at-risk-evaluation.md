# TASK-832 — Bow-tie Motion Property `is_at_risk` Evaluation + Projection

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `Bow-tie V1.0`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial / integrations.hubspot`
- Blocked by: `TASK-830, TASK-831`
- Branch: `task/TASK-832-bowtie-at-risk-motion`

## Summary

Implementa el motor de evaluación de `is_at_risk` (Bow-tie §7.1) — la única motion property que es Greenhouse-authoritative. Cron Cloud Scheduler diario + on-demand reactive consumer evalúa los 3 triggers compuestos (MSA expiring, MRR decline, ICO health red) por cliente activo; cuando estado cambia, escribe `clients.is_at_risk` + `at_risk_triggered_by[]` y proyecta a HubSpot Company. Las otras 3 motion properties (`is_in_expansion`, `is_in_renewal`, `is_advocate`) son HubSpot-authoritative y se setean por workflows HubSpot directos (Bow-tie §11.3).

## Why This Task Exists

El Bow-tie §10.3 dashboard "At Risk Accounts" lista clientes con `is_at_risk=true` con razón de activación. Sin la lógica que setea la property en HubSpot, el dashboard queda vacío. Y como los 3 triggers requieren datos canónicos Greenhouse (`msa_end_date`, `total_mrr` history, ICO score), el cómputo debe vivir Greenhouse-side. HubSpot solo recibe el resultado boolean + array de razones.

Sin `is_at_risk`:

- Renewal motion al que apunta el Bow-tie §7.1 trigger #1 (MSA < 60 días sin Renewal abierto) queda invisible para sales hasta que se les avise manualmente
- Customer success / CSM (futuro) no tiene cola priorizada
- Reliability signal `client.at_risk.evaluation_lag` no existe → silent failure si cron falla

## Goal

- Helper canónico `evaluateAtRiskTriggersForClient(organizationId)` con 3 sub-evaluators puros
- Comando atómico `applyAtRiskState(organizationId, newState, triggers)` con outbox event
- Cron Cloud Scheduler `*/0 8 * * * America/Santiago` → ops-worker `/at-risk/evaluate-batch`
- Reactive consumer escucha `client.contractual_state.changed.v1` para evaluación on-demand cuando cambia MSA/payment activity
- Reactive consumer projecta `Company.is_at_risk` + `Company.at_risk_reasons` (custom property nueva opcional V1.0) a HubSpot
- Reliability signal `client.at_risk.evaluation_lag` (steady < 24h)
- Tests unit + integration

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` §7.3 (`is_at_risk` triggers spec)
- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` §7.1 — fuente canónica de los 3 triggers
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `CLAUDE.md` sección "Vercel cron classification + migration platform (TASK-775)" — async_critical → Cloud Scheduler

Reglas obligatorias:

- Cron diario en Cloud Scheduler + ops-worker (NO Vercel cron — async_critical)
- Helper `evaluateAtRiskTriggersForClient` puro (read-only); commands separan I/O
- ICO health score reader ya existe en `src/lib/ico-engine/` — reusar
- Trigger #2 (MRR decline > 15% sostenido 3 meses) usa `bowtie_metrics_monthly` VIEW (TASK-833) si está lista; en su ausencia usa subquery directo con FX-aware
- NUNCA computar `is_at_risk` en read paths de UI — siempre lee `clients.is_at_risk` snapshot
- NUNCA proyectar a HubSpot fuera del consumer canónico; las mutaciones a HubSpot van por outbox event + reactive projection

## Normative Docs

- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` §7.3
- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` §7.1

## Dependencies & Impact

### Depends on

- TASK-830 — property `is_at_risk` existe en HubSpot Company
- TASK-816 Delta — columna `clients.is_at_risk` + `at_risk_triggered_by[]`
- TASK-831 — projection infrastructure (este task reusa el bridge PATCH)
- ICO health score reader (TASK-... ICO engine) ✅
- ops-worker + Cloud Scheduler infrastructure (TASK-775) ✅

### Blocks / Impacts

- TASK-834 dashboard At Risk Accounts — consume el snapshot
- Notification Hub V1.1 — alerts on transition false→true

### Files owned

- `src/lib/commercial/at-risk/evaluate-triggers.ts` — helper puro 3 sub-evaluators
- `src/lib/commercial/at-risk/apply-at-risk-state.ts` — comando atómico
- `src/lib/commercial/at-risk/__tests__/*.test.ts`
- `services/ops-worker/server.ts` — endpoint `/at-risk/evaluate-batch` + `/at-risk/evaluate-one`
- `services/ops-worker/deploy.sh` — agregar Cloud Scheduler job
- `src/lib/sync/projections/hubspot-motion-properties.ts` — projection consumer
- `src/lib/reliability/queries/client-at-risk-evaluation-lag.ts`

## Current Repo State

### Already exists

- ICO engine + health score readers
- `bowtie_metrics_monthly` VIEW (TASK-833 — paralelo)
- HubSpot bridge Cloud Run con Company PATCH
- Outbox + reactive consumer infrastructure

### Gap

- No existe evaluador canónico de `is_at_risk`
- No hay cron schedulado
- No hay projection a HubSpot de motion properties

## Scope

### Slice 1 — Sub-evaluators puros

3 helpers en `src/lib/commercial/at-risk/evaluators/`:

1. `evaluateMsaExpiringTrigger(organizationId)` → boolean + reason
   - Lee `engagement_commercial_terms` activo kind=msa con `effective_to < now() + 60 days`
   - Verifica si hay deal open en HubSpot pipeline Renewal asociado a esta org (consulta bridge GET deals filtered)
   - Si MSA expiring AND no Renewal deal abierto → trigger active
2. `evaluateMrrDeclineTrigger(organizationId)` → boolean + reason
   - Lee `bowtie_metrics_monthly.total_mrr_clp` o subquery FX-aware últimos 3 meses
   - Computa delta acumulado: `(mrr_now - mrr_3m_ago) / mrr_3m_ago`
   - Si delta < -0.15 (decline > 15%) → trigger active
3. `evaluateIcoHealthRedTrigger(organizationId)` → boolean + reason
   - Reusa reader ICO existente
   - Si health score en rango rojo → trigger active

Tests: cada evaluator con 4-6 escenarios (positive/negative/edge).

### Slice 2 — Composite evaluator + state command

`evaluateAtRiskTriggersForClient(organizationId)`:

- Invoke 3 sub-evaluators en paralelo (`Promise.all`)
- Devuelve `{ isAtRisk: boolean, triggers: ('msa_expiring'|'mrr_decline'|'ico_red')[], rationale }`

`applyAtRiskState(organizationId, newState, triggers, actor)`:

- Atomic tx: SELECT FOR UPDATE clients
- Si state cambia respecto a `clients.is_at_risk` o triggers cambian:
  - UPDATE `clients.is_at_risk`, `at_risk_triggered_by`, `is_at_risk_changed_at`
  - Emit outbox `client.at_risk.changed.v1`
- Idempotente: re-correr con mismo input no genera segundo write

### Slice 3 — Cron batch evaluation

ops-worker endpoint `POST /at-risk/evaluate-batch`:

- Lee todas las orgs con `clients.client_kind IN ('active','self_serve','project')`
- Para cada org: `evaluateAtRiskTriggersForClient` → `applyAtRiskState`
- En paralelo con concurrency limit 5 para no saturar ICO reader o HubSpot bridge
- Wraps via `wrapCronHandler({ name: 'commercial.at_risk.evaluate', domain: 'commercial', run })`
- Cloud Scheduler job: `*/0 8 * * * America/Santiago` (8 AM diario)

### Slice 4 — On-demand reactive consumer

```ts
registerProjection({
  name: 'at_risk_evaluation_on_contract_change',
  triggerEvents: ['client.contractual_state.changed.v1'],
  domain: 'commercial',
  extractScope: (event) => ({ entityId: event.payload.organizationId }),
  refresh: async ({ entityId }) => {
    const evaluation = await evaluateAtRiskTriggersForClient(entityId)
    await applyAtRiskState(entityId, evaluation.isAtRisk, evaluation.triggers, 'reactive_consumer')
    return { status: 'completed' }
  },
})
```

### Slice 5 — HubSpot projection consumer

```ts
registerProjection({
  name: 'hubspot_motion_at_risk',
  triggerEvents: ['client.at_risk.changed.v1'],
  domain: 'integrations.hubspot',
  refresh: async ({ entityId }) => {
    const org = await getOrganizationFromPostgres(entityId)
    if (!org?.hubspot_company_id) return { status: 'skip', reason: 'no_hubspot_company' }
    const client = await getClientByOrganization(entityId)
    await projectCompanyMotionProperty(org.hubspot_company_id, {
      is_at_risk: client.is_at_risk,
      at_risk_reasons: client.at_risk_triggered_by?.join(',') ?? null,
    })
    return { status: 'completed' }
  },
})
```

### Slice 6 — Reliability signal

`client.at_risk.evaluation_lag` — kind=lag, severity=warning si > 36h, error si > 72h

Query: `MAX(now() - clients.is_at_risk_changed_at) WHERE client_kind IS NOT NULL`. Si todos tienen evaluation reciente (< 24h en steady), signal OK.

Wire-up subsystem `Bow-tie Sync`.

### Slice 7 — Tests

- Unit cada sub-evaluator (4-6 scenarios)
- Unit composite evaluator (combinations)
- Unit `applyAtRiskState` idempotency + transition logic
- Integration: insert MSA con effective_to en 30 días sin Renewal → cron evaluates → state changes → outbox event → projection
- Integration: dead_letter on HubSpot fail

## Out of Scope

- `is_in_expansion` / `is_in_renewal` projection — HubSpot-authoritative, workflows HubSpot lo setean directo (Bow-tie §11.3)
- `is_advocate` / `is_advocate_individual` — operator manual en HubSpot
- Notification on transition false→true — V1.1 cuando Notification Hub esté listo
- Property `at_risk_reasons` extension HubSpot — opcional V1.0 (operator decide al ejecutar TASK-830 runbook)
- Auto-create Renewal deal cuando msa_expiring trigger activate — Bow-tie §11.3 lo prevé V1.1+

## Detailed Spec

Triggers Bow-tie §7.1 verbatim:

```text
is_at_risk = (
  msa_end_date < now() + 60 days AND no open Renewal deal
) OR (
  total_mrr declined > 15% sostenido 3 meses (delta acumulado negativo)
) OR (
  ICO health score en rango rojo (combinación OTD% bajo + RpA alto + engagement bajo)
)
```

Para HubSpot Renewal deal lookup: bridge GET `/crm/v3/objects/deals/search` con filter `pipeline=renewal_pipeline_id AND associations.companies CONTAINS hubspot_company_id AND dealstage NOT IN closedwon,closedlost`.

## Acceptance Criteria

- [ ] 3 sub-evaluators puros con 4-6 tests cada uno
- [ ] Composite evaluator devuelve correcto isAtRisk + triggers
- [ ] `applyAtRiskState` idempotente
- [ ] Cron `commercial.at_risk.evaluate` registrado en Cloud Scheduler + ops-worker
- [ ] Reactive consumer on-demand registrado
- [ ] Projection consumer registrado y escucha `client.at_risk.changed.v1`
- [ ] Reliability signal `evaluation_lag` registrado y wired
- [ ] Smoke staging: simular MSA expiring → verificar `clients.is_at_risk=TRUE` post-cron + HubSpot Company.is_at_risk=true
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/lib/commercial/at-risk` verde

## Verification

- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/lib/commercial/at-risk`
- Smoke staging: insertar MSA test con effective_to en 30 días → trigger Cloud Scheduler manual → verificar state change
- `pnpm staging:request /admin/operations` → verificar signal visible bajo Bow-tie Sync

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo cruzado: TASK-834 dashboard At Risk Accounts puede consumir snapshot

## Follow-ups

- V1.1: Notification Hub alert on transition false→true
- V1.1: auto-create Renewal deal cuando msa_expiring trigger activate
- V1.1: tuning thresholds basado en producción real (15% MRR decline puede ser muy strict)
- Métrica: % cliente entre triggers (para distinguir health score del MSA expiring)

## Open Questions

- ¿Property HubSpot `at_risk_reasons` extension (string CSV) lo creamos en TASK-830 o V1.1? Recomendación V1.0: sí, simple y útil para sales filter.
- ¿MRR decline delta acumulado o promedio mensual? Bow-tie dice "delta acumulado". Implementación straightforward.
- ¿ICO health score "rojo" tiene threshold canónico? Verificar con ICO engine spec antes de implementar.
- ¿On-demand reactive evaluation también dispara cuando cambia ICO health? Recomendación V1.1: sí — agregar trigger event `ico.health_score.changed.v1` cuando emerja.
