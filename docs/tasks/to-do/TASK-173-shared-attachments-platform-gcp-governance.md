# TASK-173 - Shared Attachments Platform and GCP Bucket Governance

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `56`
- Domain: `platform`

## Summary

Crear la foundation compartida de adjuntos y archivos de Greenhouse para que `leave`, `Document Vault`, `Expense Reports`, proveedores, herramientas y otros módulos dejen de resolver uploads de forma ad hoc.

La task define el contrato canónico de assets, el patrón UI reusable basado en Vuexy, la gobernanza de buckets en GCP y el path seguro de upload/download autenticado para todo el portal.

## Why This Task Exists

Hoy Greenhouse tiene piezas parciales, pero no una plataforma compartida de archivos:

- `react-dropzone` y `AppReactDropzone` ya existen como patrón UI base.
- `src/lib/storage/greenhouse-media.ts` ya resuelve storage GCS para media operativa, pero está orientado sobre todo a imágenes y paths puntuales.
- `leave` sigue usando `attachmentUrl` manual en vez de un adjunto gestionado por Greenhouse.
- `TASK-027` y `TASK-028` asumen storage y signed URLs desde una óptica HR-first, no como capability shared del portal.
- otros dominios ya consumen storage GCS (`payroll receipts`, export packages), pero con convenciones propias.

Sin una foundation común el riesgo es alto:

- duplicación de uploaders y validaciones
- mezcla de URLs públicas/privadas sin regla canónica
- buckets o paths definidos por módulo en vez de por política de seguridad
- dificultad para auditar acceso, retención y ownership de archivos sensibles

## Goal

