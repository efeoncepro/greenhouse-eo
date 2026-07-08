-- Up Migration

-- TASK-1360 Slice 2 — Seed de la plantilla real "Account Manager L2".
-- Composición revisada con greenhouse-talent-people-operator: el AM es principalmente
-- relación/comercial/coordinación; los 4 skills pedidos (seo/copy/liderazgo/vendor) son
-- conocimiento de apoyo (38% combinado). Pesos suman 100. Idempotente (template_id fijo).

INSERT INTO greenhouse_hiring.hiring_assessment_template (template_id, name, role_hint, created_by)
VALUES ('atpl-account-manager-l2', 'Account Manager L2', 'account_manager', 'seed:task-1360')
ON CONFLICT (template_id) DO UPDATE SET name = EXCLUDED.name, role_hint = EXCLUDED.role_hint;

-- Módulos (competencia + nivel objetivo + peso). target_level NULL para actitudinales.
INSERT INTO greenhouse_hiring.hiring_assessment_template_module (template_id, competency_id, target_level, weight)
SELECT 'atpl-account-manager-l2', c.competency_id, m.target_level, m.weight
FROM (VALUES
  ('client_relationship_comm', 'intermedio', 20),
  ('commercial_acumen',        'intermedio', 15),
  ('copywriting',              'intermedio', 12),
  ('leadership',               'intermedio', 10),
  ('ownership',                NULL,         10),
  ('composure_pressure',       NULL,         10),
  ('seo',                      'nociones',    8),
  ('vendor_management',        'nociones',    8),
  ('delivery_coordination',    'intermedio',  7)
) AS m(competency_key, target_level, weight)
JOIN greenhouse_hiring.hiring_competency c ON c.key = m.competency_key
ON CONFLICT (template_id, competency_id) DO UPDATE
  SET target_level = EXCLUDED.target_level, weight = EXCLUDED.weight;

-- Anti pre-up-marker guard (ISSUE-068): aborta si la plantilla no quedó con sus 9 módulos + pesos=100.
DO $$
DECLARE module_count INTEGER; total_weight NUMERIC;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(weight), 0) INTO module_count, total_weight
  FROM greenhouse_hiring.hiring_assessment_template_module
  WHERE template_id = 'atpl-account-manager-l2';
  IF module_count <> 9 THEN
    RAISE EXCEPTION 'TASK-1360 AM template: expected 9 modules, got %.', module_count;
  END IF;
  IF total_weight <> 100 THEN
    RAISE EXCEPTION 'TASK-1360 AM template: expected total weight 100, got %.', total_weight;
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_hiring.hiring_assessment_template_module WHERE template_id = 'atpl-account-manager-l2';
DELETE FROM greenhouse_hiring.hiring_assessment_template WHERE template_id = 'atpl-account-manager-l2';
