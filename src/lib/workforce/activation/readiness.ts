import 'server-only'

import { query } from '@/lib/db'
import { listPaymentProfiles } from '@/lib/finance/beneficiary-payment-profiles/list-profiles'
import { assessPersonLegalReadiness } from '@/lib/person-legal-profile/readiness'
import {
  getLatestOnboardingCaseForMember,
  isOnboardingCaseSchemaUnavailableError
} from '@/lib/workforce/onboarding/store'
import { resolveRoleTitle } from '@/lib/workforce/role-title'

import { resolveWorkforceExternalIdentityRequirement } from './external-identity-policy'
import type {
  WorkforceActivationBlockerCode,
  WorkforceActivationIssue,
  WorkforceActivationLane,
  WorkforceActivationLaneKey,
  WorkforceActivationLaneStatus,
  WorkforceActivationMemberSnapshot,
  WorkforceActivationReadiness,
  WorkforceActivationReadinessStatus,
  WorkforceActivationWarningCode
} from './types'
import type { WorkforceIntakeStatus } from '@/types/people'

interface MemberReadinessRow extends Record<string, unknown> {
  member_id: string
  display_name: string | null
  primary_email: string | null
  workforce_intake_status: string
  identity_profile_id: string | null
  active: boolean
  assignable: boolean
  created_at: Date | string | null
  hire_date: Date | string | null
  employment_type: string | null
  contract_type: string | null
  contract_end_date: Date | string | null
  daily_required: boolean | null
  pay_regime: string | null
  payroll_via: string | null
  deel_contract_id: string | null
  role_title: string | null
  role_title_source: string | null
  compensation_currency: string | null
  compensation_amount: string | number | null
  compensation_contract_type: string | null
  compensation_pay_regime: string | null
  has_login: boolean | null
  has_active_relationship: boolean | null
  notion_user_id: string | null
  notion_display_name: string | null
  notion_source_link_id: string | null
  notion_source_link_object_id: string | null
  notion_pending_proposal_count: string | number | null
  notion_conflict_count: string | number | null
}

const CRITICAL_LANES: readonly WorkforceActivationLaneKey[] = [
  'identity_access',
  'work_relationship',
  'employment',
  'role_title',
  'compensation',
  'legal_profile',
  'payment_profile',
  'operational_integrations',
  'operational_onboarding',
  'contractor_engagement'
]

const LANE_LABELS: Record<WorkforceActivationLaneKey, string> = {
  identity_access: 'Identidad y acceso',
  work_relationship: 'Relación laboral',
  employment: 'Datos laborales',
  role_title: 'Cargo y organización',
  compensation: 'Compensación',
  legal_profile: 'Identidad legal',
  payment_profile: 'Pago',
  operational_integrations: 'Integraciones operacionales',
  operational_onboarding: 'Onboarding',
  contractor_engagement: 'Engagement contractor'
}

const LANE_OWNERS: Record<WorkforceActivationLaneKey, WorkforceActivationIssue['owner']> = {
  identity_access: 'People Systems',
  work_relationship: 'HR Ops',
  employment: 'HR Ops',
  role_title: 'People Ops',
  compensation: 'HR Ops',
  legal_profile: 'People Ops',
  payment_profile: 'Finance Ops',
  operational_integrations: 'People Systems',
  operational_onboarding: 'People Ops',
  contractor_engagement: 'HR Ops'
}

const DEFAULT_LANE_DETAIL: Record<WorkforceActivationLaneKey, string> = {
  identity_access: 'Perfil People conectado y acceso operativo disponible.',
  work_relationship: 'Relación activa contra la entidad legal correspondiente.',
  employment: 'Fecha de ingreso, tipo de empleo, contrato y régimen definidos.',
  role_title: 'Cargo vigente resuelto por el resolver canónico.',
  compensation: 'Compensación vigente con monto y moneda.',
  legal_profile: 'Perfil legal cumple el caso de uso aplicable.',
  payment_profile: 'Ruta de pago aplicable resuelta.',
  operational_integrations: 'Identidad externa requerida reconciliada.',
  operational_onboarding: 'Checklist operativo no bloquea la habilitación.',
  contractor_engagement: 'No aplica para relación laboral dependiente.'
}

