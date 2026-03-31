# TASK-173 - Shared Attachments Platform and GCP Bucket Governance

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Implementación repo lista; bootstrap GCP pendiente`
- Rank: `56`
- Domain: `platform`

## Delta 2026-03-31

- La auditoría contra arquitectura, codebase y PostgreSQL real confirmó que:
  - `leave` es el único consumer HR runtime hoy.
  - `Document Vault` y `Expense Reports` siguen sin runtime y deben nacer sobre esta foundation.
  - `purchase_orders` ya persiste `attachment_url` libre.
  - `payroll_receipts` y `payroll_export_packages` ya persisten `storage_bucket/storage_path`.
- La task deja de leerse como `HR-first` y pasa a leerse como foundation shared para:
  - `leave`
  - `purchase orders`
  - `payroll receipts`
  - `payroll export packages`
  - futuros `Document Vault`, `Expense Reports`, providers y tooling
- Regla de scoping corregida:
  - el registry shared no puede depender solo de `space_id`
  - debe soportar aggregate ownership `space-scoped`, `client-scoped`, `member-scoped` y `period/entry-scoped` según el módulo
- La base real auditada no tiene hoy un registry genérico de `assets/attachments` en PostgreSQL.
- Las tablas activas revisadas (`leave_requests`, `leave_balances`, `payroll_receipts`, `payroll_export_packages`, `purchase_orders`) tampoco exponen FKs físicas declaradas, así que el contrato shared debe validar anchors canónicos desde aplicación y no asumir FK enforcement ya existente.

## Delta 2026-03-31 — implementación en repo y limitación operativa real

- La foundation shared ya quedó implementada en el repo:
  - registry canónico `greenhouse_core.assets`
  - audit trail `greenhouse_core.asset_access_log`
  - helper shared `src/lib/storage/greenhouse-assets.ts`
  - route autenticada `POST /api/assets/private`
  - route autenticada `GET/DELETE /api/assets/private/[assetId]`
  - uploader reusable `src/components/greenhouse/GreenhouseFileUploader.tsx`
  - script de bootstrap `pnpm setup:postgres:shared-assets`
- Primeros consumers ya cortados en código:
  - `leave`
  - `purchase orders`
  - convergencia shared de `payroll receipts`
  - convergencia shared de `payroll export packages`
- Estado real de despliegue:
  - la implementación de repo quedó validada con `tsc`, `lint` y `build`
  - el bootstrap remoto en GCP/Cloud SQL quedó pendiente porque en esta sesión no hubo acceso al secreto `migrator`
  - por lo tanto, la task sigue `in-progress` hasta aplicar `setup:postgres:shared-assets` con credenciales `migrator` y validar smoke autenticado
- Cambio de lectura importante:
  - `leave` ya no depende de `attachmentUrl` manual en el código nuevo
  - `purchase orders` ya no depende solo de `attachment_url` libre
  - `payroll receipts` y `payroll export packages` ya pueden persistir `asset_id`/`pdf_asset_id`/`csv_asset_id` sin romper compatibilidad con `storage_path`

## Delta 2026-03-31 — hotfix remoto de `leave` y estado real en GCP

- El despliegue `develop/staging` quedó temporalmente roto en `HR > Permisos` porque el código ya leía `greenhouse_hr.leave_requests.attachment_asset_id`, pero `shared-assets-platform-v1` seguía sin aplicarse en Cloud SQL.
- Hotfix remoto aplicado con perfil `migrator` usando ADC/GCP:
  - `greenhouse_core.assets`
  - `greenhouse_core.asset_access_log`
  - `greenhouse_hr.leave_requests.attachment_asset_id`
  - FK `greenhouse_leave_requests_attachment_asset_fk`
  - índice `leave_requests_attachment_asset_idx`
  - grants runtime/app/migrator sobre las tablas shared nuevas
- Resultado operativo:
  - `leave` vuelve a quedar compatible con el deploy actual
  - el upload/download privado shared ya tiene foundation suficiente para `leave`
- Estado aún pendiente para cerrar la task completa:
  - `greenhouse_finance.purchase_orders` sigue owned por `postgres`
  - `greenhouse_payroll.payroll_receipts` sigue owned por `postgres`
  - por eso el bootstrap full `pnpm setup:postgres:shared-assets` todavía no puede cerrar `purchase orders` ni `payroll receipts` sin acceso al secreto/owner `postgres`

## Summary

Crear la foundation compartida de adjuntos y archivos de Greenhouse para que `leave`, `purchase orders`, `payroll receipts`, `payroll export packages`, `Document Vault`, `Expense Reports`, proveedores, herramientas y otros módulos compatibles dejen de resolver uploads de forma ad hoc.

La task define el contrato canónico de assets, el patrón UI reusable basado en Vuexy, la gobernanza de buckets en GCP y el path seguro de upload/download autenticado para todo el portal.

## Why This Task Exists

Hoy Greenhouse tiene piezas parciales, pero no una plataforma compartida de archivos:

- `react-dropzone` y `AppReactDropzone` ya existen como patrón UI base.
- `src/lib/storage/greenhouse-media.ts` ya resuelve storage GCS para media operativa, pero está orientado sobre todo a imágenes y paths puntuales.
- `leave` sigue usando `attachmentUrl` manual en vez de un adjunto gestionado por Greenhouse.
- `TASK-027` y `TASK-028` asumen storage y signed URLs desde una óptica HR-first, no como capability shared del portal.
- otros dominios ya consumen storage GCS (`payroll receipts`, export packages), pero con convenciones propias.
- `purchase orders` ya tiene un campo `attachment_url`, pero como URL libre y no como asset gobernado.

Sin una foundation común el riesgo es alto:

- duplicación de uploaders y validaciones
- mezcla de URLs públicas/privadas sin regla canónica
- buckets o paths definidos por módulo en vez de por política de seguridad
- dificultad para auditar acceso, retención y ownership de archivos sensibles

## Goal

- Definir un contrato canónico de assets/attachments reusable por todo Greenhouse.
- Formalizar la topología y gobernanza de buckets GCP para media pública y documentos privados.
- Estandarizar la experiencia de upload sobre el patrón Vuexy existente.
- Cortar `leave` y módulos compatibles a adjuntos gestionados por Greenhouse en vez de `attachmentUrl` arbitrario o `storage_path` aislado por dominio.

## Architectural Decision Locked

- Storage topology aprobada:
  - `public media` por entorno
  - `private assets` por entorno
- Convención recomendada:
  - `${GCP_PROJECT}-greenhouse-public-media-dev`
  - `${GCP_PROJECT}-greenhouse-public-media-staging`
  - `${GCP_PROJECT}-greenhouse-public-media-prod`
  - `${GCP_PROJECT}-greenhouse-private-assets-dev`
  - `${GCP_PROJECT}-greenhouse-private-assets-staging`
  - `${GCP_PROJECT}-greenhouse-private-assets-prod`
- `public media` se usa para:
  - logos
  - avatars
  - assets visuales de baja sensibilidad
- `private assets` se usa para:
  - adjuntos de `leave`
  - `Document Vault`
  - `Expense Reports`
  - payroll receipts
  - payroll export packages
  - respaldos documentales de providers/tooling/finance cuando apliquen
- Download model aprobado:
  - privados entran siempre por control de acceso Greenhouse
  - el servidor puede responder por proxy/stream o emitir signed URL corta
  - no persistir signed URLs como source of truth del dominio
- Contract model aprobado:
  - registry canónico en PostgreSQL
  - bytes en GCS
  - associations por aggregate
- Baseline UI aprobada:
  - `react-dropzone` + `AppReactDropzone`
  - componente shared `GreenhouseFileUploader`
- Primera ola de implementación:
  - `leave`
  - `purchase orders`
  - convergencia shared para `payroll receipts`
  - convergencia shared para `payroll export packages`
- Primeros consumers futuros ya alineados:
  - `TASK-027`
  - `TASK-028`

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
- `Document Vault`, `Expense Reports`, `leave`, `purchase orders` y los consumers documentales de Payroll deben consumir esta capability shared o converger explícitamente hacia ella.
- El isolation boundary del registry se resuelve por aggregate owner:
  - usar `space_id` cuando el agregado sea `space-scoped`
  - usar anchors canónicos `client_id`, `member_id`, `period_id`, `entry_id` u otros IDs del agregado cuando no exista `space_id`
  - no asumir que todo documento compatible del portal es `space-scoped`

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
- purchase orders
- payroll receipts
- payroll export packages
- surfaces de proveedores, tooling y futuros módulos con adjuntos
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
- consumer documental legacy:
  - purchase orders con `attachment_url`
- `leave` ya valida si un tipo requiere adjunto, pero todavía consume `attachmentUrl`

### Gap actual

- no existe un registry compartido de assets/documentos
- no existe una política canónica de bucket topology para público vs privado
- no existe un uploader shared de Greenhouse basado en Vuexy
- no existe un contrato uniforme `upload -> finalize -> attach to aggregate`
- módulos HR siguen describiendo signed URLs/buckets como si fueran foundations propias
- Finance y Payroll siguen resolviendo adjuntos bajo contratos distintos (`attachment_url` libre vs `storage_bucket/storage_path`)
- las tablas runtime activas relevantes no exponen FKs físicas declaradas hacia sus anchors canónicos

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
  - `downloadCount`
  - `lastDownloadedAt`
- Definir el patrón transaccional:
  - `request upload`
  - `upload bytes`
  - `finalize asset`
  - `attach asset to aggregate`

### Slice 2 - Bucket topology y gobernanza GCP

- Implementar la topología ya aprobada:
  - `${GCP_PROJECT}-greenhouse-public-media-{env}`
  - `${GCP_PROJECT}-greenhouse-private-assets-{env}`
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
- signed URLs privadas solo como mecanismo efímero de entrega, no como dato persistido del agregado.
- Trazabilidad mínima:
  - quién subió
  - cuándo
  - a qué aggregate quedó asociado
  - qué actor lo descargó o lo pidió
- Housekeeping mínimo:
  - limpieza de assets `pending/orphaned`
  - lifecycle por retention class

### Slice 5 - Primeros consumers

- `leave`: reemplazar `attachmentUrl` por adjunto gestionado por Greenhouse.
- `purchase orders`: reemplazar `attachment_url` por asset gestionado por Greenhouse.
- `payroll receipts`: converger metadata y delivery sobre el contrato shared sin romper el comportamiento actual.
- `payroll export packages`: converger metadata y delivery sobre el contrato shared sin romper el comportamiento actual.
- `TASK-027 Document Vault`: consumir esta foundation en vez de definir bucket/helper propios.
- `TASK-028 Expense Reports`: receipts sobre el mismo contrato shared.
- dejar a providers y tooling con contrato listo aunque su rollout quede como follow-on.

### Slice 6 - Baseline v1 de tipos y límites

- Tipos de archivo v1 aprobados:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/webp`
- Límites iniciales recomendados:
  - `leave`: hasta 3 archivos, 10 MB por archivo
  - `Document Vault`: 1 archivo por documento lógico, 15 MB
  - `Expense Reports`: múltiples comprobantes, 10 MB por archivo
