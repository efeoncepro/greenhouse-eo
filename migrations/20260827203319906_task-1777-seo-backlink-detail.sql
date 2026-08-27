-- Up Migration

-- TASK-1777 — Detalle nominal del perfil de enlaces (quién enlazó, quién se cayó, con qué
-- anchor), colgando del snapshot semanal de TASK-1304.
--
-- Tres tablas hijas de `seo_backlink_snapshots` — NUNCA del target: el detalle es la
-- ampliación de UNA medición concreta; anclarlo al target lo dejaría huérfano de su
-- `capture_date` y con el riesgo clásico de mezclar dos semanas en la misma lectura.
--
--   1. `seo_backlink_drilldowns` — el VEREDICTO de la condición de disparo, una fila por
--      snapshot evaluado. No estaba en la spec original y es una decisión de ejecución
--      registrada: sin persistir el veredicto no se puede (a) distinguir "no hubo movimiento"
--      de "se intentó y falló" (los tres estados del reader son contrato), ni (b) anclar el
--      "a lo sumo una vez por snapshot" de la idempotencia. Registra también el outcome
--      `skipped_*`, que es información ("el perfil estuvo estable"), no un hueco.
--   2. `seo_backlink_referring_domains` — quiénes te enlazan (y quién entró/se cayó), con
--      rank 0-100 y spam score del perfil de ese dominio.
--   3. `seo_backlink_anchors` — con qué texto te enlazan: la lectura de sobre-optimización
--      que el proxy `toxic_share` del padre NO da (y que no lo reemplaza: miden cosas
--      distintas — "de qué barrio vienen" vs "parece natural cómo me enlazan").
--
-- ⚠️ `rank` SIEMPRE en escala 0–100 (`rank_scale: one_hundred`), coherente con el padre.
-- ⚠️ `spam_score`/`backlink_spam_score` de estas filas son métricas POR DOMINIO/ANCHOR/ENLACE,
--    distintas del `backlinks_spam_score` agregado del perfil que alimenta `toxic_share`.
--    `toxic_share` del padre NO se recalcula ni se sobrescribe.
-- ⚠️ Append-only con el trigger genérico de TASK-1299, igual que el padre.

-- ── 1. El veredicto del drill-down ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_backlink_drilldowns (
  backlink_drilldown_id  TEXT PRIMARY KEY DEFAULT ('seobdd-' || gen_random_uuid()::text),
  backlink_snapshot_id   TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_backlink_snapshots (backlink_snapshot_id) ON DELETE RESTRICT,

  -- Vocabulario cerrado: un quinto outcome debe romper el INSERT, no colarse invisible.
  outcome                TEXT NOT NULL
    CHECK (outcome IN ('drilled', 'skipped_no_movement', 'skipped_partial', 'failed')),

  -- Por qué disparó (o no): el motivo del predicado, para auditar la política de gasto.
  trigger_reason         TEXT NOT NULL
    CHECK (trigger_reason IN (
      'first_time', 'backlink_movement', 'referring_domain_movement',
      'no_movement', 'partial_snapshot'
    )),

  referring_domain_rows  INTEGER NOT NULL DEFAULT 0 CHECK (referring_domain_rows >= 0),
  anchor_rows            INTEGER NOT NULL DEFAULT 0 CHECK (anchor_rows >= 0),
  provider_cost          NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (provider_cost >= 0),
  error_code             TEXT,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- "A lo sumo una vez por snapshot": el veredicto es único, sea cual sea el outcome.
  CONSTRAINT seo_backlink_drilldowns_snapshot_unique UNIQUE (backlink_snapshot_id)
);

