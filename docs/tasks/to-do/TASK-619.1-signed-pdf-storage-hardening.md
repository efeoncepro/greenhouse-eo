# TASK-619.1 — Signed PDF Storage Hardening (bucket separado + retention 10 anos + multi-region)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo` (~1.5 dias)
- Type: `infrastructure`
- Epic: `EPIC-001`
- Status real: `Diseno cerrado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-619.1-signed-pdf-storage-hardening`
- Legacy ID: `RESEARCH-005 P2.1 follow-up`
- GitHub Issue: `none`

## Summary

Provisionar bucket GCS dedicado (`signed-documents-{env}`) con configuracion legal-grade para PDFs firmados: retention policy 10 anos (cubre todos los paises LATAM), object versioning, replicacion cross-region (us-east4 → us-central1) para disaster recovery, y prefix por tipo de aggregate documental (`/quotes/`, `/msa/`, `/hr-contracts/`, etc.).

Separa los PDFs firmados (artefactos legales inmutables) del bucket de PDFs cacheables actuales (`private-assets-{env}`) que tiene lifecycle de DELETE a 730 dias.

## Why This Task Exists

Hoy `private-assets-{env}` tiene lifecycle agresivo (NEARLINE 90d → COLDLINE 180d → DELETE 730d) optimizado para PDFs cacheables que se regeneran. Esa policy es **incompatible con PDFs firmados**, que deben conservarse:

- **Chile (SII)**: 6 anos (Art. 17 Codigo Tributario)
- **Colombia**: 10 anos
- **Mexico (CFF Art. 30)**: 5 anos
- **Peru**: 5 anos
- **Brasil**: 5 anos

10 anos cubre el peor caso. Sin esto, un PDF firmado borrado a los 2 anos por lifecycle automatico = perdida de evidencia legal en disputa fiscal.

Adicionalmente, un PDF firmado es un artefacto legal: necesita defense-in-depth (object versioning + replicacion multi-region) por si hay corruption, eliminacion accidental, o disaster regional.

## Goal

- Bucket nuevo `signed-documents-{dev,staging,prod}` en `us-east4`
- Object Versioning habilitado (recupera versiones eliminadas)
- Retention policy 10 anos (`bucketPolicyOnly` + `retentionPolicy.retentionPeriod=315360000`)
- Lifecycle rule: NINGUNA delete (override del default 730d)
- Replication cross-region: `us-east4 → us-central1` via Storage Transfer Service o Cloud Storage replication
- Prefix structure: `/quotes/{quotationId}/v{versionNumber}/`, `/msa/{msaId}/`, `/hr-contracts/{contractId}/` para multi-domain
- IAM: solo SAs especificos (greenhouse-portal, greenhouse-ops-worker) tienen write; portal user tiene read via signed URLs temporales

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- bucket inmutable: lifecycle NO debe permitir DELETE automatico
- replicacion cross-region testeada con failover simulado
- IAM bindings explicitos, no usar `allUsers`
- secret rotation no afecta acceso (SAs con WIF)

## Dependencies & Impact

### Depends on

- IAM permissions del SA `greenhouse-portal` y `greenhouse-ops-worker` (ya existen)
- gcloud CLI authenticated con admin que pueda crear buckets

### Blocks / Impacts

- `TASK-619` (Quote eSignature) — consumer principal, requiere bucket existente
- `TASK-027` (HRIS Document Vault) — consumer hermano (HR contracts firmados)
- `TASK-491` (ZapSign adapter) — escribe los PDFs descargados aqui

### Files owned

- `infra/gcp/signed-documents-bucket-config.json` (nuevo, documenta config)
- `services/ops-worker/src/storage/signed-documents-client.ts` (nuevo)
- `src/lib/storage/signed-documents.ts` (nuevo, write+read APIs)
- `docs/operations/runbooks/signed-documents-disaster-recovery.md` (nuevo)

## Scope

### Slice 1 — Bucket provisioning (0.5 dia)

