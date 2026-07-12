-- Up Migration

-- ═════════════════════════════════════════════════════════════════════════════
-- TASK-1392 — Tender Proposal Studio F0: aggregate `Proposal` + state machine
-- persistida + assets/evidencia/requisitos gobernados.
--
-- Los 5 vocabularios llegan CONGELADOS (Slice 0, deltas del 2026-07-12):
--   tablas `proposal_*` · origin ∈ {public_tender, private_rfp, direct_sales} ·
--   terminales `won`/`lost` · `owner_org_id` NOT NULL en el aggregate y TODOS
--   sus hijos · `deadline` de primera clase (su ausencia es EXPLÍCITA, nunca un
--   NULL silencioso).
--
-- Patrón append-only: espejo de TASK-848 (release control plane) — triggers de
-- campos inmutables + anti-DELETE en el aggregate, y anti-UPDATE/DELETE en el
-- historial y en la evidencia.
--
-- Paridad TS↔DB: la matriz de transiciones vive en
-- `src/lib/commercial/tenders/tender-state-machine.ts` (fuente de aplicación) y
-- acá como `proposal_state_matrix` (defensa en DB). El test de paridad
-- (`proposal-state-matrix-parity.test.ts`) compara AMBAS contra este archivo.
-- ═════════════════════════════════════════════════════════════════════════════

SET search_path TO public, greenhouse_core, greenhouse_commercial;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · El aggregate: greenhouse_commercial.proposals
--
-- El comprador es una organización del 360 (`client_organization_id`): un
-- Proposal referencia, no recrea identidad. `owner_org_id` es la org DUEÑA de
-- la propuesta (Efeonce hoy; un cliente as-a-service mañana): "global" jamás
-- es la ausencia de dato. `quote_id` es LA COSTURA con el cotizador: el
-- Proposal no calcula el precio ni lo transcribe — lo REFERENCIA.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_commercial.proposals (
  proposal_id text PRIMARY KEY DEFAULT ('prop-' || gen_random_uuid()::text),
  owner_org_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  client_organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  origin text NOT NULL CHECK (origin IN ('public_tender', 'private_rfp', 'direct_sales')),
  -- Referencia al radar público (RESEARCH-007). SIN FK a propósito: el radar es
  -- doc-only hoy (cero tablas public_tender*, verificado contra PG real
  -- 2026-07-12); la FK se agrega cuando exista. La UNIQUE parcial de abajo es
  -- la idempotencia de la promoción: una oportunidad no genera dos Proposal.
  public_opportunity_id text,
  quote_id text REFERENCES greenhouse_commercial.quotations(quotation_id),
  -- Al entrar a `packaging` la Quote se CONGELA: el artefacto renderiza el
  -- snapshot, nunca la tabla viva (un PDF cuyo precio cambia después MIENTE).
  quote_snapshot_json jsonb,
  quote_snapshot_taken_at timestamptz,
  title text NOT NULL CHECK (length(btrim(title)) >= 3),
  platform text,
  state text NOT NULL DEFAULT 'intake' CHECK (state IN (
    'intake', 'analyzing', 'analyzed', 'fit_review', 'declined',
    'producing', 'base_ready', 'packaging', 'ready_to_submit',
    'submitted', 'won', 'lost'
  )),
  -- El dato más load-bearing del dominio: si se pasa, se pierde el proceso sin
  -- recuperación. Su AUSENCIA es un estado explícito (`none_declared`), nunca
  -- un NULL silencioso. TASK-1391 deriva de acá la prioridad de cola.
  deadline timestamptz,
  deadline_confidence text NOT NULL DEFAULT 'none_declared'
    CHECK (deadline_confidence IN ('confirmed', 'ambiguous', 'none_declared')),
  deadline_assumption text,
  currency text,
  hubspot_deal_id text,
  hubspot_company_id text,
  created_by_member_id text REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- deadline explícito: hay fecha ⟺ hay confianza declarada sobre esa fecha.
  CONSTRAINT proposals_deadline_explicit
    CHECK ((deadline IS NULL) = (deadline_confidence = 'none_declared')),
  -- Un supuesto de deadline sólo existe cuando la fecha es ambigua.
  CONSTRAINT proposals_deadline_assumption_only_ambiguous
    CHECK (deadline_assumption IS NULL OR deadline_confidence = 'ambiguous'),
  -- La promoción pública lleva SIEMPRE su oportunidad; y una oportunidad sólo
  -- tiene sentido en origin=public_tender.
  CONSTRAINT proposals_public_origin_pairing
    CHECK ((origin = 'public_tender') = (public_opportunity_id IS NOT NULL)),
  -- "NUNCA un GO sin margen": la mitad DB del gate — ningún estado post-GO sin
  -- Quote vinculada (el margen real lo evalúa el command contra quotations).
  CONSTRAINT proposals_post_go_requires_quote
    CHECK (
      state IN ('intake', 'analyzing', 'analyzed', 'fit_review', 'declined')
      OR quote_id IS NOT NULL
    ),
  -- Desde `packaging` el snapshot congelado es obligatorio.
  CONSTRAINT proposals_packaging_requires_quote_snapshot
    CHECK (
      state IN ('intake', 'analyzing', 'analyzed', 'fit_review', 'declined', 'producing', 'base_ready')
      OR quote_snapshot_json IS NOT NULL
    ),
  CONSTRAINT proposals_quote_snapshot_pair
    CHECK ((quote_snapshot_json IS NULL) = (quote_snapshot_taken_at IS NULL))
);

