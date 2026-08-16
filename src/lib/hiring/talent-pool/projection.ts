import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * Rebuildable, PII-free projection. Safe to run at-least-once: memberships and evidence use
 * structural uniqueness; withdrawal/expiry membership state is never overwritten by reconciliation.
 */
export const reconcileTalentPoolProjection = async ({
  apply = false,
  actorUserId = null
}: { apply?: boolean; actorUserId?: string | null } = {}) =>
  withGreenhousePostgresTransaction(async client => {
    const inventory = await client.query<{
      total_facets: number
      active_process: number
      needs_reconsent: number
    }>(`SELECT COUNT(*)::int AS total_facets,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM greenhouse_hiring.hiring_application a
        WHERE a.candidate_facet_id=cf.candidate_facet_id
          AND a.stage NOT IN ('rejected','withdrawn','closed')
      ))::int AS active_process,
      COUNT(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM greenhouse_hiring.hiring_application a
        WHERE a.candidate_facet_id=cf.candidate_facet_id
          AND a.stage NOT IN ('rejected','withdrawn','closed')
      ))::int AS needs_reconsent
    FROM greenhouse_hiring.candidate_facet cf WHERE cf.status='active'`)

    if (!apply)
      return { mode: 'dry-run' as const, inventory: inventory.rows[0], membershipsCreated: 0, evidenceUpserted: 0 }

    const memberships = await client.query<{ membership_id: string; public_id: string; candidate_facet_id: string }>(
      `INSERT INTO greenhouse_hiring.talent_pool_membership
      (candidate_facet_id,lifecycle_status,backfill_classification,created_by)
     SELECT cf.candidate_facet_id,
       CASE WHEN EXISTS (SELECT 1 FROM greenhouse_hiring.hiring_application a
          WHERE a.candidate_facet_id=cf.candidate_facet_id AND a.stage NOT IN ('rejected','withdrawn','closed'))
         THEN 'active_process' ELSE 'needs_reconsent' END,
       CASE WHEN EXISTS (SELECT 1 FROM greenhouse_hiring.hiring_application a
          WHERE a.candidate_facet_id=cf.candidate_facet_id AND a.stage NOT IN ('rejected','withdrawn','closed'))
         THEN 'active_process' ELSE 'needs_reconsent' END,
       $1
     FROM greenhouse_hiring.candidate_facet cf WHERE cf.status='active'
     ON CONFLICT (candidate_facet_id) DO NOTHING
     RETURNING membership_id,public_id,candidate_facet_id`,
      [actorUserId]
    )

    if (memberships.rows.length) {
      await client.query(
        `INSERT INTO greenhouse_hiring.talent_pool_consent_event
        (membership_id,purpose,action,policy_version,source,evidence_ref,actor_type,idempotency_key,metadata_json)
       SELECT m.membership_id,'active_application','granted',cf.consent_policy_version,'historical_backfill',
              'candidate_facet:'||cf.candidate_facet_id,'backfill','task-1723:'||m.membership_id,
              jsonb_build_object('classification',m.backfill_classification)
       FROM greenhouse_hiring.talent_pool_membership m
       JOIN greenhouse_hiring.candidate_facet cf ON cf.candidate_facet_id=m.candidate_facet_id
       WHERE m.membership_id=ANY($1::text[]) AND m.lifecycle_status='active_process'
       ON CONFLICT (membership_id,purpose,idempotency_key) DO NOTHING`,
        [memberships.rows.map(row => row.membership_id)]
      )
      await client.query(
        `INSERT INTO greenhouse_hiring.talent_pool_activity
        (membership_id,activity_type,actor_user_id,idempotency_key,source_ref,details_json)
       SELECT membership_id,'membership_created',$2,'task-1723:'||membership_id,'historical_backfill',
              jsonb_build_object('classification',backfill_classification)
       FROM greenhouse_hiring.talent_pool_membership WHERE membership_id=ANY($1::text[])
       ON CONFLICT (membership_id,activity_type,idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`,
        [memberships.rows.map(row => row.membership_id), actorUserId]
      )
    }

    const applications = await client.query(
      `INSERT INTO greenhouse_hiring.talent_pool_evidence_projection
      (membership_id,source_type,source_id,application_id,capability_key,seniority,country_code,
       availability,evidence_state,observed_at,fresh_until)
     SELECT m.membership_id,'application',a.public_id,a.application_id,'__general__',
       COALESCE(o.public_seniority,o.seniority,cf.seniority),cf.residence_country_code,cf.availability,
       'observed',COALESCE(a.updated_at,a.created_at),COALESCE(a.updated_at,a.created_at)+INTERVAL '12 months'
     FROM greenhouse_hiring.talent_pool_membership m
     JOIN greenhouse_hiring.candidate_facet cf ON cf.candidate_facet_id=m.candidate_facet_id
     JOIN greenhouse_hiring.hiring_application a ON a.candidate_facet_id=cf.candidate_facet_id
     JOIN greenhouse_hiring.hiring_opening o ON o.opening_id=a.opening_id
     ON CONFLICT (membership_id,source_type,source_id,source_version,capability_key) DO UPDATE SET
       seniority=EXCLUDED.seniority,country_code=EXCLUDED.country_code,availability=EXCLUDED.availability,
       observed_at=EXCLUDED.observed_at,fresh_until=EXCLUDED.fresh_until,projected_at=NOW(),
       projection_version=greenhouse_hiring.talent_pool_evidence_projection.projection_version+1`
    )

    const skills = await client.query(
      `INSERT INTO greenhouse_hiring.talent_pool_evidence_projection
      (membership_id,source_type,source_id,application_id,capability_key,seniority,country_code,
       availability,evidence_state,observed_at,fresh_until)
     SELECT m.membership_id,'opening',o.public_id||':'||skill.skill_key,a.application_id,
       lower(regexp_replace(skill.skill_key,'[^a-zA-Z0-9]+','_','g')),
       COALESCE(o.public_seniority,o.seniority,cf.seniority),cf.residence_country_code,cf.availability,
       'declared',COALESCE(a.updated_at,a.created_at),COALESCE(a.updated_at,a.created_at)+INTERVAL '12 months'
     FROM greenhouse_hiring.talent_pool_membership m
     JOIN greenhouse_hiring.candidate_facet cf ON cf.candidate_facet_id=m.candidate_facet_id
     JOIN greenhouse_hiring.hiring_application a ON a.candidate_facet_id=cf.candidate_facet_id
     JOIN greenhouse_hiring.hiring_opening o ON o.opening_id=a.opening_id
     CROSS JOIN LATERAL unnest(o.public_skill_tags) AS skill(skill_key)
     WHERE trim(skill.skill_key)<>''
     ON CONFLICT (membership_id,source_type,source_id,source_version,capability_key) DO UPDATE SET
       observed_at=EXCLUDED.observed_at,fresh_until=EXCLUDED.fresh_until,projected_at=NOW(),
       projection_version=greenhouse_hiring.talent_pool_evidence_projection.projection_version+1`
    )

    const competencies = await client.query(
      `INSERT INTO greenhouse_hiring.talent_pool_evidence_projection
      (membership_id,source_type,source_id,application_id,capability_key,seniority,country_code,
       availability,evidence_state,result_band,observed_at,fresh_until)
     SELECT m.membership_id,'assessment_competency',r.result_id,a.application_id,c.key,
       cf.seniority,cf.residence_country_code,cf.availability,'evaluated',r.level_achieved,
       COALESCE(r.updated_at,r.created_at),COALESCE(r.updated_at,r.created_at)+INTERVAL '12 months'
     FROM greenhouse_hiring.talent_pool_membership m
     JOIN greenhouse_hiring.candidate_facet cf ON cf.candidate_facet_id=m.candidate_facet_id
     JOIN greenhouse_hiring.hiring_application a ON a.candidate_facet_id=cf.candidate_facet_id
     JOIN greenhouse_hiring.hiring_assessment asm ON asm.application_id=a.application_id
     JOIN greenhouse_hiring.hiring_competency_result r ON r.assessment_id=asm.assessment_id
     JOIN greenhouse_hiring.hiring_competency c ON c.competency_id=r.competency_id
     WHERE asm.status='scored'
     ON CONFLICT (membership_id,source_type,source_id,source_version,capability_key) DO UPDATE SET
       result_band=EXCLUDED.result_band,observed_at=EXCLUDED.observed_at,fresh_until=EXCLUDED.fresh_until,
       projected_at=NOW(),projection_version=greenhouse_hiring.talent_pool_evidence_projection.projection_version+1`
    )

    const evidenceUpserted = (applications.rowCount ?? 0) + (skills.rowCount ?? 0) + (competencies.rowCount ?? 0)

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.talentPoolMembership,
        aggregateId: 'talent-pool',
        eventType: EVENT_TYPES.talentPoolProjectionReconciled,
        payload: { membershipsCreated: memberships.rowCount ?? 0, evidenceUpserted }
      },
      client
    )

    return {
      mode: 'apply' as const,
      inventory: inventory.rows[0],
      membershipsCreated: memberships.rowCount ?? 0,
      evidenceUpserted
    }
  })
