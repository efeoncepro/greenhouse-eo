import { query } from '@/lib/db'
import { AUTHORITY_EVIDENCE_SELECT } from '@/lib/identity/external-access/authority-evidence'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

/**
 * TASK-1631 — Las señales canónicas del binding de identidad externa (steady = 0).
 *
 * Observan el schema de `src/lib/identity/external-access/**` desde Greenhouse, sin telemetría
 * cross-runtime: las dos primeras leen `external_access_resolution_log`, que el reader del gateway
 * alimenta SÓLO con denials (subject hasheado); las restantes leen el grafo y su evidencia canónica.
 *
 *  · unbound_dispatch_attempt — token válido de un environment que llegó al reader sin binding de
 *    persona (o con persona/environment inactivo). Alguien tiene un token y no es de nadie.
 *  · revoked_still_dispatching — el gateway sigue consultando por una persona cuyo binding fue
 *    revocado hace más de 5 minutos: el cliente sigue reintentando con una identidad muerta.
 *  · subject_collision — un subject `external_idp` resolviendo a más de un profile (incluye links
 *    inactivos: el índice único sólo protege los activos), o una persona con más de un subject
 *    activo en el mismo environment (el `sub` cambió entre clientes — pairwise en vivo).
 *  · orphan_grant — grant activo sobre un binding revocado o sobre un environment que ya no está
 *    activo: autoridad sin sujeto.
 */

export const EXTERNAL_BINDING_UNBOUND_DISPATCH_ATTEMPT_SIGNAL_ID = 'identity.external_binding.unbound_dispatch_attempt'
export const EXTERNAL_BINDING_REVOKED_STILL_DISPATCHING_SIGNAL_ID =
  'identity.external_binding.revoked_still_dispatching'
export const EXTERNAL_BINDING_SUBJECT_COLLISION_SIGNAL_ID = 'identity.external_binding.subject_collision'
export const EXTERNAL_BINDING_ORPHAN_GRANT_SIGNAL_ID = 'identity.external_binding.orphan_grant'

// TASK-1837 — ciclo de vida de la invitación (entrega, caducidad, excepción de revelación).
export const EXTERNAL_INVITATION_UNDELIVERED_SIGNAL_ID = 'identity.external_invitation.undelivered'
export const EXTERNAL_INVITATION_EXPIRED_UNACCEPTED_SIGNAL_ID = 'identity.external_invitation.expired_unaccepted'
export const EXTERNAL_INVITATION_TOKEN_REVEALED_SIGNAL_ID = 'identity.external_invitation.token_revealed'
const EXPIRED_WINDOW_DAYS = 7

const WINDOW_HOURS = 24
const REVOCATION_GRACE_MINUTES = 5

const DOC_REF = 'docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md'

type CountRow = { n: string | number }

const toCount = (rows: CountRow[]) => Number(rows[0]?.n ?? 0)

const severityByCount = (count: number, errorAt: number): ReliabilitySeverity =>
  count === 0 ? 'ok' : count >= errorAt ? 'error' : 'warning'

const buildSignal = ({
  signalId,
  source,
  label,
  kind,
  count,
  errorAt,
  summaryOk,
  summaryHit,
  metricLabel,
  sqlLabel,
  observedAt
}: {
  signalId: string
  source: string
  label: string
  kind: ReliabilitySignal['kind']
  count: number
  errorAt: number
  summaryOk: string
  summaryHit: (count: number) => string
  metricLabel: string
  sqlLabel: string
  observedAt: string
}): ReliabilitySignal => ({
  signalId,
  moduleKey: 'identity',
  kind,
  source,
  label,
  severity: severityByCount(count, errorAt),
  summary: count === 0 ? summaryOk : summaryHit(count),
  observedAt,
  evidence: [
    { kind: 'sql', label: sqlLabel, value: `${count}` },
    { kind: 'metric', label: metricLabel, value: `${count}` },
    { kind: 'doc', label: 'TASK-1631', value: DOC_REF }
  ]
})

