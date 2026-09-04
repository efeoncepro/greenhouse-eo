---
name: greenhouse-production-release
description: Use when promoting Greenhouse to production, investigating production release drift, running release preflight, dispatching the production orchestrator, approving production gates, rolling back, changing the release control plane, OR recovering from orchestrator/preflight failures and diagnosing release blockers (sentry critical issues, vercel env drift, secret ref corruption, watchdog stale approvals, worker_revision_drift, Wait Vercel READY failure, AZURE_AD_CLIENT_ID drift, smoke probe failures). MANDATORY before touching any preflight check code, deploy.sh, or workflow YAML.
argument-hint: "[target sha, release goal, incident/drift context]"
---

# Greenhouse Production Release

Use this skill whenever a user says or implies: "pasemos a produccion",
"promote to production", "deploy main", "release", "rollback",
"preflight", "watchdog", "worker drift", "Vercel production", or "approve
production".

This skill is intentionally conservative. Production release is a control-plane
workflow, not a sequence of ad hoc deploy commands.

> **Paridad obligatoria entre agentes.** `.codex/skills/greenhouse-production-release/SKILL.md`
> y `.claude/skills/greenhouse-production-release/SKILL.md` describen el mismo control plane y
> deben conservar los mismos pasos, hard rules y gates. Antes de cualquier promoción, preflight,
> approval, rollback o drift recovery, el agente DEBE
> **re-revisar el playbook de paso a producción** (`docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md`),
> el runbook (`docs/operations/runbooks/production-release.md`) y la spec del
> control plane (`docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`) en
> cada paso a producción, y **NO operar de memoria**. La secuencia canónica
> completa está en `## Canonical Release Path` más abajo; recórrela paso por
> paso. Si los dos espejos divergen, es un bug: reconciliarlos en el mismo
> change set (ver `## Skill Maintenance Contract`).

Current watchdog posture as of 2026-05-24: `.github/workflows/production-release-watchdog.yml`
is manual-only in repo until TASK-920 repairs the false-positive signal. The
GitHub workflow is also `disabled_manually` as an emergency stop while `main`
still has the old schedule. Use `pnpm release:watchdog --json` until the
no-schedule workflow reaches `main` and the workflow is re-enabled. Do not
re-enable a schedule without TASK-920 or an explicit incident rationale.

## First Reads

Read only what the task needs, in this order:

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- **`docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md` — re-revisar OBLIGATORIO en cada paso a producción, no operar de memoria. Si el orchestrator falló, leer el JSON output como diagnóstico — no chasees el gate.**
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- **`docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — OBLIGATORIO en TODO paso a producción. Lee la `§ Pendientes de acción`: hay features `code-complete` cuyo flag default-OFF debe prenderse en prod junto a este release (a veces + migración/ops-worker). El deploy del código NO los activa — qué prender se lee de acá, no de la memoria.**
- **`docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` — OBLIGATORIO al cerrar TODO paso a producción. Registra agente, fecha, release ID, run ID, target SHA y tiempos.**
- `docs/operations/runbooks/production-release.md`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`
- `.github/workflows/production-release.yml`
- `src/lib/release/workflow-allowlist.ts`

If rollback, watchdog, Azure, Vercel, or HubSpot is involved, also read:

- `docs/operations/runbooks/production-release-watchdog.md`
- `docs/manual-de-uso/plataforma/release-watchdog.md`
- `.github/workflows/production-release-watchdog.yml`
- `.github/workflows/{ops-worker,commercial-cost-worker,ico-batch,hubspot-greenhouse-integration}-deploy.yml`
- `.github/workflows/{azure-teams-deploy,azure-teams-bot-deploy}.yml`

## Hard Rules

- Never treat a push to `main` as a completed production release.
- Never approve individual worker production gates as the normal path.
- Never reintroduce worker production deploys on `push:main`; workers deploy to
  production through the orchestrator `workflow_call` path, with
  `workflow_dispatch` reserved for documented break-glass.
- Never dispatch production without the canonical orchestrator unless the user explicitly declares break-glass and the reason is documented.
- Never mutate `greenhouse_sync.release_manifests` by raw SQL. Use the canonical CLIs/helpers.
- Never mark a release as `released` when post-release health soft-failed. It must be `degraded`.
- Never run `git push`, GitHub workflow dispatch, Cloud Run deploy, Vercel promotion, rollback, DB release transition, or approval gate without explicit user approval for that external mutation.
- Never bypass `production-release.yml` because "the workers already deployed".
- Never introduce or change a production deploy workflow without updating `src/lib/release/workflow-allowlist.ts`, the orchestrator wiring, tests, docs, and this skill.
- Never infer that Azure or a worker "skipped" from the workflow name alone. Read the job summary/logs and verify Cloud Run `Ready=True` + `GIT_SHA` or watchdog OK. Azure `no_infra_diff` can be an expected no-op; worker revision drift is never a clean release closure.
- For a release that adds or changes a reactive `ops-worker` consumer, Vercel `READY` proves only the Next.js deployment. Verify the migration/feature gate, the worker's active revision or justified change-gate equivalence, and the relevant delivery/readback independently. A deployed email consumer is not evidence that a real recipient delivery occurred. Release `0fe2420ed894` / orchestrator run `31915501771` is the recorded example: manifest `released`, Vercel and runtime/watchdog green, and `hiring_assessment_submitted_internal` enabled; real candidate delivery was not exercised.
- Talent Pool activation (2026-08-16) is the companion example: orchestrator `31953851353` reached `released`; Vercel flags and redeploy (`dpl_CTxG3tx66S159tazMSyNiGSmqzHJ`) plus the `ops-worker-00563-ghv` self-service flag were verified, health returned HTTP 200 and the watchdog was `ok`/`drift_count=0`. The release proves runtime readiness, not delivery to a real candidate: no candidate email was sent during the flag flip, so a controlled delivery smoke remains separate evidence. The MCP Hiring provider stayed read-only; candidate CV review remains independently gated by `TASK-1718`.
- **A release that changes a CONTRACT is only half-verified without a contract canary.** A contract change is: a newly required parameter, a changed unique-key shape, a changed response/DTO shape, a new required header or credential branch, or a new/renamed entry in a federated tool inventory. Neither manifest `released`, nor Vercel `READY`, nor a green watchdog proves that production *executes* the new contract — they prove the artifact was deployed. The canary must hit the real production surface and assert something **only the new contract can produce**, then be recorded in the release evidence next to the SHA/digests. The two rules above (reactive `ops-worker` consumer; "the env var exists is not the consumer working") are instances of this class, not separate exceptions. Recorded example: release `c983be7f18e6` (2026-08-28) closed green on manifest, Vercel and watchdog, and what actually distinguished "the env var is set in Vercel" from "the runtime reads it" was a production canary on the `serp-top-results` lane answering `ok:true` instead of `disabled`; the previous release used the same pattern with two write-boundary canaries against production. If a contract change ships without a canary, close the release as `degraded` or document the missing evidence — do not report it as verified.
- Never rediscover common release conditions as if they were new incidents. Approvals, CI/smoke warnings on fresh squash commits, worker latency, Azure `no_infra_diff`, `ops-worker` change-gated no-op, and final transition runner queue are documented in the runbooks. If the user asks to measure timings, record phase durations while following the playbook.
- Never close a production release without updating `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md`. The primary KPI is **agent end-to-end elapsed**, not manifest/workflow elapsed. Start the timer at the first release-related action, including reading, reviewing and analyzing. Required fields: agent name, date, release ID, orchestrator run ID, target SHA, agent E2E elapsed, phase breakdown, workflow elapsed, manifest elapsed, runtime-green elapsed, main blocker and learning.
- **Never `git push` to `main` (including hotfixes, doc-only commits, or fixes "that don't affect workers") without immediately starting the bounded readiness watch and dispatching `production-release.yml` for `target_sha=<HEAD del push>` as soon as CI, CI Deep and Vercel production for that exact SHA are green.** Every commit on `main` MUST be tracked by a release manifest. The Vercel auto-deploy on `push:main` is NOT a release — only the manifest in `greenhouse_sync.release_manifests` reflects what production is supposed to be. Do not do unrelated work during this wait or leave the SHA untracked.
- **Never cherry-pick to `main` a commit that also exists on `develop`.** Creates duplicate SHAs for the same logical change (caso real 2026-05-14: `fa5258a5/4fe799cf` mismo diff distinto SHA), confuses audit trail, breaks the exact mirror between develop/main. Canonical hotfix path: branch from `main` → fix → PR → merge → orchestrator dispatch → cherry-pick back to develop (not the other direction).
- **Never assume "hotfix small, no orchestrator needed"** — the rule has zero exceptions outside break-glass. Even a typo fix to `main` requires orchestrator dispatch to keep manifest aligned. If the fix is too trivial for a release manifest, it's too trivial to push to `main` — merge to develop and wait for the next regular release.
- **NUNCA prender un `*_ENABLED` en Production sin verificar que el código que lo LEE está en `main`.** **Producción sirve `main`** — no `develop`, no tu working tree: `git show origin/main:<archivo> | grep <FLAG>`. Si no está, el flag no se prende: se promueve primero. El caso sutil y real: el flag puede existir en `main` desde una task anterior y aun así faltar el comportamiento **nuevo** que otra task le agregó (una credencial, un header, un adapter). 🔴 **`vercel env ls` lista PRESENCIA, NUNCA el VALOR**: una var presente en Production puede estar en `false`. Para confirmar un flip hay que hacer `vercel env pull <tmp> --environment=production --scope efeonce-7670142f` y leer el valor; `env ls` sólo sirve para detectar el `env add` que no llegó. Desde 2026-09-01 `pnpm flags:audit` hace ese pull y **avisa cuando la fila del ledger dice `prod: OFF` y el valor live es `true`** — el drift que hace que un agente lea «rollout pendiente» sobre algo que lleva meses vivo y re-ejecute trabajo hecho (24 hallazgos al medirlo; warning a propósito, no error). Además `pnpm flags:audit` **falla** si un flag está ON en Production sin su código lector en `origin/main`, y **avisa** si ese código DIFIERE entre `main` y la rama de trabajo. **Correr un script con las env vars de producción NO es una prueba de producción**: usa tus credenciales, tu red y tu código. Con semántica **fail-closed** un flag mal prendido no degrada: saca usuarios reales. Caso fuente 2026-08-11 (`ISSUE-150`): `ASSET_MALWARE_SCAN_ENABLED` prendido con el adapter autenticado sólo en `develop` → 403 del scanner y 5 CV de candidatos reales en cuarentena durante 89 minutos. **Desenlace (`ISSUE-150` resuelta 2026-08-12):** el caso tuvo una SEGUNDA causa — producción corre `GCP_AUTH_PREFERENCE=service_account_key` (TASK-800) y el resolver de ID tokens no tenía esa rama; staging no la mostró porque usa WIF. Una prueba de credencial vale sólo para la RAMA de credencial que ejercita: si los environments difieren en `GCP_AUTH_PREFERENCE`, el gate de staging NO cubre producción. Verificación canónica antes del flip de todo flag que dependa de una credencial de runtime: correr el diagnóstico por-runtime EN el runtime destino — para el scanner, `GET /api/internal/health/scanner-auth?probe=scan` (reporta `flagEnabled`, `credentialPlan`, `mint.ok`, `probe.ok`; nunca el token); patrón replicable para cualquier flag credencial-dependiente.
- **SIEMPRE revisar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (§ Pendientes de acción) al planear Y al cerrar un paso a producción.** Una feature `code-complete` mergeada a `main` queda **invisible** en prod si su flag `*_ENABLED` (default OFF) no se prende explícitamente — a veces además requiere su migración aplicada a prod (vía este release) y/o redeploy del ops-worker. El deploy del código NO prende flags. Qué flags prender con este release se lee del ledger, no de la memoria; tras prenderlos, actualizar el snapshot del ledger. **NUNCA** declarar un release `released` dejando un flag que debía prenderse en este release sin prender (queda como `degraded` o pendiente documentado).