```bash
# Por cada env (dev, staging, prod):
gcloud storage buckets create gs://efeonce-group-greenhouse-signed-documents-${ENV} \
  --location=us-east4 \
  --uniform-bucket-level-access \
  --enable-hierarchical-namespace=false \
  --public-access-prevention=enforced

# Object versioning
gcloud storage buckets update gs://efeonce-group-greenhouse-signed-documents-${ENV} \
  --versioning

# Retention policy 10 anos (315,360,000 segundos)
gcloud storage buckets update gs://efeonce-group-greenhouse-signed-documents-${ENV} \
  --retention-period=315360000s

# Lifecycle: explicitamente vacio (no delete)
echo '{"rule":[]}' > /tmp/no-lifecycle.json
gcloud storage buckets update gs://efeonce-group-greenhouse-signed-documents-${ENV} \
  --lifecycle-file=/tmp/no-lifecycle.json
```

**Importante:** una vez aplicada retention policy, NO se puede reducir mientras haya objetos con retention activa. Validar 10 anos es correcto antes de aplicar.

### Slice 2 — Replicacion cross-region (0.5 dia)

Storage Transfer Service con replicacion incremental:

```bash
gcloud transfer jobs create \
  gs://efeonce-group-greenhouse-signed-documents-${ENV} \
  gs://efeonce-group-greenhouse-signed-documents-${ENV}-replica \
  --source-creds-file=... \
  --schedule-starts=... \
  --schedule-repeats-every=1h \
  --description="Hourly replica us-east4 → us-central1"
```

Bucket replica en `us-central1` con misma config.

### Slice 3 — IAM bindings (0.25 dia)

```bash
# greenhouse-portal SA: write only (uploads via API webhook)
gcloud storage buckets add-iam-policy-binding gs://...signed-documents-${ENV} \
  --member=serviceAccount:greenhouse-portal@efeonce-group.iam.gserviceaccount.com \
  --role=roles/storage.objectCreator

# greenhouse-ops-worker SA: read+write (reconciliation worker)
gcloud storage buckets add-iam-policy-binding gs://...signed-documents-${ENV} \
  --member=serviceAccount:greenhouse-ops-worker@efeonce-group.iam.gserviceaccount.com \
  --role=roles/storage.objectAdmin

# NO public access. Read via signed URLs generadas server-side.
```

### Slice 4 — Library API (0.25 dia)

`src/lib/storage/signed-documents.ts`:

- `uploadSignedDocument({aggregateType, aggregateId, versionNumber, bytes, mimeType, sha256, sha512, providerEvent})` — sube + persiste hashes en metadata
- `getSignedDocumentSignedUrl({aggregateType, aggregateId, versionNumber, expiresInSeconds = 300})` — devuelve signed URL temporal
- `getSignedDocumentMetadata({aggregateType, aggregateId, versionNumber})` — devuelve hashes + timestamps + provider event id
- Helpers: `buildObjectPath(aggregateType, aggregateId, versionNumber)` con convencion `/quotes/QT-123/v3/signed.pdf`

### Slice 5 — Runbook DR (0.25 dia)

`docs/operations/runbooks/signed-documents-disaster-recovery.md`:

- Como detectar perdida de bucket primario
- Como failover a bucket replica
- Como verificar integridad post-failover (re-compute SHA-256)
- Quien autoriza failover (Finance Admin + DevOps lead)

## Out of Scope

- Replicacion cross-cloud (S3, Azure Blob) — revisar en 12 meses
- Cifrado con CMEK customer-managed keys — usar default Google-managed
- Object Lock WORM mode — retention policy + versioning suficiente para LATAM compliance

## Acceptance Criteria

- [ ] 6 buckets creados (3 envs × 2 regions: us-east4 primary + us-central1 replica)
- [ ] retention policy 10 anos aplicada en los 6 buckets
- [ ] object versioning enabled en los 6 buckets
- [ ] replicacion us-east4 → us-central1 corriendo cada 1h en los 3 envs
- [ ] IAM bindings: solo greenhouse-portal (write) + ops-worker (read+write); NO public
- [ ] library API funcional con tests unitarios
- [ ] runbook DR escrito + validado con failover simulado en dev
- [ ] documentacion actualizada en GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md

## Verification

- `gcloud storage buckets describe gs://...signed-documents-prod` muestra retention 10y + versioning
- Upload de prueba en dev → verifica metadata + signed URL funciona
- Eliminacion de objeto en dev → recuperable via versioned listing
- Replica en us-central1 tiene el mismo objeto en < 1h post-upload

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con bucket names + cost estimate
- [ ] `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` actualizado seccion "Storage Buckets"
- [ ] `docs/operations/runbooks/signed-documents-disaster-recovery.md` creado y commiteado
