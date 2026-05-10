-- Up Migration

-- TASK-848 Slice 1 — Production Release Control Plane Foundation
-- ============================================================================
-- Crea las tablas canónicas para que la promoción `develop` → `main` sea un
-- flujo deterministico, auditable y reversible:
--
--   1. greenhouse_sync.release_manifests       — fila por intento de release
--                                                 (manifest persistido, source
--                                                 of truth de qué se desplegó).
--   2. greenhouse_sync.release_state_transitions — append-only audit del state
--                                                   machine (mirror del patrón
--                                                   payment_order_state_transitions
--                                                   de TASK-765).
--   3. Seed de 3 capabilities granulares least-privilege en
--      `greenhouse_core.capabilities_registry`.
--
-- Decisión arquitectónica (arch-architect 2026-05-10):
--   - Schema: `greenhouse_sync` (NO `greenhouse_ops` — eso es ROLE, no schema).
--     greenhouse_sync ya hosta platform infrastructure: outbox_events,
--     source_sync_runs, smoke_lane_runs, webhook_endpoints. Release manifests
--     son conceptualmente "platform sync runs ricos".
--   - Owner ROLE: greenhouse_ops (canonical owner pattern).
--   - PK release_id format: `<targetSha[:12]>-<UUIDv4>`. UUIDv4 + index por
--     started_at DESC = ordering equivalente a UUIDv7 sin nueva dep npm.
--   - operator_member_id NULLABLE: permite trigger system (e.g. health-check
--     rollback automático). Audit trail vive en triggered_by TEXT NOT NULL
--     (free-form: 'member:user-jreyes', 'system:health-check', 'cli:gh-foo').
--
-- Patrones canónicos reusados (evitando primitives nuevos):
--   - State machine + CHECK + audit trio: TASK-765 payment_orders.
--   - Anti-UPDATE/DELETE trigger: TASK-765 payment_order_state_transitions.
--   - Partial UNIQUE INDEX para single-active row: TASK-803 engagement_phases.
--   - Anti pre-up-marker bug DO block: TASK-768/838/611 lineage.

-- ─── 1. release_manifests ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_sync.release_manifests (
  release_id                       text PRIMARY KEY,
  target_sha                       text NOT NULL,
  source_branch                    text NOT NULL DEFAULT 'develop',
  target_branch                    text NOT NULL DEFAULT 'main',
  state                            text NOT NULL DEFAULT 'preflight',
  attempt_n                        integer NOT NULL DEFAULT 1,
  triggered_by                     text NOT NULL,
  operator_member_id               text REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  started_at                       timestamptz NOT NULL DEFAULT now(),
  completed_at                     timestamptz,
  vercel_deployment_url            text,
  previous_vercel_deployment_url   text,
  worker_revisions                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_worker_revisions        jsonb NOT NULL DEFAULT '{}'::jsonb,
  workflow_runs                    jsonb NOT NULL DEFAULT '[]'::jsonb,
  preflight_result                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  post_release_health              jsonb NOT NULL DEFAULT '{}'::jsonb,
  rollback_plan                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT release_manifests_state_canonical_check
    CHECK (state IN (
      'preflight',
      'ready',
      'deploying',
      'verifying',
      'released',
      'degraded',
      'rolled_back',
      'aborted'
    )),
  CONSTRAINT release_manifests_target_sha_format_check
    CHECK (length(target_sha) >= 7 AND target_sha ~ '^[0-9a-f]+$'),
  CONSTRAINT release_manifests_attempt_positive_check
    CHECK (attempt_n >= 1),
  CONSTRAINT release_manifests_triggered_by_nonempty_check
    CHECK (length(btrim(triggered_by)) > 0),
  CONSTRAINT release_manifests_workflow_runs_array_check
    CHECK (jsonb_typeof(workflow_runs) = 'array')
);

ALTER TABLE greenhouse_sync.release_manifests OWNER TO greenhouse_ops;

-- Index principal: ultimo release por branch.
CREATE INDEX IF NOT EXISTS release_manifests_target_branch_started_idx
  ON greenhouse_sync.release_manifests (target_branch, started_at DESC);

