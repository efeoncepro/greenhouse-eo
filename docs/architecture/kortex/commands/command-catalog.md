# Kortex Command Catalog

## Principio

Greenhouse no acepta `path` arbitrario hacia Kortex. Todo comando vive en `src/lib/kortex/commands/registry.ts` con:

- command name;
- metodo HTTP;
- upstream path template;
- operation kind;
- risk tier;
- required payload keys;
- frase/preview cuando aplica.

## Tiers

| Tier | Significado | Gate |
|---|---|---|
| `safe` | No persiste cambios destructivos; puede computar/normalizar. | Adapter enabled + binding/preflight. |
| `stateful` | Persiste estado Kortex o metadata operativa. | Adapter enabled + binding/preflight + idempotencia. |
| `external_write` | Puede escribir en HubSpot via Kortex. | Live flag + confirmacion humana + dry-run cuando aplica. |
| `admin_breakglass` | Admin/bootstrap/internal ops. | Admin flag + confirmacion humana + token server-only cuando Kortex lo exige. |

## Catalogo vigente

| Command | Method | Path | Tier |
|---|---:|---|---|
| `kortex.portal.hub_profile.put` | PUT | `/api/v1/portals/{hubspot_portal_id}/hub-profile` | `stateful` |
| `kortex.admin.snapshots.trigger` | POST | `/api/v1/admin/snapshots/trigger` | `admin_breakglass` |
| `kortex.admin.auth.verify` | POST | `/api/v1/admin/auth/verify` | `admin_breakglass` |
| `kortex.admin.users.seed` | POST | `/api/v1/admin/users/seed` | `admin_breakglass` |
| `kortex.admin.users.bootstrap_e2e_agent` | POST | `/api/v1/admin/users/bootstrap-e2e-agent` | `admin_breakglass` |
| `kortex.audit.run` | POST | `/api/v1/audits/run` | `stateful` |
| `kortex.strategy.normalize` | POST | `/api/v1/strategy/normalize` | `safe` |
| `kortex.strategy.intake` | POST | `/api/v1/strategy/intake` | `stateful` |
| `kortex.strategy.seed_from_audit` | POST | `/api/v1/strategy/seed-from-audit` | `stateful` |
| `kortex.strategy.workspace.update` | PATCH | `/api/v1/strategy/workspaces/{workspace_id}` | `stateful` |
| `kortex.strategy.workspace.compilation_run.create` | POST | `/api/v1/strategy/workspaces/{workspace_id}/compilation-runs` | `stateful` |
| `kortex.strategy.compile` | POST | `/api/v1/strategy/workspaces/{workspace_id}/compile` | `stateful` |
| `kortex.strategy.workspace.approval_decision.create` | POST | `/api/v1/strategy/workspaces/{workspace_id}/approval-decisions` | `stateful` |
| `kortex.strategy.release_candidate.dry_run` | POST | `/api/v1/strategy/release-candidates/{release_candidate_id}/execute` | `stateful` |
| `kortex.strategy.release_candidate.execute` | POST | `/api/v1/strategy/release-candidates/{release_candidate_id}/execute` | `external_write` |
| `kortex.strategy.release_candidate.execute_workflows` | POST | `/api/v1/strategy/release-candidates/{release_candidate_id}/execute-workflows` | `external_write` |
| `kortex.strategy.release_candidate.execute_custom_objects` | POST | `/api/v1/strategy/release-candidates/{release_candidate_id}/execute-custom-objects` | `external_write` |
| `kortex.strategy.conversation.create` | POST | `/api/v1/strategy/conversations` | `stateful` |
| `kortex.strategy.chat.send` | POST | `/api/v1/strategy/chat` | `stateful` |
| `kortex.strategy.operation.execute_internal` | POST | `/api/v1/strategy/internal/operations/execute/{operation_id}` | `admin_breakglass` |
| `kortex.strategy.conversation.extract` | POST | `/api/v1/strategy/conversations/{conversation_id}/extract` | `stateful` |

## Compatibilidad

Los comandos de TASK-1164 se mantienen:

- `kortex.audit.run`
- `kortex.strategy.compile`
- `kortex.strategy.release_candidate.dry_run`
- `kortex.strategy.release_candidate.execute`

TASK-1165 solo agrego catalogo y gates; no rompio esos nombres.

## GitHub repo commands (TASK-1166)

Estos comandos viven en `src/lib/kortex/github-control-plane/commands/**`, separados del adapter runtime Kortex. No aceptan repo/path arbitrario; el repo esta fijado server-side como `efeoncepro/kortex`.

| Command | Tier | GitHub endpoint | Gate |
|---|---|---|---|
| `kortex.github.workflow.rerun_failed` | `workflow_rerun` | `POST /repos/efeoncepro/kortex/actions/runs/{run_id}/rerun-failed-jobs` | `KORTEX_GITHUB_COMMANDS_ENABLED=true`, `Idempotency-Key`, workflow allowlisted, run con conclusion fallida/cancelada/timed out. |
| `kortex.github.workflow.dispatch` | `workflow_dispatch` | `POST /repos/efeoncepro/kortex/actions/workflows/{workflow_id}/dispatches` | `KORTEX_GITHUB_COMMANDS_ENABLED=true`, `KORTEX_GITHUB_WORKFLOW_DISPATCH_ENABLED=true`, ref/workflow allowlisted, frase `DISPATCH KORTEX WORKFLOW`. |

Defaults V1:

- `KORTEX_GITHUB_COMMANDS_ENABLED=false`
- `KORTEX_GITHUB_WORKFLOW_DISPATCH_ENABLED=false`
- `KORTEX_GITHUB_ALLOWED_WORKFLOWS=CI`
- `KORTEX_GITHUB_ALLOWED_REFS=main,develop`
