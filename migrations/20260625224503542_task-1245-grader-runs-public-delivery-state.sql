-- Up Migration

-- TASK-1245 Slice 2 — public_delivery_state: estado de entrega público MATERIALIZADO (EPIC-020).
-- El status público (TASK-1245 Slice 1) necesita distinguir, para un run terminal sin snapshot,
-- entre "en revisión humana" (review_required, TASK-1244) y "no disponible" (failed/insufficient_data)
-- SIN recomputar el gate del reporte en cada poll anónimo ni filtrar el motivo interno. El finalizador
-- del worker (write-side, NO on-read) materializa este estado al terminar el run. Patrón reactive-projection:
-- el write materializa el read-state O(1), leak-proof. ADDITIVE + idempotente. Default 'pending' (run no
-- finalizado). Los grants table-level de grader_runs ya cubren la columna.

ALTER TABLE greenhouse_growth.grader_runs
  ADD COLUMN IF NOT EXISTS public_delivery_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (public_delivery_state IN ('pending', 'ready', 'in_review', 'unavailable'));

-- Backfill idempotente de los casos DERIVABLES sin recomputar el gate:
--  - 'ready'       → ya existe un snapshot público publicable para el run.
--  - 'unavailable' → el run terminó failed/skipped y no tiene snapshot.
-- review_required/insufficient_data NO son derivables baratos → quedan 'pending' (el reader los muestra
-- como 'processing' hasta que el finalizador del worker corra; histórico dev acotado).
UPDATE greenhouse_growth.grader_runs r
   SET public_delivery_state = 'ready'
 WHERE r.public_delivery_state = 'pending'
   AND EXISTS (
     SELECT 1 FROM greenhouse_growth.grader_reports gr
      WHERE gr.run_id = r.run_id AND gr.audience = 'public'
   );

UPDATE greenhouse_growth.grader_runs r
   SET public_delivery_state = 'unavailable'
 WHERE r.public_delivery_state = 'pending'
   AND r.status IN ('failed', 'skipped')
   AND NOT EXISTS (
     SELECT 1 FROM greenhouse_growth.grader_reports gr
      WHERE gr.run_id = r.run_id AND gr.audience = 'public'
   );

-- Anti pre-up-marker: aborta si la columna no quedó creada realmente.
DO $$
DECLARE col_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_runs' AND column_name = 'public_delivery_state'
  ) INTO col_ok;

  IF NOT col_ok THEN
    RAISE EXCEPTION 'TASK-1245 Slice 2 anti pre-up-marker: grader_runs.public_delivery_state NO creada. Markers invertidos.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_growth.grader_runs DROP COLUMN IF EXISTS public_delivery_state;
