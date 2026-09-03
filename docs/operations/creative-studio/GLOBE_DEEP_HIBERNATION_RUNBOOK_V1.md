# Efeonce Globe — Deep Hibernation and Reactivation Runbook V1

## 1. Purpose and current state

This runbook is the operational source of truth for stopping and later reactivating Efeonce Globe without
deleting its data, credentials, artifacts, network perimeter or Terraform ownership. The business decision was
made on 2026-09-02 because Globe was not yet producing revenue and its live run-rate was not sustainable.

Initial hibernation evidence at `2026-09-02T10:30:38Z` (preserved historical cutoff):

- lifecycle: `hibernated`;
- Cloud SQL `globe-pg`: `STOPPED`, `activationPolicy=NEVER`;
- Producer Worker, Media Derivatives and Asset Governance schedulers: `PAUSED`;
- productive flags in API, Studio and Producer Worker: `false`;
- API revision `globe-api-internal-00216-wmm`: created = ready;
- Studio revision `globe-studio-internal-00150-m2m`: created = ready;
- Cloud Run services retain `minInstances=0`;
- active Cloud Run Job executions at the cutoff: zero;
- post-change OpenTofu plan: `No changes`;
- no resource was destroyed or replaced.

This state is reversible. Reactivation must follow section 9 in order. Do not jump directly from
`hibernated` to `active`.

**Latest containment, `2026-09-03T22:26:05Z`:** the external Greenhouse scheduler
`ops-globe-tenancy-reconcile` in `efeonce-group/us-east4` was also paused and read back as `PAUSED`.
SQL was rechecked as `STOPPED/NEVER` with deletion protection enabled. This is a temporary commercial-product
pause, not closure or decommissioning. The local Greenhouse deploy source now preserves this external pause;
commit/push/deploy of that source were not performed in this slice. No new Terraform apply, no-drift plan or
restore rehearsal was performed on September 3. See sections 3.1 and 13.1 before any restart or deployment.

## 2. Financial decision and measurement contract

The last complete 30-day readback before hibernation attributed approximately CLP 348,152 net to
`efeonce-globe`. Its main components were approximately:

| Service | Observed 30-day cost before hibernation |
| --- | ---: |
| Cloud Run | CLP 285,931 |
| Cloud SQL | CLP 34,980 |
| Networking | CLP 16,770 |
| Other retained services | CLP 10,400 |

Deep hibernation targets the recurring Cloud Run Job ticks and Cloud SQL compute. The expected residual is
approximately CLP 20,000–30,000 per 30 days for retained storage, networking/front door, logs, secrets,
Artifact Registry and other control-plane resources. This is a **modeled range**, not realized savings.

The modeled reduction is therefore approximately CLP 318,000–328,000 per 30 days, or about 91–94% from the
pre-hibernation Globe baseline. Report realized savings only after Billing Export has ingested complete windows:

- first directional check: 24 hours after the cutoff;
- stable run-rate check: 7 complete days;
- accounting confirmation: complete billing month.

Credits must remain separate. The canonical equation is `net = gross + credits`; credits normally carry a
negative amount. Never compare a partial post-cutoff day with a full pre-cutoff day.

## 3. Lifecycle state machine

Terraform variable `globe_operating_state` owns the lifecycle:

| State | Cloud SQL | Productive lanes | Schedulers | Intended use |
| --- | --- | --- | --- | --- |
| `active` | `ALWAYS` | enabled according to their governed feature variables | enabled unless their explicit pause variable is true | normal operation |
| `draining` | `ALWAYS` | all fail closed | all paused | safe shutdown/wake-up verification |
| `hibernated` | `NEVER` | all fail closed | all paused | minimum-cost retained state |

Derived Terraform locals are:

- `globe_productive_lanes_enabled = globe_operating_state == "active"`;
- `globe_schedulers_paused = globe_operating_state != "active"`;
- `globe_database_enabled = globe_operating_state != "hibernated"`.

