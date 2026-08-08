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
- Never rediscover common release conditions as if they were new incidents. Approvals, CI/smoke warnings on fresh squash commits, worker latency, Azure `no_infra_diff`, `ops-worker` change-gated no-op, and final transition runner queue are documented in the runbooks. If the user asks to measure timings, record phase durations while following the playbook.
- Never close a production release without updating `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md`. The primary KPI is **agent end-to-end elapsed**, not manifest/workflow elapsed. Start the timer at the first release-related action, including reading, reviewing and analyzing. Required fields: agent name, date, release ID, orchestrator run ID, target SHA, agent E2E elapsed, phase breakdown, workflow elapsed, manifest elapsed, runtime-green elapsed, main blocker and learning.
- **Never `git push` to `main` (including hotfixes, doc-only commits, or fixes "that don't affect workers") without immediately starting the bounded readiness watch and dispatching `production-release.yml` for `target_sha=<HEAD del push>` as soon as CI, CI Deep and Vercel production for that exact SHA are green.** Every commit on `main` MUST be tracked by a release manifest. The Vercel auto-deploy on `push:main` is NOT a release — only the manifest in `greenhouse_sync.release_manifests` reflects what production is supposed to be. Do not do unrelated work during this wait or leave the SHA untracked.
- **Never cherry-pick to `main` a commit that also exists on `develop`.** Creates duplicate SHAs for the same logical change (caso real 2026-05-14: `fa5258a5/4fe799cf` mismo diff distinto SHA), confuses audit trail, breaks the exact mirror between develop/main. Canonical hotfix path: branch from `main` → fix → PR → merge → orchestrator dispatch → cherry-pick back to develop (not the other direction).
- **Never assume "hotfix small, no orchestrator needed"** — the rule has zero exceptions outside break-glass. Even a typo fix to `main` requires orchestrator dispatch to keep manifest aligned. If the fix is too trivial for a release manifest, it's too trivial to push to `main` — merge to develop and wait for the next regular release.
- **SIEMPRE revisar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (§ Pendientes de acción) al planear Y al cerrar un paso a producción.** Una feature `code-complete` mergeada a `main` queda **invisible** en prod si su flag `*_ENABLED` (default OFF) no se prende explícitamente — a veces además requiere su migración aplicada a prod (vía este release) y/o redeploy del ops-worker. El deploy del código NO prende flags. Qué flags prender con este release se lee del ledger, no de la memoria; tras prenderlos, actualizar el snapshot del ledger. **NUNCA** declarar un release `released` dejando un flag que debía prenderse en este release sin prender (queda como `degraded` o pendiente documentado).

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

## Canonical Release Path

The normal release path is:

0. Start an agent E2E release timer and prepare the timing-ledger row. Reading, review, analysis and preparation count.
1. Confirm current branch, remotes, and dirty worktree.
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
7. Watch the orchestrator complete:
   - preflight
   - record-started
   - approval-gate
   - 4 Cloud Run workers via `workflow_call`
   - Azure gated jobs
   - Vercel production READY
   - `/api/auth/health`
   - manifest transition to `released` or `degraded`
8. Run or inspect watchdog after completion. The remote scheduled/manual workflow remains disabled;
   use the local reader with the authenticated GitHub token:

```bash
GITHUB_RELEASE_OBSERVER_TOKEN="$(gh auth token)" pnpm release:watchdog --json
```

9. Verify Cloud Run `GIT_SHA` for mapped services when needed:
   - `ops-worker` in `us-east4`
   - `commercial-cost-worker` in `us-east4`
   - `ico-batch-worker` in `us-east4`
   - `hubspot-greenhouse-integration` in `us-central1`
   For AXIS consumers, also verify the active revision/image digest and that the deployed artifact does
   not contain `.npmrc`, the package token, or an unscoped registry credential.
