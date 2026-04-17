-- Up Migration
-- TASK-348 — Quotation Governance Runtime: approvals, versions, templates, audit
-- Builds on TASK-345 (canonical quotation schema) + TASK-346 (pricing/health).
-- Adds 7 governance tables in greenhouse_commercial.

-- =============================================================================
-- 1. approval_policies — reglas que definen cuándo se requiere aprobación
-- =============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_commercial.approval_policies (
  policy_id            text PRIMARY KEY DEFAULT ('ap-' || gen_random_uuid()::text),
  policy_name          text NOT NULL,
  business_line_code   text,
  pricing_model        text
    CHECK (pricing_model IS NULL OR pricing_model = ANY (ARRAY['staff_aug'::text, 'retainer'::text, 'project'::text])),
  condition_type       text NOT NULL
    CHECK (condition_type = ANY (ARRAY[
      'margin_below_floor'::text,
      'margin_below_target'::text,
      'amount_above_threshold'::text,
      'discount_above_threshold'::text,
      'always'::text
    ])),
  threshold_value      numeric(14,2),
  required_role        text NOT NULL,
  step_order           integer NOT NULL DEFAULT 1,
  active               boolean NOT NULL DEFAULT TRUE,
  created_by           text NOT NULL DEFAULT 'task-348',
  created_at           timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_policies_bl
  ON greenhouse_commercial.approval_policies (business_line_code) WHERE active;

CREATE INDEX IF NOT EXISTS idx_approval_policies_pricing
  ON greenhouse_commercial.approval_policies (pricing_model) WHERE active;

COMMENT ON TABLE greenhouse_commercial.approval_policies IS
  'Reglas de approval por excepción. Se evalúan al transicionar draft → sent; si una condición se cumple, se crea un approval_step.';

-- =============================================================================
-- 2. approval_steps — instancias pendientes/decididas por cotización+versión
-- =============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_commercial.approval_steps (
  step_id          text PRIMARY KEY DEFAULT ('as-' || gen_random_uuid()::text),
  quotation_id     text NOT NULL
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE CASCADE,
  version_number   integer NOT NULL,
  policy_id        text
    REFERENCES greenhouse_commercial.approval_policies(policy_id) ON DELETE SET NULL,
  step_order       integer NOT NULL DEFAULT 1,
  required_role    text NOT NULL,
  assigned_to      text,
  condition_label  text NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'skipped'::text])),
  decided_by       text,
  decided_at       timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_steps_quotation
  ON greenhouse_commercial.approval_steps (quotation_id, version_number);

CREATE INDEX IF NOT EXISTS idx_approval_steps_pending
  ON greenhouse_commercial.approval_steps (status)
  WHERE status = 'pending';

COMMENT ON TABLE greenhouse_commercial.approval_steps IS
  'Aprobaciones asociadas a una versión específica de una cotización. Una quote en pending_approval tiene N steps; todos deben aprobarse para pasar a sent.';