`draining` exists because API and Studio connect to PostgreSQL during startup. Stopping SQL in the same apply
that creates their fail-closed revisions can prevent a revision from becoming ready. The safe order is therefore:

```text
active -> draining -> verify ready/closed -> hibernated
hibernated -> draining -> verify ready/closed -> active -> verify productive
```

This is an operational lifecycle inside the existing Terraform boundary. It does not introduce a new dispatch,
data or authority boundary, so no new ADR was required.

### 3.1 External caller: separate source of truth, mandatory lifecycle companion

The table above governs only the three **Globe-owned** schedulers. Globe Terraform does not own the following
Greenhouse scheduler; a Terraform `No changes` result cannot prove that it is paused:

| Field | Preserved contract |
| --- | --- |
| Project / region / name | `efeonce-group` / `us-east4` / `ops-globe-tenancy-reconcile` |
| Schedule / timezone | `*/5 * * * *` / `America/Santiago` |
| HTTP target | `https://ops-worker-y6egnifl6a-uk.a.run.app/globe/tenancy/reconcile` |
| Scheduler OIDC identity | `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` |
| Source owner | Greenhouse `services/ops-worker/deploy.sh`, `upsert_scheduler_job` call |
| Pause input | Fifth positional argument `true` means paused; omitted defaults to `false` |

The endpoint runs on the **shared** Greenhouse ops worker. Pause this scheduler only; never stop the worker,
change its other schedules, or remove its identity/IAM/target. The OIDC identity above authenticates Scheduler
to ops-worker; it is not a replacement for the separately governed Globe broker identity used by that worker.

Hibernation requires both source pause `true` and live `PAUSED`. Before deploying Greenhouse, inspect the actual
branch/revision being deployed: a stale remote source can resume the job. The September 3 local correction is
not evidence that remote branches or CI already contain it. Reactivation changes the same argument to `false`
and resumes the live job **only after** section 9 phase C prerequisites. Record source and runtime separately.

Pausing refresh intentionally lets tenancy snapshots expire (Greenhouse snapshot TTL: 12 minutes). Do not
extend TTL, disable tenancy enforcement, grant broader capabilities or recreate identity to bypass expiry.
Broker reconciliation has an existing narrow bootstrap path independent of productive flags, but verify that
contract against the deployed revision at every restart. Source pointers: Globe `apps/studio-web/src/app.ts`
(`registerTenancyCapabilities`, `tenancyContextAuthorizer`, `internalServicePrincipal`) and Greenhouse
`src/lib/globe/tenancy-reconciler.ts` (`SNAPSHOT_LEASE_MS`). This correction preserves those authority boundaries;
it does not introduce a new authorization exception.

## 4. What hibernation disables

The lifecycle gate is independent of the underlying feature defaults. Outside `active`, it forces the following
productive surfaces closed:

- all governed provider runs: Fal, Veo, OpenAI and Omni;
- Lab generation and commercial-credit consumption;
- Producer Worker and credit-expiry processing;
- provider webhook proxy;
- Studio BFF access to productive API behavior;
- private ingest and Producer asset operations;
- client Producer;
- production promotion operations;
- media derivative operations;
- library writes, bulk operations, exports and purge;
- all three periodic schedulers.

The runtime marker `GLOBE_PRODUCTIVE_LANES_ENABLED=false` is injected into API, Studio and Producer Worker. It
exists so live readback can prove the effective global gate, instead of inferring it from source code.

## 5. What remains preserved and may still cost money

Hibernation does **not** delete or disable:

- Cloud SQL data disk, instance identity, database, IAM users, backups or point-in-time recovery;
- 10 Cloud Storage buckets, including private assets, evidence, derivatives, exports, development and Terraform
  state;