10. **Prender los flags pendientes de este release — en TODOS los runtimes, no sólo Vercel.** Revisar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` → `§ Pendientes de acción`. Por cada feature `code-complete` cuyo flip estaba gated a este release:
    - **Paso 0 obligatorio — mapear dónde se LEE el flag:** `grep -rn "<FLAG>" src/ services/ | grep -v __tests__`. Hay **5 runtimes con env vars independientes**: Vercel (app Next.js) + 4 Cloud Run (`ops-worker`, `commercial-cost-worker`, `ico-batch-worker`, `hubspot-greenhouse-integration`). Prenderlo en uno **NO** lo prende en los otros. **Heurística:** si gatea algo **async** (email, projection reactiva, consumer del outbox, cron de Cloud Scheduler, materializer) vive en el **`ops-worker`, NO en Vercel** — prenderlo en Vercel no hace nada; si gatea una ruta/superficie visible vive en Vercel; puede vivir en **ambos**.
    - **Aplicar en cada runtime del mapeo:** Vercel → `vercel env add <FLAG> Production` + **redeploy obligatorio** (Vercel **congela las env vars al crear el build**: un flag agregado después del build productivo del release no existe para el runtime hasta que hay un deployment nuevo — caso 2026-08-06, `GROWTH_SEO_ENABLED` requirió `dpl_GyGkdEQQTk65qkCs1S3TEH6Jquy9`). Si el flag se puede prender **antes** del merge del PR, el build del release lo hornea y el redeploy no existe. Cloud Run → **los DOS pasos**: (a) declarar el flag en `services/<worker>/deploy.sh` (SoT; esos scripts usan `--set-env-vars` **destructivo**, que borra cualquier var agregada out-of-band) y (b) `gcloud run services update <svc> --region <us-east4|us-central1> --project efeonce-group --update-env-vars <FLAG>=true` para efecto inmediato. Hacer sólo (b) = el flag desaparece en el próximo deploy del worker, en silencio.
    - **Verificar en el deploy/revisión ACTIVO** (`vercel env ls` · `gcloud run revisions describe <rev> --format="json(spec.containers[0].env)"`) **y ejercitar el flujo real** — que la var exista ≠ que el consumer funcione.
    - **Actualizar la fila del ledger declarando el/los runtime(s)** + fecha + revisión Cloud Run. Sin el runtime explícito, el próximo agente asume Vercel y se equivoca.

    El deploy del código no activa nada por sí solo. Si un flag requería su migración en prod, confirmar que entró por este release antes de prenderlo. **Apagar/rollback también es multi-runtime.** Caso fuente 2026-07-09: `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED` vive sólo en el `ops-worker`; el runbook sólo enseñaba `vercel env add` y prenderlo ahí habría dejado el email muerto con la success card prometiéndoselo al usuario.
11. **Registrar tiempos del release.** Actualizar `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` con agente, fecha, release ID, run ID, target SHA, agent E2E elapsed como KPI principal, desglose de fases, workflow elapsed, manifest elapsed, runtime-green elapsed, blocker principal y aprendizaje.

12. **Canary y rollback AXIS.** Mantener los canaries de navegador opt-in y deterministas: usar la
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
git merge origin/main -X ours --no-edit
#   -X ours NO resuelve modify/delete: esos se deciden a mano, develop manda.
#   git status --short | grep '^DU\|^UD'  →  git rm <ruta-que-main-resucita>
git log origin/main --not HEAD --oneline                        # debe salir vacío
git diff HEAD@{1} HEAD -- src/ scripts/ services/ migrations/   # debe salir vacío
git push origin develop     # → el PR queda MERGEABLE

# B — Gotcha #2: marker SOLO si el acoplamiento es real (ISSUE-114 resuelta 2026-08-08:
#     el classifier ya usa two-dot, así que los dominios que reporta son REALES).
#     Un solo dominio irreversible (p.ej. db_migrations con su consumer directo) NO es
#     un acoplamiento que declarar. Si no lo nombras en una frase, parte el batch.
gh pr merge <pr> --squash --body "[release-coupled: <por qué conviven los dominios>]"

# C — Gotcha #3: producir el smoke sobre main en vez de bypassearlo (~3 min)
gh workflow run playwright.yml --ref main
```