const buildUnknownSignal = ({
  signalId,
  source,
  label,
  kind,
  observedAt,
  error
}: {
  signalId: string
  source: string
  label: string
  kind: ReliabilitySignal['kind']
  observedAt: string
  error: unknown
}): ReliabilitySignal => {
  captureWithDomain(error, 'identity', { tags: { task: 'TASK-1631', signal: signalId } })

  return {
    signalId,
    moduleKey: 'identity',
    kind,
    source,
    label,
    severity: 'unknown',
    summary: 'No se pudo leer la señal; revisar conectividad con PostgreSQL.',
    observedAt,
    evidence: [{ kind: 'doc', label: 'TASK-1631', value: DOC_REF }]
  }
}

export const getExternalBindingUnboundDispatchAttemptSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const signalId = EXTERNAL_BINDING_UNBOUND_DISPATCH_ATTEMPT_SIGNAL_ID
  const source = 'getExternalBindingUnboundDispatchAttemptSignal'
  const label = 'Tokens externos sin binding de persona (24h)'

  try {
    const count = toCount(
      await query<CountRow>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_core.external_access_resolution_log
          WHERE outcome IN ('unbound', 'environment_inactive', 'profile_inactive')
            AND resolved_at >= NOW() - ($1::text || ' hours')::interval`,
        [String(WINDOW_HOURS)]
      )
    )

    return buildSignal({
      signalId,
      source,
      label,
      kind: 'incident',
      count,
      errorAt: 20,
      summaryOk: 'Ningún token válido llegó al reader sin binding en las últimas 24h.',
      summaryHit: n => `${n} resoluciones denegadas por falta de binding/persona/environment en 24h.`,
      metricLabel: 'unbound_count',
      sqlLabel: 'external_access_resolution_log unbound|environment_inactive|profile_inactive (24h)',
      observedAt
    })
  } catch (error) {
    return buildUnknownSignal({ signalId, source, label, kind: 'incident', observedAt, error })
  }
}

export const getExternalBindingRevokedStillDispatchingSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const signalId = EXTERNAL_BINDING_REVOKED_STILL_DISPATCHING_SIGNAL_ID
  const source = 'getExternalBindingRevokedStillDispatchingSignal'
  const label = 'Identidades revocadas que siguen intentando despachar'

  try {
    const count = toCount(
      await query<CountRow>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_core.external_access_resolution_log r
           JOIN greenhouse_core.external_organization_bindings b ON b.binding_id = r.binding_id
          WHERE r.outcome = 'revoked'
            AND r.resolved_at >= NOW() - ($1::text || ' hours')::interval
            AND b.revoked_at IS NOT NULL
            AND r.resolved_at > b.revoked_at + ($2::text || ' minutes')::interval`,
        [String(WINDOW_HOURS), String(REVOCATION_GRACE_MINUTES)]
      )
    )

    return buildSignal({
      signalId,
      source,
      label,
      kind: 'incident',
      count,
      errorAt: 10,
      summaryOk: 'Ninguna identidad revocada intentó despachar pasados 5 minutos de su revocación.',
      summaryHit: n => `${n} intentos de despacho con binding revocado hace más de 5 minutos (24h).`,
      metricLabel: 'revoked_dispatch_count',
      sqlLabel: 'external_access_resolution_log revoked > revoked_at + 5min (24h)',
      observedAt
    })
  } catch (error) {
    return buildUnknownSignal({ signalId, source, label, kind: 'incident', observedAt, error })
  }
}

export const getExternalBindingSubjectCollisionSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const signalId = EXTERNAL_BINDING_SUBJECT_COLLISION_SIGNAL_ID
  const source = 'getExternalBindingSubjectCollisionSignal'
  const label = 'Colisiones de subject externo'

  try {
    const count = toCount(
      await query<CountRow>(
        `WITH subject_multi_profile AS (
           SELECT source_system, source_object_id
             FROM greenhouse_core.identity_profile_source_links
            WHERE source_system LIKE 'external_idp:%'
              AND source_object_type = 'subject'
            GROUP BY source_system, source_object_id
           HAVING COUNT(DISTINCT profile_id) > 1
         ),
         profile_multi_subject AS (
           SELECT source_system, profile_id
             FROM greenhouse_core.identity_profile_source_links
            WHERE source_system LIKE 'external_idp:%'
              AND source_object_type = 'subject'
              AND active = TRUE
            GROUP BY source_system, profile_id
           HAVING COUNT(DISTINCT source_object_id) > 1
         )
         SELECT ((SELECT COUNT(*) FROM subject_multi_profile) + (SELECT COUNT(*) FROM profile_multi_subject))::text AS n`
      )
    )

    return buildSignal({
      signalId,
      source,
      label,
      kind: 'data_quality',
      count,
      errorAt: 1,
      summaryOk:
        'Cada subject externo resuelve a una sola persona y cada persona tiene un solo subject por environment.',
      summaryHit: n =>
        `${n} colisiones: subject con más de un profile o persona con subjects divergentes en un environment.`,
      metricLabel: 'collision_count',
      sqlLabel: 'identity_profile_source_links external_idp: subject→N profiles ∪ profile→N subjects',
      observedAt
    })
  } catch (error) {
    return buildUnknownSignal({ signalId, source, label, kind: 'data_quality', observedAt, error })
  }
}

export const getExternalBindingOrphanGrantSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const signalId = EXTERNAL_BINDING_ORPHAN_GRANT_SIGNAL_ID
  const source = 'getExternalBindingOrphanGrantSignal'
  const label = 'Grants activos sin binding vigente'

  try {
    const count = toCount(
      await query<CountRow>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_core.external_capability_grants g
           JOIN greenhouse_core.external_organization_bindings b ON b.binding_id = g.binding_id
           JOIN greenhouse_core.external_identity_environments e ON e.environment_id = b.environment_id
          WHERE g.status = 'active'
            AND (b.status <> 'active' OR e.status NOT IN ('draft', 'active'))`
      )
    )

    return buildSignal({
      signalId,
      source,
      label,
      kind: 'drift',
      count,
      errorAt: 1,
      summaryOk: 'Todo grant activo cuelga de un binding activo en un environment vigente.',
      summaryHit: n => `${n} grants activos sobre bindings revocados o environments suspendidos/retirados.`,
      metricLabel: 'orphan_grant_count',
      sqlLabel: 'external_capability_grants active ∧ (binding revoked ∨ environment suspended|retired)',
      observedAt
    })
  } catch (error) {
    return buildUnknownSignal({ signalId, source, label, kind: 'drift', observedAt, error })
  }
}

/** TASK-1836 — active authority requires canonical creation or explicit current reconciliation evidence.
 * Expired grants (including expires_at = NOW()) have no current authority and are excluded;
 * NULL expiry remains active. Revoked bindings/grants remain in audit history, not this signal.
 */
export const EXTERNAL_BINDING_UNAUDITED_WRITE_SIGNAL_ID = 'identity.external_binding.unaudited_write'

export const getExternalBindingUnauditedWriteSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const signalId = EXTERNAL_BINDING_UNAUDITED_WRITE_SIGNAL_ID
  const source = 'getExternalBindingUnauditedWriteSignal'
  const label = 'Bindings y grants vigentes sin auditoría canónica'

  try {
    const count = toCount(
      await query<CountRow>(`
      WITH evidenced AS (${AUTHORITY_EVIDENCE_SELECT})
      SELECT (
        (SELECT COUNT(*) FROM greenhouse_core.external_organization_bindings b
          WHERE b.status='active' AND NOT EXISTS (SELECT 1 FROM evidenced a
            WHERE a.binding_id=b.binding_id AND a.event_type IN ('organization_bound','binding_reconciled'))) +
        (SELECT COUNT(*) FROM greenhouse_core.external_capability_grants g
          WHERE g.status='active' AND (g.expires_at IS NULL OR g.expires_at>NOW())
            AND NOT EXISTS (SELECT 1 FROM evidenced a WHERE a.grant_id=g.grant_id AND a.binding_id=g.binding_id
              AND a.event_type IN ('capability_granted','grant_reconciled')))
      )::text AS n
    `)
    )

    return buildSignal({
      signalId,
      source,
      label,
      kind: 'data_quality',
      count,
      errorAt: 1,
      summaryOk: 'Todo binding activo y grant vigente tiene auditoría y outbox canónicos de creación o conciliación.',
      summaryHit: n => `${n} bindings o grants vigentes carecen de auditoría y outbox canónicos de creación o conciliación.`,
      metricLabel: 'unaudited_write_count',
      sqlLabel:
        'active bindings + active unexpired grants without matching applied creation or internal v1 reconciliation audit',
      observedAt
    })
  } catch (error) {
    return buildUnknownSignal({ signalId, source, label, kind: 'data_quality', observedAt, error })
  }
}

/** TASK-1836 — structural population integrity across current and historical authority.
 * Count each offending binding once. Revocation, expiry and inactive links alone are not mixtures.
 * Never call the two population resolvers here: their authorization policies intentionally differ.
 */
export const EXTERNAL_BINDING_MIXED_POPULATION_SIGNAL_ID = 'identity.external_binding.mixed_population'

export const getExternalBindingMixedPopulationSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const signalId = EXTERNAL_BINDING_MIXED_POPULATION_SIGNAL_ID
  const source = 'getExternalBindingMixedPopulationSignal'
  const label = 'Bindings con poblaciones o vínculos de identidad inconsistentes'

  try {
    const count = toCount(
      await query<CountRow>(`
        WITH inconsistent_bindings AS (
          SELECT b.binding_id
            FROM greenhouse_core.external_organization_bindings b
           WHERE b.population = 'internal' AND (
             EXISTS (SELECT 1 FROM greenhouse_core.external_member_invitations i
                      WHERE i.binding_id = b.binding_id)
             OR EXISTS (
               SELECT 1 FROM greenhouse_core.external_capability_grants g
                WHERE g.binding_id = b.binding_id AND (
                  g.profile_id IS NULL OR g.expires_at IS NULL OR NOT EXISTS (
                    SELECT 1 FROM greenhouse_core.internal_native_enrollments e
                     WHERE e.binding_id = b.binding_id AND e.profile_id = g.profile_id
                       AND e.environment_id = b.environment_id
                  )
                )
             )
           )
          UNION
          SELECT e.binding_id
            FROM greenhouse_core.internal_native_enrollments e
            LEFT JOIN greenhouse_core.external_organization_bindings b ON b.binding_id = e.binding_id
            LEFT JOIN greenhouse_core.organizations o ON o.organization_id = b.organization_id
            LEFT JOIN greenhouse_core.identity_profile_source_links n ON n.link_id = e.native_link_id
            LEFT JOIN greenhouse_core.identity_profile_source_links u ON u.link_id = e.upstream_link_id
           WHERE b.population IS DISTINCT FROM 'internal'
              OR b.environment_id IS DISTINCT FROM e.environment_id
              OR o.public_id IS DISTINCT FROM 'EO-ORG-0007'
              OR o.is_operating_entity IS DISTINCT FROM TRUE
              OR n.profile_id IS DISTINCT FROM e.profile_id
              OR n.source_system IS DISTINCT FROM 'external_idp:' || e.environment_id
              OR n.source_object_type IS DISTINCT FROM 'subject'
              OR u.profile_id IS DISTINCT FROM e.profile_id
              OR u.source_system IS DISTINCT FROM 'azure_ad'
              OR u.source_object_type IS DISTINCT FROM 'user'
              OR lower(u.source_object_id) IS DISTINCT FROM e.object_id::text
              OR NOT EXISTS (
                SELECT 1 FROM greenhouse_core.client_users cu
                 WHERE cu.identity_profile_id = e.profile_id
                   AND lower(cu.microsoft_tenant_id) = e.tenant_id::text
                   AND lower(cu.microsoft_oid) = e.object_id::text
              )
        )
        SELECT COUNT(*)::text AS n FROM inconsistent_bindings
      `)
    )

    return buildSignal({
      signalId,
      source,
      label,
      kind: 'data_quality',
      count,
      errorAt: 1,
      summaryOk: 'Los bindings conservan su población y los enrollments tienen vínculos coherentes.',
      summaryHit: n => `${n} bindings mezclan poblaciones o tienen enrollments con vínculos inconsistentes.`,
      metricLabel: 'mixed_population_count',
      sqlLabel: 'distinct bindings with population, membership, grant or enrollment identity mismatch',
      observedAt
    })
  } catch (error) {
    return buildUnknownSignal({ signalId, source, label, kind: 'data_quality', observedAt, error })
  }
}

/**
 * TASK-1837 — undelivered: invitación ABIERTA (`issued`, no caducada) cuyo correo falló o rebotó.
 * Steady 0. Es la diferencia entre "no llegó" y "llegó y no la usó": el operador reenvía (rota).
 */
export const getExternalInvitationUndeliveredSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const signalId = EXTERNAL_INVITATION_UNDELIVERED_SIGNAL_ID
  const source = 'greenhouse_core.external_member_invitations'
  const label = 'Invitaciones externas sin entregar'

  try {
    const count = toCount(
      await query<CountRow>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_core.external_member_invitations
          WHERE status = 'issued'
            AND expires_at > NOW()
            AND delivery_status IN ('failed', 'bounced')`
      )
    )

    return buildSignal({
      signalId,
      source,
      label,
      kind: 'incident',
      count,
      errorAt: 5,
      summaryOk: 'Toda invitación externa abierta tiene su correo entregado o pendiente de confirmar.',
      summaryHit: n => `${n} invitaciones externas abiertas con correo fallido o rebotado; reenviar (rota el token).`,
      metricLabel: 'undelivered_count',
      sqlLabel: 'open invitations with delivery_status failed/bounced',
      observedAt
    })
  } catch (error) {
    return buildUnknownSignal({ signalId, source, label, kind: 'incident', observedAt, error })
  }
}

