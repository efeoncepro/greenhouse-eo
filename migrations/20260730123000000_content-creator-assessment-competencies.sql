-- Up Migration

-- Competency taxonomy for the integral Content Creator assessment.
-- These are reusable capabilities, not vacancy-specific labels.

INSERT INTO greenhouse_hiring.hiring_competency (key, name, category, description, created_by)
VALUES
  ('social_channel_strategy', 'Estrategia y adaptación por canal', 'skill', 'Elegir canales y adaptar ideas, formatos y CTA según audiencia, intención y contexto de consumo.', 'seed:content-creator-assessment'),
  ('tool_fluency', 'Fluidez práctica en herramientas de contenido', 'skill', 'Usar software de planificación, CMS, publicación social, analítica e IA dentro de un flujo trazable.', 'seed:content-creator-assessment'),
  ('content_analytics', 'Analítica y experimentación de contenido', 'skill', 'Interpretar métricas de contenido y diseñar experimentos conectados con objetivos y decisiones.', 'seed:content-creator-assessment'),
  ('research_synthesis', 'Investigación y síntesis editorial', 'skill', 'Evaluar fuentes, separar evidencia de opinión y construir una tesis editorial defendible.', 'seed:content-creator-assessment')
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- Down Migration

DELETE FROM greenhouse_hiring.hiring_competency
WHERE key IN ('social_channel_strategy', 'tool_fluency', 'content_analytics', 'research_synthesis');
