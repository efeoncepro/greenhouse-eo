-- Up Migration

-- Separate labor cost (from commercial cost attribution) from direct_costs_clp
ALTER TABLE greenhouse_finance.client_economics
  ADD COLUMN IF NOT EXISTS labor_cost_clp NUMERIC DEFAULT 0;

COMMENT ON COLUMN greenhouse_finance.client_economics.labor_cost_clp IS
  'Labor cost from commercial cost attribution (payroll + overhead allocated to client). Separated from direct_costs_clp for accurate reporting.';

-- Backfill: extract labor portion from direct_costs_clp using materialized attribution data
UPDATE greenhouse_finance.client_economics ce
SET
  labor_cost_clp = COALESCE(attr.labor_clp, 0),
  direct_costs_clp = ce.direct_costs_clp - COALESCE(attr.labor_clp, 0)
FROM (
  SELECT
    client_id,
    period_year,
    period_month,
    SUM(commercial_labor_cost_target) AS labor_clp
  FROM greenhouse_serving.commercial_cost_attribution
  GROUP BY client_id, period_year, period_month
) attr
WHERE ce.client_id = attr.client_id
  AND ce.period_year = attr.period_year
  AND ce.period_month = attr.period_month
  AND ce.labor_cost_clp = 0;

-- Down Migration

-- Merge labor cost back into direct_costs_clp before dropping column
UPDATE greenhouse_finance.client_economics
SET direct_costs_clp = direct_costs_clp + labor_cost_clp
WHERE labor_cost_clp > 0;

ALTER TABLE greenhouse_finance.client_economics
  DROP COLUMN IF EXISTS labor_cost_clp;