Después: esperar `CI` + `CI Deep Verification` + Vercel `Ready` **para el SHA de
`main`** + el smoke recién disparado; piso duro de **8 min** desde el push antes
del dispatch (el 2026-08-06 fueron 24 min); y polear `pending_deployments` en
loop desde el arranque para los DOS gates `production` (gotcha #6).

La pre-empción incluye además verificar que el último deploy de **staging** no
esté `CANCELED` (gotcha #7) antes del dispatch — un push docs-only a `develop`
cancelado por el ignore-build quema el run del orquestador.

## Gotchas conocidos del release (verificados 2026-07-03 #139 y 2026-08-06 #177/#178; fix de raíz de #2 = ISSUE-114)

El flujo de **squash-merge** produce condiciones recurrentes que NO son fallas reales. No las persigas como bugs; aplica la mitigación:

1. **El PR `develop→main` conflicta ("merge commit cannot be cleanly created").** `main` (squashes de releases previos) no es ancestro de `develop` → conflictos (docs Handoff/changelog/README/registry y a veces código). **Resolución robusta:** en `develop`, `git merge origin/main -X ours --no-edit` (`develop` es autoritativo — contiene todo `main` por construcción: los squash de `main` son DE commits de `develop`). Verifica: `git log origin/main --not HEAD` vacío **y** `git diff HEAD@{1} HEAD -- src/ scripts/ services/ migrations/` sin cambios de código. Push `develop` → el PR queda MERGEABLE. Bonus: **avanza la merge-base** y reduce la divergencia del próximo release. **NUNCA** cherry-pick a `main` (duplica SHAs).
   **Resolución verificada 2026-08-06:** `-X ours` resuelve los conflictos de **contenido**, pero **no** los `modify/delete` — ésos quedan detenidos y se deciden a mano. Caso real: `TASK-1590` estaba **borrada** en `develop` (migró de `to-do/` a `in-progress/`) y **modificada** en `main`; se resolvió conservando el estado de `develop` (`git rm` de la copia en `to-do/`). Las dos verificaciones salieron vacías y el PR quedó MERGEABLE de entrada. La segunda verificación es la que prueba que el merge fue documental y que `-X ours` no se comió código de producción — no la omitas.

2. **~~Preflight `release_batch_policy` falso positivo.~~ RESUELTO 2026-08-08 (ISSUE-114).** El classifier usaba diff *three-dot* (`origin/main...target`, merge-base) y resucitaba archivos ya desplegados en un release previo como `cloud_release` irreversible, inflando el conteo. **Ya no:** `collectChangedFiles` usa **two-dot** y ambos consumidores del rango (archivos + commit bodies) lo resuelven por la función única `buildReleaseDiffRange`, con guardrail anti-regresión en `src/lib/release/preflight/checks/release-batch-policy.test.ts` (fija el rango en el argv de git). **Consecuencia dura: si hoy el classifier reporta un dominio irreversible, es REAL — NUNCA lo descartes como fantasma "conocido" ni le pongas un marker por costumbre.** Verifícalo igual con `git diff origin/main..target -- <archivo>`. Y ojo con lo que este gotcha nunca dijo: post-merge (target = HEAD de `main`) el rango queda **vacío**, así que el batch-policy del orquestador pasa SIEMPRE — **el gate sólo tiene dientes en la corrida local pre-merge**, que es justo donde el operador decide. Darle dientes post-merge exigiría comparar contra el `target_sha` del release anterior (`release_manifests`): decisión de diseño mayor, aún no tomada.

   **Resolución verificada 2026-08-06:** el preflight **local** dio `split_batch` por "payroll + auth_access mezclados" sobre **1051 archivos** inflados (los de código reales eran 221). La respuesta canónica **no fue** `bypass_preflight_reason`, sino el marker `[release-coupled: <razón>]` en el **cuerpo del commit de squash** — que es lo que lee el classifier del orquestador —, explicando que los dominios mezclados son acumulación de una semana de trabajo independiente y ya verde, no un acoplamiento de diseño. Con eso el preflight del orquestador pasó `ship` **sin bypass**. Si la razón honesta fuera "son cambios acoplados de verdad y no sé explicar el rollback en una frase", el batch hay que **partirlo**, no marcarlo.

3. **`playwright_smoke` (0 runs) + evidencia aún corriendo en el squash commit fresco de `main`.** El smoke corre en `develop` (ya verde); el commit de `main` no tiene su propio smoke. Antes del primer dispatch, esperar `CI`, `CI Deep Verification` y Vercel Production `READY` para el SHA exacto.
   **Resolución verificada 2026-08-06 — la alternativa HONESTA al bypass es producir el check:** `gh workflow run playwright.yml --ref main` sobre el SHA de `main` y esperar verde. Tardó **3m10s** (run `31057847351`). Ése es el costo total de no bypassear nada. Un `bypass_preflight_reason` forense (≥20 chars) queda reservado para cuando el smoke **falla por infraestructura** y el operador lo autoriza; nunca para ahorrarse 3 minutos, y nunca para cubrir checks pendientes o fallidos.

4. **ops-worker puede quedar con GIT_SHA rezagado tras el release — NO es drift si el diff runtime está vacío.** `ops-worker-deploy` es *change-gated*: si ningún worker-runtime-path cambió desde `EXPECTED_SHA`, salta el rebuild (`deploy_needed=false`) y el servicio conserva el SHA del último deploy que sí tocó código de worker (código idéntico al target, por diseño — ver el step de worker-drift del workflow). Si el watchdog final marca solo `ops-worker`, comparar Cloud Run `GIT_SHA` contra `target_sha` en rutas runtime; si `git diff --name-only <cloud_run_git_sha> <target_sha> -- package.json pnpm-lock.yaml tsconfig.json services/ops-worker scripts/ops-worker src/lib/ops src/lib/release` no devuelve archivos y Cloud Run está `Ready=True`, parar: documenta residual de label y **NO** fuerces redeploy para "alinear el label". Los otros 3 workers sí redeployan al target.
   **Delta 2026-08-06 — el watchdog YA clasifica bien este residual.** Hasta el release `503186d7147a` (2026-07-17) lo reportaba como `severity=error` por comparación mecánica de SHA, y cada agente tenía que refutarlo a mano. El fix vive en el commit `6f7e246ea` de `main`: en el release `70e912056273` el `ops-worker` quedó en `558558263e80` (un SHA de `develop` del mismo día), con diff de rutas runtime vacío y `Ready=True`, y el watchdog reportó **`drift_count=0`** explicándolo en su propio `detail` (`change-gated — rutas runtime sin cambios`). Consecuencia: si hoy ves `severity=error` por `ops-worker` con diff vacío, **no lo asumas benigno por costumbre** — verifica que estás corriendo el reader del `main` actual. El `git diff` de arriba sigue siendo la verificación que manda.

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
   breaker. La verificación 2 del gotcha #1 (`git diff HEAD@{1} HEAD -- src/ scripts/ services/
   migrations/` vacío) es exactamente la que lo detecta — por eso no se omite.
   **Resolución verificada 2026-08-06:** cuando la verificación 1 (`git log origin/main --not HEAD`)
   está vacía y la 2 muestra drift regresivo main→develop: `git reset --hard HEAD@{1}` y
   `git merge origin/main -s ours --no-edit` (estrategia `ours` COMPLETA: árbol de `develop` EXACTO,
   ancestría avanzada, PR MERGEABLE). Verificar que `git diff HEAD@{1} HEAD` salga **totalmente**
   vacío. Regla: `-s ours` solo es legítimo cuando la verificación 1 está vacía (`main` no tiene
   commits únicos); si no lo está, esos commits se perderían — ahí el merge se resuelve a mano.

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
