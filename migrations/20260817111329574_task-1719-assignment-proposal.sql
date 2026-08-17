-- Up Migration

-- ══════════════════════════════════════════════════════════════════════════════
-- TASK-1719 Slice 2 — Ledger de propuestas de asignación (propose → confirm).
--
-- POR QUÉ EXISTE: el command `assignAssessmentFromPolicy` es idempotente y resuelve
-- la plantilla server-side, pero un humano necesita VER qué va a pasar antes de que
-- pase. La propuesta es ese preview durable: se calcula una vez, se muestra, y el
-- confirm recibe SÓLO su `proposal_id` — nunca un `templateId` elegido por el caller
-- (ADR D2: el caller jamás elige la plantilla).
--
-- `effect_digest` es lo que ata las dos mitades: hashea el efecto que el operador
-- VIO. Si entre el preview y el confirm cambia la policy, su versión, el contenido
-- del cuestionario o el estado de la postulación, el digest deja de coincidir y el
-- confirm responde `stale: effect_changed` en vez de ejecutar algo distinto de lo
-- que la persona aprobó.
--
-- `preview_json` es PII-free por contrato: labels, versiones, banderas y reason
-- codes. NUNCA nombre, correo, token ni respuestas del candidato.
--
-- SOBRE `expires_at`: ningún otro ledger de propuestas del repo lo persiste — la
-- vigencia se resuelve recomputando el digest. Acá existe porque cubre un caso que
-- el digest NO cubre: que el mundo no haya cambiado pero hayan pasado horas. Un
-- operador que abre el diálogo, se va, y vuelve a confirmar el envío de un correo a
-- un candidato debería volver a mirar. Se ENFORCEA server-side en el confirm; el
-- único precedente de `expiresAt` en el repo (Nexa) es cosmético y no se copia.
--
-- GRANTS: el confirm MUTA la fila, así que runtime necesita UPDATE — pero acotado
-- por columna. Van en esta misma migración a propósito: en TASK-1735 el ledger de
-- propuestas del expediente nació sin ellos y hubo que arreglarlo en una segunda
-- migración, con el write fallando en runtime mientras tanto.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_assignment_proposal (
  proposal_id     TEXT PRIMARY KEY DEFAULT ('haap-' || gen_random_uuid()::text),
  application_id  TEXT NOT NULL
                    REFERENCES greenhouse_hiring.hiring_application (application_id) ON DELETE RESTRICT,
  policy_id       TEXT NOT NULL
                    REFERENCES greenhouse_hiring.hiring_opening_assessment_policy (policy_id) ON DELETE RESTRICT,
  policy_version  INTEGER NOT NULL CHECK (policy_version >= 1),
  effect_digest   TEXT NOT NULL CHECK (length(effect_digest) BETWEEN 16 AND 128),
  preview_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'proposed'
                    CHECK (status IN ('proposed', 'confirmed', 'expired', 'superseded')),
  proposed_by     TEXT NOT NULL,
  confirmed_by    TEXT,
  assignment_id   TEXT
                    REFERENCES greenhouse_hiring.hiring_assessment_assignment (assignment_id) ON DELETE RESTRICT,
  expires_at      TIMESTAMPTZ NOT NULL,
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Una propuesta confirmada SIEMPRE declara quién y cuándo: un `confirmed` sin actor
  -- sería un ledger que no puede responder "¿quién autorizó este correo al candidato?".
  CONSTRAINT hiring_assessment_assignment_proposal_confirmed_ck
    CHECK (status <> 'confirmed' OR (confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL))
);

-- Idempotencia del propose: reabrir el diálogo sobre el MISMO estado devuelve la misma
-- propuesta en vez de acumular filas. Si el estado cambió, cambia el digest ⇒ nace otra,
-- y la anterior queda sin poder confirmarse (su digest ya no describe la realidad).
CREATE UNIQUE INDEX IF NOT EXISTS hiring_assessment_assignment_proposal_active_idx
  ON greenhouse_hiring.hiring_assessment_assignment_proposal (application_id, effect_digest)
  WHERE status = 'proposed';

