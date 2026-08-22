-- Up Migration

-- TASK-1748 Slice 2 — el audit de procedencia aprende a nombrar la ficha de candidato.
--
-- `archiveSyntheticRecords` pasa a archivar las TRES entidades (postulación, ficha, vacante) y cada
-- una deja su fila de audit. El CHECK de `record_type` nacía cerrado en tres valores y `candidate_facet`
-- no cabía: sin esta migración el archivado de la ficha revienta con 23514 en la fila de auditoría,
-- después de haber escrito el estado — o sea, la transacción aborta y la ficha no se archiva nunca.
--
-- La alternativa era escribir la fila como `identity_profile` con el `candidate_facet_id` adentro.
-- Se descartó: `record_id` dejaría de ser el identificador del tipo que declara, y un audit que
-- miente sobre a qué apunta es peor que no tenerlo. La ficha es una entidad propia del dominio.
--
-- Aditiva y no destructiva: ensancha el enum, no lo estrecha. Ninguna fila existente lo viola, así
-- que no hay ventana de despliegue que respetar (a diferencia de un *contract*, que sí la exige).

ALTER TABLE greenhouse_hiring.hiring_data_origin_audit
  DROP CONSTRAINT IF EXISTS hiring_data_origin_audit_record_type_check;

ALTER TABLE greenhouse_hiring.hiring_data_origin_audit
  ADD CONSTRAINT hiring_data_origin_audit_record_type_check CHECK (record_type IN (
    'identity_profile', 'talent_demand', 'hiring_opening', 'hiring_application', 'candidate_facet'));

-- Guard anti pre-up-marker: si los markers estuvieran invertidos, esta sección no habría corrido y
-- la migración quedaría registrada como aplicada sin ejecutar una sola línea de DDL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'greenhouse_hiring.hiring_data_origin_audit'::regclass
       AND conname = 'hiring_data_origin_audit_record_type_check'
       AND pg_get_constraintdef(oid) LIKE '%candidate_facet%'
  ) THEN
    RAISE EXCEPTION 'TASK-1748 anti pre-up-marker check: el CHECK de record_type no admite candidate_facet.';
  END IF;
END
$$;

-- Down Migration

-- Vuelve al enum de cuatro valores. Aborta si ya hay filas de ficha: estrecharlo con datos adentro
-- dejaría la tabla violando su propia constraint.
DO $$
DECLARE
  facet_rows int;
BEGIN
  SELECT COUNT(*) INTO facet_rows
    FROM greenhouse_hiring.hiring_data_origin_audit
   WHERE record_type = 'candidate_facet';

  IF facet_rows > 0 THEN
    RAISE EXCEPTION 'TASK-1748 down abortado: % fila(s) de audit con record_type=candidate_facet. El audit es append-only: no se borran para poder revertir.', facet_rows;
  END IF;
END
$$;

ALTER TABLE greenhouse_hiring.hiring_data_origin_audit
  DROP CONSTRAINT IF EXISTS hiring_data_origin_audit_record_type_check;

ALTER TABLE greenhouse_hiring.hiring_data_origin_audit
  ADD CONSTRAINT hiring_data_origin_audit_record_type_check CHECK (record_type IN (
    'identity_profile', 'talent_demand', 'hiring_opening', 'hiring_application'));
