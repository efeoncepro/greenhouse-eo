CREATE TABLE IF NOT EXISTS greenhouse_finance.economic_indicators (
  indicator_id TEXT PRIMARY KEY,
  indicator_code TEXT NOT NULL,
  indicator_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  source TEXT,
  unit TEXT,
  frequency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT finance_economic_indicators_unique_key UNIQUE (indicator_code, indicator_date)
);

CREATE INDEX IF NOT EXISTS finance_economic_indicators_code_idx
  ON greenhouse_finance.economic_indicators (indicator_code, indicator_date DESC);
