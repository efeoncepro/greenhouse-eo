-- Up Migration

-- TASK-1765 Slice 4 — CONTRACT del eje de desenlace: `on_hold` sale.
--
-- Una pausa NO es un cierre. `on_hold` vivía en el enum de DESENLACES *y* mapeaba a la etapa
-- `decision_pending`: la misma fila decía «terminó» y «sigue viva» a la vez, y de ahí salía el doble
-- sentido de la columna «Decisión» del tablero. Una pausa se registra moviendo la ETAPA a
-- `decision_pending`, que el PATCH sí acepta (ADR §6).
--
-- Precondición verificada por readback contra PG el 2026-08-22, inmediatamente antes de aplicar:
--   SELECT count(*) FROM greenhouse_hiring.hiring_application WHERE decision = 'on_hold';        -- 0
--   SELECT count(*) FROM greenhouse_hiring.hiring_application
--    WHERE explainability_json::text LIKE '%on_hold%';                                           -- 0
--
-- Si alguna de las dos diera distinto de 0, este contract NO se ejecuta: el desenlace real de esa
-- persona se decide con People Ops. NUNCA reescribir a ciegas — sería fabricar un acto humano.
-- El bloque DO de abajo lo verifica de nuevo y aborta, para que la precondición no dependa de que
-- quien ejecute la migración se haya acordado de correr el readback.
--
-- Retirar este literal es seguro para las lecturas históricas: `normalizeHiringApplication` lee
-- `decision` con CAST, no con `assertEnum` (store.ts), así que una fila histórica no produce 500 al
-- releerse. Esa protección NO existe para `trigger_stage` en las policies de assessment (H-05 de la
-- auditoría), que es otro eje y NO se toca acá.

DO $$
DECLARE
  stranded_rows int;
  stranded_history int;
BEGIN
  SELECT COUNT(*) INTO stranded_rows
    FROM greenhouse_hiring.hiring_application
   WHERE decision = 'on_hold';

  IF stranded_rows > 0 THEN
    RAISE EXCEPTION 'TASK-1765 contract abortado: % fila(s) con decision=on_hold. Su desenlace real se decide con People Ops ANTES de retirar el literal; no se reescriben a ciegas.', stranded_rows;
  END IF;

  SELECT COUNT(*) INTO stranded_history
    FROM greenhouse_hiring.hiring_application
   WHERE explainability_json::text LIKE '%on_hold%';

  IF stranded_history > 0 THEN
    RAISE EXCEPTION 'TASK-1765 contract abortado: % fila(s) con on_hold en decisionHistory. El historial es append-only y NUNCA se reescribe: revisar antes de continuar.', stranded_history;
  END IF;
END
$$;

ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_decision_check;

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_decision_check CHECK (decision IN (
    'selected', 'backup_selected', 'not_selected', 'rejected', 'withdrawn', 'unresponsive'));

COMMENT ON COLUMN greenhouse_hiring.hiring_application.decision IS
  'TASK-1765 — DESENLACE del recorrido, no «lo que Efeonce decidió»: `withdrawn` y `unresponsive` no '
  'son decisiones de Efeonce. Seis valores. El rename físico a `outcome` queda deferido (ADR §11).';

-- Guard anti pre-up-marker: el CHECK tiene que existir Y haber perdido `on_hold`.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'greenhouse_hiring.hiring_application'::regclass
       AND conname = 'hiring_application_decision_check'
  ) THEN
    RAISE EXCEPTION 'TASK-1765 anti pre-up-marker check: hiring_application_decision_check no quedó creado.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'greenhouse_hiring.hiring_application'::regclass
       AND conname = 'hiring_application_decision_check'
       AND pg_get_constraintdef(oid) LIKE '%on_hold%'
  ) THEN
    RAISE EXCEPTION 'TASK-1765 anti pre-up-marker check: el CHECK de decision todavía admite on_hold.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_decision_check;

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_decision_check CHECK (decision IN (
    'selected', 'backup_selected', 'not_selected', 'rejected',
    'withdrawn', 'unresponsive', 'on_hold'));
