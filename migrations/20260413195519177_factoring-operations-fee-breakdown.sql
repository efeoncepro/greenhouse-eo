-- ═══════════════════════════════════════════════════════════════════════════
-- TASK-391: Finance Factoring Operations — fee breakdown + external references
--
-- Agrega 4 columnas a greenhouse_finance.factoring_operations:
--   • interest_amount     — componente de tasa (escala con monto y plazo)
--   • advisory_fee_amount — componente de asesoría fija por operación
--   • external_reference  — Nº de solicitud en el sistema del proveedor
--   • external_folio      — folio interno del proveedor para la operación
--
-- La columna fee_amount existente sigue siendo la suma de ambos componentes
-- (retrocompatible con greenhouse_serving.income_360 y código existente).
-- ═══════════════════════════════════════════════════════════════════════════

-- Up Migration

ALTER TABLE greenhouse_finance.factoring_operations
  ADD COLUMN IF NOT EXISTS interest_amount      NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS advisory_fee_amount  NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS external_reference   TEXT,
  ADD COLUMN IF NOT EXISTS external_folio       TEXT;

COMMENT ON COLUMN greenhouse_finance.factoring_operations.interest_amount
  IS 'Componente de tasa variable (interés puro según plazo y monto). Ej: valor tasa Xepelin = $94.557';

COMMENT ON COLUMN greenhouse_finance.factoring_operations.advisory_fee_amount
  IS 'Componente de asesoría fija por operación, independiente del monto. Ej: Asesoría Xepelin = $30.990';

COMMENT ON COLUMN greenhouse_finance.factoring_operations.external_reference
  IS 'Número de solicitud en el sistema del proveedor de factoring. Ej: Solicitud Nº 371497 de Xepelin';

COMMENT ON COLUMN greenhouse_finance.factoring_operations.external_folio
  IS 'Folio interno del proveedor para esta operación específica. Ej: Folio 115 de Xepelin';

-- Down Migration

ALTER TABLE greenhouse_finance.factoring_operations
  DROP COLUMN IF EXISTS interest_amount,
  DROP COLUMN IF EXISTS advisory_fee_amount,
  DROP COLUMN IF EXISTS external_reference,
  DROP COLUMN IF EXISTS external_folio;
