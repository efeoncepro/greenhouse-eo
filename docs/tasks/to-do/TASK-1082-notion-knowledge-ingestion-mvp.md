# TASK-1082 — Notion Knowledge Ingestion MVP

## Delta 2026-06-11

Cerrado por **TASK-1080** (sin cambio estructural, solo se fija el alcance):

- **Corpus piloto concreto** = 14 docs internos mapeados en `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` → Delta tabla C. Ingerir **solo** ese corpus (MVP `audience='internal'`). No broad sync.
- Al clasificar, poblar las **dos columnas ortogonales** `publication_status` y `agentic_policy` (no un enum mezclado); ≥1 doc nace `agent_excluded` (doc #14) y el de payroll (#13) nace `agent_excluded` hasta firma de `hr_payroll`.
- `quarantined` se aplica cuando el sanitizer detecta secretos/PII/prompt-injection.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|content|data|nexa`
- Blocked by: `TASK-1081`
- Branch: `task/TASK-1082-notion-knowledge-ingestion`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la ingesta MVP de knowledge desde un corpus Notion piloto hacia `greenhouse_knowledge`: snapshot, normalización, clasificación, sanitización, versionado y quarantine. La ingesta es deliberadamente pequeña y auditada; no hace broad sync de todo Notion.

## Why This Task Exists

El valor de Notion como authoring se conserva solo si Greenhouse captura versiones publicadas determinísticas. Nexa no debe leer Notion live en producción; necesita documentos normalizados, seguros y versionados.

## Goal

- Sincronizar un corpus piloto desde Notion hacia las tablas de `TASK-1081`.
- Normalizar páginas/bloques a markdown/AST usable por humanos y chunks.
- Aplicar sanitización, clasificación y quarantine antes de indexar.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Notion es authoring; Greenhouse es runtime.
- Nunca usar Notion MCP como runtime primario de Nexa.
- No ingerir todo Notion; solo el source/corpus autorizado por `TASK-1080`.
- Sanitizar contenido como input no confiable antes de hacerlo recuperable.

## Normative Docs

- `docs/tasks/to-do/TASK-1080-knowledge-platform-acceptance-pilot-taxonomy.md`
- `docs/tasks/to-do/TASK-1081-knowledge-core-schema-source-registry.md`

## Dependencies & Impact

### Depends on

- `TASK-1081` para schema y helpers.
- Secret/config de Notion autorizado para el corpus piloto.

### Blocks / Impacts

- Bloquea `TASK-1083` search/evals y `TASK-1084` human center con contenido real.

### Files owned

- `src/lib/knowledge/notion/**`
- `src/lib/knowledge/ingestion/**`
- `src/lib/knowledge/sanitization/**`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Current Repo State

### Already exists

- Notion integration primitives existen para delivery metrics, pero no para knowledge docs.
- Knowledge architecture define Notion boundary y quarantine.

### Gap

- No hay pipeline para snapshot/versionado de páginas Notion como knowledge documents.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Source connector MVP

- Resolver un source Notion autorizado desde `knowledge_sources`.
- Leer page tree o data source piloto con rate-limit y errores sanitizados.
- Guardar sync/publication run con estado y conteos.

### Slice 2 — Normalization + versioning

- Convertir bloques Notion a markdown/AST normalizado.
- Calcular checksum y crear `knowledge_document_versions` idempotentes.
- Mantener source URL/page ID como provenance.

### Slice 3 — Sanitization + quarantine

- Detectar secretos/patrones sensibles e instrucciones tipo prompt injection.
- Marcar `quarantined` o `agent_excluded` según policy.
- Generar chunks solo para versiones publicables.

## Out of Scope

- UI de administración editorial, search ranking, embeddings, Nexa integration, MCP.

## Detailed Spec

La ingesta debe poder correr en modo dry-run y apply. El dry-run debe reportar documentos nuevos, versiones cambiadas, quarantines y documentos omitidos. El apply debe ser idempotente por source + checksum. Los chunks deben preservar heading path y citation anchor.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (connector) -> Slice 2 (normalization/versioning) -> Slice 3 (sanitization/chunking). No habilitar apply sin dry-run revisado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ingesta filtra secretos o PII | security/content | medium | scanner + quarantine before chunks | `knowledge.publication.quarantine_count` |
| Rate limits/latencia Notion rompen sync | integration | medium | dry-run, retry acotado, run status | `knowledge.sync.failed_source` |

### Feature flags / cutover

- Sync disabled por default en `knowledge_sources.sync_enabled=false`; habilitar solo source piloto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | deshabilitar `sync_enabled` | <5 min | sí |
| 2 | revertir versiones creadas del source piloto si no fueron consumidas | variable | parcial |
| 3 | quarantine manual de documentos afectados | <10 min | sí |

### Production verification sequence

1. Dry-run source piloto.
2. Revisar conteos y quarantine.
3. Apply en staging/dev.
4. Verificar documentos/versiones/chunks.
5. Mantener producción disabled hasta aprobación humana.

### Out-of-band coordination required

- Acceso/secret Notion al corpus piloto y aprobación del owner del source.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [ ] Dry-run muestra conteos de documentos, versiones, chunks, quarantine y omisiones.
- [ ] Apply es idempotente por source + checksum.
- [ ] Documentos con secretos/prompt-injection-like content no quedan recuperables por agentes.
- [ ] No se usa Notion MCP como runtime primario.
- [ ] Manual/runbook de operación de ingesta queda actualizado.

## Verification

- tests focales de ingestion/sanitization
- dry-run contra source piloto
- `pnpm task:lint --task TASK-1082`
- `pnpm docs:closure-check --staged`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con source piloto, run evidence y pendientes.
- [ ] `changelog.md` actualizado.
- [ ] Chequeo de impacto sobre `TASK-1083` y `TASK-1084`.

## Follow-ups

- `TASK-1083` search/evals.