- 17 Secret Manager secrets and their IAM bindings;
- Artifact Registry `globe-runtime` and its images;
- API and Studio Cloud Run services, revisions, service accounts and IAM perimeter;
- the three Cloud Run Job definitions and scheduler definitions;
- load balancer, reserved address, certificate, serverless NEG and DNS-facing front door;
- logging, monitoring metrics, alert policies, budgets and Billing Export;
- GitHub/Vercel workload identity federation and deployment identities;
- project APIs and Terraform remote state.

Consequences:

- stored bytes, load balancer/network resources, secrets, logs and image storage can continue billing;
- Cloud Run services can still receive requests, but `minInstances=0` and productive lanes are closed;
- requests that depend on PostgreSQL will fail while the database is stopped; this is expected during deep
  hibernation;
- stopping Cloud SQL removes compute uptime, not persistent storage charges;
- do not delete residual resources as a “cleanup” without a separate inventory, retention decision and explicit
  authorization.

## 6. Mandatory preflight for every lifecycle change

Use only the shared checkout. Never create a worktree for this operation.

```bash
cd /Users/jreye/Documents/efeonce-globe
git status --short
gcloud --configuration=globe auth list --filter=status:ACTIVE
gcloud --configuration=globe config get-value project
tofu -chdir=infra/terraform init
tofu -chdir=infra/terraform validate
node --test infra/terraform/tests/*.test.mjs
```

The Gcloud project must be `efeonce-globe`. Restore the `default` configuration if an operator activated another
configuration interactively.

Resolve the billing account dynamically; never commit its identifier:

```bash
GLOBE_BILLING_ACCOUNT_ID="$(gcloud --configuration=globe billing projects describe efeonce-globe --format='value(billingAccountName)' | sed 's#billingAccounts/##')"
test -n "$GLOBE_BILLING_ACCOUNT_ID"
```

Every plan/apply in the current Terraform topology must preserve these inputs:

```text
GOOGLE_CLOUD_QUOTA_PROJECT=efeonce-globe
billing_account_id=<dynamically resolved>
enable_budget=true
development_environment_enabled=true
development_operator_principal=user:julio.reyes@efeonce.org
```

Why this is mandatory: a plan without `development_environment_enabled=true` proposed 20 destroys. After adding
that input, a plan without the development operator proposed one destroy. Both unsafe plans were discarded and
never applied. A lifecycle plan is invalid if it contains any delete or replacement, regardless of why.

## 7. Safe plan and apply protocol

Substitute `STATE` with exactly `active`, `draining` or `hibernated`:

```bash
STATE=draining
GOOGLE_CLOUD_QUOTA_PROJECT=efeonce-globe tofu -chdir=infra/terraform plan \
  -input=false \
  -lock-timeout=60s \
  -var="billing_account_id=$GLOBE_BILLING_ACCOUNT_ID" \
  -var='enable_budget=true' \
  -var='development_environment_enabled=true' \
  -var='development_operator_principal=user:julio.reyes@efeonce.org' \
  -var="globe_operating_state=$STATE" \
  -out="globe-$STATE.tfplan"
```

Inspect the human-readable plan and enforce the machine-readable destructive-action gate:

```bash
tofu -chdir=infra/terraform show "globe-$STATE.tfplan"
tofu -chdir=infra/terraform show -json "globe-$STATE.tfplan" | jq \
  '[.resource_changes[]? | select((.change.actions | index("delete")) != null)] | length'
```

The second command must return `0`. Stop if the plan proposes `delete`, replacement, an unrelated change, a
different scheduler target/IAM identity, or a resource outside the expected phase.

Apply only the saved, reviewed plan:

```bash
GOOGLE_CLOUD_QUOTA_PROJECT=efeonce-globe tofu -chdir=infra/terraform apply \
  -input=false \
  -auto-approve \
  "globe-$STATE.tfplan"
```

Generated plans are local and gitignored. They are not durable evidence and must never be committed.

## 8. Future shutdown procedure

