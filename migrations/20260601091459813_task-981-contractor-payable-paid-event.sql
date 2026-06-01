-- Up Migration
--
-- TASK-981 — Contractor payable `paid` lifecycle event.
--
-- Cierra el tramo final del lifecycle del contractor payable: cuando la payment
-- order que lo paga se marca `paid` (settlement TASK-765/977), un consumer
-- reactivo (`contractor-payable-paid-cascade`) transiciona el payable
-- `payment_order_created → paid` vía el writer canonical `markPayablePaid`,
-- que appendea el evento `paid` a `contractor_payable_events` y publica el
-- evento de dominio `workforce.contractor_payable.paid v1`.
--
-- Antes de TASK-981 NINGÚN writer transicionaba el payable a `paid` ni emitía
-- ese evento (mismo gap-class que TASK-979 cerró para `payment_order_created`).
-- Consecuencia colateral: el comprobante TASK-960 (gate `status='paid'`) era
-- inalcanzable; esto lo desbloquea.
--
-- Cambio: extiende el CHECK de greenhouse_hr.contractor_payable_events.event_type
-- con 'paid' (additivo sobre el set TASK-979). La state machine ya permite
-- `payment_order_created → paid` (forward-fix 20260531021000000) — sin cambio.
--
-- Migration markers protocolo TASK-768 / ISSUE-068: marker '-- Up Migration'
-- al inicio + anti pre-up DO block que aborta si el valor no quedó admitido.

ALTER TABLE greenhouse_hr.contractor_payable_events
  DROP CONSTRAINT IF EXISTS contractor_payable_events_event_type_check;

ALTER TABLE greenhouse_hr.contractor_payable_events
  ADD CONSTRAINT contractor_payable_events_event_type_check
  CHECK (event_type IN (
    'created',
    'ready_for_finance',
    'obligation_created',
    'payment_order_created',
    'paid',
    'blocked',
    'cancelled',
    'updated'
  ));

-- ────────────────────────────────────────────────────────────────────────────
-- Anti pre-up-marker check (TASK-768 / ISSUE-068 canonical pattern):
-- verifica que el CHECK definido admita 'paid'. Si los markers estuvieran
-- invertidos el CHECK seguiría siendo el legacy y este bloque abortaría.
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  check_clause TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO check_clause
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'greenhouse_hr'
    AND t.relname = 'contractor_payable_events'
    AND c.conname = 'contractor_payable_events_event_type_check';

  IF check_clause IS NULL OR check_clause NOT LIKE '%''paid''%' THEN
    RAISE EXCEPTION 'TASK-981 anti pre-up-marker: event_type CHECK does not admit ''paid'' (got: %). Markers may be inverted.', check_clause;
  END IF;
END
$$;

-- Down Migration

-- Restaura el CHECK al set TASK-979 (sin 'paid'). Revierte sólo la extensión
-- TASK-981. (Si quedaran filas event_type='paid' este DROP/ADD fallaría; en ese
-- caso archivar/cerrar el lifecycle antes de revertir.)
ALTER TABLE greenhouse_hr.contractor_payable_events
  DROP CONSTRAINT IF EXISTS contractor_payable_events_event_type_check;

ALTER TABLE greenhouse_hr.contractor_payable_events
  ADD CONSTRAINT contractor_payable_events_event_type_check
  CHECK (event_type IN (
    'created',
    'ready_for_finance',
    'obligation_created',
    'payment_order_created',
    'blocked',
    'cancelled',
    'updated'
  ));