/**
 * TASK-1837 — expired_unaccepted: invitaciones que caducaron sin aceptarse en los últimos 7 días
 * (incluye las `issued` vencidas que nadie marcó todavía: el estado `expired` se fija al intentar
 * aceptar). Informativa: nunca escala a error; señala fricción de adopción, no un incidente.
 */
export const getExternalInvitationExpiredUnacceptedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const signalId = EXTERNAL_INVITATION_EXPIRED_UNACCEPTED_SIGNAL_ID
  const source = 'greenhouse_core.external_member_invitations'
  const label = 'Invitaciones externas caducadas sin aceptar'

  try {
    const count = toCount(
      await query<CountRow>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_core.external_member_invitations
          WHERE (status = 'expired' OR (status = 'issued' AND expires_at <= NOW()))
            AND accepted_at IS NULL
            AND expires_at >= NOW() - ($1::text || ' days')::interval`,
        [String(EXPIRED_WINDOW_DAYS)]
      )
    )

    return buildSignal({
      signalId,
      source,
      label,
      kind: 'data_quality',
      count,
      errorAt: Number.POSITIVE_INFINITY,
      summaryOk: 'Ninguna invitación externa caducó sin aceptarse en los últimos 7 días.',
      summaryHit: n => `${n} invitaciones externas caducaron sin aceptarse en 7 días; revisar entrega y reenviar si corresponde.`,
      metricLabel: 'expired_unaccepted_count',
      sqlLabel: 'invitations expired without acceptance (7 days)',
      observedAt
    })
  } catch (error) {
    return buildUnknownSignal({ signalId, source, label, kind: 'data_quality', observedAt, error })
  }
}

/**
 * TASK-1837 — token_revealed: usos de la excepción gobernada (`invitation_token_revealed` en el
 * audit) en 24 h. Steady 0: cualquier valor > 0 exige que el audit tenga actor y razón registrados;
 * ≥ 5 es la excepción convirtiéndose en el camino normal.
 */
export const getExternalInvitationTokenRevealedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const signalId = EXTERNAL_INVITATION_TOKEN_REVEALED_SIGNAL_ID
  const source = 'greenhouse_core.external_identity_audit_log'
  const label = 'Tokens de invitación revelados'

  try {
    const count = toCount(
      await query<CountRow>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_core.external_identity_audit_log
          WHERE event_type = 'invitation_token_revealed'
            AND created_at >= NOW() - ($1::text || ' hours')::interval`,
        [String(WINDOW_HOURS)]
      )
    )

    return buildSignal({
      signalId,
      source,
      label,
      kind: 'incident',
      count,
      errorAt: 5,
      summaryOk: 'Nadie usó la excepción de revelación del token de invitación en 24 h.',
      summaryHit: n => `${n} revelaciones de token de invitación en 24 h; verificar actor y razón en el audit.`,
      metricLabel: 'token_revealed_count',
      sqlLabel: 'audit rows invitation_token_revealed (24h)',
      observedAt
    })
  } catch (error) {
    return buildUnknownSignal({ signalId, source, label, kind: 'incident', observedAt, error })
  }
}

