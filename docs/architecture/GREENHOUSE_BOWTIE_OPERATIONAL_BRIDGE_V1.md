# Greenhouse Bow-tie Operational Bridge V1

> **Version:** 1.0
> **Created:** 2026-05-07 por Claude (Opus 4.7)
> **Audience:** Backend engineers, commercial ops, agentes que toquen integraciones HubSpot ↔ Greenhouse, dashboards comerciales, GTM operators
> **Related:** `spec/Arquitectura_BowTie_Efeonce_v1_1.md`, `GREENHOUSE_CLIENT_LIFECYCLE_V1.md`, `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`, `GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`, `GREENHOUSE_EVENT_CATALOG_V1.md`, `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
> **Supersedes:** ninguno (spec puente nuevo)

---

## 0. Status

Contrato arquitectónico nuevo desde 2026-05-07. Resuelve la divergencia detectada el mismo día entre dos arquitecturas paralelas creadas en abril 2026:

- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` (canonical commercial — HubSpot CRM lifecycle, motion properties, NRR/GRR/Expansion Rate, dashboards sales-facing)
- `GREENHOUSE_CLIENT_LIFECYCLE_V1.md` (canonical operational — client_lifecycle_cases, checklist, audit trail, cascade reactive consumers)

Estado actual del repo:

- Tasks TASK-816..821 implementan el operational layer (`client_lifecycle_cases` + comandos + UI + reliability + HubSpot trigger semi-automático). NO proyectan a HubSpot el `Company.lifecyclestage` ni alimentan las 13 contractual properties que el Bow-tie demanda
- Bow-tie spec define 12 stages en empresas, 4 motion properties transversales, 13 contractual properties alimentadas desde Greenhouse, 6 métricas (NRR reina), 3 dashboards y 19 workflows. **No existe** el sync que las tasks debían cubrir
- Sin este spec puente, ambos sistemas operan en silos y producen drift garantizado

Este documento es el contrato canónico de unión. Es referenciado por TASK-816..821 (vía Delta blocks) y por las tasks nuevas TASK-830..834.

---

## 1. Core Thesis

> **Greenhouse es el source of truth operativo del cliente. HubSpot es la lente sales/marketing del estado real.**

Tres consecuencias directas:

1. **Greenhouse manda, HubSpot espeja.** Toda mutación de `Company.lifecyclestage`, `client_kind`, contractual properties, motion properties y métricas se origina en Greenhouse. HubSpot recibe via reactive projection. Cualquier cambio manual en HubSpot que diverja del estado Greenhouse se reverte automáticamente y emite drift signal.
2. **El operational case Greenhouse y el HubSpot Lifecycle Stage son lentes complementarias del mismo proceso, no sistemas independientes.** El case captura el "cómo operar" (checklist, blockers, audit) durante una transición; el stage captura "dónde está el cliente en el bow-tie". Hay equivalencia 1:1 entre ambos.
3. **El Bow-tie no se modifica.** Su modelo de 12 stages + 4 motion properties + 13 contractual properties + 6 métricas + 3 dashboards es la arquitectura comercial comprometida. Greenhouse se adapta para servirlo.

Por lo tanto:

- El operational case (`client_lifecycle_cases`) sigue siendo legítimo — aporta lo que el Bow-tie no especifica (cómo operar 90 días de onboarding, cómo bloquear offboarding con invoices abiertas)
- El Bow-tie sigue siendo la fuente de verdad de la **narrativa comercial** (qué tipo de cliente, qué motion, qué metrics)
- Esta spec define el **contrato de equivalencia y projection** entre ambos

---

## 2. Problem Statement

Sin este spec puente, los siguientes gaps producen drift garantizado:

| Gap | Síntoma operativo |
|---|---|
| `Company.lifecyclestage` HubSpot no se sincroniza con `client_lifecycle_case.status` Greenhouse | Sales ve "Onboarding" en HubSpot mientras Delivery ve "completed" en Greenhouse, o viceversa |
| Clasificación post-onboarding (Active/Self-Serve/Project) no existe en Greenhouse | NRR breakdown por client_kind imposible. Dashboards Bow-tie §10.1 no implementables |
| 13 contractual properties HubSpot sin alimentación | `total_mrr`, `customer_since`, `msa_end_date` quedan vacíos. NRR/GRR/Expansion Rate son no-computables |
| 4 motion properties sin triggers | `is_at_risk` queda manual o ausente. Dashboard At Risk Accounts vacío |
| 6 métricas Bow-tie sin engine de cálculo | Operación comercial pierde la métrica reina (NRR) |
| Misclick de operador HubSpot pisa estado Greenhouse | Sin drift detection, datos divergen silenciosamente |

Esta spec resuelve los 6 gaps con un contrato unificado.

---

## 3. Architectural Premise

### 3.1 Single source of truth

Para cada datum del Bow-tie, exactamente un sistema es authoritativo:

