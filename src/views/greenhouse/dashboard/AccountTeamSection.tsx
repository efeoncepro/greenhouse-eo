'use client'

import { CapacityOverviewCard } from '@/components/greenhouse'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'

const TASK407_COPY_PERSONAS_ASIGNADAS = "Personas asignadas"
const TASK407_COPY_HORAS_MENSUALES = "Horas mensuales"
const TASK407_COPY_ASIGNACION_PROMEDIO = "Asignacion promedio"
const TASK407_COPY_COBERTURA_ACTUAL = "Cobertura actual"


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
          label: TASK407_COPY_PERSONAS_ASIGNADAS,
          value: String(assignedPeopleCount),
          detail: 'Roster visible del space'
        },
        {
          label: TASK407_COPY_HORAS_MENSUALES,
          value: String(data.accountTeam.totalMonthlyHours),
          detail: 'Capacidad mensual comprometida'
        },
        {
          label: TASK407_COPY_ASIGNACION_PROMEDIO,
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
          label: TASK407_COPY_PERSONAS_ASIGNADAS,
          value: String(assignedPeopleCount),
          detail: 'Miembros visibles para la cuenta en el dashboard.'
        },
        {
          label: TASK407_COPY_HORAS_MENSUALES,
          value: String(data.accountTeam.totalMonthlyHours),
          detail: 'Suma de capacidad mensual hoy visible sobre la cuenta.'
        },
        {
          label: TASK407_COPY_ASIGNACION_PROMEDIO,
          value: data.accountTeam.averageAllocationPct !== null ? `${data.accountTeam.averageAllocationPct}%` : 'Pendiente',
          detail: 'Promedio simple de allocation del roster visible.'
        },
        {
          label: TASK407_COPY_COBERTURA_ACTUAL,
          value: assignedPeopleCount > 0 ? 'Healthy' : 'Pendiente',
          detail: 'Lectura simple mientras madura el modelo formal de assignments.'
        }
      ]}
    />
  )
}

export default AccountTeamSection