Use this procedure if Globe is reactivated and must later return to deep hibernation.

### Phase A — contain new work

1. Obtain explicit authorization for the production shutdown.
2. Complete section 6 and confirm current source/live state is `active`.
3. Inspect queue age, running executions and the most recent successful execution for all three jobs.
   Also set the external caller source pause to `true`, pause it using section 10, and verify `PAUSED` before
   SQL is stopped. Allow already accepted reconciliation requests to finish; pause is not cancellation.
4. Change the source-controlled default from `active` to `draining`.
5. Plan with every preservation input in section 6. Require zero delete/replacement.
6. Apply the saved `draining` plan.
7. Verify all schedulers are `PAUSED` and `GLOBE_PRODUCTIVE_LANES_ENABLED=false` on API, Studio and Producer
   Worker.

### Phase B — drain and prove the fail-closed runtime

1. Wait for executions accepted before the pause to finish. Do not cancel them unless a separate incident
   decision authorizes that mutation.
2. Require the active-executions query in section 11 to return `[]`.
3. Inspect the last structured completion for each job and record success/failure, queue age and pending work.
4. Require API and Studio created revision = ready revision while SQL is still `RUNNABLE/ALWAYS`.
5. Confirm selected productive flags are `false`; do not infer this only from the global marker.
6. If durable work remains, decide whether to finish, defer or explicitly abandon it under its domain contract.
   Hibernation never silently deletes queue records or reservations.

### Phase C — stop database compute

1. Change the source-controlled default from `draining` to `hibernated`.
2. Create the final plan. Expected material change is SQL `ALWAYS -> NEVER`; require zero deletes/replacements
   and no service revision update.
3. Apply the saved plan.
4. Wait for SQL `STOPPED/NEVER`.
5. Run every readback in section 11 and a refreshed no-drift plan.
6. Record the UTC cutoff and schedule 24-hour, 7-day and monthly cost readbacks.

If a service revision fails during Phase A/B, keep SQL on and schedulers paused. Fix the fail-closed revision
before proceeding. Never use SQL shutdown as the way to make a service fail closed.

## 9. Reactivation procedure

### Phase A — authorize and prepare

1. Obtain explicit operator authorization to reactivate production and accept renewed GCP/provider spend.
2. Read this runbook, `GLOBE_RUNTIME_HANDOFF.md`, TASK-1807 and both repositories' `AGENTS.md` files.
3. Run all preflight commands in section 6.
4. Confirm no other Terraform apply, deploy, migration or database maintenance is active.
5. Confirm current state with the readbacks in section 11. Expected: SQL `STOPPED/NEVER`, schedulers `PAUSED`,
   productive marker `false`, and zero active job executions.
6. Review current GCP pricing, provider credentials/terms, budget and spend authorization. Do not run a billable
   provider canary merely to prove wake-up.

### Phase B — move source of truth to `draining`

1. Change the default of `globe_operating_state` in `infra/terraform/variables.tf` from `hibernated` to
   `draining` in a focused, reviewed change.
2. Run format, validation and the full Terraform contract suite.
3. Create a `draining` plan using section 7.
4. Require `0 destroy`; expected material change is Cloud SQL `NEVER -> ALWAYS`. Depending on drift or later
   code, services/jobs may also receive fail-closed revisions.
5. Apply the saved plan.
6. Wait for Cloud SQL to report `RUNNABLE/ALWAYS`.
7. Require API and Studio `latestCreatedRevisionName == latestReadyRevisionName`.
8. Require all three schedulers to remain `PAUSED` and every productive marker/flag to remain `false`.

Do not proceed if a service revision is not ready. Keep schedulers paused, inspect Cloud Run logs without
printing secrets, correct the cause, and redeploy the fail-closed revision while SQL remains on.

### Phase C — integrity checks while fail closed

