'use client'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ChipProps } from '@mui/material/Chip'

import CustomChip from '@core/components/mui/Chip'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { EmptyState, TeamProgressBar, VerifiedByEfeonceBadge } from '@/components/greenhouse'
import type { Space360Detail } from '@/lib/agency/space-360'

import { formatPct, formatMoney, titleize } from '../shared'

type Props = {
  detail: Space360Detail
}

type TeamMember = Space360Detail['team']['members'][number]
type TeamSkill = TeamMember['skills'][number]
type StaffingService = Space360Detail['team']['staffing']['services'][number]
type ServiceRequirement = StaffingService['requirements'][number]

const SKILL_CATEGORY_TONES: Record<string, ChipProps['color']> = {
  design: 'primary',
  development: 'info',
  strategy: 'secondary',
  account: 'warning',
  media: 'success',
  operations: 'default',
  other: 'default'
}

const SENIORITY_LABELS: Record<string, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead'
}

const capacityColor = (value: string) => {
  if (value === 'optimal') return 'success'
  if (value === 'attention') return 'warning'

  return 'error'
}

const getCoverageTone = (coveragePct: number | null) => {
  if (coveragePct == null) return 'secondary'
  if (coveragePct >= 80) return 'success'
  if (coveragePct >= 50) return 'warning'

  return 'error'
}

const getCoverageProgressTone = (coveragePct: number): 'success' | 'warning' | 'error' => {
  if (coveragePct >= 80) return 'success'
  if (coveragePct >= 50) return 'warning'

  return 'error'
}

const getRequirementTone = (status: ServiceRequirement['status']) => {
  if (status === 'covered') return 'success'
  if (status === 'partial') return 'warning'

  return 'error'
}

const getFitTone = (fitScore: number) => {
  if (fitScore >= 80) return 'success'
  if (fitScore >= 60) return 'warning'

  return 'secondary'
}

const formatSkillLabel = (skill: TeamSkill) =>
  `${skill.skillName} · ${SENIORITY_LABELS[skill.seniorityLevel] || titleize(skill.seniorityLevel)}`

const formatRequirementLabel = (requirement: ServiceRequirement) =>
  `${requirement.skillName} · ${SENIORITY_LABELS[requirement.requiredSeniority] || titleize(requirement.requiredSeniority)}`

const hasVerifiedSkills = (skills: TeamSkill[]) => skills.some(skill => Boolean(skill.verifiedBy || skill.verifiedAt))

const renderSkillChips = (skills: TeamSkill[]) => {
  if (skills.length === 0) {
    return <CustomChip round='true' size='small' color='default' variant='outlined' label='Sin skills registradas' />
  }

  return skills.map(skill => (
    <CustomChip
      key={`${skill.skillCode}-${skill.seniorityLevel}`}
      round='true'
      size='small'
      color={SKILL_CATEGORY_TONES[skill.skillCategory] || 'default'}
      variant='tonal'
      label={formatSkillLabel(skill)}
    />
  ))
}

const renderCandidateChips = (candidates: ServiceRequirement['topCandidates']) => {
  if (candidates.length === 0) {
    return <Typography variant='caption' color='text.secondary'>Sin candidatos que cumplan senioridad y disponibilidad.</Typography>
  }

  const visibleCandidates = candidates.slice(0, 3)
  const overflowCount = Math.max(0, candidates.length - visibleCandidates.length)

  return (
    <Stack direction='row' flexWrap='wrap' gap={1}>
      {visibleCandidates.map(candidate => (
        <CustomChip
          key={`${candidate.memberId}-${candidate.assignmentId}`}
          round='true'
          size='small'
          color={getFitTone(candidate.fitScore)}
          variant='tonal'
          label={`${candidate.displayName} · ${candidate.fitScore}% fit`}
        />
      ))}
      {overflowCount > 0 ? (
        <CustomChip round='true' size='small' color='default' variant='outlined' label={`+${overflowCount} más`} />
      ) : null}
    </Stack>
  )
}

