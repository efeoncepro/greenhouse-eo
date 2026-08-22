import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/**
 * TASK-1755 — El callejón sin salida del ledger de asignación.
 *
 * Un resultado de intento no-asignado (`blocked`/`held`/`stale`) ocupa la clave de
 * idempotencia `(application, policy, versión, etapa, intento) WHERE superseded_at IS NULL`.
 * Corregir la causa real —habilitar la policy, activar la plantilla, registrar el correo— NO
 * devolvía la capacidad de asignar: la confirmación siguiente colisionaba con la fila vieja y
 * repetía su resultado.
 *
 * ⚠️ **Por qué este archivo no reusa los handlers de `propose-confirm.test.ts`.** Aquellos
 * devuelven filas FIJAS por regex: con ellos, el INSERT del ledger siempre "gana" y el
 * callejón es literalmente irreproducible — un test verde sobre un bug vivo. Acá el fake
 * mantiene un ledger EN MEMORIA que honra los tres índices que deciden el caso:
 *
 *   1. ledger:   UNIQUE (application, policy, versión, etapa, intento) WHERE superseded_at IS NULL
 *   2. propuesta: UNIQUE (application, digest) WHERE status = 'proposed'
 *   3. instancia: UNIQUE (application, template) WHERE status IN (abiertos)
 *
 * Sigue sin ser SQL real: el ejercicio contra PostgreSQL vive en `propose-confirm.live.test.ts`
 * (invariante de live-testing, ISSUE-071 / TASK-893).
 */

// ── Mundo mutable: lo que el operador "corrige" entre un intento y el siguiente ──

const world = {
  policyState: 'draft' as 'draft' | 'enabled' | 'disabled',
  templateStatus: 'active' as string,
  candidateEmail: 'candidata@ejemplo.com' as string | null,
  applicationStage: 'shortlisted',
  applicationDecision: null as string | null,
}

type LedgerRow = {
  assignment_id: string
  application_id: string
  policy_id: string
  assessment_id: string | null
  policy_version: number
  trigger_stage: string
  attempt_seq: number
  origin: string
  outcome: string
  outcome_reason: string | null
  superseded_at: string | null
  actor_user_id: string | null
  created_at: string
  updated_at: string
}

