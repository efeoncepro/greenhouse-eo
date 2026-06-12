# TASK-1088 — Notion Knowledge Connector

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Code complete (flip de lifecycle held por WT compartido — ver Delta de cierre)`
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

- **TASK-1094 — Notion Knowledge Webhook Auto-Ingest + Freshness** absorbe la **automatización** que esta task dejó fuera de scope (era "construir el conector", no "regarlo"): webhook que re-ingiere por artículo al publicar/editar, **deprecación por borrado** (cierra ese gap), y señal de frescura + reconcile on-demand (sin cron, decisión operador). TASK-1094 **depende de** este conector + pipeline.
- **Rollout operativo (no es código):** ingerir el resto de las Wikis declaradas (SOPs 44 · AXIS 55 · Inicio empresa 32 · Contenidos 101 a revisar · 2 páginas) corriendo `ingest --source=notion --only=<wiki> --apply`. Es *usar* el conector terminado; se hace incrementalmente. Buyer Personas ya ingerida en vivo (21 docs).

---

## Delta 2026-06-12 — Cierre (4 slices en `develop`)

Implementado en `develop` (sin cambio de rama, override del operador). Drop-in: el pipeline de ingesta (sanitize/quarantine/version/chunk, TASK-1082) NO cambia; el connector solo aporta una fuente nueva.

| Slice | Commit | Entregable |
| --- | --- | --- |
| 1 — Pipeline parametrizado | `c0e2d25de` | `KnowledgeSourceConnector.sourceDescriptor` (SSOT de identidad del source); `findSourceId`/`registerKnowledgeSource` lo consumen; `repo_docs` bit-for-bit (18 tests verdes). |
| 2 — Block fetcher | `daa4104b7` | `notion-knowledge-client.ts` (server-only): `/v1/blocks/{id}/children` paginado+recursivo + `/v1/pages/{id}` provenance; token vía `resolveSecretByRef(NOTION_KNOWLEDGE_TOKEN_SECRET_REF)`, Notion-Version `2026-03-11`, 429 retry, guard 5000/12, errores sanitizados, fetch inyectable. |
| 3 — blocks→markdown | `05db304c4` | `blocks-to-markdown.ts` **puro** + 17 tests con fixtures. Headings limpias para el chunker heading-pathed. |
| 4 — Connector + corpus + CLI | `ef3ab5996` | `NotionKnowledgeConnector` (degradación honesta `unavailable` sin token) + `notion-corpus.ts` (nace vacío) + CLI `--source=repo_docs\|notion` + 6 tests con mock reader. |

### Verificación

- `pnpm exec tsc --noEmit` — 0 errores en los archivos nuevos.
- `pnpm exec vitest run src/lib/knowledge/notion` — **23/23** (17 markdown + 6 connector).
- `pnpm exec vitest run src/lib/knowledge/ingestion` — **18/18** (Slice 1 no rompió `repo_docs`).
- CLI guard: `--source=bogus` rechazado; `--source=notion` con corpus vacío + sin token = degradación honesta.
- `eslint --fix` limpio en todos los archivos nuevos; pre-commit hook verde en cada slice.

### Documentación sincronizada

- `CLAUDE.md`: fila **Knowledge** en el Notion Integrations Registry + regla de aislamiento del token + invariante de ingesta TASK-1082 actualizado (connector Notion shipped).
- `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`: Delta 2026-06-12 — Connector Notion de Knowledge.

### Pendiente de rollout (no de código)

Code complete + verificado. Para ingerir real, el operador debe: (1) crear la integración Notion dedicada + secret `notion-integration-token-greenhouse-knowledge` + setear `NOTION_KNOWLEDGE_TOKEN_SECRET_REF`; (2) compartir las páginas del teamspace de conocimiento con esa integración; (3) declarar las entradas en `notion-corpus.ts` (`notionPageId` + metadata editorial); (4) `pnpm tsx … scripts/knowledge/ingest.ts --source=notion` (dry-run → `--apply`).

### Nota de coordinación multi-agente (WT compartido)

Commits de código (1-4) + arch Delta + CLAUDE.md = locales en `develop`, sin push. Los flips de estado de 1088 en `docs/tasks/README.md`, `TASK_ID_REGISTRY.md`, `changelog.md`, `Handoff.md` y `project_context.md` están **mid-edit por Codex** (TASK-1093 ya flipeado a complete en esos archivos, sin commitear). En `README.md` la línea de 1088 (L31) y la de 1093 de Codex (L28) están a 3 líneas → comparten hunk de diff → no se pueden separar con staging selectivo sin barrer el flip de 1093. Por eso el doc **se mantiene en `in-progress/`** con Lifecycle `in-progress` (carpeta ≡ README, sin violación) y el flip atómico a `complete/` + README/registry/changelog/Handoff queda como el único paso pendiente, a ejecutar en cuanto Codex commitee 1093 (o con autorización explícita del operador para coordinar). Regla aplicada: convivencia multi-agente (no apartar/barrer WIP ajeno con stash/clean/pathspecs amplios).
