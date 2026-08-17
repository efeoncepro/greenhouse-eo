-- Up Migration

-- ══════════════════════════════════════════════════════════════════════════════
-- Corrección de datos: archivar las plantillas de assessment cuyos módulos NO
-- tienen preguntas activas que resolver.
--
-- HALLAZGO (auditoría adversarial 2026-08-17, verificada ejercitando el resolvedor
-- real `PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL` plantilla por plantilla):
--
--   atpl-dae66420  "Content Creator L2 — Integral"          8 módulos → 5 preguntas
--                  4 módulos SIN instrumento = 45% del peso del score ciego
--                  (community_management 15, project_management 15, logical 10, verbal 5)
--   atpl-c0d996fd  "Content Creator L2 — Editorial, SEO/AEO & Social"  5 módulos → 6 preguntas
--                  1 módulo SIN instrumento = 25% del peso (community_management)
--
-- POR QUÉ IMPORTA: un módulo sin preguntas activas NO desaparece de la vista del
-- candidato. El resolvedor conserva la fila con `question_id IS NULL` y el mapper
-- de `listPublicAssessmentQuestions` registra la competencia ANTES del `continue`,
-- así que la sección se renderiza vacía. Y `submitPublicAssessment` sólo exige
-- responder las preguntas resueltas: el examen encogido se envía SIN error y se
-- puntúa sobre una fracción del peso declarado. Falla silenciosa en ambas puntas.
--
-- POR QUÉ ARCHIVAR Y NO COMPLETAR: `atpl-2c7dd874` ("Integral v2") cubre el mismo
-- rol con sus 8 módulos instrumentados y es la que se está usando (9 instancias).
-- Las dos de acá son predecesoras con 0 instancias — ningún candidato las rindió
-- nunca. Archivarlas las saca de `listActiveTemplates`, que es la lista desde la
-- que el operador elige al asignar.
--
-- El trigger `hiring_template_immutable_trigger` (TASK-1383) permite este UPDATE:
-- bloquea el contenido (name/version/módulos), no el `status`.
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  target_ids TEXT[] := ARRAY[
    'atpl-dae66420-2045-4d23-a10f-0af485e47b01',
    'atpl-c0d996fd-b195-4885-bee5-f2bd12caaf7b'
  ];
  rendered_instances INTEGER;
  archived_count INTEGER;
BEGIN
  -- Verify-then-mutate: archivar una plantilla que algún candidato YA rindió sería
  -- una decisión distinta (afecta comparabilidad y trazabilidad de su evaluación).
  -- Si aparece una instancia, abortar la migración entera en vez de asumir.
  SELECT COUNT(*) INTO rendered_instances
    FROM greenhouse_hiring.hiring_assessment a
   WHERE a.template_id = ANY(target_ids);

  IF rendered_instances > 0 THEN
    RAISE EXCEPTION
      'ABORT: alguna de las plantillas objetivo tiene % instancia(s). Archivarlas ya no es una corrección de datos inocua — revisar caso por caso antes de reintentar.',
      rendered_instances;
  END IF;

  UPDATE greenhouse_hiring.hiring_assessment_template
     SET status = 'archived',
         updated_at = NOW()
   WHERE template_id = ANY(target_ids)
     AND status = 'active';

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  RAISE NOTICE 'Plantillas archivadas: % (idempotente: 0 significa que ya estaban archivadas).', archived_count;
END
$$;

-- Anti pre-up-marker + verificación post-apply: ninguna de las dos puede seguir activa.
DO $$
DECLARE
  still_active INTEGER;
BEGIN
  SELECT COUNT(*) INTO still_active
    FROM greenhouse_hiring.hiring_assessment_template
   WHERE template_id IN (
           'atpl-dae66420-2045-4d23-a10f-0af485e47b01',
           'atpl-c0d996fd-b195-4885-bee5-f2bd12caaf7b'
         )
     AND status = 'active';

  IF still_active > 0 THEN
    RAISE EXCEPTION
      'anti pre-up-marker check: % plantilla(s) con módulos sin preguntas siguen activas tras la migración.',
      still_active;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_hiring.hiring_assessment_template
   SET status = 'active',
       updated_at = NOW()
 WHERE template_id IN (
         'atpl-dae66420-2045-4d23-a10f-0af485e47b01',
         'atpl-c0d996fd-b195-4885-bee5-f2bd12caaf7b'
       )
   AND status = 'archived';
