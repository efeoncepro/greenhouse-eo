'use client'

import { useEffect, useState } from 'react'

import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import LinearProgress from '@mui/material/LinearProgress'

import CustomTabList from '@core/components/mui/TabList'

import type { PersonComplete360 } from '@/types/person-complete-360'
import { resolveProfileBanner } from '@/lib/person-360/resolve-banner'

// Sub-components
import MyProfileHeader from './my-profile/MyProfileHeader'
import ProfileTab from './my-profile/tabs/ProfileTab'
import TeamsTab from './my-profile/tabs/TeamsTab'
import ProjectsTab from './my-profile/tabs/ProjectsTab'
import ConnectionsTab from './my-profile/tabs/ConnectionsTab'
import SecurityTab from './my-profile/tabs/SecurityTab'
import SkillsCertificationsTab from './my-profile/tabs/SkillsCertificationsTab'
import LegalProfileTab from './my-profile/tabs/LegalProfileTab'

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
  const [data, setData] = useState<PersonComplete360 | null>(null)
  const [colleagues, setColleagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    const load = async () => {
      try {
        const [person360Res, colleaguesRes] = await Promise.all([
          fetch('/api/person/me/360?facets=identity,assignments,leave,organization').then(r => (r.ok ? r.json() : null)),
          fetch('/api/my/organization/members').then(r => (r.ok ? r.json() : null))
        ])

        setData(person360Res)
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

  // ── Data transformation (from Person Complete 360) ──

  const identity = data?.identity
  const assignmentsList = data?.assignments ?? []
  const leaveData = data?.leave

  const headerProps = {
    fullName: identity?.resolvedDisplayName ?? '',
    avatarUrl: identity?.resolvedAvatarUrl ?? null,
    designation: identity?.resolvedJobTitle ?? null,
    department: identity?.departmentName ?? null,
    joiningDate: identity?.hireDate ? formatDate(identity.hireDate) : null,
    bannerUrl: identity ? resolveProfileBanner(identity.activeRoleCodes, identity.departmentName) : null
  }

  const about = [
    identity?.resolvedJobTitle && {
      icon: 'tabler-briefcase',
      property: 'Cargo',
      value: identity.resolvedJobTitle
    },
    identity?.departmentName && {
      icon: 'tabler-building',
      property: 'Departamento',
      value: identity.departmentName
    },
    identity?.jobLevel && {
      icon: 'tabler-chart-bar',
      property: 'Nivel',
      value: identity.jobLevel
    },
    identity?.employmentType && {
      icon: 'tabler-clock',
      property: 'Tipo de contrato',
      value: identity.employmentType
    },
    identity?.hireDate && {
      icon: 'tabler-calendar',
      property: 'Fecha de ingreso',
      value: formatDate(identity.hireDate)
    }
  ].filter(Boolean) as { icon: string; property: string; value: string }[]

  const contacts = [
    identity?.resolvedEmail && {
      icon: 'tabler-mail',
      property: 'Email',
      value: identity.resolvedEmail
    },
    identity?.resolvedPhone && {
      icon: 'tabler-phone',
      property: 'Telefono',
      value: identity.resolvedPhone
    }
  ].filter(Boolean) as { icon: string; property: string; value: string }[]

  const overview = [
    {
      icon: 'tabler-check',
      property: 'Asignaciones activas',
      value: String(assignmentsList.filter(a => a.active).length)
    },
    {
      icon: 'tabler-users',
      property: 'Colegas',
      value: String(colleagues.length)
    },
    {
      icon: 'tabler-calendar-stats',
      property: 'Sistemas vinculados',
      value: String(identity?.linkedSystems?.length ?? 0)
    }
  ]

  const teams = assignmentsList.map(a => ({
    property: a.clientName || 'Sin nombre',
    value: a.roleTitleOverride || 'Asignado'
  }))

  const teamsTech = assignmentsList.map(a => {
    const tm = a.teamMembers ?? []

    return {
      title: a.clientName || 'Sin nombre',
      avatar: tm[0]?.avatarUrl || '',
      members: tm.length,
      chipText: `${Math.round((a.fteAllocation || 0) * 100)}% FTE`,
      chipColor: 'primary' as const
    }
  })

  const leaveRequests = leaveData?.recentRequests ?? []

  const activity = leaveRequests.slice(0, 5).map(r => ({
    title: `${r.leaveTypeName || 'Permiso'} — ${r.requestedDays} dia(s)`,
    description: r.reason || `${r.startDate} a ${r.endDate}`,
    time: r.createdAt ? formatRelativeTime(r.createdAt) : '',
    color: r.status === 'approved' ? ('success' as const) : r.status === 'rejected' ? ('error' as const) : ('warning' as const)
  }))

  const connections = colleagues.slice(0, 6).map((c: any) => ({
    name: c.fullName || c.displayName || 'Sin nombre',
    avatar: c.avatarUrl || '',
    role: c.jobTitle || c.roleLabel || c.membershipType || ''
  }))

  const projectTable = assignmentsList.map((a, i) => {
    const tm = a.teamMembers ?? []

    return {
      id: i + 1,
      title: a.clientName || 'Sin nombre',
      subtitle: a.roleTitleOverride || 'Asignado',
      leader: '',
      avatarGroup: tm.map(m => m.avatarUrl).filter(Boolean) as string[],
      status: Math.round((a.fteAllocation || 0) * 100)
    }
  })

  const teamsTabData = assignmentsList.map(a => {
    const tm = a.teamMembers ?? []

    return {
      title: a.clientName || 'Sin nombre',
      avatar: '',
      description: a.roleTitleOverride || 'Miembro del equipo',
      chips: [
        {
          title: `${Math.round((a.fteAllocation || 0) * 100)}% FTE`,
          color: 'primary' as const
        }
      ],
      extraMembers: 0,
      avatarGroup: tm.map(m => ({ name: m.name, avatar: m.avatarUrl || '' }))
    }
  })

  const projectsTabData = assignmentsList.map(a => {
    const tm = a.teamMembers ?? []

    return {
      title: a.clientName || 'Sin nombre',
      client: a.clientName || '',
      avatar: '',
      budget: '-',
      budgetSpent: '-',
      startDate: a.startDate || '-',
      deadline: a.endDate || '-',
      description: a.roleTitleOverride || '',
      hours: `${a.hoursPerMonth || 0}h/mes`,
      daysLeft: 0,
      chipColor: 'info' as const,
      totalTask: tm.length + 1,
      completedTask: tm.length + 1,
      members: `${tm.length + 1} miembros`,
      comments: 0,
      avatarGroup: tm.map(m => ({ name: m.name, avatar: m.avatarUrl || '' }))
    }
  })

  const connectionsTabData = colleagues.slice(0, 12).map((c: any) => ({
    name: c.fullName || c.displayName || 'Sin nombre',
    avatar: c.avatarUrl || '',
    designation: c.jobTitle || c.roleLabel || c.membershipType || '',
    projects: '0',
    tasks: '0',
    connections: '0',
    chips: [{ title: c.departmentName || c.department || 'Equipo', color: 'info' as const }]
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
              icon={<i className='tabler-certificate' />}
              value='skills'
              label='Skills y certificaciones'
              iconPosition='start'
            />
            <Tab
              icon={<i className='tabler-id-badge-2' />}
              value='legal'
              label='Datos legales'
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
          <TabPanel value='skills' className='p-0 pbs-6'>
            <SkillsCertificationsTab mode='self' memberId='' />
          </TabPanel>
          <TabPanel value='legal' className='p-0 pbs-6'>
            <LegalProfileTab />
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
