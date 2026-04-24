-- Up Migration
--
-- TASK-601 Fase A (Slice 4) — Backfill desde greenhouse_finance.products legacy.
--
-- Copia is_recurring + recurring_billing_frequency_code (si HS los mapea)
-- y category_code (reverse-lookup de finance.products.category → product_categories
-- via label_es) a greenhouse_commercial.product_catalog.
--
-- IDEMPOTENTE: usa `WHERE col IS NULL` para no sobrescribir valores existentes.
-- No copia unit_price (responsabilidad de TASK-602 Fase B prices).
-- No copia cost_of_goods_sold (GH SoT, pero fuera del scope TASK-601).

-- ─────────────────────────────────────────────────────────────
-- Backfill is_recurring desde finance.products
-- ─────────────────────────────────────────────────────────────

UPDATE greenhouse_commercial.product_catalog pc
SET is_recurring = fp.is_recurring
FROM greenhouse_finance.products fp
WHERE pc.finance_product_id = fp.product_id
  AND fp.is_recurring IS NOT NULL
  AND (pc.is_recurring IS NULL OR pc.is_recurring = FALSE);

-- ─────────────────────────────────────────────────────────────
-- Backfill recurring_billing_frequency_code desde finance.products.billing_frequency
-- Solo si el valor matches el CHECK (valores HS válidos).
-- ─────────────────────────────────────────────────────────────

UPDATE greenhouse_commercial.product_catalog pc
SET recurring_billing_frequency_code = fp.billing_frequency
FROM greenhouse_finance.products fp
WHERE pc.finance_product_id = fp.product_id
  AND pc.recurring_billing_frequency_code IS NULL
  AND fp.billing_frequency IN (
    'weekly', 'biweekly', 'monthly', 'quarterly',
    'per_six_months', 'annually',
    'per_two_years', 'per_three_years', 'per_four_years', 'per_five_years'
  );

-- ─────────────────────────────────────────────────────────────
-- Backfill recurring_billing_period_iso: no existe columna mapeable
-- directamente en finance.products (tiene billing_period_count INT).
-- Derivación a ISO 8601 duration se deja para TASK-602+ cuando el
-- admin UI permita al operador setear el valor directamente.
-- ─────────────────────────────────────────────────────────────

-- (no-op)

-- ─────────────────────────────────────────────────────────────
-- Backfill category_code: reverse-lookup de finance.products.category
-- contra product_categories.label_es (case-insensitive).
-- Si no hay match, category_code queda NULL (operador lo setea después).
-- ─────────────────────────────────────────────────────────────

UPDATE greenhouse_commercial.product_catalog pc
SET category_code = pcat.code
FROM greenhouse_finance.products fp
JOIN greenhouse_commercial.product_categories pcat
  ON LOWER(TRIM(pcat.label_es)) = LOWER(TRIM(fp.category))
WHERE pc.finance_product_id = fp.product_id
  AND pc.category_code IS NULL
  AND fp.category IS NOT NULL
  AND fp.category <> '';

-- Also match against legacy_category (columna ya existente en product_catalog)
UPDATE greenhouse_commercial.product_catalog pc
SET category_code = pcat.code
FROM greenhouse_commercial.product_categories pcat
WHERE pc.category_code IS NULL
  AND pc.legacy_category IS NOT NULL
  AND LOWER(TRIM(pcat.label_es)) = LOWER(TRIM(pc.legacy_category));

-- Down Migration
--
-- Revertir el backfill es soft: dejamos los valores cargados porque son data
-- legítima derivada de fuentes autoritativas. Re-aplicar la down migration de
-- 20260424133202485 al dropear columnas también elimina estos datos, lo cual
-- es el path seguro. Aquí no-op.

-- (no-op)
