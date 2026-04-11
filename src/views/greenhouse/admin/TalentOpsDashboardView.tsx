'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import { EmptyState } from '@/components/greenhouse'
import { getInitials } from '@/utils/getInitials'

import tableStyles from '@core/styles/table.module.css'

// ── Types ────────────────────────────────────────────────────────

interface ActionItem {
  type: 'cert_expiring' | 'cert_expired' | 'profile_stale' | 'profile_incomplete' | 'pending_review'
  memberId: string
  memberDisplayName: string
  memberAvatarUrl: string | null
  description: string
  urgency: 'high' | 'medium' | 'low'
}

interface ProfileCompletenessRow {
  memberId: string
  displayName: string
  avatarUrl: string | null
  score: number
  hasHeadline: boolean
  hasSkills: boolean
  hasTools: boolean
  hasCertifications: boolean
  hasLanguages: boolean
  hasLinks: boolean
  hasEvidence: boolean
  lastUpdated: string | null
}

interface SkillGapRow {
  skillName: string
  category: string | null
  memberCount: number
  verifiedCount: number
}

interface TalentOpsResponse {
  profileHealthScore: number
  totalMembers: number
  completeProfiles: number
  pendingReviewCount: number
  expiringSoonCertCount: number
  expiredCertCount: number
  catalogCoverage: number
  toolCatalogCoverage: number
  actionItems: ActionItem[]
  profileCompleteness: ProfileCompletenessRow[]
  skillGaps: SkillGapRow[]
}

// ── Labels ───────────────────────────────────────────────────────

const LABELS = {
  pageTitle: 'Salud del sistema de talento',
  pageSubtitle: 'Metricas operativas, completitud y acciones de mantenimiento',

  // KPIs
  kpiHealth: 'Salud del talento',
  kpiComplete: 'Perfiles completos',
  kpiPendingReview: 'Pendientes de revision',
  kpiExpiring: 'Por vencer',

  // Sections
  sectionActions: 'Acciones pendientes',
  sectionCompleteness: 'Completitud de perfiles',
  sectionSkillCoverage: 'Cobertura del catalogo',

  // Action types
  actionCertExpiring: 'Certificacion por vencer',
  actionCertExpired: 'Certificacion vencida',
  actionProfileStale: 'Perfil desactualizado',
  actionProfileIncomplete: 'Perfil incompleto',
  actionPendingReview: 'Pendiente de revision',

  // Urgency
  urgencyHigh: 'Alta',
  urgencyMedium: 'Media',
  urgencyLow: 'Baja',

  // Table headers
  colMember: 'Persona',
  colDescription: 'Descripcion',
  colUrgency: 'Urgencia',
  colAction: 'Accion',
  colScore: 'Completitud',
  colHeadline: 'Titular',
  colSkills: 'Skills',
  colTools: 'Tools',
  colCerts: 'Certs',
  colLanguages: 'Idiomas',
  colLinks: 'Links',
  colEvidence: 'Evidencia',
  colLastUpdated: 'Actualizado',
  colSkillName: 'Skill',
  colCategory: 'Categoria',
  colMembers: 'Miembros',
  colVerified: 'Verificados',

  // Skill coverage
  labelCatalogCoverage: 'Cobertura de skills',
  labelToolCoverage: 'Cobertura de herramientas',

  // Actions
  actionView: 'Ver',

  // Empty
  emptyActions: 'Sin acciones pendientes — el sistema de talento esta al dia.',

  // Loading / error
  loading: 'Cargando metricas de talento...',
  error: 'No pudimos cargar las metricas de talento. Intenta de nuevo.'
} as const

// ── Helpers ──────────────────────────────────────────────────────

const healthColor = (score: number): 'success' | 'warning' | 'error' => {
  if (score > 70) return 'success'
  if (score > 40) return 'warning'

  return 'error'
}

const healthLabel = (score: number): string => {
  if (score > 70) return 'Optimo'
  if (score > 40) return 'Atencion'

  return 'Critico'
}

const progressColor = (score: number): 'success' | 'warning' | 'error' => {
  if (score > 80) return 'success'
  if (score > 50) return 'warning'

  return 'error'
}

