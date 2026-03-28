'use client'

import { useEffect, useRef, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { IcoMetricSnapshot } from '@/lib/ico-engine/read-metrics'
import type { PersonHrContext } from '@/lib/person-360/get-person-hr'
import type { HrMemberProfile } from '@/types/hr-core'
import type { PersonOperationalMetrics } from '@/types/people'
import { jobLevelLabel, employmentTypeLabel, healthSystemLabel, formatDate } from '@views/greenhouse/hr-core/helpers'
import { buildPersonHrProfileViewModel } from './person-hr-profile-view-model'

type Props = {
  memberId: string
  hrContext?: PersonHrContext | null
  defaultOperationalMetrics?: PersonOperationalMetrics | null
}

const cardBorderSx = { border: (theme: Theme) => `1px solid ${theme.palette.divider}` }

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, py: 0.5 }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography variant='body2' fontWeight={500} sx={{ textAlign: 'right' }}>{value}</Typography>
  </Box>
)

const EmptyBlock = ({ message }: { message: string }) => (
  <Stack spacing={1} sx={{ py: 1 }}>
    <Typography variant='body2' color='text.secondary'>
      {message}
    </Typography>
  </Stack>
)

const ChipArray = ({ items, color }: { items: string[]; color: 'primary' | 'info' | 'success' | 'warning' | 'secondary' }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
    {items.map(item => (
      <CustomChip key={item} round='true' size='small' label={item} color={color} />
    ))}
  </Box>
)

const formatCurrency = (value: number | null, currency: string | null) => {
  if (value === null) return '—'

  const normalizedCurrency = currency || 'USD'
  const minimumFractionDigits = normalizedCurrency === 'CLP' ? 0 : 2

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizedCurrency,
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits
  }).format(value)
}