type ProposalRow = {
  proposal_id: string
  application_id: string
  policy_id: string
  policy_version: number
  effect_digest: string
  preview_json: unknown
  status: string
  proposed_by: string
  confirmed_by: string | null
  assignment_id: string | null
  expires_at: string
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

type InstanceRow = {
  assessment_id: string
  public_id: string
  application_id: string
  template_id: string
  method: string
  evaluator_user_id: string | null
  status: string
  time_limit_minutes: number | null
  accommodations_json: Record<string, unknown>
  started_at: string | null
  submitted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

const db = {
  ledger: [] as LedgerRow[],
  proposals: [] as ProposalRow[],
  instances: [] as InstanceRow[],
  seq: 0,
}

const nextId = (prefix: string): string => `${prefix}-${++db.seq}`

const NOW = '2026-08-22T10:00:00.000Z'
const OPEN_INSTANCE_STATUSES = ['assigned', 'sent', 'in_progress', 'submitted']

const policyRow = () => ({
  policy_id: 'hoap-1',
  opening_id: 'opng-1',
  template_id: 'atpl-1',
  policy_version: 1,
  mode: 'manual',
  state: world.policyState,
  trigger_stage: 'shortlisted',
  time_limit_minutes: 45,
  template_content_digest: 'digest-x',
  volume_cap_per_window: 3,
  volume_window_minutes: 60,
  created_by: 'user-1',
  enabled_by: 'user-1',
  enabled_at: NOW,
  created_at: NOW,
  updated_at: NOW,
})

/** El fake SQL engine: enruta por el TEXTO de la consulta y opera sobre `db`. */
const execute = (text: string, values: unknown[]): Record<string, unknown>[] => {
  // ── Mundo de lectura (policy / application / template / preguntas) ──
  if (/FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/.test(text)) {
    // `findActivePolicyForOpening` excluye `disabled`; `lockPolicyForUpdate` y `getPolicyById` no.
    if (/state <> 'disabled'/.test(text) && world.policyState === 'disabled') return []

    return [policyRow()]
  }

  if (/SELECT opening_id FROM greenhouse_hiring\.hiring_application/.test(text)) {
    return [{ opening_id: 'opng-1' }]
  }

  if (/FROM greenhouse_hiring\.hiring_application app\b/.test(text)) {
    const base = {
      application_id: 'happ-1',
      opening_id: 'opng-1',
      stage: world.applicationStage,
      decision: world.applicationDecision,
      canonical_email: world.candidateEmail,
    }

    // El material del digest hace JOIN a `hiring_opening`; el snapshot del command, no.
    return /JOIN greenhouse_hiring\.hiring_opening\b/.test(text)
      ? [{ ...base, internal_title: 'Account Manager L2' }]
      : [base]
  }

  if (/SELECT name, version, status FROM greenhouse_hiring\.hiring_assessment_template/.test(text)) {
    return [{ name: 'Account Manager L2', version: 1, status: world.templateStatus }]
  }

  if (/SELECT status FROM greenhouse_hiring\.hiring_assessment_template\b/.test(text)) {
    return [{ status: world.templateStatus }]
  }

  if (/greenhouse_hiring\.hiring_assessment_template_module/.test(text)) {
    return [
      {
        module_id: 'atmd-1',
        competency_id: 'comp-1',
        question_id: 'q-1',
        level: 'intermedio',
        type: 'open',
        prompt: '¿Cómo priorizas una cuenta en riesgo?',
        options_json: null,
      },
    ]
  }

  // ── Ledger de propuestas (índice parcial 2) ──
  if (/greenhouse_hiring\.hiring_assessment_assignment_proposal/.test(text)) {
    if (/^\s*INSERT/.test(text)) {
      const [applicationId, policyId, policyVersion, digest, preview, proposedBy, expiresAt] = values as [
        string, string, number, string, string, string, string,
      ]

      const collision = db.proposals.find(
        p => p.application_id === applicationId && p.effect_digest === digest && p.status === 'proposed',
      )

      if (collision) return []

      const row: ProposalRow = {
        proposal_id: nextId('haap'),
        application_id: applicationId,
        policy_id: policyId,
        policy_version: policyVersion,
        effect_digest: digest,
        preview_json: JSON.parse(preview),
        status: 'proposed',
        proposed_by: proposedBy,
        confirmed_by: null,
        assignment_id: null,
        expires_at: expiresAt,
        confirmed_at: null,
        created_at: NOW,
        updated_at: NOW,
      }

      db.proposals.push(row)

      return [{ ...row }]
    }

    if (/^\s*UPDATE/.test(text)) {
      const row = db.proposals.find(p => p.proposal_id === values[0])

      if (!row) return []

      if (/status = 'confirmed'/.test(text)) {
        row.status = 'confirmed'
        row.confirmed_by = String(values[1])
        row.confirmed_at = NOW
        row.assignment_id = values[2] == null ? null : String(values[2])
      } else {
        row.status = String(values[1])
      }

      return [{ ...row }]
    }

    if (/WHERE proposal_id = \$1/.test(text)) {
      const row = db.proposals.find(p => p.proposal_id === values[0])

      return row ? [{ ...row }] : []
    }

    if (/WHERE application_id = \$1 AND effect_digest = \$2/.test(text)) {
      const row = db.proposals.find(
        p => p.application_id === values[0] && p.effect_digest === values[1] && p.status === 'proposed',
      )

      return row ? [{ ...row }] : []
    }

    // `getCurrentAssignmentProposal`
    const candidates = db.proposals.filter(p => p.application_id === values[0])
    const current = candidates.find(p => p.status === 'proposed') ?? candidates[candidates.length - 1]

    return current ? [{ ...current }] : []
  }

  // ── Ledger de asignación (índice parcial 1) ──
  if (/greenhouse_hiring\.hiring_assessment_assignment\b/.test(text)) {
    if (/^\s*INSERT/.test(text)) {
      const [applicationId, policyId, assessmentId, policyVersion, triggerStage, attemptSeq, origin, outcome, outcomeReason, actorUserId] =
        values as [string, string, string | null, number, string, number, string, string, string | null, string | null]

      const collision = db.ledger.find(
        r =>
          r.application_id === applicationId &&
          r.policy_id === policyId &&
          r.policy_version === policyVersion &&
          r.trigger_stage === triggerStage &&
          r.attempt_seq === attemptSeq &&
          r.superseded_at === null,
      )

      // `ON CONFLICT ... DO NOTHING RETURNING`: cero filas, sin excepción.
      if (collision) return []

      const row: LedgerRow = {
        assignment_id: nextId('hoaa'),
        application_id: applicationId,
        policy_id: policyId,
        assessment_id: assessmentId,
        policy_version: policyVersion,
        trigger_stage: triggerStage,
        attempt_seq: attemptSeq,
        origin,
        outcome,
        outcome_reason: outcomeReason,
        superseded_at: null,
        actor_user_id: actorUserId,
        created_at: NOW,
        updated_at: NOW,
      }

      db.ledger.push(row)

      return [{ ...row }]
    }

    if (/^\s*UPDATE/.test(text)) {
      const row = db.ledger.find(r => r.assignment_id === values[0])

      if (!row) return []

      row.assessment_id = values[1] == null ? null : String(values[1])
      row.outcome = String(values[2])
      row.outcome_reason = values[3] == null ? null : String(values[3])

      return [{ ...row }]
    }

    if (/COUNT\(\*\)/.test(text)) {
      return [{ total: db.ledger.filter(r => r.policy_id === values[0] && r.outcome === 'assigned').length }]
    }

    // `findActiveAssignment`: la clave completa, intento incluido.
    if (values.length === 5) {
      const row = db.ledger.find(
        r =>
          r.application_id === values[0] &&
          r.policy_id === values[1] &&
          r.policy_version === values[2] &&
          r.trigger_stage === values[3] &&
          r.attempt_seq === values[4] &&
          r.superseded_at === null,
      )

      return row ? [{ ...row }] : []
    }

    // `readAssignmentAttemptState` (TASK-1755): la clave SIN el intento, ordenada desc.
    return db.ledger
      .filter(
        r =>
          r.application_id === values[0] &&
          r.policy_id === values[1] &&
          r.policy_version === values[2] &&
          r.trigger_stage === values[3],
      )
      .sort((a, b) => b.attempt_seq - a.attempt_seq)
      .map(r => ({ attempt_seq: r.attempt_seq, outcome: r.outcome, superseded_at: r.superseded_at }))
  }

  // ── Instancias (índice parcial 3) ──
  if (/greenhouse_hiring\.hiring_assessment\b/.test(text)) {
    if (/^\s*INSERT/.test(text)) {
      const [applicationId, templateId, , , timeLimit, , createdBy] = values as [
        string, string, string, string, number | null, string, string | null,
      ]

      const open = db.instances.find(
        i => i.application_id === applicationId && i.template_id === templateId && OPEN_INSTANCE_STATUSES.includes(i.status),
      )

      if (open) return []

      const row: InstanceRow = {
        assessment_id: nextId('asmt'),
        public_id: `EO-ASM-${String(db.seq).padStart(4, '0')}`,
        application_id: applicationId,
        template_id: templateId,
        method: 'candidate_test',
        evaluator_user_id: null,
        status: 'assigned',
        time_limit_minutes: timeLimit,
        accommodations_json: {},
        started_at: null,
        submitted_at: null,
        created_by: createdBy,
        created_at: NOW,
        updated_at: NOW,
      }

      db.instances.push(row)

      return [{ ...row }]
    }

    // Preview: estados de instancias existentes de (application, template).
    if (/instance_status/.test(text)) {
      const wanted = (values[2] as string[]) ?? []

      return db.instances
        .filter(i => i.application_id === values[0] && i.template_id === values[1] && wanted.includes(i.status))
        .map(i => ({ instance_status: i.status }))
    }

    // `findOpenCandidateTest`
    const open = db.instances.find(
      i => i.application_id === values[0] && i.template_id === values[1] && OPEN_INSTANCE_STATUSES.includes(i.status),
    )

    return open ? [{ ...open }] : []
  }

  return []
}

const fakeClient = {
  query: vi.fn(async (text: string, values: unknown[] = []) => {
    const rows = execute(text, values)

    return { rows, rowCount: rows.length }
  }),
}

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn(fakeClient)),
  runGreenhousePostgresQuery: vi.fn(async (text: string, values: unknown[] = []) => execute(text, values)),
}))

