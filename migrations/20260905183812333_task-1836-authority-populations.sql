-- Up Migration
-- TASK-1836: explicit authority population; run through governed migration runner while internal auth is OFF.
SET LOCAL search_path = greenhouse_core, public;
ALTER TABLE greenhouse_core.external_organization_bindings ADD COLUMN IF NOT EXISTS population text NOT NULL DEFAULT 'external'
 CONSTRAINT external_organization_bindings_population_valid CHECK(population IN ('external','internal'));
-- Classification is based on durable verified enrollment, not issuer class, email, or reference naming.
DO $$ BEGIN
 IF EXISTS (
  SELECT 1 FROM greenhouse_core.internal_native_enrollments e
  JOIN greenhouse_core.external_organization_bindings b ON b.binding_id=e.binding_id
  LEFT JOIN greenhouse_core.organizations o ON o.organization_id=b.organization_id
  LEFT JOIN greenhouse_core.identity_profile_source_links n ON n.link_id=e.native_link_id
  LEFT JOIN greenhouse_core.identity_profile_source_links u ON u.link_id=e.upstream_link_id
  WHERE b.environment_id<>e.environment_id OR o.public_id IS DISTINCT FROM 'EO-ORG-0007'
    OR o.is_operating_entity IS DISTINCT FROM TRUE
    OR NOT EXISTS(SELECT 1 FROM greenhouse_core.client_users cu WHERE cu.identity_profile_id=e.profile_id AND lower(cu.microsoft_tenant_id)=e.tenant_id::text AND lower(cu.microsoft_oid)=e.object_id::text)
    OR n.profile_id IS DISTINCT FROM e.profile_id OR n.source_system IS DISTINCT FROM 'external_idp:'||e.environment_id
    OR n.source_object_type IS DISTINCT FROM 'subject'
    OR u.profile_id IS DISTINCT FROM e.profile_id OR u.source_system IS DISTINCT FROM 'azure_ad'
    OR u.source_object_type IS DISTINCT FROM 'user' OR lower(u.source_object_id) IS DISTINCT FROM e.object_id::text
    OR NOT EXISTS(SELECT 1 FROM greenhouse_core.internal_native_access_audit a WHERE a.enrollment_id=e.enrollment_id AND a.event_type='enrolled')
 ) THEN RAISE EXCEPTION 'internal authority classification requires reconciled enrollment evidence'; END IF;
 IF EXISTS (
  SELECT 1 FROM greenhouse_core.external_organization_bindings b
  WHERE b.population='external' AND EXISTS(SELECT 1 FROM greenhouse_core.internal_native_enrollments e WHERE e.binding_id=b.binding_id)
    AND (EXISTS(SELECT 1 FROM greenhouse_core.external_member_invitations i WHERE i.binding_id=b.binding_id)
      OR EXISTS(SELECT 1 FROM greenhouse_core.external_capability_grants g WHERE g.binding_id=b.binding_id
        AND (g.profile_id IS NULL OR g.expires_at IS NULL OR NOT EXISTS(SELECT 1 FROM greenhouse_core.internal_native_enrollments e
          WHERE e.binding_id=b.binding_id AND e.profile_id=g.profile_id AND e.environment_id=b.environment_id)
        OR NOT EXISTS(SELECT 1 FROM greenhouse_core.internal_native_access_audit a JOIN greenhouse_core.internal_native_enrollments e ON e.enrollment_id=a.enrollment_id
          WHERE e.binding_id=b.binding_id AND e.profile_id=g.profile_id AND a.event_type='capability_granted' AND a.metadata_json->>'grantId'=g.grant_id
          AND a.audit_id=(SELECT latest.audit_id FROM greenhouse_core.internal_native_access_audit latest
            JOIN greenhouse_core.internal_native_enrollments le ON le.enrollment_id=latest.enrollment_id
            WHERE le.binding_id=b.binding_id AND latest.event_type='capability_granted'
              AND latest.metadata_json->>'grantId'=g.grant_id ORDER BY latest.created_at DESC,latest.audit_id DESC LIMIT 1)
          AND a.metadata_json->>'capability'=g.capability
          AND (a.metadata_json->>'expiresAt')::timestamptz=g.expires_at)))
      OR EXISTS(SELECT 1 FROM greenhouse_core.external_identity_audit_log a WHERE a.binding_id=b.binding_id AND a.event_type IN ('organization_bound','capability_granted','invitation_linked')))
 ) THEN RAISE EXCEPTION 'mixed authority population requires operator reconciliation'; END IF;
