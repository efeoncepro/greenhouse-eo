import 'server-only'

import { getDb, query, withTransaction } from '@/lib/db'
import { readMemberCapacityEconomicsBatch } from '@/lib/member-capacity-economics/store'
import { getServicesBySpace } from '@/lib/services/service-store'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import type {
  MemberSkill,
  ServiceSkillRequirement,
  ServiceStaffingRecommendation,
  SkillCategory,
  SkillCatalogItem,
  SkillSeniorityLevel,
  SpaceSkillCoverage,
  StaffingCandidate,
  StaffingRequirementCoverage,
  UpsertMemberSkillInput,
  UpsertServiceSkillRequirementInput
} from '@/types/agency-skills'

type CatalogRow = Record<string, unknown> & {
  skill_code: string
  skill_name: string
  skill_category: SkillCategory
  description: string | null
  seniority_levels: string[] | null
  active: boolean
  display_order: number | null
}

type MemberSkillRow = Record<string, unknown> & {
  member_id: string
  skill_code: string
  skill_name: string
  skill_category: SkillCategory
  seniority_level: string
  source_system: string | null
  notes: string | null
  verified_by: string | null
  verified_at: string | Date | null
}

type ServiceSkillRequirementRow = Record<string, unknown> & {
  service_id: string
  skill_code: string
  skill_name: string
  skill_category: SkillCategory
  required_seniority: string
  required_fte: string | number
  notes: string | null
}

type SpaceMemberAssignmentRow = Record<string, unknown> & {
  assignment_id: string
  member_id: string
  display_name: string
  role_title: string | null
  role_category: string | null
  fte_allocation: string | number | null
  placement_id: string | null
  placement_status: string | null
}

const SENIORITY_RANK: Record<SkillSeniorityLevel, number> = {
  junior: 1,
  mid: 2,
  senior: 3,
  lead: 4
}

const HOURS_PER_FTE = 160

const EMPTY_SUMMARY = {
  requiredSkillCount: 0,
  coveredSkillCount: 0,
  gapSkillCount: 0,
  serviceCountWithRequirements: 0,
  coveragePct: null
} as const

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableString = (value: unknown) => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const toTimestampString = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return value
}

const normalizeSkillCode = (value: unknown) => String(value || '').trim().toLowerCase()

const normalizeSeniority = (value: unknown): SkillSeniorityLevel => {
  const seniority = String(value || '').trim().toLowerCase()

  if (seniority === 'junior' || seniority === 'mid' || seniority === 'senior' || seniority === 'lead') {
    return seniority
  }

  throw new StaffingValidationError(`seniority_level inválido: ${String(value || '')}`)
}

const uniqueByKey = <T>(items: T[], getKey: (item: T) => string) => {
  const map = new Map<string, T>()

  for (const item of items) {
    map.set(getKey(item), item)
  }

  return [...map.values()]
}

const mapCatalogRow = (row: CatalogRow): SkillCatalogItem => ({
  skillCode: row.skill_code,
  skillName: row.skill_name,
  skillCategory: row.skill_category,
  description: row.description,
  seniorityLevels: ((row.seniority_levels || []) as string[]).map(normalizeSeniority),
  active: row.active,
  displayOrder: row.display_order
})

const mapMemberSkillRow = (row: MemberSkillRow): MemberSkill => ({
  memberId: row.member_id,
  skillCode: row.skill_code,
  skillName: row.skill_name,
  skillCategory: row.skill_category,
  seniorityLevel: normalizeSeniority(row.seniority_level),
  sourceSystem: toNullableString(row.source_system) || 'manual',
  notes: row.notes,
  verifiedBy: row.verified_by,
  verifiedAt: toTimestampString(row.verified_at)
})

const mapServiceSkillRequirementRow = (row: ServiceSkillRequirementRow): ServiceSkillRequirement => ({
  serviceId: row.service_id,
  skillCode: row.skill_code,
  skillName: row.skill_name,
  skillCategory: row.skill_category,
  requiredSeniority: normalizeSeniority(row.required_seniority),
  requiredFte: Number(toNumber(row.required_fte).toFixed(3)),
  notes: row.notes
})

