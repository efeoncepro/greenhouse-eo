-- Up Migration

-- Evidence: project highlights, work samples, case studies linked to a member's profile
CREATE TABLE greenhouse_core.member_evidence (
  evidence_id       TEXT PRIMARY KEY,
  member_id         TEXT NOT NULL
                      REFERENCES greenhouse_core.members (member_id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  evidence_type     TEXT NOT NULL DEFAULT 'project_highlight'
                      CHECK (evidence_type IN (
                        'project_highlight', 'work_sample', 'case_study',
                        'publication', 'award', 'other'
                      )),
  related_skill_code TEXT
                      REFERENCES greenhouse_core.skill_catalog (skill_code) ON DELETE SET NULL,
  related_tool_code  TEXT
                      REFERENCES greenhouse_core.tool_catalog (tool_code) ON DELETE SET NULL,
  asset_id          TEXT
                      REFERENCES greenhouse_core.assets (asset_id) ON DELETE SET NULL,
  external_url      TEXT,
  visibility        TEXT NOT NULL DEFAULT 'internal'
                      CHECK (visibility IN ('internal', 'client_visible')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_member_evidence_member ON greenhouse_core.member_evidence (member_id);

COMMENT ON TABLE greenhouse_core.member_evidence IS 'Tangible evidence of work, projects, or achievements attached to a member profile';

-- Endorsements: internal peer/manager validation of a member's skill or competency
CREATE TABLE greenhouse_core.member_endorsements (
  endorsement_id          TEXT PRIMARY KEY,
  member_id               TEXT NOT NULL
                            REFERENCES greenhouse_core.members (member_id) ON DELETE CASCADE,
  endorsed_by_member_id   TEXT NOT NULL
                            REFERENCES greenhouse_core.members (member_id) ON DELETE CASCADE,
  skill_code              TEXT
                            REFERENCES greenhouse_core.skill_catalog (skill_code) ON DELETE SET NULL,
  tool_code               TEXT
                            REFERENCES greenhouse_core.tool_catalog (tool_code) ON DELETE SET NULL,
  comment                 TEXT,
  visibility              TEXT NOT NULL DEFAULT 'internal'
                            CHECK (visibility IN ('internal', 'client_visible')),
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'moderated', 'removed')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT endorsement_no_self_endorse CHECK (member_id <> endorsed_by_member_id)
);

CREATE INDEX idx_member_endorsements_member ON greenhouse_core.member_endorsements (member_id, status);
CREATE INDEX idx_member_endorsements_endorser ON greenhouse_core.member_endorsements (endorsed_by_member_id);

COMMENT ON TABLE greenhouse_core.member_endorsements IS 'Internal peer endorsements of skills or tools for a member';
COMMENT ON COLUMN greenhouse_core.member_endorsements.status IS 'active → moderated|removed (admin moderation)';

-- Runtime grants
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_evidence TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_endorsements TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.member_endorsements;
DROP TABLE IF EXISTS greenhouse_core.member_evidence;
