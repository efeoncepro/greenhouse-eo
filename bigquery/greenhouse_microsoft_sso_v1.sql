ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS microsoft_oid STRING OPTIONS(description = "Microsoft Entra object id linked to this principal");

ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS microsoft_tenant_id STRING OPTIONS(description = "Microsoft Entra tenant id used in the last successful SSO link");

ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS microsoft_email STRING OPTIONS(description = "Microsoft account email linked to this principal");

ALTER TABLE `efeonce-group.greenhouse.client_users`
ADD COLUMN IF NOT EXISTS last_login_provider STRING OPTIONS(description = "Provider used in the last successful portal login");
