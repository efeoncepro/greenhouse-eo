-- TASK-720 Slice 1 — Instrument Category KPI Rules: tabla declarativa que dicta
-- cómo cada `instrument_category` contribuye a cada KPI del módulo Banco. Reemplaza
-- la lógica inline de `getBankOverview` que sumaba liability como cash, inflando
-- "Saldo CLP" en $1.3M (TC + CCA).

-- Up Migration

CREATE TABLE greenhouse_finance.instrument_category_kpi_rules (
  instrument_category TEXT PRIMARY KEY,
  account_kind TEXT NOT NULL CHECK (account_kind IN ('asset', 'liability')),
  contributes_to_cash BOOLEAN NOT NULL,
  contributes_to_consolidated_clp BOOLEAN NOT NULL,
  contributes_to_net_worth BOOLEAN NOT NULL,
  net_worth_sign SMALLINT NOT NULL CHECK (net_worth_sign IN (-1, 1)),
  display_label TEXT NOT NULL,
  display_group TEXT NOT NULL CHECK (display_group IN ('cash', 'credit', 'platform_internal')),
  rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_implies_consolidated CHECK (
    NOT contributes_to_cash OR contributes_to_consolidated_clp
  ),
  CONSTRAINT consolidated_implies_net_worth CHECK (
    NOT contributes_to_consolidated_clp OR contributes_to_net_worth
  ),
  CONSTRAINT liability_must_have_negative_sign CHECK (
    account_kind != 'liability' OR net_worth_sign = -1
  ),
  CONSTRAINT asset_must_have_positive_sign CHECK (
    account_kind != 'asset' OR net_worth_sign = 1
  )
);

COMMENT ON TABLE greenhouse_finance.instrument_category_kpi_rules IS
  'TASK-720 — Catálogo declarativo: cómo cada instrument_category contribuye a los KPIs del módulo Banco. Single source of truth para aggregateBankKpis.';

-- Seed: 10 categorías (6 activas + 4 reservadas)

INSERT INTO greenhouse_finance.instrument_category_kpi_rules (
  instrument_category, account_kind, contributes_to_cash, contributes_to_consolidated_clp,
  contributes_to_net_worth, net_worth_sign, display_label, display_group, rationale
) VALUES
  (
    'bank_account', 'asset', TRUE, TRUE, TRUE, 1,
    'Cuenta corriente', 'cash',
    'Cuenta bancaria operativa: cash disponible directo. Contribuye a cash, consolidated, net worth.'
  ),
  (
    'fintech', 'asset', TRUE, TRUE, TRUE, 1,
    'Fintech', 'cash',
    'Fintech (Global66, similares): cash disponible directo. Misma semántica que bank_account.'
  ),
  (
    'payment_platform', 'asset', TRUE, TRUE, TRUE, 1,
    'Plataforma de pagos', 'cash',
    'Deel, Stripe, similares: cash retenido esperando withdraw, pero disponible.'
  ),
  (
    'payroll_processor', 'asset', FALSE, FALSE, FALSE, 1,
    'Procesador de nómina', 'platform_internal',
    'Previred: cuenta de tránsito. El cash sale de la cuenta pagadora real (Santander) y aparece internamente en el processor — no debe contar como cash propio para evitar doble conteo.'
  ),
  (
    'credit_card', 'liability', FALSE, FALSE, TRUE, -1,
    'Tarjeta de crédito', 'credit',
    'TC: closing_balance positivo = deuda activa (sign convention TASK-703). NO es cash disponible.'
  ),
  (
    'shareholder_account', 'liability', FALSE, FALSE, TRUE, -1,
    'Cuenta corriente accionista', 'platform_internal',
    'CCA: ledger interno de aportes/retiros. closing_balance positivo = deuda de la empresa con accionista. NO es cash operativo.'
  ),
  (
    'employee_wallet', 'liability', FALSE, FALSE, TRUE, -1,
    'Wallet de colaborador', 'platform_internal',
    'Reservado: wallets internas de colaboradores. Mismo patrón que shareholder_account.'
  ),
  (
    'intercompany_loan', 'liability', FALSE, FALSE, TRUE, -1,
    'Préstamo intercompañía', 'platform_internal',
    'Reservado: préstamos entre entidades del grupo.'
  ),
  (
    'factoring_advance', 'liability', FALSE, FALSE, TRUE, -1,
    'Adelanto de factoring', 'credit',
    'Reservado: adelanto contra AR vendido a factoring provider.'
  ),
  (
    'escrow_account', 'asset', FALSE, TRUE, TRUE, 1,
    'Cuenta escrow', 'platform_internal',
    'Reservado: fondos retenidos en escrow. Cash patrimonial pero no operativo.'
  );

-- Pre-flight: validar que toda categoría activa en accounts tenga rule.
-- Si falla, la migration revierte automáticamente (transaction-scoped).

DO $$
DECLARE
  v_missing_count INTEGER;
  v_missing_categories TEXT;
BEGIN
  SELECT COUNT(*), STRING_AGG(DISTINCT instrument_category, ', ')
  INTO v_missing_count, v_missing_categories
  FROM greenhouse_finance.accounts
  WHERE is_active = TRUE
    AND instrument_category IS NOT NULL
    AND instrument_category NOT IN (
      SELECT instrument_category FROM greenhouse_finance.instrument_category_kpi_rules
    );

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION 'TASK-720: % active account categories without KPI rule: %. Aborting.',
      v_missing_count, v_missing_categories;
  END IF;
END $$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_finance.instrument_category_kpi_rules;
