-- Up Migration
SET search_path = greenhouse_finance, greenhouse_core, public;

WITH target_clients AS (
  SELECT
    c.client_id,
    c.client_name,
    COALESCE(NULLIF(c.legal_name, ''), c.client_name) AS legal_name,
    c.hubspot_company_id,
    COALESCE(NULLIF(c.country_code, ''), 'CL') AS country_code
  FROM greenhouse_core.clients c
  LEFT JOIN greenhouse_finance.client_profiles cp ON cp.client_id = c.client_id
  LEFT JOIN greenhouse_core.spaces s
    ON s.client_id = c.client_id
   AND s.active = TRUE
  WHERE c.active = TRUE
    AND c.client_id IN (
      'nubox-client-76438378-8',
      'nubox-client-91947000-3'
    )
    AND cp.client_profile_id IS NULL
    AND s.space_id IS NULL
),
existing_orgs AS (
  SELECT
    tc.client_id,
    o.organization_id
  FROM target_clients tc
  JOIN greenhouse_core.organizations o
    ON o.organization_name = tc.client_name
   AND COALESCE(o.legal_name, '') = COALESCE(tc.legal_name, '')
   AND COALESCE(o.hubspot_company_id, '') = COALESCE(tc.hubspot_company_id, '')
   AND o.active = TRUE
   AND COALESCE(o.organization_type, 'other') IN ('client', 'both')
),
missing_org_clients AS (
  SELECT tc.*
  FROM target_clients tc
  LEFT JOIN existing_orgs eo ON eo.client_id = tc.client_id
  WHERE eo.organization_id IS NULL
),
inserted_orgs AS (
  INSERT INTO greenhouse_core.organizations (
    organization_id,
    public_id,
    organization_name,
    legal_name,
    country,
    hubspot_company_id,
    organization_type,
    status,
    active,
    created_at,
    updated_at
  )
  SELECT
    'org-' || gen_random_uuid()::text,
    'EO-ORG-' || LPAD(nextval('greenhouse_core.seq_organization_public_id')::text, 4, '0'),
    moc.client_name,
    moc.legal_name,
    moc.country_code,
    moc.hubspot_company_id,
    'client',
    'active',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM missing_org_clients moc
  RETURNING organization_id, organization_name, legal_name, hubspot_company_id
),
resolved_orgs AS (
  SELECT
    tc.client_id,
    tc.legal_name,
    tc.country_code,
    tc.hubspot_company_id,
    COALESCE(eo.organization_id, io.organization_id) AS organization_id
  FROM target_clients tc
  LEFT JOIN existing_orgs eo ON eo.client_id = tc.client_id
  LEFT JOIN inserted_orgs io
    ON io.organization_name = tc.client_name
   AND COALESCE(io.legal_name, '') = COALESCE(tc.legal_name, '')
   AND COALESCE(io.hubspot_company_id, '') = COALESCE(tc.hubspot_company_id, '')
)
INSERT INTO greenhouse_finance.client_profiles (
  client_profile_id,
  client_id,
  organization_id,
  hubspot_company_id,
  legal_name,
  billing_country,
  payment_terms_days,
  payment_currency,
  requires_po,
  requires_hes,
  created_by_user_id,
  created_at,
  updated_at
)
SELECT
  ro.client_id,
  ro.client_id,
  ro.organization_id,
  COALESCE(ro.hubspot_company_id, ro.client_id),
  ro.legal_name,
  ro.country_code,
  30,
  'CLP',
  FALSE,
  FALSE,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM resolved_orgs ro
WHERE ro.organization_id IS NOT NULL
ON CONFLICT (client_profile_id) DO UPDATE
SET
  organization_id = COALESCE(greenhouse_finance.client_profiles.organization_id, EXCLUDED.organization_id),
  legal_name = COALESCE(greenhouse_finance.client_profiles.legal_name, EXCLUDED.legal_name),
  billing_country = COALESCE(greenhouse_finance.client_profiles.billing_country, EXCLUDED.billing_country),
  updated_at = CURRENT_TIMESTAMP;

-- Down Migration
SET search_path = greenhouse_finance, greenhouse_core, public;

DELETE FROM greenhouse_finance.client_profiles
WHERE client_id IN (
  'nubox-client-76438378-8',
  'nubox-client-91947000-3'
)
  AND created_by_user_id IS NULL;

DELETE FROM greenhouse_core.organizations o
WHERE o.organization_name IN (
  'SGI Asesoría y Marketing Inmobiliario',
  'Sika Chile'
)
  AND COALESCE(o.organization_type, 'other') = 'client'
  AND NOT EXISTS (
    SELECT 1
    FROM greenhouse_finance.client_profiles cp
    WHERE cp.organization_id = o.organization_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = o.organization_id
  );
