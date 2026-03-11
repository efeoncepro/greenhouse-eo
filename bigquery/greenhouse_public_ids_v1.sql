ALTER TABLE `efeonce-group.greenhouse.clients`
ADD COLUMN IF NOT EXISTS public_id STRING OPTIONS(description = "Greenhouse product-facing tenant identifier");

ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS public_id STRING OPTIONS(description = "Greenhouse product-facing collaborator identifier");

ALTER TABLE `efeonce-group.greenhouse.service_modules`
ADD COLUMN IF NOT EXISTS public_id STRING OPTIONS(description = "Greenhouse product-facing business line or service identifier");

ALTER TABLE `efeonce-group.greenhouse.client_service_modules`
ADD COLUMN IF NOT EXISTS public_id STRING OPTIONS(description = "Greenhouse product-facing tenant capability assignment identifier");

ALTER TABLE `efeonce-group.greenhouse.user_role_assignments`
ADD COLUMN IF NOT EXISTS public_id STRING OPTIONS(description = "Greenhouse product-facing role assignment identifier");

ALTER TABLE `efeonce-group.greenhouse.client_feature_flags`
ADD COLUMN IF NOT EXISTS public_id STRING OPTIONS(description = "Greenhouse product-facing feature flag assignment identifier");

UPDATE `efeonce-group.greenhouse.clients`
SET public_id = CASE
  WHEN REGEXP_CONTAINS(COALESCE(hubspot_company_id, ''), r'^\d+$') THEN CONCAT('EO-', hubspot_company_id)
  WHEN REGEXP_CONTAINS(client_id, r'^hubspot-company-(\d+)$') THEN CONCAT('EO-', REGEXP_EXTRACT(client_id, r'^hubspot-company-(\d+)$'))
  WHEN STARTS_WITH(client_id, 'space-') THEN CONCAT('EO-SPACE-', UPPER(REGEXP_REPLACE(SUBSTR(client_id, 7), r'[^a-zA-Z0-9]+', '-')))
  ELSE CONCAT('EO-TEN-', UPPER(REGEXP_REPLACE(client_id, r'[^a-zA-Z0-9]+', '-')))
END
WHERE public_id IS NULL OR public_id = '';

UPDATE `efeonce-group.greenhouse.client_users`
SET public_id = CASE
  WHEN REGEXP_CONTAINS(user_id, r'^user-hubspot-contact-(\d+)$') THEN CONCAT('EO-USR-', REGEXP_EXTRACT(user_id, r'^user-hubspot-contact-(\d+)$'))
  WHEN STARTS_WITH(user_id, 'user-') THEN CONCAT('EO-USR-', UPPER(REGEXP_REPLACE(SUBSTR(user_id, 6), r'[^a-zA-Z0-9]+', '-')))
  ELSE CONCAT('EO-USR-', UPPER(REGEXP_REPLACE(user_id, r'[^a-zA-Z0-9]+', '-')))
END
WHERE public_id IS NULL OR public_id = '';

UPDATE `efeonce-group.greenhouse.service_modules`
SET public_id = CASE
  WHEN module_kind = 'business_line' THEN CONCAT('EO-BL-', UPPER(REGEXP_REPLACE(module_code, r'[^a-zA-Z0-9]+', '-')))
  ELSE CONCAT('EO-SVC-', UPPER(REGEXP_REPLACE(module_code, r'[^a-zA-Z0-9]+', '-')))
END
WHERE public_id IS NULL OR public_id = '';

UPDATE `efeonce-group.greenhouse.client_service_modules`
SET public_id = CONCAT(
  'EO-CAP-',
  REGEXP_REPLACE(
    CASE
      WHEN REGEXP_CONTAINS(COALESCE(hubspot_company_id, ''), r'^\d+$') THEN CONCAT('EO-', hubspot_company_id)
      WHEN REGEXP_CONTAINS(client_id, r'^hubspot-company-(\d+)$') THEN CONCAT('EO-', REGEXP_EXTRACT(client_id, r'^hubspot-company-(\d+)$'))
      WHEN STARTS_WITH(client_id, 'space-') THEN CONCAT('EO-SPACE-', UPPER(REGEXP_REPLACE(SUBSTR(client_id, 7), r'[^a-zA-Z0-9]+', '-')))
      ELSE CONCAT('EO-TEN-', UPPER(REGEXP_REPLACE(client_id, r'[^a-zA-Z0-9]+', '-')))
    END,
    r'^EO-',
    ''
  ),
  '-',
  UPPER(REGEXP_REPLACE(module_code, r'[^a-zA-Z0-9]+', '-'))
)
WHERE public_id IS NULL OR public_id = '';