ALTER TABLE greenhouse_commercial.proposals OWNER TO greenhouse_ops;

CREATE UNIQUE INDEX IF NOT EXISTS proposals_public_opportunity_unique
  ON greenhouse_commercial.proposals (public_opportunity_id)
  WHERE public_opportunity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_owner_org_state
  ON greenhouse_commercial.proposals (owner_org_id, state);

CREATE INDEX IF NOT EXISTS idx_proposals_client_org
  ON greenhouse_commercial.proposals (client_organization_id);

CREATE INDEX IF NOT EXISTS idx_proposals_deadline_active
  ON greenhouse_commercial.proposals (deadline)
  WHERE deadline IS NOT NULL AND state NOT IN ('declined', 'won', 'lost');

-- Identidad inmutable del aggregate (espejo TASK-848).
CREATE OR REPLACE FUNCTION greenhouse_commercial.assert_proposal_immutable_fields()
RETURNS trigger AS $$
BEGIN
  IF NEW.proposal_id IS DISTINCT FROM OLD.proposal_id THEN
    RAISE EXCEPTION 'proposals.proposal_id es inmutable' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.owner_org_id IS DISTINCT FROM OLD.owner_org_id THEN
    RAISE EXCEPTION 'proposals.owner_org_id es inmutable (una propuesta no cambia de dueño)' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.client_organization_id IS DISTINCT FROM OLD.client_organization_id THEN
    RAISE EXCEPTION 'proposals.client_organization_id es inmutable (el comprador no se reasigna)' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.origin IS DISTINCT FROM OLD.origin THEN
    RAISE EXCEPTION 'proposals.origin es inmutable' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.public_opportunity_id IS DISTINCT FROM OLD.public_opportunity_id THEN
    RAISE EXCEPTION 'proposals.public_opportunity_id es inmutable (la promoción no se re-apunta)' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.created_by_member_id IS DISTINCT FROM OLD.created_by_member_id THEN
    RAISE EXCEPTION 'proposals.created_* es inmutable' USING ERRCODE = 'check_violation';
  END IF;
  -- El snapshot congelado no se re-congela ni se borra una vez tomado.
  IF OLD.quote_snapshot_json IS NOT NULL AND NEW.quote_snapshot_json IS DISTINCT FROM OLD.quote_snapshot_json THEN
    RAISE EXCEPTION 'proposals.quote_snapshot_json es inmutable una vez congelado (el PDF no puede mentir sobre su precio)' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposals_immutable_fields ON greenhouse_commercial.proposals;
CREATE TRIGGER trg_proposals_immutable_fields
  BEFORE UPDATE ON greenhouse_commercial.proposals
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.assert_proposal_immutable_fields();

