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

## Delta 2026-05-11 — Arch hardening pre-implementación (8 gaps canónicos)

Skill `arch-architect` (Greenhouse overlay) revisó la spec aplicando patrones canonizados después de la creación de esta task (TASK-611/742/771/773/780/784/863). 8 gaps que se deben cerrar **antes de empezar Slice 1**:

1. **Source entity = tabla bridge per kind, NO polymorphic FK.** El draft actual dice "source entities múltiples" sin contrato. Patrón canónico Greenhouse (overlay decision #1): NUNCA `source_type ENUM + source_id TEXT` sin FK real. En su lugar, tablas bridge `document_member_link(document_id, member_id)`, `document_client_link(document_id, client_id)`, `document_organization_link(...)`, `document_service_link(...)`, etc. Cada link es FK real con CASCADE/RESTRICT explícito. Permite integridad referencial + tenant-safety + soft-delete coherente.
2. **Frontera con `person_identity_documents` (TASK-784) DEBE quedar declarada.** TASK-784 ya creó `greenhouse_core.person_identity_documents` para identidad legal personal (RUT, número doc, fechas). Su `evidence_asset_id` (FK opcional a `greenhouse_core.assets`) es el escaneo del documento. Cuando emerja `documents` registry de TASK-489, debe documentar: TASK-784 owns identity DATA (campos extraídos); TASK-489 owns generic documents. Cuando un `person_identity_document` tenga un asset escaneado, NO se duplica en `documents` — se referencia: `documents.source_kind='person_identity_document'` + bridge `document_person_identity_document_link(document_id, person_identity_document_id)`. Sin esta declaración, terminamos con 2 SSOT del scan de un CI.
3. **`verification_status` state machine completa.** Draft dice "verification_status" sin enumerar transitions ni CHECK. Patrón canónico TASK-700/TASK-765: enum cerrado `pending_review | verified | rejected | archived | superseded` + CHECK constraint DB + matriz de transitions enumerada + helper canónico `transitionDocumentVerificationStatus(client, document, newStatus, actorUserId, reason?)` que enforce el matrix + audit append-only table `document_verification_audit_log` (anti-UPDATE/anti-DELETE trigger) + outbox event versionado v1 per transition. Sin esto, drift inevitable post-TASK-494 cuando los consumers HR muten estado sin pasar por el helper.
4. **Outbox events completos + v1 explícito.** Draft enumera solo `document.created`, `document.version_created`, `document.archived`. Pattern canónico TASK-771/773 requiere set completo versionado v1: `document.created.v1`, `document.version_created.v1`, `document.version_superseded.v1`, `document.verified.v1`, `document.rejected.v1`, `document.archived.v1`, `document.expired.v1`, `document.revealed_sensitive.v1` (audit pattern TASK-784), `document.expiry_warning.v1` (T-30d). Outbox es **infra**, eventos se publican siempre — los consumers se conectan después (corregir afirmación "publicar solo si consumer real").
5. **Retention classes catalog para documents.** TASK-721 tiene `retention_class` per asset. Documents necesita el suyo: `labor_contract` (5 años post-término relación laboral por Código del Trabajo art. 31), `medical_record` (variable según tipo, mínimo 10 años), `nda` (vigente + 5 años post-vencimiento), `compliance_other` (default 7 años), `regulatory_proof` (variable per regulator). Cada document_version hereda `retention_class` desde su `document_type`. Reliability signal `documents.retention_expired_not_archived` detecta drift.
6. **Reliability signals (4-5) declarados desde spec.** Patrón Greenhouse overlay #8 + TASK-742 layer 4: cada surface crítica tiene signals. Mínimos para documents foundation: `documents.upload_dead_letter` (uploads que fallaron N veces), `documents.pending_review_overdue` (>30 días en review), `documents.expired_not_archived` (vencidos sin archive), `documents.evidence_orphan` (versions cuyo `asset_id` no existe en `greenhouse_core.assets`), `documents.bridge_orphan` (bridge rows cuyo target FK fue borrado). Todos kind=drift, severity=warning/error con steady=0.
7. **Tenant-safety pattern explícito.** Draft dice "tenant-safe" sin patrón. Canónico Greenhouse: cada `documents` row tiene `tenant_kind ENUM ('efeonce_internal' | 'client')` + FK opcional a `space_id` (para tenant client) + reader filter automático en `listDocumentsForSubject(tenantContext, ...)` que filtra por tenant context. Bridge tables heredan tenant context via JOIN. NO RLS PG en V1 (out-of-band hasta TASK-789); reader-enforced suffice.
8. **Multi-version + supersede pattern.** Draft menciona `document_version` pero no especifica si es **immutable supersede** (canónico) o "delete+reinsert" (anti-pattern). Patrón canónico: cada version es row append-only, supersede via `superseded_by_version_id` FK + partial UNIQUE INDEX `WHERE active=TRUE`. Helper canónico `supersedeDocumentVersion(client, currentVersion, newVersionInput)` en una sola tx PG.

**4-pillar score requerido al cerrar Slice 1** (template TASK-848): Safety (capabilities granulares + reveal pattern + audit), Robustness (CHECK + state machine + idempotency keys), Resilience (reliability signals + outbox + dead-letter), Scalability (cursor pagination + composite indexes + bridge tables prevent table bloat).

**Patrones canónicos fuente para replicar**:

- `greenhouse_core.person_identity_documents` (TASK-784) — verification_status enum, evidence_asset_id pattern, reveal helper, masking server-side.
- `greenhouse_payroll.final_settlement_documents` (TASK-862/863) — state machine + regen helper + matriz canónica de presentación per status.
- `greenhouse_core.assets` + `assets_access_log` (TASK-721) — append-only audit + retention_class + dedup por content_hash.
- `payment_order_state_transitions` (TASK-765) — append-only state machine audit con anti-UPDATE/DELETE trigger.

---

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