1. Confirm Cloud SQL deletion protection, backups and point-in-time recovery remain enabled.
2. Run the canonical database connectivity/migration readback without applying a migration.
3. Confirm the expected database and IAM users still exist.
4. Confirm buckets, secrets and Artifact Registry exist.
5. Run non-billable API/read-model smokes only. No image, video, audio, Omni or external-provider generation.
6. Inspect queue age and pending durable work. Decide explicitly whether old queued work should resume; never
   purge or abandon it implicitly.
7. Revalidate the narrow broker reconciliation path described in section 3.1 against the deployed code/config.
   Once SQL is `RUNNABLE/ALWAYS` and API created = ready, change the Greenhouse scheduler's fifth argument to
   `false` in reviewed source. Update the hibernation-specific expectations in
   `services/ops-worker/deploy-contract.test.ts` to the newly authorized active state, retaining executable
   pause/resume coverage; run that suite and `bash -n services/ops-worker/deploy.sh`. Do not skip failing tests
   or leave the source at `true` after a manual resume. Then resume only that caller:

   ```bash
   gcloud --configuration=default scheduler jobs resume ops-globe-tenancy-reconcile \
     --project=efeonce-group --location=us-east4
   ```

8. Observe the next scheduled reconciliation while Globe stays `draining` and its three schedulers stay paused.
   Require successful domain reconciliation for the intended workspaces and a governed tenancy readback with
   current broker revision and future `expiresAt` (12-minute refresh TTL), not merely Scheduler/ops-worker
   HTTP 200. The wrapper can return 200 even when individual reconciliations failed. Check Globe error logs and
   the persisted projection; no provider generation is needed.
9. If authorization, connectivity or projection refresh fails, immediately pause the external caller again and
   restore its source pause `true`. Keep productive flags closed and diagnose the existing broker path. Do not
   switch to `active`, change TTL/enforcement or widen permissions to make reconciliation succeed. This phase
   is an authorized control-plane refresh, not a read-only smoke; restart was not rehearsed during hibernation.

### Phase D — activate productive operation

1. Change the source-controlled default from `draining` to `active` in a second focused, reviewed change.
   Proceed only after phase C projection readback; refresh again if it expired during review/apply.
2. Run format, validation and contract tests again.
3. Create an `active` plan with all mandatory preservation inputs.
4. Require `0 destroy`. Expected changes are productive flags/revisions, Producer Worker configuration and
   scheduler pause state; SQL must remain `ALWAYS`.
5. Apply the saved plan.
6. Require API and Studio created revision = ready revision.
7. Require `GLOBE_PRODUCTIVE_LANES_ENABLED=true` on API, Studio and Producer Worker.
8. Confirm each scheduler is `ENABLED`, with its source-controlled schedule, original OIDC identity, target,
   timezone and retry contract.
   Verify the external Greenhouse scheduler independently; Globe Terraform does not resume or validate it.
9. Observe the first successful execution of Asset Governance, Media Derivatives and Producer Worker. Validate
   structured completion, queue age, retry storm, terminal attempts and failures.
10. Observe at least one real work item only if normal business demand exists. Do not create external-provider
    spend solely for testing.
11. Run a refreshed post-apply plan. It must return `No changes`.

The scheduler order in a single Terraform apply is not a business-order guarantee. This is safe because SQL is
already available, the jobs are durable/idempotent, and a scheduler firing before its job update sees the prior
fail-closed flags and performs no productive work. If later architecture invalidates that invariant, introduce a
separate staged scheduler state before reactivation.

### Phase E — monitor after wake-up

- 15 minutes: service readiness, first ticks, no authentication/configuration errors;
- 1 hour: queue age, failures, retries and unexpected provider requests;
- 24 hours: cost, workload completion and budget trajectory;
- 7 days: stable run-rate and residual no-op cost.

If any productive or financial guardrail fails, move back to `draining` first. Use `hibernated` only after the
fail-closed revisions are ready.

