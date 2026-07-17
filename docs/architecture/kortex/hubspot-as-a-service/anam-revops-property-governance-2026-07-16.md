# ANAM RevOps Property Governance

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** quote-variance reconciliation complete; Down-sell visibility reverted; structural target schema still requires approval
> **Sources:** Maria Paz email decisions, ANAM Notion backlog, runtime schema readback and authenticated portal inspection

## Executive decision

The operator clarified the governing distinction: `Down-sell` is a Retention movement, not a type of income. It remains hidden in `tipo_de_ingreso`; the four existing income reports must not treat contraction as another income category.

`variacion_contrato` now uses the ratified visible vocabulary `Variación vs. cotizado` with `Igual`, `Mayor`, `Menor`; stable internal values were preserved. No CRM record, requiredness rule, workflow, pipeline or backfill was changed.

The structural decision remains: Deal owns the commercial opportunity, while the already active standard `Service` object owns each adjudicated/contracted service and its renewal lifecycle. Commercial foundations are implemented first; Ticket, billing and operational reporting follow. See [`anam-commercial-first-operating-model-2026-07-16.md`](anam-commercial-first-operating-model-2026-07-16.md).

## Revenue movement model

### Definition of contraction

`Down-sell` means a continuing client or contract whose new comparable recurring value is lower than the previous comparable recurring value.

It excludes:

- churn or a lost renewal;
- a first sale awarded below its quotation;
- a temporary billing fluctuation without contractual change;
- a nominal change caused only by currency, indexation or billing periodicity;
- a discount inside a first sale.

### Recommended target model

Do not convert `tipo_de_ingreso` to multi-select. That would double-count Deals and corrupt win-rate denominators. Approve three explicit dimensions instead:

| Axis | Recommended values | Purpose |
|---|---|---|
| Income/commercial type | Ratify the visible current taxonomy without Down-sell | Classifies the commercial Deal for income reports. |
| Retention movement | Expansion / No material change / Contraction / Churn | Compares an eligible prior Service with its renewal outcome. |
| Quote variance | Greater / Equal / Lower | Compares awarded amount with quoted amount. |

The current `tipo_de_ingreso` remains the commercial classification while its final visible taxonomy is ratified. Line items preserve compound service components. Retention movement must not be inferred from that field.

Required evidence before contraction reporting:

- prior contract or Deal reference;
- comparable prior recurring value;
- current awarded recurring value;
- normalized currency and periodicity;
- contract start and end dates;
- reliable Closed Won/Lost state;
- manual override reason and data owner.

`variacion_contrato` answers a different question: awarded amount versus quoted amount. It should ideally be derived from two monetary values, not entered as an unsupported opinion. `monto_original` has only three records and is not an adequate baseline.

## Current property decisions

`RETIRE` below means target retirement after dependency inspection and migration. It does not authorize archival or deletion.

### Authenticated consumer readback

The portal UI exposed aggregate consumer counts for the highest-risk Deal properties:

| Property | Fill rate | Declared consumers |
|---|---:|---|
| `tipo_de_ingreso` | 908/1,240 (73.23%) | 9: reports 4, workflows 2, create-record form 1, dependent conditional logic 1, property card 1. |
| `variacion_contrato` | 0/1,240 | 0. |
| `resultado_de_retencion` | 12/1,240 (0.97%) | 1 dependent conditional rule. |
| `es_la_renovacion_de_un_negocio_similar_anterior_` | 557/1,240 (44.92%) | 0 declared consumers, but record migration is still required. |
| `zona` | 399/1,240 (32.18%) | 1 dependent conditional rule. |
| `tipo_de_servicio` | 0/1,240 | 0. |
| `linea_de_negocio_anam` | 1,239/1,240 (99.92%) | 4: views 3, create-record form 1. |

This removes the earlier assumption that every consumer was completely unobservable, but it does not expose each workflow/report contract in this cut. `tipo_de_ingreso` is demonstrably high-impact and cannot be treated as a presentation-only field.

### Deal

| Decision | Properties | RevOps treatment |
|---|---|---|
| KEEP | `linea_de_negocio_anam`, `tipo_proceso_comercial_anam`, `sucursal_de_anam`, `objetivo_del_estudio`, `zona` | Define owner and capture stage. `zona` is execution geography and cannot allocate 100% of revenue to every selected region. |
| CHANGE | `tipo_de_ingreso`, `variacion_contrato`, `monto_original`, `comuna` | Separate principal movement from mechanism; derive quote variance from money; define `comuna` as execution location. |
| DEFER | `tipo_de_contrato`, `caracteristicas_del_punto_de_muestreo`, `condiciones_de_acceso_al_punto_de_muestreo`, `direccion_del_punto_de_muestreo`, `comparacion_con_norma`, `instrumento_ambiental_fiscalizable`, `fecha_estimada_del_servicio`, `frecuencia_del_servicio`, `numero_de_muestras`, `parametros_por_cotizar`, `servicio_autorizado_por_sma`, `tipo_de_matriz`, `tomador_de_muestra` | Keep optional until the grain of a quote is approved. Repeated points, matrices and parameters should use line items or a quotation-scope custom object. |
| DEFER/INSPECT | `resultado_de_retencion` | Candidate Retention movement field with 12 records and one dependent rule. Define eligible cohort, capture event and Service relationship before reuse. |
| RETIRE | `es_la_renovacion_de_un_negocio_similar_anterior_`, `tipo_de_servicio` | Duplicate or conflict with the target lifecycle. Inspect consumers and migrate first; 122 Deals still depend only on the obsolete renewal boolean. |

