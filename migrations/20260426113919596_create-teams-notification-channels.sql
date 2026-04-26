-- Up Migration
--
-- TASK-669: Microsoft Teams notifications channel registry.
--
-- Transport-agnostic registry mapping stable channel_code -> implementation
-- specifics for posting Adaptive Card 1.5 messages to a Teams channel.
--
-- Supported channel kinds (channel_kind):
--   * 'azure_logic_app' (V1, current)
--       Implementation: Azure Logic App (Consumption) with HTTP trigger that
--       posts the card via the Teams connector. The HTTP-trigger callback URL
--       is published as a GCP Secret Manager secret resolved by secret_ref.
--       Provisioning lives in Bicep at infra/azure/teams-notifications/.
--   * 'teams_bot' (V2, future migration trigger: >15 channels OR need for
--       Action.Submit / interactive cards / multi-tenant external delivery)
--       Implementation: Bot Framework registration + Microsoft Graph
--       (POST /teams/{team_id}/channels/{channel_id}/messages) with app-only
--       auth via service principal. team_id and channel_id are required.
--       bot_app_id stores the Azure AD app registration client id; bearer
--       tokens are minted at runtime via OAuth2 client_credentials, and the
--       client secret / federated credential lives in Secret Manager under
--       secret_ref. logic_app_resource_id stays NULL.
--   * 'graph_rsc' (V2 alt, future) — reserved for Resource-Specific Consent
--       flow if we want app-only Graph access without full Bot Framework.
--
-- The sender (src/lib/integrations/teams/sender.ts) dispatches on
-- channel_kind, so the call site (postTeamsCard(channelCode, card)) stays
-- stable across transport migrations. Migrating a single channel kind only
-- requires updating its row + secret_ref payload; no schema change needed.

CREATE TABLE IF NOT EXISTS greenhouse_core.teams_notification_channels (
  channel_code text PRIMARY KEY,
  channel_kind text NOT NULL DEFAULT 'azure_logic_app',
  display_name text NOT NULL,
  description text,
  secret_ref text NOT NULL,
  logic_app_resource_id text,
  bot_app_id text,
  team_id text,
  channel_id text,
  azure_tenant_id text,
  azure_subscription_id text,
  azure_resource_group text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disabled_at timestamp with time zone,
  CONSTRAINT teams_notification_channels_code_format CHECK (
    channel_code ~ '^[a-z0-9-]+$'
  ),
  CONSTRAINT teams_notification_channels_kind_check CHECK (
    channel_kind = ANY (ARRAY['azure_logic_app'::text, 'teams_bot'::text, 'graph_rsc'::text])
  ),
  CONSTRAINT teams_notification_channels_kind_logic_app_check CHECK (
    channel_kind <> 'azure_logic_app' OR secret_ref IS NOT NULL
  ),
  CONSTRAINT teams_notification_channels_kind_bot_check CHECK (
    channel_kind NOT IN ('teams_bot', 'graph_rsc')
    OR (bot_app_id IS NOT NULL AND team_id IS NOT NULL AND channel_id IS NOT NULL AND azure_tenant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS teams_notification_channels_active_idx
  ON greenhouse_core.teams_notification_channels (channel_code)
  WHERE disabled_at IS NULL;

ALTER TABLE greenhouse_core.teams_notification_channels OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.teams_notification_channels TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.teams_notification_channels TO greenhouse_migrator;

COMMENT ON TABLE greenhouse_core.teams_notification_channels IS
  'TASK-669: Microsoft Teams notification channel registry. Transport-agnostic via channel_kind discriminator (azure_logic_app | teams_bot | graph_rsc); secret_ref points to GCP Secret Manager.';

INSERT INTO greenhouse_core.teams_notification_channels
  (channel_code, channel_kind, display_name, description, secret_ref)
VALUES
  ('ops-alerts', 'azure_logic_app', 'Ops Alerts',
   'Errores no manejados, fallos de jobs y eventos de recovery del outbox',
   'greenhouse-teams-ops-alerts-webhook'),
  ('finance-alerts', 'azure_logic_app', 'Finance Alerts',
   'Cierres VAT, divergencias de balance, reclamos SII y anomalias de Finance',
   'greenhouse-teams-finance-alerts-webhook'),
  ('delivery-pulse', 'azure_logic_app', 'Delivery Pulse',
   'Resumen diario de ICO, alertas de margin y health del portfolio',
   'greenhouse-teams-delivery-pulse-webhook')
ON CONFLICT (channel_code) DO NOTHING;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.teams_notification_channels;
