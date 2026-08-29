-- Up Migration

-- TASK-1700 — el desempate de la cola pasa a orden de BYTES (`COLLATE "C"`).
--
-- 🔴 Defecto encontrado ejercitando la paginación contra PG real, no en los tests: la
-- paginación por keyset recorría 631 de 635 filas —**salteaba 4 en silencio**— y el orden
-- servido divergía del persistido en `rank_in_snapshot` desde el índice 0.
--
-- Causa: el materializador ordena en JS y el reader pagina en SQL, y **los dos no ordenan
-- igual**. La base corre con collation `en_US.UTF8`, que al comparar **ignora el espacio**:
-- para PG `berelex` < `berel green` (compara `berelgreen`, y `e` < `g`), mientras
-- `String.prototype.localeCompare` los ordena al revés. Con 75 items empatados en
-- `priority_score = 0.0000`, el desempate por keyword carga todo el peso del orden, así que
-- la discrepancia no era teórica.
--
-- Por qué bytes y no "arreglar el lado JS": `en_US.UTF8` viene de glibc y `localeCompare` de
-- ICU — no son la misma tabla y no hay forma de garantizar que coincidan en todos los casos.
-- `COLLATE "C"` es orden de bytes puro: JS puede reproducirlo EXACTAMENTE con una comparación
-- de code points (`a < b`), y esa igualdad es demostrable en vez de aproximada.
--
-- Es un DESEMPATE, no el orden principal: la banda y el score mandan primero, y
-- `normalized_keyword` ya viene NFKC + minúsculas de `normalizeMarketKeyword`, así que el
-- caso feo de `COLLATE "C"` (mayúsculas antes que minúsculas) no aplica acá.

-- Índice nuevo con la collation explícita. El anterior queda: sirve a lecturas que no
-- paginan, y borrarlo en la misma migración que agrega el reemplazo deja una ventana sin
-- índice para las consultas en vuelo.
CREATE INDEX IF NOT EXISTS seo_work_queue_items_keyset_idx
  ON greenhouse_growth.seo_work_queue_items
     (snapshot_id, score_band, priority_score DESC NULLS LAST, (normalized_keyword COLLATE "C"));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'greenhouse_growth'
       AND tablename = 'seo_work_queue_items'
       AND indexname = 'seo_work_queue_items_keyset_idx'
  ) THEN
    RAISE EXCEPTION 'TASK-1700 anti pre-up-marker: falta el índice de keyset con COLLATE "C".';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.seo_work_queue_items_keyset_idx;
