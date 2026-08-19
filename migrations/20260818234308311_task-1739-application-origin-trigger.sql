-- Up Migration

-- TASK-1739 Slice 2 — Trigger de derivación de `hiring_application.data_origin`.
--
-- Una postulación es no-real si su PERSONA **o** su VACANTE es no-real: una postulación de persona
-- real a una vacante inventada no es evidencia real, y viceversa. La columna se denormaliza porque
-- el desk y las métricas filtran sobre `hiring_application` en cada lectura, y obligar a un JOIN a
-- las dos raíces en cada reader es el tipo de invariante que se olvida en el reader número once.
--
-- El trigger es la AUTORIDAD: el command nunca elige el valor. Su espejo en TS
-- (`deriveApplicationDataOrigin`, `src/lib/hiring/data-origin/contracts.ts`) existe para readers,
-- tests y planificación del backfill, y un live test de paridad debe confrontar ambos — dos
-- implementaciones de la misma regla derivan si nadie las enfrenta.
--
-- Dispara también en UPDATE a propósito: es el mecanismo por el que el marcado de una raíz
-- (Slice 4) propaga a sus dependientes. Marcar una raíz NO toca esta fila, así que el command debe
-- provocar el UPDATE; el trigger recalcula.

CREATE OR REPLACE FUNCTION greenhouse_hiring.derive_hiring_application_data_origin()
RETURNS trigger AS $$
DECLARE
  person_origin  TEXT;
  opening_origin TEXT;
BEGIN
  SELECT data_origin INTO person_origin
    FROM greenhouse_core.identity_profiles
   WHERE profile_id = NEW.identity_profile_id;

  SELECT data_origin INTO opening_origin
    FROM greenhouse_hiring.hiring_opening
   WHERE opening_id = NEW.opening_id;

  -- Una raíz ilegible degrada a `real`, NUNCA a sintético: fallar hacia lo visible.
  person_origin  := COALESCE(person_origin, 'real');
  opening_origin := COALESCE(opening_origin, 'real');

  IF person_origin = 'real' AND opening_origin = 'real' THEN
    NEW.data_origin := 'real';
  ELSIF person_origin = 'real' THEN
    NEW.data_origin := opening_origin;
  ELSIF opening_origin = 'real' THEN
    NEW.data_origin := person_origin;
  ELSIF person_origin = opening_origin THEN
    NEW.data_origin := person_origin;
  ELSE
    -- Ambas no-real y DISTINTAS: gana la MÁS PROTECTORA. La fila derivada nunca queda sujeta a una
    -- política de purga más agresiva que la de sus raíces (si una raíz es `demo` y debe sobrevivir,
    -- la derivada también). Precedencia idéntica a SURVIVAL_PRECEDENCE del contrato TS.
    NEW.data_origin := CASE
      WHEN 'demo' IN (person_origin, opening_origin) THEN 'demo'
      WHEN 'synthetic_seed' IN (person_origin, opening_origin) THEN 'synthetic_seed'
      ELSE 'smoke_test'
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hiring_application_derive_data_origin
  ON greenhouse_hiring.hiring_application;
CREATE TRIGGER trg_hiring_application_derive_data_origin
  BEFORE INSERT OR UPDATE ON greenhouse_hiring.hiring_application
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.derive_hiring_application_data_origin();

-- Guarda anti pre-up-marker: sin el trigger, `hiring_application.data_origin` se queda en su default
-- para siempre y el filtro del desk no observa nada — en silencio.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_hiring_application_derive_data_origin' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'TASK-1739 anti pre-up-marker: el trigger de derivación NO quedó instalado.';
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_hiring_application_derive_data_origin
  ON greenhouse_hiring.hiring_application;
DROP FUNCTION IF EXISTS greenhouse_hiring.derive_hiring_application_data_origin();
