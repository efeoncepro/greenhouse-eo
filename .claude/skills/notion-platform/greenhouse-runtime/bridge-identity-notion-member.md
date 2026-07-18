# greenhouse-runtime — Bridge identity Notion user → member — STUB

> **Status**: STUB
> **Next review trigger**: TASK-877 follow-up implementation o TASK-908 Slice 0 (status transitions foundation start)
> **Last verified**: 2026-05-17

## Context

Para attribuir RpA, OTD, tasks a un member Greenhouse, necesitamos resolver:
**Notion user (assignee de task) → Greenhouse member_id**

Esto vive en `identity_profile_source_links` con `source_system = 'notion'`, `source_object_type = 'user'`.

Pattern canonical (post TASK-877 follow-up, commit `4fc8c0c4` 2026-05-16):
- Reader canonical: `loadNotionMemberMapPostgresFirst` en `src/lib/identity/reconciliation/notion-member-map.ts`
- Cascade resolution: PG identity_profile_source_links → BQ fallback (degradation honesta)
- Reliability signal `identity.notion_bridge.coverage_drift` (kind=drift, severity=warning < 60%, error < 40%)
- Backfill canonical: migration `20260516234743277_backfill-notion-bridge-greenhouse-staff.sql`

Bug class motivador (TASK-877 follow-up): bridge degradación pasó silente y materializer ICO destruyó data buena de Marzo+Abril+Mayo.

Cuando TASK-908 inicie, poblar con:
- API canonical de uso (`loadNotionMemberMapPostgresFirst` shape)
- Cuándo emerge un Notion user nuevo no mappeado (manual onboarding step?)
- Edge cases: Notion guest users, agents, removed users
- Migration path si TASK-877 V2 emerge
- Hardening adicional post incident

## Cross-refs

- TASK-877 follow-up commit `4fc8c0c4` — fix canonical bridge
- TASK-900 (Greenhouse) — ICO materializer hardening (depende de bridge healthy)
- TASK-908 (Greenhouse) — status transitions foundation (consumer del bridge)
- `developer-platform-2026/data-sources-vs-databases.md` — Notion user object shape
- CLAUDE.md § "Identity Bridge Cutover Protocol"
