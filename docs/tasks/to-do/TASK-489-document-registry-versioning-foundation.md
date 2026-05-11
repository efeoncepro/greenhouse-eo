# TASK-489 — Document Registry & Versioning Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseño hardened — listo para ejecución`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-489-document-registry-versioning-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

---

## Delta 2026-05-11 V2.1 — `document_kind` ortogonal (`native` vs `linked`) — incluye finiquito como type V1

Pregunta del usuario revelaba un gap: el finiquito (TASK-862/863) tiene state machine de 9 estados propio en `greenhouse_payroll.final_settlement_documents`. ¿Debe ser un `document_type` del registry o queda fuera?

**Decisión canónica V2.1**: introducir dimensión ortogonal `documents.kind ENUM ('native' | 'linked')`:

- **`kind = 'native'`** — SSOT vive en `documents` + `document_versions`. State machine propio del registry (5 estados). Caso V1: contratos, NDAs, licencias, identity_scan.
- **`kind = 'linked'`** — SSOT vive en otro aggregate. `documents` row es **proxy/surface/index** para listings + audit + retention; el state real refleja el del aggregate dueño via reactive consumer del outbox event del dueño. Caso V1: finiquito (`final_settlement_documents`); futuras: `person_identity_documents`, `member_certifications`, `member_evidence`.

**Beneficios canónicos**:

1. **Mental model uniforme**: `/my/documents` lista TODO (contratos + finiquitos + identity_scans) sin lógica especial UI-side; el reader hace JOIN+UNION ya canonizado en el registry.
2. **SSOT preservado**: el aggregate dueño (TASK-863 final_settlement_documents) NO se migra ni pierde verticalidad. Registry es **surface layer**, NO authoritative store.
3. **Reactive sync**: outbox event del aggregate dueño dispara update del proxy row (no double-write inline).
4. **Late binding extensible**: V2 puede agregar `member_certifications` + `member_evidence` + `person_identity_documents` como linked types sin schema migration adicional (solo seed entries + consumers).
5. **Retention + capability uniformes**: el registry centraliza retention policy + capabilities granulares; el aggregate dueño hereda automáticamente sin re-implementar.

**Implicaciones de schema** (refinement sobre el DDL skeleton V2):

```sql
ALTER TABLE greenhouse_core.documents
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'native',
  ADD COLUMN linked_aggregate_table TEXT,
  ADD COLUMN linked_aggregate_id TEXT,
  ADD CONSTRAINT documents_kind_check
    CHECK (kind IN ('native', 'linked')),
  ADD CONSTRAINT documents_linked_invariant
    CHECK ((kind = 'native' AND linked_aggregate_table IS NULL AND linked_aggregate_id IS NULL)
        OR (kind = 'linked' AND linked_aggregate_table IS NOT NULL AND linked_aggregate_id IS NOT NULL));

-- For linked docs, current_version_id puede ser NULL (no version propio).
-- El proxy refleja el último estado del aggregate dueño.
ALTER TABLE greenhouse_core.documents
  DROP CONSTRAINT documents_current_version_fk;

ALTER TABLE greenhouse_core.documents
  ADD CONSTRAINT documents_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES greenhouse_core.document_versions(document_version_id)
  DEFERRABLE INITIALLY DEFERRED;

-- linked_aggregate_table es enum cerrado para evitar polymorphic FK loose.
ALTER TABLE greenhouse_core.documents
  ADD CONSTRAINT documents_linked_aggregate_table_check
  CHECK (linked_aggregate_table IS NULL OR linked_aggregate_table IN (
    'greenhouse_payroll.final_settlement_documents',
    'greenhouse_core.person_identity_documents',
    'greenhouse_core.member_certifications',
    'greenhouse_core.member_evidence'
  ));

-- Bridge dedicado para finiquitos (V1 incluye este, mantiene FK strict):
CREATE TABLE greenhouse_core.document_final_settlement_link (
  document_id                   TEXT PRIMARY KEY REFERENCES greenhouse_core.documents(document_id) ON DELETE RESTRICT,
  final_settlement_document_id  TEXT NOT NULL UNIQUE REFERENCES greenhouse_payroll.final_settlement_documents(final_settlement_document_id) ON DELETE RESTRICT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id            TEXT NOT NULL
);
```

**document_type V1 set actualizado (6 native + 1 linked = 7 types)**:

```sql
-- 6 native types (kind='native' en el INSERT del documents row):
INSERT INTO greenhouse_core.document_type_catalog VALUES
  ('labor_contract',     'Contrato de trabajo',            ...),
  ('labor_addendum',     'Anexo de contrato',              ...),
  ('nda',                'Acuerdo de confidencialidad',    ...),
  ('medical_certificate','Licencia médica',                ...),
  ('identity_scan',      'Documento de identidad escaneado',...),
  ('compliance_other',   'Documento de compliance (otro)', ...);

-- 1 linked type V1 (kind='linked' al crear row, apunta a aggregate dueño):
INSERT INTO greenhouse_core.document_type_catalog VALUES
  ('final_settlement', 'Finiquito laboral', 'Final settlement (severance)',
   'hr', 'labor_contract', 5, 'reveal_required', FALSE, FALSE,
   'documents.read_masked', NULL);
```

`final_settlement` hereda retention `labor_contract` (5 años post-término) + `reveal_required` (confidencial por contener montos + datos sensibles) + `versionable=FALSE` (cada finiquito es único per case; supersedes via TASK-863 reissue, NO via registry versions) + `self_service_allowed=FALSE` (el operador HR es quien lo emite, NO el colaborador).

**Reactive sync canónico**: outbox event `payroll.final_settlement_document.lifecycle_changed` (TASK-863) dispara reactive consumer `documentRegistryLinkedDocumentSyncProjection`:

```ts
// src/lib/sync/projections/document-registry-linked-sync.ts
const documentRegistryLinkedDocumentSyncProjection: ProjectionDefinition = {
  name: 'document_registry_linked_sync',
  triggerEvents: [
    'payroll.final_settlement_document.created.v1',
    'payroll.final_settlement_document.lifecycle_changed.v1',
    'payroll.final_settlement_document.superseded.v1'
  ],
  extractScope: (event) => ({ finalSettlementDocumentId: event.payload.documentId }),
  refresh: async ({finalSettlementDocumentId}) => {
    // 1. Re-read final_settlement_document de PG
    // 2. UPSERT documents row (kind='linked', linked_aggregate_table='greenhouse_payroll.final_settlement_documents', linked_aggregate_id=finalSettlementDocumentId)
    // 3. UPSERT bridge document_final_settlement_link
    // 4. UPSERT bridge document_member_link (member_id desde finiquito)
    // 5. Map TASK-863 state → registry verification_status (rendered/in_review/approved → pending_review, issued/signed_or_ratified → verified, voided/rejected/superseded → archived/superseded)
    // 6. INSERT INTO document_verification_audit_log (proxy sync trace)
  },
  maxRetries: 5
}
```

**Helper canónico nuevo**:

```ts
// src/lib/documents/link-aggregate.ts
export const linkAggregateDocument = async (input: {
  kind: 'final_settlement_document' | 'person_identity_document' | 'member_certification' | 'member_evidence'
  aggregateId: string
  documentType: DocumentTypeKey  // e.g. 'final_settlement'
  tenantKind: 'efeonce_internal' | 'client'
  tenantSpaceId?: string
  title: string
  memberId?: string  // for member-linked aggregates
  expiresAt?: string
  initialVerificationStatus: DocumentVerificationStatus
  createdByUserId: string
}, client?: PoolClient): Promise<Document>
```

**Status state mapping (linked aggregates → registry)**:

