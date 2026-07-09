-- Up Migration

-- TASK-1375 — `greenhouse_growth.form_asset`: mapeo SERVER-ONLY de un Growth Form a
-- su asset entregable gated (ebook PDF en el bucket privado). NUNCA cruza al render
-- contract (leak boundary): la ruta de descarga resuelve el objeto desde acá por el
-- `form_id` de la submission aceptada. Un form = una fila activa (el asset que entrega).
-- Primitive reusable para todos los ebook lead magnets (playbook
-- docs/reference/ebook-lead-magnet-playbook.md).

CREATE TABLE IF NOT EXISTS greenhouse_growth.form_asset (
  form_asset_id  TEXT PRIMARY KEY DEFAULT ('fass-' || gen_random_uuid()::text),
  form_id        TEXT NOT NULL REFERENCES greenhouse_growth.form_definition (form_id) ON DELETE RESTRICT,
  asset_kind     TEXT NOT NULL DEFAULT 'ebook'
                   CHECK (asset_kind IN ('ebook', 'guide', 'template', 'report', 'other')),
  -- `object_name` = path del objeto dentro de GREENHOUSE_PRIVATE_ASSETS_BUCKET. El
  -- nombre del bucket se resuelve en runtime (env-aware) via getGreenhousePrivateAssetsBucket();
  -- por eso NO se persiste acá (difiere por ambiente staging/prod).
  object_name    TEXT NOT NULL,
  file_name      TEXT NOT NULL,                       -- filename del Content-Disposition (lo ve el usuario)
  content_type   TEXT NOT NULL DEFAULT 'application/pdf',
  ttl_hours      INTEGER NOT NULL DEFAULT 72 CHECK (ttl_hours > 0),  -- ventana de descarga desde la submission
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un solo asset activo por form (el asset que entrega). Append-friendly: se puede
-- reemplazar desactivando la fila vieja e insertando una nueva.
CREATE UNIQUE INDEX IF NOT EXISTS form_asset_one_active_per_form_idx
  ON greenhouse_growth.form_asset (form_id)
  WHERE active;

-- Anti pre-up-marker bug guard: aborta si la tabla NO quedó creada realmente.
DO $$
DECLARE table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'greenhouse_growth' AND table_name = 'form_asset'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1375: greenhouse_growth.form_asset was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- GRANTs (espeja las tablas del engine Growth Forms).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_asset TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_asset TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_asset TO greenhouse_migrator_user;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.form_asset_one_active_per_form_idx;
DROP TABLE IF EXISTS greenhouse_growth.form_asset;
