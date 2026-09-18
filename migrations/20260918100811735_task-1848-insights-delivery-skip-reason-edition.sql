-- Up Migration

-- TASK-1848 Slice 2 — motivo propio para un destinatario que no se despacha porque la edición dejó
-- de estar emitida (retirada entre el intent y el despacho). Antes caía en `recipient_inactive`,
-- que culpa a la persona. Expand-only: agrega un valor al CHECK; ninguna fila existente lo usa.

ALTER TABLE greenhouse_insights.insight_delivery_recipients
  DROP CONSTRAINT IF EXISTS insight_delivery_recipients_skip_reason_check;

ALTER TABLE greenhouse_insights.insight_delivery_recipients
  ADD CONSTRAINT insight_delivery_recipients_skip_reason_check
  CHECK (skip_reason IS NULL OR skip_reason IN (
    'duplicate_delivery', 'recipient_inactive', 'recipient_undeliverable', 'email_type_paused', 'asset_unavailable',
    'edition_unavailable'
  ));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'insight_delivery_recipients_skip_reason_check'
       AND pg_get_constraintdef(oid) LIKE '%edition_unavailable%'
  ) THEN
    RAISE EXCEPTION 'TASK-1848 anti pre-up-marker check: skip_reason_check sin edition_unavailable';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_insights.insight_delivery_recipients
  DROP CONSTRAINT IF EXISTS insight_delivery_recipients_skip_reason_check;

ALTER TABLE greenhouse_insights.insight_delivery_recipients
  ADD CONSTRAINT insight_delivery_recipients_skip_reason_check
  CHECK (skip_reason IS NULL OR skip_reason IN (
    'duplicate_delivery', 'recipient_inactive', 'recipient_undeliverable', 'email_type_paused', 'asset_unavailable'
  ));