- No incluir en v1:
  - video
  - audio
  - archivos comprimidos
  - Office docs salvo requerimiento explícito de negocio posterior

## Out of Scope

- migrar en esta misma task todos los archivos históricos ya cargados en GCS o Drive
- OCR, parsing documental o clasificación automática
- DLP/virus scanning enterprise
- CDN transformations de imágenes
- integraciones de ingestión desde Google Drive/Notion como parte del primer slice

## Acceptance Criteria

- [x] Existe una decisión arquitectónica explícita para topología de buckets GCP y gobierno por visibilidad/retención.
- [x] Existe un contrato compartido de `assets/attachments` con registry canónico y associations por aggregate.
- [x] Existe un uploader reusable de Greenhouse basado en el patrón Vuexy actual.
- [x] La decisión deja explícito qué cae en `public media` y qué cae en `private assets`.
- [x] La decisión deja explícito que descargas privadas pasan por control de acceso Greenhouse.
- [x] `leave` deja de depender de `attachmentUrl` manual y consume adjuntos gestionados.
- [x] `purchase orders` deja de depender de `attachment_url` libre y consume adjuntos gestionados.
- [x] `payroll receipts` y `payroll export packages` quedan alineados al contrato shared aunque mantengan sus surfaces actuales.
- [x] `TASK-027` y `TASK-028` quedan actualizadas para consumir la foundation shared en vez de redefinir storage base.
- [x] El path de downloads privados queda autenticado y no depende de exponer URLs permanentes del bucket.
- [ ] Aplicar `pnpm setup:postgres:shared-assets` en GCP/Cloud SQL con perfil `migrator`.
- [ ] Validar smoke manual autenticado de upload/download sobre `leave` y `purchase orders` en `staging`.

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

- Derivar una task de migración/backfill si se decide mover `greenhouse-media` actual a buckets separados por visibilidad.
- Evaluar scanning y retención avanzada como lane aparte si aparecen requisitos legales o enterprise.
- Aplicar el DDL remoto y validar permisos `migrator/runtime` como cierre operativo real de la lane.