CREATE OR REPLACE FUNCTION greenhouse_commercial.assert_proposal_no_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_commercial.proposals es append-only: una propuesta no se borra (declined/lost son estados, no DELETE)' USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposals_no_delete ON greenhouse_commercial.proposals;
CREATE TRIGGER trg_proposals_no_delete
  BEFORE DELETE ON greenhouse_commercial.proposals
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.assert_proposal_no_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · La matriz de transiciones como DATO en DB (paridad con la TS state machine)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_commercial.proposal_state_matrix (
  from_state text NOT NULL,
  to_state text NOT NULL,
  requires_human_gate boolean NOT NULL DEFAULT false,
  PRIMARY KEY (from_state, to_state)
);

ALTER TABLE greenhouse_commercial.proposal_state_matrix OWNER TO greenhouse_ops;

-- ⚠️ PARIDAD: estas filas son el espejo EXACTO de TENDER_TRANSITION_MATRIX +
-- HUMAN_GATE_TRANSITIONS en tender-state-machine.ts. El test de paridad parsea
-- este bloque; si divergen, rompe el build.
INSERT INTO greenhouse_commercial.proposal_state_matrix (from_state, to_state, requires_human_gate) VALUES
  ('intake', 'analyzing', false),
  ('analyzing', 'analyzed', false),
  ('analyzed', 'fit_review', false),
  ('fit_review', 'producing', true),
  ('fit_review', 'declined', true),
  ('producing', 'base_ready', false),
  ('base_ready', 'packaging', false),
  ('packaging', 'ready_to_submit', false),
  ('ready_to_submit', 'submitted', true),
  ('submitted', 'won', false),
  ('submitted', 'lost', false)
ON CONFLICT (from_state, to_state) DO UPDATE SET requires_human_gate = EXCLUDED.requires_human_gate;

-- La DB defiende la matriz: un UPDATE de proposals.state fuera de la matriz
-- revienta (terminales no tienen filas de salida → no reabren).
CREATE OR REPLACE FUNCTION greenhouse_commercial.assert_proposal_state_transition()
RETURNS trigger AS $$
BEGIN
  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NOT EXISTS (
      SELECT 1 FROM greenhouse_commercial.proposal_state_matrix m
      WHERE m.from_state = OLD.state AND m.to_state = NEW.state
    ) THEN
      RAISE EXCEPTION 'Transición de estado ilegal en proposals: % → % (proposal_id=%)', OLD.state, NEW.state, OLD.proposal_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposals_state_transition ON greenhouse_commercial.proposals;
CREATE TRIGGER trg_proposals_state_transition
  BEFORE UPDATE OF state ON greenhouse_commercial.proposals
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.assert_proposal_state_transition();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Historial append-only: proposal_state_transitions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_commercial.proposal_state_transitions (
  transition_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id text NOT NULL REFERENCES greenhouse_commercial.proposals(proposal_id),
  owner_org_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  from_state text NOT NULL CHECK (from_state IN (
    'intake', 'analyzing', 'analyzed', 'fit_review', 'declined',
    'producing', 'base_ready', 'packaging', 'ready_to_submit',
    'submitted', 'won', 'lost'
  )),
  to_state text NOT NULL CHECK (to_state IN (
    'intake', 'analyzing', 'analyzed', 'fit_review', 'declined',
    'producing', 'base_ready', 'packaging', 'ready_to_submit',
    'submitted', 'won', 'lost'
  )),
  requires_human_gate boolean NOT NULL DEFAULT false,
  -- Un LLM/agente jamás ejecuta una transición en F0; un gate humano exige member.
  actor_kind text NOT NULL CHECK (actor_kind IN ('member', 'system', 'cli')),
  actor_member_id text REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) >= 5),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT proposal_transitions_human_gate_needs_member
    CHECK (requires_human_gate = false OR (actor_kind = 'member' AND actor_member_id IS NOT NULL))
);

ALTER TABLE greenhouse_commercial.proposal_state_transitions OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_proposal_transitions_proposal
  ON greenhouse_commercial.proposal_state_transitions (proposal_id, created_at);

