-- Up Migration

-- TASK-1566 Slice 5 (ADR-015) — la intencion humana de fondeo de credito de Globe, del lado de Greenhouse.
--
-- Por que esta tabla existe y no alcanza con lo que Globe ya persiste: Globe guarda la PROPUESTA y su
-- estado, pero su `assertHumanAttribution` es SHAPE-ONLY — rechaza `globe:service:` y exige un
-- entitlement no vacio, y NO puede verificar que la atribucion humana venga de una sesion autenticada,
-- porque Globe no tiene las sesiones. Sin esta tabla, un caller de workload que Greenhouse puede asumir
-- confirmaria con una atribucion HUMANA FABRICADA, que es el mismo maker-checker vacuo que ADR-015
-- documenta, movido un nivel.
--
-- Aca la atribucion se vuelve EXIGIBLE: cada fila la escribe una ruta gobernada de Greenhouse, con la
-- sesion del operador y su entitlement resueltos server-side, y es append-only.

CREATE TABLE IF NOT EXISTS greenhouse_core.globe_credit_funding_intents (
  intent_id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  -- El workspace de Globe (`greenhouse-org:<slug>`), no un id interno: es la clave con la que viaja
  -- el comando y con la que Globe resuelve su tenant.
  globe_workspace_id     text        NOT NULL,
  proposal_id            text        NOT NULL,
  phase                  text        NOT NULL CHECK (phase IN ('proposed', 'confirmed')),
  -- Quien propuso y quien confirmo, como identidades de Greenhouse resueltas de la sesion.
  actor_user_id          text        NOT NULL,
  actor_entitlement      text        NOT NULL CHECK (length(btrim(actor_entitlement)) >= 3),
  -- Solo en `confirmed`: contra quien se compara la disyuncion.
  proposed_by_user_id    text,
  plan_fingerprint       text        NOT NULL,
  -- El plan tal como se le mostro al humano. Se guarda entero: confirmar es aprobar ESE plan, y
  -- reconstruirlo despues desde el estado vigente daria otro.
  plan                   jsonb       NOT NULL,
  correlation_id         text        NOT NULL,
  idempotency_key        text        NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (intent_id),
  -- Una intencion por fase y propuesta: dos `confirm` sobre la misma propuesta no pueden coexistir.
  UNIQUE (globe_workspace_id, proposal_id, phase),
  -- Idempotencia de la ruta, tenant-scoped.
  UNIQUE (globe_workspace_id, idempotency_key),
  -- El invariante que NO se relaja: quien confirma no puede ser quien propuso. Vive en la BASE y no
  -- en TypeScript porque el TS no corre en la base — y este es justamente el control que en Globe
  -- resultaba vacuo por comparar contra una CONSTANTE de clase de servicio.
  CONSTRAINT globe_credit_funding_intents_confirmer_not_proposer CHECK (
    phase = 'proposed'
    OR (proposed_by_user_id IS NOT NULL AND proposed_by_user_id <> actor_user_id)
  )
);

CREATE INDEX IF NOT EXISTS globe_credit_funding_intents_workspace_created_idx
  ON greenhouse_core.globe_credit_funding_intents (globe_workspace_id, created_at DESC);

-- Append-only: la evidencia de quien aprobo un movimiento de dinero no se edita ni se borra. Un
-- cambio de intencion es una fila nueva, nunca un UPDATE sobre la anterior.
CREATE OR REPLACE FUNCTION greenhouse_core.reject_globe_credit_funding_intent_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'globe_credit_funding_intents is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS globe_credit_funding_intents_no_update ON greenhouse_core.globe_credit_funding_intents;
CREATE TRIGGER globe_credit_funding_intents_no_update
  BEFORE UPDATE ON greenhouse_core.globe_credit_funding_intents
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.reject_globe_credit_funding_intent_mutation();

DROP TRIGGER IF EXISTS globe_credit_funding_intents_no_delete ON greenhouse_core.globe_credit_funding_intents;
CREATE TRIGGER globe_credit_funding_intents_no_delete
  BEFORE DELETE ON greenhouse_core.globe_credit_funding_intents
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.reject_globe_credit_funding_intent_mutation();

GRANT SELECT, INSERT ON greenhouse_core.globe_credit_funding_intents TO greenhouse_runtime;

-- Capabilities del carril (parity con entitlements-catalog.ts, mismo PR que el grant en runtime.ts).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'platform.globe_credit_funding.propose',
    'platform',
    ARRAY['execute'],
    ARRAY['all'],
    'TASK-1566 — Proponer un plan de fondeo mensual de creditos de Globe. Read-only sobre Globe: no muta nada, devuelve el plan para revisar. Grant: EFEONCE_ADMIN.',
    NOW(),
    NULL
  ),
  (
    'platform.globe_credit_funding.confirm',
    'platform',
    ARRAY['execute'],
    ARRAY['all'],
    'TASK-1566 — Confirmar un plan de fondeo propuesto. UNICO punto que dispara la mutacion en Globe, y exige confirmante != proponente (CHECK en la tabla de intenciones). Grant: EFEONCE_ADMIN.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el DDL o el seed no quedaron aplicados. Un
-- runner que registre la migracion sin ejecutarla dejaria el carril fallando en runtime con el
-- registro diciendo que todo esta bien.
DO $$
DECLARE
  table_exists boolean;
  check_exists boolean;
  seeded_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core' AND table_name = 'globe_credit_funding_intents'
  ) INTO table_exists;
  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1566 anti pre-up-marker: globe_credit_funding_intents NO quedo creada.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'globe_credit_funding_intents_confirmer_not_proposer'
  ) INTO check_exists;
  IF NOT check_exists THEN
    RAISE EXCEPTION 'TASK-1566 anti pre-up-marker: falta el CHECK de confirmante != proponente.';
  END IF;

  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('platform.globe_credit_funding.propose', 'platform.globe_credit_funding.confirm')
    AND deprecated_at IS NULL;
  IF seeded_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1566 anti pre-up-marker: se esperaban 2 capabilities sembradas, hay %.', seeded_count;
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS globe_credit_funding_intents_no_delete ON greenhouse_core.globe_credit_funding_intents;
DROP TRIGGER IF EXISTS globe_credit_funding_intents_no_update ON greenhouse_core.globe_credit_funding_intents;
DROP FUNCTION IF EXISTS greenhouse_core.reject_globe_credit_funding_intent_mutation();
DROP TABLE IF EXISTS greenhouse_core.globe_credit_funding_intents;
DELETE FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('platform.globe_credit_funding.propose', 'platform.globe_credit_funding.confirm');