CREATE INDEX IF NOT EXISTS hiring_assessment_assignment_proposal_application_idx
  ON greenhouse_hiring.hiring_assessment_assignment_proposal (application_id, created_at DESC);

-- Anti pre-up-marker: si el DDL no corrió de verdad, abortar en vez de registrar la
-- migración como aplicada con la sección Up vacía.
DO $$
DECLARE table_ok boolean; active_idx_ok boolean; confirmed_ck_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'greenhouse_hiring'
       AND table_name = 'hiring_assessment_assignment_proposal'
  ) INTO table_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'greenhouse_hiring'
       AND indexname = 'hiring_assessment_assignment_proposal_active_idx'
  ) INTO active_idx_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'hiring_assessment_assignment_proposal_confirmed_ck'
  ) INTO confirmed_ck_ok;

  IF NOT table_ok OR NOT active_idx_ok OR NOT confirmed_ck_ok THEN
    RAISE EXCEPTION 'TASK-1719 Slice 2 anti pre-up-marker check failed: table=% active_idx=% confirmed_ck=%',
      table_ok, active_idx_ok, confirmed_ck_ok;
  END IF;
END
$$;

ALTER TABLE greenhouse_hiring.hiring_assessment_assignment_proposal OWNER TO greenhouse_ops;

GRANT SELECT, INSERT ON greenhouse_hiring.hiring_assessment_assignment_proposal TO greenhouse_runtime;

-- UPDATE acotado por columna: el confirm cierra la propuesta y le cuelga el assignment.
-- El contenido de lo propuesto (`preview_json`, `effect_digest`, `policy_version`,
-- `proposed_by`) es INMUTABLE — si runtime pudiera reescribirlo, el digest dejaría de
-- ser prueba de lo que la persona aprobó.
GRANT UPDATE (status, confirmed_by, confirmed_at, assignment_id, updated_at)
  ON greenhouse_hiring.hiring_assessment_assignment_proposal TO greenhouse_runtime;

DO $$
DECLARE update_grant_ok boolean; immutable_leak boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.column_privileges
     WHERE table_schema = 'greenhouse_hiring'
       AND table_name = 'hiring_assessment_assignment_proposal'
       AND grantee = 'greenhouse_runtime'
       AND privilege_type = 'UPDATE'
       AND column_name = 'status'
  ) INTO update_grant_ok;

  -- El grant tiene que ser ACOTADO: si runtime puede escribir el digest o el preview,
  -- el ledger deja de probar qué aprobó la persona.
  SELECT EXISTS (
    SELECT 1 FROM information_schema.column_privileges
     WHERE table_schema = 'greenhouse_hiring'
       AND table_name = 'hiring_assessment_assignment_proposal'
       AND grantee = 'greenhouse_runtime'
       AND privilege_type = 'UPDATE'
       AND column_name IN ('effect_digest', 'preview_json', 'policy_version', 'proposed_by')
  ) INTO immutable_leak;

  IF NOT update_grant_ok THEN
    RAISE EXCEPTION 'TASK-1719 Slice 2: falta el GRANT UPDATE(status) a greenhouse_runtime.';
  END IF;

  IF immutable_leak THEN
    RAISE EXCEPTION 'TASK-1719 Slice 2: runtime puede escribir columnas inmutables de la propuesta.';
  END IF;
END
$$;

COMMENT ON TABLE greenhouse_hiring.hiring_assessment_assignment_proposal IS
  'TASK-1719 Slice 2 — preview durable de una asignación de assessment. El confirm recibe sólo proposal_id; effect_digest ata lo confirmado a lo que el operador vio. preview_json es PII-free.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_hiring.hiring_assessment_assignment_proposal_application_idx;
DROP INDEX IF EXISTS greenhouse_hiring.hiring_assessment_assignment_proposal_active_idx;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_assignment_proposal;
