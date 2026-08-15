-- Up Migration

-- TASK-1661 (follow-up) — Perfil de enlaces del top-10: la señal que SÍ discrimina.
--
-- POR QUÉ. `keyword_difficulty` del proveedor es una métrica pura de backlinks con un PISO
-- DURO en 0: KD = (max(mediana, promedio) − 0.2)/0.8 × 100, clampeada. En SERPs es-LATAM el
-- top-10 son páginas de categoría/producto casi sin enlaces a nivel URL, así que el score cae
-- bajo el umbral 0.2 y una porción enorme de keywords colapsa a 0 exacto — `pintura` sale KD 0
-- con 135.000 búsquedas/mes en México (medido 2026-08-13). No es dato faltante: es un 0
-- afirmado que se lee como "trivial" y es falso.
--
-- La respuesta NO es inventar una fórmula: es persistir la evidencia cruda que el proveedor YA
-- entrega en `avg_backlinks_info` dentro de la MISMA respuesta que ya pagamos, y que hoy
-- descartamos. Con ella la barrera se deriva de hechos observables del top-10 en vez de un
-- índice que no discrimina.
--
-- 🔴 QUÉ SEÑAL MANDA, Y POR QUÉ NO ES EL CONTEO. El oficio (skill `seo-aeo` §05) es explícito:
-- lo que pesa es la **diversidad de dominios referentes**, no la cantidad de enlaces — "un
-- enlace editorial relevante > 100 enlaces de directorios". Los datos medidos lo confirman de
-- forma contraintuitiva:
--
--   berel              → 5.125 backlinks / 30,4 dominios / page_rank 89,9  (concentración)
--   pintura            →   232 backlinks / 52,6 dominios / page_rank 60,9  (diversidad real)
--   pintura para piso  →   0,1 backlinks /  0,1 dominios / page_rank  5,2  (sin barrera)
--
-- `berel` tiene 22× más backlinks que `pintura` pero MENOS dominios referentes. Una barrera por
-- conteo diría que `berel` es lo más difícil; una por diversidad dice lo contrario, y es la que
-- el oficio respalda. Por eso se persisten las cuatro señales y la derivación pondera dominios
-- referentes + page rank, NUNCA el conteo crudo.
--
-- Aditiva y reversible: columnas NULLABLE sobre una tabla append-only. Las capturas anteriores
-- quedan en NULL, que es honesto — significa "no lo capturamos entonces", no "no hay barrera".
ALTER TABLE greenhouse_growth.seo_keyword_market_data
  -- Promedio del top-10. Rank de la URL específica que rankea (0–1000 en la escala del
  -- proveedor). Es el 90% del peso de la KD oficial y lo que colapsa en LATAM.
  ADD COLUMN IF NOT EXISTS avg_page_rank            NUMERIC(8, 2)
    CHECK (avg_page_rank IS NULL OR avg_page_rank >= 0),
  -- Rank del DOMINIO de esas URLs. Alto con page_rank bajo = "dominios fuertes con páginas
  -- flojas", que es justo el hueco que un cliente con autoridad puede atacar.
  ADD COLUMN IF NOT EXISTS avg_main_domain_rank     NUMERIC(8, 2)
    CHECK (avg_main_domain_rank IS NULL OR avg_main_domain_rank >= 0),
  -- Conteo bruto de enlaces. Se guarda por completitud y auditoría, pero NO gobierna la
  -- barrera: es la señal que engaña (ver el caso `berel` arriba).
  ADD COLUMN IF NOT EXISTS avg_backlinks            NUMERIC(12, 2)
    CHECK (avg_backlinks IS NULL OR avg_backlinks >= 0),
  -- 🔴 La señal que MANDA: cuántos dominios distintos enlazan al top-10 en promedio.
  ADD COLUMN IF NOT EXISTS avg_referring_domains    NUMERIC(10, 2)
    CHECK (avg_referring_domains IS NULL OR avg_referring_domains >= 0);

COMMENT ON COLUMN greenhouse_growth.seo_keyword_market_data.avg_referring_domains IS
  'Dominios referentes promedio del top-10. Señal PRINCIPAL de la barrera de enlaces: la diversidad pesa más que el conteo (seo-aeo 05). NULL = no capturado, nunca "sin barrera".';
COMMENT ON COLUMN greenhouse_growth.seo_keyword_market_data.avg_backlinks IS
  'Conteo bruto de enlaces del top-10. Auditoría y completitud — NO gobierna la barrera: alto conteo con pocos dominios es concentración, no dificultad.';

-- Anti pre-up-marker guard (CLAUDE.md §Database — Migration markers / ISSUE-068).
DO $$
DECLARE
  col_count       INTEGER;
  nullable_count  INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_keyword_market_data'
    AND column_name IN ('avg_page_rank', 'avg_main_domain_rank', 'avg_backlinks', 'avg_referring_domains');

  IF col_count <> 4 THEN
    RAISE EXCEPTION 'TASK-1661 follow-up anti pre-up-marker check: se esperaban 4 columnas de avg_backlinks_info, existen %. Los markers pueden estar invertidos.', col_count;
  END IF;

  -- Las 4 DEBEN ser NULLABLE: una captura vieja sin perfil de enlaces es un hecho legítimo
  -- ("no lo capturamos"), y forzar NOT NULL obligaría a inventar un 0 que se leería como
  -- "sin barrera" — exactamente el bug que esta migración viene a cerrar.
  SELECT COUNT(*) INTO nullable_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'seo_keyword_market_data'
    AND column_name IN ('avg_page_rank', 'avg_main_domain_rank', 'avg_backlinks', 'avg_referring_domains')
    AND is_nullable = 'YES';

  IF nullable_count <> 4 THEN
    RAISE EXCEPTION 'TASK-1661 follow-up: las 4 columnas de perfil de enlaces deben ser NULLABLE (NULL = no capturado, jamas "sin barrera"); nullable=%.', nullable_count;
  END IF;
END
$$;

-- Sin GRANTs nuevos: las columnas heredan los de la tabla (runtime SELECT+INSERT, sin UPDATE
-- ni DELETE — sigue siendo append-only).

-- Down Migration

ALTER TABLE greenhouse_growth.seo_keyword_market_data
  DROP COLUMN IF EXISTS avg_page_rank,
  DROP COLUMN IF EXISTS avg_main_domain_rank,
  DROP COLUMN IF EXISTS avg_backlinks,
  DROP COLUMN IF EXISTS avg_referring_domains;