| Datum | Source of Truth | Lente HubSpot |
|---|---|---|
| `lifecyclestage` empresa | Greenhouse (computado desde `clients.client_kind` + `client_lifecycle_cases`) | Read-only projection |
| `client_kind` (Active/Self-Serve/Project) | Greenhouse `clients.client_kind` | Read-only via `lifecyclestage` |
| `total_mrr`, `msa_value_monthly`, `saas_mrr`, `active_sows_value_monthly` | Greenhouse (computed desde MSA + SOW + SaaS) | Read-only projection |
| `msa_end_date`, `msa_start_date`, `active_msa_id` | Greenhouse `engagement_commercial_terms` | Read-only projection |
| `customer_since`, `last_expansion_date`, `last_renewal_date`, `lifetime_value_ytd` | Greenhouse derived | Read-only projection |
| `is_in_expansion`, `is_in_renewal` | HubSpot pipelines (Expansion, Renewal) — datos viven en HubSpot deals | Read-only desde Greenhouse perspective |
| `is_at_risk` | Greenhouse computed (3 triggers Bow-tie §7.1) | Read-only projection |
| `is_advocate` | HubSpot manual (set by operator) | Read-only desde Greenhouse |
| `Lifecycle Stage` contacto (7 stages) | HubSpot directo (lead funnel) | NO projection desde Greenhouse en V1.0 |
| `is_advocate_individual` contacto | HubSpot manual | NO projection en V1.0 |
| 6 métricas (NRR, GRR, etc.) | Greenhouse computed via VIEW canónica | Dashboard espejo opcional via property |

### 3.2 Direction of sync

```
                           Greenhouse (PostgreSQL canonical)
                                       │
              ┌────────────────────────┼─────────────────────────┐
              │                        │                         │
              ▼                        ▼                         ▼
    HubSpot (sales/marketing)    UI Greenhouse Admin    Métricas / dashboards
    via reactive projection      (drawer, listing,      Greenhouse-native
    (10 properties Company,      banner, tiles)         (NRR, GRR, etc.)
    lifecyclestage projection)
                              ◀── webhooks (deal stage, company change) ──
                              ◀── operator-in-the-loop activate case ──
```

- Outbound projection (Greenhouse → HubSpot): **canonical async via reactive consumer + outbox events**, mismo patrón TASK-771/773 que finance projections
- Inbound webhooks (HubSpot → Greenhouse): mismo patrón TASK-706 (companies) + TASK-813 (services). TASK-821 agrega deals
- Internal Greenhouse: lectura directa via PG (PG-first, BQ fallback)

### 3.3 Operational case ↔ Bow-tie stage equivalence

El operational case y el Bow-tie stage son lentes complementarias del mismo estado:

```
Bow-tie stage (HubSpot Company.lifecyclestage)
    ↑ projected by Greenhouse
    │
    │  derives from
    │
    ▼
Greenhouse computed state:
    {
      clients.status,
      clients.client_kind,
      client_lifecycle_cases.status (when active),
      client_lifecycle_cases.case_kind (when active),
      engagement_commercial_terms (active),
      services + saas_subscriptions (active),
      payment activity (last 90d)
    }
```

La equivalencia formal vive en §4.

---

## 4. Stage Equivalence Map

Tabla canónica de mapping bidireccional entre los 12 Bow-tie stages (empresa) y el estado Greenhouse computado.

| Bow-tie stage | `Company.lifecyclestage` | Greenhouse computed state | Notas |
|---|---|---|---|
| 1. Subscriber | `subscriber` | `organizations.lifecycle_stage='subscriber'` | Entra via webhook contact subscriber |
| 2. Lead | `lead` | `organizations.lifecycle_stage='lead'` | webhook contact lead |
| 3. MQL | `marketingqualifiedlead` | `organizations.lifecycle_stage='mql'` | redefinición operativa Bow-tie §5.2 (research + AEO + ICP fit ≥ 3) |
| 4. PQL | `pql` | `organizations.lifecycle_stage='pql'` | trial activo en Kortex/Verk |
| 5. SQL | `salesqualifiedlead` | `organizations.lifecycle_stage='sql'` | scorecard 4+/6 BDR |
| 6. Opportunity | `opportunity` | `organizations.lifecycle_stage='opportunity'` | deal abierto pipeline New Business |
| 7. Onboarding | `onboarding` | **`client_lifecycle_cases.case_kind='onboarding' AND status IN ('draft','in_progress','blocked')`** | activo durante 0-90 días post Closed-Won |
| 8. Active Account | `active_account` | **`clients.client_kind='active' AND clients.status='active' AND no active onboarding/offboarding case`** | MSA + SOW activos |
| 9. Self-Serve Customer | `self_serve_customer` | **`clients.client_kind='self_serve' AND clients.status='active' AND no active case`** | Solo SaaS subscription, sin MSA |
| 10. Project Customer | `project_customer` | **`clients.client_kind='project' AND clients.status='active' AND no active case`** | SOW puntual sin MSA |
| 11. Former Customer | `former_customer` | **`clients.status='inactive' AND last completed case_kind='offboarding'`** | sin revenue activo |
| 12. Other | `other` | `organizations.organization_type IN ('partner','vendor','employee','aliado')` | non-customer entities |

