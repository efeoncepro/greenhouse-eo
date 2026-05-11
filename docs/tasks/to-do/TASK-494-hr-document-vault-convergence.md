# TASK-494 — HR Document Vault Convergence

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-489`, `TASK-492`
- Branch: `task/TASK-494-hr-document-vault-convergence`
- Legacy ID: `TASK-027`
- GitHub Issue: `none`

## Delta 2026-05-11 — Arch hardening pre-implementación (7 gaps canónicos)

Skill `arch-architect` (Greenhouse overlay) revisó la spec aplicando patrones canonizados después de la creación de esta task (TASK-611/742/784/863). 7 gaps que se deben cerrar **antes de empezar Slice 1**:

1. **Frontera con `final_settlement_documents` (TASK-863) declarada.** El finiquito vive en `greenhouse_payroll.final_settlement_documents` con su propio state machine + pdf_asset_id + 7 transitions. NO se migra al registry transversal — coexiste. Pattern de bridge: `documents` registry referencia el finiquito via `documents.source_kind='final_settlement_document'` + bridge `document_final_settlement_link(document_id, final_settlement_document_id)` cuando emerja necesidad de listarlo en `/my/documents` o People 360 tab. SSOT del finiquito sigue siendo `final_settlement_documents`; el registry agrega solo metadata transversal (clasificación, retención, surfacing).
2. **Frontera con `person_identity_documents` (TASK-784) declarada.** TASK-784 owns identity DATA personal (RUT, número doc, expiry). Sus `evidence_asset_id` (PNG/PDF scan) NO se duplica en `member_documents`. Cuando un documento de identidad escaneado del Colaborador debe aparecer en `/hr/documents`, el bridge es `document_person_identity_document_link`. Pattern: el operador HR ve el CARD del documento (clasificación + verificación + asset_id), pero la edición de datos extraídos vive en TASK-784 UI (`/my/legal-profile` o `/hr/identity`). Reveal pattern (mascarado/desenmascarado) sigue siendo de TASK-784.
3. **Person 360 facet alignment via Organization Workspace shell pattern (TASK-611/612/613) — aplicado a Colaborador 360.** Draft dice "People 360 documents tab" sin especificar shell. Decisión: la tab `/people/[memberId]?tab=documents` se renderea como `<FacetContentRouter facet="documents">` con `FACET_REGISTRY` entry `documents → DocumentsFacet`. El facet self-contained: queries propias, drawer propio, filtros propios. NUNCA renderiza chrome (KPIs, header, tabs) — el shell ya lo hace. Per-entrypoint dispatch: `entrypointContext='hr'` muestra view HR (verify actions); `entrypointContext='my_workspace'` muestra view colaborador (solo own + upload self-service).
4. **Reveal pattern para confidential docs (NOT boolean `is_confidential`).** Draft mantiene `is_confidential` boolean. Patrón canónico TASK-784: NO boolean. En su lugar, cada `document_type` declara `confidentiality_kind ENUM ('public_within_tenant' | 'masked_default' | 'reveal_required')`. Para `reveal_required`, el helper canónico `revealDocument({docId, reason, actorUserId})` enforce capability + audit + outbox. Mascarado server-side por default. Reliability signal `documents.reveal_anomaly_rate` (TASK-784 pattern). Esto convierte la confidencialidad de un afterthought (badge visual) en una capa de defensa robusta.
5. **`document_type` canonical taxonomy hereda retention class (TASK-489 Slice 1).** Draft enumera `contrato, anexo, NDA, licencia médica, doc identidad, otro` pero sin retention. Cuando TASK-489 cierre Slice 1, cada `document_type` declara `retention_class` (e.g. `labor_contract → 5 años post-término`, `medical_record → 10 años`, `nda → vigente + 5 años post-vencimiento`). Reliability signal `documents.retention_expired_not_archived` detecta drift.
6. **Real-Artifact Iterative Verification Loop aplicable (TASK-863 V1.5.1 methodology).** Documents laborales que un humano firma/audita externamente (contrato, anexo, finiquito surfaced) caen en el scope canonizado hoy: **emitir 1 caso real con datos productivos → capturar artefacto (PDF/screenshot) → 3-skill audit (payroll-auditor + UX writing es-CL formal-legal + modern-ui) → iterar V1.x hasta zero blockers → canonizar**. NO declarar la task `complete` sin pasar por el loop con un colaborador real.
7. **Capabilities granulares per-tenant heredadas de TASK-492.** Draft NO declara capabilities. Hereda de TASK-492 Delta: `documents.read_masked`, `documents.upload`, `documents.verify`, `documents.reveal_sensitive`, `documents.export_snapshot`, `documents.archive`. Para HR Vault scope: las 6 aplican con scope `tenant`. Para self-service `/my/documents`: solo `documents.read_masked` (scope=own) + `documents.upload` (scope=own; types limitados por `document_type.self_service_allowed=true`).

**Naming clarification**: la tab vive en surface `/people/[memberId]` o `/colaborador/[memberId]` (TBD por usuario), pero el canonical 360 object es `team_members` (Colaborador). Términos "People 360" en draft anterior son colloquial — el contrato técnico es **Colaborador Workspace shell facet 'documents'**.

**4-pillar score requerido al cerrar Slice 3**:

- **Safety**: 6 capabilities granulares + reveal pattern + audit log + bridge bridges previenen orphan reads cross-tenant.
- **Robustness**: state machine TASK-489 hereda; CHECK constraint per FK; idempotency keys on uploads.
- **Resilience**: 5 signals (`documents.upload_dead_letter`, `documents.pending_review_overdue`, `documents.expired_not_archived`, `documents.reveal_anomaly_rate`, `documents.bridge_orphan`).
- **Scalability**: cursor pagination keyset on `created_at DESC` per member; composite index `(member_id, document_type, verification_status)`; bridge tables prevent JOIN explosion.

**Patrones canónicos fuente para replicar**:

- TASK-863 V1.1→V1.5.1 — Real-Artifact Verification Loop (mandatory para docs legales).
- TASK-784 reveal pattern + 6 capabilities + masking + outbox revealed_sensitive event.
- TASK-611/612/613 Organization Workspace shell + per-entrypoint dispatch.
- TASK-313 `member_certifications` — preservar separation (NO duplicar; certifications = profesional, no laboral).
- TASK-742 7-layer defense template.

---

## Summary

Rebaselinar el HR Document Vault sobre la plataforma documental común para que `/my/documents`, `/hr/documents` y People 360 usen el mismo registry, access model y asset pipeline del epic, sin reabrir una solución paralela solo para HR.

## Why This Task Exists

`TASK-027` ya detectó correctamente la necesidad de un vault laboral, pero antes de EPIC-001 seguía siendo razonable pensarlo como un dominio casi autónomo. Ahora el camino robusto es convergerlo al lenguaje documental shared y dejar la especialización HR solo donde realmente aporta: taxonomía, reglas de confidencialidad y lifecycle laboral.

## Goal

- Absorber el objetivo funcional de `TASK-027` sobre la plataforma documental común.
- Entregar surfaces HR y self-service reales.
- Mantener la frontera clara entre documentos laborales, certificaciones y evidencia reputacional.

## Architecture Alignment

- `docs/tasks/to-do/TASK-027-hris-document-vault.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

