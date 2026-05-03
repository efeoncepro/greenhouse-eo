'use client'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell, ExecutiveMiniStatCard } from '@/components/greenhouse'
import type { AdminNotificationsOverview } from '@/lib/admin/get-admin-notifications-overview'
import AdminOpsActionButton from './AdminOpsActionButton'

type Props = {
  data: AdminNotificationsOverview
}

// ── Helpers ──

const chipColor = (status: string): 'success' | 'warning' | 'error' | 'secondary' | 'info' => {
  if (status === 'ok' || status === 'sent') return 'success'
  if (status === 'degraded' || status === 'skipped') return 'warning'
  if (status === 'failed') return 'error'
  if (status === 'idle') return 'secondary'

  return 'info'
}

const healthStatus = (
  rate: number,
  sent: number
): { label: string; color: 'success' | 'warning' | 'error' | 'secondary' } => {
  if (sent === 0) return { label: 'idle', color: 'secondary' }
  if (rate >= 95) return { label: 'ok', color: 'success' }
  if (rate >= 80) return { label: 'degradado', color: 'warning' }

  return { label: 'critico', color: 'error' }
}

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sin registro'

  try {
    return new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return value
  }
}

const audienceLabel = (audience: string) => {
  const map: Record<string, string> = {
    client: 'Cliente',
    collaborator: 'Colaborador',
    internal: 'Interno',
    admin: 'Admin'
  }

  return map[audience] ?? audience
}

const priorityLabel = (priority: string) => {
  const map: Record<string, string> = { high: 'Alta', normal: 'Normal', low: 'Baja' }

  return map[priority] ?? priority
}

const priorityColor = (priority: string): 'error' | 'info' | 'secondary' => {
  if (priority === 'high') return 'error'
  if (priority === 'normal') return 'info'

  return 'secondary'
}

const channelIcons = (channels: string[]) => channels.map(c => (c === 'in_app' ? '🔔' : '✉️')).join(' ')

const statusLabel = (status: string) => {
  const map: Record<string, string> = { sent: 'Enviada', skipped: 'Saltada', failed: 'Fallida' }

  return map[status] ?? status
}

// ── Component ──

