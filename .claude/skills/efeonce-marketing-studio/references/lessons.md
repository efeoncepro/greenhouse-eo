# Efeonce Marketing Studio — lessons (append; newest first; each with date, symptom, cause, rule)

- **2026-10-04 · Retirada de TASK-1899.** El operador considera prematuro añadir esta fricción durante la construcción. Se retiró la implementación local y su condición de requisito para desarrollar Studio. No reactivar sus gates por referencias históricas; conservar los controles existentes. La decisión posterior TASK-2003 ya prevé T1 delegado en paralelo, pendiente de implementación/rollout/canary; el T2/proposalDigest retirado no se revive.


- **2026-09-25 · One Postgres query per thumbnail exhausted the role.** Symptom: grids of 20+ pieces showed broken
  images; `too many connections for role` on `marketing_studio_app` (limit 20); reproduced 18 of 40 concurrent
  requests = 500. Cause: `/renditions/{id}` authorized each image against the DB. Fix (`c949d3f`): readers return
  HMAC-signed `/api/v1/media/{token}` links (secret `STUDIO_MEDIA_URL_SECRET`, different per environment, expiry
  rounded to the week so browser cache keeps working) served from the bucket without touching the DB; `MediaImage`
  retries once then shows «Vista previa no disponible». Verified 108/108 concurrent OK. Rule: authorization happens
  once in the reader; media transport never opens a DB connection. If the secret is missing in an environment the
  links silently fall back to the DB path — check the secret first.
- **2026-09-25 · Preview cropped pieces.** A fixed `max-height: 320` cut vertical formats. Rule: preview by format —
  9:16 as a story, 1:1/4:5/16:9 in a feed card with the real ratio.
- **2026-09-25 · Agents asked for the 1600 px preview by default.** Rule (`d3ab68e`): `studio.asset.preview` defaults
  to `thumb` (640 px); `preview` only for fine detail. Image payload caps at 2 MB in the gateway.
- **2026-09-25 · Vercel blocks deploys whose author is not in the team** (`COMMIT_AUTHOR_REQUIRED`, state
  `BLOCKED`). `jreye@MacBook-Air.local` and `jreyes@efeoncepro.com` failed. Rule: `git config user.email jreyes@efeonce.cl`
  in the Studio repo before committing.
- **2026-09-25 · `axis-packages-read-token` is a full `.npmrc`, not a token.** Copying it whole into `NODE_AUTH_TOKEN`
  gives pnpm `ERR_INVALID_CHAR`. Rule: only the `_authToken` value of `npm.pkg.github.com` goes to Vercel; locally use
  `NODE_AUTH_TOKEN="$(gh auth token)"`.
- **2026-09-25 · `vercel api` env POST takes one object per request** (`--input`); an array fails. `vercel env add NAME
  preview ""` targets all preview branches. A deployment built before the var existed does not see it: redeploy.
- **2026-09-25 · DATE columns shifted a day.** pg parsed `date` (oid 1082) into a JS `Date` at local midnight. Rule:
  parser `1082` → string (`connection.ts`); format date-only values in UTC; times with `hourCycle: 'h23'`.
- **2026-09-25 · Shared constants imported from a `'use client'` module arrive as a client reference in a Server
  Component.** Rule: put shared constants in a neutral module (the theme cookie lives in `components/theme.ts`).
