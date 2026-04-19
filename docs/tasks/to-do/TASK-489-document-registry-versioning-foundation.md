# TASK-489 — Document Registry & Versioning Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-489-document-registry-versioning-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la foundation canónica del dominio documental de Greenhouse: documento, versión, clasificación, vínculo con assets privados, source entity y metadatos mínimos de lifecycle. Esta task fija el contrato reusable antes de conectar HR, MSA/SOW o cualquier otro módulo.

## Why This Task Exists

Hoy existe storage privado reusable (`greenhouse_core.assets`) pero no existe un agregado documental transversal. Eso obliga a cada módulo a modelar "su documento" con campos propios, estados incompatibles y links efímeros. Antes de firma, UI o rendering, Greenhouse necesita una capa documental estable.

## Goal

- Introducir el registry documental y el versionado canónico del repo.
- Reusar `greenhouse_core.assets` como foundation binaria sin duplicar storage.
- Permitir que futuros dominios anclen documentos a organizaciones, personas, contratos, MSAs u otras entidades sin inventar tablas paralelas.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- El binario sigue viviendo en GCS + `greenhouse_core.assets`; el registry documental no duplica blobs.
- Cada reader/writer debe ser tenant-safe y filtrar por `space_id` cuando aplique el scope del portal.
- `context_documents` puede guardar sidecars o metadata enriquecida, pero no reemplaza el source of truth transaccional del documento.
- IDs y nombres deben seguir las convenciones canónicas del repo.

## Normative Docs

- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`
- `docs/tasks/to-do/TASK-027-hris-document-vault.md`
- `docs/tasks/complete/TASK-461-msa-umbrella-clause-library.md`

## Dependencies & Impact

### Depends on

- `src/lib/storage/greenhouse-assets.ts`
- `greenhouse_core.assets`
- `docs/architecture/schema-snapshot-baseline.sql` como referencia histórica

### Blocks / Impacts

- `TASK-490`
- `TASK-492`
- `TASK-493`
- `TASK-494`
- `TASK-495`

### Files owned

- `migrations/**`
- `src/lib/documents/**`
- `src/types/db.d.ts`
- `docs/architecture/**` si el contrato cambia

## Current Repo State

### Already exists

- Assets privados shared via `src/lib/storage/greenhouse-assets.ts`
- Context layer documental via `greenhouse_context.context_documents`
- Casos de uso documentales repartidos en HR y Finance

### Gap

- No existe `document_id` ni `document_version_id` como lenguaje común del repo.
- No hay bridge formal entre asset privado y entidad documental.
- No existe clasificación documental reusable ni source entity generic.

## Scope

### Slice 1 — Schema base

- crear schema y tablas canónicas del registry documental
- modelar `document`, `document_version`, clasificación, owner/source entity y vínculo a `asset_id`

### Slice 2 — Runtime base

- readers/writers Kysely para documentos y versiones
- helpers de creación de versión y resolución de versión activa

### Slice 3 — Integration hooks

- publicar eventos básicos `document.created`, `document.version_created`, `document.archived`
- dejar contratos listos para firma, rendering y gestor documental

## Out of Scope

- firmas electrónicas
- UI final del gestor documental
- rendering de PDF/DOCX
- migración de todos los dominios consumidores

## Acceptance Criteria

- [ ] existe una foundation documental canónica desacoplada de cualquier módulo vertical
- [ ] cada versión apunta a un `asset_id` privado en vez de guardar URLs directas
- [ ] el contrato soporta source entities múltiples sin requerir otra tabla por dominio

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- smoke SQL/reader sobre el schema nuevo

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado si hubo cambios de contrato
- [ ] `project_context.md` o arquitectura actualizados si cambió el modelo documental

