CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.team_members` (
  member_id STRING NOT NULL,
  display_name STRING NOT NULL,
  email STRING NOT NULL,
  azure_oid STRING,
  notion_user_id STRING,
  notion_display_name STRING,
  hubspot_owner_id STRING,
  role_title STRING NOT NULL,
  role_category STRING NOT NULL,
  avatar_url STRING,
  relevance_note STRING,
  contact_channel STRING DEFAULT 'teams',
  contact_handle STRING,
  active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.client_team_assignments` (
  assignment_id STRING NOT NULL,
  client_id STRING NOT NULL,
  member_id STRING NOT NULL,
  fte_allocation FLOAT64 NOT NULL DEFAULT 1.0,
  hours_per_month INT64,
  role_title_override STRING,
  relevance_note_override STRING,
  contact_channel_override STRING,
  contact_handle_override STRING,
  active BOOL DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

INSERT INTO `efeonce-group.greenhouse.team_members`
  (member_id, display_name, email, role_title, role_category, contact_channel, active)
VALUES
  ('daniela-ferreira', 'Daniela Ferreira', 'daniela@efeonce.org', 'Creative Operations Lead', 'operations', 'teams', TRUE),
  ('melkin-hernandez', 'Melkin Hernandez', 'melkin@efeonce.org', 'Senior Visual Designer', 'design', 'teams', TRUE),
  ('andres-carlosama', 'Andres Carlosama', 'andres@efeonce.org', 'Senior Visual Designer', 'design', 'teams', TRUE),
  ('valentina-hoyos', 'Valentina Hoyos', 'valentina@efeonce.org', 'Account Manager', 'account', 'teams', TRUE),
  ('humberly-henriquez', 'Humberly Henriquez', 'humberly@efeonce.org', 'Content Strategist', 'strategy', 'teams', TRUE);
