-- Up Migration

-- TASK-704 — Account Reconciliation Snapshots.
-- ========================================================================
-- Cada vez que un usuario sube una cartola, screenshot OfficeBanking, PDF
-- statement, o cuando llega un webhook bank, declaramos un "snapshot" que
-- compara el estado bank vs el estado PG en ese momento. La diferencia
-- (drift) queda persistida como audit trail de primera clase.
--
-- UI muestra badge "Por conciliar $X" en cuentas con drift abierto. Usuario
-- puede aceptar el drift como pendiente legítimo (holds en proceso, FX rate
-- diff, transacciones post-cartola) o resolverlo añadiendo data faltante.
--
-- Pattern anti-DELETE: cada nuevo snapshot inserta nueva fila. Histórico
-- queda como audit de cómo cuadró la cuenta a lo largo del tiempo.
--
-- Aplica a CUALQUIER cuenta — asset y liability — sin branching. TC,
-- bancos, fintech, CCA, futuras wallets/loans usan el mismo modelo.

CREATE TABLE IF NOT EXISTS greenhouse_finance.account_reconciliation_snapshots (
  snapshot_id            TEXT PRIMARY KEY,
  account_id             TEXT NOT NULL REFERENCES greenhouse_finance.accounts(account_id) ON DELETE CASCADE,
  snapshot_at            TIMESTAMPTZ NOT NULL,
  bank_closing_balance   NUMERIC(18,2) NOT NULL,
  bank_available_balance NUMERIC(18,2),
  bank_holds_amount      NUMERIC(18,2),
  bank_credit_limit      NUMERIC(18,2),
  pg_closing_balance     NUMERIC(18,2) NOT NULL,
  drift_amount           NUMERIC(18,2) NOT NULL,
  drift_status           TEXT NOT NULL CHECK (drift_status IN ('open', 'accepted', 'reconciled')),
  drift_explanation      TEXT,
  source_kind            TEXT NOT NULL CHECK (source_kind IN (
    'cartola_xlsx', 'officebanking_screenshot', 'statement_pdf',
    'manual_declaration', 'api_webhook'
  )),
  source_evidence_ref    TEXT,
  declared_by_user_id    TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at            TIMESTAMPTZ,
  resolved_by_user_id    TEXT,
  resolved_reason        TEXT
);

CREATE INDEX IF NOT EXISTS idx_recon_account_open
  ON greenhouse_finance.account_reconciliation_snapshots (account_id, snapshot_at DESC)
  WHERE drift_status = 'open';

CREATE INDEX IF NOT EXISTS idx_recon_account_latest
  ON greenhouse_finance.account_reconciliation_snapshots (account_id, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_recon_evidence
  ON greenhouse_finance.account_reconciliation_snapshots (source_kind, snapshot_at DESC);

COMMENT ON TABLE greenhouse_finance.account_reconciliation_snapshots IS
  'TASK-704: declaraciones bank-vs-PG por cuenta y momento. Anti-DELETE: cada upload de cartola/screenshot/webhook genera nueva fila con drift = pg_closing - bank_closing. Drift status open/accepted/reconciled gobierna UI badge.';

COMMENT ON COLUMN greenhouse_finance.account_reconciliation_snapshots.drift_amount IS
  'pg_closing_balance − bank_closing_balance. Para liability accounts, positivo = PG cuenta más deuda que banco (típico cuando PG ya reconoció cargos en hold). Para asset, positivo = PG tiene más caja que banco.';

COMMENT ON COLUMN greenhouse_finance.account_reconciliation_snapshots.drift_status IS
  'open: no revisado. accepted: usuario marcó drift como pendiente legítimo (holds, timing, FX) — sigue mostrando badge informativo. reconciled: drift cerrado por adición de data faltante o nuevo snapshot que cuadró exacto.';

COMMENT ON COLUMN greenhouse_finance.account_reconciliation_snapshots.bank_holds_amount IS
  'Para credit_card: cupo_total - bank_closing - bank_available_balance. Authorizations en proceso que reducen disponible pero no deuda. NULL para otros account_kind.';

-- Down Migration

DROP TABLE IF EXISTS greenhouse_finance.account_reconciliation_snapshots CASCADE;