- **NUNCA dispatchar `production-release.yml` sin listar antes los runs del orquestador** (delta 2026-09-03): `gh run list --workflow=production-release.yml --limit 3 --json databaseId,status,headSha,createdAt`. Si existe un run `queued|pending|in_progress|waiting` para el mismo SHA, NO se dispatcha ni se cancela: se sigue ese run (approval, verificación, watchdog, ledgers). `ListAgents` sólo ve sesiones Claude — Codex no aparece —, así que ese comando es la única detección cross-agente posible. Caso `a824d073a5fb`: Codex dispatchó `33793141529` a las 18:52:58Z y Claude `33793232779` a las 18:53:54Z para el mismo SHA sin saberlo; el segundo quedó `pending` por el grupo `production-release-<sha>`.
- **NUNCA cancelar un run del orquestador mientras exista otro run o manifest activo del mismo SHA.** `src/lib/release/github-webhook-reconciler.ts` → `findReleaseMatch` empareja PRIMERO por `target_sha` (manifest activo primero) y sólo después por `workflow_run_id`; ese fallback es hoy inalcanzable porque nada escribe `release_manifests.workflow_runs` (`[]` en los tres manifests del caso). Un `workflow_run.cancelled` del duplicado aborta el manifest ajeno: a las 19:04:35Z el cancel de `33793232779` abortó el attempt 1 (`a824d073a5fb-41320325`, `matchedBy: target_sha`) cuando el run de Codex ya había desplegado los 4 workers y pasado health; el job final «Transition → released» falló porque `aborted` es terminal. Un duplicado `pending` se deja morir por concurrencia, o se cancela SOLO cuando el manifest del run dueño ya está en estado terminal. Fix de raíz (registro del run en el manifest + matching por run ID + test del caso): `TASK-1815`.
- **Si el operador designa a otra sesión para llevar el release, retirarse ANTES de aprobar gates o dispatchar, nunca después:** no aprobar el gate del run ajeno «creyéndolo el reintento único», cancelar sólo lo propio y sólo cuando no quede manifest ajeno activo, y dejar el retiro escrito (commit, Handoff o ledger). Caso 2026-09-03: el retiro de Claude quedó en `587179533`; el intento único `33795564223` (attempt 3, un coordinador) cerró `released` a las 19:30:49Z.

### AXIS private package release boundary

AXIS package authentication is a **build-time** concern. `NPM_RC`, GitHub Packages
read access, and the scoped Secret Manager reference allow a consumer build to
install private `@efeoncepro/axis-*` packages; they do not prove that Greenhouse
or Globe imports, renders, or operates an AXIS consumer at runtime. The Vercel
Lab's `NPM_RC` is Lab readiness evidence only, not consumer-runtime evidence.

Treat AXIS consumer product promotion as gated by the release control plane;
`TASK-1591` is the completed opt-in pilot. Before promotion, the
release evidence must include the exact consumer build, package versions, target
commit, image/deployment digest where applicable, runtime smoke evidence, and a
rollback target. For Globe/Cloud Build, keep the package credential scoped to
Secret Manager and the build identity; never bake the token into an image,
artifact, deployment variable, or log. A rollback must identify both the
consumer deployment/image digest and the package/auth configuration that was
used to build it; restoring traffic alone is insufficient if the build cannot
be reproduced.

Canonical pointers: [AXIS shared UI platform ADR](../../docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md),
[AXIS private package consumption runbook](../../docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md),
and `TASK-1591`.

For an AXIS secret migration, the release gate is also a secret-hygiene gate: confirm that every consumer
references `projects/efeonce-group/secrets/axis-packages-read-token`, that the legacy `efeonce-globe`
reference is absent from active build/deploy paths, and that only the required build identities can access
the replacement. Temporary GitHub authentication is allowed only to create the scoped `read:packages`
credential through an already authenticated browser session; never put the token in a command argument,
file, CI variable, screenshot, log, or chat. Stream it directly into Secret Manager and retain only
non-sensitive metadata (owner, note, expiry, version, IAM principals, build status).

The release evidence must include: exact target SHA; package names/versions; CI/build run; artifact or
deployment digest; active Cloud Run/Vercel revision; runtime smoke result; canary result; and the previous
known-good deployment/image digest as rollback target. Do not retire the legacy secret version or revoke the
legacy credential until the production build and runtime evidence are green. After retirement, verify the
replacement still builds a private package and record the legacy disable/revocation result without exposing
either credential.

## Coordinación de intentos y recuperación con eventos

- Un coordinador por release. Antes de merge/dispatch/approval/cancelación, lee los runs existentes,
  el manifest y sus `workflow_runs`; al retomar otra sesión conserva SHA, run ID y release ID.
- **No canceles un duplicado como limpieza inocua:** el reconciler vigente prioriza `target_sha`
  antes de run ID y puede abortar el manifest del intento correcto. La concurrency group no evita
  webhooks tardíos. Este defecto sigue pendiente; operación serial es mitigación, no corrección.
- Tras cancelaciones, verifica conclusiones terminales y procesamiento de sus webhooks/inbox antes
  del próximo dispatch. Relee el manifest. `aborted` es terminal: nunca SQL ni retry del job final
  contra ese manifest; crea el nuevo intento por el orquestador con preflight válido.
- `completed/cancelled` no es éxito ni prueba de fallo Bicep/proveedor. Lee jobs, anotaciones y actor;
  atribuye cada acción al run y coordinador verificados. Runtime sano no sustituye manifest cerrado.
- Si una recuperación emite eventos, verifica antes la guarda en todos los runtimes consumidores
  activos (incluidos Vercel y worker cuando ambos la ejecutan). Después, verifica entrega y proyección
  de los eventos exactos y compara los datos protegidos; un readback inmediato no cubre una regresión
  asíncrona. Recuperación aplicada y release cerrado se reportan por separado.

Procedimiento dueño: `docs/operations/runbooks/production-release.md` §0.1. Incidente y evidencia:
`docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md` §16. No repitas cancelaciones ni recuperaciones
por una nota histórica; consulta estado actual y la clave de idempotencia.

## Canonical Release Path

The normal release path is:

