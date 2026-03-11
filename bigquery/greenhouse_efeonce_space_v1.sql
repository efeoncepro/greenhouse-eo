MERGE `efeonce-group.greenhouse.clients` AS target
USING (
  SELECT
    'space-efeonce' AS client_id,
    'Efeonce' AS client_name,
    'active' AS status,
    TRUE AS active,
    'julio.reyes@efeonce.org' AS primary_contact_email,
    CAST(NULL AS STRING) AS password_hash,
    CAST(NULL AS STRING) AS password_hash_algorithm,
    'client' AS role,
    ARRAY(
      SELECT notion_page_id
      FROM `efeonce-group.notion_ops.proyectos`
      WHERE notion_page_id IS NOT NULL
      ORDER BY nombre_del_proyecto, notion_page_id
    ) AS notion_project_ids,
    CAST(NULL AS STRING) AS hubspot_company_id,
    ['efeonce.org', 'efeoncepro.com'] AS allowed_email_domains,
    ['space_preview', 'internal_benchmark'] AS feature_flags,
    'America/Santiago' AS timezone,
    '/dashboard' AS portal_home_path,
    'internal_preview' AS auth_mode,
    'Internal benchmark space seeded from the Efeonce Notion portfolio to validate the client dashboard MVP on the richest available operational dataset.' AS notes
) AS source
ON target.client_id = source.client_id
WHEN MATCHED THEN
  UPDATE SET
    client_name = source.client_name,
    status = source.status,
    active = source.active,
    primary_contact_email = source.primary_contact_email,
    role = source.role,
    notion_project_ids = source.notion_project_ids,
    allowed_email_domains = source.allowed_email_domains,
    feature_flags = source.feature_flags,
    timezone = source.timezone,
    portal_home_path = source.portal_home_path,
    auth_mode = source.auth_mode,
    notes = source.notes,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    client_id,
    client_name,
    status,
    active,
    primary_contact_email,
    password_hash,
    password_hash_algorithm,
    role,
    notion_project_ids,
    hubspot_company_id,
    allowed_email_domains,
    feature_flags,
    timezone,
    portal_home_path,
    auth_mode,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    source.client_id,
    source.client_name,
    source.status,
    source.active,
    source.primary_contact_email,
    source.password_hash,
    source.password_hash_algorithm,
    source.role,
    source.notion_project_ids,
    source.hubspot_company_id,
    source.allowed_email_domains,
    source.feature_flags,
    source.timezone,
    source.portal_home_path,
    source.auth_mode,
    source.notes,
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
  );

MERGE `efeonce-group.greenhouse.client_service_modules` AS target
USING (
  SELECT *
  FROM UNNEST([
    STRUCT('assignment-space-efeonce-crm-solutions' AS assignment_id, 'space-efeonce' AS client_id, 'crm_solutions' AS module_code),
    STRUCT('assignment-space-efeonce-globe' AS assignment_id, 'space-efeonce' AS client_id, 'globe' AS module_code),
    STRUCT('assignment-space-efeonce-wave' AS assignment_id, 'space-efeonce' AS client_id, 'wave' AS module_code),
    STRUCT('assignment-space-efeonce-agencia-creativa' AS assignment_id, 'space-efeonce' AS client_id, 'agencia_creativa' AS module_code),
    STRUCT('assignment-space-efeonce-consultoria-crm' AS assignment_id, 'space-efeonce' AS client_id, 'consultoria_crm' AS module_code),
    STRUCT('assignment-space-efeonce-desarrollo-web' AS assignment_id, 'space-efeonce' AS client_id, 'desarrollo_web' AS module_code),
    STRUCT('assignment-space-efeonce-implementacion-onboarding' AS assignment_id, 'space-efeonce' AS client_id, 'implementacion_onboarding' AS module_code),
    STRUCT('assignment-space-efeonce-licenciamiento-hubspot' AS assignment_id, 'space-efeonce' AS client_id, 'licenciamiento_hubspot' AS module_code)
  ])
) AS source
ON target.assignment_id = source.assignment_id
WHEN MATCHED THEN
  UPDATE SET
    client_id = source.client_id,
    module_code = source.module_code,
    source_system = 'internal_seed',
    source_object_type = 'space',
    source_object_id = 'space-efeonce',
    source_closedwon_deal_id = NULL,
    confidence = 'high',
    active = TRUE,
    derived_from_latest_closedwon = FALSE,
    valid_to = NULL,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    assignment_id,
    client_id,
    hubspot_company_id,
    module_code,
    source_system,
    source_object_type,
    source_object_id,
    source_closedwon_deal_id,
    confidence,
    active,
    derived_from_latest_closedwon,
    valid_from,
    valid_to,
    created_at,
    updated_at
  )
  VALUES (
    source.assignment_id,
    source.client_id,
    NULL,
    source.module_code,
    'internal_seed',
    'space',
    'space-efeonce',
    NULL,
    'high',
    TRUE,
    FALSE,
    CURRENT_TIMESTAMP(),
    NULL,
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
  );
