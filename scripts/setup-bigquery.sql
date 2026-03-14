CREATE SCHEMA IF NOT EXISTS `efeonce-group.greenhouse`
OPTIONS(
  location = "US",
  description = "Greenhouse portal tenant configuration, identity, access, and app-owned tables"
);

-- Microsoft SSO runs over greenhouse.client_users, not over the legacy tenant row.
ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS microsoft_oid STRING OPTIONS(description = "Microsoft Entra object id linked to this principal");

ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS microsoft_tenant_id STRING OPTIONS(description = "Microsoft Entra tenant id used in the last successful SSO link");

ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS microsoft_email STRING OPTIONS(description = "Microsoft account email linked to this principal");

-- Google SSO also links against greenhouse.client_users as the canonical auth principal.
ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS google_sub STRING OPTIONS(description = "Google subject id linked to this principal");

ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS google_email STRING OPTIONS(description = "Google account email linked to this principal");

ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS last_login_provider STRING OPTIONS(description = "Provider used in the last successful portal login");
