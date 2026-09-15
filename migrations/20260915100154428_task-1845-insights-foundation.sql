-- Up Migration

-- ═════════════════════════════════════════════════════════════════════════════
-- TASK-1845 — Efeonce Insights: foundation del dominio (EPIC-045, Slice 1).
--
-- Schema NUEVO `greenhouse_insights` (decisión del operador 2026-09-15: prefijo
-- `greenhouse_` como los otros 18 schemas; la marca vive en el código legible
-- `EO-INS-…`, en el módulo `insights_v1` y en la skill `efeonce-insights`).
--
-- Cuatro aggregates de la arquitectura §4 (EFEONCE_INSIGHTS_ARCHITECTURE_V1):
--   InsightReport     → insight_reports          (ID opaco + código legible único)
--   InsightEdition    → insight_editions         (versión inmutable una vez emitida)
--   EvidenceSnapshot  → insight_evidence_snapshots (inmutable al sellar)
--   EditorialPlan     → insight_editorial_plans  (congela datos y texto final)
-- + historial append-only `insight_edition_transitions`, matriz de estados como
--   DATO (paridad con `edition-state-machine.ts`) y clases de retención.
--
-- Invariantes que defiende la DB (última defensa, no la única):
--   · ownership por organización en TODAS las tablas, con integridad edition↔report;
--   · código legible sin `MAX+1` ni truncado (patrón ISSUE-172: UN `nextval`,
--     `lpad(n, GREATEST(6, length(n)))`);
--   · una edición emitida no muta (sólo puede retirarse); corregir = versión nueva;
--   · snapshot sellado y plan congelado inmutables; nada se borra (tombstone por
--     retirada, no DELETE);
--   · idempotencia por (organization_id, idempotency_key); el conflicto de payload
--     distinto lo detecta el command comparando `request_hash`.
--
-- RenderRun/Output (TASK-1846), ShareGrant/DeliveryIntent/Schedule (TASK-1848)
-- NO nacen aquí: sus puertos quedan declarados en el dominio, sin tabla.
-- ═════════════════════════════════════════════════════════════════════════════

SET search_path TO public, greenhouse_core, greenhouse_insights;

CREATE SCHEMA IF NOT EXISTS greenhouse_insights;
ALTER SCHEMA greenhouse_insights OWNER TO greenhouse_ops;
GRANT USAGE ON SCHEMA greenhouse_insights TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_insights TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_insights TO greenhouse_migrator_user;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0 · Código legible del reporte: `EO-INS-000001` (crece pasado 999 999; nunca
--     recorta). Un solo nextval por llamada.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS greenhouse_insights.insight_report_code_seq AS bigint START WITH 1;
ALTER SEQUENCE greenhouse_insights.insight_report_code_seq OWNER TO greenhouse_ops;

CREATE OR REPLACE FUNCTION greenhouse_insights.next_insight_report_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $fn$
DECLARE
  n bigint := nextval('greenhouse_insights.insight_report_code_seq');
BEGIN
  RETURN 'EO-INS-' || lpad(n::text, GREATEST(6, length(n::text)), '0');
END
$fn$;