0. Start an agent E2E release timer and prepare the timing-ledger row. Reading, review, analysis and preparation count.
1. Confirm current branch, remotes, dirty worktree, coordinator and existing orchestrator/manifest. Follow the existing attempt when one is active.
2. Confirm `develop` is green and no unrelated local changes will be included.
3. Run or inspect release preflight:
   - local exploratory: `pnpm release:preflight --target-sha=<sha> --target-branch=main`
   - CI/orchestrator gate: `pnpm release:preflight --json --fail-on-error --output-file=<path> --target-sha=<sha> --target-branch=main`
   - `--fail-on-error` must fail on any `readyToDeploy=false` payload; do
     not promote a degraded or unknown preflight.
4. Promote the intended SHA to `main` through the repo-approved merge/push path.
   - **Antes de crear el PR, corre la pre-empción de los 3 gotchas** (ver
     `## Pre-empción de los 3 gotchas` más abajo + runbook §2.4). Es la
     diferencia verificada entre un release que pasa a la primera y uno que
     quema runs, bypasses y retries.
   - The orchestrator expects `target_sha` to already exist on `main`.
   - Vercel production deploy is triggered by Git integration on push to `main`; the orchestrator waits for that deployment to be READY.
   - Worker Cloud Run production deploys are not triggered by `push:main`; the orchestrator owns them through `workflow_call`.
   - Immediately start a bounded readiness watch. Before the first dispatch, require `CI` and
     `CI Deep Verification` for the exact main SHA to finish green and its Vercel Production
     deployment to reach `READY`. Pending evidence is not a bypassable failure and should not burn
     a failed orchestrator run.
5. Dispatch the canonical orchestrator for that exact SHA as soon as those prerequisites are green:

```bash
gh workflow run production-release.yml \
  --ref main \
  -f target_sha=<40-char-sha> \
  -f force_infra_deploy=false
```

6. Approve the `production` environment gate — **OJO: el entorno `production` se pide
   DOS veces en el mismo run** (ver gotcha #6). Aprueba AMBAS: la primera (jobs del
   orquestador) y la segunda (jobs Azure gated, que aparece después de que arrancan los
   deploys). Si dejas la segunda sin aprobar, el run queda `waiting` indefinidamente y el
   manifest NUNCA transiciona a `released`. **Polea `pending_deployments` REPETIDAMENTE
   durante todo el run, no solo el `.status` del run** (el status queda `waiting` pero no
   dice que hay un gate esperando). No aprobar runs de workers stale ajenos.

   ```bash
   # Detectar y aprobar CADA gate pendiente (correr en loop hasta run=completed):
   gh api "repos/efeoncepro/greenhouse-eo/actions/runs/<run_id>/pending_deployments" \
     --jq '.[] | {env:.environment.name, id:.environment.id, canApprove:.current_user_can_approve}'
   gh api "repos/efeoncepro/greenhouse-eo/actions/runs/<run_id>/pending_deployments" \
     -X POST -f state=approved -F "environment_ids[]=<env_id>" -f comment="<razon>"
   ```

   ⚠️ **zsh:** en estos loops NUNCA nombres una variable `status` — choca con la variable read-only built-in de zsh y el loop muere con `read-only variable: status` sin traza útil (mató el loop de gates dos veces: 2026-07-17 y 2026-08-11/12). Usa `run_state`/`st_json` u otro nombre.
7. Watch the orchestrator complete:
   - preflight
   - record-started
   - approval-gate
   - 5 Cloud Run services via `workflow_call` (4 workers + `auth-server`, TASK-1828)
   - Azure gated jobs
   - Vercel production READY
   - `/api/auth/health`
   - manifest transition to `released` or `degraded`
8. Run or inspect watchdog after completion. The remote scheduled/manual workflow remains disabled;
   use the local reader with the authenticated GitHub token:

```bash
GITHUB_RELEASE_OBSERVER_TOKEN="$(gh auth token)" pnpm release:watchdog --json
```

9. Verify Cloud Run `GIT_SHA` for mapped services when needed. El comando canónico es
   el wrapper — `gcloud` crudo sólo como último recurso, porque los snippets de CLI en
   markdown se pudren en silencio (TASK-1676: tres comandos documentados fallaron en un
   solo release, ninguno de los envueltos en `pnpm`):