## Dependencies & Impact

### Depends on

- `TASK-489`
- `TASK-492`
- `TASK-027`

### Blocks / Impacts

- `/my/documents`
- `/hr/documents`
- People 360 documents tab

### Files owned

- `src/lib/hr-core/**`
- `src/app/(dashboard)/my/**`
- `src/app/(dashboard)/hr/**`
- `src/views/greenhouse/people/**`

## Current Repo State

### Already exists

- spec rebaselined de `TASK-027`
- shared asset foundation

### Gap

- la UX y runtime HR siguen sin existir
- todavía no convergen al programa documental transversal

## Scope

### Slice 1 — Domain mapping HR

- taxonomía y reglas HR sobre document registry shared

### Slice 2 — UI/Routes

- `/my/documents`
- `/hr/documents`
- People 360 tab

### Slice 3 — Lifecycle HR

- verificación, expiración, confidencialidad y alerts operativos

## Out of Scope

- rendering genérico de templates
- firma provider-specific
- portal cliente externo

## Acceptance Criteria

- [ ] el alcance funcional de `TASK-027` queda absorbido por la plataforma común
- [ ] HR y colaboradores usan surfaces reales sobre el mismo registry documental
- [ ] no se duplican storage, uploads ni readers fuera de la base shared

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- smoke manual de rutas HR/My/People

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado
- [ ] `TASK-027` queda explícitamente cerrada o absorbida con delta documental