| Aggregate state (final_settlement) | Registry verification_status |
| --- | --- |
| `rendered`, `in_review`, `approved` | `pending_review` |
| `issued`, `signed_or_ratified` | `verified` |
| `rejected`, `voided` | `archived` (with reason) |
| `superseded` | `superseded` |

El registry NO duplica el state machine completo del aggregate; abstrae 5 estados canonical que sirven al consumer cross-domain (operador HR ve "verificado" = doc usable; "archivado" = doc terminal; "pendiente" = doc en proceso).

**Hard rules actualizadas**:

- **NUNCA** mutar `documents.verification_status` para `kind='linked'` rows directamente. La mutation viene SOLO del reactive consumer cuando el aggregate dueño cambia. Bypass = drift + audit log incompleto.
- **NUNCA** crear `documents` row con `kind='linked'` sin pasar por `linkAggregateDocument` helper. El helper enforce el invariant CHECK + persiste bridge + idempotent re-call.
- **NUNCA** crear `document_versions` para `kind='linked'` docs. Las versions viven en el aggregate dueño (`final_settlement_documents.pdf_asset_id` con auto-regen TASK-863).
- **NUNCA** referenciar `linked_aggregate_id` sin verificar que existe en `linked_aggregate_table`. CHECK constraint del enum cerrado + reactive consumer detecta orphans.
- **SIEMPRE** que un aggregate nuevo emerja como candidato a linked, agregarlo a: (a) `linked_aggregate_table` CHECK enum, (b) `document_<aggregate>_link` bridge dedicado con UNIQUE constraint, (c) reactive consumer en `link-aggregate-sync.ts`, (d) seed entry en `document_type_catalog`.

**Total tables V2.1**: 9 tables (era 8 en V2: agregamos `document_final_settlement_link` como bridge dedicado V1).

**Total document_types V1**: 7 (6 native + 1 linked).

**Total bridges V1**: 4 (member_link, organization_link, client_link, final_settlement_link).

**Total reliability signals**: 6 (era 5; agregamos `documents.linked_aggregate_sync_lag` para detectar drift entre aggregate dueño y proxy registry).

**Scope impact**: Slice 0 (architecture spec) + Slice 1 (migration) + Slice 3 (reactive consumer + 6th signal) reciben este refinement. Slice 2 (helpers) agrega `linkAggregateDocument`. Effort estimate sube de ~17-24h total a ~22-30h.

---

## Delta 2026-05-11 V2 — Full hardening (all open questions resolved + DDL skeleton + 4-pillar score)

Skill `arch-architect` (Greenhouse overlay) consolidó el Delta 2026-05-11 V1 (8 gaps identificados) en un spec completamente implementable. **6 open questions resueltas explícitamente** (ver sección "Decisions Resolved"). DDL skeleton inline + helper signatures TS + state machine + outbox events v1 + reliability signals + capabilities granulares + 4-pillar score requirement.

**Patrones canónicos fuente replicados verbatim**:

- `greenhouse_core.person_identity_documents` (TASK-784) → verification_status enum + invariants CHECK + evidence_asset_id pattern + reveal helper + masking server-side.
- `greenhouse_payroll.final_settlement_documents` (TASK-862/863) → state machine + helper canónico per transition + matriz declarativa de presentación per status + 7-layer defense.
- `greenhouse_core.assets` + `assets_access_log` (TASK-721) → append-only audit + retention_class + dedup por content_hash.
- `payment_order_state_transitions` (TASK-765) → append-only state machine audit con anti-UPDATE/DELETE trigger + state machine + CHECK + audit trio.
- `home_rollout_flags` (TASK-780) → catalog table con CHECK constraint + reliability signal de drift.

---

## Delta 2026-05-11 V1 — Arch review inicial (8 gaps identificados)

Skill `arch-architect` (Greenhouse overlay) revisó la spec aplicando patrones canonizados después de la creación de esta task. 8 gaps identificados:

1. Source entity = tabla bridge per kind, NO polymorphic FK.
2. Frontera con `person_identity_documents` (TASK-784) debe quedar declarada.
3. `verification_status` state machine completa con CHECK + audit + helper canónico.
4. Outbox events completos + v1 explícito (9 eventos canónicos).
5. Retention classes catalog para documents.
6. Reliability signals (5) declarados desde spec.
7. Tenant-safety pattern explícito (reader filter automático).
8. Multi-version + supersede pattern (immutable, NO delete+reinsert).

V2 (esta sección de arriba) consolida estos 8 gaps + resuelve 6 open questions + agrega DDL inline.

---

## Summary

Crear la foundation canónica del dominio documental de Greenhouse: documento, versión, clasificación, vínculo con assets privados, bridges a canonical 360 objects y metadatos completos de lifecycle. Esta task fija el contrato reusable antes de conectar HR (TASK-494), MSA/SOW (TASK-495), signature orchestration (TASK-490/491), document manager UI (TASK-492) o template rendering (TASK-493).

## Why This Task Exists

Hoy existe storage privado reusable (`greenhouse_core.assets`) pero no existe un agregado documental transversal. Eso obliga a cada módulo a modelar "su documento" con campos propios, estados incompatibles, links efímeros y reglas de retención dispersas. Antes de firma, UI o rendering, Greenhouse necesita una capa documental estable.

El bug class real: sin foundation, TASK-494 + TASK-495 + TASK-490 + TASK-493 inventan **4 mini-document-managers paralelos** con state machines incompatibles, retention policies inconsistentes y bridges polymorphic frágiles. Pattern fuente reciente que evita esto: TASK-863 (final_settlement_documents) ya muestra cómo una vertical aislada necesitó re-canonizar lifecycle a la fuerza.

## Goal

- Introducir el registry documental canónico + versionado del repo en `greenhouse_core.documents` + `document_versions` + `document_type_catalog`.
- Reusar `greenhouse_core.assets` como foundation binaria sin duplicar storage.
- Permitir que futuros dominios anclen documentos a colaboradores, clientes, organizaciones (y futuros: services, MSAs, etc.) **vía tablas bridge per kind**, NO polymorphic FK.
- Resolver SSOT explícita vs dominios adjacentes (`person_identity_documents`, `final_settlement_documents`, `member_certifications`, `member_evidence`).

## Architecture Alignment

Specs canónicas que esta task respeta:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (lifecycle pattern fuente)

Reglas obligatorias:

- El binario sigue viviendo en GCS + `greenhouse_core.assets`; el registry documental NO duplica blobs.
- Cada reader/writer debe ser tenant-safe via `tenant_kind` enum + reader filter automático.
- `context_documents` (sidecar AI metadata) NO reemplaza el SSOT transaccional del documento.
- IDs y nombres siguen convenciones canónicas: `document_id` opaque UUID + `public_id` human-friendly `EO-DOC-NNNNNN`.

## Decisions Resolved (6 open questions from arch review)