```bash
pnpm release:workers --expected-sha=<target_sha>
```

   Servicios mapeados (el wrapper los lee de `RELEASE_DEPLOY_WORKFLOWS`, no los hardcodea):
   - `ops-worker` in `us-east4`
   - `commercial-cost-worker` in `us-east4`
   - `ico-batch-worker` in `us-east4`
   - `hubspot-greenhouse-integration` in `us-central1`
   - `auth-server` in `us-east4` (TASK-1828 / EPIC-044 — authorization server propio; `AUTH_SERVER_ENABLED` default `true` en `deploy.sh` desde 2026-09-04; producción lo recibe con el próximo release)
   Si el wrapper marca un SHA distinto, dice «NO es drift automáticamente: ver runbook §4.1». Lo que
   decide si ese no-op es legítimo es un **diff de árbol completo, sin `--`** — no el skip del
   change-gate, que sólo habla de las rutas declaradas (anti-patrón #4):

```bash
git diff --name-only <cloud_run_git_sha> <target_sha>   # vacío ⇒ skip legítimo; con archivos ⇒ investigar
```

   For AXIS consumers, also verify the active revision/image digest and that the deployed artifact does
   not contain `.npmrc`, the package token, or an unscoped registry credential.
10. **Prender los flags pendientes de este release — en TODOS los runtimes, no sólo Vercel.** Revisar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` → `§ Pendientes de acción`. Por cada feature `code-complete` cuyo flip estaba gated a este release:
    - **Paso 0 obligatorio — mapear dónde se LEE el flag:** `grep -rn "<FLAG>" src/ services/ | grep -v __tests__`. Hay **6 runtimes con env vars independientes** (5 hasta TASK-1828): Vercel (app Next.js) + 5 Cloud Run (`ops-worker`, `commercial-cost-worker`, `ico-batch-worker`, `hubspot-greenhouse-integration`, `auth-server` — sus `AUTH_SERVER_*` viven sólo en `services/auth-server/deploy.sh`). Prenderlo en uno **NO** lo prende en los otros. **Heurística:** si gatea algo **async** (email, projection reactiva, consumer del outbox, cron de Cloud Scheduler, materializer) vive en el **`ops-worker`, NO en Vercel** — prenderlo en Vercel no hace nada; si gatea una ruta/superficie visible vive en Vercel; puede vivir en **ambos**.
    - **Paso 0.5 obligatorio — confirmar que el código lector está en `main`:** `git show origin/main:<archivo> | grep <FLAG>` por cada archivo del mapeo. Producción sirve `main`; un flag ON sobre código ausente (o sobre una versión vieja del lector) es fail-closed esperando gente. `pnpm flags:audit` lo chequea, pero hazlo también a mano antes de prender. Ver la hard rule de `ISSUE-150`.
    - **Aplicar en cada runtime del mapeo:** Vercel → `vercel env add <FLAG> Production` + **redeploy obligatorio** (Vercel **congela las env vars al crear el build**: un flag agregado después del build productivo del release no existe para el runtime hasta que hay un deployment nuevo — caso 2026-08-06, `GROWTH_SEO_ENABLED` requirió `dpl_GyGkdEQQTk65qkCs1S3TEH6Jquy9`). Si el flag se puede prender **antes** del merge del PR, el build del release lo hornea y el redeploy no existe. Cloud Run → **los DOS pasos**: (a) declarar el flag en `services/<worker>/deploy.sh` (SoT; esos scripts usan `--set-env-vars` **destructivo**, que borra cualquier var agregada out-of-band) y (b) `gcloud run services update <svc> --region <us-east4|us-central1> --project efeonce-group --update-env-vars <FLAG>=true` para efecto inmediato. Hacer sólo (b) = el flag desaparece en el próximo deploy del worker, en silencio.
    - **Verificar en el deploy/revisión ACTIVO** (`vercel env ls` · `gcloud run revisions describe <rev> --format="json(spec.containers[0].env)"`) **y ejercitar el flujo real** — que la var exista ≠ que el consumer funcione. En Vercel, **confirmar cada flag con `vercel env ls | grep <FLAG>` filtrando por environment**: un `env add` fallido **no siempre es evidente en la salida** (sobre todo en batch, donde el script suele imprimir un `✗ falló` sin el mensaje de la API). Ver gotcha #14.
    - **Actualizar la fila del ledger declarando el/los runtime(s)** + fecha + revisión Cloud Run. Sin el runtime explícito, el próximo agente asume Vercel y se equivoca.

    El deploy del código no activa nada por sí solo. Si un flag requería su migración en prod, confirmar que entró por este release antes de prenderlo. **Apagar/rollback también es multi-runtime.** Caso fuente 2026-07-09: `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED` vive sólo en el `ops-worker`; el runbook sólo enseñaba `vercel env add` y prenderlo ahí habría dejado el email muerto con la success card prometiéndoselo al usuario.
11. **Registrar tiempos del release.** Actualizar `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` con agente, fecha, release ID, run ID, target SHA, agent E2E elapsed como KPI principal, desglose de fases, workflow elapsed, manifest elapsed, runtime-green elapsed, blocker principal y aprendizaje.

12. **Canary de contrato (siempre) y rollback.** Si el diff del release cambia un contrato
    (parámetro requerido nuevo, forma de clave única, shape de respuesta/DTO, header o rama de
    credencial nueva, inventario de tools federado), ejercita ese contrato contra **producción**
    y guarda el resultado como evidencia: el manifest y Vercel `READY` prueban despliegue, no
    ejecución. El canary tiene que afirmar algo que **sólo el contrato nuevo puede producir**
    (un lane que responde `ok:true` en vez de `disabled`; un boundary de escritura que rechaza
    una llamada sin atribución; el inventario federado devolviendo el conteo nuevo). Para AXIS,
    además: mantener los canaries de navegador opt-in y deterministas — usar la
    dependencia `playwright-core` y lanzar Chromium con `channel: 'chrome'`; no descargar browsers ni
    depender de una ruta local del equipo del autor. El canary debe ejercitar la superficie real del
    consumidor, guardar evidencia de assertions/URL/console/network relevante y fallar con un diagnóstico
    accionable. Si falla después de publicar, detener la promoción o restaurar el tráfico al deployment
    anterior conocido, verificar salud y smoke del rollback, y conservar ambos digests/SHA y la evidencia.
    Restaurar tráfico sin conservar la configuración de build/credencial no es un rollback reproducible.

## Pre-empción de los 3 gotchas (camino recomendado — verificado 2026-08-06)

Los gotchas #1/#2/#3 de abajo **no hay que sufrirlos: hay que pre-emptarlos**. El
release `70e912056273d0a30e2aa8dacc2f4e62076e3b44` (release_id
`70e912056273-03c36b47-eb75-469c-886f-51c691cd7c34`, run `31058032196`, PR #177,
355 commits / 221 archivos de código / 14 migraciones) fue el primero del ledger
que **pasó a la primera: sin `bypass_preflight_reason`, sin retry y con
`drift_count=0`**. No fue por ser un batch chico — fue por el orden.

> **Un gotcha documentado y no pre-emptado es un incidente agendado.** El
> catálogo se aplica ANTES de crear el PR, no cuando el gate ya está rojo.
> Antes de escribir un bypass, la pregunta correcta es **"¿puedo producir la
> evidencia que falta?"**, no "¿cómo justifico saltármela?".

Secuencia (comandos exactos + verificaciones en el runbook §2.4):

```bash
# A — Gotcha #1: merge canónico en develop ANTES de crear el PR
git fetch origin && git switch develop

# V1 se CLASIFICA, no se cuenta. La pregunta NO es "¿está vacía?" (con squash-merge
# NUNCA lo está en el estado estacionario) sino "¿main aporta contenido PROPIO?".
git log origin/main --not HEAD --format='%h %s'
#   · sólo squashes de release (`release: … (#NNN)`, SHA = target_sha de un manifest
#     `released`)                                   → estado estacionario → `-s ours`
#   · un hotfix/push directo/revert hecho en main cuyo contenido YA está en develop
#     (camino canónico = cherry-pick de vuelta)     → `-s ours` sigue siendo correcto
#   · contenido propio de main que NO está en develop → 🛑 PARAR: reconciliar por
#     cherry-pick A DEVELOP antes de mergear. NUNCA cambiar de estrategia para pasar.

git merge origin/main -s ours --no-edit     # DEFAULT canónico: árbol de develop EXACTO
git diff HEAD@{1} HEAD --stat               # `-s ours` ⇒ TOTALMENTE vacío, siempre

# `-X ours` NO es el default de ninguna rama: excepción documentada. Si se usa, la
# auditoría obligatoria es el --name-status COMPLETO, nunca la acotada a código:
#   git merge origin/main -X ours --no-edit
#   git status --short | grep '^DU\|^UD\|^AA\|^UU'  →  git rm <ruta-que-main-resucita>
#   git diff HEAD@{1} HEAD --name-status    ← TODO lo que trajo el merge (la que caza)
#   git diff HEAD@{1} HEAD -- src/ scripts/ services/ migrations/  # necesaria, NO suficiente

# Respaldo barato en los DOS caminos: archivos que existen SÓLO en main → debe salir vacío
git diff --diff-filter=A --name-only origin/develop origin/main

git push origin develop     # → el PR queda MERGEABLE

# B — Gotcha #2: marker SOLO si el acoplamiento es real (ISSUE-114 resuelta 2026-08-08:
#     el classifier ya usa two-dot, así que los dominios que reporta son REALES).
#     Un solo dominio irreversible (p.ej. db_migrations con su consumer directo) NO es
#     un acoplamiento que declarar. Si no lo nombras en una frase, parte el batch.
#
#     ⚠️ FORMATO ESTRICTO desde TASK-1676: el marker tiene que ABRIR UNA LÍNEA del
#     cuerpo del squash, y se lee SÓLO de ese commit (antes bastaba mencionarlo en
#     cualquier commit del rango, y una cita en prosa neutralizaba `split_batch` para
#     un batch entero). Un marker a mitad de línea ya NO cuenta.
gh pr merge <pr> --squash --body "[release-coupled: <por qué conviven los dominios>]"

# C — Gotcha #3: producir el smoke sobre main en vez de bypassearlo (~3 min)
gh workflow run playwright.yml --ref main
```

> 🔴 **Delta 2026-08-23 (release `709e15f6688e`): `-X ours` duplica contenido documental y las dos
> verificaciones duras NO lo ven.** Salieron ambas vacías y el merge igual resucitó 8 archivos de
> tasks en su ubicación de lifecycle vieja **y duplicó un bloque de 10 líneas de un manual que
> `develop` ya tenía** — `-X ours` sólo decide los hunks en conflicto, y un hunk de `main` que
> aplica limpio en otra parte del archivo entra como adición silenciosa. Las verificaciones miran
> `src/ scripts/ services/ migrations/`, así que la prosa duplicada pasa. La que lo caza es
> `git diff HEAD@{1} HEAD --name-status` completo.
>
> 🔴 **Delta 2026-08-28 (release `c983be7f18e6`): la regla de decisión estaba mal formulada y su
> "caso normal" era INALCANZABLE.** Decía: *"si `git log origin/main --not HEAD` no trae commits
> (el caso normal) → `-s ours`; si trae commits → `-X ours`"*. Con squash-merge eso **nunca**
> ocurre en el estado estacionario: cada release deja en `main` un squash que no será ancestro de
> `develop` hasta que lo traiga el merge canónico del release siguiente. Verificado: los squashes
> de los 7 releases del 2026-08-09 al 08-27 (`2c87d71e2eca`, `950f5bdb4`, `3754a17d3b1d`,
> `fa54670470c1`, `30301816955f`, `709e15f6688e`, `cc73c74789ce`) son **todos** ancestros de
> `origin/develop` hoy, y V1 al arrancar el release del 2026-08-28 era exactamente
> `{cc73c74789ce}` = el squash del release anterior. La regla literal empujaba a `-X ours` en
> **todos** los releases. Costo ese día: `-X ours` duplicó un bloque completo de
> `.claude/rules/growth-seo.md` y resucitó TASK-1775/1776/1777 en `docs/tasks/in-progress/`
> teniéndolas `develop` en `complete/` — **con la verificación acotada a código VACÍA**; sólo el
> `--name-status` completo lo cazó. **Por eso V1 se clasifica y `-s ours` es el default: no es una
> preferencia, es que `-X ours` puede colar contenido y `-s ours` no puede.**

Después: esperar `CI` + `CI Deep Verification` + Vercel `Ready` **para el SHA de
`main`** + el smoke recién disparado; piso duro de **8 min** desde el push antes
del dispatch (el 2026-08-06 fueron 24 min); y polear `pending_deployments` en
loop desde el arranque para los DOS gates `production` (gotcha #6).

La pre-empción incluye además verificar que el último deploy de **staging** no
esté `CANCELED` (gotcha #7) antes del dispatch — un push docs-only a `develop`
cancelado por el ignore-build quema el run del orquestador.

## Gotchas conocidos del release (verificados 2026-07-03 #139 y 2026-08-06 #177/#178; fix de raíz de #2 = ISSUE-114)

El flujo de **squash-merge** produce condiciones recurrentes que NO son fallas reales. No las persigas como bugs; aplica la mitigación:

1. **El PR `develop→main` conflicta ("merge commit cannot be cleanly created").** `main` (squashes de releases previos) no es ancestro de `develop` → conflictos (docs Handoff/changelog/README/registry y a veces código). **Resolución robusta:** en `develop`, `git merge origin/main -s ours --no-edit` (`develop` es autoritativo — contiene todo `main` por construcción: los squash de `main` son DE commits de `develop`; `-s ours` toma su árbol ENTERO). Push `develop` → el PR queda MERGEABLE. Bonus: **avanza la merge-base** y reduce la divergencia del próximo release. **NUNCA** cherry-pick a `main` (duplica SHAs).
   🔴 **Delta 2026-08-28 (release `c983be7f18e6`): la estrategia se decide CLASIFICANDO lo que `main` tiene de propio, no contándolo.** Con squash-merge, `git log origin/main --not HEAD` **nunca** sale vacío en el estado estacionario (siempre queda al menos el squash del release anterior), así que "está vacío ⇒ `-s ours`" era una rama inalcanzable y la regla empujaba a `-X ours` siempre. Árbol de decisión: **sólo squashes de release** (título `release: … (#NNN)`, SHA = `target_sha` de un manifest `released`) → **`-s ours`**, porque ese contenido salió de `develop` por construcción · **cualquier otra cosa** (hotfix en `main`, push directo, revert en `main`) → verificar si ya está en `develop` (el camino canónico exige cherry-pick de vuelta): si ya está, `-s ours`; si **no** está, 🛑 **PARAR** y reconciliarlo por cherry-pick **a `develop`** antes de mergear. Nunca cambiar de estrategia para pasar.
   **Conflictos: sólo existen con `-X ours`.** `-s ours` no produce conflictos nunca (árbol de `develop` completo) y no deja nada que auditar. En el camino excepcional, `-X ours` resuelve los conflictos de **contenido** a favor de `develop` pero **no** los de **ruta** — se deciden a mano, y `develop` siempre manda: `modify/delete` (2026-08-06: `TASK-1590` borrada en `develop` porque migró de `to-do/` a `in-progress/`, modificada en `main` → `git rm` de la copia en `to-do/`) y `rename/rename` (2026-08-28: `TASK-1658` en `complete/` en `develop` y en `in-progress/` en `main` → `git rm` de la copia en `in-progress/`, la task ya cerró).
   **Verificación:** con `-X ours`, la obligatoria es `git diff HEAD@{1} HEAD --name-status` **COMPLETO**; la acotada a `src/ scripts/ services/ migrations/` es necesaria pero **NO suficiente** (salió vacía el 2026-08-23 y el 2026-08-28 con duplicación documental real). Respaldo barato en los dos caminos: `git diff --diff-filter=A --name-only origin/develop origin/main` vacío (archivos que existen sólo en `main`).

2. **~~Preflight `release_batch_policy` falso positivo.~~ RESUELTO 2026-08-08 (ISSUE-114).** El classifier usaba diff *three-dot* (`origin/main...target`, merge-base) y resucitaba archivos ya desplegados en un release previo como `cloud_release` irreversible, inflando el conteo. **Ya no:** `collectChangedFiles` usa **two-dot** y ambos consumidores del rango (archivos + commit bodies) lo resuelven por la función única `buildReleaseDiffRange`, con guardrail anti-regresión en `src/lib/release/preflight/checks/release-batch-policy.test.ts` (fija el rango en el argv de git). **Consecuencia dura: si hoy el classifier reporta un dominio irreversible, es REAL — NUNCA lo descartes como fantasma "conocido" ni le pongas un marker por costumbre.** Verifícalo igual con `git diff origin/main..target -- <archivo>`. **Delta 2026-08-09 (`TASK-1676`, cierra `ISSUE-145`): el gate ya tiene dientes post-merge.** Hasta esta fecha, post-merge (target = HEAD de `main`) el rango quedaba **vacío** y el batch-policy del orquestador pasaba SIEMPRE — tres releases consecutivos reportaron `filesChanged=0, decision=ship`, uno con 1045 archivos y 14 migraciones. Ahora la base es el `target_sha` del último manifest en estado `released` para la rama, así que el check clasifica el diff real en los dos momentos. Dos consecuencias operativas:

- **Un `filesChanged=0` ya no es aprobación: es `severity: unknown`.** Si lo ves, el target coincide con el último release desplegado o la base no se pudo resolver — en ninguno de los dos casos el gate miró nada. El summary dice contra qué base comparó y de qué release salió.
- **El marker `[release-coupled: …]` por fin se lee donde el runbook dice**, porque el rango post-merge contiene el commit de squash. Ver el paso B de la pre-empción para el formato exacto, que ahora es estricto.

   **Resolución verificada 2026-08-06:** el preflight **local** dio `split_batch` por "payroll + auth_access mezclados" sobre **1051 archivos** inflados (los de código reales eran 221). La respuesta canónica **no fue** `bypass_preflight_reason`, sino el marker `[release-coupled: <razón>]` en el **cuerpo del commit de squash** — que es lo que lee el classifier del orquestador —, explicando que los dominios mezclados son acumulación de una semana de trabajo independiente y ya verde, no un acoplamiento de diseño. Con eso el preflight del orquestador pasó `ship` **sin bypass**. Si la razón honesta fuera "son cambios acoplados de verdad y no sé explicar el rollback en una frase", el batch hay que **partirlo**, no marcarlo.

3. **`playwright_smoke` (0 runs) + evidencia aún corriendo en el squash commit fresco de `main`.** El smoke corre en `develop` (ya verde); el commit de `main` no tiene su propio smoke. Antes del primer dispatch, esperar `CI`, `CI Deep Verification` y Vercel Production `READY` para el SHA exacto.
   **Resolución verificada 2026-08-06 — la alternativa HONESTA al bypass es producir el check:** `gh workflow run playwright.yml --ref main` sobre el SHA de `main` y esperar verde. Tardó **3m10s** (run `31057847351`). Ése es el costo total de no bypassear nada. Un `bypass_preflight_reason` forense (≥20 chars) queda reservado para cuando el smoke **falla por infraestructura** y el operador lo autoriza; nunca para ahorrarse 3 minutos, y nunca para cubrir checks pendientes o fallidos.

4. **ops-worker puede quedar con GIT_SHA rezagado tras el release — NO es drift si el diff runtime está vacío.** `ops-worker-deploy` es *change-gated*: si ningún worker-runtime-path cambió desde `EXPECTED_SHA`, salta el rebuild (`deploy_needed=false`) y el servicio conserva el SHA del último deploy que sí tocó código de worker (código idéntico al target, por diseño — ver el step de worker-drift del workflow). Si el watchdog final marca solo `ops-worker`, comparar Cloud Run `GIT_SHA` contra `target_sha` en rutas runtime; si el diff **contra la lista real del gate** no devuelve archivos y Cloud Run está `Ready=True`, parar: documenta residual de label y **NO** fuerces redeploy para "alinear el label". Los otros 3 workers sí redeployan al target.
   **Delta 2026-08-06 — el watchdog YA clasifica bien este residual.** Hasta el release `503186d7147a` (2026-07-17) lo reportaba como `severity=error` por comparación mecánica de SHA, y cada agente tenía que refutarlo a mano. El fix vive en el commit `6f7e246ea` de `main`: en el release `70e912056273` el `ops-worker` quedó en `558558263e80` (un SHA de `develop` del mismo día), con diff de rutas runtime vacío y `Ready=True`, y el watchdog reportó **`drift_count=0`** explicándolo en su propio `detail` (`change-gated — rutas runtime sin cambios`). Consecuencia: si hoy ves `severity=error` por `ops-worker` con diff vacío, **no lo asumas benigno por costumbre** — verifica que estás corriendo el reader del `main` actual. El `git diff` sigue siendo la verificación que manda — **pero con la lista correcta**: ver el aviso de abajo.
   🔴 **La lista de rutas se LEE del workflow, nunca se transcribe (verificado 2026-08-23, release `709e15f6688e`).** El gate real es el array `WORKER_RUNTIME_PATHS` de `.github/workflows/ops-worker-deploy.yml`, hoy 12 prefijos amplios (`src/lib` completo, `src/emails`, `src/config`, `src/@core`, `services/ops-worker`, …) tras el fix del 2026-08-29 — antes eran ~28 entradas finas. La lista de 7 entradas que esta skill y el runbook arrastraban **no existe en ningún gate** (`src/lib/ops` y `scripts/ops-worker` ni siquiera figuran en el array). Con ella, un batch que tocaba tres rutas del gate real dio «vacío» sin haber mirado ninguna de las tres. Comando canónico:

   ```bash
   PATHS=$(sed -n '/WORKER_RUNTIME_PATHS=(/,/^          )/p' \
     .github/workflows/ops-worker-deploy.yml | sed '1d;$d' | tr -d ' ')
   git diff --name-only <cloud_run_git_sha> <target_sha> -- $PATHS
   ```

   🔴 **La verificación que MANDA es el diff de ÁRBOL COMPLETO, sin `--` (release `64bdd105c737`, 2026-08-29).** Un skip del change-gate **NO** prueba que el diff runtime sea vacío: prueba que **las rutas DECLARADAS** no cambiaron. Son cosas distintas apenas la lista deja de describir el bundle — y dejó de describirlo: el `ops-worker` bundlea 1449 archivos y la lista cubría 24 prefijos, con 696 archivos invisibles (`src/lib/postgres`, casi todo `src/lib/finance`, todo `src/lib/growth/seo`). Ese release cerró con manifest `released`, Vercel READY, watchdog `drift_count=0` y 3 de 4 workers en el target, mientras el `ops-worker` servía `8adf8c2d3` — justo el código que ese release existía para corregir. El job no falló: duró **46 s**, el step `Deploy ops-worker` quedó `skipped` y cerró `success`.

   ```bash
   git diff --name-only <cloud_run_git_sha> <target_sha>   # vacío ⇒ árboles idénticos ⇒ skip legítimo
   ```

   - **Vacío** ⇒ los dos árboles son idénticos ⇒ el no-op es legítimo, sin depender de ninguna lista. Caso verificado: release `e1718a359575` contra `380a20fa3`, skip de 44 s correcto.
   - **NO vacío** ⇒ el skip es una afirmación sobre la lista, no sobre el runtime. Revisa si algún archivo del diff entra al bundle; si entra, el worker está sirviendo código viejo y hay que desplegarlo (break-glass: `workflow_dispatch` de `ops-worker-deploy.yml` con `environment=production`, autorizado por el operador).
   - Este diff cubre además el sanity del rango: un diff vacío porque el SHA no resolvió se ve idéntico a uno vacío porque no hay drift.

   **El mecanismo que cierra la clase (commit `146070ffc`, 2026-08-29):** `pnpm worker:deploy-path-gate` deriva la cobertura del **bundle real** — replica el `esbuild --bundle` del Dockerfile y lee `metafile.inputs`, transitivos incluidos —, así que un archivo del artefacto que no cae bajo ningún prefijo declarado rompe CI. Hubo **cinco** recurrencias previas documentadas en el propio workflow (TASK-1210, 742, 1723, 1746, 1279), cada una cerrada agregando una ruta más. **NUNCA** cierres la siguiente agregando otra ruta a mano sin correr el gate.

5. **Vercel Ignored Build Step no aplica a production/main.** Desde 2026-07-08,
   `vercel.json` puede cancelar builds docs-only de `develop`/previews mediante
   `scripts/ci/vercel-ignore-build.mjs`, pero **main/Production queda
   excluido** porque `production-release.yml` espera un deployment Vercel
   `READY` para el `target_sha`. Si un release futuro quiere ahorrar builds
   docs-only en `main`, primero debe modelar explícitamente un estado
   `vercel_skipped` en el release control plane, runbooks y watchdog.

6. **El entorno `production` se pide DOS veces — los jobs Azure gated tienen su propio
   gate (verificado 2026-07-09, release `41aefb457`).** Tras aprobar la 1ra aprobación
   (jobs del orquestador: preflight/record/workers/Vercel), los 2 jobs Azure gated
   (`Deploy Azure Teams Bot (gated)` / `Deploy Azure Teams Notifications (gated)` →
   step `Health check Azure (preflight-style)`) piden **una SEGUNDA aprobación del mismo
   entorno `production`**. Mientras no se aprueba, esos jobs quedan `waiting`, el run
   completo queda `waiting`, y el job `Transition release_manifests → released` **no
   corre** (el manifest queda en estado `preflight`, nunca `released`). **Síntoma:**
   `gh run view` muestra `run=waiting/` indefinido pese a que workers + Vercel + health
   ya están verdes; el `.status` NO revela que hay un gate esperando. **Fix:** polea
   `pending_deployments` en loop (no solo `run.status`) y aprueba el 2do gate. Una vez
   aprobado, los jobs Azure corren `Validate Bicep` + `Detect Bicep diff vs origin/main`
   → **`Skip Bicep deploy (no diff)` + `Deploy … stack` = `skipped`** (no-op esperado
   cuando no hay diff de infra ni federated creds — coincide con "Azure `no_infra_diff`
   puede ser un no-op esperado"), y entonces corre la transición → `released`. **Costo si
   se omite:** en `41aefb457` el 2do gate quedó sin aprobar ~43 min → el run stalleó todo
   ese tiempo. **Regla: aprobar SIEMPRE ambos gates `production` de inmediato.** (Este es
   el "siempre se quedan waiting" de los jobs Azure: no es una falla, es el 2do gate.)

7. **Pushes docs-only a `develop` justo antes del release cancelan el build de staging y bloquean el
   preflight (verificado 2026-08-06, release `fcee5ab9f7ce`).** El Ignored Build Step de Vercel
   (`scripts/ci/vercel-ignore-build.mjs`, gotcha #5) cancela los builds docs-only de `develop`; el
   check `vercel_environments` del preflight exige que el deploy más reciente de **staging** esté
   `READY` y falla con "Production READY, pero staging deploy CANCELED" (severity `warning` pero
   **exit 1** → run del orquestador quemado: run `31104631142`).
   **Resolución verificada 2026-08-06 — producir la evidencia, no bypassear:**
   `vercel redeploy <url-del-deployment-cancelado> --scope efeonce-7670142f` (~6 min de build),
   esperar `READY` y re-dispatchar. Pre-empción: **secuenciar los pushes docs-only para DESPUÉS del
   release** y verificar que el último deploy de staging no esté `CANCELED` antes del dispatch.

8. **El merge canónico `-X ours` puede colar contenido de `main` que `develop` corrigió DESPUÉS del
   último release (verificado 2026-08-06, release `fcee5ab9f7ce`).** `-X ours` solo decide los hunks
   en conflicto; los hunks de `main` que aplican limpio **entran** — y si `develop` había eliminado
   esa línea después del release anterior, el merge la resucita como regresión real. Caso real:
   `git merge origin/main -X ours` trajo a `develop` 1 línea de `src/lib/ai/dataforseo.ts`
   (`dataForSeoBreaker.recordFailure(family)` incondicional) que la auditoría de TASK-1300 había
   eliminado en `develop` después del release anterior — habría contado 4xx de caller y abierto el
   breaker.
   🔴 **Delta 2026-08-28 (release `c983be7f18e6`): esto dejó de ser un riesgo que se AUDITA y pasó a
   ser un riesgo que se EVITA.** El default canónico es `-s ours`, que toma el árbol de `develop`
   completo y por lo tanto **no puede** colar nada de `main`; `-X ours` quedó como excepción
   documentada. Y la auditoría de esa excepción es
   `git diff HEAD@{1} HEAD --name-status` **COMPLETO**: la verificación acotada a
   `src/ scripts/ services/ migrations/` es necesaria pero **NO suficiente** — salió vacía tanto el
   2026-08-23 (manual duplicado + 8 tasks resucitadas) como el 2026-08-28 (bloque duplicado en
   `.claude/rules/growth-seo.md` + TASK-1775/1776/1777 resucitadas en `in-progress/`).
   **Regla:** `-s ours` es legítimo cuando todo lo que `main` tiene de propio son squashes de
   release, o cuando su contenido propio ya fue reconciliado a `develop` por cherry-pick. Si `main`
   tiene contenido propio que `develop` NO tiene, no se elige otra estrategia: se reconcilia por el
   camino canónico y recién ahí se mergea. Si ya corriste `-X ours` y el `--name-status` muestra
   drift: `git reset --hard HEAD@{1}` y volver a mergear con `-s ours`, verificando que
   `git diff HEAD@{1} HEAD` salga **totalmente** vacío.

9. 🔴 **El marker `[release-coupled: …]` NO resuelve `requires_break_glass` — sólo `split_batch`
   (verificado leyendo el classifier, release `2c87d71e2eca` del 2026-08-09).** El paso B de la
   pre-empción y el gotcha #2 hablan del marker, y es fácil leerlos como "ante un batch policy rojo,
   marker". No es así, y confundirlos cuesta un run:

   | Decisión del classifier | Qué la dispara | Única salida |
   |---|---|---|
   | `split_batch` | `findUncoupledIndependentSensitiveDomains` — pares de dominios sensibles independientes mezclados | **marker** `[release-coupled: <razón>]` en el cuerpo del squash, **o** partir el batch |
   | `requires_break_glass` | `hasIrreversibleDomain(domains)` — **cualquier** dominio irreversible, con o sin mezcla | **`bypass_preflight_reason`** (≥20 chars) |

   El orden en `classifier.ts` es: primero `split_batch`, después `requires_break_glass`. O sea que si
   el preflight te dio `requires_break_glass`, el par de dominios **no** estaba en la lista de
   independientes y **ponerle un marker es cargo-cult**: no cambia la decisión. Consecuencia práctica:
   **todo release que toque `migrations/`, `src/lib/release/**` o `.github/workflows/` va a pedir
   bypass**, porque esos dominios son irreversibles por definición. `TASK-1681` ya evaluó relajar la
   severidad y lo descartó con datos (6 de 8 releases pidieron break-glass y sólo 1 era ruido).

   La razón del bypass se redacta con **hechos verificables**, no con adjetivos. Ejemplo real que pasó
   a la primera: *"db_migrations ya aplicadas en la unica instancia Cloud SQL (verificado en
   pgmigrations); auth_access es la causa raiz unica del release; rollback = revert del PR sin undo de
   schema"*.

10. **Hay UNA sola instancia Cloud SQL (`greenhouse-pg-dev`): producción, staging y local leen la misma
    base** (verificado con `gcloud sql instances list --project efeonce-group`, 2026-08-09). Eso cambia
    cómo se evalúa el riesgo de un release con migraciones: **una migración aplicada "en dev" YA está
    aplicada para producción.** Antes de redactar la razón del bypass, compruébalo:

    ```sql
    SELECT name, run_on FROM public.pgmigrations WHERE name LIKE '%<task-id>%';
    ```

    Si las migraciones del batch ya están en `pgmigrations`, el dominio `db_migrations` de ese release
    es **reconciliación de archivos con un estado ya realizado**, no un cambio de schema pendiente — y
    el rollback no necesita undo ni backfill. Es un hecho citable y auditable, no una opinión.

11. **`vercel redeploy` NO arregla un staging `Canceled` si el commit más nuevo es docs-only.** El
    gotcha #7 recomienda el redeploy, y eso sirve cuando la cancelación tuvo otra causa. Si la produjo
    el Ignored Build Step sobre un diff docs-only, el redeploy **reevalúa el mismo diff y cancela otra
    vez** (verificado 2026-08-09: `The deployment has been canceled.` en segundos).

    Salidas, en orden: **(1)** pre-emptar, secuenciando los pushes docs-only después del release;
    **(2)** tocar un doc del set `deployControlDocs` de `scripts/ci/vercel-ignore-build.mjs`
    —control plane spec, ledger de flags, playbook, runbooks de release/watchdog, manuales de
    orchestrator/preflight/watchdog—, que **no** cuenta como docs-only y fuerza el build: si de todos
    modos debes documentar algo del release, ese commit produce la evidencia como efecto;
    **(3)** un cambio de código real que ya estuviera pendiente. **NUNCA** inventar un cambio de
    código para forzar el build.

    Por qué el check se queja de algo que no está roto: `vercel_readiness` mira el deploy de staging
    **más reciente sin importar su estado**, así que un skip deliberado de nuestro propio ignore-build
    se lee igual que un build fallado — el staging anterior `Ready` puede tener todo el código del
    release y faltarle sólo docs. Es una tensión entre dos mecanismos propios; el check igual sale con
    exit 1, así que hay que producirle el deploy.

12. **Un warning de Sentry no identifica por sí solo el blocker del preflight.** Lee el JSON y el
    log del job: sólo un check con severidad `error` explica el exit no-cero; un warning de
    `sentry_critical_issues` requiere investigación y evidencia, pero no autoriza a ignorar una
    migración pendiente u otro error estricto. Si el cambio repara un grant de identidad, aplica la
    migración antes del re-dispatch y verifica tanto `public.pgmigrations` como la fila efectiva de
    `role_view_assignments`; que un fallback permita entrar no prueba que el acceso persistido quedó
    corregido.

    Para un smoke de identidad ejecutado por un worker compartido entre staging y producción, inspecciona
    la variable efectiva de la revisión activa y el endpoint real. Un portal staging protegido por SSO
    puede responder `302` aunque la aplicación esté sana; no lo clasifiques como fallo de autenticación
    sin confirmar el destino. La corrección durable vive en el `deploy.sh` del worker (source of truth)
    **y** requiere actualizar la revisión activa. Después, ejecuta el smoke programado y conserva al
    menos dos resultados consecutivos completos antes de cerrar la alerta.

13. **Un CI de `main` rojo con 0 tests fallidos es un unhandled rejection/flake, no una regresión
    (verificado 2026-08-12, release `950f5bdb4`).** Caso real: un timer del test de email-verify del
    renderer disparó **después del teardown** de su suite, en un entorno sin el global `CSS` — la
    suite completa reportó **10.582 passed / 0 failed** y aun así salió con **exit 1** (run
    `31636173517`). La lectura correcta está en el **resumen de vitest**: si dice `Errors: N` con
    `0 failed`, el error ocurrió **fuera** de los tests (post-teardown, unhandled rejection) y ningún
    test del release regresó. La salida: `gh run rerun <run_id> --failed` sobre el **mismo SHA** —
    produce la evidencia limpia sin quemar un run del orquestador ni tocar el commit; el fix de raíz
    (el timer/global faltante) va a `develop` para el siguiente release, no bloquea éste. **NUNCA
    re-dispatchar el orquestador contra un CI rojo sin diagnosticar primero**: si el summary muestra
    tests fallidos reales, es regresión y el batch no sale; el rerun sólo es legítimo cuando el
    conteo de fallos es cero y el error es identificable como ajeno a los tests.

14. **`vercel env add <FLAG> Production` falla con `api_error` — el entorno estándar va en MINÚSCULA
    (verificado 2026-08-18, release `fa54670470c1`).** El comando responde
    `"Please specify at least one Environment for your Environment Variable"` cuando se le pasa
    `Production` con mayúscula, que es exactamente como aparece el entorno en la salida de
    `vercel env ls`. El canónico es **`vercel env add <FLAG> production`** en minúscula; los entornos
    **custom** (p. ej. `staging`) sí respetan su nombre literal. Costó **4 intentos fallidos
    silenciosos**: el script de batch los reportaba como `✗ falló` sin propagar el mensaje de la API.
    **Regla: si un `env add` falla dentro de un batch, corre UNO solo mostrando stderr completo antes
    de diagnosticar nada más** — y verifica el resultado con `vercel env ls | grep <FLAG>` filtrando
    por environment (paso 10).

15. **El clasificador de permisos del agente bloquea `vercel env add` y `vercel redeploy` hasta que el
    operador autoriza EXPRESAMENTE en el chat (verificado 2026-08-18, release `fa54670470c1`).** No es
    credencial, no es scope, no es `.vercel/project.json`: **el comando ni siquiera se ejecuta**. Con la
    autorización explícita del operador pasa a la primera. **Si un agente reporta "no pude prender el
    flag", verificar primero si fue el clasificador de permisos antes de investigar Vercel** — perseguir
    token/scope/link ante un bloqueo de permisos es tiempo puro perdido.

16. **El clasificador de permisos también bloquea `git merge`, `git push`, `gh pr create/merge` y el
    `gh api ... -X POST` que aprueba los gates — no sólo los comandos `vercel` (verificado 2026-08-19,
    release `30301816955f`).** El gotcha #15 nombra únicamente `vercel env add`/`vercel redeploy`, y esa
    lista corta hace creer que git y `gh` pasan libres. No es así: en ese release el `git merge origin/main
    -X ours` del gotcha #1 quedó bloqueado por el clasificador, y también un loop `until` que combinaba la
    lectura de `pending_deployments` con el POST de aprobación del gate. Tres consecuencias operativas:
    - **Pide la autorización del operador ANTES de arrancar la secuencia, no comando por comando.** Cada
      bloqueo corta el flujo a mitad de release — merge canónico, push, PR, aprobación de los DOS gates
      del #6 —, justo donde el reloj del ledger de tiempos corre.
    - **Separa lectura de mutación.** Un loop que mezcla un `gh api` de lectura con el POST de aprobación
      se bloquea entero, mientras que las llamadas simples pasan. Para esperar el gate, haz el polling de
      lectura por un lado y dispara el POST de aprobación como llamada suelta.
    - **Si un agente reporta "no pude aprobar el gate", verifica primero el clasificador** antes de
      investigar permisos de GitHub, el environment `production` o los reviewers configurados — es el
      mismo diagnóstico erróneo que el #15 provoca con Vercel.

17. **Tres delta del release `e1718a359575` (2026-08-29, 4.º del día).** (a) "Confirmar `develop`
    verde" se verifica sobre el run del **HEAD actual Y los rojos/cancelados de la ráfaga**:
    `cancel-in-progress: true` en `ci.yml` deja commits **sin veredicto** (el culpable `146070ffc`
    fue cancelado; los rojos cayeron sobre `53e240d79` y `3e8149eaa`) y `paths-ignore` deja los
    docs-only sin run. (b) Un deploy de worker de ~45 s con step Deploy `skipped` **NO** es
    automáticamente el incidente del `64bdd105c`: mismo síntoma, causas opuestas — el discriminador
    es el **diff de árboles completo** entre el SHA servido y el target (runbook §4.1.1), nunca la
    duración del job. (c) Para un cambio de contrato de API, el canary por el lane ecosystem con el
    token de consumer del gateway vive en el runbook §4.3 — el assert debe ser algo que sólo el
    contrato nuevo puede producir.

### Credencial de paquete privado vencida — el bloqueador que no está en el código

**Antes de diagnosticar un deploy de worker rojo, mirar el HISTORIAL del workflow, no el diff.**
`gh run list --workflow=<worker>-deploy.yml --limit 12` responde en un segundo. Si los commits
anteriores también fallan, la causa es de entorno o credencial y el diff en curso es inocente.

🔴 **Un `ERR_PNPM_FETCH_401` sobre `@efeoncepro/axis-*` es SIEMPRE la credencial, nunca el código.**
El secreto `axis-packages-read-token` guarda un `.npmrc` completo (no el token pelado) con un PAT de
`read:packages`. Un PAT clásico vence a los 30 días. Caso fuente 2026-08-29: creado el 07-29, venció
el 08-28, y se descubrió porque un agente estaba mirando un deploy — tres commits y ~14 h después de
empezar a fallar.

🔴 **Y la lección NO es «no había señal»: SÍ la había, y falló el ENRUTAMIENTO.** El detector
`axis-credential-expiry.yml` corrió el 2026-08-25 (run `32856176785`) y avisó con tres días de
anticipación —*«expira el 2026-08-28 — quedan 3 días. Rotar YA: al expirar, GitHub Actions sigue
verde y solo fallan los builds de worker»*—, prediciendo incluso el modo de falla exacto. Nadie lo
leyó porque su único canal de salida era el color de su corrida, y ese color **ya venía rojo**: las
dos ejecuciones previas (08-04, 08-11) fallaban por una causa ajena (`Unable to locate executable
file: pnpm`). Reglas: **un gate programado cuyo único canal de salida es el color de su propia
corrida es un REGISTRO, no una alerta**; y **un detector con rojo crónico por causa ajena deja de ser
un detector** — cuando el rojo es el color habitual, el rojo que importa es indistinguible del ruido.
Por eso, ante una medición que debe accionarse, ponla **donde alguien esté obligado a mirar** (un
check de preflight que detiene la promoción), no en un log que nadie abre.

**Radio: 3 de los 4 workers del control plane** (`ops-worker`, `commercial-cost-worker`, `ico-batch`;
`hubspot-greenhouse-integration` no lo usa) **y Vercel NO se ve afectado** — su build pasa verde, que
es justo lo que vuelve engañoso mirar sólo el color del PR.

- **NUNCA promover con un deploy de worker en rojo** esperando que el orquestador lo resuelva: los
  workers se despliegan por `workflow_call` dentro del run, así que el release cierra `degraded` con
  `worker_revision_drift`. Peor: si alguno queda *change-gated* y se salta, el código entra a `main`
  **sin** su worker desplegado — media promoción, sin error visible.
- 🔴 **La rotación es del OPERADOR, no del agente.** Crear un PAT y manipular su valor es una
  operación de credencial: el agente **no la ejecuta aunque se lo pidan**; enuncia la regla y la
  devuelve. Helper seguro: `scripts/secrets/rotate-axis-packages-token.sh` — lee por **stdin**
  (nunca argumento, archivo ni log), **valida el token contra la API de GitHub antes de escribir** y
  compone el `.npmrc` completo (uno malformado falla con el mismo 401 que el vencido, y cuesta otro
  build de ~4 min descubrirlo).
- ⚠️ **NUNCA sustituir la credencial acotada por una de scope amplio para desbloquear** (p. ej. el
  token de la sesión `gh`). «Funciona» y deja en infraestructura productiva una credencial que puede
  mucho más que `read:packages`: cambia un incidente de 30 minutos por una exposición permanente.
- **Arreglo durable** (cierra la clase, no el caso): que la App de GitHub acuñe tokens de instalación
  de 1 h bajo demanda en vez de un PAT estático. Hoy no puede — `greenhouse-release-watchdog`
  (`app_id=3665723`) tiene `actions:read`/`deployments:read`/`metadata:read`, **sin `packages`**.
  Mínimo intermedio, y con el orden corregido tras el hallazgo del enrutamiento: **primero el check
  de preflight** que detenga la promoción (pone la medición donde alguien está obligado a mirar),
  después la anotación de expiración en el secreto.

### El audit de flags tenía un punto ciego que anulaba su propio gate

**Verificado 2026-08-29 prendiendo `GROWTH_SEO_WORK_QUEUE_ENABLED`.** `scripts/ci/feature-flags-audit.mjs`
sólo detectaba `process.env.FLAG` en **notación de punto**, y **91 callsites de este repo leen por
indirección** (`env[FLAG_CONST]` con `const FLAG_CONST = 'FLAG'` es el patrón de todo
`src/lib/growth/seo/flags.ts`). Esos flags nunca entraban a `codeFlags`, con dos consecuencias:

- se reportaban como «env var muerta en Vercel» teniendo lector real — **39 de 43 eran falsos positivos**;
- 🔴 **escapaban enteros del gate ISSUE-150**, que hace `exit 1` SIEMPRE cuando un flag está prendido
  en Production sin su código en `main`. El gate existía y el mecanismo lo hacía cumplir; una clase
  entera de flags pasaba por al lado **sin que nada fallara**.

Arreglado anclando en el **literal** y no en la forma de acceso (un flag leído por indirección tiene
que nombrarse como string en alguna parte, o no habría cómo indexar `process.env`). Destapó 3 flags
que llevaban tiempo sin registrar. **NUNCA angostar ese escaneo a una sola forma de acceso:**
sobre-incluir cuesta registrar un flag de más; sub-incluir cuesta un flag fail-closed vivo sobre
código que producción no tiene.

**Corolario de orden, aprovechable en todo release:** prender un flag en el **SoT** del worker
(`services/<w>/deploy.sh`) en vez de con `--update-env-vars` no sólo evita que el próximo deploy lo
borre en silencio — **también ordena el flip por construcción**: el flag se activa exactamente cuando
su código se despliega, nunca antes. Eso resolvió una precondición real ese día (`TASK-1792` no estaba
en `main`; viajaba en la misma promoción).

## What The Orchestrator Owns

`production-release.yml` owns the production release lifecycle:

- `pnpm release:preflight`
- `pnpm release:orchestrator-record-started`
- GitHub Environment `production` approval gate
- worker deploys through `workflow_call`
- Azure health/diff-gated deploy workflows
- Vercel readiness wait for `target_sha`
- post-release `/api/auth/health`
- `pnpm release:orchestrator-transition-state`
- `greenhouse_sync.release_manifests` final state

The source of truth is Postgres:

- `greenhouse_sync.release_manifests`
- `greenhouse_sync.release_state_transitions`

GitHub, Vercel, Cloud Run, Azure, and Teams are evidence and effectors; they do
not replace the manifest store.

## Drift Recovery

If watchdog reports `platform.release.worker_revision_drift`, do not guess.

First distinguish drift from missing evidence. The local reader converts an absent/expired `gcloud`
session or a failed Cloud Run query into `data_missing` (`warning`, `drift_count=0`); that does not
prove revision drift and never authorizes a redeploy. Refresh authentication or use the orchestrator
job logs/another authenticated read to establish `Ready=True` and `GIT_SHA`. Only a comparable SHA
mismatch is confirmed drift.

1. Read the latest manifest:

```sql
SELECT release_id, target_sha, target_branch, state, started_at, completed_at
FROM greenhouse_sync.release_manifests
WHERE target_branch = 'main'
ORDER BY started_at DESC
LIMIT 5;
```

2. Compare Cloud Run `GIT_SHA` for every mapped service.
3. Identify whether drift is:
   - incomplete orchestrator run
   - direct worker deploy
   - push-triggered partial deploy
   - workflow no-op/skip that left Cloud Run on an older `GIT_SHA`
   - stale manifest
   - Cloud Run deployment failure
4. Prefer a fresh orchestrator attempt for the verified target SHA. If a
   worker workflow skipped due to perceived runtime equivalence but watchdog
   still reports drift, treat it as incomplete closure, not success. Use a
   single worker workflow dispatch only as break-glass when the orchestrator is
   blocked and the user approves the external mutation.
   - For `hubspot-greenhouse-integration`, use:

```bash
gh workflow run hubspot-greenhouse-integration-deploy.yml \
  --ref main \
  -f environment=production \
  -f expected_sha=<release target_sha> \
  -f skip_tests=false
```

     Then verify `/health`, `/contract`, and `pnpm release:watchdog --json`
     reports `drift_count=0`. Do not edit `greenhouse_sync.release_manifests`
     by SQL to fix drift.
5. Re-run watchdog.
6. Document the incident in `Handoff.md`, including whether the suspected skip
   was expected (`no_infra_diff`) or real drift (`worker_revision_drift`).

If `transition-released` is queued/stale after workers, Vercel READY, health and
smoke are verified green, never patch the DB. Wait for the runner or, with
explicit approval, use `pnpm release:orchestrator-transition-state` with the
release ID and a forensic reason. This preserves the state machine, audit row
and outbox.

## Break-Glass

Break-glass means a production incident is active and normal orchestration is
blocked. It must include:

- explicit user approval
- reason in plain language
- target SHA
- affected service(s)
- rollback or forward-fix plan
- verification plan
- `Handoff.md` note

Even in break-glass, reuse existing workflows and CLIs before direct cloud
commands.

## Skill Maintenance Contract

Agents must update this skill whenever the critical release flow changes.

Critical flow changes include:

- changing `.github/workflows/production-release.yml` jobs, inputs, gates, or state transitions
- changing worker `workflow_call` contract, `EXPECTED_SHA`, or `GIT_SHA` verification
- adding/removing any production deploy workflow or Cloud Run service mapping
- changing release state machine, manifest schema, or rollback behavior
- changing Vercel production mapping, domain, or readiness check
- changing watchdog semantics, thresholds, auth, or mapped services
- changing Azure production gating or WIF subjects

When a critical flow change happens, update all applicable sources in the same
change set:

- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/runbooks/production-release.md`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`
- `docs/documentation/plataforma/release-orchestrator.md`
- `src/lib/release/workflow-allowlist.ts`
- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

If the change is only a local wording fix, update the skill only when agent
behavior would otherwise become wrong.

## Reporting

When reporting production-release work, include:

- target SHA
- branch and remote state
- whether orchestrator was run
- workflow run id(s)
- release_id and final manifest state
- Vercel production deployment URL and domain
- Cloud Run service SHAs for mapped services
- watchdog result
- what was not validated
- any docs or skill updates made
