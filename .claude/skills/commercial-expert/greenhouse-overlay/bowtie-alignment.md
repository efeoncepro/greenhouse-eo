---
last-revised: 2026-05-07
type: greenhouse-overlay
---

# Bow-tie Alignment (Greenhouse-specific)

Cómo el Bow-tie spec se manifiesta en operación comercial diaria dentro del repo greenhouse-eo.

**Ground truth**:
- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` (modelo CRM HubSpot, 12 stages + 4 motion + 13 contractual + 6 metrics)
- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` (contrato puente Greenhouse ↔ HubSpot)
- `docs/strategy/ASAAS_MANIFESTO_V1.md` (doctrina del modelo)

---

## Cómo se mapea Bow-tie a operación Greenhouse

| Bow-tie stage (HubSpot) | Greenhouse computed state | Quién opera | Owner role |
|---|---|---|---|
| 1-2-3 (Subscriber/Lead/MQL) | `organizations.lifecycle_stage` | Marketing + BDR | Luis Reyes / Valentina |
| 4 (PQL) | `organizations.lifecycle_stage='pql'` | Auto via product event | Automation |
| 5 (SQL) | `organizations.lifecycle_stage='sql'` | BDR scorecard | Luis Reyes |
| 6 (Opportunity) | `organizations.lifecycle_stage='opportunity'` | AE | Julio |
| 7 (Onboarding) | `client_lifecycle_cases.case_kind='onboarding' status='in_progress'` | Account Lead + Delivery | Account Lead |
| 8 (Active Account) | `clients.client_kind='active'` | Account Lead | Account Lead |
| 9 (Self-Serve) | `clients.client_kind='self_serve'` | Automation + future CSM | Automation |
| 10 (Project) | `clients.client_kind='project'` | PM | PM |
| 11 (Former Customer) | `clients.status='inactive'` + offboarding case completed | Win-back motion | Julio |
| 12 (Other) | `organizations.organization_type ∈ partners/vendors/employees` | N/A | N/A |

---

## Cómo se ejecuta la transición Closed-Won → Onboarding

1. Sales cierra deal en HubSpot pipeline New Business
2. HubSpot webhook `deal.propertyChange.dealstage='closedwon'` llega a `/api/webhooks/hubspot-deals` (TASK-821)
3. Webhook handler valida + crea `client_lifecycle_cases.status='draft'` con `case_kind='onboarding'` + `triggerSource='hubspot_deal'`
4. **Account Lead recibe notificación** vía Teams (helper canónico `pnpm teams:announce`)
5. Account Lead revisa case + activa via `/admin/clients/[orgId]/lifecycle` (transición `draft → in_progress`)
6. Operational case ejecuta checklist canónico (10 items, owner_role per item)
7. Al completar required items: `resolveLifecycleCase`
8. Cascade reactive consumer:
   - `instantiateClientForParty` → crea `client_id` en `greenhouse_core.clients`
   - `classifyClientFromContract` → setea `clients.client_kind`
   - Outbox `client.classified.v1` → projection HubSpot Company.lifecyclestage = `active_account | self_serve_customer | project_customer`
9. HubSpot Company queda en stage 8/9/10 according a classification

**Puntos de fricción comunes**:
- Sales cambia dealstage closedwon sin completar `dealtype` → handler emite `deal_type_missing` outbox, case no se crea hasta operator complete
- Account Lead no activa el draft case → operational drift, signal `draft_pending_overdue` a 7 días
- Classifier sin MSA registrado → `client_kind=null`, signal warning

---

## Cómo se ejecuta la transición Active → Former Customer

1. Operador comercial inicia offboarding case via `/admin/clients/[orgId]/lifecycle` con `case_kind='offboarding'` (manual o vía webhook closedlost / `lifecyclestage=churned`)
2. Pre-flight blocker check (TASK-817): invoices abiertas, phases sin outcome, payment_orders no terminales
3. Si blockers, case en `status='blocked'` hasta resolución
4. Checklist offboarding (10 items, owner_role per item)
5. `resolveLifecycleCase` → cascade:
   - `archiveClientForParty` → setea `clients.status='inactive'`, `client_kind=null`
   - `revokeClientUsersAccess` → revoca portal access
   - Propagate `engagement.outcome_recorded` per phase activa
   - Projection HubSpot Company.lifecyclestage = `former_customer` + `churn_date=now()`

---

## Win-back motion

Cuando un Former Customer vuelve (deal Closed-Won con organization existente offboarded):

1. Webhook handler crea `client_lifecycle_cases.case_kind='reactivation' status='draft'` con `previous_case_id` lineage al offboarding anterior
2. Operator activa
3. Checklist `reactivation_v1` (5 items: verify previous case resolved, reinstate terms, reinstate assignments, reinstate access, confirm billing resumed)
4. Resolve → cascade:
   - `reactivateClientForParty` → flippea `clients.status='active'`, recompute `client_kind` via classifier
   - HubSpot Company.lifecyclestage durante reactivation = `onboarding`, post-completion = stage 8/9/10

Win-back motion ratio (`reactivation cases completed / former customers count` per quarter) es métrica útil aunque no esté en las 6 canónicas Bow-tie.

---

## Las 4 motion properties — autoridad split

