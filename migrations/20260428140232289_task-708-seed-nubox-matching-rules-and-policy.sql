-- Up Migration
--
-- TASK-708 followup — Seed Nubox D5 matching rules + D3 review policy
-- ====================================================================
-- Patrones observados en Cohorte A (auditado 2026-04-28, 23 phantoms):
--   - 100% payment_method='bank_transfer'
--   - 100% currency='CLP'
--   - 100% reference prefix 'nubox-mvmt-inc-'
--   - Cuenta destino dominante: santander-clp (Chilean bank account)
--   - Excepciones legitimas observadas: pagos via TC (Tarjeta de Credito) no
--     se ven en Cohorte A pero el codigo legacy las mapeaba a santander-corp-clp
--
-- Decision conservadora: arrancamos con UNA regla seed para CLP bank_transfer
-- → santander-clp y la politica para (nubox, NULL global) en mode='review'.
-- Eso exige firma humana en cada adopcion durante 1-2 semanas. Cuando hayan
-- 50+ adopciones manuales sin falsos positivos, la politica se promueve a
-- 'auto_adopt' via UPDATE en `external_signal_auto_adopt_policies`.
--
-- Reglas adicionales (TC / Global66 / USD) se agregan via admin UI cuando
-- aparezcan patrones reales — esta migracion solo cubre el path dominante.

SET search_path = greenhouse_finance, public;

-- =========================================================================
-- 1. Politica D3 — review humano para todo Nubox (defensa conservadora)
-- =========================================================================

INSERT INTO greenhouse_finance.external_signal_auto_adopt_policies (
  policy_id,
  source_system,
  space_id,
  mode,
  is_active,
  created_by,
  notes
) VALUES (
  'policy-nubox-global-review',
  'nubox',
  NULL,
  'review',
  TRUE,
  'system:task-708-followups',
  'Default conservador: senales Nubox quedan en cola admin /finance/external-signals para adopcion manual con capability finance.cash.adopt-external-signal. Promover a auto_adopt cuando >=50 adopciones manuales hayan validado las reglas D5 sin falsos positivos.'
)
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 2. Reglas D5 — pattern dominante CLP bank_transfer → santander-clp
-- =========================================================================

INSERT INTO greenhouse_finance.account_signal_matching_rules (
  rule_id,
  source_system,
  space_id,
  match_predicate_json,
  resolved_account_id,
  priority,
  is_active,
  created_by,
  rule_provenance,
  notes
) VALUES (
  'rule-nubox-clp-bank-transfer-santander',
  'nubox',
  NULL,
  '{"payment_method_in": ["bank_transfer"], "currency_eq": "CLP"}'::jsonb,
  'santander-clp',
  100,
  TRUE,
  'system:task-708-followups',
  'migration_seed',
  'TASK-708 D5 seed: 100% de Cohorte A historica matchea este patron (CLP + bank_transfer). Cubre pagos Nubox que llegan a la cuenta corriente Santander (cuenta operativa principal Efeonce). Reglas para TC, USD, Global66 se agregaran via admin UI cuando aparezcan patrones reales.'
)
ON CONFLICT (rule_id) DO NOTHING;

-- =========================================================================
-- 3. Comments
-- =========================================================================

COMMENT ON TABLE greenhouse_finance.external_signal_auto_adopt_policies IS
  'TASK-708 D3 — politica review/auto_adopt por (source_system, space_id). Default seed: nubox global = review. Promover a auto_adopt manualmente cuando reglas D5 esten validadas en produccion.';

-- Down Migration

DELETE FROM greenhouse_finance.account_signal_matching_rules
WHERE rule_id = 'rule-nubox-clp-bank-transfer-santander';

DELETE FROM greenhouse_finance.external_signal_auto_adopt_policies
WHERE policy_id = 'policy-nubox-global-review';
