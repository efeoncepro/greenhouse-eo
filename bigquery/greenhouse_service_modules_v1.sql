CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.service_modules` (
  module_id STRING NOT NULL OPTIONS(description = "Stable id for the module record"),
  module_code STRING NOT NULL OPTIONS(description = "Canonical Greenhouse module code"),
  module_label STRING NOT NULL OPTIONS(description = "Display label used by the product"),
  module_kind STRING NOT NULL OPTIONS(description = "business_line or service_module"),
  parent_module_code STRING OPTIONS(description = "Parent business line when module_kind = service_module"),
  source_system STRING OPTIONS(description = "Origin system such as hubspot_crm"),
  source_value STRING OPTIONS(description = "Raw source value from the commercial system"),
  active BOOL NOT NULL OPTIONS(description = "Whether the module is currently available"),
  sort_order INT64 OPTIONS(description = "Optional display order"),
  description STRING OPTIONS(description = "Human description of the module"),
  created_at TIMESTAMP NOT NULL OPTIONS(description = "Creation timestamp"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description = "Last update timestamp")
)
OPTIONS(description = "Canonical business lines and service modules recognized by Greenhouse");

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.client_service_modules` (
  assignment_id STRING NOT NULL OPTIONS(description = "Stable id for the client-module assignment"),
  client_id STRING NOT NULL OPTIONS(description = "Greenhouse tenant id"),
  hubspot_company_id STRING OPTIONS(description = "HubSpot company id linked to the tenant"),
  module_code STRING NOT NULL OPTIONS(description = "Module code assigned to the tenant"),
  source_system STRING OPTIONS(description = "Origin system such as hubspot_crm"),
  source_object_type STRING OPTIONS(description = "Type of object used as evidence, usually deal"),
  source_object_id STRING OPTIONS(description = "Source object id in the origin system"),
  source_closedwon_deal_id STRING OPTIONS(description = "Closedwon deal used as evidence for the assignment"),
  confidence STRING OPTIONS(description = "high, medium, low, or inferred"),
  active BOOL NOT NULL OPTIONS(description = "Whether the assignment is active"),
  derived_from_latest_closedwon BOOL OPTIONS(description = "Whether the assignment came from the latest closedwon deal"),
  valid_from TIMESTAMP OPTIONS(description = "Start of validity for the assignment"),
  valid_to TIMESTAMP OPTIONS(description = "End of validity for the assignment"),
  created_at TIMESTAMP NOT NULL OPTIONS(description = "Creation timestamp"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description = "Last update timestamp")
)
OPTIONS(description = "Service modules active for each Greenhouse tenant");