**Casos de transición**:

| De → A | Trigger | Greenhouse action | HubSpot projection |
|---|---|---|---|
| Opportunity → Onboarding | Deal Closed-Won webhook (TASK-821) | Crear `client_lifecycle_cases` `case_kind='onboarding' status='draft'` | `Company.lifecyclestage='onboarding'` cuando case se activa |
| Onboarding → Active/Self-Serve/Project | `resolveLifecycleCase(onboarding completed)` | Invocar `classifyClientFromContract` (§5) → setear `clients.client_kind` + `instantiateClientForParty` | `Company.lifecyclestage = active_account|self_serve_customer|project_customer` |
| 8 ↔ 9 ↔ 10 (oscilación) | MSA/SOW/SaaS contract change | `reclassifyClientOnContractChange` → si cambia `client_kind`, escribe `client_kind_history` | `Company.lifecyclestage` projected new |
| Active/Self-Serve/Project → Former Customer | `resolveLifecycleCase(offboarding completed)` cascade | `archiveClientForParty` + revoke users | `Company.lifecyclestage='former_customer'` + `Company.churn_date=now()` |
| Former → Onboarding (win-back) | Deal Closed-Won con organization existente offboarded | Crear `case_kind='reactivation'` con `previous_case_id` lineage | `Company.lifecyclestage='onboarding'` durante reactivation, luego classification |

---

## 5. Client Kind Classifier

Helper canónico `classifyClientFromContract(organizationId)` en `src/lib/client-lifecycle/classifier/classify-from-contract.ts`. Implementa la regla del Bow-tie §5.2 con extensión para oscilación.

### 5.1 Decision matrix

| MSA activo | SOWs activos | SaaS subs activos | `client_kind` | Bow-tie stage |
|---|---|---|---|---|
| ✅ | ≥ 1 | any | `active` | Active Account (8) |
| ❌ | ≥ 1 | any | `project` | Project Customer (10) |
| ❌ | 0 | ≥ 1 | `self_serve` | Self-Serve Customer (9) |
| ✅ | 0 | any | `active` | Active Account (8) — MSA solo sin SOW puede ocurrir transitorio |
| ❌ | 0 | 0 | `null` (no clasificable) | Former Customer (11) o no clasificable |

**Reglas de empate**:
- MSA activo siempre clasifica como `active`, independiente de SaaS o SOWs (MSA es contrato master)
- "Activo" = `effective_to IS NULL OR effective_to > CURRENT_DATE`
- SOW puntual = SOW sin MSA padre asociado; SOW bajo MSA cuenta solo para Active

### 5.2 Inputs canónicos

```ts
async function classifyClientFromContract(organizationId: string, client?: Kysely | Transaction): Promise<{
  clientKind: 'active' | 'self_serve' | 'project' | null
  rationale: {
    activeMsaId: string | null
    activeSowCount: number
    activeSaasSubscriptions: string[]
    decisionTrigger: 'msa_active' | 'sow_only' | 'saas_only' | 'no_revenue'
  }
  bowtieStage: 'active_account' | 'self_serve_customer' | 'project_customer' | 'former_customer'
}>
```

Lee:
- `engagement_commercial_terms WHERE organization_id=$1 AND effective_to IS NULL` → MSA + SOWs activos
- `services WHERE organization_id=$1 AND saas_subscription IS NOT NULL AND active=TRUE` → SaaS subs activas
- NUNCA muta — es función pura para read paths y para inputs a `reclassifyClientOnContractChange`

### 5.3 Atomic write path

`reclassifyClientOnContractChange(organizationId, actor)` invocado por reactive consumer cuando llega outbox `client.contractual_state.changed.v1`:

1. SELECT FOR UPDATE `clients` row
2. Invoke `classifyClientFromContract`
3. Si `clientKind` cambia respecto a `clients.client_kind`:
   - UPDATE `clients.client_kind`, `clients.client_kind_changed_at`
   - INSERT `client_kind_history` row append-only con rationale completo
   - Emit outbox `client.classified.v1` (dispara HubSpot projection)
4. Toda en una transacción

### 5.4 Manual override

Capability `client.lifecycle.classify` permite operador forzar `client_kind` cuando regla automática no aplica (caso edge):

- Reason ≥ 20 chars obligatorio
- Audit log + outbox `client.classification.overridden.v1`
- Auto-revierte si emerge nuevo contract change que invalida el override; reliability signal alerta

---

## 6. Contractual Properties Projection

Reactive consumer canónico `hubspot_contractual_properties` (TASK-831) que escucha outbox events y proyecta a HubSpot Company las 13 contractual properties del Bow-tie §8.1.

### 6.1 Property mapping (Greenhouse → HubSpot)

