-- Up Migration

-- TASK-1762 Slice 1 — política de capacidad por vacante.
--
-- ADR: docs/architecture/GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md (Accepted 2026-08-23).
--
-- LO QUE ESTA TABLA **NO** GUARDA: el número de cupos. Ese dato ya existe y tiene dueño —
-- `hiring_opening.requested_seats` (TASK-353) —, el operador lo lee en la columna «Cupos» del Demand
-- Desk y lo edita en el campo «Cupos». Duplicarlo acá crearía un SEGUNDO «Cupos» decidiendo el cierre
-- de una cohorte real mientras la pantalla que el operador usa muestra el primero: divergencia
-- silenciosa justo en el dato que determina si decenas de personas reciben un correo.
--
-- Lo que SÍ guarda es la GOBERNANZA del opt-in: quién lo activó, cuándo, por qué y con qué versión de
-- política. Por eso `unmanaged` se expresa como AUSENCIA DE POLÍTICA VIGENTE, nunca como un NULL en un
-- conteo — una vacante sin fila (o con la fila retirada) no tiene automatización de cierre, y la
-- ausencia jamás se lee como «un cupo».

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_opening_capacity (
  opening_id      TEXT PRIMARY KEY
                    REFERENCES greenhouse_hiring.hiring_opening (opening_id) ON DELETE CASCADE,
  managed_since   TIMESTAMPTZ NOT NULL DEFAULT now(),
  set_by_user_id  TEXT NOT NULL,
  reason          TEXT NOT NULL CHECK (length(btrim(reason)) >= 10),
  policy_version  INTEGER NOT NULL DEFAULT 1 CHECK (policy_version > 0),
  -- Retiro en vez de DELETE: la política es evidencia de una decisión humana y no se borra.
  -- `unmanaged` ⟺ no hay fila O la fila está retirada.
  retired_at      TIMESTAMPTZ,
  retired_by_user_id TEXT,
  retired_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hiring_opening_capacity_retirement_pairing_check CHECK (
    (retired_at IS NULL AND retired_by_user_id IS NULL AND retired_reason IS NULL)
    OR (retired_at IS NOT NULL AND retired_by_user_id IS NOT NULL
        AND retired_reason IS NOT NULL AND length(btrim(retired_reason)) >= 10)
  )
);

COMMENT ON TABLE greenhouse_hiring.hiring_opening_capacity IS
  'TASK-1762: opt-in gobernado al cierre por capacidad. NO guarda el conteo de cupos — ese dato vive en hiring_opening.requested_seats y tiene un solo dueño. Ausencia de fila vigente = unmanaged.';

COMMENT ON COLUMN greenhouse_hiring.hiring_opening_capacity.retired_at IS
  'TASK-1762: retiro del opt-in. La fila NO se borra (es evidencia de una decisión humana); una fila retirada deja la vacante unmanaged otra vez.';

CREATE INDEX IF NOT EXISTS hiring_opening_capacity_active_idx
  ON greenhouse_hiring.hiring_opening_capacity (opening_id)
  WHERE retired_at IS NULL;

