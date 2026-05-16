-- Up Migration

-- Backfill canonical de greenhouse_core.members.notion_user_id para los 5
-- colaboradores activos que TASK-877 (2026-05-14) dejó sin bridge resuelto
-- después de migrar el resolver de BQ-direct a PG-first.
--
-- Source of truth: triangulación cruzada (Notion MCP workspace users +
-- BQ greenhouse.team_members + notion_ops.tareas usage). Verificado 2026-05-16.
--
-- Patrón canonical: cada UPDATE es idempotente vía WHERE conditional sobre el
-- valor previo. Solo aplica si el campo está NULL o tiene un ID históricamente
-- incorrecto (los IDs huérfanos pre-fix). NO sobrescribe valores manuales
-- correctos (e.g. los SCIM-provisioned para Felipe + María Camila).
--
-- Bug class fuente: bridge cutover sin backfill atómico. El resolver PG-first
-- aceptaba `if (map.size > 0) return PG` con 2-3 entries cuando el equipo
-- completo eran 7+ — y BQ fallback nunca engagaba.

-- Andrés Carlosama — INSERT (notion_user_id era NULL).
UPDATE greenhouse_core.members
SET notion_user_id = '2a4d872b-594c-8161-9250-000270ffdfea',
    updated_at = NOW()
WHERE member_id = 'andres-carlosama'
  AND notion_user_id IS NULL;

-- Daniela Ferreira — OVERWRITE (PG tenía '23ed872b-594c-81f1-a311-0002f9d69ce5',
-- un Notion user huérfano con solo 6 tareas; el real tiene 1612).
UPDATE greenhouse_core.members
SET notion_user_id = '161d872b-594c-813c-a3db-000239c8a466',
    updated_at = NOW()
WHERE member_id = 'daniela-ferreira'
  AND (notion_user_id IS NULL OR notion_user_id = '23ed872b-594c-81f1-a311-0002f9d69ce5');

-- Julio Reyes — INSERT (era NULL).
UPDATE greenhouse_core.members
SET notion_user_id = '98be6859-4b84-4dee-a8f2-5546d770c44b',
    updated_at = NOW()
WHERE member_id = 'julio-reyes'
  AND notion_user_id IS NULL;

-- Melkin Hernandez — OVERWRITE (PG tenía '24dd872b-594c-811b-9d01-0002b572c9da',
-- un Notion user huérfano con 177 tareas; el real tiene 425).
UPDATE greenhouse_core.members
SET notion_user_id = '23ed872b-594c-81f3-a8b8-00022610dfeb',
    updated_at = NOW()
WHERE member_id = 'melkin-hernandez'
  AND (notion_user_id IS NULL OR notion_user_id = '24dd872b-594c-811b-9d01-0002b572c9da');

-- Valentina Hoyos — INSERT (era NULL).
UPDATE greenhouse_core.members
SET notion_user_id = '1f1d872b-594c-811b-b8b5-0002542d0bd7',
    updated_at = NOW()
WHERE member_id = 'valentina-hoyos'
  AND notion_user_id IS NULL;

-- Anti pre-up-marker guard: verificar que los 5 valores quedaron persistidos.
-- Si algún UPDATE no aplicó (porque el WHERE conditional no matcheó), abortar.
DO $$
DECLARE
  resolved_count INT;
BEGIN
  SELECT COUNT(*) INTO resolved_count
  FROM greenhouse_core.members
  WHERE active = TRUE
    AND member_id IN ('andres-carlosama', 'daniela-ferreira', 'julio-reyes', 'melkin-hernandez', 'valentina-hoyos')
    AND notion_user_id IN (
      '2a4d872b-594c-8161-9250-000270ffdfea',
      '161d872b-594c-813c-a3db-000239c8a466',
      '98be6859-4b84-4dee-a8f2-5546d770c44b',
      '23ed872b-594c-81f3-a8b8-00022610dfeb',
      '1f1d872b-594c-811b-b8b5-0002542d0bd7'
    );

  IF resolved_count < 5 THEN
    RAISE EXCEPTION 'Bridge backfill verification failed: expected 5 members with canonical notion_user_id, found %. Check if members table missing rows or manual edits diverged.', resolved_count;
  END IF;
END $$;


-- Down Migration

-- Reversa idempotente: restaurar el estado previo SOLO si el valor actual
-- coincide con el seed canónico (no pisar ediciones manuales posteriores).

-- Andrés — back to NULL.
UPDATE greenhouse_core.members
SET notion_user_id = NULL, updated_at = NOW()
WHERE member_id = 'andres-carlosama'
  AND notion_user_id = '2a4d872b-594c-8161-9250-000270ffdfea';

-- Daniela — back to old wrong value (preserva traza histórica).
UPDATE greenhouse_core.members
SET notion_user_id = '23ed872b-594c-81f1-a311-0002f9d69ce5', updated_at = NOW()
WHERE member_id = 'daniela-ferreira'
  AND notion_user_id = '161d872b-594c-813c-a3db-000239c8a466';

-- Julio — back to NULL.
UPDATE greenhouse_core.members
SET notion_user_id = NULL, updated_at = NOW()
WHERE member_id = 'julio-reyes'
  AND notion_user_id = '98be6859-4b84-4dee-a8f2-5546d770c44b';

-- Melkin — back to old wrong value.
UPDATE greenhouse_core.members
SET notion_user_id = '24dd872b-594c-811b-9d01-0002b572c9da', updated_at = NOW()
WHERE member_id = 'melkin-hernandez'
  AND notion_user_id = '23ed872b-594c-81f3-a8b8-00022610dfeb';

-- Valentina — back to NULL.
UPDATE greenhouse_core.members
SET notion_user_id = NULL, updated_at = NOW()
WHERE member_id = 'valentina-hoyos'
  AND notion_user_id = '1f1d872b-594c-811b-b8b5-0002542d0bd7';