| HubSpot property | Tipo | Source Greenhouse | Compute strategy |
|---|---|---|---|
| `active_msa_id` | text | `engagement_commercial_terms.term_id` WHERE kind=msa AND active | Latest active MSA per org |
| `msa_start_date` | date | `engagement_commercial_terms.effective_from` | From active MSA |
| `msa_end_date` | date | `engagement_commercial_terms.contract_end_date` | From active MSA |
| `msa_value_monthly` | currency | `engagement_commercial_terms.monthly_value_clp` | From active MSA |
| `active_sows_count` | number | COUNT `engagement_commercial_terms` WHERE kind=sow AND active | Computed |
| `active_sows_value_monthly` | currency | SUM `engagement_commercial_terms.monthly_value_clp` WHERE kind=sow AND active | Computed |
| `saas_subscriptions` | multi-select | `services` WHERE saas_subscription IN (kortex, verk) AND active | Array values |
| `saas_mrr` | currency | SUM monthly value de SaaS subs | Computed |
| `total_mrr` | currency | `msa_value_monthly + active_sows_value_monthly + saas_mrr` | Computed Greenhouse-side (Bow-tie §8.1 dice "HubSpot calculated", overrideado: Greenhouse computa para SSOT) |
| `customer_since` | date | `clients.customer_since` | First Closed-Won date |
| `last_expansion_date` | date | `clients.last_expansion_date` | Last Expansion deal won |
| `last_renewal_date` | date | `clients.last_renewal_date` | Last Renewal deal won |
| `lifetime_value_ytd` | currency | SUM `engagement_commercial_terms.monthly_value_clp × months_active` YTD | Computed |

### 6.2 Trigger events

Reactive consumer escucha:

- `client.classified.v1` → projecta `lifecyclestage` (§4) + recompute toda la batería de properties
- `client.contractual_state.changed.v1` → emitido por commands de `engagement_commercial_terms` cuando cambia MSA/SOW/SaaS
- `services.materialized.v1` (TASK-813) → cuando un service nace/muta en HubSpot
- `expense_payments.recorded.v1` (TASK-766) → afecta `lifetime_value_ytd`
- `income_payments.recorded.v1` (TASK-571) → afecta `lifetime_value_ytd`

### 6.3 Idempotency + dead_letter

- Projection idempotente: UPSERT por `hubspot_company_id` con last-write-wins (Greenhouse manda)
- `outbox_reactive_log(event_id, 'hubspot_contractual_properties')` previene re-process
- Max retries 5 → dead_letter
- Reliability signal `hubspot.contractual_properties.sync_lag` (steady=0)

### 6.4 Backfill operacional

Script one-shot `scripts/integrations/hubspot/backfill-contractual-properties.ts --apply` para recovery o initial seed. Idempotente.

---

## 7. Motion Properties Projection

4 motion properties Bow-tie §7.1. División clara por authority:

### 7.1 `is_in_expansion` — HubSpot authoritativo

Trigger Bow-tie: deal abierto en pipeline Expansion. Como los deals viven en HubSpot, esta property se setea por workflow HubSpot directo (Bow-tie §11.3 workflow `set_in_expansion`).

**Greenhouse-side**: read-only. Si emerge necesidad, exponer desde HubSpot via webhook → `clients.is_in_expansion` snapshot. V1.1+.

### 7.2 `is_in_renewal` — HubSpot authoritativo

Igual que `is_in_expansion`. Workflow HubSpot `set_in_renewal`. Greenhouse no projecta.

### 7.3 `is_at_risk` — Greenhouse authoritativo

Trigger compuesto Bow-tie §7.1 (cualquiera de 3):

1. `msa_end_date` < 60 días sin deal abierto en Renewal
2. `total_mrr` decline > 15% sostenido 3 meses
3. ICO health score rojo

Reactive consumer + cron diario `evaluate_at_risk` (TASK-832):

- Cron Cloud Scheduler `*/0 8 * * * America/Santiago` → ops-worker `/at-risk/evaluate`
- Para cada `clients.client_kind IN ('active','self_serve','project')`:
  - Eval 3 triggers, detect activation o deactivation
  - Si cambia respecto a `clients.is_at_risk`, UPDATE + outbox `client.at_risk.changed.v1`
  - Reactive consumer projecta `Company.is_at_risk` a HubSpot

### 7.4 `is_advocate` (empresa) + `is_advocate_individual` (contacto) — HubSpot manual

Bow-tie §7.1 dice trigger manual con criteria múltiple. Operador setea en HubSpot directamente. Greenhouse no involucrado V1.0.

V1.1: detectar referidos auto-documentados via `services.referral_source` y proponer activación.

---

## 8. Bow-tie Metrics Engine

Las 6 métricas Bow-tie §9 viven en Greenhouse como VIEW canónica + helper TS + reliability signals (TASK-833). Patrón TASK-571/699/766 (VIEW + helper + lint rule).

### 8.1 VIEW canónica `greenhouse_serving.bowtie_metrics_monthly`