| # | Question | Decision | Rationale |
| --- | --- | --- | --- |
| 1 | Schema namespace: `greenhouse_core` vs `greenhouse_hr` | **`greenhouse_core.documents`** | Registry transversal HR + Finance/Legal + futuros. HR-specific lives in TASK-494 surfaces consumiendo este foundation. |
| 2 | `document_type` V1 set | **6 types**: `labor_contract`, `labor_addendum`, `nda`, `medical_certificate`, `identity_scan`, `compliance_other` | Mínimo viable para TASK-494 HR vault. Finance/Legal types (`msa`, `sow`, `work_order`) entran con TASK-495 (no V1). |
| 3 | Bridge tables V1 | **3 bridges**: `document_member_link`, `document_organization_link`, `document_client_link` | Cubre HR (member-centric) + MSA preview (organization/client). Bridges para `service`, `final_settlement_document`, `person_identity_document` se agregan late binding cuando emerja consumer. YAGNI. |
| 4 | ID conventions | **Dual**: `document_id` opaque UUID (`doc-<uuid>`) + `public_id` human-friendly auto-incrementado (`EO-DOC-000001`) | Pattern fuente: `greenhouse_context.context_documents` (TASK-413). Opaque UUID estable para FKs, public_id legible para humanos. |
| 5 | Naming "Colaborador 360" en surfaces | **Routes existentes**: `/people/[memberId]` route group preservado. **Copy canónico**: "Colaborador" (es-CL) per `greenhouse-nomenclature.ts`. **Schema column**: `member_id` referencia `greenhouse.team_members` (canónico). | TASK-494 hereda esta convención. TASK-789 future i18n alineará rotas si emerge inglés. |
| 6 | Real-Artifact Verification Loop applicability | **NO V1** (no hay UI todavía, solo schema). Live PG test sí required (live.test.ts). | El loop V1 (TASK-863) aplica a docs visuales emitidos a humanos externos. TASK-489 es foundation backend. TASK-492/494 sí aplican el loop cuando emerjan UI. |

Open questions adicionales (ambigüedades) detectadas en el review:

| Ambigüedad | Decisión |
| --- | --- |
| `document` vs `document_version` cardinalidad | Catalog table `document_type_catalog.versionable BOOLEAN`. Si `true`, nuevas versiones via supersede en mismo `document_id`. Si `false`, cada upload = nuevo `document_id`. |
| `document_type` storage (enum vs catalog) | **Catalog table** `greenhouse_core.document_type_catalog`. Razón: necesita 5 campos metadata per type (retention_class, confidentiality_kind, versionable, self_service_allowed, required_capability). |
| Idempotency key | `documents.idempotency_key TEXT UNIQUE`. Caller provee key; helper detecta duplicate y retorna existing row sin crear. |
| Asset attach atomicity | Helper canónico `createDocumentWithVersion(input, client?)` envuelve INSERT documents + INSERT document_versions + UPDATE current_version_id + attachAssetToAggregate + INSERT bridges + INSERT outbox event en una sola tx PG. |
| `current_version_id` FK direction | `documents.current_version_id` FK forward a `document_versions.document_version_id`, DEFERRABLE INITIALLY DEFERRED. Resolved post-INSERT mismo tx. |

## Schema Design — DDL skeleton canónico

DDL completo del registry documental V1. Se ejecuta en Slice 1 vía `pnpm migrate:create task-489-document-registry-foundation`.

### 1. `document_type_catalog` (catalog table)

```sql
CREATE TABLE greenhouse_core.document_type_catalog (
  document_type            TEXT PRIMARY KEY,
  display_label_es_cl      TEXT NOT NULL,
  display_label_en_us      TEXT NOT NULL,
  module                   TEXT NOT NULL,
  retention_class          TEXT NOT NULL,
  retention_years_default  INTEGER NOT NULL,
  confidentiality_kind     TEXT NOT NULL,
  versionable              BOOLEAN NOT NULL DEFAULT TRUE,
  self_service_allowed     BOOLEAN NOT NULL DEFAULT FALSE,
  required_capability      TEXT,
  deprecated_at            TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT document_type_catalog_module_check
    CHECK (module IN ('hr', 'finance', 'legal', 'compliance', 'platform')),
  CONSTRAINT document_type_catalog_confidentiality_check
    CHECK (confidentiality_kind IN ('public_within_tenant', 'masked_default', 'reveal_required')),
  CONSTRAINT document_type_catalog_retention_class_check
    CHECK (retention_class IN (
      'labor_contract', 'labor_addendum', 'medical_record', 'nda',
      'msa', 'sow', 'work_order', 'compliance_other',
      'regulatory_proof', 'identity_scan'
    )),
  CONSTRAINT document_type_catalog_retention_years_positive
    CHECK (retention_years_default > 0)
);
```

**V1 seed**:

```sql
INSERT INTO greenhouse_core.document_type_catalog
  (document_type, display_label_es_cl, display_label_en_us, module, retention_class, retention_years_default, confidentiality_kind, versionable, self_service_allowed, required_capability)
VALUES
  ('labor_contract',     'Contrato de trabajo',            'Employment contract',        'hr', 'labor_contract',     5,  'masked_default',    TRUE,  FALSE, 'documents.upload'),
  ('labor_addendum',     'Anexo de contrato',              'Contract addendum',          'hr', 'labor_addendum',     5,  'masked_default',    TRUE,  FALSE, 'documents.upload'),
  ('nda',                'Acuerdo de confidencialidad',    'NDA',                        'hr', 'nda',                5,  'reveal_required',   TRUE,  FALSE, 'documents.upload'),
  ('medical_certificate','Licencia médica',                'Medical certificate',        'hr', 'medical_record',     10, 'reveal_required',   FALSE, TRUE,  'documents.upload'),
  ('identity_scan',      'Documento de identidad escaneado','Identity document scan',    'hr', 'identity_scan',      7,  'masked_default',    FALSE, TRUE,  'documents.upload'),
  ('compliance_other',   'Documento de compliance (otro)', 'Compliance document (other)','compliance', 'compliance_other', 7, 'masked_default', TRUE,  FALSE, 'documents.upload');
```

### 2. `documents` (aggregate root)

```sql
CREATE TABLE greenhouse_core.documents (
  document_id              TEXT PRIMARY KEY,
  public_id                TEXT NOT NULL UNIQUE,
  document_type            TEXT NOT NULL REFERENCES greenhouse_core.document_type_catalog(document_type) ON DELETE RESTRICT,
  tenant_kind              TEXT NOT NULL,
  tenant_space_id          TEXT REFERENCES greenhouse_core.spaces(space_id) ON DELETE RESTRICT,
  title                    TEXT NOT NULL,
  description              TEXT,
  current_version_id       TEXT,
  verification_status      TEXT NOT NULL DEFAULT 'pending_review',
  is_archived              BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at              TIMESTAMPTZ,
  archived_by_user_id      TEXT,
  archive_reason           TEXT,
  expires_at               DATE,
  retention_expires_at     DATE,
  idempotency_key          TEXT UNIQUE,
  created_by_user_id       TEXT NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT documents_tenant_kind_check
    CHECK (tenant_kind IN ('efeonce_internal', 'client')),
  CONSTRAINT documents_verification_status_check
    CHECK (verification_status IN ('pending_review', 'verified', 'rejected', 'archived', 'superseded')),
  CONSTRAINT documents_archive_invariant
    CHECK ((is_archived = FALSE)
        OR (archived_at IS NOT NULL AND archived_by_user_id IS NOT NULL AND archive_reason IS NOT NULL)),
  CONSTRAINT documents_tenant_space_invariant
    CHECK ((tenant_kind = 'efeonce_internal' AND tenant_space_id IS NULL)
        OR (tenant_kind = 'client' AND tenant_space_id IS NOT NULL)),
  CONSTRAINT documents_title_nonempty
    CHECK (length(btrim(title)) > 0),
  CONSTRAINT documents_public_id_format
    CHECK (public_id ~ '^EO-DOC-[0-9]{6,}$')
);

CREATE SEQUENCE greenhouse_core.seq_document_public_id START 1;

CREATE INDEX documents_type_status_idx
  ON greenhouse_core.documents (document_type, verification_status)
  WHERE is_archived = FALSE;

CREATE INDEX documents_tenant_space_idx
  ON greenhouse_core.documents (tenant_space_id)
  WHERE tenant_space_id IS NOT NULL;

CREATE INDEX documents_pending_review_idx
  ON greenhouse_core.documents (created_at)
  WHERE verification_status = 'pending_review' AND is_archived = FALSE;

CREATE INDEX documents_expires_at_idx
  ON greenhouse_core.documents (expires_at)
  WHERE expires_at IS NOT NULL AND is_archived = FALSE;
```

