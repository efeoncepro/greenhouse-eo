# TASK-493 — Document Rendering & Template Catalog Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-489`
- Branch: `task/TASK-493-document-rendering-template-catalog-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la capa de rendering y catálogo de templates para generar documentos versionables desde datos estructurados del portal, desacoplando la generación del documento de su posterior firma.

## Why This Task Exists

MSA, SOW, contratos laborales y work orders no deberían nacer como PDFs externos subidos manualmente. Greenhouse necesita una base de templates y rendering para producir drafts versionables, revisables y luego firmables sobre el mismo lenguaje documental.

## Goal

- Introducir templates documentales y jobs de generación.
- Generar artifacts canónicos que entren al registry de documentos/versiones.
- Mantener la firma como una etapa posterior, no como el origen del documento.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

## Dependencies & Impact

### Depends on

- `TASK-489`

### Blocks / Impacts

- `TASK-495`
- futuros flujos HR/work orders

### Files owned

- `src/lib/documents/templates/**`
- `src/lib/documents/rendering/**`
- `migrations/**`

## Current Repo State

### Already exists

- clauses y templates parciales en Finance
- asset storage canónico

### Gap

- no existe template catalog documental reusable
- no existe rendering job que deposite versiones canónicas

## Scope

### Slice 1 — Template catalog

- tipos, metadata, variables y ownership de templates

### Slice 2 — Rendering pipeline

- generación de drafts y artifacts hacia asset/document version

### Slice 3 — Runtime bridge

- conectar source entities y contexto estructurado al renderer

## Out of Scope

- editor visual avanzado de templates
- provider de firma
- gestor documental completo

## Acceptance Criteria

- [ ] existe un catálogo de templates reusable
- [ ] un documento generado entra como versión canónica al registry
- [ ] la firma puede usar artifacts generados por esta capa sin acoplar rendering al provider

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- smoke de generación de documento

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado

