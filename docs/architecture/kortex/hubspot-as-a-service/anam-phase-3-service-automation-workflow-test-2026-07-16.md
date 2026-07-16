# ANAM Phase 3 — Service Automation and Workflow Test

> **Date:** 2026-07-16
> **Client:** ANAM, client of Efeonce
> **Portal:** HubSpot `19893546`
> **Status:** activation-review workflow active and runtime-verified on the five controlled pilots
> **Boundary:** no production Service materialization workflow is active

## Decision

Service creation cannot safely be implemented as a plain Deal-based `Create record → Service` workflow.

The business grain is one Service per awarded line item, while a Deal may contain several line items. HubSpot lets Deal workflows use line-item criteria, but the native create-record action does not provide a governed iterator that emits exactly one Service for every qualifying line item with its exact line-item ID, TCV, ARR and currency. A Deal-level action would risk collapsing multiple contracted components into one Service or selecting an ambiguous associated line item.

The production materializer therefore remains a portal-scoped Kortex command/custom workflow action that must:

1. receive the enrolled Deal ID;
2. read and deduplicate its Company associations;
3. enumerate every associated line item;
4. apply the award gate per line item;
5. upsert by `anam_service_external_key`;
6. create/read back Company + originating-Deal associations;
7. emit an execution ledger and quarantine failures.

Until that command is implemented and deployed, forward Services continue through the approved Kortex OAuth execution path one line item at a time. A native Deal workflow must not be activated as a substitute.

## Workflow/API inventory

- Kortex installation has the `automation` scope.
- Workflows v4 beta inventory/read/create/update/delete endpoints respond successfully.
- The portal had five pre-existing workflows at the initial cut; none created Services.
- Native action `0-14` accepts target object Service `0-162` in a compiled draft.
- Native action `0-3` accepts a Service-based task associated through Task → Service type `853`.
- Service → Task readback uses type `852`.
- Deal → Company standard/unlabeled type is `341`; Service → Company is `792`.
- A workflow create action can apply `Negocio de origen` (`USER_DEFINED` type `1`) and copy the Deal's Company association. HubSpot's workflow compiler rejects sending both the custom and standard Deal association as separate action entries; the labeled association is expected to retain the standard relationship at record runtime and must be read back.

The API is beta. A successful create/readback with `crmObjectCreationStatus=COMPLETE` and `isEnabled=true` is configuration evidence, not execution evidence.

## Materialization probe

Three isolated runtime attempts used a temporary Deal, one temporary line item, an exact trigger and a temporary workflow action targeting Service:

| Attempt | Workflow ID | Result | Cleanup |
|---|---:|---|---|
| List-based trigger | `1852384537` | Compiled/enabled; no Service within test window | workflow deleted; Deal `62727712346` and line item `57093201043` archived |
| List-based after async compile | `1852406412` | Compiled/enabled; no Service within test window | workflow deleted; Deal `62702744155` and line item `57104650606` archived |
| Property-change event trigger | `1852367673` | Compiled/enabled; no Service within test window | workflow deleted; Deal `62732665392` and line item `57096200978` archived |

An earlier malformed combined-association request failed before workflow creation and cleaned Deal `62732664977` plus line item `57088578112`. No probe created a Service record.

## Activation-review workflow

Workflow `1852406585`, `ANAM — Revisar activación de Service piloto`, was created with:

- enrolled object: native Service `0-162`;
- eligibility limited to the five exact pilot external keys;
- readiness in `incomplete_core`, `review_pending` or `recurring_value_missing`;
- no re-enrollment;
- one high-priority `TODO` task associated to the enrolled Service;
- no email, notification, property write or lifecycle-stage change.

The task asks for start/end dates, delivery status, revenue model, renewal eligibility/status and confirmation that the Service should remain `New` until real activation.

### API-only runtime test

The workflow compiled to `COMPLETE` and the API returned `isEnabled=true`, but:

- no task appeared on any of the five existing pilot Services;
- a newly created exact-key test Service `571119055689` also produced no task;
- no emails or notifications were sent;
- the test Service was archived;
- the test eligibility branch was removed;
- the workflow was returned to `isEnabled=false`, revision `4`, with only the five pilot branches.

Verdict at this intermediate cut: `CONDITIONAL / NOT RUNTIME-VERIFIED`. API activation alone was insufficient evidence, so the workflow was disabled before authenticated editor QA.

## Authenticated editor verification and rollout

The authenticated ANAM Chrome session was then used to verify the workflow through HubSpot's editor and execution history.

Pre-activation evidence:

- the editor showed exactly five eligibility branches, one per controlled pilot key;
- each branch also required readiness in `incomplete_core`, `review_pending` or `recurring_value_missing`;
- re-enrollment was disabled;
- the action created one high-priority `TODO` task associated with the enrolled Service, with no owner, email, notification or property write;
- HubSpot's test runner predicted that Gasmar would enroll and execute `Create task`;
- the non-pilot Service `Muestreo y Análisis de agua - nestlé` (`564234555477`) failed the enrollment criteria, as expected.

The workflow was activated in the editor with **No, only enroll Services that meet the criteria after activation**, preventing an automatic five-record backfill. Gasmar was then enrolled manually as the only first record. Its execution completed and created task `113075626559`. Only after that positive runtime result and the negative non-pilot result passed were the remaining four pilots enrolled manually.

Final readback from workflow history:

| Service | Service ID | Task ID | Execution |
|---|---:|---:|---|
| Gasmar — M&A - Integral | `571105526327` | `113075626559` | Completed |
| Hidrogistica — FIC - Contrastación Banco Pruebas | `571100062843` | `113096134994` | Completed |
| Härting — M&A - Integral | `571115856266` | `113095519764` | Completed |
| Golden Omega — M&A - Integral | `571105038195` | `113082535993` | Completed |
| McDonald's Corporation — M&A - Integral | `571114173986` | `113081914498` | Completed |

The history contained exactly these five executions; the Nestlé control did not enroll. Workflow `1852406585` remains active with re-enrollment disabled. It is an activation-review queue, not a Service materializer, and it does not claim that any Service is activated or ready for KPIs.

Do not enable Service materialization from Deal in the UI. The line-item iterator/idempotent Kortex seam remains a separate executable implementation.
