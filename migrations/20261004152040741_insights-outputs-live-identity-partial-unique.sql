-- Up Migration

-- Efeonce Insights render — un output terminal (`dead_letter` / `cancelled`) deja de bloquear un
-- encargo nuevo del mismo target.
--
-- Incidente 2026-10-04 (canary interno de Berel, edición insed-658861b2…): `report_pdf` quedó en
-- `dead_letter` (`semantic_rejected`); tras el fix del mapper, re-encargar `report_pdf` respondió
-- 500 `internal_error`. El command (`requestInsightRender`) ya trataba dead_letter/cancelled como
-- "no vivos" y permitía re-encargar, pero `insight_outputs_identity_uq` era una UNIQUE total sobre
-- (org, edición, output, audiencia): el INSERT del output nuevo chocaba contra la fila muerta.
--
-- Contrato (decidido 2026-10-04): la identidad se garantiza sobre los outputs VIVOS. Como
-- `dead_letter` y `cancelled` son terminales en la state machine (`INSIGHT_OUTPUT_TRANSITIONS`: sin
-- salida), una fila nunca vuelve a entrar al conjunto vivo, así que el índice parcial sigue
-- garantizando "a lo más UN output vivo — y por lo tanto a lo más uno `completed` — por identidad".
-- La fila terminal se conserva como historial (append-only); el encargo nuevo recompone su manifest
-- con el código vigente sobre el MISMO plan congelado.
--
-- Expand-safe en ambos sentidos: es una relajación. El código anterior ya pretendía este contrato y
-- funciona igual con el índice parcial; un rollback de código no necesita revertir la migración.

CREATE UNIQUE INDEX IF NOT EXISTS insight_outputs_live_identity_uq
  ON greenhouse_insights.insight_outputs (organization_id, edition_id, output, audience)
  WHERE state NOT IN ('dead_letter', 'cancelled');

DROP INDEX IF EXISTS greenhouse_insights.insight_outputs_identity_uq;

-- Anti pre-up-marker: si el Up no corrió de verdad, aborta en vez de registrarse en silencio
-- (bug class de TASK-768 / ISSUE-068). Verifica además que el índice nuevo sea PARCIAL y único.
DO $$
DECLARE
  live_def text;
BEGIN
  SELECT indexdef INTO live_def
    FROM pg_indexes
   WHERE schemaname = 'greenhouse_insights' AND indexname = 'insight_outputs_live_identity_uq';

  IF live_def IS NULL THEN
    RAISE EXCEPTION 'insights live identity anti pre-up-marker check: insight_outputs_live_identity_uq was NOT created';
  END IF;

  IF live_def NOT ILIKE 'CREATE UNIQUE INDEX%' OR live_def NOT ILIKE '%WHERE%dead_letter%cancelled%' THEN
    RAISE EXCEPTION 'insights live identity check: insight_outputs_live_identity_uq is not a partial unique index (%)', live_def;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname = 'greenhouse_insights' AND indexname = 'insight_outputs_identity_uq') THEN
    RAISE EXCEPTION 'insights live identity check: insight_outputs_identity_uq still exists';
  END IF;
END
$$;

-- Down Migration

-- SOLO undo. Recrear la UNIQUE total FALLA si ya existe una identidad con una fila terminal y otra
-- viva (el caso que esta migración habilita): eso es correcto — no hay down sin pérdida una vez que
-- se re-encargó un output muerto, y las filas son append-only (no se borran para "hacer caber" el
-- índice). greenhouse-pg-dev sirve producción (ISSUE-161): correr el down exige autorización
-- explícita del operador.
CREATE UNIQUE INDEX IF NOT EXISTS insight_outputs_identity_uq
  ON greenhouse_insights.insight_outputs (organization_id, edition_id, output, audience);

DROP INDEX IF EXISTS greenhouse_insights.insight_outputs_live_identity_uq;