END $$;
UPDATE greenhouse_core.external_organization_bindings b SET population='internal',grants_version=grants_version+1,updated_at=NOW()
 WHERE b.population='external' AND EXISTS(SELECT 1 FROM greenhouse_core.internal_native_enrollments e WHERE e.binding_id=b.binding_id);
CREATE OR REPLACE FUNCTION greenhouse_core.guard_authority_population_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.population IS DISTINCT FROM OLD.population THEN RAISE EXCEPTION 'authority population is immutable'; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS authority_population_immutable ON greenhouse_core.external_organization_bindings;
CREATE TRIGGER authority_population_immutable BEFORE UPDATE OF population ON greenhouse_core.external_organization_bindings
 FOR EACH ROW EXECUTE FUNCTION greenhouse_core.guard_authority_population_immutable();
ALTER FUNCTION greenhouse_core.guard_authority_population_immutable() OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.external_identity_audit_log DROP CONSTRAINT external_identity_audit_log_event_type_valid;
ALTER TABLE greenhouse_core.external_identity_audit_log ADD CONSTRAINT external_identity_audit_log_event_type_valid CHECK(event_type IN (
 'environment_upserted','organization_bound','capability_granted','invitation_issued','invitation_linked',
 'binding_revoked','grant_revoked','member_revoked','invitation_revoked','binding_reconciled','grant_reconciled','internal_member_linked'));

ALTER TABLE greenhouse_core.external_access_resolution_log DROP CONSTRAINT external_access_resolution_log_outcome_valid;
ALTER TABLE greenhouse_core.external_access_resolution_log ADD CONSTRAINT external_access_resolution_log_outcome_valid
 CHECK(outcome IN ('bound','unbound','revoked','environment_inactive','profile_inactive','internal_population'));

-- Postcondition guard: a pre-up marker must never certify missing population infrastructure.
DO $$
DECLARE binding_table oid := 'greenhouse_core.external_organization_bindings'::regclass;
        audit_table oid := 'greenhouse_core.external_identity_audit_log'::regclass;
        population_att smallint;
BEGIN
 SELECT attnum INTO population_att FROM pg_attribute WHERE attrelid=binding_table AND attname='population' AND attnotnull AND NOT attisdropped;
 IF population_att IS NULL OR NOT EXISTS(SELECT 1 FROM pg_attrdef WHERE adrelid=binding_table AND adnum=population_att AND pg_get_expr(adbin,adrelid)='''external''::text')
 THEN RAISE EXCEPTION 'authority population column/default missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=binding_table AND conname='external_organization_bindings_population_valid' AND convalidated
   AND pg_get_constraintdef(oid) LIKE '%external%' AND pg_get_constraintdef(oid) LIKE '%internal%')
 THEN RAISE EXCEPTION 'authority population check missing'; END IF;
 IF to_regprocedure('greenhouse_core.guard_authority_population_immutable()') IS NULL OR NOT EXISTS(
   SELECT 1 FROM pg_trigger WHERE tgrelid=binding_table AND tgname='authority_population_immutable' AND tgenabled<>'D'
     AND tgfoid=to_regprocedure('greenhouse_core.guard_authority_population_immutable()'))
 THEN RAISE EXCEPTION 'authority population immutability missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=audit_table AND conname='external_identity_audit_log_event_type_valid' AND convalidated
   AND pg_get_constraintdef(oid) LIKE '%binding_reconciled%' AND pg_get_constraintdef(oid) LIKE '%grant_reconciled%'
   AND pg_get_constraintdef(oid) LIKE '%internal_member_linked%')
 THEN RAISE EXCEPTION 'authority reconciliation audit contract missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='greenhouse_core.external_access_resolution_log'::regclass
   AND conname='external_access_resolution_log_outcome_valid' AND convalidated
   AND pg_get_constraintdef(oid) LIKE '%internal_population%')
 THEN RAISE EXCEPTION 'authority population resolution contract missing'; END IF;
 IF (SELECT count(*) FROM greenhouse_core.external_organization_bindings WHERE population='internal')
   <> (SELECT count(DISTINCT binding_id) FROM greenhouse_core.internal_native_enrollments)
 THEN RAISE EXCEPTION 'authority population classification count mismatch'; END IF;
END $$;

-- Down Migration
-- Forward-only: removing population would merge authority contracts and cannot restore historical authorization.
DO $$ BEGIN RAISE EXCEPTION 'TASK-1836 is forward-only; disable internal authority and use a new governed correction'; END $$;