Una fila por (year, month). Columnas:
- `month_start_date`
- `mrr_at_start_clp`, `mrr_at_end_clp`
- `expansion_mrr_clp`, `churn_mrr_clp`, `downsell_mrr_clp`
- `nrr_pct` = `(mrr_at_start + expansion - churn - downsell) / mrr_at_start * 100`
- `grr_pct` = `(mrr_at_start - churn - downsell) / mrr_at_start * 100`
- `expansion_rate_pct` = `expansion_mrr / mrr_at_start * 100`
- `logo_count_at_start`, `logo_count_at_end`, `logo_retention_pct`
- `time_to_expansion_avg_days` (cohort: Closed-Won del mes vs primera expansión)
- `renewal_rate_pct` (MSAs renovados / MSAs eligible en el mes)
- `client_kind_breakdown_jsonb` = `{active: {count, mrr}, self_serve: ..., project: ...}`

### 8.2 Helper TS

`src/lib/commercial/bowtie-metrics/get-monthly-metrics.ts`:

```ts
async function getBowtieMetrics(input: {
  fromMonth: string  // 'YYYY-MM'
  toMonth: string
}): Promise<BowtieMetricsRollup>
```

### 8.3 Reliability signals (subsystem `Bow-tie Health`)

| Signal | Kind | Severity | Steady | Detecta |
|---|---|---|---|---|
| `bowtie.metrics.nrr_below_target` | drift | warning | ≥ 100% | NRR rolling 12m < 100% |
| `bowtie.metrics.nrr_below_critical` | drift | error | ≥ 90% | NRR rolling 12m < 90% |
| `bowtie.metrics.grr_below_target` | drift | warning | ≥ 90% | GRR rolling 12m < 90% |
| `bowtie.metrics.expansion_rate_below_target` | drift | warning | ≥ 15% trimestral | Expansion stuck |
| `bowtie.metrics.logo_retention_below_target` | drift | warning | ≥ 95% | Churn de cuentas alto |
| `bowtie.metrics.compute_lag` | lag | error | < 24h | VIEW stale > 24h |

### 8.4 Lint rule

`greenhouse/no-untokenized-bowtie-metric-math` modo `error`. Bloquea callsites que computen NRR/GRR fuera de la VIEW canónica.

---

## 9. Outbox Events Catalog

Eventos nuevos versionados v1 introducidos por este spec puente. Se documentan en `GREENHOUSE_EVENT_CATALOG_V1.md` Delta.

| Event | Cuándo | Payload (key fields) | Consumers |
|---|---|---|---|
| `client.classified.v1` | `reclassifyClientOnContractChange` flippea `client_kind` | `{organizationId, clientId, fromKind, toKind, rationale, occurredAt}` | hubspot_contractual_properties projection, BQ projection, dashboard refresh |
| `client.contractual_state.changed.v1` | MSA/SOW/SaaS contract changes (effective_to set, new term created) | `{organizationId, changedField, oldValue, newValue, sourceTable, sourceId}` | reclassifyClientOnContractChange consumer |
| `client.classification.overridden.v1` | Manual override via capability | `{organizationId, fromKind, toKind, reason, overriddenBy}` | audit alert, reliability signal |
| `client.at_risk.changed.v1` | Cron evaluate_at_risk detecta cambio | `{organizationId, fromState, toState, triggeredBy: 'msa_expiring' \| 'mrr_decline' \| 'ico_red', detectedAt}` | hubspot motion projection, At Risk dashboard |
| `client.bowtie_stage.projected.v1` | Reactive consumer proyectó lifecyclestage a HubSpot | `{organizationId, hubspotCompanyId, lifecyclestage, projectedAt}` | audit, drift detection |

---

## 10. Drift Detection

### 10.1 Stage drift

Reliability signal `client.lifecycle.hubspot_stage_drift` (TASK-820 extendido):

- Query: leer `Company.lifecyclestage` desde HubSpot vs computed expected desde Greenhouse equivalence map
- Steady = 0 (cero drift)
- Severity = error si count > 0 con edad > 5 min (margen para projection latency)

### 10.2 Property drift

Reliability signal `hubspot.contractual_properties.drift`:

- Query: para cada empresa con `clients.client_kind IS NOT NULL`, recomputa expected values y compara contra HubSpot
- Tolerancia: $1 CLP en valores numéricos, exact match en dates/text
- Steady = 0

### 10.3 Reverse-projection on manual change

Si operador HubSpot cambia `Company.lifecyclestage` o cualquier contractual property manualmente:

1. Webhook `company.propertyChange.lifecyclestage` (TASK-821 extendido) detecta
2. Compara contra Greenhouse expected
3. Si diverge: re-proyecta valor canónico Greenhouse a HubSpot (last-write-wins de Greenhouse)
4. Emit outbox `client.bowtie_stage.manual_change_reverted.v1`
5. Notify operador comercial via Teams ("Tu cambio en HubSpot fue revertido — el estado canónico vive en Greenhouse")

