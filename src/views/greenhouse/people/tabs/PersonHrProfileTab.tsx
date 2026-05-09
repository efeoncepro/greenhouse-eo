'use client'

import { useEffect, useRef, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { IcoMetricSnapshot } from '@/lib/ico-engine/read-metrics'
import type { PersonHrContext } from '@/lib/person-360/get-person-hr'
import type { HrMemberProfile } from '@/types/hr-core'
import type { PersonOperationalMetrics } from '@/types/people'
import { contractTypeLabel, employmentTypeLabel, formatDate, healthSystemLabel, jobLevelLabel, payrollViaLabel } from '@views/greenhouse/hr-core/helpers'
import { buildPersonHrProfileViewModel } from './person-hr-profile-view-model'
import MemberRoleTitleSection from './MemberRoleTitleSection'
import PersonLegalProfileSection from './PersonLegalProfileSection'
import { formatCurrency as formatGreenhouseCurrency, formatNumber as formatGreenhouseNumber } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

type Props = {
  memberId: string
  hrContext?: PersonHrContext | null
  defaultOperationalMetrics?: PersonOperationalMetrics | null
}

const cardBorderSx = { border: (theme: Theme) => `1px solid ${theme.palette.divider}` }

const offboardingStatusLabel: Record<string, string> = {
  draft: 'Borrador',
  needs_review: 'Requiere revisión',
  approved: 'Aprobado',
  scheduled: 'Programado',
  blocked: 'Bloqueado',
  executed: 'Ejecutado',
  cancelled: 'Cancelado'
}

const offboardingStatusColor: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'secondary',
  needs_review: 'warning',
  approved: 'info',
  scheduled: 'primary',
  blocked: 'error',
  executed: 'success',
  cancelled: 'default'
}