-- Index secundario: dashboard reliability filtra por estado.
CREATE INDEX IF NOT EXISTS release_manifests_state_started_idx
  ON greenhouse_sync.release_manifests (state, started_at DESC);

-- Partial UNIQUE: solo 1 release activo por branch al mismo tiempo.
-- Defense in depth sobre el advisory lock que el orquestador usa.
CREATE UNIQUE INDEX IF NOT EXISTS release_manifests_one_active_per_branch_idx
  ON greenhouse_sync.release_manifests (target_branch)
  WHERE state IN ('preflight', 'ready', 'deploying', 'verifying');

COMMENT ON TABLE greenhouse_sync.release_manifests IS
  'TASK-848 — Manifest persistido de cada intento de release production. Append-only sobre identidad (release_id, target_sha, started_at, operator_member_id, triggered_by); state + completed_at + payload_jsonb mutables hasta entrar en estado terminal. Source of truth para forensic + rollback.';

COMMENT ON COLUMN greenhouse_sync.release_manifests.release_id IS
  'PK formato `<targetSha[:12]>-<UUIDv4>`. UUIDv4 + index por started_at DESC = ordering equivalente a UUIDv7 sin dep npm nueva.';

COMMENT ON COLUMN greenhouse_sync.release_manifests.triggered_by IS
  'Free-form audit del actor que disparó el release. Convención: `member:<member_id>` cuando humano, `system:<actor>` cuando automatizado (e.g. system:health-check-rollback), `cli:<gh-login>` cuando CLI local.';

COMMENT ON COLUMN greenhouse_sync.release_manifests.operator_member_id IS
  'FK a greenhouse_core.members cuando triggered_by es un member humano. NULL aceptado para release automatizado por system actor (rollback automático post-health-check).';

COMMENT ON COLUMN greenhouse_sync.release_manifests.state IS
  'Estado actual del release. Enum cerrado vía CHECK constraint. Transiciones permitidas: preflight→ready→deploying→verifying→released|degraded|aborted; released→rolled_back; degraded→rolled_back|released. Mirror canónico del enum TS ReleaseState.';

-- ─── 2. release_manifests anti-destructive trigger ──────────────────────────

CREATE OR REPLACE FUNCTION greenhouse_sync.assert_release_manifest_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.release_id IS DISTINCT FROM OLD.release_id THEN
      RAISE EXCEPTION 'release_manifests.release_id es immutable post-INSERT'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.target_sha IS DISTINCT FROM OLD.target_sha THEN
      RAISE EXCEPTION 'release_manifests.target_sha es immutable post-INSERT'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.started_at IS DISTINCT FROM OLD.started_at THEN
      RAISE EXCEPTION 'release_manifests.started_at es immutable post-INSERT'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.triggered_by IS DISTINCT FROM OLD.triggered_by THEN
      RAISE EXCEPTION 'release_manifests.triggered_by es immutable post-INSERT'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.operator_member_id IS DISTINCT FROM OLD.operator_member_id
       AND OLD.operator_member_id IS NOT NULL THEN
      RAISE EXCEPTION 'release_manifests.operator_member_id solo puede setearse de NULL→value, no reescribirse'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.attempt_n IS DISTINCT FROM OLD.attempt_n THEN
      RAISE EXCEPTION 'release_manifests.attempt_n es immutable post-INSERT'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS release_manifests_immutable_fields_trigger
  ON greenhouse_sync.release_manifests;

CREATE TRIGGER release_manifests_immutable_fields_trigger
  BEFORE UPDATE ON greenhouse_sync.release_manifests
  FOR EACH ROW EXECUTE FUNCTION greenhouse_sync.assert_release_manifest_immutable_fields();

-- Anti DELETE. Para "olvidar" un release usar state='aborted' con audit.
CREATE OR REPLACE FUNCTION greenhouse_sync.assert_release_manifest_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'release_manifests es append-only. No se permite DELETE; usa state=''aborted'' con audit.'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS release_manifests_no_delete_trigger
  ON greenhouse_sync.release_manifests;