const publishOutboxEvent = vi.fn(async () => 'outbox-1')

vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: () => publishOutboxEvent() }))

const { proposeAssessmentAssignment } = await import('./propose-assignment')
const { confirmAssessmentAssignment } = await import('./confirm-assignment')

const ACTOR = 'user-1'

/** Propone y confirma en un solo paso, como haría el operador desde la pantalla. */
const proposeAndConfirm = async () => {
  const { proposal } = await proposeAssessmentAssignment({ applicationId: 'happ-1', actorUserId: ACTOR })

  return confirmAssessmentAssignment({ proposalId: proposal.proposalId, applicationId: 'happ-1', actorUserId: ACTOR })
}

const manualLedger = () => db.ledger.filter(r => r.trigger_stage === 'manual')

beforeEach(() => {
  db.ledger.length = 0
  db.proposals.length = 0
  db.instances.length = 0
  db.seq = 0
  world.policyState = 'draft'
  world.templateStatus = 'active'
  world.candidateEmail = 'candidata@ejemplo.com'
  world.applicationStage = 'shortlisted'
  world.applicationDecision = null
  fakeClient.query.mockClear()
  publishOutboxEvent.mockClear()
})

describe('TASK-1755 — corregir la causa del bloqueo devuelve la capacidad de asignar', () => {
  it('policy en `draft` ⇒ bloqueo; habilitarla y confirmar de nuevo ASIGNA', async () => {
    // 1. Toda policy NACE en `draft`: el primer intento natural del operador se bloquea.
    const first = await proposeAndConfirm()

    expect(first.result).toMatchObject({ status: 'blocked', reasonCode: 'policy_disabled' })

    // 2. El operador corrige la causa real.
    world.policyState = 'enabled'

    // 3. Confirmar de nuevo debe asignar. Antes de TASK-1755 el INSERT colisionaba con la fila
    //    bloqueada del intento 1 y `resultFromRecord(replay)` repetía `blocked` para siempre.
    const second = await proposeAndConfirm()

    expect(second.result?.status).toBe('assigned')
    expect(db.instances).toHaveLength(1)

    // 4. El ledger CONSERVA los dos intentos: no se borró ni se reescribió historia.
    expect(manualLedger().map(r => ({ attempt: r.attempt_seq, outcome: r.outcome }))).toEqual([
      { attempt: 1, outcome: 'blocked' },
      { attempt: 2, outcome: 'assigned' },
    ])
    expect(manualLedger()[0].superseded_at).toBeNull()
  })

  it('plantilla inactiva ⇒ bloqueo; activarla devuelve la asignación AUNQUE el digest no cambie', async () => {
    // `templateStatus` NO entra al material del digest (`proposal-digest.ts`): activar la
    // plantilla deja el efecto propuesto idéntico. Por eso el intento nuevo se ata a la
    // IDENTIDAD de la propuesta (one-shot) y no a un digest distinto — con el digest como
    // criterio, este caso quedaría en callejón permanente.
    world.policyState = 'enabled'
    world.templateStatus = 'draft'

    const first = await proposeAndConfirm()

    expect(first.result).toMatchObject({ status: 'blocked', reasonCode: 'template_inactive' })

    world.templateStatus = 'active'

    const second = await proposeAndConfirm()

    expect(second.result?.status).toBe('assigned')
    expect(db.proposals.map(p => p.effect_digest)).toEqual([db.proposals[0].effect_digest, db.proposals[0].effect_digest])
    expect(db.instances).toHaveLength(1)
  })

  it('candidato sin correo ⇒ bloqueo; registrarlo devuelve la asignación', async () => {
    world.policyState = 'enabled'
    world.candidateEmail = null

    const first = await proposeAndConfirm()

    expect(first.result).toMatchObject({ status: 'blocked', reasonCode: 'missing_email' })

    world.candidateEmail = 'candidata@ejemplo.com'

    const second = await proposeAndConfirm()

    expect(second.result?.status).toBe('assigned')
  })
})

