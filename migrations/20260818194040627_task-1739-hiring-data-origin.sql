-- Up Migration

-- TASK-1739 Slice 1 — Fundación de procedencia de datos de Hiring (`data_origin`).
--
-- Instala el HECHO "esto es (o no es) un dato del mundo real" en las DOS raíces del dominio
-- —persona y demanda— más una copia derivada en `hiring_application`, que es donde el desk filtra.
-- Additive puro: la columna nace con DEFAULT 'real' y NOT NULL, así que TODO INSERT existente sigue
-- funcionando sin cambios y ninguna lectura cambia de comportamiento en este slice.
--
-- `real` como default es la mitigación principal: omitir la declaración deja el dato VISIBLE
-- (suciedad, molesto) en vez de ocultarlo (pérdida silenciosa de un candidato real, grave).
--
-- NO instala el trigger de derivación de `hiring_application` (Slice 2) ni filtra readers (Slice 3).

-- ── 1. Columna en las dos raíces + la copia derivada ─────────────────────────────────────────────
-- `ADD COLUMN … DEFAULT` es metadata-only en PG 16: no reescribe la tabla ni bloquea escrituras.

ALTER TABLE greenhouse_core.identity_profiles
  ADD COLUMN IF NOT EXISTS data_origin TEXT NOT NULL DEFAULT 'real';

ALTER TABLE greenhouse_hiring.talent_demand
  ADD COLUMN IF NOT EXISTS data_origin TEXT NOT NULL DEFAULT 'real';

ALTER TABLE greenhouse_hiring.hiring_opening
  ADD COLUMN IF NOT EXISTS data_origin TEXT NOT NULL DEFAULT 'real';

-- Derivada de las dos anteriores (gana el no-real). El trigger que la mantiene llega en Slice 2;
-- hasta entonces la columna existe y vale 'real' en todas las filas.
ALTER TABLE greenhouse_hiring.hiring_application
  ADD COLUMN IF NOT EXISTS data_origin TEXT NOT NULL DEFAULT 'real';

