-- Up Migration

ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS issued_by text,
  ADD COLUMN IF NOT EXISTS approval_rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_rejected_by text;

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_status_check;

UPDATE greenhouse_commercial.quotations
SET legacy_status = COALESCE(legacy_status, status),
    status = CASE
      WHEN status IN ('sent', 'approved', 'accepted') THEN 'issued'
      WHEN status = 'rejected' THEN 'approval_rejected'
      ELSE status
    END,
    issued_at = CASE
      WHEN status IN ('sent', 'approved', 'accepted') THEN COALESCE(issued_at, sent_at, approved_at, updated_at, created_at)
      ELSE issued_at
    END,
    issued_by = CASE
      WHEN status IN ('sent', 'approved', 'accepted') THEN COALESCE(issued_by, approved_by, created_by)
      ELSE issued_by
    END,
    approval_rejected_at = CASE
      WHEN status = 'rejected' THEN COALESCE(approval_rejected_at, updated_at, created_at)
      ELSE approval_rejected_at
    END,
    approval_rejected_by = CASE
      WHEN status = 'rejected' THEN COALESCE(approval_rejected_by, approved_by)
      ELSE approval_rejected_by
    END
WHERE status IN ('sent', 'approved', 'accepted', 'rejected');

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'draft'::text,
        'pending_approval'::text,
        'approval_rejected'::text,
        'issued'::text,
        'expired'::text,
        'converted'::text
      ]
    )
  );

ALTER TABLE greenhouse_commercial.quotation_audit_log
  DROP CONSTRAINT IF EXISTS quotation_audit_log_action_check;

ALTER TABLE greenhouse_commercial.quotation_audit_log
  ADD CONSTRAINT quotation_audit_log_action_check
  CHECK (
    action = ANY (
      ARRAY[
        'created'::text,
        'updated'::text,
        'status_changed'::text,
        'line_item_added'::text,
        'line_item_updated'::text,
        'line_item_removed'::text,
        'discount_changed'::text,
        'terms_changed'::text,
        'version_created'::text,
        'pdf_generated'::text,
        'issue_requested'::text,
        'issued'::text,
        'sent'::text,
        'approval_requested'::text,
        'approval_decided'::text,
        'approval_rejected'::text,
        'po_received'::text,
        'hes_received'::text,
        'invoice_triggered'::text,
        'renewal_generated'::text,
        'expired'::text,
        'template_used'::text,
        'template_saved'::text
      ]
    )
  );

CREATE INDEX IF NOT EXISTS idx_commercial_quotations_issued_status
  ON greenhouse_commercial.quotations (organization_id, status, issued_at DESC)
  WHERE status = 'issued';

COMMENT ON COLUMN greenhouse_commercial.quotations.issued_at IS
  'Timestamp canónico de emisión documental. `sent_at` queda como columna legacy de compatibilidad mientras los consumers migran.';

COMMENT ON COLUMN greenhouse_commercial.quotations.issued_by IS
  'Actor que emitió la versión documental oficial.';

COMMENT ON COLUMN greenhouse_commercial.quotations.approval_rejected_at IS
  'Timestamp del rechazo por aprobación de excepción para la versión vigente.';

COMMENT ON COLUMN greenhouse_commercial.quotations.approval_rejected_by IS
  'Actor que rechazó la aprobación por excepción de la versión vigente.';

COMMENT ON COLUMN greenhouse_commercial.quotations.sales_context_at_sent IS
  'Snapshot histórico del contexto comercial al momento de emisión documental. El nombre del campo queda legacy por compatibilidad con TASK-455.';

COMMENT ON TABLE greenhouse_commercial.approval_steps IS
  'Aprobaciones asociadas a una versión específica de una cotización. Una quote en pending_approval tiene N steps; todos deben aprobarse para pasar a issued.';

-- Down Migration

DROP INDEX IF EXISTS idx_commercial_quotations_issued_status;

ALTER TABLE greenhouse_commercial.quotation_audit_log
  DROP CONSTRAINT IF EXISTS quotation_audit_log_action_check;

ALTER TABLE greenhouse_commercial.quotation_audit_log
  ADD CONSTRAINT quotation_audit_log_action_check
  CHECK (
    action = ANY (
      ARRAY[
        'created'::text,
        'updated'::text,
        'status_changed'::text,
        'line_item_added'::text,
        'line_item_updated'::text,
        'line_item_removed'::text,
        'discount_changed'::text,
        'terms_changed'::text,
        'version_created'::text,
        'pdf_generated'::text,
        'sent'::text,
        'approval_requested'::text,
        'approval_decided'::text,
        'po_received'::text,
        'hes_received'::text,
        'invoice_triggered'::text,
        'renewal_generated'::text,
        'expired'::text,
        'template_used'::text,
        'template_saved'::text
      ]
    )
  );

UPDATE greenhouse_commercial.quotations
SET status = CASE
      WHEN status = 'issued' THEN COALESCE(legacy_status, 'sent')
      WHEN status = 'approval_rejected' THEN COALESCE(legacy_status, 'rejected')
      ELSE status
    END
WHERE status IN ('issued', 'approval_rejected');

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_status_check;

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'draft'::text,
        'pending_approval'::text,
        'sent'::text,
        'approved'::text,
        'rejected'::text,
        'expired'::text,
        'converted'::text
      ]
    )
  );

ALTER TABLE greenhouse_commercial.quotations
  DROP COLUMN IF EXISTS approval_rejected_by,
  DROP COLUMN IF EXISTS approval_rejected_at,
  DROP COLUMN IF EXISTS issued_by,
  DROP COLUMN IF EXISTS issued_at;
