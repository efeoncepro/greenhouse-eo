MERGE `efeonce-group.greenhouse.clients` AS target
USING (
  SELECT
    'hubspot-company-27775583337' AS client_id,
    ['4f695b4b-ca6d-47b5-8dc0-1a70da045c2d'] AS notion_project_ids
  UNION ALL
  SELECT
    'hubspot-company-27777706038',
    ['17d39c2f-efe7-80e4-8cc5-cdf417460465']
  UNION ALL
  SELECT
    'hubspot-company-30825221458',
    ['23239c2f-efe7-80ad-b410-f96ea38f49c2']
) AS source
ON target.client_id = source.client_id
WHEN MATCHED THEN
  UPDATE SET
    notion_project_ids = source.notion_project_ids,
    updated_at = CURRENT_TIMESTAMP();

MERGE `efeonce-group.greenhouse.user_project_scopes` AS target
USING (
  SELECT
    'scope-hubspot-ddsoft-primary' AS scope_id,
    'user-hubspot-contact-87929193794' AS user_id,
    'hubspot-company-27775583337' AS client_id,
    '4f695b4b-ca6d-47b5-8dc0-1a70da045c2d' AS project_id,
    'executive_context' AS access_level,
    TRUE AS active,
    CURRENT_TIMESTAMP() AS created_at,
    CURRENT_TIMESTAMP() AS updated_at
  UNION ALL
  SELECT
    'scope-hubspot-ssilva-primary',
    'user-hubspot-contact-109353670324',
    'hubspot-company-27777706038',
    '17d39c2f-efe7-80e4-8cc5-cdf417460465',
    'executive_context',
    TRUE,
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
  UNION ALL
  SELECT
    'scope-hubspot-sky-primary',
    'user-hubspot-contact-139243510680',
    'hubspot-company-30825221458',
    '23239c2f-efe7-80ad-b410-f96ea38f49c2',
    'executive_context',
    TRUE,
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
) AS source
ON target.scope_id = source.scope_id
WHEN MATCHED THEN
  UPDATE SET
    user_id = source.user_id,
    client_id = source.client_id,
    project_id = source.project_id,
    access_level = source.access_level,
    active = source.active,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    scope_id,
    user_id,
    client_id,
    project_id,
    access_level,
    active,
    created_at,
    updated_at
  )
  VALUES (
    source.scope_id,
    source.user_id,
    source.client_id,
    source.project_id,
    source.access_level,
    source.active,
    source.created_at,
    source.updated_at
  );