export type ExternalIdentityBindingSignalReader = {
  readonly signalId: string
  readonly read: () => Promise<ReliabilitySignal>
}

/** SSOT del grupo: el test de contrato verifica unicidad y que cada reader devuelva su propio id. */
export const EXTERNAL_IDENTITY_BINDING_SIGNAL_READERS: ReadonlyArray<ExternalIdentityBindingSignalReader> = [
  {
    signalId: EXTERNAL_BINDING_UNBOUND_DISPATCH_ATTEMPT_SIGNAL_ID,
    read: getExternalBindingUnboundDispatchAttemptSignal
  },
  {
    signalId: EXTERNAL_BINDING_REVOKED_STILL_DISPATCHING_SIGNAL_ID,
    read: getExternalBindingRevokedStillDispatchingSignal
  },
  { signalId: EXTERNAL_BINDING_SUBJECT_COLLISION_SIGNAL_ID, read: getExternalBindingSubjectCollisionSignal },
  { signalId: EXTERNAL_BINDING_ORPHAN_GRANT_SIGNAL_ID, read: getExternalBindingOrphanGrantSignal },
  { signalId: EXTERNAL_BINDING_UNAUDITED_WRITE_SIGNAL_ID, read: getExternalBindingUnauditedWriteSignal },
  { signalId: EXTERNAL_BINDING_MIXED_POPULATION_SIGNAL_ID, read: getExternalBindingMixedPopulationSignal },
  { signalId: EXTERNAL_INVITATION_UNDELIVERED_SIGNAL_ID, read: getExternalInvitationUndeliveredSignal },
  { signalId: EXTERNAL_INVITATION_EXPIRED_UNACCEPTED_SIGNAL_ID, read: getExternalInvitationExpiredUnacceptedSignal },
  { signalId: EXTERNAL_INVITATION_TOKEN_REVEALED_SIGNAL_ID, read: getExternalInvitationTokenRevealedSignal }
]

export const getExternalIdentityBindingSignals = async (): Promise<ReliabilitySignal[]> => {
  const signals = await Promise.all(
    EXTERNAL_IDENTITY_BINDING_SIGNAL_READERS.map(reader => reader.read().catch(() => null))
  )

  return signals.filter((signal): signal is ReliabilitySignal => signal !== null)
}