describe('TASK-1755 — lo que NO se puede relajar', () => {
  it('reconfirmar la MISMA propuesta no abre intento nuevo: devuelve su estado ya decidido', async () => {
    world.policyState = 'enabled'

    const { proposal } = await proposeAssessmentAssignment({ applicationId: 'happ-1', actorUserId: ACTOR })

    const first = await confirmAssessmentAssignment({
      proposalId: proposal.proposalId,
      applicationId: 'happ-1',
      actorUserId: ACTOR,
    })

    expect(first.result?.status).toBe('assigned')

    const replay = await confirmAssessmentAssignment({
      proposalId: proposal.proposalId,
      applicationId: 'happ-1',
      actorUserId: ACTOR,
    })

    expect(replay.alreadyConfirmed).toBe(true)
    expect(replay.result).toBeNull()
    expect(manualLedger()).toHaveLength(1)
    expect(db.instances).toHaveLength(1)
  })

  it('un `assigned` vigente sigue cerrando la puerta: NO crea una segunda prueba', async () => {
    world.policyState = 'enabled'

    const first = await proposeAndConfirm()

    expect(first.result?.status).toBe('assigned')

    // Propuesta NUEVA (el digest cambió: ahora hay instancia abierta) y confirmación nueva.
    const second = await proposeAndConfirm()

    expect(second.result?.status).toBe('already_assigned')
    expect(db.instances).toHaveLength(1)
  })

  it('el bloqueo repetido queda registrado como intento propio, no como un replay que miente', async () => {
    // El operador reintenta sin haber corregido nada. No sale ningún correo ni instancia, pero
    // el ledger no puede quedar diciendo que sólo hubo un intento.
    const first = await proposeAndConfirm()
    const second = await proposeAndConfirm()

    expect(first.result?.status).toBe('blocked')
    expect(second.result?.status).toBe('blocked')
    expect(manualLedger().map(r => r.attempt_seq)).toEqual([1, 2])
    expect(db.instances).toHaveLength(0)
  })
})
