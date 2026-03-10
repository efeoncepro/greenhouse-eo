MERGE `efeonce-group.greenhouse.clients` AS target
USING (
  WITH won_deal_companies AS (
    SELECT DISTINCT company_id
    FROM `efeonce-group.hubspot_crm.deals` AS deals,
    UNNEST(SPLIT(REGEXP_REPLACE(COALESCE(deals.assoc_companies, ''), r'\s+', ''), ',')) AS company_id
    WHERE deals.hs_archived = FALSE
      AND LOWER(COALESCE(deals.dealstage, '')) = 'closedwon'
      AND company_id != ''
  ),
  company_contacts AS (
    SELECT DISTINCT
      company.hs_object_id AS hubspot_company_id,
      company.name AS client_name,
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(NULLIF(company.domain, ''), NULLIF(company.website, ''), ''), r'^https?://', ''), r'/.*$', '')) AS company_domain,
      contact.hs_object_id AS hubspot_contact_id,
      LOWER(TRIM(contact.email)) AS primary_contact_email,
      LOWER(COALESCE(contact.hs_email_domain, '')) AS email_domain,
      contact.firstname,
      contact.lastname,
      contact.jobtitle,
      COALESCE(contact.lastmodifieddate, contact.hs_updated_at, contact.createdate) AS freshness
    FROM won_deal_companies won
    JOIN `efeonce-group.hubspot_crm.companies` AS company
      ON company.hs_object_id = won.company_id
    JOIN `efeonce-group.hubspot_crm.contacts` AS contact
      ON contact.hs_archived = FALSE
     AND contact.email IS NOT NULL
     AND LOWER(TRIM(contact.email)) NOT LIKE '%@efeonce.com'
     AND LOWER(TRIM(contact.email)) NOT LIKE '%@efeonce.org'
    CROSS JOIN UNNEST(SPLIT(REGEXP_REPLACE(COALESCE(contact.assoc_companies, ''), r'\s+', ''), ',')) AS assoc_company_id
    WHERE company.hs_archived = FALSE
      AND assoc_company_id = company.hs_object_id
  ),
  ranked_contacts AS (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY hubspot_company_id
        ORDER BY
          CASE WHEN company_domain != '' AND email_domain = company_domain THEN 0 ELSE 1 END,
          CASE WHEN jobtitle IS NOT NULL AND jobtitle != '' THEN 0 ELSE 1 END,
          freshness DESC,
          hubspot_contact_id
      ) AS row_num
    FROM company_contacts
  )
  SELECT
    CONCAT('hubspot-company-', hubspot_company_id) AS client_id,
    client_name,
    'active' AS status,
    TRUE AS active,
    primary_contact_email,
    CAST(NULL AS STRING) AS password_hash,
    CAST(NULL AS STRING) AS password_hash_algorithm,
    'client' AS role,
    ARRAY<STRING>[] AS notion_project_ids,
    hubspot_company_id,
    ARRAY(
      SELECT DISTINCT domain_value
      FROM UNNEST([company_domain, email_domain]) AS domain_value
      WHERE domain_value IS NOT NULL
        AND domain_value != ''
      ORDER BY domain_value
    ) AS allowed_email_domains,
    ['dashboard-kpis'] AS feature_flags,
    'America/Santiago' AS timezone,
    '/dashboard' AS portal_home_path,
    'password_reset_pending' AS auth_mode,
    CONCAT(
      'Bootstrap client imported from HubSpot closedwon company ',
      hubspot_company_id,
      '. Primary contact selected from associated contacts.'
    ) AS notes,
    CURRENT_TIMESTAMP() AS created_at,
    CURRENT_TIMESTAMP() AS updated_at,
    CAST(NULL AS TIMESTAMP) AS last_login_at
  FROM ranked_contacts
  WHERE row_num = 1
) AS source
ON target.hubspot_company_id = source.hubspot_company_id
WHEN MATCHED THEN
  UPDATE SET
    client_name = source.client_name,
    status = source.status,
    active = source.active,
    primary_contact_email = source.primary_contact_email,
    role = source.role,
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
    updated_at,
    last_login_at
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
    source.created_at,
    source.updated_at,
    source.last_login_at
  );

