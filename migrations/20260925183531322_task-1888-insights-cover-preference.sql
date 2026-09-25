-- Up Migration

-- TASK-1888 — Efeonce Insights: preferencia de portada por organización + variante de logo para fondo oscuro.
--
-- Aditiva (expand): tabla nueva y columna nullable. Nadie las lee con INSIGHTS_EDITORIAL_V2_ENABLED apagado; una
-- organización sin fila se lee como `auto`. La portada RESUELTA no vive aquí: se sella en el plan de cada edición
-- (`insight_editorial_plans`, inmutable), así que cambiar la preferencia nunca altera una edición ya generada.

CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_cover_preferences (
  organization_id text PRIMARY KEY
    REFERENCES greenhouse_core.organizations (organization_id),
  cover_theme text NOT NULL DEFAULT 'auto' CHECK (cover_theme IN ('auto', 'dark', 'light')),
  updated_by_actor_kind text NOT NULL CHECK (updated_by_actor_kind IN ('member', 'client_user', 'system', 'cli')),
  updated_by_user_id text NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_insights.insight_cover_preferences IS
  'TASK-1888 — portada preferida de los informes de Insights por organización (auto | dark | light). Sin fila = auto. auto = navy sólo si la organización tiene logo apto para fondo oscuro. Se escribe sólo por setInsightCoverPreference (última escritura gana, con actor).';

-- Variante del logo apta para fondo oscuro (account-360). Mismo contrato que logo_asset_id: puntero a un asset privado
-- servido por proxy, sin hotlinks; se escribe sólo por attachOrganizationLogoAsset con variant = on_dark.
ALTER TABLE greenhouse_core.organizations
  ADD COLUMN IF NOT EXISTS logo_on_dark_asset_id TEXT NULL;

COMMENT ON COLUMN greenhouse_core.organizations.logo_on_dark_asset_id IS
  'TASK-1888 — variante del logo de la organización apta para fondo oscuro (portada navy de Efeonce Insights). Nullable: sin variante, una portada auto resuelve blanca. Se escribe sólo por el command canónico de account-360 (attachOrganizationLogoAsset, variant on_dark).';

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('insights.cover_preference.manage', 'insights', ARRAY['read', 'update'], ARRAY['organization', 'tenant'],
   'Fijar la portada preferida (automática, navy o blanca) de los informes de Insights de una organización. Sólo internos que operan la cuenta; la lectura también la concede insights.report.read', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker: aborta si algún objeto no quedó creado.
DO $$
DECLARE missing text := '';
BEGIN
  IF to_regclass('greenhouse_insights.insight_cover_preferences') IS NULL THEN missing := missing || ' cover_preferences'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core' AND table_name = 'organizations' AND column_name = 'logo_on_dark_asset_id'
  ) THEN missing := missing || ' logo_on_dark_asset_id'; END IF;
  IF NOT EXISTS (SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'insights.cover_preference.manage' AND deprecated_at IS NULL) THEN missing := missing || ' capability'; END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'TASK-1888 anti pre-up-marker check: faltan objetos:%', missing;
  END IF;
END
$$;

ALTER TABLE greenhouse_insights.insight_cover_preferences OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_cover_preferences TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_insights.insight_cover_preferences TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_insights.insight_cover_preferences;
ALTER TABLE greenhouse_core.organizations DROP COLUMN IF EXISTS logo_on_dark_asset_id;
UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW() WHERE capability_key = 'insights.cover_preference.manage';
