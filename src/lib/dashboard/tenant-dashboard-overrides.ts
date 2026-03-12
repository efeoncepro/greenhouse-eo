import type {
  GreenhouseDashboardAccountTeam,
  GreenhouseDashboardMonthlyDeliveryPoint,
  GreenhouseDashboardQualityPoint,
  GreenhouseDashboardTeamMember,
  GreenhouseDashboardTool,
  GreenhouseDashboardTooling
} from '@/types/greenhouse-dashboard'

type KnownPersonProfile = {
  id: string
  name: string
  role: string
  avatarPath?: string | null
  aliases: string[]
}

type TeamMemberOverride = Omit<GreenhouseDashboardTeamMember, 'source'>

type ToolOverride = {
  label: string
  category: string
  description: string
  href?: string | null
}

type QualitySeed = {
  month: string
  avgRpa: number
}

type TenantDashboardOverride = {
  accountTeam?: TeamMemberOverride[]
  technologyTools?: ToolOverride[]
  aiTools?: ToolOverride[]
  qualitySeeds?: QualitySeed[]
}

type MeasuredQualitySignal = {
  month: string
  label: string
  avgRpa: number | null
  hasReliableRpa: boolean
}

const knownPeople: KnownPersonProfile[] = [
  {
    id: 'efeonce-daniela-ferreira',
    name: 'Daniela Ferreira',
    role: 'Creative Operations Lead',
    avatarPath: '/images/greenhouse/team/EO_Avatar-Daniela.png',
    aliases: ['daniela', 'daniela ferreira', 'dferreira@efeoncepro.com']
  },
  {
    id: 'efeonce-melkin-hernandez',
    name: 'Melkin Hernandez',
    role: 'Senior Visual Designer',
    avatarPath: '/images/greenhouse/team/EO_Avatar-Melkin.png',
    aliases: ['melkin hernandez', 'mekin hernandez', 'melkin hernandez | efeonce', 'mekin hernandez | efeonce']
  },
  {
    id: 'efeonce-andres-carlosama',
    name: 'Andres Carlosama',
    role: 'Senior Visual Designer',
    avatarPath: '/images/greenhouse/team/EO_Avatar-Fondo_Team_Andr%C3%A9s.png',
    aliases: ['andres carlosama', 'andres carlosama | efeonce', 'andres carlosama | efoence', 'andres carlosama | efeonce']
  },
  {
    id: 'efeonce-julio-reyes',
    name: 'Julio Reyes',
    role: 'Efeonce Team',
    avatarPath: '/images/greenhouse/team/EO_Avatar-Jullio.png',
    aliases: ['julio reyes', 'jullio', 'julio', 'julio.reyes@efeonce.org']
  },
  {
    id: 'efeonce-valentina',
    name: 'Valentina',
    role: 'Efeonce Team',
    avatarPath: '/images/greenhouse/team/EO_Avatar-Valentina.png',
    aliases: ['valentina']
  },
  {
    id: 'efeonce-humberly',
    name: 'Humberly',
    role: 'Efeonce Team',
    avatarPath: '/images/greenhouse/team/Humberly.jpg',
    aliases: ['humberly']
  },
  {
    id: 'efeonce-luis',
    name: 'Luis',
    role: 'Efeonce Team',
    avatarPath: '/images/greenhouse/team/Luis.jpg',
    aliases: ['luis']
  }
]

const knownPeopleById = new Map(knownPeople.map(profile => [profile.id, profile]))

const serviceModuleTechnologyDefaults: Record<string, ToolOverride[]> = {
  agencia_creativa: [
    { label: 'Figma', category: 'Diseno colaborativo', description: 'Diseno, comentarios y revision visual.' },
    { label: 'Frame.io', category: 'Revision audiovisual', description: 'Revision de video y feedback centralizado.' },
    { label: 'Notion', category: 'Operacion y seguimiento', description: 'Seguimiento operativo del servicio.' }
  ],
  desarrollo_web: [
    { label: 'GitHub', category: 'Codigo y versionado', description: 'Repositorio y control de versiones.' },
    { label: 'Vercel', category: 'Deploy y hosting', description: 'Publicacion y hosting del entorno web.' },
    { label: 'Notion', category: 'Operacion y seguimiento', description: 'Seguimiento operativo del servicio.' }
  ],
  consultoria_crm: [
    { label: 'HubSpot', category: 'CRM y automatizacion', description: 'Gestion comercial y automatizacion.' },
    { label: 'Notion', category: 'Operacion y seguimiento', description: 'Seguimiento operativo del servicio.' },
    { label: 'Looker Studio', category: 'Reporting', description: 'Visualizacion y reporting ejecutivo.' }
  ]
}

