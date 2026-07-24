# ANAM — Follow-up change set — 2026-07-24

> **Portal:** HubSpot ANAM `19893546`
> **Scope:** follow-up requests received by email on 2026-07-22 and Teams on 2026-07-23
> **Evidence:** authenticated portal readback on 2026-07-24, canonical ANAM docs, email and Teams review
> **Runtime rule:** configuration drafts are not live until explicitly published

## Executive state

| Workstream | State on 2026-07-24 | Evidence / next gate |
|---|---|---|
| Customer Agent availability | Operational | Active live-chat channel, all-hours coverage and successful draft-preview responses |
| Follow-up intent | Drafted and QA passed | Focuses results/reports, scheduling and billing; does not redirect to residues |
| Quality intake | Drafted and QA passed | Requests name, company, email and the specific result/detail before handoff |
| Handoff copy | Drafted, neutral | Says `una persona del equipo`; no customer-facing executive name |
| Short response: invoice/PO review | Updated and synchronized | Active source now says `una persona del equipo` |
| Handoff assignment | Existing internal routing retained | Currently points to Maria Paz Haeger; change only after ANAM supplies the owner/fallback matrix |
| Pipeline `Paso siguiente` | Live required property | Operator guidance exists; task automation remains unpublished |
| Licenses | Current inventory read back | See seat and product inventory below |
| Outlook web tutorial | Documented | Ready to deliver; a screen recording remains a separate production step |
| SLA KPI | Definition pending | ANAM must select the SLA grain and provide source dates/owners |
| Backlog reporting | Three grains defined | Commercial can proceed after live cohort readback; delivery and billing remain source-gated |

## Architecture and ADR assessment

This change does not introduce a new object, source of truth, schema, API, external bridge or autonomy tier. It
refines a reversible, portal-local Customer Agent workflow already governed by the managed-service canon:
draft-first, human-approved publication, bounded knowledge, human handoff and conversational QA. Therefore no new
ADR is required. SLA, Ticket and Billing changes remain proposals and must pass their existing approval/ADR gates
before runtime construction.

## Customer Agent draft

### Follow-up

For `seguimiento_servicio`, the agent must:

1. focus on results/reports, scheduling/sample/visit/delivery, or billing/OC/EDP/HAS/HES;
2. request only the missing reference, company and concrete question;
3. transfer only when a real status lookup or action is required;
4. never invent status, result or delivery date;
5. not convert follow-up into a new quotation flow or redirect it to residues, waters or sludge.

Draft-preview evidence:

- Prompt: `Quiero saber qué pasó con el resultado de mi muestra y cuándo estará disponible.`
- Observed: the agent requested the available quotation, work-order or sample reference and stayed on result/report status.
- Verdict: `PASS`.

### Quality

For `requerimiento_calidad`, the agent must progressively confirm, when not already visible:

- name;
- company;
- email;
- reference or service detail;
- the exact result or situation being questioned.

It classifies the request as `Felicitación | Apelación | Queja`, preserves the visitor's description, does not
admit liability or promise an outcome, and hands off only after the minimum context is present unless the visitor
explicitly asks for a person or the native system forces transfer.

Draft-preview evidence:

- Prompt: `Necesito ingresar un requerimiento de calidad. El resultado del informe no coincide con lo esperado; la cotización es 12345.`
- Observed: the agent retained `12345` and asked for name, company, email and the specific result considered incorrect.
- Verdict: `PASS`.

### Neutral handoff invariant

Customer-facing text must never depend on the current assignee's name. The approved pattern is:

- available: `Te paso con una persona del equipo para que continúe la revisión.`
- unavailable: `Una persona del equipo podrá continuar la revisión cuando esté disponible.`

The internal assignee may remain a named user. Copy and routing are separate contracts: changing the assignee must
not require changing the visitor experience.

The active short response `El monto de la factura no coincide...` was updated and reached `Sincronizadas` at
2026-07-24 04:07 GMT-4. Its answer now also uses `una persona del equipo`.

### Publication boundary

The guidelines and two transfer messages are saved as unpublished HubSpot changes. The neutral short response is
already synchronized because it was a direct correction to an active customer-facing source. Publication remains
approval-gated because it changes live agent behavior. Before publishing:

