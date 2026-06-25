-- Up Migration

-- TASK-1257 Slice 2 — Agrega los campos firstName/lastName al grader-form (render_contract).
-- Las versiones publicadas son INMUTABLES (trigger TASK-1229): editar el field_schema de una versión
-- published lanza excepción. El camino gobernado es publicar una VERSIÓN NUEVA (v2) con el schema
-- ampliado y deprecar la v1. Idempotente + reversible. El render_contract público = field_schema_json
-- (policy-compiler) y `getPublishedVersionBySlug` toma la versión publicada más alta → el renderer
-- data-driven pinta Nombre + Apellido en cuanto se despliega. La fachada del intake (forms-engine-binding)
-- pinea GRADER_FORM_VERSION_ID = v2 en el mismo PR. Nombre/apellido son PII (Ley 21.719): el renderer
-- los captura, el pipeline los lleva al lead/submission con consent, NUNCA a los providers IA.

-- 1. Versión v2 publicada del grader-form (field_schema con firstName/lastName + label es-CL + autocomplete
--    WHATWG). Mismo success_behavior + consent_policy_version que v1 (el consentimiento no cambió).
INSERT INTO greenhouse_growth.form_version
  (form_version_id, form_id, version, status, locale, field_schema_json, success_behavior_json,
   consent_policy_version, published_at)
VALUES (
  'fver-ai-visibility-grader-v2',
  'fdef-ai-visibility-grader',
  2,
  'published',
  'es-CL',
  '[
    {"key":"brandName","type":"text","required":true},
    {"key":"websiteUrl","type":"url","required":false},
    {"key":"market","type":"text","required":true},
    {"key":"locale","type":"text","required":true},
    {"key":"category","type":"text","required":true},
    {"key":"competitorsDeclared","type":"multiselect","required":false},
    {"key":"firstName","type":"text","label":"Nombre","required":true,"autocomplete":"given-name"},
    {"key":"lastName","type":"text","label":"Apellido","required":true,"autocomplete":"family-name"},
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

-- 2. Deprecar v1 (status-only change; lo permite el trigger de inmutabilidad). Quedando v2 como la
--    única versión publicada del slug, `getPublishedVersionBySlug` la resuelve sin ambigüedad.
UPDATE greenhouse_growth.form_version
SET status = 'deprecated'
WHERE form_version_id = 'fver-ai-visibility-grader-v1' AND status = 'published';

-- 3. Anti pre-up-marker: aborta si v2 no quedó publicada con firstName/lastName.
DO $$
DECLARE first_ok boolean; last_ok boolean; published_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM greenhouse_growth.form_version,
                  jsonb_array_elements(field_schema_json) AS f
    WHERE form_version_id = 'fver-ai-visibility-grader-v2' AND f->>'key' = 'firstName'
  ) INTO first_ok;
  SELECT EXISTS (
    SELECT 1 FROM greenhouse_growth.form_version,
                  jsonb_array_elements(field_schema_json) AS f
    WHERE form_version_id = 'fver-ai-visibility-grader-v2' AND f->>'key' = 'lastName'
  ) INTO last_ok;
  SELECT EXISTS (
    SELECT 1 FROM greenhouse_growth.form_version
    WHERE form_version_id = 'fver-ai-visibility-grader-v2' AND status = 'published'
  ) INTO published_ok;

  IF NOT (first_ok AND last_ok AND published_ok) THEN
    RAISE EXCEPTION 'TASK-1257 Slice 2 anti pre-up-marker: grader-form v2 NO publicada con firstName/lastName (first=% last=% published=%).',
      first_ok, last_ok, published_ok;
  END IF;
END
$$;

-- Down Migration

-- Re-publica v1 y archiva v2 (NO DELETE: la v2 puede tener submissions referenciándola — FK RESTRICT).
UPDATE greenhouse_growth.form_version
SET status = 'published'
WHERE form_version_id = 'fver-ai-visibility-grader-v1' AND status = 'deprecated';

UPDATE greenhouse_growth.form_version
SET status = 'archived'
WHERE form_version_id = 'fver-ai-visibility-grader-v2';