CREATE OR REPLACE FUNCTION greenhouse_commercial.assert_proposal_transitions_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'proposal_state_transitions es append-only: para corregir, insertá una fila nueva con metadata_json.correction_of=<transition_id>' USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposal_transitions_no_update ON greenhouse_commercial.proposal_state_transitions;
CREATE TRIGGER trg_proposal_transitions_no_update
  BEFORE UPDATE ON greenhouse_commercial.proposal_state_transitions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.assert_proposal_transitions_append_only();

DROP TRIGGER IF EXISTS trg_proposal_transitions_no_delete ON greenhouse_commercial.proposal_state_transitions;
CREATE TRIGGER trg_proposal_transitions_no_delete
  BEFORE DELETE ON greenhouse_commercial.proposal_state_transitions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.assert_proposal_transitions_append_only();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · Deliverables semánticos: proposal_assets (el binario vive en el asset
--     store canónico; esta fila conserva kind/status/audience/version/lineage)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_commercial.proposal_assets (
  proposal_asset_id text PRIMARY KEY DEFAULT ('prasset-' || gen_random_uuid()::text),
  proposal_id text NOT NULL REFERENCES greenhouse_commercial.proposals(proposal_id),
  owner_org_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  asset_id text NOT NULL REFERENCES greenhouse_core.assets(asset_id),
  kind text NOT NULL CHECK (kind IN (
    'rfp_source', 'fillable_template', 'diagnostic', 'technical_offer',
    'economic_offer', 'admissibility_matrix', 'deck', 'other_doc'
  )),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'final')),
  -- La munición interna (diagnóstico/squad/matriz: loaded cost, piso de
  -- negociación) NUNCA cruza al comprador. El default seguro lo aplica el
  -- command por kind; acá el flag es explícito y NOT NULL.
  audience text NOT NULL CHECK (audience IN ('internal', 'client_facing')),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by_member_id text REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Reintentar un attach no duplica el vínculo.
  CONSTRAINT proposal_assets_unique_link UNIQUE (proposal_id, asset_id)
);

ALTER TABLE greenhouse_commercial.proposal_assets OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_proposal_assets_proposal
  ON greenhouse_commercial.proposal_assets (proposal_id, kind);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · Evidencia INMUTABLE: proposal_evidence
--     Cada claim client-facing referencia una de estas filas — nunca un string
--     libre. El agente puede proponer referencias; no puede fabricarlas.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_commercial.proposal_evidence (
  evidence_id text PRIMARY KEY DEFAULT ('prev-' || gen_random_uuid()::text),
  proposal_id text NOT NULL REFERENCES greenhouse_commercial.proposals(proposal_id),
  owner_org_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  -- La fuente es EXACTAMENTE una: un asset del store canónico O un snapshot
  -- externo congelado (p. ej. el resultado de un run del grader).
  source_asset_id text REFERENCES greenhouse_core.assets(asset_id),
  external_source_snapshot jsonb,
  locator text NOT NULL CHECK (length(btrim(locator)) >= 3),
  method text NOT NULL CHECK (length(btrim(method)) >= 3),
  as_of timestamptz NOT NULL,
  classification text NOT NULL CHECK (classification IN ('measured', 'illustrative', 'attested')),
  -- El audience de la evidencia NO es opcional ni derivable: se declara al
  -- registrarla. TASK-1391 falla cerrado si un artefacto client_facing
  -- referencia UNA SOLA evidencia internal.
  audience text NOT NULL CHECK (audience IN ('internal', 'client_facing')),
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  created_by_member_id text REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT proposal_evidence_exactly_one_source
    CHECK (num_nonnulls(source_asset_id, external_source_snapshot) = 1)
);

ALTER TABLE greenhouse_commercial.proposal_evidence OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_proposal_evidence_proposal
  ON greenhouse_commercial.proposal_evidence (proposal_id, audience);

CREATE OR REPLACE FUNCTION greenhouse_commercial.assert_proposal_evidence_immutable()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'proposal_evidence es INMUTABLE: la evidencia no se edita ni se borra — se registra una nueva fila que la supersede' USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposal_evidence_no_update ON greenhouse_commercial.proposal_evidence;
CREATE TRIGGER trg_proposal_evidence_no_update
  BEFORE UPDATE ON greenhouse_commercial.proposal_evidence
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.assert_proposal_evidence_immutable();

