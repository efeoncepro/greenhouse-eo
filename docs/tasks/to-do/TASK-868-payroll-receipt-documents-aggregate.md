# TASK-868 — Payroll Receipt Documents Aggregate + Registry Link

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio` (~12-16h)
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseño hardened — listo para ejecución`
- Rank: `TBD`
- Domain: `payroll`
- Blocked by: `TASK-489` (Document Registry Foundation V2.1), `TASK-758` (Receipt Presenter ya completed)
- Branch: `task/TASK-868-payroll-receipt-documents-aggregate`
- Legacy ID: `none`
- GitHub Issue: `none`

---

## Summary

Materializar el aggregate canónico `greenhouse_payroll.payroll_receipt_documents` que persiste cada recibo de nómina emitido como un documento legal con state machine + PDF asset + auto-regen + audit log + outbox events + reliability signals. Replica verbatim el patrón canonizado en TASK-862/863 V1.5.2 para finiquitos. Linkea al document registry transversal (TASK-489) como `kind='linked'` document_type `payroll_receipt`, permitiendo que `/my/documents` (TASK-494) liste recibos junto con contratos + NDAs + finiquitos sin duplicar SSOT ni inventar lógica especial.

## Why This Task Exists

Hoy los recibos de nómina se generan via `generate-payroll-pdf.tsx` (TASK-758 receipt presenter) y se entregan al colaborador, pero NO existen como agregado canónico con lifecycle propio. Eso bloquea 4 cosas:

1. **Surfacing uniforme**: `/my/documents` (TASK-494) no puede listar recibos sin lógica especial reader-side. Para el colaborador, el modelo mental "todos mis documentos en un lugar" requiere que recibos sean documentos canónicos.
2. **Auditoría de acceso**: hoy no hay audit log de quién descargó un recibo, cuándo, ni por qué. Para compliance + defense-in-depth, cada acceso a info confidencial (montos, AFP, descuentos) debe quedar trazado.
3. **Auto-regen pattern**: si HR recalcula un período y el recibo cambia, hoy no hay helper canónico que regenere el PDF preservando audit trail. TASK-863 V1.5.2 canonizó el patrón; recibos lo necesitan.
4. **Retention enforcement**: Código del Trabajo art. 31 exige 5 años retención. Sin aggregate dedicado, retention policy queda implícita en `payroll_period_entries` (transactional table, lifecycle muy distinto).

Sin esta task, TASK-489 V2 entrega un registry incompleto (solo finiquitos linkados V1; recibos quedan fuera del mental model uniforme). Los colaboradores siguen accediendo a recibos por `/my/payslips` (existente) pero no aparecen en `/my/documents`, creando 2 surfaces paralelos.

## Goal

- Crear aggregate dedicado `greenhouse_payroll.payroll_receipt_documents` con state machine + PDF asset canónico.
- Replicar el patrón canonizado TASK-862/863 V1.5.2: helper atomic + auto-regen + watermark per status + audit log + outbox events v1 + reliability signals.
- Reusar `generate-payroll-pdf.tsx` (TASK-758 receipt presenter) como render engine — cero rewrite del PDF.
- Linkear al document registry (TASK-489 V2.1): document_type `payroll_receipt` kind=`linked` + bridge `document_payroll_receipt_link` + reactive consumer + reliability signal.
- Habilitar surfacing en `/my/documents` (TASK-494) cuando emerja, sin lógica reader-side especial.

## Architecture Alignment

Specs canónicas que esta task respeta verbatim:

