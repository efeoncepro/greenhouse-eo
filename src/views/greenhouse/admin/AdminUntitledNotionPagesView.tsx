'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import type { UntitledEntityKind, UntitledPagesOverview } from '@/lib/delivery/get-untitled-pages-overview'

import ExecutiveCardShell from '@/components/greenhouse/ExecutiveCardShell'
import ExecutiveMiniStatCard from '@/components/greenhouse/ExecutiveMiniStatCard'

interface Props {
  overview: UntitledPagesOverview
}

const KIND_LABEL: Record<UntitledEntityKind, string> = {
  task: 'Tarea',
  project: 'Proyecto',
  sprint: 'Sprint'
}

const KIND_COLOR: Record<UntitledEntityKind, 'primary' | 'secondary' | 'info'> = {
  task: 'primary',
  project: 'secondary',
  sprint: 'info'
}

const formatDate = (iso: string | null) => {
  if (!iso) return '—'

  try {
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

const AdminUntitledNotionPagesView = ({ overview }: Props) => {
  const isClean = overview.totals.totalPages === 0

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant='h4'>Páginas sin título en Notion</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          Tareas, proyectos y sprints sincronizados desde Notion sin un título asignado. Se mantienen visibles en Greenhouse con
          un fallback derivado del ID, pero conviene fixearlos en Notion para que aparezca el nombre correcto. Click en cualquier
          fila para abrir la página directo en Notion.
        </Typography>
      </Box>

      {isClean ? (
        <Card variant='outlined'>
          <CardContent>
            <Stack alignItems='center' spacing={1.5} sx={{ py: 4 }}>
              <Box component='i' className='tabler-circle-check' sx={{ fontSize: 48, color: 'success.main' }} aria-hidden />
              <Typography variant='h6'>Todo en orden — todas las páginas Notion tienen título.</Typography>
              <Typography variant='body2' color='text.secondary'>
                Cuando aparezca una página sin título (creada vía API o automation upstream), se listará acá automáticamente.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }
          }}
        >
          <ExecutiveMiniStatCard
            eyebrow='Total'
            tone='warning'
            title='Páginas sin título'
            value={String(overview.totals.totalPages)}
            detail={`Distribuidas en ${overview.totals.affectedSpaces} space${overview.totals.affectedSpaces === 1 ? '' : 's'}.`}
            icon='tabler-alert-triangle'
          />
          <ExecutiveMiniStatCard
            eyebrow='Tareas'
            tone='info'
            title='Tareas afectadas'
            value={String(overview.totals.taskCount)}
            detail='Sin nombre en Notion al último sync.'
            icon='tabler-checkbox'
          />
          <ExecutiveMiniStatCard
            eyebrow='Proyectos'
            tone='info'
            title='Proyectos afectados'
            value={String(overview.totals.projectCount)}
            detail='Sin nombre en Notion al último sync.'
            icon='tabler-folder'
          />
          <ExecutiveMiniStatCard
            eyebrow='Sprints'
            tone='info'
            title='Sprints afectados'
            value={String(overview.totals.sprintCount)}
            detail='Sin nombre en Notion al último sync.'
            icon='tabler-calendar-event'
          />
        </Box>
      )}

      {overview.bySpace.length > 0 && (
        <ExecutiveCardShell
          title='Distribución por space'
          subtitle='Páginas sin título agrupadas por space cliente. El equipo del space puede limpiarlas en Notion directamente.'
        >
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Space</TableCell>
                <TableCell align='right'>Tareas</TableCell>
                <TableCell align='right'>Proyectos</TableCell>
                <TableCell align='right'>Sprints</TableCell>
                <TableCell align='right'>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overview.bySpace.map(row => (
                <TableRow key={row.spaceId ?? 'unknown'}>
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Typography variant='body2' sx={{ fontWeight: 500 }}>
                        {row.spaceName ?? row.spaceId ?? 'Sin space asociado'}
                      </Typography>
                      {row.clientId && (
                        <Typography variant='caption' color='text.secondary'>
                          {row.clientId}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align='right'>{row.taskCount}</TableCell>
                  <TableCell align='right'>{row.projectCount}</TableCell>
                  <TableCell align='right'>{row.sprintCount}</TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {row.totalCount}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ExecutiveCardShell>
      )}

      {overview.recentRows.length > 0 && (
        <ExecutiveCardShell
          title='Últimas páginas afectadas'
          subtitle={`Mostrando ${overview.recentRows.length} de ${overview.totals.totalPages} páginas, ordenadas por última edición en Notion.`}
        >
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Space</TableCell>
                <TableCell>Notion page ID</TableCell>
                <TableCell>Última edición</TableCell>
                <TableCell>Detectada vacía desde</TableCell>
                <TableCell align='right'>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overview.recentRows.map(row => (
                <TableRow key={`${row.kind}-${row.sourceId}`} hover>
                  <TableCell>
                    <Chip size='small' label={KIND_LABEL[row.kind]} color={KIND_COLOR[row.kind]} variant='tonal' />
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>{row.spaceName ?? row.spaceId ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={row.sourceId} arrow>
                      <Typography variant='caption' sx={{ fontFamily: 'monospace' }}>
                        {row.sourceId.slice(0, 12)}…
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant='caption' color='text.secondary'>
                      {formatDate(row.lastEditedTime)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='caption' color='text.secondary'>
                      {formatDate(row.warningFirstSeenAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    {row.pageUrl ? (
                      <Link
                        href={row.pageUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        style={{ textDecoration: 'none' }}
                      >
                        <Chip size='small' label='Editar en Notion' icon={<Box component='i' className='tabler-external-link' sx={{ fontSize: 14 }} />} clickable color='primary' variant='outlined' />
                      </Link>
                    ) : (
                      <Typography variant='caption' color='text.disabled'>—</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ExecutiveCardShell>
      )}
    </Stack>
  )
}

export default AdminUntitledNotionPagesView