const getCurrentPeriod = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

  return {
    year: match ? Number(match[1]) : new Date().getFullYear(),
    month: match ? Number(match[2]) : new Date().getMonth() + 1
  }
}

export class StaffingValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'StaffingValidationError'
    this.statusCode = statusCode
  }
}

const validateSpaceExists = async (spaceId: string) => {
  const db = await getDb()

  const space = await db
    .selectFrom('greenhouse_core.spaces')
    .select('space_id')
    .where('space_id', '=', spaceId)
    .where('active', '=', true)
    .executeTakeFirst()

  if (!space) {
    throw new StaffingValidationError(`Space '${spaceId}' no encontrado.`, 404)
  }
}

const validateSkillCodesExist = async (skillCodes: string[]) => {
  if (skillCodes.length === 0) return

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.skill_catalog')
    .select('skill_code')
    .where('skill_code', 'in', skillCodes)
    .execute()

  const existing = new Set(rows.map(row => row.skill_code))
  const missing = skillCodes.filter(skillCode => !existing.has(skillCode))

  if (missing.length > 0) {
    throw new StaffingValidationError(`skill_code inexistente: ${missing.join(', ')}`)
  }
}

const validateSpaceMember = async (spaceId: string, memberId: string) => {
  await validateSpaceExists(spaceId)

  const rows = await query<Record<string, unknown> & { member_id: string }>(
    `
      SELECT a.member_id
      FROM greenhouse_core.spaces s
      INNER JOIN greenhouse_core.client_team_assignments a
        ON a.client_id = s.client_id
      INNER JOIN greenhouse_core.members m
        ON m.member_id = a.member_id
      WHERE s.space_id = $1
        AND s.active = TRUE
        AND a.member_id = $2
        AND a.active = TRUE
        AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
        AND m.active = TRUE
      LIMIT 1
    `,
    [spaceId, memberId]
  )

  if (rows.length === 0) {
    throw new StaffingValidationError(
      `El miembro '${memberId}' no tiene assignment activo dentro del Space '${spaceId}'.`,
      404
    )
  }
}

const validateSpaceService = async (spaceId: string, serviceId: string) => {
  await validateSpaceExists(spaceId)

  const db = await getDb()

  const service = await db
    .selectFrom('greenhouse_core.services')
    .select('service_id')
    .where('service_id', '=', serviceId)
    .where('space_id', '=', spaceId)
    .where('active', '=', true)
    .executeTakeFirst()

  if (!service) {
    throw new StaffingValidationError(`El servicio '${serviceId}' no pertenece al Space '${spaceId}'.`, 404)
  }
}

const readMemberSkills = async (memberId: string) => {
  const rows = await query<MemberSkillRow>(
    `
      SELECT
        ms.member_id,
        ms.skill_code,
        sc.skill_name,
        sc.skill_category,
        ms.seniority_level,
        ms.source_system,
        ms.notes,
        ms.verified_by,
        ms.verified_at
      FROM greenhouse_core.member_skills ms
      INNER JOIN greenhouse_core.skill_catalog sc
        ON sc.skill_code = ms.skill_code
      WHERE ms.member_id = $1
      ORDER BY sc.display_order NULLS LAST, sc.skill_name ASC
    `,
    [memberId]
  )

  return rows.map(mapMemberSkillRow)
}

const readServiceSkillRequirements = async (serviceId: string) => {
  const rows = await query<ServiceSkillRequirementRow>(
    `
      SELECT
        ssr.service_id,
        ssr.skill_code,
        sc.skill_name,
        sc.skill_category,
        ssr.required_seniority,
        ssr.required_fte,
        ssr.notes
      FROM greenhouse_core.service_skill_requirements ssr
      INNER JOIN greenhouse_core.skill_catalog sc
        ON sc.skill_code = ssr.skill_code
      WHERE ssr.service_id = $1
      ORDER BY sc.display_order NULLS LAST, sc.skill_name ASC
    `,
    [serviceId]
  )

  return rows.map(mapServiceSkillRequirementRow)
}