const urgencyColor = (urgency: ActionItem['urgency']): 'error' | 'warning' | 'info' => {
  switch (urgency) {
    case 'high': return 'error'
    case 'medium': return 'warning'
    case 'low': return 'info'
  }
}

const urgencyLabel = (urgency: ActionItem['urgency']): string => {
  switch (urgency) {
    case 'high': return LABELS.urgencyHigh
    case 'medium': return LABELS.urgencyMedium
    case 'low': return LABELS.urgencyLow
  }
}

const actionTypeIcon = (type: ActionItem['type']): string => {
  switch (type) {
    case 'cert_expiring': return 'tabler-certificate-2'
    case 'cert_expired': return 'tabler-certificate-2'
    case 'profile_stale': return 'tabler-clock'
    case 'profile_incomplete': return 'tabler-user'
    case 'pending_review': return 'tabler-eye'
  }
}

const actionTypeLabel = (type: ActionItem['type']): string => {
  switch (type) {
    case 'cert_expiring': return LABELS.actionCertExpiring
    case 'cert_expired': return LABELS.actionCertExpired
    case 'profile_stale': return LABELS.actionProfileStale
    case 'profile_incomplete': return LABELS.actionProfileIncomplete
    case 'pending_review': return LABELS.actionPendingReview
  }
}

const formatDate = (value: string | null): string => {
  if (!value) return '\u2014'

  try {
    return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'America/Santiago' }).format(new Date(value))
  } catch {
    return value
  }
}

