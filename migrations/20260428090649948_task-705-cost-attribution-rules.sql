-- Up Migration

-- TASK-705 — Cost Attribution Rules + Audit.
-- ========================================================================
-- Cada gasto del negocio debe poder atribuirse correctamente para análisis
-- de rentabilidad: por cliente, por servicio, por miembro del equipo, o
-- como overhead. Hoy los expenses caen como `cost_category='operational'`
-- sin allocation, lo que hace que ICO / margen por cliente esté incompleto.
--
-- Solución canónica: tabla de reglas declarativas que matchean supplier_name
-- (o reference, o tool_catalog_id) → estrategia de atribución. Helper TS
-- recorre los expenses y aplica la regla, persistiendo el resultado en el
-- expense (cost_category, cost_is_direct, allocated_client_id, service_line,
-- direct_overhead_*, tool_catalog_id) + un audit log.
--
-- Reusable para CUALQUIER cuenta — TC corp, Global66, Santander CLP,
-- futuras wallets — porque la regla matchea por contenido del expense, no
-- por payment_account_id.

-- ── expense_attribution_rules ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_finance.expense_attribution_rules (
  rule_id              TEXT PRIMARY KEY,
  rule_priority        INT NOT NULL DEFAULT 100,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,

  -- Match conditions (any combination — all that are non-NULL must match)
  match_supplier_pattern TEXT,
  match_reference_pattern TEXT,
  match_description_pattern TEXT,
  match_currency       TEXT,

  -- Resolution outputs
  tool_catalog_id      TEXT REFERENCES greenhouse_ai.tool_catalog(tool_id) ON DELETE SET NULL,
  cost_category        TEXT NOT NULL CHECK (cost_category IN ('operational', 'overhead', 'direct_client', 'direct_member', 'tax', 'investment')),
  cost_is_direct       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Allocation strategy: how to distribute the expense
  allocation_strategy  TEXT NOT NULL CHECK (allocation_strategy IN (
    'single_client',         -- cargo va 100% a un cliente específico
    'single_member',         -- cargo es directo a un miembro (payroll)
    'team_split_equal',      -- split equal entre N miembros (creative team)
    'all_active_members',    -- distribuido per-seat entre todos los activos
    'overhead_internal',     -- no se allocate, va a overhead bucket
    'business_line',         -- attribute a una business line (ej. ai-tooling)
    'manual_required'        -- forzar review manual (sin default)
  )),

  -- Defaults para los outputs
  default_allocated_client_id TEXT REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  default_member_ids   TEXT[],
  default_service_line TEXT,
  default_direct_overhead_kind TEXT,
  default_business_line TEXT,

  -- Documentación
  rule_name            TEXT NOT NULL,
  rule_description     TEXT,
  evidence_refs        JSONB DEFAULT '[]'::jsonb,

  declared_by_user_id  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attr_rules_active
  ON greenhouse_finance.expense_attribution_rules (rule_priority DESC, rule_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_attr_rules_supplier_pattern
  ON greenhouse_finance.expense_attribution_rules (match_supplier_pattern)
  WHERE match_supplier_pattern IS NOT NULL AND is_active = TRUE;

COMMENT ON TABLE greenhouse_finance.expense_attribution_rules IS
  'TASK-705: reglas declarativas para atribuir expenses a clientes/miembros/overhead. Matchean supplier_name, reference, description, currency. Helper TS attributeExpense() las aplica por priority desc.';

COMMENT ON COLUMN greenhouse_finance.expense_attribution_rules.allocation_strategy IS
  'single_client: 100% a un cliente. single_member: payroll directo a un miembro. team_split_equal: split equal entre miembros listados. all_active_members: per-seat distribuido entre todos los miembros activos. overhead_internal: no allocate, queda en bucket overhead Greenhouse. business_line: attribute a línea de negocio. manual_required: review manual obligatorio.';

-- ── expense_attribution_audit ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_finance.expense_attribution_audit (
  audit_id             TEXT PRIMARY KEY,
  expense_id           TEXT NOT NULL REFERENCES greenhouse_finance.expenses(expense_id) ON DELETE CASCADE,
  rule_id              TEXT REFERENCES greenhouse_finance.expense_attribution_rules(rule_id) ON DELETE SET NULL,
  resolved_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_by_user_id  TEXT,

  -- Snapshot del estado pre-attribution
  previous_cost_category TEXT,
  previous_cost_is_direct BOOLEAN,
  previous_allocated_client_id TEXT,
  previous_service_line TEXT,
  previous_tool_catalog_id TEXT,
  previous_direct_overhead_kind TEXT,
  previous_direct_overhead_member_id TEXT,

  -- Resultado aplicado
  applied_cost_category TEXT,
  applied_cost_is_direct BOOLEAN,
  applied_allocated_client_id TEXT,
  applied_service_line TEXT,
  applied_tool_catalog_id TEXT,
  applied_direct_overhead_kind TEXT,
  applied_direct_overhead_member_id TEXT,

  -- Splits derivados (cuando es team_split o all_active_members)
  splits_json          JSONB,

  notes                TEXT
);

CREATE INDEX IF NOT EXISTS idx_attr_audit_expense
  ON greenhouse_finance.expense_attribution_audit (expense_id, resolved_at DESC);

CREATE INDEX IF NOT EXISTS idx_attr_audit_rule
  ON greenhouse_finance.expense_attribution_audit (rule_id, resolved_at DESC)
  WHERE rule_id IS NOT NULL;

COMMENT ON TABLE greenhouse_finance.expense_attribution_audit IS
  'TASK-705: audit log de cada vez que un expense se atribuye. Captura previo + aplicado + rule + splits. Anti-DELETE: cada re-atribución crea fila nueva. Permite re-construir histórico de cómo cambió la atribución.';

-- ── Down Migration ───────────────────────────────────────────────────────

DROP TABLE IF EXISTS greenhouse_finance.expense_attribution_audit CASCADE;
DROP TABLE IF EXISTS greenhouse_finance.expense_attribution_rules CASCADE;