-- ── 2. Dominios referentes (presentes + movimiento nominal) ───────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_backlink_referring_domains (
  backlink_ref_domain_id      TEXT PRIMARY KEY DEFAULT ('seobrd-' || gen_random_uuid()::text),
  backlink_snapshot_id        TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_backlink_snapshots (backlink_snapshot_id) ON DELETE RESTRICT,

  normalized_referring_domain TEXT NOT NULL CHECK (length(normalized_referring_domain) BETWEEN 1 AND 255),
  referring_domain            TEXT NOT NULL CHECK (length(referring_domain) BETWEEN 1 AND 255),

  -- Vocabulario cerrado del movimiento (spec): present = está hoy · new = entró en la
  -- ventana · lost = se cayó en la ventana.
  movement                    TEXT NOT NULL CHECK (movement IN ('present', 'new', 'lost')),

  -- Rank 0-100 del dominio referente (escala one_hundred, jamás mezclar con 0-1000).
  rank                        NUMERIC(6, 2) CHECK (rank IS NULL OR (rank >= 0 AND rank <= 100)),
  backlinks_to_target         BIGINT CHECK (backlinks_to_target IS NULL OR backlinks_to_target >= 0),
  -- Spam score promedio de los enlaces de ESE dominio hacia el target (0-100), distinto del
  -- backlinks_spam_score agregado del perfil (que vive en el padre como toxic_share×100).
  backlink_spam_score         NUMERIC(5, 2)
    CHECK (backlink_spam_score IS NULL OR (backlink_spam_score >= 0 AND backlink_spam_score <= 100)),
  first_seen                  TIMESTAMPTZ,
  lost_date                   TIMESTAMPTZ,

  -- Contexto accionable del movimiento (una muestra por dominio, del endpoint backlinks/live
  -- en modo one_per_domain): con esto se escribe el correo de recuperación de enlace.
  sample_url_from             TEXT,
  sample_url_to               TEXT,
  sample_anchor               TEXT,
  sample_dofollow             BOOLEAN,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT seo_backlink_ref_domains_unique
    UNIQUE (backlink_snapshot_id, normalized_referring_domain)
);

-- ── 3. Perfil de anchors ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_backlink_anchors (
  backlink_anchor_id     TEXT PRIMARY KEY DEFAULT ('seoban-' || gen_random_uuid()::text),
  backlink_snapshot_id   TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_backlink_snapshots (backlink_snapshot_id) ON DELETE RESTRICT,

  -- Hash del anchor como clave (sha256 hex): evita una UNIQUE sobre texto libre de longitud
  -- arbitraria. El texto crudo vive en su columna.
  anchor_text_hash       TEXT NOT NULL CHECK (length(anchor_text_hash) = 64),
  anchor                 TEXT NOT NULL,

  backlinks              BIGINT CHECK (backlinks IS NULL OR backlinks >= 0),
  referring_domains      INTEGER CHECK (referring_domains IS NULL OR referring_domains >= 0),
  rank                   NUMERIC(6, 2) CHECK (rank IS NULL OR (rank >= 0 AND rank <= 100)),
  backlink_spam_score    NUMERIC(5, 2)
    CHECK (backlink_spam_score IS NULL OR (backlink_spam_score >= 0 AND backlink_spam_score <= 100)),
  first_seen             TIMESTAMPTZ,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT seo_backlink_anchors_unique
    UNIQUE (backlink_snapshot_id, anchor_text_hash)
);

-- Índices de lectura (el reader carga por snapshot; el movimiento se filtra encima).
CREATE INDEX IF NOT EXISTS seo_backlink_ref_domains_snapshot_idx
  ON greenhouse_growth.seo_backlink_referring_domains (backlink_snapshot_id, movement);
CREATE INDEX IF NOT EXISTS seo_backlink_anchors_snapshot_idx
  ON greenhouse_growth.seo_backlink_anchors (backlink_snapshot_id);

-- Append-only: el mismo trigger genérico de la serie (TASK-1299).
DROP TRIGGER IF EXISTS trg_seo_backlink_drilldowns_append_only
  ON greenhouse_growth.seo_backlink_drilldowns;
