-- Up Migration

-- TASK-768 Slice 1 — Add economic_category column (nullable initial state)
-- ============================================================================
-- Introduce la dimension analitica/operativa `economic_category` separada de la
-- dimension taxonomica fiscal `expense_type` / `income_type`. Esta migracion es
-- ADITIVA y NULLABLE: filas existentes NO se tocan, futuras filas pre-Slice-5
-- pueden insertarse sin la columna; el CHECK constraint que la fuerza llega en
-- Slice 4 (NOT VALID + VALIDATE atomic post-backfill).
--
-- Rationale: separar las dimensiones que hoy estan conflated en `expense_type`
-- - taxonomia contable/SII vs categoria economica/operativa. Bank reconciler
-- defaultea a `supplier` cuando no puede inferir desde transaccion raw, lo que
-- sesga 3M+ de payments labor que economicamente son nomina hacia el bucket
-- Proveedores en KPIs analiticos. La columna nueva es single source of truth
-- para todo analisis economico (KPIs, ICO, P&L gerencial, Member Loaded Cost,
-- Budget Engine, Cost Attribution). `expense_type` queda intacto como
-- `accounting_type` legacy alias para SII / VAT engine / regulatory.
--
-- Spec: docs/tasks/in-progress/TASK-768-finance-expense-economic-category-dimension.md
-- Pattern: TASK-571 (canonical reader) + TASK-699 (consumer contract) + TASK-766
-- (CLP currency contract) - replica el shape "VIEW + helper + reliability +
-- lint" para una dimension nueva.

-- 1. Columna economic_category aditiva en expenses + income

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN economic_category TEXT;

COMMENT ON COLUMN greenhouse_finance.expenses.economic_category IS
  'TASK-768: dimension analitica/operativa. Valores canonicos: '
  'labor_cost_internal | labor_cost_external | vendor_cost_saas | '
  'vendor_cost_professional_services | regulatory_payment | tax | '
  'financial_cost | bank_fee_real | overhead | financial_settlement | other. '
  'NULLABLE pre-cutover; CHECK NOT NULL post-cutover (Slice 4). Distinta de '
  'expense_type (taxonomia fiscal/SII).';

ALTER TABLE greenhouse_finance.income
  ADD COLUMN economic_category TEXT;

COMMENT ON COLUMN greenhouse_finance.income.economic_category IS
  'TASK-768: dimension analitica/operativa. Valores canonicos: '
  'service_revenue | client_reimbursement | factoring_proceeds | '
  'partner_payout_offset | internal_transfer_in | tax_refund | '
  'financial_income | other. NULLABLE pre-cutover; CHECK NOT NULL post-cutover '
  '(Slice 4).';

-- 2. Partial indexes para reliability signal performance
--    (count rows con economic_category IS NULL post-cutover debe ser ~0;
--     index parcial mantiene la query barata sin overhead en filas resueltas)

CREATE INDEX expenses_economic_category_unresolved_idx
  ON greenhouse_finance.expenses (created_at)
  WHERE economic_category IS NULL;

CREATE INDEX income_economic_category_unresolved_idx
  ON greenhouse_finance.income (created_at)
  WHERE economic_category IS NULL;

-- 3. Lookup tables canonicas: known_regulators + known_payroll_vendors
--    Viven en greenhouse_finance (Q4 resuelta: domain-per-schema, finance-only).
--    Patron regex match contra beneficiary_name o raw_description.

