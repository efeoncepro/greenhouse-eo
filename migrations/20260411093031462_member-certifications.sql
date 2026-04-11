-- Up Migration

CREATE TABLE greenhouse_core.member_certifications (
  certification_id  TEXT PRIMARY KEY,
  member_id         TEXT NOT NULL
                      REFERENCES greenhouse_core.members (member_id)
                      ON DELETE CASCADE,
  name              TEXT NOT NULL,
  issuer            TEXT NOT NULL,
  issued_date       DATE,
  expiry_date       DATE,
  validation_url    TEXT,
  asset_id          TEXT
                      REFERENCES greenhouse_core.assets (asset_id)
                      ON DELETE SET NULL,
  visibility        TEXT NOT NULL DEFAULT 'internal'
                      CHECK (visibility IN ('internal', 'client_visible')),
  verification_status TEXT NOT NULL DEFAULT 'self_declared'
                      CHECK (verification_status IN ('self_declared', 'pending_review', 'verified', 'rejected')),
  verified_by       TEXT,
  verified_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_member_certifications_member
  ON greenhouse_core.member_certifications (member_id, verification_status);

CREATE INDEX idx_member_certifications_expiry
  ON greenhouse_core.member_certifications (expiry_date)
  WHERE expiry_date IS NOT NULL;

COMMENT ON TABLE greenhouse_core.member_certifications IS 'Professional certifications with evidence, verification, and audience visibility';
COMMENT ON COLUMN greenhouse_core.member_certifications.verification_status IS 'self_declared → pending_review → verified|rejected';
COMMENT ON COLUMN greenhouse_core.member_certifications.visibility IS 'internal (self+admin) or client_visible (requires verified status)';
COMMENT ON COLUMN greenhouse_core.member_certifications.asset_id IS 'FK to assets — PDF/image evidence uploaded via private assets';

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.member_certifications;