ALTER FUNCTION greenhouse_insights.next_insight_report_code() OWNER TO greenhouse_ops;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · Clases de retención (arquitectura §10: "definir duración efectiva antes de
--     la primera emisión externa"). Dato versionado por effective_from; el
--     cleanup verificable es un follow-up operativo, la clase se declara al nacer.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_retention_classes (
  retention_class text PRIMARY KEY,
  retention_days integer NOT NULL CHECK (retention_days > 0),
  applies_to text NOT NULL,
  notes text NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE greenhouse_insights.insight_retention_classes OWNER TO greenhouse_ops;

INSERT INTO greenhouse_insights.insight_retention_classes (retention_class, retention_days, applies_to, notes) VALUES
  ('edition_request', 1095, 'insight_editions.request_json', 'Encargo de la edición: 3 años desde la creación; conserva reproducibilidad del período/comparación.'),
  ('evidence_snapshot', 1095, 'insight_evidence_snapshots', 'Hechos congelados con evidencia autorizada: 3 años desde el sellado; nunca PII operativa.'),
  ('editorial_plan', 1095, 'insight_editorial_plans', 'Plan y narrativa final congelados: 3 años desde el congelado; sin chain-of-thought.')
ON CONFLICT (retention_class) DO UPDATE SET
  retention_days = EXCLUDED.retention_days,
  applies_to = EXCLUDED.applies_to,
  notes = EXCLUDED.notes;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · InsightReport
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_reports (
  report_id text PRIMARY KEY DEFAULT ('insr-' || gen_random_uuid()::text),
  report_code text NOT NULL UNIQUE DEFAULT greenhouse_insights.next_insight_report_code(),
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  purpose text NOT NULL CHECK (length(btrim(purpose)) >= 3),
  title text NOT NULL CHECK (length(btrim(title)) >= 3),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by_actor_kind text NOT NULL CHECK (created_by_actor_kind IN ('member', 'client_user', 'system', 'cli')),
  created_by_user_id text,
  created_by_member_id text REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT insight_reports_code_shape CHECK (report_code ~ '^EO-INS-[0-9]{6,}$'),
  CONSTRAINT insight_reports_person_actor_has_user
    CHECK (created_by_actor_kind NOT IN ('member', 'client_user') OR created_by_user_id IS NOT NULL)
);

ALTER TABLE greenhouse_insights.insight_reports OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_insight_reports_org_created
  ON greenhouse_insights.insight_reports (organization_id, created_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insight_report_immutable_fields()
RETURNS trigger AS $$
BEGIN
  IF NEW.report_id IS DISTINCT FROM OLD.report_id
     OR NEW.report_code IS DISTINCT FROM OLD.report_code
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.created_by_actor_kind IS DISTINCT FROM OLD.created_by_actor_kind
     OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id THEN
    RAISE EXCEPTION 'insight_reports: report_id, report_code, organization_id y created_* son inmutables'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insight_reports_immutable_fields ON greenhouse_insights.insight_reports;
CREATE TRIGGER trg_insight_reports_immutable_fields
  BEFORE UPDATE ON greenhouse_insights.insight_reports
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insight_report_immutable_fields();

CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insights_no_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% es append-only: un registro Insights no se borra (archived/withdrawn son estados, no DELETE)', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insight_reports_no_delete ON greenhouse_insights.insight_reports;
CREATE TRIGGER trg_insight_reports_no_delete
  BEFORE DELETE ON greenhouse_insights.insight_reports
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Matriz de estados de la edición como DATO (paridad con
--     `src/lib/efeonce-insights/edition-state-machine.ts`; el test de paridad
--     parsea este bloque).
--
--   draft → collecting → composing → validating → ready_for_review → issued
--   failed: recuperable POR FASE (collecting/composing/validating)
--   withdrawn: retirada de acceso (gate humano) desde draft/ready_for_review/issued
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_edition_state_matrix (
  from_state text NOT NULL,
  to_state text NOT NULL,
  requires_human_gate boolean NOT NULL DEFAULT false,
  PRIMARY KEY (from_state, to_state)
);

ALTER TABLE greenhouse_insights.insight_edition_state_matrix OWNER TO greenhouse_ops;

INSERT INTO greenhouse_insights.insight_edition_state_matrix (from_state, to_state, requires_human_gate) VALUES
  ('draft', 'collecting', false),
  ('draft', 'withdrawn', true),
  ('collecting', 'composing', false),
  ('collecting', 'failed', false),
  ('composing', 'validating', false),
  ('composing', 'failed', false),
  ('validating', 'ready_for_review', false),
  ('validating', 'failed', false),
  ('ready_for_review', 'issued', true),
  ('ready_for_review', 'withdrawn', true),
  ('failed', 'collecting', false),
  ('failed', 'composing', false),
  ('failed', 'validating', false),
  ('issued', 'withdrawn', true)
ON CONFLICT (from_state, to_state) DO UPDATE SET requires_human_gate = EXCLUDED.requires_human_gate;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · InsightEdition
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_editions (
  edition_id text PRIMARY KEY DEFAULT ('insed-' || gen_random_uuid()::text),
  report_id text NOT NULL REFERENCES greenhouse_insights.insight_reports(report_id),
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  version integer NOT NULL CHECK (version >= 1),
  audience text NOT NULL CHECK (audience IN ('client', 'internal')),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN (
    'draft', 'collecting', 'composing', 'validating', 'ready_for_review', 'issued', 'failed', 'withdrawn'
  )),
  failed_phase text CHECK (failed_phase IN ('collecting', 'composing', 'validating')),
  -- InsightRequestV1 canónico (sin actor: el actor viene de la autoridad autenticada)
  request_json jsonb NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text CHECK (idempotency_key IS NULL OR length(idempotency_key) BETWEEN 8 AND 200),
  modules text[] NOT NULL CHECK (cardinality(modules) >= 1),
  outputs text[] NOT NULL CHECK (cardinality(outputs) >= 1),
  -- Ventana [start, end) resuelta en zona IANA y almacenada en UTC
  period_time_zone text NOT NULL CHECK (length(period_time_zone) >= 3),
  period_start_utc timestamptz NOT NULL,
  period_end_utc timestamptz NOT NULL,
  supersedes_edition_id text REFERENCES greenhouse_insights.insight_editions(edition_id),
  review_owner_user_id text,
  issued_at timestamptz,
  issued_by_user_id text,
  issued_hash text CHECK (issued_hash IS NULL OR issued_hash ~ '^[0-9a-f]{64}$'),
  withdrawn_at timestamptz,
  created_by_actor_kind text NOT NULL CHECK (created_by_actor_kind IN ('member', 'client_user', 'system', 'cli')),
  created_by_user_id text,
  created_by_member_id text REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT insight_editions_version_unique UNIQUE (report_id, version),
  CONSTRAINT insight_editions_period_ordered CHECK (period_end_utc > period_start_utc),
  CONSTRAINT insight_editions_failed_phase_pairing CHECK ((state = 'failed') = (failed_phase IS NOT NULL)),
  CONSTRAINT insight_editions_issued_fields_pair
    CHECK ((issued_at IS NULL) = (issued_by_user_id IS NULL) AND (issued_at IS NULL) = (issued_hash IS NULL)),
  CONSTRAINT insight_editions_issued_state_has_fields CHECK (state <> 'issued' OR issued_at IS NOT NULL),
  CONSTRAINT insight_editions_withdrawn_pairing CHECK ((state = 'withdrawn') = (withdrawn_at IS NOT NULL)),
  CONSTRAINT insight_editions_person_actor_has_user
    CHECK (created_by_actor_kind NOT IN ('member', 'client_user') OR created_by_user_id IS NOT NULL)
);

ALTER TABLE greenhouse_insights.insight_editions OWNER TO greenhouse_ops;

-- Idempotencia: misma key en la misma org → misma edición (el command compara
-- request_hash para devolver conflicto si el payload difiere).
CREATE UNIQUE INDEX IF NOT EXISTS insight_editions_idempotency_unique
  ON greenhouse_insights.insight_editions (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_insight_editions_org_state
  ON greenhouse_insights.insight_editions (organization_id, state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_insight_editions_report_version
  ON greenhouse_insights.insight_editions (report_id, version DESC);

-- Integridad de organización: la edición hereda la org de su reporte, siempre.
CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insight_edition_org_matches_report()
RETURNS trigger AS $$
DECLARE
  report_org text;
BEGIN
  SELECT r.organization_id INTO report_org FROM greenhouse_insights.insight_reports r WHERE r.report_id = NEW.report_id;
  IF report_org IS NULL THEN
    RAISE EXCEPTION 'insight_editions: report_id % no existe', NEW.report_id USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF report_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'insight_editions: organization_id (%) no coincide con la del reporte (%)', NEW.organization_id, report_org
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.supersedes_edition_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM greenhouse_insights.insight_editions s
    WHERE s.edition_id = NEW.supersedes_edition_id AND s.report_id = NEW.report_id
  ) THEN
    RAISE EXCEPTION 'insight_editions: supersedes_edition_id debe pertenecer al mismo reporte' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insight_editions_org_matches_report ON greenhouse_insights.insight_editions;
CREATE TRIGGER trg_insight_editions_org_matches_report
  BEFORE INSERT ON greenhouse_insights.insight_editions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insight_edition_org_matches_report();

-- Identidad y encargo inmutables; una edición EMITIDA sólo puede retirarse.
CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insight_edition_immutable_fields()
RETURNS trigger AS $$
BEGIN
  IF NEW.edition_id IS DISTINCT FROM OLD.edition_id
     OR NEW.report_id IS DISTINCT FROM OLD.report_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.audience IS DISTINCT FROM OLD.audience
     OR NEW.request_json IS DISTINCT FROM OLD.request_json
     OR NEW.request_hash IS DISTINCT FROM OLD.request_hash
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.modules IS DISTINCT FROM OLD.modules
     OR NEW.outputs IS DISTINCT FROM OLD.outputs
     OR NEW.period_time_zone IS DISTINCT FROM OLD.period_time_zone
     OR NEW.period_start_utc IS DISTINCT FROM OLD.period_start_utc
     OR NEW.period_end_utc IS DISTINCT FROM OLD.period_end_utc
     OR NEW.supersedes_edition_id IS DISTINCT FROM OLD.supersedes_edition_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.created_by_actor_kind IS DISTINCT FROM OLD.created_by_actor_kind
     OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id THEN
    RAISE EXCEPTION 'insight_editions: identidad, encargo, ventana y created_* son inmutables (corregir = versión nueva)'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Emisión: los campos issued_* se escriben UNA vez y no se tocan después.
  IF OLD.issued_at IS NOT NULL AND (
       NEW.issued_at IS DISTINCT FROM OLD.issued_at
    OR NEW.issued_by_user_id IS DISTINCT FROM OLD.issued_by_user_id
    OR NEW.issued_hash IS DISTINCT FROM OLD.issued_hash
  ) THEN
    RAISE EXCEPTION 'insight_editions: issued_* es inmutable una vez emitida' USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.state = 'issued' THEN
    IF NEW.state NOT IN ('issued', 'withdrawn') THEN
      RAISE EXCEPTION 'insight_editions: una edición emitida no vuelve al ciclo (corregir = versión nueva)'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.review_owner_user_id IS DISTINCT FROM OLD.review_owner_user_id
       OR NEW.failed_phase IS DISTINCT FROM OLD.failed_phase THEN
      RAISE EXCEPTION 'insight_editions: una edición emitida no muta (sólo puede retirarse)' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF OLD.state = 'withdrawn' AND (NEW.state IS DISTINCT FROM 'withdrawn' OR NEW.withdrawn_at IS DISTINCT FROM OLD.withdrawn_at) THEN
    RAISE EXCEPTION 'insight_editions: withdrawn es terminal' USING ERRCODE = 'check_violation';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insight_editions_immutable_fields ON greenhouse_insights.insight_editions;
CREATE TRIGGER trg_insight_editions_immutable_fields
  BEFORE UPDATE ON greenhouse_insights.insight_editions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insight_edition_immutable_fields();

CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insight_edition_state_transition()
RETURNS trigger AS $$
BEGIN
  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NOT EXISTS (
      SELECT 1 FROM greenhouse_insights.insight_edition_state_matrix m
      WHERE m.from_state = OLD.state AND m.to_state = NEW.state
    ) THEN
      RAISE EXCEPTION 'Transición de estado ilegal en insight_editions: % → % (edition_id=%)', OLD.state, NEW.state, OLD.edition_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insight_editions_state_transition ON greenhouse_insights.insight_editions;
CREATE TRIGGER trg_insight_editions_state_transition
  BEFORE UPDATE OF state ON greenhouse_insights.insight_editions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insight_edition_state_transition();

DROP TRIGGER IF EXISTS trg_insight_editions_no_delete ON greenhouse_insights.insight_editions;
CREATE TRIGGER trg_insight_editions_no_delete
  BEFORE DELETE ON greenhouse_insights.insight_editions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · Historial append-only de transiciones
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_edition_transitions (
  transition_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id text NOT NULL REFERENCES greenhouse_insights.insight_editions(edition_id),
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  from_state text NOT NULL CHECK (from_state IN (
    'draft', 'collecting', 'composing', 'validating', 'ready_for_review', 'issued', 'failed', 'withdrawn'
  )),
  to_state text NOT NULL CHECK (to_state IN (
    'draft', 'collecting', 'composing', 'validating', 'ready_for_review', 'issued', 'failed', 'withdrawn'
  )),
  requires_human_gate boolean NOT NULL DEFAULT false,
  actor_kind text NOT NULL CHECK (actor_kind IN ('member', 'client_user', 'system', 'cli')),
  actor_user_id text,
  actor_member_id text REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) >= 5),
  -- Redactado: ids, fase, hashes; nunca evidencia, prompts ni bearer.
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT insight_transitions_human_gate_needs_person
    CHECK (requires_human_gate = false OR (actor_kind IN ('member', 'client_user') AND actor_user_id IS NOT NULL))
);

ALTER TABLE greenhouse_insights.insight_edition_transitions OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_insight_edition_transitions_edition
  ON greenhouse_insights.insight_edition_transitions (edition_id, created_at);

CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insights_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% es append-only: para corregir, inserta una fila nueva con metadata_json.correction_of', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insight_edition_transitions_no_update ON greenhouse_insights.insight_edition_transitions;
CREATE TRIGGER trg_insight_edition_transitions_no_update
  BEFORE UPDATE ON greenhouse_insights.insight_edition_transitions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_append_only();

DROP TRIGGER IF EXISTS trg_insight_edition_transitions_no_delete ON greenhouse_insights.insight_edition_transitions;
CREATE TRIGGER trg_insight_edition_transitions_no_delete
  BEFORE DELETE ON greenhouse_insights.insight_edition_transitions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_append_only();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6 · EvidenceSnapshot: un snapshot por edición; inmutable al sellar.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_evidence_snapshots (
  snapshot_id text PRIMARY KEY DEFAULT ('inssn-' || gen_random_uuid()::text),
  edition_id text NOT NULL UNIQUE REFERENCES greenhouse_insights.insight_editions(edition_id),
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  retention_class text NOT NULL DEFAULT 'evidence_snapshot'
    REFERENCES greenhouse_insights.insight_retention_classes(retention_class),
  -- Ledger de hechos (EvidenceFactV1[]): metricId, valor/null, unidad, num/den,
  -- población, fuente, método/version, cobertura, freshness, evidenceRef.
  facts_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Fuentes por módulo: reader, asOf, cobertura, método, ventana servida.
  sources_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Ausencias/incomparabilidades declaradas (unsupported_window, method_mismatch,
  -- insufficient_data, suppressed…): "ausente" es distinto de cero.
  rejections_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  as_of_min timestamptz,
  as_of_max timestamptz,
  snapshot_hash text CHECK (snapshot_hash IS NULL OR snapshot_hash ~ '^[0-9a-f]{64}$'),
  sealed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT insight_snapshots_sealed_pair CHECK ((sealed_at IS NULL) = (snapshot_hash IS NULL)),
  CONSTRAINT insight_snapshots_json_shapes CHECK (
    jsonb_typeof(facts_json) = 'array' AND jsonb_typeof(sources_json) = 'array' AND jsonb_typeof(rejections_json) = 'array'
  )
);

ALTER TABLE greenhouse_insights.insight_evidence_snapshots OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_insight_snapshots_org
  ON greenhouse_insights.insight_evidence_snapshots (organization_id, sealed_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insight_snapshot_immutable_when_sealed()
RETURNS trigger AS $$
BEGIN
  IF NEW.snapshot_id IS DISTINCT FROM OLD.snapshot_id
     OR NEW.edition_id IS DISTINCT FROM OLD.edition_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'insight_evidence_snapshots: identidad inmutable' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.sealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'insight_evidence_snapshots: el snapshot % está sellado y es inmutable (corregir = edición nueva)', OLD.snapshot_id
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insight_snapshots_immutable_when_sealed ON greenhouse_insights.insight_evidence_snapshots;
CREATE TRIGGER trg_insight_snapshots_immutable_when_sealed
  BEFORE UPDATE ON greenhouse_insights.insight_evidence_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insight_snapshot_immutable_when_sealed();

DROP TRIGGER IF EXISTS trg_insight_snapshots_no_delete ON greenhouse_insights.insight_evidence_snapshots;
CREATE TRIGGER trg_insight_snapshots_no_delete
  BEFORE DELETE ON greenhouse_insights.insight_evidence_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7 · EditorialPlan: un plan por edición sobre un snapshot sellado; congelado
--     con hash; si hubo IA, versiona modelo/prompt (nunca chain-of-thought).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_editorial_plans (
  plan_id text PRIMARY KEY DEFAULT ('inspl-' || gen_random_uuid()::text),
  edition_id text NOT NULL UNIQUE REFERENCES greenhouse_insights.insight_editions(edition_id),
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  snapshot_id text NOT NULL REFERENCES greenhouse_insights.insight_evidence_snapshots(snapshot_id),
  retention_class text NOT NULL DEFAULT 'editorial_plan'
    REFERENCES greenhouse_insights.insight_retention_classes(retention_class),
  -- EditorialPlanV1: secciones, claims (cada cifra referencia un factId), ChartSpecV1[],
  -- acciones, límites/metodología, referencias.
  plan_json jsonb NOT NULL,
  plan_hash text CHECK (plan_hash IS NULL OR plan_hash ~ '^[0-9a-f]{64}$'),
  authoring_mode text NOT NULL CHECK (authoring_mode IN ('deterministic', 'ai_bounded')),
  model_id text,
  prompt_version text,
  model_usage_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  frozen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT insight_plans_frozen_pair CHECK ((frozen_at IS NULL) = (plan_hash IS NULL)),
  CONSTRAINT insight_plans_ai_provenance CHECK (
    (authoring_mode = 'deterministic' AND model_id IS NULL AND prompt_version IS NULL)
    OR (authoring_mode = 'ai_bounded' AND model_id IS NOT NULL AND prompt_version IS NOT NULL)
  ),
  CONSTRAINT insight_plans_json_shape CHECK (jsonb_typeof(plan_json) = 'object')
);

ALTER TABLE greenhouse_insights.insight_editorial_plans OWNER TO greenhouse_ops;

CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insight_plan_immutable_when_frozen()
RETURNS trigger AS $$
BEGIN
  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id
     OR NEW.edition_id IS DISTINCT FROM OLD.edition_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.snapshot_id IS DISTINCT FROM OLD.snapshot_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'insight_editorial_plans: identidad inmutable' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.frozen_at IS NOT NULL THEN
    RAISE EXCEPTION 'insight_editorial_plans: el plan % está congelado y es inmutable (replay usa narrativa congelada)', OLD.plan_id
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insight_plans_immutable_when_frozen ON greenhouse_insights.insight_editorial_plans;
CREATE TRIGGER trg_insight_plans_immutable_when_frozen
  BEFORE UPDATE ON greenhouse_insights.insight_editorial_plans
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insight_plan_immutable_when_frozen();

DROP TRIGGER IF EXISTS trg_insight_plans_no_delete ON greenhouse_insights.insight_editorial_plans;
CREATE TRIGGER trg_insight_plans_no_delete
  BEFORE DELETE ON greenhouse_insights.insight_editorial_plans
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

-- Integridad snapshot↔edición↔org del plan (mismo edition_id y misma org).
CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insight_plan_snapshot_pairing()
RETURNS trigger AS $$
DECLARE
  snap record;
BEGIN
  SELECT s.edition_id, s.organization_id, s.sealed_at INTO snap
  FROM greenhouse_insights.insight_evidence_snapshots s WHERE s.snapshot_id = NEW.snapshot_id;
  IF snap IS NULL THEN
    RAISE EXCEPTION 'insight_editorial_plans: snapshot % no existe', NEW.snapshot_id USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF snap.edition_id IS DISTINCT FROM NEW.edition_id OR snap.organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'insight_editorial_plans: el snapshot pertenece a otra edición/organización' USING ERRCODE = 'check_violation';
  END IF;
  IF snap.sealed_at IS NULL THEN
    RAISE EXCEPTION 'insight_editorial_plans: el plan sólo nace sobre un snapshot SELLADO' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insight_plans_snapshot_pairing ON greenhouse_insights.insight_editorial_plans;
CREATE TRIGGER trg_insight_plans_snapshot_pairing
  BEFORE INSERT ON greenhouse_insights.insight_editorial_plans
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insight_plan_snapshot_pairing();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8 · Entitlement per-ORG: módulo `insights_v1` (la puerta facturable). Sin
--     assignment activo ninguna org opera Insights: default OFF hasta habilitación
--     humana vía enableClientPortalModule (P01 de EPIC-046 decide la matriz).
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO greenhouse_client_portal.modules
  (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind)
VALUES
  ('insights_v1',
   'Efeonce Insights (informes por edición: deck, A4 y web)',
   'Insights',
   'cross',
   'addon',
   ARRAY[]::text[],
   ARRAY[]::text[],
   ARRAY['insights.editions'],
   'addon_fixed')
ON CONFLICT (module_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9 · Capabilities registry (catalog TS + grants en runtime.ts viajan en el
--     MISMO commit — patrón TASK-1277/1392)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('insights.report.read', 'insights', ARRAY['read'], ARRAY['own', 'organization', 'tenant'],
   'Leer catálogo elegible, reportes, ediciones (estado redactado por audiencia), snapshots y planes de la organización autorizada', NOW(), NULL),
  ('insights.edition.create', 'insights', ARRAY['create'], ARRAY['own', 'organization', 'tenant'],
   'Validar un encargo y crear/revisar ediciones (createEdition/revise); no emite', NOW(), NULL),
  ('insights.edition.review', 'insights', ARRAY['update'], ARRAY['organization', 'tenant'],
   'Preparar/revisar ediciones y recuperar fases fallidas (interno)', NOW(), NULL),
  ('insights.edition.issue', 'insights', ARRAY['approve'], ARRAY['own', 'organization', 'tenant'],
   'Cruzar el gate humano de emisión y retirar ediciones (issue/withdraw); autoridad distinta de crear', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10 · Anti pre-up-marker guard + prueba del generador de código (ISSUE-172)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  missing text := '';
  probe_long text := 'EO-INS-' || lpad('1234567', GREATEST(6, length('1234567')), '0');
  probe_short text := 'EO-INS-' || lpad('7', GREATEST(6, length('7')), '0');
BEGIN
  IF to_regnamespace('greenhouse_insights') IS NULL THEN missing := missing || ' schema'; END IF;
  IF to_regclass('greenhouse_insights.insight_retention_classes') IS NULL THEN missing := missing || ' insight_retention_classes'; END IF;
  IF to_regclass('greenhouse_insights.insight_reports') IS NULL THEN missing := missing || ' insight_reports'; END IF;
  IF to_regclass('greenhouse_insights.insight_edition_state_matrix') IS NULL THEN missing := missing || ' insight_edition_state_matrix'; END IF;
  IF to_regclass('greenhouse_insights.insight_editions') IS NULL THEN missing := missing || ' insight_editions'; END IF;
  IF to_regclass('greenhouse_insights.insight_edition_transitions') IS NULL THEN missing := missing || ' insight_edition_transitions'; END IF;
  IF to_regclass('greenhouse_insights.insight_evidence_snapshots') IS NULL THEN missing := missing || ' insight_evidence_snapshots'; END IF;
  IF to_regclass('greenhouse_insights.insight_editorial_plans') IS NULL THEN missing := missing || ' insight_editorial_plans'; END IF;
  IF to_regprocedure('greenhouse_insights.next_insight_report_code()') IS NULL THEN missing := missing || ' next_insight_report_code'; END IF;

  IF (SELECT count(*) FROM greenhouse_insights.insight_edition_state_matrix) <> 14 THEN
    missing := missing || ' insight_edition_state_matrix_seed(!=14)';
  END IF;
  IF (SELECT count(*) FROM greenhouse_insights.insight_retention_classes) <> 3 THEN
    missing := missing || ' insight_retention_classes_seed(!=3)';
  END IF;
  IF (SELECT count(*) FROM greenhouse_core.capabilities_registry
      WHERE capability_key IN ('insights.report.read', 'insights.edition.create', 'insights.edition.review', 'insights.edition.issue')
        AND deprecated_at IS NULL) <> 4 THEN
    missing := missing || ' capabilities_seed(!=4)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM greenhouse_client_portal.modules WHERE module_key = 'insights_v1') THEN
    missing := missing || ' module_insights_v1';
  END IF;

  IF probe_long <> 'EO-INS-1234567' THEN missing := missing || ' code_generator_truncates'; END IF;
  IF probe_short <> 'EO-INS-000007' THEN missing := missing || ' code_generator_padding'; END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'TASK-1845 anti pre-up-marker check: faltan objetos:%', missing;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11 · Grants (least privilege: historial sin UPDATE/DELETE; matriz y retención
--      sólo lectura; snapshots/planes reciben UPDATE sólo para sellar/congelar y
--      los triggers cierran el resto)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SEQUENCE greenhouse_insights.insight_report_code_seq TO greenhouse_runtime, greenhouse_app, greenhouse_migrator_user;
GRANT EXECUTE ON FUNCTION greenhouse_insights.next_insight_report_code() TO greenhouse_runtime, greenhouse_app, greenhouse_migrator_user;
GRANT SELECT ON greenhouse_insights.insight_retention_classes TO greenhouse_runtime;
GRANT SELECT ON greenhouse_insights.insight_edition_state_matrix TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_reports TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_editions TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_insights.insight_edition_transitions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_evidence_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_editorial_plans TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_insights TO greenhouse_migrator_user;

-- Down Migration

-- SOLO undo. Con ediciones emitidas, forward-fix: este down existe para
-- entornos sin datos reales (la evidencia emitida no se reescribe).
DROP TRIGGER IF EXISTS trg_insight_plans_snapshot_pairing ON greenhouse_insights.insight_editorial_plans;
DROP TRIGGER IF EXISTS trg_insight_plans_no_delete ON greenhouse_insights.insight_editorial_plans;
DROP TRIGGER IF EXISTS trg_insight_plans_immutable_when_frozen ON greenhouse_insights.insight_editorial_plans;
DROP TRIGGER IF EXISTS trg_insight_snapshots_no_delete ON greenhouse_insights.insight_evidence_snapshots;
DROP TRIGGER IF EXISTS trg_insight_snapshots_immutable_when_sealed ON greenhouse_insights.insight_evidence_snapshots;
DROP TRIGGER IF EXISTS trg_insight_edition_transitions_no_delete ON greenhouse_insights.insight_edition_transitions;
DROP TRIGGER IF EXISTS trg_insight_edition_transitions_no_update ON greenhouse_insights.insight_edition_transitions;
DROP TRIGGER IF EXISTS trg_insight_editions_no_delete ON greenhouse_insights.insight_editions;
DROP TRIGGER IF EXISTS trg_insight_editions_state_transition ON greenhouse_insights.insight_editions;
DROP TRIGGER IF EXISTS trg_insight_editions_immutable_fields ON greenhouse_insights.insight_editions;
DROP TRIGGER IF EXISTS trg_insight_editions_org_matches_report ON greenhouse_insights.insight_editions;
DROP TRIGGER IF EXISTS trg_insight_reports_no_delete ON greenhouse_insights.insight_reports;
DROP TRIGGER IF EXISTS trg_insight_reports_immutable_fields ON greenhouse_insights.insight_reports;
DROP TABLE IF EXISTS greenhouse_insights.insight_editorial_plans;
DROP TABLE IF EXISTS greenhouse_insights.insight_evidence_snapshots;
DROP TABLE IF EXISTS greenhouse_insights.insight_edition_transitions;
DROP TABLE IF EXISTS greenhouse_insights.insight_editions;
DROP TABLE IF EXISTS greenhouse_insights.insight_edition_state_matrix;
DROP TABLE IF EXISTS greenhouse_insights.insight_reports;
DROP TABLE IF EXISTS greenhouse_insights.insight_retention_classes;
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insight_plan_snapshot_pairing();
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insight_plan_immutable_when_frozen();
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insight_snapshot_immutable_when_sealed();
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insights_append_only();
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insight_edition_state_transition();
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insight_edition_immutable_fields();
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insight_edition_org_matches_report();
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insights_no_delete();
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insight_report_immutable_fields();
DROP FUNCTION IF EXISTS greenhouse_insights.next_insight_report_code();
DROP SEQUENCE IF EXISTS greenhouse_insights.insight_report_code_seq;
DROP SCHEMA IF EXISTS greenhouse_insights;
UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW()
  WHERE capability_key IN ('insights.report.read', 'insights.edition.create', 'insights.edition.review', 'insights.edition.issue');
DELETE FROM greenhouse_client_portal.modules WHERE module_key = 'insights_v1';
