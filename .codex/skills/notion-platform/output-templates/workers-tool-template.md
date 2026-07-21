# Template canonical — Workers Agent Tool skeleton — STUB

> **Status**: STUB
> **Next review trigger**: Workers → GA, o emerge task que justifique build Agent Tool en Greenhouse (V2+)
> **Last verified**: 2026-05-17

## Context

Skeleton para build Worker que actúa como Custom Agent tool. Hoy NO scope V1 (Workers Beta + path productivo crítico no aplicable).

Cuando Workers → GA y emerge use case canonical, poblar con:
- ntn workers init template detail
- TS skeleton para tool handler
- Input/output schema canonical
- Auth pattern (Worker → Greenhouse API federation)
- Error handling
- Testing pattern (local emulator si Notion provee)
- Deploy + CI/CD integration

## Cross-refs hoy

- `developer-platform-2026/workers-canonical.md` — runtime base
- `developer-platform-2026/agent-tools.md` — capability concept
- `developer-platform-2026/ntn-cli.md` — deploy CLI
- `investigation-gaps/workers-production-readiness.md` — pre-requisitos
- `investigation-gaps/custom-agents-metric-compute.md` — V2+ use case
