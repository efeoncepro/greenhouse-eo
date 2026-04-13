# TASK-027 — HRIS Document Vault

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno rebaselined al runtime 2026`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-027-hris-document-vault`
- Legacy ID: `CODEX_TASK_HRIS_Document_Vault`
- GitHub Issue: `none`

## Summary

Implementar la bóveda de documentos HRIS para que Greenhouse pueda gestionar documentos laborales, legales y de compliance por colaborador sobre la foundation shared de assets privados. La task cubre self-service en `/my/documents`, gestión HR en `/hr/documents`, surfacing en People 360 y lifecycle básico de verificación, vencimiento y confidencialidad sin abrir un segundo sistema de storage.

## Why This Task Exists

La necesidad funcional sigue viva: hoy Greenhouse no tiene un agregado canónico para contratos, anexos, NDAs, licencias médicas y documentos laborales del equipo. La arquitectura HRIS lo contempla, pero el brief histórico quedó desalineado del runtime actual: asumía bucket propio, signed URLs ad hoc y un contrato `file_url` que ya no corresponde después de `TASK-173`.

Además, el repo ya avanzó en dominios cercanos como certificaciones y evidencia profesional. Si `TASK-027` no se reescribe, el riesgo no es solo que quede vieja, sino que alguien implemente un vault que duplique `member_certifications`, `member_evidence` o el patrón shared de `private assets`.

## Goal

- Crear el agregado canónico `member_documents` del dominio HR sobre `greenhouse_hr` usando `asset_id` como referencia al asset privado.
- Habilitar surfaces reales para colaborador, HR y People 360 sin abrir una lane paralela de storage o serving.
- Formalizar reglas de confidencialidad, elegibilidad de upload, verificación HR y expiración para documentos laborales/compliance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`

Reglas obligatorias:

- El vault de documentos HR debe vivir sobre la foundation shared de `private assets`; no crear bucket, uploader ni signed URL API paralelos.
- El documento de dominio debe referenciar `asset_id` canónico; no persistir `file_url` cruda como contrato principal.
- `Document Vault` es para documentos laborales, contractuales y de compliance. No debe duplicar el agregado de certificaciones profesionales ni el de evidencia reputacional ya existentes.
- La confidencialidad debe ser enforceable por rol/scope en readers y routes; no basta con mostrar un badge visual.
- Los uploads self-service deben estar limitados por tipo de documento y ownership real del colaborador.
- Los archivos siguen siendo privados por defecto; el browser no debe leer GCS directo como baseline.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-173-shared-attachments-platform-gcp-governance.md`
- `docs/tasks/complete/TASK-026-hris-contract-type-consolidation.md`
- `docs/tasks/complete/TASK-313-skills-certifications-profile-crud.md`

## Dependencies & Impact

### Depends on

- `src/components/greenhouse/GreenhouseFileUploader.tsx`
- `src/app/api/assets/private/route.ts`
- `src/app/api/assets/private/[assetId]/route.ts`
- `src/lib/storage/greenhouse-assets.ts`
- `src/lib/hr-core/service.ts`
- `src/lib/hr-core/certifications.ts`
- `src/lib/hr-core/evidence.ts`
- `src/app/api/people/[memberId]/hr/route.ts`
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx`

### Blocks / Impacts

- `/my/documents`
- `/hr/documents`
- tab de documentos en People 360
- alertas de expiración/compliance para HR
- futuras surfaces client-safe de compliance o staffing que necesiten leer documentos no confidenciales

### Files owned

- `docs/tasks/to-do/TASK-027-hris-document-vault.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `src/lib/hr-core/**`
- `src/types/**`
- `src/app/api/my/**`
- `src/app/api/hr/**`
- `src/app/api/people/[memberId]/**`
- `src/views/greenhouse/my/**`
- `src/views/greenhouse/hr-core/**`
- `src/views/greenhouse/people/tabs/**`

## Current Repo State

### Already exists

- La foundation shared de assets privados ya quedó cerrada en `TASK-173`:
  - `greenhouse_core.assets`
  - `src/components/greenhouse/GreenhouseFileUploader.tsx`
  - `src/app/api/assets/private/route.ts`
  - `src/app/api/assets/private/[assetId]/route.ts`
- El portal ya tiene route groups y surfaces activas para `my`, `hr` y `people`:
  - `src/app/(dashboard)/my/**`
  - `src/app/(dashboard)/hr/**`
  - `src/app/(dashboard)/people/**`
- HR Core ya tiene patrones de aggregates con asset privado en producción de repo:
  - `src/lib/hr-core/certifications.ts`
  - `src/lib/hr-core/evidence.ts`
- La arquitectura HRIS ya modela `greenhouse_hr.member_documents` y navega las vistas `/my/documents` y `/hr/documents`.

### Gap

- No existe todavía la tabla runtime `greenhouse_hr.member_documents` materializada en repo ni en tipos Kysely.
- No existen readers/writers canónicos para documentos HR.
- No existen las rutas `/api/my/documents`, `/api/hr/documents` ni sus acciones de verificación/expiración.
- No existen las vistas `/my/documents` ni `/hr/documents`.
- People 360 aún no expone un tab de documentos laborales.
- La task legacy sigue asumiendo `file_url`, bucket propio y signed URLs específicas del dominio, lo que hoy contradice el contrato de assets shared.
- Falta una frontera explícita entre `Document Vault` y los agregados ya existentes de certificaciones/evidencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Canonical aggregate + persistence

- materializar `greenhouse_hr.member_documents` con contrato actualizado a `asset_id`
- definir types y helpers de dominio para:
  - `document_type`
  - `verification_status`
  - `is_confidential`
  - `expires_at`
  - ownership (`member_id`, `uploaded_by`, `verified_by`)