const TeamTab = ({ detail }: Props) => {
  const coveragePct = detail.team.summary.coveragePct
  const hasServiceRequirements = detail.team.summary.serviceCountWithRequirements > 0

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <Card variant='outlined'>
          <CardHeader
            title='Capacidad y staffing'
            subheader='Assignments activos, uso operativo y exposición Staff Aug / providers.'
            action={
              <Button component={Link} href='/agency/team' variant='outlined' size='small'>
                Abrir equipo
              </Button>
            }
          />
          <CardContent sx={{ display: 'grid', gap: 2.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                gap: 2.5
              }}
            >
              <Box>
                <Typography variant='caption' color='text.secondary'>Personas asignadas</Typography>
                <Typography variant='h5'>{detail.team.summary.assignedMembers}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>FTE asignado</Typography>
                <Typography variant='h5'>{detail.team.summary.allocatedFte.toFixed(1)}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Uso promedio</Typography>
                <Typography variant='h5'>{detail.team.summary.avgUsagePct != null ? `${detail.team.summary.avgUsagePct}%` : '—'}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Costo loaded</Typography>
                <Typography variant='h5'>{formatMoney(detail.team.summary.totalLoadedCostClp)}</Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant='caption' color='text.secondary'>Señal operativa</Typography>
              <Typography variant='body2'>
                {detail.team.summary.overcommittedCount > 0
                  ? `${detail.team.summary.overcommittedCount} integrante(s) superan 100% de uso operativo.`
                  : 'Sin sobrecompromiso operativo en el equipo activo.'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Card variant='outlined'>
          <CardHeader
            title='Cobertura de skills'
            subheader='Requisitos activos, cobertura y gaps detectados en los servicios del Space.'
            action={
              <CustomChip
                round='true'
                size='small'
                color={getCoverageTone(coveragePct)}
                variant='tonal'
                label={coveragePct != null ? `${coveragePct}% cubierto` : 'Sin cobertura'}
              />
            }
          />
          <CardContent sx={{ display: 'grid', gap: 3 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' },
                gap: 2
              }}
            >
              <Box>
                <Typography variant='caption' color='text.secondary'>Requisitos</Typography>
                <Typography variant='h5'>{detail.team.summary.requiredSkillCount}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Cubiertas</Typography>
                <Typography variant='h5'>{detail.team.summary.coveredSkillCount}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Gaps</Typography>
                <Typography variant='h5'>{detail.team.summary.gapSkillCount}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Cobertura</Typography>
                <Typography variant='h5'>
                  {coveragePct != null ? <AnimatedCounter value={coveragePct} formatter={value => formatPct(value)} /> : '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Servicios con requisitos</Typography>
                <Typography variant='h5'>{detail.team.summary.serviceCountWithRequirements}</Typography>
              </Box>
            </Box>

            {coveragePct != null ? (
              <Stack spacing={1}>
                <TeamProgressBar value={coveragePct} tone={getCoverageProgressTone(coveragePct)} />
                <Typography variant='body2' color='text.secondary'>
                  Cobertura calculada sobre los requisitos activos definidos en los servicios del Space.
                </Typography>
              </Stack>
            ) : (
              <Alert severity='info'>
                Todavía no hay requisitos de skills activos para este Space.
              </Alert>
            )}

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover'
              }}
            >
              <Typography variant='body2' fontWeight={600}>
                Lectura rápida
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {hasServiceRequirements
                  ? `${detail.team.summary.coveredSkillCount} de ${detail.team.summary.requiredSkillCount} requisitos quedan cubiertos y ${detail.team.summary.gapSkillCount} siguen con gap.`
                  : 'Los servicios todavía no tienen matriz de skills configurada.'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card variant='outlined'>
          <CardHeader title='Skills por persona' subheader='Cada integrante muestra su matriz de skills conectada al Space.' />
          <CardContent>
            {detail.team.members.length === 0 ? (
              <EmptyState
                icon='tabler-users-off'
                title='Sin assignments activos'
                description='Este Space todavía no tiene personas asignadas en el runtime canónico de equipo.'
                action={<Button component={Link} href='/agency/team' variant='contained'>Ir a equipo</Button>}
              />
            ) : (
              <Stack spacing={3}>
                {detail.team.members.map(member => {
                  const memberDetails = [
                    member.contractedHoursMonth != null && { label: 'Horas contratadas', value: String(member.contractedHoursMonth) },
                    member.usagePercent != null && { label: 'Uso operativo', value: `${Math.round(member.usagePercent)}%` },
                    member.costPerHourTarget != null && {
                      label: 'Costo / hora',
                      value: new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: member.targetCurrency || 'CLP',
                        maximumFractionDigits: 0
                      }).format(member.costPerHourTarget)
                    },
                    member.placementProviderName && { label: 'Placement / provider', value: member.placementProviderName }
                  ].filter(Boolean) as Array<{ label: string; value: string }>
                  const memberHasVerifiedSkills = hasVerifiedSkills(member.skills)

                  return (
                    <Card key={member.assignmentId} variant='outlined'>
                      <CardContent sx={{ display: 'grid', gap: 2.5 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between' gap={2}>
                          <div>
                            <Typography variant='h6'>{member.displayName}</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {member.roleTitle || 'Rol no informado'} · {member.fteAllocation.toFixed(2)} FTE
                            </Typography>
                          </div>
                          <Stack direction='row' flexWrap='wrap' gap={1}>
                            <CustomChip round='true' size='small' color={capacityColor(member.capacityHealth)} variant='tonal' label={member.capacityHealth === 'optimal' ? 'Óptimo' : member.capacityHealth === 'attention' ? 'Atención' : 'Crítico'} />
                            {member.assignmentType ? (
                              <CustomChip round='true' size='small' color='secondary' variant='tonal' label={member.assignmentType.replace(/_/g, ' ')} />
                            ) : null}
                            {member.placementId ? (
                              <CustomChip round='true' size='small' color='info' variant='tonal' label={`Staff Aug · ${member.placementStatus || 'activo'}`} />
                            ) : null}
                          </Stack>
                        </Stack>

                        {memberDetails.length > 0 && (
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(memberDetails.length, 4)}, minmax(0, 1fr))` },
                              gap: 2
                            }}
                          >
                            {memberDetails.map(d => (
                              <Box key={d.label}>
                                <Typography variant='caption' color='text.secondary'>{d.label}</Typography>
                                <Typography variant='body2' fontWeight={500}>{d.value}</Typography>
                              </Box>
                            ))}
                          </Box>
                        )}

                        <Box sx={{ display: 'grid', gap: 1.5 }}>
                          <Typography variant='caption' color='text.secondary'>
                            Skills
                          </Typography>
                          <Stack direction='row' flexWrap='wrap' gap={1}>
                            {renderSkillChips(member.skills)}
                          </Stack>
                          {memberHasVerifiedSkills ? <VerifiedByEfeonceBadge size='small' /> : null}
                        </Box>

                        {member.placementId ? (
                          <Stack direction='row' gap={2} flexWrap='wrap'>
                            <Button component={Link} href={`/agency/staff-augmentation/${member.placementId}`} size='small' variant='text'>
                              Abrir placement
                            </Button>
                            <Button component={Link} href='/hr/payroll' size='small' variant='text'>
                              Ver payroll
                            </Button>
                          </Stack>
                        ) : null}
                      </CardContent>
                    </Card>
                  )
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card variant='outlined'>
          <CardHeader
            title='Gaps y recomendaciones por servicio'
            subheader='Requisitos activos, cobertura por skill y candidatos mejor rankeados.'
          />
          <CardContent>
            {!hasServiceRequirements ? (
              <EmptyState
                icon='tabler-badge-off'
                title='Sin requisitos de skills'
                description='Ningún servicio activo tiene requisitos de skills definidos para este Space.'
                action={<Button component={Link} href='/agency/services' variant='contained'>Abrir servicios</Button>}
              />
            ) : (
              <Stack spacing={3}>
                {detail.team.staffing.services.map(service => (
                  <Card key={service.serviceId} variant='outlined'>
                    <CardContent sx={{ display: 'grid', gap: 2.5 }}>
                      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between' gap={2}>
                        <div>
                          <Typography variant='h6'>{service.serviceName}</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {titleize(service.serviceLine)} · {titleize(service.serviceType)}
                          </Typography>
                        </div>
                        <Stack direction='row' flexWrap='wrap' gap={1}>
                          <CustomChip round='true' size='small' color='primary' variant='tonal' label={`${service.summary.totalRequirementCount} requisito(s)`} />
                          <CustomChip round='true' size='small' color={service.summary.gapRequirementCount > 0 ? 'warning' : 'success'} variant='tonal' label={service.summary.gapRequirementCount > 0 ? `${service.summary.gapRequirementCount} gap(s)` : 'Sin gaps'} />
                          <CustomChip round='true' size='small' color='secondary' variant='tonal' label={service.summary.averageFitScore != null ? `Fit promedio ${service.summary.averageFitScore}%` : 'Fit sin datos'} />
                        </Stack>
                      </Stack>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                          gap: 2
                        }}
                      >
                        <Box>
                          <Typography variant='caption' color='text.secondary'>Requisitos</Typography>
                          <Typography variant='h6'>{service.summary.totalRequirementCount}</Typography>
                        </Box>
                        <Box>
                          <Typography variant='caption' color='text.secondary'>Cubiertos</Typography>
                          <Typography variant='h6'>{service.summary.coveredRequirementCount}</Typography>
                        </Box>
                        <Box>
                          <Typography variant='caption' color='text.secondary'>Gaps</Typography>
                          <Typography variant='h6'>{service.summary.gapRequirementCount}</Typography>
                        </Box>
                        <Box>
                          <Typography variant='caption' color='text.secondary'>Fit promedio</Typography>
                          <Typography variant='h6'>{formatPct(service.summary.averageFitScore)}</Typography>
                        </Box>
                      </Box>

                      <Divider />

                      <Stack spacing={2.25}>
                        {service.requirements.map(requirement => (
                          <Box
                            key={`${service.serviceId}-${requirement.skillCode}`}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              border: theme => `1px solid ${theme.palette.divider}`,
                              display: 'grid',
                              gap: 1.5
                            }}
                          >
                            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' gap={2}>
                              <div>
                                <Typography variant='subtitle2'>{formatRequirementLabel(requirement)}</Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {titleize(requirement.skillCategory)} · Cobertura {requirement.coverageFte.toFixed(2)} FTE
                                </Typography>
                              </div>
                              <Stack direction='row' flexWrap='wrap' gap={1}>
                                <CustomChip round='true' size='small' variant='tonal' color={getRequirementTone(requirement.status)} label={requirement.status === 'covered' ? 'Cubierto' : requirement.status === 'partial' ? 'Cobertura parcial' : 'Sin cobertura'} />
                                <CustomChip round='true' size='small' variant='tonal' color='secondary' label={`${requirement.coverageFte.toFixed(2)} FTE / ${requirement.requiredFte.toFixed(2)} requerido`} />
                              </Stack>
                            </Stack>

                            {requirement.notes ? (
                              <Typography variant='body2' color='text.secondary'>
                                {requirement.notes}
                              </Typography>
                            ) : null}

                            <Box>
                              <Typography variant='caption' color='text.secondary'>
                                Candidatos mejor rankeados
                              </Typography>
                              <Box sx={{ mt: 0.75 }}>
                                {renderCandidateChips(requirement.topCandidates)}
                              </Box>
                            </Box>
                          </Box>
                        ))}
                      </Stack>

                      {service.gaps.length > 0 ? (
                        <Alert severity='warning'>
                          {service.gaps.length} requisito(s) siguen con gap en este servicio.
                        </Alert>
                      ) : (
                        <Alert severity='success'>
                          Este servicio queda cubierto con la matriz de skills actual.
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default TeamTab
