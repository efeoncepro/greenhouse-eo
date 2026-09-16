# Efeonce Insights — operations (flags, assignment, canaries, rollback)

## Flags (ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`)

| Flag | Gates | Read in | State 2026-09-16 |
| --- | --- | --- | --- |
| `INSIGHTS_GENERATION_ENABLED` | create / revise / evidence collection | Vercel only (`flags.ts`) | ON staging + Production; Preview OFF |
| `INSIGHTS_ISSUANCE_ENABLED` | issue (plus human gate and validated outputs) | Vercel | OFF everywhere (until TASK-1846) |
| `INSIGHTS_AUTHORING_AI_ENABLED` | Gemini rewrite of the plan | Vercel | OFF everywhere |

Flip = `vercel env add <FLAG> <env>` (`production` lowercase for the standard env; custom `staging` literal) **+
`vercel redeploy <url>`**: a deployment built before the env var never sees it. If a worker starts reading a flag,
declare it in `services/<worker>/deploy.sh` (destructive `--set-env-vars`) and apply live with `--update-env-vars`.

## Assigning the module

`npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/assign-insights-module.ts --org=<organization_id> [--apply]`
— dry-run by default; goes through `enableClientPortalModule` (audit + outbox + cache invalidation). Synthetic org for
canaries: `org-6c09b3a7-cbab-48a9-869e-61d03d1c6291` ("Greenhouse Demo", persona `agent-client@greenhouse.efeonce.org`,
role `client_executive`). Deny org (no module): `org-7e4b9883-bde2-46e4-8848-f54b3ecf9255`.

## Canaries

- App lane (staging): `AGENT_AUTH_EMAIL=agent-client@greenhouse.efeonce.org pnpm staging:request POST /api/platform/app/insights/editions '<InsightRequestV1 json>'`
  → 202; repeat → 200 `idempotent:true`; change `depth` with same key → 409; `GET .../catalog` → 200.
- Ecosystem lane (staging or production): bearer = gateway consumer token (Secret Manager
  `efeonce-mcp-gateway-greenhouse-token`), query `externalScopeType=other&externalScopeId=efeonce-mcp-gateway&organizationId=<org>`,
  header `idempotency-key`, body `InsightRequestV1`; staging additionally needs `x-vercel-protection-bypass`.
  Assert: catalog 200, list 200, detail `?include=evidence` 200 with sealed snapshot + frozen plan, create 202,
  deny org 404. Production create is a real write on the single instance: use the synthetic org only.
- Gateway provider: in `efeonce-mcp`, `GREENHOUSE_ECOSYSTEM_API_URL=… GREENHOUSE_ECOSYSTEM_TOKEN=… [GREENHOUSE_ECOSYSTEM_VERCEL_BYPASS_SECRET=…] node scripts/greenhouse-insights-canary.mjs <org> --deny <org> [--edition <id>]` (reads only).
- Served skill: `GET /api/platform/ecosystem/mcp/skills[/efeonce-insights]` with the consumer token; compare the body
  hash with `docs/mcp/skills/efeonce-insights/SKILL.md` of the deployed SHA; unknown name ⇒ 404.

## Rollback

- Code: revert the PR; flags OFF (`vercel env rm` + redeploy) make the domain answer 503 without touching data.
- Schema: `pnpm migrate:down` on the Insights migration drops the schema and deprecates the four capabilities, and
  **does not touch** the module row, its assignments or `module_assignment_events` (append-only): they are governed
  data and the Up re-seeds capabilities and leaves the module (`DO NOTHING`), so down/up returns to the live state.
  Rehearsed 2026-09-16 00:24–00:25Z on the single shared instance with only synthetic editions. Before any future
  down: announce to peer sessions and WAIT for a reply; confirm every edition's org is synthetic; expect the code
  sequence to restart at `EO-INS-000001`.

## Release specifics

The migration is already applied on the single instance, so `release_batch_policy` reports `db_migrations` as
irreversible: dispatch with a factual `bypass_preflight_reason` (applied migration + `auth_access` = scope parity).
Contract canary on production after release: catalog 200 / deny 404 / create 503 `generation_disabled` before the
flag, 202 after.
