# TASK-1088 — Notion Knowledge Connector

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|content|integrations.notion`
- Blocked by: `TASK-1082`
- Branch: `task/TASK-1088-notion-knowledge-connector`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar el connector `notion` del pipeline de ingesta de Knowledge Platform: block fetcher (`GET /v1/blocks/{id}/children`, paginado) + conversor `blocks→markdown`, detrás de la interfaz `KnowledgeSourceConnector` que TASK-1082 dejó lista. Habilita ingerir un teamspace Notion de conocimiento (en vez de — o además de — los `repo_docs`).

## Why This Task Exists

TASK-1082 construyó el pipeline source-agnostic + el connector `repo_docs` (corpus markdown del repo), porque NO existía una fuente Notion de knowledge ni secret. El connector Notion se difirió: requiere coordinación out-of-band (el operador crea un teamspace Notion de conocimiento + provisiona el secret) y construir el block fetcher + `blocks→markdown` que el repo no tiene.

## Goal

- Implementar `RepoDocs`-equivalente para Notion: `NotionKnowledgeConnector implements KnowledgeSourceConnector`.
- Block fetcher canónico (reusa `resolveSecretByRef`, Notion-Version `2026-03-11`).
- Conversor puro `blocks→markdown` (headings/listas/rich_text/callout/code) unit-tested con fixtures.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` (Notion boundary §6.2 + Delta 2026-06-11 Ingesta).
- CLAUDE.md "Notion Integrations Registry" + "Knowledge ingestion invariants (TASK-1082)".

Reglas obligatorias:

- Notion es authoring; Greenhouse es runtime. NUNCA Notion live ni Notion MCP como runtime primario.
- Snapshot antes de publicar; token vía Secret Manager (`notion-integration-token-greenhouse-knowledge-*`), NUNCA en texto plano.
- Reusar el pipeline + sanitizer + chunker de TASK-1082 sin cambios; solo el connector es nuevo.
- Registrar la integración nueva en el Notion Integrations Registry (CLAUDE.md) antes del primer uso.

## Normative Docs

- `docs/tasks/complete/TASK-1082-notion-knowledge-ingestion-mvp.md`
- `docs/tasks/complete/TASK-1081-knowledge-core-schema-source-registry.md`

## Dependencies & Impact

### Depends on

- `TASK-1082` (pipeline + interfaz + sanitizer + chunker).
- Out-of-band: teamspace Notion de conocimiento + secret provisionado por el operador.

### Blocks / Impacts

- Amplía el corpus de TASK-1083 (search) / TASK-1084 (human center) con fuentes Notion.

### Files owned

- `src/lib/knowledge/notion/**`

## Current Repo State

### Already exists

- Interfaz `KnowledgeSourceConnector` + pipeline + sanitizer + chunker (TASK-1082).
- Clientes Notion para delivery metrics (page properties), pero NO block content (`/v1/blocks/{id}/children`).
- `resolveSecretByRef` + patrón per-space token.

### Gap

- No hay block fetcher ni conversor `blocks→markdown` para knowledge.
- No existe la integración/secret Notion de knowledge (operator-provisioned).

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Block fetcher

- `src/lib/knowledge/notion/notion-knowledge-client.ts`: fetch recursivo de `GET /v1/blocks/{id}/children` (paginado, rate-limit, errores sanitizados). Token vía `resolveSecretByRef`.

### Slice 2 — blocks → markdown

- `src/lib/knowledge/notion/blocks-to-markdown.ts` (puro): headings, listas, rich_text (bold/italic/code), callout/quote/toggle/code. Unit-tested con fixtures de bloques Notion.

### Slice 3 — Connector + wiring

- `src/lib/knowledge/notion/notion-connector.ts`: `NotionKnowledgeConnector implements KnowledgeSourceConnector` (manifest de páginas autorizadas → `list()`/`load()`).
- Wire en el CLI/pipeline (`--source=notion`), gated en `sync_enabled` + secret.

## Out of Scope

- Search, embeddings, UI, Nexa, MCP. Cambios al schema o al sanitizer/chunker de TASK-1082.

## Detailed Spec

El connector debe ser drop-in tras la interfaz existente: el pipeline (sanitize/quarantine/version/chunk/idempotencia) NO cambia. Dry-run/apply iguales. La diferencia es solo de dónde viene el markdown.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [ ] `NotionKnowledgeConnector` implementa `KnowledgeSourceConnector` y corre por el pipeline de TASK-1082 sin tocarlo.
- [ ] `blocks→markdown` cubierto por tests de fixtures.
- [ ] Token resuelto server-side vía Secret Manager; NUNCA en repo/logs.
- [ ] Integración registrada en el Notion Integrations Registry (CLAUDE.md).
- [ ] No se usa Notion MCP como runtime primario.

## Verification

- tests focales `src/lib/knowledge/notion`
- dry-run contra el teamspace Notion piloto (cuando el secret exista)
- `pnpm task:lint --task TASK-1088`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` actualizados.
- [ ] `Handoff.md` + `changelog.md` actualizados.
- [ ] CLAUDE.md Notion Integrations Registry actualizado con la integración de knowledge.

## Follow-ups

- Ninguno (cierra el gap de fuente Notion del programa Knowledge).