### Company

| Decision | Properties | RevOps treatment |
|---|---|---|
| KEEP | `razon_social`, `giro`, `eerr_`, `sucursal_de_anam` | Durable account/legal attributes with an Administration, Quality or Commercial owner. |
| CHANGE | `rut`, `region_de_chile`, `comuna`, `provincia_de_chile`, `sector_estrategico`, `fuente_de_referencia` | Normalize RUT and decide uniqueness; define legal/HQ geography; complete the province catalog; ratify sectors; distinguish declared referral from native source attribution. |
| DEFER | `nombre_de_representante_legal`, `instrumento_ambiental_fiscalizable` | Prefer an associated Contact role for the representative; decide whether regulation is durable account data or quote scope. |
| RETIRE | `caracteristicas_del_punto_de_muestreo`, `comparacion_con_norma`, `condiciones_de_acceso_al_punto_de_muestreo`, `direccion_del_punto_de_muestreo`, `fecha_estimada_del_servicio`, `frecuencia_del_servicio`, `matriz`, `norma_a_comparar`, `numero_de_muestras`, `parametros_para_cotizacion`, `parametros_por_cotizar`, `servicio_autorizado_por_sma`, `servicio_requerido`, `servicios_contratados`, `tipo_de_muestra`, `tomador_de_muestra` | These are transactional quote/service facts or should be derived from won Deals. Company copies currently have negligible adoption and are the wrong grain. |

Use native Parent Company/Child Company associations and `hs_object_id` for operational identity. Do not use RUT as the only hierarchy key.

### Contact

| Decision | Properties | RevOps treatment |
|---|---|---|
| KEEP | `tipo_de_relacion` | Useful person-to-ANAM relationship classification. |
| CHANGE | `canal` | Preserve only as declared acquisition channel and reconcile it with HubSpot Original Source. |
| DEFER | `rut` | Personal identifier requires purpose, legal basis, access and retention rules. |
| RETIRE | `clasificacion_cliente`, `laboratorio`, `objetivo_del_estudio` | Client value belongs to Company; laboratory and study objective belong to account/service scope or Deal. |

## Properties still to design

Do not create these as isolated fields. First approve their source of truth and object grain.

| Domain | Target model | Dashboard/workflow enabled |
|---|---|---|
| Contract/service | Standard HubSpot `Service` (`0-162`) associated to the originating Deal and Company, with external ID, prior/current comparable value, currency, periodicity, start and end dates | Active portfolio, renewal cohorts, 60/90-day alerts, GRR, NRR and contraction. |
| Quotation | Deal plus quotation version/scope object or line items; quoted and awarded money | Quote-to-award conversion, captured opportunity and variance. |
| Billing/service execution | Governed synchronization keyed by source-system ID. Enrich Service only for service-level lifecycle facts; keep repeated invoices, OC, HES/HAS, EDP and LIMS events at their own approved grain | Billing backlog, rejection aging and operational throughput. |
| Billing contacts | Contact-to-Company association role, not free-text Company fields | Correct routing and administrative handoff. |
| Tickets | ANAM case taxonomy, reason, status, SLA, priority and routing owner | Support volume, SLA, reopen rate and escalation. |
| Market | Governed sector/SAM dataset associated to Company or sector | Penetration, market gap and strategic coverage. |

The 16,898-row billing dataset must not be flattened into Company or Deal properties.

## Commercial-first dashboard sequence

### 0. Data Quality Control Tower

Publish first. Show coverage, invalid combinations, stale records and denominator readiness. Current baselines include `tipo_de_ingreso` 908/1,240 (73.2%), service line 1,239/1,240, commercial process 1,229/1,240, Deal zone 399/1,240, and zero coverage for quote variance, Company region and strategic sector.

### 1. Commercial Growth

New sales, won amount, win rate, cycle and pipeline by service line, process and owner. Use explicit won/lost stages while `Radar 0%` is incorrectly marked closed.

### 2. Expansion and Retention

Start with clearly labelled proxy counts for renewal, upsell and cross-sell. Do not publish GRR, NRR, churn rate or contraction value until contract baselines, normalized money and the full renewable cohort exist.

### 3. Quotation and Award

Distribution and monetary difference between quoted and awarded values, captured opportunity and quote-to-award conversion. Blocked until both amounts and the quotation event are defined.

### 4. Service, Geography and Sector Mix

Revenue and win rate by `linea_de_negocio_anam`; execution geography from Deal; legal/HQ region and sector from Company. Multi-region Deals need allocation or a non-additive count view.

### 5. Commercial Loyalty

Upcoming renewals, relationship coverage, preventive activity and risk signals. This measures action before the Retention outcome; it does not duplicate GRR/NRR.

### 6. Operational and Billing - second priority

Ticket SLA, billing status, rejection aging and service throughput. Blocked until Ticket and billing/service object contracts are approved.

## Decision gates

1. Ratify income type separately from Retention movement and quote variance.
2. Approve contract, quotation and billing object grains and source systems.
3. Ratify sector and geography definitions.
4. Inspect portal-native forms, workflows, lists and reports before retiring fields.
5. Approve the target data dictionary, migration and backfill exception policy.
6. Build commercial Data Quality and Growth before Retention/Loyalty; operational dashboards follow after the commercial lifecycle is stable.