## 10. Emergency rollback during reactivation

Preferred rollback:

```text
active -> draining
```

This pauses all schedulers and closes productive flags while keeping SQL available for diagnosis. Follow the
same reviewed plan/apply gate and require zero destructive actions.

Here “all schedulers” requires an additional explicit action for the external caller; Terraform alone pauses
only the Globe-owned three. Set its source pause back to `true` and execute/read back:

```bash
gcloud --configuration=default scheduler jobs pause ops-globe-tenancy-reconcile \
  --project=efeonce-group --location=us-east4
```

This preserves the definition for section 9 phase C. Never resume it against `STOPPED/NEVER` SQL.

Deep rollback:

```text
draining -> hibernated
```

Use it after confirming fail-closed revisions are ready and no job execution is active. It stops SQL. Never try
to “fix” a failed active revision by stopping SQL first.

If Terraform is temporarily unavailable during an active cost incident, pausing the three schedulers directly is
an authorized emergency containment only when the operator has authorized the incident action:

```bash
gcloud --configuration=globe scheduler jobs pause globe-producer-worker --location=southamerica-east1 --project=efeonce-globe
gcloud --configuration=globe scheduler jobs pause globe-media-derivatives --location=southamerica-east1 --project=efeonce-globe
gcloud --configuration=globe scheduler jobs pause globe-asset-governance --location=southamerica-east1 --project=efeonce-globe
```

Reconcile that direct mutation into Terraform in the same operational slice. Do not stop SQL until active
executions are absent and fail-closed serving revisions are verified.

## 11. Canonical live readbacks

### Database

```bash
gcloud --configuration=globe sql instances describe globe-pg \
  --project=efeonce-globe \
  --format='yaml(name,state,settings.activationPolicy,settings.deletionProtectionEnabled,settings.backupConfiguration.enabled,settings.backupConfiguration.pointInTimeRecoveryEnabled,settings.dataDiskSizeGb,settings.dataDiskType,connectionName)'
```

Hibernated expectation: `STOPPED`, `NEVER`, deletion protection `true`, backup `true`, PITR `true`.

### Schedulers

```bash
gcloud --configuration=globe scheduler jobs list \
  --project=efeonce-globe \
  --location=southamerica-east1 \
  --filter='name:(globe-producer-worker OR globe-media-derivatives OR globe-asset-governance)' \
  --format='table(name.basename(),state,schedule)'
```

Hibernated/draining expectation: all `PAUSED`.

### External Greenhouse scheduler

```bash
gcloud --configuration=default scheduler jobs describe ops-globe-tenancy-reconcile \
  --project=efeonce-group --location=us-east4 \
  --format='yaml(name,state,schedule,timeZone,httpTarget.uri,httpTarget.oidcToken.serviceAccountEmail,retryConfig)'
```

Hibernated expectation: `PAUSED`. During `draining`, it remains paused except for the explicitly controlled
phase C refresh after SQL/API readiness. Compare the preserved contract in section 3.1 before resume.
After a pause, observe at least two missed five-minute slots plus logging ingestion lag; separate requests
already accepted before the cutoff from new arrivals. Do not wake Globe with HTTP probes just to test silence.

### Service revisions and scale-to-zero

```bash
gcloud --configuration=globe run services describe globe-api-internal \
  --project=efeonce-globe --region=southamerica-west1 --format=json | jq \
  '{name:.metadata.name,latestCreated:.status.latestCreatedRevisionName,latestReady:.status.latestReadyRevisionName,minInstances:(.spec.template.scaling.minInstanceCount // 0)}'

gcloud --configuration=globe run services describe globe-studio-internal \
  --project=efeonce-globe --region=southamerica-west1 --format=json | jq \
  '{name:.metadata.name,latestCreated:.status.latestCreatedRevisionName,latestReady:.status.latestReadyRevisionName,minInstances:(.spec.template.scaling.minInstanceCount // 0)}'
```

