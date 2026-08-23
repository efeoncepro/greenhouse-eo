-- Up Migration

-- TASK-1765 — el reloj de retención de los recibos de recuperación de acceso cubre los SEIS
-- desenlaces, no tres.
--
-- REGRESIÓN QUE ESTA TASK INTRODUJO. `refresh_assessment_access_recovery_retention_for_application`
-- (TASK-1746) decidía la retención con dos listas de literales:
--
--   retention_expires_at ← decision_at + 12 meses  WHEN decision IN ('rejected','withdrawn')
--                          NULL                    ELSE
--
-- Al nacer `not_selected` y `unresponsive`, los dos caen al `ELSE`. Y el `ELSE` no pone una fecha
-- lejana: pone **NULL**. O sea que el reloj de la Ley 21.719 **no arranca nunca** para ellos —
-- exactamente la familia del H-01: una obligación legal congelada sin que nadie se entere.
--
-- `not_selected` es, por el §4 del ADR del vocabulario, **la población más grande**: la gente que
-- llegó al final y no quedó. Antes de esta task esas personas se marcaban `rejected` y su reloj sí
-- arrancaba. Sin este fix, el eje nuevo las deja sin expiración.
--
-- Es además el MISMO patrón de denylist por literales que esta task vino a borrar del `PATCH`,
-- sobreviviendo dentro de un trigger de PostgreSQL, donde ningún `satisfies` de TypeScript lo
-- alcanza. Por eso la escalera pasa a enumerar los seis desenlaces por INCLUSIÓN, con el `ELSE`
-- reservado para lo que de verdad no tiene desenlace.
--
-- SEGURIDAD RESPECTO DE PRODUCCIÓN (la lección de hoy, aplicada antes de escribir):
-- se verificó qué puede escribir `origin/main` — `selected`, `backup_selected`, `rejected`,
-- `withdrawn`, `on_hold` — y para los cinco esta función produce **exactamente el mismo resultado**
-- que la anterior. Es puramente aditiva: sólo agrega cobertura para los dos desenlaces nuevos, que
-- el código desplegado todavía no puede escribir. No retira ninguna rama.
--
-- Volumen al aplicar: `hiring_assessment_access_recovery` tiene **0 filas** (readback 2026-08-22),
-- así que no hay recibo existente que reclasificar. El fix es preventivo, no correctivo.
--
-- `backup_selected` se deja DELIBERADAMENTE sin expiración y ahora **explícito**, no colándose por
-- un `ELSE` mudo: hay un compromiso vigente con esa persona y decidir su ventana es una decisión de
-- producto. Su dueño es `TASK-1744` (H-23), que ya tiene declarado el mismo hueco en la escalera de
-- retención de documentos.

CREATE OR REPLACE FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, greenhouse_hiring AS $$
BEGIN
  PERFORM set_config('greenhouse.assessment_recovery_retention_refresh', 'on', true);
  UPDATE greenhouse_hiring.hiring_assessment_access_recovery
  SET retention_class = CASE
        WHEN retention_class = 'workforce_record' OR NEW.stage = 'selected' OR NEW.decision = 'selected'
          THEN 'workforce_record'
        ELSE 'hiring_candidate_recovery'
      END,
      retention_expires_at = CASE
        -- Contratada: pasa a retención laboral, que no vence acá.
        WHEN retention_class = 'workforce_record' OR NEW.stage = 'selected' OR NEW.decision = 'selected'
          THEN NULL
        -- Compromiso vigente: sin ventana, y DECLARADO en vez de caer a un ELSE mudo.
        -- Dueño de la decisión: TASK-1744 (H-23).
        WHEN NEW.stage = 'backup' OR NEW.decision = 'backup_selected'
          THEN NULL
        -- El proceso terminó sin contratación, por la vía que sea. El reloj arranca igual: la
        -- obligación legal no distingue entre un descarte, una no-selección y un silencio.
        WHEN NEW.stage IN ('rejected', 'withdrawn')
          OR NEW.decision IN ('rejected', 'withdrawn', 'not_selected', 'unresponsive')
          THEN COALESCE(NEW.decision_at, NOW()) + INTERVAL '12 months'
        -- Sin desenlace declarado: el proceso sigue vivo y el reloj todavía no corre.
        ELSE NULL
      END,
      updated_at = NOW()
  WHERE application_id = NEW.application_id
    AND (OLD.stage IS DISTINCT FROM NEW.stage OR OLD.decision IS DISTINCT FROM NEW.decision
      OR OLD.decision_at IS DISTINCT FROM NEW.decision_at);
  RETURN NEW;
END
$$;

ALTER FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application() OWNER TO greenhouse_ops;
REVOKE ALL ON FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application()
  FROM PUBLIC, greenhouse_runtime;

-- Guard anti pre-up-marker + verificación de que la cobertura nueva quedó realmente en el cuerpo.
DO $$
DECLARE
  body text;
BEGIN
  SELECT prosrc INTO body FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'greenhouse_hiring'
     AND p.proname = 'refresh_assessment_access_recovery_retention_for_application';

  IF body IS NULL THEN
    RAISE EXCEPTION 'TASK-1765 anti pre-up-marker check: la función de retención no existe.';
  END IF;

  IF body NOT LIKE '%not_selected%' OR body NOT LIKE '%unresponsive%' THEN
    RAISE EXCEPTION 'TASK-1765: la escalera de retención NO cubre not_selected/unresponsive. El reloj de la Ley 21.719 no arrancaría para ellos.';
  END IF;
END
$$;

-- Down Migration

-- Revertir reintroduce la regresión: `not_selected` y `unresponsive` vuelven a quedar sin fecha de
-- expiración de retención. Se deja explícito en vez de silencioso.
CREATE OR REPLACE FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, greenhouse_hiring AS $$
BEGIN
  PERFORM set_config('greenhouse.assessment_recovery_retention_refresh', 'on', true);
  UPDATE greenhouse_hiring.hiring_assessment_access_recovery
  SET retention_class = CASE
        WHEN retention_class = 'workforce_record' OR NEW.stage = 'selected' OR NEW.decision = 'selected'
          THEN 'workforce_record'
        ELSE 'hiring_candidate_recovery'
      END,
      retention_expires_at = CASE
        WHEN retention_class = 'workforce_record' OR NEW.stage = 'selected' OR NEW.decision = 'selected' THEN NULL
        WHEN NEW.stage IN ('rejected', 'withdrawn') OR NEW.decision IN ('rejected', 'withdrawn')
          THEN COALESCE(NEW.decision_at, NOW()) + INTERVAL '12 months'
        ELSE NULL
      END,
      updated_at = NOW()
  WHERE application_id = NEW.application_id
    AND (OLD.stage IS DISTINCT FROM NEW.stage OR OLD.decision IS DISTINCT FROM NEW.decision
      OR OLD.decision_at IS DISTINCT FROM NEW.decision_at);
  RETURN NEW;
END
$$;

ALTER FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application() OWNER TO greenhouse_ops;
REVOKE ALL ON FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application()
  FROM PUBLIC, greenhouse_runtime;
