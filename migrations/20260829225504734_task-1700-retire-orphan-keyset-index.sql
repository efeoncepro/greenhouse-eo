-- Up Migration

-- TASK-1700 — retiro del índice de keyset reconstruido, huérfano desde el fix del orden
-- servido (release e1718a359575, manifest released 2026-08-29 22:49Z).
--
-- El reader dejó de reconstruir el orden en SQL (`ORDER BY score_band, priority_score,
-- normalized_keyword COLLATE "C"`) y pasa a servir `rank_in_snapshot` persistido, con su
-- propio UNIQUE index (`seo_work_queue_items_rank_unique_idx`, migración 20260829213303021).
-- Este índice quedó sin ningún consumer: mantenerlo sería afirmar un orden que nadie usa.
--
-- Secuenciado DESPUÉS del release a propósito (regla contract-después-del-release): hasta la
-- promoción, el reader desplegado en producción todavía ejecutaba el ORDER BY viejo y usaba
-- este índice. Verificado antes de retirar: canary de contrato verde en producción (el lane
-- sirve rank monotónico 1..N y emite provenance — sólo el código nuevo lo produce).
DROP INDEX IF EXISTS greenhouse_growth.seo_work_queue_items_keyset_idx;

-- Anti pre-up-marker guard: aborta si el índice sigue existiendo (marker roto o DROP fallido)
-- o si el índice del keyset nuevo NO existe (retirar el viejo sin el nuevo dejaría el reader
-- sin camino indexado).
DO $$
DECLARE old_exists boolean;
DECLARE new_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'greenhouse_growth' AND tablename = 'seo_work_queue_items'
       AND indexname = 'seo_work_queue_items_keyset_idx'
  ) INTO old_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'greenhouse_growth' AND tablename = 'seo_work_queue_items'
       AND indexname = 'seo_work_queue_items_rank_unique_idx'
  ) INTO new_exists;

  IF old_exists THEN
    RAISE EXCEPTION 'TASK-1700 anti pre-up-marker: el índice keyset viejo sigue existiendo tras el DROP.';
  END IF;

  IF NOT new_exists THEN
    RAISE EXCEPTION 'TASK-1700: falta el UNIQUE index del rank — no se retira el viejo sin el nuevo.';
  END IF;
END
$$;

-- Down Migration

-- Restaura el índice del keyset reconstruido (sólo tiene sentido junto a un revert del
-- reader al ORDER BY de tres llaves).
CREATE INDEX IF NOT EXISTS seo_work_queue_items_keyset_idx
  ON greenhouse_growth.seo_work_queue_items
     (snapshot_id, score_band, priority_score DESC NULLS LAST, (normalized_keyword COLLATE "C"));
