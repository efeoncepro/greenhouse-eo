-- Up Migration

-- TASK-1566 — CORRECCION: el segundo confirmador es POLITICA, no invariante.
--
-- La migracion anterior (20260726164420386) puso un CHECK duro e incondicional exigiendo
-- confirmante != proponente SIEMPRE. Eso contradice una decision ya tomada y documentada en ADR-015
-- § Delta 2026-07-26 (2): `requireSecondConfirmer` es politica POR WORKSPACE con techo por operacion,
-- y su default es OFF en el workspace interno owner-operated.
--
-- El motivo de esa decision no es laxitud: exigir dos humanos donde el aprobador ES el dueno del
-- presupuesto costo dos horas de friccion y desvio la operacion al break-glass — que otorga MAS
-- autoridad que el camino que reemplaza. Un control que nadie puede satisfacer no protege, desvia.
--
-- Lo que SIGUE siendo invariante, y no se toca:
--   1. El agente nunca confirma: `actor_user_id` no puede ser un principal de servicio.
--   2. Toda confirmacion registra contra QUE propuesta y de QUIEN — la evidencia no se vuelve opcional.
--   3. Append-only: la evidencia de quien aprobo un movimiento de dinero no se edita ni se borra.
--
-- Lo que pasa a ser politica: si ademas se exige que sean dos personas DISTINTAS.

CREATE TABLE IF NOT EXISTS greenhouse_core.globe_credit_funding_policies (
  globe_workspace_id       text        NOT NULL,
  -- Default FALSE a proposito: el workspace interno es owner-operated. Se prende donde un segundo
  -- actor existe y significa algo — workspaces de cliente, o por encima de un techo declarado.
  requires_second_confirmer boolean    NOT NULL DEFAULT FALSE,
  -- Techo por operacion: por encima de este monto se exige el segundo confirmador aunque la politica
  -- base este en OFF. NULL = sin techo. Es el escalon que ADR-015 pide para que la proteccion
  -- aparezca cuando el monto la amerita, en vez de estar siempre o nunca.
  second_confirmer_above_credits integer,
  updated_at               timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (globe_workspace_id)
);

GRANT SELECT ON greenhouse_core.globe_credit_funding_policies TO greenhouse_runtime;

-- El workspace interno queda explicito, no implicito por ausencia de fila: que el default sea OFF
-- deberia leerse en la tabla, no deducirse.
INSERT INTO greenhouse_core.globe_credit_funding_policies
  (globe_workspace_id, requires_second_confirmer, second_confirmer_above_credits)
VALUES ('greenhouse-org:efeonce', FALSE, NULL)
ON CONFLICT (globe_workspace_id) DO NOTHING;

-- El CHECK incondicional se va. Un CHECK no puede consultar otra tabla, y esta regla depende de una
-- politica por workspace — asi que su lugar es un trigger, no una constraint de fila.
ALTER TABLE greenhouse_core.globe_credit_funding_intents
  DROP CONSTRAINT IF EXISTS globe_credit_funding_intents_confirmer_not_proposer;

-- Lo que SI sigue siendo constraint de fila: una confirmacion siempre dice contra quien confirma.
-- Perder eso volveria la evidencia opcional, que es lo contrario de lo que este carril existe para dar.
ALTER TABLE greenhouse_core.globe_credit_funding_intents
  ADD CONSTRAINT globe_credit_funding_intents_confirm_records_proposer CHECK (
    phase = 'proposed' OR proposed_by_user_id IS NOT NULL
  );

CREATE OR REPLACE FUNCTION greenhouse_core.enforce_globe_credit_funding_intent_authority()
RETURNS trigger AS $$
DECLARE
  policy_requires boolean := FALSE;
  policy_threshold integer;
  plan_credits integer;
BEGIN
  -- INVARIANTE 1, siempre: el agente propone, nunca confirma. Un principal de servicio no puede
  -- figurar como el humano que aprueba. Esto NO es politica y no se apaga.
  IF NEW.actor_user_id LIKE 'globe:service:%' OR NEW.actor_user_id LIKE 'service:%' THEN
    RAISE EXCEPTION 'globe_credit_funding_intent_actor_must_be_human';
  END IF;

  IF NEW.phase <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT p.requires_second_confirmer, p.second_confirmer_above_credits
    INTO policy_requires, policy_threshold
    FROM greenhouse_core.globe_credit_funding_policies p
   WHERE p.globe_workspace_id = NEW.globe_workspace_id;

  -- Sin fila de politica se asume el default declarado (OFF). Fallar cerrado aca reintroduciria el
  -- control que nadie puede satisfacer para cualquier workspace todavia sin configurar.
  policy_requires := COALESCE(policy_requires, FALSE);

  -- El techo por operacion: aunque la politica base este en OFF, un monto por encima del umbral
  -- exige el segundo confirmador. Es "umbral de aprobacion", como cualquier tesoreria real.
  IF policy_threshold IS NOT NULL THEN
    plan_credits := NULLIF(NEW.plan #>> '{grantCredits}', '')::integer;
    IF plan_credits IS NOT NULL AND plan_credits > policy_threshold THEN
      policy_requires := TRUE;
    END IF;
  END IF;

  IF policy_requires AND NEW.proposed_by_user_id = NEW.actor_user_id THEN
    RAISE EXCEPTION 'globe_credit_funding_second_confirmer_required';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS globe_credit_funding_intents_authority ON greenhouse_core.globe_credit_funding_intents;
CREATE TRIGGER globe_credit_funding_intents_authority
  BEFORE INSERT ON greenhouse_core.globe_credit_funding_intents
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.enforce_globe_credit_funding_intent_authority();

-- Anti pre-up-marker bug guard (ISSUE-068).
DO $$
DECLARE
  hard_check_gone boolean;
  policy_row_exists boolean;
  trigger_exists boolean;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'globe_credit_funding_intents_confirmer_not_proposer'
  ) INTO hard_check_gone;
  IF NOT hard_check_gone THEN
    RAISE EXCEPTION 'TASK-1566 correccion: el CHECK incondicional sigue presente.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM greenhouse_core.globe_credit_funding_policies
    WHERE globe_workspace_id = 'greenhouse-org:efeonce'
  ) INTO policy_row_exists;
  IF NOT policy_row_exists THEN
    RAISE EXCEPTION 'TASK-1566 correccion: falta la fila de politica del workspace interno.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'globe_credit_funding_intents_authority'
  ) INTO trigger_exists;
  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'TASK-1566 correccion: falta el trigger de autoridad.';
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS globe_credit_funding_intents_authority ON greenhouse_core.globe_credit_funding_intents;
DROP FUNCTION IF EXISTS greenhouse_core.enforce_globe_credit_funding_intent_authority();
ALTER TABLE greenhouse_core.globe_credit_funding_intents
  DROP CONSTRAINT IF EXISTS globe_credit_funding_intents_confirm_records_proposer;
DROP TABLE IF EXISTS greenhouse_core.globe_credit_funding_policies;