CREATE TRIGGER release_manifests_no_delete_trigger
  BEFORE DELETE ON greenhouse_sync.release_manifests
  FOR EACH ROW EXECUTE FUNCTION greenhouse_sync.assert_release_manifest_no_delete();

-- ─── 3. release_state_transitions ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_sync.release_state_transitions (
  transition_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id         text NOT NULL REFERENCES greenhouse_sync.release_manifests(release_id) ON DELETE CASCADE,
  from_state         text NOT NULL,
  to_state           text NOT NULL,
  actor_kind         text NOT NULL,
  actor_label        text NOT NULL,
  actor_member_id    text REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  reason             text NOT NULL,
  metadata_json      jsonb NOT NULL DEFAULT '{}'::jsonb,
  transitioned_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT release_state_transitions_actor_kind_check
    CHECK (actor_kind IN ('member', 'system', 'cli')),
  CONSTRAINT release_state_transitions_actor_label_nonempty_check
    CHECK (length(btrim(actor_label)) > 0),
  CONSTRAINT release_state_transitions_reason_min_length_check
    CHECK (length(btrim(reason)) >= 5),
  CONSTRAINT release_state_transitions_states_canonical_check
    CHECK (
      from_state IN (
        'preflight','ready','deploying','verifying',
        'released','degraded','rolled_back','aborted',
        'unknown_legacy'
      )
      AND to_state IN (
        'preflight','ready','deploying','verifying',
        'released','degraded','rolled_back','aborted'
      )
    )
);

ALTER TABLE greenhouse_sync.release_state_transitions OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS release_state_transitions_release_idx
  ON greenhouse_sync.release_state_transitions (release_id, transitioned_at);

CREATE INDEX IF NOT EXISTS release_state_transitions_to_state_idx
  ON greenhouse_sync.release_state_transitions (to_state, transitioned_at)
  WHERE to_state IN ('released','degraded','rolled_back','aborted');

COMMENT ON TABLE greenhouse_sync.release_state_transitions IS
  'TASK-848 — Audit append-only de cada transición de state machine en release_manifests. Mirror canónico del patrón payment_order_state_transitions (TASK-765 Slice 6). Append-only enforced via trigger. Para correcciones, INSERT nueva fila con metadata_json.correction_of=<transition_id>.';

COMMENT ON COLUMN greenhouse_sync.release_state_transitions.actor_kind IS
  'Categoria del actor: member (humano via UI/workflow_dispatch), system (automatización interna), cli (script local invocado por humano via gh CLI).';

COMMENT ON COLUMN greenhouse_sync.release_state_transitions.reason IS
  'Razón legible de la transición. >= 5 chars enforced. Para break-glass bypass_preflight requerirá reason >=20 chars adicional vía application guard.';

-- Append-only enforcement.
CREATE OR REPLACE FUNCTION greenhouse_sync.assert_release_transitions_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'release_state_transitions es append-only. Para correcciones inserta nueva fila con metadata_json.correction_of=<transition_id>'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS release_state_transitions_no_update_trigger
  ON greenhouse_sync.release_state_transitions;
CREATE TRIGGER release_state_transitions_no_update_trigger
  BEFORE UPDATE ON greenhouse_sync.release_state_transitions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_sync.assert_release_transitions_append_only();

DROP TRIGGER IF EXISTS release_state_transitions_no_delete_trigger
  ON greenhouse_sync.release_state_transitions;
CREATE TRIGGER release_state_transitions_no_delete_trigger
  BEFORE DELETE ON greenhouse_sync.release_state_transitions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_sync.assert_release_transitions_append_only();

-- ─── 4. GRANTs ──────────────────────────────────────────────────────────────

-- runtime puede leer + insertar manifests + hacer UPDATEs sobre columnas
-- mutables (state, completed_at, payloads). El trigger anti-immutable bloquea
-- escritura sobre identidad. NO DELETE.
GRANT SELECT, INSERT, UPDATE ON greenhouse_sync.release_manifests TO greenhouse_runtime;

