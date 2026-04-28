-- Up Migration

-- TASK-709 — Labor allocation consolidation invariant.
-- ========================================================================
-- Bug observado en TASK-708 V2 attribution: Sky Airline marzo 2026 mostraba
-- $5,122,256 expense_direct_member_via_fte cuando el monto correcto era
-- $2,561,128 (mitad). Causa raíz arquitectónica:
--
-- `greenhouse_serving.client_labor_cost_allocation` es una VIEW que emite
-- 1 row por (payroll_entry × client_team_assignment). Si en un mismo mes
-- calendario hay 2 payroll entries para el mismo miembro (e.g. nómina
-- febrero + nómina marzo ambas posteadas en marzo), la VIEW emite 2 rows
-- por (member, year, month, client_id) — cada una con fte_contribution=1.0
-- y allocated_labor_clp distinto.
--
-- Eso es semánticamente válido en el contexto de "1 row por payroll_entry"
-- (no podemos modificar la VIEW upstream porque rompería consumers que
-- dependen de granularidad por entry), pero NO sirve para attribution
-- comercial donde necesitamos UNA row consolidada por (member, period,
-- client) — sino el JOIN con expenses prorrateados se multiplica.
--
-- Solución canónica: NUEVA VIEW `client_labor_cost_allocation_consolidated`
-- que agrupa por (period, member, client) consolidando allocated_labor_clp
-- y normalizando fte_contribution (max porque son entries del mismo
-- assignment subyacente). Esta es la VIEW que TASK-708 v2 attribution
-- y cualquier consumer que necesite "1 row por miembro × cliente × período"
-- DEBE usar.
--
-- 4 capas convergentes:
--   1. VIEW consolidada (esta migration) — single source-of-truth de
--      labor allocation por (period, member, client).
--   2. v2 attribution VIEW (next migration) — usa la consolidada en lugar
--      de la cla cruda.
--   3. Helper TS canónico (next file) — readLaborAllocationConsolidated()
--      con types fuertes + tests.
--   4. Reliability signal (next file) — detecta drift si alguna vez la
--      cla cruda emite > 1 row por (period, member, client) con
--      fte_contribution distintos (= caso patológico que requiere fix
--      del motor upstream).

-- ── VIEW canónica consolidada ───────────────────────────────────────────
CREATE OR REPLACE VIEW greenhouse_serving.client_labor_cost_allocation_consolidated AS
SELECT
  cla.period_year,
  cla.period_month,
  cla.member_id,
  MAX(cla.member_name) AS member_name,
  cla.client_id,
  MAX(cla.client_name) AS client_name,
  MAX(cla.payroll_currency) AS payroll_currency,
  -- fte_contribution normalizado: dado que los rows duplicados representan
  -- el MISMO assignment subyacente con distintos payroll_entries, todos
  -- tienen el mismo fte. MAX es seguro y determinista.
  MAX(cla.fte_contribution) AS fte_contribution,
  MAX(cla.total_fte) AS total_fte,
  -- allocated_labor_clp: SUMA de todos los entries (suma dineraria es
  -- legítima — son distintos payroll entries del mismo período).
  SUM(cla.allocated_labor_clp) AS allocated_labor_clp,
  SUM(cla.allocated_net_clp) AS allocated_net_clp,
  SUM(cla.allocated_labor_source) AS allocated_labor_source,
  SUM(cla.allocated_net_source) AS allocated_net_source,
  SUM(cla.gross_total_source) AS gross_total_source,
  SUM(cla.net_total_source) AS net_total_source,
  COUNT(*) AS source_payroll_entry_count,
  MAX(cla.exchange_rate_to_clp) AS exchange_rate_to_clp
FROM greenhouse_serving.client_labor_cost_allocation cla
WHERE cla.period_year IS NOT NULL
  AND cla.period_month IS NOT NULL
  AND cla.member_id IS NOT NULL
  AND cla.client_id IS NOT NULL
GROUP BY cla.period_year, cla.period_month, cla.member_id, cla.client_id;

COMMENT ON VIEW greenhouse_serving.client_labor_cost_allocation_consolidated IS
  'TASK-709: VIEW canónica que consolida client_labor_cost_allocation a 1 row por (period, member, client). SUM de allocated_*, MAX de fte_contribution (= mismo assignment subyacente). USAR ESTA en lugar de la cla cruda cuando se requiere "1 row por miembro × cliente × período" (typical use case de cost-attribution comercial). source_payroll_entry_count expone cuántos payroll entries underlying se consolidaron.';

COMMENT ON COLUMN greenhouse_serving.client_labor_cost_allocation_consolidated.source_payroll_entry_count IS
  'Cuántos payroll_entries underlying se consolidaron en este row. Si > 1, significa que el período tuvo múltiples nóminas posteadas (e.g. nómina mes anterior + mes corriente). Útil para drift detection.';

-- ── Reliability query helper ────────────────────────────────────────────
-- VIEW para detectar over-saturation: SUM(fte_contribution) > 1.0 por
-- (member, period). Imposible en realidad — un miembro no puede dedicar
-- más del 100% de su tiempo a clientes en un mismo período. Si esta VIEW
-- retorna rows, hay un bug en client_team_assignments (overlapping
-- assignments para el mismo miembro/período sin date-range partitioning).
CREATE OR REPLACE VIEW greenhouse_serving.labor_allocation_saturation_drift AS
SELECT
  c.period_year,
  c.period_month,
  c.member_id,
  c.member_name,
  SUM(c.fte_contribution) AS sum_fte,
  COUNT(*) AS client_count,
  ARRAY_AGG(c.client_id ORDER BY c.client_id) AS client_ids,
  ARRAY_AGG(c.client_name ORDER BY c.client_id) AS client_names
FROM greenhouse_serving.client_labor_cost_allocation_consolidated c
WHERE c.fte_contribution IS NOT NULL
GROUP BY c.period_year, c.period_month, c.member_id, c.member_name
HAVING SUM(c.fte_contribution) > 1.0;

COMMENT ON VIEW greenhouse_serving.labor_allocation_saturation_drift IS
  'TASK-709 Reliability signal: detecta over-saturation (member dedica > 100% a clientes en un período). Imposible en realidad. Si retorna rows, indica bug en client_team_assignments — overlapping assignments mal partitionados. Reliability dashboard alerta cuando esta VIEW tiene > 0 rows.';

-- Down Migration

DROP VIEW IF EXISTS greenhouse_serving.labor_allocation_saturation_drift;
DROP VIEW IF EXISTS greenhouse_serving.client_labor_cost_allocation_consolidated;