const offboardingLaneLabel: Record<string, string> = {
  internal_payroll: 'Payroll interno',
  external_payroll: 'Payroll externo',
  non_payroll: 'Sin payroll',
  identity_only: 'Solo acceso',
  relationship_transition: 'Transición',
  unknown: 'Por revisar'
}

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

  return formatGreenhouseCurrency(value, normalizedCurrency, {
  minimumFractionDigits,
  maximumFractionDigits: minimumFractionDigits
}, 'en-US')
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
  const [employmentDialogOpen, setEmploymentDialogOpen] = useState(false)
  const [hireDateDraft, setHireDateDraft] = useState('')
  const [savingEmployment, setSavingEmployment] = useState(false)
  const [employmentSaveError, setEmploymentSaveError] = useState<string | null>(null)

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
                activeTasks: 0,
                onTimeTasks: 0,
                lateDropTasks: 0,
                overdueTasks: 0,
                carryOverTasks: 0,
                overdueCarriedForwardTasks: 0
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
  const effectiveHireDate = supplementalProfile?.hireDate ?? viewModel.employment.hireDate

  const documentValue = viewModel.personal.documentNumberMasked
    ? `${viewModel.personal.documentType ?? ''} ${viewModel.personal.documentNumberMasked}`.trim()
    : '—'

  const bankValue = viewModel.personal.bankAccountNumberMasked
    ? `${viewModel.personal.bankAccountType ?? ''} ${viewModel.personal.bankAccountNumberMasked}`.trim()
    : '—'

  const handleOpenEmploymentDialog = () => {
    setHireDateDraft(effectiveHireDate ?? '')
    setEmploymentSaveError(null)
    setEmploymentDialogOpen(true)
  }

  const handleCloseEmploymentDialog = () => {
    if (savingEmployment) {
      return
    }

    setEmploymentDialogOpen(false)
    setEmploymentSaveError(null)
  }

  const handleSaveEmployment = async () => {
    setSavingEmployment(true)
    setEmploymentSaveError(null)

    try {
      const response = await fetch(`/api/hr/core/members/${memberId}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hireDate: hireDateDraft || null
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const errorMessage =
          typeof payload?.error === 'string'
            ? payload.error
            : typeof payload?.message === 'string'
              ? payload.message
              : 'No se pudo guardar la fecha de ingreso.'

        throw new Error(errorMessage)
      }

      const nextProfile = payload?.profile ?? payload ?? null

      setSupplementalProfile(current => {
        if (!nextProfile) {
          return current
        }

        return {
          ...(current ?? {}),
          ...nextProfile
        } as HrMemberProfile
      })
      setEmploymentDialogOpen(false)
    } catch (error) {
      setEmploymentSaveError(error instanceof Error ? error.message : 'No se pudo guardar la fecha de ingreso.')
    } finally {
      setSavingEmployment(false)
    }
  }

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

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={cardBorderSx}>
          <CardHeader
            title='Lifecycle laboral'
            subheader='Distingue contrato, salida laboral y acceso administrativo.'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: viewModel.employment.offboardingCaseId ? 'warning.lightOpacity' : 'primary.lightOpacity' }}>
                <i
                  className={viewModel.employment.offboardingCaseId ? 'tabler-door-exit' : 'tabler-route'}
                  style={{
                    fontSize: 22,
                    color: viewModel.employment.offboardingCaseId ? 'var(--mui-palette-warning-main)' : 'var(--mui-palette-primary-main)'
                  }}
                />
              </Avatar>
            }
            action={
              viewModel.employment.offboardingCaseId ? (
                <CustomChip
                  round='true'
                  variant='tonal'
                  color={offboardingStatusColor[viewModel.employment.offboardingStatus ?? ''] ?? 'warning'}
                  label={offboardingStatusLabel[viewModel.employment.offboardingStatus ?? ''] ?? viewModel.employment.offboardingStatus ?? 'Caso activo'}
                />
              ) : (
                <Button
                  component={Link}
                  href={`/hr/offboarding?memberId=${memberId}`}
                  size='small'
                  variant='tonal'
                  color='warning'
                  startIcon={<i className='tabler-door-exit' />}
                >
                  Iniciar offboarding
                </Button>
              )
            }
          />
          <Divider />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Fecha de ingreso</Typography>
                <Typography fontWeight={700}>{formatDate(effectiveHireDate)}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Fin de contrato</Typography>
                <Typography fontWeight={700}>{viewModel.employment.contractEndDate ? formatDate(viewModel.employment.contractEndDate) : 'Sin fecha contractual'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Salida programada</Typography>
                <Typography fontWeight={700}>{formatDate(viewModel.employment.effectiveExitDate)}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Último día trabajado</Typography>
                <Typography fontWeight={700}>{formatDate(viewModel.employment.lastWorkingDay)}</Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4 }}>
              {viewModel.employment.offboardingCaseId ? (
                <Alert severity={viewModel.employment.offboardingStatus === 'blocked' ? 'error' : 'warning'}>
                  Caso {viewModel.employment.offboardingPublicId ?? viewModel.employment.offboardingCaseId} activo en lane{' '}
                  {offboardingLaneLabel[viewModel.employment.offboardingRuleLane ?? ''] ?? viewModel.employment.offboardingRuleLane ?? 'por revisar'}.
                  El checklist operativo y el finiquito se gobiernan desde HR, no desde la desactivación de usuario.
                </Alert>
              ) : viewModel.employment.contractEndDate ? (
                <Alert severity='info'>
                  Hay una fecha de fin de contrato registrada. Úsala como señal contractual; no equivale a salida ejecutada ni a revocación de acceso.
                </Alert>
              ) : (
                <Alert severity='success'>No hay salida laboral programada para este colaborador.</Alert>
              )}
            </Box>

            {viewModel.employment.relationshipTimeline.length > 0 && (
              <Stack spacing={2} sx={{ mt: 4 }}>
                <Typography variant='subtitle2'>Historial de relaciones</Typography>
                {viewModel.employment.relationshipTimeline.map(relationship => (
                  <Box
                    key={relationship.relationshipId}
                    sx={{
                      display: 'flex',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      justifyContent: 'space-between',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 2,
                      border: theme => `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      p: 2
                    }}
                  >
                    <Box>
                      <Typography variant='body2' fontWeight={700}>{relationship.label}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {formatDate(relationship.effectiveFrom)} — {relationship.effectiveTo ? formatDate(relationship.effectiveTo) : 'vigente'}
                        {relationship.roleLabel ? ` · ${relationship.roleLabel}` : ''}
                      </Typography>
                    </Box>
                    <CustomChip
                      round='true'
                      size='small'
                      variant='tonal'
                      color={relationship.statusTone}
                      label={relationship.statusLabel}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card elevation={0} sx={cardBorderSx}>
          <CardHeader
            title='Información laboral'
            action={
              <Stack direction='row' spacing={2}>
                <Button
                  size='small'
                  variant='tonal'
                  color='primary'
                  startIcon={<i className='tabler-edit' />}
                  onClick={handleOpenEmploymentDialog}
                >
                  Editar ingreso
                </Button>
              </Stack>
            }
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
                <DetailRow label='Fecha ingreso' value={formatDate(effectiveHireDate)} />
                {viewModel.employment.contractEndDate && (
                  <DetailRow label='Fin contrato' value={formatDate(viewModel.employment.contractEndDate)} />
                )}
                {viewModel.employment.offboardingCaseId && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <DetailRow label='Caso offboarding' value={viewModel.employment.offboardingPublicId ?? viewModel.employment.offboardingCaseId} />
                    <DetailRow label='Estado offboarding' value={viewModel.employment.offboardingStatus ?? '—'} />
                    <DetailRow label='Salida efectiva' value={formatDate(viewModel.employment.effectiveExitDate)} />
                    <DetailRow label='Último día trabajado' value={formatDate(viewModel.employment.lastWorkingDay)} />
                    <DetailRow label='Lane' value={viewModel.employment.offboardingRuleLane ?? '—'} />
                  </>
                )}
                <DetailRow label='Asistencia diaria' value={viewModel.employment.dailyRequired ? 'Sí' : 'No'} />
                <Divider sx={{ my: 1 }} />
                <DetailRow label='Régimen' value={viewModel.employment.payRegime ?? '—'} />
                <DetailRow label='Pago vía' value={viewModel.employment.payrollVia ? payrollViaLabel[viewModel.employment.payrollVia] ?? viewModel.employment.payrollVia : '—'} />
                <DetailRow label='Moneda' value={viewModel.employment.currency ?? '—'} />
                <DetailRow label='Salario base' value={formatCurrency(viewModel.employment.baseSalary, viewModel.employment.currency)} />
                <DetailRow label='Contrato' value={viewModel.employment.contractType ? contractTypeLabel[viewModel.employment.contractType] ?? viewModel.employment.contractType : '—'} />
                {viewModel.employment.deelContractId && (
                  <DetailRow label='Contrato Deel' value={viewModel.employment.deelContractId} />
                )}
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

      <Grid size={{ xs: 12 }}>
        <MemberRoleTitleSection memberId={memberId} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <PersonLegalProfileSection memberId={memberId} />
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

      {/* Finance Impact */}
      <FinanceImpactCard memberId={memberId} />

      <Dialog open={employmentDialogOpen} onClose={handleCloseEmploymentDialog} maxWidth='xs' fullWidth>
        <DialogTitle>Editar fecha de ingreso</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              Este dato se usa como referencia laboral del colaborador y también afecta reglas como vacaciones por antiguedad.
            </Typography>

            <TextField
              fullWidth
              size='small'
              label='Fecha de ingreso'
              type='date'
              value={hireDateDraft}
              onChange={event => setHireDateDraft(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {employmentSaveError && <Alert severity='error'>{employmentSaveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={handleCloseEmploymentDialog} disabled={savingEmployment}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={handleSaveEmployment} disabled={savingEmployment}>
            {savingEmployment ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

// ── Finance Impact Card (self-contained, fetches own data) ──

function FinanceImpactCard({ memberId }: { memberId: string }) {
  const [data, setData] = useState<{
    cost: {
      loadedCostTarget: number
      laborCostTarget: number
      baseSalaryClp: number
      directOverheadClp: number
      sharedOverheadClp: number
      periodYear: number
      periodMonth: number
      closureStatus: string | null
      periodClosed: boolean
    } | null
    assignments: { count: number; totalRevenueAttributed: number; items: Array<{ clientName: string | null; fteWeight: number; revenueClp: number }> }
    costRevenueRatio: number | null
    costRevenueStatus: string
  } | null>(null)

  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    fetch(`/api/people/${memberId}/finance-impact`, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(json => json && setData(json))
      .catch(() => {})
  }, [memberId])

  if (!data || !data.cost) return null

  const formatCLP = (v: number) => `$${formatGreenhouseNumber(Math.round(v), 'es-CL')}`

  const periodLabel = data.cost ? `${String(data.cost.periodMonth).padStart(2, '0')}/${data.cost.periodYear}` : null

  const closureColor = data.cost?.closureStatus === 'closed' || data.cost?.periodClosed ? 'success'
    : data.cost?.closureStatus === 'ready' ? 'info'
      : data.cost?.closureStatus === 'reopened' ? 'warning'
        : 'secondary'

  const closureLabel = data.cost?.closureStatus === 'closed' || data.cost?.periodClosed ? 'Cerrado'
    : data.cost?.closureStatus === 'ready' ? 'Listo para cierre'
      : data.cost?.closureStatus === 'reopened' ? 'Reabierto'
        : 'Provisional'

  const statusColor = data.costRevenueStatus === 'optimal' ? 'success'
    : data.costRevenueStatus === 'attention' ? 'warning' : 'error'

  const statusLabel = data.costRevenueStatus === 'optimal' ? 'Óptimo'
    : data.costRevenueStatus === 'attention' ? 'Atención' : 'Crítico'

  return (
    <Grid size={{ xs: 12 }}>
      <Card elevation={0} sx={(t: Theme) => ({ border: `1px solid ${t.palette.divider}` })}>
        <CardHeader
          title='Impacto financiero'
          subheader={periodLabel ? `Período ${periodLabel}` : undefined}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
              <i className='tabler-chart-bar' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
            </Avatar>
          }
          action={
            <Stack spacing={1} alignItems='flex-end'>
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={closureColor}
                label={closureLabel}
              />
              {data.costRevenueRatio !== null ? (
                <CustomChip
                  round='true'
                  size='small'
                  color={statusColor}
                  label={`${data.costRevenueRatio}% costo/ingreso · ${statusLabel}`}
                />
              ) : null}
            </Stack>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Stack spacing={1.5}>
                <Typography variant='overline' color='text.secondary'>Costo mensual</Typography>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>Salario base</Typography>
                  <Typography variant='body2'>{formatCLP(data.cost.baseSalaryClp)}</Typography>
                </Stack>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>Costo laboral</Typography>
                  <Typography variant='body2'>{formatCLP(data.cost.laborCostTarget)}</Typography>
                </Stack>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>Overhead directo</Typography>
                  <Typography variant='body2'>{formatCLP(data.cost.directOverheadClp)}</Typography>
                </Stack>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>Overhead compartido</Typography>
                  <Typography variant='body2'>{formatCLP(data.cost.sharedOverheadClp)}</Typography>
                </Stack>
                <Divider />
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>Costo total loaded</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>{formatCLP(data.cost.loadedCostTarget)}</Typography>
                </Stack>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Stack spacing={1.5}>
                <Typography variant='overline' color='text.secondary'>Revenue atribuido ({data.assignments.count} clientes)</Typography>
                {data.assignments.items.slice(0, 5).map((a, i) => (
                  <Stack key={i} direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>{a.clientName ?? 'Sin nombre'} ({Math.round(a.fteWeight * 100)}%)</Typography>
                    <Typography variant='body2'>{formatCLP(a.revenueClp)}</Typography>
                  </Stack>
                ))}
                <Divider />
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>Total atribuido</Typography>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>{formatCLP(data.assignments.totalRevenueAttributed)}</Typography>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  )
}

export default PersonHrProfileTab