---

## 11. Reliability Signals (rollup)

Subsystem nuevo `Bow-tie Sync` agrupa todos los signals introducidos por este spec:

| Signal | Owner task |
|---|---|
| `client.lifecycle.hubspot_stage_drift` | TASK-820 (Delta) |
| `hubspot.contractual_properties.sync_lag` | TASK-831 |
| `hubspot.contractual_properties.drift` | TASK-831 |
| `hubspot.contractual_properties.dead_letter` | TASK-831 |
| `client.classification.override_anomaly_rate` | TASK-816/817 (Delta) |
| `client.at_risk.evaluation_lag` | TASK-832 |
| `bowtie.metrics.nrr_below_target` | TASK-833 |
| `bowtie.metrics.nrr_below_critical` | TASK-833 |
| `bowtie.metrics.grr_below_target` | TASK-833 |
| `bowtie.metrics.expansion_rate_below_target` | TASK-833 |
| `bowtie.metrics.logo_retention_below_target` | TASK-833 |
| `bowtie.metrics.compute_lag` | TASK-833 |
| `commercial.hubspot.config_drift` | TASK-830 |

Subsystem rollup `Bow-tie Health` máx severity wins. Visible en `/admin/operations`.

---

## 12. Defense in Depth (TASK-742 7-layer template)

| Layer | Mechanism |
|---|---|
| 1. DB constraints | CHECK `clients.client_kind` enum, FK `client_kind_history → clients`, anti-UPDATE/DELETE triggers en `client_kind_history`, CHECK metadata_json shape en `client_lifecycle_cases` |
| 2. Application guard | Capability granular `client.lifecycle.classify`; classifier es función pura sin side-effects; reactive consumers idempotentes |
| 3. UI affordance | Chip `client_kind` en banner cliente con tooltip explicando rationale; botón "Re-clasificar" capability-gated; advertencia visible si HubSpot diverge |
| 4. Reliability signals | 13 signals listed §11, todos con steady declarado |
| 5. Audit log | `client_kind_history` append-only; `client_lifecycle_case_events` append-only (existente); outbox events v1 inmutables |
| 6. Approval workflow | Override classifier requiere capability + reason ≥ 20 chars + audit |
| 7. Outbox events v1 | 5 nuevos eventos versionados; cascade async via reactive consumer + dead_letter; recovery scripts idempotentes |

---

## 13. 4-Pillar Score

### Safety
- **Qué puede salir mal**: classifier mal clasifica → KPIs Bow-tie sesgados; projection HubSpot pisa cambio manual del operador HubSpot; oscilación 8↔9↔10 dispara cambio de cohort en métricas
- **Gates**: capability granular `client.lifecycle.classify` separada; classifier read-only; manual override con reason ≥ 20; projection es last-write-wins de Greenhouse explícito (operator HubSpot ve advertencia)
- **Blast radius si falla**: un cliente o un mes de métricas; cuantificable y recoverable
- **Verificado por**: tests classifier (24 escenarios MSA × SOW × SaaS); concurrencia 2 contract changes; HubSpot 429 retry; drift signal steady = 0
- **Riesgo residual**: HubSpot manual stage change durante 5min ventana de reverse-projection. Mitigado con notification + signal

### Robustness
- **Idempotencia**: classifier función pura; projection UPSERT por `hubspot_company_id`; `outbox_reactive_log` dedup
- **Atomicidad**: classify + persist + outbox en transacción Kysely; projection eventually consistent vía outbox
- **Race protection**: `SELECT FOR UPDATE` en classify; `client_kind_history` UNIQUE (organization_id, effective_from); UNIQUE partial active assignment per kind
- **Constraint coverage**: CHECK `client_kind` enum, CHECK metadata_json shape para hubspot_deal_type cuando trigger_source='hubspot_deal', FK + UNIQUE + anti-UPDATE/DELETE triggers
- **Verificado por**: tests classifier matrix completa, concurrencia, HubSpot rate limit handling

### Resilience
- **Retry policy**: outbox + reactive consumer + dead_letter (TASK-771/773 pattern); HubSpot API 429 con exponential backoff
- **Dead letter**: 3 dead_letter signals (`hubspot.contractual_properties`, `client.lifecycle.cascade`, `commercial.hubspot.config_drift`)
- **Reliability signals**: 13 listed §11
- **Audit trail**: `client_kind_history` append-only inmutable; `client_lifecycle_case_events` append-only; 5 outbox events versionados
- **Recovery**: backfill scripts idempotentes (`backfill-client-classification.ts`, `backfill-contractual-properties.ts`); reverse-projection automática en drift

### Scalability
- **Hot path Big-O**: classifier O(1) por client; projection batch O(N clients) cada 5 min Cloud Scheduler
- **Cardinalidad**: ~50-200 clientes activos → 10x = 500-2000. HubSpot rate limit 100 req/10s cubre con margen
- **Async paths**: 100% — projection, classifier on contract change, métricas en VIEW
- **Cost a 10x**: lineal trivial; partitioning innecesario V1
- **Pagination**: cursor en listing dashboards; VIEW `bowtie_metrics_monthly` indexada por (month_start_date)

