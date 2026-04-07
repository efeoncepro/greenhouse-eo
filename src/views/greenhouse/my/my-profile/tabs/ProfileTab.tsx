'use client'

import Grid from '@mui/material/Grid'

import AboutOverview from './AboutOverview'
import ActivityTimeline from './ActivityTimeline'
import ConnectionsTeams from './ConnectionsTeams'
import ProjectsTable from './ProjectsTable'

type CommonItem = {
  icon: string
  property: string
  value: string
}

type TeamItem = {
  property: string
  value: string
}

type ActivityItem = {
  title: string
  description: string
  time: string
  color: 'primary' | 'success' | 'info' | 'warning' | 'error'
  icon?: string
}

type ConnectionItem = {
  name: string
  avatar: string
  role: string
}

type TeamTechItem = {
  title: string
  avatar: string
  members: number
  chipText: string
  chipColor: 'primary' | 'success' | 'info' | 'warning' | 'error' | 'secondary'
}

type ProjectRow = {
  id: number
  title: string
  subtitle: string
  leader: string
  avatar?: string
  avatarGroup: string[]
  status: number
}

type ProfileTabProps = {
  about: CommonItem[]
  contacts: CommonItem[]
  overview: CommonItem[]
  teams: TeamItem[]
  activity: ActivityItem[]
  connections: ConnectionItem[]
  teamsTech: TeamTechItem[]
  projects: ProjectRow[]
}

const ProfileTab = ({ about, contacts, overview, teams, activity, connections, teamsTech, projects }: ProfileTabProps) => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 5, lg: 4 }}>
        <AboutOverview about={about} contacts={contacts} overview={overview} teams={teams} />
      </Grid>
      <Grid size={{ xs: 12, md: 7, lg: 8 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <ActivityTimeline activity={activity} />
          </Grid>
          <ConnectionsTeams connections={connections} teamsTech={teamsTech} />
          <Grid size={{ xs: 12 }}>
            <ProjectsTable projects={projects} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default ProfileTab
