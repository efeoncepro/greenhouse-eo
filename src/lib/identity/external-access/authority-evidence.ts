/** Canonical audit/outbox evidence for identity authority.
 * Reconciliation and reliability consume the same predicate. This fixed SQL fragment has
 * no caller-controlled identifiers or values; consumers parameterize their filters.
 * SQL behavior is exercised by internal-access/reconcile.live.test.ts and the reliability
 * external-identity-binding-signals.live.test.ts, including malformed/legacy evidence.
 */
export const AUTHORITY_EVIDENCE_SELECT = `
        SELECT a.binding_id, a.grant_id, a.event_type, b.environment_id, b.organization_id, b.population
          FROM greenhouse_core.external_identity_audit_log a
          JOIN greenhouse_core.external_organization_bindings b ON b.binding_id=a.binding_id
          LEFT JOIN greenhouse_core.external_capability_grants g ON g.grant_id=a.grant_id AND g.binding_id=b.binding_id
         WHERE a.outcome='applied' AND a.environment_id=b.environment_id AND a.organization_id=b.organization_id
           AND (a.metadata_json->>'population'=b.population OR
             (b.population='external' AND NOT a.metadata_json ? 'population'))
           AND ((a.event_type IN ('organization_bound','binding_reconciled') AND a.grant_id IS NULL)
             OR (a.event_type IN ('capability_granted','grant_reconciled') AND g.grant_id IS NOT NULL
               AND a.profile_id IS NOT DISTINCT FROM g.profile_id
               AND a.metadata_json->>'capability'=g.capability
               AND (b.population='external' OR a.metadata_json->>'expiresAt'=
                 to_char(g.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))))
           AND (a.event_type IN ('organization_bound','capability_granted') OR
             (b.population='internal' AND a.metadata_json @> '{"population":"internal","reconciliationVersion":1}'::jsonb))
           AND EXISTS (
             SELECT 1 FROM greenhouse_sync.outbox_events ev
              WHERE ev.aggregate_type='external_identity_binding' AND ev.aggregate_id=b.binding_id
                AND ev.event_type=CASE a.event_type
                  WHEN 'organization_bound' THEN 'identity.external_binding.bound'
                  WHEN 'binding_reconciled' THEN 'identity.external_binding.reconciled'
                  WHEN 'capability_granted' THEN 'identity.external_grant.granted'
                  WHEN 'grant_reconciled' THEN 'identity.external_grant.reconciled' END
                AND ev.payload_json @> '{"schemaVersion":1}'::jsonb
                AND ev.payload_json->>'bindingId'=b.binding_id
                AND ev.payload_json->>'environmentId'=b.environment_id
                AND ev.payload_json->>'organizationId'=b.organization_id
                AND (ev.payload_json->>'population'=b.population OR
                  (b.population='external' AND NOT ev.payload_json ? 'population'))
                AND ((ev.payload_json->'grantsVersion'=a.metadata_json->'grantsVersion'
                  AND jsonb_typeof(a.metadata_json->'grantsVersion')='number'
                  AND a.metadata_json->>'grantsVersion' ~ '^[1-9][0-9]*$') OR
                  (b.population='external' AND a.event_type='organization_bound'
                    AND NOT a.metadata_json ? 'grantsVersion' AND ev.payload_json->'grantsVersion'='1'::jsonb))
                AND (a.grant_id IS NULL OR (ev.payload_json->>'grantId'=g.grant_id
                  AND ev.payload_json->>'profileId' IS NOT DISTINCT FROM g.profile_id
                  AND ev.payload_json->>'capability'=g.capability))
                AND (a.event_type IN ('organization_bound','capability_granted') OR (
                  ev.payload_json @> '{"population":"internal","reconciliationVersion":1}'::jsonb
                  AND ev.payload_json->>'reconciliationId'=a.metadata_json->>'reconciliationId'
                  AND length(a.metadata_json->>'reconciliationId')>0
                ))
           )
`