### 3. `document_versions` (append-only supersede chain)

```sql
CREATE TABLE greenhouse_core.document_versions (
  document_version_id      TEXT PRIMARY KEY,
  document_id              TEXT NOT NULL REFERENCES greenhouse_core.documents(document_id) ON DELETE RESTRICT,
  version_number           INTEGER NOT NULL,
  asset_id                 TEXT NOT NULL REFERENCES greenhouse_core.assets(asset_id) ON DELETE RESTRICT,
  file_name_snapshot       TEXT NOT NULL,
  mime_type_snapshot       TEXT NOT NULL,
  file_size_bytes_snapshot BIGINT NOT NULL,
  content_hash             TEXT NOT NULL,
  superseded_by_version_id TEXT REFERENCES greenhouse_core.document_versions(document_version_id) ON DELETE RESTRICT,
  superseded_at            TIMESTAMPTZ,
  superseded_reason        TEXT,
  notes                    TEXT,
  uploaded_by_user_id      TEXT NOT NULL,
  uploaded_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT document_versions_unique_per_doc
    UNIQUE (document_id, version_number),
  CONSTRAINT document_versions_version_positive
    CHECK (version_number > 0),
  CONSTRAINT document_versions_size_positive
    CHECK (file_size_bytes_snapshot >= 0),
  CONSTRAINT document_versions_supersede_invariant
    CHECK ((superseded_by_version_id IS NULL AND superseded_at IS NULL)
        OR (superseded_by_version_id IS NOT NULL AND superseded_at IS NOT NULL))
);

CREATE UNIQUE INDEX document_versions_one_active_per_document
  ON greenhouse_core.document_versions (document_id)
  WHERE superseded_by_version_id IS NULL;

CREATE INDEX document_versions_asset_idx
  ON greenhouse_core.document_versions (asset_id);
```

### 4. Late FK desde documents.current_version_id

```sql
ALTER TABLE greenhouse_core.documents
  ADD CONSTRAINT documents_current_version_fk
  FOREIGN KEY (current_version_id)
  REFERENCES greenhouse_core.document_versions(document_version_id)
  DEFERRABLE INITIALLY DEFERRED;
```

### 5. Bridge tables (3 V1)

```sql
CREATE TABLE greenhouse_core.document_member_link (
  document_id TEXT NOT NULL REFERENCES greenhouse_core.documents(document_id) ON DELETE RESTRICT,
  member_id   TEXT NOT NULL REFERENCES greenhouse.team_members(member_id) ON DELETE RESTRICT,
  link_role   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id TEXT NOT NULL,
  PRIMARY KEY (document_id, member_id, link_role),
  CONSTRAINT document_member_link_role_check
    CHECK (link_role IN ('owner', 'signer', 'subject', 'witness', 'related'))
);

CREATE INDEX document_member_link_member_idx
  ON greenhouse_core.document_member_link (member_id);

CREATE TABLE greenhouse_core.document_organization_link (
  document_id     TEXT NOT NULL REFERENCES greenhouse_core.documents(document_id) ON DELETE RESTRICT,
  organization_id TEXT NOT NULL REFERENCES greenhouse_core.organizations(organization_id) ON DELETE RESTRICT,
  link_role       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id TEXT NOT NULL,
  PRIMARY KEY (document_id, organization_id, link_role),
  CONSTRAINT document_organization_link_role_check
    CHECK (link_role IN ('owner', 'signer', 'subject', 'counterparty', 'related'))
);

CREATE INDEX document_organization_link_organization_idx
  ON greenhouse_core.document_organization_link (organization_id);

CREATE TABLE greenhouse_core.document_client_link (
  document_id TEXT NOT NULL REFERENCES greenhouse_core.documents(document_id) ON DELETE RESTRICT,
  client_id   TEXT NOT NULL REFERENCES greenhouse.clients(client_id) ON DELETE RESTRICT,
  link_role   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id TEXT NOT NULL,
  PRIMARY KEY (document_id, client_id, link_role),
  CONSTRAINT document_client_link_role_check
    CHECK (link_role IN ('owner', 'signer', 'subject', 'counterparty', 'related'))
);

CREATE INDEX document_client_link_client_idx
  ON greenhouse_core.document_client_link (client_id);
```

### 6. Append-only audit logs (anti-UPDATE/DELETE trigger pattern TASK-765)

```sql
CREATE TABLE greenhouse_core.document_verification_audit_log (
  audit_id            TEXT PRIMARY KEY,
  document_id         TEXT NOT NULL REFERENCES greenhouse_core.documents(document_id) ON DELETE RESTRICT,
  from_status         TEXT NOT NULL,
  to_status           TEXT NOT NULL,
  actor_user_id       TEXT NOT NULL,
  reason              TEXT,
  metadata_json       JSONB NOT NULL DEFAULT '{}',
  transitioned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT document_verification_audit_log_status_canonical
    CHECK (to_status IN ('pending_review', 'verified', 'rejected', 'archived', 'superseded'))
);

CREATE TRIGGER document_verification_audit_log_no_update
  BEFORE UPDATE ON greenhouse_core.document_verification_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.raise_anti_update_exception();

CREATE TRIGGER document_verification_audit_log_no_delete
  BEFORE DELETE ON greenhouse_core.document_verification_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.raise_anti_delete_exception();

CREATE INDEX document_verification_audit_log_document_idx
  ON greenhouse_core.document_verification_audit_log (document_id, transitioned_at DESC);

CREATE TABLE greenhouse_core.document_reveal_audit_log (
  reveal_id           TEXT PRIMARY KEY,
  document_id         TEXT NOT NULL REFERENCES greenhouse_core.documents(document_id) ON DELETE RESTRICT,
  document_version_id TEXT REFERENCES greenhouse_core.document_versions(document_version_id) ON DELETE RESTRICT,
  actor_user_id       TEXT NOT NULL,
  reason              TEXT NOT NULL,
  revealed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT document_reveal_audit_log_reason_min_length
    CHECK (length(btrim(reason)) >= 20)
);

CREATE TRIGGER document_reveal_audit_log_no_update
  BEFORE UPDATE ON greenhouse_core.document_reveal_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.raise_anti_update_exception();

CREATE TRIGGER document_reveal_audit_log_no_delete
  BEFORE DELETE ON greenhouse_core.document_reveal_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.raise_anti_delete_exception();

CREATE INDEX document_reveal_audit_log_actor_idx
  ON greenhouse_core.document_reveal_audit_log (actor_user_id, revealed_at DESC);
```

### 7. Ownership + grants

```sql
ALTER TABLE greenhouse_core.document_type_catalog            OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.documents                        OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.document_versions                OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.document_member_link             OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.document_organization_link       OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.document_client_link             OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.document_verification_audit_log  OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.document_reveal_audit_log        OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.document_type_catalog            TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE         ON greenhouse_core.documents                        TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE         ON greenhouse_core.document_versions                TO greenhouse_runtime;
GRANT SELECT, INSERT, DELETE         ON greenhouse_core.document_member_link             TO greenhouse_runtime;
GRANT SELECT, INSERT, DELETE         ON greenhouse_core.document_organization_link       TO greenhouse_runtime;
GRANT SELECT, INSERT, DELETE         ON greenhouse_core.document_client_link             TO greenhouse_runtime;
GRANT SELECT, INSERT                 ON greenhouse_core.document_verification_audit_log  TO greenhouse_runtime;
GRANT SELECT, INSERT                 ON greenhouse_core.document_reveal_audit_log        TO greenhouse_runtime;
```