const readSpaceAssignments = async (spaceId: string) =>
  query<SpaceMemberAssignmentRow>(
    `
      SELECT
        a.assignment_id,
        a.member_id,
        m.display_name,
        COALESCE(a.role_title_override, m.role_title) AS role_title,
        m.role_category,
        a.fte_allocation,
        placement.placement_id,
        placement.status AS placement_status
      FROM greenhouse_core.spaces s
      INNER JOIN greenhouse_core.client_team_assignments a
        ON a.client_id = s.client_id
      INNER JOIN greenhouse_core.members m
        ON m.member_id = a.member_id
      LEFT JOIN greenhouse_delivery.staff_aug_placements placement
        ON placement.assignment_id = a.assignment_id
      WHERE s.space_id = $1
        AND s.active = TRUE
        AND a.active = TRUE
        AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
        AND m.active = TRUE
      ORDER BY m.display_name ASC
    `,
    [spaceId]
  )

const sanitizeMemberSkillInputs = (skills: UpsertMemberSkillInput[]) =>
  uniqueByKey(
    skills.map(skill => ({
      skillCode: normalizeSkillCode(skill.skillCode),
      seniorityLevel: normalizeSeniority(skill.seniorityLevel),
      notes: toNullableString(skill.notes),
      sourceSystem: toNullableString(skill.sourceSystem) || 'manual'
    })),
    skill => skill.skillCode
  )

const sanitizeServiceSkillRequirementInputs = (requirements: UpsertServiceSkillRequirementInput[]) =>
  uniqueByKey(
    requirements.map(requirement => {
      const requiredFte = Number(toNumber(requirement.requiredFte).toFixed(3))

      if (!(requiredFte > 0)) {
        throw new StaffingValidationError(`required_fte inválido para '${requirement.skillCode}'.`)
      }

      return {
        skillCode: normalizeSkillCode(requirement.skillCode),
        requiredSeniority: normalizeSeniority(requirement.requiredSeniority),
        requiredFte,
        notes: toNullableString(requirement.notes)
      }
    }),
    requirement => requirement.skillCode
  )

const buildCandidate = ({
  assignment,
  memberSkill,
  availableFte,
  utilizationPercent,
  requiredSeniority
}: {
  assignment: SpaceMemberAssignmentRow
  memberSkill: MemberSkill
  availableFte: number
  utilizationPercent: number | null
  requiredSeniority: SkillSeniorityLevel
}): StaffingCandidate => {
  const assignmentFte = Number(toNumber(assignment.fte_allocation).toFixed(2))
  const seniorityDelta = SENIORITY_RANK[memberSkill.seniorityLevel] - SENIORITY_RANK[requiredSeniority]
  const seniorityScore = seniorityDelta === 0 ? 100 : seniorityDelta > 0 ? 85 : 50

  const availabilityScore = assignmentFte > 0
    ? Math.max(0, Math.min(100, Math.round((availableFte / assignmentFte) * 100)))
    : 0

  const fitScore = Math.round((seniorityScore * 0.65) + (availabilityScore * 0.35))

  return {
    memberId: assignment.member_id,
    displayName: assignment.display_name,
    roleTitle: assignment.role_title,
    roleCategory: assignment.role_category,
    assignmentId: assignment.assignment_id,
    assignmentFte,
    availableFte,
    utilizationPercent,
    placementId: assignment.placement_id,
    placementStatus: assignment.placement_status,
    seniorityLevel: memberSkill.seniorityLevel,
    seniorityScore,
    availabilityScore,
    fitScore
  }
}