CREATE TRIGGER trg_seo_backlink_drilldowns_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_backlink_drilldowns
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

DROP TRIGGER IF EXISTS trg_seo_backlink_ref_domains_append_only
  ON greenhouse_growth.seo_backlink_referring_domains;
CREATE TRIGGER trg_seo_backlink_ref_domains_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_backlink_referring_domains
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

DROP TRIGGER IF EXISTS trg_seo_backlink_anchors_append_only
  ON greenhouse_growth.seo_backlink_anchors;
CREATE TRIGGER trg_seo_backlink_anchors_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_growth.seo_backlink_anchors
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_seo_row_mutation();

-- Anti pre-up-marker guard (CLAUDE.md §Database — Migration markers / ISSUE-068).
DO $$
DECLARE
  drilldowns_exists  boolean;
  domains_exists     boolean;
  anchors_exists     boolean;
  movement_check_def text;
  fk_count           integer;
  trigger_count      integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_backlink_drilldowns'
  ) INTO drilldowns_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_backlink_referring_domains'
  ) INTO domains_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_backlink_anchors'
  ) INTO anchors_exists;

  IF NOT (drilldowns_exists AND domains_exists AND anchors_exists) THEN
    RAISE EXCEPTION 'TASK-1777 anti pre-up-marker check: falta alguna de las 3 tablas (drilldowns=%, domains=%, anchors=%). Los markers pueden estar invertidos.',
      drilldowns_exists, domains_exists, anchors_exists;
  END IF;

  -- El CHECK de movement debe enumerar las TRES clases.
  SELECT pg_get_constraintdef(oid) INTO movement_check_def
  FROM pg_constraint
  WHERE conrelid = 'greenhouse_growth.seo_backlink_referring_domains'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%movement%';

  IF movement_check_def IS NULL
     OR movement_check_def NOT ILIKE '%present%'
     OR movement_check_def NOT ILIKE '%lost%' THEN
    RAISE EXCEPTION 'TASK-1777: el CHECK de movement no quedo con el vocabulario cerrado (def: %).', COALESCE(movement_check_def, 'NULL');
  END IF;

  -- Las tres FK al snapshot padre.
  SELECT COUNT(*) INTO fk_count
  FROM pg_constraint
  WHERE contype = 'f'
    AND confrelid = 'greenhouse_growth.seo_backlink_snapshots'::regclass
    AND conrelid IN (
      'greenhouse_growth.seo_backlink_drilldowns'::regclass,
      'greenhouse_growth.seo_backlink_referring_domains'::regclass,
      'greenhouse_growth.seo_backlink_anchors'::regclass
    );

  IF fk_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1777: se esperaban 3 FK al snapshot padre, hay %.', fk_count;
  END IF;

  -- Los tres triggers append-only.
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE NOT tgisinternal
    AND tgname IN (
      'trg_seo_backlink_drilldowns_append_only',
      'trg_seo_backlink_ref_domains_append_only',
      'trg_seo_backlink_anchors_append_only'
    );

  IF trigger_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1777: se esperaban 3 triggers append-only, hay %.', trigger_count;
  END IF;
END
$$;

-- GRANTs least-privilege (append-only: el runtime no necesita UPDATE/DELETE).
ALTER TABLE greenhouse_growth.seo_backlink_drilldowns OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_backlink_referring_domains OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.seo_backlink_anchors OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_growth.seo_backlink_drilldowns TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_backlink_referring_domains TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_backlink_anchors TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.seo_backlink_drilldowns TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_growth.seo_backlink_referring_domains TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_growth.seo_backlink_anchors TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_backlink_drilldowns TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_backlink_referring_domains TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.seo_backlink_anchors TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.seo_backlink_anchors;
DROP TABLE IF EXISTS greenhouse_growth.seo_backlink_referring_domains;
DROP TABLE IF EXISTS greenhouse_growth.seo_backlink_drilldowns;
