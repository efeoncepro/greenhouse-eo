-- Up Migration

CREATE TABLE greenhouse_core.member_languages (
  member_id         TEXT NOT NULL
                      REFERENCES greenhouse_core.members (member_id) ON DELETE CASCADE,
  language_code     TEXT NOT NULL,
  language_name     TEXT NOT NULL,
  proficiency_level TEXT NOT NULL DEFAULT 'professional'
                      CHECK (proficiency_level IN ('basic', 'conversational', 'professional', 'fluent', 'native')),
  visibility        TEXT NOT NULL DEFAULT 'internal'
                      CHECK (visibility IN ('internal', 'client_visible')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, language_code)
);

CREATE INDEX idx_member_languages_code
  ON greenhouse_core.member_languages (language_code, proficiency_level);

COMMENT ON TABLE greenhouse_core.member_languages IS 'Member language proficiencies with ISO 639-1 codes';
COMMENT ON COLUMN greenhouse_core.member_languages.language_code IS 'ISO 639-1 two-letter code (es, en, pt, etc.)';
COMMENT ON COLUMN greenhouse_core.member_languages.proficiency_level IS 'basic → conversational → professional → fluent → native';

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.member_languages;