const PersonHrProfileTab = ({ memberId, hrContext = null, defaultOperationalMetrics = null }: Props) => {
  const periodRef = useRef({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  })

  const [supplementalProfile, setSupplementalProfile] = useState<HrMemberProfile | null>(null)
  const [supplementalLoaded, setSupplementalLoaded] = useState(false)
  const [icoSnapshot, setIcoSnapshot] = useState<IcoMetricSnapshot | null>(null)
  const [icoLoaded, setIcoLoaded] = useState(false)

  useEffect(() => {
    let active = true

    const loadSupplementalProfile = async () => {
      setSupplementalLoaded(false)

      try {
        const res = await fetch(`/api/hr/core/members/${memberId}/profile`)
        const data = res.ok ? await res.json() : null

        if (!active) return

        setSupplementalProfile(data?.profile ?? data ?? null)
      } catch {
        if (!active) return

        setSupplementalProfile(null)
      } finally {
        if (active) {
          setSupplementalLoaded(true)
        }
      }
    }

    void loadSupplementalProfile()

    return () => {
      active = false
    }
  }, [memberId])

  useEffect(() => {
    let active = true

    const loadOperationalSnapshot = async () => {
      setIcoLoaded(false)

      try {
        // Primary: read from unified person_operational_360 via intelligence API
        const intelligenceRes = await fetch(`/api/people/${memberId}/intelligence?trend=1`)

        if (intelligenceRes.ok && active) {
          const intel = await intelligenceRes.json()

          if (intel.current) {
            // Map intelligence response to IcoMetricSnapshot-compatible format
            const syntheticIco: IcoMetricSnapshot = {
              dimension: 'member',
              dimensionValue: memberId,
              dimensionLabel: null,
              periodYear: intel.current.period.year,
              periodMonth: intel.current.period.month,
              metrics: [
                ...intel.current.deliveryMetrics,
                ...intel.current.derivedMetrics
              ],
              cscDistribution: [],
              context: {
                totalTasks: 0,
                completedTasks: 0,
                activeTasks: 0
              },
              computedAt: intel.current.materializedAt,
              engineVersion: intel.current.engineVersion,
              source: 'materialized'
            }

            setIcoSnapshot(syntheticIco)
            setIcoLoaded(true)

            return
          }
        }

        // Fallback: read from ICO API directly
        if (!active) return

        const { year, month } = periodRef.current
        const res = await fetch(`/api/people/${memberId}/ico?year=${year}&month=${month}`)
        const data = res.ok ? await res.json() : null

        if (!active) return

        setIcoSnapshot(data)
      } catch {
        if (!active) return

        setIcoSnapshot(null)
      } finally {
        if (active) {
          setIcoLoaded(true)
        }
      }
    }

    void loadOperationalSnapshot()

    return () => {
      active = false
    }
  }, [memberId])

  const viewModel = buildPersonHrProfileViewModel({
    hrContext,
    supplementalProfile,
    icoSnapshot,
    fallbackOperationalMetrics: defaultOperationalMetrics
  })

  const initialLoading = !hrContext && !supplementalLoaded && !icoLoaded

  if (initialLoading) {
    return (
      <Grid container spacing={6}>
        {[0, 1, 2, 3].map(i => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <Skeleton variant='rounded' height={100} />
          </Grid>
        ))}
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant='rounded' height={280} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant='rounded' height={280} />
        </Grid>
      </Grid>
    )
  }

  if (!viewModel.hasAnyData) {
    return (
      <Card elevation={0} sx={cardBorderSx}>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Stack alignItems='center' spacing={1}>
            <i className='tabler-user-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
            <Typography color='text.secondary'>No hay perfil HR consolidado para este colaborador.</Typography>
            <Typography variant='caption' color='text.disabled'>
              Completa datos maestros en HR Core o espera a que el contexto 360 se sincronice.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const otdPercent = viewModel.operational.otdPercent != null ? Math.round(viewModel.operational.otdPercent) : null
  const rpa = viewModel.operational.rpa != null ? viewModel.operational.rpa.toFixed(2) : null
  const throughput = viewModel.operational.throughput != null ? viewModel.operational.throughput.toFixed(1) : null
  const operationalSubtitle = [viewModel.operational.sourceLabel, viewModel.operational.periodLabel].filter(Boolean).join(' · ')

  const documentValue = viewModel.personal.documentNumberMasked
    ? `${viewModel.personal.documentType ?? ''} ${viewModel.personal.documentNumberMasked}`.trim()
    : '—'

  const bankValue = viewModel.personal.bankAccountNumberMasked
    ? `${viewModel.personal.bankAccountType ?? ''} ${viewModel.personal.bankAccountNumberMasked}`.trim()
    : '—'

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack spacing={0.5}>
          <Typography variant='h6'>Indicadores operativos</Typography>
          <Typography variant='body2' color='text.secondary'>
            {operationalSubtitle || 'Sin señal operativa disponible para este colaborador.'}
          </Typography>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Volumen del período'
          stats={viewModel.operational.volume != null ? String(viewModel.operational.volume) : '—'}
          avatarIcon='tabler-chart-bar'
          avatarColor='primary'
          subtitle={viewModel.operational.source === 'ico' ? 'Tareas observadas' : 'Fallback operativo'}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Throughput'
          stats={throughput ?? '—'}
          avatarIcon='tabler-trending-up'
          avatarColor='success'
          subtitle='Fuente ICO'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='OTD'
          stats={otdPercent != null ? `${otdPercent}%` : '—'}
          avatarIcon='tabler-clock-check'
          avatarColor={otdPercent != null && otdPercent >= 89 ? 'success' : otdPercent != null ? 'warning' : 'secondary'}
          subtitle={viewModel.operational.source === 'ico' ? 'Entrega a tiempo' : 'Fallback 30 días'}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='RpA'
          stats={rpa ?? '—'}
          avatarIcon='tabler-refresh'
          avatarColor={rpa != null && Number(rpa) < 2.0 ? 'success' : rpa != null ? 'warning' : 'secondary'}
          subtitle={viewModel.operational.source === 'ico' ? 'Revisiones por aprobación' : 'Fallback 30 días'}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card elevation={0} sx={cardBorderSx}>
          <CardHeader
            title='Información laboral'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-briefcase' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            {viewModel.employment.departmentName ||
            viewModel.employment.supervisorName ||
            viewModel.employment.jobLevel ||
            viewModel.employment.employmentType ||
            viewModel.employment.hireDate ||
            viewModel.employment.contractEndDate ||
            viewModel.employment.payRegime ||
            viewModel.employment.currency ||
            viewModel.employment.baseSalary !== null ||
            viewModel.employment.contractType ||
            viewModel.employment.dailyRequired !== null ? (
              <Stack spacing={0.5}>
                <DetailRow label='Departamento' value={viewModel.employment.departmentName ?? '—'} />
                <DetailRow label='Reporta a' value={viewModel.employment.supervisorName ?? '—'} />
                <DetailRow label='Nivel' value={viewModel.employment.jobLevel ? jobLevelLabel[viewModel.employment.jobLevel] ?? viewModel.employment.jobLevel : '—'} />
                <DetailRow label='Tipo empleo' value={viewModel.employment.employmentType ? employmentTypeLabel[viewModel.employment.employmentType] ?? viewModel.employment.employmentType : '—'} />
                <DetailRow label='Fecha ingreso' value={formatDate(viewModel.employment.hireDate)} />
                {viewModel.employment.contractEndDate && (
                  <DetailRow label='Fin contrato' value={formatDate(viewModel.employment.contractEndDate)} />
                )}
                <DetailRow label='Asistencia diaria' value={viewModel.employment.dailyRequired ? 'Sí' : 'No'} />
                <Divider sx={{ my: 1 }} />
                <DetailRow label='Régimen' value={viewModel.employment.payRegime ?? '—'} />
                <DetailRow label='Moneda' value={viewModel.employment.currency ?? '—'} />
                <DetailRow label='Salario base' value={formatCurrency(viewModel.employment.baseSalary, viewModel.employment.currency)} />
                <DetailRow label='Contrato' value={viewModel.employment.contractType ?? '—'} />
              </Stack>
            ) : (
              <EmptyBlock message='No hay datos laborales maestros consolidados para este colaborador.' />
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card elevation={0} sx={cardBorderSx}>
          <CardHeader
            title='Ausencias y beneficios'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                <i className='tabler-calendar-check' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            {viewModel.leave.hasData ? (
              <Stack spacing={0.5}>
                <DetailRow label='Vacaciones disponibles' value={String(viewModel.leave.available)} />
                <DetailRow label='Vacaciones usadas' value={String(viewModel.leave.used)} />
                <DetailRow label='Vacaciones reservadas' value={String(viewModel.leave.reserved)} />
                <DetailRow label='Bolsa anual' value={String(viewModel.leave.annualAllowance)} />
                <DetailRow label='Arrastre' value={String(viewModel.leave.carriedOver)} />
                <Divider sx={{ my: 1 }} />
                <DetailRow label='Días personales' value={`${viewModel.leave.personalUsed}/${viewModel.leave.personalAllowance}`} />
                <DetailRow label='Solicitudes pendientes' value={String(viewModel.leave.pendingRequests)} />
                <DetailRow label='Solicitudes aprobadas' value={String(viewModel.leave.approvedRequestsThisYear)} />
                <DetailRow label='Días aprobados este año' value={String(viewModel.leave.totalApprovedDaysThisYear)} />
              </Stack>
            ) : (
              <EmptyBlock message='No hay saldos o contexto de ausencias sincronizados todavía.' />
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card elevation={0} sx={cardBorderSx}>
          <CardHeader
            title='Datos personales'
            subheader='Enriquecimiento HR Core opcional'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i className='tabler-id' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            {!supplementalLoaded && !viewModel.personal.hasData ? (
              <Stack spacing={1.5}>
                <Skeleton variant='text' width='75%' />
                <Skeleton variant='text' width='60%' />
                <Skeleton variant='text' width='70%' />
              </Stack>
            ) : viewModel.personal.hasData ? (
              <Stack spacing={0.5}>
                <DetailRow label='Teléfono' value={viewModel.personal.phone ?? '—'} />
                <DetailRow label='Documento' value={documentValue} />
                <DetailRow label='Contacto emergencia' value={viewModel.personal.emergencyContactName ?? '—'} />
                {viewModel.personal.emergencyContactPhone && (
                  <DetailRow label='Tel. emergencia' value={viewModel.personal.emergencyContactPhone} />
                )}
                <Divider sx={{ my: 1 }} />
                <DetailRow label='Sistema salud' value={viewModel.personal.healthSystem ? healthSystemLabel[viewModel.personal.healthSystem] ?? viewModel.personal.healthSystem : '—'} />
                {viewModel.personal.isapreName && <DetailRow label='Isapre' value={viewModel.personal.isapreName} />}
                <DetailRow label='Banco' value={viewModel.personal.bankName ?? '—'} />
                <DetailRow label='Cuenta' value={bankValue} />
              </Stack>
            ) : (
              <EmptyBlock message='Este bloque aún no tiene datos cargados en HR Core para este colaborador.' />
            )}
          </CardContent>
        </Card>
      </Grid>

      {(viewModel.supplemental.hasSkillsTools || !supplementalLoaded) && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={cardBorderSx}>
            <CardHeader
              title='Skills y herramientas'
              subheader='Enriquecimiento HR Core opcional'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                  <i className='tabler-tools' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              {!supplementalLoaded && !viewModel.supplemental.hasSkillsTools ? (
                <Stack spacing={1.5}>
                  <Skeleton variant='text' width='40%' />
                  <Skeleton variant='rounded' height={36} />
                </Stack>
              ) : viewModel.supplemental.hasSkillsTools ? (
                <Stack spacing={2}>
                  {viewModel.supplemental.skills.length > 0 && (
                    <Box>
                      <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                        Skills
                      </Typography>
                      <ChipArray items={viewModel.supplemental.skills} color='primary' />
                    </Box>
                  )}
                  {viewModel.supplemental.tools.length > 0 && (
                    <Box>
                      <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                        Herramientas
                      </Typography>
                      <ChipArray items={viewModel.supplemental.tools} color='info' />
                    </Box>
                  )}
                  {viewModel.supplemental.aiSuites.length > 0 && (
                    <Box>
                      <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                        Suites AI
                      </Typography>
                      <ChipArray items={viewModel.supplemental.aiSuites} color='success' />
                    </Box>
                  )}
                </Stack>
              ) : (
                <EmptyBlock message='Aún no hay skills o herramientas cargadas para este colaborador.' />
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {viewModel.supplemental.hasStrengths && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={cardBorderSx}>
            <CardHeader
              title='Fortalezas y desarrollo'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity' }}>
                  <i className='tabler-star' style={{ fontSize: 22, color: 'var(--mui-palette-secondary-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                {viewModel.supplemental.strengths.length > 0 && (
                  <Box>
                    <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                      Fortalezas
                    </Typography>
                    <ChipArray items={viewModel.supplemental.strengths} color='success' />
                  </Box>
                )}
                {viewModel.supplemental.improvementAreas.length > 0 && (
                  <Box>
                    <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                      Áreas de mejora
                    </Typography>
                    <ChipArray items={viewModel.supplemental.improvementAreas} color='warning' />
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      )}

      {viewModel.supplemental.hasProductionLinks && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardBorderSx}>
            <CardHeader
              title='Producción y enlaces'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity' }}>
                  <i className='tabler-link' style={{ fontSize: 22, color: 'var(--mui-palette-secondary-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={4}>
                {viewModel.supplemental.pieceTypes.length > 0 && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                      Tipos de pieza
                    </Typography>
                    <ChipArray items={viewModel.supplemental.pieceTypes} color='secondary' />
                  </Grid>
                )}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={0.5}>
                    {viewModel.supplemental.linkedinUrl && <DetailRow label='LinkedIn' value={viewModel.supplemental.linkedinUrl} />}
                    {viewModel.supplemental.portfolioUrl && <DetailRow label='Portfolio' value={viewModel.supplemental.portfolioUrl} />}
                    {viewModel.supplemental.cvUrl && <DetailRow label='CV' value={viewModel.supplemental.cvUrl} />}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {viewModel.supplemental.hasNotes && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardBorderSx}>
            <CardContent>
              <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                Notas
              </Typography>
              <Typography variant='body2'>{viewModel.supplemental.notes}</Typography>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default PersonHrProfileTab
