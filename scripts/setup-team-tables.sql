CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.team_role_catalog` (
  role_id STRING NOT NULL,
  role_name STRING NOT NULL,
  role_family STRING,
  role_level STRING,
  active BOOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.team_profession_catalog` (
  profession_id STRING NOT NULL,
  profession_name STRING NOT NULL,
  profession_family STRING,
  search_aliases ARRAY<STRING>,
  active BOOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.team_members` (
  member_id STRING NOT NULL,
  display_name STRING NOT NULL,
  email STRING NOT NULL,
  first_name STRING,
  last_name STRING,
  preferred_name STRING,
  legal_name STRING,
  identity_profile_id STRING,
  email_aliases ARRAY<STRING>,
  org_role_id STRING,
  profession_id STRING,
  seniority_level STRING,
  employment_type STRING,
  birth_date DATE,
  phone STRING,
  teams_user_id STRING,
  slack_user_id STRING,
  location_city STRING,
  location_country STRING,
  time_zone STRING,
  years_experience FLOAT64,
  efeonce_start_date DATE,
  biography STRING,
  languages ARRAY<STRING>,
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

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS identity_profile_id STRING,
ADD COLUMN IF NOT EXISTS email_aliases ARRAY<STRING>,
ADD COLUMN IF NOT EXISTS first_name STRING,
ADD COLUMN IF NOT EXISTS last_name STRING,
ADD COLUMN IF NOT EXISTS preferred_name STRING,
ADD COLUMN IF NOT EXISTS legal_name STRING,
ADD COLUMN IF NOT EXISTS org_role_id STRING,
ADD COLUMN IF NOT EXISTS profession_id STRING,
ADD COLUMN IF NOT EXISTS seniority_level STRING,
ADD COLUMN IF NOT EXISTS employment_type STRING,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS phone STRING,
ADD COLUMN IF NOT EXISTS teams_user_id STRING,
ADD COLUMN IF NOT EXISTS slack_user_id STRING,
ADD COLUMN IF NOT EXISTS location_city STRING,
ADD COLUMN IF NOT EXISTS location_country STRING,
ADD COLUMN IF NOT EXISTS time_zone STRING,
ADD COLUMN IF NOT EXISTS years_experience FLOAT64,
ADD COLUMN IF NOT EXISTS efeonce_start_date DATE,
ADD COLUMN IF NOT EXISTS biography STRING,
ADD COLUMN IF NOT EXISTS languages ARRAY<STRING>;

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

MERGE `efeonce-group.greenhouse.team_role_catalog` AS target
USING (
  SELECT 'org-role-efeonce-leadership' AS role_id, 'Efeonce Leadership' AS role_name, 'operations' AS role_family, 'lead' AS role_level, TRUE AS active
  UNION ALL
  SELECT 'org-role-creative-operations-lead', 'Creative Operations Lead', 'operations', 'lead', TRUE
  UNION ALL
  SELECT 'org-role-senior-visual-designer', 'Senior Visual Designer', 'design', 'senior', TRUE
  UNION ALL
  SELECT 'org-role-account-manager', 'Account Manager', 'account', 'manager', TRUE
  UNION ALL
  SELECT 'org-role-content-strategist', 'Content Strategist', 'strategy', 'specialist', TRUE
  UNION ALL
  SELECT 'org-role-client-strategy-lead', 'Client Strategy Lead', 'strategy', 'lead', TRUE
) AS source
ON target.role_id = source.role_id
WHEN MATCHED THEN
  UPDATE SET
    role_name = source.role_name,
    role_family = source.role_family,
    role_level = source.role_level,
    active = source.active,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (role_id, role_name, role_family, role_level, active, created_at, updated_at)
  VALUES (source.role_id, source.role_name, source.role_family, source.role_level, source.active, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());

MERGE `efeonce-group.greenhouse.team_profession_catalog` AS target
USING (
  SELECT
    'profession-creative-operations' AS profession_id,
    'Creative Operations' AS profession_name,
    'operations' AS profession_family,
    ['creative operations lead', 'operations lead'] AS search_aliases,
    TRUE AS active
  UNION ALL
  SELECT
    'profession-art-designer',
    'Disenador de arte',
    'design',
    ['art designer', 'senior visual designer', 'visual designer', 'designer'],
    TRUE
  UNION ALL
  SELECT
    'profession-account-manager',
    'Account Manager',
    'account',
    ['account manager', 'customer success', 'client manager'],
    TRUE
  UNION ALL
  SELECT
    'profession-content-strategist',
    'Content Strategist',
    'strategy',
    ['content strategist', 'content strategy', 'content planner'],
    TRUE
  UNION ALL
  SELECT
    'profession-client-strategist',
    'Client Strategist',
    'strategy',
    ['client strategy lead', 'strategist', 'brand strategist'],
    TRUE
  UNION ALL
  SELECT
    'profession-journalist',
    'Periodista',
    'communications',
    ['journalist', 'periodista', 'pr & comms analyst', 'communications analyst'],
    TRUE
) AS source
ON target.profession_id = source.profession_id
WHEN MATCHED THEN
  UPDATE SET
    profession_name = source.profession_name,
    profession_family = source.profession_family,
    search_aliases = source.search_aliases,
    active = source.active,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (profession_id, profession_name, profession_family, search_aliases, active, created_at, updated_at)
  VALUES (
    source.profession_id,
    source.profession_name,
    source.profession_family,
    source.search_aliases,
    source.active,
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
  );

MERGE `efeonce-group.greenhouse.team_members` AS target
USING (
  SELECT
    'julio-reyes' AS member_id,
    'Julio Reyes' AS display_name,
    'julio.reyes@efeonce.org' AS email,
    'Julio' AS first_name,
    'Reyes' AS last_name,
    'Julio' AS preferred_name,
    'Julio Reyes' AS legal_name,
    'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes' AS identity_profile_id,
    ['julio.reyes@efeonce.org', 'jreyes@efeoncepro.com'] AS email_aliases,
    'org-role-efeonce-leadership' AS org_role_id,
    'profession-client-strategist' AS profession_id,
    'lead' AS seniority_level,
    'full_time' AS employment_type,
    CAST(NULL AS DATE) AS birth_date,
    CAST(NULL AS STRING) AS phone,
    CAST(NULL AS STRING) AS teams_user_id,
    CAST(NULL AS STRING) AS slack_user_id,
    CAST(NULL AS STRING) AS location_city,
    CAST(NULL AS STRING) AS location_country,
    CAST(NULL AS STRING) AS time_zone,
    CAST(NULL AS FLOAT64) AS years_experience,
    CAST(NULL AS DATE) AS efeonce_start_date,
    'Liderazgo estrategico y operativo de Greenhouse.' AS biography,
    ARRAY<STRING>['es'] AS languages,
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
    'Daniela',
    'Ferreira',
    'Daniela',
    'Daniela Ferreira',
    'identity-hubspot-crm-owner-76007063',
    ['dferreira@efeoncepro.com', 'daniela@efeonce.org'],
    'org-role-creative-operations-lead',
    'profession-creative-operations',
    'lead',
    'full_time',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Lidera la coordinacion operativa del frente creativo y la salud del delivery.',
    ARRAY<STRING>['es'],
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
    'Melkin',
    'Hernandez',
    'Melkin',
    'Melkin Hernandez',
    'identity-greenhouse-team-member-melkin-hernandez',
    ['mhernandez@efeoncepro.com', 'melkin.hernandez@efeonce.org'],
    'org-role-senior-visual-designer',
    'profession-art-designer',
    'senior',
    'full_time',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Diseno visual senior para piezas y sistemas creativos del cliente.',
    ARRAY<STRING>['es'],
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
    'Andres',
    'Carlosama',
    'Andres',
    'Andres Carlosama',
    'identity-hubspot-crm-owner-86190996',
    ['acarlosama@efeoncepro.com', 'andres.carlosama@efeonce.org'],
    'org-role-senior-visual-designer',
    'profession-art-designer',
    'senior',
    'full_time',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Diseno visual senior y control de calidad creativa en entregables clave.',
    ARRAY<STRING>['es'],
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
    'Valentina',
    'Hoyos',
    'Valentina',
    'Valentina Hoyos',
    'identity-hubspot-crm-owner-82653513',
    ['vhoyos@efeoncepro.com'],
    'org-role-account-manager',
    'profession-account-manager',
    'manager',
    'full_time',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Gestiona la relacion diaria con cliente, prioridades y seguimiento comercial.',
    ARRAY<STRING>['es'],
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
    'Humberly',
    'Henriquez',
    'Humberly',
    'Humberly Henriquez',
    'identity-hubspot-crm-owner-84992210',
    ['hhumberly@efeoncepro.com'],
    'org-role-content-strategist',
    'profession-content-strategist',
    'specialist',
    'full_time',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Estructura narrativas y lineas editoriales para el frente de contenidos.',
    ARRAY<STRING>['es'],
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
    'Luis',
    'Reyes',
    'Luis',
    'Luis Reyes',
    'identity-hubspot-crm-owner-86856220',
    ['lreyes@efeoncepro.com'],
    'org-role-client-strategy-lead',
    'profession-client-strategist',
    'lead',
    'full_time',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Conecta estrategia de cliente, lectura ejecutiva y expansion de capacidad.',
    ARRAY<STRING>['es'],
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
    first_name = source.first_name,
    last_name = source.last_name,
    preferred_name = source.preferred_name,
    legal_name = source.legal_name,
    identity_profile_id = source.identity_profile_id,
    email_aliases = source.email_aliases,
    org_role_id = source.org_role_id,
    profession_id = source.profession_id,
    seniority_level = source.seniority_level,
    employment_type = source.employment_type,
    birth_date = source.birth_date,
    phone = source.phone,
    teams_user_id = source.teams_user_id,
    slack_user_id = source.slack_user_id,
    location_city = source.location_city,
    location_country = source.location_country,
    time_zone = source.time_zone,
    years_experience = source.years_experience,
    efeonce_start_date = source.efeonce_start_date,
    biography = source.biography,
    languages = source.languages,
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
    first_name,
    last_name,
    preferred_name,
    legal_name,
    identity_profile_id,
    email_aliases,
    org_role_id,
    profession_id,
    seniority_level,
    employment_type,
    birth_date,
    phone,
    teams_user_id,
    slack_user_id,
    location_city,
    location_country,
    time_zone,
    years_experience,
    efeonce_start_date,
    biography,
    languages,
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
    source.first_name,
    source.last_name,
    source.preferred_name,
    source.legal_name,
    source.identity_profile_id,
    source.email_aliases,
    source.org_role_id,
    source.profession_id,
    source.seniority_level,
    source.employment_type,
    source.birth_date,
    source.phone,
    source.teams_user_id,
    source.slack_user_id,
    source.location_city,
    source.location_country,
    source.time_zone,
    source.years_experience,
    source.efeonce_start_date,
    source.biography,
    source.languages,
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

UPDATE `efeonce-group.greenhouse.identity_profile_source_links`
SET
  active = FALSE,
  updated_at = CURRENT_TIMESTAMP()
WHERE profile_id = 'identity-hubspot-crm-owner-75788512'
  AND source_system = 'hubspot_crm'
  AND source_object_type = 'owner'
  AND source_object_id = '75788512';

UPDATE `efeonce-group.greenhouse.identity_profiles`
SET
  active = FALSE,
  status = 'archived',
  notes = 'Merged into identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes by team identity bootstrap.',
  updated_at = CURRENT_TIMESTAMP()
WHERE profile_id = 'identity-hubspot-crm-owner-75788512';

MERGE `efeonce-group.greenhouse.identity_profiles` AS target
USING (
  SELECT
    'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes' AS profile_id,
    'EO-ID-GH-USER-EFEONCE-ADMIN-JULIO-REYES' AS public_id,
    'efeonce_internal' AS profile_type,
    'julio.reyes@efeonce.org' AS canonical_email,
    'Julio Reyes' AS full_name,
    'Efeonce Leadership' AS job_title,
    'active' AS status,
    TRUE AS active,
    'credentials' AS default_auth_mode,
    'greenhouse_auth' AS primary_source_system,
    'client_user' AS primary_source_object_type,
    'user-efeonce-admin-julio-reyes' AS primary_source_object_id,
    'Canonical Greenhouse identity for team capacity and external provider links.' AS notes
  UNION ALL
  SELECT
    'identity-hubspot-crm-owner-76007063',
    'EO-ID-HSO-76007063',
    'efeonce_internal',
    'dferreira@efeoncepro.com',
    'Daniela Ferreira',
    'Creative Operations Lead',
    'active',
    TRUE,
    NULL,
    'hubspot_crm',
    'owner',
    '76007063',
    'Canonical Greenhouse identity enriched by Notion and future Microsoft or Google links.'
  UNION ALL
  SELECT
    'identity-greenhouse-team-member-melkin-hernandez',
    'EO-ID-GREENHOUSE-TEAM-MEMBER-MELKIN-HERNANDEZ',
    'efeonce_internal',
    'mhernandez@efeoncepro.com',
    'Melkin Hernandez',
    'Senior Visual Designer',
    'active',
    TRUE,
    NULL,
    'greenhouse_team',
    'member',
    'melkin-hernandez',
    'Canonical Greenhouse identity anchored on the team roster until more providers are linked.'
  UNION ALL
  SELECT
    'identity-hubspot-crm-owner-86190996',
    'EO-ID-HSO-86190996',
    'efeonce_internal',
    'acarlosama@efeoncepro.com',
    'Andres Carlosama',
    'Senior Visual Designer',
    'active',
    TRUE,
    NULL,
    'hubspot_crm',
    'owner',
    '86190996',
    'Canonical Greenhouse identity enriched by Notion and future providers.'
  UNION ALL
  SELECT
    'identity-hubspot-crm-owner-82653513',
    'EO-ID-HSO-82653513',
    'efeonce_internal',
    'vhoyos@efeoncepro.com',
    'Valentina Hoyos',
    'Account Manager',
    'active',
    TRUE,
    NULL,
    'hubspot_crm',
    'owner',
    '82653513',
    'Canonical Greenhouse identity enriched by Notion and future providers.'
  UNION ALL
  SELECT
    'identity-hubspot-crm-owner-84992210',
    'EO-ID-HSO-84992210',
    'efeonce_internal',
    'hhumberly@efeoncepro.com',
    'Humberly Henriquez',
    'Content Strategist',
    'active',
    TRUE,
    NULL,
    'hubspot_crm',
    'owner',
    '84992210',
    'Canonical Greenhouse identity for the strategist roster.'
  UNION ALL
  SELECT
    'identity-hubspot-crm-owner-86856220',
    'EO-ID-HSO-86856220',
    'efeonce_internal',
    'lreyes@efeoncepro.com',
    'Luis Reyes',
    'Client Strategy Lead',
    'active',
    TRUE,
    NULL,
    'hubspot_crm',
    'owner',
    '86856220',
    'Canonical Greenhouse identity enriched by Notion and future providers.'
) AS source
ON target.profile_id = source.profile_id
WHEN MATCHED THEN
  UPDATE SET
    public_id = source.public_id,
    profile_type = source.profile_type,
    canonical_email = source.canonical_email,
    full_name = source.full_name,
    job_title = source.job_title,
    status = source.status,
    active = source.active,
    default_auth_mode = source.default_auth_mode,
    primary_source_system = source.primary_source_system,
    primary_source_object_type = source.primary_source_object_type,
    primary_source_object_id = source.primary_source_object_id,
    notes = source.notes,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    profile_id,
    public_id,
    profile_type,
    canonical_email,
    full_name,
    job_title,
    status,
    active,
    default_auth_mode,
    primary_source_system,
    primary_source_object_type,
    primary_source_object_id,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    source.profile_id,
    source.public_id,
    source.profile_type,
    source.canonical_email,
    source.full_name,
    source.job_title,
    source.status,
    source.active,
    source.default_auth_mode,
    source.primary_source_system,
    source.primary_source_object_type,
    source.primary_source_object_id,
    source.notes,
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
  );

MERGE `efeonce-group.greenhouse.identity_profile_source_links` AS target
USING (
  SELECT
    CONCAT(
      'identity-link-',
      REGEXP_REPLACE(LOWER(profile_id), r'[^a-z0-9]+', '-'),
      '-',
      REGEXP_REPLACE(LOWER(source_system), r'[^a-z0-9]+', '-'),
      '-',
      REGEXP_REPLACE(LOWER(source_object_type), r'[^a-z0-9]+', '-'),
      '-',
      REGEXP_REPLACE(LOWER(source_object_id), r'[^a-z0-9]+', '-')
    ) AS link_id,
    profile_id,
    source_system,
    source_object_type,
    source_object_id,
    source_user_id,
    source_email,
    source_display_name,
    is_primary,
    is_login_identity,
    TRUE AS active
  FROM (
    SELECT
      'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes' AS profile_id,
      'greenhouse_team' AS source_system,
      'member' AS source_object_type,
      'julio-reyes' AS source_object_id,
      'julio-reyes' AS source_user_id,
      'julio.reyes@efeonce.org' AS source_email,
      'Julio Reyes' AS source_display_name,
      FALSE AS is_primary,
      FALSE AS is_login_identity
    UNION ALL
    SELECT
      'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes',
      'greenhouse_auth',
      'client_user',
      'user-efeonce-admin-julio-reyes',
      'user-efeonce-admin-julio-reyes',
      'julio.reyes@efeonce.org',
      'Julio Reyes',
      TRUE,
      TRUE
    UNION ALL
    SELECT
      'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes',
      'hubspot_crm',
      'owner',
      '75788512',
      '75788512',
      'jreyes@efeoncepro.com',
      'Julio Reyes Rangel',
      FALSE,
      FALSE
    UNION ALL
    SELECT
      'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes',
      'notion',
      'person',
      '98be6859-4b84-4dee-a8f2-5546d770c44b',
      '98be6859-4b84-4dee-a8f2-5546d770c44b',
      'julio.reyes@efeonce.org',
      'Julio Reyes',
      FALSE,
      FALSE
    UNION ALL
    SELECT
      'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes',
      'azure_ad',
      'user',
      '71acd85d-15a6-4eb6-953d-125370032e93',
      '71acd85d-15a6-4eb6-953d-125370032e93',
      'jreyes@efeoncepro.com',
      'Julio Reyes',
      FALSE,
      TRUE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-76007063',
      'greenhouse_team',
      'member',
      'daniela-ferreira',
      'daniela-ferreira',
      'dferreira@efeoncepro.com',
      'Daniela Ferreira',
      FALSE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-76007063',
      'hubspot_crm',
      'owner',
      '76007063',
      '76007063',
      'dferreira@efeoncepro.com',
      'Daniela Ferreira',
      TRUE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-76007063',
      'notion',
      'person',
      '161d872b-594c-813c-a3db-000239c8a466',
      '161d872b-594c-813c-a3db-000239c8a466',
      'dferreira@efeoncepro.com',
      'Daniela',
      FALSE,
      FALSE
    UNION ALL
    SELECT
      'identity-greenhouse-team-member-melkin-hernandez',
      'greenhouse_team',
      'member',
      'melkin-hernandez',
      'melkin-hernandez',
      'mhernandez@efeoncepro.com',
      'Melkin Hernandez',
      TRUE,
      FALSE
    UNION ALL
    SELECT
      'identity-greenhouse-team-member-melkin-hernandez',
      'notion',
      'person',
      '23ed872b-594c-81f3-a8b8-00022610dfeb',
      '23ed872b-594c-81f3-a8b8-00022610dfeb',
      'mhernandez@efeoncepro.com',
      'Melkin Hernandez | Efeonce',
      FALSE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-86190996',
      'greenhouse_team',
      'member',
      'andres-carlosama',
      'andres-carlosama',
      'acarlosama@efeoncepro.com',
      'Andres Carlosama',
      FALSE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-86190996',
      'hubspot_crm',
      'owner',
      '86190996',
      '86190996',
      'acarlosama@efeoncepro.com',
      'Andres Carlosama',
      TRUE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-86190996',
      'notion',
      'person',
      '2a4d872b-594c-8161-9250-000270ffdfea',
      '2a4d872b-594c-8161-9250-000270ffdfea',
      'acarlosama@efeoncepro.com',
      'Andres Carlosama',
      FALSE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-82653513',
      'greenhouse_team',
      'member',
      'valentina-hoyos',
      'valentina-hoyos',
      'vhoyos@efeoncepro.com',
      'Valentina Hoyos',
      FALSE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-82653513',
      'hubspot_crm',
      'owner',
      '82653513',
      '82653513',
      'vhoyos@efeoncepro.com',
      'Valentina Hoyos',
      TRUE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-82653513',
      'notion',
      'person',
      '1f1d872b-594c-811b-b8b5-0002542d0bd7',
      '1f1d872b-594c-811b-b8b5-0002542d0bd7',
      'vhoyos@efeoncepro.com',
      'Valentina Hoyos',
      FALSE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-84992210',
      'greenhouse_team',
      'member',
      'humberly-henriquez',
      'humberly-henriquez',
      'hhumberly@efeoncepro.com',
      'Humberly Henriquez',
      FALSE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-84992210',
      'hubspot_crm',
      'owner',
      '84992210',
      '84992210',
      'hhumberly@efeoncepro.com',
      'Humberly Henriquez',
      TRUE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-86856220',
      'greenhouse_team',
      'member',
      'luis-reyes',
      'luis-reyes',
      'lreyes@efeoncepro.com',
      'Luis Reyes',
      FALSE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-86856220',
      'hubspot_crm',
      'owner',
      '86856220',
      '86856220',
      'lreyes@efeoncepro.com',
      'Luis Eduardo Reyes Rangel',
      TRUE,
      FALSE
    UNION ALL
    SELECT
      'identity-hubspot-crm-owner-86856220',
      'notion',
      'person',
      '31ad872b-594c-81e4-97ed-000286169f22',
      '31ad872b-594c-81e4-97ed-000286169f22',
      'lreyes@efeoncepro.com',
      'Luis Reyes | Efeonce',
      FALSE,
      FALSE
  )
) AS source
ON target.link_id = source.link_id
WHEN MATCHED THEN
  UPDATE SET
    profile_id = source.profile_id,
    source_system = source.source_system,
    source_object_type = source.source_object_type,
    source_object_id = source.source_object_id,
    source_user_id = source.source_user_id,
    source_email = source.source_email,
    source_display_name = source.source_display_name,
    is_primary = source.is_primary,
    is_login_identity = source.is_login_identity,
    active = source.active,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    link_id,
    profile_id,
    source_system,
    source_object_type,
    source_object_id,
    source_user_id,
    source_email,
    source_display_name,
    is_primary,
    is_login_identity,
    active,
    created_at,
    updated_at
  )
  VALUES (
    source.link_id,
    source.profile_id,
    source.source_system,
    source.source_object_type,
    source.source_object_id,
    source.source_user_id,
    source.source_email,
    source.source_display_name,
    source.is_primary,
    source.is_login_identity,
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