-- Enum cerrado. Los tres valores no-real se distinguen por CICLO DE VIDA y política de purga:
-- `synthetic_seed` fixture persistente · `smoke_test` verificación puntual · `demo` puede tener que sobrevivir.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'identity_profiles_data_origin_check') THEN
    ALTER TABLE greenhouse_core.identity_profiles
      ADD CONSTRAINT identity_profiles_data_origin_check
      CHECK (data_origin IN ('real', 'synthetic_seed', 'smoke_test', 'demo'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'talent_demand_data_origin_check') THEN
    ALTER TABLE greenhouse_hiring.talent_demand
      ADD CONSTRAINT talent_demand_data_origin_check
      CHECK (data_origin IN ('real', 'synthetic_seed', 'smoke_test', 'demo'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hiring_opening_data_origin_check') THEN
    ALTER TABLE greenhouse_hiring.hiring_opening
      ADD CONSTRAINT hiring_opening_data_origin_check
      CHECK (data_origin IN ('real', 'synthetic_seed', 'smoke_test', 'demo'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hiring_application_data_origin_check') THEN
    ALTER TABLE greenhouse_hiring.hiring_application
      ADD CONSTRAINT hiring_application_data_origin_check
      CHECK (data_origin IN ('real', 'synthetic_seed', 'smoke_test', 'demo'));
  END IF;
END
$$;

-- Índices PARCIALES: el universo no-real es chico (esperado ~3-8 personas y ~12 vacantes sobre 250/14
-- filas); un índice completo sería desperdicio sobre una columna con 99 % del mismo valor.
CREATE INDEX IF NOT EXISTS identity_profiles_synthetic_idx
  ON greenhouse_core.identity_profiles (data_origin) WHERE data_origin <> 'real';
CREATE INDEX IF NOT EXISTS talent_demand_synthetic_idx
  ON greenhouse_hiring.talent_demand (data_origin) WHERE data_origin <> 'real';
CREATE INDEX IF NOT EXISTS hiring_opening_synthetic_idx
  ON greenhouse_hiring.hiring_opening (data_origin) WHERE data_origin <> 'real';
CREATE INDEX IF NOT EXISTS hiring_application_synthetic_idx
  ON greenhouse_hiring.hiring_application (data_origin) WHERE data_origin <> 'real';

-- ── 2. Audit append-only de procedencia ──────────────────────────────────────────────────────────
-- Es lo que permite el rollback per-record y lo que hace DEFENDIBLE cualquier archivado o borrado.
-- NUNCA guarda nombre ni correo: la PII vive en las tablas restringidas, jamás en el rastro de audit.

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_data_origin_audit (
  audit_id       TEXT PRIMARY KEY DEFAULT ('hdoa-' || gen_random_uuid()::text),
  -- Qué entidad se tocó. Enum cerrado: sin esto el rollback no sabe a qué tabla volver.
  record_type    TEXT NOT NULL CHECK (record_type IN
                   ('identity_profile', 'talent_demand', 'hiring_opening', 'hiring_application')),
  record_id      TEXT NOT NULL CHECK (length(record_id) BETWEEN 1 AND 200),
  action         TEXT NOT NULL CHECK (action IN ('mark', 'archive', 'delete', 'rollback')),
  before_value   TEXT NULL CHECK (before_value IS NULL OR before_value IN
                   ('real', 'synthetic_seed', 'smoke_test', 'demo')),
  after_value    TEXT NULL CHECK (after_value IS NULL OR after_value IN
                   ('real', 'synthetic_seed', 'smoke_test', 'demo')),
  -- Snapshot de lo borrado (sólo `delete`): deja constancia de que la fila existió. Sin PII.
  deleted_snapshot_json JSONB NULL,
  actor_user_id  TEXT NOT NULL CHECK (length(actor_user_id) > 0),
  reason         TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 1000),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un `mark` sin valor posterior no es un marcado: es un registro vacío.
  CONSTRAINT hiring_data_origin_audit_mark_check CHECK (
    action <> 'mark' OR after_value IS NOT NULL
  ),
  -- El rollback necesita saber a qué volver.
  CONSTRAINT hiring_data_origin_audit_rollback_check CHECK (
    action <> 'rollback' OR after_value IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS hiring_data_origin_audit_record_idx
  ON greenhouse_hiring.hiring_data_origin_audit (record_type, record_id, created_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_hiring.prevent_hiring_data_origin_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'hiring_data_origin_audit es append-only (TASK-1739): % no permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hiring_data_origin_audit_append_only
  ON greenhouse_hiring.hiring_data_origin_audit;
CREATE TRIGGER trg_hiring_data_origin_audit_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_hiring.hiring_data_origin_audit
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.prevent_hiring_data_origin_audit_mutation();

ALTER TABLE greenhouse_hiring.hiring_data_origin_audit OWNER TO greenhouse_ops;
-- Sin DELETE ni UPDATE a propósito: el grant es la primera capa del append-only, el trigger la segunda.
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_data_origin_audit TO greenhouse_runtime;

-- ── 3. Guarda anti pre-up-marker ─────────────────────────────────────────────────────────────────
-- Si los markers quedaran invertidos, node-pg-migrate registraría la migración como aplicada SIN
-- ejecutar nada y las 4 columnas no existirían, en silencio. Este bloque convierte ese silencio en
-- una excepción.
DO $$
DECLARE
  missing_columns INT;
  audit_exists BOOLEAN;
  trigger_exists BOOLEAN;
BEGIN
  SELECT 4 - COUNT(*) INTO missing_columns
    FROM information_schema.columns
   WHERE column_name = 'data_origin'
     AND (table_schema, table_name) IN (
       ('greenhouse_core', 'identity_profiles'),
       ('greenhouse_hiring', 'talent_demand'),
       ('greenhouse_hiring', 'hiring_opening'),
       ('greenhouse_hiring', 'hiring_application'));

  IF missing_columns <> 0 THEN
    RAISE EXCEPTION 'TASK-1739 anti pre-up-marker: faltan % columna(s) data_origin. Markers posiblemente invertidos.', missing_columns;
  END IF;

  SELECT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_data_origin_audit')
    INTO audit_exists;

  IF NOT audit_exists THEN
    RAISE EXCEPTION 'TASK-1739 anti pre-up-marker: hiring_data_origin_audit NO fue creada.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_trigger
                  WHERE tgname = 'trg_hiring_data_origin_audit_append_only' AND NOT tgisinternal)
    INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'TASK-1739 anti pre-up-marker: el trigger append-only del audit NO quedó instalado.';
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_hiring_data_origin_audit_append_only
  ON greenhouse_hiring.hiring_data_origin_audit;
DROP FUNCTION IF EXISTS greenhouse_hiring.prevent_hiring_data_origin_audit_mutation();
DROP TABLE IF EXISTS greenhouse_hiring.hiring_data_origin_audit;

DROP INDEX IF EXISTS greenhouse_hiring.hiring_application_synthetic_idx;
DROP INDEX IF EXISTS greenhouse_hiring.hiring_opening_synthetic_idx;
DROP INDEX IF EXISTS greenhouse_hiring.talent_demand_synthetic_idx;
DROP INDEX IF EXISTS greenhouse_core.identity_profiles_synthetic_idx;

ALTER TABLE greenhouse_hiring.hiring_application DROP CONSTRAINT IF EXISTS hiring_application_data_origin_check;
ALTER TABLE greenhouse_hiring.hiring_opening DROP CONSTRAINT IF EXISTS hiring_opening_data_origin_check;
ALTER TABLE greenhouse_hiring.talent_demand DROP CONSTRAINT IF EXISTS talent_demand_data_origin_check;
ALTER TABLE greenhouse_core.identity_profiles DROP CONSTRAINT IF EXISTS identity_profiles_data_origin_check;

ALTER TABLE greenhouse_hiring.hiring_application DROP COLUMN IF EXISTS data_origin;
ALTER TABLE greenhouse_hiring.hiring_opening DROP COLUMN IF EXISTS data_origin;
ALTER TABLE greenhouse_hiring.talent_demand DROP COLUMN IF EXISTS data_origin;
ALTER TABLE greenhouse_core.identity_profiles DROP COLUMN IF EXISTS data_origin;
