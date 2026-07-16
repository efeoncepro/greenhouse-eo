# ANAM Phase 3 — Pilot Dashboard Execution

> **Client:** ANAM, client of Efeonce
> **Portal:** `19893546`
> **Date:** 2026-07-16
> **Status:** pilot dashboards live; not official retention or loyalty measurement

## Purpose

Create the first usable Retention and Loyalty dashboard surfaces from a deliberately synthetic five-Service cohort so the report structure, filters and object model can be reviewed before ANAM supplies governed activation facts. This execution does not convert example values into client truth and does not authorize historical backfill.

## Data boundary

The five controlled Services were populated with example activation values solely for dashboard construction and QA. Every record description begins with `DATOS DE EJEMPLO — PILOTO EFEONCE PARA CONSTRUCCIÓN Y QA DE PANELES ANAM`. The values must be replaced or explicitly ratified by ANAM before any dashboard is renamed, published or used as an official KPI.

| Service | Delivery | Revenue model | Renewal eligibility | Renewal state | Synthetic ARR |
|---|---|---|---|---|---:|
| Gasmar | On track | One-time | Not eligible | Not applicable | 0 CLF |
| Hidrogistica | On track | Recurring | Eligible | Upcoming | 12 CLF |
| Härting | Delayed | Recurring | Conditional | Upcoming | 8 CLF |
| Golden Omega | On track | One-time | Not eligible | Not applicable | 0 CLF |
| McDonald's | On track | Recurring | Eligible | Not due | 10 CLF |

All five calculate `fields_ready` from the example scalar fields. That calculation proves formula propagation only; it does not prove that ANAM reviewed the facts.

## Dashboards and reports created

### Retention

- Dashboard: `ANAM — Retención (PILOTO)` (`21152855`)
- Access: read-only for all portal users
- Portfolio report: `ANAM — Retención — Portafolio de servicios (PILOTO)` (`340874128`)
  - Native Service, unsummarized table
  - Five pilot records
  - Thirteen visible fields covering pipeline/stage, dates, eligibility, delivery and renewal status, revenue model/currency, readiness and ARR
- Action/renewal radar: `ANAM — Retención — Radar de atención y renovaciones (PILOTO)` (`340874425`)
  - Native Service, unsummarized table
  - OR filters: `Estado = Retrasado` OR `Estado de renovación = Próxima`
  - Readback: Härting and Hidrogistica
- Executive KPI: `ANAM — Retención — Servicios recurrentes elegibles (PILOTO)` (`340877391`)
  - Summary count over native Service
  - AND filters: `Modelo de ingreso del servicio = Recurrente` AND `Elegibilidad de renovación = Elegible`
  - Readback: `2`
- Executive KPI: `ANAM — Retención — ARR elegible UF (PILOTO)` (`340877588`)
  - Sum of `Valor recurrente anual` over the same strict eligible recurring cohort
  - Readback: `22` UF

The dashboard intentionally does not claim GRR, NRR, churn or renewal rate. The pilot lacks comparable prior/current contract periods and a ratified production cohort.

### Loyalty

- Dashboard: `ANAM — Fidelización (PILOTO)` (`21152950`)
- Access: read-only for all portal users
- Action queue: `ANAM — Fidelización — Cola de atención (PILOTO)` (`340874258`)
  - Same governed Service fields and OR filters as the Retention radar
  - Readback: Härting and Hidrogistica
- Executive KPI: `ANAM — Fidelización — Servicios en seguimiento (PILOTO)` (`340877942`)
  - Summary count over the action-queue cohort
  - OR filters: `Estado = Retrasado` OR `Estado de renovación = Próxima`
  - Readback: `2`
- Executive KPI: `ANAM — Fidelización — Servicios con retraso (PILOTO)` (`340878184`)
  - Summary count reduced to delayed delivery records; the saved builder retains the original queue filters plus the delayed constraint
  - Readback: `1`

This is an action queue, not a loyalty score or customer-health model. No NPS, activity, Ticket or conversation signal was invented.

## Verification

- HubSpot save confirmations named the intended dashboard for all seven reports.
- Both dashboards were reopened from `Mis paneles`.
- Retention showed the portfolio, radar and both executive KPI titles.
- Loyalty showed the action queue and both executive KPI titles.
- Loyalty report detail showed Härting and Hidrogistica, `Filtros (2)`, the thirteen expected properties and dashboard placement.
- KPI readback reconciled to the marked pilot records: eligible recurring count `2`, eligible ARR `22` UF, attention queue `2`, delayed delivery `1`.
- Growth dashboard `19708354` and its seven governed reports were not modified.

## Residual gates

1. ANAM/Maria Paz must replace or ratify the five example activation payloads.
2. Re-run readback and reconcile the production-eligible Service cohort.
3. Replace the creation-date quick filter with an approved contract/renewal period policy before official publication.
4. Only then replace the pilot pulse KPIs with official Retention measurement (including comparable-period GRR/NRR if the cohort supports it) and a ratified Loyalty signal model.
5. Remove `(PILOTO)` only after the data, denominator, period and owner are approved.