UPDATE `efeonce-group.greenhouse.user_role_assignments` AS ura
SET public_id = CONCAT(
  'EO-ROLE-',
  REGEXP_REPLACE(
    CASE
      WHEN REGEXP_CONTAINS(COALESCE(c.hubspot_company_id, ''), r'^\d+$') THEN CONCAT('EO-', c.hubspot_company_id)
      WHEN c.client_id IS NOT NULL AND REGEXP_CONTAINS(c.client_id, r'^hubspot-company-(\d+)$') THEN CONCAT('EO-', REGEXP_EXTRACT(c.client_id, r'^hubspot-company-(\d+)$'))
      WHEN c.client_id IS NOT NULL AND STARTS_WITH(c.client_id, 'space-') THEN CONCAT('EO-SPACE-', UPPER(REGEXP_REPLACE(SUBSTR(c.client_id, 7), r'[^a-zA-Z0-9]+', '-')))
      WHEN c.client_id IS NOT NULL THEN CONCAT('EO-TEN-', UPPER(REGEXP_REPLACE(c.client_id, r'[^a-zA-Z0-9]+', '-')))
      ELSE 'INTERNAL'
    END,
    r'^EO-',
    ''
  ),
  '-',
  REGEXP_REPLACE(
    CASE
      WHEN REGEXP_CONTAINS(ura.user_id, r'^user-hubspot-contact-(\d+)$') THEN CONCAT('EO-USR-', REGEXP_EXTRACT(ura.user_id, r'^user-hubspot-contact-(\d+)$'))
      WHEN STARTS_WITH(ura.user_id, 'user-') THEN CONCAT('EO-USR-', UPPER(REGEXP_REPLACE(SUBSTR(ura.user_id, 6), r'[^a-zA-Z0-9]+', '-')))
      ELSE CONCAT('EO-USR-', UPPER(REGEXP_REPLACE(ura.user_id, r'[^a-zA-Z0-9]+', '-')))
    END,
    r'^EO-USR-',
    ''
  ),
  '-',
  UPPER(REGEXP_REPLACE(ura.role_code, r'[^a-zA-Z0-9]+', '-'))
)
FROM `efeonce-group.greenhouse.clients` AS c
WHERE ura.client_id = c.client_id
  AND (ura.public_id IS NULL OR ura.public_id = '');

UPDATE `efeonce-group.greenhouse.client_feature_flags` AS cff
SET public_id = CONCAT(
  'EO-FLG-',
  REGEXP_REPLACE(
    CASE
      WHEN REGEXP_CONTAINS(COALESCE(c.hubspot_company_id, ''), r'^\d+$') THEN CONCAT('EO-', c.hubspot_company_id)
      WHEN REGEXP_CONTAINS(c.client_id, r'^hubspot-company-(\d+)$') THEN CONCAT('EO-', REGEXP_EXTRACT(c.client_id, r'^hubspot-company-(\d+)$'))
      WHEN STARTS_WITH(c.client_id, 'space-') THEN CONCAT('EO-SPACE-', UPPER(REGEXP_REPLACE(SUBSTR(c.client_id, 7), r'[^a-zA-Z0-9]+', '-')))
      ELSE CONCAT('EO-TEN-', UPPER(REGEXP_REPLACE(c.client_id, r'[^a-zA-Z0-9]+', '-')))
    END,
    r'^EO-',
    ''
  ),
  '-',
  UPPER(REGEXP_REPLACE(cff.feature_code, r'[^a-zA-Z0-9]+', '-'))
)
FROM `efeonce-group.greenhouse.clients` AS c
WHERE cff.client_id = c.client_id
  AND (cff.public_id IS NULL OR cff.public_id = '');