-- =============================================================================
-- 3. quotation_audit_log — trazabilidad inmutable de cambios
-- =============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_commercial.quotation_audit_log (
  log_id           text PRIMARY KEY DEFAULT ('al-' || gen_random_uuid()::text),
  quotation_id     text NOT NULL
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE CASCADE,
  version_number   integer,
  action           text NOT NULL
    CHECK (action = ANY (ARRAY[
      'created'::text, 'updated'::text, 'status_changed'::text,
      'line_item_added'::text, 'line_item_updated'::text, 'line_item_removed'::text,
      'discount_changed'::text, 'terms_changed'::text,
      'version_created'::text, 'pdf_generated'::text, 'sent'::text,
      'approval_requested'::text, 'approval_decided'::text,
      'po_received'::text, 'hes_received'::text, 'invoice_triggered'::text,
      'renewal_generated'::text, 'expired'::text,
      'template_used'::text, 'template_saved'::text
    ])),
  actor_user_id    text NOT NULL,
  actor_name       text NOT NULL,
  details          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quotation_audit_log_details_shape_check CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_audit_quotation
  ON greenhouse_commercial.quotation_audit_log (quotation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON greenhouse_commercial.quotation_audit_log (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON greenhouse_commercial.quotation_audit_log (quotation_id, action);

COMMENT ON TABLE greenhouse_commercial.quotation_audit_log IS
  'Audit trail inmutable de cambios sobre cotizaciones. No debe ser actualizado ni borrado por la aplicación.';

-- =============================================================================
-- 4. terms_library — catálogo de términos y condiciones reutilizables
-- =============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_commercial.terms_library (
  term_id            text PRIMARY KEY DEFAULT ('tm-' || gen_random_uuid()::text),
  term_code          text NOT NULL UNIQUE,
  category           text NOT NULL
    CHECK (category = ANY (ARRAY['payment'::text, 'delivery'::text, 'legal'::text, 'staffing'::text, 'sla'::text, 'general'::text])),
  title              text NOT NULL,
  body_template      text NOT NULL,
  applies_to_model   text
    CHECK (applies_to_model IS NULL OR applies_to_model = ANY (ARRAY['staff_aug'::text, 'retainer'::text, 'project'::text])),
  default_for_bl     text[] NOT NULL DEFAULT ARRAY[]::text[],
  required           boolean NOT NULL DEFAULT FALSE,
  sort_order         integer NOT NULL DEFAULT 100,
  active             boolean NOT NULL DEFAULT TRUE,
  version            integer NOT NULL DEFAULT 1,
  created_by         text NOT NULL DEFAULT 'task-348',
  created_at         timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_terms_library_category
  ON greenhouse_commercial.terms_library (category) WHERE active;

CREATE INDEX IF NOT EXISTS idx_terms_library_active
  ON greenhouse_commercial.terms_library (active);

COMMENT ON TABLE greenhouse_commercial.terms_library IS
  'Catálogo global de términos y condiciones. El body_template admite variables tipo {{payment_terms_days}} resueltas al aplicar a una cotización.';

-- =============================================================================
-- 5. quotation_terms — términos aplicados a una cotización específica
-- =============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_commercial.quotation_terms (
  quotation_term_id  text PRIMARY KEY DEFAULT ('qt-' || gen_random_uuid()::text),
  quotation_id       text NOT NULL
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE CASCADE,
  term_id            text NOT NULL
    REFERENCES greenhouse_commercial.terms_library(term_id) ON DELETE RESTRICT,
  body_resolved      text NOT NULL,
  sort_order         integer NOT NULL DEFAULT 100,
  included           boolean NOT NULL DEFAULT TRUE,
  created_at         timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quotation_terms_unique UNIQUE (quotation_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_quotation_terms_qt
  ON greenhouse_commercial.quotation_terms (quotation_id);

COMMENT ON TABLE greenhouse_commercial.quotation_terms IS
  'Snapshot del término aplicado a la cotización: body_resolved es el texto final con variables ya reemplazadas.';

-- =============================================================================
-- 6. quote_templates — plantillas reutilizables de cotización
-- =============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_commercial.quote_templates (
  template_id                      text PRIMARY KEY DEFAULT ('tmpl-' || gen_random_uuid()::text),
  template_name                    text NOT NULL,
  template_code                    text NOT NULL UNIQUE,
  business_line_code               text,
  pricing_model                    text NOT NULL
    CHECK (pricing_model = ANY (ARRAY['staff_aug'::text, 'retainer'::text, 'project'::text])),
  default_currency                 text NOT NULL DEFAULT 'CLP'
    CHECK (default_currency = ANY (ARRAY['CLP'::text, 'USD'::text, 'CLF'::text])),
  default_billing_frequency        text NOT NULL DEFAULT 'monthly'
    CHECK (default_billing_frequency = ANY (ARRAY['monthly'::text, 'milestone'::text, 'one_time'::text])),
  default_payment_terms_days       integer NOT NULL DEFAULT 30,
  default_contract_duration_months integer,
  default_conditions_text          text,
  default_term_ids                 text[] NOT NULL DEFAULT ARRAY[]::text[],
  description                      text,
  active                           boolean NOT NULL DEFAULT TRUE,
  usage_count                      integer NOT NULL DEFAULT 0,
  last_used_at                     timestamptz,
  created_by                       text NOT NULL DEFAULT 'task-348',
  created_at                       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_bl
  ON greenhouse_commercial.quote_templates (business_line_code) WHERE active;

CREATE INDEX IF NOT EXISTS idx_quote_templates_pricing
  ON greenhouse_commercial.quote_templates (pricing_model) WHERE active;

COMMENT ON TABLE greenhouse_commercial.quote_templates IS
  'Plantillas reutilizables que precargan line items, moneda, billing frequency y términos default para acelerar creación de cotizaciones.';

-- =============================================================================
-- 7. quote_template_items — line items default de un template
-- =============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_commercial.quote_template_items (
  template_item_id   text PRIMARY KEY DEFAULT ('tmpi-' || gen_random_uuid()::text),
  template_id        text NOT NULL
    REFERENCES greenhouse_commercial.quote_templates(template_id) ON DELETE CASCADE,
  product_id         text
    REFERENCES greenhouse_commercial.product_catalog(product_id) ON DELETE SET NULL,
  line_type          text NOT NULL DEFAULT 'deliverable'
    CHECK (line_type = ANY (ARRAY['person'::text, 'role'::text, 'deliverable'::text, 'direct_cost'::text])),
  label              text NOT NULL,
  description        text,
  role_code           text,
  suggested_hours    numeric(8,2),
  unit               text NOT NULL DEFAULT 'hour'
    CHECK (unit = ANY (ARRAY['hour'::text, 'month'::text, 'unit'::text, 'project'::text])),
  quantity           numeric(10,2) NOT NULL DEFAULT 1,
  default_margin_pct numeric(5,2),
  default_unit_price numeric(14,2),
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_template_items
  ON greenhouse_commercial.quote_template_items (template_id);

COMMENT ON TABLE greenhouse_commercial.quote_template_items IS
  'Line items default de cada template. Se copian a quotation_line_items al instanciar; margin y precio son sugeridos.';

-- =============================================================================
-- Seed inicial: approval_policies globales (activables por BL)
-- =============================================================================

INSERT INTO greenhouse_commercial.approval_policies
  (policy_name, business_line_code, pricing_model, condition_type, threshold_value, required_role, step_order, active, created_by)
VALUES
  ('Margen bajo piso — Finanzas', NULL, NULL, 'margin_below_floor', NULL, 'finance', 1, TRUE, 'task-348-seed'),
  ('Monto superior a 50M CLP — Admin', NULL, NULL, 'amount_above_threshold', 50000000, 'efeonce_admin', 2, TRUE, 'task-348-seed'),
  ('Descuento superior al 30% — Finanzas', NULL, NULL, 'discount_above_threshold', 30, 'finance', 1, TRUE, 'task-348-seed')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Seed inicial: terms_library (términos genéricos reutilizables)
-- =============================================================================

INSERT INTO greenhouse_commercial.terms_library
  (term_code, category, title, body_template, applies_to_model, default_for_bl, required, sort_order, active, version, created_by)
VALUES
  ('payment_default', 'payment', 'Condiciones de pago',
   'Facturación mensual. Pago a {{payment_terms_days}} días desde emisión de factura.',
   NULL, ARRAY[]::text[], TRUE, 10, TRUE, 1, 'task-348-seed'),
  ('validity_default', 'general', 'Vigencia de la propuesta',
   'Esta propuesta tiene validez hasta {{valid_until}}.',
   NULL, ARRAY[]::text[], TRUE, 20, TRUE, 1, 'task-348-seed'),
  ('confidentiality', 'legal', 'Confidencialidad',
   'Esta propuesta es confidencial entre {{organization_name}} y Efeonce. Su contenido no puede compartirse con terceros sin autorización.',
   NULL, ARRAY[]::text[], FALSE, 80, TRUE, 1, 'task-348-seed'),
  ('scope_change', 'legal', 'Cambios de alcance',
   'Cualquier cambio en el alcance acordado puede implicar un ajuste de precio y será formalizado mediante adenda.',
   NULL, ARRAY[]::text[], FALSE, 60, TRUE, 1, 'task-348-seed'),
  ('replacement_staff_aug', 'staffing', 'Reemplazo de personas',
   'Ante rotación, Efeonce garantiza el reemplazo en un plazo máximo de 15 días hábiles manteniendo el perfil acordado.',
   'staff_aug', ARRAY[]::text[], FALSE, 40, TRUE, 1, 'task-348-seed'),
  ('escalation_policy', 'payment', 'Escalamiento anual',
   'Los precios se ajustan {{escalation_pct}} anualmente o según IPC acumulado, lo que sea acordado al inicio del contrato.',
   'retainer', ARRAY[]::text[], FALSE, 30, TRUE, 1, 'task-348-seed')
ON CONFLICT (term_code) DO NOTHING;

-- Down Migration
-- Reversal: remove seeds + drop tables in reverse FK order.

DELETE FROM greenhouse_commercial.terms_library WHERE created_by = 'task-348-seed';
DELETE FROM greenhouse_commercial.approval_policies WHERE created_by = 'task-348-seed';

DROP TABLE IF EXISTS greenhouse_commercial.quote_template_items;
DROP TABLE IF EXISTS greenhouse_commercial.quote_templates;
DROP TABLE IF EXISTS greenhouse_commercial.quotation_terms;
DROP TABLE IF EXISTS greenhouse_commercial.terms_library;
DROP TABLE IF EXISTS greenhouse_commercial.quotation_audit_log;
DROP TABLE IF EXISTS greenhouse_commercial.approval_steps;
DROP TABLE IF EXISTS greenhouse_commercial.approval_policies;