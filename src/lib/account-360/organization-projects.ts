import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getSpaceNotionSource } from '@/lib/space-notion/space-notion-store'
import { getProjectsOverview } from '@/lib/projects/get-projects-overview'

interface SpaceRow extends Record<string, unknown> {
  space_id: string
  space_name: string
  client_id: string
  status: string
}

interface ProjectSummary {
  notionPageId: string
  projectName: string
  status: string
  totalTasks: number
  activeTasks: number
  completedTasks: number
  avgRpa: number
  openReviewItems: number
  pageUrl: string | null
}

interface SpaceProjectGroup {
  spaceId: string
  spaceName: string
  clientId: string
  hasNotionSource: boolean
  projects: ProjectSummary[]
  healthScore: number
}

export interface OrganizationProjectsSummary {
  organizationId: string
  spaces: SpaceProjectGroup[]
  totals: {
    totalProjects: number
    activeProjects: number
    totalTasks: number
    activeTasks: number
    completedTasks: number
    avgRpa: number
    overallHealth: 'green' | 'yellow' | 'red'
  }
}

const computeHealthScore = (projects: ProjectSummary[]): number => {
  if (projects.length === 0) return 0

  const avgRpa = projects.reduce((s, p) => s + p.avgRpa, 0) / projects.length
  const completionRate = projects.reduce((s, p) => s + (p.totalTasks > 0 ? p.completedTasks / p.totalTasks : 0), 0) / projects.length

  return Math.round(avgRpa * 0.6 + completionRate * 100 * 0.4)
}

const overallHealthFromScore = (score: number): 'green' | 'yellow' | 'red' => {
  if (score >= 70) return 'green'
  if (score >= 40) return 'yellow'

  return 'red'
}

export const getOrganizationProjects = async (
  organizationId: string
): Promise<OrganizationProjectsSummary> => {
  // 1. Get org spaces
  const spaces = await runGreenhousePostgresQuery<SpaceRow>(
    `SELECT space_id, space_name, client_id, status
     FROM greenhouse_core.spaces
     WHERE organization_id = $1 AND active = TRUE
     ORDER BY space_name`,
    [organizationId]
  )

  const spaceGroups: SpaceProjectGroup[] = []

  for (const space of spaces) {
    // 2. Resolve Notion source for each space
    const notionSource = await getSpaceNotionSource(space.space_id)

    if (!notionSource || !notionSource.notionDbProyectos) {
      spaceGroups.push({
        spaceId: space.space_id,
        spaceName: space.space_name,
        clientId: space.client_id,
        hasNotionSource: false,
        projects: [],
        healthScore: 0
      })
      continue
    }

    // 3. Get project IDs from delivery_projects via BigQuery
    try {
      const projectsData = await getProjectsOverview({
        clientId: space.client_id,
        projectIds: [] // empty = all projects for this client
      })

      const projects: ProjectSummary[] = projectsData.items.map(p => ({
        notionPageId: p.id,
        projectName: p.name,
        status: p.status,
        totalTasks: p.totalTasks,
        activeTasks: p.activeTasks,
        completedTasks: p.completedTasks,
        avgRpa: p.avgRpa,
        openReviewItems: p.openReviewItems,
        pageUrl: p.pageUrl
      }))

      spaceGroups.push({
        spaceId: space.space_id,
        spaceName: space.space_name,
        clientId: space.client_id,
        hasNotionSource: true,
        projects,
        healthScore: computeHealthScore(projects)
      })
    } catch {
      // Project fetch may fail for spaces without project data
      spaceGroups.push({
        spaceId: space.space_id,
        spaceName: space.space_name,
        clientId: space.client_id,
        hasNotionSource: true,
        projects: [],
        healthScore: 0
      })
    }
  }

  // 4. Aggregate totals
  const allProjects = spaceGroups.flatMap(s => s.projects)
  const activeStatuses = ['En curso', 'Listo para revisión', 'Listo para revision', 'Cambios Solicitados']

  const totalTasks = allProjects.reduce((s, p) => s + p.totalTasks, 0)
  const activeTasks = allProjects.reduce((s, p) => s + p.activeTasks, 0)
  const completedTasks = allProjects.reduce((s, p) => s + p.completedTasks, 0)

  const avgRpa = allProjects.length > 0
    ? Math.round(allProjects.reduce((s, p) => s + p.avgRpa, 0) / allProjects.length)
    : 0

  const avgHealth = spaceGroups.length > 0
    ? Math.round(spaceGroups.reduce((s, g) => s + g.healthScore, 0) / spaceGroups.length)
    : 0

  return {
    organizationId,
    spaces: spaceGroups,
    totals: {
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(p => activeStatuses.includes(p.status)).length,
      totalTasks,
      activeTasks,
      completedTasks,
      avgRpa,
      overallHealth: overallHealthFromScore(avgHealth)
    }
  }
}