| Property | Authority | Setter |
|---|---|---|
| `is_in_expansion` | HubSpot | Workflow `set_in_expansion` cuando deal abierto en pipeline Expansion |
| `is_in_renewal` | HubSpot | Workflow `set_in_renewal` cuando deal abierto en pipeline Renewal |
| `is_at_risk` | **Greenhouse** | TASK-832 cron + reactive consumer (3 triggers) |
| `is_advocate` | HubSpot manual | Operator setea cuando referido / case público / co-marketing |

Implicación: `is_at_risk` es la única que requires Greenhouse-side compute. Las otras 3 viven en HubSpot pipelines y workflows.

---

## Las 13 contractual properties — projection rules

Greenhouse computa + proyecta a HubSpot Company. La projection corre vía reactive consumer (TASK-831) escuchando 4 trigger events:

- `client.classified.v1`
- `client.contractual_state.changed.v1`
- `services.materialized.v1`
- `engagement_commercial_terms.applied.v1`

Compute logic vive en `src/lib/integrations/hubspot/contractual-projection/compute-properties.ts`. NUNCA recalcular inline.

| HubSpot property | Compute |
|---|---|
| `active_msa_id` | latest active MSA per org |
| `msa_start_date / end_date / value_monthly` | from active MSA |
| `active_sows_count / value_monthly` | aggregate over active SOWs |
| `saas_subscriptions / saas_mrr` | aggregate active SaaS subs |
| `total_mrr` | `msa_value + sow_value + saas_mrr` (CLP-equivalent) |
| `customer_since` | first Closed-Won date |
| `last_expansion_date / renewal_date / lifetime_value_ytd` | derived from deals + payments |

---

## Drift detection bidireccional

### Greenhouse-side drift (HubSpot diverge from expected)

Reliability signal `client.lifecycle.hubspot_stage_drift` (TASK-820 Delta):

- Lee `Company.lifecyclestage` HubSpot vs computed expected per spec puente §4
- Si diverge > 5 min → alert
- **Reverse-projection**: Greenhouse re-aplica el valor canónico (last-write-wins de Greenhouse)

### Operator manual change

Si operador HubSpot cambia `Company.lifecyclestage` manualmente:

1. Webhook `company.propertyChange.lifecyclestage` (TASK-821 Delta) detecta
2. Compara contra expected
3. Si diverge: re-projecta valor canónico
4. Notify operador via Teams: "Tu cambio en HubSpot fue revertido — el estado canónico vive en Greenhouse"

Esto entrena al equipo a respetar el contract.

---

## Métricas operativas Bow-tie en Greenhouse

VIEW `greenhouse_serving.bowtie_metrics_monthly` (TASK-833):

```sql
SELECT
  month_start_date,
  nrr_pct,
  grr_pct,
  expansion_rate_pct,
  logo_retention_pct,
  time_to_expansion_avg_days,
  renewal_rate_pct,
  client_kind_breakdown_jsonb
FROM greenhouse_serving.bowtie_metrics_monthly
WHERE month_start_date >= '2026-01-01'
ORDER BY month_start_date DESC;
```

Helper TS: `src/lib/commercial/bowtie-metrics/get-monthly-metrics.ts` (`getBowtieMetrics({fromMonth, toMonth})`).

Reliability signals subsystem `Bow-tie Health`:

- `bowtie.metrics.nrr_below_target` — warning si rolling 12m < 100%
- `bowtie.metrics.nrr_below_critical` — error si < 90%
- `bowtie.metrics.grr_below_target` — warning si < 90%
- `bowtie.metrics.expansion_rate_below_target` — warning si < 15% trim
- `bowtie.metrics.logo_retention_below_target` — warning si < 95%
- `bowtie.metrics.compute_lag` — error si VIEW stale > 24h

---

## Hard rules de operación commercial alineada Bow-tie

- **NUNCA** mover `Company.lifecyclestage` HubSpot manualmente cuando hay `client_lifecycle_case` activo o `client_kind` definido — drift signal lo detecta y reverse-projection lo sobrescribe
- **NUNCA** computar NRR/GRR fuera de la VIEW canónica — lint rule `greenhouse/no-untokenized-bowtie-metric-math` rompe build
- **NUNCA** describir el modelo Efeonce como "agencia con software" — usar ASaaS terminology (manifesto §1)
- **NUNCA** vender un Active Account sin classifier rationale documentado en `client_kind_history`
- **NUNCA** dar pitch a un Globe Account sin map a uno de los 4 productos como eje + 0-3 como leverage
- **SIEMPRE** que un módulo (Finance, Delivery, Commercial) cambie un input contractual del cliente, emitir outbox `client.contractual_state.changed.v1`
- **SIEMPRE** que se complete un case lifecycle, el cascade debe incluir HubSpot lifecyclestage projection
- **SIEMPRE** referenciar el manifesto ASaaS al hablar del modelo de negocio externamente

---

## Cuándo invocar otras skills sobre Bow-tie

- `arch-architect` cuando emerge necesidad de modificar el spec puente o introducir nuevo motion
- `greenhouse-finance-accounting-operator` cuando una decisión Bow-tie toca pricing / margin / FX
- `hubspot-greenhouse-bridge` cuando hay friction operativa con el bridge Cloud Run
- `hubspot-ops` cuando hay friction en HubSpot CLI ops