Require created = ready and `minInstances=0`.

### Effective productive marker

```bash
gcloud --configuration=globe run services describe globe-api-internal \
  --project=efeonce-globe --region=southamerica-west1 --format=json | jq \
  '[.spec.template.spec.containers[0].env[] | select(.name == "GLOBE_PRODUCTIVE_LANES_ENABLED") | {name,value}]'

gcloud --configuration=globe run services describe globe-studio-internal \
  --project=efeonce-globe --region=southamerica-west1 --format=json | jq \
  '[.spec.template.spec.containers[0].env[] | select(.name == "GLOBE_PRODUCTIVE_LANES_ENABLED") | {name,value}]'

gcloud --configuration=globe run jobs describe globe-producer-worker \
  --project=efeonce-globe --region=southamerica-west1 --format=json | jq \
  '[.spec.template.spec.template.spec.containers[0].env[] | select(.name == "GLOBE_PRODUCTIVE_LANES_ENABLED") | {name,value}]'
```

Hibernated/draining expectation: `false` in all three. Active expectation: `true`.

### Active job executions

```bash
gcloud --configuration=globe run jobs executions list \
  --project=efeonce-globe --region=southamerica-west1 --format=json | jq \
  '[.[] | select((.status.runningCount // 0) > 0) | {name:.metadata.name,job:.metadata.labels["run.googleapis.com/job"],started:.status.startTime,running:.status.runningCount}]'
```

Before stopping SQL, this must return `[]`.

### Preserved resources

```bash
gcloud --configuration=globe storage buckets list --project=efeonce-globe --format='value(name)'
gcloud --configuration=globe secrets list --project=efeonce-globe --format='value(name)'
gcloud --configuration=globe artifacts repositories describe globe-runtime \
  --project=efeonce-globe --location=southamerica-west1 --format='value(name,format)'
```

Do not print secret versions or values.

## 12. Cost readback

Billing Export can lag. Use complete UTC days and compare equivalent weekday windows. Canonical detailed table:

```text
efeonce-group.billing_export.gcp_billing_export_resource_v1_013340_4C7071_668441
```

Read-only query pattern:

```sql
SELECT
  DATE(usage_start_time) AS usage_date,
  service.description AS service,
  ROUND(SUM(cost), 2) AS gross_cost,
  ROUND(SUM((SELECT COALESCE(SUM(c.amount), 0) FROM UNNEST(credits) AS c)), 2) AS credits,
  ROUND(
    SUM(cost) + SUM((SELECT COALESCE(SUM(c.amount), 0) FROM UNNEST(credits) AS c)),
    2
  ) AS net_cost
FROM `efeonce-group.billing_export.gcp_billing_export_resource_v1_013340_4C7071_668441`
WHERE project.id = 'efeonce-globe'
  AND usage_start_time >= TIMESTAMP('2026-09-02T10:30:38Z')
GROUP BY usage_date, service
ORDER BY usage_date, net_cost DESC;
```

For future hibernations, replace the timestamp with the actual verified cutoff. Record:

- gross, credits and net;
- complete window duration;
- service and SKU/resource drivers;
- pre/post equivalent window;
- observed versus modeled status;
- any delayed adjustments.

## 13. Evidence from the 2026-09-02 execution

Shutdown chronology (UTC):

1. preflight found no active job executions and empty/reconciled worker queues;
2. schedulers were paused directly for immediate containment;
3. first Terraform plan with all preservation inputs was `0 add, 7 change, 0 destroy`;
4. first apply paused/reconciled schedulers, disabled Producer flags and stopped SQL, but the API revision could not
   start because SQL became unavailable during revision startup; the previous ready API revision retained traffic;
5. SQL was restarted to `RUNNABLE/ALWAYS`; schedulers remained paused;
6. the lifecycle was redesigned from one boolean to `active/draining/hibernated`;
7. draining plan: `0 add, 3 change, 0 destroy`;
8. draining apply updated API, Studio and Producer Worker; both service revisions became ready and all productive
   markers/selected flags read `false`;