const laneLink = (memberId: string, lane: WorkforceActivationLaneKey): string => {
  const base = `/people/${memberId}`

  if (lane === 'payment_profile') return `${base}?tab=payment`
  if (lane === 'legal_profile') return base
  if (lane === 'identity_access') return base
  if (lane === 'operational_integrations') return `/hr/workforce/activation?member=${memberId}&drawer=external-identity`

  return base
}

const toIsoDate = (value: Date | string | null): string | null => {
  if (!value) return null

  try {
    return new Date(value).toISOString().slice(0, 10)
  } catch {
    return null
  }
}

const toIsoDateTime = (value: Date | string | null): string | null => {
  if (!value) return null

  try {
    return new Date(value).toISOString()
  } catch {
    return null
  }
}

const toInt = (value: unknown): number => {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

const toMoney = (value: string | number | null): number | null => {
  if (value === null) return null
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toWorkforceIntakeStatus = (value: string): WorkforceIntakeStatus => {
  if (value === 'pending_intake' || value === 'in_review' || value === 'completed') return value

  return 'pending_intake'
}

const normalizeCurrency = (value: string | null, payRegime: string | null): 'CLP' | 'USD' | null => {
  if (value === 'CLP' || value === 'USD') return value
  if (payRegime === 'chile') return 'CLP'
  if (payRegime === 'international') return 'USD'

  return null
}

const issue = (
  memberId: string,
  lane: WorkforceActivationLaneKey,
  code: WorkforceActivationBlockerCode | WorkforceActivationWarningCode,
  label: string,
  detail: string
): WorkforceActivationIssue => ({
  code,
  lane,
  label,
  detail,
  owner: LANE_OWNERS[lane],
  deepLink: laneLink(memberId, lane)
})

const lane = (
  memberId: string,
  key: WorkforceActivationLaneKey,
  status: WorkforceActivationLaneStatus,
  detail: string
): WorkforceActivationLane => ({
  key,
  label: LANE_LABELS[key],
  status,
  owner: LANE_OWNERS[key],
  detail,
  deepLink: laneLink(memberId, key)
})

const resolveOperationalOnboardingLane = async (memberId: string) => {
  const warnings: WorkforceActivationIssue[] = []
  const blockers: WorkforceActivationIssue[] = []
  let detail = 'Caso de onboarding listo para registrar la activación.'

  try {
    const onboardingCase = await getLatestOnboardingCaseForMember(memberId)

    if (!onboardingCase) {
      warnings.push(
        issue(
          memberId,
          'operational_onboarding',
          'onboarding_case_missing',
          'Caso de onboarding se creará al activar',
          'No existe un caso abierto todavía; el cierre de ficha lo crea y activa de forma idempotente.'
        )
      )
      detail = 'Caso de onboarding pendiente de creación automática.'
    } else if (onboardingCase.status === 'blocked') {
      blockers.push(
        issue(
          memberId,
          'operational_onboarding',
          'onboarding_case_blocked',
          'Caso de onboarding bloqueado',
          onboardingCase.blockedReason ?? 'Resolver el bloqueo operacional antes de activar.'
        )
      )
      detail = onboardingCase.blockedReason ?? 'Caso de onboarding bloqueado.'
    } else if (onboardingCase.status !== 'active') {
      warnings.push(
        issue(
          memberId,
          'operational_onboarding',
          'onboarding_case_open',
          'Caso de onboarding abierto',
          `El caso ${onboardingCase.publicId} está en estado ${onboardingCase.status}.`
        )
      )
      detail = `Caso ${onboardingCase.publicId} abierto como ${onboardingCase.status}.`
    }
  } catch (error) {
    if (!isOnboardingCaseSchemaUnavailableError(error)) {
      throw error
    }

    warnings.push(
      issue(
        memberId,
        'operational_onboarding',
        'onboarding_case_unavailable',
        'Foundation de onboarding pendiente',
        'La tabla de casos de onboarding todavía no está disponible en este entorno.'
      )
    )
    detail = 'Foundation de onboarding pendiente de migración.'
  }

  warnings.push(
    issue(
      memberId,
      'operational_onboarding',
      'onboarding_checklist_missing',
      'Checklist operativo no conectado',
      'El checklist HRIS queda como hijo operacional; no bloquea V1.'
    )
  )

  const status: WorkforceActivationLaneStatus = blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready'

  return {
    lane: lane(memberId, 'operational_onboarding', status, blockers[0]?.detail ?? warnings[0]?.detail ?? detail),
    blockers,
    warnings
  }
}

const loadMember = async (memberId: string): Promise<MemberReadinessRow | null> => {
  const rows = await query<MemberReadinessRow>(
    `SELECT
       m.member_id,
       m.display_name,
       m.primary_email,
       m.workforce_intake_status,
       m.identity_profile_id,
       m.active,
       m.assignable,
       m.created_at,
       m.hire_date,
       m.employment_type,
       m.contract_type,
       m.contract_end_date,
       m.daily_required,
       m.pay_regime,
       m.payroll_via,
       m.deel_contract_id,
       m.role_title,
       m.role_title_source,
       cv.currency AS compensation_currency,
       cv.base_salary AS compensation_amount,
       cv.contract_type AS compensation_contract_type,
       cv.pay_regime AS compensation_pay_regime,
       m.notion_user_id,
       m.notion_display_name,
       notion_link.link_id AS notion_source_link_id,
       notion_link.source_object_id AS notion_source_link_object_id,
       COALESCE(notion_proposals.pending_count, 0) AS notion_pending_proposal_count,
       COALESCE(notion_conflicts.conflict_count, 0) AS notion_conflict_count,
       EXISTS (
         SELECT 1
         FROM greenhouse_core.client_users cu
         WHERE cu.identity_profile_id = m.identity_profile_id
           AND cu.status = 'active'
       ) AS has_login,
       EXISTS (
         SELECT 1
         FROM greenhouse_core.person_legal_entity_relationships rel
         WHERE rel.profile_id = m.identity_profile_id
           AND rel.status = 'active'
           AND rel.effective_from <= CURRENT_DATE
           AND (rel.effective_to IS NULL OR rel.effective_to >= CURRENT_DATE)
       ) AS has_active_relationship
     FROM greenhouse_core.members m
     LEFT JOIN LATERAL (
       SELECT sl.link_id, sl.source_object_id
       FROM greenhouse_core.identity_profile_source_links sl
       WHERE sl.profile_id = m.identity_profile_id
         AND sl.source_system = 'notion'
         AND sl.source_object_type = 'user'
         AND sl.active = TRUE
       ORDER BY sl.is_primary DESC, sl.updated_at DESC
       LIMIT 1
     ) notion_link ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS pending_count
       FROM greenhouse_core.identity_reconciliation_proposals proposal
       WHERE proposal.source_system = 'notion'
         AND proposal.status = 'pending'
         AND proposal.candidate_member_id = m.member_id
     ) notion_proposals ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS conflict_count
       FROM greenhouse_core.identity_profile_source_links sl
       WHERE sl.source_system = 'notion'
         AND sl.source_object_type = 'user'
         AND sl.active = TRUE
         AND sl.source_object_id = COALESCE(m.notion_user_id, notion_link.source_object_id)
         AND sl.profile_id IS DISTINCT FROM m.identity_profile_id
     ) notion_conflicts ON TRUE
     LEFT JOIN LATERAL (
       SELECT cv_inner.currency, cv_inner.base_salary, cv_inner.contract_type, cv_inner.pay_regime
       FROM greenhouse_payroll.compensation_versions cv_inner
       WHERE cv_inner.member_id = m.member_id
         AND cv_inner.is_current = TRUE
       ORDER BY cv_inner.effective_from DESC, cv_inner.created_at DESC
       LIMIT 1
     ) cv ON TRUE
     WHERE m.member_id = $1
     LIMIT 1`,
    [memberId]
  )

  return rows[0] ?? null
}

const resolvePaymentLane = async (
  snapshot: WorkforceActivationMemberSnapshot
): Promise<{
  lane: WorkforceActivationLane
  blockers: WorkforceActivationIssue[]
  warnings: WorkforceActivationIssue[]
}> => {
  const blockers: WorkforceActivationIssue[] = []
  const warnings: WorkforceActivationIssue[] = []

  if (snapshot.payrollVia === 'deel') {
    warnings.push(
      issue(
        snapshot.memberId,
        'payment_profile',
        'payment_profile_managed_by_deel',
        'Pago gestionado por Deel',
        'No bloquea el cierre de intake; validar la ruta externa antes del primer pago.'
      )
    )

    return {
      lane: lane(snapshot.memberId, 'payment_profile', 'warning', 'Pago se enruta fuera de Greenhouse.'),
      blockers,
      warnings
    }
  }

  if (!snapshot.compensationCurrency) {
    blockers.push(
      issue(
        snapshot.memberId,
        'payment_profile',
        'payment_profile_missing_or_unapproved',
        'Falta moneda para ruta de pago',
        'Define compensación vigente antes de validar el perfil de pago.'
      )
    )

    return {
      lane: lane(snapshot.memberId, 'payment_profile', 'blocked', 'No se puede resolver moneda de pago.'),
      blockers,
      warnings
    }
  }

  const profiles = await listPaymentProfiles({
    beneficiaryType: 'member',
    beneficiaryId: snapshot.memberId,
    currency: snapshot.compensationCurrency,
    status: 'all',
    limit: 5
  })

  if (profiles.items.some(profile => profile.status === 'active')) {
    return {
      lane: lane(snapshot.memberId, 'payment_profile', 'ready', DEFAULT_LANE_DETAIL.payment_profile),
      blockers,
      warnings
    }
  }

  const hasPendingApprovalProfile = profiles.items.some(profile => profile.status === 'pending_approval')
  const hasDraftProfile = profiles.items.some(profile => profile.status === 'draft')

  if (hasPendingApprovalProfile) {
    warnings.push(
      issue(
        snapshot.memberId,
        'payment_profile',
        'payment_profile_pending_approval',
        'Perfil de pago pendiente de aprobación',
        'Aprobar el perfil antes de ejecutar pagos internos.'
      )
    )
  } else if (hasDraftProfile) {
    warnings.push(
      issue(
        snapshot.memberId,
        'payment_profile',
        'payment_profile_draft_activation_required',
        'Perfil de pago en borrador',
        'Activa el perfil de pago para convertirlo en ruta valida de pagos internos.'
      )
    )
  }

  blockers.push(
    issue(
      snapshot.memberId,
      'payment_profile',
      'payment_profile_missing_or_unapproved',
      'Perfil de pago faltante o no aprobado',
      hasDraftProfile || hasPendingApprovalProfile
        ? `Existe perfil para ${snapshot.compensationCurrency}, pero debe quedar activo antes de habilitar la ficha.`
        : `Se requiere perfil activo para ${snapshot.compensationCurrency}.`
    )
  )

  return {
    lane: lane(
      snapshot.memberId,
      'payment_profile',
      'blocked',
      hasDraftProfile || hasPendingApprovalProfile
        ? 'La ruta de pago existe pero aun no esta activa.'
        : 'Falta una ruta de pago interna activa.'
    ),
    blockers,
    warnings
  }
}

const resolveLegalLane = async (
  snapshot: WorkforceActivationMemberSnapshot
): Promise<{
  lane: WorkforceActivationLane
  blockers: WorkforceActivationIssue[]
  warnings: WorkforceActivationIssue[]
}> => {
  const blockers: WorkforceActivationIssue[] = []
  const warnings: WorkforceActivationIssue[] = []

  const requiresChilePayroll =
    snapshot.payRegime === 'chile' &&
    snapshot.payrollVia === 'internal' &&
    (snapshot.contractType === 'indefinido' || snapshot.contractType === 'plazo_fijo')

  if (!requiresChilePayroll) {
    return {
      lane: lane(snapshot.memberId, 'legal_profile', 'not_applicable', 'No aplica como blocker para este régimen.'),
      blockers,
      warnings
    }
  }

  if (!snapshot.identityProfileId) {
    blockers.push(
      issue(
        snapshot.memberId,
        'legal_profile',
        'legal_profile_blocked',
        'Falta identity profile para validar identidad legal',
        'Conecta el perfil People antes de evaluar documentos y dirección.'
      )
    )

    return {
      lane: lane(snapshot.memberId, 'legal_profile', 'blocked', 'No hay perfil legal resoluble.'),
      blockers,
      warnings
    }
  }

  const readiness = await assessPersonLegalReadiness({
    profileId: snapshot.identityProfileId,
    useCase: 'payroll_chile_dependent'
  })

  readiness.blockers.forEach(blocker =>
    blockers.push(
      issue(
        snapshot.memberId,
        'legal_profile',
        'legal_profile_blocked',
        'Identidad legal bloquea payroll Chile',
        blocker
      )
    )
  )

  readiness.warnings.forEach(warning =>
    warnings.push(
      issue(
        snapshot.memberId,
        'legal_profile',
        'legal_profile_warning',
        'Identidad legal requiere revisión',
        warning
      )
    )
  )

  return {
    lane: lane(
      snapshot.memberId,
      'legal_profile',
      blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready',
      blockers[0]?.detail ?? warnings[0]?.detail ?? DEFAULT_LANE_DETAIL.legal_profile
    ),
    blockers,
    warnings
  }
}

export const resolveWorkforceActivationReadiness = async (
  memberId: string
): Promise<WorkforceActivationReadiness> => {
  const evaluatedAt = new Date().toISOString()
  const row = await loadMember(memberId)

  if (!row) {
    const snapshot: WorkforceActivationMemberSnapshot = {
      memberId,
      displayName: 'Sin nombre',
      primaryEmail: null,
      workforceIntakeStatus: 'pending_intake',
      identityProfileId: null,
      active: false,
      assignable: false,
      createdAt: null,
      ageDays: 0,
      hireDate: null,
      employmentType: null,
      contractType: null,
      contractEndDate: null,
      dailyRequired: null,
      payRegime: null,
      payrollVia: null,
      deelContractId: null,
      roleTitle: null,
      roleTitleSource: null,
      compensationCurrency: null,
      compensationAmount: null,
      notionUserId: null,
      notionDisplayName: null,
      notionSourceLinkId: null,
      externalIdentityRequired: false
    }

    const blocker = issue(memberId, 'identity_access', 'member_not_found', 'Colaborador no encontrado', 'No existe member para evaluar.')

    return {
      member: snapshot,
      status: 'blocked',
      ready: false,
      readinessScore: 0,
      blockerCount: 1,
      warningCount: 0,
      topBlockerLane: 'identity_access',
      lanes: [lane(memberId, 'identity_access', 'blocked', blocker.detail)],
      blockers: [blocker],
      warnings: [],
      evaluatedAt
    }
  }

  const roleTitle = await resolveRoleTitle({ memberId, context: 'internal_profile' })
  const payRegime = row.compensation_pay_regime ?? row.pay_regime
  const payrollVia = row.payroll_via
  const contractType = row.compensation_contract_type ?? row.contract_type

  const snapshot: WorkforceActivationMemberSnapshot = {
    memberId: row.member_id,
    displayName: row.display_name ?? 'Sin nombre',
    primaryEmail: row.primary_email,
    workforceIntakeStatus: toWorkforceIntakeStatus(row.workforce_intake_status),
    identityProfileId: row.identity_profile_id,
    active: row.active,
    assignable: row.assignable,
    createdAt: toIsoDateTime(row.created_at),
    ageDays: toInt(row.created_at ? Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86_400_000) : 0),
    hireDate: toIsoDate(row.hire_date),
    employmentType: row.employment_type,
    contractType,
    contractEndDate: toIsoDate(row.contract_end_date),
    dailyRequired: row.daily_required,
    payRegime,
    payrollVia,
    deelContractId: row.deel_contract_id,
    roleTitle: roleTitle.value,
    roleTitleSource: roleTitle.source,
    compensationCurrency: normalizeCurrency(row.compensation_currency, payRegime),
    compensationAmount: toMoney(row.compensation_amount),
    notionUserId: row.notion_source_link_object_id ?? row.notion_user_id,
    notionDisplayName: row.notion_display_name,
    notionSourceLinkId: row.notion_source_link_id,
    externalIdentityRequired: false
  }

  const externalIdentityRequirement = resolveWorkforceExternalIdentityRequirement(snapshot)

  const snapshotWithExternalIdentity: WorkforceActivationMemberSnapshot = {
    ...snapshot,
    externalIdentityRequired: externalIdentityRequirement.required
  }

  const blockers: WorkforceActivationIssue[] = []
  const warnings: WorkforceActivationIssue[] = []
  const lanes: WorkforceActivationLane[] = []

  if (!snapshot.active) {
    blockers.push(issue(memberId, 'identity_access', 'member_inactive', 'Colaborador inactivo', 'Activa el member antes de completar intake.'))
  }

  if (!snapshot.identityProfileId) {
    blockers.push(issue(memberId, 'identity_access', 'identity_profile_missing', 'Falta perfil People', 'Conecta identity_profile_id desde SCIM o People Ops.'))
  }

  if (!row.has_login) {
    warnings.push(issue(memberId, 'identity_access', 'identity_access_missing_login', 'Acceso operativo no confirmado', 'No hay client_user activo asociado al perfil People.'))
  }

  lanes.push(
    lane(
      memberId,
      'identity_access',
      blockers.some(b => b.lane === 'identity_access') ? 'blocked' : warnings.some(w => w.lane === 'identity_access') ? 'warning' : 'ready',
      blockers.find(b => b.lane === 'identity_access')?.detail ??
        warnings.find(w => w.lane === 'identity_access')?.detail ??
        DEFAULT_LANE_DETAIL.identity_access
    )
  )

  if (!row.has_active_relationship) {
    blockers.push(issue(memberId, 'work_relationship', 'work_relationship_missing', 'Falta relación legal activa', 'Declara una relación activa con la entidad legal empleadora o contratante.'))
  }

  lanes.push(
    lane(
      memberId,
      'work_relationship',
      blockers.some(b => b.lane === 'work_relationship') ? 'blocked' : 'ready',
      blockers.find(b => b.lane === 'work_relationship')?.detail ?? DEFAULT_LANE_DETAIL.work_relationship
    )
  )

  const employmentChecks: Array<[boolean, WorkforceActivationBlockerCode, string, string]> = [
    [Boolean(snapshot.hireDate), 'hire_date_missing', 'Falta fecha de ingreso', 'Define fecha de ingreso laboral.'],
    [Boolean(snapshot.employmentType), 'employment_type_missing', 'Falta tipo de empleo', 'Define la relación como empleado, contractor u otro tipo permitido.'],
    [Boolean(snapshot.contractType), 'contract_type_missing', 'Falta tipo de contrato', 'Define contrato indefinido, plazo fijo, honorarios, contractor o EOR.'],
    [Boolean(snapshot.payRegime), 'pay_regime_missing', 'Falta régimen de pago', 'Define régimen Chile o internacional.'],
    [Boolean(snapshot.payrollVia), 'payroll_via_missing', 'Falta vía de pago', 'Define si Greenhouse paga internamente o vía Deel.']
  ]

  employmentChecks.forEach(([ok, code, label, detail]) => {
    if (!ok) blockers.push(issue(memberId, 'employment', code, label, detail))
  })

  lanes.push(
    lane(
      memberId,
      'employment',
      blockers.some(b => b.lane === 'employment') ? 'blocked' : 'ready',
      blockers.find(b => b.lane === 'employment')?.detail ?? DEFAULT_LANE_DETAIL.employment
    )
  )

  if (!snapshot.roleTitle) {
    blockers.push(issue(memberId, 'role_title', 'role_title_missing', 'Falta cargo vigente', 'Define el cargo laboral antes de cerrar intake.'))
  }

  if (roleTitle.hasDriftWithEntra) {
    warnings.push(issue(memberId, 'role_title', 'role_title_drift_pending', 'Cargo distinto a Microsoft', 'Existe drift con Entra; resolver o aceptar desde People Ops.'))
  }

  lanes.push(
    lane(
      memberId,
      'role_title',
      blockers.some(b => b.lane === 'role_title') ? 'blocked' : warnings.some(w => w.lane === 'role_title') ? 'warning' : 'ready',
      blockers.find(b => b.lane === 'role_title')?.detail ??
        warnings.find(w => w.lane === 'role_title')?.detail ??
        DEFAULT_LANE_DETAIL.role_title
    )
  )

  if (!snapshot.compensationCurrency) {
    blockers.push(issue(memberId, 'compensation', 'compensation_missing', 'Falta compensación vigente', 'Crea una versión de compensación vigente.'))
  } else if (!snapshot.compensationAmount || snapshot.compensationAmount <= 0) {
    blockers.push(issue(memberId, 'compensation', 'compensation_amount_missing', 'Falta monto de compensación', 'Define salario o tarifa con monto mayor a cero.'))
  }

  lanes.push(
    lane(
      memberId,
      'compensation',
      blockers.some(b => b.lane === 'compensation') ? 'blocked' : 'ready',
      blockers.find(b => b.lane === 'compensation')?.detail ?? DEFAULT_LANE_DETAIL.compensation
    )
  )

  const legal = await resolveLegalLane(snapshot)

  blockers.push(...legal.blockers)
  warnings.push(...legal.warnings)
  lanes.push(legal.lane)

  const payment = await resolvePaymentLane(snapshot)

  blockers.push(...payment.blockers)
  warnings.push(...payment.warnings)
  lanes.push(payment.lane)

  const hasNotionLink = Boolean(snapshot.notionUserId || snapshot.notionSourceLinkId)
  const notionPendingProposalCount = toInt(row.notion_pending_proposal_count)
  const notionConflictCount = toInt(row.notion_conflict_count)

  if (!externalIdentityRequirement.required) {
    lanes.push(
      lane(
        memberId,
        'operational_integrations',
        'not_applicable',
        externalIdentityRequirement.detail
      )
    )
  } else if (notionConflictCount > 0) {
    blockers.push(
      issue(
        memberId,
        'operational_integrations',
        'notion_link_conflict',
        'Usuario Notion en conflicto',
        'El usuario Notion asociado aparece activo en otro perfil People; resolver el conflicto antes de activar.'
      )
    )
    lanes.push(lane(memberId, 'operational_integrations', 'blocked', 'Existe conflicto de link Notion activo.'))
  } else if (hasNotionLink) {
    lanes.push(lane(memberId, 'operational_integrations', 'ready', DEFAULT_LANE_DETAIL.operational_integrations))
  } else if (notionPendingProposalCount > 1) {
    blockers.push(
      issue(
        memberId,
        'operational_integrations',
        'notion_link_ambiguous',
        'Más de un candidato Notion',
        'Hay múltiples propuestas pendientes; elegir una fuente canónica antes de cerrar intake.'
      )
    )
    lanes.push(lane(memberId, 'operational_integrations', 'blocked', 'Propuestas Notion ambiguas requieren revisión humana.'))
  } else {
    blockers.push(
      issue(
        memberId,
        'operational_integrations',
        'notion_link_missing',
        'Falta usuario Notion reconciliado',
        'Buscar y aprobar el usuario Notion desde Workforce Activation; no ingresar UUIDs manuales.'
      )
    )
    lanes.push(lane(memberId, 'operational_integrations', 'blocked', 'Falta link Notion activo.'))
  }

  const operationalOnboarding = await resolveOperationalOnboardingLane(memberId)

  blockers.push(...operationalOnboarding.blockers)
  warnings.push(...operationalOnboarding.warnings)
  lanes.push(operationalOnboarding.lane)

  const needsContractorEngagement = snapshot.contractType === 'honorarios' || snapshot.contractType === 'contractor' || snapshot.contractType === 'eor'

  if (needsContractorEngagement) {
    warnings.push(
      issue(
        memberId,
        'contractor_engagement',
        'contractor_engagement_pending_foundation',
        'Engagement contractor pendiente de foundation',
        'TASK-790 formalizará el engagement contractor; no bloquea la activación V1 si contrato, compensación y pago están listos.'
      )
    )
    lanes.push(lane(memberId, 'contractor_engagement', 'warning', 'Engagement contractor queda como seguimiento operativo V1.'))
  } else {
    lanes.push(lane(memberId, 'contractor_engagement', 'not_applicable', DEFAULT_LANE_DETAIL.contractor_engagement))
  }

  const ready = blockers.length === 0
  const readyLanes = lanes.filter(item => item.status === 'ready' || item.status === 'not_applicable').length
  const readinessScore = Math.round((readyLanes / CRITICAL_LANES.length) * 100)

  const status: WorkforceActivationReadinessStatus =
    snapshot.workforceIntakeStatus === 'completed'
      ? 'completed'
      : ready
        ? 'ready_to_complete'
        : 'blocked'

  return {
    member: snapshotWithExternalIdentity,
    status,
    ready,
    readinessScore,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    topBlockerLane: blockers[0]?.lane ?? null,
    lanes,
    blockers,
    warnings,
    evaluatedAt
  }
}

export const buildWorkforceActivationReadinessAuditSnapshot = (
  readiness: WorkforceActivationReadiness
) => ({
  evaluatedAt: readiness.evaluatedAt,
  ready: readiness.ready,
  status: readiness.status,
  readinessScore: readiness.readinessScore,
  blockerCodes: readiness.blockers.map(blocker => blocker.code),
  warningCodes: readiness.warnings.map(warning => warning.code),
  laneStatuses: readiness.lanes.map(item => ({ key: item.key, status: item.status }))
})
