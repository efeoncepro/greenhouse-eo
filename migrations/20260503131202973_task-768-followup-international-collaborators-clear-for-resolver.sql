-- Up Migration

-- TASK-768 followup — Limpiar economic_category de pagos a colaboradores
-- internacionales SIN RUT chileno (Daniela España, Andrés Colombia) y sus
-- FX fees asociados, para que el resolver actualizado los re-clasifique
-- correctamente como labor_cost_external.
--
-- Causa: el resolver V1 NO capturaba colaboradores sin RUT chileno y sin
-- registro en `members`. Esos pagos cayeron a ACCOUNTING_TYPE_AMBIGUOUS_FALLBACK
-- → vendor_cost_saas. El resolver V1.1 (mismo commit) introduce las rules
-- DIRECT_MEMBER_COST_CATEGORY y FX_FEE_COST_OF_PAYROLL que cubren este caso
-- usando `cost_category='direct_member'` como signal canónica + heurística
-- de "nombre humano".
--
-- Esta migration:
--   1. Identifica filas que cumplen el criterio del re-resolve (cost_category
--      = direct_member + economic_category mal-asignado).
--   2. Inserta audit log row con previous_category (append-only).
--   3. NULL-ea economic_category de esas filas.
--   4. Marca las filas en manual queue como archived (perdieron la
--      candidate_category sesgada; el operador/backfill las re-resolverá).
--
-- Cero impacto en saldos / totales — solo cambia clasificación analítica.
-- Re-run del backfill (`pnpm tsx scripts/finance/backfill-economic-category.ts`)
-- aplica el resolver V1.1 a estas filas.
--
-- Idempotente: solo afecta filas que cumplen el criterio. Re-run no impacta.

BEGIN;

-- 1. Audit log de la limpieza (append-only).
INSERT INTO greenhouse_finance.economic_category_resolution_log
  (log_id, target_kind, target_id, resolved_category, matched_rule,
   confidence, evidence_json, resolved_by, batch_id)
SELECT
  'ecr-intl-clear-' || gen_random_uuid()::text,
  'expense',
  e.expense_id,
  COALESCE(e.economic_category, 'NULL_PRE_RESOLVE'),  -- log el valor que estamos limpiando
  'INTERNATIONAL_COLLABORATOR_CLEAR_FOR_RERESOLVE',
  'high',
  jsonb_build_object(
    'previous_category', e.economic_category,
    'reason', 'cost_category=direct_member + colaborador internacional sin RUT chileno mal-clasificado por resolver V1. Limpieza para re-resolve via DIRECT_MEMBER_COST_CATEGORY_HUMAN_NAME / FX_FEE_COST_OF_PAYROLL rules en resolver V1.1.',
    'expense_type', e.expense_type,
    'cost_category', e.cost_category,
    'supplier_name', e.supplier_name,
    'description_snippet', LEFT(e.description, 100)
  ),
  'migration-task-768-international-followup',
  'migration-20260503131202973'
FROM greenhouse_finance.expenses e
WHERE e.cost_category = 'direct_member'
  AND e.economic_category IS NOT NULL
  AND e.economic_category NOT IN ('labor_cost_internal', 'labor_cost_external');

-- 2. NULL economic_category de las filas afectadas.
UPDATE greenhouse_finance.expenses
   SET economic_category = NULL
 WHERE cost_category = 'direct_member'
   AND economic_category IS NOT NULL
   AND economic_category NOT IN ('labor_cost_internal', 'labor_cost_external');

-- 3. Archivar manual queue rows obsoletos (candidate_category quedó sesgado).
UPDATE greenhouse_finance.economic_category_manual_queue
   SET status = 'archived',
       resolved_by = 'migration-task-768-international-followup',
       resolved_at = NOW(),
       resolution_note = 'Archivado: resolver V1.1 lo re-clasificará via DIRECT_MEMBER_COST_CATEGORY rules.'
 WHERE target_kind = 'expense'
   AND status = 'pending'
   AND target_id IN (
     SELECT expense_id FROM greenhouse_finance.expenses
     WHERE cost_category = 'direct_member'
       AND economic_category IS NULL
   );

COMMIT;

-- Down Migration

-- Reverso intencionalmente NO destructivo — el re-resolve es idempotente
-- vía backfill. Si emerge necesidad de revertir manualmente, las filas en
-- audit log preservan la previous_category para reconstrucción.
