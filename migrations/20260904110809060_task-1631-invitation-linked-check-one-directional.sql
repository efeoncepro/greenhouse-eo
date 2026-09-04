-- Up Migration
-- TASK-1631 — Forward fix del CHECK `external_member_invitations_linked_consistent`.
--
-- La versión de 20260904104914802 era BIDIRECCIONAL: `(status = 'linked') = (linked_at, profile_id,
-- link_id NOT NULL)`. Una membership ligada que se revoca conserva su evidencia de vínculo (linked_at,
-- profile_id, link_id) y pasa a `revoked`, así que el lado derecho seguía TRUE con el izquierdo FALSE
-- y el UPDATE fallaba. Lo atrapó el smoke live (`pnpm identity:external-access:smoke -- --apply`),
-- no los tests con mocks. El invariante correcto es unidireccional: estar `linked` EXIGE la evidencia;
-- dejar de estarlo no la borra (el audit y la revocación la necesitan).

ALTER TABLE greenhouse_core.external_member_invitations
  DROP CONSTRAINT IF EXISTS external_member_invitations_linked_consistent;

ALTER TABLE greenhouse_core.external_member_invitations
  ADD CONSTRAINT external_member_invitations_linked_consistent
  CHECK (status <> 'linked' OR (linked_at IS NOT NULL AND profile_id IS NOT NULL AND link_id IS NOT NULL));

DO $$
DECLARE
  constraint_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conrelid = 'greenhouse_core.external_member_invitations'::regclass
    AND conname = 'external_member_invitations_linked_consistent';

  IF constraint_def IS NULL OR constraint_def NOT LIKE '%<> ''linked''%' THEN
    RAISE EXCEPTION 'TASK-1631 anti pre-up-marker check: el CHECK linked_consistent no quedó unidireccional (%).', constraint_def;
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_core.external_member_invitations
  DROP CONSTRAINT IF EXISTS external_member_invitations_linked_consistent;

ALTER TABLE greenhouse_core.external_member_invitations
  ADD CONSTRAINT external_member_invitations_linked_consistent
  CHECK ((status = 'linked') = (linked_at IS NOT NULL AND profile_id IS NOT NULL AND link_id IS NOT NULL));
