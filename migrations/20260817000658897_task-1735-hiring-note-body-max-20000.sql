-- Up Migration

-- TASK-1735 — El expediente ya no trunca en silencio el análisis confirmado.
--
-- El CHECK original (1..8000) era una elección conservadora sin fundamento para este
-- contenido: la nota del expediente es narrativa de evaluación con evidencia citada
-- (coherencias CV↔assessment, gaps, focos de entrevista, no-verificable), y un análisis
-- real de una candidata desbordó el límite — el render se truncaba y persistía cortado.
-- Se amplía a 20000 (widening puro: toda fila existente sigue siendo válida) y el write
-- path deja de truncar: si aún así se excede, falla loud (400) en vez de cortar callado.

ALTER TABLE greenhouse_hiring.hiring_application_note
  DROP CONSTRAINT IF EXISTS hiring_application_note_body_md_check;

ALTER TABLE greenhouse_hiring.hiring_application_note
  ADD CONSTRAINT hiring_application_note_body_md_check
  CHECK (length(body_md) BETWEEN 1 AND 20000);

-- Anti pre-up-marker guard (TASK-1735): aborta si el CHECK no quedó ampliado de verdad.
DO $$
DECLARE check_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'greenhouse_hiring.hiring_application_note'::regclass
      AND conname = 'hiring_application_note_body_md_check'
      AND pg_get_constraintdef(oid) LIKE '%20000%'
  ) INTO check_ok;

  IF NOT check_ok THEN
    RAISE EXCEPTION 'TASK-1735 anti pre-up-marker check failed: hiring_application_note_body_md_check no quedó ampliado a 20000';
  END IF;
END
$$;

-- Down Migration

-- Reversión NO segura si ya existen notas > 8000 (el ADD CONSTRAINT las rechazaría).
-- Se revierte solo el techo; las filas largas deben archivarse antes a mano.
ALTER TABLE greenhouse_hiring.hiring_application_note
  DROP CONSTRAINT IF EXISTS hiring_application_note_body_md_check;

ALTER TABLE greenhouse_hiring.hiring_application_note
  ADD CONSTRAINT hiring_application_note_body_md_check
  CHECK (length(body_md) BETWEEN 1 AND 8000);
