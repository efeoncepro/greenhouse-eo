-- Up Migration

-- TASK-1659 — Intención declarada de una membresía del set monitoreado.
--
-- Para el sistema, "estoy en la 12 y quiero la 5" y "el cliente quiere rankear acá y estoy
-- en la 60" son hoy la MISMA fila. Sin esa distinción no existe narrativa de avance contra
-- objetivo, y una keyword aspiracional se lee como un fracaso permanente en cualquier KPI
-- que asuma que todo lo medido debería estar mejorando.
--
-- `source` (TASK-1308) NO sirve para esto: es PROCEDENCIA — quién ejecutó el write
-- (`operator_ui` | `nexa` | `mcp` | `seed` | `backfill`). La intención es POR QUÉ la keyword
-- está en el set. Son ejes ortogonales y por eso son columnas distintas: meter la intención
-- dentro de `source` obligaría a un producto cartesiano de valores
-- (`operator_ui_target`, `mcp_opportunity`, …) que ningún filtro podría leer.
--
-- ═══ Por qué NULL y no un backfill a 'opportunity' ═══
--
-- Backfillear parece inocuo y no lo es: afirma que alguien clasificó esas filas cuando nadie
-- lo hizo. NULL dice la verdad —"no se declaró"— y obliga a los readers a tratar el caso
-- explícito en vez de contarlo como oportunidad e inflar el KPI. Mismo criterio que la
-- migración de procedencia de TASK-1308.
--
-- ═══ Por qué la autoría va aparte de `created_by` ═══
--
-- `created_by` es quién ejecutó el INSERT; `intent_declared_by` es quién asumió el
-- compromiso. Difieren cuando un agente (Nexa, MCP) mete la keyword por encargo de una
-- persona. Un objetivo es un compromiso con el cliente, y un compromiso tiene autor
-- verificable — que es lo que se pregunta cuando alguien revisa por qué se prometió una
-- posición.
--
-- ⚠️ La tabla es APPEND-ONLY (trigger anti-DELETE de TASK-1299). Cambiar la intención de una
-- keyword NO es un UPDATE de esta columna: es cerrar la membresía vigente (`effective_to`) y
-- abrir otra. El valor de reporte no es "esta keyword es un objetivo" sino "es objetivo desde
-- marzo, y en marzo estaba en la 45" — un UPDATE destruye exactamente ese dato. El command
-- `trackKeywords` es el único que escribe estas columnas.

ALTER TABLE greenhouse_growth.seo_keyword_set_members
  ADD COLUMN IF NOT EXISTS intent             TEXT,
  ADD COLUMN IF NOT EXISTS intent_declared_by TEXT,
  ADD COLUMN IF NOT EXISTS intent_declared_at TIMESTAMPTZ;

-- Vocabulario ENUMERADO, no texto libre — misma decisión que `source`: si el motor sólo
-- entiende dos valores, que el schema los enumere. Una intención nueva debe romper el INSERT,
-- no colarse y quedar invisible en cualquier lectura que agrupe por intención.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_keyword_set_members_intent_check'
  ) THEN
    ALTER TABLE greenhouse_growth.seo_keyword_set_members
      ADD CONSTRAINT seo_keyword_set_members_intent_check
      CHECK (intent IS NULL OR intent IN ('target', 'opportunity'));
  END IF;
END
$$;

-- La autoría acompaña a la declaración o no existe: una fila con `intent_declared_by` pero
-- sin `intent` sería un autor sin compromiso, y un `intent` sin autor sería un compromiso sin
-- responsable — que es justo lo que esta task existe para evitar. El CHECK lo impide en el
-- schema en vez de confiar en que todos los callers lo recuerden.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_keyword_set_members_intent_authorship_check'
  ) THEN
    ALTER TABLE greenhouse_growth.seo_keyword_set_members
      ADD CONSTRAINT seo_keyword_set_members_intent_authorship_check
      CHECK (
        (intent IS NULL     AND intent_declared_by IS NULL AND intent_declared_at IS NULL)
        OR
        (intent IS NOT NULL AND intent_declared_by IS NOT NULL AND intent_declared_at IS NOT NULL)
      );
  END IF;
END
$$;

COMMENT ON COLUMN greenhouse_growth.seo_keyword_set_members.intent IS
  'TASK-1659 — por qué la keyword está en el set: target (compromiso declarado con el cliente) | opportunity (demanda detectada que se está empujando). NULL = nadie la declaró; NO significa oportunidad. Ortogonal a `source` (procedencia del write).';
COMMENT ON COLUMN greenhouse_growth.seo_keyword_set_members.intent_declared_by IS
  'TASK-1659 — actor que declaró la intención. Distinto de `created_by` (quién ejecutó el INSERT): difieren cuando un agente mete la keyword por encargo de una persona.';
COMMENT ON COLUMN greenhouse_growth.seo_keyword_set_members.intent_declared_at IS
  'TASK-1659 — cuándo se declaró la intención de ESTA membresía. Como el cambio de intención cierra y reabre la ventana, el histórico de la keyword reconstruye desde cuándo es objetivo.';

-- Guard anti pre-up-marker: si los markers quedaran invertidos, la migración se registraría
-- como aplicada sin ejecutar nada y `trackKeywords` escribiría contra columnas inexistentes
-- (bug class ISSUE-068). El SQL embebido no lo cubre ningún type check, así que el schema
-- tiene que fallar ruidoso acá y no en runtime.
DO $$
DECLARE missing_columns int;
BEGIN
  SELECT COUNT(*) INTO missing_columns
    FROM (VALUES ('intent'), ('intent_declared_by'), ('intent_declared_at')) AS expected(column_name)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'greenhouse_growth'
        AND table_name = 'seo_keyword_set_members'
        AND columns.column_name = expected.column_name
   );

  IF missing_columns > 0 THEN
    RAISE EXCEPTION 'TASK-1659 anti pre-up-marker check: faltan % columnas de intención en greenhouse_growth.seo_keyword_set_members. Los markers de la migración pueden estar invertidos.', missing_columns;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_keyword_set_members_intent_check'
  ) THEN
    RAISE EXCEPTION 'TASK-1659 anti pre-up-marker check: falta el CHECK del vocabulario de `intent`.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_keyword_set_members_intent_authorship_check'
  ) THEN
    RAISE EXCEPTION 'TASK-1659 anti pre-up-marker check: falta el CHECK de autoría de la intención.';
  END IF;

  -- El índice único parcial es la garantía de "una sola membresía vigente por keyword". El
  -- cambio de intención cierra y reabre dentro de la misma transacción, así que si este
  -- índice desapareciera, esa operación crearía membresías duplicadas en silencio.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'greenhouse_growth'
       AND indexname = 'seo_keyword_set_members_active_unique'
  ) THEN
    RAISE EXCEPTION 'TASK-1659 anti pre-up-marker check: falta el índice único parcial de membresía vigente.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_growth.seo_keyword_set_members
  DROP CONSTRAINT IF EXISTS seo_keyword_set_members_intent_authorship_check;

ALTER TABLE greenhouse_growth.seo_keyword_set_members
  DROP CONSTRAINT IF EXISTS seo_keyword_set_members_intent_check;

ALTER TABLE greenhouse_growth.seo_keyword_set_members
  DROP COLUMN IF EXISTS intent_declared_at,
  DROP COLUMN IF EXISTS intent_declared_by,
  DROP COLUMN IF EXISTS intent;