- reutilizar patrones de `src/lib/hr-core/certifications.ts` y `src/lib/hr-core/evidence.ts` para attach/read de assets privados

### Slice 2 — API routes + access model

- crear readers/writers tenant-safe para documentos HR
- exponer surfaces mínimas en:
  - `/api/my/documents`
  - `/api/hr/documents`
  - `/api/hr/documents/[documentId]`
  - `/api/hr/documents/[documentId]/verify`
  - `/api/hr/documents/expiring`
- si People 360 necesita serving propio, agregar reader o route específica sin duplicar lógica
- limitar self-service por tipos permitidos y ownership real del miembro

### Slice 3 — UI self-service + HR admin

- crear `My Documents` para que el colaborador vea y cargue solo documentos permitidos
- crear `HR Documents` para que HR vea, filtre y verifique documentos del equipo
- reutilizar `GreenhouseFileUploader`, tablas y patrones Vuexy/MUI ya existentes
- dejar estados claros: pendiente, verificado, rechazado, vencido, confidencial

### Slice 4 — People 360 + lifecycle operativo

- agregar surfacing de documentos laborales en People 360
- definir handling básico de expiraciones próximas, documentos faltantes y confidencialidad
- evaluar publicación de eventos `hr.document.*` solo si el consumer downstream es real y confirmado en discovery
- documentar explícitamente la frontera entre:
  - documentos laborales/compliance del vault
  - certificaciones profesionales
  - evidencia reputacional/portfolio

## Out of Scope

- crear un segundo sistema de upload/download separado de `private assets`
- duplicar `member_certifications` o `member_evidence`
- exponer documentos HR directo a clientes o sister platforms sin contrato adicional
- resolver todo onboarding/offboarding de HRIS dentro de esta misma task
- storage público, URLs permanentes públicas o buckets dedicados solo para HR

## Detailed Spec

La relectura correcta de esta task en 2026 es:

- el **dominio** sigue siendo HRIS Document Vault
- el **storage foundation** ya no es parte de esta task
- el **contrato de archivo** debe ser `asset_id -> private asset`
- el **agregado** vive en `greenhouse_hr.member_documents`

### Semántica recomendada del dominio

Este vault debe cubrir documentos laborales y de compliance, por ejemplo:

- contrato
- anexo de contrato
- NDA
- licencia médica
- documento de identidad
- documento laboral genérico / otro

El discovery debe revisar si `certificado` sigue como tipo válido dentro de este dominio o si debe renombrarse / acotarse para no colisionar con el agregado de certificaciones profesionales ya implementado en `greenhouse_core.member_certifications`.

### Contrato técnico esperado

La metadata de dominio debe vivir en PostgreSQL; el asset físico sigue en `greenhouse_core.assets`.

Campos mínimos esperados del agregado:

- `document_id`
- `member_id`
- `document_type`
- `asset_id`
- `file_name_snapshot`
- `mime_type_snapshot`
- `file_size_bytes_snapshot`
- `description`
- `expires_at`
- `is_confidential`
- `verification_status`
- `uploaded_by`
- `verified_by`
- `verified_at`
- timestamps

La implementación puede conservar snapshots de nombre/tamaño/mime para resiliencia histórica, pero no debe usar `file_url` como ancla canónica.

### Reglas de convivencia con otras lanes

- `TASK-173` sigue siendo dueña del storage shared y serving de assets.
- `TASK-313` sigue siendo dueña del agregado de certificaciones profesionales.
- El vault HR no debe transformarse en un dossier genérico de talento ni portfolio.
- Si más adelante una surface client-facing necesita leer ciertos documentos no confidenciales, debe nacer como follow-on explícito y no como supuesto escondido dentro de esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe agregado canónico `member_documents` sobre `greenhouse_hr` usando `asset_id` y no `file_url` como referencia principal
- [ ] Existen routes y readers para colaborador y HR con enforcement correcto de ownership, rol y confidencialidad
- [ ] Existen vistas `/my/documents` y `/hr/documents` reutilizando la foundation shared de assets
- [ ] People 360 expone surfacing de documentos laborales o deja un reader formal listo para ese consumer
- [ ] La task deja documentada y enforceable la frontera entre Document Vault vs certificaciones/evidencia

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual o preview de:
  - upload self-service
  - lectura HR
  - verificación HR
  - respeto de confidencialidad en People 360

## Closing Protocol

- [ ] Actualizar `docs/architecture/Greenhouse_HRIS_Architecture_v1.md` si el contrato final de `member_documents` cambia respecto al DDL legacy
- [ ] Actualizar `Handoff.md` con la frontera final entre vault HR vs certificaciones/evidencia
- [ ] Actualizar la documentación funcional HR si se crea la surface `Mis documentos` / `Documentos del equipo`

## Follow-ups

- lane específica de onboarding/offboarding si el vault gatilla checklist documental y no solo storage/consulta
- alerting/notificaciones de expiración si el consumo operativo real justifica proyección o cron dedicado
- surface client-safe de compliance si Staff Aug o clientes necesitan leer subconjuntos no confidenciales

## Delta 2026-04-13

- Task rebaselined al runtime actual del repo.
- Se elimina la lectura legacy de bucket propio, `file_url` y signed URLs de dominio.
- La task ahora consume explícitamente la foundation shared de `private assets` y convive con `TASK-313`.

## Open Questions

- si `document_type='certificado'` sigue siendo necesario en HR Vault o debe separarse semánticamente de certificaciones profesionales
- si People 360 debe tener tab propia de documentos o si basta un bloque dentro de HR profile como primer consumer
- si los eventos `hr.document.*` tienen consumer real hoy o deben quedar como follow-on en vez de obligación de foundation