const AdminNotificationsView = ({ data }: Props) => {
  const inAppStatus = healthStatus(data.deliveryHealth.inApp.rate, data.deliveryHealth.inApp.sent)
  const emailStatus = healthStatus(data.deliveryHealth.email.rate, data.deliveryHealth.email.sent)

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Box>
        <Chip label='Notificaciones' size='small' color='primary' variant='tonal' sx={{ mb: 1 }} />
        <Typography variant='h5' sx={{ fontWeight: 500 }}>
          Gobierno del sistema de notificaciones
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Salud, categorías, dispatch reciente y preferencias por defecto de los canales in-app y email.
        </Typography>
      </Box>

      {/* Diagnostics banner */}
      {data.diagnostics.length > 0 && (
        <Alert severity='warning' variant='outlined'>
          <AlertTitle>Diagnóstico del sistema de notificaciones</AlertTitle>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {data.diagnostics.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
        <ExecutiveMiniStatCard
          title='Enviadas 24h'
          value={String(data.kpis.totalSent24h)}
          detail='Despachos exitosos por ambos canales en las últimas 24 horas.'
          icon='tabler-bell'
          tone='info'
        />
        <ExecutiveMiniStatCard
          title='In-app entregadas'
          value={String(data.kpis.inAppDelivered24h)}
          detail='Notificaciones persistidas en la bandeja in-app.'
          icon='tabler-bell-ringing'
          tone='success'
        />
        <ExecutiveMiniStatCard
          title='Email entregados'
          value={String(data.kpis.emailDelivered24h)}
          detail='Correos aceptados por la capa centralizada de delivery.'
          icon='tabler-mail-check'
          tone='info'
        />
        <ExecutiveMiniStatCard
          title='Fallos 24h'
          value={String(data.kpis.failed24h + data.kpis.skipped24h)}
          detail='Incluye dispatch fallidos y saltados por preferencias o datos faltantes.'
          icon='tabler-bell-x'
          tone={data.kpis.failed24h > 0 ? 'error' : 'warning'}
        />
      </Box>

      {/* Delivery Health */}
      <ExecutiveCardShell
        title='Salud del delivery'
        subtitle='Tasa de entrega exitosa por canal en las últimas 24 horas.'
      >
        <Card variant='outlined'>
          <CardContent>
            <Stack spacing={3}>
              {/* In-app */}
              <Stack spacing={1}>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    In-app
                  </Typography>
                  <Chip size='small' variant='tonal' color={inAppStatus.color} label={inAppStatus.label} />
                </Stack>
                <LinearProgress
                  variant='determinate'
                  value={data.deliveryHealth.inApp.rate}
                  color={inAppStatus.color === 'secondary' ? 'inherit' : inAppStatus.color}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant='caption' color='text.secondary'>
                  {data.deliveryHealth.inApp.sent} enviadas · {data.deliveryHealth.inApp.failed} fallidas ·{' '}
                  {data.deliveryHealth.inApp.rate}%
                </Typography>
              </Stack>

              {/* Email */}
              <Stack spacing={1}>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    Email
                  </Typography>
                  <Chip size='small' variant='tonal' color={emailStatus.color} label={emailStatus.label} />
                </Stack>
                <LinearProgress
                  variant='determinate'
                  value={data.deliveryHealth.email.rate}
                  color={emailStatus.color === 'secondary' ? 'inherit' : emailStatus.color}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant='caption' color='text.secondary'>
                  {data.deliveryHealth.email.sent} enviadas · {data.deliveryHealth.email.failed} fallidas ·{' '}
                  {data.deliveryHealth.email.rate}%
                </Typography>
              </Stack>

              <Typography variant='caption' color='text.secondary'>
                Última señal: {formatDateTime(data.deliveryHealth.lastSignalAt)}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </ExecutiveCardShell>

      {/* Categories */}
      <ExecutiveCardShell
        title='Categorías de notificación'
        subtitle='Registro declarativo de tipos de notificación con audiencia, canales y prioridad.'
      >
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Categoría</TableCell>
                <TableCell>Audiencia</TableCell>
                <TableCell>Canales</TableCell>
                <TableCell>Prioridad</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.categories.map(cat => (
                <TableRow key={cat.code}>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant='body2' sx={{ fontWeight: 500 }}>
                        {cat.label}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {cat.description}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip size='small' variant='tonal' color='info' label={audienceLabel(cat.audience)} />
                  </TableCell>
                  <TableCell>{channelIcons(cat.defaultChannels)}</TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={priorityColor(cat.priority)}
                      label={priorityLabel(cat.priority)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ExecutiveCardShell>

      {/* Recent Dispatch */}
      <ExecutiveCardShell
        title='Dispatch reciente'
        subtitle='Últimos 50 registros del log de dispatch. Incluye enviados, saltados y fallidos.'
      >
        <Stack spacing={2.5}>
          {data.recentDispatch.length > 0 ? (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Destinatario</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell>Canal</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Hora</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentDispatch.map(row => (
                    <TableRow key={row.logId}>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontSize: '0.75rem' }}>
                          {row.userId.length > 20 ? `${row.userId.slice(0, 20)}...` : row.userId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
                          {row.category}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{row.channel === 'in_app' ? '🔔' : '✉️'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={chipColor(row.status)}
                          label={statusLabel(row.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {formatDateTime(row.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='body2' color='text.secondary' role='status'>
                  Sin despachos registrados en las últimas 24 horas.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card variant='outlined'>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant='h6'>Acciones</Typography>
                <AdminOpsActionButton
                  endpoint='/api/admin/ops/notifications/test-dispatch'
                  label='Enviar notificación de prueba'
                  helper='Envía una notificación al usuario actual para validar el pipeline in-app y email.'
                />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </ExecutiveCardShell>

      {/* Default Preferences */}
      <ExecutiveCardShell
        title='Preferencias por defecto'
        subtitle='Configuración base por categoría. Los usuarios pueden sobreescribir en sus preferencias personales.'
      >
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Categoría</TableCell>
                <TableCell align='center'>In-app (default)</TableCell>
                <TableCell align='center'>Email (default)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.categories.map(cat => (
                <TableRow key={`pref-${cat.code}`}>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                      {cat.label}
                    </Typography>
                  </TableCell>
                  <TableCell align='center'>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={cat.defaultChannels.includes('in_app') ? 'success' : 'secondary'}
                      label={cat.defaultChannels.includes('in_app') ? 'Activo' : 'Inactivo'}
                    />
                  </TableCell>
                  <TableCell align='center'>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={cat.defaultChannels.includes('email') ? 'success' : 'secondary'}
                      label={cat.defaultChannels.includes('email') ? 'Activo' : 'Inactivo'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ExecutiveCardShell>
    </Stack>
  )
}

export default AdminNotificationsView
