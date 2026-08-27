-- Up Migration

-- TASK-1762 Slice 2 — run durable de cierre por capacidad.
--
-- ADR: docs/architecture/GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md (Accepted 2026-08-23).
--
-- El run persiste UN ITEM POR CANDIDATURA **antes** de ejecutar cualquier efecto. Esa es la
-- propiedad que hace recuperable un cierre parcial: si el worker muere a mitad, el estado de cada
-- persona quedó escrito, y reanudar es leer los items pendientes — nunca reprocesar la cohorte
-- entera ni reconstruirla desde cero (la cohorte pudo cambiar mientras tanto).
--
-- La confirmación NO cambia candidaturas ni manda correos: sólo crea el run y sus items. Los efectos
-- los aplica el reconciler (Slice 3), item por item, via el command canónico de decisión.

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_opening_closure_run (
  run_id            TEXT PRIMARY KEY DEFAULT ('hocr-' || gen_random_uuid()::text),
  opening_id        TEXT NOT NULL
                      REFERENCES greenhouse_hiring.hiring_opening (opening_id) ON DELETE RESTRICT,
  state             TEXT NOT NULL DEFAULT 'pending'
                      CHECK (state IN ('pending', 'running', 'completed', 'partially_failed', 'cancelled')),
  -- Huella exacta de la cohorte que el humano vio al confirmar. Si la realidad cambió entre el
  -- preview y el confirm, el digest no coincide y el confirm se rechaza: nadie cierra una cohorte
  -- distinta de la que aprobó.
  effect_digest     TEXT NOT NULL CHECK (length(effect_digest) = 64),
  -- Idempotencia del confirm: un reintento con la misma clave devuelve el run existente en vez de
  -- crear uno nuevo. Un doble clic no cierra dos veces.
  idempotency_key   TEXT NOT NULL,
  confirmed_by_user_id TEXT NOT NULL,
  -- Conteos congelados al confirmar. Son evidencia de lo aprobado, no una proyección viva.
  target_seats      INTEGER NOT NULL CHECK (target_seats > 0),
  occupied_seats    INTEGER NOT NULL CHECK (occupied_seats >= 0),
  cohort_size       INTEGER NOT NULL CHECK (cohort_size >= 0),
  -- Inclusiones explícitas: por defecto NO entran, y el humano debe pedirlas.
  included_paused   BOOLEAN NOT NULL DEFAULT FALSE,
  included_backup   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  CONSTRAINT hiring_opening_closure_run_terminal_pairing_check CHECK (
    (state IN ('completed', 'partially_failed', 'cancelled')) = (completed_at IS NOT NULL)
  )
);

COMMENT ON TABLE greenhouse_hiring.hiring_opening_closure_run IS
  'TASK-1762: run durable de cierre por capacidad. La confirmacion crea el run y sus items; NO cambia candidaturas ni envia correo. Los efectos los aplica el reconciler.';

COMMENT ON COLUMN greenhouse_hiring.hiring_opening_closure_run.effect_digest IS
  'TASK-1762: huella de la cohorte exacta que el humano aprobo. Un preview vencido no puede confirmar.';

-- Un solo run vigente por vacante. Dos cierres simultaneos de la misma vacante compiten por esta
-- fila y el segundo pierde limpio, en vez de duplicar decisiones sobre las mismas personas.
CREATE UNIQUE INDEX IF NOT EXISTS hiring_opening_closure_run_one_active_idx
  ON greenhouse_hiring.hiring_opening_closure_run (opening_id)
  WHERE state IN ('pending', 'running');

CREATE UNIQUE INDEX IF NOT EXISTS hiring_opening_closure_run_idempotency_idx
  ON greenhouse_hiring.hiring_opening_closure_run (opening_id, idempotency_key);

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_opening_closure_run_item (
  item_id         TEXT PRIMARY KEY DEFAULT ('hocri-' || gen_random_uuid()::text),
  run_id          TEXT NOT NULL
                    REFERENCES greenhouse_hiring.hiring_opening_closure_run (run_id) ON DELETE CASCADE,
  application_id  TEXT NOT NULL
                    REFERENCES greenhouse_hiring.hiring_application (application_id) ON DELETE RESTRICT,
  -- De que categoria del preview vino. Sirve para explicar despues por que alguien entro: no es lo
  -- mismo haber entrado por defecto que por una inclusion explicita del operador.
  cohort_category TEXT NOT NULL CHECK (cohort_category IN ('eligible', 'paused', 'backup')),
  state           TEXT NOT NULL DEFAULT 'pending'
                    CHECK (state IN ('pending', 'decided', 'skipped', 'failed', 'quarantined')),
  attempts        INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  -- Motivo sanitizado. NUNCA PII ni copy candidato-facing: esto lo leen dashboards y logs.
  last_error_code TEXT,
  decided_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hiring_opening_closure_run_item_decided_pairing_check CHECK (
    (state = 'decided') = (decided_at IS NOT NULL)
  )
);

COMMENT ON TABLE greenhouse_hiring.hiring_opening_closure_run_item IS
  'TASK-1762: un item por candidatura, escrito ANTES de aplicar efectos. Es lo que hace recuperable un cierre parcial. last_error_code es un codigo sanitizado, nunca PII.';

-- Una candidatura no puede estar dos veces en el mismo run.
CREATE UNIQUE INDEX IF NOT EXISTS hiring_opening_closure_run_item_unique_idx
  ON greenhouse_hiring.hiring_opening_closure_run_item (run_id, application_id);

CREATE INDEX IF NOT EXISTS hiring_opening_closure_run_item_pending_idx
  ON greenhouse_hiring.hiring_opening_closure_run_item (run_id, state)
  WHERE state IN ('pending', 'failed');

-- ── Anti pre-up-marker bug guard ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
  run_exists   boolean;
  item_exists  boolean;
  uniq_exists  boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema='greenhouse_hiring' AND table_name='hiring_opening_closure_run') INTO run_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema='greenhouse_hiring' AND table_name='hiring_opening_closure_run_item') INTO item_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes
    WHERE schemaname='greenhouse_hiring' AND indexname='hiring_opening_closure_run_one_active_idx') INTO uniq_exists;

  IF NOT run_exists OR NOT item_exists OR NOT uniq_exists THEN
    RAISE EXCEPTION 'TASK-1762 Slice 2 anti pre-up-marker check: run=% item=% uniq=% — algun objeto NO quedo creado.',
      run_exists, item_exists, uniq_exists;
  END IF;
END
$$;

-- ── GRANTs ───────────────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON greenhouse_hiring.hiring_opening_closure_run TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_hiring.hiring_opening_closure_run_item TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_hiring.hiring_opening_closure_run_item;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_opening_closure_run;
