# notion-sdk-py — STUB

> **Status**: STUB
> **Next review trigger**: Python service emerge en repo Greenhouse que necesite Notion API (hoy todo es TypeScript)
> **Last verified**: 2026-05-17

## Context

Notion mantiene SDK Python oficial `notion-client` paralelo al TS. Para Greenhouse hoy:
- 100% del stack runtime es TypeScript (Vercel + Cloud Run Node services)
- HubSpot bridge es Python (`services/hubspot_greenhouse_integration/`) pero NO toca Notion
- No service Python actualmente needs Notion API

Cuando emerja primer service Python que necesite Notion (hipotético: ETL pipeline, ML pipeline, data science workflow), poblar este archivo con:
- Install (`pip install notion-client`)
- Init pattern equivalent al Node
- Endpoint coverage gaps si existen
- Error handling Python idiomatic
- Auto-retry behavior comparison vs Node SDK

## Cross-refs

- `sdks-and-clients/notion-client-node.md` — TS sibling (canonical hoy)
- `api-reference/auth-and-tokens.md` — secret resolution canonical (mismo cross-SDK)
