-- Up Migration

-- TASK-768 followup — Reclasificar pagos SII (Servicio de Impuestos Internos)
-- de `regulatory_payment` a `tax`.
--
-- Causa: el backfill inicial usaba el resolver canonico que aplicaba la
-- regla 6 KNOWN_REGULATOR_REGEX antes de validar el accounting_type. SII
-- matcheaba el regex de regulators y se clasificaba como regulatory_payment.
-- Pero semanticamente SII es `tax` (pago directo de impuestos), NO
-- regulatory (cotizacion previsional).
--
-- El resolver fue corregido en el mismo commit (rule 6 ahora prioriza tax
-- cuando regulator_id='reg-cl-sii' o accounting_type='tax'). Esta migration
-- aplica el fix retroactivo a los rows ya backfilled.
--
-- Idempotente: solo afecta rows que matchean el criterio especifico.
-- Cero impacto en saldos / totales — solo cambia distribucion entre
-- buckets analiticos (fiscalClp se mantiene; cambia composicion interna
-- de tax + regulatory_payment).
--
-- Audit: cada UPDATE genera fila en economic_category_resolution_log con
-- matched_rule='SII_TAX_RECLASSIFY_FOLLOWUP' y evidencia del fix.

BEGIN;

-- 1. Insertar audit log rows ANTES del UPDATE (append-only; el trigger
--    anti-update/delete impide tocarlos despues).
INSERT INTO greenhouse_finance.economic_category_resolution_log
  (log_id, target_kind, target_id, resolved_category, matched_rule,
   confidence, evidence_json, resolved_by, batch_id)
SELECT
  'ecr-sii-followup-' || gen_random_uuid()::text,
  'expense',
  e.expense_id,
  'tax',
  'SII_TAX_RECLASSIFY_FOLLOWUP',
  'high',
  jsonb_build_object(
    'previous_category', e.economic_category,
    'reason', 'SII matchea known_regulators regex pero semanticamente es tax (pago directo SII), no regulatory_payment. Resolver corregido para priorizar tax cuando regulator_id=reg-cl-sii.',
    'expense_type', e.expense_type,
    'description_snippet', LEFT(e.description, 100)
  ),
  'migration-task-768-followup',
  'migration-20260503130213615'
FROM greenhouse_finance.expenses e
WHERE e.expense_type = 'tax'
  AND e.economic_category = 'regulatory_payment';

-- 2. UPDATE expenses afectadas.
UPDATE greenhouse_finance.expenses
   SET economic_category = 'tax'
 WHERE expense_type = 'tax'
   AND economic_category = 'regulatory_payment';

-- 3. Marcar las filas en manual queue como resolved (ya tienen su
--    categoria persistida correcta).
UPDATE greenhouse_finance.economic_category_manual_queue
   SET status = 'resolved',
       resolved_by = 'migration-task-768-followup',
       resolved_at = NOW(),
       resolution_note = 'SII reclassify retroactivo (followup TASK-768): regulatory_payment → tax'
 WHERE target_kind = 'expense'
   AND status = 'pending'
   AND target_id IN (
     SELECT expense_id FROM greenhouse_finance.expenses
     WHERE expense_type = 'tax' AND economic_category = 'tax'
   );

COMMIT;

-- Down Migration

-- Reverso intencionalmente NO destructivo: SII expenses correctos como `tax`
-- son la verdad canonica. Si emerge necesidad de revertir, hacerlo
-- explicitamente con UPDATE ad-hoc + nueva fila audit log.