export const listSkillCatalog = async ({
  category,
  activeOnly = true
}: {
  category?: SkillCategory
  activeOnly?: boolean
} = {}): Promise<SkillCatalogItem[]> => {
  const db = await getDb()
  let builder = db
    .selectFrom('greenhouse_core.skill_catalog')
    .select([
      'skill_code',
      'skill_name',
      'skill_category',
      'description',
      'seniority_levels',
      'active',
      'display_order'
    ])

  if (activeOnly) {
    builder = builder.where('active', '=', true)
  }

  if (category) {
    builder = builder.where('skill_category', '=', category)
  }

  const rows = await builder.orderBy('display_order').orderBy('skill_name').execute()

  return (rows as CatalogRow[]).map(mapCatalogRow)
}

export const getMemberSkillsForSpaceMember = async ({
  spaceId,
  memberId
}: {
  spaceId: string
  memberId: string
}) => {
  await validateSpaceMember(spaceId, memberId)

  return {
    spaceId,
    memberId,
    items: await readMemberSkills(memberId)
  }
}

export const replaceMemberSkillsForSpaceMember = async ({
  spaceId,
  memberId,
  skills,
  actorUserId
}: {
  spaceId: string
  memberId: string
  skills: UpsertMemberSkillInput[]
  actorUserId?: string | null
}) => {
  await validateSpaceMember(spaceId, memberId)

  const sanitizedSkills = sanitizeMemberSkillInputs(skills)

  await validateSkillCodesExist(sanitizedSkills.map(skill => skill.skillCode))

  const existing = await readMemberSkills(memberId)
  const nextSkillCodes = new Set(sanitizedSkills.map(skill => skill.skillCode))

  await withTransaction(async client => {
    await client.query('DELETE FROM greenhouse_core.member_skills WHERE member_id = $1', [memberId])

    for (const skill of sanitizedSkills) {
      await client.query(
        `
          INSERT INTO greenhouse_core.member_skills (
            member_id,
            skill_code,
            seniority_level,
            source_system,
            notes,
            verified_by,
            verified_at,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [memberId, skill.skillCode, skill.seniorityLevel, skill.sourceSystem, skill.notes, actorUserId ?? null]
      )

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.memberSkill,
          aggregateId: `${memberId}:${skill.skillCode}`,
          eventType: EVENT_TYPES.memberSkillUpserted,
          payload: {
            spaceId,
            memberId,
            skillCode: skill.skillCode,
            seniorityLevel: skill.seniorityLevel,
            sourceSystem: skill.sourceSystem
          }
        },
        client
      )
    }

    for (const skill of existing.filter(item => !nextSkillCodes.has(item.skillCode))) {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.memberSkill,
          aggregateId: `${memberId}:${skill.skillCode}`,
          eventType: EVENT_TYPES.memberSkillDeleted,
          payload: {
            spaceId,
            memberId,
            skillCode: skill.skillCode
          }
        },
        client
      )
    }
  })

  return getMemberSkillsForSpaceMember({ spaceId, memberId })
}

export const getServiceSkillRequirementsForSpaceService = async ({
  spaceId,
  serviceId
}: {
  spaceId: string
  serviceId: string
}) => {
  await validateSpaceService(spaceId, serviceId)

  return {
    spaceId,
    serviceId,
    items: await readServiceSkillRequirements(serviceId)
  }
}

export const replaceServiceSkillRequirementsForSpaceService = async ({
  spaceId,
  serviceId,
  requirements,
  actorUserId
}: {
  spaceId: string
  serviceId: string
  requirements: UpsertServiceSkillRequirementInput[]
  actorUserId?: string | null
}) => {
  await validateSpaceService(spaceId, serviceId)

  const sanitizedRequirements = sanitizeServiceSkillRequirementInputs(requirements)

  await validateSkillCodesExist(sanitizedRequirements.map(requirement => requirement.skillCode))

  const existing = await readServiceSkillRequirements(serviceId)
  const nextSkillCodes = new Set(sanitizedRequirements.map(requirement => requirement.skillCode))

  await withTransaction(async client => {
    await client.query('DELETE FROM greenhouse_core.service_skill_requirements WHERE service_id = $1', [serviceId])

    for (const requirement of sanitizedRequirements) {
      await client.query(
        `
          INSERT INTO greenhouse_core.service_skill_requirements (
            service_id,
            skill_code,
            required_seniority,
            required_fte,
            notes,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [
          serviceId,
          requirement.skillCode,
          requirement.requiredSeniority,
          requirement.requiredFte,
          requirement.notes
        ]
      )

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.serviceSkillRequirement,
          aggregateId: `${serviceId}:${requirement.skillCode}`,
          eventType: EVENT_TYPES.serviceSkillRequirementUpserted,
          payload: {
            spaceId,
            serviceId,
            skillCode: requirement.skillCode,
            requiredSeniority: requirement.requiredSeniority,
            requiredFte: requirement.requiredFte,
            updatedBy: actorUserId ?? null
          }
        },
        client
      )
    }

    for (const requirement of existing.filter(item => !nextSkillCodes.has(item.skillCode))) {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.serviceSkillRequirement,
          aggregateId: `${serviceId}:${requirement.skillCode}`,
          eventType: EVENT_TYPES.serviceSkillRequirementDeleted,
          payload: {
            spaceId,
            serviceId,
            skillCode: requirement.skillCode
          }
        },
        client
      )
    }
  })

  return getServiceSkillRequirementsForSpaceService({ spaceId, serviceId })
}

