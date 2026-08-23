-- Up Migration

-- ╔══════════════════════════════════════════════════════════════════════════════════════════╗
-- ║  TASK-1748 Slice 2 — LAS 32 FILAS CAMBIAN DE EJE.                                        ║
-- ║  ⚠️  NO APLICAR hasta que el Slice 1 esté DESPLEGADO en producción (Vercel + ops-worker). ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════════╝
--
-- CONDICIÓN DE EJECUCIÓN, y no es formal — es la única cosa que impide una regresión visible:
--
--   El filtro de procedencia del Banco de Talento (`talent-pool/readers.ts` Y
--   `talent-pool/projection.ts`, commit del Slice 1) corre en producción, en LOS DOS runtimes:
--     · Vercel      → readers (`searchTalentPool`, `getTalentPoolProfile`)
--     · ops-worker  → projection (`reconcileTalentPoolProjection`)
--   Verificar contra `origin/main`, NUNCA contra el working tree.
--
-- POR QUÉ. Esta migración devuelve las 32 postulaciones sintéticas de `stage='closed'` a su etapa
-- previa. El predicado `stage NOT IN ('rejected','withdrawn','closed')` de la projection pasa
-- entonces a dar `has_active_application = true` para sus 11 fichas, y el `CASE` reclasifica esas
-- membresías de `needs_reconsent` a `active_process` — que SÍ está en el `baseSelect` servible del
-- Banco de Talento. El reconcile corre por Cloud Scheduler **cada 5 minutos**
-- (`ops-hiring-talent-pool-reconcile`), así que la ventana no es teórica: son ≤5 minutos hasta que
-- 11 personas inventadas aparezcan en el Banco de Talento de un operador real.
--
-- Con el Slice 1 desplegado no pasa nada: la projection deja de tocar membresías no-real y los
-- readers las excluyen por procedencia. Sin el Slice 1, esta migración CAUSA el defecto que la task
-- vino a cerrar. Ése es el orden, y por eso el archivo vive acá y no en `migrations/`.
--
-- ORDEN COMPLETO, cross-task:
--   TASK-1765 Slice 1 (crea `archived_at`)   ── ya aplicado
--     └─ TASK-1748 Slice 1 desplegado a prod ── condición de ESTA migración
--          └─ ESTA migración                 ── mueve las 32 filas
--               └─ TASK-1765 Slice 5 (CHECK) ── readback esperado 1 → 0
--
-- Readback del invariante: hoy 33; después de esta migración, **1** (la fila real decidida que vive
-- en su etapa espejo, que corrige el propio `UPDATE` de TASK-1765). Si después de correr esto ves
-- 33, esta migración no corrió. Cualquier otro número: STOP & ESCALATE.

DO $$
DECLARE
  pending_rows int;
  fallback_rows int;
  fallback_ids text;
BEGIN
  SELECT COUNT(*) INTO pending_rows
    FROM greenhouse_hiring.hiring_application
   WHERE data_origin <> 'real' AND stage = 'closed';

  IF pending_rows = 0 THEN
    RAISE EXCEPTION 'TASK-1748 abortado: cero postulaciones no-real en stage=closed. O ya corrió, o alguien las movió por otra vía. STOP & ESCALATE antes de reintentar.';
  END IF;

  -- Las filas sin `beforeStage` en el audit vuelven a `sourced`, y eso NO puede ser silencioso: es
  -- una etapa inventada por esta migración, no la que la fila tenía. Se enumeran siempre.
  SELECT COUNT(*), COALESCE(string_agg(a.application_id, ', '), '—')
    INTO fallback_rows, fallback_ids
    FROM greenhouse_hiring.hiring_application a
   WHERE a.data_origin <> 'real' AND a.stage = 'closed'
     AND NOT EXISTS (
       SELECT 1 FROM greenhouse_hiring.hiring_data_origin_audit ad
        WHERE ad.record_type = 'hiring_application' AND ad.record_id = a.application_id
          AND ad.action = 'archive' AND ad.deleted_snapshot_json->>'beforeStage' IS NOT NULL);

  RAISE NOTICE 'TASK-1748: % fila(s) a migrar; % con fallback a sourced: %', pending_rows, fallback_rows, fallback_ids;
END
$$;

-- El archivado ocurrió el 2026-08-18/19, no hoy: `archived_at` toma la fecha real del audit que lo
-- registró, no `NOW()`. Fechar el archivado el día de la corrección reescribiría la historia.
WITH archive_audit AS (
  SELECT DISTINCT ON (record_id)
         record_id,
         created_at,
         deleted_snapshot_json->>'beforeStage' AS before_stage
    FROM greenhouse_hiring.hiring_data_origin_audit
   WHERE record_type = 'hiring_application' AND action = 'archive'
   ORDER BY record_id, created_at ASC
)
UPDATE greenhouse_hiring.hiring_application a
   SET archived_at = COALESCE(aa.created_at, NOW()),
       stage = COALESCE(NULLIF(aa.before_stage, ''), 'sourced')
  FROM archive_audit aa
 WHERE aa.record_id = a.application_id
   AND a.data_origin <> 'real'
   AND a.stage = 'closed';

-- Las que no tienen fila de audit (no debería haber ninguna: verificado 32/32 el 2026-08-22) también
-- salen de `closed`, con la etapa de fallback ya anunciada arriba.
UPDATE greenhouse_hiring.hiring_application
   SET archived_at = COALESCE(archived_at, NOW()),
       stage = 'sourced'
 WHERE data_origin <> 'real' AND stage = 'closed';

-- Readback DENTRO de la migración: si algo quedó fuera, aborta con el conteo exacto.
DO $$
DECLARE
  still_closed int;
  archived_count int;
BEGIN
  SELECT COUNT(*) INTO still_closed
    FROM greenhouse_hiring.hiring_application
   WHERE data_origin <> 'real' AND stage = 'closed';

  IF still_closed > 0 THEN
    RAISE EXCEPTION 'TASK-1748 abortado: quedan % postulación(es) no-real en stage=closed. Es la precondición del CHECK de TASK-1765: no relajarla.', still_closed;
  END IF;

  SELECT COUNT(*) INTO archived_count
    FROM greenhouse_hiring.hiring_application
   WHERE data_origin <> 'real' AND archived_at IS NOT NULL;

  IF archived_count = 0 THEN
    RAISE EXCEPTION 'TASK-1748 abortado: ninguna postulación no-real quedó con archived_at. El cambio de eje no se materializó.';
  END IF;

  RAISE NOTICE 'TASK-1748 OK: 0 no-real en closed; % con archived_at poblado.', archived_count;
END
$$;

-- Down Migration

-- Devuelve las filas al estado previo: `stage='closed'` y sin archivado. Sólo toca postulaciones
-- no-real que esta migración archivó (las que tienen fila de audit `archive`), nunca una real.
UPDATE greenhouse_hiring.hiring_application a
   SET stage = 'closed',
       archived_at = NULL
 WHERE a.data_origin <> 'real'
   AND a.archived_at IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM greenhouse_hiring.hiring_data_origin_audit ad
      WHERE ad.record_type = 'hiring_application' AND ad.record_id = a.application_id
        AND ad.action = 'archive');
