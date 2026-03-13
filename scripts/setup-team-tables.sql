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
  contact_channel STRING,
  contact_handle STRING,
  active BOOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.client_team_assignments` (
  assignment_id STRING NOT NULL,
  client_id STRING NOT NULL,
  member_id STRING NOT NULL,
  fte_allocation FLOAT64 NOT NULL,
  hours_per_month INT64,
  role_title_override STRING,
  relevance_note_override STRING,
  contact_channel_override STRING,
  contact_handle_override STRING,
  active BOOL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

MERGE `efeonce-group.greenhouse.team_members` AS target
USING (
  SELECT
    'julio-reyes' AS member_id,
    'Julio Reyes' AS display_name,
    'julio.reyes@efeonce.org' AS email,
    '71acd85d-15a6-4eb6-953d-125370032e93' AS azure_oid,
    '98be6859-4b84-4dee-a8f2-5546d770c44b' AS notion_user_id,
    'Julio Reyes' AS notion_display_name,
    '75788512' AS hubspot_owner_id,
    'Efeonce Leadership' AS role_title,
    'operations' AS role_category,
    '/images/greenhouse/team/EO_Avatar-Jullio.png' AS avatar_url,
    'Liderazgo operativo y benchmark interno del portal.' AS relevance_note,
    'teams' AS contact_channel,
    'julio.reyes@efeonce.org' AS contact_handle,
    TRUE AS active
  UNION ALL
  SELECT
    'daniela-ferreira',
    'Daniela Ferreira',
    'dferreira@efeoncepro.com',
    NULL,
    '161d872b-594c-813c-a3db-000239c8a466',
    'Daniela',
    '76007063',
    'Creative Operations Lead',
    'operations',
    '/images/greenhouse/team/EO_Avatar-Daniela.png',
    'Owner operativo de coordinacion creativa.',
    'teams',
    'dferreira@efeoncepro.com',
    TRUE
  UNION ALL
  SELECT
    'melkin-hernandez',
    'Melkin Hernandez',
    'mhernandez@efeoncepro.com',
    NULL,
    '23ed872b-594c-81f3-a8b8-00022610dfeb',
    'Melkin Hernandez | Efeonce',
    NULL,
    'Senior Visual Designer',
    'design',
    '/images/greenhouse/team/EO_Avatar-Melkin.png',
    'Diseno visual senior para ejecucion creativa.',
    'teams',
    'mhernandez@efeoncepro.com',
    TRUE
  UNION ALL
  SELECT
    'andres-carlosama',
    'Andres Carlosama',
    'acarlosama@efeoncepro.com',
    NULL,
    '2a4d872b-594c-8161-9250-000270ffdfea',
    'Andrés Carlosama | Efeonce',
    '86190996',
    'Senior Visual Designer',
    'design',
    '/images/greenhouse/team/EO_Avatar-Fondo_Team_Andr%C3%A9s.png',
    'Diseno visual senior y revision de entregables.',
    'teams',
    'acarlosama@efeoncepro.com',
    TRUE
  UNION ALL
  SELECT
    'valentina-hoyos',
    'Valentina Hoyos',
    'vhoyos@efeoncepro.com',
    NULL,
    '1f1d872b-594c-811b-b8b5-0002542d0bd7',
    'Valentina Hoyos',
    '82653513',
    'Account Manager',
    'account',
    '/images/greenhouse/team/EO_Avatar-Valentina.png',
    'Punto de contacto de cuenta y seguimiento comercial.',
    'teams',
    'vhoyos@efeoncepro.com',
    TRUE
  UNION ALL
  SELECT
    'humberly-henriquez',
    'Humberly Henriquez',
    'hhumberly@efeoncepro.com',
    NULL,
    NULL,
    'Humberly',
    '84992210',
    'Content Strategist',
    'strategy',
    '/images/greenhouse/team/Humberly.jpg',
    'Estrategia de contenidos y apoyo editorial.',
    'teams',
    'hhumberly@efeoncepro.com',
    TRUE
  UNION ALL
  SELECT
    'luis-reyes',
    'Luis Reyes',
    'lreyes@efeoncepro.com',
    NULL,
    '31ad872b-594c-81e4-97ed-000286169f22',
    'Luis Reyes | Efeonce',
    '86856220',
    'Client Strategy Lead',
    'strategy',
    '/images/greenhouse/team/Luis.jpg',
    'Apoyo estrategico y relacion ejecutiva con cliente.',
    'teams',
    'lreyes@efeoncepro.com',
    TRUE
) AS source
ON target.member_id = source.member_id
WHEN MATCHED THEN
  UPDATE SET
    display_name = source.display_name,
    email = source.email,
    azure_oid = source.azure_oid,
    notion_user_id = source.notion_user_id,
    notion_display_name = source.notion_display_name,
    hubspot_owner_id = source.hubspot_owner_id,
    role_title = source.role_title,
    role_category = source.role_category,
    avatar_url = source.avatar_url,
    relevance_note = source.relevance_note,
    contact_channel = source.contact_channel,
    contact_handle = source.contact_handle,
    active = source.active,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    member_id,
    display_name,
    email,
    azure_oid,
    notion_user_id,
    notion_display_name,
    hubspot_owner_id,
    role_title,
    role_category,
    avatar_url,
    relevance_note,
    contact_channel,
    contact_handle,
    active,
    created_at,
    updated_at
  )
  VALUES (
    source.member_id,
    source.display_name,
    source.email,
    source.azure_oid,
    source.notion_user_id,
    source.notion_display_name,
    source.hubspot_owner_id,
    source.role_title,
    source.role_category,
    source.avatar_url,
    source.relevance_note,
    source.contact_channel,
    source.contact_handle,
    source.active,
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
  );

MERGE `efeonce-group.greenhouse.client_team_assignments` AS target
USING (
  SELECT
    'assignment-space-efeonce-julio-reyes' AS assignment_id,
    'space-efeonce' AS client_id,
    'julio-reyes' AS member_id,
    1.0 AS fte_allocation,
    160 AS hours_per_month,
    CAST(NULL AS STRING) AS role_title_override,
    CAST(NULL AS STRING) AS relevance_note_override,
    CAST(NULL AS STRING) AS contact_channel_override,
    CAST(NULL AS STRING) AS contact_handle_override,
    TRUE AS active,
    DATE '2026-03-13' AS start_date,
    CAST(NULL AS DATE) AS end_date
  UNION ALL
  SELECT
    'assignment-space-efeonce-daniela-ferreira',
    'space-efeonce',
    'daniela-ferreira',
    1.0,
    160,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    DATE '2026-03-13',
    NULL
  UNION ALL
  SELECT
    'assignment-space-efeonce-melkin-hernandez',
    'space-efeonce',
    'melkin-hernandez',
    1.0,
    160,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    DATE '2026-03-13',
    NULL
  UNION ALL
  SELECT
    'assignment-space-efeonce-andres-carlosama',
    'space-efeonce',
    'andres-carlosama',
    1.0,
    160,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    DATE '2026-03-13',
    NULL
  UNION ALL
  SELECT
    'assignment-space-efeonce-valentina-hoyos',
    'space-efeonce',
    'valentina-hoyos',
    1.0,
    160,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    DATE '2026-03-13',
    NULL
  UNION ALL
  SELECT
    'assignment-space-efeonce-humberly-henriquez',
    'space-efeonce',
    'humberly-henriquez',
    1.0,
    160,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    DATE '2026-03-13',
    NULL
  UNION ALL
  SELECT
    'assignment-space-efeonce-luis-reyes',
    'space-efeonce',
    'luis-reyes',
    1.0,
    160,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    DATE '2026-03-13',
    NULL
  UNION ALL
  SELECT
    'assignment-hubspot-company-30825221458-daniela-ferreira',
    'hubspot-company-30825221458',
    'daniela-ferreira',
    1.0,
    160,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    DATE '2026-03-13',
    NULL
  UNION ALL
  SELECT
    'assignment-hubspot-company-30825221458-melkin-hernandez',
    'hubspot-company-30825221458',
    'melkin-hernandez',
    1.0,
    160,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    DATE '2026-03-13',
    NULL
  UNION ALL
  SELECT
    'assignment-hubspot-company-30825221458-andres-carlosama',
    'hubspot-company-30825221458',
    'andres-carlosama',
    1.0,
    160,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    DATE '2026-03-13',
    NULL
) AS source
ON target.assignment_id = source.assignment_id
WHEN MATCHED THEN
  UPDATE SET
    client_id = source.client_id,
    member_id = source.member_id,
    fte_allocation = source.fte_allocation,
    hours_per_month = source.hours_per_month,
    role_title_override = source.role_title_override,
    relevance_note_override = source.relevance_note_override,
    contact_channel_override = source.contact_channel_override,
    contact_handle_override = source.contact_handle_override,
    active = source.active,
    start_date = source.start_date,
    end_date = source.end_date,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    assignment_id,
    client_id,
    member_id,
    fte_allocation,
    hours_per_month,
    role_title_override,
    relevance_note_override,
    contact_channel_override,
    contact_handle_override,
    active,
    start_date,
    end_date,
    created_at,
    updated_at
  )
  VALUES (
    source.assignment_id,
    source.client_id,
    source.member_id,
    source.fte_allocation,
    source.hours_per_month,
    source.role_title_override,
    source.relevance_note_override,
    source.contact_channel_override,
    source.contact_handle_override,
    source.active,
    source.start_date,
    source.end_date,
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
  );