---

## 14. Hard Rules (anti-regression)

- **NUNCA** modificar `Company.lifecyclestage` en HubSpot manualmente cuando hay un Greenhouse case activo o `clients.client_kind` definido — drift signal lo detecta y reverse-projection lo sobrescribe
- **NUNCA** computar `client_kind` en código de surface (UI/API) — siempre via `classifyClientFromContract` helper canónico
- **NUNCA** computar NRR/GRR/Expansion Rate fuera de la VIEW canónica `bowtie_metrics_monthly` — lint rule `greenhouse/no-untokenized-bowtie-metric-math` rompe build
- **NUNCA** escribir property HubSpot directo desde un command Greenhouse — siempre via reactive projection (consistencia con TASK-771/773)
- **NUNCA** asumir que `Company.lifecyclestage` HubSpot es source of truth — Greenhouse manda
- **NUNCA** emitir `client.classified.v1` sin haber escrito previamente la fila correspondiente en `client_kind_history`. Trigger DB lo enforce.
- **NUNCA** mezclar `client_kind` (Active/Self-Serve/Project) con `clients.status` (active/inactive). Son ortogonales: un cliente puede ser `client_kind='self_serve' AND status='active'`. Former Customer = `status='inactive'`.
- **NUNCA** clasificar cuando `clients.status='inactive'` — los formers no clasifican; volver a clasificar solo durante reactivation case completion.
- **NUNCA** crear un proceso de sync que escriba `Company.lifecyclestage` o las 13 contractual properties fuera del consumer canónico `hubspot_contractual_properties`.
- **NUNCA** modificar `client_kind_history` (append-only). Triggers anti-UPDATE/DELETE enforced.
- **SIEMPRE** capturar `hubspot_deal_type` del primer Closed-Won en `case.metadata_json` para que classifier tenga el input que el Bow-tie §5.2 demanda.
- **SIEMPRE** que un módulo (Finance, Delivery, Commercial) cambie un input contractual del cliente, debe emitir outbox `client.contractual_state.changed.v1` para disparar reclassification + projection.
- **SIEMPRE** que se complete un case lifecycle, el cascade (TASK-820) debe incluir HubSpot lifecyclestage projection en la lista de side-effects.
- **SIEMPRE** declarar el datum como Greenhouse-authoritative o HubSpot-authoritative en §3.1. Mixto no es una opción.

---

## 15. Dependencies & Impact

### Depende de
- `clients` + `organizations` (TASK-535) ✅
- `engagement_commercial_terms` time-versioned (TASK-802) ✅
- `services` + `engagement_phases/outcomes` (TASK-801/803) ✅
- Outbox + ops-worker reactive consumers (TASK-771/773) ✅
- HubSpot bridge Cloud Run (TASK-574) ✅
- HubSpot webhook infrastructure (TASK-706/813) ✅
- Capability platform (TASK-403) ✅
- Reliability platform (TASK-RELIABILITY) ✅
- `client_lifecycle_cases` + commands (TASK-816..821, en flight)
- HubSpot Developer Portal config (TASK-830, no-code)

### Impacta a (lecturas / cascades)
- `Company.lifecyclestage` HubSpot — Greenhouse projection authoritative
- `Company.{active_msa_id, total_mrr, ...}` HubSpot — 13 properties projected
- `Company.is_at_risk` HubSpot — Greenhouse projected
- Métricas comerciales (NRR, GRR, etc.) — Greenhouse computed exclusivo
- Dashboards Bow-tie — Greenhouse-side

### Out of scope V1.0
- Sync Greenhouse → HubSpot del Lifecycle Stage de **contactos** (V1.1)
- Workflows automatizados HubSpot (config manual via runbook V1.0; automation API V1.2 si emerge)
- `is_advocate` y `is_advocate_individual` projection (HubSpot manual V1.0)
- Reverse webhook detection y auto-revert para todas las 13 properties (V1.0 cubre solo lifecyclestage; resto V1.1)
- Pipeline Renewal automation creation en HubSpot (config manual TASK-830)
- Multi-currency MRR (V1.0 asume CLP-equivalent; V1.1 multi-currency con FX rate)

---

## 16. Roadmap by Slices