CREATE TABLE greenhouse_finance.known_regulators (
  regulator_id    TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  match_regex     TEXT NOT NULL,
  jurisdiction    TEXT NOT NULL DEFAULT 'CL',
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_finance.known_regulators IS
  'TASK-768: tabla canonica de entidades regulatorias chilenas. Beneficiary o '
  'raw_description que match-een el regex se clasifican como '
  'economic_category=regulatory_payment. Extender insertando filas; cero '
  'codigo nuevo de classification.';

CREATE TABLE greenhouse_finance.known_payroll_vendors (
  vendor_id       TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  match_regex     TEXT NOT NULL,
  vendor_type     TEXT NOT NULL DEFAULT 'international_payroll_processor',
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_finance.known_payroll_vendors IS
  'TASK-768: tabla canonica de vendors que operan payroll internacional. '
  'Beneficiary que match-ee el regex se clasifica como '
  'economic_category=labor_cost_external (asume el destino final es un '
  'colaborador, no el vendor mismo).';

-- 4. Seed data: known_regulators (Chile)

INSERT INTO greenhouse_finance.known_regulators (regulator_id, display_name, match_regex, jurisdiction) VALUES
  ('reg-cl-previred', 'Previred', E'(?i)\\mprevired\\M', 'CL'),
  ('reg-cl-sii', 'Servicio de Impuestos Internos', E'(?i)(\\msii\\M|s\\.i\\.i\\.|servicio de impuestos internos|\\mf29\\M|pago en linea s\\.?i\\.?i)', 'CL'),
  ('reg-cl-mutual-cchc', 'Mutual de Seguridad CChC', E'(?i)mutual\\s+(de\\s+)?seguridad|\\mcchc\\M', 'CL'),
  ('reg-cl-fonasa', 'FONASA', E'(?i)\\mfonasa\\M', 'CL'),
  ('reg-cl-isapre-banmedica', 'Isapre Banmedica', E'(?i)\\misapre\\M\\s+banmedica|banmedica', 'CL'),
  ('reg-cl-isapre-colmena', 'Isapre Colmena', E'(?i)\\misapre\\M\\s+colmena|colmena\\s+golden', 'CL'),
  ('reg-cl-isapre-cruzblanca', 'Isapre Cruz Blanca', E'(?i)\\misapre\\M\\s+cruz\\s+blanca|cruz\\s+blanca\\s+isapre', 'CL'),
  ('reg-cl-isapre-vidatres', 'Isapre Vida Tres', E'(?i)\\misapre\\M\\s+vida\\s+tres|vida\\s+tres\\s+isapre', 'CL'),
  ('reg-cl-afp-habitat', 'AFP Habitat', E'(?i)\\mafp\\M\\s+habitat', 'CL'),
  ('reg-cl-afp-provida', 'AFP ProVida', E'(?i)\\mafp\\M\\s+provida', 'CL'),
  ('reg-cl-afp-modelo', 'AFP Modelo', E'(?i)\\mafp\\M\\s+modelo', 'CL'),
  ('reg-cl-afp-capital', 'AFP Capital', E'(?i)\\mafp\\M\\s+capital', 'CL'),
  ('reg-cl-afp-cuprum', 'AFP Cuprum', E'(?i)\\mafp\\M\\s+cuprum', 'CL'),
  ('reg-cl-afp-planvital', 'AFP PlanVital', E'(?i)\\mafp\\M\\s+planvital', 'CL'),
  ('reg-cl-afp-uno', 'AFP Uno', E'(?i)\\mafp\\M\\s+uno', 'CL'),
  ('reg-cl-tgr', 'Tesoreria General de la Republica', E'(?i)tesoreria\\s+general|\\mtgr\\M', 'CL'),
  ('reg-cl-direccion-trabajo', 'Direccion del Trabajo', E'(?i)direccion\\s+del\\s+trabajo', 'CL');

-- 5. Seed data: known_payroll_vendors (international payroll processors)

INSERT INTO greenhouse_finance.known_payroll_vendors (vendor_id, display_name, match_regex, vendor_type) VALUES
  ('vendor-deel', 'Deel Inc.', E'(?i)\\mdeel\\M\\s*(inc\\.?)?|deel\\s+pago', 'international_payroll_processor'),
  ('vendor-remote', 'Remote.com', E'(?i)\\mremote\\M(\\.com)?\\s*(inc\\.?)?|remote\\s+europe', 'international_payroll_processor'),
  ('vendor-velocity-global', 'Velocity Global', E'(?i)velocity\\s+global', 'international_payroll_processor'),
  ('vendor-oyster', 'Oyster HR', E'(?i)\\moyster\\M\\s*(hr)?|oyster\\s+payroll', 'international_payroll_processor'),
  ('vendor-globalization-partners', 'Globalization Partners', E'(?i)globalization\\s+partners', 'international_payroll_processor'),
  ('vendor-papaya-global', 'Papaya Global', E'(?i)papaya\\s+global', 'international_payroll_processor'),
  ('vendor-multiplier', 'Multiplier', E'(?i)\\mmultiplier\\M\\s+(payroll|inc\\.?)', 'international_payroll_processor'),
  ('vendor-rippling-global', 'Rippling Global', E'(?i)rippling\\s+(global|payroll)', 'international_payroll_processor');

-- Down Migration

DROP TABLE IF EXISTS greenhouse_finance.known_payroll_vendors;
DROP TABLE IF EXISTS greenhouse_finance.known_regulators;
DROP INDEX IF EXISTS greenhouse_finance.income_economic_category_unresolved_idx;
DROP INDEX IF EXISTS greenhouse_finance.expenses_economic_category_unresolved_idx;
ALTER TABLE greenhouse_finance.income DROP COLUMN IF EXISTS economic_category;
ALTER TABLE greenhouse_finance.expenses DROP COLUMN IF EXISTS economic_category;
