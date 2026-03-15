'use client'

import { useCallback, useEffect, useState } from 'react'

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

import CustomChip from '@core/components/mui/Chip'

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { HrMemberProfile } from '@/types/hr-core'
import { jobLevelLabel, employmentTypeLabel, healthSystemLabel, formatDate } from '@views/greenhouse/hr-core/helpers'

type Props = {
  memberId: string
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography variant='body2' fontWeight={500}>{value}</Typography>
  </Box>
)

const ChipArray = ({ items, color }: { items: string[]; color: 'primary' | 'info' | 'success' | 'warning' | 'secondary' }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
    {items.map(item => (
      <CustomChip key={item} round='true' size='small' label={item} color={color} />
    ))}
  </Box>
)

const PersonHrProfileTab = ({ memberId }: Props) => {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<HrMemberProfile | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)

    const res = await fetch(`/api/hr/core/members/${memberId}/profile`)

    if (res.ok) {
      const data = await res.json()

      setProfile(data.profile ?? data)
    }

    setLoading(false)
  }, [memberId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  if (loading) {
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

  if (!profile) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Stack alignItems='center' spacing={1}>
            <i className='tabler-user-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
            <Typography color='text.secondary'>No hay perfil HR configurado para este colaborador.</Typography>
            <Typography variant='caption' color='text.disabled'>
              El perfil se crea al asignar un departamento o configurar datos de empleo.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const otdPercent = profile.otdPercent30d != null ? Math.round(profile.otdPercent30d) : null
  const rpa = profile.rpaAvg30d != null ? profile.rpaAvg30d.toFixed(1) : null

  return (
    <Grid container spacing={6}>
      {/* Performance KPIs */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Volumen mensual'
          stats={profile.avgMonthlyVolume != null ? String(profile.avgMonthlyVolume) : '—'}
          avatarIcon='tabler-chart-bar'
          avatarColor='primary'
          subtitle='Piezas promedio'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Throughput'
          stats={profile.throughputAvg30d != null ? profile.throughputAvg30d.toFixed(1) : '—'}
          avatarIcon='tabler-trending-up'
          avatarColor='success'
          subtitle='Promedio 30 días'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='OTD'
          stats={otdPercent != null ? `${otdPercent}%` : '—'}
          avatarIcon='tabler-clock-check'
          avatarColor={otdPercent != null && otdPercent >= 89 ? 'success' : otdPercent != null ? 'warning' : 'secondary'}
          subtitle='Entrega a tiempo 30d'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='RpA'
          stats={rpa ?? '—'}
          avatarIcon='tabler-refresh'
          avatarColor={rpa != null && Number(rpa) < 2.0 ? 'success' : rpa != null ? 'warning' : 'secondary'}
          subtitle='Revisiones por aprobación'
        />
      </Grid>

      {/* Employment Info */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
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
            <Stack spacing={0.5}>
              <DetailRow label='Departamento' value={profile.departmentName ?? '—'} />
              <DetailRow label='Reporta a' value={profile.reportsToName ?? '—'} />
              <DetailRow label='Nivel' value={profile.jobLevel ? jobLevelLabel[profile.jobLevel] ?? profile.jobLevel : '—'} />
              <DetailRow label='Tipo empleo' value={profile.employmentType ? employmentTypeLabel[profile.employmentType] ?? profile.employmentType : '—'} />
              <DetailRow label='Fecha ingreso' value={formatDate(profile.hireDate)} />
              {profile.contractEndDate && (
                <DetailRow label='Fin contrato' value={formatDate(profile.contractEndDate)} />
              )}
              <DetailRow label='Asistencia diaria' value={profile.dailyRequired ? 'Sí' : 'No'} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Personal & Contact */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Datos personales'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i className='tabler-id' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            <Stack spacing={0.5}>
              <DetailRow label='Teléfono' value={profile.phone ?? '—'} />
              <DetailRow label='Documento' value={profile.identityDocumentNumberMasked ? `${profile.identityDocumentType ?? ''} ${profile.identityDocumentNumberMasked}` : '—'} />
              <DetailRow label='Contacto emergencia' value={profile.emergencyContactName ?? '—'} />
              {profile.emergencyContactPhone && (
                <DetailRow label='Tel. emergencia' value={profile.emergencyContactPhone} />
              )}
              <Divider sx={{ my: 1 }} />
              <DetailRow label='Sistema salud' value={profile.healthSystem ? healthSystemLabel[profile.healthSystem] ?? profile.healthSystem : '—'} />
              {profile.isapreName && <DetailRow label='Isapre' value={profile.isapreName} />}
              <DetailRow label='Banco' value={profile.bankName ?? '—'} />
              {profile.bankAccountNumberMasked && (
                <DetailRow label='Cuenta' value={`${profile.bankAccountType ?? ''} ${profile.bankAccountNumberMasked}`} />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Skills & Tools */}
      {(profile.skills.length > 0 || profile.tools.length > 0 || profile.aiSuites.length > 0) && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Skills y herramientas'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                  <i className='tabler-tools' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                {profile.skills.length > 0 && (
                  <Box>
                    <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                      Skills
                    </Typography>
                    <ChipArray items={profile.skills} color='primary' />
                  </Box>
                )}
                {profile.tools.length > 0 && (
                  <Box>
                    <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                      Herramientas
                    </Typography>
                    <ChipArray items={profile.tools} color='info' />
                  </Box>
                )}
                {profile.aiSuites.length > 0 && (
                  <Box>
                    <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                      Suites AI
                    </Typography>
                    <ChipArray items={profile.aiSuites} color='success' />
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Strengths & Improvement */}
      {(profile.strengths.length > 0 || profile.improvementAreas.length > 0) && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Fortalezas y desarrollo'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                  <i className='tabler-star' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                {profile.strengths.length > 0 && (
                  <Box>
                    <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                      Fortalezas
                    </Typography>
                    <ChipArray items={profile.strengths} color='success' />
                  </Box>
                )}
                {profile.improvementAreas.length > 0 && (
                  <Box>
                    <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                      Áreas de mejora
                    </Typography>
                    <ChipArray items={profile.improvementAreas} color='warning' />
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Piece types & Links */}
      {(profile.pieceTypes.length > 0 || profile.linkedinUrl || profile.portfolioUrl || profile.cvUrl) && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
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
                {profile.pieceTypes.length > 0 && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                      Tipos de pieza
                    </Typography>
                    <ChipArray items={profile.pieceTypes} color='secondary' />
                  </Grid>
                )}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={0.5}>
                    {profile.linkedinUrl && <DetailRow label='LinkedIn' value={profile.linkedinUrl} />}
                    {profile.portfolioUrl && <DetailRow label='Portfolio' value={profile.portfolioUrl} />}
                    {profile.cvUrl && <DetailRow label='CV' value={profile.cvUrl} />}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Notes */}
      {profile.notes && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardContent>
              <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                Notas
              </Typography>
              <Typography variant='body2'>{profile.notes}</Typography>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default PersonHrProfileTab
