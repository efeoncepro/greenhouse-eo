-- Up Migration

-- TASK-1604 — Catálogo reusable para SEO Specialist Senior y Director(a) de Arte Senior.
-- El nivel vive en preguntas/templates, no en la competencia. Este seed no activa
-- preguntas, templates, policies ni assessments.

INSERT INTO greenhouse_hiring.hiring_competency (key, name, category, description, created_by)
VALUES
  (
    'seo_technical_strategy',
    'Estrategia y diagnóstico SEO técnico',
    'skill',
    'Diagnosticar rastreo, indexación, arquitectura, renderizado y performance; priorizar acciones por impacto, evidencia, esfuerzo y riesgo.',
    'seed:TASK-1604'
  ),
  (
    'search_content_aeo',
    'Arquitectura de contenido para SEO/AEO',
    'skill',
    'Modelar intención, entidades, cobertura y evidencia para crear experiencias encontrables, recuperables y citables sin sacrificar utilidad.',
    'seed:TASK-1604'
  ),
  (
    'search_measurement',
    'Medición y experimentación de búsqueda',
    'skill',
    'Diseñar medición de visibilidad, tráfico cualificado, conversión y presencia generativa; distinguir señal, causalidad, incertidumbre y decisión.',
    'seed:TASK-1604'
  ),
  (
    'art_direction',
    'Dirección de arte',
    'skill',
    'Traducir estrategia y restricciones en una idea visual defendible, dirigir su ejecución y elevar el craft en las piezas decisivas.',
    'seed:TASK-1604'
  ),
  (
    'visual_systems',
    'Sistemas visuales multiformato',
    'skill',
    'Construir reglas de composición, tipografía, color, imagen y movimiento que preserven intención y calidad al adaptarse entre formatos.',
    'seed:TASK-1604'
  ),
  (
    'creative_production',
    'Producción creativa y control de calidad',
    'skill',
    'Convertir una dirección creativa en entregables producibles con handoff, feedback, QA, trazabilidad de derechos y uso responsable de herramientas.',
    'seed:TASK-1604'
  )
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

DO $$
DECLARE seeded_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_hiring.hiring_competency
  WHERE key IN (
    'seo_technical_strategy',
    'search_content_aeo',
    'search_measurement',
    'art_direction',
    'visual_systems',
    'creative_production'
  )
    AND category = 'skill'
    AND status = 'active';

  IF seeded_count <> 6 THEN
    RAISE EXCEPTION 'TASK-1604 expected six active skill competencies, got %.', seeded_count;
  END IF;
END
$$;

-- Down Migration

-- Sólo es reversible antes de referenciar las competencias. Las FKs RESTRICT
-- impiden borrar evidencia o módulos utilizados por accidente.
DELETE FROM greenhouse_hiring.hiring_competency
WHERE key IN (
  'seo_technical_strategy',
  'search_content_aeo',
  'search_measurement',
  'art_direction',
  'visual_systems',
  'creative_production'
);