MERGE `efeonce-group.greenhouse.client_users` AS target
USING (
  WITH won_deal_companies AS (
    SELECT DISTINCT company_id
    FROM `efeonce-group.hubspot_crm.deals` AS deals,
    UNNEST(SPLIT(REGEXP_REPLACE(COALESCE(deals.assoc_companies, ''), r'\s+', ''), ',')) AS company_id
    WHERE deals.hs_archived = FALSE
      AND LOWER(COALESCE(deals.dealstage, '')) = 'closedwon'
      AND company_id != ''
  ),
  company_contacts AS (
    SELECT DISTINCT
      company.hs_object_id AS hubspot_company_id,
      company.name AS client_name,
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(NULLIF(company.domain, ''), NULLIF(company.website, ''), ''), r'^https?://', ''), r'/.*$', '')) AS company_domain,
      contact.hs_object_id AS hubspot_contact_id,
      LOWER(TRIM(contact.email)) AS email,
      LOWER(COALESCE(contact.hs_email_domain, '')) AS email_domain,
      contact.firstname,
      contact.lastname,
      contact.jobtitle,
      COALESCE(contact.lastmodifieddate, contact.hs_updated_at, contact.createdate) AS freshness
    FROM won_deal_companies won
    JOIN `efeonce-group.hubspot_crm.companies` AS company
      ON company.hs_object_id = won.company_id
    JOIN `efeonce-group.hubspot_crm.contacts` AS contact
      ON contact.hs_archived = FALSE
     AND contact.email IS NOT NULL
     AND LOWER(TRIM(contact.email)) NOT LIKE '%@efeonce.com'
     AND LOWER(TRIM(contact.email)) NOT LIKE '%@efeonce.org'
    CROSS JOIN UNNEST(SPLIT(REGEXP_REPLACE(COALESCE(contact.assoc_companies, ''), r'\s+', ''), ',')) AS assoc_company_id
    WHERE company.hs_archived = FALSE
      AND assoc_company_id = company.hs_object_id
  ),
  ranked_contacts AS (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY hubspot_company_id
        ORDER BY
          CASE WHEN company_domain != '' AND email_domain = company_domain THEN 0 ELSE 1 END,
          CASE WHEN jobtitle IS NOT NULL AND jobtitle != '' THEN 0 ELSE 1 END,
          freshness DESC,
          hubspot_contact_id
      ) AS row_num
    FROM company_contacts
  )
  SELECT
    CONCAT('user-hubspot-contact-', hubspot_contact_id) AS user_id,
    CONCAT('hubspot-company-', hubspot_company_id) AS client_id,
    'client' AS tenant_type,
    email,
    TRIM(CONCAT(COALESCE(firstname, ''), ' ', COALESCE(lastname, ''))) AS full_name,
    jobtitle,
    'invited' AS status,
    FALSE AS active,
    'password_reset_pending' AS auth_mode,
    CAST(NULL AS STRING) AS password_hash,
    CAST(NULL AS STRING) AS password_hash_algorithm,
    '/dashboard' AS default_portal_home_path,
    'America/Santiago' AS timezone,
    'es-CL' AS locale,
    CAST(NULL AS STRING) AS avatar_url,
    CAST(NULL AS TIMESTAMP) AS last_login_at,
    CURRENT_TIMESTAMP() AS invited_at,
    'user-efeonce-admin-bootstrap' AS invited_by_user_id,
    CURRENT_TIMESTAMP() AS created_at,
    CURRENT_TIMESTAMP() AS updated_at
  FROM ranked_contacts
  WHERE row_num = 1
) AS source
ON target.user_id = source.user_id
WHEN MATCHED THEN
  UPDATE SET
    client_id = source.client_id,
    tenant_type = source.tenant_type,
    email = source.email,
    full_name = source.full_name,
    job_title = source.jobtitle,
    status = source.status,
    active = source.active,
    auth_mode = source.auth_mode,
    default_portal_home_path = source.default_portal_home_path,
    timezone = source.timezone,
    locale = source.locale,
    invited_by_user_id = source.invited_by_user_id,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    user_id,
    client_id,
    tenant_type,
    email,
    full_name,
    job_title,
    status,
    active,
    auth_mode,
    password_hash,
    password_hash_algorithm,
    default_portal_home_path,
    timezone,
    locale,
    avatar_url,
    last_login_at,
    invited_at,
    invited_by_user_id,
    created_at,
    updated_at
  )
  VALUES (
    source.user_id,
    source.client_id,
    source.tenant_type,
    source.email,
    source.full_name,
    source.jobtitle,
    source.status,
    source.active,
    source.auth_mode,
    source.password_hash,
    source.password_hash_algorithm,
    source.default_portal_home_path,
    source.timezone,
    source.locale,
    source.avatar_url,
    source.last_login_at,
    source.invited_at,
    source.invited_by_user_id,
    source.created_at,
    source.updated_at
  );