const CheckIcon = ({ checked }: { checked: boolean }) => (
  <i
    className={classnames(checked ? 'tabler-circle-check' : 'tabler-circle-x', 'text-[18px]')}
    style={{ color: checked ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-text-disabled)' }}
    aria-label={checked ? 'Si' : 'No'}
  />
)

// ── Component ────────────────────────────────────────────────────

const TalentOpsDashboardView = () => {
  const [data, setData] = useState<TalentOpsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/hr/core/talent-ops')

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json: TalentOpsResponse = await res.json()

        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setError(LABELS.error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => { cancelled = true }
  }, [])

  // Sort profile completeness worst-first, limit to top 20
  const sortedProfiles = useMemo(() => {
    if (!data) return []

    return [...data.profileCompleteness]
      .sort((a, b) => a.score - b.score)
      .slice(0, 20)
  }, [data])

  // ── Loading state ──
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Stack alignItems='center' spacing={2}>
          <CircularProgress />
          <Typography variant='body2' color='text.secondary'>{LABELS.loading}</Typography>
        </Stack>
      </Box>
    )
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <Alert severity='error' sx={{ m: 4 }}>
        {error || LABELS.error}
      </Alert>
    )
  }

  // ── KPIs ──
  const kpis = [
    {
      title: LABELS.kpiHealth,
      stats: `${Math.round(data.profileHealthScore)}%`,
      avatarIcon: 'tabler-heart-rate-monitor',
      avatarColor: healthColor(data.profileHealthScore),
      subtitle: healthLabel(data.profileHealthScore),
      statusLabel: healthLabel(data.profileHealthScore),
      statusColor: healthColor(data.profileHealthScore),
      statusIcon: data.profileHealthScore > 70 ? 'tabler-circle-check' : data.profileHealthScore > 40 ? 'tabler-alert-triangle' : 'tabler-alert-circle'
    },
    {
      title: LABELS.kpiComplete,
      stats: `${data.completeProfiles} / ${data.totalMembers}`,
      avatarIcon: 'tabler-user-check',
      avatarColor: 'info' as const,
      subtitle: `${data.totalMembers > 0 ? Math.round((data.completeProfiles / data.totalMembers) * 100) : 0}% del equipo`
    },
    {
      title: LABELS.kpiPendingReview,
      stats: `${data.pendingReviewCount}`,
      avatarIcon: 'tabler-eye',
      avatarColor: data.pendingReviewCount > 0 ? ('warning' as const) : ('success' as const),
      subtitle: data.pendingReviewCount > 0 ? 'Requieren atencion' : 'Al dia'
    },
    {
      title: LABELS.kpiExpiring,
      stats: `${data.expiringSoonCertCount + data.expiredCertCount}`,
      avatarIcon: 'tabler-certificate-2',
      avatarColor: data.expiredCertCount > 0 ? ('error' as const) : data.expiringSoonCertCount > 0 ? ('warning' as const) : ('success' as const),
      subtitle: data.expiredCertCount > 0
        ? `${data.expiredCertCount} vencida${data.expiredCertCount !== 1 ? 's' : ''}, ${data.expiringSoonCertCount} por vencer`
        : data.expiringSoonCertCount > 0
          ? `${data.expiringSoonCertCount} por vencer`
          : 'Sin vencimientos proximos'
    }
  ]

  return (
    <Grid container spacing={6}>
      {/* ── Page header ── */}
      <Grid size={12}>
        <Typography variant='h4'>{LABELS.pageTitle}</Typography>
        <Typography variant='body2' color='text.secondary'>{LABELS.pageSubtitle}</Typography>
      </Grid>

      {/* ── Section 1: Health KPIs ── */}
      {kpis.map((kpi, i) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
          <HorizontalWithSubtitle {...kpi} />
        </Grid>
      ))}

      {/* ── Section 2: Action Items ── */}
      <Grid size={12}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            title={LABELS.sectionActions}
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                <i className='tabler-alert-triangle' style={{ color: 'var(--mui-palette-warning-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent sx={{ p: 0 }}>
            {data.actionItems.length === 0 ? (
              <Box sx={{ p: 6 }}>
                <EmptyState
                  icon='tabler-checks'
                  title={LABELS.emptyActions}
                  description=''
                />
              </Box>
            ) : (
              <TableContainer>
                <Table className={tableStyles.table} size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>{LABELS.colMember}</TableCell>
                      <TableCell>{LABELS.colDescription}</TableCell>
                      <TableCell>{LABELS.colUrgency}</TableCell>
                      <TableCell align='right'>{LABELS.colAction}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.actionItems.map((item, idx) => (
                      <TableRow key={`${item.memberId}-${item.type}-${idx}`}>
                        <TableCell>
                          <Stack direction='row' spacing={2} alignItems='center'>
                            <CustomAvatar
                              src={item.memberAvatarUrl || undefined}
                              size={32}
                              color='primary'
                              skin='light'
                            >
                              {getInitials(item.memberDisplayName)}
                            </CustomAvatar>
                            <Box>
                              <Typography variant='body2' fontWeight={500}>
                                {item.memberDisplayName}
                              </Typography>
                              <Stack direction='row' spacing={0.5} alignItems='center'>
                                <i className={classnames(actionTypeIcon(item.type), 'text-[14px]')} style={{ color: 'var(--mui-palette-text-secondary)' }} />
                                <Typography variant='caption' color='text.secondary'>
                                  {actionTypeLabel(item.type)}
                                </Typography>
                              </Stack>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{item.description}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={urgencyColor(item.urgency)}
                            label={urgencyLabel(item.urgency)}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <Typography
                            component={Link}
                            href={`/admin/team/${item.memberId}`}
                            variant='body2'
                            color='primary'
                            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {LABELS.actionView}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* ── Section 3: Profile Completeness ── */}
      <Grid size={12}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            title={LABELS.sectionCompleteness}
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i className='tabler-user-check' style={{ color: 'var(--mui-palette-info-main)' }} />
              </Avatar>
            }
            subheader={`${sortedProfiles.length > 0 ? `Top ${sortedProfiles.length} con menor completitud` : 'Sin perfiles'}`}
          />
          <Divider />
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table className={tableStyles.table} size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{LABELS.colMember}</TableCell>
                    <TableCell sx={{ minWidth: 160 }}>{LABELS.colScore}</TableCell>
                    <TableCell align='center'>{LABELS.colHeadline}</TableCell>
                    <TableCell align='center'>{LABELS.colSkills}</TableCell>
                    <TableCell align='center'>{LABELS.colTools}</TableCell>
                    <TableCell align='center'>{LABELS.colCerts}</TableCell>
                    <TableCell align='center'>{LABELS.colLanguages}</TableCell>
                    <TableCell align='center'>{LABELS.colLinks}</TableCell>
                    <TableCell align='center'>{LABELS.colEvidence}</TableCell>
                    <TableCell>{LABELS.colLastUpdated}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedProfiles.map(row => (
                    <TableRow key={row.memberId}>
                      <TableCell>
                        <Stack direction='row' spacing={2} alignItems='center'>
                          <CustomAvatar
                            src={row.avatarUrl || undefined}
                            size={32}
                            color='primary'
                            skin='light'
                          >
                            {getInitials(row.displayName)}
                          </CustomAvatar>
                          <Typography
                            component={Link}
                            href={`/admin/team/${row.memberId}`}
                            variant='body2'
                            fontWeight={500}
                            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {row.displayName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <LinearProgress
                            variant='determinate'
                            value={row.score}
                            color={progressColor(row.score)}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant='caption' fontWeight={600} sx={{ minWidth: 36, textAlign: 'right' }}>
                            {row.score}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align='center'><CheckIcon checked={row.hasHeadline} /></TableCell>
                      <TableCell align='center'><CheckIcon checked={row.hasSkills} /></TableCell>
                      <TableCell align='center'><CheckIcon checked={row.hasTools} /></TableCell>
                      <TableCell align='center'><CheckIcon checked={row.hasCertifications} /></TableCell>
                      <TableCell align='center'><CheckIcon checked={row.hasLanguages} /></TableCell>
                      <TableCell align='center'><CheckIcon checked={row.hasLinks} /></TableCell>
                      <TableCell align='center'><CheckIcon checked={row.hasEvidence} /></TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {formatDate(row.lastUpdated)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Section 4: Skill Coverage ── */}
      <Grid size={12}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            title={LABELS.sectionSkillCoverage}
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-chart-dots' style={{ color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            <Grid container spacing={6}>
              {/* Left: Skill gaps table */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Typography variant='subtitle2' sx={{ mb: 2 }}>Gaps de skills</Typography>
                <TableContainer>
                  <Table className={tableStyles.table} size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>{LABELS.colSkillName}</TableCell>
                        <TableCell>{LABELS.colCategory}</TableCell>
                        <TableCell align='right'>{LABELS.colMembers}</TableCell>
                        <TableCell align='right'>{LABELS.colVerified}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.skillGaps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align='center'>
                            <Typography variant='body2' color='text.secondary' sx={{ py: 4 }}>
                              Sin gaps detectados en el catalogo
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.skillGaps.map((gap, idx) => (
                          <TableRow key={`${gap.skillName}-${idx}`}>
                            <TableCell>
                              <Typography variant='body2' fontWeight={500}>{gap.skillName}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2' color='text.secondary'>
                                {gap.category || '\u2014'}
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='body2'>{gap.memberCount}</Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Chip
                                size='small'
                                variant='tonal'
                                color={gap.verifiedCount === 0 ? 'error' : gap.verifiedCount < gap.memberCount ? 'warning' : 'success'}
                                label={gap.verifiedCount}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Right: Summary stats */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant='subtitle2' sx={{ mb: 2 }}>Resumen de cobertura</Typography>
                <Stack spacing={4}>
                  <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant='body2' color='text.secondary'>{LABELS.labelCatalogCoverage}</Typography>
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <LinearProgress
                            variant='determinate'
                            value={data.catalogCoverage}
                            color={progressColor(data.catalogCoverage)}
                            sx={{ flex: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant='h6' fontWeight={600}>
                            {Math.round(data.catalogCoverage)}%
                          </Typography>
                        </Stack>
                        <Typography variant='caption' color='text.secondary'>
                          Porcentaje de skills del catalogo cubiertas por al menos un miembro
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                  <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant='body2' color='text.secondary'>{LABELS.labelToolCoverage}</Typography>
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <LinearProgress
                            variant='determinate'
                            value={data.toolCatalogCoverage}
                            color={progressColor(data.toolCatalogCoverage)}
                            sx={{ flex: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant='h6' fontWeight={600}>
                            {Math.round(data.toolCatalogCoverage)}%
                          </Typography>
                        </Stack>
                        <Typography variant='caption' color='text.secondary'>
                          Porcentaje de herramientas del catalogo cubiertas por al menos un miembro
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default TalentOpsDashboardView
