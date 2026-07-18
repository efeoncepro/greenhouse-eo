# Community SDKs — STUB

> **Status**: STUB
> **Next review trigger**: emerge necesidad de Notion API en lenguaje sin SDK oficial (Go, Rust, Java, etc.)
> **Last verified**: 2026-05-17

## Context

Notion oficial mantiene SDKs:
- `@notionhq/client` (Node/TS) — canonical Greenhouse
- `notion-client` (Python)

Community mantiene SDKs no-oficiales para Go, Rust, Java, Ruby, Elixir, etc. Calidad varies — some están well-maintained, otros son stale.

Cuando emerja necesidad (hipotético: service Go o Rust en Greenhouse stack), poblar este archivo con:
- Inventory community SDKs vivos al momento
- Maintenance health (last commit, issue response)
- Recommendation per language
- Fallback: raw HTTP via canonical headers si no hay SDK confiable

## Cross-refs

- `sdks-and-clients/notion-client-node.md`
- `sdks-and-clients/notion-sdk-python.md`
- `api-reference/endpoints-canonical.md` — raw HTTP usable cross-language
