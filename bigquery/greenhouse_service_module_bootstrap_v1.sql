MERGE `efeonce-group.greenhouse.service_modules` AS target
USING (
  SELECT
    'module-business-line-crm-solutions' AS module_id,
    'crm_solutions' AS module_code,
    'CRM Solutions' AS module_label,
    'business_line' AS module_kind,
    CAST(NULL AS STRING) AS parent_module_code,
    'hubspot_crm' AS source_system,
    'crm_solutions' AS source_value,
    TRUE AS active,
    10 AS sort_order,
    'Commercial family for CRM licensing, onboarding, and consulting work.' AS description
  UNION ALL
  SELECT
    'module-business-line-globe',
    'globe',
    'Globe',
    'business_line',
    CAST(NULL AS STRING),
    'hubspot_crm',
    'globe',
    TRUE,
    20,
    'Commercial family currently associated with creative agency work.'
  UNION ALL
  SELECT
    'module-business-line-wave',
    'wave',
    'Wave',
    'business_line',
    CAST(NULL AS STRING),
    'hubspot_crm',
    'wave',
    TRUE,
    30,
    'Commercial family currently associated with web delivery work.'
  UNION ALL
  SELECT
    'module-business-line-unknown',
    'unknown',
    'Unknown',
    'business_line',
    CAST(NULL AS STRING),
    'greenhouse',
    'unknown',
    TRUE,
    999,
    'Fallback business line when commercial data is missing.'
  UNION ALL
  SELECT
    'module-service-agencia-creativa',
    'agencia_creativa',
    'Agencia Creativa',
    'service_module',
    'globe',
    'hubspot_crm',
    'agencia_creativa',
    TRUE,
    110,
    'Creative agency service module.'
  UNION ALL
  SELECT
    'module-service-licenciamiento-hubspot',
    'licenciamiento_hubspot',
    'Licenciamiento HubSpot',
    'service_module',
    'crm_solutions',
    'hubspot_crm',
    'licenciamiento_hubspot',
    TRUE,
    120,
    'HubSpot licensing service module.'
  UNION ALL
  SELECT
    'module-service-implementacion-onboarding',
    'implementacion_onboarding',
    'Implementacion Onboarding',
    'service_module',
    'crm_solutions',
    'hubspot_crm',
    'implementacion_onboarding',
    TRUE,
    130,
    'CRM onboarding and implementation service module.'
  UNION ALL
  SELECT
    'module-service-consultoria-crm',
    'consultoria_crm',
    'Consultoria CRM',
    'service_module',
    'crm_solutions',
    'hubspot_crm',
    'consultoria_crm',
    TRUE,
    140,
    'CRM consulting service module.'
  UNION ALL
  SELECT
    'module-service-desarrollo-web',
    'desarrollo_web',
    'Desarrollo Web',
    'service_module',
    'wave',
    'hubspot_crm',
    'desarrollo_web',
    TRUE,
    150,
    'Web delivery service module.'
) AS source
ON target.module_code = source.module_code
 AND target.module_kind = source.module_kind
WHEN MATCHED THEN
  UPDATE SET
    module_label = source.module_label,
    parent_module_code = source.parent_module_code,
    source_system = source.source_system,
    source_value = source.source_value,
    active = source.active,
    sort_order = source.sort_order,
    description = source.description,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    module_id,
    module_code,
    module_label,
    module_kind,
    parent_module_code,
    source_system,
    source_value,
    active,
    sort_order,
    description,
    created_at,
    updated_at
  )
  VALUES (
    source.module_id,
    source.module_code,
    source.module_label,
    source.module_kind,
    source.parent_module_code,
    source.source_system,
    source.source_value,
    source.active,
    source.sort_order,
    source.description,
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
  );

MERGE `efeonce-group.greenhouse.client_service_modules` AS target
USING (
  WITH tenant_companies AS (
    SELECT
      client_id,
      hubspot_company_id
    FROM `efeonce-group.greenhouse.clients`
    WHERE hubspot_company_id IS NOT NULL
  ),
  closedwon_deals AS (
    SELECT
      tc.client_id,
      tc.hubspot_company_id,
      deals.hs_object_id AS deal_id,
      deals.closedate,
      NULLIF(TRIM(deals.linea_de_servicio), '') AS business_line,
      NULLIF(TRIM(service_module), '') AS service_module
    FROM `efeonce-group.hubspot_crm.deals` AS deals
    JOIN tenant_companies AS tc
      ON tc.hubspot_company_id IN UNNEST(SPLIT(REPLACE(COALESCE(deals.assoc_companies, ''), ' ', ''), ','))
    LEFT JOIN UNNEST(SPLIT(COALESCE(deals.servicios_especificos, ''), ';')) AS service_module
    WHERE LOWER(COALESCE(deals.dealstage, '')) = 'closedwon'
  ),
  module_candidates AS (
    SELECT
      client_id,
      hubspot_company_id,
      deal_id,
      closedate,
      'business_line' AS module_kind,
      business_line AS module_code
    FROM closedwon_deals
    WHERE business_line IS NOT NULL
    UNION ALL
    SELECT
      client_id,
      hubspot_company_id,
      deal_id,
      closedate,
      'service_module' AS module_kind,
      service_module AS module_code
    FROM closedwon_deals
    WHERE service_module IS NOT NULL
  ),
  ranked_candidates AS (
    SELECT
      client_id,
      hubspot_company_id,
      module_kind,
      module_code,
      deal_id,
      closedate,
      ROW_NUMBER() OVER (
        PARTITION BY client_id, module_kind, module_code
        ORDER BY closedate DESC, deal_id DESC
      ) AS rn
    FROM module_candidates
  )
  SELECT
    CONCAT('client-service-module-', client_id, '-', module_code) AS assignment_id,
    client_id,
    hubspot_company_id,
    module_code,
    'hubspot_crm' AS source_system,
    'deal' AS source_object_type,
    deal_id AS source_object_id,
    deal_id AS source_closedwon_deal_id,
    'high' AS confidence,
    TRUE AS active,
    TRUE AS derived_from_latest_closedwon
  FROM ranked_candidates
  WHERE rn = 1
) AS source
ON target.client_id = source.client_id
 AND target.module_code = source.module_code
WHEN MATCHED THEN
  UPDATE SET
    hubspot_company_id = source.hubspot_company_id,
    source_system = source.source_system,
    source_object_type = source.source_object_type,
    source_object_id = source.source_object_id,
    source_closedwon_deal_id = source.source_closedwon_deal_id,
    confidence = source.confidence,
    active = source.active,
    derived_from_latest_closedwon = source.derived_from_latest_closedwon,
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
    source.hubspot_company_id,
    source.module_code,
    source.source_system,
    source.source_object_type,
    source.source_object_id,
    source.source_closedwon_deal_id,
    source.confidence,
    source.active,
    source.derived_from_latest_closedwon,
    CURRENT_TIMESTAMP(),
    NULL,
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
  );
