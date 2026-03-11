'use client'

import { CapacityOverviewCard } from '@/components/greenhouse'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'

type AccountTeamSectionProps = {
  data: GreenhouseDashboardData
}

const AccountTeamSection = ({ data }: AccountTeamSectionProps) => {
  const assignedPeopleCount = data.accountTeam.members.length

  const coverageLabel =
    assignedPeopleCount === 0
      ? 'Pendiente'
      : data.accountTeam.averageAllocationPct !== null && data.accountTeam.averageAllocationPct >= 85
        ? 'Cobertura saludable'
        : 'Cobertura parcial'

  return (
    <CapacityOverviewCard
      title='Capacity y equipo asignado'
      subtitle='La version principal mantiene el roster completo y deja lista una variante compacta para futuros layouts con menos alto.'
      variant='default'
      coverageLabel={coverageLabel}
      coverageTone={assignedPeopleCount === 0 ? 'warning' : 'success'}
      summaryItems={[
        {
          label: 'Personas asignadas',
          value: String(assignedPeopleCount),
          detail: 'Roster visible del space'
        },
        {
          label: 'Horas mensuales',
          value: String(data.accountTeam.totalMonthlyHours),
          detail: 'Capacidad mensual comprometida'
        },
        {
          label: 'Asignacion promedio',
          value: data.accountTeam.averageAllocationPct !== null ? `${data.accountTeam.averageAllocationPct}%` : 'Pendiente',
          detail: 'Carga media visible del equipo'
        }
      ]}
      members={data.accountTeam.members.map(member => ({
        id: member.id,
        name: member.name,
        role: member.role,
        avatarPath: member.avatarPath,
        allocationPct: member.allocationPct,
        monthlyHours: member.monthlyHours,
        sourceLabel: member.source === 'override' ? 'Asignacion controlada para la cuenta' : 'Detectado desde Notion',
        sourceTone: member.source === 'override' ? 'warning' : 'success'
      }))}
      insightTitle='Lectura de capacity'
      insightSubtitle='Resumen ejecutivo del staffing visible mientras madura el modelo formal de assignments y formatos compactos.'
      insightItems={[
        {
          label: 'Personas asignadas',
          value: String(assignedPeopleCount),
          detail: 'Miembros visibles para la cuenta en el dashboard.'
        },
        {
          label: 'Horas mensuales',
          value: String(data.accountTeam.totalMonthlyHours),
          detail: 'Suma de capacidad mensual hoy visible sobre la cuenta.'
        },
        {
          label: 'Asignacion promedio',
          value: data.accountTeam.averageAllocationPct !== null ? `${data.accountTeam.averageAllocationPct}%` : 'Pendiente',
          detail: 'Promedio simple de allocation del roster visible.'
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