| # | Slice | Tasks | Bloqueante de | Estimación |
|---|---|---|---|---|
| 1 | HubSpot Developer Portal config + drift detect | TASK-830 | Todo el resto | runbook + verify script (~1d) |
| 2 | DDL extension `clients.client_kind` + `client_kind_history` + classifier helper | TASK-816 (Delta) + TASK-817 (Delta) | Downstream classifier consumers | ~3d |
| 3 | Cascade extensión: HubSpot lifecyclestage projection en `resolveLifecycleCase` | TASK-820 (Delta) | UI productiva con HubSpot sync | ~2d |
| 4 | Webhook deals trigger + drift detection bidireccional minimal | TASK-821 (Delta) | Auto-onboarding draft confiable | ~2d |
| 5 | Greenhouse → HubSpot 13 contractual properties projection | TASK-831 | Bow-tie metrics | ~3d |
| 6 | Motion property `is_at_risk` evaluation + projection | TASK-832 | At Risk dashboard | ~2d |
| 7 | Bow-tie metrics engine (VIEW + helper + signals) | TASK-833 | Dashboards | ~3d |
| 8 | Bow-tie dashboards Greenhouse-side (Revenue Health, Expansion Engine, At Risk) | TASK-834 | Cierre V1.0 Bow-tie | ~5d |

Total V1.0 alineado al Bow-tie: ~21 días-persona incremental sobre las 6 tasks originales (~24d). Total programa Bow-tie completo: ~45d.

---

## 17. Open Questions

1. **¿`Company.total_mrr` lo computa Greenhouse y proyecta, o HubSpot calculated property?** Bow-tie §8.1 dice "HubSpot (suma)". Recomendación spec puente: **Greenhouse computa y proyecta**, porque Greenhouse tiene los inputs canónicos (engagement_commercial_terms con FX). HubSpot calculated property requeriría que las 3 properties source ya estén en HubSpot — lo cual ya cubre TASK-831. Decidir si Greenhouse projecta `total_mrr` directo o lo deja HubSpot computed.
2. **Pipeline Renewal en HubSpot — ¿Greenhouse crea automáticamente Renewal deals via API cuando `msa_end_date` < 90 días sin Renewal abierto?** Bow-tie §11.3 workflow `auto_create_renewal_deal` dice "crear deal en pipeline Renewal". V1.0 keep manual; V1.1 considerar automation API.
3. **Reactivation cuando cliente fue offboardeado y vuelve con nueva HubSpot company (no la original)** — ¿`previous_case_id` apunta al case viejo o queda NULL? Recomendación: solo si la organization es la misma (validable por `tax_id`). Caso edge data-driven.
4. **Multi-currency MRR**: si emerge cliente Globe que paga USD, ¿`total_mrr` se proyecta en CLP-equivalent o HubSpot acepta multi-currency property? V1.0 CLP-equivalent rate del payment_date (TASK-766 pattern); V1.1 multi-currency.
5. **Dashboards Greenhouse-side ¿reemplazan los HubSpot o coexisten?** Recomendación: coexistir V1.0; Greenhouse para fidelidad de datos canónicos, HubSpot para sales workflow narrative. V1.1 evaluar deprecation HubSpot dashboards si tracking se vuelve molesto.
6. **`is_in_expansion` / `is_in_renewal` ¿valen sync inverso desde HubSpot a Greenhouse?** Para que Greenhouse-side dashboards y reliability signals los conozcan. Recomendación V1.1: sí, como `clients.is_in_expansion` snapshot via webhook.

---

## 18. Glossary

| Término | Definición |
|---|---|
| **Bow-tie** | Modelo arquitectónico canónico de Winning by Design adaptado por Efeonce (`spec/Arquitectura_BowTie_Efeonce_v1_1.md`) con 12 stages empresa + 4 motion + 13 contractual + 6 métricas |
| **Operational case** | Instancia de `client_lifecycle_cases` (TASK-816..821): proceso operativo Greenhouse-side con checklist, audit, blockers |
| **Stage** | Valor de `Company.lifecyclestage` HubSpot. 12 valores posibles per Bow-tie §5.1 |
| **Client kind** | Clasificación post-onboarding: `active | self_serve | project`. Vive en `clients.client_kind` |
| **Classifier** | Helper `classifyClientFromContract` que decide `client_kind` desde MSA + SOW + SaaS subscriptions |
| **Projection** | Sync Greenhouse → HubSpot via reactive consumer. Last-write-wins de Greenhouse |
| **Drift** | Divergencia detectada entre estado HubSpot y estado Greenhouse esperado. Detectada por reliability signal, resuelta por reverse-projection |
| **Motion property** | 4 properties transversales Bow-tie §7 (`is_in_expansion`, `is_in_renewal`, `is_at_risk`, `is_advocate`) |
| **Contractual property** | 13 properties Bow-tie §8.1 alimentadas desde Greenhouse (`active_msa_id`, `total_mrr`, etc.) |

---

## 19. References

- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` — fuente canónica del modelo comercial
- `GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — operational case spec (TASK-816..821)
- `GREENHOUSE_360_OBJECT_MODEL_V1.md` — anchor `organizations.organization_id`
- `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — máquina de estados identidad TASK-535
- `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` — engagement primitives TASK-801/802/803
- `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — patrón canónico reactive consumers
- `GREENHOUSE_EVENT_CATALOG_V1.md` — catálogo outbox events
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry signals
- `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — webhook canonical pattern
- `CLAUDE.md` — convenciones operativas