DROP TRIGGER IF EXISTS trg_proposal_evidence_no_delete ON greenhouse_commercial.proposal_evidence;
CREATE TRIGGER trg_proposal_evidence_no_delete
  BEFORE DELETE ON greenhouse_commercial.proposal_evidence
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.assert_proposal_evidence_immutable();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6 · Requisito-set MÍNIMO: proposal_requirements (nace acá — TASK-1391 deriva
--     sus gates de formato/peso/páginas de este set y falla cerrado cuando el
--     requisito es conocido. Poblado por command humano hasta que F1 parsee.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_commercial.proposal_requirements (
  requirement_id text PRIMARY KEY DEFAULT ('preq-' || gen_random_uuid()::text),
  proposal_id text NOT NULL REFERENCES greenhouse_commercial.proposals(proposal_id),
  owner_org_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  requirement_kind text NOT NULL CHECK (requirement_kind IN (
    'excluyente', 'puntua', 'economic_minimum', 'format', 'deadline', 'penalty', 'sla'
  )),
  -- Literal del RFP (evidencia, no paráfrasis).
  label text NOT NULL CHECK (length(btrim(label)) >= 3),
  -- Valor normalizado cuando aplica (ej. "20 MB", "40 páginas").
  value text,
  weight numeric CHECK (weight IS NULL OR requirement_kind = 'puntua'),
  source_locator text,
  source_asset_id text REFERENCES greenhouse_core.assets(asset_id),
  is_blocking boolean NOT NULL DEFAULT false,
  requires_human_attestation boolean NOT NULL DEFAULT false,
  attested_by_member_id text REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  attested_at timestamptz,
  created_by_member_id text REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT proposal_requirements_attestation_pair
    CHECK ((attested_by_member_id IS NULL) = (attested_at IS NULL))
);

ALTER TABLE greenhouse_commercial.proposal_requirements OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_proposal_requirements_proposal
  ON greenhouse_commercial.proposal_requirements (proposal_id, requirement_kind);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7 · Entitlement per-ORG: módulo `proposal_studio_v1` (LA PUERTA — un rol no
--     se factura; un módulo sí). Sin assignment activo, ninguna org opera la
--     capability: default OFF en todos los ambientes hasta habilitación humana
--     vía enableClientPortalModule.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO greenhouse_client_portal.modules
  (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind)
VALUES
  ('proposal_studio_v1',
   'Proposal Studio (licitaciones y propuestas)',
   'Propuestas',
   'cross',
   'addon',
   ARRAY[]::text[],
   ARRAY[]::text[],
   ARRAY['commercial.proposals'],
   'addon_fixed')
ON CONFLICT (module_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8 · Capabilities registry (patrón TASK-1277; catalog TS + grants en runtime.ts
--     viajan en el MISMO PR)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('commercial.proposal.read', 'commercial', ARRAY['read'], ARRAY['organization', 'tenant'],
   'Leer proposals, historial, assets, evidencia y requisitos (org-scoped; la puerta es el entitlement per-ORG proposal_studio_v1)', NOW(), NULL),
  ('commercial.proposal.manage', 'commercial', ARRAY['create', 'update', 'execute'], ARRAY['organization', 'tenant'],
   'Crear proposals, ingerir RFP, registrar evidencia/requisitos y ejecutar transiciones no-gated', NOW(), NULL),
  ('commercial.proposal.gate', 'commercial', ARRAY['approve'], ARRAY['organization', 'tenant'],
   'Cruzar los gates humanos del ciclo (fit_review → producing|declined, ready_to_submit → submitted)', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9 · Anti pre-up-marker guard: si algo de lo anterior NO quedó creado, esta
--     migración NO puede registrarse como aplicada.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  missing text := '';
BEGIN
  IF to_regclass('greenhouse_commercial.proposals') IS NULL THEN missing := missing || ' proposals'; END IF;
  IF to_regclass('greenhouse_commercial.proposal_state_transitions') IS NULL THEN missing := missing || ' proposal_state_transitions'; END IF;
  IF to_regclass('greenhouse_commercial.proposal_state_matrix') IS NULL THEN missing := missing || ' proposal_state_matrix'; END IF;
  IF to_regclass('greenhouse_commercial.proposal_assets') IS NULL THEN missing := missing || ' proposal_assets'; END IF;
  IF to_regclass('greenhouse_commercial.proposal_evidence') IS NULL THEN missing := missing || ' proposal_evidence'; END IF;
  IF to_regclass('greenhouse_commercial.proposal_requirements') IS NULL THEN missing := missing || ' proposal_requirements'; END IF;

  IF (SELECT count(*) FROM greenhouse_commercial.proposal_state_matrix) <> 11 THEN
    missing := missing || ' proposal_state_matrix_seed(!=11)';
  END IF;

  IF (SELECT count(*) FROM greenhouse_core.capabilities_registry
      WHERE capability_key IN ('commercial.proposal.read', 'commercial.proposal.manage', 'commercial.proposal.gate')
        AND deprecated_at IS NULL) <> 3 THEN
    missing := missing || ' capabilities_seed(!=3)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM greenhouse_client_portal.modules WHERE module_key = 'proposal_studio_v1') THEN
    missing := missing || ' module_proposal_studio_v1';
  END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'TASK-1392 anti pre-up-marker check: faltan objetos:%', missing;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10 · Grants (least privilege: el historial y la evidencia NO reciben
--      UPDATE/DELETE ni siquiera para runtime — los triggers son la última
--      defensa, no la única)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON greenhouse_commercial.proposals TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_commercial.proposal_state_transitions TO greenhouse_runtime;
GRANT SELECT ON greenhouse_commercial.proposal_state_matrix TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_commercial.proposal_assets TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_commercial.proposal_evidence TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_commercial.proposal_requirements TO greenhouse_runtime;

-- Down Migration

-- SOLO undo. El historial/evidencia se pierden con el DROP: este down existe
-- para entornos sin datos reales; con propuestas vivas, forward-fix.
DROP TRIGGER IF EXISTS trg_proposal_evidence_no_update ON greenhouse_commercial.proposal_evidence;
DROP TRIGGER IF EXISTS trg_proposal_evidence_no_delete ON greenhouse_commercial.proposal_evidence;
DROP TRIGGER IF EXISTS trg_proposal_transitions_no_update ON greenhouse_commercial.proposal_state_transitions;
DROP TRIGGER IF EXISTS trg_proposal_transitions_no_delete ON greenhouse_commercial.proposal_state_transitions;
DROP TRIGGER IF EXISTS trg_proposals_state_transition ON greenhouse_commercial.proposals;
DROP TRIGGER IF EXISTS trg_proposals_no_delete ON greenhouse_commercial.proposals;
DROP TRIGGER IF EXISTS trg_proposals_immutable_fields ON greenhouse_commercial.proposals;
DROP FUNCTION IF EXISTS greenhouse_commercial.assert_proposal_evidence_immutable();
DROP FUNCTION IF EXISTS greenhouse_commercial.assert_proposal_transitions_append_only();
DROP FUNCTION IF EXISTS greenhouse_commercial.assert_proposal_state_transition();
DROP FUNCTION IF EXISTS greenhouse_commercial.assert_proposal_no_delete();
DROP FUNCTION IF EXISTS greenhouse_commercial.assert_proposal_immutable_fields();
DROP TABLE IF EXISTS greenhouse_commercial.proposal_requirements;
DROP TABLE IF EXISTS greenhouse_commercial.proposal_evidence;
DROP TABLE IF EXISTS greenhouse_commercial.proposal_assets;
DROP TABLE IF EXISTS greenhouse_commercial.proposal_state_transitions;
DROP TABLE IF EXISTS greenhouse_commercial.proposal_state_matrix;
DROP TABLE IF EXISTS greenhouse_commercial.proposals;
UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW()
  WHERE capability_key IN ('commercial.proposal.read', 'commercial.proposal.manage', 'commercial.proposal.gate');
DELETE FROM greenhouse_client_portal.modules WHERE module_key = 'proposal_studio_v1';