9. final hibernation plan: `0 add, 1 change, 0 destroy`, only SQL `ALWAYS -> NEVER`;
10. final readback at `2026-09-02T10:30:38Z`: SQL `STOPPED/NEVER`, three schedulers `PAUSED`, zero active
    executions, API/Studio created = ready, `minInstances=0`;
11. SQL retained a 10 GB SSD disk, deletion protection, backups and PITR;
12. inventory retained 10 buckets, 17 secrets and Docker Artifact Registry;
13. post-change plan returned `No changes`.

Last executions before pause all completed successfully:

- Asset Governance: `globe-asset-governance-lvdhz`, created `10:17:03Z`, completed `10:17:24Z`;
- Media Derivatives: `globe-media-derivatives-tp5w6`, created `10:16:02Z`, completed `10:16:12Z`;
- Producer Worker: `globe-producer-worker-sskx9`, created `10:15:04Z`, completed `10:15:18Z`.

The failed intermediate API revision caused no deletion and was not accepted as final evidence. The corrective
criterion was a new fail-closed revision with `latestCreatedRevisionName == latestReadyRevisionName` while SQL
was available. This incident is why the `draining` state is mandatory.

### 13.1 September 3 discovery and reversible external-caller containment

Before containment, the complete hour `2026-09-03T21:00:00Z`–`22:00:00Z` contained 24 API requests to
`/v1/commands`, all HTTP 500, mean latency approximately 127 seconds. Structured logs named
`globe.tenancy.projection.reconcile` with `ETIMEDOUT`; the Greenhouse caller was still scheduled every five
minutes. This explains recurring compute despite minimum instances zero and paused Globe-owned jobs.

The operator authorized pausing that caller, and live readback at `2026-09-03T22:26:05Z` confirmed `PAUSED`.
The only cloud mutation in this slice was that scheduler pause. Its cadence, target, identity and definition
were preserved; SQL remained `STOPPED/NEVER`. Greenhouse's deploy source was corrected locally to pass `true`
as the fifth argument. No commit/push/deploy, restore test or new Terraform plan is asserted by this evidence.

Billing before this additional pause, window `[2026-09-02T11:00:00Z, 2026-09-03T11:00:00Z)`, showed CLP
2,278.27 gross/net (credits zero), including API CLP 1,248.97, networking CLP 547.03 and SQL CLP 388.56.
The 24-hour total extrapolates to approximately CLP 68,348/30 days; it is not a monthly invoice, a stable
post-containment residual, or realized savings. This observation supersedes reliance on the earlier modeled
CLP 20,000–30,000 residual without readback. Re-query equivalent complete windows after the new cutoff;
API cost cannot all be attributed to this caller without post-change evidence. Retained storage, IP/front door,
secrets and scheduler definitions can still bill. Do not delete them to meet the old modeled range.

Verification scope, executable regression tests and the still-pending source promotion are recorded in the
[September 3 QA audit](../../audits/globe/GLOBE_REVERSIBLE_CALLER_PAUSE_2026-09-03.md).

## 14. Ownership and status language

- owner: Efeonce Platform / Globe operations;
- code/IaC source: `/Users/jreye/Documents/efeonce-globe/infra/terraform`;
- external caller source: Greenhouse `services/ops-worker/deploy.sh`; source promotion is separate from live pause;
- control-plane task: `TASK-1807` in Greenhouse;
- mutable runtime summary: `GLOBE_RUNTIME_HANDOFF.md`;
- budget alerts remain alert-only; they do not shut down resources;
- current status wording: **hibernation applied; realized saving pending 24-hour, 7-day and monthly Billing Export**;
- never say “saved CLP X” using the modeled residual. Say “modeled reduction” until observed.