-- runtime puede leer + insertar transiciones. NO UPDATE / NO DELETE
-- (bloqueados por trigger).
GRANT SELECT, INSERT ON greenhouse_sync.release_state_transitions TO greenhouse_runtime;

-- ─── 5. Capabilities seed ───────────────────────────────────────────────────

-- Las 3 capabilities granulares least-privilege para el control plane.
-- Patrón consistente con TASK-742 (auth resilience), TASK-765 (payment orders),
-- TASK-784 (legal profile). Verbo explícito sobre reuso de manage/launch.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES
  ('platform.release.execute', 'platform', ARRAY['execute'], ARRAY['all'],
   'Disparar workflow production-release contra develop→main. Reservado para EFEONCE_ADMIN + DEVOPS_OPERATOR. Granular sobre platform.admin para enforce least-privilege.'),
  ('platform.release.rollback', 'platform', ARRAY['rollback'], ARRAY['all'],
   'Disparar production-rollback (Vercel alias swap + Cloud Run traffic split). Reservado para EFEONCE_ADMIN. Acción reversible pero alto blast radius.'),
  ('platform.release.bypass_preflight', 'platform', ARRAY['bypass_preflight'], ARRAY['all'],
   'Break-glass para skip preflight checks en incident mode. EFEONCE_ADMIN solo. Requiere reason >= 20 chars + audit row obligatoria.')
ON CONFLICT (capability_key) DO UPDATE SET
  module          = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes  = EXCLUDED.allowed_scopes,
  description     = EXCLUDED.description,
  deprecated_at   = NULL;

-- ─── 6. Anti pre-up-marker bug verification ─────────────────────────────────
--
-- TASK-768/838/611 enseñaron que node-pg-migrate puede silently skip una
-- migration si los markers Up/Down están invertidos. Este bloque verifica que
-- los objetos críticos se crearon antes de finalizar la transaction.

DO $$
DECLARE
  table_exists boolean;
  capability_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_sync' AND table_name = 'release_manifests'
  ) INTO table_exists;
  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-848 anti pre-up-marker check: greenhouse_sync.release_manifests was NOT created. Migration markers may be inverted.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_sync' AND table_name = 'release_state_transitions'
  ) INTO table_exists;
  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-848 anti pre-up-marker check: greenhouse_sync.release_state_transitions was NOT created.';
  END IF;

  SELECT count(*) INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'platform.release.execute',
    'platform.release.rollback',
    'platform.release.bypass_preflight'
  ) AND deprecated_at IS NULL;

  IF capability_count <> 3 THEN
    RAISE EXCEPTION 'TASK-848 anti pre-up-marker check: expected 3 platform.release.* capabilities, found %', capability_count;
  END IF;
END
$$;


-- Down Migration

-- Capabilities seed cleanup primero.
DELETE FROM greenhouse_core.capabilities_registry
WHERE capability_key IN (
  'platform.release.execute',
  'platform.release.rollback',
  'platform.release.bypass_preflight'
);

-- release_state_transitions
DROP TRIGGER IF EXISTS release_state_transitions_no_delete_trigger
  ON greenhouse_sync.release_state_transitions;
DROP TRIGGER IF EXISTS release_state_transitions_no_update_trigger
  ON greenhouse_sync.release_state_transitions;
DROP FUNCTION IF EXISTS greenhouse_sync.assert_release_transitions_append_only();
DROP TABLE IF EXISTS greenhouse_sync.release_state_transitions;

-- release_manifests
DROP TRIGGER IF EXISTS release_manifests_no_delete_trigger
  ON greenhouse_sync.release_manifests;
DROP TRIGGER IF EXISTS release_manifests_immutable_fields_trigger
  ON greenhouse_sync.release_manifests;
DROP FUNCTION IF EXISTS greenhouse_sync.assert_release_manifest_no_delete();
DROP FUNCTION IF EXISTS greenhouse_sync.assert_release_manifest_immutable_fields();
DROP TABLE IF EXISTS greenhouse_sync.release_manifests;
