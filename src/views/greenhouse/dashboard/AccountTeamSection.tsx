'use client'

import { CapacityOverviewCard } from '@/components/greenhouse'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'

type AccountTeamSectionProps = {
  data: GreenhouseDashboardData
}

const AccountTeamSection = ({ data }: AccountTeamSectionProps) => {
  const assignedPeopleCount = data.accountTeam.members.length

  return (
    <CapacityOverviewCard
      title='Capacity y equipo asignado'
      subtitle='Staffing visible de la cuenta con una lectura ejecutiva de cobertura, horas y estado de asignacion.'
      summaryItems={[
        {
          label: 'Personas asignadas',
          value: String(assignedPeopleCount),
          detail: 'Roster visible'
        },
        {
          label: 'Horas mensuales',
          value: String(data.accountTeam.totalMonthlyHours),
          detail: 'Capacidad mensual'
        },
        {
          label: 'Asignacion promedio',
          value: data.accountTeam.averageAllocationPct !== null ? `${data.accountTeam.averageAllocationPct}%` : 'Pendiente',
          detail: 'Carga media visible'
        }
      ]}
      members={data.accountTeam.members.map(member => ({
        id: member.id,
        name: member.name,
        role: member.role,
        avatarPath: member.avatarPath,
        allocationPct: member.allocationPct,
        monthlyHours: member.monthlyHours,
        sourceLabel: member.source === 'override' ? 'Dedicated override' : 'Detectado desde Notion',
        sourceTone: member.source === 'override' ? 'warning' : 'success'
      }))}
      insightTitle='Lectura de capacity'
      insightSubtitle='Resumen ejecutivo de cobertura y capacidad visible sobre la cuenta.'
      insightItems={[
        {
          label: 'Personas asignadas',
          value: String(assignedPeopleCount),
          detail: 'Cuenta de miembros visibles para la cuenta en el dashboard.'
        },
        {
          label: 'Horas mensuales',
          value: String(data.accountTeam.totalMonthlyHours),
          detail: 'Suma de capacidad mensual visible sobre la cuenta.'
        },
        {
          label: 'Asignacion promedio',
          value: data.accountTeam.averageAllocationPct !== null ? `${data.accountTeam.averageAllocationPct}%` : 'Pendiente',
          detail: 'Promedio simple de allocation para la cuenta visible.'
        },
        {
          label: 'Cobertura actual',
          value: assignedPeopleCount > 0 ? 'Healthy' : 'Pendiente',
          detail: 'Lectura simple mientras madura el modelo formal de assignments.'
        }
      ]}
    />
  )
}

export default AccountTeamSection
