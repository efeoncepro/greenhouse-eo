-- Up Migration

-- TASK-1251 — Convergencia del intake del AI Visibility Grader sobre el motor Growth Forms.
-- ADDITIVE-only + idempotente + reversible. NO toca el intake a-medida (TASK-1240) ni el
-- contrato público; sólo siembra el grader como FORM gobernado del motor (FK anchors para
-- el submission) + agrega el binding lead↔submission. El cutover está detrás del flag
-- `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED` (default OFF) — esta migración no cambia
-- comportamiento por sí sola. IDs pineados (no uuid) para que la fachada + el reactive
-- consumer los referencien deterministamente. Arch: GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md.

-- 1. form_definition del grader (slug canónico, diagnostic_intake, risk medium = PII + costo LLM).
INSERT INTO greenhouse_growth.form_definition
  (form_id, slug, name, form_kind, purpose, risk_profile, owner_team, status, default_locale, created_by)
VALUES (
  'fdef-ai-visibility-grader',
  'ai-visibility-grader',
  'AI Visibility Grader',
  'diagnostic_intake',
  'Lead magnet público: captura marca + email (con consent) y dispara un diagnóstico de visibilidad en IA.',
  'medium',
  'growth',
  'active',
  'es-CL',
  'task-1251-migration'
)
ON CONFLICT (form_id) DO NOTHING;

-- 2. form_version publicada (FK anchor del submission). El field_schema espeja el input
--    del grader (observabilidad/parity); la fachada persiste el submission directamente.
INSERT INTO greenhouse_growth.form_version
  (form_version_id, form_id, version, status, locale, field_schema_json, success_behavior_json,
   consent_policy_version, published_at)
VALUES (
  'fver-ai-visibility-grader-v1',
  'fdef-ai-visibility-grader',
  1,
  'published',
  'es-CL',
  '[
    {"key":"brandName","type":"text","required":true},
    {"key":"websiteUrl","type":"url","required":false},
    {"key":"market","type":"text","required":true},
    {"key":"locale","type":"text","required":true},
    {"key":"category","type":"text","required":true},
    {"key":"competitorsDeclared","type":"multiselect","required":false},
    {"key":"email","type":"email","required":true},
    {"key":"industry","type":"text","required":false},
    {"key":"persona","type":"text","required":false},
    {"key":"companySize","type":"text","required":false},
    {"key":"mainChallenge","type":"textarea","required":false},
    {"key":"consent","type":"consent","required":true}
  ]'::jsonb,
  '{"kind":"tokenized_report"}'::jsonb,
  'ai-visibility-grader-consent-v1',
  NOW()
)
ON CONFLICT (form_version_id) DO NOTHING;

-- 3. host_surface del grader (registry; la fachada gobierna acceso por captcha + abuse,
--    no por origin/surface — surface_id del submission queda NULL en el path del grader).
INSERT INTO greenhouse_growth.form_host_surface
  (surface_id, surface_kind, surface_name, origin_allowlist_json, allowed_form_slugs_json, status)
VALUES (
  'fhsf-ai-visibility-grader',
  'nextjs',
  'AI Visibility Grader — lead magnet',
  '[]'::jsonb,
  '["ai-visibility-grader"]'::jsonb,
  'active'
)
ON CONFLICT (surface_id) DO NOTHING;

-- 4. Binding lead↔submission (additive, nullable). El reactive consumer setea submission_id
--    al materializar el lead desde el submission del motor. Histórico a-medida queda NULL.
ALTER TABLE greenhouse_growth.grader_leads
  ADD COLUMN IF NOT EXISTS submission_id TEXT
    REFERENCES greenhouse_growth.form_submission (submission_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS grader_leads_submission_idx
  ON greenhouse_growth.grader_leads (submission_id);

-- 5. Anti pre-up-marker: aborta si el seed o el binding no quedaron creados realmente.
DO $$
DECLARE def_ok boolean; ver_ok boolean; col_ok boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM greenhouse_growth.form_definition WHERE form_id = 'fdef-ai-visibility-grader')
    INTO def_ok;
  SELECT EXISTS (SELECT 1 FROM greenhouse_growth.form_version WHERE form_version_id = 'fver-ai-visibility-grader-v1')
    INTO ver_ok;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_leads' AND column_name = 'submission_id'
  ) INTO col_ok;

  IF NOT (def_ok AND ver_ok AND col_ok) THEN
    RAISE EXCEPTION 'TASK-1251 anti pre-up-marker: grader form seed/binding NO creado (def=% ver=% col=%). Markers invertidos.',
      def_ok, ver_ok, col_ok;
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_growth.grader_leads DROP COLUMN IF EXISTS submission_id;
DELETE FROM greenhouse_growth.form_host_surface WHERE surface_id = 'fhsf-ai-visibility-grader';
DELETE FROM greenhouse_growth.form_version WHERE form_version_id = 'fver-ai-visibility-grader-v1';
DELETE FROM greenhouse_growth.form_definition WHERE form_id = 'fdef-ai-visibility-grader';
