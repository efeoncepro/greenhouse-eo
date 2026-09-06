-- Up Migration

-- TASK-1837 (EPIC-044 U12) — Entrega gobernada de la invitación externa + autoridad delegada.
--
-- Additive: el token sigue viviendo SÓLO como `token_hash`. Nada acá agrega una columna con el
-- secreto, ni cifrado ni codificado. Lo que se agrega es el CICLO DE VIDA DE LA ENTREGA
-- (¿salió el correo? ¿rebotó? ¿cuántas veces se intentó?) para que una invitación que nunca llegó
-- deje de ser indistinguible de una que llegó y no se usó.

-- 1. Estado de entrega sobre la invitación.
ALTER TABLE greenhouse_core.external_member_invitations
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'not_attempted',
  ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_delivery_error_code TEXT;

ALTER TABLE greenhouse_core.external_member_invitations
  DROP CONSTRAINT IF EXISTS external_member_invitations_delivery_status_valid;
ALTER TABLE greenhouse_core.external_member_invitations
  ADD CONSTRAINT external_member_invitations_delivery_status_valid
  CHECK (delivery_status IN ('not_attempted', 'sent', 'delivered', 'bounced', 'failed'));

ALTER TABLE greenhouse_core.external_member_invitations
  DROP CONSTRAINT IF EXISTS external_member_invitations_delivery_attempts_nonnegative;
ALTER TABLE greenhouse_core.external_member_invitations
  ADD CONSTRAINT external_member_invitations_delivery_attempts_nonnegative
  CHECK (delivery_attempts >= 0);

-- Señal `identity.external_invitation.undelivered` lee invitaciones abiertas por estado de entrega.
CREATE INDEX IF NOT EXISTS external_member_invitations_open_delivery_idx
  ON greenhouse_core.external_member_invitations (binding_id, delivery_status)
  WHERE status = 'issued';

-- 2. Audit: nuevos actos del ciclo de vida (reenvío = rotación, revelación gobernada, entrega
--    fallida/rebotada, administrador designado fijado/retirado). Mismo patrón que TASK-1836.
ALTER TABLE greenhouse_core.external_identity_audit_log DROP CONSTRAINT external_identity_audit_log_event_type_valid;
ALTER TABLE greenhouse_core.external_identity_audit_log ADD CONSTRAINT external_identity_audit_log_event_type_valid CHECK(event_type IN (
 'environment_upserted','organization_bound','capability_granted','invitation_issued','invitation_linked',
 'binding_revoked','grant_revoked','member_revoked','invitation_revoked','binding_reconciled','grant_reconciled','internal_member_linked',
 'invitation_resent','invitation_token_revealed','invitation_delivery_failed','invitation_delivery_bounced',
 'designated_admin_assigned','designated_admin_cleared'));

-- 3. Capabilities nuevas (una autoridad por command; grant a ≥1 rol real en `runtime.ts`, mismo PR).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('identity.external_invitation.reveal_token', 'organization', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1837 — Excepción gobernada: rotar y revelar UNA vez un enlace de invitación de 1 hora, con razón obligatoria y auditoría (nunca el valor del token).', NOW(), NULL),
  ('identity.external_invitation.issue_delegated', 'organization', ARRAY['create'], ARRAY['tenant'],
   'TASK-1837 — Autoridad delegada: el administrador designado de una organización cliente invita personas de su propio binding.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions, allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description, deprecated_at = NULL;

-- 4. Kill-switch operable del correo de invitación (misma semántica que `auth_server_magic_link`,
--    TASK-1830: nace ENABLED porque el gate real es `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED`;
--    sembrarla apagada reproduciría el modo de falla "la respuesta dice enviado y el correo no sale").
INSERT INTO greenhouse_notifications.email_type_config (email_type, enabled, paused_reason)
VALUES ('external_access_invitation', TRUE, NULL)
ON CONFLICT (email_type) DO NOTHING;

-- Anti pre-up-marker guard (ISSUE-068): aborta si el DDL/seed no quedó aplicado.
DO $$
DECLARE
  invitations_table oid := 'greenhouse_core.external_member_invitations'::regclass;
  audit_table oid := 'greenhouse_core.external_identity_audit_log'::regclass;
  col_count integer;
  cap_count integer;
  seeded_enabled boolean;
BEGIN
  SELECT count(*) INTO col_count FROM information_schema.columns
   WHERE table_schema = 'greenhouse_core' AND table_name = 'external_member_invitations'
     AND column_name IN ('delivery_status', 'delivery_attempts', 'last_delivery_at', 'last_delivery_error_code');
  IF col_count <> 4 THEN
    RAISE EXCEPTION 'TASK-1837 anti pre-up-marker check: expected 4 delivery columns, found %', col_count;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = invitations_table
      AND conname = 'external_member_invitations_delivery_status_valid' AND convalidated) THEN
    RAISE EXCEPTION 'TASK-1837 anti pre-up-marker check: delivery_status CHECK missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = audit_table
      AND conname = 'external_identity_audit_log_event_type_valid' AND convalidated
      AND pg_get_constraintdef(oid) LIKE '%invitation_resent%'
      AND pg_get_constraintdef(oid) LIKE '%invitation_token_revealed%'
      AND pg_get_constraintdef(oid) LIKE '%invitation_delivery_bounced%'
      AND pg_get_constraintdef(oid) LIKE '%designated_admin_assigned%') THEN
    RAISE EXCEPTION 'TASK-1837 anti pre-up-marker check: audit event_type CHECK not extended';
  END IF;

  SELECT count(*) INTO cap_count FROM greenhouse_core.capabilities_registry
   WHERE capability_key IN ('identity.external_invitation.reveal_token', 'identity.external_invitation.issue_delegated')
     AND deprecated_at IS NULL;
  IF cap_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1837 anti pre-up-marker check: expected 2 active capabilities, found %', cap_count;
  END IF;

  SELECT enabled INTO seeded_enabled FROM greenhouse_notifications.email_type_config
   WHERE email_type = 'external_access_invitation';
  IF seeded_enabled IS NULL THEN
    RAISE EXCEPTION 'TASK-1837 anti pre-up-marker check: email_type_config row for external_access_invitation missing';
  END IF;
END
$$;

-- Down Migration

-- Additive y forward-friendly: las columnas de entrega y el CHECK ampliado se conservan (perder el
-- historial de entrega no repara nada; el CHECK sólo ADMITE valores). Lo que se retira es la
-- AUTORIDAD y el correo: capabilities deprecadas (append-only, nunca DELETE) y kill-switch apagado.
UPDATE greenhouse_core.capabilities_registry
   SET deprecated_at = NOW()
 WHERE capability_key IN ('identity.external_invitation.reveal_token', 'identity.external_invitation.issue_delegated')
   AND deprecated_at IS NULL;

UPDATE greenhouse_notifications.email_type_config
   SET enabled = FALSE,
       paused_reason = 'TASK-1837 rollback: entrega del sistema retirada; el correo de invitación queda apagado.'
 WHERE email_type = 'external_access_invitation';
