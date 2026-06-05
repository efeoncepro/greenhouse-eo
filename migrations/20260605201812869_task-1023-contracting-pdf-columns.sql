-- Up Migration
--
-- TASK-1023 — Workforce Contracting Studio: PDF / signable render consumer.
-- Additive columns on the contracting aggregate so the case OWNS its rendered PDF
-- (mirror finiquito TASK-863 V1.5.2: aggregate-owned pdf_asset_id + content_hash +
-- auto-regen per status; the unified document registry surfaces it as kind='linked'
-- later). Plus an immutable facts snapshot for reproducible re-renders, and a captured
-- facts column on drafts so the render reads structured terms (offer termscard) instead
-- of parsing prose (OQ2). All columns nullable -> zero behavioural change at apply time.

-- 1. Case PDF columns (rendered + signed artifact + render audit + immutable snapshot).
ALTER TABLE greenhouse_hr.workforce_contracting_cases
  ADD COLUMN IF NOT EXISTS pdf_asset_id          TEXT REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signed_pdf_asset_id   TEXT REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pdf_content_hash      TEXT,
  ADD COLUMN IF NOT EXISTS pdf_template_version  TEXT,
  ADD COLUMN IF NOT EXISTS pdf_status_at_render  TEXT,
  ADD COLUMN IF NOT EXISTS pdf_generated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_facts_snapshot    JSONB;

COMMENT ON COLUMN greenhouse_hr.workforce_contracting_cases.pdf_asset_id IS
  'TASK-1023 - rendered (unsigned) signable PDF private asset (greenhouse_core.assets). Auto-regen per status.';
COMMENT ON COLUMN greenhouse_hr.workforce_contracting_cases.signed_pdf_asset_id IS
  'TASK-1023 (reserved, populated by TASK-1024) - signed PDF artifact returned by ZapSign.';
COMMENT ON COLUMN greenhouse_hr.workforce_contracting_cases.pdf_content_hash IS
  'TASK-1023 - SHA-256 of the rendered PDF bytes (reproducibility/verification).';
COMMENT ON COLUMN greenhouse_hr.workforce_contracting_cases.pdf_status_at_render IS
  'TASK-1023 - case status when the PDF was last rendered (drift detection vs asset metadata documentStatusAtRender).';
COMMENT ON COLUMN greenhouse_hr.workforce_contracting_cases.pdf_facts_snapshot IS
  'TASK-1023 - immutable facts snapshot (employer + worker + terms + structured content) captured at first render; reused for re-renders so an approved document never changes if identities change later (OQ1).';

-- 2. Draft captured facts (the sanitised ALLOWED_FACT_CODES allowlist that produced the draft).
ALTER TABLE greenhouse_hr.workforce_contracting_drafts
  ADD COLUMN IF NOT EXISTS captured_facts_json JSONB;

COMMENT ON COLUMN greenhouse_hr.workforce_contracting_drafts.captured_facts_json IS
  'TASK-1023 - structured document-necessary facts (gross_amount, role_title, etc.) the PDF render reads for the offer termscard instead of parsing prose (OQ2). Nullable for manual drafts.';

-- 3. Index for the drift signal hot path (cases with a rendered PDF).
CREATE INDEX IF NOT EXISTS workforce_contracting_cases_pdf_rendered_idx
  ON greenhouse_hr.workforce_contracting_cases (pdf_status_at_render)
  WHERE pdf_asset_id IS NOT NULL;

-- 4. Anti pre-up-marker bug guard: abort if the columns were not actually created.
DO $$
DECLARE missing INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing
  FROM (VALUES
    ('workforce_contracting_cases', 'pdf_asset_id'),
    ('workforce_contracting_cases', 'signed_pdf_asset_id'),
    ('workforce_contracting_cases', 'pdf_content_hash'),
    ('workforce_contracting_cases', 'pdf_template_version'),
    ('workforce_contracting_cases', 'pdf_status_at_render'),
    ('workforce_contracting_cases', 'pdf_generated_at'),
    ('workforce_contracting_cases', 'pdf_facts_snapshot'),
    ('workforce_contracting_drafts', 'captured_facts_json')
  ) AS expected(tbl, col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'greenhouse_hr' AND c.table_name = expected.tbl AND c.column_name = expected.col
  );

  IF missing > 0 THEN
    RAISE EXCEPTION 'TASK-1023 anti pre-up-marker: % expected contracting PDF column(s) NOT created. Migration markers may be inverted.', missing;
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_hr.workforce_contracting_cases_pdf_rendered_idx;

ALTER TABLE greenhouse_hr.workforce_contracting_drafts
  DROP COLUMN IF EXISTS captured_facts_json;

ALTER TABLE greenhouse_hr.workforce_contracting_cases
  DROP COLUMN IF EXISTS pdf_asset_id,
  DROP COLUMN IF EXISTS signed_pdf_asset_id,
  DROP COLUMN IF EXISTS pdf_content_hash,
  DROP COLUMN IF EXISTS pdf_template_version,
  DROP COLUMN IF EXISTS pdf_status_at_render,
  DROP COLUMN IF EXISTS pdf_generated_at,
  DROP COLUMN IF EXISTS pdf_facts_snapshot;
