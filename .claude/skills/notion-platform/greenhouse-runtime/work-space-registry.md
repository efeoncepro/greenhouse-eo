# Work-space registry for Notion destinations

The runtime unit is a Greenhouse `space_id`, not a Notion teamspace discovered on every command.

```text
human alias
  -> greenhouse space_id
  -> greenhouse_core.space_notion_sources
  -> projects/tasks/sprints data source IDs
  -> notion_token_secret_ref
  -> semantic property-ID bindings + schema fingerprint
```

## Required registry projection

- stable `space_id`;
- accepted human aliases and display name;
- timezone and business calendar;
- Projects and Tasks data source IDs;
- scoped integration secret reference;
- semantic field → Notion property ID/type mapping;
- relation topology for `project`, `parent_task` and reciprocal `child_tasks`, including proof that the self-relation targets the same Tasks data source;
- normalized status-stage/terminal mappings and `dueSoonBusinessDays` policy;
- required read/create/update capabilities and last successful canary;
- schema fingerprint and verification timestamp;
- enabled/read/write readiness state.

Do not store raw tokens. Resolve secrets server-side.

## Resolution rules

- REST does not enumerate teamspaces. Do not call `/v1/search` and guess by ID prefix.
- A scoped integration token is the access boundary and discovers only content shared with it during onboarding.
- Notion MCP may enumerate teamspaces interactively, but its OAuth context is not runtime-available.
- Property IDs survive renames; use them for programmatic identity after bootstrap and keep names only for display/diagnostics.
- Before writes, retrieve/compare schema when the fingerprint is stale or a schema webhook reports drift.
- A 404 can mean missing content or missing access; surface the ambiguity and run readiness diagnostics.
- Maintain a Greenhouse work-item index `notion_page_id → space_id/data_source_id` for items created or observed. For an arbitrary page URL absent from the index, require an explicit space or an operator-approved bounded diagnostic; never spray all scoped tokens.

## CLI/agent behavior

Commands receive a normalized `space` alias or resolved `space_id`. Agents may infer it from explicit conversation context only when unambiguous. `--dry-run` must show the resolved destination, project/task parent, property mapping and intended write without exposing secret refs.

Unknown or unready destinations use the existing onboarding flow from `teamspace-linking-per-client-token.md`; normal operations never repeat that discovery.

If an explicit `--space` conflicts with the indexed parent/project space, fail with a destination conflict. Explicit input never overrides hierarchy integrity.
