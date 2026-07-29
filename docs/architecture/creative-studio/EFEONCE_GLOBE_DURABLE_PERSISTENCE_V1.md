# Efeonce Globe — Durable Persistence V1

- Decision: SPEC-007
- Status: Accepted and implemented — deployed + live-verified (TASK-1465)
- Validated: 2026-07-21 (live against Cloud SQL Postgres 16.14; an `oauth_transaction` persisted by `web_runtime` keyless)
- Confidence: High for the durable stores, keyless access model and role model; the rich workspace/members/grants projection was delivered by TASK-1511 and live-verified in internal shadow
- Reversibility: Mixed — the Cloud SQL instance and the schema are costly to replace once data lands; the store wiring is a two-way door (a `GLOBE_POSTGRES_*`-gated swap back to in-memory exists for `internal_smoke`)
- Owners: Efeonce Globe platform (datastore, role model, stores) + Greenhouse control plane (governance)
- Related: `PLATFORM_FOUNDATION_V1.md`, `GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001), `EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md` (ADR-004 — the HA gate this unblocks), `EFEONCE_GLOBE_MODEL_LAB_V1.md` (spend fence + experiment aggregate), `EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md` (evaluation reports), `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` (the IaC that provisions the instance), `TASK-1465`, `TASK-1468` (deferred commercial ledger), `TASK-1508` (Cloud Run services into Terraform + `maxScale` persistence)

## Delta 2026-07-21 — the reported `maxScale=3` was the REVISION ceiling (corrected by TASK-1508)

Every `maxScale=3` claim in this spec (the Decision below, § Deploy topology, § 4-pillar scoring) read the **revision** ceiling (`template.scaling.maxInstanceCount`). A Cloud Run service also carries a **service-level** ceiling (`Service.scaling.maxInstanceCount`) and **Cloud Run applies the lower of the two**; both services were still at service=1, so the **effective ceiling was 1**. The cause: `--max-instances` writes a different field depending on the subcommand (`gcloud run deploy` → service; `gcloud run services update` → revision), which is why the "restore it after a deploy" workaround this spec implied was **ineffective**.

**TASK-1508 (complete 2026-07-21) brought both services into Terraform, governs BOTH ceilings and left `deploy-internal.yml` image-only** (it passes only `--image`), so the drift trap is closed and there is nothing to restore by hand after a deploy. Corrected state: 3/3 on both services, under IaC.

Consequence to carry forward: because no service ever ran more than one replica, the **cross-replica spend fence this task built was never exercised** — correct by construction and by tests, but its contention path under row locks never ran with >1 replica. Exercising it is **TASK-1512**.

## Decision

Efeonce Globe gets its **first durable datastore**: a Globe-owned Cloud SQL Postgres instance (`globe-pg`), reached **keyless** over the Cloud SQL connector with IAM database authentication, hosting five durable stores behind the ports the domain already declared. Before this, sessions, OAuth transactions, experiments, evaluation reports and the spend fence were in-memory / per-process — which is exactly why the internal release was pinned to `maxScale=1`. Landing durable persistence **removes that ceiling**: `maxScale > 1` was hard-gated on this task by ADR-004, and the gate is now open (both services run durable at `maxScale=3` live).

The datastore is Globe's, never Greenhouse's. Greenhouse remains the ecosystem control plane (identity, desired access, sister-platform bindings); Globe owns its own data, schema and persistence, consistent with the `PLATFORM_FOUNDATION_V1.md` ownership table and the ADR-001 rule that Greenhouse and Globe never share a database.

This original slice deliberately did **not** deliver the rich workspace/members/grants tenancy model. TASK-1511
subsequently delivered it as the ADR-006 broker projection: Greenhouse remains authority for identity and desired
access, while Globe owns only bounded creative-operation grants.

## System topology

~~~mermaid
flowchart TB
  subgraph CR[Cloud Run — southamerica-west1]
    Web[globe-studio-internal · web mode<br/>SA web_runtime]
    Api[globe-api-internal · api mode<br/>SA api_runtime]
  end
  Deployer[globe-deployer<br/>migrations / CI]
  Web -->|Cloud SQL connector · keyless IAM| PG
  Api -->|Cloud SQL connector · keyless IAM| PG
  Deployer -->|connector · SET ROLE globe_owner| PG
  PG[(Cloud SQL globe-pg<br/>Postgres 16 · db-g1-small · ZONAL<br/>PITR + backups · deletion protection)]
~~~

Both Cloud Run services and the migration runner reach the same instance through the Cloud SQL connector; no service opens a raw TCP socket and no service holds a long-lived password. The connector negotiates a secure tunnel through the Cloud SQL Admin API and the IAM database user authenticates by short-lived credential — the same keyless posture the rest of Globe's foundation uses (WIF/ADC), extended to the database tier.

## Cloud SQL instance

| Property | Value |
| --- | --- |
| Instance | `globe-pg` |
| Engine | PostgreSQL 16 (live: 16.14) |
| Region | `southamerica-west1` |
| Tier | `db-g1-small` |
| Availability | ZONAL (single zone; HA/regional is a later cost/gate decision) |
| Authentication | keyless — Cloud SQL IAM database authentication |
| Network | connector-only; **no authorized networks** (the public IP is not reachable by direct TCP) |
| Durability | PITR + automated backups |
| Safety | deletion protection ON |
| Cost | ~US$15–30 / month |
| Ownership | Globe-owned; **never** shared with Greenhouse |
| Provisioning | Terraform — `infra/terraform/cloud_sql.tf` (plan `12 added / 0 destroyed`) |

IAM/enablement provisioned alongside the instance: three IAM database users — `web_runtime`, `api_runtime`, `deployer` — plus the `cloudsql.client` / `cloudsql.instanceUser` grants their service accounts need to connect, and `sqladmin.googleapis.com` enabled on the project. This is all in `cloud_sql.tf`, so it is governed IaC and not drift-prone (the Cloud Run services were not in Terraform when this task shipped; TASK-1508 adopted them — see the Delta above).

## Keyless connector access model

- **No standing password.** Runtime access is by IAM database authentication over the Cloud SQL connector. A password exists **only** for the one-time bootstrap of the role model (below) and is not a runtime credential.
- **Connector-only, connector-native.** `packages/database` exposes `createGlobePool` — the Cloud SQL connector wired to a `pg` pool with a transaction helper. There are no authorized networks; a direct TCP dial to the instance IP fails, which is the intended posture (the connector is the only door).
- **Per-service identity at the database tier.** `web_runtime` and `api_runtime` connect as **distinct** IAM database users, mirroring their distinct Cloud Run service identities. The database inherits the least-privilege separation the workload-identity contract already establishes (ADR-001): the web/BFF principal and the api/Model-Lab principal are not the same database user.
- **Deployer for migrations only.** The `deployer` IAM user runs migrations (and CI-time schema work); it is not a runtime request path.

## Role model (`globe_owner`) + the PG16 restricted-superuser gotcha

Object ownership is centralized on a single non-login role so that no runtime service account owns schema and no standing superuser credential survives bootstrap:

- **`globe_owner` (NOLOGIN)** owns every object (schemas, tables, indexes). It cannot log in.
- **Migrators are members of `globe_owner`.** A migration runs `SET ROLE globe_owner` so that everything it creates is owned by the central role, not by whichever principal happened to run the migration.
- **Runtime service accounts get DML through default privileges.** `web_runtime` / `api_runtime` receive `SELECT/INSERT/UPDATE/DELETE` (never DDL) via `ALTER DEFAULT PRIVILEGES` attached to `globe_owner`, so new tables are reachable by runtime without a per-table grant step and without granting ownership.

**The PG16 restricted-superuser gotcha (why bootstrap is shaped the way it is).** On Cloud SQL Postgres 16 the `postgres` role is a **restricted** superuser. It cannot `CREATE SCHEMA AUTHORIZATION globe_owner` for a role it is not itself a member of — Postgres refuses to create an object owned by a role the creator cannot `SET ROLE` to. The bootstrap therefore **joins `postgres` to `globe_owner` first**, then creates the owned schema. After bootstrap there is **no standing superuser credential**: the one-time password is retired and all further access is keyless IAM. This is the single reason a password exists at all in the model.

## Migration contract

- Migrations are tracked in **`globe._migrations`** (the runner's ledger).
- Every migration executes under **`SET ROLE globe_owner`**, so created objects are owned centrally and inherit the default-privilege grants to the runtime users.
- The runner lives in `packages/database` alongside `createGlobePool`; it uses the connector (keyless) like every other caller.
- Runtime services never run DDL — they hold DML only. Schema change is a migrator/`deployer` path.

## Schema — six tenant-scoped tables + `audit_log`

Six tenant-scoped tables carry an explicit workspace/tenant scope (foundation invariant 1) and back the mutable stores; a seventh, `audit_log`, is append-only.

| Table | Backs | Notes |
| --- | --- | --- |
| `experiments` | Model Lab experiment aggregate | the `prepared → … → candidate_ready \| failed \| cancelled` state machine |
| `evaluation_reports` | Evaluation harness | versioned, workspace-scoped verdicts |
| `human_sessions` | Session store | Globe's local HttpOnly session (ADR-001), no copy of the Greenhouse session |
| `oauth_transactions` | Session store | the authorization-code + PKCE exchange state |
| `spend_fence_runs` | Spend fence | per-run reservation ledger (safety fence) |
| `spend_fence_days` | Spend fence | per-day ceiling accounting (safety fence) |
| `audit_log` | Durable audit log | **append-only** |

## Durable stores behind their ports

Five durable stores replace the in-memory implementations behind the **ports the domain already declared** — the domain code is unchanged; only the wiring swaps an in-memory adapter for a Postgres-backed one.

1. **`DurableExperimentStore`** — replaces `InMemoryExperimentStore`; persists the experiment aggregate + state machine to `experiments`.
2. **`DurableEvaluationReportStore`** — persists evaluation harness reports to `evaluation_reports`.
3. **`DurableSpendFence`** — replaces `LabSpendFence`; atomic cross-replica **reserve / settle / release** over `spend_fence_runs` + `spend_fence_days`. Atomicity across replicas is the point: an in-memory fence per process cannot bound spend once `maxScale > 1`. **This is a SAFETY fence, NOT the TASK-1468 commercial credit ledger** (see [Boundary](#boundary-spend-fence--commercial-ledger)).
4. **`DurableSessionStore`** — split out from `InternalSmokeSessionStore`, now **async**; persists `human_sessions` + `oauth_transactions`. This is the durable session/OAuth store ADR-004 named as the home of the HA gate.
5. **`DurableAuditLog`** — **append-only** writes to `audit_log`.

## Dependency injection + the in-memory guard

- Stores are wired by DI in `app.ts` / `main.ts`.
- When `GLOBE_POSTGRES_*` is set, the app resolves the **durable** stores; the connector + role model take over.
- The previous guard (which forbade in-memory stores in most modes) is **relaxed**: in-memory stores are permitted **only** in `internal_smoke`. Every non-smoke mode expects durable persistence. This keeps a fast, dependency-free path for smoke tests without letting a real surface silently run on volatile state.

## Deploy topology

- **Both Cloud Run services run durable, live.** `globe-studio-internal` (web, SA `web_runtime`) and `globe-api-internal` (api, SA `api_runtime`) both connect to `globe-pg` as their per-service IAM database user.
- **`maxScale=3` is live.** With state durable, the `maxScale=1` pin is lifted; both services were verified at `maxScale=3`.
- **The Dockerfile lesson.** The image build had to be fixed to build the `@efeonce-globe/database` workspace package — without it, the durable client is absent from the deployed artifact and the service falls back / fails. Building the database package is now part of the image.
- **Live durability proof.** Persistence was proven end-to-end live: an `oauth_transaction` written by `web_runtime` — keyless, over the connector — survived in Postgres 16.14.

## Boundary: spend fence ≠ commercial ledger

The `DurableSpendFence` is a **safety** control: it bounds how much a run/day can spend so a bug or a runaway agent cannot burn budget, and it now does so atomically across replicas. It is **not** the commercial credit ledger. The client-facing credit reservation/settlement ledger — reservations, balances, currency — is **TASK-1468**, deferred, and is the authority for what a client is billed. Conflating the two would let a safety mechanism masquerade as commercial accounting. The fence protects Efeonce from overspend; the ledger (later) accounts for client credit. (This mirrors the Model Lab boundary in `EFEONCE_GLOBE_MODEL_LAB_V1.md` and the Creative Producer's "spend fence, no ledger comercial" rule.)

## 4-pillar scoring

- **Safety:** keyless IAM at the database tier (no standing password after bootstrap); per-service IAM DB users; `globe_owner` centralizes ownership so no runtime SA owns schema; connector-only (no authorized networks); deletion protection ON; the spend fence stays a safety control, never surfaced as commercial accounting.
- **Robustness:** the durable spend fence is atomic across replicas (correct once `maxScale > 1`); PITR + backups; migrations run under `SET ROLE globe_owner` so ownership/grants are deterministic; the in-memory guard is relaxed only for `internal_smoke`, so a real surface cannot silently run on volatile state.
- **Resilience:** state survives process restarts and horizontal scale; the store wiring is a two-way door (revert to in-memory for smoke); Terraform provisioning means the instance/IAM are reproducible.
- **Scalability:** removes the in-memory / `maxScale=1` ceiling (ADR-004 gate) — `maxScale > 1` is unblocked; the stores sit behind existing ports so future consumers reuse them without new persistence code.

## Open items / still deferred

- **Continuous tenancy enforcement** — TASK-1511 delivered and verified the rich projection in internal shadow.
  Promotion to `enforced` remains gated by a continuous Greenhouse dev reconciler; the expired bootstrap is not
  permanent authority.
- **Regional HA** — the instance is ZONAL; regional/HA is a separate cost/gate decision, not required by this slice.
- **Provider secrets** — still a separate rollout (canary), out of scope here.

## Invariantes operativos para agentes

- **NUNCA** compartir `globe-pg` con Greenhouse ni leer/escribir la base de Globe desde Greenhouse. La base es de Globe; el boundary Globe↔Greenhouse (ADR-001) prohíbe base compartida. Greenhouse gobierna identidad/acceso deseado, no la data de Globe.
- **NUNCA** crear un cliente de Postgres nuevo ni abrir un socket TCP directo a la instancia. El único acceso es vía `createGlobePool` (`packages/database`) sobre el Cloud SQL connector, keyless (IAM DB auth). No hay authorized networks: un dial directo a la IP falla por diseño.
- **NUNCA** introducir una contraseña de runtime. La única password es la del bootstrap one-time del role model; se retira. Después del bootstrap **no** queda credencial superusuario en pie. Todo acceso de runtime es keyless.
- **NUNCA** hacer que un service account de runtime (`web_runtime`/`api_runtime`) sea dueño de objetos ni corra DDL. Los objetos los posee `globe_owner` (NOLOGIN); runtime tiene solo DML vía default privileges. DDL es camino de migrador/`deployer`.
- **SIEMPRE** correr migraciones bajo `SET ROLE globe_owner` y registrarlas en `globe._migrations`, para que lo creado quede owned por el rol central y herede los grants a los runtime users. La migración que crea el schema owned depende de que `postgres` se una a `globe_owner` primero (gotcha PG16 restricted-superuser).
- **NUNCA** confundir el **spend fence** (`DurableSpendFence`, control de seguridad, `spend_fence_runs`/`spend_fence_days`) con el **ledger comercial de créditos** (TASK-1468, diferido). El fence protege a Efeonce de overspend; el ledger contabiliza el crédito del cliente. No exponer el fence como contabilidad comercial.
- **NUNCA** permitir stores in-memory fuera de `internal_smoke`. Con `GLOBE_POSTGRES_*` seteado, la app resuelve stores durables; el guard relajado permite in-memory **solo** en `internal_smoke`. Ninguna superficie real corre sobre estado volátil.
- **NUNCA** subir/rebajar el `maxScale` de las Cloud Run services por out-of-band. Desde `TASK-1508` los dos ceilings (servicio y revisión) están declarados en Terraform y `deploy-internal.yml` pasa sólo `--image`: un `gcloud run services update --max-instances` sería un segundo escritor sobre un campo gobernado por IaC y, además, escribe el ceiling **de revisión** —Cloud Run aplica el menor—, así que aparenta funcionar sin mover el techo efectivo. Si el techo tiene que cambiar, se cambia en el HCL y se aplica.
- **SIEMPRE** que el build de la imagen toque `apps/studio-web`, verificar que el Dockerfile compila el paquete `@efeonce-globe/database`; sin él, el cliente durable no llega al artefacto desplegado.
- **SIEMPRE** mantener el scope tenant/workspace explícito en toda tabla y todo command/store (invariante 1 de foundation), aun cuando el modelo rico de workspaces/members/grants siga diferido.
