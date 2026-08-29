-- Up Migration

-- TASK-1700 — el keyset del reader pasa a `rank_in_snapshot`, y su unicidad deja de ser
-- "por construcción" para ser ESTRUCTURAL.
--
-- Contexto (fix 2026-08-29, orden servido ≠ orden persistido): el comparador del
-- materializador desempata la banda 2 por impresiones — un valor que NO es columna — así que
-- un ORDER BY reconstruido en SQL no podía reproducir el rank (medido en producción: 54 de 55
-- items de banda 2 servidos fuera de su rank). El reader ahora sirve y pagina por
-- `rank_in_snapshot ASC` con keyset `rank > cursor`.
--
-- Ese keyset ASUME que el rank es único por snapshot. Hoy lo es por construcción (un loop
-- secuencial dentro de una transacción), y verificado contra los 12 snapshots existentes
-- (ranks contiguos 1..N, cero duplicados). Pero un writer futuro con un bug de asignación
-- produciría ranks duplicados y el keyset SALTEARÍA la fila gemela en silencio — la clase
-- exacta de defecto que este agregado ya pagó dos veces. Defensa en profundidad: la unicidad
-- la impone la base, no la disciplina del writer. El índice además ES el camino de lectura
-- del keyset nuevo.
CREATE UNIQUE INDEX IF NOT EXISTS seo_work_queue_items_rank_unique_idx
  ON greenhouse_growth.seo_work_queue_items (snapshot_id, rank_in_snapshot);

-- Anti pre-up-marker guard: aborta si el índice no quedó creado de verdad.
DO $$
DECLARE idx_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM pg_indexes
     WHERE schemaname = 'greenhouse_growth'
       AND tablename = 'seo_work_queue_items'
       AND indexname = 'seo_work_queue_items_rank_unique_idx'
  ) INTO idx_exists;

  IF NOT idx_exists THEN
    RAISE EXCEPTION 'TASK-1700 anti pre-up-marker: falta el UNIQUE index del rank del keyset.';
  END IF;
END
$$;

-- ⚠️ El índice de keyset viejo (`seo_work_queue_items_keyset_idx`, con COLLATE "C") queda
-- huérfano del reader nuevo pero NO se dropea acá: el reader desplegado en producción sigue
-- usando el ORDER BY viejo hasta la próxima promoción. Su retiro es contract y va DESPUÉS
-- del release (regla del repo), declarado en el Delta del fix en TASK-1700.

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.seo_work_queue_items_rank_unique_idx;