const serviceModuleAiDefaults: Record<string, ToolOverride[]> = {
  agencia_creativa: [
    { label: 'ChatGPT', category: 'Ideacion y apoyo creativo', description: 'Asistencia estrategica y de contenido.' },
    { label: 'Adobe Firefly', category: 'Generacion visual', description: 'Generacion y composicion visual.' }
  ],
  desarrollo_web: [
    { label: 'GitHub Copilot', category: 'Asistencia de desarrollo', description: 'Apoyo en implementacion tecnica.' },
    { label: 'ChatGPT', category: 'Asistencia tecnica', description: 'Apoyo de investigacion y documentacion.' }
  ],
  consultoria_crm: [
    { label: 'ChatGPT', category: 'Analisis y documentacion', description: 'Apoyo de analisis y documentacion.' },
    { label: 'Gemini', category: 'Apoyo analitico', description: 'Asistencia analitica para trabajo CRM.' }
  ]
}

const tenantOverrides: Record<string, TenantDashboardOverride> = {
  'space-efeonce': {
    accountTeam: [
      {
        id: 'efeonce-julio-reyes',
        name: 'Julio Reyes',
        role: 'Efeonce Leadership',
        allocationPct: 100,
        monthlyHours: 160
      },
      {
        id: 'efeonce-daniela-ferreira',
        name: 'Daniela Ferreira',
        role: 'Creative Operations Lead',
        allocationPct: 100,
        monthlyHours: 160
      },
      {
        id: 'efeonce-melkin-hernandez',
        name: 'Melkin Hernandez',
        role: 'Senior Visual Designer',
        allocationPct: 100,
        monthlyHours: 160
      },
      {
        id: 'efeonce-andres-carlosama',
        name: 'Andres Carlosama',
        role: 'Senior Visual Designer',
        allocationPct: 100,
        monthlyHours: 160
      },
      {
        id: 'efeonce-valentina',
        name: 'Valentina',
        role: 'Efeonce Team',
        allocationPct: 100,
        monthlyHours: 160
      },
      {
        id: 'efeonce-humberly',
        name: 'Humberly',
        role: 'Efeonce Team',
        allocationPct: 100,
        monthlyHours: 160
      },
      {
        id: 'efeonce-luis',
        name: 'Luis',
        role: 'Efeonce Team',
        allocationPct: 100,
        monthlyHours: 160
      }
    ]
  },
  'hubspot-company-30825221458': {
    accountTeam: [
      {
        id: 'efeonce-daniela-ferreira',
        name: 'Daniela Ferreira',
        role: 'Creative Operations Lead',
        allocationPct: 100,
        monthlyHours: 160
      },
      {
        id: 'efeonce-melkin-hernandez',
        name: 'Melkin Hernandez',
        role: 'Senior Visual Designer',
        allocationPct: 100,
        monthlyHours: 160
      },
      {
        id: 'efeonce-andres-carlosama',
        name: 'Andres Carlosama',
        role: 'Senior Visual Designer',
        allocationPct: 100,
        monthlyHours: 160
      }
    ],
    qualitySeeds: [
      {
        month: '2025-07-01',
        avgRpa: 0.8
      }
    ]
  }
}

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\|/g, ' ')
    .replace(/[^a-z0-9\s@.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const dedupeTools = (tools: GreenhouseDashboardTool[]) => {
  const byKey = new Map<string, GreenhouseDashboardTool>()

  for (const tool of tools) {
    if (!byKey.has(tool.key)) {
      byKey.set(tool.key, tool)
    }
  }

  return Array.from(byKey.values())
}

const toToolKey = (label: string) => normalizeName(label).replace(/\s+/g, '-')

const resolveKnownPeopleFromSignals = (signals: string[]) => {
  const byId = new Map<string, GreenhouseDashboardTeamMember>()

  for (const signal of signals) {
    const normalizedSignal = normalizeName(signal)

    const matchedProfile = knownPeople.find(profile =>
      profile.aliases.some(alias => normalizedSignal.includes(normalizeName(alias)))
    )

    if (!matchedProfile || byId.has(matchedProfile.id)) {
      continue
    }

    byId.set(matchedProfile.id, {
      id: matchedProfile.id,
      name: matchedProfile.name,
      role: matchedProfile.role,
      avatarPath: matchedProfile.avatarPath || null,
      allocationPct: null,
      monthlyHours: null,
      source: 'derived'
    })
  }

  return Array.from(byId.values())
}

export const buildAccountTeam = (clientId: string, detectedSignals: string[]): GreenhouseDashboardAccountTeam => {
  const derivedMembers = resolveKnownPeopleFromSignals(detectedSignals)
  const overrideMembers = tenantOverrides[clientId]?.accountTeam || []
  const byId = new Map<string, GreenhouseDashboardTeamMember>()

  for (const member of derivedMembers) {
    byId.set(member.id, member)
  }

  for (const member of overrideMembers) {
    const knownProfile = knownPeopleById.get(member.id)

    byId.set(member.id, {
      ...member,
      avatarPath: member.avatarPath ?? knownProfile?.avatarPath ?? null,
      source: 'override'
    })
  }

  const members = Array.from(byId.values())
  const totalMonthlyHours = members.reduce((sum, member) => sum + (member.monthlyHours || 0), 0)
  const allocationMembers = members.filter(member => member.allocationPct !== null)

  const averageAllocationPct =
    allocationMembers.length > 0
      ? Math.round(
          allocationMembers.reduce((sum, member) => sum + (member.allocationPct || 0), 0) / allocationMembers.length
        )
      : null

  return {
    members,
    totalMonthlyHours,
    averageAllocationPct
  }
}

export const buildTooling = (clientId: string, serviceModules: string[]): GreenhouseDashboardTooling => {
  const technologyTools: GreenhouseDashboardTool[] = []
  const aiTools: GreenhouseDashboardTool[] = []

  for (const moduleCode of serviceModules) {
    for (const tool of serviceModuleTechnologyDefaults[moduleCode] || []) {
      technologyTools.push({
        key: toToolKey(tool.label),
        label: tool.label,
        category: tool.category,
        description: tool.description,
        href: tool.href || null,
        source: 'service_module_default'
      })
    }

    for (const tool of serviceModuleAiDefaults[moduleCode] || []) {
      aiTools.push({
        key: toToolKey(tool.label),
        label: tool.label,
        category: tool.category,
        description: tool.description,
        href: tool.href || null,
        source: 'service_module_default'
      })
    }
  }

  for (const tool of tenantOverrides[clientId]?.technologyTools || []) {
    technologyTools.push({
      key: toToolKey(tool.label),
      label: tool.label,
      category: tool.category,
      description: tool.description,
      href: tool.href || null,
      source: 'override'
    })
  }

  for (const tool of tenantOverrides[clientId]?.aiTools || []) {
    aiTools.push({
      key: toToolKey(tool.label),
      label: tool.label,
      category: tool.category,
      description: tool.description,
      href: tool.href || null,
      source: 'override'
    })
  }

  return {
    technologyTools: dedupeTools(technologyTools),
    aiTools: dedupeTools(aiTools)
  }
}

export const buildQualitySignals = (
  clientId: string,
  monthlyDelivery: GreenhouseDashboardMonthlyDeliveryPoint[],
  measuredSignals: MeasuredQualitySignal[]
): GreenhouseDashboardQualityPoint[] => {
  const measuredByMonth = new Map(measuredSignals.map(signal => [signal.month, signal]))
  const seedByMonth = new Map((tenantOverrides[clientId]?.qualitySeeds || []).map(signal => [signal.month, signal]))

  return monthlyDelivery.map(item => {
    const measuredSignal = measuredByMonth.get(item.month)
    const seededSignal = seedByMonth.get(item.month)
    const avgRpa = measuredSignal?.hasReliableRpa ? measuredSignal.avgRpa : seededSignal?.avgRpa ?? null

    const rpaSource: GreenhouseDashboardQualityPoint['rpaSource'] = measuredSignal?.hasReliableRpa
      ? 'measured'
      : seededSignal
        ? 'seeded'
        : 'unavailable'

    const firstTimeRightPct =
      item.totalDeliverables > 0 ? Math.round((item.withoutClientAdjustments / item.totalDeliverables) * 100) : null

    return {
      month: item.month,
      label: item.label,
      avgRpa,
      firstTimeRightPct,
      rpaSource
    }
  })
}
