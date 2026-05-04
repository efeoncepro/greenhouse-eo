-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_payroll.final_settlement_documents (
  final_settlement_document_id           TEXT PRIMARY KEY,
  offboarding_case_id                    TEXT NOT NULL REFERENCES greenhouse_hr.work_relationship_offboarding_cases(offboarding_case_id) ON DELETE RESTRICT,
  final_settlement_id                    TEXT NOT NULL REFERENCES greenhouse_payroll.final_settlements(final_settlement_id) ON DELETE RESTRICT,
  settlement_version                     INTEGER NOT NULL CHECK (settlement_version >= 1),
  document_version                       INTEGER NOT NULL DEFAULT 1 CHECK (document_version >= 1),
  supersedes_document_id                 TEXT REFERENCES greenhouse_payroll.final_settlement_documents(final_settlement_document_id) ON DELETE RESTRICT,
  member_id                              TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE RESTRICT,
  profile_id                             TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  person_legal_entity_relationship_id    TEXT REFERENCES greenhouse_core.person_legal_entity_relationships(relationship_id) ON DELETE RESTRICT,
  legal_entity_organization_id           TEXT NOT NULL REFERENCES greenhouse_core.organizations(organization_id) ON DELETE RESTRICT,
  document_template_code                 TEXT NOT NULL DEFAULT 'cl_final_settlement_resignation_v1',
  document_template_version              TEXT NOT NULL,
  document_status                        TEXT NOT NULL DEFAULT 'draft' CHECK (document_status IN (
                                             'draft',
                                             'rendered',
                                             'in_review',
                                             'approved',
                                             'issued',
                                             'signed_or_ratified',
                                             'rejected',
                                             'voided',
                                             'superseded',
                                             'cancelled'
                                           )),
  render_status                          TEXT NOT NULL DEFAULT 'pending' CHECK (render_status IN ('pending', 'rendered', 'failed')),
  signature_status                       TEXT NOT NULL DEFAULT 'not_started' CHECK (signature_status IN (
                                             'not_started',
                                             'external_process_pending',
                                             'signed_or_ratified',
                                             'rejected',
                                             'voided'
                                           )),
  snapshot_json                          JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_hash                          TEXT NOT NULL,
  content_hash                           TEXT,
  asset_id                               TEXT REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  pdf_asset_id                           TEXT REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  approval_snapshot_id                   TEXT REFERENCES greenhouse_hr.workflow_approval_snapshots(snapshot_id) ON DELETE SET NULL,
  readiness_json                         JSONB NOT NULL DEFAULT '{}'::jsonb,
  render_error                           TEXT,
  review_requested_at                    TIMESTAMPTZ,
  review_requested_by_user_id            TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  approved_at                            TIMESTAMPTZ,
  approved_by_user_id                    TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  issued_at                              TIMESTAMPTZ,
  issued_by_user_id                      TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  signature_evidence_asset_id            TEXT REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  signature_evidence_ref                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  signed_or_ratified_at                  TIMESTAMPTZ,
  signed_or_ratified_by_user_id          TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  worker_reservation_of_rights           BOOLEAN NOT NULL DEFAULT FALSE,
  worker_reservation_notes               TEXT,
  rejected_by_worker_at                  TIMESTAMPTZ,
  rejected_by_worker_by_user_id          TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  rejected_by_worker_reason              TEXT,
  voided_at                              TIMESTAMPTZ,
  voided_by_user_id                      TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  void_reason                            TEXT,
  cancelled_at                           TIMESTAMPTZ,
  cancelled_by_user_id                   TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  cancel_reason                          TEXT,
  created_by_user_id                     TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  updated_by_user_id                     TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  created_at                             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT final_settlement_documents_settlement_version_unique
    UNIQUE (final_settlement_id, document_version),
  CONSTRAINT final_settlement_documents_rendered_check
    CHECK (document_status NOT IN ('rendered', 'in_review', 'approved', 'issued', 'signed_or_ratified') OR (render_status = 'rendered' AND pdf_asset_id IS NOT NULL AND content_hash IS NOT NULL)),
  CONSTRAINT final_settlement_documents_review_check
    CHECK (document_status <> 'in_review' OR (review_requested_at IS NOT NULL AND review_requested_by_user_id IS NOT NULL AND approval_snapshot_id IS NOT NULL)),
  CONSTRAINT final_settlement_documents_approved_check
    CHECK (document_status NOT IN ('approved', 'issued', 'signed_or_ratified') OR (approved_at IS NOT NULL AND approved_by_user_id IS NOT NULL AND approval_snapshot_id IS NOT NULL)),
  CONSTRAINT final_settlement_documents_issued_check
    CHECK (document_status NOT IN ('issued', 'signed_or_ratified') OR (issued_at IS NOT NULL AND issued_by_user_id IS NOT NULL AND pdf_asset_id IS NOT NULL)),
  CONSTRAINT final_settlement_documents_signed_check
    CHECK (
      document_status <> 'signed_or_ratified'
      OR (
        signed_or_ratified_at IS NOT NULL
        AND signed_or_ratified_by_user_id IS NOT NULL
        AND (
          signature_evidence_asset_id IS NOT NULL
          OR signature_evidence_ref <> '{}'::jsonb
        )
      )
    ),
  CONSTRAINT final_settlement_documents_rejected_check
    CHECK (document_status <> 'rejected' OR (rejected_by_worker_at IS NOT NULL AND NULLIF(BTRIM(COALESCE(rejected_by_worker_reason, '')), '') IS NOT NULL)),
  CONSTRAINT final_settlement_documents_voided_check
    CHECK (document_status <> 'voided' OR (voided_at IS NOT NULL AND voided_by_user_id IS NOT NULL AND NULLIF(BTRIM(COALESCE(void_reason, '')), '') IS NOT NULL)),
  CONSTRAINT final_settlement_documents_cancelled_check
    CHECK (document_status <> 'cancelled' OR (cancelled_at IS NOT NULL AND cancelled_by_user_id IS NOT NULL AND NULLIF(BTRIM(COALESCE(cancel_reason, '')), '') IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS final_settlement_documents_one_active_idx
  ON greenhouse_payroll.final_settlement_documents (final_settlement_id)
  WHERE document_status NOT IN ('rejected', 'voided', 'superseded', 'cancelled');

CREATE INDEX IF NOT EXISTS final_settlement_documents_case_created_idx
  ON greenhouse_payroll.final_settlement_documents (offboarding_case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS final_settlement_documents_member_created_idx
  ON greenhouse_payroll.final_settlement_documents (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS final_settlement_documents_status_created_idx
  ON greenhouse_payroll.final_settlement_documents (document_status, created_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_payroll.final_settlement_document_events (
  event_id                              TEXT PRIMARY KEY,
  final_settlement_document_id          TEXT NOT NULL REFERENCES greenhouse_payroll.final_settlement_documents(final_settlement_document_id) ON DELETE CASCADE,
  offboarding_case_id                   TEXT NOT NULL REFERENCES greenhouse_hr.work_relationship_offboarding_cases(offboarding_case_id) ON DELETE RESTRICT,
  final_settlement_id                   TEXT NOT NULL REFERENCES greenhouse_payroll.final_settlements(final_settlement_id) ON DELETE RESTRICT,
  event_type                            TEXT NOT NULL,
  from_status                           TEXT,
  to_status                             TEXT,
  actor_user_id                         TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  reason                                TEXT,
  payload                               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS final_settlement_document_events_doc_created_idx
  ON greenhouse_payroll.final_settlement_document_events (final_settlement_document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS final_settlement_document_events_case_created_idx
  ON greenhouse_payroll.final_settlement_document_events (offboarding_case_id, created_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_payroll.touch_final_settlement_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_final_settlement_documents_touch_updated_at
  ON greenhouse_payroll.final_settlement_documents;

CREATE TRIGGER trg_final_settlement_documents_touch_updated_at
  BEFORE UPDATE ON greenhouse_payroll.final_settlement_documents
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_payroll.touch_final_settlement_documents_updated_at();

ALTER TABLE greenhouse_payroll.final_settlement_documents OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.final_settlement_document_events OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_payroll.touch_final_settlement_documents_updated_at() OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlement_documents TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlement_document_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlement_documents TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlement_document_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlement_documents TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlement_document_events TO greenhouse_migrator;

COMMENT ON TABLE greenhouse_payroll.final_settlement_documents IS
  'TASK-762 immutable Chile finiquito document aggregate. Child of an approved final_settlement; stores document approval/issuance/ratification state separately from calculation state.';

COMMENT ON COLUMN greenhouse_payroll.final_settlement_documents.snapshot_json IS
  'Immutable render snapshot copied from the approved final settlement, offboarding case, collaborator, legal entity and template metadata.';

COMMENT ON COLUMN greenhouse_payroll.final_settlement_documents.snapshot_hash IS
  'SHA-256 over canonical snapshot_json. Approval and issue transitions fail closed if the hash no longer matches the stored snapshot.';

COMMENT ON TABLE greenhouse_payroll.final_settlement_document_events IS
  'Append-only audit trail for TASK-762 finiquito document render, approval, issuance, rejection, void and ratification transitions.';

-- Down Migration

DROP TRIGGER IF EXISTS trg_final_settlement_documents_touch_updated_at
  ON greenhouse_payroll.final_settlement_documents;
DROP FUNCTION IF EXISTS greenhouse_payroll.touch_final_settlement_documents_updated_at();
DROP TABLE IF EXISTS greenhouse_payroll.final_settlement_document_events;
DROP TABLE IF EXISTS greenhouse_payroll.final_settlement_documents;