- `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (patrón fuente, TASK-862/863 V1.5.2)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (§25.b receipt presentation contract)
- `docs/architecture/GREENHOUSE_DOCUMENT_REGISTRY_V1_SPEC.md` (creado por TASK-489 Slice 0)

Reglas obligatorias heredadas:

- PDF persistido refleja `document_status` actual de DB via helper canónico (TASK-863 V1.5.2 invariant).
- Auto-regen en TODAS las transitions de state machine (defense-in-depth de 5 capas).
- Asset metadata canónica `documentStatusAtRender` per regen.
- `captureWithDomain('payroll', err, ...)` en error paths (NO `Sentry.captureException` raw).
- Helper canónico atomic envuelve UPDATE + regen + audit + outbox en una sola tx PG.
- Test anti-regresión enforce que TODA `SET document_status = 'X'` tiene regen call matchedo.

## Normative Docs

- `docs/tasks/complete/TASK-862-final-settlement-resignation-v1-closing.md` (patrón fuente exact)
- `docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md` (patrón fuente V1.5.2)
- `docs/tasks/complete/TASK-758-payroll-receipt-render-4-regimes.md` (receipt presenter ya existe)
- `docs/tasks/complete/TASK-782-period-report-excel-disaggregation.md` (export complementario)
- `docs/tasks/to-do/TASK-489-document-registry-versioning-foundation.md` (foundation V2.1)
- `docs/tasks/to-do/TASK-494-hr-document-vault-convergence.md` (consumer V1.5)

## Dependencies & Impact

### Depends on

- `TASK-489` (Document Registry V2.1 — bridges + linked aggregate pattern + reactive consumer framework)
- `TASK-758` (receipt presenter `buildReceiptPresentation` + `groupEntriesByRegime` exports)
- `src/lib/payroll/receipt-presenter.ts`
- `src/lib/payroll/generate-payroll-pdf.tsx`
- `src/lib/storage/greenhouse-assets.ts` (canonical uploader + `attachAssetToAggregate`)
- `greenhouse_payroll.payroll_period_entries` (FK target)
- `src/lib/sync/event-catalog.ts` (registro de 6 nuevos event types)
- `src/lib/sync/projections/index.ts` (registrar reactive consumer)

### Blocks / Impacts

- `TASK-494` (HR Document Vault Convergence — surfacing de recibos en `/my/documents`)
- Future: cron retention archive (5 años post-emisión)
- Future: bulk regeneration script post-payroll recalc

### Files owned

- `migrations/*-task-868-payroll-receipt-documents*.sql`
- `src/lib/payroll/receipt-documents/**`
- `src/lib/payroll/receipt-documents/store.ts`
- `src/lib/payroll/receipt-documents/document-pdf.tsx` (wrapper sobre TASK-758 presenter)
- `src/lib/payroll/receipt-documents/regenerate.ts`
- `src/lib/payroll/receipt-documents/state-machine.ts`
- `src/lib/reliability/queries/payroll-receipt-*.ts`
- `src/types/payroll-receipt-documents.ts`
- `src/lib/sync/projections/payroll-receipt-document-registry-sync.ts`

## Current Repo State

### Already exists (reusables)

- `src/lib/payroll/receipt-presenter.ts` (TASK-758) — `resolveReceiptRegime`, `buildReceiptPresentation`, `groupEntriesByRegime`, `RECEIPT_REGIME_BADGES`, `RECEIPT_REGIME_DISPLAY_ORDER`. NO rewrite.
- `src/lib/payroll/generate-payroll-pdf.tsx` (TASK-758 + TASK-782) — render engine canonical con 4 regímenes + watermark TBD.
- `greenhouse_payroll.payroll_period_entries` — source data per emission.
- `greenhouse_core.assets` + `attachAssetToAggregate` — storage canónico.
- Outbox + reactive consumer framework (TASK-771/773).
- Anti-UPDATE/anti-DELETE trigger functions canónicas (`raise_anti_update_exception`, `raise_anti_delete_exception`).

### Gap

- No existe `greenhouse_payroll.payroll_receipt_documents` aggregate.
- No existe state machine para recibos (lifecycle hoy: implícito en `payroll_period.exported`).
- No existe `pdf_asset_id` canónico per recibo persistido (PDFs hoy se generan on-demand cada vez).
- No existe audit log de regeneración / acceso a recibo.
- No existen outbox events `payroll.receipt.*.v1`.
- No existen reliability signals dedicados.
- No existe bridge al document registry (`document_payroll_receipt_link`).
- Reactive consumer registry-side NO existe.
- `document_type_catalog` (creado por TASK-489 Slice 1) NO incluye `payroll_receipt` type entry.

## Schema Design — DDL skeleton canónico

DDL ejecutado en Slice 1 via `pnpm migrate:create task-868-payroll-receipt-documents`.

### 1. `payroll_receipt_documents` (aggregate root)

```sql
CREATE TABLE greenhouse_payroll.payroll_receipt_documents (
  payroll_receipt_document_id  TEXT PRIMARY KEY,
  payroll_period_entry_id      TEXT NOT NULL UNIQUE REFERENCES greenhouse_payroll.payroll_period_entries(entry_id) ON DELETE RESTRICT,
  payroll_period_id            TEXT NOT NULL,
  member_id                    TEXT NOT NULL REFERENCES greenhouse.team_members(member_id) ON DELETE RESTRICT,
  period_year                  INTEGER NOT NULL,
  period_month                 INTEGER NOT NULL,
  pay_regime                   TEXT NOT NULL,
  document_version             INTEGER NOT NULL DEFAULT 1,
  document_status              TEXT NOT NULL DEFAULT 'rendered',
  pdf_asset_id                 TEXT REFERENCES greenhouse_core.assets(asset_id) ON DELETE RESTRICT,
  content_hash                 TEXT,
  snapshot_json                JSONB NOT NULL,
  snapshot_hash                TEXT NOT NULL,
  emitted_at                   TIMESTAMPTZ,
  emitted_by_user_id           TEXT,
  distributed_at               TIMESTAMPTZ,
  distributed_by_user_id       TEXT,
  regenerated_at               TIMESTAMPTZ,
  regenerated_by_user_id       TEXT,
  superseded_by_document_id    TEXT REFERENCES greenhouse_payroll.payroll_receipt_documents(payroll_receipt_document_id),
  superseded_at                TIMESTAMPTZ,
  superseded_reason            TEXT,
  voided_at                    TIMESTAMPTZ,
  voided_by_user_id            TEXT,
  void_reason                  TEXT,
  created_by_user_id           TEXT NOT NULL,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_user_id           TEXT,
  CONSTRAINT payroll_receipt_documents_status_check
    CHECK (document_status IN ('rendered', 'emitted', 'distributed', 'regenerated', 'superseded', 'voided')),
  CONSTRAINT payroll_receipt_documents_regime_check
    CHECK (pay_regime IN ('chile_dependent', 'honorarios', 'international_deel', 'international_internal')),
  CONSTRAINT payroll_receipt_documents_period_month_check
    CHECK (period_month BETWEEN 1 AND 12),
  CONSTRAINT payroll_receipt_documents_version_positive
    CHECK (document_version > 0),
  CONSTRAINT payroll_receipt_documents_emitted_invariant
    CHECK ((document_status IN ('rendered', 'voided'))
        OR (emitted_at IS NOT NULL AND emitted_by_user_id IS NOT NULL)),
  CONSTRAINT payroll_receipt_documents_voided_invariant
    CHECK ((document_status <> 'voided')
        OR (voided_at IS NOT NULL AND voided_by_user_id IS NOT NULL AND void_reason IS NOT NULL)),
  CONSTRAINT payroll_receipt_documents_superseded_invariant
    CHECK ((document_status <> 'superseded')
        OR (superseded_by_document_id IS NOT NULL AND superseded_at IS NOT NULL AND superseded_reason IS NOT NULL))
);

-- Hot read paths
CREATE INDEX payroll_receipt_documents_member_period_idx
  ON greenhouse_payroll.payroll_receipt_documents (member_id, period_year DESC, period_month DESC);

CREATE INDEX payroll_receipt_documents_period_idx
  ON greenhouse_payroll.payroll_receipt_documents (payroll_period_id, document_status);

CREATE INDEX payroll_receipt_documents_pending_regen_idx
  ON greenhouse_payroll.payroll_receipt_documents (created_at)
  WHERE document_status = 'rendered';

CREATE UNIQUE INDEX payroll_receipt_documents_active_per_entry_idx
  ON greenhouse_payroll.payroll_receipt_documents (payroll_period_entry_id)
  WHERE superseded_by_document_id IS NULL AND document_status <> 'voided';
```

### 2. `payroll_receipt_document_state_transitions` (append-only audit log)

```sql
CREATE TABLE greenhouse_payroll.payroll_receipt_document_state_transitions (
  transition_id            TEXT PRIMARY KEY,
  payroll_receipt_document_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_receipt_documents(payroll_receipt_document_id) ON DELETE RESTRICT,
  from_status              TEXT NOT NULL,
  to_status                TEXT NOT NULL,
  actor_user_id            TEXT NOT NULL,
  actor_kind               TEXT NOT NULL DEFAULT 'human',
  reason                   TEXT,
  metadata_json            JSONB NOT NULL DEFAULT '{}',
  transitioned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_receipt_state_transitions_to_status_check
    CHECK (to_status IN ('rendered', 'emitted', 'distributed', 'regenerated', 'superseded', 'voided')),
  CONSTRAINT payroll_receipt_state_transitions_actor_kind_check
    CHECK (actor_kind IN ('human', 'system', 'cron', 'reactive_consumer'))
);

CREATE TRIGGER payroll_receipt_state_transitions_no_update
  BEFORE UPDATE ON greenhouse_payroll.payroll_receipt_document_state_transitions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.raise_anti_update_exception();

CREATE TRIGGER payroll_receipt_state_transitions_no_delete
  BEFORE DELETE ON greenhouse_payroll.payroll_receipt_document_state_transitions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.raise_anti_delete_exception();

CREATE INDEX payroll_receipt_state_transitions_document_idx
  ON greenhouse_payroll.payroll_receipt_document_state_transitions
  (payroll_receipt_document_id, transitioned_at DESC);
```

### 3. Ownership + grants

```sql
ALTER TABLE greenhouse_payroll.payroll_receipt_documents                  OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.payroll_receipt_document_state_transitions OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_payroll.payroll_receipt_documents                  TO greenhouse_runtime;
GRANT SELECT, INSERT         ON greenhouse_payroll.payroll_receipt_document_state_transitions TO greenhouse_runtime;
```

### 4. Document registry catalog entry (TASK-489 V2.1 dependency)

```sql
INSERT INTO greenhouse_core.document_type_catalog
  (document_type, display_label_es_cl, display_label_en_us, module, retention_class, retention_years_default,
   confidentiality_kind, versionable, self_service_allowed, required_capability)
VALUES
  ('payroll_receipt', 'Recibo de nómina', 'Payroll receipt / payslip',
   'hr', 'labor_contract', 5, 'reveal_required', FALSE, FALSE, 'documents.read_masked')
ON CONFLICT (document_type) DO NOTHING;

-- Extend linked_aggregate_table CHECK enum (TASK-489 V2.1)
ALTER TABLE greenhouse_core.documents
  DROP CONSTRAINT documents_linked_aggregate_table_check;

ALTER TABLE greenhouse_core.documents
  ADD CONSTRAINT documents_linked_aggregate_table_check
  CHECK (linked_aggregate_table IS NULL OR linked_aggregate_table IN (
    'greenhouse_payroll.final_settlement_documents',
    'greenhouse_payroll.payroll_receipt_documents',
    'greenhouse_core.person_identity_documents',
    'greenhouse_core.member_certifications',
    'greenhouse_core.member_evidence'
  ));
```

### 5. Bridge dedicated

```sql
CREATE TABLE greenhouse_core.document_payroll_receipt_link (
  document_id                  TEXT PRIMARY KEY REFERENCES greenhouse_core.documents(document_id) ON DELETE RESTRICT,
  payroll_receipt_document_id  TEXT NOT NULL UNIQUE REFERENCES greenhouse_payroll.payroll_receipt_documents(payroll_receipt_document_id) ON DELETE RESTRICT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id           TEXT NOT NULL
);

ALTER TABLE greenhouse_core.document_payroll_receipt_link OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, DELETE ON greenhouse_core.document_payroll_receipt_link TO greenhouse_runtime;
```

## State Machine — `document_status` canonical

**6 estados** (cerrado enum CHECK + helper canónico):

| Estado | Semantic | Entered from | Exits to | Watermark | Badge |
| --- | --- | --- | --- | --- | --- |
| `rendered` | Draft inicial (post-cálculo, pre-emisión) | (initial) | `emitted` / `voided` | PROYECTO warning | "Borrador" |
| `emitted` | Recibo emitido (PDF firma sello) | `rendered` | `distributed` / `regenerated` / `voided` / `superseded` | CLEAN | "Emitido" |
| `distributed` | Entregado a colaborador (email / portal / Teams) | `emitted` | `regenerated` / `voided` / `superseded` | CLEAN | "Entregado" |
| `regenerated` | Recalculado post-emisión + PDF refrescado (NOT superseded — same period, fix puntual) | `emitted` / `distributed` | `distributed` / `voided` / `superseded` | CLEAN + "REGENERADO" footnote | "Regenerado" |
| `superseded` | Reemplazado por document_version+1 (estructura nueva del recibo, e.g. recálculo masivo HR) | `emitted` / `distributed` / `regenerated` | (terminal) | REEMPLAZADO neutral | "Reemplazado" |
| `voided` | Anulado (e.g. error grave, duplicate emission) | cualquier non-terminal | (terminal) | ANULADO error | "Anulado" |

**Distinción clave** `regenerated` vs `superseded`:

- `regenerated`: misma identidad lógica de recibo (mismo `payroll_period_entry_id`), nuevo PDF asset porque cambió data (ej. corrección de un descuento). Mismo `document_version`. Misma fila DB.
- `superseded`: cuando el recálculo masivo HR produce un cambio estructural que requiere recibo nuevo (ej. retroactivo de aumento salarial que cambia montos imponibles). Nueva fila DB con `document_version+1`, vieja queda `superseded`.

## Helper canónico atomic (Slice 2)

Mirror exacto de TASK-863 V1.5.2 `regenerateDocumentPdfForStatus`:

```ts
// src/lib/payroll/receipt-documents/regenerate.ts
type ReceiptDocumentStatusForRegen =
  | 'emitted'
  | 'distributed'
  | 'regenerated'
  | 'superseded'
  | 'voided'

export const regenerateReceiptPdfForStatus = async (
  client: PoolClient,
  document: PayrollReceiptDocument,
  newStatus: ReceiptDocumentStatusForRegen,
  actorUserId: string
): Promise<{ pdfAssetId: string; contentHash: string } | null> => {
  try {
    const snapshot = document.snapshot
    const pdfBytes = await renderPayrollReceiptPdf(snapshot, { documentStatus: newStatus })
    const contentHash = computeBytesSha256(pdfBytes)
    const fileName = `recibo-nomina-${document.memberId}-${document.periodYear}-${String(document.periodMonth).padStart(2, '0')}-v${document.documentVersion}-${newStatus}.pdf`

    const asset = await storeSystemGeneratedPrivateAsset({
      ownerAggregateType: 'payroll_receipt_document',
      ownerAggregateId: document.payrollReceiptDocumentId,
      ownerMemberId: document.memberId,
      fileName,
      mimeType: 'application/pdf',
      bytes: pdfBytes,
      actorUserId,
      metadata: {
        payrollPeriodId: document.payrollPeriodId,
        payrollPeriodEntryId: document.payrollPeriodEntryId,
        periodYear: document.periodYear,
        periodMonth: document.periodMonth,
        documentVersion: document.documentVersion,
        documentStatusAtRender: newStatus,  // canonical key — drift detection
        contentHash
      }
    })

    await client.query(
      `UPDATE greenhouse_payroll.payroll_receipt_documents
       SET pdf_asset_id = $2, content_hash = $3, updated_at = NOW(), updated_by_user_id = $4
       WHERE payroll_receipt_document_id = $1`,
      [document.payrollReceiptDocumentId, asset.assetId, contentHash, actorUserId]
    )

    return { pdfAssetId: asset.assetId, contentHash }
  } catch (error) {
    captureWithDomain(error, 'payroll', {
      tags: {
        source: 'payroll_receipt_pdf_regen',
        stage: newStatus
      },
      extra: {
        payrollReceiptDocumentId: document.payrollReceiptDocumentId,
        memberId: document.memberId,
        documentVersion: document.documentVersion
      }
    })
    return null
  }
}
```

**Transition helpers** (uno por transition, mismo patrón TASK-863):

```ts
// src/lib/payroll/receipt-documents/store.ts
export const emitReceiptDocument(input: {
  payrollPeriodEntryId: string
  actorUserId: string
}): Promise<PayrollReceiptDocument>

export const markReceiptDocumentDistributed(input: {
  payrollReceiptDocumentId: string
  actorUserId: string
  distributionChannel: 'email' | 'portal' | 'teams' | 'manual'
}): Promise<PayrollReceiptDocument>

export const regenerateReceiptDocument(input: {
  payrollReceiptDocumentId: string
  actorUserId: string
  regenReason: string  // >= 10 chars
}): Promise<PayrollReceiptDocument>

export const supersedeReceiptDocument(input: {
  oldPayrollReceiptDocumentId: string
  newSnapshot: PayrollReceiptSnapshot
  actorUserId: string
  supersedeReason: string  // >= 10 chars
}): Promise<{ oldDocument: PayrollReceiptDocument; newDocument: PayrollReceiptDocument }>

export const voidReceiptDocument(input: {
  payrollReceiptDocumentId: string
  actorUserId: string
  voidReason: string  // >= 20 chars (terminal)
}): Promise<PayrollReceiptDocument>
```

Cada helper sigue el patrón canonical TASK-863 V1.5.2:

1. `SELECT FOR UPDATE` current document
2. `assertValidTransition` enforce matrix
3. UPDATE document_status + audit fields
4. INSERT `payroll_receipt_document_state_transitions` (append-only)
5. `regenerateReceiptPdfForStatus(client, document, newStatus, actorUserId)`
6. `publishOutboxEvent` per transition (versioned v1)
7. ROLLBACK completo si cualquier step falla
8. Return updated document

## Outbox Events V1 (6 canonicos)

Todos versioned v1, publican siempre (infra-pattern TASK-773). Payload mínimo: `{ payrollReceiptDocumentId, payrollPeriodEntryId, payrollPeriodId, memberId, periodYear, periodMonth, payRegime, documentVersion, actorUserId, ... }`.

| Event type | Emitido cuando | Payload extra |
| --- | --- | --- |
| `payroll.receipt.created.v1` | INSERT initial draft (status='rendered') | `{ snapshotHash }` |
| `payroll.receipt.emitted.v1` | `rendered → emitted` | `{ emittedAt, contentHash }` |
| `payroll.receipt.distributed.v1` | `emitted → distributed` | `{ distributedAt, distributionChannel }` |
| `payroll.receipt.regenerated.v1` | `emitted/distributed → regenerated` (same identity) | `{ regenReason, previousContentHash, newContentHash }` |
| `payroll.receipt.superseded.v1` | `* → superseded` (replaced by next version) | `{ supersededByDocumentId, supersedeReason }` |
| `payroll.receipt.voided.v1` | `* → voided` (terminal) | `{ voidedAt, voidReason }` |

Registro en `src/lib/sync/event-catalog.ts` + documentación en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.

## Reactive Consumer (Slice 3) — Registry Sync

Mirror del patrón TASK-489 V2.1 `documentRegistryLinkedDocumentSyncProjection`, dedicado a receipts:

```ts
// src/lib/sync/projections/payroll-receipt-document-registry-sync.ts
const payrollReceiptDocumentRegistryProjection: ProjectionDefinition = {
  name: 'payroll_receipt_registry_sync',
  triggerEvents: [
    'payroll.receipt.created.v1',
    'payroll.receipt.emitted.v1',
    'payroll.receipt.distributed.v1',
    'payroll.receipt.regenerated.v1',
    'payroll.receipt.superseded.v1',
    'payroll.receipt.voided.v1'
  ],
  extractScope: (event) => ({
    payrollReceiptDocumentId: event.payload.payrollReceiptDocumentId
  }),
  refresh: async ({payrollReceiptDocumentId}) => {
    // 1. Re-read payroll_receipt_document from PG (NEVER trust event payload)
    // 2. UPSERT documents row (kind='linked', document_type='payroll_receipt',
    //    linked_aggregate_table='greenhouse_payroll.payroll_receipt_documents',
    //    linked_aggregate_id=payrollReceiptDocumentId)
    // 3. UPSERT document_payroll_receipt_link bridge
    // 4. UPSERT document_member_link (member_id desde receipt, link_role='subject')
    // 5. Map TASK-868 state → registry verification_status:
    //    rendered → pending_review
    //    emitted, distributed, regenerated → verified
    //    superseded → superseded
    //    voided → archived (with reason)
    // 6. INSERT INTO document_verification_audit_log (proxy sync trace)
  },
  maxRetries: 5
}
```

**Status state mapping (TASK-868 aggregate → TASK-489 registry)**:

| Aggregate state | Registry `verification_status` | Registry `is_archived` |
| --- | --- | --- |
| `rendered` | `pending_review` | FALSE |
| `emitted` | `verified` | FALSE |
| `distributed` | `verified` | FALSE |
| `regenerated` | `verified` | FALSE |
| `superseded` | `superseded` | FALSE |
| `voided` | `archived` | TRUE (with reason) |

## Reliability Signals (3, subsystem `Payroll Data Quality`)

Pattern TASK-863 V1.5.2 + Greenhouse overlay #8. Todos kind=`drift`, steady=0.

| Signal | Kind | Severity | Steady | Detección |
| --- | --- | --- | --- | --- |
| `payroll.receipt.pdf_status_drift` | drift | warning si count>0, error si >24h | 0 | `document_status != asset.metadata_json->>'documentStatusAtRender'` (mirror TASK-863 V1.5.2 pattern) |
| `payroll.receipt.emission_lag` | lag | warning si >7d post-`payroll_period.exported`, error si >30d | 0 | `payroll_period_entries.is_exported=TRUE AND NOT EXISTS (payroll_receipt_documents)` por entry |
| `payroll.receipt.regen_dead_letter` | dead_letter | error si count>0 | 0 | `outbox_events.status='dead_letter' AND event_type LIKE 'payroll.receipt.%'` |

Readers en `src/lib/reliability/queries/payroll-receipt-*.ts`. Wire-up en `getReliabilityOverview.payrollReceiptDocuments` (preloaded sources field).

## Capabilities (heredadas, no nuevas)

NO se introducen capabilities nuevas. Heredan las 6 de TASK-489/492:

- `documents.read_masked` — colaborador ve sus recibos en `/my/documents`; HR ve tenant scope.
- `documents.upload` — N/A (recibos NO se uploadean — se generan).
- `documents.verify` — N/A (recibos NO pasan verification HR — emitted = verified automático).
- `documents.reveal_sensitive` — HR + EFEONCE_ADMIN para ver montos completos (member ve summary only).
- `documents.export_snapshot` — HR + EFEONCE_ADMIN para exportar PDF para auditor externo.
- `documents.archive` — HR + EFEONCE_ADMIN para void manual.

Capability check ocurre en el registry-side (TASK-489); el aggregate TASK-868 hereda automáticamente via el reactive consumer + reader del registry.

## Scope (4 slices)

### Slice 1 — Schema migration + types Kysely (~3-4h)

- `pnpm migrate:create task-868-payroll-receipt-documents`
- Aplicar DDL: aggregate + audit log + bridge + catalog entry + extend CHECK enum.
- Seed: 1 row en `document_type_catalog` (`payroll_receipt`).
- Verify post-migration: `information_schema` checks + bloque DO con RAISE EXCEPTION.
- `pnpm db:generate-types` regenera Kysely.
- Domain types en `src/types/payroll-receipt-documents.ts`.
- Live test `payroll-receipt-foundation.live.test.ts` contra PG real.

### Slice 2 — Aggregate helpers + state machine + auto-regen (~5-6h)

- `src/lib/payroll/receipt-documents/state-machine.ts` — declarative matrix + `assertValidTransition`.
- `src/lib/payroll/receipt-documents/regenerate.ts` — `regenerateReceiptPdfForStatus` mirror TASK-863 V1.5.2.
- `src/lib/payroll/receipt-documents/store.ts` — 5 transition helpers (emit, distributed, regenerate, supersede, void).
- `src/lib/payroll/receipt-documents/document-pdf.tsx` — wrapper sobre TASK-758 `generate-payroll-pdf.tsx` que acepta `documentStatus` y dispara watermark canónico.
- Test anti-regresión `document-status-regen-invariant.test.ts` (mirror TASK-863 V1.5.2): parsea source y enforce que TODA `SET document_status = 'X'` tiene helper call matchedo.
- Tests unitarios + live tests con PG real.

### Slice 3 — Outbox events + reactive consumer + reliability signals (~3-4h)

- 6 event types registrados en `src/lib/sync/event-catalog.ts`.
- Reactive consumer `payrollReceiptDocumentRegistryProjection` en `src/lib/sync/projections/payroll-receipt-document-registry-sync.ts`.
- Wire-up en `src/lib/sync/projections/index.ts`.
- 3 reliability signal readers + wire-up en `getReliabilityOverview`.
- Tests per signal + reactive consumer.

### Slice 4 — Wire-up con payroll emission flow + docs (~2-3h)

- Modificar el flow de `payroll_period.exported` (TASK-748) para que **crear receipt_document** (status='rendered') per entry sea atomic + emit `payroll.receipt.created.v1`.
- Modificar `HrPayrollExportView` (o equivalent) para trigger `emitReceiptDocument` per entry (transition `rendered → emitted`).
- Docs funcional `docs/documentation/hr/recibos-de-nomina.md` (lenguaje simple).
- Manual de uso `docs/manual-de-uso/hr/recibos-de-nomina.md` (operador HR + colaborador).
- Spec arch `docs/architecture/GREENHOUSE_PAYROLL_RECEIPT_DOCUMENTS_V1_SPEC.md`.
- ADR entry en `DECISIONS_INDEX.md`.
- CLAUDE.md sección "Payroll Receipt Document Lifecycle invariants" (mirror TASK-863 V1.5.2 hard rules).

## Out of Scope

- UI dedicado de gestión de recibos (TASK-758 + TASK-782 existentes son suficientes V1).
- Cron de retention archive >5 años (follow-up cuando emerja necesidad real; mientras tanto soft-tombstone via `voided`).
- Distribución automática via email/Teams (follow-up: hoy operador HR descarga + envía manual).
- Signature pattern (recibos NO se firman; pago es la firma implícita).
- Bulk regen post-period-recalc UI (script CLI suficiente V1; UI cuando emerja).
- Member-facing reveal (member solo ve own summary; reveal HR-only V1).
- Integration con AFP/Previred export (TASK-812 cubre esto separado).

## 4-Pillar Score (required al cerrar Slice 4)

### Safety

- **What can go wrong**: cross-tenant receipt leak (member B ve recibo de member A); reveal de montos sin reason+audit; orphan aggregate row con `pdf_asset_id` apuntando a asset deleted.
- **Gates**: capability check delegate al registry (TASK-489); reveal pattern heredado; tenant filter automático via `member_id` FK + reader del registry.
- **Blast radius if wrong**: cross-member leak → 1 colaborador entero (datos sensibles montos + descuentos + AFP). Mitigado por bridge FK + reader filter + reveal audit log.
- **Verified by**: live PG tests con 2 members + cross-read assertion; reveal audit log con anti-UPDATE trigger; reliability signal `payroll.receipt.pdf_status_drift`.
- **Residual risk**: NO RLS PG V1 (heredado TASK-489); reader-enforced suffice. Code review obligatorio en cualquier nuevo callsite de `payroll_receipt_documents`.

### Robustness

- **Idempotency**: `payroll_period_entry_id UNIQUE` previene duplicate aggregate per entry; helper `emitReceiptDocument` idempotent (re-call retorna existing row).
- **Atomicity**: helper `emitReceiptDocument(input, client?)` envuelve UPDATE + regen + audit + outbox en una tx PG. Rollback completo si cualquier step falla.
- **Race protection**: partial UNIQUE INDEX `active_per_entry_idx` previene dos active documents per entry; `SELECT FOR UPDATE` en supersede helper.
- **Constraint coverage**: 7 CHECKs (status enum, regime enum, period_month range, version positive, emitted_invariant, voided_invariant, superseded_invariant) + FK strict RESTRICT + state machine matrix enforced en helper.
- **Verified by**: live PG test idempotency + concurrency (2 emits simultaneous → second falla con UNIQUE constraint); state machine matrix unit tests; test anti-regresión enforce regen per transition.

### Resilience

- **Retry policy**: outbox events state machine canonical TASK-773 (`pending → publishing → published | failed → dead_letter`). N=5 retries con exponential backoff.
- **Dead letter**: `outbox_events.status='dead_letter' AND event_type LIKE 'payroll.receipt.%'` → reliability signal.
- **Reliability signals**: 3 signals (`pdf_status_drift`, `emission_lag`, `regen_dead_letter`), kind=drift, steady=0.
- **Audit trail**: `payroll_receipt_document_state_transitions` append-only + anti-UPDATE/anti-DELETE triggers; reveal audit log heredado registry.
- **Recovery procedure**: helper `emitReceiptDocument` idempotent permite re-correr post-failure; script `scripts/payroll/regen-receipts-for-period.ts` bulk regen idempotent.

### Scalability

- **Hot path Big-O**: read por member O(log n) via composite index `(member_id, period_year DESC, period_month DESC)`; read por period O(log n) via `(payroll_period_id, document_status)`.
- **Index coverage**: PKs + 4 indexes (member_period, period_status, pending_regen partial, active_per_entry partial UNIQUE).
- **Async paths**: outbox events publican via Cloud Scheduler; reactive consumer registry-side async; bulk regen via script offline.
- **Cost at 10x**: ~12 receipts/colaborador/año × 5 años retención = ~60 docs/colaborador. Para 100 colaboradores = 60k rows Y5. Manejable PG; partitioning por `period_year` cuando crucemos 500k rows (re-evaluate Y10).
- **Pagination**: cursor keyset on `(period_year DESC, period_month DESC, payroll_receipt_document_id ASC)` en reader.

## Acceptance Criteria

- [ ] Slice 1 entregado: migration aplicada, 2 tables + bridge + catalog entry exist, types regenerados, live test verde.
- [ ] Slice 2 entregado: 5 transition helpers + auto-regen helper + state machine matrix declarative, test anti-regresión enforce regen per transition, unit + live tests verdes.
- [ ] Slice 3 entregado: 6 event types registrados, reactive consumer registry sync funcional, 3 reliability signals con readers + wire-up + tests.
- [ ] Slice 4 entregado: wire-up con payroll emission flow, docs funcional + manual de uso + spec arch + ADR + CLAUDE.md hard rules.
- [ ] 4-pillar score completado al cerrar Slice 4.
- [ ] Cero `Sentry.captureException` directo; toda observabilidad via `captureWithDomain('payroll', ...)`.
- [ ] Test anti-regresión `document-status-regen-invariant.test.ts` verde (mirror TASK-863 V1.5.2).
- [ ] Recibos emitidos aparecen en `/my/documents` via reactive sync al registry (sin lógica reader special).
- [ ] Verify trigger anti-UPDATE: UPDATE en `payroll_receipt_document_state_transitions` falla.
- [ ] Verify partial UNIQUE active: 2 active documents per entry falla.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/payroll/receipt-documents src/lib/reliability/queries/payroll-receipt-*`
- `pnpm test src/lib/payroll/receipt-documents/*.live.test.ts` (skipea sin Cloud SQL connection)
- `pnpm build`
- `pnpm pg:doctor` (verifica owner + grants + constraints)
- Smoke E2E: período de prueba → emit receipt → download PDF → verify status = 'emitted' + watermark CLEAN + badge 'Emitido'.
- Real-Artifact Verification Loop (TASK-863 methodology): emitir 1 caso real (colaborador real, período real) → capturar PDF → 3-skill audit (`greenhouse-payroll-auditor` + UX writing es-CL operativo + `modern-ui`) → iterar hasta zero blockers → canonizar.

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados (move to `complete/`).
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con resumen Slice 1-4.
- [ ] `changelog.md` entry con resumen + decisiones canonizadas.
- [ ] `project_context.md` actualizado con namespace nuevo `greenhouse_payroll.payroll_receipt_documents.*`.
- [ ] `docs/architecture/GREENHOUSE_PAYROLL_RECEIPT_DOCUMENTS_V1_SPEC.md` creado.
- [ ] ADR entry en `DECISIONS_INDEX.md`.
- [ ] CLAUDE.md sección nueva "Payroll Receipt Document Lifecycle invariants".
- [ ] TASK-494 (HR Document Vault) actualizada con surfacing de recibos en `/my/documents`.
- [ ] Doc funcional `docs/documentation/hr/recibos-de-nomina.md` creado.
- [ ] Manual de uso `docs/manual-de-uso/hr/recibos-de-nomina.md` creado.

## Hard Rules (canonical anti-regression)

- **NUNCA** mutar `document_status` directo vía SQL bypasseando el helper canónico. La matrix vive en código + DB CHECK; el helper enforce ambos. Test anti-regresión `document-status-regen-invariant.test.ts` rompe build si emerge transition nueva sin regen.
- **NUNCA** modificar `payroll_receipt_document_state_transitions` post-INSERT. Append-only enforced por anti-UPDATE + anti-DELETE trigger.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths de `src/lib/payroll/receipt-documents/`. Usar `captureWithDomain(err, 'payroll', { tags: { source: 'payroll_receipt_*' } })`.
- **NUNCA** crear `payroll_receipt_documents` row sin `payroll_period_entry_id` FK válido. UNIQUE constraint + FK enforce.
- **NUNCA** marcar `document_status='emitted'` sin pasar por `emitReceiptDocument` helper. Helper enforce: capability + state machine + audit + regen + outbox event en una sola tx.
- **NUNCA** descargar el PDF de un recibo sin pasar por el endpoint canónico que verifica capability + scope. Member only access su propio recibo; HR access tenant scope.
- **NUNCA** mostrar montos completos en UI cliente sin pasar por `revealDocument` helper del registry (TASK-489 V2.1). Masking server-side por default; reveal con reason + audit.
- **NUNCA** regenerar un recibo sin razón documentada (`regenReason >= 10 chars`). Audit log captura razón obligatoria.
- **NUNCA** void un recibo sin razón explícita (`voidReason >= 20 chars`). Terminal action requiere justificación.
- **NUNCA** linkear recibo al registry directamente vía SQL. El reactive consumer `payrollReceiptDocumentRegistryProjection` es el único path canonical.
- **SIEMPRE** que el payroll_period.exported event se emita, crear `payroll_receipt_documents` rows (status='rendered') per entry en la misma tx que el export commit. Atomicidad enforce.
- **SIEMPRE** que un recibo emerja como caso real (primer colaborador, primer período productivo), aplicar Real-Artifact Verification Loop (TASK-863 methodology): emit → capture → 3-skill audit → iterate.

## Patrones canónicos fuente (replicados verbatim)

1. **`greenhouse_payroll.final_settlement_documents` (TASK-862/863 V1.5.2)** — patrón fuente exacto. Mismo schema shape (status enum + version + asset_id + audit), mismo state machine pattern (transition matrix + helper canonical + audit append-only), mismo auto-regen pattern (regenerate helper + metadata.documentStatusAtRender), misma defense-in-depth (5 capas).
2. **TASK-758 receipt presenter** — `buildReceiptPresentation`, `groupEntriesByRegime`, `RECEIPT_REGIME_BADGES`. NO rewrite — esta task lo wraps con `documentStatus` arg.
3. **TASK-489 V2.1 document registry** — linked aggregate pattern, reactive consumer sync, bridge dedicated, retention class heredado.
4. **TASK-742 7-layer defense template** — capability + DB constraint + UI affordance + reliability signal + audit log + outbox event v1 + helper canónico atomic.
5. **TASK-771/773 outbox + reactive consumer** — state machine `pending → publishing → published | failed → dead_letter` con N=5 retries.
6. **TASK-700 + TASK-765 state machine pattern** — append-only audit + anti-UPDATE/DELETE triggers + state machine matrix + helper canonical atomic.

## Open Questions (deliberately deferred)

- **Distribución automática email/Teams**: ¿el reactive consumer dispara también notification al colaborador al `distributed` transition? Out of scope V1 — operador HR controla manual. Follow-up cuando emerja SLA de distribución.
- **Bulk regen UI**: ¿operador HR tiene botón "regenerar todos los recibos del período" en `/hr/payroll/periods/[id]`? Out of scope V1 — script CLI suffice. UI cuando emerja volume.
- **Reveal granularity**: ¿member ve summary (líquido a pagar) vs full breakdown (haberes + descuentos)? V1: member ve summary; HR reveal con reason. Granularidad fina V2 si emerge necesidad.
- **Honorarios receipts**: ¿boletas de honorarios chilenas (régimen `honorarios`) son `payroll_receipt` mismo type o type separado? V1: mismo type (regime is a column, not separate type). Re-evaluate si SII compliance lo requiere.
- **International receipts (Deel)**: ¿el PDF generado por Deel se persiste como `payroll_receipt` linked o solo se referencia? V1: mismo type (regime='international_deel'); el PDF puede venir de Deel API o regenerated localmente. Bridge a `deel_contract_id` opcional.
- **Multi-currency**: ¿USD/EUR receipts requieren CLP equivalent? V1: persistir native currency; CLP equivalent calculado en read time desde FX history (TASK-766 pattern).

## Effort estimate

- Slice 1: 3-4h
- Slice 2: 5-6h
- Slice 3: 3-4h
- Slice 4: 2-3h
- **Total: 13-17h** (≈2 días enfocados)

## Notes

- Esta task NO duplica TASK-758 (que sigue dueño del receipt presenter UI). Wraps el render existente con state machine + persistence.
- Asset bytes (PDF) **persistido** post-emit (vs hoy: generado on-demand cada request). Trade-off: storage (~50KB/recibo × 60k recibos Y5 ≈ 3GB) vs latency (read instantáneo) + immutability (PDF emitted = inmutable hasta regen explícito). Storage cost negligible vs benefit.
- TASK-494 (HR Document Vault) hereda surfacing uniforme cuando esta task cierre — cero lógica reader special.