MERGE `efeonce-group.greenhouse.user_role_assignments` AS target
USING (
  WITH won_deal_companies AS (
    SELECT DISTINCT company_id
    FROM `efeonce-group.hubspot_crm.deals` AS deals,
    UNNEST(SPLIT(REGEXP_REPLACE(COALESCE(deals.assoc_companies, ''), r'\s+', ''), ',')) AS company_id
    WHERE deals.hs_archived = FALSE
      AND LOWER(COALESCE(deals.dealstage, '')) = 'closedwon'
      AND company_id != ''
  ),
  company_contacts AS (
    SELECT DISTINCT
      company.hs_object_id AS hubspot_company_id,
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(NULLIF(company.domain, ''), NULLIF(company.website, ''), ''), r'^https?://', ''), r'/.*$', '')) AS company_domain,
      contact.hs_object_id AS hubspot_contact_id,
      LOWER(COALESCE(contact.hs_email_domain, '')) AS email_domain,
      contact.jobtitle,
      COALESCE(contact.lastmodifieddate, contact.hs_updated_at, contact.createdate) AS freshness
    FROM won_deal_companies won
    JOIN `efeonce-group.hubspot_crm.companies` AS company
      ON company.hs_object_id = won.company_id
    JOIN `efeonce-group.hubspot_crm.contacts` AS contact
      ON contact.hs_archived = FALSE
     AND contact.email IS NOT NULL
     AND LOWER(TRIM(contact.email)) NOT LIKE '%@efeonce.com'
     AND LOWER(TRIM(contact.email)) NOT LIKE '%@efeonce.org'
    CROSS JOIN UNNEST(SPLIT(REGEXP_REPLACE(COALESCE(contact.assoc_companies, ''), r'\s+', ''), ',')) AS assoc_company_id
    WHERE company.hs_archived = FALSE
      AND assoc_company_id = company.hs_object_id
  ),
  ranked_contacts AS (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY hubspot_company_id
        ORDER BY
          CASE WHEN company_domain != '' AND email_domain = company_domain THEN 0 ELSE 1 END,
          CASE WHEN jobtitle IS NOT NULL AND jobtitle != '' THEN 0 ELSE 1 END,
          freshness DESC,
          hubspot_contact_id
      ) AS row_num
    FROM company_contacts
  )
  SELECT
    CONCAT('assignment-hubspot-contact-', hubspot_contact_id, '-client-executive') AS assignment_id,
    CONCAT('user-hubspot-contact-', hubspot_contact_id) AS user_id,
    CONCAT('hubspot-company-', hubspot_company_id) AS client_id,
    'client_executive' AS role_code,
    'active' AS status,
    TRUE AS active,
    CURRENT_TIMESTAMP() AS effective_from,
    CAST(NULL AS TIMESTAMP) AS effective_to,
    'Bootstrap client executive role imported from HubSpot closedwon company.' AS notes,
    CURRENT_TIMESTAMP() AS created_at,
    CURRENT_TIMESTAMP() AS updated_at
  FROM ranked_contacts
  WHERE row_num = 1
) AS source
ON target.assignment_id = source.assignment_id
WHEN MATCHED THEN
  UPDATE SET
    user_id = source.user_id,
    client_id = source.client_id,
    role_code = source.role_code,
    status = source.status,
    active = source.active,
    effective_from = source.effective_from,
    effective_to = source.effective_to,
    notes = source.notes,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    assignment_id,
    user_id,
    client_id,
    role_code,
    status,
    active,
    effective_from,
    effective_to,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    source.assignment_id,
    source.user_id,
    source.client_id,
    source.role_code,
    source.status,
    source.active,
    source.effective_from,
    source.effective_to,
    source.notes,
    source.created_at,
    source.updated_at
  );

MERGE `efeonce-group.greenhouse.client_feature_flags` AS target
USING (
  WITH won_deal_companies AS (
    SELECT DISTINCT company_id
    FROM `efeonce-group.hubspot_crm.deals` AS deals,
    UNNEST(SPLIT(REGEXP_REPLACE(COALESCE(deals.assoc_companies, ''), r'\s+', ''), ',')) AS company_id
    WHERE deals.hs_archived = FALSE
      AND LOWER(COALESCE(deals.dealstage, '')) = 'closedwon'
      AND company_id != ''
  )
  SELECT
    CONCAT('flag-dashboard-kpis-hubspot-company-', company_id) AS flag_id,
    CONCAT('hubspot-company-', company_id) AS client_id,
    'dashboard-kpis' AS feature_code,
    'enabled' AS status,
    TRUE AS active,
    'Bootstrap dashboard flag for HubSpot closedwon client.' AS rollout_notes,
    CURRENT_TIMESTAMP() AS created_at,
    CURRENT_TIMESTAMP() AS updated_at
  FROM won_deal_companies
) AS source
ON target.flag_id = source.flag_id
WHEN MATCHED THEN
  UPDATE SET
    client_id = source.client_id,
    feature_code = source.feature_code,
    status = source.status,
    active = source.active,
    rollout_notes = source.rollout_notes,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    flag_id,
    client_id,
    feature_code,
    status,
    active,
    rollout_notes,
    created_at,
    updated_at
  )
  VALUES (
    source.flag_id,
    source.client_id,
    source.feature_code,
    source.status,
    source.active,
    source.rollout_notes,
    source.created_at,
    source.updated_at
  );
