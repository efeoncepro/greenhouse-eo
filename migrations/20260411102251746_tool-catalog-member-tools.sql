-- Up Migration

CREATE TABLE greenhouse_core.tool_catalog (
  tool_code       TEXT PRIMARY KEY,
  tool_name       TEXT NOT NULL,
  tool_category   TEXT NOT NULL
                    CHECK (tool_category IN (
                      'design', 'development', 'analytics', 'media',
                      'project_management', 'collaboration', 'content', 'other'
                    )),
  icon_key        TEXT,
  description     TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  display_order   INTEGER NOT NULL DEFAULT 100,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tool_catalog_category
  ON greenhouse_core.tool_catalog (tool_category, active, display_order);

COMMENT ON TABLE greenhouse_core.tool_catalog IS 'Controlled catalog of professional tools and platforms';
COMMENT ON COLUMN greenhouse_core.tool_catalog.icon_key IS 'Key for BrandLogo component (e.g. figma, notion, adobe)';

CREATE TABLE greenhouse_core.member_tools (
  member_id         TEXT NOT NULL
                      REFERENCES greenhouse_core.members (member_id) ON DELETE CASCADE,
  tool_code         TEXT NOT NULL
                      REFERENCES greenhouse_core.tool_catalog (tool_code) ON DELETE CASCADE,
  proficiency_level TEXT NOT NULL DEFAULT 'intermediate'
                      CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  visibility        TEXT NOT NULL DEFAULT 'internal'
                      CHECK (visibility IN ('internal', 'client_visible')),
  notes             TEXT,
  verified_by       TEXT,
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, tool_code)
);

CREATE INDEX idx_member_tools_tool_code
  ON greenhouse_core.member_tools (tool_code, proficiency_level);

COMMENT ON TABLE greenhouse_core.member_tools IS 'Member proficiency in professional tools from the controlled catalog';

-- Seed: common agency tools
INSERT INTO greenhouse_core.tool_catalog (tool_code, tool_name, tool_category, icon_key, display_order) VALUES
  ('figma',              'Figma',                'design',             'figma',        10),
  ('photoshop',          'Adobe Photoshop',      'design',             'adobe',        20),
  ('illustrator',        'Adobe Illustrator',    'design',             'adobe',        30),
  ('after_effects',      'Adobe After Effects',  'design',             'adobe',        40),
  ('premiere',           'Adobe Premiere Pro',   'design',             'adobe',        50),
  ('canva',              'Canva',                'design',             NULL,           60),
  ('sketch',             'Sketch',               'design',             NULL,           70),
  ('react',              'React',                'development',        NULL,           80),
  ('nextjs',             'Next.js',              'development',        NULL,           90),
  ('typescript',         'TypeScript',           'development',        NULL,          100),
  ('nodejs',             'Node.js',              'development',        NULL,          110),
  ('github',             'GitHub',               'development',        'github',      120),
  ('google_analytics',   'Google Analytics',     'analytics',          NULL,          130),
  ('looker_studio',      'Looker Studio',        'analytics',          'looker',      140),
  ('tableau',            'Tableau',              'analytics',          NULL,          150),
  ('meta_ads',           'Meta Ads',             'media',              NULL,          160),
  ('google_ads',         'Google Ads',           'media',              NULL,          170),
  ('linkedin_ads',       'LinkedIn Ads',         'media',              'linkedin',    180),
  ('tiktok_ads',         'TikTok Ads',           'media',              NULL,          190),
  ('notion',             'Notion',               'project_management', 'notion',      200),
  ('asana',              'Asana',                'project_management', NULL,          210),
  ('monday',             'Monday.com',           'project_management', NULL,          220),
  ('jira',               'Jira',                 'project_management', NULL,          230),
  ('slack',              'Slack',                'collaboration',      NULL,          240),
  ('teams',              'Microsoft Teams',      'collaboration',      NULL,          250),
  ('miro',               'Miro',                 'collaboration',      'miro',        260),
  ('wordpress',          'WordPress',            'content',            NULL,          270),
  ('hubspot',            'HubSpot',              'content',            'hubspot',     280),
  ('mailchimp',          'Mailchimp',            'content',            NULL,          290);

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.member_tools;
DROP TABLE IF EXISTS greenhouse_core.tool_catalog;
