# Decision framework — PAT vs Internal Integration Token — STUB

> **Status**: STUB
> **Next review trigger**: TASK-880 (Notion API Modernization + PAT primitives) implementation
> **Last verified**: 2026-05-17

## Context

PATs lanzados May 12, 2026. Pattern canonical Greenhouse:
- **Internal Integration Token** = productivo automatizado, audit-clean
- **PAT** = scripts ad-hoc, CLI workflows, Workers locales, trusted tools

Decision matrix quick:

| Caso | Token canonical |
|---|---|
| Path productivo bonus payroll | Internal Integration |
| Webhook handler runtime | Internal Integration |
| Sync cron diario productivo | Internal Integration |
| Discovery / exploration manual | PAT OK |
| `ntn` CLI deploy local | PAT (auto via `ntn login`) |
| CI/CD productivo deploy Workers | Internal Integration recommended (machine-scoped) |
| Operator ad-hoc one-shot | PAT OK |

Cuando TASK-880 emerge, poblar con:
- Per-tenant PAT vs global Internal Integration debate (granularity gain vs admin overhead)
- Rotation procedures per type
- Audit log differences (PAT muestra user, Integration muestra bot)
- Multi-environment isolation (PAT staging vs prod)

## Cross-refs hoy

- `api-reference/auth-and-tokens.md` — types overview
- `developer-platform-2026/ntn-cli.md` — PAT usage
- TASK-880 (Greenhouse) — PAT primitives task
