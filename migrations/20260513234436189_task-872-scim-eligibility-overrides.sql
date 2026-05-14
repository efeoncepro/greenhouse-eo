-- Up Migration

-- TASK-872 Slice 1 — SCIM Eligibility Overrides + Append-only Audit Log
--
-- Tabla canónica para overrides L4 (allow/deny) de la policy de elegibilidad
-- SCIM interna. Mirror pattern de greenhouse_core.user_entitlement_overrides
-- (TASK-404) + supersede pattern TASK-721 + append-only audit (TASK-765).
--
-- - Anti-bandaid: deny gana sobre allow (resolución determinística).
-- - Audit forense: companion table append-only via PG trigger.
-- - Soft-delete: NUNCA DELETE, siempre supersede via effective_to.

-- ── 1. Tabla principal ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.scim_eligibility_overrides (
  override_id              TEXT PRIMARY KEY,
  scim_tenant_mapping_id   TEXT NOT NULL
    REFERENCES greenhouse_core.scim_tenant_mappings(scim_tenant_mapping_id),
  match_type               TEXT NOT NULL CHECK (match_type IN ('email', 'azure_oid', 'upn')),
  match_value              TEXT NOT NULL,
  effect                   TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  reason                   TEXT NOT NULL CHECK (length(reason) >= 20),
  granted_by               TEXT NOT NULL,
  expires_at               TIMESTAMPTZ NULL,
  effective_to             TIMESTAMPTZ NULL,
  superseded_by            TEXT NULL REFERENCES greenhouse_core.scim_eligibility_overrides(override_id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE greenhouse_core.scim_eligibility_overrides IS
  'TASK-872 Slice 1 — Overrides L4 de la policy de elegibilidad SCIM. Soft-delete via effective_to. Companion audit table scim_eligibility_override_changes append-only.';

COMMENT ON COLUMN greenhouse_core.scim_eligibility_overrides.effect IS
  'allow = bypass L1/L2/L3 (force eligible). deny = block L1-default (force ineligible). Deny gana sobre allow en conflicto simultáneo (hard rule canónica).';

COMMENT ON COLUMN greenhouse_core.scim_eligibility_overrides.match_value IS
  'Valor canonicalizado: email lowercase; upn lowercase; azure_oid UUID lowercase. La función evaluadora normaliza input antes de comparar.';

COMMENT ON COLUMN greenhouse_core.scim_eligibility_overrides.granted_by IS
  'Actor user_id o identifier sistema (e.g. system-bootstrap). NO FK rígido — permite system actors como overrides automáticos.';

-- UNIQUE partial — solo 1 fila activa por (mapping, match_type, match_value, effect).
-- Permite (allow, deny) simultáneos para mismo target (la función resuelve deny-wins).
CREATE UNIQUE INDEX IF NOT EXISTS scim_eligibility_overrides_unique_active
  ON greenhouse_core.scim_eligibility_overrides
     (scim_tenant_mapping_id, match_type, match_value, effect)
  WHERE effective_to IS NULL;

-- INDEX hot-path: SELECT al evaluar elegibilidad SCIM CREATE — filtra por tenant + active
CREATE INDEX IF NOT EXISTS scim_eligibility_overrides_active_by_mapping
  ON greenhouse_core.scim_eligibility_overrides (scim_tenant_mapping_id)
  WHERE effective_to IS NULL;

-- ── 2. Companion audit log (append-only) ────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.scim_eligibility_override_changes (
  change_id        TEXT PRIMARY KEY,
  override_id      TEXT NOT NULL REFERENCES greenhouse_core.scim_eligibility_overrides(override_id),
  change_kind      TEXT NOT NULL CHECK (change_kind IN ('created', 'superseded', 'expired')),
  actor_user_id    TEXT NOT NULL,
  reason           TEXT NULL,
  metadata_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE greenhouse_core.scim_eligibility_override_changes IS
  'TASK-872 Slice 1 — Append-only audit log para scim_eligibility_overrides. UPDATE/DELETE rechazados por trigger PG.';

CREATE INDEX IF NOT EXISTS scim_eligibility_override_changes_by_override
  ON greenhouse_core.scim_eligibility_override_changes (override_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS scim_eligibility_override_changes_by_actor
  ON greenhouse_core.scim_eligibility_override_changes (actor_user_id, occurred_at DESC);

-- ── 3. Anti-mutate trigger (append-only enforcement) ────────────────

CREATE OR REPLACE FUNCTION greenhouse_core.assert_scim_eligibility_override_changes_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_core.scim_eligibility_override_changes is append-only (TG_OP=%). Use INSERT only.', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scim_eligibility_override_changes_no_update
  BEFORE UPDATE ON greenhouse_core.scim_eligibility_override_changes
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_scim_eligibility_override_changes_append_only();

CREATE TRIGGER scim_eligibility_override_changes_no_delete
  BEFORE DELETE ON greenhouse_core.scim_eligibility_override_changes
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_scim_eligibility_override_changes_append_only();

-- ── 4. Anti pre-up-marker check (CLAUDE.md migration markers regla) ─

DO $$
DECLARE
  overrides_exists boolean;
  changes_exists   boolean;
  trigger_count    int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='greenhouse_core' AND table_name='scim_eligibility_overrides'
  ) INTO overrides_exists;

  IF NOT overrides_exists THEN
    RAISE EXCEPTION 'TASK-872 anti pre-up-marker: scim_eligibility_overrides was NOT created. Migration markers may be inverted.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='greenhouse_core' AND table_name='scim_eligibility_override_changes'
  ) INTO changes_exists;

  IF NOT changes_exists THEN
    RAISE EXCEPTION 'TASK-872 anti pre-up-marker: scim_eligibility_override_changes was NOT created.';
  END IF;

  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'greenhouse_core.scim_eligibility_override_changes'::regclass
    AND tgname IN ('scim_eligibility_override_changes_no_update', 'scim_eligibility_override_changes_no_delete');

  IF trigger_count != 2 THEN
    RAISE EXCEPTION 'TASK-872 anti pre-up-marker: expected 2 anti-mutate triggers on scim_eligibility_override_changes, got %', trigger_count;
  END IF;
END
$$;

-- ── 5. Grants (canonical owner pattern, TASK-700/721/848) ───────────

ALTER TABLE greenhouse_core.scim_eligibility_overrides OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.scim_eligibility_override_changes OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_core.scim_eligibility_overrides TO greenhouse_runtime;
-- NO DELETE en overrides — soft-delete via effective_to UPDATE.

GRANT SELECT, INSERT ON greenhouse_core.scim_eligibility_override_changes TO greenhouse_runtime;
-- NO UPDATE/DELETE en changes — append-only enforced by trigger + grants.

-- Down Migration

DROP TRIGGER IF EXISTS scim_eligibility_override_changes_no_delete ON greenhouse_core.scim_eligibility_override_changes;
DROP TRIGGER IF EXISTS scim_eligibility_override_changes_no_update ON greenhouse_core.scim_eligibility_override_changes;
DROP FUNCTION IF EXISTS greenhouse_core.assert_scim_eligibility_override_changes_append_only();
DROP TABLE IF EXISTS greenhouse_core.scim_eligibility_override_changes;
DROP TABLE IF EXISTS greenhouse_core.scim_eligibility_overrides;