export const getSpaceSkillCoverage = async ({
  spaceId,
  serviceId
}: {
  spaceId: string
  serviceId?: string
}): Promise<SpaceSkillCoverage> => {
  await validateSpaceExists(spaceId)

  const [services, assignments] = await Promise.all([
    getServicesBySpace(spaceId),
    readSpaceAssignments(spaceId)
  ])

  const scopedServices = serviceId ? services.filter(service => service.serviceId === serviceId) : services

  if (serviceId && scopedServices.length === 0) {
    throw new StaffingValidationError(`El servicio '${serviceId}' no pertenece al Space '${spaceId}'.`, 404)
  }

  const memberIds = uniqueByKey(assignments, row => row.member_id).map(row => row.member_id)

  const memberSkillRows = memberIds.length > 0
    ? await query<MemberSkillRow>(
        `
          SELECT
            ms.member_id,
            ms.skill_code,
            sc.skill_name,
            sc.skill_category,
            ms.seniority_level,
            ms.source_system,
            ms.notes,
            ms.verified_by,
            ms.verified_at
          FROM greenhouse_core.member_skills ms
          INNER JOIN greenhouse_core.skill_catalog sc
            ON sc.skill_code = ms.skill_code
          WHERE ms.member_id = ANY($1::text[])
          ORDER BY sc.display_order NULLS LAST, sc.skill_name ASC
        `,
        [memberIds]
      )
    : []

  const requirementRows = scopedServices.length > 0
    ? await query<ServiceSkillRequirementRow>(
        `
          SELECT
            ssr.service_id,
            ssr.skill_code,
            sc.skill_name,
            sc.skill_category,
            ssr.required_seniority,
            ssr.required_fte,
            ssr.notes
          FROM greenhouse_core.service_skill_requirements ssr
          INNER JOIN greenhouse_core.skill_catalog sc
            ON sc.skill_code = ssr.skill_code
          WHERE ssr.service_id = ANY($1::text[])
          ORDER BY sc.display_order NULLS LAST, sc.skill_name ASC
        `,
        [scopedServices.map(service => service.serviceId)]
      )
    : []

  const memberSkillsByMember = new Map<string, MemberSkill[]>()

  for (const memberSkill of memberSkillRows.map(mapMemberSkillRow)) {
    const list = memberSkillsByMember.get(memberSkill.memberId) || []

    list.push(memberSkill)
    memberSkillsByMember.set(memberSkill.memberId, list)
  }

  const requirementsByService = new Map<string, ServiceSkillRequirement[]>()

  for (const requirement of requirementRows.map(mapServiceSkillRequirementRow)) {
    const list = requirementsByService.get(requirement.serviceId) || []

    list.push(requirement)
    requirementsByService.set(requirement.serviceId, list)
  }

  const currentPeriod = getCurrentPeriod()

  const snapshots = memberIds.length > 0
    ? await readMemberCapacityEconomicsBatch({
        memberIds,
        year: currentPeriod.year,
        month: currentPeriod.month
      }).catch(() => new Map())
    : new Map()

  const recommendations: ServiceStaffingRecommendation[] = scopedServices
    .map(service => {
      const requirements = requirementsByService.get(service.serviceId) || []

      const requirementCoverage: StaffingRequirementCoverage[] = requirements.map(requirement => {
        const candidates = assignments
          .flatMap(assignment => {
            const memberSkills = memberSkillsByMember.get(assignment.member_id) || []

            return memberSkills
              .filter(memberSkill =>
                memberSkill.skillCode === requirement.skillCode &&
                SENIORITY_RANK[memberSkill.seniorityLevel] >= SENIORITY_RANK[requirement.requiredSeniority]
              )
              .map(memberSkill => {
                const snapshot = snapshots.get(assignment.member_id)

                const availableFte = snapshot
                  ? Number(Math.max(0, snapshot.commercialAvailabilityHours / HOURS_PER_FTE).toFixed(2))
                  : 0

                return buildCandidate({
                  assignment,
                  memberSkill,
                  availableFte,
                  utilizationPercent: snapshot?.usagePercent ?? null,
                  requiredSeniority: requirement.requiredSeniority
                })
              })
          })
          .sort((left, right) => right.fitScore - left.fitScore || right.assignmentFte - left.assignmentFte)

        const coverageFte = Number(
          candidates.reduce((sum, candidate) => sum + candidate.assignmentFte, 0).toFixed(2)
        )

        const status: StaffingRequirementCoverage['status'] =
          coverageFte >= requirement.requiredFte
            ? 'covered'
            : coverageFte > 0
              ? 'partial'
              : 'missing'

        return {
          ...requirement,
          matchedMemberCount: uniqueByKey(candidates, candidate => candidate.memberId).length,
          coverageFte,
          status,
          topCandidates: candidates.slice(0, 5)
        }
      })

      const fitScores = requirementCoverage
        .map(item => item.topCandidates[0]?.fitScore ?? null)
        .filter((value): value is number => value !== null)

      return {
        serviceId: service.serviceId,
        serviceName: service.name,
        serviceLine: service.lineaDeServicio,
        serviceType: service.servicioEspecifico,
        requirements: requirementCoverage,
        gaps: requirementCoverage.filter(item => item.status !== 'covered'),
        summary: {
          totalRequirementCount: requirementCoverage.length,
          coveredRequirementCount: requirementCoverage.filter(item => item.status === 'covered').length,
          gapRequirementCount: requirementCoverage.filter(item => item.status !== 'covered').length,
          averageFitScore: fitScores.length > 0
            ? Math.round(fitScores.reduce((sum, value) => sum + value, 0) / fitScores.length)
            : null
        }
      }
    })
    .filter(service => service.requirements.length > 0)

  const requiredSkillCount = recommendations.reduce((sum, service) => sum + service.summary.totalRequirementCount, 0)
  const coveredSkillCount = recommendations.reduce((sum, service) => sum + service.summary.coveredRequirementCount, 0)
  const gapSkillCount = recommendations.reduce((sum, service) => sum + service.summary.gapRequirementCount, 0)

  return {
    spaceId,
    summary: {
      requiredSkillCount,
      coveredSkillCount,
      gapSkillCount,
      serviceCountWithRequirements: recommendations.length,
      coveragePct: requiredSkillCount > 0
        ? Math.round((coveredSkillCount / requiredSkillCount) * 100)
        : null
    },
    memberSkillsByMember: Object.fromEntries(
      memberIds.map(memberId => [memberId, memberSkillsByMember.get(memberId) || []])
    ),
    services: recommendations
  }
}

export const getEmptySpaceSkillCoverage = (spaceId: string | null): SpaceSkillCoverage => ({
  spaceId: spaceId || 'unscoped',
  summary: { ...EMPTY_SUMMARY },
  memberSkillsByMember: {},
  services: []
})
