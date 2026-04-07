'use client'

import { useEffect, useState } from 'react'

import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import LinearProgress from '@mui/material/LinearProgress'

import CustomTabList from '@core/components/mui/TabList'

import type { PersonProfileSummary } from '@/types/person-360'

// Sub-components
import MyProfileHeader from './my-profile/MyProfileHeader'
import ProfileTab from './my-profile/tabs/ProfileTab'
import TeamsTab from './my-profile/tabs/TeamsTab'
import ProjectsTab from './my-profile/tabs/ProjectsTab'
import ConnectionsTab from './my-profile/tabs/ConnectionsTab'
import SecurityTab from './my-profile/tabs/SecurityTab'

// ── Helpers ──

const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

const formatRelativeTime = (isoDate: string): string => {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime()
    const minutes = Math.floor(diffMs / 60_000)

    if (minutes < 1) return 'hace un momento'
    if (minutes < 60) return `hace ${minutes} min`

    const hours = Math.floor(minutes / 60)

    if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`

    const days = Math.floor(hours / 24)

    return `hace ${days} ${days === 1 ? 'dia' : 'dias'}`
  } catch {
    return ''
  }
}

// ── View ──

const MyProfileView = () => {
  const [profile, setProfile] = useState<PersonProfileSummary | null>(null)
  const [assignments, setAssignments] = useState<any>(null)
  const [leave, setLeave] = useState<any>(null)
  const [colleagues, setColleagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, assignmentsRes, leaveRes, colleaguesRes] = await Promise.all([
          fetch('/api/my/profile').then(r => (r.ok ? r.json() : null)),
          fetch('/api/my/assignments').then(r => (r.ok ? r.json() : null)),
          fetch('/api/my/leave').then(r => (r.ok ? r.json() : null)),
          fetch('/api/my/organization/members').then(r => (r.ok ? r.json() : null))
        ])

        setProfile(profileRes)
        setAssignments(assignmentsRes)
        setLeave(leaveRes)
        setColleagues(colleaguesRes?.items ?? [])
      } catch {
        // silent — components handle null data gracefully
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return <LinearProgress />
  }

  // ── Data transformation ──

  const headerProps = {
    fullName: profile?.resolvedDisplayName ?? '',
    avatarUrl: profile?.resolvedAvatarUrl ?? null,
    designation: profile?.resolvedJobTitle ?? null,
    department: profile?.departmentName ?? null,
    joiningDate: profile?.hireDate ? formatDate(profile.hireDate) : null
  }

  const about = [
    profile?.resolvedJobTitle && {
      icon: 'tabler-briefcase',
      property: 'Cargo',
      value: profile.resolvedJobTitle
    },
    profile?.departmentName && {
      icon: 'tabler-building',
      property: 'Departamento',
      value: profile.departmentName
    },
    profile?.jobLevel && {
      icon: 'tabler-chart-bar',
      property: 'Nivel',
      value: profile.jobLevel
    },
    profile?.employmentType && {
      icon: 'tabler-clock',
      property: 'Tipo de contrato',
      value: profile.employmentType
    },
    profile?.hireDate && {
      icon: 'tabler-calendar',
      property: 'Fecha de ingreso',
      value: formatDate(profile.hireDate)
    }
  ].filter(Boolean) as { icon: string; property: string; value: string }[]

  const contacts = [
    profile?.resolvedEmail && {
      icon: 'tabler-mail',
      property: 'Email',
      value: profile.resolvedEmail
    },
    profile?.resolvedPhone && {
      icon: 'tabler-phone',
      property: 'Telefono',
      value: profile.resolvedPhone
    }
  ].filter(Boolean) as { icon: string; property: string; value: string }[]

  const overview = [
    {
      icon: 'tabler-check',
      property: 'Asignaciones activas',
      value: String(assignments?.assignments?.length ?? 0)
    },
    {
      icon: 'tabler-users',
      property: 'Colegas',
      value: String(colleagues.length)
    },
    {
      icon: 'tabler-calendar-stats',
      property: 'Sistemas vinculados',
      value: String(profile?.linkedSystems?.length ?? 0)
    }
  ]

  const teams = (assignments?.assignments ?? []).map((a: any) => ({
    property: a.clientName || a.client_name || 'Sin nombre',
    value: a.roleTitle || a.role_title_override || 'Asignado'
  }))

  const teamsTech = (assignments?.assignments ?? []).map((a: any) => ({
    title: a.clientName || a.client_name || 'Sin nombre',
    avatar: '/images/avatars/1.png',
    members: 1,
    chipText: `${Math.round((a.fteAllocation || a.fte_allocation || 0) * 100)}% FTE`,
    chipColor: 'primary' as const
  }))

  const activity = (leave?.requests ?? []).slice(0, 5).map((r: any) => ({
    title: `${r.leaveTypeName || 'Permiso'} — ${r.requestedDays} dia(s)`,
    description: r.reason || `${r.startDate} a ${r.endDate}`,
    time: r.createdAt ? formatRelativeTime(r.createdAt) : '',
    color: r.status === 'approved' ? ('success' as const) : r.status === 'rejected' ? ('error' as const) : ('warning' as const)
  }))

  const connections = colleagues.slice(0, 6).map((c: any) => ({
    name: c.fullName || c.displayName || 'Sin nombre',
    avatar: '/images/avatars/1.png',
    role: c.roleLabel || c.membershipType || ''
  }))

  const projectTable = (assignments?.assignments ?? []).map((a: any, i: number) => ({
    id: i + 1,
    title: a.clientName || a.client_name || 'Sin nombre',
    subtitle: a.roleTitle || a.role_title_override || 'Asignado',
    leader: '',
    avatar: '/images/avatars/1.png',
    avatarGroup: [] as string[],
    status: Math.round((a.fteAllocation || a.fte_allocation || 0) * 100)
  }))

  const teamsTabData = (assignments?.assignments ?? []).map((a: any) => ({
    title: a.clientName || a.client_name || 'Sin nombre',
    avatar: '/images/avatars/1.png',
    description: a.roleTitle || a.role_title_override || 'Miembro del equipo',
    chips: [
      {
        title: `${Math.round((a.fteAllocation || a.fte_allocation || 0) * 100)}% FTE`,
        color: 'primary' as const
      }
    ],
    avatarGroup: [] as { name: string; avatar: string }[]
  }))

  const projectsTabData = (assignments?.assignments ?? []).map((a: any) => ({
    title: a.clientName || a.client_name || 'Sin nombre',
    client: a.clientName || a.client_name || '',
    avatar: '/images/avatars/1.png',
    budget: '-',
    budgetSpent: '-',
    startDate: a.startDate || a.start_date || '-',
    deadline: a.endDate || a.end_date || '-',
    description: a.roleTitle || a.role_title_override || '',
    hours: `${a.hoursPerMonth || a.hours_per_month || 0}h/mes`,
    daysLeft: 0,
    chipColor: 'info' as const,
    totalTask: 1,
    completedTask: 1,
    members: '',
    comments: 0,
    avatarGroup: [] as { name: string; avatar: string }[]
  }))

  const connectionsTabData = colleagues.slice(0, 12).map((c: any) => ({
    name: c.fullName || c.displayName || 'Sin nombre',
    avatar: '/images/avatars/1.png',
    designation: c.roleLabel || c.membershipType || '',
    projects: '0',
    tasks: '0',
    connections: '0',
    chips: [{ title: c.department || 'Equipo', color: 'info' as const }]
  }))

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <MyProfileHeader {...headerProps} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TabContext value={activeTab}>
          <CustomTabList
            onChange={(_, v: string) => setActiveTab(v)}
            variant='scrollable'
            pill='true'
          >
            <Tab
              icon={<i className='tabler-user-check' />}
              value='profile'
              label='Perfil'
              iconPosition='start'
            />
            <Tab
              icon={<i className='tabler-users' />}
              value='teams'
              label='Equipos'
              iconPosition='start'
            />
            <Tab
              icon={<i className='tabler-layout-grid' />}
              value='projects'
              label='Proyectos'
              iconPosition='start'
            />
            <Tab
              icon={<i className='tabler-link' />}
              value='connections'
              label='Colegas'
              iconPosition='start'
            />
            <Tab
              icon={<i className='tabler-lock' />}
              value='security'
              label='Seguridad'
              iconPosition='start'
            />
          </CustomTabList>

          <TabPanel value='profile' className='p-0 pbs-6'>
            <ProfileTab
              about={about}
              contacts={contacts}
              overview={overview}
              teams={teams}
              activity={activity}
              connections={connections}
              teamsTech={teamsTech}
              projects={projectTable}
            />
          </TabPanel>
          <TabPanel value='teams' className='p-0 pbs-6'>
            <TeamsTab data={teamsTabData} />
          </TabPanel>
          <TabPanel value='projects' className='p-0 pbs-6'>
            <ProjectsTab data={projectsTabData} />
          </TabPanel>
          <TabPanel value='connections' className='p-0 pbs-6'>
            <ConnectionsTab data={connectionsTabData} />
          </TabPanel>
          <TabPanel value='security' className='p-0 pbs-6'>
            <SecurityTab />
          </TabPanel>
        </TabContext>
      </Grid>
    </Grid>
  )
}

export default MyProfileView