1. review the exact draft in `Todos los borradores`;
2. confirm the internal assignee/fallback remains acceptable;
3. publish the instruction set once;
4. rerun follow-up, Quality and unavailable-agent scenarios on the live version;
5. record the published timestamp and rollback text.

## Current subscription and seat inventory

Authenticated `Cuenta y facturación` readback on 2026-07-24 showed:

| Item | Current capacity | Assigned / used | Available |
|---|---:|---:|---:|
| Sales Hub Professional seats | 11 | 10 | 1 |
| Service Hub Professional seats | 3 | 1 | 2 |
| Core/Principal Professional seats | 21 total | 10 | 11 |
| Marketing contacts | 1,000 | 96 | 904 |
| HubSpot Credits | 33,000 per cycle | 10 | 32,990 |

The 21 Core/Principal total is consistent with 15 paid seats, 5 granted seats and the Core seat included with
Marketing Hub Starter. Products visible in the current portal:

- Marketing Hub Starter;
- Sales Hub Professional;
- Service Hub Professional;
- 15 paid Core/Principal Professional seats;
- 5 granted Core seats;
- 30,000 additional HubSpot Credits, plus 3,000 included.

Subscription term: 2025-05-08 through 2028-05-07, billed annually. This live inventory supersedes older
attachment-derived license counts and prior references to Marketing Hub Enterprise.

## `Paso siguiente` contract

`Paso siguiente` is a Deal property, not a pipeline stage. It records the next executable commercial action and
must use:

```text
verbo + resultado esperado + responsable + fecha
```

Example:

```text
Enviar propuesta corregida — Ana Pérez — 29/07/2026
```

Avoid values such as `seguir`, `pendiente`, `llamar` or `esperar respuesta` without an outcome, owner and date.
Update the property whenever the action is completed, replaced or rescheduled. It does not replace a HubSpot task
with due date; the eight future-entry task automations remain designed and unpublished.

## SLA KPI contract

`Cumplimiento de plazos` cannot be one mixed KPI because ANAM has at least three distinct clocks:

| SLA family | Grain | Required dates | Eligible denominator | Current state |
|---|---|---|---|---|
| Commercial next action | Open Deal / action | due date and completion date | Actions due in period | Property exists, but a structured due-date fact is not yet published |
| Service delivery | Service / committed delivery | committed date and actual delivery/result date | Services due in period, with approved exclusions | Blocked by ratified operational source and Service materialization |
| Human case | Ticket | created, first response, resolution and paused intervals | Eligible Tickets by class/priority | Planned; taxonomy, routing and timers not ratified |

Recommended formula for each approved family:

```text
SLA compliance = eligible items completed on or before committed deadline / eligible items due in period
```

The dashboard must expose period, denominator, exclusions, timezone/business-calendar policy and owner. It must
not mix Deals, Services and Tickets in one percentage.

## Backlog contract

`Backlog` is also split by operational fact:

| Backlog | Inclusion rule | Main measures | Readiness |
|---|---|---|---|
| Commercial | Deal in an open commercial/renewal stage | count, amount by currency, age, close-date aging, owner, missing next step | Ready for read-only live cohort validation |
| Delivery | Won work/Service not yet delivered or closed | count, contracted value by currency, days to/after commitment, owner | Blocked until operational state and committed/actual dates are ratified |
| Billing | Delivered/billable item not yet invoiced | count, amount by currency, aging, unit/company, owner | Blocked until monthly file owner/date and Billing Event intake are approved |

No consolidated backlog amount may add CLP, UF and USD. No item should appear in more than one row at the same
grain, and cross-backlog totals must not be presented as additive.

## Inputs still owned by ANAM

- attendee list for the 2026-08-12 training, 09:00–13:00;
- routing owners and fallback by follow-up, Quality, billing and service;
- owner and delivery date for the monthly billing file;
- people who need dashboard access;
- selected SLA family, targets, business calendar and exclusions;
- ratification or replacement of synthetic Service pilot facts.

## Rollback

For the unpublished agent changes, rollback is to discard the current drafts. After publication, rollback is to
restore the previous published guidelines and transfer messages from the source pack/history, publish once, and
rerun the same three regression scenarios. Do not change the internal assignee as part of copy rollback.
