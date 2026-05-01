-- Up Migration

-- TASK-749: el payment_method de payment_orders necesita aceptar 'global66'
-- y 'manual' para que cuando el resolver TASK-749 tome la ruta del perfil
-- activo, la order se pueda persistir sin violar el CHECK.

ALTER TABLE greenhouse_finance.payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_payment_method_check;

ALTER TABLE greenhouse_finance.payment_orders
  ADD CONSTRAINT payment_orders_payment_method_check CHECK (
    payment_method IS NULL OR payment_method IN (
      'bank_transfer',
      'wire',
      'paypal',
      'wise',
      'deel',
      'global66',
      'manual_cash',
      'check',
      'sii_pec',
      'other'
    )
  );


-- Down Migration

ALTER TABLE greenhouse_finance.payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_payment_method_check;

ALTER TABLE greenhouse_finance.payment_orders
  ADD CONSTRAINT payment_orders_payment_method_check CHECK (
    payment_method IS NULL OR payment_method IN (
      'bank_transfer',
      'wire',
      'paypal',
      'wise',
      'deel',
      'manual_cash',
      'check',
      'sii_pec',
      'other'
    )
  );
