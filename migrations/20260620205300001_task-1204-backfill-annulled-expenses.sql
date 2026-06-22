-- Up Migration

-- TASK-1204 Slice 2 — Backfill de `is_annulled` para documentos anulados en
-- fuente (SII/Nubox) cuyo flag quedó desacoplado.
-- Causa raíz: el sync Nubox traía `document_status_name='Anulada'` pero seteaba
-- `is_annulled = purchase.is_annulled ?? false` (el booleano de Nubox no siempre
-- viene poblado), dejando boletas anuladas como válidas → contaban en la
-- posición de retención del F29 (caso real: folio 40 Valentina, +107.970).
-- El fix de código (sync mapea Anulada→is_annulled + materializador excluye
-- anulados) va en el mismo PR; este backfill corrige los documentos ya ingeridos.
--
-- Alcance medido (2026-06-20): 2 documentos (folio 40 período 2026-05 con
-- withholding; folio 29 2025-09 sin withholding). Idempotente: sólo toca filas
-- anuladas en fuente con is_annulled=false.

SET search_path TO public, greenhouse_finance;

UPDATE greenhouse_finance.expenses
SET is_annulled = true,
    updated_at = NOW()
WHERE (sii_document_status = 'Anulada' OR nubox_document_status = 'Anulada')
  AND COALESCE(is_annulled, false) = false;

-- Anti pre-up-marker guard: aborta si quedó algún documento anulado en fuente
-- con is_annulled=false (el UPDATE no aplicó).
DO $$
DECLARE drift_count integer;
BEGIN
  SELECT COUNT(*) INTO drift_count
  FROM greenhouse_finance.expenses
  WHERE (sii_document_status = 'Anulada' OR nubox_document_status = 'Anulada')
    AND COALESCE(is_annulled, false) = false;

  IF drift_count > 0 THEN
    RAISE EXCEPTION 'TASK-1204 annulled backfill check: % documentos anulados en fuente siguen con is_annulled=false.', drift_count;
  END IF;
END
$$;

-- Down Migration

-- Revierte el backfill: restaura is_annulled=false para los documentos anulados
-- en fuente (no toca documentos válidos). Reversible y acotado.
UPDATE greenhouse_finance.expenses
SET is_annulled = false,
    updated_at = NOW()
WHERE (sii_document_status = 'Anulada' OR nubox_document_status = 'Anulada')
  AND is_annulled = true;