- **2026-09-25 · Cloud SQL users via `gcloud sql users create` join `cloudsqlsuperuser`** and could read Greenhouse.
  Rule: create Studio roles by SQL under `SET ROLE cloudsqlsuperuser`. IAM DB auth is unavailable (flag absent on the
  shared instance; enabling it modifies Greenhouse's production instance) ⇒ passwords in Secret Manager.
- **2026-09-25 · Studio roles can open `CONNECT` to `greenhouse_app` through PUBLIC.** Verified 0 readable tables and
  no reachable `SECURITY DEFINER`, but it is residual risk. Rule: tracked as TASK-1897 (Greenhouse change); never
  "fix" it from the Studio side.
- **2026-09-25 · Expired ADC ⇒ `database: unreachable` locally.** Rule: from greenhouse-eo run
  `pnpm gcloud:auth:playwright -- --force`; `.env.local` uses the proxy on port 15433 (not Greenhouse's).
- **2026-09-25 · The gateway version gate measures the surface with every provider maximal.** A new provider must be
  declared in `src/surface.ts` and in the policy coverage test, or its tools stay out of the versioned surface. A
  description change alters the surface digest (it changes agents' tool choice): bump the version.
- **2026-09-25 · Two Zods in the tree.** `@vercel/oidc` → `@vercel/cli-config` pinned zod 4.1.11 exact. Rule: single
  version via `overrides: { zod: 'catalog:' }`; `dependency-catalog-gate` fails on duplicates unless listed in
  `ALLOWED_DUPLICATES` with reason (only `google-auth-library` 10 inside `google-gax`).
- **2026-09-25 · TypeScript 6+ ships no global types.** Rule: `tsconfig.base.json` `types: ["node"]` + `@types/node`
  per package. Next 16.3.6 uses TS 7 natively in the build type check (a deliberate type error fails the build).
- **2026-09-25 · `next dev` rewrites files.** It generates `apps/web/AGENTS.md`/`CLAUDE.md` (committed) and rewrites
  `next-env.d.ts` — never commit the dev variant.
- **2026-09-25 · The certificate did not issue on its own after DNS (~7 min).** Rule:
  `vercel certs issue studio.efeonce.org --scope efeonce-7670142f`. The `studio` CNAME does not affect Outlook
  (MX, autodiscover, SPF live at the root and `autodiscover`).
- **2026-09-25 · Greenhouse cannot validate Studio tool names** (the manifest lives in another repo). Rule: Greenhouse
  validates only the `studio.` prefix of the manual's `appliesTo`; the gateway (which has both artifacts) checks
  existence (`skill_governs_unknown_tool`).
- **2026-09-25 · Pushing Greenhouse `develop` was blocked by foreign WIP.** A remote commit collides with another
  session's work in `scripts/foto`. Rule: in the shared checkout, never sweep foreign WIP into a Studio commit; stage
  and commit in one call with explicit paths.

## 2026-09-26 — Rolling out TASK-1893 and TASK-1896 to production

- **Sentry project creation is disabled for members via API** («Your organization has disabled this feature for
  members»). Rule: create the project in the UI, then run `sentry.sh` for scrubbing and keys.
- **Sentry issue-alert rules moved to Workflows.** `/projects/{org}/{project}/rules/` now returns 404, so the scripted
  rules (new issue in `production`, > 10 events in 5 min, regression) were not created. The default «Send a
  notification for high priority issues» workflow notifies the operator. Rule: port `sentry.sh` step 4 to the
  Workflows API before relying on custom rules; never assume a green dry-run of that step means the rules exist.
- **`GRANT CONNECT` on a Studio DB must come from its owner, `marketing_studio_migrator`.** The rollout of the new
  roles (`marketing_studio_restore`, `marketing_studio_worker`) needed it; the Studio scripts now run those grants as
  the owner (`f9e6cbb`, `82aeab6`).
- **`media_object_pending` retries are expected on the first ingest.** The bucket notification can reach the worker
  before the ingest transaction commits the `media_object` row; Pub/Sub retries (25 in staging, 27 in prod for 30
  objects) and every event ended `succeeded` with the DLQ at 0. Do not read those retries as failures.
- **A new AXIS package needs GitHub Packages access for each consumer before adoption.** `@efeoncepro/axis-brand-assets`
  only granted its source repo and broke Greenhouse CI with `ERR_PNPM_FETCH_403`. Rule and verification:
  `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`.

## 2026-09-26 — Turning on the provider in production

- **A sister-platform OAuth client policy is validated by `sisterPlatformOAuthPolicyV1Schema`, not by the migration's DO
  guard.** `revocation.requireOnPrivilegedAction` must be literally `true`. With `false`, the exchange answers 503
  ("OAuth client policy is unavailable"), and the gateway surfaces it as `upstream_unavailable`, which looks like Studio
  is down. Fixed forward by `20260926071321910`. When seeding a client, copy a working one (client-services) and parse
  the policy with the real schema.
- **A conditional secret belongs in the step that runs `gcloud run deploy`.** Revision `00058-9jq` started without
  `MARKETING_STUDIO_API_TOKEN`; the verified promotion kept `00057` serving.
- **After a failed promotion, check `spec.traffic`.** It stayed pinned to the broken revision and every later deploy
  failed. Fix: `update-traffic` to the serving revision, then re-dispatch.
- **Diagnose by hop.** Studio with the service bearer (curl) → Greenhouse exchange (Vercel runtime logs of
  `/api/integrations/v1/sister-platforms/oauth/token`) → gateway (sanitized logs).

## 2026-09-26 — TASK-1896 (observability and restore)

- **Sentry 11 moved `withSentryConfig` to `@sentry/nextjs/config`.** Importing it from `@sentry/nextjs` typechecks in
  `src` but `next build` fails loading `next.config.ts` (`withSentryConfig is not a function`). Rule: import from
  `@sentry/nextjs/config`; the build (not the typecheck) is the proof.
- **`marketing_studio_migrator` has no `CREATEDB`.** The restore rehearsal needs to create a temp DB; never grant it to
  the migrator. Rule: dedicated role `marketing_studio_restore` created by SQL under `SET ROLE cloudsqlsuperuser`
  (the creator keeps ADMIN on it, so the script is re-runnable).
- **`pg_dump` as a runtime-member role fails on `public.studio_pgmigrations_id_seq`.** The migrations table and its
  sequence belong to the migrator and are outside `studio`. Rule: grant SELECT on both to the restore role
  (`restore-role-grants.sql`), per database.
- **The first `SELECT 1` includes opening the connection** (770 ms against staging via proxy, at the edge of the 800 ms
  "slow" threshold). Rule: the deep health measures latency on the second query.
- **Local throwaway Postgres in the scratchpad fails with "Unix-domain socket path is too long (max 103 bytes)".** Rule:
  start it with `-c unix_socket_directories='' -c listen_addresses=127.0.0.1` and `LC_ALL=C`.
- **Shared-checkout commits:** other agents stage files in the same index. Rule: `git commit -m … -- <paths>` (only
  those paths) and, for a shared file with foreign hunks, build a blob of HEAD + your hunks and `git update-index
  --cacheinfo` it; never `git add -A`. Wait if the other session has the same file staged.
- **Two agents, one migration order.** node-pg-migrate runs with `--check-order`: applying a later-timestamped migration
  before an earlier pending one blocks the other agent. Rule: check `public.studio_pgmigrations` first; apply only when
  every earlier file is already applied.

## 2026-09-26 — TASK-1893 (originals and media worker)

- **A raw `pg.Pool` returns DATE as a JS `Date`.** Rights compared `today > usageEndsOn` against a Date and silently
  returned `active` for an expired window (caught by the integration test). The canonical connection sets
  `pg.types.setTypeParser(1082, v => v)`; any ad-hoc pool (tests, scripts) must set it too.
- **Kysely has no nested `transaction()`.** To test commands inside a rolled-back outer transaction, domain commands use
  `inTransaction(db, …)` (`db.isTransaction` ⇒ reuse). `applyImportPlan` refuses dry-run inside a foreign transaction
  (its dry-run rolls back its own).
- **24 of 54 catalog versions have no sha256** (CMP-002 images). The ingest cannot verify them (`unverifiable`); the
  old importer would have inserted a NEW version when the catalog later brought the hash (lookup by sha first). Rule:
  the import adopts the hash into the same null-sha version with the same path.
- **V4 signing by hand is verifiable offline.** Sign with a local RSA key and compare with `@google-cloud/storage`
  (`getSignedUrl`, same timestamp): identical signature. The unit test pins the string-to-sign.
- **`gcloud run deploy --set-env-vars` splits on commas**: a value like `3961547,5105024` needs the `^;^` delimiter.
- **GCS `customTime` only moves forward** (cannot be cleared or set earlier): tiering sits behind its own flag and a
  reopened campaign is reported (`tiering_reopened`) for a manual class rewrite.

## 2026-10-02 — TASK-1894 Entregable A (ingest door)

- **A freshly created custom IAM role takes ~1 min to propagate.** The bucket binding of
  `marketingStudioOriginalsDeleter` failed with «does not exist in the resource's hierarchy». Rule: wait and re-run
  `media-originals.sh --upload-door --apply` (idempotent); do not rename or recreate the role.
- **`vercel env add NAME preview` in non-interactive mode demands an existing branch.** It would not create the var
  for all preview branches, so `STUDIO_UPLOADS_ENABLED` lives only on branch `task-1894-upload-door`. Rule: for all
  preview branches use the interactive CLI or the dashboard; verify with `vercel env ls` which branch it landed on.
- **Studio previews have no bypass secret.** Rule: canary staging through `vercel curl … --deployment <preview>
  --scope efeonce-7670142f`; the upload CLI with `--base-url <preview>` cannot get through the protection.
- **GCS CORS does not support partial wildcards** (`https://*.vercel.app`). The CLI does not need CORS, but browser
  uploads from previews are unproven. Rule: validate in TASK-1895 before relying on preview browser uploads.
- **The anonymous actor must be refused before the body is validated.** `aa91ce3` moved the authority check ahead of
  body validation, so an open-mode anonymous caller always gets 403 `write_not_allowed`, whatever it sends. Rule: in a
  write route, authority first, then validation.
- **Flag order is worker first, then web.** With the web signing uploads and the worker not verifying (flag off = no
  verification and no sweep), confirmations would stay at 202 (inferred from the code, not observed). Rule: `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED` before
  `STUDIO_UPLOADS_ENABLED`; roll back in reverse.
- **An uploaded version is not the current one.** New versions are `pending_review`; the current version is the highest
  `version_no` with `review_state` ∈ {imported, approved}. Approving a piece is not media authorization. Rule: never
  report an uploaded final as "in use" or "approved" until `studio:review approve` ran.
- **Spec deviation recorded, not hidden.** The spec had the CLI as `operator_cli` impersonating the ingest SA; it was
  built as an HTTP `api_client` (`studio:assets:write`) so CLI, UI and agents share one door. Rule: when the build
  departs from the spec, write it in the ledger and the architecture, not only in the commit.

## 2026-10-02 — CMP-004 horizontals 1,91:1 in Studio

- **Loaded and approved ≠ visible: the grid had fixed columns.** `PiecesWorkspace.tsx` drew only 16:9, 1:1, 4:5 and
  9:16, so the 11 horizontals 1,91:1 were in the database, approved, and absent from the screen. `23e5787` makes the
  grid add the ratios present in the campaign (widest to tallest). Rule: rows existing is not the surface showing them;
  after an upload verify the real UI, not only the reader.
- **Ratios with decimals are stored as integers.** The API demands `aspectRatio` `^\d+x\d+$`, so 1,91:1 is uploaded as
  `--ratio 191x100`; `ratioLabel('191x100')` labels it «1,91:1» (`apps/web/src/copy.ts`). The worker's ratio check
  accepts the real file (2048/1072 = 1,9104) within 1 %. Rule: never send `1.91x1`; scale to integers.

## 2026-10-02 — TASK-1894 Entregable B (catalog commands)

- **The gateway federated every manifest tool and called them all with GET.** The assumed safety net
  (`write_tool_without_scope_class` dropping writes until TASK-1899) did not hold: syncing the API 1.4.0 manifest would
  have federated the write tools broken. Rule: before any `studio:manifest:sync` of a manifest with write tools, the
  gateway must filter to reads (`MARKETING_STUDIO_FEDERATED_TOOLS`) and `call()` must reject writes and non-GET. Read
  the provider's call path; do not trust a guard's name.
- **A write on a OneDrive-governed campaign would be overwritten by the next import.** Hence every catalog write on a
  `source_of_truth = 'onedrive'` campaign answers 409 `campaign_not_studio_owned` (except `createCampaign`, the ingest
  door and version review), and the importer skips whole `studio` campaigns. Rule: never "fix" data of an `onedrive`
  campaign in Studio; edit it in OneDrive until its dated cutover (Entregable C).
- **Commands by slice in separate registry files let parallel work avoid conflicts.** The registry was split into
  `operations-review.ts`, `operations-catalog.ts`, `operations-plan.ts` (+ helper `operations-write.ts`) so slices
  could be built without colliding in one `operations.ts`. Rule: add new write operations in the slice file that owns
  them.
- **Session permission classifier blocks production-shaped actions.** Pushing Studio `main` («Production Deploy») and
  running the gateway sync («Merge Without Review») were blocked by the classifier (the gateway one even though the
  operator had authorized PR and merge); the work was left on a pushed branch + preview and a prepared isolated change. Rule: ask for the external-mutation authorization at the
  start, or plan the hand-off to the operator from the beginning.

## 2026-10-03 — A video into an OneDrive-governed campaign (CMP-001 «Los Sparks»)

- **The importer takes the concept title from the concept's first asset.** Rule: name the first asset of a new concept
  correctly in `CATALOGO-DATOS.json` (CMP001-08 «Los Sparks» came out right because its first asset did).
- **The catalog is JSON with 2-space indentation.** A script rewrite with indentation 1 produced a giant diff and had to
  be redone. Rule: back up the file first; rewrite with `indent=2` and `ensure_ascii=False`.
- **An import can revert live campaign states.** Rule: before `import:catalog --apply`, compare the live campaign states
  in the DB with `scripts/seeds/campaign-registry.json`; apply only when they match (verified for CMP-001 on 2026-10-03).
- **A stale Cloud SQL proxy answers `ECONNRESET`.** Rule: start a fresh `cloud-sql-proxy` on another port and point
  `STUDIO_PG_PORT` to it; do not debug credentials first.
- **`media:ingest` needs ADC impersonating `marketing-studio-ingest@efeonce-group.iam.gserviceaccount.com`.** Rule: a
  temporary impersonated ADC file in the scratchpad (mode 0600), `GOOGLE_APPLICATION_CREDENTIALS` set only for that
  command, file deleted afterwards. Never modify the default ADC or IAM.
- **A transient `media_object_pending` on one object resolved itself** (same race as the 2026-09-26 first ingest). Rule:
  check renditions in the DB/API before retrying anything.
- **Re-importing corrects copy text without duplicates** (copies upsert by `copy_id`; verified 2026-10-03 fixing the
  service name in two copies). The import report prints `updated: N` for every row it touches, changed or not. Rule:
  never read `updated: N` as "everything changed"; verify the specific field with a read.

## 2026-10-04 — Video playback (TASK-1998/1999)

- **The board hid real pieces.** `PiecesWorkspace` picked `assets.find(...)` per concept × kind × ratio, so the second
  16:9 video of CMP001-08 («con intro para Instagram») had no cell; «Videos 5» showed 4. Rule: a grid keyed by
  attributes must render every match (or say how many it hides); compare the tab counter with what is drawn.
- **A function cannot be a video transport.** The media route buffered whole objects (no Range) and Vercel caps a
  response at 4.5 MB. Rule: big media = 302 to a short V4 URL; authorization stays in the reader's HMAC link.
- **The operator's ADC cannot sign as the runtime SA** (`signBlob` 403), and the SA that can be impersonated
  (`ingest-stg`) cannot read the media bucket (`AccessDenied`, signature valid). Rule: do not touch IAM to test
  locally; dev-only Range proxy + a positive V4 check on an object the signer can read.
- **Interrupted session = dead proxies and a hung dev server.** The session cut sent SIGTERM to every
  `cloud-sql-proxy` started from it, and an old `next dev` (2 days) sat at 98 % CPU answering nothing; an uncapped
  `curl` hung the turn. Rule: run the proxy as a background task, cap every local `curl` with `-m`, check
  `/api/v1/health` first.
- **The browser pane screenshot shows a playing video as black.** A canvas read proved real frames (max luma 255).
  Rule: visual evidence of video with Playwright + Chrome (`channel: 'chrome'`; bundled Chromium has no H.264).
- **Staging is not production's data.** «Los Sparks» (CMP001-08) was loaded only in production on 2026-10-03; staging
  has 4 videos. Rule: when a recipe says «staging first», do it, or record that staging was skipped.
- **Production deploys and merges need the operator's authorization stated in chat, not inferred.** The permission
  classifier blocked `deploy.sh --env production --apply` after a generic «Autorizado» and only let it run after «te
  autorizo a correrlo tu todo»; `gh pr merge` stayed blocked («Merge Without Review»). Rule: ask for the explicit
  production authorization up front, and plan the PR merge as an operator step.
- **Never write a file with `open(dst, 'w')` in the same expression that reads it.** A script truncated `Handoff.md`
  (and another session's uncommitted line) before reading it. Rule: read into a variable first, or write to a scratch
  file; for shared files with foreign hunks commit through a temporary index (`GIT_INDEX_FILE`) built from HEAD + your
  block, then `git reset -- <paths>` on the real index.
- **Show durations the way the native player does.** The board said «0:50» and Chrome's controls «0:49» for 49.6 s.
  Rule: truncate seconds (`Math.floor`), like the browser.


## 2026-10-04 — TASK-1905 local implementation

- PostgreSQL integration tests which always roll back can hide deferred FK violations. Seed the referenced catalog
  version/channel in the fixture and force `SET CONSTRAINTS ALL IMMEDIATE` before rollback. The first real catalog test
  exposed a hardcoded validator version without its referenced row; fixing the fixture proved persistence honestly.
- Warn mode must preserve a resolved null for unknown channels. Null-coalescing back to the input literal would invent
  a canonical key. Preserve original text and store the resolution/version separately.
- Kernel command coverage is insufficient when legacy rights or upload finalization call a lower primitive. Validate
  within the same transaction at those entry points too; a prepared upload ticket does not freeze catalog authority.
- A provisioned consumer and deployed flags are runtime facts. An injectable adapter and a flag set true do not make
  ICP available; keep the default reader disabled/unavailable until the authorized dependency exists.
- Check all shared-repo branches before syncing a generated manifest. The gateway was on another task's branch and
  was deliberately left untouched; never edit generated inventory manually to appear federated.

- A count comparison cannot identify completeness of deduplicated channel arrays: two historical aliases may map to
  one canonical channel. Preserve any versioned nonempty binding; partial warn arrays use explicit revalidation, not
  backfill. Global maintenance must reject organization-scoped operators just as the global-catalog kernel does.

- TASK-1905 release: Cloud Run returned Google 404 for /healthz without reaching the container. Use /health
  (74073de) for the external worker probe; keep /healthz only for local compatibility. Official restriction:
  https://docs.cloud.google.com/run/docs/known-issues#reserved_url_paths. Probe the actual route after deploy.


## 2026-10-04 — catalog release and API operator client

- **Ready is not routable health.** Cloud Run returned 404 on `/healthz` before the container despite a Ready revision.
  Use `/health`; preserve `/healthz` only for local compatibility. Verify the routable path in staging, then promote
  the same image digest. Never widen IAM to repair a path intercepted upstream.
- **Pin validation mode in every writer runtime.** Upload finalization runs in the worker, so web-only `warn` or ICP
  flags can produce conflicting outcomes. Both deployments now explicitly use warn/ICP false.
- **Published catalog is not repaired history.** Seed readback of 52 channels did not map 134 legacy records across
  five ambiguous aliases. Preserve raw labels and existing versioned snapshots; operations owns explicit review.
- **Contract parity is not authority parity.** The 59 provider tools are callable through the dynamic API client only
  with the scope/actor accepted by Studio. Upload credentials do not carry general-write scope; catalog service
  writes still fail closed. Never substitute operator_cli/SQL after an HTTP403, or claim new MCP federation.
- **CLI output is not a transfer proof.** A live upload dryRun proved metadata validation only. Applied PUT/POST,
  confirmation polling, duplicates, downloads and hash failures were tested with controlled local HTTP/storage.
  Keep that evidence distinct from production writes. Resume confirms an existing upload; it does not resume bytes.
- **Idempotency survives uncertainty.** Emit the logical key before writing, retain it when a call times out, and
  reread on revision conflict. Neither a new key nor a refreshed If-Match is an automatic retry strategy.

## 2026-10-04 — activations rollout

- Legacy post UUIDs differ between staging and production; verify campaign/post key/provider identity and query target-local IDs. Reuse original command inputs and revision for replay, not the later campaign revision.
- Tracking allowlists must be configured before a preview canary; fail-closed validation correctly rejects an undeclared destination. Rebuild after Vercel config changes.
- Metricool PUBLISHED without an observed timestamp is not published evidence. Keep overdue and a reconciliation item, never copy the scheduled timestamp. Preserve a legacy record absent from discovery results.
- Verify scheduler identity separately from operator invocation. Three accounts read 62 records, repeat changes 0; scheduler run succeeded with its own OIDC.
- 2026-10-04 (TASK-2002): a published `@efeoncepro/axis-brand-assets` version can lag the AXIS repo — 0.4.18 lacked
  `assets/tools/` (HubSpot, Metricool, Notion) although they were committed. Check the installed package, not the repo,
  before importing an asset; publish a new version instead of copying files.
- 2026-10-04: running `pnpm install` while `next dev` is up can change Next's resolved path (peer reshuffle) and every
  route then fails with «module factory is not available»; media 500s look like broken thumbnails. Restart the dev server.
- 2026-10-04: in server components Turbopack may give a static SVG import as a string instead of `StaticImageData`;
  read `typeof src === 'string' ? src : src.src`.
- 2026-10-04: an AXIS release tag publishes every package version on `main` not yet in the registry, including other
  sessions' bumps. List HEAD versions vs registry before tagging; never move a pushed tag — release the next version.

## 2026-10-05 — TASK-2002 calendario v3 y diálogos de escritura

- **Clase global `.today` choca con el calendario.** La grilla de la página Hoy usa `.today` (`display:grid`, 2
  columnas) y deformaba cualquier `today` del calendario. Regla: usar `is-today`.
- **Un server component no puede pasar funciones a un client component** (`afterHref`). Regla: pasar una plantilla de
  URL con `__ID__` y resolverla en el cliente.
- **Un server component no puede llamar funciones de un módulo `'use client'`** (`stageMode`). Regla: helpers
  compartidos en un módulo sin directiva (`stage-model.ts`).
- **Hijos de un flex en columna con overflow se encogen a 0 de alto** (el escenario dentro de `.sheet-body`). Regla:
  `flex-shrink: 0`.
- **Lint `react-hooks/set-state-in-effect`.** No resetear estado síncrono en efectos; guardar el resultado con la clave
  de la entrada que lo produjo y derivarlo al renderizar.
- **Test de paridad UI↔API.** Todo `fetch` de mutación en archivos cliente lleva `method` literal y ruta template
  estática con parámetros de nombre exacto (`campaignId`, `activationId`, `recordId`); si no, `operations-parity.test.ts` falla.
- **El Write tool convirtió un escape de espacio duro en el carácter literal** → `no-irregular-whitespace`. Regla:
  escribir el escape, no el carácter.
- **En modo `open` el actor anónimo no escribe ni siquiera `dryRun`** (`handleWrite` rechaza antes de mirar el cuerpo).
  Para ver diálogos en local hace falta un actor con permiso: pedir autorización explícita al operador (el
  clasificador lo bloquea como debilitamiento de seguridad), no commitear y revertir.
- **La vista previa del plan necesita `STUDIO_TRACKING_DOMAINS`** (`{org:[dominios]}`) o devuelve 422
  `tracking_destination_invalid`.
- **La regla del validador no basta para filtrar cuentas del formulario.** Una cuenta de pauta (LinkedIn Ads, platform
  `linkedin`) aparecía en orgánico. Regla: filtrar además por la herramienta del canal (paid → `buyingPlatform`, resto →
  `readbackProvider` si no es `none`).
- **Reiniciar el servidor de desarrollo después de `pnpm install`** (factories de módulo rotas; reafirma la lección del 2026-10-04).
- **Import estático de SVG en Turbopack llega como string o `StaticImageData`.** Regla: leerlo con `srcOf`
  (reafirma la lección del 2026-10-04).
- **El generador del canvas (`gen.py`) es la fuente exacta de medidas** para revisar fidelidad contra la dirección v3.