## State Machine — `verification_status` transitions

**5 estados canónicos** (cerrado enum CHECK):

| Estado | Semantic | Entered from | Exits to |
| --- | --- | --- | --- |
| `pending_review` | HR aún no revisó | (initial) | `verified` / `rejected` / `archived` |
| `verified` | HR aprobó | `pending_review` | `archived` / `superseded` |
| `rejected` | HR rechazó (requires reason) | `pending_review` | `archived` |
| `archived` | Terminal (retención soft-tombstone) | `pending_review` / `verified` / `rejected` | (terminal) |
| `superseded` | Reemplazado por document nuevo (cuando type NO versionable) | `verified` | (terminal) |

**Matriz de transitions canónica**:

```ts
const DOCUMENT_TRANSITION_MATRIX: Record<DocumentVerificationStatus, DocumentVerificationStatus[]> = {
  pending_review:  ['verified', 'rejected', 'archived'],
  verified:        ['archived', 'superseded'],
  rejected:        ['archived'],
  archived:        [],  // terminal
  superseded:      [],  // terminal
}
```

**Helper canónico** (TASK-765 pattern):

```ts
// src/lib/documents/transition-status.ts
export const transitionDocumentVerificationStatus = async (
  client: PoolClient | typeof getDb,
  documentId: string,
  newStatus: DocumentVerificationStatus,
  options: {
    actorUserId: string
    reason?: string
    metadata?: Record<string, unknown>
  }
): Promise<Document> => {
  // 1. SELECT FOR UPDATE current document
  // 2. assertValidTransition(currentStatus, newStatus) — throws if illegal
  // 3. assertReasonRequiredForRejected(newStatus, options.reason)
  // 4. UPDATE documents SET verification_status = newStatus, updated_at = NOW()
  // 5. INSERT INTO document_verification_audit_log (append-only)
  // 6. publishOutboxEvent based on transition
  // 7. Return updated document
}
```

## Outbox Events V1 (9 eventos canónicos, todos versioned v1)

Toda transición emite outbox event en la misma tx. Eventos publican siempre (infra-pattern TASK-773); consumers se conectan después. Payload mínimo: `{ documentId, publicId, documentType, tenantKind, tenantSpaceId, version?, actorUserId, ...domain-specific }`.

| Event type | Emitido cuando | Payload extra |
| --- | --- | --- |
| `document.created.v1` | INSERT documents nuevo | `{ titleSnapshot, createdBy }` |
| `document.version_created.v1` | INSERT document_versions nuevo | `{ versionId, versionNumber, assetId, contentHash }` |
| `document.version_superseded.v1` | UPDATE old version superseded_by_version_id | `{ oldVersionId, newVersionId, supersededReason }` |
| `document.verified.v1` | `pending_review → verified` | `{ verifiedBy }` |
| `document.rejected.v1` | `pending_review → rejected` | `{ rejectedBy, reason }` |
| `document.archived.v1` | `* → archived` | `{ archivedBy, archiveReason }` |
| `document.expired.v1` | `expires_at < NOW()` detectado por cron | `{ expiredAt }` |
| `document.revealed_sensitive.v1` | reveal helper invocado (audit pattern) | `{ revealedBy, reason, versionId? }` |
| `document.expiry_warning.v1` | T-30d antes de expires_at | `{ daysRemaining }` |

Cada event_type registrado en `src/lib/sync/event-catalog.ts` + documentado en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.

## Reliability Signals (5, subsystem `Documents Foundation`)

Pattern Greenhouse overlay #8 + TASK-742 layer 4. Todos kind=`drift`, steady=0.

| Signal | Kind | Severity | Steady | Detección |
| --- | --- | --- | --- | --- |
| `documents.upload_dead_letter` | dead_letter | error si count>0 | 0 | `outbox_events.status='dead_letter' AND event_type LIKE 'document.%'` |
| `documents.pending_review_overdue` | drift | warning si >30d, error si >60d | 0 | `verification_status='pending_review' AND age(created_at) > 30 days` |
| `documents.expired_not_archived` | drift | warning si count>0, error si >7d | 0 | `expires_at < NOW() AND is_archived = FALSE` |
| `documents.evidence_orphan` | data_quality | error si count>0 | 0 | `document_versions.asset_id NOT IN (SELECT asset_id FROM greenhouse_core.assets WHERE status != 'deleted')` |
| `documents.bridge_orphan` | data_quality | error si count>0 | 0 | bridge rows cuyo target FK (`member_id`/`organization_id`/`client_id`) ya no existe |

Readers en `src/lib/reliability/queries/`. Wire-up en `getReliabilityOverview` con preloaded sources field `documentsFoundation` (array de 5 signals).

## Capabilities Granulares (6, pattern TASK-784)

Declaradas en `src/config/entitlements-catalog.ts` + seedeadas vía migration en `greenhouse_core.capabilities_registry` (TASK-611 Slice 2) + parity test runtime↔DB.

| Capability | Action | Scope (per role_code) | Comment |
| --- | --- | --- | --- |
| `documents.read_masked` | read | `member`: own / `hr`: tenant / `efeonce_admin`: all | List/view docs con sensitive fields enmascarados |
| `documents.upload` | create | `member`: own (types con `self_service_allowed=true`) / `hr`: tenant | Self-service upload |
| `documents.verify` | approve | `hr`: tenant / `efeonce_admin`: all | HR aprueba/rechaza |
| `documents.reveal_sensitive` | read | `efeonce_admin`: all (audit + reason ≥ 20) | Desenmascara fields confidenciales |
| `documents.export_snapshot` | export | `hr`: tenant / `efeonce_admin`: all | PDF/zip para auditor externo |
| `documents.archive` | update | `hr`: tenant / `efeonce_admin`: all | Soft-tombstone |

Member nunca tiene `reveal_sensitive` scope (defense-in-depth: ni siquiera para sus propios docs, porque la operación de reveal cuenta como acceso administrativo).

## Tenant Safety Pattern

Cada `documents` row tiene `tenant_kind` enum + `tenant_space_id` FK opcional (INVARIANT CHECK: efeonce_internal → space NULL; client → space NOT NULL).

Reader canónico `listDocumentsForSubject` enforce filter automático:

```ts
// src/lib/documents/readers.ts
export const listDocumentsForSubject = async (
  subject: TenantEntitlementSubject,
  filters: DocumentListFilters
): Promise<{documents: Document[], cursor: string | null}> => {
  // 1. Resolve subject.tenantKind + subject.spaceId
  // 2. Apply WHERE tenant_kind = subject.tenantKind AND (tenant_space_id IS NULL OR tenant_space_id = subject.spaceId)
  // 3. Apply capability filter (member: only own via bridge, HR: tenant scope)
  // 4. Apply masking: confidentiality_kind='reveal_required' fields enmascarados unless capability documents.reveal_sensitive granted
  // 5. Cursor pagination keyset on (created_at DESC, document_id ASC)
}
```

NO RLS PG en V1 (out-of-band hasta TASK-789); reader-enforced suffice. Defense-in-depth: bridge tables enforced FK + capability check at API route + reader filter triple-check.

## Canonical Helper Signatures (Slice 2)

Helpers en `src/lib/documents/`:

```ts
// store.ts
export const createDocumentWithVersion = async (input: {
  documentType: DocumentTypeKey
  tenantKind: 'efeonce_internal' | 'client'
  tenantSpaceId?: string
  title: string
  description?: string
  assetId: string  // uploaded via /api/assets/private (status=pending)
  fileNameSnapshot: string
  mimeTypeSnapshot: string
  fileSizeBytesSnapshot: number
  contentHash: string
  links: {
    memberIds?: Array<{memberId: string; linkRole: DocumentLinkRole}>
    organizationIds?: Array<{organizationId: string; linkRole: DocumentLinkRole}>
    clientIds?: Array<{clientId: string; linkRole: DocumentLinkRole}>
  }
  expiresAt?: string
  idempotencyKey?: string
  createdByUserId: string
}, client?: PoolClient): Promise<Document>

export const supersedeDocumentVersion = async (input: {
  documentId: string
  newAssetId: string
  newFileNameSnapshot: string
  newMimeTypeSnapshot: string
  newFileSizeBytesSnapshot: number
  newContentHash: string
  supersededReason: string
  uploadedByUserId: string
}, client?: PoolClient): Promise<{ oldVersion: DocumentVersion; newVersion: DocumentVersion }>

export const transitionDocumentVerificationStatus = async (
  documentId: string,
  newStatus: DocumentVerificationStatus,
  options: { actorUserId: string; reason?: string; metadata?: Record<string, unknown> },
  client?: PoolClient
): Promise<Document>

export const archiveDocument = async (input: {
  documentId: string
  archiveReason: string
  archivedByUserId: string
}, client?: PoolClient): Promise<Document>

export const revealDocument = async (input: {
  documentId: string
  documentVersionId?: string
  reason: string  // >= 20 chars
  actorUserId: string
}): Promise<{ document: Document; version: DocumentVersion; assetSignedUrl: string }>
```

Readers en `src/lib/documents/readers.ts`:

```ts
export const listDocumentsForSubject = async (subject: TenantEntitlementSubject, filters: DocumentListFilters): Promise<{documents: Document[], cursor: string | null}>
export const getDocumentByPublicId = async (publicId: string, subject: TenantEntitlementSubject): Promise<Document | null>
export const listDocumentVersionsForDocument = async (documentId: string, subject: TenantEntitlementSubject): Promise<DocumentVersion[]>
export const listDocumentsForMember = async (memberId: string, subject: TenantEntitlementSubject): Promise<Document[]>
export const listDocumentsForOrganization = async (organizationId: string, subject: TenantEntitlementSubject): Promise<Document[]>
export const listDocumentsForClient = async (clientId: string, subject: TenantEntitlementSubject): Promise<Document[]>
```

## Normative Docs

- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`
- `docs/tasks/to-do/TASK-027-hris-document-vault.md` (legacy reference)
- `docs/tasks/complete/TASK-461-msa-umbrella-clause-library.md`
- `docs/tasks/complete/TASK-784-person-legal-profile-identity-documents-foundation.md` (pattern fuente)
- `docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md` (lifecycle pattern fuente)
- `docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md` (state machine + audit pattern)
- `docs/tasks/complete/TASK-721-finance-reconciliation-evidence-canonical-uploader.md` (asset attach pattern)

## Dependencies & Impact

### Depends on

- `src/lib/storage/greenhouse-assets.ts` (TASK-721 canonical uploader + `attachAssetToAggregate`)
- `greenhouse_core.assets`
- `greenhouse.team_members`, `greenhouse_core.organizations`, `greenhouse.clients`, `greenhouse_core.spaces` (canonical 360)
- `greenhouse_core.capabilities_registry` (TASK-611 Slice 2 — para registrar las 6 capabilities)
- `docs/architecture/schema-snapshot-baseline.sql` como referencia histórica

### Blocks / Impacts

- `TASK-490` (signature orchestration)
- `TASK-492` (document manager UI)
- `TASK-493` (template rendering)
- `TASK-494` (HR document vault convergence)
- `TASK-495` (Finance/Legal MSA/SOW convergence)

### Files owned

- `migrations/*-task-489-document-registry-foundation*.sql`
- `src/lib/documents/**`
- `src/types/db.d.ts` (regenerado via kysely-codegen)
- `src/types/documents.ts` (domain types)
- `src/lib/reliability/queries/documents-*.ts`
- `src/lib/sync/event-catalog.ts` (9 nuevos event types)
- `src/config/entitlements-catalog.ts` (6 nuevas capabilities)
- `docs/architecture/GREENHOUSE_DOCUMENT_REGISTRY_V1_SPEC.md` (creado en Slice 0)

## Current Repo State

### Already exists

- `greenhouse_core.assets` (TASK-173) + `GreenhouseFileUploader` (TASK-721) + asset metadata canónica.
- `greenhouse_core.capabilities_registry` (TASK-611 Slice 2) + parity test runtime↔DB.
- `greenhouse_sync.outbox_events` (TASK-773) + state machine `pending → publishing → published | failed → dead_letter` + Cloud Scheduler publisher.
- `greenhouse_context.context_documents` (sidecar AI metadata, NO SSOT documental).
- Anti-UPDATE/anti-DELETE trigger functions canónicas (TASK-765 pattern).
- Outbox event catalog framework (`src/lib/sync/event-catalog.ts`).

### Gap

- No existe `documents` aggregate ni `document_type_catalog`.
- No existen las 3 bridge tables.
- No existen los 2 audit log tables.
- No hay capabilities `documents.*` registradas.
- No hay reliability signals `documents.*`.
- Los outbox events `document.*.v1` no existen en el catalog.
- `greenhouse_core.member_certifications` y `member_evidence` siguen como aggregates separados (no se migran; conviven).

## Scope (REVISED — 4 slices)

### Slice 0 — Architecture spec + decisions doc (~3-4h, doc-only)

- Crear `docs/architecture/GREENHOUSE_DOCUMENT_REGISTRY_V1_SPEC.md` con todas las decisiones de este Delta V2 + DDL skeleton + state machine + outbox events + capabilities + reliability signals + helper signatures.
- ADR entry en `docs/architecture/DECISIONS_INDEX.md`.
- Skill `greenhouse-postgres` review del DDL (verificar migration mechanics, naming, owner, grants).
- Skill `greenhouse-ux-writing` review del copy seed del catalog (display_label_es_cl).
- Output: spec aprobado + DDL skeleton firmado.

### Slice 1 — Schema migration + types Kysely (~4-6h)

- `pnpm migrate:create task-489-document-registry-foundation`
- Aplicar DDL completo: 1 catalog table + 1 aggregate + 1 versions + 3 bridges + 2 audit logs + sequences + indexes + triggers + grants.
- Seed inicial del catalog (6 document_types V1).
- Verify post-migration: `information_schema` checks + bloque DO con RAISE EXCEPTION (anti pre-up-marker bug pattern).
- `pnpm db:generate-types` regenera Kysely types.
- Domain types en `src/types/documents.ts` (`DocumentVerificationStatus`, `DocumentLinkRole`, `DocumentTypeKey`, etc.).
- Live test `documents-foundation.live.test.ts` contra PG real (skipea sin Cloud SQL connection).

### Slice 2 — Runtime helpers + state machine + audit (~6-8h)

- `src/lib/documents/store.ts`: 5 helpers canónicos (createDocumentWithVersion, supersedeDocumentVersion, transitionDocumentVerificationStatus, archiveDocument, revealDocument).
- `src/lib/documents/readers.ts`: 6 readers canónicos con tenant filter automático.
- `src/lib/documents/transition-matrix.ts`: declarative matrix + `assertValidTransition` helper.
- `src/lib/documents/masking.ts`: server-side masking per `confidentiality_kind`.
- Unit tests (mocked Pool): happy path + edge cases + state machine matrix.
- Live tests con PG real: idempotency, supersede chain, audit log inserts, transition matrix enforcement.

### Slice 3 — Outbox events + reliability signals + capabilities registry (~4-6h)

- 9 event types registrados en `src/lib/sync/event-catalog.ts` + payload type definitions.
- 6 capabilities en `src/config/entitlements-catalog.ts` + seed migration en `capabilities_registry`.
- Parity test runtime↔DB (pattern TASK-611).
- 5 reliability signal readers en `src/lib/reliability/queries/documents-*.ts`.
- Wire-up en `getReliabilityOverview` con preloaded source `documentsFoundation`.
- Tests unitarios per signal (4-tests pattern: ok / warning / error / degraded).
- Docs funcional `docs/documentation/plataforma/document-registry.md` (lenguaje simple).

## Out of Scope

- Firmas electrónicas (TASK-490/491 ZapSign adapter).
- UI del gestor documental (TASK-492).
- Rendering de PDF/DOCX (TASK-493).
- Migración de finiquitos / certificaciones / evidencia existentes (siguen aggregates separados, registry referencia via bridges late binding).
- Bridges `document_service_link` / `document_final_settlement_link` / `document_person_identity_document_link` (late binding cuando emerja consumer).
- RLS PG (TASK-789 future).
- Cron expiry warnings + auto-archive (TASK-494 follow-up cuando emerja consumer real).

## 4-Pillar Score (required al cerrar Slice 3)

### Safety

- **What can go wrong**: cross-tenant doc visibility (cliente A ve doc de cliente B); reveal de sensitive sin reason; bridge orphan dejando doc sin owner; capability check ausente en uno de los planos.
- **Gates**: 6 capabilities granulares declaradas + reflejadas en `capabilities_registry` con parity test; reveal helper canónico con `reason >= 20` chars + audit row; tenant filter automático en readers; bridge tables enforced FK (RESTRICT, no CASCADE).
- **Blast radius if wrong**: cross-tenant contamination posible si reader olvida filter → 1 tenant entero. Defense-in-depth: bridge tables enforce FK + capability check at API route + reader filter triple-check.
- **Verified by**: capabilities_registry parity test (TASK-611 pattern); reveal audit log con anti-UPDATE/DELETE trigger; reliability signal `documents.reveal_anomaly_rate` (>=3 reveals/24h por actor → warning); 5 CHECKs DB.
- **Residual risk**: NO RLS PG en V1 → cualquier reader que olvide `WHERE tenant_kind = subject.tenantKind` puede leak. TASK-789 trackea RLS adoption. Mitigación V1: code review obligatorio + integration test contra PG real.

### Robustness

- **Idempotency**: `documents.idempotency_key UNIQUE` + content_hash dedup via `greenhouse_core.assets.metadata_json->>'content_hash'`. Helper `createDocumentWithVersion` detecta duplicate y retorna existing row.
- **Atomicity**: helper `createDocumentWithVersion(input, client?)` envuelve INSERT documents + INSERT document_versions + UPDATE current_version_id (DEFERRED FK) + attachAssetToAggregate + INSERT bridges + INSERT outbox event en una sola tx PG. Rollback completo si cualquier step falla.
- **Race protection**: partial UNIQUE INDEX `document_versions_one_active_per_document` previene dos versions activas concurrent. `SELECT FOR UPDATE` en `supersedeDocumentVersion` y `transitionDocumentVerificationStatus`. `idempotency_key UNIQUE` previene duplicate INSERT.
- **Constraint coverage**: 8 CHECKs explícitos (tenant_kind enum, verification_status enum, archive_invariant, tenant_space_invariant, title_nonempty, public_id_format, version_positive, supersede_invariant) + FK strict en bridges (RESTRICT) + state machine matrix enforced en helper.
- **Verified by**: live test PG `documents-foundation.live.test.ts` (idempotency, supersede, transitions); concurrency test (2 supersede simultáneos asserts UNIQUE constraint wins); state machine matrix unit tests con casos prohibidos.

### Resilience

- **Retry policy**: outbox events siguen state machine canónica TASK-773 (`pending → publishing → published | failed → dead_letter`). N=5 retries con exponential backoff.
- **Dead letter**: `outbox_events.status='dead_letter' AND event_type LIKE 'document.%'` → reliability signal `documents.upload_dead_letter`.
- **Reliability signals**: 5 signals (upload_dead_letter / pending_review_overdue / expired_not_archived / evidence_orphan / bridge_orphan), kind=drift, steady=0, severity warning/error según ventana.
- **Audit trail**: `document_verification_audit_log` append-only + anti-UPDATE/DELETE trigger; `document_reveal_audit_log` ídem. Permite forensic completo (quién verificó qué cuándo, quién reveló sensitive y por qué).
- **Recovery procedure**: Slice 3 includes recovery script `scripts/documents/recover-orphan-bridges.ts` (idempotent, batch mode). Runbook `docs/operations/runbooks/documents-recovery.md` follow-up cuando emerja primer incidente real.

### Scalability

- **Hot path Big-O**: list por member O(log n) via composite index `document_member_link (member_id)` + JOIN; verification queue O(log n) via partial index `WHERE verification_status='pending_review'`; expired docs O(log n) via partial index `WHERE expires_at IS NOT NULL AND is_archived = FALSE`.
- **Index coverage**: PKs canónicos + 4 indexes en `documents` (type_status, tenant_space, pending_review, expires_at) + 3 bridge indexes (member, organization, client) + 1 version-asset index + 2 audit log indexes (document_id+time DESC, actor+time DESC).
- **Async paths**: outbox publish via Cloud Scheduler + reactive consumers para projections downstream (BQ snapshot, search index futuro). Cron expiry detection + auto-archive en TASK-494 follow-up.
- **Cost at 10x**: lineal. ~5k docs Greenhouse internal Y1 (HR + finance); ~50k Y3 con clientes Globe → no requiere re-design. Partitioning por `created_at` (year) cuando crucemos 500k docs (re-evaluate Y5).
- **Pagination**: cursor keyset on `(created_at DESC, document_id ASC)`. NO offset. Listing por member/org/client siempre via bridge index → no full table scan.

## Acceptance Criteria

- [ ] Slice 0 entregado: spec arquitectónica V1 + DDL skeleton + 6 decisions resolved + skills reviews completas.
- [ ] Slice 1 entregado: migration aplicada (live PG verified via `information_schema`), 8 tables + indexes + triggers + grants existen, types Kysely regenerados, live test verde.
- [ ] Slice 2 entregado: 5 helpers canónicos + 6 readers + transition matrix declarative + masking helper, unit tests + live tests verdes, idempotency + concurrency probadas.
- [ ] Slice 3 entregado: 9 event types registrados, 6 capabilities en catalog + DB con parity test, 5 reliability signals con readers + wire-up + tests, doc funcional creado.
- [ ] 4-pillar score completado al cerrar Slice 3.
- [ ] Cero `Sentry.captureException` directo; toda observabilidad via `captureWithDomain('payroll' | 'hr', ...)`.
- [ ] Cero polymorphic FK; 3 bridges V1 con FK real RESTRICT.
- [ ] Cero asset duplication; document_versions.asset_id referencia greenhouse_core.assets.
- [ ] CHECK constraints: 8 enumerados activos + VALIDATE pasada.
- [ ] Anti-UPDATE/DELETE triggers en 2 audit log tables verificados via test PG.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/documents src/lib/reliability/queries/documents-*`
- `pnpm test src/lib/documents/*.live.test.ts` (skipea sin `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`)
- `pnpm build`
- `pnpm pg:doctor` (verifica owner + grants + constraints)
- Smoke SQL contra PG real: `SELECT * FROM greenhouse_core.document_type_catalog` retorna 6 rows V1 seed.
- Verify ant-UPDATE trigger: `UPDATE document_verification_audit_log SET reason='x'` debe fallar con anti_update_exception.
- Verify partial UNIQUE: insertar 2 versions activas mismo document_id → segunda falla.
- Verify capability parity test runtime↔DB: 6/6 match.

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados (move to `complete/`).
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con resumen Slice 0-3.
- [ ] `changelog.md` entry con resumen + decisiones canonizadas.
- [ ] `project_context.md` actualizado con namespace nuevo `greenhouse_core.documents.*`.
- [ ] `docs/architecture/GREENHOUSE_DOCUMENT_REGISTRY_V1_SPEC.md` creado y referenciado.
- [ ] ADR entry en `DECISIONS_INDEX.md`: "Document Registry V1 — bridges per kind NO polymorphic + catalog table + state machine TASK-765 pattern".
- [ ] CLAUDE.md sección nueva "Document Registry invariants" con hard rules.
- [ ] TASK-490/492/493/494/495 desbloqueadas (update Status `Blocked by`).
- [ ] Doc funcional `docs/documentation/plataforma/document-registry.md` creado.

## Hard Rules (canonical anti-regression)

- **NUNCA** crear polymorphic FK (`source_type ENUM + source_id TEXT` sin FK real). Toda relación a canonical 360 object pasa por bridge table con FK strict.
- **NUNCA** mutar `verification_status` directo vía SQL bypasseando el helper `transitionDocumentVerificationStatus`. La matrix de transitions vive en código + DB CHECK; el helper enforce ambos.
- **NUNCA** modificar `document_verification_audit_log` o `document_reveal_audit_log` post-INSERT. Append-only enforced por anti-UPDATE + anti-DELETE trigger. Correcciones via nueva fila con `metadata_json.correction_of=<previous_audit_id>`.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths de `src/lib/documents/`. Usar `captureWithDomain(err, '<domain>', ...)` con domain `payroll`/`hr`/`finance` según consumer.
- **NUNCA** persistir `documents.current_version_id` apuntando a una version cuyo `document_id` no matchee. CHECK invariant + DEFERRED FK lo prevent.
- **NUNCA** crear `document_type` nuevo sin entry en `document_type_catalog` con todos los 6 campos metadata. CHECK constraint del FK lo bloquea.
- **NUNCA** subir un asset directo via SQL bypasseando el helper canónico `createDocumentWithVersion` + `attachAssetToAggregate`. El asset queda orfan (status='pending') y reliability signal `documents.evidence_orphan` lo detecta.
- **NUNCA** mostrar fields confidenciales (confidentiality_kind='reveal_required') al cliente sin pasar por `revealDocument` helper con reason + capability check. El masking server-side por default + reveal explicit + audit log son una sola defensa coordinada.
- **NUNCA** agregar un nuevo bridge table (e.g. `document_service_link`) sin: (a) extender el set V1 en este spec, (b) reader nuevo `listDocumentsForService`, (c) reliability signal `documents.bridge_orphan` ampliado, (d) test de orphan detection.
- **NUNCA** agregar un outbox event type nuevo sin: (a) registrar en `event-catalog.ts`, (b) documentar en `GREENHOUSE_EVENT_CATALOG_V1.md`, (c) versionado v1 explícito desde día 1 (no v0 ni unversioned).
- **NUNCA** agregar una capability nueva sin: (a) declarar en `entitlements-catalog.ts`, (b) migration que la seedee en `capabilities_registry`, (c) parity test runtime↔DB que la valide.
- **NUNCA** suprimir un reliability signal por "ruido" sin antes ajustar threshold + documentar razón. Steady=0 es invariante; si emerge tolerance legítima, change spec + bump signal version.
- **NUNCA** branchear visibility de un doc en cliente sin server-side filter en reader. El cliente solo recibe payload pre-redacted.
- **SIEMPRE** que un cron / reactive consumer / cleanup script toque `documents.*`, registrar un audit row + outbox event explicando el cambio.
- **SIEMPRE** que emerja un nuevo dominio consumer (HR / Finance / Legal / nuevo), agregar su bridge table V1 + reader canónico + actualizar `document_type_catalog` antes de cualquier UPDATE inline.

## Open Questions (deliberately deferred to follow-on tasks)

- **TASK-494 follow-up**: cron expiry warning T-30d + auto-archive de docs expired (no V1; emerge cuando HR vault tenga consumer real con SLA de cumplimiento).
- **TASK-789 follow-up**: RLS PG para defense-in-depth adicional sobre tenant isolation. V1 reader-enforced es suficiente.
- **TASK-490 prerequisite**: signature orchestration agrega `document_signature_request_id` FK al document_version. Late binding cuando emerja.
- **TASK-493 prerequisite**: template rendering puede generar document_versions automáticamente (e.g. finiquito → registry). Bridge late binding.
- **TASK-495 prerequisite**: MSA/SOW agregan `document_organization_link` con `link_role IN ('counterparty', 'signer')`. V1 ya soporta estos roles en CHECK.
- **Cross-tenant share**: docs compartidos cliente↔cliente (e.g. MSA tripartito) requieren tabla `document_tenant_share` o RLS específico. Out of scope V1.
- **Bulk operations**: upload masivo (e.g. migración masiva contratos legacy) requiere endpoint batch + outbox bulk publish. Out of scope V1 (helper canonical idempotent permite re-correr scripts).
- **Search**: full-text search sobre `documents.title` + `description` requiere índice GIN. Late binding cuando emerja UI de búsqueda en TASK-492.
- **OCR / extraction**: extraer texto de PDFs subidos para AI context (TASK-413). Late binding cuando consumer real emerja.

## Patrones canónicos fuente (replicados verbatim)

1. **`greenhouse_core.person_identity_documents` (TASK-784)** — verification_status enum + invariants CHECK + evidence_asset_id pattern + reveal helper + masking server-side + audit log. Source archivo: `migrations/20260505015628132_task-784-person-identity-documents-and-addresses.sql`.
2. **`greenhouse_payroll.final_settlement_documents` (TASK-862/863)** — state machine + helper canónico per transition + matriz declarativa de presentación + 7-layer defense (DB + app + UI + signal + audit + workflow + outbox) + auto-regen pattern. Source: `src/lib/payroll/final-settlement/document-store.ts`.
3. **`greenhouse_core.assets` + `assets_access_log` (TASK-721)** — append-only audit + retention_class + dedup por content_hash + `attachAssetToAggregate` pattern. Source: `src/lib/storage/greenhouse-assets.ts`.
4. **`payment_order_state_transitions` (TASK-765)** — append-only state machine audit con anti-UPDATE/DELETE trigger + state machine matrix + helper canónico atomic. Source: `src/lib/finance/payment-orders/mark-paid-atomic.ts`.
5. **`home_rollout_flags` (TASK-780)** — catalog table con CHECK constraint + reliability signal de drift + admin endpoint. Source: `src/lib/home/rollout-flags.ts`.
6. **`greenhouse_core.capabilities_registry` (TASK-611)** — capability catalog DB + parity test runtime↔DB + 6 granular capabilities pattern. Source: `src/lib/capabilities-registry/parity.ts`.

## Delta 2026-04-19 — Original task creation

Task original creada con scope foundation documental transversal. Quedó formalmente anclada a `EPIC-001` y convergente con TASK-027 legacy.

## Delta 2026-05-11 V1 — Initial arch review (8 gaps identificados)

(Ver sección "Delta 2026-05-11 V1" arriba — preservado como audit trail del review inicial.)
