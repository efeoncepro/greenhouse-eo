ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS identity_profile_id STRING
OPTIONS(description = "Canonical internal identity profile linked to this auth principal when available");

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.identity_profiles` (
  profile_id STRING NOT NULL OPTIONS(description = "Stable canonical identity profile identifier"),
  public_id STRING NOT NULL OPTIONS(description = "Greenhouse EO-ID shown for canonical internal identities"),
  profile_type STRING NOT NULL OPTIONS(description = "efeonce_internal for the current phase"),
  canonical_email STRING OPTIONS(description = "Primary resolved email for the profile"),
  full_name STRING NOT NULL OPTIONS(description = "Canonical display name"),
  job_title STRING OPTIONS(description = "Canonical business title"),
  status STRING NOT NULL OPTIONS(description = "active, invited, disabled, archived"),
  active BOOL NOT NULL OPTIONS(description = "Quick runtime gate"),
  default_auth_mode STRING OPTIONS(description = "credentials, sso, or future transport default"),
  primary_source_system STRING NOT NULL OPTIONS(description = "Anchor source system such as hubspot_crm, greenhouse_auth, notion, azure_ad"),
  primary_source_object_type STRING NOT NULL OPTIONS(description = "Anchor object type such as owner, client_user, person, user"),
  primary_source_object_id STRING NOT NULL OPTIONS(description = "Anchor object identifier inside the source system"),
  notes STRING OPTIONS(description = "Operational notes for manual reconciliation"),
  created_at TIMESTAMP NOT NULL OPTIONS(description = "Row creation time"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description = "Last update time")
)
OPTIONS(description = "Canonical internal collaborator identities for Efeonce across HubSpot, Greenhouse auth, Notion, and future Azure AD");

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.identity_profile_source_links` (
  link_id STRING NOT NULL OPTIONS(description = "Stable source-link identifier"),
  profile_id STRING NOT NULL OPTIONS(description = "Canonical identity profile"),
  source_system STRING NOT NULL OPTIONS(description = "hubspot_crm, greenhouse_auth, notion, azure_ad, etc."),
  source_object_type STRING NOT NULL OPTIONS(description = "owner, client_user, person, user, etc."),
  source_object_id STRING NOT NULL OPTIONS(description = "Source identifier"),
  source_user_id STRING OPTIONS(description = "Secondary source user identifier when available"),
  source_email STRING OPTIONS(description = "Source email snapshot"),
  source_display_name STRING OPTIONS(description = "Source display name snapshot"),
  is_primary BOOL NOT NULL OPTIONS(description = "Whether this source is the current primary reference"),
  is_login_identity BOOL NOT NULL OPTIONS(description = "Whether this source can be used as a login principal"),
  active BOOL NOT NULL OPTIONS(description = "Quick runtime gate"),
  created_at TIMESTAMP NOT NULL OPTIONS(description = "Row creation time"),
  updated_at TIMESTAMP NOT NULL OPTIONS(description = "Last update time")
)
OPTIONS(description = "Source lineage for canonical internal identity profiles");
