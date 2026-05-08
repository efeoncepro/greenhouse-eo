-- Up Migration

-- TASK-611 — Capabilities Registry (defense-in-depth Layer 1)
-- ============================================================================
-- Crea la tabla canónica `greenhouse_core.capabilities_registry` que documenta
-- el universo de capabilities del catálogo TS (`src/config/entitlements-catalog.ts`).
--
-- Decisión V1.1 (Delta 2026-05-08 del spec V1):
--   - NO se agrega FK desde `entitlement_grants` porque la tabla no existe
--     (el runtime de Greenhouse compone capabilities como pure-function;
--     persistencia de grants planeada por TASK-404 quedó bloqueada por
--     pre-up-marker bug en migración 20260417044741101).
--   - Cuando emerja persistencia de grants (cleanup TASK-404 o nueva task),
--     agregar FK contra `capabilities_registry.capability_key` en migration
--     separada.
--   - El guardia primario hoy es la TS↔DB parity test runtime
--     (`src/lib/capabilities-registry/parity.test.ts`).
--
-- Anti pre-up-marker bug guardrail: bloque DO ... RAISE EXCEPTION verifica que
-- la tabla quedó realmente creada en el information_schema antes de finalizar
-- la migration. Patrón anti TASK-768 Slice 1 silent failure.

CREATE TABLE IF NOT EXISTS greenhouse_core.capabilities_registry (
  capability_key   text PRIMARY KEY,
  module           text NOT NULL,
  allowed_actions  text[] NOT NULL,
  allowed_scopes   text[] NOT NULL,
  description      text NOT NULL,
  introduced_at    timestamptz NOT NULL DEFAULT now(),
  deprecated_at    timestamptz,
  CONSTRAINT capabilities_registry_actions_nonempty
    CHECK (cardinality(allowed_actions) > 0),
  CONSTRAINT capabilities_registry_scopes_nonempty
    CHECK (cardinality(allowed_scopes) > 0),
  CONSTRAINT capabilities_registry_module_nonempty
    CHECK (length(btrim(module)) > 0)
);

CREATE INDEX IF NOT EXISTS capabilities_registry_module_idx
  ON greenhouse_core.capabilities_registry (module)
  WHERE deprecated_at IS NULL;

COMMENT ON TABLE greenhouse_core.capabilities_registry IS
  'TASK-611 — Registry declarativo del universo de capabilities. Source of truth runtime sigue siendo src/config/entitlements-catalog.ts; esta tabla refleja el catálogo para futuro FK enforcement cuando emerja persistencia de grants. Parity test runtime es el guardia primario hoy.';

COMMENT ON COLUMN greenhouse_core.capabilities_registry.capability_key IS
  'snake_case key tal como aparece en EntitlementCapabilityKey TS. PK estable.';

COMMENT ON COLUMN greenhouse_core.capabilities_registry.allowed_actions IS
  'Array de acciones canónicas permitidas para esta capability (read, create, update, delete, approve, etc). Tomado del catalog TS.';

COMMENT ON COLUMN greenhouse_core.capabilities_registry.allowed_scopes IS
  'Scopes válidos para esta capability (own, team, space, organization, tenant, all). El defaultScope del catalog TS se incluye aquí + los scopes adicionales que el catalog permite.';

COMMENT ON COLUMN greenhouse_core.capabilities_registry.deprecated_at IS
  'Cuando se setea, la capability deja de exportarse al catálogo TS pero queda registrada para auditoría histórica de grants/overrides previos. Parity test ignora rows con deprecated_at IS NOT NULL.';

-- Seed inicial: las 11 capabilities organization.* introducidas por TASK-611.
-- Nota: el seed completo del resto del catalog (las otras ~110 capabilities) se
-- aplica via parity test runtime con UPSERT idempotente — NO acoplamos esta
-- migration a cambios futuros del catalog. La tabla nace con las nuevas + se
-- pobla con el resto en el primer arranque que ejecute el parity test.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES
  ('organization.identity', 'organization', ARRAY['read'], ARRAY['own','tenant','all'],
   'Datos básicos de la organización: nombre, dominio, logo, status comercial.'),
  ('organization.identity_sensitive', 'organization', ARRAY['read','update'], ARRAY['tenant','all'],
   'PII + identidad legal de la organización: RUT, dirección legal, beneficiarios.'),
  ('organization.spaces', 'organization', ARRAY['read'], ARRAY['tenant','all'],
   'Spaces operativos asociados a la organización (Notion).'),
  ('organization.team', 'organization', ARRAY['read'], ARRAY['own','tenant','all'],
   'Roster + assignments. Scope `own` cubre Globe-self del client portal.'),
  ('organization.economics', 'organization', ARRAY['read'], ARRAY['tenant','all'],
   'KPIs económicos del cliente: ICO, contribution margin, P&L summary.'),
  ('organization.delivery', 'organization', ARRAY['read'], ARRAY['own','tenant','all'],
   'Tasks, projects, sprints, ICO score.'),
  ('organization.finance', 'organization', ARRAY['read'], ARRAY['tenant','all'],
   'Income, expenses, payment_orders, FX, account_balances scope-organization.'),
  ('organization.finance_sensitive', 'organization', ARRAY['read','export','approve'], ARRAY['tenant','all'],
   'Documentos fiscales, evidence, OTB declarations, approval workflows finance.'),
  ('organization.crm', 'organization', ARRAY['read'], ARRAY['tenant','all'],
   'Contacts, deals, HubSpot pipeline relacionado a la organización.'),
  ('organization.services', 'organization', ARRAY['read','update'], ARRAY['tenant','all'],
   'Service engagements + catálogo p_services para esta organización.'),
  ('organization.staff_aug', 'organization', ARRAY['read','update'], ARRAY['tenant','all'],
   'Staff augmentation arrangements para esta organización.')
ON CONFLICT (capability_key) DO NOTHING;

-- Anti pre-up-marker bug verify: confirmar que la tabla y las 11 rows existen.
DO $$
DECLARE
  expected_table_exists boolean;
  organization_capability_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'capabilities_registry'
  ) INTO expected_table_exists;

  IF NOT expected_table_exists THEN
    RAISE EXCEPTION 'TASK-611 anti pre-up-marker check: greenhouse_core.capabilities_registry was NOT created. Migration markers may be inverted.';
  END IF;

  SELECT COUNT(*) FROM greenhouse_core.capabilities_registry WHERE module = 'organization'
    INTO organization_capability_count;

  IF organization_capability_count <> 11 THEN
    RAISE EXCEPTION 'TASK-611 verify: expected 11 organization.* capabilities seeded, got %.', organization_capability_count;
  END IF;
END
$$;

-- Grants: greenhouse_runtime tiene SELECT (read-only — registry es declarativo).
-- Mutaciones via parity test corren con greenhouse_ops (canonical owner).
GRANT SELECT ON greenhouse_core.capabilities_registry TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.capabilities_registry;
