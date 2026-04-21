-- Up Migration
--
-- TASK-466 — Multi-Currency Quote Output
--
-- Amplía los CHECK constraints de moneda en las tablas comerciales a las 6
-- monedas declaradas por CURRENCY_DOMAIN_SUPPORT.pricing_output
-- (CLP, USD, CLF, COP, MXN, PEN). Sin esta migración no es posible persistir
-- una quote en MXN/COP/PEN aunque el engine y el builder ya las soporten.
--
-- Tablas afectadas:
--   greenhouse_commercial.quotations           (currency)
--   greenhouse_commercial.quotation_defaults   (default_currency)
--   greenhouse_commercial.role_rate_cards      (currency)
--   greenhouse_commercial.approval_policies    (default_currency)
--
-- finance_core (income/expense/payroll) queda intencionalmente en CLP/USD
-- por contrato; no se toca aquí.

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_currency_check;

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_currency_check
  CHECK (
    currency = ANY (
      ARRAY['CLP'::text, 'USD'::text, 'CLF'::text, 'COP'::text, 'MXN'::text, 'PEN'::text]
    )
  );

ALTER TABLE greenhouse_commercial.quotation_defaults
  DROP CONSTRAINT IF EXISTS quotation_defaults_default_currency_check;

ALTER TABLE greenhouse_commercial.quotation_defaults
  ADD CONSTRAINT quotation_defaults_default_currency_check
  CHECK (
    default_currency = ANY (
      ARRAY['CLP'::text, 'USD'::text, 'CLF'::text, 'COP'::text, 'MXN'::text, 'PEN'::text]
    )
  );

ALTER TABLE greenhouse_commercial.role_rate_cards
  DROP CONSTRAINT IF EXISTS role_rate_cards_currency_check;

ALTER TABLE greenhouse_commercial.role_rate_cards
  ADD CONSTRAINT role_rate_cards_currency_check
  CHECK (
    currency = ANY (
      ARRAY['CLP'::text, 'USD'::text, 'CLF'::text, 'COP'::text, 'MXN'::text, 'PEN'::text]
    )
  );

ALTER TABLE greenhouse_commercial.approval_policies
  DROP CONSTRAINT IF EXISTS approval_policies_default_currency_check;

ALTER TABLE greenhouse_commercial.approval_policies
  ADD CONSTRAINT approval_policies_default_currency_check
  CHECK (
    default_currency = ANY (
      ARRAY['CLP'::text, 'USD'::text, 'CLF'::text, 'COP'::text, 'MXN'::text, 'PEN'::text]
    )
  );

-- Down Migration
--
-- Revierte el CHECK al set original (CLP/USD/CLF). Si hay filas con monedas
-- nuevas (COP/MXN/PEN), el DROP + ADD fallará: es la garantía esperada contra
-- pérdida silenciosa de datos client-facing.

ALTER TABLE greenhouse_commercial.approval_policies
  DROP CONSTRAINT IF EXISTS approval_policies_default_currency_check;

ALTER TABLE greenhouse_commercial.approval_policies
  ADD CONSTRAINT approval_policies_default_currency_check
  CHECK (default_currency = ANY (ARRAY['CLP'::text, 'USD'::text, 'CLF'::text]));

ALTER TABLE greenhouse_commercial.role_rate_cards
  DROP CONSTRAINT IF EXISTS role_rate_cards_currency_check;

ALTER TABLE greenhouse_commercial.role_rate_cards
  ADD CONSTRAINT role_rate_cards_currency_check
  CHECK (currency = ANY (ARRAY['CLP'::text, 'USD'::text, 'CLF'::text]));

ALTER TABLE greenhouse_commercial.quotation_defaults
  DROP CONSTRAINT IF EXISTS quotation_defaults_default_currency_check;

ALTER TABLE greenhouse_commercial.quotation_defaults
  ADD CONSTRAINT quotation_defaults_default_currency_check
  CHECK (default_currency = ANY (ARRAY['CLP'::text, 'USD'::text, 'CLF'::text]));

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_currency_check;

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_currency_check
  CHECK (currency = ANY (ARRAY['CLP'::text, 'USD'::text, 'CLF'::text]));
