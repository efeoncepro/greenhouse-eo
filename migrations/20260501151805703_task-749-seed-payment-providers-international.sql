-- Up Migration

-- TASK-749: Seed providers internacionales que faltan en el catalog
-- para soportar routing de colaboradores no-Chile / honorarios USD.
--
-- Wise/PayPal/Mercado Pago/Stripe/Deel/Previred ya vienen seedados
-- desde TASK-701. Solo agregamos Global66 (no estaba) — Wise se
-- usa hoy para colaboradores internacionales pero Global66 es el
-- destino canonico para Andres / Daniela / Melkin segun el
-- mockup payment-orders.

INSERT INTO greenhouse_finance.payment_provider_catalog
  (provider_slug, display_name, provider_type, country_code, applicable_to)
VALUES
  ('global66', 'Global66', 'fintech', 'CL', ARRAY['fintech', 'payment_platform'])
ON CONFLICT (provider_slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  provider_type = EXCLUDED.provider_type,
  applicable_to = EXCLUDED.applicable_to,
  is_active = TRUE,
  updated_at = NOW();


-- Down Migration

DELETE FROM greenhouse_finance.payment_provider_catalog
 WHERE provider_slug = 'global66';