-- Bitácora append-only del ciclo de vida de la política y de todo cambio gobernado del conteo.
-- Mismo patrón que `hiring_opening_assessment_policy_event` (TASK-1719).
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_opening_capacity_event (
  event_id        TEXT PRIMARY KEY DEFAULT ('hocape-' || gen_random_uuid()::text),
  opening_id      TEXT NOT NULL
                    REFERENCES greenhouse_hiring.hiring_opening (opening_id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL CHECK (event_type IN ('policy_enabled', 'policy_retired', 'seats_changed')),
  actor_user_id   TEXT NOT NULL,
  reason          TEXT NOT NULL CHECK (length(btrim(reason)) >= 10),
  -- Sólo conteos e IDs. NUNCA PII ni copy candidato-facing.
  previous_seats  INTEGER CHECK (previous_seats IS NULL OR previous_seats > 0),
  new_seats       INTEGER CHECK (new_seats IS NULL OR new_seats > 0),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hiring_opening_capacity_event_seats_pairing_check CHECK (
    (event_type <> 'seats_changed' AND previous_seats IS NULL AND new_seats IS NULL)
    OR (event_type = 'seats_changed' AND previous_seats IS NOT NULL AND new_seats IS NOT NULL)
  )
);

COMMENT ON TABLE greenhouse_hiring.hiring_opening_capacity_event IS
  'TASK-1762: bitácora append-only de la política de capacidad y de los cambios gobernados de requested_seats. Sólo IDs y conteos, nunca PII.';

CREATE INDEX IF NOT EXISTS hiring_opening_capacity_event_opening_idx
  ON greenhouse_hiring.hiring_opening_capacity_event (opening_id, occurred_at DESC);

-- ── Guarda de mutación del conteo (patrón canónico TASK-451) ─────────────────────────────────────
--
-- Con política VIGENTE, `requested_seats` deja de ser un campo descriptivo y pasa a decidir el cierre
-- de una cohorte real. Desde ese momento sólo puede cambiar por el command de capacidad, que declara
-- `app.hiring_capacity_seats_authorized=true` dentro de su transacción tras verificar capability y
-- escribir el evento de audit. El camino genérico `updateHiringOpening` queda rechazado en base,
-- no sólo en la aplicación.
--
-- Sin política vigente la columna conserva EXACTAMENTE su comportamiento actual: el trigger no aplica.

CREATE OR REPLACE FUNCTION greenhouse_hiring.guard_managed_capacity_seats_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.requested_seats IS DISTINCT FROM OLD.requested_seats THEN
    IF EXISTS (
      SELECT 1
      FROM greenhouse_hiring.hiring_opening_capacity c
      WHERE c.opening_id = NEW.opening_id
        AND c.retired_at IS NULL
    ) THEN
      IF current_setting('app.hiring_capacity_seats_authorized', TRUE) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'requested_seats de una vacante con politica de capacidad vigente solo cambia por el command de capacidad (TASK-1762).'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION greenhouse_hiring.guard_managed_capacity_seats_mutation() IS
  'TASK-1762: rechaza cambios a hiring_opening.requested_seats cuando existe politica de capacidad vigente, salvo que la transaccion setee app.hiring_capacity_seats_authorized=true. Patron canonico de TASK-451.';

DROP TRIGGER IF EXISTS hiring_opening_managed_capacity_seats_guard ON greenhouse_hiring.hiring_opening;

CREATE TRIGGER hiring_opening_managed_capacity_seats_guard
BEFORE UPDATE ON greenhouse_hiring.hiring_opening
FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.guard_managed_capacity_seats_mutation();

-- ── Anti pre-up-marker bug guard ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
  policy_exists  boolean;
  event_exists   boolean;
  trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_opening_capacity'
  ) INTO policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_opening_capacity_event'
  ) INTO event_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'hiring_opening_managed_capacity_seats_guard' AND NOT tgisinternal
  ) INTO trigger_exists;

  IF NOT policy_exists OR NOT event_exists OR NOT trigger_exists THEN
    RAISE EXCEPTION 'TASK-1762 anti pre-up-marker check: policy=% event=% trigger=% — algun objeto NO quedo creado. Markers posiblemente invertidos.',
      policy_exists, event_exists, trigger_exists;
  END IF;
END
$$;

-- ── GRANTs ───────────────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON greenhouse_hiring.hiring_opening_capacity TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_opening_capacity_event TO greenhouse_runtime;

-- Down Migration

DROP TRIGGER IF EXISTS hiring_opening_managed_capacity_seats_guard ON greenhouse_hiring.hiring_opening;
DROP FUNCTION IF EXISTS greenhouse_hiring.guard_managed_capacity_seats_mutation();
DROP TABLE IF EXISTS greenhouse_hiring.hiring_opening_capacity_event;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_opening_capacity;