- Definir un contrato canónico de assets/attachments reusable por todo Greenhouse.
- Formalizar la topología y gobernanza de buckets GCP para media pública y documentos privados.
- Estandarizar la experiencia de upload sobre el patrón Vuexy existente.
- Cortar `leave` y futuros módulos a adjuntos gestionados por Greenhouse en vez de `attachmentUrl` arbitrario.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/tasks/to-do/TASK-027-hris-document-vault.md`
- `docs/tasks/to-do/TASK-028-hris-expense-reports.md`

Reglas obligatorias:

- No dejar módulos de negocio consumiendo URLs externas arbitrarias como contrato principal.
- Los bytes viven en GCS; la gobernanza, metadatos, ownership y associations viven en PostgreSQL.
- La UX debe reutilizar el patrón base `react-dropzone` + `AppReactDropzone`, no inventar otro uploader.
- Los documentos sensibles no se exponen por bucket público ni por links permanentes sin autorización.
- La topología de buckets debe ser pequeña y gobernable; evitar un bucket por módulo salvo necesidad regulatoria real.
- `Document Vault`, `Expense Reports` y `leave` deben consumir esta capability shared, no redefinir la foundation.

## Dependencies & Impact

### Depends on

- `src/lib/storage/greenhouse-media.ts`
- baseline WIF/OIDC + GCP auth canónica ya materializada en el repo
- `react-dropzone` + `src/libs/styles/AppReactDropzone.ts`
- capacidad PostgreSQL para registry canónico de assets/attachments

### Impacts to

- `TASK-170` Leave Request & Approval Flow
- `TASK-027` HRIS Document Vault
- `TASK-028` HRIS Expense Reports
- surfaces de proveedores, tooling, purchase orders y futuros módulos con adjuntos
- `CSP`/uploads (`TASK-126`) por dominios y paths que deben permanecer compatibles

### Files owned

- `src/components/greenhouse/GreenhouseFileUploader.tsx`
- `src/lib/storage/greenhouse-assets.ts`
- `src/app/api/**/uploads/**`
- `src/app/api/**/attachments/**`
- `scripts/setup-postgres-*.sql` para registry de assets
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`

## Current Repo State

### Ya existe

- `react-dropzone` instalado y wrapper visual Vuexy:
  - `src/libs/styles/AppReactDropzone.ts`
- patrón de ejemplo en `full-version`:
  - `full-version/src/views/apps/ecommerce/products/add/ProductImage.tsx`
- helper GCS ya operativo:
  - `src/lib/storage/greenhouse-media.ts`
- consumers reales de storage:
  - logos/avatars
  - payroll receipts
  - payroll export packages
- `leave` ya valida si un tipo requiere adjunto, pero todavía consume `attachmentUrl`

### Gap actual

- no existe un registry compartido de assets/documentos
- no existe una política canónica de bucket topology para público vs privado
- no existe un uploader shared de Greenhouse basado en Vuexy
- no existe un contrato uniforme `upload -> finalize -> attach to aggregate`
- módulos HR siguen describiendo signed URLs/buckets como si fueran foundations propias

## Scope

### Slice 1 - Asset contract canónico

- Definir `asset`/`attachment` como capability shared y no como subproducto HR.
- Modelar metadata mínima:
  - `assetId`
  - `storageBucket`
  - `objectPath`
  - `filename`
  - `mimeType`
  - `sizeBytes`
  - `visibility`
  - `retentionClass`
  - `uploadedBy`
  - `ownerAggregateType`
  - `ownerAggregateId`
  - `status` (`pending`, `attached`, `orphaned`, `deleted`)
- Definir el patrón transaccional:
  - `request upload`
  - `upload bytes`
  - `finalize asset`
  - `attach asset to aggregate`

### Slice 2 - Bucket topology y gobernanza GCP

- Formalizar la recomendación base:
  - `greenhouse-public-media` para assets públicos o casi públicos como logos/avatars
  - `greenhouse-private-assets` para documentos privados, receipts, respaldos y adjuntos operativos
- Evitar un bucket por módulo como baseline.
- Gobernar por prefixes y políticas:
  - `leave/`
  - `hr-documents/`
  - `expense-reports/`
  - `payroll-receipts/`
  - `providers/`
  - `tooling/`
- Definir IAM, lifecycle, retención, versionado y acceso por entorno.
- Dejar explícito cuándo sí justificar un tercer bucket:
  - compliance/retención especial
  - archival cold storage
  - separación regulatoria fuerte

### Slice 3 - Uploader shared basado en Vuexy

- Crear `GreenhouseFileUploader` sobre `react-dropzone` + `AppReactDropzone`.
- Soportar:
  - drag & drop
  - selector de archivos
  - lista/remoción local
  - validaciones de tipo/tamaño/cantidad
  - estados `idle/uploading/success/error`
  - microcopy consistente en español
- No duplicar el demo de Vuexy por módulo.

### Slice 4 - Security + access model

- Upload sin exponer credenciales GCP al browser.
- Download siempre mediado por autorización Greenhouse para assets privados.
- Compatibilidad con WIF/connector baseline actual.
- Trazabilidad mínima:
  - quién subió
  - cuándo
  - a qué aggregate quedó asociado
  - qué actor lo descargó o lo pidió

### Slice 5 - Primeros consumers

- `leave`: reemplazar `attachmentUrl` por adjunto gestionado por Greenhouse.
- `TASK-027 Document Vault`: consumir esta foundation en vez de definir bucket/helper propios.
- `TASK-028 Expense Reports`: receipts sobre el mismo contrato shared.
- dejar a proveedores, tooling y purchase orders con contrato listo aunque su rollout quede como follow-on.

## Out of Scope

- migrar en esta misma task todos los archivos históricos ya cargados en GCS o Drive
- OCR, parsing documental o clasificación automática
- DLP/virus scanning enterprise
- CDN transformations de imágenes
- integraciones de ingestión desde Google Drive/Notion como parte del primer slice

## Acceptance Criteria

- [ ] Existe una decisión arquitectónica explícita para topología de buckets GCP y gobierno por visibilidad/retención.
- [ ] Existe un contrato compartido de `assets/attachments` con registry canónico y associations por aggregate.
- [ ] Existe un uploader reusable de Greenhouse basado en el patrón Vuexy actual.
- [ ] `leave` deja de depender de `attachmentUrl` manual y consume adjuntos gestionados.
- [ ] `TASK-027` y `TASK-028` quedan actualizadas para consumir la foundation shared en vez de redefinir storage base.
- [ ] El path de downloads privados queda autenticado y no depende de exponer URLs permanentes del bucket.

## Verification

- `pnpm exec eslint` sobre uploader shared, storage helpers y routes nuevas
- `pnpm exec vitest run` sobre contract tests de storage/assets y componentes UI
- smoke manual en `staging`:
  - upload exitoso
  - validación de tipo/tamaño
  - descarga autorizada
  - rechazo de acceso cuando no corresponde

## Opinionated Baseline

La recomendación base para Greenhouse es usar dos buckets principales y no uno por módulo:

- `public media`
  - logos, avatars y assets de baja sensibilidad
- `private assets`
  - adjuntos operativos, documentos HR, receipts, payroll PDFs y respaldos

Esto da el mejor equilibrio entre seguridad, gobernanza y simplicidad operativa. La separación por módulo debe vivir primero en prefixes, metadata y authorization, no en proliferación de buckets.

## Follow-ups

- Actualizar arquitectura cloud/security cuando la decisión de bucket topology quede aprobada.
- Derivar una task de migración/backfill si se decide mover `greenhouse-media` actual a buckets separados por visibilidad.
- Evaluar scanning y retención avanzada como lane aparte si aparecen requisitos legales o enterprise.
